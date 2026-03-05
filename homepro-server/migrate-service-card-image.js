/**
 * Add card_image_url to services table for optional image on browse popular service cards.
 * Run: node migrate-service-card-image.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'homepro',
  });
  try {
    await conn.query(`
      ALTER TABLE services
      ADD COLUMN card_image_url VARCHAR(500) NULL
      COMMENT 'Optional image URL for browse card; if set, shown instead of icon'
    `);
    console.log('Done: services.card_image_url added (or already exists).');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column card_image_url already exists.');
    } else {
      throw err;
    }
  } finally {
    await conn.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
