// 4.05 연막검사 — 수석 실시간 보드(앱 입력이 멈추면 터미널 본선 현황 표)와 홈 배 줄·상세(4.25 — 종전 항차 목록 카드 · 터미널 작업중 · 본선 숫자)를 실데이터로 실제 그려 본다. 실패하면 빌드를 세운다.
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
  //  기대 문구 — 보관소(또는 동방 화면 캡처) 숫자에서 직접 만든다. 4.25(설계 ⑥ «같은 숫자는 한 번»): 홈 상세 칸 아래 «본선 d/(d+r)» 한 자리 · 잔여·% 는 그 자리 제목
  const tbar = (d, r) => `본선 ${d}/${d + r}`;
  const tpct = (d, r) => `${d + r > 0 ? Math.min(100, Math.round((d / (d + r)) * 100)) : 0}%`;
  const terms = (id) => [...scn(id).querySelectorAll('[data-term]')].map((n) => ({ v: n.getAttribute('data-term'), t: n.textContent.replace(/\s+/g, ''), title: n.getAttribute('title') || '' }));

  const sShot = { total: 74 + 236, dd: 29 + 119, ld: 3 + 72, dr: 0, lr: 42 + 45 };

  console.log('4.05 수석 보드 — 앱 입력이 멈춘 배는 터미널 본선 현황 표');
  ok(!!scn('G') && /OBWH/.test(T('G')), 'G 카드가 떴다(OBWH 2757E 실데이터)', T('G').slice(0, 80));
  const g = scn('G') && scn('G').querySelector('.tbx');
  const gRows = g ? [...g.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => c.textContent.trim()).join('|')) : [];
  ok(!!g && /동방 15번선석/.test(g.textContent), 'G: 터미널 본선 현황 표가 섰다(동방 15번선석) — 앱 완료 2건이 3시간 넘게 멈춘 배', T('G').slice(0, 200));
  ok(gRows.includes(`합계|${sObw.total}|${sObw.dd}|${sObw.ld}|${sObw.dr}|${sObw.lr}`), `G: 합계 줄이 터미널 값 그대로(${sObw.total}|${sObw.dd}|${sObw.ld}|${sObw.dr}|${sObw.lr})`, JSON.stringify(gRows));
  ok(/앱 입력 마지막 \d+시간 전/.test(T('G')), 'G: 머리에 «앱 입력 마지막 N시간 전 — 멈춘 동안은 터미널 표를 보입니다» 가 있다', T('G').slice(0, 200));
  ok(!/지금 작업 중인 베이/.test(T('G')) && !/베이 0?2 양하/.test(T('G')), 'G: 옛 «지금 작업 중인 베이» 그림은 치워졌다');
  //  4.22-03 감사(중 1) — 갈래를 원자료로 한 갈래로 못 박는다(3.38 «전부 아니면 전무»). 일한 호기 = 보관소 qcWork 대수 > 0 인 호기 ·
  //    자리를 아는 호기 = 앱 완료(호기 찍힘)의 실적·맞교환·EDI 자리가 있는 호기 + 접속 검수원의 호기. 일한 호기가 전부 자리를 알면 «호기별 작업 베이», 하나라도 모르면 «지금 작업 중인 베이».
  const qcNos = Object.values(F.info.qcWork).filter((q) => (q.disDone || 0) + (q.lodDone || 0) > 0).map((q) => parseInt(String(q.qc).slice(-1), 10));
  const posNos = new Set(Object.entries(F.discharge.completed).filter(([cn]) => { const r = F.discharge.records[cn] || {}, e = F.discharge.ediContainers[cn] || {}; return r.bay_actual || r.bay_assign || e.bay; }).map(([, r]) => parseInt(String(r.equip || ''), 10)).filter((n) => n > 0));
  const branch = (live) => (qcNos.every((n) => posNos.has(n) || live.includes(n)) ? '호기별 작업 베이' : '지금 작업 중인 베이');
  const other = (b) => (b === '호기별 작업 베이' ? '지금 작업 중인 베이' : '호기별 작업 베이');
  const bH = branch([1]), bI = branch([]);   // H 는 1호기 접속 검수원(베이 2) · I 는 접속 검수원 없음
  const h = scn('H');
  ok(!!h && !h.querySelector('.tbx') && T('H').includes(bH) && !T('H').includes(other(bH)), `H(같은 자료 + 접속 검수원 있음): 표가 안 서고 «${bH}» 그림 칸 한 갈래(일한 호기 ${qcNos.join('·')} · 자리 아는 호기 ${[...new Set([...posNos, 1])].join('·')})`, T('H').slice(0, 200));
  const i = scn('I');
  ok(!!i && !i.querySelector('.tbx') && T('I').includes(bI) && !T('I').includes(other(bI)), `I(같은 자료, 마지막 앱 완료 5분 전): 표가 안 서고 «${bI}» 그림 칸 한 갈래(일한 호기 ${qcNos.join('·')} · 자리 아는 호기 ${[...posNos].join('·')})`, T('I').slice(0, 200));

  //  감사(4.05): 호기를 안 고르고 누른 완료도 «앱 입력»이다 — 마지막 입력이 5분 전이면 그림 유지(옛 호기 완료가 3시간 전이어도)
  //  P: 터미널 실적 1·2호기(둘 다 자리) + 3호기를 찍은 완료 1건(그 컨은 터미널이 2호기로 셌다 → 3호기 대수 0) — 일한 호기는 1·2호기뿐, 전부 자리를 안다 → «호기별 작업 베이»
  ok(!!scn('P') && T('P').includes('호기별 작업 베이') && !T('P').includes('지금 작업 중인 베이'), 'P(대수 0 으로만 선 3호기 줄): 일한 호기 1·2호기가 전부 자리를 알아 «호기별 작업 베이» 그대로 — 묶음으로 안 바뀐다', T('P').slice(0, 200));
  const m = scn('M');
  ok(!!m && !m.querySelector('.tbx') && !/앱 입력 마지막/.test(T('M')), 'M(1호기 완료 3시간 전 + 호기 안 고른 완료 5분 전): 멈춤이 아니다 — 표도 «앱 입력 마지막» 도 없다', T('M').slice(0, 200));
  const b29 = scn('B29'), b31 = scn('B31');
  ok(!!b29 && !b29.querySelector('.tbx') && !/앱 입력 마지막/.test(T('B29')), '경계 29분 전: 그림 유지', T('B29').slice(0, 160));
  ok(!!b31 && !!b31.querySelector('.tbx') && /앱 입력 마지막 3\d분 전/.test(T('B31')), '경계 31분 전: 터미널 표 · «앱 입력 마지막 31분 전»', T('B31').slice(0, 200));

  console.log('4.05 홈(4.25 배 줄 + 상세) — 터미널 작업중 · 본선 집계');
  const R = T('R');
  ok(/본선 작업중/.test(R) && !/대기 중/.test(R) && /본선 작업중/.test(scn('R').querySelector('[data-row-status]').textContent), 'R(RZOR R109E · 접속 검수원 없음): 줄·상세 모두 «대기 중» 이 아니라 «본선 작업중»', R.slice(0, 160));
  { const tr = terms('R');
    ok(tr.length === 2 && tr[0].v === `${sRz.dd}/${sRz.dd + sRz.dr}` && tr[0].t.startsWith(tbar(sRz.dd, sRz.dr).replace(/\s+/g, '')) && tr[1].v === `${sRz.ld}/${sRz.ld + sRz.lr}`, `R: 양하 «${tbar(sRz.dd, sRz.dr)}» · 선적 «${tbar(sRz.ld, sRz.lr)}» — 상세 칸 아래 한 자리(보관소 호기 합계)`, JSON.stringify(tr)); }
  { //  앱 자신의 완료(검수사가 누른 것)는 그대로 0 — 터미널 집계가 앱 완료로 섞이지 않는다(줄 막대 · 상세 큰 숫자 둘 다)
    const box = scn('R').querySelector('[data-side-box="discharge"]'), bar = scn('R').querySelector('[data-row-bar="discharge"]');
    ok(box && bar && box.getAttribute('data-done') === '0' && bar.getAttribute('data-done') === '0' && box.getAttribute('data-total') === bar.getAttribute('data-total') && Number(box.getAttribute('data-total')) > 0, 'R: 앱 자신의 완료(검수사가 누른 것)는 줄·상세 모두 0 — 터미널 집계가 앱 완료로 섞이지 않는다', box && box.textContent.slice(0, 200)); }
  ok(terms('R').every((x) => new RegExp(`잔여 (${sRz.dr}|${sRz.lr})`).test(x.title)), 'R: 본선 자리 제목에 터미널 잔여가 붙는다(종전 오른쪽 «본선 잔여» 를 한 자리로)', JSON.stringify(terms('R').map((x) => x.title.slice(0, 60))));
  const S = T('S');
  { const ts = terms('S');
    ok(ts.length === 2 && ts[0].t.startsWith(tbar(sShot.dd, sShot.dr).replace(/\s+/g, '')) && ts[1].t.startsWith(tbar(sShot.ld, sShot.lr).replace(/\s+/g, '')), `S(동방 화면 15:10:42 캡처 그대로): 양하 148·0 → «${tbar(sShot.dd, sShot.dr)}» · 선적 75·87 → «${tbar(sShot.ld, sShot.lr)}» — 터미널 화면과 같은 숫자`, S.slice(0, 600));
    ok(ts.length === 2 && ts[0].title.includes(`(${tpct(sShot.dd, sShot.dr)})`) && ts[1].title.includes(`(${tpct(sShot.ld, sShot.lr)})`) && ts[0].title.includes(`잔여 ${sShot.dr}`) && ts[1].title.includes(`잔여 ${sShot.lr}`), `S: 본선 자리가 양하·선적 둘 서고 제목의 완료율·잔여가 터미널 화면 그대로(${tpct(sShot.dd, sShot.dr)} · ${tpct(sShot.ld, sShot.lr)} · 잔여 ${sShot.dr}·${sShot.lr})`, JSON.stringify(ts.map((x) => x.title.slice(0, 80)))); }
  //  폰은 줄을 누르면 같은 상세(ShipDetail)가 전체 화면으로 뜬다 — 종전 «폰 접힌 줄의 본선 d/전체» 자리는 줄 상태 «본선 작업중» + 시트의 같은 본선 자리
  ok(/본선 작업중/.test(scn('S').querySelector('[data-row-status]').textContent), 'S: 폰·컴 줄 오른쪽에 «본선 작업중»(접속 검수원 없음)', scn('S').querySelector('[data-row-status]').textContent);
  { const bD = scn('S').querySelector('[data-row-bar="discharge"]'), xD = scn('S').querySelector('[data-side-box="discharge"]'), bL = scn('S').querySelector('[data-row-bar="loading"]'), xL = scn('S').querySelector('[data-side-box="loading"]');
    ok(bD && xD && bL && xL && bD.getAttribute('data-done') === xD.getAttribute('data-done') && bD.getAttribute('data-total') === xD.getAttribute('data-total') && bL.getAttribute('data-total') === xL.getAttribute('data-total'), 'S: 줄 작은 막대와 상세 큰 숫자가 같은 앱 완료/전체(본선 숫자와 따로)'); }
  const W = T('W');
  ok(/대기 중/.test(W) && !/본선 작업중/.test(W) && !/본선 작업현황/.test(W) && !scn('W').querySelector('[data-term]'), 'W(터미널이 아직 계획 단계): «대기 중» 그대로 · 본선 숫자 없음', W.slice(0, 200));
  const RA = T('RA');
  ok(/이인철 작업중/.test(RA) && !/본선 작업중/.test(RA), 'RA(접속 검수원 있음): 종전처럼 «이인철 작업중» · 본선 표시는 안 낀다', RA.slice(0, 160));
  ok(terms('RA').length === 2, 'RA(접속 검수원 있음): 본선 숫자는 검수원이 있어도 참고로 선다');
  const V = T('V');
  ok(/본선 작업중/.test(V) && !/대기 중/.test(V) && !scn('V').querySelector('[data-ship-acts]'), 'V(조회만 계정 · 접속 검수원 없음): 지움·완료 단추가 없어도 «본선 작업중» 이 보인다', V.slice(0, 160));
  console.log(fail ? `\n✗ ${fail}건 실패` : '\n✓ 4.05 작업 현황 표시 전부 통과');
  process.exit(fail ? 1 : 0);
})();
