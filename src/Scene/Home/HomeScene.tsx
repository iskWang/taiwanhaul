import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAppContext } from '@/Container/App/AppContainer'
import { getCheaperInTaiwan, getMustBuy, getRecommended } from '@/Lib/content'
import { formatMoney } from '@/Lib/format'
import { LOCALES } from '@/Lib/i18n'
import { getMarket } from '@/Lib/market'
import { DEFAULT_MARKET, VISITOR_MARKETS } from '@/Lib/data/markets'
import { searchService, SearchError } from '@/Lib/search'
import { track } from '@/Lib/analytics'
import { CONTACT_TOPICS, submitContact, validateContact } from '@/Lib/contact'
import { TURNSTILE_SITE_KEY } from '@/Lib/config'
import type { NormalizedResult } from '@/Lib/search/type'

function ProductCard({ product }: { product: ReturnType<typeof getMustBuy>[number] }) {
  const { locale } = useAppContext()
  return <article className="rounded-2xl border border-brand-line bg-white p-5">
    <p className="m-0 text-3xl" aria-hidden="true">{product.emoji}</p>
    <h3 className="mb-1 mt-3 text-lg font-semibold">{product.name[locale] ?? product.name.en}</h3>
    <p className="m-0 text-sm text-brand-muted">{product.blurb[locale] ?? product.blurb.en}</p>
    <p className="mb-0 mt-3 text-sm font-semibold">{formatMoney(product.twPrice, locale)}</p>
  </article>
}

function ContactDialog({ onClose }: { onClose: () => void }) {
  const { t, locale, market } = useAppContext()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const fields = Object.fromEntries(form.entries()) as Record<string, string>
    const validation = validateContact({ ...fields, locale, turnstileToken: token })
    if (!validation.ok) {
      setStatus(t('contact.errors.validation'))
      return
    }
    setBusy(true)
    const result = await submitContact(validation.value)
    setBusy(false)
    setStatus(result.ok ? t('contact.successTitle') : t(`contact.errors.${result.error}`))
    if (result.ok) event.currentTarget.reset()
  }
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => {
      const target = document.getElementById('turnstile-widget')
      const turnstile = (window as Window & { turnstile?: { render: (element: HTMLElement, options: Record<string, unknown>) => string } }).turnstile
      if (target && turnstile) turnstile.render(target, { sitekey: TURNSTILE_SITE_KEY, callback: setToken, 'expired-callback': () => setToken(''), 'error-callback': () => setToken('') })
    }
    document.head.append(script)
    return () => { script.remove() }
  }, [])
  return <dialog open aria-labelledby="contact-title" className="fixed inset-0 z-50 m-auto w-[min(100%-2rem,32rem)] rounded-2xl border-0 p-6 text-brand-ink shadow-2xl backdrop:bg-brand-ink/50">
    <div className="flex items-center justify-between"><h2 id="contact-title" className="m-0 text-xl font-bold">{t('contact.title')}</h2><button type="button" onClick={onClose} aria-label={t('contact.close')} className="rounded px-3 py-2">×</button></div>
    <form className="mt-4 grid gap-3" onSubmit={submit}>
      <label>{t('contact.name')}<input name="name" required maxLength={100} className="mt-1 block w-full rounded border border-brand-line p-2" /></label>
      <label>{t('contact.email')}<input name="email" type="email" required maxLength={200} className="mt-1 block w-full rounded border border-brand-line p-2" /></label>
      <label>{t('contact.market')}<select name="market" defaultValue={market} className="mt-1 block w-full rounded border border-brand-line p-2">{VISITOR_MARKETS.map((code) => { const item = getMarket(code)!; return <option key={code} value={code}>{item.flag} {item.name[locale] ?? item.name.en}</option> })}<option value="">{t('contact.marketOther')}</option></select></label>
      <label>{t('contact.topic')}<select name="topic" className="mt-1 block w-full rounded border border-brand-line p-2">{CONTACT_TOPICS.map((topic) => <option key={topic} value={topic}>{t(`contact.topics.${topic}`)}</option>)}</select></label>
      <label>{t('contact.message')}<textarea name="message" required minLength={10} maxLength={2000} className="mt-1 block w-full rounded border border-brand-line p-2" /></label>
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <div id="turnstile-widget" />
      <p role="alert" aria-live="polite">{status}</p>
      <button disabled={busy || !token} className="rounded-xl bg-brand-teal px-4 py-3 font-semibold text-white disabled:opacity-50">{t(busy ? 'contact.sending' : 'contact.submit')}</button>
    </form>
  </dialog>
}

export function HomeScene() {
  const { t, locale, market, setPreferences } = useAppContext()
  const [query, setQuery] = useState(new URLSearchParams(location.search).get('q') ?? '')
  const [results, setResults] = useState<NormalizedResult[] | null>(null)
  const [searchStatus, setSearchStatus] = useState('')
  const [contactOpen, setContactOpen] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const marketInfo = getMarket(market) ?? getMarket(DEFAULT_MARKET)!
  const cheaper = getCheaperInTaiwan(market)
  const mustBuy = getMustBuy()
  const recommended = getRecommended()

  async function runSearch(rawQuery: string, source: string) {
    controller.current?.abort()
    const active = new AbortController()
    controller.current = active
    const text = rawQuery.trim()
    track('search_submitted', { locale, market, queryLength: text.length, source })
    setSearchStatus(t('search.loading'))
    try {
      const response = await searchService.search(text, { locale, market }, { signal: active.signal })
      if (active.signal.aborted) return
      setResults(response.results)
      setSearchStatus(response.results.length ? '' : t('search.emptyTitle'))
      const url = new URL(location.href)
      url.searchParams.set('q', text)
      history.replaceState(null, '', url)
      track('search_completed', { locale, market, resultCount: response.results.length, strategy: response.query.strategy })
    } catch (error) {
      if (active.signal.aborted) return
      setResults([])
      setSearchStatus(error instanceof SearchError ? t(`search.errors.${error.code}`) : t('search.errorTitle'))
      track('search_failed', { locale, market, code: error instanceof SearchError ? error.code : 'unknown' })
    }
  }
  useEffect(() => {
    document.documentElement.lang = locale
    document.title = t('meta.title')
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'))
  }, [locale, t])
  useEffect(() => {
    if (query) void runSearch(query, 'url')
    return () => controller.current?.abort()
  }, [])

  return <>
    <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
    <header className="sticky top-0 z-30 border-b border-brand-line/80 bg-brand-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a href="/" className="flex items-center gap-2"><img src="/assets/wordmark.png" alt="TaiwanHaul" className="h-5 w-auto" /></a>
        <nav className="hidden lg:block" aria-label={t('nav.label')}><ul className="flex list-none gap-6 text-sm text-brand-muted"><li><a href="#cheaper">{t('nav.cheaper')}</a></li><li><a href="#must-buy">{t('nav.mustBuy')}</a></li><li><a href="#recommended">{t('nav.recommended')}</a></li><li><a href="#contact">{t('nav.contact')}</a></li></ul></nav>
        <div className="flex gap-2"><label className="sr-only" htmlFor="locale-select">{t('prefs.language')}</label><select id="locale-select" value={locale} onChange={(event) => setPreferences({ locale: event.target.value })} className="h-9 rounded-lg border border-brand-line bg-white px-2">{LOCALES.map((item) => <option key={item.code} value={item.code}>{item.short}</option>)}</select><label className="sr-only" htmlFor="market-select">{t('prefs.market')}</label><select id="market-select" value={market} onChange={(event) => setPreferences({ market: event.target.value })} className="h-9 max-w-32 rounded-lg border border-brand-line bg-white px-2">{VISITOR_MARKETS.map((code) => { const item = getMarket(code)!; return <option key={code} value={code}>{item.flag} {item.name[locale] ?? item.name.en}</option> })}</select></div>
      </div>
    </header>
    <main id="main">
      <section id="search" className="px-4 pb-12 pt-12 sm:px-6 sm:pt-20" aria-labelledby="hero-title"><div className="mx-auto max-w-3xl text-center motion-safe:animate-rise-in"><p className="text-[13px] font-semibold uppercase tracking-[0.09em] text-brand-green">{t('hero.eyebrow')}</p><h1 id="hero-title" className="mt-3 text-4xl font-bold leading-tight text-brand-teal sm:text-5xl">{t('hero.title')}</h1><p className="mx-auto mt-4 max-w-[40ch] text-lg text-brand-muted">{t('hero.subtitle')}</p><form role="search" className="mt-8 flex gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-brand-line" onSubmit={(event) => { event.preventDefault(); void runSearch(query, 'form') }}><label className="sr-only" htmlFor="search-input">{t('search.label')}</label><input id="search-input" type="search" maxLength={200} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('search.placeholder')} className="min-w-0 flex-1 bg-transparent px-3 py-3 outline-none"/><button className="rounded-xl bg-brand-teal px-5 py-3 font-semibold text-white">{t('search.submit')}</button></form></div>
        {(searchStatus || results) && <div className="mx-auto mt-8 max-w-4xl" aria-live="polite"><p>{searchStatus}</p><div className="grid gap-3 sm:grid-cols-2">{results?.map((item) => <article key={item.id} className="rounded-xl border border-brand-line bg-white p-4"><h2 className="m-0 text-base font-semibold">{item.translatedTitle?.[locale] ?? item.title}</h2><p className="mb-0 mt-2 text-sm text-brand-muted">{formatMoney(item.price, locale)}</p></article>)}</div></div>}
      </section>
      <section id="cheaper" className="border-y border-brand-line bg-white px-4 py-14 sm:px-6"><div className="mx-auto max-w-6xl"><h2 className="text-2xl font-bold sm:text-3xl">{t('cheaper.title')}</h2><p className="text-brand-muted">{t('cheaper.subtitle', { market: marketInfo.name[locale] ?? marketInfo.name.en })}</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cheaper.map(({ product }) => <ProductCard key={product.id} product={product}/>)}</div><p className="mt-5 text-xs text-brand-muted">{t('cheaper.disclaimer')}</p></div></section>
      <section id="must-buy" className="px-4 py-14 sm:px-6"><div className="mx-auto max-w-6xl"><h2 className="text-2xl font-bold sm:text-3xl">{t('mustBuy.title')}</h2><p className="text-brand-muted">{t('mustBuy.subtitle')}</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{mustBuy.map((product) => <ProductCard key={product.id} product={product}/>)}</div></div></section>
      <section id="recommended" className="border-y border-brand-line bg-brand-sand/50 px-4 py-14 sm:px-6"><div className="mx-auto max-w-6xl"><h2 className="text-2xl font-bold sm:text-3xl">{t('recommended.title')}</h2><p className="text-brand-muted">{t('recommended.subtitle')}</p><div className="grid gap-4 sm:grid-cols-2">{recommended.map((item) => <article key={item.productId} className="rounded-2xl bg-white p-5"><ProductCard product={item.product}/><p className="mt-4 text-sm text-brand-muted">{item.quote[locale] ?? item.quote.en}</p></article>)}</div><p className="mt-5 text-xs text-brand-muted">{t('recommended.disclaimer')}</p></div></section>
      <section id="contact" className="px-4 py-14 sm:px-6"><div className="mx-auto flex max-w-4xl flex-col items-start gap-6 rounded-3xl bg-brand-teal px-6 py-10 text-white sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-bold">{t('contact.title')}</h2><p>{t('contact.body')}</p></div><button type="button" onClick={() => setContactOpen(true)} className="rounded-xl bg-white px-6 py-3 font-semibold text-brand-teal">{t('contact.cta')}</button></div></section>
    </main>
    <footer className="border-t border-brand-line px-4 py-6"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 sm:justify-between"><img src="/assets/wordmark.png" alt="TaiwanHaul" className="h-4 w-auto"/><div className="flex items-center gap-4"><span className="rounded-full bg-brand-sand p-2" role="img" aria-label={t('footer.maintainer')}>●</span><a href="https://github.com/iskWang/taiwanhaul">GitHub</a><a href="/privacy">{t('footer.privacy')}</a></div><p className="w-full text-center text-sm text-brand-muted sm:w-auto">{t('footer.tagline')}</p></div></footer>
    {contactOpen && <ContactDialog onClose={() => setContactOpen(false)}/>}
  </>
}
