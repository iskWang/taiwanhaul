/// <reference path="../../admin-api/test/bun-sqlite.d.ts" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Database } from 'bun:sqlite';
import { scheduled, type BackgroundContext, type FxEnv } from '../worker/fx.ts';
import { route as routeApi } from '../worker/router.ts';
import { isAllowedOrigin } from '../worker/origin.ts';
import { verifyTurnstile } from '../worker/turnstile.ts';
import { assertSafeHeaderValue, buildRawEmail, buildMessageId } from '../worker/mime.ts';

import type { Dependencies, Env } from '../worker/handle-contact.ts';
const ORIGIN = 'http://127.0.0.1:8788';

const validBody = {
  name: 'Ana',
  email: 'ana@example.com',
  market: 'ph',
  topic: 'delivery',
  message: 'Where can I buy pineapple cake near Taipei 101?',
  locale: 'en',
  website: '',
  turnstileToken: 'dummy-token',
};

function req(path: string, { method = 'POST', body, headers = {}, origin = ORIGIN, contentType = 'application/json' }: { method?: string; body?: unknown; headers?: HeadersInit; origin?: string | null; contentType?: string | null } = {}): Request {
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
function makeEnv(overrides: Partial<Env> = {}) {
  const sent: unknown[] = [];
  return {
    env: {
      CONTACT_FROM: 'contact@taiwanhaul.com',
      CONTACT_TO: 'maintainer@example.com',
      TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
      SEND_EMAIL: { send: async (msg: unknown) => { sent.push(msg); } },
      ...overrides,
    },
    sent,
  };
}

const passingTurnstileFetch = async () => new Response(JSON.stringify({ success: true }), { status: 200 });
const failingTurnstileFetch = async () => new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), { status: 200 });

class FakeEmailMessage {
  from: string;
  to: string;
  raw: string;
  constructor(from: string, to: string, raw: string) {
    this.from = from;
    this.to = to;
    this.raw = raw;
  }
}

function deps(fetchImpl: typeof fetch = passingTurnstileFetch) {
  return { fetchImpl, EmailMessageCtor: FakeEmailMessage };
}
async function route(request: Request, env: Env & Partial<FxEnv>, deps?: Dependencies & { search?: (request: Request) => Promise<Response> }): Promise<Response> {
  const response = await routeApi(request, { DB: { prepare: () => assert.fail('unexpected D1 access') }, ...env },
    { ...deps });
  if (response === null) throw new Error('expected API response');
  return response;
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
test('search forwards same request and returns upstream response unchanged', async () => {
  const upstream = new Response('{"results":[]}', { status: 206, headers: { 'Content-Type': 'application/json', 'X-Upstream': 'yes' } });
  let forwarded: Request | undefined;
  const response = await route(req('/api/search?q=a%2Fb&locale=en&market=SG', { method: 'GET' }), {}, {
    search: async (request) => { forwarded = request; return upstream; },
  });
  assert.ok(forwarded);
  assert.equal(forwarded.url, 'https://taiwanhaul.example/api/search?q=a%2Fb&locale=en&market=SG');
  assert.equal(response, upstream);
});

test('search rejects non-GET and handles missing or failed binding', async () => {
  const post = await route(req('/api/search', { method: 'POST' }), {});
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('Allow'), 'GET');
  const missing = await route(req('/api/search', { method: 'GET' }), {});
  assert.equal(missing.status, 500);
  assert.deepEqual(await missing.json(), { error: 'search_unavailable' });
  const failed = await route(req('/api/search', { method: 'GET' }), {}, { search: async () => { throw new Error('offline'); } });
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { error: 'search_unavailable' });
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
  assert.equal(isAllowedOrigin('http://taiwanhaul.com'), true);
  assert.equal(isAllowedOrigin('http://evil.taiwanhaul.com'), false);
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
  assert.ok(msg instanceof FakeEmailMessage);
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
  assert.ok(subjectLine);
  const encodedWords = [...subjectLine.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)].map((m) => m[1]);
  assert.ok(encodedWords.length > 0, 'subject should be RFC 2047 encoded');
  const decodedSubject = encodedWords.map((w) => Buffer.from(w, 'base64').toString('utf8')).join('');
  assert.match(decodedSubject, /陳小姐/);
});

test('turnstile remoteip is forwarded from CF-Connecting-IP', async () => {
  const { env } = makeEnv();
  let seenBody: URLSearchParams | undefined;
  await route(
    req('/api/contact', { body: validBody, headers: { 'CF-Connecting-IP': '203.0.113.5' } }),
    env,
    deps(async (_url, opts) => {
      if (!(opts?.body instanceof URLSearchParams)) throw new Error('expected URLSearchParams body');
      seenBody = opts.body;
      return passingTurnstileFetch();
    })
  );
  assert.ok(seenBody);
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

const upstreamFx = { result: 'success', time_last_update_unix: 1_795_651_201, rates: { TWD: 1, SGD: 0.04, MYR: 0.14, THB: 1.1, VND: 800, PHP: 1.8, BAD: 0 } };
const fxFetch = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
type SearchJson = { results: { offers: { localEstimate?: unknown }[] }[] };
const searchBody = (market = 'SG') => ({
  query: 'tea', locale: 'en', market, searchTerms: ['茶'],
  results: [{ id: 'p', brand: 'b', name: 'n', model: 'm', variant: { id: 'v', name: 'v' }, offers: [
    { id: 'o1', merchant: { id: 'm', name: 'M', platform: { id: 'p', name: 'P' } }, outboundLink: 'https://shop.example/1', amount: 500, checkedOn: '2026-11-25' },
    { id: 'o2', merchant: { id: 'm', name: 'M', platform: { id: 'p', name: 'P' } }, outboundLink: 'https://shop.example/2', amount: null, checkedOn: null },
  ] }],
});
const schema = readFileSync(new URL('../../search-api/migrations/0002_fx_rates.sql', import.meta.url), 'utf8');
const storedRates = JSON.stringify({ TWD: 1, SGD: 25, MYR: 1 / 0.14, THB: 1 / 1.1, VND: 1 / 800, PHP: 1 / 1.8 });
const fxDate = '2026-11-26';
function fxDatabase(migrated = true) {
  const sqlite = new Database(':memory:');
  if (migrated) sqlite.exec(schema);
  let prepares = 0;
  const env: FxEnv = { DB: { prepare(sql) {
    prepares++;
    const stmt = sqlite.query(sql);
    return {
      first: async () => {
        const row = stmt.get();
        return row ? { fx_date: String(row.fx_date), rates_json: String(row.rates_json), fetched_at: Number(row.fetched_at) } : null;
      },
      bind: (...args) => ({ run: async () => stmt.run(...args) }),
    };
  } } };
  const seed = (hoursAgo: number, json = storedRates) => sqlite.query('INSERT INTO fx_rates (id, fx_date, rates_json, updated_at, fetched_at) VALUES (1, ?, ?, ?, ?)').run(
    fxDate, json, 1_795_651_201, Math.floor(Date.now() / 1000) - hoursAgo * 3600);
  return { env, sqlite, seed, prepares: () => prepares };
}

function searchRoute(body: unknown, env: FxEnv, fetchImpl: typeof fetch) {
  return route(req('/api/search?q=tea', { method: 'GET' }), env, {
    fetchImpl,
    search: async () => new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json', 'X-Upstream': 'yes' } }),
  });
}

test('search adds Local Estimates from D1 without fetching or exposing rates', async () => {
  const db = fxDatabase();
  db.seed(1);
  let fetches = 0;
  const noFetch = async () => { fetches++; return new Response(null, { status: 502 }); };
  const response = await searchRoute(searchBody('SG'), db.env, noFetch);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Upstream'), 'yes');
  const body = await response.json() as SearchJson;
  // 1 TWD = 0.04 SGD, so 500 TWD = 20 SGD
  assert.deepEqual(body.results[0].offers[0].localEstimate, { amount: 20, currency: 'SGD', fxDate: '2026-11-26' });
  assert.equal(body.results[0].offers[1].localEstimate, undefined);
  assert.equal(JSON.stringify(body).includes('twdPerUnit'), false);
  const vn = await (await searchRoute(searchBody('VN'), db.env, noFetch)).json() as SearchJson;
  assert.deepEqual(vn.results[0].offers[0].localEstimate, { amount: 400_000, currency: 'VND', fxDate: '2026-11-26' });
  assert.equal(fetches, 0);
  db.sqlite.close();
});

test('empty results and unpriced Offers do not touch D1', async () => {
  const db = fxDatabase(false);
  for (const results of [[], [{ offers: [{ amount: null }] }]]) {
    const body = { market: 'SG', results };
    const response = await searchRoute(body, db.env, fxFetch(upstreamFx));
    assert.equal(await response.text(), JSON.stringify(body, null, 2));
  }
  assert.equal(db.prepares(), 0);
  db.sqlite.close();
});

test('missing table, empty table, corrupt JSON and 49h-old FX preserve exact search content', async () => {
  for (const scenario of ['missing table', 'empty', 'bad json', 'incomplete', '49h']) {
    const db = fxDatabase(scenario !== 'missing table');
    if (scenario === 'bad json') db.seed(1, '{broken');
    if (scenario === 'incomplete') db.seed(1, '{"SGD":25}');
    if (scenario === '49h') db.seed(49);
      const body = searchBody();
    const response = await searchRoute(body, db.env, fxFetch(upstreamFx));
    assert.equal(response.status, 200, scenario);
    assert.equal(response.headers.get('X-Upstream'), 'yes');
    assert.equal(await response.text(), JSON.stringify(body, null, 2), scenario);
    db.sqlite.close();
  }
});

test('searching with an empty or stale table never calls the upstream, even concurrently', async () => {
  for (const hours of [null, 25, 49]) {
    const db = fxDatabase();
    if (hours !== null) db.seed(hours);
    let fetches = 0;
    const spy = (async () => { fetches++; return Response.json(upstreamFx); }) as unknown as typeof fetch;
    await Promise.all([1, 2, 3, 4].map(() => searchRoute(searchBody(), db.env, spy)));
    assert.equal(fetches, 0, String(hours));
    db.sqlite.close();
  }
});

test('an older upstream snapshot never overwrites a newer stored one', async () => {
  const db = fxDatabase();
  db.seed(1);
  const original = globalThis.fetch;
  try {
    globalThis.fetch = fxFetch({ ...upstreamFx, time_last_update_unix: 1_795_651_201 - 86_400 });
    const work: Promise<void>[] = [];
    scheduled({}, db.env, { waitUntil: (p) => work.push(p) });
    await Promise.all(work);
  } finally { globalThis.fetch = original; }
  const row = db.sqlite.query('SELECT fx_date, updated_at FROM fx_rates').get();
  assert.deepEqual(row, { fx_date: fxDate, updated_at: 1_795_651_201 });
  db.sqlite.close();
});

test('the public /api/fx rate table no longer exists', async () => {
  for (const method of ['GET', 'POST']) {
    const response = await route(req('/api/fx', { method }), {}, { fetchImpl: fxFetch(upstreamFx) });
    assert.equal(response.status, 404);
  }
});

test('scheduled refresh stores only validated rates and never overwrites a good row on failure', async () => {
  const db = fxDatabase();
  const original = globalThis.fetch;
  async function tick(fetchImpl: typeof fetch) {
    const work: Promise<void>[] = [];
    globalThis.fetch = fetchImpl;
    scheduled({}, db.env, { waitUntil: (promise) => work.push(promise) });
    assert.equal(work.length, 1);
    await Promise.all(work);
  }
  try {
    let endpoint: unknown;
    let signal: AbortSignal | null | undefined;
    await tick(async (url, init) => {
      endpoint = url;
      signal = init?.signal;
      return Response.json(upstreamFx);
    });
    assert.equal(endpoint, 'https://open.er-api.com/v6/latest/TWD');
    assert.ok(signal instanceof AbortSignal);
    const select = db.sqlite.query('SELECT * FROM fx_rates');
    const good = select.get();
    assert.ok(good);
    assert.equal(good.id, 1);
    assert.equal(good.fx_date, fxDate);
    assert.equal(JSON.parse(String(good.rates_json)).SGD, 25);
    assert.ok(Math.abs(Number(good.fetched_at) - Date.now() / 1000) < 5);
    const { SGD: _omit, ...missingSgd } = upstreamFx.rates;
    for (const fetchImpl of [
      fxFetch('down', 502), fxFetch({ result: 'error' }), fxFetch({ ...upstreamFx, rates: null }),
      fxFetch({ ...upstreamFx, rates: missingSgd }), fxFetch({ ...upstreamFx, rates: { ...upstreamFx.rates, THB: 0 } }),
      fxFetch({ ...upstreamFx, time_last_update_unix: -1 }), async () => new Response('{broken'),
      fxFetch({ ...upstreamFx, time_last_update_unix: 253_402_300_800 }), // Beyond YYYY-MM-DD.
      async () => { throw new DOMException('timed out', 'TimeoutError'); },
    ]) {
      await tick(fetchImpl);
      assert.deepEqual(select.all(), [good]);
    }
  } finally {
    globalThis.fetch = original;
    db.sqlite.close();
  }
});
