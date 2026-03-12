const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/categories — list all with children
router.get('/', async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const [cats] = await db.query('SELECT * FROM categories WHERE is_active = TRUE AND tenant_id = ? ORDER BY sort_order ASC', [tid]);
    const [svcs] = await db.query('SELECT * FROM services WHERE is_active = TRUE AND tenant_id = ? ORDER BY review_count DESC', [tid]);

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

// GET /api/categories/admin-list — authenticated, tenant-scoped flat list for admin dashboard
router.get('/admin-list', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const [cats] = await db.query('SELECT * FROM categories WHERE tenant_id = ? ORDER BY sort_order ASC', [tid]);
    const [svcs] = await db.query('SELECT * FROM services WHERE tenant_id = ? ORDER BY review_count DESC', [tid]);
    const tree = cats
      .filter(c => !c.parent_id)
      .map(parent => ({
        ...parent,
        children: cats.filter(c => c.parent_id === parent.id),
        services: svcs.filter(s => s.category_id === parent.id),
      }));
    res.json(tree);
  } catch (err) {
    console.error('GET /categories/admin-list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/categories/default-list — admin: master list from default tenant (for other tenants to browse/copy)
router.get('/default-list', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [cats] = await db.query('SELECT * FROM categories WHERE tenant_id = 1 ORDER BY sort_order ASC');
    const [svcs] = await db.query('SELECT * FROM services WHERE tenant_id = 1 ORDER BY sort_order ASC, name ASC');
    const tree = cats
      .filter(c => !c.parent_id)
      .map(parent => ({
        ...parent,
        children: cats.filter(c => c.parent_id === parent.id),
        services: svcs.filter(s => s.category_id === parent.id),
      }));
    res.json(tree);
  } catch (err) {
    console.error('GET /categories/default-list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/categories/copy-from-default — admin: copy all categories from default tenant to current (only for non-default tenants)
router.post('/copy-from-default', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  if (tid === 1) return res.status(400).json({ error: "You're on the default account. Add or edit categories directly." });
  try {
    const [source] = await db.query('SELECT id, name, slug, parent_id, icon_class, description, tags, sort_order FROM categories WHERE tenant_id = 1 ORDER BY (parent_id IS NULL) DESC, sort_order ASC');
    const [existing] = await db.query('SELECT slug FROM categories WHERE tenant_id = ?', [tid]);
    const existingSlugs = new Set((existing || []).map(r => r.slug));
    const oldIdToNewId = {};
    let copied = 0;
    for (const c of source || []) {
      if (existingSlugs.has(c.slug)) continue;
      const newParentId = c.parent_id ? (oldIdToNewId[c.parent_id] || null) : null;
      const [result] = await db.query(
        'INSERT INTO categories (tenant_id, name, slug, parent_id, icon_class, description, tags, sort_order) VALUES (?,?,?,?,?,?,?,?)',
        [tid, c.name, c.slug, newParentId, c.icon_class || null, c.description || null, c.tags || null, c.sort_order ?? 0]
      );
      oldIdToNewId[c.id] = result.insertId;
      existingSlugs.add(c.slug);
      copied++;
    }
    res.json({ message: `Copied ${copied} categor${copied === 1 ? 'y' : 'ies'} from default. You can add more or edit any.`, copied });
  } catch (err) {
    console.error('POST /categories/copy-from-default error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/categories/:slug
router.get('/:slug', async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const [rows] = await db.query('SELECT * FROM categories WHERE slug = ? AND tenant_id = ?', [req.params.slug, tid]);
    if (!rows.length) return res.status(404).json({ error: 'Category not found' });

    const cat = rows[0];
    const [services] = await db.query('SELECT * FROM services WHERE category_id = ? AND is_active = TRUE AND tenant_id = ? ORDER BY review_count DESC', [cat.id, tid]);
    res.json({ ...cat, services });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/categories — admin
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { name, slug, parentId, iconClass, description, tags, sortOrder } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' });
  try {
    const [result] = await db.query(
      'INSERT INTO categories (tenant_id, name, slug, parent_id, icon_class, description, tags, sort_order) VALUES (?,?,?,?,?,?,?,?)',
      [tid, name, slug, parentId || null, iconClass || null, description || null, tags ? String(tags).trim() : null, sortOrder || 0]
    );
    res.status(201).json({ id: result.insertId, message: 'Category created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/categories/:id — admin
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { name, slug, parentId, iconClass, description, tags, sortOrder, isActive } = req.body;
  try {
    const setTags = tags !== undefined ? ', tags=?' : '';
    const params = [name, slug, parentId ?? null, iconClass, description, sortOrder, isActive, req.params.id, tid];
    if (tags !== undefined) params.splice(5, 0, tags ? String(tags).trim() : null);
    await db.query(
      `UPDATE categories SET name=COALESCE(?,name), slug=COALESCE(?,slug), parent_id=?,
       icon_class=COALESCE(?,icon_class), description=COALESCE(?,description)${setTags},
       sort_order=COALESCE(?,sort_order), is_active=COALESCE(?,is_active) WHERE id=? AND tenant_id=?`,
      params
    );
    res.json({ message: 'Category updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/categories/:id — admin (blocked for default tenant)
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  if (tid === 1) return res.status(403).json({ error: 'Categories cannot be deleted for the default account.' });
  try {
    await db.query('DELETE FROM categories WHERE id = ? AND tenant_id = ?', [req.params.id, tid]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'Category has services — remove them first' });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
