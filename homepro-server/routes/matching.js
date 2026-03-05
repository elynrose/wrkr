const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { matchAndNotify, claimByToken, confirmClaim, declineMatch } = require('../services/matchEngine');
const { rateLimit } = require('../middleware/spam');

// GET /api/matching/claim/:token — view a lead via SMS claim link (no auth required)
router.get('/claim/:token', async (req, res) => {
  try {
    const result = await claimByToken(req.params.token);
    if (result.error) return res.status(result.code || 400).json(result);
    res.json(result);
  } catch (err) {
    console.error('GET /claim/:token error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/matching/claim/:token — confirm claim via SMS link (no auth required)
router.post('/claim/:token', rateLimit({ keyPrefix: 'claim', max: 30, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  try {
    const result = await confirmClaim(req.params.token);
    if (result.error) return res.status(result.code || 400).json(result);
    res.json(result);
  } catch (err) {
    console.error('POST /claim/:token error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/matching/decline/:token — decline a match via SMS link
router.post('/decline/:token', async (req, res) => {
  try {
    const ok = await declineMatch(req.params.token);
    res.json({ success: ok, message: ok ? 'Match declined' : 'Match not found or already responded' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/matching/run/:leadId — admin: manually trigger matching for a lead
router.post('/run/:leadId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const results = await matchAndNotify(parseInt(req.params.leadId));
    res.json({ matched: results.length, results });
  } catch (err) {
    console.error('POST /matching/run error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/matching/lead/:leadId — view all matches for a lead (admin or lead owner)
router.get('/lead/:leadId', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT lm.*, p.business_name, p.avg_rating, p.total_reviews,
              u.first_name, u.last_name, u.email, u.phone
       FROM lead_matches lm
       JOIN pros p ON lm.pro_id = p.id
       JOIN users u ON lm.user_id = u.id
       WHERE lm.lead_id = ?
       ORDER BY lm.match_rank ASC`,
      [req.params.leadId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/matching/my-leads — pro: get leads matched to the current pro (paginated)
router.get('/my-leads', authenticate, requireRole('pro'), async (req, res) => {
  try {
    const [[pro]] = await db.query('SELECT id FROM pros WHERE user_id = ?', [req.user.id]);
    if (!pro) return res.status(404).json({ error: 'Pro profile not found' });

    // Auto-expire matches past their expiry that are still pending/notified/viewed
    await db.query(
      `UPDATE lead_matches SET status = 'expired'
       WHERE pro_id = ? AND status IN ('pending','notified','viewed') AND expires_at IS NOT NULL AND expires_at < NOW()`,
      [pro.id]
    );

    const { page = 1, limit = 20 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const pageNum = Math.max(1, parseInt(page) || 1);
    const offset = (pageNum - 1) * limitNum;

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM lead_matches lm JOIN leads l ON lm.lead_id = l.id WHERE lm.pro_id = ?`,
      [pro.id]
    );

    const [rows] = await db.query(
      `SELECT lm.id AS match_id, lm.lead_id, lm.match_score, lm.match_rank,
              lm.status AS match_status, lm.claim_token, lm.sms_sent_at, lm.responded_at,
              lm.expires_at, lm.created_at AS matched_at,
              l.service_name, l.customer_name, l.email AS customer_email,
              l.phone AS customer_phone, l.zip, l.city_name, l.description,
              l.urgency, l.budget_min, l.budget_max, l.property_type,
              l.status AS lead_status, l.claim_count, l.max_claims,
              l.lead_value, l.created_at AS lead_created_at
       FROM lead_matches lm
       JOIN leads l ON lm.lead_id = l.id
       WHERE lm.pro_id = ?
       ORDER BY
         FIELD(lm.status, 'notified','viewed','pending','accepted','declined','expired'),
         lm.created_at DESC
       LIMIT ? OFFSET ?`,
      [pro.id, limitNum, offset]
    );

    res.json({ leads: rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('GET /matching/my-leads error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/matching/stats — admin: matching overview
router.get('/stats', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT
        COUNT(*) AS total_matches,
        SUM(sms_sent = 1) AS sms_sent,
        SUM(status = 'accepted') AS accepted,
        SUM(status = 'declined') AS declined,
        SUM(status = 'expired') AS expired,
        SUM(status = 'viewed') AS viewed,
        SUM(status = 'notified') AS notified_pending
      FROM lead_matches
    `);
    const [[recent]] = await db.query(
      "SELECT COUNT(DISTINCT lead_id) AS leads_matched_24h FROM lead_matches WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)"
    );
    res.json({ ...totals, ...recent });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
