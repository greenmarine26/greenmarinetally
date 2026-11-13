// 5.00-01 갱 수 한 벌 연막검사 — 이 조에 호기–검수원을 등록했으면(info.craneCrew) 그 호기 수가 갱 수다. 말로 정한 갱 수(gangsShift)가 있으면 그것이 이긴다.
//  왜 있는가 — 검수사 2026-11-13 13:49 «갱수를 이미 알렸는데 모른다는 이유는?» STMJ 2671E 주간 — info.craneCrew['11-13 주간'] = { 1호기 류청호 · 2호기 김성일 }
//  (RTDB GET 실측 모양 { name, at }) 인데 gangsShift 가 없어 «예상 작업 시간» 이 «갱 수 미등록이라 2갱으로 셈» 이라고 했다. 셈은 같아도 근거가 틀렸다.
//  사용: node tools/smoke_gangs50001.cjs <smoke_eta401_entry 번들.cjs> <저장소 루트>
const fs = require('fs');
const path = require('path');
const BUNDLE = process.argv[2];
const ROOT = process.argv[3] || path.resolve(__dirname, '..');
if (!BUNDLE) { console.error('사용법: node tools/smoke_gangs50001.cjs <번들.cjs> [루트]'); process.exit(1); }
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };
const M = require(path.resolve(BUNDLE));
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fail = 0, pass = 0;
const ok = (c, m, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || extra === undefined ? '' : '  → ' + extra)); if (c) pass++; else fail++; };
const NOW = Date.parse('2026-11-13T14:00:00+09:00');   // STMJ 2671E 주간(검수사 물음 13:49 무렵)
const KEY = M.shiftGangKey(M.currentShift(NOW));
const crew = (n) => { const o = {}; for (let i = 1; i <= n; i++) o[`${i}호기`] = { at: 1794543664195, name: ['류청호', '김성일', '최관식', '송제욱'][i - 1] }; return o; };
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'eta401_atpr_real.json'), 'utf8'));
const withInfo = (patch) => { const v = JSON.parse(JSON.stringify(base)); v.info = { ...(v.info || {}), ...patch }; delete v.info.gangs; delete v.info.gangsShift; Object.assign(v.info, patch); return v; };
const E = (v) => M.expectedWorkTimeOf(v, M.shiftCnSetOf('ATPR_2644E', v), NOW);

console.log('5.00-01 갱 수 한 벌 — 말한 수 → 이 조 호기 등록 수 → 항차 기본');
ok(KEY === '11-13 주간', `조 키는 기존 shiftGangKey 벌(«${KEY}»)`);
const v2 = withInfo({ craneCrew: { [KEY]: crew(2) }, workStartAt: Date.parse('2026-11-13T13:05:00+09:00') });
const G2 = M.gangsOfShift(v2.info, NOW);
ok(G2.n === 2 && G2.src === 'crew' && G2.crew === 2, 'STMJ 꼴 — craneCrew 두 호기 · gangsShift 없음 → 2갱(근거 호기 등록)', JSON.stringify(G2));
const E2 = E(v2);
ok(E2 && E2.gangsKnown === true && E2.gangs === 2 && E2.gangsSrc === 'crew', '예상 작업 시간 — gangsKnown=true · 2갱으로 셈', E2 && `${E2.gangsKnown}/${E2.gangs}/${E2.gangsSrc}`);
const L2 = M.workTimeLinesOf(E2).join(' ');
ok(/호기 등록 2대 → 2갱/.test(L2) && !/미등록/.test(L2), '미르 답 근거 «호기 등록 2대 → 2갱» · «갱 수 미등록» 없음', L2.slice(-80));
const v3 = withInfo({ craneCrew: { [KEY]: crew(3) } });
ok(M.gangsOfShift(v3.info, NOW).n === 3 && E(v3).gangs === 3, 'craneCrew 셋이면 3갱');
const vS = withInfo({ craneCrew: { [KEY]: crew(3) }, gangsShift: { [KEY]: 2 }, gangs: 4 });
const GS = M.gangsOfShift(vS.info, NOW);
ok(GS.n === 2 && GS.src === 'said' && E(vS).gangs === 2, '말로 정한 갱 수(gangsShift 2)가 호기 등록 셋·항차 기본 넷을 이긴다', JSON.stringify(GS));
const vO = withInfo({ craneCrew: { '11-12 야간': crew(3) }, gangs: 1 });
ok(M.gangsOfShift(vO.info, NOW).n === 1 && M.gangsOfShift(vO.info, NOW).src === 'voyage', '다른 조(어젯밤) 호기 등록은 지금 조를 정하지 않는다 → 항차 기본');
const vN = withInfo({});
const EN = E(vN);
ok(M.gangsOfShift(vN.info, NOW).n === 0 && EN.gangsKnown === false && EN.gangs === 2 && /갱 수 미등록이라 2갱으로 셈/.test(M.workTimeLinesOf(EN).join(' ')), '아무것도 없으면 종전대로 «갱 수 미등록이라 2갱으로 셈»');
const vE = withInfo({ craneCrew: { [KEY]: { '1호기': { at: 1, name: ' ' }, '2호기': { at: 1, name: '김성일' } } } });
ok(M.gangsOfShift(vE.info, NOW).n === 1, '이름이 빈 호기 칸은 세지 않는다');

console.log('읽는 곳이 한 벌을 부르는지(소스)');
const mir = rd('src/mir.js'), nl = rd('src/nlSearch.js'), ch = rd('src/chiefAnswers.js'), et = rd('src/components/ExpectedTimeLine.jsx');
ok(/gangsOfShift\(info, now\)/.test(mir) && /gangsOfShift\(info, ms\)\.n/.test(nl) && /gangsOfShift\(voyage\?\.info, shift\)/.test(ch), 'mir.expectedWorkTimeOf · nlSearch _gOf · chiefAnswers 갱 배분이 gangsOfShift 를 부른다');
const raw = ['src/mir.js', 'src/nlSearch.js', 'src/chiefAnswers.js', 'src/components/ExpectedTimeLine.jsx'].filter((f) => /info\??\.gangsShift(?:\?\.)?\[/.test(rd(f).replace(/^\s*\/\/.*$/gm, '')));
ok(!raw.length, 'gangsShift[조] 를 직접 읽는 곳 0(쓰는 firebase.js 는 빼고)', raw.join(', '));
ok(/E\.gangsSrc === 'crew' \? ` · 호기 등록 \$\{E\.gangsCrew\}대 → \$\{E\.gangs\}갱`/.test(et), '화면 «예상 작업 시간» 근거 줄도 «호기 등록 N대 → N갱»');
console.log(fail ? `✗ 5.00-01 갱 수 한 벌 연막 ${fail}/${pass + fail} 실패` : `✓ 5.00-01 갱 수 한 벌 연막 — ${pass}/${pass} 통과`);
process.exit(fail ? 1 : 0);
