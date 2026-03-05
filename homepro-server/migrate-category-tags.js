/**
 * Add tags column to categories table.
 * Run: node migrate-category-tags.js
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
      ALTER TABLE categories
      ADD COLUMN tags VARCHAR(500) NULL COMMENT 'Comma-separated tags for filtering/search'
    `);
    console.log('categories.tags column added.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') console.log('Column tags already exists.');
    else throw err;
  } finally {
    await conn.end();
  }
}

run().catch((e) => { process.exit(1); });
