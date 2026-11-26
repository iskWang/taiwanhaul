// Local Estimates are computed here, server-side, from ExchangeRate-API open-access rates (ADR 0004).
// The rate table is never exposed: clients only get converted amounts plus the FX date.
// No new Cloudflare resource: the Worker's Cache API holds the validated upstream answer for a day.
import { MARKETS, VISITOR_MARKETS } from '../src/Lib/data/markets.ts';
import { fromTWD } from '../src/Lib/pricing.ts';

const SOURCE = 'https://open.er-api.com/v6/latest/TWD';
const SUPPORTED = VISITOR_MARKETS.map((code) => MARKETS[code].currency);

type Fx = { date: string; twdPerUnit: Record<string, number> };
type Offer = { amount: number | null; localEstimate?: { amount: number; currency: string; fxDate: string } };
type SearchBody = { market?: string; results?: { offers?: Offer[] }[] };

/** Turn the upstream "1 TWD = r units" table into TWD per 1 unit, dated by the upstream update (UTC). Null unless every supported currency has a positive rate. */
export function parseFx(body: unknown): Fx | null {
  const b = body as { result?: unknown; time_last_update_unix?: unknown; rates?: unknown } | null;
  if (b?.result !== 'success' || typeof b.time_last_update_unix !== 'number' || !b.rates || typeof b.rates !== 'object') return null;
  const rates = b.rates as Record<string, unknown>;
  const twdPerUnit: Record<string, number> = { TWD: 1 };
  for (const code of SUPPORTED) {
    const rate = rates[code];
    if (typeof rate !== 'number' || !(rate > 0) || !Number.isFinite(rate)) return null;
    twdPerUnit[code] = 1 / rate;
  }
  const date = new Date(b.time_last_update_unix * 1000);
  return Number.isNaN(date.getTime()) ? null : { date: date.toISOString().slice(0, 10), twdPerUnit };
}

async function loadFx(fetchImpl: typeof fetch): Promise<Fx | null> {
  // Only a validated answer is cached for a day; a bad or failed answer is never stored, so the next search retries.
  // The Cache API is absent in tests and does nothing on workers.dev: then every search just fetches.
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const key = new Request(SOURCE);
  try {
    const cached = await cache?.match(key).then(async (hit) => (hit ? parseFx(await hit.json()) : null)).catch(() => null);
    if (cached) return cached;
    const upstream = await fetchImpl(SOURCE);
    if (!upstream.ok) return null;
    const text = await upstream.text();
    const fx = parseFx(JSON.parse(text));
    if (fx) await Promise.resolve(cache?.put(key, new Response(text, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=86400' } }))).catch(() => {});
    return fx;
  } catch {
    return null;
  }
}

/** Adds `localEstimate` to each priced Offer of a 200 search response. Any problem returns the response untouched, so Local Estimates are hidden, never guessed. */
export async function withLocalEstimates(response: Response, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (response.status !== 200) return response;
  const body = await response.clone().json().catch(() => null) as SearchBody | null;
  const currency = body?.market && MARKETS[body.market]?.currency;
  if (!currency || !Array.isArray(body.results)) return response;
  const fx = await loadFx(fetchImpl);
  if (!fx) return response;
  for (const result of body.results) {
    for (const offer of result.offers ?? []) {
      const local = offer.amount === null ? null : fromTWD(offer.amount, currency, fx.twdPerUnit);
      if (local) offer.localEstimate = { ...local, fxDate: fx.date };
    }
  }
  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  return new Response(JSON.stringify(body), { status: 200, headers });
}
