# Security Review & Recommendations

This document summarizes security findings and recommendations to make the Wrkr/HomePro application robust and safe. Apply these in order of priority (Critical → High → Medium → Low).

---

## Critical

### 1. JWT secret in production

**Location:** `homepro-server/middleware/auth.js`

**Issue:** If `JWT_SECRET` is not set, the app falls back to `'homepro_dev_secret_change_in_production'`, allowing token forgery.

**Recommendation:**
- In production (`NODE_ENV=production`), **require** `JWT_SECRET` and refuse to start (or reject all auth) if it is missing or equals the default.
- Use a long, random secret (e.g. 32+ bytes from `crypto.randomBytes(32).toString('hex')`) and store it only in environment/config (e.g. Heroku config vars), never in code.

### 2. Install route unprotected

**Location:** `homepro-server/routes/install.js`, `homepro-server/server.js`

**Issue:** `POST /api/install/run` creates the database and an admin user with no authentication. Anyone who can reach the server can create an admin account.

**Recommendation:**
- Disable install routes when the app is already installed (e.g. check DB has users and return 404 for `/api/install/*`).
- Or protect with a one-time install token (e.g. `INSTALL_TOKEN` env) that must be sent in a header or body and is cleared after first successful run.
- Ensure install is never exposed on a public URL in production (e.g. only on first deploy or internal tooling).

### 3. Stripe webhook signature

**Location:** `homepro-server/routes/payments.js` (webhook handler)

**Issue:** If `STRIPE_WEBHOOK_SECRET` is not set, the handler falls back to `JSON.parse(req.body)` and skips signature verification. Attackers could send fake “payment succeeded” events.

**Recommendation:**
- In production, **require** `STRIPE_WEBHOOK_SECRET` (or tenant-specific webhook secret from settings).
- If the secret is missing, respond with 503 and do not process the event.
- Never process Stripe webhook payloads without verifying `stripe.webhooks.constructEvent(..., sig, secret)`.

### 4. XSS via CMS and rich content

**Location:** `homepro/src/pages/CmsPage.jsx`, `homepro/src/components/RichTextEditor.jsx`

**Issue:** CMS page content is rendered with `dangerouslySetInnerHTML`. Rich text editor uses `innerHTML`. If an admin account is compromised or content is ever user-controlled, stored HTML/JS can execute in the browser (XSS).

**Recommendation:**
- Sanitize HTML on the server when saving pages/templates (allow only safe tags/attributes, strip script/on*).
- On the client, sanitize before rendering (e.g. use a library like DOMPurify) so that even if DB is compromised, script does not run.
- Prefer a subset of allowed tags (e.g. p, strong, em, a, ul, ol, li) and encode everything else.

---

## High

### 5. Password policy

**Locations:** `homepro-server/routes/auth.js`, `homepro-server/routes/users.js`, `homepro-server/routes/pros.js`

**Issues:**
- Minimum password length is 6 characters (weak).
- Pro signup allows no password and defaults to `'changeme123'` (`homepro-server/routes/pros.js`).

**Recommendation:**
- Enforce minimum 8–10 characters and recommend complexity (uppercase, lowercase, number, symbol); reject weak passwords (e.g. common passwords list).
- Require password on pro signup; do not create accounts with a default password. If you need “invite” flows, use a one-time token that forces setting a password on first login.

### 6. Install route: database name and SQL injection

**Location:** `homepro-server/routes/install.js`

**Issue:** Database name is validated with `/^[a-zA-Z0-9_]+$/` (good), but the install flow accepts arbitrary DB credentials and runs schema from a file. If the schema or replacement logic ever included user input in raw SQL, risk would be high.

**Recommendation:**
- Keep DB name restricted to alphanumeric and underscore; never concatenate user input into SQL.
- Ensure schema file and all replacements use parameterized values or safe identifiers only.
- Limit install to a single “first run” or protected-by-token flow.

### 7. Path traversal in setup templates

**Location:** `homepro-server/routes/settings.js` — `loadSetupTemplate(templateId)`

**Issue:** `templateId` is joined to a base path: `path.join(SETUP_TEMPLATES_DIR, `${templateId}.json`)`. If `templateId` were `../../../etc/passwd`, path could resolve outside the intended directory.

**Recommendation:**
- Validate `templateId`: allow only known template ids (e.g. from `listSetupTemplates()`) or a strict pattern (e.g. `^[a-z0-9_-]+$`).
- Resolve the final path and ensure it is under `SETUP_TEMPLATES_DIR` (e.g. `path.resolve(result).startsWith(path.resolve(SETUP_TEMPLATES_DIR))`).

### 8. CORS and allowed origins

**Location:** `homepro-server/server.js`

**Issue:** Default is to allow all origins. For a multi-tenant app this can be intentional, but it increases risk of abuse from arbitrary sites (e.g. CSRF if combined with cookie-based auth; your app uses Bearer tokens, which reduces but does not eliminate risk).

**Recommendation:**
- In production, set `ALLOWED_ORIGINS` to a comma-separated list of frontend origins (e.g. `https://yourapp.com,https://admin.yourapp.com`).
- Avoid `*` for credentialed requests; keep `credentials: true` only when origins are restricted.

### 9. Rate limiting coverage

**Location:** Various routes; `homepro-server/middleware/spam.js`

**Issue:** Login, register, leads, pro signup, and a few other endpoints are rate-limited. Other sensitive or expensive endpoints (e.g. password reset, tenant chat, some admin APIs) may not be.

**Recommendation:**
- Apply rate limiting to all auth-related endpoints (login, register, forgot-password, reset-password, refresh token).
- Apply rate limiting to public write endpoints: lead submit, tenant chat, review submit, claim/decline.
- Consider a global rate limit per IP (e.g. 100–200 req/15 min) in addition to per-route limits.
- For production, use a shared store (e.g. Redis) for rate limits so they work across multiple server instances.

### 10. Health and info leakage

**Location:** `homepro-server/server.js` — `GET /api/health`

**Issue:** Response includes a list of route names and whether Stripe is configured. Minor information disclosure.

**Recommendation:**
- In production, return only `{ status: 'ok' }` (and optionally timestamp). Do not expose Stripe config or route list to unauthenticated callers.
- If you need detailed health for monitoring, protect the endpoint (e.g. API key or internal network only).

---

## Medium

### 11. Email and input validation

**Locations:** Registration, login, leads, user update, etc.

**Issue:** Email is not validated (format). Other fields (phone, ZIP, names) may have no or loose validation, leading to bad data or abuse.

**Recommendation:**
- Validate email format (RFC-style or a simple regex) and optionally normalize (trim, lower case).
- Validate phone (e.g. E.164 or country-specific), ZIP (format/length), and length limits on names and free text (e.g. description, notes).
- Reject invalid input with 400 and clear messages; sanitize (trim, escape) where appropriate for storage and display.

### 12. Audit logging

**Location:** `homepro-server/services/audit.js` (if present); auth and sensitive actions

**Issue:** Login and password reset are audited; other sensitive actions (role change, user delete, settings change, install run) should be audited for accountability.

**Recommendation:**
- Log security-relevant events: login (success/failure), password reset, email verify, user create/delete, role change, install run, bulk settings change, Stripe webhook processing.
- Include: timestamp, tenant id, user id (if any), action, IP, and minimal request context (no passwords or tokens).
- Store logs in a durable store and restrict access; consider retention and GDPR implications.

### 13. Token storage (frontend)

**Location:** `homepro/src/context/AuthContext.jsx`, `homepro/src/services/api.js`, etc.

**Issue:** JWT and refresh token are stored in `localStorage`. If the site is compromised by XSS, tokens can be stolen.

**Recommendation:**
- Prefer `httpOnly` cookies for access (and refresh) tokens so JavaScript cannot read them; send cookies with credentials and validate on the server. This requires API and frontend to support same-site cookies and CSRF protection (e.g. double-submit cookie or SameSite=Strict).
- If you keep using localStorage, ensure all content is sanitized (see XSS above), use CSP (see below), and consider short-lived access tokens with refresh rotation.

### 14. Security headers

**Location:** `homepro-server/server.js` (no Helmet or security headers)

**Issue:** No `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, or `Strict-Transport-Security`. Increases risk of clickjacking, MIME sniffing, and some XSS.

**Recommendation:**
- Use `helmet` middleware (e.g. `app.use(helmet())`) and then tune:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` or `SAMEORIGIN`
  - `Strict-Transport-Security` in production (HTTPS only)
  - `Content-Security-Policy` with a strict default-src and script-src; allow only trusted origins and inline scripts if necessary.
- Ensure CSP does not break your frontend (test thoroughly).

### 15. Dependency hygiene

**Location:** `homepro-server/package.json`, `homepro/package.json`

**Issue:** Outdated or vulnerable dependencies can lead to known exploits.

**Recommendation:**
- Run `npm audit` regularly and fix high/critical issues (upgrade or patch).
- Pin major versions and review release notes for security fixes when updating.
- Consider Dependabot or similar to get automated PRs for vulnerabilities.

---

## Low / Hardening

### 16. Tenant isolation

**Location:** All tenant-scoped queries

**Issue:** Tenant id is taken from middleware (`req.tenant.id`). If any route ever used `req.query.tenantId` or `req.body.tenantId` without strict checks, cross-tenant data access could occur.

**Recommendation:**
- Consistently use `req.tenant.id` from trusted middleware for tenant scope.
- For superadmin-only endpoints that accept a tenant filter, ensure only superadmin role can set it and validate the value (e.g. against a list of allowed tenant ids).
- Add tests that attempt to access another tenant’s data and assert 403/404.

### 17. SQL injection

**Location:** All DB access

**Issue:** Queries reviewed use parameterized placeholders (`?`). One exception is `LIKE` with `%${city}%` — the value is still passed as a single parameter, so it is safe. No raw concatenation of user input into SQL was found.

**Recommendation:**
- Keep using parameterized queries (or a query builder that escapes) for all user input.
- Avoid building SQL strings with `+` or template literals that include request data; use placeholders only.
- Add a lint or code review rule to flag `db.query(\`...${...}\`)`-style patterns.

### 18. Sensitive data in logs

**Location:** Various `console.log` / `console.error` calls

**Issue:** Logs might include tokens, emails, or PII, which is a privacy and security risk.

**Recommendation:**
- Do not log request/response bodies, tokens, or passwords. Log only action identifiers (e.g. “login attempt”, “lead created”) and non-sensitive IDs.
- Redact or omit PII in error messages and logs; use structured logging in production and restrict log access.

### 19. HTTPS and cookie flags

**Location:** Frontend and API

**Issue:** In production, all traffic should use HTTPS. If you later use cookies for auth, they must have `Secure` and `SameSite` set.

**Recommendation:**
- Enforce HTTPS at the reverse proxy/load balancer (e.g. Heroku). Do not serve the app over plain HTTP in production.
- For any auth or session cookies: `Secure`, `HttpOnly`, and `SameSite=Strict` (or Lax if you need cross-site redirects).

### 20. Create-superadmin script

**Location:** `homepro-server/create-superadmin.js`

**Issue:** Default password is `superadmin123` if not passed. Script is intended for one-time setup but could be run accidentally or by an attacker with DB access.

**Recommendation:**
- Require password as argument and refuse to run if missing (no default).
- Document that this script must be run only in a secure environment and that the password should be changed immediately after first login.

---

## Summary checklist

| Priority   | Item                          | Action |
|-----------|--------------------------------|--------|
| Critical  | JWT secret in production       | Require strong secret; fail fast if default |
| Critical  | Install route                  | Disable when installed or protect with token |
| Critical  | Stripe webhook                 | Require and verify webhook secret in prod |
| Critical  | XSS (CMS / rich text)          | Sanitize on save and before render |
| High      | Password policy & pro signup   | Stronger rules; no default password |
| High      | Path traversal (setup template)| Validate templateId; constrain path |
| High      | CORS                           | Restrict origins in production |
| High      | Rate limiting                  | Extend to all auth and public write endpoints |
| High      | Health endpoint                | Reduce info in production |
| Medium    | Email/input validation         | Validate format and length |
| Medium    | Audit logging                  | Log security-relevant actions |
| Medium    | Token storage                  | Prefer httpOnly cookies; or harden XSS/CSP |
| Medium    | Security headers (Helmet/CSP)  | Add and tune for your app |
| Medium    | Dependencies                   | Regular npm audit and updates |
| Low       | Tenant isolation               | Review and test tenant scoping |
| Low       | Logs and cookies               | No secrets in logs; secure cookie flags |

Implementing the Critical and High items first will materially improve security; Medium and Low items further harden the site and operations.
