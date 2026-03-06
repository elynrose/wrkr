const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/pages — list published pages (public), scoped to tenant
router.get('/', async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const { group, all } = req.query;
    let q = 'SELECT id, slug, title, excerpt, meta_title, meta_desc, status, show_in_nav, nav_order, nav_group, updated_at FROM pages WHERE tenant_id = ?';
    const params = [tid];
    if (all !== 'true') {
      q += ' AND status = ?';
      params.push('published');
    }
    if (group) {
      q += ' AND nav_group = ?';
      params.push(group);
    }
    q += ' ORDER BY nav_group, nav_order, title';
    const [rows] = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /pages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/pages/:slug — single page (public)
router.get('/:slug', async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const [rows] = await db.query('SELECT * FROM pages WHERE slug = ? AND tenant_id = ?', [req.params.slug, tid]);
    if (!rows.length) return res.status(404).json({ error: 'Page not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/pages — admin: create page
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { slug, title, content, excerpt, metaTitle, metaDesc, status, showInNav, navOrder, navGroup } = req.body;
  if (!slug || !title) return res.status(400).json({ error: 'Slug and title required' });
  try {
    const [result] = await db.query(
      `INSERT INTO pages (tenant_id, slug, title, content, excerpt, meta_title, meta_desc, status, show_in_nav, nav_order, nav_group, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [tid, slug, title, content || '', excerpt, metaTitle, metaDesc, status || 'draft', !!showInNav, navOrder || 0, navGroup || 'company', req.user.id, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Page created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slug already exists' });
    console.error('POST /pages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/pages/:id — admin: update page
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { slug, title, content, excerpt, metaTitle, metaDesc, status, showInNav, navOrder, navGroup } = req.body;
  try {
    await db.query(
      `UPDATE pages SET
        slug=COALESCE(?,slug), title=COALESCE(?,title), content=COALESCE(?,content),
        excerpt=COALESCE(?,excerpt), meta_title=COALESCE(?,meta_title), meta_desc=COALESCE(?,meta_desc),
        status=COALESCE(?,status), show_in_nav=COALESCE(?,show_in_nav), nav_order=COALESCE(?,nav_order),
        nav_group=COALESCE(?,nav_group), updated_by=?
       WHERE id=? AND tenant_id=?`,
      [slug, title, content, excerpt, metaTitle, metaDesc, status, showInNav, navOrder, navGroup, req.user.id, req.params.id, tid]
    );
    res.json({ message: 'Page updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slug already exists' });
    console.error('PUT /pages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/pages/:id — admin
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    await db.query('DELETE FROM pages WHERE id = ? AND tenant_id = ?', [req.params.id, tid]);
    res.json({ message: 'Page deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
