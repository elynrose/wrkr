#!/usr/bin/env node
/**
 * Configure tenant 1 for MailHog (local Docker email testing).
 * Run: node scripts/setup-mailhog.js
 *
 * Then start MailHog: docker compose -f docker-compose.mail.yml up -d
 * And test: node scripts/test-email.js
 */
require('dotenv').config();
const db = require('../db');

const settings = [
  ['email_enabled', 'true', 'boolean'],
  ['smtp_host', 'localhost', 'string'],
  ['smtp_port', '1025', 'number'],
  ['smtp_secure', 'false', 'boolean'],
  ['smtp_user', '', 'string'],
  ['smtp_password', '', 'secret'],
];

async function main() {
  const [tenants] = await db.query('SELECT id FROM tenants');
  for (const { id: tid } of tenants) {
    for (const [key, value, type] of settings) {
      await db.query(
        `INSERT INTO settings (tenant_id, setting_key, setting_value, setting_type, setting_group, label, is_public)
         VALUES (?, ?, ?, ?, 'email', ?, FALSE)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [tid, key, value, type, key.replace(/_/g, ' ')]
      );
    }
  }
  console.log(`✅ MailHog settings configured for ${tenants.length} tenant(s)`);
  console.log('   SMTP: localhost:1025 (no auth)');
  console.log('   Web UI: http://localhost:8025');
  console.log('\nNext steps:');
  console.log('  1. docker compose -f docker-compose.mail.yml up -d');
  console.log('  2. node scripts/test-email.js [your@email.com]');
  console.log('  3. Or use admin Settings → Email → Test email');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
