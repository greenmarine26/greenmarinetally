// 2.40: 흰 바탕 단계용 «스톱 뒤집기» CSS 생성기. 실제 소스에 쓰인 조합만 뽑는다.
//   재생성: node tools/gen_bright_light.cjs --write      (src/brightLight.css 맨 위 설명 주석은 그대로 두고 아래 규칙만 새로 쓴다)
//   표준출력으로만 보고 싶으면: node tools/gen_bright_light.cjs   (규칙 본문만 나온다 — 연막검사 smoke_brighttext 가 이것과 파일을 맞대 본다)
//   ⛔ src/brightLight.css 를 손으로 고치지 마라 — 다음 재생성에 지워진다.
//   4.12-01: 클래스를 새로 쓰고 이 생성기를 다시 안 돌리면 그 클래스는 4단계에서 뒤집히지 않아 «어두운 섬»이 된다(실측 33개가 밀려 있었다).
//            그래서 연막검사가 파일과 생성기 출력이 같은지 본다. 못 박은 흰 글자(text-white)도 여기서 4단계 진한 글자로 바꾼다.
const C = require('tailwindcss/colors');
const cp = require('child_process');
const RE = "\\b(bg|text|border|ring|from|to|via|divide|shadow|outline|accent|caret|decoration)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|stone)-[0-9]{2,3}(/[0-9]+)?";
const out = cp.execSync(`grep -rhoE '${RE}' src --include=*.jsx --include=*.js`, { maxBuffer: 1e8 }).toString().trim().split('\n');
const uniq = [...new Set(out)].sort();
const FLIP = { 50:'950', 100:'900', 200:'800', 300:'700', 400:'600', 500:'500', 600:'400', 700:'300', 800:'200', 900:'100', 950:'50' };
const PROP = { bg:'background-color', text:'color', border:'border-color', ring:'--tw-ring-color', divide:'border-color',
               shadow:'--tw-shadow-color', outline:'outline-color', accent:'accent-color', caret:'caret-color', decoration:'text-decoration-color' };
const rgb = (h) => { h = h.replace('#',''); return [0,2,4].map(i => parseInt(h.slice(i,i+2),16)).join(' '); };
const esc = (s) => s.replace('/', '\\/');
const lines = [];
for (const cls of uniq) {
  const m = cls.match(/^([a-z]+)-([a-z]+)-([0-9]{2,3})(?:\/([0-9]+))?$/);
  if (!m) continue;
  const [, prop, hue, stop, op] = m;
  const ramp = C[hue]; if (!ramp || !ramp[FLIP[stop]]) continue;
  const r = rgb(ramp[FLIP[stop]]);
  const val = op ? `rgb(${r} / ${(+op/100).toFixed(2)})` : `rgb(${r})`;
  const S = `:root[data-bright="4"] .${esc(cls)}`;
  if (prop === 'from') lines.push(`${S}{--tw-gradient-from:${val} var(--tw-gradient-from-position);--tw-gradient-to:rgb(${r} / 0) var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)}`);
  else if (prop === 'to') lines.push(`${S}{--tw-gradient-to:${val} var(--tw-gradient-to-position)}`);
  else if (prop === 'via') lines.push(`${S}{--tw-gradient-to:rgb(${r} / 0) var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),${val} var(--tw-gradient-via-position),var(--tw-gradient-to)}`);
  else if (PROP[prop]) lines.push(`${S}{${PROP[prop]}:${val}}`);
}

// ── 4.12-01 ─ 못 박은 흰 글자(text-white)는 4단계(흰 바탕)에서 진한 글자(--dim-100)로.
//   검수사 2026-10-08 06:38 «화면을 밝게 하니 입력하는 글자가 보이지 않습니다» · 07:02 «화면 밝기에 따라서 글자색도 바뀌게 했으면 좋겠습니다».
//   4단계에서는 바탕(ink 변수·팔레트 스톱)이 전부 밝게 뒤집히는데 text-white 만 안 뒤집혀 흰 바탕에 흰 글자가 됐다(버튼 200여 곳 · 입력칸 · 미르 답변).
//   1~3단계에는 아무 규칙도 걸리지 않는다(어두운 화면은 예전과 같다).
lines.push(':root[data-bright="4"] .text-white,:root[data-bright="4"] .hover\\:text-white:hover{color:rgb(var(--dim-100))}');
//   예외 ① 같은 요소의 배경이 4단계에서도 어두운 채로 남는 것(검정·진한 슬레이트/회색 · 상태색 변수) — 소스에서 text-white 와 한 클래스 문자열에 같이 쓰인 것만 뽑는다.
const fs = require('fs');
const path = require('path');
const walk = (d, o) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, o); } else if (/\.(jsx|js)$/.test(e.name)) o.push(p); } return o; };
const DARK_BG = /^bg-(black|(?:slate|gray|zinc|neutral)-[5-9]\d\d|st-[A-Za-z]+|act(?:-hi|-dn)?)(?:\/\d+)?$/;
const keep = new Set();
for (const f of walk('src', [])) {
  const t = fs.readFileSync(f, 'utf8');
  const re = /text-white(?![\w-])/g; let m;
  while ((m = re.exec(t))) {
    const a = Math.max(t.lastIndexOf('"', m.index), t.lastIndexOf("'", m.index), t.lastIndexOf('`', m.index));
    if (a < 0) continue;
    const b = t.indexOf(t[a], m.index);
    if (b < 0) continue;
    for (const tok of t.slice(a + 1, b).split(/\s+/)) { const mm = DARK_BG.test(tok) && tok.match(/\/(\d+)$/); if (DARK_BG.test(tok) && !(mm && +mm[1] < 60)) keep.add(tok); }   // 알파가 60 미만인 옅은 틴트(bg-st-bad/10 등)는 흰 바탕 위에서 밝으므로 예외로 안 둔다
  }
}
for (const cls of [...keep].sort()) lines.push(`:root[data-bright="4"] .${esc(cls)}.text-white{color:#fff}`);
//   예외 ② 눌러도 안 되는 단추(disabled)는 예전처럼 흐린 글자 — disabled:text-dim-400/500 이 위 규칙에 가려지지 않게.
for (const n of ['400', '500']) lines.push(`:root[data-bright="4"] .text-white.disabled\\:text-dim-${n}:disabled{color:rgb(var(--dim-${n}))}`);
//   예외 ③ 사진·판 위처럼 어느 단계에서도 흰 글자여야 하는 곳은 소스에서 text-white 대신 fixed-white(index.css)를 쓴다 — 여기 규칙이 안 걸린다.

const body = lines.join('\n') + '\n';
if (process.argv.includes('--write')) {
  const target = 'src/brightLight.css';
  const cur = fs.readFileSync(target, 'utf8');
  const hm = cur.match(/^\/\*[\s\S]*?\*\/\r?\n/);
  fs.writeFileSync(target, (hm ? hm[0] : '') + body);
  console.error('✓ ' + target + ' 규칙 ' + lines.length + '줄 (설명 주석 ' + (hm ? '유지' : '없음') + ')');
} else {
  process.stdout.write(body);
}
