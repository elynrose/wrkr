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

  console.log('Connected to MySQL');

  const sql = `
    CREATE TABLE IF NOT EXISTS lead_notes (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      lead_id     INT NOT NULL,
      user_id     INT,
      note_type   ENUM('note','status_change','call','email','sms','meeting','internal','system') DEFAULT 'note',
      content     TEXT NOT NULL,
      metadata    JSON,
      is_pinned   BOOLEAN DEFAULT FALSE,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS lead_activity (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      lead_id     INT NOT NULL,
      user_id     INT,
      action      VARCHAR(100) NOT NULL,
      details     TEXT,
      ip_address  VARCHAR(45),
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Add priority and assigned_to columns to leads if they don't exist
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority ENUM('low','normal','high','urgent') DEFAULT 'normal';
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to INT NULL;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date DATE NULL;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags VARCHAR(500) DEFAULT '';
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS internal_notes TEXT;
  `;

  try {
    await conn.query(sql);
    console.log('lead_notes, lead_activity tables created + leads columns added!');
  } catch (err) {
    if (err.message.includes('Duplicate column')) {
      console.log('Columns already exist — migration is idempotent. Done!');
    } else {
      console.error('Error:', err.message);
    }
  } finally {
    await conn.end();
  }
}

main();
