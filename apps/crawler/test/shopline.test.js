import { describe, expect, test } from 'bun:test';
import { parseShoplineList } from '../src/shopline.js';

const card = (id, content = '', variants = [], hasSelector = true) => `<div class="product-item"><product-item product-id="${id}" ${hasSelector ? 'class="has-variant-selector"' : ''}><a href="/products/${id}" ga-product='${JSON.stringify({ title: 'Cake &amp; tea', variations: JSON.stringify(variants) })}'>${content}<div class="title">Visible title</div></a></product-item></div>`;
const page = (html) => parseShoplineList(html, 'https://shop.example.tw/products');

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
