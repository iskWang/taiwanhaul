import { useEffect, useRef } from 'react'
import { useAppContext } from '@/Container/App'
import { useSearchContext } from '@/Container/Search'
import { useContactContext } from '@/Container/Contact'
import { registerWebMcp, unregisterWebMcp } from '@/Lib/webmcp'
import { LOCALES } from '@/Lib/i18n'
import { matchMarket, getMarket } from '@/Lib/market'
import { VISITOR_MARKETS } from '@/Lib/data/markets'
import { CONTACT_TOPICS } from '@/Lib/contact'
import { getDiscoveryForLocale } from '@/Lib/content'
import { showPrice } from '@/Component/ProductCard/ProductCard'
import { FX } from '@/Lib/data/fx'
import { fromTWD } from '@/Lib/pricing'

export function useWebMcp() {
  const { locale, market, setPreferences } = useAppContext()
  const { runSearch } = useSearchContext()
  const { open } = useContactContext()
  const latest = useRef({ locale, market, setPreferences, runSearch, open })
  latest.current = { locale, market, setPreferences, runSearch, open }
  useEffect(() => {
    registerWebMcp({
      locales: LOCALES.map((item) => item.code), markets: VISITOR_MARKETS, topics: CONTACT_TOPICS,
      search: async (query, options) => {
        const { market, setPreferences, runSearch } = latest.current
        if (options.market && matchMarket(options.market)) setPreferences({ market: options.market })
        const response = await runSearch(query, 'webmcp')
        const currency = getMarket(options.market ?? market)?.currency
        return {
          searchedTerms: response.searchTerms,
          results: response.results.map((item) => ({
            title: `${item.brand} ${item.name} ${item.model} ${item.variant.name}`,
            offers: item.offers.map((offer) => {
              const fresh = showPrice(offer.amount, offer.checkedOn)
              const localEstimate = fresh && offer.amount !== null && currency ? fromTWD(offer.amount, currency, FX.twdPerUnit) : null
              return { merchant: offer.merchant.name, outboundLink: offer.outboundLink, ...(fresh ? { amount: offer.amount, checkedOn: offer.checkedOn, localEstimate } : {}) }
            }),
          })),
        }
      },
      listFeatured: async () => getDiscoveryForLocale(latest.current.locale),
      setPreferences: (preferences) => latest.current.setPreferences(preferences),
      getPreferences: () => ({ locale: latest.current.locale, market: latest.current.market }),
      openContactForm: (prefill) => latest.current.open(prefill.topic, prefill.message),
    })
    return () => unregisterWebMcp()
  }, [])
}
