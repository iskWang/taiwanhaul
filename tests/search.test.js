import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../public/data/products.js';
import { GENERIC_TERMS } from '../public/data/search-terms.js';
import { buildDictionary, createDictionaryNormalizer, foldText } from '../public/js/search/normalize.js';
import { createMockCatalogAdapter } from '../public/js/search/adapters/mock.js';
import { createSearchService, SearchError, searchService } from '../public/js/search/index.js';

const ctx = { locale: 'en', market: 'SG' };
const normalizer = createDictionaryNormalizer(buildDictionary(PRODUCTS, GENERIC_TERMS));
const fastAdapter = createMockCatalogAdapter({ id: 'a', label: 'A', products: PRODUCTS, latencyMs: 0 });

test('foldText lower-cases and strips Latin diacritics', () => {
  assert.equal(foldText('  Bánh   Dứa '), 'banh dua');
  assert.equal(foldText('Đồ'), 'do');
});

test('normalizer maps visitor-language phrases to Chinese terms', async () => {
  assert.deepEqual((await normalizer.normalize('Pineapple Cake', ctx)).terms, ['鳳梨酥']);
  assert.deepEqual((await normalizer.normalize('banh dua', ctx)).terms, ['鳳梨酥']);
  assert.deepEqual((await normalizer.normalize('ชาอู่หลง', ctx)).terms, ['烏龍茶']);
  const q = await normalizer.normalize('oolong tea', ctx);
  assert.equal(q.strategy, 'dictionary');
  assert.deepEqual(q.terms, ['烏龍茶'], 'longest phrase wins over generic "tea"');
});

test('normalizer passes Chinese through and falls back to the folded query', async () => {
  const zh = await normalizer.normalize('鳳梨酥', ctx);
  assert.equal(zh.strategy, 'chinese');
  assert.deepEqual(zh.terms, ['鳳梨酥']);
  const unknown = await normalizer.normalize('Pineapple', ctx);
  assert.equal(unknown.strategy, 'passthrough');
  assert.deepEqual(unknown.terms, ['pineapple']);
});

test('service returns normalized results sorted by score', async () => {
  const service = createSearchService({ normalizer, adapters: [fastAdapter] });
  const res = await service.search('pineapple cake', ctx);
  assert.equal(res.results[0].productId, 'pineapple-cake');
  assert.equal(res.results[0].title, '鳳梨酥（10 入）');
  assert.equal(res.results[0].price.currency, 'TWD');
  assert.deepEqual(res.sources, [{ id: 'a', ok: true, count: res.results.length }]);
});

test('passthrough queries still match English names', async () => {
  const service = createSearchService({ normalizer, adapters: [fastAdapter] });
  const res = await service.search('pineapple', ctx);
  assert.ok(res.results.some((r) => r.productId === 'pineapple-cake'));
});

test('service rejects empty and overly long queries', async () => {
  const service = createSearchService({ normalizer, adapters: [fastAdapter] });
  await assert.rejects(service.search('   ', ctx), (e) => e instanceof SearchError && e.code === 'empty_query');
  await assert.rejects(service.search('x'.repeat(201), ctx), (e) => e.code === 'query_too_long');
});

test('one failing adapter does not fail the search; all failing does', async () => {
  const broken = { id: 'broken', label: 'Broken', search: async () => { throw new Error('down'); } };
  const partial = await createSearchService({ normalizer, adapters: [broken, fastAdapter] }).search('tea', ctx);
  assert.ok(partial.results.length > 0);
  assert.equal(partial.sources.find((s) => s.id === 'broken').ok, false);
  await assert.rejects(
    createSearchService({ normalizer, adapters: [broken] }).search('tea', ctx),
    (e) => e.code === 'all_sources_failed'
  );
});

test('searches can be aborted', async () => {
  const slow = createMockCatalogAdapter({ id: 's', label: 'S', products: PRODUCTS, latencyMs: 50 });
  const controller = new AbortController();
  const pending = createSearchService({ normalizer, adapters: [slow] }).search('tea', ctx, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, (e) => e.name === 'AbortError');
});

test('default service is fully mocked and merges both sample sources', async () => {
  const res = await searchService.search('鳳梨酥', ctx);
  assert.equal(res.isMock, true);
  assert.deepEqual(res.results.map((r) => r.source).sort(), ['mock-cvs', 'mock-mall']);
});
