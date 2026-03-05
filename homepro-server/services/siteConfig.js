const db = require('../db');

let cached = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000;

/**
 * Get public site settings (site_name, support_email, support_phone, site_tagline).
 * Used by backend services (email, payments) and can be used by any route.
 */
async function getSiteConfig() {
  if (cached && Date.now() < cacheExpiry) return cached;
  try {
    const [rows] = await db.query(
      "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('site_name', 'support_email', 'support_phone', 'site_tagline')"
    );
    const cfg = { site_name: 'HomePro', support_email: 'support@homepro.com', support_phone: '1-800-HOMEPRO', site_tagline: 'Find Trusted Local Service Professionals' };
    for (const r of rows) cfg[r.setting_key] = r.setting_value || cfg[r.setting_key];
    cached = cfg;
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return cfg;
  } catch {
    return { site_name: 'HomePro', support_email: 'support@homepro.com', support_phone: '1-800-HOMEPRO', site_tagline: 'Find Trusted Local Service Professionals' };
  }
}

function clearSiteConfigCache() {
  cached = null;
  cacheExpiry = 0;
}

module.exports = { getSiteConfig, clearSiteConfigCache };
