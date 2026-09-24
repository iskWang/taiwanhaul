// Renders the search results area for each state: idle | loading | results | empty | error.
import { FX } from '../../data/fx.js';
import { fromTWD } from '../pricing.js';
import { esc, resultCard, skeletonCards, stateBlock } from './templates.js';

/**
 * @param {Object} options
 * @param {HTMLElement} options.container
 * @param {() => { t: Function, locale: string, market: object }} options.getView
 * @param {() => void} options.onRetry
 * @param {() => void} options.onClear
 */
function localEstimate(price, currency) {
  return price.currency === 'TWD' ? fromTWD(price.amount, currency, FX.twdPerUnit) : null;
}

export function createSearchView({ container, getView, onRetry, onClear }) {
  let state = { status: 'idle' };

  container.addEventListener('click', (event) => {
    if (event.target.closest('[data-search-retry]')) onRetry();
    if (event.target.closest('[data-search-clear]')) onClear();
  });

  function header(v, response) {
    const terms = response.query.terms
      .map((term) => `<span class="rounded-full bg-brand-teal/10 px-2.5 py-0.5 font-semibold text-brand-teal" lang="zh-TW">${esc(term)}</span>`)
      .join(' ');
    return `
<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
  <div class="text-sm text-brand-muted">
    <p class="m-0 font-semibold text-brand-ink">${esc(v.t('search.resultsCount', { count: response.results.length }))}</p>
    <p class="m-0 mt-1 flex flex-wrap items-center gap-1.5">${esc(v.t('search.searchedAs'))}: ${terms}</p>
  </div>
  <button type="button" data-search-clear class="rounded-full px-3 py-1.5 text-sm text-brand-muted hover:bg-brand-sand hover:text-brand-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-teal">${esc(v.t('search.clear'))}</button>
</div>`;
  }

  function demoNotice(v, response) {
    return response.isMock
      ? `<p class="m-0 mt-4 text-center text-xs text-brand-muted">${esc(v.t('search.demoNotice'))}</p>`
      : '';
  }

  function render() {
    const v = getView();
    container.setAttribute('aria-busy', String(state.status === 'loading'));
    if (state.status === 'idle') {
      container.hidden = true;
      container.innerHTML = '';
      return;
    }
    container.hidden = false;

    if (state.status === 'loading') {
      container.innerHTML = `
<p class="m-0 mb-4 text-center text-sm text-brand-muted">${esc(v.t('search.loading'))}</p>
<div class="grid gap-3 sm:grid-cols-2">${skeletonCards(4, 'h-24')}</div>`;
      return;
    }

    if (state.status === 'error') {
      const known = { empty_query: 'search.errorEmptyQuery', query_too_long: 'search.errorTooLong' }[state.code];
      container.innerHTML = known
        ? stateBlock({ icon: '✍️', title: v.t(known) })
        : stateBlock({
            icon: '⚠️',
            title: v.t('search.errorTitle'),
            body: v.t('search.errorBody'),
            action: { label: v.t('search.retry'), attr: 'data-search-retry' },
          });
      return;
    }

    const { response } = state;
    if (state.status === 'empty') {
      container.innerHTML =
        header(v, response) +
        stateBlock({ icon: '🔎', title: v.t('search.emptyTitle'), body: v.t('search.emptyBody') }) +
        demoNotice(v, response);
      return;
    }

    const cards = response.results
      .map((result) => resultCard({ ...result, localPrice: localEstimate(result.price, v.market.currency) }, v))
      .join('');
    container.innerHTML = `${header(v, response)}<ul class="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">${cards}</ul>${demoNotice(v, response)}`;
  }

  return {
    get state() {
      return state;
    },
    set(next) {
      state = next;
      render();
    },
    render,
  };
}
