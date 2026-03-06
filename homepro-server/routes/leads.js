const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate, requireRole, optionalAuth } = require('../middleware/auth');
const { matchAndNotify } = require('../services/matchEngine');
const { deductCredits } = require('../services/credits');
const { sendNewLeadEmail, sendLeadClaimedEmailToCustomer, sendLeadClaimedEmailToPro, getSmsTemplate, renderTemplate, sendTemplatedEmail } = require('../services/email');
const { spamProtect } = require('../middleware/spam');
const { sendSMS } = require('../services/sms');
const crypto = require('crypto');
const { getPublicSettings } = require('../services/siteConfig');

// POST /api/leads — consumer creates a lead
router.post('/', ...spamProtect({ keyPrefix: 'lead', rateLimitMax: 10, rateLimitSettingKey: 'spam_rate_limit_max_leads', minTimingMs: 3000, maxLinks: 3 }), optionalAuth, async (req, res) => {
  const { service, zip, city, description, urgency, name, email, phone, address, budgetMin, budgetMax, propertyType } = req.body;
  if (!email || !service) return res.status(400).json({ error: 'Service and email are required' });

  const tenantId = req.tenant?.id || 1;
  try {
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
        (tenant_id, user_id, service_id, service_name, customer_name, email, phone, zip, city_id, city_name, address, description, urgency, budget_min, budget_max, property_type, lead_value)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [tenantId, req.user?.id || null, serviceId, service, name, email, phone, zip, cityId, city, address, description, dbUrgency, budgetMin, budgetMax, propertyType || 'residential', serviceId ? 25.00 : 15.00]
    );

    // Log activity
    await db.query('INSERT INTO lead_activity (tenant_id, lead_id, user_id, action, details) VALUES (?,?,?,?,?)',
      [tenantId, result.insertId, req.user?.id || null, 'lead_created', `Lead submitted via website for ${service}`]);

    // Send confirmation email to customer
    const newLeadId = result.insertId;
    setImmediate(() => {
      sendNewLeadEmail({ service_name: service, customer_name: name, email, zip, urgency: dbUrgency, description }, tenantId)
        .catch(err => console.error('[EMAIL] Lead confirmation failed:', err.message));
    });

    // Trigger dynamic matching asynchronously (don't block the response)
    setImmediate(async () => {
      try {
        const matches = await matchAndNotify(newLeadId, tenantId);
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

// GET /api/leads — list leads (admin only), paginated
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  const tid = req.tenant?.id || 1;
  const isSuperAdmin = req.user?.role === 'superadmin';
  try {
    const { zip, city, service_id, status, source, priority, limit = 25, page = 1, tenantId } = req.query;
    const limitNum = Math.min(parseInt(limit) || 25, 100);
    const pageNum = Math.max(1, parseInt(page) || 1);
    const offset = (pageNum - 1) * limitNum;

    const baseWhere = [];
    const params = [];
    if (isSuperAdmin && tenantId) {
      baseWhere.push('l.tenant_id = ?'); params.push(parseInt(tenantId));
    } else if (!isSuperAdmin) {
      baseWhere.push('l.tenant_id = ?'); params.push(tid);
    }
    if (zip)        { baseWhere.push('l.zip = ?');          params.push(zip); }
    if (city)       { baseWhere.push('l.city_name LIKE ?');  params.push(`%${city}%`); }
    if (service_id) { baseWhere.push('l.service_id = ?');   params.push(service_id); }
    if (status)     { baseWhere.push('l.status = ?');       params.push(status); }
    if (source)     { baseWhere.push('l.source = ?');       params.push(source); }
    if (priority)   { baseWhere.push('l.priority = ?');     params.push(priority); }
    const whereClause = baseWhere.length ? ' AND ' + baseWhere.join(' AND ') : '';

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM leads l WHERE 1=1${whereClause}`,
      params
    );

    const [rows] = await db.query(
      `SELECT l.*, l.claimed_by_business, l.claimed_by_pro_id, l.follow_up_status, l.follow_up_count, l.sms_opt_out
       FROM leads l WHERE 1=1${whereClause} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ leads: rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('GET /leads error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leads/mine — current user's leads, paginated
router.get('/mine', authenticate, async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const { page = 1, limit = 10 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 10, 50);
    const pageNum = Math.max(1, parseInt(page) || 1);
    const offset = (pageNum - 1) * limitNum;

    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM leads WHERE (user_id = ? OR email = ?) AND tenant_id = ?',
      [req.user.id, req.user.email, tid]
    );
    const [rows] = await db.query(
      'SELECT * FROM leads WHERE (user_id = ? OR email = ?) AND tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.user.id, req.user.email, tid, limitNum, offset]
    );
    res.json({ leads: rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('GET /leads/mine error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leads/:id — full lead detail with claims, notes, activity (authenticated)
router.get('/:id', authenticate, async (req, res) => {
  const tid = req.tenant?.id || 1;
  try {
    const [rows] = await db.query('SELECT * FROM leads WHERE id = ? AND tenant_id = ?', [req.params.id, tid]);
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
  const tid = req.tenant?.id || 1;
  try {
    const proId = req.params.proId;
    const [areas] = await db.query('SELECT zip_code, city_id FROM pro_service_areas WHERE pro_id = ?', [proId]);
    const [proSvcs] = await db.query('SELECT service_id FROM pro_services WHERE pro_id = ?', [proId]);

    const zips = areas.map(a => a.zip_code).filter(Boolean);
    const serviceIds = proSvcs.map(s => s.service_id);
    if (!zips.length && !serviceIds.length) return res.json([]);

    let query = "SELECT * FROM leads WHERE status IN ('new','matching') AND tenant_id = ?";
    const params = [tid];

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
  const tid = req.tenant?.id || 1;
  try {
    await conn.beginTransaction();

    const [leads] = await conn.query('SELECT * FROM leads WHERE id = ? AND tenant_id = ? FOR UPDATE', [leadId, tid]);
    if (!leads.length) { await conn.rollback(); return res.status(404).json({ error: 'Lead not found' }); }

    const lead = leads[0];
    if (lead.claim_count >= 1 || lead.is_claimed) {
      await conn.rollback();
      return res.status(409).json({ error: 'This lead has already been claimed by another provider' });
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
    await conn.query(
      `UPDATE leads SET claim_count = 1, is_claimed = TRUE, status = 'matched',
              claimed_by_pro_id = ?, claimed_by_business = ?,
              follow_up_status = 'pending',
              follow_up_next_at = DATE_ADD(NOW(), INTERVAL (SELECT COALESCE((SELECT setting_value FROM settings WHERE setting_key='followup_delay_hours'),24)) HOUR)
       WHERE id = ?`,
      [pro.id, pro.business_name, leadId]
    );

    // Expire other matches
    await conn.query(
      "UPDATE lead_matches SET status = 'expired' WHERE lead_id = ? AND status IN ('pending','notified','viewed')",
      [leadId]
    );

    await deductCredits(
      pro.id, req.user.id, 1, 'lead_claim',
      `Claimed lead #${leadId} (${lead.service_name || 'Service'})`,
      String(leadId), 'lead', conn
    );

    await conn.query('INSERT INTO lead_activity (lead_id, user_id, action, details) VALUES (?,?,?,?)',
      [leadId, req.user.id, 'lead_claimed', `Claimed exclusively by ${pro.business_name}`]);

    await conn.commit();

    setImmediate(() => {
      sendLeadClaimedEmailToCustomer(lead, pro, tid)
        .catch(err => console.error('[EMAIL] Claim email to customer failed:', err.message));
      sendLeadClaimedEmailToPro(req.user.email || pro.phone, lead, pro, tid)
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
  const tid = req.tenant?.id || 1;
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

    const [old] = await db.query('SELECT status FROM leads WHERE id = ? AND tenant_id = ?', [leadId, tid]);
    if (!old.length) return res.status(404).json({ error: 'Lead not found' });

    await db.query('UPDATE leads SET status = ? WHERE id = ? AND tenant_id = ?', [status, leadId, tid]);

    const oldStatus = old[0].status;
    await db.query('INSERT INTO lead_notes (lead_id, user_id, note_type, content) VALUES (?,?,?,?)',
      [leadId, req.user.id, 'status_change', `Status changed from "${oldStatus}" to "${status}"`]);
    await db.query('INSERT INTO lead_activity (lead_id, user_id, action, details) VALUES (?,?,?,?)',
      [leadId, req.user.id, 'status_changed', `${oldStatus} → ${status}`]);

    // When job is marked completed, send review request to customer
    if (status === 'completed' && oldStatus !== 'completed') {
      setImmediate(async () => {
        try {
          const [leadRows] = await db.query(
            `SELECT l.*, p.business_name, p.google_review_url
             FROM leads l LEFT JOIN pros p ON l.claimed_by_pro_id = p.id WHERE l.id = ?`, [leadId]
          );
          const lead = leadRows[0];
          if (!lead || lead.review_sent || lead.review_submitted) return;

          const token = crypto.randomBytes(32).toString('hex');
          await db.query('UPDATE leads SET review_token = ?, review_sent = TRUE WHERE id = ?', [token, leadId]);

          const siteConfig = await getPublicSettings(lead.tenant_id || 1);
          const siteName = siteConfig.site_name || 'HomePro';
          const siteUrl = siteConfig.site_url || process.env.FRONTEND_URL || 'http://localhost:5173';
          const reviewUrl = `${siteUrl}/#review/${token}`;

          const vars = {
            customer_name: lead.customer_name || 'there',
            service_name: lead.service_name || 'your project',
            business_name: lead.claimed_by_business || lead.business_name || 'your provider',
            review_url: reviewUrl,
            site_name: siteName,
          };

          const leadTid = lead.tenant_id || 1;
          // Send SMS
          if (lead.phone && !lead.sms_opt_out) {
            const smsTmpl = await getSmsTemplate('sms_review_request', leadTid);
            const smsBody = smsTmpl
              ? renderTemplate(smsTmpl.body, vars)
              : `Hi ${vars.customer_name}! Your ${vars.service_name} job is complete. Leave a review: ${reviewUrl}`;
            sendSMS(lead.phone, smsBody, leadTid).catch(err => console.error('[SMS] Review request failed:', err.message));
          }

          // Send email
          if (lead.email) {
            sendTemplatedEmail('email_review_request', lead.email, vars, leadTid)
              .catch(err => console.error('[EMAIL] Review request failed:', err.message));
          }

          console.log(`[REVIEW] Sent review request for lead #${leadId} — token: ${token.slice(0, 8)}…`);
        } catch (err) {
          console.error('[REVIEW] Failed to send review request:', err.message);
        }
      });
    }

    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error('PATCH /leads/:id/status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/leads/:id — update lead fields. Admin: priority, assigned_to, tags, follow_up_date, internal_notes. Pro: description only (for claimed leads).
router.patch('/:id', authenticate, async (req, res) => {
  const leadId = req.params.id;
  const tid = req.tenant?.id || 1;
  const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

  const { priority, assignedTo, followUpDate, tags, internalNotes, description } = req.body;

  try {
    if (isAdmin) {
      const sets = []; const params = [];
      if (priority !== undefined)      { sets.push('priority = ?');       params.push(priority); }
      if (assignedTo !== undefined)    { sets.push('assigned_to = ?');    params.push(assignedTo || null); }
      if (followUpDate !== undefined)  { sets.push('follow_up_date = ?'); params.push(followUpDate || null); }
      if (tags !== undefined)          { sets.push('tags = ?');           params.push(tags); }
      if (internalNotes !== undefined) { sets.push('internal_notes = ?'); params.push(internalNotes); }
      if (description !== undefined)   { sets.push('description = ?');    params.push(description); }
      if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
      params.push(leadId, tid);
      await db.query(`UPDATE leads SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, params);
      await db.query('INSERT INTO lead_activity (lead_id, user_id, action, details) VALUES (?,?,?,?)',
        [leadId, req.user.id, 'lead_updated', `Updated: ${sets.map(s => s.split(' =')[0]).join(', ')}`]);
      return res.json({ message: 'Lead updated' });
    }

    // Pro: may only update description for leads they have claimed
    if (req.user.role === 'pro' && description !== undefined) {
      const [[pro]] = await db.query('SELECT id FROM pros WHERE user_id = ?', [req.user.id]);
      if (!pro) return res.status(403).json({ error: 'Pro profile not found' });
      const [rows] = await db.query(
        'SELECT id FROM leads WHERE id = ? AND tenant_id = ? AND claimed_by_pro_id = ?',
        [leadId, tid, pro.id]
      );
      if (!rows.length) return res.status(403).json({ error: 'You can only edit leads you have claimed' });
      await db.query('UPDATE leads SET description = ? WHERE id = ? AND tenant_id = ?', [description ?? '', leadId, tid]);
      await db.query('INSERT INTO lead_activity (lead_id, user_id, action, details) VALUES (?,?,?,?)',
        [leadId, req.user.id, 'lead_updated', 'Updated: description']);
      return res.json({ message: 'Lead updated' });
    }

    if (!isAdmin) return res.status(403).json({ error: 'Only admins can update lead fields' });
  } catch (err) {
    console.error('PATCH /leads/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/leads/:id/pro-notes — pro updates their claim notes (claimed leads only)
router.put('/:id/pro-notes', authenticate, requireRole('pro'), async (req, res) => {
  const leadId = req.params.id;
  const tid = req.tenant?.id || 1;
  const { notes } = req.body;
  try {
    const [[pro]] = await db.query('SELECT id FROM pros WHERE user_id = ?', [req.user.id]);
    if (!pro) return res.status(403).json({ error: 'Pro profile not found' });
    const [rows] = await db.query(
      'SELECT id FROM lead_claims WHERE lead_id = ? AND pro_id = ?',
      [leadId, pro.id]
    );
    if (!rows.length) return res.status(403).json({ error: 'You can only update notes for leads you have claimed' });
    await db.query('UPDATE lead_claims SET notes = ? WHERE lead_id = ? AND pro_id = ?', [notes ?? '', leadId, pro.id]);
    res.json({ message: 'Notes updated' });
  } catch (err) {
    console.error('PUT /leads/:id/pro-notes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Notes ────────────────────────────────────────────────

// POST /api/leads/:id/notes — add a note
router.post('/:id/notes', authenticate, async (req, res) => {
  const { content, noteType, isPinned } = req.body;
  const tid = req.tenant?.id || 1;
  if (!content) return res.status(400).json({ error: 'Content is required' });
  try {
    const [result] = await db.query(
      'INSERT INTO lead_notes (lead_id, user_id, note_type, content, is_pinned) VALUES (?,?,?,?,?)',
      [req.params.id, req.user.id, noteType || 'note', content, !!isPinned]
    );
    await db.query('INSERT INTO lead_activity (tenant_id, lead_id, user_id, action, details) VALUES (?,?,?,?,?)',
      [tid, req.params.id, req.user.id, 'note_added', `Added ${noteType || 'note'}: ${content.substring(0, 80)}`]);

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
