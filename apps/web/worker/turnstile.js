// Cloudflare Turnstile server-side verification.
// https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * @param {Object} options
 * @param {string} options.token       The visitor-supplied turnstileToken.
 * @param {string} options.secret      TURNSTILE_SECRET.
 * @param {string} [options.remoteIp]  CF-Connecting-IP, if present.
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<boolean>} true only when Turnstile confirms success.
 * @throws when the siteverify request itself fails (network error) — callers must
 *   treat that as a server error, not a captcha failure.
 */
export async function verifyTurnstile({ token, secret, remoteIp, fetchImpl = fetch }) {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  const res = await fetchImpl(SITEVERIFY_URL, { method: 'POST', body });
  if (!res.ok) throw new Error(`turnstile siteverify HTTP ${res.status}`);
  const data = await res.json();
  return data?.success === true;
}
