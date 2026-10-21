// 동방(PNCT)에서 갱이 다른 배에 가 있어 기다리는 배에는 미르가 «실적이 없다»고 화내지 않는가 (TallyOne 4.42-03)
//   검수사 2026-10-21 16:34 «동방은 3갱 작업위주로 합니다. 그래서 연태 2갱 연운항1갱 작업 우선입니다. 그러므로 DXQD는 연태 작업이 끝나야 가능합니다. 미르가 DXQD 작업 실적이 없어서 화나있습니다.»
//   재료 — RTDB GET 16:37 사본(fixtures/mirgang44203.json): DXQD 2641E 양하 302 대 15:10 끝 · 선적 0 · 호기 표 QC102·QC104 선적 «했다 0»,
//   OBWH 2771E(연태) QC101·QC102 양하 하는 중 · TNJP 26369E(연운항) QC103 하는 중. 4.42-02 까지는 «DXQD … 실작업 87분째 없어요» 로 화냈다.
//   node tools/smoke_mirgang44203.cjs <mirCore 번들> <저장소 루트>
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
const M = require(path.resolve(OUT));
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirgang44203.json'), 'utf8'));
let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const AT = Date.parse('2026-10-21T16:37:00+09:00');
const HB = FX.heartbeat;
const cp = () => JSON.parse(JSON.stringify(FX.voyages));
const ang = (V, now = AT) => M.angryReasons(V, HB, now);
const DXQD_ANGRY = /^DXQD 터미널은 작업 중인데 앱 완료 기록이 실작업 \d+분째 없어요$/;

console.log('① 검수사 16:34 사건 — DXQD 는 양하를 끝내고 선적 갱을 기다린다(동방 갱은 연태 OBWH 2 · 연운항 TNJP 1)');
{
  const V = cp();
  const q = V.DXQD_2641E.info.qcWork;
  T(q.QC102.disRest === 0 && q.QC102.lodDone === 0 && q.QC102.lodRest > 0 && q.QC104.lodDone === 0 && q.QC104.lodRest > 0, '재료 — DXQD 호기 표: 양하 남음 0 · 선적 했다 0 · 선적 남음 있음');
  const r = ang(V);
  T(r.length === 0, 'DXQD 에 화내지 않는다(갱 기다림)', JSON.stringify(r));
  T(M.pauseTargetsOf(V, HB, AT).length === 0, '멈춤 알림 대상(pauseTargetsOf)도 같은 판정 — 없음');
}
console.log('② 갱이 오면 종전대로 본다');
{
  //  QC104 가 DXQD 선적을 시작했다(다른 배에는 없는 호기) — 앱 완료가 15:10 뒤로 없으면 화낸다
  const V = cp(); V.DXQD_2641E.info.qcWork.QC104.lodDone = 3; V.DXQD_2641E.info.qcWork.QC104.lodRest = 96;
  const r = ang(V);
  T(r.length === 1 && DXQD_ANGRY.test(r[0]), 'DXQD 에 이 배만의 «하는 중» 호기가 생기면 화낸다', JSON.stringify(r));
}
{
  //  OBWH 가 끝나(workEndAt) 1·2호기가 풀렸는데 DXQD 의 QC102 가 양하 하는 중이면 그 배를 하는 것이다
  const V = cp(); V.DXQD_2641E.info.qcWork.QC102 = { qc: 'QC102', disDone: 100, disRest: 52, lodDone: 0, lodRest: 76, total: 228 };
  V.OBWH_2771E.info.workEndAt = '2026-10-21 16:00';
  const r = ang(V);
  T(r.length === 1 && DXQD_ANGRY.test(r[0]), '끝난 배(OBWH workEndAt)의 호기 표는 «다른 배에서 하는 중» 으로 안 친다', JSON.stringify(r));
}
console.log('③ 가릴 수 없거나 문이 닫힌 경우');
{
  //  QC102 가 DXQD·OBWH 양쪽에서 «하는 중» — 어느 배에 있는지 가릴 수 없다 → 화내지 않는다
  const V = cp(); V.DXQD_2641E.info.qcWork.QC102 = { qc: 'QC102', disDone: 100, disRest: 52, lodDone: 0, lodRest: 76, total: 228 };
  T(ang(V).length === 0, '같은 호기가 같은 부두 작업 중인 다른 배에서도 하는 중이면 화내지 않는다');
}
{
  //  남은 일이 없으면 이 문은 닫힌다(종전 판정 그대로)
  const V = cp(); for (const q of Object.values(V.DXQD_2641E.info.qcWork)) q.lodRest = 0;
  const r = ang(V);
  T(r.length === 1 && DXQD_ANGRY.test(r[0]), '호기 표에 남은 일이 없으면 종전 판정(이 규칙은 «기다림» 만)', JSON.stringify(r));
  //  호기 표가 없으면 종전 판정
  const V2 = cp(); delete V2.DXQD_2641E.info.qcWork;
  const r2 = ang(V2);
  T(r2.length === 1 && DXQD_ANGRY.test(r2[0]), '호기 표가 없으면 종전 판정', JSON.stringify(r2));
}
{
  //  PCTC 는 이 규칙을 타지 않는다 — 4.42-02 사건(13:25 DJCF·STSE 화남)이 그대로
  const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirpause44202.json'), 'utf8'));
  const r = M.angryReasons(P.voyages, P.heartbeat, Date.parse('2026-10-21T13:25:00+09:00'));
  T(r.length === 2 && /^DJCF /.test(r[0]) && /^STSE /.test(r[1]), 'PCTC 배(DJCF·STSE 13:25)는 종전대로 화낸다', JSON.stringify(r));
  //  PCTC 부두로 옮긴 DXQD 는(호기 표가 있어도) 이 문을 안 탄다
  const V = cp(); V.DXQD_2641E.info.berth = '동부두 7번선석'; V.DXQD_2641E.info.pier = 'PCTC'; V.DXQD_2641E.info.berthNo = '7B';
  const r3 = ang(V);
  T(r3.length === 1 && DXQD_ANGRY.test(r3[0]), '동방이 아닌 부두면 호기 표가 있어도 종전 판정', JSON.stringify(r3));
}
console.log('④ 배선');
{
  const src = fs.readFileSync(path.join(ROOT, 'src/mir.js'), 'utf8');
  T(/if \(workPauseOf\(v, now\)\) continue;[^\n]*\n\s*if \(_pnctGangWaiting\(vKey, v, voyages, now\)\) continue;/.test(src), '화남 판정(_angryList — angryReasons·pauseTargetsOf 한 벌)이 _pnctGangWaiting 을 본다');
  T(/const rows = qcRowsOf\(v && v\.info && v\.info\.qcWork\);/.test(src), '동방 호기 표는 utils.qcRowsOf 한 벌로 읽는다');
}
console.log(`\n${bad ? '✘' : '✔'} 미르 4.42-03(동방 갱 기다리는 배에 화내지 않음) 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
