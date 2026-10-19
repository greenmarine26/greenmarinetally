// 회귀 기준표 R34 — 수석 상황판(4.24) 컴·폰 배치 · 문 전수 · NaN · 위험 구역 · 조회만. smoke_regress.cjs 가 부른다(크로뮴으로 실제 그려 잰다).
//   검수사 2026-10-12 19:42 «검수앱과 수석대쉬보드의 폰화면과 컴퓨터의 화면이 복잡하고 난해 합니다. 화면 구성을 바꿨으면 합니다. 간결하고 보기 좋게»
//   · «칩(수석)은 근무중 켜놀것이고 전 필요 할때만 컴과 폰으로 봅니다» · 불편 «한 화면에 항목이 너무 많다 · 글자가 작아 안 보인다 · 어디에 뭐가 있는지 찾기 어렵다»
//   · B13 «페이지 스크롤이 생기면 불편합니다» · D1~D4 «세로로 4등분해서 최대 4척 … 5척이면 스크롤» · D9 «수석은 한번 실수로 … 많은 자료를 잃을수가» · 2026-10-13 00:53 «전부 클로드 안대로 수정하고 배포».
//   ⚠ 기대값은 코드에서 베끼지 않는다 — 대수는 픽스처 원자료에서 이 파일이 규칙대로 따로 세고(평택 양하분 = 세관 목록 + 추가분 · 선적 = 리스트 행),
//     배치 기준(보드 머리 = 상태 줄 바로 밑 · 페이지 스크롤 0 · 척수 등분 · 폰 4장 한 화면 · 크게 856px)은 설계(proposal ③ · shots_new 실측)에서 왔다.
//   실행: smoke_regress.cjs 안에서 — require('./regress_r34_chief.cjs')({ ROOT, TMP, ok, head, fx, stub })
//         단독 — node tools/regress_r34_chief.cjs <저장소 루트> [빌드 CSS] [캡처 폴더]
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

//  ── 이 파일이 쓰는 독립 판정 — 앱 함수를 부르지 않는다 ──
const PTK_RE = /^(?:KR)?(?:PTK|PYT|PYO|PYOTM)\d{0,2}$|PYEONGTAEK/i;
const isPtkCode = (s) => PTK_RE.test(String(s || '').trim().toUpperCase());
const isListRow = (r) => !!(r && (r._source || r.wt || r.sl || r.pol || r.pod || r.sh || r.bl || r.op || r.tmp || r.iso));
//  평택 양하분 — 세관 목록(세관 표식이 있으면 그 행만, 없으면 선사 리스트 행 · 선적분(POL 만 평택) 제외) + 추가분(EDI POD 평택 ∪ 완료 ∪ 터미널 실적 − 목록). 목록이 없으면 EDI POD 평택.
const unitsDis = (sec) => {
  const E = (sec && sec.ediContainers) || {}, R = (sec && sec.records) || {}, C = (sec && sec.completed) || {}, T = (sec && sec.termWork) || {};
  const rows = Object.entries(R).filter(([cn, r]) => cn && !cn.startsWith('_') && isListRow(r) && !(!isPtkCode(r.pod) && isPtkCode(r.pol)));
  const cust = rows.filter(([, r]) => r._customs);
  const L = new Set((cust.length ? cust : rows).map(([cn]) => cn));
  const ediPtk = Object.entries(E).map(([k, e]) => [String((e && e.cn) || k), e]).filter(([cn, e]) => e && cn && !cn.startsWith('_') && !e.isBooking && isPtkCode(e.pod)).map(([cn]) => cn);
  if (!L.size) return new Set(ediPtk);
  const X = [...ediPtk, ...Object.keys(C).filter((k) => C[k] && C[k].flag !== 'missing'), ...Object.keys(T)].filter((cn) => cn && !cn.startsWith('_') && !L.has(cn));
  return new Set([...L, ...X]);
};
//  평택 선적분 — 선적 리스트 행(반대 방향 = POD 만 평택인 양하분 제외). 리스트가 없으면 EDI POL 평택.
const unitsLoa = (sec) => {
  const E = (sec && sec.ediContainers) || {}, R = (sec && sec.records) || {};
  const L = Object.entries(R).filter(([cn, r]) => cn && !cn.startsWith('_') && isListRow(r) && !(isPtkCode(r.pod) && !isPtkCode(r.pol))).map(([cn]) => cn);
  if (L.length) return new Set(L);
  return new Set(Object.entries(E).filter(([, e]) => e && isPtkCode(e.pol)).map(([k, e]) => String(e.cn || k)));
};
const doneOf = (sec, set) => Object.keys((sec && sec.completed) || {}).filter((cn) => set.has(cn)).length;
const pct = (d, n) => (n > 0 ? Math.min(100, Math.round((d / n) * 100)) : 0);

//  ── 옛 수석 대시보드(4.23-01)의 문 전수 — 소스(ChiefDashboard.jsx c129772)에서 뽑은 바로가기 21 · 접힘 19 · 맨 위 단추·창 ──
//    [옛 자리, 새 자리, 검사 이름] — 검사는 아래 DOORS 의 같은 이름이 새 자리에서 실제로 여는지 본다(창이 뜨는가 · 자리로 가는가 · 펴지는가).
const OLD_DOORS = [
  ['제목 «수석 검수원 대시보드 · 전체 현황»', '상태 줄 «수석 상황판»', 'title'],
  ['수집기 상태 배너(🟢 수집기 vX · N분 전 갱신 · 주기 / 🔴 끊김)', '상태 줄 «● 수집기 N분 전» 칩(→ 항차 건강 점검)', 'collector'],
  ['배너 [✓ 항차 검증 이상 없음 / ⚠ 검증 필요 N항차] (→ #/health)', '상태 줄 «✓ 검증 이상 없음» 칩', 'health'],
  ['BigStat «전체 확인 N / N대»', '없앰 — 보드 행 아래 «완료/전체 (%)» 가 그 숫자(NaN 수리)', 'bigstat'],
  ['BigStat «누락 (선사 추가 필요)»', '상태 줄 «누락 N» 칩(→ 관리 › 자료 › 자료 현황)', 'missing'],
  ['검색 입력칸 + [🔍] (통합검색 · 미르에게 질문)', '없앰(B1) — 통합 검색 화면은 관리 › 사람·알림 «🔍 통합 검색»', 'noSearchBox'],
  ['[🔄 데이터 새로고침]', '관리 › 자료 «🔄 데이터 새로고침»', 'refresh'],
  ['인라인 통합검색 패널(✕ 닫기)', '관리 › 사람·알림 «🔍 통합 검색» 접힘', 'search'],
  ['붉은 배너 «❌ 오답 N건 — 아직 회신 안 함»', '상태 줄 «❌ 오답 N» 칩(→ 관리 › 사람·알림 › 오답 리포트)', 'feedbackChip'],
  ['TOP 버튼', '그대로(진행·마감·관리 탭 · 폰)', 'top'],
  ['바로가기 ⚓ 작업 보드 · 접힘 ⚓ 실시간 작업 보드', '⚓ 상황판 탭(첫 화면 전체)', 'boardTab'],
  ['보드 머리 «확대 − 100% +»', '상태 줄(상황판 탭) «확대 − 100% +»', 'zoom'],
  ['보드 카드 [⤢ 크게]·[✕ 닫기]·카드 누르기', '그대로(보드 행)', 'focus'],
  ['보드 카드 [항차 열기 →]', '그대로(보드 행)', 'openVoyage'],
  ['바로가기 📋 진행 상황 · 접힘 📋 진행 상황 · 완료 저장', '📋 진행·마감 탭 왼쪽', 'progressTab'],
  ['진행 줄 [🚢 선박명](항차 열기)', '그대로(진행·마감 탭)', 'progressVessel'],
  ['진행 줄 [✓ 수석 완료 저장]/[🔒 수석 전용]/«검수 진행 중»', '그대로(진행·마감 탭)', 'progressComplete'],
  ['진행 줄 [실선적 EDI]·[실선적 ASC]·[수정 엑셀]·[엑셀→EDI]', '그대로(진행·마감 탭)', 'progressEdi'],
  ['진행 줄 [🏗 터미널 실적 반영 N] (반영 대기 있을 때)', '그대로(진행·마감 탭 — 판정 computeTermApply 그대로)', 'progressTerm'],
  ['진행 상황의 자료 없는 예정 항차 줄(양하 0 선적 0)', '진행·마감 «⏳ 자료 대기 N척» 접힘 — 펼치면 종전 줄', 'waiting'],
  ['바로가기 📑 마감 텔리 · 접힘 📑 마감 텔리', '진행·마감 › 📑 마감 텔리', 'tally'],
  ['바로가기 🗄 완료 보관소 · 접힘 🗄 완료 보관소 (복원)', '진행·마감 › 🗄 완료 보관소', 'restore'],
  ['바로가기 📚 자료 보관소 · 접힘 📚 선박별 자료 보관소', '진행·마감 › 📚 선박별 자료 보관소', 'archive'],
  ['바로가기 🏗 장비 보고 · 접힘 🏗 오늘 장비별 작업 보고(보고 있을 때만)', '진행·마감 › 🏗 오늘 장비별 작업 보고(없어도 문)', 'equip'],
  ['바로가기 📤 작업 보고 · 접힘 📤 최근 작업 보고 (30건) · 보고별 🗑', '진행·마감 › 📤 최근 작업 보고(보고별 🗑 그대로)', 'reports'],
  ['📤 최근 작업 보고 머리 [전체 삭제 (테스트용)]', '관리 › 👑 소유자 메뉴 › ⚠ 위험 구역(한 번 더 묻기)', 'clearAll'],
  ['바로가기 📦 자료 현황/부족 N · 접힘 📦 자료 현황', '관리 › 자료 › 📦 자료 현황', 'ready'],
  ['바로가기 🧱 베이매트릭스(창)', '관리 › 자료 › 🧱 베이매트릭스(창)', 'baymatrix'],
  ['바로가기 📸 PORT-MIS 캡처(창)', '관리 › 자료 › 📸 PORT-MIS 캡처(창)', 'portmis'],
  ['바로가기 📍 부두 좌표 등록(창)', '관리 › 자료 › 📍 부두 좌표 등록(창)', 'pier'],
  ['바로가기 🔎 머스크 엠티 · 접힘 🔎 머스크 엠티 찾기', '관리 › 자료 › 🔎 머스크 엠티 찾기', 'emptyfind'],
  ['바로가기 🔒 엠티 실 · 접힘 🔒 엠티 실 작업 현황(있을 때만)', '관리 › 자료 › 🔒 엠티 실 작업 현황(없어도 문)', 'seal'],
  ['바로가기 🚛 LOLO · 접힘 🚛 LOLO 검수 제출 리스트(있을 때만)', '관리 › 자료 › 🚛 LOLO(없어도 문)', 'lolo'],
  ['바로가기 👷 검수원 · 접힘 👷 검수원 활동', '관리 › 사람·알림 › 👷 검수원 활동', 'inspectors'],
  ['바로가기 📢 공지 · 접힘 📢 검수원 공지 작성', '관리 › 사람·알림 › 📢 검수원 공지 작성', 'notice'],
  ['바로가기 ❌ 오답 · 접힘 ❌ 오답 리포트(📥 파일로 저장·🧹 비우기·해결된 것도)', '관리 › 사람·알림 › ❌ 오답 리포트', 'feedback'],
  ['바로가기 🔍 통합 검색', '관리 › 사람·알림 › 🔍 통합 검색', 'search2'],
  ['카페리 17시 창(저절로) · 보고 보관 단추', '그대로 + 관리 › 사람·알림 «📋 17시 카페리 작업보고 — 보관한 보고 보기»', 'ferry'],
  ['바로가기 🧰 보조기능(화면 이동)', '관리 › 사람·알림 › 🧰 보조기능', 'aux'],
  ['바로가기 🖐 편집 · 접힘 🖐 베이상세 편집 · 📐 컨펌용 플랜편집(선박 단추 → 창)', '관리 › 편집 (주의)(빨간 테두리 · «작업 중인 배는 끝난 뒤에»)', 'edit'],
  ['바로가기 👑 소유자 메뉴 · 접힘 👑 소유자 메뉴(소유자만)', '관리 › 👑 소유자 메뉴(소유자만)', 'ownerGroup'],
  ['소유자 메뉴 › 🕰 교대 시각 터미널 기준', '관리 › 👑 소유자 메뉴 › 🕰', 'shiftsnap'],
  ['소유자 메뉴 › 🕵️ 활동 로그', '관리 › 👑 소유자 메뉴 › 🕵️', 'actlog'],
  ['소유자 메뉴 › 👥 인원 관리(창)', '관리 › 👑 소유자 메뉴 › 👥 인원 관리', 'staff'],
  //  ['소유자 메뉴 › 🏁 마감적용', …, 'closingedi'] — 4.39 에 메뉴째 없앴다(검수사 2026-10-19 «메뉴 자체도 없애주세요»). 없어진 것은 ⑤-1 이 잰다.
  ['보드 그림 칸 → 컨 상세 창', '그대로(보드 행 · 폰 시트)', 'cellDetail'],
];

module.exports = async function r34({ ROOT, TMP, ok, head, fx, stub, css = '', shots = '' }) {
  head('R34 수석 상황판(4.24) — 컴: 상태 줄 + 탭 셋 · 보드가 첫 화면 전폭(머리 = 상태 줄 밑 · 페이지 스크롤 0 · 1/2/4척 등분 · 5척 보드 안 스크롤 · 통계 칸 표/한 줄 요약) · 폰: 카드 4장 한 화면 · 카드 → 전체화면 시트 · 문 전수(옛 바로가기 21·접힘 19·단추·창이 새 자리에서 열림) · NaN 0 · 위험 구역 한 번 더 묻기 · 조회만 같은 배치 (4.24)',
    '검수사 2026-10-12 19:42 «화면 구성을 바꿨으면 합니다. 간결하고 보기 좋게» · «칩(수석)은 근무중 켜놀것이고 전 필요 할때만 컴과 폰으로 봅니다» · B13 · D1~D4 · D9 · 2026-10-13 00:53 «전부 클로드 안대로 수정하고 배포» · 06:08 «테스트 보다 앱의 무결점이 중요»');
  const idx = fs.existsSync(path.join(ROOT, 'index.html')) ? fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') : '';
  const cssRel = (idx.match(/href="\.\/(assets\/index-[\w-]+\.css)"/) || [])[1];
  const cssPath = css || (cssRel ? path.join(ROOT, cssRel) : '');
  if (!cssPath || !fs.existsSync(cssPath)) { ok('빌드된 CSS(assets/index-*.css)가 있다 — 없으면 화면을 잴 수 없다', false, cssRel || '없음'); return; }
  let pw;
  try { pw = require(path.join(ROOT, 'node_modules/playwright')); } catch (e) { try { pw = require('playwright'); } catch (e2) { pw = null; } }
  if (!pw || !CHROME) { ok('playwright·크로뮴이 있다 — 모양을 잴 수 없으면 올리지 않는다', false, `${!!pw} · ${CHROME || '없음'}`); return; }

  //  배선 — App 이 본문·바닥글에 표식을 달아야 컴 상황판 탭이 화면 한 장이 된다(이 검사의 셸은 App 의 그 두 줄을 그대로 흉내 낸다)
  const APP = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
  ok('배선 — App.jsx 본문 <main className="pb-20" data-app-main> · 바닥글 data-app-footer (상황판 탭 화면 한 장 표식)', /<main className="pb-20" data-app-main="1">/.test(APP) && /<footer className="text-center text-xxs text-dim-500 pb-24 pt-4 leading-relaxed" data-app-footer="1">/.test(APP));

  const F = fx('chief424_board.json');
  const REP = fx('equip_reports_real.json');
  const NOW = F.now;
  const WAIT = Object.keys(F.voyages).filter((k) => !F.voyages[k].discharge && !F.voyages[k].loading);   // 구역 없는 항차(자료 대기) — 원자료에서 센다
  const WORKERS = ['장문영', '김판석', '최관식', '길태윤', '최유택', '천희준'];

  const e = path.join(TMP, 'r34.jsx'), o = path.join(TMP, 'r34.js');
  fs.writeFileSync(e, [
    `import React from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import Header from "${ROOT}/src/components/Header.jsx";`,
    `import ChiefDashboard from "${ROOT}/src/pages/ChiefDashboard.jsx";`,
    `import { APP_VERSION } from "${ROOT}/src/utils.js";`,
    `import { setActiveWorkChoice } from "${ROOT}/src/workChoice.js";`,
    `let root = null;`,
    `window.__calls = [];`,
    `const call = (fn) => (...a) => { window.__calls.push({ fn, a: a.map((x) => (x && typeof x === 'object' ? '[obj]' : x)) }); };`,
    `window.__R34 = { APP_VERSION,`,
    `  unmount() { if (root) { root.unmount(); root = null; } },`,
    `  mount(p) {`,
    `    const voyages = JSON.parse(p.voyagesJson);`,
    `    const wc = p.view ? { mode: 'view' } : { mode: 'work', voyageKey: '' };`,
    `    setActiveWorkChoice(wc);`,
    //  App.jsx 의 셸 그대로 — 머리띠 · <main pb-20 data-app-main> · 바닥글(data-app-footer)
    `    const el = React.createElement('div', { className: 'min-h-screen bg-ink-950 text-dim-100' },`,
    `      React.createElement(Header, { version: APP_VERSION, inspector: p.inspector, online: true, route: { name: 'chief' }, voyages, workChoice: wc, onChangeWork() {}, onChangeInspector() {}, onOpenStaffManager: null, onGoHome() {}, onOpenAux() {}, onLogout() {} }),`,
    `      React.createElement('main', { className: 'pb-20', 'data-app-main': '1' },`,
    `        React.createElement(ChiefDashboard, { voyages, inspectors: p.inspectors, inspector: p.inspector, collectorHb: p.hb, pilotForecast: {}, portMisData: {},`,
    `          onRefreshData: call('refresh'), refreshing: false, refreshedAt: 0, onOpenVoyage: call('openVoyage'), onGoHome: call('home'), onMirPlan: call('plan'), onOpenGlobalSearch: call('search'),`,
    `          onOpenStaffManager: p.owner ? call('staff') : null })),`,
    `      React.createElement('footer', { className: 'text-center text-xxs text-dim-500 pb-24 pt-4 leading-relaxed', 'data-app-footer': '1' }, '© 2026 (주)그린마린(Green Marine) · 개발 연지아빠'));`,
    `    if (!root) root = createRoot(document.getElementById('root'));`,
    `    root.render(el);`,
    `  } };`,
  ].join('\n'));
  execSync(`npx esbuild "${e}" --bundle --format=iife --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --define:global=window --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const html = path.join(TMP, 'r34.html');
  fs.writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="file://${cssPath}"></head><body><div id="root"></div><script src="file://${o}"></script></body></html>`);

  //  메모리 RTDB 씨앗 — 작업 보고(equip_reports_real 원자료 273건)·오답(픽스처 feedback 10건). 쓰기는 window.__memlog 에 쌓인다.
  const seed = { voyages: {}, feedback: F.feedback || {} };
  for (const r of REP.reports || []) {
    const vk = r.voyageKey; if (!vk) continue;
    const v = seed.voyages[vk] || (seed.voyages[vk] = { info: (REP.infos || {})[vk] || {}, reports: {} });
    v.reports[r.ts] = r;
  }
  const seedJson = JSON.stringify(seed);
  const actOf = (keys) => Object.fromEntries(keys.map((k, i) => [WORKERS[i], { name: WORKERS[i], lastActive: NOW - 10000, lastVoyage: k, lastMode: F.voyages[k].discharge ? 'discharge' : 'loading', workMode: 'work', loggedIn: true }]));
  const vsetOf = (keys) => JSON.stringify(Object.fromEntries([...keys, ...WAIT].map((k) => [k, F.voyages[k]])));
  const hb = { ...F.collector_heartbeat };

  const browser = await pw.chromium.launch({ executablePath: CHROME });
  const perr = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Seoul', locale: 'ko-KR' });
    //  실서비스 Firebase·구글 API 로 나가는 요청은 전부 막는다(미르 설정 REST 읽기 등 기존 코드의 GET 도 밖으로 안 나감).
    //  읽기 아닌 요청(POST·PUT·PATCH·DELETE — 오류 경계의 claude_inbox 보고 등)은 시도 자체가 ⑦ ✘.
    const netOut = [];
    await ctx.route(/firebasedatabase\.app|firebaseio\.com|googleapis\.com|google\.com|gstatic\.com/, (rt) => {
      const rq = rt.request(); netOut.push({ m: rq.method(), u: rq.url().replace(/^https?:\/\/[^/]+/, '').split('?')[0].slice(0, 60) }); return rt.abort();
    });
    const pg = await ctx.newPage();
    pg.on('pageerror', (er) => perr.push(String(er).slice(0, 200)));
    await pg.clock.setFixedTime(new Date(NOW));   // 사본 시각(2026-10-12 20:16 KST) — «작업 중»·«N분 전» 판정이 빌드 날짜와 무관하게
    await pg.goto('file://' + html); await sleep(300);
    const mount = async ({ w, h, mode = 'normal', keys, inspector = '김성일', owner = true, view = false, active = keys }) => {
      await pg.setViewportSize({ width: w, height: h });
      await pg.evaluate(({ mode, seedJson }) => {
        window.__R34.unmount();
        window.scrollTo(0, 0);
        try { location.hash = ''; } catch (er) { /* 해시 */ }
        if (mode === 'large') document.documentElement.setAttribute('data-text', 'large'); else document.documentElement.removeAttribute('data-text');
        try { localStorage.setItem('gm_board_zoom', '1'); } catch (er) { /* 저장 막힘 */ }
        window.__memdb = JSON.parse(seedJson); window.__memlog = []; window.__calls = [];
      }, { mode, seedJson });
      await pg.evaluate((p) => window.__R34.mount(p), { voyagesJson: vsetOf(keys), inspector, owner, view, hb, inspectors: actOf(active) });
      await sleep(900);
    };
    const shot = async (name) => { if (shots) { fs.mkdirSync(shots, { recursive: true }); await pg.screenshot({ path: path.join(shots, name + '.png') }); } };
    const MPC = () => pg.evaluate(() => {
      const q = (s) => document.querySelector(s); const R = (el) => (el ? el.getBoundingClientRect() : null);
      const de = document.documentElement; const strip = q('[data-chief-strip]'); const board = q('[data-chief-board="pc"]');
      const vis = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
      const rows = [...document.querySelectorAll('[data-board-row]')].map((el) => {
        const b = R(el), st = el.querySelector('.lsc-stat');
        return { key: el.dataset.boardRow, top: Math.round(b.top), h: Math.round(b.height), statH: st ? Math.round(R(st).height) : 0,
          compact: vis(el.querySelector('[data-board-compact]')), tables: vis(el.querySelector('.lsc-tables')), foot: ((el.querySelector('[data-board-foot]') || {}).innerText || '').replace(/\s+/g, ' ').trim(),
          //  별첨 표 칸 넘침 — 숫자가 칸 밖으로(«106/106» 이 옆 칸과 겹침)
          tdOver: vis(el.querySelector('.lsc-tables')) ? [...el.querySelectorAll('.lsc-tables td')].filter((td) => td.scrollWidth > td.clientWidth + 1).length : 0,
          //  한 줄 요약이 반쯤 잘린 줄 — 요약 칸에 보이는 줄이 제 글자 높이보다 눌렸거나(두 줄이 반씩 겹쳐 보임) 칸 아래 끝에 걸쳐 위쪽만 보이는 줄.
          //    줄은 다 보이거나 아예 안 보여야 한다(칸 밖 오른쪽으로 넘어간 줄은 안 보이는 줄).
          //    4.24 2차(감사 하-1 · 모의 확인 중하-2): 칸 밖(오른쪽)으로 넘겨 숨긴 줄도 «사라진 줄» 로 센다 — 요약이 «없는 배» 로 읽혔다.
          //    칸이 위아래로 스크롤되면(overflow-y auto) 아래 끝에 걸친 줄은 스크롤로 닿으니 허용한다(4.23-01 별첨 표와 같은 방식).
          halfLine: (() => { const cb = el.querySelector('[data-board-compact]'); if (!vis(cb)) return 0; const B = R(cb); const scrollY = /auto|scroll/.test(getComputedStyle(cb).overflowY);
            return [...cb.children].filter((ln) => { const b = R(ln); if (b.left >= B.right - 1) return true;
              if (ln.scrollHeight > ln.clientHeight + 1) return true;
              return !scrollY && b.top < B.bottom - 1 && b.bottom > B.bottom + 1; }).length; })() };
      });
      return { vh: window.innerHeight, stripBottom: strip ? Math.round(R(strip).bottom) : null, stripH: strip ? Math.round(R(strip).height) : null, boardTop: board ? Math.round(R(board).top) : null, boardH: board ? Math.round(R(board).height) : null,
        boardOver: board ? board.scrollHeight - board.clientHeight : null, pageOver: de.scrollHeight - window.innerHeight, hOver: de.scrollWidth - de.clientWidth,
        rows, tabs: document.querySelectorAll('button[data-chief-tab]').length, layout: (q('[data-chief-root]') || {}).dataset?.chiefLayout,
        nan: /NaN/.test((q('[data-chief-root]') || {}).innerText || ''), strip: strip ? strip.innerText.replace(/\s+/g, ' ').trim() : '',
        chipShown: [...document.querySelectorAll('[data-f1700-chip]')].some((c) => getComputedStyle(c).display !== 'none') };
    });

    //  ① 컴 — 1440×900 · 1920×1080 × 보통·크게 × 1·2·4·5척
    const SETS = { 1: ['OBWH_2763E'], 2: ['OBWH_2763E', 'ATPR_2645E'], 4: ['OBWH_2763E', 'ATPR_2645E', 'NSFR_2619N', 'XTPG_544E'], 5: ['OBWH_2763E', 'ATPR_2645E', 'NSFR_2619N', 'XTPG_544E', 'KKAK_2610N'] };
    const pcRows = [];
    for (const [w, h] of [[1440, 900], [1920, 1080]]) for (const mode of ['normal', 'large']) for (const n of [1, 2, 4, 5]) {
      await mount({ w, h, mode, keys: SETS[n] });
      const m = await MPC();
      pcRows.push({ w, h, mode, n, m });
      if (n === 4 || n === 1) await shot(`pc${w}_${mode}_b${n}`);
    }
    //  컴 경계 바로 위 1024×768(작은 노트북 · 상태 줄이 두 줄로 접힌다) · 1366×768(흔한 노트북) — 머리·페이지 스크롤·통계 칸만 잰다(4척이 10rem 하한에 걸리면 보드 안 스크롤은 허용)
    const edgeRows = [];
    for (const [w, h] of [[1024, 768], [1366, 768]]) for (const mode of ['normal', 'large']) { await mount({ w, h, mode, keys: SETS[4] }); edgeRows.push({ w, h, mode, n: 4, m: await MPC() }); await shot(`pc${w}_${mode}_b4`); }
    const bad1 = [...pcRows, ...edgeRows].filter(({ m }) => !(m.boardTop != null && m.stripBottom != null && m.boardTop - m.stripBottom >= 0 && m.boardTop - m.stripBottom <= 12) || m.boardTop + m.boardH > m.vh || m.vh - (m.boardTop + m.boardH) > 12);
    ok(`①-1 컴 상황판 탭 첫 화면 — 보드 머리가 상태 줄 바로 밑 · 보드 바닥이 화면 바닥(12px 안)(20장면 · 1440 보통 4척: 상태 줄 밑 ${pcRows[2].m.stripBottom}px · 보드 ${pcRows[2].m.boardTop}~${pcRows[2].m.boardTop + pcRows[2].m.boardH}/${pcRows[2].m.vh}px · 1920 크게 4척 ${pcRows[14].m.stripBottom}→${pcRows[14].m.boardTop}px · 1024×768 크게 상태 줄 밑 ${edgeRows[1].m.stripBottom}px → 보드 ${edgeRows[1].m.boardTop}~${edgeRows[1].m.boardTop + edgeRows[1].m.boardH}px)`,
      !bad1.length, JSON.stringify(bad1.map((r) => [r.w, r.mode, r.n, r.m.stripBottom, r.m.boardTop, r.m.boardH, r.m.vh])).slice(0, 400));
    const bad2 = [...pcRows, ...edgeRows].filter(({ m }) => m.pageOver > 1 || m.hOver > 1 || m.chipShown);
    ok(`①-2 컴 페이지 스크롤 0 — 세로(문서 높이 − 화면) ${[...new Set([...pcRows, ...edgeRows].map((r) => r.m.pageOver))].join('/')}px · 가로 ${[...new Set([...pcRows, ...edgeRows].map((r) => r.m.hOver))].join('/')}px (1440·1920 × 보통·크게 × 1·2·4·5척 · 1024·1366×768 보통·크게) · 보드를 가리는 떠 있는 «보고 보관» 단추 0`,
      !bad2.length, JSON.stringify(bad2.map((r) => [r.w, r.mode, r.n, r.m.pageOver, r.m.hOver, r.m.chipShown])).slice(0, 400));
    const bad3 = pcRows.filter(({ n, m }) => {
      if (m.rows.length !== n) return true;
      if (n <= 4) { const hs = m.rows.map((r) => r.h); return m.boardOver > 1 || Math.max(...hs) - Math.min(...hs) > 3 || Math.abs(hs[0] - (m.boardH - 4 * (n - 1)) / n) > 4; }
      const hs4 = m.rows.slice(0, 4).map((r) => r.h);   // 5척 — 넷이 한 화면 등분, 다섯째부터 보드 안 스크롤
      return !(m.boardOver > 20) || Math.max(...hs4) - Math.min(...hs4) > 3 || Math.abs(hs4[0] - (m.boardH - 12) / 4) > 8;
    });
    ok(`①-3 척수 등분 — 1·2·4척은 보드 높이를 N 등분(행 높이 차 ≤ 3px · 보드 안 넘침 0) · 5척은 네 행이 한 화면이고 보드 안에서 스크롤(1440 보통 5척 넘침 ${pcRows[3].m.boardOver}px · 행 ${pcRows[3].m.rows.slice(0, 4).map((r) => r.h).join('/')}px)`,
      !bad3.length, JSON.stringify(bad3.map((r) => [r.w, r.mode, r.n, r.m.rows.length, r.m.boardH, r.m.boardOver, r.m.rows.map((x) => x.h)])).slice(0, 500));
    //  ①-5 4.24 2차(모의 확인 중하-3) — 1366×768(흔한 노트북) 보통 4척이 한 화면: 보드 안 넘침 0 · 상태 줄 한 줄(행 하한 9rem · «등록 N척» 은 1500px 이상만)
    const e1366 = edgeRows.find((r) => r.w === 1366 && r.mode === 'normal').m;
    ok(`①-5 1366×768 보통 4척 — 보드 안 넘침 ${e1366.boardOver}px · 행 ${e1366.rows.map((r) => r.h).join('/')} · 상태 줄 높이 ${e1366.stripH}px(한 줄)`,
      e1366.boardOver <= 1 && e1366.rows.length === 4 && e1366.stripH <= 64, JSON.stringify({ over: e1366.boardOver, rows: e1366.rows.map((r) => r.h), stripH: e1366.stripH, strip: e1366.strip }).slice(0, 300));
    //  ①-6 4.24 2차(모의 확인 중-1) — 위 띠가 줄거나 늘어도(수석 공지 띠 [확인] · 글자 크게↔보통) 보드 바닥이 화면 바닥을 따라간다.
    //      페이지 스크롤이 없어 문서 크기가 그대로라 종전 신호(창 크기·스크롤·본문 크기)로는 안 다시 재서 바닥에 42~52px 빈 띠가 남았다.
    {
      await mount({ w: 1440, h: 900, mode: 'large', keys: SETS[4] });
      const gapOf = () => pg.evaluate(() => { const b = document.querySelector('[data-chief-board="pc"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { gap: Math.round(window.innerHeight - r.bottom), over: Math.round(r.bottom - window.innerHeight) }; });
      await pg.evaluate(() => document.documentElement.removeAttribute('data-text')); await sleep(1500);
      const gText = await gapOf();
      await pg.evaluate(() => { const st = document.querySelector('[data-chief-strip]'); const d = document.createElement('div'); d.id = '__r34band'; d.style.height = '34px'; st.parentNode.insertBefore(d, st); }); await sleep(1500);
      const gBand = await gapOf();
      await pg.evaluate(() => { const d = document.getElementById('__r34band'); if (d) d.remove(); }); await sleep(1500);
      const gGone = await gapOf();
      ok(`①-6 위 띠가 바뀌어도 보드 바닥 = 화면 바닥 — 크게→보통 바닥 틈 ${gText && gText.gap}px · 띠 34px 생김 ${gBand && gBand.gap}px · 띠 사라짐 ${gGone && gGone.gap}px(12px 안 · 화면 밖 0)`,
        [gText, gBand, gGone].every((g) => g && g.gap >= 0 && g.gap <= 12), JSON.stringify({ gText, gBand, gGone }));
    }
    const bad4 = [...pcRows, ...edgeRows].filter(({ n, m }) => m.rows.some((r) => (r.statH < 210 ? !(r.compact && !r.tables) : !(r.tables && !r.compact)) || r.tdOver > 0 || r.halfLine > 0) || (n === 1 && !m.rows[0].tables));
    const pcAt = (w, mode, n) => pcRows.find((r) => r.w === w && r.mode === mode && r.n === n).m;
    ok(`①-4 통계 칸 — 칸 높이 < 210px 이면 한 줄 요약 · ≥ 210px 이면 별첨 표(설계 컨테이너 쿼리) · 별첨 표 칸 넘침 0(크게 포함) · 사라지거나 눌리거나 스크롤 없이 잘린 요약 줄 0(1024·1366×768 포함 — 다 안 들어가면 칸 안 스크롤) · 1척은 표(1440 보통 4척 칸 ${pcAt(1440, 'normal', 4).rows.map((r) => `${r.statH}${r.compact ? '요약' : '표'}`).join('/')} · 1920 보통 4척 ${pcAt(1920, 'normal', 4).rows.map((r) => `${r.statH}${r.compact ? '요약' : '표'}`).join('/')} · 1440 크게 2척 ${pcAt(1440, 'large', 2).rows.map((r) => `${r.statH}${r.compact ? '요약' : '표'}`).join('/')})`,
      !bad4.length, JSON.stringify(bad4.map((r) => [r.w, r.mode, r.n, r.m.rows.map((x) => [x.statH, x.compact, x.tables, x.tdOver, x.halfLine])])).slice(0, 500));

    //  ② 폰 — 390×844 · 360×800 × 보통·크게, 4척(카드) · 카드 → 시트
    const MPH = () => pg.evaluate(() => {
      const de = document.documentElement; const cards = [...document.querySelectorAll('[data-phone-ship]')].map((el) => el.getBoundingClientRect());
      const strip = document.querySelector('[data-chief-strip]');
      return { n: cards.length, bottoms: cards.map((c) => Math.round(c.bottom)), vh: window.innerHeight, hOver: de.scrollWidth - de.clientWidth, layout: document.querySelector('[data-chief-root]').dataset.chiefLayout,
        tabs: document.querySelectorAll('button[data-chief-tab]').length, stripBottom: strip ? Math.round(strip.getBoundingClientRect().bottom) : null,
        nan: /NaN/.test(document.querySelector('[data-chief-root]').innerText) };
    });
    const phRows = [];
    for (const [w, h] of [[390, 844], [360, 800]]) for (const mode of ['normal', 'large']) {
      await mount({ w, h, mode, keys: SETS[4] });
      const m = await MPH();
      await shot(`phone${w}_${mode}_board`);
      //  카드 → 시트 → ‹ 보드
      const card0 = await pg.$('[data-phone-ship]');
      if (card0) { await card0.click(); await sleep(900); }
      const s = await pg.evaluate(() => {
        const sh = document.querySelector('[data-chief-sheet]'); if (!sh) return null;
        const r = sh.getBoundingClientRect();
        return { key: sh.dataset.chiefSheet, top: Math.round(r.top), h: Math.round(r.height), vh: window.innerHeight, hOver: sh.scrollWidth - sh.clientWidth,
          legend: /별첨1/.test(sh.innerText), tdOver: [...sh.querySelectorAll('.lsc-tables td')].filter((td) => td.scrollWidth > td.clientWidth + 1).length, bays: [...sh.querySelectorAll('span')].filter((x) => /^BAY[\s(]/.test((x.textContent || '').trim())).length, term: /터미널 본선 현황|본선 작업 현황/.test(sh.innerText),
          barsFirst: (() => { const t = sh.innerText; const a = t.indexOf('양하'), b = t.indexOf('별첨1'); return a >= 0 && b > a; })() };
      });
      await shot(`phone${w}_${mode}_sheet`);
      if (s) { await pg.click('[data-sheet-close]'); await sleep(400); }
      const closed = await pg.evaluate(() => !document.querySelector('[data-chief-sheet]'));
      phRows.push({ w, h, mode, m, s, closed });
    }
    const LARGE_SLACK = 856 - 844;   // 설계 실측 — 390×844 «크게» 4척 856px(proposal ③ 폰)
    const badP1 = phRows.filter(({ mode, m }) => m.n !== 4 || m.bottoms[3] > m.vh + (mode === 'large' ? LARGE_SLACK : 0) || m.layout !== 'phone' || m.tabs !== 3);
    ok(`②-1 폰 카드 4장이 한 화면 — 넷째 카드 바닥 ${phRows.map((r) => `${r.w} ${r.mode === 'large' ? '크게' : '보통'} ${r.m.bottoms[3]}/${r.m.vh}`).join(' · ')}px (크게는 설계 실측 +${LARGE_SLACK}px 까지) · 탭 셋`,
      !badP1.length, JSON.stringify(badP1.map((r) => [r.w, r.mode, r.m])).slice(0, 400));
    const badP2 = phRows.filter(({ m, s }) => m.hOver > 1 || !s || s.hOver > 1);
    ok(`②-2 폰 가로 스크롤 0 — 상황판 ${phRows.map((r) => r.m.hOver).join('/')}px · 시트 ${phRows.map((r) => (r.s ? r.s.hOver : '없음')).join('/')}px`, !badP2.length, JSON.stringify(badP2.map((r) => [r.w, r.mode, r.m.hOver, r.s && r.s.hOver])));
    const badP3 = phRows.filter(({ s, closed }) => !s || s.key !== SETS[4][0] || s.top !== 0 || s.h !== s.vh || !s.legend || s.tdOver > 0 || !(s.bays > 0 || s.term) || !s.barsFirst || !closed);
    ok(`②-3 카드 누르기 → 그 배 전체화면 시트(화면 전체 · 막대 → 별첨 표(칸 넘침 ${phRows.map((r) => (r.s ? r.s.tdOver : '-')).join('/')}) → 베이 그림 ${phRows.map((r) => (r.s ? r.s.bays : 0)).join('/')}장) → [‹ 보드] 로 닫힘`,
      !badP3.length, JSON.stringify(badP3.map((r) => [r.w, r.mode, r.s, r.closed])).slice(0, 400));

    //  ④ NaN — 한쪽 구역 없는 항차(ATPR 양하만 · STMJ 선적만 · KKAK 양하 EDI 만)
    const NK = ['ATPR_2645E', 'STMJ_2663E', 'KKAK_2610N'];
    await mount({ w: 1440, h: 900, mode: 'normal', keys: NK });
    const mN = await MPC();
    const want = Object.fromEntries(NK.map((k) => {
      const v = F.voyages[k];
      const dS = v.discharge ? unitsDis(v.discharge) : new Set(), lS = v.loading ? unitsLoa(v.loading) : new Set();
      const d = doneOf(v.discharge, dS) + doneOf(v.loading, lS), n = dS.size + lS.size;
      return [k, `${d} /${n} (${pct(d, n)}%)`];
    }));
    const gotN = Object.fromEntries(mN.rows.map((r) => [r.key, (r.foot.match(/^(\d+) \/(\d+) \((\d+)%\)/) || [])[0] || r.foot]));
    ok(`④ NaN 0 — 한쪽 구역 없는 항차 보드 아래 합계 = 원자료에서 따로 센 값(${NK.map((k) => `${k.split('_')[0]} ${gotN[k]}`).join(' · ')}) · 상태 줄 «${mN.strip.slice(0, 60)}» · 화면 어디에도 «NaN» 없음`,
      !mN.nan && NK.every((k) => gotN[k] === want[k]) && !/NaN/.test(mN.strip) && /누락 \d+/.test(mN.strip) && /오답 \d+/.test(mN.strip),
      JSON.stringify({ want, gotN, nan: mN.nan }).slice(0, 400));
    const ph4 = await (async () => { await mount({ w: 390, h: 844, keys: NK }); return MPH(); })();
    ok('④-2 폰 카드에도 «NaN» 없음(같은 세 항차)', !ph4.nan && ph4.n === 3, JSON.stringify(ph4));

    //  ③ 문 전수 — 옛 자리 → 새 자리에서 실제로 열리는가(1440 보통 · 소유자 김성일 · 4척 + 자료 대기 7척)
    const st = {};
    const KEYS4 = SETS[4];
    const fresh = async () => { await mount({ w: 1440, h: 900, keys: KEYS4 }); };
    const click = async (sel) => { const h = await pg.$(sel); if (!h) return false; await h.click(); await sleep(350); return true; };
    const tabTo = (t) => click(`button[data-chief-tab="${t}"]`);
    const groupTo = (g) => click(`button[data-chief-group="${g}"]`);
    const foldOpen = async (id, re) => {
      const okc = await click(`[data-fold="${id}"] > button`); if (!okc) return false;
      return pg.evaluate(([id, src]) => { const b = document.querySelector(`[data-fold="${id}"] > div.mt-2`); return !!b && (!src || new RegExp(src).test(b.innerText) || !!b.querySelector(src.startsWith('@') ? src.slice(1) : '__none__')); }, [id, re || '']);
    };
    const fixedHas = (re) => pg.evaluate((src) => [...document.querySelectorAll('body *')].some((el) => getComputedStyle(el).position === 'fixed' && new RegExp(src).test(el.innerText || '')), re);
    const calls = (fn) => pg.evaluate((fn) => (window.__calls || []).filter((c) => c.fn === fn), fn);
    const hash = () => pg.evaluate(() => location.hash);
    const rootText = () => pg.evaluate(() => document.querySelector('[data-chief-root]').innerText);
    await fresh();
    {
      const s0 = await MPC();
      st.title = /수석 상황판/.test(s0.strip) && !/수석 검수원 대시보드/.test(await rootText());
      const title = await pg.evaluate(() => (document.querySelector('[data-chief-chip="collector"]') || {}).title || '');
      st.collector = /수집기 1분 전/.test(s0.strip) && /MailPilot 2\.44-05/.test(title) && (await click('[data-chief-chip="collector"]')) && (await hash()) === '#/health';
      await pg.evaluate(() => { location.hash = ''; });
      st.health = /검증/.test(s0.strip) && (await click('[data-chief-chip="health"]')) && (await hash()) === '#/health';
      await pg.evaluate(() => { location.hash = ''; });
      st.bigstat = !/전체 확인/.test(await rootText()) && s0.rows.every((r) => /^\d+ \/\d+ \(\d+%\)/.test(r.foot));
      st.noSearchBox = !(await pg.evaluate(() => [...document.querySelectorAll('[data-chief-root] input')].some((i) => /통합검색 · 미르에게 질문/.test(i.placeholder || ''))));
      st.boardTab = s0.rows.length === 4 && (await tabTo('progress')) && (await tabTo('board')) && (await MPC()).rows.length === 4;
      //  확대 − 100% +
      const zoomLbl = () => pg.evaluate(() => { const z = document.querySelector('[data-chief-zoom]'); return z ? z.innerText.replace(/\s+/g, ' ') : ''; });
      const z0 = await zoomLbl(); await click('[data-chief-zoom] button[title="크게"]'); const z1 = await zoomLbl(); await click('[data-chief-zoom] button[title="눌러서 기본으로"]'); const z2 = await zoomLbl();
      st.zoom = /100%/.test(z0) && /125%/.test(z1) && /100%/.test(z2) && /작업 중 4척/.test(z0);
      //  ⤢ 크게 → 한 행 → ✕ 닫기 → 넷 · 카드 누르기도 같은 일
      const big = await pg.$$('[data-board-row] button[title^="이 배만"]');
      let f1 = 0, f2 = 0, f3 = 0;
      if (big[1]) { await big[1].click(); await sleep(500); f1 = (await MPC()).rows.length; await click('[data-board-row] button[title^="원래대로"]'); await sleep(300); f2 = (await MPC()).rows.length; }
      //  카드 누르기(그림 칸·단추가 아닌 자리 — 선박명) → 그 배만
      await pg.evaluate(() => { const nm = document.querySelector('[data-board-row] [data-board-vsl]'); if (nm) nm.click(); }); await sleep(500);
      f3 = (await MPC()).rows.length; await click('[data-board-row] button[title^="원래대로"]');
      st.focus = f1 === 1 && f2 === 4 && f3 === 1 && (await MPC()).rows.length === 4;
      const ov = await pg.$$('[data-board-row] button');
      const openBtn = []; for (const b of ov) if (/항차 열기/.test(await b.innerText())) openBtn.push(b);
      if (openBtn[0]) { await openBtn[0].click(); await sleep(200); }
      st.openVoyage = (await calls('openVoyage')).some((c) => c.a[0] === KEYS4[0]);
      //  그림 칸 → 컨 상세 창(그림이 있는 행의 칸 하나)
      const cell = await pg.evaluateHandle(() => { const sc = [...document.querySelectorAll('[data-board-row] div')].filter((x) => /scale\(/.test(x.getAttribute('style') || '')); for (const s of sc) { const c = [...s.querySelectorAll('div')].find((d) => /^\d{4}$/.test((d.textContent || '').trim()) && d.children.length === 0); if (c) return c; } return null; });
      if (cell && (await cell.evaluate((x) => !!x))) { await cell.evaluate((x) => x.click()); await sleep(600); st.cellDetail = await fixedHas('[A-Z]{4}\\d{7}'); } else st.cellDetail = false;
    }
    //  진행·마감 탭
    await fresh(); await tabTo('progress');
    {
      const txt = await rootText();
      st.progressTab = /진행 상황 · 완료 저장/.test(txt);
      //  자료 있는 줄 = 구역이 있는 항차(원자료) · 자료 대기 = 구역 없는 7척
      const liveN = KEYS4.length, waitN = WAIT.length;
      const vbtn = await pg.$$('[data-chief-pane="progress"] button[title="항차 열기"]');
      st.waiting = vbtn.length === liveN && new RegExp(`자료 대기 ${waitN}척`).test(txt);
      if (st.waiting) { await click('[data-waiting-fold]'); st.waiting = (await pg.$$('[data-chief-pane="progress"] button[title="항차 열기"]')).length === liveN + waitN; await click('[data-waiting-fold]'); }
      if (vbtn[0]) { await vbtn[0].click(); await sleep(200); }
      st.progressVessel = (await calls('openVoyage')).length > 0;
      st.progressComplete = await pg.evaluate((n) => { const rows = [...document.querySelectorAll('[data-chief-pane="progress"] button[title="항차 열기"]')].map((b) => b.closest('div.rounded-pill')); return rows.length === n && rows.every((r) => /수석 완료 저장|수석 전용|검수 진행 중/.test(r.innerText)); }, liveN);
      //  선적 EDI 평택분이 있는 항차 = 원자료(선적 EDI POL 평택 > 0) — 그 줄마다 EDI 도구 넷
      const ediN = KEYS4.filter((k) => Object.values((F.voyages[k].loading || {}).ediContainers || {}).some((c) => c && isPtkCode(c.pol))).length;
      st.progressEdi = await pg.evaluate((n) => { const bs = [...document.querySelectorAll('[data-chief-pane="progress"] button')].map((b) => b.innerText.trim()); return ['실선적 EDI', '실선적 ASC', '수정 엑셀', '엑셀→EDI'].every((t) => bs.filter((x) => x === t).length === n); }, ediN) && ediN > 0;
      //  터미널 실적 반영 — 이 사본에는 터미널 실적(termWork)이 없다(원자료) → 단추 없음이 맞다. 판정·단추 소스는 그대로(진행 줄 renderRow)
      const termN = KEYS4.filter((k) => ['discharge', 'loading'].some((m) => Object.keys((F.voyages[k][m] || {}).termWork || {}).length)).length;
      st.progressTerm = termN === 0 && !/터미널 실적 반영/.test(txt);
      st.tally = await foldOpen('tally', 'DEP\\.TALLY REPORT');
      st.restore = await foldOpen('restore', '목록 불러오기');
      st.archive = await foldOpen('archive', '자료 보관소|선박');
      st.equip = await foldOpen('equip', '아직 없습니다|부두');
      st.reports = (await foldOpen('reports', '최근 30건')) && (await pg.$$('[data-fold="reports"] button[title="이 보고 삭제"]')).length === 30 && !/전체 삭제 \(테스트용\)$/.test(await pg.evaluate(() => [...document.querySelectorAll('[data-chief-pane="progress"] button')].map((b) => b.innerText).join('\n')));
      st.top = await pg.evaluate(async () => { window.scrollTo(0, 2000); await new Promise((r) => setTimeout(r, 300)); return [...document.querySelectorAll('button')].some((b) => /TOP/.test(b.innerText) && getComputedStyle(b).position === 'fixed'); });
      await pg.evaluate(() => window.scrollTo(0, 0));
    }
    //  관리 › 자료
    await fresh(); await tabTo('manage');
    {
      const firstGroup = await pg.evaluate(() => (document.querySelector('[data-chief-group-body]') || {}).dataset?.chiefGroupBody);
      st.ready = firstGroup === 'data' && (await foldOpen('ready', '작업 자료 준비 상태'));
      st.emptyfind = await foldOpen('emptyfind', '.');
      st.seal = await foldOpen('seal', '엠티 실');
      st.lolo = await foldOpen('lolo', 'LOLO');
      await click('[data-door="refresh"] button'); st.refresh = (await calls('refresh')).length === 1;
      for (const [id, re] of [['baymatrix', '🧱 베이매트릭스'], ['portmis', 'PORT-MIS 캡처 업로드'], ['pier', '부두 좌표 등록']]) {
        await fresh(); await tabTo('manage');
        const before = await fixedHas(re);
        await click(`[data-door="${id}"]`); await sleep(400);
        st[id] = !before && (await fixedHas(re));
      }
    }
    //  관리 › 사람·알림
    await fresh(); await tabTo('manage'); await groupTo('people');
    {
      st.inspectors = await foldOpen('inspectors', '검수원 활동 \\(');
      st.notice = (await foldOpen('notice', '검수원 공지')) && !!(await pg.$('[data-fold="notice"] textarea'));
      st.feedback = await foldOpen('feedback', '파일로 저장[\\s\\S]*비우기[\\s\\S]*해결된 것도');
      st.search = (await foldOpen('search')) && !!(await pg.$('[data-fold="search"] input'));
      st.search2 = st.search;
      await click('[data-door="ferry1700"]'); await sleep(300);
      st.ferry = await pg.evaluate(() => !!document.querySelector('[role="dialog"][aria-label="작업보고 보관"]'));
      await fresh(); await tabTo('manage'); await groupTo('people');
      await click('[data-door="aux"]'); st.aux = (await hash()) === '#/aux';
      await pg.evaluate(() => { location.hash = ''; });
    }
    //  상태 줄 칩 → 그 자리
    await fresh();
    await click('[data-chief-chip="missing"]'); await sleep(300);
    st.missing = await pg.evaluate(() => document.querySelector('[data-chief-root]').dataset.chiefCur === 'manage' && (document.querySelector('[data-chief-group-body]') || {}).dataset?.chiefGroupBody === 'data' && !!document.querySelector('[data-fold="ready"] > div.mt-2'));
    await fresh();
    await click('[data-chief-chip="feedback"]'); await sleep(300);
    st.feedbackChip = await pg.evaluate(() => document.querySelector('[data-chief-root]').dataset.chiefCur === 'manage' && (document.querySelector('[data-chief-group-body]') || {}).dataset?.chiefGroupBody === 'people' && !!document.querySelector('[data-fold="feedback"] > div.mt-2'));
    //  관리 › 편집 (주의) — 선박 단추 수 = 원자료(🖐 = 정보 있는 항차 전부 · 📐 = 선적 EDI 가 있는 항차)
    {
      const nAll = KEYS4.length + WAIT.length;
      const nPlan = KEYS4.filter((k) => F.voyages[k].loading && F.voyages[k].loading.ediContainers).length;
      await fresh(); await tabTo('manage'); await groupTo('edit');
      const ed = await pg.evaluate(() => { const b = document.querySelector('[data-chief-group-body="edit"]'); const bs = b ? [...b.querySelectorAll('button')] : []; return { caution: !!(b && b.querySelector('[data-edit-caution]')) && /작업 중인 배는 작업이 끝난 뒤에/.test(b.innerText), em: bs.filter((x) => /bg-emerald-700/.test(x.className)).length, vi: bs.filter((x) => /bg-violet-700/.test(x.className)).length, red: /border-red/.test((document.querySelector('button[data-chief-group="edit"]') || {}).className || '') }; });
      await click('[data-chief-group-body="edit"] button.bg-emerald-700'); await sleep(800);
      const e1 = await fixedHas('🖐 베이상세 편집');
      await fresh(); await tabTo('manage'); await groupTo('edit');
      await click('[data-chief-group-body="edit"] button.bg-violet-700'); await sleep(800);
      const e2 = await fixedHas('컨펌용 플랜편집');
      st.edit = ed.caution && ed.red && ed.em === nAll && ed.vi === nPlan && e1 && e2;
    }
    //  소유자 메뉴 — 소유자만 · 교대 시각 · 활동 로그 · 인원 관리
    await fresh(); await tabTo('manage');
    st.ownerGroup = !!(await pg.$('button[data-chief-group="owner"]'));
    await groupTo('owner');
    st.shiftsnap = await foldOpen('shiftsnap', '.');
    st.actlog = await foldOpen('actlog', '.');
    {
      const sb = await pg.$$('[data-owner-menu] button');
      for (const b of sb) if (/인원 관리/.test(await b.innerText())) { await b.click(); await sleep(200); break; }
      st.staff = (await calls('staff')).length === 1;
    }
    await mount({ w: 1440, h: 900, keys: KEYS4, inspector: '이현규', owner: false }); await tabTo('manage');
    const nonOwner = !(await pg.$('button[data-chief-group="owner"]')) && !/위험 구역|마감적용/.test(await rootText());
    st.ownerGroup = st.ownerGroup && nonOwner;

    //  ⑤ 위험 구역 — 한 번 더 묻고, 취소하면 쓰기 0(메모리 RTDB 쓰기 기록으로 센다)
    await fresh(); await tabTo('manage'); await groupTo('owner');
    const writes = () => pg.evaluate(() => (window.__memlog || []).length);
    const modal = () => pg.evaluate(() => { const ms = [...document.querySelectorAll('.fixed.inset-0')].filter((m) => /z-\[100\]/.test(m.className)); return ms.map((m) => m.innerText.split('\n')[0]); });
    //  맨 위(마지막에 뜬) 확인창의 단추를 누른다 — 창이 겹쳐 있으면 위의 것만
    const btnIn = async (re) => { const hit = await pg.evaluate((src) => { const ms = [...document.querySelectorAll('.fixed.inset-0')].filter((m) => /z-\[100\]/.test(m.className)); const top = ms[ms.length - 1]; if (!top) return false; const b = [...top.querySelectorAll('button')].find((x) => new RegExp(src).test((x.innerText || '').trim())); if (!b) return false; b.click(); return true; }, re); await sleep(400); return hit; };
    //  4.39 — 🏁 마감적용은 메뉴째 없앴다(검수사 2026-10-19 21:25 «마감 적용기능은 없애주세요» · 21:26 «메뉴 자체도 없애주세요»). 접이·글자가 없고 위험 구역에는 «모든 작업 보고 삭제» 만 남는다.
    const w0 = await writes();
    const ceGone = await pg.evaluate(() => { const o = document.querySelector('[data-owner-menu]'); const dz = document.querySelector('[data-danger-zone]');
      return { fold: !!document.querySelector('[data-fold="closingedi"]'), text: !!o && /마감적용/.test(o.innerText), dz: !!dz, clear: !!(dz && dz.querySelector('[data-danger^="clear-reports"]')), folds: dz ? dz.querySelectorAll('[data-fold]').length : -1 }; });
    const w1 = await writes();
    st.closingGone = !ceGone.fold && !ceGone.text && ceGone.dz && ceGone.clear && ceGone.folds === 0 && w1 === w0;
    ok(`⑤-1 🏁 마감적용은 없다(4.39) — 소유자 메뉴에 접이·글자 없음 · 위험 구역은 «모든 작업 보고 삭제» 만(접이 ${ceGone.folds}개) · 쓰기 ${w1 - w0}건`,
      st.closingGone, JSON.stringify(ceGone));
    const w2 = await writes();
    await click('[data-danger="clear-reports"]'); const d1 = await modal(); await btnIn('^취소$'); const w3 = await writes();
    await click('[data-danger="clear-reports"]'); await btnIn('^다음$'); const d2 = await modal(); await btnIn('^취소$'); const w4 = await writes();
    const d3m = await modal();
    st.clearAll = /위험 구역 — 모든 작업 보고 삭제/.test(d1.join('|')) && /^⚠️ 모든 작업 보고 삭제/.test(d2.join('|')) && w3 === w2 && w4 === w2 && !d3m.length;
    ok(`⑤-2 위험 구역 🗑 모든 작업 보고 삭제(테스트용) — 첫 창 «${d1.join('|') || '없음'}» [취소] 쓰기 ${w3 - w2}건 · [다음] → 종전 확인창 «${d2.join('|') || '없음'}» [취소] 쓰기 ${w4 - w2}건`,
      st.clearAll, JSON.stringify({ d1, d2, w2, w3, w4, d3m }));
    //  같은 길로 두 번 다 [예] 면 실제로 지운다(검사가 헛돌지 않게 — 메모리 RTDB 에서만)
    await click('[data-danger="clear-reports"]'); await btnIn('^다음$'); await btnIn('^모두 삭제$'); await sleep(400);
    const w5 = await writes();
    const cleared = await pg.evaluate(() => Object.values((window.__memdb || {}).voyages || {}).every((v) => !v.reports));
    ok(`⑤-3 두 번 다 [예] 면 종전 처리기 그대로 지운다(메모리 RTDB 쓰기 ${w5 - w4}건 · 보고 노드 전부 비움 · activeWork 비움) — 처리기 불변`, w5 > w4 && cleared, JSON.stringify({ w4, w5, cleared }));

    //  ③ 결과 — 옛 문 하나하나
    const badDoors = OLD_DOORS.filter(([, , k]) => !st[k]);
    for (const [grp, keys] of [
      ['상태 줄(제목·수집기·검증·누락·오답 칩·BigStat·검색칸)', ['title', 'collector', 'health', 'bigstat', 'missing', 'noSearchBox', 'feedbackChip']],
      ['상황판 탭(보드·확대·크게/닫기·항차 열기·그림 칸)', ['boardTab', 'zoom', 'focus', 'openVoyage', 'cellDetail']],
      ['진행·마감 탭(진행 줄 단추·자료 대기 접힘·문 다섯·TOP)', ['progressTab', 'progressVessel', 'progressComplete', 'progressEdi', 'progressTerm', 'waiting', 'tally', 'restore', 'archive', 'equip', 'reports', 'top']],
      ['관리 › 자료(자료 현황·베이매트릭스·PORT-MIS·부두 좌표·머스크 엠티·엠티 실·LOLO·새로고침)', ['ready', 'baymatrix', 'portmis', 'pier', 'emptyfind', 'seal', 'lolo', 'refresh']],
      ['관리 › 사람·알림(검수원·공지·오답·17시 보고·통합 검색·보조기능)', ['inspectors', 'notice', 'feedback', 'ferry', 'search', 'search2', 'aux']],
      ['관리 › 편집 (주의)(빨간 테두리·한 줄 주의·🖐 창·📐 창)', ['edit']],
      ['관리 › 👑 소유자 메뉴(소유자만 · 교대 시각 · 활동 로그 · 인원 관리 · 위험 구역 — 4.39 마감적용 없앰)', ['ownerGroup', 'shiftsnap', 'actlog', 'staff', 'clearAll']],
    ]) {
      const b = keys.filter((k) => !st[k]);
      ok(`③ 문 전수 — ${grp} : ${keys.length - b.length}/${keys.length} 새 자리에서 열림`, !b.length, b.map((k) => `${k} — ${(OLD_DOORS.find((d) => d[2] === k) || [])[0] || k}`).join(' | '));
    }
    ok(`③ 빠진 문 0 — 옛 수석 대시보드의 문 ${OLD_DOORS.length}개(바로가기 21 · 접힘 19 · 맨 위 단추·창 · 보드·진행 줄 단추 — 4.39 에 없앤 🏁 마감적용 하나는 뺐다)가 전부 새 자리에서 열린다`, !badDoors.length, badDoors.map((d) => d[0]).join(' | '));

    //  ⑥ 조회만(view) 수석으로 들어와도 같은 배치 — 컴 1440 보통 4척 · 폰 390 보통 4척
    await mount({ w: 1440, h: 900, keys: KEYS4, view: true });
    const v1 = await MPC();
    await shot('pc1440_normal_view');
    await mount({ w: 390, h: 844, keys: KEYS4, view: true });
    const v2 = await MPH();
    const base1 = pcRows.find((r) => r.w === 1440 && r.mode === 'normal' && r.n === 4).m, base2 = phRows.find((r) => r.w === 390 && r.mode === 'normal').m;
    ok(`⑥ 조회만으로 들어와도 같은 배치 — 컴 보드 머리 ${v1.boardTop}px(작업자 ${base1.boardTop}) · 행 ${v1.rows.length} · 페이지 넘침 ${v1.pageOver} · 탭 ${v1.tabs} · 폰 카드 넷째 바닥 ${v2.bottoms[3]}px(작업자 ${base2.bottoms[3]})`,
      Math.abs(v1.boardTop - base1.boardTop) <= 2 && v1.rows.length === 4 && v1.pageOver <= 1 && v1.tabs === 3 && v2.n === 4 && Math.abs(v2.bottoms[3] - base2.bottoms[3]) <= 2 && v2.layout === 'phone',
      JSON.stringify({ v1: { t: v1.boardTop, r: v1.rows.length, o: v1.pageOver }, v2 }).slice(0, 300));
    //  캡처(단독 실행에서 폴더를 주면) — 진행·마감 · 관리 탭
    if (shots) {
      for (const [w, h] of [[1440, 900], [1920, 1080], [390, 844]]) for (const mode of ['normal', 'large']) {
        await mount({ w, h, mode, keys: SETS[4] });
        await pg.click('button[data-chief-tab="progress"]'); await sleep(500); await shot(`tab_progress_${w}_${mode}`);
        await pg.click('button[data-chief-tab="manage"]'); await sleep(500);
        if (w < 700) { await pg.click('button[data-chief-group="owner"]'); await sleep(400); }
        await shot(`tab_manage_${w}_${mode}`);
        if (w >= 700) { await pg.click('button[data-chief-group="owner"]'); await sleep(400); await shot(`tab_manage_owner_${w}_${mode}`); }
      }
      //  밝기 4(사무실 흰 바탕) — 상황판·관리 탭
      for (const [w, h] of [[1440, 900], [390, 844]]) {
        await mount({ w, h, keys: SETS[4] });
        await pg.evaluate(() => document.documentElement.setAttribute('data-bright', '4')); await sleep(400); await shot(`bright4_board_${w}`);
        await pg.click('button[data-chief-tab="manage"]'); await sleep(400); await pg.click('button[data-chief-group="owner"]'); await sleep(400); await shot(`bright4_manage_${w}`);
        await pg.evaluate(() => document.documentElement.removeAttribute('data-bright'));
      }
    }
    const netW = netOut.filter((x) => x.m !== 'GET');
    const netG = [...new Set(netOut.filter((x) => x.m === 'GET').map((x) => x.u))];
    ok(`⑦ 그리는 동안 페이지 오류 0 · 실서비스(Firebase·구글) 쓰기 시도 0 · 읽기 ${netOut.length - netW.length}건은 page.route 로 막음(${netG.join(', ').slice(0, 120)})`, !perr.length && !netW.length,
      [...perr, ...netW.map((x) => '쓰기 시도 ' + x.m + ' ' + x.u)].join(' | ').slice(0, 400));
  } finally {
    await browser.close().catch(() => {});
  }
};
module.exports.OLD_DOORS = OLD_DOORS;

//  단독 실행 — node tools/regress_r34_chief.cjs <저장소 루트> [빌드 CSS] [캡처 폴더]
if (require.main === module) {
  process.env.TZ = 'Asia/Seoul';
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'r34_'));
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx, stub: './tools/stub_fbdb_mem.js', css: process.argv[3] ? path.resolve(process.argv[3]) : '', shots: process.argv[4] ? path.resolve(process.argv[4]) : '' })
    .then(() => { console.log(`\nR34 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((e) => { console.error('✗ R34 오류', e && e.stack || e); process.exit(1); });
}
