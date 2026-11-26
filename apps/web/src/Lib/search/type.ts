import type { components } from '@taiwanhaul/shared'

type Schemas = components['schemas']
/** Added by the web Worker to priced Offers when daily FX is available; absent otherwise. */
export type LocalEstimate = { amount: number; currency: string; fxDate: string }
export type ApiOffer = Schemas['Offer'] & { localEstimate?: LocalEstimate }
export type ApiProduct = Omit<Schemas['Product'], 'offers'> & { offers: ApiOffer[] }
export type ApiSearchResponse = Omit<Schemas['SearchResponse'], 'results'> & { results: ApiProduct[] }
export type SearchResponse = ApiSearchResponse
export type Localized = Record<string, string>
export type Money = { amount: number; currency: string }
export type Product = { id: string; category: string; emoji: string; name: Localized; blurb: Localized; unit: Localized; where: Localized; twPrice: Money }
