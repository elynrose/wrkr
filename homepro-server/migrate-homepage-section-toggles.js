/**
 * Add homepage section visibility settings for all tenants.
 * Admins can turn sections on/off in Settings → Homepage.
 * Run: node migrate-homepage-section-toggles.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const SECTION_SETTINGS = [
  [1, 'show_hero', 'true', 'Show Hero section', 'Display the hero banner on the homepage'],
  [2, 'show_section2', 'true', 'Show Section 2 (What This Is)', 'A Smarter Way to Build a Local Service Business'],
  [3, 'show_section3', 'true', 'Show Section 3 (How the Business Works)', '4-step explanation'],
  [4, 'show_section4', 'true', 'Show Section 4 (We Help You Launch)', 'Included support list'],
  [5, 'show_section5', 'true', 'Show Section 5 (Generate Leads)', 'Advertising / lead gen guidance'],
  [6, 'show_section6', 'true', 'Show Section 6 (Why Providers Join)', 'Provider benefits'],
  [7, 'show_section7', 'true', 'Show Section 7 (Why This Model Works)', 'Business model advantages'],
  [8, 'show_service_categories', 'true', 'Show Service Categories', 'Popular services grid on homepage'],
  [9, 'show_how_it_works', 'true', 'Show How It Works', 'Consumer steps + For Pros CTA'],
  [10, 'show_recent_reviews', 'true', 'Show Recent Reviews', 'Review highlights on homepage'],
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'homepro',
  });

  const [tenants] = await conn.query('SELECT id FROM tenants');
  console.log('Adding homepage section toggles for %s tenant(s)...', tenants.length);

  for (const t of tenants) {
    const tid = t.id;
    for (const [sortOrder, key, value, label, description] of SECTION_SETTINGS) {
      await conn.query(
        `INSERT INTO settings (tenant_id, setting_key, setting_value, setting_type, setting_group, label, description, is_public, sort_order)
         VALUES (?, ?, ?, 'boolean', 'homepage', ?, ?, TRUE, ?)
         ON DUPLICATE KEY UPDATE label = VALUES(label), description = VALUES(description), sort_order = VALUES(sort_order)`,
        [tid, key, value, label, description, sortOrder]
      );
    }
    console.log('  tenant_id=%s', tid);
  }

  await conn.end();
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
