/**
 * Email service: SMTP per tenant from settings (email group).
 * Supports SendGrid via SENDGRID_API_KEY env: uses smtp.sendgrid.net with user "apikey" and password = API key.
 * When email is disabled or SMTP not configured, sendEmail logs and returns { mock: true } so callers don't throw.
 */
const nodemailer = require('nodemailer');
const db = require('../db');
const { getSiteConfig } = require('./siteConfig');

const transporterByTenant = new Map();
const configByTenant = new Map();
const configExpiryByTenant = new Map();
let templateCache = {};
let templateCacheExpiry = 0;

const CACHE_TTL_MS = 60_000;

// ── SMTP config ─────────────────────────────────────────────

async function loadConfig(tenantId = 1) {
  const tid = tenantId || 1;
  const expiry = configExpiryByTenant.get(tid) || 0;
  if (configByTenant.get(tid) && Date.now() < expiry) return configByTenant.get(tid);
  try {
    const [rows] = await db.query(
      "SELECT setting_key, setting_value FROM settings WHERE setting_group = 'email' AND tenant_id = ?",
      [tid]
    );
    const cfg = {};
    for (const r of rows) cfg[r.setting_key] = r.setting_value;
    configByTenant.set(tid, cfg);
    configExpiryByTenant.set(tid, Date.now() + CACHE_TTL_MS);
    return cfg;
  } catch {
    return {};
  }
}

function clearCache(tenantId) {
  if (tenantId != null) {
    configByTenant.delete(tenantId);
    configExpiryByTenant.delete(tenantId);
    transporterByTenant.delete(tenantId);
  } else {
    configByTenant.clear();
    configExpiryByTenant.clear();
    transporterByTenant.clear();
  }
}

function clearTemplateCache() {
  templateCache = {};
  templateCacheExpiry = 0;
}

/** SendGrid SMTP: host, port, and auth when SENDGRID_API_KEY is set */
const SENDGRID_SMTP = {
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY || '' },
};

async function getTransporter(tenantId = 1) {
  const tid = tenantId || 1;
  if (transporterByTenant.has(tid)) return transporterByTenant.get(tid);
  const cfg = await loadConfig(tid);
  let host = (cfg.smtp_host || '').trim();
  let port = parseInt(cfg.smtp_port) || 587;
  let secure = cfg.smtp_secure === 'true' || cfg.smtp_secure === '1';
  let user = (cfg.smtp_user || '').trim();
  let pass = cfg.smtp_password;

  // Use SendGrid SMTP when SENDGRID_API_KEY is set and no custom SMTP host is configured
  if (!host && process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.trim()) {
    host = SENDGRID_SMTP.host;
    port = SENDGRID_SMTP.port;
    secure = SENDGRID_SMTP.secure;
    user = SENDGRID_SMTP.auth.user;
    pass = SENDGRID_SMTP.auth.pass;
  }

  if (!host) return null;

  const opts = { host, port, secure };
  if (user && pass) opts.auth = { user, pass };
  const tp = nodemailer.createTransport(opts);
  transporterByTenant.set(tid, tp);
  return tp;
}

async function isEnabled(tenantId = 1) {
  const cfg = await loadConfig(tenantId || 1);
  return cfg.email_enabled === 'true' || cfg.email_enabled === '1';
}

/** Returns { ready, reason } for diagnostic messages */
async function getEmailConfigStatus(tenantId = 1) {
  const cfg = await loadConfig(tenantId || 1);
  if (cfg.email_enabled !== 'true' && cfg.email_enabled !== '1') {
    return { ready: false, reason: 'Enable "Email Enabled" and save settings first' };
  }
  const host = (cfg.smtp_host || '').trim();
  const useSendGrid = !host && process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.trim();
  if (!host && !useSendGrid) {
    return { ready: false, reason: 'Configure SMTP in Admin → Settings → Email, or set SENDGRID_API_KEY in environment for SendGrid' };
  }
  return { ready: true, reason: useSendGrid ? 'SendGrid (SENDGRID_API_KEY)' : undefined };
}

async function sendEmail({ to, subject, html, text, tenantId }) {
  const tid = tenantId || 1;
  const enabled = await isEnabled(tid);
  const cfg = await loadConfig(tid);
  const fromName = cfg.email_from_name || 'HomePro';
  const fromAddr = cfg.email_from_address || 'noreply@homepro.com';
  const from = `"${fromName}" <${fromAddr}>`;

  if (!enabled) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    return { messageId: `MOCK_${Date.now()}`, mock: true };
  }

  const tp = await getTransporter(tid);
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

async function getTemplate(slug, tenantId = 1) {
  const tid = tenantId || 1;
  const cacheKey = `${tid}_${slug}`;
  if (templateCache[cacheKey] && Date.now() < templateCacheExpiry) return templateCache[cacheKey];
  try {
    const [rows] = await db.query(
      'SELECT * FROM notification_templates WHERE slug = ? AND is_active = TRUE AND tenant_id = ? LIMIT 1',
      [slug, tid]
    );
    if (rows.length) {
      templateCache[cacheKey] = rows[0];
      templateCacheExpiry = Date.now() + CACHE_TTL_MS;
      return rows[0];
    }
  } catch (err) {
    console.error(`[EMAIL] Failed to load template "${slug}":`, err.message);
  }
  return null;
}

function wrap(title, body, siteName = 'HomePro') {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:#2563eb;padding:24px 32px;">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">${siteName}</h1>
  </div>
  <div style="padding:32px;">
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">${title}</h2>
    ${body}
  </div>
  <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
  </div>
</div>
</body></html>`;
}

async function sendTemplatedEmail(slug, to, vars, tenantId = 1) {
  const tid = tenantId || 1;
  const [tmpl, site] = await Promise.all([getTemplate(slug, tid), getSiteConfig(tid)]);
  if (!tmpl) {
    console.log(`[EMAIL] Template "${slug}" not found or inactive — skipping`);
    return null;
  }
  const allVars = { ...vars, siteName: site.site_name, supportEmail: site.support_email, supportPhone: site.support_phone };
  const renderedBody = renderTemplate(tmpl.body, allVars);
  const renderedSubject = renderTemplate(tmpl.subject || '', allVars);
  const html = wrap(renderedSubject, renderedBody, site.site_name);
  return sendEmail({ to, subject: renderedSubject, html, tenantId: tid });
}

// ── Specific email senders ──────────────────────────────────

const DASHBOARD_URL = () => process.env.FRONTEND_URL || 'http://localhost:5173';

async function sendWelcomeEmail(user, tenantId = 1) {
  const slug = user.role === 'pro' ? 'welcome_pro' : 'welcome_consumer';
  return sendTemplatedEmail(slug, user.email, {
    firstName: user.firstName || 'there',
    email: user.email,
    role: user.role,
    dashboardUrl: DASHBOARD_URL(),
  }, tenantId);
}

async function sendProWelcomeEmail(user, proData, tenantId = 1) {
  return sendTemplatedEmail('welcome_pro', user.email, {
    firstName: user.firstName || proData.businessName || 'there',
    businessName: proData.businessName || '',
    email: user.email,
    credits: String(proData.credits || 10),
    dashboardUrl: DASHBOARD_URL(),
  }, tenantId);
}

async function sendPasswordChangedEmail(user, tenantId = 1) {
  return sendTemplatedEmail('password_changed', user.email, {
    firstName: user.firstName || 'there',
    supportEmail: (await getSiteConfig(tenantId)).support_email,
  }, tenantId);
}

async function sendPasswordResetEmail(user, resetUrl, tenantId = 1) {
  return sendTemplatedEmail('password_reset', user.email, {
    firstName: user.firstName || 'there',
    email: user.email,
    resetUrl,
    siteName: (await getSiteConfig(tenantId)).site_name || 'HomePro',
  }, tenantId);
}

async function sendEmailVerification(user, verifyUrl, tenantId = 1) {
  return sendTemplatedEmail('email_verify', user.email, {
    firstName: user.firstName || 'there',
    email: user.email,
    verifyUrl,
    siteName: (await getSiteConfig(tenantId)).site_name || 'HomePro',
  }, tenantId);
}

async function sendNewLeadEmail(lead, tenantId = 1) {
  return sendTemplatedEmail('new_lead_submitted', lead.email, {
    serviceName: lead.service_name || lead.service || 'N/A',
    customerName: lead.customer_name || lead.name || 'N/A',
    zip: lead.zip || 'N/A',
    urgency: lead.urgency || 'flexible',
    description: lead.description ? lead.description.substring(0, 200) : '',
  }, tenantId);
}

async function sendLeadClaimedEmailToCustomer(lead, pro, tenantId = 1) {
  return sendTemplatedEmail('lead_claimed_customer', lead.email, {
    serviceName: lead.service_name || 'service',
    businessName: pro.business_name,
    avgRating: pro.avg_rating ? `${pro.avg_rating}/5 (${pro.total_reviews} reviews)` : 'New pro',
    totalReviews: String(pro.total_reviews || 0),
    proPhone: pro.phone || '',
    maxClaims: String(lead.max_claims || 4),
  }, tenantId);
}

async function sendLeadClaimedEmailToPro(proEmail, lead, proData, tenantId = 1) {
  return sendTemplatedEmail('lead_claimed_pro', proEmail, {
    businessName: proData.business_name || 'there',
    serviceName: lead.service_name || 'N/A',
    customerName: lead.customer_name || 'N/A',
    customerEmail: lead.email,
    customerPhone: lead.phone || 'N/A',
    zip: lead.zip || 'N/A',
    description: lead.description || '',
    dashboardUrl: DASHBOARD_URL(),
  }, tenantId);
}

async function sendLeadMatchEmail(proEmail, lead, matchData, tenantId = 1) {
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
  }, tenantId);
}

// ── SMS template helper (used by matchEngine) ───────────────

async function getSmsTemplate(slug, tenantId = 1) {
  return getTemplate(slug, tenantId);
}

module.exports = {
  sendEmail,
  clearCache,
  getEmailConfigStatus,
  clearTemplateCache,
  renderTemplate,
  getTemplate,
  getSmsTemplate,
  sendWelcomeEmail,
  sendProWelcomeEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendNewLeadEmail,
  sendLeadClaimedEmailToCustomer,
  sendLeadClaimedEmailToPro,
  sendLeadMatchEmail,
};
