// Contact modal: native <dialog> + form wiring. Validation and transport live in ../contact.js.
import { VISITOR_MARKETS } from '../../data/markets.js';
import { pick } from '../i18n.js';
import { getMarket } from '../market.js';
import { CONTACT_FALLBACK_URL, CONTACT_LIMITS, CONTACT_TOPICS, submitContact, validateContact } from '../contact.js';
import { track } from '../analytics.js';
import { esc } from './templates.js';

const FIELDS = ['name', 'email', 'market', 'topic', 'message'];
const MAX_BY_FIELD = { name: CONTACT_LIMITS.nameMax, email: CONTACT_LIMITS.emailMax, message: CONTACT_LIMITS.messageMax };

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
  let sending = false;

  function fillOptions() {
    const v = getView();
    const marketSelect = form.elements.market;
    const topicSelect = form.elements.topic;
    const currentMarket = marketSelect.value;
    const currentTopic = topicSelect.value;
    marketSelect.innerHTML =
      VISITOR_MARKETS.map((code) => {
        const m = getMarket(code);
        return `<option value="${esc(code)}">${esc(`${m.flag} ${pick(m.name, v.locale)}`)}</option>`;
      }).join('') + `<option value="">${esc(v.t('contact.marketOther'))}</option>`;
    topicSelect.innerHTML = CONTACT_TOPICS.map(
      (topic) => `<option value="${esc(topic)}">${esc(v.t(`contact.topics.${topic}`))}</option>`
    ).join('');
    marketSelect.value = currentMarket || v.market.code;
    topicSelect.value = currentTopic || CONTACT_TOPICS[0];
  }

  function showFieldErrors(errors) {
    const v = getView();
    for (const field of FIELDS) {
      const input = form.elements[field];
      const message = form.querySelector(`[data-error-for="${field}"]`);
      const code = errors[field];
      input.toggleAttribute('aria-invalid', Boolean(code));
      message.hidden = !code;
      message.textContent = code
        ? v.t(`contact.fieldErrors.${code}`, { min: CONTACT_LIMITS.messageMin, max: MAX_BY_FIELD[field] })
        : '';
    }
    const first = FIELDS.find((field) => errors[field]);
    if (first) form.elements[first].focus();
  }

  function setStatus(html) {
    status.hidden = !html;
    status.innerHTML = html;
  }

  function setSending(value) {
    sending = value;
    submit.disabled = value;
    submit.textContent = getView().t(value ? 'contact.sending' : 'contact.submit');
  }

  function open(prefill = {}) {
    fillOptions();
    form.hidden = false;
    success.hidden = true;
    setStatus('');
    showFieldErrors({});
    if (prefill.topic && CONTACT_TOPICS.includes(prefill.topic)) form.elements.topic.value = prefill.topic;
    if (prefill.message) form.elements.message.value = String(prefill.message).slice(0, CONTACT_LIMITS.messageMax);
    if (!dialog.open) dialog.showModal();
    track('contact_opened', { locale: getView().locale });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    const v = getView();
    const data = Object.fromEntries(new FormData(form));
    const { ok, value, errors } = validateContact({ ...data, locale: v.locale });
    showFieldErrors(errors);
    if (!ok) return;

    setStatus('');
    setSending(true);
    const result = await submitContact(value);
    setSending(false);

    if (result.ok) {
      form.reset();
      form.hidden = true;
      success.hidden = false;
      success.querySelector('button')?.focus();
      track('contact_submitted', { topic: value.topic, market: value.market || 'other' });
      return;
    }
    if (result.error === 'validation' && result.fields) showFieldErrors(result.fields);
    setStatus(
      `${esc(v.t('contact.error'))} <a href="${esc(CONTACT_FALLBACK_URL)}" target="_blank" rel="noopener" class="font-semibold underline underline-offset-2">${esc(v.t('contact.errorFallback'))}</a>`
    );
    track('contact_failed', { error: result.error });
  });

  dialog.addEventListener('click', (event) => {
    // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
    if (event.target === dialog || event.target.closest('[data-contact-close]')) dialog.close();
  });

  return {
    open,
    /** Re-localize option labels and button text after a language change. */
    render() {
      fillOptions();
      if (!sending) submit.textContent = getView().t('contact.submit');
    },
  };
}
