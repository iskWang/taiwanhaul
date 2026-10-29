import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { LOCALES, resolveLocale, translate } from '@/Lib/i18n'
import { matchMarket, resolveMarket } from '@/Lib/market'
import type { AppContextValue, AppPreferences } from './type'
type State = { locale: string; market: string }
enum AppActionType { SetPreferences = 'preferences/set' }
type Action = { type: AppActionType.SetPreferences; preferences: AppPreferences }

const AppContext = createContext<AppContextValue | null>(null)
const storageGet = (key: string) => {
  try { return localStorage.getItem(key) } catch { return null }
}
const storageSet = (key: string, value: string) => {
  try { localStorage.setItem(key, value) } catch {}
}
const initialState = (): State => {
  const params = new URLSearchParams(location.search)
  const preferred = navigator.languages ?? []
  return {
    locale: resolveLocale({ param: params.get('lang'), stored: storageGet('th:locale'), preferred }),
    market: resolveMarket({ param: params.get('market'), stored: storageGet('th:market'), preferred }),
  }
}
function reducer(state: State, action: Action): State {
  if (action.type !== AppActionType.SetPreferences) return state
  return {
    locale: action.preferences.locale ?? state.locale,
    market: matchMarket(action.preferences.market) ?? state.market,
  }
}

export function AppContainer({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const setPreferences = useCallback(({ locale, market }: AppPreferences) => {
    const nextLocale = locale && LOCALES.some((entry) => entry.code === locale) ? locale : state.locale
    const nextMarket = matchMarket(market) ?? state.market
    if (nextLocale === state.locale && nextMarket === state.market) return
    dispatch({ type: AppActionType.SetPreferences, preferences: { locale: nextLocale, market: nextMarket } })
    storageSet('th:locale', nextLocale)
    storageSet('th:market', nextMarket)
    const url = new URL(location.href)
    url.searchParams.set('lang', nextLocale)
    url.searchParams.set('market', nextMarket)
    history.replaceState(null, '', url)
  }, [state.locale, state.market])
  const value = useMemo(() => ({
    ...state,
    t: (key: string, vars?: Record<string, string | number>) => String(translate(state.locale, key, vars)),
    setPreferences,
  }), [state, setPreferences])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppContext must be used within AppContainer')
  return context
}
