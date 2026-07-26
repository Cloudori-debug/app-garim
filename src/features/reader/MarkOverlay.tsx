import { useRef, useState } from 'react'

import type { Mark } from '@/entities/mark/types'
import { MarkBox } from '@/features/reader/MarkBox'
import type { ReaderMode } from '@/features/reader/types'
import {
  clientPointToNorm,
  clampNormRect,
  isValidMarkSize,
  normRectFromDrag,
  resizeNormRect,
  type ResizeHandle,
} from '@/shared/lib/geometry'

interface MarkOverlayProps {
  marks: Mark[]
  page: number
  pageWidth: number
  pageHeight: number
  mode: ReaderMode
  selectedMarkId: string | null
  onSelectMark: (id: string | null) => void
  onCreate: (rect: { x: number; y: number; w: number; h: number }) => void
  onUpdateGeometry: (id: string, rect: { x: number; y: number; w: number; h: number }) => void
  onDelete: (id: string) => void
  onToggleStudy: (id: string) => void
  onToggleFavorite: (id: string, isFavorite: boolean) => void
}

type DragState =
  | { type: 'create'; start: { x: number; y: number }; current: { x: number; y: number } }
  | {
      type: 'move'
      id: string
      origin: { x: number; y: number; w: number; h: number }
      startPointer: { x: number; y: number }
      draft: { x: number; y: number; w: number; h: number }
    }
  | {
      type: 'resize'
      id: string
      handle: ResizeHandle
      origin: { x: number; y: number; w: number; h: number }
      startPointer: { x: number; y: number }
      draft: { x: number; y: number; w: number; h: number }
    }

export function MarkOverlay({
  marks,
  page,
  pageWidth,
  pageHeight,
  mode,
  selectedMarkId,
  onSelectMark,
  onCreate,
  onUpdateGeometry,
  onDelete: _onDelete,
  onToggleStudy,
  onToggleFavorite: _onToggleFavorite,
}: MarkOverlayProps) {
  void _onDelete
  void _onToggleFavorite
  const overlayRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const pageMarks = marks.filter((m) => m.page === page)

  const getNorm = (clientX: number, clientY: number) => {
    const el = overlayRef.current
    if (!el) return { x: 0, y: 0 }
    return clientPointToNorm(clientX, clientY, el.getBoundingClientRect())
  }

  const displayMark = (mark: Mark): Mark => {
    if (drag && (drag.type === 'move' || drag.type === 'resize') && drag.id === mark.id) {
      return { ...mark, ...drag.draft }
    }
    return mark
  }

  return (
    <div
      ref={overlayRef}
      className={
        mode === 'study' || mode === 'pageCover'
          ? 'absolute inset-0 pointer-events-none'
          : 'absolute inset-0 touch-none'
      }
      style={{ width: pageWidth, height: pageHeight }}
      onPointerDown={(e) => {
        if (mode !== 'wordCover') return
        if (e.button !== 0) return
        if (e.target !== overlayRef.current) return
        const start = getNorm(e.clientX, e.clientY)
        onSelectMark(null)
        setDrag({ type: 'create', start, current: start })
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!drag) return
        const point = getNorm(e.clientX, e.clientY)
        if (drag.type === 'create') {
          setDrag({ ...drag, current: point })
          return
        }
        const dx = point.x - drag.startPointer.x
        const dy = point.y - drag.startPointer.y
        const draft =
          drag.type === 'move'
            ? clampNormRect(drag.origin.x + dx, drag.origin.y + dy, drag.origin.w, drag.origin.h)
            : resizeNormRect(drag.origin, drag.handle, dx, dy)
        setDrag({ ...drag, draft })
      }}
      onPointerUp={(e) => {
        if (!drag) return
        if (drag.type === 'create') {
          const rect = normRectFromDrag(drag.start, drag.current)
          if (isValidMarkSize(rect.w, rect.h)) onCreate(rect)
        } else {
          onUpdateGeometry(drag.id, drag.draft)
        }
        setDrag(null)
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }}
    >
      {pageMarks.map((mark) => (
        <MarkBox
          key={mark.id}
          mark={displayMark(mark)}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          mode={mode}
          selected={selectedMarkId === mark.id}
          onSelect={() => onSelectMark(mark.id)}
          onMoveStart={(ev) => {
            const startPointer = getNorm(ev.clientX, ev.clientY)
            setDrag({
              type: 'move',
              id: mark.id,
              origin: { x: mark.x, y: mark.y, w: mark.w, h: mark.h },
              startPointer,
              draft: { x: mark.x, y: mark.y, w: mark.w, h: mark.h },
            })
            overlayRef.current?.setPointerCapture(ev.pointerId)
          }}
          onResizeStart={(ev, handle) => {
            const startPointer = getNorm(ev.clientX, ev.clientY)
            setDrag({
              type: 'resize',
              id: mark.id,
              handle,
              origin: { x: mark.x, y: mark.y, w: mark.w, h: mark.h },
              startPointer,
              draft: { x: mark.x, y: mark.y, w: mark.w, h: mark.h },
            })
            overlayRef.current?.setPointerCapture(ev.pointerId)
          }}
          onToggleStudy={() => onToggleStudy(mark.id)}
        />
      ))}

      {drag?.type === 'create' && (
        <div
          className="pointer-events-none absolute border border-dashed border-neutral-800 bg-neutral-900/20"
          style={(() => {
            const r = normRectFromDrag(drag.start, drag.current)
            return {
              left: r.x * pageWidth,
              top: r.y * pageHeight,
              width: r.w * pageWidth,
              height: r.h * pageHeight,
            }
          })()}
        />
      )}
    </div>
  )
}
