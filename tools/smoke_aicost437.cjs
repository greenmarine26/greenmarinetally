// 4.37 연막검사 — 소유자 «💳 AI 비용». ① 단가·합산(aiCost.js)을 픽스처 원자료로 따로 센 값과 맞댄다 ② 구조 — 소유자 메뉴 안 한 곳·구독 없음·키 안 그림·단가 한 벌
//   ③ 실소스 firebase.js(메모리 RTDB) — 소유자만 읽고 적으며, 키 칸은 돌려주지 않는다 ④ 실제 화면 — 2026-10-19 실기록으로 그린 패널
//   실행 — node tools/smoke_aicost437.cjs <repoRoot> <패널 번들(smoke_aicost437.jsx)> <firebase 번들.cjs>. 실패하면 빌드를 세운다.
//   픽스처 tools/fixtures/ai_cost_261019.json 은 RTDB mir_model_log/261019 · mir_websearch/261019 · ai_call_log/261016 을 읽기만 해서 그대로 옮긴 것이다.
const path = require('path');
const fs = require('fs');
const root = path.resolve(process.argv[2] || process.cwd());
const bundle = process.argv[3];
const fbBundle = process.argv[4];
let n = 0, bad = 0;
const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
const near = (a, b, e = 1e-6) => Math.abs(Number(a) - Number(b)) < e;
const FX = JSON.parse(fs.readFileSync(path.join(root, 'tools/fixtures/ai_cost_261019.json'), 'utf8'));

(async () => {
  const A = await import(path.resolve(root, 'src/aiCost.js'));

  console.log('[1] 단가·합산 — 픽스처 원자료를 이 검사가 따로 센 값과 맞댄다');
  ok(JSON.stringify(A.AI_PRICE['claude-sonnet-5-5']) === '[2,10]' && JSON.stringify(A.AI_PRICE['claude-opus-5-5']) === '[4,20]' && A.AI_WEB_SEARCH_USD === 0.01, '단가표 — 소네트 5.5 2·10달러 · 오퍼스 5.5 4·20달러 · 검색 1회 0.01달러(2026-10-19 가격표)');
  ok(near(A.aiCostUsd('claude-sonnet-5-5', 16505, 351, 1), 0.04652), '실측 «가요차트 1위» 입력 16,505 · 출력 351 · 검색 1 = 0.04652달러(종전 장부 0.0648)');
  ok(A.aiCostUsd('claude-future-9', 1, 1) === null, '단가표에 없는 모델은 null(0 으로 숨기지 않는다)');
  //  따로 센 값 — prov 가 claude 로 시작하는 줄을 소네트 단가로
  const raw = Object.values(FX.mml).filter((v) => String(v.prov || '').startsWith('claude'));
  const ind = raw.reduce((s, v) => s + (v.tokIn || 0) * 2e-6 + (v.tokOut || 0) * 1e-5 + (v.searches || 0) * 0.01, 0);
  const g = A.aggregateAiCost([{ day: FX.day, mml: FX.mml, acl: {}, mws: FX.mws }], {});
  ok(g.total.n === raw.length && raw.length === 92, `호출 수 ${g.total.n} = 원자료 클로드 줄 ${raw.length}`);
  ok(near(g.total.usd, ind), `금액 ${g.total.usd.toFixed(6)} = 따로 센 ${ind.toFixed(6)}`);
  const byKind = (k) => g.rows.find((r) => r.kind === k) || {};
  for (const k of ['translate', 'data', 'chat', 'web']) {
    const rk = raw.filter((v) => v.kind === k);
    const costs = rk.map((v) => (v.tokIn || 0) * 2e-6 + (v.tokOut || 0) * 1e-5 + (v.searches || 0) * 0.01);
    ok(byKind(k).n === rk.length && near(byKind(k).max, Math.max(...costs)) && byKind(k).label === A.AI_KIND_LABEL[k], `${A.AI_KIND_LABEL[k]} — ${rk.length}회 · 1회 최대 ${Math.max(...costs).toFixed(4)}`);
  }
  ok(near(g.web.booked, 0.0648) && g.web.n === 1, '웹 검색 장부(mir_websearch)는 앱이 적은 금액 그대로 합친다(0.0648 — 4.37 전 옛 단가로 적힌 줄)');
  ok(g.who.length === 2 && g.who.find((w) => w.who === '클로드').n === 61 && g.who.find((w) => w.who === '').n === 31, '누가 — 클로드(테스터) 61 · 이름 없음 31');
  //  제미나이 사진 줄(토큰 없음)은 금액이 아니라 호출 수로
  const gg = A.aggregateAiCost([{ day: '261016', mml: {}, acl: FX.acl261016, mws: {} }], {});
  ok(gg.total.n === 0 && gg.gemini.n === Object.keys(FX.acl261016).length && gg.gemini.byKind.reeferPhoto === 1, '제미나이 사진 줄은 클로드 금액에 안 들고 호출 수로만 센다(리퍼 리스트 1)');
  //  합성 줄 — 사진(오퍼스)·시간 초과·단가 모름·실패·청구된 빈 웹 답·앱별 검색 장부
  const SYN = { day: 'SYN', mml: {
    w1: { kind: 'web', ok: false, err: '빈 답(end_turn)', tokIn: 15000, tokOut: 100, searches: 1, usd: 0.04, who: '김성일', app: 'tally', at: 1 },
    g1: { kind: 'translate', prov: 'gemini', tokIn: 900, tokOut: 20, who: '박철민', app: 'cone', at: 2 },
    f1: { kind: 'translate', ok: false, err: 'AI 키가 없어요', who: '', app: 'tally', at: 3 },
    o1: { kind: 'translate', ok: true, tokIn: 1000, tokOut: 10, who: '박철민', at: 9 },   // 4.30 전 옛 기록 — prov 칸 없음 = 제미나이
    c1: { kind: 'chat', prov: 'web-cap', ok: true, tokIn: 0, tokOut: 0, who: '김성일', app: 'cone', at: 10 },   // 한도에 닿아 검색 없이 답함
    wf: { kind: 'web', ok: false, err: 'HTTP 529', status: 529, who: '김성일', app: 'tally', at: 11 },   // 검색 오류 — 청구 없음
    wt: { kind: 'web', ok: false, err: 'This operation was aborted', status: 0, who: '김성일', app: 'tally', at: 13 },   // 검색 시간 초과 — 청구됐을 수 있음
  }, acl: {
    e1: { kind: 'esealPhoto', model: 'claude-opus-5-5', status: 200, tokIn: 4200, tokOut: 3100, who: '김성일', at: 4 },
    e2: { kind: 'esealPhoto', model: 'claude-opus-5-5', status: 200, tokIn: 4200, tokOut: 5900, who: '김성일', at: 5 },
    p1: { kind: 'stowagePdf', model: 'claude-sonnet-5-5', status: -1, tokIn: 0, tokOut: 0, who: '김성일', at: 6 },
    p2: { kind: 'stowagePdf', model: 'gemini-2.5-flash', status: 200, who: '김성일', at: 7 },
    x1: { kind: 'listPhoto', model: 'claude-future-9', status: 200, tokIn: 100, tokOut: 100, who: '김성일', at: 8 },
    v1: { kind: 'reeferPhoto', model: 'claude-sonnet-5-5', status: 529, tokIn: 0, tokOut: 0, who: '김성일', at: 12 },   // 과부하로 거절 — 청구 없음, 제미나이로 읽음
  }, mws: { s1: { usd: 0.0465, app: 'tally', at: 1 }, s2: { usd: 0.05, reserve: true, app: 'cone', at: 2 } } };
  const s = A.aggregateAiCost([SYN], {});
  const es = s.rows.find((r) => r.kind === 'esealPhoto');
  ok(es && es.model === 'claude-opus-5-5' && es.n === 2 && near(es.usd, 0.0788 + 0.1348) && near(es.max, 0.1348) && es.label === '엠티실 리스트', '엠티실 리스트(오퍼스) 2회 = 0.0788 + 0.1348 · 1회 최대 0.1348');
  ok(near((s.rows.find((r) => r.kind === 'web') || {}).usd, 0.041), 'prov 가 없어도 토큰·검색이 남은 웹 «빈 답» 줄은 청구된 것으로 센다(0.041)');
  ok(s.gemini.n === 3 && s.gemini.byKind.translate === 2 && s.gemini.byKind.stowagePdf === 1, '제미나이 3회(미르 1 · 4.30 전 옛 기록 1 · PDF 베이 1) — 옛 줄은 «실패»가 아니다(감사 4.37)');
  ok(s.warns.some((w) => /단가표에 없는 모델 claude-future-9/.test(w)) && s.warns.some((w) => /시간 초과 1회/.test(w)) && s.warns.some((w) => /거절·오류 1회/.test(w)) && s.warns.some((w) => /AI 호출 실패 1회/.test(w)), '경고 — 단가 모름 · 사진 시간 초과 · 사진 거절 · 진짜 실패 1회(한도 멈춤·검색 오류는 실패가 아니다)');
  ok(s.capN === 1 && s.webFailN === 1 && s.webMaybeN === 1 && !s.rows.some((r) => r.kind === 'reeferPhoto' || r.kind === 'stowagePdf'), '한도 멈춤 1 · 검색 오류 1(청구 없음) · 검색 시간 초과 1(청구됐을 수 있음)은 따로 세고, 사진 거절·시간 초과는 호출 수에 넣지 않는다');
  ok(near(s.web.booked, 0.0965) && near(s.web.byApp.tally, 0.0465) && near(s.web.byApp.cone, 0.05), '웹 검색 장부 앱별 — 검수앱 0.0465 · 콘앱 0.05');
  ok(s.photoN === 3, '사진 읽기(클로드) 호출 수 3 — 엠티실 2 · 단가 모름 리스트 1(시간 초과·거절은 빼고 경고로)');
  const u = A.aggregateAiCost([SYN], { until: 4 });
  ok(u.rows.reduce((t, r) => t + r.n, 0) === 2 && u.gemini.n === 1, 'until — 그 시각까지 줄만 센다(Console 숫자를 적은 순간과 맞댈 때)');
  const gap = A.aiConsoleGap(1.85, 0.338852), gap2 = A.aiConsoleGap(0.36, 0.338852), gap3 = A.aiConsoleGap(0.10, 0.34);
  ok(gap && gap.notable && !gap.over && near(gap.gap, 1.511148) && gap2 && !gap2.notable && !gap2.over && A.aiConsoleGap('', 1) === null, 'Console 1.85 · 앱 0.34 → 1.51 차이(알림) · 0.36 이면 알림 없음 · 빈칸은 비교 안 함');
  ok(gap3 && !gap3.notable && gap3.over, 'Console 0.10 · 앱 0.34 — 앱이 더 크면 «거의 같다»가 아니라 over(감사 4.37)');
  const oct19 = new Date(2026, 9, 19, 11, 0).getTime();
  const mk = A.aiPeriodDays('month', oct19), wk = A.aiPeriodDays('7d', oct19);
  ok(mk.length === 19 && mk[0] === '261019' && mk[18] === '261001' && wk.length === 7 && wk[6] === '261013' && A.aiPeriodDays('yesterday', oct19)[0] === '261018', '기간 — 이번 달 19일치(261001~261019) · 7일 · 어제');

  console.log('[2] 구조 — 소유자 메뉴 안 한 곳 · 구독 없음 · 키 안 그림 · 단가 한 벌');
  const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  const noCmt = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
  const CD = read('src/pages/ChiefDashboard.jsx'), FB = read('src/firebase.js'), P = read('src/components/AiCostPanel.jsx'), M = read('src/mir.js');
  const i0 = CD.indexOf("if (gid === 'owner' && owner) return ("), i1 = CD.indexOf('\n    return null;\n  };', i0);
  const block = i0 > 0 && i1 > i0 ? CD.slice(i0, i1) : '';
  const dz = block.indexOf('data-danger-zone');
  ok(block.includes('<AiCostPanel by={inspector} />') && block.indexOf('<AiCostPanel') < dz && (CD.match(/<AiCostPanel/g) || []).length === 1, '패널은 «👑 소유자 메뉴» 안 한 곳 · 위험 구역 위');
  ok(/name: '소유자 메뉴', sub: '교대 시각 · 활동 로그 · AI 비용 · 인원 · 위험 구역'/.test(CD), '소유자 메뉴 묶음 설명에 «AI 비용»');
  ok(!/onValue|onChild|subscribe/i.test(noCmt(P)), '패널은 구독하지 않는다(펼칠 때 한 번 읽기)');
  ok(!/claudeKey|aiKey|sk-ant/.test(noCmt(P)), '패널 코드는 키 칸을 다루지 않는다');
  const fnBody = (name) => { const a = FB.indexOf('export async function ' + name); return FB.slice(a, FB.indexOf('\n}\n', a)); };
  ok(/assertOwner\(/.test(fnBody('fbGetAiCost')) && /assertOwner\(/.test(fnBody('fbSaveAiConsole')), 'fbGetAiCost · fbSaveAiConsole 는 소유자만(assertOwner)');
  ok(!/claudeKey|aiKey|ref\(db, 'mir_config'\)/.test(fnBody('fbGetAiCost')) && /mir_config\/\$\{f\}/.test(fnBody('fbGetAiCost')), 'fbGetAiCost 는 mir_config 를 통째로 읽지 않고 키가 아닌 칸만 하나씩 읽는다');
  ok(/update\(ref\(db, 'ai_console'\), out\)/.test(fnBody('fbSaveAiConsole')) && !/\bset\(|remove\(/.test(fnBody('fbSaveAiConsole')), 'Console 숫자 적기는 ai_console 한 칸 PATCH 뿐');
  ok(/AI_PRICE\[String\(cfg\.claudeModel \|\| DEFAULT_CLAUDE_MODEL\)\]\) \{/.test(M) && /isCone \? '오늘 검색에 쓸 수 있는 한도를 다 써서/.test(M), '단가표에 없는 모델이면 웹 검색 안 함 · 콘앱 한도 문구에 금액 없음');
  const others = ['src/pages/ChiefDashboard.jsx', 'src/components/AiCostPanel.jsx', 'src/App.jsx', 'src/pages/HomePage.jsx'].map(read).map(noCmt).join('\n');
  ok(!/ai_console|mir_websearch\/|ai_call_log\//.test(others), '기록 노드 이름은 화면 코드에 없다(firebase.js 한 곳에서만 읽는다)');
  ok(/import \{ aiCostUsd, AI_PRICE \} from '\.\/aiCost\.js'/.test(M) && /const _webCost = \(tokIn, tokOut, searches, model\) => aiCostUsd\(/.test(M) && !/\* 3 \/ 1e6|\* 15 \/ 1e6/.test(noCmt(M)), '미르 웹 검색 비용은 aiCost.js 단가 한 벌(옛 3·15달러 식 없음)');
  ok(/const WEB_EST_USD = 0\.05;/.test(M) && /const CONE_WEB_SHARE = 0\.5;/.test(M) && /isCone \? Math\.round\(cfg\.webSearchUsd \* CONE_WEB_SHARE \* 100\) \/ 100 : cfg\.webSearchUsd/.test(M), '예상 선금 0.05 · 콘앱은 한도 절반에서 먼저 멈춘다');
  const FI = read('src/data/featureIndex.js'), HC = read('src/data/helpDataChief.js');
  ok(/l: '💳 AI 비용 \(클로드 · 제미나이\)'.*r: 'o'/.test(FI) && /💳 AI 비용/.test(HC) && /안에 네 가지가 있고/.test(HC), '기능 색인(소유자 전용) · 수석 매뉴얼에 AI 비용');

  console.log('[3] 실소스 firebase.js — 소유자만 읽고 적는다 · 키 칸은 돌려주지 않는다');
  if (!fbBundle) ok(false, 'firebase 번들 경로가 없다');
  else {
    const ymd = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const store = {};
    global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
    global.window = global.window || {}; global.window.alert = () => {}; global.window.dispatchEvent = () => true;
    global.CustomEvent = global.CustomEvent || class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
    global.document = global.document || { createElement: () => ({}) };
    const _warn = console.warn; console.warn = () => {};
    global.__memdb = { mir_model_log: { 261019: JSON.parse(JSON.stringify(FX.mml)) }, mir_websearch: { 261019: FX.mws }, ai_call_log: { 261016: FX.acl261016 },
      mir_config: { claudeKey: 'sk-ant-FAKEKEY', aiKey: 'AQ.FAKEKEY', claudeModel: 'claude-sonnet-5-5', dailyCap: 300, enabled: true, note: 'x' } };
    global.__memlog = [];
    const F = require(path.resolve(fbBundle));
    const throwsOwner = async (fn) => { try { await fn(); return false; } catch (e) { return e && e.ownerOnly === true; } };
    store.tallyone_me_today = JSON.stringify({ name: '박철민', ymd });
    ok(await throwsOwner(() => F.fbGetAiCost(['261019'], '박철민')) && await throwsOwner(() => F.fbSaveAiConsole({ credit: 1 }, '박철민')) && await throwsOwner(() => F.fbGetAiCost(['261019'], '이현규')), '검수원·수석은 읽기·적기 모두 막힌다');
    ok(global.__memlog.length === 0, '막힌 호출은 아무것도 쓰지 않았다');
    const r = await F.fbGetAiCost(['261019', '261016', 'bad', '261019'], '김성일');
    ok(r.days.length === 2 && Object.keys(r.days.find((d) => d.day === '261019').mml).length === 92 && Object.keys(r.days.find((d) => d.day === '261016').acl).length === 1, '소유자 — 날짜 두 개(겹침·잘못된 키 제외) 세 노드를 읽는다');
    ok(r.cfg.claudeModel === 'claude-sonnet-5-5' && r.cfg.dailyCap === 300 && !('claudeKey' in r.cfg) && !('aiKey' in r.cfg) && !/FAKEKEY/.test(JSON.stringify(r)), '설정은 키가 아닌 칸만 — 돌려준 값 어디에도 키가 없다');
    ok(r.console === null, 'Console 숫자가 아직 없으면 null');
    const w = await F.fbSaveAiConsole({ credit: '198.15', monthSpend: '$1.85', monthLimit: '100', tokens7d: 226000 }, '김성일');
    const c = global.__memdb.ai_console;
    ok(c && c.credit === 198.15 && c.monthSpend === 1.85 && c.monthLimit === 100 && c.tokens7d === 226000 && c.by === '김성일' && c.at > 0 && w.at === c.at, 'Console 숫자 적기 — 숫자로 바꿔 ai_console 에 누가·언제와 함께');
    ok(global.__memlog.length === 1 && global.__memlog[0].op === 'update' && global.__memlog[0].path === 'ai_console', '쓰기는 ai_console 한 칸 update 한 번뿐');
    let threw = false; try { await F.fbSaveAiConsole({ credit: '많음' }, '김성일'); } catch (e) { threw = /숫자가 아닙니다/.test(e.message); }
    ok(threw && global.__memlog.length === 1, '숫자가 아니면 던지고 쓰지 않는다');
    console.warn = _warn;
  }

  console.log('[4] 실제 화면 — 2026-10-19 실기록으로 패널을 그린다');
  if (!bundle) { ok(false, '번들 경로가 없다'); return finish(); }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  const errs = [];
  dom.window.addEventListener('error', (e) => errs.push(e.message));
  console.error = (...a) => { const t = a.map(String).join(' '); if (/Error/.test(t)) errs.push(t.split('\n')[0].slice(0, 200)); };
  const todayKey = A.aiDayKey(Date.now());
  dom.window.__aiDays = { [todayKey]: { mml: FX.mml, acl: {}, mws: FX.mws } };
  dom.window.__aiCfg = { claudeModel: 'claude-sonnet-5-5', dailyCap: 300, enabled: true, claudeKey: 'sk-ant-SHOULD-NOT-SHOW' };
  dom.window.__aiConsole = { credit: 198.15, monthSpend: 1.85, monthLimit: 100, tokens7d: 226000, at: Date.now() + 1000, by: '김성일' };
  dom.window.__by = '김성일';
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const doc = dom.window.document;
  const txt = () => doc.body.textContent || '';
  const clickBy = (re) => { const b = [...doc.querySelectorAll('button')].find((x) => re.test((x.textContent || '').trim()) && !x.disabled); if (!b) return false; b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); return true; };
  const calls = () => dom.window.__calls || [];
  dom.window.__renderPanel(); await wait(600);
  let t = txt();
  const gc = calls().find((c) => c.fn === 'getAiCost');
  ok(gc && gc.by === '김성일' && gc.keys.includes(todayKey) && gc.keys.length >= 7 && gc.keys.length <= 37, '펼치면 한 번 읽는다 — 로그인한 이름(by) · 이번 달 + 최근 7일 날짜');
  ok(new RegExp(`오늘 클로드 92회 · 약 \\$${ind.toFixed(2)}`).test(t), `요약 «오늘 클로드 92회 · 약 $${ind.toFixed(2)}» (따로 센 값)`);
  ok(/미르 알아듣기\(번역\)/.test(t) && /미르 자료 답/.test(t) && /미르 생활회화 · 상식/.test(t) && /미르 웹 검색 \(검색 1회\)/.test(t), '종류 이름 넷이 보인다');
  ok(/1회 평균/.test(t) && /1회 최대/.test(t) && /\$0\.0465/.test(t), '1회 평균 · 1회 최대 칸(웹 검색 1회 최대 $0.0465)');
  ok(/사진 읽기 오늘 없음 — 엠티실 리스트\(오퍼스, 한 장에 두 번 읽음\) · 베이 수기 기록\(오퍼스\) · 리퍼 리스트\(소네트\)/.test(t), '사진 읽기가 없는 날 — 검수사 표현 그대로 종류를 적은 한 줄');
  ok(/웹 검색 오늘 \$0\.06 \/ 하루 한도 \$1\.00/.test(t) && /콘앱 웹 검색은 하루 합계가 \$0\.50 에 닿으면 먼저 멈추고, 검수앱은 \$1\.00 까지/.test(t), '웹 검색 오늘 장부 · 하루 한도 1달러 · 콘앱 0.5달러');
  ok(/클로드\(테스터\) 61회/.test(t) && /이름 없음\(시험 · 로그인 전\) 31회/.test(t), '누가 썼나 — 클로드(테스터) 61 · 이름 없음 31');
  ok(/크레딧 잔액 \$198\.15/.test(t) && /이번 달 지출 \$1\.85 \/ 한도 \$100/.test(t) && /\(2% 사용\)/.test(t) && /최근 7일 토큰 22\.6만/.test(t), 'Console 숫자 — 크레딧 · 이번 달 지출/한도(2%) · 7일 토큰 22.6만');
  ok(/앱 기록이 \$1\.51 적습니다/.test(t) && doc.querySelector('[data-aicost-gap="notable"]'), 'Console 과 앱 기록 차이 $1.51 — 앱 밖 사용 알림');
  ok(!/SHOULD-NOT-SHOW|sk-ant/.test(t), '키 값은 화면 어디에도 없다');
  ok(/대화 모델 claude-sonnet-5-5/.test(t) && /사진 읽기 상한 없음/.test(t) && /미르 하루 상한 300줄/.test(t), '지금 설정(읽기만)');
  ok(errs.length === 0, '렌더 중 오류 없음' + (errs.length ? ' — ' + [...new Set(errs)].slice(0, 2).join(' | ') : ''));
  //  기간 칩 — 다시 읽지 않고 고른다
  const nGet = calls().filter((c) => c.fn === 'getAiCost').length;
  ok(clickBy(/^어제$/), '[어제]'); await wait(200);
  ok(/어제 클로드 0회 · 약 \$0\.00/.test(txt()) && calls().filter((c) => c.fn === 'getAiCost').length === nGet, '어제는 0회 — 다시 읽지 않고 읽어 둔 것에서 고른다');
  ok(clickBy(/^이번 달$/), '[이번 달]'); await wait(200);
  ok(/이번 달 클로드 92회/.test(txt()), '이번 달 92회');
  //  Console 숫자 적기 — 화면 글자를 그대로(«22.6만», «$198.15») 적어도 숫자로 바뀐다
  ok(clickBy(/Console 숫자 적기/), '[✏️ Console 숫자 적기]'); await wait(200);
  const setVal = (id, v) => { const el = doc.getElementById(id); const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set; setter.call(el, v); el.dispatchEvent(new dom.window.Event('input', { bubbles: true })); };
  ok(doc.getElementById('aicost-credit').value === '198.15', '칸에 지금 값이 미리 들어 있다');
  setVal('aicost-tokens7d', '23.1만'); setVal('aicost-monthSpend', '$2.10'); await wait(100);
  ok(clickBy(/^저장$/), '[저장]'); await wait(600);
  const sv = calls().filter((c) => c.fn === 'saveAiConsole');
  ok(sv.length === 1 && sv[0].patch.tokens7d === 231000 && sv[0].patch.monthSpend === 2.1 && sv[0].patch.credit === 198.15 && sv[0].by === '김성일', '저장 — 23.1만 → 231000 · $2.10 → 2.1 · 로그인한 이름(by)');
  ok(/Console 숫자를 적었습니다/.test(txt()) && /이번 달 지출 \$2\.10/.test(txt()), '저장 뒤 다시 읽어 새 숫자가 보인다');
  ok(clickBy(/Console 숫자 적기/), '다시 열기'); await wait(200);
  setVal('aicost-credit', '많이'); await wait(100);
  ok(clickBy(/^저장$/), '[저장] — 숫자가 아닌 값'); await wait(300);
  ok(calls().filter((c) => c.fn === 'saveAiConsole').length === 1 && /숫자로 읽지 못했습니다 — «많이»/.test(txt()), '숫자가 아니면 적지 않고 이유를 보인다');
  //  읽기 실패는 화면에 이유가 보인다
  dom.window.__aiErr = 'AI 비용 보기 은 소유자만 할 수 있습니다.';
  ok(clickBy(/새로 고침/), '[🔄 새로 고침]'); await wait(400);
  ok(/AI 비용 기록을 읽지 못했습니다 — AI 비용 보기 은 소유자만/.test(txt()), '읽기 실패는 이유와 함께 빨간 줄(조용한 실패 없음)');
  ok(errs.length === 0, '끝까지 오류 없음' + (errs.length ? ' — ' + [...new Set(errs)].slice(0, 2).join(' | ') : ''));
  finish();
  function finish() { console.log(`\n4.37 AI 비용 연막검사 ${n - bad}/${n} 통과`); process.exit(bad ? 1 : 0); }
})().catch((e) => { console.error('시험 자체가 죽었다:', e); process.exit(1); });
