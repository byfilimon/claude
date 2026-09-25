import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { RangefinderProvider } from './ble/RangefinderContext'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RangefinderProvider>
      <App />
    </RangefinderProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {})
}
