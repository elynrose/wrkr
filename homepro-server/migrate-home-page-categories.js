/**
 * Add home_page_category_ids setting so tenants can choose which categories
 * (and thus which services) appear on their public tenant home page.
 * Run: node migrate-home-page-categories.js
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
    const [tenants] = await conn.query('SELECT id FROM tenants WHERE status = ?', ['active']);
    for (const t of tenants) {
      await conn.query(
        `INSERT IGNORE INTO settings (tenant_id, setting_key, setting_value, setting_type, setting_group, label, description, is_public, sort_order)
         VALUES (?, 'home_page_category_ids', '[]', 'json', 'homepage', 'Categories on tenant home page', 'Category IDs to show on the tenant public home page (empty = show all)', TRUE, 8)`,
        [t.id]
      );
    }
    console.log('home_page_category_ids setting added for', tenants.length, 'tenant(s).');
  } finally {
    await conn.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
