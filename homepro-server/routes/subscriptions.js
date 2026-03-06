const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { getStripe } = require('../services/stripe');

// GET /api/subscriptions/plans — list plans (public = active only, admin = all)
router.get('/plans', async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const { all } = req.query;
    const query = all === 'true'
      ? 'SELECT * FROM subscription_plans WHERE tenant_id = ? ORDER BY sort_order ASC'
      : 'SELECT * FROM subscription_plans WHERE is_active = TRUE AND tenant_id = ? ORDER BY sort_order ASC';
    const [rows] = await db.query(query, [tid]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/subscriptions/admin-plans — authenticated, tenant-scoped list for admin dashboard
router.get('/admin-plans', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const { all } = req.query;
    const query = all === 'true'
      ? 'SELECT * FROM subscription_plans WHERE tenant_id = ? ORDER BY sort_order ASC'
      : 'SELECT * FROM subscription_plans WHERE is_active = TRUE AND tenant_id = ? ORDER BY sort_order ASC';
    const [rows] = await db.query(query, [tid]);
    res.json(rows);
  } catch (err) {
    console.error('GET /subscriptions/admin-plans error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/subscriptions/plans — admin: create plan
router.post('/plans', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { name, slug, stripePriceId, priceMonthly, priceYearly, leadCredits, maxServiceAreas, maxServices, features, isPopular, sortOrder } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' });
  try {
    const [result] = await db.query(
      `INSERT INTO subscription_plans (tenant_id, name, slug, stripe_price_id, price_monthly, price_yearly, lead_credits, max_service_areas, max_services, features, is_popular, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [tid, name, slug, stripePriceId || null, priceMonthly || 0, priceYearly || 0, leadCredits || 0, maxServiceAreas || 5, maxServices || 3, features ? JSON.stringify(features) : '{}', !!isPopular, sortOrder || 0]
    );
    res.status(201).json({ id: result.insertId, message: 'Plan created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slug already exists' });
    console.error('Create plan error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/subscriptions/plans/:id — admin: update plan
router.put('/plans/:id', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { name, slug, stripePriceId, priceMonthly, priceYearly, leadCredits, maxServiceAreas, maxServices, features, isPopular, isActive, sortOrder } = req.body;
  try {
    await db.query(
      `UPDATE subscription_plans SET
        name=COALESCE(?,name), slug=COALESCE(?,slug), stripe_price_id=COALESCE(?,stripe_price_id),
        price_monthly=COALESCE(?,price_monthly), price_yearly=COALESCE(?,price_yearly),
        lead_credits=COALESCE(?,lead_credits), max_service_areas=COALESCE(?,max_service_areas),
        max_services=COALESCE(?,max_services), features=COALESCE(?,features),
        is_popular=COALESCE(?,is_popular), is_active=COALESCE(?,is_active), sort_order=COALESCE(?,sort_order)
       WHERE id=? AND tenant_id=?`,
      [name, slug, stripePriceId, priceMonthly, priceYearly, leadCredits, maxServiceAreas, maxServices, features ? JSON.stringify(features) : null, isPopular, isActive, sortOrder, req.params.id, tid]
    );
    res.json({ message: 'Plan updated' });
  } catch (err) {
    console.error('Update plan error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/subscriptions/plans/:id — admin: delete plan
router.delete('/plans/:id', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    await db.query('DELETE FROM subscription_plans WHERE id = ? AND tenant_id = ?', [req.params.id, tid]);
    res.json({ message: 'Plan deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/subscriptions/current — current user's subscription
router.get('/current', authenticate, requireRole('pro'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const [pros] = await db.query(
      `SELECT p.subscription_plan, p.subscription_status, p.stripe_subscription_id, p.lead_credits,
              sp.name as plan_name, sp.price_monthly, sp.lead_credits as plan_credits,
              sp.max_service_areas, sp.max_services, sp.features
       FROM pros p
       LEFT JOIN subscription_plans sp ON p.subscription_plan = sp.slug
       WHERE p.user_id = ?`,
      [req.user.id]
    );
    if (!pros.length) return res.status(404).json({ error: 'Pro profile not found' });

    const pro = pros[0];
    let stripeSubscription = null;

    const stripe = await getStripe(tid);
    if (stripe && pro.stripe_subscription_id) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(pro.stripe_subscription_id);
      } catch {}
    }

    res.json({
      plan: pro.subscription_plan,
      status: pro.subscription_status,
      planName: pro.plan_name,
      priceMonthly: pro.price_monthly,
      leadCredits: pro.lead_credits,
      planCredits: pro.plan_credits,
      maxServiceAreas: pro.max_service_areas,
      maxServices: pro.max_services,
      features: pro.features,
      stripe: stripeSubscription ? {
        currentPeriodEnd: stripeSubscription.current_period_end,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      } : null,
    });
  } catch (err) {
    console.error('Subscription current error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/subscriptions/cancel
router.post('/cancel', authenticate, requireRole('pro'), async (req, res) => {
  const stripe = await getStripe(req.tenant?.id || 1);
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  try {
    const [pros] = await db.query('SELECT stripe_subscription_id FROM pros WHERE user_id = ?', [req.user.id]);
    if (!pros.length || !pros[0].stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    await stripe.subscriptions.update(pros[0].stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    res.json({ message: 'Subscription will cancel at period end' });
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// POST /api/subscriptions/resume — undo cancel
router.post('/resume', authenticate, requireRole('pro'), async (req, res) => {
  const stripe = await getStripe(req.tenant?.id || 1);
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  try {
    const [pros] = await db.query('SELECT stripe_subscription_id FROM pros WHERE user_id = ?', [req.user.id]);
    if (!pros.length || !pros[0].stripe_subscription_id) {
      return res.status(400).json({ error: 'No subscription to resume' });
    }

    await stripe.subscriptions.update(pros[0].stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    res.json({ message: 'Subscription resumed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

// POST /api/subscriptions/portal — Stripe billing portal
router.post('/portal', authenticate, requireRole('pro'), async (req, res) => {
  const stripe = await getStripe(req.tenant?.id || 1);
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  try {
    const [pros] = await db.query('SELECT stripe_customer_id FROM pros WHERE user_id = ?', [req.user.id]);
    if (!pros.length || !pros[0].stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: pros[0].stripe_customer_id,
      return_url: process.env.FRONTEND_URL || 'http://localhost:5173',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

module.exports = router;
