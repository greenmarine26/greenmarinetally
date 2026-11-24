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
const hd = rd('src/components/Header.jsx');
ok('5.23-03 헤더 호기 — 관리자 모드는 바탕 없이(bg-transparent) · 작업자는 노란색(bg-st-lod) 그대로', /workChoice\.mode === 'admin'\s*\n?\s*\? 'px-2 bg-transparent text-dim-100 border border-transparent'/.test(hd) && /'px-2 bg-st-lod text-ink-950 border border-st-lodHi'/.test(hd) && /data-equip-admin=/.test(hd));
ok('5.23-03 헤더 호기 중복 — 남이 쥔 호기는 묻는다(blockingHolderOf) · 선택지 넷 · fbRelieveCrane why', /const _holder = holderOfNum\(num\);\s*\n\s*if \(_holder\)/.test(hd) && ['relieve','swap','mistake','cancel'].every((w) => hd.includes(`data-equip-dup-why="${w}"`)) && /fbRelieveCrane\(route\.voyageKey, sk, d\.num, d\.holder, inspector, why\)/.test(hd));
const fbs = rd('src/firebase.js'), app = rd('src/App.jsx');
ok('5.23-03 상대 폰 문구 — relievedWhy swap·mistake', /relievedWhy`\] = \(why === 'swap' \|\| why === 'mistake'\)/.test(fbs) && /me\.relievedWhy === 'swap'/.test(app) && /me\.relievedWhy === 'mistake'/.test(app));
ok('5.23-03 감사 — 공동 담당 넘겨받기도 relievedWhy 를 relieve 로 덮는다', /relievedWhy`\] = 'relieve';/.test(fbs));
ok('5.23-03 감사 — 이름 표시는 관리자 화면에도(shownHolderOf), 묻기는 작업자만(holderOfNum = canRecordWorkNow)', /const holderOfNum = \(num\) => \(canRecordWorkNow\(\) \? shownHolderOf\(num\) : ''\)/.test(hd) && /data-equip-holder=\{shownHolderOf\(num\)\}/.test(hd));
process.exit(bad ? 1 : 0);
