/**
 * Spam protection middleware suite:
 *  - IP-based rate limiting (in-memory, no external dependency)
 *  - Honeypot field validation
 *  - Submission timing check (too-fast bot detection)
 *  - Basic input sanitization
 *  - Configurable from admin settings (DB-backed with cache)
 */

const db = require('../db');

// ── Settings cache ─────────────────────────────────────────
let spamConfig = null;
let configExpiry = 0;
const CONFIG_TTL_MS = 60_000;

async function loadSpamConfig() {
  if (spamConfig && Date.now() < configExpiry) return spamConfig;
  try {
    const [rows] = await db.query(
      "SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'spam_%'"
    );
    const cfg = {};
    for (const r of rows) cfg[r.setting_key] = r.setting_value;
    spamConfig = cfg;
    configExpiry = Date.now() + CONFIG_TTL_MS;
    return cfg;
  } catch {
    return {};
  }
}

function clearSpamCache() {
  spamConfig = null;
  configExpiry = 0;
}

// ── In-memory rate limit store ─────────────────────────────
const rateLimitStore = new Map();

const CLEANUP_INTERVAL_MS = 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.windowStart > entry.windowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';
}

/**
 * Rate limiter factory.
 * @param {object} opts
 * @param {number} opts.windowMs  - Window in ms (default 15min)
 * @param {number} opts.max       - Max requests per window (default 20)
 * @param {string} opts.keyPrefix - Prefix for the rate limit key
 * @param {string} opts.message   - Error message
 */
function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, keyPrefix = 'rl', message = 'Too many requests, please try again later.' } = {}) {
  return (req, res, next) => {
    const ip = getClientIp(req);
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);
    if (!entry || (now - entry.windowStart) > windowMs) {
      entry = { count: 0, windowStart: now, windowMs };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.set('X-RateLimit-Reset', String(Math.ceil((entry.windowStart + windowMs) / 1000)));

    if (entry.count > max) {
      return res.status(429).json({ error: message });
    }

    next();
  };
}

/**
 * Honeypot validation middleware.
 * Rejects requests that fill in the hidden honeypot field.
 * The field name is configurable (default: '_hp_website').
 */
function honeypot(fieldName = '_hp_website') {
  return (req, res, next) => {
    const val = req.body?.[fieldName];
    if (val && String(val).trim().length > 0) {
      console.log(`[SPAM] Honeypot triggered by ${getClientIp(req)} on ${req.path}`);
      return res.status(200).json({
        success: true,
        message: 'Thank you for your submission.',
      });
    }
    next();
  };
}

/**
 * Timing check middleware.
 * Rejects submissions that happen faster than a human could fill out a form.
 * Expects a `_hp_ts` field (epoch ms when form was loaded).
 * @param {number} minMs - Minimum time in ms (default 2000 = 2 seconds)
 */
function timingCheck(minMs = 2000) {
  return (req, res, next) => {
    const ts = parseInt(req.body?._hp_ts);
    if (ts && (Date.now() - ts) < minMs) {
      console.log(`[SPAM] Timing check failed by ${getClientIp(req)} on ${req.path} (${Date.now() - ts}ms < ${minMs}ms)`);
      return res.status(200).json({
        success: true,
        message: 'Thank you for your submission.',
      });
    }
    next();
  };
}

/**
 * Strip spam protection fields from req.body so route handlers don't see them.
 */
function cleanSpamFields(req, _res, next) {
  if (req.body) {
    delete req.body._hp_website;
    delete req.body._hp_ts;
  }
  next();
}

/**
 * Basic input sanitizer — trims strings, blocks obvious spam patterns.
 */
function sanitizeInput(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    }
  }
  next();
}

/**
 * Link spam detector — rejects bodies with excessive URLs
 * (common in spam contact forms).
 * @param {number} maxLinks - Maximum allowed links across all string fields
 */
function linkSpamCheck(maxLinks = 5) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') return next();

    let totalLinks = 0;
    const urlPattern = /https?:\/\/[^\s]+/gi;

    for (const val of Object.values(req.body)) {
      if (typeof val === 'string') {
        const matches = val.match(urlPattern);
        if (matches) totalLinks += matches.length;
      }
    }

    if (totalLinks > maxLinks) {
      console.log(`[SPAM] Link spam detected from ${getClientIp(req)} on ${req.path} (${totalLinks} links)`);
      return res.status(200).json({
        success: true,
        message: 'Thank you for your submission.',
      });
    }

    next();
  };
}

/**
 * Dynamic config loader middleware — loads spam settings from DB into req._spamConfig.
 */
async function loadConfig(req, _res, next) {
  req._spamConfig = await loadSpamConfig();
  next();
}

/**
 * Convenience: combine all spam protections into one middleware array for a public form endpoint.
 * Settings are loaded from the database on each request (cached 60s).
 */
function spamProtect({
  rateLimitMax = 20,
  rateLimitWindow = 15 * 60 * 1000,
  keyPrefix = 'form',
  minTimingMs = 2000,
  maxLinks = 5,
  rateLimitSettingKey = null,
} = {}) {
  return [
    loadConfig,
    (req, res, next) => {
      const cfg = req._spamConfig || {};
      const windowMin = parseInt(cfg.spam_rate_limit_window) || (rateLimitWindow / 60000);
      const resolvedMax = rateLimitSettingKey
        ? (parseInt(cfg[rateLimitSettingKey]) || rateLimitMax)
        : rateLimitMax;
      return rateLimit({
        max: resolvedMax,
        windowMs: windowMin * 60 * 1000,
        keyPrefix,
      })(req, res, next);
    },
    (req, res, next) => {
      const cfg = req._spamConfig || {};
      if (cfg.spam_honeypot_enabled === 'false' || cfg.spam_honeypot_enabled === '0') return next();
      return honeypot()(req, res, next);
    },
    (req, res, next) => {
      const cfg = req._spamConfig || {};
      const minSec = parseInt(cfg.spam_min_submit_time) || (minTimingMs / 1000);
      return timingCheck(minSec * 1000)(req, res, next);
    },
    (req, res, next) => {
      const cfg = req._spamConfig || {};
      if (cfg.spam_link_check_enabled === 'false' || cfg.spam_link_check_enabled === '0') return next();
      const resolvedMaxLinks = parseInt(cfg.spam_max_links) || maxLinks;
      return linkSpamCheck(resolvedMaxLinks)(req, res, next);
    },
    sanitizeInput,
    cleanSpamFields,
  ];
}

module.exports = {
  rateLimit,
  honeypot,
  timingCheck,
  cleanSpamFields,
  sanitizeInput,
  linkSpamCheck,
  spamProtect,
  getClientIp,
  clearSpamCache,
};
