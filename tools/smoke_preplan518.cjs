// 5.18 연막검사 — 확정전 플랜 띠(loading/prePlan) · 매뉴얼 · 수집기 판정은 tools(수집기 쪽 smoke_preplan.py)
//   검수사 2026-11-21 «컨펌중인 플랜을 먼저 적용해서 예상을 할수있게 하고 받은 메일함에 확정 플랜이 오면 확정을 마무리» · «확정전으로 표기 바랍니다»
const fs = require('fs');
let n = 0, bad = 0;
const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
const vp = fs.readFileSync('src/pages/VoyagePage.jsx', 'utf8');
ok(/voyage\?\.loading\?\.prePlan/.test(vp) && /data-preplan=\{stt\}/.test(vp), '선적 화면이 loading/prePlan 을 읽어 띠를 그린다');
ok(/stt !== 'pending' && stt !== 'pending_pdf'\) return null/.test(vp), 'pending·pending_pdf 일 때만 — 확정(confirmed)이면 안 뜬다');
ok(/📝 확정전/.test(vp) && /재컨펌 요청 중/.test(vp), '«확정전» 표기(검수사 09:40) · PDF 뿐이면 «재컨펌 요청 중»');
ok(/mode === 'loading' && \(\(\) => \{\s*const pp = voyage\?\.loading\?\.prePlan/.test(vp), '선적 화면에서만');
ok(/확정전 \(5\.18\)/.test(fs.readFileSync('src/data/helpData.js', 'utf8')), '매뉴얼');
console.log(`${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
