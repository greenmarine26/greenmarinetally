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
const { setEquipNumber, FF, FO, ferryCutItem, shiftReportKey, ferryRepShapeOk, buildFerry1700Message, buildGangShiftReport, pagesOf } = dom.window.__DN;
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
  //  4.20 (Fable 판정 ④ · 회귀 기준표 R23): 평택 양하분은 컨번호 한 벌 — 종전 잔여 90 은 EDI 자리표시 키 __SLOT___ 와 records SAWTBP004 를 두 번 센 191 기준이었다(유닛 190 − 완료 101 = 89).
  ok(!!rship && /배 전체/.test(txt(rship)) && !/배 전체 합계/.test(txt(rship)) && /잔여 기준 \(완료 101 · 잔여 89\)/.test(txt(rship)), `RZOR 배 전체 표(규격표) 그대로 (${txt(rship).slice(0, 90)})`);

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

  // ── ⑥ 3.66-02 — 붙인 완료를 못 믿어도 «잔여» 기준 갱은 규격표(검수사 16:04 «규격표가 없으면 어떻게 주간보고를 할수있죠?») ──
  //    OBWH 2751E 16:12 사본 — 위치로 붙인 완료 85/81 ↔ 터미널 96/70(11%)라 종전엔 두 갱 다 «대수만». 두 갱 모두 잔여 기준(43·54)이다.
  //    동방 베이별 잔여(bayWork)로 보면 1호기 43 = 02·06·10번 장(14+28+1) · 2호기 54 = 14·18번 장(46+8) — 앱 잔여 97 = 터미널 97.
  setEquipNumber('1호기');
  CLOCK = FO.at;
  await openDaynight('OBWH_2751E', JSON.parse(JSON.stringify(FO.OBWH_2751E)));
  const p6 = doc.querySelector('[data-dn-gang]');
  const c61 = p6 && p6.querySelector('[data-gang="1"]'), c62 = p6 && p6.querySelector('[data-gang="2"]');
  const tot6 = (c) => { const box = c && [...c.querySelectorAll('div')].find((d) => d.querySelector('table')); const tr = box && [...box.querySelectorAll('tr')].find((t) => /풀엠티토탈/.test(txt(t))); return tr ? +txt(tr.lastElementChild) : -1; };
  ok(!!c61 && !!c62 && /잔여 기준/.test(txt(c61)) && /잔여 기준/.test(txt(c62)) && !/규격표 없음/.test(txt(c61) + txt(c62)),
    `두 갱 모두 «잔여 기준» 규격표 — «규격표 없음» 아님 (${txt(c61).slice(0, 60)} / ${txt(c62).slice(0, 60)})`);
  ok(tot6(c61) === 43 && tot6(c62) === 54, `갱별 잔여 = 터미널 호기별 잔여 43 · 54 (표 ${tot6(c61)} · ${tot6(c62)})`);
  ok(/잔여 기준 \(완료 96 · 잔여 43\)/.test(txt(c61)) && /잔여 기준 \(완료 70 · 잔여 54\)/.test(txt(c62)), '완료 대수는 터미널 값(96·70 — 위치로 붙인 85·81 이 아니다)');
  //  구성 — 규칙(남은 컨을 장별로: 02·06·10번 장 = 1호기, 14·18번 장 = 2호기)에서 따로 뽑은 값(감사 실측)
  ok(JSON.stringify([rowOf(c61, '양하', '20ft'), rowOf(c61, '양하', '40ft'), rowOf(c62, '양하', '20ft'), rowOf(c62, '양하', '40ft')]) === '[[23,0,23],[20,0,20],[38,0,38],[16,0,16]]',
    `규격 구성이 장별 규칙과 같다 — 1호기 20ft 23·40ft 20 · 2호기 20ft 38·40ft 16 (${JSON.stringify([rowOf(c61, '양하', '20ft'), rowOf(c61, '양하', '40ft'), rowOf(c62, '양하', '20ft'), rowOf(c62, '양하', '40ft')])})`);
  ok(/터미널\(16:12\) QC101 양 96\/43/.test(txt(c61)) && /터미널\(16:12\) QC102 양 70\/54/.test(txt(c62)), `3.66-03 카드 머리 = 본문과 같은 호기 표·그 시각 (${(txt(c61).match(/터미널[^양]*양 [0-9/]+/) || [''])[0]})`);
  ok(/완료\(작업량\) 기준 갱은 대수만/.test(txt(p6)) && /잔여 기준 갱은 남은 컨을 선수 호기부터 터미널 호기별 잔여 비율로 나눈 규격표/.test(txt(p6)),
    '⚠ 붙인 완료를 못 믿는 이유와 잔여 표의 출처를 밝힌다');
  const bw = FO.OBWH_2751E.discharge.bayWork; const bwSum = Object.values(bw).reduce((a, x) => a + (x.aft || 0), 0);
  ok(bwSum === 97 && (bw['02'].aft + bw['06'].aft + bw['10'].aft) === 43 && (bw['14'].aft + bw['18'].aft) === 54,
    `동방 베이별 잔여로 검산 — 선수 쪽 02·06·10 = 43(1호기) · 14·18 = 54(2호기) · 합 ${bwSum}`);

  // ── ⑦ 3.66-02 감사 — 굳힌 호기 표(qcSnap)·작업량 기준 갱 섞임·잔여 합 문지기 ──
  {
    const base = FO.OBWH_2751E; const pg = pagesOf(base); const k17 = Date.UTC(2026, 8, 28, 8, 0, 0);
    //  (a) 18:30 에 다시 센다 — 지금 호기 표는 다 끝났고(139/0 · 124/0) 17:01 에 굳힌 표는 96/43 · 70/54. 17:00 잔여 43 이 살아야 한다.
    const va = JSON.parse(JSON.stringify(base)); va.info.qcWork.QC101 = { ...va.info.qcWork.QC101, disDone: 139, disRest: 0 }; va.info.qcWork.QC102 = { ...va.info.qcWork.QC102, disDone: 124, disRest: 0 };
    const ra = buildGangShiftReport(va, pg, k17 + 90 * 60000, { shift: '주간', cutMs: k17, qcSnap: { at: k17 + 60000, qcWork: base.info.qcWork } });
    const a1 = ra.gangs.find((g) => g.no === 1).discharge;
    ok(ra.doneUnsure && !a1.countsOnly && a1.basis === '잔여' && a1.doneTotal === 96 && a1.total.total === 43, `다시 세기 — 굳힌 호기 표로 «잔여 43 (완료 96)» (${a1.basis} ${a1.total && a1.total.total} · 완료 ${a1.doneTotal})`);
    //  (b) 2호기가 작업량 기준(60/64)이면 2호기는 대수만 — 배 전체 규격표를 같이 붙인다(화면·카톡)
    const vb = JSON.parse(JSON.stringify(base)); vb.info.qcWork.QC102 = { ...vb.info.qcWork.QC102, disDone: 60, disRest: 64 };
    const rb = buildGangShiftReport(vb, pg, FO.at, { shift: '주간' });
    const b1 = rb.gangs.find((g) => g.no === 1).discharge, b2 = rb.gangs.find((g) => g.no === 2).discharge;
    ok(rb.doneUnsure && !b1.countsOnly && b1.tbl && b2.countsOnly && b2.basis === '작업량' && rb.shipTable === true, `작업량 기준 갱은 대수만 · 잔여 기준 갱은 표 · 배 전체 표 붙임(shipTable) — 1호기 ${b1.basis} ${b1.total.total} · 2호기 ${b2.basis} ${b2.total.total}`);
    const msg = buildFerry1700Message({ vsl: 'OBWH', voy: '2751E', rep: rb });
    ok(/▶ 배 전체/.test(msg) && /\(대수만 나간 갱은 터미널 호기 집계 대수\)/.test(msg) && !/갱별 규격표 없음/.test(msg) && /20ft/.test(msg), '카톡 — 배 전체 표와 «(대수만 나간 갱은 터미널 호기 집계 대수)» 가 붙고 «규격표 없음» 이라 하지 않는다');
    const msg1 = buildFerry1700Message({ vsl: 'OBWH', voy: '2751E', rep: rb, gangNos: [1] });
    ok(/▶ 배 전체/.test(msg1) && !/대수만 나간 갱은|규격표 없음/.test(msg1), '3.66-03 내 갱(표 있음)만 보낼 때 — 배 전체는 붙고 괄호 문구는 없다(남의 갱 사정을 내 갱처럼 말하지 않는다)');
    const stored = JSON.parse(JSON.stringify(rb, (kk, vv) => (vv === null || (typeof vv === 'number' && !Number.isFinite(vv)) ? undefined : vv)));
    ok(ferryRepShapeOk(stored), '보고 보관(RTDB 왕복 모양)이 새 칸(doneUnsure·shipTable)과 섞인 갱 모양을 받아들인다');
    //  (c) 남은 컨 자리를 모르면(잔여 표 합 ≠ 터미널 잔여) 대수만 — 표를 지어내지 않는다
    const vc = JSON.parse(JSON.stringify(base)); const comp = vc.discharge.completed || {};
    for (const [cn, e] of Object.entries(vc.discharge.ediContainers)) if (!comp[cn]) { e.bay = ''; e.row = ''; e.tier = ''; }
    const rc = buildGangShiftReport(vc, pg, FO.at, { shift: '주간' });
    ok(rc.gangs.every((g) => g.discharge.countsOnly) && /맞지 않는 갱도 대수만/.test(rc.why), `잔여 표 합이 터미널 잔여와 안 맞으면 대수만 — «${rc.why.slice(-30)}»`);
    const mc = buildFerry1700Message({ vsl: 'OBWH', voy: '2751E', rep: rc });
    ok(/\(갱별 규격표 없음 — 터미널 호기 집계 대수\)/.test(mc) && !/작업량 기준 갱은/.test(mc) && /▶ 배 전체/.test(mc), '3.66-03 카톡 — 표가 하나도 없으면 «(갱별 규격표 없음 …)» (잔여 기준인데 «작업량 기준 갱은» 이라 하지 않는다)');
    //  (d) 3.66-03 감사 권장 — 실제 다시 세기 모양: 마감 뒤 1호기가 02·06·10번 장 43대를, 2호기가 14번 장 8대를 끝냈다(실적·완료에 넣음). 18:30 에 스냅으로 다시 센다.
    const vd = JSON.parse(JSON.stringify(base)); const dc = vd.discharge; dc.completed = dc.completed || {}; dc.termWork = dc.termWork || {};
    const rest = Object.values(dc.ediContainers).filter((e) => !dc.completed[e.cn]).sort((x, y) => (+x.bay) - (+y.bay) || (+y.tier) - (+x.tier) || (x.cn < y.cn ? -1 : 1));
    const r1 = rest.filter((e) => +e.bay <= 11), r2 = rest.filter((e) => +e.bay >= 13 && +e.bay <= 15).slice(0, 8);
    const put = (e, at) => { dc.completed[e.cn] = { at, by: '', src: 'term' }; dc.termWork[e.cn] = { at, fe: e.fe, op: e.op, pos: String(e.bay).padStart(2, '0') + String(e.row).padStart(2, '0') + String(e.tier).padStart(2, '0'), src: 'pnct' }; };
    r1.forEach((e, i) => put(e, k17 + (5 + i) * 60000)); r2.forEach((e, i) => put(e, k17 + (5 + i) * 60000 + 30000));
    vd.info.qcWork.QC101 = { ...vd.info.qcWork.QC101, disDone: 96 + r1.length, disRest: 43 - r1.length }; vd.info.qcWork.QC102 = { ...vd.info.qcWork.QC102, disDone: 70 + r2.length, disRest: 54 - r2.length };
    const rd = buildGangShiftReport(vd, pg, k17 + 90 * 60000, { shift: '주간', cutMs: k17, qcSnap: { at: k17 + 60000, qcWork: base.info.qcWork } });
    const d1 = rd.gangs.find((g) => g.no === 1).discharge, d2 = rd.gangs.find((g) => g.no === 2).discharge;
    ok(r1.length === 43 && r2.length === 8 && !d1.countsOnly && d1.total.total === 43 && d1.doneTotal === 96 && !d2.countsOnly && d2.total.total === 54 && d2.doneTotal === 70,
      `마감 뒤 실적 51대가 섞여도 스냅으로 17:00 잔여 43 · 54 (1호기 ${d1.countsOnly ? '대수만' : d1.total.total} · 2호기 ${d2.countsOnly ? '대수만' : d2.total.total})`);
    ok(rd.gangs.every((g) => g.qcNow && g.qcNow.disRest === (g.no === 1 ? 43 : 54)), '카드 머리도 스냅 값(지금 0 · 46 이 아니다)');
  }

  ok(!errs.length, `화면 오류 없음 ${errs.slice(0, 2).join(' | ')}`);
  Date.now = _now;
  console.log(`\n주야간 작업보고 갱별 ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('✗ 검사 자체가 죽었습니다 —', e); process.exit(1); });
