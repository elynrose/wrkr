#!/usr/bin/env node
/**
 * Run schema.sql against a database URL (e.g. JAWSDB_URL).
 * Use: MIGRATE_TARGET_URL=mysql://... node run-schema-on-url.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function parseUrl(url) {
  const u = new URL(url.replace(/^mysql:\/\//, 'https://'));
  return {
    host: u.hostname,
    port: parseInt(u.port) || 3306,
    user: u.username,
    password: u.password,
    database: (u.pathname || '/').replace(/^\//, '') || 'homepro',
    multipleStatements: true,
  };
}

async function main() {
  const url = process.env.MIGRATE_TARGET_URL || process.env.JAWSDB_URL;
  if (!url) {
    console.error('Set MIGRATE_TARGET_URL or JAWSDB_URL');
    process.exit(1);
  }
  const config = parseUrl(url);
  const conn = await mysql.createConnection(config);
  console.log('Connected to', config.host, config.database);

  let sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  sql = sql
    .replace(/CREATE DATABASE IF NOT EXISTS \w+;\s*/i, '')
    .replace(/USE \w+;\s*/i, '');

  try {
    await conn.query(sql);
    console.log('Schema applied.');
  } catch (e) {
    console.error('Error:', e.message);
    throw e;
  }
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
