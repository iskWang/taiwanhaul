import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { AppContainer } from '@/Container/App'
import { SearchContainer } from '@/Container/Search'
import { ContactContainer } from '@/Container/Contact'
import { HomeScene } from '@/Scene/Home'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppContainer><SearchContainer><ContactContainer><HomeScene /></ContactContainer></SearchContainer></AppContainer>
  </StrictMode>,
)
