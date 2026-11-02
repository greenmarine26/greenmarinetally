// 4.63 연막검사 — 관리앱(#/owner) 분리. 소유자 메뉴가 수석 대시보드에 없고, 헤더 단추·화면·주소가 소유자 문지기를 지나는가
const fs = require('fs'), path = require('path');
const root = process.argv[2] || process.cwd();
const read = (f) => fs.readFileSync(path.resolve(root, f), 'utf8');
let bad = 0, n = 0;
const ok = (c, m) => { n++; if (!c) bad++; console.log(`  ${c ? 'PASS' : 'FAIL'} ${m}`); };
const CD = read('src/pages/ChiefDashboard.jsx'), OP = read('src/pages/OwnerPage.jsx'), APP = read('src/App.jsx'), HD = read('src/components/Header.jsx'), BH = read('src/backHandler.js');
ok(!/data-owner-menu|data-danger-zone|askClearAllDanger|ShiftSnapPanel|AiCostPanel|ActivityLogSection|id: 'owner'/.test(CD), '수석 대시보드에는 소유자 메뉴(교대 시각·활동 로그·AI 비용·위험 구역·묶음)가 없다');
ok(/data-owner-menu="1"/.test(OP) && /data-danger-zone="1"/.test(OP) && /<ShiftSnapPanel/.test(OP) && /<ActivityLogSection/.test(OP) && /<AiCostPanel/.test(OP) && /onOpenStaffManager/.test(OP), '관리앱 화면에 소유자 메뉴 전부(교대 시각·활동 로그·AI 비용·인원 관리·위험 구역)가 있다');
ok(/isOwnerName\(inspector\)/.test(OP) && /data-owner-denied/.test(OP) && OP.indexOf('if (!owner)') < OP.indexOf('fbClearAllReportsAllVoyages()'), '소유자가 아니면 «소유자 전용» 안내만 그리고 삭제 처리기까지 가지 않는다');
ok(/\{ name: 'owner' \}/.test(BH) && /route\.name === 'owner'/.test(APP) && /isOwnerName\(inspector\) \? \(\) => navigate\('owner'\) : null/.test(APP), '주소 #/owner · 라우트 · 헤더 입구가 App 에 연결되어 있고 입구는 소유자일 때만 넘어간다');
ok(/onOpenOwner = null/.test(HD) && /\{onOpenOwner && \(/.test(HD) && /data-hdr-owner="1"/.test(HD), '헤더 👑 단추는 onOpenOwner 가 있을 때만 그려진다(검수원·수석은 안 보임)');
ok(/OwnerPage inspector=\{inspector\}/.test(APP) && /OwnerPage/.test(APP), '관리앱은 소유자 판정 뒤 화면을 그린다');
ok(/data-owner-go="inspect"/.test(OP) && /data-owner-go="chief"/.test(OP) && /onGoChief && </.test(OP) && /onGoChief=\{canOpenChief\(inspector, isOwnerName\(inspector\)\)/.test(APP), '4.63-01 관리앱 상단에 [검수앱]·[수석앱] 이동 단추가 있고 수석앱은 수석 자격일 때만 넘어간다');
ok(/\['manage', '🧰', '도구'\]/.test(CD) && !/\['manage', '🧰', '관리'\]/.test(CD), '4.63-01 수석 상황판 탭 이름이 «도구» 다(헤더 «관리앱» 과 겹치지 않음)');
console.log(bad ? `✗ 4.63 관리앱 분리 연막검사 — 통과 ${n - bad} · 실패 ${bad}` : `✓ 4.63 관리앱 분리 연막검사 — 통과 ${n}`);
process.exit(bad ? 1 : 0);
