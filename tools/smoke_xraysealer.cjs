// X-RAY 봉인자(3.9) — 터미널 표기는 봉인자가 아니고, 그 자리는 조 등록의 그 시각·그 호기 근무자이며, 등록이 없으면 빈칸인지 검사한다.
//
//  왜 있는가 — 검수사 2026-09-05 «카토스라는 문자는 들어 가면 안됩니다» · «조등록이 그때 근무자입니다» · «그건 빈곳으로 놔두시면 됩니다».
//  실측 DJCT 0223E 양하: 카토스 완료가 completed 에 «터미널(CATOS)»로 들어오자 X-RAY 탭 봉인자에 그 글자가 찍히고 «제출 가능»으로 셌다.
//  픽스처 tools/fixtures/xray_sealer_djct.json — 실 RTDB 에서 베낀 X-RAY 3대(termWork·completed·xrayList·info).
const path = require('path');
const fs = require('fs');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_xraysealer.cjs <utils 번들.cjs>'); process.exit(1); }
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'xray_sealer_djct.json'), 'utf8'));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('X-RAY 봉인자 — 터미널 표기 금지 · 조 등록 근무자 · 없으면 빈칸');
const cns = Object.keys(FX.termWork);
ok(cns.length === 3 && cns.every((cn) => FX.completed[cn] && U.isTermApplied(FX.completed[cn])), '픽스처 3대는 터미널 반영분이다(3.16: 표식·접두로 판별)');
//  ① 등록 없음 → 빈칸(수기). 어떤 인자 모양이든 터미널 표기가 새어 나오지 않는다.
for (const cn of cns) {
  const s1 = U.xraySealerOf({}, FX.completed[cn], FX.info), s2 = U.xraySealerOf(undefined, FX.completed[cn]), s3 = U.xraySealerOf({ seal: FX.termWork[cn].customsSeal }, FX.completed[cn], null);
  ok(s1 === '' && s2 === '' && s3 === '', `${cn}: 조 등록 없음 → 빈칸 (info 있음/없음/번호만 있음 셋 다)`);
}
const leak = (v) => /CATOS|카토스|터미널/.test(String(v || ''));
//  ② 조 등록 → 그 시각·호기의 근무자. 세 컨은 전부 GC102(2호기), 19:27~20:00(09-05 야간).
const at = FX.completed[cns[0]].at;
const info = { ...FX.info, craneCrew: { '09-05 야간': { '1호기': { name: '홍길동', at }, '2호기': { name: '김철수', at } } } };
for (const cn of cns) {
  const s = U.xraySealerOf({}, FX.completed[cn], info);
  ok(s === '김철수' && !leak(s), `${cn}: 야간 2호기 등록 → 봉인자 «${s}»`);
}
ok(U.xraySealerOf({}, FX.completed[cns[0]], { ...FX.info, craneCrew: { '09-05 야간': { '1호기': { name: '홍길동', at } } } }) === '', '1호기만 등록하면 2호기 컨은 빈칸(남의 이름을 안 붙인다)');
ok(U.xraySealerOf({}, FX.completed[cns[0]], { ...FX.info, craneCrew: { '09-05 주간': { '2호기': { name: '주간사람', at } } } }) === '', '주간조만 등록하면 야간 컨(19:27)은 빈칸 — 자연 끝 17:30 밖');
//  ③ 사람이 등록/손입력한 봉인자가 우선 · 체크 해제(sealer 빈값 + sealerAt)는 빈칸으로 존중
ok(U.xraySealerOf({ sealer: '박진우', sealerAt: at - 1 }, FX.completed[cns[0]], info) === '박진우', '봉인자 등록(체크)한 사람이 있으면 그 사람 — 완료가 뒤여도 터미널 표기로 안 바뀐다');
ok(U.xraySealerOf({ sealer: '', sealerAt: at + 60000 }, FX.completed[cns[0]], info) === '', '체크 해제(sealer 빈값, 완료보다 뒤) → 빈칸 유지');
ok(U.xraySealerOf({ sealer: '손정정' }, FX.completed[cns[0]], info) === '손정정', '손으로 정정한 이름(옛 모양, sealerAt 없음)이 우선');
//  ④ 종전 규칙 무변 — 앱으로 직접 찍은 사람(by=사람)은 그대로 봉인자
ok(U.xraySealerOf({}, { by: '김성일', at }, info) === '김성일', '앱 완료(by=검수원)는 종전대로 그 사람');
ok(U.xraySealerOf({ sealer: '박진우', sealerAt: at - 1 }, { by: '김성일', at }, info) === '김성일', '봉인자 등록 뒤 다른 사람이 양하완료 → 그 사람(2.39 규칙 그대로)');
//  ⑤ 통계와 한 벌 — crewWorkStats 가 같은 세 컨을 같은 사람 몫으로 센다
const st = U.crewWorkStats({ info, discharge: { termWork: FX.termWork, completed: FX.completed } });
const row = st.rows.find((r) => r.no === 2);
ok(row && row.name === '김철수' && row.dis === 3, `crewWorkStats 도 2호기 김철수 양하 3 (${row && row.name} ${row && row.dis})`);
ok(typeof U.crewSegments === 'function' && typeof U.crewNameAt === 'function' && U.crewNameAt(info, at, 'GC102') === '김철수' && U.crewNameAt(info, at, '2호기') === '김철수' && U.crewNameAt(info, at, 'QC102') === '김철수', 'crewNameAt — GC102·2호기·QC102 모두 2호기');
console.log(fail ? `✗ 실패 ${fail}건` : '✓ X-RAY 봉인자 검사 통과');
process.exit(fail ? 1 : 0);
