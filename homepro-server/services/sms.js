/**
 * Twilio SMS per tenant from settings (twilio group) or env. When not configured or disabled,
 * sendSMS logs and returns { sid: 'MOCK_...', mock: true } so matching/notifications don't throw.
 */
const twilio = require('twilio');
const db = require('../db');

const clientByTenant = new Map();
const cachedConfigByTenant = new Map();
const cacheExpiryByTenant = new Map();

const CACHE_TTL_MS = 60_000;

async function loadConfig(tenantId = 1) {
  const tid = tenantId || 1;
  const expiry = cacheExpiryByTenant.get(tid) || 0;
  if (cachedConfigByTenant.has(tid) && Date.now() < expiry) return cachedConfigByTenant.get(tid);
  try {
    const [rows] = await db.query(
      "SELECT setting_key, setting_value FROM settings WHERE setting_group = 'twilio' AND tenant_id = ?",
      [tid]
    );
    const cfg = {};
    for (const r of rows) cfg[r.setting_key] = r.setting_value;
    cachedConfigByTenant.set(tid, cfg);
    cacheExpiryByTenant.set(tid, Date.now() + CACHE_TTL_MS);
    return cfg;
  } catch {
    return {};
  }
}

function clearCache(tenantId) {
  if (tenantId != null) {
    cachedConfigByTenant.delete(tenantId);
    cacheExpiryByTenant.delete(tenantId);
    clientByTenant.delete(tenantId);
  } else {
    cachedConfigByTenant.clear();
    cacheExpiryByTenant.clear();
    clientByTenant.clear();
  }
}

function buildClient(sid, token) {
  if (!sid || !token) return null;
  return twilio(sid, token);
}

async function getClient(tenantId = 1) {
  const tid = tenantId || 1;
  if (clientByTenant.has(tid)) return clientByTenant.get(tid);
  const cfg = await loadConfig(tid);
  const sid   = cfg.twilio_account_sid   || process.env.TWILIO_ACCOUNT_SID;
  const token = cfg.twilio_auth_token    || process.env.TWILIO_AUTH_TOKEN;
  const c = buildClient(sid, token);
  clientByTenant.set(tid, c);
  return c;
}

async function getFromNumber(tenantId = 1) {
  const cfg = await loadConfig(tenantId);
  return cfg.twilio_phone_number || process.env.TWILIO_PHONE_NUMBER || '';
}

async function isSmsEnabled(tenantId = 1) {
  const cfg = await loadConfig(tenantId);
  const enabledFlag = cfg.twilio_enabled;
  if (enabledFlag === 'true' || enabledFlag === '1') return true;
  if (enabledFlag === 'false' || enabledFlag === '0') return false;
  return await isConfigured(tenantId);
}

async function sendSMS(to, body, tenantId = 1) {
  const enabled = await isSmsEnabled(tenantId);
  const tw = await getClient(tenantId);

  if (!enabled || !tw) {
    console.log(`[SMS MOCK] To: ${to} | Body: ${body}`);
    return { sid: `MOCK_${Date.now()}`, mock: true };
  }

  try {
    const from = await getFromNumber(tenantId);
    const msg = await tw.messages.create({ to, from, body });
    console.log(`[SMS] Sent to ${to} — SID: ${msg.sid}`);
    return { sid: msg.sid, mock: false };
  } catch (err) {
    console.error(`[SMS ERROR] To: ${to} — ${err.message}`);
    throw err;
  }
}

async function isConfigured(tenantId = 1) {
  const cfg = await loadConfig(tenantId);
  const sid   = cfg.twilio_account_sid   || process.env.TWILIO_ACCOUNT_SID;
  const token = cfg.twilio_auth_token    || process.env.TWILIO_AUTH_TOKEN;
  const phone = cfg.twilio_phone_number  || process.env.TWILIO_PHONE_NUMBER;
  return !!(sid && token && phone);
}

async function getMatchConfig(tenantId = 1) {
  const cfg = await loadConfig(tenantId);
  return {
    notifyCount:  parseInt(cfg.match_notify_count)  || parseInt(process.env.MATCH_NOTIFY_COUNT) || 8,
    expiryHours:  parseInt(cfg.match_expiry_hours)   || parseInt(process.env.MATCH_EXPIRY_HOURS) || 4,
  };
}

module.exports = { sendSMS, isConfigured, clearCache, getMatchConfig };
