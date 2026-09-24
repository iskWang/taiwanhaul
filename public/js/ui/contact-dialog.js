// Contact modal: native <dialog> + form wiring. Validation and transport live in ../contact.js.
//
// All visible text is derived from state (field error codes, status code), so a
// language change re-renders it in the new locale. The country field follows the
// header market until the visitor picks one in the form themselves.
import { VISITOR_MARKETS } from '../../data/markets.js';
import { pick } from '../i18n.js';
import { getMarket } from '../market.js';
import { CONTACT_FALLBACK_URL, CONTACT_LIMITS, CONTACT_TOPICS, submitContact, validateContact } from '../contact.js';
import { track } from '../analytics.js';
import { esc } from './templates.js';
import { TURNSTILE_SITE_KEY } from '../config.js';

const FIELDS = ['name', 'email', 'market', 'topic', 'message'];
const MAX_BY_FIELD = { name: CONTACT_LIMITS.nameMax, email: CONTACT_LIMITS.emailMax, message: CONTACT_LIMITS.messageMax };

let turnstileLoad = null;

/** Load the Turnstile script at most once per page, however many dialogs use it. */
function loadTurnstile() {
  if (turnstileLoad) return turnstileLoad;
  turnstileLoad = new Promise((resolve) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve(window.turnstile ?? null);
    script.onerror = () => resolve(null); // form still submits; the server answers with 'captcha'.
    document.head.appendChild(script);
  });
  return turnstileLoad;
}

/**
 * @param {Object} options
 * @param {HTMLDialogElement} options.dialog
 * @param {() => { t: Function, locale: string, market: object }} options.getView
 */
export function createContactDialog({ dialog, getView }) {
  const form = dialog.querySelector('[data-contact-form]');
  const success = dialog.querySelector('[data-contact-success]');
  const status = dialog.querySelector('[data-contact-status]');
  const submit = dialog.querySelector('[data-contact-submit]');
  const marketSelect = form.elements.market;
  const topicSelect = form.elements.topic;
  const turnstileSlot = dialog.querySelector('[data-turnstile-slot]');
  let turnstileWidgetId = null;

  /** Render the Turnstile widget into its slot the first time the dialog opens. */
  async function ensureTurnstileWidget() {
    if (turnstileWidgetId !== null || !turnstileSlot) return;
    const turnstile = await loadTurnstile();
    if (!turnstile || turnstileWidgetId !== null) return;
    turnstileWidgetId = turnstile.render(turnstileSlot, {
      sitekey: TURNSTILE_SITE_KEY,
      language: getView().locale,
      'response-field-name': 'turnstileToken',
    });
  }

  const state = {
    sending: false,
    /** @type {Record<string, string>} field → error code */
    fieldErrors: {},
    /** @type {string | null} contact.errors.<code> */
    statusCode: null,
    /** True once the visitor picks a country in the form; until then it mirrors the header. */
    marketChosen: false,
  };

  function renderOptions() {
    const v = getView();
    const market = state.marketChosen ? marketSelect.value : v.market.code;
    const topic = topicSelect.value || CONTACT_TOPICS[0];
    marketSelect.innerHTML =
      VISITOR_MARKETS.map((code) => {
        const m = getMarket(code);
        return `<option value="${esc(code)}">${esc(`${m.flag} ${pick(m.name, v.locale)}`)}</option>`;
      }).join('') + `<option value="">${esc(v.t('contact.marketOther'))}</option>`;
    topicSelect.innerHTML = CONTACT_TOPICS.map(
      (code) => `<option value="${esc(code)}">${esc(v.t(`contact.topics.${code}`))}</option>`
    ).join('');
    marketSelect.value = market;
    topicSelect.value = topic;
  }

  function renderFieldErrors() {
    const v = getView();
    for (const field of FIELDS) {
      const code = state.fieldErrors[field];
      const message = form.querySelector(`[data-error-for="${field}"]`);
      form.elements[field].toggleAttribute('aria-invalid', Boolean(code));
      message.hidden = !code;
      message.textContent = code
        ? v.t(`contact.fieldErrors.${code}`, { min: CONTACT_LIMITS.messageMin, max: MAX_BY_FIELD[field] })
        : '';
    }
  }

  function renderStatus() {
    const v = getView();
    status.hidden = !state.statusCode;
    status.innerHTML = state.statusCode
      ? `${esc(v.t(`contact.errors.${state.statusCode}`))} <a href="${esc(CONTACT_FALLBACK_URL)}" target="_blank" rel="noopener" class="font-semibold underline underline-offset-2">${esc(v.t('contact.errorFallback'))}</a>`
      : '';
  }

  function renderSubmit() {
    submit.disabled = state.sending;
    submit.textContent = getView().t(state.sending ? 'contact.sending' : 'contact.submit');
  }

  function render() {
    renderOptions();
    renderFieldErrors();
    renderStatus();
    renderSubmit();
  }

  function setFieldErrors(errors, { focus = false } = {}) {
    state.fieldErrors = errors;
    renderFieldErrors();
    const first = FIELDS.find((field) => errors[field]);
    if (focus && first) form.elements[first].focus();
  }

  function open(prefill = {}) {
    state.fieldErrors = {};
    state.statusCode = null;
    form.hidden = false;
    success.hidden = true;
    render();
    if (prefill.topic && CONTACT_TOPICS.includes(prefill.topic)) topicSelect.value = prefill.topic;
    if (prefill.message) form.elements.message.value = String(prefill.message).slice(0, CONTACT_LIMITS.messageMax);
    if (!dialog.open) dialog.showModal();
    track('contact_opened', { locale: getView().locale });
    ensureTurnstileWidget();
  }

  marketSelect.addEventListener('change', () => {
    state.marketChosen = true;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.sending) return;
    const data = Object.fromEntries(new FormData(form));
    const { ok, value, errors } = validateContact({ ...data, locale: getView().locale });
    setFieldErrors(errors, { focus: true });
    if (!ok) return;

    state.statusCode = null;
    state.sending = true;
    renderStatus();
    renderSubmit();
    const result = await submitContact(value);
    state.sending = false;
    renderSubmit();

    if (result.ok) {
      form.reset();
      state.marketChosen = false;
      form.hidden = true;
      success.hidden = false;
      success.querySelector('button')?.focus();
      track('contact_submitted', { topic: value.topic, market: value.market || 'other' });
      return;
    }
    if (result.error === 'validation' && result.fields) setFieldErrors(result.fields, { focus: true });
    state.statusCode = result.error;
    renderStatus();
    if (turnstileWidgetId !== null) window.turnstile?.reset(turnstileWidgetId);
    track('contact_failed', { error: result.error });
  });

  dialog.addEventListener('click', (event) => {
    // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
    if (event.target === dialog || event.target.closest('[data-contact-close]')) dialog.close();
  });

  return {
    open,
    /** Re-render every visible string after a language or market change. */
    render,
  };
}
