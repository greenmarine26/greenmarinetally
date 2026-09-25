// 콘앱 전용 최소 서비스워커 — PWA 설치(안드로이드 홈화면 추가 배너) 활성화용.
//   캐시는 가볍게: 네트워크 우선, 실패 시 캐시 폴백 (콘앱은 Firebase 실시간 데이터라 항상 최신 우선).
const CACHE = 'cone-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      // 2.55-01 (진단 경 «cone-sw 캐시 증식»): 같은 오리진(또는 보관소) · 정상 응답(ok) · 버전 확인·조회용 고유 URL(?_ck= · ?u=)이 아닌 것만 저장한다.
      //   종전엔 404·타 오리진·`cone.html?_ck=…` 을 전부 cone-v1 에 넣어 캐시가 자라기만 했다. 판마다 바뀌는 `?v=` 파일(카고플랜 번들)은
      //   저장하되 같은 경로의 옛 판은 지운다(1.87MB 가 판 수만큼 쌓이지 않게).
      try {
        const u = new URL(e.request.url);
        //   보관소(Firebase REST, 타 오리진) JSON 은 종전대로 저장한다 — 약신호 재진입 때 마지막 자료가 뜨는 폴백(감사 M3). 그 밖의 타 오리진은 저장 안 함.
        const sameOrFb = u.origin === self.location.origin || /firebasedatabase\.app$/.test(u.hostname);
        const skip = !res || !res.ok || !sameOrFb || /[?&](_ck|u)=/.test(u.search);
        if (!skip) {
          const copy = res.clone();
          caches.open(CACHE).then(async (c) => {
            if (/[?&]v=/.test(u.search)) { const ks = await c.keys(); for (const k of ks) { try { if (new URL(k.url).pathname === u.pathname && k.url !== u.href) await c.delete(k); } catch (err) { /* */ } } }
            await c.put(e.request, copy);
          }).catch(() => {});
        }
      } catch (err) { /* URL 못 읽으면 저장 안 함 */ }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
