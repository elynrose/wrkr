const express = require('express');
const bcrypt  = require('bcryptjs');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole, generateToken } = require('../middleware/auth');
const { addCredits } = require('../services/credits');
const { sendProWelcomeEmail } = require('../services/email');
const { spamProtect } = require('../middleware/spam');

// POST /api/pros — pro signup (creates user + pro profile)
router.post('/', ...spamProtect({ keyPrefix: 'pro_signup', rateLimitMax: 8, minTimingMs: 4000 }), async (req, res) => {
  const { businessName, ownerName, email, phone, password, services, zips, cities, plan, yearsInBusiness, licenseNumber } = req.body;
  if (!businessName || !email) return res.status(400).json({ error: 'Business name and email are required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Create user
    const hash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('changeme123', 10);
    const names = (ownerName || '').split(' ');
    const [userResult] = await conn.query(
      'INSERT INTO users (email, password_hash, role, first_name, last_name, phone) VALUES (?,?,?,?,?,?)',
      [email, hash, 'pro', names[0] || null, names.slice(1).join(' ') || null, phone]
    );
    const userId = userResult.insertId;

    // Create pro
    const planMap = { 'pay-per-lead': 'starter', 'monthly': 'professional', 'enterprise': 'enterprise' };
    const [proResult] = await conn.query(
      `INSERT INTO pros (user_id, business_name, phone, years_in_business, license_number, subscription_plan, lead_credits)
       VALUES (?,?,?,?,?,?,?)`,
      [userId, businessName, phone, yearsInBusiness, licenseNumber, planMap[plan] || 'free', plan === 'monthly' ? 30 : 10]
    );
    const proId = proResult.insertId;
    const initialCredits = plan === 'monthly' ? 30 : 10;

    // Log signup credits
    await conn.query(
      `INSERT INTO credit_transactions (pro_id, user_id, type, amount, balance_after, description)
       VALUES (?, ?, 'signup_bonus', ?, ?, ?)`,
      [proId, userId, initialCredits, initialCredits, `Welcome bonus: ${initialCredits} credits (${planMap[plan] || 'free'} plan)`]
    );

    // Services
    if (services?.length) {
      for (const svcName of services) {
        const [svc] = await conn.query('SELECT id FROM services WHERE name = ? LIMIT 1', [svcName]);
        if (svc.length) {
          await conn.query('INSERT IGNORE INTO pro_services (pro_id, service_id) VALUES (?,?)', [proId, svc[0].id]);
        }
      }
    }

    // Service areas — ZIPs
    if (zips?.length) {
      for (const zip of zips) {
        const [zRow] = await conn.query('SELECT city_id, state_id FROM zip_codes WHERE zip = ? LIMIT 1', [zip]);
        await conn.query(
          'INSERT INTO pro_service_areas (pro_id, zip_code, city_id, state_id) VALUES (?,?,?,?)',
          [proId, zip, zRow[0]?.city_id || null, zRow[0]?.state_id || null]
        );
      }
    }

    // Service areas — Cities
    if (cities?.length) {
      for (const cityName of cities) {
        const [cRow] = await conn.query('SELECT id, state_id FROM cities WHERE name LIKE ? LIMIT 1', [`%${cityName}%`]);
        if (cRow.length) {
          await conn.query('INSERT INTO pro_service_areas (pro_id, city_id, state_id) VALUES (?,?,?)', [proId, cRow[0].id, cRow[0].state_id]);
        }
      }
    }

    await conn.commit();

    setImmediate(() => {
      sendProWelcomeEmail(
        { email, firstName: names[0] },
        { businessName, credits: initialCredits }
      ).catch(err => console.error('[EMAIL] Pro welcome email failed:', err.message));
    });

    const token = generateToken({ id: userId, email, role: 'pro' });
    res.status(201).json({ id: proId, userId, token, message: 'Pro account created' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already registered' });
    console.error('POST /pros error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// GET /api/pros/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.first_name, u.last_name, u.email, u.avatar_url
       FROM pros p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Pro not found' });

    const pro = rows[0];
    const [services] = await db.query(
      'SELECT s.* FROM services s JOIN pro_services ps ON ps.service_id = s.id WHERE ps.pro_id = ?', [pro.id]
    );
    const [areas] = await db.query(
      `SELECT psa.*, c.name as city_name, s.code as state_code
       FROM pro_service_areas psa
       LEFT JOIN cities c ON psa.city_id = c.id
       LEFT JOIN states s ON psa.state_id = s.id
       WHERE psa.pro_id = ?`,
      [pro.id]
    );
    const [reviews] = await db.query(
      `SELECT r.*, u.first_name, u.last_name FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE r.pro_id = ? AND r.is_public = TRUE ORDER BY r.created_at DESC LIMIT 10`,
      [pro.id]
    );

    res.json({ ...pro, services, areas, reviews });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/pros/:id — update pro profile (owner only)
router.put('/:id', authenticate, async (req, res) => {
  const { businessName, description, phone, website, yearsInBusiness, licenseNumber, insuranceInfo } = req.body;
  try {
    const [pros] = await db.query('SELECT id FROM pros WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!pros.length) return res.status(403).json({ error: 'Not authorized' });

    await db.query(
      `UPDATE pros SET business_name=COALESCE(?,business_name), description=COALESCE(?,description),
       phone=COALESCE(?,phone), website=COALESCE(?,website), years_in_business=COALESCE(?,years_in_business),
       license_number=COALESCE(?,license_number), insurance_info=COALESCE(?,insurance_info) WHERE id=?`,
      [businessName, description, phone, website, yearsInBusiness, licenseNumber, insuranceInfo, req.params.id]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/pros/:id/areas — update service areas
router.patch('/:id/areas', authenticate, async (req, res) => {
  const { zips, cityIds } = req.body;
  const conn = await db.getConnection();
  try {
    const [pros] = await conn.query('SELECT id FROM pros WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!pros.length) { conn.release(); return res.status(403).json({ error: 'Not authorized' }); }

    await conn.beginTransaction();
    await conn.query('DELETE FROM pro_service_areas WHERE pro_id = ?', [req.params.id]);

    if (zips?.length) {
      for (const zip of zips) {
        const [zRow] = await conn.query('SELECT city_id, state_id FROM zip_codes WHERE zip = ? LIMIT 1', [zip]);
        await conn.query('INSERT INTO pro_service_areas (pro_id, zip_code, city_id, state_id) VALUES (?,?,?,?)',
          [req.params.id, zip, zRow[0]?.city_id || null, zRow[0]?.state_id || null]);
      }
    }
    if (cityIds?.length) {
      for (const cid of cityIds) {
        const [c] = await conn.query('SELECT state_id FROM cities WHERE id = ?', [cid]);
        if (c.length) await conn.query('INSERT INTO pro_service_areas (pro_id, city_id, state_id) VALUES (?,?,?)', [req.params.id, cid, c[0].state_id]);
      }
    }

    await conn.commit();
    res.json({ message: 'Service areas updated' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

module.exports = router;
