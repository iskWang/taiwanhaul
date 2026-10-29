// Convert a TWD amount into another currency, rounded for display.
import { roundForDisplay } from './format.ts';

export function fromTWD(amountTWD: number, currency: string, twdPerUnit: Record<string, number>): { amount: number; currency: string } | null {
  const rate = twdPerUnit[currency];
  if (!rate) return null;
  return { amount: roundForDisplay(amountTWD / rate, currency), currency };
}
