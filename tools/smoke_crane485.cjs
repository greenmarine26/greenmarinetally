// 4.85 연막검사 — 교대 처리. 실 OBWH 2787E 보관본(2788W 선적) 위에
//   ① 입력 호기와 터미널 호기가 다른 자리는 한 번 묻는다(박진우 1호기 → 2호기) ② 공유 베이·근거 없음·같은 호기는 묻지 않는다
//   ③ «예» 면 기기 호기가 바뀌고 같은 줄의 다음 컨도 같은 호기 ④ «그대로» 면 같은 자리는 다시 묻지 않는다
//   ⑤ 교대 — 같은 항차·같은 조의 보유자 목록(3명이면 둘) · 쓰기 한 번에(조 등록 덮기 + 상대 표시 + 내 호기) · 상대 호기 비움 ⑥ 판·APP_NOTE
//   실행 — node tools/smoke_crane485.cjs [저장소 루트]. 실패하면 빌드를 세운다.
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
global.window = { addEventListener() {}, dispatchEvent(e) { (global.__evts = global.__evts || []).push(e); return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
global.fetch = () => Promise.reject(new Error('no net'));
console.warn = () => {};
(async () => {
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx485_'));
  const stub = './tools/stub_fbdb_mem.js';
  const aliasFb = `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub}`;
  const out = path.join(TMP, 'u.cjs');
  execSync(`npx esbuild "${path.join(ROOT, 'tools/smoke_crane485_entry.js')}" --bundle --platform=node --format=cjs --outfile="${out}" --loader:.js=jsx --jsx=automatic --log-level=error ${aliasFb}`, { cwd: ROOT, stdio: 'inherit' });
  const U = require(out);
  const base = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'tools/fixtures/relabel484_obwh.json.gz'))));
  const v = clone(base); v.key = 'OBWH_2787E';
  const sec = v.loading;
  const R = U.craneRelabelOf(v);
  const by = (who) => Object.entries(sec.completed).filter(([, r]) => r.by === who && r.src !== 'term').map(([cn]) => cn);
  const bayOf = (cn) => parseInt(U.completedPosOf(sec, cn, sec.records || {}).bay, 10);
  // ① 박진우 1호기 입력 — 터미널이 2호기로 기록 중인 베이
  const pj = by('박진우').find((cn) => R.map[`loading|${cn}`]);
  const pjRec = sec.completed[pj];
  const a1 = U.craneAskOf(v, 'loading', bayOf(pj), 1, pjRec.at);
  ok('박진우 1호기 입력 자리는 «2호기로 기록할까요» 를 묻는다', !!a1 && a1.to === 2 && a1.bay === bayOf(pj), JSON.stringify(a1));
  ok('같은 자리를 2호기로 입력하면 묻지 않는다', U.craneAskOf(v, 'loading', bayOf(pj), 2, pjRec.at) === null);
  // ② 공유 베이 · 근거 없음
  const ki = by('김성일').find((cn) => bayOf(cn) === 10) || by('김성일')[0];
  ok('두 호기가 같이 찍는 공유 베이(김성일 10베이)는 묻지 않는다', U.craneAskOf(v, 'loading', bayOf(ki), 1, sec.completed[ki].at) === null);
  const lh = by('이형출')[0];
  ok('이형출 입력 자리는 근거가 없어 묻지 않는다', U.craneAskOf(v, 'loading', bayOf(lh), Number(String(sec.completed[lh].equip || '').replace(/\D/g, '')) || 3, sec.completed[lh].at) === null);
  ok('터미널 실적이 없는 양하 구간은 묻지 않는다', U.craneAskOf(v, 'discharge', bayOf(pj), 1, pjRec.at) === null);
  const v2 = clone(v); v2.loading.completed = Object.fromEntries(Object.entries(v2.loading.completed).filter(([, r]) => r.src !== 'term'));
  ok('터미널 실적이 하나도 없으면 묻지 않는다', U.craneAskOf(v2, 'loading', bayOf(pj), 1, pjRec.at) === null);
  ok('저장값(completed)은 판정이 바꾸지 않는다', JSON.stringify(v.loading.completed) === JSON.stringify(base.loading.completed));
  // ③④ 묻기 중계 — 예 · 그대로
  const asked = [];
  let answer = true;
  const vq = clone(v); delete vq.loading.completed[pj];   // 아직 완료 전인 컨으로 본다(사람 완료는 묻지 않는다)
  U.registerCraneAsk({ getVoyage: (k) => (k === 'OBWH_2787E' ? vq : null), ask: async (q) => { asked.push(q); return answer; } });
  U.setActiveWorkChoice({ name: '박진우', ymd: '2026-11-09', mode: 'work', voyageKey: 'OBWH_2787E', equip: '1호기', at: Date.now() });
  store.gm_equip_no = '1호기';
  const r1 = await U.askCraneBeforeComplete('OBWH_2787E', 'loading', '1호기', pj, pjRec.at);
  ok('«예» — 2호기로 기록되고 기기 호기도 2호기로 바뀐다', r1 === '2호기' && store.gm_equip_no === '2호기' && asked.length === 1 && asked[0].to === 2 && asked[0].from === 1, `${r1} ${store.gm_equip_no} ${asked.length}`);
  const r2 = await U.askCraneBeforeComplete('OBWH_2787E', 'loading', '1호기', pj, pjRec.at + 1000);
  ok('같은 줄의 다음 컨(옛 호기 문자열)도 2호기 · 다시 묻지 않는다', r2 === '2호기' && asked.length === 1);
  store.gm_equip_no = '1호기'; answer = false; asked.length = 0;
  const v5 = clone(v);   // 새 중계 상태를 위해 다른 베이로 한 번 더 — 예 직후 60초 안 이어짐 표시를 피해 시각을 넘긴다
  const later = pjRec.at + 120000;
  const r3 = await U.askCraneBeforeComplete('OBWH_2787E', 'loading', '1호기', pj, later);
  ok('«1호기 그대로» — 호기를 건드리지 않는다', r3 === '1호기' && store.gm_equip_no === '1호기');
  const r4 = await U.askCraneBeforeComplete('OBWH_2787E', 'loading', '1호기', pj, later + 1000);
  ok('«그대로» 라고 한 같은 자리는 다시 묻지 않는다', r4 === '1호기' && asked.length <= 1, `asked ${asked.length}`);
  //  감사 반영 — 근거는 지금 완료하는 컨 자신의 베이다: 터미널 근처가 아닌 딴 베이 컨은 묻지 않고, 이미 사람이 완료한 컨도 묻지 않는다
  const far = Object.keys(sec.records).find((cn) => { const b = bayOf(cn); return b > 0 && Math.abs(b - bayOf(pj)) > 6 && !vq.loading.completed[cn]; });
  const askedBefore = asked.length;
  const r5 = far ? await U.askCraneBeforeComplete('OBWH_2787E', 'loading', '1호기', far, pjRec.at + 200000) : '1호기';
  ok('다른 베이(±2 밖) 컨을 완료할 때는 묻지 않는다', r5 === '1호기' && asked.length === askedBefore, far);
  store.gm_equip_no = '1호기'; answer = true; asked.length = 0;
  const hv = Object.entries(vq.loading.completed).find(([cn, r]) => r.by === '박진우' && r.src !== 'term' && cn !== pj);
  const r6 = hv ? await U.askCraneBeforeComplete('OBWH_2787E', 'loading', '1호기', hv[0], pjRec.at + 400000) : 'x';
  ok('이미 사람이 완료한 컨은 묻지 않는다', r6 === '1호기' && asked.length === 0, hv && hv[0]);
  // ⑤ 교대
  const now = Date.UTC(2026, 10, 9, 11, 0, 0);   // 20:00 KST — 야간
  const HV = 'SWSP_2611E';   // 주야 구분이 있는 배 — 낮조가 쥔 호기는 야간조 후보가 아니다(OBWH 는 주야 구분 없는 배라 조를 보지 않는다)
  const mk = (name, eq) => ({ name, loggedIn: true, workMode: 'work', assignVoyage: HV, assignEquip: eq, assignAt: now - 3600000, workShift: 'night', lastActive: now - 30000, lastVoyage: HV });
  const ins = { 박진우: mk('박진우', '1호기'), 이형출: mk('이형출', '3호기'), 김성일: mk('김성일', '2호기'), 낮사람: { ...mk('낮사람', '4호기'), workShift: 'day' }, 클로드: mk('클로드', '5호기') };
  const hs = U.equipHoldersOf(ins, HV, '김성일', now, 'night');
  ok('3명 근무 — 내가 아닌 두 명이 교대 후보(낮조·클로드는 제외)', hs.length === 2 && hs.map((h) => h.name).sort().join() === '박진우,이형출', JSON.stringify(hs));
  ok('equipHolderOf 도 같은 목록에서 답한다', U.equipHolderOf(ins, HV, '3호기', '김성일', now, 'night') === '이형출');
  global.__memdb = { voyages: { OBWH_2787E: { info: { vsl: 'OBWH' } } }, inspectors: { 박진우: { name: '박진우', workEquip: '1호기', assignEquip: '1호기' }, 김성일: { name: '김성일' } } };
  U.setActiveWorkChoice({ name: '김성일', ymd: '2026-11-09', mode: 'work', voyageKey: 'OBWH_2787E', equip: '2호기', at: Date.now() });
  store.gm_equip_no = '2호기';
  const eq = await U.fbRelieveCrane('OBWH_2787E', '11-09 야간', '1호기', '박진우', '김성일');
  const db = global.__memdb;
  ok('교대 — 조 등록 1호기가 내 이름으로 덮인다', eq === '1호기' && db.voyages.OBWH_2787E.info.craneCrew['11-09 야간']['1호기'].name === '김성일', JSON.stringify(db.voyages.OBWH_2787E.info));
  ok('교대 — 상대 줄에 교대 받음 표시(시각·누가·항차·호기)가 남고 호기가 비워진다', db.inspectors.박진우.relievedBy === '김성일' && db.inspectors.박진우.relievedEquip === '1호기' && db.inspectors.박진우.relievedVoyage === 'OBWH_2787E' && db.inspectors.박진우.relievedAt > 0 && !db.inspectors.박진우.workEquip && db.inspectors.박진우.assignEquip === '', JSON.stringify(db.inspectors.박진우));
  ok('교대 — 내 줄과 기기 호기가 1호기로 바뀐다', db.inspectors.김성일.assignEquip === '1호기' && store.gm_equip_no === '1호기');
  ok('교대 쓰기는 한 번(멀티 경로)이다', (global.__memlog || []).filter((e) => e.op === 'update').length === 1);
  let threw = false;
  try { await U.fbRelieveCrane('OBWH_2787E', '11-09 야간', '1호기', '김성일', '김성일'); } catch (e) { threw = true; }
  ok('자기 자신과는 교대하지 않는다', threw);
  U.setActiveWorkChoice({ name: '김성일', ymd: '2026-11-09', mode: 'view', voyageKey: '', equip: '', at: Date.now() });
  let blocked = false;
  try { await U.fbRelieveCrane('OBWH_2787E', '11-09 야간', '3호기', '이형출', '김성일'); } catch (e) { blocked = !!e.viewOnly; }
  ok('조회만은 교대하지 못한다(문지기)', blocked);
  // ⑥ 화면 연결과 판
  const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  ok('항차 화면이 묻기 창(CraneAskHost)을 달고 있다', /<CraneAskHost voyageKey=\{voyageKey\} voyage=\{voyage\}/.test(rd('src/pages/VoyagePage.jsx')));
  ok('완료 두 길(fbCompleteContainer·fbCompleteContainersAtomic)이 묻기를 부른다', (rd('src/firebase.js').match(/askCraneBeforeComplete\(voyageKey, mode/g) || []).length === 2);
  ok('헤더 호기 창에 교대 단추 · App 이 교대 받은 기기의 호기를 놓는다', /data-relieve-btn/.test(rd('src/components/Header.jsx')) && /gm_relieved_seen/.test(rd('src/App.jsx')) && /inspectors=\{inspectors\}/.test(rd('src/App.jsx')));
  const ut = rd('src/utils.js');
  const note = (ut.match(/export const APP_NOTE = '([^']*)'/) || [])[1] || '';
  ok('버전 TallyOne 4.85 · APP_NOTE 두 문장 이하·120자 미만·작은따옴표/슬래시 없음', /APP_VERSION = 'TallyOne 4\.8[567](-\d\d)?'/.test(ut) && /^4\.8[567](-\d\d)? /.test(note) && note.length < 120 && !/\//.test(note), note);
  console.log(`\n4.85 교대 처리 연막검사 — ${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('4.85 연막검사 예외', e); process.exit(1); });
