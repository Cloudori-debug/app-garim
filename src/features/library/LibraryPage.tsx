import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  ChevronRight,
  FilePlus2,
  FolderInput,
  FolderPlus,
  GripVertical,
  Pencil,
  Plus,
  RectangleHorizontal,
  Star,
  Trash2,
  X,
} from 'lucide-react'

import { useFavorites } from '@/features/favorites/useFavorites'
import { SampleStartButton } from '@/features/onboarding/SampleStartButton'
import {
  isAbortError,
  prepareLandscapeSplitPreview,
  splitDualPagePdf,
  type SplitPreview,
  type SplitProgress,
} from '@/features/library/splitDualPagePdf'
import { useDocuments } from '@/features/library/useDocuments'
import { useFolders } from '@/features/library/useFolders'
import * as documentRepo from '@/entities/document/repository'
import type { Document } from '@/entities/document/types'
import type { PageLayout } from '@/entities/document/types'
import type { Folder } from '@/entities/folder/types'
import { createId, nowIso } from '@/shared/lib/id'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { SegmentedGroup } from '@/shared/ui/tool-cluster'
import { cn } from '@/shared/lib/cn'

type DropTarget = { kind: 'root' } | { kind: 'nest'; folderId: string } | null

type FolderDrag = {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
}

function buildTree(folders: Folder[]) {
  const roots = folders.filter((f) => f.parentId === null)
  const childrenOf = (id: string) => folders.filter((f) => f.parentId === id)
  return { roots, childrenOf }
}

function canNestUnder(draggedId: string, targetId: string, allFolders: Folder[]): boolean {
  if (draggedId === targetId) return false
  const dragged = allFolders.find((f) => f.id === draggedId)
  const target = allFolders.find((f) => f.id === targetId)
  if (!dragged || !target) return false
  if (target.parentId !== null) return false
  if (dragged.parentId === target.id) return false
  const hasChildren = allFolders.some((f) => f.parentId === dragged.id)
  if (hasChildren) return false
  return true
}

function resolveDropTarget(
  clientX: number,
  clientY: number,
  draggedId: string,
  allFolders: Folder[],
): DropTarget {
  const el = document.elementFromPoint(clientX, clientY)
  if (!el) return null
  const nest = el.closest('[data-folder-drop="nest"]') as HTMLElement | null
  if (nest) {
    const folderId = nest.dataset.folderId
    if (folderId && canNestUnder(draggedId, folderId, allFolders)) {
      return { kind: 'nest', folderId }
    }
  }
  const root = el.closest('[data-folder-drop="root"]')
  if (root) return { kind: 'root' }
  return null
}

export function LibraryPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [draftFolders, setDraftFolders] = useState<Folder[] | null>(null)
  const [baselineFolders, setBaselineFolders] = useState<Folder[] | null>(null)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])
  const [editDirty, setEditDirty] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [selectionAtEditStart, setSelectionAtEditStart] = useState<string | null>(null)
  const [drag, setDrag] = useState<FolderDrag | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [busy, setBusy] = useState(false)
  const [landscapePreview, setLandscapePreview] = useState<SplitPreview | null>(null)
  const [landscapePreparing, setLandscapePreparing] = useState(false)
  const [landscapeProgress, setLandscapeProgress] = useState<SplitProgress | null>(null)
  const [landscapeError, setLandscapeError] = useState<string | null>(null)
  const [libraryIsEmpty, setLibraryIsEmpty] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const landscapeFileRef = useRef<HTMLInputElement>(null)
  const createInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<FolderDrag | null>(null)
  const grabOffset = useRef({ x: 0, y: 0 })
  const foldersRef = useRef<Folder[]>([])
  const landscapeAbortRef = useRef<AbortController | null>(null)
  const landscapeBusy = landscapePreparing || landscapeProgress !== null

  const { folders, error, create, commitDraft, refresh } = useFolders()
  const {
    documents,
    addPdf,
    remove: removeDoc,
    toggleFavorite,
    move,
    rename,
    refresh: refreshDocs,
  } = useDocuments(selectedFolderId)
  const favorites = useFavorites()

  const pendingDeleteSet = useMemo(() => new Set(pendingDeleteIds), [pendingDeleteIds])
  const activeFolders = editMode && draftFolders ? draftFolders : folders
  const visibleFolders = useMemo(
    () => activeFolders.filter((f) => !pendingDeleteSet.has(f.id)),
    [activeFolders, pendingDeleteSet],
  )
  const { roots, childrenOf } = useMemo(() => buildTree(visibleFolders), [visibleFolders])
  foldersRef.current = visibleFolders

  useEffect(() => {
    if (!editMode) {
      setDrag(null)
      setDropTarget(null)
      dragRef.current = null
    }
  }, [editMode])

  useEffect(() => {
    if (!createOpen) return
    const t = window.setTimeout(() => createInputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [createOpen])

  /** 첫 방문: 기본 폴더가 있으면 자동 선택 → PDF 추가 가능 */
  useEffect(() => {
    if (selectedFolderId) return
    if (folders.length === 0) return
    const root = folders.find((f) => f.parentId === null) ?? folders[0]
    if (root) setSelectedFolderId(root.id)
  }, [folders, selectedFolderId])

  useEffect(() => {
    void documentRepo.countDocuments().then((n) => setLibraryIsEmpty(n === 0))
  }, [documents])

  const leaveEditModeClean = () => {
    setEditMode(false)
    setDraftFolders(null)
    setBaselineFolders(null)
    setPendingDeleteIds([])
    setEditDirty(false)
    setExitConfirmOpen(false)
    setSelectionAtEditStart(null)
    setDrag(null)
    setDropTarget(null)
  }

  const enterEditMode = () => {
    const snap = folders.map((f) => ({ ...f }))
    setBaselineFolders(snap)
    setDraftFolders(snap.map((f) => ({ ...f })))
    setPendingDeleteIds([])
    setEditDirty(false)
    setSelectionAtEditStart(selectedFolderId)
    setEditMode(true)
    setExitConfirmOpen(false)
  }

  const requestExitEdit = () => {
    if (drag) return
    if (!editDirty) {
      leaveEditModeClean()
      return
    }
    setExitConfirmOpen(true)
  }

  const saveAndExit = async () => {
    if (!baselineFolders || !draftFolders) {
      leaveEditModeClean()
      return
    }
    setBusy(true)
    try {
      // 삭제 예정은 초안에서 제외 → DB 반영 시 실제 삭제
      const toSave = draftFolders.filter((f) => !pendingDeleteSet.has(f.id))
      await commitDraft(baselineFolders, toSave)
      if (selectedFolderId && !toSave.some((f) => f.id === selectedFolderId)) {
        setSelectedFolderId(null)
      }
      leaveEditModeClean()
    } finally {
      setBusy(false)
    }
  }

  const discardAndExit = () => {
    // DB는 손대지 않음 → 삭제·이름변경·이동 모두 편집 시작 상태로 복구
    const restoreId = selectionAtEditStart
    leaveEditModeClean()
    if (restoreId) setSelectedFolderId(restoreId)
    void refresh()
  }

  const patchDraft = (updater: (prev: Folder[]) => Folder[]) => {
    setDraftFolders((prev) => (prev ? updater(prev) : prev))
    setEditDirty(true)
  }

  const draftRename = async (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    patchDraft((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: trimmed, updatedAt: nowIso() } : f)),
    )
  }

  /** 삭제는 DB가 아니라 초안에서만 숨김 — 저장 시에만 반영, 저장 안 하면 복구 */
  const draftRemove = async (id: string) => {
    const list = draftFolders ?? []
    const removeIds: string[] = []
    const walk = (fid: string) => {
      removeIds.push(fid)
      for (const child of list.filter((f) => f.parentId === fid)) walk(child.id)
    }
    walk(id)
    setPendingDeleteIds((prev) => [...new Set([...prev, ...removeIds])])
    setEditDirty(true)
    if (selectedFolderId && removeIds.includes(selectedFolderId)) {
      setSelectedFolderId(null)
    }
  }

  const draftAddChild = async (parentId: string, name: string) => {
    patchDraft((prev) => {
      let depth = 0
      let cur: string | null = parentId
      while (cur) {
        depth += 1
        cur = prev.find((f) => f.id === cur)?.parentId ?? null
      }
      if (depth >= 2) return prev
      const sameParent = prev.filter((f) => f.parentId === parentId)
      const maxOrder = sameParent.reduce((m, f) => Math.max(m, f.sortOrder), 0)
      const now = nowIso()
      return [
        ...prev,
        {
          id: createId(),
          parentId,
          name: name.trim() || '새 폴더',
          sortOrder: maxOrder + 1,
          createdAt: now,
          updatedAt: now,
        },
      ]
    })
  }

  const draftMove = async (id: string, newParentId: string | null) => {
    const list = foldersRef.current
    const folder = list.find((f) => f.id === id)
    if (!folder || folder.parentId === newParentId) return
    if (newParentId && !canNestUnder(id, newParentId, list)) return
    patchDraft((prev) => {
      const sameParent = prev.filter((f) => f.parentId === newParentId && f.id !== id)
      const sortOrder = sameParent.reduce((m, f) => Math.max(m, f.sortOrder), 0) + 1
      return prev.map((f) =>
        f.id === id ? { ...f, parentId: newParentId, sortOrder, updatedAt: nowIso() } : f,
      )
    })
  }

  const endDrag = async (clientX: number, clientY: number) => {
    const current = dragRef.current
    dragRef.current = null
    setDrag(null)
    if (!current) {
      setDropTarget(null)
      return
    }
    const target = resolveDropTarget(clientX, clientY, current.id, foldersRef.current)
    setDropTarget(null)
    if (target?.kind === 'root') {
      await draftMove(current.id, null)
    } else if (target?.kind === 'nest') {
      await draftMove(current.id, target.folderId)
    }
  }

  const beginFolderDrag = (
    folder: Folder,
    e: React.PointerEvent,
    rowEl: HTMLElement | null,
  ) => {
    if (!editMode) return
    e.preventDefault()
    e.stopPropagation()
    const rect = rowEl?.getBoundingClientRect()
    const w = rect?.width ?? 200
    const h = rect?.height ?? 36
    grabOffset.current = {
      x: e.clientX - (rect?.left ?? e.clientX),
      y: e.clientY - (rect?.top ?? e.clientY),
    }
    const next: FolderDrag = {
      id: folder.id,
      name: folder.name,
      x: e.clientX - grabOffset.current.x,
      y: e.clientY - grabOffset.current.y,
      w,
      h,
    }
    dragRef.current = next
    setDrag(next)
    setDropTarget(null)

    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return
      const updated: FolderDrag = {
        ...dragRef.current,
        x: ev.clientX - grabOffset.current.x,
        y: ev.clientY - grabOffset.current.y,
      }
      dragRef.current = updated
      setDrag(updated)
      setDropTarget(resolveDropTarget(ev.clientX, ev.clientY, updated.id, foldersRef.current))
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      void endDrag(ev.clientX, ev.clientY)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const handleCreateFolder = async () => {
    const name = newFolderName.trim() || '새 폴더'
    setBusy(true)
    try {
      if (editMode) {
        patchDraft((prev) => {
          const sameParent = prev.filter((f) => f.parentId === null)
          const maxOrder = sameParent.reduce((m, f) => Math.max(m, f.sortOrder), 0)
          const now = nowIso()
          return [
            ...prev,
            {
              id: createId(),
              parentId: null,
              name,
              sortOrder: maxOrder + 1,
              createdAt: now,
              updatedAt: now,
            },
          ]
        })
      } else {
        await create(name, null)
      }
      setNewFolderName('')
      setCreateOpen(false)
    } catch {
      // useFolders.error에 메시지 표시
    } finally {
      setBusy(false)
    }
  }

  const resetLandscapeInput = () => {
    if (landscapeFileRef.current) landscapeFileRef.current.value = ''
  }

  const cancelLandscapeJob = () => {
    landscapeAbortRef.current?.abort()
    landscapeAbortRef.current = null
    setLandscapePreparing(false)
    setLandscapePreview(null)
    setLandscapeProgress(null)
    setLandscapeError(null)
    resetLandscapeInput()
  }

  const handleAddPdf = async (fileList: FileList | null, pageLayout: PageLayout = 'portrait') => {
    if (!fileList?.length || !selectedFolderId || landscapeBusy) return
    for (const file of Array.from(fileList)) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) continue
      await addPdf(file, pageLayout)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  /** 가로 PDF: 미리보기 → 확인 → 좌/우 분할 저장 */
  const handlePickLandscapePdf = async (fileList: FileList | null) => {
    if (!fileList?.length || !selectedFolderId || landscapeBusy) {
      resetLandscapeInput()
      return
    }
    const file = fileList[0]
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      resetLandscapeInput()
      return
    }

    const ac = new AbortController()
    landscapeAbortRef.current = ac
    setLandscapeError(null)
    setLandscapePreview(null)
    setLandscapePreparing(true)
    try {
      const preview = await prepareLandscapeSplitPreview(file, ac.signal)
      if (ac.signal.aborted) return
      setLandscapePreview(preview)
    } catch (e) {
      if (isAbortError(e)) return
      setLandscapeError(e instanceof Error ? e.message : '미리보기를 만들지 못했습니다.')
      resetLandscapeInput()
    } finally {
      setLandscapePreparing(false)
      if (landscapeAbortRef.current === ac) landscapeAbortRef.current = null
    }
  }

  const confirmLandscapeSplit = async () => {
    if (!landscapePreview || !selectedFolderId || landscapeBusy) return
    const { file } = landscapePreview
    setLandscapePreview(null)
    setLandscapeError(null)

    const ac = new AbortController()
    landscapeAbortRef.current = ac
    setLandscapeProgress({
      phase: 'prepare',
      sourcePage: 0,
      sourcePageCount: 0,
      outputPages: 0,
      ratio: 0,
      message: '작업 시작…',
    })

    try {
      const { file: splitFile } = await splitDualPagePdf(file, {
        signal: ac.signal,
        onProgress: setLandscapeProgress,
      })
      if (ac.signal.aborted) return
      await addPdf(splitFile, 'portrait')
    } catch (e) {
      if (isAbortError(e)) return
      setLandscapeError(e instanceof Error ? e.message : '분할에 실패했습니다.')
    } finally {
      setLandscapeProgress(null)
      if (landscapeAbortRef.current === ac) landscapeAbortRef.current = null
      resetLandscapeInput()
    }
  }

  const dropHintLabel =
    dropTarget?.kind === 'root'
      ? '최상위 계층으로 이동'
      : dropTarget?.kind === 'nest'
        ? `"${folders.find((f) => f.id === dropTarget.folderId)?.name ?? ''}" 안으로`
        : null

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-4 overflow-auto p-4 md:p-6">
      <header>
        <h1 className="text-lg font-bold tracking-tight">서재</h1>
      </header>

      {error && (
        <p className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[280px_1fr]">
          <aside className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <SegmentedGroup size="md" className="w-full">
              <Button
                size="sm"
                variant="ghost"
                className="flex-1"
                onClick={() => setCreateOpen(true)}
              >
                <FolderPlus className="h-4 w-4" />
                새폴더
              </Button>
              <Button
                size="sm"
                variant={editMode ? 'default' : 'ghost'}
                className="flex-1"
                title={editMode ? '편집 종료' : '폴더 편집 모드'}
                onClick={() => {
                  if (editMode) requestExitEdit()
                  else enterEditMode()
                }}
              >
                <Pencil className="h-4 w-4" />
                편집
              </Button>
            </SegmentedGroup>
            {editMode && (
              <p className="px-1 text-[11px] text-[var(--muted)]">
                왼쪽 ⋮⋮ 드래그 · 종료 시 저장하지 않으면 변경이 취소됩니다
                {editDirty ? ' · 변경됨' : ''}
              </p>
            )}

            <div className="min-h-0 flex-1 space-y-3 overflow-auto">
              <SidebarFavorites
                documents={favorites.documents}
                loading={favorites.loading}
              />

              <div>
                <p className="mb-1.5 px-1 text-[11px] font-medium text-[var(--muted)]">
                  폴더
                </p>
                {roots.length === 0 && (
                  <p className="px-2 py-4 text-center text-sm text-[var(--muted)]">
                    새폴더로 폴더를 만드세요
                  </p>
                )}

                <ul className="space-y-0.5">
                  {editMode && (
                    <RootDropBar active={dropTarget?.kind === 'root'} visible={Boolean(drag)} />
                  )}

                  {roots.map((folder, index) => (
                    <li key={folder.id}>
                      <FolderItem
                        folder={folder}
                        children={childrenOf(folder.id)}
                        allFolders={visibleFolders}
                        selectedId={selectedFolderId}
                        editMode={editMode}
                        draggingId={drag?.id ?? null}
                        dropTarget={dropTarget}
                        onSelect={setSelectedFolderId}
                        onRename={draftRename}
                        onDelete={draftRemove}
                        onGripPointerDown={beginFolderDrag}
                        onAddChild={draftAddChild}
                      />
                      {editMode && index < roots.length - 1 && (
                        <RootDropBar active={dropTarget?.kind === 'root'} visible={Boolean(drag)} />
                      )}
                    </li>
                  ))}

                  {editMode && roots.length > 0 && (
                    <RootDropBar active={dropTarget?.kind === 'root'} visible={Boolean(drag)} />
                  )}
                </ul>
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
              <h2 className="text-sm font-medium text-[var(--ink)]">
                {selectedFolderId
                  ? (folders.find((f) => f.id === selectedFolderId)?.name ?? '폴더')
                  : '폴더를 선택하세요'}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => void handleAddPdf(e.target.files, 'portrait')}
                />
                <input
                  ref={landscapeFileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => void handlePickLandscapePdf(e.target.files)}
                />
                <Button
                  size="sm"
                  disabled={!selectedFolderId || landscapeBusy}
                  onClick={() => fileRef.current?.click()}
                >
                  <FilePlus2 className="h-4 w-4" />
                  PDF 추가
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!selectedFolderId || landscapeBusy}
                  title="가로 양면 PDF를 좌·우로 나눠 세로 2페이지로 저장합니다"
                  onClick={() => landscapeFileRef.current?.click()}
                >
                  <RectangleHorizontal className="h-4 w-4" />
                  2분할
                </Button>
              </div>
            </div>
            <ul className="min-h-0 flex-1 space-y-1 overflow-auto p-3">
              {!selectedFolderId && (
                <li className="py-10 text-center text-sm text-[var(--muted)]">폴더를 선택하세요</li>
              )}
              {selectedFolderId && documents.length === 0 && (
                <li className="flex flex-col items-center gap-4 py-10 text-center">
                  <p className="text-sm text-[var(--muted)]">PDF를 추가하세요</p>
                  {libraryIsEmpty && (
                    <SampleStartButton
                      onSeeded={() => {
                        void refresh()
                        void refreshDocs()
                        void favorites.refresh()
                      }}
                    />
                  )}
                </li>
              )}
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  folders={folders}
                  currentFolderId={selectedFolderId!}
                  onToggleFavorite={() => {
                    void toggleFavorite(doc.id, !doc.isFavorite).then(() => favorites.refresh())
                  }}
                  onMove={(folderId) => void move(doc.id, folderId)}
                  onRename={(name) => void rename(doc.id, name)}
                  onDelete={() => {
                    if (confirm(`"${doc.fileName}"을(를) 삭제할까요?`)) {
                      void removeDoc(doc.id).then(() => favorites.refresh())
                    }
                  }}
                />
              ))}
            </ul>
          </section>
        </div>

      {createOpen && (
        <Modal title="새폴더" onClose={() => !busy && setCreateOpen(false)}>
          <p className="mb-3 text-sm text-[var(--muted)]">루트에 새 폴더를 만듭니다.</p>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">폴더 이름</label>
          <Input
            ref={createInputRef}
            placeholder="폴더 이름"
            value={newFolderName}
            disabled={busy}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleCreateFolder()
              }
            }}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setCreateOpen(false)}>
              취소
            </Button>
            <Button size="sm" disabled={busy} onClick={() => void handleCreateFolder()}>
              <FolderPlus className="h-4 w-4" />
              폴더 추가
            </Button>
          </div>
        </Modal>
      )}

      {landscapePreparing && (
        <BusyOverlay
          title="가로PDF (2분할) 준비"
          message="선택한 PDF를 읽는 중…"
          onCancel={cancelLandscapeJob}
        />
      )}

      {landscapePreview && !landscapeProgress && (
        <Modal
          title="가로PDF (2분할) 확인"
          onClose={cancelLandscapeJob}
          wide
        >
          <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
            <div className="min-w-0">
              <p className="mb-1.5 text-center text-[11px] font-medium tracking-wide text-[var(--muted)]">
                Before
              </p>
              <div className="overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--bg)] p-1.5">
                <img
                  src={landscapePreview.previewUrl}
                  alt="분할 전 가로 페이지"
                  className="mx-auto max-h-36 w-full object-contain"
                />
              </div>
              <p className="mt-1 text-center text-[10px] text-[var(--muted)]">양면 1장</p>
            </div>

            <div className="flex flex-col items-center justify-center pt-5 text-[var(--accent)]" aria-hidden>
              <ChevronRight className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="mb-1.5 text-center text-[11px] font-medium tracking-wide text-[var(--muted)]">
                After
              </p>
              <div className="flex flex-col gap-1 overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--bg)] p-1.5">
                <img
                  src={landscapePreview.afterLeftUrl}
                  alt="분할 후 왼쪽 페이지"
                  className="mx-auto max-h-[4.5rem] w-auto object-contain"
                />
                <img
                  src={landscapePreview.afterRightUrl}
                  alt="분할 후 오른쪽 페이지"
                  className="mx-auto max-h-[4.5rem] w-auto object-contain"
                />
              </div>
              <p className="mt-1 text-center text-[10px] text-[var(--muted)]">세로 2장</p>
            </div>
          </div>

          <dl className="mb-4 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted)]">파일</dt>
              <dd className="truncate text-right font-medium text-[var(--ink)]">
                {landscapePreview.file.name}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted)]">원본</dt>
              <dd className="font-medium">{landscapePreview.pageCount}장</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted)]">예상 소요</dt>
              <dd className="font-medium">약 {formatEta(landscapePreview.estimatedSeconds)}</dd>
            </div>
          </dl>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={cancelLandscapeJob}>
              취소
            </Button>
            <Button size="sm" onClick={() => void confirmLandscapeSplit()}>
              분할 후 저장
            </Button>
          </div>
        </Modal>
      )}

      {landscapeProgress && (
        <BusyOverlay
          title="가로PDF (2분할) 중"
          message={landscapeProgress.message}
          ratio={landscapeProgress.ratio}
          detail={
            landscapeProgress.sourcePageCount > 0
              ? `원본 ${landscapeProgress.sourcePage}/${landscapeProgress.sourcePageCount} · 저장 ${landscapeProgress.outputPages}페이지`
              : undefined
          }
          onCancel={cancelLandscapeJob}
        />
      )}

      {landscapeError && !landscapePreparing && !landscapeProgress && !landscapePreview && (
        <Modal title="가로PDF (2분할) 오류" onClose={() => setLandscapeError(null)}>
          <p className="mb-4 text-sm text-[var(--danger)]">{landscapeError}</p>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setLandscapeError(null)}>
              확인
            </Button>
          </div>
        </Modal>
      )}

      {exitConfirmOpen && (
        <Modal title="편집 종료" onClose={() => !busy && setExitConfirmOpen(false)}>
          <p className="mb-4 text-sm text-[var(--muted)]">
            변경사항을 저장할까요?
            <br />
            <span className="text-[var(--ink)]">
              저장하지 않으면 삭제한 폴더·이름 변경·이동이 모두 되돌아갑니다.
            </span>
          </p>
          <div className="flex flex-col gap-2">
            <Button disabled={busy} onClick={() => void saveAndExit()}>
              저장하고 종료
            </Button>
            <Button variant="secondary" disabled={busy} onClick={discardAndExit}>
              저장하지 않고 종료 (변경 취소)
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setExitConfirmOpen(false)}>
              계속 편집
            </Button>
          </div>
        </Modal>
      )}

      {drag && (
        <div
          className="pointer-events-none fixed z-[100] will-change-transform"
          style={{
            left: drag.x,
            top: drag.y,
            width: drag.w,
          }}
        >
          <div
            className="flex items-center gap-2 rounded-lg border-2 border-[var(--accent)] bg-[var(--surface)] px-2 py-2 text-sm font-medium text-[var(--ink)] shadow-xl"
            style={{ height: drag.h, minHeight: 36 }}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <span className="truncate">{drag.name}</span>
          </div>
          {dropHintLabel && (
            <p
              className={cn(
                'mt-1 rounded-md px-2 py-1 text-center text-[11px] font-semibold shadow-md',
                dropTarget?.kind === 'root'
                  ? 'bg-[var(--ink)] text-white'
                  : 'bg-[var(--accent)] text-white',
              )}
            >
              {dropHintLabel}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function RootDropBar({ active, visible }: { active: boolean; visible: boolean }) {
  if (!visible) return null
  return (
    <div
      data-folder-drop="root"
      className={cn(
        'my-1 flex items-center justify-center rounded-md transition-all',
        active ? 'h-8 bg-[var(--accent)]/15' : 'h-5 bg-transparent',
      )}
    >
      <div
        className={cn(
          'w-full rounded-full transition-all',
          active
            ? 'h-1.5 bg-[var(--accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_25%,transparent)]'
            : 'h-0.5 bg-[var(--border-strong)]/80',
        )}
      />
    </div>
  )
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}초`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}분 ${s}초` : `${m}분`
}

function BusyOverlay({
  title,
  message,
  ratio,
  detail,
  onCancel,
}: {
  title: string
  message: string
  ratio?: number
  detail?: string
  onCancel: () => void
}) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio ?? 0)) * 100)
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="alertdialog"
      aria-modal
      aria-label={title}
    >
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-lg">
        <h2 className="text-base font-semibold text-[var(--ink)]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
        {detail && <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>}
        {ratio !== undefined && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
              <span>진행률</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-[var(--ink)] transition-[width] duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <Button size="sm" variant="secondary" onClick={onCancel}>
            취소
          </Button>
        </div>
      </div>
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className={cn(
          'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg',
          wide ? 'max-w-lg' : 'max-w-sm',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[var(--ink)]">{title}</h2>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--border)]"
            title="닫기"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function folderLabel(folders: Folder[], folder: Folder): string {
  if (!folder.parentId) return folder.name
  const parent = folders.find((f) => f.id === folder.parentId)
  return parent ? `${parent.name} / ${folder.name}` : folder.name
}

function DocumentRow({
  doc,
  folders,
  currentFolderId,
  onToggleFavorite,
  onMove,
  onRename,
  onDelete,
}: {
  doc: Document
  folders: Folder[]
  currentFolderId: string
  onToggleFavorite: () => void
  onMove: (folderId: string) => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [moving, setMoving] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState('')
  const [targetId, setTargetId] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)
  const targets = folders.filter((f) => f.id !== currentFolderId)

  useEffect(() => {
    if (!renaming) return
    renameRef.current?.focus()
    renameRef.current?.select()
  }, [renaming])

  const startRename = () => {
    setMoving(false)
    setDraft(doc.fileName.replace(/\.pdf$/i, ''))
    setRenaming(true)
  }

  const submitRename = () => {
    const name = draft.trim()
    if (!name) {
      setRenaming(false)
      return
    }
    onRename(name)
    setRenaming(false)
  }

  const confirmMove = () => {
    if (!targetId) return
    onMove(targetId)
    setMoving(false)
    setTargetId('')
  }

  return (
    <li className="rounded-lg px-2 py-2 hover:bg-[var(--border)]/50">
      {renaming ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={renameRef}
            value={draft}
            aria-label="PDF 이름"
            className="h-8 min-w-0 flex-1"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitRename()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                setRenaming(false)
              }
            }}
          />
          <Button size="sm" onClick={submitRename} disabled={!draft.trim()}>
            저장
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRenaming(false)}>
            취소
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            to={`/read/${doc.id}`}
            className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ink)] hover:underline"
          >
            {doc.fileName}
          </Link>
          {(doc.pageLayout ?? 'portrait') === 'landscape' && (
            <span className="shrink-0 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
              가로
            </span>
          )}
          <span className="text-xs text-[var(--muted)]">{doc.pageCount}p</span>
          <Button size="icon" variant="ghost" title="이름 바꾸기" onClick={startRename}>
            <Pencil className="h-4 w-4 text-[var(--muted)]" />
          </Button>
          <Button size="icon" variant="ghost" title="즐겨찾기" onClick={onToggleFavorite}>
            <Star
              className={cn(
                'h-4 w-4',
                doc.isFavorite ? 'fill-amber-400 text-amber-500' : 'text-[var(--muted)]',
              )}
            />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="다른 폴더로 이동"
            disabled={targets.length === 0}
            onClick={() => {
              setRenaming(false)
              setMoving((v) => !v)
              setTargetId(targets[0]?.id ?? '')
            }}
          >
            <FolderInput className="h-4 w-4 text-[var(--muted)]" />
          </Button>
          <Button size="icon" variant="ghost" title="삭제" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-[var(--muted)]" />
          </Button>
        </div>
      )}

      {moving && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2">
          {targets.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">이동할 다른 폴더가 없습니다.</p>
          ) : (
            <>
              <label className="text-xs font-medium text-[var(--muted)]">이동할 폴더</label>
              <select
                className="h-8 min-w-40 flex-1 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm text-[var(--ink)]"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                {targets.map((f) => (
                  <option key={f.id} value={f.id}>
                    {folderLabel(folders, f)}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={confirmMove} disabled={!targetId}>
                이동
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setMoving(false)
                  setTargetId('')
                }}
              >
                취소
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  )
}

function FolderItem({
  folder,
  children,
  allFolders,
  selectedId,
  editMode,
  draggingId,
  dropTarget,
  onSelect,
  onRename,
  onDelete,
  onGripPointerDown,
  onAddChild,
}: {
  folder: Folder
  children: Folder[]
  allFolders: Folder[]
  selectedId: string | null
  editMode: boolean
  draggingId: string | null
  dropTarget: DropTarget
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onGripPointerDown: (folder: Folder, e: React.PointerEvent, rowEl: HTMLElement | null) => void
  onAddChild: (parentId: string, name: string) => Promise<void>
}) {
  const [rowMode, setRowMode] = useState<'idle' | 'rename' | 'addChild' | 'confirmDelete'>('idle')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const selected = selectedId === folder.id
  const canAddChild = folder.parentId === null
  const isDragging = draggingId === folder.id
  const acceptDrop =
    Boolean(draggingId) &&
    folder.parentId === null &&
    canNestUnder(draggingId!, folder.id, allFolders)
  const isDropHover =
    dropTarget?.kind === 'nest' && dropTarget.folderId === folder.id && acceptDrop

  useEffect(() => {
    if (!editMode) setRowMode('idle')
  }, [editMode])

  useEffect(() => {
    if (rowMode !== 'rename' && rowMode !== 'addChild') return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [rowMode])

  const iconBtn = cn(
    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
    selected && rowMode === 'idle' && !isDropHover
      ? 'text-white/90 hover:bg-white/15'
      : 'text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--ink)]',
  )

  const submitRename = async () => {
    const name = draft.trim()
    if (!name || name === folder.name) {
      setRowMode('idle')
      return
    }
    setBusy(true)
    try {
      await onRename(folder.id, name)
      setRowMode('idle')
    } finally {
      setBusy(false)
    }
  }

  const submitAddChild = async () => {
    const name = draft.trim() || '새 폴더'
    setBusy(true)
    try {
      await onAddChild(folder.id, name)
      setRowMode('idle')
      setDraft('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn(isDragging && 'opacity-30')}>
      <div
        ref={rowRef}
        data-folder-id={folder.id}
        data-folder-drop={acceptDrop ? 'nest' : undefined}
        className={cn(
          'rounded-lg px-1.5 py-1.5 text-sm transition-shadow',
          rowMode === 'idle' &&
            !isDropHover &&
            (selected ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--bg)]'),
          rowMode !== 'idle' && 'bg-[var(--accent-soft)]',
          isDropHover &&
            'bg-[var(--accent-soft)] text-[var(--ink)] ring-2 ring-[var(--accent)] ring-offset-1',
          acceptDrop &&
            draggingId &&
            !isDropHover &&
            'outline outline-1 outline-dashed outline-[var(--border-strong)]',
        )}
      >
        {rowMode === 'idle' || rowMode === 'confirmDelete' ? (
          <div className="flex items-center gap-0.5">
            {editMode && (
              <button
                type="button"
                className={cn(
                  'inline-flex h-9 w-9 shrink-0 touch-none items-center justify-center rounded-md',
                  selected && !isDropHover
                    ? 'text-white/90 hover:bg-white/15'
                    : 'text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--ink)]',
                )}
                title="길게 눌러 드래그"
                aria-label="폴더 드래그"
                onPointerDown={(e) => {
                  if (e.button !== 0) return
                  if (rowMode === 'confirmDelete') return
                  onGripPointerDown(folder, e, rowRef.current)
                }}
              >
                <GripVertical className="h-5 w-5" strokeWidth={2.25} />
              </button>
            )}
            <button
              type="button"
              className="min-w-0 flex-1 truncate py-1 text-left"
              onClick={() => onSelect(folder.id)}
            >
              {folder.name}
            </button>
            {editMode && (
              <>
                {canAddChild && rowMode === 'idle' && (
                  <button
                    type="button"
                    className={iconBtn}
                    title="하위 폴더 추가"
                    onClick={() => {
                      setDraft('')
                      setRowMode('addChild')
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
                {rowMode === 'idle' && (
                  <button
                    type="button"
                    className={iconBtn}
                    title="이름 바꾸기"
                    onClick={() => {
                      setDraft(folder.name)
                      setRowMode('rename')
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {rowMode === 'confirmDelete' ? (
                  <span className="ml-0.5 flex items-center gap-0.5">
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-red-500 text-white"
                      title="삭제 확인"
                      onClick={() => void onDelete(folder.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-md border',
                        selected && !isDropHover
                          ? 'border-white/40 text-white hover:bg-white/15'
                          : 'border-[var(--border-strong)] text-[var(--ink)] hover:bg-[var(--border)]',
                      )}
                      title="취소"
                      onClick={() => setRowMode('idle')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className={iconBtn}
                    title="삭제"
                    onClick={() => setRowMode('confirmDelete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 px-1">
            <p className="text-[10px] font-medium text-[var(--muted)]">
              {rowMode === 'rename' ? '이름 바꾸기' : '하위 폴더 이름'}
            </p>
            <div className="flex items-center gap-1">
              <Input
                ref={inputRef}
                value={draft}
                disabled={busy}
                placeholder={rowMode === 'addChild' ? '새 폴더' : folder.name}
                className="h-8 border-[var(--border-strong)] bg-white text-[var(--ink)]"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void (rowMode === 'rename' ? submitRename() : submitAddChild())
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    setRowMode('idle')
                  }
                }}
              />
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent)] text-white disabled:opacity-50"
                title="확인"
                disabled={busy}
                onClick={() => void (rowMode === 'rename' ? submitRename() : submitAddChild())}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-strong)] bg-white text-[var(--ink)]"
                title="취소"
                disabled={busy}
                onClick={() => setRowMode('idle')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {isDropHover && (
        <p className="mt-0.5 px-2 text-[10px] font-medium text-[var(--accent)]">이 폴더 안으로 넣기</p>
      )}

      {children.length > 0 && (
        <ul className="ml-4 mt-1 space-y-1 border-l border-neutral-200 pl-2">
          {children.map((child) => (
            <li key={child.id}>
              <FolderItem
                folder={child}
                children={[]}
                allFolders={allFolders}
                selectedId={selectedId}
                editMode={editMode}
                draggingId={draggingId}
                dropTarget={dropTarget}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
                onGripPointerDown={onGripPointerDown}
                onAddChild={onAddChild}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SidebarFavorites({
  documents,
  loading,
}: {
  documents: { id: string; fileName: string }[]
  loading: boolean
}) {
  return (
    <div className="border-b border-[var(--border)] pb-3">
      <p className="mb-1.5 flex items-center gap-1 px-1 text-[11px] font-semibold tracking-wide text-[var(--muted)] uppercase">
        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
        즐겨찾기 PDF
      </p>
      {loading ? (
        <p className="px-2 py-2 text-xs text-[var(--muted)]">불러오는 중…</p>
      ) : documents.length === 0 ? (
        <p className="px-2 py-2 text-xs text-[var(--muted)]">별(⭐)을 단 PDF가 여기 모입니다.</p>
      ) : (
        <ul className="space-y-0.5">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Link
                to={`/read/${doc.id}`}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-[var(--ink)] hover:bg-[var(--border)]/60"
                title={doc.fileName}
              >
                <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />
                <span className="min-w-0 truncate">{doc.fileName}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
