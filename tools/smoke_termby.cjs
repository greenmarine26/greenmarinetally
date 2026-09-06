// «터미널(CATOS)» 문구가 화면·서류 어디에도 안 나가는지 잰다(3.16) — 검수사 «by:'터미널(CATOS)' 어디든 이 문구는 없어야 됩니다».
const path = require('path');
const fs = require('fs');
const B = process.argv[2], ROOT = process.argv[3] || path.resolve(__dirname, '..');
if (!B) { console.error('사용법: node tools/smoke_termby.cjs <utils 번들.cjs> [저장소 경로]'); process.exit(1); }
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('«터미널(CATOS)» 문구가 안 나가는가 (3.16)');

//  ① 새로 쓰는 완료에는 그 글자가 없다
const tw = { AAAU1111111: { at: 1000, equip: 'GC102', pos: '220782' }, BBBU2222222: { at: 2000 }, CCCU3333333: { equip: 'GC101' } };
const out = U.computeTermApply(tw, {});
ok(out.length === 2, `반입시각 있는 것만 반영 — ${out.length}대(시각 없는 CCCU 는 뺀다)`);
ok(out.every(([, r]) => !String(r.by || '').includes('CATOS') && !String(r.by || '').includes('터미널')), '새 완료의 by 에 터미널·CATOS 글자가 없다');
ok(out.every(([, r]) => r.src === 'term'), "터미널 반영은 src:'term' 표식으로 남는다");
ok(out.find(([cn]) => cn === 'AAAU1111111')[1].equip === '2호기', 'GC102 → 2호기');

//  ② 판정 — 새 표식도 옛 글자도 알아본다
ok(U.isTermApplied({ src: 'term' }) === true, "src:'term' 은 터미널 반영");
ok(U.isTermApplied({ by: '터미널(CATOS)' }) === true, '옛 행(by 가 그 글자)도 터미널 반영 — 보관소 수천 행이 그것이다');
ok(U.isTermApplied({ by: '김성일' }) === false, '사람 이름은 터미널 반영이 아니다');
ok(U.isTermApplied(null) === false && U.isTermApplied({}) === false, '빈 것에도 안 터진다');

//  ③ 표시 한 벌 — 사람 → 조 등록 근무자 → «터미널 반영». 어느 경우에도 업체 글자가 안 나온다
const at = Date.UTC(2026, 8, 6, 3, 0);
const info = { craneCrew: { '09-06 주간': { '2호기': { name: '김판석', at } } } };
ok(U.completedByLabel({ by: '이종부', at }, info) === '이종부', '사람이 찍었으면 그 이름');
const viaCrew = U.completedByLabel({ src: 'term', at, equip: '2호기' }, info);
ok(viaCrew === '김판석', `터미널 반영 + 조 등록 → 그 근무자(${viaCrew})`);
const legacy = U.completedByLabel({ by: '터미널(CATOS)', at, equip: '2호기' }, info);
ok(legacy === '김판석', `옛 행도 같은 길로 — ${legacy}`);
for (const rec of [{ src: 'term', at }, { by: '터미널(CATOS)', at }, { src: 'term', at, equip: '4호기' }]) {
  const l = U.completedByLabel(rec, info);
  ok(l === U.TERM_DONE_LABEL, `조 등록이 없으면 «${U.TERM_DONE_LABEL}» — ${l}`);
}
ok(U.completedByLabel({ src: 'term', at, equip: '2호기' }, null) === U.TERM_DONE_LABEL, '항차 자료를 안 주면 조 등록을 못 보므로 «터미널 반영»');
ok(U.completedByLabel(null) === '' && U.completedByLabel({}) === '', '완료가 없으면 빈 문자열');

//  ④ **어떤 입력을 넣어도** 라벨에 그 글자가 안 섞인다
const evil = [{ by: '터미널(CATOS)' }, { by: ' 터미널(CATOS) ' }, { src: 'term', by: '터미널(CATOS)' }, { by: '터미널(CATOS)', equip: '9호기', at }];
ok(evil.every((r) => !String(U.completedByLabel(r, info)).includes('CATOS')), '옛 글자를 넣어도 라벨에 CATOS 가 안 나온다');

//  ⑤ 소스 전수 — 화면·서류로 나가는 자리에 그 글자가 리터럴로 남아 있지 않은가
const SCAN = ['src/components', 'src/pages', 'src/data', 'src/loloReport.js', 'src/nlSearch.js', 'src/firebase.js', 'public/cone.html'];
const hits = [];
const walk = (p) => {
  const st = fs.statSync(p);
  if (st.isDirectory()) { for (const f of fs.readdirSync(p)) walk(path.join(p, f)); return; }
  if (!/\.(jsx?|html)$/.test(p)) return;
  const t = fs.readFileSync(p, 'utf8');
  t.split('\n').forEach((line, i) => {
    if (!line.includes('터미널(CATOS)')) return;
    if (/^\s*(\/\/|\*|#|<!--)/.test(line.trim())) return;        // 주석은 화면에 안 나간다
    hits.push(`${path.relative(ROOT, p)}:${i + 1}  ${line.trim().slice(0, 90)}`);
  });
};
for (const s of SCAN) { const p = path.join(ROOT, s); if (fs.existsSync(p)) walk(p); }
ok(hits.length === 0, `화면·서류 소스에 그 글자가 남은 곳 ${hits.length}곳` + (hits.length ? '\n     ' + hits.join('\n     ') : ''));

//  ⑤-2 **utils 소스에도 그 글자가 리터럴로 없다** — 옛 행 판별은 접두 «터미널»로 한다(검수사 «어디든»).
{
  const u = fs.readFileSync(path.join(ROOT, 'src/utils.js'), 'utf8');
  //  3.20: 줄 앞 주석뿐 아니라 **꼬리 주석**도 코드가 아니다 — APP_VERSION 한 줄에 이력이 전부 붙어 있어
  //    3.16 의 검수사 원문 인용(«by:'터미널(CATOS)' 어디든 이 문구는 없어야 됩니다»)이 코드로 잡혔다.
  //    원문은 고치면 인용이 아니므로(규범 §10-1) 검사가 코드만 보게 고친다. 따옴표 안의 «//» 는 안 자른다.
  const codeOf = (l) => {
    let q = '';
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (q) { if (c === '\\') { i++; continue; } if (c === q) q = ''; continue; }
      if (c === '"' || c === "'" || c === '`') { q = c; continue; }
      if (c === '/' && l[i + 1] === '/') return l.slice(0, i);
    }
    return l;
  };
  const bad = u.split('\n').filter((l) => codeOf(l).includes('터미널(CATOS)') && !/^\s*(\/\/|\*)/.test(l.trim()));
  ok(bad.length === 0, `utils.js 코드 줄에 그 글자가 남은 곳 ${bad.length}곳` + (bad.length ? '\n     ' + bad.join('\n     ').slice(0, 300) : ''));
}

//  ⑥ 콘앱 사본도 같은 판정을 쓴다
const cone = fs.readFileSync(path.join(ROOT, 'public/cone.html'), 'utf8');
ok(/function ctIsTerm\(/.test(cone), '콘앱에 터미널 판정 한 벌(ctIsTerm)이 있다');
ok(/c\.src === 'term'/.test(cone), "콘앱도 새 표식(src:'term')을 알아본다");
ok(!/startsWith\('터미널'\)\s*\)\s*;?\s*$/m.test(cone.replace(/function ctIsTerm[\s\S]*?\n\}/, '')), '콘앱에서 옛 접두 판정이 ctIsTerm 밖에 남지 않았다');

console.log(fail ? `\n✗ ${fail}건 실패` : '\n✓ 전부 통과');
process.exit(fail ? 1 : 0);
