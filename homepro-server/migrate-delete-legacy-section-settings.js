/**
 * Delete legacy section2–7 settings from the settings table.
 * Content is now managed via homepage_sections (Content sections). Run: node migrate-delete-legacy-section-settings.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const LEGACY_KEYS = [
  'show_section2', 'show_section3', 'show_section4', 'show_section5', 'show_section6', 'show_section7',
  'section2_headline', 'section2_body',
  'section3_headline', 'section3_steps',
  'section4_headline', 'section4_body', 'section4_list',
  'section5_headline', 'section5_body', 'section5_list',
  'section6_headline', 'section6_body', 'section6_list',
  'section7_headline', 'section7_body', 'section7_list',
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'homepro',
  });

  const placeholders = LEGACY_KEYS.map(() => '?').join(', ');
  const [result] = await conn.query(
    `DELETE FROM settings WHERE setting_key IN (${placeholders})`,
    LEGACY_KEYS
  );
  console.log('Deleted %s legacy section setting row(s).', result.affectedRows);
  await conn.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
