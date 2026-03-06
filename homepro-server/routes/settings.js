const express = require('express');
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
