import { describe, expect, test } from 'bun:test';
import { parseShoplineList, parseShoplineProduct } from '../src/shopline.ts';

const card = (id, content = '', variants = [], hasSelector = true) => `<div class="product-item"><product-item product-id="${id}" ${hasSelector ? 'class="has-variant-selector"' : ''}><a href="/products/${id}" ga-product='${JSON.stringify({ title: 'Cake &amp; tea', variations: JSON.stringify(variants) })}'>${content}<div class="title">Visible title</div></a></product-item></div>`;
const page = (html) => parseShoplineList(html, 'https://shop.example.tw/products');

const productPage = (product) => `app.value('product', JSON.parse('${JSON.stringify(JSON.stringify(product)).slice(1, -1)}'))`;

describe('parseShoplineList', () => {
  test('extracts title, variant, price, absolute URL and next pagination link', () => {
    const result = page(`${card('p1', '<div class="price-sale">NT$1,280</div><div class="price-crossed">NT$1,500</div>', ['large'])}<ul class="pagination"><li class="active"><a href="?page=1">1</a></li><li><a href="?page=2&amp;limit=24">2</a></li></ul>`);
    expect(result.items).toEqual([{ id: 'p1', name: 'Cake & tea', url: 'https://shop.example.tw/products/p1', amount: 1280, hasVariants: true }]);
    expect(result.nextPageUrl).toBe('https://shop.example.tw/products?page=2&limit=24');
    expect(page(card('p2', '', ['small'], false)).items[0].hasVariants).toBe(true);
    expect(page(card('p3', '', [], true)).items[0].hasVariants).toBe(false);
  });

  test('uses regular amount when no sale, treats zero and missing prices as null', () => {
    expect(page(card('p2', '<div class="price">NT$245</div>')).items[0].amount).toBe(245);
    expect(page(card('p3', '<div class="price-sale">NT$0</div><div class="price-crossed">NT$20</div>')).items[0].amount).toBeNull();
    expect(page(card('p4')).items[0].amount).toBeNull();
  });

  test('keeps first duplicate id and handles empty page', () => {
    expect(page(card('same', '<div class="price">NT$10</div>') + card('same', '<div class="price">NT$20</div>')).items[0].amount).toBe(10);
    expect(page('<html><body>nothing</body></html>')).toEqual({ items: [], nextPageUrl: null });
  });

});

describe('parseShoplineProduct', () => {
  const product = (overrides = {}) => ({
    _id: 'p1',
    title_translations: { en: '  Cake  ', 'zh-hant': ' 鳳梨酥 ' },
    hide_price: false,
    is_preorder: true,
    sold_out: false,
    unlimited_quantity: false,
    out_of_stock_orderable: false,
    quantity: 5,
    variations: [],
    price: { cents: 200 },
    price_sale: { cents: 150 },
    ...overrides,
  });

  test('parses product-level data and picks sale price', () => {
    expect(parseShoplineProduct(productPage(product()), 'https://shop.example.tw/p')).toEqual({
      id: 'p1', name: '鳳梨酥', preorder: true,
      variants: [{ id: 'p1', label: '', amount: 150, soldOut: false }],
    });
  });

  test('parses per-variant labels, prices and stock state', () => {
    const data = product({
      variations: [
        { key: 'v1', fields_translations: { 'zh-hant': ['大盒', '12 入'] }, quantity: 0, price_sale: { cents: 0 }, price: { cents: 240 } },
        { key: 'v2', fields_translations: { en: ['Small'] }, quantity: 2, price_sale: { cents: 100 }, price: { cents: 240 } },
      ],
      unlimited_quantity: false,
      out_of_stock_orderable: false,
    });
    expect(parseShoplineProduct(productPage(data), '')?.variants).toEqual([
      { id: 'v1', label: '大盒 / 12 入', amount: 240, soldOut: true },
      { id: 'v2', label: '', amount: 100, soldOut: false },
    ]);
  });

  test('hides prices, respects product sold-out flags and falls back to translated title', () => {
    const data = product({
      title_translations: { en: ' Cake ' },
      hide_price: true,
      sold_out: true,
      variations: [{ key: 'v1', fields_translations: {}, quantity: 4, price: { cents: 200 } }],
    });
    expect(parseShoplineProduct(productPage(data), '')).toEqual({
      id: 'p1', name: 'Cake', preorder: true,
      variants: [{ id: 'v1', label: '', amount: null, soldOut: true }],
    });
  });

  test('returns null for missing or broken product data and decodes JS escapes', () => {
    expect(parseShoplineProduct('<html></html>', '')).toBeNull();
    expect(parseShoplineProduct("app.value('product', JSON.parse('{broken'))", '')).toBeNull();
    const encoded = `app.value('product', JSON.parse('{"_id":"p\\x271","title_translations":{"zh-hant":"A\\u0026B"},"variations":[]}'))`;
    expect(parseShoplineProduct(encoded, '')?.name).toBe('A&B');
  });

  test('returns null for unreadable variants and labels without throwing', () => {
    expect(parseShoplineProduct(productPage(product({ variations: [null] })), '')).toBeNull();
    expect(parseShoplineProduct(productPage(product({
      variations: [{ key: 'v1', fields_translations: { 'zh-hant': 'not an array' } }],
    })), '')).toBeNull();
    expect(parseShoplineProduct(null, '')).toBeNull();
  });

  test('accepts identity and braced Unicode escapes in the JS string', () => {
    const html = String.raw`app.value('product', JSON.parse('{"_id":"p1","title_translations":{"zh-hant":"\a\u{41}"},"variations":[]}'))`;
    expect(parseShoplineProduct(html, '')?.name).toBe('aA');
  });


  test('accepts JavaScript line continuations in product strings', () => {
    const prefix = "app.value('product', JSON.parse('{\"_id\":\"p1\",\"title_translations\":{\"zh-hant\":\"A";
    const suffix = "B\"},\"variations\":[]}'))";
    for (const ending of ['\n', '\r\n', '\u2028', '\u2029']) {
      expect(parseShoplineProduct(prefix + '\\' + ending + suffix, '')?.name).toBe('AB');
    }
  });
  test('returns null for non-integer and unsafe prices', () => {
    const decimal = product({ price_sale: { cents: 1.5 }, price: { cents: 200 } });
    const unsafe = product({ price_sale: { cents: 0 }, price: { cents: Number.MAX_SAFE_INTEGER + 1 } });
    expect(parseShoplineProduct(productPage(decimal), '')?.variants[0].amount).toBeNull();
    expect(parseShoplineProduct(productPage(unsafe), '')?.variants[0].amount).toBeNull();
  });
});

