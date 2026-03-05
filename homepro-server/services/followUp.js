const db = require('../db');
const { sendSMS, isConfigured } = require('./sms');
const { matchAndNotify } = require('./matchEngine');
const { getSmsTemplate, renderTemplate } = require('./email');
const { getSiteConfig } = require('./siteConfig');

async function getFollowUpConfig() {
  const [rows] = await db.query(
    "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('followup_delay_hours','followup_max_attempts','followup_repeat_hours')"
  );
  const cfg = {};
  for (const r of rows) cfg[r.setting_key] = r.setting_value;
  return {
    delayHours: parseInt(cfg.followup_delay_hours) || 24,
    maxAttempts: parseInt(cfg.followup_max_attempts) || 3,
    repeatHours: parseInt(cfg.followup_repeat_hours) || 48,
  };
}

/**
 * Send follow-up SMS to customer asking if they got help.
 * Called by a scheduled job or manually.
 */
async function processFollowUps() {
  const configured = await isConfigured();
  if (!configured) return { processed: 0, reason: 'SMS not configured' };

  const config = await getFollowUpConfig();
  const site = await getSiteConfig();

  const [leads] = await db.query(
    `SELECT l.id, l.customer_name, l.phone, l.email, l.service_name, l.zip,
            l.follow_up_count, l.claimed_by_business, l.claimed_by_pro_id
     FROM leads l
     WHERE l.follow_up_status IN ('pending','sent')
       AND l.sms_opt_out = FALSE
       AND l.phone IS NOT NULL AND l.phone != ''
       AND l.follow_up_next_at IS NOT NULL AND l.follow_up_next_at <= NOW()
       AND l.follow_up_count < ?
       AND l.is_claimed = TRUE
     ORDER BY l.follow_up_next_at ASC
     LIMIT 50`,
    [config.maxAttempts]
  );

  let processed = 0;
  for (const lead of leads) {
    try {
      let smsBody;
      const tmpl = await getSmsTemplate('sms_followup_customer');
      if (tmpl) {
        smsBody = renderTemplate(tmpl.body, {
          customerName: lead.customer_name || 'there',
          serviceName: lead.service_name || 'your service request',
          businessName: lead.claimed_by_business || 'a provider',
          siteName: site.site_name,
        });
      } else {
        smsBody =
          `Hi ${lead.customer_name || 'there'}! This is ${site.site_name}. ` +
          `Did you get help with your ${lead.service_name || 'service request'} from ${lead.claimed_by_business || 'the provider'}?\n\n` +
          `Reply YES if you got help, NO if you still need assistance, or STOP to opt out of messages.`;
      }

      const result = await sendSMS(lead.phone, smsBody);

      await db.query(
        `UPDATE leads SET
          follow_up_count = follow_up_count + 1,
          follow_up_status = 'sent',
          follow_up_last_sent_at = NOW(),
          follow_up_next_at = DATE_ADD(NOW(), INTERVAL ? HOUR)
         WHERE id = ?`,
        [config.repeatHours, lead.id]
      );

      await db.query(
        'INSERT INTO lead_activity (lead_id, action, details) VALUES (?,?,?)',
        [lead.id, 'followup_sent', `Follow-up #${lead.follow_up_count + 1} sent to ${lead.phone}`]
      );

      processed++;
    } catch (err) {
      console.error(`[FOLLOWUP] Lead #${lead.id} SMS failed:`, err.message);
    }
  }

  return { processed, total: leads.length };
}

/**
 * Handle inbound SMS reply from customer (YES / NO / STOP).
 */
async function handleInboundSMS(fromNumber, body, twilioSid) {
  const normalizedBody = (body || '').trim().toUpperCase();
  const cleanPhone = fromNumber.replace(/\D/g, '').slice(-10);

  // Find the most recent claimed lead for this phone number
  const [leads] = await db.query(
    `SELECT id, follow_up_status, claimed_by_pro_id, service_name, zip
     FROM leads
     WHERE REPLACE(REPLACE(REPLACE(phone, '-', ''), ' ', ''), '(', '') LIKE ?
       AND is_claimed = TRUE
     ORDER BY updated_at DESC LIMIT 1`,
    [`%${cleanPhone}`]
  );

  const leadId = leads.length ? leads[0].id : null;

  // Log inbound
  await db.query(
    'INSERT INTO sms_inbound (from_number, body, lead_id, action_taken, twilio_sid) VALUES (?,?,?,?,?)',
    [fromNumber, body, leadId, normalizedBody, twilioSid]
  );

  if (!leadId) {
    return { action: 'no_lead_found', reply: null };
  }

  const lead = leads[0];

  if (normalizedBody === 'STOP' || normalizedBody === 'UNSUBSCRIBE' || normalizedBody === 'QUIT') {
    await db.query(
      "UPDATE leads SET sms_opt_out = TRUE, follow_up_status = 'stopped' WHERE id = ?",
      [leadId]
    );
    await db.query(
      'INSERT INTO lead_activity (lead_id, action, details) VALUES (?,?,?)',
      [leadId, 'sms_opt_out', `Customer replied STOP from ${fromNumber}`]
    );
    const site = await getSiteConfig();
    return {
      action: 'stopped',
      reply: `You've been unsubscribed from ${site.site_name} SMS messages. You will not receive further texts about this request.`,
    };
  }

  if (normalizedBody === 'YES' || normalizedBody === 'Y' || normalizedBody.includes('GOT HELP') || normalizedBody.includes('ALL GOOD')) {
    await db.query(
      "UPDATE leads SET follow_up_status = 'customer_yes', status = 'hired' WHERE id = ?",
      [leadId]
    );
    await db.query(
      'INSERT INTO lead_activity (lead_id, action, details) VALUES (?,?,?)',
      [leadId, 'customer_confirmed', `Customer confirmed they got help (replied: ${body})`]
    );
    return {
      action: 'confirmed',
      reply: `Great! Glad you got the help you needed. Thank you for using our service!`,
    };
  }

  if (normalizedBody === 'NO' || normalizedBody === 'N' || normalizedBody.includes('STILL NEED') || normalizedBody.includes('NO HELP')) {
    await db.query(
      "UPDATE leads SET follow_up_status = 'customer_no', is_claimed = FALSE, claim_count = 0, claimed_by_pro_id = NULL, claimed_by_business = NULL, status = 'new' WHERE id = ?",
      [leadId]
    );
    await db.query(
      'INSERT INTO lead_activity (lead_id, action, details) VALUES (?,?,?)',
      [leadId, 'customer_needs_help', `Customer said NO — lead re-opened for matching (replied: ${body})`]
    );

    // Re-trigger matching
    setImmediate(async () => {
      try {
        const matches = await matchAndNotify(leadId);
        console.log(`[RE-MATCH] Lead #${leadId}: ${matches.length} new pros matched`);
      } catch (err) {
        console.error(`[RE-MATCH] Lead #${leadId} failed:`, err.message);
      }
    });

    return {
      action: 're_matched',
      reply: `We're sorry to hear that. We're sending your request to more providers now. You should hear from someone soon!`,
    };
  }

  // Unrecognized reply
  return {
    action: 'unknown',
    reply: `Thanks for your message. Reply YES if you got help, NO if you still need assistance, or STOP to opt out.`,
  };
}

module.exports = { processFollowUps, handleInboundSMS, getFollowUpConfig };
