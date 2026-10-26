// 4.51 «지난 배·같은 시작 동률·끝난 배 자리» 한 벌 연막검사 — 홈 목록과 로그인 현황판이 같은 실데이터(2026-10-26 08:09 KST 실 15항차 + 시험용 세 척)에서 같은 순서를 내는가.
//   검수사 2026-10-26 06:47 «틀린 배정 순서 왜 일까요? 같은 앱인데 틀린 배정 화면?» · 07:33 «지난배가 아니고 작업배정이 뒤로 밀린것입니다.»
//   ① 공용 함수 planIsPast · planIsLive · planEndCompare · voyageHasLeft(실소스 utils.js) ② 두 화면의 소스 배선 ③ 실제 홈(컴 폭·폰 폭)·로그인을 jsdom 으로 그려 배 순서를 비교(번들은 build.sh 가 만든다 — firebase 는 메모리 스텁).
//   ⚠ 이 검사가 «한 벌» 이라고 증명하는 범위 — 지난 배 판정 · 같은 시작일 때 순서 · 끝난 배 자리. 홈이 쓰는 도선 예보·PORT-MIS 후보 시각과 «현 부두 먼저»·«자료 있는 배 먼저» 는 로그인에 없는 입력이라 이 검사의 대상이 아니다.
//   인자: node tools/smoke_planorder451.cjs <번들.js>   (번들 없이 돌리면 ③ 은 건너뛰지 않고 실패한다)
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };

(async () => {
  const U = await import(path.join(ROOT, 'src/utils.js'));
  const now = Date.now(), H = 3600e3;
  const fmt = (t) => { const d = new Date(t), p2 = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };

  console.log('① 공용 함수');
  ok(U.planIsPast(now - 2 * H, now - 1 * H, now) === true, '끝이 지났으면 지난 배');
  ok(U.planIsPast(now - 30 * H, now + 50 * H, now) === false, '시작은 어제인데 끝이 모레면 지난 배가 아니다(작업이 뒤로 밀린 배 — SWBT 옛 데이터)');
  ok(U.planIsPast(now - 1 * H, 0, now) === true && U.planIsPast(now + 1 * H, 0, now) === false, '끝을 모르면 시작으로 잰다');
  ok(U.planIsPast(0, 0, now) === false && U.planIsPast(null, null, now) === false, '시각을 모르면 지난 배가 아니다(단정하지 않는다)');
  ok(U.planIsLive(now - 30 * H, now + 50 * H, now) === true && U.planIsLive(now - 2 * H, now - 1 * H, now) === false, '시작을 알고 끝이 안 지났으면 live — 지난 끝이면 아니다');
  ok(U.planIsLive(now - 2 * H, 0, now) === true && U.planIsLive(0, now + H, now) === false, '끝을 몰라도 시작을 알면 live(홈 ⓪등급 그대로) · 시작을 모르면 아니다');
  ok(U.planIsLive(now - 2 * H, now, now) === true && U.planIsPast(now - 2 * H, now, now) === false, '끝이 정확히 지금이면 아직 안 지났다(경계)');
  const e1 = now + 5 * H, e2 = now + 12 * H;
  ok(U.planEndCompare(e1, e2) < 0 && U.planEndCompare(e2, e1) > 0 && U.planEndCompare(e1, e1) === 0, '같은 시작이면 먼저 끝나는 배가 위');
  ok(U.planEndCompare(0, e1) > 0 && U.planEndCompare(e1, null) < 0 && U.planEndCompare(0, null) === 0, '끝을 모르는 배는 뒤 · 둘 다 모르면 동률');
  const V = (info) => ({ info });
  ok(U.voyageHasLeft(V({ terminalStatus: 'departed' }), now) === true && U.voyageHasLeft(V({ terminalStatus: 'done' }), now) === true, '터미널 상태 떠남·완료면 떠난 배');
  ok(U.voyageHasLeft(V({ workEndAt: fmt(now - 2 * H) }), now) === true && U.voyageHasLeft(V({ workEndAt: fmt(now + 2 * H) }), now) === false, '작업 끝 시각이 지났으면 떠난 배 · 앞이면 아니다');
  ok(U.voyageHasLeft(V({ terminalStatus: 'planned' }), now) === false && U.voyageHasLeft(V({}), now) === false && U.voyageHasLeft(null, now) === false, '계획 상태·빈 칸·null 은 떠난 배가 아니다');

  console.log('② 소스 배선 — 두 화면이 한 벌을 쓴다');
  const home = fs.readFileSync(path.join(ROOT, 'src/pages/HomePage.jsx'), 'utf8');
  const login = fs.readFileSync(path.join(ROOT, 'src/pages/LoginPage.jsx'), 'utf8');
  ok(/planIsPast, planIsLive, planEndCompare/.test(home), '홈: planIsPast·planIsLive·planEndCompare 를 utils 에서 가져온다');
  ok(/if \(planIsLive\(eta, etd, now\)\) return \[0, eta\];/.test(home), '홈: 정렬 ⓪등급 = planIsLive');
  ok(/planEndCompare\(a\._etdMs, b\._etdMs\)/.test(home) && !/if \(\(a\._etdMs == null\) !== \(b\._etdMs == null\)\)/.test(home), '홈: 같은 시작 동률 = planEndCompare(옛 인라인 비교는 없다)');
  ok(/const _isPastVoy = \(v, now\) => planIsPast\(v\?\._etaMs, v\?\._etdMs, now\);/.test(home), '홈: 지난 배 = planIsPast');
  ok(/planIsLive, planEndCompare, voyageHasLeft/.test(login), '로그인: planIsLive·planEndCompare·voyageHasLeft 를 가져온다');
  ok(/const delayedLive = n != null && n < 0 && msEnd > 0 && planIsLive\(ms, msEnd, now\) && !voyageHasLeft\(v, now\);/.test(login) && /n === 2 \? 3 : delayedLive \? 1 : 9/.test(login), '로그인: 시작은 지났어도 끝이 안 지난 배는 rank 1(떠난 배 제외)');
  ok(/over: msEnd > 0 && !planIsLive\(ms, msEnd, now\) \? 1 : 0/.test(login) && /a\.over - b\.over/.test(login) && /planEndCompare\(a\.msEnd, b\.msEnd\)/.test(login), '로그인: 순서 = rank → 끝난 배는 뒤 → 시작 → planEndCompare');
  ok((login.match(/\.filter\(s => !\(s\.ms != null && s\.ms < now\)\)/g) || []).length === 1 && /\.filter\(s => s\.rank === 0 \|\| !\(s\.ms != null && s\.ms < now && \(s\.rank === 9 \|\| s\.over\)\)\)/.test(login),
     '로그인: 채움은 종전 그대로 · «그 밖 대기» 는 시작이 지난 배를 계획 끝(over)이 지났을 때·rank 9 일 때만 빼고 작업중(rank 0)과 시작 전 배는 센다(시작한 안 끝난 배는 세고 떠난 다일 배는 «그 밖 대기» 로 새지 않는다)');
  ok(/ships: ships\.filter\(s => s\.rank < 3\)/.test(login), '로그인: 타임라인이 받는 board.ships 는 종전처럼 rank<3');

  console.log('③ 실제 화면 — 같은 데이터로 홈(컴·폰)과 로그인을 그려 순서를 비교');
  const bundle = process.argv[2];
  if (!bundle || !fs.existsSync(bundle)) { ok(false, '렌더 번들이 없다 — build.sh 가 만들어 넘겨야 한다'); finish(); return; }
  const { JSDOM } = require('jsdom');
  const NAMES = ['WKA', 'WKB', 'WKC', 'WKD', 'WKE', 'WKF', 'WKG', 'WKH', 'WKI', 'WKJ', 'WKK', 'WKL', 'WKM', 'LVA', 'LVB', 'LVC', 'LVD', 'LVE', 'LVF', 'LVG', 'LVH', 'LVI', 'LVJ', 'LVK', 'LVL', 'LVM', 'LVN', 'EXA', 'EXB', 'EXC', 'EXD', 'EXE', 'EXF', 'ATPR', 'DEPEARLY', 'DPRT', 'DXQD', 'ENDEDTODAY', 'MAMP', 'NSDC', 'NSFR', 'OBWH', 'PCSZ', 'RZOR', 'STMJ', 'SWBT', 'SWBTOLD', 'TMPZ', 'TNJP', 'XTPG', 'YKTD'];
  const run = (mode, width, extra = 0, live = 0, work = 0) => new Promise((resolve) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/',
      beforeParse(w) {   // 화면 폭 — 컴(1280)·폰(400). 홈이 폭으로 펼친 묶음·접힘을 가른다
        Object.defineProperty(w, 'innerWidth', { value: width, configurable: true });
        w.matchMedia = (q) => ({ matches: /min-width:\s*(\d+)/.test(q) ? width >= Number(RegExp.$1) : /max-width:\s*(\d+)/.test(q) ? width <= Number(RegExp.$1) : false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      },
    });
    const errs = [];
    dom.window.console.error = (...a) => { const s = a.map(String).join(' '); if (/Error|is not defined|Cannot read/.test(s) && !/must not return anything besides a function/.test(s)) errs.push(s.slice(0, 160)); };
    dom.window.__MODE = mode; dom.window.__EXTRA = extra; dom.window.__EXTRA_LIVE = live; dom.window.__EXTRA_WORK = work;
    //  시각 가짜로 돌려 보기(손으로 확인용) — PO_OFFSET_MIN=분 이면 창의 «지금» 을 그만큼 밀어 하루 어느 때에도 순서가 안 흔들리는지 본다. 빌드는 안 쓴다.
    if (process.env.PO_OFFSET_MIN) dom.window.eval(`(function(){var R=Date,off=${Number(process.env.PO_OFFSET_MIN) * 60000};function F(a,b,c,d,e,f,g){return arguments.length?new R(...arguments):new R(R.now()+off)}F.now=function(){return R.now()+off};F.prototype=R.prototype;F.parse=R.parse;F.UTC=R.UTC;window.Date=F;})();`);
    try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW ' + e.message); }
    setTimeout(() => {
      const d = dom.window.document;
      let order = [], labels = {}, restN = null, choice = {};
      if (mode === 'choice') {
        //  작업 선박 선택 — 선박 줄(data-choice-voyage) 별 글자(이름표·시각)
        [...d.querySelectorAll('[data-choice-voyage]')].forEach((b) => { choice[b.getAttribute('data-choice-voyage')] = (b.textContent || '').replace(/\s+/g, ' '); });
      }
      if (mode === 'login') {
        const rm = /그 밖 대기\s*(\d+)\s*척/.exec((d.body.textContent || '').replace(/\s+/g, ' ')); restN = rm ? Number(rm[1]) : 0;
        const boxes = [...d.querySelectorAll('div')].filter((el) => el.children.length === 0 && NAMES.includes((el.textContent || '').trim()));
        order = boxes.map((b) => (b.textContent || '').trim());
        boxes.forEach((b) => { labels[(b.textContent || '').trim()] = (b.parentElement.textContent || '').replace(/\s+/g, ' '); });
      } else {
        //  홈 — 문서에 나온 순서대로 배 이름을 뽑는다(첫 등장 순서). 컴 폭에서는 날짜 묶음(어제·오늘·내일…)이 위에서 아래로, 폰 폭에서는 펼친 묶음 뒤에 «그 밖의 배» 접힘이 온다.
        const txt = (d.body.textContent || '').replace(/\s+/g, ' ');
        const seen = new Set();
        const re = /(SWBTOLD|ENDEDTODAY|DEPEARLY|ATPR|DPRT|DXQD|MAMP|NSDC|NSFR|OBWH|PCSZ|RZOR|STMJ|SWBT|TMPZ|TNJP|XTPG|YKTD)(?=\d|[A-Z]\d|R\d)/g;
        let m; while ((m = re.exec(txt))) { if (!seen.has(m[1])) { seen.add(m[1]); order.push(m[1]); } }
        labels = Object.fromEntries(order.map((n) => [n, '']));
      }
      resolve({ order, labels, errs, restN, choice, over: dom.window.__OVER_NAMES || [], endedOk: dom.window.__ENDED_OK !== false });
    }, 1200);
  });
  const L = await run('login', 1280);
  const Hm = await run('home', 1280);
  const Hp = await run('home', 400);
  ok(L.errs.length === 0 && Hm.errs.length === 0 && Hp.errs.length === 0, `렌더 오류 0 (로그인 ${L.errs.length} · 홈 컴 ${Hm.errs.length} · 홈 폰 ${Hp.errs.length})` + (L.errs.concat(Hm.errs, Hp.errs)[0] ? ' — ' + L.errs.concat(Hm.errs, Hp.errs)[0] : ''));
  console.log('     홈(컴)  :', Hm.order.join(' · '));
  console.log('     홈(폰)  :', Hp.order.join(' · '));
  console.log('     로그인  :', L.order.join(' · '));
  const EN = L.endedOk;   // 자정 직후 20분에는 «오늘 시작해 오늘 끝난» 배를 못 만든다 — 그때는 이 배 단언을 «없음» 으로 센다
  const total = 17 + (EN ? 1 : 0);
  ok(Hm.order.length === total && Hp.order.length === total, `홈이 컴·폰 폭 모두 ${total}척을 다 그린다 — 주 목록이 실제로 그려진다(자료 있음 — 컴 ${Hm.order.length} · 폰 ${Hp.order.length})`);
  //  OBWH(오늘 11:00~19:30)는 저녁 19:30 이후엔 끝난 배라 뒤로 간다 · 로그인 화면 목록은 12칸에서 자른다(PC 카드) — 칸 수는 시각에 흔들리지 않게 넓게 본다.
  ok(L.order.length >= 10 && L.order.length <= 13, `로그인 현황판 화면 목록 10~13칸(${L.order.length})`);
  ok(!L.order.includes('DEPEARLY'), '이미 떠난 다일 배(계획 끝은 앞이어도 터미널이 «떠남»)는 로그인 현황판에 올리지 않는다');
  ok(L.order[0] === 'SWBTOLD' && /어제\s*08:00/.test(L.labels.SWBTOLD || ''), '시작은 어제인데 끝이 안 지난 배(SWBT 옛 데이터)가 «지난 배»로 안 빠지고 로그인 맨 위에 «어제 08:00» 로 보인다');
  ok(Hm.order[0] === 'SWBTOLD', '컴 폭 홈도 같은 배가 맨 위(어제 묶음)');
  ok(Hp.order.includes('SWBTOLD'), '폰 폭 홈에도 같은 배가 이름으로 보인다(«그 밖의 배» 접힘 — 알려진 차이, 기록부에 적음)');
  if (EN) {
    ok(L.order.includes('ENDEDTODAY') && Hm.order.includes('ENDEDTODAY'), '오늘 시작해 계획 끝이 지난 배(ENDEDTODAY)는 두 화면 모두에 남는다(홈도 «오늘» 묶음에 둔다 — 숨기지 않는다)');
    ok(L.order.indexOf('ENDEDTODAY') > L.order.indexOf('DXQD') && Hm.order.indexOf('ENDEDTODAY') > Hm.order.indexOf('DXQD') && Hp.order.indexOf('ENDEDTODAY') > Hp.order.indexOf('DXQD'),
       '끝난 배는 같은 «오늘» 줄의 안 끝난 배들 뒤 — 로그인·홈(컴)·홈(폰) 모두(방금 끝난 배가 «오늘» 맨 위에 오르지 않는다)');
  } else { ok(!L.order.includes('ENDEDTODAY') && !Hm.order.includes('ENDEDTODAY'), '자정 직후 20분 — 끝난 배 시험 자료를 만들지 않았다(두 화면 모두 없음)'); }
  //  같은 입력이 있는 배끼리의 순서 — 로그인에 오른 배만 홈(컴)에서 뽑아 같은 순서인가
  const HmOnL = Hm.order.filter((n) => L.order.includes(n));
  ok(L.order.join() === HmOnL.join(), '로그인 현황판의 배 순서 = 홈(컴) 목록에서 같은 배만 뽑은 순서(같은 앱 · 같은 답)');
  const tie = (o) => o.indexOf('TNJP') >= 0 && o.indexOf('TNJP') < o.indexOf('TMPZ');
  ok(tie(L.order) && tie(Hm.order) && tie(Hp.order), '같은 시작(내일 19:00)이면 먼저 끝나는 TNJP(05:00)가 TMPZ(12:00)보다 위 — 로그인·홈(컴)·홈(폰) 모두');
  ok(L.order.indexOf('NSFR') >= 0 && L.order.indexOf('SWBT') >= 0 && L.order.indexOf('NSFR') < L.order.indexOf('SWBT') && Hm.order.indexOf('NSFR') < Hm.order.indexOf('SWBT') && Hp.order.indexOf('NSFR') < Hp.order.indexOf('SWBT'),
     '같은 시작(모레 01:00)이면 먼저 끝나는 NSFR(12:00)이 SWBT(17:00)보다 위 — 세 화면 모두(가나다순과 같은 쌍이라 «끝 시각» 증명은 위 TNJP·TMPZ 쌍이 맡는다)');
  //  ── 4.52-01 (4.51 독립 감사 지적 수리) ──
  //  (가) 로그인 «작업 선박 선택» — 시작이 어제인데 안 끝난 배는 이름표가 «어제», 오늘 배는 «오늘»(rankLabel 의 날짜 분기를 실제 화면으로 잰다).
  const C = await run('choice', 1280);
  const cKey = Object.keys(C.choice).find((k) => /SWBTOLD/.test(k)) || '';
  ok(C.errs.length === 0, `작업 선박 선택 화면 렌더 오류 0(${C.errs.length})`);
  ok(cKey !== '' && /어제/.test(C.choice[cKey]) && /08:00/.test(C.choice[cKey]), '«작업 선박 선택» — 어제 시작·안 끝난 배(SWBTOLD)의 이름표가 «어제» 이고 시각 08:00 이 같이 보인다', C.choice[cKey]);
  const oKey = Object.keys(C.choice).find((k) => /DXQD/.test(k)) || '';
  ok(oKey !== '' && /오늘/.test(C.choice[oKey]) && !/어제/.test(C.choice[oKey]), '«작업 선박 선택» — 오늘 배(DXQD)의 이름표는 «오늘» 이다(어제로 안 번진다)', C.choice[oKey]);
  //  (나) 로그인 현황판 12칸 자름 — 줄 서는 배가 12척을 넘으면 13번째부터가 화면에도 «그 밖 대기» 에도 없이 사라지던 것(감사 중-2).
  //      안 끝난 미래 배 6척을 더하면 «그려진 칸 + 그 밖 대기 N척» 이 기본(여분 0)보다 정확히 6 늘어야 한다 — 사라지는 배가 0.
  const X = await run('login', 1280, 6);
  const drawn0 = L.order.length, rest0 = L.restN || 0, drawnX = X.order.length, restX = X.restN || 0;
  ok(X.errs.length === 0, `여분 배 6척 로그인 렌더 오류 0(${X.errs.length})`);
  ok(drawnX <= 12, `현황판은 12칸까지만 그린다(${drawnX}칸)`);
  //  절대 합계 — 떠난 배(DEPEARLY)와 자정 직후 20분의 끝난 배 시험 자료를 뺀 17(16)척이 «그려진 칸 + 그 밖 대기» 로 전부 센다. 기본 실행과 여분 실행을 서로 견주기만 하면
  //  그리는 칸 수가 ±1 어긋나도 둘이 같이 어긋나 통과한다(독립 감사 4.52-01) — 기본 실행은 시각에 흔들리지 않는 상수라 못 박는다.
  ok(drawn0 + rest0 === (L.endedOk ? 17 : 16), `기본 자료의 그려진 ${drawn0} + «그 밖 대기» ${rest0} = ${L.endedOk ? 17 : 16}척(떠난 배 제외) — 한 척도 안 사라지고 두 번 세지도 않는다`);
  //  자정(00:20)을 가로질러 두 실행의 끝난 배 시험 자료 유무가 갈리면 합계를 견줄 수 없다 — 그때는 이 비교를 건너뛴다(시험 자료가 같아야 견준다).
  if (X.endedOk === L.endedOk) ok(drawnX + restX === drawn0 + rest0 + 6, `앞으로 올 배는 사라지지 않는다 — 그려진 ${drawnX} + «그 밖 대기» ${restX} = 기본 ${drawn0} + ${rest0} + 여분 6`);
  else ok(true, '자정 직후 20분 — 두 실행의 시험 자료가 달라 합계 견주기는 건너뜀(절대 합계 단언이 맡는다)');
  //  이미 시작한 안 끝난 배 14척을 더한다 — 줄 서는 배가 12척을 크게 넘어도 시작한 배가 «그 밖 대기» 에서 빠지지 않는다(독립 감사 4.52-01 재판정 — 시작 시각으로만 «지난 배» 를 가르던 것).
  const Y = await run('login', 1280, 0, 14);
  const drawnY = Y.order.length, restY = Y.restN || 0;
  ok(Y.errs.length === 0 && drawnY <= 12, `시작한 여분 배 14척 로그인 — 렌더 오류 0 · 12칸 이하(${drawnY}칸 · 오류 ${Y.errs.length})`);
  //  기대 합계 — 지금 기준 계획 끝이 지난 배(오늘 끝난 ENDEDTODAY · 19:30 이후의 OBWH …)가 12칸 밖으로 밀리면 «앞으로 올 일감이 아니다» 라서 일부러 «그 밖 대기» 에서 뺀다(설계).
  //  이름 목록은 번들이 «지금» 기준으로 내놓는다(시각 하드코딩 없이 하루 어느 때에도 같은 식 — 독립 감사 4.52-01 재감사: 19:30 이후에 실패하던 것).
  const pushedOut = (R) => (R.over || []).filter((n) => !R.order.includes(n)).length;
  const endedPushed = pushedOut(Y);
  if (Y.endedOk === L.endedOk) ok(drawnY + restY === drawn0 + rest0 + 14 - endedPushed, `시작한 안 끝난 배도 사라지지 않는다 — 그려진 ${drawnY} + «그 밖 대기» ${restY} = 기본 ${drawn0} + ${rest0} + 여분 14 − 12칸 밖으로 밀린 끝난 배 ${endedPushed}(설계상 제외)`);
  else ok(true, '자정 직후 20분 — 두 실행의 시험 자료가 달라 합계 견주기는 건너뜀');
  //  작업중(rank 0)이면서 계획 끝이 지난 배 13척 — 작업중 배는 계획 끝이 지나도 아직 끝나지 않은 일이라 12칸 밖으로 밀려도 «그 밖 대기» 로 센다(필터의 rank 0 조항을 행동으로 증명).
  const Z = await run('login', 1280, 0, 0, 13);
  const drawnZ = Z.order.length, restZ = Z.restN || 0;
  ok(Z.errs.length === 0 && drawnZ <= 12, `작업중 여분 배 13척 로그인 — 렌더 오류 0 · 12칸 이하(${drawnZ}칸 · 오류 ${Z.errs.length})`);
  if (Z.endedOk === L.endedOk) ok(drawnZ + restZ === drawn0 + rest0 + 13 - pushedOut(Z), `작업중 배는 계획 끝이 지나도 사라지지 않는다 — 그려진 ${drawnZ} + «그 밖 대기» ${restZ} = 기본 ${drawn0} + ${rest0} + 여분 13 − 12칸 밖으로 밀린 끝난 배 ${pushedOut(Z)}(설계상 제외)`);
  else ok(true, '자정 직후 20분 — 두 실행의 시험 자료가 달라 합계 견주기는 건너뜀');
  //  소스 배선 — 그리는 쪽과 세는 쪽이 같은 상수를 쓰고, 칸 수 리터럴을 따로 두지 않는다(상수 하나만 고치면 둘이 같이 따라간다).
  const LP = fs.readFileSync('src/pages/LoginPage.jsx', 'utf8').replace(/\/\/.*$/gm, '');
  ok((LP.match(/boardShown\.slice\(0, MAX_CELLS\)/g) || []).length === 2 && !/boardShown\.slice\(0, 12\)/.test(LP), '소스 배선 — 현황판이 그리는 쪽과 «그 밖 대기» 로 세는 쪽이 같은 MAX_CELLS 를 쓰고 12 리터럴을 따로 두지 않는다');
  finish();
})().catch((e) => { console.log('  ✗ 검사 자체가 죽었다 — ' + (e && e.stack || e)); process.exit(1); });

function finish() {
  console.log(`\n${fail ? '✗' : '✓'} 4.51 홈·로그인 순서 한 벌 연막검사 — 통과 ${pass} / 실패 ${fail}`);
  process.exit(fail ? 1 : 0);
}
