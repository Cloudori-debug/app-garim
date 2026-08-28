import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import { useReviewQueue, type DocCount, type SubjectGroup } from '@/features/today/useReviewQueue'
import { SampleStartButton } from '@/features/onboarding/SampleStartButton'
import { cn } from '@/shared/lib/cn'

type Mode = 'subject' | null

export function TodayPage() {
  const navigate = useNavigate()
  const { dueCount, practiceCount, subjects, loading } = useReviewQueue()
  const [mode, setMode] = useState<Mode>(null)
  const [subjectId, setSubjectId] = useState<string | null>(null)

  const subjectsRef = useRef<HTMLElement>(null)
  const pdfsRef = useRef<HTMLElement>(null)

  const selectedSubject = subjects.find((s) => s.folderId === subjectId) ?? null
  const flatPdfs = subjects.length === 1 ? subjects[0]!.docs : null
  const showSubjectStep = subjects.length > 1
  const pdfList: DocCount[] = flatPdfs ?? selectedSubject?.docs ?? []

  useEffect(() => {
    if (mode !== 'subject') return
    const t = window.setTimeout(() => {
      subjectsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    return () => window.clearTimeout(t)
  }, [mode])

  useEffect(() => {
    if (!subjectId && !flatPdfs) return
    if (mode !== 'subject') return
    const t = window.setTimeout(() => {
      pdfsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    return () => window.clearTimeout(t)
  }, [subjectId, flatPdfs, mode])

  const openSubject = () => {
    if (subjects.length === 0) return
    setMode('subject')
    setSubjectId(subjects.length === 1 ? subjects[0]!.folderId : null)
  }

  const pickSubject = (s: SubjectGroup) => {
    setSubjectId(s.folderId)
  }

  const pickDoc = (d: DocCount) => {
    if (d.practiceCount <= 0) return
    navigate(`/review?mode=practice&doc=${encodeURIComponent(d.documentId)}`)
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      <header className="shrink-0 px-5 pt-4 pb-2 md:px-8">
        <h1 className="text-lg font-bold tracking-tight md:text-xl">가림 암기노트</h1>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-8 pt-6 md:px-8">
        <div className="text-center">
          <p className="text-xs text-[var(--muted)]">오늘 복습</p>
          <p className="mt-1 text-6xl font-bold tabular-nums tracking-tight text-[var(--ink)]">
            {loading ? '—' : dueCount}
          </p>
        </div>

        <div className="mt-8 grid gap-2">
          <ModeButton
            label="오늘 복습"
            disabled={dueCount <= 0}
            onClick={() => navigate('/review')}
          />
          <ModeButton
            label="랜덤 연습"
            meta={practiceCount > 0 ? `${practiceCount}` : undefined}
            disabled={practiceCount <= 0}
            onClick={() => navigate('/review?mode=practice')}
          />
          <ModeButton
            label="과목"
            disabled={subjects.length === 0}
            active={mode === 'subject'}
            onClick={openSubject}
          />
        </div>

        {mode === 'subject' && subjects.length > 0 && (
          <>
            {showSubjectStep && (
              <section ref={subjectsRef} className="mt-8 scroll-mt-4">
                <h2 className="mb-2 text-xs font-medium text-[var(--muted)]">과목</h2>
                <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border-strong)] bg-[var(--surface)]">
                  {subjects.map((s) => (
                    <li key={s.folderId}>
                      <button
                        type="button"
                        onClick={() => pickSubject(s)}
                        className={cn(
                          'flex w-full min-h-12 items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors',
                          subjectId === s.folderId
                            ? 'bg-[var(--accent-soft)]/50 text-[var(--ink)]'
                            : 'text-[var(--ink)] hover:bg-[var(--bg)]',
                        )}
                      >
                        <span className="min-w-0 truncate font-medium">{s.name}</span>
                        <span className="flex shrink-0 items-center gap-2 text-[var(--muted)]">
                          <span className="tabular-nums">{s.practiceCount}</span>
                          <ChevronRight className="h-4 w-4 opacity-50" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {pdfList.length > 0 && (flatPdfs || selectedSubject) && (
              <section ref={pdfsRef} className="mt-6 scroll-mt-4">
                <h2 className="mb-2 text-xs font-medium text-[var(--muted)]">
                  {selectedSubject && showSubjectStep ? selectedSubject.name : 'PDF'}
                </h2>
                <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border-strong)] bg-[var(--surface)]">
                  {pdfList.map((d) => (
                    <li key={d.documentId}>
                      <button
                        type="button"
                        onClick={() => pickDoc(d)}
                        className="flex w-full min-h-12 items-center justify-between gap-3 px-4 py-3 text-left text-sm text-[var(--ink)] transition-colors hover:bg-[var(--bg)]"
                      >
                        <span className="min-w-0 truncate font-medium">
                          {d.fileName.replace(/\.pdf$/i, '')}
                        </span>
                        <span className="shrink-0 tabular-nums text-[var(--muted)]">
                          {d.practiceCount}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {!loading && dueCount === 0 && practiceCount === 0 && (
          <div className="mt-10 flex flex-col items-center gap-4">
            <p className="text-center text-sm text-[var(--muted)]">
              아직 오늘 복습할 가림이 없어요.
              <br />
              샘플로 바로 체험하거나, 서재에 PDF를 넣고 가림을 그려 보세요.
            </p>
            <SampleStartButton onSeeded={() => navigate('/review')} />
          </div>
        )}
      </main>
    </div>
  )
}

function ModeButton({
  label,
  meta,
  disabled,
  active,
  onClick,
}: {
  label: string
  meta?: string
  disabled?: boolean
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-12 w-full items-center justify-between rounded-xl border px-4 text-sm font-semibold transition-colors',
        disabled && 'cursor-not-allowed opacity-35',
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40 text-[var(--ink)]'
          : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)]',
      )}
    >
      <span>{label}</span>
      {meta != null && <span className="tabular-nums font-medium text-[var(--muted)]">{meta}</span>}
    </button>
  )
}
