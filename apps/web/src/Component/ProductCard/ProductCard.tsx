import { useAppContext } from '@/Container/App'
import { FX } from '@/Lib/data/fx'
import { formatMoney } from '@/Lib/format'
import { pick } from '@/Lib/i18n'
import { getMarket } from '@/Lib/market'
import { fromTWD } from '@/Lib/pricing'
import type { ApiProduct } from '@/Lib/search/type'
import type { ProductCardProps } from './type'

const tileColors: Record<string, string> = {
  food: 'bg-amber-50', tea: 'bg-lime-50', beauty: 'bg-rose-50', eyewear: 'bg-sky-50', home: 'bg-emerald-50',
}

export const PRICE_MAX_AGE_DAYS = 30
export function taipeiDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(now)
}
export function priceAgeDays(checkedOn: string, today = taipeiDate()) {
  return (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${checkedOn}T00:00:00Z`)) / 86_400_000
}
export function showPrice(amount: number | null, checkedOn: string | null, today?: string) {
  if (amount === null || checkedOn === null) return false
  const age = priceAgeDays(checkedOn, today)
  return age >= 0 && age <= PRICE_MAX_AGE_DAYS
}

export function ProductCard({ product, market, locale }: ProductCardProps) {
  const { t } = useAppContext()
  if ('twPrice' in product) {
    return <article className="flex flex-col rounded-2xl border border-brand-line bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-3xl ${tileColors[product.category] ?? 'bg-brand-sand'}`} aria-hidden="true">{product.emoji}</div>
        <div className="min-w-0">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-brand-green">{t(`category.${product.category}`)}</p>
          <h3 className="m-0 mt-1 text-base font-semibold leading-snug">{pick(product.name, locale)}</h3>
        </div>
      </div>
      <p className="m-0 mt-3 text-sm leading-relaxed text-brand-muted">{pick(product.blurb, locale)}</p>
      <p className="m-0 mt-auto pt-3 text-xs text-brand-muted">📍 {pick(product.where, locale)}</p>
    </article>
  }
  const p = product as ApiProduct
  const currency = getMarket(market)?.currency
  return <li className="rounded-2xl border border-brand-line bg-white p-4 shadow-sm">
    <h3 className="m-0 font-semibold">{p.brand} {p.name} {p.model}</h3><p className="m-0 mt-1 text-sm text-brand-muted">{p.variant.name}</p>
    <ul className="m-0 mt-3 list-none space-y-3 p-0">{p.offers.map((offer) => {
      const fresh = showPrice(offer.amount, offer.checkedOn)
      const local = fresh && offer.amount !== null && currency ? fromTWD(offer.amount, currency, FX.twdPerUnit) : null
      return <li key={offer.id}>
        <p className="m-0 text-sm font-medium">{offer.merchant.name}</p>
        {fresh ? <p className="m-0 font-semibold text-brand-teal">{formatMoney({ amount: offer.amount!, currency: 'TWD' }, locale)} <span className="text-xs font-normal text-brand-muted">{t('search.lastChecked')}: <time dateTime={offer.checkedOn!}>{offer.checkedOn}</time></span>{local && <span className="ml-2 text-sm font-normal text-brand-muted">{t('search.approx', { price: formatMoney(local, locale) })}</span>}</p> : <p className="m-0 text-sm"><a href={offer.outboundLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-teal underline">{t('search.checkPrice')}</a></p>}
        {fresh && <a href={offer.outboundLink} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-teal underline">{t('search.viewAtShop')}</a>}
      </li>
    })}</ul>
  </li>
}
