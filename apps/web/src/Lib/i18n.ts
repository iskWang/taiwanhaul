// Locale resolution and message lookup. Pure functions except applyTranslations().
import en from './data/locales/en.ts';
import zhTW from './data/locales/zh-TW.ts';
import th from './data/locales/th.ts';
import vi from './data/locales/vi.ts';
import ms from './data/locales/ms.ts';
import fil from './data/locales/fil.ts';

export const DEFAULT_LOCALE = 'en';

/** Add a locale by adding a messages file and one entry here. */
export const LOCALES = [
  { code: 'en', label: 'English', short: 'EN', messages: en },
  { code: 'zh-TW', label: '繁體中文', short: '繁中', messages: zhTW },
  { code: 'th', label: 'ไทย', short: 'ไทย', messages: th },
  { code: 'vi', label: 'Tiếng Việt', short: 'VI', messages: vi },
  { code: 'ms', label: 'Bahasa Melayu', short: 'MS', messages: ms },
  { code: 'fil', label: 'Filipino', short: 'FIL', messages: fil },
];

/** Language subtags that should map onto a supported locale. */
const LOCALE_ALIASES = { tl: 'fil' };

const byCode = new Map(LOCALES.map((l) => [l.code, l]));

/** Map a BCP 47 tag (e.g. "zh-Hant-TW", "en-SG") to a supported locale code, or null. */
export function matchLocale(tag: string | null | undefined): string | null {
  if (!tag) return null;
  const lower = String(tag).toLowerCase();
  const exact = LOCALES.find((l) => l.code.toLowerCase() === lower);
  if (exact) return exact.code;
  const base = lower.split('-')[0];
  // Only Traditional Chinese exists today; it is the closest match for any zh-*.
  if (base === 'zh') return 'zh-TW';
  if (base in LOCALE_ALIASES) return LOCALE_ALIASES[base as keyof typeof LOCALE_ALIASES];
  return LOCALES.find((l) => l.code.toLowerCase().split('-')[0] === base)?.code ?? null;
}

/** Precedence: explicit URL param → stored choice → browser languages → default. */
export function resolveLocale({ param, stored, preferred = [] }: { param?: string | null; stored?: string | null; preferred?: readonly string[] } = {}) {
  return (
    matchLocale(param) ??
    matchLocale(stored) ??
    preferred.map(matchLocale).find(Boolean) ??
    DEFAULT_LOCALE
  );
}

function lookup(messages: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node !== null && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), messages);
}

/** Look up a message, falling back to English, then to the key itself. */
export function translate(locale: string, key: string, vars?: Record<string, string | number>): unknown {
  let value = lookup(byCode.get(locale)?.messages, key);
  if (value === undefined) value = lookup(en, key);
  if (value === undefined) return key;
  if (typeof value === 'string' && vars) {
    value = value.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
  }
  return value;
}

/** Pick the right language from a localized data field ({ en, 'zh-TW' }). */
export function pick(localized: string | null | undefined | Record<string, string>, locale: string): string {
  if (localized == null) return '';
  if (typeof localized === 'string') return localized;
  return localized[locale] ?? localized[DEFAULT_LOCALE] ?? Object.values(localized)[0] ?? '';
}

/**
 * Fill static markup: data-i18n="key" sets textContent,
 * data-i18n-attr="placeholder:search.placeholder;aria-label:nav.label" sets attributes.
 */
export function applyTranslations(root: ParentNode, t: (key: string | undefined) => string): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.dataset.i18nAttr!.split(';')) {
      const [attr, key] = pair.split(':').map((s: string) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  });
}
