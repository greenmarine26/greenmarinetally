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
    `export { shiftReportContainers, plausibleListWtKg, legendItemsOf, isFlatRackContainer, bayCellTypeLabel, legendLiveOf, parseAscFile, emptySealSpec, isReeferContainer } from "${ROOT}/src/utils.js";`,
    `export { computeTallyData, ptkContainers } from "${ROOT}/src/tallyReport.js";`,
    `export { generateBriefing } from "${ROOT}/src/nlSearch.js";`,
    `export { computeAllStats } from "${ROOT}/src/components/StatsTab.jsx";`,
    `export { mergeFolder } from "${ROOT}/src/mergeApi.js";`,
    `export { buildInspectionListDoc, generateInspectionListHTML } from "${ROOT}/src/inspectionList.js";`,
    `export { answerOneRaw, buildDataPack, flattenVoyages, movesOfVoyage } from "${ROOT}/src/mir.js";`,
    `export { answerTotalMoves } from "${ROOT}/src/chiefAnswers.js";`,
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

  // ── R6 ───────────────────────────────────────────────────────────────
  head('R6 «오늘/내일/모레 작업하는 배» 는 그 날짜의 항차만 답한다 (기록부 25 · 4.12-02 ⑤)', '검수사 §4.2-F(2026-10-08)');
  {
    //  오늘·내일·모레만 — 지난 날은 §4.2-F-5 알려진 한계(«어제·그제의 작업 선박 목록은 날짜로 거르지 않습니다»).
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
    const ptk = Object.values(E).filter((c) => isPtkCode(c.pod));
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
    ok(`KBTR 2606E 양하 마감텔리 20' ${want[20]} · 40' ${want[40]} · HC ${want.HC} = 원자료(EDI·원문 ASC 44열)로 센 칸 (규격 빈 행 ${blank.length}대 포함)`, blank.length > 0 && got('20') === want[20] && got('40') === want[40] && got('HC') === want.HC, `20' ${got('20')} · 40' ${got('40')} · HC ${got('HC')}`);
    ok(`전체 ${ptk.length}대 그대로(컨을 더하거나 빼지 않는다) · 45' 0`, t.n === ptk.length && got('45') === 0, `전체 ${t.n} · 45' ${got('45')}`);
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
  }

  console.log(`\n회귀 기준표 연막검사 ${n - bad}/${n}`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 폴더 */ }
  if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
})().catch((e) => { console.error('✗ 검사 중 오류:', e && e.stack || e); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (x) { /* */ } process.exit(1); });
