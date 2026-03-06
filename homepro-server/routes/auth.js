const express = require('express');
const bcrypt  = require('bcryptjs');
const router  = express.Router();
const db      = require('../db');
const { generateToken, authenticate } = require('../middleware/auth');
const { sendWelcomeEmail, sendPasswordChangedEmail } = require('../services/email');
const { spamProtect, rateLimit } = require('../middleware/spam');

// POST /api/auth/register
router.post('/register', ...spamProtect({ keyPrefix: 'register', rateLimitMax: 10, rateLimitSettingKey: 'spam_rate_limit_max_register', minTimingMs: 3000 }), async (req, res) => {
  const { email, password, role, firstName, lastName, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const validRoles = ['consumer', 'pro'];
  const userRole = validRoles.includes(role) ? role : 'consumer';

  const tenantId = req.tenant?.id || 1;
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND tenant_id = ?', [email, tenantId]);
    if (existing.length) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, email, hash, userRole, firstName || null, lastName || null, phone || null]
    );

    const user = { id: result.insertId, email, role: userRole };
    const token = generateToken(user);

    setImmediate(() => {
      sendWelcomeEmail({ email, firstName, role: userRole }).catch(err =>
        console.error('[EMAIL] Welcome email failed:', err.message)
      );
    });

    res.status(201).json({
      token,
      user: { id: user.id, email, role: userRole, firstName, lastName },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', rateLimit({ keyPrefix: 'login', max: 15, windowMs: 15 * 60 * 1000, message: 'Too many login attempts, please try again later.' }), async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const tenantId = req.tenant?.id || 1;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND tenant_id = ?', [email, tenantId]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id, email: user.email, role: user.role,
        firstName: user.first_name, lastName: user.last_name,
        phone: user.phone, avatarUrl: user.avatar_url,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, email, role, first_name, last_name, phone, avatar_url, email_verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const u = rows[0];
    const response = {
      id: u.id, email: u.email, role: u.role,
      firstName: u.first_name, lastName: u.last_name,
      phone: u.phone, avatarUrl: u.avatar_url,
      emailVerified: u.email_verified, createdAt: u.created_at,
    };

    if (u.role === 'pro') {
      const [pros] = await db.query('SELECT * FROM pros WHERE user_id = ?', [u.id]);
      if (pros.length) response.pro = pros[0];
    }

    res.json(response);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/password
router.put('/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Valid current and new password required (min 6 chars)' });
  }
  try {
    const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

    setImmediate(async () => {
      try {
        const [u] = await db.query('SELECT email, first_name FROM users WHERE id = ?', [req.user.id]);
        if (u.length) sendPasswordChangedEmail({ email: u[0].email, firstName: u[0].first_name });
      } catch (err) { console.error('[EMAIL] Password change email failed:', err.message); }
    });

    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
