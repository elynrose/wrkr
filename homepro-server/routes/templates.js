const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { clearTemplateCache } = require('../services/email');

// GET /api/templates — admin: list all templates
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notification_templates ORDER BY channel, name');
    res.json(rows);
  } catch (err) {
    console.error('GET /templates error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/templates/:slug — admin: get single template
router.get('/:slug', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notification_templates WHERE slug = ?', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/templates/:slug — admin: update template
router.put('/:slug', authenticate, requireRole('admin'), async (req, res) => {
  const { name, subject, body, is_active } = req.body;
  try {
    const [existing] = await db.query('SELECT id FROM notification_templates WHERE slug = ?', [req.params.slug]);
    if (!existing.length) return res.status(404).json({ error: 'Template not found' });

    await db.query(
      `UPDATE notification_templates SET
        name = COALESCE(?, name),
        subject = COALESCE(?, subject),
        body = COALESCE(?, body),
        is_active = COALESCE(?, is_active)
       WHERE slug = ?`,
      [name, subject, body, is_active, req.params.slug]
    );

    clearTemplateCache();
    res.json({ message: 'Template updated' });
  } catch (err) {
    console.error('PUT /templates error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/templates/:slug/preview — admin: preview with sample data
router.post('/:slug/preview', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notification_templates WHERE slug = ?', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });

    const tmpl = rows[0];
    const vars = req.body.variables || {};

    const sampleData = {
      firstName: 'John', email: 'john@example.com', role: 'consumer',
      businessName: 'Acme Plumbing', credits: '10',
      serviceName: 'Plumbing Repair', customerName: 'Jane Smith',
      zip: '90210', urgency: 'this_week', description: 'Kitchen faucet is leaking',
      avgRating: '4.8/5 (23 reviews)', totalReviews: '23',
      proPhone: '555-1234', maxClaims: '3', claimUrl: '#preview',
      expiryHours: '4', matchScore: '87', customerEmail: 'jane@example.com',
      customerPhone: '555-5678', dashboardUrl: '#preview',
      urgencyLabel: 'This Week',
      ...vars,
    };

    let renderedBody = renderTemplate(tmpl.body, sampleData);
    let renderedSubject = tmpl.subject ? renderTemplate(tmpl.subject, sampleData) : '';

    res.json({
      channel: tmpl.channel,
      subject: renderedSubject,
      body: renderedBody,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/templates/:slug/reset — admin: reset template to factory default
router.post('/:slug/reset', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const defaults = require('../migrate-templates');
    if (!defaults || !defaults.getDefaults) {
      return res.status(501).json({ error: 'Reset not available' });
    }
    const def = defaults.getDefaults().find(t => t.slug === req.params.slug);
    if (!def) return res.status(404).json({ error: 'Default template not found for this slug' });

    await db.query(
      'UPDATE notification_templates SET subject = ?, body = ?, name = ? WHERE slug = ?',
      [def.subject, def.body, def.name, req.params.slug]
    );
    clearTemplateCache();
    res.json({ message: 'Template reset to default' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

function renderTemplate(text, vars) {
  if (!text) return '';
  let result = text;
  // {{#var}}content{{/var}} — conditional blocks
  result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, content) => {
    return vars[key] ? renderTemplate(content, vars) : '';
  });
  // {{var}} — simple replacement
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
  return result;
}

module.exports = router;
