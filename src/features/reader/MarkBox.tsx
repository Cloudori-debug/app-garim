import type { Mark } from '@/entities/mark/types'
import type { ReaderMode } from '@/features/reader/types'
import { denormalizeRect, type ResizeHandle } from '@/shared/lib/geometry'
import { cn } from '@/shared/lib/cn'

const EDIT_COLOR: Record<Mark['color'], string> = {
  yellow: 'bg-yellow-300/45 border-yellow-500',
  red: 'bg-red-300/45 border-red-500',
  purple: 'bg-purple-300/45 border-purple-500',
}

const VISIBLE_COLOR: Record<Mark['color'], string> = {
  yellow: 'bg-yellow-300/35 border-yellow-500/80',
  red: 'bg-red-300/35 border-red-500/80',
  purple: 'bg-purple-300/35 border-purple-500/80',
}

/** 손가락으로 잡기 쉬운 최소 히트 영역 (px) */
const MIN_HIT = 44
const HANDLE_SIZE = 20

const CORNER_HANDLES: {
  handle: ResizeHandle
  cursor: string
  title: string
}[] = [
  { handle: 'nw', cursor: 'cursor-nw-resize', title: '왼쪽 위 크기 조절' },
  { handle: 'ne', cursor: 'cursor-ne-resize', title: '오른쪽 위 크기 조절' },
  { handle: 'sw', cursor: 'cursor-sw-resize', title: '왼쪽 아래 크기 조절' },
  { handle: 'se', cursor: 'cursor-se-resize', title: '오른쪽 아래 크기 조절' },
]

interface MarkBoxProps {
  mark: Mark
  pageWidth: number
  pageHeight: number
  mode: ReaderMode
  selected: boolean
  onSelect: () => void
  onMoveStart: (e: React.PointerEvent) => void
  onResizeStart: (e: React.PointerEvent, handle: ResizeHandle) => void
  onToggleStudy: () => void
  /** false면 터치가 페이지 스크롤로 통과 */
  pointerActive?: boolean
}

export function MarkBox({
  mark,
  pageWidth,
  pageHeight,
  mode,
  selected,
  onSelect,
  onMoveStart,
  onResizeStart,
  onToggleStudy,
  pointerActive = true,
}: MarkBoxProps) {
  const { left, top, width, height } = denormalizeRect(mark, pageWidth, pageHeight)
  const editable = mode === 'wordCover' && pointerActive
  const studyMode = mode === 'study'

  const hitW = Math.max(width, MIN_HIT)
  const hitH = Math.max(height, MIN_HIT)
  const hitLeft = left + width / 2 - hitW / 2
  const hitTop = top + height / 2 - hitH / 2
  const visualLeft = (hitW - width) / 2
  const visualTop = (hitH - height) / 2
  const half = HANDLE_SIZE / 2

  const handlePos = (handle: ResizeHandle) => {
    const atEast = handle === 'ne' || handle === 'se'
    const atSouth = handle === 'sw' || handle === 'se'
    return {
      left: visualLeft + (atEast ? width : 0) - half,
      top: visualTop + (atSouth ? height : 0) - half,
    }
  }

  return (
    <div
      className={cn(
        'absolute',
        editable && 'pointer-events-auto cursor-move',
        studyMode && 'pointer-events-auto cursor-pointer',
      )}
      style={
        editable
          ? { left: hitLeft, top: hitTop, width: hitW, height: hitH }
          : { left, top, width, height }
      }
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
      role={studyMode ? 'button' : undefined}
      aria-label={
        studyMode
          ? mark.hiddenInStudy
            ? '가려진 상자, 탭하여 보기'
            : '보이는 상자, 탭하여 가리기'
          : '가림 선택'
      }
    >
      <div
        className={cn(
          'absolute box-border border',
          studyMode
            ? mark.hiddenInStudy
              ? 'border-2 border-neutral-950 bg-[#111111]'
              : VISIBLE_COLOR[mark.color]
            : EDIT_COLOR[mark.color],
          selected && mode === 'wordCover' && 'ring-2 ring-[var(--accent)] ring-offset-1',
        )}
        style={
          editable
            ? { left: visualLeft, top: visualTop, width, height }
            : mark.hiddenInStudy && studyMode
              ? { inset: 0, backgroundColor: '#111111', opacity: 1 }
              : { inset: 0 }
        }
      />

      {selected &&
        editable &&
        CORNER_HANDLES.map(({ handle, cursor, title }) => (
          <div
            key={handle}
            className={cn(
              'absolute z-10 rounded-sm border-2 border-white bg-[var(--accent)] shadow',
              cursor,
            )}
            style={{
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              ...handlePos(handle),
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              onSelect()
              onResizeStart(e, handle)
            }}
            title={title}
          />
        ))}
    </div>
  )
}
