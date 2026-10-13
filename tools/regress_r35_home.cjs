// 회귀 기준표 R35 — 홈(4.25 판 D) 컴·폰 배치 · 문 전수 · 숫자 한 벌 · 역할별 단추 · 위험 단추 · 오류. smoke_regress.cjs 가 부른다(크로뮴으로 실제 그려 잰다).
//   검수사 2026-10-12 19:42 «검수앱과 수석대쉬보드의 폰화면과 컴퓨터의 화면이 복잡하고 난해 합니다. 화면 구성을 바꿨으면 합니다. 간결하고 보기 좋게»
//   · 불편 «한 화면에 항목이 너무 많다 · 글자가 작아 안 보인다 · 어디에 뭐가 있는지 찾기 어렵다» · «수석들이 노안이 심한 사람이 많습니다»
//   · B13 «페이지 스크롤이 생기면 불편합니다» · B8 «앱 항차목록은 작업중인지도 모르는 화면» · D9 «수석은 한번 실수로 … 많은 자료를 잃을수가»
//   · 2026-10-13 00:53 «전부 클로드 안대로 수정하고 배포 … 수정한 다른곳에 영향을 주는지도 자세히» · 06:08 «테스트 보다 앱의 무결점이 중요».
//   ⚠ 기대값은 코드에서 베끼지 않는다 — 대수·묶음·역할은 픽스처 원자료와 명단 규칙에서 이 파일이 따로 세고(평택 양하분 = 세관 목록 + 추가분 · 선적 = 리스트 행 · 작업 중 = 터미널 «working» + 작업시작일시 지남),
//     배치 기준(두 칸 · 페이지 스크롤 0 · 접힘 둘 첫 화면 · 폰 6줄+접힘 셋 849/913px)은 설계(proposal ④ · shots_new/home_* 실측)에서 왔다.
//   실행: smoke_regress.cjs 안에서 — require('./regress_r35_home.cjs')({ ROOT, TMP, ok, head, fx, stub })
//         단독 — node tools/regress_r35_home.cjs <저장소 루트> [빌드 CSS] [캡처 폴더]
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

//  ── 이 파일이 쓰는 독립 판정 — 앱 함수를 부르지 않는다(R34 와 같은 규칙) ──
const PTK_RE = /^(?:KR)?(?:PTK|PYT|PYO|PYOTM)\d{0,2}$|PYEONGTAEK/i;
const isPtkCode = (s) => PTK_RE.test(String(s || '').trim().toUpperCase());
const isListRow = (r) => !!(r && (r._source || r.wt || r.sl || r.pol || r.pod || r.sh || r.bl || r.op || r.tmp || r.iso));
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
const unitsLoa = (sec) => {
  const E = (sec && sec.ediContainers) || {}, R = (sec && sec.records) || {};
  const L = Object.entries(R).filter(([cn, r]) => cn && !cn.startsWith('_') && isListRow(r) && !(isPtkCode(r.pod) && !isPtkCode(r.pol))).map(([cn]) => cn);
  if (L.length) return new Set(L);
  return new Set(Object.entries(E).filter(([, e]) => e && isPtkCode(e.pol)).map(([k, e]) => String(e.cn || k)));
};
const doneOf = (sec, set) => Object.keys((sec && sec.completed) || {}).filter((cn) => set.has(cn)).length;
//  KST 'YYYY-MM-DD HH:MM' → ms · 오늘(사본 시각 NOW 의 KST 날짜)에서 며칠 뒤
const kstMs = (s) => { const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - 9 * 3600000 : null; };
const kstDay = (ms) => Math.floor((ms + 9 * 3600000) / 86400000);

//  ── 옛 홈(4.24)의 문 전수 — 소스(HomePage.jsx bcc8246)에서 뽑은 맨 위 줄·조작 줄·카드 안 단추·배지·접힘·창 ──
//    [옛 자리, 새 자리, 검사 이름] — 검사는 같은 이름의 st[...] 가 새 자리에서 실제로 여는지·보이는지 본다.
const OLD_DOORS = [
  ['맨 위 붉은 줄 «❌ 오답 N건 — 아직 회신 안 함»(소유자만) → 수석 대시보드', '상태 띠 «❌ 오답 N» 칩(소유자만) → 같은 처리기', 'feedback'],
  ['«오늘의 나» 줄(오늘 N대 · 시간당 · 마지막 완료 — 내 완료가 있을 때만)', '상태 띠 «🙋 나 오늘 N대» 칩 → 누르면 종전 줄', 'me'],
  ['수집기 줄(● 수집기 · N분 전 · ✓ 자료 정상 · 보조기능) → 보조기능(#/aux)', '상태 띠 «● 수집기 N분 전 | ✓ 자료 정상» → 같은 처리기(onOpenAux)', 'collector'],
  ['[수석 대시보드] 단추(canOpenChief 만)', '상태 띠 «📊 수석 상황판 →»(canOpenChief 만) → 같은 처리기', 'chief'],
  ['«🚢 진행 중인 항차 N건»', '컴 상태 띠 «🚢 항차 N · 작업 중 M»(제목에 자료 있음·자료 대기) · 묶음 머리 «⚓ 작업 중 M»', 'count'],
  ['[📍 자동·X ▾] → 자동 · PCTC · PNCT · 전체', '컴 상태 띠 · 폰 조작 줄 — 같은 메뉴(현 부두가 위로)', 'pier'],
  ['[📍 ▾] → 🔄 위치 다시 재기', '같은 메뉴', 'gps'],
  ['[＋ 새 항차 ▾] → ⬇ 양하 항차(창)', '컴 상태 띠 · 폰 조작 줄 — 같은 창', 'newDis'],
  ['[＋ 새 항차 ▾] → ⬆ 선적 항차(창)', '같은 메뉴', 'newLod'],
  ['[＋ 새 항차 ▾] → 📋 물량 예보 붙여넣기(창)', '같은 메뉴', 'forecast'],
  ['[데이터 새로고침]', '컴 상태 띠 · 폰 조작 줄', 'refresh'],
  ['펼친 메뉴 밖 누르면 닫힘', '그대로', 'menuClose'],
  ['항차 카드 목록(작업중·당일·명일·모레 + 6개 채움 · 현 부두 먼저)', '배 줄 — 묶음 ⚓ 작업 중 → 📅 오늘 → 📅 내일 → 날짜 (묶음 안 순서 종전 그대로)', 'rows'],
  ['카드 머리 누르기 → 항차 열기(기본 모드)', '상세 머리 선박명 → 같은 처리기', 'openHead'],
  ['[양하] 막대 누르기 → 양하로 열기', '상세 양하 칸 · [양하 열기](폰 시트 위)', 'openDis'],
  ['[선적] 막대 누르기 → 선적으로 열기', '상세 선적 칸 · [선적 열기]', 'openLod'],
  ['자료 없는 배 카드 머리 → 항차 열기(EDI 직접 올리기)', '상세 [항차 열기 →]', 'openNone'],
  ['선박명 옆 «⚠ 목적지 확인 N» → 그 컨 상세', '배 줄 · 상세 머리 — 같은 처리(setPodFocus + 양하로 열기)', 'pod'],
  ['«사전에 없음» 딱지', '배 줄 알림 줄 · 상세 머리', 'dict'],
  ['📍 부두 · 선석 배지', '줄 왼쪽 부두 띠 색 · 줄 «항차 · E15» · 상세 배지', 'pierTag'],
  ['📅 작업일시 배지(출처 표기) / 🚢 출항 배지', '줄 오른쪽 시각 · 상세 배지(제목에 MM-DD 작업일)', 'planTag'],
  ['🚢신고도착 배지', '상세 배지', 'pmEta'],
  ['🤖 자동(수집중 / 확정) 배지', '상세 배지', 'auto'],
  ['항차(voy_d / voy_l) · 선사 줄', '줄 «항차 · 선석» · 상세 머리', 'voyLine'],
  ['항로 줄(약자 · 기항 순서 · 평택 다음 · 근거)', '상세 항로 줄(늘 기항 순서까지)', 'lane'],
  ['자료 상태(✅ 확정 · ✏ 수정본 · ⏳ 대기중 · 갱신 · 자료 없음)', '상세 배지', 'dataTag'],
  ['«작업 N일 전 (곧 자동삭제)»', '상세 배지', 'autodel'],
  ['대수 내역(평택·매칭·누락·쉬프팅·LUG·예상EDI…) · «터미널 N (±)» 대조', '상세 칸 머리 줄 · 칸 아래 «배정 N»(0 이면 경고 아님)', 'breakdown'],
  ['막대 + «완료 n/N (p%)»', '상세 큰 숫자 + 막대 · 줄 작은 막대(같은 값)', 'bars'],
  ['청록 «본선 작업현황 완료 n/전체 · 잔여» 막대·글줄 · 오른쪽 «본선 잔여»', '상세 칸 아래 «본선 n/전체» 한 자리(설계 ⑥)', 'term'],
  ['오른쪽 패널 «양하 남음 · 선적 남음»', '상세 칸 아래 «남음 N»', 'rem'],
  ['«⛔ 전량 캔슬» 줄', '배 줄 · 상세 칸(숫자 없음)', 'cancel'],
  ['한쪽 없음 근거 «배정에도 0 (정상)» 등', '상세', 'missingSide'],
  ['카톡 물량 예보 칸 · ▲ 긴급 · 🧳 수화물', '상세', 'forecastBox'],
  ['● 검수원 작업중 / 본선 작업중 · 접속 검수원 없음 / 대기 중', '줄 오른쪽 상태 · 상세 상태 줄', 'status'],
  ['접힌 카드 «검수 완료 · 수석 대기 / 양하 완료 ✓»(작업자만)', '줄 오른쪽 상태(작업자만)', 'doneStatus'],
  ['[▾ 자세히 / ▴ 접기]', '없앰 — 컴 오른쪽 상세 · 폰 전체화면 시트가 그 내용(설계 ④)', 'more'],
  ['[⚡ 지금 처리]', '상세 동작 줄 — 같은 처리기(collector_commands 요청)', 'zap'],
  ['[⬇ 양하 완료] → 확인창 → 표시', '상세 동작 줄 — 같은 확인창', 'doneDis'],
  ['[⬆ 선적 완료] → 확인창', '상세 동작 줄 — 같은 확인창', 'doneLod'],
  ['[⬇ 양하 완료 ✓] 되돌리기', '상세 동작 줄', 'undo'],
  ['«검수 완료 · 수석 대기»', '상세 동작 줄', 'allDone'],
  ['[🗑] → 양하만 · 선적만 · 전체 → 한 번 더', '상세 동작 줄 끝 떨어진 자리(빨간 테두리) — 같은 확인창', 'delete'],
  ['🚢 그 밖의 배 N척(접힘)', '컴 — 다 편다: 날짜 묶음(📅 MM-DD …, 지난 배만 «🗓 그 밖의 배») · 폰 «🗓 이번 주/그 밖의 배 N척» 접힘 한 줄(4.25 2차)', 'other'],
  ['⏳ 자료 대기 N척(접힘)', '컴 목록 칸 맨 아래 접힘(늘 첫 화면) · 폰 접힘 한 줄', 'wait'],
  ['🔒 선박 실 정책(접힘) → 배 칩 → 수정 창', '같은 접힘 + 상세 «🔒 실 정책 · …» 한 줄 → 같은 창', 'policy'],
  ['TOP 단추(스크롤이 긴 화면)', '그대로(폰 목록)', 'top'],
  ['빈 목록 «진행 중인 항차가 없습니다»', '그대로', 'empty'],
  ['«📍 PNCT (현 위치)» · «── 다른 부두 ──» 구분줄', '줄 왼쪽 부두 띠 색 · 현 부두 먼저 순서 그대로', 'pierOrder'],
  ['출항 배지 «한 번 뜨면 유지» 기록(departBadgeAt — 콘앱 출항 표시)', '배 줄(접힌 묶음 안에서도 언마운트 안 함)', 'sticky'],
];

module.exports = async function r35({ ROOT, TMP, ok, head, fx, stub, css = '', shots = '' }) {
  head('R35 홈(4.25 판 D) — 컴: 상태 띠 + 배 목록·고른 배 상세 두 칸(페이지 스크롤 0 · 접힘 둘 첫 화면) · 폰: 상태 띠 + 조작 줄 + 배 줄 → 전체화면 시트 · 문 전수(옛 홈의 단추·배지·접힘·창이 새 자리에서) · 숫자 한 벌(줄 = 상세 = 수석 상황판 보드 = 원자료) · 역할별 단추 · 위험 단추 · 오류 0 (4.25)',
    '검수사 2026-10-12 19:42 «화면 구성을 바꿨으면 합니다. 간결하고 보기 좋게» · «수석들이 노안이 심한 사람이 많습니다» · B8 · B13 · D9 · 2026-10-13 00:53 «전부 클로드 안대로» · 06:08 «테스트 보다 앱의 무결점이 중요»');
  const idx = fs.existsSync(path.join(ROOT, 'index.html')) ? fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') : '';
  const cssRel = (idx.match(/href="\.\/(assets\/index-[\w-]+\.css)"/) || [])[1];
  const cssPath = css || (cssRel ? path.join(ROOT, cssRel) : '');
  if (!cssPath || !fs.existsSync(cssPath)) { ok('빌드된 CSS(assets/index-*.css)가 있다 — 없으면 화면을 잴 수 없다', false, cssRel || '없음'); return; }
  let pw;
  try { pw = require(path.join(ROOT, 'node_modules/playwright')); } catch (e) { try { pw = require('playwright'); } catch (e2) { pw = null; } }
  if (!pw || !CHROME) { ok('playwright·크로뮴이 있다 — 모양을 잴 수 없으면 올리지 않는다', false, `${!!pw} · ${CHROME || '없음'}`); return; }

  //  소스 — 글자는 토큰만(크게 모드가 먹게) · 처리기 배선(자리만 옮김)
  const HP = fs.readFileSync(path.join(ROOT, 'src/pages/HomePage.jsx'), 'utf8');
  const strip = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|\s)\/\*[\s\S]*?\*\//g, '$1').replace(/^\s*\/\/.*$/gm, '');
  const HPc = strip(HP);
  ok('소스 — 홈은 글자 크기를 토큰(text-xs…)으로만 준다(임의 text-[Npx] · 인라인 fontSize 0 — 크게 모드가 안 먹는 자리 없음)', !/text-\[\d+(\.\d+)?px\]/.test(HPc) && !/fontSize\s*:/.test(HPc), (HPc.match(/text-\[\d+(\.\d+)?px\]|fontSize\s*:[^,}]+/g) || []).slice(0, 5).join(' | '));

  const F = fx('chief424_board.json'), H = fx('home425.json');
  const NOW = F.now;
  //  항차 17 = chief424 13척(raw 메타 되돌림) + home425 4척 — 같은 사본(2026-10-12 20:16 KST)
  const VOY = {};
  for (const [k, v] of Object.entries(F.voyages)) {
    const c = JSON.parse(JSON.stringify(v)); const rm = (H.raw_meta || {})[k];
    if (rm) for (const m of Object.keys(rm)) if (c[m]) c[m].raw = rm[m];
    VOY[k] = c;
  }
  Object.assign(VOY, JSON.parse(JSON.stringify(H.add_voyages)));
  const KEYS = Object.keys(VOY);
  //  독립 기대 — 자료 대기 = 구역(양하·선적)도 카톡 예보도 없는 배 · 작업 중 = 터미널 «working» + 작업시작일시가 사본 시각 이전
  const WAIT = KEYS.filter((k) => !VOY[k].discharge && !VOY[k].loading && !VOY[k].info.forecast);
  const DATA = KEYS.filter((k) => !WAIT.includes(k));
  const startOf = (k) => kstMs(String(VOY[k].info.planDate || '').split('~')[0]);
  const WORK = DATA.filter((k) => String(VOY[k].info.terminalStatus || '') === 'working' && kstMs(VOY[k].info.workStartAt) != null && kstMs(VOY[k].info.workStartAt) <= NOW && !VOY[k].info.workEndAt);
  const dayOf = (k) => kstDay(startOf(k)) - kstDay(NOW);
  const PIER = (k) => String((VOY[k] && VOY[k].info.pier) || '');   // 화면에서 못 찾은 줄(undefined)도 «부두 없음» 으로 — 검사가 죽지 않고 ✘ 로 남게
  //  현 부두(PNCT — 아래 GPS) 먼저 → 작업시작 순 (홈 정렬 규칙 1.77 · M5.82)
  const ord = (ks) => [...ks].sort((a, b) => ((PIER(a) === 'PNCT' ? 0 : 1) - (PIER(b) === 'PNCT' ? 0 : 1)) || (startOf(a) - startOf(b)));
  const TOMOR = ord(DATA.filter((k) => !WORK.includes(k) && dayOf(k) === 1));
  const OTHER = ord(DATA.filter((k) => !WORK.includes(k) && dayOf(k) > 2));
  const want = {};
  for (const k of DATA) {
    const v = VOY[k];
    const dS = v.discharge ? unitsDis(v.discharge) : null, lS = v.loading ? unitsLoa(v.loading) : null;
    want[k] = { dis: dS ? `${doneOf(v.discharge, dS)}/${dS.size}` : null, lod: lS ? `${doneOf(v.loading, lS)}/${lS.size}` : null };
  }

  const e = path.join(TMP, 'r35.jsx'), o = path.join(TMP, 'r35.js');
  fs.writeFileSync(e, [
    `import React from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import Header from "${ROOT}/src/components/Header.jsx";`,
    `import HomePage, { computeStats } from "${ROOT}/src/pages/HomePage.jsx";`,
    `import ChiefDashboard from "${ROOT}/src/pages/ChiefDashboard.jsx";`,
    `import { APP_VERSION } from "${ROOT}/src/utils.js";`,
    `import { setActiveWorkChoice } from "${ROOT}/src/workChoice.js";`,
    `import { closeHomeSheetIfOpen } from "${ROOT}/src/backHandler.js";`,
    `let root = null;`,
    `window.__calls = [];`,
    `const call = (fn) => (...a) => { window.__calls.push({ fn, a: a.map((x) => (x && typeof x === 'object' ? '[obj]' : x)) }); };`,
    `window.__R35 = { APP_VERSION, closeHomeSheetIfOpen,`,
    //  ④-4 — computeStats «구역 없음» 반환 모양(4.24 감사 기록 7): 한 대짜리 선적 구역의 반환과 키가 같은가 · 작업량 둘이 0 인가
    `  shape() { const a = computeStats(undefined, 'loading'); const b = computeStats({ ediContainers: { ABCU1234567: { cn: 'ABCU1234567', pol: 'KRPTK', pod: 'CNSHA' } }, records: {}, completed: {} }, 'loading', {}, 'X_1', new Set());`,
    `    return { emptyKeys: Object.keys(a).sort().join(','), fullKeys: Object.keys(b).sort().join(','), wt: a.workTotal, wd: a.workDone, sum: a.workDone + a.workTotal + b.workDone + b.workTotal }; },`,
    `  unmount() { if (root) { root.unmount(); root = null; } },`,
    `  mount(p) {`,
    `    const voyages = JSON.parse(p.voyagesJson);`,
    `    const wc = p.view ? { mode: 'view' } : { mode: 'work', voyageKey: '' };`,
    `    setActiveWorkChoice(wc);`,
    //  App.jsx 의 셸 그대로 — 머리띠 · <main pb-20 data-app-main> · 바닥글(data-app-footer)
    `    const page = p.page === 'chief'`,
    `      ? React.createElement(ChiefDashboard, { voyages, inspectors: p.inspectors, inspector: p.inspector, collectorHb: p.hb, pilotForecast: p.pf, portMisData: p.pm, onRefreshData: call('refresh'), refreshing: false, refreshedAt: 0, onOpenVoyage: call('openVoyage'), onGoHome: call('home'), onMirPlan: call('plan'), onOpenGlobalSearch: call('search'), onOpenStaffManager: null })`,
    `      : React.createElement(HomePage, { voyages, inspectors: p.inspectors, inspector: p.inspector, portMisData: p.pm, pilotForecast: p.pf, heartbeat: p.hb,`,
    `          onRefreshData: call('refresh'), refreshing: false, refreshedAt: p.refreshedAt || 0, onOpenVoyage: call('openVoyage'), onOpenChiefDashboard: call('chief'), onOpenAux: call('aux') });`,
    `    const el = React.createElement('div', { className: 'min-h-screen bg-ink-950 text-dim-100' },`,
    `      React.createElement(Header, { version: APP_VERSION, inspector: p.inspector, online: true, route: { name: p.page === 'chief' ? 'chief' : 'home' }, voyages, workChoice: wc, onChangeWork() {}, onChangeInspector() {}, onOpenStaffManager: null, onGoHome() {}, onOpenAux() {}, onLogout() {} }),`,
    `      React.createElement('main', { className: 'pb-20', 'data-app-main': '1' }, page),`,
    `      React.createElement('footer', { className: 'text-center text-xxs text-dim-500 pb-24 pt-4 leading-relaxed', 'data-app-footer': '1' }, '© 2026 (주)그린마린(Green Marine) · 개발 연지아빠'));`,
    `    if (!root) root = createRoot(document.getElementById('root'));`,
    `    root.render(el);`,
    `  } };`,
  ].join('\n'));
  execSync(`npx esbuild "${e}" --bundle --format=iife --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --define:global=window --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const html = path.join(TMP, 'r35.html');
  fs.writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="file://${cssPath}"></head><body><div id="root"></div><script src="file://${o}"></script></body></html>`);

  //  메모리 RTDB 씨앗 — 항차(삭제 길이 휴지통 복사에 읽는다) · 항로 · 실 정책 · 오답 · 부두 좌표. 쓰기는 window.__memlog 에 쌓인다.
  const seedOf = (extra = {}) => JSON.stringify({ voyages: VOY, lane_info: H.lane_info, shipPolicies: H.shipPolicies, feedback: F.feedback || {}, pier_coords: H.pier_coords, ...extra });
  const SEED = seedOf();
  const PNCT = H.pier_coords.PNCT;
  const actOf = (list) => Object.fromEntries(list.map(([name, key, mode]) => [name, { name, lastActive: NOW - 10000, lastVoyage: key, lastMode: mode, workMode: 'work', loggedIn: true }]));
  const ACT = actOf([['최관식', 'ATPR_2645E', 'discharge']]);   // 접속 검수원 한 명(ATPR) — 상태 «● 최관식 작업중»
  const hb = { ...F.collector_heartbeat };

  const browser = await pw.chromium.launch({ executablePath: CHROME });
  const perr = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Seoul', locale: 'ko-KR', geolocation: { latitude: PNCT.lat, longitude: PNCT.lng }, permissions: ['geolocation'] });
    //  GPS 재기 횟수(«🔄 위치 다시 재기» 문) — getCurrentPosition 을 감싸 센다(값은 브라우저 그대로)
    await ctx.addInitScript(() => { try { const g = navigator.geolocation; const f = g.getCurrentPosition.bind(g); window.__gps = 0; g.getCurrentPosition = (...a) => { window.__gps += 1; return f(...a); }; } catch (er) { window.__gps = -1; } });
    //  실서비스 Firebase·구글 API 로 나가는 요청은 전부 막는다. 읽기 아닌 요청은 시도 자체가 ⑦ ✘.
    const netOut = [];
    await ctx.route(/firebasedatabase\.app|firebaseio\.com|googleapis\.com|google\.com|gstatic\.com/, (rt) => {
      const rq = rt.request(); netOut.push({ m: rq.method(), u: rq.url().replace(/^https?:\/\/[^/]+/, '').split('?')[0].slice(0, 60) }); return rt.abort();
    });
    const pg = await ctx.newPage();
    pg.on('pageerror', (er) => perr.push(String(er).slice(0, 200)));
    pg.on('dialog', (d) => { perr.push('대화창 ' + d.message().slice(0, 80)); d.dismiss().catch(() => {}); });
    await pg.clock.setFixedTime(new Date(NOW));   // 사본 시각(2026-10-12 20:16 KST)
    await pg.goto('file://' + html); await sleep(300);
    const mount = async ({ w, h, mode = 'normal', voyages = VOY, inspector = '김성일', view = false, inspectors = ACT, page = 'home', seed = SEED, refreshedAt = 0, dict = null }) => {
      await pg.setViewportSize({ width: w, height: h });
      await pg.evaluate(({ mode, seed, dict }) => {
        window.__R35.unmount();
        window.scrollTo(0, 0);
        try { location.hash = ''; } catch (er) { /* 해시 */ }
        if (mode === 'large') document.documentElement.setAttribute('data-text', 'large'); else document.documentElement.removeAttribute('data-text');
        window.__memdb = JSON.parse(seed); window.__memlog = []; window.__calls = [];
        if (dict) window.__fbShipBayDict = dict; else { try { delete window.__fbShipBayDict; } catch (er) { window.__fbShipBayDict = undefined; } }
      }, { mode, seed, dict });
      await pg.evaluate((p) => window.__R35.mount(p), { voyagesJson: JSON.stringify(voyages), inspector, view, hb, inspectors, page, pf: H.pilot_forecast, pm: H.port_mis_data, refreshedAt });
      await sleep(1100);
    };
    const shot = async (name) => { if (shots) { fs.mkdirSync(shots, { recursive: true }); await pg.screenshot({ path: path.join(shots, name + '.png') }); } };
    const calls = (fn) => pg.evaluate((fn) => (window.__calls || []).filter((c) => c.fn === fn), fn);
    const writes = () => pg.evaluate(() => (window.__memlog || []).length);
    //  눌리지 않는(숨은·가린) 요소는 «못 누름» 으로 돌려준다 — 검사가 통째로 죽지 않고 그 문의 단언이 ✘ 로 남게(깨뜨림 G 에서 30초 기다리다 던지던 것)
    const click = async (sel) => { const hh = await pg.$(sel); if (!hh) return false; try { await hh.click({ timeout: 3000 }); } catch (er) { console.log(`    (못 누름 ${sel.slice(0, 60)} — ${String(er.message || er).split('\n')[0].slice(0, 80)})`); return false; } await sleep(350); return true; };
    const textOf = (sel) => pg.evaluate((s) => { const el = document.querySelector(s); return el ? el.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);

    //  컴 배치 잼
    const MPC = () => pg.evaluate(() => {
      const q = (s) => document.querySelector(s); const R = (el) => (el ? el.getBoundingClientRect() : null);
      const vis = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0 && !el.closest('.hidden');
      const de = document.documentElement;
      const panes = q('[data-home-panes]'), list = q('[data-home-list]'), det = q('[data-home-detail]'), scroll = q('[data-home-scroll]');
      const rows = [...document.querySelectorAll('[data-home-scroll] [data-ship-row]')].filter(vis);
      const last = rows[rows.length - 1];
      const folds = ['wait', 'policy'].map((id) => { const b = q(`[data-home-list] > [data-home-fold="${id}"]`); const r = R(b); return r ? { id, top: Math.round(r.top), bottom: Math.round(r.bottom) } : { id, top: null, bottom: null }; });
      //  보이는 글자 중 가장 작은 크기(9~11px 가 남았나)
      const small = []; const walker = document.createTreeWalker(q('[data-home-root]'), NodeFilter.SHOW_TEXT);
      let nd; while ((nd = walker.nextNode())) { const t = nd.textContent.trim(); if (!t) continue; const el = nd.parentElement; if (!vis(el)) continue; const fs0 = parseFloat(getComputedStyle(el).fontSize); if (fs0 < 12) small.push(`${t.slice(0, 12)}:${fs0}`); }
      return { vh: window.innerHeight, vw: window.innerWidth, layout: (q('[data-home-root]') || {}).dataset?.homeLayout,
        listL: list ? Math.round(R(list).left) : null, listW: list ? Math.round(R(list).width) : null, detL: det ? Math.round(R(det).left) : null, detW: det ? Math.round(R(det).width) : null,
        panesBottom: panes ? Math.round(R(panes).bottom) : null, pageOver: de.scrollHeight - window.innerHeight, hOver: de.scrollWidth - de.clientWidth,
        rowsN: rows.length, lastBottom: last ? Math.round(R(last).bottom) : null, scrollBottom: scroll ? Math.round(R(scroll).bottom) : null, scrollOver: scroll ? scroll.scrollHeight - scroll.clientHeight : null,
        folds, detailKey: (q('[data-ship-detail]') || {}).dataset?.shipDetail || '', stripH: q('[data-home-strip]') ? Math.round(R(q('[data-home-strip]')).height) : null,
        nan: /NaN/.test((q('[data-home-root]') || {}).innerText || ''), small: small.slice(0, 8), smallN: small.length };
    });
    //  ① 컴 — 1440×900 · 1920×1080 · 1366×768 × 보통·크게
    const pcRows = [];
    for (const [w, h] of [[1440, 900], [1920, 1080], [1366, 768]]) for (const mode of ['normal', 'large']) {
      await mount({ w, h, mode });
      const m = await MPC();
      //  목록 칸을 끝까지 굴려 마지막 줄이 닿는가(목록이 칸보다 길 때)
      const reach = await pg.evaluate(() => { const s = document.querySelector('[data-home-scroll]'); if (!s) return null; s.scrollTop = s.scrollHeight; const rows = [...s.querySelectorAll('[data-ship-row]')].filter((el) => !el.closest('.hidden')); const last = rows[rows.length - 1]; const r = last.getBoundingClientRect(), b = s.getBoundingClientRect(); const ok0 = r.bottom <= b.bottom + 1 && r.top >= b.top - 1; s.scrollTop = 0; return ok0; });
      pcRows.push({ w, h, mode, m, reach });
      await shot(`pc${w}_${mode}`);
    }
    const BASE = pcRows.filter((r) => (r.w === 1440 && r.mode === 'normal') || r.w === 1920);   // 설계 실측 기준(1440 보통 목록 끝 y=894 · 1920)
    const bad1 = pcRows.filter(({ m }) => !(m.layout === 'pc' && m.listL < m.detL && m.listW >= 360 && m.detW >= 500 && m.detailKey));
    ok(`①-1 컴 두 칸 — 왼쪽 배 목록 · 오른쪽 고른 배 상세(1440 보통 목록 ${pcRows[0].m.listW}px · 상세 ${pcRows[0].m.detW}px · 1366 크게 ${pcRows[5].m.listW}/${pcRows[5].m.detW}px · 처음엔 첫 줄(${pcRows[0].m.detailKey}) 상세)`,
      !bad1.length && pcRows[0].m.detailKey === WORK.sort((a, b) => startOf(a) - startOf(b))[0], JSON.stringify(bad1.map((r) => [r.w, r.mode, r.m.layout, r.m.listW, r.m.detW, r.m.detailKey])).slice(0, 300));
    const bad2 = pcRows.filter(({ m }) => m.pageOver > 1 || m.hOver > 1 || Math.abs(m.vh - m.panesBottom) > 12);
    ok(`①-2 컴 페이지 스크롤 0 — 세로 ${[...new Set(pcRows.map((r) => r.m.pageOver))].join('/')}px · 가로 ${[...new Set(pcRows.map((r) => r.m.hOver))].join('/')}px · 두 칸 바닥 = 화면 바닥(12px 안: ${pcRows.map((r) => r.m.vh - r.m.panesBottom).join('/')}) — 1440·1920·1366 × 보통·크게`,
      !bad2.length, JSON.stringify(bad2.map((r) => [r.w, r.mode, r.m.pageOver, r.m.hOver, r.m.panesBottom, r.m.vh])));
    const bad3 = pcRows.filter(({ m }) => m.folds.some((f) => f.bottom == null || f.bottom > m.vh || f.top < 0));
    ok(`①-3 접힘 둘(⏳ 자료 대기 · 🔒 선박 실 정책)이 늘 첫 화면 — 목록 칸 맨 아래(1440 보통 ${pcRows[0].m.folds.map((f) => f.bottom).join('/')} · 1366 크게 ${pcRows[5].m.folds.map((f) => f.bottom).join('/')} / 화면 ${pcRows[5].m.vh}px)`,
      !bad3.length, JSON.stringify(bad3.map((r) => [r.w, r.mode, r.m.folds])));
    const bad4 = pcRows.filter((r) => (BASE.includes(r) ? !(r.m.lastBottom != null && r.m.lastBottom <= r.m.scrollBottom + 1 && r.m.scrollOver <= 1) : !r.reach));
    ok(`①-4 목록 끝 — 설계 기준 화면(1440 보통 · 1920 보통·크게)은 마지막 배 줄까지 첫 화면(목록 넘침 ${BASE.map((r) => r.m.scrollOver).join('/')}px) · 나머지(1440 크게 · 1366)는 목록 칸 안에서 굴러 닿는다(페이지는 안 구른다)`,
      !bad4.length, JSON.stringify(bad4.map((r) => [r.w, r.mode, r.m.lastBottom, r.m.scrollBottom, r.m.scrollOver, r.reach])));
    const bad5 = pcRows.filter(({ m }) => m.nan || (m.smallN > 0));
    ok(`①-5 글자 바닥 12px(9~11px 글자 0 — 보통·크게) · «NaN» 0 (1440 보통 가장 작은 글자 목록 ${JSON.stringify(pcRows[0].m.small)})`,
      !bad5.length, JSON.stringify(bad5.map((r) => [r.w, r.mode, r.m.nan, r.m.small])).slice(0, 400));

    //  ② 폰 — 390×844 · 360×800 × 보통·크게
    const MPH = () => pg.evaluate(() => {
      const q = (s) => document.querySelector(s); const R = (el) => (el ? el.getBoundingClientRect() : null);
      const vis = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0 && !el.closest('.hidden');
      const de = document.documentElement;
      const work = [...document.querySelectorAll('[data-ship-row]')].filter(vis).filter((el) => { let p = el.previousElementSibling; while (p && !p.dataset.homeGroup) p = p.previousElementSibling; return p && p.dataset.homeGroup === 'work'; });
      const folds = [...document.querySelectorAll('[data-home-fold]')].filter(vis).map((b) => ({ id: b.dataset.homeFold, bottom: Math.round(R(b).bottom) }));
      const ctrl = q('[data-home-ctrl]'); const cs = ctrl ? [...ctrl.children].map((c) => Math.round(R(c.querySelector('button') || c).height)) : [];
      const ctrlTops = ctrl ? [...ctrl.children].map((c) => Math.round(R(c).top)) : [];
      const small = []; const walker = document.createTreeWalker(q('[data-home-root]'), NodeFilter.SHOW_TEXT);
      let nd; while ((nd = walker.nextNode())) { const t = nd.textContent.trim(); if (!t) continue; const el = nd.parentElement; if (!vis(el)) continue; const fs0 = parseFloat(getComputedStyle(el).fontSize); if (fs0 < 12) small.push(`${t.slice(0, 12)}:${fs0}`); }
      return { vh: window.innerHeight, layout: (q('[data-home-root]') || {}).dataset?.homeLayout, hOver: de.scrollWidth - de.clientWidth,
        workN: work.length, workBottom: work.length ? Math.round(R(work[work.length - 1]).bottom) : null, folds, ctrlH: cs, ctrlTops,
        nan: /NaN/.test((q('[data-home-root]') || {}).innerText || ''), small: small.slice(0, 8) };
    });
    //  설계 «폰 4+2 줄과 접힘 셋이 한 화면(실측 849px, 크게 913px)» — 같은 꼴(작업 중 3 + 내일 3 = 6줄 + 접힘 셋)로 잰다: 내일 넷 중 마지막 하나(STMJ — 선적 리스트만)를 뺀 사본
    const SIX = Object.fromEntries(KEYS.filter((k) => k !== TOMOR[TOMOR.length - 1]).map((k) => [k, VOY[k]]));
    const phRows = [];
    for (const [w, h] of [[390, 844], [360, 800]]) for (const mode of ['normal', 'large']) {
      await mount({ w, h, mode, voyages: SIX });
      const m = await MPH();
      await shot(`phone${w}_${mode}`);
      phRows.push({ w, h, mode, m });
    }
    const DESIGN = { normal: 849, large: 913 };   // proposal ④ 폰 «실측 849px, 크게 913px»(390×844)
    const badP1 = phRows.filter(({ w, mode, m }) => m.layout !== 'phone' || m.workN !== WORK.length || m.workBottom > m.vh || m.folds.length !== 3 || (w === 390 && m.folds[m.folds.length - 1].bottom > DESIGN[mode] + 12));
    ok(`②-1 폰 — 작업 중 ${WORK.length}척 줄이 첫 화면(바닥 ${phRows.map((r) => `${r.w} ${r.mode === 'large' ? '크게' : '보통'} ${r.m.workBottom}/${r.m.vh}`).join(' · ')}) · 6줄 + 접힘 셋 마지막 바닥 390 보통 ${phRows[0].m.folds.map((f) => f.bottom).pop()}px(설계 849) · 크게 ${phRows[1].m.folds.map((f) => f.bottom).pop()}px(설계 913)`,
      !badP1.length, JSON.stringify(badP1.map((r) => [r.w, r.mode, r.m.layout, r.m.workN, r.m.workBottom, r.m.folds])).slice(0, 400));
    const badP2 = phRows.filter(({ m }) => m.hOver > 1 || m.ctrlH.length < 2 || Math.max(...m.ctrlH) - Math.min(...m.ctrlH) > 2 || new Set(m.ctrlTops).size !== 1 || m.nan || m.small.length);
    ok(`②-2 폰 가로 스크롤 0 · 조작 줄 단추 같은 높이 한 줄(${phRows.map((r) => r.m.ctrlH.join('/')).join(' · ')}px) · 9~11px 글자 0 · «NaN» 0`, !badP2.length, JSON.stringify(badP2.map((r) => [r.w, r.mode, r.m.hOver, r.m.ctrlH, r.m.ctrlTops, r.m.small])).slice(0, 400));
    //  ②-4 좁은 폰(320 · 360) «크게» + 수집기 끊김(가장 긴 상태 띠 — «수집기 끊김 N분 — 숫자 갱신 정지» · 소유자 오답 칩 · 나 오늘 칩)에서도 가로 스크롤 0
    {
      const hbDown = { ...hb, at: NOW - 40 * 60000 };
      const V5 = JSON.parse(JSON.stringify(SIX)); const k5 = Object.keys(V5.DXQD_2640E.discharge.completed || {})[0];
      if (k5) V5.DXQD_2640E.discharge.completed[k5] = { ...V5.DXQD_2640E.discharge.completed[k5], by: '김성일', at: NOW - 600000 };
      const fbU2 = { ...(F.feedback || {}), 1791800000000: { query: '연막 질문', ts: 1791800000000 } };
      const narrow = [];
      for (const [w, h] of [[320, 700], [360, 800]]) {
        await pg.setViewportSize({ width: w, height: h });
        await pg.evaluate(({ seed }) => { window.__R35.unmount(); document.documentElement.setAttribute('data-text', 'large'); window.__memdb = JSON.parse(seed); window.__memlog = []; }, { seed: seedOf({ feedback: fbU2 }) });
        await pg.evaluate((p) => window.__R35.mount(p), { voyagesJson: JSON.stringify(V5), inspector: '김성일', view: false, hb: hbDown, inspectors: ACT, page: 'home', pf: H.pilot_forecast, pm: H.port_mis_data, refreshedAt: 0 });
        await sleep(1000);
        narrow.push({ w, r: await pg.evaluate(() => ({ hOver: document.documentElement.scrollWidth - document.documentElement.clientWidth, strip: (document.querySelector('[data-home-strip]') || {}).innerText || '', over: [...document.querySelectorAll('[data-home-root] *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(el).position !== 'fixed').length })) });
        await shot(`phone${w}_large_down`);
      }
      ok(`②-4 좁은 폰 320·360 «크게» + 수집기 끊김 · 오답 칩 · 나 오늘 칩 — 가로 스크롤 ${narrow.map((x) => x.r.hOver).join('/')}px · 화면 밖으로 나간 요소 ${narrow.map((x) => x.r.over).join('/')} · 띠 «${(narrow[0].r.strip || '').replace(/\s+/g, ' ').slice(0, 60)}»`,
        narrow.every((x) => x.r.hOver <= 1 && x.r.over === 0 && /숫자 갱신 정지/.test(x.r.strip) && /오답\s*1/.test(x.r.strip) && /나 오늘/.test(x.r.strip)), JSON.stringify(narrow).slice(0, 400));
    }
    //  줄 누르기 → 전체화면 시트 → ‹ 목록
    const sheetRows = [];
    for (const [w, h] of [[390, 844], [360, 800]]) for (const mode of ['normal', 'large']) {
      await mount({ w, h, mode, voyages: SIX });
      const k0 = WORK.sort((a, b) => startOf(a) - startOf(b))[0];
      await click(`[data-ship-row="${k0}"]`); await sleep(400);
      const s = await pg.evaluate(() => { const sh = document.querySelector('[data-home-sheet]'); if (!sh) return null; const r = sh.getBoundingClientRect();
        return { key: sh.dataset.homeSheet, top: Math.round(r.top), h: Math.round(r.height), vh: window.innerHeight, hOver: sh.scrollWidth - sh.clientWidth, detail: !!sh.querySelector('[data-ship-detail]'),
          open: [...sh.querySelectorAll('[data-ship-open] button')].map((b) => b.innerText.trim()), boxes: sh.querySelectorAll('[data-side-box]').length }; });
      await shot(`phone${w}_${mode}_sheet`);
      if (s) await click('[data-home-sheet-close]');
      const closed = await pg.evaluate(() => !document.querySelector('[data-home-sheet]'));
      sheetRows.push({ w, mode, s, closed, k0 });
    }
    const badP3 = sheetRows.filter(({ s, closed, k0 }) => !s || s.key !== k0 || s.top !== 0 || s.h !== s.vh || s.hOver > 1 || !s.detail || !s.open.includes('양하 열기') || !closed);
    ok(`②-3 폰 줄 → 그 배 전체화면 시트(화면 전체 · 상세와 같은 내용 · 위에 [${sheetRows[0].s ? sheetRows[0].s.open.join('][') : '?'}]) → [‹ 목록] 닫힘 · 시트 가로 스크롤 0`,
      !badP3.length, JSON.stringify(badP3.map((r) => [r.w, r.mode, r.s, r.closed])).slice(0, 400));

    //  ③ 문 전수 — 컴 1440 보통(소유자 김성일 · 작업자)에서 하나씩
    const st = {};
    const fresh = (o2 = {}) => mount({ w: 1440, h: 900, ...o2 });
    const detOf = async (k) => { await click(`[data-ship-row="${k}"]`); await sleep(250); return pg.evaluate((k) => { const d = document.querySelector(`[data-ship-detail="${k}"]`); return d ? d.innerText.replace(/\s+/g, ' ') : ''; }, k); };
    await fresh();
    {
      const s0 = await textOf('[data-home-strip]');
      st.collector = /수집기 1분 전/.test(s0) && /자료 정상|검증 필요/.test(s0) && (await click('[data-home-chip="collector"]')) && (await calls('aux')).length === 1;
      st.chief = (await click('[data-home-chip="chief"]')) && (await calls('chief')).length === 1;
      st.count = new RegExp(`항차 ${KEYS.length} · 작업 중 ${WORK.length}`).test(s0) && new RegExp(`작업 중 ${WORK.length}`).test(await textOf('[data-home-group="work"]'));
      //  부두 — 자동이 GPS 로 PNCT 를 잡고, 메뉴 넷 + 다시 재기
      const pierLbl = await textOf('[data-home-menu="pier"] > button');
      await click('[data-home-menu="pier"] > button');
      const items = await pg.evaluate(() => [...document.querySelectorAll('[data-home-menu="pier"] [role="menuitem"]')].map((b) => b.innerText.replace('✓ ', '').trim()));
      await pg.evaluate(() => { const b = [...document.querySelectorAll('[data-home-menu="pier"] [role="menuitem"]')].find((x) => x.innerText.trim() === 'PCTC'); if (b) b.click(); }); await sleep(300);
      const pctcFirst = await pg.evaluate(() => { const g = document.querySelector('[data-home-group="d1"]'); let n = g && g.nextElementSibling; return n && n.dataset.shipRow; });
      st.pier = /자동·PNCT/.test(pierLbl) && items.join('|') === '자동·PNCT|PCTC|PNCT|전체|🔄 위치 다시 재기' && PIER(pctcFirst) === 'PCTC' && /PCTC/.test(await textOf('[data-home-menu="pier"] > button'));
      st.pierOrder = st.pier;
      const g0 = await pg.evaluate(() => window.__gps);
      await click('[data-home-menu="pier"] > button');
      await pg.evaluate(() => { const b = [...document.querySelectorAll('[data-home-menu="pier"] [role="menuitem"]')].find((x) => /위치 다시 재기/.test(x.innerText)); if (b) b.click(); }); await sleep(500);
      st.gps = (await pg.evaluate(() => window.__gps)) === g0 + 1 && /자동·PNCT/.test(await textOf('[data-home-menu="pier"] > button'));
      //  메뉴 밖 누르면 닫힘
      await click('[data-home-menu="new"] > button');
      const opened = await pg.evaluate(() => !!document.querySelector('[data-home-menu="new"] [role="menu"]'));
      await pg.mouse.click(700, 600); await sleep(300);
      st.menuClose = opened && (await pg.evaluate(() => !document.querySelector('[role="menu"]')));
      for (const [id, re, lbl] of [['newDis', '양하 항차 추가', '양하 항차'], ['newLod', '선적 항차 추가', '선적 항차'], ['forecast', '물량 예보 붙여넣기', '물량 예보 붙여넣기']]) {
        await click('[data-home-menu="new"] > button');
        await pg.evaluate((l) => { const b = [...document.querySelectorAll('[data-home-menu="new"] [role="menuitem"]')].find((x) => x.innerText.trim().endsWith(l)); if (b) b.click(); }, lbl); await sleep(350);
        st[id] = await pg.evaluate((src) => [...document.querySelectorAll('.fixed.inset-0')].some((m) => new RegExp(src).test(m.innerText)), re);
        await pg.evaluate(() => { const b = [...document.querySelectorAll('.fixed.inset-0 button')].find((x) => x.innerText.trim() === '취소'); if (b) b.click(); }); await sleep(250);
      }
      st.refresh = (await click('[data-home-strip] button[title^="화면을 다시 불러오지"]')) && (await calls('refresh')).length === 1;
      //  묶음·줄 순서 — 작업 중(시작 순) → 내일(현 부두 먼저) → 그 밖 → (접힘) 자료 대기
      await fresh();
      const order = await pg.evaluate(() => [...document.querySelectorAll('[data-home-scroll] > *')].map((el) => el.dataset.homeGroup ? '#' + el.dataset.homeGroup : el.dataset.shipRow ? el.dataset.shipRow : el.dataset.homeOther ? [...el.querySelectorAll('[data-ship-row]')].map((x) => x.dataset.shipRow).join(',') : '').filter(Boolean).join(','));
      //  4.25 2차(감사 하-1): 컴은 그 밖의 배까지 날짜 묶음으로 다 편다(6개 채움은 폰 접힘용) — 지난 배만 «🗓 그 밖의 배»(이 사본엔 없음)
      const byDay = (ks) => [...new Set(ks.map(dayOf))].sort((a, b) => a - b).flatMap((n) => [`#d${n}`, ...ord(ks.filter((k) => dayOf(k) === n))]);
      const wantOrder = ['#work', ...ord(WORK), '#d1', ...TOMOR, ...byDay(OTHER)].join(',');
      st.rows = order === wantOrder && WORK.length === 3;
      st.other = st.rows && !(await pg.$('[data-home-group="other"]')) && !(await pg.$('[data-home-other]'));
      ok(`③-0 묶음·줄 순서 = 원자료(작업 중 ${WORK.length} → 내일 ${TOMOR.length}(PNCT 먼저) → 날짜 묶음 ${byDay(OTHER).filter((x) => x[0] === '#').join('·')} · 자료 대기 ${WAIT.length} 은 접힘)`, st.rows, `${order} ≠ ${wantOrder}`);
      //  상세 — 열기 셋 · 배지 · 항로 · 대수 · 상태 · 실 정책
      const kD = 'DXQD_2640E';
      const tD = await detOf(kD);
      await click(`[data-ship-detail="${kD}"] [data-act="open-head"]`);
      await click(`[data-ship-detail="${kD}"] [data-side-box="discharge"]`);
      await click(`[data-ship-detail="${kD}"] [data-side-box="loading"]`);
      await click(`[data-ship-detail="${kD}"] [data-act="open-discharge"]`);
      await click(`[data-ship-detail="${kD}"] [data-act="open-loading"]`);
      const ov = (await calls('openVoyage')).map((c) => c.a.join('|'));
      st.openHead = ov[0] === `${kD}|`;
      st.openDis = ov[1] === `${kD}|discharge` && ov[3] === `${kD}|discharge`;
      st.openLod = ov[2] === `${kD}|loading` && ov[4] === `${kD}|loading`;
      st.pierTag = /📍 PNCT · E15/.test(tD) && /2640E · E15/.test(await textOf(`[data-ship-row="${kD}"]`)) && await pg.evaluate((k) => /pier-pnct/.test(document.querySelector(`[data-ship-row="${k}"]`).className), kD);
      //  작업일시 배지 — 출항 배지로 바뀐 적 없는 배(원자료 departBadgeAt 없음)는 📅 «내일 HH:MM» + 제목에 MM-DD 작업일(planDate 그대로) · 바뀐 배(DXQD — departBadgeAt 있음)는 🚢 출항(도선 예보 nextDep 그대로)
      {
        const kP = TOMOR.find((k) => !VOY[k].info.departBadgeAt);
        const [p0, p1] = String(VOY[kP].info.planDate).split('~').map((x) => x.trim());
        const tP = await detOf(kP);
        const tit = await pg.evaluate((k) => (document.querySelector(`[data-ship-detail="${k}"] [data-ship-plan]`) || {}).title || '', kP);
        const dep = String(H.pilot_forecast[VOY[kD].info.vsl].nextDep || '');
        const tD2 = await detOf(kD);
        st.planTag = new RegExp(`📅 내일 ${p0.slice(11, 16)}`).test(tP) && tit.includes(`작업 ${p0.slice(5, 16)} ~ ${p1.slice(5, 16)}`) && !!VOY[kD].info.departBadgeAt && new RegExp(`🚢 출항 내일 ${dep.slice(11, 16)} ⚓도선`).test(tD2)
          && new RegExp(p0.slice(11, 16)).test(await textOf(`[data-ship-row="${kP}"] [data-row-status]`));
        if (!st.planTag) st.planTagDbg = JSON.stringify({ kP, tP: tP.slice(0, 200), tit, dep, tD2: tD2.slice(0, 200) });
      }
      st.voyLine = /2640E \/ 2640W/.test(tD);
      st.lane = /항로 PLS/.test(tD) && /평택/.test(tD);
      st.breakdown = /평택 \d+ · 매칭 \d+/.test(tD) && /배정 0/.test(tD) && !/\(\+250\)|앱 \+250/.test(tD);
      st.term = /본선 128\/250/.test(tD) && (await pg.$$(`[data-ship-detail="${kD}"] [data-term]`)).length === 2;
      st.rem = /남음 122/.test(tD) && /남음 216/.test(tD);
      st.dataTag = /수정본|자료 확정|갱신/.test(tD);
      st.auto = /🤖 자동\(확정\)/.test(await detOf('DXQD_2640E')) && /🤖 자동\(수집중\)/.test(await detOf('ATPR_2645E'));   // 원자료 autoStatus confirmed · collecting
      st.pmEta = await (async () => { for (const k of DATA) { if (/🚢신고도착 \d\d:\d\d/.test(await detOf(k))) return true; } return false; })();
      const tO = await detOf('OBWH_2763E');
      st.forecastBox = /▲ 긴급 13대/.test(tO) && /🧳 수화물 컨 1대/.test(tO);
      const tA = await detOf('ATPR_2645E');
      st.status = /● 최관식 작업중/.test(tA) && /● 최관식/.test(await textOf('[data-ship-row="ATPR_2645E"] [data-row-status]')) && /본선 작업중 · 접속 검수원 없음/.test(tD) && /본선 작업중/.test(await textOf(`[data-ship-row="${kD}"] [data-row-status]`)) && /대기 중/.test(await detOf('XTPG_544E'));
      st.missingSide = /선적 없음 — 배정에도 0 \(정상\)/.test(tA);
      st.more = !(await pg.evaluate(() => [...document.querySelectorAll('button')].some((b) => /▾ 자세히|▴ 접기/.test(b.innerText))));
      //  막대 — 줄 작은 막대와 상세 큰 숫자가 같고 원자료와 같다(아래 ④ 에서 전부)
      st.bars = true;
      //  실 정책 — 접힘(목록 칸 맨 아래) → 배 칩 → 수정 창 · 상세 한 줄 → 같은 창
      await click('[data-home-list] > [data-home-fold="policy"]');
      const polChips = await pg.$$('[data-home-policy] button');
      if (polChips[0]) { await polChips[0].click(); await sleep(400); }
      const polModal1 = await pg.evaluate(() => [...document.querySelectorAll('.fixed.inset-0')].some((m) => /실 정책|LOLO|엠티/.test(m.innerText)));
      await pg.keyboard.press('Escape'); await sleep(200);
      await fresh();
      await detOf(kD);
      const hasPolLine = await click(`[data-ship-detail="${kD}"] [data-act="policy"]`);
      const polModal2 = await pg.evaluate(() => [...document.querySelectorAll('.fixed.inset-0')].some((m) => /실 정책|LOLO|엠티/.test(m.innerText)));
      st.policy = polChips.length >= Object.keys(H.shipPolicies).length && polModal1 && hasPolLine && polModal2;
      if (!st.policy) st.policyDbg = JSON.stringify({ chips: polChips.length, pol: Object.keys(H.shipPolicies).length, polModal1, hasPolLine, polModal2 });
      //  자료 대기 — 접힘(목록 칸 맨 아래) → 펼치면 그 배 줄 → 줄 → 상세 [항차 열기 →]
      await fresh();
      const waitHidden = await pg.evaluate(() => { const w = document.querySelector('[data-home-wait]'); return !!w && w.classList.contains('hidden') && w.querySelectorAll('[data-ship-row]').length; });
      await click('[data-home-list] > [data-home-fold="wait"]');
      const waitShown = await pg.evaluate(() => { const w = document.querySelector('[data-home-wait]'); return !!w && !w.classList.contains('hidden') ? w.querySelectorAll('[data-ship-row]').length : 0; });
      st.wait = waitHidden === WAIT.length && waitShown === WAIT.length && new RegExp(`자료 대기 ${WAIT.length}척`).test(await textOf('[data-home-list] > [data-home-fold="wait"]'));
      await click(`[data-ship-row="${WAIT[0]}"]`);
      await click(`[data-ship-detail="${WAIT[0]}"] [data-act="open"]`);
      st.openNone = (await calls('openVoyage')).some((c) => c.a.join('|') === `${WAIT[0]}|` || c.a.join('|') === WAIT[0]) && /📅 /.test(await textOf(`[data-ship-detail="${WAIT[0]}"]`)) && /자료 없음/.test(await textOf(`[data-ship-detail="${WAIT[0]}"]`));
      //  ⚡ 지금 처리 — 같은 처리기: collector_commands 요청 한 건(메모리 RTDB)
      await fresh(); await detOf(kD);
      const w0 = await writes();
      await click(`[data-ship-detail="${kD}"] [data-act="zap"]`); await sleep(400);
      const zapLog = await pg.evaluate(() => (window.__memlog || []).map((x) => x.path));
      st.zap = (await writes()) === w0 + 1 && /^collector_commands\//.test(zapLog[zapLog.length - 1]) && /처리 중/.test(await textOf(`[data-ship-detail="${kD}"] [data-act="zap"]`));
      //  다른 배를 보고 와도 «처리 중» 이 남는다(배마다 상태)
      await detOf('OBWH_2763E'); await detOf(kD);
      st.zap = st.zap && /처리 중/.test(await textOf(`[data-ship-detail="${kD}"] [data-act="zap"]`));
      //  완료 — 확인창 [취소] 쓰기 0 · [표시] → info 한 건
      await fresh(); await detOf(kD);
      const w1 = await writes();
      await click(`[data-ship-detail="${kD}"] [data-act="done-discharge"]`);
      const cm = await pg.evaluate(() => [...document.querySelectorAll('.fixed.inset-0')].map((m) => m.innerText).join('|'));
      await pg.evaluate(() => { const b = [...document.querySelectorAll('.fixed.inset-0 button')].find((x) => x.innerText.trim() === '취소'); if (b) b.click(); }); await sleep(250);
      const w2 = await writes();
      await click(`[data-ship-detail="${kD}"] [data-act="done-discharge"]`);
      await pg.evaluate(() => { const b = [...document.querySelectorAll('.fixed.inset-0 button')].find((x) => x.innerText.trim() === '양하 완료 표시'); if (b) b.click(); }); await sleep(400);
      const w3 = await writes();
      const done1 = await pg.evaluate(() => (window.__memdb.voyages.DXQD_2640E.info || {}).dischargeDone === true);
      st.doneDis = /⬇ 양하 완료/.test(cm) && w2 === w1 && w3 === w1 + 1 && done1;
      await click(`[data-ship-detail="${kD}"] [data-act="done-loading"]`);
      const cmL = await pg.evaluate(() => [...document.querySelectorAll('.fixed.inset-0')].map((m) => m.innerText).join('|'));
      await pg.evaluate(() => { const b = [...document.querySelectorAll('.fixed.inset-0 button')].find((x) => x.innerText.trim() === '취소'); if (b) b.click(); }); await sleep(250);
      st.doneLod = /⬆ 선적 완료/.test(cmL) && (await writes()) === w3;
    }
    //  완료 표시가 된 배(사본을 고친 꼴) — 되돌리기 · 검수 완료 · 줄 상태(작업자만)
    {
      const V2 = JSON.parse(JSON.stringify(VOY));
      V2.DXQD_2640E.info.dischargeDone = true; V2.DXQD_2640E.info.dischargeDoneAt = NOW - 600000;
      V2.OBWH_2763E.info.inspectorDone = true;
      await fresh({ voyages: V2 });
      const rowSt = await textOf('[data-ship-row="DXQD_2640E"] [data-row-status]');
      await click('[data-ship-row="DXQD_2640E"]');
      const w0 = await writes();
      await click('[data-ship-detail="DXQD_2640E"] [data-act="undo-discharge"]'); await sleep(300);
      const undone = await pg.evaluate(() => (window.__memdb.voyages.DXQD_2640E.info || {}).dischargeDone === false);
      st.undo = (await writes()) === w0 + 1 && undone;
      await click('[data-ship-row="OBWH_2763E"]');
      st.allDone = !!(await pg.$('[data-ship-detail="OBWH_2763E"] [data-act="all-done"]'));
      const rowSt2 = await textOf('[data-ship-row="OBWH_2763E"] [data-row-status]');
      //  조회만이면 줄 상태에 완료 표시가 없다(종전 조건 — onComplete 가 있을 때만)
      await fresh({ voyages: V2, view: true });
      const rowSt3 = await textOf('[data-ship-row="DXQD_2640E"] [data-row-status]');
      st.doneStatus = /양하 완료 ✓/.test(rowSt) && /검수 완료 · 수석 대기/.test(rowSt2) && !/완료/.test(rowSt3);
    }
    //  캔슬·자동삭제·목적지 확인·사전에 없음·오답·나 오늘 — 사본을 고친 꼴(원자료 한 칸만 바꿈)
    {
      const V3 = JSON.parse(JSON.stringify(VOY));
      V3.NSFR_2619N.info.cancelLod = true;                    // 선적 전량 캔슬
      const kOld = 'XTPG_544E';
      for (const r of Object.values(V3[kOld].discharge.records || {}).slice(0, 1)) void r;
      V3[kOld].discharge.completed = { [Object.keys(V3[kOld].discharge.ediContainers)[0]]: { at: NOW - 9 * 86400000, by: '연막' } };   // 마지막 작업 9일 전
      //  목적지 갈림 — 리스트는 평택인데 EDI 는 인천인 컨 하나(3.53 podConflictOf 가 묻는 꼴)
      const kPod = 'SWSP_2609N';
      const dE = V3[kPod].discharge.ediContainers; const dR = V3[kPod].discharge.records;
      const podCn = Object.keys(dE).find((k) => dR[dE[k].cn || k] && isPtkCode(dR[dE[k].cn || k].pod) && isPtkCode(dE[k].pod));
      dE[podCn] = { ...dE[podCn], pod: 'KRINC' };
      //  오답 하나 미회신 · 내 완료(김성일) 오늘 두 대
      const fb = { ...(F.feedback || {}), 1791800000000: { query: '연막 질문', ts: 1791800000000 } };
      const myCn = Object.keys(V3.DXQD_2640E.discharge.completed || {}).slice(0, 2);
      for (const cn of myCn) V3.DXQD_2640E.discharge.completed[cn] = { ...V3.DXQD_2640E.discharge.completed[cn], by: '김성일', at: NOW - 3600000 };
      const dict = Object.fromEntries(KEYS.map((k) => VOY[k].info.vsl).filter((s) => s !== 'QDTR').map((s) => [s, { code: s, name: s, bayDef: { recordCount: 1 } }]));   // 사전 사본 — QDTR 만 베이 구조 없음(R24 와 같은 꼴: 이름·베이 구조)
      await mount({ w: 1440, h: 900, voyages: V3, view: true, seed: seedOf({ feedback: fb }), dict });   // 조회만 — 자동 정리(7일)가 사본을 지우지 않게
      const rN = await textOf('[data-ship-row="NSFR_2619N"]');
      const tN = await detOf('NSFR_2619N');
      st.cancel = /선적 ⛔ 전량 캔슬/.test(rN) && /⛔ 전량 캔슬/.test(tN) && !(await pg.$('[data-ship-detail="NSFR_2619N"] [data-side-box="loading"][data-total]'));
      st.autodel = /작업 9일 전 \(곧 자동삭제\)/.test(await detOf(kOld));
      const podRow = await pg.$(`[data-ship-row="${kPod}"] [data-pod-issue]`);
      st.pod = !!podRow && (await podRow.evaluate((x) => x.dataset.podIssue)) === '1';
      if (podRow) { await podRow.click(); await sleep(300); }
      const ovP = (await calls('openVoyage')).map((c) => c.a.join('|'));
      st.pod = st.pod && ovP.includes(`${kPod}|discharge`) && !!(await pg.$(`[data-ship-detail="${kPod}"] [data-pod-issue]`)) === false;   // 줄의 칩은 줄을 고르지 않고 바로 연다
      await click(`[data-ship-row="${kPod}"]`);
      st.pod = st.pod && !!(await pg.$(`[data-ship-detail="${kPod}"] [data-pod-issue="1"]`));
      if (!st.pod) st.podDbg = JSON.stringify({ podCn, row: !!podRow, ovP });
      await click('[data-home-list] > [data-home-fold="wait"]');
      st.dict = !!(await pg.$('[data-ship-row="QDTR_2608E"] [data-dict-missing]')) && (await pg.$$('[data-ship-row] [data-dict-missing]')).length === 1;
      if (!st.dict) st.dictDbg = JSON.stringify({ q: !!(await pg.$('[data-ship-row="QDTR_2608E"] [data-dict-missing]')), n: (await pg.$$('[data-ship-row] [data-dict-missing]')).length, rows: await pg.evaluate(() => [...document.querySelectorAll('[data-ship-row] [data-dict-missing]')].map((x) => x.closest('[data-ship-row]').dataset.shipRow)) });
      st.feedback = false;   // 조회만 소유자 — 아래 작업자 마운트에서
      await mount({ w: 1440, h: 900, voyages: V3, seed: seedOf({ feedback: fb }) });
      st.feedback = /❌ 오답\s*1/.test(await textOf('[data-home-chip="feedback"]') || '') && (await click('[data-home-chip="feedback"]')) && (await calls('chief')).length === 1;
      const meChip0 = await textOf('[data-home-chip="me"]');
      const meLine0 = !!(await pg.$('[data-home-me]'));
      await click('[data-home-chip="me"]');
      const meLine1 = await textOf('[data-home-me]');
      st.me = /나 오늘 2\s?대/.test(meChip0 || '') && !meLine0 && /오늘 2\s?대/.test(meLine1 || '') && /마지막 완료 60분 전/.test(meLine1 || '');
      if (!st.me) st.meDbg = JSON.stringify({ meChip0, meLine0, meLine1 });
    }
    //  출항 배지 sticky — 접힌 묶음(폰 «그 밖의 배» · 닫힘) 안의 지난 배도 줄이 기록한다(departBadgeAt)
    {
      const V4 = JSON.parse(JSON.stringify(VOY));
      const kS = 'KKAK_2610N';
      V4[kS].info.terminalStatus = 'departed'; V4[kS].info.planDate = '2026-10-10 08:00 ~ 2026-10-10 18:00'; delete V4[kS].info.departBadgeAt;
      await mount({ w: 390, h: 844, voyages: V4 });
      const hidden = await pg.evaluate((k) => { const r = document.querySelector(`[data-ship-row="${k}"]`); return !!r && !!r.closest('.hidden'); }, kS);
      const at = await pg.evaluate((k) => ((window.__memdb.voyages[k] || {}).info || {}).departBadgeAt, kS);
      st.sticky = hidden && typeof at === 'number';
      //  TOP — 폰 목록을 내리면 뜬다
      await pg.evaluate(() => { const b = document.querySelector('[data-home-fold="other"]'); if (b) b.click(); }); await sleep(200);   // 없으면 아래 st.other 가 ✘
      await pg.evaluate(() => { const b = document.querySelector('[data-home-fold="wait"]'); if (b) b.click(); }); await sleep(200);
      await pg.evaluate(() => window.scrollTo(0, 2000)); await sleep(400);
      st.top = await pg.evaluate(() => [...document.querySelectorAll('button')].some((b) => /TOP/.test(b.innerText) && getComputedStyle(b).position === 'fixed'));
      await pg.evaluate(() => window.scrollTo(0, 0));
      //  폰 «그 밖의 배» 접힘 — 펴면 그 배 줄
      st.other = st.other && (await pg.evaluate((k) => { const r = document.querySelector(`[data-ship-row="${k}"]`); return !!r && !r.closest('.hidden'); }, 'XTPG_544E'));
    }
    //  빈 목록
    await mount({ w: 1440, h: 900, voyages: {} });
    st.empty = /진행 중인 항차가 없습니다/.test(await textOf('[data-home-root]') || '');
    //  위험 단추 — 🗑 → 종전 확인창(양하만·선적만·전체) → [취소]/[← 뒤로] 쓰기 0 · 떨어진 자리 · 빨간 테두리
    await fresh(); await detOf('DXQD_2640E');
    {
      const geo = await pg.evaluate(() => {
        const acts = document.querySelector('[data-ship-detail="DXQD_2640E"] [data-ship-acts]'); if (!acts) return null;
        const del = acts.querySelector('[data-act="delete"]'); const d = del.getBoundingClientRect();
        const others = [...acts.querySelectorAll('button, [data-act="all-done"]')].filter((b) => b !== del).map((b) => b.getBoundingClientRect());
        const gapX = Math.min(...others.filter((r) => Math.abs(r.top - d.top) < 8).map((r) => d.left - r.right), 9999);
        return { gapX: Math.round(gapX), red: /border-red/.test(del.className), danger: del.dataset.danger === '1', sameLine: others.some((r) => Math.abs(r.top - d.top) < 8) };
      });
      const w0 = await writes();
      await click('[data-ship-detail="DXQD_2640E"] [data-act="delete"]');
      const m1 = await pg.evaluate(() => [...document.querySelectorAll('.fixed.inset-0')].map((m) => m.innerText.replace(/\s+/g, ' ')).join('|'));
      await pg.evaluate(() => { const b = [...document.querySelectorAll('.fixed.inset-0 button')].find((x) => x.innerText.trim() === '취소'); if (b) b.click(); }); await sleep(250);
      const w1 = await writes();
      await click('[data-ship-detail="DXQD_2640E"] [data-act="delete"]');
      await pg.evaluate(() => { const b = [...document.querySelectorAll('.fixed.inset-0 button')].find((x) => /항차 전체 삭제/.test(x.innerText)); if (b) b.click(); }); await sleep(250);
      const m2 = await pg.evaluate(() => [...document.querySelectorAll('.fixed.inset-0')].map((m) => m.innerText.replace(/\s+/g, ' ')).join('|'));
      await pg.evaluate(() => { const b = [...document.querySelectorAll('.fixed.inset-0 button')].find((x) => /← 뒤로/.test(x.innerText)); if (b) b.click(); }); await sleep(250);
      await pg.evaluate(() => { const b = [...document.querySelectorAll('.fixed.inset-0 button')].find((x) => x.innerText.trim() === '취소'); if (b) b.click(); }); await sleep(250);
      const w2 = await writes();
      const closed = await pg.evaluate(() => ![...document.querySelectorAll('.fixed.inset-0')].some((m) => /항차 삭제|항차 전체 삭제/.test(m.innerText)));
      st.delete = !!geo && geo.red && geo.danger && (geo.gapX >= 24 || !geo.sameLine) && /양하만 삭제/.test(m1) && /선적만 삭제/.test(m1) && /항차 전체 삭제/.test(m1) && /완료 기록 \d+대가 있습니다/.test(m2) && w1 === w0 && w2 === w0 && closed;
      ok(`⑥-1 위험 단추 🗑 — 동작 줄 끝 떨어진 자리(옆 단추와 ${geo ? (geo.sameLine ? geo.gapX + 'px' : '다른 줄') : '?'}) · 빨간 테두리 · 누르면 종전 확인창(양하만·선적만·전체) [취소] 쓰기 ${w1 - w0}건 · [전체] → «완료 기록 N대» 경고 → [← 뒤로]·[취소] 쓰기 ${w2 - w0}건`,
        st.delete, JSON.stringify({ geo, m1: m1.slice(0, 120), m2: m2.slice(0, 160), w0, w1, w2, closed }));
      //  두 번 다 [예] 면 종전 처리기 그대로 지운다(휴지통 복사 → 항차 지움 — 메모리 RTDB)
      await click('[data-ship-detail="DXQD_2640E"] [data-act="delete"]');
      await pg.evaluate(() => { const b = [...document.querySelectorAll('.fixed.inset-0 button')].find((x) => /항차 전체 삭제/.test(x.innerText)); if (b) b.click(); }); await sleep(250);
      await pg.evaluate(() => { const b = [...document.querySelectorAll('.fixed.inset-0 button')].find((x) => x.innerText.trim() === '삭제'); if (b) b.click(); }); await sleep(600);
      const gone = await pg.evaluate(() => !window.__memdb.voyages.DXQD_2640E && !!(window.__memdb.archive_trash && Object.keys(window.__memdb.archive_trash).length));
      ok(`⑥-2 [🗑] → [항차 전체 삭제] → [삭제] 면 종전 처리기 그대로(휴지통 복사 뒤 항차 지움 · 메모리 RTDB) — 처리기 불변`, gone, JSON.stringify({ gone }));
    }

    //  ③ 결과 — 옛 문 하나하나
    const badDoors = OLD_DOORS.filter(([, , k]) => !st[k]);
    for (const [grp, keys] of [
      ['맨 위 줄 → 상태 띠(오답·나 오늘·수집기·수석 상황판·항차 수)', ['feedback', 'me', 'collector', 'chief', 'count']],
      ['조작 줄(부두·위치 다시 재기·새 항차 셋·새로고침·메뉴 닫힘)', ['pier', 'gps', 'newDis', 'newLod', 'forecast', 'refresh', 'menuClose']],
      ['배 줄·묶음(순서·현 부두 먼저·그 밖·자료 대기·sticky·TOP·빈 목록)', ['rows', 'pierOrder', 'other', 'wait', 'sticky', 'top', 'empty']],
      ['상세 — 여는 문(머리·양하·선적·자료 없는 배)·목적지 확인·사전에 없음', ['openHead', 'openDis', 'openLod', 'openNone', 'pod', 'dict']],
      ['상세 — 배지·항로·대수·본선·남음·캔슬·한쪽 없음·예보·상태(카드의 «자세히» 내용 전부)', ['pierTag', 'planTag', 'pmEta', 'auto', 'voyLine', 'lane', 'dataTag', 'autodel', 'breakdown', 'bars', 'term', 'rem', 'cancel', 'missingSide', 'forecastBox', 'status', 'doneStatus', 'more']],
      ['상세 — 동작(지금 처리·완료 둘·되돌리기·검수 완료·삭제)·실 정책', ['zap', 'doneDis', 'doneLod', 'undo', 'allDone', 'delete', 'policy']],
    ]) {
      const b = keys.filter((k) => !st[k]);
      ok(`③ 문 전수 — ${grp} : ${keys.length - b.length}/${keys.length} 새 자리에서 열림`, !b.length, b.map((k) => `${k} — ${(OLD_DOORS.find((d) => d[2] === k) || [])[0] || k}${st[k + 'Dbg'] ? ' ' + st[k + 'Dbg'] : ''}`).join(' | '));
    }
    ok(`③ 빠진 문 0 — 옛 홈의 문 ${OLD_DOORS.length}개(맨 위 줄 · 조작 줄 · 카드 안 단추·배지·막대 · 접힘 · 창 · 기록)가 전부 새 자리에서 열리거나 보인다`, !badDoors.length, badDoors.map((d) => d[0]).join(' | '));

    //  ④ 숫자 한 벌 — 줄 작은 막대 = 상세 큰 숫자 = 원자료 · 베이 칸 합 = 상세 · 수석 상황판 보드(같은 사본) = 홈
    await fresh();
    await click('[data-home-list] > [data-home-fold="wait"]');
    const got = {};
    for (const k of DATA) {
      await click(`[data-ship-row="${k}"]`); await sleep(150);
      got[k] = await pg.evaluate((k) => {
        const rowB = (m) => { const b = document.querySelector(`[data-ship-row="${k}"] [data-row-bar="${m}"]`); return b ? (b.dataset.total != null ? `${b.dataset.done}/${b.dataset.total}` : 'x') : null; };
        const boxB = (m) => { const b = document.querySelector(`[data-ship-detail="${k}"] [data-side-box="${m}"]`); return b ? (b.dataset.total != null ? `${b.dataset.done}/${b.dataset.total}` : 'x') : null; };
        const bays = document.querySelector(`[data-ship-detail="${k}"] [data-ship-bays]`);
        const cells = bays ? [...bays.querySelectorAll('[data-bay-cell]')] : [];
        return { rD: rowB('discharge'), rL: rowB('loading'), dD: boxB('discharge'), dL: boxB('loading'), bayMode: bays ? bays.dataset.shipBays : '',
          baySum: cells.length ? `${cells.reduce((t, c) => t + +c.dataset.done, 0)}/${cells.reduce((t, c) => t + +c.dataset.total, 0)}` : null,
          nan: /NaN/.test(document.querySelector('[data-home-root]').innerText) };
      }, k);
    }
    const badN = DATA.filter((k) => { const g = got[k], w = want[k]; return g.rD !== w.dis || g.dD !== w.dis || g.rL !== w.lod || g.dL !== w.lod || g.nan; });
    ok(`④-1 줄 = 상세 = 원자료(평택 양하분 · 선적 리스트 행 · 완료) — 자료 있는 ${DATA.length}척 전부(${DATA.slice(0, 4).map((k) => `${k.split('_')[0]} ${[got[k].rD, got[k].rL].filter(Boolean).join('·')}`).join(' · ')} …) · 한쪽 구역 없는 배(ATPR·STMJ·KKAK) «NaN» 0`,
      !badN.length, JSON.stringify(badN.map((k) => [k, got[k], want[k]])).slice(0, 500));
    const badB = DATA.filter((k) => { const g = got[k]; if (!g.bayMode) return !!(want[k].dis || want[k].lod); return g.baySum !== (g.bayMode === 'discharge' ? want[k].dis : want[k].lod); });
    ok(`④-2 베이별 진행 칸 합 = 위 큰 숫자 = 원자료(${DATA.slice(0, 3).map((k) => `${k.split('_')[0]} ${got[k].bayMode === 'loading' ? '선적' : '양하'} ${got[k].baySum}`).join(' · ')} …)`, !badB.length, JSON.stringify(badB.map((k) => [k, got[k]])).slice(0, 400));
    //  수석 상황판(같은 사본 · 폰 카드)의 양하·선적 완료/전체 = 홈
    await mount({ w: 390, h: 844, page: 'chief' });
    const board = await pg.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-phone-ship]')].map((card) => {
      const bars = [...card.querySelectorAll('.grid')].map((g) => { const sp = g.querySelectorAll('span'); return [sp[0] ? sp[0].innerText.trim() : '', (g.lastElementChild || {}).innerText ? g.lastElementChild.innerText.replace(/\s+/g, '') : '']; });
      return [card.dataset.phoneShip, Object.fromEntries(bars)];
    })));
    const bKeys = Object.keys(board);
    const badC = bKeys.filter((k) => (board[k]['양하'] || null) !== (got[k] && got[k].rD && want[k].dis && (want[k].dis.split('/')[1] !== '0') ? got[k].rD : null) || (board[k]['선적'] || null) !== (got[k] && got[k].rL && want[k].lod && (want[k].lod.split('/')[1] !== '0') ? got[k].rL : null));
    ok(`④-3 수석 상황판 보드(같은 사본으로 그린 폰 카드 ${bKeys.length}척 — ${bKeys.map((k) => `${k.split('_')[0]} ${Object.entries(board[k]).map(([a, b]) => a + ' ' + b).join(' · ')}`).join(' / ')}) = 홈 줄 = 원자료`,
      bKeys.length >= WORK.length && WORK.every((k) => bKeys.includes(k)) && !badC.length, JSON.stringify({ board, got: Object.fromEntries(bKeys.map((k) => [k, got[k]])) }).slice(0, 500));

    {
      const sh = await pg.evaluate(() => window.__R35.shape());
      ok(`④-4 computeStats «구역 없음» 반환 = 정상 반환과 같은 모양(키 ${sh.fullKeys.split(',').length}개 같음 · 작업량 workTotal·workDone 0 — 합산해도 «NaN» 안 남 · 4.24 수석 쪽 수리와 같은 뿌리)`,
        sh.emptyKeys === sh.fullKeys && sh.wt === 0 && sh.wd === 0 && Number.isFinite(sh.sum), JSON.stringify(sh).slice(0, 400));
    }
    //  ⑤ 역할 — 보이는 단추가 종전 조건과 같다(수석 단추 = canOpenChief · 오답 칩 = 소유자 · 새 항차·동작 = 조회만 아님)
    const fbU = { ...(F.feedback || {}), 1791800000000: { query: '연막 질문', ts: 1791800000000 } };
    const roles = [
      ['소유자 김성일 · 작업자', { inspector: '김성일' }, { chief: true, fb: true, neu: true, acts: true }],
      ['수석 이현규 · 작업자', { inspector: '이현규' }, { chief: true, fb: false, neu: true, acts: true }],
      ['일반 검수원 장문영 · 작업자', { inspector: '장문영' }, { chief: false, fb: false, neu: true, acts: true }],
      ['소유자 김성일 · 조회만', { inspector: '김성일', view: true }, { chief: true, fb: true, neu: false, acts: false }],
      ['일반 검수원 장문영 · 조회만', { inspector: '장문영', view: true }, { chief: false, fb: false, neu: false, acts: false }],
    ];
    const roleRes = [];
    for (const [name, o2, exp] of roles) {
      for (const [w, h] of [[1440, 900], [390, 844]]) {
        await mount({ w, h, seed: seedOf({ feedback: fbU }), ...o2 });
        if (w < 1024) { await click(`[data-ship-row="${WORK[0]}"]`); }
        const g = await pg.evaluate(() => ({ chief: !!document.querySelector('[data-home-chip="chief"]'), fb: !!document.querySelector('[data-home-chip="feedback"]'), neu: !!document.querySelector('[data-home-menu="new"]'),
          acts: !!document.querySelector('[data-ship-acts]'), zap: !!document.querySelector('[data-act="zap"]'), del: !!document.querySelector('[data-act="delete"]') }));
        roleRes.push({ name, w, g, exp, ok: g.chief === exp.chief && g.fb === exp.fb && g.neu === exp.neu && g.acts === exp.acts && g.zap === exp.acts && g.del === exp.acts });
      }
    }
    ok(`⑤ 역할별 단추 = 종전 조건 — ${roles.map(([n, , e]) => `${n}: 수석 ${e.chief ? 'O' : 'X'} · 오답 ${e.fb ? 'O' : 'X'} · 새 항차 ${e.neu ? 'O' : 'X'} · 지금 처리·완료·삭제 ${e.acts ? 'O' : 'X'}`).join(' / ')} (컴·폰 시트 둘 다)`,
      roleRes.every((r) => r.ok), JSON.stringify(roleRes.filter((r) => !r.ok)).slice(0, 500));

    //  캡처(단독 실행에서 폴더를 주면) — 밝기 4(사무실 흰 바탕)
    if (shots) {
      for (const [w, h] of [[1440, 900], [390, 844]]) {
        await mount({ w, h });
        await pg.evaluate(() => document.documentElement.setAttribute('data-bright', '4')); await sleep(400); await shot(`bright4_${w}`);
        if (w < 1024) { await click(`[data-ship-row="${WORK[0]}"]`); await shot(`bright4_${w}_sheet`); }
        await pg.evaluate(() => document.documentElement.removeAttribute('data-bright'));
      }
    }
    //  ⑧ 4.25 2차 — 감사 «가»·모의 확인 «부» 에서 나온 것(폰 시트 동작 줄 글자 잘림 · 🗑 이 미르 얼굴 밑 · 줄 알림 앞 글자 잘림 · 시트 연 채 뒤로 → 앱 종료 확인 · 360 크게 막대 · 컴 날짜 역전 · «사전에 없음» 늦게 뜸)
    {
      //  ⑧-1 컴 날짜 역전 — 현 부두(PNCT) 먼 배를 6개 채움이 끌어오는 꼴: 내일 둘(STMJ·TMPZ)을 뺀 사본 + KKAK(PNCT) 작업일을 D+5 로 → 펼침 5척 + 채움 1(KKAK) · 더 가까운 PCTC XTPG(D+3)·SWSP(D+4)는 접힘
      const VR = JSON.parse(JSON.stringify(VOY));
      delete VR.STMJ_2663E; delete VR.TMPZ_2034E;
      VR.KKAK_2610N.info.planDate = '2026-10-17 08:00 ~ 2026-10-17 18:00';
      const dayR = (k) => kstDay(kstMs(String(VR[k].info.planDate || '').split('~')[0])) - kstDay(NOW);
      const DR = Object.keys(VR).filter((k) => !WAIT.includes(k));
      const ordR = (ks) => [...ks].sort((a, b) => ((PIER(a) === 'PNCT' ? 0 : 1) - (PIER(b) === 'PNCT' ? 0 : 1)) || (dayR(a) - dayR(b)) || (kstMs(String(VR[a].info.planDate).split('~')[0]) - kstMs(String(VR[b].info.planDate).split('~')[0])));
      const restR = DR.filter((k) => !WORK.includes(k));
      const wantPC = ['#work', ...ord(WORK), ...[...new Set(restR.map(dayR))].sort((a, b) => a - b).flatMap((n) => [`#d${n}`, ...ordR(restR.filter((k) => dayR(k) === n))])].join(',');
      await mount({ w: 1440, h: 900, voyages: VR });
      const gotPC = await pg.evaluate(() => [...document.querySelectorAll('[data-home-scroll] > *')].map((el) => el.dataset.homeGroup ? '#' + el.dataset.homeGroup : el.dataset.shipRow || '').filter(Boolean).join(','));
      const heads = gotPC.split(',').filter((x) => x[0] === '#').map((x) => (x === '#work' ? -100 : x === '#other' ? 10000 : +x.slice(2)));
      const mono = heads.every((n, i) => i === 0 || n > heads[i - 1]);
      ok(`⑧-1 컴 날짜 묶음은 날짜 순으로만 선다 — 현 부두(PNCT) 먼 배를 6개 채움이 끌어와도(KKAK D+5) 더 가까운 다른 부두 배(XTPG D+3 · SWSP D+4)가 그 위에 선다(감사 하-1 · 수정 전 «D+5 → 그 밖의 배(D+3·D+4)» 역전) — ${gotPC.split(',').filter((x) => x[0] === '#').join(' → ')}`,
        mono && gotPC === wantPC && !/#other/.test(gotPC), `${gotPC} ≠ ${wantPC}`);
      //  폰은 종전 그대로 — 첫 화면(펼친 묶음)에 서는 배 = 4.24 규칙(작업중·당일·명일·모레 + 현 부두 먼저 6개 채움), 나머지는 «그 밖의 배» 접힘
      await mount({ w: 390, h: 844, voyages: VR });
      const ph = await pg.evaluate(() => {
        const open = [...document.querySelectorAll('[data-home-list] > [data-ship-row]')].map((el) => el.dataset.shipRow);
        const fold = [...document.querySelectorAll('[data-home-other] [data-ship-row]')].map((el) => el.dataset.shipRow);
        return { open, fold, foldHidden: !!document.querySelector('[data-home-other].hidden') };
      });
      const openWant = DR.filter((k) => WORK.includes(k) || [0, 1, 2].includes(dayR(k)));
      const fillWant = [...restR.filter((k) => !openWant.includes(k))].sort((a, b) => ((PIER(a) === 'PNCT' ? 0 : 1) - (PIER(b) === 'PNCT' ? 0 : 1)) || (dayR(a) - dayR(b))).slice(0, Math.max(0, 6 - openWant.length));
      const phOk = ph.open.length === openWant.length + fillWant.length && [...openWant, ...fillWant].every((k) => ph.open.includes(k)) && ph.foldHidden && ph.fold.length === DR.length - ph.open.length && ph.fold.every((k) => !ph.open.includes(k));
      ok(`⑧-1b 폰 첫 화면 배 = 4.24 규칙 그대로(펼침 ${openWant.length} + 현 부두 먼저 채움 ${fillWant.join('·')}) · 나머지 ${ph.fold.join('·')} 는 «그 밖의 배» 접힘`, phOk, JSON.stringify({ ph, openWant, fillWant }).slice(0, 400));

      //  ⑧-2·3 폰 시트 동작 줄 — 글자 잘림 0(단추 글자 너비 ≤ 단추 너비) · 🗑 은 다음 줄 오른쪽 · 끝까지 내리면 🗑 이 미르 얼굴(바닥에서 76~124px) 위에 선다
      const FAB_TOP = 124;   // MirFab — style bottom 76 + 얼굴 48px
      const actRows = [];
      for (const w of [360, 390, 412]) for (const mode of ['normal', 'large']) {
        await mount({ w, h: 800, mode, voyages: SIX });
        await click('[data-ship-row="DXQD_2640E"]'); await sleep(300);
        actRows.push({ w, mode, r: await pg.evaluate((FAB_TOP) => {
          const sh = document.querySelector('[data-home-sheet]'); if (!sh) return null;
          const acts = sh.querySelector('[data-ship-acts]'); if (!acts) return null;
          const btns = [...acts.querySelectorAll('button, [data-act="all-done"]')];
          const del = acts.querySelector('[data-act="delete"]');
          const clip = btns.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => `${b.innerText.trim()}:${b.clientWidth}/${b.scrollWidth}`);
          const d = del.getBoundingClientRect(), a = acts.getBoundingClientRect();
          const sameLine = btns.filter((b) => b !== del).some((b) => Math.abs(b.getBoundingClientRect().top - d.top) < 8);
          sh.scrollTop = sh.scrollHeight;
          const d2 = del.getBoundingClientRect();
          return { clip, sameLine, rightGap: Math.round(a.right - d.right), minW: Math.min(...btns.filter((b) => b !== del).map((b) => Math.round(b.getBoundingClientRect().width))), delBottom: Math.round(d2.bottom), vh: window.innerHeight, clear: d2.bottom <= window.innerHeight - FAB_TOP };
        }, FAB_TOP) });
      }
      const badA = actRows.filter(({ r }) => !r || r.clip.length || r.sameLine || r.rightGap > 2);
      ok(`⑧-2 폰 시트 동작 줄 — 글자 잘린 단추 0(⚡ 지금 처리 · ⬇ 양하 완료 · ⬆ 선적 완료 — 가장 좁은 단추 ${actRows.map((x) => `${x.w}${x.mode === 'large' ? '크게' : ''} ${x.r ? x.r.minW : '?'}px`).join(' · ')}) · 🗑 은 다음 줄 오른쪽 끝(모의 확인 ① · 수정 전 51~65px «지금 처i»)`,
        !badA.length, JSON.stringify(badA).slice(0, 400));
      const badB2 = actRows.filter(({ r }) => !r || !r.clear);
      ok(`⑧-3 폰 시트를 끝까지 내리면 🗑 삭제 바닥이 미르 얼굴 위(화면 바닥 − ${FAB_TOP}px 위 — ${actRows.map((x) => `${x.w}${x.mode === 'large' ? '크게' : ''} ${x.r ? x.r.vh - x.r.delBottom : '?'}px`).join(' · ')})(모의 확인 ② · 수정 전 pb-24 로 40% 가림)`,
        !badB2.length, JSON.stringify(badB2).slice(0, 300));
      //  조회만 — 동작 줄이 없으면 마지막 줄(자료 대수)이 미르 얼굴 위
      await mount({ w: 390, h: 844, voyages: SIX, view: true });
      await click('[data-ship-row="DXQD_2640E"]'); await sleep(300);
      const vEnd = await pg.evaluate((FAB_TOP) => { const sh = document.querySelector('[data-home-sheet]'); if (!sh) return null; sh.scrollTop = sh.scrollHeight; const det = sh.querySelector('[data-ship-detail]'); const last = det && det.lastElementChild; const b = last ? last.getBoundingClientRect().bottom : null; return { acts: !!sh.querySelector('[data-ship-acts]'), gap: b == null ? null : Math.round(window.innerHeight - b), ok: b != null && b <= window.innerHeight - FAB_TOP }; }, FAB_TOP);
      ok(`⑧-3b 조회만 폰 시트 — 동작 줄 없음 · 끝까지 내리면 마지막 줄이 미르 얼굴 위(바닥에서 ${vEnd ? vEnd.gap : '?'}px)`, !!vEnd && !vEnd.acts && vEnd.ok, JSON.stringify(vEnd));

      //  ⑧-4 폰 줄 알림 — 앞 글자 잘림 0(모든 알림 조각이 알림 칸 안 · 글자 너비 ≤ 조각 너비) · ⑧-5 막대 너비
      const alRows = [];
      for (const [w, h] of [[360, 800], [390, 844], [412, 915]]) for (const mode of ['normal', 'large']) {
        await mount({ w, h, mode });
        await pg.evaluate(() => { for (const id of ['other', 'wait']) { const b = document.querySelector(`[data-home-fold="${id}"]`); if (b) b.click(); } }); await sleep(300);
        alRows.push({ w, mode, r: await pg.evaluate(() => {
          const vis = (el) => !!el && el.getBoundingClientRect().height > 0 && !el.closest('.hidden');
          const bad = [], seen = [];
          for (const al of [...document.querySelectorAll('[data-row-alerts]')].filter(vis)) {
            const a = al.getBoundingClientRect(); const row = al.closest('[data-ship-row]').getBoundingClientRect();
            for (const c of al.children) { const r = c.getBoundingClientRect(); seen.push(c.innerText.trim());
              if (r.left < a.left - 1 || r.right > row.right + 1 || c.scrollWidth > c.clientWidth + 1) bad.push(`${al.closest('[data-ship-row]').dataset.shipRow} «${c.innerText.trim()}» ${Math.round(r.left)}<${Math.round(a.left)}`); }
          }
          const bars = [...document.querySelectorAll('[data-ship-row] .xp-bar')].filter(vis).map((b) => Math.round(b.getBoundingClientRect().width));
          return { bad, seen: seen.slice(0, 6), n: seen.length, minBar: bars.length ? Math.min(...bars) : null, hOver: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        }) });
      }
      const badAl = alRows.filter(({ r }) => r.bad.length || !r.n || r.hOver > 1);
      ok(`⑧-4 폰 배 줄 알림 앞 글자 잘림 0 — ${alRows.map((x) => `${x.w}${x.mode === 'large' ? '크게' : ''} ${x.r.n}조각`).join(' · ')} («${(alRows[1].r.seen || []).join('» «')}»)(모의 확인 ③ · 수정 전 «하 누락 262»)`, !badAl.length, JSON.stringify(badAl.map((x) => [x.w, x.mode, x.r.bad, x.r.hOver])).slice(0, 400));
      const badBar = alRows.filter(({ w, mode, r }) => r.minBar == null || r.minBar < 36 || (w < 390 && mode === 'large' && r.minBar < 80));
      ok(`⑧-5 폰 줄 막대 너비 — 가장 좁은 막대 ${alRows.map((x) => `${x.w}${x.mode === 'large' ? '크게' : ''} ${x.r.minBar}px`).join(' · ')} (36px 이상 — 모의 확인 «390 크게 약 45px 괜찮음 · 360 크게 10~30px 점» 사이 · 390 미만 크게는 상태를 막대 아래 줄로 내려 80px 이상)`, !badBar.length, JSON.stringify(badBar.map((x) => [x.w, x.mode, x.r.minBar])));

      //  ⑧-6 폰 시트를 연 채 «뒤로» — App 홈 가드가 종료 확인 대신 시트만 닫는다(backHandler 한 벌) · 소스 순서(종료 확인 앞)
      await mount({ w: 390, h: 844, voyages: SIX });
      const noSheet0 = await pg.evaluate(() => window.__R35.closeHomeSheetIfOpen());
      await click('[data-ship-row="DXQD_2640E"]'); await sleep(250);
      const open1 = await pg.evaluate(() => !!document.querySelector('[data-home-sheet]'));
      const took = await pg.evaluate(() => window.__R35.closeHomeSheetIfOpen()); await sleep(250);
      const closed1 = await pg.evaluate(() => !document.querySelector('[data-home-sheet]'));
      const again = await pg.evaluate(() => window.__R35.closeHomeSheetIfOpen());
      await click('[data-ship-row="DXQD_2640E"]'); await sleep(250); await click('[data-home-sheet-close]');
      const afterBtn = await pg.evaluate(() => window.__R35.closeHomeSheetIfOpen());
      const APP = strip(fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8'));
      const guard = (APP.split('gmHomeGuard: true }, \'\', \'#/\');\n    }')[1] || '').split('window.addEventListener(\'popstate\', handler)')[0];
      const srcOk = /closeHomeSheetIfOpen\(\)/.test(guard) && guard.indexOf('closeHomeSheetIfOpen()') < guard.indexOf('window.confirm(') && /closeHomeSheetIfOpen\(\)\) \{ window\.history\.pushState\(\{ gmHomeGuard: true \}, '', '#\/'\); return; \}/.test(guard);
      ok(`⑧-6 폰 시트를 연 채 «뒤로» → 시트만 닫힌다(App 홈 가드가 «앱 종료?» 앞에서 묻는다 · 가드 재장전) — 시트 없을 때 ${noSheet0} · 열림 ${open1} → 닫기 ${took} → 닫힘 ${closed1} → 다시 ${again} · [‹ 목록] 으로 닫은 뒤 ${afterBtn} · 소스 순서 ${srcOk}(모의 확인 ④)`,
        noSheet0 === false && open1 && took === true && closed1 && again === false && afterBtn === false && srcOk, JSON.stringify({ guard: guard.slice(0, 300) }));

      //  ⑧-7 «사전에 없음» — 베이사전이 첫 그림 뒤에 와도 줄 딱지가 바로 뜬다(줄 알림 감싸개를 늘 그려 둔다 · 감사 기록)
      const dictAll = Object.fromEntries(KEYS.map((k) => VOY[k].info.vsl).filter((x) => x !== 'QDTR').map((x) => [x, { code: x, name: x, bayDef: { recordCount: 1 } }]));
      await mount({ w: 1440, h: 900, view: true });
      const before = !!(await pg.$('[data-ship-row="QDTR_2608E"] [data-dict-missing]'));
      await pg.evaluate((d) => { window.__fbShipBayDict = d; window.dispatchEvent(new Event('gm-fbdict')); }, dictAll); await sleep(300);
      const after = !!(await pg.$('[data-ship-row="QDTR_2608E"] [data-dict-missing]'));
      ok(`⑧-7 베이사전이 늦게 와도 줄 «사전에 없음» 딱지가 그 자리에서 뜬다(사전 전 ${before} → 사전 도착 이벤트 뒤 ${after} — 홈을 다시 그리지 않고)`, before === false && after === true, JSON.stringify({ before, after }));
    }
    const netW = netOut.filter((x) => x.m !== 'GET');
    const netG = [...new Set(netOut.filter((x) => x.m === 'GET').map((x) => x.u))];
    ok(`⑦ 그리는 동안 페이지 오류 0 · 대화창(alert·confirm) 0 · 실서비스(Firebase·구글) 쓰기 시도 0 · 읽기 ${netOut.length - netW.length}건은 page.route 로 막음(${netG.join(', ').slice(0, 120)})`, !perr.length && !netW.length,
      [...perr, ...netW.map((x) => '쓰기 시도 ' + x.m + ' ' + x.u)].join(' | ').slice(0, 400));
  } finally {
    await browser.close().catch(() => {});
  }
};
module.exports.OLD_DOORS = OLD_DOORS;

//  단독 실행 — node tools/regress_r35_home.cjs <저장소 루트> [빌드 CSS] [캡처 폴더]
if (require.main === module) {
  process.env.TZ = 'Asia/Seoul';
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'r35_'));
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx, stub: './tools/stub_fbdb_mem.js', css: process.argv[3] ? path.resolve(process.argv[3]) : '', shots: process.argv[4] ? path.resolve(process.argv[4]) : '' })
    .then(() => { console.log(`\nR35 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((e) => { console.error('✗ R35 오류', e && e.stack || e); process.exit(1); });
}
