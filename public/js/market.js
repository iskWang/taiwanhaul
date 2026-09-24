// Market (visitor home country) resolution. Pure functions.
import { MARKETS, VISITOR_MARKETS, DEFAULT_MARKET, LANGUAGE_MARKET_HINTS } from '../data/markets.js';

export function matchMarket(code) {
  const upper = String(code ?? '').toUpperCase();
  return VISITOR_MARKETS.includes(upper) ? upper : null;
}

/** Guess a market from a language tag: region subtag first ("en-SG"), then language hints ("th"). */
export function guessMarketFromLanguage(tag) {
  if (!tag) return null;
  const parts = String(tag).split('-');
  for (const part of parts.slice(1)) {
    if (/^[a-z]{2}$/i.test(part) && matchMarket(part)) return part.toUpperCase();
  }
  return LANGUAGE_MARKET_HINTS[parts[0].toLowerCase()] ?? null;
}

/** Precedence: explicit URL param → stored choice → browser languages → default. */
export function resolveMarket({ param, stored, preferred = [] } = {}) {
  return (
    matchMarket(param) ??
    matchMarket(stored) ??
    preferred.map(guessMarketFromLanguage).find(Boolean) ??
    DEFAULT_MARKET
  );
}

export function getMarket(code) {
  return MARKETS[code] ?? null;
}
