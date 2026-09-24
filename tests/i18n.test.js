import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchLocale, pick, resolveLocale, translate } from '../public/js/i18n.js';
import { guessMarketFromLanguage, resolveMarket } from '../public/js/market.js';

test('matchLocale maps BCP 47 tags to supported locales', () => {
  assert.equal(matchLocale('zh-TW'), 'zh-TW');
  assert.equal(matchLocale('zh-Hant-HK'), 'zh-TW');
  assert.equal(matchLocale('en-SG'), 'en');
  assert.equal(matchLocale('th-TH'), null);
});

test('resolveLocale precedence: param → stored → browser → default', () => {
  assert.equal(resolveLocale({ param: 'zh-TW', stored: 'en', preferred: ['en'] }), 'zh-TW');
  assert.equal(resolveLocale({ param: 'xx', stored: 'zh-TW' }), 'zh-TW');
  assert.equal(resolveLocale({ preferred: ['th', 'zh-TW'] }), 'zh-TW');
  assert.equal(resolveLocale({ preferred: ['th'] }), 'en');
});

test('translate interpolates and falls back to English, then the key', () => {
  assert.equal(translate('en', 'cheaper.save', { pct: 40 }), 'Save ~40%');
  assert.equal(translate('zh-TW', 'cheaper.save', { pct: 40 }), '約省 40%');
  assert.equal(translate('xx', 'search.submit'), 'Search');
  assert.equal(translate('en', 'no.such.key'), 'no.such.key');
});

test('pick chooses the locale, then English', () => {
  assert.equal(pick({ en: 'Tea', 'zh-TW': '茶' }, 'zh-TW'), '茶');
  assert.equal(pick({ en: 'Tea' }, 'zh-TW'), 'Tea');
  assert.equal(pick('plain', 'en'), 'plain');
});

test('market resolution uses region subtags and language hints', () => {
  assert.equal(guessMarketFromLanguage('en-MY'), 'MY');
  assert.equal(guessMarketFromLanguage('th'), 'TH');
  assert.equal(guessMarketFromLanguage('en-US'), null);
  assert.equal(resolveMarket({ param: 'ph' }), 'PH');
  assert.equal(resolveMarket({ param: 'US', preferred: ['vi-VN'] }), 'VN');
  assert.equal(resolveMarket({}), 'SG');
});
