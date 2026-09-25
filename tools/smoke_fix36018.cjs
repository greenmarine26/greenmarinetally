// 3.60-18 연막검사 — 진단 재검증 수리 묶음(검수사 2026-09-25 «꼭 수정할 것부터 순서대로 판을 냅니다» · 다수결 V2·V5)
//   실소스를 esbuild 로 묶어 실픽스처(mirone_live_260910 NSFR 2617N · mirsame_kbtr KBTR 2606E)로 돌린다. 정적 검사는 소스 문자열로.
//   ① 미르 잔여 분모 = 리스트(voyageCountsOf ↔ utils progressOf 같은 수) ② 페이스 재료(doneAts)는 분모 안의 완료 ③ «얼마나 남았어» 본문이 그 수를 말한다
//   ④ 조건 없는 «위치요» 되묻기 ⑤ 못 알아들은 말 miss 이벤트 ⑥ 끝네자리 답 X-RAY 줄 중복 없음 ⑦ 콘앱 «출항 언제» = 검수앱(PORT-MIS)
//   ⑧ 홈 자동 정리 조회만 가드 ⑨ sw.js 프리캐시 제거·cone-sw 저장 조건 ⑩ 씰체결 시트명·별첨 제목·오프라인 문구
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36018_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const misses = [];
global.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent(ev) { if (ev && ev.type === 'gm-mir-miss') misses.push(ev.detail); return true; }, __fbShipBayDict: {}, location: { href: '' } };
global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} }, createElement: () => ({ style: {} }) };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const norm = (s) => String(s == null ? '(null)' : s).replace(/\s+/g, ' ').trim();
(async () => {
  try {
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, `export * from "${ROOT}/src/mirCore.entry.js";\nexport { voyageCountsOf } from "${ROOT}/src/mir.js";\nexport { progressOf, shiftCnSetOf } from "${ROOT}/src/utils.js";\nexport { speedFromRecords, voyageDoneAts } from "${ROOT}/src/nlSearch.js";\nexport { matchPortMis } from "${ROOT}/src/portMisMatch.js";\nexport { matchPortMisById, shipIdentityLite } from "${ROOT}/src/portMisCore.js";\n`);
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    const M = require(o);
    const FX1 = JSON.parse(src('tools/fixtures/mirone_live_260910.json'));
    const FX2 = JSON.parse(src('tools/fixtures/mirsame_kbtr.json'));

    console.log('■ ① 미르 잔여 분모 = 리스트 — NSFR 2617N 양하(EDI 423 · 세관 리스트 80)');
    {
      const vk = 'NSFR_2617N', v = FX1[vk];
      const D = v.discharge; const cs = M.toMirContainers(Object.values(D.ediContainers || {}), 'discharge');
      const prog = M.progressOf(D, 'discharge', M.shiftCnSetOf(vk, v), null);
      const vc = M.voyageCountsOf(v, cs, M.shiftCnSetOf(vk, v));
      ok(`voyageCountsOf 양하 total ${vc.byMode.discharge.total} = progressOf 분모 ${prog.total} (리스트 80)`, vc.byMode.discharge.total === prog.total && prog.total === 80, `${vc.byMode.discharge.total} vs ${prog.total}`);
      ok('완료 수도 같은 분모 안', vc.byMode.discharge.done === prog.done);
      //  리스트 없는 항차는 종전대로 EDI 평택분 전부
      const v2 = { info: v.info, discharge: { ediContainers: D.ediContainers } };
      const vc2 = M.voyageCountsOf(v2, M.toMirContainers(Object.values(D.ediContainers), 'discharge'));
      ok('리스트 없는 항차는 종전대로 EDI 평택분(79 — 423 중 POD 평택)', vc2.byMode.discharge.total === 79, `${vc2.byMode.discharge.total} (ptk ${cs.filter((c) => c._ptk).length})`);
      ok('doneAts 는 오름차순 배열', Array.isArray(vc.doneAts) && vc.doneAts.every((a, i, arr) => i === 0 || arr[i - 1] <= a));
      //  시프팅 컨(리스트 밖)은 분모에 든다 — 홈 카드 progressOf(total = 리스트 + 시프팅)와 같다. 콘앱은 _shift 표식 행으로 같은 집합을 준다(2차 시뮬 1: MCSN 637N 481 ↔ 521).
      const shiftCn = cs.find((c) => !c._ptk && !(D.records || {})[c.cn]);   // 타항 컨 = 시프팅 후보
      const vcS = M.voyageCountsOf(v, cs, new Set([shiftCn.cn]));
      const progS = M.progressOf(D, 'discharge', new Set([shiftCn.cn]), null);
      ok(`시프팅 1대를 더하면 분모 81 = progressOf ${progS.total}`, vcS.byMode.discharge.total === progS.total && progS.total === 81, `${vcS.byMode.discharge.total} vs ${progS.total}`);
      const ctxS = { app: 'cone', countFallback: true, voyageKey: vk, voyage: v, info: v.info, mode: 'discharge', containers: cs.map((c) => (c.cn === shiftCn.cn ? { ...c, _shift: true } : c)), compMap: {}, _trace: {} };
      const aS = norm(M.answerOneRaw('얼마나 남았어', ctxS));
      ok('콘앱 ctx 의 _shift 행도 분모에 든다(전체 81대)', /전체 81대/.test(aS), aS.slice(0, 100));
    }

    console.log('■ ②③ 페이스·«얼마나 남았어» — KBTR 2606E (완료 있음)');
    {
      const vk = FX2.voyageKey, v = FX2.voyage, info = v.info;
      const D = v.discharge || {}, L = v.loading || {};
      const comp = Object.assign({}, D.completed || {}, L.completed || {});
      const paint = (rows, mode) => M.toMirContainers(rows, mode).map((c) => { const w = c && c.cn ? comp[c.cn] : null; return (w && !c._comp) ? Object.assign({}, c, { _comp: w }) : c; });
      const cs = paint(Object.values(D.ediContainers || {}), 'discharge').concat(paint(Object.values(L.ediContainers || {}), 'loading'));
      const ctx = () => ({ app: 'tally', smallTalkLast: true, execDevice: true, modeChoice: 'both', countFallback: true, inspector: '연막', voyages: { [vk]: v }, flat: cs,
        voyageKey: vk, voyage: v, info, mode: 'discharge', containers: cs, compMap: comp, shiftMap: null, bayPairs: null, diagAlerts: [], pilotForecast: FX2.pilotForecast, shipSpeed: FX2.shipSpeed, portMisData: {}, _trace: {} });
      const c1 = ctx(); const a = norm(M.answerOneRaw('얼마나 남았어', c1));
      const vc = M.voyageCountsOf(v, cs, new Set());
      const prog = M.progressOf(D, 'discharge', new Set(), null);
      ok(`voyageCountsOf 양하 = progressOf (${vc.byMode.discharge.total}/${vc.byMode.discharge.done} vs ${prog.total}/${prog.done})`, vc.byMode.discharge.total === prog.total && vc.byMode.discharge.done === prog.done);
      const mDone = a.match(/완료: (\d+)대/), mTot = a.match(/전체 (\d+)대/);
      ok(`«얼마나 남았어» 본문 완료/전체 = voyageCounts (${vc && vc.done}/${vc && vc.total})`, mDone && mTot && Number(mDone[1]) === vc.done && Number(mTot[1]) === vc.total, a.slice(0, 120));
      ok('«항차 전체로는» 덧줄이 없다(본문이 곧 항차 전체)', !/항차 전체로는/.test(a));
      const ap = norm(M.answerOneRaw('진행 상황', ctx()));
      const mP = ap.match(/양하 (\d+)\/(\d+)/), mL = ap.match(/선적 (\d+)\/(\d+)/);
      ok(`«진행 상황» 도 같은 분모(양하 ${vc.byMode.discharge.done}/${vc.byMode.discharge.total} · 선적 ${vc.byMode.loading.done}/${vc.byMode.loading.total}) — 감사 M1`, mP && mL && Number(mP[2]) === vc.byMode.discharge.total && Number(mL[2]) === vc.byMode.loading.total && Number(mP[1]) === vc.byMode.discharge.done, ap.slice(0, 140));
      const sp = M.speedFromRecords(v, vc);
      const spAll = M.speedFromRecords(v, { total: vc.total, done: vc.done });
      ok('speedFromRecords 가 counts.doneAts 를 쓴다(완료 시각 수 = 분모 안 완료 수)', !sp || sp.n === vc.doneAts.length, sp && `${sp.n} vs ${vc.doneAts.length}`);
      ok('doneAts 없이 부르면 종전(전체 완료 기록)', !spAll || spAll.n === M.voyageDoneAts(v).length);
    }

    console.log('■ ④ 조건 없는 «위치요» 는 되묻는다 · 조건 있는 위치는 종전대로');
    {
      const vk = 'NSFR_2617N', v = FX1[vk];
      const cs = M.toMirContainers(Object.values(v.discharge.ediContainers || {}), 'discharge');
      const ctx = () => ({ app: 'tally', countFallback: true, voyageKey: vk, voyage: v, info: v.info, mode: 'discharge', containers: cs, compMap: {}, diagAlerts: [], _trace: {} });
      for (const q of ['위치요', '화면 어디야', '어디야', '위치 알려줘']) { const a = norm(M.answerOneRaw(q, ctx())); ok(`«${q}» → 되묻기`, /어느 컨의 위치/.test(a), a.slice(0, 80)); }
      const a1 = norm(M.answerOneRaw('0686 어디야', ctx())); ok('«0686 어디야» → 자리 답(05-01-04)', /0686/.test(a1) && /05-01-04/.test(a1) && !/어느 컨의 위치/.test(a1), a1.slice(0, 80));
      const a2 = norm(M.answerOneRaw('XRAY 대상 위치', ctx())); ok('«XRAY 대상 위치» → 종전대로 목록', /X-RAY/.test(a2) && !/어느 컨의 위치/.test(a2), a2.slice(0, 80));
      const a3 = norm(M.answerOneRaw('전체 어디 있어', ctx())); ok('«전체 어디 있어» → 분포(되묻지 않음)', !/어느 컨의 위치/.test(a3), a3.slice(0, 80));
    }

    console.log('■ ⑤ 못 알아들은 말은 miss 로 남는다');
    {
      const vk = 'NSFR_2617N', v = FX1[vk];
      const cs = M.toMirContainers(Object.values(v.discharge.ediContainers || {}), 'discharge');
      const ctx = () => ({ app: 'tally', countFallback: true, voyageKey: vk, voyage: v, info: v.info, mode: 'discharge', containers: cs, compMap: {}, diagAlerts: [], _trace: {} });
      misses.length = 0;
      const a0 = M.answerOneRaw('츌항 언제', ctx());
      ok('검색창(accepted 없음)에서는 miss 를 안 남긴다 — 글자마다 부르는 자리(감사 C1)', a0 == null && misses.length === 0, String(misses.length));
      const a = M.answerOneRaw('츌항 언제', { ...ctx(), accepted: true });
      ok('«츌항 언제»(전송) → null(못 알아들음)', a == null, norm(a).slice(0, 60));
      ok('gm-mir-miss 이벤트 1건(q=츌항 언제) · recordOnly 표식은 안 실림', misses.length === 1 && misses[0].q === '츌항 언제' && !('recordOnly' in misses[0]), JSON.stringify(misses));
    }

    console.log('■ ⑥ 끝네자리 답에 X-RAY 줄이 두 번 안 찍힌다(콘앱 ctx)');
    {
      const vk = 'NSFR_2617N', v = FX1[vk];
      const cs = M.toMirContainers(Object.values(v.discharge.ediContainers || {}), 'discharge');
      const coneVoyage = { info: v.info, reports: {}, discharge: { completed: {}, records: v.discharge.records || {}, xrayList: v.discharge.xrayList || {}, xraySeals: {}, held: {}, luggConfirm: {} }, loading: { completed: {}, records: {}, held: {} } };
      const a = norm(M.answerOneRaw('0686', { app: 'cone', containers: cs, cone: { rows: [], dischRows: [], stowRows: [] }, execDevice: true, shiftN: 0, mode: 'discharge', modeLabel: '양하', info: v.info, compMap: {}, shiftMap: null, voyage: coneVoyage, vsl: v.info.vsl || '', vslFull: v.info.vslFull || '', pier: '', voyageKey: vk, records: { discharge: v.discharge.records || {}, loading: {} }, _trace: {} }));
      ok('«0686» → NSSU0170686 · X-RAY 대상', /NSSU0170686/.test(a) && /X-RAY 대상/.test(a), a.slice(0, 120));
      ok('«X-RAY 대상» 글자는 한 번', (a.match(/X-RAY 대상/g) || []).length === 1, a);
    }

    console.log('■ ⑦ 콘앱 «출항 언제» = 검수앱 (PORT-MIS 신고를 콘앱도 본다 — 다수결 V2)');
    {
      const vk = FX2.voyageKey, v = FX2.voyage, info = v.info;
      const cs = M.toMirContainers(Object.values((v.discharge || {}).ediContainers || {}), 'discharge');
      const pm = { [String(info.callsign || 'ZZKB').toUpperCase()]: { callsign: String(info.callsign || 'ZZKB').toUpperCase(), vesselName: info.vslFull || 'KOBE TRADER', port: '평택', eta: '2099-09-10 07:30', etd: '2099-09-10 21:00', berth: '동부두 8번선석', nextPort: 'HAIPHONG', updatedAt: Date.now() } };
      const infoPm = { ...info, callsign: String(info.callsign || 'ZZKB').toUpperCase() };
      const tally = { app: 'tally', countFallback: true, voyageKey: vk, voyage: { ...v, info: infoPm }, info: infoPm, mode: 'discharge', containers: cs, compMap: {}, diagAlerts: [], pilotForecast: {}, portMisData: pm, matchPortMis: M.matchPortMis, _trace: {} };
      const coneVoyage = { info: infoPm, reports: {}, discharge: { completed: {}, records: {}, xrayList: {}, xraySeals: {}, held: {}, luggConfirm: {} }, loading: { completed: {}, records: {}, held: {} } };
      const cone = { app: 'cone', containers: cs, cone: { rows: [], dischRows: [], stowRows: [] }, execDevice: true, shiftN: 0, mode: 'discharge', modeLabel: '양하', info: infoPm, compMap: {}, shiftMap: null, voyage: coneVoyage, vsl: infoPm.vsl || '', vslFull: infoPm.vslFull || '', pier: '', pilotForecast: {}, portMisData: pm, voyageKey: vk, records: { discharge: {}, loading: {} }, _trace: {} };
      const a = norm(M.answerOneRaw('출항 언제', tally)), b = norm(M.answerOneRaw('출항 언제', cone));
      ok('검수앱 «출항 언제» 가 PORT-MIS 출항 시각을 말한다', /출항/.test(a) && /21:00/.test(a), a.slice(0, 120));
      ok('콘앱도 같은 답(종전 «PORT-MIS 신고는 아직»)', a === b, `콘앱: ${b.slice(0, 120)}`);
      const lite = M.matchPortMisById(pm, infoPm, M.shipIdentityLite(infoPm)), full = M.matchPortMis(pm, infoPm);
      ok('portMisCore(신원 lite) 와 portMisMatch(베이사전 신원) 가 같은 레코드', lite && full && lite === full);
    }

    console.log('■ ⑧⑨⑩ 정적 검사');
    {
      const hp = src('src/pages/HomePage.jsx');
      const i1 = hp.indexOf('if (isViewOnlyNow()) { setAutoCleanDone(true); return; }'), i2 = hp.indexOf('const expired = entries.filter');
      ok('홈 자동 정리 — 조회만 가드가 항차 훑기 앞에 있다', i1 > 0 && i2 > i1);
      const sw = src('sw.js'), swp = src('public/sw.js');
      ok('sw.js 에 cone-cargoplan.js 프리캐시(c.add) 가 없다', !/c\.add\('cone-cargoplan\.js'\)/.test(sw) && sw === swp);
      const csw = src('cone-sw.js');
      ok('cone-sw.js — ok·같은 오리진(+보관소)·_ck/u 제외 조건이 있고 public 사본과 같다', /res\.ok/.test(csw) && /self\.location\.origin/.test(csw) && /firebasedatabase/.test(csw) && /_ck\|u/.test(csw) && csw === src('public/cone-sw.js'));
      ok('떠 있는 미르·콘앱 ctx 에 accepted 표식', /accepted: true/.test(src('src/components/MirFab.jsx')) && /accepted:true/.test(src('public/cone.html')));
      ok('cone.html 이 port_mis_data 를 받아 ctx.portMisData 로 넘긴다', /g\('port_mis_data\.json'\)/.test(src('public/cone.html')) && /portMisData: \(mc&&mc\.portMisData\)/.test(src('public/cone.html')));
      ok('콘앱 버전 2.55-01', /window\.__CONEV='ConeOne 2\.55-01'/.test(src('public/cone.html')));
      ok('콘앱 미르 voyage 에 restowList(선사 시프팅 목록)가 실린다', /restowList:\(state\.restowList/.test(src('public/cone.html')));
      ok('씰체결 엑셀 시트명 — 같은 길이 안 순번(_sameLenBefore)', /_sameLenBefore \? ' ' \+ \(_sameLenBefore \+ 1\)/.test(src('src/components/EmptySealReport.jsx')));
      ok('검수리스트 별첨 제목에 X-RAY 글자 없음', /\[별첨\] 특수화물 \$\{special\.length\}대/.test(src('src/inspectionList.js')) && !/특수화물·X-RAY/.test(src('src/inspectionList.js')));
      ok('오프라인 띠 문구 — 닫거나 새로고침하지 말 것', /새로고침하지 마세요\(저장이 사라집니다\)/.test(src('src/components/Header.jsx')));
      ok('APP_VERSION 3.60-18', /APP_VERSION = 'TallyOne 3\.60-18'/.test(src('src/utils.js')));
    }

    console.log(`\n3.60-18 연막검사: ${n - bad}/${n}`);
    process.exit(bad ? 1 : 0);
  } catch (err) {
    console.error('연막검사 자체 실패:', err && err.stack || err);
    process.exit(1);
  }
})();
