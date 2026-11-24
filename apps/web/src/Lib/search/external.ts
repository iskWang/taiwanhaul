export const EXTERNAL_SHOPS = [
  { name: 'Shopee', url: (term: string) => `https://shopee.tw/search?keyword=${encodeURIComponent(term)}` },
  { name: 'momo', url: (term: string) => `https://www.momoshop.com.tw/search/searchShop.jsp?keyword=${encodeURIComponent(term)}` },
  { name: 'PChome', url: (term: string) => `https://24h.pchome.com.tw/search/${encodeURIComponent(term)}` },
  { name: 'Yahoo', url: (term: string) => `https://tw.buy.yahoo.com/search/product?p=${encodeURIComponent(term)}` },
] as const

/** Choose the search term sent to Taiwanese external shops, preferring API-normalized Traditional terms. */
export function externalSearchTerm(searchTerms: readonly string[] | undefined, fallbackQuery: string): string {
  const terms = searchTerms?.map((term) => term.trim()).filter(Boolean)
  if (terms && terms.length > 0) return terms.join(' ')
  return fallbackQuery.trim()
}

/** Build external shop search links for the current query/searchTerms. */
export function buildExternalShopLinks(searchTerms: readonly string[] | undefined, fallbackQuery: string): { name: string; href: string }[] {
  const term = externalSearchTerm(searchTerms, fallbackQuery)
  return EXTERNAL_SHOPS.map((shop) => ({ name: shop.name, href: shop.url(term) }))
}
