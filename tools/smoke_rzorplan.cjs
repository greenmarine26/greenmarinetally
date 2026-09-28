// 3.67 연막검사 — RZOR 선적 덱플랜: 검수사 STOWAGE PLAN 파서 · 자동 덱플랜(예측·확정) · 엑셀 내보내기 왕복 · 화면 배선.
//   실물 고정본으로만 잰다 — tools/fixtures/rzor_plan_R106W.xlsx(2026-09-28 마감텔리) · rzor_plan_R079W.xlsx · rzor_rzdf_R106E.xlsx(선사 덱플랜) ·
//   rzor_termwork_R106E.json(RTDB voyages/RZOR_R106E/loading 의 컨·동방 실적). 실소스를 esbuild 로 묶어 실제로 돌린다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'rzorplan_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const fx = (p) => path.join(ROOT, 'tools', 'fixtures', p);

const ENTRY = path.join(TMP, 'entry.mjs');
fs.writeFileSync(ENTRY, `export { isDeckPlanWorkbook, isCheckerPlanWorkbook, parseDeckPlanWorkbook } from "${ROOT}/src/rzorPlan.js";
export { buildRzorLoadingDeckPlan, rzorLoadSequence, rzorSizeOf } from "${ROOT}/src/rzorDeckPredict.js";
export { buildCheckerPlanWorkbook, checkerTypeOf } from "${ROOT}/src/rzorPlanExcel.js";
export { craneSlots, RZOR_DECK_SLOTS, RZOR_PATH_TWENTY } from "${ROOT}/src/data/rzorDeckRules.js";\n`);
const OUT = path.join(TMP, 'rz.cjs');
execSync(`npx esbuild "${ENTRY}" --bundle --platform=node --format=cjs --log-level=error --outfile="${OUT}"`, { cwd: ROOT, stdio: 'pipe' });
const M = require(OUT);
const XLSX = require(path.join(ROOT, 'node_modules', 'xlsx'));
const readWb = (p) => XLSX.read(fs.readFileSync(p), { type: 'buffer', cellStyles: true });
const deckN = (plan, d) => { const dk = plan.decks.find((x) => x.deck === d); return dk ? dk.slots.filter((s) => !s.empty).length : -1; };

(async () => {
  console.log('■ ① 검수사 STOWAGE PLAN 파서 — 실물 R106W·R079W');
  const wb106 = readWb(fx('rzor_plan_R106W.xlsx'));
  ok('R106W 는 검수사 양식으로 감지된다(isCheckerPlanWorkbook)', M.isCheckerPlanWorkbook(wb106));
  ok('R106W 는 덱플랜 워크북으로도 통한다(isDeckPlanWorkbook — 업로드 관문)', M.isDeckPlanWorkbook(wb106));
  const p106 = M.parseDeckPlanWorkbook(wb106, XLSX);
  ok('R106W 항차·총계 190(U14·D110·C66)·크레인 45 = 마감텔리 SUB TOTAL·동방 3호기 45대', p106.voy === 'R106W' && p106.total === 190 && deckN(p106, 'U') === 14 && deckN(p106, 'D') === 110 && deckN(p106, 'C') === 66 && p106.lolo === 45,
     `${p106.voy} ${p106.total} U${deckN(p106, 'U')} D${deckN(p106, 'D')} C${deckN(p106, 'C')} lolo${p106.lolo}`);
  ok('R106W 자리 표기 «D덱 1줄 15칸»·numbering bow·_fmt checker', p106._fmt === 'checker' && p106.decks.every((d) => d.numbering === 'bow') && p106.decks.some((d) => d.slots.some((s) => s.pos === 'D덱 1줄 15칸')));
  const s45 = p106.decks.flatMap((d) => d.slots).filter((s) => /^45/.test(s.iso));
  ok('45피트 4대(«<45>» 표식) · 40피트 규격 «40 HC» · 20피트 «20 GP»', s45.length === 4 && p106.decks.flatMap((d) => d.slots).some((s) => s.iso === '40 HC') && p106.decks.flatMap((d) => d.slots).some((s) => s.iso === '20 GP'), `45:${s45.length}`);
  const lug = p106.decks.flatMap((d) => d.slots).filter((s) => (s.flags || []).includes('LUG'));
  ok('수화물(L) 1대는 LUG 플래그', lug.length === 1, `${lug.length}`);
  const wb079 = readWb(fx('rzor_plan_R079W.xlsx'));
  const p079 = M.parseDeckPlanWorkbook(wb079, XLSX);
  ok('R079W(2026-07) 총계 194(U11·D104·C79) — 두 달 전 양식도 같은 파서', p079.voy === 'R079W' && p079.total === 194 && deckN(p079, 'U') === 11 && deckN(p079, 'D') === 104 && deckN(p079, 'C') === 79, `${p079.voy} ${p079.total}`);
  const wbR = readWb(fx('rzor_rzdf_R106E.xlsx'));
  ok('선사 rzdf 덱플랜은 검수사 양식이 아니다(오감지 없음)', !M.isCheckerPlanWorkbook(wbR));
  const pR = M.parseDeckPlanWorkbook(wbR, XLSX);
  ok('선사 rzdf R106E 종전대로 — 190대·갠트리 39·2단 16(D103·C73·B14)', pR.total === 190 && pR.lolo === 39 && pR.dbl === 16 && deckN(pR, 'D') === 103 && deckN(pR, 'C') === 73 && deckN(pR, 'B') === 14, `${pR.total} ${pR.lolo} ${pR.dbl}`);

  console.log('■ ② 자동 덱플랜 — RZOR_R106E 실데이터(선적 컨 191 · 동방 실적 189)');
  const F = JSON.parse(fs.readFileSync(fx('rzor_termwork_R106E.json'), 'utf8'));
  const gen = M.buildRzorLoadingDeckPlan({ containers: F.containers, termWork: F.termWork, bayWork: F.bayWork, assign: null, voy: 'R106W' });
  ok('실적 189대 전부 자리를 받는다(예측 189 · 빠진 것 0)', gen.seqN === 189 && gen.predN === 189 && gen.total === 189 && gen.unplaced.length === 0, `seq${gen.seqN} pred${gen.predN} total${gen.total} unplaced${gen.unplaced.length}`);
  ok('크레인 N 45(bayWork 22) · 크레인 45대 전부 D덱 10~15칸', gen.craneN === 45 && gen.lolo === 45 && gen.decks.find((d) => d.deck === 'D').slots.filter((s) => !s.empty && s.lolo).length === 45, `craneN${gen.craneN} lolo${gen.lolo}`);
  const twentyKeys = new Set(M.RZOR_PATH_TWENTY.map(([d, l, p]) => `${d}-${l}-${p}`));
  const twenty = gen.decks.flatMap((d) => d.slots.filter((s) => !s.empty && /^20/.test(s.iso)).map((s) => `${d.deck}-${s.line}-${s.col}`));
  ok('20피트는 20피트 길(U덱·D 6~9·16·C 13/23)에만', twenty.length === 32 && twenty.every((k) => twentyKeys.has(k)), `${twenty.length} ${twenty.filter((k) => !twentyKeys.has(k)).slice(0, 3)}`);
  ok('한 자리에 두 컨 없음(슬롯키 유일)', (() => { const seen = new Set(); for (const d of gen.decks) for (const s of d.slots) { if (s.empty) continue; const k = `${d.deck}-${s.ri}-${s.ci}`; if (seen.has(k)) return false; seen.add(k); } return true; })());
  ok('생성 플랜 표식 — _gen·numbering bow·예측 칸 pred:true', gen._gen === true && gen.decks.every((d) => d.numbering === 'bow') && gen.decks.flatMap((d) => d.slots).filter((s) => s.pred).length === 189);
  const seq = M.rzorLoadSequence(F.termWork);
  const cnCrane = seq.find((s) => s.bay === '22').cn;
  const slotOfCrane = gen.decks.find((d) => d.deck === 'D').slots.find((s) => s.cn === cnCrane);
  const key = slotOfCrane.key;
  const gen2 = M.buildRzorLoadingDeckPlan({ containers: F.containers, termWork: F.termWork, bayWork: F.bayWork, assign: { [key]: { cn: F.containers[5].cn, by: '검수원', at: 1 } }, voy: 'R106W' });
  const sure = gen2.decks.flatMap((d) => d.slots).filter((s) => s.sure);
  ok('확정 자리(assign) — 그 칸은 확정 컨, 밀려난 크레인 컨도 자리를 받는다(총 189 유지)', sure.length === 1 && sure[0].cn === F.containers[5].cn && gen2.total === 189 && gen2.unplaced.length === 0 && gen2.decks.flatMap((d) => d.slots).some((s) => s.cn === cnCrane && s.pred),
     `sure${sure.length} total${gen2.total} unplaced${gen2.unplaced.length}`);
  //  2차 시뮬 지적(2026-09-28) — 종전 «덱-ri-ci» 키는 40피트 두 칸(pos p, span 2)과 옆 칸(pos p+1)이 같은 키라 예측 55/189 칸을 확정하면 한 칸 옆에 놓였다.
  //  이제 키 = «덱-줄-위치». 예측 칸 전부를 그 키로 확정하면 같은 줄·같은 위치에 그대로 서야 한다.
  const allPred = gen.decks.flatMap((d) => d.slots.filter((s) => s.pred).map((s) => ({ key: s.key, cn: s.cn, line: s.line, pos: s.col, deck: d.deck })));
  const asgAll = {}; for (const s of allPred) asgAll[s.key] = { cn: s.cn, by: '검수원', at: 1 };
  const gen3 = M.buildRzorLoadingDeckPlan({ containers: F.containers, termWork: F.termWork, bayWork: F.bayWork, assign: asgAll, voy: 'R106W' });
  const moved = allPred.filter((p) => { const d = gen3.decks.find((x) => x.deck === p.deck); const s = d && d.slots.find((x) => x.cn === p.cn); return !(s && s.sure && s.line === p.line && s.col === p.pos && s.key === p.key); });
  ok('예측 189칸을 전부 그 키로 확정해도 줄·위치가 하나도 안 움직인다(한 키 = 한 자리)', moved.length === 0 && gen3.sureN === 189 && gen3.predN === 0 && gen3.lolo === 45, `움직인 것 ${moved.length} ${moved.slice(0, 3).map((m) => m.key)} sure${gen3.sureN} lolo${gen3.lolo}`);
  //  2차 시뮬 지적 둘째 — 확정 컨을 걷기에서 건너뛰면 구역 문턱이 어긋나 나머지 예측이 탭마다 움직였다(189경우 중 87, 최대 30대).
  const posOf = (g) => { const m = {}; for (const d of g.decks) for (const s of d.slots) if (!s.empty) m[s.cn] = s.key; return m; };
  const p0 = posOf(gen);
  let movedCases = 0, movedSum = 0;
  for (const [cn, k] of Object.entries(p0)) { const g = M.buildRzorLoadingDeckPlan({ containers: F.containers, termWork: F.termWork, bayWork: F.bayWork, assign: { [k]: { cn, by: 'x', at: 1 } }, voy: 'R106W' }); const p = posOf(g); let mv = 0; for (const [c2, k2] of Object.entries(p0)) if (p[c2] !== k2) mv++; if (mv) movedCases++; movedSum += mv; }
  ok('예측 컨 하나를 제 예측 자리에 확정해도 다른 예측은 안 움직인다(189경우 전부 이동 0)', movedCases === 0, `움직인 경우 ${movedCases} 이동 합 ${movedSum}`);
  let accAsg = {}, accSteps = 0;
  for (const [cn, k] of Object.entries(p0)) { accAsg[k] = { cn, by: 'x', at: 1 }; const g = M.buildRzorLoadingDeckPlan({ containers: F.containers, termWork: F.termWork, bayWork: F.bayWork, assign: { ...accAsg }, voy: 'R106W' }); const p = posOf(g); for (const [c2, k2] of Object.entries(p0)) if (p[c2] !== k2) { accSteps++; break; } }
  ok('순번대로 하나씩 누적 확정해도 189단계 내내 나머지 예측이 그대로다', accSteps === 0, `움직인 단계 ${accSteps}`);
  const keysAll = gen.decks.flatMap((d) => d.slots.map((s) => s.key));
  ok('한 덱 그림 안에서 자리 키(컨·빈자리)가 전부 다르고 칸이 겹치지 않는다', new Set(keysAll).size === keysAll.length && gen.decks.every((d) => { const cells = new Set(); for (const s of d.slots) for (let k = 0; k < s.span; k++) { const c = `${s.ri}-${s.ci + k}`; if (cells.has(c)) return false; cells.add(c); } return true; }), `keys ${keysAll.length}/${new Set(keysAll).size}`);
  ok('템플릿 291자리의 키가 전부 다르다(RZOR_DECK_SLOTS)', new Set(M.RZOR_DECK_SLOTS.map(([d, l, p]) => `${d}-${l}-${p}`)).size === M.RZOR_DECK_SLOTS.length && M.RZOR_DECK_SLOTS.length === 291, `${M.RZOR_DECK_SLOTS.length}`);
  const genBad = M.buildRzorLoadingDeckPlan({ containers: F.containers, termWork: F.termWork, bayWork: F.bayWork, assign: { 'D-0-10': { cn: cnCrane, by: 'x', at: 1 }, 'Q-9-9': { cn: F.containers[7].cn, by: 'x', at: 1 } }, voy: 'R106W' });
  ok('모르는 자리 키(옛 그림 좌표 D-0-10·Q-9-9)의 확정은 무시하고 그 컨은 예측으로 — 사라지지 않는다', genBad.badAssign.length === 2 && genBad.total === 189 && genBad.sureN === 0 && genBad.decks.flatMap((d) => d.slots).some((s) => s.cn === cnCrane && s.pred), `bad${genBad.badAssign.length} total${genBad.total}`);
  const twentySpan = gen.decks.flatMap((d) => d.slots).filter((s) => !s.empty && /^20/.test(s.iso) && s.span !== 1);
  ok('20피트는 늘 한 칸 · 40피트는 옆 위치가 비었을 때만 두 칸', twentySpan.length === 0 && gen.decks.flatMap((d) => d.slots).filter((s) => !s.empty && !/^20/.test(s.iso) && s.span === 2).length > 0, `20 span2: ${twentySpan.length}`);
  const gen0 = M.buildRzorLoadingDeckPlan({ containers: [], termWork: {}, bayWork: null, assign: null, voy: '' });
  ok('실적·컨이 없으면 예외 없이 빈 템플릿(291 빈자리·컨 0)', gen0.total === 0 && gen0.decks.reduce((a, d) => a + d.slots.length, 0) === 291 && gen0.unplaced.length === 0);
  ok('크레인 길 — N=45 → 7+8줄(D 10~12 는 1~7줄, 13~15 는 1~8줄) · N=36 → 5+7줄', (() => { const a = M.craneSlots(45), b = M.craneSlots(36); const rows = (arr, p) => new Set(arr.filter((x) => x[1] === p).map((x) => x[0])).size; return a.length === 45 && rows(a, 10) === 7 && rows(a, 13) === 8 && b.length === 36 && rows(b, 10) === 5 && rows(b, 13) === 7; })());

  console.log('■ ③ 엑셀 내보내기 — 마감텔리 양식으로 나가고, 같은 파서가 그대로 다시 읽는다');
  const wbX = M.buildCheckerPlanWorkbook(XLSX, { plan: p106, vsl: 'RIZHAO ORIENT', voy: 'R106W', date: '2026-09-28', inspector: '검수원' });
  const outX = path.join(TMP, 'export.xlsx');
  XLSX.writeFile(wbX, outX);
  const wbX2 = readWb(outX);
  ok('내보낸 파일이 검수사 양식으로 감지된다', M.isCheckerPlanWorkbook(wbX2) && M.isDeckPlanWorkbook(wbX2));
  const pX = M.parseDeckPlanWorkbook(wbX2, XLSX);
  const keyOf = (p) => { const m = {}; for (const d of p.decks) for (const s of d.slots) if (!s.empty) m[s.cn] = `${d.deck}|${s.line}|${s.col}|${s.iso}|${s.fe}|${(s.flags || []).join(',')}|${s.lolo ? 1 : 0}`; return m; };
  const A = keyOf(p106), Bk = keyOf(pX);
  const diff = Object.keys({ ...A, ...Bk }).filter((cn) => A[cn] !== Bk[cn]);
  ok('왕복 — 190대 컨·덱·줄·칸·규격·F/E·LUG·크레인 전부 같다', pX.total === 190 && pX.lolo === 45 && diff.length === 0, `total${pX.total} diff${diff.length} ${diff.slice(0, 3)}`);
  const ws1 = wb106.Sheets[wb106.SheetNames[0]], ws2 = wbX.Sheets['loading stowage plan'];
  const cellEq = (a) => String((ws1[a] || {}).v ?? '') === String((ws2[a] || {}).v ?? '');
  ok('셀 자리 실물과 같다 — Y1 제목·B2 항차·AK2 «C»·AN2 «- DECK»·D7=26·CA7=1·CC9=1·AW9 컨번호·AT9 «X»·AK51 «D»·AH100 «UNDER»', ['Y1', 'B2', 'AK2', 'AN2', 'D7', 'CA7', 'CC9', 'AW9', 'AT9', 'AK51', 'AH100', 'AN100', 'D105', 'CA147'].every(cellEq),
     ['Y1', 'B2', 'AK2', 'AN2', 'D7', 'CA7', 'CC9', 'AW9', 'AT9', 'AK51', 'AH100', 'AN100', 'D105', 'CA147'].filter((a) => !cellEq(a)).join(','));
  ok('블록 집계 — C덱 CONT 20\'=2·40\'=60·45\'=4·TTL 66 · D덱 TTL 110 · UNDER TTL 14', ws2.BR5.v === 2 && ws2.BU5.v === 60 && ws2.BX5.v === 4 && ws2.CA5.v === 66 && ws2.CA54.v === 110 && ws2.CA103.v === 14);
  //  무게 합 — 실물 2282.325t 에는 빈 섀시(C/S 4대 × 4t = 16t)가 들어 있다. 파서는 C/S 를 컨이 아니라 건너뛰므로 컨 무게 합 2266.323t 가 맞다.
  ok('맨 아래 집계 — F 55 · E 135 · TTL 190 · 컨 무게 합 2266.323t(실물 2282.325 − 빈 섀시 16t)', ws2.BZ150.v === 55 && ws2.BZ151.v === 135 && ws2.BZ152.v === 190 && Math.abs(ws2.AK153.v - 2266.323) < 0.01, `${ws2.BZ150 && ws2.BZ150.v} ${ws2.BZ151 && ws2.BZ151.v} ${ws2.BZ152 && ws2.BZ152.v} ${ws2.AK153 && ws2.AK153.v}`);
  const chs = p106.decks.find((d) => d.deck === 'D').slots.map((s) => s.chassis);
  ok('파서가 크기 코드(4·3·2·1)를 그대로 갖고 온다 — D덱 트윈 20피트 코드 2·1 이 각 6대', chs.filter((x) => x === 2).length === 6 && chs.filter((x) => x === 1).length === 6 && chs.filter((x) => x === 4).length === 94, `${JSON.stringify([2, 1, 4, 3].map((k) => chs.filter((x) => x === k).length))}`);
  ok('블록 CHASSIS 집계 — C덱 20\'=2·40\'=64 · D덱 20\'=4(단독만)·40\'=55(크레인 45 뺀 49 + 트윈 6, 빈 섀시 4는 컨이 아니라 못 셈)', ws2.AY5.v === 2 && ws2.BB5.v === 64 && ws2.AY54.v === 4 && ws2.BB54.v === 55, `${ws2.AY5 && ws2.AY5.v} ${ws2.BB5 && ws2.BB5.v} ${ws2.AY54 && ws2.AY54.v} ${ws2.BB54 && ws2.BB54.v}`);
  ok('Cont. 표 — 수화물 1대는 20\' D 에 안 세고 20 Lug 에만(실물 F 20\' 0 · 20 Lug 1 · TTL 55)', ws2.AS150.v === 0 && ws2.BT150.v === 1 && ws2.BZ150.v === 55 && ws2.AS152.v === 31);
  const wbG = M.buildCheckerPlanWorkbook(XLSX, { plan: gen2, vsl: 'RIZHAO ORIENT', voy: 'R106W', date: '2026-09-28', inspector: '검수원' });
  const outG = path.join(TMP, 'gen.xlsx');
  XLSX.writeFile(wbG, outG);
  const pG = M.parseDeckPlanWorkbook(readWb(outG), XLSX);
  const wsG = wbG.Sheets['loading stowage plan'];
  ok('생성 플랜(예측 188·확정 1)도 엑셀로 나가 189대가 다시 읽힌다 · 예측 안내문 있음', pG.total === 189 && pG.lolo === 45 && wsG.B154 && /회색 글씨 188대/.test(wsG.B154.v), `${pG.total} ${wsG.B154 && wsG.B154.v}`);
  ok('규격 표기 — F40\'H·E20\'D·F40\'R·E45\'H·F20\'L·E40\'F(플랫, R101W FBIU4020493)', M.checkerTypeOf({ iso: '40 HC', fe: 'F' }).txt === "F40'H" && M.checkerTypeOf({ iso: '20 GP', fe: 'E' }).txt === "E20'D" && M.checkerTypeOf({ iso: '40 RH', fe: 'F' }).txt === "F40'R" && M.checkerTypeOf({ iso: '45 HC', fe: 'E' }).txt === "E45'H" && M.checkerTypeOf({ iso: '20 GP', fe: 'F', flags: ['LUG'] }).txt === "F20'L" && M.checkerTypeOf({ iso: '40 FR', fe: 'E' }).txt === "E40'F");

  console.log('■ ④ 배선 — 화면·콘앱·매뉴얼·버전');
  const vp = src('src/pages/VoyagePage.jsx'), dv = src('src/components/DeckPlanView.jsx'), cone = src('public/cone.html'), help = src('src/data/helpData.js'), ut = src('src/utils.js');
  ok('VoyagePage — 생성 덱플랜(_rzorGen)을 만들고 LOLO 탭 DeckPlanView 에 _deckPlanEff 로 내린다', /buildRzorLoadingDeckPlan\(\{/.test(vp) && /plan=\{_deckPlanEff\}/.test(vp) && /const _deckPlanEff = _rzorGen \|\| voyage\?\.\[mode\]\?\.stowagePlan/.test(vp));
  ok('VoyagePage — 올린 덱플랜이 있으면 생성하지 않는다 · 선적만', /if \(mode !== 'loading'\) return null;/.test(vp) && /sec\.stowagePlan\.decks\.length\) return null;/.test(vp));
  ok('VoyagePage — 조회 병합은 확정 자리만 pos·lolo, 예측은 그대로(콘앱·현황 카드와 같은 답)', /if \(_gen\) return s\.sure \? \{ \.\.\.c, lolo: c\.lolo \|\| !!s\.lolo, pos: c\.pos \|\| s\.pos \|\| '' \} : c;/.test(vp));
  ok('VoyagePage — 업로드 관문: 검수사 STOWAGE PLAN 은 어느 탭이든 loading 노드 · 덱플랜인데 0대면 리스트로 안 흘림 · RZOR 판정에 RIZHAO 포함', /const _tgtMode = plan0\._fmt === 'checker' \? 'loading' : mode;/.test(vp) && /if \(_deckPlanStop\) continue;/.test(vp) && /\/RZOR\|RIZHAO\/i\.test\(`\$\{voyage\?\.info\?\.vsl \|\| ''\} \$\{voyageKey \|\| ''\}`\)/.test(vp));
  ok('콘앱 — 안내 줄이 grid 바깥(안에 넣으면 26칸이 한 칸씩 밀린다)', (() => { const i1 = cone.indexOf("검수사 양식 · 위치 1 = 선수(오른쪽)"); const i2 = cone.indexOf("display:grid;grid-template-columns:repeat('+maxCol+',minmax(52px,1fr))"); return i1 > 0 && i2 > i1; })());
  ok('파서 덱 순서 D·C·U(첫 탭이 D덱 크레인 구역)', p106.decks.map((d) => d.deck).join('') === 'DCU', p106.decks.map((d) => d.deck).join(''));
  ok('40피트 드라이(D)는 «F40\'D» 로 되돌아간다(H 로 바꾸지 않음)', M.checkerTypeOf({ iso: '40 GP', fe: 'F' }).txt === "F40'D" && M.checkerTypeOf({ iso: '40 HC', fe: 'F' }).txt === "F40'H");
  ok('VoyagePage — 엑셀 내보내기(onExport → exportCheckerPlanXlsx) 선적 탭에만', /onExport=\{mode === 'loading' && _deckPlanEff\?\.decks\?\.length \? \(\(pl\) => exportCheckerPlanXlsx\(\{/.test(vp));
  ok('VoyagePage — 업로드 관문이 «stowage|plan.xlsx» 파일명도 덱플랜 후보로 본다', /\/rzdf\|deck\|stowage\|plan\\\.xlsx\$\/i\.test\(file\.name\)/.test(vp));
  ok('DeckPlanView — 예측 칸 탭 = 확정(fbAssignDeckSlot) · 확정 칸 탭 = 해제 · 회색 점선 · 자리 키는 플랜의 key(덱-줄-위치) 먼저', /if \(s\.pred\)/.test(dv) && /fbAssignDeckSlot\(voyageKey, mode, slotKey, \{ cn: s\.cn/.test(dv) && /border-dashed border-amber-400/.test(dv) && /\?예측\(탭=확정\)/.test(dv) && (dv.match(/const slotKey = s\.key \|\| `\$\{d\.deck\}-\$\{s\.ri\}-\$\{s\.ci\}`;/g) || []).length === 2);
  ok('VoyagePage — 생성 플랜 머리 항차는 선적 항차(voy_l)', /voy: voyage\?\.info\?\.voy_l \|\| voyage\?\.info\?\.voy \|\| '' \}\);/.test(vp));
  ok('DeckPlanView — 검수사 양식 방향 안내 · STOWAGE PLAN 엑셀 단추 · 자리 못 받은 컨 경고', /1=선수 → 선미·램프쪽, 오른쪽이 선수/.test(dv) && /📄 STOWAGE PLAN 엑셀/.test(dv) && /plan\.unplaced/.test(dv));
  ok('콘앱 — numbering bow 면 칸을 뒤집어 그린다(오른쪽이 선수)', /const bow = dk\.numbering\s*===\s*'bow'/.test(cone) && /bow \? \(maxCol\s*-\s*gc\s*\+\s*1\) : gc/.test(cone));
  ok('매뉴얼 — RZOR 덱플랜 3.67 항목(업로드·예측·확정·엑셀)', /RZOR\(카페리\) 덱플랜\(3\.67\)/.test(help) && /STOWAGE PLAN 엑셀/.test(help) && /예측/.test(help.split('RZOR(카페리) 덱플랜(3.67)')[1] || ''));
  ok('버전 — TallyOne 3.67 · APP_NOTE 는 덱플랜 문구 · ConeOne 2.56', /APP_VERSION = 'TallyOne 3\.67'/.test(ut) && /APP_NOTE = '[^']*덱플랜[^']*'/.test(ut) && /__CONEV='ConeOne 2\.56'/.test(cone));

  console.log(`RZOR 선적 덱플랜 연막검사: ${n - bad}/${n} 통과`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ }
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✘ 연막검사 예외', e); process.exit(1); });
