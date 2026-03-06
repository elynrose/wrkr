/**
 * Basic auth API tests. Run with: node test/auth.test.js
 * Requires backend running at localhost:3001
 */
const BASE = 'http://localhost:3001/api';

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function run() {
  console.log('Auth API tests\n');
  let passed = 0;
  let failed = 0;

  // Health check
  const health = await fetchJson(`${BASE.replace('/api', '')}/api/health`);
  if (health.ok) {
    console.log('✓ Health check');
    passed++;
  } else {
    console.log('✗ Health check failed - is the server running?');
    failed++;
    return;
  }

  // Forgot password (no auth)
  const forgot = await fetchJson(`${BASE}/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email: 'nonexistent@test.com' }),
  });
  if (forgot.ok && forgot.data.message) {
    console.log('✓ Forgot password (returns success message)');
    passed++;
  } else {
    console.log('✗ Forgot password:', forgot.data);
    failed++;
  }

  // Reset password with invalid token
  const reset = await fetchJson(`${BASE}/auth/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ token: 'invalid', newPassword: 'newpass123' }),
  });
  if (!reset.ok && reset.data.error?.includes('Invalid')) {
    console.log('✓ Reset password rejects invalid token');
    passed++;
  } else {
    console.log('✗ Reset password should reject invalid token:', reset.data);
    failed++;
  }

  // Login
  const login = await fetchJson(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@homepro.com', password: 'admin123' }),
  });
  if (login.ok && login.data.token) {
    console.log('✓ Login returns token');
    passed++;
    if (login.data.refreshToken) {
      console.log('✓ Login returns refresh token');
      passed++;
    }
  } else {
    console.log('✗ Login:', login.data);
    failed++;
  }

  console.log(`\n${passed} passed, ${failed} failed`);
}

run().catch((err) => {
  console.error('Test error:', err.message);
  process.exit(1);
});
