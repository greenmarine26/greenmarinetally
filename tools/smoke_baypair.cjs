// 베이 짝 연막검사 — **한 홀수 베이는 한 번만 쓴다.**
//
// 왜 있는가 (검수사 신고 2026-08-26, SWTD 9012E).
//   *«32단독 33단독 34단독인데 31 32 33 으로 붙습니다»*
//   *«쉽게 단독이라는 개념을 정확하게 적용은 안해서 그런듯 합니다»* — 맞는 말이었다.
//
//   `autoPairBays` 의 짝수 루프가 양옆 홀수가 «있는가»만 보고 «비어 있는가»를 안 봤다.
//   그래서 31 이 (30)31 과 (32)33 **양쪽에** 들어가고, 화면에 BAY 31 이 두 번 그려졌다.
//
//   정답의 근거는 **CASP 도면**(선사 적부 프로그램 — 앱과 같은 .def 를 읽는다):
//     01 · (02)03 · 05 · (06)07 · 09 · (10)11 · 13 · (14)15
//     17 · (18)19 · 21 · (22)23 · 25 · (26)27 · 29 · (30)31 · 32 · 33 · 34
//
// ⚠ 이 검사는 «SWTD 가 맞는가»만 보지 않는다. **어떤 배에서도 베이가 두 번 쓰이지 않는 것**을 잰다 —
//   그것이 규칙이고, 특정 선박 전용 예외를 두지 않기 위해서다(3금지 ②).
const path = require('path');
const OUT = process.argv[2];
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
const CP = require(path.resolve(OUT));

let bad = 0;
const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };

if (typeof CP.autoPairBays !== 'function') { console.error('✗ autoPairBays 가 없다'); process.exit(1); }

const mk = (nums, extra = {}) => nums.map((n) => ({ bayNum: n, cells: [9, 9, 9, 9], rows: 9, hasHold: true, ...(extra[n] || {}) }));
const run = (nums, extra) => CP.autoPairBays(mk(nums, extra));
//  트리오·단독에 쓰인 베이를 전부 센다 — 두 번 나오면 중복이다.
const usedList = (r) => {
  const out = [];
  (r.trios || []).forEach(([top, pair]) => {
    out.push(String(top));
    (String(pair).replace(/[()]/g, '').match(/.{2}/g) || []).forEach((k) => out.push(k));
  });
  (r.singles || []).forEach((s) => out.push(String(s)));
  return out;
};
const dupOf = (r) => {
  const seen = new Set(), dup = new Set();
  usedList(r).forEach((k) => { if (seen.has(k)) dup.add(k); seen.add(k); });
  return [...dup];
};

// ── ① ★ 어떤 배에서도 베이가 두 번 쓰이지 않는다 ────────────────────
{
  const cases = [
    ['SWTD 실물(선미 32·33·34)', [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19, 21, 22, 23, 25, 26, 27, 29, 30, 31, 32, 33, 34]],
    ['짝수가 연달아 둘', [1, 2, 3, 4, 5]],
    ['짝수 셋 연속', [1, 2, 3, 4, 5, 6, 7]],
    ['보통 배(4칸 간격)', [1, 2, 3, 5, 6, 7, 9, 10, 11]],
    ['짝수만', [2, 4, 6]],
    ['홀수만', [1, 3, 5]],
    ['한 짝', [1, 2, 3]],
    ['베이 하나', [5]],
    ['빈 배', []],
  ];
  for (const [nm, nums] of cases) {
    const r = run(nums, {});
    const d = dupOf(r);
    T(d.length === 0, `⛔ «${nm}» 에서 베이가 두 번 쓰인다: ${d.join(',')}`);
  }
}

// ── ② ★ SWTD 는 CASP 도면과 같아야 한다 (실물 기준표) ───────────────
{
  const nums = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19, 21, 22, 23, 25, 26, 27, 29, 30, 31, 32, 33, 34];
  const r = run(nums, {});
  const trios = (r.trios || []).map((t) => t.join('+')).sort().join(' ');
  const want = ['01+(02)03', '05+(06)07', '09+(10)11', '13+(14)15', '17+(18)19', '21+(22)23', '25+(26)27', '29+(30)31'].sort().join(' ');
  T(trios === want, `⛔ SWTD 트리오가 CASP 도면과 다르다\n        나온 것: ${trios}\n        CASP  : ${want}`);
  const singles = [...(r.singles || [])].map(String).sort().join(' ');
  T(singles === '32 33 34', `⛔ 선미 32·33·34 가 단독이 아니다 — 나온 단독: «${singles}»`);
  T(!trios.includes('(32)33'), '⛔ (32)33 이 다시 생겼다 — 31 이 이미 (30)31 에 쓰였다');
}

// ── ③ 되던 것이 죽지 않았는가 — 보통 배는 그대로 ────────────────────
{
  const r = run([1, 2, 3, 5, 6, 7, 9, 10, 11], {});
  const trios = (r.trios || []).map((t) => t.join('+')).sort().join(' ');
  T(trios === ['01+(02)03', '05+(06)07', '09+(10)11'].sort().join(' '), `⛔ 보통 배의 짝이 깨졌다: ${trios}`);
  T((r.singles || []).length === 0, `⛔ 보통 배에 단독이 생겼다: ${(r.singles || []).join(',')}`);
}

// ── ④ 짝수가 붙어 있으면 **앞의 것이 먼저** 가져간다 (순서 고정) ─────
//   1,2,3,4,5 — 02 가 01·03 을 쓰고, 04 는 03 이 이미 쓰였으니 단독이 된다.
{
  const r = run([1, 2, 3, 4, 5], {});
  const trios = (r.trios || []).map((t) => t.join('+'));
  T(trios.length === 1 && trios[0] === '01+(02)03', `⛔ 앞 짝수 우선이 아니다: ${trios.join(' ')}`);
  const singles = [...(r.singles || [])].map(String).sort();
  T(singles.includes('04') && singles.includes('05'), `⛔ 04·05 가 단독으로 안 남았다: ${singles.join(',')}`);
}

// ── ⑤ 한 베이도 잃지 않는다 — 넣은 것은 어딘가에 다 나온다 ──────────
{
  for (const nums of [[1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19, 21, 22, 23, 25, 26, 27, 29, 30, 31, 32, 33, 34], [1, 2, 3, 4, 5], [2, 4, 6]]) {
    const r = run(nums, {});
    const got = new Set(usedList(r).map((k) => parseInt(k, 10)));
    const lost = nums.filter((n) => !got.has(n));
    T(lost.length === 0, `⛔ 베이를 잃었다 (${nums.length}개 중): ${lost.join(',')}`);
  }
}

// ── ⑥ ★ 같은 규칙이 두 벌인데 한 벌만 고치지 않았는가 (소스 전수) ─────
//   2.55-02 는 cargoPlanCore 만 고쳤다. 그런데 BayPlan.jsx 가 **제 짝 짓기를 따로** 갖고 있어
//   카고플랜은 고쳐졌는데 베이플랜은 그대로였다 — 검수사 «아직도 그대로 입니다».
//   이 검사는 **두 곳이 다 가드를 갖고 있는지**를 소스에서 직접 본다.
{
  const fs = require('fs'), pathm = require('path');
  const ROOT = process.argv[3] || process.cwd();
  const read = (rel) => fs.readFileSync(pathm.join(ROOT, rel), 'utf8');
  T(/!usedOdds\.has\(e - 1\)[\s\S]{0,40}!usedOdds\.has\(e \+ 1\)/.test(read('src/cargoPlanCore.js')),
    '⛔ cargoPlanCore.autoPairBays 에 「이미 쓰인 홀수」 가드가 없다');
  //  ★ 2.56: BayPlan 은 제 짝 짓기를 버리고 buildBayPagesFromSummary(= autoPairBays) 한 벌을 부른다.
  //    가드가 「있는가」가 아니라 「한 벌에 위임했는가」를 본다 — 제 루프가 되살아나면 여기서 선다.
  //    (세 화면 전체의 같은 검사는 tools/smoke_baygrid.cjs ③ 이 잰다.)
  T(read('src/components/BayPlan.jsx').includes('buildBayPagesFromSummary'),
    '⛔ BayPlan.jsx 가 짝 한 벌(buildBayPagesFromSummary)을 부르지 않는다');
  T(!/leftOddIn/.test(read('src/components/BayPlan.jsx')),
    '⛔ BayPlan.jsx 에 자체 짝 루프(leftOddIn)가 되살아났다 — 한 벌만 고치면 갈린다');
}

if (bad) { console.error(`\n✗ 베이 짝 연막검사 ${bad}건 실패`); process.exit(1); }
console.log('✅ 베이 짝 연막검사 통과 — 두 번 쓰임 0 · SWTD=CASP 도면 · 보통 배 무변화 · 잃은 베이 0');
