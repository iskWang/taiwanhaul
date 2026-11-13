import type { ApiProduct, Product } from '@/Lib/search/type'

export type ProductCardProps = { product: Product | ApiProduct; market: string; locale: string }
