import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

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
      setMessage(`${fileName} (${backupRepo.formatBytes(byteSize)})`)
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
      '이 기기의 서재·가림·복습을 백업 내용으로 모두 바꿉니다. 계속할까요?',
    )
    if (!ok) return

    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const bundle = await backupRepo.parseBackupFile(file)
      await backupRepo.restoreBackupBundle(bundle)
      setMessage('가져오기 완료. 새로고침합니다…')
      window.setTimeout(() => window.location.reload(), 600)
    } catch (e) {
      setError(e instanceof Error ? e.message : '가져오기에 실패했습니다.')
      setBusy(false)
    }
  }

  return (
    <div className="h-full overflow-auto px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <h1 className="text-lg font-bold">더보기</h1>

      <section className="mt-8">
        <h2 className="text-xs font-medium text-[var(--muted)]">통계</h2>
        <Link
          to="/stats"
          className="mt-2 flex min-h-12 items-center justify-between rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)]"
        >
          복습·오답 현황
          <span className="text-xs font-normal text-[var(--muted)]">보기</span>
        </Link>
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-medium text-[var(--muted)]">테마</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {ids.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
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
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-medium text-[var(--muted)]">백업</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">PDF·가림·복습을 파일로 보관합니다.</p>
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

      <section className="mt-8">
        <h2 className="text-xs font-medium text-[var(--muted)]">홈 화면에 추가</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
          <li>
            <span className="text-[var(--ink)]">Safari</span>에서 공유 버튼
          </li>
          <li>
            <span className="text-[var(--ink)]">홈 화면에 추가</span>
          </li>
        </ol>
      </section>

      <p className="mt-10 text-center text-xs text-[var(--muted)]">
        암기노트 · 데이터는 이 기기에만 저장됩니다
      </p>
    </div>
  )
}
