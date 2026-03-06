const db = require('../db');

const CREDIT_BUNDLES = [
  { id: 'bundle_10',  credits: 10,  price: 30.00,  pricePerCredit: 3.00,  label: '10 Credits'  },
  { id: 'bundle_25',  credits: 25,  price: 62.50,  pricePerCredit: 2.50,  label: '25 Credits'  },
  { id: 'bundle_50',  credits: 50,  price: 100.00, pricePerCredit: 2.00,  label: '50 Credits'  },
  { id: 'bundle_100', credits: 100, price: 175.00, pricePerCredit: 1.75,  label: '100 Credits' },
];

/**
 * Add credits to a pro and log the transaction.
 * Returns the new balance.
 */
async function addCredits(proId, userId, amount, type, description, refId, refType, conn) {
  const q = conn || db;

  await q.query('UPDATE pros SET lead_credits = lead_credits + ? WHERE id = ?', [amount, proId]);
  const [[pro]] = await q.query('SELECT lead_credits, tenant_id FROM pros WHERE id = ?', [proId]);
  const balance = pro.lead_credits;

  await q.query(
    `INSERT INTO credit_transactions (tenant_id, pro_id, user_id, type, amount, balance_after, description, reference_id, reference_type)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [pro.tenant_id || 1, proId, userId, type, amount, balance, description, refId || null, refType || null]
  );

  return balance;
}

/**
 * Deduct credits from a pro and log the transaction.
 * Returns the new balance, or throws if insufficient.
 */
async function deductCredits(proId, userId, amount, type, description, refId, refType, conn) {
  const q = conn || db;

  const [[pro]] = await q.query('SELECT lead_credits, subscription_plan, tenant_id FROM pros WHERE id = ?', [proId]);

  if (pro.subscription_plan === 'enterprise') {
    await q.query(
      `INSERT INTO credit_transactions (tenant_id, pro_id, user_id, type, amount, balance_after, description, reference_id, reference_type)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [pro.tenant_id || 1, proId, userId, type, -amount, pro.lead_credits, `${description} (enterprise — unlimited)`, refId || null, refType || null]
    );
    return pro.lead_credits;
  }

  if (pro.lead_credits < amount) {
    throw new Error('Insufficient credits');
  }

  await q.query('UPDATE pros SET lead_credits = lead_credits - ? WHERE id = ?', [amount, proId]);
  const newBalance = pro.lead_credits - amount;

  await q.query(
    `INSERT INTO credit_transactions (tenant_id, pro_id, user_id, type, amount, balance_after, description, reference_id, reference_type)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [pro.tenant_id || 1, proId, userId, type, -amount, newBalance, description, refId || null, refType || null]
  );

  return newBalance;
}

/**
 * Get credit balance for a pro.
 */
async function getBalance(proId) {
  const [[pro]] = await db.query(
    'SELECT lead_credits, subscription_plan, credit_last_refill FROM pros WHERE id = ?',
    [proId]
  );
  return pro || null;
}

/**
 * Get transaction history for a pro.
 */
async function getHistory(proId, limit = 50, offset = 0) {
  const [rows] = await db.query(
    `SELECT ct.*, u.first_name, u.last_name
     FROM credit_transactions ct
     LEFT JOIN users u ON ct.user_id = u.id
     WHERE ct.pro_id = ?
     ORDER BY ct.created_at DESC
     LIMIT ? OFFSET ?`,
    [proId, limit, offset]
  );
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) as total FROM credit_transactions WHERE pro_id = ?', [proId]
  );
  return { transactions: rows, total };
}

/**
 * Monthly credit refill for a pro based on their plan.
 */
async function monthlyRefill(proId, userId) {
  const [[pro]] = await db.query(
    `SELECT p.id, p.user_id, p.subscription_plan, p.credit_last_refill,
            sp.lead_credits AS plan_credits
     FROM pros p
     LEFT JOIN subscription_plans sp ON p.subscription_plan = sp.slug
     WHERE p.id = ?`,
    [proId]
  );

  if (!pro || !pro.plan_credits || pro.subscription_plan === 'free') return null;

  const today = new Date().toISOString().split('T')[0];
  if (pro.credit_last_refill === today) return null;

  const balance = await addCredits(
    proId, userId || pro.user_id,
    pro.plan_credits, 'monthly_refill',
    `Monthly refill: ${pro.plan_credits} credits (${pro.subscription_plan} plan)`,
    null, null
  );

  await db.query('UPDATE pros SET credit_last_refill = ? WHERE id = ?', [today, proId]);

  return { credits: pro.plan_credits, balance };
}

module.exports = { addCredits, deductCredits, getBalance, getHistory, monthlyRefill, CREDIT_BUNDLES };
