export type AppPreferences = { locale?: string; market?: string }
export type AppContextValue = {
  locale: string
  market: string
  t: (key: string, vars?: Record<string, string | number>) => string
  /** Applies valid values, ignores invalid ones, and returns the preferences now in effect. */
  setPreferences: (preferences: AppPreferences) => { locale: string; market: string }
}
