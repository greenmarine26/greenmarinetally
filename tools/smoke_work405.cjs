// 4.05 연막검사 — 수석 실시간 보드(앱 입력이 멈추면 터미널 본선 현황 표)와 항차 목록 카드(터미널 작업중 · 본선 작업현황 막대)를 실데이터로 실제 그려 본다. 실패하면 빌드를 세운다.
//   검수사 2026-10-05 «앱 항차목록은 작업중인지도 모르는 화면입니다. 수석 대쉬보드 OBWH는 앱을 사용하다 멈췄으면 본선작업현황이라도 보여 줘야 하는데 몇시간째 멈춰있습니다»
//   기대값은 앱 코드가 아니라 보관소 실측(tools/fixtures/work405_realtime.json)과 동방 화면 캡처(15:10:42)에서 따로 계산한다.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'work405_realtime.json'), 'utf8'));
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await wait(800);
  const doc = dom.window.document;
  let fail = 0;
  const ok = (c, m, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || extra === undefined ? '' : '  → ' + extra)); if (!c) fail++; };
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('✗ 렌더 중 오류 ' + uniq.length + '건'); uniq.slice(0, 3).forEach((e) => console.log('   ' + e)); process.exit(1); }
  const scn = (id) => doc.querySelector(`[data-scn="${id}"]`);
  const T = (id) => (scn(id) ? scn(id).textContent : '');
  //  기대값 — 보관소 qcWork 를 앱 코드 없이 직접 합한다
  const sum = (qw) => Object.values(qw).reduce((a, q) => ({ total: a.total + q.total, dd: a.dd + q.disDone, ld: a.ld + q.lodDone, dr: a.dr + q.disRest, lr: a.lr + q.lodRest }), { total: 0, dd: 0, ld: 0, dr: 0, lr: 0 });
  const sObw = sum(F.info.qcWork), sRz = sum(F.rzorInfo.qcWork);
  //  기대 문구 — 보관소(또는 동방 화면 캡처) 숫자에서 직접 만든다: 「본선 작업현황 완료 d/(d+r) (p%)」 + 「잔여 r」
  const tbar = (d, r) => `본선 작업현황 완료 ${d}/${d + r} (${d + r > 0 ? Math.min(100, Math.round((d / (d + r)) * 100)) : 0}%)`;

  const sShot = { total: 74 + 236, dd: 29 + 119, ld: 3 + 72, dr: 0, lr: 42 + 45 };

  console.log('4.05 수석 보드 — 앱 입력이 멈춘 배는 터미널 본선 현황 표');
  ok(!!scn('G') && /OBWH/.test(T('G')), 'G 카드가 떴다(OBWH 2757E 실데이터)', T('G').slice(0, 80));
  const g = scn('G') && scn('G').querySelector('.tbx');
  const gRows = g ? [...g.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => c.textContent.trim()).join('|')) : [];
  ok(!!g && /동방 15번선석/.test(g.textContent), 'G: 터미널 본선 현황 표가 섰다(동방 15번선석) — 앱 완료 2건이 3시간 넘게 멈춘 배', T('G').slice(0, 200));
  ok(gRows.includes(`합계|${sObw.total}|${sObw.dd}|${sObw.ld}|${sObw.dr}|${sObw.lr}`), `G: 합계 줄이 터미널 값 그대로(${sObw.total}|${sObw.dd}|${sObw.ld}|${sObw.dr}|${sObw.lr})`, JSON.stringify(gRows));
  ok(/앱 입력 마지막 \d+시간 전/.test(T('G')), 'G: 머리에 «앱 입력 마지막 N시간 전 — 멈춘 동안은 터미널 표를 보입니다» 가 있다', T('G').slice(0, 200));
  ok(!/지금 작업 중인 베이/.test(T('G')) && !/베이 0?2 양하/.test(T('G')), 'G: 옛 «지금 작업 중인 베이» 그림은 치워졌다');
  const h = scn('H');
  ok(!!h && !h.querySelector('.tbx') && /지금 작업 중인 베이|호기별 작업 베이/.test(T('H')), 'H(같은 자료 + 접속 검수원 있음): 표가 안 서고 베이 그림 칸이 그대로다', T('H').slice(0, 200));
  const i = scn('I');
  ok(!!i && !i.querySelector('.tbx') && /지금 작업 중인 베이|호기별 작업 베이/.test(T('I')), 'I(같은 자료, 마지막 앱 완료 5분 전): 표가 안 서고 베이 그림 칸이 그대로다', T('I').slice(0, 200));

  //  감사(4.05): 호기를 안 고르고 누른 완료도 «앱 입력»이다 — 마지막 입력이 5분 전이면 그림 유지(옛 호기 완료가 3시간 전이어도)
  const m = scn('M');
  ok(!!m && !m.querySelector('.tbx') && !/앱 입력 마지막/.test(T('M')), 'M(1호기 완료 3시간 전 + 호기 안 고른 완료 5분 전): 멈춤이 아니다 — 표도 «앱 입력 마지막» 도 없다', T('M').slice(0, 200));
  const b29 = scn('B29'), b31 = scn('B31');
  ok(!!b29 && !b29.querySelector('.tbx') && !/앱 입력 마지막/.test(T('B29')), '경계 29분 전: 그림 유지', T('B29').slice(0, 160));
  ok(!!b31 && !!b31.querySelector('.tbx') && /앱 입력 마지막 3\d분 전/.test(T('B31')), '경계 31분 전: 터미널 표 · «앱 입력 마지막 31분 전»', T('B31').slice(0, 200));

  console.log('4.05 항차 목록 카드 — 터미널 작업중 · 본선 집계');
  const R = T('R');
  ok(/본선 작업중/.test(R) && !/대기 중/.test(R), 'R(RZOR R109E · 접속 검수원 없음): «대기 중» 이 아니라 «본선 작업중»', R.slice(0, 160));
  ok(R.includes(tbar(sRz.dd, sRz.dr)) && R.includes(tbar(sRz.ld, sRz.lr)), `R: 양하 «${tbar(sRz.dd, sRz.dr)}» · 선적 «${tbar(sRz.ld, sRz.lr)}» — 막대 한 줄(보관소 호기 합계)`, R.slice(0, 600));
  { const cl = scn('R').cloneNode(true); cl.querySelectorAll('[data-term-bar]').forEach((n) => n.remove()); const RA0 = cl.textContent;   // 본선 막대를 걷어 낸 «앱 자신의 줄» 만 본다
    ok(/완료 0\/\d+ \(0%\)/.test(RA0) && !new RegExp(`완료 ${sRz.dd}/`).test(RA0), 'R: 앱 자신의 완료(검수사가 누른 것)는 그대로 0 — 터미널 집계가 앱 완료로 섞이지 않는다', RA0.slice(0, 400)); }
  ok(new RegExp(`본선 잔여 ${sRz.dr}`).test(R) && new RegExp(`본선 잔여 ${sRz.lr}`).test(R), 'R: 오른쪽 «남음» 아래에 터미널 잔여가 작게 붙는다');
  const S = T('S');
  ok(S.includes(tbar(sShot.dd, sShot.dr)) && S.includes(tbar(sShot.ld, sShot.lr)), `S(동방 화면 15:10:42 캡처 그대로): 양하 148·0 → «${tbar(sShot.dd, sShot.dr)}» · 선적 75·87 → «${tbar(sShot.ld, sShot.lr)}» — 터미널 화면과 같은 숫자`, S.slice(0, 600));
  { const bars = [...scn('S').querySelectorAll('[data-term-bar]')]; const wd = bars.map((b) => { const f = b.querySelector('.bg-cyan-400'); return f ? f.style.width : ''; }); ok(bars.length === 2 && wd[0] === '100%' && wd[1] === `${Math.round(sShot.ld / (sShot.ld + sShot.lr) * 100)}%`, `S: 본선 막대가 양하·선적 둘 서고 폭이 완료율 그대로(${wd.join(' · ')})`); }
  const W = T('W');
  ok(/대기 중/.test(W) && !/본선 작업중/.test(W) && !/본선 작업현황/.test(W) && !scn('W').querySelector('[data-term-bar]'), 'W(터미널이 아직 계획 단계): «대기 중» 그대로 · 본선 막대 없음', W.slice(0, 200));
  const RA = T('RA');
  ok(/이인철 작업중/.test(RA) && !/본선 작업중/.test(RA), 'RA(접속 검수원 있음): 종전처럼 «이인철 작업중» · 본선 표시는 안 낀다', RA.slice(0, 160));
  { const rb = [...scn('S').querySelectorAll('[data-term-bar]')].map((b) => b.textContent);   // 막대 안에 «잔여 r» 가 있다(PC 오른쪽 «본선 잔여» 와 별개로)
    ok(rb.length === 2 && rb[0].includes(`잔여 ${sShot.dr}`) && rb[1].includes(`잔여 ${sShot.lr}`), `S: 막대 안에 «잔여 ${sShot.dr}» · «잔여 ${sShot.lr}» 가 있다`, rb.join(' | '));
    const fold = [...scn('S').querySelectorAll('.lg\\:hidden')].map((n) => n.textContent).join(' | ');   // 폰 접힌 줄
    const pc = (d, r) => `${Math.min(100, Math.round((d / (d + r)) * 100))}%`;
    ok(fold.includes(`본선 ${sShot.dd}/${sShot.dd + sShot.dr} (${pc(sShot.dd, sShot.dr)})`) && fold.includes(`본선 ${sShot.ld}/${sShot.ld + sShot.lr} (${pc(sShot.ld, sShot.lr)})`), 'S: 폰 접힌 줄에 «본선 d/전체 (p%)» 가 양하·선적 모두 있다', fold.slice(0, 300)); }
  ok(!!scn('RA').querySelector('[data-term-bar]'), 'RA(접속 검수원 있음): 본선 막대는 검수원이 있어도 참고로 선다');
  const V = T('V');
  ok(/본선 작업중/.test(V) && !/대기 중/.test(V), 'V(조회만 계정 · 접속 검수원 없음): 지움·완료 단추가 없어도 «본선 작업중» 이 보인다', V.slice(0, 160));

  console.log(fail ? `\n✗ ${fail}건 실패` : '\n✓ 4.05 작업 현황 표시 전부 통과');
  process.exit(fail ? 1 : 0);
})();
