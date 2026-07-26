import { useCallback, useEffect, useState } from 'react'

import * as reviewRepo from '@/entities/review/repository'
import type { ReviewQueueItem } from '@/entities/review/types'

export function useReviewQueue() {
  const [dueCount, setDueCount] = useState(0)
  const [queue, setQueue] = useState<ReviewQueueItem[]>([])
  const [byDoc, setByDoc] = useState<{ documentId: string; fileName: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await reviewRepo.backfillMissingReviewStates()
      const items = await reviewRepo.listDueQueue()
      setQueue(items)
      setDueCount(items.length)

      const counts = new Map<string, { fileName: string; count: number }>()
      for (const item of items) {
        const cur = counts.get(item.documentId)
        if (cur) cur.count += 1
        else counts.set(item.documentId, { fileName: item.fileName, count: 1 })
      }
      setByDoc(
        [...counts.entries()].map(([documentId, v]) => ({
          documentId,
          fileName: v.fileName,
          count: v.count,
        })),
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  return { dueCount, queue, byDoc, loading, refresh }
}
