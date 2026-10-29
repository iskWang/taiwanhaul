import { useEffect } from 'react'
import { useAppContext } from '@/Container/App'

export function useDocumentMeta() {
  const { locale, t } = useAppContext()
  useEffect(() => {
    document.documentElement.lang = locale
    document.title = t('meta.title')
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'))
  }, [locale, t])
}
