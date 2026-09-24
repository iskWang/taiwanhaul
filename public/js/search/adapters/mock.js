// Mock Taiwan shop adapter backed by the local sample catalog.
// A real adapter (shop API, marketplace API, …) implements the same
// SearchAdapter shape and returns NormalizedResult[].
import { foldText } from '../normalize.js';

function abortError() {
  return new DOMException('The search was aborted.', 'AbortError');
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(abortError());
    }, { once: true });
  });
}

/** Score how well a product matches the normalized terms (0 = no match). */
function scoreProduct(product, terms) {
  let best = 0;
  const zhHaystack = [product.search.zh, product.name['zh-TW'], product.where?.['zh-TW'] ?? ''];
  const latinHaystack = [product.name.en, ...product.search.aliases].map(foldText);
  for (const term of terms) {
    const folded = foldText(term);
    if (product.search.zh === term) best = Math.max(best, 1);
    else if (zhHaystack.some((text) => text.includes(term))) best = Math.max(best, 0.7);
    else if (folded.length >= 3 && latinHaystack.some((text) => text.includes(folded))) best = Math.max(best, 0.5);
  }
  return best;
}

/**
 * @param {Object} options
 * @param {string} options.id
 * @param {string} options.label
 * @param {import('../types.js').Product[]} options.products
 * @param {number} [options.priceFactor]  Simulates different shops listing different prices
 * @param {(p: import('../types.js').Product) => boolean} [options.filter]  Simulates a narrower shop
 * @param {number} [options.latencyMs]
 * @returns {import('../types.js').SearchAdapter}
 */
export function createMockCatalogAdapter({ id, label, products, priceFactor = 1, filter = () => true, latencyMs = 400 }) {
  return {
    id,
    label,
    async search(query, ctx, { signal } = {}) {
      if (latencyMs > 0) await delay(latencyMs, signal);
      else if (signal?.aborted) throw abortError();
      return products
        .filter(filter)
        .map((product) => ({ product, score: scoreProduct(product, query.terms) }))
        .filter(({ score }) => score > 0)
        .map(({ product, score }) => ({
          id: `${id}:${product.id}`,
          source: id,
          sourceLabel: label,
          title: product.name['zh-TW'],
          translatedTitle: product.name,
          price: { amount: Math.round(product.twPrice.amount * priceFactor), currency: product.twPrice.currency },
          url: null,
          imageUrl: null,
          emoji: product.emoji,
          productId: product.id,
          score,
        }));
    },
  };
}
