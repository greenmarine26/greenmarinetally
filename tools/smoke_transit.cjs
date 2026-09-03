// 통과분 판정 한 벌(utils.isTransitContainer·canCompleteContainer) 연막검사 — 3.2-01 감사 P1-1·P1-2 재생
//   실데이터: NSDC 2608N 양하 0320 두 컨(RTDB 09-03) · PCBJ 2609N 선적 리스트 전용 컨 CRTU7600877(archive, 항구 빈칸)
const path = require('path');
const OUT = process.argv[2];
if (!OUT) { console.error('✗ utils 번들 경로가 없다'); process.exit(1); }
const U = require(path.resolve(OUT));
let fail = 0; const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
const FX = require(path.resolve('tools/fixtures/dup4_nsdc.json'));
const FFAU = FX.ediContainers.FFAU4440320, SEGU = FX.ediContainers.SEGU2520320;
const listOnly = { bl: '', cn: 'CRTU7600877', fe: '', iso: '', l4: '0877', pod: '', pol: '', rf: false, wt: 0 };   // archive/PCBJ_2609N/loading/records 그대로
console.log('[1] 통과분 = 항구가 적혀 있고 평택이 아님');
ok(U.isTransitContainer(SEGU, 'discharge', FX.records) === true, 'SEGU2520320(POD KRPUS, 리스트 없음) → 통과');
ok(U.isTransitContainer(FFAU, 'discharge', FX.records) === false, 'FFAU4440320(POD KRPTK) → 작업분');
ok(U.isTransitContainer(FFAU, 'discharge', null) === false, '리스트 없이 봐도 POD 평택이면 작업분');
console.log('[2] 항구 빈칸(리스트 전용 컨)은 통과가 아니다 — 감사 P1-1(PCBJ 2609N 18대)');
ok(U.isTransitContainer(listOnly, 'loading', null) === false, 'CRTU7600877(pol 빈칸, 리스트 없이) → 통과 아님');
ok(U.isTransitContainer(listOnly, 'loading', { CRTU7600877: listOnly }) === false, '리스트 등재 → 작업분');
ok(U.canCompleteContainer(listOnly, 'loading') === true, '완료 가능(선적확인 큰 카드가 서야 한다)');
console.log('[3] 리스트 등재·시프팅·초과는 항구가 타항이어도 작업분');
ok(U.isTransitContainer(SEGU, 'discharge', { SEGU2520320: {} }) === false, '리스트에 오른 KRPUS 컨 → 작업분(V9.29 isPtk 규칙)');
ok(U.canCompleteContainer({ ...SEGU, _shift: 'out' }, 'discharge') === true, '시프팅 카드 → 완료 가능');
ok(U.canCompleteContainer(SEGU, 'discharge', null, new Set(['SEGU2520320'])) === true, 'shiftCns 에 든 컨 → 완료 가능(베이플랜→상세 길)');
ok(U.canCompleteContainer({ cn: 'X', _extra: true, pod: '' }, 'discharge') === true, '초과 컨 → 완료 가능');
console.log('[4] canCompleteContainer — 플래그 우선, 없으면 직접 판정(옆길 P1-2)');
ok(U.canCompleteContainer({ ...SEGU, _transit: true }, 'discharge') === false, '_transit:true → 불가');
ok(U.canCompleteContainer({ ...SEGU, _transit: false }, 'discharge') === true, '_transit:false → 가능(병합이 판정한 값을 믿는다)');
ok(U.canCompleteContainer(SEGU, 'discharge') === false, '플래그 없는 SEGU(베이플랜→상세 모양) → 불가');
ok(U.canCompleteContainer(SEGU, undefined) === false && U.canCompleteContainer({ ...SEGU, _mode: 'discharge' }) === false, 'mode 없으면 _mode 로');
ok(U.canCompleteContainer({ cn: 'BEAU2309526', pod: 'KRKAN', pol: 'VNSGN', bay: '27' }, 'loading') === false, '선적 모드는 POL 로 본다(VNSGN → 통과)');
ok(U.canCompleteContainer({ cn: 'TEST0000001', pod: 'KRPUS', pol: 'KRPTK' }, 'loading') === true, '선적 모드 POL 평택 → 가능');
console.log(fail ? `✗ ${fail}건 실패` : '✓ 통과분 판정 연막검사 통과');
process.exit(fail ? 1 : 0);
