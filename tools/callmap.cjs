// 함수 호출 지도 — 함수 이름을 주면 «어디서 정의되고 어디서 쓰이고 어느 시험이 지키는가»를 소스에서 바로 뽑는다(손으로 쓰지 않으니 낡지 않는다)
// 쓰는 법  node tools/callmap.cjs 함수이름        → 그 함수(이름 일부도 됨)의 정의·호출처·지키는 시험
//          node tools/callmap.cjs --md > docs/CALLMAP.md  → 여러 표면에 걸친 함수 전체 지도(고칠 때 한 번에 다 보이는 표)
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SKIP = ['node_modules', 'dist', '.git', 'assets', 'mir_art', 'data', 'fixtures'];
const walk = (d, out = []) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.includes(f.name)) continue;
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/\.(js|jsx|cjs|mjs|html)$/.test(f.name) && !/\.min\./.test(f.name)) out.push(p);
  }
  return out;
};
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
// 표면 구분 — src(검수앱) · 그 밖(콘앱·번들) · tools(시험)
const surfaceOf = r => r.startsWith('tools/') ? '시험' : r.startsWith('src/') ? '검수앱' : '콘앱·번들';
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
const code = {};
for (const p of walk(ROOT)) code[rel(p)] = stripComments(fs.readFileSync(p, 'utf8')).split('\n');

// 정의 모으기 — src 는 export, 그 밖은 최상위 function
const defs = {};
const defExport = /^\s*export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/;
const defTop = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/;
for (const r of Object.keys(code)) {
  if (r.startsWith('tools/')) continue;
  code[r].forEach((l, i) => {
    const m = defExport.exec(l) || (!r.startsWith('src/') && defTop.exec(l));
    if (m) (defs[m[1]] = defs[m[1]] || []).push({ file: r, line: i + 1 });
  });
}
const usesOf = name => {
  const re = new RegExp('(?<![\\w$])' + name.replace(/\$/g, '\\$') + '(?![\\w$])');
  const by = { 검수앱: {}, '콘앱·번들': {}, 시험: {} };
  for (const r of Object.keys(code)) code[r].forEach((l, i) => {
    if (!re.test(l) || (defs[name] || []).some(d => d.file === r && d.line === i + 1)) return;
    (by[surfaceOf(r)][r] = by[surfaceOf(r)][r] || []).push(i + 1);
  });
  return by;
};
const fmt = g => Object.entries(g).map(([f, ls]) => `${f}:${ls.slice(0, 8).join(',')}${ls.length > 8 ? '…(' + ls.length + ')' : ''}`);

const arg = process.argv[2];
if (!arg) { console.error('쓰는 법  node tools/callmap.cjs 함수이름  |  --md'); process.exit(1); }

if (arg !== '--md') {
  const names = defs[arg] ? [arg] : Object.keys(defs).filter(n => n.toLowerCase().includes(arg.toLowerCase())).slice(0, 15);
  if (!names.length) { console.log('«' + arg + '» 정의를 못 찾았다(src export·콘앱 최상위 함수만 본다).'); process.exit(0); }
  for (const n of names) {
    const by = usesOf(n);
    console.log('■ ' + n + '  정의 ' + defs[n].map(d => d.file + ':' + d.line).join(' · '));
    for (const k of ['검수앱', '콘앱·번들', '시험']) {
      console.log('  ' + k + (k === '시험' ? '(고치면 걸리는 시험)' : '') + ' — ' + (Object.keys(by[k]).length ? fmt(by[k]).join(' | ') : '없음'));
    }
  }
  process.exit(0);
}

// --md — 한 군데가 아니라 여러 곳에 걸친 함수만 표로
const rows = [];
for (const n of Object.keys(defs)) {
  if (n.length < 5) continue;
  const by = usesOf(n);
  const src = Object.keys(by['검수앱']).filter(f => f !== defs[n][0].file);
  const other = Object.keys(by['콘앱·번들']);
  const tests = Object.keys(by['시험']);
  if (src.length + other.length >= 3 || (other.length >= 1 && src.length >= 1)) rows.push({ n, def: defs[n][0], src, other, tests });
}
rows.sort((a, b) => (b.src.length + b.other.length) - (a.src.length + a.other.length) || a.n.localeCompare(b.n));
console.log('# 함수 호출 지도 (자동 생성 — 손으로 고치지 않는다)\n');
console.log('> `node tools/callmap.cjs --md > docs/CALLMAP.md` 로 다시 만든다. 한 함수만 보려면 `node tools/callmap.cjs 함수이름`.');
console.log('> «여러 곳에 걸친 함수» = 정의 파일 밖 검수앱 파일 + 콘앱·번들 파일이 3개 이상이거나, 검수앱과 콘앱·번들 양쪽에서 쓰는 것. 이런 함수를 고치면 호출처를 전부 봐야 한다.');
console.log('> 이름 문자열로 부르는 경우(문자열 안의 이름)는 잡지 못한다 — 그때는 grep 도 같이 한다.\n');
console.log('총 정의 ' + Object.keys(defs).length + '개 · 여러 곳에 걸친 함수 ' + rows.length + '개\n');
console.log('| 함수 | 정의 | 검수앱 쓰는 곳 | 콘앱·번들 | 시험 |\n|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| \`${r.n}\` | ${r.def.file}:${r.def.line} | ${r.src.length}개 파일 | ${r.other.length ? r.other.join(', ') : '-'} | ${r.tests.length ? r.tests.length + '개' : '**없음**'} |`);
}
