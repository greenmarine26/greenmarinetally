// 5.18 연막검사 — 확정전 플랜 띠(loading/prePlan) · 매뉴얼 · 수집기 판정은 tools(수집기 쪽 smoke_preplan.py)
//   검수사 2026-11-21 «컨펌중인 플랜을 먼저 적용해서 예상을 할수있게 하고 받은 메일함에 확정 플랜이 오면 확정을 마무리» · «확정전으로 표기 바랍니다»
const fs = require('fs');
let n = 0, bad = 0;
const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
const vp = fs.readFileSync('src/pages/VoyagePage.jsx', 'utf8');
ok(/voyage\?\.loading\?\.prePlan/.test(vp) && /data-preplan=\{stt\}/.test(vp), '선적 화면이 loading/prePlan 을 읽어 띠를 그린다');
ok(/stt !== 'pending' && stt !== 'pending_pdf'\) return null/.test(vp), 'pending·pending_pdf 일 때만 — 확정(confirmed)이면 안 뜬다');
ok(/📝 선적 예정/.test(vp) && !/📝 확정전/.test(vp) && /재컨펌 요청 중/.test(vp), '5.23-05 «선적 예정» 표기(검수사 2026-11-25 07:54 — 옛 «확정전») · PDF 뿐이면 «재컨펌 요청 중»');
ok(/mode === 'loading' && \(\(\) => \{\s*const pp = voyage\?\.loading\?\.prePlan/.test(vp), '선적 화면에서만');
ok(/📝 선적 예정 \(5\.18 · 5\.23-05\)/.test(fs.readFileSync('src/data/helpData.js', 'utf8')), '매뉴얼');
// 5.23-05 — 홈 카드 이름 «선적 예정» · 시프팅은 «쉬프팅 N» 만(확정·예정 말 없음 · 불일치만)
const hp = fs.readFileSync('src/pages/HomePage.jsx', 'utf8');
ok(/loaStats\.prePlanPending = _pps === 'pending' \|\| _pps === 'pending_pdf'/.test(hp) && /\{label\}\{lod && stats\.prePlanPending \? ' 예정' : ''\}/.test(hp), '5.23-05 홈 카드 — 확인 전이면 «선적 예정»');
ok(/쉬프팅 \{stats\.shiftCount\}\{shiftWordOf\(stats\.shiftState\)/.test(hp) && !/`예정 \$\{stats\.shiftCount\}`/.test(hp), '5.23-05 홈 카드 — 확정이면 «쉬프팅 N» 만 · 예정일 때만 «예정»');
ok(/shiftWordOf\(shiftInfo\?\.evid\?\.label\) && \(/.test(vp) && !/예정입니다\(확정 아님\)/.test(vp), '5.23-05 항차 화면 시프팅 딱지도 shiftWordOf 한 벌');
console.log(`${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
