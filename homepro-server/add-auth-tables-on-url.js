#!/usr/bin/env node
/** Run once to add refresh_tokens and password_reset_tokens on JawsDB. Use MIGRATE_TARGET_URL or JAWSDB_URL. */
require('dotenv').config();
const mysql = require('mysql2/promise');

function parseUrl(url) {
  const u = new URL(url.replace(/^mysql:\/\//, 'https://'));
  return {
    host: u.hostname,
    port: parseInt(u.port) || 3306,
    user: u.username,
    password: u.password,
    database: (u.pathname || '/').replace(/^\//, '') || 'homepro',
  };
}

async function main() {
  const url = process.env.MIGRATE_TARGET_URL || process.env.JAWSDB_URL;
  if (!url) {
    console.error('Set MIGRATE_TARGET_URL or JAWSDB_URL');
    process.exit(1);
  }
  const conn = await mysql.createConnection(parseUrl(url));

  await conn.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NOT NULL,
      token       VARCHAR(64) UNIQUE NOT NULL,
      expires_at  TIMESTAMP NOT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_token (token),
      INDEX idx_user (user_id)
    );
  `);
  console.log('refresh_tokens table created.');

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
  console.log('password_reset_tokens table created.');
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
