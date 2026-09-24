import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTools, registerWebMcp } from '../public/js/webmcp.js';

const api = {
  locales: ['en', 'zh-TW'],
  markets: ['SG'],
  topics: ['general'],
  search: async (query) => ({ query, results: [] }),
  listFeatured: async (section) => [{ section }],
  setPreferences: (p) => ({ locale: p.locale ?? 'en', market: 'SG' }),
  getPreferences: () => ({ locale: 'en', market: 'SG' }),
  openContactForm: () => {},
};

test('does nothing without navigator.modelContext', () => {
  assert.equal(registerWebMcp(api, {}), false);
  assert.equal(registerWebMcp(api, undefined), false);
});

test('registers tools via provideContext, or registerTool as a fallback', () => {
  let provided;
  assert.equal(registerWebMcp(api, { modelContext: { provideContext: (ctx) => (provided = ctx) } }), true);
  assert.deepEqual(provided.tools.map((t) => t.name), ['search_taiwan_products', 'list_featured_products', 'set_preferences', 'open_contact_form']);

  const registered = [];
  assert.equal(registerWebMcp(api, { modelContext: { registerTool: (t) => registered.push(t.name) } }), true);
  assert.equal(registered.length, 4);
});

test('tools return MCP text content and surface errors', async () => {
  const [search] = buildTools(api);
  const ok = await search.execute({ query: 'tea' });
  assert.equal(JSON.parse(ok.content[0].text).query, 'tea');

  const [failing] = buildTools({ ...api, search: async () => { throw Object.assign(new Error('x'), { code: 'empty_query' }); } });
  const err = await failing.execute({ query: '' });
  assert.equal(err.isError, true);
  assert.match(err.content[0].text, /empty_query/);
});
