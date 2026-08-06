/** 프로덕션에서만 셸 서비스 워커 등록 (개발 HMR 방해 방지) */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  if (!import.meta.env.PROD) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[가림 암기노트] 서비스 워커 등록 실패', err)
    })
  })
}
