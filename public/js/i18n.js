// Locale resolution and message lookup. Pure functions except applyTranslations().
import en from '../data/locales/en.js';
import zhTW from '../data/locales/zh-TW.js';

export const DEFAULT_LOCALE = 'en';

/** Add a locale by adding a messages file and one entry here. */
export const LOCALES = [
  { code: 'en', label: 'English', short: 'EN', messages: en },
  { code: 'zh-TW', label: '繁體中文', short: '繁中', messages: zhTW },
];

const byCode = new Map(LOCALES.map((l) => [l.code, l]));

/** Map a BCP 47 tag (e.g. "zh-Hant-TW", "en-SG") to a supported locale code, or null. */
export function matchLocale(tag) {
  if (!tag) return null;
  const lower = String(tag).toLowerCase();
  const exact = LOCALES.find((l) => l.code.toLowerCase() === lower);
  if (exact) return exact.code;
  const base = lower.split('-')[0];
  // Only Traditional Chinese exists today; it is the closest match for any zh-*.
  if (base === 'zh') return 'zh-TW';
  return LOCALES.find((l) => l.code.toLowerCase().split('-')[0] === base)?.code ?? null;
}

/** Precedence: explicit URL param → stored choice → browser languages → default. */
export function resolveLocale({ param, stored, preferred = [] } = {}) {
  return (
    matchLocale(param) ??
    matchLocale(stored) ??
    preferred.map(matchLocale).find(Boolean) ??
    DEFAULT_LOCALE
  );
}

function lookup(messages, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), messages);
}

/** Look up a message, falling back to English, then to the key itself. */
export function translate(locale, key, vars) {
  let value = lookup(byCode.get(locale)?.messages, key);
  if (value === undefined) value = lookup(en, key);
  if (value === undefined) return key;
  if (typeof value === 'string' && vars) {
    value = value.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
  }
  return value;
}

/** Pick the right language from a localized data field ({ en, 'zh-TW' }). */
export function pick(localized, locale) {
  if (localized == null) return '';
  if (typeof localized === 'string') return localized;
  return localized[locale] ?? localized[DEFAULT_LOCALE] ?? Object.values(localized)[0] ?? '';
}

/**
 * Fill static markup: data-i18n="key" sets textContent,
 * data-i18n-attr="placeholder:search.placeholder;aria-label:nav.label" sets attributes.
 */
export function applyTranslations(root, t) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  });
}
