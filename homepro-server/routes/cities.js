const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/cities — search cities
router.get('/', async (req, res) => {
  try {
    const { q, state, limit = 20 } = req.query;
    let query = `
      SELECT c.*, s.code as state_code, s.name as state_name
      FROM cities c JOIN states s ON c.state_id = s.id
      WHERE c.is_active = TRUE
    `;
    const params = [];

    if (q) {
      query += ' AND c.name LIKE ?';
      params.push(`%${q}%`);
    }
    if (state) {
      query += ' AND s.code = ?';
      params.push(state.toUpperCase());
    }

    query += ' ORDER BY c.population DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /cities error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cities/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, s.code as state_code, s.name as state_name
       FROM cities c JOIN states s ON c.state_id = s.id WHERE c.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'City not found' });

    const city = rows[0];
    const [zips] = await db.query('SELECT zip FROM zip_codes WHERE city_id = ?', [city.id]);
    res.json({ ...city, zips: zips.map(z => z.zip) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cities/states — list all states
router.get('/states/list', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM states ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cities/zip/:zip — lookup by ZIP
router.get('/zip/:zip', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT z.*, c.name as city_name, s.code as state_code, s.name as state_name
       FROM zip_codes z
       LEFT JOIN cities c ON z.city_id = c.id
       LEFT JOIN states s ON z.state_id = s.id
       WHERE z.zip = ?`,
      [req.params.zip]
    );
    if (!rows.length) return res.status(404).json({ error: 'ZIP code not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
