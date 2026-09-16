// 훅 의존 배열의 **선언 순서**(TDZ) 검사 — 3.53 신설.
//   왜 — `useEffect(fn, [x])` 의 의존 배열은 콜백과 달리 **렌더 중 그 자리에서** 평가된다.
//   `const x` 보다 위에 두면 «Cannot access 'x' before initialization» 으로 **화면이 통째로 죽는다.**
//   빌드는 통과하고, `smoke_scope` 도 «바인딩은 있다»며 0건을 낸다 — 그래서 지금까지 아무도 못 잡았다.
//   실측 2026-09-16(재감사) — 3.53 이 `VoyagePage` 에 그 실수를 넣어 **어느 항차도 못 여는 상태**였다.
//   3.51-02 의 `voyage is not defined`, 2.50-02 의 `manualBayPairs` 와 같은 계열의 세 번째다.
//
//  판정 — 같은 함수 본문 안에서 `useEffect|useMemo|useCallback|useLayoutEffect` 의 의존 배열이
//        **그 호출보다 뒤에 선언된 `const`/`let`** 을 가리키면 실패.
//  ⚠ 함수 선언(hoisting 됨)·`var`·바깥 스코프 이름은 대상이 아니다.
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROOT = process.argv[2] || path.resolve(__dirname, '..');
const HOOKS = new Set(['useEffect', 'useMemo', 'useCallback', 'useLayoutEffect', 'useInsertionEffect']);
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(jsx?|mjs)$/.test(e.name)) files.push(p);
  }
})(path.join(ROOT, 'src'));

const bad = [];
for (const f of files) {
  let ast;
  try { ast = parser.parse(fs.readFileSync(f, 'utf8'), { sourceType: 'module', plugins: ['jsx'] }); }
  catch (e) { bad.push(`${path.relative(ROOT, f)} — 파싱 실패: ${e.message}`); continue; }
  traverse(ast, {
    CallExpression(p) {
      const callee = p.node.callee;
      const name = callee && (callee.name || (callee.property && callee.property.name));
      if (!HOOKS.has(name)) return;
      const deps = p.node.arguments[1];
      if (!deps || deps.type !== 'ArrayExpression') return;
      const callStart = p.node.start;
      for (const el of deps.elements) {
        if (!el) continue;
        //  `a.b.c` 는 뿌리 식별자만 본다
        let root = el;
        while (root && (root.type === 'MemberExpression' || root.type === 'OptionalMemberExpression')) root = root.object;
        if (!root || root.type !== 'Identifier') continue;
        const binding = p.scope.getBinding(root.name);
        if (!binding || !binding.path || !binding.path.node) continue;
        const kind = binding.kind;                       // 'const' | 'let' | 'var' | 'hoisted' | 'param' | 'module'
        if (kind !== 'const' && kind !== 'let') continue;
        const declStart = binding.path.node.start;
        if (typeof declStart !== 'number') continue;
        if (declStart > callStart) {
          const line = p.node.loc ? p.node.loc.start.line : '?';
          const dline = binding.path.node.loc ? binding.path.node.loc.start.line : '?';
          bad.push(`${path.relative(ROOT, f)}:${line} — ${name}([… ${root.name} …]) 이 ${dline}행의 \`${kind} ${root.name}\` 보다 **위**에 있다 (TDZ — 화면이 죽는다)`);
        }
      }
    },
  });
}

console.log('훅 의존 배열 선언 순서(TDZ) 검사 — ' + files.length + '개 파일');
if (bad.length) {
  for (const b of bad) console.log('  ✗ ' + b);
  console.log(`✗ ${bad.length}건 — 그 훅 블록을 해당 선언 **아래**로 옮겨야 한다`);
  process.exit(1);
}
console.log('✓ 0건');
process.exit(0);
