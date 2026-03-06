const jwt = require('jsonwebtoken');
const db  = require('../db');

const JWT_SECRET  = process.env.JWT_SECRET  || 'homepro_dev_secret_change_in_production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, tenantId: user.tenant_id || user.tenantId || 1 },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const [rows] = await db.query(
      'SELECT id, tenant_id, email, role, first_name, last_name, phone, is_active FROM users WHERE id = ?',
      [decoded.id]
    );
    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    req.user = rows[0];

    // Dev convenience: on localhost, bind request tenant to authenticated user's tenant.
    // This allows tenant admins to test/login locally without a custom domain.
    const host = (req.hostname || '').toLowerCase();
    if (!host || host === 'localhost' || host === '127.0.0.1') {
      req.tenant = { ...(req.tenant || {}), id: rows[0].tenant_id };
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(403).json({ error: 'Insufficient permissions' });
    // superadmin has access to everything (unless explicitly excluded)
    if (req.user.role === 'superadmin') return next();
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Optional auth — attaches user if token present but doesn't block
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
      const [rows] = await db.query('SELECT id, email, role, first_name, last_name FROM users WHERE id = ?', [decoded.id]);
      if (rows.length) req.user = rows[0];
    } catch {}
  }
  next();
}

module.exports = { generateToken, authenticate, requireRole, optionalAuth, JWT_SECRET };
