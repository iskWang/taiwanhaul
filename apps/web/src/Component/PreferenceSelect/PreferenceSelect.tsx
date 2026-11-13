import { useAppContext } from '@/Container/App'
import { LOCALES } from '@/Lib/i18n'
import { getMarket } from '@/Lib/market'
import { VISITOR_MARKETS } from '@/Lib/data/markets'
import { track } from '@/Lib/analytics'

export function PreferenceSelect() {
  const { t, locale, market, setPreferences } = useAppContext()
  function change(preferences: { locale?: string; market?: string }) {
    const nextLocale = preferences.locale ?? locale
    const nextMarket = preferences.market ?? market
    if (nextLocale === locale && nextMarket === market) return
    setPreferences(preferences)
    track('preferences_changed', { locale: nextLocale, market: nextMarket })
  }
  return <div className="flex min-w-0 items-center gap-2">
    <label htmlFor="locale-select" className="sr-only">{t('prefs.language')}</label>
    <select id="locale-select" value={locale} onChange={(event) => change({ locale: event.target.value })} className="h-9 rounded-lg border border-brand-line bg-white px-2 text-sm">{LOCALES.map((item) => <option key={item.code} value={item.code}>{item.short}</option>)}</select>
    <label htmlFor="market-select" className="sr-only">{t('prefs.market')}</label>
    <select id="market-select" value={market} onChange={(event) => change({ market: event.target.value })} className="h-9 min-w-0 max-w-[8rem] rounded-lg border border-brand-line bg-white px-2 text-sm sm:max-w-[11rem]">{VISITOR_MARKETS.map((code) => { const item = getMarket(code)!; return <option key={code} value={code}>{item.flag} {item.name[locale] ?? item.name.en}</option> })}</select>
  </div>
}
