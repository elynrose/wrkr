require('dotenv').config();
const db = require('./db');

async function migrate() {
  const queries = [
    // Change max_claims default to 1 and update existing leads
    `ALTER TABLE leads MODIFY COLUMN max_claims INT DEFAULT 1`,
    `UPDATE leads SET max_claims = 1 WHERE max_claims > 1 AND claim_count = 0`,

    // Add follow-up tracking columns to leads
    `ALTER TABLE leads ADD COLUMN follow_up_count INT DEFAULT 0`,
    `ALTER TABLE leads ADD COLUMN follow_up_status ENUM('none','pending','sent','customer_yes','customer_no','stopped') DEFAULT 'none'`,
    `ALTER TABLE leads ADD COLUMN follow_up_last_sent_at TIMESTAMP NULL`,
    `ALTER TABLE leads ADD COLUMN follow_up_next_at TIMESTAMP NULL`,
    `ALTER TABLE leads ADD COLUMN sms_opt_out BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE leads ADD COLUMN claimed_by_pro_id INT NULL`,
    `ALTER TABLE leads ADD COLUMN claimed_by_business VARCHAR(200) NULL`,

    // Inbound SMS log table
    `CREATE TABLE IF NOT EXISTS sms_inbound (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      from_number VARCHAR(30) NOT NULL,
      to_number   VARCHAR(30),
      body        TEXT,
      lead_id     INT NULL,
      action_taken VARCHAR(60),
      twilio_sid  VARCHAR(80),
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_from (from_number),
      INDEX idx_lead (lead_id)
    )`,

    // Backfill claimed_by for existing claims
    `UPDATE leads l
     JOIN lead_claims lc ON lc.lead_id = l.id
     JOIN pros p ON lc.pro_id = p.id
     SET l.claimed_by_pro_id = p.id, l.claimed_by_business = p.business_name
     WHERE l.claimed_by_pro_id IS NULL AND l.claim_count > 0`,
  ];

  for (const sql of queries) {
    try {
      await db.query(sql);
      console.log('OK:', sql.substring(0, 80) + '...');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
        console.log('SKIP (already exists):', sql.substring(0, 60));
      } else if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('SKIP (table exists):', sql.substring(0, 60));
      } else {
        console.error('ERR:', err.message, '—', sql.substring(0, 80));
      }
    }
  }

  // Add follow-up settings
  const settings = [
    ['followup_delay_hours', '24', 'number', 'twilio', 'Follow-up Delay (hours)', 'Hours after claim before sending follow-up to customer', 1, 7],
    ['followup_max_attempts', '3', 'number', 'twilio', 'Max Follow-ups', 'Maximum follow-up SMS to send per lead', 1, 8],
    ['followup_repeat_hours', '48', 'number', 'twilio', 'Re-send Interval (hours)', 'Hours between follow-up SMS attempts', 1, 9],
  ];

  for (const [key, val, type, group, label, desc, isPublic, order] of settings) {
    try {
      await db.query(
        `INSERT IGNORE INTO settings (setting_key, setting_value, setting_type, setting_group, label, description, is_public, sort_order)
         VALUES (?,?,?,?,?,?,?,?)`,
        [key, val, type, group, label, desc, isPublic, order]
      );
    } catch (err) {
      console.log('Setting skip:', key);
    }
  }

  console.log('\nMigration complete.');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
