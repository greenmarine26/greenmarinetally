// 미르 화법 시험지 — «가르치고 · 시험하고 · 보강하고 · 재시험» (검수사 지시 2026-08-26)
//
// 검수사 확정 화법 6규칙 중 이 시험이 지키는 것.
//   규칙 2 «묻는 것에 답한다» — 같은 낱말이라도 ~이 뭐야/이란 = 뜻, 어디 = 위치, 몇 대 = 개수.
//     원문 — *«미르에게 답안지 3개만 주고 어떤 질문에 어떤 게 정답인지는 안 알려준것도 있습니다»*
//   규칙 3 «쏟지 않는다» — 갈래 없는 특수화물 한 낱말은 요약 + «목록» 후속 안내.
//   규칙 4 «어디서 물어도 같은 답» — 뜻 분기가 본체(_localAnswerCore)에 있어 세 화면이 한 벌.
//   규칙 6 «모르면 모른다» — 못 배운 말은 지어내지 않고 고백한다(무응답 신고 파이프라인에 잡힌다).
//
// ⚠ 이 시험지는 «새로 되는 것»보다 **가로채지 않는 것**을 더 많이 잰다 — 겹을 앞에 세우는 판의
//   최대 위험은 남의 답을 먹는 것이다(2.47 사고). 반례 문항이 그 그물이다.
//
// 못 배운 말이 나오면 — 미르가 «못 배웠습니다»라 답하고, 통합검색이 mir_unanswered 로 받은함에
// 신고하며, 다음 클로드가 가르치고, 이 시험지에 문항을 늘린다. 그것이 반복 학습의 관이다.
//
// 사용: node tools/smoke_mirspeak.cjs <nlSearch 번들.cjs> <저장소 루트>
const path = require('path');
const fs = require('fs');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
console.warn = () => {};
const NS = require(path.resolve(OUT));

let bad = 0;
const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };

// 실데이터 모양의 픽스처 — FR 30대(요약 갈래 자극) + 일반 20대
const conts = [];
for (let i = 0; i < 30; i++) conts.push({ cn: 'FRTU100' + String(1000 + i), bay: 5 + 2 * (i % 7), row: '0' + (1 + (i % 4)), tier: '82', iso: '22P1', fr: true, pod: 'KRPTK', _ptk: true, _mode: 'discharge', fe: 'F' });
for (let i = 0; i < 20; i++) conts.push({ cn: 'GENU200' + String(1000 + i), bay: 9, row: '0' + (1 + (i % 4)), tier: '04', iso: '22G1', pod: 'KRPTK', _ptk: true, _mode: 'discharge', fe: 'F' });
const ask = (q) => {
  const p = NS.parseNaturalQuery(q);
  const r = NS.applyNLFilter(conts, p);
  const a = NS.generateLocalAnswer(p, r, conts, { mode: 'discharge' });
  return { p, a: a ? String(a) : null };
};

// ── ① 규칙 2 — 뜻을 물으면 뜻이 나온다 (갈래 def, 위치·집계 아님) ──────
{
  const DEF_QS = ['FR이 뭐야', 'FR이란?', 'FR이란', '리퍼가 뭐야', '씰이 뭐야', '해치가 뭐야', '트윈이 뭐야', '시프팅이 뭐야', '양하가 뭐야', 'DG가 뭐야'];
  for (const q of DEF_QS) {
    const { p, a } = ask(q);
    T(p.asking === 'def', `«${q}» 가 뜻 갈래(def)로 안 잡힌다 (asking=${p.asking})`);
    T(!!a, `«${q}» 에 답이 없다`);
    T(!(a && /\d+대\s*—\s*베이/.test(a)), `⛔ «${q}» 에 위치 분포가 나온다 — 뜻을 물었는데 자리를 답한다 (검수사 신고 그 자리)`);
  }
}

// ── ② 규칙 2 — 갈래 표시가 붙으면 그 갈래로 (뜻이 가로채지 않는다) ──────
{
  const m = [
    ['FR 어디', (p) => p.posQuery === true, '위치(posQuery)'],
    ['FR 몇 대', (p) => p.isStat === true, '개수(isStat)'],
    ['FR 목록', (p) => p.listQuery === true, '목록(listQuery)'],
  ];
  for (const [q, chk, nm] of m) {
    const { p } = ask(q);
    T(chk(p) && p.asking !== 'def', `«${q}» 가 ${nm} 갈래를 잃었다 (asking=${p.asking})`);
  }
}

// ── ③ 규칙 3 — 갈래 없는 특수화물 한 낱말은 요약 + «목록» 후속 안내 ─────
{
  const { p, a } = ask('FR');
  T(p.asking !== 'def', '«FR» 단독이 뜻 갈래로 오판됐다');
  T(!!a && /베이/.test(a), '«FR» 단독에 베이 요약이 안 나온다');
  T(!!a && /목록.*이라고|«FR 목록»/.test(a), '«FR» 단독 요약 끝에 «목록» 후속 안내가 없다 (화법 규칙 3)');
  const { a: a2 } = ask('FR 목록');
  T(!!a2 && !/이라고 말씀해/.test(a2), '«FR 목록» 인데도 후속 안내가 또 붙는다 — 이미 목록을 청했다');
}

// ── ④ 반례 — 업무 인텐트를 뜻이 가로채지 않는다 (가로채기 0) ─────────────
{
  const cases = [
    ['남은 거 뭐야', (p) => !!p.progressQuery, '진행'],
    ['빈자리가 뭐야', (p) => !!p.vacantQuery, '빈자리'],
    ['중복이 뭐야', (p) => !!p.dupL4Query, '끝4자리 중복'],
    ['이 배가 뭐야', (p) => !!p.shipIntroQuery, '선박 소개'],
    ['넌 뭐야', (p) => !!p.introQuery, '자기소개'],
    ['20번 베이가 뭐야', (p) => !!p.bay, '베이'],
    ['1918 실번호가 뭐야', (p) => !!p.digits, '개체 조회'],
    ['시프팅 몇 개야', (p) => !!p.isStat, '시프팅 집계'],
    ['몇 대 했어', (p) => !!p.progressQuery, '진행 두 숫자'],
  ];
  for (const [q, chk, nm] of cases) {
    const { p } = ask(q);
    T(p.asking !== 'def', `⛔ «${q}» 를 뜻 갈래가 가로챘다 — ${nm} 답을 뺏는다`);
    T(chk(p), `«${q}» 의 ${nm} 인텐트가 죽었다`);
  }
  //  «83건이 뭐야» 는 건수 후속 — 뜻도, digits 도 아니다 (1.69-01 사고 재발 방지)
  const { p: p83 } = ask('83건이 뭐야');
  T(p83.asking !== 'def' && !p83.digits, '«83건이 뭐야» 판정이 무너졌다 (후속 문맥)');
}

// ── ⑤ 규칙 6 — 못 배운 말은 지어내지 않고 고백한다 ─────────────────────
{
  const { p, a } = ask('수바이란?');
  T(p.asking === 'def', '«수바이란?» 이 뜻 갈래로 안 잡힌다');
  T(!!a && /못 배웠/.test(a), '⛔ 못 배운 말에 «못 배웠습니다» 고백이 안 나온다 — 침묵하거나 지어낸다');
}

// ── ⑥ 규칙 4 — 소스 검사: 화면들이 한 벌을 쓰고, 옛 벌이 되살아나지 않았는가 ──
{
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const ns = read('src/nlSearch.js');
  T(/asking === 'def'/.test(ns) && /mirKnowledge\(parsed\._raw/.test(ns), 'nlSearch 본체에 뜻 분기(asking=def)가 없다');
  const sp = read('src/components/SearchPanel.jsx');
  T(/asking === 'def'\s*\)\s*\?\s*null\s*:\s*mirKnowledge/.test(sp), 'SearchPanel 겹 중복 게이트가 없다 — 뜻이 두 번 나온다');
  const gsp = read('src/pages/GlobalSearchPage.jsx');
  T(/asking === 'def'\s*\)\s*\?\s*null\s*:\s*mirKnowledge/.test(gsp), 'GlobalSearchPage 겹 중복 게이트가 없다');
  //  ★ 2.57-02 (검수사 시험 실측 — 홈과 양하 탭의 «FR이 뭐야» 답안지가 달랐다):
  //    홈도 뜻 갈래는 본체 한 벌을 부른다 — 그리고 그 호출이 기능 색인(howToQuery) 분기보다 앞이어야 한다.
  T(/asking === 'def'[\s\S]{0,220}generateLocalAnswer\(p, \[\], \[\], null\)/.test(gsp), '⛔ 홈이 뜻 갈래에 본체 한 벌을 안 부른다 — 화면마다 답안지가 갈린다');
  T(gsp.indexOf("asking === 'def'") < gsp.indexOf('p.howToQuery'), '⛔ 홈의 뜻 본체 호출이 기능 색인보다 뒤다 — 기능 안내가 가로챈다');
  T(/submitNow\(/.test(gsp) && /slice\(0,\s*30\)/.test(gsp), 'GlobalSearchPage 버튼 제출·카드 상한 30 이 없다 (2.55-01 부작용·쏟기)');
  T(/아직 못 배웠/.test(gsp), 'GlobalSearchPage 무응답 신고가 «못 배웠습니다» 를 안 잡는다 — 반복 학습 관이 끊긴다');
  const vp = read('src/pages/VoyagePage.jsx');
  T(/mirTone/.test(vp), 'VoyagePage 에 말투 겹(mirTone)이 없다');
  T(/search\s*&&\s*!isSentenceQuery\(search\)/.test(vp), 'VoyagePage 문장 입력 중 목록 전량 렌더 게이트가 없다 (화법 규칙 1)');
  T(/setAsk\(a\s*=>\s*\(a\s*&&/.test(vp) || /setAsk\(\s*\(?a\)?\s*=>/.test(vp), 'VoyagePage 옛 답 내리기(setAsk)가 없다 (화법 규칙 5)');
  T(/shiftMap:\s*briefCtx/.test(vp), 'VoyagePage ctx 에 shiftMap 이 없다 — 시프팅 질문이 «없다»로 나온다');
}

//  ⚠ 알고 있는 남은 오답 (이 판에서 안 고침 — 고치면 이 주석과 함께 문항으로 승격할 것)
//    «오늘 작업 뭐야» → 기능 색인 «작업 중단» 이 잡힌다(현행과 동일 — 색인 매칭 문제, 갈래 문제 아님).
//    «FR 실번호가 뭐야» → 용어집 «실번호» 뜻이 나온다(FR 의 씰 목록이 정답 — 주제 둘 겹침).
//    트윈·해치·씰의 «몇 대/몇 장» 개수 답안지 부재, «탱크가 뭐야» 전용 항목 부재 — 인계함 참조.

if (bad > 0) { console.error(`✗ 미르 화법 시험 실패 ${bad}건`); process.exit(1); }
console.log('✓ 미르 화법 시험 통과 — 뜻 10 · 갈래 유지 3 · 요약+후속 4 · 가로채기 0 (10) · 모른다 고백 · 소스 배선 10');
