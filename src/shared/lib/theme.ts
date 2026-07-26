export const THEME_IDS = ['default', 'dark', 'rose', 'focus', 'paper'] as const
export type ThemeId = (typeof THEME_IDS)[number]

export const THEME_LABELS: Record<ThemeId, string> = {
  default: '기본',
  dark: '다크',
  rose: '로즈',
  focus: '포커스',
  paper: '페이퍼',
}

export const THEME_STORAGE_KEY = 'amgi-theme'

/** 예전 테마 id → 새 id */
const LEGACY_THEME_MAP: Record<string, ThemeId> = {
  teal: 'default',
  ink: 'focus',
  forest: 'paper',
  navy: 'focus',
  graphite: 'dark',
}

export function isThemeId(v: string | null | undefined): v is ThemeId {
  return !!v && (THEME_IDS as readonly string[]).includes(v)
}

export function getStoredTheme(): ThemeId {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeId(v)) return v
    if (v && LEGACY_THEME_MAP[v]) return LEGACY_THEME_MAP[v]
  } catch {
    /* ignore */
  }
  return 'default'
}

export function applyTheme(id: ThemeId): void {
  document.documentElement.setAttribute('data-theme', id)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}
