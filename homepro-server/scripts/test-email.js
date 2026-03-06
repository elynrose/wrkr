#!/usr/bin/env node
/**
 * Send a test email via the app's SMTP config (from DB settings).
 * Usage: node scripts/test-email.js [recipient@example.com]
 *
 * Prerequisites:
 * 1. Start MailHog: docker compose -f docker-compose.mail.yml up -d
 * 2. Configure admin Settings → Email:
 *    - Enable email
 *    - SMTP Host: localhost
 *    - SMTP Port: 1025
 *    - SMTP User: (leave empty for MailHog)
 *    - SMTP Password: (leave empty)
 *
 * Or use Mailtrap.io credentials if you prefer cloud testing.
 */
require('dotenv').config();
const db = require('../db');

async function main() {
  const to = process.argv[2] || 'test@example.com';

  // Load email config from settings (tenant 1)
  const [rows] = await db.query(
    "SELECT setting_key, setting_value FROM settings WHERE setting_group = 'email' AND tenant_id = 1"
  );
  const cfg = {};
  for (const r of rows) cfg[r.setting_key] = r.setting_value;

  const host = (cfg.smtp_host || '').trim();
  const port = parseInt(cfg.smtp_port) || 587;
  const secure = cfg.smtp_secure === 'true' || cfg.smtp_secure === '1';
  const user = (cfg.smtp_user || '').trim();
  const pass = cfg.smtp_password;
  const enabled = cfg.email_enabled === 'true' || cfg.email_enabled === '1';

  console.log('Email config:', { host, port, secure, user: user ? '***' : '(none)', enabled });

  if (!enabled) {
    console.log('\n⚠️  Email is disabled. Set email_enabled = true in admin Settings → Email.');
    process.exit(1);
  }
  if (!host) {
    console.log('\n⚠️  SMTP host not set. Configure in admin Settings → Email.');
    process.exit(1);
  }

  const { sendEmail } = require('../services/email');
  const { clearCache } = require('../services/email');
  clearCache(1);

  try {
    const result = await sendEmail({
      to,
      subject: 'HomePro Email Test',
      html: '<p>This is a test email from HomePro.</p><p>If you see this, SMTP is working.</p>',
      text: 'This is a test email from HomePro. If you see this, SMTP is working.',
      tenantId: 1,
    });
    console.log('\n✅ Email sent:', result.mock ? '(mock)' : result.messageId);
    if (host === 'localhost' || host === '127.0.0.1') {
      console.log('   View in MailHog: http://localhost:8025');
    }
  } catch (err) {
    console.error('\n❌ Failed:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

main();
