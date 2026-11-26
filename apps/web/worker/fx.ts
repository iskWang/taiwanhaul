// Local Estimates are computed here, server-side, from ExchangeRate-API open-access rates (ADR 0004).
// The rate table is never exposed: clients only get converted amounts plus the FX date.
// No new Cloudflare resource: Cloudflare's edge cache holds the upstream answer for a day.
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
  try {
    // A failed answer is not cached, so the next search retries.
    const upstream = await fetchImpl(SOURCE, { cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 86_400, '300-599': 0 } } } as RequestInit);
    return upstream.ok ? parseFx(await upstream.json()) : null;
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
