const db = require('../db');

let stripeInstance = null;
let cachedKey = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000;

async function getKeyFromDB() {
  try {
    const [rows] = await db.query(
      "SELECT setting_value FROM settings WHERE setting_key = 'stripe_secret_key' AND setting_value != '' LIMIT 1"
    );
    return rows.length ? rows[0].setting_value : null;
  } catch {
    return null;
  }
}

async function getStripe() {
  const envKey = process.env.STRIPE_SECRET_KEY;

  if (Date.now() < cacheExpiry && stripeInstance) return stripeInstance;

  const dbKey = await getKeyFromDB();
  const key = dbKey || envKey;

  if (!key) return null;

  if (key !== cachedKey || !stripeInstance) {
    stripeInstance = require('stripe')(key);
    cachedKey = key;
  }

  cacheExpiry = Date.now() + CACHE_TTL_MS;
  return stripeInstance;
}

function clearCache() {
  stripeInstance = null;
  cachedKey = null;
  cacheExpiry = 0;
}

module.exports = { getStripe, clearCache };
