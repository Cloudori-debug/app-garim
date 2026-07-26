/** 리더 확대 스텝 (%). 100% = 화면 맞춤 기본 배율 */
export const ZOOM_PERCENTS = [50, 75, 100, 125, 150, 175, 200, 250] as const

export type ZoomPercent = (typeof ZOOM_PERCENTS)[number]

export function stepZoomPercent(current: number, dir: -1 | 1): ZoomPercent {
  if (dir === 1) {
    const next = ZOOM_PERCENTS.find((p) => p > current)
    return next ?? ZOOM_PERCENTS[ZOOM_PERCENTS.length - 1]!
  }
  for (let i = ZOOM_PERCENTS.length - 1; i >= 0; i--) {
    const p = ZOOM_PERCENTS[i]!
    if (p < current) return p
  }
  return ZOOM_PERCENTS[0]!
}

export function snapZoomPercent(value: number): ZoomPercent {
  let best: ZoomPercent = ZOOM_PERCENTS[0]!
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
  return percent <= ZOOM_PERCENTS[0]!
}

export function isMaxZoom(percent: number): boolean {
  return percent >= ZOOM_PERCENTS[ZOOM_PERCENTS.length - 1]!
}
