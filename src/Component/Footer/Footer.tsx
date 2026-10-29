import { useAppContext } from '@/Container/App'

export function Footer() {
  const { t } = useAppContext()
  return <footer className="border-t border-brand-line px-4 py-6 sm:px-6">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 sm:justify-between sm:gap-6">
      <img src="/assets/wordmark.png" alt="TaiwanHaul" width="700" height="95" className="h-4 w-auto" />
      <div className="flex items-center gap-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-sand text-brand-muted" role="img" aria-label={t('footer.maintainer')}><svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><circle cx="12" cy="8.4" r="3.6" fill="currentColor" /><path d="M4 20.2c0-4.42 3.58-7.6 8-7.6s8 3.18 8 7.6" fill="currentColor" /></svg></div>
        <a href="https://github.com/iskWang/taiwanhaul" className="inline-flex items-center gap-1.5 rounded text-[15px] font-semibold text-brand-ink no-underline hover:text-brand-teal hover:underline">GitHub</a>
        <a href="/privacy" className="inline-flex items-center rounded text-[15px] font-semibold text-brand-ink no-underline hover:text-brand-teal hover:underline">{t('footer.privacy')}</a>
      </div>
      <p className="m-0 w-full text-center text-[13px] text-brand-muted sm:w-auto">{t('footer.tagline')}</p>
    </div>
  </footer>
}
