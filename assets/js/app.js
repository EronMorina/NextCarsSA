/* =====================================================================
   NEXT CARS SA — APPLICATION LOGIC (vanilla JS, no build step)
   ===================================================================== */
(() => {
'use strict';

/* ---------- Language ---------- */
/* the visitor's own choice, else their browser's main language if auto-selected, else the fallback */
const LANG_KEY = 'nextcars-lang-v2';   // renamed once so choices saved before French became the default are forgotten
const browserLang = () => { const l = String((navigator.languages || [])[0] || navigator.language || '').slice(0, 2).toLowerCase(); return AUTO_LANGS.includes(l) ? l : VISITOR_FALLBACK_LANG; };
let lang = browserLang();
try { const saved = localStorage.getItem(LANG_KEY); if (LANGS.includes(saved)) lang = saved; } catch (e) { /* storage unavailable */ }
const li = () => LANGS.indexOf(lang);
const t = (k, vars) => {
  const e = I18N[k]; let s = e ? (e[li()] ?? e[0]) : k;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? '');
  return s;
};
/* free texts: string, or { de, fr, it, en } */
const loc = x => (x && typeof x === 'object') ? (x[lang] || x[DEFAULT_LANG] || Object.values(x)[0] || '') : (x || '');
/* L.fuel[key] etc. — rebuilt for the active language */
const L = {};
const buildLabels = () => Object.keys(LBL).forEach(g => { L[g] = {}; Object.entries(LBL[g]).forEach(([k, arr]) => L[g][k] = arr[li()] ?? arr[0]); });
buildLabels();
/* Messages sent to NEXT CARS SA (WhatsApp, e-mail, form summary) are always German */
const MSG_LANG = 'de';
const inLang = (l, fn) => { const prev = lang; if (prev === l) return fn(); lang = l; buildLabels(); try { return fn(); } finally { lang = prev; buildLabels(); } };
const tMsg = (k, vars) => inLang(MSG_LANG, () => t(k, vars));
/* Standard warranty (same for every vehicle unless a vehicle sets its own `warranty`) */
const stdW = () => ({ m: BUSINESS.standardWarranty.months, km: fmt(BUSINESS.standardWarranty.km) });
const stdWarrantyShort = () => t('warranty.short', stdW());
const stdWarrantyText = () => t('warranty.std', stdW());
const warrantyOf = v => v.warranty ? loc(v.warranty) : stdWarrantyShort();
/* Technical inspection status: Expertisé / Expertise avant livraison / À convenir */
const inspLabel = v => t('insp.' + (INSPECTION.includes(v.inspection) ? v.inspection : 'tbd'));

/* ---------- Utilities ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '’');
const chf = n => 'CHF ' + fmt(n);
const km = n => fmt(n) + ' km';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ico = (n, c = '') => `<svg class="ico ${c}"><use href="#i-${n}"/></svg>`;
const icoF = (n, c = '') => `<svg class="ico fill ${c}"><use href="#i-${n}"/></svg>`;
const kw = ps => Math.round(ps * 0.7355);
const RATE = 0.049;
const monthly = (price, down = 0.2 * price, months = 60, rate = RATE) => {
  const p = Math.max(price - down, 0), r = rate / 12;
  return p === 0 ? 0 : p * r / (1 - Math.pow(1 + r, -months));
};
const byId = id => VEHICLES.find(v => v.id === +id);
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const reg = v => `${MONTHS[v.month - 1]}/${v.year}`;
const nVeh = n => `${n} ${t(n === 1 ? 'veh.one' : 'veh.many')}`;
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const digits = s => String(s || '').replace(/\D/g, '');
const FALLBACK = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#E9E7E2'/><stop offset='1' stop-color='#F6F5F2'/></linearGradient></defs><rect width='400' height='300' fill='url(#g)'/><g fill='none' stroke='#A9A8A3' stroke-width='5' stroke-linecap='round' stroke-linejoin='round' transform='translate(140 105) scale(5)'><path d='M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2' stroke-width='1'/><circle cx='7' cy='17' r='2' stroke-width='1'/><circle cx='17' cy='17' r='2' stroke-width='1'/><path d='M9 17h6' stroke-width='1'/></g></svg>`);
const imgFail = img => { if (img.dataset.failed) return; img.dataset.failed = 1; img.src = FALLBACK; img.classList.add('ld'); };
/* Image load / error handling without inline on* attributes (allowed by the Content-Security-Policy):
   data-ld → fade in once loaded, data-fb → placeholder when the photo cannot be loaded */
document.addEventListener('load', e => { const i = e.target; if (i.tagName === 'IMG' && i.hasAttribute('data-ld')) i.classList.add('ld'); }, true);
document.addEventListener('error', e => { const i = e.target; if (i.tagName === 'IMG' && i.hasAttribute('data-fb')) imgFail(i); }, true);
const imgEl = (src, alt = '', lazy = true, cls = '') => `<img src="${esc(src)}" alt="${esc(alt)}" ${lazy ? 'loading="lazy"' : ''} decoding="async" class="${cls}" data-ld data-fb>`;
const gsrc = (g, w, h) => IMG(g.id, w, h, g.f);

/* ---------- Business helpers (placeholders instead of invented data) ---------- */
const tbd = k => `<span class="tbd">${esc(t(k))}</span>`;
const addrLine = () => [BUSINESS.street, [BUSINESS.zip, BUSINESS.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
const telHref = () => BUSINESS.phone ? 'tel:' + BUSINESS.phone.replace(/[^\d+]/g, '') : '';
/* wa.me works on mobile (opens the app) and desktop (WhatsApp Desktop / Web).
   Without a configured number, wa.me/?text= lets the user pick the chat. */
const waLink = text => `https://wa.me/${digits(BUSINESS.whatsapp).replace(/^00/, '')}?text=${encodeURIComponent(text)}`;
const vehicleUrl = v => `${location.origin}/fahrzeug/${v.id}`;
const waVehicleText = v => tMsg('wa.vehicle', { car: `${v.title} ${v.variant}`, url: vehicleUrl(v) });
/* WhatsApp buttons only exist while a WhatsApp number is configured */
const hasWa = () => !!digits(BUSINESS.whatsapp);
const waBtn = (v, cls = 'btn btn-wa', label = 'WhatsApp') => !hasWa() ? '' : `<a class="${cls}" data-wa href="${esc(waLink(waVehicleText(v)))}" target="_blank" rel="noopener">${icoF('wa')}${label}</a>`;

/* ---------- App state (in memory) ---------- */
const state = { favs: new Set(), rimFavs: new Set(), seg: 'all' };
const DEF = () => ({ q: '', make: [], model: '', pmin: 0, pmax: 0, ymin: 0, ymax: 0, km: 0, fuel: [], trans: [], psmin: 0, body: [], drive: [], color: [], premium: false });
let F = DEF();
let sortKey = 'rec';

/* ---------- Toasts ---------- */
function toast(msg, icon = 'check') {
  const el = document.createElement('div');
  el.className = 'toast'; el.innerHTML = ico(icon) + `<span>${msg}</span>`;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 2800);
}

/* ---------- Matching / filtering ---------- */
const SYN = { ev: 'electric', elektro: 'electric', électrique: 'electric', elettrico: 'electric', '4x4': 'awd', allrad: 'awd', quattro: 'awd', xdrive: 'awd', automat: 'automatic', cabrio: 'convertible', kombi: 'estate', mercedes: 'mercedes-benz', vw: 'volkswagen', hybrid: 'hybrid', phev: 'plug-in', benzin: 'petrol' };
function hay(v) { return `${v.make} ${v.model} ${v.variant} ${v.fuel} ${L.fuel[v.fuel]} ${v.body} ${L.body[v.body]} ${v.drive} ${v.trans} ${L.trans[v.trans]} ${v.color} ${v.engine} ${v.year}`.toLowerCase(); }
function match(v, f = F) {
  if (f.q) { const toks = f.q.toLowerCase().split(/\s+/).filter(Boolean); if (!toks.every(x => hay(v).includes(SYN[x] || x))) return false; }
  if (f.make.length && !f.make.includes(v.make)) return false;
  if (f.model && v.model !== f.model) return false;
  if (f.pmin && v.price < f.pmin) return false;
  if (f.pmax && v.price > f.pmax) return false;
  if (f.ymin && v.year < f.ymin) return false;
  if (f.ymax && v.year > f.ymax) return false;
  if (f.km && v.km > f.km) return false;
  if (f.psmin && v.ps < f.psmin) return false;
  if (f.fuel.length && !f.fuel.includes(v.fuel)) return false;
  if (f.trans.length && !f.trans.includes(v.trans)) return false;
  if (f.body.length && !f.body.includes(v.body)) return false;
  if (f.drive.length && !f.drive.includes(v.drive)) return false;
  if (f.color.length && !f.color.includes(v.color)) return false;
  if (f.premium && !(v.badges.includes('premium') || v.price >= 90000)) return false;
  return true;
}
const results = (f = F) => VEHICLES.filter(v => match(v, f));
const score = v => (v.badges.includes('top') ? 3 : 0) + (v.badges.includes('premium') ? 2 : 0) + (v.listed <= 2 ? 1.5 : 0) - v.listed * 0.08;
const SORTS = {
  rec: (a, b) => score(b) - score(a),
  new: (a, b) => a.listed - b.listed,
  pasc: (a, b) => a.price - b.price,
  pdesc: (a, b) => b.price - a.price,
  km: (a, b) => a.km - b.km,
  year: (a, b) => b.year - a.year || b.month - a.month
};

/* ---------- Card ---------- */
function badgeHtml(v) {
  return v.badges.map(b => `<span class="badge ${b}">${t(b === 'ev' && v.fuel !== 'Electric' ? 'badge.phev' : 'badge.' + b)}</span>`).join('');
}
function card(v) {
  const fav = state.favs.has(v.id);
  return `<article class="card" data-car="${v.id}">
    <div class="media">
      ${imgEl(IMG(v.img, 640, 480), v.title + ' ' + v.variant)}
      <div class="badges">${badgeHtml(v)}</div>
      <button class="fav ${fav ? 'on' : ''}" data-fav="${v.id}" aria-label="${esc(t(fav ? 'fav.remove' : 'fav.save'))}" aria-pressed="${fav}"><svg><use href="#i-heart"/></svg></button>
      <span class="imgcount">${ico('camera')}${v.gallery.length}</span>
    </div>
    <div class="c-body">
      <div><div class="c-title"><a class="c-link" href="/fahrzeug/${v.id}">${esc(v.title)}<span class="sr"> ${esc(v.variant)}, ${chf(v.price)}</span></a></div><div class="c-var">${esc(v.variant)}</div></div>
      <div class="specs">
        <span>${ico('cal')}${reg(v)}</span>
        <span>${ico('gauge')}${km(v.km)}</span>
        <span>${ico('fuel')}${L.fuel[v.fuel]}</span>
        <span>${ico('gear')}${L.trans[v.trans]}</span>
        <span>${ico('bolt')}${v.ps} PS</span>
        <span>${ico('wheel')}${v.drive === 'AWD' ? '4x4 / AWD' : v.drive}</span>
      </div>
      <div class="c-foot">
        <div><div class="price num">${chf(v.price)}</div><span class="wtag">${ico('clip')}${esc(inspLabel(v))}</span></div>
        ${hasWa() ? `<a class="wa-mini" data-wa href="${esc(waLink(waVehicleText(v)))}" target="_blank" rel="noopener" aria-label="${esc(t('wa.askFor', { car: v.title }))}">${icoF('wa')}</a>` : ''}
      </div>
    </div>
  </article>`;
}
const skeleton = n => Array.from({ length: n }, () => `<div class="card skc"><div class="media sk" style="border-radius:0"></div><div class="c-body"><div class="sk" style="height:18px;width:70%"></div><div class="sk" style="height:13px;width:45%"></div><div class="sk" style="height:46px"></div><div class="sk" style="height:24px;width:55%;margin-top:8px"></div></div></div>`).join('');

/* ---------- Favourites ---------- */
function toggleFav(id, kind = 'car') {
  id = +id; const set = kind === 'rim' ? state.rimFavs : state.favs, attr = kind === 'rim' ? 'data-rfav' : 'data-fav', on = !set.has(id);
  on ? set.add(id) : set.delete(id);
  $$(`[${attr}="${id}"]`).forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); const l = b.querySelector('.fl'); if (l) l.textContent = t(on ? 'fav.btnSaved' : 'fav.btnSave'); if (b.classList.contains('fav-inline')) b.style.color = on ? 'var(--gold-ink)' : ''; });
  updateFavCount();
  toast(t(on ? 'fav.saved' : 'fav.removed'), on ? 'heart' : 'x');
  if (currentView === 'favourites') renderFavs();
}
function updateFavCount() { const n = state.favs.size + state.rimFavs.size; $$('[data-favcount]').forEach(e => { e.textContent = n || ''; e.dataset.n = n; }); }

/* ---------- Options helpers ---------- */
const PRICE_STEPS = [10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 75000, 100000, 150000, 200000, 300000];
const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2012, 2010, 2005, 2000, 1990, 1980, 1970];
const KM_STEPS = [5000, 10000, 20000, 30000, 50000, 75000, 100000, 150000, 200000];
const PS_STEPS = [100, 150, 200, 250, 300, 400, 500, 600];
let MAKES = [];
const refreshMakes = () => { MAKES = [...new Set(VEHICLES.map(v => v.make))].sort((a, b) => a.localeCompare(b)); };
refreshMakes();
const opt = (v, l, sel) => `<option value="${esc(v)}" ${String(sel) === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
const opts = (any, list, sel, lab = x => x) => opt('', any, sel) + list.map(x => opt(x, lab(x), sel)).join('');
const countBy = (key, val) => VEHICLES.filter(v => v[key] === val).length;
const modelsOf = make => [...new Set(VEHICLES.filter(v => v.make === make).map(v => v.model))];

/* ---------- Hero search ---------- */
function fillHeroOptions() {
  const keep = id => $(id).value;
  const set = (id, html) => { const v = keep(id); $(id).innerHTML = html; $(id).value = v; };
  set('#hs-make', opts(t('opt.anyMake'), MAKES, '', m => `${m} (${countBy('make', m)})`));
  const m = $('#hs-make').value;
  set('#hs-model', opt('', t('opt.anyModel')) + (m ? modelsOf(m).map(x => opt(x, x)).join('') : ''));
  set('#hs-pmax', opts(t('opt.any'), PRICE_STEPS, '', chf));
  set('#hs-pmin', opts(t('opt.any'), PRICE_STEPS, '', chf));
  set('#hs-ymin', opts(t('opt.any'), YEARS, ''));
  set('#hs-ymax', opts(t('opt.any'), YEARS, ''));
  set('#hs-km', opts(t('opt.any'), KM_STEPS, '', km));
  set('#hs-fuel', opts(t('opt.any'), FUELS, '', x => L.fuel[x]));
  set('#hs-trans', opts(t('opt.any'), TRANS, '', x => L.trans[x]));
  set('#hs-body', opts(t('opt.any'), BODY_TYPES, '', x => L.body[x]));
  updateHeroCount();
}
function initHero() {
  $('#heroImg').src = IMG(SITE_IMAGES.hero, 2200, 1300);
  $('#heroImg').onerror = function () { this.remove(); };
  fillHeroOptions();
  $('#hs-make').addEventListener('change', e => {
    const m = e.target.value, mo = $('#hs-model');
    mo.innerHTML = opt('', t('opt.anyModel')) + (m ? modelsOf(m).map(x => opt(x, x)).join('') : '');
    mo.disabled = !m || !modelsOf(m).length;
  });
  $('#heroSearch').addEventListener('change', updateHeroCount);
  $('#heroSearch').addEventListener('submit', e => e.preventDefault()); // Enter in the keyword field must not reload the page
  $('#advToggle').addEventListener('click', () => { $('#spAdv').classList.toggle('open'); $('#advToggle').classList.toggle('open'); });
  $$('.sp-tab').forEach(b => b.addEventListener('click', () => { $$('.sp-tab').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); }); b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); state.seg = b.dataset.seg; updateHeroCount(); }));
  $('#hsGo').addEventListener('click', () => { F = heroFilters(); go('/fahrzeuge'); });
  $('#kw').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('.ac-i.hl')) { e.preventDefault(); F = heroFilters(); go('/fahrzeuge'); } });
  initAutocomplete();
  $$('[data-quick]').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.quick; F = DEF();
    if (q === 'ev-suv') { F.fuel = ['Electric', 'Plug-in hybrid']; F.body = ['SUV']; }
    if (q === 'u50') F.pmax = 50000;
    if (q === 'auto-awd') { F.trans = ['Automatic']; F.drive = ['AWD']; }
    if (q === 'lowkm') F.km = 30000;
    if (q === 'sports') { F.body = ['Coupé', 'Convertible']; F.psmin = 400; }
    go('/fahrzeuge');
  }));
}
function heroFilters() {
  const f = DEF(), v = id => $(id).value;
  f.q = $('#kw').value.trim();
  if (v('#hs-make')) f.make = [v('#hs-make')];
  f.model = v('#hs-model');
  f.pmin = +v('#hs-pmin') || 0; f.pmax = +v('#hs-pmax') || 0;
  f.ymin = +v('#hs-ymin') || 0; f.ymax = +v('#hs-ymax') || 0;
  f.km = +v('#hs-km') || 0;
  if (v('#hs-fuel')) f.fuel = [v('#hs-fuel')];
  if (v('#hs-trans')) f.trans = [v('#hs-trans')];
  if (v('#hs-body')) f.body = [v('#hs-body')];
  if (state.seg === 'ev') f.fuel = f.fuel.length ? f.fuel : ['Electric', 'Plug-in hybrid', 'Hybrid'];
  if (state.seg === 'premium') f.premium = true;
  return f;
}
function updateHeroCount() { $('#hsCount').textContent = t('hero.show', { n: nVeh(results(heroFilters()).length) }); }

/* ---------- Autocomplete ---------- */
function initAutocomplete() {
  const input = $('#kw'), box = $('#ac');
  let items = [], hi = -1;
  const pool = () => {
    const models = [...new Map(VEHICLES.map(v => [v.make + ' ' + v.model, { label: v.make + ' ' + v.model, type: 'Model', n: VEHICLES.filter(x => x.make === v.make && x.model === v.model).length, apply: f => { f.make = [v.make]; f.model = v.model; } }])).values()];
    const makes = MAKES.map(m => ({ label: m, type: 'Make', n: countBy('make', m), apply: f => { f.make = [m]; } }));
    const cats = [
      { label: t('cat.ev'), type: 'Category', n: countBy('fuel', 'Electric'), apply: f => { f.fuel = ['Electric']; } },
      { label: t('cat.phev'), type: 'Category', n: countBy('fuel', 'Plug-in hybrid'), apply: f => { f.fuel = ['Plug-in hybrid']; } },
      { label: t('cat.suv'), type: 'Category', n: countBy('body', 'SUV'), apply: f => { f.body = ['SUV']; } },
      { label: t('cat.conv'), type: 'Category', n: countBy('body', 'Convertible'), apply: f => { f.body = ['Convertible']; } },
      { label: t('cat.manual'), type: 'Category', n: countBy('trans', 'Manual'), apply: f => { f.trans = ['Manual']; } }
    ];
    return { models, makes, cats };
  };
  const hl = (s, q) => { const i = s.toLowerCase().indexOf(q); return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length)); };
  const render = () => {
    const q = input.value.trim().toLowerCase(), P = pool();
    let groups;
    if (!q) groups = [[t('ac.popular'), [P.models.find(m => m.label === 'Porsche 911'), P.cats[2], P.cats[0], P.models.find(m => m.label === 'BMW M4')].filter(Boolean)]];
    else {
      const f = x => x.label.toLowerCase().includes(q) || (SYN[q] && x.label.toLowerCase().includes(SYN[q]));
      groups = [[t('ac.makes'), P.makes.filter(f).slice(0, 3)], [t('ac.models'), P.models.filter(f).slice(0, 5)], [t('ac.cats'), P.cats.filter(f).slice(0, 3)]].filter(g => g[1].length);
    }
    items = groups.flatMap(g => g[1]); hi = -1;
    if (!items.length) { box.innerHTML = `<div class="ac-i" data-i="kw">${ico('search')}${esc(t('ac.searchFor', { q: input.value }))}</div>`; items = [{ kw: true }]; box.classList.add('open'); return; }
    let i = 0;
    box.innerHTML = groups.map(([h, arr]) => `<div class="ac-h">${h}</div>` + arr.map(x => `<div class="ac-i" data-i="${i++}">${ico(x.type === 'Category' ? 'sliders' : 'car')}<span>${hl(x.label, q)}</span><small>${nVeh(x.n)}</small></div>`).join('')).join('');
    box.classList.add('open');
  };
  const pick = idx => {
    const it = items[idx]; box.classList.remove('open');
    const f = heroFilters(); f.q = '';
    if (it && !it.kw) { it.apply(f); input.value = ''; } else f.q = input.value.trim();
    F = f; go('/fahrzeuge');
  };
  input.addEventListener('focus', render);
  input.addEventListener('input', render);
  input.addEventListener('keydown', e => {
    const els = $$('.ac-i', box);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); hi = (hi + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length; els.forEach((el, i) => el.classList.toggle('hl', i === hi)); }
    else if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); pick(+els[hi].dataset.i || 0); }
    else if (e.key === 'Escape') box.classList.remove('open');
  });
  box.addEventListener('mousedown', e => { const el = e.target.closest('.ac-i'); if (el) { e.preventDefault(); pick(el.dataset.i === 'kw' ? 0 : +el.dataset.i); } });
  document.addEventListener('click', e => { if (!e.target.closest('.kw')) box.classList.remove('open'); });
}

/* ---------- Home ---------- */
const BODY_SVG = {
  SUV: 'M9 25H4v-9l4-1 7-8h30l10 8 11 2 3 2v6h-4M22 25h30',
  Sedan: 'M9 25H4v-6l8-2 10-7h22l10 7 12 2 4 3v3h-4M22 25h30',
  Hatchback: 'M9 25H4v-6l8-3 9-8h26l7 9 9 1 3 3v4h-4M22 25h30',
  'Coupé': 'M9 25H4v-5l10-3 12-6h14l14 6 12 2 4 3v3h-4M22 25h30',
  Convertible: 'M9 25H4v-6l10-2h8l4-5 2 5h24l14 1 4 3v4h-4M22 25h30',
  Estate: 'M9 25H4v-6l8-2 10-8h38l5 8 7 1 2 3v4h-4M22 25h30'
};
function renderHome() {
  const byIds = ids => ids.map(byId).filter(Boolean);
  const featured = byIds([3, 1, 8, 11, 13, 7, 2, 14]);
  $('#featuredGrid').innerHTML = (featured.length ? featured : VEHICLES.slice(0, 8)).map(card).join('');
  $('#recentRail').innerHTML = [...VEHICLES].sort(SORTS.new).slice(0, 8).map(card).join('');
  const homeRims = RIMS.filter(rimOnSale).sort(RSORTS.new).slice(0, 8);
  $('#rimsHome').hidden = !homeRims.length; $('#rimRail').innerHTML = homeRims.map(rimCard).join('');
  const extra = (typeof HOME_EXTRA_BRANDS !== 'undefined' ? HOME_EXTRA_BRANDS : []).filter(b => !MAKES.includes(b));
  const brands = [...[...MAKES].sort((a, b) => countBy('make', b) - countBy('make', a) || a.localeCompare(b)), ...extra].slice(0, 10);
  $('#brandGrid').innerHTML = brands.map(b => `<button class="brand" data-brand="${esc(b)}"><div><div class="brand-name">${esc(b)}</div><div class="brand-count">${nVeh(countBy('make', b))}</div></div><span class="mono">${ico('arrow', 'sm')}</span></button>`).join('');
  $('#bodyGrid').innerHTML = BODY_TYPES.filter(b => countBy('body', b)).map(b => `<button class="body-t" data-bodyt="${b}"><svg viewBox="0 0 74 34"><path d="${BODY_SVG[b]}"/><circle cx="15.5" cy="25" r="5"/><circle cx="58.5" cy="25" r="5"/></svg>${L.body[b]}<small>${nVeh(countBy('body', b))}</small></button>`).join('');
  $('#prepGrid').innerHTML = prepHtml();
  $('#reviewsHome').innerHTML = reviewsHtml();
  $('#vleresimet').hidden = !REVIEWS.length;
  $('#contactHome').innerHTML = contactHtml();
  $('#sellVisual').src = IMG(SITE_IMAGES.sell, 1100, 940);
  $('#ctaImg').src = IMG(SITE_IMAGES.cta, 1800, 800);
}

/* Preparation + warranty (content comes from PREP) */
function prepHtml() {
  return PREP.map(p => { const txt = loc(p.text) || (p.key === 'warranty' ? `${stdWarrantyText()} ${t('warranty.ext')}` : ''); return `<div class="tcard"><div class="ticon">${ico(p.icon)}</div><h3>${esc(t(`prep.${p.key}.t`))}</h3><p>${esc(t(`prep.${p.key}.s`))}</p>${txt ? `<p style="margin-top:10px;color:var(--ink-2)">${esc(txt)}</p>` : ''}</div>`; }).join('');
}

/* Reviews: only real reviews from the official NEXT CARS SA profile on AutoScout24 (REVIEWS). Hidden while empty. */
function reviewsHtml() {
  const src = BUSINESS.autoscoutUrl ? `<div class="row"><a class="btn btn-line" href="${esc(BUSINESS.autoscoutUrl)}" target="_blank" rel="noopener">${ico('star', 'sm')}${t('rev.autoscout')}</a></div>` : '';
  if (!REVIEWS.length) return '';
  const stars = r => Array.from({ length: 5 }, (_, i) => `<svg class="${i < Math.round(r) ? '' : 'off'}"><use href="#i-star"/></svg>`).join('');
  const date = d => { const [y, m, dd] = String(d).split('-'); return dd ? `${dd}.${m}.${y}` : esc(d); };
  return `<div class="reviews">${REVIEWS.map(r => `<div class="rcard"><div class="r-top"><span class="r-stars" aria-label="${esc(t('rev.of5', { n: r.rating }))}">${stars(r.rating)}</span>${r.source ? `<span class="r-src">${ico('check', 'sm')}${esc(r.source)}</span>` : ''}</div><p>${esc(loc(r.text))}</p><div class="r-by"><b>${esc(r.author)}</b><span>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${date(r.date)}</a>` : date(r.date)}</span></div></div>`).join('')}</div>${src ? `<div style="margin-top:20px">${src}</div>` : ''}`;
}

/* Contact block (home + contact page) */
function contactHtml() {
  const B = BUSINESS, addr = addrLine(), mapQ = B.mapQuery || (addr ? `${B.name}, ${addr}` : '');
  const tel = n => 'tel:' + n.replace(/[^\d+]/g, '');
  const item = (ic, label, value) => `<div><span class="ci">${ic}</span><div><span>${label}</span>${value}</div></div>`;
  /* address, e-mail and opening hours only appear once they are confirmed in BUSINESS */
  const rows = [
    addr ? item(ico('pin'), t('c.address'), `<b>${esc(addr)}</b>`) : '',
    B.phone ? item(ico('phone'), t('c.phone'), `<a class="v" href="${tel(B.phone)}">${esc(B.phone)}</a>`) : '',
    B.mobile ? item(icoF('wa'), t('c.mobile'), `<a class="v" href="${tel(B.mobile)}">${esc(B.mobile)}</a>`) : '',
    B.email ? item(ico('mail'), t('c.email'), `<a class="v" href="mailto:${esc(B.email)}">${esc(B.email)}</a>`) : '',
    B.hours.length ? item(ico('clock'), t('c.hours'), B.hours.map(([d, h]) => `<b>${esc(loc(d))}: ${esc(h)}</b>`).join('')) : ''
  ].join('');
  const side = mapQ
    // Google Maps is only loaded after a click (no data goes to Google before that)
    ? `<div class="mapbox" data-map-src="${esc(`https://maps.google.com/maps?q=${encodeURIComponent(mapQ)}&z=15&hl=${lang}&output=embed`)}" data-map-title="${esc(t('map.title'))} – ${esc(B.name)}"><div class="map-consent"><p>${esc(t('map.consent'))}</p><button type="button" class="btn btn-dark btn-sm" data-map-load>${ico('pin', 'sm')}${t('map.load')}</button></div><a class="btn btn-white btn-sm map-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQ)}" target="_blank" rel="noopener">${ico('pin', 'sm')}${t('map.open')}</a></div>`
    : `<div class="dbox book-card"><h2>${t('c.bookTitle')}</h2><p class="book-sub">${t('appt.sub')}</p><ol class="flow">${t('td.flow').split('|').map(s => `<li>${esc(s)}</li>`).join('')}</ol><div class="row2"><button class="btn btn-primary" data-lead="testdrive">${ico('cal')}${t('sv.td.title')}</button><button class="btn btn-line" data-lead="inquiry">${ico('msg')}${t('lead.inquiry.title')}</button></div></div>`;
  return `<div class="contact">
    <div class="dbox">
      <h2>${esc(B.name)}</h2>
      <div class="appt">${ico('cal')}<div><b>${t('appt')}</b><span>${t('appt.sub')}</span></div></div>
      <div class="c-list">${rows}</div>
      <div class="row2" style="margin-top:0">
        ${hasWa() ? `<a class="btn btn-wa" data-wa href="${esc(waLink(tMsg('wa.general')))}" target="_blank" rel="noopener">${icoF('wa')}WhatsApp</a>` : ''}
        ${B.phone ? `<a class="btn btn-line" href="${tel(B.phone)}">${ico('phone')}${t('btn.call')}</a>` : ''}
        ${B.email ? `<a class="btn btn-line" href="mailto:${esc(B.email)}">${ico('mail')}${t('c.email')}</a>` : ''}
      </div>
    </div>
    ${side}
  </div>`;
}
/* ---------- Cars for sale: filters + results ---------- */
function renderFilters() {
  const facet = (key, val) => results({ ...F, [key]: [val] }).length;
  const check = (key, val, lab = val) => { const n = facet(key, val), on = F[key].includes(val); return `<label class="check ${!n && !on ? 'dis' : ''}"><input type="checkbox" data-f="${key}" value="${esc(val)}" ${on ? 'checked' : ''}><span>${esc(lab)}</span><small>${n}</small></label>`; };
  const pill = (key, val, lab = val) => `<button type="button" class="pill ${F[key].includes(val) ? 'on' : ''}" data-pill="${key}" data-v="${esc(val)}">${esc(lab)}</button>`;
  const oneMake = F.make.length === 1 ? F.make[0] : '';
  $('#fBody').innerHTML = `
    <div class="f-sec"><span class="flabel">${t('f.make')}</span><div class="checks">${MAKES.map(m => check('make', m)).join('')}</div></div>
    <div class="f-sec"><span class="flabel">${t('f.model')}</span><select class="select" data-s="model" ${oneMake ? '' : 'disabled'}>${opt('', oneMake ? t('opt.anyModel') : t('f.selectMakeFirst'), F.model)}${oneMake ? modelsOf(oneMake).map(m => opt(m, m, F.model)).join('') : ''}</select></div>
    <div class="f-sec"><span class="flabel">${t('f.priceCHF')}</span><div class="f-row"><select class="select" data-s="pmin" aria-label="${esc(t('f.priceFrom'))}">${opts(t('f.from'), PRICE_STEPS, F.pmin || '', fmt)}</select><select class="select" data-s="pmax" aria-label="${esc(t('f.priceTo'))}">${opts(t('f.to'), PRICE_STEPS, F.pmax || '', fmt)}</select></div></div>
    <div class="f-sec"><span class="flabel">${t('f.km')}</span><select class="select" data-s="km" aria-label="${esc(t('f.kmTo'))}">${opts(t('opt.any'), KM_STEPS, F.km || '', x => t('f.upTo', { x: km(x) }))}</select></div>
    <div class="f-sec"><span class="flabel">${t('f.firstReg')}</span><div class="f-row"><select class="select" data-s="ymin" aria-label="${esc(t('f.yearFrom'))}">${opts(t('f.from'), YEARS, F.ymin || '')}</select><select class="select" data-s="ymax" aria-label="${esc(t('f.yearTo'))}">${opts(t('f.to'), YEARS, F.ymax || '')}</select></div></div>
    <div class="f-sec"><span class="flabel">${t('f.fuel')}</span><div class="checks">${FUELS.map(x => check('fuel', x, L.fuel[x])).join('')}</div></div>
    <div class="f-sec"><span class="flabel">${t('f.trans')}</span><div class="pills">${TRANS.map(x => pill('trans', x, L.trans[x])).join('')}</div></div>
    <div class="f-sec"><span class="flabel">${t('f.power')}</span><select class="select" data-s="psmin" aria-label="${esc(t('f.power'))}">${opts(t('opt.any'), PS_STEPS, F.psmin || '', x => t('f.fromX', { x: `${x} PS (${kw(x)} kW)` }))}</select></div>
    <div class="f-sec"><span class="flabel">${t('f.body')}</span><div class="pills">${BODY_TYPES.map(x => pill('body', x, L.body[x])).join('')}</div></div>
    <div class="f-sec"><span class="flabel">${t('f.drive')}</span><div class="pills">${DRIVES.map(x => pill('drive', x, L.drive[x])).join('')}</div></div>
    <div class="f-sec"><span class="flabel">${t('f.color')}</span><div class="swatches">${Object.entries(COLORS).map(([n, c]) => `<button type="button" class="sw ${F.color.includes(n) ? 'on' : ''}" style="background:${c}" data-pill="color" data-v="${n}" title="${L.color[n]}" aria-label="${L.color[n]}"></button>`).join('')}</div></div>`;
}
function chipsList() {
  const c = [];
  if (F.q) c.push([`“${F.q}”`, () => F.q = '']);
  F.make.forEach(m => c.push([m, () => { F.make = F.make.filter(x => x !== m); F.model = ''; }]));
  if (F.model) c.push([F.model, () => F.model = '']);
  if (F.pmin) c.push([t('f.fromX', { x: chf(F.pmin) }), () => F.pmin = 0]);
  if (F.pmax) c.push([t('f.upTo', { x: chf(F.pmax) }), () => F.pmax = 0]);
  if (F.km) c.push([t('f.upTo', { x: km(F.km) }), () => F.km = 0]);
  if (F.ymin) c.push([t('chip.yearFrom', { x: F.ymin }), () => F.ymin = 0]);
  if (F.ymax) c.push([t('chip.yearTo', { x: F.ymax }), () => F.ymax = 0]);
  if (F.psmin) c.push([t('f.fromX', { x: F.psmin + ' PS' }), () => F.psmin = 0]);
  ['fuel', 'trans', 'body', 'drive'].forEach(k => F[k].forEach(x => c.push([L[k][x] || x, () => F[k] = F[k].filter(y => y !== x)])));
  if (F.premium) c.push(['Premium', () => F.premium = false]);
  return c;
}
let chipFns = [];
function renderResults(withSkeleton = true) {
  const list = results().sort(SORTS[sortKey]);
  const chips = chipsList(); chipFns = chips.map(c => c[1]);
  $('#chips').innerHTML = chips.map((c, i) => `<span class="chip">${esc(c[0])}<button data-chip="${i}" aria-label="${esc(t('chip.remove'))} ${esc(c[0])}">${ico('x')}</button></span>`).join('') + (chips.length ? `<button class="clear-all" data-clear>${t('chip.clearAll')}</button>` : '');
  $('#fCount').textContent = chips.length || ''; $('#fCount').dataset.n = chips.length;
  $('#resCount').innerHTML = `${nVeh(list.length)} <span>${t(list.length === 1 ? 'res.found1' : 'res.foundN')}</span>`;
  $('#fApply').textContent = t('f.showN', { n: list.length });
  $('#resTitle').textContent = F.make.length === 1 ? t('res.titleMake', { make: `${F.make[0]}${F.model ? ' ' + F.model : ''}` }) : t('nav.cars');
  $('#crumbLast').textContent = F.make.length === 1 ? F.make[0] : chips.length ? t('crumb.results') : t('crumb.all');
  const grid = $('#resGrid');
  const waHelp = hasWa() ? `<a class="btn btn-wa" data-wa href="${esc(waLink(tMsg('wa.searchMsg')))}" target="_blank" rel="noopener">${icoF('wa')}${t('wa.write')}</a>` : `<button class="btn btn-white" data-lead="inquiry">${ico('msg')}${t('lead.inquiry.title')}</button>`;
  const paint = () => {
    if (!list.length) {
      grid.innerHTML = `<div class="empty"><div class="e-ic">${ico('search')}</div><h2>${t('empty.t')}</h2><p>${t('empty.p')}</p><div class="row"><button class="btn btn-dark" data-clear>${t('empty.clear')}</button>${waHelp}</div></div>`;
      return;
    }
    const cards = list.map(card);
    if (cards.length > 6) cards.splice(6, 0, `<div class="promo-row"><div><b>${t('promo.t')}</b><span>${t('promo.s')}</span></div>${waHelp}</div>`);
    grid.innerHTML = cards.join('');
  };
  if (withSkeleton) { grid.innerHTML = skeleton(Math.min(Math.max(list.length, 3), 6)); clearTimeout(renderResults.tm); renderResults.tm = setTimeout(paint, 320); }
  else paint();
}
function refreshSearch(skel = true) { renderFilters(); renderResults(skel); }
function initSearch() {
  $('#sort').addEventListener('change', e => { sortKey = e.target.value; renderResults(); });
  const fb = $('#fBody');
  fb.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.f) { const k = el.dataset.f; F[k] = el.checked ? [...F[k], el.value] : F[k].filter(x => x !== el.value); if (k === 'make') F.model = ''; }
    if (el.dataset.s) { const k = el.dataset.s; F[k] = k === 'model' ? el.value : (+el.value || 0); }
    refreshSearch();
  });
  fb.addEventListener('click', e => {
    const p = e.target.closest('[data-pill]');
    if (p) { const k = p.dataset.pill, v = p.dataset.v; F[k] = F[k].includes(v) ? F[k].filter(x => x !== v) : [...F[k], v]; refreshSearch(); }
  });
  $('#chips').addEventListener('click', e => { const b = e.target.closest('[data-chip]'); if (b) { chipFns[+b.dataset.chip](); refreshSearch(); } });
  $('#fOpen').addEventListener('click', () => openFilters(true));
  $('#fClose').addEventListener('click', () => openFilters(false));
  $('#fApply').addEventListener('click', () => { openFilters(false); window.scrollTo({ top: 0, behavior: 'smooth' }); });
}
/* car (#filters) and rim (#rFilters) filter panels — slide-up sheet on mobile */
const anyFiltersOpen = () => $('#filters').classList.contains('open') || $('#rFilters').classList.contains('open');
function openFilters(open, sel = '#filters') {
  if (open) $(sel).classList.add('open'); else { $('#filters').classList.remove('open'); $('#rFilters').classList.remove('open'); }
  $('#scrim').classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

/* ---------- Vehicle detail ---------- */
let G = { v: null, i: 0 };
function renderCar(id) {
  const v = byId(id), root = $('#carView');
  if (!v) { root.innerHTML = `<div class="empty" style="margin:40px 0"><div class="e-ic">${ico('car')}</div><h2>${t('det.notFound')}</h2><p>${t('det.notFoundP')}</p><div class="row"><a class="btn btn-dark" href="/fahrzeuge">${t('nav.cars')}</a></div></div>`; $('#mbar').innerHTML = ''; return; }
  G = { v, i: 0 };
  const fav = state.favs.has(v.id);
  const similar = VEHICLES.filter(x => x.id !== v.id).map(x => [x, (x.body === v.body ? 2 : 0) + (x.make === v.make ? 2 : 0) + (Math.abs(x.price - v.price) < v.price * 0.35 ? 1.5 : 0)]).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
  const isEV = v.fuel === 'Electric';
  const warranty = warrantyOf(v), insp = inspLabel(v);
  const feats = v.features.map(loc), hl = v.hl.map(loc);
  const kf = [['cal', t('f.firstReg'), reg(v)], ['gauge', t('f.km'), km(v.km)], ['engine', t('f.engine'), loc(v.engine) || '—'], ['gear', t('f.trans'), L.trans[v.trans]], ['bolt', t('f.power'), `${v.ps} PS (${kw(v.ps)} kW)`], ['fuel', t('f.fuel'), L.fuel[v.fuel]], ['clip', t('insp.label'), insp], ['shield', t('det.warranty'), warranty]];
  const specs = [[t('f.make'), v.make], [t('f.model'), `${v.model} ${v.variant}`], [t('f.body'), L.body[v.body]], [t('f.firstReg'), reg(v)], [t('f.km'), km(v.km)], [t('f.engine'), loc(v.engine) || '—'], [t('sp.ccm'), v.ccm ? fmt(v.ccm) + ' cm³' : '—'], [t('f.power'), `${v.ps} PS / ${kw(v.ps)} kW`], [t('f.fuel'), L.fuel[v.fuel]], [t('f.trans'), `${L.trans[v.trans]}${v.gearbox ? ` (${loc(v.gearbox)})` : ''}`], [t('f.drive'), L.drive[v.drive]], ...(v.cons ? [[t(isEV ? 'sp.consEv' : 'sp.cons'), v.cons]] : []), ...(v.range ? [[t('sp.range'), loc(v.range)]] : []), ...(v.ext ? [[t('f.color'), v.ext]] : []), ...(v.int ? [[t('sp.int'), loc(v.int)]] : []), ...(v.doors ? [[t('sp.doors'), v.doors]] : []), ...(v.seats ? [[t('sp.seats'), v.seats]] : []), [t('insp.label'), insp], [t('det.warranty'), warranty], [t('sp.id'), 'NC-' + (240000 + v.id * 137)]];
  const showF = 12;
  const featItem = f => `<li><span class="ck">${ico('check')}</span>${esc(f)}</li>`;
  const phoneBtn = cls => BUSINESS.phone ? `<a class="${cls}" href="${telHref()}">${ico('phone')}${t('btn.call')}</a>` : '';
  const dealerBox = () => dealerBoxHtml(waBtn(v, 'btn btn-wa', t('dealer.askWa')));
  const fitRims = RIMS.filter(r => rimOnSale(r) && rimFitsCar(r, v)).slice(0, 8);
  const priceBlock = cls => `<div class="pbox ${cls}">
      <h1>${esc(v.title)}</h1><div class="variant">${esc(v.variant)}</div>
      <div class="bigprice num"><small>CHF</small>${fmt(v.price)}</div>
      <div class="tagrow"><span class="price-tag insp-tag">${ico('clip', 'sm')}${esc(t('insp.tagX', { x: '\u0000' })).replace('\u0000', `<b>${esc(insp)}</b>`)}</span><span class="price-tag" style="color:var(--gold-ink);background:var(--gold-50)">${ico('shield', 'sm')}${esc(t('det.warrantyX', { x: warranty }))}</span></div>
      <div class="mini-specs"><span>${ico('cal')}${reg(v)}</span><span>${ico('gauge')}${km(v.km)}</span><span>${ico('gear')}${L.trans[v.trans]}</span><span>${ico('fuel')}${L.fuel[v.fuel]}</span><span>${ico('bolt')}${v.ps} PS</span><span>${ico('wheel')}${L.drive[v.drive]}</span></div>
      <div class="act-grid">
        <button class="btn btn-primary btn-lg full" data-lead="testdrive" data-car="${v.id}">${ico('cal')}${t('sv.td.title')}</button>
        <button class="btn btn-dark full" data-lead="leasing" data-car="${v.id}">${ico('key', 'sm')}${t('lead.leasing.title')}</button>
        <button class="btn btn-line" data-lead="financing" data-car="${v.id}">${ico('bank', 'sm')}${t('svc.fin')}</button>
        <a class="btn btn-line" href="/eintausch?car=${v.id}">${ico('swap', 'sm')}${t('nav.trade')}</a>
        <button class="btn btn-line full" data-lead="inquiry" data-car="${v.id}">${ico('msg', 'sm')}${t('lead.inquiry.title')}</button>
        ${waBtn(v, 'btn btn-wa full')}
        ${phoneBtn('btn btn-ghost full')}
      </div>
      <p class="appt-note">${ico('cal', 'sm')}<span>${t('appt')}</span></p>
    </div>`;

  root.innerHTML = `
  <div class="det-top">
    <div style="display:flex;align-items:center;gap:10px;min-width:0">
      <button class="btn btn-line btn-sm" id="backBtn">${ico('back', 'sm')}${t('det.back')}</button>
      <div class="crumbs"><a href="/">${t('nav.home')}</a>${ico('right')}<a href="/fahrzeuge">${t('nav.cars')}</a>${ico('right')}<a href="/fahrzeuge" data-brand="${esc(v.make)}">${esc(v.make)}</a>${ico('right')}<b>${esc(v.model)}</b></div>
    </div>
    <div class="det-actions">
      <button class="btn btn-line btn-sm" id="shareBtn">${ico('share', 'sm')}<span class="hide-xs">${t('det.share')}</span></button>
      <button class="btn btn-line btn-sm fav-inline ${fav ? 'on' : ''}" data-fav="${v.id}" aria-pressed="${fav}" style="${fav ? 'color:var(--gold-ink)' : ''}">${ico('heart', 'sm')}<span class="fl">${t(fav ? 'fav.btnSaved' : 'fav.btnSave')}</span></button>
    </div>
  </div>
  <div class="det">
    <div>
      ${galleryHtml(v, badgeHtml(v))}
      ${priceBlock('pbox-mobile-only')}
      <div class="dbox"><h2>${t('det.keyfacts')}</h2><div class="keyfacts">${kf.map(k => `<div class="kf">${ico(k[0])}<span>${k[1]}</span><b>${esc(k[2])}</b></div>`).join('')}</div></div>
      <div class="dbox desc"><h2>${t('det.desc')}</h2><p>${esc(loc(v.desc))}</p><p style="color:var(--muted);font-size:14px">${t('det.descNote')}</p>${hl.length ? `<div class="hl">${hl.map(h => `<span class="tagline">${ico('check')}${esc(h)}</span>`).join('')}</div>` : ''}</div>
      ${feats.length ? `<div class="dbox"><h2>${t('det.equip')}</h2><ul class="feat" id="featList">${feats.slice(0, showF).map(featItem).join('')}</ul>${feats.length > showF ? `<button class="btn btn-line btn-sm feat-more" id="featMore">${t('det.showAllEq', { n: feats.length })}${ico('down', 'sm')}</button>` : ''}</div>` : ''}
      <div class="dbox"><h2>${t('det.tech')}</h2><div class="spec-tbl">${specs.map(s => `<div><span>${s[0]}</span><b>${esc(s[1])}</b></div>`).join('')}</div></div>
      <div class="dbox" id="warranty"><h2>${t('nav.warranty')}</h2>
        <p style="color:var(--ink-2)">${v.warranty ? `<b>${t('det.warranty')}:</b> ${esc(loc(v.warranty))}` : `<b>${esc(stdWarrantyText())}</b>`}</p>
        <p style="color:var(--ink-2);margin-top:8px">${esc(t('insp.tagX', { x: '\u0000' })).replace('\u0000', `<b>${esc(insp)}</b>`)}</p>
        <p style="color:var(--muted);font-size:14px;margin-top:6px">${t('warranty.ext')} ${t('det.wSee')}</p>
        <div class="row2"><button class="btn btn-dark btn-sm" data-lead="inquiry" data-car="${v.id}" data-extw="1">${ico('shield', 'sm')}${t('warranty.extBtn')}</button><a class="btn btn-line btn-sm" href="/?s=garancia">${t('k.prep')}</a></div>
      </div>
      <div class="dbox" id="fin"><h2>${t('det.finT')}</h2>
        <div class="fin">
          <div class="fin-ctrl">
            <div class="field"><label for="finPrice">${t('fin.price')}</label><div class="input-group"><span class="prefix">CHF</span><input class="input num" id="finPrice" inputmode="numeric" value="${fmt(v.price)}"></div></div>
            <div><div class="range-top"><span>${t('fin.down')}</span><b id="finDownL"></b></div><input type="range" id="finDown" min="0" max="50" step="5" value="20" aria-label="${esc(t('fin.down'))} %"></div>
            <div><div class="range-top"><span>${t('fin.dur')}</span><b id="finDurL"></b></div><div class="durs" id="finDur">${[24, 36, 48, 60, 72].map(d => `<button type="button" data-d="${d}" class="${d === 60 ? 'on' : ''}">${d}</button>`).join('')}</div></div>
          </div>
          <div class="fin-out">
            <span>${t('fin.est')}</span>
            <div class="m num" id="finM"></div>
            <dl><dt>${t('fin.amount')}</dt><dd id="finA"></dd><dt>${t('fin.rate')}</dt><dd>${(RATE * 100).toFixed(1)} %</dd><dt>${t('fin.interest')}</dt><dd id="finI"></dd><dt>${t('fin.total')}</dt><dd id="finT"></dd></dl>
            <p>${t('fin.disc')}</p>
          </div>
        </div>
        <div class="notice" style="margin-top:18px">${ico('bank')}<span>${t('bank.notice')}</span></div>
        <div class="row2"><button class="btn btn-dark" data-lead="financing" data-car="${v.id}">${ico('bank', 'sm')}${t('btn.reqFin')}</button><button class="btn btn-line" data-lead="leasing" data-car="${v.id}">${ico('key', 'sm')}${t('lead.leasing.title')}</button></div>
      </div>
      <div class="cta-box">${ico('swap', 'lead')}<div style="flex:1;min-width:220px"><b>${t('cta.tradeT')}</b><span>${t('cta.tradeS')}</span></div><a class="btn btn-white" href="/eintausch?car=${v.id}">${t('nav.tradeLong')}${ico('arrow', 'sm')}</a></div>
      <div class="cta-box">${ico('truck', 'lead')}<div style="flex:1;min-width:220px"><b>${t('nav.delivery')}</b><span>${t('cta.delS')}</span></div><button class="btn btn-primary" data-lead="delivery" data-car="${v.id}">${t('lead.delivery.title')}</button></div>
      <div class="dbox pbox-mobile-only"><h2>NEXT CARS SA</h2>${dealerBox()}</div>
    </div>
    <aside class="aside">
      ${priceBlock('pbox-desktop-only')}
      <div class="pbox pbox-desktop-only">${dealerBox()}</div>
    </aside>
  </div>
  ${fitRims.length ? `<section style="padding-bottom:28px">
    <div class="sec-head"><div><span class="kicker">${t('nav.rims')}</span><h2 style="font-size:24px">${t('rims.matching')}</h2></div><div class="rail-nav" data-rail="fitRail"><button aria-label="${esc(t('aria.prev'))}">${ico('left')}</button><button aria-label="${esc(t('aria.next'))}">${ico('right')}</button></div></div>
    <div class="rail" id="fitRail">${fitRims.map(rimCard).join('')}</div>
  </section>` : ''}
  <section style="padding-bottom:80px">
    <div class="sec-head"><div><h2 style="font-size:24px">${t('det.similar')}</h2></div><div class="rail-nav" data-rail="simRail"><button aria-label="${esc(t('aria.prev'))}">${ico('left')}</button><button aria-label="${esc(t('aria.next'))}">${ico('right')}</button></div></div>
    <div class="rail" id="simRail">${similar.map(card).join('')}</div>
  </section>`;

  bindGallery();
  const fm = $('#featMore'); if (fm) fm.addEventListener('click', () => { $('#featList').innerHTML = feats.map(featItem).join(''); fm.remove(); });
  $('#backBtn').addEventListener('click', () => { if (history.length > 1 && prevRoute) history.back(); else go('/fahrzeuge'); });
  $('#shareBtn').addEventListener('click', () => share(v));
  // Financing example
  const fp = $('#finPrice'), fd = $('#finDown'); let dur = 60;
  const calc = () => {
    const price = +fp.value.replace(/\D/g, '') || 0, pct = +fd.value, down = price * pct / 100, mo = monthly(price, down, dur), tot = mo * dur;
    fd.style.setProperty('--p', (pct / 50 * 100) + '%');
    $('#finDownL').textContent = `${chf(down)} (${pct} %)`; $('#finDurL').textContent = t('fin.months', { n: dur });
    $('#finM').innerHTML = `${chf(mo)} <small>${t('fin.perMonth')}</small>`;
    $('#finA').textContent = chf(price - down); $('#finI').textContent = chf(Math.max(tot - (price - down), 0)); $('#finT').textContent = chf(tot + down);
  };
  fp.addEventListener('input', () => { const n = fp.value.replace(/\D/g, ''); fp.value = n ? fmt(+n) : ''; calc(); });
  fd.addEventListener('input', calc);
  $('#finDur').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b) return; dur = +b.dataset.d; $$('#finDur button').forEach(x => x.classList.toggle('on', x === b)); calc(); });
  calc();
  // Mobile bottom action bar
  $('#mbar').innerHTML = `<div class="mp"><b class="num">${chf(v.price)}</b><span>${esc(v.title)} ${esc(v.variant)}</span></div>${waBtn(v, 'btn btn-wa', '<span class="hide-xs">WhatsApp</span>')}<button class="btn btn-primary" data-lead="testdrive" data-car="${v.id}">${ico('cal')}${t('btn.tdShort')}</button>`;
}
function setG(i) {
  const n = G.v.gallery.length; G.i = (i + n) % n;
  const img = $('#gImg'); if (!img) return;
  img.style.opacity = .3; img.dataset.failed = '';
  const src = gsrc(G.v.gallery[G.i], 1400, 875), pre = new Image();
  pre.onload = pre.onerror = () => { img.src = src; img.style.opacity = 1; };
  pre.src = src;
  $('#gCount').textContent = `${G.i + 1} / ${n}`;
  $$('#thumbs .thumb').forEach((b, k) => b.classList.toggle('on', k === G.i));
  const on = $('#thumbs .thumb.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  if ($('#lightbox').classList.contains('open')) lbPaint();
}
let lbReturn = null;
function openLB() { lbReturn = document.activeElement; $('#lightbox').classList.add('open'); document.body.style.overflow = 'hidden'; lbPaint(); focusSoon($('#lbClose')); }
function closeLB() {
  if (!$('#lightbox').classList.contains('open')) return;
  $('#lightbox').classList.remove('open'); document.body.style.overflow = '';
  if (lbReturn && document.contains(lbReturn)) lbReturn.focus({ preventScroll: true }); lbReturn = null;
}
function lbPaint() { $('#lbImg').src = gsrc(G.v.gallery[G.i], 1920, 1200); $('#lbCount').textContent = `${G.v.title} · ${G.i + 1} / ${G.v.gallery.length}`; }
/* Gallery + dealer box shared by the car and rim detail pages (G.v = the item shown) */
function galleryHtml(v, badges) {
  return `<div class="gallery">
        <div class="g-main" id="gMain">
          <img id="gImg" src="${esc(gsrc(v.gallery[0], 1400, 875))}" alt="${esc(v.title)}" data-fb>
          <div class="badges">${badges}</div>
          <button class="g-nav g-prev" data-g="-1" aria-label="${esc(t('det.prevImg'))}">${ico('left')}</button>
          <button class="g-nav g-next" data-g="1" aria-label="${esc(t('det.nextImg'))}">${ico('right')}</button>
          <button class="icon-btn g-full" id="gFull" style="background:rgba(255,255,255,.92)" aria-label="${esc(t('det.fullscreen'))}">${ico('expand')}</button>
          <span class="g-count">${ico('camera', 'sm')}<span id="gCount">1 / ${v.gallery.length}</span></span>
        </div>
        <div class="thumbs" id="thumbs">${v.gallery.map((g, i) => `<button class="thumb ${i ? '' : 'on'}" data-t="${i}" aria-label="${esc(t('det.img', { n: i + 1 }))}">${imgEl(gsrc(g, 240, 180), '', true)}</button>`).join('')}</div>
      </div>`;
}
function bindGallery() {
  $('#gMain').addEventListener('click', e => { const n = e.target.closest('[data-g]'); if (n) { e.stopPropagation(); setG(G.i + +n.dataset.g); } else if (e.target.closest('#gFull') || e.target.id === 'gImg') openLB(); });
  $('#thumbs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) setG(+b.dataset.t); });
  let x0 = null; const gm = $('#gMain');
  gm.addEventListener('touchstart', e => x0 = e.touches[0].clientX, { passive: true });
  gm.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) setG(G.i + (dx < 0 ? 1 : -1)); x0 = null; });
}
function dealerBoxHtml(waHtml) {
  const addr = addrLine();
  return `
      <div class="dealer-head"><img src="${LOGO_SRC}" alt="NEXT CARS SA"></div>
      <div class="seller-list">
        ${addr ? `<span>${ico('pin', 'sm')}${esc(addr)}</span>` : ''}
        <span>${ico('cal', 'sm')}<b style="font-weight:600">${t('appt')}</b></span>
        ${BUSINESS.phone ? `<span>${ico('phone', 'sm')}<a href="${telHref()}">${esc(BUSINESS.phone)}</a></span>` : ''}
      </div>
      <div class="btns" style="display:grid;gap:10px">
        ${waHtml}
        ${BUSINESS.phone ? `<a class="btn btn-line" href="${telHref()}">${ico('phone')}${t('btn.call')}</a>` : ''}
        <a class="btn btn-ghost" href="/kontakt">${ico('pin')}${t('dealer.contact')}</a>
      </div>`;
}
const share = v => shareLink(vehicleUrl(v), `${v.title} ${v.variant} – NEXT CARS SA`, `${v.title} ${v.variant} – ${chf(v.price)}`);
async function shareLink(url, title, text) {
  const data = { title, text, url };
  try { if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) { await navigator.share(data); return; } } catch (e) { return; }
  try { await navigator.clipboard.writeText(url); } catch (e) { /* clipboard unavailable (e.g. file://) */ }
  toast(t('det.linkCopied'), 'link');
}

/* =====================================================================
   RIMS / FELGEN — listings of NEXT CARS SA (assets/js/rims.js), built on the
   same patterns as the cars: cards, filters + chips, detail page, favourites, requests.
   ===================================================================== */
const rimById = id => RIMS.find(r => r.id === +id);
const rimLive = r => r.status !== 'hidden';            // shown on the site (on sale + sold)
const rimOnSale = r => r.status === 'active';
const rimUrl = r => `${location.origin}/felge/${r.id}`;
const money = (n, cur = 'CHF') => `${cur} ${fmt(n)}`;
const nRim = n => `${n} ${t(n === 1 ? 'rim.one' : 'rim.many')}`;
const rimQty = r => r.qty === 1 ? t('rim.qty1') : t('rim.qtyN', { n: r.qty });
const rimDim = r => `${r.size}″ × ${r.width} J`;
const rimFits = r => r.fits.map(f => [f.make, f.model, f.years].filter(Boolean).join(' '));
const dateCH = iso => { const [y, m, d] = String(iso).split('-'); return d ? `${d}.${m}.${y}` : iso; };
const RIM_PRICE_STEPS = [100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000];
const ET_STEPS = [-10, 0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
/* does a rim list this car (make + model) among the cars it fits? */
function rimFitsCar(r, v) {
  const lc = s => String(s || '').toLowerCase();
  return r.fits.some(f => lc(f.make) === lc(v.make) && (!f.model || lc(v.model).includes(lc(f.model).split(' ')[0]) || lc(f.model).includes(lc(v.model))));
}

/* ---------- Search + filters ---------- */
function rimHay(r) { return `${r.title} ${r.brand} ${r.size} ${r.size}" ${r.size}″ ${r.width}j ${r.width} ${r.pcd} et${r.et} et ${r.et} ${r.material} ${L.rimMat[r.material]} ${L.rimCond[r.condition]} ${rimFits(r).join(' ')} ${r.location || ''} ${loc(r.desc)}`.toLowerCase(); }
const RDEF = () => ({ q: '', brand: [], size: [], width: [], pcd: [], cond: [], etmin: '', etmax: '', pmin: 0, pmax: 0, make: '', model: '', loc: '' });
let RF = RDEF(), rSortKey = 'new';
function rimMatch(r, f = RF) {
  if (!rimLive(r)) return false;
  if (f.q) { const h = rimHay(r); if (!f.q.toLowerCase().split(/\s+/).filter(Boolean).every(x => h.includes(SYN[x] || x))) return false; }
  if (f.brand.length && !f.brand.includes(r.brand)) return false;
  if (f.size.length && !f.size.includes(String(r.size))) return false;
  if (f.width.length && !f.width.includes(String(r.width))) return false;
  if (f.pcd.length && !f.pcd.includes(r.pcd)) return false;
  if (f.cond.length && !f.cond.includes(r.condition)) return false;
  if (f.etmin !== '' && r.et < +f.etmin) return false;
  if (f.etmax !== '' && r.et > +f.etmax) return false;
  if (f.pmin && r.price < f.pmin) return false;
  if (f.pmax && r.price > f.pmax) return false;
  if (f.make && !r.fits.some(x => x.make === f.make && (!f.model || x.model === f.model))) return false;
  if (f.loc && r.location !== f.loc) return false;
  return true;
}
const rimResults = (f = RF) => RIMS.filter(r => rimMatch(r, f));
const RSORTS = { new: (a, b) => b.listed.localeCompare(a.listed) || b.id - a.id, pasc: (a, b) => a.price - b.price, pdesc: (a, b) => b.price - a.price };
/* sold listings always come last */
const rimSort = (list, key = rSortKey) => list.sort((a, b) => (a.status === 'sold') - (b.status === 'sold') || RSORTS[key](a, b));
function parseRimQuery(q) {
  const f = RDEF(), p = new URLSearchParams(q);
  ['brand', 'size', 'width', 'pcd', 'cond'].forEach(k => { if (p.get(k)) f[k] = p.get(k).split(','); });
  ['pmin', 'pmax'].forEach(k => { if (p.get(k)) f[k] = +p.get(k) || 0; });
  ['etmin', 'etmax'].forEach(k => { const v = p.get(k); if (v !== null && v !== '' && !isNaN(+v)) f[k] = String(+v); });
  ['q', 'make', 'model', 'loc'].forEach(k => { if (p.get(k)) f[k] = p.get(k).slice(0, 80); });
  return f;
}

/* ---------- Card ---------- */
function rimBadges(r) {
  return (r.status === 'sold' ? `<span class="badge sold">${t('rim.sold')}</span>` : '') + `<span class="badge ${r.condition === 'new' ? 'new' : ''}">${esc(L.rimCond[r.condition])}</span>`;
}
function rimCard(r) {
  const fav = state.rimFavs.has(r.id), price = money(r.price, r.currency);
  return `<article class="card ${r.status === 'sold' ? 'is-sold' : ''}" data-rim="${r.id}">
    <div class="media">
      ${imgEl(IMG(r.img, 640, 480), r.title)}
      <div class="badges">${rimBadges(r)}</div>
      <button class="fav ${fav ? 'on' : ''}" data-rfav="${r.id}" aria-label="${esc(t(fav ? 'fav.remove' : 'fav.save'))}" aria-pressed="${fav}"><svg><use href="#i-heart"/></svg></button>
      <span class="imgcount">${ico('camera')}${r.photos.length}</span>
    </div>
    <div class="c-body">
      <div><div class="c-title"><a class="c-link" href="/felge/${r.id}">${esc(r.title)}<span class="sr">, ${price}</span></a></div><div class="c-var">${esc(r.brand)} · ${esc(L.rimMat[r.material])}</div></div>
      <div class="specs">
        <span>${ico('rim')}${rimDim(r)}</span>
        <span>${ico('gear')}${esc(r.pcd)}</span>
        <span>${ico('sliders')}ET ${r.et}</span>
        <span>${ico('tag')}${rimQty(r)}</span>
        ${r.location ? `<span class="span2">${ico('pin')}${esc(r.location)}</span>` : ''}
      </div>
      <div class="c-foot"><div><div class="price num">${price}</div></div></div>
    </div>
  </article>`;
}

/* ---------- List page (/felgen) ---------- */
function renderRimFilters() {
  const live = RIMS.filter(rimLive);
  const uniq = fn => [...new Set(live.flatMap(r => [].concat(fn(r))).filter(x => x !== '' && x != null))];
  const byNum = (a, b) => a - b, byTxt = (a, b) => String(a).localeCompare(String(b));
  const facet = (k, v) => rimResults({ ...RF, [k]: [v] }).length;
  const check = (k, v, lab = v) => { const n = facet(k, v), on = RF[k].includes(v); return `<label class="check ${!n && !on ? 'dis' : ''}"><input type="checkbox" data-rf="${k}" value="${esc(v)}" ${on ? 'checked' : ''}><span>${esc(lab)}</span><small>${n}</small></label>`; };
  const pill = (k, v, lab = v) => `<button type="button" class="pill ${RF[k].includes(v) ? 'on' : ''}" data-rpill="${k}" data-v="${esc(v)}" aria-pressed="${RF[k].includes(v)}">${esc(lab)}</button>`;
  const sec = (label, html) => `<div class="f-sec"><span class="flabel">${label}</span>${html}</div>`;
  const makes = uniq(r => r.fits.map(f => f.make)).sort(byTxt);
  const models = RF.make ? uniq(r => r.fits.filter(f => f.make === RF.make).map(f => f.model || '')).sort(byTxt) : [];
  const locs = uniq(r => r.location || '').sort(byTxt);
  $('#rfBody').innerHTML = [
    sec(t('rf.brand'), `<div class="checks">${uniq(r => r.brand).sort(byTxt).map(b => check('brand', b)).join('')}</div>`),
    sec(t('rf.size'), `<div class="pills">${uniq(r => r.size).sort(byNum).map(s => pill('size', String(s), `${s}″`)).join('')}</div>`),
    sec(t('rf.width'), `<div class="pills">${uniq(r => r.width).sort(byNum).map(w => pill('width', String(w), `${w} J`)).join('')}</div>`),
    sec(t('rf.pcd'), `<div class="checks">${uniq(r => r.pcd).sort(byTxt).map(p => check('pcd', p)).join('')}</div>`),
    sec(t('rf.et'), `<div class="f-row"><select class="select" data-rs="etmin" aria-label="${esc(t('rf.etFrom'))}">${opts(t('f.from'), ET_STEPS, RF.etmin, x => 'ET ' + x)}</select><select class="select" data-rs="etmax" aria-label="${esc(t('rf.etTo'))}">${opts(t('f.to'), ET_STEPS, RF.etmax, x => 'ET ' + x)}</select></div>`),
    sec(t('rf.price'), `<div class="f-row"><select class="select" data-rs="pmin" aria-label="${esc(t('f.priceFrom'))}">${opts(t('f.from'), RIM_PRICE_STEPS, RF.pmin || '', fmt)}</select><select class="select" data-rs="pmax" aria-label="${esc(t('f.priceTo'))}">${opts(t('f.to'), RIM_PRICE_STEPS, RF.pmax || '', fmt)}</select></div>`),
    sec(t('rf.cond'), `<div class="pills">${RIM_CONDITIONS.map(c => pill('cond', c, L.rimCond[c])).join('')}</div>`),
    makes.length ? sec(t('rf.fits'), `<select class="select" data-rs="make" aria-label="${esc(t('rf.carMake'))}">${opt('', `${t('rf.carMake')}: ${t('opt.any')}`, RF.make)}${makes.map(m => opt(m, m, RF.make)).join('')}</select><select class="select" data-rs="model" aria-label="${esc(t('rf.carModel'))}" style="margin-top:8px" ${RF.make ? '' : 'disabled'}>${opt('', RF.make ? t('opt.anyModel') : t('f.selectMakeFirst'), RF.model)}${models.filter(Boolean).map(m => opt(m, m, RF.model)).join('')}</select>`) : '',
    locs.length > 1 ? sec(t('rf.location'), `<select class="select" data-rs="loc" aria-label="${esc(t('rf.location'))}">${opts(t('opt.any'), locs, RF.loc)}</select>`) : ''
  ].join('');
}
function rimChips() {
  const c = [], drop = (k, v) => () => { RF[k] = RF[k].filter(x => x !== v); };
  if (RF.q) c.push([`“${RF.q}”`, () => { RF.q = ''; $('#rQ').value = ''; }]);
  RF.brand.forEach(v => c.push([v, drop('brand', v)]));
  RF.size.forEach(v => c.push([`${v}″`, drop('size', v)]));
  RF.width.forEach(v => c.push([`${v} J`, drop('width', v)]));
  RF.pcd.forEach(v => c.push([v, drop('pcd', v)]));
  if (RF.etmin !== '' || RF.etmax !== '') c.push([`ET ${RF.etmin !== '' ? RF.etmin : '…'} – ${RF.etmax !== '' ? RF.etmax : '…'}`, () => { RF.etmin = ''; RF.etmax = ''; }]);
  if (RF.pmin) c.push([t('f.fromX', { x: fmt(RF.pmin) }), () => { RF.pmin = 0; }]);
  if (RF.pmax) c.push([t('f.upTo', { x: fmt(RF.pmax) }), () => { RF.pmax = 0; }]);
  RF.cond.forEach(v => c.push([L.rimCond[v], drop('cond', v)]));
  if (RF.make) c.push([`${RF.make}${RF.model ? ' ' + RF.model : ''}`, () => { RF.make = ''; RF.model = ''; }]);
  if (RF.loc) c.push([RF.loc, () => { RF.loc = ''; }]);
  return c;
}
let rChipFns = [];
function renderRimResults(withSkeleton = true) {
  const none = !RIMS.some(rimLive), list = rimSort(rimResults());
  const chips = rimChips(); rChipFns = chips.map(c => c[1]);
  $('#rWrap').classList.toggle('solo', none); $('#rFilters').hidden = none; $('#rTools').hidden = none;
  $('#rChips').innerHTML = chips.map((c, i) => `<span class="chip">${esc(c[0])}<button data-rchip="${i}" aria-label="${esc(t('chip.remove'))} ${esc(c[0])}">${ico('x')}</button></span>`).join('') + (chips.length ? `<button class="clear-all" data-rclear>${t('chip.clearAll')}</button>` : '');
  $('#rfCount').textContent = chips.length || ''; $('#rfCount').dataset.n = chips.length;
  $('#rCount').innerHTML = `${nRim(list.length)} <span>${t(list.length === 1 ? 'rims.found1' : 'rims.foundN')}</span>`;
  $('#rfApply').textContent = t('f.showN', { n: list.length });
  $('#rTitle').textContent = RF.brand.length === 1 ? t('rims.titleBrand', { brand: RF.brand[0] }) : t('nav.rims');
  $('#rCrumbLast').textContent = RF.brand.length === 1 ? RF.brand[0] : chips.length ? t('crumb.results') : t('crumb.all');
  const grid = $('#rGrid');
  const ask = `<button class="btn btn-primary" data-lead="rim">${ico('msg')}${t('lead.rim.title')}</button>${BUSINESS.phone ? `<a class="btn btn-line" href="${telHref()}">${ico('phone')}${t('btn.call')}</a>` : ''}`;
  const paint = () => {
    if (none) { grid.innerHTML = `<div class="empty"><div class="e-ic">${ico('rim')}</div><h2>${t('rims.emptyT')}</h2><p>${t('rims.emptyP')}</p><div class="row">${ask}</div></div>`; return; }
    if (!list.length) { grid.innerHTML = `<div class="empty"><div class="e-ic">${ico('search')}</div><h2>${t('rims.noMatchT')}</h2><p>${t('rims.noMatchP')}</p><div class="row"><button class="btn btn-dark" data-rclear>${t('empty.clear')}</button>${ask}</div></div>`; return; }
    grid.innerHTML = list.map(rimCard).join('');
  };
  if (withSkeleton && !none) { grid.innerHTML = skeleton(Math.min(Math.max(list.length, 3), 6)); clearTimeout(renderRimResults.tm); renderRimResults.tm = setTimeout(paint, 320); }
  else paint();
}
function refreshRims(skel = true) { renderRimFilters(); renderRimResults(skel); }
function initRims() {
  $('#rSort').addEventListener('change', e => { rSortKey = e.target.value; renderRimResults(); });
  let qt;
  $('#rQ').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { RF.q = e.target.value.trim().slice(0, 80); refreshRims(false); }, 220); });
  $('#rQForm').addEventListener('submit', e => { e.preventDefault(); clearTimeout(qt); RF.q = $('#rQ').value.trim().slice(0, 80); refreshRims(false); });
  const fb = $('#rfBody');
  fb.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.rf) { const k = el.dataset.rf; RF[k] = el.checked ? [...RF[k], el.value] : RF[k].filter(x => x !== el.value); }
    if (el.dataset.rs) { const k = el.dataset.rs; RF[k] = ['etmin', 'etmax', 'make', 'model', 'loc'].includes(k) ? el.value : (+el.value || 0); if (k === 'make') RF.model = ''; }
    refreshRims();
  });
  fb.addEventListener('click', e => {
    const p = e.target.closest('[data-rpill]');
    if (p) { const k = p.dataset.rpill, v = p.dataset.v; RF[k] = RF[k].includes(v) ? RF[k].filter(x => x !== v) : [...RF[k], v]; refreshRims(); }
  });
  $('#rChips').addEventListener('click', e => { const b = e.target.closest('[data-rchip]'); if (b) { rChipFns[+b.dataset.rchip](); refreshRims(); } });
  $('#rfOpen').addEventListener('click', () => openFilters(true, '#rFilters'));
  $('#rfClose').addEventListener('click', () => openFilters(false));
  $('#rfApply').addEventListener('click', () => { openFilters(false); window.scrollTo({ top: 0, behavior: 'smooth' }); });
}

/* ---------- Detail page (/felge/:id) — rendered into the vehicle detail view, reusing its gallery ---------- */
function renderRim(id) {
  const r = rimById(id), root = $('#carView');
  if (!r || !rimLive(r)) {
    root.innerHTML = `<div class="empty" style="margin:40px 0"><div class="e-ic">${ico('rim')}</div><h2>${t('rim.notFound')}</h2><p>${t('rim.notFoundP')}</p><div class="row"><a class="btn btn-dark" href="/felgen">${t('rims.viewAll')}</a><button class="btn btn-line" data-lead="rim">${ico('msg')}${t('lead.rim.title')}</button></div></div>`;
    $('#mbar').innerHTML = ''; return;
  }
  G = { v: r, i: 0 };
  const fav = state.rimFavs.has(r.id), sold = r.status === 'sold', price = money(r.price, r.currency), desc = loc(r.desc), fits = rimFits(r);
  const kf = [['rim', t('rf.size'), rimDim(r)], ['gear', t('rf.pcd'), r.pcd], ['sliders', t('rf.et'), `ET ${r.et}`], ['palette', t('rf.cb'), r.cb ? `${r.cb} mm` : '—'], ['tag', t('rf.qty'), rimQty(r)], ['clip', t('rf.cond'), L.rimCond[r.condition]]];
  const specs = [[t('rf.brand'), r.brand], [t('rf.size'), `${r.size}″`], [t('rf.width'), `${r.width} J`], [t('rf.pcd'), r.pcd], [t('rf.et'), `ET ${r.et}`], [t('rf.cb'), r.cb ? `${r.cb} mm` : '—'], [t('rf.material'), L.rimMat[r.material]], [t('rf.cond'), L.rimCond[r.condition]], [t('rf.qty'), rimQty(r)], ...(r.location ? [[t('rf.location'), r.location]] : []), [t('rim.listed'), dateCH(r.listed)], [t('rim.id'), 'NR-' + (510000 + r.id * 73)]];
  const similar = RIMS.filter(x => x.id !== r.id && rimOnSale(x)).map(x => [x, (x.pcd === r.pcd ? 3 : 0) + (x.size === r.size ? 2 : 0) + (x.brand === r.brand ? 1 : 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
  const wa = cls => hasWa() ? `<a class="${cls}" data-wa href="${esc(waLink(tMsg('wa.rim', { rim: r.title, url: rimUrl(r) })))}" target="_blank" rel="noopener">${icoF('wa')}WhatsApp</a>` : '';
  const call = cls => BUSINESS.phone ? `<a class="${cls}" href="${telHref()}">${ico('phone')}${t('btn.call')}</a>` : '';
  const priceBlock = cls => `<div class="pbox ${cls}">
      <h1>${esc(r.title)}</h1><div class="variant">${esc(r.brand)} · ${esc(L.rimMat[r.material])}</div>
      <div class="bigprice num"><small>${r.currency}</small>${fmt(r.price)}</div>
      <div class="tagrow">${sold ? `<span class="price-tag tag-sold">${t('rim.sold')}</span>` : ''}<span class="price-tag">${ico('clip', 'sm')}${esc(L.rimCond[r.condition])}</span><span class="price-tag" style="color:var(--gold-ink);background:var(--gold-50)">${ico('tag', 'sm')}${esc(rimQty(r))}</span></div>
      <div class="mini-specs"><span>${ico('rim')}${rimDim(r)}</span><span>${ico('gear')}${esc(r.pcd)}</span><span>${ico('sliders')}ET ${r.et}</span>${r.cb ? `<span>${ico('palette')}${r.cb} mm</span>` : ''}${r.location ? `<span>${ico('pin')}${esc(r.location)}</span>` : ''}</div>
      ${sold ? `<div class="notice" style="margin-bottom:14px">${ico('info')}<span>${t('rim.soldNote')}</span></div>` : ''}
      <div class="act-grid">
        <button class="btn btn-primary btn-lg full" data-lead="rim" data-rim="${r.id}">${ico('msg')}${t('lead.rim.title')}</button>
        ${wa('btn btn-wa full')}
        ${call('btn btn-line full')}
      </div>
    </div>`;
  root.innerHTML = `
  <div class="det-top">
    <div style="display:flex;align-items:center;gap:10px;min-width:0">
      <button class="btn btn-line btn-sm" id="backBtn">${ico('back', 'sm')}${t('det.back')}</button>
      <div class="crumbs"><a href="/">${t('nav.home')}</a>${ico('right')}<a href="/felgen">${t('nav.rims')}</a>${ico('right')}<a href="/felgen?brand=${encodeURIComponent(r.brand)}">${esc(r.brand)}</a>${ico('right')}<b>${esc(r.title)}</b></div>
    </div>
    <div class="det-actions">
      <button class="btn btn-line btn-sm" id="shareBtn">${ico('share', 'sm')}<span class="hide-xs">${t('det.share')}</span></button>
      <button class="btn btn-line btn-sm fav-inline ${fav ? 'on' : ''}" data-rfav="${r.id}" aria-pressed="${fav}" style="${fav ? 'color:var(--gold-ink)' : ''}">${ico('heart', 'sm')}<span class="fl">${t(fav ? 'fav.btnSaved' : 'fav.btnSave')}</span></button>
    </div>
  </div>
  <div class="det">
    <div>
      ${galleryHtml(r, rimBadges(r))}
      ${priceBlock('pbox-mobile-only')}
      <div class="dbox"><h2>${t('det.keyfacts')}</h2><div class="keyfacts">${kf.map(k => `<div class="kf">${ico(k[0])}<span>${k[1]}</span><b>${esc(k[2])}</b></div>`).join('')}</div></div>
      ${desc ? `<div class="dbox desc"><h2>${t('det.desc')}</h2><p>${esc(desc)}</p></div>` : ''}
      ${fits.length ? `<div class="dbox"><h2>${t('rf.fits')}</h2><ul class="feat">${fits.map(f => `<li><span class="ck">${ico('check')}</span>${esc(f)}</li>`).join('')}</ul></div>` : ''}
      <div class="dbox"><h2>${t('det.tech')}</h2><div class="spec-tbl">${specs.map(s => `<div><span>${s[0]}</span><b>${esc(s[1])}</b></div>`).join('')}</div>
        <div class="notice" style="margin-top:18px">${ico('info')}<span>${t('rim.fitNote')}</span></div></div>
      <div class="dbox pbox-mobile-only"><h2>NEXT CARS SA</h2>${dealerBoxHtml(wa('btn btn-wa'))}</div>
    </div>
    <aside class="aside">
      ${priceBlock('pbox-desktop-only')}
      <div class="pbox pbox-desktop-only">${dealerBoxHtml(wa('btn btn-wa'))}</div>
    </aside>
  </div>
  ${similar.length ? `<section style="padding-bottom:80px">
    <div class="sec-head"><div><h2 style="font-size:24px">${t('rims.similar')}</h2></div><div class="rail-nav" data-rail="simRail"><button aria-label="${esc(t('aria.prev'))}">${ico('left')}</button><button aria-label="${esc(t('aria.next'))}">${ico('right')}</button></div></div>
    <div class="rail" id="simRail">${similar.map(rimCard).join('')}</div>
  </section>` : '<div style="height:64px"></div>'}`;
  bindGallery();
  $('#backBtn').addEventListener('click', () => { if (history.length > 1 && prevRoute) history.back(); else go('/felgen'); });
  $('#shareBtn').addEventListener('click', () => shareLink(rimUrl(r), `${r.title} – NEXT CARS SA`, `${r.title} – ${price}`));
  $('#mbar').innerHTML = `<div class="mp"><b class="num">${price}</b><span>${esc(r.title)}</span></div>${wa('btn btn-wa')}<button class="btn btn-primary" data-lead="rim" data-rim="${r.id}">${ico('msg')}${t('lead.rim.submit')}</button>`;
}

/* ---------- Admin: rims tab ---------- */
const RIM_RAW_KEYS = ['id', 'title', 'price', 'currency', 'brand', 'size', 'width', 'pcd', 'et', 'cb', 'material', 'condition', 'qty', 'fits', 'location', 'desc', 'photos', 'listed', 'status'];
const rimRaw = r => { const o = {}; RIM_RAW_KEYS.forEach(k => { const x = r[k]; if (x === undefined || x === '' || (Array.isArray(x) && !x.length && k !== 'photos')) return; o[k] = x; }); return o; };
function afterRimChange() { saveDraft(); ADMIN_DRAFT = true; renderHome(); paintAdminBar(); }
function renderAdminRims(tabs) {
  $('#admRoot').innerHTML = `${tabs}<div class="adm-tools">
      <button class="btn btn-primary" data-adm="rim-new">${ico('plus')}${t('adm.rimNew')}</button>
      <button class="btn btn-dark" data-adm="rim-download">${ico('download')}${t('adm.downloadRims')}</button>
      <button class="btn btn-line" data-adm="rim-export">${ico('file')}${t('adm.exportJson')}</button>
      <label class="btn btn-line">${ico('upload')}${t('adm.importJson')}<input type="file" accept="application/json,.json" data-adm-rimport hidden></label>
      ${ADMIN_DRAFT ? `<button class="btn btn-ghost" data-adm="reset">${ico('x')}${t('adm.reset')}</button>` : ''}
    </div>
    ${ADMIN_DRAFT ? `<div class="notice" style="margin-bottom:14px">${ico('eye')}<span>${t('adm.draft')}</span></div>` : ''}
    <p class="adm-count">${nRim(RIMS.length)}</p>
    ${RIMS.length ? `<div class="adm-list">${RIMS.map(r => `<div class="adm-row">
      <img src="${esc(IMG(r.img, 192, 144))}" alt="" data-fb>
      <div class="adm-main"><b>${esc(r.title)}</b><span>${esc(r.brand)} · ${rimDim(r)} · ${esc(r.pcd)} · ET ${r.et}</span><small>${money(r.price, r.currency)} · ${rimQty(r)} · ID ${r.id}</small></div>
      <label class="adm-status"><span>${t('adm.status')}</span><select class="select" data-adm-rstatus="${r.id}">${RIM_STATUSES.map(s => opt(s, L.rimStatus[s], r.status)).join('')}</select></label>
      <div class="adm-acts">${rimLive(r) ? `<a class="btn btn-line btn-sm" href="/felge/${r.id}" aria-label="${esc(r.title)}">${ico('eye', 'sm')}</a>` : ''}<button class="btn btn-dark btn-sm" data-adm="rim-edit" data-id="${r.id}">${ico('edit', 'sm')}${t('adm.edit')}</button><button class="btn btn-ghost btn-sm" data-adm="rim-delete" data-id="${r.id}" aria-label="${esc(t('adm.delete'))}">${ico('trash', 'sm')}</button></div>
    </div>`).join('')}</div>` : `<div class="empty" style="padding:36px 20px"><div class="e-ic">${ico('rim')}</div><p>${t('adm.rimsNone')}</p></div>`}`;
}
function openRimEditor(id) {
  const r = id ? rimById(id) : null;
  const d = r ? rimRaw(r) : { id: Math.max(0, ...RIMS.map(x => x.id)) + 1, currency: 'CHF', size: 18, qty: 4, material: 'alloy', condition: 'used', status: 'active', location: [BUSINESS.zip, BUSINESS.city].filter(Boolean).join(' '), listed: todayISO() };
  admPhotos = r ? [...r.photos] : [];
  const fld = (k, label, html, req, full, help) => `<div class="field ${full ? 'full' : ''}" data-req="${req ? 1 : ''}"><label for="adm_${k}">${esc(label)}</label>${html}<span class="msg">${ico('info', 'sm')}<span></span></span>${help ? `<p class="hint" style="margin-top:6px">${esc(help)}</p>` : ''}</div>`;
  const inp = (k, attrs = '') => `<input class="input" id="adm_${k}" data-a="${k}" value="${esc(d[k] ?? '')}" ${attrs}>`;
  const sel = (k, list) => `<select class="select" id="adm_${k}" data-a="${k}">${list.map(([a, b]) => opt(a, b, d[k] ?? '')).join('')}</select>`;
  const fitsTxt = (d.fits || []).map(f => [f.make, f.model || '', f.years || ''].join(' | ').replace(/( \| )+$/, '')).join('\n');
  const brands = [...new Set(['BBS', 'OZ Racing', 'Borbet', 'Rial', 'Dezent', 'ATS', 'Ronal', 'AEZ', 'Vossen', 'Rotiform', 'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Volkswagen', ...RIMS.map(x => x.brand)])].sort((a, b) => a.localeCompare(b));
  openModal(`${mHead(esc(t(r ? 'adm.edit' : 'adm.rimNew')) + (r ? ' – ' + esc(r.title) : ''))}<form class="modal-b" id="admForm" novalidate>
    <div class="fgrid">
      ${fld('title', t('adm.rimTitle'), inp('title', 'maxlength="120"'), true, true)}
      ${fld('brand', t('rf.brand'), inp('brand', 'list="admBrands" maxlength="60"') + `<datalist id="admBrands">${brands.map(b => `<option value="${esc(b)}">`).join('')}</datalist>`, true)}
      ${fld('status', t('adm.status'), sel('status', RIM_STATUSES.map(s => [s, L.rimStatus[s]])), true)}
      ${fld('price', t('rf.price'), inp('price', 'inputmode="numeric" maxlength="9"'), true)}
      ${fld('currency', t('rf.currency'), sel('currency', [['CHF', 'CHF'], ['EUR', 'EUR']]), true)}
      ${fld('size', t('rf.size'), sel('size', RIM_SIZES.map(s => [s, `${s}″`])), true)}
      ${fld('width', t('rf.width'), inp('width', 'inputmode="decimal" maxlength="5" placeholder="8.5"'), true)}
      ${fld('pcd', t('rf.pcd'), inp('pcd', 'maxlength="10" placeholder="5x112"'), true)}
      ${fld('et', t('rf.et'), inp('et', 'inputmode="numeric" maxlength="4" placeholder="45"'), true)}
      ${fld('cb', `${t('rf.cb')} (mm)`, inp('cb', 'inputmode="decimal" maxlength="6" placeholder="66.6"'))}
      ${fld('qty', t('rf.qty'), sel('qty', RIM_QTY.map(n => [n, n === 1 ? t('rim.qty1') : t('rim.qtyN', { n })])), true)}
      ${fld('material', t('rf.material'), sel('material', RIM_MATERIALS.map(m => [m, L.rimMat[m]])), true)}
      ${fld('condition', t('rf.cond'), sel('condition', RIM_CONDITIONS.map(c => [c, L.rimCond[c]])), true)}
      ${fld('location', t('rf.location'), inp('location', 'maxlength="80"'), false, true)}
      ${fld('fits', t('rf.fits'), `<textarea class="textarea" id="adm_fits" data-a="fits" rows="3" maxlength="2000">${esc(fitsTxt)}</textarea>`, false, true, t('adm.fitsHelp'))}
      ${fld('desc', t('det.desc'), `<textarea class="textarea" id="adm_desc" data-a="desc" rows="3" maxlength="2000">${esc(loc(d.desc || ''))}</textarea>`, false, true)}
      <div class="full"><span class="flabel" style="display:block;margin-bottom:8px">${t('adm.photos')}</span><div class="ph-grid" id="admPh" style="margin-top:0"></div>
        <div class="adm-ph-add"><input class="input" id="admPhUrl" placeholder="https://…"><button type="button" class="btn btn-line btn-sm" data-adm="ph-url">${ico('plus', 'sm')}URL</button><label class="btn btn-line btn-sm">${ico('upload', 'sm')}${t('adm.upload')}<input type="file" accept="image/*" multiple id="admPhFile" hidden></label></div>
        <p class="field-note" id="admPhErr" hidden>${ico('info', 'sm')}<span>${t('adm.photoReq')}</span></p></div>
    </div>
    <div class="wz-foot" style="margin-top:8px"><button type="button" class="btn btn-line" data-close>${t('adm.cancel')}</button><button class="btn btn-primary" type="submit">${ico('check', 'sm')}${t('adm.save')}</button></div>
  </form>`, true);
  paintAdmPhotos();
  const form = $('#admForm');
  $('#admPhFile').onchange = async e => {
    for (const f of [...e.target.files]) { try { admPhotos.push(await shrinkImage(f)); } catch (err) { /* not an image */ } }
    e.target.value = ''; paintAdmPhotos(); if (admPhotos.length) $('#admPhErr').hidden = true;
  };
  form.onsubmit = e => {
    e.preventDefault();
    let ok = validate(form);
    const g = k => (($(`[data-a="${k}"]`, form) || {}).value || '').trim();
    const dec = k => g(k).replace(',', '.');
    const bad = (k, msg) => {
      const el = $(`[data-a="${k}"]`, form), f = el.closest('.field'), m = f.querySelector('.msg');
      f.classList.add('err'); m.id = m.id || `adm_${k}_msg`; m.querySelector('span').textContent = msg;
      el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', m.id);
      if (ok) el.focus(); ok = false;
    };
    if (g('price') && !(+digits(g('price')) > 0)) bad('price', t('adm.numErr'));
    if (g('width') && !/^\d{1,2}(\.\d{1,2})?$/.test(dec('width'))) bad('width', t('adm.numErr'));
    if (g('pcd') && !/^[3-8]x\d{2,3}(\.\d)?$/i.test(g('pcd').replace(/\s+/g, ''))) bad('pcd', t('adm.pcdErr'));
    if (g('et') && !/^-?\d{1,3}$/.test(g('et'))) bad('et', t('adm.numErr'));
    if (g('cb') && !/^\d{2,3}(\.\d{1,2})?$/.test(dec('cb'))) bad('cb', t('adm.numErr'));
    if (!admPhotos.length) { $('#admPhErr').hidden = false; ok = false; }
    if (!ok) return;
    const fits = g('fits').split('\n').map(l => l.split('|').map(s => s.trim().slice(0, 60))).filter(p => p[0]).slice(0, 30)
      .map(([make, model = '', years = '']) => ({ make, ...(model ? { model } : {}), ...(years ? { years } : {}) }));
    const nr = prepRim({ ...d, title: g('title'), brand: g('brand'), status: g('status'), price: +digits(g('price')), currency: g('currency'), size: +g('size'), width: +dec('width'), pcd: g('pcd').replace(/\s+/g, ''), et: +g('et'), cb: g('cb') ? +dec('cb') : '', qty: +g('qty'), material: g('material'), condition: g('condition'), location: g('location'), fits, desc: g('desc'), photos: [...admPhotos], listed: d.listed || todayISO() });
    const i = RIMS.findIndex(x => x.id === nr.id);
    if (i >= 0) RIMS[i] = nr; else RIMS.unshift(nr);
    afterRimChange(); closeModal(); renderAdmin(); toast(t('adm.saved'));
  };
}

/* ---------- Modals ---------- */
/* Focus an element that may still be fading in (elements are not focusable while visibility:hidden) */
const focusSoon = el => { el.focus({ preventScroll: true }); if (document.activeElement !== el) setTimeout(() => el.focus({ preventScroll: true }), 60); };
let modalReturn = null;
/* Dialog title + focus: the dialog is named by its heading and receives focus (focus goes back on close) */
function focusModal() {
  const m = $('#modal'), h = m.querySelector('h1,h2,h3');
  if (h) { h.id = 'modalTitle'; m.setAttribute('aria-labelledby', 'modalTitle'); } else m.removeAttribute('aria-labelledby');
  focusSoon(m);
}
function openModal(html, wide = false) {
  if (!$('#modalWrap').classList.contains('open')) modalReturn = document.activeElement;
  $('#modal').innerHTML = html; $('#modal').classList.toggle('wide', wide);
  $('#modalWrap').classList.add('open'); $('#modalWrap').setAttribute('aria-hidden', 'false');
  $('#modalWrap .scrim').classList.add('open'); document.body.style.overflow = 'hidden';
  $('#modal').scrollTop = 0;
  focusModal();
}
function closeModal() {
  const wasOpen = $('#modalWrap').classList.contains('open');
  $('#modalWrap').classList.remove('open'); $('#modalWrap .scrim').classList.remove('open'); $('#modalWrap').setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
  const a = document.activeElement;
  if (wasOpen && modalReturn && document.contains(modalReturn) && (!a || a === document.body || $('#modal').contains(a))) modalReturn.focus({ preventScroll: true });
  if (wasOpen) modalReturn = null;
}
const mHead = title => `<div class="modal-h"><h3>${title}</h3><button class="icon-btn" data-close aria-label="${esc(t('aria.close'))}">${ico('x')}</button></div>`;
/* In-page confirm: native confirm() is silently blocked in some in-app browsers and previews */
function askConfirm(msg, okLabel, onOk) {
  openModal(`${mHead(esc(msg))}<div class="modal-b"><div class="wz-foot" style="margin-top:4px"><button type="button" class="btn btn-line" data-close>${t('adm.cancel')}</button><button type="button" class="btn btn-primary" id="askOk">${okLabel}</button></div></div>`);
  $('#askOk').addEventListener('click', () => { closeModal(); onOk(); }, { once: true });
}
function validate(scope) {
  let ok = true;
  $$('.field', scope).forEach(f => {
    const el = f.querySelector('input:not([type=checkbox]):not([type=file]),select,textarea'); if (!el || el.disabled) return;
    const val = (el.value || '').trim(), ty = f.dataset.type; let m = '';
    if (f.dataset.req && !val) m = t(el.tagName === 'SELECT' ? 'v.select' : 'v.req');
    else if (val && ty === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) m = t('v.email');
    else if (val && ty === 'phone' && (!/^[+0-9 ()\/.-]+$/.test(val) || digits(val).length < 9)) m = t('v.phone');
    else if (val && ty === 'zip' && !/^\d{4}$/.test(val)) m = t('v.zip');
    else if (val && ty === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(val)) m = t('v.dateFmt');
    else if (val && ty === 'date' && val < todayISO()) m = t('v.datePast');
    f.classList.toggle('err', !!m); f.classList.toggle('ok', !m && !!val && el.tagName !== 'SELECT');
    const msg = f.querySelector('.msg');
    if (msg) { if (!msg.id && el.id) msg.id = el.id + '_msg'; if (msg.id) el.setAttribute('aria-describedby', msg.id); msg.querySelector('span').textContent = m; }
    el.setAttribute('aria-invalid', m ? 'true' : 'false');
    if (m) ok = false;
  });
  $$('[data-reqcheck]', scope).forEach(c => { c.setAttribute('aria-invalid', c.checked ? 'false' : 'true'); if (!c.checked) { ok = false; c.closest('label').style.color = 'var(--red)'; } else c.closest('label').style.color = ''; });
  const first = $('.field.err input,.field.err textarea,.field.err select', scope) || $$('[data-reqcheck]', scope).find(c => !c.checked); if (first) first.focus();
  return ok;
}

/* =====================================================================
   LEAD REQUESTS — leasing, financing, test drive, delivery (modal / inline)
   and trade-in / "we buy your car" (wizard). One submission pipeline.
   ===================================================================== */
const DURATIONS = [12, 24, 36, 48, 60];
const KM_YEAR = [10000, 15000, 20000, 25000, 30000, 40000];
const TIMES = (() => { const a = []; for (let h = 8; h <= 18; h++) ['00', '30'].forEach(m => a.push(`${String(h).padStart(2, '0')}:${m}`)); return a; })();
const F_NAME = () => ({ k: 'name', label: t('lead.name'), type: 'text', req: true, ac: 'name' });
const F_EMAIL = () => ({ k: 'email', label: t('lead.email'), type: 'email', req: true, ac: 'email' });
const F_PHONE = () => ({ k: 'phone', label: t('lead.phone'), type: 'phone', req: true, ac: 'tel', ph: '+41 …' });
const F_MSG = () => ({ k: 'message', label: t('lead.message'), type: 'textarea', req: false, full: true });
const F_VEH = () => ({ k: 'vehicle', label: t('lead.vehicle'), type: 'vehicle', req: true, full: true });
/* Built on demand so every label follows the active language */
function leadCfg(type) {
  const eg = x => t('ph.eg', { x });
  const base = { title: t(`lead.${type}.title`), submit: t(`lead.${type}.submit`), sub: t(`lead.${type}.sub`), notice: t(`lead.${type}.notice`), ok: t(`lead.${type}.ok`) };
  const bank = { k: 'bank', label: t('lead.bank'), sumLabel: t('sum.bank'), type: 'select', req: true, opts: [['BANK-now', 'BANK-now'], ['Cembra', 'Cembra'], ['none', t('bank.none')]], note: t('bank.notice2'), full: true };
  const extW = { k: 'extWarranty', label: t('lead.extWarranty'), sumLabel: t('sum.extWarranty'), hint: t('lead.extWarrantyHint'), type: 'check', full: true };
  const duration = { k: 'duration', label: t('lead.durationFin'), type: 'select', req: true, opts: DURATIONS.map(m => [m, t('lead.durOpt', { m, y: m / 12, yl: t(m === 12 ? 'unit.year1' : 'unit.yearN') })]), def: '48' };
  const kmyear = { k: 'kmyear', label: t('lead.kmyear'), type: 'select', req: true, opts: KM_YEAR.map(k => [k, t('lead.kmyearOpt', { x: fmt(k) })]), def: '15000' };
  if (type === 'leasing') return { ...base, icon: 'key', fields: [F_VEH(),
    { k: 'down', label: t('lead.down'), type: 'money', req: true, ph: eg('10’000') },
    { k: 'currency', label: t('lead.currency'), type: 'select', req: true, opts: [['CHF', 'CHF'], ['EUR', '€ (EUR)']], def: 'CHF' },
    duration, kmyear, bank, extW, F_NAME(), F_PHONE(), F_EMAIL(), F_MSG()] };
  if (type === 'financing') return { ...base, title: t('btn.reqFin'), icon: 'bank', fields: [F_VEH(),
    { k: 'down', label: t('lead.downCHF'), type: 'money', req: true, ph: eg('10’000') },
    { k: 'monthly', label: t('lead.monthly'), type: 'money', req: false, ph: eg('600') },
    duration, kmyear, bank, extW, F_NAME(), F_PHONE(), F_EMAIL(), F_MSG()] };
  if (type === 'testdrive') return { ...base, title: t('sv.td.title'), icon: 'cal', fields: [F_VEH(),
    { k: 'purpose', label: t('td.purpose'), type: 'select', req: true, opts: [['testdrive', t('td.drive')], ['visit', t('td.visit')]], def: 'testdrive', full: true },
    { k: 'date', label: t('lead.date'), type: 'date', req: true },
    { k: 'time', label: t('lead.time'), type: 'select', req: true, opts: TIMES.map(x => [x, x]), any: t('lead.chooseTime') },
    extW, F_NAME(), F_EMAIL(), F_PHONE(), F_MSG()] };
  if (type === 'delivery') return { ...base, submit: t('lead.delivery.title'), icon: 'truck', fields: [F_VEH(),
    { k: 'address', label: t('lead.address'), type: 'text', req: true, full: true, ph: t('lead.addressPh'), ac: 'street-address' },
    { k: 'zip', label: t('lead.zip'), type: 'zip', req: true, ph: eg('8000'), ac: 'postal-code' },
    { k: 'city', label: t('lead.city'), type: 'text', req: true, ac: 'address-level2' },
    F_NAME(), F_PHONE(), F_EMAIL(), F_MSG()] };
  if (type === 'rim') return { ...base, icon: 'rim', fields: [{ k: 'rim', label: t('lead.rimSel'), type: 'rimsel', req: true, full: true },
    { k: 'car', label: t('lead.rimCar'), type: 'text', req: false, full: true, ph: eg('BMW 3er G20, 2021'), ac: 'off' },
    F_NAME(), F_EMAIL(), F_PHONE(), F_MSG()] };
  if (type === 'inquiry') return { ...base, icon: 'msg', fields: [{ ...F_VEH(), req: false },
    extW, F_NAME(), F_EMAIL(), F_PHONE(), { ...F_MSG(), req: true }] };
  return null;
}const vehLabel = v => `${v.title} ${v.variant} – ${chf(v.price)}`;
const miniRim = r => `<div class="mini-car"><img src="${esc(IMG(r.img, 200, 140))}" alt="" data-fb><div><b>${esc(r.title)}</b><span class="num">${money(r.price, r.currency)} · ${rimDim(r)} · ${esc(r.pcd)}</span></div></div>`;
const miniCar = v => `<div class="mini-car"><img src="${esc(IMG(v.img, 200, 140))}" alt="" data-fb><div><b>${esc(v.title)} ${esc(v.variant)}</b><span class="num">${chf(v.price)} · ${km(v.km)} · ${reg(v)}</span></div></div>`;
function lfHtml(f, p, val = '') {
  const id = `${p}_${f.k}`; let inner;
  if (f.type === 'check') return `<label class="check full ext-check"><input type="checkbox" id="${id}" data-k="${f.k}" value="1" ${val ? 'checked' : ''}><span>${esc(f.label)}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</span></label>`;
  if (f.type === 'rimsel') inner = `<select class="select" id="${id}" data-k="${f.k}">${opt('', t('lead.chooseRim'), val)}${RIMS.filter(rimOnSale).map(r => opt(r.id, `${r.title} – ${money(r.price, r.currency)}`, val)).join('')}${opt('other', t('lead.otherRim'), val)}</select>`;
  else if (f.type === 'vehicle') inner = `<select class="select" id="${id}" data-k="${f.k}">${opt('', t('lead.chooseVehicle'), val)}${VEHICLES.map(v => opt(v.id, vehLabel(v), val)).join('')}${opt('other', t('lead.otherVehicle'), val)}</select>`;
  else if (f.type === 'select') inner = `<select class="select" id="${id}" data-k="${f.k}">${f.def ? '' : opt('', f.any || t('lead.select'), val)}${f.opts.map(([v, l]) => opt(v, l, val || f.def || '')).join('')}</select>`;
  else if (f.type === 'textarea') inner = `<textarea class="textarea" id="${id}" data-k="${f.k}" maxlength="2000" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea>`;
  else {
    const ty = { email: 'email', phone: 'tel', date: 'date' }[f.type] || 'text';
    const attrs = [f.type === 'money' || f.type === 'zip' ? 'inputmode="numeric"' : '', f.type === 'zip' ? 'maxlength="4"' : `maxlength="${{ email: 254, phone: 30, money: 12, date: 10 }[f.type] || 120}"`, f.type === 'date' ? `min="${todayISO()}"` : '', f.ac ? `autocomplete="${f.ac}"` : ''].join(' ');
    inner = `<input class="input" id="${id}" data-k="${f.k}" type="${ty}" ${attrs} placeholder="${esc(f.ph || '')}" value="${esc(val)}">`;
  }
  return `<div class="field ${f.full ? 'full' : ''}" data-req="${f.req ? 1 : ''}" data-type="${f.type}"><label for="${id}">${esc(f.label)}${f.req ? '' : ` <span style="font-weight:400;color:var(--muted-2)">(${t('lead.optional')})</span>`}</label>${inner}<span class="msg">${ico('info', 'sm')}<span></span></span>${f.note ? `<p class="field-note">${ico('info', 'sm')}<span>${esc(f.note)}</span></p>` : ''}</div>`;
}
const consentHtml = () => `<label class="consent"><input type="checkbox" data-reqcheck><span>${t('lead.consent')}</span></label>`;
function leadFormHtml(type, carId = '', preset = {}) {
  const cfg = leadCfg(type), isRim = type === 'rim', v = isRim ? null : byId(carId), rr = isRim ? rimById(carId) : null;
  /* a rim that is sold or hidden can't be requested any more → general rim request */
  const rimVal = rr && rimOnSale(rr) ? rr.id : rr ? 'other' : '';
  const flow = type === 'testdrive' ? `<ol class="flow">${t('td.flow').split('|').map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : '';
  return `<form class="lead-form" data-leadform="${type}" novalidate>
    <div class="notice">${ico(cfg.icon)}<span>${cfg.notice}</span></div>
    ${flow}
    <div data-mini>${v ? miniCar(v) : rr && rimOnSale(rr) ? miniRim(rr) : ''}</div>
    <div class="fgrid">${cfg.fields.map(f => lfHtml(f, 'lf_' + type, f.k === 'vehicle' && v ? v.id : f.k === 'rim' && rimVal ? rimVal : (preset[f.k] || ''))).join('')}</div>
    ${consentHtml()}
    <button class="btn btn-primary btn-lg btn-block" type="submit">${ico('arrow')}${cfg.submit}</button>
  </form>`;
}
/* Read a form into rows: { k, label, val (display), raw } */
function collectRows(scope, fields) {
  return fields.map(f => {
    const el = $(`[data-k="${f.k}"]`, scope); if (!el) return null;
    if (f.type === 'check') return { k: f.k, label: f.sumLabel || f.label, val: el.checked ? t('sum.yes') : '', raw: el.checked ? 'yes' : '' };
    const raw = (el.value || '').trim(); let val = raw;
    if (f.type === 'vehicle') { const v = byId(raw); val = v ? `${v.title} ${v.variant} (${chf(v.price)}) – ${vehicleUrl(v)}` : raw === 'other' ? t('lead.otherVehicle') : ''; }
    else if (f.type === 'rimsel') { const r = rimById(raw); val = r ? `${r.title} (${money(r.price, r.currency)}) – ${rimUrl(r)}` : raw === 'other' ? t('lead.otherRim') : ''; }
    else if (f.type === 'select' && raw) { const o = f.opts.find(x => String(x[0]) === raw); val = o ? String(o[1]) : raw; }
    if (f.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) { const [y, m, d] = raw.split('-'); val = `${d}.${m}.${y}`; }
    return { k: f.k, label: f.sumLabel || f.label, val, raw };
  }).filter(Boolean);
}
function bindLeadForm(form, type, onDone) {
  form.addEventListener('input', e => {
    const el = e.target, f = el.closest('.field'); if (!f) return;
    if (f.dataset.type === 'money') { const n = digits(el.value).slice(0, 9); el.value = n ? fmt(+n) : ''; }
    if (f.dataset.type === 'zip') el.value = digits(el.value).slice(0, 4);
    if (f.classList.contains('err') && el.value) { f.classList.remove('err'); el.setAttribute('aria-invalid', 'false'); }
  });
  form.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.k === 'vehicle') { const v = byId(el.value); $('[data-mini]', form).innerHTML = v ? miniCar(v) : ''; }
    if (el.dataset.k === 'rim') { const r = rimById(el.value); $('[data-mini]', form).innerHTML = r ? miniRim(r) : ''; }
    if (el.matches('[data-reqcheck]') && el.checked) el.closest('label').style.color = '';
    const f = el.closest('.field'); if (f && f.classList.contains('err') && el.value) f.classList.remove('err');
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validate(form)) return;
    const cfg = leadCfg(type);
    const msg = inLang(MSG_LANG, () => { const c = leadCfg(type); return { title: c.title, rows: collectRows(form, c.fields) }; });
    const res = await sendWithSpinner($('[type=submit]', form), type, msg.title, msg.rows, []);
    onDone(leadResultHtml(msg.title, cfg.ok, msg.rows, res, false));
  });
}
function openLead(type, carId, preset = {}) {
  const cfg = leadCfg(type); if (!cfg) return;
  openModal(`${mHead(cfg.title)}<div class="modal-b"><p class="lead-sub">${cfg.sub}</p>${leadFormHtml(type, carId, preset)}</div>`, true);
  bindLeadForm($('#modal form'), type, html => { $('#modal').innerHTML = mHead(cfg.title) + `<div class="modal-b">${html}</div>`; $('#modal').scrollTop = 0; focusModal(); });
  setTimeout(() => { const f = $('#modal select,#modal input'); if (f && matchMedia('(hover:hover)').matches) f.focus(); }, 60);
}

/* Summary text used for WhatsApp / email fallback and as "summary" in the POST */
function leadSummary(title, rows, photoCount = 0) {
  return `${title} – NEXT CARS SA\n\n` + rows.filter(r => r.val).map(r => `${r.label}: ${r.val}`).join('\n') + (photoCount ? `\n${tMsg('sum.photos')}: ${photoCount}` : '');
}
/* Photos are resized in the browser before upload (max. 1600 px, JPEG): keeps the e-mail small and removes
   hidden metadata such as the GPS position. Formats the browser cannot read (e.g. HEIC) are sent unchanged. */
function shrinkForUpload(file) {
  return new Promise(res => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(b => res(b ? new File([b], file.name.replace(/.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(file); };
    img.src = url;
  });
}
/* Submission: POST multipart/form-data to BUSINESS.leadEndpoint when configured */
/* Submission — priority:
   1. BUSINESS.leadEndpoint (own API / form service): all fields + photos
   2. Netlify Forms (site hosted on Netlify): hidden form "nextcars-anfrage"; Netlify e-mails every request to
      the addresses set under Site configuration → Forms → Form notifications (photos are attached as links)
   3. Opened locally (file://): nothing can be sent → WhatsApp / e-mail fallback */
const NETLIFY_FORM = 'nextcars-anfrage';
async function sendLead(type, title, rows, files) {
  const netlify = !BUSINESS.leadEndpoint && BUSINESS.netlifyForms && /^https?:$/.test(location.protocol);
  if (!BUSINESS.leadEndpoint && !netlify) return { demo: true };
  const vr = rows.find(r => (r.k === 'vehicle' || r.k === 'interest') && r.raw), v = vr && byId(vr.raw);
  const rr = rows.find(r => r.k === 'rim' && r.raw), rim = rr && rimById(rr.raw);
  const vehicle = v ? `${v.title} ${v.variant} (${chf(v.price)})` : rim ? `${rim.title} (${money(rim.price, rim.currency)})` : (vr ? vr.val : rr ? rr.val : '');
  const itemUrl = v ? vehicleUrl(v) : rim ? rimUrl(rim) : '';
  const subject = `${title}${v ? ' – ' + v.title + ' ' + v.variant : rim ? ' – ' + rim.title : ''} – NEXT CARS SA`;
  const get = k => (rows.find(r => r.k === k) || {}).raw || '';
  try {
    const fd = new FormData();
    if (netlify) {
      fd.append('form-name', NETLIFY_FORM); fd.append('bot-field', '');
      fd.append('subject', subject); fd.append('request_type', type); fd.append('language', lang);
      fd.append('vehicle', vehicle); fd.append('vehicle_url', itemUrl);
      fd.append('name', get('name')); fd.append('email', get('email')); fd.append('phone', get('phone'));
      fd.append('summary', leadSummary(title, rows, files.length));
      files.slice(0, 12).forEach((f, i) => fd.append('photo' + (i + 1), f, f.name));
    } else {
      fd.append('request_type', type); fd.append('language', lang); fd.append('_subject', subject);
      fd.append('vehicle', vehicle); fd.append('vehicle_url', itemUrl);
      // form rows; the selected car's id is sent as vehicle_id so it does not overwrite the readable "vehicle" field
      rows.forEach(r => { const k = r.k === 'vehicle' ? 'vehicle_id' : r.k; fd.append(k, r.raw); if (r.val !== r.raw) fd.append(k + '_label', r.val); });
      fd.append('summary', leadSummary(title, rows, files.length));
      // photos stay under the hosting's request limit (Vercel: 4.5 MB in total)
      let bytes = 0;
      for (const [i, f] of files.entries()) { const p = await shrinkForUpload(f); if (bytes + p.size > 3.8 * 1024 * 1024) break; bytes += p.size; fd.append('photos[]', p, p.name || `foto-${i + 1}.jpg`); }
    }
    const r = await fetch(netlify ? location.pathname : BUSINESS.leadEndpoint, { method: 'POST', body: fd, headers: netlify ? {} : { Accept: 'application/json' } });
    return r.ok ? { ok: true } : { error: true };
  } catch (e) { return { error: true }; }
}
async function sendWithSpinner(btn, type, title, rows, files) {
  const h = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spinner" style="border-color:rgba(0,0,0,.2);border-top-color:#0B0B0C"></span>${t('res.sending')}`;
  const [res] = await Promise.all([sendLead(type, title, rows, files), new Promise(r => setTimeout(r, 600))]);
  btn.disabled = false; btn.innerHTML = h;
  return res;
}
function leadResultHtml(title, okText, rows, res, hasPhotos, photoCount = 0, againAttr = 'data-close') {
  const summary = leadSummary(title, rows, photoCount);
  const alt = (BUSINESS.phone ? `<a class="btn btn-dark btn-lg btn-block" href="${telHref()}">${ico('phone')}${t('btn.call')} ${esc(BUSINESS.phone)}</a>` : '')
    + (hasWa() ? `<a class="btn btn-wa btn-lg btn-block" href="${esc(waLink(summary))}" target="_blank" rel="noopener">${icoF('wa')}${t('res.viaWa')}</a>` : '')
    + (BUSINESS.email ? `<a class="btn btn-line btn-block" href="mailto:${esc(BUSINESS.email)}?subject=${encodeURIComponent(title + ' – NEXT CARS SA')}&body=${encodeURIComponent(summary)}">${ico('mail')}${t('res.viaMail')}</a>` : '');
  const photoNote = hasPhotos ? `<p class="hint" style="margin-top:4px">${t('res.photoNote')}</p>` : '';
  const again = againAttr ? `<div class="row" style="margin-top:16px"><button class="btn btn-line" ${againAttr}>${t(againAttr === 'data-close' ? 'aria.close' : 'res.again')}</button></div>` : '';
  if (res.ok) return `<div class="success" style="padding:14px 0 4px"><div class="s-ic">${ico('check')}</div><h2 style="font-size:22px">${t('res.okT')}</h2><p>${okText}</p>${again}</div>`;
  if (res.demo) return `<div class="success" style="padding:14px 0 4px"><div class="s-ic" style="background:var(--gold-50);color:var(--gold-ink)">${ico('info')}</div><h2 style="font-size:22px">${t('res.demoT')}</h2><p class="sent-note">${t('res.demoP')}</p><div class="sent-alt">${alt}${photoNote}</div>${again}</div>`;
  return `<div class="success" style="padding:14px 0 4px"><div class="s-ic" style="background:var(--red-50);color:var(--red)">${ico('x')}</div><h2 style="font-size:22px">${t('res.errT')}</h2><p class="sent-note">${t('res.errP')}</p><div class="sent-alt">${alt}${photoNote}</div>${again}</div>`;
}

/* ---------- Financing & leasing page ---------- */
let finTab = 'financing', finCar = '';
function renderFinancePage(query) {
  const p = new URLSearchParams(query || '');
  finTab = p.get('tab') === 'leasing' ? 'leasing' : 'financing';
  finCar = p.get('car') || '';
  paintFin();
}
function paintFin() {
  const cfg = leadCfg(finTab), wrap = $('#finFormWrap');
  $$('#finTabs button').forEach(b => { b.classList.toggle('on', b.dataset.tab === finTab); b.setAttribute('aria-pressed', b.dataset.tab === finTab); });
  wrap.innerHTML = `<h2 style="font-size:22px">${cfg.title}</h2><p style="color:var(--muted);margin:6px 0 18px">${cfg.sub}</p>${leadFormHtml(finTab, finCar)}`;
  bindLeadForm($('form', wrap), finTab, html => { wrap.innerHTML = html.replace('data-close>' + t('aria.close'), 'data-fin-again>' + t('res.again')); });
}

/* ---------- Trade-in (Eintausch / Reprise) + "We buy your car" wizard ---------- */
const wzCfg = mode => mode === 'trade' ? {
  crumb: t('nav.tradeLong'), title: t('wz.trade.title'), leadTitle: t('wz.trade.leadTitle'), lead: t('wz.trade.lead'),
  perks: [t('wz.trade.p1'), t('wz.trade.p2'), t('wz.trade.p3')], submit: t('wz.trade.submit'), ok: t('wz.trade.ok'),
  other: ['/ankauf', t('wz.trade.other')], img: '1485291571150-772bcfc10da5'
} : {
  crumb: t('nav.buyLong'), title: t('nav.buyLong'), leadTitle: t('wz.buy.leadTitle'), lead: t('wz.buy.lead'),
  perks: [t('wz.buy.p1'), t('wz.buy.p2'), t('fc.s')], submit: t('wz.buy.submit'), ok: t('wz.buy.ok'),
  other: ['/eintausch', t('wz.buy.other')], img: '1568605117036-5fe5e7bab0b7'
};
const CONDITIONS = ['vgood', 'good', 'avg', 'repair'];
const SELL_MAKES = [...new Set(['Alfa Romeo', 'Audi', 'BMW', 'Citroën', 'Cupra', 'Dacia', 'Fiat', 'Ford', 'Honda', 'Hyundai', 'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Mazda', 'Mercedes-Benz', 'Mini', 'Nissan', 'Opel', 'Peugeot', 'Porsche', 'Renault', 'Seat', 'Škoda', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo', ...MAKES])].sort((a, b) => a.localeCompare(b));
const MAX_PH = 12, MAX_MB = 10;
const newWz = () => ({ step: 0, done: null, d: { make: '', model: '', variant: '', year: '', km: '', fuel: '', trans: '', condition: '', info: '', acc: false, svc: false, mfk: false, price: '', interest: '', name: '', email: '', phone: '', message: '' }, photos: [] });
const WZ = { trade: newWz(), buy: newWz() };
let wzMode = 'trade';
/* Field specs per step (reuse lfHtml + validate) */
const wzFields = mode => [
  [{ k: 'make', label: t('f.make'), type: 'select', req: true, opts: [...SELL_MAKES.map(m => [m, m]), ['other', t('wz.otherMake')]], any: t('wz.chooseMake') },
   { k: 'model', label: t('f.model'), type: 'text', req: true, ph: t('ph.eg', { x: 'X5, Golf, Model Y' }) },
   { k: 'variant', label: t('wz.variant'), type: 'text', req: false, ph: t('ph.eg', { x: 'xDrive30d M Sport' }), full: true },
   { k: 'year', label: t('wz.year'), type: 'select', req: true, opts: Array.from({ length: 57 }, (_, i) => 2026 - i).map(y => [y, y]), any: t('wz.chooseYear') },
   { k: 'km', label: t('wz.km'), type: 'money', req: true, ph: t('ph.eg', { x: '85’000' }) }],
  [{ k: 'fuel', label: t('f.fuel'), type: 'select', req: true, opts: FUELS.map(x => [x, L.fuel[x]]), any: t('wz.chooseFuel') },
   { k: 'trans', label: t('f.trans'), type: 'select', req: true, opts: TRANS.map(x => [x, L.trans[x]]), any: t('wz.chooseTrans') },
   { k: 'condition', label: t('wz.condition'), type: 'select', req: true, opts: CONDITIONS.map(x => [x, t('cond.' + x)]), any: t('wz.chooseCond'), full: true },
   { k: 'info', label: t('wz.info'), type: 'textarea', req: false, full: true, ph: t('wz.infoPh') },
   mode === 'buy'
     ? { k: 'price', label: t('wz.price'), type: 'money', req: false, ph: t('ph.eg', { x: '25’000' }), full: true }
     : { k: 'interest', label: t('wz.interest'), type: 'vehicle', req: false, full: true }],
  [],
  [F_NAME(), F_EMAIL(), F_PHONE(), F_MSG()],
  []
];
const W = () => WZ[wzMode];
const FLAGS = () => [['acc', t('wz.acc')], ['svc', t('wz.svc')], ['mfk', t('wz.mfk')]];
function renderWizardHero() {
  const c = wzCfg(wzMode);
  $('#sellHeroImg').src = IMG(c.img, 1800, 600);
  $('#wzCrumb').textContent = c.crumb; $('#wzTitle').textContent = c.title; $('#wzLead').textContent = c.lead;
  $('#wzPerks').innerHTML = c.perks.map(p => `<span>${ico('check', 'sm')}${esc(p)}</span>`).join('');
  $('#wzHelp').innerHTML = `${hasWa() ? `${t('wz.help')}<a class="btn btn-wa btn-sm btn-block" style="margin-top:12px" data-wa href="${esc(waLink(tMsg('wa.general')))}" target="_blank" rel="noopener">${icoF('wa')}WhatsApp</a>` : ''}<a href="${c.other[0]}" class="link" style="margin-top:14px;font-size:13.5px;white-space:normal">${esc(c.other[1])}${ico('arrow', 'sm')}</a>`;
}
function renderWizard() {
  const S = W(), d = S.d, c = wzCfg(wzMode);
  const steps = t('wz.steps').split('|'), stepT = t('wz.stepT').split('|');
  $('#stepper').innerHTML = steps.map((s, i) => `<div class="st ${i === S.step && !S.done ? 'on' : ''} ${i < S.step || S.done ? 'done' : ''}"><i>${i < S.step || S.done ? '✓' : i + 1}</i><span>${s}</span></div>`).join('');
  $('#pvCard').innerHTML = pvCardHtml();
  const cardEl = $('#wzCard');
  if (S.done) {
    cardEl.innerHTML = S.done + `<div class="row" style="display:flex;justify-content:center;margin-top:8px"><button class="btn btn-line" id="wzAgain">${t('res.againWz')}</button></div>`;
    $('#wzAgain').onclick = () => { S.photos.forEach(p => URL.revokeObjectURL(p.url)); WZ[wzMode] = newWz(); renderWizard(); };
    return;
  }
  const fields = wzFields(wzMode)[S.step];
  const head = `<div class="progress"><i style="width:${(S.step + 1) / steps.length * 100}%"></i></div><span class="kicker" style="margin-bottom:6px">${t('wz.stepOf', { a: S.step + 1, b: steps.length })}</span><h2>${stepT[S.step]}</h2>`;
  let body = '';
  const val = f => f.type === 'money' && d[f.k] ? fmt(+digits(d[f.k])) : d[f.k];
  if (S.step === 0) body = `<p class="lead">${t('wz.l0')}</p><div class="fgrid">${fields.map(f => lfHtml(f, 'wz', val(f))).join('')}</div>`;
  if (S.step === 1) body = `<p class="lead">${t('wz.l1')}</p><div class="fgrid">${fields.map(f => lfHtml(f, 'wz', val(f))).join('')}
    <div class="full" style="display:flex;gap:18px;flex-wrap:wrap">${FLAGS().map(([k, l]) => `<label class="check"><input type="checkbox" data-kc="${k}" ${d[k] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>`;
  if (S.step === 2) body = `<p class="lead">${t('wz.l2')}</p>
    <label class="drop" id="drop"><input type="file" id="fileIn" accept="image/*,.heic,.heif" multiple hidden><div class="d-ic">${ico('upload', 'lg')}</div><b>${t('wz.drop')}</b><p>${t('wz.dropSub', { n: MAX_PH, mb: MAX_MB })}</p></label>
    <div class="ph-grid" id="phGrid">${S.photos.map((p, i) => `<div class="ph"><img src="${p.url}" alt="${esc(t('det.img', { n: i + 1 }))}">${i === 0 ? `<span class="cover">${t('wz.main')}</span>` : ''}<button type="button" data-rmph="${i}" aria-label="${esc(t('wz.removePhoto'))}">${ico('x')}</button></div>`).join('')}</div>
    <p class="ph-count">${S.photos.length ? t('wz.phCount', { a: S.photos.length, b: MAX_PH }) : t('wz.phNone')}</p>
    <div class="ph-tips"><div>${ico('check')}${t('wz.tip1')}</div><div>${ico('check')}${t('wz.tip2')}</div><div>${ico('check')}${t('wz.tip3')}</div></div>`;
  if (S.step === 3) body = `<p class="lead">${t('wz.l3')}</p><div class="fgrid">${fields.map(f => lfHtml(f, 'wz', val(f))).join('')}</div>`;
  if (S.step === 4) {
    const rows = wzRows();
    body = `<p class="lead">${t('wz.l4')}</p><div class="review">${rows.filter(r => r.val).map(r => `<div><span>${esc(r.label)}</span><b>${esc(r.val)}</b></div>`).join('')}
      <div><span>${t('sum.photos')}</span><b>${S.photos.length ? `<span class="ph-mini">${S.photos.map(p => `<img src="${p.url}" alt="">`).join('')}</span>` : t('wz.noPhotos')}</b></div></div>
      ${consentHtml()}`;
  }
  cardEl.innerHTML = head + body + `<div class="wz-foot"><button class="btn btn-line" id="sBack" ${S.step ? '' : 'style="visibility:hidden"'}>${ico('back', 'sm')}${t('det.back')}</button><button class="btn ${S.step === 4 ? 'btn-primary' : 'btn-dark'}" id="sNext">${S.step === 4 ? ico('arrow', 'sm') + c.submit : t('wz.next') + ico('arrow', 'sm')}</button></div>`;
  bindWizard();
}
function wzRows() {
  const d = W().d, all = wzFields(wzMode).flat(), rows = [];
  all.forEach(f => {
    let raw = String(d[f.k] ?? '').trim(), val = raw;
    if (f.type === 'vehicle') { const v = byId(raw); val = v ? `${v.title} ${v.variant} (${chf(v.price)}) – ${vehicleUrl(v)}` : ''; }
    else if (f.type === 'money' && raw) { val = f.k === 'km' ? km(+digits(raw)) : chf(+digits(raw)); raw = digits(raw); }
    else if (f.type === 'select' && raw) { const o = f.opts.find(x => String(x[0]) === raw); val = o ? String(o[1]) : raw; }
    rows.push({ k: f.k, label: f.label, val, raw });
  });
  const flags = FLAGS().filter(([k]) => d[k]).map(x => x[1]);
  if (flags.length) rows.splice(8, 0, { k: 'flags', label: t('wz.other'), val: flags.join(', '), raw: flags.join(', ') });
  return rows;
}
function pvCardHtml() {
  const S = W(), d = S.d, kmv = +digits(d.km);
  return `<div class="card pv-card"><div class="media">${S.photos[0] ? `<img class="ld" src="${S.photos[0].url}" alt="">` : `<div class="pv-empty">${ico('camera')}${t('wz.pvMain')}</div>`}${S.photos.length ? `<span class="imgcount">${ico('camera')}${S.photos.length}</span>` : ''}</div>
    <div class="c-body"><div><div class="c-title">${esc(d.make === 'other' ? t('wz.otherMake') : d.make || t('f.make'))} ${esc(d.model || t('f.model'))}</div><div class="c-var">${esc(d.variant || t('wz.variant'))}</div></div>
    <div class="specs"><span>${ico('cal')}${d.year || '—'}</span><span>${ico('gauge')}${kmv ? km(kmv) : '— km'}</span><span>${ico('fuel')}${L.fuel[d.fuel] || '—'}</span><span>${ico('gear')}${L.trans[d.trans] || '—'}</span></div>
    <div class="c-foot"><div><div class="price" style="font-size:15px">${esc(d.condition ? t('cond.' + d.condition) : t('wz.condition'))}</div></div><span class="seller-tag private">${t(wzMode === 'trade' ? 'nav.trade' : 'wz.tagBuy')}</span></div></div></div>`;
}
function bindWizard() {
  const c = $('#wzCard'), S = W(), d = S.d;
  c.oninput = e => {
    const el = e.target, k = el.dataset.k; if (!k) return;
    const f = el.closest('.field');
    if (f && f.dataset.type === 'money') { const n = digits(el.value).slice(0, 9); el.value = n ? fmt(+n) : ''; }
    d[k] = el.value;
    if (f && f.classList.contains('err') && el.value) f.classList.remove('err');
    $('#pvCard').innerHTML = pvCardHtml();
  };
  c.onchange = e => {
    const el = e.target, k = el.dataset.k, kc = el.dataset.kc;
    if (k) d[k] = el.value;
    if (kc) d[kc] = el.checked;
    if (el.matches('[data-reqcheck]') && el.checked) el.closest('label').style.color = '';
    const f = el.closest('.field'); if (f && f.classList.contains('err') && el.value) f.classList.remove('err');
    $('#pvCard').innerHTML = pvCardHtml();
  };
  $('#sBack').onclick = () => { S.step--; renderWizard(); scrollWizard(); };
  $('#sNext').onclick = async () => {
    if (!validate(c)) return;
    if (S.step === 4) {
      const cfg = wzCfg(wzMode);
      const msg = inLang(MSG_LANG, () => ({ title: wzCfg(wzMode).leadTitle, rows: wzRows() }));
      const res = await sendWithSpinner($('#sNext'), wzMode === 'trade' ? 'trade-in' : 'we-buy', msg.title, msg.rows, S.photos.map(p => p.file));
      S.done = leadResultHtml(msg.title, cfg.ok, msg.rows, res, S.photos.length > 0, S.photos.length, '');
      renderWizard(); scrollWizard(); return;
    }
    S.step++; renderWizard(); scrollWizard();
  };
  if (S.step === 2) {
    const fi = $('#fileIn'), drop = $('#drop');
    const add = files => {
      let rej = 0;
      [...files].forEach(f => {
        const isImg = (f.type || '').startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);
        if (!isImg || f.size > MAX_MB * 1024 * 1024 || S.photos.length >= MAX_PH) { rej++; return; }
        S.photos.push({ file: f, url: URL.createObjectURL(f) });
      });
      if (rej) toast(t('wz.rejected', { n: rej, mb: MAX_MB, max: MAX_PH }), 'info');
      renderWizard();
    };
    fi.onchange = () => { add(fi.files); fi.value = ''; };
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files) add(e.dataTransfer.files); });
    $('#phGrid').onclick = e => { const b = e.target.closest('[data-rmph]'); if (b) { e.preventDefault(); const [p] = S.photos.splice(+b.dataset.rmph, 1); if (p) URL.revokeObjectURL(p.url); renderWizard(); } };
  }
}
function scrollWizard() { const w = $('.wizard'); if (!w) return; const top = w.getBoundingClientRect().top + scrollY - 80; if (scrollY > top) window.scrollTo({ top, behavior: 'smooth' }); }

/* ---------- Favourites ---------- */
function renderFavs() {
  const cars = [...state.favs].map(byId).filter(Boolean), rims = [...state.rimFavs].map(rimById).filter(r => r && rimLive(r)), n = cars.length + rims.length;
  $('#favSub').textContent = n ? `${[cars.length ? nVeh(cars.length) : '', rims.length ? nRim(rims.length) : ''].filter(Boolean).join(' · ')} ${t(n === 1 ? 'favs.saved1' : 'favs.savedN')}` : t('favs.empty');
  $('#favClear').hidden = !n;
  const both = cars.length && rims.length;
  $('#favGrid').innerHTML = n ? (both ? `<h2 class="grid-h">${t('nav.cars')}</h2>` : '') + cars.map(card).join('') + (both ? `<h2 class="grid-h">${t('nav.rims')}</h2>` : '') + rims.map(rimCard).join('') : `<div class="empty"><div class="e-ic" style="color:var(--gold-ink);background:var(--gold-50)">${ico('heart')}</div><h2>${t('favs.noneT')}</h2><p>${t('favs.noneP')}</p><div class="row"><a href="/fahrzeuge" class="btn btn-dark">${t('nav.cars')}</a><a href="/felgen" class="btn btn-line">${t('nav.rims')}</a></div></div>`;
}

/* ---------- Info (legal) modal ---------- */
function openInfo(k) {
  const txt = loc(INFO[k]), title = t(k === 'imprint' ? 'ftr.imprint' : 'ftr.privacy');
  openModal(`${mHead(esc(title))}<div class="modal-b"><p style="color:var(--ink-2);white-space:pre-line">${txt ? esc(txt) : tbd('legal.tbd')}</p><button class="btn btn-line" data-close>${t('aria.close')}</button></div>`);
}

/* ---------- Business details in footer / drawer / generic WhatsApp links ---------- */
function paintBusiness() {
  const B = BUSINESS, addr = addrLine(), tel = n => 'tel:' + n.replace(/[^\d+]/g, '');
  /* address / e-mail only once confirmed — no placeholders in public */
  $('#ftrContact').innerHTML = [
    addr ? `<li>${esc(addr)}</li>` : '',
    B.phone ? `<li>${t('c.phone')}: <a href="${tel(B.phone)}">${esc(B.phone)}</a></li>` : '',
    B.mobile ? `<li>${t('c.mobile')}: <a href="${tel(B.mobile)}">${esc(B.mobile)}</a></li>` : '',
    B.email ? `<li><a href="mailto:${esc(B.email)}">${esc(B.email)}</a></li>` : '',
    `<li>${t('appt')}</li>`
  ].join('');
  $('#ftrContact').style.cssText = 'list-style:none;margin:0 0 4px;padding:0;display:grid;gap:8px;font-size:14px';
  /* social icons only when real profile links exist */
  const soc = [['instagram', 'Instagram', B.instagram], ['facebook', 'Facebook', B.facebook]].filter(x => x[2]);
  $('#ftrSocial').innerHTML = soc.map(([ic, n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener" aria-label="${n}">${ico(ic)}</a>`).join('');
  $('#ftrSocial').hidden = !soc.length;
  $('#ftrReviews').hidden = !REVIEWS.length;
  $('#drawerFoot').innerHTML = `${hasWa() ? `<a class="btn btn-wa btn-lg" data-wa href="${esc(waLink(tMsg('wa.general')))}" target="_blank" rel="noopener">${icoF('wa')}WhatsApp</a>` : ''}${B.phone ? `<a class="btn btn-white" href="${tel(B.phone)}">${ico('phone')}${t('btn.call')}</a>` : ''}<a class="btn btn-primary" href="/fahrzeuge">${ico('car')}${t('nav.cars')}</a>`;
  $$('[data-wa-general]').forEach(a => { a.href = waLink(tMsg('wa.general')); a.hidden = !hasWa(); const box = a.closest('[data-wa-box]'); if (box) box.hidden = !hasWa(); });
}
/* ---------- Language switching ---------- */
function applyStatic() {
  $$('[data-i18n]').forEach(e => e.textContent = t(e.dataset.i18n));
  $$('[data-i18n-html]').forEach(e => e.innerHTML = t(e.dataset.i18nHtml));
  $$('[data-i18n-ph]').forEach(e => e.placeholder = t(e.dataset.i18nPh));
  $$('[data-i18n-aria]').forEach(e => e.setAttribute('aria-label', t(e.dataset.i18nAria)));
  $$('[data-i18n-title]').forEach(e => e.title = t(e.dataset.i18nTitle));
  document.documentElement.lang = lang;
  $('#langCur').textContent = lang.toUpperCase();
  $('#langMenu').innerHTML = LANGS.map(l => `<button data-lang="${l}" class="${l === lang ? 'on' : ''}" lang="${l}" ${l === lang ? 'aria-current="true"' : ''}>${LANG_NAMES[l]} <b>${l.toUpperCase()}</b></button>`).join('');
  $('#drawerLangs').innerHTML = LANGS.map(l => `<button data-lang="${l}" class="${l === lang ? 'on' : ''}" lang="${l}" aria-label="${LANG_NAMES[l]}" ${l === lang ? 'aria-current="true"' : ''}>${l.toUpperCase()}</button>`).join('');
}
function setLang(l) {
  if (!LANGS.includes(l)) return;
  $('#langMenu').classList.remove('open'); $('#langBtn').setAttribute('aria-expanded', 'false');
  if (l === lang) return;
  lang = l;
  try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* storage unavailable */ }
  buildLabels(); applyStatic(); fillHeroOptions(); renderHome(); paintBusiness(); updateFavCount();
  route(true);
}

/* =====================================================================
   ADMINISTRATION (/admin) — manage the vehicles of this static site.
   • Every change is previewed instantly in THIS browser (localStorage draft).
   • "Download index.html" writes the vehicles into the site file; uploading that file
     to Netlify publishes the changes for every visitor.
   ===================================================================== */
const DRAFT_KEY = 'nextcars-admin-draft';
const RAW_KEYS = ['id', 'make', 'model', 'variant', 'price', 'year', 'month', 'km', 'ps', 'fuel', 'trans', 'gearbox', 'drive', 'body', 'engine', 'ccm', 'ext', 'color', 'int', 'doors', 'seats', 'badges', 'listed', 'inspection', 'warranty', 'img', 'more', 'crops', 'photos', 'cons', 'range', 'extra', 'feats', 'desc', 'hl'];
const rawOf = v => { const o = {}; RAW_KEYS.forEach(k => { const x = v[k]; if (x === undefined || x === '' || (Array.isArray(x) && !x.length && k !== 'badges')) return; o[k] = x; }); return o; };
function saveDraft() {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ vehicles: VEHICLES.map(rawOf), rims: RIMS.map(rimRaw) })); return true; }
  catch (e) { toast(t('adm.quota'), 'info'); return false; }
}
function afterVehicleChange() {
  refreshMakes(); saveDraft(); ADMIN_DRAFT = true;
  renderHome(); fillHeroOptions(); paintAdminBar();
}
function paintAdminBar() { $('#admBar').hidden = !ADMIN_DRAFT || currentView === 'admin'; }
const saveFile = (text, name, type) => { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); };
let admTab = 'cars';
function renderAdmin() {
  const tabs = `<div class="seg adm-tabs" role="group" aria-label="${esc(t('nav.cat'))}"><button type="button" data-adm="tab" data-tab="cars" class="${admTab === 'cars' ? 'on' : ''}" aria-pressed="${admTab === 'cars'}">${ico('car', 'sm')}${t('nav.cars')} (${VEHICLES.length})</button><button type="button" data-adm="tab" data-tab="rims" class="${admTab === 'rims' ? 'on' : ''}" aria-pressed="${admTab === 'rims'}">${ico('rim', 'sm')}${t('nav.rims')} (${RIMS.length})</button></div>`;
  if (admTab === 'rims') { renderAdminRims(tabs); return; }
  const statusOpts = v => INSPECTION.map(s => opt(s, t('insp.' + s), v.inspection || 'tbd')).join('');
  $('#admRoot').innerHTML = `${tabs}<div class="adm-tools">
      <button class="btn btn-primary" data-adm="new">${ico('plus')}${t('adm.new')}</button>
      <button class="btn btn-dark" data-adm="download">${ico('download')}${t('adm.download')}</button>
      <button class="btn btn-line" data-adm="export">${ico('file')}${t('adm.exportJson')}</button>
      <label class="btn btn-line">${ico('upload')}${t('adm.importJson')}<input type="file" accept="application/json,.json" data-adm-import hidden></label>
      ${ADMIN_DRAFT ? `<button class="btn btn-ghost" data-adm="reset">${ico('x')}${t('adm.reset')}</button>` : ''}
    </div>
    ${ADMIN_DRAFT ? `<div class="notice" style="margin-bottom:14px">${ico('eye')}<span>${t('adm.draft')}</span></div>` : ''}
    <p class="adm-count">${nVeh(VEHICLES.length)}</p>
    <div class="adm-list">${VEHICLES.map(v => `<div class="adm-row">
      <img src="${esc(IMG(v.img, 192, 144))}" alt="" data-fb>
      <div class="adm-main"><b>${esc(v.title)}</b><span>${esc(v.variant)}</span><small>${chf(v.price)} · ${km(v.km)} · ${reg(v)} · ID ${v.id}</small></div>
      <label class="adm-status"><span>${t('insp.label')}</span><select class="select" data-adm-status="${v.id}">${statusOpts(v)}</select></label>
      <div class="adm-acts"><a class="btn btn-line btn-sm" href="/fahrzeug/${v.id}" aria-label="${esc(v.title)}">${ico('eye', 'sm')}</a><button class="btn btn-dark btn-sm" data-adm="edit" data-id="${v.id}">${ico('edit', 'sm')}${t('adm.edit')}</button><button class="btn btn-ghost btn-sm" data-adm="delete" data-id="${v.id}" aria-label="${esc(t('adm.delete'))}">${ico('trash', 'sm')}</button></div>
    </div>`).join('')}</div>`;
}
let admPhotos = [];
function paintAdmPhotos() {
  $('#admPh').innerHTML = admPhotos.map((p, i) => `<div class="ph"><img src="${esc(IMG(p, 320, 240))}" alt="" data-fb>${i === 0 ? `<span class="cover">${t('wz.main')}</span>` : `<button type="button" class="mk" data-adm="ph-main" data-i="${i}">${t('adm.makeMain')}</button>`}<button type="button" data-adm="ph-rm" data-i="${i}" aria-label="${esc(t('wz.removePhoto'))}">${ico('x')}</button></div>`).join('');
}
function openVehicleEditor(id) {
  const v = id ? byId(id) : null;
  const d = v ? rawOf(v) : { id: Math.max(0, ...VEHICLES.map(x => x.id)) + 1, year: new Date().getFullYear(), month: 1, fuel: 'Petrol', trans: 'Automatic', drive: 'AWD', body: 'SUV', color: 'Black', badges: [], inspection: 'tbd' };
  /* sample cars: their extra views are crops of one photo → keep them as separate photo URLs */
  admPhotos = v ? v.gallery.map(g => g.f ? IMG(g.id, 1600, 1000, g.f) : g.id) : [];
  const fld = (k, label, html, req, full) => `<div class="field ${full ? 'full' : ''}" data-req="${req ? 1 : ''}"><label for="adm_${k}">${esc(label)}</label>${html}<span class="msg">${ico('info', 'sm')}<span></span></span></div>`;
  const inp = (k, attrs = '') => `<input class="input" id="adm_${k}" data-a="${k}" value="${esc(d[k] ?? '')}" ${attrs}>`;
  const sel = (k, list) => `<select class="select" id="adm_${k}" data-a="${k}">${list.map(([a, b]) => opt(a, b, d[k] ?? '')).join('')}</select>`;
  const ta = (k, val, rows = 4) => `<textarea class="textarea" id="adm_${k}" data-a="${k}" rows="${rows}">${esc(val)}</textarea>`;
  const labels = g => Object.keys(LBL[g]).map(k => [k, L[g][k]]);
  const num = 'inputmode="numeric"';
  openModal(`${mHead(esc(t(v ? 'adm.edit' : 'adm.new')) + (v ? ' – ' + esc(v.title) : ''))}<form class="modal-b" id="admForm" novalidate>
    <div class="fgrid">
      ${fld('make', t('f.make'), inp('make'), true)}
      ${fld('model', t('f.model'), inp('model'), true)}
      ${fld('variant', t('wz.variant'), inp('variant'), false, true)}
      ${fld('price', t('f.priceCHF'), inp('price', num), true)}
      ${fld('km', t('wz.km'), inp('km', num), true)}
      ${fld('month', t('adm.month'), sel('month', MONTHS.map((m, i) => [i + 1, m])))}
      ${fld('year', t('f.firstReg'), sel('year', Array.from({ length: 60 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => [y, y])))}
      ${fld('engine', t('f.engine'), inp('engine'), true, true)}
      ${fld('ps', t('adm.power'), inp('ps', num))}
      ${fld('ccm', t('adm.ccm'), inp('ccm', num))}
      ${fld('fuel', t('f.fuel'), sel('fuel', labels('fuel')))}
      ${fld('trans', t('f.trans'), sel('trans', labels('trans')))}
      ${fld('gearbox', t('adm.gearbox'), inp('gearbox'))}
      ${fld('drive', t('f.drive'), sel('drive', labels('drive')))}
      ${fld('body', t('f.body'), sel('body', labels('body')))}
      ${fld('color', t('adm.colorGroup'), sel('color', labels('color')))}
      ${fld('ext', t('adm.colorName'), inp('ext'))}
      ${fld('int', t('sp.int'), inp('int'))}
      ${fld('doors', t('sp.doors'), inp('doors', num))}
      ${fld('seats', t('sp.seats'), inp('seats', num))}
      ${fld('cons', t('sp.cons'), inp('cons'))}
      ${fld('range', t('sp.range'), inp('range'))}
      ${fld('inspection', t('insp.label'), sel('inspection', INSPECTION.map(s => [s, t('insp.' + s)])), true, true)}
      ${fld('warranty', t('adm.warrantyOverride'), `<input class="input" id="adm_warranty" data-a="warranty" value="${esc(loc(d.warranty || ''))}" placeholder="${esc(stdWarrantyShort())}">`, false, true)}
      <div class="full"><span class="flabel" style="display:block;margin-bottom:8px">${t('adm.badges')}</span><div class="adm-badges">${['top', 'new', 'premium', 'ev', 'classic'].map(b => `<label class="check"><input type="checkbox" data-badge="${b}" ${(d.badges || []).includes(b) ? 'checked' : ''}><span>${t('badge.' + b)}</span></label>`).join('')}</div></div>
      ${fld('desc', t('det.desc'), ta('desc', loc(d.desc || ''), 3), false, true)}
      ${fld('feats', t('adm.equip'), ta('feats', v ? v.features.map(loc).join('\n') : '', 6), false, true)}
      ${fld('hl', t('adm.hl'), ta('hl', v ? v.hl.map(loc).join('\n') : '', 3), false, true)}
      <div class="full"><span class="flabel" style="display:block;margin-bottom:8px">${t('adm.photos')}</span><div class="ph-grid" id="admPh" style="margin-top:0"></div>
        <div class="adm-ph-add"><input class="input" id="admPhUrl" placeholder="https://…"><button type="button" class="btn btn-line btn-sm" data-adm="ph-url">${ico('plus', 'sm')}URL</button><label class="btn btn-line btn-sm">${ico('upload', 'sm')}${t('adm.upload')}<input type="file" accept="image/*" multiple id="admPhFile" hidden></label></div>
        <p class="field-note" id="admPhErr" hidden>${ico('info', 'sm')}<span>${t('adm.photoReq')}</span></p></div>
    </div>
    <div class="wz-foot" style="margin-top:8px"><button type="button" class="btn btn-line" data-close>${t('adm.cancel')}</button><button class="btn btn-primary" type="submit">${ico('check', 'sm')}${t('adm.save')}</button></div>
  </form>`, true);
  paintAdmPhotos();
  const form = $('#admForm');
  $('#admPhFile').onchange = async e => {
    for (const f of [...e.target.files]) { try { admPhotos.push(await shrinkImage(f)); } catch (err) { /* not an image */ } }
    e.target.value = ''; paintAdmPhotos();
  };
  form.onsubmit = e => {
    e.preventDefault();
    if (!validate(form)) return;
    if (!admPhotos.length) { $('#admPhErr').hidden = false; return; }
    const g = k => (($(`[data-a="${k}"]`, form) || {}).value || '').trim();
    const n = k => +digits(g(k)) || 0;
    const lines = k => g(k).split('\n').map(s => s.trim()).filter(Boolean);
    const nv = { ...d, make: g('make'), model: g('model'), variant: g('variant'), price: n('price'), km: n('km'), month: +g('month') || 1, year: +g('year'), engine: g('engine'), ps: n('ps'), ccm: n('ccm'), fuel: g('fuel'), trans: g('trans'), gearbox: g('gearbox'), drive: g('drive'), body: g('body'), color: g('color'), ext: g('ext'), int: g('int'), doors: n('doors'), seats: n('seats'), cons: g('cons'), range: g('range'), inspection: g('inspection'), warranty: g('warranty'), desc: g('desc'), feats: lines('feats'), hl: lines('hl'), badges: $$('[data-badge]', form).filter(c => c.checked).map(c => c.dataset.badge), photos: [...admPhotos], listed: v ? (v.listed || 0) : 0 };
    ['img', 'more', 'crops', 'extra'].forEach(k => delete nv[k]);
    prepVehicle(nv);
    const i = VEHICLES.findIndex(x => x.id === nv.id);
    if (i >= 0) VEHICLES[i] = nv; else VEHICLES.unshift(nv);
    afterVehicleChange(); closeModal(); renderAdmin(); toast(t('adm.saved'));
  };
}
/* uploaded photos are scaled down (max 1600 px) and embedded */
const shrinkImage = file => new Promise((res, rej) => {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => { const s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.82)); };
  img.onerror = () => { URL.revokeObjectURL(url); rej(); };
  img.src = url;
});
async function downloadSite(kind = 'cars') {
  // Rebuilds assets/js/vehicles.js (or rims.js) with the current list; replace that file on the website to publish
  const rims = kind === 'rims', file = rims ? 'rims.js' : 'vehicles.js', mark = rims ? 'RIMS' : 'VEHICLES';
  const list = rims ? RIMS.map(rimRaw) : VEHICLES.map(rawOf);
  let src;
  try { const r = await fetch('/assets/js/' + file, { cache: 'no-store' }); if (!r.ok) throw 0; src = await r.text(); } catch (e) { toast(t('adm.dlFail'), 'info'); return; }
  const a = src.indexOf(`/*${mark}-START*/`), b = src.indexOf(`/*${mark}-END*/`);
  if (a < 0 || b < 0) { toast(t('adm.dlFail'), 'info'); return; }
  const out = src.slice(0, a) + `/*${mark}-START*/\nconst ${mark} = [\n  ` + list.map(x => JSON.stringify(x)).join(',\n  ') + '\n];\n' + src.slice(b);
  saveFile(out, file, 'text/javascript');
  toast(t(rims ? 'adm.dlDoneRims' : 'adm.dlDone'));
}
function initAdmin() {
  const root = $('#admRoot');
  root.addEventListener('change', e => {
    const s = e.target.closest('[data-adm-status]');
    if (s) { const v = byId(s.dataset.admStatus); if (v) { v.inspection = s.value; afterVehicleChange(); renderAdmin(); toast(t('adm.saved')); } return; }
    const rs = e.target.closest('[data-adm-rstatus]');
    if (rs) { const r = rimById(rs.dataset.admRstatus); if (r) { r.status = rs.value; afterRimChange(); renderAdmin(); toast(t('adm.saved')); } return; }
    if (e.target.matches('[data-adm-rimport]')) {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(txt => { const data = JSON.parse(txt), list = Array.isArray(data) ? data : data.rims; if (!Array.isArray(list)) throw 0; RIMS.splice(0, RIMS.length, ...list.map(prepRim)); afterRimChange(); renderAdmin(); toast(t('adm.imported')); }).catch(() => toast(t('adm.importFail'), 'info'));
      return;
    }
    if (e.target.matches('[data-adm-import]')) {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(txt => { const data = JSON.parse(txt), list = Array.isArray(data) ? data : data.vehicles; if (!Array.isArray(list)) throw 0; VEHICLES.splice(0, VEHICLES.length, ...list.map(prepVehicle)); afterVehicleChange(); renderAdmin(); toast(t('adm.imported')); }).catch(() => toast(t('adm.importFail'), 'info'));
    }
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-adm]'); if (!b) return;
    const act = b.dataset.adm, id = +b.dataset.id;
    if (act === 'tab') { admTab = b.dataset.tab === 'rims' ? 'rims' : 'cars'; renderAdmin(); return; }
    if (act === 'rim-new') openRimEditor(0);
    if (act === 'rim-edit') openRimEditor(id);
    if (act === 'rim-delete') askConfirm(t('adm.confirmDeleteRim'), ico('trash', 'sm') + t('adm.delete'), () => { const i = RIMS.findIndex(x => x.id === id); if (i >= 0) RIMS.splice(i, 1); state.rimFavs.delete(id); updateFavCount(); afterRimChange(); renderAdmin(); });
    if (act === 'rim-download') downloadSite('rims');
    if (act === 'rim-export') saveFile(JSON.stringify({ rims: RIMS.map(rimRaw) }, null, 2), 'nextcars-felgen.json', 'application/json');
    if (act === 'new') openVehicleEditor(0);
    if (act === 'edit') openVehicleEditor(id);
    if (act === 'delete') askConfirm(t('adm.confirmDelete'), ico('trash', 'sm') + t('adm.delete'), () => { const i = VEHICLES.findIndex(x => x.id === id); if (i >= 0) VEHICLES.splice(i, 1); state.favs.delete(id); updateFavCount(); afterVehicleChange(); renderAdmin(); });
    if (act === 'download') downloadSite();
    if (act === 'export') saveFile(JSON.stringify({ vehicles: VEHICLES.map(rawOf) }, null, 2), 'nextcars-fahrzeuge.json', 'application/json');
    if (act === 'reset') askConfirm(t('adm.reset') + '?', t('adm.reset'), () => { try { localStorage.removeItem(DRAFT_KEY); sessionStorage.setItem(ADMIN_RESUME_KEY, '1'); } catch (err) { /* ignore */ } history.replaceState(null, '', '/admin'); location.reload(); });
  });
  /* photo buttons inside the editor modal */
  $('#modal').addEventListener('click', e => {
    const b = e.target.closest('[data-adm]'); if (!b || !$('#admForm')) return;
    const i = +b.dataset.i;
    if (b.dataset.adm === 'ph-rm') { admPhotos.splice(i, 1); paintAdmPhotos(); }
    if (b.dataset.adm === 'ph-main') { admPhotos.unshift(...admPhotos.splice(i, 1)); paintAdmPhotos(); }
    if (b.dataset.adm === 'ph-url') { const u = $('#admPhUrl').value.trim(); if (/^https?:\/\//.test(u)) { admPhotos.push(u); $('#admPhUrl').value = ''; paintAdmPhotos(); $('#admPhErr').hidden = true; } }
  });
}

/* ---------- Admin access (password, see ADMIN_PASSWORD in config.js) ----------
   The password is asked every time the admin page is opened: a correct password is a one-time pass. */
let adminPass = false, adminFails = 0, adminLockUntil = 0;
const hasAdminPassword = () => !!(ADMIN_PASSWORD && ADMIN_PASSWORD.salt && ADMIN_PASSWORD.hash && ADMIN_PASSWORD.iterations);
async function pbkdf2Hex(text, saltHex, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(text), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function askAdminPassword() {
  if (!hasAdminPassword()) { openModal(`${mHead(esc(t('adm.title')))}<div class="modal-b"><p>${esc(t('adm.pwMissing'))}</p><button class="btn btn-line" data-close>${t('aria.close')}</button></div>`); return; }
  openModal(`${mHead(esc(t('adm.title')))}<form class="modal-b" id="admLogin" novalidate>
      <div class="field"><label for="admPw">${t('adm.password')}</label><div style="display:flex;gap:8px"><input class="input" type="password" id="admPw" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" style="flex:1;min-width:0"><button type="button" class="btn btn-line" id="admPwShow" aria-label="${esc(t('adm.showPw'))}" aria-pressed="false">${ico('eye', 'sm')}</button></div></div>
      <p class="field-note" id="admPwErr" hidden>${ico('info', 'sm')}<span></span></p>
      <div class="wz-foot" style="margin-top:4px"><button type="button" class="btn btn-line" data-close>${t('adm.cancel')}</button><button type="submit" class="btn btn-primary">${ico('check', 'sm')}${t('adm.unlock')}</button></div>
    </form>`);
  const pw = $('#admPw'), err = $('#admPwErr');
  const fail = key => { err.querySelector('span').textContent = t(key); err.hidden = false; pw.value = ''; pw.focus(); };
  setTimeout(() => pw.focus(), 50);
  $('#admPwShow').addEventListener('click', e => { const show = pw.type === 'password'; pw.type = show ? 'text' : 'password'; e.currentTarget.setAttribute('aria-pressed', show); pw.focus(); });
  $('#admLogin').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#admLogin [type=submit]');
    if (btn.disabled) return;
    if (!window.crypto || !crypto.subtle) { fail('adm.pwUnsupported'); return; }
    const wait = Math.ceil((adminLockUntil - Date.now()) / 1000);
    if (wait > 0) { err.querySelector('span').textContent = t('adm.pwWait', { s: wait }); err.hidden = false; return; }
    btn.disabled = true;
    // spaces added by phone keyboards / copy-paste are ignored
    const ok = await pbkdf2Hex(pw.value.trim(), ADMIN_PASSWORD.salt, ADMIN_PASSWORD.iterations) === ADMIN_PASSWORD.hash;
    btn.disabled = false;
    if (!ok) { adminFails++; adminLockUntil = Date.now() + Math.min(2 ** (adminFails - 1), 30) * 1000; fail('adm.pwWrong'); return; }
    adminFails = 0;
    closeModal(); adminPass = true; go('/admin');
  });
}
/* One-shot pass so "Discard preview" can reload straight back into the admin page */
const ADMIN_RESUME_KEY = 'nextcars-admin-resume';
function takeAdminResume() {
  try { const r = sessionStorage.getItem(ADMIN_RESUME_KEY) === '1'; sessionStorage.removeItem(ADMIN_RESUME_KEY); return r; } catch (e) { return false; }
}
/* Hidden entrance: 3 clicks on the logo within 1.5 s */
let logoClicks = [];
function logoTripleClick() {
  const now = Date.now();
  logoClicks = [...logoClicks.filter(c => now - c < 1500), now];
  if (logoClicks.length < 3) return false;
  logoClicks = [];
  return true;
}

/* ---------- Router ---------- */
let currentView = '', prevRoute = '';
/* Clean addresses: /fahrzeuge, /fahrzeug/8, /felgen … (the hosting serves index.html for them, see vercel.json / .htaccess) */
const VIEW_PATHS = { home: '/', search: '/fahrzeuge', car: '/fahrzeug', rims: '/felgen', rim: '/felge', nderrim: '/eintausch', blejme: '/ankauf', financim: '/finanzierung', kontakt: '/kontakt', favourites: '/favoriten', admin: '/admin' };
const PATH_VIEWS = Object.fromEntries(Object.entries(VIEW_PATHS).map(([v, p]) => [p, v]));
const here = () => location.pathname + location.search;
function go(url) { if (here() !== url) history.pushState(null, '', url); route(); }
/* old links with #/… (e.g. shared on WhatsApp before) → the same page at its clean address */
function legacyHashToPath(hash) {
  const [path, query] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const view = ALIASES[parts[0]] || parts[0];
  const base = VIEW_PATHS[view] || '/';
  return (base === '/' ? '/' : base + (parts[1] ? '/' + encodeURIComponent(parts[1]) : '')) + (query ? '?' + query : '');
}
function parseQuery(q) {
  const f = DEF(), p = new URLSearchParams(q);
  ['make', 'fuel', 'trans', 'body', 'drive', 'color'].forEach(k => { if (p.get(k)) f[k] = p.get(k).split(','); });
  ['pmin', 'pmax', 'ymin', 'ymax', 'km', 'psmin'].forEach(k => { if (p.get(k)) f[k] = +p.get(k); });
  ['q', 'model'].forEach(k => { if (p.get(k)) f[k] = p.get(k); });
  return f;
}
const ALIASES = { makinat: 'search', sell: 'blejme', dealers: 'kontakt', dealer: 'kontakt' };
function route(keepScroll = false) {
  const h = here(), query = location.search.slice(1);
  const parts = location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  let view = PATH_VIEWS['/' + (parts[0] || '')] || (parts.length ? 'unknown' : 'home');
  if (!['home', 'search', 'car', 'rims', 'rim', 'nderrim', 'blejme', 'financim', 'kontakt', 'favourites', 'admin'].includes(view)) view = 'home';
  // /admin only opens right after the password (or on a re-render / "Discard preview" reload) — never from the address bar
  const blocked = view === 'admin' && !(adminPass || (keepScroll && currentView === 'admin') || takeAdminResume());
  if (view === 'admin') adminPass = false;
  if (blocked) { history.replaceState(null, '', '/'); view = 'home'; }
  const panel = ['nderrim', 'blejme'].includes(view) ? 'sell' : view === 'rim' ? 'car' : view;
  $$('.view').forEach(v => v.classList.toggle('on', v.dataset.view === panel));
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === view || (view === 'car' && a.dataset.nav === 'search') || (view === 'rim' && a.dataset.nav === 'rims')));
  openFilters(false); closeDrawer(); closeModal(); closeLB();
  const detail = view === 'car' || view === 'rim';
  document.body.classList.toggle('has-mbar', detail);
  $('#mbar').classList.toggle('on', detail);
  if (view === 'search') { if (query && !keepScroll) F = parseQuery(query); refreshSearch(!keepScroll); }
  if (view === 'car') renderCar(parts[1]);
  if (view === 'rims') { if (query && !keepScroll) RF = parseRimQuery(query); $('#rQ').value = RF.q; $('#rSort').value = rSortKey; refreshRims(!keepScroll); }
  if (view === 'rim') renderRim(parts[1]);
  if (view === 'nderrim' || view === 'blejme') {
    wzMode = view === 'nderrim' ? 'trade' : 'buy';
    const car = new URLSearchParams(query || '').get('car');
    if (wzMode === 'trade' && car && byId(car) && !keepScroll) WZ.trade.d.interest = car;
    renderWizardHero(); renderWizard();
  }
  if (view === 'financim') { if (keepScroll) paintFin(); else renderFinancePage(query); }
  if (view === 'kontakt') { $('#contactPage').innerHTML = contactHtml(); $('#reviewsPage').innerHTML = reviewsHtml(); $('#reviewsPageWrap').hidden = !REVIEWS.length; }
  if (view === 'admin') renderAdmin();
  if (view === 'favourites') renderFavs();
  const v = view === 'car' && byId(parts[1]), rv = view === 'rim' && rimById(parts[1]);
  const titleKey = { search: 'nav.cars', rims: 'nav.rims', nderrim: 'nav.tradeLong', blejme: 'nav.buyLong', financim: 'nav.fin', kontakt: 'nav.contact', favourites: 'nav.favs', admin: 'adm.title' }[view];
  document.title = v ? `${v.title} ${v.variant} – ${chf(v.price)} – NEXT CARS SA` : rv && rimLive(rv) ? `${rv.title} – ${money(rv.price, rv.currency)} – NEXT CARS SA` : titleKey ? `${t(titleKey)} – NEXT CARS SA` : t('title.home');
  if (keepScroll) return;
  prevRoute = currentView ? h : ''; currentView = view;
  paintAdminBar();
  window.scrollTo(0, 0);
  const sec = view === 'home' && new URLSearchParams(query || '').get('s');
  if (sec) setTimeout(() => { const el = document.getElementById(sec); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 70, behavior: 'smooth' }); }, 60);
}

/* ---------- Drawer ---------- */
function openDrawer() { $('#drawer').classList.add('open'); $('#scrim').classList.add('open'); document.body.style.overflow = 'hidden'; $('#burger').setAttribute('aria-expanded', 'true'); focusSoon($('#drawerClose')); }
function closeDrawer() {
  const wasOpen = $('#drawer').classList.contains('open');
  $('#drawer').classList.remove('open'); if (!anyFiltersOpen()) $('#scrim').classList.remove('open'); document.body.style.overflow = '';
  $('#burger').setAttribute('aria-expanded', 'false');
  if (wasOpen && $('#drawer').contains(document.activeElement)) $('#burger').focus({ preventScroll: true });
}

/* ---------- Keyboard: keep Tab inside the open dialog / lightbox / drawer ---------- */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function trapTab(e) {
  const box = $('#lightbox').classList.contains('open') ? $('#lightbox') : $('#modalWrap').classList.contains('open') ? $('#modal') : $('#drawer').classList.contains('open') ? $('#drawer') : null;
  if (!box) return;
  const els = $$(FOCUSABLE, box).filter(el => el.getClientRects().length);
  if (!els.length) { e.preventDefault(); return; }
  const first = els[0], last = els[els.length - 1], a = document.activeElement;
  if (e.shiftKey && (a === first || !box.contains(a) || a === box)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (a === last || !box.contains(a))) { e.preventDefault(); first.focus(); }
}

/* ---------- Global events ---------- */
document.addEventListener('click', e => {
  const el = e.target;
  if (el.closest('[data-wa]')) return; // let WhatsApp links open normally (and not the card)
  const lg = el.closest('[data-lang]'); if (lg) { e.preventDefault(); setLang(lg.dataset.lang); return; }
  const fav = el.closest('[data-fav]'); if (fav) { e.preventDefault(); e.stopPropagation(); toggleFav(fav.dataset.fav); return; }
  const rfav = el.closest('[data-rfav]'); if (rfav) { e.preventDefault(); e.stopPropagation(); toggleFav(rfav.dataset.rfav, 'rim'); return; }
  const lead = el.closest('[data-lead]'); if (lead) { e.preventDefault(); openLead(lead.dataset.lead, lead.dataset.car || lead.dataset.rim || '', lead.dataset.extw ? { extWarranty: '1' } : {}); return; }
  if (el.closest('[data-fin-again]')) { paintFin(); return; }
  const cardEl = el.closest('.card[data-car]'); if (cardEl) { e.preventDefault(); go('/fahrzeug/' + cardEl.dataset.car); return; }
  const rimEl = el.closest('.card[data-rim]'); if (rimEl) { e.preventDefault(); go('/felge/' + rimEl.dataset.rim); return; }
  const br = el.closest('[data-brand]'); if (br) { e.preventDefault(); F = DEF(); F.make = [br.dataset.brand]; go('/fahrzeuge'); return; }
  const bt = el.closest('[data-bodyt]'); if (bt) { F = DEF(); F.body = [bt.dataset.bodyt]; go('/fahrzeuge'); return; }
  const inf = el.closest('[data-info]'); if (inf) { e.preventDefault(); openInfo(inf.dataset.info); return; }
  if (el.closest('[data-close]')) { closeModal(); return; }
  if (el.closest('[data-rclear]')) { RF = RDEF(); $('#rQ').value = ''; refreshRims(); toast(t('toast.cleared'), 'x'); return; }
  if (el.closest('[data-clear]')) { F = DEF(); refreshSearch(); toast(t('toast.cleared'), 'x'); return; }
  const ft = el.closest('#finTabs [data-tab]'); if (ft) { finTab = ft.dataset.tab; paintFin(); return; }
  const rn = el.closest('.rail-nav button'); if (rn) { const rail = document.getElementById(rn.parentNode.dataset.rail); const dir = rn === rn.parentNode.lastElementChild ? 1 : -1; rail.scrollBy({ left: dir * rail.clientWidth * 0.9, behavior: 'smooth' }); return; }
  if (!el.closest('.lang')) { $('#langMenu').classList.remove('open'); $('#langBtn').setAttribute('aria-expanded', 'false'); }
  // after any pending navigation from the first two clicks, so it doesn't close the prompt
  const ml = el.closest('[data-map-load]');
  if (ml) { const box = ml.closest('.mapbox'), f = document.createElement('iframe'); f.src = box.dataset.mapSrc; f.title = box.dataset.mapTitle; f.referrerPolicy = 'strict-origin-when-cross-origin'; box.querySelector('.map-consent').replaceWith(f); return; }
  if (el.closest('[data-skip]')) { e.preventDefault(); $('#app').focus(); return; }
  if (el.closest('a.logo') && logoTripleClick()) { e.preventDefault(); setTimeout(askAdminPassword, 0); return; }
  if (el.closest('#admBar a')) { e.preventDefault(); askAdminPassword(); return; }
  // Internal links: switch page without reloading (new tab / modifier clicks keep the browser's behaviour)
  const a = el.closest('a[href^="/"]');
  if (a && !a.target && !a.hasAttribute('download') && !e.defaultPrevented && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
    const href = a.getAttribute('href');
    if (!href.startsWith('//') && !/^\/(assets|api)\//.test(href)) { e.preventDefault(); go(href); }
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Tab') trapTab(e);
  if (e.key === 'Escape') { closeModal(); closeDrawer(); closeLB(); openFilters(false); $('#langMenu').classList.remove('open'); }
  if ((currentView === 'car' || currentView === 'rim') && !$('#modalWrap').classList.contains('open') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { if (e.key === 'ArrowRight') setG(G.i + 1); if (e.key === 'ArrowLeft') setG(G.i - 1); }
});
$('#langBtn').addEventListener('click', e => { e.stopPropagation(); const m = $('#langMenu'); m.classList.toggle('open'); $('#langBtn').setAttribute('aria-expanded', m.classList.contains('open')); });
$('#burger').addEventListener('click', openDrawer);
$('#drawerClose').addEventListener('click', closeDrawer);
$('#scrim').addEventListener('click', () => { closeDrawer(); openFilters(false); });
$('#lbClose').addEventListener('click', closeLB);
$('#lbPrev').addEventListener('click', () => setG(G.i - 1));
$('#lbNext').addEventListener('click', () => setG(G.i + 1));
$('#lightbox').addEventListener('click', e => { if (e.target.classList.contains('lb-img')) closeLB(); });
$('#favClear').addEventListener('click', () => { state.favs.clear(); state.rimFavs.clear(); updateFavCount(); renderFavs(); toast(t('favs.cleared'), 'x'); });
addEventListener('scroll', () => $('#hdr').classList.toggle('scrolled', scrollY > 8), { passive: true });
addEventListener('popstate', () => route());

/* ---------- Boot ---------- */
$$('img[data-logo]').forEach(i => i.src = LOGO_SRC);
if (/^#\//.test(location.hash)) history.replaceState(null, '', legacyHashToPath(location.hash));
applyStatic(); paintBusiness(); initHero(); renderHome(); initSearch(); initRims(); initAdmin(); updateFavCount(); route();
})();
