type Migration = { version: number; name: string; sql: string; queries: string[] };
type JsonObject = Record<string, unknown>;
type D1Statement = { bind(...values: unknown[]): D1Statement; run(): Promise<unknown>; all(): Promise<{ results: { version: number }[] }> };
type D1Database = { prepare(sql: string): D1Statement; batch(statements: D1Statement[]): Promise<unknown[]> };
type Env = { ADMIN_CERT_FINGERPRINTS?: string; DB: D1Database };
type RequestWithCf = Request & { cf?: { tlsClientAuth?: unknown } };
const object = (value: unknown): value is JsonObject => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const invalid = (details: string[]) => Response.json({ error: 'invalid', details }, { status: 400 });
 
// D1 prepare executes one statement. Keep quoted semicolons, comments and trigger
// bodies together; never split migration text with String.split(';').
function statements(sql: string): string[] {
  const tokens = sql.match(/--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[[^\]]*\]|[A-Za-z_][A-Za-z_0-9]*|\s+|[^]/g) ?? [];
  const result: string[] = [];
  let current = '';
  let depth = 0;
  for (const token of tokens) {
    if (token.startsWith('--') || token.startsWith('/*')) {
      current += ' ';
      continue;
    }
    if (token === "'" || token === '"' || token === '`' || token === '[') throw new Error('Unclosed SQL quote');
    const trigger = /^\s*CREATE\s+(?:(?:TEMP|TEMPORARY)\s+)?TRIGGER\b/i.test(current);
    if (trigger && /^(BEGIN|CASE)$/i.test(token)) depth++;
    if (trigger && /^END$/i.test(token)) depth--;
    if (token === ';' && depth === 0) {
      if (current.trim()) result.push(current.trim());
      current = '';
    } else {
      current += token;
    }
  }
  if (depth !== 0) throw new Error('Unclosed SQL trigger');
  if (current.trim()) result.push(current.trim());
  return result;
}

async function migrate(data: unknown, db: D1Database): Promise<Response> {
  if (!object(data) || Object.keys(data).length !== 1 || !Array.isArray(data.migrations)) {
    return invalid(['Expected migrations array']);
  }
  const versions = new Set<number>();
  const migrations: Migration[] = [];
  for (const migration of data.migrations) {
    if (!object(migration) || Object.keys(migration).length !== 3 ||
        typeof migration.version !== 'number' || !Number.isSafeInteger(migration.version) || migration.version < 1 ||
        versions.has(migration.version) || !nonempty(migration.name) || !nonempty(migration.sql)) {
      return invalid(['Invalid or duplicate migration']);
    }
    let queries: string[];
    try { queries = statements(migration.sql); } catch { return invalid(['Invalid migration SQL']); }
    if (!queries.length) return invalid(['Empty migration SQL']);
    versions.add(migration.version);
    migrations.push({ version: migration.version, name: migration.name, sql: migration.sql, queries });
  }
  migrations.sort((a, b) => a.version - b.version);
  await db.prepare('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)').run();
  const { results } = await db.prepare('SELECT version FROM schema_migrations').all();
  const existing = new Set(results.map((row) => row.version));
  const applied: number[] = [];
  for (const migration of migrations) {
    if (existing.has(migration.version)) continue;
    await db.batch([
      ...migration.queries.map((sql) => db.prepare(sql)),
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
        .bind(migration.version, migration.name, new Date().toISOString()),
    ]);
    applied.push(migration.version);
  }
  return Response.json({ applied });
}


export default {
  async fetch(request: RequestWithCf, env: Env): Promise<Response> {
    const tlsClientAuth = request.cf?.tlsClientAuth;
    const cert = object(tlsClientAuth) ? tlsClientAuth : null;
    const fingerprints = typeof env.ADMIN_CERT_FINGERPRINTS === 'string'
      ? env.ADMIN_CERT_FINGERPRINTS.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean) : [];
    if (cert?.certPresented !== '1' || cert.certVerified !== 'SUCCESS' || cert.certRevoked !== '0' ||
        typeof cert.certFingerprintSHA256 !== 'string' ||
        !fingerprints.includes(cert.certFingerprintSHA256.toLowerCase())) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }
    const path = new URL(request.url).pathname;
    if (request.method !== 'POST' || path !== '/migrate') {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }
    let data;
    try { data = await request.json(); } catch { return invalid(['Expected JSON body']); }
    try {
      return await migrate(data, env.DB);
    } catch {
      // Do not return database errors: they can contain private Product Index data.
      return Response.json({ error: 'database' }, { status: 500 });
    }
  },
};
