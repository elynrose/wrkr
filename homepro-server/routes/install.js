const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('../db');

// GET /api/install/status — check if app is already installed (has DB and at least one user)
router.get('/status', async (req, res) => {
  try {
    await db.query('SELECT 1 FROM users LIMIT 1');
    const [rows] = await db.query('SELECT COUNT(*) AS n FROM users');
    const installed = (rows[0] && rows[0].n > 0);
    res.json({ installed: !!installed });
  } catch (err) {
    res.json({ installed: false, error: err.message });
  }
});

// POST /api/install/check-db — test database connection (optional: existing DB name)
router.post('/check-db', async (req, res) => {
  const { host, port, user, password, database } = req.body || {};
  const dbHost = host || 'localhost';
  const dbPort = parseInt(port) || 3306;
  const dbUser = user || 'root';
  const dbPass = password != null ? password : '';
  const dbName = database || 'homepro';

  try {
    const conn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPass,
      connectTimeout: 10000,
    });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName.replace(/`/g, '``')}\``).catch(() => {});
    await conn.end();
    res.json({ ok: true, message: 'Connection successful' });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'Connection failed' });
  }
});

// POST /api/install/run — run schema and create admin (no auth).
// Security: only allow when app is not yet installed; otherwise return 410.
router.post('/run', async (req, res) => {
  try {
    await db.query('SELECT 1 FROM users LIMIT 1');
    const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM users');
    if (n > 0) {
      return res.status(410).json({ error: 'App is already installed. Install endpoint is disabled.' });
    }
  } catch (_) {
    // DB not set up or no users — allow install to proceed
  }

  const { host, port, user, password, database, adminEmail, adminPassword, adminName } = req.body || {};
  if (!adminEmail || !adminPassword) {
    return res.status(400).json({ error: 'Admin email and password are required' });
  }

  const dbHost = host || 'localhost';
  const dbPort = parseInt(port) || 3306;
  const dbUser = user || 'root';
  const dbPass = password != null ? password : '';
  const dbName = database || 'homepro';

  let conn;
  try {
    conn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPass,
      multipleStatements: true,
      connectTimeout: 10000,
    });

    let sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
    const safeDb = /^[a-zA-Z0-9_]+$/.test(dbName) ? dbName : 'homepro';
    sql = sql.replace(/CREATE DATABASE IF NOT EXISTS\s+homepro\s*;/i, `CREATE DATABASE IF NOT EXISTS \`${safeDb}\`;`);
    sql = sql.replace(/\bUSE\s+homepro\s*;/i, `USE \`${safeDb}\`;`);
    await conn.query(sql);

    const hash = await bcrypt.hash(adminPassword, 10);
    const name = (adminName || '').trim() || 'Admin';
    const [existing] = await conn.query('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin']);
    if (existing && existing.length > 0) {
      await conn.query(
        'UPDATE users SET email = ?, password_hash = ?, first_name = ?, last_name = ? WHERE role = ? LIMIT 1',
        [adminEmail, hash, name.split(' ')[0] || 'Admin', name.split(' ').slice(1).join(' ') || '', 'admin']
      );
    } else {
      await conn.query(
        'INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified, is_active) VALUES (?, ?, ?, ?, ?, TRUE, TRUE)',
        [adminEmail, hash, 'admin', name.split(' ')[0] || 'Admin', name.split(' ').slice(1).join(' ') || '']
      );
    }

    await conn.end();

    const envLines = [
      `DB_HOST=${dbHost}`,
      `DB_PORT=${dbPort}`,
      `DB_USER=${dbUser}`,
      `DB_PASSWORD=${dbPass.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}`,
      `DB_NAME=${dbName}`,
      'PORT=3001',
      'JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'),
      'JWT_EXPIRES=7d',
      'FRONTEND_URL=http://localhost:5173',
      '',
      '# Stripe, Twilio, etc. — configure in Admin → Settings',
    ];
    res.json({
      ok: true,
      message: 'Database and admin user created successfully.',
      envContents: envLines.join('\n'),
    });
  } catch (err) {
    if (conn) try { await conn.end(); } catch (_) {}
    console.error('Install error:', err);
    res.status(500).json({ error: err.message || 'Installation failed' });
  }
});

module.exports = router;
