require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'homepro',
    multipleStatements: true,
  });

  console.log('Connected — creating credit_transactions table...');

  const sql = `
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      pro_id        INT NOT NULL,
      user_id       INT NOT NULL,
      type          ENUM('signup_bonus','plan_credits','purchase','lead_claim','refund','admin_adjust','monthly_refill','promo','expiry') NOT NULL,
      amount        INT NOT NULL,
      balance_after INT NOT NULL DEFAULT 0,
      description   VARCHAR(500),
      reference_id  VARCHAR(100),
      reference_type VARCHAR(50),
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pro_id)  REFERENCES pros(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_pro_created (pro_id, created_at DESC),
      INDEX idx_type (type)
    );

    -- Add credit_last_refill to track monthly refill date
    ALTER TABLE pros ADD COLUMN IF NOT EXISTS credit_last_refill DATE NULL;
  `;

  try {
    await conn.query(sql);
    console.log('credit_transactions table created');
    console.log('pros.credit_last_refill column added');

    // Backfill existing pro credits as signup_bonus transactions
    const [pros] = await conn.query('SELECT id, user_id, lead_credits FROM pros WHERE lead_credits > 0');
    for (const p of pros) {
      const [existing] = await conn.query('SELECT id FROM credit_transactions WHERE pro_id = ? LIMIT 1', [p.id]);
      if (!existing.length) {
        await conn.query(
          `INSERT INTO credit_transactions (pro_id, user_id, type, amount, balance_after, description)
           VALUES (?, ?, 'signup_bonus', ?, ?, 'Initial credit balance (backfill)')`,
          [p.id, p.user_id, p.lead_credits, p.lead_credits]
        );
        console.log(`  Backfilled pro #${p.id}: ${p.lead_credits} credits`);
      }
    }
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await conn.end();
  }

  console.log('Done!');
}

main();
