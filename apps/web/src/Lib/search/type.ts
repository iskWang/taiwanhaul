export type Localized = Record<string, string>
export type Money = { amount: number; currency: string }
export type Product = {
  id: string
  category: string
  emoji: string
  name: Localized
  blurb: Localized
  unit: Localized
  where: Localized
  twPrice: Money
  search: { zh: string; aliases: string[] }
}
export type SearchContext = { locale: string; market: string }
export type NormalizedQuery = {
  original: string
  folded: string
  terms: string[]
  strategy: 'dictionary' | 'chinese' | 'passthrough'
}
export type QueryNormalizer = {
  id: string
  normalize(query: string, ctx: SearchContext): Promise<NormalizedQuery>
}
export type NormalizedResult = {
  id: string
  source: string
  sourceLabel: string
  title: string
  translatedTitle: Localized | null
  price: Money
  url: string | null
  imageUrl: string | null
  emoji?: string
  productId?: string
  score: number
}
export type SearchAdapter = {
  id: string
  label: string
  search(query: NormalizedQuery, ctx: SearchContext, opts: { signal?: AbortSignal }): Promise<NormalizedResult[]>
}
export type SourceStatus = { id: string; ok: boolean; count: number; error?: string }
export type SearchResponse = { query: NormalizedQuery; results: NormalizedResult[]; sources: SourceStatus[]; isMock: boolean }
