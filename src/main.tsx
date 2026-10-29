import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { AppContainer } from '@/Container/App'
import { HomeScene } from '@/Scene/Home'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppContainer><HomeScene /></AppContainer>
  </StrictMode>,
)
