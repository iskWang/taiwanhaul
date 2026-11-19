import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';

const schema = readFileSync(new URL('../../search-api/migrations/0001_product_index.sql', import.meta.url), 'utf8');
const fingerprint = 'ab'.repeat(32);
const cert = { certPresented: '1', certVerified: 'SUCCESS', certRevoked: '0', certFingerprintSHA256: fingerprint.toUpperCase() };
const migration = { migrations: [{ version: 1, name: 'product_index', sql: schema }] };

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
    const response = await worker.fetch(request('/seed', {}, cert), { ADMIN_CERT_FINGERPRINTS: allowlist });
    assert.equal(response.status, 403);
  }
  assert.equal((await worker.fetch(new Request('https://admin.taiwanhaul.com/migrate'), env)).status, 403);
});

test('verified and allowlisted revoked certificate cannot migrate', async () => {
  const { env, sqlite, batches } = database();
  const before = batches();
  const revoked = { ...cert, certRevoked: '1' };
  const response = await worker.fetch(request('/migrate', {
    migrations: [{ version: 2, name: 'revoked', sql: 'CREATE TABLE revoked_write (id TEXT)' }],
  }, revoked), env);
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'forbidden' });
  assert.equal(batches(), before);
  assert.equal(sqlite.query("SELECT COUNT(*) n FROM sqlite_master WHERE name = 'revoked_write'").get().n, 0);
  sqlite.close();
});

test('authenticated unknown paths, including seed, and GET do not parse bodies or access DB', async () => {
  for (const [path, method] of [['/migrate', 'GET'], ['/seed', 'GET'], ['/seed', 'POST'], ['/other', 'POST']]) {
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

