// 3.60-08 연막검사 — 기존 records 를 못 읽으면 리스트 저장이 멈추는가(현장 기록 통째 덮기 금지, 진단 T8). 실소스 + 메모리 스텁 Firebase.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36008_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = { addEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = { addEventListener() {}, createElement: () => ({ style: {} }), documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
global.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
(async () => {
  try {
    const O = path.join(TMP, 'fb.cjs'), stub = './tools/stub_fbdb_mem.js';
    execSync(`npx esbuild src/firebase.js --bundle --platform=node --format=cjs --log-level=error --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --outfile="${O}"`, { cwd: ROOT, stdio: 'pipe' });
    const FB = require(O);
    execSync(`npx esbuild src/utils.js --bundle --platform=node --format=cjs --log-level=error --loader:.png=dataurl --external:firebase --external:firebase/* --outfile="${path.join(TMP, 'u.cjs')}"`, { cwd: ROOT, stdio: 'pipe' });
    const src = fs.readFileSync(path.join(ROOT, 'src/firebase.js'), 'utf8');
    ok('읽기 실패 갈래가 «병합 없이 저장» 이 아니라 멈춘다(throw)', /기존 리스트를 못 읽어 저장을 멈췄어요/.test(src) && !/병합 없이 저장합니다/.test(src));
    global.__memdb = { voyages: { V1: { loading: { records: { AAAU0000001: { cn: 'AAAU0000001', sl: 'S1', eseal: '123456', memo: '현장 비고' } } } } } };
    await FB.fbSaveListRecords('V1', 'loading', { AAAU0000001: { cn: 'AAAU0000001', sl: 'S1' }, AAAU0000002: { cn: 'AAAU0000002' } });
    const r = global.__memdb.voyages.V1.loading.records;
    ok('정상 읽기면 종전대로 병합 — 현장 칸(엠티실·비고)이 남고 새 컨이 들어온다', r.AAAU0000001 && r.AAAU0000001.eseal === '123456' && r.AAAU0000001.memo === '현장 비고' && !!r.AAAU0000002, JSON.stringify(r).slice(0, 160));
    //  실제 갈래를 돌린다 — 스텁 get 이 «Client is offline» 을 던지게 하고 저장을 부른다.
    global.__memlog = [];
    const before = JSON.stringify(global.__memdb);
    global.__memfail = (p) => /^voyages\/V1\/loading\/records$/.test(p);
    let msg = '';
    try { await FB.fbSaveListRecords('V1', 'loading', { AAAU0000003: { cn: 'AAAU0000003' } }); } catch (x) { msg = String(x && x.message); }
    global.__memfail = null;
    ok('기존 records 를 못 읽으면 저장하지 않고 멈춘다 — 현장 기록 그대로 · records 쓰기 0', /저장을 멈췄어요/.test(msg) && JSON.stringify(global.__memdb) === before && !global.__memlog.some((l) => /records/.test(l.path)), msg || JSON.stringify(global.__memlog).slice(0, 160));
    ok('멈춘 까닭(원래 오류)을 글에 싣는다', /원인 Client is offline/.test(msg), msg);

    //  실물 자리 쓰기 — 이력을 못 읽었으면 moves 를 한 줄짜리로 덮지 않는다(좌표는 적는다).
    const mv0 = [{ at: 1, by: 'A', why: 'actual', from: '', to: '13-06-04', byCn: '' }, { at: 2, by: 'A', why: 'actual', from: '13-06-04', to: '13-08-04', byCn: '' }];
    global.__memdb.voyages.V1.loading.records.MOVE0000001 = { cn: 'MOVE0000001', bay_actual: '13', row_actual: '08', tier_actual: '04', moves: mv0 };
    global.__memfail = (p) => /^voyages\/V1\/loading\/records\/MOVE0000001$/.test(p);
    await FB.fbSetActualPosition('V1', 'loading', 'MOVE0000001', '15', '02', '82', '검수원B');
    global.__memfail = null;
    const m1 = global.__memdb.voyages.V1.loading.records.MOVE0000001;
    ok('읽기 실패여도 실물 자리는 적는다 · 지나온 자리(moves 2줄)는 그대로', m1.bay_actual === '15' && Array.isArray(m1.moves) && m1.moves.length === 2, JSON.stringify(m1).slice(0, 160));
    //  자리 지우기는 이력을 못 읽으면 **지우지 않는다** — moves 없이 지우면 «지웠다» 표식(why:'cancel')이 없어 CATOS 가 되살린다(감사 재판정).
    global.__memfail = (p) => /^voyages\/V1\/loading\/records\/MOVE0000001$/.test(p);
    let cmsg = '';
    try { await FB.fbClearActualPosition('V1', 'loading', 'MOVE0000001', '검수원B'); } catch (x) { cmsg = String(x && x.message); }
    global.__memfail = null;
    const m2 = global.__memdb.voyages.V1.loading.records.MOVE0000001;
    ok('자리 지우기 — 이력을 못 읽으면 멈춘다 · 자리·moves 2줄 그대로', /지우지 않았어요/.test(cmsg) && m2.bay_actual === '15' && m2.moves.length === 2, cmsg + ' ' + JSON.stringify(m2).slice(0, 120));
    await FB.fbSetActualPosition('V1', 'loading', 'MOVE0000001', '17', '04', '82', '검수원C');
    const m3 = global.__memdb.voyages.V1.loading.records.MOVE0000001;
    ok('정상 읽기면 종전대로 한 줄 덧붙인다(3줄)', m3.moves.length === 3 && m3.moves[2].to === '17-04-82', JSON.stringify(m3.moves).slice(-120));
    await FB.fbClearActualPosition('V1', 'loading', 'MOVE0000001', '검수원C');
    const m4 = global.__memdb.voyages.V1.loading.records.MOVE0000001;
    ok('정상 지우기 — 자리 걷고 마지막 줄 why:cancel(4줄)', !m4.bay_actual && m4.moves.length === 4 && m4.moves[3].why === 'cancel', JSON.stringify(m4.moves).slice(-120));
    //  지운 자리는 CATOS 가 되살리지 않는다(utils.applyCatosPos 가 마지막 줄 cancel 을 본다)
    const U = require(path.join(TMP, 'u.cjs'));
    const vv = { loading: { records: { MOVE0000001: m4 }, termWork: { MOVE0000001: { pos: '220482', at: Date.now() } } } };
    const ap = U.applyCatosPos(vv);
    const r5 = ((ap.loading || {}).records || {}).MOVE0000001 || {};
    ok('지운 자리는 CATOS 로 되살아나지 않는다', !r5.bay_actual, JSON.stringify(r5).slice(0, 120));
    const CDM = fs.readFileSync(path.join(ROOT, 'src/components/ContainerDetailModal.jsx'), 'utf8');
    ok('컨 상세 «수정 위치 삭제» 실패를 말한다(조회만 막힘은 띠가 알린다)', /try \{ await fbClearActualPosition\(voyageKey, mode, c\.cn\); \}\s*catch \(e\) \{ if \(!e\?\.viewOnly\) alert\('수정 위치 삭제 실패/.test(CDM));

    const VP = fs.readFileSync(path.join(ROOT, 'src/pages/VoyagePage.jsx'), 'utf8');
    ok('충돌 해결 저장 실패를 말한다 — 상태 글 + 알림(검토 창에 안 가려지게)', /try \{ await fbSaveListRecords\(voyageKey, mode, finalMap\); \}\s*catch \(e\) \{\s*const _m = `❌ 리스트 저장 실패[^`]*`;\s*setStatus\(_m\); alert\(_m/.test(VP));
    ok('충돌 해결은 컨 기록을 제자리에서 고치지 않는다(다시 누를 때 앞 선택이 남지 않게)', !/finalMap\[a\.cn\]\.(wt|sl) =/.test(VP) && /finalMap\[a\.cn\] = \{ \.\.\.finalMap\[a\.cn\], wt: a\.ediW \}/.test(VP));
  } catch (ex) { bad += 1; console.log('  ✘ 검사 중 오류 — ' + (ex && ex.stack || ex)); }
  console.log(`\n3.60-08 연막검사 ${n - bad}/${n} 통과`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e2) { /* 임시 */ }
  if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
})();
