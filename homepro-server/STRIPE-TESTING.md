# Testing Stripe Payments

Use **test mode** keys from the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) so no real charges are made.

## 1. Add test keys

**Option A – Environment (recommended for local/Heroku)**

- **Secret key:** `STRIPE_SECRET_KEY=sk_test_...`
- **Webhook signing secret:** `STRIPE_WEBHOOK_SECRET=whsec_...` (see Webhooks below)

**Option B – Admin UI**

- Log in as admin → **Settings** → **Stripe**
- Set **Stripe Secret Key** to `sk_test_...`
- Set **Webhook Secret** to `whsec_...` if you use webhooks (see below)

Env keys take precedence. After changing keys, restart the server (or save in Admin to clear the in-memory Stripe client cache).

## 2. Verify Stripe is connected

- In Admin → **Settings** → **Stripe**, click **Test connection** (calls Stripe balance API).
- Or call `POST /api/settings/test-stripe` as an authenticated admin.

## 3. Subscription plans (Stripe Price IDs)

Subscription checkout requires each plan to have a **Stripe Price ID** (`price_...`).

1. In [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products), create a product (e.g. “Starter”) and add a **recurring** price (monthly/yearly).
2. Copy the **Price ID** (e.g. `price_1ABC...`).
3. In Admin → **Subscription plans**, create or edit the plan and set **Stripe Price ID** to that value.

Without a price ID, “Upgrade” will return an error. One-time **credit purchases** do not need price IDs (they use inline `price_data`).

## 4. Webhooks (so subscriptions/credits are applied)

The app uses webhooks to:

- Activate a subscription and add plan credits after checkout
- Add credits after a one-time credit purchase
- Update/cancel subscription status and run monthly refills

**Local testing**

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Run:
   ```bash
   stripe listen --forward-to localhost:3001/api/payments/webhook
   ```
3. Copy the **webhook signing secret** (`whsec_...`) and set:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
4. Restart the API so it uses the new secret.

**Heroku (or any public URL)**

1. In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks), add endpoint:
   - URL: `https://your-app.herokuapp.com/api/payments/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`
2. Copy the **Signing secret** and set:
   ```bash
   heroku config:set STRIPE_WEBHOOK_SECRET=whsec_... -a your-app
   ```

If `STRIPE_WEBHOOK_SECRET` is not set in **production**, the webhook handler returns 503. In **development**, the server can accept unverified payloads when the secret is missing (for manual testing only).

## 5. Test cards (test mode)

| Scenario        | Number           |
|----------------|------------------|
| Success        | `4242 4242 4242 4242` |
| Decline        | `4000 0000 0000 0002` |
| 3D Secure      | `4000 0025 0000 3155` |

Use any future expiry, any CVC, and any postal code.  
More: [Stripe test cards](https://docs.stripe.com/testing#cards).

## 6. Quick test flow

1. Log in as a **Pro** user.
2. Go to **Profile** (or subscription/credits section).
3. Click **Upgrade** on a plan (subscription) or purchase credits (one-time).
4. You are redirected to Stripe Checkout; pay with `4242 4242 4242 4242`.
5. After success you are redirected back; the webhook should add the subscription/credits (check **Credits** / subscription status).

If credits or subscription don’t update after payment, check that the webhook is receiving events (Stripe Dashboard → Webhooks → endpoint → “Recent deliveries”) and that `STRIPE_WEBHOOK_SECRET` matches the endpoint’s signing secret.
