/**
 * Stripe client per tenant. Key from settings (stripe_secret_key) or env STRIPE_SECRET_KEY.
 * getStripe() returns null when no key is set; callers must check and return 503 or skip payment flows.
 */
const db = require('../db');

const stripeByTenant = new Map();
const cachedKeyByTenant = new Map();
const cacheExpiryByTenant = new Map();
const CACHE_TTL_MS = 60_000;

async function getKeyFromDB(tenantId = 1) {
  try {
    const [rows] = await db.query(
      "SELECT setting_value FROM settings WHERE setting_key = 'stripe_secret_key' AND setting_value != '' AND tenant_id = ? LIMIT 1",
      [tenantId || 1]
    );
    return rows.length ? rows[0].setting_value : null;
  } catch {
    return null;
  }
}

async function getStripe(tenantId = 1) {
  const tid = tenantId || 1;
  const envKey = process.env.STRIPE_SECRET_KEY;

  const expiry = cacheExpiryByTenant.get(tid) || 0;
  if (Date.now() < expiry && stripeByTenant.has(tid)) return stripeByTenant.get(tid);

  const dbKey = await getKeyFromDB(tid);
  const key = dbKey || envKey;

  if (!key) return null;

  if (key !== cachedKeyByTenant.get(tid) || !stripeByTenant.has(tid)) {
    stripeByTenant.set(tid, require('stripe')(key));
    cachedKeyByTenant.set(tid, key);
  }

  cacheExpiryByTenant.set(tid, Date.now() + CACHE_TTL_MS);
  return stripeByTenant.get(tid);
}

function clearCache(tenantId) {
  if (tenantId != null) {
    stripeByTenant.delete(tenantId);
    cachedKeyByTenant.delete(tenantId);
    cacheExpiryByTenant.delete(tenantId);
  } else {
    stripeByTenant.clear();
    cachedKeyByTenant.clear();
    cacheExpiryByTenant.clear();
  }
}

module.exports = { getStripe, clearCache };
