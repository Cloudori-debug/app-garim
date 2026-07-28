/** 리더 확대 스텝 (%). 100% = 화면 맞춤 기본 배율 */
export const ZOOM_PERCENTS = [50, 75, 100, 125, 150, 175, 200, 250] as const

export type ZoomPercent = (typeof ZOOM_PERCENTS)[number]

export const MIN_ZOOM_PERCENT = ZOOM_PERCENTS[0]!
export const MAX_ZOOM_PERCENT = ZOOM_PERCENTS[ZOOM_PERCENTS.length - 1]!

export function clampZoomPercent(value: number): number {
  if (!Number.isFinite(value)) return 100
  return Math.min(MAX_ZOOM_PERCENT, Math.max(MIN_ZOOM_PERCENT, value))
}

export function stepZoomPercent(current: number, dir: -1 | 1): ZoomPercent {
  if (dir === 1) {
    const next = ZOOM_PERCENTS.find((p) => p > current)
    return next ?? MAX_ZOOM_PERCENT
  }
  for (let i = ZOOM_PERCENTS.length - 1; i >= 0; i--) {
    const p = ZOOM_PERCENTS[i]!
    if (p < current) return p
  }
  return MIN_ZOOM_PERCENT
}

export function snapZoomPercent(value: number): ZoomPercent {
  let best: ZoomPercent = MIN_ZOOM_PERCENT
  let bestDist = Math.abs(best - value)
  for (const p of ZOOM_PERCENTS) {
    const d = Math.abs(p - value)
    if (d < bestDist) {
      best = p
      bestDist = d
    }
  }
  return best
}

export function isMinZoom(percent: number): boolean {
  return percent <= MIN_ZOOM_PERCENT
}

export function isMaxZoom(percent: number): boolean {
  return percent >= MAX_ZOOM_PERCENT
}
