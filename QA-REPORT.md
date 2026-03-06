# HomePro — QA Review Report

**Review date:** March 2026  
**Scope:** Full-stack app (homepro + homepro-server), deployed on Heroku with JawsDB.  
**Note:** Email (SMTP) and Stripe credentials are not configured; behavior with missing creds was verified in code.

---

## 1. What’s Working Now

### Authentication & users
- **Login** — POST `/api/auth/login`: validates credentials, issues JWT + refresh token, stores in `refresh_tokens`. Works with missing email/Stripe (no dependency).
- **Register** — POST `/api/auth/register`: creates user, optional welcome + verification email (mocked if SMTP not set).
- **Logout** — Client clears `hp_token` and `hp_refresh`.
- **Refresh token** — POST `/api/auth/refresh`: exchanges refresh token for new access token. Frontend stores refresh token but does not auto-refresh on 401 (see Improvements).
- **Forgot / reset password** — Flow uses `password_reset_tokens`; email is mocked if SMTP not configured.
- **Verify email** — POST `/api/auth/verify/:token`; email with link mocked if SMTP not set.
- **Password change** — PUT `/api/auth/password` (authenticated); sends “password changed” email when SMTP is set.

### Tenant & multi-tenancy
- **Tenant resolution** — `middleware/tenant.js`: resolves tenant by hostname (custom_domain or slug), caches 5 min, falls back to default tenant. Localhost always maps to default.
- **Admin on localhost** — Auth middleware binds `req.tenant` to the logged-in user’s tenant on localhost so admins can use the app without a custom domain.

### Leads
- **Submit lead** — POST `/api/leads`: spam protection, optional auth, writes to DB. Sends confirmation email (mocked if no SMTP) and triggers **matchAndNotify** in background.
- **List leads (admin)** — GET `/api/leads`: paginated, filterable, tenant-scoped (superadmin can filter by tenant).
- **Lead details** — Admin can open lead detail view from dashboard.
- **Match engine** — After lead create, pros matching ZIP + service are scored, ranked, and notified via SMS (Twilio). If Twilio not configured, SMS is mocked (log only); matching and DB updates still run.

### Matching & claim flow
- **Lead match** — `matchEngine.matchAndNotify`: finds pros by service area + service, scores them, creates `lead_matches`, sends SMS with claim link. Email notification to pro also sent (mocked if no SMTP).
- **Claim page** — Frontend `#claim/:token`: loads match by token, allows accept/decline. API: GET/POST `/api/matching/claim/:token`, POST `/api/matching/decline/:token`. Credit deduction and status updates correct.
- **Review by token** — GET/POST `/api/reviews/by-token/:token`: public review form for completed leads; works without auth.

### Pros & subscriptions
- **Pro signup** — Registration with role `pro`, creates `users` + `pros` record.
- **Pro dashboard** — Leads for pro, credits balance, subscription info. Subscription/checkout endpoints return 503 when Stripe is not configured (message: “Stripe is not configured”).
- **Plans list** — GET `/api/subscriptions/plans`: returns plans from DB (no Stripe required).
- **Credits** — Balance, history, and purchase flow. When Stripe is not configured, credits route falls back to adding credits directly (dev/test mode) so the app remains usable.

### Payments & Stripe
- **Create checkout (subscription)** — Returns 503 if no Stripe key; otherwise creates session and returns URL.
- **Buy credits** — Same 503 when Stripe not set. When set, creates checkout session.
- **Webhook** — POST `/api/payments/webhook`: returns 503 if Stripe not configured; with key, verifies signature and processes events. Raw body correctly used (mounted before `express.json()` in server.js).

### Settings & admin
- **Settings CRUD** — Admin can read/update settings by group (general, stripe, twilio, email, etc.). Test endpoints for SMS, email, Stripe, OpenAI return clear errors when not configured.
- **Categories, services, pages, templates** — CRUD and listing work; tenant-scoped.
- **How-it-works** — Admin editable; public endpoints for consumer/pro content.
- **Users, roles** — Admin list, create, edit, deactivate; superadmin can manage tenants.

### Frontend
- **Hash routing** — Home, login, register, forgot/reset password, verify email, claim, review, CMS page, tenant home, install, join (tenant signup). Stripe redirect query params (`?checkout=success`, `?credits=success`) handled.
- **Role redirects** — After login, admin/superadmin → admin dashboard, pro → pro dashboard, consumer → home. On “for-pros” page, logged-in pro is sent to pro dashboard.
- **Consumer signup modal** — Submit lead with spam protection (honeypot + timing). Uses `submitLead` API.
- **Pro signup modal** — Register as pro with tenant context.
- **Admin dashboard** — Tabs for users, leads, categories, services, plans, settings, pages, templates, how-it-works, reviews, superadmin (tenants). Lead detail view and back navigation work.
- **Profile page** — User profile and password change.
- **CMS pages** — Load by slug from `/api/pages/:slug`; footer fetches pages for nav.
- **Theme** — ThemeContext + ThemeCustomizer; dark/light and primary color.
- **Error boundary** — ErrorBoundary wraps app.
- **API base** — `VITE_API_URL` used at build time (e.g. `/api` on Heroku); `api.js` and AuthContext use same base.

### Infrastructure
- **Heroku** — Single app serves API + React SPA; Procfile and root `package.json` build frontend with `VITE_API_URL=/api`.
- **JawsDB** — DB pool uses `JAWSDB_URL` when set; schema includes `refresh_tokens` and `password_reset_tokens`.
- **CORS** — Allows all origins by default; optional `ALLOWED_ORIGINS` to restrict.
- **Sitemap / robots** — Served from server; use `FRONTEND_URL` for base URL.

---

## 2. What Isn’t Working / Gaps

- **Stripe flows** — Checkout and webhook are implemented and return 503 when Stripe isn’t configured. Once you add Stripe keys and webhook secret, you must set `STRIPE_WEBHOOK_SECRET` and point Stripe to `POST /api/payments/webhook`; no code bug found.
- **Email delivery** — All email (welcome, verification, password reset, lead confirmation, match notification, etc.) is mocked when SMTP is not set (log only). No runtime error; just no real mail until SMTP is configured.
- **SMS delivery** — Same: when Twilio isn’t configured, SMS is mocked (log only). Lead matching and claim links still work; pros just don’t get real SMS until Twilio is set.
- **getServices()** — Backend GET `/api/services` is public (no auth). Frontend uses `request()` which sends the token when present; the server accepts both. No change required; optional clarity: use `requestPublic('/services')` for the homepage if you want to avoid sending a token for anonymous users.
- **Google Analytics** — `GoogleAnalytics.jsx` is present; behavior depends on env/script (e.g. `VITE_GA_ID`). Not verified.
- **Superadmin tenant signup** — `TenantSignupPage` and `/api/install` or superadmin routes exist; flow depends on `SUPERADMIN_SECRET`. Not fully exercised; no obvious code error.

---

## 3. Improvements (Recommended)

1. **Services list for homepage**  
   - GET `/api/services` is already public. Optionally use `requestPublic('/services')` for the homepage so anonymous users don’t send a token.

2. **Token refresh on 401**  
   - AuthContext does not retry with refresh token on 401. Add a global fetch wrapper or axios interceptor: on 401, call POST `/api/auth/refresh` with `hp_refresh`, then retry the original request and update `hp_token`. Optionally clear tokens and redirect to login if refresh fails.

3. **Stripe webhook tenant**  
   - Webhook uses `getStripe()` with no tenant id. If you support multiple tenants with different Stripe keys, webhook should determine tenant from the event (e.g. `metadata.tenant_id` or customer lookup) and call `getStripe(tenantId)`.

4. **Credits purchase without Stripe**  
   - In `credits.js`, when Stripe is null, credits are added directly. Consider returning 503 and a clear “Stripe is not configured” message in production so production never grants credits without payment, or guard with `NODE_ENV !== 'production'`.

5. **Logging and monitoring**  
   - Add request id (e.g. `X-Request-Id`) in middleware and log it with errors so Heroku logs can be correlated. Optionally add a small health check that checks DB connectivity (e.g. `SELECT 1`).

6. **Input validation**  
   - Some routes rely on minimal checks (e.g. `email`, `service`). Consider a validation layer (e.g. Joi or express-validator) for body/query and consistent 400 messages.

7. **Rate limiting**  
   - Auth has rate limiting (e.g. login); consider global or per-route limits for `/api/leads` and other public endpoints to reduce abuse.

---

## 4. Future Enhancements

- **Email/SMS** — Configure SMTP and Twilio so welcome, verification, reset, lead confirmation, and match notifications are real.
- **Stripe** — Add Stripe keys and webhook secret; configure products/prices and webhook URL; test checkout and credit purchase end-to-end.
- **Refresh token rotation** — Issue new refresh token on use and optionally revoke old one; store family for “refresh token reused” detection.
- **Audit log** — `audit` is called for login; extend to sensitive actions (password change, role change, settings, etc.) and optionally expose in admin.
- **Pro dashboard** — More filters on leads, export, or simple analytics.
- **Custom domain** — Document how to set `custom_domain` for a tenant and DNS so tenant resolution works in production.
- **SEO** — Per-page meta tags (e.g. React Helmet) using CMS or config; sitemap already served.
- **E2E tests** — Playwright or Cypress for login, lead submit, claim flow, and admin CRUD.
- **i18n** — If multiple locales are needed, introduce a small i18n layer for frontend strings and emails.

---

## 5. Code Comments Added

Brief module-level comments were added to:

- **homepro-server/server.js** — Purpose of server (API + SPA), multi-tenant note.
- **homepro-server/db.js** — JAWSDB_URL / DATABASE_URL vs DB_*.
- **homepro-server/middleware/auth.js** — JWT and localhost tenant binding.
- **homepro-server/services/email.js** — Mock when SMTP not configured.
- **homepro-server/services/stripe.js** — getStripe returns null when no key; callers must handle.
- **homepro-server/services/sms.js** — Mock when Twilio not configured.
- **homepro/src/services/api.js** — BASE from VITE_API_URL.
- **homepro/src/App.jsx** — Hash routing and Stripe redirect handling.

No logic was changed; only comments for future maintainers.

---

## 6. Summary Table

| Area              | Status   | Notes                                                                 |
|-------------------|----------|-----------------------------------------------------------------------|
| Auth (login, register, JWT) | Working  | Refresh token stored; no auto-refresh on 401 yet.                     |
| Password reset / verify     | Working  | Email mocked if no SMTP.                                              |
| Leads (submit, list, detail)| Working  | Spam protection; matching runs; SMS/email mocked if not configured.   |
| Match & claim               | Working  | Scoring, SMS with claim link (mocked if no Twilio), claim/decline API. |
| Reviews (by token)         | Working  | Public form and API.                                                  |
| Pros & credits              | Working  | Balance/history; purchase uses Stripe or dev fallback.                |
| Subscriptions & Stripe      | Working  | 503 when Stripe not set; webhook and checkout code in place.          |
| Settings & admin            | Working  | Test endpoints report “not configured” where relevant.                 |
| Frontend routing & modals   | Working  | Hash routes and Stripe query params handled.                           |
| Email / SMS                 | By design| Mock when creds missing; no crash.                                    |
| Public services list        | Working | GET `/api/services` is public; frontend works with or without token.    |

Overall the app is in good shape for a first deploy: auth, leads, matching, claim, reviews, and admin flows work; missing email/Stripe only affect delivery and payment, and the code handles missing creds without failing.
