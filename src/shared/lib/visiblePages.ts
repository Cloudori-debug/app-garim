/** PDF 1-based 페이지 중 숨기지 않은 목록 */
export function listVisiblePages(pageCount: number, hiddenPages: readonly number[] = []): number[] {
  const hidden = new Set(hiddenPages)
  const out: number[] = []
  for (let p = 1; p <= pageCount; p++) {
    if (!hidden.has(p)) out.push(p)
  }
  return out
}

export function isPageHidden(page: number, hiddenPages: readonly number[] = []): boolean {
  return hiddenPages.includes(page)
}

/** 숨긴 페이지면 가장 가까운 보이는 페이지 (없으면 1 또는 0) */
export function nearestVisiblePage(
  page: number,
  visiblePages: readonly number[],
): number {
  if (visiblePages.length === 0) return 0
  if (visiblePages.includes(page)) return page
  let best = visiblePages[0]!
  let bestDist = Math.abs(best - page)
  for (const p of visiblePages) {
    const d = Math.abs(p - page)
    if (d < bestDist || (d === bestDist && p < best)) {
      best = p
      bestDist = d
    }
  }
  return best
}

export function adjacentVisiblePage(
  page: number,
  visiblePages: readonly number[],
  dir: -1 | 1,
): number | null {
  if (visiblePages.length === 0) return null
  const idx = visiblePages.indexOf(page)
  if (idx < 0) {
    const near = nearestVisiblePage(page, visiblePages)
    const nearIdx = visiblePages.indexOf(near)
    if (nearIdx < 0) return null
    const next = nearIdx + dir
    if (next < 0 || next >= visiblePages.length) return near
    return visiblePages[next]!
  }
  const next = idx + dir
  if (next < 0 || next >= visiblePages.length) return null
  return visiblePages[next]!
}
