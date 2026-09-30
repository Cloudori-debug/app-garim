export type StrokePoint = { x: number; y: number }

export const STROKE_PRESETS = [
  { id: 's', label: '가늘게', width: 0.016 },
  { id: 'm', label: '보통', width: 0.028 },
  { id: 'l', label: '굵게', width: 0.044 },
] as const

export const DEFAULT_STROKE_WIDTH = STROKE_PRESETS[1].width
const MIN_POINT_GAP = 0.004
const MIN_STROKE_LENGTH = 0.012

export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

export function appendStrokePoint(points: StrokePoint[], point: StrokePoint): StrokePoint[] {
  const p = { x: clamp01(point.x), y: clamp01(point.y) }
  const last = points[points.length - 1]
  if (!last) return [p]
  const dx = p.x - last.x
  const dy = p.y - last.y
  if (dx * dx + dy * dy < MIN_POINT_GAP * MIN_POINT_GAP) return points
  return [...points, p]
}

export function strokeLength(points: StrokePoint[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    len += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return len
}

export function isValidStroke(points: StrokePoint[]): boolean {
  return points.length >= 2 && strokeLength(points) >= MIN_STROKE_LENGTH
}

export function strokeBounds(points: StrokePoint[], strokeWidth: number) {
  const pad = Math.max(0.006, strokeWidth / 2)
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  const x = clamp01(minX - pad)
  const y = clamp01(minY - pad)
  const r = clamp01(maxX + pad)
  const b = clamp01(maxY + pad)
  return { x, y, w: Math.max(0.01, r - x), h: Math.max(0.01, b - y) }
}

export function translateStroke(
  points: StrokePoint[],
  strokeWidth: number,
  dx: number,
  dy: number,
): StrokePoint[] {
  const box = strokeBounds(points, strokeWidth)
  const ndx = Math.max(-box.x, Math.min(dx, 1 - (box.x + box.w)))
  const ndy = Math.max(-box.y, Math.min(dy, 1 - (box.y + box.h)))
  return points.map((p) => ({ x: clamp01(p.x + ndx), y: clamp01(p.y + ndy) }))
}

export function pointsToPath(points: StrokePoint[], pageWidth: number, pageHeight: number) {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  let d = `M ${first!.x * pageWidth} ${first!.y * pageHeight}`
  for (const p of rest) {
    d += ` L ${p.x * pageWidth} ${p.y * pageHeight}`
  }
  return d
}

export function nearestStrokePreset(width: number) {
  return STROKE_PRESETS.reduce((best, preset) =>
    Math.abs(preset.width - width) < Math.abs(best.width - width) ? preset : best,
  )
}

/** 예전 네모 가림을 가운데를 지나는 형광펜 획으로 바꿉니다. */
export function legacyStrokeFromRect(rect: { x: number; y: number; w: number; h: number }) {
  if (rect.w >= rect.h) {
    const y = rect.y + rect.h / 2
    return {
      points: [
        { x: rect.x, y },
        { x: rect.x + rect.w, y },
      ],
      strokeWidth: Math.max(rect.h, DEFAULT_STROKE_WIDTH),
    }
  }
  const x = rect.x + rect.w / 2
  return {
    points: [
      { x, y: rect.y },
      { x, y: rect.y + rect.h },
    ],
    strokeWidth: Math.max(rect.w, DEFAULT_STROKE_WIDTH),
  }
}

export function geometryFromStroke(points: StrokePoint[], strokeWidth: number) {
  return { ...strokeBounds(points, strokeWidth), points, strokeWidth }
}

export function markStroke(mark: {
  x: number
  y: number
  w: number
  h: number
  points?: StrokePoint[]
  strokeWidth?: number
}) {
  if (mark.points && mark.points.length > 0) {
    return {
      points: mark.points,
      strokeWidth: mark.strokeWidth ?? DEFAULT_STROKE_WIDTH,
    }
  }
  return legacyStrokeFromRect(mark)
}
