const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/services
router.get('/', async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const { category_id, all } = req.query;
    let query = 'SELECT s.*, c.name as category_name, c.slug as category_slug FROM services s LEFT JOIN categories c ON s.category_id = c.id WHERE s.tenant_id = ?';
    const params = [tid];
    if (all !== 'true') query += ' AND s.is_active = TRUE';
    if (category_id) {
      query += ' AND s.category_id = ?';
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
  const tid = req.tenant?.id || 1;
  try {
    const [rows] = await db.query('SELECT * FROM how_it_works WHERE tenant_id = ? ORDER BY audience ASC, step_number ASC', [tid]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/services/how-it-works/:audience — public: steps for consumer or pro
router.get('/how-it-works/:audience', async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const audience = req.params.audience === 'pro' ? 'pro' : 'consumer';
    const [rows] = await db.query(
      'SELECT * FROM how_it_works WHERE audience = ? AND tenant_id = ? ORDER BY step_number ASC',
      [audience, tid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/services/how-it-works/:id — admin: update one step
router.put('/how-it-works/:id', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { step_number, icon_class, title, description } = req.body;
  const id = req.params.id;
  try {
    await db.query(
      `UPDATE how_it_works SET step_number=COALESCE(?,step_number), icon_class=COALESCE(?,icon_class), title=COALESCE(?,title), description=COALESCE(?,description) WHERE id=? AND tenant_id=?`,
      [step_number, icon_class, title, description, id, tid]
    );
    res.json({ message: 'Step updated' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/services/:slug
router.get('/:slug', async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const [rows] = await db.query(
      'SELECT s.*, c.name as category_name FROM services s LEFT JOIN categories c ON s.category_id = c.id WHERE s.slug = ? AND s.tenant_id = ?',
      [req.params.slug, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Service not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/services — admin: create service
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { categoryId, name, slug, iconClass, cardImageUrl, avgRating, reviewCount, reviewLabel, minPrice, priceUnit } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' });
  const icon = iconClass || 'faWrench';
  try {
    const [result] = await db.query(
      `INSERT INTO services (tenant_id, category_id, name, slug, icon_class, card_image_url, avg_rating, review_count, review_label, min_price, price_unit)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [tid, categoryId || null, name, slug, icon, cardImageUrl || null, avgRating || 4.5, reviewCount || 0, reviewLabel || null, minPrice || null, priceUnit || 'per job']
    );
    res.status(201).json({ id: result.insertId, message: 'Service created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slug already exists' });
    console.error('POST /services error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/services/:id — admin: update service
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { categoryId, name, slug, iconClass, cardImageUrl, avgRating, reviewCount, reviewLabel, minPrice, priceUnit, isActive } = req.body;
  try {
    await db.query(
      `UPDATE services SET
        category_id=COALESCE(?,category_id), name=COALESCE(?,name), slug=COALESCE(?,slug),
        icon_class=COALESCE(?,icon_class), card_image_url=COALESCE(?,card_image_url),
        avg_rating=COALESCE(?,avg_rating), review_count=COALESCE(?,review_count),
        review_label=COALESCE(?,review_label), min_price=COALESCE(?,min_price),
        price_unit=COALESCE(?,price_unit), is_active=COALESCE(?,is_active)
       WHERE id=? AND tenant_id=?`,
      [categoryId, name, slug, iconClass, cardImageUrl, avgRating, reviewCount, reviewLabel, minPrice, priceUnit, isActive, req.params.id, tid]
    );
    res.json({ message: 'Service updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slug already exists' });
    console.error('PUT /services error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/services/:id — admin
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    await db.query('DELETE FROM services WHERE id = ? AND tenant_id = ?', [req.params.id, tid]);
    res.json({ message: 'Service deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'Service is in use — remove associated leads first' });
    console.error('DELETE /services error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
