const express = require('express');
const bcrypt  = require('bcryptjs');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/users — admin: list all users (consumers + providers/pros)
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { role, page = 1, limit = 200 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let query = `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.is_active, u.email_verified, u.last_login, u.created_at,
                        p.id AS pro_id, p.lead_credits, p.subscription_plan, p.business_name
                 FROM users u LEFT JOIN pros p ON p.user_id = u.id WHERE u.tenant_id = ?`;
    const params = [tid];
    if (role && role !== 'all') { query += ' AND u.role = ?'; params.push(role); }
    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await db.query(query, params);
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE tenant_id = ?';
    const countParams = [tid];
    if (role && role !== 'all') { countQuery += ' AND role = ?'; countParams.push(role); }
    const [[{ total }]] = await db.query(countQuery, countParams);
    res.json({ users: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/profile — update own profile
router.put('/profile', authenticate, async (req, res) => {
  const { firstName, lastName, phone, avatarUrl } = req.body;
  try {
    await db.query(
      'UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), phone = COALESCE(?, phone), avatar_url = COALESCE(?, avatar_url) WHERE id = ?',
      [firstName, lastName, phone, avatarUrl, req.user.id]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/admin/:id — admin: full user + provider details
router.get('/admin/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.avatar_url, u.is_active, u.email_verified, u.last_login, u.created_at,
              p.id AS pro_id, p.business_name, p.lead_credits, p.subscription_plan
       FROM users u LEFT JOIN pros p ON p.user_id = u.id WHERE u.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    res.json({
      id: u.id, email: u.email, role: u.role, firstName: u.first_name, lastName: u.last_name, phone: u.phone,
      avatarUrl: u.avatar_url, isActive: u.is_active, emailVerified: u.email_verified, lastLogin: u.last_login, createdAt: u.created_at,
      proId: u.pro_id, businessName: u.business_name, leadCredits: u.lead_credits, subscriptionPlan: u.subscription_plan,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id — public profile (no auth)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, first_name, last_name, avatar_url, role, created_at FROM users WHERE id = ? AND is_active = TRUE',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    res.json({ id: u.id, firstName: u.first_name, lastName: u.last_name, avatarUrl: u.avatar_url, role: u.role, createdAt: u.created_at });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/:id/status — admin: activate/deactivate
router.patch('/:id/status', authenticate, requireRole('admin'), async (req, res) => {
  const { isActive } = req.body;
  try {
    await db.query('UPDATE users SET is_active = ? WHERE id = ?', [!!isActive, req.params.id]);
    res.json({ message: `User ${isActive ? 'activated' : 'deactivated'}` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users — admin: create user (consumer, pro, or admin)
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { email, password, role, firstName, lastName, phone } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const validRoles = ['consumer', 'pro', 'admin'];
  const userRole = validRoles.includes(role) ? role : 'consumer';
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND tenant_id = ?', [email, tid]);
    if (existing.length) return res.status(409).json({ error: 'An account with this email already exists' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tid, email, hash, userRole, firstName || null, lastName || null, phone || null]
    );
    res.status(201).json({ id: result.insertId, email, role: userRole, message: 'User created' });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id — admin: update user
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { email, role, firstName, lastName, phone, isActive, newPassword } = req.body;
  const id = req.params.id;
  if (id === req.user.id && role && role !== req.user.role) {
    return res.status(400).json({ error: 'You cannot change your own role' });
  }
  try {
    const updates = [];
    const params = [];
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (role !== undefined && ['consumer', 'pro', 'admin'].includes(role)) { updates.push('role = ?'); params.push(role); }
    if (firstName !== undefined) { updates.push('first_name = ?'); params.push(firstName || null); }
    if (lastName !== undefined) { updates.push('last_name = ?'); params.push(lastName || null); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone || null); }
    if (isActive !== undefined) { updates.push('is_active = ?'); params.push(!!isActive); }
    if (newPassword && String(newPassword).length >= 6) {
      const hash = await bcrypt.hash(newPassword, 10);
      updates.push('password_hash = ?');
      params.push(hash);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(id, tid);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`, params);
    res.json({ message: 'User updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already in use' });
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id — admin: deactivate user (soft delete)
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const id = req.params.id;
  if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  try {
    await db.query('UPDATE users SET is_active = FALSE WHERE id = ? AND tenant_id = ?', [id, tid]);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
