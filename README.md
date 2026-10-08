# NextCarsSA

Website of NEXT CARS SA: a static site (plain HTML, CSS and JavaScript, no build step).

## Structure

```
index.html                 page markup (all views, icons, form markers)
assets/
  css/styles.css           all styles
  js/config.js             business details, legal texts, preparation steps, site images  ← edit here
  js/vehicles.js           the vehicle list                                                ← edit here (or via #/admin)
  js/rims.js               the rim listings (Felgen)                                       ← edit here (or via #/admin)
  js/inventory.js          vehicle + rim helpers, filter options
  js/i18n.js               all UI texts in DE / FR / IT / EN
  js/app.js                application logic
  img/                     logos (logo-nextcars-web.png is the one shown on the site)
404.html                   page for unknown addresses
robots.txt                 crawler rules
api/lead.php               receives the request forms and e-mails them (PHP, Infomaniak)
api/config.php             PRIVATE: recipient e-mail address — not in GitHub, upload it to the hosting by hand
api/config.example.php     template for api/config.php
_headers, vercel.json, .htaccess   security headers for Netlify / Vercel / Apache (keep the three in sync)
```

The scripts are loaded in this order: `config` → `vehicles` → `rims` → `inventory` → `i18n` → `app`.

## Admin page

Click the logo **3 times quickly** and enter the admin password. The password is asked every time the admin page is opened.
Typing `#/admin` (or `/admin`) in the address bar never opens it, not even after unlocking: it just shows the home page.
Only a PBKDF2-SHA256 fingerprint of the password is stored (600'000 rounds, random salt), in `assets/js/config.js` →
`ADMIN_PASSWORD` (the command to create a new one is written next to it). Wrong passwords trigger a growing wait.
This is light protection for a static site: it keeps visitors out of the admin page, while publishing still requires
access to GitHub / the hosting. Use a long password that is not used anywhere else.

## Updating vehicles

- **Admin page:** open the admin page on the published site (see above), make the changes (they show as a preview in that browser only),
  then click **"Download updated vehicles.js"** and replace `assets/js/vehicles.js` with the downloaded file.
- **By hand:** edit `assets/js/vehicles.js`. The field reference is at the top of that file.

## Rims / Felgen

Second category next to the cars (`#/rims`, detail pages `#/rim/<id>`): search, filters (brand, size, width, bolt pattern,
ET, price, condition, fitting car, location), sorting, favourites, a "Felgen-Anfrage" request form (e-mailed like all
other requests) and "Passende Felgen" on car pages whose make/model is listed under a rim's `fits`.

- **Add / edit / sell:** admin page → tab **Felgen** → "Neue Felgen", edit, status *Im Verkauf / Verkauft / Ausgeblendet*,
  delete. Then **"Download updated rims.js"** and replace `assets/js/rims.js`. The field reference is at the top of that file.
- Sold listings stay visible (marked, sorted last) until deleted; hidden listings are not shown at all.
- Prices in CHF and EUR are compared by their number (no currency conversion) when filtering and sorting.

## Security notes

- **Content-Security-Policy** (in `_headers`, `vercel.json`, `.htaccess`): scripts only from this site, no inline
  JavaScript (no `onclick="…"` / `onerror="…"` attributes — use event listeners in `app.js`).
  Adding a service means adding its domain to the policy, e.g. a form endpoint (`BUSINESS.leadEndpoint`) → `connect-src`,
  a new image host → `img-src`.
- **Forms** (hosting: Infomaniak) are sent to `api/lead.php`, which e-mails each request (with photos as attachments)
  to the address in `api/config.php`. It only accepts requests from the website itself, limits each visitor
  to 5 requests per 10 minutes, validates the fields and only attaches real images. Photos are shrunk in the browser
  first (max. 1600 px), which also removes their GPS data. **Only deploy `api/` on a host that runs PHP** — elsewhere
  the file would be served as plain text.
- **`api/config.php` is not in GitHub** (see `.gitignore`), so the e-mail address stays private. When uploading the
  site to Infomaniak, upload that file too (into `/api`), otherwise requests fail with an error. To create it on another
  computer: copy `api/config.example.php` to `api/config.php` and enter the address.
- First test after upload: send a test request and check the inbox **and the spam folder** (mark it "not spam").
- **Google Maps** only loads after the visitor clicks "Karte laden".
- `.htaccess` blocks hidden files (`.git`, `.env`, …). Enable the HTTPS redirect there once a certificate is installed.

## Before going public

- Remove the `noindex` robots meta tags in `index.html` and the `X-Robots-Tag` header in the three hosting files.
- Fill in contact details, address, Impressum and Datenschutz in `assets/js/config.js`.
- Send one test request from the live site and confirm the e-mail arrives.
