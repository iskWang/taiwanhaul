// Entry point: preferences, section rendering, search wiring, contact modal, WebMCP.
import { MARKETS, VISITOR_MARKETS } from '../data/markets.js';
import { FX } from '../data/fx.js';
import { LOCALES, applyTranslations, pick, resolveLocale, translate } from './i18n.js';
import { getMarket, matchMarket, resolveMarket } from './market.js';
import { getCheaperInTaiwan, getHomeContent, getMustBuy, getRecommended } from './content.js';
import { fromTWD } from './pricing.js';
import { searchService } from './search/index.js';
import { track } from './analytics.js';
import { CONTACT_TOPICS } from './contact.js';
import { registerWebMcp } from './webmcp.js';
import { polyfillCountryFlags } from './flags.js';
import { cheaperCard, esc, mustBuyCard, recommendationCard, skeletonCards, stateBlock } from './ui/templates.js';
import { createSearchView } from './ui/search-view.js';
import { createContactDialog } from './ui/contact-dialog.js';

const STORAGE_KEYS = { locale: 'th:locale', market: 'th:market' };

const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Private mode or blocked storage: preferences just won't persist.
    }
  },
};

const params = new URLSearchParams(location.search);
const state = {
  locale: resolveLocale({ param: params.get('lang'), stored: storage.get(STORAGE_KEYS.locale), preferred: navigator.languages ?? [] }),
  market: resolveMarket({ param: params.get('market'), stored: storage.get(STORAGE_KEYS.market), preferred: navigator.languages ?? [] }),
  lastQuery: '',
};

const t = (key, vars) => translate(state.locale, key, vars);
const view = () => ({ t, locale: state.locale, market: getMarket(state.market) });

const $ = (selector) => document.querySelector(selector);
const els = {
  localeSelect: $('#locale-select'),
  marketSelect: $('#market-select'),
  searchForm: $('#search-form'),
  searchInput: $('#search-input'),
  suggestions: $('#search-suggestions'),
  cheaperGrid: $('#cheaper-grid'),
  cheaperSubtitle: $('#cheaper-subtitle'),
  cheaperDisclaimer: $('#cheaper-disclaimer'),
  mustBuyGrid: $('#must-buy-grid'),
  recommendedGrid: $('#recommended-grid'),
  metaDescription: document.querySelector('meta[name="description"]'),
};

const searchView = createSearchView({
  container: $('#search-results'),
  getView: view,
  onRetry: () => runSearch(state.lastQuery, { source: 'retry' }),
  onClear: () => {
    searchController?.abort();
    searchView.set({ status: 'idle' });
    els.searchInput.value = '';
    updateUrl({ q: null });
    els.searchInput.focus();
  },
});

const contactDialog = createContactDialog({ dialog: $('#contact-dialog'), getView: view });

// ---------- URL + preferences ----------

function updateUrl(changes) {
  const url = new URL(location.href);
  for (const [key, value] of Object.entries(changes)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  history.replaceState(null, '', url);
}

function setPreferences({ locale, market } = {}) {
  const nextLocale = LOCALES.some((l) => l.code === locale) ? locale : state.locale;
  const nextMarket = matchMarket(market) ?? state.market;
  const changed = nextLocale !== state.locale || nextMarket !== state.market;
  if (changed) {
    state.locale = nextLocale;
    state.market = nextMarket;
    storage.set(STORAGE_KEYS.locale, nextLocale);
    storage.set(STORAGE_KEYS.market, nextMarket);
    updateUrl({ lang: nextLocale, market: nextMarket });
    track('preferences_changed', { locale: nextLocale, market: nextMarket });
    renderAll();
  }
  return { locale: state.locale, market: state.market };
}

// ---------- Rendering ----------

function renderPreferenceControls() {
  els.localeSelect.innerHTML = LOCALES.map(
    (l) => `<option value="${esc(l.code)}" lang="${esc(l.code)}" title="${esc(l.label)}">${esc(l.short)}</option>`
  ).join('');
  els.localeSelect.value = state.locale;
  els.marketSelect.innerHTML = VISITOR_MARKETS.map((code) => {
    const m = MARKETS[code];
    return `<option value="${esc(code)}">${esc(`${m.flag} ${pick(m.name, state.locale)}`)}</option>`;
  }).join('');
  els.marketSelect.value = state.market;
}

function renderSuggestions() {
  const chips = t('search.suggestions')
    .map(
      (s) =>
        `<button type="button" data-suggestion="${esc(s)}" class="rounded-full border border-brand-line bg-white px-3 py-1.5 text-sm text-brand-ink hover:border-brand-teal hover:text-brand-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-teal">${esc(s)}</button>`
    )
    .join('');
  els.suggestions.innerHTML = `<span class="text-sm text-brand-muted">${esc(t('search.suggestionsLabel'))}:</span>${chips}`;
}

async function renderSections() {
  const v = view();
  const marketName = pick(v.market.name, v.locale);
  els.cheaperSubtitle.textContent = t('cheaper.subtitle', { market: marketName });
  els.cheaperDisclaimer.textContent = t('cheaper.disclaimer', { date: FX.asOf });
  try {
    const content = await getHomeContent({ market: state.market, locale: state.locale });
    els.cheaperGrid.innerHTML = content.cheaper.length
      ? content.cheaper.map((item) => cheaperCard(item, v)).join('')
      : `<div class="sm:col-span-2 lg:col-span-3">${stateBlock({ icon: '🧾', title: t('cheaper.empty', { market: marketName }) })}</div>`;
    els.mustBuyGrid.innerHTML = content.mustBuy.map((p) => mustBuyCard(p, v)).join('');
    els.recommendedGrid.innerHTML = content.recommended.map((item) => recommendationCard(item, v)).join('');
  } catch {
    const failed = stateBlock({ icon: '⚠️', title: t('search.errorTitle'), body: t('search.errorBody') });
    for (const grid of [els.cheaperGrid, els.mustBuyGrid, els.recommendedGrid]) {
      grid.innerHTML = `<div class="sm:col-span-2 lg:col-span-3">${failed}</div>`;
    }
  }
}

function renderAll() {
  document.documentElement.lang = state.locale;
  document.title = t('meta.title');
  els.metaDescription?.setAttribute('content', t('meta.description'));
  applyTranslations(document, t);
  renderPreferenceControls();
  renderSuggestions();
  renderSections();
  searchView.render();
  contactDialog.render();
}

// ---------- Search ----------

let searchController = null;

async function runSearch(rawQuery, { source = 'form' } = {}) {
  searchController?.abort();
  const controller = new AbortController();
  searchController = controller;
  const query = String(rawQuery ?? '').trim();
  state.lastQuery = query;
  const ctx = { locale: state.locale, market: state.market };

  searchView.set({ status: 'loading' });
  track('search_submitted', { ...ctx, queryLength: query.length, source });
  try {
    const response = await searchService.search(query, ctx, { signal: controller.signal });
    if (controller.signal.aborted) return response;
    searchView.set({ status: response.results.length ? 'results' : 'empty', response });
    updateUrl({ q: query });
    track('search_completed', { ...ctx, resultCount: response.results.length, strategy: response.query.strategy });
    return response;
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    searchView.set({ status: 'error', code: err?.code ?? 'unknown' });
    track('search_failed', { ...ctx, code: err?.code ?? 'unknown' });
    throw err;
  }
}

/** Fire-and-forget wrapper for UI events (errors are already rendered). */
function searchFromUi(query, source) {
  runSearch(query, { source }).catch(() => {});
}

els.searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  searchFromUi(els.searchInput.value, 'form');
});

els.suggestions.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-suggestion]');
  if (!chip) return;
  els.searchInput.value = chip.dataset.suggestion;
  searchFromUi(chip.dataset.suggestion, 'suggestion');
});

els.localeSelect.addEventListener('change', () => setPreferences({ locale: els.localeSelect.value }));
els.marketSelect.addEventListener('change', () => setPreferences({ market: els.marketSelect.value }));

document.querySelectorAll('[data-open-contact]').forEach((button) =>
  button.addEventListener('click', () => contactDialog.open())
);

// ---------- Boot ----------

polyfillCountryFlags();
els.cheaperGrid.innerHTML = skeletonCards(3);
els.mustBuyGrid.innerHTML = skeletonCards(3);
els.recommendedGrid.innerHTML = skeletonCards(2);
renderAll();

const initialQuery = params.get('q');
if (initialQuery) {
  els.searchInput.value = initialQuery;
  searchFromUi(initialQuery, 'url');
}

registerWebMcp({
  locales: LOCALES.map((l) => l.code),
  markets: VISITOR_MARKETS,
  topics: CONTACT_TOPICS,
  getPreferences: () => ({ locale: state.locale, market: state.market }),
  setPreferences,
  openContactForm: (prefill) => contactDialog.open(prefill),
  async search(query, { market } = {}) {
    if (market) setPreferences({ market });
    els.searchInput.value = String(query ?? '');
    const response = await runSearch(query, { source: 'webmcp' });
    const currency = getMarket(state.market).currency;
    return {
      searchedTerms: response.query.terms,
      isSampleData: response.isMock,
      results: response.results.map((r) => ({
        title: r.title,
        translatedTitle: r.translatedTitle ? pick(r.translatedTitle, state.locale) : null,
        priceTWD: r.price.amount,
        approxLocalPrice: r.price.currency === 'TWD' ? fromTWD(r.price.amount, currency, FX.twdPerUnit) : null,
        source: r.sourceLabel,
        url: r.url,
      })),
    };
  },
  async listFeatured(section, { market } = {}) {
    const locale = state.locale;
    if (section === 'cheaper') {
      const marketCode = matchMarket(market) ?? state.market;
      return getCheaperInTaiwan(marketCode).map((item) => ({
        name: pick(item.product.name, locale),
        taiwanPrice: item.twPrice,
        localPrice: item.localPrice,
        savingsPercent: item.savingsPct,
        isSampleData: true,
      }));
    }
    if (section === 'must_buy') {
      return getMustBuy().map((p) => ({ name: pick(p.name, locale), from: p.twPrice, where: pick(p.where, locale), isSampleData: true }));
    }
    if (section === 'recommended') {
      return getRecommended().map((item) => ({
        name: pick(item.product.name, locale),
        tip: pick(item.quote, locale),
        by: `${item.by.name}, ${pick(item.by.city, locale)}`,
        isSampleData: true,
      }));
    }
    throw new Error(`Unknown section "${section}". Use cheaper, must_buy or recommended.`);
  },
});
