const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/categories — list all with children
router.get('/', async (req, res) => {
  try {
    const [cats] = await db.query('SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order ASC');
    const [svcs] = await db.query('SELECT * FROM services WHERE is_active = TRUE ORDER BY review_count DESC');

    const tree = cats
      .filter(c => !c.parent_id)
      .map(parent => ({
        ...parent,
        children: cats.filter(c => c.parent_id === parent.id),
        services: svcs.filter(s => s.category_id === parent.id),
      }));

    res.json(tree);
  } catch (err) {
    console.error('GET /categories error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/categories/:slug
router.get('/:slug', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories WHERE slug = ?', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'Category not found' });

    const cat = rows[0];
    const [services] = await db.query('SELECT * FROM services WHERE category_id = ? AND is_active = TRUE ORDER BY review_count DESC', [cat.id]);
    res.json({ ...cat, services });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/categories — admin
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { name, slug, parentId, iconClass, description, sortOrder } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' });
  try {
    const [result] = await db.query(
      'INSERT INTO categories (name, slug, parent_id, icon_class, description, sort_order) VALUES (?,?,?,?,?,?)',
      [name, slug, parentId || null, iconClass, description, sortOrder || 0]
    );
    res.status(201).json({ id: result.insertId, message: 'Category created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/categories/:id — admin
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { name, slug, parentId, iconClass, description, sortOrder, isActive } = req.body;
  try {
    await db.query(
      `UPDATE categories SET name=COALESCE(?,name), slug=COALESCE(?,slug), parent_id=?,
       icon_class=COALESCE(?,icon_class), description=COALESCE(?,description),
       sort_order=COALESCE(?,sort_order), is_active=COALESCE(?,is_active) WHERE id=?`,
      [name, slug, parentId ?? null, iconClass, description, sortOrder, isActive, req.params.id]
    );
    res.json({ message: 'Category updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/categories/:id — admin
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'Category has services — remove them first' });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
