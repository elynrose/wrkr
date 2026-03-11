/**
 * Create credit_bundles table and seed tenant 1 with default bundles (matches legacy CREDIT_BUNDLES).
 * Run once: node migrate-credit-bundles.js
 */
require('dotenv').config();
const db = require('./db');

const DEFAULT_BUNDLES = [
  { label: '10 Credits',  credits: 10,  price: 30.00,  price_per_credit: 3.00,  sort_order: 1 },
  { label: '25 Credits',  credits: 25,  price: 62.50,  price_per_credit: 2.50,  sort_order: 2 },
  { label: '50 Credits',  credits: 50,  price: 100.00, price_per_credit: 2.00,  sort_order: 3 },
  { label: '100 Credits', credits: 100, price: 175.00, price_per_credit: 1.75,  sort_order: 4 },
];

async function run() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS credit_bundles (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id         INT           NOT NULL DEFAULT 1,
      label             VARCHAR(80)   NOT NULL,
      credits           INT           NOT NULL,
      price             DECIMAL(10,2) NOT NULL,
      price_per_credit  DECIMAL(10,2) NOT NULL,
      stripe_price_id   VARCHAR(100),
      is_active         BOOLEAN       DEFAULT TRUE,
      sort_order        INT           DEFAULT 0,
      created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      KEY idx_tenant_active (tenant_id, is_active)
    )
  `);
  console.log('credit_bundles table ready');

  const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM credit_bundles WHERE tenant_id = 1');
  if (count === 0) {
    for (const b of DEFAULT_BUNDLES) {
      await db.query(
        `INSERT INTO credit_bundles (tenant_id, label, credits, price, price_per_credit, sort_order)
         VALUES (1, ?, ?, ?, ?, ?)`,
        [b.label, b.credits, b.price, b.price_per_credit, b.sort_order]
      );
    }
    console.log('Seeded tenant 1 with', DEFAULT_BUNDLES.length, 'credit bundles');
  } else {
    console.log('Tenant 1 already has', count, 'credit bundle(s)');
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
