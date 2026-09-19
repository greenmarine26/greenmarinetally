// 호기·장 짝짓기(3.53-07) 연막검사 — KKAK 2609N(동방) 터미널 실적·QC 표 사본으로 utils.craneBaysByTime 을 실소스 그대로 돌린다. 쓰기 없음.
//  왜 있는가 — 검수사 2026-09-19 «그림을 보면 내린 양하화면과 호기별 양하 대수가 바뀜현상». 종전은 «선수(작은 베이) = 작은 호기 번호»
//    가정으로 인덱스 짝을 지어 1호기(QC101 양하 4~5)에 26번 장(8대)을, 3호기(QC103 양하 8)에 38번 장(4대)을 붙였다 — 카드 머리와 그림이 뒤바뀜.
//    기준값은 코드가 아니라 실물이다 — termWork 26번 장 ↔ QC103 · 38번 장 ↔ QC101 이 대수로 맞는다(사본 채취 2026-09-19 12:2x, 26번 장 9대·38번 장 7대 · QC103 9·QC101 7).
//  잰다 — ① KKAK 실물: 1호기→38 · 3호기→26 ② 대수가 못 가르면(같은 값) 종전 오름차순 유지 ③ QC 표 없으면 오름차순 ④ 호기 수·그룹 수 다르면 오름차순.
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_cranepair.cjs <utils번들.cjs>'); process.exit(1); }
const U = require(path.resolve(B));
const FX = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/cranepair_kkak2609n.json'), 'utf8'));
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const tb = U.craneBaysByTime(FX);
ok(tb.byNo && tb.byNo[1] && tb.byNo[1].bay === '38', `KKAK 2609N 1호기 → 38번 장 (${tb.byNo && tb.byNo[1] && tb.byNo[1].bay})`);
ok(tb.byNo && tb.byNo[3] && tb.byNo[3].bay === '26', `KKAK 2609N 3호기 → 26번 장 (${tb.byNo && tb.byNo[3] && tb.byNo[3].bay})`);
ok(tb.byCount === true, '대수로 짝을 바꿨다는 표식(byCount)');
ok(['25', '26', '27'].every((b) => tb.byBay[b] == null || tb.byBay[b] === 3) && tb.byBay['38'] === 1, 'byBay 도 같은 짝(25·26·27→3호기 · 38→1호기)');
ok(tb.byNo[3].bay === '26' && Object.keys(tb.byBay).some((b) => b !== '26'), '3.53-08 — 바구니에 장의 일부(25·27)만 찍혀도 장 전체 [E-1,E,E+1] 대수로 짝을 잰다');
const cb = U.craneBoardOf(FX, []);
const r1 = cb.find((c) => c.no === 1), r3 = cb.find((c) => c.no === 3);
const Q1 = FX.info.qcWork.QC101.disDone + FX.info.qcWork.QC101.lodDone, Q3 = FX.info.qcWork.QC103.disDone + FX.info.qcWork.QC103.lodDone;
ok(r1 && r1.bay === '38' && r1.done === Q1 && r3 && r3.bay === '26' && r3.done === Q3, `수석 보드 카드 — 1호기 ${r1 && r1.bay}/${r1 && r1.done}대(QC101 ${Q1}) · 3호기 ${r3 && r3.bay}/${r3 && r3.done}대(QC103 ${Q3})`);
ok(JSON.stringify(U.pairCranesByCount([1, 3], [8, 4], { 1: 4, 3: 8 })) === '[3,1]', 'pairCranesByCount — 대수가 가르면 바꾼다');
ok(JSON.stringify(U.pairCranesByCount([1, 3], [6, 6], { 1: 5, 3: 5 })) === '[1,3]', '대수가 같으면 종전 오름차순');
ok(JSON.stringify(U.pairCranesByCount([1, 3], [8, 4], {})) === '[1,3]', 'QC 표가 없으면 종전 오름차순');
ok(JSON.stringify(U.pairCranesByCount([1, 3], [8], { 1: 4, 3: 8 })) === '[1,3]', '그룹 수가 다르면 종전 오름차순');
ok(JSON.stringify(U.pairCranesByCount([2, 4], [42, 30], { 2: 42, 4: 30 })) === '[2,4]', 'DXQD 2636E 모양(2호기 11·13=42) — 종전과 같은 답');
console.log(`호기·장 짝짓기 연막검사 ${pass}/${pass + fail} 통과`);
process.exit(fail ? 1 : 0);
