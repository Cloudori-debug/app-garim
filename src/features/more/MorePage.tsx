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
    <div className="h-full overflow-auto px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
                'inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
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
        <h2 className="text-sm font-semibold text-[var(--ink)]">아이패드에 설치</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>
            <strong className="text-[var(--ink)]">Safari</strong>로 이 사이트(HTTPS)를 엽니다.
          </li>
          <li>
            하단(또는 상단) <strong className="text-[var(--ink)]">공유</strong> 버튼을 탭합니다.
          </li>
          <li>
            <strong className="text-[var(--ink)]">홈 화면에 추가</strong> → 추가.
          </li>
        </ol>
        <p className="mt-3 text-xs">
          홈 화면 아이콘으로 열면 거의 전체 화면처럼 쓸 수 있습니다. PDF·가림 데이터는 이 기기에만
          저장됩니다.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--ink)]">암기노트</p>
        <p className="mt-1">v1.1 · 로컬 전용 · 로그인 없음 · PWA</p>
        <p className="mt-2">내 PDF를 가리고, 잊기 전에 다시 물어봅니다.</p>
      </section>
    </div>
  )
}
