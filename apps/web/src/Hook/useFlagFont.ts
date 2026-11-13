import { useEffect, useRef } from 'react'
import { polyfillCountryFlags } from '@/Lib/flags'

export function useFlagFont() {
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    polyfillCountryFlags()
  }, [])
}
