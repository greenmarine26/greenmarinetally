// 주야간 작업보고(📤 작업 보고 → 📋 주야간 작업보고)가 갱별로 나뉘어 그려지는지 실데이터로 재는 연막검사 (TallyOne 3.66).
//
//  왜 있는가 — 검수사 2026-09-28 12:34 *«여기서 보면 갱호수별이 아니고 전체가 보입니다. 갱별로 나누어져 있어야 합니다.»*
//    (캡처 — OBWH 2751E 주간 «양하 작업량 기준 (완료 25 · 잔여 238)» 20ft E1 · 40ft F15 · 45ft F9 — 배 전체 표 하나뿐)
//    관문 4 확정 «갱별 + 배 전체 합계». 계산은 17시 창·보고 보관과 같은 한 벌(utils.buildGangShiftReport — 3.63 «갱별보고여야함»).
//  기준(검수사 규칙) — ①호기마다 카드, 내 갱(앱 호기)이 맨 위 ②배 전체 합계는 카드 아래에 늘 ③못 나누는 배는 이유 + 터미널 호기 집계 대수(지어내지 않는다).
//  자료 — tools/fixtures/daynight_gang_real.json (RTDB 읽기 사본 12:36 · OBWH QC101 25/232 · QC102 6/0 · RZOR QC103 LO/LO · QC105 RO/RO).
process.env.TZ = 'Asia/Seoul';   // 근무·마감은 현장 시각(KST)으로 센다 — 검사가 어느 시각대에서 돌아도 같게
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_daynightgang.cjs <렌더번들.js>'); process.exit(1); }
//  시각 고정 — 자료를 받은 12:36 KST(주간). 보고는 «지금»으로 근무·마감을 고르므로 검사가 언제 돌아도 같게.
const FIX = Date.UTC(2026, 8, 28, 3, 36, 0);
let CLOCK = FIX;
const _now = Date.now; Date.now = () => CLOCK;

const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
global.localStorage = dom.window.localStorage; global.CustomEvent = dom.window.CustomEvent;
global.MouseEvent = dom.window.MouseEvent; global.Event = dom.window.Event;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = clearTimeout;
dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
dom.window.Date.now = () => CLOCK;

let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(String(e.error || e.message)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (el) => el && el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ') : '');

console.log('주야간 작업보고 갱별 (OBWH 2751E · RZOR R106E 09-28 12:36 실자료)');
require(path.resolve(B));
const { setEquipNumber, FF, ferryCutItem, shiftReportKey } = dom.window.__DN;
const doc = dom.window.document;
const openDaynight = async (key, v = null) => {
  dom.window.__open(key, v); await wait(120);
  const b = [...doc.querySelectorAll('button')].find((x) => /주야간 작업보고/.test(x.textContent));
  click(b); await wait(120);
  return !!b;
};
//  표 한 장에서 규격 줄 읽기 — [F, E, TOTAL]
const rowOf = (card, side, size) => {
  const box = [...card.querySelectorAll('div')].find((d) => d.firstElementChild && new RegExp('^' + side).test(txt(d.firstElementChild)) && d.querySelector('table'));
  if (!box) return null;
  const tr = [...box.querySelectorAll('tr')].find((t) => txt(t.firstElementChild) === size);
  return tr ? [...tr.children].slice(1).map((td) => +td.textContent) : null;
};

(async () => {
  await wait(200);
  // ── ① OBWH — 내 갱 1호기 ──
  setEquipNumber('1호기');
  ok(await openDaynight('OBWH_2751E'), '작업 보고 → «📋 주야간 작업보고» 단추');
  const root = doc.querySelector('[data-dn-gang]');
  ok(!!root, '주야간 화면에 갱별 블록이 그려진다');
  const cards = [...doc.querySelectorAll('[data-dn-gang] [data-gang]')];
  ok(cards.map((c) => c.getAttribute('data-gang')).join(',') === '1,2', `호기 카드 1·2 — 내 갱이 먼저 (${cards.map((c) => c.getAttribute('data-gang')).join(',')})`);
  const c1 = cards[0], c2 = cards[1];
  ok(/내 갱/.test(txt(c1)) && !/내 갱/.test(txt(c2)), '1호기에 «내 갱»');
  ok(/작업량 기준 \(완료 25 · 잔여 232\)/.test(txt(c1)), `1호기 양하 «작업량 기준 (완료 25 · 잔여 232)» — 캡처의 25대가 1호기 몫 (${txt(c1).slice(0, 120)})`);
  const r20 = rowOf(c1, '양하', '20ft'), r40 = rowOf(c1, '양하', '40ft'), r45 = rowOf(c1, '양하', '45ft'), rt = rowOf(c1, '양하', '풀엠티토탈');
  ok(String(r20) === '0,1,1' && String(r40) === '15,0,15' && String(r45) === '9,0,9' && String(rt) === '24,1,25', `1호기 규격표 20ft ${r20} · 40ft ${r40} · 45ft ${r45} · 합 ${rt} (캡처와 같음)`);
  ok(/작업 완료 — 보고 제외/.test(txt(c2)) && /양 6\/0/.test(txt(c2)), `2호기 — 6대 끝, 잔여 0 → «작업 완료 — 보고 제외» (${txt(c2).slice(0, 90)})`);
  const ship = doc.querySelector('[data-dn-gang] [data-f1700-ship]');
  ok(!!ship && /배 전체 합계/.test(txt(ship)) && /작업량 기준 \(완료 31 · 잔여 232\)/.test(txt(ship)), `카드 아래 «배 전체 합계» 31 · 잔여 232 (${txt(ship).slice(0, 80)})`);
  ok(String(rowOf(ship, '양하', '40ft')) === '19,0,19' && String(rowOf(ship, '양하', '45ft')) === '11,0,11', '배 전체 합계 40ft 19 · 45ft 11 = 1호기 + 2호기');
  ok(/우현 접안 기준 · 선수 1호기/.test(txt(root)), '«우현 접안 기준 · 선수 1호기» — 눈으로 잡게');
  ok(/선적(은)? 작업 완료|작업 완료 — 보고 제외/.test(txt(ship)), '선적 없는 배 — 배 전체 선적은 작업 완료');
  ok(![...doc.querySelectorAll('button')].some((b) => /카톡 보고\(/.test(b.textContent)) && !root.querySelector('button.bg-yellow-400'), '이 화면의 갱 블록에는 카톡 단추를 새로 안 붙인다(보관 창 단추는 종전 그대로)');
  ok(!!doc.querySelector('[data-f1700-open]'), '«📋 갱별 보고 보관» 단추 그대로');
  ok([...doc.querySelectorAll('table')].filter((t) => !t.closest('[data-dn-gang]')).length === 0, '종전 배 전체 표(단독)는 갱별이 되면 안 그린다 — 합계는 블록 안에 한 번');

  // ── ② 내 갱 2호기 ──
  setEquipNumber('2호기');
  await openDaynight('OBWH_2751E');
  const cards2 = [...doc.querySelectorAll('[data-dn-gang] [data-gang]')];
  ok(cards2.map((c) => c.getAttribute('data-gang')).join(',') === '2,1' && /내 갱/.test(txt(cards2[0])), '앱 호기가 2호기면 2호기 카드가 먼저 · «내 갱»');

  // ── ③ 야간 버튼 ──
  const nb = [...doc.querySelectorAll('button')].find((b) => /야간보고/.test(b.textContent));
  click(nb); await wait(120);
  const rootN = doc.querySelector('[data-dn-gang]');
  ok(!!rootN && [...rootN.querySelectorAll('[data-gang]')].length === 2, '야간을 누르면 야간 마감(오늘 05:30) 기준으로 다시 센다 — 카드 둘 그대로');
  //  2차 감사 — 카드 수만 보면 야간 전환을 빼도 통과했다. 숫자로 잡는다(05:30 에는 이 배가 한 대도 안 끝냈다).
  const n1 = rootN.querySelector('[data-gang="1"]'), n2 = rootN.querySelector('[data-gang="2"]');
  ok(/완료 0 · 잔여 257/.test(txt(n1)) && /완료 0 · 잔여 6/.test(txt(n2)) && /완료 0 · 잔여 263/.test(txt(rootN.querySelector('[data-f1700-ship]'))), `야간(05:30 마감) 숫자 — 1호기 0/257 · 2호기 0/6 · 배 0/263 (${[n1, n2].map((c) => txt(c).slice(0, 70)).join(' | ')})`);
  ok(/09-27 야간 · 익일 05:30 마감/.test(txt(rootN)) && /다시 센 값/.test(txt(rootN)), '지난 근무(야간)는 마감 표시 · 적어 둔 보고가 없으니 «다시 센 값»이라고 밝힌다');
  const db2 = [...doc.querySelectorAll('button')].find((b) => /주간보고/.test(b.textContent));
  click(db2); await wait(120);
  ok(/완료 25 · 잔여 232/.test(txt(doc.querySelector('[data-dn-gang] [data-gang="1"]'))), '주간으로 돌아오면 다시 25/232');

  // ── ④ RZOR — 갱을 못 나누는 배 ──
  setEquipNumber('5호기');
  await openDaynight('RZOR_R106E');
  const rz = doc.querySelector('[data-dn-gang]');
  ok(!!rz && /안벽 순서에 없는 호기/.test(txt(rz)), `RZOR — 못 나누는 이유를 밝힌다 (${txt(rz).slice(0, 110)})`);
  const rc = [...rz.querySelectorAll('[data-gang]')];
  ok(rc.map((c) => c.getAttribute('data-gang')).join(',') === '5,3' && /내 갱/.test(txt(rc[0])), 'RZOR 호기 카드 5·3 — 내 갱 5호기 먼저');
  ok(/터미널 호기 집계\(규격표 없음\)/.test(txt(rc[0])) && /완료 2 · 잔여 88/.test(txt(rc[0])), `5호기 — 터미널 호기 집계 대수만(완료 2 · 잔여 88) (${txt(rc[0]).slice(0, 120)})`);
  const rship = rz.querySelector('[data-f1700-ship]');
  ok(!!rship && /배 전체/.test(txt(rship)) && !/배 전체 합계/.test(txt(rship)) && /잔여 기준 \(완료 101 · 잔여 90\)/.test(txt(rship)), `RZOR 배 전체 표(규격표) 그대로 (${txt(rship).slice(0, 90)})`);

  // ── ⑤ 마감 뒤 — 17시 창·보고 보관과 같은 한 벌(2차 감사 중요 1) · OBWH 2749E 09-26 실자료 사본 ──
  const W = JSON.parse(JSON.stringify(FF.voyages.OBWH_2749E));
  const k17 = Date.UTC(2026, 8, 26, 8, 0, 0);   // 09-26 17:00 KST
  setEquipNumber('1호기');
  CLOCK = k17 + 5 * 60000;   // 17:05 — 자동 선택이 지난 주간(17:00 마감)
  await openDaynight('OBWH_2749E', W);
  const p5 = doc.querySelector('[data-dn-gang]');
  ok(!!p5 && /09-26 주간 · 17:00 마감/.test(txt(p5)) && !/다시 센 값/.test(txt(p5)), `17:05 — «09-26 주간 · 17:00 마감» 보고 · 마감 8분 안이라 «다시 센 값» 표시 없음 (${txt(p5).slice(0, 80)})`);
  const cut = { shift: '주간', cutMs: k17, key: shiftReportKey('주간', k17) };
  ok(cut.key === '2026-09-26_주간', `마감 열쇠 ${cut.key} — 17시 창·보관과 같은 꼴`);
  const it5 = ferryCutItem('OBWH_2749E', W, cut, CLOCK);
  const g5 = [...p5.querySelectorAll('[data-gang]')].map((c) => txt(c).replace(/터미널\S* /, ''));
  //  적어 두기 — 17시 창이 적는 모양 그대로({at, qcWork, rep} · null·NaN 은 뺀다)
  const stored = JSON.parse(JSON.stringify(it5.rep, (kk, vv) => (vv === null || (typeof vv === 'number' && !Number.isFinite(vv)) ? undefined : vv)));
  const W2 = JSON.parse(JSON.stringify(W)); W2.info.shiftReports = { [cut.key]: { at: CLOCK, qcWork: W.info.qcWork, rep: stored } };
  CLOCK = k17 + 20 * 60000;  // 17:20
  await openDaynight('OBWH_2749E', W2);
  const p20 = doc.querySelector('[data-dn-gang]');
  const g20 = [...p20.querySelectorAll('[data-gang]')].map((c) => txt(c).replace(/터미널\S* /, ''));
  ok(/터미널\(17:05\)/.test(txt(p20)) && !/다시 센 값/.test(txt(p20)), '17:20 — 적어 둔 보고(17:05)를 그대로 보인다 · 호기 옆에 «터미널(17:05)»');
  ok(g20.join('|') === g5.join('|') && g20.length >= 2, `적어 둔 보고의 갱 숫자 = 17:05 에 본 숫자 (${g20.map((x) => x.slice(0, 40)).join(' / ')})`);
  await openDaynight('OBWH_2749E', W);
  ok(/다시 센 값/.test(txt(doc.querySelector('[data-dn-gang]'))), '17:20 · 적어 둔 보고 없음 — 마감 시각으로 다시 세고 «⚠ 다시 센 값»이라고 밝힌다');

  ok(!errs.length, `화면 오류 없음 ${errs.slice(0, 2).join(' | ')}`);
  Date.now = _now;
  console.log(`\n주야간 작업보고 갱별 ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('✗ 검사 자체가 죽었습니다 —', e); process.exit(1); });
