import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { search } from '../src/Lib/search/index.ts';
import { showPrice, taipeiDate } from '../src/Component/ProductCard/ProductCard.tsx';

test('search calls API with generated contract parameters', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /^\/api\/search\?/);
    assert.match(String(url), /q=tea/);
    return Response.json({ query: 'tea', locale: 'en', market: 'SG', results: [], searchTerms: ['茶'] });
  };
  try { assert.deepEqual(await search('tea', { locale: 'en', market: 'SG' }), { query: 'tea', locale: 'en', market: 'SG', results: [], searchTerms: ['茶'] }); }
  finally { globalThis.fetch = original; }
});

test('price freshness uses Taipei whole-day age and requires known price/date', () => {
  const today = '2026-11-11';
  assert.equal(showPrice(0, '2026-11-11', today), true);
  assert.equal(showPrice(20, '2026-10-12', today), true);
  assert.equal(showPrice(20, '2026-10-11', today), false);
  assert.equal(showPrice(null, '2026-11-11', today), false);
  assert.equal(showPrice(20, null, today), false);
  assert.equal(showPrice(20, '2026-11-12', today), false);
});
test('today is computed using the Asia/Taipei calendar date', () => {
  assert.equal(taipeiDate(new Date('2026-11-10T15:59:59Z')), '2026-11-10');
  assert.equal(taipeiDate(new Date('2026-11-10T16:00:00Z')), '2026-11-11');
});
