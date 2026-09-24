// Markets are data, not logic: adding a country means adding an entry here
// (plus prices in products.js), never touching UI code.

/** Taiwan is the market we buy in. */
export const HOME_MARKET = 'TW';

/**
 * @typedef {Object} Market
 * @property {string} code      ISO 3166-1 alpha-2
 * @property {string} currency  ISO 4217
 * @property {string} flag
 * @property {Record<string, string>} name  Localized display name
 */

/** @type {Record<string, Market>} */
export const MARKETS = {
  TW: { code: 'TW', currency: 'TWD', flag: '🇹🇼', name: { en: 'Taiwan', 'zh-TW': '台灣', th: 'ไต้หวัน', vi: 'Đài Loan', ms: 'Taiwan', fil: 'Taiwan' } },
  SG: { code: 'SG', currency: 'SGD', flag: '🇸🇬', name: { en: 'Singapore', 'zh-TW': '新加坡', th: 'สิงคโปร์', vi: 'Singapore', ms: 'Singapura', fil: 'Singapore' } },
  MY: { code: 'MY', currency: 'MYR', flag: '🇲🇾', name: { en: 'Malaysia', 'zh-TW': '馬來西亞', th: 'มาเลเซีย', vi: 'Malaysia', ms: 'Malaysia', fil: 'Malaysia' } },
  TH: { code: 'TH', currency: 'THB', flag: '🇹🇭', name: { en: 'Thailand', 'zh-TW': '泰國', th: 'ไทย', vi: 'Thái Lan', ms: 'Thailand', fil: 'Thailand' } },
  VN: { code: 'VN', currency: 'VND', flag: '🇻🇳', name: { en: 'Vietnam', 'zh-TW': '越南', th: 'เวียดนาม', vi: 'Việt Nam', ms: 'Vietnam', fil: 'Vietnam' } },
  PH: { code: 'PH', currency: 'PHP', flag: '🇵🇭', name: { en: 'Philippines', 'zh-TW': '菲律賓', th: 'ฟิลิปปินส์', vi: 'Philippines', ms: 'Filipina', fil: 'Pilipinas' } },
};

/** Visitor home markets we compare against, in display order. */
export const VISITOR_MARKETS = ['SG', 'MY', 'TH', 'VN', 'PH'];

export const DEFAULT_MARKET = 'SG';

/** Language subtags that strongly imply a market when no region is given. */
export const LANGUAGE_MARKET_HINTS = { th: 'TH', vi: 'VN', ms: 'MY', fil: 'PH', tl: 'PH' };
