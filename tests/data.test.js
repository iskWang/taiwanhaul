import { test } from 'node:test';
import assert from 'node:assert/strict';
import en from '../public/data/locales/en.js';
import { LOCALES } from '../public/js/i18n.js';
import { PRODUCTS } from '../public/data/products.js';
import { SECTIONS } from '../public/data/sections.js';
import { MARKETS, VISITOR_MARKETS } from '../public/data/markets.js';
import { FX } from '../public/data/fx.js';

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

test('markets and recommendations are localized in every locale', () => {
  for (const market of Object.values(MARKETS)) assertLocalized(market.name, market.code);
  for (const item of SECTIONS.recommended.items) {
    assertLocalized(item.by.role, `${item.productId} role`);
    assertLocalized(item.by.city, `${item.productId} city`);
    assertLocalized(item.quote, `${item.productId} quote`);
  }
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
    for (const [market, price] of Object.entries(p.marketPrices ?? {})) {
      assert.equal(price.currency, MARKETS[market].currency, `${p.id} ${market} currency`);
    }
  }
});

test('sections only reference existing products', () => {
  const ids = new Set(PRODUCTS.map((p) => p.id));
  const refs = [...SECTIONS.cheaper.productIds, ...SECTIONS.mustBuy.productIds, ...SECTIONS.recommended.items.map((i) => i.productId)];
  for (const id of refs) assert.ok(ids.has(id), id);
});

test('every visitor market has an exchange rate', () => {
  for (const code of VISITOR_MARKETS) assert.ok(FX.twdPerUnit[MARKETS[code].currency], code);
});
