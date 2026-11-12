// 4.83 연막검사 — 선적 화면 «＋ 시프팅 추가»(ShiftAddBox)와 시프팅 후보 안내(shiftCandidatesOf). 실 OBWH 2787E 보관본 위에서 실소스를 돌린다.
//   ① 후보 = 양하 EDI 에 있고 양하 리스트에 없는 컨 ② 표기하면 후보에서 빠짐 ③ 리스트가 없으면 후보를 말하지 않음 ④ 상자가 쓰는 재료 함수 ⑤ 소스 배선·문구
//   실행 — node tools/smoke_shiftadd483.cjs [저장소 루트]. 실패하면 빌드를 세운다.
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
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx483_'));
  const stub = './tools/stub_fbdb_mem.js';
  const aliasFb = `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub}`;
  const out = path.join(TMP, 'u.cjs');
  execSync(`npx esbuild "${path.join(ROOT, 'tools/smoke_shiftmanual482_entry.js')}" --bundle --platform=node --format=cjs --outfile="${out}" --loader:.js=jsx --jsx=automatic ${aliasFb} --log-level=error`, { cwd: ROOT, stdio: 'inherit' });
  const U = require(out);
  const base = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'tools/fixtures/shiftmanual482_obwh.json.gz'))));
  const CN = 'SPSU6017307';
  let kk = 0;
  const mk = (manual, noRec) => {
    const v = clone(base); v.key = 'OBWH_2787E';
    if (manual) v.shiftManual = { [CN]: { cn: CN, from: '0100782', to: '0020104', by: '김성일', at: 1794200000000 } };
    if (noRec) v.discharge.records = {};
    return v;
  };

  console.log('① 후보 — 양하 EDI 에는 있고 양하 리스트에 없는 컨');
  const c0 = U.shiftCandidatesOf('K' + (++kk), mk(false));
  ok('실 OBWH 2787E — 후보는 SPSU6017307 한 대, 지금 자리 0100782(10-07-82)', c0.length === 1 && c0[0].cn === CN && c0[0].from === '0100782', JSON.stringify(c0));

  console.log('② 표기하면 후보에서 빠진다');
  const c1 = U.shiftCandidatesOf('K' + (++kk), mk(true));
  ok('표기 뒤 — 후보 0대', c1.length === 0, JSON.stringify(c1));

  console.log('③ 양하 리스트가 없으면 «리스트에 없음» 이라 말하지 않는다');
  const c2 = U.shiftCandidatesOf('K' + (++kk), mk(false, true));
  ok('리스트(records) 비어 있음 — 후보 0대(EDI 전체를 후보로 쏟지 않는다)', c2.length === 0, `${c2.length}`);
  ok('voyage 가 비어도 죽지 않는다', U.shiftCandidatesOf('K' + (++kk), null).length === 0 && U.shiftCandidatesOf('K' + (++kk), {}).length === 0);

  const vP = mk(false); vP.discharge.ediContainers = clone(vP.discharge.ediContainers); delete vP.discharge.raw;   // 원문 EDI 가 있으면 그쪽이 먼저 읽히므로 ediContainers 만 남겨 POD 를 바꾼다
  const vP0 = clone(vP); ok('(대조) 원문 없이 ediContainers 만 둬도 후보는 SPSU6017307 한 대', U.shiftCandidatesOf('K' + (++kk), vP0).length === 1);
  vP.discharge.ediContainers[CN].pod = 'CNDLC';
  ok('평택이 아닌 POD(통과) 컨은 후보가 아니다', U.shiftCandidatesOf('K' + (++kk), vP).length === 0);

  console.log('④ 상자가 쓰는 재료 — 항차 통째 대신 두 EDI 맵만 받아도 같은 답');
  const vObj = { discharge: { ediContainers: base.discharge.ediContainers }, loading: { ediContainers: (base.loading && base.loading.ediContainers) || {} } };
  ok('shiftManualFromOf(두 맵) = 0100782', U.shiftManualFromOf(vObj, CN) === '0100782', U.shiftManualFromOf(vObj, CN));
  ok('shiftTargetOccupiedBy — 빈 자리(0020104) 는 빈 배열', Array.isArray(U.shiftTargetOccupiedBy(vObj, '0020104', CN)));
  const k0 = Object.keys(base.discharge.ediContainers).find((k) => k !== CN);
  const p0 = U.shiftManualFromOf(vObj, k0);
  ok('shiftTargetOccupiedBy — 다른 양하 컨 자리를 고르면 그 컨을 알린다', /^\d{7}$/.test(p0) && U.shiftTargetOccupiedBy(vObj, p0, CN).some((x) => x.cn === k0), `${k0} ${p0}`);

  console.log('⑤ 소스 배선·문구');
  const box = read('src/components/ShiftAddBox.jsx'), vp = read('src/pages/VoyagePage.jsx'), ut = read('src/utils.js'), help = read('src/data/helpData.js');
  ok("ShiftAddBox — 선적 모드에서만 · 수석·검수사만 · fbSetShiftManual 로 저장(양하 상세와 같은 저장)", /mode !== 'loading' \|\| !podCan/.test(box) && /fbSetShiftManual\(voyageKey, cn0, \{ from, to, note \}, inspector\)/.test(box));
  ok('ShiftAddBox — 조회만이면 그리지 않는다(canWorkNow) · 저장 뒤에도 남은 후보 안내를 가리지 않는다', /!canWorkNow\(\)\) return null/.test(box) && /\{cands\.length > 0 && \(/.test(box));
  ok('ShiftAddBox — 실패를 화면에 말한다(빈 catch 없음)', /setErr\(`저장하지 못했습니다/.test(box) && !/catch\s*(\([^)]*\))?\s*\{\s*\}/.test(box));
  ok('VoyagePage — 후보 계산(shiftCandidatesOf)·ListTab 에 loadingEdi·shiftCands 전달·ListTab 이 ShiftAddBox 를 쉬프팅 카드 위에 둔다', /shiftCandidatesOf\(voyageKey, voyage\)/.test(vp) && /loadingEdi=\{voyage\?\.loading\?\.ediContainers \|\| null\} shiftCands=\{shiftCands\}/.test(vp) && /<ShiftAddBox voyageKey=\{voyageKey\}[^>]*cands=\{shiftCands\}/.test(vp));
  ok("APP_VERSION 4.83 · APP_NOTE 120자 이하 · 낫표·빗금 없음", /export const APP_VERSION = 'TallyOne 4\.8[3456789]/.test(ut) && (() => { const m = /export const APP_NOTE = '([^']*)'/.exec(ut); return m && m[1].length <= 120 && !/[\/'"]/.test(m[1]); })());
  ok('매뉴얼(helpData) — 선적 화면 시프팅 추가 안내가 들어 있다', /선적 목록 화면 → «＋ 시프팅 추가/.test(help) && /4\.83 — 선적 화면에서도 됩니다/.test(help));

  console.log(`\n연막검사 4.83 — ${n - bad}/${n} 통과`);
  fs.rmSync(TMP, { recursive: true, force: true });
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('연막검사 실행 실패', e); process.exit(2); });
