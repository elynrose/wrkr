require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────
const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
].filter(Boolean);
if (frontendUrl && !allowedOrigins.includes(frontendUrl)) allowedOrigins.push(frontendUrl);
// Railway and similar: allow *.railway.app
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin === o)) return callback(null, true);
    if (/\.railway\.app$/.test(new URL(origin).hostname)) return callback(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
}));

// Stripe webhook needs raw body — must be before json parser
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));

// ── Auth and services (for settings tests) ────────────────────
const { authenticate, requireRole } = require('./middleware/auth');
const db = require('./db');
const { sendSMS, isConfigured } = require('./services/sms');
const { sendEmail } = require('./services/email');
const { getStripe } = require('./services/stripe');
const { getSiteConfig } = require('./services/siteConfig');

// ── Routes ──────────────────────────────────────────────────
// Admin how-it-works (explicit path so it always matches)
app.get('/api/admin/how-it-works', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM how_it_works ORDER BY audience ASC, step_number ASC');
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/admin/how-it-works error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/settings/test-sms', authenticate, requireRole('admin'), async (req, res) => {
  const { to } = req.body || {};
  if (!to || typeof to !== 'string') {
    return res.status(400).json({ error: 'Phone number required (e.g. +15551234567)' });
  }
  const trimmed = to.trim();
  if (!trimmed) return res.status(400).json({ error: 'Phone number required' });
  try {
    const configured = await isConfigured();
    if (!configured) {
      return res.status(400).json({ error: 'Twilio is not configured. Set Account SID, Auth Token, and Phone Number in Twilio settings.' });
    }
    const site = await getSiteConfig();
    const body = `Test SMS from ${site.site_name}. Twilio is connected and working.`;
    const result = await sendSMS(trimmed, body);
    return res.json({ success: true, message: 'Test SMS sent', sid: result.sid, mock: result.mock });
  } catch (err) {
    console.error('Test SMS error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send test SMS' });
  }
});

app.post('/api/settings/test-email', authenticate, requireRole('admin'), async (req, res) => {
  const { to } = req.body || {};
  if (!to || typeof to !== 'string') {
    return res.status(400).json({ error: 'Email address required' });
  }
  const trimmed = to.trim();
  if (!trimmed) return res.status(400).json({ error: 'Email address required' });
  try {
    const site = await getSiteConfig();
    const subject = `Test email from ${site.site_name}`;
    const html = `<p>This is a test email. Your email (SMTP) settings are configured correctly.</p><p>— ${site.site_name}</p>`;
    const result = await sendEmail({ to: trimmed, subject, html, text: 'This is a test email. Your email (SMTP) settings are configured correctly.' });
    return res.json({ success: true, message: 'Test email sent', mock: result.mock });
  } catch (err) {
    console.error('Test email error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send test email' });
  }
});

app.post('/api/settings/test-stripe', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe is not configured. Set Secret Key in Stripe settings (or STRIPE_SECRET_KEY in .env).' });
    }
    await stripe.balance.retrieve();
    return res.json({ success: true, message: 'Stripe connection OK' });
  } catch (err) {
    console.error('Test Stripe error:', err);
    return res.status(500).json({ error: err.message || 'Stripe test failed' });
  }
});

app.use('/api/auth',            require('./routes/auth'));
app.use('/api/users',           require('./routes/users'));
app.use('/api/categories',      require('./routes/categories'));
app.use('/api/services',        require('./routes/services'));
app.use('/api/leads',           require('./routes/leads'));
app.use('/api/cities',          require('./routes/cities'));
app.use('/api/pros',            require('./routes/pros'));
app.use('/api/payments',        require('./routes/payments'));
app.use('/api/subscriptions',   require('./routes/subscriptions'));
app.use('/api/reviews',         require('./routes/reviews'));
app.use('/api/notifications',   require('./routes/notifications'));
app.use('/api/messages',        require('./routes/messages'));
app.use('/api/settings',        require('./routes/settings'));
app.use('/api/templates',       require('./routes/templates'));
app.use('/api/pages',           require('./routes/pages'));
app.use('/api/matching',        require('./routes/matching'));
app.use('/api/credits',         require('./routes/credits'));

// ── Twilio inbound SMS webhook ──
const { handleInboundSMS } = require('./services/followUp');

app.post('/api/sms/inbound', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const from = req.body.From || '';
    const body = req.body.Body || '';
    const sid  = req.body.MessageSid || '';

    console.log(`[SMS IN] From: ${from} Body: ${body}`);

    const result = await handleInboundSMS(from, body, sid);

    // Reply with TwiML
    const reply = result.reply || '';
    res.type('text/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?><Response>${reply ? `<Message>${reply}</Message>` : ''}</Response>`
    );
  } catch (err) {
    console.error('[SMS IN] Error:', err);
    res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

// Admin: manually trigger follow-ups
app.post('/api/admin/run-followups', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { processFollowUps } = require('./services/followUp');
    const result = await processFollowUps();
    res.json(result);
  } catch (err) {
    console.error('Follow-up run error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    stripe: !!process.env.STRIPE_SECRET_KEY,
    routes: [
      'auth', 'users', 'categories', 'services', 'leads',
      'cities', 'pros', 'payments', 'subscriptions',
      'reviews', 'notifications', 'messages', 'settings', 'pages',
      'matching', 'credits',
    ],
  });
});

// Production: serve frontend static build (e.g. from Railway single-service deploy)
const path = require('path');
const publicDir = path.join(__dirname, 'public');
const fs = require('fs');
if (process.env.NODE_ENV === 'production' && fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// 404 for API
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Follow-up timer ──
const { processFollowUps } = require('./services/followUp');
const FOLLOWUP_INTERVAL = 15 * 60 * 1000; // check every 15 min
setInterval(async () => {
  try {
    const result = await processFollowUps();
    if (result.processed > 0) console.log(`[FOLLOWUP CRON] Sent ${result.processed} follow-ups`);
  } catch (err) {
    console.error('[FOLLOWUP CRON] Error:', err.message);
  }
}, FOLLOWUP_INTERVAL);

app.listen(PORT, () => {
  console.log(`✅ HomePro API running at http://localhost:${PORT}`);
  console.log(`   Routes: auth, users, categories, services, leads, cities, pros, payments, subscriptions, reviews, notifications, messages`);
  console.log(`   Follow-up checker runs every ${FOLLOWUP_INTERVAL / 60000} min`);
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log(`   ⚠️  Stripe not configured — set STRIPE_SECRET_KEY in .env for payments`);
  }
});
