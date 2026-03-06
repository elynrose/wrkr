/**
 * Super Admin routes — manage all tenants.
 * Protected by SUPERADMIN_SECRET env var OR user.role === 'superadmin'.
 */
const express  = require('express');
const router   = express.Router();
const db       = require('../db');
const bcrypt   = require('bcryptjs');
const { authenticate } = require('../middleware/auth');
const { clearTenantCache } = require('../middleware/tenant');

// ── Auth guard ─────────────────────────────────────────────
function requireSuperAdmin(req, res, next) {
  // Accept: valid JWT with role=superadmin, OR X-Super-Admin secret header
  const secret = process.env.SUPERADMIN_SECRET;
  if (secret && req.headers['x-super-admin'] === secret) return next();
  if (req.user?.role === 'superadmin') return next();
  return res.status(403).json({ error: 'Super admin access required' });
}

router.use(authenticate);
router.use(requireSuperAdmin);

// ── Provisioning helper ─────────────────────────────────────
async function provisionTenant(tenantId, conn) {
  // Copy settings from tenant 1 as defaults
  const [defaultSettings] = await (conn || db).query(
    'SELECT setting_key, setting_value, setting_type, setting_group, label, description, is_public, sort_order FROM settings WHERE tenant_id = 1'
  );
  for (const s of defaultSettings) {
    await (conn || db).query(
      `INSERT IGNORE INTO settings (tenant_id, setting_key, setting_value, setting_type, setting_group, label, description, is_public, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [tenantId, s.setting_key, s.setting_value, s.setting_type, s.setting_group, s.label, s.description, s.is_public, s.sort_order]
    );
  }

  // Copy notification templates from tenant 1
  const [defaultTemplates] = await (conn || db).query(
    'SELECT slug, name, channel, subject, body, description, variables, is_active FROM notification_templates WHERE tenant_id = 1'
  );
  for (const t of defaultTemplates) {
    await (conn || db).query(
      `INSERT IGNORE INTO notification_templates (tenant_id, slug, name, channel, subject, body, description, variables, is_active)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [tenantId, t.slug, t.name, t.channel, t.subject, t.body, t.description, t.variables, t.is_active]
    );
  }

  // Copy how-it-works steps from tenant 1
  const [defaultHIW] = await (conn || db).query(
    'SELECT audience, step_number, icon_class, title, description FROM how_it_works WHERE tenant_id = 1'
  );
  for (const h of defaultHIW) {
    await (conn || db).query(
      `INSERT IGNORE INTO how_it_works (tenant_id, audience, step_number, icon_class, title, description)
       VALUES (?,?,?,?,?,?)`,
      [tenantId, h.audience, h.step_number, h.icon_class, h.title, h.description]
    );
  }

  // Copy subscription plans from tenant 1
  const [defaultPlans] = await (conn || db).query(
    'SELECT name, slug, stripe_price_id, price_monthly, price_yearly, lead_credits, max_service_areas, max_services, features, is_popular, sort_order FROM subscription_plans WHERE tenant_id = 1'
  );
  for (const p of defaultPlans) {
    await (conn || db).query(
      `INSERT IGNORE INTO subscription_plans (tenant_id, name, slug, stripe_price_id, price_monthly, price_yearly, lead_credits, max_service_areas, max_services, features, is_popular, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [tenantId, p.name, p.slug, p.stripe_price_id, p.price_monthly, p.price_yearly, p.lead_credits, p.max_service_areas, p.max_services, p.features, p.is_popular, p.sort_order]
    );
  }

  // Copy categories and services from tenant 1
  const [defaultCats] = await (conn || db).query(
    'SELECT name, slug, icon_class, description, tags, sort_order FROM categories WHERE tenant_id = 1 AND parent_id IS NULL'
  );
  for (const c of defaultCats) {
    await (conn || db).query(
      `INSERT IGNORE INTO categories (tenant_id, name, slug, icon_class, description, tags, sort_order)
       VALUES (?,?,?,?,?,?,?)`,
      [tenantId, c.name, c.slug, c.icon_class, c.description, c.tags, c.sort_order]
    );
  }
}

// ── GET /api/superadmin/tenants ─────────────────────────────
router.get('/tenants', async (req, res) => {
  try {
    const { page = 1, limit = 25, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '1=1';
    const params = [];
    if (status) { where += ' AND t.status = ?'; params.push(status); }

    const [rows] = await db.query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count,
              (SELECT COUNT(*) FROM leads l WHERE l.tenant_id = t.id) AS lead_count
       FROM tenants t WHERE ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM tenants WHERE ${where}`, params);
    res.json({ tenants: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('GET /superadmin/tenants error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/superadmin/tenants/:id ────────────────────────
router.get('/tenants/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tenants WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Tenant not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/superadmin/tenants/:id/stats ──────────────────
router.get('/tenants/:id/stats', async (req, res) => {
  const tid = req.params.id;
  try {
    const [[users]]  = await db.query('SELECT COUNT(*) AS cnt FROM users WHERE tenant_id = ?', [tid]);
    const [[leads]]  = await db.query('SELECT COUNT(*) AS cnt FROM leads WHERE tenant_id = ?', [tid]);
    const [[pros]]   = await db.query('SELECT COUNT(*) AS cnt FROM pros WHERE tenant_id = ?', [tid]);
    const [[revenue]]= await db.query("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE tenant_id = ? AND status = 'succeeded'", [tid]);
    res.json({
      users: users.cnt,
      leads: leads.cnt,
      pros: pros.cnt,
      revenue: parseFloat(revenue.total),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/superadmin/tenants ───────────────────────────
router.post('/tenants', async (req, res) => {
  const { name, slug, customDomain, plan, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query('SELECT id FROM tenants WHERE slug = ?', [slug]);
    if (existing.length) return res.status(409).json({ error: 'Slug already taken' });
    if (customDomain) {
      const [domExist] = await conn.query('SELECT id FROM tenants WHERE custom_domain = ?', [customDomain]);
      if (domExist.length) return res.status(409).json({ error: 'Domain already registered' });
    }

    const [tenantResult] = await conn.query(
      'INSERT INTO tenants (name, slug, custom_domain, status, plan) VALUES (?,?,?,?,?)',
      [name, slug, customDomain || null, 'active', plan || 'starter']
    );
    const tenantId = tenantResult.insertId;

    // Create admin user for this tenant
    let ownerUserId = null;
    if (adminEmail && adminPassword) {
      const hash = await bcrypt.hash(adminPassword, 10);
      const [uRes] = await conn.query(
        'INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name) VALUES (?,?,?,?,?,?)',
        [tenantId, adminEmail, hash, 'admin', adminFirstName || 'Admin', adminLastName || name]
      );
      ownerUserId = uRes.insertId;
      await conn.query('UPDATE tenants SET owner_user_id = ? WHERE id = ?', [ownerUserId, tenantId]);
    }

    await conn.commit();

    // Provision default data (settings, templates, etc.)
    await provisionTenant(tenantId);

    res.status(201).json({
      id: tenantId,
      message: 'Tenant created and provisioned',
      adminUserId: ownerUserId,
    });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slug or domain already exists' });
    console.error('POST /superadmin/tenants error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// ── PATCH /api/superadmin/tenants/:id ─────────────────────
router.patch('/tenants/:id', async (req, res) => {
  const { name, customDomain, status, plan } = req.body;
  const id = req.params.id;
  try {
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (customDomain !== undefined) { updates.push('custom_domain = ?'); params.push(customDomain || null); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (plan !== undefined) { updates.push('plan = ?'); params.push(plan); }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    await db.query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`, params);
    clearTenantCache();
    res.json({ message: 'Tenant updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Domain already registered' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/superadmin/tenants/:id ────────────────────
router.delete('/tenants/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (id === 1) return res.status(400).json({ error: 'Cannot delete the default tenant' });
  try {
    await db.query("UPDATE tenants SET status = 'suspended' WHERE id = ?", [id]);
    clearTenantCache();
    res.json({ message: 'Tenant suspended' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
module.exports.provisionTenant = provisionTenant;
