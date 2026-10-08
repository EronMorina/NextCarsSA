/* =====================================================================
   NEXT CARS SA — receives the website's request forms (test drive, delivery, leasing,
   financing, inquiry, trade-in, "we buy your car", rims) and e-mails them.
   Runs as a Vercel Function (Node.js) at /api/lead and sends through an Infomaniak mailbox
   (SMTP over SSL, Node's built-in tls module — no npm packages).
   On Infomaniak hosting the same address is answered by api/lead.php instead.

   Settings — Vercel → Project → Settings → Environment Variables (never in GitHub):
     SMTP_USER        the Infomaniak mailbox that sends, e.g. website@nextcars-sa.ch (also the sender address)
     SMTP_PASS        its password (type "Secret")
     LEAD_RECIPIENT   where requests are sent, e.g. name@example.com
     SMTP_HOST        optional, default mail.infomaniak.com
     SMTP_PORT        optional, default 465 (SSL)
   ===================================================================== */
const tls = require('tls'), crypto = require('crypto');
const TYPES = ['testdrive', 'delivery', 'leasing', 'financing', 'inquiry', 'trade-in', 'we-buy', 'rim'];
const MAX_FILES = 12;
const MAX_BODY = 4.4 * 1024 * 1024;        // Vercel accepts request bodies up to 4.5 MB
const RATE_LIMIT = 5, RATE_WINDOW = 10 * 60 * 1000;   // 5 requests per visitor per 10 minutes
const hits = new Map();                    // best effort: kept per running instance

const send = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};
/* one line of text: no line breaks / control characters */
const line = (s, max) => String(s || '').replace(/[\u0000-\u001F\u007F]+/g, ' ').trim().slice(0, max);
/* multi-line text: keep line breaks, drop other control characters */
const text = (s, max) => String(s || '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]+/g, '').trim().slice(0, max);
/* the real file type, read from the first bytes (the browser's own label is not trusted) */
function imageType(b) {
  if (b.length > 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return ['image/jpeg', 'jpg'];
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return ['image/png', 'png'];
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return ['image/webp', 'webp'];
  if (b.length > 12 && b.toString('ascii', 4, 8) === 'ftyp' && /^(heic|heix|hevc|mif1|msf1)$/.test(b.toString('ascii', 8, 12))) return ['image/heic', 'heic'];
  return null;
}
const dateCH = () => new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');

/* ---------- E-mail (MIME) ---------- */
/* header text with umlauts etc.: UTF-8 "encoded words", split so no word gets too long */
function encWord(s) {
  if (/^[\x20-\x7E]*$/.test(s)) return s;
  const words = []; let cur = '';
  for (const ch of s) { if (Buffer.byteLength(cur + ch) > 45) { words.push(cur); cur = ''; } cur += ch; }
  if (cur) words.push(cur);
  return words.map(w => `=?UTF-8?B?${Buffer.from(w).toString('base64')}?=`).join('\r\n ');
}
const b64 = buf => buf.toString('base64').replace(/.{1,76}/g, '$&\r\n');
function buildMail({ from, fromName, to, replyName, replyTo, subject, text, attachments }) {
  const boundary = 'nc-' + crypto.randomBytes(12).toString('hex');
  const domain = from.split('@')[1];
  const head = [
    `From: ${encWord(fromName)} <${from}>`,
    `To: <${to}>`,
    `Reply-To: ${encWord(replyName)} <${replyTo}>`,
    `Subject: ${encWord(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomBytes(12).toString('hex')}@${domain}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`
  ].join('\r\n');
  const parts = [`--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(Buffer.from(text.replace(/\n/g, '\r\n')))}`]
    .concat(attachments.map(a => `--${boundary}\r\nContent-Type: ${a.mime}; name="${a.filename}"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${a.filename}"\r\n\r\n${b64(a.data)}`));
  return `${head}\r\n\r\n${parts.join('')}--${boundary}--\r\n`;
}
/* minimal SMTP client: SSL connection, AUTH PLAIN, one recipient */
function smtpSend({ host, port, user, pass, to, data }) {
  return new Promise((resolve, reject) => {
    // [expected reply, what to send next, name of the step whose reply this is]
    const steps = [
      [220, () => 'EHLO nextcars-sa.ch', 'connect'],
      [250, () => 'AUTH PLAIN ' + Buffer.from(`\0${user}\0${pass}`).toString('base64'), 'ehlo'],
      [235, () => `MAIL FROM:<${user}>`, 'login'],
      [250, () => `RCPT TO:<${to}>`, 'sender'],
      [250, () => 'DATA', 'recipient'],
      [354, () => data.replace(/\r\n\./g, '\r\n..') + '.', 'data'],   // message ends with "<CRLF>.<CRLF>"
      [250, () => 'QUIT', 'message']
    ];
    let buf = '', step = 0, finished = false;
    const sock = tls.connect({ host, port, servername: host });
    const end = err => { if (finished) return; finished = true; clearTimeout(timer); sock.destroy(); err ? reject(err) : resolve(); };
    const timer = setTimeout(() => end(Object.assign(new Error('SMTP timeout'), { step: 'timeout' })), 20000);
    sock.setEncoding('utf8');
    sock.on('error', err => end(Object.assign(err, { step: 'network-' + (err.code || 'error') })));
    sock.on('close', () => end(step >= steps.length ? null : new Error('SMTP connection closed early')));
    sock.on('data', chunk => {
      buf += chunk;
      if (!buf.endsWith('\r\n')) return;
      const lines = buf.trimEnd().split('\r\n'), last = lines[lines.length - 1];
      if (!/^\d{3} /.test(last)) return;                     // multi-line reply not finished yet
      buf = '';
      const code = +last.slice(0, 3);
      if (step >= steps.length) return end(null);            // reply to QUIT
      if (code !== steps[step][0]) return end(Object.assign(new Error(`SMTP ${code} ${last.slice(4, 160)}`), { step: `${steps[step][2]}-${code}` }));
      sock.write(steps[step++][1]() + '\r\n');
    });
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if ((+req.headers['content-length'] || 0) > MAX_BODY) return send(res, 413, { error: 'too_large' });

  // Only accept requests sent by the website itself
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
  let fromHost = '';
  try { fromHost = new URL(req.headers.origin || req.headers.referer || '').hostname.toLowerCase(); } catch (e) { /* no origin */ }
  if (!host || fromHost !== host) return send(res, 403, { error: 'origin' });

  // Rate limit per IP (in memory, per instance)
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown', now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => t > now - RATE_WINDOW);
  if (recent.length >= RATE_LIMIT) return send(res, 429, { error: 'rate_limit' });
  hits.set(ip, [...recent, now]);
  if (hits.size > 5000) hits.clear();

  const isMail = s => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s);
  const recipient = (process.env.LEAD_RECIPIENT || '').trim(), smtpUser = (process.env.SMTP_USER || '').trim(), smtpPass = process.env.SMTP_PASS || '';
  if (!isMail(recipient) || !isMail(smtpUser) || !smtpPass) {
    console.error('lead: LEAD_RECIPIENT / SMTP_USER / SMTP_PASS are not set');
    return send(res, 500, { error: 'config' });
  }

  // Read the multipart form (Node's built-in parser)
  let form;
  try {
    form = await new Request('http://localhost/api/lead', { method: 'POST', headers: { 'content-type': String(req.headers['content-type'] || '') }, body: req, duplex: 'half' }).formData();
  } catch (e) { return send(res, 400, { error: 'body' }); }
  const g = k => { const v = form.get(k); return typeof v === 'string' ? v : ''; };

  const type = g('request_type');
  if (!TYPES.includes(type)) return send(res, 400, { error: 'type' });
  const name = line(g('name'), 120), email = line(g('email'), 254), phone = line(g('phone'), 30);
  const subject = line(g('_subject'), 200) || 'Anfrage – NEXT CARS SA';
  const vehicle = line(g('vehicle'), 300), lang = ['de', 'fr', 'it', 'en'].includes(g('language')) ? g('language') : 'de';
  let link = line(g('vehicle_url'), 500);
  const summary = text(g('summary'), 8000);
  if (!name || !summary) return send(res, 400, { error: 'missing' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return send(res, 400, { error: 'email' });
  if (phone && !/^[+0-9 ()/.\-]{6,30}$/.test(phone)) return send(res, 400, { error: 'phone' });
  try { const u = new URL(link); if (u.hostname.toLowerCase() !== host || !/^https?:$/.test(u.protocol)) link = ''; } catch (e) { link = ''; }   // only links to this website

  // Photos: only real images, at most MAX_FILES
  const attachments = [];
  for (const f of form.getAll('photos[]')) {
    if (typeof f === 'string' || attachments.length >= MAX_FILES) continue;
    const buf = Buffer.from(await f.arrayBuffer()), kind = imageType(buf);
    if (!kind) continue;
    attachments.push({ filename: `foto-${attachments.length + 1}.${kind[1]}`, mime: kind[0], data: buf });
  }

  const body = summary
    + '\n\n----------------------------------------\n'
    + `Name: ${name}\nE-Mail: ${email}\n` + (phone ? `Telefon: ${phone}\n` : '')
    + (vehicle ? `Fahrzeug / Felgen: ${vehicle}\n` : '') + (link ? `Link: ${link}\n` : '')
    + `Sprache des Kunden: ${lang.toUpperCase()}\n`
    + (attachments.length ? `Fotos im Anhang: ${attachments.length}\n` : '')
    + `Gesendet: ${dateCH()} über die Website\n`
    + 'Antworten Sie direkt auf diese E-Mail, um dem Kunden zu schreiben.\n';

  try {
    const data = buildMail({ from: smtpUser, fromName: 'NEXT CARS SA – Website', to: recipient, replyName: name.replace(/[<>"]/g, ''), replyTo: email, subject, text: body, attachments });
    await smtpSend({ host: process.env.SMTP_HOST || 'mail.infomaniak.com', port: +process.env.SMTP_PORT || 465, user: smtpUser, pass: smtpPass, to: recipient, data });
  } catch (e) {
    console.error('lead: sending failed –', e.message);   // no personal data in the log
    return send(res, 502, { error: 'send', step: String(e.step || 'unknown') });   // e.g. "login-535" = wrong mailbox password
  }
  return send(res, 200, { ok: true });
};
