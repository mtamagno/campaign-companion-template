# Deployment

## GitHub Pages

The repository includes `.github/workflows/pages.yml`. In the GitHub
repository settings:

1. Open **Pages**.
2. Choose **GitHub Actions** as the source.
3. Push to `main` or manually run the workflow.

The workflow builds with `/<repository-name>/` as the Angular base path and
adds `404.html` for client-side routing.

## Apache

Build with the path where the app will live:

```bash
npm ci
npm run build -- --base-href /campaigns/
```

Upload `dist/campaign-companion/browser/` to that directory and enable
`mod_rewrite`. Place this `.htaccess` beside `index.html`:

```apache
RewriteEngine On
RewriteBase /campaigns/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . index.html [L]
```

Use `/` for both values when deploying at the domain root.

## Nginx

```nginx
location /campaigns/ {
    alias /var/www/campaign-companion/;
    try_files $uri $uri/ /campaigns/index.html;
}
```

For a root deployment, use `root /var/www/campaign-companion;` and
`try_files $uri $uri/ /index.html;`.

## Updating

Campaign Companion is static. Rebuild and replace the generated folder after
changing JSON, images or code. Do not upload source `.env` files,
transcripts, Git metadata or `node_modules`.
