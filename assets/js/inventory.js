/* =====================================================================
   NEXT CARS SA — VEHICLE HELPERS + FILTER OPTIONS
   ===================================================================== */

/* Image helper: Unsplash photo id -> sized URL (optional focal-point zoom) */
const IMG = (id, w = 800, h = 600, f) => {
  if (/^(https?:|data:|\/|\.)/.test(id)) return id; // own photo URL
  let s = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=72`;
  if (f) s += `&crop=focalpoint&fp-x=${f[0]}&fp-y=${f[1]}&fp-z=${f[2]}`;
  return s;
};

/* Standard equipment used by the sample inventory */
const F_BASE = ['Navigationssystem', 'Apple CarPlay', 'Android Auto', 'Parksensoren', 'Rückfahrkamera', 'Adaptiver Tempomat', 'Spurhalteassistent', 'Totwinkel-Assistent', 'LED-Scheinwerfer', 'Sitzheizung', 'Keyless Entry'];

/* Default gallery crops (focal point x, y, zoom) to create additional views of sample photos */
const CROPS = [[0.28, 0.6, 1.9], [0.72, 0.6, 1.9], [0.5, 0.58, 1.35]];

/* Derived convenience fields (also used by the admin after edits) */
function prepVehicle(v) {
  v.title = `${v.make} ${v.model}`;
  v.features = v.feats || [...new Set([...F_BASE, ...(v.extra || [])])];
  v.hl = v.hl || [];
  v.badges = v.badges || [];
  if (!INSPECTION.includes(v.inspection)) v.inspection = 'tbd';
  if (v.photos && v.photos.length) { v.img = v.photos[0]; v.gallery = v.photos.map(id => ({ id })); }
  else { const crops = v.crops || CROPS; v.gallery = [{ id: v.img }, ...(v.more || []).map(id => ({ id })), ...crops.map(f => ({ id: v.img, f }))]; }
  return v;
}
/* Rim filter values (data keys stay in English; labels come from LBL) */
const RIM_MATERIALS = ['alloy', 'steel', 'forged', 'flowformed', 'carbon'];
const RIM_CONDITIONS = ['new', 'used'];
const RIM_STATUSES = ['active', 'sold', 'hidden'];
const RIM_SIZES = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
const RIM_QTY = [1, 2, 3, 4, 5];
/* Rims: derived fields (also used by the admin after edits) */
function prepRim(r) {
  r.id = +r.id; r.price = +r.price || 0; r.size = +r.size || 0; r.width = +r.width || 0; r.et = +r.et || 0; r.qty = +r.qty || 1;
  r.cb = r.cb ? +r.cb : '';
  r.currency = r.currency === 'EUR' ? 'EUR' : 'CHF';
  r.pcd = String(r.pcd || '').toLowerCase().replace(/s+/g, '');
  if (!RIM_MATERIALS.includes(r.material)) r.material = 'alloy';
  if (!RIM_CONDITIONS.includes(r.condition)) r.condition = 'used';
  if (!RIM_STATUSES.includes(r.status)) r.status = 'active';
  r.fits = Array.isArray(r.fits) ? r.fits.filter(x => x && x.make) : [];
  r.photos = Array.isArray(r.photos) ? r.photos.filter(Boolean) : [];
  r.img = r.photos[0] || '';
  r.gallery = r.photos.length ? r.photos.map(id => ({ id })) : [{ id: '' }];   // '' → placeholder image
  r.listed = /^d{4}-d{2}-d{2}$/.test(r.listed || '') ? r.listed : '2000-01-01';
  return r;
}
/* Admin preview: vehicles edited in #/admin are shown in THIS browser only, until published */
let ADMIN_DRAFT = false;
try {
  const draft = JSON.parse(localStorage.getItem('nextcars-admin-draft') || 'null');
  if (draft && Array.isArray(draft.vehicles)) { VEHICLES.splice(0, VEHICLES.length, ...draft.vehicles); ADMIN_DRAFT = true; }
  if (draft && Array.isArray(draft.rims)) { RIMS.splice(0, RIMS.length, ...draft.rims); ADMIN_DRAFT = true; }
} catch (e) { /* no draft */ }
VEHICLES.forEach(prepVehicle);
RIMS.forEach(prepRim);
/* Filter values (data keys stay in English; labels come from LBL in the translations block) */
const BODY_TYPES = ['SUV', 'Sedan', 'Hatchback', 'Coupé', 'Convertible', 'Estate'];
const FUELS = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'Plug-in hybrid'];
const TRANS = ['Automatic', 'Manual'];
const DRIVES = ['AWD', 'RWD', 'FWD'];
const COLORS = { Black: '#111', White: '#fff', Grey: '#8A9099', Silver: '#C9CDD2', Blue: '#2356B8', Green: '#2F6B4F', Red: '#C8102E', Yellow: '#F3C623', Orange: '#E8762C' };
