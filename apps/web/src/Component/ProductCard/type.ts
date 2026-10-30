import type { Product, NormalizedResult } from '@/Lib/search/type'

export type ProductCardProps = { product: Product | NormalizedResult; market: string; locale: string }
