import { useDocumentMeta, useFlagFont, useWebMcp } from '@/Hook'
import { HomePresentation } from '@/Presentation/Home'

export function HomeScene() {
  useDocumentMeta()
  useFlagFont()
  useWebMcp()
  return <HomePresentation />
}
