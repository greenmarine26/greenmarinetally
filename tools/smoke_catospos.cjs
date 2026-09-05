// 터미널 앱(CATOS)이 찍은 실제 자리가 실적 자리로 얹히는지 검사한다.
//
//  왜 있는가 — 검수사 «왜 실제로 올린것을 안받고 예정된 것을 받았나요? 앱은 22번 베이 완료인데... 실제는?»
//  (2026-09-04, SWMM 2609S). CATOS 가 termWork.pos 로 실제 자리를 전량 보내는데 앱이 자리로 안 써서,
//  22번 베이 60칸 중 44칸이 계획과 다른 컨인데도 화면은 계획대로 그렸다.
//  ⚠ 우리 앱으로 찍어 둔 자리는 덮지 않는다 · 계획(ediContainers)은 안 건드린다 — 그 둘이 깨지면 이 검사가 잡는다.
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_catospos.cjs <번들.cjs>'); process.exit(1); }
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));

let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };

console.log('CATOS 실제 자리 — 실적 반영');

//  ① 자리 문자열 파싱
ok(JSON.stringify(U.parseCatosPos('220782')) === JSON.stringify({ bay: '22', row: '07', tier: '82' }), '«220782» → 22-07-82');
ok(U.parseCatosPos('') === null && U.parseCatosPos('2207') === null && U.parseCatosPos(null) === null, '빈값·짧은값은 null');

//  ② 실제 모양 그대로 — SWMM 2609S 에서 베낀 구조
const voy = {
  loading: {
    ediContainers: {
      A1: { bay: '10', row: '02', tier: '82' },   // 계획 10번 → 실제 22번
      B2: { bay: '22', row: '01', tier: '82' },   // 계획대로
      C3: { bay: '30', row: '04', tier: '86' },   // 우리 앱으로 이미 찍음
      D4: { bay: '14', row: '00', tier: '82' },   // CATOS 에 없음
    },
    records: { C3: { bay_actual: '31', row_actual: '05', tier_actual: '88' } },
    termWork: {
      A1: { pos: '220782', status: 'Delivered', at: 111 },
      B2: { pos: '220182', status: 'Delivered', at: 222 },
      C3: { pos: '300486', status: 'Delivered', at: 333 },
      X9: { pos: '380102', status: 'Delivered', at: 444 },   // EDI 에 없는 컨
    },
  },
};
const out = U.applyCatosPos(voy);
const r = out.loading.records;

ok(r.A1 && r.A1.bay_actual === '22' && r.A1.row_actual === '07' && r.A1.tier_actual === '82', 'A1 계획10 → 실적 22-07-82 로 채워진다');
ok(r.A1 && r.A1._pos_src === 'catos', 'A1 출처가 catos 로 남는다');
ok(r.B2 && r.B2.bay_actual === '22', 'B2 계획대로여도 실적 자리를 채운다');
ok(r.C3 && r.C3.bay_actual === '31' && r.C3._pos_src !== 'catos', '우리 앱으로 찍은 C3(31-05-88)은 덮지 않는다');
ok(!r.D4, 'CATOS 에 없는 D4 는 손대지 않는다');
ok(r.X9 && r.X9.bay_actual === '38', 'EDI 에 없는 컨도 실적은 남긴다');

//  ③ 계획은 그대로 — 카고플랜이 보는 자리
const e = out.loading.ediContainers;
ok(e.A1.bay === '10' && e.C3.bay === '30', 'ediContainers(계획)는 한 글자도 안 바뀐다');
ok(voy.loading.records.A1 === undefined, '원본 voyage 를 고치지 않는다(새 객체)');

//  ④ effectivePos 가 그 값을 실적으로 읽는다
const posA = U.effectivePos({ ...e.A1, ...r.A1 });
ok(posA.bay === '22' && posA.row === '07' && posA.tier === '82' && posA.src === 'actual', 'effectivePos 가 22-07-82 를 실적으로 낸다');
const posD = U.effectivePos({ ...e.D4 });
ok(posD.bay === '14' && posD.src === 'edi', 'CATOS 없는 컨은 계획 자리를 그대로 쓴다');

//  ⑤ termWork 가 없거나 이상해도 안 죽는다
ok(U.applyCatosPos({ loading: {} }) && U.applyCatosPos(null) === null && U.applyCatosPos({}) , 'termWork 없음·null 에도 안 죽는다');
const bad = U.applyCatosPos({ loading: { termWork: { Z: { pos: 'abc' } }, records: {} } });
ok(!(bad.loading.records || {}).Z, '못 읽는 자리 문자열은 안 넣는다');


//  ⑥ 베이 문자열이 앱과 같은 모양인가 — 앱은 `String(parseInt(b,10))`(앞 0 없음)로 쓴다.
//     감사 지적(2026-09-04): 표본이 전부 두 자리라 «앞 0 을 떼는» 변이를 못 잡았다. 한 자리 베이를 넣는다.
ok(JSON.stringify(U.parseCatosPos('010382')) === JSON.stringify({ bay: '1', row: '03', tier: '82' }), '«010382» → 베이 «1»(앞 0 없음) · 로우/단은 두 자리');
ok((U.parseCatosPos('090582') || {}).bay === '9', '«090582» → 베이 «9»');

//  ⑦ 실은 것만 — 시각(at) 없는 행(Booking)은 자리를 안 준다. 선사로 나가는 EDI 회신이 걸린 자리다.
const vBk = { loading: { ediContainers: { P1: { bay: '10', row: '02', tier: '82' } },
                         records: {}, termWork: { P1: { pos: '220782', status: 'Booking' } } } };
ok(!((U.applyCatosPos(vBk).loading.records || {}).P1), '시각 없는 행(Booking)은 자리를 안 붙인다');

//  ⑧ 검수사가 지운 자리는 되살리지 않는다 — fbClearActualPosition 이 남기는 moves(why:'cancel').
const vDel = { loading: { ediContainers: { Q1: { bay: '10', row: '02', tier: '82' } },
                          records: { Q1: { moves: [{ why: 'actual' }, { why: 'cancel' }] } },
                          termWork: { Q1: { pos: '220782', at: 999 } } } };
ok(!(U.applyCatosPos(vDel).loading.records.Q1.bay_actual), '지운 자리(moves 끝이 cancel)는 다시 안 채운다');
const vMv = { loading: { ediContainers: { R1: { bay: '10', row: '02', tier: '82' } },
                         records: { R1: { moves: [{ why: 'cancel' }, { why: 'actual' }] } },
                         termWork: { R1: { pos: '220782', at: 999 } } } };
ok(U.applyCatosPos(vMv).loading.records.R1.bay_actual === '22', '취소 뒤 다시 찍은 자리는 정상으로 채운다');

//  ⑨ 보관(archive) 에는 덧칠이 안 박힌다 — stripCatosPos 가 벗긴다.
const applied = U.applyCatosPos(voy);
const stripped = U.stripCatosPos(applied);
ok(!(stripped.loading.records.A1 || {}).bay_actual, '보관 전 CATOS 자리는 벗겨진다');
ok(!(stripped.loading.records.A1), 'CATOS 로만 생긴 레코드는 통째로 빠진다');
ok(stripped.loading.records.C3 && stripped.loading.records.C3.bay_actual === '31', '검수원이 찍은 자리(C3)는 그대로 남는다');
ok(stripped.loading.termWork && Object.keys(stripped.loading.termWork).length === 4, 'termWork 원본은 안 건드린다(되살리면 다시 얹힌다)');
ok(U.stripCatosPos(voy) === voy, '덧칠이 없으면 같은 객체를 그대로 돌려준다');

//  ⑩ 3.16 — 기록자 자리는 비운다(업체 글자 금지). 출처는 _pos_src 표식이 말한다.
ok(r.A1 && !String(r.A1.actual_by || ''), `3.16: 기록자 자리를 비운다 — 업체 글자를 안 넣는다(«${r.A1 && r.A1.actual_by}»)`);
ok(r.A1 && r.A1._pos_src === 'catos', '출처는 _pos_src 표식이 말한다(이름 자리가 아니라)');

console.log(fail ? `\n✗ CATOS 자리 연막검사 실패 ${fail}건` : '\nCATOS 자리 연막검사 통과');
process.exit(fail ? 1 : 0);
