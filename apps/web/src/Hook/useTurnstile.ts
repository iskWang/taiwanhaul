import { useCallback, useRef, useState } from 'react'
import { TURNSTILE_SITE_KEY } from '@/Lib/config'

type TurnstileApi = {
  render: (slot: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId: string) => void
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

let turnstileLoad: Promise<TurnstileApi | null> | null = null

/** Load the Turnstile script at most once per page, however many widgets use it. */
function loadTurnstile(): Promise<TurnstileApi | null> {
  if (turnstileLoad) return turnstileLoad
  turnstileLoad = new Promise((resolve) => {
    if (window.turnstile) return resolve(window.turnstile)
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => resolve(window.turnstile ?? null)
    script.onerror = () => resolve(null) // blocked/failed: the caller shows the captcha error + fallback link.
    document.head.appendChild(script)
  })
  return turnstileLoad
}

/**
 * Turnstile widget lifecycle for one slot element.
 * - the script loads lazily, on the first `ensureWidget()` call only;
 * - `token` is '' until the widget passes, and is cleared again on expired/error;
 * - `reset()` drops the single-use token and asks the widget for a fresh one.
 */
export function useTurnstile(locale: string) {
  const slotRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const localeRef = useRef(locale)
  localeRef.current = locale
  const [token, setToken] = useState('')

  /** Render the widget into the slot once. Resolves false when the script is blocked/failed. */
  const ensureWidget = useCallback(async (): Promise<boolean> => {
    const slot = slotRef.current
    if (widgetId.current !== null || !slot) return true
    const turnstile = await loadTurnstile()
    if (widgetId.current !== null) return true
    if (!turnstile) return false
    widgetId.current = turnstile.render(slot, {
      sitekey: TURNSTILE_SITE_KEY,
      language: localeRef.current,
      callback: (next = '') => setToken(next),
      'expired-callback': () => setToken(''),
      'error-callback': () => setToken(''),
    })
    return true
  }, [])

  const reset = useCallback(() => {
    setToken('')
    if (widgetId.current !== null) window.turnstile?.reset(widgetId.current)
  }, [])

  return { slotRef, token, ensureWidget, reset }
}
