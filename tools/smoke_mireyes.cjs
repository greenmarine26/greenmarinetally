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
//  ⚠ 2.52 — localStorage 를 여기서 세운다. 미르는 호기(gm_equip_no)를 앱과 같은 단일 소스에서 읽는데,
//    Node 에는 그것이 없어 try/catch 가 빈 값으로 넘어간다. 그러면 **갱 구분 검사가 조용히 무력화**되고
//    검사는 초록으로 통과한다 — 「건너뜀은 통과가 아니다」(작업표준 §2-2-M). 실제로 세워 놓고 잰다.
if (typeof globalThis.localStorage === 'undefined') {
  const _d = {};
  globalThis.localStorage = {
    getItem: (k) => (k in _d ? _d[k] : null),
    setItem: (k, v) => { _d[k] = String(v); },
    removeItem: (k) => { delete _d[k]; },
  };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = { localStorage: globalThis.localStorage, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
}
//  세운 것이 실제로 읽히는지 한 번 확인한다 — 이 줄이 없으면 폴리필이 깨져도 모른다.
localStorage.setItem('__probe', 'x');
if (localStorage.getItem('__probe') !== 'x') { console.error('✗ localStorage 폴리필 실패 — 갱 구분 검사가 무의미해진다'); process.exit(1); }
localStorage.removeItem('__probe');

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
T('순서대로 양하하자', '양하는 남은 것이 없습니다', '끝났으면 끝났다고 — 조사도 맞게(2.52)',
  { containers: containers.map((c) => ({ ...c, _comp: { at: 1 } })), info, mode: 'discharge' });
// ⑤ ⛔ 가로채지 않는다 — 앱이 이미 하는 것에 손대지 않는다
T('1918 실번호', null, '개체 조회는 카드·음성 몫');
T('1918', null, '4자리도 앱 몫');
T('1109 온도', null, '온도도 카드에 있다');
T('커버 열어도 돼', null, '커버는 자동 가이드가 묻고 읽는다');
//   ★ 2.51 에서 이 한 줄이 뒤집혔다 — 규칙을 무르게 한 것이 아니라 **국면이 다르다.**
//     배너는 «데크가 끝났을 때» 화면이 먼저 묻는 자리다. 여기는 그 반대편 —
//     **검수사가 먼저 홀드를 꺼냈을 때**로, 종전엔 답할 사람이 아무도 없었다.
//     미르는 판정을 새로 만들지 않는다: 앱이 쓴 `info.hatchDone` 과 데크 잔량(물리 사실)을 읽어 말할 뿐이다.
T('12번 홀드 들어가도 돼', '홀드', '검수사가 먼저 홀드를 꺼내면 미르가 커버를 본다');
T('12번 커버 몇장이야', null, '베이 통계는 옛 미르 몫');
T('리퍼 온도 뭐야', null, '집계는 옛 미르 몫');
T('12번 다 됐어', null, '진행률은 옛 미르 몫');
T('', null, '빈 말은 넘긴다');
// ⑥ ⛔ 통합검색(배 여럿)에서는 «순서»가 뜻이 없다 — `info` 미전달이 게이트
T('순서대로 양하하자', null, '`info` 없으면 넘긴다', { containers, mode: 'discharge' });

// ⑦ ★ 2.51 — **베이를 알아듣는다.** 갱마다 베이가 갈린다(실측: GC104=24묶음 · GC103=12묶음+01).
//   배 전체 1등을 부르면 「4호기」를 단 검수사에게 남의 베이를 부르는 셈이다.
{
  const B = [
    C('NSSU7091676', '12', '05', '88', { sl: 'NS3774736' }),
    C('NSSU7098460', '12', '03', '88', { sl: 'NS3656840' }),
    ...containers,
    C('AAAU1000001', '24', '07', '08', { sl: 'X1' }),   // 24묶음 홀드
    C('AAAU1000002', '24', '05', '08', { sl: 'X2' }),
  ];
  const c2 = { containers: B, info, mode: 'discharge' };
  T('24번 베이 양하하자', '24', '베이를 대면 그 묶음으로', c2);
  T('24번 베이 양하하자', 'TXGU5053315', '24묶음 1등은 3315 — 검수사 확정 «우현이면 3315 가 먼저»', c2);
  T('24번 베이 양하하자', /23.24.25번 베이/, '묶음(23·24·25)을 통째로 밝힌다', c2);
  T('25베이 양하하자', 'TXGU5053315', '홀수 짝 베이로 불러도 같은 묶음', c2);
  T('12베이 양하하자', 'NSSU7091676', '12묶음은 12묶음대로', c2);
  T('12베이 양하하자', '12번 베이', '짝수 베이는 그 자체가 묶음 중심', c2);
  //   ⚠ 11·13 은 이 픽스처에 컨이 없어 짝이 안 선다. 실데이터(NSFR 140대)에서는 «11·12·13번 베이» 로 나온다 — tools/ 밖 시뮬로 확인.
  //  ⛔ 물리 제동 — 커버 위에 화물이 있으면 안 열린다 (검수사 2026-08-05)
  T('24번 베이 홀드 작업 할꺼야', '아직 못 엽니다', '데크가 남았으면 커버가 안 열린다', c2);
  T('24번 베이 홀드 작업 할꺼야', /데크에 \d+대가 남아/, '몇 대가 막고 있는지 센다', c2);
  //  데크를 다 내리면 — 검수사가 그린 대화 그대로
  const done = B.map((c) => (String(c.bay).match(/^(23|24|25)$/) && parseInt(c.tier, 10) >= 80)
    ? { ...c, _comp: { at: 1, equip: 'GC104' } } : c);
  const c3 = { containers: done, info, mode: 'discharge' };
  T('24번 베이 홀드 작업 할꺼야', '커버는 열렸나요', '데크가 비면 커버를 묻는다', c3);
  T('24번 베이 홀드 작업 할꺼야', 'AAAU1000001', '묻고 나서 첫 컨을 부른다 — 막지 않는다', c3);
  const c4 = { containers: done, info: { ...info, hatchDone: { discharge_24: 'open' } }, mode: 'discharge' };
  T('24번 베이 홀드 작업 할꺼야', '커버 열림 기록 있음', '열림 기록이 있으면 되묻지 않는다', c4);
  T('24베이 데크', '남은 것이 없습니다', '데크가 끝났으면 끝났다고', c3);
  //  ⛔ 베이를 안 대면 어느 베이인지 반드시 밝힌다
  T('미르야 순서대로 양하하자', '번 베이부터입니다', '남의 베이를 부르지 않도록 베이를 밝힌다', c2);
  //  ⛔ 조회는 여전히 옛 미르 몫
  T('24번 베이 몇 대야', null, '베이 통계는 옛 미르', c2);
  T('12베이 어디야', null, '위치 조회도 옛 미르', c2);
  T('24번 베이', null, '베이만 덜렁 대면 아직 조회다', c2);
}

// ⑧ ★ 2.52 — **«다음»이 내 베이를 이어간다.** 상태를 안 들고 완료 기록으로 안다.
{
  const G = [
    C('AAAU2400001', '24', '01', '86', { sl: 'S1' }),
    C('AAAU2400002', '24', '02', '86', { sl: 'S2' }),
    C('AAAU2400003', '24', '07', '08', { sl: 'S3' }),   // 24묶음 홀드
    C('BBBU1200001', '12', '05', '88', { sl: 'S4' }),
    C('BBBU1200002', '12', '03', '88', { sl: 'S5' }),
  ];
  const done = (cn, at, eq) => G.map((c) => (c.cn === cn ? { ...c, _comp: { at, by: '검수', equip: eq } } : c));
  //  내 갱(GC104)이 24 를 하나 내렸고, 남의 갱(GC103)이 12 를 **더 나중에** 내렸다
  const mixed = G.map((c) => c.cn === 'AAAU2400001' ? { ...c, _comp: { at: 100, by: 'ㄱ', equip: 'GC104' } }
    : c.cn === 'BBBU1200001' ? { ...c, _comp: { at: 900, by: 'ㄴ', equip: 'GC103' } } : c);
  const withEq = (eq, arr, hatch) => {
    try { if (eq) localStorage.setItem('gm_equip_no', eq); else localStorage.removeItem('gm_equip_no'); } catch (e) {}
    return { containers: arr, info: { ...info, hatchDone: hatch || {} }, mode: 'discharge' };
  };
  T('다음', 'AAAU2400002', '내 갱이 하던 24묶음을 이어간다 — 더 최근인 남의 12묶음을 안 따라간다', withEq('GC104', mixed));
  T('다음', /24.25번 베이 이어서|24번 베이 이어서/, '이어간다고 말한다', withEq('GC104', mixed));
  T('다음', '이 베이 1대 완료', '번호·집계는 이 묶음 기준 — 통산이면 남의 갱까지 센다', withEq('GC104', mixed));
  T('다음', 'BBBU1200002', '갱이 다르면 그 갱 베이로', withEq('GC103', mixed));
  //  갱 기록이 없으면 갱을 안 가린다(혼자 작업·옛 기록에서 이어가기가 죽지 않게)
  T('다음', 'AAAU2400002', '갱 미지정이면 마지막 완료를 따라간다', withEq('', done('AAAU2400001', 100, '')));
  //  데크가 비면 커버가 다음 관문이다
  const deckDone = G.map((c) => (c.bay === '24' && parseInt(c.tier, 10) >= 80) ? { ...c, _comp: { at: 100, by: 'ㄱ', equip: 'GC104' } } : c);
  T('다음', '커버부터입니다', '데크가 비면 커버를 짚는다', withEq('GC104', deckDone));
  T('다음', 'AAAU2400003', '짚고 나서 홀드 첫 컨을 부른다 — 막지 않는다', withEq('GC104', deckDone));
  T('다음', /^(?!.*커버부터)/s, '커버 열림 기록이 있으면 되묻지 않는다', withEq('GC104', deckDone, { discharge_24: 'open' }));
  //  묶음을 끝내면 그렇게 말하고 다음 베이로
  const allDone24 = G.map((c) => c.bay === '24' ? { ...c, _comp: { at: 100, by: 'ㄱ', equip: 'GC104' } } : c);
  T('다음', '끝났습니다', '묶음이 끝나면 끝났다고', withEq('GC104', allDone24));
  T('다음', 'BBBU1200001', '끝났으면 다음 베이를 부른다', withEq('GC104', allDone24));
  try { localStorage.removeItem('gm_equip_no'); } catch (e) {}
}

if (bad) { console.error(`✗ 미르의 눈 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 미르의 눈 연막검사 통과 (순서 부르기 14 · 베이·커버 16 · 이어가기 11 · 안 가로챔 11)');
