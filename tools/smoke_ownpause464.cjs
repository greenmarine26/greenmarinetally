// 내 호기 작업 중단 연막검사 (TallyOne 4.63-04) — 검수사 2026-11-04 08:58 «장비고장으로 작업중단보고를 했는데 자꾸 해치커버를 열거냐고 물어보는데»
//   실데이터 STSE 2685E(2호기 고장 보고 뒤에도 1호기 터미널 실적이 계속 찍힘) 로 잰다.  node tools/smoke_ownpause464.cjs <번들> <저장소 루트>
const fs = require('fs'); const path = require('path');
const OUT = process.argv[2]; const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
global.window = { addEventListener() {}, dispatchEvent() { return true; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
const M = require(path.resolve(OUT));
let n = 0, bad = 0;
const T = (c, name, d = '') => { n += 1; if (c) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${d ? ' — ' + d : ''}`); } };
const V = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/ownpause464_stse.json'), 'utf8'));
const pauseTs = Math.max(...Object.values(V.reports).filter((r) => r.type === 'external_pause').map((r) => r.ts));
const ats = Object.values(V.discharge.completed).map((c) => c.at);
const now = Math.max(...ats) + 60000;
console.log('① 실데이터 — 2호기 고장 보고 뒤 1호기 터미널 실적만 찍힘');
T(Math.max(...ats) > pauseTs, '중단 보고 뒤에 완료 기록이 있다(실데이터 전제)');
T(M.workPauseOf(V, now) === null, '옛 판정(전체 완료로 재개 판정)은 재개로 읽는다 — 이 사건의 뿌리');
const own = M.workPauseOf(V, now, { inspector: '김성일', equip: '2호기' });
T(own && /장비 고장/.test(own.reason), '내(김성일·2호기) 기준은 중단 중 — 해치 물음을 쉰다', JSON.stringify(own));
const other = M.workPauseOf(V, now, { inspector: '다른사람', equip: '1호기' });
T(other === null, '1호기 쪽은 자기 실적이 찍혔으니 재개로 본다', JSON.stringify(other));
console.log('② 내가 중단 뒤 완료를 찍으면 재개');
const V2 = JSON.parse(JSON.stringify(V)); V2.discharge.completed.MINE = { at: pauseTs + 120000, by: '김성일', equip: '2호기', src: null };
T(M.workPauseOf(V2, now + 200000, { inspector: '김성일', equip: '2호기' }) === null, '내 완료가 중단 뒤에 있으면 재개');
console.log('③ 버전·배너');
T(/4\.(63-0[45]|6[4567])/.test(M.APP_VERSION) && /4\.(63-0[45]|6[4567])/.test(M.APP_NOTE), '버전·APP_NOTE 4.63-04 이후');
T(M.APP_NOTE.length <= 160, 'APP_NOTE 두 문장 이내', String(M.APP_NOTE.length));
console.log('④ 베이뷰 따라가기(hatchAuto)에서도 «데크 양하 완료 — 해치커버 열까요» 물음이 선다(4.63-05)');
{ const src = fs.readFileSync(path.join(ROOT, 'src/components/GuidedWorkPanel.jsx'), 'utf8');
  const i = src.indexOf('const deckDonePromptD = useMemo'); const j = src.indexOf('}, [', i); const body = src.slice(i, j);
  T(i > 0 && !/hatchAuto/.test(body.replace(/\/\/[^\n]*/g, '')), 'deckDonePromptD 본문에 hatchAuto 게이트가 없다');
  T(/isHatchDoneSaved\(selectedGroup, 'open'\)/.test(body), '이미 열렸다고 기록된 장은 계속 막는다(중복 보고 방지)');
  T(/hatchAuto && /.test(src.slice(src.indexOf('const holdDonePrompt = useMemo')).slice(0, 400)) || /if \(hatchAuto\) return false;/.test(src.slice(src.indexOf('const holdDonePrompt = useMemo')).slice(0, 400)), '닫기 물음(holdDonePrompt)은 따라가기에서 종전대로 끈다'); }
console.log(bad ? `✗ 연막 실패 ${bad}/${n}` : `✔ 연막 통과 ${n}/${n}`); process.exit(bad ? 1 : 0);
