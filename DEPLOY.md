# Deploying HomePro to Railway

This guide covers deploying the **backend** and **frontend** to Railway, plus adding MySQL.

---

## 1. Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in (GitHub recommended).
2. **New Project** → **Deploy from GitHub repo** and connect your `wrkr` repo.
3. You will add two services: **MySQL** and **Backend (API)**. Optionally a third for the frontend, or serve it from the backend.

---

## 2. Add MySQL

1. In the project, click **+ New** → **Database** → **Add MySQL**.
2. Railway creates a MySQL instance and injects connection variables into the project. You can reference them in the API service.
3. Note: Railway exposes **`MYSQL_URL`** (or `MYSQLPUBLICURL`). The API uses this automatically; no need to set `DB_HOST` etc. when `MYSQL_URL` is set.

---

## 3. Deploy the backend (API)

You can deploy in either of two ways:

**Option A – Deploy from repo root (recommended)**  
- Do **not** set a Root Directory. Railway will use the root `package.json`, which runs `postinstall` (installs `homepro-server` deps) and `start` (runs the Node server from `homepro-server`). Root `railpack.json` and `railway.toml` tell Railway/Railpack how to build and start.

**Option B – Deploy from `homepro-server` only**  
- In the new service **Settings**, set **Root Directory** to **`homepro-server`**.  
- Build and start will run from that folder (`npm install` and `npm start` there).

After adding the service:
3. **Variables**: add (or link) the following. Railway will auto-inject **`MYSQL_URL`** if you add the MySQL plugin to this service (recommended: use **Variables** → **Add Reference** and pick the MySQL service’s `MYSQL_URL`).

   | Variable        | Value / Note |
   |-----------------|--------------|
   | `MYSQL_URL`     | From MySQL plugin (reference) or paste from MySQL service variables. |
   | `JWT_SECRET`    | Long random string (e.g. 32+ chars). |
   | `FRONTEND_URL`  | Your frontend URL, e.g. `https://your-frontend.up.railway.app` (for CORS). |
   | `NODE_ENV`      | `production` |
   | (optional) Stripe, Twilio, etc. | Same as local `.env` when you’re ready. |

4. **Link MySQL to the API service**: In the API service → **Variables** → **Add Reference** → choose the MySQL service → select **`MYSQL_URL`** (or **`MYSQLPUBLICURL`**). That way the API gets the DB URL automatically.
5. Deploy: push to your connected branch or trigger a deploy. Railway builds and runs `npm start` from `homepro-server`.

---

## 4. Run the database schema (first time)

The app does not run migrations automatically. After the first successful deploy:

1. **Option A – Railway CLI (recommended)**  
   Install [Railway CLI](https://docs.railway.app/develop/cli), then from your repo root:

   ```bash
   railway link   # select your project and API service
   railway run node homepro-server/run-schema.js
   ```

   If your schema runner uses env from the project, that will use the Railway-injected `MYSQL_URL`.

2. **Option B – Local with production URL**  
   In Railway → MySQL service → **Variables** → copy `MYSQL_URL`. Locally, run:

   ```bash
   cd homepro-server
   MYSQL_URL="mysql://..." node run-schema.js
   ```

3. **Option C – MySQL client**  
   Use any MySQL client (e.g. TablePlus, DBeaver) with the Railway MySQL host, user, password, and database from the service variables, and run the SQL in `homepro-server/schema.sql` (and any migrations like `migrate-reviews.js` if needed).

After the schema (and optional seed/migrations) are applied, the API will work against the Railway MySQL.

**Note:** `schema.sql` creates a database named `homepro`. If your Railway MySQL user cannot create databases, connect to the existing database (often `railway`) and run only the table statements from `schema.sql` (skip the `CREATE DATABASE` and `USE homepro` lines), or set `DB_NAME`/database in your URL to that existing database name.

---

## 5. Frontend: two options

### Option A – Separate frontend service on Railway

1. **+ New** → **GitHub Repo** → same repo.
2. **Settings**:
   - **Root Directory**: **`homepro`**.
   - **Build Command**: `npm ci && npm run build`.
   - **Start Command**: `npx serve -s dist -l $PORT`.
3. **Variables** (for the build so the client knows the API URL):
   - `VITE_API_URL` = `https://your-api-service.up.railway.app/api`  
     (use your real backend URL; no trailing slash, with `/api`).
4. In the **backend** service variables, set **`FRONTEND_URL`** to this frontend URL (e.g. `https://your-frontend.up.railway.app`) for CORS.
5. Deploy. The frontend will call the backend at `VITE_API_URL`.

### Option B – Single service (backend serves frontend)

1. Build the frontend locally with the production API URL:
   ```bash
   cd homepro
   VITE_API_URL=https://your-api.up.railway.app/api npm run build
   ```
2. Copy the build into the backend’s `public` folder:
   ```bash
   cp -r dist ../homepro-server/public
   # or on Windows: xcopy /E /I dist ..\homepro-server\public
   ```
3. Commit and push the `homepro-server/public` folder (or run this in CI/Railway build; see below).
4. Deploy only the **backend** service (root `homepro-server`). The API will serve the built React app from `public` when `NODE_ENV=production` and `public` exists.

To automate Option B on Railway, you’d set **Root Directory** to repo root and use a custom **Build Command** that installs and builds the frontend, copies `homepro/dist` to `homepro-server/public`, then installs backend deps; **Start Command**: `cd homepro-server && npm start`. That’s optional; many teams use Option A for clarity.

---

## 6. Twilio webhook (SMS)

For inbound SMS, Twilio must call your API:

- URL: `https://your-api.up.railway.app/api/sms/inbound`
- Method: **POST**.

Set this in the Twilio console for your phone number. No auth in the URL; your app handles the request.

---

## 7. Stripe webhook

In Stripe Dashboard → Developers → Webhooks, add an endpoint:

- URL: `https://your-api.up.railway.app/api/payments/webhook`
- Events: as needed for your payments (e.g. `checkout.session.completed`, etc.).

Set **`STRIPE_WEBHOOK_SECRET`** in the API service variables to the signing secret Stripe shows for that endpoint.

---

## 8. Checklist

- [ ] Railway project created, repo connected.
- [ ] MySQL added and **`MYSQL_URL`** referenced in API service.
- [ ] API service: root = `homepro-server`, start = `npm start`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`.
- [ ] Schema and migrations run once (e.g. `railway run node homepro-server/run-schema.js`).
- [ ] Frontend either: (A) separate service with `VITE_API_URL` and `serve`, or (B) built and copied to `homepro-server/public`.
- [ ] Twilio webhook URL and Stripe webhook URL set to your Railway API URL; secrets in variables.

Once this is done, the site is fully deployable on Railway with the database and (optionally) frontend on the same platform.
