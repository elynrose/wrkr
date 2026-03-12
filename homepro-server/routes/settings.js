const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { clearCache: clearSmsCache } = require('../services/sms');
const { clearCache: clearEmailCache } = require('../services/email');
const { clearCache: clearStripeCache } = require('../services/stripe');
const { clearSpamCache } = require('../middleware/spam');
const { clearSiteConfigCache, getSiteConfig } = require('../services/siteConfig');
const { sendSMS, isConfigured } = require('../services/sms');
const { audit } = require('../services/audit');
const { getOpenAIKey, chat: openaiChat, testKey } = require('../services/openaiSetup');

// Safe keys for AI-generated settings (exclude stripe, twilio, email, smtp, openai, etc.)
const AI_SETTINGS_WHITELIST = new Set([
  'site_name', 'site_tagline', 'meta_title', 'meta_description', 'meta_keywords',
  'hero_headline', 'hero_subheadline', 'hero_cta_primary', 'hero_cta_secondary', 'hero_support_text',
  'homepage_sections', 'show_hero', 'show_how_it_works', 'show_service_categories', 'show_recent_reviews',
  'featured_services', 'default_theme', 'support_email', 'support_phone', 'max_lead_claims', 'lead_credit_price',
]);

// POST /api/settings/test-openai — admin: verify OpenAI API key (must be before /:key)
async function handleTestOpenai(req, res) {
  try {
    const apiKey = await getOpenAIKey(db);
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ error: 'OpenAI API key not configured. Set OPENAI_API_KEY in .env or add openai_api_key in Settings (Super Admin → Spam / Security).' });
    }
    const result = await testKey(apiKey);
    return res.json({ success: true, message: result.message || 'OpenAI API key is valid' });
  } catch (err) {
    console.error('POST /settings/test-openai error:', err);
    const msg = err?.message || '';
    if (err?.status === 401 || /incorrect.*api key|invalid.*api key|authentication/i.test(msg)) {
      return res.status(400).json({ error: 'Invalid OpenAI API key. Get a valid key at https://platform.openai.com/account/api-keys and update Settings or .env.' });
    }
    return res.status(500).json({ error: msg || 'OpenAI test failed' });
  }
}
router.post('/test-openai', authenticate, requireRole('admin'), handleTestOpenai);

// POST /api/settings/test-sms — admin: send test SMS (must be before /:key)
router.post('/test-sms', authenticate, requireRole('admin'), async (req, res) => {
  const { to } = req.body;
  if (!to || typeof to !== 'string') {
    return res.status(400).json({ error: 'Phone number required (e.g. +15551234567)' });
  }
  const trimmed = to.trim();
  if (!trimmed) return res.status(400).json({ error: 'Phone number required' });
  try {
    const tid = req.tenant?.id || 1;
    const configured = await isConfigured(tid);
    if (!configured) {
      return res.status(400).json({ error: 'Twilio is not configured. Set Account SID, Auth Token, and Phone Number in Twilio settings.' });
    }
    const site = await getSiteConfig(tid);
    const body = `Test SMS from ${site.site_name}. Twilio is connected and working.`;
    const result = await sendSMS(trimmed, body, tid);
    res.json({ success: true, message: 'Test SMS sent', sid: result.sid, mock: result.mock });
  } catch (err) {
    console.error('Test SMS error:', err);
    res.status(500).json({ error: err.message || 'Failed to send test SMS' });
  }
});

// GET /api/settings — public settings (no secrets), scoped to tenant
router.get('/', async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const [rows] = await db.query(
      'SELECT setting_key, setting_value, setting_type FROM settings WHERE is_public = TRUE AND tenant_id = ?',
      [tid]
    );
    const obj = {};
    for (const r of rows) obj[r.setting_key] = castValue(r.setting_value, r.setting_type);
    res.json(obj);
  } catch (err) {
    console.error('GET /settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/settings/all — admin: all settings including secrets
router.get('/all', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const [rows] = await db.query(
      'SELECT * FROM settings WHERE tenant_id = ? ORDER BY setting_group, sort_order, setting_key',
      [tid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/settings/group/:group — admin: settings by group
router.get('/group/:group', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const [rows] = await db.query(
      'SELECT * FROM settings WHERE setting_group = ? AND tenant_id = ? ORDER BY sort_order',
      [req.params.group, tid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const SETUP_TEMPLATES_DIR = path.resolve(path.join(__dirname, '..', 'templates', 'setup'));

function listSetupTemplates() {
  try {
    if (!fs.existsSync(SETUP_TEMPLATES_DIR)) {
      console.warn('[setup-templates] Directory not found:', SETUP_TEMPLATES_DIR);
      return [];
    }
    const files = fs.readdirSync(SETUP_TEMPLATES_DIR).filter(f => f.endsWith('.json'));
    const list = [];
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(SETUP_TEMPLATES_DIR, f), 'utf8');
        const data = JSON.parse(raw);
        if (data.id != null && data.name != null) list.push({ id: String(data.id), name: String(data.name) });
      } catch (e) { console.warn('[setup-templates] Skip file', f, e.message); }
    }
    return list.sort((a, b) => (a.id === 'custom' ? 1 : 0) - (b.id === 'custom' ? 1 : 0) || a.name.localeCompare(b.name));
  } catch (err) {
    console.error('[setup-templates] listSetupTemplates error:', err);
    return [];
  }
}

function loadSetupTemplate(templateId) {
  try {
    // Restrict to safe template id (alphanumeric, hyphen, underscore) to prevent path traversal
    if (!templateId || !/^[a-z0-9_-]+$/i.test(String(templateId))) return null;
    const p = path.join(SETUP_TEMPLATES_DIR, `${templateId}.json`);
    const resolved = path.resolve(p);
    const resolvedDir = path.resolve(SETUP_TEMPLATES_DIR);
    if (!resolved.startsWith(resolvedDir) || !fs.existsSync(resolved)) return null;
    const raw = fs.readFileSync(resolved, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[setup-templates] loadSetupTemplate error:', err);
    return null;
  }
}

function applyPlaceholders(obj, serviceLower, serviceTitle) {
  if (typeof obj === 'string') {
    return obj.replace(/\{\{service\}\}/g, serviceLower).replace(/\{\{Service\}\}/g, serviceTitle);
  }
  if (Array.isArray(obj)) return obj.map(item => applyPlaceholders(item, serviceLower, serviceTitle));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = applyPlaceholders(obj[k], serviceLower, serviceTitle);
    return out;
  }
  return obj;
}

// GET /api/settings/setup-templates — list available one-click setup templates
router.get('/setup-templates', async (req, res) => {
  try {
    const list = listSetupTemplates();
    res.json(list);
  } catch (err) {
    console.error('GET /settings/setup-templates error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/settings/apply-setup-template — admin: apply a setup template to current tenant
router.post('/apply-setup-template', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { templateId, customService } = req.body;
  if (!templateId || typeof templateId !== 'string') {
    return res.status(400).json({ error: 'templateId required' });
  }
  const id = templateId.trim().toLowerCase();
  if (id === 'custom') {
    const raw = typeof customService === 'string' ? customService.trim() : '';
    if (!raw) return res.status(400).json({ error: 'customService required when templateId is custom' });
    var template = loadSetupTemplate('custom');
    if (!template) return res.status(400).json({ error: 'Custom template not found' });
    const serviceLower = raw.toLowerCase();
    const serviceTitle = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    template = applyPlaceholders(JSON.parse(JSON.stringify(template)), serviceLower, serviceTitle);
  } else {
    var template = loadSetupTemplate(id);
  }
  if (!template) return res.status(404).json({ error: 'Template not found' });
  const settings = template.settings;
  const howItWorks = template.howItWorks;
  if (!Array.isArray(settings) || !howItWorks || !howItWorks.consumer || !howItWorks.pro) {
    return res.status(400).json({ error: 'Invalid template structure' });
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const s of settings) {
      if (!s.key) continue;
      const val = typeof s.value === 'string' ? s.value : JSON.stringify(s.value);
      await conn.query(
        `INSERT INTO settings (tenant_id, setting_key, setting_value, setting_type, setting_group, is_public, sort_order)
         VALUES (?, ?, ?, ?, ?, TRUE, 0)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_type = VALUES(setting_type), setting_group = VALUES(setting_group)`,
        [tid, s.key, val, s.type || 'string', s.group || 'general']
      );
    }
    await conn.query('DELETE FROM how_it_works WHERE tenant_id = ?', [tid]);
    for (const step of howItWorks.consumer) {
      await conn.query(
        `INSERT INTO how_it_works (tenant_id, audience, step_number, icon_class, title, description)
         VALUES (?, 'consumer', ?, ?, ?, ?)`,
        [tid, step.step_number, step.icon_class || 'faWrench', step.title, step.description || '']
      );
    }
    for (const step of howItWorks.pro) {
      await conn.query(
        `INSERT INTO how_it_works (tenant_id, audience, step_number, icon_class, title, description)
         VALUES (?, 'pro', ?, ?, ?, ?)`,
        [tid, step.step_number, step.icon_class || 'faWrench', step.title, step.description || '']
      );
    }
    await conn.commit();
    clearSiteConfigCache(tid);
    audit({ tenantId: tid, userId: req.user?.id, action: 'apply_setup_template', entityType: 'settings', newValues: { templateId: id }, ipAddress: req.ip }).catch(() => {});
    res.json({
      message: 'Template applied',
      applied: { settings: settings.length, steps: howItWorks.consumer.length + howItWorks.pro.length },
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /settings/apply-setup-template error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    conn.release();
  }
});

// POST /api/settings/setup-chat — AI setup assistant: chat and optionally apply generated content
async function handleSetupChat(req, res) {
  const tid = req.tenant?.id || 1;
  const { messages, action } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }
  const apiKey = await getOpenAIKey(db);
  if (!apiKey) {
    return res.status(400).json({ error: 'OpenAI API key not configured. Set OPENAI_API_KEY in .env or add openai_api_key in Settings (Super Admin).' });
  }
  try {
    const { content, parsed } = await openaiChat(apiKey, messages);
    if (action === 'apply' && parsed && isValidGenerated(parsed)) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        await applyGeneratedContent(conn, tid, parsed);
        await conn.commit();
        clearSiteConfigCache(tid);
        audit({ tenantId: tid, userId: req.user?.id, action: 'ai_setup_apply', entityType: 'settings', newValues: { applied: true }, ipAddress: req.ip }).catch(() => {});
      } catch (err) {
        await conn.rollback();
        console.error('applyGeneratedContent error:', err);
        return res.status(500).json({ error: 'Failed to apply generated content', detail: err.message });
      } finally {
        conn.release();
      }
      return res.json({ content, applied: true, message: 'Generated content applied to your site.' });
    }
    return res.json({ content, parsed: parsed || undefined });
  } catch (err) {
    console.error('POST /settings/setup-chat error:', err);
    const msg = err?.message || '';
    if (err?.status === 401 || /incorrect.*api key|invalid.*api key|authentication/i.test(msg)) {
      return res.status(400).json({
        error: 'Invalid OpenAI API key. Get a valid key at https://platform.openai.com/account/api-keys and set it in Settings (Super Admin → Spam / Security → OpenAI API key) or in .env as OPENAI_API_KEY.',
      });
    }
    return res.status(500).json({ error: msg || 'OpenAI request failed' });
  }
}

router.post('/setup-chat', authenticate, requireRole('admin'), handleSetupChat);

function isValidGenerated(p) {
  return p && Array.isArray(p.settings) && p.howItWorks && Array.isArray(p.howItWorks.consumer) && Array.isArray(p.howItWorks.pro);
}

async function applyGeneratedContent(conn, tid, p) {
  for (const s of p.settings || []) {
    if (!s.key || !AI_SETTINGS_WHITELIST.has(s.key)) continue;
    const val = typeof s.value === 'string' ? s.value : JSON.stringify(s.value || '');
    await conn.query(
      `INSERT INTO settings (tenant_id, setting_key, setting_value, setting_type, setting_group, is_public, sort_order)
       VALUES (?, ?, ?, ?, ?, TRUE, 0)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_type = VALUES(setting_type), setting_group = VALUES(setting_group)`,
      [tid, s.key, val, s.type || 'string', s.group || 'general']
    );
  }
  if (p.sample_reviews && Array.isArray(p.sample_reviews) && p.sample_reviews.length > 0) {
    await conn.query(
      `INSERT INTO settings (tenant_id, setting_key, setting_value, setting_type, setting_group, is_public, sort_order)
       VALUES (?, 'homepage_sample_reviews', ?, 'json', 'homepage', TRUE, 0)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [tid, JSON.stringify(p.sample_reviews)]
    );
  }
  await conn.query('DELETE FROM how_it_works WHERE tenant_id = ?', [tid]);
  for (const step of p.howItWorks.consumer || []) {
    await conn.query(
      `INSERT INTO how_it_works (tenant_id, audience, step_number, icon_class, title, description) VALUES (?, 'consumer', ?, ?, ?, ?)`,
      [tid, step.step_number || 0, step.icon_class || 'faWrench', step.title || '', step.description || '']
    );
  }
  for (const step of p.howItWorks.pro || []) {
    await conn.query(
      `INSERT INTO how_it_works (tenant_id, audience, step_number, icon_class, title, description) VALUES (?, 'pro', ?, ?, ?, ?)`,
      [tid, step.step_number || 0, step.icon_class || 'faWrench', step.title || '', step.description || '']
    );
  }
  await conn.query('DELETE FROM subscription_plans WHERE tenant_id = ?', [tid]);
  for (let i = 0; i < (p.subscription_plans || []).length; i++) {
    const pl = p.subscription_plans[i];
    const features = typeof pl.features === 'object' ? JSON.stringify(pl.features || {}) : (pl.features || '{}');
    await conn.query(
      `INSERT INTO subscription_plans (tenant_id, name, slug, price_monthly, price_yearly, lead_credits, max_service_areas, max_services, features, is_popular, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tid, pl.name || 'Plan', pl.slug || 'plan-' + (i + 1), pl.price_monthly || 0, pl.price_yearly || 0, pl.lead_credits || 0, pl.max_service_areas || 5, pl.max_services || 5, features, !!pl.is_popular, pl.sort_order != null ? pl.sort_order : i + 1]
    );
  }
  // Default tenant (id=1): do not wipe or replace categories/services
  if (tid !== 1) {
    await conn.query('DELETE FROM services WHERE tenant_id = ?', [tid]);
    await conn.query('DELETE FROM categories WHERE tenant_id = ?', [tid]);
    const catSlugToId = {};
    for (let i = 0; i < (p.categories || []).length; i++) {
      const c = p.categories[i];
      const [r] = await conn.query(
        `INSERT INTO categories (tenant_id, name, slug, icon_class, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
        [tid, c.name || '', c.slug || 'cat-' + i, c.icon_class || 'faWrench', c.description || '', c.sort_order != null ? c.sort_order : i]
      );
      catSlugToId[c.slug || ('cat-' + i)] = r.insertId;
    }
    for (const svc of p.services || []) {
      const catId = svc.category_slug ? (catSlugToId[svc.category_slug] || null) : null;
      await conn.query(
        `INSERT INTO services (tenant_id, category_id, name, slug, icon_class, min_price, price_unit) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tid, catId, svc.name || '', svc.slug || svc.name?.toLowerCase().replace(/\s+/g, '-') || 'service', svc.icon_class || 'faWrench', svc.min_price || null, svc.price_unit || 'per job']
      );
    }
  }
}

// PUT /api/settings — admin: bulk update settings
router.put('/', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { settings } = req.body;
  if (!settings || !Array.isArray(settings)) {
    return res.status(400).json({ error: 'settings array required' });
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const s of settings) {
      if (!s.key) continue;
      await conn.query(
        `INSERT INTO settings (tenant_id, setting_key, setting_value, setting_type, setting_group, label, is_public, sort_order)
         VALUES (?, ?, ?, COALESCE(?, 'string'), COALESCE(?, 'general'), COALESCE(?, ?), COALESCE(?, TRUE), COALESCE(?, 0))
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [tid, s.key, s.value ?? '', s.type, s.group, s.label, s.key, s.isPublic, s.sortOrder]
      );
    }
    await conn.commit();

    if (settings.some(s => s.key?.startsWith('stripe_'))) clearStripeCache();
    if (settings.some(s => s.key?.startsWith('twilio_') || s.key === 'match_notify_count' || s.key === 'match_expiry_hours')) clearSmsCache();
    if (settings.some(s => s.key?.startsWith('smtp_') || s.key?.startsWith('email_'))) clearEmailCache(tid);
    if (settings.some(s => s.key?.startsWith('spam_'))) clearSpamCache();
    if (settings.some(s => ['site_name', 'support_email', 'support_phone', 'site_tagline'].includes(s.key))) clearSiteConfigCache(tid);

    const keys = settings.filter(s => s.key).map(s => s.key);
    audit({ tenantId: tid, userId: req.user?.id, action: 'settings_update', entityType: 'settings', newValues: { keys }, ipAddress: req.ip }).catch(() => {});

    res.json({ message: `${settings.length} settings updated` });
  } catch (err) {
    await conn.rollback();
    console.error('PUT /settings error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// PUT /api/settings/:key — admin: update single setting
router.put('/:key', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const { value } = req.body;
  try {
    const [existing] = await db.query(
      'SELECT id FROM settings WHERE setting_key = ? AND tenant_id = ?',
      [req.params.key, tid]
    );
    if (!existing.length) {
      await db.query(
        'INSERT INTO settings (tenant_id, setting_key, setting_value) VALUES (?, ?, ?)',
        [tid, req.params.key, value ?? '']
      );
    } else {
      await db.query(
        'UPDATE settings SET setting_value = ? WHERE setting_key = ? AND tenant_id = ?',
        [value ?? '', req.params.key, tid]
      );
    }
    res.json({ message: 'Setting updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/settings/:key — admin
router.delete('/:key', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    await db.query('DELETE FROM settings WHERE setting_key = ? AND tenant_id = ?', [req.params.key, tid]);
    res.json({ message: 'Setting deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

function castValue(val, type) {
  if (type === 'number') return Number(val) || 0;
  if (type === 'boolean') return val === 'true' || val === '1';
  if (type === 'json') try { return JSON.parse(val); } catch { return val; }
  return val;
}

module.exports = router;
module.exports.listSetupTemplates = listSetupTemplates;
module.exports.handleSetupChat = handleSetupChat;
module.exports.handleTestOpenai = handleTestOpenai;
