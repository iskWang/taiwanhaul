import { test } from 'node:test';
import assert from 'node:assert/strict';
import en from '../src/Lib/data/locales/en.ts';
import { LOCALES } from '../src/Lib/i18n.ts';
import { PRODUCTS } from '../src/Lib/data/products.ts';
import { SECTIONS } from '../src/Lib/data/sections.ts';
import { MARKETS, VISITOR_MARKETS } from '../src/Lib/data/markets.ts';
import { FX } from '../src/Lib/data/fx.ts';
import { getDiscovery } from '../src/Lib/content.ts';

function keyPaths(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keyPaths(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

const LOCALE_CODES = LOCALES.map((l) => l.code);

function assertLocalized(field, label) {
  for (const code of LOCALE_CODES) assert.ok(field?.[code], `${label} missing ${code}`);
}

test('locale files define the same keys and suggestion lists', () => {
  for (const { code, messages } of LOCALES) {
    assert.deepEqual(keyPaths(messages).sort(), keyPaths(en).sort(), code);
    assert.ok(Array.isArray(messages.search.suggestions) && messages.search.suggestions.length, code);
  }
});

test('markets are localized in every locale', () => {
  for (const market of Object.values(MARKETS)) assertLocalized(market.name, market.code);
});

test('every product has localized text, a TWD price and search terms', () => {
  const ids = new Set();
  for (const p of PRODUCTS) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    for (const field of ['name', 'blurb', 'unit', 'where']) assertLocalized(p[field], `${p.id}.${field}`);
    assert.equal(p.twPrice.currency, 'TWD');
    assert.ok(p.search.zh && p.search.aliases.length, p.id);
    assert.ok(en.category[p.category], `${p.id} category label`);
  }
});

test('discovery only references existing products and removes duplicate ids', () => {
  const ids = new Set(PRODUCTS.map((p) => p.id));
  for (const id of SECTIONS.productIds) assert.ok(ids.has(id), id);
  const products = getDiscovery();
  assert.equal(new Set(products.map((p) => p.id)).size, products.length);
  assert.equal(products.length, SECTIONS.productIds.length);
});

test('every visitor market has an exchange rate', () => {
  for (const code of VISITOR_MARKETS) assert.ok(FX.twdPerUnit[MARKETS[code].currency], code);
});
