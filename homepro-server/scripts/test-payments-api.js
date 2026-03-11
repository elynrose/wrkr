/**
 * Smoke test for payment, subscription, and credit top-up API endpoints.
 * Usage:
 *   node scripts/test-payments-api.js
 *   BASE_URL=https://your-app.herokuapp.com/api PRO_EMAIL=pro@test.com PRO_PASSWORD=secret node scripts/test-payments-api.js
 * Requires PRO_EMAIL and PRO_PASSWORD for a Pro user (creates token via login).
 */
require('dotenv').config();

const BASE = process.env.BASE_URL || 'http://localhost:3001/api';
const PRO_EMAIL = process.env.PRO_EMAIL || process.env.TEST_PRO_EMAIL;
const PRO_PASSWORD = process.env.PRO_PASSWORD || process.env.TEST_PRO_PASSWORD;

async function request(method, path, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

async function run() {
  console.log('Payment/Subscription API smoke test');
  console.log('BASE_URL:', BASE);
  console.log('');

  let token = null;

  // 1. Public: list subscription plans
  const plansRes = await request('GET', '/subscriptions/plans');
  if (!plansRes.ok) {
    console.log('FAIL GET /subscriptions/plans', plansRes.status, plansRes.data);
    return;
  }
  const plans = Array.isArray(plansRes.data) ? plansRes.data : [];
  console.log('OK  GET /subscriptions/plans —', plans.length, 'plan(s)');
  const withPrice = plans.filter((p) => p.stripe_price_id);
  if (plans.length && !withPrice.length) {
    console.log('    ⚠ No plan has stripe_price_id — subscription checkout will return 400 until you set Price ID in Admin');
  } else if (withPrice.length) {
    console.log('    ✓', withPrice.length, 'plan(s) with Stripe Price ID');
  }

  // 2. Public: credit bundles
  const bundlesRes = await request('GET', '/credits/bundles');
  if (!bundlesRes.ok) {
    console.log('FAIL GET /credits/bundles', bundlesRes.status, bundlesRes.data);
  } else {
    const bundles = Array.isArray(bundlesRes.data) ? bundlesRes.data : [];
    console.log('OK  GET /credits/bundles —', bundles.length, 'bundle(s)');
  }

  if (!PRO_EMAIL || !PRO_PASSWORD) {
    console.log('');
    console.log('Skip authenticated tests (set PRO_EMAIL and PRO_PASSWORD to run full test).');
    console.log('Example: PRO_EMAIL=pro@example.com PRO_PASSWORD=secret node scripts/test-payments-api.js');
    return;
  }

  // 3. Login as Pro
  const loginRes = await request('POST', '/auth/login', { email: PRO_EMAIL, password: PRO_PASSWORD });
  if (!loginRes.ok) {
    console.log('FAIL POST /auth/login', loginRes.status, loginRes.data?.error || loginRes.data);
    return;
  }
  token = loginRes.data?.token || loginRes.data?.accessToken;
  if (!token) {
    console.log('FAIL Login response missing token');
    return;
  }
  console.log('OK  POST /auth/login — token received');

  // 4. Pro: current subscription
  const currentRes = await request('GET', '/subscriptions/current', null, token);
  if (!currentRes.ok) {
    console.log('FAIL GET /subscriptions/current', currentRes.status, currentRes.data);
  } else {
    console.log('OK  GET /subscriptions/current — plan:', currentRes.data?.plan ?? '—');
  }

  // 5. Pro: credits balance
  const balanceRes = await request('GET', '/credits/balance', null, token);
  if (!balanceRes.ok) {
    console.log('FAIL GET /credits/balance', balanceRes.status, balanceRes.data);
  } else {
    console.log('OK  GET /credits/balance — balance:', balanceRes.data?.balance ?? '—');
  }

  // 6. Pro: create checkout (subscription) — expect 200 + url or 400 if no price
  const planSlug = (plans[0] && plans[0].slug) || 'professional';
  const checkoutRes = await request('POST', '/payments/create-checkout', { planSlug, billingPeriod: 'monthly' }, token);
  if (checkoutRes.ok && checkoutRes.data?.url) {
    console.log('OK  POST /payments/create-checkout — returns Stripe URL (subscription)');
  } else if (checkoutRes.status === 400 && checkoutRes.data?.error?.includes('Stripe price')) {
    console.log('OK  POST /payments/create-checkout — 400 (no Stripe Price ID on plan; set in Admin)');
  } else if (checkoutRes.status === 503) {
    console.log('OK  POST /payments/create-checkout — 503 (Stripe not configured)');
  } else {
    console.log('FAIL POST /payments/create-checkout', checkoutRes.status, checkoutRes.data);
  }

  // 7. Pro: credit bundle purchase — expect 200 + url
  const purchaseRes = await request('POST', '/credits/purchase', { bundleId: 'bundle_10' }, token);
  if (purchaseRes.ok && purchaseRes.data?.url) {
    console.log('OK  POST /credits/purchase — returns Stripe URL (credit top-up)');
  } else if (purchaseRes.ok && purchaseRes.data?.balance !== undefined) {
    console.log('OK  POST /credits/purchase — credits added (no Stripe; dev mode)');
  } else if (purchaseRes.status === 503) {
    console.log('OK  POST /credits/purchase — 503 (Stripe not configured)');
  } else {
    console.log('FAIL POST /credits/purchase', purchaseRes.status, purchaseRes.data);
  }

  // 8. Pro: payment history
  const paymentsRes = await request('GET', '/payments', null, token);
  if (!paymentsRes.ok) {
    console.log('FAIL GET /payments', paymentsRes.status, paymentsRes.data);
  } else {
    const list = Array.isArray(paymentsRes.data) ? paymentsRes.data : [];
    console.log('OK  GET /payments —', list.length, 'payment(s)');
  }

  console.log('');
  console.log('Done. Use PAYMENT-SUBSCRIPTION-TEST-PLAN.md for full E2E (Stripe Checkout + webhook).');
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
