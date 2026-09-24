// Homepage content source. Today it reads mock data; later this module becomes
// a fetch() to an API returning the same shapes. UI code only calls these functions.
import { PRODUCTS } from '../data/products.js';
import { SECTIONS } from '../data/sections.js';
import { FX } from '../data/fx.js';
import { getMarket } from './market.js';
import { comparePrices, fromTWD } from './pricing.js';

const productsById = new Map(PRODUCTS.map((p) => [p.id, p]));

export function getProduct(id) {
  return productsById.get(id) ?? null;
}

/** Items cheaper in Taiwan than in `marketCode`, biggest saving first. */
export function getCheaperInTaiwan(marketCode) {
  const market = getMarket(marketCode);
  if (!market) return [];
  return SECTIONS.cheaper.productIds
    .map(getProduct)
    .filter(Boolean)
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
    .filter(Boolean)
    .sort((a, b) => b.savingsPct - a.savingsPct);
}

export function getMustBuy() {
  return SECTIONS.mustBuy.productIds.map(getProduct).filter(Boolean);
}

export function getRecommended() {
  return SECTIONS.recommended.items
    .map((item) => ({ ...item, product: getProduct(item.productId) }))
    .filter((item) => item.product);
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
