// ===================================================
// AI LABS Service Worker v2
// 캐싱 전략:
//   Cache-First   : /_next/static/**, /favicon_io/**, /android-chrome-*.png
//   SWR           : 페이지 HTML (/, /apps, /prompts ...)
//   Network-First : 기타 GET 요청
//   Network-Only  : /api/**, POST/PUT/DELETE
// ===================================================

const CACHE_VERSION = 'v3'
const STATIC_CACHE  = `ai-labs-static-${CACHE_VERSION}`
const PAGE_CACHE    = `ai-labs-pages-${CACHE_VERSION}`
const IMAGE_CACHE   = `ai-labs-images-${CACHE_VERSION}`

const ALL_CACHES = [STATIC_CACHE, PAGE_CACHE, IMAGE_CACHE]

// 동적 인증 페이지(/, /apps, /prompts)는 프리캐시 제외
// → 오래된 로그인 상태가 캐시되어 렌더링 불일치 발생 방지
// → 오프라인 폴백 페이지만 프리캐시
const PRECACHE_PAGES = [
  '/offline.html',
]

// ─────────────────────────────────────────────────
// Install
// ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) =>
      Promise.allSettled(PRECACHE_PAGES.map((url) => cache.add(url)))
    )
  )
  // 이전 SW가 있어도 즉시 활성화
  self.skipWaiting()
})

// ─────────────────────────────────────────────────
// Activate: 이전 버전 캐시 삭제
// ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !ALL_CACHES.includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ─────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 다른 오리진은 무시
  if (url.origin !== self.location.origin) return
  // GET 이외 메서드는 무시
  if (request.method !== 'GET') return
  // API 라우트는 항상 네트워크
  if (url.pathname.startsWith('/api/')) return
  // Next.js 내부 HMR/데이터 요청은 무시
  if (url.pathname.startsWith('/_next/data/')) return

  // ── 1. Cache-First: Next.js 정적 청크 (해시 포함 → 불변 파일)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // ── 2. Cache-First: 파비콘 / 아이콘 / 오프라인 HTML
  if (
    url.pathname.startsWith('/favicon_io/') ||
    url.pathname.startsWith('/android-chrome') ||
    url.pathname === '/offline.html'
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // ── 3. Cache-First with size limit: 이미지 (외부 이미지 제외, 최대 50개)
  if (
    url.pathname.startsWith('/images/') ||
    /\.(png|jpg|jpeg|webp|gif|svg|ico)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirstWithLimit(request, IMAGE_CACHE, 50))
    return
  }

  // ── 4. Network-First: 페이지 HTML
  // SWR → Network-First로 변경: 인증 페이지에서 오래된 HTML이 반환되면
  // 서버 렌더링 결과와 불일치 발생. 항상 최신 서버 응답을 사용.
  if (request.destination === 'document') {
    event.respondWith(networkFirst(request, PAGE_CACHE))
    return
  }

  // ── 5. Network-First: 그 외 (폰트, 기타)
  event.respondWith(networkFirst(request, STATIC_CACHE))
})

// ─────────────────────────────────────────────────
// Push Notification
// ─────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'AI LABS', body: '새로운 소식이 있어요!', url: '/apps' }

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: '/android-chrome-192x192.png',
    badge: '/favicon_io/favicon-32x32.png',
    data: { url: data.url || '/apps' },
    vibrate: [100, 50, 100],
    tag: 'ai-labs-notification',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// 알림 클릭 → 해당 URL로 이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/apps'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.navigate(targetUrl)
          return
        }
      }
      // 없으면 새 탭
      return self.clients.openWindow(targetUrl)
    })
  )
})

// ─────────────────────────────────────────────────
// 캐싱 전략 함수들
// ─────────────────────────────────────────────────

/** Cache-First: 캐시 히트 → 즉시 반환 / 미스 → 네트워크 후 캐시 저장 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return offlineFallback(request)
  }
}

/** Cache-First with LRU-style size limit */
async function cacheFirstWithLimit(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      // 초과 시 오래된 항목 삭제
      const keys = await cache.keys()
      if (keys.length >= maxEntries) {
        await cache.delete(keys[0])
      }
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return offlineFallback(request)
  }
}

/** Stale-While-Revalidate: 캐시를 즉시 반환하면서 백그라운드에서 갱신 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)

  return cached || fetchPromise || offlineFallback(request)
}

/** Network-First: 네트워크 우선, 실패 시 캐시 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || offlineFallback(request)
  }
}

/** 오프라인 폴백 */
async function offlineFallback(request) {
  if (request.destination === 'document') {
    return caches.match('/offline.html')
  }
  return new Response('Offline', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' },
  })
}
