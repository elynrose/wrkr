const nodemailer = require('nodemailer');
const db = require('../db');

let transporter = null;
let cachedConfig = null;
let cacheExpiry = 0;
let templateCache = {};
let templateCacheExpiry = 0;

const CACHE_TTL_MS = 60_000;

// ── SMTP config ─────────────────────────────────────────────

async function loadConfig() {
  if (cachedConfig && Date.now() < cacheExpiry) return cachedConfig;
  try {
    const [rows] = await db.query(
      "SELECT setting_key, setting_value FROM settings WHERE setting_group = 'email'"
    );
    const cfg = {};
    for (const r of rows) cfg[r.setting_key] = r.setting_value;
    cachedConfig = cfg;
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return cfg;
  } catch {
    return {};
  }
}

function clearCache() {
  cachedConfig = null;
  cacheExpiry = 0;
  transporter = null;
}

function clearTemplateCache() {
  templateCache = {};
  templateCacheExpiry = 0;
}

async function getTransporter() {
  if (transporter) return transporter;
  const cfg = await loadConfig();
  const host = cfg.smtp_host;
  const port = parseInt(cfg.smtp_port) || 587;
  const secure = cfg.smtp_secure === 'true' || cfg.smtp_secure === '1';
  const user = cfg.smtp_user;
  const pass = cfg.smtp_password;

  if (!host || !user) return null;

  transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  return transporter;
}

async function isEnabled() {
  const cfg = await loadConfig();
  return cfg.email_enabled === 'true' || cfg.email_enabled === '1';
}

async function sendEmail({ to, subject, html, text }) {
  const enabled = await isEnabled();
  const cfg = await loadConfig();
  const fromName = cfg.email_from_name || 'HomePro';
  const fromAddr = cfg.email_from_address || 'noreply@homepro.com';
  const from = `"${fromName}" <${fromAddr}>`;

  if (!enabled) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    return { messageId: `MOCK_${Date.now()}`, mock: true };
  }

  const tp = await getTransporter();
  if (!tp) {
    console.log(`[EMAIL MOCK — no SMTP configured] To: ${to} | Subject: ${subject}`);
    return { messageId: `MOCK_${Date.now()}`, mock: true };
  }

  try {
    const info = await tp.sendMail({ from, to, subject, html, text });
    console.log(`[EMAIL] Sent to ${to} — ID: ${info.messageId}`);
    return { messageId: info.messageId, mock: false };
  } catch (err) {
    console.error(`[EMAIL ERROR] To: ${to} — ${err.message}`);
    throw err;
  }
}

// ── Template engine ─────────────────────────────────────────

function renderTemplate(text, vars) {
  if (!text) return '';
  let result = text;
  result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, content) => {
    return vars[key] ? renderTemplate(content, vars) : '';
  });
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
  return result;
}

async function getTemplate(slug) {
  if (templateCache[slug] && Date.now() < templateCacheExpiry) return templateCache[slug];
  try {
    const [rows] = await db.query(
      'SELECT * FROM notification_templates WHERE slug = ? AND is_active = TRUE LIMIT 1',
      [slug]
    );
    if (rows.length) {
      templateCache[slug] = rows[0];
      templateCacheExpiry = Date.now() + CACHE_TTL_MS;
      return rows[0];
    }
  } catch (err) {
    console.error(`[EMAIL] Failed to load template "${slug}":`, err.message);
  }
  return null;
}

function wrap(title, body) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:#2563eb;padding:24px 32px;">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">HomePro</h1>
  </div>
  <div style="padding:32px;">
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">${title}</h2>
    ${body}
  </div>
  <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} HomePro. All rights reserved.</p>
  </div>
</div>
</body></html>`;
}

async function sendTemplatedEmail(slug, to, vars) {
  const tmpl = await getTemplate(slug);
  if (!tmpl) {
    console.log(`[EMAIL] Template "${slug}" not found or inactive — skipping`);
    return null;
  }
  const renderedBody = renderTemplate(tmpl.body, vars);
  const renderedSubject = renderTemplate(tmpl.subject || '', vars);
  const html = wrap(renderedSubject, renderedBody);
  return sendEmail({ to, subject: renderedSubject, html });
}

// ── Specific email senders ──────────────────────────────────

const DASHBOARD_URL = () => process.env.FRONTEND_URL || 'http://localhost:5173';

async function sendWelcomeEmail(user) {
  const slug = user.role === 'pro' ? 'welcome_pro' : 'welcome_consumer';
  return sendTemplatedEmail(slug, user.email, {
    firstName: user.firstName || 'there',
    email: user.email,
    role: user.role,
    dashboardUrl: DASHBOARD_URL(),
  });
}

async function sendProWelcomeEmail(user, proData) {
  return sendTemplatedEmail('welcome_pro', user.email, {
    firstName: user.firstName || proData.businessName || 'there',
    businessName: proData.businessName || '',
    email: user.email,
    credits: String(proData.credits || 10),
    dashboardUrl: DASHBOARD_URL(),
  });
}

async function sendPasswordChangedEmail(user) {
  return sendTemplatedEmail('password_changed', user.email, {
    firstName: user.firstName || 'there',
  });
}

async function sendNewLeadEmail(lead) {
  return sendTemplatedEmail('new_lead_submitted', lead.email, {
    serviceName: lead.service_name || lead.service || 'N/A',
    customerName: lead.customer_name || lead.name || 'N/A',
    zip: lead.zip || 'N/A',
    urgency: lead.urgency || 'flexible',
    description: lead.description ? lead.description.substring(0, 200) : '',
  });
}

async function sendLeadClaimedEmailToCustomer(lead, pro) {
  return sendTemplatedEmail('lead_claimed_customer', lead.email, {
    serviceName: lead.service_name || 'service',
    businessName: pro.business_name,
    avgRating: pro.avg_rating ? `${pro.avg_rating}/5 (${pro.total_reviews} reviews)` : 'New pro',
    totalReviews: String(pro.total_reviews || 0),
    proPhone: pro.phone || '',
    maxClaims: String(lead.max_claims || 4),
  });
}

async function sendLeadClaimedEmailToPro(proEmail, lead, proData) {
  return sendTemplatedEmail('lead_claimed_pro', proEmail, {
    businessName: proData.business_name || 'there',
    serviceName: lead.service_name || 'N/A',
    customerName: lead.customer_name || 'N/A',
    customerEmail: lead.email,
    customerPhone: lead.phone || 'N/A',
    zip: lead.zip || 'N/A',
    description: lead.description || '',
    dashboardUrl: DASHBOARD_URL(),
  });
}

async function sendLeadMatchEmail(proEmail, lead, matchData) {
  const claimUrl = matchData.claimUrl || `${DASHBOARD_URL()}/#claim/${matchData.token}`;
  return sendTemplatedEmail('lead_match_pro', proEmail, {
    serviceName: lead.service_name || 'N/A',
    zip: lead.zip || 'N/A',
    urgency: lead.urgency || 'flexible',
    matchScore: String(matchData.score || 'N/A'),
    description: lead.description ? lead.description.substring(0, 200) : '',
    claimUrl,
    expiryHours: String(matchData.expiryHours || 4),
    maxClaims: String(matchData.maxClaims || 3),
  });
}

// ── SMS template helper (used by matchEngine) ───────────────

async function getSmsTemplate(slug) {
  return getTemplate(slug);
}

module.exports = {
  sendEmail,
  clearCache,
  clearTemplateCache,
  renderTemplate,
  getTemplate,
  getSmsTemplate,
  sendWelcomeEmail,
  sendProWelcomeEmail,
  sendPasswordChangedEmail,
  sendNewLeadEmail,
  sendLeadClaimedEmailToCustomer,
  sendLeadClaimedEmailToPro,
  sendLeadMatchEmail,
};
