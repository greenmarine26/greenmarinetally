// MFN 목록 4.59 연막검사 — 터미널 이동지시엔 있고 메일 양하 리스트엔 없는 컨 44대를 양하 유닛(278 = 234 + 44)에 합치고, 표식·주의 박스·마감텔리·목록 출력·엑셀을 실스냅샷으로 잰다
//   실행 — node tools/smoke_mfn.cjs <repoRoot>. 실자료 — MCSN 642N(tools/fixtures/mfn458_mcsn642n.json = 라이브 GET 사본 + MOVINS 로 만든 mfnList 44대). 실 Firebase 쓰기 없음.
//   검수사 2026-10-31 «278로 표기 바랍니다 단 44대가 MFN대상이라는것도 278(234+MFN44)» · «MFN표기를 누르면 엑셀또는 PDF로 출력»
const path = require('path'); const fs = require('fs'); const esbuild = require('esbuild');
const ROOT = process.argv[2] || path.join(__dirname, '..');
let bad = 0, n = 0;
const ok = (c, m, d = '') => { n += 1; console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || !d ? '' : ' — ' + String(d).slice(0, 300))); if (!c) bad += 1; };
const STUB = fs.readFileSync(path.join(__dirname, 'smoke_bayfirst.cjs'), 'utf8').match(/const stub = '([^']*)'/)[1];
const clone = (o) => JSON.parse(JSON.stringify(o));
(async () => {
  const entry = [
    "export { ptkDischargeUnitsOf, ptkDischargeJudgeOf, markDischargeUnit, dischargeUnitBareRow, applyDischargeUnits, progressOf, mfnNote, mfnItemsOf, MFN_LABEL, mfnChinaWarn } from './src/utils.js';",
    "export { mfnListRows, mfnTally, mfnCounts, mfnPackOf, generateMfnListHTML, mfnSumLine, generateMfnFieldHTML, mfnFieldLayout, mfnChiefView, openMfnList } from './src/mfnList.js';",
    "export { STAFF_LIST } from './src/staffList.js';",
    "export { reconcileSources } from './src/sourceRecon.js';",
    "export { ptkContainers, buildOS } from './src/tallyReport.js';",
    "export { generateMfnExcel, generateMfnFieldExcel, generateTallyExcel } from './src/tallyExcel.js';",
    "export { computeTallyData, buildSealList } from './src/tallyReport.js';",
    "export { runDiagnostics } from './src/diagnostics.js';",
  ].join('\n');
  const code = (await esbuild.build({
    stdin: { contents: entry, resolveDir: ROOT, loader: 'js' }, bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent', loader: { '.js': 'jsx' }, jsx: 'automatic',
    plugins: [{ name: 'fb', setup(b) { b.onResolve({ filter: /^firebase\// }, (a) => ({ path: a.path, namespace: 'fb' })); b.onLoad({ filter: /.*/, namespace: 'fb' }, () => ({ contents: STUB, loader: 'js' })); } }],
  })).outputFiles[0].text;
  global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
  const m = { exports: {} }; new Function('module', 'exports', 'require', code)(m, m.exports, require);
  const M = m.exports;
  const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/mfn458_mcsn642n.json'), 'utf8'));
  const VK = 'MCSN_642N';
  const withMfn = () => ({ key: VK, ...clone(FX) });
  const noMfn = () => { const v = withMfn(); delete v.discharge.mfnList; return v; };
  const mfnCns = Object.keys(FX.discharge.mfnList.items);

  console.log('① 양하 유닛 — 278 = 리스트 234 + MFN 44');
  const U0 = M.ptkDischargeUnitsOf(noMfn()), U1 = M.ptkDischargeUnitsOf(withMfn());
  ok(U0.set.size === 234 && U0.mfn.size === 0, 'mfnList 가 없으면 종전과 같다(234 · mfn 빈 집합)', U0.set.size + '/' + U0.mfn.size);
  ok(U1.set.size === 278 && U1.mfn.size === 44, 'mfnList 가 있으면 278 · MFN 44', U1.set.size + '/' + U1.mfn.size);
  ok(U1.extra.size === U0.extra.size && U1.listSet.size === U0.listSet.size && [...U1.mfn].every((cn) => !U1.extra.has(cn) && !U1.listSet.has(cn)), '추가분(extra)·목록(listSet)은 그대로 — MFN 은 따로');
  ok(U1.basis === U0.basis && U1.basis === 'customs', '기준(basis)은 그대로 customs');
  const items = Object.values(FX.discharge.mfnList.items);
  const china = items.filter((i) => /^CN/.test(i.dest)), ptk = items.filter((i) => i.dest === 'KRPTK'), reload = items.filter((i) => i.reload);
  ok(china.length === 34 && ptk.length === 10 && reload.length === 1 && reload[0].cn === 'SUDU7733400', '픽스처 구성 — 중국행 34 · 평택행 10 · 재적재 1(SUDU7733400)', [china.length, ptk.length, reload.length].join());
  //  제외 규칙 — 시프팅·평택 아닌 POD 선택·이미 목록에 있는 컨은 더하지 않는다
  const k = mfnCns[0], k2 = mfnCns[1], k3 = mfnCns[2];
  const vShift = withMfn();
  const Us = M.ptkDischargeUnitsOf(vShift, new Set([k]));
  ok(!Us.mfn.has(k) && !Us.set.has(k) && Us.mfn.size === 43 && Us.set.size === 277, '시프팅인 MFN 컨은 더하지 않는다(277)');
  const vPick = withMfn(); vPick.discharge.records[k2] = { cn: k2, pod_pick: 'x', pod: 'CNDLC', iso: '45G1', _source: 'x.xls' };
  const Up = M.ptkDischargeUnitsOf(vPick);
  ok(!Up.set.has(k2) && !Up.mfn.has(k2) && !Up.extra.has(k2) && Up.set.size === 277, '평택 아닌 POD 를 고른 컨은 더하지 않는다(MFN 에도 추가분에도 안 든다 · 277)', 'set=' + Up.set.size);
  const vIn = withMfn(); const listed = Object.keys(FX.discharge.records)[0]; vIn.discharge.mfnList.items[listed] = { cn: listed, iso: '45G1', fe: 'F', pol: 'X', pod: 'KRPTK', dest: 'CNDLC' };
  const Ui = M.ptkDischargeUnitsOf(vIn);
  ok(!Ui.mfn.has(listed) && Ui.set.size === 278, '이미 목록에 있는 컨은 MFN 이 아니다(278 그대로)');
  const vDone = withMfn(); vDone.discharge.completed = { [k3]: { at: 1 } };
  const Ud = M.ptkDischargeUnitsOf(vDone);
  ok(Ud.mfn.has(k3) && !Ud.extra.has(k3) && Ud.set.size === 278 && Ud.mfn.size === 44, '완료 기록이 생겨도 MFN 은 MFN 이다(추가분이 아니다) · 수는 278 · MFN 44');
  //  4.58 감사 수리 — 터미널은 278대를 모두 내리므로 작업이 진행돼도 MFN 표시·대수·OS-IN OVER 가 줄면 안 된다. MFN 44 중 20대에 실적(termWork) 10 · 완료(completed) 10.
  const vWork = withMfn();
  vWork.discharge.termWork = Object.assign({}, vWork.discharge.termWork || {}); vWork.discharge.completed = Object.assign({}, vWork.discharge.completed || {});
  mfnCns.slice(0, 10).forEach((cn) => { vWork.discharge.termWork[cn] = { at: 1, by: 'T' }; });
  mfnCns.slice(10, 20).forEach((cn) => { vWork.discharge.completed[cn] = { at: 2, by: '검수' }; });
  const trueExtra = 'ZZZU9999990';   // 진짜 리스트에도 MFN 에도 없는 컨 — 4.20 추가분은 종전처럼 extra
  vWork.discharge.completed[trueExtra] = { at: 3, by: '검수' };
  vWork.discharge.ediContainers = Object.assign({}, vWork.discharge.ediContainers || {}, { [trueExtra]: { cn: trueExtra, pod: 'KRPTK', iso: '45G1', fe: 'F' } });
  const Uw = M.ptkDischargeUnitsOf(vWork);
  ok(Uw.mfn.size === 44 && mfnCns.slice(0, 20).every((cn) => Uw.mfn.has(cn) && !Uw.extra.has(cn)) && Uw.set.size === 279 && Uw.extra.size === 1 && Uw.extra.has(trueExtra), '실적 10 · 완료 10 이 생겨도 MFN 44 그대로 · 추가분(extra)은 진짜 추가분 1대만(총 279 = 278 + 추가분 1)', Uw.mfn.size + '/' + Uw.extra.size + '/' + Uw.set.size);
  const vWork2 = withMfn(); vWork2.discharge.termWork = vWork.discharge.termWork; vWork2.discharge.completed = Object.assign({}, FX.discharge.completed || {}); mfnCns.slice(10, 20).forEach((cn) => { vWork2.discharge.completed[cn] = { at: 2, by: '검수' }; });
  const Uw2 = M.ptkDischargeUnitsOf(vWork2);
  const pw = M.progressOf(vWork2.discharge, 'discharge', new Set(), null, vWork2.keepOnboard);
  ok(Uw2.set.size === 278 && Uw2.mfn.size === 44 && Uw2.extra.size === 0 && pw.ptk.total === 278 && pw.mfnN === 44, '진행 중 — set 278 · mfn 44 · extra 0 · progressOf.mfnN 44 · 총계 278 불변', Uw2.set.size + '/' + Uw2.mfn.size + '/' + Uw2.extra.size + '/' + pw.ptk.total + '/' + pw.mfnN);
  ok(M.mfnNote(pw.mfnN, pw.ptk.total) === '(리스트 234 + MFN 44)', '홈 카드 문구 — «(리스트 234 + MFN 44)» 그대로', M.mfnNote(pw.mfnN, pw.ptk.total));
  const Tw = M.ptkContainers(vWork2, 'discharge');
  const Bw = M.buildOS(Tw, vWork2.discharge.completed || {}, 'discharge', { ops: [], ports: [], damage: null, shifting: true, performance: true, _unknown: true });
  const sw = Bw.rows.reduce((a, r) => ({ man: a.man + r.manifested, over: a.over + (r.over || 0) }), { man: 0, over: 0 });
  ok(Tw.length === 278 && Tw.filter((c) => c._mfn).length === 44 && sw.man === 234 && sw.over === 44, '진행 중 OS-IN — MANIFESTED 234 · OVER 44 유지(MFN 이 추가분으로 새지 않는다)', JSON.stringify(sw) + ' rows=' + Tw.length);
  const vSame = withMfn(); const beforeJ = JSON.stringify(vSame);
  M.ptkDischargeUnitsOf(vSame); M.ptkDischargeJudgeOf(vSame); M.progressOf(vSame.discharge, 'discharge', new Set(), null, vSame.keepOnboard); M.ptkContainers(vSame, 'discharge'); M.mfnPackOf(vSame.discharge.mfnList, VK, vSame.info, vSame);
  ok(JSON.stringify(vSame) === beforeJ, '입력 항차를 바꾸지 않는다(같은 객체를 함수에 넣고 전·후 JSON 비교)');
  //  재감사 수리 — 머스크 개정 리스트로 MFN 44대가 리스트(records)에 들어간 642N(오늘 09:26 실제): 표시·출력도 U.mfn 기준이라 MFN 이 사라진다.
  const vRev = withMfn();
  mfnCns.forEach((cn) => { vRev.discharge.records[cn] = { _customs: true, cn, iso: FX.discharge.mfnList.items[cn].iso || '45G1', fe: 'E', pod: 'KRPTK', pol: FX.discharge.mfnList.items[cn].pol, _source: 'rev.xls', op: 'MAE' }; });
  const Ur = M.ptkDischargeUnitsOf(vRev);
  ok(Ur.set.size === 278 && Ur.mfn.size === 0 && Ur.listSet.size === 278, '개정 리스트로 MFN 44 가 records 에 들어가면 set 278 · mfn 0(리스트 278)', Ur.set.size + '/' + Ur.mfn.size);
  const packR = M.mfnPackOf(vRev.discharge.mfnList, VK, vRev.info, vRev);
  const htmlR = M.generateMfnListHTML(packR.rows, packR.head), fldR = M.generateMfnFieldHTML(packR.rows, packR.head);
  ok(packR.rows.length === 0 && !/MFN 44/.test(M.mfnSumLine(packR.head, packR.rows.length)) && !/MFN 44/.test(htmlR) && !/MFN 44/.test(fldR), '개정 뒤 출력 — 행 0 · 머리 문구에 «MFN 44» 없음', packR.rows.length + ' · ' + M.mfnSumLine(packR.head, 0));
  const modalSrc = fs.readFileSync(path.join(__dirname, '../src/components/ContainerDetailModal.jsx'), 'utf8');
  ok(/_mfnU\.mfn\.has\(c\.cn\)/.test(modalSrc) && /_mfnU\.basis !== 'edi'/.test(modalSrc) && /const _mfnIt = _mfnRaw \|\| \([^\n]*!_mfnItems \|\| _mfnU\.mfn\.has\(c\.cn\)/.test(modalSrc), '컨 상세 MFN 상자·배지는 U.mfn 에 든 컨만(배선 — 리스트에 들어간 컨은 상자 없음 · 표식 _mfn 도 U.mfn 기준)');
  ok(mfnCns.every((cn) => !Ur.mfn.has(cn) && !M.markDischargeUnit({ cn }, Ur) ._mfn), '개정 뒤 컨 표식 — 44대 모두 _mfn 없음(상자 조건 거짓)');

  console.log('② 표식 — markDischargeUnit · dischargeUnitBareRow');
  const china1 = items.find((i) => i.dest === 'CNDLC'), ptk1 = ptk[0], rel = reload[0];
  const mk = (cn) => M.markDischargeUnit({ ...M.dischargeUnitBareRow(withMfn(), cn), cn }, U1);
  const c1 = mk(china1.cn), c2 = mk(ptk1.cn), c3 = mk(rel.cn);
  ok(c1._mfn === true && c1._mfnChina === true && c1._mfnDest === 'CNDLC' && c1._mfnReload === false, '중국행(다롄) — _mfn · _mfnChina · _mfnDest', JSON.stringify(c1));
  ok(c2._mfn === true && !c2._mfnChina && c2._mfnDest === 'KRPTK', '평택행 — _mfn 만(_mfnChina 없음)');
  ok(c3._mfn === true && c3._mfnChina === true && c3._mfnDest === 'CNTXG' && c3._mfnReload === true && c3._mfnHan === 'DIS', '재적재(톈진행) — _mfnReload · _mfnHan DIS');
  ok(c1.iso === china1.iso && c1.fe === china1.fe && c1.pol === china1.pol && c1.wt === china1.wt && !('op' in c1), '맨 행은 목록의 규격·F/E·출발지·중량만 싣는다(선사는 지어내지 않는다)');
  const normal = Object.keys(FX.discharge.records)[0];
  const cn0 = M.markDischargeUnit({ cn: normal, iso: '45G1' }, U1);
  ok(!cn0._mfn && !cn0._mfnChina, '일반 컨에는 MFN 표식이 없다');
  ok(M.mfnNote(44, 278) === '(리스트 234 + MFN 44)' && M.mfnNote(0, 234) === '', 'mfnNote — «(리스트 234 + MFN 44)» · 없으면 빈 글');

  console.log('③ 소비처 — 홈 카드·마감텔리·미르 재료');
  const pg = (v, ss) => M.progressOf(v.discharge, 'discharge', ss || new Set(), null, v.keepOnboard);
  const P0 = pg(noMfn()), P1 = pg(withMfn());
  ok(P0.ptk.total === 234 && P1.ptk.total === 278 && P1.mfnN === 44 && P0.mfnN === 0, '홈 카드 progressOf — 총계 234 → 278 · MFN 44', [P0.ptk.total, P1.ptk.total, P1.mfnN].join());
  ok(P1.ptk.done === P0.ptk.done, '완료 수는 그대로(MFN 은 아직 안 내림)', P0.ptk.done + '/' + P1.ptk.done);
  const T0 = M.ptkContainers(noMfn(), 'discharge'), T1 = M.ptkContainers(withMfn(), 'discharge');
  ok(T0.length === 234 && T1.length === 278, '마감텔리 모집단 ptkContainers — 234 → 278', T0.length + '→' + T1.length);
  ok(T1.filter((c) => c._mfn).length === 44 && T1.filter((c) => c._mfnChina).length === 34, '마감텔리 행에 MFN 44 · 중국행 34 표식');
  ok(T1.filter((c) => c._mfn).every((c) => c.iso && c.fe), 'MFN 행도 규격·F/E 가 있어 규격별 집계에 든다');
  const J = M.ptkDischargeJudgeOf(withMfn());
  ok(J.cns && J.cns.length === 278 && J.pred({ cn: mfnCns[0] }), '미르·수석 답 재료 ptkDischargeJudgeOf — 278 · MFN 컨 참');
  const voyForCone = { ...clone(FX), key: VK };
  const rows0 = [{ cn: normal, _mode: 'discharge' }];
  const A = M.applyDischargeUnits(rows0, voyForCone, new Set());
  ok(A.rows.length === 278, '콘앱 미르 applyDischargeUnits — 행 없는 유닛(MFN 44)도 행으로 붙는다', A.rows.length);
  ok(A.rows.filter((r) => r._mfn).length === 44 && A.rows.filter((r) => r._mfn).every((r) => r._ptk && r._mode === 'discharge'), '붙은 MFN 행 44 — _ptk · _mode 양하');

  console.log('③-2 OS-IN(과부족) — MANIFESTED 234 · DISCHARGED 278 · OVER 44');
  const osSum = (os) => os.rows.reduce((a, r) => ({ man: a.man + r.manifested, over: a.over + (r.over || 0), short: a.short + r.short, dis: a.dis + r.manifested - r.short + (r.over || 0) }), { man: 0, over: 0, short: 0, dis: 0 });
  const BO = M.buildOS(T0, FX.discharge.completed || {}, 'discharge', { ops: [], ports: [], damage: null, shifting: true, performance: true, _unknown: true }), BN = M.buildOS(T1, FX.discharge.completed || {}, 'discharge', { ops: [], ports: [], damage: null, shifting: true, performance: true, _unknown: true });
  const s0 = osSum(BO), s1 = osSum(BN);
  ok(s0.man === 234 && s0.over === 0 && s0.dis === 234, 'MFN 없을 때 OS-IN — 234 · OVER 0', JSON.stringify(s0));
  ok(s1.man === 234 && s1.over === 44 && s1.dis === 278 && s1.short === 0, 'MFN 있을 때 OS-IN — MANIFESTED 234 · DISCHARGED 278 · OVER 44(이중 계산 없음)', JSON.stringify(s1));
  ok(BN.rows.filter((r) => r.over).every((r) => r.fe === 'EMPTY'), 'OVER 는 엠티 줄에만(44대 전부 엠티)');
  ok(BN.rows.reduce((a, r) => a + r.over, 0) === T1.filter((c) => c._mfn).length, 'OVER 합 = MFN 행 수 — 한 번만');
  console.log('④ 주의 박스 — 자료별 대조 MFN 그룹');
  const R0 = M.reconcileSources(noMfn(), 'discharge', { voyageKey: VK }), R1 = M.reconcileSources(withMfn(), 'discharge', { voyageKey: VK });
  ok(R0.mfn === null && R0.app === 234, 'mfnList 가 없으면 MFN 그룹 없음 · 앱 234');
  ok(R1.mfn && R1.mfn.n === 44 && R1.mfn.china === 34 && R1.mfn.ptk === 10 && R1.mfn.reload === 1 && R1.mfn.listN === 234 && R1.app === 278, 'MFN 그룹 44 — 중국행 34 · 평택행 10 · 재적재 1 · 리스트 234 · 앱 278', JSON.stringify({ n: R1.mfn && R1.mfn.n, a: R1.app }));
  ok(R1.mfn.items.length === 44 && R1.mfn.items.filter((x) => /주의 — 원래 목적지 (다롄|톈진)/.test(x.tag)).length === 34, '컨 줄 꼬리표 — 중국행 34 에 «주의 — 원래 목적지 다롄/톈진(통과화물이었음)»');
  ok(R1.mfn.items.find((x) => x.cn === 'SUDU7733400').tag.includes('재적재'), '재적재 꼬리표');
  ok(R1.total === R0.total && R1.explained === R0.explained && R0.unknown === 44 && R1.unknown === 0, '어긋남 수·후보는 그대로 · 종전 «번호 없음 44» 는 MFN 합산으로 0 이 된다', JSON.stringify([R0.total, R1.total, R0.unknown, R1.unknown]));
  ok(R1.gap === R1.app - R1.term.n && R1.term.n === 278 && R1.gap === 0, '터미널 배정 278 = 앱 278(차이 0)', JSON.stringify([R1.term, R1.gap]));
  ok(R0.gap === -44, 'MFN 없이는 앱 234 − 터미널 278 = -44(종전의 «번호 없음 44» 흔들림이 이것)', R0.gap);
  const D1 = M.runDiagnostics({ ediContainers: withMfn().discharge.ediContainers, listRecords: withMfn().discharge.records, mode: 'discharge', voyage: withMfn(), voyageKey: VK }) || [];
  const al = (Array.isArray(D1) ? D1 : D1.alerts || []).find((a) => a.code === 'source_recon');
  ok(al && /MFN 44대/.test(al.msg) && /중국행 34대 주의/.test(al.msg) && /리스트 234 \+ MFN 44/.test(al.msg), '진단 알림 한 줄에 MFN 44 · 중국행 34 · 리스트 234 + MFN 44', al && al.msg);
  ok(al && al.level === 'warning' && al.count === 0, '중국행이 있어 경고 · 어긋남 개수(count)에는 안 섞임', al && (al.level + '/' + al.count));

  console.log('⑤ 목록 출력 — 행·집계·HTML');
  const pack = M.mfnPackOf(FX.discharge.mfnList, VK, Object.assign({ vsl: 'MCSN', vslFull: 'SPIL NIKEN', voy_d: '642N' }, { planDate: FX.info.planDate }));
  ok(pack.rows.length === 44 && pack.head.code === 'MCSN' && pack.head.voy === '642N' && pack.head.ptk === 278 && pack.head.list === 234, '행 44 · 머리(선박코드 MCSN · 항차 642N · 278 · 234)', JSON.stringify(pack.head));
  const t = M.mfnTally(pack.rows);
  ok(t.total === 44 && t.f20 + t.e20 + t.f40 + t.e40 + t.unknown === 44, '규격별 집계 합 = 44', JSON.stringify(t));
  const cnt = M.mfnCounts(pack.rows);
  ok(cnt.china === 34 && cnt.ptk === 10 && cnt.reload === 1, '중국행 34 · 평택행 10 · 재적재 1');
  ok(pack.rows.find((r) => r.cn === 'SUDU7733400').remark === 'MFN / 톈진행(통과화물) 주의 / 재적재' && pack.rows.find((r) => r.cn === china1.cn).remark === 'MFN / 다롄행(통과화물) 주의' && pack.rows.find((r) => r.cn === ptk1.cn).remark === 'MFN', 'REMARK — 다롄행(통과화물) 주의 · 톈진행 + 재적재 · 평택행은 «MFN» 만');
  ok(M.mfnSumLine(pack.head, 44) === '터미널 278 = 리스트 234 + MFN 44', '합계 옆 한 줄');
  const html = M.generateMfnListHTML(pack.rows, pack.head);
  ok(!html.includes('`') && (html.match(/<tr/g) || []).length >= 44 + 1 + 4 && /GREEN MARINE CO\., LTD\./.test(html) && /MFN LIST/.test(html) && /CHIEF CHECKER/.test(html) && /CHIEF OFFICER/.test(html) && /window\.print/.test(html) && /__exportMfnXlsx/.test(html), 'HTML — 백틱 없음 · 머리·제목·서명줄 · PDF 저장/인쇄 · 엑셀 저장');
  ok(/MANIFESTED 234 · DISCHARGED 278 · OVER 44/.test(html) && /터미널 278 = 리스트 234 \+ MFN 44/.test(html), 'HTML 합계 줄 — OS-IN 말(MANIFESTED 234 · DISCHARGED 278 · OVER 44)');

  console.log('⑥ 엑셀 — 마감텔리 양식');
  const X = await M.generateMfnExcel(pack.rows, pack.head, { download: false });
  ok(X && X.buf && X.buf.byteLength > 3000, '엑셀 버퍼 생성 오류 없음', X && X.buf && X.buf.byteLength);
  ok(X.fname === 'MCSN 642N PTK MFN LIST.xlsx', '파일명 «선박코드 항차 PTK MFN LIST.xlsx»', X.fname);
  const ExcelJS = require(path.join(__dirname, '..', 'node_modules/exceljs'));
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(X.buf);
  const ws = wb.getWorksheet('MFN LIST');
  ok(ws && ws.getCell('A1').value.includes('GREEN') && ws.getCell('A2').value === 'PYEONGTAEK, KOREA' && /MFN LIST/.test(ws.getCell('A3').value), '시트 머리 — A1 회사 · A2 도시 · A3 제목');
  ok(/MCSN|SPIL/.test(ws.getCell('A5').value) && /642N/.test(ws.getCell('H5').value), 'M/V · VOY');
  ok(['NO', "CON'T NO", 'TYPE', 'F/E', 'W/T', 'POL', '선명·항차', '입항(양하)일', 'POD(터미널)', '원래 POD(Baplie)', '재적재', 'REMARKS'].every((h, i) => ws.getRow(8).getCell(i + 1).value === h), '머리글 열 12개(세관 신고용 — POL · 선명·항차 · 입항일 포함)');
  let rowsN = 0; for (let r = 9; r < 9 + 60; r += 1) { if (ws.getRow(r).getCell(2).value && /^[A-Z]{4}\d{7}$/.test(String(ws.getRow(r).getCell(2).value))) rowsN += 1; }
  ok(rowsN === 44, '컨 줄 44', rowsN);
  const f = ws.getCell('B9'); ok(f.font && f.font.name === 'Arial' && f.font.size === 10 && f.alignment.horizontal === 'center' && f.border.top.style === 'thin', '본문 Arial 10 · 가운데 · 얇은 테두리');
  let hasSig = false, hasSum = false, hasTotal = false; ws.eachRow((row) => row.eachCell((c) => { const v = String(c.value || ''); if (v === 'CHIEF CHECKER' || v === 'CHIEF OFFICER') hasSig = true; if (/터미널 278 = 리스트 234 \+ MFN 44/.test(v)) hasSum = true; if (v === 'TOTAL') hasTotal = true; }));
  ok(hasSig && hasSum && hasTotal, '아래 — 규격별 집계 TOTAL · «터미널 278 = 리스트 234 + MFN 44» · 서명줄');


  console.log('⑧ 수석 마감텔리 엑셀 — generateTallyExcel 을 실제로 돌려 시트에서 다시 읽는다(틀 채우기 · 폴백 두 길)');
  const ExcelJS2 = require(path.join(__dirname, '..', 'node_modules/exceljs'));
  const readBook = async (buf) => { const w = new ExcelJS2.Workbook(); await w.xlsx.load(buf); return w; };
  const txt = (v) => (v && typeof v === 'object' ? (v.richText ? v.richText.map((t) => t.text).join('') : (v.result != null ? String(v.result) : (v.text || ''))) : String(v == null ? '' : v));
  const scan = (ws, re) => { const hit = []; ws.eachRow((row, rn) => row.eachCell((c, cn) => { if (re.test(txt(c.value))) hit.push([rn, cn, txt(c.value)]); })); return hit; };
  const numAt = (ws, rn, cn) => { const v = ws.getRow(rn).getCell(cn).value; const x = v && typeof v === 'object' && 'result' in v ? v.result : v; return typeof x === 'number' ? x : (x == null ? null : x); };
  const checkBook = async (label, withM, buf, expectMfn) => {
    const wb2 = await readBook(buf);
    const names = wb2.worksheets.map((w) => w.name);
    const fw = wb2.worksheets.find((w) => /final/i.test(w.name));
    const os = wb2.worksheets.find((w) => /^OS.?IN/i.test(w.name)) || wb2.worksheets.find((w) => /^OS/i.test(w.name));
    const sealWs = wb2.worksheets.find((w) => /seal|act/i.test(w.name));
    ok(!!fw && !!os && !!sealWs, label + ' 시트 구성 — Final Work · OS-IN · Act. Cntr-Seal', names.join('|'));
    const dis = scan(fw, /DISCH\s*\(\s*\d+\s*\)/);
    ok(dis.length > 0 && new RegExp('\\(\\s*' + (expectMfn ? 278 : 234) + '\\s*\\)').test(dis[0][2]), label + ' Final Work 양하 합계 ' + (expectMfn ? 278 : 234), dis.map((x) => x[2]).join(','));
    const tot = scan(os, /T\s*O\s*T\s*A\s*L/);
    const tr = tot.length ? tot[0][0] : 0;
    const man = numAt(os, tr, 8), disc = numAt(os, tr, 10), over = numAt(os, tr, 11);
    ok(man === 234 && disc === (expectMfn ? 278 : 234) && (expectMfn ? over === 44 : (over === 'NIL' || over == null)), label + ' OS-IN 합계 — MANIFESTED 234 · DISCHARGED ' + (expectMfn ? '278 · OVER 44' : '234 · OVER NIL'), JSON.stringify({ tr, man, disc, over }));
    const mfnRows = scan(sealWs, /^MFN/);
    ok(mfnRows.length === (expectMfn ? 44 : 0), label + ' Act. Cntr-Seal 에 MFN 줄 ' + (expectMfn ? 44 : 0), mfnRows.length);
    if (expectMfn) {
      ok(scan(sealWs, /^MFN·(다롄|톈진)행 주의/).length === 34 && scan(sealWs, /^MFN \(화물 있으나 적하목록 없음\)/).length === 10, label + ' 비고 — 중국행 34 «MFN·다롄행/톈진행 주의» · 평택행 10 «MFN (…)»');
      const emptyRows = []; os.eachRow((row, rn) => { if (/EMPTY/i.test(txt(row.getCell(5).value)) && Number(numAt(os, rn, 11)) > 0) emptyRows.push(rn); });
      ok(emptyRows.length >= 1 && emptyRows.every((rn) => /MFN x \d+/.test(txt(os.getRow(rn).getCell(13).value))), label + ' OS-IN OVER 줄은 엠티 규격별 행 · 비고 «MFN x n»', emptyRows.length);
    }
    return wb2;
  };
  const cwd0 = process.cwd();
  const runGen = async (v, inRepo) => {
    process.chdir(inRepo ? ROOT : require('os').tmpdir());
    const doc0 = global.document; delete global.document;   // 노드에서는 틀을 디스크(public/tally_templates)에서 읽는다 — document 가 있으면 브라우저 fetch 길로 가 버린다
    try { const D = M.computeTallyData(v); return await M.generateTallyExcel(D, { download: false }); } finally { global.document = doc0; process.chdir(cwd0); }
  };
  const gT = await runGen(withMfn(), true);
  ok(gT && gT.buf && gT.buf.byteLength > 5000 && !/템플릿 실패/.test(gT.note || ''), '틀 채우기 길 — 생성 성공(템플릿 실패 아님)', gT && gT.note);
  await checkBook('[틀]', true, gT.buf, true);
  const gT0 = await runGen(noMfn(), true);
  await checkBook('[틀·MFN 없음]', false, gT0.buf, false);
  const gF = await runGen(withMfn(), false);
  ok(gF && gF.buf && /템플릿 실패/.test(gF.note || ''), '폴백 길 — 틀을 못 읽게 해 표준 서식 드로잉으로 생성', gF && gF.note);
  await checkBook('[폴백]', true, gF.buf, true);
  const gF0 = await runGen(noMfn(), false);
  await checkBook('[폴백·MFN 없음]', false, gF0.buf, false);
  const qCount = async (buf) => { const w = await readBook(buf); let n = 0; w.worksheets.forEach((sh) => sh.eachRow((row) => row.eachCell((c) => { if (txt(c.value).includes('???')) n += 1; }))); return n; };
  const qM = await qCount(gT.buf), q0 = await qCount(gT0.buf), qFM = await qCount(gF.buf), qF0 = await qCount(gF0.buf);
  ok(qM === q0 && qFM === qF0, '마감텔리에 MFN 때문에 생기는 «???» 가 없다 — 선사 이름표는 «MFN»(MFN 있을 때 ??? 셀 수 = 없을 때: 틀 ' + qM + '/' + q0 + ' · 폴백 ' + qFM + '/' + qF0 + ')');
  const wbQ = await readBook(gT.buf); let mfnTag = 0; wbQ.worksheets.forEach((sh) => sh.eachRow((row) => row.eachCell((c) => { if (/^MFN$/.test(txt(c.value).trim())) mfnTag += 1; })));
  ok(mfnTag >= 1, 'Final Work 선사 칸에 «MFN» 묶음 이름표가 있다', mfnTag);
  const packV = M.mfnPackOf(FX.discharge.mfnList, VK, FX.info, withMfn());
  const packV2 = M.mfnPackOf(Object.assign({}, FX.discharge.mfnList, { ptk: 999, list: 111 }), VK, FX.info, withMfn());
  ok(packV.head.ptk === 278 && packV.head.list === 234 && packV2.head.ptk === 278 && packV2.head.list === 234 && M.mfnSumLine(packV2.head, 44) === '터미널 278 = 리스트 234 + MFN 44', '출력 머리의 278 · 234 는 앱이 지금 계산한 값(수집기 스냅샷이 틀려도 앱 값)', packV2.head.ptk + '/' + packV2.head.list);
  try { fs.mkdirSync('/mnt/user-data/outputs', { recursive: true }); fs.writeFileSync('/mnt/user-data/outputs/MCSN_642N_TALLY_REPORT_sample.xlsx', Buffer.from(gT.buf)); fs.writeFileSync('/mnt/user-data/outputs/MCSN_642N_MFN_LIST_sample.xlsx', Buffer.from(X.buf)); console.log('  샘플 저장 /mnt/user-data/outputs/'); } catch (e) { console.log('  (샘플 저장 생략 — 이 환경에 출력 폴더 없음: ' + e.message + ')'); }


  console.log('⑨ 두 양식 — 수석(마감텔리) · 일반(A4 세로 한 장) · MFN 단독(세관 신고용)');
  const phead = Object.assign({}, pack.head);
  const packI = M.mfnPackOf(FX.discharge.mfnList, VK, FX.info);
  ok(/SPIL NIKEN/.test(packI.head.vv) && /642N/.test(packI.head.vv) && packI.head.arr === '2026-11-01', '머리에 선명·항차 · 입항(양하)일(접안 계획 시작일 2026-11-01)이 들어간다', packI.head.vv + ' / ' + packI.head.arr);
  const mfnSet = new Set(mfnCns);
  ok(pack.rows.length === 44 && pack.rows.every((r) => mfnSet.has(r.cn)) && new Set(pack.rows.map((r) => r.cn)).size === 44, '출력 행 수 = MFN 수 44 · MFN 아닌 컨 0건(리스트 234·다른 컨 섞임 없음)');
  const listedNon = Object.keys(FX.discharge.records).filter((k) => !mfnSet.has(k));
  const chiefHtml = M.generateMfnListHTML(pack.rows, pack.head);
  const fieldHtml = M.generateMfnFieldHTML(pack.rows, pack.head);
  const cnInHtml = (h) => (h.match(/[A-Z]{4}\d{7}/g) || []);
  for (const [nm, h, want] of [['수석', chiefHtml, 44], ['일반(본문 44 + 띠 44)', fieldHtml, 88]]) {
    const cs = cnInHtml(h);
    ok(cs.length === want && cs.every((c) => mfnSet.has(c)) && new Set(cs).size === 44 && !listedNon.some((k) => h.includes(k)), nm + ' 양식 HTML — 컨번호 전부 MFN 44대 · 리스트 234 컨은 한 건도 없음', cs.length);
  }
  const L = M.mfnFieldLayout(pack.rows);
  ok(L.china.length === 34 && L.ptk.length === 10 && L.fits && L.stripHeightMm <= 277 && L.stripFontPt >= 6 && L.stripFontPt <= 7 && L.bodyFontPt >= 8, '일반 양식 — 한 장 안에 수용(띠 높이 ' + L.stripHeightMm.toFixed(0) + 'mm/277mm · 띠 글자 ' + L.stripFontPt.toFixed(1) + 'pt · 본문 글자 ' + L.bodyFontPt.toFixed(1) + 'pt)');
  const stripHtml = fieldHtml.slice(fieldHtml.indexOf('data-mfn-strip'));
  const stripRows = (stripHtml.match(/<td class="s1">/g) || []).length;
  ok(L.stripWidthMm === 50 && /\.strip \{ width: 50mm;/.test(fieldHtml) && /\.cutwrap \{ width: 50mm;/.test(fieldHtml) && /border: 0\.3mm dashed/.test(fieldHtml) && /&#9986;/.test(fieldHtml), '띠 가로 5cm(50mm) 고정 · 점선 절취선 · 가위 표시');
  ok(stripRows === 44 && /MFN 44대/.test(stripHtml.slice(0, 600)) && /SPIL NIKEN/.test(stripHtml.slice(0, 600)), '띠 행 수 = MFN 수 44 · 맨 위 한 줄(선명·항차·입항일·MFN 44대)');
  const bodyRows = (fieldHtml.slice(0, fieldHtml.indexOf('data-mfn-strip')).match(/<td class="cn">/g) || []).length;
  ok(bodyRows === 44, '본문 표 행 수 = MFN 수 44', bodyRows);
  ok(/\.sheet \{ width: 190mm; height: 277mm;/.test(fieldHtml) && /overflow: hidden/.test(fieldHtml) && /size: A4 portrait/.test(fieldHtml), '한 페이지 — 시트 190×277mm 고정(A4 세로 여백 10mm)');
  const L120 = M.mfnFieldLayout(Array.from({ length: 120 }, (_, i) => ({ cn: 'TEST' + (1000000 + i), china: true })));
  const L100 = M.mfnFieldLayout(Array.from({ length: 100 }, (_, i) => ({ cn: 'TEST' + (1000000 + i), china: true })));
  ok(!L120.stripFits && L120.stripFontPt < 6 && L100.stripFits && L100.stripFontPt >= 6 && /경고/.test(M.generateMfnFieldHTML(Array.from({ length: 120 }, (_, i) => ({ cn: 'TEST' + (1000000 + i), china: true })), pack.head)) && !/class="warn/.test(fieldHtml), '44대를 넘어도 줄 간격이 줄고 한 장 유지 · 최소 6pt 아래로 못 가면 경고(2열 분할 없음)');
  ok(fieldHtml.indexOf('중국행 주의 34대') > -1 && fieldHtml.indexOf('중국행 주의 34대') < fieldHtml.indexOf('평택행 10대') && /A4 portrait/.test(fieldHtml) && !/CHIEF CHECKER|CHIEF OFFICER|MANIFESTED|DISCHARGED|OVER/.test(fieldHtml), '일반 양식 — A4 세로 · 중국행이 평택행보다 앞 · 서명줄·OS 용어 없음');
  ok(/MFN 44대 \(터미널 278 = 리스트 234 \+ MFN 44\)/.test(fieldHtml) && /PDF 저장 \/ 인쇄/.test(fieldHtml) && /엑셀 저장/.test(fieldHtml) && !fieldHtml.includes('`'), '일반 양식 — 요약 한 줄 · PDF/인쇄·엑셀 단추');
  ok(/선명·항차/.test(chiefHtml) && /입항\(양하\)일/.test(chiefHtml) && />POL</.test(chiefHtml) && /CHIEF CHECKER/.test(chiefHtml) && /MANIFESTED 234/.test(chiefHtml), '수석 양식 — 세관 신고용 열(POL · 선명·항차 · 입항일) + 서명줄 + OS-IN 말');
  const big = []; for (let i = 0; i < 150; i += 1) big.push({ cn: 'TEST' + String(1000000 + i), china: i % 3 > 0, reload: false, fe: 'E', type: '40HC', pol: 'CNDLC', dest: 'CNDLC' });
  ok(M.mfnFieldLayout(big).stripFits === false && M.mfnFieldLayout([]).fits && M.mfnFieldLayout(big.slice(0, 60)).fits, '대수별 한 장 판정 — 0·60대는 수용 · 150대는 경고 대상');
  const roleOf = (r) => (M.STAFF_LIST.find((x) => x.role === r) || {}).name;
  const nmChief = M.STAFF_LIST.find((x) => /수석/.test(x.role) && !/부수석/.test(x.role)), nmField = M.STAFF_LIST.find((x) => x.role === '검수');
  ok(nmChief && nmField && M.mfnChiefView(nmChief.name) === true && M.mfnChiefView(nmField.name) === false && M.mfnChiefView('') === false, '역할 분기 — 수석은 수석 양식 · 일반 검수원/무명은 일반 양식(출력 센터와 같은 판정)', (nmChief && nmChief.name) + '/' + (nmField && nmField.name));
  const opened = [];
  global.window.open = () => { const w = { document: { open() {}, write(h) { opened.push(h); }, close() {} }, alert() {} }; return w; };
  global.alert = (x) => opened.push('ALERT ' + x);
  M.openMfnList(FX.discharge.mfnList, VK, FX.info, nmField.name);
  M.openMfnList(FX.discharge.mfnList, VK, FX.info, nmChief.name);
  ok(opened.length === 2 && /data-mfn-form="field"/.test(opened[0]) && !/data-mfn-form="field"/.test(opened[1]) && /CHIEF CHECKER/.test(opened[1]) && !/일반 양식으로 보기/.test(opened[0]) && /일반 양식으로 보기/.test(opened[1]), '열기 함수 한 벌 — 일반은 일반 양식 · 수석은 수석 양식(+창 안 «일반 양식으로 보기» 전환)', opened.length);
  const XF = await M.generateMfnFieldExcel(pack.rows, pack.head, { download: false });
  const wbF = new ExcelJS.Workbook(); await wbF.xlsx.load(XF.buf);
  const wsF = wbF.getWorksheet('MFN');
  let fRows = [], fAll = []; wsF.eachRow((row) => { const v = String(row.getCell(2).value || ''); if (/^[A-Z]{4}\d{7}$/.test(v)) fRows.push(v); row.eachCell((c) => fAll.push(String(c.value || ''))); });
  const stripCns = []; wsF.eachRow((row) => { const v = String(row.getCell(9).value || ''); if (/^[A-Z]{4}\d{7}$/.test(v)) stripCns.push(v); });
  ok(fRows.length === 44 && fRows.every((c) => mfnSet.has(c)) && !listedNon.some((k) => fAll.includes(k)), '일반 엑셀 — 본문 컨 44줄 전부 MFN · 리스트 컨 0건', fRows.length);
  ok(stripCns.length === 44 && new Set(stripCns).size === 44 && stripCns.every((c) => mfnSet.has(c)), '일반 엑셀 — 띠(I열) 행 수 = MFN 수 44', stripCns.length);
  const px = [9, 10, 11].map((i) => Math.trunc(wsF.getColumn(i).width * 7 + 5));
  const stripMm = px.reduce((a, b) => a + b, 0) * 25.4 / 96;
  ok(stripMm >= 48 && stripMm <= 52, '일반 엑셀 — 띠 열(I:K) 너비 합 5cm ±0.2cm(' + stripMm.toFixed(1) + 'mm)', px.join('+'));
  const totPx = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => Math.trunc(wsF.getColumn(i).width * 7 + 5)).reduce((a, b) => a + b, 0) * 25.4 / 96;
  ok(totPx <= 190, '일반 엑셀 — 인쇄 폭 합 190mm 이하라 한 장 맞춤에서 띠가 줄지 않는다(' + totPx.toFixed(0) + 'mm)');
  ok(/^A1:K\d+$/.test(wsF.pageSetup.printArea || ''), '일반 엑셀 — 인쇄 영역 지정', wsF.pageSetup.printArea);
  ok(wsF.pageSetup.orientation === 'portrait' && wsF.pageSetup.fitToPage && wsF.pageSetup.fitToHeight === 1 && wsF.pageSetup.fitToWidth === 1, '일반 엑셀 — A4 세로 한 장 맞춤');
  ok(fRows.slice(0, 34).every((c) => pack.rows.find((r) => r.cn === c).china) && fRows.slice(34).every((c) => !pack.rows.find((r) => r.cn === c).china), '일반 엑셀 — 중국행 34 먼저 · 평택행 10 아래');
  ok(['NO', '컨번호', '규격', 'F/E', '출발지', '원래 목적지', '비고'].every((h) => fAll.includes(h)) && !fAll.some((v) => /CHIEF|MANIFESTED/.test(v)), '일반 엑셀 — 세관 신고용 열 · 서명줄/OS 용어 없음');
  try {
    fs.mkdirSync('/mnt/user-data/outputs', { recursive: true });
    fs.writeFileSync('/mnt/user-data/outputs/MCSN_642N_MFN_LIST_sample.xlsx', Buffer.from(X.buf));
    fs.writeFileSync('/mnt/user-data/outputs/MCSN_642N_MFN_LIST_field_sample.xlsx', Buffer.from(XF.buf));
    const htmlPack = M.mfnPackOf(FX.discharge.mfnList, VK, FX.info);
    fs.writeFileSync('/mnt/user-data/outputs/MCSN_642N_MFN_LIST_field_sample.html', M.generateMfnFieldHTML(htmlPack.rows, htmlPack.head));
    fs.writeFileSync('/mnt/user-data/outputs/MCSN_642N_MFN_LIST_chief_sample.html', M.generateMfnListHTML(htmlPack.rows, htmlPack.head));
    const smp = ['MCSN_642N_MFN_LIST_sample.xlsx', 'MCSN_642N_MFN_LIST_field_sample.xlsx', 'MCSN_642N_TALLY_REPORT_sample.xlsx'].map((f) => '/mnt/user-data/outputs/' + f);
    ok(smp.every((f) => fs.existsSync(f) && fs.statSync(f).size > 3000), '샘플 파일 저장 확인 — 수석 · 일반 · 마감텔리', smp.map((f) => fs.existsSync(f) ? fs.statSync(f).size : 0).join('/'));
  } catch (e) { ok(false, '샘플 저장 실패', e.message); }
  console.log('⑦ 회귀 — mfnList 가 비어도 종전과 같다');
  const vEmpty = noMfn(); vEmpty.discharge.mfnList = { items: {}, n: 0 };
  ok(M.ptkDischargeUnitsOf(vEmpty).set.size === 234 && M.progressOf(vEmpty.discharge, 'discharge', new Set(), null).ptk.total === 234 && M.reconcileSources(vEmpty, 'discharge', { voyageKey: VK }).mfn === null, 'items 가 비면 234 · MFN 그룹 없음');
  const Dn = M.runDiagnostics({ ediContainers: noMfn().discharge.ediContainers, listRecords: noMfn().discharge.records, mode: 'discharge', voyage: noMfn(), voyageKey: VK }) || [];
  const aln = (Array.isArray(Dn) ? Dn : Dn.alerts || []).find((a) => a.code === 'source_recon');
  ok(!!aln && !/MFN/.test(aln.msg), 'MFN 없는 진단 — 알림(source_recon)은 있고 MFN 말은 없다(번호 없음 44 만)', aln && aln.msg);
  console.log(bad ? `\n✗ MFN 4.59 — ${bad}/${n} 실패` : `\nMFN 4.59 — ${n}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✗ 연막검사 자체 오류', e); process.exit(1); });
