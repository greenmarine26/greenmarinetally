// 4.12-01 연막검사 — 글자색이 화면 밝기를 따라가는지 소스·CSS 에서 센다. 4단계(사무실, 흰 바탕)에서 흰 글자가 흰 바탕에 묻히는 사고를 막는다.
//   검수사 2026-10-08 06:38 «화면을 밝게 하니 입력하는 글자가 보이지 않습니다» · 07:02 «화면 밝기에 따라서 글자색도 바뀌게 했으면 좋겠습니다».
//   ① brightLight.css 가 생성기 출력과 같다(안 돌린 새 클래스는 4단계에서 뒤집히지 않는다 — 33개가 밀려 있던 적이 있다) ② 4단계 text-white 규칙과 예외가 있다
//   ③ 입력칸(input·textarea·select)이 글자색을 검정·임의 색·슬레이트로 못 박지 않았다(text-white 는 ②가 바꿔 주고, 색 변수는 밝기가 바꿔 준다) ④ 검은 칩·사진 위 흰 글자는 fixed-white 를 쓴다
//   실행 — node tools/smoke_brighttext.cjs <repoRoot> [빌드된 css]. 쓰기·네트워크 없음. 실패하면 빌드를 세운다. «찾은 칸 수가 모자라면» 검사가 안 돈 것이므로 그것도 실패다(건너뜀은 통과가 아니다).
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const root = path.resolve(process.argv[2] || process.cwd());
const builtCss = process.argv[3];
process.chdir(root);
let bad = 0, n = 0;
const ok = (c, m, extra) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || extra === undefined ? '' : '  → ' + extra)); if (!c) bad++; };

// ① 생성기 출력 == 파일(설명 주석 제외)
const file = fs.readFileSync('src/brightLight.css', 'utf8');
const fileBody = file.replace(/^\/\*[\s\S]*?\*\/\r?\n/, '');
const genBody = cp.execFileSync('node', ['tools/gen_bright_light.cjs'], { encoding: 'utf8', maxBuffer: 1e8 });
ok(fileBody === genBody, 'src/brightLight.css 가 생성기 출력과 같다(새로 쓴 색 클래스가 4단계에서 뒤집힌다)', '다르다 — node tools/gen_bright_light.cjs --write 를 돌려라');

// ② 4단계 text-white 규칙
ok(/:root\[data-bright="4"\] \.text-white,:root\[data-bright="4"\] \.hover\\:text-white:hover\{color:rgb\(var\(--dim-100\)\)\}/.test(fileBody), '4단계에서 text-white(·hover) 가 진한 글자 변수(--dim-100)로 바뀐다');
ok(/:root\[data-bright="4"\] \.bg-st-bad\.text-white\{color:#fff\}/.test(fileBody), '배경이 4단계에서도 어두운 요소(bg-st-bad)는 흰 글자를 지킨다');
ok(/\.text-white\.disabled\\:text-dim-400:disabled/.test(fileBody), '눌러도 안 되는 단추(disabled)는 흐린 글자를 지킨다');
const idx = fs.readFileSync('src/index.css', 'utf8');
ok(/\.fixed-white\s*\{\s*color:\s*#fff;?\s*\}/.test(idx), 'index.css 에 fixed-white(어느 밝기에서도 흰 글자)가 있다');
if (builtCss) {
  const bc = fs.readFileSync(builtCss, 'utf8');
  ok(/data-bright=["']?4["']?\]\s*\.text-white/.test(bc), '빌드된 CSS 에 4단계 text-white 규칙이 들어 있다(' + path.basename(builtCss) + ')');
  ok(/\.fixed-white\s*\{\s*color:\s*#fff/.test(bc), '빌드된 CSS 에 fixed-white 가 들어 있다');
}

// ③ 입력칸 — 중괄호 깊이를 세는 추출기(속성값 안의 > 를 안전하게)
const walk = (d, o) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'data' && e.name !== 'node_modules') walk(p, o); }
    else if (/\.(jsx|js)$/.test(e.name)) o.push(p);
  }
  return o;
};
const files = walk('src', []);
const els = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const re = /<(input|textarea|select)(?=[\s/>])/g;
  let m;
  while ((m = re.exec(s))) {
    let i = m.index + m[0].length, depth = 0, q = null;
    for (; i < s.length; i++) {
      const ch = s[i];
      if (q) { if (ch === '\\' && depth > 0) { i++; continue; } if (ch === q) q = null; continue; }
      if (depth === 0) { if (ch === '"' || ch === "'") { q = ch; continue; } if (ch === '{') { depth++; continue; } if (ch === '>') break; }
      else { if (ch === '{') depth++; else if (ch === '}') depth--; else if (ch === '`' || ch === '"' || ch === "'") q = ch; }
    }
    const body = s.slice(m.index, i);
    const typ = (body.match(/type="([a-z]+)"/) || [])[1] || (m[1] === 'input' ? 'text' : m[1]);
    if (['checkbox', 'radio', 'range', 'file', 'hidden', 'color'].includes(typ)) continue;
    const ci = body.indexOf('className=');
    els.push({ file: f.replace(/\\/g, '/'), line: s.slice(0, m.index).split('\n').length, cls: ci < 0 ? '' : body.slice(ci), body });
  }
}
console.log('입력칸 점검 — 소스 입력칸 ' + els.length + '곳');
ok(els.length >= 130, '입력칸을 130곳 이상 찾았다(찾는 식이 깨지면 검사가 안 도는 것이다)', els.length);
// 밝기가 못 바꾸는 고정 글자색 — 검정·임의 색(#.. rgb(..))·슬레이트/회색 계열·fixed-white. (text-white 는 ②가 바꿔 주므로 허용)
const fixedRe = /(?:^|[\s"'`{(:?|&])(?:[a-z-]+:)*(?:text-(?:black|\[#[0-9a-fA-F]{3,8}\]|\[rgb[a]?\([^\]]*\)\]|\[white\]|(?:slate|gray|zinc|neutral)-\d+)|fixed-white)(?=$|[\s"'`}):?|&])/;
const fixed = els.filter((e) => fixedRe.test(e.cls));
ok(fixed.length === 0, '입력칸 글자색을 검정·임의 색·슬레이트로 못 박은 곳이 0곳이다', fixed.map((e) => `${e.file}:${e.line}`).join(' , '));
const mir = els.find((e) => e.file === 'src/components/MirFab.jsx' && /mirFabIn/.test(e.body));
ok(!!mir && /text-dim-100/.test(mir.cls), '미르에게 묻는 칸(#mirFabIn)의 글자색이 밝기를 따르는 text-dim-100 이다', mir && mir.cls.slice(0, 120));

// ④ 어느 밝기에서도 흰 글자여야 하는 두 곳(검은 칩 위 아이콘 · 룰렛 조각 글자)이 fixed-white 를 쓴다
const pd = fs.readFileSync('src/components/PendingDamageModal.jsx', 'utf8');
ok(/bg-black\/70[^\n]*<X className="[^"]*fixed-white/.test(pd), '사진 위 검은 칩의 X 아이콘이 fixed-white 이다');
const fp = fs.readFileSync('src/pages/FoodPage.jsx', 'utf8');
ok(/className="absolute top-1\/2 text-2xs font-bold fixed-white"/.test(fp), '룰렛 조각 글자가 fixed-white 이다');

// ⑤ 검은 바탕 사진 크게 보기 — 바탕이 밝기와 상관없이 검정이라 그 위 글자는 밝기를 따라 진해지는 text-dim-*·text-red-* 를 쓰면 4단계에서 안 보인다(fixed-white 를 쓴다)
for (const f of ['src/components/BigResultCard.jsx', 'src/pages/VoyagePage.jsx', 'src/pages/GlobalSearchPage.jsx']) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  let seen = 0, badLines = [];
  lines.forEach((l, i) => {
    if (/bg-black\/90 flex flex-col items-center justify-center p-3 gap-2/.test(l)) {
      seen++;
      for (let j = i + 1; j < Math.min(i + 12, lines.length) && !/^\s*\)\}\s*$/.test(lines[j]); j++) if (/text-(?:dim|red|amber|emerald|cyan)-\d/.test(lines[j]) && !/fixed-white/.test(lines[j])) badLines.push(`${f}:${j + 1}`);
    }
  });
  ok(seen >= 1 && badLines.length === 0, `${f} 검은 바탕 사진 보기의 글자가 밝기에 안 따라가는 색(fixed-white)이다`, seen < 1 ? '사진 보기 블록을 못 찾음' : badLines.join(' , '));
}

console.log(bad ? `\n✗ 글자색 밝기 연동 연막검사 ${bad}건 실패(${n}항목)` : `\n✓ 글자색 밝기 연동 연막검사 전부 통과(${n}항목)`);
process.exit(bad ? 1 : 0);
