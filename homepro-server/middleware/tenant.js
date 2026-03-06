const db = require('../db');

// In-memory cache: hostname → tenant row (TTL: 5 min)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

let defaultTenant = null;

async function getDefaultTenant() {
  if (defaultTenant) return defaultTenant;
  const [rows] = await db.query('SELECT * FROM tenants WHERE id = 1 LIMIT 1');
  defaultTenant = rows[0] || { id: 1, name: 'Default', slug: 'default', status: 'active' };
  return defaultTenant;
}

function clearDefaultTenantCache() {
  defaultTenant = null;
}

async function resolveTenant(hostname) {
  // Strip port if present (e.g. localhost:3001 → localhost)
  const host = (hostname || '').replace(/:\d+$/, '').toLowerCase();

  // Dev/install bypass: localhost always maps to default tenant
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return getDefaultTenant();
  }

  const cached = cache.get(host);
  if (cached && Date.now() < cached.expiry) return cached.tenant;

  // Look up by custom_domain first, then by slug-derived subdomain
  const [rows] = await db.query(
    'SELECT * FROM tenants WHERE custom_domain = ? AND status = ? LIMIT 1',
    [host, 'active']
  );

  let tenant;
  if (rows.length) {
    tenant = rows[0];
  } else {
    // Try slug match (e.g. "acme.yourplatform.com" → slug "acme")
    const subdomain = host.split('.')[0];
    const [slugRows] = await db.query(
      'SELECT * FROM tenants WHERE slug = ? AND status = ? LIMIT 1',
      [subdomain, 'active']
    );
    tenant = slugRows[0] || await getDefaultTenant();
  }

  cache.set(host, { tenant, expiry: Date.now() + CACHE_TTL });
  return tenant;
}

/**
 * Express middleware — attaches req.tenant to every request.
 * Falls back to the default tenant (id=1) for unrecognised hosts.
 */
async function tenantMiddleware(req, res, next) {
  try {
    req.tenant = await resolveTenant(req.hostname);
    next();
  } catch (err) {
    // Never block a request due to tenant resolution failure
    console.error('[TENANT] Resolution error:', err.message);
    req.tenant = { id: 1, name: 'Default', slug: 'default', status: 'active' };
    next();
  }
}

function clearTenantCache(hostname) {
  if (hostname) {
    cache.delete(hostname.toLowerCase());
  } else {
    cache.clear();
  }
  clearDefaultTenantCache();
}

module.exports = { tenantMiddleware, clearTenantCache };
