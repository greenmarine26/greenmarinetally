// 콘앱 약신호 연막검사 — **화면이 영영 멈추지 않는가.**
//
// 왜 있는가 (검수사 2026-08-26 — *«콘앱이 나는 되는데 다른 사람은 화면이 멈춰서 작동을 안함»*).
//   Firebase 조회 10곳 전부 타임아웃이 없었다. `fetch` 는 신호가 약해 응답이 안 오면
//   실패도 성공도 하지 않고 **영원히 매달린다.** 그러면 `showLoading()` 이 그려 둔
//   「불러오는 중…」 이 그대로 남는다 — 그것이 「화면이 멈췄다」의 정체다.
//   ⚠ 에러 처리는 원래 잘 돼 있었다(try/catch + friendlyErr + render). fetch 가 **실패조차 안 해서**
//     그 코드에 닿지 못했을 뿐이다. 그래서 타임아웃 하나로 이미 있는 안내가 전부 살아난다.
//   ★ 검수사가 못 겪은 이유 — 사무실은 빠르다. 배 안에서만 걸린다.
//     V7.61 주석이 이 현상을 이미 적어 두고 **데이터 양만 줄였다**(타임아웃은 그때도 안 넣었다).
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');
const SRC = path.resolve(__dirname, '..', 'public', 'cone.html');
const html = fs.readFileSync(SRC, 'utf8');

let bad = 0;
const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };

// ① 생 fetch 가 남아 있으면 그 경로는 여전히 영영 매달린다 — 전수로 막는다.
const rawFb = (html.match(/fetch\(`\$\{FB_BASE\}/g) || []).length;
T(rawFb === 0, `FB_BASE 를 직접 부르는 생 fetch 가 ${rawFb}곳 남아 있다 — 그 경로는 타임아웃이 없다`);
const wrapped = (html.match(/await fbFetch\(`/g) || []).length;
T(wrapped >= 10, `fbFetch 호출이 ${wrapped}곳뿐이다 — 10곳이어야 한다(조회 경로 전부)`);

// ② 인라인 script 문법
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, n = 0;
while ((m = re.exec(html))) {
  n++;
  if (!m[1].trim()) continue;
  try { new vm.Script(m[1], { filename: `cone.html#script${n}` }); }
  catch (e) { bad++; console.error(`  ✗ script#${n} 문법 오류: ${e.message.split('\n')[0]}`); }
}

// ③ ★ 실제로 매달리는 서버에 붙여 본다 — 코드는 소스에서 그대로 꺼낸다(베껴 적지 않는다).
const grab = html.match(/const FB_TIMEOUT_MS = \d+;[\s\S]*?\n}\n/);
T(!!grab, 'fbFetch 를 소스에서 못 찾았다 — 이름이 바뀌었나?');
if (!grab) { console.error('✗ 콘앱 약신호 연막검사 실패'); process.exit(1); }

const srv = http.createServer(() => { /* 일부러 응답하지 않는다 — 배 안 약신호 */ });
srv.listen(0, async () => {
  const FB_BASE = 'http://127.0.0.1:' + srv.address().port;
  const code = grab[0].replace(/const FB_TIMEOUT_MS = \d+;/, 'const FB_TIMEOUT_MS = 1200;');
  const fbFetch = new Function('FB_BASE', 'fetch', 'AbortController', 'setTimeout', 'clearTimeout', 'Promise',
    code + '; return fbFetch;')(FB_BASE, fetch, AbortController, setTimeout, clearTimeout, Promise);
  const t0 = Date.now();
  try {
    await fbFetch('voyages.json?shallow=true');
    bad++; console.error('  ✗ ⛔ 응답 없는 서버인데 그냥 통과했다 — 타임아웃이 안 걸린다');
  } catch (e) {
    const ms = Date.now() - t0;
    T(ms < 8000, `포기까지 ${ms}ms 걸렸다 — 너무 길다. 검수원은 그 사이 멈춘 줄 안다`);
    T(ms > 2000, `${ms}ms 만에 포기했다 — 너무 짧다. 느린 신호에서 될 것도 안 된다`);
    //  friendlyErr 가 이 문구를 보고 «인터넷 연결을 확인…» 안내를 낸다. 문구가 바뀌면 안내가 죽는다.
    T(/network|failed to fetch/i.test(e.message),
      `friendlyErr 가 못 알아듣는 메시지다: ${e.message}`);
    T(/신호가 약해|연결되지 않았습니다/.test(e.message), `사람이 읽을 이유가 없다: ${e.message}`);
  }
  srv.close();
  if (bad) { console.error(`✗ 콘앱 약신호 연막검사 실패 ${bad}건`); process.exit(1); }
  console.log(`✓ 콘앱 약신호 연막검사 통과 (생 fetch 0 · 래퍼 ${wrapped}곳 · 문법 ${n} · 실제 타임아웃 4)`);
});
