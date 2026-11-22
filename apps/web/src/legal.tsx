import { StrictMode } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { AppContainer } from '@/Container/App'
import { useFlagFont } from '@/Hook/useFlagFont'
import { Header } from '@/Component/Header'
import { Footer } from '@/Component/Footer'

// privacy.html and terms.html keep their text static; only the shared Header and Footer mount here,
// in one tree so a language or market change updates both.
function LegalLayout() {
  useFlagFont()
  return <>
    {createPortal(<Header />, document.getElementById('site-header')!)}
    {createPortal(<Footer />, document.getElementById('site-footer')!)}
  </>
}

createRoot(document.createElement('div')).render(
  <StrictMode>
    <AppContainer><LegalLayout /></AppContainer>
  </StrictMode>,
)
