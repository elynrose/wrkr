const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications — user's notifications
router.get('/', authenticate, async (req, res) => {
  const { unread, limit = 30 } = req.query;
  try {
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.id];
    if (unread === 'true') { query += ' AND is_read = FALSE'; }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await db.query(query, params);
    const [[{ cnt }]] = await db.query('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = FALSE', [req.user.id]);
    res.json({ notifications: rows, unreadCount: cnt });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', authenticate, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Utility: create a notification (used internally)
async function createNotification(userId, type, title, body, link) {
  try {
    await db.query(
      'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?,?,?,?,?)',
      [userId, type, title, body, link]
    );
  } catch (err) {
    console.error('Create notification error:', err);
  }
}

module.exports = router;
module.exports.createNotification = createNotification;
