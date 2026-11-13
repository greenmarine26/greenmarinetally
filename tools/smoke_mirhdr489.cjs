// 4.89 연막검사 — 미르 얼굴은 머리띠·작업 틀 윗줄에(떠 있는 얼굴 없음) · 시트 바깥 닫힘 · 화면별 지연 조각 분리 · sw 미리받기 목록에 조각 포함. 실행 — node tools/smoke_mirhdr489.cjs <저장소> <번들>
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(process.argv[2] || process.cwd());
const BUNDLE = process.argv[3] || '';
let n = 0, bad = 0;
const ok = (c, m, d = '') => { n += 1; console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || !d ? '' : ' — ' + d)); if (!c) bad += 1; };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log('[1] 소스 — 얼굴 단추 없음 · 검색줄 호출어로 부르기');
  const hdr = rd('src/components/Header.jsx'), fab = rd('src/components/MirFab.jsx'), app = rd('src/App.jsx');
  for (const f of ['src/components/Header.jsx', 'src/components/WorkFrame.jsx', 'src/components/BayViewWork.jsx', 'src/components/ContainerDetailModal.jsx', 'src/App.jsx']) ok(!/<MirDockButton/.test(rd(f)), `${f} 에 미르 얼굴 단추 0(검수사 «미르를 숨기는것»)`);
  ok(!/z-\[10001\]/.test(fab) && !/fixed right-4/.test(fab), 'MirFab 에 떠 있는 얼굴(fixed right-4 z 10001) 0');
  ok(/<MirFab [\s\S]{0,400}?soloButton=\{false\}/.test(app), 'App 은 MirFab 의 제자리 단추를 끈다(앱에는 단추가 없다)');
  ok(/data-mir-backdrop="1"[^>]*onClick=\{closeSheet\}/.test(fab), '시트 바깥(어두운 곳)을 누르면 닫는다');
  ok(/setMirSummoner\(/.test(fab) && /'무엇을 도와드릴까요\?'/.test(fab) && /MIR_IDLE_CLOSE_MS = 20000/.test(fab), '부르기(인사 «무엇을 도와드릴까요?»)·20초 무입력 닫힘');
  ok(/if \(!inspRef\.current\) return false;/.test(fab) && /_summoner\(\{ text: t, hello: !!parsed\.mirHello, from \}\) !== false/.test(rd('src/faceDock.js')), '감사 권장 5 — 로그인 전에는 부름을 받지 않는다(검색줄 입력을 먹지 않는다)');
  ok(/clearTimeout\(helloTimerRef\.current\)/.test(fab) && /return \(\) => \{ setMirSummoner\(null\); if \(helloTimerRef\.current\)/.test(fab), '감사 권장 4 — 인사 뒤 다시 듣기 시계는 언마운트 때 정리한다');
  ok(/mood\.badge\} \{mood\.label\}/.test(fab) && /mood\.why \?/.test(fab), '얼굴로만 보이던 기분 배지·이유는 시트 머리에 남는다');
  const fd = rd('src/faceDock.js');
  { const cd = rd('src/pages/ChiefDashboard.jsx'), cb = rd('src/components/ChiefMirBar.jsx');
    ok(/<ChiefMirBar \/>\s*\n\s*<\/nav>/.test(cd) && /<nav className="hud-dock[^\n]*data-chief-tabs="1">/.test(cd), '5.00-02 수석 상황판 — 탭 줄(상황판·진행·마감·도구) 안 넷째 칸에 미르(ChiefMirBar · 검수사 «이안에 넣으세요»)');
    ok(/toggleMirSheet\('chief-bar'\)/.test(cb) && /if \(!st\.ready\) return null;/.test(cb) && !/answerOne|nlSearch/.test(cb) && /className="hud-tab hud-door/.test(cb) && !/role="tab"/.test(cb), '미르 칸은 MirFab 시트 한 벌을 연다(따로 답하지 않는다) · 탭이 아니라 문(hud-door) · 로그인 전에는 없다'); }
  ok(/if \(!t \|\| !parsed \|\| !parsed\.mirCalled\) return false;/.test(fd), '호출어 판정은 nlSearch parsed.mirCalled 한 벌(호출어 없는 말은 검색 그대로)');
  const vp = rd('src/pages/VoyagePage.jsx'), sp = rd('src/components/SearchPanel.jsx'), gs = rd('src/pages/GlobalSearchPage.jsx');
  ok((vp.match(/summonMirIfCalled\(t, parseNaturalQuery\(t\), 'voyage-mic'\)\) return;/g) || []).length === 2 && (vp.match(/summonMirIfCalled\(q, parseNaturalQuery\(q\), 'voyage-type'\)\) return;/g) || []).length === 2, '항차 화면 검색줄 🎤 두 곳·⌨ Enter 두 곳이 호출어면 미르를 부른다');
  ok(/summonMirIfCalled\(t, parseNaturalQuery\(t\), 'search-mic'\)/.test(sp) && /summonMirIfCalled\(v, parseNaturalQuery\(v\), 'search-type'\)/.test(sp), '작업 시작(SearchPanel) 검색줄 🎤·⌨');
  ok(/summonMirIfCalled\(t, parseNaturalQuery\(t\), 'global'\)/.test(gs), '통합검색(수석 상황판 안 포함) 🎤·⌨ — submitNow 한 곳');
  ok((sp.match(/smallTalkLast: true, workOnly: true,/g) || []).length === 2 && (vp.match(/smallTalkLast: true, workOnly: true,/g) || []).length === 1 && (gs.match(/smallTalkLast: true, workOnly: true,/g) || []).length === 2 && !/workOnly/.test(fab), '검색줄 엔진 재료는 작업용(workOnly) · 미르 시트(MirFab)는 비서용');
  ok(!/<MirFace/.test(sp) && !/<MirFace/.test(gs), '작업용 검색줄에는 미르 얼굴을 그리지 않는다');
  { const mj = rd('src/mir.js'); ok(/if \(ctx && ctx\.workOnly && mirWorkChatOf\(q\)\) \{[^\n]*\n?\s*out\.text = MIR_CALL_HINT;|if \(ctx && ctx\.workOnly && mirWorkChatOf\(q\)\) \{ \/\*[^*]*\*\/ out\.text = MIR_CALL_HINT;/.test(mj) && (mj.match(/if \(c\.workOnly\) \{ _via\('workHint'\); return MIR_CALL_HINT; \}/g) || []).length === 2, '작업용 판정은 엔진 한 벌(mir.js — 콘앱 mir-core 도 같은 함수)'); }

  console.log('[2] 그려서 부르기(jsdom)');
  if (!BUNDLE || !fs.existsSync(BUNDLE)) { ok(false, '번들이 없다 — 렌더 검사를 못 했다', BUNDLE); }
  else {
    const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const errs = [], said = [];
    dom.window.addEventListener('error', (e) => errs.push(e.message));
    dom.window.speechSynthesis = { speaking: false, speak(u) { said.push(String(u && u.text || '')); }, cancel() {}, getVoices() { return []; } };
    dom.window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    let started = 0;
    dom.window.webkitSpeechRecognition = class { start() { started += 1; } stop() {} abort() {} };
    try { dom.window.eval(fs.readFileSync(BUNDLE, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
    await wait(400);
    const d = dom.window.document, W = dom.window;
    const click = async (el) => { el.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(150); };
    ok(!errs.length, '렌더 오류 0', errs.slice(0, 3).join(' | '));
    ok(d.querySelectorAll('button[aria-label="미르에게 묻기"]').length === 0 && !d.getElementById('mirFabIn'), '처음에는 미르가 숨어 있다(얼굴 단추 0 · 시트 없음)');
    ok(W.__summon('PCSZ 리퍼 몇 개') === false && !d.getElementById('mirFabIn'), '호출어 없는 말은 미르를 부르지 않는다(검색 그대로)');
    ok(W.__summon('미르야') === true, '«미르야» → 부름 접수'); await wait(300);
    const sh = () => d.querySelector('[data-mir-sheet]');
    ok(!!d.getElementById('mirFabIn') && !!sh() && /무엇을 도와드릴까요\?/.test(sh().textContent), '시트가 올라오며 «무엇을 도와드릴까요?»');
    ok(said.some((x) => /무엇을 도와드릴까요/.test(x)), '인사를 소리로 읽는다');
    await wait(1800);
    ok(started >= 1, '인사 뒤 바로 다시 듣는다(음성 인식 시작)', 'start=' + started);
    const bd = d.querySelector('[data-mir-backdrop]');
    if (bd) await click(bd);
    ok(!!bd && !d.getElementById('mirFabIn'), '바깥을 누르면 닫힌다');
    ok(W.__summon('미르야 1234 실번호') === true, '«미르야 + 물음» → 부름 접수'); await wait(900);
    ok(!!sh() && !/무엇을 도와드릴까요/.test(sh().textContent) && /1234 실번호/.test(sh().textContent), '인사 없이 바로 그 물음에 답한다(물은 말이 답 위에)');
    const x = d.querySelector('[data-mir-sheet] button[aria-label="미르 닫기"]'); if (x) await click(x);
    ok(!!x && !d.getElementById('mirFabIn'), '✕ 로 닫힌다');
    //  ★ 검수사 2026-11-12 19:41 — 작업용(부름말 없음)과 비서용(«미르야») 네 경우
    {
      const w1 = W.__work('KBTR 리퍼 몇 개');
      ok(W.__summon('KBTR 리퍼 몇 개') === false && !d.getElementById('mirFabIn') && !!w1.a && w1.a !== W.__HINT, '① 부름말 없는 조회 — 시트는 닫혀 있고 검색 결과가 나온다', JSON.stringify(w1).slice(0, 120));
      const w2 = W.__work('KBTR 몇 대 남았어');
      ok(W.__summon('KBTR 몇 대 남았어') === false && !d.getElementById('mirFabIn') && !!w2.a && w2.a !== W.__HINT, '② 부름말 없는 «몇 대 남았어» — 시트는 닫혀 있고 답이 나온다', JSON.stringify(w2).slice(0, 160));
      ok(W.__summon('미르야') === true, '③ «미르야» 만 → 부름'); await wait(300);
      ok(!!sh() && /무엇을 도와드릴까요\?/.test(sh().textContent), '③ 시트가 열리고 «무엇을 도와드릴까요?»');
      { const bd2 = d.querySelector('[data-mir-backdrop]'); if (bd2) await click(bd2); }
      ok(W.__summon('미르야 KBTR 몇 대 남았어') === true, '④ «미르야 + 배 + 몇 대 남았어» → 부름'); await wait(1200);
      ok(!!sh() && !/무엇을 도와드릴까요/.test(sh().textContent) && /KBTR 몇 대 남았어/.test(sh().textContent) && /\d/.test((sh().querySelector('.whitespace-pre-line') || {}).textContent || ''), '④ 시트가 열리고 인사 없이 바로 답한다', (sh() ? sh().textContent : '').slice(0, 160));
      { const x2 = d.querySelector('[data-mir-sheet] button[aria-label="미르 닫기"]'); if (x2) await click(x2); }
      ok(W.__summon('미르아') === true && W.__summon('미르 야') === true, '부름말 변형(«미르아»·«미르 야»)도 부른다(nlSearch _mir 한 벌)'); await wait(200);
      { const x3 = d.querySelector('[data-mir-sheet] button[aria-label="미르 닫기"]'); if (x3) await click(x3); }
      for (const app of ['tally', 'cone']) {
        for (const q of ['안녕', '심심해', '노래 불러줘', '농담 하나 해줘']) {
          const f0 = W.__fetchN; const r = await W.__workAsk(q, app);
          ok(r.text === W.__HINT && W.__fetchN === f0 && W.__summon(q) === false, `감사 막음 2 — ${app === 'cone' ? '콘앱 콘 질문바' : '검수앱 검색줄'} «${q}»(부름말 없음) → «"미르야" 하고 부르시면 미르가 답합니다» 한 줄 · 모델·네트워크 호출 0`, JSON.stringify({ ...r, fetch: W.__fetchN - f0 }));
        }
      }
      for (const q of ['미르야 안녕', '미르야 심심해']) {
        ok(W.__summon(q) === true, `«${q}» 는 대화(미르 시트)로 간다`); await wait(250);
        const x9 = d.querySelector('[data-mir-sheet] button[aria-label="미르 닫기"]'); if (x9) await click(x9);
      }
      {
        //  감사 권장 1 — 부름말 범위(nlSearch _mir 한 벌 — 콘앱 mir-core 도 같은 함수)
        const yes = ['미르야', '미르아', '미르 야', '미르야 PCSZ 몇 대 남았어', '미르, 리퍼 몇 개', '미르 귀여워', '미르?', '미르야?', '미르'];
        const no = ['미르가 뭐야', '미르는 어디', '미르코 리스트', '미르야드', 'PCSZ 미르야'];
        const badY = yes.filter((t) => !W.__called(t)), badN = no.filter((t) => W.__called(t));
        ok(!badY.length && !badN.length, '부름말 범위 — 부름: ' + yes.join(' · ') + ' / 부름 아님: ' + no.join(' · '), JSON.stringify({ badY, badN }));
      }
      const w5 = W.__work('고마워');
      ok(w5.a === W.__HINT && w5.via === 'workHint' && !d.getElementById('mirFabIn'), '작업용 검색줄의 잡담 — 미르를 띄우지 않고 «"미르야" 하고 부르시면 미르가 답합니다» 한 줄', JSON.stringify(w5));
    }
  }
  {
    const pc = rd('src/components/PrintableCargoPlanV2.jsx');
    ok(/const effShipName = String\(voyageInfo\?\.vslFull \|\| ''\)\.trim\(\)/.test(pc), '② 출력 머리 선박명은 info.vslFull → 베이사전 이름 → 코드 순(PDF 파일 이름은 코드 그대로)');
    const C = rd('public/cone.html');
    ok(/vslFull: info\.vslFull\|\|''/.test(C) && /vslFull:_v\.vslFull\|\|'' \};/.test(C), '② 콘앱 카고플랜에도 vslFull 을 넘긴다(같은 머리)');
  }
  {
    //  무입력 닫힘 — MirFab 의 사라지기 시계(시간 상수만 바꿔 실제 시계로 돈다)
    const src = rd('src/components/MirFab.jsx');
    ok(/if \(busy \|\| listenRef\.current \|\| speaking\) \{ lastActRef\.current = Date\.now\(\); return; \}/.test(src) && /if \(Date\.now\(\) - lastActRef\.current > MIR_IDLE_CLOSE_MS\) closeSheet\(\);/.test(src), '말하는 중·듣는 중·답 만드는 중에는 안 닫히고, 그 뒤 20초 무입력이면 닫힌다');
  }

  console.log('[3] 화면별 지연 조각 · sw 미리받기');
  ok(/lazyScreen\('수석 상황판', \(\) => import\('\.\/pages\/ChiefDashboard\.jsx'\)\)/.test(app) && !/^import ChiefDashboard /m.test(app), '수석 상황판은 처음 열 때 받는다(정적 import 0)');
  for (const p of ['OwnerPage', 'FoodPage', 'AuxPage', 'HealthPage', 'DataCenterPage', 'GlobalSearchPage', 'StaffManagerModal']) ok(new RegExp(`import\\('\\./(?:pages|components)/${p}\\.jsx'\\)`).test(app) && !new RegExp(`^import ${p} `, 'm').test(app), `${p} 지연 받기`);
  ok(/import\('\.\.\/components\/PrintHubModal\.jsx'\)/.test(rd('src/pages/VoyagePage.jsx')) && !/^import PrintHubModal /m.test(rd('src/pages/VoyagePage.jsx')), '출력 센터(PrintHubModal) 지연 받기');
  ok(/<React\.Suspense fallback=\{<LazyLoading \/>\}>/.test(app), '받는 동안 «불러오는 중» 자리');
  const ls = rd('src/lazyScreen.jsx');
  ok(/\.catch\(\(err\) =>/.test(ls) && /console\.warn/.test(ls) && /다시 받기/.test(ls) && /LAZY_LIMIT_MS = 15000/.test(ls) && /clearTimeout\(t\)/.test(ls), '조각 받기 실패·15초 넘김은 사유와 [다시 받기] 로 보인다(조용한 실패 금지)');
  const idx = rd('index.html');
  const refs = [...idx.matchAll(/(?:src|href)="\.\/(assets\/[^"?#]+\.(?:js|css))"/g)].map((m) => m[1]);
  const mainF = refs.find((f) => /^assets\/index-[\w-]+\.js$/.test(f));
  const DA = path.join(ROOT, 'dist', 'assets');
  const dist = fs.existsSync(DA) ? fs.readdirSync(DA) : [];
  for (const c of ['ChiefDashboard', 'OwnerPage', 'FoodPage', 'AuxPage', 'HealthPage', 'DataCenterPage', 'GlobalSearchPage', 'StaffManagerModal', 'PrintHubModal']) {
    const f = dist.find((x) => new RegExp(`^${c}-[\\w-]+\\.js$`).test(x));
    ok(!!f && !refs.includes('assets/' + f), `${c} 가 따로 떨어진 조각이고 첫 화면이 미리 부르지 않는다`, f || '없음');
  }
  if (mainF) {
    const M = fs.readFileSync(path.join(ROOT, mainF), 'utf8');
    console.log('  · 첫 화면 본체 ' + mainF + ' ' + (M.length / 1048576).toFixed(2) + 'MB');
    ok(!M.includes("lazyScreen('수석 상황판'") || !/function ChiefDashboard\(/.test(M), '본체에 수석 상황판 본문이 없다');
  }
  for (const sw of ['sw.js', 'dist/sw.js']) {
    const s = rd(sw);
    const m = s.match(/^const PRECACHE_EXTRA = (\[.*\]);/m);
    let list = []; try { list = m ? JSON.parse(m[1].replace(/'/g, '"')) : []; } catch (e) { list = []; ok(false, `${sw} 조각 목록을 못 읽었다`, e.message); }
    const want = dist.filter((x) => /\.(js|css)$/.test(x)).map((x) => './assets/' + x);
    ok(want.length > 0 && want.every((u) => list.includes(u)), `${sw} 미리받기 목록에 dist/assets 의 js·css 전부(${list.length}개 · 지연 조각 포함)`, want.filter((u) => !list.includes(u)).join(','));
    ok(/precacheShell\(\)\.then\(precacheExtra\)/.test(s) && /setTimeout\(\(\) => \{ console\.warn\('\[sw 4\.87-10\] 새 판 미리받기 20초 초과/.test(s), `${sw} 뼈대 먼저 → 조각, 20초 제한 유지`);
  }
  ok(/^const PRECACHE_EXTRA = \[\];/m.test(rd('public/sw.js')), 'public/sw.js 는 빈 목록 그대로(빌드가 산출물에만 채운다)');
  ok(!/\(앞 판\) 'TallyOne 4\.8/.test(rd('src/utils.js')) && fs.existsSync(path.join(ROOT, 'docs/APP_HISTORY.md')) && /4\.87-10 업데이트 미리받기/.test(rd('docs/APP_HISTORY.md')) && /^\/\/ 판 이력\(4\.8[78](-\d\d)? 까지/m.test(rd('src/utils.js')), '판 이력 주석은 docs/APP_HISTORY.md 로 옮겼다');

  console.log('[4] 콘앱(ConeOne 2.79) — 떠 있는 얼굴 없음 · 콘 질문바로 «미르야»');
  {
    const C = rd('public/cone.html');
    ok(/fab\.style\.display='none';\n  let _idleT=null/.test(C) && !/fab\.style\.display='block'/.test(C), '콘앱 떠 있는 미르 얼굴(#mirFab)을 보이지 않는다');
    ok(/window\.__coneMirSummon=function\(q\)\{/.test(C) && /window\.ConeMir\.parseNaturalQuery\(t\)/.test(C) && /if\(!t \|\| !p \|\| !p\.mirCalled\) return false;/.test(C), '콘앱 호출어 판정은 검수앱과 한 벌(ConeMir.parseNaturalQuery mirCalled)');
    ok(/if\(p\.mirHello\)\{ inp\.value=''; show\('무엇을 도와드릴까요\?'\);/.test(C) && /else \{ inp\.value=t; ask\(\); \}/.test(C), '콘앱 호출어만 → 인사·다시 듣기 · 호출어+물음 → 바로 답');
    ok((C.match(/if\(window\.__coneMirSummon && window\.__coneMirSummon\(q\)\)\{ inp\.value=''; return; \}/g) || []).length === 2, '콘 질문바 🎤·⌨(질문 단추·Enter) 두 길 모두 호출어면 미르 시트로');
    ok(/back\.onclick=\(\)=>\{ sheet\.querySelector\('#mirX'\)\.click\(\); \}/.test(C) && /sheet\.style\.display='none'; back\.style\.display='none';/.test(C), '콘앱 시트 바깥을 누르면 닫힌다');
    ok(/Date\.now\(\)-_lastAct>20000/.test(C) && /if\(_mirThink \|\| sp \|\| mic\.textContent==='●'\)\{ _touch\(\); return; \}/.test(C), '콘앱 20초 무입력 닫힘(말하는 중·생각 중·듣는 중 제외)');
    ok(/window\.__CONEV='ConeOne (?:2\.79|3\.\d\d)(-\d\d)?'/.test(C), '콘앱 판 ConeOne 2.79 이후');
    ok((C.match(/mirAsk\(q, \{workOnly:true\}\)/g) || []).length === 2 && /workOnly: !!\(opt && opt\.workOnly\)/.test(C), '콘 질문바(작업용)는 workOnly — 시트(비서용)는 아님');
  }

  console.log('[5] 인사쇼(intro.html) 미르 그림 — 검수사 2026-11-12 20:26 «로그아웃화면에서는 미르가 아직도 두팔이 옷에 갇혀 있습니다»');
  {
    const crypto = require('crypto');
    const WANT = '24c46c015292258dc0a30d4ea1f279aadddf414b1f5ee6ef6803f93372b0fa5c';   // p14 손 흔드는 실사 미르 632x872 webp(29,796B)
    for (const f of ['public/intro.html', 'intro.html', 'dist/intro.html']) {
      if (!fs.existsSync(path.join(ROOT, f))) { ok(false, `${f} 이 없다`); continue; }
      const m = rd(f).match(/var rc="data:image\/webp;base64,([A-Za-z0-9+\/=]+)"/);
      const h = m ? crypto.createHash('sha256').update(Buffer.from(m[1], 'base64')).digest('hex') : '';
      ok(h === WANT, `${f} 안의 마스코트 그림(alt «Mir mascot»)이 새 그림 해시와 같다`, h.slice(0, 16));
    }
  }

  {
    //  검수사 2026-11-12 20:30 «이사진은 사용하시면 안됩니다. 클로드의 명성에 해가 됩니다» — 옛 만화 미르(팔이 조끼에 갇힌 그림)의 base64 앞 200자가 저장소 어디에도 없어야 한다
    const OLD = 'UklGRi7UAwBXRUJQVlA4WAoAAAAEAAAA7wQAzwYAVlA4IIbSAwAQuwmdASrwBNAGPhkMhUIhBEJjCQQAYSzgGr5l59/s259+f5tfYnqH+j/i/Vn/odd/Y/mG9G/+X7p/mV/0//Z7Xf1n/7/z/+hT9eP+l7U//B7C/3n/ED4Y/tn+0/vI/mZ8Ef7r6jP9N/1n/29sv1mv';
    const hits = [];
    const walk = (dir) => { for (const n of fs.readdirSync(dir, { withFileTypes: true })) { if (['node_modules', '.git'].includes(n.name)) continue; const f = path.join(dir, n.name); if (n.isDirectory()) walk(f); else if (/\.(html|js|mjs|cjs|jsx|css|json|md|txt)$/.test(n.name) && fs.statSync(f).size < 40e6 && !/smoke_mirhdr489\.cjs$/.test(f)) { try { if (fs.readFileSync(f, 'utf8').includes(OLD)) hits.push(path.relative(ROOT, f)); } catch (e) { hits.push('읽기 실패 ' + f); } } } };
    walk(ROOT);
    ok(!hits.length || (hits.length === 1 && hits[0] === path.join('dist_helper', 'intro.html')), '저장소 어디에도 옛 만화 미르 그림(base64 앞 200자)이 없다(dist_helper 는 이 검사 뒤 헬퍼 빌드가 새로 만들고 build.sh 가 다시 본다)', hits.join(','));
  }

  console.log(`\n${bad ? '✗' : '✓'} 4.89 연막 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('✗ 4.89 연막 예외:', e && e.stack || e); process.exit(1); });
