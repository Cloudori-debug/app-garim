import { isNativeApp } from '@/shared/lib/platform'

/** 프로덕션 웹에서만 셸 서비스 워커 등록. 네이티브는 로컬 자산을 쓰므로 제외. */
export function registerServiceWorker(): void {
  if (isNativeApp()) return
  if (!('serviceWorker' in navigator)) return
  if (!import.meta.env.PROD) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[가림 암기노트] 서비스 워커 등록 실패', err)
    })
  })
}
