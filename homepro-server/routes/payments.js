const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { addCredits, monthlyRefill } = require('../services/credits');
const { getStripe } = require('../services/stripe');
const { getSiteConfig } = require('../services/siteConfig');

// POST /api/payments/create-checkout — Stripe Checkout for subscription
router.post('/create-checkout', authenticate, requireRole('pro'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const stripe = await getStripe(tid);
  if (!stripe) return res.status(503).json({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in Settings.' });

  const { planSlug, billingPeriod } = req.body;
  try {
    const [plans] = await db.query('SELECT * FROM subscription_plans WHERE slug = ? AND tenant_id = ?', [planSlug, tid]);
    if (!plans.length) return res.status(404).json({ error: 'Plan not found' });
    const plan = plans[0];

    if (!plan.stripe_price_id) return res.status(400).json({ error: 'Plan has no Stripe price configured' });

    const [pros] = await db.query('SELECT * FROM pros WHERE user_id = ?', [req.user.id]);
    if (!pros.length) return res.status(404).json({ error: 'Pro profile not found' });
    const pro = pros[0];

    let customerId = pro.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: `${req.user.first_name} ${req.user.last_name}`.trim(),
        metadata: { pro_id: String(pro.id), user_id: String(req.user.id) },
      });
      customerId = customer.id;
      await db.query('UPDATE pros SET stripe_customer_id = ? WHERE id = ?', [customerId, pro.id]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?checkout=success`,
      cancel_url:  `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?checkout=cancel`,
      metadata: { pro_id: String(pro.id), plan_slug: planSlug },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/payments/buy-credits — one-time lead credit purchase
router.post('/buy-credits', authenticate, requireRole('pro'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const stripe = await getStripe(tid);
  if (!stripe) return res.status(503).json({ error: 'Stripe is not configured' });

  const { credits } = req.body;
  const qty = parseInt(credits) || 10;
  const pricePerCredit = 3.00;

  try {
    const tid = req.tenant?.id || 1;
    const [pros] = await db.query('SELECT * FROM pros WHERE user_id = ?', [req.user.id]);
    if (!pros.length) return res.status(404).json({ error: 'Pro not found' });
    const pro = pros[0];

    let customerId = pro.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: req.user.email, metadata: { pro_id: String(pro.id) } });
      customerId = customer.id;
      await db.query('UPDATE pros SET stripe_customer_id = ? WHERE id = ?', [customerId, pro.id]);
    }

    const site = await getSiteConfig(tid);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(pricePerCredit * 100),
          product_data: { name: `${qty} Lead Credits`, description: `${qty} credits for claiming leads on ${site.site_name}` },
        },
        quantity: qty,
      }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?credits=success`,
      cancel_url:  `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?credits=cancel`,
      metadata: { pro_id: String(pro.id), credits: String(qty), type: 'lead_bundle' },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Buy credits error:', err);
    res.status(500).json({ error: 'Failed to create checkout' });
  }
});

// POST /api/payments/webhook — Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = await getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    if (!endpointSecret || !endpointSecret.trim()) {
      if (process.env.NODE_ENV === 'production') {
        console.error('Stripe webhook: STRIPE_WEBHOOK_SECRET is required in production');
        return res.status(503).json({ error: 'Webhook not configured' });
      }
      const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
      event = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const proId = session.metadata?.pro_id;
        if (!proId) break;

        if (session.mode === 'subscription') {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await db.query(
            'UPDATE pros SET stripe_subscription_id = ?, subscription_status = ?, subscription_plan = ? WHERE id = ?',
            [session.subscription, 'active', session.metadata.plan_slug || 'professional', proId]
          );
          const creditsMap = { starter: 10, professional: 30, enterprise: 100 };
          const credits = creditsMap[session.metadata.plan_slug] || 30;
          const [[proUser]] = await db.query('SELECT user_id FROM pros WHERE id = ?', [proId]);
          await addCredits(
            parseInt(proId), proUser?.user_id || 0, credits, 'plan_credits',
            `Subscription activated: ${session.metadata.plan_slug} plan (+${credits} credits)`,
            session.subscription, 'subscription'
          );
        }

        if (session.metadata?.type === 'lead_bundle' || session.metadata?.type === 'credit_purchase') {
          const credits = parseInt(session.metadata.credits) || 10;
          const amount = session.amount_total != null ? session.amount_total / 100 : credits * 3.00;
          const [[proUser2]] = await db.query('SELECT user_id FROM pros WHERE id = ?', [proId]);
          await addCredits(
            parseInt(proId), proUser2?.user_id || 0, credits, 'purchase',
            `Purchased ${credits} lead credits`,
            session.payment_intent, 'stripe_payment'
          );
          await db.query(
            'INSERT INTO payments (user_id, pro_id, stripe_payment_id, amount, payment_type, status, description) SELECT user_id,?,?,?,?,?,? FROM pros WHERE id = ?',
            [proId, session.payment_intent, amount, 'lead_bundle', 'succeeded', `${credits} lead credits`, proId]
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const [pros] = await db.query('SELECT id FROM pros WHERE stripe_subscription_id = ?', [sub.id]);
        if (pros.length) {
          await db.query('UPDATE pros SET subscription_status = ? WHERE id = ?', [sub.status, pros[0].id]);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const [pros] = await db.query('SELECT id FROM pros WHERE stripe_subscription_id = ?', [sub.id]);
        if (pros.length) {
          await db.query('UPDATE pros SET subscription_status = "canceled", subscription_plan = "free" WHERE id = ?', [pros[0].id]);
        }
        break;
      }

      case 'invoice.paid': {
        const inv = event.data.object;
        const [pros] = await db.query('SELECT id, user_id FROM pros WHERE stripe_customer_id = ?', [inv.customer]);
        if (pros.length) {
          await db.query(
            'INSERT INTO payments (user_id, pro_id, stripe_payment_id, stripe_invoice_id, amount, payment_type, status, paid_at) VALUES (?,?,?,?,?,?,?,NOW())',
            [pros[0].user_id, pros[0].id, inv.payment_intent, inv.id, inv.amount_paid / 100, 'subscription', 'succeeded']
          );
          await db.query(
            'INSERT INTO invoices (user_id, pro_id, stripe_invoice_id, invoice_number, amount, tax, total, status, paid_at, pdf_url) VALUES (?,?,?,?,?,?,?,?,NOW(),?)',
            [pros[0].user_id, pros[0].id, inv.id, inv.number, inv.subtotal / 100, inv.tax / 100, inv.total / 100, 'paid', inv.invoice_pdf]
          );
          // Monthly credit refill on subscription renewal
          try {
            await monthlyRefill(pros[0].id, pros[0].user_id);
          } catch (e) {
            console.error('Monthly refill error:', e.message);
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }

  res.json({ received: true });
});

// GET /api/payments — user's payment history
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [rows] = await db.query(
      'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.user.id, parseInt(limit), offset]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/payments/invoices — user's invoices
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
