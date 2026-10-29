// 4.56 조용한 실패 눈금 시험 — 소스에서 «주석도 없는 빈 catch» · «빈 .catch(()=>{})» · «signal 없는 fetch» 를 파일별로 세어, 기준선(tools/silentfail_baseline.json)보다 늘면 막는다. 줄어들면 기준선을 낮추라고 알린다.
//   왜 — 절대 12-6 «조용한 실패 금지». 지금 있는 것을 한꺼번에 고치면 고장 안 난 코드를 건드리게 되니, 새로 늘지 않게만 기계가 지킨다. 깊은 검사는 tools/semgrep/silent-fail.yml (semgrep --test tools/semgrep).
const fs = require('fs'); const path = require('path'); const babel = require('@babel/core');
const ROOT = path.join(__dirname, '..'); let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const walk = (d, o = []) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p, o); else if (/\.(js|jsx)$/.test(f.name) && !/\.min\./.test(f.name)) o.push(p); } return o; };
const scan = (file) => {
  const code = fs.readFileSync(file, 'utf8'); let ast;
  try { ast = babel.parseSync(code, { filename: file, sourceType: 'unambiguous', presets: [require.resolve('@babel/preset-react')], configFile: false, babelrc: false }); } catch (e) { return { err: String(e.message).slice(0, 120) }; }
  const c = { bareCatch: 0, emptyPromiseCatch: 0, fetchNoSignal: 0 };
  const visit = (n) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'CatchClause' && n.body.body.length === 0 && !(n.body.innerComments && n.body.innerComments.length)) c.bareCatch++;
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.property && n.callee.property.name === 'catch' && n.arguments[0] && /Function/.test(n.arguments[0].type) && n.arguments[0].body && n.arguments[0].body.type === 'BlockStatement' && n.arguments[0].body.body.length === 0 && !(n.arguments[0].body.innerComments && n.arguments[0].body.innerComments.length)) c.emptyPromiseCatch++;
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'fetch') {
      const o = n.arguments[1]; const hasSignal = o && o.type === 'ObjectExpression' && o.properties.some((p) => p.key && (p.key.name === 'signal' || p.key.value === 'signal'));
      const cond = o && o.type === 'ConditionalExpression';   // firebase.js: ctl ? { signal } : undefined — 타임아웃을 다는 갈래가 있다
      if (!hasSignal && !cond) c.fetchNoSignal++;
    }
    for (const k of Object.keys(n)) { if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments' || k === 'innerComments') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v.type === 'string') visit(v); }
  };
  visit(ast); return c;
};
console.log('조용한 실패 눈금(4.56) — 빈 catch · 빈 .catch · signal 없는 fetch');
const cur = {}; for (const f of walk(path.join(ROOT, 'src'))) { const r = scan(f); const rel = path.relative(ROOT, f).split(path.sep).join('/'); if (r.err) { ok(false, `${rel} 파싱 실패 — ${r.err}`); continue; } if (r.bareCatch || r.emptyPromiseCatch || r.fetchNoSignal) cur[rel] = r; }
const BP = path.join(__dirname, 'silentfail_baseline.json');
if (process.argv.includes('--write')) { fs.writeFileSync(BP, JSON.stringify(cur, null, 1) + '\n'); console.log('기준선을 새로 썼다 — 파일 ' + Object.keys(cur).length + '개'); process.exit(0); }
const base = JSON.parse(fs.readFileSync(BP, 'utf8'));
const sum = (o, k) => Object.values(o).reduce((t, x) => t + (x[k] || 0), 0); const names = { bareCatch: '주석도 없는 빈 catch', emptyPromiseCatch: '빈 .catch(()=>{})', fetchNoSignal: 'signal 없는 fetch' };
let lowered = 0;
for (const k of Object.keys(names)) {
  const worse = []; for (const f of Object.keys(cur)) if ((cur[f][k] || 0) > ((base[f] && base[f][k]) || 0)) worse.push(`${f} ${((base[f] && base[f][k]) || 0)}→${cur[f][k]}`);
  ok(!worse.length, `${names[k]} — 지금 ${sum(cur, k)}건 (기준선 ${sum(base, k)}건)${worse.length ? ' · 늘어난 곳 ' + worse.join(', ') + ' — 없애거나 이유를 주석으로 남긴다(console.warn 또는 /* 이유 */)' : ''}`);
  if (sum(cur, k) < sum(base, k)) lowered++;
}
if (lowered) console.log('  · 기준선보다 줄었다 — node tools/smoke_silentfail456.cjs --write 로 기준선을 낮춘다(줄어든 만큼 지켜진다)');
console.log(fail ? `\n✗ 조용한 실패 눈금 ${fail}건 실패` : '\n✔ 조용한 실패 눈금 통과'); process.exit(fail ? 1 : 0);
