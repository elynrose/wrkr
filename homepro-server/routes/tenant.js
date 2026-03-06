/**
 * Public tenant config endpoint.
 * Called by the frontend on mount to get tenant-specific branding, theme, and settings.
 */
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { getPublicSettings } = require('../services/siteConfig');

// GET /api/tenant/config — returns active tenant's public config
router.get('/config', async (req, res) => {
  const tenant = req.tenant || { id: 1, name: 'Default', slug: 'default' };
  try {
    const settings = await getPublicSettings(tenant.id);
    res.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
      },
      settings,
    });
  } catch (err) {
    console.error('GET /tenant/config error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tenant/plans — public: list plans for this tenant
router.get('/plans', async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const [rows] = await db.query(
      'SELECT * FROM subscription_plans WHERE is_active = TRUE AND tenant_id = ? ORDER BY sort_order',
      [tid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
