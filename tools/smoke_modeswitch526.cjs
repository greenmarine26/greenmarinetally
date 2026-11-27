// 5.26 연막검사 — 관리자로 막힌 자리에서 그 자리 작업자 바꾸기(검수사 본인). 실자료 SWAL 2611N 11-25 야간 조 등록(3호기 최원형 · 4호기 김성일).
const path = require('path'); const fs = require('fs'); const os = require('os'); const { execSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };
const TMP = fs.mkdtempSync(path.join(process.env.SMOKE_TMP || os.tmpdir(), 'ms526-'));
const entry = path.join(TMP, 'e.js');
fs.writeFileSync(entry, `export * from '${path.join(ROOT, 'src/workChoice.js')}'; export * as MS from '${path.join(ROOT, 'src/modeSwitch.js')}'; export { crewSegments, crewSegmentAt, gangsOfShift, crewNameAt } from '${path.join(ROOT, 'src/utils.js')}';`);
execSync(`npx esbuild "${entry}" --bundle --platform=node --format=cjs --log-level=error --outfile="${path.join(TMP, 'b.cjs')}"`, { cwd: ROOT, stdio: 'pipe' });
const store = {}; global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const listeners = {}; let alerts = [];
global.window = { location: { hash: '#/voyage/SWAL_2611N' }, addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); }, removeEventListener: () => {}, dispatchEvent: (e) => { (listeners[e.type] || []).forEach((f) => f(e)); return true; } };
global.CustomEvent = class { constructor(type, o) { this.type = type; this.detail = o && o.detail; } };
global.alert = (m) => { alerts.push(String(m)); };
const W = require(path.join(TMP, 'b.cjs'));
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/modeswitch526.json'), 'utf8'));
const OWNER = '김성일';
(async () => {
  const T = Date.parse('2026-11-25T22:00:00+09:00');
  const vs = { [FX.voyageKey]: { info: JSON.parse(JSON.stringify(FX.info)) } };
  const aw = W.adminWorkOf(OWNER, vs, T);
  ok(aw && aw.voyageKey === 'SWAL_2611N' && aw.equip === '4호기' && aw.shiftKey === '11-25 야간', `실자료 등록 — 김성일 SWAL 4호기 (${JSON.stringify(aw)})`);
  const eff = W.effectiveWorkChoice({ name: OWNER, mode: 'admin' }, aw, 'SWAL_2611N');
  ok(eff.mode === 'work' && eff.adminWork && eff.shiftKey === '11-25 야간', '작업자이면서 관리자 · 조 키를 들고 있다(헤더 [작업자] 가 쓴다)');
  const left = JSON.parse(JSON.stringify(FX.info)); left.craneCrew['11-25 야간']['4호기'].leftAt = T; left.craneCrew['11-25 야간']['4호기'].leftAs = 'admin';
  ok(W.adminWorkOf(OWNER, { SWAL_2611N: { info: left } }, T) === null, '떠난 표시(leftAt)가 붙으면 관리자로 돌아간다');
  ok(W.adminWorkOf('최원형', { SWAL_2611N: { info: left } }, T) === null, '관리자가 아닌 사람은 판정 밖(종전)');
  // 감사 중1 — 떠난 뒤 그 호기는 사람 없음 · 앞 기록은 그대로 · 갱 수는 남은 사람만
  const L0 = T - 3600000;
  const segs = W.crewSegments(left);
  ok(W.crewNameAt(left, T - 60000, '4호기') === '김성일' && W.crewNameAt(left, T + 60000, '4호기') === '' && W.crewNameAt(left, T + 60000, '3호기') === '최원형', '떠나기 전 4호기 기록은 김성일 · 떠난 뒤는 사람 없음 · 3호기 그대로');
  const pooled = JSON.parse(JSON.stringify(left)); pooled.crewPoolLog = { [`${T - 1800000}_3`]: { at: T - 1800000, equip: '3호기', name: '홍길동', from: '최원형' } };
  ok(W.crewNameAt(pooled, T + 60000, '4호기') === '' && W.crewNameAt(pooled, T + 60000, '3호기') === '홍길동', '재감사 중A — 교대 기록이 있는 조도 떠난 뒤 4호기는 사람 없음');
  const wrp = fs.readFileSync(path.join(ROOT, 'src/workReportPlan.js'), 'utf8'), ctm = fs.readFileSync(path.join(ROOT, 'src/crewTimed.js'), 'utf8');
  ok(/cc\.leftAs !== 'admin'/.test(wrp) && /e\.leftAs === 'admin'\) return null/.test(ctm), '재감사 중C — 미르 작업보고·시각 교대도 관리자 떠난 칸을 등록 없음으로');
  ok(W.gangsOfShift(left, T + 60000).n === 1, `갱 수는 남은 최원형 1갱 (${JSON.stringify(W.gangsOfShift(left, T + 60000))})`);
  const only = { vsl: 'SWAL', craneCrew: { '11-25 야간': { '4호기': { name: OWNER, at: L0, leftAt: T, leftAs: 'admin' } } }, gangs: 2 };
  ok(W.gangsOfShift(only, T + 60000).n === 2, '혼자 등록했다 떠나면 0갱이 아니라 항차 기본 갱');
  const csm = fs.readFileSync(path.join(ROOT, 'src/craneShipMove.js'), 'utf8');
  ok(/e\.leftAs === 'admin'\) return null/.test(csm), '배 이동 판정은 관리자 떠난 칸을 등록 없음으로(김성일 되살림 막음)');
  // ② 그 자리 바꾸기 — 소유자 관리자 · 배 화면
  W.setActiveWorkChoice({ name: OWNER, mode: 'admin' });
  ok(W.MS.canSwitchHere() === true, '검수사 관리자 · 배 화면 → 그 자리 바꾸기 가능');
  let got = null;
  window.addEventListener(W.MS.MODE_SWITCH_EVT, (e) => { e.detail.handled = true; got = e.detail; setTimeout(() => { W.setActiveWorkChoice({ name: OWNER, mode: 'work', voyageKey: 'SWAL_2611N', equip: '4호기', adminWork: true }); e.detail.resolve(true); }, 5); });
  alerts = [];
  const r1 = await W.MS.askRecordSwitch('완료');
  ok(r1 === true && got && got.what === '완료' && got.voyageKey === 'SWAL_2611N' && alerts.length === 0, '호기를 고르면 알림창 없이 true — 하던 «완료» 가 이어진다');
  ok(await W.MS.askRecordSwitch('완료') === true, '작업자가 된 뒤엔 창 없이 통과');
  // 취소
  W.setActiveWorkChoice({ name: OWNER, mode: 'admin' });
  listeners[W.MS.MODE_SWITCH_EVT] = [(e) => { e.detail.handled = true; setTimeout(() => e.detail.resolve(false), 5); }];
  alerts = []; ok(await W.MS.askRecordSwitch('보류') === false && alerts.length === 0, '창에서 취소하면 false · 알림창 없음');
  // 창을 받을 화면이 없으면 종전 알림
  listeners[W.MS.MODE_SWITCH_EVT] = [];
  alerts = []; ok(await W.MS.askRecordSwitch('완료') === false && alerts.length === 1 && /관리자로 들어와 있습니다/.test(alerts[0]), '창이 없으면 종전 관리자 알림창');
  // 배 화면 밖
  window.location.hash = '#/home'; alerts = [];
  ok(W.MS.canSwitchHere() === false && await W.MS.askRecordSwitch('완료') === false && alerts.length === 1, '배 화면 밖은 종전 알림창');
  window.location.hash = '#/voyage/SWAL_2611N';
  // 다른 사람 — 클로드·조회만 수석은 종전
  W.setActiveWorkChoice({ name: '클로드', mode: 'admin' }); alerts = [];
  ok(W.MS.canSwitchHere() === false && await W.MS.askRecordSwitch('완료') === false && alerts.length === 1, '클로드(관리자)는 종전 알림창');
  W.setActiveWorkChoice({ name: '최원형', mode: 'view' }); alerts = [];
  ok(await W.MS.askRecordSwitch('완료') === false && /조회만/.test(alerts[0] || ''), '조회만은 종전 조회만 알림창');
  // ③ 소스 — 막던 자리 스물다섯이 한 벌을 부른다
  const comp = path.join(ROOT, 'src/components');
  let calls = 0, old = 0;
  for (const f of fs.readdirSync(comp)) { const s = fs.readFileSync(path.join(comp, f), 'utf8'); calls += (s.match(/await askRecordSwitch\('/g) || []).length; old += (s.match(/alert\(recordGateText\(/g) || []).length; }
  ok(calls === 26 && old === 0, `막던 자리 25곳(+누락 완료 확인창 앞 1)이 askRecordSwitch (부름 ${calls} · 옛 알림 ${old})`);
  const app = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
  ok(/<ModeSwitchSheet voyages=\{voyages\} inspector=\{inspector\} inspectors=\{inspectorsView\}\/>/.test(app) && /detail\.adminOnly && canSwitchHere\(\)/.test(app), 'App — 바꾸기 창 · 쓰는 자리 문지기 막힘도 같은 창');
  const hd = fs.readFileSync(path.join(ROOT, 'src/components/Header.jsx'), 'utf8');
  ok(/data-mode-chip="admin"/.test(hd) && /data-mode-chip="work"/.test(hd) && (hd.match(/isOwnerName\(inspector\) && route\.name === 'voyage'/g) || []).length === 2, '헤더 칩 둘 — 검수사 · 배 화면에서만');
  const fb = fs.readFileSync(path.join(ROOT, 'src/firebase.js'), 'utf8');
  ok(/export async function fbLeaveCraneAsAdmin/.test(fb) && /leftAt: now, leftAs: 'admin'/.test(fb) && /export async function fbClaimCraneAsAdmin/.test(fb) && /if \(nm && nm !== me && !adminLeft\) \{ other = nm; return undefined; \}/.test(fb) && /adminOnly: true \} \}\)\);/.test(fb), '관리자로 돌아가기는 떠난 표시만 · 문지기 신호에 adminOnly');
  const aws = fs.readFileSync(path.join(ROOT, 'src/components/AdminWorkStart.jsx'), 'utf8');
  ok(/v\.leftAs === 'admin'\) return ''/.test(aws) && /fbClaimCraneAsAdmin\(voyageKey, sk, no, me, others\)/.test(aws) && /loginHolder\(no\)/.test(aws) && /if \(onDone\) onDone\(no\)/.test(aws), '호기 단추 — 떠난 등록은 빈 호기 · 등록 뒤 잇기 신호');
  console.log(`smoke_modeswitch526 ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('✗ 실행 오류', e); process.exit(1); });
