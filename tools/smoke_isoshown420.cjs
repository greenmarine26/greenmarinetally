// 4.20-01 연막검사 — 풀·엠티 표식 코드(453E)가 화면에 그대로 나오지 않고 정본 규격 글자(45RE·45R1)로 나오는가. 실제 KKLC 2609N 엠티 20대 꼴 포함
//   실행 — node tools/smoke_isoshown420.cjs <repoRoot>
process.env.TZ = 'Asia/Seoul';
const path = require('path'); const fs = require('fs');
const root = process.argv[2] || process.cwd();
(async () => {
  let bad = 0;
  const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
  const U = await import(path.resolve(root, 'src/utils.js'));
  const cases = { '453E': '45RE', '453F': '45R1', '4530': '45R1', '450E': '45GE', '4500': '45G1', 'L5GE': 'L5GE', '950E': '950E', '45R1': '45R1', '22G1': '22G1', '': '' };
  for (const [i, w] of Object.entries(cases)) ok(U.isoShown(i) === w, `${JSON.stringify(i)} → ${JSON.stringify(w)} (${JSON.stringify(U.isoShown(i))})`);
  ok(U.isoToLabel('453E') === '40RH' && U.isoToLabel('4530') === '40RH', '규격 판정(라벨)은 그대로 — 표시만 바뀐다');
  const files = ['src/components/ContainerDetailModal.jsx', 'src/components/DiagnosticsPanel.jsx', 'src/components/BayPlan.jsx', 'src/pages/ChiefDashboard.jsx', 'src/pages/VoyagePage.jsx', 'src/components/ValidationBox.jsx', 'src/components/PositionEditModal.jsx', 'src/components/UnassignedListModal.jsx', 'src/nlSearch.js', 'src/inspectionList.js', 'src/emptyFind.js', 'src/ediGap.js', 'src/components/EmptyFindPanel.jsx', 'src/components/XrayTab.jsx', 'src/components/ISO403PhotoModal.jsx'];
  for (const f of files) { const t = fs.readFileSync(path.join(root, f), 'utf8'); ok(/isoShown/.test(t) && /import \{[^}]*isoShown[^}]*\} from/.test(t), `${f} 는 isoShown 을 부른다`); }
  const cd = fs.readFileSync(path.join(root, 'src/components/ContainerDetailModal.jsx'), 'utf8');
  ok(!/\(\{c\.iso \|\| '-'\}\)/.test(cd), '컨 상세 규격 괄호에 원시 코드가 직접 나오지 않는다');
  const dp = fs.readFileSync(path.join(root, 'src/components/DiagnosticsPanel.jsx'), 'utf8');
  ok(/\(\$\{isoShown\(m\.iso\)\}\)/.test(dp), '진단 «리스트에 없는 컨번호» 줄은 정본 규격 글자로 나온다');
  console.log(bad ? `✗ ${bad}건 실패` : '✓ 전부 통과'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
