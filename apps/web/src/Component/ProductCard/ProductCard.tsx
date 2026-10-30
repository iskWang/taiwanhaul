import { useAppContext } from '@/Container/App'
import { FX } from '@/Lib/data/fx'
import { formatMoney } from '@/Lib/format'
import { pick } from '@/Lib/i18n'
import { getMarket } from '@/Lib/market'
import { fromTWD } from '@/Lib/pricing'
import type { ProductCardProps } from './type'

const tileColors: Record<string, string> = {
  food: 'bg-amber-50',
  tea: 'bg-lime-50',
  beauty: 'bg-rose-50',
  eyewear: 'bg-sky-50',
  home: 'bg-emerald-50',
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

  const translated = product.translatedTitle ? pick(product.translatedTitle, locale) : ''
  const currency = getMarket(market)?.currency
  const localPrice = product.price.currency === 'TWD' && currency
    ? fromTWD(product.price.amount, currency, FX.twdPerUnit)
    : null
  return <li className="flex items-start gap-4 rounded-2xl border border-brand-line bg-white p-4 shadow-sm">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-sand text-2xl" aria-hidden="true">{product.emoji ?? '🛍️'}</div>
    <div className="min-w-0 flex-1">
      <p className="m-0 font-semibold leading-snug">{translated || product.title}</p>
      {translated && translated !== product.title && <p className="m-0 mt-0.5 text-sm text-brand-muted" lang="zh-TW">{product.title}</p>}
      <p className="m-0 mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="text-base font-bold text-brand-teal">{formatMoney(product.price, locale)}</span>
        {localPrice && <span className="text-brand-muted">{t('search.approx', { price: formatMoney(localPrice, locale) })}</span>}
      </p>
    </div>
  </li>
}
