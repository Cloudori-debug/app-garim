import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import { useTheme } from '@/app/ThemeProvider'
import * as backupRepo from '@/entities/backup/repository'
import { APP_VERSION, PRIVACY_URL } from '@/shared/lib/appMeta'
import { isNativeApp } from '@/shared/lib/platform'
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

const cardClass =
  'rounded-xl border border-[var(--border-strong)] bg-[var(--surface)]'

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
    const subject = encodeURIComponent('가림 암기노트 의견')
    const body = encodeURIComponent(text)
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <div className="h-full overflow-auto px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <h1 className="text-lg font-bold">더보기</h1>

      <div className="mt-6 space-y-5">
        <section>
          <h2 className="text-xs font-medium text-[var(--muted)]">통계</h2>
          <Link
            to="/stats"
            className={cn(
              cardClass,
              'mt-2 flex min-h-12 items-center justify-between gap-3 px-4 text-sm font-semibold text-[var(--ink)]',
            )}
          >
            복습·오답 현황
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)] opacity-60" />
          </Link>
        </section>

        <section>
          <h2 className="text-xs font-medium text-[var(--muted)]">테마</h2>
          <div className={cn(cardClass, 'mt-2 px-4 py-3')}>
            <div className="flex flex-wrap gap-2">
              {ids.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
                    theme === id
                      ? 'border-transparent bg-[var(--accent)] text-white'
                      : 'border-[var(--border-strong)] bg-[var(--bg)] text-[var(--ink)]',
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
          </div>
        </section>

        <section>
          <h2 className="text-xs font-medium text-[var(--muted)]">백업</h2>
          <div className={cn(cardClass, 'mt-2 px-4 py-3')}>
            <p className="text-sm text-[var(--muted)]">PDF·가림·복습을 파일로 보관합니다.</p>
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
          </div>
        </section>

        <section>
          <h2 className="text-xs font-medium text-[var(--muted)]">의견 보내기</h2>
          <div className={cn(cardClass, 'mt-2 px-4 py-3')}>
            <p className="text-sm text-[var(--muted)]">
              불편한 점이나 필요한 기능을 알려 주세요.
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="예: 복습할 때 … 가 불편해요"
              className="mt-3 w-full resize-y rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
            />
            {feedbackHint && <p className="mt-2 text-sm text-[var(--danger)]">{feedbackHint}</p>}
            <Button size="sm" className="mt-3" onClick={sendFeedback}>
              메일로 보내기
            </Button>
          </div>
        </section>

        {!isNativeApp() && (
          <section>
            <h2 className="text-xs font-medium text-[var(--muted)]">홈 화면에 추가</h2>
            <div className={cn(cardClass, 'mt-2 px-4 py-3')}>
              <p className="text-sm text-[var(--ink)]">
                Safari로{' '}
                <a
                  href="https://app-garim.pages.dev"
                  className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  app-garim.pages.dev
                </a>
                를 연 뒤:
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
                <li>
                  <span className="text-[var(--ink)]">공유</span> 버튼
                </li>
                <li>
                  <span className="text-[var(--ink)]">홈 화면에 추가</span>
                </li>
              </ol>
              <p className="mt-2 text-xs text-[var(--muted)]">
                홈 화면 아이콘으로 전체 화면처럼 실행됩니다. PDF·가림은 이 기기에만 저장됩니다.
              </p>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-medium text-[var(--muted)]">앱 정보</h2>
          <div className={cn(cardClass, 'mt-2 px-4 py-3')}>
            <p className="text-sm text-[var(--ink)]">
              가림 암기노트 {APP_VERSION}
              {isNativeApp() ? ' · 스토어 앱' : ''}
            </p>
            <a
              href={PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
            >
              개인정보처리방침
            </a>
          </div>
        </section>
      </div>

      <p className="mt-8 text-center text-xs text-[var(--muted)]">
        가림 암기노트 · 데이터는 이 기기에만 저장됩니다
      </p>
    </div>
  )
}
