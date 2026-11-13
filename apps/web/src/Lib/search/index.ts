import type { ApiSearchResponse } from './type'

export async function search(query: string, ctx: { locale: string; market: string }, { signal }: { signal?: AbortSignal } = {}): Promise<ApiSearchResponse> {
  const params = new URLSearchParams({ q: query, locale: ctx.locale, market: ctx.market })
  const response = await fetch(`/api/search?${params}`, { signal })
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { error?: string }
    throw Object.assign(new Error(error.error ?? 'search_failed'), { code: error.error ?? 'search_failed' })
  }
  return response.json() as Promise<ApiSearchResponse>
}

export const searchService = { search }
