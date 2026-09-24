// Search pipeline contracts (JSDoc only; no runtime code).
//
//   user query
//     → QueryNormalizer   (today: mock dictionary; later: LLM / translation API)
//     → SearchAdapter[]   (today: mock catalog; later: Taiwan shop / marketplace APIs)
//     → NormalizedResult[] merged by the search service
//
// Anything implementing these shapes can be swapped into createSearchService()
// in search/index.js without touching UI code.

/**
 * @typedef {Record<string, string>} Localized  e.g. { en: '…', 'zh-TW': '…' }
 * @typedef {{ amount: number, currency: string }} Money
 *
 * @typedef {Object} Product  Mock catalog item (see data/products.js)
 * @property {string} id
 * @property {string} category
 * @property {string} emoji
 * @property {Localized} name
 * @property {Localized} blurb
 * @property {Localized} unit
 * @property {Localized} where
 * @property {Money} twPrice
 * @property {Record<string, Money>} [marketPrices]
 * @property {{ zh: string, aliases: string[] }} search
 *
 * @typedef {Object} SearchContext
 * @property {string} locale   UI locale, e.g. "en"
 * @property {string} market   Visitor market code, e.g. "SG"
 *
 * @typedef {Object} NormalizedQuery
 * @property {string} original   What the visitor typed (trimmed)
 * @property {string} folded     Lower-cased, accent-folded form
 * @property {string[]} terms    Chinese search terms to send to Taiwan sources
 * @property {'dictionary' | 'chinese' | 'passthrough'} strategy  How terms were produced
 *
 * @typedef {Object} QueryNormalizer
 * @property {string} id
 * @property {(query: string, ctx: SearchContext) => Promise<NormalizedQuery>} normalize
 *
 * @typedef {Object} NormalizedResult
 * @property {string} id           Unique across sources, e.g. "mock-mall:pineapple-cake"
 * @property {string} source       Adapter id
 * @property {string} sourceLabel  Human-readable source name
 * @property {string} title        Title as listed in Taiwan (usually Chinese)
 * @property {Localized | null} translatedTitle  Visitor-language title when available
 * @property {Money} price
 * @property {string | null} url
 * @property {string | null} imageUrl
 * @property {string} [emoji]      Placeholder visual for mock data
 * @property {string} [productId]  Link to a catalog product when known
 * @property {number} score        0–1 relevance within the source
 *
 * @typedef {Object} SearchAdapter
 * @property {string} id
 * @property {string} label
 * @property {(query: NormalizedQuery, ctx: SearchContext, opts: { signal?: AbortSignal }) => Promise<NormalizedResult[]>} search
 *
 * @typedef {Object} SourceStatus
 * @property {string} id
 * @property {boolean} ok
 * @property {number} count
 * @property {string} [error]
 *
 * @typedef {Object} SearchResponse
 * @property {NormalizedQuery} query
 * @property {NormalizedResult[]} results
 * @property {SourceStatus[]} sources
 * @property {boolean} isMock
 */

export {};
