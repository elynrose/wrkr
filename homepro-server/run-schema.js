require('dotenv').config();
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

function getConnectionConfig() {
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url && url.startsWith('mysql')) {
    try {
      const u = new URL(url);
      return {
        host:     u.hostname,
        port:     parseInt(u.port) || 3306,
        user:     u.username,
        password: u.password,
        database: (u.pathname || '/').replace(/^\//, '') || 'homepro',
        multipleStatements: true,
      };
    } catch (e) {
      console.warn('Invalid MYSQL_URL, using DB_* vars');
    }
  }
  return {
    host:     process.env.DB_HOST     || process.env.MYSQLHOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306') || 3306,
    user:     process.env.DB_USER     || process.env.MYSQLUSER       || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME     || process.env.MYSQLDATABASE || 'homepro',
    multipleStatements: true,
  };
}

async function main() {
  const conn = await mysql.createConnection(getConnectionConfig());

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
