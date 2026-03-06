const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { addCredits, deductCredits, getBalance, getHistory, monthlyRefill, CREDIT_BUNDLES } = require('../services/credits');
const { getStripe } = require('../services/stripe');

// GET /api/credits/bundles — available purchase bundles (public)
router.get('/bundles', (req, res) => {
  res.json(CREDIT_BUNDLES);
});

// GET /api/credits/balance — pro's current balance + plan info
router.get('/balance', authenticate, requireRole('pro'), async (req, res) => {
  try {
    const [[pro]] = await db.query(
      `SELECT p.id, p.lead_credits, p.subscription_plan, p.credit_last_refill,
              sp.name AS plan_name, sp.lead_credits AS plan_credits
       FROM pros p
       LEFT JOIN subscription_plans sp ON p.subscription_plan = sp.slug
       WHERE p.user_id = ?`,
      [req.user.id]
    );
    if (!pro) return res.status(404).json({ error: 'Pro profile not found' });

    const [[stats]] = await db.query(
      `SELECT
         SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_earned,
         SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS total_spent,
         COUNT(CASE WHEN type = 'lead_claim' THEN 1 END) AS leads_claimed,
         COUNT(CASE WHEN type = 'purchase' THEN 1 END) AS purchases_made
       FROM credit_transactions WHERE pro_id = ?`,
      [pro.id]
    );

    res.json({
      balance: pro.lead_credits,
      plan: pro.subscription_plan,
      planName: pro.plan_name,
      monthlyCredits: pro.plan_credits || 0,
      lastRefill: pro.credit_last_refill,
      isUnlimited: pro.subscription_plan === 'enterprise',
      stats: {
        totalEarned: parseInt(stats.total_earned) || 0,
        totalSpent: parseInt(stats.total_spent) || 0,
        leadsClaimed: parseInt(stats.leads_claimed) || 0,
        purchasesMade: parseInt(stats.purchases_made) || 0,
      },
    });
  } catch (err) {
    console.error('GET /credits/balance error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/credits/history — pro's transaction history
router.get('/history', authenticate, requireRole('pro'), async (req, res) => {
  try {
    const [[pro]] = await db.query('SELECT id FROM pros WHERE user_id = ?', [req.user.id]);
    if (!pro) return res.status(404).json({ error: 'Pro not found' });

    const { limit = 50, page = 1, type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let q = `SELECT ct.*, u.first_name, u.last_name
             FROM credit_transactions ct
             LEFT JOIN users u ON ct.user_id = u.id
             WHERE ct.pro_id = ?`;
    const params = [pro.id];

    if (type) {
      q += ' AND ct.type = ?';
      params.push(type);
    }

    q += ' ORDER BY ct.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await db.query(q, params);
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM credit_transactions WHERE pro_id = ?', [pro.id]
    );

    res.json({ transactions: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('GET /credits/history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/credits/purchase — buy a credit bundle (creates Stripe checkout or adds directly for testing)
router.post('/purchase', authenticate, requireRole('pro'), async (req, res) => {
  const { bundleId } = req.body;
  const bundle = CREDIT_BUNDLES.find(b => b.id === bundleId);
  if (!bundle) return res.status(400).json({ error: 'Invalid bundle' });

  try {
    const [[pro]] = await db.query('SELECT * FROM pros WHERE user_id = ?', [req.user.id]);
    if (!pro) return res.status(404).json({ error: 'Pro not found' });

    const stripe = await getStripe(req.tenant?.id || 1);
    if (stripe) {
      let customerId = pro.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          metadata: { pro_id: String(pro.id) },
        });
        customerId = customer.id;
        await db.query('UPDATE pros SET stripe_customer_id = ? WHERE id = ?', [customerId, pro.id]);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(bundle.pricePerCredit * 100),
            product_data: {
              name: bundle.label,
              description: `${bundle.credits} lead credits at $${bundle.pricePerCredit}/credit`,
            },
          },
          quantity: bundle.credits,
        }],
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?credits=success&amount=${bundle.credits}`,
        cancel_url:  `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?credits=cancel`,
        metadata: {
          pro_id: String(pro.id),
          user_id: String(req.user.id),
          credits: String(bundle.credits),
          bundle_id: bundle.id,
          type: 'credit_purchase',
        },
      });

      return res.json({ url: session.url, sessionId: session.id });
    }

    // No Stripe — add credits directly (dev/test mode)
    const balance = await addCredits(
      pro.id, req.user.id,
      bundle.credits, 'purchase',
      `Purchased ${bundle.label} ($${bundle.price.toFixed(2)})`,
      `dev_${Date.now()}`, 'direct_purchase'
    );

    res.json({
      success: true,
      message: `${bundle.credits} credits added to your account`,
      balance,
      devMode: true,
    });
  } catch (err) {
    console.error('POST /credits/purchase error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/credits/refill — trigger monthly refill (usually called by webhook, but admin can trigger)
router.post('/refill', authenticate, requireRole('pro'), async (req, res) => {
  try {
    const [[pro]] = await db.query('SELECT id FROM pros WHERE user_id = ?', [req.user.id]);
    if (!pro) return res.status(404).json({ error: 'Pro not found' });

    const result = await monthlyRefill(pro.id, req.user.id);
    if (!result) return res.json({ message: 'No refill needed (already refilled today or free plan)' });
    res.json({ message: `Refilled ${result.credits} credits`, balance: result.balance });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Admin routes ──

// GET /api/credits/admin/pro/:proId — admin: view pro's credit balance and history
router.get('/admin/pro/:proId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const tid = req.tenant?.id || 1;
    const proId = parseInt(req.params.proId);
    const [[pro]] = await db.query(
      `SELECT p.id, p.lead_credits, p.subscription_plan, p.business_name, p.credit_last_refill,
              u.email, u.first_name, u.last_name,
              sp.name AS plan_name, sp.lead_credits AS plan_credits
       FROM pros p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN subscription_plans sp ON p.subscription_plan = sp.slug
       WHERE p.id = ? AND p.tenant_id = ?`,
      [proId, tid]
    );
    if (!pro) return res.status(404).json({ error: 'Pro not found' });

    const { limit = 50, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [transactions] = await db.query(
      `SELECT ct.*, u.first_name, u.last_name
       FROM credit_transactions ct
       LEFT JOIN users u ON ct.user_id = u.id
       WHERE ct.pro_id = ?
       ORDER BY ct.created_at DESC LIMIT ? OFFSET ?`,
      [proId, parseInt(limit), offset]
    );

    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM credit_transactions WHERE pro_id = ?', [proId]
    );

    res.json({ pro, transactions, total });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/credits/admin/adjust — admin: manually adjust credits
router.post('/admin/adjust', authenticate, requireRole('admin'), async (req, res) => {
  const { proId, amount, reason } = req.body;
  if (!proId || amount === undefined || !reason) {
    return res.status(400).json({ error: 'proId, amount, and reason are required' });
  }

  try {
    const adjustAmount = parseInt(amount);
    const tid = req.tenant?.id || 1;
    const [[pro]] = await db.query('SELECT id, user_id, lead_credits FROM pros WHERE id = ? AND tenant_id = ?', [proId, tid]);
    if (!pro) return res.status(404).json({ error: 'Pro not found' });

    let balance;
    if (adjustAmount > 0) {
      balance = await addCredits(
        proId, req.user.id, adjustAmount, 'admin_adjust',
        `Admin adjustment: +${adjustAmount} — ${reason}`,
        `admin_${req.user.id}`, 'admin'
      );
    } else if (adjustAmount < 0) {
      const absAmount = Math.abs(adjustAmount);
      if (pro.lead_credits < absAmount) {
        return res.status(400).json({ error: `Pro only has ${pro.lead_credits} credits` });
      }
      balance = await deductCredits(
        proId, req.user.id, absAmount, 'admin_adjust',
        `Admin adjustment: ${adjustAmount} — ${reason}`,
        `admin_${req.user.id}`, 'admin'
      );
    } else {
      return res.status(400).json({ error: 'Amount cannot be zero' });
    }

    res.json({ message: `Credits adjusted by ${adjustAmount}`, balance });
  } catch (err) {
    console.error('Admin adjust error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/credits/admin/overview — admin: credit system stats
router.get('/admin/overview', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const tid = req.tenant?.id || 1;
    const [[stats]] = await db.query(`
      SELECT
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_credits_issued,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS total_credits_spent,
        COUNT(*) AS total_transactions,
        COUNT(DISTINCT pro_id) AS unique_pros,
        SUM(CASE WHEN type = 'purchase' AND amount > 0 THEN amount ELSE 0 END) AS purchased_credits,
        SUM(CASE WHEN type = 'lead_claim' THEN 1 ELSE 0 END) AS total_claims,
        SUM(CASE WHEN type = 'monthly_refill' AND amount > 0 THEN amount ELSE 0 END) AS refill_credits
      FROM credit_transactions
      WHERE tenant_id = ?
    `, [tid]);

    const [[balanceStats]] = await db.query(`
      SELECT
        SUM(lead_credits) AS total_outstanding,
        AVG(lead_credits) AS avg_balance,
        MAX(lead_credits) AS max_balance,
        COUNT(CASE WHEN lead_credits = 0 THEN 1 END) AS zero_balance_pros
      FROM pros
      WHERE tenant_id = ?
    `, [tid]);

    res.json({ ...stats, ...balanceStats });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
