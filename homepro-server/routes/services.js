const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/services
router.get('/', async (req, res) => {
  try {
    const { category_id, all } = req.query;
    let query = 'SELECT s.*, c.name as category_name, c.slug as category_slug FROM services s LEFT JOIN categories c ON s.category_id = c.id';
    const params = [];
    if (all !== 'true') query += ' WHERE s.is_active = TRUE';
    if (category_id) {
      query += (all === 'true' ? ' WHERE' : ' AND') + ' s.category_id = ?';
      params.push(category_id);
    }
    query += ' ORDER BY s.review_count DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /services error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/services/how-it-works — admin: list all steps (both audiences)
router.get('/how-it-works', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM how_it_works ORDER BY audience ASC, step_number ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/services/how-it-works/:audience — public: steps for consumer or pro
router.get('/how-it-works/:audience', async (req, res) => {
  try {
    const audience = req.params.audience === 'pro' ? 'pro' : 'consumer';
    const [rows] = await db.query('SELECT * FROM how_it_works WHERE audience = ? ORDER BY step_number ASC', [audience]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/services/how-it-works/:id — admin: update one step
router.put('/how-it-works/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { step_number, icon_class, title, description } = req.body;
  const id = req.params.id;
  try {
    await db.query(
      `UPDATE how_it_works SET step_number=COALESCE(?,step_number), icon_class=COALESCE(?,icon_class), title=COALESCE(?,title), description=COALESCE(?,description) WHERE id=?`,
      [step_number, icon_class, title, description, id]
    );
    res.json({ message: 'Step updated' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/services/:slug
router.get('/:slug', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT s.*, c.name as category_name FROM services s LEFT JOIN categories c ON s.category_id = c.id WHERE s.slug = ?',
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Service not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/services — admin: create service
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { categoryId, name, slug, iconClass, cardImageUrl, avgRating, reviewCount, reviewLabel, minPrice, priceUnit } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' });
  const icon = iconClass || 'faWrench';
  try {
    const [result] = await db.query(
      `INSERT INTO services (category_id, name, slug, icon_class, card_image_url, avg_rating, review_count, review_label, min_price, price_unit)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [categoryId || null, name, slug, icon, cardImageUrl || null, avgRating || 4.5, reviewCount || 0, reviewLabel || '0', minPrice || '', priceUnit || 'per job']
    );
    res.status(201).json({ id: result.insertId, message: 'Service created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slug already exists' });
    console.error('Create service error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/services/:id — admin: update service
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { categoryId, name, slug, iconClass, cardImageUrl, card_image_url, avgRating, reviewCount, reviewLabel, minPrice, priceUnit, isActive } = req.body;
  const cardImg = cardImageUrl ?? card_image_url;
  try {
    await db.query(
      `UPDATE services SET
        category_id=COALESCE(?,category_id), name=COALESCE(?,name), slug=COALESCE(?,slug),
        icon_class=COALESCE(?,icon_class), card_image_url=?,
        avg_rating=COALESCE(?,avg_rating), review_count=COALESCE(?,review_count), review_label=COALESCE(?,review_label),
        min_price=COALESCE(?,min_price), price_unit=COALESCE(?,price_unit), is_active=COALESCE(?,is_active)
       WHERE id=?`,
      [categoryId, name, slug, iconClass, cardImg === '' ? null : (cardImg || null), avgRating, reviewCount, reviewLabel, minPrice, priceUnit, isActive, req.params.id]
    );
    res.json({ message: 'Service updated' });
  } catch (err) {
    console.error('Update service error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/services/:id — admin
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM services WHERE id = ?', [req.params.id]);
    res.json({ message: 'Service deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
