// Daily FX rates for Local Estimates, from ExchangeRate-API open access (ADR 0004).
// No new Cloudflare resource: Cloudflare's edge cache holds the upstream answer for a day.
const SOURCE = 'https://open.er-api.com/v6/latest/TWD';

export type Fx = { date: string; twdPerUnit: Record<string, number> };

/** Turn the upstream "1 TWD = r units" table into TWD per 1 unit, dated by the upstream update (UTC). */
export function parseFx(body: unknown): Fx | null {
  const b = body as { result?: unknown; time_last_update_unix?: unknown; rates?: Record<string, unknown> } | null;
  if (b?.result !== 'success' || typeof b.time_last_update_unix !== 'number' || !b.rates) return null;
  const twdPerUnit: Record<string, number> = { TWD: 1 };
  for (const [code, rate] of Object.entries(b.rates)) {
    if (code !== 'TWD' && typeof rate === 'number' && rate > 0 && Number.isFinite(rate)) twdPerUnit[code] = 1 / rate;
  }
  return { date: new Date(b.time_last_update_unix * 1000).toISOString().slice(0, 10), twdPerUnit };
}

export async function handleFx(fetchImpl: typeof fetch = fetch): Promise<Response> {
  try {
    const upstream = await fetchImpl(SOURCE, { cf: { cacheTtl: 86_400, cacheEverything: true } } as RequestInit);
    const fx = upstream.ok ? parseFx(await upstream.json()) : null;
    if (fx) return new Response(JSON.stringify(fx), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' } });
  } catch { /* fall through: the page hides Local Estimates when FX is unavailable */ }
  return new Response(JSON.stringify({ error: 'fx_unavailable' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
}
