import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchContext } from '@/Container/Search'
import { ProductCard } from '@/Component/ProductCard'
import { SkeletonCards, StateBlock } from '@/Component/StateBlock'
import { LOCALES } from '@/Lib/i18n'
import { useAppContext } from '@/Container/App'

export function SearchPresentation() {
  const { t, locale, market } = useAppContext()
  const { query, status, response, errorCode, runSearch, clearSearch } = useSearchContext()
  const [input, setInput] = useState(() => new URLSearchParams(location.search).get('q') ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestions = LOCALES.find((item) => item.code === locale)?.messages.search.suggestions ?? LOCALES[0].messages.search.suggestions

  useEffect(() => setInput(query), [query])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void runSearch(input, 'form').catch(() => {})
  }

  function clear() {
    clearSearch()
    setInput('')
    inputRef.current?.focus()
  }

  const knownError = errorCode === 'empty_query'
    ? 'search.errorEmptyQuery'
    : errorCode === 'query_too_long'
      ? 'search.errorTooLong'
      : null

  return <section id="search" className="px-4 pb-12 pt-12 sm:px-6 sm:pt-20" aria-labelledby="hero-title">
    <div className="mx-auto max-w-3xl text-center motion-safe:animate-rise-in">
      <p className="text-[13px] font-semibold uppercase tracking-[0.09em] text-brand-green">{t('hero.eyebrow')}</p>
      <h1 id="hero-title" className="mt-3 text-4xl font-bold leading-tight text-brand-teal sm:text-5xl">{t('hero.title')}</h1>
      <p className="mx-auto mt-4 max-w-[40ch] text-lg text-brand-muted">{t('hero.subtitle')}</p>
      <form role="search" className="mt-8 flex gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-brand-line" onSubmit={submit}>
        <label className="sr-only" htmlFor="search-input">{t('search.label')}</label>
        <input ref={inputRef} id="search-input" type="search" maxLength={200} value={input} onChange={(event) => setInput(event.target.value)} placeholder={t('search.placeholder')} className="min-w-0 flex-1 bg-transparent px-3 py-3 outline-none" />
        <button className="rounded-xl bg-brand-teal px-5 py-3 font-semibold text-white">{t('search.submit')}</button>
      </form>
      <div id="search-suggestions" className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-brand-muted">{t('search.suggestionsLabel')}:</span>
        {suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => { setInput(suggestion); void runSearch(suggestion, 'suggestion').catch(() => {}) }} className="rounded-full border border-brand-line bg-white px-3 py-1.5 text-sm text-brand-ink hover:border-brand-teal hover:text-brand-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-teal">{suggestion}</button>)}
      </div>
    </div>
    <div className="mx-auto mt-8 max-w-4xl" aria-live="polite" aria-busy={status === 'loading'} hidden={status === 'idle'}>
      {status === 'loading' && <>
        <p className="m-0 mb-4 text-center text-sm text-brand-muted">{t('search.loading')}</p>
        <div className="grid gap-3 sm:grid-cols-2"><SkeletonCards count={4} className="h-24" /></div>
      </>}
      {status === 'error' && (knownError
        ? <StateBlock icon="✍️" title={t(knownError)} />
        : <StateBlock icon="⚠️" title={t('search.errorTitle')} body={t('search.errorBody')} action={{ label: t('search.retry'), onClick: () => { void runSearch(query, 'retry').catch(() => {}) } }} />)}
      {(status === 'results' || status === 'empty') && response && <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-brand-muted">
            <p className="m-0 font-semibold text-brand-ink">{t('search.resultsCount', { count: response.results.length })}</p>
            <p className="m-0 mt-1 flex flex-wrap items-center gap-1.5">{t('search.searchedAs')}: {response.query.terms.map((term) => <span key={term} className="rounded-full bg-brand-teal/10 px-2.5 py-0.5 font-semibold text-brand-teal" lang="zh-TW">{term}</span>)}</p>
          </div>
          <button type="button" onClick={clear} className="rounded-full px-3 py-1.5 text-sm text-brand-muted hover:bg-brand-sand hover:text-brand-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-teal">{t('search.clear')}</button>
        </div>
        {status === 'empty' && <StateBlock icon="🔎" title={t('search.emptyTitle')} body={t('search.emptyBody')} />}
        {status === 'results' && <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">{response.results.map((product) => <ProductCard key={product.id} product={product} market={market} locale={locale} />)}</ul>}
        {response.isMock && <p className="m-0 mt-4 text-center text-xs text-brand-muted">{t('search.demoNotice')}</p>}
      </>}
    </div>
  </section>
}
