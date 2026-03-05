require('dotenv').config();
const db = require('./db');

(async () => {
  try {
    console.log('=== Review System Migration ===');

    // Add google_review_url to pros
    try {
      await db.query(`ALTER TABLE pros ADD COLUMN google_review_url VARCHAR(500) NULL AFTER insurance_info`);
      console.log('+ Added google_review_url to pros');
    } catch (e) { if (e.code === 'ER_DUP_FIELDNAME') console.log('  google_review_url already exists'); else throw e; }

    // Add review_token and review_sent to leads
    try {
      await db.query(`ALTER TABLE leads ADD COLUMN review_token VARCHAR(64) NULL AFTER sms_opt_out`);
      console.log('+ Added review_token to leads');
    } catch (e) { if (e.code === 'ER_DUP_FIELDNAME') console.log('  review_token already exists'); else throw e; }

    try {
      await db.query(`ALTER TABLE leads ADD COLUMN review_sent BOOLEAN DEFAULT FALSE AFTER review_token`);
      console.log('+ Added review_sent to leads');
    } catch (e) { if (e.code === 'ER_DUP_FIELDNAME') console.log('  review_sent already exists'); else throw e; }

    try {
      await db.query(`ALTER TABLE leads ADD COLUMN review_submitted BOOLEAN DEFAULT FALSE AFTER review_sent`);
      console.log('+ Added review_submitted to leads');
    } catch (e) { if (e.code === 'ER_DUP_FIELDNAME') console.log('  review_submitted already exists'); else throw e; }

    // Add review_token index
    try {
      await db.query(`ALTER TABLE leads ADD INDEX idx_review_token (review_token)`);
      console.log('+ Added index on review_token');
    } catch (e) { if (e.code === 'ER_DUP_KEYNAME') console.log('  index already exists'); else throw e; }

    // Insert SMS template for review request
    await db.query(`INSERT IGNORE INTO notification_templates (slug, name, channel, subject, body, description, variables, is_active) VALUES
      ('sms_review_request', 'Review Request SMS', 'sms', NULL,
       'Hi {{customer_name}}! Your {{service_name}} job with {{business_name}} is complete. We\\'d love your feedback! Leave a review: {{review_url}}',
       'Sent to customer when a lead is marked as completed, asking for a review.',
       'customer_name, service_name, business_name, review_url, site_name',
       TRUE)`);
    console.log('+ Inserted sms_review_request template');

    // Insert email template for review request
    await db.query(`INSERT IGNORE INTO notification_templates (slug, name, channel, subject, body, description, variables, is_active) VALUES
      ('email_review_request', 'Review Request Email', 'email',
       'How was your {{service_name}} experience?',
       '<h2>How was your experience?</h2><p>Hi {{customer_name}},</p><p>Your <strong>{{service_name}}</strong> job with <strong>{{business_name}}</strong> has been completed. We\\'d love to hear how it went!</p><p><a href="{{review_url}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Leave a Review</a></p><p>Your feedback helps other homeowners find great service professionals.</p><p>Thank you,<br>{{site_name}}</p>',
       'Sent to customer when a lead is marked as completed, asking for a review.',
       'customer_name, service_name, business_name, review_url, site_name',
       TRUE)`);
    console.log('+ Inserted email_review_request template');

    console.log('\n=== Migration complete ===');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
})();
