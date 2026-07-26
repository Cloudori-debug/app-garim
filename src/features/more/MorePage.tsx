import { useRef, useState } from 'react'

import { useTheme } from '@/app/ThemeProvider'
import * as backupRepo from '@/entities/backup/repository'
import { Button } from '@/shared/ui/button'
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
  const importRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const exportBackup = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const { fileName, byteSize } = await backupRepo.downloadBackupFile()
      setMessage(`${fileName} 저장 (${backupRepo.formatBytes(byteSize)})`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '내보내기에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const importBackup = async (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (importRef.current) importRef.current.value = ''
    if (!file) return

    const ok = window.confirm(
      '이 기기의 서재·가림·복습 데이터를 백업 파일 내용으로 모두 바꿉니다. 계속할까요?',
    )
    if (!ok) return

    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const bundle = await backupRepo.parseBackupFile(file)
      await backupRepo.restoreBackupBundle(bundle)
      setMessage('백업을 가져왔습니다. 화면을 새로고침합니다…')
      window.setTimeout(() => window.location.reload(), 600)
    } catch (e) {
      setError(e instanceof Error ? e.message : '가져오기에 실패했습니다.')
      setBusy(false)
    }
  }

  return (
    <div className="h-full overflow-auto px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <h1 className="text-lg font-bold">더보기</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">테마 · 백업 · 설치</p>

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
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">백업</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          PDF·가림·복습 일정을 파일로 저장하거나 복원합니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => void exportBackup()}>
            내보내기
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => importRef.current?.click()}
          >
            가져오기
          </Button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void importBackup(e.target.files)}
          />
        </div>
        {message && <p className="mt-3 text-sm text-[var(--ink)]">{message}</p>}
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
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
        <p className="mt-1">v1.2 · 로컬 전용 · 로그인 없음 · PWA</p>
        <p className="mt-2">내 PDF를 가리고, 잊기 전에 다시 물어봅니다.</p>
      </section>
    </div>
  )
}
