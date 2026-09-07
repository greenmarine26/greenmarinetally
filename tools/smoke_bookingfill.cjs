// 부킹 자리(예상 EDI)·실번호 리스트 중복 계산 연막검사(3.26) — 자리와 컨넘버를 두 번 세지 않는가, 자리 그림은 그대로인가.
//   검수사 2026-09-07 «상습적인 구리스트 보관과 예상EDI 컨자리 넘버와 컨넘버 중복계산». 픽스처는 SWBT 2614N 선적(2615S)
//   실데이터 사본(자리 316 + 실번호 316 — 화면이 별첨 632·검증 316/316·목록 543 이던 그 자료)과 STSE 2669E(ASC PRE cn 빈 자리 438 + 실번호 439).
const path = require('path'), fs = require('fs');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_bookingfill.cjs <utils 번들.cjs>'); process.exit(1); }
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'bookingfill_swbt.json'), 'utf8'));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('부킹 자리·실번호 중복 계산(3.26) · SWBT 2614N 선적 실데이터 사본');

//  VoyagePage·PrintHubModal 이 만드는 병합 목록 모양 그대로(부록 A: 픽스처 모양은 호출부에서 베낀다)
const mergeOf = (sec) => {
  const edi = sec.ediContainers || {}, rec = sec.records || {}; const m = {};
  let seq = 0;
  Object.entries(edi).forEach(([k, c]) => {
    if (c.cn) { m[c.cn] = { ...c, _src: rec[c.cn] ? 'both' : 'edi', _inList: !!rec[c.cn] }; return; }
    let kk = `__SLOT_${c.bay || ''}_${c.row || ''}_${c.tier || ''}`; if (m[kk]) kk = `${kk}_${seq++}`;
    m[kk] = { ...c, cn: kk, pendingCn: true, _slot: true, _src: 'edi' };
  });
  Object.values(rec).forEach(r => { if (!m[r.cn]) m[r.cn] = { ...r, _src: 'list', _inList: true }; });
  return Object.values(m);
};
const isSlot = (c) => U.isSlotEntry(c);

//  ① 판정 한 벌
ok(U.isSlotEntry({ cn: '__BOOK_10_00_02', isBooking: true }) && U.isSlotEntry({ cn: '', bay: '11', row: '04', tier: '02' }) && !U.isSlotEntry({ cn: 'BEAU4702358' }) && !U.isSlotEntry({ cn: '' }),
  'isSlotEntry — __BOOK_·cn 빈 PRE 자리는 자리, 실번호·빈 객체는 아니다');

//  ② 채움 상태(bookingFillOfSec) — 자리 316 · 실번호 316 · 채움. 양하(자리 없음)는 null.
const sw = FX.swbt;
const slots0 = Object.values(sw.loading.ediContainers).filter(isSlot).length;
ok(slots0 === 316 && Object.keys(sw.loading.records).length === 316, `픽스처 — 부킹 자리 ${slots0} · 실번호 ${Object.keys(sw.loading.records).length}`);
const fillL = U.bookingFillOfSec(sw.loading, 'loading');
ok(fillL && fillL.slots === 316 && fillL.real === 316 && fillL.filled === true, `bookingFillOfSec(선적) = ${JSON.stringify(fillL)}`);
ok(U.bookingFillOfSec(sw.discharge, 'discharge') === null, '양하(자리 없음)는 null');
//  반대 방향 리스트는 실번호로 안 센다(ownDirCns) — N_N 형 배에서 양하 행이 선적 자리를 «채운» 것으로 오인하지 않게
const mixed = { ediContainers: sw.loading.ediContainers, records: { ...Object.fromEntries(Object.entries(sw.loading.records).slice(0, 315)), ZZZU0000001: { cn: 'ZZZU0000001', pol: 'KRPUS', pod: 'KRPTK' }, ZZZU0000002: { cn: 'ZZZU0000002', pol: 'KRPUS', pod: 'KRPTK' } } };
const fillM = U.bookingFillOfSec(mixed, 'loading');
ok(fillM && fillM.real === 315 && fillM.filled === false, `반대 방향(양하행) 2행은 실번호로 안 센다 → ${JSON.stringify(fillM)}`);
//  ③ ediContainers 는 손대지 않는다 — 자리 그림·가이드·보관소가 그것을 읽는다(감사 «부» 반영). fullEdiMapOf 는 항등.
ok(Object.keys(U.fullEdiMapOf(sw.loading)).length === 316 && Object.values(U.fullEdiMapOf(sw.loading)).every(isSlot), 'fullEdiMapOf — 자리 316개 그대로(그림 불변)');

//  ④ 작업 목록 — 병합 632 → 총수 기준으로 316(_src 표식 경로와 ediMap/recMap 옵션 경로 둘 다)
const pre = mergeOf(sw.loading);
ok(pre.length === 632, `병합 = ${pre.length}행(316+316 — 화면이 두 배로 세던 그 모수)`);
const preDrop = U.dropFilledBookingSlots(pre);
ok(preDrop.length === 316 && !preDrop.some(isSlot), `dropFilledBookingSlots = ${preDrop.length}행 — 종전 F/E 별 규칙은 543 이었다(동진 리스트에 F/E 칸 없음)`);
const noMark = pre.map(({ _src, _inList, ...c }) => c);   // 현황요약·마감점검처럼 표식 없는 병합
ok(U.dropFilledBookingSlots(noMark).length === 632 && U.dropFilledBookingSlots(noMark, { ediMap: sw.loading.ediContainers, recMap: sw.loading.records }).length === 316,
  '표식 없는 병합은 ediMap/recMap 옵션으로 가른다(옵션 없으면 손대지 않음)');
//  항차·모드가 섞인 풀(검색·미르)은 그룹별 — 양하 행이 선적 자리를 채운 것으로 오인하지 않는다
const pool = [...pre.map(c => ({ ...c, _mode: 'loading', voyageKey: 'SWBT_2614N' })), ...mergeOf(sw.discharge).map(c => ({ ...c, _mode: 'discharge', voyageKey: 'SWBT_2614N' }))];
const poolDrop = U.dropFilledBookingSlots(pool);
ok(poolDrop.filter(c => c._mode === 'loading').length === 316 && poolDrop.filter(c => c._mode === 'discharge').length === mergeOf(sw.discharge).length, `섞인 풀 — 선적 ${poolDrop.filter(c => c._mode === 'loading').length} · 양하 불변`);
//  ⑤ 부분 리스트(실번호 100)는 종전대로 F/E 별 — 자리를 다 지우지 않는다
const partSec = { ediContainers: sw.loading.ediContainers, records: Object.fromEntries(Object.entries(sw.loading.records).slice(0, 100)) };
ok(U.bookingFillOfSec(partSec, 'loading').filled === false, '부분 리스트(100/316) — 채움 아님');
const partList = U.dropFilledBookingSlots(mergeOf(partSec));
ok(partList.length > 316 && partList.some(isSlot), `부분 리스트 목록 = ${partList.length}행(자리 ${partList.filter(isSlot).length} 남김 — 보수적)`);

//  ⑥ 별첨 — 자리(계획)를 세고 그 자리를 채운 실번호는 뺀다(B안). 칸(그림)과 같은 표.
const leg = U.legendItemsOf(pre);
const cnt = (arr, f) => arr.reduce((m, c) => { const k = f(c) || '(없음)'; m[k] = (m[k] || 0) + 1; return m; }, {});
ok(leg.length === 316 && leg.every(isSlot), `별첨 모수 = ${leg.length}(자리) · 실번호 0`);
const pod = cnt(leg, c => String(c.pod || '').slice(2, 5));
ok(pod.KAN === 149 && pod.PUS === 80 && pod.LCH === 41 && pod.SGN === 28 && pod.BKK === 18 && !pod['(없음)'], `별첨1 POD ${JSON.stringify(pod)} = 316(종전 528 — 남성 104 POD 없음)`);
const fe = cnt(leg, c => `${String(c.iso || '').startsWith('2') ? '20' : '40'}${c.fe === 'E' ? 'E' : 'F'}`);
ok(fe['20F'] === 78 && fe['40F'] === 11 && fe['40E'] === 227, `별첨3 규격별 ${JSON.stringify(fe)} = 316(종전 208/20/404 = 632)`);
//  수석 보드 별첨(legendLiveOf)도 같은 분모
const live = U.legendLiveOf(pre, 'loading', {});
const liveTotal = Object.values(live.fe || {}).reduce((a, s) => a + (s.F ? s.F.n : 0) + (s.E ? s.E.n : 0), 0);
ok(liveTotal === 316, `수석 보드 별첨(legendLiveOf) 합 = ${liveTotal}(종전 632)`);
//  자리 < 실번호(계획 밖 추가분) — 자리 316 + 실번호 330 이면 별첨 330(자리 316 + 남는 실번호 14). 두 번 걸면 316 으로 줄어드니 인쇄허브는 걸지 않고 카고플랜 한 곳만 건다(2차 감사).
const surplus = [...pre, ...Array.from({ length: 14 }, (_, i) => ({ cn: `ZZZU${String(1000000 + i).padStart(7, '0')}`, iso: '45GE', fe: 'E', pod: 'KRKAN', _src: 'list', _inList: true }))];
const legS = U.legendItemsOf(surplus);
ok(legS.length === 330 && legS.filter(isSlot).length === 316 && U.legendItemsOf(legS).length === 316, `자리 316 + 실번호 330 → 별첨 ${legS.length}(자리 316 + 남는 14) · 두 번 걸면 ${U.legendItemsOf(legS).length}(그래서 한 곳만 건다)`);
ok(U.dropFilledBookingSlots(surplus).length === 330 && !U.dropFilledBookingSlots(surplus).some(isSlot), '목록은 실번호 330');
//  반대 방향 리스트 행은 opts.mode 로 뺀다 — 현황요약·마감점검(표식 없는 병합) 경로
const oppRec = { ...sw.loading.records }; delete oppRec[Object.keys(oppRec)[0]]; oppRec.ZZZU0000009 = { cn: 'ZZZU0000009', pol: 'KRPUS', pod: 'KRPTK' };
const oppMerged = [...Object.values(sw.loading.ediContainers).map(c => ({ ...c })), ...Object.values(oppRec).map(r => ({ ...r }))];
const oppNoMode = U.dropFilledBookingSlots(oppMerged, { ediMap: sw.loading.ediContainers, recMap: oppRec });
const oppMode = U.dropFilledBookingSlots(oppMerged, { ediMap: sw.loading.ediContainers, recMap: oppRec, mode: 'loading' });
ok(!oppNoMode.some(isSlot) && oppMode.some(isSlot) && oppMode.length > oppNoMode.length,
  `반대 방향 행 1 + 실번호 315 — mode 없이 자리 전부 삭제(${oppNoMode.length}, 오판) · mode 주면 부분 리스트라 자리 남김(${oppMode.length}, 자리 ${oppMode.filter(isSlot).length})`);
//  자리 없는 배는 아무것도 안 바뀐다
const noSlot = mergeOf(sw.discharge);
ok(U.dropFilledBookingSlots(noSlot).length === noSlot.length && U.legendItemsOf(noSlot).length === noSlot.length, '자리 없는 양하 목록은 불변');

//  ⑦ STSE 2669E — ASC PRE(cn 빈 자리 438) + 실번호 439
const st = FX.stse;
const stFill = U.bookingFillOfSec(st.loading, 'loading');
ok(stFill && stFill.slots === 438 && stFill.real === 439 && stFill.filled, `STSE — bookingFillOfSec ${JSON.stringify(stFill)}`);
const stLeg = U.legendItemsOf(mergeOf(st.loading));
ok(stLeg.length === 439 && stLeg.filter(isSlot).length === 438, `STSE 별첨 모수 = ${stLeg.length}(자리 438 + 계획 밖 실번호 1)`);
ok(U.dropFilledBookingSlots(mergeOf(st.loading)).length === 439, 'STSE 목록 = 439(실번호)');

console.log(fail ? `✗ 부킹 자리 연막검사 실패 ${fail}건` : '✓ 부킹 자리·실번호 중복 계산 연막검사 통과');
process.exit(fail ? 1 : 0);
