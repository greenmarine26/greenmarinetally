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
  console.log(fail ? `✗ ${fail}건 실패` : '✓ 해치 폭 연막검사 통과');
  process.exit(fail ? 1 : 0);
})();
