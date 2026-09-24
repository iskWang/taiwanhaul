// Public (non-secret) site configuration, safe to ship to the browser.

// Cloudflare Turnstile site key for taiwanhaul.com (public by design). The matching
// secret lives only in the Worker secret TURNSTILE_SECRET. For local development,
// Cloudflare's always-pass test site key is 1x00000000000000000000AA.
export const TURNSTILE_SITE_KEY = '0x4AAAAAAFB9ESsjE8vnru0i';
