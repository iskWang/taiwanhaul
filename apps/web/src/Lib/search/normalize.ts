import type { NormalizedQuery, Product, QueryNormalizer } from './type.ts';

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
export function buildDictionary(products: Product[], genericTerms: Record<string, string> = {}): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
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
 * @returns {QueryNormalizer}
 */
export function createDictionaryNormalizer(dictionary: Array<[string, string]>): QueryNormalizer {
  return {
    id: 'mock-dictionary',
    async normalize(query: string): Promise<NormalizedQuery> {
      const original = String(query ?? '').trim();
      const folded = foldText(original);
      if (containsChinese(original)) {
        return { original, folded, terms: [original], strategy: 'chinese' };
      }
      const terms: string[] = [];
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
