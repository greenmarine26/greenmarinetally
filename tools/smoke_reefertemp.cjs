// 리퍼 온도 판정 한 벌(3.25) 연막검사 — 세팅과 실측은 짝이라야 뜻이 있다(검수사 확정 2026-09-07).
const U = require(process.argv[2]);
let pass = 0, fail = 0;
const T = (ok, m) => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '⛔'} ${m}`); };
const c = (o) => U.reeferTempOf({ cn: 'X', rf: true, fe: 'F', ...o });

console.log('리퍼 온도 판정 한 벌 (3.25)');
T(c({}).state === 'A', '기준(세팅)이 없으면 A — 「전부 리스트대로」로 빈 값을 확정하면 안 되는 상태');
T(c({ tmp: '-18' }).state === 'B', '세팅이 리스트로 오면 «온도 미입력»이 사라지고 B «검증 안 됨»이 된다');
T(c({ rfSet: '-18' }).state === 'B', '검수원이 넣은 세팅도 기준이 된다');
const x = c({ tmp: '-18', rfAct: '-17.4' });
T(x.state === 'C' && x.diff === 0.6, '둘 다 있으면 C · 차이 +0.6 을 낸다');
T(c({ tmp: '0', rfAct: '3.2' }).diff === 3.2, '차이 계산 — 세팅 0 → 검사 3.2 = +3.2 (2026-09-07 SEGU9578494 실측)');
T(c({ rfSet: '-18', rfAct: '-18', rfSrc: 'list' }).state === 'B',
  '⛔ 「리스트대로」로 베낀 값은 실측이 아니다 → B (2026-09-07 DXQD 19대가 이렇게 «확인 완료»로 굳었다)');
T(c({ rfSet: '-18', rfAct: '-18', rfSrc: 'photo' }).state === 'C', '사진으로 읽은 값은 실측이다 → C');
T(c({ rfSet: '-18', rfAct: '-18', rfSrc: 'manual' }).state === 'C', '손으로 넣은 값도 실측이다 → C');
T(c({ rfdry: true, tmp: '-18' }).target === false, '리퍼드라이(넌플러그)는 온도 대상이 아니다');
T(c({ mkcon: true, tmp: '-18' }).target === false, '마크콘은 온도 대상이 아니다');
T(c({ fe: 'E' }).target === false, '엠티 리퍼는 대상이 아니다 — 리퍼는 풀일 때만 리퍼다');
T(U.reeferTempOf({ cn: 'X', iso: '22G1', fe: 'F' }).target === false, '드라이 컨은 대상이 아니다');
T(c({ fe: '' }).target === true && c({ fe: null }).target === true, 'F/E 미상은 대상에 넣는다(조회·브리핑과 같은 판정)');

console.log('항차 요약 — 화면이 낼 한 줄');
const S = (arr) => U.reeferTempSummary(arr);
const mk = (n, o) => Array.from({ length: n }, (_, i) => ({ cn: 'C' + i, rf: true, fe: 'F', ...o }));
T(S(mk(52, {})).headline === '리퍼 52대 · 기준 온도 없음 52대', 'A 가 있으면 그것부터 말한다');
T(S(mk(29, { tmp: '-18' })).headline === '리퍼 29대 · 검증 안 됨 29대 — 사진 필요', 'B 는 사진을 청한다');
T(S(mk(19, { tmp: '-18', rfAct: '-18', rfSrc: 'photo' })).headline === '리퍼 19대 확인됨', '차이 없으면 조용하다');
T(S(mk(5, { tmp: '0', rfAct: '3.2', rfSrc: 'photo' })).nGaps === 5, '1.0도 이상 벌어진 것을 «짚을 것»으로 센다');
T(S(mk(5, { tmp: '0', rfAct: '0.4', rfSrc: 'photo' })).nGaps === 0, '±0.5 안은 안 짚는다');
T(S([]).headline === '' && S([]).total === 0, '리퍼가 없으면 아무 말도 안 한다');
const mixed = [...mk(2, {}), ...mk(3, { tmp: '-18' }), ...mk(4, { tmp: '-18', rfAct: '-18', rfSrc: 'photo' })];
T(S(mixed).nNoBase === 2 && S(mixed).nUnverified === 3 && S(mixed).nChecked === 4, '섞여 있어도 셋으로 갈라 센다');

console.log(fail ? `\n⛔ ${fail}건 실패` : `\n✓ 전부 통과 (${pass}항)`);
process.exit(fail ? 1 : 0);
