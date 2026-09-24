import { test } from 'node:test';
import assert from 'node:assert/strict';
import { route } from '../worker/router.js';
import { isAllowedOrigin } from '../worker/origin.js';
import { verifyTurnstile } from '../worker/turnstile.js';
import { assertSafeHeaderValue, buildRawEmail, buildMessageId } from '../worker/mime.js';

const ORIGIN = 'http://127.0.0.1:8788';

const validBody = {
  name: 'Ana',
  email: 'ana@example.com',
  market: 'ph',
  topic: 'general',
  message: 'Where can I buy pineapple cake near Taipei 101?',
  locale: 'en',
  website: '',
  turnstileToken: 'dummy-token',
};

function req(path, { method = 'POST', body, headers = {}, origin = ORIGIN, contentType = 'application/json' } = {}) {
  const h = new Headers(headers);
  if (origin !== null) h.set('Origin', origin);
  if (contentType !== null) h.set('Content-Type', contentType);
  return new Request(`https://taiwanhaul.example${path}`, {
    method,
    headers: h,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

// Fake env: TURNSTILE_SECRET/CONTACT_TO can be overridden per test; SEND_EMAIL records sends.
function makeEnv(overrides = {}) {
  const sent = [];
  return {
    env: {
      CONTACT_FROM: 'contact@taiwanhaul.com',
      CONTACT_TO: 'maintainer@example.com',
      TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
      SEND_EMAIL: { send: async (msg) => sent.push(msg) },
      ...overrides,
    },
    sent,
  };
}

const passingTurnstileFetch = async () => new Response(JSON.stringify({ success: true }), { status: 200 });
const failingTurnstileFetch = async () => new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), { status: 200 });

class FakeEmailMessage {
  constructor(from, to, raw) {
    this.from = from;
    this.to = to;
    this.raw = raw;
  }
}

function deps(fetchImpl = passingTurnstileFetch) {
  return { fetchImpl, EmailMessageCtor: FakeEmailMessage };
}

test('unknown /api/* route returns 404 JSON', async () => {
  const { env } = makeEnv();
  const res = await route(req('/api/nope', { body: {} }), env, deps());
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('Content-Type'), 'application/json');
});

test('non-POST /api/contact returns 405 with Allow header', async () => {
  const { env } = makeEnv();
  const res = await route(req('/api/contact', { method: 'GET', body: undefined }), env, deps());
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('Allow'), 'POST');
});

test('non-JSON content type is rejected with 415', async () => {
  const { env } = makeEnv();
  const res = await route(req('/api/contact', { body: validBody, contentType: 'text/plain' }), env, deps());
  assert.equal(res.status, 415);
  const data = await res.json();
  assert.equal(data.error, 'server');
});

test('oversized body is rejected with 413', async () => {
  const { env } = makeEnv();
  const big = { ...validBody, message: 'x'.repeat(20 * 1024) };
  const res = await route(req('/api/contact', { body: big }), env, deps());
  assert.equal(res.status, 413);
});

test('malformed JSON is rejected with 400 validation and empty fields', async () => {
  const { env } = makeEnv();
  const res = await route(req('/api/contact', { body: '{not json' }), env, deps());
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'validation');
  assert.deepEqual(data.fields, {});
});

test('missing/disallowed Origin returns 400 server (not captcha)', async () => {
  const { env } = makeEnv();
  const resMissing = await route(req('/api/contact', { body: validBody, origin: null }), env, deps());
  assert.equal(resMissing.status, 400);
  assert.equal((await resMissing.json()).error, 'server');

  const resBad = await route(req('/api/contact', { body: validBody, origin: 'https://evil.example' }), env, deps());
  assert.equal(resBad.status, 400);
  assert.equal((await resBad.json()).error, 'server');
});

test('isAllowedOrigin accepts the documented origins', () => {
  assert.equal(isAllowedOrigin('https://taiwanhaul.com'), true);
  assert.equal(isAllowedOrigin('https://www.taiwanhaul.com'), true);
  assert.equal(isAllowedOrigin('https://taiwanhaul.workers.dev'), true);
  assert.equal(isAllowedOrigin('https://pr-123.taiwanhaul.workers.dev'), true);
  assert.equal(isAllowedOrigin('http://localhost:8788'), true);
  assert.equal(isAllowedOrigin('http://127.0.0.1:8788'), true);
  assert.equal(isAllowedOrigin('https://evil.example'), false);
  assert.equal(isAllowedOrigin(null), false);
  assert.equal(isAllowedOrigin('not-a-url'), false);
});

test('validation errors match the client field codes', async () => {
  const { env } = makeEnv();
  const bad = { name: '', email: 'nope', market: 'US', topic: 'spam', message: 'short', locale: 'en', website: '' };
  const res = await route(req('/api/contact', { body: bad }), env, deps());
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'validation');
  assert.deepEqual(data.fields, { name: 'required', email: 'email', market: 'invalid', topic: 'invalid', message: 'too_short' });
});

test('honeypot filled: 200 ok without sending or verifying turnstile', async () => {
  const { env, sent } = makeEnv();
  let fetchCalled = false;
  const res = await route(
    req('/api/contact', { body: { ...validBody, website: 'http://spam.example' } }),
    env,
    deps(async () => {
      fetchCalled = true;
      return passingTurnstileFetch();
    })
  );
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(sent.length, 0);
  assert.equal(fetchCalled, false);
});

test('turnstile failure returns 403 captcha and does not send', async () => {
  const { env, sent } = makeEnv();
  const res = await route(req('/api/contact', { body: validBody }), env, deps(failingTurnstileFetch));
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, 'captcha');
  assert.equal(sent.length, 0);
});

test('turnstile siteverify network failure returns 500 server', async () => {
  const { env, sent } = makeEnv();
  const res = await route(
    req('/api/contact', { body: validBody }),
    env,
    deps(async () => {
      throw new Error('network down');
    })
  );
  assert.equal(res.status, 500);
  assert.equal((await res.json()).error, 'server');
  assert.equal(sent.length, 0);
});

test('missing TURNSTILE_SECRET fails closed with 500', async () => {
  const { env, sent } = makeEnv({ TURNSTILE_SECRET: undefined });
  const res = await route(req('/api/contact', { body: validBody }), env, deps());
  assert.equal(res.status, 500);
  assert.equal((await res.json()).error, 'server');
  assert.equal(sent.length, 0);
});

test('missing CONTACT_TO returns 500 after turnstile passes, without sending', async () => {
  const { env, sent } = makeEnv({ CONTACT_TO: undefined });
  const res = await route(req('/api/contact', { body: validBody }), env, deps());
  assert.equal(res.status, 500);
  assert.equal((await res.json()).error, 'server');
  assert.equal(sent.length, 0);
});

test('success: 200 ok, exactly one send, correct From/To/Reply-To and decodable non-ASCII subject/body', async () => {
  const { env, sent } = makeEnv({ CONTACT_TO: 'maintainer-placeholder@example.com' });
  const body = { ...validBody, name: '陳小姐', message: 'สวัสดีครับ อยากทราบว่ามีสินค้านี้ไหม? Xin chào!' };
  const res = await route(req('/api/contact', { body }), env, deps());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(sent.length, 1);

  const msg = sent[0];
  assert.equal(msg.from, 'contact@taiwanhaul.com');
  assert.equal(msg.to, 'maintainer-placeholder@example.com');

  const raw = msg.raw;
  const [headerBlock, ...bodyParts] = raw.split('\r\n\r\n');
  const b64Body = bodyParts.join('\r\n\r\n').replace(/\r\n/g, '');
  const decodedBody = Buffer.from(b64Body, 'base64').toString('utf8');
  assert.match(decodedBody, /陳小姐/);
  assert.match(decodedBody, /สวัสดีครับ/);
  assert.match(decodedBody, /Xin chào!/);

  assert.match(headerBlock, /^From: contact@taiwanhaul\.com\r$/m);
  assert.match(headerBlock, /^To: maintainer-placeholder@example\.com\r$/m);
  assert.match(headerBlock, /^Reply-To: ana@example\.com\r$/m);
  assert.match(headerBlock, /^MIME-Version: 1\.0\r$/m);
  assert.match(headerBlock, /^Content-Type: text\/plain; charset=UTF-8\r$/m);
  assert.match(headerBlock, /^Content-Transfer-Encoding: base64\r?$/m);
  assert.match(headerBlock, /^Message-ID: <.+@taiwanhaul\.com>\r$/m);

  const subjectLine = headerBlock.split('\r\n').find((l) => l.startsWith('Subject:'));
  const encodedWords = [...subjectLine.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)].map((m) => m[1]);
  assert.ok(encodedWords.length > 0, 'subject should be RFC 2047 encoded');
  const decodedSubject = encodedWords.map((w) => Buffer.from(w, 'base64').toString('utf8')).join('');
  assert.match(decodedSubject, /陳小姐/);
});

test('turnstile remoteip is forwarded from CF-Connecting-IP', async () => {
  const { env } = makeEnv();
  let seenBody;
  await route(
    req('/api/contact', { body: validBody, headers: { 'CF-Connecting-IP': '203.0.113.5' } }),
    env,
    deps(async (url, opts) => {
      seenBody = new URLSearchParams(opts.body);
      return passingTurnstileFetch();
    })
  );
  assert.equal(seenBody.get('remoteip'), '203.0.113.5');
  assert.equal(seenBody.get('response'), 'dummy-token');
});

test('verifyTurnstile returns false on failure and true on success', async () => {
  assert.equal(await verifyTurnstile({ token: 't', secret: 's', fetchImpl: passingTurnstileFetch }), true);
  assert.equal(await verifyTurnstile({ token: 't', secret: 's', fetchImpl: failingTurnstileFetch }), false);
  assert.equal(await verifyTurnstile({ token: '', secret: 's', fetchImpl: passingTurnstileFetch }), false, 'empty token never verifies');
});

test('mime: header injection attempts are rejected', () => {
  assert.throws(() => assertSafeHeaderValue('ok\r\nBcc: evil@example.com', 'x'));
  assert.throws(() =>
    buildRawEmail({
      from: 'a@b.com',
      to: 'c@d.com\r\nBcc: evil@example.com',
      replyTo: 'e@f.com',
      subject: 'hi',
      date: 'Tue, 24 Sep 2026 00:00:00 GMT',
      messageId: buildMessageId(),
      body: 'hello',
    })
  );
});

test('mime: buildRawEmail wraps base64 body at 76 chars and uses CRLF', () => {
  const raw = buildRawEmail({
    from: 'a@b.com',
    to: 'c@d.com',
    replyTo: 'e@f.com',
    subject: 'Subject',
    date: 'Tue, 24 Sep 2026 00:00:00 GMT',
    messageId: buildMessageId(),
    body: 'x'.repeat(300),
  });
  const bodyPart = raw.split('\r\n\r\n')[1];
  const lines = bodyPart.split('\r\n').filter(Boolean);
  for (const line of lines.slice(0, -1)) assert.ok(line.length <= 76);
});
