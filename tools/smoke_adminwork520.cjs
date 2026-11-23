// 5.20 연막검사 — 관리자 작업 선박(미르 호기 검수원 등록 한 벌): 등록된 배 화면에서만 작업자이면서 관리자, 다른 배는 관리자뿐 · 헤더 관리자 칩 없음 · 보고 창 [N호기] 등록하고 시작.
//   검수사 2026-11-22 14:58 «관리자 모드로 되어있어서 작업시작 셋팅을 다시 하는 경우가 다반사 입니다» · 15:01 «관리자가 작업 시작을 누르면 작업자이면서 관리자가 되어야 합니다» ·
//   15:03 «다만 관리자가 작업할 선박이 아닌경우에는 작업자가 아닌 관리자 모드여만 하고 관리자는 본인이 작업할 선박을 호기를 미르에게 통보합니다» · 15:06 «아 헤더에서 관리자는 뺴주세요» «그냥 다른 검수원과 동일하게»
//   실자료 — PCSZ_2635E info.craneCrew «11-21 야간» 1호기 김성일 · 2호기 이종부 / «11-21 주간» 1호기 박진우 · 2호기 이형출.
const fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');
process.env.TZ = 'Asia/Seoul';
const ROOT = path.resolve(process.argv[2] || process.cwd());
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'aw520_'));
let n = 0, bad = 0;
const ok = (name, cond, d = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${d ? ' — ' + d : ''}`); } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = global.localStorage || { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
fs.writeFileSync(e, `export { adminWorkOf, effectiveWorkChoice, setActiveWorkChoice, canRecordWorkNow, canWorkNow, isAdminNow, isAdminWorkingNow, myWorkVoyageNow, recordGateText, inspectorsSeenBy, setAdminWorkReg, adminWorkRegNow } from "${ROOT}/src/workChoice.js";\n`);
execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
const B = require(o);
const V = JSON.parse(rd('tools/fixtures/adminwork520_pcsz.json'));
const T = (s) => new Date(s + '+09:00').getTime();
const night = T('2026-11-21T22:00:00'), day22 = T('2026-11-22T15:04:00'), day21 = T('2026-11-21T10:00:00'), dawn = T('2026-11-22T05:00:00');
const aw = B.adminWorkOf('김성일', V, night);
ok('11-21 22:00 — 김성일 작업 선박 PCSZ_2635E · 1호기 · 야간', aw && aw.voyageKey === 'PCSZ_2635E' && aw.equip === '1호기' && aw.shift === 'night' && aw.shiftKey === '11-21 야간', JSON.stringify(aw));
ok('11-22 05:00(같은 야간조) — 그대로 PCSZ 1호기', (B.adminWorkOf('김성일', V, dawn) || {}).equip === '1호기');
ok('11-22 15:04(이 조 등록 없음) — 작업 선박 없음', B.adminWorkOf('김성일', V, day22) === null);
ok('11-21 10:00 주간조(박진우·이형출) — 김성일 작업 선박 없음', B.adminWorkOf('김성일', V, day21) === null);
ok('관리자가 아닌 사람(이종부)은 이 판정을 쓰지 않는다', B.adminWorkOf('이종부', V, night) === null);
const admin = { name: '김성일', mode: 'admin', voyageKey: '', equip: '' };
const onIt = B.effectiveWorkChoice(admin, aw, 'PCSZ_2635E'), other = B.effectiveWorkChoice(admin, aw, 'MCAT_645N');
B.setActiveWorkChoice(onIt);
ok('작업 선박 화면 — 작업자이면서 관리자(기록 됨 · 쓰기 열림 · 내 작업 선박 PCSZ)', B.canRecordWorkNow() && B.canWorkNow() && B.isAdminWorkingNow() && B.myWorkVoyageNow() === 'PCSZ_2635E' && onIt.equip === '1호기');
B.setActiveWorkChoice(other);
ok('다른 배 화면 — 관리자뿐(기록 안 됨 · 쓰기 열림)', !B.canRecordWorkNow() && B.canWorkNow() && B.isAdminNow() && !B.isAdminWorkingNow());
ok('막는 안내 — [N호기로 등록하고 시작] · 헤더 관리자 안내 없음', /N호기로 등록하고 시작/.test(B.recordGateText('완료')) && !/\[🛠 관리자\]/.test(B.recordGateText('완료')));
ok('작업자로 고른 사람(관리자 아님)은 그대로', B.effectiveWorkChoice({ name: '박진우', mode: 'work', voyageKey: 'X', equip: '2호기' }, aw, 'PCSZ_2635E').voyageKey === 'X');
//  감사 5.20 지적 — 같은 배 호기 바꿔 재등록 · 두 배 등록 · 주야 없는 배 조 사이 등록
const at = (h) => T('2026-11-22T' + h + ':00');
const V2 = { PCSZ_2635E: { info: { vsl: 'PCSZ', craneCrew: { '11-22 주간': { '1호기': { name: '김성일', at: at('08:10') }, '3호기': { name: '김성일', at: at('11:00') } } } } } };
ok('같은 배 1호기 → 3호기로 다시 등록 — 나중 칸 3호기', (B.adminWorkOf('김성일', V2, at('11:30')) || {}).equip === '3호기', JSON.stringify(B.adminWorkOf('김성일', V2, at('11:30'))));
const V3 = { A_1: { info: { vsl: 'PCSZ', craneCrew: { '11-22 주간': { '1호기': { name: '김성일', at: at('10:00') } } } } }, B_1: { info: { vsl: 'MCAT', craneCrew: { '11-22 주간': { '2호기': { name: '김성일', at: at('08:30') }, '3호기': { name: '박진우', at: at('11:00') } } } } } };
ok('두 배 등록 — 내 칸 시각으로 나중 배(A) · 남의 등록 시각에 끌려가지 않음', (B.adminWorkOf('김성일', V3, at('11:30')) || {}).voyageKey === 'A_1');
const V4 = { OBWH_1: { info: { vsl: 'OBWH', craneCrew: { '11-22 야간': { '2호기': { name: '김성일', at: at('17:40') } } } } } };
ok('주야 없는 배 17:41 — 막 한 등록이 바로 든다', (B.adminWorkOf('김성일', V4, at('17:41')) || {}).equip === '2호기');
B.setAdminWorkReg(aw); B.setActiveWorkChoice(other);
ok('다른 배·홈 화면에서도 등록은 살아 있다(활동 기록 workMode work 유지 근거)', (B.adminWorkRegNow() || {}).voyageKey === 'PCSZ_2635E');
B.setActiveWorkChoice({ name: '박진우', mode: 'work', voyageKey: 'X', equip: '2호기' });
ok('일반 작업자에게는 관리자 등록 캐시가 쓰이지 않음', B.adminWorkRegNow() === null);
B.setAdminWorkReg(null);
const fbs = rd('src/firebase.js'), aws0 = rd('src/components/AdminWorkStart.jsx'), app0 = rd('src/App.jsx');
ok('활동 기록 — 등록 있으면 조회로 덮지 않고 자리 기록은 등록 배에서만', /const viewOnly = isNotWorkerNow\(\) && !_aReg;/.test(fbs) && /myWorkVoyageNow\(\) \|\| \(_aReg \? String\(_aReg\.voyageKey\)/.test(fbs));
ok('기기 호기 맞춤은 등록(배·호기)이 바뀔 때만', /\}, \[awEqSig\]\);/.test(app0));
ok('보고 창 단추 — 남이 등록한 호기는 막음 · 서버 시각 조 키 · 성공 뒤 단추 풀고 안내', /disabled=\{!!busy \|\| other\}/.test(aws0) && /crewShiftKey\(undefined, serverNow\(\), 0\)/.test(aws0) && /setBusy\(0\); setDone\(/.test(aws0));
ok('보고 창 단추 — 그 배 화면이 아니면(수석 상황판·검색 컨 상세) 등록 단추 대신 배 화면 열기', /r\.name === 'voyage' && r\.voyageKey === voyageKey/.test(aws0) && /data-admin-work-offship/.test(aws0) && /이 배 화면 열기/.test(aws0));
//  관리자 투명(15:08~15:11) — 호기를 넣지 않은 소유자는 다른 검수원 명단에서 빠지고, 소유자·클로드는 다 본다
const INS = { '김성일': { name: '김성일', loggedIn: true, lastActive: 1, workMode: 'view', assignVoyage: '', assignEquip: '' }, '박진우': { name: '박진우', loggedIn: true, workMode: 'work', assignVoyage: 'PCSZ_2635E', assignEquip: '2호기' }, '클로드': { name: '클로드', loggedIn: true, workMode: 'view' } };
ok('다른 검수원(박진우) 화면 — 관리자로 보는 김성일 줄 없음', !('김성일' in B.inspectorsSeenBy(INS, '박진우')) && ('박진우' in B.inspectorsSeenBy(INS, '박진우')));
ok('로그인 전(보는 사람 모름) — 김성일 줄 없음', !('김성일' in B.inspectorsSeenBy(INS, '')));
ok('김성일·클로드 화면 — 다 보임', ('김성일' in B.inspectorsSeenBy(INS, '김성일')) && ('김성일' in B.inspectorsSeenBy(INS, '클로드')));
const INS2 = { ...INS, '김성일': { ...INS['김성일'], workMode: 'work', assignVoyage: 'PCSZ_2635E', assignEquip: '1호기' } };
ok('김성일이 호기를 넣으면(작업자) 다른 검수원에게 보임', '김성일' in B.inspectorsSeenBy(INS2, '박진우'));
ok('App — 화면마다 넘기는 명단은 inspectorsView(소유자 투명 문지기) · 날 명단 직접 전달 0', /inspectorsSeenBy\(inspectors, inspector(, ownerDevice)?\)/.test(rd('src/App.jsx')) && !/inspectors=\{inspectors\}/.test(rd('src/App.jsx')));
//  소스 — 헤더·App·보고 창·명단
const hd = rd('src/components/Header.jsx'), app = rd('src/App.jsx'), wr = rd('src/components/WorkReportModal.jsx'), pr = rd('src/components/PhotoReportModal.jsx'), aws = rd('src/components/AdminWorkStart.jsx');
ok('헤더 — 관리자 칩 없음(data-work-mode="admin" 0) · 다른 검수원과 같은 [변경]', !/data-work-mode="admin"/.test(hd) && /workChoice && workChoice\.mode === 'work' && onChangeWork/.test(hd));
ok('App — 문지기 캐시를 렌더 중에 effChoice 로 세우고 헤더에 effChoice', /setActiveWorkChoice\(effChoice\); setAdminWorkReg\(adminWork\);\n/.test(app) && /workChoice=\{effChoice\}/.test(app) && /adminWorkOf\(inspector, voyagesAll\)/.test(app));
ok('App — 명단은 작업 선박이 있으면 work(배·호기·조), 없어지면 admin', /fbSetInspectorChoice\(inspector, adminWork \? \{ mode: 'work', voyageKey: adminWork\.voyageKey, equip: adminWork\.equip, shift: adminWork\.shift \} : \{ mode: 'admin' \}\)/.test(app));
ok('보고 두 창 — 관리자면 [N호기] 등록하고 시작(AdminWorkStart) · 미르 등록과 같은 저장', /isAdminNow\(\) && <AdminWorkStart/.test(wr) && /isAdminNow\(\) && <AdminWorkStart/.test(pr) && /fbSetVoyageCraneCrew\(voyageKey, sk, \[\{ no, name: me \}\]\)/.test(aws));
console.log(`\n5.20 관리자 작업 선박 연막검사 — ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
