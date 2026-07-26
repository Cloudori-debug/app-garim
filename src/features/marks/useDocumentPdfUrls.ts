import { useEffect, useState } from 'react'

import * as documentRepo from '@/entities/document/repository'

/** documentId → object URL. 언마운트 시 revoke. */
export function useDocumentPdfUrls(documentIds: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const key = [...new Set(documentIds)].sort().join(',')

  useEffect(() => {
    let cancelled = false
    const created: string[] = []

    async function load() {
      const ids = key ? key.split(',') : []
      const next: Record<string, string> = {}
      for (const id of ids) {
        const doc = await documentRepo.getDocument(id)
        if (!doc) continue
        const blobRow = await documentRepo.getPdfBlob(doc.blobId)
        if (!blobRow) continue
        const url = URL.createObjectURL(blobRow.blob)
        created.push(url)
        next[id] = url
      }
      if (!cancelled) setUrls(next)
    }

    void load()
    return () => {
      cancelled = true
      for (const url of created) URL.revokeObjectURL(url)
    }
  }, [key])

  return urls
}
