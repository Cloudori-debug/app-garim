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
 * 한 손가락 스크롤은 네이티브에 맡긴다.
 * (스크롤 컨테이너에 상시 non-passive touchmove를 붙이면 iOS에서 팬이 막힘)
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
    let pinchMoveBound = false

    const syncPinchFromPointers = () => {
      if (pointers.size < 2) return
      const [a, b] = [...pointers.values()]
      if (!a || !b) return
      const d = dist2(a, b)
      if (startDist < 4) startDist = d
      if (startDist < 4) return
      setZoomPercent(clampZoomPercent(startZoom * (d / startDist)))
    }

    const onPinchPointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })
      if (!pinching || pointers.size < 2) return
      e.preventDefault()
      syncPinchFromPointers()
    }

    const onPinchTouchMove = (e: TouchEvent) => {
      if (!pinching || e.touches.length !== 2) return
      e.preventDefault()
      const d = dist2(e.touches[0]!, e.touches[1]!)
      if (startDist < 4) return
      setZoomPercent(clampZoomPercent(startZoom * (d / startDist)))
    }

    const bindPinchMove = () => {
      if (pinchMoveBound) return
      pinchMoveBound = true
      el.style.touchAction = 'none'
      el.addEventListener('pointermove', onPinchPointerMove, { capture: true, passive: false })
      el.addEventListener('touchmove', onPinchTouchMove, { capture: true, passive: false })
    }

    const unbindPinchMove = () => {
      if (!pinchMoveBound) return
      pinchMoveBound = false
      el.style.touchAction = ''
      el.removeEventListener('pointermove', onPinchPointerMove, { capture: true })
      el.removeEventListener('touchmove', onPinchTouchMove, { capture: true })
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })
      if (pointers.size === 2) {
        pinching = true
        const [a, b] = [...pointers.values()]
        startDist = a && b ? dist2(a, b) : 0
        startZoom = zoomRef.current
        bindPinchMove()
      }
    }

    const endPointer = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size < 2 && pinching) {
        pinching = false
        unbindPinchMove()
        setZoomPercent(snapZoomPercent(zoomRef.current))
      }
    }

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
      unbindPinchMove()
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

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      pinching = true
      startDist = dist2(e.touches[0]!, e.touches[1]!)
      startZoom = zoomRef.current
      bindPinchMove()
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length >= 2) return
      if (!pinching) return
      pinching = false
      unbindPinchMove()
      setZoomPercent(snapZoomPercent(zoomRef.current))
    }

    const captureFalse: AddEventListenerOptions = { capture: true, passive: false }
    const captureOk: AddEventListenerOptions = { capture: true }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', endPointer)
    el.addEventListener('pointercancel', endPointer)
    el.addEventListener('lostpointercapture', endPointer)

    // touchstart는 passive 유지 — 상시 non-passive면 iOS 세로 스크롤이 막힘
    el.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    el.addEventListener('gesturestart', onGestureStart, captureFalse)
    el.addEventListener('gesturechange', onGestureChange, captureFalse)
    el.addEventListener('gestureend', onGestureEnd, captureFalse)

    window.addEventListener('wheel', onWheel, captureFalse)

    return () => {
      unbindPinchMove()
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', endPointer)
      el.removeEventListener('pointercancel', endPointer)
      el.removeEventListener('lostpointercapture', endPointer)
      el.removeEventListener('touchstart', onTouchStart, captureOk)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      el.removeEventListener('gesturestart', onGestureStart, captureOk)
      el.removeEventListener('gesturechange', onGestureChange, captureOk)
      el.removeEventListener('gestureend', onGestureEnd, captureOk)
      window.removeEventListener('wheel', onWheel, captureOk)
    }
  }, [targetRef, setZoomPercent, enabled])
}
