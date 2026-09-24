// Contact form client. The browser only knows the POST URL; delivery (and the
// destination address) lives server-side in a Cloudflare Worker (follow-up issue).
import { VISITOR_MARKETS } from '../data/markets.js';

export const CONTACT_ENDPOINT = '/api/contact';
export const CONTACT_FALLBACK_URL = 'https://github.com/iskWang/taiwanhaul/issues';
export const CONTACT_TOPICS = ['general', 'product_suggestion', 'partnership', 'other'];
export const CONTACT_LIMITS = { nameMax: 100, emailMax: 200, messageMin: 10, messageMax: 2000 };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate and normalize form input. The Worker must re-validate server-side.
 * @returns {{ ok: boolean, value: object, errors: Record<string, string> }}
 *   errors map field → code: required | email | too_short | too_long | invalid
 */
export function validateContact(input) {
  const value = {
    name: String(input.name ?? '').trim(),
    email: String(input.email ?? '').trim(),
    market: String(input.market ?? '').trim().toUpperCase(),
    topic: String(input.topic ?? '').trim(),
    message: String(input.message ?? '').trim(),
    locale: String(input.locale ?? '').trim(),
    website: String(input.website ?? ''),
  };
  if (input.turnstileToken) value.turnstileToken = String(input.turnstileToken);

  const errors = {};
  if (!value.name) errors.name = 'required';
  else if (value.name.length > CONTACT_LIMITS.nameMax) errors.name = 'too_long';

  if (!value.email) errors.email = 'required';
  else if (value.email.length > CONTACT_LIMITS.emailMax) errors.email = 'too_long';
  else if (!EMAIL.test(value.email)) errors.email = 'email';

  if (value.market && !VISITOR_MARKETS.includes(value.market)) errors.market = 'invalid';
  if (!CONTACT_TOPICS.includes(value.topic)) errors.topic = value.topic ? 'invalid' : 'required';

  if (!value.message) errors.message = 'required';
  else if (value.message.length < CONTACT_LIMITS.messageMin) errors.message = 'too_short';
  else if (value.message.length > CONTACT_LIMITS.messageMax) errors.message = 'too_long';

  return { ok: Object.keys(errors).length === 0, value, errors };
}

/**
 * POST the payload. Never throws.
 * @returns {Promise<{ ok: true } | { ok: false, error: string, fields?: Record<string, string> }>}
 */
export async function submitContact(payload, { endpoint = CONTACT_ENDPOINT, fetchImpl = globalThis.fetch, signal } = {}) {
  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      // Non-JSON body (e.g. endpoint not deployed yet) is handled by status below.
    }
    if (res.ok && data?.ok === true) return { ok: true };
    if (res.status === 400 && data?.fields) return { ok: false, error: 'validation', fields: data.fields };
    return { ok: false, error: data?.error ?? (res.status === 403 ? 'captcha' : 'server') };
  } catch {
    return { ok: false, error: 'network' };
  }
}
