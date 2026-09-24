// POST /api/contact business logic. Kept dependency-free (fetch and EmailMessage
// are injected) so node:test can exercise it directly, without cloudflare:email.
import { validateContact } from '../public/js/contact.js';
import { isAllowedOrigin } from './origin.js';
import { verifyTurnstile } from './turnstile.js';
import { buildRawEmail, buildMessageId } from './mime.js';

const MAX_BODY_BYTES = 10 * 1024;

function json(status, body, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

/** Read the body as text, refusing anything over maxBytes. Returns null if too large. */
async function readLimitedText(request, maxBytes) {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) return null;
  return text;
}

function buildSubject(value) {
  const label = value.name ? `${value.name} via TaiwanHaul contact form` : 'TaiwanHaul contact form';
  return `[TaiwanHaul contact] ${label}`;
}

function buildBody(value) {
  return [
    `Name: ${value.name}`,
    `Email: ${value.email}`,
    `Market: ${value.market || '(not specified)'}`,
    `Topic: ${value.topic}`,
    `Locale: ${value.locale}`,
    `Submitted: ${new Date().toISOString()}`,
    '',
    'Message:',
    value.message,
  ].join('\n');
}

/**
 * @param {Request} request
 * @param {Object} env  Worker env: CONTACT_FROM, CONTACT_TO, TURNSTILE_SECRET, SEND_EMAIL.
 * @param {Object} deps
 * @param {typeof fetch} [deps.fetchImpl]
 * @param {new (from: string, to: string, raw: string) => any} deps.EmailMessageCtor
 */
export async function handleContact(request, env, { fetchImpl = fetch, EmailMessageCtor } = {}) {
  const origin = request.headers.get('Origin');
  if (!isAllowedOrigin(origin)) {
    // Not "captcha" (403) on purpose: the client maps 403 to the Turnstile-failure
    // message, which would mislead a visitor on a bad/blocked Origin.
    return json(400, { ok: false, error: 'server' });
  }

  const contentType = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return json(415, { ok: false, error: 'server' });
  }

  // Cheap early reject when the client declares an oversized body; the read below
  // still enforces the limit for requests without (or lying about) Content-Length.
  const declared = Number(request.headers.get('Content-Length'));
  if (declared > MAX_BODY_BYTES) return json(413, { ok: false, error: 'server' });

  const rawBody = await readLimitedText(request, MAX_BODY_BYTES);
  if (rawBody === null) return json(413, { ok: false, error: 'server' });

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, { ok: false, error: 'validation', fields: {} });
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return json(400, { ok: false, error: 'validation', fields: {} });
  }

  const { ok, value, errors } = validateContact(payload);
  if (!ok) return json(400, { ok: false, error: 'validation', fields: errors });

  // Honeypot: bots that fill hidden fields get a fake success, silently, no email sent.
  if (value.website) return json(200, { ok: true });

  if (!env.TURNSTILE_SECRET) {
    console.error('contact: TURNSTILE_SECRET is not configured');
    return json(500, { ok: false, error: 'server' });
  }

  let verified = false;
  try {
    verified = await verifyTurnstile({
      token: value.turnstileToken || '',
      secret: env.TURNSTILE_SECRET,
      remoteIp: request.headers.get('CF-Connecting-IP') || undefined,
      fetchImpl,
    });
  } catch (err) {
    console.error('contact: turnstile siteverify request failed', err);
    return json(500, { ok: false, error: 'server' });
  }
  if (!verified) return json(403, { ok: false, error: 'captcha' });

  if (!env.CONTACT_TO) {
    console.error('contact: CONTACT_TO is not configured');
    return json(500, { ok: false, error: 'server' });
  }

  let raw;
  try {
    raw = buildRawEmail({
      from: env.CONTACT_FROM,
      to: env.CONTACT_TO,
      replyTo: value.email,
      subject: buildSubject(value),
      date: new Date().toUTCString(),
      messageId: buildMessageId(),
      body: buildBody(value),
    });
  } catch (err) {
    console.error('contact: failed to build the outgoing email');
    return json(500, { ok: false, error: 'server' });
  }

  try {
    const message = new EmailMessageCtor(env.CONTACT_FROM, env.CONTACT_TO, raw);
    await env.SEND_EMAIL.send(message);
  } catch (err) {
    console.error('contact: send_email binding failed to send');
    return json(500, { ok: false, error: 'server' });
  }

  return json(200, { ok: true });
}
