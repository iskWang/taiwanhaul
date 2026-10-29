// Price comparison math. Pure; a future pricing API may return these fields precomputed.
import { roundForDisplay } from './format.ts';

/** Convert a price to TWD using a { [currency]: twdPerUnit } table. Null when the rate is unknown. */
export function toTWD(price: { amount: number; currency: string } | null | undefined, twdPerUnit: Record<string, number>): number | null {
  const rate = price ? twdPerUnit[price.currency] : undefined;
  return rate && price ? price.amount * rate : null;
}

/** Convert a TWD amount into another currency, rounded for display. */
export function fromTWD(amountTWD: number, currency: string, twdPerUnit: Record<string, number>): { amount: number; currency: string } | null {
  const rate = twdPerUnit[currency];
  if (!rate) return null;
  return { amount: roundForDisplay(amountTWD / rate, currency), currency };
}

/**
 * Compare a Taiwan price with a local-market price.
 * @returns {{ twTWD: number, localTWD: number, savingsPct: number } | null}
 */
export function comparePrices(twPrice: { amount: number; currency: string }, localPrice: { amount: number; currency: string }, twdPerUnit: Record<string, number>): { twTWD: number; localTWD: number; savingsPct: number } | null {
  const twTWD = toTWD(twPrice, twdPerUnit);
  const localTWD = toTWD(localPrice, twdPerUnit);
  if (twTWD == null || localTWD == null || localTWD <= 0) return null;
  return { twTWD, localTWD, savingsPct: Math.round((1 - twTWD / localTWD) * 100) };
}
