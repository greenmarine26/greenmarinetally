// 2.99 해치 줄 «커버 폭» 연막검사 — 폭↔경계 한 벌 · 빌더 왕복 보존(BUG-2026-006) · 00열 두 장 판정
const path = require('path');
(async () => {
  const U = await import(path.resolve('src/utils.js'));
  const B = await import(path.resolve('src/shipMatrixBuilder.js'));
  let fail = 0; const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
  console.log('[1] hatchSpansToRows 형식');
  const r1 = U.hatchSpansToRows('3 4 3', 12, false);
  ok(JSON.stringify(r1.rows) === '[[12,10,8,6],[4,2,1,3],[5,7,9,11]]' && r1.extended, '«3 4 3» 축12 → 4·4·4 확장');
  const r2 = U.hatchSpansToRows('4 5', 9, true);
  ok(JSON.stringify(r2.rows) === '[[8,6,4,2],[0,1,3,5,7]]', '«4 5» 축9(00) → 00 오른쪽');
  const r3 = U.hatchSpansToRows('3.5 3.5', 7, true);
  ok(r3.shared0 && JSON.stringify(r3.rows) === '[[6,4,2,0],[0,1,3,5]]', '«3.5 3.5» 축7(00) → 00 두 장');
  ok(!!U.hatchSpansToRows('3.5 3.5', 8, false).err, '«3.5 3.5» 00 없는 축 → 오류');
  ok(!!U.hatchSpansToRows('5 5', 9, true).err, '합 10 > 축 9 → 오류');
  ok(!!U.hatchSpansToRows('3 3', 9, true).err, '차 홀수 → 오류(조용히 안 맞춤)');
  ok(U.hatchRowsToSpans(r3.rows) === '3.5 3.5' && U.hatchRowsToSpans(r2.rows) === '4 5', '경계 → 폭 문자열 왕복');
  console.log('[2] 빌더 왕복이 경계를 보존하는가 (BUG-2026-006)');
  const entry = { code: 'T', name: 'T', bayDef: { baysSummary: [
    { bay: '009', bayNo: '09', rowCount: 9, hasZero: true, holdTiers: [6, 4, 2], deckTiers: [82, 84], hatchCount: 2, hatchRows: [[8, 6, 4, 2], [0, 1, 3, 5, 7]], hatchSpans: '4 5' },
    { bay: '033', bayNo: '33', rowCount: 9, hasZero: true, holdTiers: [], deckTiers: [82], hatchCount: 0 } ] } };
  const m = B.bayDictEntryToMatrix(entry);
  const back = B.matrixToBayDictEntry(m, 'T', 'T', '', '');
  const b9 = back.bayDef.baysSummary.find(b => b.bayNo === '09'); const b33 = back.bayDef.baysSummary.find(b => b.bayNo === '33');
  ok(JSON.stringify(b9.hatchRows) === '[[8,6,4,2],[0,1,3,5,7]]' && b9.hatchSpans === '4 5' && b9.hatchCount === 2, '09 경계·폭·장수 보존');
  ok(!('hatchRows' in b33) && b33.hatchCount === 0, '33 경계 없음은 키 없이(null 안 씀)');
  console.log('[3] 00열 두 장 판정 — hatchOpenable');
  const conts = [ { cn: 'ABCU1234567', bay: '01', row: '00', tier: '82', pod: 'KRPUS' }, { cn: 'ABCU7654321', bay: '01', row: '00', tier: '04', pod: 'KRPTK' } ];   // 컨번호 11자(predictShifting 게이트)
  const info = { 1: { hatchCount: 2, rowCount: 7, hasZero: true, hatchRows: r3.rows } };
  const h = U.hatchOpenable(conts, info, 1, () => false);
  ok(h.total === 2 && h.openable === 0 && h.panels.every(p => p.blocked), '데크 00열 통과분이 두 장 다 막는다');
  const info2 = { 1: { hatchCount: 2, rowCount: 7, hasZero: true, hatchRows: [[6, 4, 2], [0, 1, 3, 5]] } };
  const h2 = U.hatchOpenable(conts, info2, 1, () => false);
  ok(h2.openable === 1, '00이 한 장에만 있으면 한 장은 열린다(종전 동작)');
  console.log('[4] 00열 두 장 판정 — predictShifting');
  const map = { ABCU1234567: conts[0], ABCU7654321: conts[1] };
  const ps = U.predictShifting(map, info);
  ok(Object.keys(ps).length === 1 && ps.ABCU1234567, '홀드 00 양하분 → 두 장 열림 → 데크 00 통과분 시프팅 1');
  const ps2 = U.predictShifting({ ABCU1234567: { ...conts[0], row: '06' }, ABCU7654321: conts[1] }, info);
  ok(Object.keys(ps2).length === 1, '왼쪽 06열 데크 통과분도 걸린다(두 장 다 열리므로)');
  const ps3 = U.predictShifting({ ABCU1234567: { ...conts[0], row: '06' }, ABCU7654321: conts[1] }, info2);
  ok(Object.keys(ps3).length === 0, '00이 오른쪽 한 장뿐이면 왼쪽 06열은 안 걸린다(종전)');
  console.log('[5] 3.2-01 열어야 할 장(needed) — NSDC 2608N 실데이터 (김성일 메모 «1장이면 되는데 2장오픈»)');
  //  실측: 10번 그룹 평택 홀드 12대 전부 00·01·03열(둘째 장) · 22번 그룹 26대 전부 02·04·06·08열(첫째 장). 검수사는 각각 1장을 열었다.
  const FX = require(path.resolve('tools/fixtures/hatch_nsdc.json'));
  const mkVoy = (completed) => ({ info: FX.info, discharge: { ediContainers: FX.ediContainers, completed } });
  const deckDone = {};   // 데크 평택분 전부 내린 시점(자동 가이드가 커버 배너를 띄우는 순간)
  for (const [cn, c] of Object.entries(FX.ediContainers)) if (c.pod === 'KRPTK' && parseInt(c.tier, 10) >= 80) deckDone[cn] = { by: '시험' };
  const h10 = U.hatchOpenableFor(mkVoy(deckDone), 'discharge', 10, FX.dict);
  ok(h10 && h10.total === 2 && h10.openable === 1 && h10.panels[0].blocked, `10번 첫째 장은 통과분(KRPUS·KRKAN 12대)이 막고 있다 (openable=${h10 && h10.openable})`);
  ok(h10 && h10.needed === 1 && h10.panels[1].holdWork.length === 12 && h10.panels[0].holdWork.length === 0, `10번 열어야 할 장은 1(둘째 장·홀드 평택 12대) — needed=${h10 && h10.needed}`);
  const h10z = U.hatchOpenableFor(mkVoy({}), 'discharge', 10, FX.dict);
  ok(h10z && h10z.openable === 0 && h10z.needed === 1, `10번 데크를 아직 안 내렸어도(열 수 있는 장 0) 열어야 할 장은 1 — 종전엔 0→사전 합산 2장으로 떨어졌다 (needed=${h10z && h10z.needed})`);
  const h22 = U.hatchOpenableFor(mkVoy(deckDone), 'discharge', 22, FX.dict);
  ok(h22 && h22.needed === 1 && h22.panels[0].holdWork.length === 26 && h22.panels[1].holdWork.length === 0, `22번 열어야 할 장은 1(첫째 장·홀드 평택 26대) — needed=${h22 && h22.needed}`);
  const h22c = U.hatchOpenableFor(mkVoy(FX.completed), 'discharge', 22, FX.dict);
  ok(h22c && h22c.needed === 1, `22번 닫기 보고 시점(실제 완료 기록 그대로)에도 1장 — needed=${h22c && h22c.needed}`);
  const h14 = U.hatchOpenableFor(mkVoy(deckDone), 'discharge', 14, FX.dict);
  ok(h14 && h14.needed === h14.openable, `14번 홀드 평택분 0 → 종전대로 열 수 있는 장 수(needed=openable=${h14 && h14.openable})`);
  //  선적(2609S) 닫기 보고 실측 — 04:56 «09 (10)11 총 2장»·«13 (14)15 총 2장»·04:29 «21 (22)23 총 2장». 홀드 선적분: 10번 24대 전부 둘째 장 · 14번 8+8 · 22번 17대 전부 첫째 장.
  const mkLod = (completed) => ({ info: FX.info, loading: { ediContainers: FX.loadingEdiContainers, completed } });
  const l10 = U.hatchOpenableFor(mkLod(FX.loadingCompleted), 'loading', 10, FX.dict);
  ok(l10 && l10.needed === 1 && l10.openable === 2, `선적 10번 닫기: 종전 2장(openable=${l10 && l10.openable}) → 1장 (needed=${l10 && l10.needed})`);
  const l14 = U.hatchOpenableFor(mkLod(FX.loadingCompleted), 'loading', 14, FX.dict);
  ok(l14 && l14.needed === 2, `선적 14번 닫기: 홀드 선적분이 두 장에 걸쳐 있어 2장 그대로 (needed=${l14 && l14.needed})`);
  const l22 = U.hatchOpenableFor(mkLod(FX.loadingCompleted), 'loading', 22, FX.dict);
  ok(l22 && l22.needed === 1, `선적 22번 닫기: 1장 (needed=${l22 && l22.needed})`);
  const l10m = U.hatchOpenableFor(mkLod({}), 'loading', 10, FX.dict);
  ok(l10m && l10m.needed === 1, `선적 10번 작업 전(아직 하나도 안 실음)에도 1장 (needed=${l10m && l10m.needed})`);
  const hNo = U.hatchOpenable(Object.values(FX.ediContainers), Object.fromEntries(FX.dict.bayDef.baysSummary.map(b => [parseInt(b.bayNo, 10), b])), 10, () => true);
  ok(hNo.needed === hNo.openable && hNo.openable === 2, 'isWork 없이 부르면 needed = openable (종전 호출부 호환)');
  console.log('[6] 4.07-03 홀드 중심이 4의 배수인 배(STSE) — 트리오를 한 홀드로 센다 (검수사 2026-10-06 22:33 «24번베이가 왜 총6장인지?»)');
  //  실측 STSE 2677E 보고(자동가이드 22:29 «23 (24)25 총 6장» · 21:30 «19 (20)21 총 6장» · 수동 24번만 2장) — 사전은 23·24·25 한 홀드 2장. 정답은 모두 2장.
  const SX = require(path.resolve('tools/fixtures/hatch_stse.json'));
  const vSx = { info: SX.info, discharge: { ediContainers: SX.ediContainers, completed: SX.completed } };
  const gcSx = (b) => parseInt(b, 10);
  const cnt = (bays) => U.hatchPanelCountOf(vSx, 'discharge', bays, SX.dict, gcSx);
  ok(cnt(['23', '24', '25']) === 2, `자동가이드 «23 (24)25» 는 2장 (종전 6) — ${cnt(['23', '24', '25'])}`);
  ok(cnt(['19', '20', '21']) === 2, `자동가이드 «19 (20)21» 도 2장 (종전 6) — ${cnt(['19', '20', '21'])}`);
  ok(cnt(['11', '12', '13']) === 2, `«11 (12)13» 도 2장 — ${cnt(['11', '12', '13'])}`);
  ok(cnt(['24']) === 2 && cnt(['12']) === 2, `수동으로 한 베이만 적어도 2장 — 24:${cnt(['24'])} 12:${cnt(['12'])}`);
  const gSx = [19, 20, 21, 23, 24, 25].map((b) => U.hatchOpenableFor(vSx, 'discharge', b, SX.dict).group);
  ok(JSON.stringify(gSx) === '[20,20,20,24,24,24]', `홀수 베이가 옆 홀드 중심(20·24)으로 묶인다 — ${JSON.stringify(gSx)}`);
  const r24 = U.hatchOpenableFor(vSx, 'discharge', 23, SX.dict);
  ok(r24 && r24.needed === 2 && r24.panels[0].holdWork.length > 0 && r24.panels[1].holdWork.length > 0, '23번으로 물어도 트리오 전체(홀드 평택분 두 장 모두)를 본다');
  //  종전 배는 그대로 — 홀드 중심이 «4로 나눠 2가 남는» NSDC 는 coverGroupOf 가 groupOf 와 같다. 시프팅이 쓰는 groupOf 는 STSE 에서 옛 값(혼자) 그대로다.
  const infoN = Object.fromEntries(FX.dict.bayDef.baysSummary.map((b) => [parseInt(b.bayNo, 10), b]));
  const RN = U.makePanelResolver([], infoN);
  ok(Object.keys(infoN).map(Number).every((n) => RN.coverGroupOf(n) === RN.groupOf(n)), 'NSDC(홀드 중심 ≡ 2 mod 4) 전 베이 — 커버 묶음이 종전과 같다');
  const infoS = Object.fromEntries(SX.dict.bayDef.baysSummary.map((b) => [parseInt(b.bayNo, 10), b]));
  const RS = U.makePanelResolver([], infoS);
  ok(RS.groupOf(23) === 23 && RS.groupOf(25) === 25 && RS.coverGroupOf(23) === 24 && RS.coverGroupOf(25) === 24, '시프팅 축(groupOf)은 그대로 · 커버 묶음(coverGroupOf)만 24');
  ok(RS.coverGroupOf(27) === 27 && RS.coverGroupOf(29) === 29, '해치 없는 데크 전용 베이(27·28·29)는 묶지 않는다');
  //  독립 감사 반례(DJCT) — 사전 3·5 번 hatchCount 0 · 4번 2. 홀수만 적어도(자동가이드 groupBaysOf·수동 «3, 5») 둘째 장이 버려지면 안 된다. 실자료 DJCT 0225E 양하.
  const DJ = require(path.resolve('tools/fixtures/hatch_djct.json'));
  const vDj = { info: DJ.info, discharge: { ediContainers: DJ.ediContainers, completed: DJ.completed } };
  const cDj = (bays) => U.hatchPanelCountOf(vDj, 'discharge', bays, DJ.dict, gcSx);
  ok([[3, 4, 5], [4], [3, 5], [3], [5]].every((b) => cDj(b.map(String)) === 2) && [[7, 8, 9], [8], [7, 9], [7]].every((b) => cDj(b.map(String)) === 2),
    `DJCT 3·4·5 / 7·8·9 — 홀수만 적어도 중심만 적어도 모두 2장 (3,5:${cDj(['3', '5'])} · 3:${cDj(['3'])} · 7,9:${cDj(['7', '9'])})`);
  console.log(fail ? `✗ ${fail}건 실패` : '✓ 해치 폭 연막검사 통과');
  process.exit(fail ? 1 : 0);
})();
