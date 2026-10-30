import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useAppContext } from '@/Container/App'
import { track } from '@/Lib/analytics'
import type { ContactContextValue } from './type'

type State = { isOpen: boolean; openCount: number; prefill: ContactContextValue['prefill'] }

const ContactContext = createContext<ContactContextValue | null>(null)

export function ContactContainer({ children }: { children: ReactNode }) {
  const { locale } = useAppContext()
  const [state, setState] = useState<State>({ isOpen: false, openCount: 0, prefill: {} })
  const open = useCallback((topic?: string, message?: string) => {
    setState((prev) => ({ isOpen: true, openCount: prev.openCount + 1, prefill: { topic, message } }))
    track('contact_opened', { locale })
  }, [locale])
  const close = useCallback(() => {
    setState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev))
  }, [])
  const value = useMemo(() => ({ ...state, open, close }), [state, open, close])
  return <ContactContext.Provider value={value}>{children}</ContactContext.Provider>
}

export const useContactContext = (): ContactContextValue => {
  const context = useContext(ContactContext)
  if (!context) throw new Error('useContactContext must be used within ContactContainer')
  return context
}
