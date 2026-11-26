import { useAppContext } from '@/Container/App'
import { PageContainer } from '@/Component/PageContainer'

export function Footer() {
  const { t } = useAppContext()
  const link = 'inline-flex min-h-11 items-center rounded text-sm font-medium text-brand-ink no-underline hover:text-brand-teal hover:underline'
  return <footer className="border-t border-brand-line py-8">
    <PageContainer className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <img src="/assets/wordmark.png" alt="TaiwanHaul" width="700" height="95" className="h-4 w-auto self-start sm:self-center" />
        <nav className="flex flex-wrap items-center gap-x-6">
          <a href="https://github.com/iskWang/taiwanhaul" className={link}>GitHub</a>
          <a href="/privacy" className={link}>{t('footer.privacy')}</a>
          <a href="/terms" className={link}>{t('footer.terms')}</a>
        </nav>
      </div>
      <div className="flex flex-col gap-4 border-t border-brand-line pt-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
        <p className="m-0 max-w-2xl text-pretty text-[13px] leading-relaxed text-brand-muted">{t('footer.disclaimer')}</p>
        <div className="flex shrink-0 items-center gap-2 text-[13px] text-brand-muted">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-sand text-brand-muted" role="img" aria-label={t('footer.maintainer')}><svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><circle cx="12" cy="8.4" r="3.6" fill="currentColor" /><path d="M4 20.2c0-4.42 3.58-7.6 8-7.6s8 3.18 8 7.6" fill="currentColor" /></svg></div>
          <p className="m-0">{t('footer.tagline')}</p>
        </div>
      </div>
    </PageContainer>
  </footer>
}
