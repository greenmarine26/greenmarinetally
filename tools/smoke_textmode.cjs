// 4.23 글자 두 모드(보통·크게) 연막검사 — 토큰이 변수로 갈리는지, 저장이 막혀도 안 죽는지, 미르 «글자 크게»가 걸리고 업무 질문은 안 가로채는지 본다.
//   검수사 2026-10-12 «수석들이 노안이 심한 사람이 많습니다. 두가지 모드로 했으면 합니다.»
//   ⚠ 글자 크기는 «빌드가 통과했다»로 증명되지 않는다 — 변수가 안 걸리면 화면만 그대로인 채 통과한다. 함수를 실제로 돌리고 빌드된 CSS 를 읽는다.
//   화면에 그려 재는 쪽(폰 390 «크게» 머리띠·독·진행 줄 넘침, 인쇄 고정)은 회귀 기준표 R33(tools/regress_r33_textmode.cjs)이 크로뮴으로 한다.
//   실행: node tools/smoke_textmode.cjs <번들된 harness.js> <assets/index-*.css>
const fs = require('fs');
const path = require('path');

let n = 0, bad = 0;
const ok = (c, m, d = '') => { n++; if (c) { if (process.env.SMOKE_VERBOSE) console.log('  ✓ ' + m); } else { bad++; console.log('  ✗ ' + m + (d ? ' — ' + d : '')); } };

//  기준 — 검수사 확정 설계(proposal ② 토큰 표). 4.22-04 값에서 독립으로 센다: 보통 = 가장 작은 셋만 +1, 크게 = 보통 +2.
const OLD = { '3xs': 9, '2xs': 10, 'xxs': 11, 'xs2': 12, 'sm2': 13, 'xs': 12, 'sm': 14, 'base': 16, 'lg': 18, 'xl': 20, '2xl': 24, '3xl': 30, '4xl': 36 };
const NORMAL = Object.fromEntries(Object.entries(OLD).map(([k, v]) => [k, ['3xs', '2xs', 'xxs'].includes(k) ? v + 1 : v]));
const LARGE = Object.fromEntries(Object.entries(NORMAL).map(([k, v]) => [k, v + 2]));
const px = (v) => { const s = String(v || '').trim(); const m = s.match(/^([\d.]+)(px|rem)$/); return m ? (m[2] === 'rem' ? +m[1] * 16 : +m[1]) : NaN; };
//  그 선택자의 블록 중 글자 변수(--fs-)가 든 것 — :root 는 밝기 블록이 먼저 나온다
const block = (css, sel) => { let i = -1; while ((i = css.indexOf(sel + ' {', i + 1)) >= 0) { const t = css.slice(i, css.indexOf('}', i)); if (/--fs-|font-size/.test(t) || sel.startsWith('.')) return t; } return ''; };
const varsOf = (txt) => Object.fromEntries([...txt.matchAll(/--fs-([\w]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

// ── ① tailwind.config — 글자 토큰 13개가 전부 변수를 읽는다(기본 키 xs·sm·base… 포함)
const tw = fs.readFileSync('tailwind.config.js', 'utf8');
for (const k of Object.keys(OLD)) ok(new RegExp(`'${k}':\\s*\\['var\\(--fs-${k}\\)'`).test(tw), `tailwind fontSize «${k}» 가 var(--fs-${k}) 를 읽는다`);

// ── ② index.css — 보통·크게·그림 고정·인쇄 네 벌의 값이 규칙대로다
const css = fs.readFileSync('src/index.css', 'utf8');
const vN = varsOf(block(css, ':root')), vL = varsOf(block(css, ':root[data-text="large"]')), vK = varsOf(block(css, '.fs-keep'));
const pr = css.slice(css.indexOf('@media print {'), css.indexOf('}', css.indexOf('@media print {') + 20));
const vP = varsOf(pr);
for (const k of Object.keys(OLD)) {
  ok(px(vN[k]) === NORMAL[k], `보통 ${k} = ${NORMAL[k]}px`, `${vN[k]}`);
  ok(px(vL[k]) === LARGE[k], `크게 ${k} = ${LARGE[k]}px`, `${vL[k]}`);
  ok(px(vK[k]) === OLD[k], `그림 고정(fs-keep) ${k} = 4.22-04 ${OLD[k]}px`, `${vK[k]}`);
  ok(px(vP[k]) === OLD[k], `인쇄 ${k} = 4.22-04 ${OLD[k]}px`, `${vP[k]}`);
}
const tapN = (block(css, ':root').match(/--tap:\s*(\d+)px/) || [])[1], tapL = (block(css, ':root[data-text="large"]').match(/--tap:\s*(\d+)px/) || [])[1];
ok(+tapN === 44 && +tapL === 48, '터치 최소 보통 44 · 크게 48', `${tapN} · ${tapL}`);
//  부품 글자 — 숫자로 박힌 font-size 가 남지 않았다(이모지 아이콘 줄은 그대로 둔다)
const PARTS = ['.bdg {', '.hud-tab {', '.seg-btn {', '.pop-btn {', '.chip-v2 {', '.status-pill {', '.home-count {', '.eta-big {', '.pop-btn.pop-sm {', '.drop-zone {', '.step-badge {'];
for (const p of PARTS) { const b = block(css, p.replace(' {', '')); ok(/font-size:\s*var\(--fs-/.test(b), `${p.replace(' {', '')} 글자가 변수를 읽는다`, b.slice(0, 80)); }
ok(/max-width:\s*420px\)\s*\{\s*:root\[data-text="large"\]\s*\.hud-tab\s*\{\s*letter-spacing:\s*-\.04em/.test(css), '크게 · 폰(≤420px) 독 자간 −.04em(390px 여섯 칸)');
//  4.23 2차(감사) — 크게 + 좁은 폰 규칙이 ≤420 크게 규칙 **뒤에**(같은 세기) 있어야 −.06em·한 단계 작은 글자가 이긴다
{
  const i420 = css.search(/max-width:\s*420px\)\s*\{\s*:root\[data-text="large"\]\s*\.hud-tab/);
  const i399 = css.search(/max-width:\s*399px\)\s*\{\s*:root\[data-text="large"\]\s*\.hud-tab\s*\{\s*letter-spacing:\s*-\.06em/);
  const i351 = css.search(/max-width:\s*351px\)\s*\{\s*:root\[data-text="large"\]\s*\.hud-tab\s*\{\s*font-size:\s*calc\(var\(--fs-tab\)\s*-\s*2px\)/);
  ok(i420 >= 0 && i399 > i420 && i351 > i399, '크게 · ≤399px 자간 −.06em · ≤351px 글자 한 단계 — ≤420 크게 규칙 뒤에(감사 «≤339 −.06em 이 크게 규칙에 밀림»)', `${i420} · ${i399} · ${i351}`);
}

// ── ③ 동작 — 실함수(utils·nlSearch)를 묶은 harness
const bundle = process.argv[2];
if (!bundle || !fs.existsSync(bundle)) { console.log('✗ harness 번들이 없다 — 검사를 못 돌렸다'); process.exit(1); }
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><head><style>:root{--fs-sm:.875rem}</style></head><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator;
global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
global.localStorage = dom.window.localStorage;
const warns = []; const _w = console.warn; console.warn = (...a) => warns.push(a.join(' '));
const m = require(path.resolve(bundle));
const root = dom.window.document.documentElement;
localStorage.removeItem('master_text_size_v1');
ok(m.getTextSize() === 1, '처음 기기 = 보통');
ok(m.applyTextSize(2) === 2 && root.getAttribute('data-text') === 'large' && localStorage.getItem('master_text_size_v1') === '2', 'applyTextSize(2) → <html data-text="large"> · 저장 2');
ok(m.getTextSize() === 2, '다시 읽으면 크게');
ok(m.applyTextSize(1) === 1 && !root.hasAttribute('data-text'), 'applyTextSize(1) → data-text 없음(보통)');
ok(m.applyTextSize('x') === 1 && m.applyTextSize(9) === 1, '엉뚱한 값은 보통');
//  저장이 막힌 기기(사생활 창·저장 꺼짐) — 안 죽고, 화면은 바뀌고, 조용히 넘기지 않는다
const realLS = global.localStorage;
const boom = { getItem() { throw new Error('막힘'); }, setItem() { throw new Error('막힘'); }, removeItem() { throw new Error('막힘'); } };
Object.defineProperty(dom.window, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
global.localStorage = boom;
let threw = '';
try {
  ok(m.getTextSize() === 1, '저장 읽기가 막히면 보통');
  warns.length = 0;
  ok(m.applyTextSize(2) === 2 && root.getAttribute('data-text') === 'large', '저장이 막혀도 화면은 크게로 바뀐다');
  ok(warns.some((w) => /글자.*저장 실패/.test(w)), '저장 실패를 조용히 넘기지 않는다(경고 한 줄)', warns.join(' | '));
} catch (e) { threw = String(e && e.message || e); }
ok(!threw, 'localStorage 가 예외를 던져도 죽지 않는다', threw);
global.localStorage = realLS; Object.defineProperty(dom.window, 'localStorage', { configurable: true, value: realLS });
m.applyTextSize(1);

//  미르 — 걸려야 할 것 / 안 걸려야 할 것(업무 질문·방법 질문)
const YES = [['글자 크게', 2], ['글씨 크게 해줘', 2], ['미르야 글자가 작아서 안 보여', 2], ['글씨가 잘 안 보여', 2], ['화면 글자 키워줘', 2],
             ['글자 보통으로', 1], ['글자 작게', 1], ['글씨 원래대로', 1]];
for (const [q, to] of YES) { const c = m.parseNaturalQuery(q).deviceCmd; ok(c && c.kind === 'text' && c.to === to, `미르가 «${q}» → 글자 ${to === 2 ? '크게' : '보통'}`, JSON.stringify(c)); }
const NO = ['글자 크기 어떻게 바꿔', '6653', '리퍼 몇대야', '컨테이너 글자가 작아', '20베이 양하 몇개야', '베이 화면 어디야', '글자', '글자 작'];
for (const q of NO) { const c = m.parseNaturalQuery(q).deviceCmd; ok(!c || c.kind !== 'text', `⛔ «${q}» 는 글자 조작이 아니다`, JSON.stringify(c)); }
//  밝기·소리는 종전 그대로(가로채지 않는다)
for (const [q, kind] of [['볼륨 크게', 'volume'], ['화면 밝게', 'bright'], ['소리 줄여줘', 'volume'], ['화면이 어두운데', 'bright']]) {
  const c = m.parseNaturalQuery(q).deviceCmd; ok(c && c.kind === kind, `«${q}» 는 여전히 ${kind}`, JSON.stringify(c));
}
//  4.23 2차(감사 반례) — 질문·인쇄물·실물 글자는 바꾸지 않는다 · «X 말고 Y» 는 뒤 것 · 밝기·소리와 같이 시키면 둘 다
const NO2 = ['기본 글자 크기가 뭐야', '글자 크기 몇이야', '글자 크게 어떻게 해', '컨번호 글자 안 보여', '글자 원래대로 하는 법 뭐야'];
for (const q of NO2) { const c = m.parseNaturalQuery(q).deviceCmd; ok(!c, `⛔ «${q}» 는 조작이 아니다(질문·실물 글자 — 글자도 밝기도 안 바꾼다)`, JSON.stringify(c)); }
for (const q of ['인쇄 글자 작아', '출력물 글자 크게', '덱플랜 글자 크게', '카고플랜 글씨 작아']) {
  const c = m.parseNaturalQuery(q).deviceCmd; ok(c && c.kind === 'text' && c.print === true && c.to == null, `«${q}» → 인쇄물 안내(바꾸지 않음)`, JSON.stringify(c));
}
for (const [q, to] of [['글자 작게 말고 크게', 2], ['글자 크게 말고 보통', 1], ['보통보다 글자 크게', 2], ['화면 글자가 작아서 안 보여', 2], ['글자 기본으로', 1]]) {
  const c = m.parseNaturalQuery(q).deviceCmd; ok(c && c.kind === 'text' && c.to === to, `«${q}» → 글자 ${to === 2 ? '크게' : '보통'}(그 낱말만 · 밝기 안 섞임)`, JSON.stringify(c));
}
for (const [q, k0, to] of [['소리 크게 글자도 크게', 'volume', 2], ['화면 밝게 하고 글자 크게', 'bright', 2], ['글자 크게 하고 소리 줄여', 'volume', 2]]) {
  const c = m.parseNaturalQuery(q).deviceCmd;
  ok(c && c.kind === 'multi' && c.cmds.length === 2 && c.cmds[0].kind === k0 && c.cmds[1].kind === 'text' && c.cmds[1].to === to, `«${q}» → ${k0} + 글자 둘 다`, JSON.stringify(c));
}
ok(m.deviceCmdWaitsForSubmit({ kind: 'text', to: 2 }) && m.deviceCmdWaitsForSubmit({ kind: 'multi', cmds: [{ kind: 'bright', dir: 1 }, { kind: 'text', to: 2 }] })
  && !m.deviceCmdWaitsForSubmit({ kind: 'bright', dir: 1 }) && !m.deviceCmdWaitsForSubmit({ kind: 'volume', dir: -1 }) && !m.deviceCmdWaitsForSubmit(null), '글자 조작만 전송 때 실행(밝기·소리는 종전대로 치는 중에도)');
//  두 검색 화면이 실행 전에 그 문지기를 본다(소스)
for (const f of ['src/components/SearchPanel.jsx', 'src/pages/GlobalSearchPage.jsx']) {
  const src = fs.readFileSync(f, 'utf8');
  ok(/if \(!askedAt && deviceCmdWaitsForSubmit\(cmd\)\) return;/.test(src), `${f} — 글자 조작은 전송(askedAt) 뒤에만 runDeviceCmd`);
}

//  실행 — 이 화면(검수앱 CSS 있음)에서는 바뀌고, 글자 모드를 모르는 화면(콘앱처럼 변수 없음)에서는 «못 바꿔요» 하고 아무것도 안 바꾼다
let msg = m.runDeviceCmd({ kind: 'text', to: 2 });
ok(root.getAttribute('data-text') === 'large' && /크게/.test(msg), `미르 실행 «글자 크게» → 크게 («${msg}»)`);
msg = m.runDeviceCmd({ kind: 'text', to: 2 });
ok(/이미/.test(msg), `이미 크게면 «이미» 라고 말한다 («${msg}»)`);
msg = m.runDeviceCmd({ kind: 'text', to: 1 });
ok(!root.hasAttribute('data-text') && /보통/.test(msg), `미르 실행 «글자 보통» → 보통 («${msg}»)`);
//  인쇄물 — 바꾸지 않고 «무관합니다» · 둘 다 시키면 차례로 하고 답을 잇는다
msg = m.runDeviceCmd({ kind: 'text', print: true });
ok(!root.hasAttribute('data-text') && /인쇄물은 글자 모드와 무관합니다/.test(msg), `인쇄물 글자 → 바꾸지 않고 무관하다고 말한다 («${msg.slice(0, 30)}…»)`);
msg = m.runDeviceCmd({ kind: 'multi', cmds: [{ kind: 'volume', dir: +1 }, { kind: 'text', to: 2 }] });
ok(root.getAttribute('data-text') === 'large' && /소리/.test(msg) && /글자를 «크게»/.test(msg), `«소리 크게 글자도 크게» → 소리·글자 둘 다 («${msg}»)`);
m.runDeviceCmd({ kind: 'text', to: 1 });
dom.window.document.head.innerHTML = '';   // 콘앱처럼 — 글자 모드 변수가 없는 화면
msg = m.runDeviceCmd({ kind: 'text', to: 2 });
ok(!root.hasAttribute('data-text') && /못 바꿔요/.test(msg), `글자 모드가 없는 화면(콘앱)에서는 바꾸지 않고 그렇다고 말한다 («${msg}»)`);
msg = m.runDeviceCmd({ kind: 'text', print: true });
ok(/인쇄물은 글자 모드와 무관합니다/.test(msg), '콘앱에서도 인쇄물 글자는 같은 말(두 앱 같은 답)');
console.warn = _w;

// ── ④ 빌드된 CSS — 변수가 살아남았나(잘리면 화면이 통째로 기본 크기로 돈다)
const built = process.argv[3];
if (!built || !fs.existsSync(built)) { console.log('✗ 빌드된 CSS 가 없다'); process.exit(1); }
const b = fs.readFileSync(built, 'utf8');
for (const k of Object.keys(OLD)) ok(new RegExp(`\\.text-${k}\\{font-size:var\\(--fs-${k}\\)`).test(b), `빌드 CSS .text-${k} 가 변수를 읽는다`);
ok(/:root\[data-text=["']?large["']?\]\{[^}]*--fs-sm:\s*1rem/.test(b), '빌드 CSS 에 크게 블록(--fs-sm 1rem)이 있다');
ok(/\.fs-keep\{[^}]*--fs-2xs:\s*10px/.test(b), '빌드 CSS 에 그림 고정(.fs-keep) 블록이 있다');
ok(/@media print\{:root,:root\[data-text=["']?large["']?\]\{[^}]*--fs-2xs:\s*10px/.test(b), '빌드 CSS 에 인쇄 고정 블록이 있다');

console.log(bad ? `✗ 글자 두 모드 연막검사 실패 ${bad}/${n}` : `✓ 글자 두 모드 연막검사 통과 (${n}항목 · 보통 9→10·10→11·11→12 · 크게 +2 · 그림·인쇄 4.22-04 고정 · 저장 막혀도 동작 · 미르 글자 조작 O · 질문·인쇄물·실물 글자 안 바꿈 · 글자는 전송 때만 · 업무질문 가로채기 0)`);
process.exit(bad ? 1 : 0);
