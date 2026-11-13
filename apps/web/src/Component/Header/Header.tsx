import { useAppContext } from '@/Container/App'
import { PreferenceSelect } from '@/Component/PreferenceSelect'

export function Header() {
  const { t } = useAppContext()
  return <>
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:shadow">Skip to content</a>
    <header className="sticky top-0 z-30 border-b border-brand-line/80 bg-brand-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a href="/" className="flex shrink-0 items-center gap-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-teal">
          <img src="/assets/icon-48.png" alt="" width="48" height="48" className="hidden h-8 w-8 sm:block" />
          <img src="/assets/wordmark.png" alt="TaiwanHaul" width="700" height="95" className="h-[18px] w-auto sm:h-5" />
        </a>
        <nav className="hidden lg:block" aria-label={t('nav.label')}><ul className="m-0 flex list-none gap-6 p-0 text-sm font-medium text-brand-muted">
          <li><a href="#discovery" className="hover:text-brand-teal">{t('nav.discovery')}</a></li><li><a href="#contact" className="hover:text-brand-teal">{t('nav.contact')}</a></li>
        </ul></nav>
        <PreferenceSelect />
      </div>
    </header>
  </>
}
