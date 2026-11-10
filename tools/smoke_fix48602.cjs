// 4.86-02 연막검사 — 정밀 검토(2026-11-10) 일괄 수리. 실 OBWH 2787E 보관본(2788W 선적) 위에
//   ① 묶음 완료는 사람이 이미 완료한 컨을 덮지 않는다(완료자·호기 그대로 · 나머지만 쓴다 · 터미널 반영분은 덮는다)
//   ② 완료 취소가 완료 삭제 뒤 자리 원복에서 끊기면 «반쯤 취소» 를 답한다 ③ 교대는 다른 사람이 이미 이어받은 호기를 덮지 않는다
//   ④ 해치 표시는 한 칸만 쓴다(다른 해치 표시가 남는다 · 조회만은 막힌다) ⑤ 서버 확인이 늦어도 완료 호출은 8초 안팎에 돌아온다
//   ⑥ 마감텔리 시프팅 계산 실패는 빈 목록에 표시를 단다
//   실행 — node tools/smoke_fix48602.cjs [저장소 루트]. 실패하면 빌드를 세운다.
'use strict';
process.env.TZ = 'Asia/Seoul';
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { execSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + String(detail).slice(0, 300) : ''}`); } };
const clone = (o) => JSON.parse(JSON.stringify(o));
const store = {};
const notices = [];
global.window = { addEventListener() {}, dispatchEvent(e) { if (e && e.type === 'writeNotice') notices.push(e.detail.message); return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
global.fetch = () => Promise.reject(new Error('no net'));
console.warn = () => {};
(async () => {
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx48602_'));
  const stub = './tools/stub_fbdb_mem.js';
  const aliasFb = `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub}`;
  const out = path.join(TMP, 'u.cjs');
  execSync(`npx esbuild "${path.join(ROOT, 'tools/smoke_fix48602_entry.js')}" --bundle --platform=node --format=cjs --outfile="${out}" --loader:.js=jsx --jsx=automatic --log-level=error ${aliasFb}`, { cwd: ROOT, stdio: 'pipe' });
  const U = require(out);
  const base = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'tools/fixtures/relabel484_obwh.json.gz'))));
  const K = 'OBWH_2787E';
  const seed = () => { const v = clone(base); global.__memdb = { voyages: { [K]: v } }; global.__memlog = []; notices.length = 0; return v; };
  U.setActiveWorkChoice({ name: '김검수', ymd: '2026-11-10', mode: 'work', voyageKey: K, equip: '2호기', at: Date.now() });
  store.gm_equip_no = '2호기';
  const at = (p) => p.split('/').reduce((o, k) => (o == null ? o : o[k]), global.__memdb);

  // ① 묶음 완료 보호
  let v = seed();
  const sec = v.loading;
  const human = Object.entries(sec.completed).find(([, r]) => r.by && !U.isAutoDone(r));
  const term = Object.entries(sec.completed).find(([, r]) => U.isAutoDone(r));
  //  보관본은 전부 완료된 항차라, 사람 완료 두 대의 완료 기록을 지워 «아직 안 한 컨» 으로 만든다
  const fresh = Object.entries(sec.completed).filter(([cn, r]) => r.by && !U.isAutoDone(r) && cn !== human[0]).slice(0, 2).map(([cn]) => cn);
  for (const cn of fresh) delete global.__memdb.voyages[K].loading.completed[cn];
  ok('표본 — 사람 완료·터미널 반영·미완료 컨이 보관본에 있다', !!human && fresh.length === 2, `${!!human} ${!!term} ${fresh.length}`);
  const before = clone(human[1]);
  const r1 = await U.fbCompleteContainersAtomic(K, 'loading', [human[0], fresh[0]], '김검수', '2호기');
  const after = at(`voyages/${K}/loading/completed/${human[0]}`);
  ok('이미 사람이 완료한 컨은 덮지 않는다(완료자·시각·호기 그대로)', JSON.stringify(after) === JSON.stringify(before), JSON.stringify(after));
  ok('같이 누른 미완료 컨은 완료된다', (at(`voyages/${K}/loading/completed/${fresh[0]}`) || {}).by === '김검수' && r1 && r1.ok && r1.done.length === 1 && r1.skipped[0] === human[0], JSON.stringify(r1));
  ok('덮지 않았다고 화면에 알린다', notices.some((m) => m.includes('이미 완료') && m.includes(human[0].slice(-4))), notices.join('|'));
  notices.length = 0;
  const r2 = await U.fbCompleteContainersAtomic(K, 'loading', [human[0]], '김검수', '2호기');
  ok('전부 이미 완료면 아무것도 쓰지 않는다', r2 && r2.ok === false && r2.already === true && JSON.stringify(at(`voyages/${K}/loading/completed/${human[0]}`)) === JSON.stringify(before));
  if (term) {
    await U.fbCompleteContainersAtomic(K, 'loading', [term[0], fresh[1]], '김검수', '2호기');
    ok('터미널 반영분(사람 아님)은 사람 완료가 덮는다(종전과 같음)', (at(`voyages/${K}/loading/completed/${term[0]}`) || {}).by === '김검수');
  }
  v = seed();
  const two = Object.entries(v.loading.completed).filter(([, r]) => r.by && !U.isAutoDone(r)).slice(0, 2).map(([cn]) => cn);
  for (const cn of two) delete global.__memdb.voyages[K].loading.completed[cn];
  const r3 = await U.fbCompleteContainersAtomic(K, 'loading', two, '김검수', '2호기');
  const wr = global.__memlog.filter((l) => l.op === 'update' && l.path === '');
  ok('미완료 두 대는 한 번의 묶음 쓰기로 둘 다 완료된다', r3.ok && r3.done.length === 2 && two.every((cn) => (at(`voyages/${K}/loading/completed/${cn}`) || {}).equip === '2호기') && wr.length >= 1, `${JSON.stringify(r3)} upd ${wr.length}`);

  // ② 완료 취소 — 완료 삭제 뒤 끊김
  v = seed();
  const hc = Object.entries(v.loading.completed).find(([cn, r]) => r.by && !U.isAutoDone(r) && v.loading.records && v.loading.records[cn]);
  if (hc) {
    let gets = 0;
    global.__memfail = (p) => { gets += 1; return gets > 1; };   // 첫 읽기(기록)만 되고 그 뒤는 끊긴다
    const rc = await U.fbCancelComplete(K, 'loading', hc[0], { by: '김검수' });
    global.__memfail = null;
    const gone = !at(`voyages/${K}/loading/completed/${hc[0]}`);
    ok('완료는 지워졌는데 자리 원복에서 끊기면 «반쯤 취소» 로 답한다', rc.ok === false && gone && rc.completedRemoved === true && /완료는 취소됐지만/.test(rc.error), JSON.stringify(rc) + ' gone=' + gone);
    ok('반쯤 취소를 화면에 알린다', notices.some((m) => m.includes('자리 원복')), notices.join('|'));
  } else ok('완료 취소 표본', false, '사람 완료 + 기록이 있는 컨이 보관본에 없다');

  // ③ 교대 — 이미 다른 사람이 이어받은 호기
  v = seed();
  global.__memdb.voyages[K].info = { ...(global.__memdb.voyages[K].info || {}), craneCrew: { day: { '2호기': { name: '이선임', at: 1 } } } };
  let e3 = '';
  try { await U.fbRelieveCrane(K, 'day', '2호기', '박진우', '김검수'); } catch (e) { e3 = String(e.message || e); }
  ok('화면이 본 보유자(박진우)가 아닌 사람(이선임)이 쥐고 있으면 덮지 않는다', /이선임/.test(e3) && at(`voyages/${K}/info/craneCrew/day/2호기`).name === '이선임', e3);
  global.__memdb.voyages[K].info.craneCrew.day['2호기'] = { name: '박진우', at: 1 };
  const eq = await U.fbRelieveCrane(K, 'day', '2호기', '박진우', '김검수');
  ok('보유자가 그대로면 종전대로 교대된다', eq === '2호기' && at(`voyages/${K}/info/craneCrew/day/2호기`).name === '김검수');

  // ④ 해치 표시 한 칸
  v = seed();
  global.__memdb.voyages[K].info = { ...(global.__memdb.voyages[K].info || {}), hatchDone: { 10: 'open' } };
  await U.fbUpdateVoyageInfo(K, { 'hatchDone/18': 'close' });
  const hd = at(`voyages/${K}/info/hatchDone`);
  ok('한 칸 경로로 쓰면 다른 해치 표시가 남는다', hd && hd[10] === 'open' && hd[18] === 'close', JSON.stringify(hd));
  U.setActiveWorkChoice({ name: '김검수', ymd: '2026-11-10', mode: 'view', voyageKey: K, at: Date.now() });
  let e4 = '';
  try { await U.fbUpdateVoyageInfo(K, { 'hatchDone/20': 'open' }); } catch (e) { e4 = String(e.message || e); }
  ok('조회만은 한 칸 경로도 막힌다(문지기 한 벌)', !!e4 && !(at(`voyages/${K}/info/hatchDone`) || {})[20], e4);
  U.setActiveWorkChoice({ name: '김검수', ymd: '2026-11-10', mode: 'work', voyageKey: K, equip: '2호기', at: Date.now() });

  // ⑤ 서버 확인이 늦을 때
  v = seed();
  const one = Object.entries(v.loading.completed).find(([, r]) => r.by && !U.isAutoDone(r))[0];
  delete global.__memdb.voyages[K].loading.completed[one];
  global.__memlag = 12000;
  const t0 = Date.now();
  const r5 = await U.fbCompleteContainer(K, 'loading', one, '김검수', 'normal', '', '2호기');
  const took = Date.now() - t0;
  global.__memlag = 0;
  ok('서버 확인이 12초 걸려도 완료 호출은 8초 안팎에 돌아온다', r5 && r5.ok && took >= 7500 && took < 11000, `${took}ms`);
  ok('화면(로컬)에는 이미 반영돼 있고 «신호가 약해요» 를 알린다', (at(`voyages/${K}/loading/completed/${one}`) || {}).by === '김검수' && notices.some((m) => m.includes('신호가 약해요')), notices.join('|'));

  // ⑥ 마감텔리 시프팅 실패 표시
  const okRows = U.buildShifting(clone(base));
  ok('정상 항차는 표시 없이 목록을 낸다', Array.isArray(okRows) && !okRows._failed);
  const src = fs.readFileSync(path.join(ROOT, 'src/tallyReport.js'), 'utf8');
  ok('계산 실패는 삼키지 않고 표시를 달아 엑셀 안내까지 올린다(소스)', /_none\._failed = /.test(src) && /_shiftFail: shiftRows\._failed/.test(src) && /D\._shiftFail \?/.test(fs.readFileSync(path.join(ROOT, 'src/tallyExcel.js'), 'utf8')));
  ok('빈 catch 로 되돌아가지 않았다', !/computeShiftingMapCached\([^\n]*\} catch \{/.test(src));

  // ⑦ 화면 쪽 수리가 되돌아가지 않았다(소스) — 독립 감사가 «변이를 넣어도 통과» 로 짚은 네 곳
  const rdS = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
  const G = rdS('src/components/GuidedWorkPanel.jsx');
  ok('해치 표시는 한 칸 경로로 쓴다(통째 쓰기로 되돌아가지 않았다)', /fbUpdateVoyageInfo\(voyageKey, \{ \[`hatchDone\/\$\{hatchKeyOf\(center\)\}`\]: action \}\)/.test(G) && !/hatchDone: \{ \.\.\.prev, \[hatchKeyOf\(center\)\]/.test(G));
  ok('«커버를 열까요» 는 이웃 장 데크(holdDeckGateOf)를 본다', /deckRemain === 0 && holdRemain > 0 && holdDeckGateOf\(selectedGroup\)\) return false;/.test(G));
  ok('해치 닫기 음성 판정이 voyage 를 따른다', /hatchAuto, ownPause, voyage\]\);/.test(G));
  for (const [p, re] of [['src/components/GuidedWorkPanel.jsx', /if \(cns\.length > 1\) await fbCompleteContainersAtomic\(voyageKey, mode, cns, inspector, equip\);/], ['src/components/ContainerDetailModal.jsx', /if \(cns\.length > 1\) await fbCompleteContainersAtomic\(voyageKey, mode, cns, inspector, getEquipNumber\(\)\);/], ['src/components/SlotLookupModal.jsx', /if \(cns\.length > 1\) await fbCompleteContainersAtomic\(voyageKey, mode, cns, inspector, getEquipNumber\(\)\);/], ['src/components/BigResultCard.jsx', /if \(cns\.length > 1\) await fbCompleteContainersAtomic\(voyageKey, c\._mode, cns, inspector, getEquipNumber\(\)\);/]]) {
    const t = rdS(p);
    ok(`여러 대 완료는 묶음 쓰기 — ${p.split('/').pop()}`, re.test(t) && !/for \(const cn of cns\) await fbCompleteContainer\([^\n]*\n/.test(t.replace(/else for \(const cn of cns\) await fbCompleteContainer\([^\n]*\n/g, '')));
  }
  ok('미르 못 배운 말 기록의 날짜 키는 한국 시각 한 벌(aiDayKey)', /const day = aiDayKey\(rec\.at \|\| Date\.now\(\)\);/.test(rdS('src/firebase.js')));
  ok('주야간 작업보고의 규격 칸도 길이 한 벌(sizeLenOf)을 쓴다', /const sizeKey = \(c\) => \{[^\n]*return 's' \+ sizeLenOf\(c\);/.test(rdS('src/utils.js')));
  const NL = rdS('src/nlSearch.js');
  ok('속도 계산에도 카페리 휴게 없음이 들어간다(끝나는 시각과 한 벌)', (NL.match(/noRest/g) || []).length >= 8 && /export function isNoRestShip/.test(NL));

  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 폴더 */ }
  console.log(`\n4.86-02 일괄 수리 연막검사 — ${n - bad}/${n}${bad ? ' ✘' : ' ✔'}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('⛔ 연막검사 자체 오류', e); process.exit(1); });
