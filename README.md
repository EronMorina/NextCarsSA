# NextCarsSA

Website of NEXT CARS SA: a static site (plain HTML, CSS and JavaScript, no build step), live on Vercel
(every push to `main` is published automatically). It also runs on Apache / Infomaniak.

## Structure

```
index.html                 page markup (all views, icons, form markers)
assets/
  css/styles.css           all styles
  js/config.js             business details, legal texts, preparation steps, site images  ← edit here
  js/vehicles.js           the vehicle list                                                ← edit here (or via the admin page)
  js/rims.js               the rim listings (Felgen)                                       ← edit here (or via the admin page)
  js/inventory.js          vehicle + rim helpers, filter options
  js/i18n.js               all UI texts in DE / FR / IT / EN
  js/app.js                application logic
  img/                     logos (logo-nextcars-web.png is the one shown on the site)
404.html                   page for unknown addresses
robots.txt                 crawler rules
api/lead.js                request forms → e-mail on Vercel (via an Infomaniak mailbox; settings in Vercel environment variables)
api/lead.php               request forms → e-mail on Infomaniak / Apache (settings in api/config.php)
api/config.php             PRIVATE (Infomaniak only): recipient e-mail address — not in GitHub, upload it by hand
api/config.example.php     template for api/config.php
vercel.json                Vercel: page addresses + security headers
.vercelignore              files Vercel does not publish (the PHP files, .htaccess, _headers)
.htaccess                  Apache / Infomaniak: page addresses, /api/lead → lead.php, security headers
_headers                   Netlify / Cloudflare Pages: security headers
```

The scripts are loaded in this order: `config` → `vehicles` → `rims` → `inventory` → `i18n` → `app`.

## Page addresses

Clean addresses, no `#`: `/`, `/fahrzeuge`, `/fahrzeug/<id>`, `/felgen`, `/felge/<id>`, `/eintausch`, `/ankauf`,
`/finanzierung`, `/kontakt`, `/favoriten`. The hosting serves `index.html` for them (`vercel.json` → `rewrites`,
`.htaccess` → `RewriteRule`); a new page needs its name added in both places and in `VIEW_PATHS` in `app.js`.
Old links with `#/…` (e.g. shared before) are redirected to the clean address automatically.
Opening `index.html` directly from the disk does not work any more — use a local web server.

## Admin page

Click the logo **3 times quickly** and enter the admin password. The password is asked every time the admin page is opened.
Typing `/admin` in the address bar never opens it, not even after unlocking: it just shows the home page.
Only a PBKDF2-SHA256 fingerprint of the password is stored (600'000 rounds, random salt), in `assets/js/config.js` →
`ADMIN_PASSWORD` (the command to create a new one is written next to it). Wrong passwords trigger a growing wait.
This is light protection for a static site: it keeps visitors out of the admin page, while publishing still requires
access to GitHub / the hosting. Use a long password that is not used anywhere else.

## Updating vehicles

- **Admin page:** open the admin page on the published site (see above), make the changes (they show as a preview in that browser only),
  then click **"Download updated vehicles.js"** and replace `assets/js/vehicles.js` with the downloaded file
  (on GitHub: upload it into `assets/js/` → Vercel publishes it).
- **By hand:** edit `assets/js/vehicles.js`. The field reference is at the top of that file.

## Rims / Felgen

Second category next to the cars (`/felgen`, detail pages `/felge/<id>`): search, filters (brand, size, width, bolt pattern,
ET, price, condition, fitting car, location), sorting, favourites, a "Felgen-Anfrage" request form (e-mailed like all
other requests) and "Passende Felgen" on car pages whose make/model is listed under a rim's `fits`.

- **Add / edit / sell:** admin page → tab **Felgen** → "Neue Felgen", edit, status *Im Verkauf / Verkauft / Ausgeblendet*,
  delete. Then **"Download updated rims.js"** and replace `assets/js/rims.js`. The field reference is at the top of that file.
- Sold listings stay visible (marked, sorted last) until deleted; hidden listings are not shown at all.
- Prices in CHF and EUR are compared by their number (no currency conversion) when filtering and sorting.

## Request forms (e-mail)

All forms post to `/api/lead`. Both scripts only accept requests from the website itself, allow 5 requests per visitor
per 10 minutes, validate the fields and attach only real images. Photos are shrunk in the browser first (max. 1600 px,
which also removes their GPS data) and kept under 4 MB in total.

- **Vercel (`api/lead.js`)** logs into an **Infomaniak mailbox** (SMTP over SSL, mail.infomaniak.com:465) and sends
  each request from it — no extra service, no npm packages, no DNS changes. One-time setup:
  1. Infomaniak Manager → Mail service of nextcars-sa.ch → create a mailbox, e.g. `website@nextcars-sa.ch` (or use an existing one).
  2. Vercel → Project → Settings → Environment Variables (Production):
     `SMTP_USER` = the mailbox address, `SMTP_PASS` = its password (type **Secret**), `LEAD_RECIPIENT` = who receives the requests.
     Optional: `SMTP_HOST` (default mail.infomaniak.com), `SMTP_PORT` (default 465).
  3. Redeploy (Deployments → … → Redeploy) so the variables take effect.
  Requests come from the mailbox address; "Reply" answers the customer directly. Errors are visible in
  Vercel → Project → Logs (they contain no personal data).
- **Infomaniak / Apache (`api/lead.php`)** uses PHP `mail()`. Upload `api/config.php` (not in GitHub) with the
  recipient address; create it from `api/config.example.php`.
- First test after going live: send a test request and check the inbox **and the spam folder** (mark it "not spam").

## Security notes

- **Content-Security-Policy** (in `vercel.json`, `.htaccess`, `_headers`): scripts only from this site, no inline
  JavaScript (no `onclick="…"` / `onerror="…"` attributes — use event listeners in `app.js`).
  Adding a service means adding its domain to the policy, e.g. a new image host → `img-src`.
- **Secrets** (mailbox password, recipient address) are never in GitHub: Vercel environment variables / `api/config.php`.
- **Google Maps** only loads after the visitor clicks "Karte laden".
- `.htaccess` blocks hidden files (`.git`, `.env`, …). Enable the HTTPS redirect there once a certificate is installed.

## Before going public

- Remove the `noindex` robots meta tags in `index.html` and the `X-Robots-Tag` header in `vercel.json` (and `.htaccess` / `_headers`).
- Fill in contact details, address, Impressum and Datenschutz in `assets/js/config.js`.
- Set up the request forms (see above) and send one test request from the live site.
