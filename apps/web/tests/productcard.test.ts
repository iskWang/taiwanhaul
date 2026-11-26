import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppContainer } from '../src/Container/App/index.ts';
import { ProductCard, taipeiDate } from '../src/Component/ProductCard/ProductCard.tsx';
import type { ApiProduct, ApiOffer } from '../src/Lib/search/type.ts';

// AppContainer reads the page URL for its preferences; there is no DOM in bun test.
Object.assign(globalThis, { location: { search: '?lang=en&market=SG', href: 'http://localhost/?lang=en&market=SG' } });

const offer = (extra: Partial<ApiOffer> = {}): ApiOffer => ({
  id: 'o', merchant: { id: 'm', name: 'Shop', platform: { id: 'p', name: 'P' } }, outboundLink: 'https://shop.example/x',
  amount: 500, checkedOn: taipeiDate(), ...extra,
});
const render = (o: ApiOffer, market = 'SG') => {
  const product = { id: 'p', brand: 'B', name: 'N', model: 'M', variant: { id: 'v', name: 'V' }, offers: [o] } as ApiProduct;
  return renderToStaticMarkup(createElement(AppContainer, null, createElement(ProductCard, { product, market, locale: 'en' })));
};

test('product card shows the TWD price, the Local Estimate and its FX date', () => {
  const html = render(offer({ localEstimate: { amount: 20, currency: 'SGD', fxDate: '2026-11-26' } }));
  assert.match(html, /NT\$500/);
  assert.match(html, /≈ SGD\s?20 \(FX 2026-11-26\)/);
});

test('product card hides the Local Estimate when the Worker sent none', () => {
  const html = render(offer());
  assert.match(html, /NT\$500/);
  assert.doesNotMatch(html, /≈|FX /);
});

test('product card never shows a Local Estimate beside a hidden stale price', () => {
  const html = render(offer({ checkedOn: '2020-01-01', localEstimate: { amount: 20, currency: 'SGD', fxDate: '2026-11-26' } }));
  assert.doesNotMatch(html, /NT\$500|≈/);
});

test('product card hides a Local Estimate whose currency is not the current market\'s', () => {
  const html = render(offer({ localEstimate: { amount: 20, currency: 'SGD', fxDate: '2026-11-26' } }), 'MY');
  assert.match(html, /NT\$500/);
  assert.doesNotMatch(html, /≈|SGD/);
});
