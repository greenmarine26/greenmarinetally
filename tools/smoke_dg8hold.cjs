// 고려해운 «클래스 8 홀드 선적 금지» 경고(3.4) 연막검사 — 실소스(utils·diagnostics·nlSearch 번들)로 실데이터를 돌린다.
//   검수사 지시 2026-09-03(고려해운 공문 09:44 접수) — «고려선사는 홀드에 클래스 8이 선적이 되면 안된다 … 고려선박만 알림»
//   픽스처 tools/fixtures/dg8_kmtc.json = RTDB 실측(KSKM 2613N·2615N 위반 2건 · KKAK 2608N 클래스 3 데크 · SWDN 2606N 같은 조건이나 다른 선사)
const path = require('path');
const [U_, D_, NS_] = process.argv.slice(2);
if (!U_ || !D_ || !NS_) { console.error('✗ 번들 셋(utils·diagnostics·nlSearch)이 필요하다'); process.exit(1); }
const U = require(path.resolve(U_)), D = require(path.resolve(D_)), NS = require(path.resolve(NS_));
const FX = require(path.resolve('tools/fixtures/dg8_kmtc.json'));
let fail = 0; const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
const run = (c, mode, gate) => D.runDiagnostics({ ediContainers: c.loading, listRecords: {}, xrayList: {}, mode, carrier: c.info.carrier, dg8HoldRule: gate }).find((a) => a.code === 'dg8_hold');

console.log('[1] 고려해운 게이트 — utils.isKmtcShip 한 벌');
ok(U.isKmtcShip({ vsl: 'KKAK', carrier: 'KMD' }), 'KKAK(KMTC OSAKA) 고려해운');
ok(U.isKmtcShip({ vsl: 'KKLC' }), 'KKLC 는 선사 코드가 비어도 약자로 잡는다(검수사: 약자 4자 중 앞 2자가 KK)');
ok(U.isKmtcShip({ vsl: 'KSKM', carrier: '' }), 'KSKM(SUNNY KALMIA) 고려해운 — 검수사 확정 2026-09-03');
ok(U.isKmtcShip({ vsl: 'SWDN' }, 'KMD'), '사전 carrier 가 KMD 면 고려해운(EDI carrier 가 비는 항차 보강)');
ok(!U.isKmtcShip({ vsl: 'SWDN', carrier: 'SKR' }), 'SWDN(장금) 은 아니다');
ok(!U.isKmtcShip({ vsl: 'NSDC', carrier: 'NSS' }) && !U.isKmtcShip({}) && !U.isKmtcShip(null), '남성·빈 정보는 아니다');
console.log('[2] 홀드 판정 한 벌 — utils.isHoldTier');
ok(U.isHoldTier('06') && U.isHoldTier('08') && U.isHoldTier(2), '단 80 미만은 홀드');
ok(!U.isHoldTier('82') && !U.isHoldTier('90') && !U.isHoldTier('') && !U.isHoldTier(null), '데크·빈 값은 홀드가 아니다(모르면 안 잡는다)');
console.log('[3] 실데이터 — 위반 두 건만 잡고 나머지는 조용하다');
{
  const a = run(FX.cases.KSKM_2613N, 'loading', true);
  ok(!!a && a.count === 1 && a.level === 'critical', `KSKM 2613N 1대 (${a && a.count})`);
  ok(!!a && a.details[0].cn === 'FTAU1948654' && String(parseInt(a.details[0].bay, 10)) === '5' && a.details[0].row === '01' && a.details[0].tier === '06' && a.details[0].un === '1824',
    `자리·UN 이 실측과 같다 — FTAU1948654 5-01-06 UN1824 (${a && JSON.stringify(a.details[0])})`);
  ok(!!a && /클래스 8 홀드 선적/.test(a.msg) && /갑판/.test(a.voice), '문구·음성에 규정이 들어 있다');
}
{
  const a = run(FX.cases.KSKM_2615N, 'loading', true);
  ok(!!a && a.count === 1 && a.details[0].cn === 'NSSU0207677' && a.details[0].tier === '08', `KSKM 2615N NSSU0207677 13-01-08 (${a && JSON.stringify(a.details[0])})`);
}
ok(!run(FX.cases.KKAK_2608N, 'loading', true), 'KKAK 2608N — 고려해운이지만 클래스 3·데크뿐이라 조용하다');
ok(!run(FX.cases.SWDN_2606N, 'loading', false), 'SWDN 2606N — 같은 조건(클래스 8 홀드 3대)이나 다른 선사라 안 뜬다');
ok(!!run({ ...FX.cases.SWDN_2606N, info: { ...FX.cases.SWDN_2606N.info, carrier: 'KMD' } }, 'loading', true), '⚠ 게이트가 켜지면 같은 자료로 뜬다 — 게이트가 유일한 차이임을 확인');
console.log('[4] 양하 모드·게이트 꺼짐에는 안 뜬다');
ok(!run(FX.cases.KSKM_2613N, 'discharge', true), '양하 모드에서는 안 뜬다(규정은 «실으면 안 된다»)');
ok(!run(FX.cases.KSKM_2613N, 'loading', false), '게이트가 꺼지면 안 뜬다');
console.log('[5] 다른 경고를 밀어내지 않는다');
{
  const all = D.runDiagnostics({ ediContainers: FX.cases.KSKM_2613N.loading, listRecords: {}, xrayList: {}, mode: 'loading', dg8HoldRule: true });
  const codes = all.map((a) => a.code);
  ok(codes.includes('dg8_hold'), '새 경고가 목록에 있다');
  ok(all[0].level === 'critical', 'critical 이 앞에 온다');
  //  감사 지적(3.4-01): 픽스처만으로는 기존 경고가 0건이라 이 단언이 공허했다. 다른 경고가 같이 서는 자료를 만들어 함께 본다.
  const mixed = { ...FX.cases.KSKM_2613N.loading };
  mixed.TESTU0000001 = { cn: 'TESTU0000001', bay: '7', row: '01', tier: '84', pol: 'KRPTK', pod: 'VNHPH', iso: '22G1', fe: 'F', dg: true, dgc: '', un: '' };          // dg_no_class·dg_no_un
  mixed.TESTU0000002 = { cn: 'TESTU0000002', bay: '7', row: '03', tier: '84', pol: 'KRPTK', pod: 'VNHPH', iso: '22RF', fe: 'F', rf: true, tmp: '' };                   // (선적이라 리퍼 온도는 안 본다)
  mixed.TESTU0000003 = { cn: 'TESTU0000003', bay: '9', row: '01', tier: '84', pol: 'KRPTK', pod: 'VNHPH', iso: 'ZZZZ', fe: 'F' };                                      // unknown_iso
  const withGate = D.runDiagnostics({ ediContainers: mixed, listRecords: {}, xrayList: {}, mode: 'loading', dg8HoldRule: true }).map((a) => a.code);
  const noGate = D.runDiagnostics({ ediContainers: mixed, listRecords: {}, xrayList: {}, mode: 'loading', dg8HoldRule: false }).map((a) => a.code);
  ok(noGate.length >= 3 && noGate.includes('dg_no_class') && noGate.includes('dg_no_un') && noGate.includes('unknown_iso'), `대조군에 기존 경고가 실제로 선다 (${noGate.join(',')})`);
  ok(noGate.every((c) => withGate.includes(c)) && withGate.includes('dg8_hold') && withGate.length === noGate.length + 1,
    `게이트를 켜도 기존 경고가 하나도 안 사라지고 새 것만 는다 (${noGate.join(',')} → ${withGate.join(',')})`);
}
console.log('[6] 미르가 이 경고를 설명한다');
{
  const alerts = D.runDiagnostics({ ediContainers: FX.cases.KSKM_2613N.loading, listRecords: {}, xrayList: {}, mode: 'loading', dg8HoldRule: true });
  for (const q of ['클래스 8 홀드가 뭐야', '고려해운 규정 위반이 뭐죠', '부식 갑판', '클래스 경고 왜 떠']) {
    const a = NS.answerAboutAlert(q, alerts) || '';
    ok(/고려해운 규정/.test(a), `«${q}» → ${String(a).slice(0, 40)}`);
  }
  //  감사 지적(3.4-01) — 평범한 말을 삼키지 않는다. 이 경고가 살아 있어도 침묵해야 한다.
  for (const q of ['홀드 작업 급해', '갑판 급한 거 먼저', '데크 취급 주의', '홀드 등급 알려줘', '긴급 데크 확인', '리퍼 온도 알려줘']) {
    ok(!NS.answerAboutAlert(q, alerts), `«${q}» 는 이 경고가 삼키지 않는다`);
  }
}
console.log('[7] 매뉴얼·기능 사전(0-B)');
{
  const fs = require('fs');
  ok(/클래스 8 홀드 선적/.test(fs.readFileSync('src/data/helpData.js', 'utf8')), '매뉴얼에 새 경고 설명이 있다');
  ok(/클래스 8 홀드 선적/.test(fs.readFileSync('src/data/featureIndex.js', 'utf8')), '기능 사전에 항목이 있다');
}
console.log(fail ? `✗ ${fail}건 실패` : '✓ 고려해운 클래스 8 홀드 연막검사 통과');
process.exit(fail ? 1 : 0);
