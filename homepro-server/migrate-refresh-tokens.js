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
  console.log('refresh_tokens table ready');
  await conn.end();
}

main().catch(console.error);
