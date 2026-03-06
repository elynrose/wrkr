const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/admin/how-it-works — list all how-it-works steps (both audiences)
router.get('/how-it-works', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const [rows] = await db.query('SELECT * FROM how_it_works WHERE tenant_id = ? ORDER BY audience ASC, step_number ASC', [tid]);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/admin/how-it-works error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
