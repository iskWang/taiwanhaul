export type AppPreferences = { locale?: string; market?: string }
export type AppContextValue = {
  locale: string
  market: string
  t: (key: string, vars?: Record<string, string | number>) => string
  setPreferences: (preferences: AppPreferences) => void
}
