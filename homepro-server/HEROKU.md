# Deploying HomePro to Heroku

## Already done

- **App:** https://infinite-brushlands-77607-c3ea5b6dcaf2.herokuapp.com
- **Git remote:** `heroku` (points to this app)
- **Add-on:** JawsDB MySQL (free tier) — `JAWSDB_URL` is set automatically
- **Config:** `FRONTEND_URL`, `JWT_SECRET` set (change `JWT_SECRET` in production)

## Deploy options

### A) API only (current)

Only the backend is deployed. Use this if you host the frontend elsewhere (Vercel, Netlify, or shared hosting). From the **repo root** (Wrkr):

```bash
git subtree push --prefix homepro-server heroku master
```

### B) Full-stack (API + frontend on one app)

The same Heroku app serves both the API and the React frontend. From the **repo root**:

```bash
git push heroku master
```

(Do **not** use `git subtree push` for this. The root `package.json` and `Procfile` run the server and build the frontend with `VITE_API_URL=/api` so the site and API are on the same origin.)

## One-time: run database schema (or migrate existing data)

JawsDB gives you an empty database. Either load the schema and seed data from `schema.sql`, or **migrate your current database**:

- **Migrate existing DB to Heroku:** see **[MIGRATE-DB-TO-HEROKU.md](./MIGRATE-DB-TO-HEROKU.md)**. You run a script locally that copies data from your current MySQL into JawsDB (using `MIGRATE_TARGET_URL` from `heroku config:get JAWSDB_URL`).

If you only need a fresh install, load the schema once:

1. Get the DB URL:
   ```bash
   heroku config:get JAWSDB_URL -a infinite-brushlands-77607
   ```
2. Connect with any MySQL client (e.g. MySQL Workbench, TablePlus, or `mysql` CLI) using that URL.
3. Run the contents of `homepro-server/schema.sql` (skip the `CREATE DATABASE`/`USE` lines if your client already connects to the right database).

Or from a machine with `mysql` and the URL:

```bash
mysql "YOUR_JAWSDB_URL" < homepro-server/schema.sql
```

(You may need to strip the first few lines of `schema.sql` that do `CREATE DATABASE` / `USE` if the URL already targets one database.)

## Optional config vars

Set these in Heroku when you’re ready:

- **SendGrid (email):** `SENDGRID_API_KEY` — if set, the app uses SendGrid SMTP for all outgoing email. In Admin → Settings → Email, enable "Email Enabled" and set **From Name** and **From Address** to a verified sender in your SendGrid account. No need to enter SMTP host/user/password in the UI.
- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Twilio (SMS):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- **Superadmin:** `SUPERADMIN_SECRET`
- **CORS:** `ALLOWED_ORIGINS` (comma-separated)

```bash
heroku config:set STRIPE_SECRET_KEY=sk_live_... -a infinite-brushlands-77607
# etc.
```

## Frontend and FRONTEND_URL

The API uses `FRONTEND_URL` for redirects (Stripe, emails, claim links, etc.).

- **Full-stack on Heroku (B):** Keep `FRONTEND_URL` as the same app URL (already set).
- **Frontend on shared hosting / Vercel / Netlify:** Set `FRONTEND_URL` to that site’s URL. See `homepro/SHARED-HOSTING.md` for building and uploading the frontend.

## Useful commands

- **Logs:** `heroku logs --tail -a infinite-brushlands-77607`
- **Config:** `heroku config -a infinite-brushlands-77607`
- **Open app:** `heroku open -a infinite-brushlands-77607`
