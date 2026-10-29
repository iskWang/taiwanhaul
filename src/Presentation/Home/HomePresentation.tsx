import { formatMoney } from '@/Lib/format'
import { useContactContext } from '@/Container/Contact'
import { FX } from '@/Lib/data/fx'
import { useAppContext } from '@/Container/App'
import { getCheaperInTaiwan, getMustBuy, getRecommended } from '@/Lib/content'
import { getMarket } from '@/Lib/market'
import { DEFAULT_MARKET } from '@/Lib/data/markets'
import { ProductCard } from '@/Component/ProductCard'
import { HomeSection } from '@/Component/HomeSection'
import { Header } from '@/Component/Header'
import { Footer } from '@/Component/Footer'
import { SearchPresentation } from '@/Presentation/Search'
import { ContactPresentation } from '@/Presentation/Contact'

export function HomePresentation() {
  const { t, locale, market } = useAppContext()
  const marketInfo = getMarket(market) ?? getMarket(DEFAULT_MARKET)!
  const cheaper = getCheaperInTaiwan(market)
  const mustBuy = getMustBuy()
  const recommended = getRecommended()
  return <>
    <Header />
    <main id="main">
      <SearchPresentation />
      <HomeSection id="cheaper" title={t('cheaper.title')} subtitle={t('cheaper.subtitle', { market: marketInfo.name[locale] ?? marketInfo.name.en })} className="border-y border-brand-line bg-white" disclaimer={t('cheaper.disclaimer', { date: FX.asOf })}>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cheaper.length ? cheaper.map((item) => <div key={item.product.id}><ProductCard product={item.product} market={market} locale={locale} /><dl className="m-0 grid grid-cols-2 gap-2 rounded-b-2xl border border-t-0 border-brand-line bg-white p-4 text-sm"><div><dt className="text-brand-muted">{t('cheaper.inTaiwan')}</dt><dd className="m-0 mt-1 font-bold text-brand-teal">{formatMoney(item.twPrice, locale)}</dd>{item.twPriceInLocal && <dd className="m-0 text-xs text-brand-muted">{t('search.approx', { price: formatMoney(item.twPriceInLocal, locale) })}</dd>}</div><div><dt className="text-brand-muted">{t('cheaper.inMarket', { market: marketInfo.name[locale] ?? marketInfo.name.en })}</dt><dd className="m-0 mt-1 font-semibold">{formatMoney(item.localPrice, locale)}</dd></div><p className="col-span-2 m-0 mt-2 justify-self-start rounded-full bg-brand-green/10 px-3 py-1 font-semibold text-brand-green">{t('cheaper.save', { pct: item.savingsPct })}</p></dl></div>) : <p className="text-brand-muted sm:col-span-2 lg:col-span-3">{t('cheaper.empty', { market: marketInfo.name[locale] ?? marketInfo.name.en })}</p>}</div>
      </HomeSection>
      <HomeSection id="must-buy" title={t('mustBuy.title')} subtitle={t('mustBuy.subtitle')}>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{mustBuy.map((product) => <ProductCard key={product.id} product={product} market={market} locale={locale} />)}</div>
      </HomeSection>
      <HomeSection id="recommended" title={t('recommended.title')} subtitle={t('recommended.subtitle')} className="border-y border-brand-line bg-brand-sand/50" disclaimer={t('recommended.disclaimer')}>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">{recommended.map((item) => <figure key={item.productId} className="m-0 flex flex-col rounded-2xl border border-brand-line bg-white p-5 shadow-sm"><ProductCard product={item.product} market={market} locale={locale} /><blockquote className="m-0 mt-4 border-l-4 border-brand-green/60 pl-4 text-[15px] leading-relaxed text-brand-ink">“{item.quote[locale] ?? item.quote.en}”</blockquote><figcaption className="mt-auto flex items-center gap-3 pt-4 text-sm"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal text-sm font-semibold text-white" aria-hidden="true">{item.by.name.slice(0, 1)}</span><span><span className="font-semibold">{item.by.name}</span> <span className="text-brand-muted">· {item.by.role[locale] ?? item.by.role.en}, {item.by.city[locale] ?? item.by.city.en}</span></span></figcaption></figure>)}</div>
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
