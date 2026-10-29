import type { SearchResponse } from '@/Lib/search/type'

export type SearchStatus = 'idle' | 'loading' | 'results' | 'empty' | 'error'
export type SearchSource = 'form' | 'url' | 'suggestion' | 'retry' | 'webmcp'
export type SearchContextValue = {
  query: string
  status: SearchStatus
  response: SearchResponse | null
  errorCode: string | null
  runSearch: (query: string, source: SearchSource) => Promise<SearchResponse>
  clearSearch: () => void
}
