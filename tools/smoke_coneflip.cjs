// 콘앱 카고플랜 — 줄을 통째로 거울에 비춰 «낮은 베이부터 높은 베이로» 서는가(3.33).
//   검수사 확정 2026-09-08 «콘앱은 검수 카고플랜을 뒤집은 형태» · «거울에 비친것 처럼» ·
//   «우측으로» · «낮은베이부터 높은베이로».
//   ⚠ 소스 문자열이 아니라 **실제로 그린 DOM 의 칸 차례**를 읽어 잰다.
//   ⚠ 베이 상자만 세면 안 된다 — 별첨·빈 칸도 그 줄의 한 칸이다. 상자만 뒤집으면 별첨이
//     아랫줄 왼쪽에 남아 배가 들여쓰기 되는데, 상자만 세는 검사는 그것을 못 본다(감사 지적).
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const bundle = fs.readFileSync(process.argv[2], 'utf8');
const ROOT = process.argv[3] || path.resolve(__dirname, '..');
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('콘앱 카고플랜 — 줄 거울 반전 (3.33)');

//  flip 은 false(검수앱) · true(콘앱) · 'omit'(prop 을 안 넘긴다 = 기본값을 잰다).
function render(ship, mode, flip) {
  return new Promise((res) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
      { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const errs = []; dom.window.addEventListener('error', (e) => errs.push(e.message));
    dom.window.__SMOKE_WHICH = 'v2'; dom.window.__SMOKE_SHIP = ship; dom.window.__SMOKE_MODE = mode;
    dom.window.__SMOKE_FLIP = flip;
    try { dom.window.eval(bundle); } catch (e) { errs.push('THROW: ' + e.message); }
    setTimeout(() => res({ d: dom.window.document, errs, tag: `${ship} ${mode === 'loading' ? '선적' : '양하'}` }), 4000);
  });
}

//  한 줄(cpv2-page-rows 의 자식)마다 **칸** 차례를 읽는다 — 베이 상자·별첨 상자·빈 칸 전부.
//  ⚠ 베이 제목을 낱개로 세면 안 된다 — 한 상자(trio)가 제목 둘(«13» 위 · «(14)15» 아래)을 낸다.
//    뒤집는 것은 **칸** 차례이고 칸 안 위·아래는 그대로다.
const slotsOf = (d) => [...d.querySelectorAll('.cpv2-page-rows > *')]
  .map((r) => [...r.children].map((b) => {
    const cl = b.className || '';
    if (/cpv2-legend-box/.test(cl)) {
      const n = [...b.querySelectorAll('.cpv2-legend-title')]
        .map((e) => (e.textContent.match(/별첨(\d)/) || [])[1]).filter(Boolean);
      return '별첨' + (n.join('+') || '?');
    }
    if (/cpv2-empty-slot/.test(cl)) return '빈칸';
    return [...b.querySelectorAll('.cpv2-bay-title')].map((e) => e.textContent.replace(/^BAY\s*/, '').trim()).join(' ');
  }).filter((t) => t));
const isBay = (t) => /\d/.test(t) && !/^별첨/.test(t) && t !== '빈칸';

(async () => {
  //  ATPR(선적·양하) · MCSC(선적·양하) 넷을 나란히 그린다 — 한 배 한 모드만 보면 우연을 못 가린다.
  const CASES = [['ATPR', 'loading'], ['ATPR', 'discharge'], ['MCSC', 'loading'], ['MCSC', 'discharge']];
  const jobs = [];
  for (const [s, m] of CASES) { jobs.push(render(s, m, false)); jobs.push(render(s, m, true)); }
  jobs.push(render('ATPR', 'loading', 'omit'));   // 기본값을 실렌더로 잰다
  const R = await Promise.all(jobs);
  const OMIT = R.pop();
  ok(R.every((r) => r.errs.length === 0) && OMIT.errs.length === 0,
    `아홉 번 그리는 동안 오류 0 — ${CASES.map((c) => c[0] + (c[1] === 'loading' ? '선적' : '양하')).join(' · ')} × 검수앱/콘앱 + 기본값`);

  let legChecked = 0;
  for (let k = 0; k < CASES.length; k++) {
    const A = R[k * 2]; const B = R[k * 2 + 1];
    const tag = A.tag;
    const now = slotsOf(A.d).filter((r) => r.length);
    const con = slotsOf(B.d).filter((r) => r.length);
    ok(now.length > 0 && con.length === now.length,
      `${tag} — 줄 수가 같다(${now.length}줄 · ${now.map((r) => r.length).join('/')}칸) — 줄을 새로 나누지 않는다`);

    //  ① 줄 하나가 통째로 뒤집혔는가 — 별첨·빈 칸까지 함께
    let flipped = 0;
    for (let i = 0; i < now.length; i++) {
      if (JSON.stringify([...now[i]].reverse()) === JSON.stringify(con[i])) flipped += 1;
      else ok(false, `${tag} ${i + 1}째 줄이 통째로 안 뒤집혔다 — 검수앱 [${now[i]}] · 콘앱 [${con[i]}]`);
    }
    ok(flipped === now.length, `${tag} — ${now.length}줄 전부 줄 통째로 뒤집혔다(거울)`);

    //  ② 별첨·빈 칸이 «읽기가 끝나는 쪽»에 있는가
    //    검수앱은 오른쪽에서 왼쪽으로 읽으니 왼쪽 끝, 콘앱은 반대이니 오른쪽 끝이다.
    //    ⛔ 상자만 뒤집던 판은 별첨이 콘앱에서도 왼쪽에 남아 아랫줄 배가 1~2칸 들여쓰기 됐다.
    for (let i = 0; i < now.length; i++) {
      if (!now[i].some((t) => /^별첨/.test(t))) continue;
      legChecked += 1;
      const nL = now[i].findIndex((t) => /^별첨/.test(t));
      const nR = con[i].findIndex((t) => /^별첨/.test(t));
      ok(nL === 0, `${tag} — 검수앱은 별첨이 그 줄 맨 앞이다(${nL}번째) — 종전 그대로`);
      ok(nR === con[i].length - 1, `${tag} — 콘앱은 별첨이 그 줄 맨 뒤로 간다(${nR + 1}/${con[i].length}) — 배 그림이 왼쪽 끝에서 시작한다`);
      const pn = now[i].indexOf('빈칸'); const pc = con[i].indexOf('빈칸');
      if (pn >= 0) ok(pc === con[i].length - 2, `${tag} — 빈 칸도 따라간다(검수앱 ${pn}번째 → 콘앱 ${pc}번째)`);
      ok(isBay(con[i][0]), `${tag} — 콘앱 아랫줄 첫 칸이 배다(${con[i][0]}) — 별첨·빈 칸이 앞을 막지 않는다`);
    }

    //  ③ 낮은 베이부터 높은 베이로 — 베이 칸만 골라 본다
    const num = (t) => { const m = String(t).match(/\d+/); return m ? parseInt(m[0], 10) : NaN; };
    for (let i = 0; i < con.length; i++) {
      const cb = con[i].filter(isBay); const nb = now[i].filter(isBay);
      if (cb.length < 2) continue;
      ok(num(cb[0]) < num(cb[cb.length - 1]),
        `${tag} ${i + 1}째 줄이 낮은 베이(${cb[0]})부터 높은 베이(${cb[cb.length - 1]})로 간다`);
      ok(num(nb[0]) > num(nb[nb.length - 1]),
        `${tag} ${i + 1}째 줄의 검수앱은 종전대로 «큰 번호 좌측»이다(${nb[0]} → ${nb[nb.length - 1]})`);
    }

    //  ④ 같은 것들이 그대로다 — 뒤집기가 칸을 더하거나 빼지 않는다
    const flat = (rs) => rs.flat().slice().sort().join(',');
    ok(flat(now) === flat(con), `${tag} — 뒤집어도 칸 목록이 한 칸도 안 늘고 안 준다(별첨·빈 칸 포함)`);

    //  ⑤ 안 건드리는 축 — 칸(열) 좌우·한 칸 안 위아래
    //  ⚠ 문서 차례로 견주면 안 된다 — 상자가 자리를 바꿨으니 라벨도 따라 움직인다.
    //    **그 베이의** 라벨끼리 견준다(베이 제목으로 짝지어).
    const labOf = (d) => {
      const m = {};
      for (const b of d.querySelectorAll('.cpv2-bay-box')) {
        const t = [...b.querySelectorAll('.cpv2-bay-title')].map((e) => e.textContent.trim()).join(' ');
        if (!t) continue;
        m[t] = [...b.querySelectorAll('.cpv2-row-labels')].map((e) => e.textContent.trim()).join(' / ');
      }
      return m;
    };
    const la = labOf(A.d); const lb = labOf(B.d);
    const keys = Object.keys(la);
    ok(keys.length > 0 && keys.every((k) => la[k] === lb[k]),
      `${tag} — 칸(열) 좌우는 그대로다(베이 ${keys.length}개의 열 라벨이 한 글자도 안 바뀐다)`);
    const trio = (d) => [...d.querySelectorAll('.cpv2-trio-box')]
      .map((e) => [...e.querySelectorAll('.cpv2-bay-title')].map((x) => x.textContent.trim()).join('|'));
    ok(JSON.stringify(trio(A.d).slice().sort()) === JSON.stringify(trio(B.d).slice().sort()),
      `${tag} — 한 칸 안 위·아래 차례도 그대로다(17 위 · (18)19 아래)`);
    //  상자 **안**이 통째로 같은가 — 뒤집기는 자리만 바꾸고 내용은 못 건드린다.
    const boxHTML = (d) => [...d.querySelectorAll('.cpv2-bay-box')].map((e) => e.outerHTML).sort().join(' ');
    ok(boxHTML(A.d) === boxHTML(B.d), `${tag} — 칸 안 그림이 바이트까지 같다(자리만 바뀐다)`);
  }
  ok(legChecked >= 4, `별첨 자리를 네 경우 모두에서 쟀다(${legChecked}줄) — 한 배만 보면 우연을 못 가린다`);

  //  ⑥ 기본값 — prop 을 아예 안 넘긴 그림이 검수앱과 **바이트까지** 같다
  //  ⛔ 하네스가 늘 flipBays 를 명시하면 기본값이 뒤집혀도 검사가 못 본다(감사 지적). 그래서 안 넘겨 본다.
  ok(OMIT.d.body.innerHTML === R[0].d.body.innerHTML,
    `flipBays 를 아예 안 넘기면 검수앱 그림과 한 글자도 다르지 않다(${OMIT.d.body.innerHTML.length}자)`);
  ok(OMIT.d.body.innerHTML !== R[1].d.body.innerHTML, '그 기본값 그림은 콘앱 그림과는 다르다 — 항등식이 아니다');

  //  ⑦ 배선 — 콘앱만 켜고 검수앱 다섯 곳은 하나도 안 켠다
  const entry = fs.readFileSync(path.join(ROOT, 'src/coneCargoPlan.entry.jsx'), 'utf8');
  ok(/<PrintableCargoPlanV2 flipBays /.test(entry), '콘앱 진입점이 flipBays 를 켠다');
  const comp = fs.readFileSync(path.join(ROOT, 'src/components/PrintableCargoPlanV2.jsx'), 'utf8');
  ok(/flipBays = false,/.test(comp), '기본값이 꺼져 있다 — 검수앱은 한 픽셀도 안 바뀐다');
  //  검수앱 호출부 **전수** — 하나만 보면 나머지 넷이 켜져도 통과한다(감사 지적).
  for (const f of ['src/components/PrintHubModal.jsx', 'src/components/BayPlan.jsx',
    'src/components/LoadingPlanEdit.jsx', 'src/pages/VoyagePage.jsx', 'src/planedit.entry.jsx']) {
    ok(!/flipBays/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), `${f} 가 그 문을 안 켠다`);
  }
  //  ⑧ 뒤집는 자리가 **줄 전체**인가 — 상자만 뒤집던 옛 줄이 남아 있으면 안 된다
  ok(/\{flipBays \? \[\.\.\.slots\]\.reverse\(\) : slots\}/.test(comp),
    '줄 전체(slots)를 뒤집는다 — 별첨·빈 칸이 같이 간다');
  ok(!/\[\.\.\.row\]\.reverse\(\)/.test(comp),
    '⛔ 베이 상자만 뒤집던 옛 줄이 없다 — 그 판은 별첨이 왼쪽에 남아 거울이 아니었다');

  console.log(fail ? `✗ ${fail}항 실패` : '✓ 전부 통과');
  process.exit(fail ? 1 : 0);
})();
