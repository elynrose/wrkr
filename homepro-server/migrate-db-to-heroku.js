#!/usr/bin/env node
/**
 * Migrate current (local/source) database to Heroku JawsDB.
 *
 * Source: uses .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) or DATABASE_URL.
 * Target: MIGRATE_TARGET_URL (set from: heroku config:get JAWSDB_URL -a YOUR_APP)
 *
 * Run from homepro-server:
 *   set MIGRATE_TARGET_URL=mysql://user:pass@host:3306/dbname
 *   node migrate-db-to-heroku.js
 *
 * Ensure JawsDB has the schema first (run schema.sql once).
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

function parseUrl(url) {
  const u = new URL(url.replace(/^mysql:\/\//, 'https://'));
  return {
    host: u.hostname,
    port: parseInt(u.port) || 3306,
    user: u.username,
    password: u.password,
    database: (u.pathname || '/').replace(/^\//, '') || 'homepro',
  };
}

function getSourceConfig() {
  // Source = current DB (use DB_* from .env; or SOURCE_DATABASE_URL for a connection string)
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  if (sourceUrl) return parseUrl(sourceUrl);
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'homepro',
  };
}

function getTargetConfig() {
  const url = process.env.MIGRATE_TARGET_URL;
  if (!url) {
    console.error('Set MIGRATE_TARGET_URL (your Heroku JawsDB URL). Example:');
    console.error('  heroku config:get JAWSDB_URL -a infinite-brushlands-77607');
    console.error('  set MIGRATE_TARGET_URL=<paste that URL>');
    process.exit(1);
  }
  return parseUrl(url);
}

async function getTables(conn, db) {
  const [rows] = await conn.query(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
    [db]
  );
  return rows.map((r) => r.TABLE_NAME);
}

async function getColumns(conn, table, db) {
  const [rows] = await conn.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
    [db, table]
  );
  return rows.map((r) => r.COLUMN_NAME);
}

async function copyTable(source, target, table, sourceDb, targetDb) {
  const [cols] = await source.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
    [sourceDb, table]
  );
  const columns = cols.map((c) => c.COLUMN_NAME);
  const colList = columns.map((c) => '`' + c.replace(/`/g, '``') + '`').join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const insertSql = `INSERT INTO \`${table.replace(/`/g, '``')}\` (${colList}) VALUES (${placeholders})`;

  const [rows] = await source.query(`SELECT * FROM \`${table}\``);
  if (rows.length === 0) {
    console.log(`  ${table}: 0 rows (skip)`);
    return 0;
  }

  await target.query('SET FOREIGN_KEY_CHECKS = 0');
  await target.query(`DELETE FROM \`${table}\``);
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    for (const row of batch) {
      const values = columns.map((c) => row[c]);
      await target.query(insertSql, values);
    }
  }
  await target.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log(`  ${table}: ${rows.length} rows`);
  return rows.length;
}

async function main() {
  const sourceConfig = getSourceConfig();
  const targetConfig = getTargetConfig();

  console.log('Source:', sourceConfig.host, sourceConfig.database);
  console.log('Target:', targetConfig.host, targetConfig.database);
  console.log('');

  const source = await mysql.createConnection({ ...sourceConfig, multipleStatements: false });
  const target = await mysql.createConnection({ ...targetConfig, multipleStatements: false });

  try {
    const tables = await getTables(source, sourceConfig.database);
    console.log(`Found ${tables.length} tables. Copying...`);
    let total = 0;
    for (const table of tables) {
      try {
        total += await copyTable(source, target, table, sourceConfig.database, targetConfig.database);
      } catch (err) {
        console.error(`  ${table}: ERROR`, err.message);
      }
    }
    console.log(`\nDone. ${total} total rows copied.`);
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
