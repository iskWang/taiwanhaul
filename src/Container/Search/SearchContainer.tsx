import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAppContext } from '@/Container/App'
import { track } from '@/Lib/analytics'
import { searchService } from '@/Lib/search'
import type { SearchResponse } from '@/Lib/search/type'
import type { SearchSource, SearchStatus, SearchContextValue } from './type'

const SearchContext = createContext<SearchContextValue | null>(null)

export function SearchContainer({ children }: { children: ReactNode }) {
  const { locale, market } = useAppContext()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [response, setResponse] = useState<SearchResponse | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)

  const runSearch = useCallback(async (rawQuery: string, source: SearchSource): Promise<SearchResponse> => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    const text = String(rawQuery ?? '').trim()
    setQuery(text)
    setStatus('loading')
    setResponse(null)
    setErrorCode(null)
    track('search_submitted', { locale, market, queryLength: text.length, source })

    try {
      const result = await searchService.search(text, { locale, market }, { signal: current.signal })
      if (current.signal.aborted) return result
      setResponse(result)
      setStatus(result.results.length ? 'results' : 'empty')
      const url = new URL(location.href)
      if (text) url.searchParams.set('q', text)
      else url.searchParams.delete('q')
      history.replaceState(null, '', url)
      track('search_completed', { locale, market, resultCount: result.results.length, strategy: result.query.strategy })
      return result
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') throw error
      const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        ? error.code
        : 'unknown'
      if (controller.current === current) {
        setStatus('error')
        setErrorCode(code)
        track('search_failed', { locale, market, code })
      }
      throw error
    }
  }, [locale, market])

  const clearSearch = useCallback(() => {
    controller.current?.abort()
    controller.current = null
    setQuery('')
    setResponse(null)
    setErrorCode(null)
    setStatus('idle')
    const url = new URL(location.href)
    url.searchParams.delete('q')
    history.replaceState(null, '', url)
  }, [])

  const initialSearchStarted = useRef(false)
  useEffect(() => {
    if (initialSearchStarted.current) return
    initialSearchStarted.current = true
    const initialQuery = new URLSearchParams(location.search).get('q')
    if (initialQuery) void runSearch(initialQuery, 'url').catch(() => {})
  }, [runSearch])

  const value = useMemo(() => ({ query, status, response, errorCode, runSearch, clearSearch }), [query, status, response, errorCode, runSearch, clearSearch])
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearchContext(): SearchContextValue {
  const context = useContext(SearchContext)
  if (!context) throw new Error('useSearchContext must be used within SearchContainer')
  return context
}
