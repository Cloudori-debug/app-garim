import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import { useTheme } from '@/app/ThemeProvider'
import * as backupRepo from '@/entities/backup/repository'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/cn'

/** 의견·문의 수신 메일 (출시용) */
const FEEDBACK_EMAIL = 'clowood.cy@gmail.com'

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
  const [feedback, setFeedback] = useState('')
  const [feedbackHint, setFeedbackHint] = useState<string | null>(null)

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

  const sendFeedback = () => {
    const text = feedback.trim()
    if (!text) {
      setFeedbackHint('내용을 입력해 주세요.')
      return
    }
    setFeedbackHint(null)
    const subject = encodeURIComponent('암기노트 의견')
    const body = encodeURIComponent(text)
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <div className="mx-auto h-full max-w-md overflow-auto px-5 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <h1 className="text-lg font-bold">더보기</h1>

      <div className="mt-5 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface)]">
        <Link
          to="/stats"
          className="flex min-h-12 items-center justify-between gap-3 px-4 text-sm font-semibold text-[var(--ink)]"
        >
          통계
          <span className="flex items-center gap-1 text-xs font-normal text-[var(--muted)]">
            복습·오답
            <ChevronRight className="h-4 w-4 opacity-50" />
          </span>
        </Link>

        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-xs font-medium text-[var(--muted)]">테마</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ids.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={cn(
                  'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                  theme === id
                    ? 'border-transparent bg-[var(--accent)] text-white'
                    : 'border-[var(--border-strong)] bg-[var(--bg)] text-[var(--ink)]',
                )}
              >
                <span
                  className="h-2 w-2 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                  style={{ background: ACCENT_DOT[id] }}
                />
                {labels[id]}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--ink)]">백업</p>
              <p className="text-xs text-[var(--muted)]">PDF·가림·복습 보관</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
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
            </div>
          </div>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void importBackup(e.target.files)}
          />
          {message && <p className="mt-2 text-xs text-[var(--ink)]">{message}</p>}
          {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
        </div>

        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--ink)]">의견 보내기</p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder="불편한 점이나 필요한 기능"
            className="mt-2 w-full resize-y rounded-lg border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
          />
          {feedbackHint && <p className="mt-1.5 text-xs text-[var(--danger)]">{feedbackHint}</p>}
          <Button size="sm" className="mt-2" onClick={sendFeedback}>
            메일로 보내기
          </Button>
        </div>

        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--ink)]">홈 화면에 추가</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Safari 공유 → 홈 화면에 추가
          </p>
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-[var(--muted)]">
        암기노트 · 데이터는 이 기기에만 저장됩니다
      </p>
    </div>
  )
}
