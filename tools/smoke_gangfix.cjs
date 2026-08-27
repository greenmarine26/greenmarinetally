// 2.68 항차별 갱 수 연막검사 — 근무배정으로 정해진 갱 수를 앱이 기억하는가.
//   검수사 확정 2026-08-27: «SWTD 갱배분은 3갱으로 하시면 편할듯 합니다» (기본 2갱을 매번 «3갱이면»으로 덮어야 했다)
const path = require('path');
const fs = require('fs');
const NL = require(path.resolve(process.argv[2]));
const ROOT = process.argv[3] || process.cwd();
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };

//  ── 말로 기억시키기 ──
const P = (q) => NL.parseNaturalQuery(q);
T(P('3갱으로 기억해').gangSet?.n === 3, '«3갱으로 기억해» 를 못 알아듣는다');
T(P('SWTD 3갱으로 해').gangSet?.n === 3, '«3갱으로 해» 를 못 알아듣는다');
T(P('이 배 3갱이야').gangSet?.n === 3, '«이 배 3갱이야» 를 못 알아듣는다');
T(P('2갱으로 기억').gangSet?.n === 2, '2갱으로 되돌리는 말을 못 알아듣는다');
T(!P('갱 배분').gangSet && !P('3갱이면').gangSet, '단순 질문(«갱 배분»·«3갱이면»)까지 저장 명령으로 본다 — 물어만 봐도 바뀐다');
T(!!P('3갱으로 기억해').gangQuery, '저장 뒤 계산을 안 보여준다 — 바뀐 걸 눈으로 확인할 수 없다');
T(!P('한 갱만 남았어').gangSet, '엉뚱한 문장을 저장 명령으로 본다');

//  ── 저장·반영 배선 ──
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
T(/export async function fbSetVoyageGangs/.test(rd('src/firebase.js')), '갱 수 저장 함수가 없다');
T(/gangs: g, gangsAt: Date\.now\(\), gangsBy/.test(rd('src/firebase.js')), '누가·언제 정했는지 안 남긴다');
T(/opts\.nGangs \|\| Number\(voyage\?\.info\?\.gangs\) \|\| 2/.test(rd('src/chiefAnswers.js')),
  '계산이 항차에 정해 둔 갱 수를 안 본다 — 기억시켜도 2갱으로 나온다');
T(/fixed: !opts\.nGangs && Number\(voyage\?\.info\?\.gangs\) > 0/.test(rd('src/chiefAnswers.js')), '정해 둔 값인지 표시가 없다');
T(/이 항차는 \$\{gs\.nGangs\}갱으로 정해 두셨어요/.test(rd('src/chiefAnswers.js')), '어디서 온 수인지 안 밝힌다');
//  세 화면이 같은 한 벌 — 작업 시작 탭·양하 탭·LOLO 탭
const vp = rd('src/pages/VoyagePage.jsx');
T((vp.match(/fbSetVoyageGangs\(voyageKey, g\.n, inspector/g) || []).length === 2, '양하·LOLO 탭 중 한 곳이 저장을 안 한다');
T(/fbSetVoyageGangs\(voyageKey, g\.n, inspector/.test(rd('src/components/SearchPanel.jsx')), '작업 시작 탭이 저장을 안 한다');
T(!/const gangSetRef[\s\S]{0,400}const _sideCanc/.test(vp), '저장 훅이 VoyagePage 안에 있다 — ask 가 없어 화면이 죽는다(2.50-01 함정)');
if (bad > 0) { console.error(`✗ 갱 수 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 갱 수 연막검사 통과 — 말 7 · 저장·반영 7');
