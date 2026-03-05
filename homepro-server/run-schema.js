require('dotenv').config();
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

async function main() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('✅ Connected to MySQL');

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  try {
    await conn.query(sql);
    console.log('✅ Schema applied — all tables created and seeded!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('already exists') || err.message.includes('Duplicate')) {
      console.log('💡 Some tables may already exist. To start fresh:');
      console.log('   DROP DATABASE homepro; then re-run this script.');
    }
  } finally {
    await conn.end();
  }
}

main();
