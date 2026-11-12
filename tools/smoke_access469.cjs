// 4.69 연막검사 — 소유자 «🚪 접속 기록». ① 요약(막힌 뒤 시도·콘앱 기기 수)을 따로 센 값과 맞댄다 ② 소유자·클로드 이름·기기 제외 ③ 연결 구조(한 곳 호출·소유자만 읽기·관리앱 접이·콘앱 하루 한 번)
//   실행 — node tools/smoke_access469.cjs <번들.cjs> <repoRoot>. 실패하면 빌드를 세운다
const path = require('path');
const fs = require('fs');
const B = require(path.resolve(process.argv[2]));
const root = path.resolve(process.argv[3] || process.cwd());
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const noCmt = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
let n = 0, bad = 0;
const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };

console.log('[1] 요약 — 막힌 이름 시도');
const T0 = Date.parse('2026-11-05T09:00:00+09:00');
const rows = [
  { t: 'denied', n: '이형출', d: 'a1', at: T0, day: '261105' },
  { t: 'denied', n: '이형출', d: 'a1', at: T0 + 60000, day: '261105' },
  { t: 'denied', n: '이형출', d: 'a2', at: T0 + 86400000, day: '261106' },
  { t: 'denied', n: '최관식', d: 'b1', at: T0 + 5, day: '261105' },
  { t: 'denied', n: '김성일', d: 'o1', at: T0 + 9, day: '261105' },   // 소유자 이름 — 뺀다
  { t: 'denied', n: '클로드', d: 'c1', at: T0 + 9, day: '261105' },   // 클로드 — 뺀다
  { t: 'denied', n: '박진우', d: 'o2', at: T0 + 9, day: '261105' },   // 소유자 기기에서 시험한 줄 — 뺀다
  { t: 'skip', n: '김성일', d: 'o2', at: T0 },
  { t: 'skip', n: '클로드', d: 'c2', at: T0 },
  { t: 'cone', d: 'k1', at: T0, day: '261105' },
  { t: 'cone', d: 'k1', at: T0 + 86400000, day: '261106' },
  { t: 'cone', d: 'k2', at: T0, day: '261105' },
  { t: 'cone', d: 'k3', at: T0, day: '261105' },
  { t: 'cone', d: 'k3', at: T0 + 86400000, day: '261106' },
  { t: 'cone', d: 'k3', at: T0 + 2 * 86400000, day: '261107' },
  { t: 'cone', d: 'k3', at: T0 + 3 * 86400000, day: '261108' },
  { t: 'cone', d: 'o2', at: T0, day: '261105' },   // 소유자 기기 — 뺀다
  { t: 'cone', d: 'c2', at: T0, day: '261106' },   // 클로드 기기 — 뺀다
];
const S = B.summarizeAccess(rows);
ok(S.denied.length === 2 && S.deniedTotal === 4, `막힌 이름 2명 · 모두 4회 (소유자·클로드·내 기기 시험 줄은 뺌) — ${S.denied.map((o) => o.name + o.total).join(' ')}`);
const lee = S.denied[0];
ok(lee.name === '이형출' && lee.total === 3 && lee.dayCount === 2 && lee.devCount === 2 && lee.first === T0 && lee.last === T0 + 86400000, '이형출 3회 · 2일 · 기기 2대 · 처음/마지막 시각', JSON.stringify(lee));
ok(S.denied[1].name === '최관식' && S.denied[1].total === 1, '많은 순 — 최관식 1회가 뒤');
console.log('[2] 요약 — 콘앱 기기');
ok(S.coneDevices === 3, `콘앱 기기 3대 (소유자·클로드 기기 제외) — ${S.coneDevices}`);
ok(S.coneOnce === 1 && S.coneFew === 1 && S.coneMany === 1, `쓴 날 수 — 하루뿐 ${S.coneOnce} · 2~3일 ${S.coneFew} · 4일 이상 ${S.coneMany}`);
ok(JSON.stringify(S.coneByDay) === JSON.stringify([{ day: '261105', devices: 3 }, { day: '261106', devices: 2 }, { day: '261107', devices: 1 }, { day: '261108', devices: 1 }]), '날짜별 기기 수', JSON.stringify(S.coneByDay));
const E0 = B.summarizeAccess([]), E1 = B.summarizeAccess(null);
ok(E0.deniedTotal === 0 && E0.coneDevices === 0 && E1.denied.length === 0, '빈 기록·null 도 던지지 않는다');
ok(B.ACCESS_SKIP_NAMES.includes('김성일') && B.ACCESS_SKIP_NAMES.includes('클로드') && B.ACCESS_SKIP_NAMES.length === 2, '제외 이름은 소유자와 클로드 둘');

console.log('[3] 연결 구조');
const app = noCmt(rd('src/App.jsx'));
ok(/if \(isStaffOff\(name\) && !isOwnerName\(name\)\) \{ logDeniedAttempt\(name\); setDeniedName\(name\); return; \}/.test(app) && (app.match(/logDeniedAttempt\(/g) || []).length === 1, '막힌 이름 시도는 handleSelectInspector 한 곳에서만 센다(차단 동작은 그대로)');
ok(/setActivityUser\(name\);\s*markSkipDevice\(name\);/.test(app), '로그인 확정 지점이 소유자·클로드 기기를 표시한다');
const fb = noCmt(rd('src/firebase.js'));
ok(/export async function fbGetAccessLog\(dayKeys, by\) \{\s*assertOwner\('접속 기록 보기', by\);/.test(fb), '접속 기록 읽기는 소유자만(assertOwner)');
ok(/export async function fbPushAccess\(dayKey, payload\)/.test(fb) && /access_log\/\$\{dayKey\}/.test(fb), '쓰기는 access_log/{YYMMDD} 한 곳');
const panel = noCmt(rd('src/components/AccessLogPanel.jsx'));
ok(!/onValue|fbSubscribeAccess/.test(panel) && /fbGetAccessLog\(dayKeys\(\), by\)/.test(panel), '패널은 접속 기록을 구독하지 않고 펼칠 때 한 번 읽는다');
ok(/fbSetStaffOff\(by, name, false\)/.test(panel), '[ON 으로]는 기존 오프 전환 함수를 그대로 쓴다');
const own = noCmt(rd('src/pages/OwnerPage.jsx'));
ok(/<Fold id="accesslog"[\s\S]*?<AccessLogPanel by=\{inspector\} \/>/.test(own), '관리앱(소유자 메뉴)에 «접속 기록» 접이가 있다');
const chief = rd('src/pages/ChiefDashboard.jsx') + rd('src/App.jsx');
ok(!/AccessLogPanel/.test(chief), '수석 화면·검수 화면에는 이 패널이 없다');
const cone = rd('public/cone.html');
ok(/localStorage\.getItem\('tallyAccessSkip'\)==='1'\) return;/.test(cone) && /localStorage\.getItem\('coneAccessDay'\)===day\) return;/.test(cone), '콘앱은 내 기기·같은 날 두 번째 실행은 기록하지 않는다');
ok(/signal:ac\.signal/.test(cone) && /\.catch\(function\(e\)\{ clearTimeout\(tm\); console\.warn\('\[콘앱 접속기록\]/.test(cone), '콘앱 기록은 제한 시간이 있고 실패는 경고 한 줄(조용한 실패 없음)');
ok(/window\.__CONEV='ConeOne 2\.(?:74(?:-0[123])?|75(?:-0[1-9])?|76|77|78)';/.test(cone), '콘앱 판 2.74');
const al = rd('src/accessLog.js');
ok(!/password|비밀번호|pw/i.test(noCmt(al).replace(/비밀번호 값 외에/g, '')) , '기록 코드가 비밀번호를 다루지 않는다');
ok(/4\.(69|[78]\d)/.test(B.APP_VERSION) && B.APP_NOTE.length < 120, '판 4.69 · APP_NOTE 120자 미만', B.APP_NOTE);
console.log(`\n4.69 접속 기록 연막검사 ${n - bad}/${n} 통과`);
process.exit(bad ? 1 : 0);
