import { test } from 'node:test';
import assert from 'node:assert/strict';
import { submitContact, validateContact } from '../public/js/contact.js';

const valid = { name: 'Ana', email: 'ana@example.com', market: 'ph', topic: 'general', message: 'Where can I buy tea?', locale: 'en', website: '' };

test('validateContact accepts and normalizes valid input', () => {
  const { ok, value } = validateContact({ ...valid, name: '  Ana ' });
  assert.equal(ok, true);
  assert.equal(value.name, 'Ana');
  assert.equal(value.market, 'PH');
});

test('validateContact reports field codes', () => {
  const { ok, errors } = validateContact({ name: '', email: 'nope', market: 'US', topic: 'spam', message: 'short' });
  assert.equal(ok, false);
  assert.deepEqual(errors, { name: 'required', email: 'email', market: 'invalid', topic: 'invalid', message: 'too_short' });
  assert.equal(validateContact({ ...valid, market: '' }).ok, true, 'market is optional');
});

const fakeFetch = (status, body) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    if (body === undefined) throw new SyntaxError('not json');
    return body;
  },
});

test('submitContact maps responses', async () => {
  assert.deepEqual(await submitContact(valid, { fetchImpl: fakeFetch(200, { ok: true }) }), { ok: true });
  assert.deepEqual(await submitContact(valid, { fetchImpl: fakeFetch(400, { ok: false, error: 'validation', fields: { email: 'email' } }) }), {
    ok: false,
    error: 'validation',
    fields: { email: 'email' },
  });
  assert.deepEqual(await submitContact(valid, { fetchImpl: fakeFetch(403, undefined) }), { ok: false, error: 'captcha' });
  assert.deepEqual(await submitContact(valid, { fetchImpl: fakeFetch(404, undefined) }), { ok: false, error: 'server' });
  assert.deepEqual(await submitContact(valid, { fetchImpl: fakeFetch(200, undefined) }), { ok: false, error: 'server' }, '200 without {ok:true} is not success');
  assert.deepEqual(await submitContact(valid, { fetchImpl: async () => { throw new TypeError('offline'); } }), { ok: false, error: 'network' });
});
