// 훅이 조기 반환 뒤에 있으면 앱 전체가 죽는다 — 배포 전에 잡는다
//   React error #310 "Rendered more hooks than during the previous render".
//   실측 두 번: 1.26-02(WorkReportModal, 검수사 신고 2026-08-08 09:47 «작업 보고 누르면 무조건 터짐»)
//   그리고 2.88-01 — 그 사고를 적어 둔 주석 **바로 아래**에서 같은 실수를 반복했다.
//   사람 주의력에 맡길 일이 아니다.
const fs = require('fs'), path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROOT = process.argv[2] || process.cwd();
const HOOKS = /^use[A-Z]/;
let bad = 0, files = 0;

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p);
  return /\.jsx?$/.test(e.name) ? [p] : [];
});

for (const f of walk(path.join(ROOT, 'src'))) {
  const code = fs.readFileSync(f, 'utf8');
  if (!/use(State|Effect|Memo|Callback|Ref|Reducer|Context)\s*\(/.test(code)) continue;
  files++;
  let ast;
  try { ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] }); }
  catch (e) { console.error('  ✗ 파싱 실패 ' + f + ' — ' + e.message); bad++; continue; }

  traverse(ast, {
    Function(p) {
      const body = p.node.body;
      if (!body || body.type !== 'BlockStatement') return;
      //  컴포넌트/훅으로 보이는 것만 (이름이 대문자로 시작하거나 use 로 시작)
      const nm = (p.node.id && p.node.id.name)
        || (p.parent && p.parent.type === 'VariableDeclarator' && p.parent.id && p.parent.id.name) || '';
      if (!nm || !(/^[A-Z]/.test(nm) || HOOKS.test(nm))) return;

      let retLine = 0;
      for (const st of body.body) {
        //  조기 반환: 함수 본문 최상위의 `if (...) return ...`
        if (st.type === 'IfStatement') {
          const c = st.consequent;
          /*  ⚠ **null 을 돌려주는 조기 반환만** 본다.
              그것이 «닫힌 모달» 패턴이고, 열릴 때만 훅이 늘어 렌더마다 개수가 달라진다 —
              1.26-02 도 2.88-01 도 정확히 이 자리였다.
              `if (!voyage) return <다른 화면/>` 같은 JSX 반환은 성격이 다르다(항차 화면 33곳).
              그것까지 한 판에 손대면 회귀가 더 크다 — 오늘 잡을 것은 이 패턴이다. */
          const isNullRet = (x) => {
            if (!x) return false;
            if (x.type === 'ReturnStatement') return x.argument && x.argument.type === 'NullLiteral';
            if (x.type === 'BlockStatement') return x.body.some((y) => y.type === 'ReturnStatement'
              && y.argument && y.argument.type === 'NullLiteral');
            return false;
          };
          if (isNullRet(c)) { retLine = retLine || st.loc.start.line; }
          continue;
        }
        if (st.type === 'ReturnStatement' && st.argument && st.argument.type === 'NullLiteral'
            && st !== body.body[body.body.length - 1]) {
          retLine = retLine || st.loc.start.line;
        }
      }
      if (!retLine) return;

      //  그 조기 반환 뒤에 훅 호출이 있는가
      p.traverse({
        CallExpression(q) {
          const cal = q.node.callee;
          const name = cal.type === 'Identifier' ? cal.name
            : (cal.type === 'MemberExpression' && cal.property.type === 'Identifier' ? cal.property.name : '');
          if (!HOOKS.test(name)) return;
          if (!q.node.loc || q.node.loc.start.line <= retLine) return;
          //  중첩 함수 안의 훅은 이 함수 것이 아니다
          const fn = q.getFunctionParent();
          if (fn && fn.node !== p.node) return;
          console.error(`  ✗ ${path.relative(ROOT, f)}:${q.node.loc.start.line}  ${nm}() 의 ${name} 이 `
            + `조기반환 return null(${retLine}행) **뒤**에 있습니다 — React error #310 (앱 전체 크래시)`);
          bad++;
        },
      });
    },
  });
}

if (bad) {
  console.error(`\n  훅 순서 위반 ${bad}건 — 훅은 최상단, 조기 반환은 훅 뒤입니다.`);
  process.exit(1);
}
console.log(`✓ 훅 순서 검사 통과 (${files}개 파일 — 조기반환 null 뒤 훅 없음)`);
