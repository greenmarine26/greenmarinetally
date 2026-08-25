// 미르의 눈 연막검사 — **미르가 순서를 부르는가.** 그리고 앱이 이미 하는 것을 가로채지 않는가.
//
// 왜 있는가 (2026-08-25, NSFR 2616N 양하를 클로드가 앱에서 직접 진행하며 나왔다).
//   검수사 확정 — *«미르야 순서대로 양하하자 하면 순서대로 불러 줘야 하는것입니다»*
//   실측 — `nlSearch` 에 `buildGuidedQueue` **0건**, 「순서대로」·「양하하자」 인텐트 **0건**.
//   자동 가이드 큐는 화면(`GuidedWorkPanel`)만 쥐고 있어, 검수원이 먼저 말을 걸면 미르는 벙어리였다.
//
// ⛔ **여기서 하지 않는 것 — 앱이 이미 한다.**
//   ① 개체 조회(끝4자리 → 실번호·온도·중량) — `BigResultCard` 가 실번호를 거대하게 그리고
//      `announceContainer` 가 «일구일팔, 실번호 씨에프칠구오삼공이, 엑스레이» 로 읽는다.
//   ② 커버 단계 — 자동 가이드가 배너로 묻고 **소리 내어 읽는다**(12초마다 반복):
//        «데크 양하 완료. 해치커버를 열까요, 다른 데크로 갈까요.»
//        «홀드 선적 완료. 해치커버를 닫을까요, 다른 베이 홀드로 갈까요.»
//   2.47 과 2.48 이 이 둘을 모르고 다시 만들었다가 걷어냈다. **화면과 음성을 재고 나서 판단하라.**
const path = require('path');
const OUT = process.argv[2];
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
const E = require(path.resolve(OUT));
if (typeof E.mirSee !== 'function') { console.error('✗ mirSee 가 없다'); process.exit(1); }

//  실데이터 모양(NSFR 2616N) — 24번 그룹 데크 40ft 3대 + 23·25 짝 20ft 2대(트윈)
const C = (cn, bay, row, tier, o = {}) => ({ cn, l4: cn.slice(-4), bay, row, tier,
  iso: '4500', fe: 'F', pod: 'KRPTK', _mode: 'discharge', _ptk: true, ...o });
const containers = [
  C('TXGU5053315', '24', '01', '86', { sl: 'CG070244' }),
  C('TXGU6068372', '24', '02', '86', { sl: 'CG070327' }),
  C('SEKU6558610', '24', '04', '86', { sl: 'DYB396983' }),
  C('TEMU0105882', '23', '05', '82', { sl: 'NS3656833', iso: '2200' }),
  C('TLLU3027470', '25', '05', '82', { sl: 'NS3656367', iso: '2200' }),
];
const info = { vsl: 'NSFR', voy: '2616N', imo: '9884289', berthSide: 'starboard' };
const ctx = { containers, info, mode: 'discharge' };

let bad = 0;
const T = (q, want, why, c = ctx) => {
  let got = null; try { got = E.mirSee(q, c); } catch (e) { got = '[터짐] ' + e.message; }
  const t = got == null ? '(넘김)' : String(got);
  const ok = want === null ? got === null : (want instanceof RegExp ? want.test(t) : t.includes(want));
  if (!ok) { bad++; console.error(`  ✗ «${q}» → ${t.split('\n')[0]}\n     바라는 것: ${want}  (${why})`); }
};

// ① 순서를 부른다 — 화면(buildGuidedQueue)과 **같은 벌**을 쓴다. 새 순서를 만들지 않는다.
T('미르야 순서대로 양하하자', '1번째', '검수사 원문 그대로의 말');
T('순서대로 불러줘', '1번째', '짧게 말해도');
T('양하 하자', '1번째', '더 짧게 말해도');
T('다음', '1번째', '「다음」 한 마디');
T('미르야 순서대로 양하하자', 'TXGU5053315', '컨번호를 부른다');
T('미르야 순서대로 양하하자', 'CG070244', '**실번호를 같이 부른다** — 갑판에서 카드를 못 읽는다');
T('미르야 순서대로 양하하자', '24-01-86', '자리를 부른다');
T('미르야 순서대로 양하하자', '우현 접안', '어느 쪽 접안인지 밝힌다');
T('미르야 순서대로 양하하자', '다음 예정', '다음 둘까지 미리 — 셋 넘으면 귀로 못 듣는다');
// ② 트윈은 두 대를 함께 — 실측 NSFR 에 5쌍이 있었다(11↔13 · 23↔25)
{
  const twinOnly = { containers: containers.slice(3), info, mode: 'discharge' };
  T('순서대로 양하하자', '트윈입니다', '20피트 짝은 한 번에 두 대', twinOnly);
  T('순서대로 양하하자', 'TEMU0105882', '앞 컨', twinOnly);
  T('순서대로 양하하자', 'TLLU3027470', '뒤 컨', twinOnly);
}
// ③ 접안이 안 정해졌으면 순서가 없다 — 지어내지 않는다
T('순서대로 양하하자', '접안 방향이 아직', '접안부터 정해야 순서가 나온다',
  { containers, info: { ...info, berthSide: '' }, mode: 'discharge' });
// ④ 남은 것이 없으면 그렇게 말한다
T('순서대로 양하하자', '남은 것이 없습니다', '끝났으면 끝났다고',
  { containers: containers.map((c) => ({ ...c, _comp: { at: 1 } })), info, mode: 'discharge' });
// ⑤ ⛔ 가로채지 않는다 — 앱이 이미 하는 것에 손대지 않는다
T('1918 실번호', null, '개체 조회는 카드·음성 몫');
T('1918', null, '4자리도 앱 몫');
T('1109 온도', null, '온도도 카드에 있다');
T('커버 열어도 돼', null, '커버는 자동 가이드가 묻고 읽는다');
T('12번 홀드 들어가도 돼', null, '같은 이유');
T('12번 커버 몇장이야', null, '베이 통계는 옛 미르 몫');
T('리퍼 온도 뭐야', null, '집계는 옛 미르 몫');
T('12번 다 됐어', null, '진행률은 옛 미르 몫');
T('', null, '빈 말은 넘긴다');
// ⑥ ⛔ 통합검색(배 여럿)에서는 «순서»가 뜻이 없다 — `info` 미전달이 게이트
T('순서대로 양하하자', null, '`info` 없으면 넘긴다', { containers, mode: 'discharge' });

if (bad) { console.error(`✗ 미르의 눈 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 미르의 눈 연막검사 통과 (순서 부르기 14 · 안 가로챔 9)');
