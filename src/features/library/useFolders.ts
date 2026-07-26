import { useCallback, useEffect, useState } from 'react'

import * as folderRepo from '@/entities/folder/repository'
import type { Folder } from '@/entities/folder/types'

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setFolders(await folderRepo.listFolders())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '폴더를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(
    async (name: string, parentId: string | null = null) => {
      try {
        await folderRepo.createFolder(name, parentId)
        await refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : '폴더 생성 실패')
        throw e
      }
    },
    [refresh],
  )

  const rename = useCallback(
    async (id: string, name: string) => {
      await folderRepo.renameFolder(id, name)
      await refresh()
    },
    [refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      await folderRepo.deleteFolder(id)
      await refresh()
    },
    [refresh],
  )

  const move = useCallback(
    async (id: string, newParentId: string | null) => {
      try {
        await folderRepo.moveFolder(id, newParentId)
        await refresh()
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : '폴더 이동 실패')
        throw e
      }
    },
    [refresh],
  )

  const commitDraft = useCallback(
    async (baseline: Folder[], draft: Folder[]) => {
      try {
        await folderRepo.commitFolderDraft(baseline, draft)
        await refresh()
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : '폴더 변경 저장 실패')
        throw e
      }
    },
    [refresh],
  )

  return { folders, loading, error, refresh, create, rename, remove, move, commitDraft }
}
