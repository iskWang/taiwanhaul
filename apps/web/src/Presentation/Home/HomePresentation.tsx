import { useContactContext } from '@/Container/Contact'
import { useAppContext } from '@/Container/App'
import { getDiscovery } from '@/Lib/content'
import { ProductCard } from '@/Component/ProductCard'
import { HomeSection } from '@/Component/HomeSection'
import { Header } from '@/Component/Header'
import { Footer } from '@/Component/Footer'
import { SearchPresentation } from '@/Presentation/Search'
import { ContactPresentation } from '@/Presentation/Contact'

export function HomePresentation() {
  const { t, locale, market } = useAppContext()
  const products = getDiscovery()
  return <>
    <Header />
    <main id="main">
      <SearchPresentation />
      <HomeSection id="discovery" title={t('discovery.title')} disclaimer={t('discovery.disclaimer')}>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} market={market} locale={locale} />)}</div>
      </HomeSection>
      <section id="contact" className="px-4 py-14 sm:px-6" aria-labelledby="contact-heading"><div className="mx-auto flex max-w-4xl flex-col items-start gap-6 rounded-3xl bg-brand-teal px-6 py-10 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div><h2 id="contact-heading" className="m-0 text-2xl font-bold tracking-tight">{t('contact.title')}</h2><p className="m-0 mt-2 max-w-[46ch] text-white/80">{t('contact.body')}</p></div>
        <ContactButton />
      </div></section>
    </main>
    <Footer />
    <ContactPresentation />
  </>
}

function ContactButton() {
  const { t } = useAppContext()
  const { open } = useContactContext()
  return <button type="button" onClick={() => open()} className="shrink-0 rounded-xl bg-white px-6 py-3 font-semibold text-brand-teal hover:bg-brand-sand">{t('contact.cta')}</button>
}
