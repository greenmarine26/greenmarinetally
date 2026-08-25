// 미르의 눈 연막검사 — **단계·제동**만 본다. 개체 조회는 앱이 이미 한다(아래 참조).
//
// 왜 있는가. 2026-08-25 NSFR 2616N 양하를 클로드가 직접 해보니 미르가 이것을 못 했다 —
//   «커버 열어도 돼»        → ⛔ 답 없음
//   «12번 홀드 들어가도 돼» → 「12번 베이: 총 27대」   ← 되냐 안 되냐를 물었는데 통계를 준다
//   «데크부터야 홀드부터야» → 갑판 80대를 줄줄이 나열
//   «12번 커버 몇장이야»    → 「12번 베이: 총 50대」
// 🔴 이 자리가 2026-08-11 클로드가 **선적에서 데크부터 눌렀던** 그 자리다(작업표준 §2-2-E).
//   검수사 — *«홀드 선적 없이 데크에 선적이 안됩니다»*
//
// ⛔ **개체 조회(끝4자리 → 실번호·온도·중량)는 여기서 안 한다. 앱이 이미 한다.**
//   `BigResultCard` 가 실번호를 거대하게 그리고 `announceContainer` 가 소리내어 읽는다.
//   2.47 이 그것을 모르고 다시 만들었다가 걷어냈다 — 검수사 *«기존 기능입니다»* · *«음성으로 답해줍니다»*.
//   이 주석은 다음 사람이 같은 것을 또 만들지 않게 하려고 남긴다.
const path = require('path');
const OUT = process.argv[2];
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
const E = require(path.resolve(OUT));
if (typeof E.mirSee !== 'function') { console.error('✗ mirSee 가 없다'); process.exit(1); }

//  양하 순서(검수사 확정 2026-08-11) — **데크 → 커버 오픈 → 홀드.**
//  ⚠ 커버는 **해치 그룹** 것이다 — 실측(NSFR) 커버는 홀수 베이에 붙는다(11:1 · 12:0 · 13:1 → 그룹 2장).
//    베이 하나만 세면 «0장»이라는 거짓말이 나온다(첫 판이 그랬다).
const S = (bay, tier, o = {}) => ({ cn: 'ABCU000' + bay + tier, l4: (bay + tier).slice(-4),
  bay, row: '01', tier, _mode: 'discharge', ...o });
const shipLib = { baysSummary: [
  { bayNo: '11', hatchCount: 1 }, { bayNo: '12', hatchCount: 0 }, { bayNo: '13', hatchCount: 1 },
  { bayNo: '23', hatchCount: 1 }, { bayNo: '24', hatchCount: 0 }, { bayNo: '25', hatchCount: 1 },
] };
const pairs = { '11': '13', '13': '11', '23': '25', '25': '23' };
const containers = [
  S('12', '86'), S('11', '82'),          // 12그룹 데크 2대 남음
  S('12', '06'), S('13', '04'),          // 12그룹 홀드
  S('24', '84', { _comp: { at: 1 } }),   // 24그룹 데크 — 완료(그 자리는 비었다)
  S('24', '06'), S('25', '02'),          // 24그룹 홀드
];
const ctx = { containers, bayPairs: pairs, info: { hatchDone: {} }, shipLib };

let bad = 0;
const T = (q, want, why, c = ctx) => {
  let got = null; try { got = E.mirSee(q, c); } catch (e) { got = '[터짐] ' + e.message; }
  const t = got == null ? '(넘김)' : String(got);
  const ok = want === null ? got === null : (want instanceof RegExp ? want.test(t) : t.includes(want));
  if (!ok) { bad++; console.error(`  ✗ «${q}» → ${t.split('\n')[0]}\n     바라는 것: ${want}  (${why})`); }
};

// ① 단계 — 순서와 까닭
T('데크부터야 홀드부터야', '데크 먼저', '양하 순서를 말한다');
T('어디부터 시작해', '커버', '까닭까지 말한다');
// ② 제동 — 여기가 이 판의 본체다
T('12번 커버 열어도 돼', /데크가 2대 남았/, '⛔ 데크가 남으면 못 연다');
T('24번 커버 열어도 돼', '열어도 됩니다', '데크 끝났으면 된다고 말한다');
T('24번 홀드 들어가도 돼', '커버를 열고', '커버부터 열라고 한다');
T('12번 홀드 들어가도 돼', /데크가 2대 남았/, '⛔ 데크가 먼저다');
T('커버 열어도 돼', '어느 베이인지', '베이를 안 대면 요약만 — 현장에서는 귀로 듣는다');
// ③ 커버 장수 — 해치 그룹 합
T('12번 커버 몇장이야', '2장', '커버는 그룹 합(11+13=2). 베이 하나만 세면 0장이라는 거짓말이 된다');
T('24번 커버 몇장이야', '2장', '같은 규칙');
T('커버 몇장이야', '4장', '배 전체');
T('12번 커버 몇장이야', '모릅니다', '베이사전이 없으면 지어내지 않는다',
  { containers, bayPairs: pairs, info: { hatchDone: {} } });
// ④ ⛔ 가로채지 않는다 — 겹을 앞에 세우는 판은 «새로 되는 것»보다 «가로채는 것»이 위험하다
T('1918 실번호', null, '개체 조회는 앱(카드·음성)이 한다 — 손대지 않는다');
T('1918', null, '4자리도 앱 몫');
T('1109 온도', null, '온도도 카드에 있다');
T('12번 베이 양하 시작할거야', null, '베이 통계는 옛 미르 몫');
T('리퍼 온도 뭐야', null, '집계는 옛 미르 몫');
T('12번 다 됐어', null, '진행률은 옛 미르 몫');
T('', null, '빈 말은 넘긴다');
// ⑤ ⛔ 통합검색(배 여럿)에서는 단계 판단을 하지 않는다 — `info` 를 안 넘기는 것이 게이트다
T('12번 커버 열어도 돼', null, '`info` 없으면 넘긴다', { containers, bayPairs: pairs, shipLib });

// ⑥ 2.49 — 세 갈래(글·카드·음성)가 **모두 침묵**하던 둘
//   ⚠ 고를 때 기준이 2.47 에서 틀렸다. 이제는 카드·음성까지 재고 **셋 다 조용할 때만** 손댄다.
const dupC = [
  { cn: 'FSCU5791109', l4: '1109', sl: 'NSL637295', tmp: '-23', rf: true, bay: '12', row: '02', tier: '82', _mode: 'discharge' },
  { cn: 'GXYU5011109', l4: '1109', sl: 'NSL642228', bay: '12', row: '02', tier: '06', _mode: 'discharge' },
  { cn: 'KMTU9331918', l4: '1918', sl: 'CF795302', bay: '12', row: '01', tier: '88', _mode: 'discharge' },
];
const dctx = (info) => ({ containers: dupC, bayPairs: pairs, info: info || { hatchDone: {} }, shipLib });
T('접안 어느쪽이야', '아직 안 정해져', '안 정했으면 지어내지 않는다', dctx());
T('접안 어느쪽이야', '우현 접안', '정해져 있으면 그것을 말한다', dctx({ berthSide: 'starboard', hatchDone: {} }));
T('1109 온도', '2대입니다', '끝4자리가 겹치면 카드가 안 뜬다 — 되묻는다', dctx());
T('1109 온도', '-23°C', '되물을 때 구별할 값을 같이 보인다', dctx());
T('1109', '2대입니다', '숫자만 불러도 같다', dctx());
//   ⛔ 한 대면 손대지 않는다 — 카드와 음성이 이미 완벽히 한다
T('1918', null, '한 대는 카드·음성 몫', dctx());
T('1918 실번호', null, '한 대는 카드·음성 몫', dctx());
T('9999', null, '없는 번호는 넘긴다', dctx());

if (bad) { console.error(`✗ 미르의 눈 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 미르의 눈 연막검사 통과 (단계·제동 11 · 세갈래침묵 5 · 안 가로챔 11)');
