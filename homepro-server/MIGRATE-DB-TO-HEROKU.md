# Migrate current database to Heroku (JawsDB)

Use this to copy your existing MySQL data into the Heroku JawsDB database.

## 1. Ensure JawsDB has the schema

If you haven’t already, create tables on JawsDB by running `schema.sql` once (e.g. with a MySQL client using your `JAWSDB_URL`). The migration script only copies **data**; it does not create tables.

## 2. Get the JawsDB URL from Heroku

From your machine (with Heroku CLI):

```bash
heroku config:get JAWSDB_URL -a infinite-brushlands-77607
```

Copy the URL (e.g. `mysql://user:pass@host.herokuapp.com:3306/dbname`).

## 3. Run the migration script

**Source database** (where your data lives now):

- Your current `.env` in `homepro-server` (e.g. `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`), or
- Set `SOURCE_DATABASE_URL=mysql://user:pass@host:3306/homepro` if you prefer a single URL.

**Target database**: set the JawsDB URL from step 2.

**Windows (PowerShell):**

```powershell
cd homepro-server
$env:MIGRATE_TARGET_URL = "PASTE_JAWSDB_URL_HERE"
node migrate-db-to-heroku.js
```

**Windows (CMD):**

```cmd
cd homepro-server
set MIGRATE_TARGET_URL=PASTE_JAWSDB_URL_HERE
node migrate-db-to-heroku.js
```

**Linux / macOS:**

```bash
cd homepro-server
export MIGRATE_TARGET_URL="PASTE_JAWSDB_URL_HERE"
node migrate-db-to-heroku.js
```

The script will:

- Connect to your current DB (from `.env` or `SOURCE_DATABASE_URL`)
- Connect to JawsDB (from `MIGRATE_TARGET_URL`)
- For each table: delete existing rows on JawsDB, then copy all rows from source

## 4. Optional: one-liner with Heroku CLI

**PowerShell:**

```powershell
cd homepro-server
$env:MIGRATE_TARGET_URL = (heroku config:get JAWSDB_URL -a infinite-brushlands-77607); node migrate-db-to-heroku.js
```

**Bash:**

```bash
cd homepro-server
export MIGRATE_TARGET_URL=$(heroku config:get JAWSDB_URL -a infinite-brushlands-77607)
node migrate-db-to-heroku.js
```

## Notes

- Your **local** `.env` is used only for the **source** connection. The script does not change your app’s config; it only reads DB vars to connect and copy.
- If your current DB is remote, set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (and `DB_PORT` if needed) in `.env`, or use `SOURCE_DATABASE_URL`.
- JawsDB (free tier) has size limits; very large datasets may need to be migrated in chunks or during low traffic.
