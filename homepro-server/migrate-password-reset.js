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
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
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
  console.log('password_reset_tokens table ready');

  // Add password_reset template for tenant 1 (default)
  await conn.query(`
    INSERT IGNORE INTO notification_templates (tenant_id, slug, name, channel, subject, body, description, variables, is_active)
    VALUES (1, 'password_reset', 'Password Reset', 'email', 'Reset your {{siteName}} password',
'<p>Hi {{firstName}},</p>
<p>You requested a password reset. Click the button below to set a new password:</p>
<div style="text-align:center;margin:24px 0;">
  <a href="{{resetUrl}}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a>
</div>
<p style="color:#64748b;font-size:13px;">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
<p style="color:#64748b;font-size:13px;">If the button does not work, copy and paste this link into your browser:<br>{{resetUrl}}</p>',
'Sent when user requests password reset', 'firstName, email, resetUrl, siteName', TRUE);
  `);
  console.log('password_reset template added');
  await conn.end();
}

main().catch(console.error);
