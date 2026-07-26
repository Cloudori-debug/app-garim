import { useTheme } from '@/app/ThemeProvider'
import { cn } from '@/shared/lib/cn'

const ACCENT_DOT: Record<string, string> = {
  default: '#0F766E',
  dark: '#2DD4BF',
  rose: '#C45C7A',
  focus: '#1E3A5F',
  paper: '#6B7F5A',
}

const THEME_HINT: Record<string, string> = {
  default: '기본 틸 · 깔끔한 학습 UI',
  dark: '거의 검정 · OLED 절전·잔상 완화',
  rose: '더스티 로즈 · 부드럽고 낮은 대비',
  focus: '딥 네이비 · 선명한 대비·집중',
  paper: '웜 크림·세이지 · 장시간에도 덜 자극적',
}

export function MorePage() {
  const { theme, setTheme, ids, labels } = useTheme()

  return (
    <div className="h-full overflow-auto px-5 py-6">
      <h1 className="text-lg font-bold">더보기</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">테마와 앱 정보</p>

      <section className="mt-8">
        <h2 className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">색 테마</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {ids.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              title={THEME_HINT[id]}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                theme === id
                  ? 'border-transparent bg-[var(--accent)] text-white'
                  : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)]',
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                style={{ background: ACCENT_DOT[id] }}
              />
              {labels[id]}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">{THEME_HINT[theme]}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">선택은 이 기기에 저장됩니다.</p>
      </section>

      <section className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--ink)]">암기노트</p>
        <p className="mt-1">v1.1 · 로컬 전용 · 로그인 없음</p>
        <p className="mt-2">내 PDF를 가리고, 잊기 전에 다시 물어봅니다.</p>
      </section>
    </div>
  )
}
