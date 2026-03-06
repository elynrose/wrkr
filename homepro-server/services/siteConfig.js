const db = require('../db');

// Per-tenant cache: tenantId → { data, expiry }
const cache = new Map();
const CACHE_TTL_MS = 60_000;

const DEFAULTS = {
  site_name: 'HomePro',
  support_email: 'support@homepro.com',
  support_phone: '1-800-HOMEPRO',
  site_tagline: 'Find Trusted Local Service Professionals',
};

/**
 * Get public site settings for a given tenant.
 * Falls back to defaults if DB query fails.
 * @param {number} tenantId - defaults to 1 (default tenant)
 */
async function getSiteConfig(tenantId = 1) {
  const tid = tenantId || 1;

  const cached = cache.get(tid);
  if (cached && Date.now() < cached.expiry) return cached.data;

  try {
    const [rows] = await db.query(
      "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('site_name', 'support_email', 'support_phone', 'site_tagline') AND tenant_id = ?",
      [tid]
    );
    const cfg = { ...DEFAULTS };
    for (const r of rows) cfg[r.setting_key] = r.setting_value || cfg[r.setting_key];
    cache.set(tid, { data: cfg, expiry: Date.now() + CACHE_TTL_MS });
    return cfg;
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Fetch all public settings for a tenant (used by the /api/tenant/config endpoint).
 */
async function getPublicSettings(tenantId = 1) {
  const tid = tenantId || 1;
  try {
    const [rows] = await db.query(
      'SELECT setting_key, setting_value, setting_type FROM settings WHERE is_public = TRUE AND tenant_id = ?',
      [tid]
    );
    const obj = {};
    for (const r of rows) obj[r.setting_key] = castValue(r.setting_value, r.setting_type);
    return obj;
  } catch {
    return {};
  }
}

function castValue(val, type) {
  if (type === 'number') return Number(val) || 0;
  if (type === 'boolean') return val === 'true' || val === '1';
  if (type === 'json') { try { return JSON.parse(val); } catch { return val; } }
  return val;
}

async function getRequireEmailVerification(tenantId = 1) {
  try {
    const [rows] = await db.query(
      "SELECT setting_value FROM settings WHERE setting_key = 'require_email_verification' AND tenant_id = ? LIMIT 1",
      [tenantId || 1]
    );
    return rows.length && (rows[0].setting_value === 'true' || rows[0].setting_value === '1');
  } catch {
    return false;
  }
}

function clearSiteConfigCache(tenantId) {
  if (tenantId) {
    cache.delete(tenantId);
  } else {
    cache.clear();
  }
}

module.exports = { getSiteConfig, getPublicSettings, getRequireEmailVerification, clearSiteConfigCache };
