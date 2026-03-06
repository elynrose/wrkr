# Deploying the frontend to shared hosting

The **homepro** app is a Vite/React SPA. After building, you get static files (HTML, JS, CSS) that any web host can serve.

## 1. Build with your API URL

Point the build at your Heroku API (or any backend URL):

**Windows (PowerShell):**
```powershell
cd homepro
$env:VITE_API_URL="https://infinite-brushlands-77607-c3ea5b6dcaf2.herokuapp.com/api"
npm run build
```

**Windows (CMD):**
```cmd
cd homepro
set VITE_API_URL=https://infinite-brushlands-77607-c3ea5b6dcaf2.herokuapp.com/api
npm run build
```

**Linux / macOS:**
```bash
cd homepro
VITE_API_URL=https://your-heroku-app.herokuapp.com/api npm run build
```

This creates the `dist/` folder with `index.html` and assets.

## 2. Upload to shared hosting

- Upload the **contents** of `homepro/dist/` (not the `dist` folder itself) into your host’s web root (e.g. `public_html`, `www`, or `htdocs`).
- Ensure:
  - `index.html` is in the web root.
  - Your host serves `index.html` for all paths (SPA fallback). Many cPanel hosts do this if you rename `index.html` or use an `.htaccess` (Apache) rule.

### Apache (.htaccess) SPA fallback

If the host uses Apache and direct URLs (e.g. `/dashboard`) return 404, add this to the web root:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Nginx

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## 3. Set FRONTEND_URL on Heroku

So redirects (Stripe, emails, etc.) use your real frontend URL:

```bash
heroku config:set FRONTEND_URL=https://your-domain.com -a infinite-brushlands-77607
```

Replace `https://your-domain.com` with the URL where you uploaded the frontend (e.g. `https://www.yoursite.com`).

## Summary

| Step | Action |
|------|--------|
| 1 | Build with `VITE_API_URL=https://your-api-url/api` |
| 2 | Upload `dist/` contents to web root and enable SPA fallback if needed |
| 3 | Set `FRONTEND_URL` on Heroku to your frontend URL |
