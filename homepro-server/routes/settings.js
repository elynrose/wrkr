const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { clearCache: clearSmsCache } = require('../services/sms');
const { clearCache: clearEmailCache } = require('../services/email');
const { clearCache: clearStripeCache } = require('../services/stripe');
const { clearSpamCache } = require('../middleware/spam');

// GET /api/settings — public settings (no secrets)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT setting_key, setting_value, setting_type FROM settings WHERE is_public = TRUE');
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
  try {
    const [rows] = await db.query('SELECT * FROM settings ORDER BY setting_group, sort_order, setting_key');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/settings/group/:group — admin: settings by group
router.get('/group/:group', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM settings WHERE setting_group = ? ORDER BY sort_order', [req.params.group]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings — admin: bulk update settings
router.put('/', authenticate, requireRole('admin'), async (req, res) => {
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
        `INSERT INTO settings (setting_key, setting_value, setting_type, setting_group, label, is_public, sort_order)
         VALUES (?, ?, COALESCE(?, 'string'), COALESCE(?, 'general'), COALESCE(?, ?), COALESCE(?, TRUE), COALESCE(?, 0))
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [s.key, s.value ?? '', s.type, s.group, s.label, s.key, s.isPublic, s.sortOrder]
      );
    }
    await conn.commit();

    // If stripe keys changed, clear the Stripe instance cache
    const hasStripeChange = settings.some(s => s.key?.startsWith('stripe_'));
    if (hasStripeChange) {
      clearStripeCache();
    }

    // If any twilio setting changed, clear the SMS client/config cache
    const hasTwilioChange = settings.some(s => s.key?.startsWith('twilio_') || s.key === 'match_notify_count' || s.key === 'match_expiry_hours');
    if (hasTwilioChange) {
      clearSmsCache();
    }

    // If any email/SMTP setting changed, clear the email transporter cache
    const hasEmailChange = settings.some(s => s.key?.startsWith('smtp_') || s.key?.startsWith('email_'));
    if (hasEmailChange) {
      clearEmailCache();
    }

    // If any spam setting changed, clear the spam config cache
    const hasSpamChange = settings.some(s => s.key?.startsWith('spam_'));
    if (hasSpamChange) {
      clearSpamCache();
    }

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
  const { value } = req.body;
  try {
    const [existing] = await db.query('SELECT id FROM settings WHERE setting_key = ?', [req.params.key]);
    if (!existing.length) {
      await db.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)',
        [req.params.key, value ?? '']
      );
    } else {
      await db.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [value ?? '', req.params.key]);
    }
    res.json({ message: 'Setting updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/settings/:key — admin
router.delete('/:key', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM settings WHERE setting_key = ?', [req.params.key]);
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
