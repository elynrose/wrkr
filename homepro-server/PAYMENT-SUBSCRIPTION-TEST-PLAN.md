# Payment, Subscription & Credit Top-Up — Test Plan

Use this checklist to verify Stripe payments, subscriptions, and credit purchases end-to-end. Use **test mode** keys and the test card `4242 4242 4242 4242`.

---

## Prerequisites

- [ ] Stripe test keys set (env or Admin → Settings → Stripe): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] **Subscription plans** have **Stripe Price ID** set in Admin → Subscription plans (recurring price from [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products))
- [ ] **Webhook** for your environment:
  - **Local:** `stripe listen --forward-to localhost:3001/api/payments/webhook` running; copy `whsec_...` into `.env`
  - **Heroku:** Webhook endpoint in Stripe Dashboard pointing to `https://<your-app>.herokuapp.com/api/payments/webhook`; set `STRIPE_WEBHOOK_SECRET` in Heroku config
- [ ] A **Pro** user (role `pro`) with a Pro profile

---

## 1. Subscription (upgrade plan)

**Where:** Profile page (when logged in as Pro) → subscription section → **Upgrade** on a paid plan.

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Log in as a **Pro** user | Profile page loads |
| 1.2 | Open **Profile** | Subscription section shows current plan and other plans with "Upgrade" |
| 1.3 | Click **Upgrade** on a plan that has a Stripe Price ID | Redirect to Stripe Checkout (subscription) |
| 1.4 | On Stripe Checkout: use card `4242 4242 4242 4242`, any future expiry, any CVC | Payment succeeds |
| 1.5 | After payment | Redirect back to app with `?checkout=success`; toast "Subscription updated" (or similar) |
| 1.6 | Check subscription | Profile shows new plan; **Pro Dashboard** (or credits balance) shows updated plan and credits |
| 1.7 | (Optional) Stripe Dashboard | Subscription and invoice exist; webhook delivery for `checkout.session.completed` succeeded |

**If "Upgrade" fails:** Ensure the plan has **Stripe Price ID** in Admin → Subscription plans (e.g. `price_xxx`). Create a recurring price in Stripe Dashboard and paste it there.

---

## 2. Credit top-up (bundles) — Pro Dashboard

**Where:** Pro Dashboard → **Credits** tab → choose a bundle (e.g. 10, 25, 50, 100 credits) → **Buy** (or equivalent).

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | Log in as **Pro** | Pro Dashboard loads |
| 2.2 | Open **Credits** tab | Balance and list of bundles (10, 25, 50, 100 credits) are shown |
| 2.3 | Click **Buy** on a bundle (e.g. 10 Credits) | Redirect to Stripe Checkout (one-time payment) |
| 2.4 | Complete payment with `4242 4242 4242 4242` | Payment succeeds |
| 2.5 | After payment | Redirect back with `?credits=success`; toast about credits purchased |
| 2.6 | Check balance | Credits tab shows increased balance; **Credits** → **History** shows a "purchase" transaction |
| 2.7 | (Optional) Stripe Dashboard | Payment exists; webhook `checkout.session.completed` with `metadata.type: credit_purchase` delivered |

---

## 3. Payment history & invoices

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | After at least one successful payment | Profile or account area that shows **Payment history** / **Invoices** |
| 3.2 | Open payment history | List shows the subscription or credit purchase (amount, date, type) |
| 3.3 | (If implemented) Invoices | Subscription renewals appear as invoices |

---

## 4. Subscription management (cancel / resume / portal)

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | With an active subscription, use **Cancel** or **Manage billing** (if present) | Cancel at period end or redirect to Stripe Customer Portal |
| 4.2 | In Stripe Customer Portal | Can update payment method, view invoices, cancel subscription |
| 4.3 | After cancelling (at period end) | Webhook `customer.subscription.deleted`; app shows plan as canceled/free |

---

## 5. API smoke test (optional)

From repo root (with server running):

```bash
cd homepro-server
node scripts/test-payments-api.js
```

Or against Heroku:

```bash
BASE_URL=https://infinite-brushlands-77607-c3ea5b6dcaf2.herokuapp.com/api node scripts/test-payments-api.js
```

Requires `PRO_EMAIL` and `PRO_PASSWORD` env vars for a Pro user. The script checks: plans listed, balance, create-checkout returns URL, credits/purchase returns URL.

---

## Quick reference

| Feature | Frontend entry | API endpoint | Webhook event |
|---------|----------------|--------------|---------------|
| Subscription upgrade | Profile → Upgrade | `POST /api/payments/create-checkout` | `checkout.session.completed` (subscription) |
| Credit bundle purchase | Pro Dashboard → Credits → Buy | `POST /api/credits/purchase` | `checkout.session.completed` (credit_purchase) |
| Payment history | Profile / account | `GET /api/payments` | — |
| Invoices | Profile / account | `GET /api/payments/invoices` | `invoice.paid` |
| Cancel / resume | Profile | `POST /api/subscriptions/cancel`, `resume` | `customer.subscription.updated/deleted` |
| Billing portal | Profile | `POST /api/subscriptions/portal` | — |

Test card: **4242 4242 4242 4242**. More: [Stripe test cards](https://docs.stripe.com/testing#cards).
