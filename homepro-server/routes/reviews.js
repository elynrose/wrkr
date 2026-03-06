const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const db      = require('../db');
const { authenticate } = require('../middleware/auth');

// POST /api/reviews — consumer leaves a review (authenticated)
router.post('/', authenticate, async (req, res) => {
  const { proId, leadId, rating, title, body } = req.body;
  if (!proId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'proId and rating (1-5) are required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const tenantId = req.tenant?.id || 1;
    await conn.query(
      'INSERT INTO reviews (tenant_id, pro_id, user_id, lead_id, rating, title, body, is_verified) VALUES (?,?,?,?,?,?,?,?)',
      [tenantId, proId, req.user.id, leadId || null, rating, title, body, !!leadId]
    );

    const [[agg]] = await conn.query(
      'SELECT AVG(rating) as avg_r, COUNT(*) as cnt FROM reviews WHERE pro_id = ? AND is_public = TRUE',
      [proId]
    );
    await conn.query(
      'UPDATE pros SET avg_rating = ?, total_reviews = ? WHERE id = ?',
      [Math.round(agg.avg_r * 10) / 10, agg.cnt, proId]
    );

    if (leadId) {
      await conn.query('UPDATE leads SET review_submitted = TRUE WHERE id = ?', [leadId]);
    }

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

// GET /api/reviews/by-token/:token — public: get review page data (no auth needed)
router.get('/by-token/:token', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.id AS lead_id, l.service_name, l.customer_name, l.review_submitted,
              l.claimed_by_pro_id, l.claimed_by_business,
              p.id AS pro_id, p.business_name, p.google_review_url, p.avg_rating, p.total_reviews
       FROM leads l
       LEFT JOIN pros p ON l.claimed_by_pro_id = p.id
       WHERE l.review_token = ?`,
      [req.params.token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invalid or expired review link' });
    const data = rows[0];
    if (data.review_submitted) return res.json({ ...data, already_reviewed: true });
    res.json(data);
  } catch (err) {
    console.error('GET /reviews/by-token error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reviews/by-token/:token — public: submit review via token (no auth)
router.post('/by-token/:token', async (req, res) => {
  const { rating, title, body } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating (1-5) is required' });

  const conn = await db.getConnection();
  try {
    const [leads] = await conn.query(
      `SELECT l.id, l.user_id, l.claimed_by_pro_id, l.review_submitted, l.customer_name, l.tenant_id
       FROM leads l WHERE l.review_token = ?`, [req.params.token]
    );
    if (!leads.length) return res.status(404).json({ error: 'Invalid review link' });
    const lead = leads[0];
    if (lead.review_submitted) return res.status(400).json({ error: 'Review already submitted for this lead' });
    if (!lead.claimed_by_pro_id) return res.status(400).json({ error: 'No provider assigned to this lead' });

    const tenantId = lead.tenant_id || 1;
    await conn.beginTransaction();

    await conn.query(
      'INSERT INTO reviews (tenant_id, pro_id, user_id, lead_id, rating, title, body, is_verified) VALUES (?,?,?,?,?,?,?,TRUE)',
      [tenantId, lead.claimed_by_pro_id, lead.user_id || 0, lead.id, rating, title || '', body || '']
    );

    await conn.query('UPDATE leads SET review_submitted = TRUE WHERE id = ?', [lead.id]);

    const [[agg]] = await conn.query(
      'SELECT AVG(rating) as avg_r, COUNT(*) as cnt FROM reviews WHERE pro_id = ? AND is_public = TRUE',
      [lead.claimed_by_pro_id]
    );
    await conn.query(
      'UPDATE pros SET avg_rating = ?, total_reviews = ? WHERE id = ?',
      [Math.round(agg.avg_r * 10) / 10, agg.cnt, lead.claimed_by_pro_id]
    );

    await conn.commit();
    res.status(201).json({ message: 'Thank you! Your review has been submitted.' });
  } catch (err) {
    await conn.rollback();
    console.error('POST /reviews/by-token error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// GET /api/reviews/recent — public: latest verified reviews for homepage
router.get('/recent', async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const { limit = 6 } = req.query;
    const [rows] = await db.query(
      `SELECT r.rating, r.title, r.body, r.created_at,
              u.first_name, u.avatar_url,
              p.business_name, l.service_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN pros p ON r.pro_id = p.id
       LEFT JOIN leads l ON r.lead_id = l.id
       WHERE r.is_public = TRUE AND r.is_verified = TRUE AND r.tenant_id = ?
       ORDER BY r.created_at DESC LIMIT ?`,
      [tid, parseInt(limit)]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /reviews/recent error:', err);
    res.status(500).json({ error: 'Server error' });
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

// GET /api/reviews/admin — admin: list all reviews with pagination
router.get('/admin', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const tid = req.tenant?.id || 1;
  const { page = 1, limit = 25, rating, is_public } = req.query;
  const limitNum = Math.min(parseInt(limit) || 25, 100);
  const pageNum = Math.max(1, parseInt(page) || 1);
  const offset = (pageNum - 1) * limitNum;

  const where = ['r.tenant_id = ?'];
  const params = [tid];
  if (rating) { where.push('r.rating = ?'); params.push(parseInt(rating)); }
  if (is_public !== undefined && is_public !== '') { where.push('r.is_public = ?'); params.push(is_public === 'true' ? 1 : 0); }
  const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

  try {
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM reviews r${whereClause}`, params);
    const [rows] = await db.query(
      `SELECT r.*, u.first_name, u.last_name, u.email AS reviewer_email,
              p.business_name, l.service_name, l.customer_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN pros p ON r.pro_id = p.id
       LEFT JOIN leads l ON r.lead_id = l.id
       ${whereClause}
       ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ reviews: rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('GET /reviews/admin error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/reviews/:id — admin: toggle visibility or update review
router.patch('/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const tid = req.tenant?.id || 1;
  const { is_public } = req.body;
  try {
    const sets = []; const params = [];
    if (is_public !== undefined) { sets.push('is_public = ?'); params.push(is_public ? 1 : 0); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id, tid);
    await db.query(`UPDATE reviews SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, params);

    // Recalc pro aggregate
    const [[review]] = await db.query('SELECT pro_id FROM reviews WHERE id = ?', [req.params.id]);
    if (review) {
      const [[agg]] = await db.query('SELECT AVG(rating) as avg_r, COUNT(*) as cnt FROM reviews WHERE pro_id = ? AND is_public = TRUE', [review.pro_id]);
      await db.query('UPDATE pros SET avg_rating = ?, total_reviews = ? WHERE id = ?', [Math.round((agg.avg_r || 0) * 10) / 10, agg.cnt, review.pro_id]);
    }
    res.json({ message: 'Review updated' });
  } catch (err) {
    console.error('PATCH /reviews/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/reviews/:id — admin: delete a review
router.delete('/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const tid = req.tenant?.id || 1;
  try {
    const [[review]] = await db.query('SELECT pro_id FROM reviews WHERE id = ? AND tenant_id = ?', [req.params.id, tid]);
    await db.query('DELETE FROM reviews WHERE id = ? AND tenant_id = ?', [req.params.id, tid]);
    if (review) {
      const [[agg]] = await db.query('SELECT AVG(rating) as avg_r, COUNT(*) as cnt FROM reviews WHERE pro_id = ? AND is_public = TRUE', [review.pro_id]);
      await db.query('UPDATE pros SET avg_rating = ?, total_reviews = ? WHERE id = ?', [Math.round((agg.avg_r || 0) * 10) / 10, agg.cnt || 0, review.pro_id]);
    }
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('DELETE /reviews/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reviews/:id/respond — pro responds to a review
router.post('/:id/respond', authenticate, async (req, res) => {
  const { response } = req.body;
  const tid = req.tenant?.id || 1;
  if (!response) return res.status(400).json({ error: 'Response text required' });
  try {
    const [review] = await db.query('SELECT pro_id FROM reviews WHERE id = ? AND tenant_id = ?', [req.params.id, tid]);
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
