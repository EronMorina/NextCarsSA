<?php
/* =====================================================================
   NEXT CARS SA — receives the website's request forms (test drive, delivery,
   leasing, financing, trade-in, "we buy your car", inquiries) and e-mails them.
   Runs on the Infomaniak web hosting (PHP). Called by assets/js/app.js → BUSINESS.leadEndpoint.
   ===================================================================== */

/* ---------- Settings ---------- */
// The recipient address lives in api/config.php (private, not in GitHub — see api/config.example.php)
const SENDER_NAME     = 'NEXT CARS SA – Website';
const SENDER_EMAIL    = '';                      // e.g. 'noreply@your-domain.ch' (empty = noreply@<website domain>)
const MAX_FILES       = 12;
const MAX_FILE_BYTES  = 8 * 1024 * 1024;         // per photo (the website shrinks photos to ~0.3 MB before sending)
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;        // all photos together (Gmail accepts up to 25 MB per e-mail)
const RATE_LIMIT      = 5;                       // max. requests per visitor (IP) …
const RATE_WINDOW     = 600;                     // … per 10 minutes

/* ---------- Helpers ---------- */
date_default_timezone_set('Europe/Zurich');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $code, array $body): void {
  http_response_code($code);
  echo json_encode($body);
  exit;
}
/* one line of text: no line breaks / control characters (prevents e-mail header injection) */
function line(string $s, int $max): string {
  $s = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $s) ?? '';
  return mb_substr(trim($s), 0, $max);
}
/* multi-line text: keep line breaks, drop other control characters */
function text(string $s, int $max): string {
  $s = str_replace(["\r\n", "\r"], "\n", $s);
  $s = preg_replace('/[\x00-\x08\x0B-\x1F\x7F]+/u', '', $s) ?? '';
  return mb_substr(trim($s), 0, $max);
}
function post(string $k): string {
  return isset($_POST[$k]) && is_string($_POST[$k]) ? $_POST[$k] : '';
}
function mimeHeader(string $s): string {
  return '=?UTF-8?B?' . base64_encode($s) . '?=';
}

/* ---------- Request checks ---------- */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, ['error' => 'method']);

$config = is_file(__DIR__ . '/config.php') ? require __DIR__ . '/config.php' : [];
$recipient = is_array($config) ? (string)($config['recipient'] ?? '') : '';
if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
  error_log('nextcars lead.php: api/config.php missing or without a valid recipient');
  respond(500, ['error' => 'config']);
}

// Too large for the server (post_max_size) → PHP drops the whole body
if (empty($_POST) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) respond(413, ['error' => 'too_large']);

// Only accept requests sent by the website itself (blocks other sites from using this form)
$host = strtolower(preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')));
if (!preg_match('/^[a-z0-9.-]+$/', $host)) respond(400, ['error' => 'host']);
$from = (string)($_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? ''));
$fromHost = strtolower((string)(parse_url($from, PHP_URL_HOST) ?? ''));
if ($fromHost !== $host) respond(403, ['error' => 'origin']);

// Rate limit per IP (stored as a hash, not the IP itself)
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$rlFile = sys_get_temp_dir() . '/nextcars-rl-' . hash('sha256', $ip . __FILE__);
$now = time();
$fh = @fopen($rlFile, 'c+');
if ($fh) {
  flock($fh, LOCK_EX);
  $hits = json_decode(stream_get_contents($fh) ?: '[]', true);
  $hits = array_values(array_filter(is_array($hits) ? $hits : [], fn($t) => is_int($t) && $t > $now - RATE_WINDOW));
  if (count($hits) >= RATE_LIMIT) { flock($fh, LOCK_UN); fclose($fh); respond(429, ['error' => 'rate_limit']); }
  $hits[] = $now;
  ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($hits));
  flock($fh, LOCK_UN); fclose($fh);
}

/* ---------- Fields ---------- */
$types = ['testdrive', 'delivery', 'leasing', 'financing', 'inquiry', 'trade-in', 'we-buy'];
$type = post('request_type');
if (!in_array($type, $types, true)) respond(400, ['error' => 'type']);

$name    = line(post('name'), 120);
$email   = line(post('email'), 254);
$phone   = line(post('phone'), 30);
$subject = line(post('_subject'), 200);
$vehicle = line(post('vehicle'), 300);
$vurl    = line(post('vehicle_url'), 500);
$lang    = in_array(post('language'), ['de', 'fr', 'it', 'en'], true) ? post('language') : 'de';
$summary = text(post('summary'), 8000);

if ($name === '' || $summary === '') respond(400, ['error' => 'missing']);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(400, ['error' => 'email']);
if ($phone !== '' && !preg_match('/^[+0-9 ()\/.\-]{6,30}$/', $phone)) respond(400, ['error' => 'phone']);
if ($vurl !== '' && strpos($vurl, 'https://' . $host . '/') !== 0 && strpos($vurl, 'http://' . $host . '/') !== 0) $vurl = '';
if ($subject === '') $subject = 'Anfrage – NEXT CARS SA';

/* ---------- Photos (trade-in / we buy your car) ---------- */
$attachments = [];
if (isset($_FILES['photos']) && is_array($_FILES['photos']['name'] ?? null)) {
  $finfo = new finfo(FILEINFO_MIME_TYPE);
  $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/heic' => 'heic', 'image/heif' => 'heif'];
  $total = 0;
  foreach ($_FILES['photos']['name'] as $i => $_) {
    if (count($attachments) >= MAX_FILES) break;
    if (($_FILES['photos']['error'][$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) continue;
    $tmp = $_FILES['photos']['tmp_name'][$i];
    $size = (int)$_FILES['photos']['size'][$i];
    if (!is_uploaded_file($tmp) || $size <= 0 || $size > MAX_FILE_BYTES || $total + $size > MAX_TOTAL_BYTES) continue;
    $mime = $finfo->file($tmp);
    if (!isset($ext[$mime])) continue;                       // only real images
    $total += $size;
    $attachments[] = ['name' => 'foto-' . (count($attachments) + 1) . '.' . $ext[$mime], 'mime' => $mime, 'data' => file_get_contents($tmp)];
  }
}

/* ---------- E-mail ---------- */
$domain = preg_replace('/^www\./', '', $host);
$sender = SENDER_EMAIL !== '' ? SENDER_EMAIL : 'noreply@' . $domain;
if (!filter_var($sender, FILTER_VALIDATE_EMAIL)) respond(500, ['error' => 'config']);

$body = $summary
  . "\n\n----------------------------------------\n"
  . "Name: $name\nE-Mail: $email\n" . ($phone !== '' ? "Telefon: $phone\n" : '')
  . ($vehicle !== '' ? "Fahrzeug: $vehicle\n" : '') . ($vurl !== '' ? "Link: $vurl\n" : '')
  . 'Sprache des Kunden: ' . strtoupper($lang) . "\n"
  . (count($attachments) ? 'Fotos im Anhang: ' . count($attachments) . "\n" : '')
  . 'Gesendet: ' . date('d.m.Y H:i') . " über die Website\n"
  . "Antworten Sie direkt auf diese E-Mail, um dem Kunden zu schreiben.\n";

$headers = [
  'From: ' . mimeHeader(SENDER_NAME) . " <$sender>",
  'Reply-To: ' . mimeHeader($name) . " <$email>",
  'MIME-Version: 1.0',
  'X-Mailer: NEXT CARS SA website',
];
if ($attachments) {
  $boundary = 'nc-' . bin2hex(random_bytes(12));
  $headers[] = "Content-Type: multipart/mixed; boundary=\"$boundary\"";
  $msg = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
    . chunk_split(base64_encode($body)) . "\r\n";
  foreach ($attachments as $a) {
    $msg .= "--$boundary\r\nContent-Type: {$a['mime']}; name=\"{$a['name']}\"\r\nContent-Transfer-Encoding: base64\r\n"
      . "Content-Disposition: attachment; filename=\"{$a['name']}\"\r\n\r\n" . chunk_split(base64_encode($a['data'])) . "\r\n";
  }
  $msg .= "--$boundary--";
} else {
  $headers[] = 'Content-Type: text/plain; charset=UTF-8';
  $headers[] = 'Content-Transfer-Encoding: base64';
  $msg = chunk_split(base64_encode($body));
}

// '-f' sets the envelope sender (better delivery); retry without it if the hosting does not allow the option
$sent = mail($recipient, mimeHeader($subject), $msg, implode("\r\n", $headers), '-f' . $sender)
  || mail($recipient, mimeHeader($subject), $msg, implode("\r\n", $headers));
if (!$sent) {
  error_log('nextcars lead.php: mail() failed for request type ' . $type); // no personal data in the log
  respond(500, ['error' => 'send']);
}
respond(200, ['ok' => true]);
