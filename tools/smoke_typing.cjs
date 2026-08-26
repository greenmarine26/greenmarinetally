// 타자 연막검사 — **문자를 칠 때는 다 받고 답한다. 숫자는 치는 대로 답한다.**
//
// 왜 있는가 (검수사 신고 2026-08-26).
//   *«숫자가 아니고 문자를 입력 받을때는 질문을 다 받고 답하는걸 가르치세요.
//     오늘도 FR치니 100개의 FR리스트를 보여주고 FR이란? 이때 FR설명 FR이 뭐야 하니
//     FR이 있는 베이와 갯수 이렇게 나옵니다»*
//
//   ★ 그 장면이 활동 기록에 그대로 찍혀 있었다 — activity_log/260826, 박진우 12:34~12:35:
//     FR → FR 이 → FR → FR이 → FR이 ㅁ → FR이 뭐 → FR이 뭐이 → FR이 뭐야
//     **한 질문을 치는 데 8단계, 그때마다 답이 나갔다.**
//
//   원인은 판정이 두 벌이었기 때문이다. 이 검사는 **한 벌인 것**과
//   **옛 벌이 되살아나지 않는 것**을 같이 잰다.
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
const U = require(path.resolve(OUT));

let bad = 0;
const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ── ① 판정이 있는가 · 맞는가 ────────────────────────────────────────
T(typeof U.isSentenceQuery === 'function', 'isSentenceQuery 가 없다');
T(typeof U.fullContainerNo === 'function', 'fullContainerNo 가 없다');
if (typeof U.isSentenceQuery !== 'function') { console.error('✗ 판정이 없어 더 못 잰다'); process.exit(1); }

//  ⚠ 즉답은 검수사가 갑판에서 쓰는 빠른 길이다 — 하나라도 막으면 안 된다.
const 즉답 = ['4777', '28', '24', '24-01-86', '  4777  ', 'DWSU3000276', 'DWSU 3000276', 'dwsu3000276', '86 04'];
for (const q of 즉답) T(U.isSentenceQuery(q) === false, `⛔ «${q}» 가 즉답이 아니게 됐다 — 갑판에서 쓰는 빠른 길을 막았다`);

//  글자가 섞이면 말의 시작일 수 있다 — 다 받고 답한다.
const 대기 = ['FR', 'RF', 'OT', 'DG', 'TK', 'FR이', 'FR이 뭐', 'FR이 뭐야', 'FR이란', '브리', '브리핑',
              '미르야', '미르야 양하', '미르야 양하 28번데크', '28번데크 완료처리해줘', '몇 대 했어', 'XRAY'];
for (const q of 대기) T(U.isSentenceQuery(q) === true, `⛔ «${q}» 를 치는 중에 답한다 — 질문을 다 받아야 한다`);

//  빈 것은 문장도 즉답도 아니다(답을 내리는 자리)
T(U.isSentenceQuery('') === false, '빈 입력을 문장으로 본다');
T(U.isSentenceQuery('   ') === false, '공백만 있는 입력을 문장으로 본다');

// ── ② ★ 옛 판정이 되살아나지 않았는가 (소스 전수) ──────────────────
//   양하·선적 탭이 갖고 있던 사본. 이것이 남아 있으면 «FR» 이 다시 100대를 뿌린다.
{
  const 옛 = /\/\^\[0-9A-Z\\s-\]\{1,15\}\$\//;
  for (const f of ['src/pages/VoyagePage.jsx', 'src/components/SearchPanel.jsx', 'src/pages/GlobalSearchPage.jsx']) {
    T(!옛.test(read(f)), `⛔ ${f} 에 옛 판정 /^[0-9A-Z\\s-]{1,15}$/ 가 남아 있다 — 판정이 다시 두 벌이 된다`);
  }
  //  SearchPanel 이 제 벌을 다시 만들지 않았는가
  const sp = read('src/components/SearchPanel.jsx');
  T(!/const CN_FULL_RE\s*=/.test(sp), '⛔ SearchPanel 이 컨번호 정규식 사본을 다시 갖고 있다');
  T(/isSentenceQuery/.test(sp), 'SearchPanel 이 공용 판정을 안 쓴다');
}

// ── ③ ★ 세 창이 전부 그 판정에 배선됐는가 ──────────────────────────
{
  const vp = read('src/pages/VoyagePage.jsx');
  T((vp.match(/isSentenceQuery/g) || []).length >= 5,
    '⛔ VoyagePage 배선이 모자란다 — 검색바 2개 × (라이브 필터 + 전송) 넷 + import');
  T(/if \(search && !isSentenceQuery\(search\)\)/.test(vp),
    '⛔ 라이브 필터가 문장을 그대로 거른다 — «FR» 두 글자에 100대가 뿌려지는 자리다');
  T((vp.match(/if \(search && !isSentenceQuery\(search\)\)/g) || []).length === 2,
    '⛔ 라이브 필터 두 곳(양하·선적) 중 한 곳만 고쳤다');

  const gs = read('src/pages/GlobalSearchPage.jsx');
  T(/isSentenceQuery\(query\)/.test(gs), '⛔ 홈·수석창이 여전히 200ms 마다 자동으로 답한다');
  T(/setDebouncedQuery\(''\)/.test(gs), '⛔ 새 문장을 치기 시작해도 옛 답이 안 내려간다');
}

// ── ④ 🔴 질문 기록이 실제로 남는가 — 인자 개수 (조용히 실패하던 자리) ──
//   시그니처는 logQuerySettled(type, q, detail). 하나만 넘기면 q 가 undefined 라
//   길이 2 미만으로 걸러져 **아무것도 안 남는다.** 로그도 오류도 없이 조용히 죽는다.
{
  const 한인자 = /logQuerySettled\(\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\)/;
  for (const f of ['src/components/SearchPanel.jsx', 'src/pages/VoyagePage.jsx', 'src/pages/GlobalSearchPage.jsx']) {
    const src = read(f);
    const hit = src.match(new RegExp(한인자.source, 'g'));
    T(!hit, `⛔ ${f} 에 인자 하나짜리 logQuerySettled 가 있다 (${hit ? hit.join(' · ') : ''}) — 아무것도 안 남는다`);
  }
  //  세 창이 전부 남기는가
  for (const f of ['src/components/SearchPanel.jsx', 'src/pages/VoyagePage.jsx', 'src/pages/GlobalSearchPage.jsx']) {
    T(/logQuerySettled\(/.test(read(f)), `⛔ ${f} 이 질문을 안 남긴다 — 미르가 못하는 것을 찾을 길이 없다`);
  }
  //  시그니처가 그대로인가(바뀌면 이 검사가 헛것이 된다)
  T(/export function logQuerySettled\(type, q, detail/.test(read('src/activityLog.js')),
    'logQuerySettled 시그니처가 바뀌었다 — 이 검사를 다시 봐야 한다');
}

if (bad) { console.error(`\n✗ 타자 연막검사 ${bad}건 실패`); process.exit(1); }
console.log('✅ 타자 연막검사 통과 — 숫자 즉답 유지 · 문자는 다 받고 · 판정 한 벌 · 질문 기록 세 창');
