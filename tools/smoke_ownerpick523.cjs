// 5.23-02 연막 — 검수사(소유자)가 관리자로 «작업 시작»을 열면 [작업자]/[관리자] 선택 창이 뜨는가(소스 단언).
const fs = require('fs'); const rd = (f) => fs.readFileSync(f, 'utf8');
let bad = 0; const ok = (m, c) => { console.log((c ? '✅ ' : '⛔ ') + m); if (!c) bad++; };
const vp = rd('src/pages/VoyagePage.jsx'), op = rd('src/components/OwnerWorkPick.jsx');
ok('작업 시작 탭(search)에서만 연다', /tab !== 'search'/.test(vp));
ok('소유자이면서 관리자일 때만', /isOwnerName\(inspector\) && isAdminNow\(\)/.test(vp));
ok('[관리자]는 이 배·이 조 기억', /gmOwnerPick\|\$\{voyageKey\}\|\$\{crewShiftKey/.test(vp) && /setItem\(_opKey, 'admin'\)/.test(vp));
ok('작업자로 바뀌면 저절로 닫힘', /ownerPick && !isAdminNow\(\)/.test(vp));
ok('두 단추 작업자·관리자', />작업자</.test(op) && />관리자</.test(op));
ok('작업자는 미르 등록과 같은 저장(AdminWorkStart)', /<AdminWorkStart /.test(op));
process.exit(bad ? 1 : 0);
