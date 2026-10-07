/* =====================================================================
   NEXT CARS SA — CONTENT & CONFIGURATION
   ---------------------------------------------------------------------
   Everything the business needs to fill in lives in this block.
   Empty values are shown on the website as visible "to be added"
   placeholders — nothing is invented.
   Free texts (descriptions, preparation steps, legal pages, reviews) can be
   a plain string (shown in every language) or per language:
   { de: '…', fr: '…', it: '…', en: '…' }
   ===================================================================== */

/* Logo used on the website (web-optimised copy of assets/img/logo-nextcars.png) */
const LOGO_SRC = 'assets/img/logo-nextcars-web.png';

/* ---------- 1. Business details ---------- */
const BUSINESS = {
  name: 'NEXT CARS SA',
  /* Phone numbers. Anything left empty (e.g. mobile / WhatsApp) stays hidden on the site. */
  phone: '+41 22 785 18 50',   // Téléphone (landline)
  mobile: '',        // Mobile / WhatsApp, e.g. '+41 78 000 00 00'
  whatsapp: '',      // WhatsApp number, international format, digits only, e.g. '41780000000'
  /* Public e-mail shown on the site (+ "send by e-mail" links). Empty = not shown.
     Form requests do NOT depend on this: they are e-mailed by api/lead.php (see leadEndpoint below). */
  email: '',
  /* Address + opening hours. Anything left empty stays hidden. */
  street: 'Chemin des Léchères 1',
  zip: '1217',
  city: 'Meyrin',
  mapQuery: 'Chemin des Léchères 1, 1217 Meyrin, Switzerland',   // address only, so Google places the pin exactly
  hours: [],         // e.g. [['Lu – Ve', '09:00 – 18:30'], ['Sa', '09:00 – 16:00']]
  /* Standard warranty — the same for every vehicle (whichever limit is reached first).
     A vehicle can override it with its own `warranty` text. */
  standardWarranty: { months: 12, km: 20000 },
  /* Official NEXT CARS SA profile on AutoScout24 (reviews are only taken from there) */
  autoscoutUrl: '',
  /* Social media — icons only appear once a real profile link is entered */
  instagram: '',
  facebook: '',
  /* Form submissions (hosting: Infomaniak):
     • leadEndpoint: every request (incl. photos) is sent to api/lead.php on the same hosting, which e-mails it.
       The recipient address is set in api/lead.php (server only, not visible in the website code).
     • netlifyForms: only for Netlify hosting (not used on Infomaniak).
     • Opened locally (file://) nothing can be sent. */
  netlifyForms: false,
  leadEndpoint: 'api/lead.php'
};
/* ---------- 2. Customer reviews — ONLY from the official NEXT CARS SA profile on AutoScout24 ----------
   Copy real reviews from AutoScout24 (customer's public name as shown there). While this list is
   empty, the whole review section is hidden.
   { author: 'M. Dupont', date: '2026-05-14', rating: 5, text: '…', url: 'https://www.autoscout24.ch/…' } */
const REVIEWS = [];
/* ---------- 3. Vehicle preparation + warranty ----------
   Fill "text" with the real NEXT CARS SA process. Empty text shows a placeholder. */
const PREP = [
  { icon: 'clip',   key: 'inspect',  text: '' },
  { icon: 'wrench', key: 'tech',     text: '' },
  { icon: 'spark',  key: 'clean',    text: '' },
  { icon: 'key',    key: 'handover', text: '' },
  { icon: 'shield', key: 'warranty', text: '' }   // empty = shows the standard warranty (BUSINESS.standardWarranty)
];

/* ---------- Technical inspection status (set per vehicle in the admin) ----------
   expertise = Expertisé · delivery = Expertise avant livraison · tbd = À convenir */
const INSPECTION = ['expertise', 'delivery', 'tbd'];

/* ---------- 4. Legal pages ---------- */
const INFO = {
  imprint: '',   // company name, address, UID / commercial register number, representatives
  privacy: ''    // privacy policy (Swiss FADP / nDSG)
};

/* ---------- 5. Admin access ----------
   The admin page opens only by clicking the logo 3 times, then asks for the password every time
   (a typed #/admin URL just shows the home page).
   Only a PBKDF2-SHA256 fingerprint of the password is stored here (600'000 rounds, random salt) — never the password.
   This is light protection: the site is static, so the check runs in the browser. It keeps visitors out of the admin
   page; publishing changes still requires access to GitHub / the hosting. Use a long, unique password.
   New password → run this and paste the printed object below:
   node -e "const c=require('crypto'),s=c.randomBytes(16).toString('hex');console.log(JSON.stringify({salt:s,iterations:600000,hash:c.pbkdf2Sync(process.argv[1],Buffer.from(s,'hex'),600000,32,'sha256').toString('hex')}))" "NEW-PASSWORD" */
const ADMIN_PASSWORD = {"salt":"12b82aa0fa496849b98391c38b225023","iterations":600000,"hash":"ed9dfcad1ee6171e0d614fc843aef17ab5d5c3532dcf34d82c7efd3470296852"};

/* Brands always shown under "Marken an Lager" on the home page, even when none is in stock right now
   (brands of cars in stock are added automatically) */
const HOME_EXTRA_BRANDS = ['Tesla'];

/* Site-level imagery */
const SITE_IMAGES = {
  hero:  '1616422285623-13ff0162193c',   // sportback on an alpine road
  sell:  '1568605117036-5fe5e7bab0b7',   // car on open road
  cta:   '1486496146582-9ffcd0b2b2b7',   // snowy mountains
  sellHero: '1485291571150-772bcfc10da5'
};
