import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';

const schema = readFileSync(new URL('../../search-api/migrations/0001_product_index.sql', import.meta.url), 'utf8');
const fingerprint = 'ab'.repeat(32);
const cert = { certPresented: '1', certVerified: 'SUCCESS', certRevoked: '0', certFingerprintSHA256: fingerprint.toUpperCase() };
const migration = { migrations: [{ version: 1, name: 'product_index', sql: schema }] };
const dataset = {
  platforms: [{ id: 'platform', name: 'Example Platform' }],
  merchants: [{ id: 'merchant', name: 'Example Merchant', platform_id: 'platform' }],
  products: [{ id: 'product', brand: 'Example', name: 'Cake', model: '', category: '' }],
  variants: [{ id: 'variant', product_id: 'product', name: 'Small box' }],
  offers: [{ id: 'offer', variant_id: 'variant', merchant_id: 'merchant', outbound_link: 'https://example.com/product', amount: 100, checked_on: '2026-10-30' }],
  aliases: [{ product_id: 'product', locale: 'en', alias: 'Cake' }],
};

function request(path, body, tls = cert, method = 'POST') {
  const req = new Request(`https://admin.taiwanhaul.com${path}`, {
    method,
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
  Object.defineProperty(req, 'cf', { value: { tlsClientAuth: tls } });
  return req;
}

function database() {
  const sqlite = new Database(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  let batches = 0;
  const prepare = (sql, args = []) => ({
    sql, args,
    bind: (...values) => prepare(sql, values),
    run: async () => (sqlite.query(sql).run(...args), { success: true }),
    all: async () => ({ results: sqlite.query(sql).all(...args) }),
  });
  const env = {
    ADMIN_CERT_FINGERPRINTS: ` , ${fingerprint}, ${'cd'.repeat(32)} `,
    DB: {
      prepare,
      batch: async (queries) => {
        batches++;
        return sqlite.transaction(() => queries.map(({ sql, args }) => {
          sqlite.query(sql).run(...args);
          return { success: true };
        }))();
      },
    },
  };
  return { env, sqlite, batches: () => batches };
}

async function initialized() {
  const db = database();
  assert.equal((await worker.fetch(request('/migrate', migration), db.env)).status, 200);
  assert.equal((await worker.fetch(request('/seed', dataset), db.env)).status, 200);
  return db;
}

function snapshot(sqlite) {
  return Object.fromEntries(Object.keys(dataset).map((table) => [table, sqlite.query(`SELECT * FROM ${table}`).all()]));
}

test('authentication fails closed before body parsing or database access', async () => {
  const env = { ADMIN_CERT_FINGERPRINTS: fingerprint, get DB() { throw new Error('DB touched'); } };
  for (const tls of [null, {}, { ...cert, certPresented: '0' }, { ...cert, certPresented: 1 },
    { ...cert, certVerified: 'FAIL' }, { ...cert, certVerified: undefined },
    { ...cert, certRevoked: '1' }, { ...cert, certRevoked: undefined },
    { ...cert, certRevoked: 0 }, { ...cert, certRevoked: '' }, { ...cert, certRevoked: null },
    { ...cert, certFingerprintSHA256: undefined }, { ...cert, certFingerprintSHA256: '' },
    { ...cert, certFingerprintSHA256: 'cd'.repeat(32) }]) {
    const req = request('/migrate', migration, tls);
    req.json = () => { throw new Error('Body read'); };
    const response = await worker.fetch(req, env);
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: 'forbidden' });
  }
  for (const allowlist of ['', ' , , ', undefined, null]) {
    const response = await worker.fetch(request('/seed', dataset), { ADMIN_CERT_FINGERPRINTS: allowlist });
    assert.equal(response.status, 403);
  }
  assert.equal((await worker.fetch(new Request('https://admin.taiwanhaul.com/migrate'), env)).status, 403);
});

test('verified and allowlisted revoked certificate cannot migrate or replace seed data', async () => {
  const { env, sqlite, batches } = await initialized();
  const original = snapshot(sqlite);
  const before = batches();
  const revoked = { ...cert, certRevoked: '1' };
  for (const [path, body] of [
    ['/seed', Object.fromEntries(Object.keys(dataset).map((table) => [table, []]))],
    ['/migrate', { migrations: [{ version: 2, name: 'revoked', sql: 'CREATE TABLE revoked_write (id TEXT)' }] }],
  ]) {
    const response = await worker.fetch(request(path, body, revoked), env);
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: 'forbidden' });
    assert.deepEqual(snapshot(sqlite), original);
    assert.equal(batches(), before);
  }
  assert.equal(sqlite.query('SELECT COUNT(*) n FROM schema_migrations').get().n, 1);
  assert.equal(sqlite.query("SELECT COUNT(*) n FROM sqlite_master WHERE name = 'revoked_write'").get().n, 0);
  sqlite.close();
});

test('authenticated unknown paths and GET do not parse bodies or access DB', async () => {
  for (const [path, method] of [['/migrate', 'GET'], ['/seed', 'GET'], ['/other', 'POST']]) {
    const req = request(path, {}, cert, method);
    req.json = () => { throw new Error('Body read'); };
    const response = await worker.fetch(req, { ADMIN_CERT_FINGERPRINTS: fingerprint });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'not_found' });
  }
});

test('migrations apply ascending, once, and each version uses an atomic batch', async () => {
  const { env, sqlite, batches } = database();
  const body = { migrations: [
    { version: 2, name: 'second', sql: "INSERT INTO notes VALUES ('second');" },
    { version: 1, name: 'first', sql: "CREATE TABLE notes (value TEXT); INSERT INTO notes VALUES ('first');" },
  ] };
  const response = await worker.fetch(request('/migrate', body), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { applied: [1, 2] });
  assert.deepEqual(sqlite.query('SELECT value FROM notes').all(), [{ value: 'first' }, { value: 'second' }]);
  assert.equal(batches(), 2);
  assert.deepEqual(await (await worker.fetch(request('/migrate', body), env)).json(), { applied: [] });
  assert.equal(batches(), 2);
  sqlite.close();
});

test('SQL preserves quoted semicolons, comments and multi-statement triggers', async () => {
  const { env, sqlite } = database();
  const sql = `-- comment ;
    CREATE TABLE notes (value TEXT);
    CREATE TABLE audit (value TEXT);
    /* comment ; */ CREATE TRIGGER track AFTER INSERT ON notes BEGIN
      INSERT INTO audit VALUES (CASE WHEN NEW.value = 'a;b' THEN 'it''s;a' ELSE 'other' END);
      INSERT INTO audit VALUES ('second; entry');
    END;
    INSERT INTO notes VALUES ('a;b');`;
  const response = await worker.fetch(request('/migrate', { migrations: [{ version: 1, name: 'trigger', sql }] }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(sqlite.query('SELECT value FROM audit').all(), [{ value: "it's;a" }, { value: 'second; entry' }]);
  sqlite.close();
});

test('broken migration rolls back its DDL and version row without leaking SQL', async () => {
  const { env, sqlite } = database();
  const response = await worker.fetch(request('/migrate', { migrations: [
    { version: 1, name: 'broken', sql: 'CREATE TABLE secret (id TEXT); INVALID SQL;' },
  ] }), env);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'database' });
  assert.equal(sqlite.query("SELECT COUNT(*) n FROM sqlite_master WHERE name = 'secret'").get().n, 0);
  assert.equal(sqlite.query('SELECT COUNT(*) n FROM schema_migrations').get().n, 0);
  sqlite.close();
});

test('invalid migration payloads do not write anything', async () => {
  const { env, sqlite } = database();
  for (const body of [null, [], {}, { migrations: {} }, { migrations: [null] },
    { migrations: [...migration.migrations, ...migration.migrations] },
    { migrations: [{ version: 0, name: 'zero', sql: 'SELECT 1' }] },
    { migrations: [{ version: 1, name: 'empty', sql: '-- only a comment' }] }]) {
    assert.equal((await worker.fetch(request('/migrate', body), env)).status, 400);
  }
  assert.equal(sqlite.query('SELECT COUNT(*) n FROM sqlite_master').get().n, 0);
  sqlite.close();
});

test('seed replaces all tables atomically, accepts nulls and defaults platform_operated', async () => {
  const { env, sqlite, batches } = await initialized();
  assert.equal(sqlite.query('SELECT platform_operated FROM merchants').get().platform_operated, 1);
  const next = structuredClone(dataset);
  next.offers[0].amount = null;
  next.offers[0].checked_on = null;
  next.products[0].name = 'New Cake';
  next.merchants[0].platform_operated = 0;
  const before = batches();
  const response = await worker.fetch(request('/seed', next), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { counts: Object.fromEntries(Object.keys(dataset).map((table) => [table, 1])) });
  assert.equal(batches(), before + 1);
  assert.deepEqual(snapshot(sqlite), next);
  sqlite.close();
});

test('every invalid record rejects the whole seed without touching existing rows', async () => {
  const { env, sqlite, batches } = await initialized();
  const original = snapshot(sqlite);
  const before = batches();
  for (const mutate of [
    (s) => delete s.aliases, (s) => s.extra = [], (s) => s.products = {},
    (s) => s.products.push(null), (s) => s.products[0].extra = 'bad',
    (s) => delete s.products[0].model, (s) => s.products[0].brand = '  ',
    (s) => s.merchants[0].platform_operated = true,
    (s) => s.offers[0].amount = -1, (s) => s.offers[0].amount = '100',
    (s) => s.offers[0].amount = 1.5, (s) => s.offers[0].amount = Number.MAX_SAFE_INTEGER + 1,
    (s) => s.offers[0].checked_on = '2026-02-30', (s) => s.offers[0].checked_on = '30/10/2026',
    (s) => s.offers[0].outbound_link = '/relative',
    (s) => s.products.push({ ...s.products[0] }), (s) => s.aliases.push({ ...s.aliases[0] }),
    (s) => s.merchants[0].platform_id = 'missing', (s) => s.variants[0].product_id = 'missing',
    (s) => s.offers[0].variant_id = 'missing', (s) => s.offers[0].merchant_id = 'missing',
    (s) => s.aliases[0].product_id = 'missing',
  ]) {
    const body = structuredClone(dataset);
    mutate(body);
    const response = await worker.fetch(request('/seed', body), env);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'invalid');
    assert.deepEqual(snapshot(sqlite), original);
    assert.equal(batches(), before);
  }
  const malformed = request('/seed', dataset);
  malformed.json = async () => { throw new SyntaxError('bad JSON'); };
  assert.equal((await worker.fetch(malformed, env)).status, 400);
  sqlite.close();
});

test('database failure after seed deletes rolls back all prior rows', async () => {
  const { env, sqlite } = await initialized();
  const original = snapshot(sqlite);
  sqlite.exec("CREATE TRIGGER reject_offer BEFORE INSERT ON offers BEGIN SELECT RAISE(ABORT, 'private data'); END;");
  const response = await worker.fetch(request('/seed', dataset), env);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'database' });
  assert.deepEqual(snapshot(sqlite), original);
  sqlite.close();
});
