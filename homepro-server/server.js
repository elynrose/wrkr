require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────
// Multi-tenant: allow any origin (each tenant uses their own domain)
app.use(cors({
  origin: function (origin, callback) {
    // Allow no-origin (server-to-server, mobile apps), localhost, and any configured domain
    if (!origin) return callback(null, true);
    // Allow localhost for development
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    // Allow all other origins for multi-tenant (each tenant custom domain)
    // Production deployments can restrict via ALLOWED_ORIGINS env var
    const allowed = process.env.ALLOWED_ORIGINS;
    if (allowed) {
      const list = allowed.split(',').map(s => s.trim());
      if (list.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    }
    // Default: allow all (suitable for SaaS multi-tenant)
    return callback(null, true);
  },
  credentials: true,
}));

// Stripe webhook needs raw body — must be before json parser
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));

// Install routes first (no auth, no tenant) — before any other /api routes
app.use('/api/install', require('./routes/install'));

// ── Tenant resolution middleware (runs on every /api/* request) ──
const { tenantMiddleware } = require('./middleware/tenant');
app.use('/api', tenantMiddleware);

// ── Auth and services (for settings tests) ────────────────────
const { authenticate, requireRole } = require('./middleware/auth');
const db = require('./db');
const { sendSMS, isConfigured } = require('./services/sms');
const { sendEmail } = require('./services/email');
const { getStripe } = require('./services/stripe');
const { getSiteConfig } = require('./services/siteConfig');

// ── Routes ──────────────────────────────────────────────────

// Auth router first (so /api/auth/* matches before other /api routes)
app.use('/api/auth', require('./routes/auth'));

// Admin how-it-works (explicit path so it always matches)
app.get('/api/admin/how-it-works', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const tid = req.tenant?.id || 1;
    const [rows] = await db.query('SELECT * FROM how_it_works WHERE tenant_id = ? ORDER BY audience ASC, step_number ASC', [tid]);
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
    const tid = req.tenant?.id || 1;
    const configured = await isConfigured(tid);
    if (!configured) {
      return res.status(400).json({ error: 'Twilio is not configured. Set Account SID, Auth Token, and Phone Number in Twilio settings.' });
    }
    const site = await getSiteConfig(tid);
    const body = `Test SMS from ${site.site_name}. Twilio is connected and working.`;
    const result = await sendSMS(trimmed, body, tid);
    return res.json({ success: true, message: 'Test SMS sent', sid: result.sid, mock: result.mock });
  } catch (err) {
    console.error('Test SMS error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send test SMS' });
  }
});

// Apply MailHog config for current tenant (so admin test works without manual save)
app.post('/api/settings/apply-mailhog', authenticate, requireRole('admin'), async (req, res) => {
  const tenantId = req.tenant?.id || 1;
  try {
    const settings = [
      ['email_enabled', 'true', 'boolean'],
      ['smtp_host', 'localhost', 'string'],
      ['smtp_port', '1025', 'number'],
      ['smtp_secure', 'false', 'boolean'],
      ['smtp_user', '', 'string'],
      ['smtp_password', '', 'secret'],
    ];
    for (const [key, value, type] of settings) {
      await db.query(
        `INSERT INTO settings (tenant_id, setting_key, setting_value, setting_type, setting_group, label, is_public)
         VALUES (?, ?, ?, ?, 'email', ?, FALSE)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [tenantId, key, value, type, key.replace(/_/g, ' ')]
      );
    }
    const { clearCache } = require('./services/email');
    clearCache(tenantId);
    return res.json({ success: true, message: 'MailHog config applied. Try test email now.' });
  } catch (err) {
    console.error('Apply MailHog error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/test-email', authenticate, requireRole('admin'), async (req, res) => {
  const { to } = req.body || {};
  if (!to || typeof to !== 'string') {
    return res.status(400).json({ error: 'Email address required' });
  }
  const trimmed = to.trim();
  if (!trimmed) return res.status(400).json({ error: 'Email address required' });
  const tenantId = req.tenant?.id || 1;
  try {
    const { clearCache, getEmailConfigStatus } = require('./services/email');
    clearCache(tenantId);
    const status = await getEmailConfigStatus(tenantId);
    if (!status.ready) {
      return res.json({ success: false, message: status.reason || 'SMTP not configured', mock: true });
    }
    const site = await getSiteConfig(tenantId);
    const subject = `Test email from ${site.site_name}`;
    const html = `<p>This is a test email. Your email (SMTP) settings are configured correctly.</p><p>— ${site.site_name}</p>`;
    const result = await sendEmail({ to: trimmed, subject, html, text: 'This is a test email. Your email (SMTP) settings are configured correctly.', tenantId });
    const message = result.mock ? (status.reason || 'SMTP not configured') : 'Test email sent';
    return res.json({ success: !result.mock, message, mock: result.mock });
  } catch (err) {
    console.error('Test email error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to send test email' });
  }
});

app.post('/api/settings/test-stripe', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const stripeTid = req.tenant?.id || 1;
    const stripe = await getStripe(stripeTid);
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
app.use('/api/superadmin',      require('./routes/superadmin'));
app.use('/api/tenant',          require('./routes/tenant'));

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

// ── Sitemap & robots.txt (SEO) ───────────────────────────
const BASE_URL = process.env.FRONTEND_URL || process.env.SITE_URL || 'http://localhost:5173';
app.get('/sitemap.xml', async (req, res) => {
  try {
    const [pages] = await db.query("SELECT slug FROM pages WHERE tenant_id = 1 AND status = 'published'");
    const [tenants] = await db.query("SELECT slug FROM tenants WHERE status = 'active' AND slug != 'default'");
    const urls = [
      { loc: BASE_URL.replace(/\/$/, '') + '/', changefreq: 'daily', priority: '1.0' },
      { loc: BASE_URL.replace(/\/$/, '') + '/#for-pros', changefreq: 'weekly', priority: '0.9' },
      { loc: BASE_URL.replace(/\/$/, '') + '/#login', changefreq: 'monthly', priority: '0.5' },
      ...pages.map(p => ({ loc: `${BASE_URL.replace(/\/$/, '')}/#page/${p.slug}`, changefreq: 'weekly', priority: '0.7' })),
      ...tenants.map(t => ({ loc: `${BASE_URL.replace(/\/$/, '')}/#t/${t.slug}`, changefreq: 'weekly', priority: '0.8' })),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${escapeXml(u.loc)}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});
function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

app.get('/robots.txt', (req, res) => {
  const sitemapUrl = `${BASE_URL.replace(/\/$/, '')}/sitemap.xml`;
  res.type('text/plain').send(`User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`);
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

// 404
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
