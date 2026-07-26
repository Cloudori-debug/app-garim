import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  applyTheme,
  getStoredTheme,
  THEME_IDS,
  THEME_LABELS,
  type ThemeId,
} from '@/shared/lib/theme'

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (id: ThemeId) => void
  labels: typeof THEME_LABELS
  ids: typeof THEME_IDS
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id)
    applyTheme(id)
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, labels: THEME_LABELS, ids: THEME_IDS }),
    [theme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
