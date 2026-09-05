// 실시간 작업 보드 «호기별 작업 베이»(3.10) — utils.craneBoardOf 가 실데이터(DJCT 0223E 양하 사본)에서 호기마다 지금 베이·대수·이름을 맞게 내는지, 동방(QC 합계)·앱 접속·조 등록이 제대로 겹치는지 검사한다.
const path = require('path');
const fs = require('fs');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_craneboard.cjs <utils 번들.cjs>'); process.exit(1); }
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'craneboard_djct.json'), 'utf8'));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('실시간 작업 보드 — 호기별 작업 베이');
const v = { info: FX.info, discharge: { termWork: FX.termWork, completed: FX.completed }, loading: {} };
//  기대값은 픽스처에서 독립 계산(코드가 내는 값을 기준표로 안 쓴다)
const exp = {};
for (const [cn, r] of Object.entries(FX.termWork)) { if (!r.at) continue; const no = +String(r.equip).slice(-1); const e = exp[no] || (exp[no] = { n: 0, last: 0, pos: '' }); e.n++; if (r.at > e.last) { e.last = r.at; e.pos = r.pos; } }
const rows = U.craneBoardOf(v, []);
ok(rows.length === Object.keys(exp).length && rows.every((r, i) => r.no === Object.keys(exp).map(Number).sort()[i]), `호기 ${rows.map(r => r.no).join('·')} — 픽스처의 호기와 같다`);
for (const r of rows) {
  const e = exp[r.no];
  ok(r.done === e.n && r.dis === e.n, `${r.no}호기 대수 ${r.done} = 픽스처 ${e.n}`);
  ok(r.bay === String(parseInt(e.pos.slice(0, 2), 10)) && r.row === e.pos.slice(2, 4) && r.tier === e.pos.slice(4, 6), `${r.no}호기 지금 자리 BAY ${r.bay} ${r.row}-${r.tier} = 최신 컨 ${e.pos}`);
  ok(r.mode === 'discharge' && r.src === 'term' && r.lastAt === e.last && r.name === '', `${r.no}호기 양하·터미널 출처·이름은 등록 전 빈칸`);
}
//  같은 컨이 completed(터미널 표기)에도 있으므로 두 번 안 센다
ok(rows.reduce((a, r) => a + r.done, 0) === Object.values(FX.termWork).filter(r => r.at).length, 'termWork+completed 합쳐도 컨을 두 번 안 센다');
//  조 등록 → 이름
const at = Math.max(...Object.values(FX.termWork).map(r => r.at || 0));
const v2 = { ...v, info: { ...FX.info, craneCrew: { '09-05 야간': { '1호기': { name: '홍길동', at }, '2호기': { name: '김철수', at } } } } };
const r2 = U.craneBoardOf(v2, []);
ok(r2.find(r => r.no === 1).name === '홍길동' && r2.find(r => r.no === 2).name === '김철수', '조 등록(야간 1호기 홍길동 2호기 김철수) → 호기 이름');
//  앱 접속 검수원이 가장 최신 — 이름·베이가 그것으로
const r3 = U.craneBoardOf(v2, [{ name: '박진우', equip: '2호기', bay: '14', tier: '86', mode: 'discharge' }]);
ok(r3.find(r => r.no === 2).name === '박진우' && r3.find(r => r.no === 2).bay === '14' && r3.find(r => r.no === 2).src === 'live' && r3.find(r => r.no === 1).bay === rows[0].bay, '앱 접속 검수원(2호기 박진우 BAY 14) → 그 호기만 앱 값, 1호기는 터미널 값 그대로');
//  앱으로 직접 찍은 완료(by 사람·equip)는 termWork 에 없는 컨만 더하고 이름을 준다
const v4 = { info: FX.info, discharge: { termWork: {}, completed: { AAAU1111111: { by: '김성일', at, equip: '3호기' }, BBBU2222222: { by: '김성일', at: at - 1000, equip: '3호기' } }, records: { AAAU1111111: { bay_actual: '22', row_actual: '01', tier_actual: '82' } } }, loading: {} };
const r4 = U.craneBoardOf(v4, []);
ok(r4.length === 1 && r4[0].no === 3 && r4[0].name === '김성일' && r4[0].done === 2 && r4[0].bay === '22' && r4[0].src === 'app', `앱 완료만 있는 배 → 3호기 김성일 2대 BAY 22 (${JSON.stringify(r4[0])})`);
//  동방 — 컨별 호기 없음 → qcWork 합계, 자리 없음
const r5 = U.craneBoardOf({ info: { vsl: 'OBWH', qcWork: { QC101: { qc: 'QC101', disDone: 110, lodDone: 85 }, QC103: { qc: 'QC103', disDone: 78, lodDone: 68 } } }, discharge: {}, loading: {} }, []);
ok(r5.length === 2 && r5[0].no === 1 && r5[0].src === 'qc' && r5[0].dis === 110 && r5[0].lod === 85 && r5[0].bay === '' && r5[1].no === 3, '동방 QC 합계 → 1호기 양110/선85 · 3호기, 자리 없음');
//  감사: 동방 + 앱 완료 1건(1호기)·접속 검수원이 섞여도 QC 합계(257·213)가 안 사라진다 — 3.8 crewWorkStats 와 같은 termHasEquip 갈림
const r6 = U.craneBoardOf({ info: { vsl: 'OBWH', qcWork: { QC101: { qc: 'QC101', disDone: 257, lodDone: 0 }, QC103: { qc: 'QC103', disDone: 213, lodDone: 0 } } }, discharge: { completed: { CCCU3333333: { by: '김성일', at, equip: '1호기' } }, records: { CCCU3333333: { bay_actual: '12' } } }, loading: {} }, [{ name: '이인철', equip: '3호기', bay: '6', tier: '84', mode: 'discharge' }]);
ok(r6.length === 2 && r6[0].no === 1 && r6[0].qc && r6[0].dis === 257 && r6[0].name === '김성일' && r6[0].bay === '12' && r6[1].no === 3 && r6[1].qc && r6[1].dis === 213 && r6[1].name === '이인철' && r6[1].bay === '6' && r6[1].src === 'live', `동방 + 앱 완료·접속 혼합 → QC 257·213 유지 + 이름·베이 (${JSON.stringify(r6.map(r => [r.no, r.name, r.dis, r.bay, r.src]))})`);
//  감사: 접속 검수원 베이가 덮을 때 다른 컨의 로우가 안 남는다 · by 는 가장 늦게 찍은 사람
ok(r3.find(r => r.no === 2).row === '' && r3.find(r => r.no === 2).tier === '86', '접속 검수원 BAY 14 → 로우 빈칸·단 86(터미널 컨의 로우가 안 남는다)');
const r7 = U.craneBoardOf({ info: {}, discharge: { termWork: {}, completed: { A1: { by: '먼저', at: at - 5000, equip: '1호기' }, A2: { by: '나중', at, equip: '1호기' } } }, loading: {} }, []);
ok(r7[0].name === '나중', '이름은 가장 늦게 찍은 사람(나중)');
//  빈 항차·null 방어
ok(U.craneBoardOf(null, []).length === 0 && U.craneBoardOf({ info: {} }, null).length === 0, '빈 항차·null 도 조용히 빈 배열');
//  터미널 표기·«카토스» 글자가 이름에 새지 않는다
ok(rows.concat(r2, r3, r4, r5).every(r => !/CATOS|카토스|터미널/.test(r.name)), '이름 칸에 터미널 표기 없음');
console.log(fail ? `✗ 실패 ${fail}건` : '✓ 실시간 작업 보드 호기별 검사 통과');
process.exit(fail ? 1 : 0);
