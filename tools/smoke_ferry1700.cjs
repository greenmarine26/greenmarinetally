// 카페리 17:00 주간 작업보고(갱별) 연막검사 — 계산 한 벌(utils)과 알림 창을 보관 실데이터로 잰다 (TallyOne 3.63).
//
//  왜 있는가 — 검수사 2026-09-27 «그 보고를 자동으로 음성과 함께 시간이 도래하면 화면에 띄워줄수 있나요. 대상은 TNJP OBWH RZOR 3척입니다» ·
//    «두군데 검수앱 수석대쉬보드에 뜨게 해주고 검수앱 작업중인 검수원에 카톡보고 버튼추가» · «갱별보고여야함» · «갱별 규격표까지».
//  픽스처 tools/fixtures/ferry1700.json — archive OBWH_2749E·OBWH_2747E·RZOR_R104E 를 17:00:30 상태로 자른 것(qcWork 는 재구성, _note 참고).
//  기준표는 코드가 낸 값이 아니라 규칙에서 뽑았다 — ①갱 합 = 배 전체 ②갱마다 적은 쪽 ③RZOR(5호기 RO/RO)는 대수만 ④17:00~17:29 에만 ⑤하루 한 번.
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_ferry1700.cjs <렌더번들.js>'); process.exit(1); }
process.env.TZ = 'Asia/Seoul';
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
global.localStorage = dom.window.localStorage; global.CustomEvent = dom.window.CustomEvent;
global.MouseEvent = dom.window.MouseEvent; global.Event = dom.window.Event;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = clearTimeout;
dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
const spoken = [];
dom.window.speechSynthesis = { speak: (u) => spoken.push(u && u.text), cancel() {}, getVoices: () => [], speaking: false, pending: false, addEventListener() {}, removeEventListener() {} };
dom.window.SpeechSynthesisUtterance = function (t) { this.text = t; };
global.speechSynthesis = dom.window.speechSynthesis; global.SpeechSynthesisUtterance = dom.window.SpeechSynthesisUtterance;

const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/ferry1700.json'), 'utf8'));
dom.window.__fbShipBayDict = FX.dict;   // 보관소 베이사전(OBWH) — getShipBayDictData 가 읽는 자리
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(String(e.error || e.message)));
require(path.resolve(B));
const F = dom.window.__F;
const V = FX.voyages;
const clone = (o) => JSON.parse(JSON.stringify(o));
const at = (v, hh, mm, ss = 0) => { const d = new Date(v._now); d.setHours(hh, mm, ss, 0); return d.getTime(); };
const pagesOBWH = F.buildBayPagesFromSummary(FX.dict.OBWH.bayDef);

console.log('① 창을 띄울 때 — 17:00:00 ~ 17:29:59 · 대상 3척 · 오늘 일한 배 · 두 쪽 다 끝났으면 안 뜸');
const w = V.OBWH_2749E;
ok(F.ferry1700Due(w, at(w, 17, 0, 0), 'OBWH_2749E') === true, '17:00:00 에 뜬다');
ok(F.ferry1700Due(w, at(w, 16, 59, 59), 'OBWH_2749E') === false, '16:59:59 에는 안 뜬다');
ok(F.ferry1700Due(w, at(w, 17, 29, 59), 'OBWH_2749E') === true, '17:29:59 까지 뜬다');
ok(F.ferry1700Due(w, at(w, 17, 30, 0), 'OBWH_2749E') === false, '17:30:00 부터는 안 뜬다(보고는 17:30 전)');
ok(F.ferry1700Due(w, at(w, 17, 5) + 86400000, 'OBWH_2749E') === false, '다음 날 17:05 — 그날 한 일이 없으면 안 뜬다');
{ const x = clone(w); x.info.vsl = 'ATPR'; ok(F.ferry1700Due(x, at(w, 17, 5), 'ATPR_2643E') === false, '대상 밖 배(ATPR)는 안 뜬다'); }
ok(F.isFerry1700Ship({ vsl: 'TNJP' }) && F.isFerry1700Ship({ vsl: 'RZOR' }) && !F.isFerry1700Ship({ vsl: 'TMPZ' }), '대상은 TNJP·OBWH·RZOR 셋(해치 제외 TMPZ·ATPR 은 아님)');
{ const x = clone(w); for (const m of ['discharge', 'loading']) for (const cn of Object.keys(x[m].ediContainers)) x[m].completed[cn] = x[m].completed[cn] || { at: at(w, 16, 30), by: '', src: 'term' };
  ok(F.ferry1700Due(x, at(w, 17, 5), 'OBWH_2749E') === false, '17:00 에 양하·선적 다 끝났으면(보고 제외) 안 뜬다'); }

console.log('② 갱별 규격표 — OBWH 2749E 09-26 17:00 (양하 끝 · 선적 잔여)');
const r1 = F.buildGangShiftReport(w, pagesOBWH, w._now);
ok(r1.perGang === true && r1.gangs.map((g) => g.no).join(',') === '1,2', '갱별 규격표를 낸다 — 1호기·2호기(동방 QC101·QC102)');
ok(r1.ship.loading.basis === '잔여' && r1.ship.loading.remainTotal === 28, '배 전체 선적 잔여 28 (기존 주야간 보고와 같은 값)');
for (const m of ['discharge', 'loading']) {
  const sd = r1.gangs.reduce((a, g) => a + (g[m].doneTotal || 0), 0), sr = r1.gangs.reduce((a, g) => a + (g[m].remainTotal || 0), 0);
  if (r1.ship[m].excluded) ok(r1.gangs.every((g) => g[m].excluded || g[m].none), `${m === 'discharge' ? '양하' : '선적'} 배 전체가 끝났으면 갱도 전부 «보고 제외»`);
  else ok(sd + sr + r1.unknown[m] === r1.ship[m].doneTotal + r1.ship[m].remainTotal && sd === r1.ship[m].doneTotal, `${m === 'discharge' ? '양하' : '선적'} 갱 합 = 배 전체(완료 ${sd}·잔여 ${sr})`);
}
ok(r1.gangs.every((g) => g.loading.basis === '잔여' && g.loading.total.total === g.loading.remainTotal), '갱마다 적은 쪽(잔여)을 기준으로 — 표 합 = 그 갱 잔여');
ok(r1.gangs.every((g) => g.discharge.excluded), '양하는 두 갱 다 «작업 완료 — 보고 제외»');
ok(r1.gangs.every((g) => { const t = g.loading.tbl; return t.s20.F + t.s20.E + t.s40.F + t.s40.E + t.s45.F + t.s45.E === g.loading.total.total; }), '규격표(20/40/45 × F/E) 칸 합 = 그 갱 합계');
ok(r1.err != null && r1.err <= 0.10, `위치로 붙인 호기 합계 ↔ 터미널 호기 집계 차이 ${(r1.err * 100).toFixed(1)}% (문지기 10% 안)`);

console.log('③ 작업량 기준 — OBWH 2747E 09-23 17:00 (선적 92대 중)');
const v7 = V.OBWH_2747E;
const r2 = F.buildGangShiftReport(v7, pagesOBWH, v7._now);
ok(r2.perGang && r2.ship.loading.basis === '작업량' && r2.ship.loading.doneTotal === 92, '배 전체 선적 작업량 92');
ok(r2.gangs.every((g) => g.loading.basis === '작업량') && r2.gangs.reduce((a, g) => a + g.loading.doneTotal, 0) === 92, `갱마다 작업량 기준 — ${r2.gangs.map((g) => `${g.no}호기 ${g.loading.doneTotal}`).join(' · ')} (합 92)`);

console.log('④ RZOR — 5호기(RO/RO)는 안벽 순서에 없다 → 갱별 대수만, 규격표는 배 전체');
const z = V.RZOR_R104E;
ok(F.quayOrderOf(z, [3, 5]) === null && JSON.stringify(F.quayOrderOf(w, [1, 2])) === '[1,2]', '호기 순서 — RZOR {3,5} 못 정함 · OBWH 우현 {1,2} 선수 1호기(3.53-09 실측 OBWH 2735E 와 같음)');
const r3 = F.buildGangShiftReport(z, null, z._now);
ok(r3.perGang === false && /안벽 순서/.test(r3.why), '갱별 규격표를 지어내지 않는다(이유를 밝힌다)');
ok(r3.gangs.map((g) => g.no).join(',') === '3,5' && r3.gangs.every((g) => g.discharge.countsOnly && !g.discharge.tbl), '3호기·5호기 — 터미널 호기 집계 대수만');
ok(r3.gangs.every((g) => g.discharge.basis === (g.qcNow.disDone <= g.qcNow.disRest ? '작업량' : '잔여')), '갱마다 적은 쪽 — 호기 집계(완료·잔여) 그대로');
ok(!r3.ship.discharge.excluded && r3.ship.discharge.tbl, '배 전체 규격표는 그대로 낸다');

console.log('⑤ 문지기 — 자료가 못 가르면 갱별 표를 안 낸다');
{ const x = clone(w); const q = x.info.qcWork; const a = q.QC101.lodDone; q.QC101.lodDone = q.QC102.lodDone + 60; q.QC102.lodDone = Math.max(0, a - 60);
  const r = F.buildGangShiftReport(x, pagesOBWH, x._now); ok(r.perGang === false && /%/.test(r.why), `위치로 붙인 합계가 호기 집계와 크게 다르면 대수만 — «${r.why}»`); }
{ const x = clone(w); delete x.info.qcWork; const r = F.buildGangShiftReport(x, pagesOBWH, x._now); ok(r.gangs.length === 0 && /호기 집계가 아직/.test(r.why), '호기 집계가 없으면 갱 없이 배 전체만'); }
{ const x = clone(w); x.info.qcWork = { QC101: { qc: 'QC101', disDone: 246, disRest: 0, lodDone: 261, lodRest: 28 } }; const r = F.buildGangShiftReport(x, pagesOBWH, x._now);
  ok(r.perGang && r.gangs.length === 1 && r.gangs[0].loading.remainTotal === r.ship.loading.remainTotal, '호기가 하나면 그 갱 = 배 전체'); }
{ const x = clone(w); x.info.berthSide = ''; const r = F.buildGangShiftReport(x, pagesOBWH, x._now); ok(r.perGang === false, '접안 방향을 모르면 호기 자리를 못 정한다 — 대수만'); }

console.log('⑥ 카톡 글·음성 — 같은 값 한 벌');
const msg1 = F.buildFerry1700Message({ vsl: 'OBWH', voy: '2749E/2750W', rep: r1, gangNos: [1] });
const g1 = r1.gangs.find((g) => g.no === 1);
ok(/^📍 OBWH 2749E\/2750W\n📋 주간 작업보고 \(17:00 마감\)\n🏗 1호기\n■ 양하 — 작업 완료\n■ 선적 — 잔여 \d+대/.test(msg1) && !/2호기/.test(msg1), '검수원 카톡 — 내 갱(1호기)만');
ok(msg1.includes(`■ 선적 — 잔여 ${g1.loading.total.total}대 (완료 ${g1.loading.doneTotal} · 잔여 ${g1.loading.remainTotal})`) && msg1.includes(`  45ft  F ${g1.loading.tbl.s45.F} · E ${g1.loading.tbl.s45.E}`) && /시각: 09-26 17:00$/.test(msg1), '갱 줄·규격 줄·시각 줄');
const msgZ = F.buildFerry1700Message({ vsl: 'RZOR', voy: 'R104E/R104W', rep: r3 });
ok(msgZ.includes('🏗 3호기') && msgZ.includes('🏗 5호기') && msgZ.includes('▶ 배 전체') && msgZ.includes('  40ft  F '), 'RZOR 카톡 — 갱별 대수 + 배 전체 규격표');
const sp = F.ferry1700Speech([{ vsl: 'OBWH', rep: r1 }], 1);
ok(sp === `주간 작업보고 시간입니다. OBWH 1호기 양하는 작업 완료, 선적 잔여 ${g1.loading.total.total}대입니다.`, `음성 — «${sp}»`);

console.log('⑦ WorkReportModal 주야간 화면과 같은 목록(조립 한 벌)');
ok(F.buildShiftReport(F.shiftReportContainers(w, 'loading'), '주간', w._now).remainTotal === 28, 'shiftReportContainers → buildShiftReport 선적 잔여 28');

console.log('⑪ 감사·2차 시뮬 지적 — 날짜까지 본 컷 · 빈 칸 머지 · 끝난 배 · 호기 표 모양 · 사전 없음 · 뒤집힌 방향');
{ // 어제 저녁(17:00:01 뒤)에 끝난 컨은 오늘 17:00 보고에서 «완료»다 — 종전엔 시각만 봐서 «잔여»로 셌다.
  const x = clone(w); const cns = Object.keys(x.loading.ediContainers).filter((cn) => !x.loading.completed[cn]).slice(0, 5);
  cns.forEach((cn) => { x.loading.completed[cn] = { at: at(w, 18, 30) - 86400000, by: '', src: 'term' }; });
  const r = F.buildShiftReport(F.shiftReportContainers(x, 'loading'), '주간', x._now);
  ok(r.remainTotal === 28 - cns.length && r.doneTotal === 261 + cns.length, `어제 18:30 에 끝난 ${cns.length}대는 완료(잔여 ${r.remainTotal})`);
  ok(F.buildShiftReport(F.shiftReportContainers(w, 'loading'), '주간', at(w, 17, 0, 0)).remainTotal === 28 && F.shiftCutMs('주간', at(w, 17, 10)) === at(w, 17, 0, 0), '같은 날 판정은 그대로 · 주간 컷 = 그날 17:00:00');
  ok(F.shiftCutMs('야간', at(w, 20, 0)) === at(w, 5, 30) + 86400000 && F.shiftCutMs('야간', at(w, 3, 0)) === at(w, 5, 30) && F.shiftCutMs('주간', at(w, 3, 0)) === at(w, 17, 0) - 86400000, '야간 컷 — 밤이면 다음 날 05:30 · 새벽이면 그날 05:30 · 새벽의 주간은 어제 17:00');
}
{ // records 의 빈 칸이 EDI 를 덮지 않는다(TNJP 26362E pod «» 로 양하 전량이 평택분에서 빠졌다).
  const x = clone(w); const cn = Object.keys(x.discharge.ediContainers)[0]; x.discharge.records[cn] = { cn, pod: '', iso: '', fe: '' };
  const c = F.shiftReportContainers(x, 'discharge').find((y) => y.cn === cn);
  ok(c && c.pod === x.discharge.ediContainers[cn].pod && c.iso === x.discharge.ediContainers[cn].iso, 'records 빈 pod·iso 는 EDI 값을 안 덮는다(평택분에 남는다)');
}
{ const x = clone(w); for (const m of ['discharge', 'loading']) { for (const k of Object.keys(x[m].completed)) { const d = new Date(x[m].completed[k].at); if (d.getHours() >= 6) delete x[m].completed[k]; } x[m].termWork = {}; }
  ok(F.ferry1700Due(x, x._now, 'OBWH_2749E') === false, '오늘 06:00 뒤에 한 일이 없으면(밤에 끝난 배) 안 뜬다'); }
{ const x = clone(w); x.info.atdActual = '2026/09/26 16:50'; ok(F.ferry1700Due(x, x._now, 'OBWH_2749E') === false, '출항(ATD «2026/09/26 16:50») 뒤면 안 뜬다'); }
{ const x = clone(w); Object.assign(x.info, { dischargeDone: true, loadingDone: true, dischargeDoneAt: at(w, 15, 0), loadingDoneAt: at(w, 16, 40) }); ok(F.ferry1700Due(x, x._now, 'OBWH_2749E') === false, '17:00 전에 양하·선적 완료 표식이 있으면 안 뜬다(셧아웃 잔여로 떠난 배를 안 읽는다)'); }
{ const x = clone(w); Object.assign(x.info, { dischargeDone: true, loadingDone: true, dischargeDoneAt: at(w, 15, 0), loadingDoneAt: at(w, 17, 20) }); ok(F.ferry1700Due(x, at(w, 17, 25), 'OBWH_2749E') === true, '완료 표식이 17:00 뒤면 17:00 보고는 그대로 뜬다'); }
{ const x = clone(w); x.info.qcWork.QC104 = { qc: 'QC104', disDone: 0, disRest: 0, lodDone: 0, lodRest: 0 }; const r = F.buildGangShiftReport(x, pagesOBWH, x._now);
  ok(r.perGang && r.gangs.map((g) => g.no).join(',') === '1,2', '쉬는 호기(네 칸 0)는 갱에서 뺀다'); }
{ const x = clone(w); for (const q of Object.values(x.info.qcWork)) delete q.qc; const r = F.buildGangShiftReport(x, pagesOBWH, x._now);
  ok(r.perGang && r.gangs.map((g) => g.qc).join(',') === 'QC101,QC102', 'qc 칸이 없으면 열쇠(QC101)로 호기를 읽는다'); }
{ const r = F.buildGangShiftReport(w, null, w._now); ok(r.perGang === false && /베이사전/.test(r.why), '베이사전이 없으면 갱별 규격표를 안 낸다(대수만)'); }
{ const x = clone(w); x.info.berthSide = '좌현'; const r = F.buildGangShiftReport(x, pagesOBWH, x._now);
  ok(r.perGang === false, `접안 방향이 반대로 들어오면 규격표를 안 낸다 — «${r.why}»`); }
{ const x = clone(z); const snapQ = clone(x.info.qcWork); for (const q of Object.values(x.info.qcWork)) { q.disDone += q.disRest; q.disRest = 0; }
  const r0 = F.buildGangShiftReport(x, null, x._now); const r1s = F.buildGangShiftReport(x, null, x._now, { qcSnap: { at: x._now, qcWork: snapQ } });
  ok(r0.gangs.every((g) => g.discharge.excluded) && r1s.gangs.every((g) => !g.discharge.excluded && g.discharge.remainTotal === snapQ['QC' + (100 + g.no)].disRest), '대수만 내는 배는 17:00 직후 굳힌 호기 표를 쓴다(지금 값이 끝났어도 17:00 잔여를 낸다)'); }
{ const x = clone(z); const later = x._now + 20 * 60000; const r = F.buildGangShiftReport(x, null, later);
  const m = F.buildFerry1700Message({ vsl: 'RZOR', voy: 'R104E/R104W', rep: r });
  ok(r.postCut >= 0 && (r.postCut === 0 || /17:00 뒤 \d+대 포함/.test(m)), `늦게 연 대수만 보고는 섞인 대수를 카톡에 밝힌다(${r.postCut}대)`); }
{ const c = [{ iso: '22G1', fe: 'F', _comp: { at: at(w, 17, 0, 0) + 500 } }, { iso: '22G1', fe: 'F', _comp: { at: at(w, 17, 0, 1) } }];
  const r = F.buildShiftReport(c, '주간', at(w, 17, 1)); ok(r.doneTotal === 1 && r.remainTotal === 1, '17:00:00.500 은 완료 · 17:00:01 은 잔여(초 단위 — V8.11)'); }
{ const x = clone(w); x.info.atdActual = '2026/09/26 17:10'; ok(F.ferry1700Due(x, at(w, 17, 15), 'OBWH_2749E') === true, '17:00 뒤 출항(17:10)이면 17:00 보고 창은 그대로 뜬다'); }
{ const x = clone(w); Object.assign(x.info, { loadingDone: true, loadingDoneAt: at(w, 16, 40) }); ok(F.ferry1700Due(x, x._now, 'OBWH_2749E') === false, '남은 쪽(선적)에 17:00 전 완료 표식이 있으면 안 뜬다(셧아웃 잔여)'); }
{ const x = clone(w); x.info.pier = ''; x.info.berth = ''; const r = F.buildGangShiftReport(x, pagesOBWH, x._now); ok(r.perGang === false && /부두/.test(r.why), `부두를 모르면 이유가 «부두» — «${r.why}»`); }
{ const r = F.buildGangShiftReport(w, pagesOBWH, w._now); ok(r.side === 'starboard' && r.bow === 1, '규격표를 낸 배는 쓴 방향(우현·선수 1호기)을 함께 낸다'); }
{ const x = clone(z); const r = F.buildGangShiftReport(x, null, x._now + 15 * 60000, { qcSnap: { at: x._now, qcWork: clone(x.info.qcWork) } });
  const t = F.ferry1700Speech([{ vsl: 'RZOR', rep: r }], 0); ok(!/입니다입니다/.test(t) && (r.postCut === 0 || /17:00 터미널 값입니다\.$/.test(t)), `굳힌 표를 쓴 음성은 그 시각을 말한다 — «${t.slice(-30)}»`); }
ok(/선적은 작업 완료/.test(F.ferry1700Speech([{ vsl: 'X', rep: { ship: {}, gangs: [{ no: 1, discharge: { none: true }, loading: { excluded: true } }] } }], 1)), '음성 조사 — «선적은 작업 완료»');

console.log('⑫ 3.64 보관 — 놓친 보고는 작업이 끝날 때까지 남는다 · 익일로 넘기면 전날 주간·야간 두 건');
ok(JSON.stringify(F.ferryReportCuts(w, w._now, 'OBWH_2749E').map((c) => c.key)) === '["2026-09-26_주간"]', '17:00:30 — 보관 1건(09-26 주간)');
ok(F.ferryReportCuts(w, at(w, 16, 59, 59), 'OBWH_2749E').length === 0, '16:59:59 — 아직 마감 전이라 보관 없음');
const wN = clone(w); { const rest = Object.keys(wN.loading.ediContainers).filter((cn) => !wN.loading.completed[cn]); rest.slice(0, 10).forEach((cn) => { wN.loading.completed[cn] = { at: at(w, 20, 0), by: '', src: 'term' }; }); }
const next0610 = at(w, 6, 10) + 86400000;
{ const cs = F.ferryReportCuts(wN, next0610, 'OBWH_2749E');
  ok(JSON.stringify(cs.map((c) => c.key)) === '["2026-09-26_야간","2026-09-26_주간"]', `익일 06:10 까지 작업이 이어지면 전날 주간·야간 두 건(최신이 위) — ${cs.map((c) => c.key).join(', ')}`);
  const rN = F.buildGangShiftReport(wN, pagesOBWH, next0610, { shift: cs[0].shift, cutMs: cs[0].cutMs });
  ok(rN.shift === '야간' && rN.ship.loading.remainTotal === 18 && rN.ship.loading.doneTotal === 271, `야간(05:30 마감) 보고 — 선적 완료 ${rN.ship.loading.doneTotal}·잔여 ${rN.ship.loading.remainTotal}`);
  const rD = F.buildGangShiftReport(wN, pagesOBWH, next0610, { shift: cs[1].shift, cutMs: cs[1].cutMs });
  ok(rD.shift === '주간' && rD.ship.loading.remainTotal === 28 && rD.perGang && rD.gangs.reduce((a, g) => a + (g.loading.remainTotal || 0), 0) === 28, '다음 날 열어도 주간 보고는 17:00 값 그대로(잔여 28 — 20:00 에 한 10대는 잔여로 남는다)');
  const mN = F.buildFerry1700Message({ vsl: 'OBWH', voy: '2749E/2750W', rep: rN, gangNos: [1] });
  ok(/📋 야간 작업보고 \(05:30 마감\)/.test(mN) && /시각: 09-27 05:30$/.test(mN), '야간 카톡 글 — 제목 «야간 작업보고 (05:30 마감)» · 시각 09-27 05:30'); }
{ const x = clone(wN); Object.assign(x.info, { dischargeDone: true, loadingDone: true, dischargeDoneAt: at(w, 15, 0), loadingDoneAt: next0610 - 60000 });
  ok(F.ferryWorkDone(x, next0610) && F.ferryReportCuts(x, next0610, 'OBWH_2749E').length === 0, '작업 완료(양하·선적 완료 표식) — 보관도 같이 사라진다'); }
{ const x = clone(wN); x.info.atdActual = '2026/09/27 06:00'; ok(F.ferryReportCuts(x, next0610, 'OBWH_2749E').length === 0, '출항(ATD) 뒤 — 보관 없음'); }
{ const x = clone(w); for (const m of ['discharge', 'loading']) for (const cn of Object.keys(x[m].ediContainers)) x[m].completed[cn] = x[m].completed[cn] || { at: at(w, 18, 0), by: '', src: 'term' };
  ok(!F.ferryWorkDone(x, at(w, 18, 5)) && F.ferryReportCuts(x, at(w, 18, 5), 'OBWH_2749E').length === 1, '마지막 컨이 끝나도 완료 표식·출항 전까지는 보관이 남는다(2차 시뮬 — 17:29 에 끝난 배가 놓친 17:00 보고를 잃었다)'); }
{ const x = clone(w); for (const cn of Object.keys(x.discharge.ediContainers)) x.discharge.completed[cn] = x.discharge.completed[cn] || { at: at(w, 16, 0) }; x.loading = { ediContainers: {}, records: {}, completed: {}, termWork: {} };
  ok(!F.ferryWorkDone(x, at(w, 18, 0)), '선적 리스트가 아직 없을 때 양하만 끝나도 «작업 완료» 가 아니다'); }
{ const c = [{ at: at(w, 17, 0, 0) + 500 }]; const x = clone(w); x.discharge.completed = {}; x.discharge.termWork = {}; x.loading.completed = { A: { at: at(w, 17, 0, 0) + 500 } }; x.loading.termWork = {};
  const cs = F.ferryReportCuts(x, at(w, 6, 10) + 86400000, 'OBWH_2749E'); ok(!cs.some((k) => k.shift === '야간'), '17:00:00.500 완료 한 건은 야간 근무로 안 잡힌다(초 단위 경계)'); }
ok(F.ferryReportCuts(z, z._now, 'RZOR_R104E').length === 1 && F.ferryReportCuts({ info: { vsl: 'TMPZ' }, discharge: {}, loading: {} }, z._now, 'TMPZ_2031E').length === 0, 'RZOR 도 보관 · 대상 밖 배는 없음');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  console.log('⑧ 알림 창 — 검수원(내 갱 맨 위·카톡 단추) · 닫으면 그날 다시 안 뜸');
  dom.window.localStorage.setItem('gm_equip_no', '1호기');
  const voys = { OBWH_2749E: w, RZOR_R104E: z };
  F.render(F.React.createElement(F.Ferry1700Alert, { voyages: voys, audience: 'inspector', voyageKey: 'OBWH_2749E', nowOverride: w._now }));
  await wait(60);
  const q = (s) => document.querySelector(s);
  const cards = [...document.querySelectorAll('[data-gang]')].map((e) => e.getAttribute('data-gang'));
  ok(!!q('[role="dialog"]') && cards[0] === '1' && cards.includes('2'), `창이 뜨고 내 갱(1호기)이 맨 위 — ${cards.join(',')}`);
  ok(/내 갱/.test(q('[data-gang="1"]').textContent) && /터미널 QC101/.test(q('[data-gang="1"]').textContent), '«내 갱» 표시 · 터미널 호기 합계 줄');
  ok(/우현 접안 기준 · 선수 1호기/.test(q('[data-f1700="OBWH_2749E"]').textContent), '창에 «우현 접안 기준 · 선수 1호기»(방향을 눈으로 잡게)');
  const kb = [...document.querySelectorAll('button')].find((b) => /카톡 보고/.test(b.textContent));
  ok(kb && /1호기/.test(kb.textContent), '«💬 카톡 보고 (1호기)» 단추');
  ok([...document.querySelectorAll('button')].some((b) => /다시 듣기/.test(b.textContent)), '«🔊 다시 듣기» 단추(폰이 손대기 전 음성을 막을 때)');
  ok(spoken.length === 1 && /OBWH 1호기/.test(spoken[0] || ''), `음성 한 번 — «${spoken[0] || ''}»`);
  [...document.querySelectorAll('button')].find((b) => b.textContent === '닫기').click();
  await wait(40);
  ok(!q('[role="dialog"]'), '닫기 → 창이 닫힌다');
  F.render(F.React.createElement('div', null));
  await wait(20);
  F.render(F.React.createElement(F.Ferry1700Alert, { voyages: voys, audience: 'inspector', voyageKey: 'OBWH_2749E', nowOverride: w._now + 60000 }));
  await wait(40);
  ok(!q('[role="dialog"]') && spoken.length === 1, '다시 열어도 그날은 안 뜬다 · 음성도 다시 안 한다');
  { const chip = q('[data-f1700-chip]'); ok(chip && /보고 보관 1/.test(chip.textContent), `닫아도 «📋 보고 보관 1» 단추가 남는다(${chip ? chip.textContent : '없음'})`);
    chip && chip.click(); await wait(40);
    const dlg = q('[aria-label="작업보고 보관"]'); ok(!!dlg && /09-26 주간 · 17:00 마감/.test(dlg.textContent) && /카톡 보고 \(1호기\)/.test(dlg.textContent), '보관 창 — 09-26 주간 17:00 마감 · 💬 카톡 보고 (1호기)');
    ok(spoken.length === 1, '보관 창은 음성을 안 낸다');
    [...document.querySelectorAll('button')].find((b) => b.textContent === '닫기').click(); await wait(30);
    ok(!q('[aria-label="작업보고 보관"]') && !!q('[data-f1700-chip]'), '보관 창 닫기 → 단추로 돌아간다'); }
  { const db0 = global.__memdb || {}; const sn0 = (((db0.voyages || {}).OBWH_2749E || {}).info || {}).shiftReports || {};
    ok(!sn0['2026-09-26_주간'], '마감 직후(17:00:30)에는 아직 안 적는다 — 마지막 분 실적이 1분쯤 뒤에 들어온다(감사 실측)');
    F.render(F.React.createElement('div', null)); await wait(20);
    F.render(F.React.createElement(F.Ferry1700Alert, { voyages: voys, audience: 'inspector', voyageKey: 'OBWH_2749E', nowOverride: at(w, 17, 4) })); await wait(40);
    const db = global.__memdb || {}; const sn = (((db.voyages || {}).OBWH_2749E || {}).info || {}).shiftReports || {}; const e = sn['2026-09-26_주간'];
    ok(e && e.qcWork && e.qcWork.QC101 && e.rep && e.rep.cutMs === at(w, 17, 0) && e.rep.perGang === true && e.rep.gangs.length === 2, '마감 +3~+8분(17:04) — 작업 중인 폰이 그 보고(갱별 표·호기 표)를 info.shiftReports/2026-09-26_주간 에 한 번 적는다');
    ok(e && e.rep.gangs.find((g) => g.no === 1).loading.remainTotal === F.buildGangShiftReport(w, pagesOBWH, at(w, 17, 4)).gangs.find((g) => g.no === 1).loading.remainTotal, '적은 보고 = 창에 보인 계산');
    const n1 = (global.__memlog || []).filter((x) => /shiftReports|OBWH_2749E\/info/.test(x.path)).length;
    F.render(F.React.createElement(F.Ferry1700Alert, { voyages: voys, audience: 'inspector', voyageKey: 'OBWH_2749E', nowOverride: at(w, 17, 5) })); await wait(40);
    ok((global.__memlog || []).filter((x) => /shiftReports|OBWH_2749E\/info/.test(x.path)).length === n1, '한 기기는 한 번만 적는다'); }
  { dom.window.dispatchEvent(new dom.window.CustomEvent('ferry1700Open', { detail: { voyageKey: 'RZOR_R104E' } })); await wait(40);
    const dlg = q('[aria-label="작업보고 보관"]'); ok(!!dlg && q('[data-f1700="RZOR_R104E"]') && !q('[data-f1700="OBWH_2749E"]'), '작업 보고 창이 부르면(이벤트 ferry1700Open) 그 배(RZOR) 보관만 연다');
    [...document.querySelectorAll('button')].find((b) => b.textContent === '닫기').click(); await wait(30); }
  { F.render(F.React.createElement('div', null)); await wait(20);
    const z2 = clone(z); const snapQ = clone(z2.info.qcWork); snapQ.QC103.disRest += 7;
    const repZ = JSON.parse(JSON.stringify(F.buildGangShiftReport(z2, null, z._now, { qcSnap: { at: z._now, qcWork: snapQ } })));
    z2.info.shiftReports = { '2026-09-26_주간': { at: z._now, qcWork: snapQ, rep: repZ } };
    F.render(F.React.createElement(F.Ferry1700Alert, { voyages: { RZOR_R104E: z2 }, audience: 'inspector', voyageKey: 'RZOR_R104E', nowOverride: z._now + 3 * 3600000 }));
    await wait(40); q('[data-f1700-chip]') && q('[data-f1700-chip]').click(); await wait(40);
    const g3 = q('[data-gang="3"]'); ok(g3 && new RegExp(`잔여 ${snapQ.QC103.disRest}\\)`).test(g3.textContent), `적어 둔 마감 보고를 그대로 보인다(3호기 양하 잔여 ${snapQ.QC103.disRest})`);
    ok(!/다시 센 값/.test(q('[aria-label="작업보고 보관"]').textContent), '적힌 보고면 «다시 센 값» 안내가 없다');
    F.render(F.React.createElement('div', null)); await wait(20); }
  { const w2 = clone(w); const st = JSON.parse(JSON.stringify(F.buildGangShiftReport(w2, pagesOBWH, w._now))); st.gangs.find((g) => g.no === 1).loading.remainTotal = 77;
    w2.info.shiftReports = { '2026-09-26_주간': { at: w._now, qcWork: w2.info.qcWork, rep: st } };
    const w3 = clone(w2); delete w3.info.shiftReports;
    F.render(F.React.createElement(F.Ferry1700Alert, { voyages: { OBWH_2749E: w2 }, audience: 'chief', nowOverride: at(w, 19, 0) })); await wait(40);
    q('[data-f1700-chip]') && q('[data-f1700-chip]').click(); await wait(40);
    ok(/잔여 77\)/.test(q('[data-gang="1"]').textContent), '뒤늦게 열어도 적어 둔 보고 숫자 그대로(다시 세지 않는다)');
    F.render(F.React.createElement('div', null)); await wait(20);
    F.render(F.React.createElement(F.Ferry1700Alert, { voyages: { OBWH_2749E: w3 }, audience: 'chief', nowOverride: at(w, 19, 0) })); await wait(40);
    q('[data-f1700-chip]') && q('[data-f1700-chip]').click(); await wait(40);
    ok(/다시 센 값/.test(q('[aria-label="작업보고 보관"]').textContent), '적힌 보고가 없으면 지금 자료로 다시 센 값이라고 밝힌다');
    F.render(F.React.createElement('div', null)); await wait(20);
    const w4 = clone(w2); w4.info.shiftReports['2026-09-26_주간'].rep.gangs[0].loading = { basis: '잔여' }; w4.info.shiftReports['2026-09-26_주간'].rep.gangs.push(null);
    F.render(F.React.createElement(F.Ferry1700Alert, { voyages: { OBWH_2749E: w4 }, audience: 'chief', nowOverride: at(w, 19, 0) })); await wait(40);
    q('[data-f1700-chip]') && q('[data-f1700-chip]').click(); await wait(40);
    ok(!!q('[aria-label="작업보고 보관"]') && /다시 센 값/.test(q('[aria-label="작업보고 보관"]').textContent) && !/잔여 77\)/.test(q('[aria-label="작업보고 보관"]').textContent), '모양이 틀린 적힌 보고는 버리고 다시 센다(창·앱이 안 깨진다)');
    ok(!F.ferryRepShapeOk({ cutMs: 1, ship: { discharge: { none: true }, loading: { basis: '잔여' } }, gangs: [] }) && F.ferryRepShapeOk(st), '모양 검사 — 빠진 칸이면 거부 · 정상 보고는 통과');
    F.render(F.React.createElement('div', null)); await wait(20); }
  { const m = F.buildFerry1700Message({ vsl: 'OBWH', voy: '2749E', rep: F.buildGangShiftReport(w, pagesOBWH, w._now), gangNos: [1], recomputed: true });
    ok(/다시 센 값/.test(m), '다시 센 보고로 카톡을 보내면 글에도 그 사실을 적는다'); }
  F.render(F.React.createElement('div', null)); await wait(20);
  F.render(F.React.createElement(F.Ferry1700Alert, { voyages: { OBWH_2749E: w }, audience: 'chief', nowOverride: w._now + 90000 }));
  await wait(40);
  ok(!q('[role="dialog"]') && spoken.length === 1, '같은 기기 수석 창도 닫은 배는 다시 안 띄운다(두 번 읽지 않는다)');

  console.log('⑨ 알림 창 — 수석(작업 중 카페리 모아 보기 · 카톡 단추 없음)');
  Object.keys(dom.window.localStorage).filter((k) => /^gm_f1700_(closed|spoken)_/.test(k)).forEach((k) => dom.window.localStorage.removeItem(k));   // 다른 기기처럼
  spoken.length = 0;
  F.render(F.React.createElement('div', null)); await wait(20);
  F.render(F.React.createElement(F.Ferry1700Alert, { voyages: { ...voys, TMPZ_2031E: { info: { vsl: 'TMPZ' }, discharge: {}, loading: {} } }, audience: 'chief', nowOverride: w._now }));
  await wait(60);
  const blocks = [...document.querySelectorAll('[data-f1700]')].map((e) => e.getAttribute('data-f1700'));
  ok(blocks.join(',') === 'OBWH_2749E,RZOR_R104E', `두 척 한 창 — ${blocks.join(',')} (TMPZ 는 대상 밖)`);
  ok(/작업 중 2척/.test(q('[role="dialog"]').textContent) && ![...document.querySelectorAll('button')].some((b) => /카톡/.test(b.textContent)), '제목 «작업 중 2척» · 카톡 단추 없음(보기만)');
  ok(/안벽 순서/.test(q('[data-f1700="RZOR_R104E"]').textContent) && /배 전체/.test(q('[data-f1700="RZOR_R104E"]').textContent), 'RZOR 는 이유 한 줄 + 배 전체 규격표');
  ok(spoken.length === 1 && /OBWH/.test(spoken[0]) && /RZOR/.test(spoken[0]), `수석 음성 — 두 척을 한 번에 «${(spoken[0] || '').slice(0, 60)}…»`);

  console.log('⑩ 배선 — 수석 대시보드·작업 검수원(조회만 제외)·주야간 화면이 같은 한 벌을 부른다');
  const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  ok(/<Ferry1700Alert audience="chief" voyages=\{voyages\} \/>/.test(src('src/pages/ChiefDashboard.jsx')), 'ChiefDashboard 에 수석 창');
  ok(/route\.name !== 'chief' && workChoice && workChoice\.mode === 'work' && workChoice\.voyageKey && \(\s*<Ferry1700Alert audience="inspector"/.test(src('src/App.jsx')), 'App — 작업자(mode work)로 고른 배에만 · 수석 화면에선 비킨다');
  ok(/const buildMode = \(m\) => shiftReportContainers\(voyage, m\);/.test(src('src/components/WorkReportModal.jsx')), 'WorkReportModal 주야간 화면이 shiftReportContainers 한 벌을 쓴다');
  ok(/new CustomEvent\('ferry1700Open', \{ detail: \{ voyageKey \} \}\)/.test(src('src/components/WorkReportModal.jsx')) && /ferryReportCuts\(voyage, Date\.now\(\), voyageKey\)/.test(src('src/components/WorkReportModal.jsx')), 'WorkReportModal 주야간 화면 — «📋 갱별 보고 보관 N건» 단추가 같은 창을 연다');
  ok(/basketCranesOf\(voyage, rows, nos\);/.test(src('src/utils.js')) && (src('src/utils.js').match(/const hatchCount = \{\};/g) || []).length === 1, '해치 자동 판정과 갱별 보고가 바구니 호기 붙이기 한 벌(basketCranesOf)');

  ok(errs.length === 0, `렌더 오류 0 (${errs.slice(0, 2).join(' | ')})`);
  console.log(`카페리 17시 갱별 보고 연막검사: ${pass} 통과 · ${fail} 실패`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('✗ 연막검사 예외', e); process.exit(1); });
