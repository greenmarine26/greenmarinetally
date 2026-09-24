// 3.60-03 연막검사 — 전체 진단(2026-09-24)에서 고친 기록 오염 8건이 되살아나면 배포를 막는다.
//   실소스를 esbuild 로 묶어 실제로 돌린다(스텁 Firebase — 쓰기 없음). 소스 문자열 검사는 «배선» 항목(key·scope·unsub)에만 쓴다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36003_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const bundle = (entry, out, extra = '') => execSync(`npx esbuild "${entry}" --bundle --platform=node --format=cjs --log-level=error ${extra} --outfile="${out}"`, { cwd: ROOT, stdio: 'pipe' });

global.window = { addEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = { addEventListener() {}, createElement: () => ({ style: {} }), documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
global.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log('■ ① 기록지 자리 — 완료 뒤에도 사람이 적은 실물 자리가 남는가 (firebase 스텁)');
  const FBO = path.join(TMP, 'fb.cjs');
  const stub = './tools/stub_fbdb_mem.js';
  bundle('src/firebase.js', FBO, `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub}`);
  const FB = require(FBO);
  global.__memdb = { voyages: { V1: { loading: { ediContainers: {
    PLAN0000001: { cn: 'PLAN0000001', bay: '10', row: '02', tier: '04', iso: '22G1', fe: 'F', pol: 'KRPTK' },
    NOPL0000002: { cn: 'NOPL0000002', iso: '22G1', fe: 'F', pol: 'KRPTK' },
    ASGN0000003: { cn: 'ASGN0000003', bay: '10', row: '04', tier: '04', iso: '22G1', fe: 'F', pol: 'KRPTK' },
  } } } } };
  localStorage.setItem('master_active_inspector_v1', '검수원A');
  const rec = (cn) => global.__memdb.voyages.V1.loading.records[cn] || {};
  const pos = (r) => `${r.bay_actual}-${r.row_actual}-${r.tier_actual}`;
  await FB.fbSetActualPosition('V1', 'loading', 'PLAN0000001', '13', '06', '04', '검수원A');
  await FB.fbCompleteContainer('V1', 'loading', 'PLAN0000001', '검수원A', 'normal', '', '1'); await sleep(80);
  ok('계획 10-02-04 컨을 13-06-04 로 적고 완료 → 실물 자리 13-06-04 유지', pos(rec('PLAN0000001')) === '13-06-04', pos(rec('PLAN0000001')));
  await FB.fbSetActualPosition('V1', 'loading', 'NOPL0000002', '13', '08', '04', '검수원A');
  await FB.fbCompleteContainer('V1', 'loading', 'NOPL0000002', '검수원A', 'normal', '', '1'); await sleep(80);
  ok('계획 없는 컨(타항 시프팅)도 13-08-04 유지 · cn 칸 있음', pos(rec('NOPL0000002')) === '13-08-04' && rec('NOPL0000002').cn === 'NOPL0000002');
  //  «정해 준 자리»(*_assign)가 있으면 종전대로 그것이 이긴다(2.94-06) — 되돌림 아님
  global.__memdb.voyages.V1.loading.records.ASGN0000003 = { cn: 'ASGN0000003', bay_assign: '12', row_assign: '02', tier_assign: '82' };
  await FB.fbCompleteContainer('V1', 'loading', 'ASGN0000003', '검수원A', 'normal', '', '1'); await sleep(80);
  ok('정해 준 자리(assign 12-02-82)가 있는 컨은 완료 때 그 자리가 실물이 된다', pos(rec('ASGN0000003')) === '12-02-82' && rec('ASGN0000003').bay_assign == null, pos(rec('ASGN0000003')));
  //  정해 준 자리가 있었어도 사람이 실물 자리를 적으면 그것이 이긴다(감사 지적 — fbSetActualPosition 이 assign 을 걷는다)
  global.__memdb.voyages.V1.loading.records.ASG20000005 = { cn: 'ASG20000005', bay_assign: '12', row_assign: '04', tier_assign: '82' };
  await FB.fbSetActualPosition('V1', 'loading', 'ASG20000005', '14', '02', '84', '검수원A');
  await FB.fbCompleteContainer('V1', 'loading', 'ASG20000005', '검수원A', 'normal', '', '1'); await sleep(80);
  ok('assign 12-04-82 뒤 실물 14-02-84 를 적고 완료 → 14-02-84 유지 · assign 걷힘', pos(rec('ASG20000005')) === '14-02-84' && rec('ASG20000005').bay_assign == null, pos(rec('ASG20000005')));
  //  창고(__STG__) 표식은 1.54 흐름대로 계획 자리로 실린다
  global.__memdb.voyages.V1.loading.records.STGU0000004 = { cn: 'STGU0000004', bay: '11', row: '02', tier: '04', bay_actual: '__STG__', row_actual: '', tier_actual: '' };
  await FB.fbCompleteContainer('V1', 'loading', 'STGU0000004', '검수원A', 'normal', '', '1'); await sleep(80);
  ok('창고(__STG__) 컨은 종전대로 계획 자리 11-02-04 로 실린다', pos(rec('STGU0000004')) === '11-02-04', pos(rec('STGU0000004')));

  console.log('■ ② 덱플랜 저장이 assign 을 지우지 않는가');
  global.__memdb.voyages.V1.loading.stowagePlan = { decks: [1], assign: { 'D1-01': 'ABCU1234567' } };
  await FB.fbSetStowagePlan('V1', 'loading', { voy: 'R1', decks: [2], total: 3 });
  const sp = global.__memdb.voyages.V1.loading.stowagePlan;
  ok('fbSetStowagePlan 뒤 assign 유지 · decks 갱신', sp && sp.assign && sp.assign['D1-01'] === 'ABCU1234567' && Array.isArray(sp.decks) && sp.decks[0] === 2, JSON.stringify(sp));

  console.log('■ ③ 질문은 시작 시각을 세우지 않는다 (nlSearch 실소스)');
  const NSO = path.join(TMP, 'ns.cjs');
  bundle('src/nlSearch.js', NSO, '--external:firebase --external:firebase/* --loader:.png=dataurl');
  const NS = require(NSO);
  const p = (q) => NS.parseNaturalQuery(q);
  for (const q of ['10시부터 몇 대 했어', '8시부터 12시까지 몇 대', '9시부터 작업한 거 몇 개', '10시부터 얼마나 남았어']) ok(`«${q}» → startSet 없음`, !p(q).startSet, JSON.stringify(p(q).startSet));
  for (const q of ['22:00부터 재계산', '22시부터', '작업 22시 시작', '22시에 시작했어']) ok(`«${q}» → startSet 있음(종전 유지)`, !!p(q).startSet);

  console.log('■ ④ 42RH·40RH = 40HC 리퍼 (utils 실소스)');
  const UO = path.join(TMP, 'u.cjs');
  bundle('src/utils.js', UO, '--external:firebase --external:firebase/* --loader:.png=dataurl');
  const U = require(UO);
  ok("isoToLabel('42RH') = 40RH", U.isoToLabel('42RH') === '40RH', U.isoToLabel('42RH'));
  ok("isoToLabel('40RH') = 40RH (되먹임 안정)", U.isoToLabel('40RH') === '40RH', U.isoToLabel('40RH'));
  ok("isoToLabel('42HR') = 40RH (3.53-06 유지)", U.isoToLabel('42HR') === '40RH');
  ok("isoToLabel('42R1') = 40RF (8'6\" 리퍼 유지)", U.isoToLabel('42R1') === '40RF');
  if (typeof U.normalizeSpecIso === 'function') ok("normalizeSpecIso('42RH') = 45R1", U.normalizeSpecIso('42RH') === '45R1', U.normalizeSpecIso('42RH'));
  if (typeof U.isoConflictOf === 'function') { const c = U.isoConflictOf('45R8', { iso_carrier: '42RH' }); ok('isoConflictOf(45R8 vs 42RH) — 불일치 아님', !c || c.conflict === false || c === null || c.kind === 'ok', JSON.stringify(c).slice(0, 120)); }

  console.log('■ ⑤ 배선 — key · unsub · SW 범위 · 엠티실 «바꾸는 칸만»');
  ok('VoyagePage 가 ContainerDetailModal 에 key={detailC.cn} 을 준다', /<ContainerDetailModal\s+key=\{detailC\.cn\}/.test(src('src/pages/VoyagePage.jsx')));
  ok('fbSubscribeShipPolicies 가 unsub 을 돌려준다(off(r) 아님)', /return unsub;/.test(src('src/shipPolicies.js')) && !/return \(\) => off\(r\);/.test(src('src/shipPolicies.js')));
  ok("cone.html 이 SW 를 scope: location.pathname 으로 등록한다", /register\('cone-sw\.js',\s*\{\s*scope:\s*location\.pathname\s*\}\)/.test(src('public/cone.html')));
  ok('cone.html hardRefresh 가 검수앱 등록·캐시를 안 지운다', /indexOf\('cone\.html'\)>=0\) await rs\[i\]\.unregister/.test(src('public/cone.html')) && /indexOf\('cone-'\)===0\) await caches\.delete/.test(src('public/cone.html')));
  const cdm = src('src/components/ContainerDetailModal.jsx');
  ok('컨 상세 fbSetEmptySeal 호출부에 스냅샷 세 칸 넘기기가 없다', !/fbSetEmptySeal\([^)]*\{\s*\n\s*eseal: c\.eseal/.test(cdm) && (cdm.match(/fbSetEmptySeal\(/g) || []).length >= 6);

  console.log(`\n3.60-03 연막검사 ${n - bad}/${n} 통과`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 폴더 */ }
  if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
})().catch((e) => { console.error('✗ 검사 중 오류:', e && e.stack || e); process.exit(1); });
