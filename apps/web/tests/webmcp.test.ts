import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTools, registerWebMcp } from '../src/Lib/webmcp.ts';
import { getDiscoveryForLocale } from '../src/Lib/content.ts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppContainer, useAppContext } from '../src/Container/App/index.ts';
import { SearchContainer, useSearchContext, shouldRepeatMarketSearch } from '../src/Container/Search/index.ts';
type TestTool = { execute(args?: unknown): Promise<{ content: { text: string }[]; isError?: boolean }> };

const api = {
  locales: ['en', 'zh-TW'],
  markets: ['SG'],
  topics: ['delivery'],
  search: async (query: string) => ({ query, results: [] }),
  listFeatured: async () => getDiscoveryForLocale('en'),
  setPreferences: (p: { locale?: string; market?: string }) => ({ locale: p.locale ?? 'en', market: 'SG' }),
  getPreferences: () => ({ locale: 'en', market: 'SG' }),
  openContactForm: () => {},
};

test('does nothing without navigator.modelContext', () => {
  assert.equal(registerWebMcp(api, {}), false);
  assert.equal(registerWebMcp(api, undefined), false);
});

test('registers tools via provideContext, or registerTool as a fallback', () => {
  let provided: { tools: { name: string }[] } | undefined;
  assert.equal(registerWebMcp(api, { modelContext: { provideContext: (ctx: { tools: { name: string }[] }) => (provided = ctx) } }), true);
  assert.ok(provided);
  assert.deepEqual(provided.tools.map((t) => t.name), ['search_taiwan_products', 'list_featured_products', 'set_preferences', 'open_contact_form']);

  const registered: string[] = [];
  assert.equal(registerWebMcp(api, { modelContext: { registerTool: (t) => registered.push(t.name) } }), true);
  assert.equal(registered.length, 4);
});

test('tools return MCP text content and surface errors', async () => {
  const [search] = buildTools(api) as unknown as TestTool[];
  const ok = await search.execute({ query: 'tea' });
  assert.equal(JSON.parse(ok.content[0].text).query, 'tea');

  const [failing] = buildTools({ ...api, search: async () => { throw Object.assign(new Error('x'), { code: 'empty_query' }); } }) as unknown as TestTool[];
  const err = await failing.execute({ query: '' });
  assert.equal(err.isError, true);
  assert.match(err.content[0].text, /empty_query/);
  const [, featured] = buildTools(api) as unknown as TestTool[];
  const result = await featured.execute();
  const products = JSON.parse(result.content[0].text);
  assert.equal(products.length, 12);
  assert.ok(products.every((product: { twPrice?: unknown; price?: unknown }) => !('twPrice' in product) && !('price' in product)));
});

test('set_preferences then search without a market uses MY before React renders again', async () => {
  const location = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const history = Object.getOwnPropertyDescriptor(globalThis, 'history');
  const originalFetch = globalThis.fetch;
  const requests: { market: string | null; signal?: AbortSignal | null }[] = [];
  let tools: TestTool[] = [];
  function Capture() {
    const { setPreferences } = useAppContext();
    const { runSearch } = useSearchContext();
    tools = buildTools({ ...api, markets: ['SG', 'MY'], setPreferences,
      search: (query) => runSearch(query, 'webmcp'),
    }) as unknown as TestTool[];
    return null;
  }
  try {
    Object.defineProperty(globalThis, 'location', { configurable: true, value: new URL('https://taiwanhaul.example/?lang=en&market=SG') });
    Object.defineProperty(globalThis, 'history', { configurable: true, value: { replaceState() {} } });
    globalThis.fetch = async (url, init) => {
      const market = new URL(String(url), 'https://taiwanhaul.example').searchParams.get('market');
      requests.push({ market, signal: init?.signal });
      return Response.json({ query: 'tea', locale: 'en', market, results: [], searchTerms: [] });
    };
    renderToStaticMarkup(createElement(AppContainer, null, createElement(SearchContainer, null, createElement(Capture))));
    const changed = tools[2].execute({ market: 'MY' });
    const searching = tools[0].execute({ query: 'tea' });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].market, 'MY');
    // No DOM/effects in server rendering. Exercise the same guard as the market-change effect.
    assert.equal(shouldRepeatMarketSearch('tea', requests[0].market, 'MY'), false);
    assert.equal(shouldRepeatMarketSearch('tea', requests[0].market, 'SG'), true);
    assert.equal(requests[0].signal?.aborted, false);
    assert.equal((await changed).isError, undefined);
    assert.equal((await searching).isError, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    if (location) Object.defineProperty(globalThis, 'location', location); else Reflect.deleteProperty(globalThis, 'location');
    if (history) Object.defineProperty(globalThis, 'history', history); else Reflect.deleteProperty(globalThis, 'history');
  }
});
