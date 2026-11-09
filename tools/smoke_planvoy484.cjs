// 항차가 다른 덱플랜을 그 쪽 화면에 올리지 않는지 재는 연막검사 (TallyOne 4.84-01).
//   검수사 2026-11-10 «왜 양하 덱플랜이 선적에서도 그대로 보이는지» — 실데이터 RZOR_R124E(양하 R124E · 선적 R124W)의 선적 stowagePlan 이 voy R124E 였다.
const path = require('path'), fs = require('fs');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_planvoy484.cjs <utils 번들.cjs>'); process.exit(1); }
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'planvoy484_rzor.json'), 'utf8'));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const clone = (o) => JSON.parse(JSON.stringify(o));
console.log('다른 항차 덱플랜 걸러내기(4.84-01) · RZOR_R124E 실데이터');
ok(FX.info.voy_d === 'R124E' && FX.info.voy_l === 'R124W', '항차 — 양하 R124E · 선적 R124W');
ok(FX.loading.stowagePlan.voy === 'R124E', '재현 — 선적 stowagePlan 의 voy 가 R124E(양하 항차)');
const v1 = U.dropOtherVoyagePlan(clone(FX));
ok(!v1.loading.stowagePlan, '선적 화면에서는 R124E 덱플랜이 빠진다');
ok(v1.loading._otherVoyPlan && v1.loading._otherVoyPlan.voy === 'R124E' && v1.loading._otherVoyPlan.expected === 'R124W', '가린 이유가 섹션에 남는다(R124E ≠ R124W)');
ok(v1.discharge.stowagePlan && v1.discharge.stowagePlan.voy === 'R124E', '양하 덱플랜(R124E = voy_d)은 그대로');
ok(JSON.stringify(v1.discharge) === JSON.stringify(FX.discharge), '양하 섹션은 한 글자도 안 바뀐다');
const back = U.restoreStaleRawEdi(v1);
ok(JSON.stringify(back.loading) === JSON.stringify(FX.loading), '보관 때 되돌리면 선적 덱플랜이 원래대로 돌아온다(자료를 잃지 않는다)');
const vSame = clone(FX); vSame.loading.stowagePlan.voy = ' r124w ';
ok(U.dropOtherVoyagePlan(vSame).loading.stowagePlan, '선적 항차와 같으면(공백·대소문자 달라도) 그대로 쓴다');
const vNoVoy = clone(FX); delete vNoVoy.loading.stowagePlan.voy;
ok(U.dropOtherVoyagePlan(vNoVoy).loading.stowagePlan, '덱플랜에 항차가 없으면 건드리지 않는다(추측 금지)');
const vNoL = clone(FX); delete vNoL.info.voy_l;
ok(U.dropOtherVoyagePlan(vNoL).loading.stowagePlan, '선적 항차(voy_l)를 모르면 건드리지 않는다');
const vOther = clone(FX); vOther.loading.stowagePlan.voy = 'R125E';
ok(U.dropOtherVoyagePlan(vOther).loading.stowagePlan, '어느 쪽 항차와도 다른 값이면 건드리지 않는다');
const vSameBoth = clone(FX); vSameBoth.info.voy_l = 'R124E';
ok(U.dropOtherVoyagePlan(vSameBoth).loading.stowagePlan, '양하·선적 항차가 같은 배는 건드리지 않는다');
ok(U.dropOtherVoyagePlan(null) === null && U.dropOtherVoyagePlan({}) && typeof U.dropOtherVoyagePlan({}) === 'object', '빈 값에도 죽지 않는다');
console.log(fail ? `✗ ${fail}건 실패` : '✓ 전부 통과');
process.exit(fail ? 1 : 0);
