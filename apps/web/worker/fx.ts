// Local Estimates are computed here, server-side, from ExchangeRate-API open-access rates (ADR 0004).
// The rate table is never exposed: clients only get converted amounts plus the FX date.
// The web Worker keeps one validated snapshot in its existing D1 database.
import { MARKETS, VISITOR_MARKETS } from '../src/Lib/data/markets.ts';
import { fromTWD } from '../src/Lib/pricing.ts';

const SOURCE = 'https://open.er-api.com/v6/latest/TWD';
const SUPPORTED = VISITOR_MARKETS.map((code) => MARKETS[code].currency);
const DAY = 86_400; // Unix seconds.

type Fx = { date: string; twdPerUnit: Record<string, number> };
type Offer = { amount: number | null; localEstimate?: { amount: number; currency: string; fxDate: string } };
type SearchBody = { market?: string; results?: { offers?: Offer[] }[] };
type FxRow = { fx_date: string; rates_json: string; fetched_at: number };
export type FxEnv = { DB: { prepare(sql: string): {
  first(): Promise<FxRow | null>;
  bind(...values: (string | number)[]): { run(): Promise<unknown> };
} } };
export type BackgroundContext = { waitUntil(work: Promise<void>): void };

function positiveRate(rate: unknown): rate is number {
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0;
}

/** Turn the upstream "1 TWD = r units" table into TWD per 1 unit, dated by the upstream update (UTC). Null unless every supported currency has a positive rate. */
export function parseFx(body: unknown): (Fx & { updatedAt: number }) | null {
  const b = body as { result?: unknown; time_last_update_unix?: unknown; rates?: unknown } | null;
  if (b?.result !== 'success' || typeof b.time_last_update_unix !== 'number' || !Number.isSafeInteger(b.time_last_update_unix) || b.time_last_update_unix <= 0 || !b.rates || typeof b.rates !== 'object') return null;
  const rates = b.rates as Record<string, unknown>;
  const twdPerUnit: Record<string, number> = { TWD: 1 };
  for (const code of SUPPORTED) {
    const rate = rates[code];
    if (!positiveRate(rate)) return null;
    const inverse = 1 / rate;
    if (!Number.isFinite(inverse)) return null;
    twdPerUnit[code] = inverse;
  }
  const date = new Date(b.time_last_update_unix * 1000);
  return date.getUTCFullYear() <= 9999 ? { date: date.toISOString().slice(0, 10), updatedAt: b.time_last_update_unix, twdPerUnit } : null;
}

export async function refreshFxRates(env: FxEnv, fetchImpl: typeof fetch = fetch): Promise<void> {
  try {
    const upstream = await fetchImpl(SOURCE, { signal: AbortSignal.timeout(5000) });
    if (!upstream.ok) return;
    const fx = parseFx(await upstream.json());
    if (!fx) return;
    // An older upstream snapshot never replaces a newer one.
    await env.DB.prepare(`INSERT INTO fx_rates (id, fx_date, rates_json, updated_at, fetched_at) VALUES (1, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET fx_date = excluded.fx_date, rates_json = excluded.rates_json, updated_at = excluded.updated_at, fetched_at = excluded.fetched_at
      WHERE excluded.updated_at >= fx_rates.updated_at`)
      .bind(fx.date, JSON.stringify(fx.twdPerUnit), fx.updatedAt, Math.floor(Date.now() / 1000)).run();
  } catch {
    // A failed fetch or write leaves the previous snapshot in place.
  }
}

export function scheduled(_controller: unknown, env: FxEnv, ctx: BackgroundContext): void {
  ctx.waitUntil(refreshFxRates(env));
}

/** Read-only on D1: never calls the upstream. Adds `localEstimate` to each priced Offer of a 200 search response. Any problem returns the response untouched, so Local Estimates are hidden, never guessed. */
export async function withLocalEstimates(response: Response, env: FxEnv): Promise<Response> {
  if (response.status !== 200) return response;
  const body = await response.clone().json().catch(() => null) as SearchBody | null;
  const currency = body?.market && MARKETS[body.market]?.currency;
  if (!currency || !Array.isArray(body.results) || !body.results.some((result) => result.offers?.some((offer) => Number.isFinite(offer.amount)))) return response;
  let fx: Fx;
  try {
    const row = await env.DB.prepare('SELECT fx_date, rates_json, fetched_at FROM fx_rates WHERE id = 1').first();
    const age = row ? Math.floor(Date.now() / 1000) - row.fetched_at : Infinity;
    if (!row || !Number.isSafeInteger(row.fetched_at) || age < 0 || age > 2 * DAY) return response;
    const rates = JSON.parse(row.rates_json);
    if (!rates || rates.TWD !== 1 || !SUPPORTED.every((code) => positiveRate(rates[code]))) return response;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.fx_date) || new Date(row.fx_date).toISOString().slice(0, 10) !== row.fx_date) return response;
    fx = { date: row.fx_date, twdPerUnit: rates };
  } catch {
    // Also covers a missing migration or malformed stored data.
    return response;
  }
  for (const result of body.results) {
    for (const offer of result.offers ?? []) {
      const local = typeof offer.amount === 'number' && Number.isFinite(offer.amount) ? fromTWD(offer.amount, currency, fx.twdPerUnit) : null;
      if (local) offer.localEstimate = { ...local, fxDate: fx.date };
    }
  }
  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  return new Response(JSON.stringify(body), { status: response.status, statusText: response.statusText, headers });
}
