// 그린마린 평택 검수 — Service Worker
// 자동 업데이트 + 오프라인 캐시
// 새 버전 출시 시 자동 감지 → 클라이언트에 알림

const CACHE_VERSION = 'gmt-v1.3-' + new Date().toISOString().slice(0, 10);
const CACHE_NAME = `${CACHE_VERSION}`;

// 설치
self.addEventListener('install', (event) => {
  // 새 버전 감지 시 즉시 활성화 (이전 버전 대기 X)
  self.skipWaiting();
});

// 활성화
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      // 옛 캐시 모두 삭제
      return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

// 네트워크 우선 (HTML/JS는 항상 최신)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // 외부 도메인 (Firebase, CDN) 은 그냥 통과
  if (url.origin !== location.origin) return;

  // HTML/JS/CSS = 네트워크 우선 (실패 시 캐시)
  if (event.request.mode === 'navigate' || /\.(js|css|html|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      fetch(event.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  // 이미지/폰트 = 캐시 우선
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// 클라이언트가 SKIP_WAITING 메시지 보내면 즉시 활성화
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
