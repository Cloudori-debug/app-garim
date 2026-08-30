import { useCallback, useRef, useState } from 'react'

/** 실행 취소 / 다시 실행 스택. 새 작업을 넣으면 다시 실행 목록은 비웁니다. */
export function useOpHistory<T>(max = 40) {
  const [past, setPast] = useState<T[]>([])
  const [future, setFuture] = useState<T[]>([])
  const pastRef = useRef(past)
  const futureRef = useRef(future)
  pastRef.current = past
  futureRef.current = future

  const push = useCallback(
    (op: T) => {
      setPast((p) => [...p, op].slice(-max))
      setFuture([])
    },
    [max],
  )

  const takeUndo = useCallback((): T | undefined => {
    const p = pastRef.current
    if (p.length === 0) return undefined
    const op = p[p.length - 1]
    setPast(p.slice(0, -1))
    setFuture((f) => [...f, op])
    return op
  }, [])

  const takeRedo = useCallback((): T | undefined => {
    const f = futureRef.current
    if (f.length === 0) return undefined
    const op = f[f.length - 1]
    setFuture(f.slice(0, -1))
    setPast((p) => [...p, op])
    return op
  }, [])

  const clear = useCallback(() => {
    setPast([])
    setFuture([])
  }, [])

  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    push,
    takeUndo,
    takeRedo,
    clear,
  }
}
