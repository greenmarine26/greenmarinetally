// 시작보고에서 고른 호기가 곧 «앱 호기»(컨을 찍을 때 박히는 호기)인지 실제로 그려 재는 연막검사 (TallyOne 3.36).
//
//  왜 있는가 — 검수사 메모 2026-09-06 21:27 *«약간의 버그 **4호기로 양하시작보고를 하고 3호기로 양하를 하는데 제재가 없음**»*.
//  실사건 — `archive/ATPR_2640E` 09-06 20:45:33 «4호기 양하 시작» 뒤, 같은 김성일이 21:10~21:24 **3호기**로 20대를 찍었다(메모 2분 전).
//  뿌리는 두 값이 **따로 놀았다**는 것이다 — 시작 화면의 호기는 이 창의 state 이고,
//  컨을 찍을 때 박히는 호기는 `localStorage.gm_equip_no` 인데 서로 한 번도 안 만났다(전수 grep — 이 파일에 setEquipNumber 0건이었다).
//
//  검수사 확답 2026-09-09 — *«보고 호기를 따라간다 — **갱진행상황에 따라 검수사 스스로 호기를 바꿀수 있다**»*.
//  ⛔ 그래서 **막지도 되묻지도 않는다.** 2·3갱 동시작업이 정상이다 — 보관·활성 **274항차** 중 시작보고와
//  사람 기록이 둘 다 있어 대조되는 것은 9항차뿐이고, 그 어긋남 대부분이 정상 동시작업이다(감사 지적으로 «9건 중 7건» 이라는
//  첫 셈은 규칙에 따라 6~7로 흔들려 지웠다).
//     이 검사가 재는 것은 «막는가»가 아니라 «두 값이 한 벌인가» 하나다.
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_equipone.cjs <렌더번들.js>'); process.exit(1); }

const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
//  ⚠ 번들 안 `localStorage`·`CustomEvent` 는 **전역**을 본다 — 창 것만 놓으면 앱 호기가 딴 데 저장돼 검사가 헛돈다(실측).
global.localStorage = dom.window.localStorage; global.CustomEvent = dom.window.CustomEvent;
global.MouseEvent = dom.window.MouseEvent; global.Event = dom.window.Event;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = clearTimeout;
dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
//  앱 호기는 localStorage 한 곳에 산다 — jsdom 것을 그대로 쓴다(스텁을 따로 만들면 판정이 두 벌이 된다).
dom.window.localStorage.setItem('gm_equip_no', '3호기');   // 헤더에서 미리 3호기를 골라 둔 상태
dom.window.__SMOKE_LAST = '1호기';                          // 옛 기본값(lastEquip) — 이것이 이기면 안 된다

let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(String(e.error || e.message)));

console.log('시작보고 호기 = 앱 호기 (ATPR 2640E 모양)');
require(path.resolve(B));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await wait(700);
  ok(errs.length === 0, `그리는 중 오류가 없다 (${errs.length}건)` + (errs.length ? ' | ' + errs[0].slice(0, 140) : ''));
  const doc = dom.window.document;
  const eq = () => dom.window.localStorage.getItem('gm_equip_no');
  const click = async (el) => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await wait(200); };

  //  창은 여러 갈래(새 작업 시작 · 해치커버 · 콘박스 …)로 열린다 — «새 작업 시작» 을 눌러야 장비 단추가 나온다.
  const tab = [...doc.querySelectorAll('button')].find(b => /새 작업 시작/.test(b.textContent || ''));
  ok(!!tab, '«새 작업 시작» 갈래가 있다');
  if (tab) await click(tab);
  const btns = () => [...doc.querySelectorAll('button')].filter(b => /^🏗\s*\d호기$/.test((b.textContent || '').trim()));
  ok(btns().length >= 2, `장비 단추를 그렸다 (${btns().length}개)` + (btns().length ? ' — ' + btns().map(b => b.textContent.trim()).join(' ') : ''));

  //  ① 창을 열면 **지금 앱 호기**가 골라져 있어야 한다(옛 lastEquip 이 아니라).
  const picked = () => ((btns().find(b => /border-orange-300/.test(b.className)) || {}).textContent || '없음').trim();
  ok(/3호기/.test(picked()), `창을 열면 지금 앱 호기(3호기)가 골라져 있다 — 골라진 것 «${picked()}»`);

  //  ② 다른 호기를 고르면 **앱 호기도 같이 바뀐다**.
  let fired = null;
  dom.window.addEventListener('equipChanged', (e) => { fired = e.detail; });
  const four = btns().find(b => /4호기/.test(b.textContent));
  ok(!!four, '4호기 단추가 있다');
  if (four) {
    await click(four);
    ok(eq() === '4호기', `4호기를 고르니 앱 호기도 4호기가 됐다 (지금 «${eq()}»)`);
    ok(fired === '4호기', `호기가 바뀌었다는 알림(equipChanged)을 냈다 — 컨 찍는 화면이 그 알림을 듣는다 (받은 값 «${fired}»)`);
    ok(/4호기/.test(picked()), `화면에도 4호기가 골라져 보인다 — 골라진 것 «${picked()}»`);
  }

  //  ③ **막지 않는지 실제로 눌러 본다.** 종전엔 정규식 하나(«문구에 «호기» 가 있는 alert/confirm»)로만 봐서,
  //     문구를 바꾸거나 조기 return 을 넣는 차단을 그대로 통과시켰다(감사 실측 B4·B5).
  //  ⚠ 카톡 공유는 `alert` 로 문구를 내보인다(shareText) — 그것은 «막는 것»이 아니다.
  //    그래서 **문구에 «호기·장비» 가 든 물음만** 센다. 전역과 창 둘 다 갈아 끼운다(번들은 전역을 본다).
  let asked = 0;
  //  카톡 공유창(«아래 메시지를 카톡에 복사하세요»)은 보고 **문구를 보여 주는** 것이라 막는 것이 아니다.
  const isBlock = (m) => { const t = String(m || ''); return /호기|장비/.test(t) && !/카톡에 복사/.test(t); };
  let shared = 0;
  const A = (m) => { if (isBlock(m)) asked++; else if (/카톡에 복사/.test(String(m || ''))) shared++; };
  const C = (m) => { if (isBlock(m)) asked++; return true; };
  dom.window.alert = A; dom.window.confirm = C; global.alert = A; global.confirm = C;
  const go = [...doc.querySelectorAll('button')].find(b => /시작/.test(b.textContent || '') && /카톡|보고/.test(b.textContent || ''));
  ok(!!go, '«시작» 단추가 있다' + (go ? ` — «${go.textContent.trim().slice(0, 24)}»` : ''));
  if (go) {
    await click(go);
    ok(asked === 0, `시작보고가 되묻지도 막지도 않는다 (물어본 횟수 ${asked})`);
    //  ⚠ «잠기지 않았다»만 보면 조건부 `disabled` 나 조기 `return` 을 못 잡는다(감사 실측 B5).
    //    **보고가 실제로 나갔는지**로 잰다 — 카톡 공유창이 뜨면 `handleStartWork` 가 끝까지 간 것이다.
    ok(!go.disabled, '시작 단추가 잠기지 않았다');
    ok(shared > 0, `시작보고가 실제로 나갔다 — 카톡 공유창까지 갔다 (${shared}회)`);
  }

  //  ④ **헤더 배지도 따라가는가.** 이 판의 수리 하나가 «헤더가 호기 바뀜을 듣는다» 인데
  //     종전 검사는 헤더를 아예 안 그려 리스너를 지워도 초록이었다(감사 실측 B6).
  const badge = () => (doc.querySelector('#smokeHeaderEquip') || {}).textContent || '';
  ok(/4호기/.test(badge()), `헤더 배지도 4호기로 따라왔다 — 보이는 것 «${badge().trim() || '없음'}»`);
  const HSRC = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/Header.jsx'), 'utf8');
  ok(/addEventListener\('equipChanged'/.test(HSRC) && /removeEventListener\('equipChanged'/.test(HSRC),
     '헤더가 호기 바뀜을 듣고, 떠날 때 치운다');

  //  ⑤ 소스 모양 — 되묻기·차단이 새로 생겼는지도 같이 본다(검수사 확답 «스스로 바꿀 수 있다»).
  console.log('\n  ■ 소스 모양');
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/WorkReportModal.jsx'), 'utf8');
  ok(/getEquipNumber\(\) \|\| lastEquip/.test(SRC), '첫 값을 앱 호기에서 잡는다');
  ok(/if \(!open\) return;\s*\n\s*const now = getEquipNumber\(\);/.test(SRC), '창을 열 때마다 지금 앱 호기로 다시 맞춘다(첫 마운트 값이 굳지 않는다)');
  ok(/setSelectedEquip\(n\); setEquipNumber\(n\);/.test(SRC), '단추를 고르면 앱 호기도 같이 바꾼다');
  ok(!/(confirm|alert|window\.confirm)\s*\([^)]*호기/.test(SRC), '호기가 다르다고 되묻거나 막지 않는다 — 갱이 바뀌면 검수사가 스스로 바꾼다');

  console.log(fail ? `\n⛔ 호기 한 벌 검사 실패 ${fail}건` : `\n✅ 시작보고 호기 = 앱 호기 — ${pass}항 통과`);
  process.exit(fail ? 1 : 0);
})();
