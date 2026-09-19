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
//  3.53-09 — 안벽 순서 × 접안 방향이 먼저다(검수사 2026-09-06 «바다를 바라보고 좌측부터 PNCT 4-2-1-3호기» · «우현접안이므로 3호기가 선수»).
//    사본에는 berthSide·pier 가 없어 아래 ①~⑤는 대수 갈래를 잰다.
const withSide = (side, pier = 'PNCT', qc) => ({ ...FX, info: { ...FX.info, berthSide: side, pier, ...(qc ? { qcWork: qc } : {}) } });
const tS = U.craneBaysByTime(withSide('우현')), tP = U.craneBaysByTime(withSide('좌현'));
ok(tS.byNo[3].bay === '26' && tS.byNo[1].bay === '38' && tS.side === 'starboard' && tS.pier === 'PNCT', `동방 우현 {1,3} — 3호기 선수(26) · 1호기 선미(38) (${tS.byNo[3].bay}/${tS.byNo[1].bay})`);
ok(tP.byNo[1].bay === '26' && tP.byNo[3].bay === '38' && tP.side === 'port', `동방 좌현 {1,3} — 1호기 선수(26) · 3호기 선미(38) (${tP.byNo[1].bay}/${tP.byNo[3].bay})`);
ok(U.craneBaysByTime(withSide('우현', 'PNCT', { QC101: { qc: 'QC101', disDone: 5 }, QC103: { qc: 'QC103', disDone: 5 } })).byNo[3].bay === '26', '우현이면 대수가 같아도(동점) 순서가 정한다');
const PG = (v, nos, cnt) => JSON.stringify(U.pairCranesForGroups(v, nos, cnt));
ok(PG({ info: { berthSide: '우현', pier: 'PNCT' } }, [1, 2], [10, 10]) === '[1,2]', '동방 우현 {1,2} — 1호기 선수(OBWH 2735E·KKLC 2608N 실측)');
ok(PG({ info: { berthSide: '우현', pier: 'PNCT' } }, [2, 4], [10, 10]) === '[2,4]', '동방 우현 {2,4} — 2호기 선수(DXQD 2636E 실측 · 검수사 «선수가 2호기 선미가 4호기»)');
ok(PG({ info: { berthSide: '좌현', pier: 'PNCT' } }, [2, 4], [10, 10]) === '[4,2]', '동방 좌현 {2,4} — 4호기 선수');
ok(PG({ info: { berthSide: '우현', pier: 'PCTC' } }, [1, 2], [10, 10]) === '[2,1]', 'PCTC 우현 {1,2} — 우측(2호기)이 선수');
ok(PG({ info: { berthSidePick: '좌현', berthSide: '우현', pier: 'PNCT' } }, [1, 3], [9, 7]) === '[1,3]', '검수사가 고른 방향(berthSidePick)이 수집기 값보다 먼저');
ok(PG({ info: { berthSide: '좌현', pier: 'PNCT', qcWork: { QC103: { qc: 'QC103', disDone: 100 }, QC105: { qc: 'QC105', disDone: 260 } } } }, [3, 5], [260, 100]) === '[5,3]', 'RZOR {3,5} — 5호기가 안벽 순서에 없어 대수 갈래로');
ok(PG({ info: { berthSide: '우현', qcWork: { QC101: { qc: 'QC101', disDone: 14 }, QC103: { qc: 'QC103', disDone: 17 } } } }, [1, 3], [17, 14]) === '[3,1]', '부두를 모르면 대수 갈래로');
//  감사 [중대](3.53-09) — 콘앱이 같은 함수를 부르되 접안방향·부두를 안 넘기면 두 앱 답이 갈린다. cone.html 호출부가 그 재료를 넘기는지 글자로 잰다.
const CONE = fs.readFileSync(path.resolve(__dirname, '../public/cone.html'), 'utf8');
ok(/info\/berthSide\.json/.test(CONE) && /info\/berthSidePick\.json/.test(CONE) && /info\/pier\.json/.test(CONE) && /craneBaysByTime[\s\S]{0,400}qcWork: CT\.qc, \.\.\.\(_inf\|\|\{\}\)/.test(CONE),
   '콘앱(cone.html)이 craneBaysByTime 에 berthSide·berthSidePick·pier 를 같이 넘긴다(두 앱 같은 답)');
const tb = U.craneBaysByTime(FX);   // 방향 없음 → 대수 갈래
ok(tb.byNo && tb.byNo[1] && tb.byNo[1].bay === '38', `KKAK 2609N 1호기 → 38번 장 (${tb.byNo && tb.byNo[1] && tb.byNo[1].bay})`);
ok(tb.byNo && tb.byNo[3] && tb.byNo[3].bay === '26', `KKAK 2609N 3호기 → 26번 장 (${tb.byNo && tb.byNo[3] && tb.byNo[3].bay})`);
ok(tb.byCount === true && tb.side === '', '방향 없음 — 대수로 짝을 바꿨다는 표식(byCount)');
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
