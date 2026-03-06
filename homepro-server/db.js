const mysql = require('mysql2/promise');
require('dotenv').config();

function getPoolConfig() {
  const connectionUrl = process.env.JAWSDB_URL || process.env.DATABASE_URL;
  if (connectionUrl) {
    // Parse mysql://user:password@host:port/database
    const url = new URL(connectionUrl.replace(/^mysql:\/\//, 'https://'));
    return {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: (url.pathname || '/').replace(/^\//, '') || 'homepro',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  }
  return {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'homepro',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
  };
}

const pool = mysql.createPool(getPoolConfig());
module.exports = pool;
