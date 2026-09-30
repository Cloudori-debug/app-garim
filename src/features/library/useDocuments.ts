import { useCallback, useEffect, useState } from 'react'
import { pdfjs } from 'react-pdf'

import * as documentRepo from '@/entities/document/repository'
import type { Document, PageLayout } from '@/entities/document/types'
import { HEAVY_PDF_BYTES } from '@/features/reader/pdfBudget'
import { PDFJS_DOC_OPTIONS } from '@/shared/lib/setupPdfWorker'
import '@/shared/lib/setupPdfWorker'

export function useDocuments(folderId: string | null) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!folderId) {
      setDocuments([])
      return
    }
    setLoading(true)
    try {
      setDocuments(await documentRepo.listDocumentsByFolder(folderId))
    } finally {
      setLoading(false)
    }
  }, [folderId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addPdf = useCallback(
    async (file: File, pageLayout: PageLayout = 'portrait') => {
      if (!folderId) throw new Error('폴더를 먼저 선택하세요.')
      const maxBytes = HEAVY_PDF_BYTES
      if (file.size > maxBytes) {
        const mb = (file.size / (1024 * 1024)).toFixed(0)
        const ok = window.confirm(
          `${file.name} (${mb}MB)는 용량이 커서 태블릿에서 느려질 수 있습니다. 계속할까요?`,
        )
        if (!ok) return
      }
      const data = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data, ...PDFJS_DOC_OPTIONS }).promise
      const pageCount = pdf.numPages
      await documentRepo.addDocument({ folderId, file, pageCount, pageLayout })
      await refresh()
    },
    [folderId, refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      await documentRepo.deleteDocument(id)
      await refresh()
    },
    [refresh],
  )

  const toggleFavorite = useCallback(
    async (id: string, isFavorite: boolean) => {
      await documentRepo.setDocumentFavorite(id, isFavorite)
      await refresh()
    },
    [refresh],
  )

  const move = useCallback(
    async (id: string, targetFolderId: string) => {
      await documentRepo.moveDocument(id, targetFolderId)
      await refresh()
    },
    [refresh],
  )

  const rename = useCallback(
    async (id: string, fileName: string) => {
      await documentRepo.renameDocument(id, fileName)
      await refresh()
    },
    [refresh],
  )

  return { documents, loading, refresh, addPdf, remove, toggleFavorite, move, rename }
}
