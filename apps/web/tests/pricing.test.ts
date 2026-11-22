import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromTWD } from '../src/Lib/pricing.ts';

test('fromTWD converts with the rate table and returns null for unknown currencies', () => {
  const rates = { TWD: 1, SGD: 25 };
  assert.deepEqual(fromTWD(500, 'SGD', rates), { amount: 20, currency: 'SGD' });
  assert.equal(fromTWD(500, 'XXX', rates), null);
});
