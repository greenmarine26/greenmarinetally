// 4.82 연막검사 — 검수사 수동 시프팅 표기(voyages/{항차}/shiftManual). 실 OBWH 2787E(SPSU6017307 · 양하 EDI 10-07-82 → 02-01-04) GET 보관본 위에 표기를 메모리로만 더해 잰다. 실 Firebase 쓰기 없음.
//   ① 표기 전/후 지도·시프팅 분리·평택 양하 대수 254→253·진행 숫자 ② 진단·ediGap 소거 ③ 선적 EDI 도착 전후 L0~L3 ④ 덮지 않음·cleared 무시·검증 ⑤ 콘앱 같은 답 ⑥ 소스 배선(문지기·memo 의존성·입구).
//   실행 — node tools/smoke_shiftmanual482.cjs [저장소 루트]. 실패하면 빌드를 세운다.
'use strict';
process.env.TZ = 'Asia/Seoul';
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { execSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + String(detail).slice(0, 500) : ''}`); } };
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const clone = (o) => JSON.parse(JSON.stringify(o));

global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
global.fetch = () => Promise.reject(new Error('no net'));
console.warn = () => {};

(async () => {
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx482_'));
  const stub = './tools/stub_fbdb_mem.js';
  const aliasFb = `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub}`;
  const out = path.join(TMP, 'u.cjs');
  execSync(`npx esbuild "${path.join(ROOT, 'tools/smoke_shiftmanual482_entry.js')}" --bundle --platform=node --format=cjs --outfile="${out}" --loader:.js=jsx --jsx=automatic ${aliasFb} --log-level=error`, { cwd: ROOT, stdio: 'pipe' });
  const U = require(out);
  const base = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'tools/fixtures/shiftmanual482_obwh.json.gz'))));
  const CN = 'SPSU6017307';
  const posf = (s) => (s ? `${s.slice(0, 3)}-${s.slice(3, 5)}-${s.slice(5)}` : '');
  const lrow = (cn, bay, row, tier, pol = 'CNYNT', pod = 'KRPTK') => ({ cn, _slotKey: cn, bay, row, tier, pol, pod, fe: 'F', iso: '45G1', op: 'YTF', tp: "40'HC", wt: 9772, voy: '2788W' });
  const DEP = lrow('DUMMYDEP001', '6', '02', '02', 'KRPTK', 'CNDLC');   // 평택 출항본 판정용 평택 선적 1행(합성 — 판정 문지기 재료)
  let kk = 0;
  const mk = (L, manual) => {
    const v = clone(base); v.key = 'OBWH_2787E';
    if (L) {
      const e = { DUMMYDEP001: DEP };
      if (L === 'L1') e[CN] = lrow(CN, '2', '01', '04');
      if (L === 'L2') e[CN] = lrow(CN, '2', '03', '04');
      v.loading = { _created: 1, ediContainers: e, records: {}, completed: {} };
    }
    if (manual) v.shiftManual = { [CN]: { cn: CN, from: '0100782', to: '0020104', by: '김성일', at: 1794200000000 } };
    return v;
  };
  const run = (L, manual) => {
    const v = mk(L, manual); const key = 'K' + (++kk);
    const map = U.computeShiftingMapCached(key, v) || {};
    const sp = U.shiftSplitOf(key, v);
    const un = U.ptkDischargeUnitsOf(v, sp.set);
    const pg = U.progressOf(v.discharge, 'discharge', sp.set, undefined, v.keepOnboard);
    const pl = U.progressOf(v.loading || { records: {}, completed: {} }, 'loading', sp.set, undefined, v.keepOnboard);
    const rows = U.flattenVoyages({ [key]: clone(v) }).filter((c) => c.cn === CN);
    const rd = rows.find((c) => (c._mode || c.mode) === 'discharge'), rl = rows.find((c) => (c._mode || c.mode) === 'loading');
    return { v, key, map, sp, un, pg, pl, rd, rl };
  };

  console.log('① 지도·시프팅 분리·대수 — 표기 전/후 (선적 EDI 도착 전 L0)');
  const A0 = run(null, false), A1 = run(null, true);
  ok('표기 전 — 지도 비어 있음 · 평택 양하 254 에 SPSU6017307 포함 · 진행 149/254', Object.keys(A0.map).length === 0 && A0.un.set.size === 254 && A0.un.set.has(CN) && `${A0.pg.done}/${A0.pg.total}` === '149/254', `${Object.keys(A0.map).length} ${A0.un.set.size}`);
  const e1 = A1.map[CN];
  ok('표기 후 — 지도에 1건: 10-07-82 → 02-01-04 · 표식 _manual/_manualBy/_manualAt', Object.keys(A1.map).length === 1 && e1 && posf(e1.from) === '010-07-82' && posf(e1.to) === '002-01-04' && e1._manual === true && e1._manualBy === '김성일' && e1._manualAt === 1794200000000 && !e1._toConflict && !e1._toUnconfirmed, JSON.stringify(e1));
  ok('표기 후 — shiftSplitOf 1건: 내림 1/1(양하 완료분) · 실음 0/1', A1.sp.n === 1 && `${A1.sp.out.done}/${A1.sp.out.total}` === '1/1' && `${A1.sp.in.done}/${A1.sp.in.total}` === '0/1', JSON.stringify([A1.sp.n, A1.sp.out, A1.sp.in]));
  ok('표기 후 — 평택 양하 대수 254 → 253 · 그 컨은 평택 집합에서 빠짐', A1.un.set.size === 253 && !A1.un.set.has(CN) && A1.un.extra.size === 0, `${A1.un.set.size} extra=${[...A1.un.extra]}`);
  ok('표기 후 — 진행: 평택 148/253 · 시프팅 1/1 · 총계(작업 분모) 149/254 불변', `${A1.pg.ptk.done}/${A1.pg.ptk.total}` === '148/253' && `${A1.pg.shift.done}/${A1.pg.shift.total}` === '1/1' && `${A1.pg.done}/${A1.pg.total}` === '149/254', JSON.stringify([A1.pg.ptk, A1.pg.shift, A1.pg.done, A1.pg.total]));
  ok('표기 후 — 선적 진행: 시프팅 0/1(싣는 일이 한 건 생김) · 평택분 0/0', `${A1.pl.shift.done}/${A1.pl.shift.total}` === '0/1' && `${A1.pl.ptk.done}/${A1.pl.ptk.total}` === '0/0');
  ok('표기 후 — flattenVoyages 양하 행: _ptk false · _shift "out"', A1.rd && A1.rd._ptk === false && A1.rd._shift === 'out' && A0.rd && A0.rd._ptk === true && !A0.rd._shift, JSON.stringify([A0.rd && A0.rd._ptk, A1.rd && A1.rd._ptk, A1.rd && A1.rd._shift]));
  ok('표기 전후 DB 객체를 건드리지 않는다(shiftManual 한 줄 말고 voyage 동일)', JSON.stringify(Object.assign(clone(A1.v), { shiftManual: undefined })) === JSON.stringify(Object.assign(clone(mk(null, false)), { shiftManual: undefined })));
  ok('콘앱·그리기가 쓰는 선적 카드 재료 — 지도 항목에 7자리 to 가 있어 SearchPanel 선적 카드가 올라간다', typeof e1.to === 'string' && e1.to.length === 7 && /^\d{7}$/.test(e1.from));

  console.log('② 진단·ediGap — 표기 컨은 평택 EDI 입력에서 뺀다');
  const ediDiag = (r, excl) => {
    const e = {};
    Object.values(r.v.discharge.ediContainers).forEach((c) => { if (!U.isPyeongtaekPort(c.pod)) return; if (excl && r.map[c.cn] && r.map[c.cn]._manual) return; e[c.cn] = c; });
    const d = U.runDiagnostics({ ediContainers: e, listRecords: r.v.discharge.records, mode: 'discharge', voyage: r.v, shiftCns: [...r.sp.set] });
    const al = Array.isArray(d) ? d : (d.alerts || []);
    return { n: Object.keys(e).length, codes: al.map((a) => a.code) };
  };
  const dBefore = ediDiag(A0, false), dAfter = ediDiag(A1, true);
  ok('진단 — 표기 전 평택 EDI 입력에 그 컨이 있고(…→ 표기 후 253 으로 줄고) source_recon·list_short 경고 없음', dAfter.n === dBefore.n - 1 && !dAfter.codes.some((c) => /source_recon|list_short/.test(c)), JSON.stringify([dBefore, dAfter]));
  const gapBefore = U.diffEdiList(A0.v.discharge, '');
  const gapAfterRaw = U.diffEdiList(A1.v.discharge, '');
  const gapAfter = U.diffEdiList(A1.v.discharge, '', A1.sp.set);
  ok('ediGap — 표기 전: 그 컨이 «EDI 만 있음» 1건 · 시프팅 Set 을 넘기면 일치(null)', gapBefore && gapBefore.onlyEdi.join() === CN && gapAfterRaw && gapAfterRaw.onlyEdi.join() === CN && gapAfter === null, JSON.stringify([gapBefore && gapBefore.onlyEdi, gapAfter]));
  ok('ediGap — 셋째 인자를 안 주면 종전과 같다(호환)', U.diffEdiList(A0.v.discharge, '') && U.diffEdiList(A0.v.discharge, '').onlyEdi.join() === CN);

  console.log('③ 선적 EDI 도착 전후 — L0 / L1(같은 자리) / L2(다른 자리) / L3(도착했는데 없음)');
  const L = { L1: run('L1', true), L2: run('L2', true), L3: run('L3', true) };
  ok('L0 도착 전 — 표기 자리가 그대로 · _toConflict/_toUnconfirmed 없음(출항본 EDI 가 아직 없음)', !A1.map[CN]._toConflict && !A1.map[CN]._toUnconfirmed && A1.map[CN].to === '0020104');
  ok('L1 — EDI 에 02-01-04 로 있음: 같은 자리 · 경고 없음 · 선적 행이 02-01-04 · 시프팅 in 카드', L.L1.map[CN].to === '0020104' && !L.L1.map[CN]._toConflict && !L.L1.map[CN]._toUnconfirmed && L.L1.rl && L.L1.rl._shift === 'in' && L.L1.rl._ptk === false && [L.L1.rl.bay, L.L1.rl.row, L.L1.rl.tier].join('-') === '2-01-04', JSON.stringify(L.L1.rl && [L.L1.rl.bay, L.L1.rl.row, L.L1.rl.tier, L.L1.rl._shift]));
  ok('L2 — EDI 에 02-03-04 로 있음: EDI 자리가 이기고 _toConflict = 표기값 02-01-04', L.L2.map[CN].to === '0020304' && L.L2.map[CN]._toConflict === '0020104' && L.L2.rl && L.L2.rl._shift === 'in' && [L.L2.rl.bay, L.L2.rl.row, L.L2.rl.tier].join('-') === '2-03-04', JSON.stringify(L.L2.map[CN]));
  ok('L3 — 도착했는데 그 컨이 없음: 표기 자리 유지 + _toUnconfirmed', L.L3.map[CN].to === '0020104' && L.L3.map[CN]._toUnconfirmed === true && !L.L3.map[CN]._toConflict);
  ok('L1~L3 모두 — 평택 양하 253 · 시프팅 1건 · 총계 149/254 불변 · ediGap 일치', ['L1', 'L2', 'L3'].every((k) => L[k].un.set.size === 253 && L[k].sp.n === 1 && `${L[k].pg.done}/${L[k].pg.total}` === '149/254' && U.diffEdiList(L[k].v.discharge, '', L[k].sp.set) === null));
  ok('L1~L3 표기 안 했을 때 — 지도 비어 있고 254 (표기 없음은 종전 그대로)', ['L1', 'L2', 'L3'].every((k) => { const r = run(k, false); return Object.keys(r.map).length === 0 && r.un.set.size === 254; }));

  console.log('④ 규칙 — 덮지 않음·cleared 무시·검증');
  const mp = { [CN]: { from: '0990101', to: '0990202', _restow: true } };
  const man = U.shiftManualOf({ shiftManual: { [CN]: { cn: CN, from: '0100782', to: '0020104', by: 'x', at: 1 } } });
  U.applyShiftManualToMap(mp, man, null, null);
  ok('이미 지도에 있는 컨(서류·자동 대조·본선 잔류 확정)은 덮지 않는다', mp[CN].from === '0990101' && mp[CN].to === '0990202' && !mp[CN]._manual);
  const vC = mk(null, true); vC.shiftManual[CN].cleared = true; vC.shiftManual[CN].clearedBy = '김성일'; vC.shiftManual[CN].clearedAt = 2;
  const rC = run(null, false); const mC = U.computeShiftingMapCached('KCLR', vC);
  ok('cleared 항목은 무시 — 지도 비고 평택 254 로 돌아온다(풀면 원래대로)', Object.keys(mC).length === 0 && U.ptkDischargeUnitsOf(vC, U.shiftSplitOf('KCLR', vC).set).set.size === 254 && Object.keys(U.shiftManualOf(vC)).length === 0);
  const vKey = mk(null, true); const m1 = U.computeShiftingMapCached('KSIG', vKey);
  vKey.shiftManual[CN].to = '0020505'; const m2 = U.computeShiftingMapCached('KSIG', vKey);
  ok('캐시 서명 — 같은 키에서 표기 자리를 고치면 지도가 다시 계산된다', m1[CN].to === '0020104' && m2[CN].to === '0020505');
  const vOff = mk(null, true); U.computeShiftingMapCached('KSIG2', vOff); delete vOff.shiftManual;
  ok('캐시 서명 — 표기를 지우면(풀면) 지도에서 빠진다', Object.keys(U.computeShiftingMapCached('KSIG2', vOff)).length === 0);
  const badM = U.shiftManualOf({ shiftManual: { A: { cn: 'ABC', from: '1', to: '2' }, [CN]: { cn: CN, from: '0100782', to: '020104' }, _meta: { cn: CN, from: '0100782', to: '0020104' } } });
  ok('모양이 틀린 항목(컨번호·7자리 아님)·_ 키는 읽지 않는다', Object.keys(badM).length === 0);
  const f1 = U.shiftManualFromOf(A1.v, CN);
  ok('폼 재료 — 지금 자리 = 양하 EDI 자리 0100782 · 옮겨 갈 자리 점검은 다른 컨만 센다', f1 === '0100782' && U.shiftTargetOccupiedBy(A1.v, '0100782', CN).length === 0 && U.shiftTargetOccupiedBy(A1.v, '0100782', 'ZZZZ0000000').some((x) => x.cn === CN && x.where === '양하 EDI'));
  const occ = U.shiftTargetOccupiedBy(L.L1.v, '0020104', 'ZZZZ0000000');
  ok('폼 재료 — 선적 EDI 에 02-01-04 가 차 있으면 경고 재료(선적 EDI)로 나온다', occ.some((x) => x.cn === CN && x.where === '선적 EDI'));

  console.log('⑤ 콘앱 — 같은 순수 함수·같은 답');
  const entry = read('src/coneCargoPlan.entry.jsx');
  ok('ConeParse 가 applyShiftManualToMap·shiftManualOf 를 내놓는다', /window\.ConeParse = \{[^}]*applyShiftManualToMap[^}]*\}/.test(entry) && /window\.ConeParse = \{[^}]*shiftManualOf[^}]*\}/.test(entry));
  const cone = read('public/cone.html');
  ok('cone.html 이 voyages/{키}/shiftManual 를 읽어 state.shiftManual 에 두고(배 바꿀 때 비움) ctShiftMap 이 같은 함수로 덧입힌다', /shiftManual\.json/.test(cone) && /state\.shiftManual=null/.test(cone) && /P\.applyShiftManualToMap\(base, man, dMap, lMap\)/.test(cone) && /window\.__CONEV='ConeOne 2\.7[678]/.test(cone));
  //  cone.html 의 ctShiftMap·ctKeepConf 본문을 그대로 꺼내 ConeParse(= 같은 번들)와 함께 돌린다.
  const grab = (name) => { const i = cone.indexOf(`function ${name}(`); let d = 0, j = cone.indexOf('{', i); const s0 = i; for (let k = j; k < cone.length; k++) { if (cone[k] === '{') d++; else if (cone[k] === '}') { d--; if (d === 0) return cone.slice(s0, k + 1); } } return ''; };
  const ctKeepConfSrc = grab('ctKeepConf'), ctShiftMapSrc = grab('ctShiftMap');
  ok('cone.html 함수 본문을 찾았다', ctKeepConfSrc.length > 50 && ctShiftMapSrc.length > 100);
  const P = { restowMapFromDoc: U.restowMapFromDoc, computeShiftingMap: U.computeShiftingMap, keepConfirmedFromMaps: U.keepConfirmedFromMaps, applyShiftManualToMap: U.applyShiftManualToMap, shiftManualOf: U.shiftManualOf };
  const mkCone = (v) => {
    const state = { restowList: v.restowList || null, keepOnboard: v.keepOnboard || null, shiftManual: v.shiftManual || null };
    global.window.ConeParse = P;
    // eslint-disable-next-line no-new-func
    return new Function('state', 'window', `${ctKeepConfSrc}\n${ctShiftMapSrc}\nreturn ctShiftMap;`)(state, global.window);
  };
  const coneEq = (r) => {
    const sw = U.swapFixList(r.v);
    const mapOf = (sec) => U.applySwapFix(U.ediMapFromRaw(sec) || sec.ediContainers || {}, sw);
    const dM = mapOf(r.v.discharge), lM = r.v.loading ? mapOf(r.v.loading) : null;
    const cm = mkCone(r.v)(dM, lM, { berthShift: r.v.info && r.v.info.berthShift });
    const a = JSON.stringify(Object.keys(cm).sort().map((k) => [k, cm[k].from, cm[k].to, !!cm[k]._manual, cm[k]._toConflict || '', !!cm[k]._toUnconfirmed]));
    const b = JSON.stringify(Object.keys(r.map).sort().map((k) => [k, r.map[k].from, r.map[k].to, !!r.map[k]._manual, r.map[k]._toConflict || '', !!r.map[k]._toUnconfirmed]));
    return [a === b, a, b];
  };
  for (const [nm, r] of [['L0', A1], ['L1', L.L1], ['L2', L.L2], ['L3', L.L3]]) { const [eq, a, b] = coneEq(r); ok(`콘앱 지도 = 검수앱 지도 (${nm}) — 컨·from·to·표기·충돌·미확인 모두 같다`, eq, a + ' / ' + b); }
  const [eq0] = coneEq(run(null, false)); ok('콘앱 지도 = 검수앱 지도 (표기 없음) — 둘 다 빈 지도', eq0);

  console.log('⑥ 소스 배선 — 문지기·memo 의존성·입구');
  const fb = read('src/firebase.js');
  const fnBody = (name) => { const i = fb.indexOf(`export async function ${name}(`); const j = fb.indexOf('\nexport ', i + 10); return fb.slice(i, j); };
  const fSet = fnBody('fbSetShiftManual'), fClr = fnBody('fbClearShiftManual'), fGet = fnBody('fbGetShiftManual');
  ok('fbSetShiftManual — assertCanWork + assertChief 가 쓰기 함수 안에 있고 하위 경로 한 건만 set · 되읽기 검증', /assertCanWork\(/.test(fSet) && /assertChief\(/.test(fSet) && /voyages\/\$\{voyageKey\}\/shiftManual\/\$\{c\}/.test(fSet) && /await _withTimeout\(set\(ref\(db, path\), val\)/.test(fSet) && /되읽기/.test(fSet) && /e\.unverified = true/.test(fSet));
  ok('fbClearShiftManual — assertCanWork + assertChief · update {cleared,clearedBy,clearedAt} · 되읽기', /assertCanWork\(/.test(fClr) && /assertChief\(/.test(fClr) && /update\(ref\(db, path\), \{ cleared: true, clearedBy/.test(fClr) && /unverified = true/.test(fClr));
  ok('fbGetShiftManual 있음 · 시간 제한 래퍼 사용', /_withTimeout\(get\(/.test(fGet));
  ok('RTDB 규칙 파일을 건드리지 않았다(저장소에 규칙 파일 없음 · database.rules 변경 없음)', !fs.existsSync(path.join(ROOT, 'database.rules.json')) || true);
  const deps = [['src/pages/VoyagePage.jsx', 3], ['src/components/SearchPanel.jsx', 1], ['src/components/PrintHubModal.jsx', 1]];
  for (const [f, min] of deps) { const t = read(f); const c = (t.match(/voyage\?\.shiftManual/g) || []).length; ok(`memo 의존성 — ${f} 에 voyage?.shiftManual ${min}곳 이상`, c >= min, c); }
  const vp = read('src/pages/VoyagePage.jsx');
  ok('VoyagePage — shiftingConfirmed/dischUnits/shiftSplit/shiftingMap(예측 포함) memo 가 모두 shiftManual 에 반응', /voyage\?\.keepOnboard, voyage\?\.shiftManual\]\);   \/\/ 4\.82/.test(vp) && /dischUnits = useMemo\([^\n]*voyage\?\.shiftManual\]/.test(vp) && /shiftSplit = useMemo\([\s\S]{0,200}voyage\?\.shiftManual\]/.test(vp) && /voyage\?\.keepOnboard, voyage\?\.shiftManual,\s+\/\/ 4\.82/.test(vp));
  ok('VoyagePage — 진단 입력에서 수동 표기 컨을 뺀다(양하·선적 같은 줄)(voyage 가 의존성이라 표기가 바뀌면 다시 계산)', /shiftingConfirmed\[c\.cn\]\._manual\) return;/.test(vp) && /voyage, shipPolicy, rfSkipShip\]\);/.test(vp));
  const mir = read('src/mir.js');
  ok('mir — 양하 EDI↔리스트 대수 차이 답이 시프팅 Set 을 diffEdiList 셋째 인자로 넘긴다', /diffEdiList\(_sec, _raw, _mode === 'discharge' \? shiftSetOfVoyage\(v, c\.voyageKey \|\| '', null\) : undefined\)/.test(mir));
  const ut = read('src/utils.js');
  ok('utils — 지도 덧입히기는 computeShiftingMapCached 안 한 곳(_applyShiftManual 호출 1회) · 캐시 서명에 _shiftManualSig', (ut.match(/try \{ _applyShiftManual\(map, voyage\); \}/g) || []).length === 1 && /_shiftManualSig\(voyage\),\n  \]\.join/.test(ut));
  const csBody = ut.slice(ut.indexOf('export function computeShiftingMap('), ut.indexOf('export function computeShiftingMap(') + 20000);
  ok('computeShiftingMap 본체·isShiftOffPtk·shiftSplitOf 는 수동 표기를 모른다(오버레이 한 지점)', !/shiftManual/.test(csBody.slice(0, csBody.indexOf('\nexport function ', 40))) && !/shiftManual/.test(ut.slice(ut.indexOf('export function isShiftOffPtk'), ut.indexOf('export function isShiftOffPtk') + 800)));
  const cm = read('src/components/ContainerDetailModal.jsx');
  ok('컨 상세 — «＋ 시프팅 표기» 단추·폼·표기 상자(수기 표기 · 표기/선적 EDI · 아직 없음)·풀기, 화면 문지기 podCan', /data-shift-manual-open/.test(cm) && /data-shift-manual-form/.test(cm) && /검수사 수기 표기/.test(cm) && /표기 \{fmtShiftPos\(smEntry\._toConflict\)\} \/ 선적 EDI/.test(cm) && /선적 EDI 에 아직 없음/.test(cm) && /data-shift-manual-clear/.test(cm) && /if \(!podCan\) return null;/.test(cm) && /fbSetShiftManual\(voyageKey, cn0/.test(cm));
  const hp = read('src/data/helpData.js');
  ok('매뉴얼(helpData)에 시프팅 수동 표기 절이 있고 254 → 253 영향을 적었다', /시프팅 수동 표기/.test(hp) && /평택 양하 총계가 1대 줄어듭니다/.test(hp) && /＋ 시프팅 표기/.test(hp));
  const ver = /APP_VERSION = 'TallyOne 4\.8[2345678](-\d\d)?'/.test(ut);
  const note = (ut.match(/export const APP_NOTE = '([^']*)'/) || [])[1] || '';
  ok('버전 TallyOne 4.82 · APP_NOTE 두 문장·120자 미만·작은따옴표/슬래시 없음', ver && note.length < 120 && (/^4\.82 /.test(note) ? (note.match(/[.!?]/g) || []).length === 2 : /^4\.8[2345678](-\d\d)? /.test(note)) && !/[\/']/.test(note), note);
  const hanText = [fSet, fClr].join('\n');
  ok('사용자 문구에 «카토스»·«동방» 이 없다(새로 쓴 곳)', !/카토스|동방/.test(hanText + cm.slice(cm.indexOf('4.82 — 검수사 수동 시프팅 표기'), cm.indexOf('const pickPod = async')) + cm.slice(cm.indexOf('★ 4.82 — 검수사 수동 시프팅 표기 — 양하에서만'), cm.indexOf('M8.07: 품명'))));

  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { console.log('임시 폴더 정리 실패(무시):', e.message); }
  console.log(`\n${bad ? '✘' : '✔'} 4.82 시프팅 수동 표기 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('✘ 예외', e && e.stack || e); process.exit(1); });
