import type { components } from '@taiwanhaul/shared'

export type ApiProduct = components['schemas']['Product']
export type ApiSearchResponse = components['schemas']['SearchResponse']
export type SearchResponse = ApiSearchResponse
export type Localized = Record<string, string>
export type Money = { amount: number; currency: string }
export type Product = { id: string; category: string; emoji: string; name: Localized; blurb: Localized; unit: Localized; where: Localized; twPrice: Money }
