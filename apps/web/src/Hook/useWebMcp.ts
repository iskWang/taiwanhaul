import { useEffect, useRef } from 'react'
import { useAppContext } from '@/Container/App'
import { useSearchContext } from '@/Container/Search'
import { useContactContext } from '@/Container/Contact'
import { registerWebMcp, unregisterWebMcp } from '@/Lib/webmcp'
import { LOCALES } from '@/Lib/i18n'
import { matchMarket } from '@/Lib/market'
import { VISITOR_MARKETS } from '@/Lib/data/markets'
import { CONTACT_TOPICS } from '@/Lib/contact'
import { getDiscoveryForLocale } from '@/Lib/content'
import { showPrice } from '@/Component/ProductCard/ProductCard'

export function useWebMcp() {
  const { getPreferences, setPreferences } = useAppContext()
  const { runSearch } = useSearchContext()
  const { open } = useContactContext()
  const latest = useRef({ getPreferences, setPreferences, runSearch, open })
  latest.current = { getPreferences, setPreferences, runSearch, open }
  useEffect(() => {
    registerWebMcp({
      locales: LOCALES.map((item) => item.code), markets: VISITOR_MARKETS, topics: CONTACT_TOPICS,
      search: async (query, options) => {
        const { setPreferences, runSearch } = latest.current
        const market = matchMarket(options.market)
        if (market) setPreferences({ market })
        const response = await runSearch(query, 'webmcp')
        return {
          searchedTerms: response.searchTerms,
          results: response.results.map((item) => ({
            title: `${item.brand} ${item.name} ${item.model} ${item.variant.name}`,
            offers: item.offers.map((offer) => {
              const fresh = showPrice(offer.amount, offer.checkedOn)
              return { merchant: offer.merchant.name, outboundLink: offer.outboundLink, ...(fresh ? { amount: offer.amount, checkedOn: offer.checkedOn, localEstimate: offer.localEstimate ? { amount: offer.localEstimate.amount, currency: offer.localEstimate.currency } : null, fxDate: offer.localEstimate?.fxDate ?? null } : {}) }
            }),
          })),
        }
      },
      listFeatured: async () => getDiscoveryForLocale(latest.current.getPreferences().locale),
      setPreferences: (preferences) => latest.current.setPreferences(preferences),
      getPreferences: () => latest.current.getPreferences(),
      openContactForm: (prefill) => latest.current.open(prefill.topic, prefill.message),
    })
    return () => unregisterWebMcp()
  }, [])
}
