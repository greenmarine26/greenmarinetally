// 회귀 기준표 연막검사 — tools/REGRESS_BASELINE.md §1 의 «이 입력이면 이 답»을 실소스·실항차 자료로 재서, 어긋나면 배포를 막는다.
//   검수사 2026-10-09 «찾은 것이 고정되지 않는 것이 문제». 같은 감사를 또 하지 않게, 고친 것을 여기서 못 박는다.
//   ⚠ 기대값은 코드 출력에서 베끼지 않는다 — 픽스처 원자료에서 이 파일이 따로 센다(EDI 행을 POD 로 거른 수 · 실컨번호 정규식 · 작업일 겹침 …).
//   실소스를 esbuild 로 묶어 실제로 돌린다(쓰기 없음 — Firebase 는 메모리 스텁). 소스 문자열 검사는 기준표가 «배선» 이라 적은 R8 뒤 줄과 R11 만.
//   사용: node tools/smoke_regress.cjs <저장소 루트>
process.env.TZ = 'Asia/Seoul';   // 작업일·근무는 현장 시각(KST)으로 센다
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'regress_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const head = (title, from) => { console.log(`■ ${title}`); console.log(`  (출처 ${from})`); };
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
const bundle = (entrySrc, name, extra = '') => {
  const e = path.join(TMP, name + '.mjs'), o = path.join(TMP, name + '.cjs');
  fs.writeFileSync(e, entrySrc);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --log-level=error ${extra} --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  return require(o);
};

//  이 파일이 쓰는 독립 판정 — 앱 함수를 부르지 않는다.
const CN_RE = /^[A-Z]{4}\d{7}$/;                                      // 실컨번호(ISO 6346 — 영문 4 + 숫자 7)
const PTK_RE = /^(?:KR)?(?:PTK|PYT|PYO|PYOTM)\d{0,2}$|PYEONGTAEK/i;  // 평택 항구코드(KRPTK · PTK02 · KRPYT …)
const isPtkCode = (s) => PTK_RE.test(String(s || '').trim().toUpperCase());
//  4.20 R23 — 평택 양하분을 규칙대로 따로 센다(검수사 2026-10-10 00:02 «그래도 기본은 세관이 맞습니다. 나중에 추가분이 생기면 추가분만 더하면 됩니다. 그 추가분은 세관에 목록에 없지만 실제 양하된 컨테이너로 신고 대상입니다»).
//    목록 L = 양하 records 중 리스트 행(선사 칸이 하나라도 있음 · POL 만 평택인 선적분 아님) — 세관 표식이 있으면 세관 행만. 추가분 X = (EDI POD 평택 ∪ 완료 기록(누락 표식 빼고) ∪ 터미널 실적) − L.
//    목록이 없으면 EDI POD 평택. 유닛은 컨번호(EDI 행은 그 행의 cn — 자리표시 키는 유닛이 아니다). 앱 함수를 부르지 않는다.
const unitsByRule = (sec) => {
  const E = (sec && sec.ediContainers) || {}, R = (sec && sec.records) || {}, C = (sec && sec.completed) || {}, T = (sec && sec.termWork) || {};
  const isList = (r) => !!(r && (r._source || r.wt || r.sl || r.pol || r.pod || r.sh || r.bl || r.op || r.tmp || r.iso));
  const outbound = (r) => !isPtkCode(r.pod) && isPtkCode(r.pol);
  const rows = Object.entries(R).filter(([cn, r]) => cn && !cn.startsWith('_') && isList(r) && !outbound(r));
  const cust = rows.filter(([, r]) => r._customs);
  const L = new Set((cust.length ? cust : rows).map(([cn]) => cn));
  const edi = Object.entries(E).map(([k, e]) => [String((e && e.cn) || k), e]).filter(([cn, e]) => e && cn && !cn.startsWith('_') && !e.isBooking);
  const ediPtk = edi.filter(([, e]) => isPtkCode(e.pod)).map(([cn]) => cn);
  if (!L.size) return { basis: 'edi', set: new Set(ediPtk), L, X: new Set(), ediCns: new Set(edi.map(([cn]) => cn)) };
  const X = new Set([...ediPtk, ...Object.keys(C).filter((k) => C[k] && C[k].flag !== 'missing'), ...Object.keys(T)].filter((cn) => cn && !cn.startsWith('_') && !L.has(cn)));
  return { basis: cust.length ? 'customs' : 'list', set: new Set([...L, ...X]), L, X, ediCns: new Set(edi.map(([cn]) => cn)), ediPtk: new Set(ediPtk) };
};

global.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, open: () => null, location: { href: '' }, __fbShipBayDict: {} };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, createElement: () => ({ style: {} }), documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
global.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const B = bundle([
    `export { shiftReportContainers, plausibleListWtKg, legendItemsOf, isFlatRackContainer, bayCellTypeLabel, legendLiveOf, parseAscFile, emptySealSpec, isReeferContainer, isoPickOog } from "${ROOT}/src/utils.js";`,
    `export { ediMapFromRaw, shiftSplitOf, shiftCnSetOf, progressOf, computeShiftingMap, swapFixList, applySwapFix, setLaneRoutes, shiftingMapForDisplay, predictedShiftingForDisplay } from "${ROOT}/src/utils.js";`,   // 4.16 R16~R19
    `export { computeTallyData, ptkContainers, buildShifting, buildSealList } from "${ROOT}/src/tallyReport.js";`,   // 4.20 감사 R25 — Act. Cntr-Seal 시트
    `export { generateBriefing } from "${ROOT}/src/nlSearch.js";`,
    `export { computeAllStats } from "${ROOT}/src/components/StatsTab.jsx";`,
    `export { mergeFolder } from "${ROOT}/src/mergeApi.js";`,
    `export { buildInspectionListDoc, generateInspectionListHTML } from "${ROOT}/src/inspectionList.js";`,
    `export { answerOneRaw, buildDataPack, flattenVoyages, movesOfVoyage, voyageCountsOf } from "${ROOT}/src/mir.js";`,
    `export { answerTotalMoves, answerShiftBriefing } from "${ROOT}/src/chiefAnswers.js";`,   // 4.20 후속 — 교대 브리핑 양하 물량
    `export { toMirContainers } from "${ROOT}/src/mirCore.entry.js";`,
    `export { pickShipCtx } from "${ROOT}/src/mir.js";`,   // 4.17 R21 — 질문 속 배 고르기(홈 통합검색·떠 있는 미르)
    `export { pickVoyageKey, parseViewCommand } from "${ROOT}/src/planCommand.js";`,   // 4.17 R21 — 콘앱 배 옮기기(cone.html mirEnsureShip) · 4.18-01 콘앱 mirAsk 실소스 시험
    `export { shipCodeInQuery, knownShipCodes } from "${ROOT}/src/utils.js";`,   // 4.18-01 R21 — 콘앱 mirShipFirst 가 부르는 판정(ConeMir 와 같은 함수)
    `export { ptkDischargeUnitsOf, applyDischargeUnits, isMadeUnitCn, splitJoinedSeals, shiftCnSetOf as shiftCnSetOf420 } from "${ROOT}/src/utils.js";`,   // 4.20 R23·R25 — 평택 양하분 한 벌 · 제작컨 · 씰 가르기
    `export { buildPrintModel, deckTotals } from "${ROOT}/src/rzorPrintModel.js";`,   // 4.20 R25 — 덱플랜 칸 글자·덱 집계
    `export { mirTone } from "${ROOT}/src/mir.js";`,
    `export { parseNaturalQuery } from "${ROOT}/src/nlSearch.js";`,
    `export { reconcileSources } from "${ROOT}/src/sourceRecon.js";`,   // 4.22 R27 — 자료별 대조 한 벌
    `export { runDiagnostics, buildVoiceMessage, diagListRowCount } from "${ROOT}/src/diagnostics.js";`,   // 4.22 R27 — 주의 박스 경고 · 음성
    `export { CUSTOMS_RESULT_CODES } from "${ROOT}/src/data/customsCodes.js";`,   // 4.22 R27 — 세관 검수 결과 코드표(검수사 원문)
    `export { listTypoTwins, bookingFillOfSec } from "${ROOT}/src/utils.js";`,   // 4.22-01 R28 — bookingFillOfSec   // 4.22 R27 — 번호 오타 짝(CND) — VoyagePage 가 진단에 넘기는 한 벌
  ].join('\n'), 'core', '--external:firebase --external:firebase/* --loader:.js=jsx --jsx=automatic --loader:.png=dataurl');
  const stub = './tools/stub_fbdb_mem.js';
  const FB = bundle(`export { fbSetEmptySeal } from "${ROOT}/src/firebase.js";\n`, 'fb', `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub}`);
  global.window.XLSX = require(path.join(ROOT, 'node_modules/xlsx'));   // loadSheetJS 는 window.XLSX 가 있으면 그것을 쓴다(네트워크 없음)
  const XLSX = global.window.XLSX;

  // ── R1 ───────────────────────────────────────────────────────────────
  head('R1 갱별 보고 평택분 — records 빈 칸(«»)이 EDI 값을 덮지 않는다 (기록부 301 · 3.63)', '검수사 §7.6 갱별 보고 + §2.1 «EDI 는 내용물»');
  {
    const voy = fx('daynight_gang_obwh_1612.json').OBWH_2751E;
    const edi = voy.discharge.ediContainers;
    const want = Object.values(edi).filter((c) => isPtkCode(c.pod)).length;   // EDI 행을 POD 평택으로 직접 센 수
    const before = B.shiftReportContainers(voy, 'discharge');
    ok(`OBWH 2751E 양하 평택분 = EDI 에서 POD 평택으로 센 ${want}대`, before.length === want, `${before.length} ≠ ${want}`);
    //  변이 — records 다섯 대 중 한 대꼴로 pod·iso 를 빈 칸으로(TNJP 26362E 156대·OBWH RF·긴급 리스트 51대가 그랬다)
    const mut = JSON.parse(JSON.stringify(voy));
    const hit = Object.keys(mut.discharge.records).filter((_, i) => i % 5 === 0);
    hit.forEach((cn) => { mut.discharge.records[cn].pod = ''; mut.discharge.records[cn].iso = ''; });
    const after = B.shiftReportContainers(mut, 'discharge');
    ok(`records ${hit.length}대 pod «» 변이 뒤에도 평택분 ${want}대 (변이 전후 같다)`, after.length === want, `${after.length} ≠ ${want}`);
    const isoLost = hit.filter((cn) => { const c = after.find((x) => x.cn === cn); return !c || c.iso !== edi[cn].iso; });
    ok('변이한 컨의 규격(iso)은 EDI 값 그대로 — 빈 칸이 덮지 않는다', !isoLost.length, isoLost.slice(0, 3).join(','));
  }

  // ── R2 ───────────────────────────────────────────────────────────────
  head('R2 리스트 무게 0·음수·40톤 초과는 «무게 없음» — EDI 총중량을 덮지 않는다 · 톤 표기는 kg (기록부 751·69·71 · 2.52-04·4.08-02)', '검수사 §4.2-B-1·5 «40톤을 넘는 리스트 무게는 무게 없음»');
  {
    const P = B.plausibleListWtKg;
    ok('plausibleListWtKg(232000) = 0 (B/L 합계 232톤은 컨 하나 무게가 아니다)', P(232000) === 0, String(P(232000)));
    ok('plausibleListWtKg(0) = 0 · (-5) = 0', P(0) === 0 && P(-5) === 0, `${P(0)} · ${P(-5)}`);
    ok('plausibleListWtKg(27.6) = 27600 (톤 표기는 kg 로) · (27600) = 27600', P(27.6) === 27600 && P(27600) === 27600, `${P(27.6)} · ${P(27600)}`);
    //  STSE 2677E 실행 — wt = SITC 리스트 무게(B/L 합계 섞임) · wtEdi = EDI 총중량. 그 값으로 EDI 한 벌과 합본(loadlist.xlsx)을 만들어 mergeApi 에 넣는다.
    const cs = fx('stse2677e_twin_wt.json').containers;
    const big = cs.find((c) => c.wt > 200000);              // 232,160 kg 행(B/L 합계)
    const zero = cs.find((c) => c !== big && c.wt > 0 && c.wt <= 40000 && c.wtEdi > 0);
    const noEdiBig = cs.find((c) => c !== big && c.wt > 40000 && c.cn !== (zero && zero.cn));
    const noEdiTon = cs.find((c) => ![big, zero, noEdiBig].includes(c) && c.wt >= 10000 && c.wt <= 40000 && Math.round(c.wt / 100) % 10 !== 0);   // 27.6 처럼 소수 한 자리가 있는 톤 표기
    const seg = (c, withWt) => `LOC+147+0${String(c.bay).padStart(2, '0')}${String(c.row).padStart(2, '0')}${String(c.tier).padStart(2, '0')}::5'` +
      (withWt ? `MEA+WT++KGM:${c.wtEdi}'` : '') + `LOC+9+CNSHA:139:6'LOC+11+KRPTK:139:6'EQD+CN+${c.cn}+${c.iso}+++5'`;
    const ediTxt = `UNB+UNOA:2+X+Y+261007:0000+1'UNH+1+BAPLIE:D:95B:UN:SMDG22'BGM++1+9'TDT+20+2677E+++SIT:172:20'LOC+5+CNSHA:139:6'` +
      seg(big, true) + seg(zero, true) + seg(noEdiBig, false) + seg(noEdiTon, false) + `UNT+1+1'UNZ+1+1'`;
    const ws = XLSX.utils.json_to_sheet([
      { 'Cntr No': big.cn, Weight: big.wt }, { 'Cntr No': zero.cn, Weight: 0 },
      { 'Cntr No': noEdiBig.cn, Weight: noEdiBig.wt }, { 'Cntr No': noEdiTon.cn, Weight: +(noEdiTon.wt / 1000).toFixed(1) },
    ]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'MERGED');
    const xb = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const file = (name, data) => ({ name, arrayBuffer: async () => (data instanceof ArrayBuffer ? data : new Uint8Array(data).buffer) });
    const out = await B.mergeFolder([file('STSE_2677E.edi', Buffer.from(ediTxt, 'latin1')), file('STSE_2677E_loadlist.xlsx', xb)]);
    const rows = XLSX.utils.sheet_to_json(XLSX.read(out.xlsxBase64, { type: 'base64' }).Sheets.MERGED);
    const wOf = (cn) => { const r = rows.find((x) => x['Cntr No'] === cn); return r ? r.Weight : undefined; };
    ok(`mergeApi — ${big.cn} 리스트 ${big.wt}kg(232톤) + EDI ${big.wtEdi} → ${big.wtEdi}`, Number(wOf(big.cn)) === big.wtEdi, String(wOf(big.cn)));
    ok(`mergeApi — ${zero.cn} 리스트 Weight 0 + EDI ${zero.wtEdi} → ${zero.wtEdi}`, Number(wOf(zero.cn)) === zero.wtEdi, String(wOf(zero.cn)));
    ok(`mergeApi — ${noEdiBig.cn} EDI 무게 없음 + 리스트 ${noEdiBig.wt}kg(40톤 초과) → 무게 없음`, !Number(wOf(noEdiBig.cn)), String(wOf(noEdiBig.cn)));
    const ton = +(noEdiTon.wt / 1000).toFixed(1);
    ok(`mergeApi — ${noEdiTon.cn} EDI 무게 없음 + 리스트 ${ton}(톤 표기) → ${Math.round(ton * 1000)}kg`, Number(wOf(noEdiTon.cn)) === Math.round(ton * 1000), String(wOf(noEdiTon.cn)));
  }

  // ── R3 ───────────────────────────────────────────────────────────────
  head('R3 fbSetEmptySeal 은 넘긴 칸만 쓴다 — 안 넘긴 틀린실·리씰을 «» 로 덮지 않는다 (기록부 399 · 3.60 ①)', '감사(3.60 치명) · 규범 §5-1 «현장 기록은 덮지 않음»과 같은 원리');
  {
    localStorage.setItem('master_active_inspector_v1', '검수원A');
    global.__memdb = { voyages: { V1: { loading: { records: { SEAL0000001: { cn: 'SEAL0000001', eseal: 'OLD', eseal_wrong: 'X', reseal: 'Y' } } } } } };
    let err = '';
    try { await FB.fbSetEmptySeal('V1', 'loading', 'SEAL0000001', { eseal: 'Z' }, '검수원A', 'manual'); } catch (e) { err = String(e && e.message || e); }
    await sleep(30);
    const r = (global.__memdb.voyages.V1.loading.records || {}).SEAL0000001 || {};
    ok('fbSetEmptySeal({eseal:Z}) 뒤 eseal = Z', !err && r.eseal === 'Z', err || JSON.stringify(r).slice(0, 160));
    ok('안 넘긴 eseal_wrong = X · reseal = Y 그대로', r.eseal_wrong === 'X' && r.reseal === 'Y', `eseal_wrong=${JSON.stringify(r.eseal_wrong)} · reseal=${JSON.stringify(r.reseal)}`);
  }

  // ── R4 ───────────────────────────────────────────────────────────────
  head('R4 리퍼 온도 표시는 부호를 잃지 않는다 — 유니코드 마이너스(U+2212)도 음수 (기록부 400 · 3.60 ②)', '검수사 §7.1 리퍼 온도 확인 대상(온도 값은 서류 그대로)');
  {
    //  _fmtTemp 는 내보내지 않는다 — 그것이 찍히는 종이(검수 리스트)를 실제로 그려 비고 칸의 온도를 읽는다.
    const IN = [['RFTU0000001', '−18', true], ['RFTU0000002', '-18', true], ['RFTU0000003', '18', false], ['RFTU0000004', '−2.5', true]];
    const list = IN.map(([cn, tmp]) => ({ cn, iso: '45R1', fe: 'F', rf: true, tmp, pod: 'KRPTK', pol: 'CNSHA', op: 'SKR', bay: '10', row: '02', tier: '82' }));
    const html = String(B.generateInspectionListHTML(list, 'discharge', { vsl: 'TEST', voy_d: '0001E' }, []) || '');
    const tempOf = (cn) => { const i = html.indexOf(`>${cn}<`); if (i < 0) return null; const row = html.slice(i, html.indexOf('</tr>', i)); const m = row.match(/([-−+]?)\s*(\d+(?:\.\d+)?)\s*℃/); return m ? m[1] + m[2] : null; };
    const got = Object.fromEntries(IN.map(([cn]) => [cn, tempOf(cn)]));
    const lost = IN.filter(([cn, , neg]) => got[cn] == null || /^[-−]/.test(got[cn]) !== neg);
    ok('음수 «−18»·«-18»·«−2.5» 는 음의 부호가 있고 «18» 은 없다', !lost.length, JSON.stringify(got));
    ok('«−18»(U+2212) 과 «-18» 은 같은 표시', got.RFTU0000001 != null && got.RFTU0000001 === got.RFTU0000002, `${got.RFTU0000001} vs ${got.RFTU0000002}`);
  }

  // ── R5 ───────────────────────────────────────────────────────────────
  head('R5 미르 «총 무브수» 끝줄 «시프팅 N · 해치커버 별도» 의 N = 시프팅 지도(확정) 대수 (기록부 170 · 4.01 2차)', '검수사 §7.5-B(2026-10-04 «미르 총 무브수»)');
  //  ATPR 2644E 는 선사 서류가 없는 배(N=0) · MCAP 639N 은 서류 5행이 있는 배 — 서류를 무시하는 회귀는 MCAP 쪽이 잡는다(Fable 판정 2026-10-09).
  for (const [file, key, ship, label] of [['eta401_atpr_real.json', 'ATPR_2644E', 'ATPR', 'ATPR 2644E'], ['shiftbay_mcap639n.json', 'MCAP_639N', 'MCAP', 'MCAP 639N']]) {
    const d = fx(file);
    const rl = d.restowList || {};
    const want = Object.keys(rl).filter((k) => CN_RE.test(k)).length;   // 선사 서류(restowList) 실컨번호 행을 직접 센 수
    const v = { ...d, key };
    const ans = String(B.answerTotalMoves(v, ship, { eta: B.movesOfVoyage(v, key) }) || '');
    const last = ans.trim().split('\n').pop();
    const m = last.match(/^시프팅 (\d+)(?:\(.*\))? · 해치커버 별도\.$/);
    ok(`${label} — 끝줄이 «시프팅 N · 해치커버 별도.» 꼴`, !!m, last);
    ok(`${label} — N = 선사 서류(restowList) 행 수 ${want}`, !!m && Number(m[1]) === want, m ? m[1] : last);
  }
  //  ★ 4.20 후속 (Fable 판정 ④-4 · 규범 §4-4): «총 무브수» 둘째 줄의 «양하 N대» 와 교대 브리핑의 양하 물량 = 평택 양하분(세관 목록·선사 리스트 + 추가분 − 시프팅).
  //    기대값은 원자료에서 따로 — unitsByRule(records·EDI·완료·터미널 실적) 에서 선사 RESTOW LIST 의 컨을 뺀 수. KBTR 2606E 는 세관 목록에만 있고 실제로 내린 3대가 있는 배(교대 브리핑 102 → 105).
  {
    const rows5 = [['eta401_atpr_real.json', 'ATPR_2644E', 'ATPR'], ['shiftbay_mcap639n.json', 'MCAP_639N', 'MCAP'], ['mirsame_kbtr.json', 'KBTR_2606E', 'KBTR']].map(([file, key, ship]) => {
      const d0 = fx(file), d = d0.voyage || d0, v = { ...d, key };
      const restow = new Set(Object.keys(d.restowList || {}).filter((k) => CN_RE.test(k)));
      const want = [...unitsByRule(d.discharge).set].filter((cn) => !restow.has(cn)).length;
      const ans = String(B.answerTotalMoves(v, ship, { eta: B.movesOfVoyage(v, key) }) || '');
      const got = Number((ans.split('\n')[1] || '').match(/양하 (\d+)대 →/)?.[1]);
      return { key, want, got, line: (ans.split('\n')[1] || '').slice(0, 60) };
    });
    ok(`«총 무브수» 양하 N대 = 평택 양하분(원자료 − 선사 시프팅 서류) — ${rows5.map((r) => `${r.key} ${r.want}`).join(' · ')}`, rows5.every((r) => r.got === r.want), rows5.map((r) => `${r.key} ${r.got}≠${r.want} «${r.line}»`).filter((x, i) => rows5[i].got !== rows5[i].want).join(' | '));
    const K5 = { ...fx('mirsame_kbtr.json').voyage, _key: 'KBTR_2606E' };
    const want5 = unitsByRule(K5.discharge).set.size;
    const sb = String(B.answerShiftBriefing(K5, null, { shipName: 'KBTR' }) || '');
    const sbN = Number((sb.match(/양하 \d+\/(\d+)/) || sb.match(/양하 (\d+) \+/) || [])[1]);
    ok(`교대 브리핑 양하 물량 = 평택 양하분 ${want5}(KBTR 2606E — 세관 목록에만 있고 실제로 내린 3대 포함) (수정 전 EDI 행 102)`, sbN === want5, sb.split('\n').slice(1, 2).join(' '));
    //  교대 브리핑 특수화물 줄 — 양하 물량을 컨번호로 센 뒤에도 리퍼·위험물은 그 컨의 행(EDI 행, 없으면 records 행)으로 센다. 기대값은 평택 양하분 행 + 선적 평택분 행에서 따로.
    const E5 = K5.discharge.ediContainers || {}, R5r = K5.discharge.records || {}, eBy5 = {};
    for (const [k, e] of Object.entries(E5)) if (e) { const cn = String(e.cn || k); if (!eBy5[cn] || k === cn) eBy5[cn] = e; }
    const dRows5 = [...unitsByRule(K5.discharge).set].map((cn) => eBy5[cn] || R5r[cn] || {});
    const lRows5 = Object.values((K5.loading && K5.loading.ediContainers) || {}).filter((c) => c && isPtkCode(c.pol));
    const fullRf = (c) => !c.rfdry && !c.mkcon && String(c.fe || '').toUpperCase() !== 'E' && B.isReeferContainer(c);
    const rfW = dRows5.concat(lRows5).filter(fullRf).length, dgW = dRows5.concat(lRows5).filter((c) => c.dg).length, dSp5 = dRows5.filter((c) => fullRf(c) || c.dg).length;
    const spL = sb.split('\n').find((l) => l.startsWith('특수화물')) || '';
    const rfG = Number((spL.match(/리퍼 (\d+)/) || [0, 0])[1]), dgG = Number((spL.match(/위험물 (\d+)/) || [0, 0])[1]);
    ok(`교대 브리핑 특수화물 — 리퍼 ${rfW} · 위험물 ${dgW}(그중 양하 ${dSp5}대) = 평택 양하분 행 + 선적 평택분 행에서 따로 셈`, rfG === rfW && dgG === dgW && dSp5 > 0, spL || sb.slice(0, 80));
  }

  // ── R6 ───────────────────────────────────────────────────────────────
  head('R6 «오늘/내일/모레 작업하는 배» 는 그 날짜의 항차만 답한다 (기록부 25 · 4.12-02 ⑤)', '검수사 §4.2-F(2026-10-08)');
  {
    //  오늘·내일·모레 — 지난 날(어제·그제)은 4.17 부터 날짜별 완료 기록으로 답한다(§7.8-③ · §4.2-F-5 폐기) — R20 이 잰다.
    //  기준일 고정 — 픽스처 항차들의 작업일 가운데 2026-08-26(KST 12:00). 실시간 날짜를 쓰지 않는다.
    const FIX = Date.parse('2026-08-26T12:00:00+09:00');
    const RealDate = Date;
    class FixedDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIX); } static now() { return FIX; } }
    const VJ = fx('voyages.json').voyages;   // 값이 항차 info 그대로
    const voyages = Object.fromEntries(Object.entries(VJ).map(([k, info]) => [k, { info }]));
    //  독립 계산 — planDate «YYYY-MM-DD HH:MM ~ YYYY-MM-DD HH:MM» 가 그 날(00:00~24:00 KST)과 겹치는 배. 날짜 말은 우리말 그대로(오늘 0 · 내일 1 · 모레 2).
    const kst = (s) => { const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/); return m ? Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+09:00`) : null; };
    const day0 = Date.parse('2026-08-26T00:00:00+09:00');
    const shipsOn = (off) => Object.values(VJ).filter((i) => {
      const [a0, b0] = String(i.planDate || '').split('~'); const a = kst(a0); const b = b0 ? kst(b0) : a;
      return a != null && a < day0 + (off + 1) * 864e5 && (b == null ? a : b) >= day0 + off * 864e5;
    }).map((i) => i.vsl).sort();
    global.Date = FixedDate;
    try {
      for (const [word, off, q] of [['오늘', 0, '오늘 작업하는 배'], ['내일', 1, '내일 작업하는 배'], ['모레', 2, '모레 작업하는 배']]) {
        const want = shipsOn(off);
        const ans = String(B.answerOneRaw(q, { app: 'tally', voyages, flat: [], portMisData: {}, _trace: {} }) || '');
        const got = ans.split('\n').map((l) => (l.match(/^(\S+) — /) || [])[1]).filter(Boolean).sort();
        ok(`«${q}» → ${word}(08-${26 + off}) 작업 항차 ${want.length}척 [${want.join(' ')}]`, want.length > 0 && got.join(' ') === want.join(' '), `답 [${got.join(' ')}] · ${ans.split('\n')[0]}`);
      }
    } finally { global.Date = RealDate; }
  }

  // ── R7 ───────────────────────────────────────────────────────────────
  head('R7 선적 계수(미르 «선사별 몇 대» 등)는 예약 자리를 실컨과 겹쳐 세지 않는다 (기록부 620 · 3.26 3차)', '검수사 §2.1 + 7.4-F «컨번호 없는 예약 자리는 범위로»');
  {
    const sw = fx('bookingfill_swbt.json').swbt;
    const L = sw.loading;
    //  독립 계산 — 선적 섹션의 실컨번호(ISO 4+7)만 센다(EDI cn · records 키의 합집합). 예약 자리(__BOOK_·__SLOT_·빈 cn)는 안 맞는다.
    const real = new Set([...Object.values(L.ediContainers).map((c) => String(c.cn || '')), ...Object.keys(L.records)].filter((cn) => CN_RE.test(cn)));
    const want = real.size;
    const key = 'SWBT_2614N';
    const flat = B.flattenVoyages({ [key]: sw });
    const lod = flat.filter((c) => c._mode === 'loading' && c._ptk !== false);
    const leg = B.legendItemsOf(lod);
    ok(`legendItemsOf(SWBT 선적 펼치기 ${lod.length}행) 합 = 실컨번호로 센 ${want}`, leg.length === want, `${leg.length} ≠ ${want}`);
    const ans = String(B.answerOneRaw('선사별로 몇 대야', { app: 'tally', voyages: { [key]: sw }, flat, voyageKey: key, voyage: sw, info: sw.info, mode: 'loading', containers: flat.filter((c) => c.voyageKey === key), portMisData: {}, _trace: {} }) || '');
    const tot = Number((ans.match(/총 (\d+)대/) || [])[1]);
    const sum = ans.split('\n').map((l) => Number((l.match(/^\d+\. \S+ (\d+)대/) || [])[1] || 0)).reduce((a, b) => a + b, 0);
    ok(`미르 «선사별로 몇 대야»(선적) — 총 ${want}대 · 선사 줄 합 ${want}`, tot === want && sum === want, `총 ${tot} · 합 ${sum} · ${ans.split('\n').slice(0, 2).join(' / ')}`);
  }

  // ── R8 ───────────────────────────────────────────────────────────────
  head('R8 미르 데이터 팩·검색은 평택분만 — 통과화물이 섞이지 않는다 · 판정은 isPtk 한 벌 (기록부 553·617 · 3.42·3.26)', '검수사 §11 «평택분만 센다 — 폴백 금지»');
  {
    const D = fx('ptk_djcf.json');
    const key = 'DJCF_0150N';
    const voy = { info: { vsl: 'DJCF', voy_d: '0150N', voy_l: '0151S' }, loading: { ediContainers: D.ediContainers, records: D.records } };
    //  독립 계산 — 선적이므로 POL 평택. POL 은 EDI 가 정본(부록 A-2), EDI 에 없는 리스트 행만 리스트 POL.
    const cns = [...new Set([...Object.keys(D.ediContainers), ...Object.keys(D.records)])];
    const polOf = (cn) => (D.ediContainers[cn] ? D.ediContainers[cn].pol : (D.records[cn] || {}).pol);
    const want = cns.filter((cn) => isPtkCode(polOf(cn))).length;
    const transit = cns.filter((cn) => D.ediContainers[cn] && !isPtkCode(polOf(cn)));
    const flat = B.flattenVoyages({ [key]: voy });
    const pack = B.buildDataPack('리퍼 몇 대', { containers: flat, info: voy.info });
    ok(`buildDataPack 선적 총 = POL 평택으로 센 ${want}대 (통과화물 ${transit.length}대 제외)`, pack.summary && pack.summary.선적 && pack.summary.선적.총 === want, JSON.stringify(pack.summary && pack.summary.선적 && pack.summary.선적.총));
    const tcn = transit[0];
    const pk2 = B.buildDataPack(`${tcn.slice(-4)} 어디`, { containers: flat, info: voy.info });
    ok(`팩 검색 — 통과화물 ${tcn} 끝 4자리로 물어도 «질문에맞는컨» 에 안 나온다`, !(pk2.질문에맞는컨 || []).some((l) => String(l).startsWith(tcn)), JSON.stringify(pk2.질문에맞는컨).slice(0, 160));
    //  배선 — 기준표가 명시한 세 화면
    for (const f of ['src/components/SearchPanel.jsx', 'src/components/ValidationBox.jsx', 'src/components/PrintHubModal.jsx']) {
      const s = src(f);
      ok(`${path.basename(f)} — isPtk 호출 있음 · \`const _ptk\` 정의 없음`, /\bisPtk\s*\(|\(\s*isPtk\s*\)/.test(s) && !/\bconst\s+_ptk\b/.test(s));
    }
  }

  // ── R9 ───────────────────────────────────────────────────────────────
  head('R9 복합문 «컨테이너 파손됐고 씰도 잘렸어» — 파손·씰 잘림 대처 둘 다 (기록부 540 · 3.43-02 · 4.14-01 에서 켬)', '검수사(3.43-02 씰 대처법 원장)');
  {
    //  smoke_mirsame 의 미르 틀 그대로 — 콘앱 번들 진입점(mirCore.entry) 한 벌에 KBTR 2606E 실항차를 물려 검수앱·콘앱 ctx 로 묻는다.
    const MC = bundle(`export { answerOneRaw, toMirContainers } from "${ROOT}/src/mirCore.entry.js";\n`, 'mircore', '--loader:.js=jsx --jsx=automatic');
    const FX = fx('mirsame_kbtr.json');
    const vk = FX.voyageKey, v = FX.voyage, info = v.info;
    const D = v.discharge || {}, L = v.loading || {};
    const comp = Object.assign({}, D.completed || {}, L.completed || {});
    const cs = MC.toMirContainers(Object.values(D.ediContainers || {}), 'discharge').concat(MC.toMirContainers(Object.values(L.ediContainers || {}), 'loading'));
    const ctxOf = (app) => (app === 'tally'
      ? { app, smallTalkLast: true, execDevice: true, modeChoice: 'both', countFallback: true, inspector: '연막', isChief: true, portMisData: {}, pilotForecast: FX.pilotForecast, shipSpeed: FX.shipSpeed, voyages: { [vk]: v }, flat: cs, voyageKey: vk, voyage: v, info, mode: 'discharge', containers: cs, compMap: comp, photos: null, diagAlerts: [], _trace: {} }
      : { app, containers: cs, cone: { rows: [], dischRows: [], stowRows: [] }, execDevice: true, shiftN: 0, mode: 'discharge', modeLabel: '양하', info, compMap: comp, voyage: v, vsl: info.vsl, shipSpeed: FX.shipSpeed, pilotForecast: FX.pilotForecast, voyageKey: vk, _trace: {} });
    const ask = (q, app) => { const a = MC.answerOneRaw(q, ctxOf(app)); return String(a == null ? '' : a).replace(/\s+/g, ' ').trim(); };
    //  기대 — 원장(검수사 확정 문구)의 핵심 문장. 코드 출력에서 베끼지 않는다.
    const DMG = '데미지로 잡아요', SEAL = '리씰한 뒤 사진을 첨부해요';
    const bad1 = [];
    for (const q of ['컨테이너 파손됐고 씰도 잘렸어', '컨테이너 파손됐고 씰도 잘렸어 어떻게 해']) {
      for (const app of ['tally', 'cone']) { const a = ask(q, app); if (!a.includes(DMG) || !a.includes(SEAL)) bad1.push(`${app} «${q}» → ${a.slice(0, 70)}`); }
    }
    ok(`복합문(서술·«어떻게 해») 답에 파손 대처(«${DMG}»)와 씰 잘림 대처(«${SEAL}»)가 둘 다 — 검수앱·콘앱`, !bad1.length, bad1.join(' | '));
    //  단독 질문은 한 갈래만, 그 문장은 복합문 답 속 문장과 같다. «씰 파손됐어 어떻게 해» 의 «파손» 은 손상으로 또 세지 않는다.
    const sDmg = ask('컨테이너 파손 어떻게', 'tally'), sSeal = ask('씰 잘렸어 어떻게 해', 'tally'), sSeal2 = ask('씰 파손됐어 어떻게 해', 'tally'), sDmg2 = ask('컨테이너 파손됐어', 'tally');
    const both = ask('컨테이너 파손됐고 씰도 잘렸어', 'tally');
    ok('단독 질문은 한 갈래만(«컨테이너 파손 어떻게»·«컨테이너 파손됐어» 는 씰 없음 · «씰 잘렸어/씰 파손됐어 어떻게 해» 는 손상 없음) · 단독 두 답의 문장이 복합문 답에 그대로',
      sDmg.includes(DMG) && !sDmg.includes(SEAL) && !sDmg2.includes(SEAL) && sSeal.includes(SEAL) && !sSeal.includes(DMG) && sSeal2.includes(SEAL) && !sSeal2.includes(DMG) && both.includes(sDmg) && both.includes(sSeal),
      `파손 ${sDmg.slice(0, 30)} | 씰 ${sSeal.slice(0, 30)} | 씰파손 ${sSeal2.slice(0, 30)} | 서술 ${sDmg2.slice(0, 30)} | 복합 ${both.slice(0, 40)}`);
  }

  // ── R10 ──────────────────────────────────────────────────────────────
  head('R10 검수 리스트 «이어서» 는 한 단 66줄 상한으로 장을 나누고 경계선 때문에 한 장 늘지 않는다 (기록부 306 · 3.62)', '검수사 §7.7(3.60-01 «한장으로» · 3.70-02 66줄)');
  {
    const PER_COL = 66, COLS = 3;   // 기준표의 66 · 종이 한 장 세 단(3.60). 소스 상수를 읽지 않는다.
    const pagesOf = (html) => String(html || '').split(/(?=<div class="ipage")/).filter((x) => x.startsWith('<div class="ipage"')).map((pg) =>
      (pg.match(/<tbody>[\s\S]*?<\/tbody>/g) || []).map((tb) => [...tb.matchAll(/<td class="cn">([^<]*)<\/td>/g)].map((m) => m[1])));
    //  범위 170~200 · 350~375 (Fable 판정 2026-10-09) — 66줄 만석 구간 196~198 에서 3.62 이전 버그(경계선 무게를 늘 더함)가 장 하나를 늘린다.
    const sweep = (label, list, info, from, want) => {
      const to = Math.min(want, list.length);   // 목록이 짧으면 있는 데까지만 — 없는 행을 지어내지 않는다(제목에 실제 범위를 적는다)
      const over = [], lost = [], tall = [];
      for (let N = from; N <= to; N += 1) {
        const P = pagesOf(B.buildInspectionListDoc(list.slice(0, N).map((c) => ({ ...c })), 'loading', info, []).splits.cont);
        const cap = Math.ceil(N / (PER_COL * COLS));
        if (P.length > cap) over.push(`${N}→${P.length}장`);
        const rows = P.flat(2);
        if (rows.length !== N || new Set(rows).size !== N) lost.push(`${N}:${rows.length}`);
        if (P.some((cols) => cols.length > COLS || cols.some((c) => c.length > PER_COL))) tall.push(N);
      }
      ok(`${label} N=${from}~${to} — «이어서» 장 수 ≤ ⌈N/(66×3)⌉`, !over.length, over.slice(0, 6).join(' · '));
      ok(`${label} N=${from}~${to} — N대가 한 번씩(빠짐·겹침 0) · 한 장 세 단 이하 · 한 단 66줄 이하`, !lost.length && !tall.length, `빠짐 ${lost.slice(0, 4).join(' ')} · 넘침 ${tall.slice(0, 4).join(' ')}`);
    };
    const F1 = fx('ilist_split_36200.json');
    sweep('TMPZ 2030W', F1.tmpz.list, F1.tmpz.info, 170, 200);
    sweep('MCSN 637N', F1.mcsn.list, F1.mcsn.info, 170, 200);
    const F2 = fx('ilist_split_37002.json');   // 36200 은 한 배 287대가 최대 — 350~375 는 같은 틀의 ATPR 2644W 372대(그래서 실제로는 350~372)
    sweep('ATPR 2644W', F2.atpr.list, F2.atpr.info, 350, 375);
  }

  // ── R11 ──────────────────────────────────────────────────────────────
  head('R11 일반 검수원 폰은 고른 항차 본문 하나만 받는다 (4.08·4.08-01) — 이미 고정됨, 가리키기만', '검수사 §2.3(2026-10-07 «필요없는 자료까지 받고 있는지»)');
  ok('build.sh 가 tools/smoke_voyscope408.cjs 를 돌린다(실패하면 배포 금지)', /node tools\/smoke_voyscope408\.cjs "\$PWD" \|\| \{[^}]*exit 1; \}/.test(src('build.sh')));

  // ── R12 ──────────────────────────────────────────────────────────────
  head('R12 마감텔리에 규격이 빈 행은 EDI·베이플랜 규격으로 채워 센다 — 빈 규격이 20\' 칸으로 몰리지 않는다 (기록부 574 · 3.41 · 4.15 에서 켬)', '검수사 §7.8-⑥(2026-10-09)');
  {
    //  KBTR 2606E 양하 — ASC 20줄이 «45GP90 F»(무게 두 자리)라 4.15 전 파서가 규격을 못 읽어 저장된 EDI iso 가 비었다. 원문(raw ASC)은 규격을 말한다.
    //  기대값은 함수가 아니라 원자료에서 — EDI iso 가 있으면 그것, 비었으면 같은 컨번호의 ASC 줄 44열 규격 4자리.
    //  칸은 규격 앞 두 자리로 — 첫 자리 2 = 20' · 4 이고 둘째 자리 5~9 = HC(9'6") · 4 이고 0~4 = 40'.
    const v = JSON.parse(JSON.stringify(fx('mirsame_kbtr.json').voyage)); v.key = 'KBTR_2606E';
    const E = v.discharge.ediContainers;
    const rawTxt = String(v.discharge.raw.edi.text || '');
    const lineOf = {}; rawTxt.split(/\r?\n/).forEach((l) => { const cn = l.substring(7, 18).trim(); if (CN_RE.test(cn)) lineOf[cn] = l; });
    //  4.20 (R23 · 검수사 2026-10-10 00:02 «기본은 세관»): 모집단은 평택 양하분(세관 목록 + 추가분) — 세관 목록에만 있고 EDI 에 없는데 실제로 내린 3대(완료·터미널 실적)가 든다(102 → 105).
    //    그 행의 규격은 세관 행 규격(22G1). EDI 행은 종전대로 EDI iso → 원문 44열.
    const U12 = unitsByRule(v.discharge);
    const eByCn = Object.fromEntries(Object.entries(E).map(([k, c]) => [c.cn || k, c]));
    const ptk = [...U12.set].map((cn) => eByCn[cn] || { cn, iso: String((v.discharge.records[cn] || {}).iso || ''), _onlyList: true });
    const specOf = (c) => String(c.iso || '').trim() || (lineOf[c.cn] || '').substring(44, 48);
    const colOf = (s) => (s[0] === '2' ? '20' : s[0] === '4' ? (/[5-9]/.test(s[1]) ? 'HC' : '40') : '?');
    const blank = ptk.filter((c) => !String(c.iso || '').trim());
    const want = { 20: 0, 40: 0, HC: 0 }; ptk.forEach((c) => { const k = colOf(specOf(c)); if (k in want) want[k] += 1; });
    //  ① 파서 — 원문을 다시 읽으면 무게 두 자리 줄도 규격이 선다(규격 4자리 = 원문 44열 그대로).
    const P = B.parseAscFile(rawTxt).containers;
    const bad = P.filter((c) => { const l = lineOf[c.cn]; const tok = l ? l.substring(44, 48) : ''; return /^\d{2}[A-Z]{2}$/.test(tok) && String(c.iso || '').slice(0, 2) !== tok.slice(0, 2); });
    const twoDigit = Object.values(lineOf).filter((l) => /^\d{2}[A-Z]{2}\d{2} [FE]/.test(l.substring(44, 52))).length;
    ok(`KBTR 원문 ASC «45GP90 F» 꼴(무게 두 자리) ${twoDigit}줄 — 다시 읽으면 규격 빈 줄 0 · 규격 앞 두 자리 = 원문 44열`, twoDigit > 0 && !P.some((c) => c.cn && !String(c.iso || '').trim()) && !bad.length, `빈 ${P.filter((c) => c.cn && !String(c.iso || '').trim()).length} · 어긋남 ${bad.slice(0, 3).map((c) => c.cn).join(',')}`);
    //  ② 마감텔리 — 저장된 빈 규격 행도 원문 규격으로 칸이 선다.
    const t = B.computeTallyData(v).totals.dis;
    const got = (k) => (t.F[k] || 0) + (t.E[k] || 0);
    ok(`KBTR 2606E 양하 마감텔리 20' ${want[20]} · 40' ${want[40]} · HC ${want.HC} = 원자료(EDI·원문 ASC 44열 · 세관 목록에만 있는 ${ptk.filter((c) => c._onlyList).length}대는 세관 규격)로 센 칸 (규격 빈 행 ${blank.length}대 포함)`, blank.length > 0 && got('20') === want[20] && got('40') === want[40] && got('HC') === want.HC, `20' ${got('20')} · 40' ${got('40')} · HC ${got('HC')}`);
    ok(`전체 ${ptk.length}대(평택 양하분 — 규격 채우기는 컨을 더하거나 빼지 않는다) · 45' 0`, t.n === ptk.length && got('45') === 0, `전체 ${t.n} · 45' ${got('45')}`);
    const filled = B.ptkContainers(v, 'discharge').filter((c) => blank.some((b) => b.cn === c.cn));
    ok(`규격 빈 ${blank.length}대는 어디서 채웠는지 표식(_isoFrom)을 남긴다`, filled.length === blank.length && filled.every((c) => ['edi', 'ediRaw', 'bay'].includes(c._isoFrom)), filled.filter((c) => !c._isoFrom).map((c) => c.cn).slice(0, 3).join(','));
  }

  // ── R13 ──────────────────────────────────────────────────────────────
  head('R13 검수사가 고른 규격(iso_pick)이 EDI 장비코드 tp 를 이긴다 — 표식 전부(FR·OT·탱크·규격초과)가 고른 규격을 따르고 마감텔리도 읽는다 (기록부 368 · 3.60-11 · 4.15 에서 켬)', '검수사 §7.8-⑨(2026-10-09)');
  {
    //  SWTD 9013E 양하 ASC — FR 4대(tp FR40·FR20). 그중 셋을 검수사가 실물로 오픈탑(42UT)·탱크(22T6)·드라이(42G1)로 골랐다고 둔다 — records 에 fbPickIso 가 쓰는 꼴 그대로(iso·iso_pick·표식).
    const dis = fx('frmark_swtd.json').discharge;
    const picks = { CXSU1002075: { iso: '42UT', kind: 'OT', len: '40' }, SKHU1640069: { iso: '22T6', kind: 'TK', len: '20' }, SKHU5540670: { iso: '42G1', kind: '', len: '40' } };
    const recs = {};
    for (const [cn, p] of Object.entries(picks)) recs[cn] = { cn, iso: p.iso, iso_pick: 'customs', iso_pick_label: p.len + p.kind, rf: false, fr: false, ot: p.kind === 'OT', tk: p.kind === 'TK', fe: dis[cn].fe, pod: dis[cn].pod, pol: dis[cn].pol };
    const v = { info: { vsl: 'SWTD', voy: '9013E', voy_d: '9013E' }, discharge: { ediContainers: dis, records: recs } };
    const flat = B.flattenVoyages({ SWTD_9013E: v }).filter((c) => c._mode === 'discharge');
    //  기대 — EDI 장비코드·규격이 FR 인 행(tp FR·PL·FP · iso 셋째 P)에서 검수사가 다른 종류로 고른 컨을 뺀 수.
    const ediFr = Object.values(dis).filter((c) => /^(FR|PL|FP)/.test(String(c.tp || '')) || /^[24][0-9]P/.test(String(c.iso || ''))).map((c) => c.cn);
    const want = ediFr.filter((cn) => !picks[cn]).sort();
    const got = flat.filter((c) => B.isFlatRackContainer(c)).map((c) => c.cn).sort();
    ok(`FR 판정 ${want.length}대 [${want.join(' ')}] — 고른 세 대(OT·TK·드라이)는 FR 아님`, got.join(' ') === want.join(' '), `[${got.join(' ')}]`);
    //  칸 글자 — 특수로 고르면 그 종류(OT40·TK20), 드라이로 고르면 FR 글자가 없다(tp «FR40» 이 칸에 남지 않는다).
    const cells = flat.filter((c) => picks[c.cn]).map((c) => ({ cn: c.cn, cell: B.bayCellTypeLabel(c), p: picks[c.cn] }));
    ok('베이플랜 칸 글자 = 고른 규격(OT40·TK20 · 드라이는 FR 글자 없음) — tp «FR40·FR20» 이 아니다', cells.length === 3 && cells.every((x) => (x.p.kind ? x.cell === x.p.kind + x.p.len : !/FR|PL|FP/.test(x.cell))), cells.map((x) => `${x.cn} ${x.cell}`).join(' · '));
    const cg = B.legendLiveOf(flat, 'discharge', {}).cargos || [];
    const nOf = (k) => { const x = cg.find(([kk]) => kk === k); return x ? x[1].total.n : 0; };
    const wantTk = Object.values(dis).filter((c) => /^TK/.test(String(c.tp || '')) || String(c.iso || '')[2] === 'T').length + 1;   // EDI 탱크 + 탱크로 고른 1대
    ok(`카고플랜 별첨 FR 줄 = ${want.length}대 · Tank 줄 = ${wantTk}대(탱크로 고른 칸은 규격초과 표식도 고른 규격을 따라 OT 로 가지 않는다)`, nOf('FR') === want.length && nOf('Tank') === wantTk, `FR ${nOf('FR')} · Tank ${nOf('Tank')} · OT ${nOf('OT')}`);
    //  Fable 판정(2026-10-09) «고른 쪽이 이긴다 — 표식 전부»: 드라이로 고른 FR 칸은 OT·FR·규격초과 표식이 없다(EDI 가 FR 장비코드로 켠 oog 를 끈다).
    const dry = flat.find((c) => c.cn === 'SKHU5540670');
    const wantOt = Object.values(dis).filter((c) => /^(OT|OP)/.test(String(c.tp || '')) || String(c.iso || '')[2] === 'U').length + 1;   // EDI 오픈탑 + 오픈탑으로 고른 1대
    ok(`드라이로 고른 FR 칸(SKHU5540670 · EDI oog ${dis.SKHU5540670.oog}) — OT·FR·규격초과 표식 없음 · 별첨 OT 줄 = ${wantOt}대`, !!dry && !dry.oog && !dry.ot && !B.isFlatRackContainer(dry) && nOf('OT') === wantOt, `oog ${dry && dry.oog} · ot ${dry && dry.ot} · OT 줄 ${nOf('OT')}`);
    //  마감텔리도 고른 규격을 읽는다(pod_pick 과 같은 자리) — 규격 칸·표식이 고른 값.
    const tr = B.ptkContainers(v, 'discharge').filter((c) => picks[c.cn]);
    const trBad = tr.filter((c) => c.iso !== picks[c.cn].iso || (c.cn === 'SKHU5540670' && (c.oog || c.fr || c.ot)) || (c.cn === 'SKHU1640069' && !c.tk) || (c.cn === 'CXSU1002075' && !c.ot));
    ok(`마감텔리 행도 고른 규격(${Object.values(picks).map((p) => p.iso).join('·')}) · 드라이는 규격초과 없음`, tr.length === 3 && !trBad.length, tr.map((c) => `${c.cn} ${c.iso} oog ${c.oog} tk ${c.tk} ot ${c.ot}`).join(' | '));
  }

  // ── R14 ──────────────────────────────────────────────────────────────
  head('R14 ASC 엠티 리퍼는 엠티로 세되 리퍼 표기(40HR)를 잃지 않는다 — 40HR→40HE 금지 · 엠티실 규격 45RE (기록부 374 · 3.60-10 · 4.15 에서 켬)', '검수사 §7.8-⑩ · §7.1 «엠티는 엠티이다, 그래도 따로 구분은 한다»');
  {
    //  STSE 2669E 선적 예상 ASC 칸(bookingfill_swbt.json stse) — 장비코드 40HR 43칸(엠티 41 · 풀 2). 실 ASC 줄 꼴(asc_djct0219e_shk.asc 첫 줄)에 그 값을 넣어 파서에 다시 먹인다.
    const tpl = fs.readFileSync(path.join(ROOT, 'tools/fixtures/asc_djct0219e_shk.asc'), 'latin1').split(/\r?\n/).find((l) => /^\d{6} /.test(l));
    const put = (s, at, x) => s.slice(0, at) + x + s.slice(at + x.length);
    const wAt = tpl.indexOf('06000');
    const rows = Object.values(fx('bookingfill_swbt.json').stse.loading.ediContainers).filter((c) => c.tp === '40HR');
    const lines = rows.map((c) => {
      let l = put(tpl, 0, `${String(c.bay).padStart(2, '0')}${c.row}${c.tier}`);
      l = put(l, 7, String(c.cn || '').padEnd(11, ' '));
      l = put(l, 44, `40HR${String(Math.round(c.wt / 100)).padStart(3, '0')}${c.fe}`);
      l = put(l, wAt, String(c.wt).padStart(5, '0'));
      return l.replace(/[A-Z]{10}\s*$/, `${c.pol}${c.pod}`);
    });
    const P = B.parseAscFile(['$604SIT/STSE/2670W/x/POD:   /', ...lines].join('\n')).containers;
    const wantE = rows.filter((c) => c.fe === 'E').length;   // 원자료 F/E 칸
    const em = P.filter((c) => c.fe === 'E');
    ok(`엠티 ${wantE}칸은 엠티 그대로(fe E) · 규격은 ASC 원문 «40HR» 그대로`, wantE > 0 && em.length === wantE && em.every((c) => c.iso === '40HR'), `엠티 ${em.length} · ${[...new Set(em.map((c) => c.iso))].join(',')}`);
    ok(`엠티 ${wantE}칸이 리퍼로 판정된다(§7.1 «HR 로 시작하는 규격은 리퍼»)`, em.every((c) => B.isReeferContainer(c)), `리퍼 ${em.filter((c) => B.isReeferContainer(c)).length}/${em.length}`);
    const specs = [...new Set(em.map((c) => B.emptySealSpec(c)))];
    ok('엠티실 규격 = 45RE (45GE 로 나가지 않는다)', specs.length === 1 && specs[0] === '45RE', specs.join(','));
    //  4.15-01 (검수사 2026-10-09 15:39 «리퍼 엠티 41 리퍼풀 2 -> 리퍼=2») — 표기를 지킨 그 43칸을 별첨에 넣어도 Reefer 줄은 원자료 F 칸 수, 엠티 리퍼는 엠티 구분 줄로만 간다.
    const wantF = rows.filter((c) => c.fe !== 'E').length;
    const L14 = B.legendLiveOf(P, 'loading', {});
    const rf14 = ((L14.cargos.find(([k]) => k === 'Reefer') || [])[1] || { total: { n: 0 } }).total.n;
    ok(`이 ${rows.length}칸의 카고플랜 별첨 «Reefer» = 원자료 F 칸 ${wantF}대 · 엠티 리퍼 ${wantE}대는 별첨3 엠티 구분 줄(4.15 에서 ${rows.length} 로 세던 것)`, wantF > 0 && rf14 === wantF && L14.emptyRf && L14.emptyRf.n === wantE, `Reefer ${rf14} · 엠티 리퍼 ${L14.emptyRf && L14.emptyRf.n}`);
  }

  // ── R15 ──────────────────────────────────────────────────────────────
  head('R15 «리퍼 몇 대» 는 풀 리퍼만 — 엠티 리퍼·리퍼드라이·특수제작컨은 세지 않는다 (기록부 375 · 3.60-10 · 4.15 에서 켬)', '검수사 §7.8-⑪ «리퍼 몇대라는 질문은 풀을 이야기 한것»');
  {
    //  RZOR R098E 양하(mkcon_rzor.json) — 리퍼 41(엠티 1 · 특수제작컨 HSAP 8) · OBWH 2749E(ferry1700.json) — 선적 엠티 리퍼 30.
    //  기대값은 원자료에서 — EDI 규격·rf 로 리퍼(§7.1 RF·RE·HR·R + ISO 6346 숫자 냉동군 셋째 자리 3), EDI fe, records mkcon·rfdry.
    const mk = fx('mkcon_rzor.json').RZOR_R098E;
    const isRfRaw = (e) => e.rf === true || /^(RF|RE)|HR$|^[24LM][0-9L]R|^(22|45|95)3/.test(String(e.iso || '').toUpperCase());
    const wantOf = (recs) => Object.values(mk.edi).filter((e) => isPtkCode(e.pod) && isRfRaw(e) && String(e.fe).toUpperCase() !== 'E' && !(recs[e.cn] || {}).mkcon && !(recs[e.cn] || {}).rfdry).length;
    const ask = (q, recs) => {
      const v = { info: { vsl: 'RZOR', voy: 'R098E', voy_d: 'R098E' }, discharge: { ediContainers: mk.edi, records: recs } };
      const flat = B.flattenVoyages({ RZOR_R098E: v });
      return String(B.answerOneRaw(q, { app: 'tally', voyages: { RZOR_R098E: v }, flat, voyageKey: 'RZOR_R098E', voyage: v, info: v.info, mode: 'discharge', containers: flat.filter((c) => c.voyageKey === 'RZOR_R098E'), portMisData: {}, _trace: {} }) || '');
    };
    const num = (a) => Number((a.match(/리퍼:\s*(\d+)대/) || [])[1]);
    const recs = JSON.parse(JSON.stringify(mk.rec));
    const want = wantOf(recs);
    const a1 = ask('리퍼 몇 대', recs);
    ok(`RZOR R098E «리퍼 몇 대» = 원자료로 센 풀 리퍼 ${want}대 (제작컨·엠티 빼고)`, want > 0 && num(a1) === want, a1.split('\n')[0]);
    //  검수원이 풀 리퍼 한 대에 «리퍼드라이 지정»을 누른 꼴(records.rfdry) — 한 대 줄어야 한다.
    const dryCn = Object.keys(mk.edi).find((cn) => mk.edi[cn].rf && mk.edi[cn].fe === 'F' && !(recs[cn] || {}).mkcon);
    const recsD = JSON.parse(JSON.stringify(recs)); recsD[dryCn] = { ...(recsD[dryCn] || { cn: dryCn }), rfdry: true };
    const a2 = ask('리퍼 몇 대', recsD);
    ok(`리퍼드라이 지정 한 대(${dryCn}) 뒤 «리퍼 몇 대» = ${wantOf(recsD)}대`, num(a2) === wantOf(recsD) && wantOf(recsD) === want - 1, a2.split('\n')[0]);
    //  엠티 리퍼 — OBWH 2749E 선적 엠티 리퍼 30. «리퍼 몇 대» 에는 안 들고, «리퍼 엠티 몇 대» 로 따로 묻는다.
    {
      const k = 'OBWH_2749E', vo = fx('ferry1700.json').voyages[k];
      const cnt = (fe) => ['discharge', 'loading'].reduce((s, md) => s + Object.values((vo[md] || {}).ediContainers || {}).filter((e) => isPtkCode(md === 'discharge' ? e.pod : e.pol) && isRfRaw(e)
        && (fe === 'E' ? String(e.fe).toUpperCase() === 'E' : String(e.fe).toUpperCase() !== 'E' && !(((vo[md] || {}).records || {})[e.cn] || {}).mkcon && !(((vo[md] || {}).records || {})[e.cn] || {}).rfdry)).length, 0);
      const wantF = cnt('F'), wantE = cnt('E');
      const wantFL = Object.values(vo.loading.ediContainers).filter((e) => isPtkCode(e.pol) && isRfRaw(e) && String(e.fe).toUpperCase() !== 'E').length;
      const flatO = B.flattenVoyages({ [k]: vo });
      const askO = (q) => String(B.answerOneRaw(q, { app: 'tally', voyages: { [k]: vo }, flat: flatO, voyageKey: k, voyage: vo, info: vo.info, mode: 'loading', containers: flatO.filter((c) => c.voyageKey === k), portMisData: {}, _trace: {} }) || '');
      const aF = askO('리퍼 몇 대'), aE = askO('리퍼 엠티 몇 대');
      ok(`OBWH 2749E «리퍼 몇 대» ${wantF} · «리퍼 엠티 몇 대» ${wantE} — 엠티 리퍼는 따로 묻는다`, wantE > 0 && num(aF) === wantF && num(aE) === wantE, `${aF.split('\n')[0]} | ${aE.split('\n')[0]}`);
      const packO = B.buildDataPack('리퍼 몇 대', { containers: flatO, info: vo.info });
      ok(`OBWH 2749E AI 자료 묶음 선적 «리퍼» = 풀 리퍼 ${wantFL}대 (엠티 ${wantE}대를 세지 않는다)`, packO.summary && packO.summary.선적 && packO.summary.선적.리퍼 === wantFL, JSON.stringify(packO.summary && packO.summary.선적 && packO.summary.선적.리퍼));
    }
    //  같은 판정을 쓰는 자리 — 미르 AI 자료 묶음의 «리퍼» 대수 · 양하 브리핑의 «리퍼 N»
    const v = { info: { vsl: 'RZOR', voy: 'R098E', voy_d: 'R098E' }, discharge: { ediContainers: mk.edi, records: recs } };
    const flat = B.flattenVoyages({ RZOR_R098E: v });
    const pack = B.buildDataPack('리퍼 몇 대', { containers: flat, info: v.info });
    const br = String(B.generateBriefing(flat.filter((c) => c._mode === 'discharge'), '양하', 'discharge') || '');
    const brN = Number((br.match(/리퍼 (\d+)/) || [])[1]);
    //  앱 화면도 같은 한 벌(Fable 판정 2026-10-09 — §4-4) — 현황 탭(StatsTab) 특수화물 «리퍼» 칸.
    const st = B.computeAllStats(flat.filter((c) => c._mode === 'discharge'), {}, {}, 'discharge', v);
    ok(`현황 탭(StatsTab) 특수화물 «리퍼» = ${want} — 미르 «리퍼 몇 대» 와 같은 수`, st && st.bySpecial && st.bySpecial.rf.total === want, String(st && st.bySpecial && st.bySpecial.rf.total));
    ok(`AI 자료 묶음 «리퍼» ${want} · 브리핑 «리퍼 ${want}» — 같은 한 벌`, pack.summary && pack.summary.양하 && pack.summary.양하.리퍼 === want && brN === want, `묶음 ${JSON.stringify(pack.summary && pack.summary.양하 && pack.summary.양하.리퍼)} · 브리핑 ${brN}`);
    //  ── 4.15-01 (검수사 2026-10-09 15:37 «40앰티중 리퍼 엠티가 섞여 있다면 총엠티 몇개 일반 몇개 리퍼엠티 몇개를 구분해서 표기 하지만 풀리퍼랑 합산 하면 안됨» · 15:39 «리퍼 엠티 41 리퍼풀 2 -> 리퍼=2»)
    //  STSE 2669E 선적 실 EDI(conepos_live.json — 컨번호 426대, 엠티 리퍼 45RE 41 · 풀 리퍼 45RF 2). 기대값은 EDI 원자료 fe·규격(iso)에서 이 파일이 센다.
    {
      const k = 'STSE_2669E', sec = fx('conepos_live.json')['STSE_2669E|loading'];
      const vs = { info: { vsl: 'STSE', voy: '2669E', voy_d: '2669E', voy_l: '2670W' }, loading: sec };
      const E0 = Object.values(sec.ediContainers).filter((e) => isPtkCode(e.pol));
      const isE = (e) => String(e.fe).toUpperCase() === 'E';
      const is40 = (e) => /^4/.test(String(e.iso || ''));   // ISO 첫 자리 4 = 40피트(45xx 는 40피트 하이큐브 · 진짜 45피트는 L)
      const wFull = E0.filter((e) => isRfRaw(e) && !isE(e)).length, wE = E0.filter(isE).length, wERf = E0.filter((e) => isE(e) && isRfRaw(e)).length;
      const w40E = E0.filter((e) => isE(e) && is40(e)).length, w40ERf = E0.filter((e) => isE(e) && is40(e) && isRfRaw(e)).length;
      const flatS = B.flattenVoyages({ [k]: vs }), csS = flatS.filter((c) => c.voyageKey === k && c._mode === 'loading');
      const askS = (q) => String(B.answerOneRaw(q, { app: 'tally', voyages: { [k]: vs }, flat: flatS, voyageKey: k, voyage: vs, info: vs.info, mode: 'loading', containers: csS, portMisData: {}, _trace: {}, computeTallyData: B.computeTallyData }) || '');
      const split = (t, r) => `${t}(일반 ${t - r} · 리퍼 엠티 ${r})`;
      //  ① 별첨 — 수석 보드(legendLiveOf)와 인쇄 별첨(PrintableCargoPlanV2)이 같은 화물 종류 함수(legendCargoCatOf)를 쓴다
      const LS = B.legendLiveOf(csS, 'loading', {});
      const rfS = ((LS.cargos.find(([kk]) => kk === 'Reefer') || [])[1] || { total: { n: 0 } }).total.n;
      const feE = ['20', '40', '45'].reduce((a, s) => a + LS.fe[s].E.n, 0);
      ok(`STSE 2669E 선적 카고플랜 별첨 «Reefer» = EDI 풀 리퍼 ${wFull}대 (엠티 리퍼 ${wERf}대를 더하지 않는다 — 4.15 는 ${wFull + wERf})`, wFull > 0 && rfS === wFull, `Reefer ${rfS}`);
      ok(`별첨3 엠티 ${wE} 중 리퍼 엠티 ${wERf} — 엠티 구분 줄 «엠티 ${split(wE, wERf)}»`, wERf > 0 && feE === wE && (LS.emptyRf || {}).n === wERf, `엠티 ${feE} · 리퍼 엠티 ${(LS.emptyRf || {}).n}`);
      const cpSrc = src('src/components/PrintableCargoPlanV2.jsx');
      ok('배선 — 인쇄 별첨도 legendCargoCatOf 한 벌 · 별첨3 은 emptySplitLabel 로 엠티 구분 (규격 isReeferContainer 로 Reefer 를 세지 않는다)', /addTo\(cargoCounts, legendCargoCatOf\(c\), size\)/.test(cpSrc) && /isEmptyReefer\(c\)\) emptyRf\+\+/.test(cpSrc) && /emptySplitLabel\(totE, emptyRf\)/.test(cpSrc) && !/isReeferContainer\(c\)\) cat = 'Reefer'/.test(cpSrc));
      //  ② 엠티 구분 표기 — 현황 탭 · 브리핑 · 미르 «엠티 몇 대» · «40엠티 몇 대»
      const stS = B.computeAllStats(csS, {}, {}, 'loading', vs);
      ok(`현황 탭 Empty ${wE} · 리퍼 엠티 ${wERf} (특수 화물 «리퍼» 는 ${wFull})`, stS.byFE.E.total === wE && stS.byFE.E.rf === wERf && stS.bySpecial.rf.total === wFull, `E ${stS.byFE.E.total}·${stS.byFE.E.rf} · 리퍼 ${stS.bySpecial.rf.total}`);
      const brS = String(B.generateBriefing(csS, '선적', 'loading') || '');
      ok(`선적 브리핑 작업 줄 «Empty ${split(wE, wERf)}»`, brS.includes(`Empty ${split(wE, wERf)}`), (brS.split('\n')[1] || '').slice(0, 120));
      const a40 = askS('40엠티 몇 대'), aE = askS('엠티 몇 대'), aR = askS('리퍼 몇 대');
      ok(`미르 «40엠티 몇 대» = ${w40E}대 · «Empty ${split(w40E, w40ERf)}» — 리퍼 엠티 ${w40ERf}`, w40ERf > 0 && /40피트 엠티:\s*(\d+)대/.test(a40) && Number(a40.match(/40피트 엠티:\s*(\d+)대/)[1]) === w40E && a40.includes(`Empty ${split(w40E, w40ERf)}`), a40.split('\n').slice(0, 2).join(' | '));
      ok(`미르 «엠티 몇 대» «Empty ${split(wE, wERf)}» · «리퍼 몇 대» ${wFull} (엠티 리퍼를 리퍼에 합산하지 않는다)`, aE.includes(`Empty ${split(wE, wERf)}`) && num(aR) === wFull, `${aE.split('\n')[1]} | ${aR.split('\n')[0]}`);
      //  Fable 판정 2026-10-09 — 리퍼 엠티를 콕 집어 물으면 «리퍼 엠티 41대» 로만(«일반 0» 구분은 엠티 전체를 물을 때만)
      const aRE = askS('리퍼 엠티 몇 대');
      ok(`미르 «리퍼 엠티 몇 대» = ${wERf}대 — 구분 표기(«일반 0») 없이`, num(aRE) === wERf && !/\(일반 /.test(aRE), aRE.split('\n').slice(0, 2).join(' | '));
      //  ③ 마감텔리 — RF 시트(온도 확인 대상)는 풀 리퍼만 · 선사 줄 RH 는 풀만, 엠티 리퍼는 «EMPTY RH» 로 따로 · 미르 «마감텔리» 수치의 RF out
      const tS = B.computeTallyData(vs);
      const rmk = (tS.osOut.remarks || []).join(' / ');
      //    선사 서류에 없던 영문 «EMPTY RH» 는 짓지 않는다(규범 §11 · Fable 판정) — 엠티 리퍼는 OS EMPTY 줄의 «RH x N» 이 구분한다.
      const emRh = (tS.osOut.rows || []).filter((r) => r.fe === 'EMPTY').reduce((a, r) => a + (r.rf || 0) + (r.rh || 0), 0);
      ok(`마감텔리 RF 시트(선적) = 풀 리퍼 ${wFull}줄 · 선사 줄 «( RH x ${wFull} )» · 엠티 리퍼 ${wERf} 는 EMPTY 줄 태그 (4.15 는 RF ${wFull + wERf} · RH x ${wFull + wERf})`, tS.rfOut.length === wFull && rmk.includes(`( RH x ${wFull} )`) && !/EMPTY RH/.test(rmk) && emRh === wERf, `RF ${tS.rfOut.length} · EMPTY 줄 RH ${emRh} · ${rmk.slice(0, 140)}`);
      //  ── 두 앱 같은 답(ConeOne 2.67 · 검수사 «검수앱과 콘앱에 공통되는 질문이라면 답은 같아야 한다»). 콘앱 행은 cone.html 의 _ediRowOf 실소스로 만든다(ConeMir 는 같은 번들).
      {
        const html = src('public/cone.html');
        const fnSrc = (name) => (html.match(new RegExp(`function ${name}\\(c\\)\\{[\\s\\S]*?\\n\\}\\n`)) || [''])[0];
        const vctx = { console, window: { ConeMir: { isReeferContainer: B.isReeferContainer }, ConeParse: { isFlatRackContainer: B.isFlatRackContainer } } };
        require('vm').createContext(vctx); require('vm').runInContext(fnSrc('coneIsReefer') + fnSrc('_ediRowOf') + '\nthis.__rowOf = typeof _ediRowOf === "function" ? _ediRowOf : null;', vctx);
        const both = [['STSE_2669E', { info: vs.info, loading: sec, discharge: fx('conepos_live.json')['STSE_2669E|discharge'] }], ['OBWH_2749E', fx('ferry1700.json').voyages.OBWH_2749E]].map(([kk, vo]) => {
          const ptkM = (m, e) => isPtkCode(m === 'discharge' ? e.pod : e.pol);
          const ed = (m) => Object.values((vo[m] || {}).ediContainers || {}).filter((e) => e.bay && e.tier && ptkM(m, e));
          const wantRow = ['discharge', 'loading'].reduce((a, m) => a + ed(m).filter(isRfRaw).length, 0);   // 원자료 리퍼(§7.1 규격 · rf) — 자리 있는 평택분
          const rows = (m) => ed(m).map(vctx.__rowOf);
          const dR = vctx.__rowOf ? rows('discharge') : [], lR = vctx.__rowOf ? rows('loading') : [];
          const coneRf = dR.concat(lR).filter((r) => r.reefer).length;
          const flatT = B.flattenVoyages({ [kk]: vo });
          const tA = String(B.answerOneRaw('리퍼 몇 대', { app: 'tally', voyages: { [kk]: vo }, flat: flatT, voyageKey: kk, voyage: vo, info: vo.info, mode: 'discharge', containers: flatT.filter((c) => c.voyageKey === kk), portMisData: {}, _trace: {} }) || '');
          const cs = B.toMirContainers(dR, 'discharge').concat(B.toMirContainers(lR, 'loading'));
          const cA = String(B.answerOneRaw('리퍼 몇 대', { app: 'cone', containers: cs, cone: { rows: [], dischRows: dR, stowRows: lR }, accepted: true, mode: 'discharge', modeLabel: '양하', info: vo.info, voyage: { info: vo.info, reports: {}, discharge: { records: (vo.discharge || {}).records || {} }, loading: { records: (vo.loading || {}).records || {} } }, vsl: vo.info.vsl, portMisData: {}, _trace: {} }) || '');
          return { kk, wantRow, coneRf, t: num(tA), c: num(cA) };
        });
        ok(`두 앱 같은 답 — 콘앱 미르 «리퍼 몇 대» = 검수앱(${both.map((b) => `${b.kk} ${b.t}`).join(' · ')}) · 콘앱 행 ❄ 리퍼 = 원자료 리퍼(${both.map((b) => b.wantRow).join(' · ')}) — 정규식 사본이 아니라 utils 한 벌`,
          both.every((b) => b.t > 0 && b.c === b.t && b.coneRf === b.wantRow), both.map((b) => `${b.kk} 검수앱 ${b.t} 콘앱 ${b.c} · 행 ❄ ${b.coneRf}/${b.wantRow}`).join(' | '));
        //  ── ConeOne 2.67 (Fable 판정) — 콘앱 미르 재료에 리스트(records) 표식(제작컨·리퍼드라이·고른 규격)을 검수앱 병합과 같은 순위로 얹는다(cone.html coneRecRows — 미르가 이미 받는 records 만).
        //  RZOR R098E 양하(제작컨 HSAP 8)는 자리 없는 리스트라 실제 콘앱은 양하 행을 안 만든다 — 같은 행을 자리 조건 없이 _ediRowOf 로 만들어 표식 얹기만 잰다. 기대값은 위 wantOf(원자료 규격·fe + records mkcon·rfdry).
        {
          {
            const vc2 = { console, window: { ConeMir: { isReeferContainer: B.isReeferContainer, isoPickOog: B.isoPickOog }, ConeParse: { isFlatRackContainer: B.isFlatRackContainer } } };
            const fnSrc2 = (name) => (html.match(new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}\\n`)) || [''])[0];
            require('vm').createContext(vc2);
            require('vm').runInContext(['coneIsReefer', 'coneRecMark', 'coneRecRows', '_ediRowOf'].map(fnSrc2).join('') + '\nthis.__rowOf = _ediRowOf; this.__recRows = typeof coneRecRows === "function" ? coneRecRows : null;', vc2);
            const kR = 'RZOR_R098E', vR = { info: { vsl: 'RZOR', voy: 'R098E', voy_d: 'R098E' }, discharge: { ediContainers: mk.edi, records: mk.rec } };
            const dR2 = Object.values(mk.edi).filter((e) => isPtkCode(e.pod)).map(vc2.__rowOf);
            const marked = vc2.__recRows ? vc2.__recRows(dR2, mk.rec) : dR2;
            const csR = B.toMirContainers(marked, 'discharge');
            const cR = num(String(B.answerOneRaw('리퍼 몇 대', { app: 'cone', containers: csR, cone: { rows: [], dischRows: marked, stowRows: [] }, accepted: true, mode: 'discharge', modeLabel: '양하', info: vR.info, voyage: { info: vR.info, reports: {}, discharge: { records: mk.rec }, loading: { records: {} } }, vsl: 'RZOR', portMisData: {}, _trace: {} }) || ''));
            const wired = /toMirContainers\(coneRecRows\(rows, mode==='loading'\?\(mc&&mc\.recL\):\(mc&&mc\.recD\)\)/.test(html);
            ok(`두 앱 같은 답 — RZOR R098E 콘앱 미르 «리퍼 몇 대» = 검수앱 ${want} (리스트의 제작컨 8 을 얹어 빼고 — 얹기 전 콘앱 40) · 미르 묻기(paint)가 coneRecRows 를 거친다`, cR === want && wired, `콘앱 ${cR} · 검수앱 ${want} · 배선 ${wired}`);
          }
        }
      }
      const aT = askS('마감텔리');
      ok(`미르 «마감텔리» — RF out ${wFull} · 선적 엠티 «엠티 ${split(wE, wERf)}»`, /RF in 0 · out (\d+)/.test(aT) && Number(aT.match(/RF in 0 · out (\d+)/)[1]) === wFull && aT.includes(`엠티 ${split(wE, wERf)}`), aT.split('\n').slice(2, 4).join(' | ').slice(0, 200));
    }
  }


  // ══ 4.16 — 판 B(시프팅) · 검수사 2026-10-09 12:23 §7.8-①②⑤ + 판 B 수리(SHIFTING 시트) ═══════════════════════
  //  독립 재료 — BAPLIE 원문을 앱 파서와 따로 읽는다(LOC+147 자리 · EQD 컨번호·규격·풀엠티 · LOC+11 POD · LOC+9 POL · DGS 유무).
  const rawBap = (txt) => {
    const out = []; let cur = null;
    for (const s0 of String(txt || '').replace(/\r?\n/g, '').split("'")) {
      const s = s0.trim();
      if (s.startsWith('LOC+147+')) { cur = { pos: s.split('+')[2].split(':')[0], dg: false }; out.push(cur); continue; }
      if (!cur) continue;
      if (s.startsWith('LOC+11+')) cur.pod = s.split('+')[2].split(':')[0];
      else if (s.startsWith('LOC+9+')) cur.pol = s.split('+')[2].split(':')[0];
      else if (s.startsWith('EQD+CN+')) { const p = s.split('+'); cur.cn = (p[2] || '').split(':')[0].replace(/\s/g, ''); cur.iso = (p[3] || '').split(':')[0]; cur.fe = p[6] === '4' ? 'E' : (p[6] === '5' ? 'F' : ''); }
      else if (s.startsWith('DGS+')) cur.dg = true;
    }
    return out.filter((c) => c.cn);
  };
  const docCns = (rl) => Object.keys(rl || {}).filter((k) => CN_RE.test(k));
  const SS = fx('shiftsplit416.json');
  const mcat = fx('restow_mcat.json');
  for (const m of ['discharge', 'loading']) mcat[m].ediContainers = B.ediMapFromRaw(mcat[m]);   // 수집기 저장 꼴(원문 파싱 전체) — 기대값은 아래 rawBap 으로 따로 센다
  //  화면 입구(홈 카드·출력 센터)는 jsdom 에서 실소스를 돌린다(쓰기 없음 — 메모리 스텁).
  const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
  const domSrc = (() => {
    const o = path.join(TMP, 'dom416.js');
    execSync(`npx esbuild tools/smoke_regress_dom.jsx --bundle --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    return fs.readFileSync(o, 'utf8');
  })();
  const domOpen = (r17) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const errs = []; dom.window.addEventListener('error', (e) => errs.push(e.message));
    if (r17) dom.window.__R17 = r17;
    try { dom.window.eval(domSrc); } catch (e) { errs.push('THROW ' + e.message); }
    return { dom, errs, W: dom.window, d: dom.window.document };
  };
  const DOM0 = domOpen('');

  // ── R16 ───────────────────────────────────────────────────────────────
  head('R16 시프팅 분리 — 양하·선적 평택분(리스트)과 시프팅 리스트를 따로 센다 · 미르·예상 시간 분모 = 양하 + 선적 + 2×시프팅 (4.16)', '검수사 §7.8-① «양하리스트와 분리 시프팅 리스트 별도 관리» · Fable 판정 ①④⑤ · 검수사 원문 «279+95 214+95»');
  {
    const key = 'MCAP_639N', v0 = { ...SS.MCAP_639N, key };
    const rawD = rawBap(v0.discharge.raw.edi.text), rawL = rawBap(v0.loading.raw.edi.text);
    //  BAPLIE 원문 평택분 — 양하는 검수사·수석이 고른 POD(records pod_pick — 3.53 «고른 POD 가 EDI 를 이긴다»)가 원문 POD 를 이긴다(MCAP 639N 은 5대가 고른 POD 로 평택분).
    const recD0 = v0.discharge.records || {};
    const podOf = (c) => (recD0[c.cn] && recD0[c.cn].pod_pick && recD0[c.cn].pod ? recD0[c.cn].pod : c.pod);
    const dPtk = rawD.filter((c) => isPtkCode(podOf(c))).length, lPtk = rawL.filter((c) => isPtkCode(c.pol)).length;
    const doc = docCns(v0.restowList);                                                                              // 선사 RESTOW LIST
    //  ① 홈 카드 막대(HomePage.computeStats 실소스) = 평택분
    const H = JSON.parse(DOM0.W.__r416.homeTotals(JSON.stringify(v0), key));
    ok(`MCAP 639N 홈 카드 막대 양하 0/${dPtk} · 선적 0/${lPtk} = BAPLIE 평택분 — 시프팅 ${doc.length}대는 막대에 안 섞인다(수정 전 0/${dPtk + doc.length} · 0/${lPtk + doc.length}) · 작업량은 ${dPtk + doc.length}·${lPtk + doc.length} 그대로(출항 배지)`,
      DOM0.errs.length === 0 && H.dis.total === dPtk && H.lod.total === lPtk && H.dis.workTotal === dPtk + doc.length && H.lod.workTotal === lPtk + doc.length, `${JSON.stringify(H)} ${DOM0.errs[0] || ''}`);
    //  ② 새는 길 — 시프팅 내림·재선적(실제 자리 기록 + 완료)을 메모리에서만 얹는다(3.65 실제 자리 · 완료 기록은 옮기지 않는다)
    const v = JSON.parse(JSON.stringify(v0)); v.key = key + '_R16';
    const at = Date.parse('2026-10-09T12:00:00+09:00');
    v.discharge.completed = {}; v.loading.completed = {};
    for (const cn of doc) {
      const to = String(v.restowList[cn].to).padStart(7, '0');
      v.discharge.completed[cn] = { at, by: '연막' };
      v.loading.records[cn] = { cn, bay_actual: String(parseInt(to.slice(0, 3), 10)), row_actual: to.slice(3, 5), tier_actual: to.slice(5, 7), actual_at: at + 1, actual_by: '연막' };
      v.loading.completed[cn] = { at: at + 2, by: '연막' };
    }
    const flat = B.flattenVoyages({ [v.key]: v });
    const lodPtk = flat.filter((c) => c._mode === 'loading' && c._ptk).length;
    const askL = String(B.answerOneRaw('선적 몇 대', { app: 'tally', voyageKey: v.key, voyage: v, info: v.info, containers: flat, mode: 'loading', modeChoice: 'both', portMisData: {}, _trace: {} }) || '');
    const nL = Number((askL.match(/선적:?\s*(\d+)대/) || [])[1]);
    ok(`시프팅 재선적 기록 ${doc.length}대가 생겨도 미르 재료 선적 평택분 ${lPtk} · «선적 몇 대» ${lPtk}대 (수정 전 ${lPtk + doc.length})`, lodPtk === lPtk && nL === lPtk, `재료 ${lodPtk} · 답 ${askL.split('\n')[0]}`);
    const H2 = JSON.parse(DOM0.W.__r416.homeTotals(JSON.stringify(v), v.key));
    const sp = B.shiftSplitOf(v.key, v);
    ok(`그 뒤 홈 카드 선적 ${H2.lod.done}/${H2.lod.total} = 평택분 0/${lPtk} · 시프팅 내림 ${sp.out.done}/${doc.length} · 실음 ${sp.in.done}/${doc.length} · 모브 ${sp.moves.done}/${2 * doc.length}`,
      H2.lod.total === lPtk && H2.lod.done === 0 && sp.out.done === doc.length && sp.in.done === doc.length && sp.moves.done === 2 * doc.length, JSON.stringify({ lod: H2.lod, out: sp.out, in: sp.in }));
    //  ③ 미르·예상 시간 분모 — 양하 평택 + 선적 평택 + 2×시프팅(리스트 유무 무관 — Fable 판정 ④)
    const vc = B.voyageCountsOf(v0, null, B.shiftCnSetOf(key, v0));
    ok(`MCAP 639N 미르 분모 ${dPtk} + ${lPtk} + 2×${doc.length} = ${dPtk + lPtk + 2 * doc.length} · 양하·선적 줄은 평택분`,
      vc.total === dPtk + lPtk + 2 * doc.length && vc.byMode.discharge.total === dPtk && vc.byMode.loading.total === lPtk && vc.shift && vc.shift.moves.total === 2 * doc.length, JSON.stringify({ t: vc.total, d: vc.byMode.discharge.total, l: vc.byMode.loading.total, s: vc.shift }));
    const mD = rawBap(mcat.discharge.raw.edi.text).filter((c) => isPtkCode(c.pod)).length, mL = rawBap(mcat.loading.raw.edi.text).filter((c) => isPtkCode(c.pol)).length, mS = docCns(mcat.restowList).length;
    const vcM = B.voyageCountsOf({ ...mcat, key: 'MCAT_635N' }, null, B.shiftCnSetOf('MCAT_635N', mcat));
    ok(`리스트 없는 배 MCAT 635N 도 같은 셈 — ${mD} + ${mL} + 2×${mS} = ${mD + mL + 2 * mS} (수정 전 ${mD + mL} — 리스트 없는 배는 시프팅을 안 셌다)`, vcM.total === mD + mL + 2 * mS && vcM.byMode.discharge.total === mD && vcM.byMode.loading.total === mL, JSON.stringify({ t: vcM.total, d: vcM.byMode.discharge.total, l: vcM.byMode.loading.total }));
    const tm = String(B.answerTotalMoves(v0, 'MCAP', { eta: B.movesOfVoyage(v0, key) }) || '');
    ok(`미르 «총 무브수» — «양하 ${dPtk}대 → … · 선적 ${lPtk}대 → … · 시프팅 ${doc.length}대 → ${2 * doc.length}무브»`, new RegExp(`양하 ${dPtk}대 → \\d+무브 · 선적 ${lPtk}대 → \\d+무브 · 시프팅 ${doc.length}대 → ${2 * doc.length}무브`).test(tm), tm.split('\n')[1] || tm);
    //  ④ 선사 리스트에 실려 온 시프팅은 평택분에도 센다 — 검수사 원문 «279+95 214+95»(MCSC 633N 양하 · 635S 선적, Fable 판정 ⑤)
    const FXM = fx('progress_mcsc.json'), SBM = fx('shifting_berth.json').MCSC_633N;
    const expand = (o, k) => { const r = {}; for (const [cn, c] of Object.entries(o)) r[cn] = { bay: c.b, row: c.r, tier: c.t, [k]: c[k], iso: c.i, fe: c.f }; return r; };
    const sw = B.swapFixList({ swapFix: FXM.swapFix });
    const ssM = new Set(Object.keys(B.computeShiftingMap(B.applySwapFix(expand(SBM.d, 'pod'), sw), B.applySwapFix(expand(SBM.l, 'pol'), sw), { berthShift: SBM.bs }) || {}).filter((k) => !k.startsWith('_')));
    const pD = B.progressOf(FXM.discharge, 'discharge', ssM), pL = B.progressOf(FXM.loading, 'loading', ssM);
    //  ⑤ 방향을 가린다(Fable 판정 2026-10-09) — 양하 리스트에 시프팅 컨이 실려 와도 양하 평택분에 넣지 않는다(규칙 ① 우선). 실자료에 사례가 없어 MCAP 양하 리스트 사본에 시프팅 한 대를 섞는다.
    {
      const vx = JSON.parse(JSON.stringify(v0)); vx.key = key + '_R16x';
      const sx = doc[0];
      vx.discharge.records[sx] = { cn: sx, _source: 'MCAP639N_DISCHARGE_LIST.xlsx', pol: 'PHDVO', pod: 'KRPTK', iso: '45G1', op: 'MAE', wt: 3700 };   // 선사 양하 리스트 행 꼴(변이)
      const Hx = JSON.parse(DOM0.W.__r416.homeTotals(JSON.stringify(vx), vx.key));
      const vcx = B.voyageCountsOf(vx, null, B.shiftCnSetOf(vx.key, vx));
      const px = B.progressOf(vx.discharge, 'discharge', B.shiftCnSetOf(vx.key, vx));
      ok(`양하 리스트 사본에 시프팅 ${sx} 를 섞어도 양하 평택분 ${dPtk} 그대로(홈 카드 · 미르 분모 · 작업량 ${dPtk + doc.length}) — 시프팅으로만 센다(수정 전 ${dPtk + 1})`,
        Hx.dis.total === dPtk && vcx.byMode.discharge.total === dPtk && px.ptk.total === dPtk && px.total === dPtk + doc.length, JSON.stringify({ home: Hx.dis, vc: vcx.byMode.discharge.total, ptk: px.ptk, total: px.total }));
    }
    ok(`MCSC — 양하 ${pD.ptk.total}+${pD.shift.total} · 선적 ${pL.ptk.total}+${pL.shift.total} = 검수사 원문 «279+95 214+95» (선적 리스트에 실린 시프팅 TGHU6154253 은 양쪽에 — 수정 전 213)`,
      pD.ptk.total === 279 && pL.ptk.total === 214 && pD.shift.total === 95 && pL.shift.total === 95, JSON.stringify({ d: pD.ptk, l: pL.ptk, s: pD.shift.total }));
  }

  // ── R17 ───────────────────────────────────────────────────────────────
  head('R17 종이 카고플랜에도 예측 시프팅 — ◇ «확정 아님» (출력 센터 = 항차 화면 = 콘앱 같은 지도) (4.16)', '검수사 §7.8-② «그래야 준비 할수 있음(대신 확정아님 표기)» · Fable 판정 ⑥ «대수 확정·자리 예측이면 ◇»');
  {
    //  KSKM 2617N — 선사 서류·선적 EDI 가 없는 배. 독립: 양하 원문(ASC)의 27-01-90 컨 · 배정표 이적 2모브 = 1대(검수사 3.53-02 «터미널은 시프팅1개를 잡았습니다»).
    const K = fx('shifting_pregone.json');
    const at270190 = (K.text.split('\n').map((l) => l.match(/^(\d{6})\s+([A-Z]{4}\d{7})/)).find((m) => m && m[1] === '270190') || [])[2];
    const wantN = Math.round(Number(K.info.berthShift) / 2);
    const paper = async (which) => {
      const R = domOpen(which);
      await sleep(1500);
      const tile = [...R.d.querySelectorAll('button.print-tile')].find((b) => /카고플랜/.test(b.textContent));
      if (tile) tile.click(); else R.errs.push('카고플랜 단추를 못 찾음');
      await sleep(5000);
      const d = R.d;
      const pred = [...d.querySelectorAll('.cpv2-cell.cpv2-shift-pred')];
      const boxOf = (el) => { let p = el; for (let k = 0; k < 10 && p; k++) { const t = [...(p.querySelectorAll ? p.querySelectorAll('*') : [])].find((e) => e.children.length === 0 && /^BAY /.test((e.textContent || '').trim())); if (t) return t.textContent.trim(); p = p.parentElement; } return ''; };
      return { errs: R.errs, shift: d.querySelectorAll('.cpv2-cell.cpv2-shift').length, pred: pred.length, predBays: pred.map(boxOf),
        head: [...d.querySelectorAll('[data-shift-head]')].map((e) => e.textContent.trim()), foot: ((d.querySelector('.cpv2-page-footer') || {}).textContent || '') };
    };
    const pk = await paper('kskm');
    ok(`KSKM 2617N 출력 센터 카고플랜 — ◇ 칸 ${wantN}(= 배정표 이적 ${K.info.berthShift}모브) · BAY 27 · 머리 «쉬프팅 ◇${wantN}» · 바닥글 «◇=예측(확정 아님)» (수정 전 출력 센터는 확정만 그려 0칸)`,
      pk.errs.length === 0 && pk.pred === wantN && pk.shift === wantN && pk.predBays.every((b) => /27/.test(b)) && pk.head.some((h) => h.includes(`쉬프팅 ◇${wantN}`)) && pk.foot.includes('◇=예측(확정 아님)'), JSON.stringify(pk).slice(0, 300));
    const pm = await paper('mcap');
    const mcDoc = docCns(fx('shiftbay_mcap639n.json').restowList).length;
    ok(`MCAP 639N(선사 RESTOW LIST ${mcDoc}대 — 확정) 은 ◆ ${mcDoc}칸 · ◇ 0칸 그대로`, pm.errs.length === 0 && pm.shift === mcDoc && pm.pred === 0, JSON.stringify(pm).slice(0, 200));
    //  두 앱 같은 예측 — 콘앱 cone.html 의 실제 함수(ctPredShiftMap)를 꺼내 같은 재료로 돌린다(번들 예측 함수 · 항로표 · 양하 리스트 · 베이사전).
    const html = src('public/cone.html');
    const fnSrc = (html.match(/let _ctLaneLoaded = false;\nasync function ctPredShiftMap\(v, sh\)\{[\s\S]*?\n\}\n/) || [''])[0];
    B.setLaneRoutes({ IHS1: { rotation: ['CNXMN', 'KRINC', 'KRPTK'] } });
    global.window.__fbShipBayDict = { KSKM: { bayDef: { baysSummary: K.bay27 } } };
    const vT = { key: 'KSKM_2617N', info: { ...K.info }, discharge: { raw: { edi: { text: K.text, fileName: 'KSKM2617NXMNB.ASC' } } }, loading: {} };
    const tallyKeys = Object.keys(B.shiftingMapForDisplay('KSKM_2617N', vT) || {}).sort();
    const vctx = { console, state: { voyageKey: 'KSKM_2617N', disch: { rawEdi: K.text } },
      fbFetch: async (p) => ({ ok: true, json: async () => (p === 'lane_routes.json' ? { IHS1: { rotation: ['CNXMN', 'KRINC', 'KRPTK'] } } : {}) }),
      window: { ConeParse: { predictedShiftingForDisplay: B.predictedShiftingForDisplay, setLaneRoutes: B.setLaneRoutes } } };
    let coneKeys = null;
    if (fnSrc) { require('vm').createContext(vctx); require('vm').runInContext(fnSrc + '\nthis.__pred = ctPredShiftMap;', vctx); const r = await vctx.__pred({ _info: { ...K.info } }, { berthShift: K.info.berthShift, terminalStatus: K.info.terminalStatus }); coneKeys = Object.keys(r || {}).sort(); }
    const wired = /ConeParse = \{[^}]*predictedShiftingForDisplay/.test(src('src/coneCargoPlan.entry.jsx')) && /if\(!Object\.keys\(shiftingMap\)\.length && !_isDoc\)\{\s*const _pr = await ctPredShiftMap\(_v, _sh\);/.test(html);
    ok(`두 앱 같은 예측 — 검수앱 [${tallyKeys.join(',')}] = 콘앱 [${(coneKeys || []).join(',')}] = 양하 원문 27-01-90 «${at270190}» · 콘앱 카고플랜이 확정 지도가 빌 때 이것을 부른다(배선)`,
      !!at270190 && tallyKeys.length === wantN && tallyKeys[0] === at270190 && JSON.stringify(coneKeys) === JSON.stringify(tallyKeys) && wired, `tally ${tallyKeys} · cone ${coneKeys} · 배선 ${wired}`);
  }

  // ── R18 ───────────────────────────────────────────────────────────────
  head('R18 «DG 몇 대» 는 평택분만 — 통과화물 DG 는 세지 않는다(지금 동작 고정)', '검수사 §7.8-⑤ «1»(감사 572 · 3.41)');
  {
    for (const [key, m, q, label] of [['MCAP_639N', 'discharge', '양하 DG 몇 대', 'MCAP 639N 양하'], ['MCAP_639N', 'loading', '선적 DG 몇 대', 'MCAP 639N 선적'], ['KBTR_2608E', 'discharge', '양하 DG 몇 대', 'KBTR 2608E 양하']]) {
      const v = { ...SS[key], key };
      const raw = rawBap(v[m].raw.edi.text);
      const dgAll = raw.filter((c) => c.dg).length, dgPtk = raw.filter((c) => c.dg && isPtkCode(m === 'discharge' ? c.pod : c.pol)).length;
      const flat = B.flattenVoyages({ [key]: v });
      const a = String(B.answerOneRaw(q, { app: 'tally', voyageKey: key, voyage: v, info: v.info, containers: flat, mode: m, modeChoice: m, portMisData: {}, _trace: {} }) || '');
      const nA = Number((a.match(/위험물[^:\n]*:\s*(\d+)대/) || [])[1]);
      ok(`${label} — EDI DG ${dgAll}대 중 평택분 ${dgPtk} → «${q}» ${dgPtk}대`, dgAll > 0 && nA === dgPtk, a.split('\n')[0]);
    }
  }

  // ── R19 ───────────────────────────────────────────────────────────────
  head('R19 마감텔리 SHIFTING 시트·Final Work 시프팅 칸은 지도 꼴대로 읽는다 — 컨번호·규격·자리·PORT 를 채운다 (4.16)', '판 B(§7.8-①) · 4.15 기준표 §3-B «R12 곁가지» · Fable 판정 ⑦ «PORT = EDI POD, 없으면 선사 서류 POD»');
  {
    const p3 = (code) => String(code || '').toUpperCase().slice(2, 5);
    const szOf = (iso) => { const s = String(iso || '').toUpperCase(); if (/^2/.test(s)) return '20'; if (/^4[5-9]/.test(s) || /^40H[CRQ]/.test(s)) return 'HC'; if (/^4/.test(s)) return '40'; return '?'; };
    const fmt7 = (p) => { const s = String(p || '').padStart(7, '0'); return `${String(parseInt(s.slice(0, 3), 10)).padStart(2, '0')}-${s.slice(3, 5)}-${s.slice(5, 7)}`; };
    for (const [label, v0, key] of [['MCAP 639N', SS.MCAP_639N, 'MCAP_639N'], ['MCAT 635N', mcat, 'MCAT_635N']]) {
      const v = { ...v0, key };
      const doc = v.restowList, cns = docCns(doc).sort();
      const byCn = Object.fromEntries(rawBap(v.discharge.raw.edi.text).map((c) => [c.cn, c]));
      const want = cns.map((cn) => { const e = byCn[cn] || {}, dd = doc[cn]; return { cn, port: p3(e.pod || dd.pod), sz: szOf(e.iso || dd.sztp), fe: e.fe || (String(dd.fe).toUpperCase() === 'E' ? 'E' : 'F'), old: fmt7(dd.from) }; });
      const rows = B.buildShifting(v);
      const got = rows.map((r) => ({ cn: r.cn, port: r.pod, sz: r.sz, fe: r.fe, old: r.oldPos })).sort((a, b) => String(a.cn || '').localeCompare(String(b.cn || '')));
      const bad = want.filter((w, i) => !got[i] || JSON.stringify(got[i]) !== JSON.stringify(w));
      ok(`${label} SHIFTING 시트 ${cns.length}행 — 컨번호·PORT(원문 POD)·규격 칸·F/E·OLD POSN(서류 자리) = 원문·선사 서류 (수정 전 컨번호·규격·자리 빈칸)`, got.length === cns.length && !bad.length, bad.slice(0, 2).map((w) => `${w.cn} 기대 ${JSON.stringify(w)} · 앱 ${JSON.stringify(got.find((g) => g.cn === w.cn) || null)}`).join(' | '));
      const agg = {}; for (const w of want) { const k = `${w.port}/${w.fe}/${w.sz}`; agg[k] = (agg[k] || 0) + 1; }
      const td = B.computeTallyData(v);
      const fw = {}; for (const r of td.rows || []) for (const [sz, nn] of Object.entries(r.shift || {})) { const k = `${r.port}/${r.fe}/${sz}`; fw[k] = (fw[k] || 0) + nn; }
      const opOk = rows.every((r) => r.op && r.op !== '???');
      ok(`${label} Final Work 시프팅 칸 ${JSON.stringify(agg)} = 원문 POD·규격·F/E 로 센 것 · 선사 칸 «???» 없음 (수정 전 «???/???/F HC ${cns.length}»)`, JSON.stringify(Object.entries(fw).sort()) === JSON.stringify(Object.entries(agg).sort()) && opOk && td.totals.shift.n === cns.length, `${JSON.stringify(fw)} · op ${rows.map((r) => r.op).join(',')}`);
    }
  }


  // ══ 4.17 — 미르 셋 · 검수사 2026-10-09 12:23 §7.8-③⑧⑫ ═══════════════════════════════════════════════════════
  //  독립 재료 — 완료 시각 → 근무일 조 키를 이 파일이 따로 정한다(검수사 §4.2-F-2: 야간은 시작한 날 · 00:00~06:29 는 전날 야간 · 06:30~17:30 주간 · 17:30~ 야간).
  const wkKey = (ms) => {
    const d = new Date(ms); const mm = d.getHours() * 60 + d.getMinutes();
    const day = mm < 390 ? new Date(ms - 864e5) : d;
    return `${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')} ${mm < 390 || mm >= 1050 ? '야간' : '주간'}`;
  };
  const doneBy = (voy) => {   // { 키: { discharge, loading } } · noAt
    const o = { keys: {}, noAt: 0 };
    for (const m of ['discharge', 'loading']) for (const r of Object.values((voy[m] || {}).completed || {})) {
      if (!r || r.flag === 'missing') continue;
      if (!(Number(r.at) > 0)) { o.noAt += 1; continue; }
      const k = wkKey(Number(r.at)); const b = o.keys[k] || (o.keys[k] = { discharge: 0, loading: 0 }); b[m] += 1;
    }
    return o;
  };
  const RealDate417 = Date;
  const atFix = (iso, fn) => { const FIX = Date.parse(iso); class F extends RealDate417 { constructor(...a) { if (a.length) super(...a); else super(FIX); } static now() { return FIX; } } global.Date = F; try { return fn(); } finally { global.Date = RealDate417; } };
  const tallyCtx417 = (vk, v, voyages, extra) => { const flat = B.flattenVoyages(voyages); return Object.assign({ app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both', countFallback: true, portMisData: {}, voyages, flat, voyageKey: vk, voyage: v, info: v.info, mode: 'discharge', containers: flat.filter((x) => x.voyageKey === vk), _trace: {} }, extra || {}); };
  //  콘앱 — cone.html mirAsk 모양(원본엔 EDI 묶음 없이 완료·리스트만 · 컨은 EDI 행)
  const coneCtx417 = (vk, v) => { const D = v.discharge || {}, L = v.loading || {}; const comp = Object.assign({}, D.completed || {}, L.completed || {});
    const paint = (rows, mode) => B.toMirContainers(rows, mode).map((c) => (c && c.cn && comp[c.cn] && !c._comp ? Object.assign({}, c, { _comp: comp[c.cn] }) : c));
    return { app: 'cone', containers: paint(Object.values(D.ediContainers || {}), 'discharge').concat(paint(Object.values(L.ediContainers || {}), 'loading')), cone: { rows: [], dischRows: [], stowRows: [] }, execDevice: true, shiftN: 0, mode: 'discharge', modeLabel: '양하',
      info: v.info, compMap: comp, voyage: { info: v.info, reports: v.reports || {}, restowList: v.restowList || null, discharge: { completed: D.completed || {}, records: D.records || {} }, loading: { completed: L.completed || {}, records: L.records || {} } },
      vsl: v.info.vsl, vslFull: v.info.vslFull || '', voyageKey: vk, records: { discharge: D.records || {}, loading: L.records || {} }, portMisData: {}, _trace: {} }; };
  const say = (q, ctx) => { const a = B.answerOneRaw(q, ctx); return a == null ? '' : String(a); };

  // ── R20 ───────────────────────────────────────────────────────────────
  head('R20 지난 날(어제·그제) 진행·작업 선박은 날짜별 완료 기록으로 답한다 — 조 키는 근무일 기준 · 두 앱 같은 답 (감사 26 · 4.12-02 · 4.17)', '검수사 §7.8-③ «모든걸 알수 있으면 도움이 됨» · §4.2-F-5 폐기');
  {
    const H = fx('hatchauto.json');
    const swtd = { info: H.swtd.info, discharge: H.swtd.discharge, loading: H.swtd.loading }, kklc = { info: H.kklc.info, discharge: H.kklc.discharge, loading: H.kklc.loading };
    const vk = 'SWTD_9013E', DB = doneBy(swtd);
    const sumDay = (o, day) => Object.entries(o.keys).filter(([k]) => k.startsWith(day)).reduce((a, [, b]) => ({ d: a.d + b.discharge, l: a.l + b.loading }), { d: 0, l: 0 });
    //  ① «그제 몇 대 했어» — 기준 09-13 12:00 → 그제 = 09-11 근무일(주간 + 그 밤 야간)
    const w1 = sumDay(DB, '09-11');
    const [t1, c1] = atFix('2026-09-13T12:00:00+09:00', () => [say('그제 몇 대 했어', tallyCtx417(vk, swtd, { [vk]: swtd })), say('그제 몇 대 했어', coneCtx417(vk, swtd))]);
    const n1 = Number((t1.match(/완료 기록 (\d+)대/) || [])[1]);
    ok(`SWTD 9013E «그제 몇 대 했어»(09-13 기준) = 09-11 근무일 완료 기록 ${w1.d + w1.l}대(양하 ${w1.d} · 선적 ${w1.l}) — 수정 전 항차 전체 964/964`, n1 === w1.d + w1.l && t1.includes(`양하 ${w1.d}`) && t1.includes(`선적 ${w1.l}`), t1.split('\n')[0]);
    //  ② «어제 야간 몇 대» — 기준 09-12 12:00 → 09-11 야간(19:00~이튿날 06:29)
    const w2 = DB.keys['09-11 야간'] || { discharge: 0, loading: 0 };
    const [t2, c2] = atFix('2026-09-12T12:00:00+09:00', () => [say('어제 야간 몇 대', tallyCtx417(vk, swtd, { [vk]: swtd })), say('어제 야간 몇 대', coneCtx417(vk, swtd))]);
    const n2 = Number((t2.match(/완료 기록 (\d+)대/) || [])[1]);
    ok(`SWTD 9013E «어제 야간 몇 대»(09-12 기준) = 09-11 야간 완료 기록 ${w2.discharge + w2.loading}대 — 수정 전 검수앱 무응답 · 콘앱 콘 안내`, n2 === w2.discharge + w2.loading && /09-11 야간/.test(t2), t2.split('\n')[0]);
    ok('두 앱 같은 답 — «그제 몇 대 했어»·«어제 야간 몇 대» 검수앱 = 콘앱', t1 && t1 === c1 && t2 && t2 === c2, `검수앱 ${t1.slice(0, 50)} | 콘앱 ${c1.slice(0, 50)} || ${t2.slice(0, 40)} | ${c2.slice(0, 40)}`);
    //  ②-2 새벽(00:00~06:29)은 근무일이 하루 앞이다(§4.2-F-2) — 09-13 02:00 의 «어제» 는 09-11 근무일(달력 09-12 아님)
    const w3 = sumDay(DB, '09-11'), cal = sumDay(DB, '09-12');
    const t3 = atFix('2026-09-13T02:00:00+09:00', () => say('어제 몇 대 했어', tallyCtx417(vk, swtd, { [vk]: swtd })));
    ok(`새벽 02:00(09-13) «어제 몇 대 했어» = 근무일 09-11 ${w3.d + w3.l}대 — 달력 어제(09-12 ${cal.d + cal.l}대)가 아니다`, Number((t3.match(/완료 기록 (\d+)대/) || [])[1]) === w3.d + w3.l && /\(09-11\)/.test(t3), t3.split('\n')[0]);
    //  ③ «어제 작업한 배» — 작업일(planDate)이 그 날과 겹친 배 ∪ 그 날 완료 기록이 있는 배
    const VJ = fx('voyages.json').voyages;
    const dx = fx('bayview_dxqd.json');
    const home = { ...Object.fromEntries(Object.entries(VJ).map(([k, i]) => [k, { info: i }])), SWTD_9013E: swtd, KKLC_2608N: kklc, DXQD_2636E: { info: dx.info, discharge: dx.discharge, loading: dx.loading } };
    const kst = (x) => { const m = String(x || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/); return m ? Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+09:00`) : null; };
    const shipsOn = (iso) => {   // iso = 그 날 00:00 KST
      const d0 = Date.parse(iso), d1 = d0 + 864e5, md = iso.slice(5, 10);
      return Object.entries(home).filter(([, vv]) => {
        const [a0, b0] = String((vv.info || {}).planDate || '').split('~'); const a = kst(a0), b = b0 ? kst(b0) : a;
        const byPlan = a != null && a < d1 && (b == null ? a : b) >= d0;
        const byDone = Object.keys(doneBy(vv).keys).some((k) => k.startsWith(md));
        return byPlan || byDone;
      }).map(([k, vv]) => String(vv.info.vsl || k.split('_')[0])).sort();
    };
    for (const [now, day] of [['2026-09-15T12:00:00+09:00', '2026-09-14T00:00:00+09:00'], ['2026-09-02T12:00:00+09:00', '2026-09-01T00:00:00+09:00']]) {
      const want = shipsOn(day);
      const a = atFix(now, () => say('어제 작업한 배', { app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both', voyages: home, flat: B.flattenVoyages(home), shipCtx: null, portMisData: {}, _trace: {} }));
      const got = a.split('\n').map((l) => (l.match(/^([A-Z]{4}) \S+ — /) || [])[1]).filter(Boolean).sort();
      ok(`홈 «어제 작업한 배»(${now.slice(5, 10)} 기준) = 작업일·완료 기록으로 센 ${want.length}척 [${want.join(' ')}] — 수정 전 무응답`, want.length > 0 && got.join(' ') === want.join(' '), `답 [${got.join(' ')}] · ${a.split('\n')[0]}`);
    }
    //  ④ 완료 시각이 없는 기록(MCSC 635S progress_mcsc — 410건 at 없음)은 날짜·조로 못 가른다고 밝힌다(§4.2-F-3 과 같은 태도)
    const pm = fx('progress_mcsc.json'); const mcsc = { info: { vsl: 'MCSC', vslFull: 'MAERSK CHICAGO', voy_d: '635S' }, discharge: pm.discharge, loading: pm.loading };
    const nNoAt = doneBy(mcsc).noAt;
    const a4 = atFix('2026-09-01T12:00:00+09:00', () => say('어제 몇 대 했어', tallyCtx417('MCSC_635S', mcsc, { MCSC_635S: mcsc })));
    ok(`MCSC 635S 완료 시각 없는 기록 ${nNoAt}대 — «어제 몇 대 했어» 는 «날짜·조별로는 못 나눠요» 와 그 대수(수정 전 «컨 자료가 아직»)`, nNoAt > 0 && /날짜·조별로는 못 나눠요/.test(a4) && a4.includes(`${nNoAt}대`), a4.slice(0, 120));
  }

  // ── R21 ───────────────────────────────────────────────────────────────
  head('R21 없는 선박코드는 가장 가까운 코드로 바로 답하고 «OBWH 로 답했어요» 한 줄 — 같은 거리 둘 이상이면 그때만 되묻는다 · 두 앱 같은 답 (감사 587 · 3.38 · 4.17)', '검수사 §7.8-⑧ «2»');
  {
    const SC = fx('shipcodes417.json');
    const dictSave = global.window.__fbShipBayDict;
    global.window.__fbShipBayDict = Object.fromEntries(SC.bayDictKeys.map((k) => [k, SC.prevCodes[k] ? { code: k, prevCode: SC.prevCodes[k] } : {}]));   // 베이사전 키 · 옛 코드(prevCode)(RTDB 읽기 전용 사본)
    try {
      const VJ = fx('voyages.json').voyages, F = fx('ferry1700.json').voyages, K = fx('mirsame_kbtr.json');
      const voyages = { ...Object.fromEntries(Object.entries(VJ).map(([k, i]) => [k, { info: i }])), OBWH_2749E: F.OBWH_2749E, RZOR_R104E: F.RZOR_R104E, [K.voyageKey]: K.voyage, [SC.smyaVoyage.key]: { info: SC.smyaVoyage.info } };
      //  독립 거리 — 바꿈·넣기·빼기·이웃 자리바꿈 한 번이 1(검수사 «자리바꿈 포함» · OSA). 아는 코드 = 베이사전 키 ∪ 항차 코드.
      const dist = (a, b) => { const d = [...Array(a.length + 1)].map((_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 0; j <= b.length; j++) d[0][j] = j;
        for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) { d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); }
        return d[a.length][b.length]; };
      const U = [...new Set([...SC.bayDictKeys, ...Object.values(voyages).map((v) => String(v.info.vsl))])];
      const near = (t) => { const ds = U.map((c) => [c, dist(t, c)]); const m = Math.min(...ds.map((x) => x[1])); return { m, codes: ds.filter((x) => x[1] === m).map((x) => x[0]).sort() }; };
      const home = (q) => { const sc = B.pickShipCtx(q, voyages, null); return { sc, a: say(q, { app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both', voyages, flat: B.flattenVoyages(voyages), shipCtx: sc || null, portMisData: {}, _trace: {} }) }; };
      //  ① OWBH — OBWH 와 자리바꿈 한 번(거리 1, 하나뿐)
      const nO = near('OWBH'); const want1 = nO.m <= 2 && nO.codes.length === 1 ? nO.codes[0] : null;
      const obwhPtk = Object.values(F.OBWH_2749E.discharge.ediContainers).filter((c) => isPtkCode(c.pod)).length;   // 독립 — EDI 행을 POD 평택으로
      const h1 = home('OWBH 양하 몇 대'), h1x = home(`${want1} 양하 몇 대`);
      ok(`«OWBH 양하 몇 대» → 가장 가까운 ${want1}(거리 ${nO.m}) 로 바로 답하고 끝줄 «${want1} 로 답했어요.» · 양하 ${obwhPtk}대(수정 전 말없이 삼킴)`,
        want1 === 'OBWH' && h1.sc && h1.sc.info.vsl === want1 && h1.a === `${h1x.a}\n${want1} 로 답했어요.` && Number((h1.a.match(/양하: (\d+)대/) || [])[1]) === obwhPtk, h1.a.replace(/\n/g, ' | ').slice(0, 160));
      //  ② TNPJ — TNJP 와 자리바꿈(거리 1)
      const nT = near('TNPJ'); const want2 = nT.m <= 2 && nT.codes.length === 1 ? nT.codes[0] : null;
      const h2 = home('TNPJ 리퍼 몇 대'), h2x = home(`${want2} 리퍼 몇 대`);
      ok(`«TNPJ 리퍼 몇 대» → ${want2}(거리 ${nT.m}) 로 답하고 «${want2} 로 답했어요.»`, want2 === 'TNJP' && h2.a === `${h2x.a}\n${want2} 로 답했어요.`, h2.a.replace(/\n/g, ' | ').slice(0, 140));
      //  ③ SWSM — 거리 1 에 넷(SWMM·SWSI·SWSP·SWSR) → 그때만 되묻는다(검수앱 홈 · 콘앱 같은 말)
      const nS = near('SWSM');
      const h3 = home('SWSM 양하 몇 대');
      ok(`«SWSM 양하 몇 대» → 같은 거리(${nS.m}) ${nS.codes.length}척이라 «${nS.codes.join('·')} 중 어느 배요?» (수정 전 SWMM 으로 말없이)`, nS.codes.length > 1 && h3.a === `${nS.codes.join('·')} 중 어느 배요?`, h3.a.slice(0, 120));
      //  ④ ZZZZ — 거리 2 안에 코드가 없다 → 고치지 않는다(종전 그대로)
      const nZ = near('ZZZZ'), h4 = home('ZZZZ 양하 몇 대');
      ok(`«ZZZZ 양하 몇 대» → 가장 가까운 거리 ${nZ.m}(2 초과) — 고치지 않고 한 줄도 안 붙인다`, nZ.m > 2 && !/로 답했어요|어느 배요/.test(h4.a) && !h4.sc, h4.a.slice(0, 80));
      //  ④-2 옛 코드 — 별칭 표(베이사전 prevCode: SMYA ← RZSY)를 거리보다 먼저 본다(Fable 판정). 거리로만 재면 RZOR(2)로 엉뚱한 배가 된다.
      const oldOf = Object.fromEntries(Object.entries(SC.prevCodes).map(([cur, old]) => [old, cur]));
      const nR = near('RZSY'), wantA = oldOf.RZSY;
      const h45 = home('RZSY 양하 몇 대'), h45x = home(`${wantA} 양하 몇 대`);
      ok(`«RZSY 양하 몇 대» → 옛 코드 별칭 ${wantA}(베이사전 prevCode) 로 답하고 «${wantA} 로 답했어요(옛 코드 RZSY).» — 거리로 잰 가장 가까운 ${nR.codes.join('·')}(${nR.m}) 이 아니다(수정 전 RZOR)`,
        wantA === 'SMYA' && !nR.codes.includes(wantA) && h45.sc && h45.sc.info.vsl === wantA && h45.a === `${h45x.a}\n${wantA} 로 답했어요(옛 코드 RZSY).` && !/RZOR/.test(h45.a), h45.a.replace(/\n/g, ' | ').slice(0, 140));
      //  ⑤ 콘앱(KBTR 를 고른 채) «OWBH 양하 몇 대» — 배 옮기기(planCommand.pickVoyageKey — cone.html mirEnsureShip)가 OBWH 로 옮기고 같은 답 · «SWSM» 은 같은 되물음
      const cands = Object.entries(voyages).filter(([, v]) => v.discharge || v.loading).map(([k, v]) => ({ k, vsl: v.info.vsl }));
      const pick = (q) => B.pickVoyageKey(q, cands.map((x) => x.k), (k) => (cands.find((x) => x.k === k) || {}).vsl);
      const vk5 = pick('OWBH 양하 몇 대') || K.voyageKey;
      const c5 = say('OWBH 양하 몇 대', coneCtx417(vk5, voyages[vk5]));
      const vk6 = pick('SWSM 양하 몇 대') || K.voyageKey;
      const c6 = say('SWSM 양하 몇 대', coneCtx417(vk6, voyages[vk6]));
      ok(`두 앱 같은 답 — 콘앱(KBTR 고른 채) «OWBH 양하 몇 대» 는 ${vk5} 로 옮겨 검수앱 홈과 같은 답 · «SWSM» 은 같은 되물음 (수정 전 콘앱은 KBTR 102대)`, vk5 === h1.sc.key && c5 === h1.a && c6 === h3.a, `콘앱 ${vk5} ${c5.replace(/\n/g, ' | ').slice(0, 90)} || ${c6.slice(0, 60)}`);
      //  ⑥ 4.18-01 (ConeOne 2.69) — 콘앱 «수 질문» 도 질문 속 배가 먼저다. cone.html 의 실제 mirAsk·mirShipFirst·mirEnsureShip(+ 그 길의 mirTryOpen·mirEnsureCalc·표 읽기)를
      //    vm 에서 돌린다(ConeMir = 같은 번들 · Firebase·화면은 스텁 — 고른 배 자료는 픽스처). 라이브 실측: OBWH 를 고른 채 «KBTR/SMYA/RZSY 양하 몇 대» 가 전부 OBWH 수로 답했다.
      {
        const html = src('public/cone.html');
        const fnOf = (name) => (html.match(new RegExp(`(?:async )?function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}\\n`)) || [''])[0];
        const names = ['mirAsk', 'mirShipFirst', 'mirEnsureShip', 'mirTryOpen', 'mirEnsureCalc', 'coneQaRowsNow', 'coneRecRows', 'coneRecMark', 'coneIsReefer'];
        const code = names.map(fnOf);
        const list = Object.entries(voyages).map(([k, vv]) => ({ key: k, vsl: vv.info.vsl, _info: vv.info, noEdi: !((vv.discharge && (vv.discharge.ediContainers || vv.discharge.raw)) || (vv.loading && (vv.loading.ediContainers || vv.loading.raw))) }));
        const state = { voyages: list, voyageKey: '', disch: null, stow: null };
        const CMs = { answerOneRaw: B.answerOneRaw, answerOne: (q, c) => B.answerOneRaw(q, c), toMirContainers: B.toMirContainers, pickVoyageKey: B.pickVoyageKey, parseViewCommand: B.parseViewCommand, parseNaturalQuery: B.parseNaturalQuery,
          shipCodeInQuery: B.shipCodeInQuery, knownShipCodes: B.knownShipCodes, mirTone: B.mirTone, isReeferContainer: B.isReeferContainer, isoPickOog: B.isoPickOog, applyDischargeUnits: B.applyDischargeUnits,   // 4.20 / ConeOne 2.70
          askMir: async (q, ctx, f) => ({ text: f(q, {}), via: 'rules', trace: {} }), mirThreadCommit: () => null, mirThreadAlive: () => false };
        const sel = async (k) => { const vv = voyages[k]; state.voyageKey = k; state.disch = vv.discharge && vv.discharge.ediContainers ? { ediRows: Object.values(vv.discharge.ediContainers) } : null; state.stow = vv.loading && vv.loading.ediContainers ? { ediRows: Object.values(vv.loading.ediContainers) } : null; state.shipName = vv.info.vsl; };
        const vc = { console, Promise, setTimeout, state, localStorage: { getItem: () => '' }, window: { ConeMir: CMs, __fbShipBayDict: global.window.__fbShipBayDict }, document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
          ensureMir: async () => true, coneYardStatus: async () => null, coneMoodNote() {}, coneMoodEvent() {}, selectVoyage: sel, runCalc: async () => {}, coneRestRowsNow: async () => null,
          fbFetchBayDict: async () => global.window.__fbShipBayDict, isLoloShip: () => false, fbFetchStowagePlan: async () => null, ctApplyShiftInfo() {}, fbFetchDictCarrier: async () => '', ctPierOf: (i) => (i && i.pier) || '',
          loadMirCtx: async () => { const vv = voyages[state.voyageKey] || {}; const D = vv.discharge || {}, L = vv.loading || {}; return { info: vv.info || {}, compD: D.completed || {}, compL: L.completed || {}, recD: D.records || {}, recL: L.records || {}, reports: {} }; } };
        require('vm').createContext(vc);
        let mirAskFn = null;
        if (code.every(Boolean)) { require('vm').runInContext('let _mirLastFollow=null;\n' + code.join('') + '\nthis.__mirAsk = mirAsk;', vc); mirAskFn = vc.__mirAsk; }
        const obwhN = Object.values(F.OBWH_2749E.discharge.ediContainers).filter((c) => isPtkCode(c.pod)).length;          // 고른 배(OBWH 2749E) 양하 평택분 — 답에 나오면 안 되는 수
        const kbtrN = unitsByRule(K.voyage.discharge).set.size;   // 독립 — KBTR 2606E 평택 양하분(4.20 R23 — 세관 목록 105 · 종전 EDI 행 POD 평택 102)
        const askC = async (q) => { await sel('OBWH_2749E'); const a = mirAskFn ? String(await mirAskFn(q) || '') : ''; return { a, vk: state.voyageKey }; };
        const c1 = await askC('KBTR 양하 몇 대'), c2 = await askC('SMYA 양하 몇 대'), c3 = await askC('RZSY 양하 몇 대');
        const t2 = B.mirTone(home('SMYA 양하 몇 대').a), t3 = B.mirTone(home('RZSY 양하 몇 대').a);
        const noObwh = (s) => !new RegExp(`(^|[^0-9])${obwhN}대`).test(s);
        ok(`콘앱(OBWH 고른 채) mirAsk — «KBTR 양하 몇 대» 는 KBTR 로 옮겨 ${kbtrN}대 · «SMYA …» 는 그 배 «컨 자료가 아직»(검수앱 홈과 같은 답) · «RZSY …» 는 SMYA + «옛 코드 RZSY» · 고른 배 수 ${obwhN}대 없음 (수정 전 셋 다 고른 배 수)`,
          !!mirAskFn && c1.vk === K.voyageKey && c1.a.includes(`양하: ${kbtrN}대`) && noObwh(c1.a)
          && c2.a === t2 && /컨 자료\(EDI·리스트\)가 아직/.test(c2.a) && noObwh(c2.a)
          && c3.a === t3 && /옛 코드 RZSY/.test(c3.a) && /SMYA 로 답했어요/.test(c3.a) && !/RZOR/.test(c3.a) && noObwh(c3.a),
          `KBTR[${c1.vk}] ${c1.a.replace(/\n/g, ' | ').slice(0, 50)} || SMYA ${c2.a.replace(/\n/g, ' | ').slice(0, 60)} / 검수앱 ${t2.replace(/\n/g, ' | ').slice(0, 40)} || RZSY ${c3.a.replace(/\n/g, ' | ').slice(0, 70)}`);
      }
    } finally { global.window.__fbShipBayDict = dictSave; }
  }

  // ── R22 ───────────────────────────────────────────────────────────────
  head('R22 선적이 리스트뿐이고 아직 안 실은 배의 잔여는 «자료 수집중» — 수를 내지 않는다 · 두 앱 같은 답 (감사 421 · 3.53-12 · 4.17)', '검수사 §7.8-⑫ «자료 수집중» · §7.5-B 자료 대기와 같은 상태');
  {
    //  MCAP 639N(shiftsplit416 — RTDB 읽기 전용 사본) 선적 EDI 가 오기 전 모양: 선적은 리스트(records) 293 만 · 선적 완료 0. 양하는 그대로.
    const b0 = SS.MCAP_639N, vk = 'MCAP_639N';
    const v = JSON.parse(JSON.stringify({ info: b0.info, restowList: b0.restowList, discharge: b0.discharge, loading: { records: b0.loading.records } }));
    const listN = Object.keys(v.loading.records).filter((k) => CN_RE.test(k)).length;
    const state = !Object.keys(v.loading.ediContainers || {}).length && listN > 0 && !Object.keys(v.loading.completed || {}).length;
    //  독립 — 양하 평택분 = BAPLIE 원문 POD 평택(검수사가 고른 POD 우선 — R16 과 같은 셈)
    const recD = v.discharge.records || {};
    const dPtk = rawBap(v.discharge.raw.edi.text).filter((c) => isPtkCode(recD[c.cn] && recD[c.cn].pod_pick && recD[c.cn].pod ? recD[c.cn].pod : c.pod)).length;
    const T = (q) => say(q, tallyCtx417(vk, v, { [vk]: v })), C = (q) => say(q, coneCtx417(vk, v));
    const nums = (s) => (String(s).match(/\d+/g) || []).map(Number);
    const tR = T('얼마나 남았어'), cR = C('얼마나 남았어');
    ok(`MCAP 639N(선적 리스트 ${listN} 만 · 실은 컨 0) «얼마나 남았어» — «자료 수집중» · 총 잔여 수 없음 · 양하만 남은 ${dPtk}대 (수정 전 검수앱 526 · 콘앱 223)`,
      state && /자료 수집중/.test(tR) && nums(tR).every((n) => n === dPtk || n === 0) && tR.includes(`남은 ${dPtk}대 / 전체 ${dPtk}대`), tR.replace(/\n/g, ' | ').slice(0, 160));
    const tE = T('몇 시에 끝나'), cE = C('몇 시에 끝나'), tL = T('선적 얼마나 남았어'), cL = C('선적 얼마나 남았어');
    ok('«몇 시에 끝나» 도 «자료 수집중» · «선적 얼마나 남았어» 는 수 없이 «자료 수집중»(수정 전 «평택분 526대 남았어요» · «선적 293대»)', /자료 수집중/.test(tE) && !nums(tE).some((n) => n > dPtk) && /자료 수집중/.test(tL) && !nums(tL).length, `${tE.split('\n')[0]} | ${tL.split('\n')[0]}`);
    const tH = T('인수인계'), cH = C('인수인계');
    const lineL = (s) => (String(s).split('\n').find((l) => /^⬆ 선적/.test(l)) || '');
    ok('두 앱 같은 답 — «얼마나 남았어»·«몇 시에 끝나»·«선적 얼마나 남았어» 검수앱 = 콘앱 · 인수인계 선적 줄도 같은 «자료 수집중»(수정 전 검수앱 «남은 293대» · 콘앱 줄 없음)',
      tR === cR && tE === cE && tL === cL && /자료 수집중/.test(lineL(tH)) && lineL(tH) === lineL(cH), `${tR.slice(0, 40)} | ${cR.slice(0, 40)} || ${lineL(tH)} | ${lineL(cH)}`);
    //  대조 — 선적 EDI 가 온 원래 MCAP 639N 은 종전 셈 그대로(«자료 수집중» 아님)
    const vo = { ...b0 }, tO = say('얼마나 남았어', tallyCtx417(vk, vo, { [vk]: vo }));
    ok('대조 — 선적 EDI 가 온 MCAP 639N 은 종전 셈(«자료 수집중» 없음)', !/자료 수집중/.test(tO) && /남은 작업/.test(tO), tO.split('\n')[0]);
  }

  // ── R23 ───────────────────────────────────────────────────────────────
  //  4.20 (Fable 판정 ④ · 검수사 2026-10-10 00:02): 평택 양하분 = 세관 목록 + 추가분 한 벌(utils.ptkDischargeUnitsOf). 기대값은 위 unitsByRule 이 원자료(records _customs · EDI 행 cn · 완료 키 · 터미널 실적 키)에서 따로 센다.
  head('R23 평택 양하분 = 세관 목록(+ 목록 밖 실제 양하분은 추가분) 한 벌 — 마감텔리·갱별·홈 카드·미르·콘앱 같은 수 · 유닛은 컨번호로 한 번 (감사 424 · 3.53 · 4.20 에서 켬)', '검수사 2026-10-10 00:02 «그래도 기본은 세관이 맞습니다. 나중에 추가분이 생기면 추가분만 더하면 됩니다. 그 추가분은 세관에 목록에 없지만 실제 양하된 컨테이너로 신고 대상입니다» · §7.8-④ «1-3 다쓴다»');
  {
    const G = fx('daynight_gang_real.json'), P = fx('ptk420_units.json');
    const voyOf = (x) => ({ info: x.info, discharge: x.discharge, loading: x.loading || {} });
    const entr = (vk, v) => {   // 세 입구 — 마감텔리 · 갱별 보고 · 홈 카드(progressOf — 호출부가 넘기는 EDI 평택분과 함께)
      const ss = B.shiftCnSetOf420(vk, v);
      const ptkCns = new Set(Object.entries(v.discharge.ediContainers || {}).filter(([, c]) => c && isPtkCode(c.pod)).map(([k, c]) => c.cn || k));
      return { tal: B.ptkContainers(v, 'discharge'), gang: B.shiftReportContainers(v, 'discharge'), home: B.progressOf(v.discharge, 'discharge', ss, ptkCns).ptk.total };
    };
    const n3 = (e) => `마감텔리 ${e.tal.length} · 갱별 ${e.gang.length} · 홈 카드 ${e.home}`;
    //  ① RZOR R106E — EDI 189 키(자리표시 __SLOT___ 의 cn = SAWTBP004) · 세관 records 190 · CICU9635360 은 세관에만(완료·터미널 실적 있음)
    const v106 = voyOf(G.RZOR_R106E), W = unitsByRule(v106.discharge), e106 = entr('RZOR_R106E', v106);
    ok(`RZOR R106E 세 입구 모두 = 평택 양하분 ${W.set.size}(세관 목록 ${W.L.size} + 추가분 ${W.X.size}) (수정 전 189 · 191 · 190)`, W.basis === 'customs' && [e106.tal.length, e106.gang.length, e106.home].every((n) => n === W.set.size), n3(e106));
    //  ② 자리표시 키 __SLOT___(cn SAWTBP004)와 records SAWTBP004 는 한 유닛
    const slotKey = Object.keys(v106.discharge.ediContainers).find((k) => k.startsWith('__'));
    const one = (arr) => arr.filter((c) => c.cn === 'SAWTBP004').length === 1 && !arr.some((c) => String(c.cn).startsWith('__'));
    ok(`EDI ${slotKey}(cn ${slotKey && v106.discharge.ediContainers[slotKey].cn}) 와 records SAWTBP004 는 한 유닛 — 세 입구 모두 SAWTBP004 한 줄 · 자리표시 키 줄 없음 (수정 전 갱별은 두 줄)`,
      !!slotKey && v106.discharge.ediContainers[slotKey].cn === 'SAWTBP004' && !!v106.discharge.records.SAWTBP004 && one(e106.tal) && one(e106.gang), `${e106.tal.filter((c) => c.cn === 'SAWTBP004').length} · ${e106.gang.filter((c) => c.cn === 'SAWTBP004').length}`);
    //  ③ CICU9635360 — 세관 목록에만 있고(EDI 없음) 완료·터미널 실적이 있다 → 든다
    const cicu = 'CICU9635360', inAll = (arr) => arr.some((c) => c.cn === cicu);
    ok(`${cicu} — EDI 에 없고 세관 목록·완료 기록·터미널 실적에 있다 → 마감텔리·갱별에 든다 (수정 전 마감텔리에서 빠짐)`,
      !W.ediCns.has(cicu) && !!(v106.discharge.records[cicu] || {})._customs && !!v106.discharge.completed[cicu] && !!v106.discharge.termWork[cicu] && inAll(e106.tal) && inAll(e106.gang), `${inAll(e106.tal)} · ${inAll(e106.gang)}`);
    //  ④ ATPR 2643E — 세관 «최종항»(VNSGN 등)이 평택 판정을 떨어뜨리지 않는다(갱별 266 이던 것)
    const va = voyOf(P.ATPR_2643E), Wa = unitsByRule(va.discharge), ea = entr('ATPR_2643E', va);
    const finalNotPtk = Object.values(va.discharge.records).filter((r) => r._customs && !isPtkCode(r.pod)).length;
    ok(`ATPR 2643E — 세관 ${Wa.L.size} · EDI 평택 ${Wa.ediPtk.size} · records 세관 «최종항» 평택 아님 ${finalNotPtk} — 세 입구 모두 ${Wa.set.size} (수정 전 갱별 266)`,
      finalNotPtk > 0 && [ea.tal.length, ea.gang.length, ea.home].every((n) => n === Wa.set.size), n3(ea));
    //  ⑤ PCBJ 2609N — EDI 가 통과(KRINC→KRPUS)라 해도 세관 목록에 있으면 센다 · 통과 표식(_ediTransit)을 남긴다
    const vp = voyOf(P.PCBJ_2609N), Wp = unitsByRule(vp.discharge), ep = entr('PCBJ_2609N', vp);
    const wantTr = [...Wp.L].filter((cn) => Wp.ediCns.has(cn) && !Wp.ediPtk.has(cn)).sort();
    const gotTr = ep.tal.filter((c) => c._ediTransit).map((c) => c.cn).sort();
    ok(`PCBJ 2609N — 세관 ${Wp.L.size} · EDI 평택 ${Wp.ediPtk.size} — 세 입구 모두 ${Wp.set.size} · EDI 통과분 ${wantTr.length}대(${wantTr.join('·')})에 통과 표식 (수정 전 마감텔리 145 · 갱별 70)`,
      wantTr.length > 0 && [ep.tal.length, ep.gang.length, ep.home].every((n) => n === Wp.set.size) && gotTr.join(',') === wantTr.join(','), `${n3(ep)} · 표식 ${gotTr.join(',')}`);
    //  ⑥ 추가분 — R106E 사본에서 세관 행 하나를 지우면 그 컨은 «추가분»(EDI 평택·완료)으로 남고 총수는 그대로 · 미르 대수 답에 한 토막
    const vx = JSON.parse(JSON.stringify(v106));
    const victim = Object.keys(vx.discharge.records).find((cn) => W.ediCns.has(cn) && vx.discharge.completed[cn]);
    delete vx.discharge.records[victim];
    const Wx = unitsByRule(vx.discharge), ex = entr('RZOR_R106E', vx);
    const flatX = B.flattenVoyages({ RZOR_R106E: vx });
    const aX = say('양하 몇 대', { app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both', countFallback: true, portMisData: {}, voyages: { RZOR_R106E: vx }, flat: flatX, voyageKey: 'RZOR_R106E', voyage: vx, info: vx.info, mode: 'discharge', containers: flatX.filter((x) => x.voyageKey === 'RZOR_R106E'), _trace: {} });
    const mvX = Number((String(B.answerTotalMoves({ ...vx, key: 'RZOR_R106E' }, 'RZOR', { eta: B.movesOfVoyage({ ...vx, key: 'RZOR_R106E' }, 'RZOR_R106E') }) || '').split('\n')[1] || '').match(/양하 (\d+)대 →/)?.[1]);   // 4.20 후속: «총 무브수»(voyageCountsOf)도 같은 수
    ok(`추가분 — R106E 사본에서 세관 행 ${victim} 을 지우면 그 컨은 _extraOfList(마감텔리·갱별)로 남고 총수 ${Wx.set.size} 그대로(«총 무브수» 양하도) · 미르 «양하 몇 대» 끝에 «(세관 목록 밖 추가분 1대 — 신고 대상)»`,
      Wx.set.size === W.set.size && Wx.X.has(victim) && [ex.tal.length, ex.gang.length, ex.home, mvX].every((n) => n === Wx.set.size)
      && ex.tal.some((c) => c.cn === victim && c._extraOfList) && ex.gang.some((c) => c.cn === victim && c._extraOfList) && aX.includes(`양하: ${Wx.set.size}대`) && aX.includes('(세관 목록 밖 추가분 1대 — 신고 대상)'), `${n3(ex)} · 총 무브수 양하 ${mvX} · ${aX.replace(/\n/g, ' | ').slice(0, 120)}`);
    //  ⑦ 목록이 없는 배(basis 'edi') — EDI POD 평택 그대로(종전 · R1 OBWH 2751E 와 같은 셈) · 무적 완료는 분모 밖
    const ve = JSON.parse(JSON.stringify(v106)); ve.discharge.records = {};
    const We = unitsByRule(ve.discharge), ee = entr('RZOR_R106E', ve);
    const vo = JSON.parse(JSON.stringify(voyOf(fx('daynight_gang_obwh_1612.json').OBWH_2751E))); vo.discharge.records = {};
    const ob = Object.values(vo.discharge.ediContainers).filter((c) => isPtkCode(c.pod)).length, eo = entr('OBWH_2751E', vo);
    ok(`목록 없음(basis edi) — R106E EDI POD 평택 ${We.set.size} · OBWH 2751E ${ob}(R1 과 같은 셈) 를 세 입구가 그대로 · 무적 완료(${cicu})는 분모 밖`,
      We.basis === 'edi' && [ee.tal.length, ee.gang.length, ee.home].every((n) => n === We.set.size) && !inAll(ee.tal) && [eo.tal.length, eo.gang.length, eo.home].every((n) => n === ob), `${n3(ee)} || ${n3(eo)}`);
    //  ⑧ 두 앱 같은 답 — 검수앱 홈(펼치기)·콘앱(EDI 행 + records — 미르 _normalize 가 utils.applyDischargeUnits 한 벌로 세관 목록 행을 붙인다) «양하 몇 대» = 평택 양하분
    const flat106 = B.flattenVoyages({ RZOR_R106E: v106 });
    const tA = say('양하 몇 대', { app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both', countFallback: true, portMisData: {}, voyages: { RZOR_R106E: v106 }, flat: flat106, voyageKey: 'RZOR_R106E', voyage: v106, info: v106.info, mode: 'discharge', containers: flat106.filter((x) => x.voyageKey === 'RZOR_R106E'), _trace: {} });
    const cA = say('양하 몇 대', coneCtx417('RZOR_R106E', v106));
    ok(`두 앱 같은 답 — «양하 몇 대» 검수앱 홈 = 콘앱 = ${W.set.size}대 (수정 전 콘앱은 EDI 행만 189)`, tA.includes(`양하: ${W.set.size}대`) && cA === tA, `${tA.split('\n')[0]} | ${cA.split('\n')[0]}`);
    //  ⑨ 4.20 후속 (Fable 판정 ④-4 · 규범 §4-4) — 한 배의 양하 수는 미르 답 어디서나 같다: «양하 몇 대» = 양하 브리핑 «양하 평택 N대» = «총 무브수» 양하 N대 = 교대 브리핑 양하 물량.
    //    PCBJ 2609N — EDI 가 통과(KRINC→KRPUS)인 세관 목록 4대가 갈리는 배(수정 전 브리핑·교대 브리핑 145 · 대수·총 무브수 149). 축소본에 컨번호 칸만 되살린다(실자료 모양).
    {
      const vq = JSON.parse(JSON.stringify(vp)); for (const n of ['ediContainers', 'records']) for (const [cn, x] of Object.entries(vq.discharge[n])) x.cn = cn;
      vq.key = 'PCBJ_2609N';
      const flatQ = B.flattenVoyages({ PCBJ_2609N: vq });
      const ctxQ = (extra) => Object.assign({ app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both', countFallback: true, portMisData: {}, voyages: { PCBJ_2609N: vq }, flat: flatQ, voyageKey: 'PCBJ_2609N', voyage: vq, info: vq.info, containers: flatQ.filter((x) => x.voyageKey === 'PCBJ_2609N'), _trace: {} }, extra || {});
      const nCnt = Number((say('양하 몇 대', ctxQ()).match(/양하: (\d+)대/) || [])[1]);
      const nBr = Number((say('양하 브리핑', ctxQ({ mode: 'discharge' })).match(/양하 평택 (\d+)대/) || [])[1]);
      const nMv = Number((String(B.answerTotalMoves(vq, 'PCBJ', { eta: B.movesOfVoyage(vq, 'PCBJ_2609N') }) || '').split('\n')[1] || '').match(/양하 (\d+)대 →/)?.[1]);
      const sbQ = String(B.answerShiftBriefing({ ...vq, _key: 'PCBJ_2609N' }, null, { shipName: 'PCBJ' }) || '');
      const nSb = Number((sbQ.match(/양하 \d+\/(\d+)/) || sbQ.match(/양하 (\d+) \+/) || [])[1]);
      ok(`PCBJ 2609N 미르 양하 수 한 벌 — «양하 몇 대» ${nCnt} = 양하 브리핑 ${nBr} = «총 무브수» 양하 ${nMv} = 교대 브리핑 ${nSb} = 평택 양하분 ${Wp.set.size} (수정 전 브리핑·교대 브리핑 145)`,
        [nCnt, nBr, nMv, nSb].every((n) => n === Wp.set.size), JSON.stringify({ nCnt, nBr, nMv, nSb }));
    }
    //  ⑩ 4.20 후속 (Fable 판정 ④-3) — 수화물(LUG)도 평택 양하분이다: R106E CICU9635360(forecast.luggageCns · 양하 예보 · 세관 목록에만 · 실제로 내림)은 마감텔리 페리 집계의 Lug 줄에 1.
    //    기대값은 forecast(mode·luggageCns) 와 records 에서 따로. 실물 RZOR R075E&W 마감텔리도 «20ft Empty (Lug) 1» 을 제 그룹으로 싣는다. (수정 전 0 — EDI 에 없어 마감텔리 모집단 밖)
    {
      const fc = v106.info.forecast || {};
      const wantLug = (fc.mode === 'discharge' ? (fc.luggageCns || []) : []).filter((cn) => W.set.has(cn) && v106.discharge.records[cn]);
      const fe0 = String((v106.discharge.records[wantLug[0]] || {}).fe || '') === 'E' ? 'e' : 'f';
      const z = B.computeTallyData(v106).ferry.inb;
      const lugN = ['f20lug', 'e20lug', 'f40lug', 'e40lug'].reduce((a, k) => a + z[k].total, 0);
      ok(`R106E 마감텔리 페리 집계 Lug = ${wantLug.length}(${wantLug.join('·')} · ${fe0 === 'e' ? 'Empty' : 'Full'} 20ft) — forecast.luggageCns·records 에서 따로 셈 (수정 전 0)`,
        wantLug.length === 1 && lugN === 1 && z[`${fe0}20lug`].total === 1 && z.pp[`${fe0}lug`] === 1, JSON.stringify({ lugN, e20: z.e20lug, pp: z.pp }));
    }
    //  ── 4.20 감사(다른 Opus «하» · Fable 판정 2026-10-10) — 한 벌을 안 지나던 입구·사각 ──
    //  화면 입구는 실소스를 node 에서 그려 글자를 읽는다(react-dom/server — 쓰기 없음 · Firebase 는 메모리 스텁). 수석 보드·보관소·FINAL WORKING REPORT 는 순수 함수를 부른다.
    global.window.matchMedia = global.window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const S4 = bundle([
      `export { default as React } from "${ROOT}/node_modules/react/index.js";`,
      `export { renderToStaticMarkup } from "${ROOT}/node_modules/react-dom/server.node.js";`,
      `export { default as VoyageSummaryCard } from "${ROOT}/src/components/VoyageSummaryCard.jsx";`,
      `export { default as WorkClosingChecklist } from "${ROOT}/src/components/WorkClosingChecklist.jsx";`,
      `export { default as PrintHubModal } from "${ROOT}/src/components/PrintHubModal.jsx";`,
      `export { countPtkSection } from "${ROOT}/src/pages/ChiefDashboard.jsx";`,
      `export { _ptkCountOfSection, tallyVoyagesByShip } from "${ROOT}/src/firebase.js";`,
      `export { buildBuckets } from "${ROOT}/src/workingReport.js";`,
      `export { ptkDischargeUnitsOf, ediByUnitCn } from "${ROOT}/src/utils.js";`,
    ].join('\n'), 'r420audit', `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --loader:.js=jsx --jsx=automatic --loader:.png=dataurl`);
    const txt = (comp, props) => S4.renderToStaticMarkup(S4.React.createElement(comp, props)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const scr3 = (vk, v) => ({
      sum: Number((txt(S4.VoyageSummaryCard, { voyage: v, mode: 'discharge', voyageKey: vk }).match(/양하 \d+\/(\d+)/) || [])[1]),
      chk: Number((txt(S4.WorkClosingChecklist, { open: true, voyage: v, mode: 'discharge', onClose() {}, onJump() {} }).match(/미완료 컨 (\d+)대 중/) || [])[1]),
      hub: Number((txt(S4.PrintHubModal, { voyage: v, voyageKey: vk, onClose() {}, initialMode: 'discharge', inspector: '연막' }).match(/양하 (\d+)대 · 평택항/) || [])[1]),
    });
    //  ⑪ (상-1) 한 벌이 시프팅을 안다 — MCSC 633N(양하 리스트 279 + 시프팅 95): 마감 점검 분모 = 현황 요약 = 279 · 시프팅 95대에 추가분 표식 없음 · U.extra 에 시프팅 없음.
    //    기대값은 원자료에서 — 리스트 행·완료(규칙대로 센 집합) − 시프팅 집합(선사 서류 없음 → 양하·선적 EDI 대조 — R16 ④ 와 같은 재료).
    const MC = (() => {
      const FXM = fx('progress_mcsc.json'), SBM = fx('shifting_berth.json').MCSC_633N;
      const expand = (o, k) => { const r = {}; for (const [cn, c] of Object.entries(o)) r[cn] = { cn, bay: c.b, row: c.r, tier: c.t, [k]: c[k], iso: c.i, fe: c.f }; return r; };
      const vm = { key: 'MCSC_633N', info: { vsl: 'MCSC', voy_d: '633N', voy_l: '635S', berthShift: SBM.bs }, swapFix: FXM.swapFix, discharge: { ...FXM.discharge, ediContainers: expand(SBM.d, 'pod') }, loading: { ...FXM.loading, ediContainers: expand(SBM.l, 'pol') } };
      const sw = B.swapFixList({ swapFix: FXM.swapFix });
      const ssM = new Set(Object.keys(B.computeShiftingMap(B.applySwapFix(expand(SBM.d, 'pod'), sw), B.applySwapFix(expand(SBM.l, 'pol'), sw), { berthShift: SBM.bs }) || {}).filter((k) => !k.startsWith('_')));
      const Wm = unitsByRule(vm.discharge);
      return { vm, ssM, Wm, want: [...Wm.set].filter((cn) => !ssM.has(cn)).length };
    })();
    {
      const { vm, ssM, Wm, want } = MC, key = vm.key;
      const sc = scr3(key, vm);
      const U = B.ptkDischargeUnitsOf(vm);
      const flat = B.flattenVoyages({ [key]: vm }).filter((c) => c._mode === 'discharge');
      const shiftMarked = flat.filter((c) => c._shift && c._extraOfList).length;
      ok(`MCSC 633N 마감 점검 분모 ${sc.chk} = 현황 요약 ${sc.sum} = 평택 양하분 ${want}(리스트 ${Wm.L.size} − 시프팅 ${ssM.size}) · 시프팅 ${ssM.size}대 중 추가분 표식 ${shiftMarked} · U.extra 에 시프팅 ${[...U.extra].filter((cn) => ssM.has(cn)).length} (수정 전 마감 점검 374 · 표식 95 · extra 95)`,
        ssM.size === 95 && want === 279 && sc.chk === want && sc.sum === want && shiftMarked === 0 && ![...U.extra].some((cn) => ssM.has(cn)) && U.set.size === want && U.shiftSet instanceof Set,
        JSON.stringify({ ...sc, shiftMarked, extra: U.extra.size, set: U.set.size, ss: ssM.size }));
    }
    //  ⑫ (상-2) 수석 보드 «양하 N»(countPtkSection) = 보관소(_ptkCountOfSection · fbArchiveVoyageBeforeDelete) = 선박 통계(tallyVoyagesByShip) = 평택 양하분 — R106E 190 · PCBJ 2609N 149
    {
      const vk = 'RZOR_R106E', vr = { ...v106, key: vk }, vq = { ...vp, key: 'PCBJ_2609N' };
      const r = { chief: S4.countPtkSection(vr.discharge, 'discharge', vr), arch: S4._ptkCountOfSection(vr.discharge, 'discharge', vr), ships: (S4.tallyVoyagesByShip({ [vk]: v106 })[0] || {}).discharge,
        pChief: S4.countPtkSection(vq.discharge, 'discharge', vq), pArch: S4._ptkCountOfSection(vq.discharge, 'discharge', vq) };
      ok(`수석 보드 양하 = 보관소 양하 = 선박 통계 양하 — R106E ${W.set.size} · PCBJ 2609N ${Wp.set.size} (수정 전 EDI POD 평택 189 · 145)`,
        [r.chief, r.arch, r.ships].every((x) => x === W.set.size) && r.pChief === Wp.set.size && r.pArch === Wp.set.size, JSON.stringify(r));
    }
    //  ⑬ (상-3) FINAL WORKING REPORT(결제용) 양하 대수 = 평택 양하분 — R106E 190 · MCSC 633N 279(records 281 — 리스트 아닌 빈 행 2대(시프팅 자리 기록)를 종전엔 셌다)
    {
      const wb = S4.buildBuckets(v106, 'settlement'), wm = S4.buildBuckets(MC.vm, 'settlement');
      const recN = Object.keys(MC.vm.discharge.records).length;
      ok(`FINAL WORKING REPORT 양하 대수 — R106E ${wb.dischTotal} = 평택 양하분 ${W.set.size} · MCSC 633N ${wm.dischTotal} = ${MC.want} (수정 전 records 키 전부 ${recN})`,
        wb.dischTotal === W.set.size && wm.dischTotal === MC.want && recN !== MC.want, JSON.stringify({ r106: wb.totalDS, mcsc: wm.dischTotal }));
    }
    //  ⑭ (중-7) 세관이 기준인 배는 세관 밖 선사 행(«预配» 의 쓰레기 행 R083E(rf:true) · XNX26261001 · SOC 행)이 대수에 안 든다 — 세관 기준 수 = _customs 행 수(보관소 _drec 줄인 사본)
    {
      const GZ = fx('rzor_garbage420.json');
      const rows = ['RZOR_R083E', 'RZOR_R105E'].map((k) => {
        const R = GZ[k].discharge.records, want = Object.values(R).filter((x) => x._customs).length;
        const junk = Object.keys(R).filter((cn) => !R[cn]._customs);
        const U = B.ptkDischargeUnitsOf({ key: k, info: GZ[k].info, discharge: GZ[k].discharge, loading: {} });
        return { k, want, got: U.set.size, basis: U.basis, junk, leak: junk.filter((cn) => U.set.has(cn)) };
      });
      ok(`세관 기준 수 = _customs 행 수 — ${rows.map((r) => `${r.k} ${r.want}(선사 행 ${r.junk.join('·')} 제외)`).join(' · ')}`,
        rows.every((r) => r.basis === 'customs' && r.got === r.want && r.junk.length > 0 && r.leak.length === 0) && rows.some((r) => r.junk.includes('R083E')) && rows.some((r) => r.junk.includes('XNX26261001')), JSON.stringify(rows));
    }
    //  ⑮ (하-8 · 감사 A1) 터미널 실적만 있는 추가분 — KBTR 2606E 사본에서 그 3대의 세관 행·완료 기록을 지워도 터미널 실적(termWork)으로 들어와 105 · 그 3대에 추가분 표식
    //    (그 3대는 세관 목록에도 있다 — 터미널 실적 길만 남기려고 세관 행까지 지운다)
    {
      const K = JSON.parse(JSON.stringify(fx('mirsame_kbtr.json').voyage)), three = ['DFSU1945962', 'HALU2504906', 'SEGU1308091'];
      const want = unitsByRule(K.discharge).set.size;
      for (const cn of three) { delete K.discharge.records[cn]; delete K.discharge.completed[cn]; }
      const ek = entr('KBTR_2606E', K);
      const tw = three.every((cn) => !!K.discharge.termWork[cn]);
      ok(`KBTR 2606E — ${three.join('·')} 의 세관 행·완료 기록을 지워도 터미널 실적으로 ${want} · 셋 다 추가분 표식(마감텔리)`,
        tw && want === 105 && [ek.tal.length, ek.gang.length, ek.home].every((x) => x === want) && three.every((cn) => ek.tal.some((c) => c.cn === cn && c._extraOfList)), n3(ek));
    }
    //  ⑯ (하-9 · 감사 A2) 완료 기록의 «누락» 표식(flag 'missing' — 검수원이 «선박에 없음» 으로 완료 처리)은 내린 컨이 아니다 — 목록 밖 컨에 찍혀도 추가분이 아니다
    {
      const vz = JSON.parse(JSON.stringify(v106)), ghost = 'ZZZU0000001';
      vz.discharge.completed[ghost] = { at: Date.parse('2026-10-10T01:00:00+09:00'), by: '연막', flag: 'missing' };
      const ez = entr('RZOR_R106E', vz);
      ok(`R106E 사본 — 목록 밖 ${ghost} 에 누락 표식 완료를 넣어도 세 입구 ${W.set.size} 그대로 · 그 컨은 안 든다`,
        [ez.tal.length, ez.gang.length, ez.home].every((x) => x === W.set.size) && !ez.tal.some((c) => c.cn === ghost) && !ez.gang.some((c) => c.cn === ghost), n3(ez));
    }
    //  ⑰ (하-10 · 감사 A4) 현황 요약·마감 점검·출력 센터 — EDI 자리표시 키(__SLOT___ · cn SAWTBP004)와 records SAWTBP004 를 한 유닛으로(ediByUnitCn) · R106E 세 화면 190
    //    세 화면은 행 cn 을 묶음 키로 두고 유닛 판정으로 거르므로 자리표시 키 행은 대수에 안 든다 — ediByUnitCn 이 하는 일은 그 유닛 행에 EDI 행을 붙이는 것이라 그것을 따로 잰다.
    {
      const sc = scr3('RZOR_R106E', { ...v106, key: 'RZOR_R106E' });
      const E0 = v106.discharge.ediContainers, Eu = S4.ediByUnitCn(E0);
      const moved = !!slotKey && !Eu[slotKey] && Eu.SAWTBP004 === E0[slotKey] && Object.keys(Eu).length === Object.keys(E0).length;
      ok(`R106E 현황 요약 ${sc.sum} · 마감 점검 ${sc.chk} · 출력 센터 ${sc.hub} = 평택 양하분 ${W.set.size} · EDI 묶음의 ${slotKey} 행은 SAWTBP004 키로 옮겨 그 유닛 행에 붙는다(키 수 ${Object.keys(E0).length} 그대로)`,
        [sc.sum, sc.chk, sc.hub].every((x) => x === W.set.size) && moved, JSON.stringify({ ...sc, moved, slot: !!Eu[slotKey] }));
    }
  }

  //  4.19 R24·R25 — 베이사전 쓰기(fbSaveShipBayDict)·«사전에 없음» 판정·RZOR 덱플랜 파서를 메모리 스텁으로 묶는다(실 SDK 처럼 값 안의 undefined 를 거부한다).
  const DM = fx('dictmissing419.json');
  const R24 = bundle([
    `export { fbSaveShipBayDict } from "${ROOT}/src/firebase.js";`,
    `export { bayDictMissingOf } from "${ROOT}/src/dictMissing.js";`,
    `export { parseDeckPlanWorkbook } from "${ROOT}/src/rzorPlan.js";`,
  ].join('\n'), 'r24', `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --loader:.js=jsx --jsx=automatic`);

  // ── R24 ───────────────────────────────────────────────────────────────
  head('R24 사전에 없는 배 — 항차는 등록하고 «사전에 없음» 을 표기한다 · EDI 자동 등록(베이사전)이 undefined 칸으로 거부되지 않는다 (감사 680 · 3.8-01)', '검수사 §7.8-⑬ «항차는 등록하기 사전에 없음 표기»');
  {
    //  독립 — «사전» = 정본 ship_bay_dict_v3 의 베이 구조(bayDef) · 덱플랜 배(RZOR)는 셀 매트릭스를 만들지 않는 배(검수사 확정 3.5 — 선박 정책 lolo).
    const DECKPLAN_SHIPS = ['RZOR'];
    const dictWith = (extra) => Object.assign(Object.fromEntries(Object.entries(DM.dict).map(([k, e]) => [k, { code: k, name: e.name || '', callsign: e.callsign || '', imo: e.imo || '', ...(e.hasBayDef ? { bayDef: { recordCount: 1 } } : {}) }])), extra || {});
    const codes = DM.activeKeys.map((k) => k.split('_')[0]);
    const want = codes.filter((c) => !(DM.dict[c] && DM.dict[c].hasBayDef) && !DECKPLAN_SHIPS.includes(c)).sort();
    const dictSave = global.window.__fbShipBayDict;
    try {
      //  ① 쓰기 — EDI 자동 등록(VoyagePage M5.89)이 보내는 모양 그대로. 사전에 없는 QDTR(활성 QDTR_2608E — 예정등록·사전 키 없음)
      localStorage.setItem('master_active_inspector_v1', '김성일');   // 베이사전 쓰기 문지기(시드 관리자) 통과 — 일반 검수원은 종전대로 막힌다
      global.window.__fbShipBayDict = dictWith();
      global.__memdb = { ship_bay_dict_v3: { RZOR: JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(DM.dict.RZOR).filter(([k]) => ['callsign', 'imo', 'name'].includes(k))))) } };
      const qi = DM.voyages.QDTR_2608E;
      const shape = (code, name) => ({ code, name, callsign: '', source: 'edi-auto', _inspector: '김성일' });
      let e1 = '', ok1 = null;
      try { ok1 = await R24.fbSaveShipBayDict(qi.vsl, shape(qi.vsl, qi.vslFull || qi.vsl)); } catch (e) { e1 = String(e && e.message || e); }
      const q = (global.__memdb.ship_bay_dict_v3 || {})[qi.vsl];
      ok(`사전에 없는 ${qi.vsl}(QDTR_2608E) EDI 자동 등록 모양 → true · 사전 항목이 생기고 provisional 칸은 만들지 않는다(수정 전 false — 실 SDK 가 provisional undefined 로 set 거부)`,
        ok1 === true && !!q && q.name === (qi.vslFull || qi.vsl) && q.source === 'edi-auto' && !('provisional' in q), e1 || `${ok1} ${JSON.stringify(q || null).slice(0, 160)}`);
      //  껍데기(이름·콜사인만 — RZOR 꼴, provisional 칸 없음)에 다시 EDI 자동 등록 — 있던 신원은 그대로
      let e2 = '', ok2 = null;
      try { ok2 = await R24.fbSaveShipBayDict('RZOR', shape('RZOR', 'RIZHAO ORIENT')); } catch (e) { e2 = String(e && e.message || e); }
      const rz = global.__memdb.ship_bay_dict_v3.RZOR || {};
      ok(`껍데기 RZOR(실 사전 — bayDef·provisional 없음)에 EDI 자동 등록 모양 → true · 콜사인 ${DM.dict.RZOR.callsign} · IMO ${DM.dict.RZOR.imo} 그대로 · provisional 칸 없음(수정 전 false)`,
        ok2 === true && rz.callsign === DM.dict.RZOR.callsign && rz.imo === DM.dict.RZOR.imo && !('provisional' in rz), e2 || `${ok2} ${JSON.stringify(rz).slice(0, 160)}`);

      //  ② 판정 — 활성 17항차 중 «사전에 없음» = 테스트가 사전 사본(키·bayDef)에서 직접 고른 배
      global.window.__fbShipBayDict = dictWith();
      const got = DM.activeKeys.filter((k) => R24.bayDictMissingOf({ vsl: k.split('_')[0] })).map((k) => k.split('_')[0]).sort();
      ok(`활성 ${codes.length}항차 중 «사전에 없음» = 사전 사본에서 bayDef 없는 배(덱플랜 RZOR 제외) [${want.join(' ')}] (수정 전 표기 없음)`, want.length > 0 && got.join(' ') === want.join(' '), `답 [${got.join(' ')}]`);
      //  껍데기를 만든 뒤에도 매트릭스가 없으면 «사전에 없음» · 매트릭스를 만들면 저절로 사라진다 · 사전을 아직 못 받았으면 말하지 않는다
      global.window.__fbShipBayDict = dictWith({ [qi.vsl]: { code: qi.vsl, name: qi.vsl, source: 'edi-auto' } });
      const afterShell = R24.bayDictMissingOf(qi);
      global.window.__fbShipBayDict = dictWith({ [qi.vsl]: { code: qi.vsl, name: qi.vsl, bayDef: { recordCount: 1, source: 'user' } } });
      const afterMatrix = R24.bayDictMissingOf(qi);
      global.window.__fbShipBayDict = {};
      const noDict = R24.bayDictMissingOf(qi);
      ok(`${qi.vsl} — 껍데기 등록 뒤에도 «사전에 없음»(베이 구조 없음) · 매트릭스를 만들면 사라짐 · 사전을 아직 못 받았으면 말하지 않음`, afterShell === true && afterMatrix === false && noDict === false, JSON.stringify({ afterShell, afterMatrix, noDict }));

      //  ③ 화면 — 항차 목록 카드·맨 위 머리줄·베이플랜 머리를 jsdom 에서 실소스로 그린다(smoke_regress_dom.jsx ③). 사전에 없는 배만 셋 다 «사전에 없음».
      const domR24 = async (key) => {
        const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
        const errs = []; dom.window.addEventListener('error', (e) => errs.push(e.message));
        dom.window.__R24 = key; dom.window.console.warn = () => {};
        try { dom.window.eval(domSrc); } catch (e) { errs.push('THROW ' + e.message); }
        await sleep(250);
        const d = dom.window.document;
        const cnt = (id) => { const el = d.getElementById(id); return el ? [...el.querySelectorAll('[data-dict-missing]')].filter((x) => x.textContent.trim() === '사전에 없음').length : -1; };
        return { card: cnt('r24card'), head: cnt('r24head'), bay: cnt('r24bay'), errs };
      };
      const sQ = await domR24('QDTR_2608E'), sA = await domR24('ATPR_2645E'), sR = await domR24('RZOR_R111E');
      ok(`화면 — QDTR(사전에 없음) 항차 목록 카드·머리줄·베이플랜 머리에 «사전에 없음» 셋 · ATPR(사전 있음)·RZOR(덱플랜 배) 는 없음 (수정 전 셋 다 0)`,
        sQ.card === 1 && sQ.head === 1 && sQ.bay === 1 && sA.card + sA.head + sA.bay === 0 && sR.card + sR.head + sR.bay === 0 && !sQ.errs.length && !sA.errs.length,
        JSON.stringify({ QDTR: sQ, ATPR: sA, RZOR: sR }).slice(0, 220));
    } finally { global.window.__fbShipBayDict = dictSave; }
  }

  // ── R25 ───────────────────────────────────────────────────────────────
  head('R25 제작컨(비ISO 유닛 RZOR «SAWTBP00N») — 대수와 크기 행(45\')에 들어가고 ISO 규격 코드는 없다(«제작컨») · 씰은 전부 · LUG 와 별개 (3.67 남긴 것 · 4.20 에서 뒤집음)', '검수사 2026-10-10 00:02 «SAWTBP004는 정상적인 컨테이너가 아닙니다. 제작컨일것입니다. 대수엔 들어 가지만 규격엔 없습니다» · 00:04 «이 기준도 마감텔리로 규정을 정하시면 됩니다» (§7.8-⑦ «7. 1» 은 뒤집힘)');
  {
    //  독립 — 시트 글자 칸을 이 파일이 따로 읽어 실컨번호(ISO 6346) 칸 · 비ISO 유닛 칸을 세고, 덱마다 SUB TOTAL 표(SIZE 행 아래 CONT 행)의 20'·40'·45'·TTL 을 읽는다(실물 마감텔리 STOWAGE PLAN).
    const sheetOf = (f) => {
      const wb = XLSX.readFile(path.join(ROOT, 'tools/fixtures', f), { cellStyles: true });
      let isoN = 0; const units = []; const subs = [];
      for (const sn of wb.SheetNames) {
        const ws = wb.Sheets[sn];
        for (const a of Object.keys(ws)) {
          if (a[0] === '!') continue; const v0 = ws[a].v;
          if (typeof v0 === 'string') { const t = v0.replace(/\s+/g, '').toUpperCase(); if (CN_RE.test(t)) isoN += 1; else if (/^[A-Z]{6}\d{3}$/.test(t)) units.push(t); }
          if (String(v0).trim() === 'SIZE') {
            const d = XLSX.utils.decode_cell(a); const row = {};
            for (let c = d.c + 1; c < d.c + 20; c++) { const h = ws[XLSX.utils.encode_cell({ r: d.r, c })]; const x = ws[XLSX.utils.encode_cell({ r: d.r + 1, c })]; if (h && /^(20'|40'|45'|TTL)$/.test(String(h.v).trim())) row[String(h.v).trim()] = Number(x && x.v) || 0; }
            subs.push({ r: d.r, ...row });
          }
        }
      }
      subs.sort((x, y) => x.r - y.r);   // 시트 위에서부터 C · D · UNDER
      return { wb, isoN, units, subs };
    };
    const plans = ['R070W', 'R075W', 'R079W', 'R091W', 'R106W'].map((k) => { const S = sheetOf(`rzor_plan_${k}.xlsx`); return { k, S, p: R24.parseDeckPlanWorkbook(S.wb, XLSX) }; });
    const deckN = (p, dk) => ((p.decks || []).find((d) => d.deck === dk) || { slots: [] }).slots.filter((s) => !s.empty).length;
    //  ① R070W·R075W — 제작컨 칸을 낸다(크기 45 · 규격 코드 없음 표식) · 실컨 칸 수는 종전 그대로 · total = 시트 TTL 합
    for (const k of ['R070W', 'R075W']) {
      const { S, p } = plans.find((x) => x.k === k);
      const slots = (p.decks || []).flatMap((d) => d.slots.filter((s) => !s.empty));
      const made = slots.filter((s) => !CN_RE.test(String(s.cn || '')));
      const ttl = S.subs.reduce((a, x) => a + (x.TTL || 0), 0);
      ok(`${k} — 시트 비ISO 유닛 ${S.units.join('·')} 을 칸으로(크기 45 · madeUnit) · 실컨 칸 ${slots.length - made.length} = 시트 실컨 ${S.isoN}(종전 그대로) · total ${p.total} = 시트 덱 TTL 합 ${ttl} (수정 전 ${S.isoN})`,
        p._fmt === 'checker' && S.units.length === 1 && made.length === 1 && made[0].cn === S.units[0] && made[0].madeUnit === true && made[0].size === 45 && slots.length - made.length === S.isoN && p.total === ttl,
        `칸 ${slots.length} · 제작컨 ${made.map((s) => `${s.cn}/${s.size}/${s.madeUnit}`).join(',')} · total ${p.total} · TTL ${ttl}`);
    }
    //  ② 다섯 플랜 — 덱마다 파서 칸 = 시트 SUB TOTAL TTL(C · D · UNDER)
    const bad = plans.filter(({ S, p }) => !(S.subs.length === 3 && deckN(p, 'C') === S.subs[0].TTL && deckN(p, 'D') === S.subs[1].TTL && deckN(p, 'U') === S.subs[2].TTL));
    ok(`다섯 플랜(R070W·R075W·R079W·R091W·R106W) 덱마다 파서 칸 = 시트 SUB TOTAL TTL — ${plans.map(({ k, S }) => `${k} ${S.subs.map((x) => x.TTL).join('/')}`).join(' · ')} (수정 전 R070W·R075W D덱 121)`,
      !bad.length, bad.map(({ k, S, p }) => `${k} 시트 ${S.subs.map((x) => x.TTL).join('/')} 파서 ${deckN(p, 'C')}/${deckN(p, 'D')}/${deckN(p, 'U')}`).join(' · '));
    //  ③ 덱플랜 그림·집계 — R075W D덱 45' = 시트 45' · 제작컨 칸 글자는 «제작컨»(규격 코드 없음)
    {
      const { S, p } = plans.find((x) => x.k === 'R075W');
      const dD = (p.decks || []).find((d) => d.deck === 'D');
      const tot = B.deckTotals(dD.slots.filter((s) => !s.empty));
      const model = B.buildPrintModel({ plan: p, containers: [], vsl: 'RIZHAO ORIENT', mode: 'loading', forScreen: true });
      const cell = model.pages.flatMap((pg) => pg.cells || []).find((c) => c.cn === S.units[0]);
      ok(`R075W D덱 집계 45' ${tot.n[45]} = 시트 45' ${S.subs[1]["45'"]} · ${S.units[0]} 칸 글자 «${cell && cell.type}» (규격 코드 F45'H 아님)`, tot.n[45] === S.subs[1]["45'"] && !!cell && cell.type === '제작컨' && !cell.lines.some((l) => /45'H/.test(l)), JSON.stringify({ n: tot.n, cell: cell && cell.lines }));
    }
    //  ④ 판정 한 벌
    ok(`isMadeUnitCn — SAWTBP005 true · XNX26261001 true(모양은 유닛) · CAAU4286458 false · __SLOT___ false · «TCLU 9762509»(띄어 쓴 실컨번호) false · TBN false · R083E false (4.20 감사 — 글자만·항차 꼴은 유닛 아님) · ABCU123456 false · ABCU12345678 false (4.20 재감사 — ISO 오타 꼴은 제작컨 아님)`,
      B.isMadeUnitCn('SAWTBP005') === true && B.isMadeUnitCn('XNX26261001') === true && B.isMadeUnitCn('CAAU4286458') === false && B.isMadeUnitCn('__SLOT___') === false && B.isMadeUnitCn('TCLU 9762509') === false && B.isMadeUnitCn('TBN') === false && B.isMadeUnitCn('R083E') === false
      && B.isMadeUnitCn('ABCU123456') === false && B.isMadeUnitCn('ABCU12345678') === false);
    //  ⑤ R106E 마감텔리 — SAWTBP004 는 Final Work 45' Full 에 1(크기는 EDI iso L5G1) · 제작컨 표식(mkcon) · 수화물 아님 · 검수 리스트 규격 칸 «제작컨» · 씰 넷 전부
    {
      const v = { info: fx('daynight_gang_real.json').RZOR_R106E.info, discharge: fx('daynight_gang_real.json').RZOR_R106E.discharge, loading: {} };
      const W = unitsByRule(v.discharge);
      const eRow = (cn) => Object.values(v.discharge.ediContainers).find((c) => c.cn === cn) || v.discharge.records[cn] || {};
      const is45 = (iso) => /^(L[013-9]|9[05])/.test(String(iso || '').toUpperCase());
      const want45F = [...W.set].filter((cn) => is45(eRow(cn).iso) && String(eRow(cn).fe || (v.discharge.records[cn] || {}).fe) === 'F').length;
      const t = B.computeTallyData(v), dis = B.ptkContainers(v, 'discharge');
      const su = dis.find((c) => c.cn === 'SAWTBP004') || {};
      const html = String(B.generateInspectionListHTML(dis, 'discharge', { vsl: 'RZOR', voy_d: 'R106E' }, []) || '');
      const i = html.indexOf('>SAWTBP004<'), rowH = i < 0 ? '' : html.slice(html.lastIndexOf('<tr', i), html.indexOf('</tr>', i));
      const seals = ['LF102335', 'LF102350', 'LF102345', 'LF102336'];
      ok(`R106E 마감텔리 Final Work 45' Full ${t.totals.dis.F['45'] || 0} = 원자료(EDI iso L·9x · F) ${want45F} — SAWTBP004 포함(mkcon·제작컨 · 수화물 아님) · 검수 리스트 규격 칸 «제작컨» · 씰 넷 ${seals.join(' ')} 전부`,
        want45F >= 1 && (t.totals.dis.F['45'] || 0) === want45F && su._madeUnit === true && su.mkcon === true && !su.lugg && />제작컨</.test(rowH) && !/>45HC</.test(rowH) && seals.every((x) => rowH.includes(x)) && rowH.includes(seals.join(' ')),
        `45F ${t.totals.dis.F['45']} · ${JSON.stringify({ mu: su._madeUnit, mk: su.mkcon, lg: su.lugg })} · ${rowH.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|').slice(0, 160)}`);
    }
    //  ⑥ 씰 가르기 — 같은 꼴 토큰이 이어 붙은 것만
    const sp = B.splitJoinedSeals('LF102335LF102350LF102345LF102336');
    ok(`splitJoinedSeals — «LF102335LF102350LF102345LF102336» 넷 · 일반 씰 «RZHT24690» 그대로 · 꼴이 다른 둘(«AB12345CDE678901») 그대로`, sp.length === 4 && sp.join(',') === 'LF102335,LF102350,LF102345,LF102336' && B.splitJoinedSeals('RZHT24690').join() === 'RZHT24690' && B.splitJoinedSeals('AB12345CDE678901').length === 1, JSON.stringify(sp));
    //  ⑦ 4.20 감사(Fable 판정 중-4) — 마감텔리 «Act. Cntr-Seal No List»: 제작컨 행은 세관 셀이 잘린 값(sl_orig 가 sl 의 앞부분)이면 같은 씰이라 안 싣는다.
    //    실제로 다른 씰이 적힌 사본이면 실린다 — SIZE 45'(L5G1) · ACTUAL 씰 넷. 일반 컨 행은 손대지 않는다.
    {
      const G5 = fx('daynight_gang_real.json').RZOR_R106E;
      const v = { info: G5.info, discharge: G5.discharge, loading: {} };
      const r0 = v.discharge.records.SAWTBP004, cut = !!r0 && String(r0.sl).startsWith(String(r0.sl_orig)) && String(r0.sl).length > String(r0.sl_orig).length;
      const rows0 = B.buildSealList(v, 'discharge');
      const v2 = JSON.parse(JSON.stringify(v)); v2.discharge.records.SAWTBP004.sl_orig = 'LF999999';
      const row2 = B.buildSealList(v2, 'discharge').find((x) => x.cn === 'SAWTBP004') || {};
      const act = String(row2.actualSeal || '').split(' ').filter(Boolean);
      ok(`R106E 씰 시트 — SAWTBP004 행 없음(세관 «${r0 && r0.sl_orig}» 은 «${r0 && r0.sl}» 의 잘린 앞부분 = 같은 씰) · 다른 씰 사본이면 SIZE ${row2.size} · ACTUAL ${act.length}개`,
        cut && !rows0.some((x) => x.cn === 'SAWTBP004') && row2.size === "45'" && act.length === 4 && act.join(' ') === 'LF102335 LF102350 LF102345 LF102336', JSON.stringify({ n0: rows0.length, row2 }));
    }
  }

  // ── R26 ───────────────────────────────────────────────────────────────
  //  4.21 — 마감적용 덱 갈래(RZOR 수석 마감텔리 STOWAGE PLAN xlsx). 실소스 firebase.js 를 메모리 스텁으로 묶는다(실제 쓰기 없음).
  const R26 = bundle([
    `export { fbApplyClosingEdi } from "${ROOT}/src/firebase.js";`,
    `export { closingEdiPlan } from "${ROOT}/src/loadingEdiExport.js";`,
    `export { isDeckPlanWorkbook, parseDeckPlanWorkbook, deckPlanRows, deckCoordMap } from "${ROOT}/src/rzorPlan.js";`,
  ].join('\n'), 'r26', `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --loader:.js=jsx --jsx=automatic`);
  head('R26 마감적용 — RZOR 는 수석 마감텔리 STOWAGE PLAN(xlsx)으로 마감한다 · 자리는 덱플랜 좌표(덱_줄_칸)로 stowagePlan 에 · 플랜에만 있는 제작컨은 대수에 (4.21)', '검수사 2026-10-10 05:31 «RZOR 마감적용에서 EDI대신에 위 파일로 되어 있습니다. 앱은 EDI만 받게 되어 있어서 적용이 되지 않습니다» · 05:32 «마감적용이라 는것 동방의 자료가 맞지 않아서 수기로 입력된 자료로 마감함 수석의 텔리에 있는 자료로 마감을 하기 위한것입니다» · 4.17 규칙 ①~④ · §7.8-⑦ · Fable 판정 4.21');
  {
    const FX = fx('closingdeck421_r111e.json'); const vk = FX.key;
    const clone = (o) => JSON.parse(JSON.stringify(o));
    //  독립 — 시트 글자 칸을 이 파일이 따로 읽는다(앱 파서를 부르지 않는다): 실컨번호 칸 · 비ISO 유닛 칸 · 덱(위에서부터 C·D·UNDER — 블록 머리는 SUB TOTAL 표의 SIZE 행)
    //    · 위치(그 칸 위쪽 머리줄 — 1~26 정수가 20개 넘는 행 — 의 같은 열 번호) · 줄(그 행 머리줄 오른쪽 끝 바깥 1~12 정수) · 덱별 SUB TOTAL(20'·40'·45'·TTL) · 칸 두 줄 아래 규격 글자(«F45'H»).
    const wb = XLSX.readFile(path.join(ROOT, 'tools/fixtures/rzor_plan_R111W.xlsx'), { cellStyles: true });
    const S = (() => {
      const ws = wb.Sheets[wb.SheetNames.find((n) => wb.Sheets[n] && wb.Sheets[n]['!ref'])];
      const at = (r, c) => { const x = ws[XLSX.utils.encode_cell({ r, c })]; return x && x.v != null ? x.v : null; };
      const subs = [], heads = [], cells = []; let voy = '';
      for (const a of Object.keys(ws)) {
        if (a[0] === '!') continue;
        const { r, c } = XLSX.utils.decode_cell(a); const v0 = ws[a].v;
        if (typeof v0 === 'string') {
          const t = v0.replace(/\s+/g, '').toUpperCase();
          if (CN_RE.test(t)) cells.push({ cn: t, r, c, made: false }); else if (/^[A-Z]{6}\d{3}$/.test(t)) cells.push({ cn: t, r, c, made: true });
          const mv = String(v0).match(/Voy\.?\s*No\.?\s*:?\s*([A-Z]?\d{3,4}[EWNS])/i); if (mv && !voy) voy = mv[1].toUpperCase();
        }
        if (String(v0).trim() === 'SIZE') {
          const row = { r };
          for (let k = c + 1; k < c + 20; k++) { const h = at(r, k); if (h != null && /^(20'|40'|45'|TTL)$/.test(String(h).trim())) row[String(h).trim()] = Number(at(r + 1, k)) || 0; }
          subs.push(row);
        }
      }
      subs.sort((x, y) => x.r - y.r);
      const rg = XLSX.utils.decode_range(ws['!ref']);
      for (let r = rg.s.r; r <= rg.e.r; r++) {
        const m = new Map();
        for (let c = rg.s.c; c <= rg.e.c; c++) { const v = at(r, c); if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 26) m.set(c, v); }
        if (m.size >= 20) heads.push({ r, m, maxC: Math.max(...m.keys()) });
      }
      const DK = ['C', 'D', 'U'];
      const pos = {};
      for (const x of cells) {
        const bi = subs.reduce((k, s, i) => (s.r <= x.r ? i : k), -1);
        const hd = heads.filter((h) => h.r < x.r && h.r >= subs[bi].r).pop();
        let line = 0; for (let c = hd.maxC + 1; c <= hd.maxC + 4 && !line; c++) { const v = at(x.r, c); if (typeof v === 'number' && v >= 1 && v <= 12) line = v; }
        pos[x.cn] = `${DK[bi]}_${line}_${String(hd.m.get(x.c)).padStart(2, '0')}`;
        x.deck = DK[bi]; x.typ = String(at(x.r + 2, x.c) || '');
      }
      return { cells, subs, pos, voy, iso: cells.filter((x) => !x.made).map((x) => x.cn), units: cells.filter((x) => x.made).map((x) => x.cn) };
    })();
    const A = new Set(Object.keys(FX.loading.ediContainers));   // 앱 평택 선적분(EDI 행 — 원자료)
    const C0 = FX.loading.completed;
    const isoIn = S.iso.filter((cn) => A.has(cn));
    const want = {
      confirm: isoIn.filter((cn) => C0[cn] && C0[cn].src === 'term' && C0[cn].termBasis === 'plan').length,
      add: isoIn.filter((cn) => !C0[cn]).length,
      human: isoIn.filter((cn) => C0[cn] && !(C0[cn].src === 'term' && C0[cn].termBasis === 'plan')).length,
      made: [...S.units, ...S.iso].filter((cn) => !A.has(cn) && !CN_RE.test(cn)).sort(),
      ediOnly: S.iso.filter((cn) => !A.has(cn)).length,
      planOnly: [...A].filter((cn) => C0[cn] && !S.cells.some((x) => x.cn === cn)).length,
    };
    //  ① xlsx → 덱플랜(검수사 STOWAGE PLAN 양식) → 마감적용 행 216 · 좌표 모양 · 칸마다 좌표 = 시트에서 따로 읽은 덱·줄·위치 · 항차 = info.voy_l
    const okWb = R26.isDeckPlanWorkbook(wb);
    const plan = R26.parseDeckPlanWorkbook(wb, XLSX);
    const rows = R26.deckPlanRows(plan);
    const badPos = rows.filter((r) => S.pos[r.cn] !== r.deckPos);
    const mk = rows.filter((r) => r.madeUnit);
    ok(`R111W STOWAGE PLAN(xlsx) → 검수사 양식 덱플랜 · 행 ${rows.length} = 시트 칸 ${S.cells.length}(실컨 ${S.iso.length} + 제작컨 ${S.units.join('·')}) · deckPos 전부 «덱_줄_칸» · 칸마다 = 시트에서 따로 읽은 덱·줄·위치 · 항차 ${plan.voy} = info.voy_l (수정 전 마감적용 파일 칸이 xlsx 를 안 받음)`,
      okWb && plan._fmt === 'checker' && rows.length === S.cells.length && S.cells.length === 216 && rows.every((r) => /^[A-Z]_\d+_\d{2}$/.test(r.deckPos)) && !badPos.length
        && mk.length === 1 && mk[0].cn === S.units[0] && mk[0].size === 45 && /45'/.test(S.cells.find((x) => x.made).typ) && plan.voy === FX.info.voy_l && S.voy === plan.voy && rows.every((r) => r.voy === S.voy),
      `행 ${rows.length} · 좌표 어긋남 ${badPos.slice(0, 3).map((r) => `${r.cn} ${r.deckPos}≠${S.pos[r.cn]}`).join(',')} · 제작컨 ${JSON.stringify(mk)} · voy ${plan.voy}`);
    //  ⑦ 덱마다 파서 칸 = 시트 SUB TOTAL TTL(C · D · UNDER) — 제작컨 칸 포함
    const deckN = (p, dk) => ((p.decks || []).find((d) => d.deck === dk) || { slots: [] }).slots.filter((s) => !s.empty).length;
    ok(`덱마다 플랜 칸 = 시트 SUB TOTAL TTL ${S.subs.map((x) => x.TTL).join('/')} (C/D/UNDER) · 합 ${plan.total} · 제작컨은 ${S.cells.find((x) => x.made).deck}덱`,
      S.subs.length === 3 && deckN(plan, 'C') === S.subs[0].TTL && deckN(plan, 'D') === S.subs[1].TTL && deckN(plan, 'U') === S.subs[2].TTL && plan.total === S.subs.reduce((a, x) => a + x.TTL, 0) && mk[0].deck === S.cells.find((x) => x.made).deck,
      `파서 ${deckN(plan, 'C')}/${deckN(plan, 'D')}/${deckN(plan, 'U')}`);
    //  ② 판정 한 벌(덱 갈래) — 동방 계획 완료 확정 · 새 완료 · 사람 · 자리 바뀜(덱플랜 없던 배 = 전부) · 제작컨 · 파일에만 있는 ISO 컨 · 파일에 없는 앱 완료
    const v0 = { key: vk, info: clone(FX.info), loading: clone(FX.loading) };
    const pl = R26.closingEdiPlan(v0, rows);
    ok(`closingEdiPlan 덱 갈래 — 확정 ${pl.counts.confirm} = ${want.confirm} · 새 완료 ${pl.counts.add} = ${want.add} · 사람 ${pl.counts.human} = ${want.human} · 자리 바뀜 ${pl.counts.posDiff} = ${isoIn.length}(덱플랜 없던 배) · 제작컨 [${pl.madeOnly.map((x) => x.cn)}] · 파일에만 있는 ISO 컨 ${pl.ediOnly.length} · 파일에 없는 앱 완료 ${pl.planOnly.length} (수정 전 ok:false «평택(KRPTK) 선적 컨과 자리를 읽지 못했습니다»)`,
      pl.ok && pl.fmt === 'deck' && pl.counts.confirm === want.confirm && want.confirm === 215 && pl.counts.add === want.add && pl.counts.human === want.human && pl.counts.posDiff === isoIn.length && !pl.counts.posKeep && pl.counts.assignOver === 0
        && pl.madeOnly.map((x) => x.cn).sort().join() === want.made.join() && want.made.join() === 'SAWTBP004' && pl.ediOnly.length === want.ediOnly && pl.planOnly.length === want.planOnly,
      JSON.stringify({ ok: pl.ok, why: pl.why, fmt: pl.fmt, counts: pl.counts, made: pl.madeOnly, want }).slice(0, 300));
    //  ③ 쓰기(메모리 RTDB) — 완료 시각 그대로 · 계획 표식만 걷힘 · stowagePlan = 이 플랜(assign 보존) · 제작컨 리스트 행 + 완료 · 선적 대수 215 → 216(마감텔리·홈 카드·미르) · 마감텔리 45' Full +1 · 바뀐 컨 moves
    const lsSave = localStorage.getItem('tallyone_me_today');
    localStorage.setItem('tallyone_me_today', JSON.stringify({ name: '김성일', ymd: new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10) }));
    try {
      const fresh = (mut) => { const L = clone(FX.loading); if (mut) mut(L); global.__memdb = { voyages: { [vk]: { info: clone(FX.info), loading: L } } }; global.__memlog = []; return L; };
      const L0 = fresh((L) => { L.stowagePlan = { assign: { 'D-1-26': { cn: 'ZZZU0000001', by: '연막', at: 1 } } }; });
      const before = { key: vk, info: FX.info, loading: L0, discharge: {} };
      const n0 = B.ptkContainers(before, 'loading').length;
      const t0 = B.computeTallyData(before).totals.load;
      const tryApply = async () => { try { return await R26.fbApplyClosingEdi(vk, '김성일', rows, plan, 'R111W STOWAGE PLAN.xlsx'); } catch (e) { return { err: String(e && e.message || e) }; } };   // 던져도 아래 단언이 ✘ 로 남게
      const res = await tryApply();
      const L = global.__memdb.voyages[vk].loading;
      const after = { key: vk, info: FX.info, loading: L, discharge: {} };
      const sameTs = isoIn.every((cn) => L.completed[cn].at === C0[cn].at && L.completed[cn].termBasis === undefined && L.completed[cn].src === 'term');
      const sp = L.stowagePlan || {};
      const slotN = (sp.decks || []).reduce((a, d) => a + (d.slots || []).filter((s) => !s.empty && s.cn).length, 0);
      const dm = R26.deckCoordMap(sp);
      const posBad = Object.keys(S.pos).filter((cn) => dm.get(cn) !== S.pos[cn]);
      const su = L.records.SAWTBP004 || {}, sc = L.completed.SAWTBP004 || {};
      const n1 = B.ptkContainers(after, 'loading').length, pg = B.progressOf(L, 'loading', new Set()), mc = B.voyageCountsOf(after).byMode.loading.total;
      const t1 = B.computeTallyData(after).totals.load;
      const mvBad = isoIn.filter((cn) => { const m = ((L.records[cn] || {}).moves || []).slice(-1)[0]; return !(m && m.why === 'actual' && m.from === '자리 없음' && m.to === S.pos[cn]); });
      ok(`적용 — 확정 ${res.confirmed} · 새 완료 ${res.added} · 자리 바뀜 ${res.moved} · 제작컨 ${res.madeAdded} · 동방 완료 ${isoIn.length}대 시각(at) 그대로·계획 표식만 걷힘 · stowagePlan 칸 ${slotN} = 시트 ${S.cells.length} · 칸 좌표 = 시트 · 검수원 지정(assign) 그대로 · _src closing`,
        res.fmt === 'deck' && res.confirmed === want.confirm && res.added === 0 && res.moved === isoIn.length && res.madeAdded === 1 && sameTs && slotN === S.cells.length && !posBad.length
          && sp.assign && sp.assign['D-1-26'] && sp.assign['D-1-26'].cn === 'ZZZU0000001' && sp._src === 'closing' && sp._file === 'R111W STOWAGE PLAN.xlsx',
        JSON.stringify({ res, sameTs, slotN, posBad: posBad.slice(0, 3), assign: sp.assign, src: sp._src }).slice(0, 300));
      ok(`제작컨 SAWTBP004 — 리스트 행(mkcon · 제작컨 표식 · 규격 코드 없음 · 출처 파일명 · 크기 45) + 완료(src edi · 이름 없음) · 선적 대수 마감텔리 ${n0} → ${n1} · 홈 카드 ${pg.ptk.total} · 미르 ${mc} = 시트 ${S.cells.length} · 마감텔리 45' Full ${t0.F['45']} → ${t1.F['45']}(F45'H)`,
        su.mkcon === true && su._madeUnit === true && su.iso === '' && su._source === 'R111W STOWAGE PLAN.xlsx' && su.size === 45 && su.pol === 'KRPTK' && sc.src === 'edi' && sc.by === '' && sc.at === res.at
          && n0 === A.size && n1 === S.cells.length && pg.ptk.total === S.cells.length && pg.ptk.done === S.cells.length && mc === S.cells.length && t1.F['45'] === t0.F['45'] + 1 && t1.n === t0.n + 1,
        JSON.stringify({ su, sc, n0, n1, pg: pg.ptk, mc, f45: [t0.F['45'], t1.F['45']] }).slice(0, 300));
      ok(`바뀐 컨 records moves 한 줄(자리 없음 → 시트 좌표 · why actual) ${isoIn.length - mvBad.length}/${isoIn.length} · 베이 칸(bay_actual)은 안 씀`,
        !mvBad.length && isoIn.every((cn) => (L.records[cn] || {}).bay_actual === undefined && (L.records[cn] || {}).actual_by === '김성일'), mvBad.slice(0, 3).join(','));
      //  ④ 수석 플랜 자리가 이긴다(Fable 판정 4.21-2 · 05:32 «수석의 텔리에 있는 자료로 마감») — 사람이 찍은 완료는 시각·이름 그대로 · 검수원 지정 자리(assign)가 파일과 다르면 플랜 자리로
      //     (assignOver 로 알림 · 그 핀 지움 · moves note) · 새 플랜에서 칸이 찬 낡은 핀도 지움 · 그 밖의 핀은 그대로
      const hx = isoIn[0];
      const hy = Object.keys(S.pos).find((cn) => S.pos[cn] === 'D_1_05');   // 시트에서 D덱 1줄 5칸에 있는 컨
      const yKey = 'C-1-1';   // 지정 자리 C_1_01 — 시트에서 빈 칸
      const zCn = isoIn.find((cn) => cn !== hx && cn !== hy);
      const zKey = (() => { const [d, l, c] = S.pos[zCn].split('_'); return `${d}-${l}-${Number(c)}`; })();   // 시트에서 찬 칸에 꽂힌 낡은 핀(목록 밖 번호)
      const hxC = { by: '김성일', at: 1791560000000, equip: '5호기' }, hyC = { by: '박철민', at: 1791561000000, src: 'user' };
      const mutH = (Lx) => { Lx.completed[hx] = clone(hxC); Lx.completed[hy] = clone(hyC);
        Lx.stowagePlan = { assign: { [yKey]: { cn: hy, by: '박철민', at: 1791561000000 }, [zKey]: { cn: 'ZZZU0000002', by: '연막', at: 2 }, 'D-1-26': { cn: 'ZZZU0000001', by: '연막', at: 1 } } }; };
      const pl4 = R26.closingEdiPlan({ key: vk, info: FX.info, loading: (() => { const Lx = clone(FX.loading); mutH(Lx); return Lx; })() }, rows);
      fresh(mutH);
      const r4 = await tryApply();
      const L4 = global.__memdb.voyages[vk].loading;
      const asg4 = (L4.stowagePlan || {}).assign || {};
      const mvY = (L4.records[hy] || {}).moves || [], mvX = (L4.records[hx] || {}).moves || [];
      ok(`수석 플랜 자리가 이긴다 — 사람 완료 2(${hx} 김성일 · ${hy} 박철민) 시각·이름 그대로 · ${hy} 지정 자리 C_1_01 → 파일 ${S.pos[hy]}(검수원 지정과 다름 ${pl4.counts.assignOver}) · 그 핀·찬 칸 핀 지움 · 다른 핀 그대로 · moves 한 줄(note closing-over-assign) · 자리 바뀜 ${pl4.counts.posDiff} = ${isoIn.length}`,
        S.pos[hy] === 'D_1_05' && pl4.counts.human === 2 && pl4.counts.assignOver === 1 && !pl4.counts.posKeep && pl4.counts.posDiff === isoIn.length && pl4.counts.confirm === want.confirm - 2
          && [...pl4.assignClear].sort().join() === [yKey, zKey].sort().join() && r4.moved === isoIn.length && r4.human === 2 && r4.assignOver === 1
          && JSON.stringify(L4.completed[hx]) === JSON.stringify(hxC) && JSON.stringify(L4.completed[hy]) === JSON.stringify(hyC)
          && R26.deckCoordMap(L4.stowagePlan).get(hy) === 'D_1_05' && !asg4[yKey] && !asg4[zKey] && asg4['D-1-26'] && asg4['D-1-26'].cn === 'ZZZU0000001'
          && mvY.length === 1 && mvY[0].from === 'C_1_01' && mvY[0].to === 'D_1_05' && mvY[0].why === 'actual' && mvY[0].note === 'closing-over-assign'
          && mvX.length === 1 && mvX[0].from === '자리 없음' && mvX[0].to === S.pos[hx] && !mvX[0].note,
        JSON.stringify({ c: pl4.counts, clr: pl4.assignClear, r4: { moved: r4.moved, human: r4.human, over: r4.assignOver, err: r4.err }, asg: Object.keys(asg4), mvY, cx: L4.completed[hx], cy: L4.completed[hy] }).slice(0, 400));
      //  ⑧ 다른 항차의 플랜은 받지 않는다(Fable 판정 4.21-1) — 시트 «Voy. No.» 와 이 항차(info.voy_l, 없으면 info.voy)를 번호로 대조(utils.voyEq)
      const wb75 = XLSX.readFile(path.join(ROOT, 'tools/fixtures/rzor_plan_R075W.xlsx'), { cellStyles: true });
      const p75 = R26.parseDeckPlanWorkbook(wb75, XLSX), rows75 = R26.deckPlanRows(p75);
      const pl8 = R26.closingEdiPlan({ key: vk, info: FX.info, loading: clone(FX.loading) }, rows75);
      const pl8b = R26.closingEdiPlan({ key: vk, info: { ...FX.info, voy_l: '' }, loading: clone(FX.loading) }, rows);   // voy_l 이 없으면 info.voy(R111E) — 번호 R111 같음
      fresh();
      let e8 = '';
      try { await R26.fbApplyClosingEdi(vk, '김성일', rows75, p75, 'R075W STOWAGE PLAN.xlsx'); } catch (e) { e8 = String(e && e.message); }
      const why8 = `플랜 항차 R075W 가 이 항차 ${FX.info.voy_l} 와 다릅니다`;
      ok(`다른 항차 플랜(R075W) — 판정 ok:false «${pl8.why}» · 쓰기 던짐 · 쓴 것 0 · voy_l 없으면 info.voy(${FX.info.voy})로 대조해 R111W 플랜은 받음`,
        pl8.ok === false && pl8.why === why8 && e8.includes(why8) && !global.__memlog.length && pl8b.ok === true, JSON.stringify({ why: pl8.why, e8, b: pl8b.ok }));
      //  ⑨ 제작컨에 이미 완료(사람)가 있으면 규칙 ① 그대로 — 리스트 행만 더해 대수에 넣는다
      const sw0 = { by: '박철민', at: 1791562000000, src: 'user' };
      fresh((Lx) => { Lx.completed.SAWTBP004 = clone(sw0); });
      const r9 = await tryApply();
      const L9 = global.__memdb.voyages[vk].loading;
      ok(`제작컨 SAWTBP004 에 사람 완료(박철민)가 이미 있으면 완료는 그대로 · 리스트 행만 더함 · 선적 대수 ${B.ptkContainers({ key: vk, info: FX.info, loading: L9, discharge: {} }, 'loading').length}`,
        JSON.stringify(L9.completed.SAWTBP004) === JSON.stringify(sw0) && (L9.records.SAWTBP004 || {})._madeUnit === true && r9.madeAdded === 1 && B.ptkContainers({ key: vk, info: FX.info, loading: L9, discharge: {} }, 'loading').length === S.cells.length,
        JSON.stringify({ c: L9.completed.SAWTBP004, r: L9.records.SAWTBP004, err: r9.err }).slice(0, 200));
      //  ⑩ 마감텔리 선적 모집단에는 마감적용이 넣은 제작컨(_madeUnit)만 더한다 — EDI 에 없는 다른 리스트 전용 행(ISO 컨 · _madeUnit 없는 제작컨 꼴)은 종전대로 안 든다
      const v10 = { key: vk, info: FX.info, discharge: {}, loading: clone(FX.loading) };
      v10.loading.records.TSTU1234567 = { cn: 'TSTU1234567', pol: 'KRPTK', iso: '45G1', fe: 'F', _source: 'R111W_CLL extra.xls', _inList: true };
      v10.loading.records.SAWTBP009 = { cn: 'SAWTBP009', pol: 'KRPTK', fe: 'F', mkcon: true, _source: 'R111W_CLL extra.xls', _inList: true };
      const n10 = B.ptkContainers(v10, 'loading');
      ok(`EDI 에 없는 리스트 전용 행(ISO TSTU1234567 · _madeUnit 없는 SAWTBP009)은 마감텔리 선적 모집단에 안 든다 — ${n10.length} = EDI ${A.size}`,
        n10.length === A.size && !n10.some((c) => c.cn === 'TSTU1234567' || c.cn === 'SAWTBP009'), n10.filter((c) => !A.has(c.cn)).map((c) => c.cn).join(','));
      //  ⑥ 동방이 아닌 배는 판정이 거절하고 쓰는 자리도 아무것도 안 쓴다
      const pctc = { key: vk, info: { ...FX.info, pier: 'PCTC' }, loading: clone(FX.loading) };
      const pl6 = R26.closingEdiPlan(pctc, rows);
      fresh(); global.__memdb.voyages[vk].info.pier = 'PCTC';
      let e6 = '';
      try { await R26.fbApplyClosingEdi(vk, '김성일', rows, plan, 'x.xlsx'); } catch (e) { e6 = String(e && e.message); }
      ok(`PNCT 아닌 배(info.pier PCTC 사본) — 판정 ok:false «${pl6.why}» · 쓰기 던짐 · 쓴 것 0`, pl6.ok === false && /동방\(PNCT\)/.test(pl6.why) && /동방\(PNCT\)/.test(e6) && !global.__memlog.length, e6);
    } finally {
      if (lsSave == null) localStorage.removeItem('tallyone_me_today'); else localStorage.setItem('tallyone_me_today', lsSave);
    }
    //  ⑤ 베이 갈래(PTK.EDI)는 그대로 — OBWH 2762W 실제 항차를 EDI 꼴 행(베이·로우·단)으로 판정하면 fmt bay · 제작컨 없음 · 확정 = 원자료에서 센 동방 계획 완료(4.17 기대값은 smoke_closingedi417 이 그대로 잰다)
    {
      const OB = fx('closingedi_obwh2762.json');
      const erows = Object.values(OB.loading.ediContainers).map((c) => ({ cn: c.cn, bay: c.bay, row: c.row, tier: c.tier, pol: 'KRPTK' }));
      const p5 = R26.closingEdiPlan({ info: OB.info, loading: OB.loading }, erows);
      const c5 = Object.keys(OB.loading.ediContainers).filter((cn) => { const c = OB.loading.completed[cn]; return c && c.src === 'term' && c.termBasis === 'plan'; }).length;
      ok(`베이 갈래 그대로 — OBWH 2762W EDI 꼴 ${erows.length}행 → fmt bay · 제작컨 0 · 확정 ${p5.counts.confirm} = 원자료 동방 계획 완료 ${c5}`, p5.ok && p5.fmt === 'bay' && p5.madeOnly.length === 0 && p5.counts.confirm === c5 && c5 > 0, JSON.stringify(p5.counts));
    }
  }

  // ── R27 ───────────────────────────────────────────────────────────────
  //  4.22 — 주의 박스 «자료별 대조»(sourceRecon.reconcileSources 한 벌 · 진단 source_recon · 패널 TruncList). 기대값은 픽스처 원자료에서 따로 센다.
  //    감사 반영(Fable 판정 2026-10-10) — 세관이 있는 배의 «선사 ✗» 는 어긋남 아님(OBWH 2761E) · 사람이 확정한 평택 아닌 POD 는 참고 줄 · 시프팅은 «완료·실적에만» 에 안 든다(MCSC 633N) ·
  //    후보·번호 없음 셈(XTPG 541E · KBTR 변이) · 진단 skip · 터미널 수량 둘(배정표·본선현황 — KKLC 2609N 라이브 info) · 세관 검수 결과 코드표(검수사 09:34 원문).
  head('R27 자료별 대조 — EDI·세관·선사 리스트(선사 요구 메일)·완료·터미널 실적·터미널 배정·본선현황 수량 중 어느 한쪽에만 있는 컨을 묶음별로 컨번호·선사·출발항과 함께 알린다 · 넘치면 «외 N건 — 나머지 보기» · 세관 코드 후보 (4.22)',
    '검수사 2026-10-10 07:52 «부족한건 앱에서 보여주면서 넘치는건 안보여줌» · 07:53 «둘다 앱에 알림표기 … 컨넘버와 관련선사 표기 출발 항구등» · 08:08 «EDI와 선사요구메일 세관 터미널 등이 다 적용 … 나머지도 보고자 하면 볼수 있어야 합니다» · 09:30 동방 본선현황 캡처(KKLC 2609N 양하 139 · QC101 73 · QC103 66) · 09:34 세관 검수 결과 코드표');
  {
    const F = { kbtr: fx('recon422_kbtr.json'), kklc: fx('recon422_kklc.json'), mcap: fx('recon422_mcap.json'), tmpz: fx('recon422_tmpz.json'),
      obwh: fx('recon422_obwh.json'), mcsc: fx('recon422_mcsc.json'), xtpg: fx('recon422_xtpg.json'), tnjp: fx('recon422_tnjp.json') };
    const NS = fx('recon422_nsfr_l.json');   // NSFR 2619N 선적(재감사 GET 사본) — EDI 104 · records 0
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const V = (f) => ({ key: f.key, info: f.info, discharge: f.discharge, ...(f.loading ? { loading: f.loading } : {}), ...(f.restowList ? { restowList: f.restowList } : {}) });
    //  원자료에서 따로 센다 — EDI 유닛 행(행의 cn, 없으면 키 · «_» 로 시작하는 자리표시 키 빼고 · 예약 자리 빼고) · 세관 행 · 선사 행(선사 파서 표식 iso_carrier 칸 · 세관 아닌 파일 행 · 선사 메일 지정)
    const ediUnits = (sec) => Object.entries(sec.ediContainers || {}).map(([k, e]) => [String((e && e.cn) || k), e]).filter(([cn, e]) => e && cn && !cn.startsWith('_') && !e.isBooking && !e.pendingCn);
    const ediPtkOf = (sec) => new Set(ediUnits(sec).filter(([, e]) => isPtkCode(e.pod)).map(([cn]) => cn));
    const custOf = (sec) => new Set(Object.keys(sec.records || {}).filter((cn) => sec.records[cn]._customs));
    const carOf = (sec) => new Set(Object.keys(sec.records || {}).filter((cn) => { const r = sec.records[cn]; return 'iso_carrier' in r || (!r._customs && r._source) || r.pod_pick === 'mail'; }));
    const doneTermOf = (sec) => new Set([...Object.keys(sec.completed || {}).filter((cn) => sec.completed[cn] && !(sec.completed[cn] && sec.completed[cn].flag === 'missing')), ...Object.keys(sec.termWork || {})]);
    //  사람(수석·검수사)이 POD 를 확정한 꼴 — fbPickPod 와 같은 칸(records pod·pod_pick·pod_pick_label·pod_picked_by · EDI 노드는 표식만, pod 는 안 덮는다)
    const pickPod = (v, cn, pod) => { const r = v.discharge.records[cn] || {}; v.discharge.records[cn] = { ...r, cn, pod, pod_orig: r.pod == null ? '' : r.pod, pod_pick: 'edi', pod_pick_label: pod, pod_picked_by: '수석', pod_picked_at: 1 }; const e = v.discharge.ediContainers[cn]; if (e) Object.assign(e, { pod_pick: 'edi', pod_pick_label: pod }); };
    const R = {}; for (const [k, f] of Object.entries(F)) R[k] = B.reconcileSources(V(f), 'discharge');
    const grp = (r, key) => (r.groups.find((g) => g.key === key) || { items: [] }).items;
    const gOf = (r, key) => r.groups.find((g) => g.key === key) || {};
    //  진단은 VoyagePage 처럼 — EDI 평택분은 확정 POD 를 반영해(3.53 isPtkResolved) 거른다.
    const diagOf = (f, mode = 'discharge', extra = {}) => {
      const sec = f[mode] || {}, recs = sec.records || {};
      const ediPtk = {}; for (const [cn, e] of ediUnits(sec)) { const pod = recs[cn] && recs[cn].pod_pick && recs[cn].pod ? recs[cn].pod : e.pod; if (mode === 'discharge' ? isPtkCode(pod) : isPtkCode(e.pol)) ediPtk[cn] = { ...e, cn }; }
      return B.runDiagnostics({ ediContainers: ediPtk, listRecords: recs, xrayList: {}, mode, carrier: '', voyage: V(f), voyageKey: f.key, ...extra });
    };
    const srOf = (a) => a.find((x) => x.code === 'source_recon');
    //  검수사 2026-10-10 09:34 원문 코드표 — 이 파일이 원문에서 따로 옮겨 적었다(앱 표와 ⑩ 에서 맞춰 보고, 화면 머리 글자도 이것으로 기대한다)
    const RAW_CODES = 'AWP : 생물이 죽었음 / CND : 컨테이너번호 다름 / CNN : 컨테이너 번호 없음 / CSL : 세관봉인부착 / ETC : 기타 / MFN : 화물있으나 적하목록 없음 / MGN : 적하목록있으나 화물없음 / OKY : 이상없음 / PER : 부패 / SLN : 봉인번호 다름 / SLW : 봉인번호 파손 / WET : 비에 젖음';
    const CC = Object.fromEntries(RAW_CODES.split(' / ').map((x) => x.split(' : ')));

    //  ① KKLC 2609N(라이브 info — 배정 139 · 본선현황 QC101 73 + QC103 66) — EDI 평택 139 · 세관 119 · 선사 리스트 없음 → «EDI 평택인데 세관 밖» = EDI 평택 − 세관 행 · 세관 코드 MFN 후보
    {
      const s = F.kklc.discharge, ep = ediPtkOf(s), cu = custOf(s);
      const want = [...ep].filter((cn) => !cu.has(cn)).sort();
      const ediRow = Object.fromEntries(ediUnits(s));
      const g3 = grp(R.kklc, 'g3');
      ok(`KKLC 2609N — «EDI 평택인데 세관 밖» ${g3.length}대 = 원자료 EDI 평택 ${ep.size} − 세관 ${cu.size} = ${want.length}대 · 전부 45RE E(EDI 칸) · 패턴 «EDI ✓ 세관 ✗» · 다른 묶음 없음 · 세관 코드 ${gOf(R.kklc, 'g3').code} 후보`,
        g3.map((x) => x.cn).sort().join() === want.join() && want.length === 20 && R.kklc.groups.length === 1 && R.kklc.total === want.length && gOf(R.kklc, 'g3').code === 'MFN'
          && want.every((cn) => ediRow[cn].iso === '45RE' && ediRow[cn].fe === 'E') && g3.every((x) => x.iso === '45RE' && x.fe === 'E' && x.pattern === 'EDI ✓ 세관 ✗'),
        JSON.stringify({ n: g3.length, want: want.length, groups: R.kklc.groups.map((g) => [g.key, g.items.length, g.code]), p: g3[0] && g3[0].pattern }));
      //  터미널 수량 둘 — 배정표(info.planDis)와 본선현황(info.qcWork 호기마다 disDone+disRest 합) · 차이는 배정표로 잰다 · 앱은 4.20 규칙(세관 + 추가분)
      const I = F.kklc.info, qcSum = Object.values(I.qcWork || {}).reduce((a, q) => a + (Number(q.disDone) || 0) + (Number(q.disRest) || 0), 0);
      const appWant = unitsByRule(s).set.size, S = R.kklc.sources;
      ok(`KKLC 터미널 — 배정 ${S.plan.n}(info.planDis ${I.planDis}) · 본선현황 ${S.qc.n}(호기 ${Object.keys(I.qcWork || {}).join('+')} = ${qcSum}) · EDI ${S.edi.n} · 세관 ${S.customs.n} · 선사 리스트 자료 없음 · 앱 ${R.kklc.app} = 원자료 ${appWant} · 차이 ${R.kklc.gap} · 번호 없음 ${R.kklc.unknown}`,
        S.plan.n === I.planDis && I.planDis === 139 && S.qc.has && S.qc.n === qcSum && qcSum === 139 && R.kklc.term.basis === 'plan' && S.edi.n === ep.size && S.customs.n === cu.size && !S.carrier.has
          && R.kklc.app === appWant && R.kklc.gap === appWant - I.planDis && R.kklc.gap === 0 && R.kklc.unknown === 0,
        JSON.stringify({ S, term: R.kklc.term, app: R.kklc.app, gap: R.kklc.gap }));
      //  배정표가 없으면 본선현황으로 잰다 · 둘 다 없으면 차이를 말하지 않는다
      const K0 = clone(F.kklc); K0.info.planDis = 0;
      const K00 = clone(K0); delete K00.info.qcWork;
      const R0 = B.reconcileSources(V(K0), 'discharge'), R00 = B.reconcileSources(V(K00), 'discharge');
      ok(`배정표 없는 사본 — 본선현황 ${R0.term.n} 으로 잰다(차이 ${R0.gap}) · 본선현황도 없으면 차이 없음(${R00.gap})`,
        !R0.sources.plan.has && R0.term.basis === 'qc' && R0.term.n === qcSum && R0.gap === appWant - qcSum && R00.term.basis === null && R00.gap === null && R00.unknown === 0,
        JSON.stringify({ t0: R0.term, g0: R0.gap, t00: R00.term, g00: R00.gap }));
    }
    //  ② KKLC — 수석이 BMOU9237016 POD 를 CNSHA 로 확정한 사본 → 묶음·총수에서 빠지고 «POD 확정 — 평택 아님(참고)» 1대 · 앱 138(4.20 — 고른 평택 아닌 POD 는 뺀다) · 배정 139 와의 −1 은 그 참고 컨이 후보
    {
      const KP = clone(F.kklc); pickPod(KP, 'BMOU9237016', 'CNSHA');
      const RP = B.reconcileSources(V(KP), 'discharge');
      const s = KP.discharge, recs = s.records;
      const want = [...ediPtkOf(s)].filter((cn) => !custOf(s).has(cn) && !(recs[cn] && recs[cn].pod_pick && !isPtkCode(recs[cn].pod))).sort();
      const appWant = [...unitsByRule(s).set].filter((cn) => !(recs[cn] && recs[cn].pod_pick && !isPtkCode(recs[cn].pod))).length;
      const g3 = grp(RP, 'g3');
      ok(`KKLC BMOU9237016 수석 확정 CNSHA — «EDI 평택인데 세관 밖» ${g3.length}대 = ${want.length} · 참고 ${RP.ref.length}대(${RP.ref.map((x) => `${x.cn} POD 확정 ${x.pick}`).join()}) · 어긋남 ${RP.total} · 앱 ${RP.app} = 원자료 ${appWant} · 차이 ${RP.gap} · 후보 ${RP.explained} · 번호 없음 ${RP.unknown}`,
        g3.map((x) => x.cn).sort().join() === want.join() && want.length === 19 && RP.total === 19 && RP.ref.length === 1 && RP.ref[0].cn === 'BMOU9237016' && RP.ref[0].pick === 'CNSHA' && !RP.ref[0].inApp
          && RP.app === appWant && appWant === 138 && RP.gap === -1 && RP.explained === 1 && RP.unknown === 0,
        JSON.stringify({ g3: g3.length, ref: RP.ref.map((x) => x.cn), total: RP.total, app: RP.app, gap: RP.gap, ex: RP.explained, unk: RP.unknown }));
      const dP = diagOf(KP), a = srOf(dP), ls = dP.find((x) => x.code === 'list_short');
      ok(`진단 — 확정 사본: 리스트 부족 ${ls && ls.count} 와 대조 어긋남 ${a && a.details.total} 이 같은 수 → 대조 음성은 터미널 차이만 «${a && a.voice}» · 음성 서명 수 ${a && a.count}`,
        a && ls && ls.count === 19 && a.details.total === 19 && a.voice === '터미널과 1대 차이' && a.count === 19, JSON.stringify({ v: a && a.voice, c: a && a.count, ls: ls && ls.count }));
    }
    //  ③ MCAP 639N — 선사 메일(STOWAGE INSTRUCTION)이 평택 양하로 지정한 통과 컨 = 세관 표식 없는 records 행. 앱 대수는 3.53 «고른 POD 가 EDI 를 이긴다» 로 센다(R16 과 같음).
    {
      const s = F.mcap.discharge, recs = s.records, cu = custOf(s);
      const nonCust = Object.keys(recs).filter((cn) => !recs[cn]._customs).sort();
      const g2 = grp(R.mcap, 'g2');
      const srcOk = g2.every((x) => x.src === (recs[x.cn]._source || recs[x.cn].pod_picked_by) && /STOWAGE INSTRUCTION/.test(x.src));
      const ediRow = Object.fromEntries(ediUnits(s));
      const podOf = (cn, e) => (recs[cn] && recs[cn].pod_pick && recs[cn].pod ? recs[cn].pod : e.pod);
      const appWant = new Set([...cu, ...ediUnits(s).filter(([cn, e]) => isPtkCode(podOf(cn, e))).map(([cn]) => cn)]).size;
      ok(`MCAP 639N — «선사 리스트·메일에만» ${g2.length}대 = 세관 표식 없는 records 행 ${nonCust.length}대 · 출처(선사 메일 제목) 보존 · EDI 는 통과(원문 POD ${nonCust.map((cn) => ediRow[cn] && ediRow[cn].pod).filter((v, i, a) => a.indexOf(v) === i).join('·')}) · 다른 어긋남 없음 · 참고 없음(메일 지정은 선사 자료)`,
        g2.map((x) => x.cn).sort().join() === nonCust.join() && nonCust.length === 5 && srcOk && R.mcap.total === 5 && !R.mcap.ref.length && g2.every((x) => x.edi === 'thru' && x.carrier && !x.customs && /^EDI 통과\(/.test(x.pattern)),
        JSON.stringify(g2.slice(0, 2)).slice(0, 300));
      ok(`MCAP 터미널 배정 ${F.mcap.info.planDis} · 앱 ${R.mcap.app} = 원자료(세관 ${cu.size} ∪ 고른 POD 반영 EDI 평택) ${appWant} · 차이 0 · 번호 없음 0`,
        R.mcap.sources.plan.n === F.mcap.info.planDis && R.mcap.app === appWant && appWant === 223 && R.mcap.gap === 0 && R.mcap.unknown === 0,
        JSON.stringify({ plan: R.mcap.sources.plan, app: R.mcap.app, appWant, gap: R.mcap.gap, unk: R.mcap.unknown }));
    }
    //  ④ KBTR 2608E — EDI 평택 = 세관 = 선사 175 · 어긋남 0 · 배정 179 → 앱 175 (−4) 는 번호로 못 가린다 → «번호 없음 4대». EDI 422행 중 «__SLOT_» 빈 자리 8행은 유닛이 아니다.
    {
      const s = F.kbtr.discharge;
      const U = unitsByRule(s);
      const slots = Object.entries(s.ediContainers).filter(([k, e]) => k.startsWith('__') && !e.cn);
      const gapWant = U.set.size - F.kbtr.info.planDis;
      ok(`KBTR 2608E — EDI ${Object.keys(s.ediContainers).length}행(빈 자리 ${slots.length}행) · 어긋남 0 · 배정 ${F.kbtr.info.planDis} · 앱 ${R.kbtr.app} = 원자료 규칙 ${U.set.size} · 차이 ${R.kbtr.gap} = ${gapWant} · 번호 없음 ${R.kbtr.unknown}대`,
        Object.keys(s.ediContainers).length === 422 && slots.length === 8 && R.kbtr.total === 0 && !R.kbtr.groups.length
          && R.kbtr.app === U.set.size && R.kbtr.gap === gapWant && gapWant === -4 && R.kbtr.unknown === 4 && R.kbtr.explained === 0 && R.kbtr.sources.edi.n === ediPtkOf(s).size,
        JSON.stringify({ app: R.kbtr.app, gap: R.kbtr.gap, unk: R.kbtr.unknown, total: R.kbtr.total, S: R.kbtr.sources }).slice(0, 300));
      //  변이 — 빈 자리 8행의 POD 를 평택으로(번호 없이 평택 자리만 온 EDI) 바꿔도 유닛이 아니다 → 어긋남 0 그대로 · 번호 대기 8자리(세관 코드 CNN 후보)
      const m = clone(F.kbtr); for (const [k] of slots) m.discharge.ediContainers[k].pod = 'KRPTK';
      const Rm = B.reconcileSources(V(m), 'discharge');
      ok(`KBTR 빈 자리(__SLOT_) ${slots.length}행 POD 를 평택으로 바꾼 사본 — 그래도 어긋남 0 · EDI 평택 ${Rm.sources.edi.n} 그대로 · 번호 대기 ${Rm.sources.pending.n}자리(CNN 후보)`,
        Rm.total === 0 && Rm.sources.edi.n === R.kbtr.sources.edi.n && Rm.sources.pending.n === slots.length && R.kbtr.sources.pending.n === 0,
        JSON.stringify({ total: Rm.total, groups: Rm.groups.map((g) => [g.key, g.items.length]), edi: Rm.sources.edi, pend: Rm.sources.pending }));
      //  «번호 없음» 은 차이에서 후보를 뺀 수다(묶음 수가 아니다) · 후보는 앱 안팎(inApp)으로 가린다 — EDI 평택 추가분 2대를 넣은 사본: 앱 177 · 배정 179 (−2) · 그 2대는 앱 안이라 −2 의 후보가 아니다 → 번호 없음 2
      const kb2 = clone(F.kbtr); ['TSTU9000011', 'TSTU9000022'].forEach((cn) => { kb2.discharge.ediContainers[cn] = { cn, pod: 'KRPTK', pol: 'CNSHA', iso: '22G1', fe: 'F' }; });
      const R2 = B.reconcileSources(V(kb2), 'discharge'), app2 = unitsByRule(kb2.discharge).set.size;
      const cand = grp(R2, 'g3').filter((x) => !x.inApp).length;
      ok(`KBTR + EDI 평택 추가분 2대 — 앱 ${R2.app} = 원자료 ${app2} · 차이 ${R2.gap} · «EDI 평택인데 세관 밖» ${grp(R2, 'g3').length}대(앱 안 — 후보 ${cand}) → 후보 ${R2.explained} · 번호 없음 ${R2.unknown} = |${R2.gap}| − ${cand}`,
        R2.app === app2 && app2 === 177 && R2.gap === app2 - F.kbtr.info.planDis && grp(R2, 'g3').length === 2 && cand === 0 && R2.explained === 0 && R2.unknown === Math.abs(R2.gap) - cand && R2.unknown === 2,
        JSON.stringify({ app: R2.app, gap: R2.gap, ex: R2.explained, unk: R2.unknown, g: R2.groups.map((g) => [g.key, g.items.length]) }));
    }
    //  ⑤ TMPZ 2034E — 세관 자료 없음 · EDI 평택 30 · 선사 리스트 42 → «선사 리스트에만» = 선사 행 − EDI 평택. 세관이 없는 배는 선사 리스트가 기준(4.20 basis 'list')
    {
      const s = F.tmpz.discharge, car = carOf(s), ep = ediPtkOf(s);
      const want = [...car].filter((cn) => !ep.has(cn)).sort();
      const g2 = grp(R.tmpz, 'g2');
      ok(`TMPZ 2034E — 세관 자료 없음 · EDI ${ep.size} · 선사 리스트 ${car.size} · «선사 리스트·메일에만» ${g2.length}대 = ${want.length}대 · 패턴 «EDI ✗ 선사 ✓» · 출처 파일 ${g2[0] && g2[0].src}`,
        !R.tmpz.sources.customs.has && R.tmpz.sources.carrier.n === car.size && g2.map((x) => x.cn).sort().join() === want.join() && want.length === 12
          && g2.every((x) => x.pattern === 'EDI ✗ 선사 ✓' && x.src === s.records[x.cn]._source) && R.tmpz.total === 12,
        JSON.stringify({ g2: g2.length, want: want.length, S: R.tmpz.sources }));
      //  변이 — EDI 평택인 선사 행 하나를 지운 사본: 세관이 없으니 선사 리스트 밖 EDI 평택은 «EDI 평택인데 선사 리스트 밖» (세관 코드 후보 없음 — 코드표는 세관 적하목록 기준)
      const gone = [...ep].filter((cn) => car.has(cn)).sort()[0];
      const tm = clone(F.tmpz); delete tm.discharge.records[gone];
      const Rt = B.reconcileSources(V(tm), 'discharge'), g3 = gOf(Rt, 'g3');
      ok(`TMPZ 선사 행 ${gone} 를 지운 사본 — «${g3.label}» ${(g3.items || []).map((x) => x.cn)} · 패턴 «${g3.items && g3.items[0] && g3.items[0].pattern}» · 세관 코드 후보 없음`,
        (g3.items || []).length === 1 && g3.items[0].cn === gone && g3.label === 'EDI 평택인데 선사 리스트 밖 (추가분)' && g3.items[0].pattern === 'EDI ✓ 선사 ✗' && !g3.code && Rt.total === 13,
        JSON.stringify({ g: Rt.groups.map((g) => [g.key, g.items.length, g.code]) }));
    }
    //  ⑥ OBWH 2761E(보관 GET 사본) — 세관 237 · 선사 리스트 18(일부) · EDI 237 · 배정 237 — 세관에 있고 선사 리스트에 없는 219대는 어긋남이 아니다(감사 상 — 종전 오경보 219대)
    const dO = diagOf(F.obwh);
    {
      const s = F.obwh.discharge, cu = custOf(s), car = carOf(s), ep = ediPtkOf(s);
      const noCar = [...cu].filter((cn) => !car.has(cn)).length;
      ok(`OBWH 2761E — 세관 ${cu.size} · 선사 리스트 ${car.size}(«일부 ${R.obwh.sources.carrier.n}/${R.obwh.sources.customs.n}») · EDI 평택 ${ep.size} · 세관에 있고 선사에 없는 ${noCar}대 → 어긋남 ${R.obwh.total} · 주의 없음 · 음성에 «자료별 대조» 없음`,
        cu.size === 237 && car.size === 18 && ep.size === 237 && [...ep].every((cn) => cu.has(cn)) && noCar === 219 && R.obwh.carrierPartial && R.obwh.total === 0 && !R.obwh.groups.length && R.obwh.gap === 0
          && !srOf(dO) && !/자료별 대조/.test(B.buildVoiceMessage(dO)),
        JSON.stringify({ total: R.obwh.total, groups: R.obwh.groups.map((g) => [g.key, g.items.length]), cp: R.obwh.carrierPartial, alert: (srOf(dO) || {}).msg }));
    }
    //  ⑦ MCSC 633N(보관 GET 사본) — 완료·실적에만 있는 컨 중 시프팅(선사 RESTOW LIST)은 시프팅 줄이 센다 → «완료·실적에만» 은 그 밖의 것만
    {
      const s = F.mcsc.discharge, cu = custOf(s), ep = ediPtkOf(s), restow = new Set(Object.keys(F.mcsc.restowList || {}));
      const only = [...doneTermOf(s)].filter((cn) => !cu.has(cn) && !ep.has(cn));
      const want = only.filter((cn) => !restow.has(cn)).sort();
      const appWant = [...unitsByRule(s).set].filter((cn) => !restow.has(cn)).length;
      const g5 = grp(R.mcsc, 'g5');
      ok(`MCSC 633N — 완료·실적에만 ${only.length}대 중 시프팅 ${only.length - want.length}대(RESTOW LIST ${restow.size}) 빼고 «완료·실적에만» ${g5.length}대 = ${want.length}대(${want.join()}) · 배정 ${F.mcsc.info.planDis} · 앱 ${R.mcsc.app} = 원자료 ${appWant} · 차이 ${R.mcsc.gap} · 후보 ${R.mcsc.explained}`,
        g5.map((x) => x.cn).sort().join() === want.join() && want.length === 1 && only.length - want.length === 94 && R.mcsc.total === 1
          && R.mcsc.app === appWant && R.mcsc.gap === appWant - F.mcsc.info.planDis && R.mcsc.gap === 1 && R.mcsc.explained === 1 && R.mcsc.unknown === 0,
        JSON.stringify({ g5: g5.length, want: want.length, only: only.length, app: R.mcsc.app, gap: R.mcsc.gap, ex: R.mcsc.explained }));
    }
    //  ⑧ XTPG 541E(보관 GET 사본) — 배정 78 · 앱 128 (+50) · «완료·실적에만» 50대(앱 안) = 후보 50 · 번호 없음 0 · 음성 서명 수에서 «완료·실적에만» 은 빠진다(작업이 진행되며 늘어난다)
    const dXt = diagOf(F.xtpg);
    {
      const s = F.xtpg.discharge, cu = custOf(s), ep = ediPtkOf(s);
      const want = [...doneTermOf(s)].filter((cn) => !cu.has(cn) && !ep.has(cn)).sort();
      const appWant = unitsByRule(s).set.size, g5 = grp(R.xtpg, 'g5'), a = srOf(dXt);
      ok(`XTPG 541E — 배정 ${F.xtpg.info.planDis} · 앱 ${R.xtpg.app} = 원자료 ${appWant} (+${R.xtpg.gap}) · «완료·실적에만» ${g5.length}대 = ${want.length} · 후보 ${R.xtpg.explained} = 앱 안 ${g5.filter((x) => x.inApp).length} · 번호 없음 ${R.xtpg.unknown} · 진단 음성 서명 수 ${a && a.count}(총 ${a && a.details.total})`,
        g5.map((x) => x.cn).sort().join() === want.join() && want.length === 50 && R.xtpg.app === appWant && appWant === 128 && R.xtpg.gap === appWant - F.xtpg.info.planDis && R.xtpg.gap === 50
          && R.xtpg.explained === g5.filter((x) => x.inApp).length && R.xtpg.explained === 50 && R.xtpg.unknown === 0 && a && a.count === 0 && a.details.total === 50,
        JSON.stringify({ app: R.xtpg.app, gap: R.xtpg.gap, ex: R.xtpg.explained, unk: R.xtpg.unknown, g5: g5.length, cnt: a && a.count }));
    }
    //  ⑨ 진단 — KKLC 는 source_recon 주의(머리글에 터미널 수량 둘·출처마다 대수·«자료 없음» · 어긋남 20대 · 리스트 부족 20 과 같은 수라 대조 음성 없음), KBTR 은 «번호 없음 4대» 주의. 선적 탭에는 띄우지 않는다.
    const dK = diagOf(F.kklc), dB = diagOf(F.kbtr), dM = diagOf(F.mcap), dL = diagOf(F.kbtr, 'loading');
    {
      const a = srOf(dK), b = srOf(dB), ls = dK.find((x) => x.code === 'list_short');
      ok(`진단 — KKLC «${a && a.msg}» (주의) · 종전 «리스트 부족 ${ls && ls.count}» 그대로 · 같은 수라 대조 음성 «${a && a.voice}» · 음성 전체에 «자료별 대조» 없음`,
        a && a.level === 'warning' && a.msg === '자료별 대조 — 터미널 배정 139 · 본선현황 139 · EDI 139 · 세관 119 · 선사 리스트 자료 없음 · 실적 0 — 어긋남 20대' && a.count === 20 && ls && ls.count === 20
          && a.voice === '' && !/자료별 대조/.test(B.buildVoiceMessage(dK)) && /20개 부족/.test(B.buildVoiceMessage(dK)),
        JSON.stringify({ a: a && a.msg, v: a && a.voice, ls: ls && ls.count }));
      ok(`진단 — KBTR «${b && b.msg}» (주의 · 음성 «${b && b.voice}») · MCAP 어긋남 5대 · 선적 탭에는 자료별 대조를 띄우지 않는다`,
        b && b.level === 'warning' && b.msg === '터미널 배정 179 · 앱 175 (-4) · 번호 없음 4대 — 배정표는 수량뿐, 작업이 시작되면 실적으로 번호가 잡힐 수 있음' && b.voice === '터미널과 4대 차이' && b.count === 4
          && (srOf(dM) || {}).count === 5 && !srOf(dL),
        JSON.stringify({ b: b && b.msg, m: (srOf(dM) || {}).msg, l: dL.map((x) => x.code) }).slice(0, 300));
      //  진단이 검증 대상에서 뺀 컨(선사 취소 요청 · 수화물)은 대조에서도 빠진다 — 두 컨 다 원래 «EDI 평택인데 세관 밖» 에 있다
      const two = ['BMOU9237016', 'FBIU5959790'];
      const dS = diagOf(F.kklc, 'discharge', { cancelReq: [two[0]], lugCns: [two[1]] }), sS = srOf(dS);
      const inS = sS ? sS.details.groups.flatMap((g) => g.items.map((x) => x.cn)) : [];
      ok(`진단 skip — 취소 요청 ${two[0]} · 수화물 ${two[1]} → 어긋남 ${a && a.details.total} → ${sS && sS.details.total} · 두 컨 다 대조에 없음`,
        two.every((cn) => grp(R.kklc, 'g3').some((x) => x.cn === cn)) && sS && sS.details.total === 18 && !two.some((cn) => inS.includes(cn)),
        JSON.stringify({ t: sS && sS.details.total, inS: two.filter((cn) => inS.includes(cn)) }));
    }
    let dG = null;   // 화면 ⑪ 에서 그린다(⑩ 의 MGN 사본 진단)
    //  ⑩ 세관 검수 결과 코드표 — 검수사 2026-10-10 09:34 원문 열두 줄 그대로(이 파일이 원문에서 따로 옮겨 적었다) · «세관(·선사) 목록에만» 중 완료·실적 없는 컨은 MGN 후보
    {
      const want = CC;
      const T = B.CUSTOMS_RESULT_CODES || {};
      ok(`세관 검수 결과 코드표 ${Object.keys(T).length}개 = 검수사 원문 ${Object.keys(want).length}개 그대로`,
        Object.keys(want).length === 12 && JSON.stringify(Object.entries(T).sort()) === JSON.stringify(Object.entries(want).sort()), JSON.stringify(T));
      const KG = clone(F.kklc);
      KG.discharge.records.TSTU8000001 = { _customs: true, _source: 'R27 customs.xls', pod: 'KRPTK', pol: 'CNSHA', iso: '22G1', fe: 'F', op: 'KMD' };
      KG.discharge.records.TSTU8000002 = { _customs: true, _source: 'R27 customs.xls', pod: 'KRPTK', pol: 'CNSHA', iso: '22G1', fe: 'F', op: 'KMD' };
      KG.discharge.records.TSTU8000003 = { _customs: true, _source: 'R27 customs.xls', iso_carrier: '22G1', pod: 'KRPTK', pol: 'CNSHA', iso: '22G1', fe: 'F', op: 'KMD' };
      KG.discharge.completed = { TSTU8000002: { at: 1, by: 'R27' } };
      const RG = B.reconcileSources(V(KG), 'discharge'), g1 = gOf(RG, 'g1');
      ok(`세관에만 3대(그중 1대 선사 리스트에도 · 1대 완료) 넣은 KKLC 사본 — «${g1.label}» ${(g1.items || []).length}대(선사에도 있는 것도 기타로 안 감) · 세관 코드 ${g1.code} 후보 ${g1.codeN}대(완료 없는 것) · «EDI 평택인데 세관 밖» 20 그대로(세관이 있으니 선사 ✗ 는 어긋남 아님)`,
        (g1.items || []).length === 3 && g1.label === '세관(·선사) 목록에만 — EDI 없음' && g1.code === 'MGN' && g1.codeN === 2 && grp(RG, 'g3').length === 20 && !RG.groups.some((g) => g.key.startsWith('etc'))
          && RG.total === 23 && RG.carrierPartial,
        JSON.stringify({ g: RG.groups.map((g) => [g.key, g.items.length, g.code, g.codeN]) }));
      dG = diagOf(KG);
    }
    //  ⑬ 재감사 «가» 하 3건 — 본선현황 = 완료 + 잔여 · «선사 리스트 일부» 경계(절반) · 음성 한 번 · MGN 은 작업 시작 뒤에만
    {
      //  TNJP 26364E(보관 GET 사본) — 배정표 없음(planDis 0) · 본선현황 호기 둘 다 잔여 0 · 완료만 83 + 79 → 본선현황으로 잰다
      const I = F.tnjp.info, qcSum = Object.values(I.qcWork || {}).reduce((a, q) => a + (Number(q.disDone) || 0) + (Number(q.disRest) || 0), 0);
      const restSum = Object.values(I.qcWork || {}).reduce((a, q) => a + (Number(q.disRest) || 0), 0);
      const appWant = unitsByRule(F.tnjp.discharge).set.size;
      ok(`TNJP 26364E — 배정표 ${I.planDis ? I.planDis : '없음'} · 본선현황 ${R.tnjp.sources.qc.n} = 호기 완료+잔여 ${qcSum}(잔여만이면 ${restSum}) · 앱 ${R.tnjp.app} = 원자료 ${appWant} · 차이 ${R.tnjp.gap}(본선현황으로)`,
        !I.planDis && restSum === 0 && qcSum === 162 && R.tnjp.term.basis === 'qc' && R.tnjp.sources.qc.n === qcSum && R.tnjp.app === appWant && R.tnjp.gap === appWant - qcSum && R.tnjp.gap === 0,
        JSON.stringify({ term: R.tnjp.term, qc: R.tnjp.sources.qc, gap: R.tnjp.gap, app: R.tnjp.app }));
      //  OBWH 2761E 사본 — 선사 리스트를 200 · 100 행으로(세관 행에 선사 표식을 더 붙여) → 200/237 은 «일부» 아님(절반 이상) · 100/237 은 «일부» · 둘 다 어긋남 0
      const carTo = (n) => { const o = clone(F.obwh), recs = o.discharge.records; const car = carOf(o.discharge); for (const cn of Object.keys(recs).sort()) { if (car.size >= n) break; if (!car.has(cn)) { recs[cn].iso_carrier = recs[cn].iso || '45G1'; car.add(cn); } } return o; };
      const o200 = carTo(200), o100 = carTo(100);
      const r200 = B.reconcileSources(V(o200), 'discharge'), r100 = B.reconcileSources(V(o100), 'discharge');
      ok(`«선사 리스트 일부» 경계 — 선사 ${carOf(o200.discharge).size}/${custOf(o200.discharge).size} → 일부 ${r200.carrierPartial ? '예' : '아님'} · 선사 ${carOf(o100.discharge).size}/${custOf(o100.discharge).size} → 일부 ${r100.carrierPartial ? '예' : '아님'} · 어긋남 ${r200.total}·${r100.total}`,
        carOf(o200.discharge).size === 200 && carOf(o100.discharge).size === 100 && custOf(o200.discharge).size === 237 && !r200.carrierPartial && r100.carrierPartial && r200.total === 0 && r100.total === 0,
        JSON.stringify({ p200: r200.carrierPartial, p100: r100.carrierPartial, s200: r200.sources.carrier, s100: r100.sources.carrier }));
      //  음성 한 번 — TMPZ: 대조 12 = EDI 밖 12 → 대조 음성 없음, 전체 음성에 12 가 한 번 · MCAP: EDI 밖 없음 → 대조 «어긋남 5대» 한 번
      const dTm = diagOf(F.tmpz), sTm = srOf(dTm), leTm = dTm.find((x) => x.code === 'list_extra'), vTm = B.buildVoiceMessage(dTm);
      const sMc = srOf(dM), vMc = B.buildVoiceMessage(dM);
      const cnt = (v, re) => (v.match(re) || []).length;
      ok(`음성 한 번 — TMPZ 대조 ${sTm && sTm.details.total} · EDI 밖 ${leTm && leTm.count} → 대조 음성 «${sTm && sTm.voice}» · 전체 «${vTm}» · MCAP 대조 음성 «${sMc && sMc.voice}» · 전체에 5대 ${cnt(vMc, /(^|[^0-9])5대/g)}번`,
        sTm && leTm && sTm.details.total === 12 && leTm.count === 12 && sTm.voice === '' && cnt(vTm, /(^|[^0-9])12(개|대)/g) === 1
          && sMc && !dM.some((x) => (x.code === 'list_extra' || x.code === 'list_short') && x.count === 5) && sMc.voice === '자료별 대조 어긋남 5대' && cnt(vMc, /(^|[^0-9])5대/g) === 1,
        JSON.stringify({ tm: sTm && sTm.voice, vTm, mc: sMc && sMc.voice, vMc }));
      //  MGN — 작업 시작 전(배정만 · 완료·실적 없음 · terminalStatus planned)엔 묶음 이름만 · 완료 1 이 생기면 «MGN 대상»
      const KQ = clone(F.kklc);
      KQ.discharge.records.TSTU8100001 = { _customs: true, _source: 'R27 customs.xls', pod: 'KRPTK', pol: 'CNSHA', iso: '22G1', fe: 'F', op: 'KMD' };
      KQ.discharge.records.TSTU8100002 = { _customs: true, _source: 'R27 customs.xls', pod: 'KRPTK', pol: 'CNSHA', iso: '22G1', fe: 'F', op: 'KMD' };
      const RQ0 = B.reconcileSources(V(KQ), 'discharge');
      const KQ1 = clone(KQ); KQ1.discharge.completed = { [Object.keys(KQ1.discharge.ediContainers).sort()[0]]: { at: 1, by: 'R27' } };
      const RQ1 = B.reconcileSources(V(KQ1), 'discharge');
      const g0 = gOf(RQ0, 'g1'), g1q = gOf(RQ1, 'g1');
      ok(`MGN 은 작업 시작 뒤에만 — 시작 전(${F.kklc.info.terminalStatus} · workStartAt «${F.kklc.info.workStartAt}» · 완료·실적 0) «세관(·선사) 목록에만» ${(g0.items || []).length}대 코드 ${g0.code || '없음'} · 완료 1 생긴 사본 → ${g1q.code} ${g1q.codeN}대`,
        F.kklc.info.terminalStatus === 'planned' && !F.kklc.info.workStartAt && (g0.items || []).length === 2 && !g0.code && !RQ0.started && RQ1.started && g1q.code === 'MGN' && g1q.codeN === 2,
        JSON.stringify({ g0: [g0.code, g0.codeN], g1: [g1q.code, g1q.codeN] }));
    }
    //  ⑪ 화면 — 주의 박스(DiagnosticsPanel 실소스)를 jsdom 에서 그린다. KKLC 자료별 대조는 10줄 + «… 외 10건 — 나머지 보기» → 20줄 + «접기».
    //     기존 잘린 목록(리스트 부족 missing · 취소 요청 cancelCns · EDI 밖 extraCns · 실번호 · 풀/엠티)도 펼칠 수 있다 — 진단 details 가 자르지 않는다.
    {
      const K2 = clone(F.kklc);   // 리스트 전용 행 25대(선사 파일) — 그중 21대는 선사 취소 요청분
      const fake = Array.from({ length: 25 }, (_, i) => `TSTU${String(1000000 + i).slice(1).padStart(7, '0')}`);
      fake.forEach((cn) => { K2.discharge.records[cn] = { _source: 'R27 extra.xls', fe: 'F', iso: '45G1', iso_carrier: '45G1' }; });
      const dX = diagOf(K2, 'discharge', { cancelReq: fake.slice(0, 21) });
      const dE = diagOf(K2);
      const cp = dX.find((x) => x.code === 'cancel_pending'), le = dE.find((x) => x.code === 'list_extra');
      //  실번호·풀/엠티 25건 — EDI 평택 25대와 리스트의 실번호·F/E 가 모두 다르다
      const sd = Array.from({ length: 25 }, (_, i) => `TSTU${String(7000000 + i)}`);
      const sE = {}, sR = {}; sd.forEach((cn, i) => { sE[cn] = { cn, pod: 'KRPTK', sl: `A${i}`, fe: 'F', iso: '22G1' }; sR[cn] = { cn, _source: 'R27 seal.xls', sl: `B${i}`, fe: 'E', iso: '22G1' }; });
      const dSd = B.runDiagnostics({ ediContainers: sE, listRecords: sR, xrayList: {}, mode: 'discharge', carrier: '' });
      const sdA = dSd.find((x) => x.code === 'seal_diff'), feA = dSd.find((x) => x.code === 'fe_conflict');
      ok(`진단 details 는 자르지 않는다 — 취소 요청 ${cp && cp.details.cancelCns.length} = 21 · EDI 밖 ${le && le.details.extraCns.length} = 25 · 실번호 ${sdA && sdA.details.length} = 25 · 풀/엠티 ${feA && feA.details.length} = 25 (종전 20 에서 잘림)`,
        cp && cp.details.cancelCns.length === 21 && le && le.details.extraCns.length === 25 && sdA && sdA.details.length === 25 && feA && feA.details.length === 25,
        JSON.stringify({ cp: cp && cp.count, le: le && le.count, sd: sdA && sdA.details.length, fe: feA && feA.details.length }));
      //  목적지 확인(⚠ 눌러서 POD 확정) 컨이 있는 EDI 밖 목록 — 접지 않는다. 리스트 POD 평택 · EDI POD 인천(원문)
      const K6 = clone(F.kklc), pa = 'TSTU6000001';
      K6.discharge.records[pa] = { _source: 'R27 carrier.xls', pod: 'KRPTK', pol: 'CNSHA', iso: '22G1', iso_carrier: '22G1', fe: 'F', op: 'KMD' };
      K6.discharge.ediContainers[pa] = { cn: pa, pod: 'KRINC', pol: 'CNSHA', iso: '22G1', fe: 'F', op: 'KMD' };
      const sec6 = K6.discharge, ep6 = {}; for (const [cn, e] of ediUnits(sec6)) if (isPtkCode(e.pod)) ep6[cn] = { ...e, cn };
      ep6[pa] = { ...sec6.ediContainers[pa], cn: pa };   // VoyagePage 처럼 — 갈리는 컨도 진단 입력에 든다(podAsk 는 EDI 원문 POD 와 리스트 POD 로 가린다)
      const d6 = B.runDiagnostics({ ediContainers: ep6, listRecords: sec6.records, xrayList: {}, mode: 'discharge', carrier: '', voyage: V(K6), voyageKey: K6.key });
      const KP = clone(F.kklc); pickPod(KP, 'BMOU9237016', 'CNSHA');
      const dP = diagOf(KP);
      const mS = clone(F.kbtr); for (const [k, e] of Object.entries(mS.discharge.ediContainers)) if (k.startsWith('__') && !e.cn) e.pod = 'KRPTK';
      const dSl = diagOf(mS);
      const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
      const errs = []; dom.window.addEventListener('error', (e) => errs.push(e.message));
      //  리스트 번호 오타 짝(CND) — RZOR R106W 선적 실리스트 두 판(«2차»·«최종», listtypo_real.json 의 시트 행)을 합친 선적 리스트(선적은 판을 합친다 — 3.61-03)
      const LT = fx('listtypo_real.json').rzor_r106w;
      const rowsOf = (aoa, file) => { const [h, ...rs] = aoa; const ix = (k) => h.indexOf(k); return rs.filter((r) => r[ix('Cntr. No')]).map((r) => ({ cn: String(r[ix('Cntr. No')]), op: r[ix('Operator')], pol: r[ix('POL')], pod: r[ix('POD')], wt: r[ix('Weight')], fe: r[ix('F/E')], sl: String(r[ix('Seal No.')] || ''), _source: file })); };
      const recT = {}; [...rowsOf(LT.cll2, LT.cll2_name), ...rowsOf(LT.final, LT.final_name)].forEach((r) => { recT[r.cn] = r; });
      const finalCns = new Set(rowsOf(LT.final, LT.final_name).map((r) => r.cn));
      //  기대값 — 최종 판에 없고 2차 판에만 있는 번호 중, 최종 판의 한 컨과 실번호가 같은 것(이 파일이 시트 행에서 따로 찾는다)
      const wantTypo = rowsOf(LT.cll2, LT.cll2_name).filter((r) => !finalCns.has(r.cn) && r.sl && rowsOf(LT.final, LT.final_name).filter((f) => f.sl === r.sl).length === 1)
        .map((r) => ({ typo: r.cn, real: rowsOf(LT.final, LT.final_name).find((f) => f.sl === r.sl).cn, seal: r.sl }));
      const twT = B.listTypoTwins(recT);
      const dT = B.runDiagnostics({ ediContainers: {}, listRecords: recT, xrayList: {}, mode: 'loading', carrier: '', typoTwins: twT });
      const dT0 = B.runDiagnostics({ ediContainers: {}, listRecords: recT, xrayList: {}, mode: 'loading', carrier: '' });
      const ctA = dT.find((x) => x.code === 'cn_typo');
      ok(`리스트 번호 오타 짝 — RZOR R106W 선적 «2차»·«최종» 합친 리스트 ${Object.keys(recT).length}행 · 시트에서 따로 찾은 짝 ${wantTypo.map((t) => `${t.typo}→${t.real} 실 ${t.seal}`).join()} · 진단 «${ctA && ctA.msg}»(정보 · 음성 없음) · 오타 짝을 안 넘기면 알림 없음`,
        wantTypo.length === 1 && ctA && ctA.level === 'info' && !ctA.voice && ctA.count === 1 && ctA.msg.endsWith('(세관 코드 CND 후보)') && CC.CND === '컨테이너번호 다름'
          && JSON.stringify(ctA.details.map((x) => ({ typo: x.typo, real: x.real, seal: x.seal }))) === JSON.stringify(wantTypo) && !dT0.some((x) => x.code === 'cn_typo'),
        JSON.stringify({ want: wantTypo, ct: ctA && ctA.details, msg: ctA && ctA.msg }));
      const okE = { TSTU1111111: { cn: 'TSTU1111111', pod: 'KRPTK', pol: 'CNSHA', fe: 'F', iso: '22G1' } }, okR = { TSTU1111111: { _source: 'R27 list.xls', pod: 'KRPTK', fe: 'F', iso: '22G1' } };
      const dOk = B.runDiagnostics({ ediContainers: okE, listRecords: okR, xrayList: {}, mode: 'discharge', carrier: '' });
      const nsE = {}; for (const [k, e] of Object.entries(NS.loading.ediContainers)) if (isPtkCode(e.pol)) nsE[e.cn || k] = { ...e, cn: e.cn || k };
      const dNs = B.runDiagnostics({ ediContainers: nsE, listRecords: NS.loading.records || {}, xrayList: {}, mode: 'loading', carrier: '' });
      dom.window.__R27rows = JSON.stringify({ p10: B.diagListRowCount(okR), p12: B.diagListRowCount(NS.loading.records || {}) });
      dom.window.__R27 = JSON.stringify({ p1: dK, p2: dX, p3: dE, p4: dP, p5: dSl, p6: d6, p7: dSd, p8: dG, p9: dT, p10: dOk, p12: dNs, n1: [] }); dom.window.console.warn = () => {};
      try { dom.window.eval(domSrc); } catch (e) { errs.push('THROW ' + e.message); }
      await sleep(300);
      const d = dom.window.document;
      const click = async (el) => { if (el) { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await sleep(40); } };
      const rowBtn = (pid, re) => [...d.getElementById(pid).querySelectorAll('button')].find((b) => re.test(b.textContent));
      const txt = (el) => (el ? el.textContent : '');
      await click(rowBtn('p1', /^자료별 대조/));
      const rc = d.querySelector('#p1 [data-recon]');
      const lines0 = rc ? rc.querySelectorAll('[data-recon-cn]').length : -1;
      const tg = rc && rc.querySelector('[data-trunc-toggle]');
      const tg0 = tg ? tg.textContent : '';
      const head = rc ? txt(rc.querySelector('[data-recon-head]')) : '';
      const term = rc ? txt(rc.querySelector('[data-recon-term]')) : '';
      const gh = rc ? txt(rc.querySelector('[data-recon-group="g3"] > div')) : '';
      const l1 = rc ? txt(rc.querySelector('[data-recon-cn="BMOU9237016"]')) : '';
      await click(tg);
      const lines1 = rc ? rc.querySelectorAll('[data-recon-cn]').length : -1;
      const tg1 = rc && rc.querySelector('[data-trunc-toggle]');
      const tg1t = tg1 ? tg1.textContent : '', tg1k = tg1 ? tg1.getAttribute('data-trunc-toggle') : '';
      await click(tg1);
      const lines2 = rc ? rc.querySelectorAll('[data-recon-cn]').length : -1;
      await click(rc && rc.querySelector('[data-recon-cn="BMOU9237016"]'));
      ok(`화면 — KKLC 자료별 대조 머리 «${head}» · 터미널 줄 «${term}» · 묶음 «${gh}» · ${lines0}줄 + «${tg0}» → ${lines1}줄 + «${tg1t}» → 다시 ${lines2}줄 · 줄 «${l1}» · 누르면 컨 상세`,
        lines0 === 10 && tg0 === '… 외 10건 — 나머지 보기' && lines1 === 20 && tg1t === '접기' && tg1k === 'fold' && lines2 === 10
          && head.includes('터미널 배정 139(배정표·도선)') && head.includes('본선현황 139(호기 합계 완료+잔여)') && head.includes('EDI 139') && head.includes('세관 119') && head.includes('선사 리스트 자료 없음') && head.includes('완료 0') && head.includes('실적 0')
          && term === '터미널 배정 139대 = 앱 139대' && gh === `EDI 평택인데 세관 밖 (추가분 — 신고 대상) 20대 · MFN 대상 — ${CC.MFN}`
          && l1 === '• BMOU9237016 (45RE) E · KMD · KRINC→KRPTK · 26-10-82 · EDI ✓ 세관 ✗'
          && (dom.window.__R27open || []).includes('BMOU9237016') && !errs.length,
        JSON.stringify({ lines0, tg0, lines1, tg1t, lines2, head, term, gh, l1, errs }).slice(0, 500));
      //  리스트 부족 목록 — 자료별 대조가 같은 컨을 보이므로 접혀 있다(«자료별 대조 참고») → 펼치면 10줄 + «외 10건» → 20줄
      await click(rowBtn('p1', /^EDI 실번호 139대/));
      const p1 = d.getElementById('p1');
      const fold = p1.querySelector('[data-recon-fold]');
      const foldClosedHidden = fold && fold.getAttribute('data-recon-fold') === 'closed' && !/리스트에 없는 컨번호/.test(p1.textContent);
      await click(fold);
      const missBox = [...p1.querySelectorAll('div')].find((x) => x.firstChild && /리스트에 없는 컨번호/.test(x.firstChild.textContent || ''));
      const mLines = (b) => (b ? [...b.querySelectorAll('.mono')].length : -1);
      const m0 = mLines(missBox), mt = missBox && missBox.querySelector('[data-trunc-toggle]');
      const mt0 = mt ? mt.textContent : '';
      await click(mt);
      const m1 = mLines(missBox);
      //  취소 요청 21대 → 10줄 + «외 11건» → 21줄 · EDI 밖 25대(취소 뺀 4대가 아닌 판 p3) → 접힘 펼치고 10줄 + «외 15건» → 25줄
      await click(rowBtn('p2', /^선사 취소 요청 21대/));
      const p2 = d.getElementById('p2');
      const canBox = [...p2.querySelectorAll('div')].find((x) => x.firstChild && /선사 취소 요청분/.test(x.firstChild.textContent || ''));
      const c0 = mLines(canBox), ct = canBox && canBox.querySelector('[data-trunc-toggle]'), ct0 = ct ? ct.textContent : '';
      await click(ct);
      const c1 = mLines(canBox);
      await click(rowBtn('p3', /^리스트에 EDI 평택과 매칭 안되는 컨 25개/));
      const p3 = d.getElementById('p3');
      const exRow = [...p3.querySelectorAll('[data-recon-fold]')].pop();
      await click(exRow);
      const e0 = p3.querySelectorAll('[data-extra-cn]').length;
      const et = [...p3.querySelectorAll('[data-trunc-toggle]')].find((b) => /외 15건/.test(b.textContent));
      const et0 = et ? et.textContent : '';
      await click(et);
      const e1 = p3.querySelectorAll('[data-extra-cn]').length;
      ok(`기존 잘린 목록도 펼친다 — 리스트 부족(접힘 «자료별 대조 참고» → ${m0}줄 + «${mt0}» → ${m1}줄) · 취소 요청(${c0}줄 + «${ct0}» → ${c1}줄) · EDI 밖(${e0}줄 + «${et0}» → ${e1}줄)`,
        foldClosedHidden && m0 === 10 && mt0 === '… 외 10건 — 나머지 보기' && m1 === 20 && c0 === 10 && ct0 === '… 외 11건 — 나머지 보기' && c1 === 21
          && e0 === 10 && et0 === '… 외 15건 — 나머지 보기' && e1 === 25 && !errs.length,
        JSON.stringify({ foldClosedHidden, m0, mt0, m1, c0, ct0, c1, e0, et0, e1, errs }).slice(0, 400));
      //  확정 사본 — 참고 줄 · 터미널 줄 «−1 … 1대가 후보» / 번호 대기 사본 — «번호 대기 8자리 … (세관 코드 CNN 후보)» · «번호 없음 4대 — 배정표는 수량뿐, …»
      await click(rowBtn('p4', /^자료별 대조/));
      const rf = d.querySelector('#p4 [data-recon-group="ref"]');
      const rfHead = rf ? txt(rf.firstChild) : '', rfLine = rf ? txt(rf.querySelector('[data-recon-cn]')) : '';
      const t4 = txt(d.querySelector('#p4 [data-recon-term]')), g4h = txt(d.querySelector('#p4 [data-recon-group="g3"] > div'));
      await click(rowBtn('p5', /^터미널 배정 179/));
      const pend = txt(d.querySelector('#p5 [data-recon-pending]')), t5 = txt(d.querySelector('#p5 [data-recon-term]'));
      ok(`화면 — 확정 사본 «${rfHead}» 줄 «${rfLine}» · «${g4h}» · «${t4}» / 빈 자리 사본 «${pend}» · «${t5}»`,
        rfHead === 'POD 확정 — 평택 아님(참고) 1대' && rfLine === '• BMOU9237016 (45RE) E · KMD · KRINC→KRPTK · 26-10-82 · EDI ✓ 세관 ✗ · POD 확정 CNSHA' && g4h === `EDI 평택인데 세관 밖 (추가분 — 신고 대상) 19대 · MFN 대상 — ${CC.MFN}`
          && t4 === '터미널 배정 139대 · 앱 138대 (-1) — 아래 목록 중 1대가 후보'
          && pend === '번호 대기 8자리 — EDI 평택 자리인데 컨번호가 없음 (세관 코드 CNN 후보)' && CC.CNN === '컨테이너 번호 없음'
          && t5 === '터미널 배정 179대 · 앱 175대 (-4) — 번호 없음 4대 — 배정표는 수량뿐, 작업이 시작되면 실적으로 번호가 잡힐 수 있음' && !errs.length,
        JSON.stringify({ rfHead, rfLine, g4h, t4, pend, t5, errs }).slice(0, 500));
      //  ⚠ 목적지 확인 컨이 있는 EDI 밖 목록은 접지 않는다 · 실번호(SLN 후보 머리)·풀/엠티 25건은 20줄 + «외 5건» → 25줄 · MGN 후보 머리
      await click(rowBtn('p6', /^리스트에 EDI 평택과 매칭 안되는 컨/));
      const p6 = d.getElementById('p6');
      const askShown = !!p6.querySelector(`[data-extra-cn="${pa}"][data-pod-ask="1"]`), p6fold = [...p6.querySelectorAll('[data-recon-fold]')].length;
      await click(rowBtn('p7', /^실번호 불일치 25건/));
      const p7 = d.getElementById('p7');
      const sln = txt(p7.querySelector('[data-customs-code="SLN"]'));
      const sdBox = p7.querySelector('[data-customs-code="SLN"]') && p7.querySelector('[data-customs-code="SLN"]').parentElement;
      const s0 = sdBox ? sdBox.querySelectorAll('button.mono').length : -1, st = sdBox && sdBox.querySelector('[data-trunc-toggle]'), st0 = txt(st);
      await click(st);
      const s1 = sdBox ? sdBox.querySelectorAll('button.mono').length : -1;
      await click(rowBtn('p7', /^풀\/엠티가 EDI 와 리스트에서 다름 25건/));
      const feT = [...p7.querySelectorAll('[data-trunc-toggle]')].find((b) => b !== st && /외 5건/.test(b.textContent));
      const fe0 = txt(feT);
      await click(rowBtn('p8', /^자료별 대조/));
      const g1h = txt(d.querySelector('#p8 [data-recon-group="g1"] > div'));
      ok(`화면 — 목적지 확인 컨 있는 EDI 밖 목록 접지 않음(⚠ ${pa} ${askShown ? '보임' : '안 보임'} · 접기 단추 ${p6fold}) · «${sln}» ${s0}줄 + «${st0}» → ${s1}줄 · 풀/엠티 «${fe0}» · «${g1h}»`,
        askShown && p6fold === 0 && sln === `EDI·리스트 실번호가 다름 · SLN — ${CC.SLN}` && s0 === 20 && st0 === '… 외 5건 — 나머지 보기' && s1 === 25 && fe0 === '… 외 5건 — 나머지 보기'
          && g1h === `세관(·선사) 목록에만 — EDI 없음 3대 · MGN 대상 2대 — ${CC.MGN}(완료·실적 없음)` && !errs.length,
        JSON.stringify({ askShown, p6fold, sln, s0, st0, s1, fe0, g1h, errs }).slice(0, 500));
      //  오타 짝 줄 · 경고가 없으면 «이상없음 (세관 코드 OKY)» 한 줄(항차 화면처럼 showOk) — showOk 를 안 넘긴 종전 호출은 아무것도 안 그린다 · 경고가 있으면 OKY 줄 없음
      await click(rowBtn('p9', /^리스트 번호 오타 짝 1건/));
      const tyl = txt(d.querySelector('#p9 [data-cn-typo-line]'));
      await click(d.querySelector('#p9 [data-cn-typo-line]'));
      const oky = txt(d.querySelector('#p10 [data-diag-ok]')), nsl = txt(d.querySelector('#p12 [data-diag-ok]'));
      ok(`화면 — NSFR 2619N 선적(EDI ${Object.keys(NS.loading.ediContainers).length} · records ${Object.keys(NS.loading.records || {}).length} · 경고 ${dNs.length}) «${nsl}» — 비교한 리스트가 없으면 OKY 를 쓰지 않는다`,
        Object.keys(NS.loading.ediContainers).length === 104 && Object.keys(NS.loading.records || {}).length === 0 && dNs.length === 0 && nsl === '자료 점검 — 비교할 리스트 없음' && !/OKY/.test(txt(d.getElementById('p12'))),
        JSON.stringify({ nsl, n: dNs.length }));
      ok(`화면 — 오타 짝 «${tyl}»(누르면 오타 쪽 컨 상세) · 리스트 1행·경고 ${dOk.length} «${oky}» · showOk 없는 호출 «${txt(d.getElementById('n1'))}» · 경고 있는 판에 OKY 줄 ${d.querySelectorAll('#p1 [data-diag-ok]').length}`,
        tyl === `• ${wantTypo[0].typo} → ${wantTypo[0].real} · 실번호 ${wantTypo[0].seal}` && (dom.window.__R27open || []).includes(wantTypo[0].typo)
          && dOk.length === 0 && oky === `✓ 자료 점검 — ${CC.OKY} (세관 코드 OKY)` && d.getElementById('n1').children.length === 0 && d.querySelectorAll('#p1 [data-diag-ok]').length === 0 && !errs.length,
        JSON.stringify({ tyl, oky, n1: d.getElementById('n1').innerHTML, errs }).slice(0, 400));
    }
    //  ⑫ 선적 모드로 불러도 예외 없이 돈다(KBTR 2609W — 예약 자리만 있는 선적 EDI)
    {
      let RL = null, err = '';
      try { RL = B.reconcileSources(V(F.kbtr), 'loading'); } catch (e) { err = String(e && e.message); }
      ok(`선적 모드 — 예외 없이 돈다 · mode loading · 터미널 배정 ${RL && RL.sources.plan.n} = info.planLod ${F.kbtr.info.planLod} · 예약 자리는 EDI 유닛이 아니다`,
        !err && RL && RL.mode === 'loading' && RL.sources.plan.n === F.kbtr.info.planLod && !RL.sources.edi.has, err || JSON.stringify(RL && RL.sources));
    }
  }

  // ── R28 ───────────────────────────────────────────────────────────────
  //  4.22-01 — 부킹 자리 «채움»(3.26 — 선적 예상 EDI 의 컨번호 없는 자리를 실번호 리스트가 채운다)은 선적에만. 양하 EDI 의 컨번호 없는 빈 자리는 «EDI 평택»·부킹 줄·완성율 분모에 안 든다.
  head('R28 부킹 자리 «채움» 은 선적에만 — 양하 EDI 의 컨번호 없는 빈 자리는 데이터 검증 «EDI 평택»·부킹 줄·홈 카드 완성율 분모에 안 든다 · 자리 그림·선적은 그대로 (4.22-01)',
    '검수사 2026-10-10 12:11 «KBTR 양하인데 갑자기 183이 튀어나온이유는 선적이면 모르겠지만 앵하에 부킹자리가 왜 필요한지?» · Fable 판정(bookingFillOfSec 한 줄 — 3.26 규칙은 선적용)');
  {
    const K = fx('recon422_kbtr.json'), SW = fx('bookingfill_swbt.json').swbt;
    const sec = K.discharge;
    //  픽스처 EDI 행은 열쇠가 컨번호다(슬림본 — 행에 cn 칸을 안 실었다). 저장 꼴(행에 cn)로 되살린다 — 자리표시 열쇠(__SLOT_)는 컨번호가 없는 그대로.
    const E = Object.fromEntries(Object.entries(sec.ediContainers).map(([k, e]) => [k, k.startsWith('__') ? e : { ...e, cn: e.cn || k }]));
    //  원자료에서 따로 센다 — 컨번호 없이 자리(bay)만 있는 EDI 행 · 컨번호 있는 EDI 평택 행 · 리스트 행
    const slotRows = Object.entries(E).filter(([, e]) => e && !e.cn && e.bay != null);
    const realPtk = Object.values(E).filter((e) => e && e.cn && isPtkCode(e.pod)).length;
    const recN = Object.keys(sec.records).length;
    const recList = (r) => Object.entries(r || {}).map(([cn, x]) => ({ ...x, cn }));
    const bf = B.bookingFillOfSec({ ...sec, ediContainers: E }, 'discharge');
    ok(`KBTR 2608E 양하 — EDI 컨번호 없는 자리 ${slotRows.length}행(${[...new Set(slotRows.map(([, e]) => `${e.bay}베이 ${e.tier}단`))].join('·')}) · bookingFillOfSec(양하) = ${JSON.stringify(bf)} → 홈 카드 완성율 분모 = max(EDI 평택 ${realPtk}, 리스트 ${recN}) (종전 자리 +${slotRows.length})`,
      slotRows.length === 8 && bf === null && realPtk === 175 && recN === 175, JSON.stringify({ slots: slotRows.length, bf, realPtk, recN }));
    //  선적은 그대로 — SWBT 2614N(2615S) 부킹 EDI 자리 316 · 실번호 316 · 채움
    const bfL = B.bookingFillOfSec(SW.loading, 'loading');
    const swSlots = Object.values(SW.loading.ediContainers).filter((e) => e && (e.isBooking || !e.cn || String(e.cn).startsWith('__'))).length;
    ok(`선적 불변 — SWBT 2614N 선적 bookingFillOfSec = ${JSON.stringify(bfL)} (원자료 자리 ${swSlots} · 리스트 ${Object.keys(SW.loading.records).length})`,
      bfL && bfL.slots === swSlots && swSlots === 316 && bfL.real === 316 && bfL.filled === true, JSON.stringify(bfL));
    //  양하 대수는 원래 175 — 4.20 평택 양하분(마감텔리·홈 카드)·4.22 대조
    const V28 = { key: K.key, info: K.info, discharge: K.discharge, ...(K.loading ? { loading: K.loading } : {}) };
    const ss = B.shiftCnSetOf(K.key, V28);
    const ptkCns = new Set(Object.values(E).filter((e) => e && e.cn && isPtkCode(e.pod)).map((e) => e.cn));
    const tal = B.ptkContainers(V28, 'discharge').length, home = B.progressOf(sec, 'discharge', ss, ptkCns).ptk.total, rc = B.reconcileSources(V28, 'discharge').app;
    ok(`양하 대수 불변 — 마감텔리 ${tal} · 홈 카드 ${home} · 4.22 대조 앱 ${rc} = 리스트 ${recN}`, tal === recN && home === recN && rc === recN, JSON.stringify({ tal, home, rc }));
    //  화면 — 데이터 검증 상자(실소스). 양하: bookingFillOfSec 결과(null)를 넘긴 판 · 아무것도 안 넘긴 판(상자 안 폴백 셈) 둘 다 «EDI 평택 175 · 리스트 175 · 매칭 175» · 부킹 줄 없음.
    //    선적(SWBT): 부킹 줄 «📝 부킹 자리 316 · 실번호 리스트 316» 그대로
    const pD = { ediContainers: Object.values(E), records: recList(sec.records), mode: 'discharge' };
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const errs = []; dom.window.addEventListener('error', (e) => errs.push(e.message)); dom.window.console.warn = () => {};
    //  선적 부분 리스트 — SWBT 사본에서 리스트를 100 행으로(자리 316 중 216 이 빈 판). 채움은 같은 한 벌(bookingFillOfSec)로 다시 센다.
    const SWp = JSON.parse(JSON.stringify(SW.loading)); SWp.records = Object.fromEntries(Object.entries(SW.loading.records).slice(0, 100));
    const bfP = B.bookingFillOfSec(SWp, 'loading');
    dom.window.__R28 = JSON.stringify({ d1: { ...pD, bookingFill: bf }, d2: pD, l1: { ediContainers: Object.values(SW.loading.ediContainers), records: recList(SW.loading.records), mode: 'loading', bookingFill: bfL },
      l2: { ediContainers: Object.values(SWp.ediContainers), records: recList(SWp.records), mode: 'loading', bookingFill: bfP } });
    try { dom.window.eval(domSrc); } catch (e) { errs.push('THROW ' + e.message); }
    await sleep(250);
    const d = dom.window.document;
    const cells = (id) => { const el = d.getElementById(id); const g = el && el.querySelector('.grid'); return g ? [...g.children].map((c) => c.textContent) : []; };
    const book = (id) => { const el = d.getElementById(id); return el ? (el.textContent.match(/📝 부킹 자리[^]*?\(리스트 대기\)|📝 부킹 자리 \d+ · 실번호 리스트 \d+|자리를 실번호가 다 채웠습니다/) || [''])[0] : ''; };
    const c1 = cells('d1'), c2 = cells('d2'), cl = cells('l1'), cp = cells('l2');
    ok(`화면 — KBTR 양하 데이터 검증 «${c1.join(' · ')}» · 부킹 줄 «${book('d1')}» · 넘긴 것 없이(상자 폴백) «${c2.join(' · ')}» «${book('d2')}»`,
      c1.join('|') === `EDI 평택${realPtk}|리스트${recN}|매칭${recN}` && !book('d1') && c2.join('|') === c1.join('|') && !book('d2') && !errs.length,
      JSON.stringify({ c1, c2, b: [book('d1'), book('d2')], errs }).slice(0, 400));
    //  검수사 12:19 «선적도 사실은 전부 매칭만 되면 부킹자리가 필요 없습니다.» · «부킹자리는 저희에게 필요 한게 아니고 터미널 플래너가 필요 한것입니다.»
    //    SWBT 316/316(다 채움) → 숫자 줄 «EDI 평택 316 · 리스트 316 · 매칭 316» · 부킹 줄 없음 / 리스트 100 판 → «📝 부킹 자리 316 · 실번호 리스트 100 — 아직 216자리가 비었습니다(리스트 대기)»
    const swList = Object.keys(SW.loading.records).length;
    ok(`화면 — SWBT 선적 다 채움 «${cl.join(' · ')}» · 부킹 줄 «${book('l1')}» / 리스트 ${Object.keys(SWp.records).length} 판 «${cp.join(' · ')}» · «${book('l2')}»`,
      cl.join('|') === `EDI 평택${swSlots}|리스트${swList}|매칭${swList}` && !book('l1') && !d.querySelector('#l1 [data-booking-wait]')
        && bfP && bfP.slots === 316 && bfP.real === 100 && book('l2') === `📝 부킹 자리 ${swSlots} · 실번호 리스트 100— 아직 ${swSlots - 100}자리가 비었습니다(리스트 대기)` && !errs.length,
      JSON.stringify({ cl, cp, b: [book('l1'), book('l2')], bfP, errs }).slice(0, 400));
  }

  console.log(`\n회귀 기준표 연막검사 ${n - bad}/${n}`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 폴더 */ }
  if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
})().catch((e) => { console.error('✗ 검사 중 오류:', e && e.stack || e); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (x) { /* */ } process.exit(1); });
