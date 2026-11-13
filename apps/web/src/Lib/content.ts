// Homepage curation. Product details live once in the catalog.
import { PRODUCTS } from './data/products.ts';
import { SECTIONS } from './data/sections.ts';
import { pick } from './i18n.ts';
import type { Product } from './search/type.ts';

const productsById = new Map<string, Product>(PRODUCTS.map((product) => [product.id, product]));
const discovery = [...new Set(SECTIONS.productIds)].map((id) => productsById.get(id)).filter((product): product is Product => product !== undefined);

export function getDiscovery(): Product[] {
  return discovery;
}

export function getDiscoveryForLocale(locale: string) {
  return discovery.map((product) => ({ id: product.id, name: pick(product.name, locale), isSampleData: true }));
}
