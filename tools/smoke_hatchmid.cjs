// 카고플랜에서 해치커버(데크·홀드 경계)가 세로 한가운데 오는지 재는 연막검사 (TallyOne 3.36).
//
//  왜 있는가 — 검수사 2026-09-08 밤(카고플랜 화면 두 장을 보이며)
//  *«여백이 좌우는 정렬이 되어 보이는데 **상하가 정렬이 안되어** 보입니다. 대체적으로 보면 **위쪽으로 치우친거** 같습니다.
//    다른선박은 확인하지 않았습니다. **비율이라면 가장 큰배와 가장 작은배를 기준으로** 맞춰 주시기 바랍니다»*
//  *«그 **적색선에 데크 와 홀드의 경계인 해치커버가 위치하면** 대략 위아래 여백이 균등할듯 합니다»*
//
//  종전(3.35-01)은 데크:홀드 = maxDeck:maxHold 라 해치선이 배마다 16.8%~65.6%(중앙 47.8%)로 흩어졌고,
//  남는 세로는 `justify-content: flex-start` 로 **전부 아래에** 버려져 그림이 위로 치우쳤다(전 선단 63척 실측).
//  ⇒ 3.36 은 ①두 몫을 같게(`globalHatch.maxSide`) ②남는 자리를 위·아래로 나눈다(`center`).
//
//  ⛔ **데크 전용 베이(홀드 없음)는 «윗줄을 맞춘다»** — 검수사 확답 2026-09-09.
//     첫 판은 «카스피에 준한다 = 위에 붙인다» 로 읽었는데 **그 해석이 거짓이었다** — 감사가 같은 도면
//     (`ATPR2519E.PLAN.pdf`)을 좌표로 재어 데크 전용 베이가 이웃보다 3행 **아래**에서 시작하고
//     한 줄에 사다리가 3벌인 것을 보였고, 카스피 자체가 배마다 갈린다(도면 10장).
//     그래서 카스피로는 못 정하고, 옆 상자와 로우 표기 윗줄이 갈리는 것(3.7-03 위반)을 피하는 쪽으로 검수사가 정했다.
//     ⇒ 데크 전용 베이도 «빈 홀드 자리»를 같이 잡아 총 높이를 같게 하고, 말단 여백칸은 어디에도 안 붙인다.
//
//  ⚠ jsdom 에는 배치 엔진이 없어 `getBoundingClientRect()` 가 0 을 낸다. 그래서 픽셀을 재는 대신
//    **그린 DOM 이 실제로 들고 있는 flex 몫**(데크 영역 : 홀드 영역)을 읽는다 — 해치선의 세로 자리는
//    그 두 몫의 비가 정한다. 몫이 같으면 해치는 그림의 정확히 한가운데다.
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_hatchmid.cjs <렌더번들.js> [선박코드]'); process.exit(1); }
const SHIP = process.argv[3] || 'ATPR';

const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = clearTimeout;
dom.window.__SMOKE_SHIP = SHIP;
dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });

let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(String(e.error || e.message)));

console.log(`카고플랜 해치커버 — 세로 한가운데인가 (${SHIP})`);
require(path.resolve(B));

setTimeout(() => {
  ok(errs.length === 0, `렌더 중 오류가 없다 (${errs.length}건)` + (errs.length ? ' | ' + errs[0].slice(0, 120) : ''));
  const doc = dom.window.document;
  const boxes = [...doc.querySelectorAll('.cpv2-bay-box')];
  ok(boxes.length > 0, `베이 상자를 그렸다 (${boxes.length}개)`);

  //  flex 몫은 `flex: "N 1 0"` 또는 max-height 의 `calc(var(--cph, 999px) * N)` 에 들어 있다.
  //  ⚠ **jsdom 의 CSSOM 은 `flex` 단축 속성을 안 받는다** — `el.style.flex` 가 언제나 빈 문자열이라
  //    종전 검사는 `max-height` 만 보고 있었고, `flex` 만 옛값으로 되돌리는 사보타주를 통과시켰다(감사 실측 A3).
  //    ⇒ 원본 `style` 문자열을 직접 읽어 **둘을 따로** 잰다.
  //  ⚠ **jsdom 의 CSSOM 은 `flex` 단축 속성을 통째로 버린다** — React 가 style 로 넣어도 `el.style.flex` 도
  //    `getAttribute('style')` 도 그 값을 안 갖는다(실측). 그래서 그림에서 잴 수 있는 것은 `max-height` 뿐이다.
  //    ⇒ `flex` 는 아래 «소스 모양» 절에서 **글자로** 잰다(감사 지적 A3 — 한쪽만 되돌리는 사보타주).
  const capOf = (el) => { const m = (el && el.style && el.style.maxHeight || '').match(/\*\s*([\d.]+)\)/); return m ? Number(m[1]) : null; };
  const flexN = capOf;
  const hasHoldRows = (hold) => !!hold && hold.querySelectorAll('.cpv2-tier-row').length > 0;
  let spDeck = 0, spHold = 0;
  let withHold = 0, deckOnly = 0, midOk = 0, midBad = [], topOk = 0, topBad = [];
  for (const box of boxes) {
    for (const sec of box.querySelectorAll('.cpv2-bay-content')) {
      const deck = sec.querySelector(':scope > .cpv2-deck-area');
      const hold = sec.querySelector(':scope > .cpv2-hold-area');
      if (!deck) continue;
      //  ⚠ 데크 전용 베이는 **홀드 영역 자체가 안 그려진다**(실측 MAMP 41·42·43·45·46·47).
      //    «홀드 칸이 0개» 로 가리면 그 베이를 통째로 건너뛰어 문지기가 헛통과한다(첫 판이 그랬다).
      const hasHold = hasHoldRows(hold);
      const jc = sec.style.justifyContent || '';
      const dn = flexN(deck), hn = flexN(hold);
      //  몫이 **실제 단 수만큼** 되는가 — `maxSide` 를 1 로 눌러 그림을 뭉개는 사보타주를 막는다(A6).
      const rows = deck.querySelectorAll('.cpv2-tier-row').length + (hold ? hold.querySelectorAll('.cpv2-tier-row').length : 0);
      if (dn != null && rows > 0 && dn < 2) midBad.push(`몫이 ${dn} — 단이 ${rows}개인데 너무 작다`);
      //  ⚠ 여백칸은 **그린 DOM 에서** 센다 — 글자로만 보면 `false &&` 한 마디로 꺼도 통과한다(감사 실측 A5′·N5).
      //    상자 안 여백칸 총수는 전 상자에서 같아야 한다(단 수가 몫보다 적은 베이에만 붙되, 그 수가 배마다 정해져 있다).
      spDeck += sec.querySelectorAll(':scope > .cpv2-deck-area .cpv2-tier-spacer').length;
      spHold += sec.querySelectorAll(':scope > .cpv2-hold-area .cpv2-tier-spacer').length;
      //  ⛔ **말단 여백칸은 어디에도 없어야 한다** — 그것이 남는 세로를 다 먹어 윗줄을 갈랐다(감사 실측 부①).
      if (sec.querySelector(':scope > .cpv2-tier-spacer')) topBad.push('구역 끝에 여백칸이 붙어 남는 자리를 다 먹는다');

      if (hasHold) {
        withHold++;
        if (dn != null && hn != null && dn === hn) midOk++; else midBad.push(`데크 ${dn} : 홀드 ${hn}`);
        if (jc !== 'center') topBad.push(`해치 베이인데 ${jc || '(비었음)'}`);
      } else {
        //  ★ 검수사 확답 2026-09-09 «윗줄을 맞춘다» — 데크 전용 베이도 **빈 홀드 자리**를 같이 잡아
        //    총 높이가 해치 베이와 같아야 한다. 그래야 옆 상자와 로우 표기 윗줄이 한 줄에 선다(3.7-03).
        deckOnly++;
        if (jc !== 'center') topBad.push(`데크 전용인데 ${jc || '(비었음)'}`);
        if (!hold) topBad.push('데크 전용에 빈 홀드 자리가 없다 — 윗줄이 옆 상자와 갈린다');
        else if (dn !== hn) topBad.push(`데크 전용 총 높이가 다르다(데크 ${dn} : 빈 홀드 ${hn})`);
      }
    }
  }
  console.log(`\n  ■ 해치 있는 구역 ${withHold} · 데크 전용 구역 ${deckOnly}`);
  ok(withHold > 0, `해치가 있는 구역이 있다 (${withHold}곳)`);
  //  ⚠ 데크 전용 베이가 하나도 없는 픽스처면 «카스피에 준한다» 문지기가 헛통과한다.
  //    MAMP(가장 큰 배 36베이)만 그 베이를 갖는다 — 41·42·43·45·46·47.
  if (SHIP === 'MAMP') ok(deckOnly > 0, `데크 전용 베이를 실제로 그렸다 (${deckOnly}곳) — 이 문지기가 헛통과하지 않는다`);
  ok(midBad.length === 0, `해치 베이는 데크·홀드 몫이 같다 = 해치선이 한가운데 (어긴 ${midBad.length}곳)` + (midBad.length ? ' | ' + midBad.slice(0, 3).join(' · ') : ''));
  //  ⚠ 여백칸은 **데크·홀드를 갈라** 센다 — 합으로 보면 한쪽만 꺼도 통과한다(감사 실측 N5).
  //    실측 — ATPR 데크 8·홀드 11 · MCSC 데크 17·홀드 20 · MAMP 데크 6·홀드 0(MAMP 는 maxDeck==maxHold 라 홀드가 안 모자란다).
  ok(spDeck > 0, `데크 여백칸이 그림에 실재한다 (${spDeck}개)`);
  if (SHIP !== 'MAMP') ok(spHold > 0, `홀드 여백칸이 그림에 실재한다 (${spHold}개)`);
  ok(topBad.length === 0, `남는 자리를 위·아래로 나누고, 데크 전용 베이도 같은 총 높이로 윗줄을 맞춘다 (어긴 ${topBad.length}곳)` + (topBad.length ? ' | ' + topBad.slice(0, 3).join(' · ') : ''));

  //  ⚠ 이 검사가 «데크 전용이 하나도 없어서» 조용히 통과하면 안 된다.
  //    ATPR·MCSC 둘 중 하나에는 반드시 있어야 한다(둘 다 없으면 픽스처가 이 사건을 못 담은 것이다).
  console.log(`\n  ■ 소스 모양`);
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/PrintableCargoPlanV2.jsx'), 'utf8');
  ok(/maxSide = Math\.max\(Math\.max\(maxDeck, 1\), Math\.max\(maxHold, 1\)\)/.test(SRC), 'globalHatch 가 maxSide(같은 몫)를 낸다');
  const usesSide = (SRC.match(/globalHatch\.maxSide/g) || []).length;
  ok(usesSide >= 4, `데크·홀드 영역과 두 여백칸이 모두 maxSide 를 쓴다 (${usesSide}곳)`);
  ok(/justifyContent: 'center'/.test(SRC), '남는 자리를 위·아래로 나눈다는 것이 코드에 있다');
  ok(/nHold === 0 && globalHatch && \(/.test(SRC), '데크 전용 베이에 빈 홀드 자리를 잡는다는 것이 코드에 있다');
  //  ⚠ `flex` 는 그림에서 못 재므로(위) **글자로** 잰다 — 데크·홀드 영역의 `flex` 와 `maxHeight` 가 둘 다 maxSide 여야 한다.
  for (const [who, re] of [['데크 영역', /className="cpv2-deck-area" style=\{\{ flex: `\$\{globalHatch \? globalHatch\.maxSide[\s\S]{0,400}?maxHeight: `calc\(var\(--cph, 999px\) \* \$\{globalHatch \? globalHatch\.maxSide/],
                           ['홀드 영역', /className="cpv2-hold-area" style=\{\{ flex: `\$\{globalHatch \? globalHatch\.maxSide[\s\S]{0,200}?maxHeight: `calc\(var\(--cph, 999px\) \* \$\{globalHatch \? globalHatch\.maxSide/],
                           ['빈 홀드 자리', /flex: `\$\{globalHatch\.maxSide\} 1 0`, maxHeight: `calc\(var\(--cph, 999px\) \* \$\{globalHatch\.maxSide\}\)`/]]) {
    ok(re.test(SRC), `${who} 의 flex 와 높이 상한이 둘 다 maxSide 다 — 한쪽만 되돌리면 해치가 밀린다`);
  }
  //  ⚠ 단 수가 몫보다 적은 베이는 **여백칸**으로 채워야 해치선이 한 줄에 선다(V7.58). 그림에서는 못 잰다 —
  //    `.cpv2-tier-row` 는 격자 안쪽까지 세어져 «단 수»가 아니다(실측 데크 8 vs 몫 5). 그래서 글자로 잰다.
  for (const [who, re] of [['데크 여백칸', /globalHatch && globalHatch\.maxSide > deckTiers\.length && \(\s*\n\s*<div className="cpv2-tier-spacer" style=\{\{ flex: `\$\{globalHatch\.maxSide - deckTiers\.length\}/],
                           ['홀드 여백칸', /globalHatch && globalHatch\.maxSide > holdTiers\.length && \(\s*\n\s*<div className="cpv2-tier-spacer" style=\{\{ flex: `\$\{globalHatch\.maxSide - holdTiers\.length\}/]]) {
    ok(re.test(SRC), `${who} 이 몫과 단 수의 차이만큼 남아 있다 — 없애면 해치선이 밀린다`);
  }
  //  종전 값이 남아 있으면 한 곳만 고친 것이다
  //  ⚠ **한 곳도 남으면 안 된다.** 처음엔 «정의부 1곳 허용» 으로 뒀다가, 그리는 자리를 옛 maxDeck 으로
  //    되돌리는 사보타주를 놓쳤다(MAMP 는 maxDeck==maxHold==6 이라 그림으로도 안 갈린다 — 실측).
  //    정의부는 `maxDeck:` 꼴이라 `globalHatch.maxDeck` 로는 안 잡힌다.
  const leftDeck = (SRC.match(/globalHatch\.maxDeck\b/g) || []).length;
  const leftHold = (SRC.match(/globalHatch\.maxHold\b/g) || []).length;
  ok(leftDeck === 0 && leftHold === 0, `옛 몫(maxDeck·maxHold)을 그리는 자리에서 한 곳도 안 쓴다 (maxDeck ${leftDeck}곳 · maxHold ${leftHold}곳)`);


  //  ⚠ 3.39-01 — **데크 감싸개도 홀드 감싸개처럼 제 단수를 무조건 받아야 한다.**
  //    검수사 2026-09-09 *«38번은 4단인데 옆베이 3단 보다도 낮아 보입니다»*. 종전 조건이
  //    `nHold > 0 && globalHatch` 라 **데크 전용 베이만** CSS 기본 `flex: 1` 로 떨어졌고,
  //    옆에 선 여백칸(`flex: maxSide - 단수`)이 줄들의 몫을 가져가 줄이 눌렸다.
  //    ⚠ jsdom 은 `flex` 단축 속성을 통째로 버려 DOM 으로는 못 잰다 — **글자로** 잰다.
  {
    const CPV = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/PrintableCargoPlanV2.jsx'), 'utf8');
    const deckWrap = /<div className="cpv2-grid-row-wrap" style=\{\{ flex: `\$\{Math\.max\(deckTiers\.length, 1\)\} 1 0` \}\}>/.test(CPV);
    ok(deckWrap, '데크 줄 감싸개가 제 단수를 **무조건** 받는다(홀드 쪽과 짝이 맞는다)');
    ok(!/cpv2-grid-row-wrap" style=\{nHold > 0/.test(CPV),
       '«홀드가 있을 때만» 이라는 옛 문지기가 안 남았다 — 데크 전용 베이가 눌리던 그 자리');
    const holdWrap = /flex: `\$\{Math\.max\(holdTiers\.length, 1\)\} 1 0` \}/.test(CPV);
    ok(holdWrap, '홀드 줄 감싸개도 그대로 제 단수를 받는다(이 판이 안 건드렸다)');
  }

  console.log(fail ? `\n⛔ 해치 한가운데 검사 실패 ${fail}건` : `\n✅ 해치커버가 세로 한가운데 — ${pass}항 통과`);
  process.exit(fail ? 1 : 0);
}, 600);
