const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { addCredits, deductCredits, getBalance, getHistory, monthlyRefill, CREDIT_BUNDLES } = require('../services/credits');
const { getStripe } = require('../services/stripe');

/** Normalize DB row to same shape as legacy CREDIT_BUNDLES (id, credits, price, pricePerCredit, label) */
function rowToBundle(row) {
  return {
    id: String(row.id),
    credits: row.credits,
    price: Number(row.price),
    pricePerCredit: Number(row.price_per_credit),
    label: row.label || `${row.credits} Credits`,
  };
}

/** Load tenant's credit bundles from DB; fallback to legacy CREDIT_BUNDLES if table missing or empty */
async function getBundlesForTenant(tenantId) {
  const tid = tenantId || 1;
  try {
    const [rows] = await db.query(
      'SELECT id, label, credits, price, price_per_credit FROM credit_bundles WHERE tenant_id = ? AND is_active = TRUE ORDER BY sort_order ASC, id ASC',
      [tid]
    );
    if (rows && rows.length > 0) return rows.map(rowToBundle);
  } catch (err) {
    // Table may not exist yet
  }
  return CREDIT_BUNDLES;
}

/** Resolve bundle by id: numeric = DB id (tenant-scoped), else legacy e.g. bundle_10 */
async function resolveBundle(bundleId, tenantId) {
  const tid = tenantId || 1;
  const numId = parseInt(bundleId, 10);
  if (!Number.isNaN(numId) && numId > 0) {
    const [[row]] = await db.query(
      'SELECT id, label, credits, price, price_per_credit FROM credit_bundles WHERE id = ? AND tenant_id = ? AND is_active = TRUE',
      [numId, tid]
    );
    if (row) return rowToBundle(row);
  }
  const legacy = CREDIT_BUNDLES.find(b => b.id === bundleId || String(b.id) === String(bundleId));
  return legacy || null;
}

// GET /api/credits/bundles — available purchase bundles (public, tenant-scoped; matches Admin-defined packages)
router.get('/bundles', async (req, res) => {
  try {
    const tid = req.tenant?.id || 1;
    const bundles = await getBundlesForTenant(tid);
    res.json(bundles);
  } catch (err) {
    console.error('GET /credits/bundles error:', err);
    res.json(CREDIT_BUNDLES);
  }
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

// POST /api/credits/purchase — buy a credit bundle (Stripe checkout or dev fallback)
router.post('/purchase', authenticate, requireRole('pro'), async (req, res) => {
  const { bundleId } = req.body;
  const tid = req.tenant?.id || 1;
  const bundle = await resolveBundle(bundleId, tid);
  if (!bundle) return res.status(400).json({ error: 'Invalid bundle' });

  try {
    const [[pro]] = await db.query('SELECT * FROM pros WHERE user_id = ?', [req.user.id]);
    if (!pro) return res.status(404).json({ error: 'Pro not found' });

    const stripe = await getStripe(tid);
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
          bundle_id: String(bundle.id),
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

// ── Admin routes: Credit bundles (top-up packages; match Pro Dashboard) ──

// GET /api/credits/admin/bundles — admin: list tenant's credit bundles
router.get('/admin/bundles', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const tid = req.tenant?.id || 1;
    const [rows] = await db.query(
      'SELECT id, tenant_id, label, credits, price, price_per_credit, stripe_price_id, is_active, sort_order, created_at FROM credit_bundles WHERE tenant_id = ? ORDER BY sort_order ASC, id ASC',
      [tid]
    );
    res.json(rows || []);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return res.json([]);
    console.error('GET /credits/admin/bundles error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/credits/admin/bundles — admin: create credit bundle
router.post('/admin/bundles', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const tid = req.tenant?.id || 1;
    const { label, credits, price, pricePerCredit, stripePriceId, isActive, sortOrder } = req.body;
    if (!label || credits == null || price == null) {
      return res.status(400).json({ error: 'label, credits, and price are required' });
    }
    const pricePerCreditVal = pricePerCredit != null ? Number(pricePerCredit) : Number(price) / Number(credits);
    const [result] = await db.query(
      `INSERT INTO credit_bundles (tenant_id, label, credits, price, price_per_credit, stripe_price_id, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tid, label, parseInt(credits), Number(price), pricePerCreditVal, stripePriceId || null, isActive !== false, sortOrder != null ? parseInt(sortOrder) : 0]
    );
    res.status(201).json({ id: result.insertId, message: 'Bundle created' });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: 'Run migrate-credit-bundles.js to create credit_bundles table' });
    }
    console.error('POST /credits/admin/bundles error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// PUT /api/credits/admin/bundles/:id — admin: update credit bundle
router.put('/admin/bundles/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const tid = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    const { label, credits, price, pricePerCredit, stripePriceId, isActive, sortOrder } = req.body;
    const updates = [];
    const values = [];
    if (label !== undefined) { updates.push('label = ?'); values.push(label); }
    if (credits !== undefined) { updates.push('credits = ?'); values.push(parseInt(credits)); }
    if (price !== undefined) { updates.push('price = ?'); values.push(Number(price)); }
    if (pricePerCredit !== undefined) { updates.push('price_per_credit = ?'); values.push(Number(pricePerCredit)); }
    if (stripePriceId !== undefined) { updates.push('stripe_price_id = ?'); values.push(stripePriceId || null); }
    if (isActive !== undefined) { updates.push('is_active = ?'); values.push(!!isActive); }
    if (sortOrder !== undefined) { updates.push('sort_order = ?'); values.push(parseInt(sortOrder)); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id, tid);
    await db.query(
      `UPDATE credit_bundles SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );
    res.json({ message: 'Bundle updated' });
  } catch (err) {
    console.error('PUT /credits/admin/bundles error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// DELETE /api/credits/admin/bundles/:id — admin: delete credit bundle
router.delete('/admin/bundles/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const tid = req.tenant?.id || 1;
    const id = parseInt(req.params.id);
    await db.query('DELETE FROM credit_bundles WHERE id = ? AND tenant_id = ?', [id, tid]);
    res.json({ message: 'Bundle deleted' });
  } catch (err) {
    console.error('DELETE /credits/admin/bundles error:', err);
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
