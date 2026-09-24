// Query normalization: visitor text → Chinese terms for Taiwan sources.
// The dictionary normalizer is a stand-in for a future LLM/translation step.

const CJK = /[㐀-鿿豈-﫿]/;

/** Lower-case, trim, collapse spaces and strip Latin diacritics ("Bánh Dứa" → "banh dua"). */
export function foldText(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[À-ɏḀ-ỿ]/g, (ch) => ch.normalize('NFD').replace(/[̀-ͯ]/g, ''))
    .replace(/đ/g, 'd');
}

export function containsChinese(text) {
  return CJK.test(text);
}

/** Build a phrase → Chinese term dictionary from catalog aliases plus generic words. */
export function buildDictionary(products, genericTerms = {}) {
  const entries = [];
  for (const product of products) {
    for (const alias of [product.name.en, ...product.search.aliases]) {
      entries.push([foldText(alias), product.search.zh]);
    }
  }
  for (const [phrase, zh] of Object.entries(genericTerms)) entries.push([foldText(phrase), zh]);
  // Longest phrases first so "oolong tea" wins over "tea".
  return entries.filter(([phrase]) => phrase).sort((a, b) => b[0].length - a[0].length);
}

/**
 * @param {Array<[string, string]>} dictionary  from buildDictionary()
 * @returns {import('./types.js').QueryNormalizer}
 */
export function createDictionaryNormalizer(dictionary) {
  return {
    id: 'mock-dictionary',
    async normalize(query) {
      const original = String(query ?? '').trim();
      const folded = foldText(original);
      if (containsChinese(original)) {
        return { original, folded, terms: [original], strategy: 'chinese' };
      }
      const terms = [];
      let remaining = ` ${folded} `;
      for (const [phrase, zh] of dictionary) {
        const needle = ` ${phrase} `;
        if (remaining.includes(needle)) {
          if (!terms.includes(zh)) terms.push(zh);
          remaining = remaining.replaceAll(needle, ' ');
        }
      }
      if (terms.length) return { original, folded, terms, strategy: 'dictionary' };
      return { original, folded, terms: [folded], strategy: 'passthrough' };
    },
  };
}
