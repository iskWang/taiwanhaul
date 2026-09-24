// Search service: the single entry point the UI (and WebMCP) talks to.
//
//   search(query, ctx) → normalizer.normalize → adapters[].search (in parallel) → merged results
//
// To go live, swap the normalizer and/or adapters below — or replace
// createSearchService() with a thin client that POSTs to a Worker endpoint
// running this same pipeline server-side. The UI only depends on search().
import { PRODUCTS } from '../../data/products.js';
import { GENERIC_TERMS } from '../../data/search-terms.js';
import { buildDictionary, createDictionaryNormalizer } from './normalize.js';
import { createMockCatalogAdapter } from './adapters/mock.js';

export const MAX_QUERY_LENGTH = 200;

export class SearchError extends Error {
  /** @param {'empty_query' | 'query_too_long' | 'all_sources_failed'} code */
  constructor(code, message = code) {
    super(message);
    this.name = 'SearchError';
    this.code = code;
  }
}

/**
 * @param {Object} deps
 * @param {import('./types.js').QueryNormalizer} deps.normalizer
 * @param {import('./types.js').SearchAdapter[]} deps.adapters
 * @param {boolean} [deps.isMock]
 */
export function createSearchService({ normalizer, adapters, isMock = false }) {
  return {
    /**
     * @param {string} rawQuery
     * @param {import('./types.js').SearchContext} ctx
     * @param {{ signal?: AbortSignal }} [opts]
     * @returns {Promise<import('./types.js').SearchResponse>}
     */
    async search(rawQuery, ctx, { signal } = {}) {
      const text = String(rawQuery ?? '').trim();
      if (!text) throw new SearchError('empty_query');
      if (text.length > MAX_QUERY_LENGTH) throw new SearchError('query_too_long');

      const query = await normalizer.normalize(text, ctx);
      const settled = await Promise.allSettled(adapters.map((a) => a.search(query, ctx, { signal })));
      if (signal?.aborted) throw new DOMException('The search was aborted.', 'AbortError');

      const sources = settled.map((outcome, i) => ({
        id: adapters[i].id,
        ok: outcome.status === 'fulfilled',
        count: outcome.status === 'fulfilled' ? outcome.value.length : 0,
        ...(outcome.status === 'rejected' ? { error: String(outcome.reason?.message ?? outcome.reason) } : {}),
      }));
      if (adapters.length && sources.every((s) => !s.ok)) throw new SearchError('all_sources_failed');

      const seen = new Set();
      const results = settled
        .flatMap((outcome) => (outcome.status === 'fulfilled' ? outcome.value : []))
        .filter((r) => (seen.has(r.id) ? false : seen.add(r.id)))
        .sort((a, b) => b.score - a.score || a.price.amount - b.price.amount);

      return { query, results, sources, isMock };
    },
  };
}

/** Default wiring: everything mocked, no network, no API keys. */
export const searchService = createSearchService({
  normalizer: createDictionaryNormalizer(buildDictionary(PRODUCTS, GENERIC_TERMS)),
  adapters: [
    createMockCatalogAdapter({ id: 'mock-mall', label: 'Sample online mall', products: PRODUCTS }),
    createMockCatalogAdapter({
      id: 'mock-cvs',
      label: 'Sample convenience store',
      products: PRODUCTS,
      priceFactor: 1.1,
      filter: (p) => p.category === 'food' || p.category === 'beauty',
      latencyMs: 600,
    }),
  ],
  isMock: true,
});
