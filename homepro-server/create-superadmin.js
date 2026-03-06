/**
 * Creates (or promotes) a superadmin user.
 * Usage: node create-superadmin.js [email] [password]
 * Defaults: superadmin@homepro.com / superadmin123
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

async function run() {
  const email    = process.argv[2] || 'superadmin@homepro.com';
  const password = process.argv[3] || 'superadmin123';

  const hash = await bcrypt.hash(password, 10);

  // Check if user already exists
  const [existing] = await db.query('SELECT id, role FROM users WHERE email = ? LIMIT 1', [email]);

  if (existing.length) {
    // Promote existing user to superadmin
    await db.query("UPDATE users SET role = 'superadmin', password_hash = ?, is_active = TRUE WHERE email = ?", [hash, email]);
    console.log(`✅ Promoted existing user "${email}" to superadmin`);
  } else {
    // Create new superadmin user on tenant 1
    const [result] = await db.query(
      "INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name, email_verified, is_active) VALUES (1, ?, ?, 'superadmin', 'Super', 'Admin', TRUE, TRUE)",
      [email, hash]
    );
    console.log(`✅ Created superadmin user (id: ${result.insertId})`);
  }

  console.log(`\nLogin credentials:`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`\nLog in at the admin login page — you will see a "Tenants" tab in the dashboard.`);

  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
