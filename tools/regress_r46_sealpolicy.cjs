// 회귀 기준표 R46 — 선박 실 정책을 지정한 배는 선적 화면을 열어도 «선박 실 정책» 창이 다시 뜨지 않는다(4.42-01). 처음 오는 배(정책 없음)만 묻는다.
//   근거 — 검수사 2026-10-21 13:00 «선박마다 실 정책을 지정하면 그만인데 왜 매번 띄우는지 모르겠습니다» · 13:01 «한번 지정하면 사용자가 바꾸기 전까지는 1년이든 2년이든 다시 띄우면 안됩니다».
//   실측(보관소 GET 2026-10-21) — 정책이 이미 있는 배에도 창이 떴다: DJCT(09-23 등록 → 10-20 최원형) · KKLC(09-14 → 10-10 이인철) · MCSN(08-23 → 09-28).
//   원인 — 화면을 열 때 «정책 목록 구독»과 «묻기» 효과가 같은 커밋에서 돌아, 묻기가 목록이 들기 전의 빈 목록으로 «정책 없음» 을 정하고 보관소 확인을 기다린 뒤 창을 띄웠다.
//   실소스 항차 화면(VoyagePage)을 jsdom 에서 선적으로 연다. Firebase 는 메모리 스텁(쓰기는 스텁 안에서만).
//   자료 — tools/fixtures/closingedi_obwh2762.json(OBWH 2762W 실제 선적 287대) · 정책은 보관소 shipPolicies/OBWH 그대로(2026-10-21 GET — 김성일 등록 «일반»).
//   실행: smoke_regress.cjs 안에서 — require('./regress_r46_sealpolicy.cjs')({ ROOT, TMP, ok, head, fx, stub }) · 단독 — node tools/regress_r46_sealpolicy.cjs <저장소 루트>
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function r46({ ROOT, TMP, ok, head, fx, stub }) {
  head('R46 선박 실 정책 — 지정한 배는 선적 화면을 열어도 «선박 실 정책» 창이 다시 뜨지 않는다 · 처음 오는 배만 묻는다',
    '검수사 2026-10-21 13:00 «선박마다 실 정책을 지정하면 그만인데 왜 매번 띄우는지 모르겠습니다» · 13:01 «한번 지정하면 사용자가 바꾸기 전까지는 1년이든 2년이든 다시 띄우면 안됩니다»');
  const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const OB = fx('closingedi_obwh2762.json');
  const VK = 'OBWH_2762W';
  //  보관소 shipPolicies/OBWH 그대로(2026-10-21 13:05 GET — 감사 사본과 같은 칸)
  const POL_OBWH = { code: '', description: '', label: 'LOLO 검수 (베이 없는 명세선)', lolo: false, mode: 'none', name: 'OBWH', registered_at: 1792401650118, registered_by: '김성일', rfSkip: false, target: 'all_empty' };
  const ASK = /엠티 컨테이너 실 정책을 선택하세요/;

  const eF = path.join(TMP, 'r46.jsx'), oF = path.join(TMP, 'r46.js');
  fs.writeFileSync(eF, [
    `import React from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import VoyagePage from "${ROOT}/src/pages/VoyagePage.jsx";`,
    `window.__R46go = (json, k) => createRoot(document.getElementById('root')).render(React.createElement(VoyagePage, { voyageKey: k, voyage: JSON.parse(json), inspector: '연막', inspectors: [], portMisData: {}, pilotForecast: {}, onGoHome() {}, onModeChange() {}, initModeOverride: 'loading' }));`,
  ].join('\n'));
  execSync(`npx esbuild "${eF}" --bundle --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.jpg=dataurl --loader:.webp=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${oF}"`, { cwd: ROOT, stdio: 'pipe' });
  const vSrc = fs.readFileSync(oF, 'utf8');

  const open = async (policies, asked = {}, noList = false) => {
    const v = { key: VK, info: clone(OB.info), loading: clone(OB.loading), discharge: { ediContainers: {}, completed: {}, records: {} }, photoIndex: {}, reports: {} };
    for (const k of Object.keys(v.info)) if (/Done|depart|workEnd|archiv/i.test(k)) delete v.info[k];
    v.loading.completed = {};   // 선적 시작 전 — 화면이 처음 열릴 때
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const W = dom.window, errs = [];
    W.addEventListener('error', (ev) => errs.push(ev.message)); W.console.warn = () => {}; W.console.log = () => {};
    W.matchMedia = W.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    W.scrollTo = () => {}; W.HTMLElement.prototype.scrollIntoView = function () {};
    W.global = W; W.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } }; W.alert = () => {};
    W.localStorage.setItem('gm_equip_no', '4호기');
    W.localStorage.setItem('master_active_inspector_v1', '연막');
    W.__memdb = { voyages: { [VK]: clone(v) }, shipPolicies: clone(policies), policyAsked: clone(asked) };
    if (noList) W.__memNoValue = (p) => p === 'shipPolicies';   // 정책 목록이 안 온다(통신 끊김)
    try { W.eval(vSrc); W.__R46go(JSON.stringify(v), VK); } catch (er) { errs.push('THROW ' + er.message); }
    await sleep(1500);   // 묻기 효과의 비동기(로컬 기록 → 보관소 확인 → 창)가 끝날 시간
    const txt = W.document.body.textContent.replace(/\s+/g, ' ');
    const r = { asked: ASK.test(txt), mark: (W.__memdb.policyAsked && W.__memdb.policyAsked['연막']) || null, ls: W.localStorage.getItem('policyAsked:OBWH'), errs, rendered: /선적/.test(txt) };
    W.close();
    return r;
  };

  //  ① 정책이 있는 배(보관소 그대로) — 창이 안 뜨고 «물었음» 기록도 안 남는다
  { const r = await open({ OBWH: POL_OBWH });
    ok(`①-1 OBWH 정책 «일반» 이 있는 배 — 선적 화면을 열어도 «선박 실 정책» 창이 안 뜬다`, r.rendered && !r.asked && !r.errs.length, JSON.stringify({ asked: r.asked, rendered: r.rendered, errs: r.errs.slice(0, 2) }));
    ok(`①-2 «물었음» 기록(보관소 policyAsked · 기기)도 안 남는다 — 물은 적이 없으니`, !r.mark && !r.ls, JSON.stringify({ mark: r.mark, ls: r.ls })); }
  //  ② 엠티실 확인 정책(TNJP 같은 «verify») 이 이 배에 있어도 같다 — 정책 종류와 무관
  { const r = await open({ OBWH: { ...POL_OBWH, mode: 'verify' } });
    ok(`② 정책 «엠티실 확인» 인 배도 창이 안 뜬다`, r.rendered && !r.asked && !r.errs.length, JSON.stringify({ asked: r.asked, errs: r.errs.slice(0, 2) })); }
  //  ③ 처음 오는 배(정책 목록에 없음) — 종전대로 묻는다(1.83 «신규만 묻는다»)
  { const r = await open({ DJCF: { ...POL_OBWH, name: 'DJCF' } });
    ok(`③ 정책 목록에 없는 배는 종전대로 «선박 실 정책» 창이 뜬다(처음 오는 배만)`, r.asked && !r.errs.length, JSON.stringify({ asked: r.asked, mark: r.mark, errs: r.errs.slice(0, 2) })); }
  //  ⑤ 정책 목록을 못 받으면(통신 끊김) 묻지 않는다 — 모르면 «정책 없음» 이라 하지 않는다
  { const r = await open({}, {}, true);
    ok(`⑤ 정책 목록을 못 받으면(통신 끊김) 정책 없는 배라도 묻지 않고 «물었음» 기록도 안 남긴다`, r.rendered && !r.asked && !r.mark && !r.ls && !r.errs.length, JSON.stringify({ asked: r.asked, mark: r.mark, ls: r.ls, errs: r.errs.slice(0, 2) })); }
  //  ④ 오늘 이미 물은 배(정책 없음) — 하루 한 번은 그대로
  { const today = new Date().toISOString().slice(0, 10);
    const r = await open({}, { 연막: { OBWH: today } });
    ok(`④ 정책 없는 배라도 오늘 이미 물었으면 다시 안 뜬다(하루 한 번 — 종전 그대로)`, !r.asked && !r.errs.length, JSON.stringify({ asked: r.asked, errs: r.errs.slice(0, 2) })); }
};

if (require.main === module) {
  process.env.TZ = 'Asia/Seoul';
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'r46_'));
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx, stub: './tools/stub_fbdb_mem.js' })
    .then(() => { console.log(`\nR46 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((e) => { console.error('✗ R46 오류', e && e.stack || e); process.exit(1); });
}
