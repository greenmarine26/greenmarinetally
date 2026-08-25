// 2.40: 흰 바탕 단계용 «스톱 뒤집기» CSS 생성기. 실제 소스에 쓰인 조합만 뽑는다.
//   재생성: node tools/gen_bright_light.cjs > src/brightLight.css
//   ⛔ src/brightLight.css 를 손으로 고치지 마라 — 다음 재생성에 지워진다.
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
process.stdout.write(lines.join('\n') + '\n');
