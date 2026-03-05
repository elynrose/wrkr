const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole, optionalAuth } = require('../middleware/auth');
const { matchAndNotify } = require('../services/matchEngine');
const { deductCredits } = require('../services/credits');
const { sendNewLeadEmail, sendLeadClaimedEmailToCustomer, sendLeadClaimedEmailToPro } = require('../services/email');
const { spamProtect } = require('../middleware/spam');

// POST /api/leads — consumer creates a lead
router.post('/', ...spamProtect({ keyPrefix: 'lead', rateLimitMax: 10, rateLimitSettingKey: 'spam_rate_limit_max_leads', minTimingMs: 3000, maxLinks: 3 }), optionalAuth, async (req, res) => {
  const { service, zip, city, description, urgency, name, email, phone, address, budgetMin, budgetMax, propertyType } = req.body;
  if (!email || !service) return res.status(400).json({ error: 'Service and email are required' });

  try {
    const [svc] = await db.query('SELECT id FROM services WHERE name = ? LIMIT 1', [service]);
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
        (user_id, service_id, service_name, customer_name, email, phone, zip, city_id, city_name, address, description, urgency, budget_min, budget_max, property_type, lead_value)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [req.user?.id || null, serviceId, service, name, email, phone, zip, cityId, city, address, description, dbUrgency, budgetMin, budgetMax, propertyType || 'residential', serviceId ? 25.00 : 15.00]
    );

    // Log activity
    await db.query('INSERT INTO lead_activity (lead_id, user_id, action, details) VALUES (?,?,?,?)',
      [result.insertId, req.user?.id || null, 'lead_created', `Lead submitted via website for ${service}`]);

    // Send confirmation email to customer
    const newLeadId = result.insertId;
    setImmediate(() => {
      sendNewLeadEmail({ service_name: service, customer_name: name, email, zip, urgency: dbUrgency, description })
        .catch(err => console.error('[EMAIL] Lead confirmation failed:', err.message));
    });

    // Trigger dynamic matching asynchronously (don't block the response)
    setImmediate(async () => {
      try {
        const matches = await matchAndNotify(newLeadId);
        console.log(`[AUTO-MATCH] Lead #${newLeadId}: ${matches.length} pros matched`);
      } catch (err) {
        console.error(`[AUTO-MATCH] Lead #${newLeadId} matching failed:`, err.message);
      }
    });

    res.status(201).json({ id: newLeadId, message: 'Lead submitted successfully' });
  } catch (err) {
    console.error('POST /leads error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leads — list leads (admin only)
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { zip, city, service_id, status, source, priority, limit = 50, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];

    if (zip)        { query += ' AND zip = ?';          params.push(zip); }
    if (city)       { query += ' AND city_name LIKE ?';  params.push(`%${city}%`); }
    if (service_id) { query += ' AND service_id = ?';   params.push(service_id); }
    if (status)     { query += ' AND status = ?';       params.push(status); }
    if (source)     { query += ' AND source = ?';       params.push(source); }
    if (priority)   { query += ' AND priority = ?';     params.push(priority); }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /leads error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leads/mine — current user's leads
router.get('/mine', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM leads WHERE user_id = ? OR email = ? ORDER BY created_at DESC LIMIT 100',
      [req.user.id, req.user.email]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /leads/mine error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leads/:id — full lead detail with claims, notes, activity (authenticated)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Lead not found' });

    const lead = rows[0];

    const [claims] = await db.query(
      `SELECT lc.*, p.business_name, p.avg_rating, p.total_reviews, u.email as pro_email, u.phone as pro_phone
       FROM lead_claims lc
       JOIN pros p ON lc.pro_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE lc.lead_id = ? ORDER BY lc.claimed_at DESC`,
      [lead.id]
    );

    const [notes] = await db.query(
      `SELECT n.*, u.first_name, u.last_name, u.role as user_role
       FROM lead_notes n
       LEFT JOIN users u ON n.user_id = u.id
       WHERE n.lead_id = ? ORDER BY n.is_pinned DESC, n.created_at DESC`,
      [lead.id]
    );

    const [activity] = await db.query(
      `SELECT a.*, u.first_name, u.last_name
       FROM lead_activity a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.lead_id = ? ORDER BY a.created_at DESC LIMIT 50`,
      [lead.id]
    );

    // Assigned user info
    let assignedUser = null;
    if (lead.assigned_to) {
      const [au] = await db.query('SELECT id, first_name, last_name, email, role FROM users WHERE id = ?', [lead.assigned_to]);
      if (au.length) assignedUser = au[0];
    }

    res.json({ ...lead, claims, notes, activity, assignedUser });
  } catch (err) {
    console.error('GET /leads/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leads/for-pro/:proId
router.get('/for-pro/:proId', authenticate, async (req, res) => {
  try {
    const proId = req.params.proId;
    const [areas] = await db.query('SELECT zip_code, city_id FROM pro_service_areas WHERE pro_id = ?', [proId]);
    const [proSvcs] = await db.query('SELECT service_id FROM pro_services WHERE pro_id = ?', [proId]);

    const zips = areas.map(a => a.zip_code).filter(Boolean);
    const serviceIds = proSvcs.map(s => s.service_id);
    if (!zips.length && !serviceIds.length) return res.json([]);

    let query = "SELECT * FROM leads WHERE status IN ('new','matching')";
    const params = [];

    if (zips.length) {
      query += ` AND zip IN (${zips.map(() => '?').join(',')})`;
      params.push(...zips);
    }
    if (serviceIds.length) {
      query += ` AND service_id IN (${serviceIds.map(() => '?').join(',')})`;
      params.push(...serviceIds);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/leads/:id/claim — pro claims a lead
router.post('/:id/claim', authenticate, requireRole('pro'), async (req, res) => {
  const leadId = req.params.id;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [leads] = await conn.query('SELECT * FROM leads WHERE id = ? FOR UPDATE', [leadId]);
    if (!leads.length) { await conn.rollback(); return res.status(404).json({ error: 'Lead not found' }); }

    const lead = leads[0];
    if (lead.claim_count >= lead.max_claims) {
      await conn.rollback();
      return res.status(409).json({ error: 'Lead has reached maximum claims' });
    }

    const [pros] = await conn.query('SELECT * FROM pros WHERE user_id = ?', [req.user.id]);
    if (!pros.length) { await conn.rollback(); return res.status(404).json({ error: 'Pro profile not found' }); }
    const pro = pros[0];

    const [existing] = await conn.query('SELECT id FROM lead_claims WHERE lead_id = ? AND pro_id = ?', [leadId, pro.id]);
    if (existing.length) { await conn.rollback(); return res.status(409).json({ error: 'You already claimed this lead' }); }

    if (pro.subscription_plan !== 'enterprise' && pro.lead_credits <= 0) {
      await conn.rollback();
      return res.status(402).json({ error: 'No lead credits remaining. Upgrade your plan.' });
    }

    await conn.query('INSERT INTO lead_claims (lead_id, pro_id, price_paid) VALUES (?,?,?)', [leadId, pro.id, lead.lead_value]);
    await conn.query('UPDATE leads SET claim_count = claim_count + 1, status = IF(status = "new", "matching", status) WHERE id = ?', [leadId]);

    await deductCredits(
      pro.id, req.user.id, 1, 'lead_claim',
      `Claimed lead #${leadId} (${lead.service_name || 'Service'})`,
      String(leadId), 'lead', conn
    );

    await conn.query('INSERT INTO lead_activity (lead_id, user_id, action, details) VALUES (?,?,?,?)',
      [leadId, req.user.id, 'lead_claimed', `Claimed by ${pro.business_name}`]);

    await conn.commit();

    setImmediate(() => {
      sendLeadClaimedEmailToCustomer(lead, pro)
        .catch(err => console.error('[EMAIL] Claim email to customer failed:', err.message));
      sendLeadClaimedEmailToPro(req.user.email || pro.phone, lead, pro)
        .catch(err => console.error('[EMAIL] Claim email to pro failed:', err.message));
    });

    res.status(201).json({ message: 'Lead claimed successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('Claim error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// PATCH /api/leads/:id/status
router.patch('/:id/status', authenticate, async (req, res) => {
  const { status } = req.body;
  const leadId = req.params.id;
  const allowed = ['new','matching','matched','contacted','quoted','hired','completed','canceled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    // Pros can only update leads they have claimed
    if (req.user.role === 'pro') {
      const [proRows] = await db.query('SELECT id FROM pros WHERE user_id = ?', [req.user.id]);
      if (!proRows.length) return res.status(403).json({ error: 'Pro profile not found' });

      const [claim] = await db.query(
        'SELECT id FROM lead_claims WHERE lead_id = ? AND pro_id = ?',
        [leadId, proRows[0].id]
      );
      const [match] = await db.query(
        "SELECT id FROM lead_matches WHERE lead_id = ? AND pro_id = ? AND status = 'accepted'",
        [leadId, proRows[0].id]
      );
      if (!claim.length && !match.length) {
        return res.status(403).json({ error: 'You can only update the status of leads you have claimed' });
      }

      const proAllowed = ['contacted','quoted','hired','completed'];
      if (!proAllowed.includes(status)) {
        return res.status(403).json({ error: `Pros can only set status to: ${proAllowed.join(', ')}` });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins and pros can update lead status' });
    }

    const [old] = await db.query('SELECT status FROM leads WHERE id = ?', [leadId]);
    if (!old.length) return res.status(404).json({ error: 'Lead not found' });

    await db.query('UPDATE leads SET status = ? WHERE id = ?', [status, leadId]);

    const oldStatus = old[0].status;
    await db.query('INSERT INTO lead_notes (lead_id, user_id, note_type, content) VALUES (?,?,?,?)',
      [leadId, req.user.id, 'status_change', `Status changed from "${oldStatus}" to "${status}"`]);
    await db.query('INSERT INTO lead_activity (lead_id, user_id, action, details) VALUES (?,?,?,?)',
      [leadId, req.user.id, 'status_changed', `${oldStatus} → ${status}`]);

    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error('PATCH /leads/:id/status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/leads/:id — update lead fields (priority, assigned_to, tags, follow_up_date, etc.)
router.patch('/:id', authenticate, async (req, res) => {
  const leadId = req.params.id;

  // Only admins can update lead management fields
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update lead fields' });
  }

  const { priority, assignedTo, followUpDate, tags, internalNotes } = req.body;
  try {
    const sets = []; const params = [];
    if (priority !== undefined)      { sets.push('priority = ?');       params.push(priority); }
    if (assignedTo !== undefined)    { sets.push('assigned_to = ?');    params.push(assignedTo || null); }
    if (followUpDate !== undefined)  { sets.push('follow_up_date = ?'); params.push(followUpDate || null); }
    if (tags !== undefined)          { sets.push('tags = ?');           params.push(tags); }
    if (internalNotes !== undefined) { sets.push('internal_notes = ?'); params.push(internalNotes); }

    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(leadId);
    await db.query(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`, params);

    await db.query('INSERT INTO lead_activity (lead_id, user_id, action, details) VALUES (?,?,?,?)',
      [leadId, req.user.id, 'lead_updated', `Updated: ${sets.map(s => s.split(' =')[0]).join(', ')}`]);

    res.json({ message: 'Lead updated' });
  } catch (err) {
    console.error('PATCH /leads/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Notes ────────────────────────────────────────────────

// POST /api/leads/:id/notes — add a note
router.post('/:id/notes', authenticate, async (req, res) => {
  const { content, noteType, isPinned } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });
  try {
    const [result] = await db.query(
      'INSERT INTO lead_notes (lead_id, user_id, note_type, content, is_pinned) VALUES (?,?,?,?,?)',
      [req.params.id, req.user.id, noteType || 'note', content, !!isPinned]
    );
    await db.query('INSERT INTO lead_activity (lead_id, user_id, action, details) VALUES (?,?,?,?)',
      [req.params.id, req.user.id, 'note_added', `Added ${noteType || 'note'}: ${content.substring(0, 80)}`]);

    const [note] = await db.query(
      `SELECT n.*, u.first_name, u.last_name, u.role as user_role
       FROM lead_notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.id = ?`, [result.insertId]);
    res.status(201).json(note[0]);
  } catch (err) {
    console.error('POST note error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/leads/:leadId/notes/:noteId — update a note
router.put('/:leadId/notes/:noteId', authenticate, async (req, res) => {
  const { content, isPinned } = req.body;
  try {
    const sets = []; const params = [];
    if (content !== undefined)  { sets.push('content = ?');   params.push(content); }
    if (isPinned !== undefined) { sets.push('is_pinned = ?'); params.push(!!isPinned); }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    params.push(req.params.noteId, req.params.leadId);
    await db.query(`UPDATE lead_notes SET ${sets.join(', ')} WHERE id = ? AND lead_id = ?`, params);
    res.json({ message: 'Note updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/leads/:leadId/notes/:noteId
router.delete('/:leadId/notes/:noteId', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM lead_notes WHERE id = ? AND lead_id = ?', [req.params.noteId, req.params.leadId]);
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leads/:id/activity
router.get('/:id/activity', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, u.first_name, u.last_name
       FROM lead_activity a LEFT JOIN users u ON a.user_id = u.id
       WHERE a.lead_id = ? ORDER BY a.created_at DESC LIMIT 100`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
