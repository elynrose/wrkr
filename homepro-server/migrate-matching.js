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

  console.log('Connected — creating lead_matches table...');

  const sql = `
    CREATE TABLE IF NOT EXISTS lead_matches (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      lead_id       INT NOT NULL,
      pro_id        INT NOT NULL,
      user_id       INT NOT NULL,
      match_score   DECIMAL(5,2) DEFAULT 0,
      match_rank    INT DEFAULT 0,
      claim_token   VARCHAR(64) UNIQUE NOT NULL,
      sms_sent      BOOLEAN DEFAULT FALSE,
      sms_sent_at   TIMESTAMP NULL,
      sms_sid       VARCHAR(100),
      status        ENUM('pending','notified','viewed','accepted','declined','expired') DEFAULT 'pending',
      viewed_at     TIMESTAMP NULL,
      responded_at  TIMESTAMP NULL,
      expires_at    TIMESTAMP NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (pro_id)  REFERENCES pros(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY uq_lead_pro (lead_id, pro_id)
    );

    -- Add sms_opt_in to pros for Twilio consent tracking
    ALTER TABLE pros ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT TRUE;
    ALTER TABLE pros ADD COLUMN IF NOT EXISTS sms_phone VARCHAR(30);
    ALTER TABLE pros ADD COLUMN IF NOT EXISTS response_rate DECIMAL(5,2) DEFAULT 0;
    ALTER TABLE pros ADD COLUMN IF NOT EXISTS avg_response_time_min INT DEFAULT 0;
  `;

  try {
    await conn.query(sql);
    console.log('lead_matches table created');
    console.log('pros table columns added (sms_opt_in, sms_phone, response_rate, avg_response_time_min)');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await conn.end();
  }
}

main();
