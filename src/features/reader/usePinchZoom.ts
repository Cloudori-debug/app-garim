import { useEffect, useRef, type RefObject } from 'react'

import { clampZoomPercent, snapZoomPercent } from '@/features/reader/zoomSteps'

type Pt = { clientX: number; clientY: number }
type TwoFingerLock = 'pan' | 'pinch'

function dist2(a: Pt, b: Pt): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

function centroid(a: Pt, b: Pt): Pt {
  return { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 }
}

/**
 * PDF 스크롤 영역: 한 손가락은 네이티브 스크롤, 두 손가락 이동은 팬,
 * 두 손가락 간격 변화·Ctrl+휠은 확대.
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

    const pointers = new Map<number, Pt>()
    let lock: TwoFingerLock | null = null
    let startDist = 0
    let startZoom = 100
    let startCenter: Pt | null = null
    let lastCenter: Pt | null = null
    let gestureStartZoom = 100
    let twoFingerMoveBound = false

    const pair = (): [Pt, Pt] | null => {
      if (pointers.size < 2) return null
      const [a, b] = [...pointers.values()]
      return a && b ? [a, b] : null
    }

    const applyTwoFinger = () => {
      const pts = pair()
      if (!pts) return
      const [a, b] = pts
      const d = dist2(a, b)
      const center = centroid(a, b)
      if (!startCenter) {
        startDist = d
        startCenter = center
        lastCenter = center
        startZoom = zoomRef.current
        return
      }
      if (startDist < 4) startDist = d

      const dDist = Math.abs(d - startDist)
      const dPan = Math.hypot(center.clientX - startCenter.clientX, center.clientY - startCenter.clientY)

      if (!lock) {
        if (dDist >= 18 && dDist >= dPan * 0.65) lock = 'pinch'
        else if (dPan >= 12) lock = 'pan'
      }

      if (lock === 'pinch') {
        if (startDist >= 4) setZoomPercent(clampZoomPercent(startZoom * (d / startDist)))
      } else if (lock === 'pan' && lastCenter) {
        el.scrollLeft -= center.clientX - lastCenter.clientX
        el.scrollTop -= center.clientY - lastCenter.clientY
      }
      lastCenter = center
    }

    const onTwoFingerPointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })
      if (pointers.size < 2) return
      e.preventDefault()
      applyTwoFinger()
    }

    const onTwoFingerTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      e.preventDefault()
      pointers.clear()
      pointers.set(0, { clientX: e.touches[0]!.clientX, clientY: e.touches[0]!.clientY })
      pointers.set(1, { clientX: e.touches[1]!.clientX, clientY: e.touches[1]!.clientY })
      applyTwoFinger()
    }

    const bindTwoFingerMove = () => {
      if (twoFingerMoveBound) return
      twoFingerMoveBound = true
      el.style.touchAction = 'none'
      el.addEventListener('pointermove', onTwoFingerPointerMove, { capture: true, passive: false })
      el.addEventListener('touchmove', onTwoFingerTouchMove, { capture: true, passive: false })
    }

    const unbindTwoFingerMove = () => {
      if (!twoFingerMoveBound) return
      twoFingerMoveBound = false
      el.style.touchAction = ''
      el.removeEventListener('pointermove', onTwoFingerPointerMove, { capture: true })
      el.removeEventListener('touchmove', onTwoFingerTouchMove, { capture: true })
    }

    const beginTwoFinger = () => {
      const pts = pair()
      lock = null
      startDist = pts ? dist2(pts[0], pts[1]) : 0
      startCenter = pts ? centroid(pts[0], pts[1]) : null
      lastCenter = startCenter
      startZoom = zoomRef.current
      bindTwoFingerMove()
    }

    const endTwoFinger = () => {
      const wasPinch = lock === 'pinch'
      lock = null
      startCenter = null
      lastCenter = null
      unbindTwoFingerMove()
      if (wasPinch) setZoomPercent(snapZoomPercent(zoomRef.current))
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })
      if (pointers.size === 2) beginTwoFinger()
    }

    const endPointer = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size < 2 && twoFingerMoveBound) endTwoFinger()
    }

    const onGestureStart = (e: Event) => {
      e.preventDefault()
      gestureStartZoom = zoomRef.current
    }

    const onGestureChange = (e: Event) => {
      if (lock === 'pan') {
        e.preventDefault()
        return
      }
      const scale = (e as Event & { scale?: number }).scale ?? 1
      if (lock !== 'pinch' && Math.abs(scale - 1) < 0.08) {
        e.preventDefault()
        return
      }
      lock = 'pinch'
      e.preventDefault()
      setZoomPercent(clampZoomPercent(gestureStartZoom * scale))
    }

    const onGestureEnd = (e: Event) => {
      e.preventDefault()
      if (lock === 'pinch') setZoomPercent(snapZoomPercent(zoomRef.current))
      if (pointers.size < 2) endTwoFinger()
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
      pointers.clear()
      pointers.set(0, { clientX: e.touches[0]!.clientX, clientY: e.touches[0]!.clientY })
      pointers.set(1, { clientX: e.touches[1]!.clientX, clientY: e.touches[1]!.clientY })
      beginTwoFinger()
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length >= 2) return
      if (!twoFingerMoveBound) return
      endTwoFinger()
    }

    const captureFalse: AddEventListenerOptions = { capture: true, passive: false }
    const captureOk: AddEventListenerOptions = { capture: true }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', endPointer)
    el.addEventListener('pointercancel', endPointer)
    el.addEventListener('lostpointercapture', endPointer)

    el.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    el.addEventListener('gesturestart', onGestureStart, captureFalse)
    el.addEventListener('gesturechange', onGestureChange, captureFalse)
    el.addEventListener('gestureend', onGestureEnd, captureFalse)

    window.addEventListener('wheel', onWheel, captureFalse)

    return () => {
      unbindTwoFingerMove()
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
