import { useEffect, useRef, useState } from 'react'

import type { MarkGeometry } from '@/entities/mark/repository'
import type { Mark, MarkColor, MarkPoint } from '@/entities/mark/types'
import { MarkStroke } from '@/features/reader/MarkStroke'
import type { ReaderMode } from '@/features/reader/types'
import { clientPointToNorm } from '@/shared/lib/geometry'
import {
  appendStrokePoint,
  geometryFromStroke,
  isValidStroke,
  markStroke,
  pointsToPath,
  translateStroke,
} from '@/shared/lib/stroke'

interface MarkOverlayProps {
  marks: Mark[]
  page: number
  pageWidth: number
  pageHeight: number
  mode: ReaderMode
  color: MarkColor
  strokeWidth: number
  /** false면 빈 페이지 드래그는 스크롤에 맡기고, 기존 가림만 만질 수 있음 */
  allowCreate?: boolean
  selectedMarkId: string | null
  onSelectMark: (id: string | null) => void
  onCreate: (stroke: { points: MarkPoint[]; strokeWidth: number }) => void
  onUpdateGeometry: (id: string, geo: MarkGeometry) => void
  onDelete: (id: string) => void
  onToggleStudy: (id: string) => void
  onToggleFavorite: (id: string, isFavorite: boolean) => void
}

type DragState =
  | { type: 'create'; points: MarkPoint[] }
  | {
      type: 'move'
      id: string
      originPoints: MarkPoint[]
      strokeWidth: number
      startPointer: MarkPoint
      draft: MarkGeometry
    }

const INK: Record<MarkColor, string> = {
  yellow: 'rgba(250, 204, 21, 0.55)',
  red: 'rgba(248, 113, 113, 0.5)',
  purple: 'rgba(192, 132, 252, 0.5)',
}

export function MarkOverlay({
  marks,
  page,
  pageWidth,
  pageHeight,
  mode,
  color,
  strokeWidth,
  allowCreate = true,
  selectedMarkId,
  onSelectMark,
  onCreate,
  onUpdateGeometry,
  onDelete,
  onToggleStudy,
  onToggleFavorite: _onToggleFavorite,
}: MarkOverlayProps) {
  void _onToggleFavorite
  const overlayRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const drawing = mode === 'wordCover' && allowCreate
  const pageMarks = marks.filter((m) => m.page === page)

  useEffect(() => {
    if (drag?.type !== 'create') return
    const cancelCreate = (e: PointerEvent) => {
      if (e.isPrimary) return
      setDrag(null)
      const el = overlayRef.current
      if (!el) return
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('pointerdown', cancelCreate)
    return () => window.removeEventListener('pointerdown', cancelCreate)
  }, [drag?.type])

  const getNorm = (clientX: number, clientY: number) => {
    const el = overlayRef.current
    if (!el) return { x: 0, y: 0 }
    return clientPointToNorm(clientX, clientY, el.getBoundingClientRect())
  }

  const displayMark = (mark: Mark): Mark => {
    if (drag?.type === 'move' && drag.id === mark.id) {
      return { ...mark, ...drag.draft }
    }
    return mark
  }

  return (
    <div
      ref={overlayRef}
      className={drawing ? 'absolute inset-0 cursor-crosshair touch-none' : 'absolute inset-0 pointer-events-none'}
      style={{ width: pageWidth, height: pageHeight }}
      onPointerDown={(e) => {
        if (!drawing) return
        if (e.button !== 0) return
        if (!e.isPrimary) {
          setDrag(null)
          return
        }
        if (e.target !== overlayRef.current) return
        const start = getNorm(e.clientX, e.clientY)
        onSelectMark(null)
        setDrag({ type: 'create', points: [start] })
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!drag) return
        const point = getNorm(e.clientX, e.clientY)
        if (drag.type === 'create') {
          setDrag({ type: 'create', points: appendStrokePoint(drag.points, point) })
          return
        }
        const dx = point.x - drag.startPointer.x
        const dy = point.y - drag.startPointer.y
        const points = translateStroke(drag.originPoints, drag.strokeWidth, dx, dy)
        setDrag({ ...drag, draft: geometryFromStroke(points, drag.strokeWidth) })
      }}
      onPointerUp={(e) => {
        if (!drag) return
        if (drag.type === 'create') {
          if (isValidStroke(drag.points)) onCreate({ points: drag.points, strokeWidth })
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
        <MarkStroke
          key={mark.id}
          mark={displayMark(mark)}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          mode={mode}
          selected={selectedMarkId === mark.id}
          onSelect={() => onSelectMark(mark.id)}
          onMoveStart={(ev) => {
            const startPointer = getNorm(ev.clientX, ev.clientY)
            const stroke = markStroke(mark)
            setDrag({
              type: 'move',
              id: mark.id,
              originPoints: stroke.points,
              strokeWidth: stroke.strokeWidth,
              startPointer,
              draft: geometryFromStroke(stroke.points, stroke.strokeWidth),
            })
            overlayRef.current?.setPointerCapture(ev.pointerId)
          }}
          onToggleStudy={() => onToggleStudy(mark.id)}
          onDelete={() => onDelete(mark.id)}
          pointerActive={drawing}
        />
      ))}

      {drag?.type === 'create' && drag.points.length > 0 && (
        <svg
          className="pointer-events-none absolute inset-0"
          width={pageWidth}
          height={pageHeight}
          viewBox={`0 0 ${pageWidth} ${pageHeight}`}
        >
          <path
            d={pointsToPath(drag.points, pageWidth, pageHeight)}
            fill="none"
            stroke={INK[color]}
            strokeWidth={Math.max(4, strokeWidth * pageHeight)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  )
}
