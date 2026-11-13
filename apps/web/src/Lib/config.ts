// Public (non-secret) site configuration, safe to ship to the browser.

// Cloudflare Turnstile site key for taiwanhaul.com (public by design). The matching
// secret lives only in the Worker secret TURNSTILE_SECRET. `bun run dev` uses
// Cloudflare's always-pass test site key, pairing with the test secret in .dev.vars.example.
export const TURNSTILE_SITE_KEY = import.meta.env?.DEV ? '1x00000000000000000000AA' : '0x4AAAAAAFB9ESsjE8vnru0i'
