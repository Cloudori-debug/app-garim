import { useEffect, useRef, type RefObject } from 'react'

import { clampZoomPercent, snapZoomPercent } from '@/features/reader/zoomSteps'

function dist2(
  a: { clientX: number; clientY: number },
  b: { clientX: number; clientY: number },
): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

/**
 * PDF 스크롤 영역에서만 핀치 / Ctrl+휠로 확대.
 * 브라우저(앱 전체) 줌은 막고, zoomPercent(PDF 페이지만)만 변경.
 *
 * @param enabled PDF 뷰어 DOM이 실제로 마운트된 뒤에 true로 둘 것
 *   (로딩 화면일 때 effect가 한 번만 돌면 리스너가 영구히 안 붙는 버그 방지)
 */
export function usePinchZoom(
  targetRef: RefObject<HTMLElement | null>,
  zoomPercent: number,
  setZoomPercent: (value: number | ((prev: number) => number)) => void,
  enabled = true,
) {
  const zoomRef = useRef(zoomPercent)
  zoomRef.current = zoomPercent

  useEffect(() => {
    if (!enabled) return
    const el = targetRef.current
    if (!el) return

    const pointers = new Map<number, { clientX: number; clientY: number }>()
    let pinching = false
    let startDist = 0
    let startZoom = 100
    let gestureStartZoom = 100

    const syncPinchFromPointers = () => {
      if (pointers.size < 2) return
      const [a, b] = [...pointers.values()]
      if (!a || !b) return
      const d = dist2(a, b)
      if (startDist < 4) startDist = d
      if (startDist < 4) return
      setZoomPercent(clampZoomPercent(startZoom * (d / startDist)))
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })
      if (pointers.size === 2) {
        pinching = true
        const [a, b] = [...pointers.values()]
        startDist = a && b ? dist2(a, b) : 0
        startZoom = zoomRef.current
        el.style.touchAction = 'none'
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })
      if (!pinching || pointers.size < 2) return
      e.preventDefault()
      syncPinchFromPointers()
    }

    const endPointer = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size < 2 && pinching) {
        pinching = false
        el.style.touchAction = ''
        setZoomPercent(snapZoomPercent(zoomRef.current))
      }
    }

    // Safari(구형 포함): gesture* — 트랙패드·일부 터치
    const onGestureStart = (e: Event) => {
      e.preventDefault()
      gestureStartZoom = zoomRef.current
      pinching = true
    }

    const onGestureChange = (e: Event) => {
      e.preventDefault()
      const scale = (e as Event & { scale?: number }).scale ?? 1
      setZoomPercent(clampZoomPercent(gestureStartZoom * scale))
    }

    const onGestureEnd = (e: Event) => {
      e.preventDefault()
      pinching = false
      setZoomPercent(snapZoomPercent(zoomRef.current))
    }

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      const hit =
        e.target instanceof Node
          ? el.contains(e.target)
          : el.contains(document.elementFromPoint(e.clientX, e.clientY))
      if (!hit) return
      e.preventDefault()
      e.stopImmediatePropagation()
      const step = -e.deltaY > 0 ? 1.06 : 1 / 1.06
      setZoomPercent(clampZoomPercent(zoomRef.current * step))
    }

    // Touch fallback (포인터 이벤트가 약한 환경)
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      pinching = true
      startDist = dist2(e.touches[0]!, e.touches[1]!)
      startZoom = zoomRef.current
      el.style.touchAction = 'none'
      e.preventDefault()
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pinching || e.touches.length !== 2) return
      e.preventDefault()
      const d = dist2(e.touches[0]!, e.touches[1]!)
      if (startDist < 4) return
      setZoomPercent(clampZoomPercent(startZoom * (d / startDist)))
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length >= 2) return
      if (!pinching) return
      pinching = false
      el.style.touchAction = ''
      setZoomPercent(snapZoomPercent(zoomRef.current))
    }

    const opts: AddEventListenerOptions = { capture: true, passive: false }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove, opts)
    el.addEventListener('pointerup', endPointer)
    el.addEventListener('pointercancel', endPointer)
    el.addEventListener('lostpointercapture', endPointer)

    el.addEventListener('touchstart', onTouchStart, opts)
    el.addEventListener('touchmove', onTouchMove, opts)
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    el.addEventListener('gesturestart', onGestureStart, opts)
    el.addEventListener('gesturechange', onGestureChange, opts)
    el.addEventListener('gestureend', onGestureEnd, opts)

    window.addEventListener('wheel', onWheel, opts)

    return () => {
      el.style.touchAction = ''
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove, opts)
      el.removeEventListener('pointerup', endPointer)
      el.removeEventListener('pointercancel', endPointer)
      el.removeEventListener('lostpointercapture', endPointer)
      el.removeEventListener('touchstart', onTouchStart, opts)
      el.removeEventListener('touchmove', onTouchMove, opts)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      el.removeEventListener('gesturestart', onGestureStart, opts)
      el.removeEventListener('gesturechange', onGestureChange, opts)
      el.removeEventListener('gestureend', onGestureEnd, opts)
      window.removeEventListener('wheel', onWheel, opts)
    }
  }, [targetRef, setZoomPercent, enabled])
}
