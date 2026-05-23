// Tallyman Master Service Worker
// 매 빌드마다 VERSION 변경 → 새 버전 감지 → UpdatePrompt 알림 + 자동 새로고침
const VERSION = 'M6.86.8.8';
const CACHE_NAME = `tallyman-${VERSION}`;

self.addEventListener('install', (e) => {
  // 즉시 활성화 — 새 버전 빠르게 적용
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      // 옛 캐시 모두 삭제
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
      // 즉시 클라이언트 제어
      self.clients.claim(),
    ])
  );
});

// SKIP_WAITING 메시지 받으면 즉시 활성화 (UpdatePrompt 버튼)
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// fetch — network-first (캐시 사용 안 함, 새 버전 즉시 반영)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
