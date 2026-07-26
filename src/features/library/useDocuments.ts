import { useCallback, useEffect, useState } from 'react'
import { pdfjs } from 'react-pdf'

import * as documentRepo from '@/entities/document/repository'
import type { Document, PageLayout } from '@/entities/document/types'
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

  return { documents, loading, refresh, addPdf, remove, toggleFavorite, move }
}
