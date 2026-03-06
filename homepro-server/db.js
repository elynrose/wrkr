const mysql = require('mysql2/promise');
require('dotenv').config();

// Railway MySQL provides MYSQL_URL; other hosts may use DATABASE_URL
const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
let poolConfig;

if (url && url.startsWith('mysql')) {
  try {
    const u = new URL(url);
    poolConfig = {
      host:     u.hostname,
      port:     parseInt(u.port) || 3306,
      user:     u.username,
      password: u.password,
      database: (u.pathname || '/').replace(/^\//, '') || 'homepro',
      waitForConnections: true,
      connectionLimit:    10,
      queueLimit:         0,
    };
  } catch (e) {
    console.warn('[db] Invalid MYSQL_URL/DATABASE_URL, using individual env vars');
    poolConfig = null;
  }
}

if (!poolConfig) {
  poolConfig = {
    host:     process.env.DB_HOST     || process.env.MYSQLHOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306') || 3306,
    user:     process.env.DB_USER     || process.env.MYSQLUSER       || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME     || process.env.MYSQLDATABASE || 'homepro',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
  };
}

const pool = mysql.createPool(poolConfig);
module.exports = pool;
