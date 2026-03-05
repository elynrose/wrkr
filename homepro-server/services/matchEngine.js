const crypto = require('crypto');
const db = require('../db');
const { sendSMS, isConfigured: smsConfigured, getMatchConfig } = require('./sms');
const { deductCredits } = require('./credits');
const { sendLeadMatchEmail, getSmsTemplate, renderTemplate } = require('./email');

const MAX_CLAIMS = 1;

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function getClaimUrl(token) {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${base}/#claim/${token}`;
}

/**
 * Score a pro for a given lead. Higher is better.
 *
 * Factors:
 *  - ZIP match (exact = 40pts)
 *  - Service match (exact = 30pts)
 *  - Rating (0-10pts scaled from avg_rating)
 *  - Reviews count (0-5pts, capped at 50 reviews)
 *  - Jobs completed (0-5pts, capped at 100 jobs)
 *  - Verification bonus (+5pts)
 *  - Background check bonus (+3pts)
 *  - Response rate (0-5pts)
 *  - Has credits available (+2pts)
 */
function scorePro(pro, lead) {
  let score = 0;

  if (pro.matchedZips?.includes(lead.zip)) score += 40;
  if (pro.matchedServiceIds?.includes(lead.service_id)) score += 30;

  score += Math.min((parseFloat(pro.avg_rating) || 0) * 2, 10);
  score += Math.min((pro.total_reviews || 0) / 10, 5);
  score += Math.min((pro.total_jobs || 0) / 20, 5);

  if (pro.is_verified) score += 5;
  if (pro.is_background_checked) score += 3;

  score += Math.min((parseFloat(pro.response_rate) || 0) / 20, 5);

  const hasCredits = pro.subscription_plan === 'enterprise' || (pro.lead_credits || 0) > 0;
  if (hasCredits) score += 2;

  return Math.round(score * 100) / 100;
}

/**
 * Find matching pros for a lead, score/rank them, and notify top N via SMS.
 * Returns the created lead_matches records.
 */
async function matchAndNotify(leadId) {
  const { notifyCount: MAX_NOTIFY, expiryHours: MATCH_EXPIRY_HOURS } = await getMatchConfig();

  const [leadRows] = await db.query('SELECT * FROM leads WHERE id = ?', [leadId]);
  if (!leadRows.length) throw new Error(`Lead ${leadId} not found`);
  const lead = leadRows[0];

  // Find all pros whose service areas include this lead's ZIP AND who offer this service
  const [candidateRows] = await db.query(`
    SELECT DISTINCT p.*,
      u.phone AS user_phone, u.email AS user_email, u.first_name, u.last_name,
      GROUP_CONCAT(DISTINCT psa.zip_code) AS zip_list,
      GROUP_CONCAT(DISTINCT ps.service_id) AS service_id_list
    FROM pros p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN pro_service_areas psa ON psa.pro_id = p.id
    LEFT JOIN pro_services ps ON ps.pro_id = p.id
    WHERE p.sms_opt_in = TRUE
      AND (p.subscription_status IN ('active', 'trialing', 'none'))
      AND (p.subscription_plan = 'enterprise' OR p.lead_credits > 0)
      AND (
        psa.zip_code = ?
        ${lead.service_id ? 'OR ps.service_id = ?' : ''}
      )
    GROUP BY p.id
  `, lead.service_id ? [lead.zip, lead.service_id] : [lead.zip]);

  if (!candidateRows.length) {
    console.log(`[MATCH] No matching pros found for lead #${leadId} (ZIP: ${lead.zip})`);
    await db.query('INSERT INTO lead_activity (lead_id, action, details) VALUES (?,?,?)',
      [leadId, 'match_attempted', 'No matching pros found in service area']);
    return [];
  }

  // Enrich with parsed arrays and score
  const scored = candidateRows.map(pro => {
    pro.matchedZips = pro.zip_list ? pro.zip_list.split(',') : [];
    pro.matchedServiceIds = pro.service_id_list
      ? pro.service_id_list.split(',').map(Number)
      : [];
    pro.matchScore = scorePro(pro, lead);
    return pro;
  });

  // Sort descending by score, take top N
  scored.sort((a, b) => b.matchScore - a.matchScore);
  const topPros = scored.slice(0, MAX_NOTIFY);

  // Check which pros are already matched to this lead
  const [existingMatches] = await db.query(
    'SELECT pro_id FROM lead_matches WHERE lead_id = ?', [leadId]
  );
  const alreadyMatched = new Set(existingMatches.map(m => m.pro_id));

  const expiresAt = new Date(Date.now() + MATCH_EXPIRY_HOURS * 3600 * 1000);
  const results = [];
  let rank = 1;

  for (const pro of topPros) {
    if (alreadyMatched.has(pro.id)) continue;

    const token = generateToken();
    const phone = pro.sms_phone || pro.phone || pro.user_phone;

    try {
      await db.query(
        `INSERT INTO lead_matches
          (lead_id, pro_id, user_id, match_score, match_rank, claim_token, expires_at)
         VALUES (?,?,?,?,?,?,?)`,
        [leadId, pro.id, pro.user_id, pro.matchScore, rank, token, expiresAt]
      );

      // Send SMS if phone is available
      if (phone) {
        const urgencyLabel = {
          within_24h: 'URGENT',
          this_week: 'This Week',
          this_month: 'This Month',
          flexible: '',
        }[lead.urgency] || '';

        let smsBody;
        const smsTmpl = await getSmsTemplate('sms_lead_match');
        if (smsTmpl) {
          smsBody = renderTemplate(smsTmpl.body, {
            serviceName: lead.service_name || 'Service',
            zip: lead.zip || '',
            urgencyLabel,
            description: lead.description ? lead.description.substring(0, 80) : 'Customer needs help',
            claimUrl: getClaimUrl(token),
            maxClaims: String(MAX_CLAIMS),
            expiryHours: String(MATCH_EXPIRY_HOURS),
          });
        } else {
          smsBody =
            `New ${lead.service_name} lead in ${lead.zip}!` +
            (urgencyLabel ? ` [${urgencyLabel}]` : '') +
            `\n${lead.description ? lead.description.substring(0, 80) : 'Customer needs help'}` +
            `\n\nClaim this lead: ${getClaimUrl(token)}` +
            `\n\nFirst to respond gets exclusive access. Expires in ${MATCH_EXPIRY_HOURS}h.` +
            `\nReply STOP to opt out.`;
        }

        const smsResult = await sendSMS(phone, smsBody);

        await db.query(
          `UPDATE lead_matches SET sms_sent = TRUE, sms_sent_at = NOW(), sms_sid = ?, status = 'notified'
           WHERE lead_id = ? AND pro_id = ?`,
          [smsResult.sid, leadId, pro.id]
        );
      }

      // Also send email notification
      const proEmail = pro.user_email;
      if (proEmail) {
        sendLeadMatchEmail(proEmail, lead, {
          token, score: pro.matchScore, claimUrl: getClaimUrl(token),
          expiryHours: MATCH_EXPIRY_HOURS, maxClaims: MAX_CLAIMS,
        }).catch(err => console.error(`[EMAIL] Match email to pro #${pro.id} failed:`, err.message));
      }

      results.push({
        proId: pro.id,
        businessName: pro.business_name,
        score: pro.matchScore,
        rank,
        token,
        smsSent: !!phone,
      });

      rank++;
    } catch (err) {
      console.error(`[MATCH] Error matching pro ${pro.id} to lead ${leadId}:`, err.message);
    }
  }

  // Log activity
  await db.query('INSERT INTO lead_activity (lead_id, action, details) VALUES (?,?,?)',
    [leadId, 'pros_matched', `Matched ${results.length} pros (${results.filter(r => r.smsSent).length} notified via SMS)`]);

  // Update lead status to matching
  await db.query("UPDATE leads SET status = 'matching' WHERE id = ? AND status = 'new'", [leadId]);

  console.log(`[MATCH] Lead #${leadId}: Matched ${results.length} pros, ${results.filter(r => r.smsSent).length} SMS sent`);
  return results;
}

/**
 * Process a claim token — validate, check expiry, check max claims, and claim the lead.
 */
async function claimByToken(token) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [matches] = await conn.query(
      `SELECT lm.*, l.service_name, l.customer_name, l.description, l.zip, l.city_name,
              l.phone AS customer_phone, l.email AS customer_email, l.urgency,
              l.budget_min, l.budget_max, l.property_type, l.claim_count, l.max_claims,
              l.lead_value, l.status AS lead_status,
              p.business_name, p.lead_credits, p.subscription_plan,
              u.first_name, u.last_name, u.email AS pro_email
       FROM lead_matches lm
       JOIN leads l ON lm.lead_id = l.id
       JOIN pros p ON lm.pro_id = p.id
       JOIN users u ON lm.user_id = u.id
       WHERE lm.claim_token = ?
       FOR UPDATE`,
      [token]
    );

    if (!matches.length) {
      await conn.rollback();
      return { error: 'Invalid or expired link', code: 404 };
    }

    const match = matches[0];

    // Mark as viewed
    if (match.status === 'notified' || match.status === 'pending') {
      await conn.query("UPDATE lead_matches SET status = 'viewed', viewed_at = NOW() WHERE id = ?", [match.id]);
    }

    // Already accepted
    if (match.status === 'accepted') {
      await conn.rollback();
      return { error: 'You have already claimed this lead', code: 409, alreadyClaimed: true, match };
    }

    // Expired
    if (match.expires_at && new Date(match.expires_at) < new Date()) {
      await conn.query("UPDATE lead_matches SET status = 'expired' WHERE id = ?", [match.id]);
      await conn.commit();
      return { error: 'This link has expired', code: 410 };
    }

    // Lead full
    if (match.claim_count >= match.max_claims || match.claim_count >= MAX_CLAIMS) {
      await conn.query("UPDATE lead_matches SET status = 'expired' WHERE id = ?", [match.id]);
      await conn.commit();
      return { error: 'This lead has already been claimed by the maximum number of pros', code: 409 };
    }

    // Check credits
    if (match.subscription_plan !== 'enterprise' && (match.lead_credits || 0) <= 0) {
      await conn.rollback();
      return { error: 'No lead credits remaining. Please upgrade your plan.', code: 402 };
    }

    // Return match info for the claim page to show (not auto-claim — pro decides)
    await conn.commit();
    return {
      success: true,
      match: {
        id: match.id,
        leadId: match.lead_id,
        proId: match.pro_id,
        businessName: match.business_name,
        proFirstName: match.first_name,
        serviceName: match.service_name,
        description: match.description,
        zip: match.zip,
        cityName: match.city_name,
        urgency: match.urgency,
        budgetMin: match.budget_min,
        budgetMax: match.budget_max,
        propertyType: match.property_type,
        claimCount: match.claim_count,
        maxClaims: Math.min(match.max_claims, MAX_CLAIMS),
        leadValue: match.lead_value,
        expiresAt: match.expires_at,
        matchScore: match.match_score,
        status: match.status === 'accepted' ? 'accepted' : 'viewed',
      },
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Confirm the claim — actually claim the lead and deduct credits.
 */
async function confirmClaim(token) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [matches] = await conn.query(
      `SELECT lm.*, l.claim_count, l.max_claims, l.lead_value, l.status AS lead_status,
              p.lead_credits, p.subscription_plan, p.business_name, p.id AS pid
       FROM lead_matches lm
       JOIN leads l ON lm.lead_id = l.id
       JOIN pros p ON lm.pro_id = p.id
       WHERE lm.claim_token = ?
       FOR UPDATE`,
      [token]
    );

    if (!matches.length) {
      await conn.rollback();
      return { error: 'Invalid link', code: 404 };
    }

    const m = matches[0];

    if (m.status === 'accepted') {
      await conn.rollback();
      return { error: 'Already claimed', code: 409 };
    }

    if (m.expires_at && new Date(m.expires_at) < new Date()) {
      await conn.query("UPDATE lead_matches SET status = 'expired' WHERE id = ?", [m.id]);
      await conn.commit();
      return { error: 'Link expired', code: 410 };
    }

    if (m.claim_count >= Math.min(m.max_claims, MAX_CLAIMS)) {
      await conn.query("UPDATE lead_matches SET status = 'expired' WHERE id = ?", [m.id]);
      await conn.commit();
      return { error: 'Lead fully claimed', code: 409 };
    }

    if (m.subscription_plan !== 'enterprise' && (m.lead_credits || 0) <= 0) {
      await conn.rollback();
      return { error: 'No lead credits', code: 402 };
    }

    // Create claim record
    await conn.query('INSERT INTO lead_claims (lead_id, pro_id, price_paid) VALUES (?,?,?)',
      [m.lead_id, m.pid, m.lead_value]);

    // Update lead — single claim model: mark as matched, record who claimed
    await conn.query(
      `UPDATE leads SET claim_count = 1, max_claims = 1, is_claimed = TRUE,
              status = 'matched', claimed_by_pro_id = ?, claimed_by_business = ?,
              follow_up_status = 'pending',
              follow_up_next_at = DATE_ADD(NOW(), INTERVAL (SELECT COALESCE((SELECT setting_value FROM settings WHERE setting_key='followup_delay_hours'),24)) HOUR)
       WHERE id = ?`,
      [m.pid, m.business_name, m.lead_id]
    );

    // Deduct credit via credit service
    await deductCredits(
      m.pid, m.user_id, 1, 'lead_claim',
      `Claimed lead #${m.lead_id} via SMS link`,
      String(m.lead_id), 'lead_match', conn
    );

    // Update match status
    await conn.query("UPDATE lead_matches SET status = 'accepted', responded_at = NOW() WHERE id = ?", [m.id]);

    // Expire ALL other pending matches for this lead (single-claim)
    await conn.query(
      "UPDATE lead_matches SET status = 'expired' WHERE lead_id = ? AND id != ? AND status IN ('pending','notified','viewed')",
      [m.lead_id, m.id]
    );

    // Activity log
    await conn.query('INSERT INTO lead_activity (lead_id, user_id, action, details) VALUES (?,?,?,?)',
      [m.lead_id, m.user_id, 'lead_claimed', `Claimed by ${m.business_name} (exclusive)`]);

    await conn.query('INSERT INTO lead_activity (lead_id, action, details) VALUES (?,?,?)',
      [m.lead_id, 'other_matches_expired', 'All other matches expired — single-claim lead']);

    await conn.commit();
    return { success: true, message: 'Lead claimed successfully! You are the exclusive provider for this lead.' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Decline a match.
 */
async function declineMatch(token) {
  const [result] = await db.query(
    "UPDATE lead_matches SET status = 'declined', responded_at = NOW() WHERE claim_token = ? AND status IN ('pending','notified','viewed')",
    [token]
  );
  return result.affectedRows > 0;
}

module.exports = { matchAndNotify, claimByToken, confirmClaim, declineMatch, scorePro };
