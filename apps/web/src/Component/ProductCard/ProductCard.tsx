import { useAppContext } from '@/Container/App'
import { formatMoney } from '@/Lib/format'
import { pick } from '@/Lib/i18n'
import type { ApiProduct } from '@/Lib/search/type'
import type { ProductCardProps } from './type'

export const PRICE_MAX_AGE_DAYS = 30
export function priceAgeDays(checkedOn: string, today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date())) {
  return (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${checkedOn}T00:00:00Z`)) / 86_400_000
}
export function showPrice(amount: number | null, checkedOn: string | null, today?: string) {
  if (amount === null || checkedOn === null) return false
  const age = priceAgeDays(checkedOn, today)
  return age >= 0 && age <= PRICE_MAX_AGE_DAYS
}

export function ProductCard({ product, locale }: ProductCardProps) {
  const { t } = useAppContext()
  if ('twPrice' in product) return <article className="rounded-2xl border border-brand-line bg-white p-5 shadow-sm"><h3 className="font-semibold">{pick(product.name, locale)}</h3><p className="text-sm text-brand-muted">{pick(product.blurb, locale)}</p></article>
  const p = product as ApiProduct
  return <li className="rounded-2xl border border-brand-line bg-white p-4 shadow-sm">
    <h3 className="m-0 font-semibold">{p.brand} {p.name} {p.model}</h3><p className="m-0 mt-1 text-sm text-brand-muted">{p.variant.name}</p>
    <ul className="m-0 mt-3 list-none space-y-3 p-0">{p.offers.map((offer) => <li key={offer.id}>
      {showPrice(offer.amount, offer.checkedOn) ? <p className="m-0 font-semibold text-brand-teal">{formatMoney({ amount: offer.amount!, currency: 'TWD' }, locale)} <time dateTime={offer.checkedOn!}>{offer.checkedOn}</time></p> : <p className="m-0 text-sm">{t('search.checkPrice')}</p>}
      <a href={offer.outboundLink} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-teal underline">{t('search.viewAtShop')}</a>
    </li>)}</ul>
  </li>
}
