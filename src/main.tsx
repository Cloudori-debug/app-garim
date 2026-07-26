import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AppRouter } from '@/app/router'
import { ThemeProvider } from '@/app/ThemeProvider'
import { applyTheme, getStoredTheme } from '@/shared/lib/theme'
import './index.css'

applyTheme(getStoredTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  </StrictMode>,
)
