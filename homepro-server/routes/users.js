const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/users — admin: list all users
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  const { role, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let query = `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.is_active, u.email_verified, u.last_login, u.created_at,
                        p.id AS pro_id, p.lead_credits, p.subscription_plan, p.business_name
                 FROM users u LEFT JOIN pros p ON p.user_id = u.id WHERE 1=1`;
    const params = [];
    if (role) { query += ' AND u.role = ?'; params.push(role); }
    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await db.query(query, params);
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM users');
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

// GET /api/users/:id — public profile
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

module.exports = router;
