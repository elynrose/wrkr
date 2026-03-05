/**
 * Add Google Analytics settings (enable + measurement ID).
 * Run: node migrate-google-analytics.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'homepro',
  });
  try {
    await conn.query(`
      ALTER TABLE settings
      MODIFY COLUMN setting_group ENUM('general','stripe','twilio','homepage','seo','email','appearance','advanced','analytics') DEFAULT 'general'
    `);
  } catch (err) {
    if (err.code !== 'ER_DUP_ENTRY' && !err.message?.includes('duplicate')) console.warn('ALTER enum:', err.message);
  }
  try {
    await conn.query(`
      INSERT IGNORE INTO settings (setting_key, setting_value, setting_type, setting_group, label, description, is_public, sort_order) VALUES
      ('google_analytics_enabled', 'false', 'boolean', 'analytics', 'Enable Google Analytics', 'Track page views and events with Google Analytics 4 (GA4)', TRUE, 1),
      ('google_analytics_measurement_id', '', 'string', 'analytics', 'Measurement ID', 'Your GA4 Measurement ID (e.g. G-XXXXXXXXXX)', TRUE, 2)
    `);
    console.log('Google Analytics settings added.');
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    await conn.end();
  }
}

run().catch((e) => { process.exit(1); });
