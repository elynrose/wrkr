const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate } = require('../middleware/auth');

// POST /api/reviews — consumer leaves a review
router.post('/', authenticate, async (req, res) => {
  const { proId, leadId, rating, title, body } = req.body;
  if (!proId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'proId and rating (1-5) are required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      'INSERT INTO reviews (pro_id, user_id, lead_id, rating, title, body, is_verified) VALUES (?,?,?,?,?,?,?)',
      [proId, req.user.id, leadId || null, rating, title, body, !!leadId]
    );

    // Update pro's aggregate rating
    const [[agg]] = await conn.query(
      'SELECT AVG(rating) as avg_r, COUNT(*) as cnt FROM reviews WHERE pro_id = ? AND is_public = TRUE',
      [proId]
    );
    await conn.query(
      'UPDATE pros SET avg_rating = ?, total_reviews = ? WHERE id = ?',
      [Math.round(agg.avg_r * 10) / 10, agg.cnt, proId]
    );

    await conn.commit();
    res.status(201).json({ message: 'Review submitted' });
  } catch (err) {
    await conn.rollback();
    console.error('Review error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// GET /api/reviews/pro/:proId
router.get('/pro/:proId', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.first_name, u.last_name, u.avatar_url
       FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE r.pro_id = ? AND r.is_public = TRUE
       ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [req.params.proId, parseInt(limit), offset]
    );
    const [[{ avg_r, cnt }]] = await db.query(
      'SELECT AVG(rating) as avg_r, COUNT(*) as cnt FROM reviews WHERE pro_id = ? AND is_public = TRUE',
      [req.params.proId]
    );
    res.json({ reviews: rows, avgRating: Math.round((avg_r || 0) * 10) / 10, totalReviews: cnt });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reviews/:id/respond — pro responds to a review
router.post('/:id/respond', authenticate, async (req, res) => {
  const { response } = req.body;
  if (!response) return res.status(400).json({ error: 'Response text required' });
  try {
    const [review] = await db.query('SELECT pro_id FROM reviews WHERE id = ?', [req.params.id]);
    if (!review.length) return res.status(404).json({ error: 'Review not found' });

    const [pro] = await db.query('SELECT id FROM pros WHERE id = ? AND user_id = ?', [review[0].pro_id, req.user.id]);
    if (!pro.length) return res.status(403).json({ error: 'Not your review to respond to' });

    await db.query('UPDATE reviews SET response = ?, responded_at = NOW() WHERE id = ?', [response, req.params.id]);
    res.json({ message: 'Response added' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
