/**
 * Multi-tenancy migration script.
 * Run once on an existing installation: node migrate-multitenancy.js
 *
 * Safe to run multiple times — all operations use IF NOT EXISTS / IGNORE.
 */
require('dotenv').config();
const db = require('./db');

async function run() {
  console.log('Starting multi-tenancy migration...');

  // ── 1. Create tenants table ────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      name           VARCHAR(200)  NOT NULL,
      slug           VARCHAR(100)  UNIQUE NOT NULL,
      custom_domain  VARCHAR(300)  UNIQUE NULL,
      status         ENUM('active','suspended','pending') DEFAULT 'active',
      plan           ENUM('starter','pro','enterprise') DEFAULT 'starter',
      owner_user_id  INT NULL,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ tenants table created/verified');

  // ── 2. Seed default tenant ─────────────────────────────────
  await db.query(
    `INSERT IGNORE INTO tenants (id, name, slug, custom_domain, status, plan) VALUES (1, 'Default', 'default', NULL, 'active', 'starter')`
  );
  console.log('✓ default tenant seeded');

  // ── 3. Add tenant_id to each table ─────────────────────────
  const tables = [
    'users', 'categories', 'services', 'pros', 'pro_services', 'pro_service_areas',
    'leads', 'lead_claims', 'lead_matches', 'lead_notes', 'lead_activity',
    'subscription_plans', 'payments', 'invoices', 'reviews', 'notifications',
    'notification_templates', 'conversations', 'messages', 'how_it_works',
    'sms_inbound', 'audit_log', 'settings', 'pages', 'credit_transactions',
  ];

  for (const table of tables) {
    try {
      await db.query(`ALTER TABLE ${table} ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id`);
      console.log(`✓ Added tenant_id to ${table}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`- tenant_id already exists in ${table}, skipping`);
      } else {
        console.error(`✗ Failed to add tenant_id to ${table}:`, err.message);
      }
    }
  }

  // ── 4. Update role enum on users to include superadmin ─────
  try {
    await db.query(`ALTER TABLE users MODIFY role ENUM('consumer','pro','admin','superadmin') NOT NULL DEFAULT 'consumer'`);
    console.log('✓ Updated users.role enum to include superadmin');
  } catch (err) {
    console.error('✗ Failed to update users.role enum:', err.message);
  }

  // ── 5. Update UNIQUE constraints ───────────────────────────

  // Helper: drop old unique index if it exists, then add new composite one
  async function reindex(table, oldKey, newKey, cols) {
    // Check if old index exists
    const [idxRows] = await db.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [table, oldKey]
    );
    if (idxRows.length) {
      try {
        await db.query(`ALTER TABLE ${table} DROP INDEX ${oldKey}`);
        console.log(`✓ Dropped old index ${oldKey} on ${table}`);
      } catch (e) {
        console.log(`- Could not drop ${oldKey} on ${table}: ${e.message}`);
      }
    }
    // Check if new index already exists
    const [newIdxRows] = await db.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [table, newKey]
    );
    if (!newIdxRows.length) {
      try {
        await db.query(`ALTER TABLE ${table} ADD UNIQUE KEY ${newKey} (${cols})`);
        console.log(`✓ Added composite unique ${newKey} on ${table}(${cols})`);
      } catch (e) {
        console.error(`✗ Failed to add ${newKey} on ${table}:`, e.message);
      }
    } else {
      console.log(`- ${newKey} already exists on ${table}, skipping`);
    }
  }

  await reindex('users', 'email', 'uq_email_tenant', 'email, tenant_id');
  await reindex('categories', 'slug', 'uq_cat_slug_tenant', 'slug, tenant_id');
  await reindex('services', 'slug', 'uq_svc_slug_tenant', 'slug, tenant_id');
  await reindex('pros', 'user_id', 'uq_pro_user_tenant', 'user_id, tenant_id');
  await reindex('subscription_plans', 'slug', 'uq_plan_slug_tenant', 'slug, tenant_id');
  await reindex('notification_templates', 'slug', 'uq_tmpl_slug_tenant', 'slug, tenant_id');
  await reindex('settings', 'setting_key', 'uq_setting_key_tenant', 'setting_key, tenant_id');
  await reindex('pages', 'slug', 'uq_page_slug_tenant', 'slug, tenant_id');
  await reindex('conversations', 'uq_conv', 'uq_conv_tenant', 'lead_id, consumer_id, pro_id, tenant_id');
  await reindex('lead_matches', 'uq_lead_pro', 'uq_lead_pro_tenant', 'lead_id, pro_id, tenant_id');

  // ── 6. Add foreign key for tenant_id on users ──────────────
  // (optional — skip if it causes issues with existing data)
  try {
    const [fkRows] = await db.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
       AND CONSTRAINT_NAME LIKE 'fk_users_tenant%'`
    );
    if (!fkRows.length) {
      await db.query(`ALTER TABLE users ADD CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`);
      console.log('✓ Added FK users.tenant_id → tenants.id');
    }
  } catch (e) {
    console.log('- Skipping FK on users.tenant_id:', e.message);
  }

  console.log('\n✅ Multi-tenancy migration complete!');
  console.log('You can now create tenants at POST /api/superadmin/tenants');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
