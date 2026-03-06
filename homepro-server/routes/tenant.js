/**
 * Public tenant config endpoint.
 * Called by the frontend on mount to get tenant-specific branding, theme, and settings.
 * When authenticated, returns the logged-in user's tenant (so admin preview opens correct tenant).
 */
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { getPublicSettings } = require('../services/siteConfig');
const { optionalAuth } = require('../middleware/auth');

// GET /api/tenant/config — returns tenant public config (host-based or, when authenticated, user's tenant)
router.get('/config', optionalAuth, async (req, res) => {
  let tenant = req.tenant || { id: 1, name: 'Default', slug: 'default' };
  try {
    if (req.user) {
      const [userRows] = await db.query('SELECT tenant_id FROM users WHERE id = ?', [req.user.id]);
      if (userRows.length && userRows[0].tenant_id) {
        const [tenantRows] = await db.query(
          'SELECT id, name, slug, custom_domain, plan FROM tenants WHERE id = ? AND status = ? LIMIT 1',
          [userRows[0].tenant_id, 'active']
        );
        if (tenantRows.length) tenant = tenantRows[0];
      }
    }
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

// GET /api/tenant/:slug/public — public tenant home page data (no auth)
router.get('/:slug/public', async (req, res) => {
  try {
    const [tenants] = await db.query(
      "SELECT id, name, slug, custom_domain, plan FROM tenants WHERE slug = ? AND status = 'active' LIMIT 1",
      [req.params.slug]
    );
    if (!tenants.length) return res.status(404).json({ error: 'Tenant not found' });
    const tenant = tenants[0];
    const tid = tenant.id;

    const [settingsRows] = await db.query(
      'SELECT setting_key, setting_value FROM settings WHERE is_public = TRUE AND tenant_id = ?',
      [tid]
    );
    const settings = {};
    for (const r of settingsRows) settings[r.setting_key] = r.setting_value;

    let selectedCategoryIds = [];
    try {
      const raw = settings.home_page_category_ids;
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          selectedCategoryIds = parsed.filter(id => Number.isInteger(Number(id))).map(id => Number(id));
        }
      }
    } catch (_) {}

    const [categories] = await db.query(
      'SELECT id, name, slug, icon_class, description FROM categories WHERE is_active = TRUE AND tenant_id = ? ORDER BY sort_order ASC',
      [tid]
    );

    const [services] = await db.query(
      'SELECT s.id, s.name, s.icon_class, s.min_price, s.avg_rating, s.review_count, s.card_image_url, s.category_id FROM services s WHERE s.tenant_id = ? AND s.is_active = TRUE ORDER BY s.name ASC',
      [tid]
    );

    let filteredCategories = categories;
    let filteredServices = services;
    if (selectedCategoryIds.length > 0) {
      const idSet = new Set(selectedCategoryIds);
      filteredCategories = categories.filter(c => idSet.has(c.id));
      filteredServices = services.filter(s => s.category_id != null && idSet.has(s.category_id));
    }

    const [steps] = await db.query(
      "SELECT step_number, title, description, icon_class, audience FROM how_it_works WHERE tenant_id = ? ORDER BY audience ASC, step_number ASC",
      [tid]
    );

    const [reviews] = await db.query(
      `SELECT r.rating, r.title, r.body, r.created_at,
              u.first_name, u.avatar_url,
              p.business_name, l.service_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN pros p ON r.pro_id = p.id
       LEFT JOIN leads l ON r.lead_id = l.id
       WHERE r.is_public = TRUE AND r.is_verified = TRUE AND r.tenant_id = ?
       ORDER BY r.created_at DESC LIMIT 6`,
      [tid]
    );

    const [plans] = await db.query(
      'SELECT name, slug, price_monthly, lead_credits, max_service_areas, features, is_popular FROM subscription_plans WHERE is_active = TRUE AND tenant_id = ? ORDER BY sort_order ASC',
      [tid]
    );

    const [[proCount]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM pros WHERE tenant_id = ? AND sms_opt_in = TRUE', [tid]
    );

    res.json({
      tenant: { id: tid, name: tenant.name, slug: tenant.slug, domain: tenant.custom_domain },
      settings,
      categories: filteredCategories.map(c => ({
        ...c,
        services: filteredServices.filter(s => s.category_id === c.id),
      })),
      services: filteredServices,
      steps: {
        consumer: steps.filter(s => s.audience === 'consumer'),
        pro: steps.filter(s => s.audience === 'pro'),
      },
      reviews,
      plans,
      proCount: proCount.cnt || 0,
    });
  } catch (err) {
    console.error('GET /tenant/:slug/public error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tenant/:slug/leads — public: submit a lead for a specific tenant
router.post('/:slug/leads', async (req, res) => {
  try {
    const [tenants] = await db.query(
      "SELECT id, name FROM tenants WHERE slug = ? AND status = 'active' LIMIT 1",
      [req.params.slug]
    );
    if (!tenants.length) return res.status(404).json({ error: 'Tenant not found' });
    const tenantId = tenants[0].id;

    const { service, zip, city, description, urgency, name, email, phone } = req.body;
    if (!email || !service) return res.status(400).json({ error: 'Service and email are required' });

    const [svc] = await db.query('SELECT id FROM services WHERE name = ? AND tenant_id = ? LIMIT 1', [service, tenantId]);
    const serviceId = svc.length ? svc[0].id : null;

    let cityId = null;
    if (city) {
      const [cityRows] = await db.query('SELECT id FROM cities WHERE name LIKE ? LIMIT 1', [`%${city}%`]);
      if (cityRows.length) cityId = cityRows[0].id;
    }

    const urgencyMap = { 'Within 24 hours': 'within_24h', 'This week': 'this_week', 'This month': 'this_month', 'Just planning': 'flexible' };
    const dbUrgency = urgencyMap[urgency] || urgency || 'flexible';

    const [result] = await db.query(
      `INSERT INTO leads
        (tenant_id, user_id, service_id, service_name, customer_name, email, phone, zip, city_id, city_name, description, urgency, lead_value)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [tenantId, null, serviceId, service, name, email, phone, zip, cityId, city, description, dbUrgency, serviceId ? 25.00 : 15.00]
    );

    await db.query('INSERT INTO lead_activity (tenant_id, lead_id, user_id, action, details) VALUES (?,?,?,?,?)',
      [tenantId, result.insertId, null, 'lead_created', `Lead submitted via tenant page for ${service}`]);

    const { sendNewLeadEmail } = require('../services/email');
    const { matchAndNotify } = require('../services/matchEngine');

    setImmediate(() => {
      sendNewLeadEmail({ service_name: service, customer_name: name, email, zip, urgency: dbUrgency, description }, tenantId)
        .catch(err => console.error('[EMAIL] Tenant lead confirmation failed:', err.message));
    });

    setImmediate(async () => {
      try {
        const matches = await matchAndNotify(result.insertId, tenantId);
        console.log(`[AUTO-MATCH] Tenant lead #${result.insertId}: ${matches.length} pros matched`);
      } catch (err) {
        console.error(`[AUTO-MATCH] Tenant lead #${result.insertId} matching failed:`, err.message);
      }
    });

    res.status(201).json({ id: result.insertId, message: 'Lead submitted successfully' });
  } catch (err) {
    console.error('POST /tenant/:slug/leads error:', err);
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
