// Origin allowlist for the contact endpoint. A bad/missing Origin is treated as a
// generic server error (not "captcha") because the client maps HTTP 403 to the
// Turnstile-failure message, which would be confusing for a same-origin/tooling issue.
// Plain-http variants are listed on purpose: the zone does not force HTTPS, so a visitor who
// opens http://taiwanhaul.com is served the page and posts with that Origin. Turnstile, not
// Origin, is the abuse guard; Origin only blocks accidental cross-site use.
const STATIC_ORIGINS = new Set([
  'https://taiwanhaul.com',
  'https://www.taiwanhaul.com',
  'http://taiwanhaul.com',
  'http://www.taiwanhaul.com',
]);

/** @param {string | null} origin */
export function isAllowedOrigin(origin) {
  if (!origin) return false;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (STATIC_ORIGINS.has(origin)) return true;
  if (url.protocol === 'https:' && url.hostname.endsWith('.workers.dev')) return true;
  if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return true;
  return false;
}
