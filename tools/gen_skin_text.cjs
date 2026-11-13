// 5.00 화면 고르기 — 세 안에서 Tailwind 기본 팔레트 글자색이 4.5:1 이 안 되는 것만 골라 같은 색 계열의 진한(밝은 안)·밝은(어두운 안) 칸으로 옮기는 CSS 를 만든다.
//   ⚠ src/skinText.css 는 손으로 고치지 않는다 — `node tools/gen_skin_text.cjs --write` 로 다시 만든다(소스에 실제로 쓰인 글자색만 뽑는다).
//   기준 바탕 — 밝은 안(2): 바탕 #f1f4f8 · 카드 흰색 · 옅은 물든 칸(#e8edf3)  ·  어두운 안(1·3): ink-950 · ink-850 · ink-700(1안) / 검정 · ink-800(3안).
//   밝은 안은 brightLight.css(밝기 4)가 50↔950 · 100↔900 · 200↔800 · 300↔700 · 400↔600 으로 뒤집은 뒤의 색으로 잰다.
//   선택자 세기 — 밝은 안 :root[data-skin="2"][data-bright="4"] .x (0,4,0) 가 brightLight 의 :root[data-bright="4"] .x (0,3,0) 를 이긴다.
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const C = require(path.join(ROOT, 'node_modules/tailwindcss/colors'));
const HUES = 'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone';
const out = cp.execSync(`grep -rhoE '\\btext-(${HUES})-[0-9]{2,3}(/[0-9]+)?\\b' src --include=*.jsx --include=*.js`, { cwd: ROOT, maxBuffer: 1e8 }).toString().trim().split('\n');
const used = [...new Set(out.filter(Boolean))].sort();
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const L = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const over = (c, a, bg) => c.map((v, i) => v * a + bg[i] * (1 - a));
const FLIP = { 50: 950, 100: 900, 200: 800, 300: 700, 400: 600, 500: 500, 600: 400, 700: 300, 800: 200, 900: 100, 950: 50 };
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const LIGHT_BG = [[241, 244, 248], [255, 255, 255], [232, 237, 243]];
const DARK = { 1: [[6, 10, 20], [21, 31, 50], [35, 47, 74]], 3: [[0, 0, 0], [23, 27, 36], [42, 48, 62]] };
const TARGET = 4.6;
const esc = (s) => s.replace(/\//g, '\\/');
const rules = { 2: [], 1: [], 3: [] };
for (const cls of used) {
  const m = cls.match(/^text-([a-z]+)-(\d{2,3})(?:\/(\d+))?$/); if (!m || !C[m[1]] || !C[m[1]][m[2]]) continue;
  const hue = m[1], sh = +m[2], a = m[3] ? +m[3] / 100 : 1;
  //  밝은 안 — 뒤집힌 칸 + 알파
  const lc = hx(C[hue][FLIP[sh]]);
  const lworst = Math.min(...LIGHT_BG.map((bg) => cr(over(lc, a, bg), bg)));
  //  밝은 칩 위 진한 글자(원래 칸 600 이상 — 밝은 안에서 뒤집혀 밝아진다)는 뒤집힌 짙은 칩 위에 서므로 건드리지 않는다.
  if (sh <= 500 && lworst < TARGET) {
    const pick = SHADES.filter((s) => s >= 600).find((s) => Math.min(...LIGHT_BG.map((bg) => cr(hx(C[hue][s]), bg))) >= TARGET) || 900;
    rules[2].push(`:root[data-skin="2"][data-bright="4"] .${esc(cls)} { color: rgb(${hx(C[hue][pick]).join(' ')}); }   /* ${lworst.toFixed(2)} → ${hue}-${pick} */`);
  }
  //  어두운 안 — 원래 칸 + 알파
  for (const n of [1, 3]) {
    const dc = hx(C[hue][sh]);
    const dworst = Math.min(...DARK[n].map((bg) => cr(over(dc, a, bg), bg)));
    //  원래 칸 700 이상은 밝은 칩(bg-*-100~300) 위 진한 글자다 — 어두운 바탕 기준으로 밝히면 칩 위에서 사라진다. 손대지 않는다.
    if (sh <= 600 && dworst < TARGET) {
      const pick = [...SHADES].reverse().filter((s) => s <= 400).find((s) => Math.min(...DARK[n].map((bg) => cr(hx(C[hue][s]), bg))) >= TARGET) || 100;
      rules[n].push(`:root[data-skin="${n}"]:not([data-bright="4"]) .${esc(cls)} { color: rgb(${hx(C[hue][pick]).join(' ')}); }   /* ${dworst.toFixed(2)} → ${hue}-${pick} */`);
    }
  }
}
//  5.00 감사 — 2안 주 단추: 소스에서 «bg-{색}-{500·600·700} 과 text-white» 를 한 요소에 같이 쓴 것(꽉 찬 단추)은 흰 바탕 안에서 뒤집히지 않게
//    같은 색 계열의 진한 칸(흰 글자 4.5:1 이상)으로 두고 글자는 흰색 그대로 — «양하확인» 같은 주 단추가 연한 색에 묻히지 않는다.
const pairSrc = cp.execSync(`grep -rhoE 'className=("[^"]*"|\\{\`[^\`]*\`\\})' src --include=*.jsx`, { cwd: ROOT, maxBuffer: 1e8 }).toString();
const solid = new Set();
for (const cls of pairSrc.split('\n')) {
  const lightTxt = cls.match(new RegExp(`(?<![:\\w-])text-(white|(?:${HUES})-(?:50|100))(?![\\w/-])`));
  if (!lightTxt) continue;
  for (const m of cls.matchAll(new RegExp(`(?<![:\\w-])bg-(${HUES})-(500|600|700)(?![\\w/-])`, 'g'))) solid.add(`${m[1]}-${m[2]}|${lightTxt[1]}`);
}
const white = [255, 255, 255];
const solidRules = [...solid].sort().map((kk) => {
  const [k, txt] = kk.split('|'); const [hue] = k.split('-');
  const pick = [600, 700, 800, 900].find((sh) => C[hue][sh] && cr(hx(C[hue][sh]), white) >= TARGET) || 900;
  return `:root[data-skin="2"][data-bright="4"] .bg-${k}.text-${txt} { background-color: rgb(${hx(C[hue][pick]).join(' ')}); color: #fff; }   /* 주 단추 → ${hue}-${pick} */`;
});
//  5.00 재감사 — 그라데이션은 원래 계열색(from-*) 한 가지로. 소스에서 «bg-gradient-to-» 와 같이 쓴 from-* 마다:
//    어두운 안(1·3) = 그 색 그대로(알파면 ink-900 위) · 2안 = brightLight 처럼 뒤집은 칸 · 흰 글자(text-white)와 같이 쓴 꽉 찬 색은 세 안 모두 흰 글자 4.5:1 이 되는 진한 칸 + 흰 글자.
//    누르지 못하게 된 단추(:disabled)는 건드리지 않는다(종전 disabled:bg-none 회색이 이긴다).
//  여러 줄 className · 조건식 안 문자열('from-violet-400 …')까지 잡으려고 «bg-gradient-to-» 가 있는 파일의 from-* 를 모두 본다(앞뒤 400자 안에 text-white 가 있으면 흰 글자 꽉 찬 색).
const froms = new Map();
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'data' ? [] : walk(path.join(d, e.name))) : (/\.jsx?$/.test(e.name) ? [path.join(d, e.name)] : [])));
for (const f of walk(path.join(ROOT, 'src'))) {
  const t = fs.readFileSync(f, 'utf8'); if (!/bg-gradient-to-/.test(t)) continue;
  for (const m of t.matchAll(new RegExp(`(?<![:\\w-])from-(${HUES})-(\\d{2,3})(?:/(\\d+))?(?![\\w-])`, 'g'))) {
    const k = m[3] ? `${m[1]}-${m[2]}/${m[3]}` : `${m[1]}-${m[2]}`; const near = t.slice(Math.max(0, m.index - 400), m.index + 400);
    const o = froms.get(k) || { white: false }; o.white = o.white || /(?<![:\w-])text-white\b/.test(near); froms.set(k, o);
  }
}
const gradRules = [];
const G = ':not(:disabled)';
for (const [k, o] of [...froms].sort()) {
  const m = k.match(/^([a-z]+)-(\d+)(?:\/(\d+))?$/); const hue = m[1], sh = +m[2], a = m[3] ? +m[3] / 100 : 1;
  if (!C[hue] || !C[hue][sh]) continue;
  const sel = `[class*="bg-gradient-to-"].${esc('from-' + k)}${G}`;
  const rgbA = (h, al) => `rgb(${hx(h).join(' ')}${al < 1 ? ' / ' + al : ''})`;
  const under = a < 1 ? 'rgb(var(--ink-900))' : 'transparent';
  gradRules.push(`:root[data-skin]:not([data-bright="4"]) ${sel} { background-image: linear-gradient(${rgbA(C[hue][sh], a)}, ${rgbA(C[hue][sh], a)}); background-color: ${under}; }`);
  const fl = C[hue][FLIP[sh]] || C[hue][sh];
  gradRules.push(`:root[data-skin="2"][data-bright="4"] ${sel} { background-image: linear-gradient(${rgbA(fl, a)}, ${rgbA(fl, a)}); background-color: ${under}; }`);
  if (o.white && a === 1) {
    const pick = [sh, 600, 700, 800, 900].filter((x) => x >= sh && C[hue][x]).find((x) => cr(hx(C[hue][x]), [255, 255, 255]) >= TARGET) || 900;
    gradRules.push(`:root[data-skin] ${sel}.text-white, :root[data-skin="2"][data-bright="4"] ${sel}.text-white { background-image: linear-gradient(${rgbA(C[hue][pick], 1)}, ${rgbA(C[hue][pick], 1)}); color: #fff; }   /* 흰 글자 꽉 찬 색 → ${hue}-${pick} */`);
  }
}
//  토큰 그라데이션(from-act-dn → act) — 로그인 [OOO 님으로 시작]: 글자 act-on 이 그 바탕에서 늘 AA(1안 8:1 · 2안 흰 글자 5.5:1)
gradRules.push(`:root[data-skin] [class*="bg-gradient-to-"].from-act-dn${G} { background-image: none; background-color: rgb(var(--act)); }`);
const css = [
  '/*  5.00 화면 고르기 — 세 안 글자색 대비 보정(기계 생성본 · 손으로 고치지 않는다).',
  '    다시 만들기 — node tools/gen_skin_text.cjs --write   (소스에 쓰인 text-{색}-{칸}[/알파] 중 4.5:1 미달만 · 연막 smoke_skin500 이 화면에서 다시 잰다) */',
  '@media screen {   /* 인쇄는 종전 그대로(5.00 재감사) */',
  '/*  그라데이션 → 원래 계열색 한 가지(세 안) */', ...gradRules, '/*  2안 밝은 간결 */', ...rules[2], '/*  2안 주 단추(꽉 찬 색 + 흰 글자) */', ...solidRules, '/*  1안 어두운 고대비 */', ...rules[1], '/*  3안 큰 글자 현장 */', ...rules[3], '}', '',
].join('\n');
const file = path.join(ROOT, 'src/skinText.css');
if (process.argv.includes('--write')) { fs.writeFileSync(file, css); console.log(`skinText.css — 2안 ${rules[2].length} · 1안 ${rules[1].length} · 3안 ${rules[3].length} 규칙`); }
else { const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; if (cur !== css) { console.log('✗ src/skinText.css 가 생성기 출력과 다르다 — node tools/gen_skin_text.cjs --write'); process.exit(1); } console.log('✓ skinText.css 생성기와 같다'); }
