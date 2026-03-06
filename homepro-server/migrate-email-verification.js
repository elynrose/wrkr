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

  await conn.query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NOT NULL,
      token       VARCHAR(64) UNIQUE NOT NULL,
      expires_at  TIMESTAMP NOT NULL,
      used_at     TIMESTAMP NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_token (token),
      INDEX idx_expires (expires_at)
    );
  `);
  console.log('email_verification_tokens table ready');

  await conn.query(`
    INSERT IGNORE INTO notification_templates (tenant_id, slug, name, channel, subject, body, description, variables, is_active)
    VALUES (1, 'email_verify', 'Email Verification', 'email', 'Verify your {{siteName}} email',
'<p>Hi {{firstName}},</p>
<p>Please verify your email address by clicking the button below:</p>
<div style="text-align:center;margin:24px 0;">
  <a href="{{verifyUrl}}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Verify Email</a>
</div>
<p style="color:#64748b;font-size:13px;">This link expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>
<p style="color:#64748b;font-size:13px;">If the button does not work: {{verifyUrl}}</p>',
'Sent when user registers', 'firstName, email, verifyUrl, siteName', TRUE);
  `);
  console.log('email_verify template added');

  await conn.query(`
    INSERT IGNORE INTO settings (tenant_id, setting_key, setting_value, setting_type, setting_group, label, description, is_public)
    VALUES (1, 'require_email_verification', 'false', 'boolean', 'general', 'Require Email Verification', 'Block login until email is verified', FALSE);
  `);
  console.log('require_email_verification setting added');
  await conn.end();
}

main().catch(console.error);
