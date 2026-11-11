// 4.87-09 «스테이지»=«플랜» 연막검사 — 스테이지·스토우플랜을 플랜 명령으로 읽는다
//   실행 — node tools/smoke_stage48709.cjs <repoRoot>
const path = require('path');
const { pathToFileURL } = require('url');
const root = path.resolve(process.argv[2] || process.cwd());
let n = 0, bad = 0;
const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + d)); if (!c) bad++; };
(async () => {
  const P = await import(pathToFileURL(path.join(root, 'src/planCommand.js')).href);
  const g = (q) => P.parseViewCommand(q);
  const eq = (q, mode, what) => { const r = g(q); ok(r && r.mode === mode && r.what === what, '«' + q + '»', JSON.stringify(r)); };
  eq('스테이지', null, 'cargo');
  eq('스테이지 보여줘', null, 'cargo');
  eq('MCSC 스테이지', null, 'cargo');
  eq('양하 스테이지 보여줘', 'discharge', 'cargo');
  eq('선적 스테이지 보여줘', 'loading', 'cargo');
  eq('카고 스테이지', null, 'cargo');
  eq('스토우플랜', 'loading', 'cargo');
  eq('스토우 플랜 보여줘', 'loading', 'cargo');
  eq('5번 스테이지', null, 'bay');
  ok(g('카고플랜') && g('카고플랜').what === 'cargo', '종전 카고플랜 그대로');
  ok(g('스테이지에 뭐 있어') === null, '조회 문장은 열지 않음', JSON.stringify(g('스테이지에 뭐 있어')));
  for (const q of ['스테이지 몇 개 보여줘', '스테이지 어디 있어 보여줘', '스테이지에 컨 몇 대 보여줘', '스테이지 가줘', '스테이지로 이동', '이 스테이지 안에 몇개 있어 보여줘', '스테이지 어디서 뽑아', '스테이지 몇 개', '스토우플랜 어디서 뽑아']) ok(g(q) === null, '조회는 열지 않음 «' + q + '»', JSON.stringify(g(q)));
  eq('스테이지 열어줘', null, 'cargo');
  eq('MCSC 스테이지 보여 주세요', null, 'cargo');
  console.log(`\n${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
