// HTML templates for cards and states. Every dynamic value goes through esc().
// Tailwind classes must stay literal strings so the Play CDN can pick them up.
import { pick } from '../i18n.js';
import { formatMoney } from '../format.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

const TILE_BG = {
  food: 'bg-amber-50',
  tea: 'bg-lime-50',
  beauty: 'bg-rose-50',
  eyewear: 'bg-sky-50',
  home: 'bg-emerald-50',
};

function tile(emoji, category, size = 'md') {
  const bg = TILE_BG[category] ?? 'bg-brand-sand';
  const sizing = size === 'lg' ? 'h-16 w-16 text-3xl' : 'h-12 w-12 text-2xl';
  return `<div class="${sizing} ${bg} flex shrink-0 items-center justify-center rounded-xl" aria-hidden="true">${esc(emoji)}</div>`;
}

function categoryLabel(category, v) {
  return `<p class="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-brand-green">${esc(v.t(`category.${category}`))}</p>`;
}

/** @param {{ t: Function, locale: string, market: object }} v */
export function cheaperCard(item, v) {
  const { product } = item;
  const marketName = pick(v.market.name, v.locale);
  return `
<article class="flex flex-col rounded-2xl border border-brand-line bg-white p-5 shadow-sm">
  <div class="flex items-start gap-4">
    ${tile(product.emoji, product.category)}
    <div class="min-w-0">
      ${categoryLabel(product.category, v)}
      <h3 class="m-0 mt-1 text-base font-semibold leading-snug">${esc(pick(product.name, v.locale))}</h3>
    </div>
  </div>
  <dl class="m-0 mt-4 grid grid-cols-2 gap-2 text-sm">
    <div class="rounded-xl bg-brand-teal/5 p-3">
      <dt class="text-brand-muted">${esc(v.t('cheaper.inTaiwan'))}</dt>
      <dd class="m-0 mt-1 text-lg font-bold text-brand-teal">${esc(formatMoney(item.twPrice, v.locale))}</dd>
      ${item.twPriceInLocal ? `<dd class="m-0 text-xs text-brand-muted">${esc(v.t('search.approx', { price: formatMoney(item.twPriceInLocal, v.locale) }))}</dd>` : ''}
    </div>
    <div class="rounded-xl bg-brand-paper p-3">
      <dt class="text-brand-muted">${esc(v.t('cheaper.inMarket', { market: marketName }))}</dt>
      <dd class="m-0 mt-1 text-lg font-semibold text-brand-ink">${esc(formatMoney(item.localPrice, v.locale))}</dd>
    </div>
  </dl>
  <p class="m-0 mt-4 self-start rounded-full bg-brand-green/10 px-3 py-1 text-sm font-semibold text-brand-green">${esc(v.t('cheaper.save', { pct: item.savingsPct }))}</p>
</article>`;
}

export function mustBuyCard(product, v) {
  return `
<article class="flex flex-col rounded-2xl border border-brand-line bg-white p-5 shadow-sm">
  <div class="flex items-start gap-4">
    ${tile(product.emoji, product.category, 'lg')}
    <div class="min-w-0">
      ${categoryLabel(product.category, v)}
      <h3 class="m-0 mt-1 text-base font-semibold leading-snug">${esc(pick(product.name, v.locale))}</h3>
      <p class="m-0 mt-1 text-sm font-semibold text-brand-teal">${esc(v.t('mustBuy.from', { price: formatMoney(product.twPrice, v.locale) }))} <span class="font-normal text-brand-muted">· ${esc(pick(product.unit, v.locale))}</span></p>
    </div>
  </div>
  <p class="m-0 mt-3 text-sm leading-relaxed text-brand-muted">${esc(pick(product.blurb, v.locale))}</p>
  <p class="m-0 mt-auto pt-3 text-xs text-brand-muted">📍 ${esc(pick(product.where, v.locale))}</p>
</article>`;
}

export function recommendationCard(item, v) {
  const { product, by } = item;
  const initial = by.name.slice(0, 1);
  return `
<figure class="m-0 flex flex-col rounded-2xl border border-brand-line bg-white p-5 shadow-sm">
  <div class="flex items-center gap-3">
    ${tile(product.emoji, product.category)}
    <div class="min-w-0">
      ${categoryLabel(product.category, v)}
      <p class="m-0 mt-1 font-semibold leading-snug">${esc(pick(product.name, v.locale))}</p>
    </div>
  </div>
  <blockquote class="m-0 mt-4 border-l-4 border-brand-green/60 pl-4 text-[15px] leading-relaxed text-brand-ink">
    “${esc(pick(item.quote, v.locale))}”
  </blockquote>
  <figcaption class="mt-auto flex items-center gap-3 pt-4 text-sm">
    <span class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal text-sm font-semibold text-white" aria-hidden="true">${esc(initial)}</span>
    <span><span class="font-semibold">${esc(by.name)}</span> <span class="text-brand-muted">· ${esc(pick(by.role, v.locale))}, ${esc(pick(by.city, v.locale))}</span></span>
  </figcaption>
</figure>`;
}

export function resultCard(result, v) {
  const translated = result.translatedTitle ? pick(result.translatedTitle, v.locale) : '';
  const heading = translated || result.title;
  const showOriginal = translated && translated !== result.title;
  return `
<li class="flex items-start gap-4 rounded-2xl border border-brand-line bg-white p-4 shadow-sm">
  ${tile(result.emoji ?? '🛍️', null)}
  <div class="min-w-0 flex-1">
    <p class="m-0 font-semibold leading-snug">${esc(heading)}</p>
    ${showOriginal ? `<p class="m-0 mt-0.5 text-sm text-brand-muted" lang="zh-TW">${esc(result.title)}</p>` : ''}
    <p class="m-0 mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
      <span class="text-base font-bold text-brand-teal">${esc(formatMoney(result.price, v.locale))}</span>
      ${result.localPrice ? `<span class="text-brand-muted">${esc(v.t('search.approx', { price: formatMoney(result.localPrice, v.locale) }))}</span>` : ''}
    </p>
    <p class="m-0 mt-1 text-xs text-brand-muted">${esc(v.t('search.via', { source: result.sourceLabel }))}</p>
  </div>
</li>`;
}

export function skeletonCards(count, className = 'h-40') {
  return Array.from({ length: count }, () =>
    `<div class="${className} animate-pulse rounded-2xl border border-brand-line bg-white/70" aria-hidden="true"></div>`
  ).join('');
}

/** Friendly empty/error block. `action` is optional { label, attr } rendered as a button. */
export function stateBlock({ icon, title, body, action }) {
  return `
<div class="rounded-2xl border border-dashed border-brand-line bg-white/60 px-6 py-8 text-center">
  <p class="m-0 text-3xl" aria-hidden="true">${esc(icon)}</p>
  <p class="m-0 mt-2 font-semibold">${esc(title)}</p>
  ${body ? `<p class="m-0 mt-1 text-sm text-brand-muted">${esc(body)}</p>` : ''}
  ${action ? `<button type="button" ${action.attr} class="mt-4 rounded-full border border-brand-teal px-4 py-2 text-sm font-semibold text-brand-teal hover:bg-brand-teal hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal">${esc(action.label)}</button>` : ''}
</div>`;
}
