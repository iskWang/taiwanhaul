const columns = {
  platforms: ['id', 'name'],
  merchants: ['id', 'name', 'platform_id', 'platform_operated'],
  products: ['id', 'brand', 'name', 'model', 'category'],
  variants: ['id', 'product_id', 'name'],
  offers: ['id', 'variant_id', 'merchant_id', 'outbound_link', 'amount', 'checked_on'],
  aliases: ['product_id', 'locale', 'alias'],
};
const tables = Object.keys(columns);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const invalid = (details) => Response.json({ error: 'invalid', details }, { status: 400 });

function seedErrors(data) {
  const errors = [];
  if (!object(data) || Object.keys(data).some((key) => !tables.includes(key)) ||
      tables.some((table) => !Array.isArray(data[table]))) {
    return ['Expected exactly the six table arrays'];
  }
  const ids = Object.fromEntries(tables.map((table) => [table, new Set()]));
  for (const table of tables) {
    for (const [index, row] of data[table].entries()) {
      const path = `${table}[${index}]`;
      if (!object(row)) {
        errors.push(`${path}: expected an object`);
        continue;
      }
      if (Object.keys(row).some((key) => !columns[table].includes(key))) {
        errors.push(`${path}: unknown column`);
      }
      for (const key of columns[table]) {
        const value = row[key];
        let valid;
        if (key === 'platform_operated') {
          valid = value === undefined || value === 0 || value === 1;
        } else if (key === 'amount') {
          valid = value === null || (Number.isSafeInteger(value) && value >= 0);
        } else if (key === 'checked_on') {
          valid = value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
            Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
        } else if (table === 'products' && (key === 'model' || key === 'category')) {
          valid = typeof value === 'string';
        } else {
          valid = nonempty(value);
        }
        if (!valid) errors.push(`${path}.${key}: invalid value`);
      }
      if (table === 'offers') {
        try { new URL(row.outbound_link); } catch { errors.push(`${path}.outbound_link: expected an absolute URI`); }
      }
      const id = table === 'aliases' ? JSON.stringify([row.product_id, row.locale, row.alias]) : row.id;
      if (ids[table].has(id)) errors.push(`${path}: duplicate key`);
      ids[table].add(id);
    }
  }
  for (const [table, key, target] of [
    ['merchants', 'platform_id', 'platforms'],
    ['variants', 'product_id', 'products'],
    ['offers', 'variant_id', 'variants'],
    ['offers', 'merchant_id', 'merchants'],
    ['aliases', 'product_id', 'products'],
  ]) {
    for (const [index, row] of data[table].entries()) {
      if (object(row) && !ids[target].has(row[key])) errors.push(`${table}[${index}].${key}: missing reference`);
    }
  }
  return errors;
}

// D1 prepare executes one statement. Keep quoted semicolons, comments and trigger
// bodies together; never split migration text with String.split(';').
function statements(sql) {
  const tokens = sql.match(/--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[[^\]]*\]|[A-Za-z_][A-Za-z_0-9]*|\s+|[^]/g) ?? [];
  const result = [];
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

async function migrate(data, db) {
  if (!object(data) || Object.keys(data).length !== 1 || !Array.isArray(data.migrations)) {
    return invalid(['Expected migrations array']);
  }
  const versions = new Set();
  const migrations = [];
  for (const migration of data.migrations) {
    if (!object(migration) || Object.keys(migration).length !== 3 ||
        !Number.isSafeInteger(migration.version) || migration.version < 1 ||
        versions.has(migration.version) || !nonempty(migration.name) || !nonempty(migration.sql)) {
      return invalid(['Invalid or duplicate migration']);
    }
    let queries;
    try { queries = statements(migration.sql); } catch { return invalid(['Invalid migration SQL']); }
    if (!queries.length) return invalid(['Empty migration SQL']);
    versions.add(migration.version);
    migrations.push({ ...migration, queries });
  }
  migrations.sort((a, b) => a.version - b.version);
  await db.prepare('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)').run();
  const { results } = await db.prepare('SELECT version FROM schema_migrations').all();
  const existing = new Set(results.map((row) => row.version));
  const applied = [];
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

async function seed(data, db) {
  const errors = seedErrors(data);
  if (errors.length) return invalid(errors);
  const queries = [...tables].reverse().map((table) => db.prepare(`DELETE FROM ${table}`));
  for (const table of tables) {
    const keys = columns[table];
    for (const row of data[table]) {
      queries.push(db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`)
        .bind(...keys.map((key) => key === 'platform_operated' ? (row[key] ?? 1) : row[key])));
    }
  }
  await db.batch(queries);
  return Response.json({ counts: Object.fromEntries(tables.map((table) => [table, data[table].length])) });
}

export default {
  async fetch(request, env) {
    const cert = request.cf?.tlsClientAuth;
    const fingerprints = typeof env.ADMIN_CERT_FINGERPRINTS === 'string'
      ? env.ADMIN_CERT_FINGERPRINTS.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean) : [];
    if (cert?.certPresented !== '1' || cert.certVerified !== 'SUCCESS' || cert.certRevoked !== '0' ||
        typeof cert.certFingerprintSHA256 !== 'string' ||
        !fingerprints.includes(cert.certFingerprintSHA256.toLowerCase())) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }
    const path = new URL(request.url).pathname;
    if (request.method !== 'POST' || (path !== '/migrate' && path !== '/seed')) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }
    let data;
    try { data = await request.json(); } catch { return invalid(['Expected JSON body']); }
    try {
      return await (path === '/migrate' ? migrate(data, env.DB) : seed(data, env.DB));
    } catch {
      // Do not return database errors: they can contain private Product Index data.
      return Response.json({ error: 'database' }, { status: 500 });
    }
  },
};
