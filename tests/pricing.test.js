import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comparePrices, fromTWD, toTWD } from '../public/js/pricing.js';
import { getCheaperInTaiwan } from '../public/js/content.js';

const rates = { TWD: 1, SGD: 25 };

test('toTWD / fromTWD convert with the rate table', () => {
  assert.equal(toTWD({ amount: 10, currency: 'SGD' }, rates), 250);
  assert.equal(toTWD({ amount: 10, currency: 'XXX' }, rates), null);
  assert.deepEqual(fromTWD(500, 'SGD', rates), { amount: 20, currency: 'SGD' });
});

test('comparePrices computes savings percentage', () => {
  const result = comparePrices({ amount: 500, currency: 'TWD' }, { amount: 40, currency: 'SGD' }, rates);
  assert.equal(result.savingsPct, 50);
  assert.equal(comparePrices({ amount: 1, currency: 'TWD' }, { amount: 1, currency: 'XXX' }, rates), null);
});

test('cheaper section only lists items that are cheaper, biggest saving first', () => {
  for (const market of ['SG', 'MY', 'TH', 'VN', 'PH']) {
    const items = getCheaperInTaiwan(market);
    assert.ok(items.length > 0, market);
    assert.ok(items.every((i) => i.savingsPct > 0));
    assert.deepEqual(items.map((i) => i.savingsPct), [...items.map((i) => i.savingsPct)].sort((a, b) => b - a));
  }
  assert.ok(!getCheaperInTaiwan('VN').some((i) => i.product.id === 'oolong-tea'), 'no VN price → not compared');
  assert.deepEqual(getCheaperInTaiwan('XX'), []);
});
