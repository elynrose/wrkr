/**
 * Add openai_api_key setting for tenant 1 (Super Admin configures it).
 * Run: node migrate-openai-api-key.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'homepro',
  });
  await conn.query(
    `INSERT INTO settings (tenant_id, setting_key, setting_value, setting_type, setting_group, label, description, is_public, sort_order)
     VALUES (1, 'openai_api_key', '', 'secret', 'advanced', 'OpenAI API Key', 'For AI Setup Assistant. Leave empty to use OPENAI_API_KEY in .env. Only Super Admin can edit.', FALSE, 0)
     ON DUPLICATE KEY UPDATE label = VALUES(label), description = VALUES(description)`
  );
  console.log('openai_api_key setting added for tenant 1.');
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
