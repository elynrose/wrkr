const express = require('express');
const bcrypt  = require('bcryptjs');
const crypto = require('crypto');
const router  = express.Router();
const db      = require('../db');
const { generateToken, authenticate } = require('../middleware/auth');
const { sendWelcomeEmail, sendPasswordChangedEmail, sendPasswordResetEmail, sendEmailVerification } = require('../services/email');
const { getRequireEmailVerification } = require('../services/siteConfig');
const { audit } = require('../services/audit');
const { spamProtect, rateLimit } = require('../middleware/spam');

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:5173';

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
  const emailNorm = (email || '').trim().toLowerCase();
  if (!emailNorm) {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE LOWER(email) = ?', [emailNorm]);
    if (existing.length) {
      return res.status(409).json({ error: 'An account with this email already exists. Use a different email or sign in.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name, phone, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)`,
      [tenantId, emailNorm, hash, userRole, firstName || null, lastName || null, phone || null]
    );

    const user = { id: result.insertId, email: emailNorm, role: userRole, tenant_id: tenantId };
    const token = generateToken(user);

    setImmediate(async () => {
      try { await sendWelcomeEmail({ email: emailNorm, firstName, role: userRole }, tenantId); } catch (err) { console.error('[EMAIL] Welcome failed:', err.message); }
      try {
        const verifyToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.query('INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [result.insertId, verifyToken, expiresAt]);
        await sendEmailVerification({ email: emailNorm, firstName }, `${FRONTEND_URL()}/#verify/${verifyToken}`, tenantId);
      } catch (err) { console.error('[EMAIL] Verification failed:', err.message); }
    });

    res.status(201).json({
      token,
      user: { id: user.id, email: emailNorm, role: userRole, firstName, lastName },
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
  const emailNorm = (email || '').trim().toLowerCase();
  const host = (req.hostname || '').toLowerCase();
  const isLocalhost = !host || host === 'localhost' || host === '127.0.0.1';
  try {
    let user = null;
    const [rows] = await db.query('SELECT * FROM users WHERE LOWER(email) = ? AND tenant_id = ?', [emailNorm, tenantId]);
    if (rows.length) {
      user = rows[0];
    } else if (isLocalhost) {
      // Local dev fallback: if email exists in exactly one tenant, allow login there.
      const [anyTenantRows] = await db.query('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 2', [emailNorm]);
      if (anyTenantRows.length === 1) {
        user = anyTenantRows[0];
      } else if (anyTenantRows.length > 1) {
        return res.status(409).json({ error: 'This email exists in multiple tenants. Use the tenant domain to sign in.' });
      }
    }
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }
    const requireVerify = await getRequireEmailVerification(user.tenant_id);
    if (requireVerify && !user.email_verified) {
      return res.status(403).json({ error: 'Please verify your email before signing in. Check your inbox or request a new verification link.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    audit({ tenantId: user.tenant_id, userId: user.id, action: 'login', ipAddress: req.ip || req.connection?.remoteAddress }).catch(() => {});

    const token = generateToken(user);
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await db.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, refreshToken, refreshExpires]);
    res.json({
      token,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60, // seconds
      user: {
        id: user.id, email: user.email, role: user.role,
        tenantId: user.tenant_id,
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
      'SELECT id, tenant_id, email, role, first_name, last_name, phone, avatar_url, email_verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const u = rows[0];
    const response = {
      id: u.id, email: u.email, role: u.role,
      tenantId: u.tenant_id,
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

// POST /api/auth/forgot-password — request password reset (no auth)
router.post('/forgot-password', ...spamProtect({ keyPrefix: 'forgot', rateLimitMax: 5, rateLimitSettingKey: 'spam_rate_limit_max_forgot', minTimingMs: 2000 }), async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const tenantId = req.tenant?.id || 1;
  try {
    const emailNorm = email.trim().toLowerCase();
    const [rows] = await db.query('SELECT id, email, first_name FROM users WHERE LOWER(email) = ? AND tenant_id = ? AND is_active = TRUE', [emailNorm, tenantId]);
    // Always return success to prevent email enumeration
    if (rows.length === 0) {
      return res.json({ message: 'If an account exists with that email, you will receive a password reset link.' });
    }
    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );
    const resetUrl = `${FRONTEND_URL()}/#reset/${token}`;
    setImmediate(() => {
      sendPasswordResetEmail({ email: user.email, firstName: user.first_name }, resetUrl, tenantId)
        .catch(err => console.error('[EMAIL] Password reset failed:', err.message));
    });
    res.json({ message: 'If an account exists with that email, you will receive a password reset link.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password — set new password with token (no auth)
router.post('/reset-password', ...spamProtect({ keyPrefix: 'reset', rateLimitMax: 10, rateLimitSettingKey: 'spam_rate_limit_max_reset', minTimingMs: 2000 }), async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Valid token and new password required (min 6 characters)' });
  }
  try {
    const [rows] = await db.query(
      `SELECT prt.id, prt.user_id, u.email, u.first_name, u.tenant_id FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token = ? AND prt.used_at IS NULL AND prt.expires_at > NOW()`,
      [token]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }
    const { user_id, tenant_id } = rows[0];
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user_id]);
    await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token = ?', [token]);
    audit({ tenantId: tenant_id, userId: user_id, action: 'password_reset', ipAddress: req.ip || req.connection?.remoteAddress }).catch(() => {});
    res.json({ message: 'Password has been reset. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/verify/:token — verify email (no auth)
router.post('/verify/:token', ...spamProtect({ keyPrefix: 'verify', rateLimitMax: 20, rateLimitSettingKey: 'spam_rate_limit_max_verify', minTimingMs: 1000 }), async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ error: 'Token required' });
  try {
    const [rows] = await db.query(
      `SELECT prt.user_id, u.email FROM email_verification_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token = ? AND prt.used_at IS NULL AND prt.expires_at > NOW()`,
      [token]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification link. Please request a new one.' });
    }
    const { user_id } = rows[0];
    await db.query('UPDATE users SET email_verified = TRUE WHERE id = ?', [user_id]);
    await db.query('UPDATE email_verification_tokens SET used_at = NOW() WHERE token = ?', [token]);
    res.json({ message: 'Email verified successfully. You can now sign in.' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/resend-verification — resend verification email (authenticated)
router.post('/resend-verification', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, email, first_name, tenant_id FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    if (u.email_verified) return res.json({ message: 'Email is already verified.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.query('INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [u.id, token, expiresAt]);
    const verifyUrl = `${FRONTEND_URL()}/#verify/${token}`;
    setImmediate(() => {
      sendEmailVerification({ email: u.email, firstName: u.first_name }, verifyUrl, u.tenant_id)
        .catch(err => console.error('[EMAIL] Resend verification failed:', err.message));
    });
    res.json({ message: 'Verification email sent. Check your inbox.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/refresh — exchange refresh token for new access token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
  try {
    const [rows] = await db.query(
      `SELECT rt.user_id, u.id, u.tenant_id, u.email, u.role, u.first_name, u.last_name, u.phone, u.avatar_url
       FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
       WHERE rt.token = ? AND rt.expires_at > NOW() AND u.is_active = TRUE`,
      [refreshToken]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid or expired refresh token' });
    const user = rows[0];
    const token = generateToken(user);
    res.json({ token, expiresIn: 7 * 24 * 60 * 60 });
  } catch (err) {
    console.error('Refresh error:', err);
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
        if (u.length) sendPasswordChangedEmail({ email: u[0].email, firstName: u[0].first_name }, req.tenant?.id || 1);
      } catch (err) { console.error('[EMAIL] Password change email failed:', err.message); }
    });

    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
