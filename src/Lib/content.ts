// Homepage content source. Today it reads mock data; later this module becomes
// a fetch() to an API returning the same shapes. UI code only calls these functions.
import { PRODUCTS } from './data/products.ts';
import { SECTIONS } from './data/sections.ts';
import { FX } from './data/fx.ts';
import { getMarket } from './market.ts';
import { comparePrices, fromTWD } from './pricing.ts';
import type { Product } from './search/type.ts';

const productsById = new Map<string, Product>(PRODUCTS.map((product) => [product.id, product]));

export function getProduct(id: string): Product | null {
  return productsById.get(id) ?? null;
}

/** Items cheaper in Taiwan than in `marketCode`, biggest saving first. */
export function getCheaperInTaiwan(marketCode: string) {
  const market = getMarket(marketCode);
  if (!market) return [];
  return SECTIONS.cheaper.productIds
    .map(getProduct)
    .filter((product): product is Product => product !== null)
    .map((product) => {
      const localPrice = product.marketPrices?.[marketCode];
      const comparison = localPrice && comparePrices(product.twPrice, localPrice, FX.twdPerUnit);
      if (!comparison || comparison.savingsPct <= 0) return null;
      return {
        product,
        twPrice: product.twPrice,
        twPriceInLocal: fromTWD(comparison.twTWD, market.currency, FX.twdPerUnit),
        localPrice,
        savingsPct: comparison.savingsPct,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.savingsPct - a.savingsPct);
}

export function getMustBuy(): Product[] {
  return SECTIONS.mustBuy.productIds.map(getProduct).filter((product): product is Product => product !== null);
}

export function getRecommended() {
  return SECTIONS.recommended.items
    .map((item) => ({ ...item, product: getProduct(item.productId) }))
    .filter((item): item is typeof item & { product: Product } => item.product !== null);
}

/** Everything the homepage needs for one market. Async so an API can drop in unchanged. */
export async function getHomeContent({ market }) {
  return {
    cheaper: getCheaperInTaiwan(market),
    mustBuy: getMustBuy(),
    recommended: getRecommended(),
    fx: { asOf: FX.asOf, isMock: FX.isMock },
  };
}
