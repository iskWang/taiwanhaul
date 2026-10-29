import { useEffect, useRef } from 'react'
import { useAppContext } from '@/Container/App'
import { useSearchContext } from '@/Container/Search'
import { useContactContext } from '@/Container/Contact'
import { registerWebMcp, unregisterWebMcp } from '@/Lib/webmcp'
import { LOCALES, pick } from '@/Lib/i18n'
import { getMarket, matchMarket } from '@/Lib/market'
import { VISITOR_MARKETS } from '@/Lib/data/markets'
import { FX } from '@/Lib/data/fx'
import { CONTACT_TOPICS } from '@/Lib/contact'
import { fromTWD } from '@/Lib/pricing'
import { getCheaperInTaiwan, getMustBuy, getRecommended } from '@/Lib/content'

// Tools are registered once; they read the latest state through a ref.
// Re-registering on every preference change throws "Duplicate tool name".
export function useWebMcp() {
  const { locale, market, setPreferences } = useAppContext()
  const { runSearch } = useSearchContext()
  const { open } = useContactContext()
  const latest = useRef({ locale, market, setPreferences, runSearch, open })
  latest.current = { locale, market, setPreferences, runSearch, open }

  useEffect(() => {
    registerWebMcp({
      locales: LOCALES.map((item) => item.code),
      markets: VISITOR_MARKETS,
      topics: CONTACT_TOPICS,
      search: async (query, options) => {
        const { locale, market, setPreferences, runSearch } = latest.current
        if (options.market && matchMarket(options.market)) setPreferences({ market: options.market })
        const response = await runSearch(query, 'webmcp')
        const currency = getMarket(options.market ?? market)?.currency ?? 'TWD'
        return {
          searchedTerms: response.query.terms,
          isSampleData: response.isMock,
          results: response.results.map((item) => ({
            title: item.title,
            translatedTitle: item.translatedTitle ? pick(item.translatedTitle, locale) : null,
            priceTWD: item.price.amount,
            approxLocalPrice: item.price.currency === 'TWD' ? fromTWD(item.price.amount, currency, FX.twdPerUnit) : null,
            source: item.sourceLabel,
            url: item.url,
          })),
        }
      },
      listFeatured: async (section, options) => {
        const { locale, market } = latest.current
        const selectedMarket = matchMarket(options.market) ?? market
        if (section === 'cheaper') return getCheaperInTaiwan(selectedMarket).map((item) => ({
          name: pick(item.product.name, locale),
          taiwanPrice: item.twPrice,
          localPrice: item.localPrice,
          savingsPercent: item.savingsPct,
          isSampleData: true,
        }))
        if (section === 'must_buy') return getMustBuy().map((product) => ({
          name: pick(product.name, locale),
          from: product.twPrice,
          where: pick(product.where, locale),
          isSampleData: true,
        }))
        if (section === 'recommended') return getRecommended().map((item) => ({
          name: pick(item.product.name, locale),
          tip: pick(item.quote, locale),
          by: `${item.by.name}, ${pick(item.by.city, locale)}`,
          isSampleData: true,
        }))
        throw new Error(`Unknown section "${section}". Use cheaper, must_buy or recommended.`)
      },
      setPreferences: (preferences) => latest.current.setPreferences(preferences),
      getPreferences: () => ({ locale: latest.current.locale, market: latest.current.market }),
      openContactForm: (prefill) => latest.current.open(prefill.topic, prefill.message),
    })
    return () => unregisterWebMcp()
  }, [])
}
