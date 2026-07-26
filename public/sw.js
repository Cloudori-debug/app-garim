/* 앱 셸 캐시 — PDF·IndexedDB 데이터는 건드리지 않음 */
const CACHE = 'amgi-shell-v1'
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // 네비게이션: 네트워크 우선, 실패 시 셸
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          void caches.open(CACHE).then((c) => c.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  // 정적 자산: 캐시 우선
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req).then((res) => {
        if (!res.ok) return res
        const copy = res.clone()
        void caches.open(CACHE).then((c) => c.put(req, copy))
        return res
      })
    }),
  )
})
