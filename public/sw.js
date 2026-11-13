// Tallyman Master Service Worker
// 매 빌드마다 VERSION 변경 → 새 버전 감지 → UpdatePrompt 알림 + 자동 새로고침
const VERSION = 'TallyOne 5.01';
const NOTE = '5.01 홈의 나 오늘 대수가 오늘 끝낸 배까지 모두 합쳐집니다. 누르면 배마다 양하 선적 대수가 보입니다';   // build.sh 가 utils APP_NOTE 로 채운다
const CACHE_NAME = `tallyman-${VERSION}`;
const NET_WAIT_MS = 3000;   // 4.82-02: 화면 뼈대 요청이 이 시간 안에 안 오면 저장본으로 연다 (4.87-04: 8초 → 3초)
const cachedOf = (req) => caches.match(req).then((m) => m || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));

//  ★ 4.87-10: 설치 단계에서 새 판의 화면 뼈대(index.html)와 그 안의 본체 파일(assets/*.js·*.css)을 미리 받아 둔다.
//    업데이트 직후 «3초 뒤 저장본» 길에서 새 해시 본체가 저장본에 없어 흰 화면이 나던 길(4.87-04)을 막는다.
//    받다가 실패해도 설치는 계속한다(종전 동작) — 다만 사유를 콘솔에 남긴다(조용한 실패 금지).
const precacheShell = () => caches.open(CACHE_NAME).then((cache) =>
  fetch('./index.html', { cache: 'no-store' }).then((res) => {
    if (!res || !res.ok) throw new Error('index.html 응답 ' + (res ? res.status : '없음'));
    return res.clone().text().then((html) => {
      const urls = [];
      const re = /(?:src|href)="\.\/(assets\/[^"?#]+\.(?:js|css))"/g;
      let m;
      while ((m = re.exec(html))) { if (!urls.includes('./' + m[1])) urls.push('./' + m[1]); }
      if (!urls.length) throw new Error('index.html 에서 본체 파일을 못 찾음');
      return cache.addAll(urls).then(() => cache.put('./index.html', res)).then(() => urls.length);
    });
  })
).then((n) => { console.info('[sw 4.87-10] 새 판 미리받기 완료 — 본체 파일 ' + n + '개'); })
 .catch((err) => { console.warn('[sw 4.87-10] 새 판 미리받기 실패 — 설치는 계속(열 때 통신망에서 받음):', err && err.message ? err.message : err); });

//  ★ 4.89: 처음 열 때 받는 화면 조각(수석 상황판·관리앱·맛집·보조·건강·자료센터·통합검색·출력 센터 등)도 설치 때 미리 받는다 —
//    오프라인에서 수석 화면이 «받지 못했습니다» 로 막히지 않게. 목록은 build.sh 가 빌드 때 dist/assets 의 js·css 전부로 채운다(아래 한 줄 형식 그대로 둔다).
const PRECACHE_EXTRA = [];   // build.sh 4.89 가 채운다
//    판마다 이름이 안 바뀌는 조각(vendor·baydict·엑셀·PDF)은 옛 판 저장본에서 옮겨 담는다(다시 안 받는다).
//    뼈대(index.html·본체)를 먼저 받고 나서 하나씩 받는다 — 하나가 실패해도 나머지는 받는다(addAll 은 하나만 틀려도 통째로 실패). 실패 수는 콘솔에 남긴다.
const precacheExtra = () => caches.open(CACHE_NAME).then((cache) => Promise.all(PRECACHE_EXTRA.map((u) =>
  caches.match(u).then((hit) => (hit ? cache.put(u, hit.clone()).then(() => 'have') : cache.add(u).then(() => 'got'))).catch((err) => { console.warn('[sw 4.89] 조각 미리받기 실패:', u, err && err.message ? err.message : err); return 'fail'; })
))).then((rs) => { console.info('[sw 4.89] 화면 조각 미리받기 — 받음 ' + rs.filter((r) => r === 'got').length + ' · 이미 있음 ' + rs.filter((r) => r === 'have').length + ' · 실패 ' + rs.filter((r) => r === 'fail').length); })
  .catch((err) => { console.warn('[sw 4.89] 화면 조각 미리받기 실패 — 설치는 계속:', err && err.message ? err.message : err); });

// 4.87-10: 미리받기는 20초 안에 끝나지 않으면 접고 설치를 마친다(타임아웃 없는 외부 호출 금지 — 규범 절대 12-6). 4.89: 조각 미리받기도 같은 20초 안이다.
const precacheWithLimit = () => Promise.race([
  precacheShell().then(precacheExtra),
  new Promise((ok) => setTimeout(() => { console.warn('[sw 4.87-10] 새 판 미리받기 20초 초과 — 접고 설치 완료(열 때 통신망에서 받음)'); ok(); }, 20000)),
]);

self.addEventListener('install', (e) => {
  e.waitUntil(precacheWithLimit());   // 4.87-10: 미리받기가 끝난 뒤 설치 완료(실패해도 설치는 끝난다 — 위 catch)
  // 3.60-18 (진단 M35): 콘앱 카고플랜 번들 프리캐시(V7.60)는 뗐다 — 3.60-03 부터 콘앱은 제 워커(cone-sw.js, cone.html 스코프)가 받고
  //   콘앱은 그 파일을 `?v=` 붙여 부르므로 이 키(cone-cargoplan.js)는 맞은 적이 없다. 검수앱 설치마다 1.87MB 를 헛다운로드하던 죽은 코드.
  // TallyOne 1.30: **여기서 즉시 활성화하지 않는다.** 검수사 확정 2026-08-09 —
  //   *"알림을 주고 사용자가 필요할 때 새로 고침 하게 하는 게 좋을듯 합니다."*
  //   현장 작업 중에 앱이 제멋대로 새 판으로 바뀌면 안 된다. 갱신 시점은 검수사가 정한다.
  //
  //   종전 `skipWaiting()` 은 새 워커를 설치 즉시 활성화시켜 **`installed` 상태를 스쳐 지나가게** 했다.
  //   그러면 `reg.waiting` 에도 안 잡히고 `statechange` 의 `installed && controller` 조건도 못 잡아,
  //   UpdatePrompt 가 배너를 띄울 틈이 없다. 곧바로 `activated` 로 가서 1.23이 넣은 정리 코드가 배너를 걷는다.
  //   → **거짓 배너를 없애려던 1.22-01/1.23 수정이 이 줄과 만나 배너를 아예 못 뜨게 만들었다**
  //     (검수사 신고: "어느순간 업데이트 알림 화면이 사라졌습니다").
  //
  //   이제 새 워커는 **waiting 으로 대기**하고, 배너의 [지금 적용] 이 아래 SKIP_WAITING 메시지를 보낸다.
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
// TallyOne 1.22-01: GET_VERSION 추가 — UpdatePrompt 가 "정말 새 버전인가"를 버전으로 판정한다.
//   종전엔 워커가 installed 상태를 스쳐 지나가는 것만 보고 배너를 띄웠다. 그 워커가 곧바로
//   activated 로 넘어가도 배너는 그대로 남았고, 폰(설치된 PWA)은 controllerchange 가 안 와
//   새로고침으로 지워지지도 않아 **1.22 를 돌리면서 "새 버전 출시" 가 영구히 붙어 있었다**
//   (검수사 신고 2026-08-07). 이제 버전이 같으면 배너를 아예 안 띄운다.
self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data.type === 'GET_VERSION') {
    // 조용히 실패하지 않는다 — 포트가 없으면 전체 클라이언트로라도 알린다.
    const payload = { type: 'VERSION', version: VERSION, note: NOTE };
    if (e.ports && e.ports[0]) { try { e.ports[0].postMessage(payload); return; } catch (err) { /* 아래로 */ } }
    self.clients.matchAll().then((cs) => cs.forEach((c) => { try { c.postMessage(payload); } catch (err) {} }));
  }
});

// fetch — network-first 유지 (새 버전 즉시 반영) + 성공 응답을 캐시에 적재.
// V7.35: 기존엔 cache.put이 없어 caches.match 폴백이 항상 실패(죽은 코드)
//   → 오프라인이면 흰 화면. 같은 출처(same-origin) GET 성공분만 캐시에 넣어
//   신호 끊긴 곳(홀드 안 등)에서 마지막 성공본으로 화면 유지.
//   네트워크가 항상 우선이므로 업데이트 즉시 반영 동작은 그대로.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  let sameOrigin = false;
  try { sameOrigin = new URL(e.request.url).origin === self.location.origin; } catch {}
  if (!sameOrigin) return;  // Firebase 등 외부 요청은 관여하지 않음
  //  ★ 4.87-04 (검수사 2026-11-11 13:14 «평택검수» 띠 아래 흰 화면 · 13:22 «지금은 되네요»): 이름에 판 고유 글자가 붙은 본체 파일(assets/이름-해시.js·css)은 내용이 바뀔 수 없다 —
  //    저장본이 있으면 통신망을 기다리지 않고 바로 준다. 종전에는 열 때마다 6MB 본체를 통신망에서 먼저 받으려 했고, 서버가 답을 **시작**하기만 하면 아래 «N초 뒤 저장본» 장치가 풀려
  //    신호가 약한 곳에서 본체가 다 내려올 때까지 흰 화면이었다. 새 판 알림은 sw.js VERSION 으로 따로 확인하므로 업데이트는 늦어지지 않는다. 저장본이 없으면 종전 그대로 통신망.
  const hashedAsset = /\/assets\/[^?]*-[A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(e.request.url);
  const net = () => fetch(e.request)
      .then((res) => {
        //  3.60-06 (진단 M34): 배포 직후 열려 있던 탭이 옛 해시 청크를 부르면 서버는 404 다 — 캐시에 있으면 그것을 준다.
        //    판 번호 확인용 요청(?v= · ?_ck=)은 캐시에 쌓지 않는다(3분마다 한 장씩 자라던 것).
        if (res && !res.ok && /\/assets\//.test(e.request.url)) return caches.match(e.request).then((m) => m || res);
        if (res && res.ok && !/[?&](?:v|_ck|u)=/.test(e.request.url)) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => cachedOf(e.request));
  if (hashedAsset) { e.respondWith(caches.match(e.request).then((m) => m || net())); return; }
  const viaNet = net();
  //  4.82-02: 화면 뼈대(첫 문서·스크립트·스타일)는 네트워크가 NET_WAIT_MS 안에 안 답하면 저장해 둔 마지막 성공본으로 연다 —
  //    신호가 약한 곳에서 응답 없는 요청을 무기한 기다려 «평택검수» 시작 화면 뒤가 흰 바탕으로 멈추던 것(검수사 2026-11-09). 저장본이 없으면 종전처럼 네트워크를 계속 기다린다.
  const core = e.request.mode === 'navigate' || /\/assets\/[^?]*\.(?:js|css)(?:$|\?)/.test(e.request.url);
  if (!core) { e.respondWith(viaNet); return; }
  const waitMs = (typeof self.__NET_WAIT_MS === 'number') ? self.__NET_WAIT_MS : NET_WAIT_MS;
  const timer = new Promise((resolve) => setTimeout(() => resolve(cachedOf(e.request)), waitMs));
  e.respondWith(Promise.race([viaNet, timer]).then((r) => r || viaNet));
});

// ─── TallyOne 1.20: 푸시 알림 ────────────────────────────────────────────────────────
//   수집기가 미회신 오답을 보내면 여기서 받아 알림을 그린다.
//   ⚠ 발신 쪽은 **data-only** 로 보낼 것 — `notification` 블록을 넣으면 브라우저가 자동으로도 띄워
//     알림이 두 번 뜬다. 그래서 여기서 직접 그린다.
//   ⚠ 조용히 실패하지 않는다 — 페이로드를 못 읽어도 기본 문구로라도 띄운다.
//     안 띄우면 "왜 안 오지"가 되고, 원인을 못 찾는다.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? (e.data.json().data || e.data.json() || {}) : {}; }
  catch (err) { try { d = { body: e.data ? e.data.text() : '' }; } catch (e2) { d = {}; } }
  const title = d.title || '평택항 검수';
  const body = d.body || '새 알림이 있습니다.';
  e.waitUntil(self.registration.showNotification(title, {
    body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: d.tag || 'tallyone',        // 같은 tag 는 덮어쓴다 — 같은 알림이 쌓이지 않게
    renotify: true,
    data: { url: d.url || './#/chief' },
    requireInteraction: d.sticky === '1',
  }));
});

// 알림을 누르면 그 화면으로. 이미 열린 탭이 있으면 그 탭을 쓴다(탭이 늘어나지 않게).
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './#/chief';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) { try { await c.navigate(new URL(url, self.location.href).href); } catch (err) {} return c.focus(); }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
