// Display formatting. Keep all Intl usage here so it is easy to tweak per locale.

/** Format { amount, currency } for the given UI locale. TWD always renders as "NT$" for clarity. */
export function formatMoney(price, locale) {
  if (!price) return '';
  const { amount, currency } = price;
  const digits = Number.isInteger(amount) ? 0 : 2;
  const options = { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits };
  try {
    // zh-TW renders TWD as a bare "$", which is ambiguous for visitors.
    return new Intl.NumberFormat(currency === 'TWD' ? 'en' : locale, options).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/** Round a converted amount to something that reads naturally in that currency. */
export function roundForDisplay(amount, currency) {
  if (currency === 'VND') return Math.round(amount / 1000) * 1000;
  if (amount >= 100) return Math.round(amount);
  return Math.round(amount * 10) / 10;
}
