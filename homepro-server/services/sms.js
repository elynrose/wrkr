const twilio = require('twilio');
const db = require('../db');

let client = null;
let cachedConfig = null;
let cacheExpiry = 0;

const CACHE_TTL_MS = 60_000;

async function loadConfig() {
  if (cachedConfig && Date.now() < cacheExpiry) return cachedConfig;
  try {
    const [rows] = await db.query(
      "SELECT setting_key, setting_value FROM settings WHERE setting_group = 'twilio'"
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
  client = null;
}

function buildClient(sid, token) {
  if (!sid || !token) return null;
  return twilio(sid, token);
}

async function getClient() {
  if (client) return client;
  const cfg = await loadConfig();
  const sid   = cfg.twilio_account_sid   || process.env.TWILIO_ACCOUNT_SID;
  const token = cfg.twilio_auth_token    || process.env.TWILIO_AUTH_TOKEN;
  client = buildClient(sid, token);
  return client;
}

async function getFromNumber() {
  const cfg = await loadConfig();
  return cfg.twilio_phone_number || process.env.TWILIO_PHONE_NUMBER || '';
}

async function isSmsEnabled() {
  const cfg = await loadConfig();
  const enabledFlag = cfg.twilio_enabled;
  if (enabledFlag === 'true' || enabledFlag === '1') return true;
  if (enabledFlag === 'false' || enabledFlag === '0') return false;
  return await isConfigured();
}

async function sendSMS(to, body) {
  const enabled = await isSmsEnabled();
  const tw = await getClient();

  if (!enabled || !tw) {
    console.log(`[SMS MOCK] To: ${to} | Body: ${body}`);
    return { sid: `MOCK_${Date.now()}`, mock: true };
  }

  try {
    const from = await getFromNumber();
    const msg = await tw.messages.create({ to, from, body });
    console.log(`[SMS] Sent to ${to} — SID: ${msg.sid}`);
    return { sid: msg.sid, mock: false };
  } catch (err) {
    console.error(`[SMS ERROR] To: ${to} — ${err.message}`);
    throw err;
  }
}

async function isConfigured() {
  const cfg = await loadConfig();
  const sid   = cfg.twilio_account_sid   || process.env.TWILIO_ACCOUNT_SID;
  const token = cfg.twilio_auth_token    || process.env.TWILIO_AUTH_TOKEN;
  const phone = cfg.twilio_phone_number  || process.env.TWILIO_PHONE_NUMBER;
  return !!(sid && token && phone);
}

async function getMatchConfig() {
  const cfg = await loadConfig();
  return {
    notifyCount:  parseInt(cfg.match_notify_count)  || parseInt(process.env.MATCH_NOTIFY_COUNT) || 8,
    expiryHours:  parseInt(cfg.match_expiry_hours)   || parseInt(process.env.MATCH_EXPIRY_HOURS) || 4,
  };
}

module.exports = { sendSMS, isConfigured, clearCache, getMatchConfig };
