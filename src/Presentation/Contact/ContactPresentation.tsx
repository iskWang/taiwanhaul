import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAppContext } from '@/Container/App'
import { useContactContext } from '@/Container/Contact'
import { useTurnstile } from '@/Hook/useTurnstile'
import { track } from '@/Lib/analytics'
import { CONTACT_FALLBACK_URL, CONTACT_LIMITS, CONTACT_TOPICS, submitContact, validateContact } from '@/Lib/contact'
import { VISITOR_MARKETS } from '@/Lib/data/markets'
import { pick } from '@/Lib/i18n'
import { getMarket } from '@/Lib/market'
import type { ContactField, FieldErrors } from './type'

const FIELDS: ContactField[] = ['name', 'email', 'market', 'topic', 'message']
const MAX_BY_FIELD: Partial<Record<ContactField, number>> = {
  name: CONTACT_LIMITS.nameMax,
  email: CONTACT_LIMITS.emailMax,
  message: CONTACT_LIMITS.messageMax,
}
const inputClass = 'mt-1 w-full rounded-lg border border-brand-line px-3 py-2.5 text-base focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30 aria-[invalid]:border-red-600'
const selectClass = 'mt-1 w-full rounded-lg border border-brand-line bg-white px-3 py-2.5 text-base focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30'

export function ContactPresentation() {
  const { t, locale, market: headerMarket } = useAppContext()
  const { isOpen, close, openCount, prefill } = useContactContext()
  const { slotRef, token, ensureWidget, reset } = useTurnstile(locale)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const doneRef = useRef<HTMLButtonElement>(null)
  const sendingRef = useRef(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  /** contact.errors.<code> */
  const [statusCode, setStatusCode] = useState<string | null>(null)
  /** null until the visitor picks a country in the form; until then it mirrors the header. */
  const [chosenMarket, setChosenMarket] = useState<string | null>(null)
  const [topic, setTopic] = useState(CONTACT_TOPICS[0])
  const market = chosenMarket ?? headerMarket

  // Native <dialog> follows isOpen; Escape/close() flow back through onClose.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    else if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  // Every open() starts a clean form view; the widget is created lazily on the first open only.
  useEffect(() => {
    if (openCount === 0) return
    setFieldErrors({})
    setStatusCode(null)
    setSent(false)
    if (prefill.topic && CONTACT_TOPICS.includes(prefill.topic)) setTopic(prefill.topic)
    if (prefill.message && messageRef.current) messageRef.current.value = String(prefill.message).slice(0, CONTACT_LIMITS.messageMax)
    // Script blocked/failed: the button can never enable, so point at the fallback link.
    void ensureWidget().then((ok) => { if (!ok) setStatusCode('captcha') })
  }, [openCount]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sent) doneRef.current?.focus()
  }, [sent])

  function showFieldErrors(errors: FieldErrors, focus: boolean) {
    setFieldErrors(errors)
    const first = FIELDS.find((field) => errors[field])
    if (focus && first) (formRef.current?.elements.namedItem(first) as HTMLElement | null)?.focus()
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sendingRef.current || !token) return
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    const { ok, value, errors } = validateContact({ ...data, locale })
    showFieldErrors(errors, true)
    if (!ok) return

    setStatusCode(null)
    sendingRef.current = true
    setSending(true)
    value.turnstileToken = token
    const result = await submitContact(value)
    sendingRef.current = false
    setSending(false)
    reset() // a token is single-use

    if (result.ok) {
      form.reset()
      setChosenMarket(null)
      setTopic(CONTACT_TOPICS[0])
      setSent(true)
      track('contact_submitted', { topic: value.topic, market: value.market || 'other' })
      return
    }
    if (result.error === 'validation' && result.fields) showFieldErrors(result.fields, true)
    setStatusCode(result.error)
    track('contact_failed', { error: result.error })
  }

  function FieldError({ field }: { field: ContactField }) {
    const code = fieldErrors[field]
    return <p id={`contact-${field}-error`} className="m-0 mt-1 text-sm text-red-700" hidden={!code}>
      {code ? t(`contact.fieldErrors.${code}`, { min: CONTACT_LIMITS.messageMin, max: MAX_BY_FIELD[field] ?? '' }) : ''}
    </p>
  }
  const invalid = (field: ContactField) => (fieldErrors[field] ? true : undefined)

  return <dialog ref={dialogRef} id="contact-dialog" aria-labelledby="contact-dialog-title" onClose={close}
    onClick={(event) => { if (event.target === event.currentTarget) close() }}
    className="w-[min(100%-2rem,32rem)] rounded-2xl p-0 text-brand-ink shadow-2xl backdrop:bg-brand-ink/50 backdrop:backdrop-blur-sm">
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 id="contact-dialog-title" className="m-0 text-xl font-bold">{t('contact.dialogTitle')}</h2>
        <button type="button" onClick={close} aria-label={t('contact.close')} className="-mr-2 -mt-1 rounded-lg p-2 text-brand-muted hover:bg-brand-sand hover:text-brand-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-teal">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>

      {/* Stays mounted (hidden after success) so the Turnstile widget in its slot survives. */}
      <form ref={formRef} noValidate hidden={sent} onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-semibold">{t('contact.name')}</label>
          <input id="contact-name" name="name" type="text" autoComplete="name" maxLength={100} required aria-describedby="contact-name-error" aria-invalid={invalid('name')} className={inputClass} />
          <FieldError field="name" />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-sm font-semibold">{t('contact.email')}</label>
          <input id="contact-email" name="email" type="email" autoComplete="email" maxLength={200} required aria-describedby="contact-email-error" aria-invalid={invalid('email')} className={inputClass} />
          <FieldError field="email" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-market" className="block text-sm font-semibold">{t('contact.market')}</label>
            <select id="contact-market" name="market" aria-describedby="contact-market-error" aria-invalid={invalid('market')} className={selectClass}
              value={market} onChange={(event) => setChosenMarket(event.target.value)}>
              {VISITOR_MARKETS.map((code) => {
                const m = getMarket(code)
                return <option key={code} value={code}>{`${m.flag} ${pick(m.name, locale)}`}</option>
              })}
              <option value="">{t('contact.marketOther')}</option>
            </select>
            <FieldError field="market" />
          </div>
          <div>
            <label htmlFor="contact-topic" className="block text-sm font-semibold">{t('contact.topic')}</label>
            <select id="contact-topic" name="topic" aria-describedby="contact-topic-error" aria-invalid={invalid('topic')} className={selectClass}
              value={topic} onChange={(event) => setTopic(event.target.value)}>
              {CONTACT_TOPICS.map((code) => <option key={code} value={code}>{t(`contact.topics.${code}`)}</option>)}
            </select>
            <FieldError field="topic" />
          </div>
        </div>
        <div>
          <label htmlFor="contact-message" className="block text-sm font-semibold">{t('contact.message')}</label>
          <textarea ref={messageRef} id="contact-message" name="message" rows={5} maxLength={2000} required aria-describedby="contact-message-error" aria-invalid={invalid('message')}
            className={`${inputClass} resize-y`} />
          <FieldError field="message" />
        </div>

        {/* Honeypot: humans never see or fill this; bots often do. */}
        <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {/* Cloudflare Turnstile widget mounts here. */}
        <div ref={slotRef} />

        <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" hidden={!statusCode}>
          {statusCode && <>
            {t(`contact.errors.${statusCode}`)}{' '}
            <a href={CONTACT_FALLBACK_URL} target="_blank" rel="noopener" className="font-semibold underline underline-offset-2">{t('contact.errorFallback')}</a>
          </>}
        </p>

        <button type="submit" disabled={sending || !token} className="w-full rounded-xl bg-brand-teal px-6 py-3 font-semibold text-white hover:bg-brand-teal/90 disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal">
          {t(sending ? 'contact.sending' : 'contact.submit')}
        </button>
      </form>

      <div className="py-6 text-center" hidden={!sent}>
        <p className="m-0 text-4xl" aria-hidden="true">✅</p>
        <p className="m-0 mt-3 text-lg font-semibold">{t('contact.successTitle')}</p>
        <p className="m-0 mt-1 text-brand-muted">{t('contact.successBody')}</p>
        <button ref={doneRef} type="button" onClick={close} className="mt-6 rounded-xl bg-brand-teal px-6 py-2.5 font-semibold text-white hover:bg-brand-teal/90">{t('contact.done')}</button>
      </div>
    </div>
  </dialog>
}
