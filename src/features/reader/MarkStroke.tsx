import { X } from 'lucide-react'

import type { Mark } from '@/entities/mark/types'
import type { ReaderMode } from '@/features/reader/types'
import { cn } from '@/shared/lib/cn'
import { denormalizeRect } from '@/shared/lib/geometry'
import { markStroke, pointsToPath } from '@/shared/lib/stroke'

const INK: Record<Mark['color'], string> = {
  yellow: 'rgba(250, 204, 21, 0.55)',
  red: 'rgba(248, 113, 113, 0.5)',
  purple: 'rgba(192, 132, 252, 0.5)',
}

const DELETE_SIZE = 28

interface MarkStrokeProps {
  mark: Mark
  pageWidth: number
  pageHeight: number
  mode: ReaderMode
  selected: boolean
  onSelect: () => void
  onMoveStart: (e: React.PointerEvent) => void
  onToggleStudy: () => void
  onDelete: () => void
  pointerActive?: boolean
}

export function MarkStroke({
  mark,
  pageWidth,
  pageHeight,
  mode,
  selected,
  onSelect,
  onMoveStart,
  onToggleStudy,
  onDelete,
  pointerActive = true,
}: MarkStrokeProps) {
  const { points, strokeWidth } = markStroke(mark)
  const { left, top, width, height } = denormalizeRect(mark, pageWidth, pageHeight)
  const editable = mode === 'wordCover' && pointerActive
  const canDelete = mode === 'wordCover'
  const studyMode = mode === 'study'
  const hidden = studyMode && mark.hiddenInStudy
  const d = pointsToPath(points, pageWidth, pageHeight)
  const pxWidth = Math.max(4, strokeWidth * pageHeight)
  const hitWidth = Math.max(pxWidth, 28)

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="pointer-events-none absolute inset-0"
        width={pageWidth}
        height={pageHeight}
        viewBox={`0 0 ${pageWidth} ${pageHeight}`}
        aria-hidden
      >
        {selected && mode === 'wordCover' && (
          <path
            d={d}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={pxWidth + 8}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.55}
          />
        )}
        <path
          d={d}
          fill="none"
          stroke={hidden ? '#111111' : INK[mark.color]}
          strokeWidth={pxWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={d}
          fill="none"
          stroke="transparent"
          strokeWidth={hitWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            (editable || studyMode) && 'pointer-events-auto',
            editable && 'cursor-move',
            studyMode && 'cursor-pointer',
          )}
          onPointerDown={(e) => {
            if (!editable) return
            e.stopPropagation()
            onSelect()
            onMoveStart(e)
          }}
          onClick={(e) => {
            if (!studyMode) return
            e.stopPropagation()
            onToggleStudy()
          }}
        />
      </svg>

      {canDelete && (
        <button
          type="button"
          className="pointer-events-auto absolute z-20 flex items-center justify-center rounded-full bg-neutral-900 text-white shadow-md"
          style={{
            width: DELETE_SIZE,
            height: DELETE_SIZE,
            ...deleteButtonPos(left, top, width, height, pageWidth, pageHeight),
          }}
          aria-label="가림 삭제"
          title="가림 삭제"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

function deleteButtonPos(
  boxLeft: number,
  boxTop: number,
  boxWidth: number,
  boxHeight: number,
  pageWidth: number,
  pageHeight: number,
) {
  const size = DELETE_SIZE
  let pageX = boxLeft + boxWidth - 8
  let pageY = boxTop - size + 8
  if (pageY < 0) pageY = boxTop + Math.min(4, Math.max(0, boxHeight - size))
  if (pageX + size > pageWidth) pageX = Math.max(0, boxLeft + boxWidth - size)
  if (pageX < 0) pageX = 0
  if (pageY + size > pageHeight) pageY = Math.max(0, pageHeight - size)
  if (pageY < 0) pageY = 0
  return { left: pageX, top: pageY }
}
