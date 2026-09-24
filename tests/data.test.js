import { test } from 'node:test';
import assert from 'node:assert/strict';
import en from '../public/data/locales/en.js';
import zhTW from '../public/data/locales/zh-TW.js';
import { PRODUCTS } from '../public/data/products.js';
import { SECTIONS } from '../public/data/sections.js';
import { MARKETS, VISITOR_MARKETS } from '../public/data/markets.js';
import { FX } from '../public/data/fx.js';

function keyPaths(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keyPaths(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

test('locale files define the same keys', () => {
  assert.deepEqual(keyPaths(zhTW).sort(), keyPaths(en).sort());
});

test('every product has localized text, a TWD price and search terms', () => {
  const ids = new Set();
  for (const p of PRODUCTS) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    for (const field of ['name', 'blurb', 'unit', 'where']) {
      assert.ok(p[field].en && p[field]['zh-TW'], `${p.id}.${field}`);
    }
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
