import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AppRouter } from '@/app/router'
import { ThemeProvider } from '@/app/ThemeProvider'
import { registerServiceWorker } from '@/shared/lib/registerServiceWorker'
import { applyTheme, getStoredTheme } from '@/shared/lib/theme'
import './index.css'

applyTheme(getStoredTheme())
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  </StrictMode>,
)
