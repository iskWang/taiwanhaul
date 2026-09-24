// MOCK exchange rates. A future pricing API should return rates (or
// pre-converted prices) with its own timestamp; keep this shape.

export const FX = {
  asOf: '2026-09-01',
  isMock: true,
  /** TWD per 1 unit of each currency. */
  twdPerUnit: {
    TWD: 1,
    SGD: 24.5,
    MYR: 7.2,
    THB: 0.95,
    VND: 0.00125,
    PHP: 0.55,
  },
};
