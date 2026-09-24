// 3.60-09 연막검사 — 사람이 이미 완료한 컨을 덮지 않는가(진단 T10, 쓰기는 set 그대로) · 항차 삭제 확인에 완료 기록 수를 말하는가(T11). 실소스 + 메모리 스텁 Firebase.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36009_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const notices = [];
global.window = { addEventListener() {}, dispatchEvent(ev) { if (ev && ev.type === 'writeNotice') notices.push(ev.detail && ev.detail.message); return true; }, location: { href: '' } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = { addEventListener() {}, createElement: () => ({ style: {} }), documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
global.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
(async () => {
  try {
    const O = path.join(TMP, 'fb.cjs'), stub = './tools/stub_fbdb_mem.js';
    execSync(`npx esbuild src/firebase.js --bundle --platform=node --format=cjs --log-level=error --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --outfile="${O}"`, { cwd: ROOT, stdio: 'pipe' });
    const FB = require(O);
    global.__memdb = { voyages: { V1: { discharge: { completed: {} } } } };
    const comp = () => global.__memdb.voyages.V1.discharge.completed;

    console.log('■ T10 — 사람이 이미 완료한 컨은 덮지 않는다(쓰기는 종전 set)');
    const r1 = await FB.fbCompleteContainer('V1', 'discharge', 'AAAU0000001', '검수원A', 'normal', '', '1호기');
    ok('처음 완료는 종전과 같은 기록(by·at·equip)', r1 && r1.ok === true && comp().AAAU0000001.by === '검수원A' && comp().AAAU0000001.equip === '1호기' && !!comp().AAAU0000001.at, JSON.stringify(comp().AAAU0000001));
    const at1 = comp().AAAU0000001.at;
    const r2 = await FB.fbCompleteContainer('V1', 'discharge', 'AAAU0000001', '검수원B', 'normal', '', '2호기');
    ok('다른 기기가 같은 컨을 다시 완료해도 먼저 한 기록(by·equip·at)이 남는다', comp().AAAU0000001.by === '검수원A' && comp().AAAU0000001.equip === '1호기' && comp().AAAU0000001.at === at1, JSON.stringify(comp().AAAU0000001));
    ok('두 번째 부름은 «이미 완료» 와 앞 기록을 돌려준다', r2 && r2.already === true && r2.prev && r2.prev.by === '검수원A', JSON.stringify(r2));
    ok('띠로 알린다(누가 했는지 · 덮지 않았다)', notices.some((m) => /0001 는 이미 완료돼 있어요 — 검수원A/.test(m) && /덮지 않았어요/.test(m)), JSON.stringify(notices));
    await FB.fbCompleteContainer('V1', 'discharge', 'AAAU0000001', '검수원C', 'missing', '선박에 없음', '1호기');
    ok('누락 완료도 정상 완료를 덮지 않는다', comp().AAAU0000001.by === '검수원A' && !comp().AAAU0000001.flag, JSON.stringify(comp().AAAU0000001));
    await FB.fbCancelComplete('V1', 'discharge', 'AAAU0000001', { by: '검수원A' });
    ok('완료 취소는 종전대로 기록을 지운다', !comp() || !comp().AAAU0000001, JSON.stringify(comp()));
    await FB.fbCompleteContainer('V1', 'discharge', 'AAAU0000001', '검수원B', 'normal', '', '2호기');
    ok('취소 뒤에는 다시 완료할 수 있다(검수원B)', comp().AAAU0000001 && comp().AAAU0000001.by === '검수원B', JSON.stringify(comp().AAAU0000001));
    //  터미널 반영(src:'term')은 사람이 아니다 — 사람 완료가 덮는다(종전과 같음, 감사 지적)
    comp().TERM0000001 = { by: '', src: 'term', at: 1, equip: '2호기' };
    await FB.fbCompleteContainer('V1', 'discharge', 'TERM0000001', '검수원D', 'normal', '', '1호기');
    ok('터미널 반영 기록은 사람 완료가 덮는다', comp().TERM0000001.by === '검수원D' && !comp().TERM0000001.src, JSON.stringify(comp().TERM0000001));
    //  읽기가 안 되면(캐시 없음·오류) 종전대로 쓴다 — 완료를 막지 않는다
    global.__memfail = (p) => /completed\/READ0000001$/.test(p);
    const r3 = await FB.fbCompleteContainer('V1', 'discharge', 'READ0000001', '검수원E', 'normal', '', '1호기');
    global.__memfail = null;
    ok('지금 값을 못 읽어도 완료는 종전대로 쓴다', r3 && r3.ok === true && comp().READ0000001 && comp().READ0000001.by === '검수원E', JSON.stringify(r3));
    const F = src('src/firebase.js');
    const body = F.split('export async function fbCompleteContainer(')[1].split('\nexport ')[0];
    const gate = body.indexOf('if (prev && !isTermApplied(prev))');
    ok('개인 실적·실린 자리 확정은 실제로 쓴 뒤에만(이미 완료면 부르지 않는다)', gate > 0 && body.indexOf('_tallyInspector(') > gate && body.indexOf('_markLoadedPos(') > gate && body.indexOf('await set(r, rec);') > gate);
    ok('완료 쓰기에 transaction 을 쓰지 않는다(전송 뒤 끊기면 버림 — 감사 실측)', !/runTransaction/.test(F));

    console.log('■ T10 — 초과 컨이 정상 완료를 덮지 않는다');
    let msg = '';
    try { await FB.fbAddExtraContainer('V1', 'discharge', 'AAAU0000001', '검수원C', { size: '20', fe: 'F', ctype: '일반', damage: '없음' }, '1호기'); } catch (x) { msg = String(x && x.message); }
    ok('이미 완료된 컨을 초과로 올리면 멈추고 까닭을 말한다', /이미 완료 기록이 있는 컨이에요/.test(msg) && comp().AAAU0000001.by === '검수원B' && !comp().AAAU0000001.flag && !(global.__memdb.voyages.V1.discharge.extras || {}).AAAU0000001, msg + ' ' + JSON.stringify(comp().AAAU0000001));
    await FB.fbAddExtraContainer('V1', 'discharge', 'XTRA0000009', '검수원C', { size: '20', fe: 'F', ctype: '일반', damage: '없음' }, '1호기');
    ok('처음 보는 컨은 종전대로 초과 기록(completed·extras 둘 다)', comp().XTRA0000009 && comp().XTRA0000009.flag === 'extra' && global.__memdb.voyages.V1.discharge.extras.XTRA0000009.flag === 'extra');
    await FB.fbAddExtraContainer('V1', 'discharge', 'XTRA0000009', '검수원C', { size: '40HC', fe: 'E', ctype: '일반', damage: '없음' }, '1호기');
    ok('앞서 적은 초과는 고쳐 적을 수 있다', comp().XTRA0000009.size === '40HC' && global.__memdb.voyages.V1.discharge.extras.XTRA0000009.size === '40HC');
    comp().TERM0000002 = { by: '', src: 'term', at: 1 };
    await FB.fbAddExtraContainer('V1', 'discharge', 'TERM0000002', '검수원C', { size: '20', fe: 'F', ctype: '일반', damage: '없음' }, '1호기');
    ok('터미널 반영만 된 리스트 밖 컨은 초과로 적힌다(감사 지적)', comp().TERM0000002.flag === 'extra' && !!global.__memdb.voyages.V1.discharge.extras.TERM0000002);
    ok('초과 컨 창이 까닭을 그대로 보인다', /alert\('기록 실패: ' \+ \(e\?\.message \|\| '신호를 확인하세요\.'\)\)/.test(src('src/components/ExtraContainerModal.jsx')));
    ok('App 띠가 writeNotice 도 받는다', /addEventListener\('writeNotice', h\)/.test(src('src/App.jsx')) && /removeEventListener\('writeNotice', h\)/.test(src('src/App.jsx')));

    console.log('■ T11 — 항차 삭제 확인에 완료 기록 수');
    const H = src('src/pages/HomePage.jsx');
    ok('삭제 대상에 양하·선적 완료 수를 싣는다', /const doneD = Object\.keys\(v\?\.discharge\?\.completed \|\| \{\}\)\.length;/.test(H) && /setDeleteTarget\(\{ key, vsl, voy, hasD, hasL, doneD, doneL \}\)/.test(H));
    ok('확인 단계가 지울 쪽 완료 수를 말한다(0 이면 안 띄움)', /const doneN = confirming === 'discharge' \? doneD : confirming === 'loading' \? doneL : doneD \+ doneL;/.test(H) && /\{doneN > 0 && \(/.test(H) && /완료 기록 \{doneN\}대가 있습니다/.test(H));
  } catch (ex) { bad += 1; console.log('  ✘ 검사 중 오류 — ' + (ex && ex.stack || ex)); }
  console.log(`\n3.60-09 연막검사 ${n - bad}/${n} 통과`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e2) { /* 임시 */ }
  if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
})();
