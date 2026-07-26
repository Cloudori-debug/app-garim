export const MIN_MARK_SIZE = 0.02

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

/** 코너 핸들 드래그로 정규화 사각형 크기 조절 (반대쪽 모서리 고정) */
export function resizeNormRect(
  origin: { x: number; y: number; w: number; h: number },
  handle: ResizeHandle,
  dx: number,
  dy: number,
  min = MIN_MARK_SIZE,
): { x: number; y: number; w: number; h: number } {
  const right = origin.x + origin.w
  const bottom = origin.y + origin.h

  let left = origin.x
  let top = origin.y
  let r = right
  let b = bottom

  switch (handle) {
    case 'se':
      r = right + dx
      b = bottom + dy
      break
    case 'sw':
      left = origin.x + dx
      b = bottom + dy
      break
    case 'ne':
      r = right + dx
      top = origin.y + dy
      break
    case 'nw':
      left = origin.x + dx
      top = origin.y + dy
      break
  }

  left = Math.max(0, Math.min(left, 1))
  top = Math.max(0, Math.min(top, 1))
  r = Math.max(0, Math.min(r, 1))
  b = Math.max(0, Math.min(b, 1))

  if (handle === 'se' || handle === 'ne') {
    r = Math.min(1, Math.max(r, left + min))
  } else {
    left = Math.max(0, Math.min(left, r - min))
  }
  if (handle === 'se' || handle === 'sw') {
    b = Math.min(1, Math.max(b, top + min))
  } else {
    top = Math.max(0, Math.min(top, b - min))
  }

  return {
    x: left,
    y: top,
    w: Math.max(min, r - left),
    h: Math.max(min, b - top),
  }
}

export function clampNormRect(
  x: number,
  y: number,
  w: number,
  h: number,
  min = MIN_MARK_SIZE,
): { x: number; y: number; w: number; h: number } {
  const cw = Math.max(min, Math.min(w, 1))
  const ch = Math.max(min, Math.min(h, 1))
  const cx = Math.max(0, Math.min(x, 1 - cw))
  const cy = Math.max(0, Math.min(y, 1 - ch))
  return { x: cx, y: cy, w: cw, h: ch }
}

export function clientPointToNorm(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { x: number; y: number } {
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  }
}

export function normRectFromDrag(
  start: { x: number; y: number },
  end: { x: number; y: number },
): { x: number; y: number; w: number; h: number } {
  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  const w = Math.abs(end.x - start.x)
  const h = Math.abs(end.y - start.y)
  return clampNormRect(x, y, w, h)
}

export function isValidMarkSize(w: number, h: number, min = MIN_MARK_SIZE): boolean {
  return w >= min && h >= min
}

export function denormalizeRect(
  mark: { x: number; y: number; w: number; h: number },
  pageWidth: number,
  pageHeight: number,
) {
  return {
    left: mark.x * pageWidth,
    top: mark.y * pageHeight,
    width: mark.w * pageWidth,
    height: mark.h * pageHeight,
  }
}
