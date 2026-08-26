import { useState } from 'react'

import { seedSampleDocument } from '@/features/onboarding/seedSampleDocument'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/cn'

export function SampleStartButton({
  onSeeded,
  className,
}: {
  onSeeded: (documentId: string) => void
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      const { documentId } = await seedSampleDocument()
      onSeeded(documentId)
    } catch (e) {
      setError(e instanceof Error ? e.message : '샘플을 만들지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <Button type="button" disabled={busy} onClick={() => void start()}>
        {busy ? '샘플 만드는 중…' : '샘플 PDF로 시작'}
      </Button>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
    </div>
  )
}
