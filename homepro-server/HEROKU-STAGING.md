# Heroku Staging Environment

A **staging** app lets you test deployments and config before production. Same codebase, separate app and database.

## 1. Create the staging app

From the repo root (Wrkr), create a new Heroku app and add a MySQL database:

```bash
# Create staging app (pick a name or Heroku will generate one)
heroku create wrkr-staging
# Or: heroku create   # gives a random name like "peaceful-ridge-12345"

# Add JawsDB MySQL (free tier) for staging DB
heroku addons:create jawsdb:kitefin -a wrkr-staging

# Add the staging app as a git remote so you can deploy to it
git remote add heroku-staging https://git.heroku.com/wrkr-staging.git
```

If you used a different app name, replace `wrkr-staging` with your app name in the `git remote add` URL (e.g. `https://git.heroku.com/peaceful-ridge-12345.git`).

## 2. Set config vars for staging

Point the staging app at its own URL and use **test** keys (Stripe test mode, etc.):

```bash
# Required: app URL and a distinct JWT secret for staging
heroku config:set FRONTEND_URL=https://wrkr-staging.herokuapp.com -a wrkr-staging
heroku config:set JWT_SECRET=your-staging-jwt-secret-different-from-production -a wrkr-staging

# Optional: Stripe TEST keys and webhook for staging
heroku config:set STRIPE_SECRET_KEY=sk_test_... -a wrkr-staging
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_... -a wrkr-staging
heroku config:set PUBLISHABLE_KEY=pk_test_... -a wrkr-staging

# Optional: SendGrid, Twilio, etc. (can use same or separate test config)
# heroku config:set SENDGRID_API_KEY=SG.... -a wrkr-staging
```

After adding a Stripe webhook for staging, create an endpoint in Stripe Dashboard pointing to `https://wrkr-staging.herokuapp.com/api/payments/webhook` and set `STRIPE_WEBHOOK_SECRET` to that endpoint’s signing secret.

## 3. Deploy to staging

From the repo root, push the same branch you use for production (e.g. `master`):

```bash
git push heroku-staging master
```

To deploy a different branch (e.g. `staging` or `develop`):

```bash
git push heroku-staging your-branch:master
```

## 4. Database: schema and optional data

Staging starts with an empty JawsDB. Either load the schema only (fresh staging DB) or copy data from production.

**Option A — Fresh schema only (recommended for staging):**

```bash
# Get the staging DB URL
heroku config:get JAWSDB_URL -a wrkr-staging

# Run migration that creates credit_bundles and seeds tenant 1
heroku run "node homepro-server/migrate-credit-bundles.js" -a wrkr-staging
```

Then load the rest of the schema (e.g. via MySQL client using `JAWSDB_URL`, run `homepro-server/schema.sql`), or run a single script that applies `schema.sql` if you have one.

**Option B — Copy from production (optional):**

Use your existing migrate script with the staging JawsDB URL as target so staging has a copy of production data. Prefer a separate JWT and Stripe test config so staging is isolated.

## 5. Remotes summary

| Remote            | Deploy command              | App / URL                    |
|-------------------|-----------------------------|------------------------------|
| `origin`          | `git push origin master`    | GitHub                       |
| `heroku`          | `git push heroku master`   | Production (infinite-brushlands-77607) |
| `heroku-staging`  | `git push heroku-staging master` | Staging (wrkr-staging)  |

List remotes: `git remote -v`

## 6. Optional: Heroku Pipelines

For a staged flow (e.g. deploy to staging first, then “promote” to production):

1. In [Heroku Dashboard](https://dashboard.heroku.com), create a **Pipeline**.
2. Add your **production** app (e.g. infinite-brushlands-77607) as the production stage.
3. Create or add the **staging** app and attach it to the same pipeline as the staging stage.
4. Deploy to staging from a branch; when satisfied, promote the same build to production.

Pipelines also support **Review Apps** (one app per PR) if you use GitHub integration.

## Quick reference

- **Staging URL:** `https://<your-staging-app-name>.herokuapp.com`
- **Logs:** `heroku logs --tail -a wrkr-staging`
- **Config:** `heroku config -a wrkr-staging`
- **Run migration on staging:** `heroku run "node homepro-server/migrate-credit-bundles.js" -a wrkr-staging`
