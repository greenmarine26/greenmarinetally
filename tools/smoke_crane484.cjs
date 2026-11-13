// 4.84 연막검사 — 호기 보정(craneRelabelOf)과 상황판 호기 줄(craneBoardOf)의 «입력 호기와 다름». 실 OBWH 2787E 보관본(2788W 선적) 위에서 실소스를 돌린다.
//   ① 박진우 1호기 표기 31건 → 터미널 2호기 ② 김성일 10베이 5건(공유 베이)·이형출 28건은 입력 그대로 ③ 저장값 불변 ④ 호기 줄 relab 건수 ⑤ 터미널 자료 없으면 보정 없음
//   실행 — node tools/smoke_crane484.cjs [저장소 루트]. 실패하면 빌드를 세운다.
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
const clone = (o) => JSON.parse(JSON.stringify(o));
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
global.fetch = () => Promise.reject(new Error('no net'));
console.warn = () => {};
(async () => {
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx484_'));
  const stub = './tools/stub_fbdb_mem.js';
  const aliasFb = `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub}`;
  const out = path.join(TMP, 'u.cjs');
  execSync(`npx esbuild "${path.join(ROOT, 'tools/smoke_shiftmanual482_entry.js')}" --bundle --platform=node --format=cjs --outfile="${out}" --loader:.js=jsx --jsx=automatic ${aliasFb} --log-level=error`, { cwd: ROOT, stdio: 'inherit' });
  const U = require(out);
  const base = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'tools/fixtures/relabel484_obwh.json.gz'))));
  const v = clone(base); v.key = 'OBWH_2787E';
  const before = JSON.stringify(v.loading.completed);
  const R = U.craneRelabelOf(v);
  const by = (who) => Object.entries(v.loading.completed).filter(([, r]) => r.by === who && r.src !== 'term').map(([cn]) => cn);
  const mv = (who) => by(who).filter((cn) => R.map[`loading|${cn}`]);
  ok('박진우 1호기 표기 31건이 전부 터미널 2호기로 읽힌다', mv('박진우').length === 31 && mv('박진우').every((cn) => R.map[`loading|${cn}`].from === 1 && R.map[`loading|${cn}`].to === 2), JSON.stringify(R).slice(0, 200));
  ok('김성일 10베이 5건은 공유 베이라 입력 그대로(1호기)', by('김성일').length === 5 && mv('김성일').length === 0 && R.shared >= 5, `shared ${R.shared}`);
  ok('이형출 28건은 근거 없음 — 입력 그대로', by('이형출').length === 28 && mv('이형출').length === 0);
  ok('보정 건수 31 · 저장값(completed) 불변', R.n === 31 && JSON.stringify(v.loading.completed) === before);
  ok('양하(터미널 실적 없음)는 보정 없음', Object.keys(R.map).every((k) => k.startsWith('loading|')));
  const rows = U.craneBoardOf(v, [], null, Date.UTC(2026, 10, 9, 11, 0, 0));
  const r1 = rows.find((c) => c.no === 1), r2 = rows.find((c) => c.no === 2);
  ok('호기 줄 2호기에 «입력 호기와 다름» 31건(1호기로 입력 31)', !!r2 && r2.relab && r2.relab.n === 31 && r2.relab.from[1] === 31, JSON.stringify(r2 && r2.relab));
  ok('1호기 줄에는 relab 이 없다', !!r1 && !r1.relab);
  ok('같은 항차를 두 번 계산해도 같은 답(재사용)', U.craneRelabelOf(v) === R);
  const v2 = clone(v); v2.loading.completed = Object.fromEntries(Object.entries(v2.loading.completed).filter(([, r]) => r.src !== 'term'));
  ok('터미널 실적이 하나도 없으면 보정하지 않는다', U.craneRelabelOf(v2).n === 0);
  //  감사 반영 — 계획 EDI 자리뿐인 사람 완료는 근거로 쓰지 않는다(실적 bay_actual·맞교환 bay_assign 만)
  const v3 = clone(v);
  for (const cn of by('박진우')) { delete v3.loading.records[cn].bay_actual; delete v3.loading.records[cn].bay_assign; }
  ok('실적 자리가 없는(계획 EDI 자리뿐인) 사람 완료는 보정하지 않는다', U.craneRelabelOf(v3).n === 0, U.craneRelabelOf(v3).n);
  //  호기 교체(4.58)로 접힌 호기는 «입력 호기와 다름»을 달지 않는다(건수가 대수와 어긋남)
  const v4 = clone(v); v4.info.craneCrew = { '11-09 주간': { '1호기': { name: '이형출', at: 1794190000000 }, '3호기': { name: '박진우', at: 1794180000000 } } };
  const rows4 = U.craneBoardOf(v4, [], null, Date.UTC(2026, 10, 9, 11, 0, 0));
  ok('호기 줄 수와 relab 건수가 done 을 넘지 않는다', rows4.every((c) => !c.relab || c.relab.n <= c.done), JSON.stringify(rows4.map((c) => [c.no, c.done, c.relab && c.relab.n])));
  //  콘앱도 같은 함수 한 벌을 부른다(검수앱 상황판·콘앱 호기 카드가 같은 답)
  const coneH = fs.readFileSync(path.join(ROOT, 'public/cone.html'), 'utf8');
  const coneE = fs.readFileSync(path.join(ROOT, 'src/coneCargoPlan.entry.jsx'), 'utf8');
  ok('콘앱 호기 카드가 ConeParse.craneRelabelOf 로 호기를 읽고 번들이 그 함수를 내보낸다', /ConeParse\.craneRelabelOf/.test(coneH) && /_rlMap\[mode\+'\|'\+cn\]/.test(coneH) && /window\.ConeParse = \{[^}]*craneRelabelOf/.test(coneE));
  ok('ConeOne 2.77 이상(4.88: 2.78 판정 한 벌)', /window\.__CONEV='ConeOne (?:2\.7[789]|3\.\d\d)(-\d\d)?'/.test(coneH));
  const ut = fs.readFileSync(path.join(ROOT, 'src/utils.js'), 'utf8');
  const note = (ut.match(/export const APP_NOTE = '([^']*)'/) || [])[1] || '';
  ok('버전 TallyOne 4.84 · APP_NOTE 두 문장 이하·120자 미만·작은따옴표/슬래시 없음', /APP_VERSION = 'TallyOne (?:4\.8[456789]|5\.\d\d)(-\d\d)?'/.test(ut) && /^(?:4\.8[456789]|5\.\d\d)(-\d\d)? /.test(note) && note.length < 120 && !/[\/']/.test(note), note);
  console.log(`\n4.84 호기 보정 연막검사 — ${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('4.84 연막검사 예외', e); process.exit(1); });
