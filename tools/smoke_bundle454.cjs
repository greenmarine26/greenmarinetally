// 4.54 연막검사 — 빈 FR 묶음(같은 칸의 빈 플랫랙 2대 이상 — 터미널은 1대로 센다) 설명 · «한 칸에 두 대» 에서 묶음 빼기 · 컨 대수는 낱개 그대로(282) · DB 쓰기 없음.
//   실행 — node tools/smoke_bundle454.cjs <repoRoot> <번들(smoke_bundle454.jsx)>. 실패하면 빌드를 세운다.
//   실자료 — ATPR 2647E 실 RTDB 읽기 사본(tools/fixtures/bundle454_atpr2647e.json — 2026-10-26 19:15 · 양하 282 · 터미널 배정 276 · 완료 71 · raw 뺌). 실 Firebase 쓰기 없음.
//   검수사 2026-10-26 19:14 «4개 한묶음 2개로 그래야 양쪽 갯수가 맞는거고 알림을 붉은색으로 보여줄 필요도 없는것입니다» · 19:17 «검수리스트는 182개가 맞는거고 동방은 176(+6)으로 표기하고 FR묶음 설명을 붙이면 됩니다»(282·276 의 오타로 읽음).
const fs = require('fs');
const root = process.argv[2] || process.cwd();
const bundle = process.argv[3];
(async () => {
  let bad = 0, n = 0;
  const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + String(d).slice(0, 500))); if (!c) bad++; };
  if (!bundle) { console.log('번들 경로가 없다'); process.exit(1); }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.global = dom.window;
  const errs = [];
  dom.window.addEventListener('error', (e) => errs.push(e.message));
  console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s) && !/act\(/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
  console.warn = () => {};
  dom.window.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
  dom.window.alert = (m) => errs.push('alert: ' + String(m).slice(0, 160));
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(300);
  const T = dom.window.__T, W = dom.window, doc = W.document;
  if (!T) { console.log('  FAIL 번들이 시험 함수를 못 내놓았다', errs.join(' | ')); process.exit(1); }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const VK = 'ATPR_2647E';
  const V0 = () => { const v = clone(T.FX); v.key = VK; return v; };
  const SRLU = ['SRLU1001029', 'SRLU1001203', 'SRLU1001498', 'SRLU1001672'];
  const SKHU = ['SKHU5541444', 'SKHU5640895', 'TRIU0821436', 'TRLU5040847'];
  const sa = (a) => [...a].sort().join(',');
  const alertsOf = (v, mode = 'discharge') => {
    const sec = v[mode];
    const al = T.runDiagnostics({ ediContainers: Object.values(sec.ediContainers || {}), listRecords: sec.records || {}, xrayList: sec.xrayList, mode, voyage: v, voyageKey: v.key });
    return Array.isArray(al) ? al : (al.alerts || []);
  };
  const srOf = (v) => alertsOf(v).find((a) => a.code === 'source_recon');

  console.log('① 실자료 묶음 판정 — ATPR 2647E 양하(앱 282 · 터미널 배정 276)');
  const V = V0();
  const rows = T.ptkContainers(V, 'discharge');
  const B = T.frBundlesOf(V, 'discharge');
  ok(rows.length === 282 && T.ptkDischargeUnitsOf(V).set.size === 282 && T.progressOf(V.discharge, 'discharge', T.shiftCnSetOf(VK, V)).ptk.total === 282, '컨 대수는 낱개 그대로 — 마감텔리 모집단 282 · 평택 양하 유닛 282 · 진행 숫자 분모 282', rows.length);
  ok(B.length === 2 && B.every((b) => b.n === 4) && B[0].pos === '02-04-10' && B[1].pos === '20-05-84' && sa(B[0].cns) === sa(SKHU) && sa(B[1].cns) === sa(SRLU) && B[0].sz === '40' && B[1].sz === 'HC' && B[0].op === 'SKR',
    '묶음 2곳 · 4대씩 — 02-04-10(SKHU5541444 외 3 · 42PE) · 20-05-84(SRLU1001029 외 3 · EDI 45GE 이지만 세관 리스트가 플랫랙 45P1 로 표시)', JSON.stringify(B.map((b) => [b.pos, b.n, b.sz])));
  const fold = T.bundleFold(rows, 'discharge'), fb = fold.filter((x) => x._bundle);
  ok(fold.length === 276 && fb.length === 2 && fb.every((x, i) => sa(x._bundle) === sa(B.find((b) => b.cns.includes(x._bundle[0])).cns)), '서류(Final Work 접기)와 같은 묶음 — 접은 뒤 276 · 묶음 둘이 화면 묶음과 같은 컨', fold.length);
  ok(T.frBundlesOf(V, 'discharge') === B, '묶음 목록은 항차·방향마다 한 번만(같은 항차 객체면 같은 결과)');
  const noFr = V0(); for (const r of Object.values(noFr.discharge.records)) if (r && r.fr === true && !r.iso_pick) delete r.fr;
  const Bold = T.frBundlesOf(noFr, 'discharge');
  ok(Bold.length === 1 && sa(Bold[0].cns) === sa(SKHU), '리스트 FR 표식을 안 올리던 옛 모양이면 SRLU 4대는 묶음으로 안 읽혔다(42PE 한 곳만) — 올린 값이 이 차이를 만든다', JSON.stringify(Bold.map((b) => b.pos)));
  const tdNew = T.computeTallyData(V), tdOld = T.computeTallyData(noFr);
  ok(tdNew.totals.dis.n === 276 && tdNew.totals.dis.E.HC === 0 && tdNew.totals.dis.F.HC === 150 && tdOld.totals.dis.n === 279 && tdOld.totals.dis.E.HC === 4, '서류(Final Work 양하)도 같은 묶음을 센다 — 새 합계 276(터미널과 같다 · 엠티 HC 0 · 풀 HC 150) · 옛 모양은 279(엠티 HC 4 가 낱개로 남았다)', JSON.stringify([tdNew.totals.dis, tdOld.totals.dis]));

  console.log('② 자료별 대조 — 앱 282 · 터미널 276(+6)');
  const R = T.reconcileSources(V, 'discharge', { voyageKey: VK });
  ok(R.app === 282 && R.term.n === 276 && R.term.basis === 'plan' && R.gap === 6 && R.bundleDiff === 6 && R.bundleExplained === 6 && R.gapRest === 0 && R.unknown === 0 && R.explained === 0, '앱 282(낱개) · 터미널 배정 276 · 차이 6 = 묶음 6 → 남는 차이 0 · «번호 없음» 0', JSON.stringify({ app: R.app, gap: R.gap, rest: R.gapRest, bx: R.bundleExplained, unk: R.unknown }));
  ok(T.reconTermNum(R) === '276(+6)' && T.reconBundleText(R) === '빈 FR 4대 한 묶음 2곳 — 터미널은 한 묶음을 1대로 세어 6대 적게 셈 (02/04/10 SKHU5541444 외 3 · 20/05/84 SRLU1001029 외 3)', '문구 — «276(+6)» · «빈 FR 4대 한 묶음 2곳 — 터미널은 한 묶음을 1대로 세어 6대 적게 셈 (자리 · 컨번호 외 3)»', T.reconBundleText(R));
  const vA = V0(); vA.info.planDis = 274;   // 터미널이 2대 더 적다 — 묶음 6 + 남는 2
  const RA = T.reconcileSources(vA, 'discharge', { voyageKey: VK });
  ok(RA.gap === 8 && RA.bundleExplained === 6 && RA.gapRest === 2 && RA.unknown + RA.explained === 2 && /터미널이 모르는 2대/.test(T.reconUnknownText(RA)), '터미널 274 면 묶음으로 6대를 가리고 남은 2대만 «터미널이 모르는 2대»', JSON.stringify({ gap: RA.gap, rest: RA.gapRest, unk: RA.unknown, ex: RA.explained }));
  const vB = V0(); vB.info.planDis = 279;   // 묶음(6)보다 차이(3)가 작다 — 터미널이 일부만 1대로 셌다
  const RB = T.reconcileSources(vB, 'discharge', { voyageKey: VK });
  ok(RB.gap === 3 && RB.bundleExplained === 3 && RB.bundleDiff === 6 && RB.gapRest === 0 && /한 묶음을 1대로 세는데 이 차이에는 3대만 맞음/.test(T.reconBundleText(RB)) && T.reconTermNum(RB) === '279(+3)', '터미널 279 면 «최대 6대 차이 — 이 차이 중 3대» · 279(+3) — 묶음이 차이보다 크면 차이만큼만 설명', T.reconBundleText(RB));
  //  묶음은 통째로 (n−1)=3대씩만 차이를 낸다 — 차이 1·2 는 묶음으로 못 맞추고(0) · 4·5 는 묶음 하나(3)만 맞는다. 독립 감사 2026-10-26 «풀 수 없는 차이를 풀린 것처럼 덮는다» 수리.
  const PART = [[281, 1, 0], [280, 2, 0], [278, 4, 3], [277, 5, 3]];
  for (const [pd, g, bx] of PART) {
    const vP = V0(); vP.info.planDis = pd;
    const RP = T.reconcileSources(vP, 'discharge', { voyageKey: VK });
    ok(RP.gap === g && RP.bundleExplained === bx && RP.gapRest === g - bx && RP.unknown + RP.explained === g - bx && RP.unknown === g - bx, `터미널 ${pd}(차이 ${g}) — 묶음이 설명하는 것 ${bx}대 · 남는 ${g - bx}대는 «터미널이 모르는»`, JSON.stringify({ g: RP.gap, bx: RP.bundleExplained, rest: RP.gapRest, unk: RP.unknown, ex: RP.explained }));
    const srP = srOf(vP);
    ok(!!srP && srP.level === 'warning' && srP.msg.includes(`터미널 배정 ${pd}${bx ? `(+${bx})` : ''} · 앱 282 (+${g - bx})`) && new RegExp(`터미널이 모르는 ${g - bx}대`).test(srP.msg) && (bx ? /이 차이에는 3대만 맞음/.test(srP.msg) : !/빈 FR/.test(srP.msg)), `진단 ${pd} — 경고 유지(덮지 않음)`, srP && (srP.level + ' | ' + srP.msg));
  }
  const RE3 = T.reconcileSources((() => { const v = V0(); v.info.planDis = 279; return v; })(), 'discharge', { voyageKey: VK });
  const RE6 = T.reconcileSources((() => { const v = V0(); v.info.planDis = 276; return v; })(), 'discharge', { voyageKey: VK });
  ok(RE3.bundleExplained === 3 && RE3.gapRest === 0 && RE6.bundleExplained === 6 && RE6.gapRest === 0, '차이 3(묶음 하나) · 6(묶음 둘)은 묶음으로 맞아떨어져 남는 것 0');
  ok(T.bundleExplainOf([{ n: 4 }, { n: 4 }], 8) === 6 && T.bundleExplainOf([{ n: 4 }, { n: 4 }], 2) === 0 && T.bundleExplainOf([{ n: 2 }, { n: 4 }], 4) === 4 && T.bundleExplainOf([{ n: 3 }, { n: 4 }], 4) === 3 && T.bundleExplainOf([], 5) === 0 && T.bundleExplainOf([{ n: 4 }], -1) === 0, '묶음 몫 부분합 — 4·4 차이 8 → 6 · 2 → 0 · (2,4)묶음 차이 4 → 4 · (3,4)묶음 차이 4 → 3 · 묶음 없음·음수 → 0');
  const vC = V0(); vC.info.planDis = 290;   // 터미널이 더 많다 — 묶음은 설명이 아니다
  const RC = T.reconcileSources(vC, 'discharge', { voyageKey: VK });
  ok(RC.gap === -8 && RC.bundleExplained === 0 && T.reconBundleText(RC) === '' && RC.unknown === 8 && /^번호 없음 8대/.test(T.reconUnknownText(RC)), '터미널이 더 많으면(290) 묶음 설명을 안 붙인다 — 종전 «번호 없음 8대»', JSON.stringify({ gap: RC.gap, bx: RC.bundleExplained, unk: RC.unknown }));
  const vD = V0(); vD.info.planDis = 282;
  const RD = T.reconcileSources(vD, 'discharge', { voyageKey: VK });
  ok(RD.gap === 0 && RD.bundleExplained === 0 && RD.bundles.length === 0 && RD.gapRest === 0, '차이가 없으면(282) 묶음을 따지지 않는다(비용 0)');

  console.log('③ 진단 한 줄 — 경고가 아니라 정보(경고 표시 없음)');
  const sr = srOf(V);
  ok(!!sr && sr.level === 'info' && sr.voice === '' && sr.count === 0
    && sr.msg === '터미널 배정 276(+6) = 앱 282 · 빈 FR 4대 한 묶음 2곳 — 터미널은 한 묶음을 1대로 세어 6대 적게 셈 (02/04/10 SKHU5541444 외 3 · 20/05/84 SRLU1001029 외 3)', '진단 — 정보 줄 «터미널 배정 276(+6) = 앱 282 · 빈 FR 4대 한 묶음 2곳 …» · 소리 없음 · 주의 수 0', sr && (sr.level + ' | ' + sr.msg));
  ok(!/터미널이 모르는|번호 없음/.test(sr ? sr.msg : ''), '더 이상 «터미널이 모르는 6대(배정표는 수량뿐이라 번호로 못 가림)» 가 아니다');
  const srA = srOf(vA);
  ok(!!srA && srA.level === 'warning' && /터미널 배정 274\(\+6\) · 앱 282 \(\+2\)/.test(srA.msg) && /빈 FR 4대 한 묶음 2곳/.test(srA.msg) && /터미널이 모르는 2대/.test(srA.msg) && srA.count === 2, '274 — 경고 · «터미널 배정 274(+6) · 앱 282 (+2)» · 묶음 설명 · «터미널이 모르는 2대»', srA && srA.msg);
  ok(!srOf(vD), '차이가 없으면 줄이 안 뜬다(282 = 282)');
  const srC = srOf(vC);
  ok(!!srC && srC.level === 'warning' && /번호 없음 8대/.test(srC.msg) && !/빈 FR/.test(srC.msg), '터미널이 더 많은 290 은 종전 경고 그대로');

  console.log('④ 한 칸에 두 대 — 묶음은 사고가 아니다');
  const done = (c) => !!(V.discharge.completed || {})[c.cn];
  const bk = (c) => T.bundleKeyOf(c, 'discharge');
  const L0 = T.loadedSlotClaims(rows, done);
  ok(L0.dup.length === 1 && L0.dup[0][0] === '20-05-84' && sa(L0.dup[0][1]) === sa(SRLU) && L0.bundle.length === 0, '(종전 호출) 판정키를 안 넘기면 SRLU 4대가 그대로 «한 칸에 두 대» — 호출부가 넘겨야 바뀐다', JSON.stringify(L0.dup));
  const L1 = T.loadedSlotClaims(rows, done, bk);
  ok(L1.dup.length === 0 && L1.unknown.length === 0 && L1.bundle.length === 1 && L1.bundle[0][0] === '20-05-84' && sa(L1.bundle[0][1]) === sa(SRLU), '판정키를 넘기면 사고 0 · 묶음 1곳(20/05/84 SRLU 4대)', JSON.stringify(L1));
  const mix = rows.map((c) => (c.cn === SRLU[1] ? { ...c, fe: 'F' } : c));
  const L2 = T.loadedSlotClaims(mix, done, bk);
  ok(L2.dup.length === 1 && sa(L2.dup[0][1]) === sa(SRLU) && L2.bundle.length === 0, '같은 칸에 풀 컨이 한 대 섞이면 종전대로 사고(빨강)', JSON.stringify(L2));
  const op2 = rows.map((c) => (c.cn === SRLU[2] ? { ...c, op: 'ZZZ' } : c));
  const L3 = T.loadedSlotClaims(op2, done, bk);
  ok(L3.dup.length === 1 && L3.bundle.length === 0, '다른 선사 빈 플랫랙이 섞이면 묶음이 아니다(서류 묶음과 같은 규칙 — 한 묶음은 한 선사·한 출발지) → 사고', JSON.stringify(L3));
  const pol2 = rows.map((c) => (c.cn === SRLU[3] ? { ...c, pol: 'WEI' } : c));
  ok(T.loadedSlotClaims(pol2, done, bk).dup.length === 1, '다른 출발항이 섞이면 묶음이 아니다 → 사고');

  console.log('⑤ 화면 — 항차 요약 칩 · 마감 점검 · 홈 상세 · 주의 박스');
  const text = () => (doc.getElementById('root').textContent || '').replace(/\s+/g, ' ');
  W.__renderCard(V, VK); await wait(250);
  let t = text();
  ok(!/한 칸에 두 대/.test(t) && /빈 FR 묶음/.test(t) && /4대 한 묶음 2곳 — 터미널은 1대로 셈/.test(t) && /02\/04\/10 SKHU5541444 외 3/.test(t), '항차 요약 — 빨간 «한 칸에 두 대» 가 없고 «🔗 빈 FR 묶음 4대 한 묶음 2곳 — 터미널은 1대로 셈» 칩이 선다', t.slice(0, 400));
  const vMix = V0(); vMix.discharge.ediContainers[SRLU[1]].fe = 'F'; vMix.discharge.records[SRLU[1]].fe = 'F';
  W.__renderCard(vMix, VK); await wait(250);
  t = text();
  ok(/한 칸에 두 대/.test(t), '같은 칸에 풀 컨이 섞이면(실제 겹침) 빨간 «한 칸에 두 대» 가 그대로 뜬다', t.slice(0, 300));
  W.__renderClosing(V); await wait(250);
  t = text();
  ok(!/한 칸에 두 대/.test(t), '마감 점검 — «🔴 한 칸에 두 대 — 즉시 정리» 항목이 없다', t.slice(0, 300));
  W.__renderClosing(vMix); await wait(250);
  ok(/한 칸에 두 대 — 즉시 정리/.test(text()), '마감 점검 — 실제 겹침이면 항목이 그대로 뜬다');
  const sv = T.shipViewOf(V0());
  ok(sv.disStats && sv.disStats.frBundle && sv.disStats.frBundle.explained === 6 && sv.disStats.frBundle.bundles === 2 && sv.disStats.planQty === 276 && sv.disStats.total === 282, '홈 카드 재료 — 막대 분모 282 · 터미널 배정 276 · 묶음 설명 6대(2곳)', JSON.stringify(sv.disStats && { fb: sv.disStats.frBundle, pq: sv.disStats.planQty, tot: sv.disStats.total }));
  ok(sv.loaStats.frBundle === null, '선적 쪽은 차이가 없어 묶음 설명 없음');
  W.__renderDetail(V0()); await wait(300);
  const pq = doc.querySelector('[data-plan-qty="276"]');
  ok(!!pq && pq.textContent.replace(/\s+/g, '') === '배정276(+6)✓' && pq.getAttribute('data-fr-bundle') === '6' && !/amber/.test(pq.className) && /빈 FR 4대 한 묶음 2곳/.test(pq.getAttribute('title') || '') && /터미널 배정 276대\(\+6\) = 앱 282대/.test(pq.getAttribute('title') || ''),
    '홈 상세 — «배정 276(+6) ✓» · 호박색 아님 · 툴팁이 묶음 설명(앱 282대는 낱개 그대로)', pq && (pq.textContent + ' | ' + pq.className + ' | ' + pq.getAttribute('title')));
  const big = doc.querySelector('[data-side-box="discharge"]');
  ok(!!big && big.getAttribute('data-total') === '282', '홈 상세 — 양하 큰 숫자 분모는 282 그대로', big && big.getAttribute('data-total'));
  const vH = V0(); vH.info.planDis = 274;
  W.__renderDetail(vH); await wait(300);
  const pq2 = doc.querySelector('[data-plan-qty="274"]');
  ok(!!pq2 && pq2.textContent.replace(/\s+/g, '') === '배정274(+6)(앱+2)' && /amber/.test(pq2.className), '홈 상세 — 274 면 «배정 274(+6) (앱 +2)» 호박색(남는 차이만 경고)', pq2 && (pq2.textContent + ' | ' + pq2.className));
  for (const [pd, g, bx] of [[281, 1, 0], [278, 4, 3]]) {
    const vHp = V0(); vHp.info.planDis = pd;
    W.__renderDetail(vHp); await wait(300);
    const pqP = doc.querySelector(`[data-plan-qty="${pd}"]`);
    ok(!!pqP && pqP.textContent.replace(/\s+/g, '') === `배정${pd}${bx ? `(+${bx})` : ''}(앱+${g - bx})` && /amber/.test(pqP.className) && (bx ? pqP.getAttribute('data-fr-bundle') === String(bx) : !pqP.getAttribute('data-fr-bundle')), `홈 상세 — ${pd} 는 묶음이 못 맞추는 ${g - bx}대가 남아 호박색 «배정 ${pd}${bx ? `(+${bx})` : ''} (앱 +${g - bx})»`, pqP && (pqP.textContent + ' | ' + pqP.className));
  }
  const vH2 = V0(); vH2.info.planDis = 290;
  W.__renderDetail(vH2); await wait(300);
  const pq3 = doc.querySelector('[data-plan-qty="290"]');
  ok(!!pq3 && pq3.textContent.replace(/\s+/g, '') === '배정290(앱-8)' && !pq3.getAttribute('data-fr-bundle'), '홈 상세 — 터미널이 더 많은 290 은 종전 «배정 290 (앱 -8)»', pq3 && pq3.textContent);
  W.__renderDiag([sr]); await wait(200);
  const hb = [...doc.querySelectorAll('button')].find((x) => /빈 FR 4대 한 묶음 2곳/.test(x.textContent || ''));
  ok(!!hb, '주의 박스 — 정보 줄이 선다');
  if (hb) { hb.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(150); }
  const rc = doc.querySelector('[data-recon]'), gb = rc && rc.querySelector('[data-recon-group="bundle"]');
  const tm = rc && rc.querySelector('[data-recon-term]') ? rc.querySelector('[data-recon-term]').textContent : '';
  ok(!!gb && /빈 FR 묶음 — 터미널은 한 묶음을 1대로 셈\(앱 컨 대수는 낱개 그대로 · 참고\) 2곳 · 8대/.test(gb.textContent) && gb.querySelectorAll('[data-recon-bundle]').length === 2
    && SRLU.every((c) => gb.textContent.includes(c)) && SKHU.every((c) => gb.textContent.includes(c)), '펼친 칸 — «빈 FR 묶음 … 2곳 · 8대» 묶음마다 자리·규격·컨번호 4개', gb && gb.textContent.slice(0, 300));
  ok(/터미널 배정 276대\(\+6\) = 앱 282대 — 빈 FR 묶음 2곳\(아래\)을 터미널은 1대로 셈/.test(tm) && !/번호 없음|터미널이 모르는/.test(tm) && rc && rc.querySelector('[data-recon-term]').className.includes('text-dim-300'), '펼친 칸 터미널 줄 — «터미널 배정 276대(+6) = 앱 282대 …» 호박색 아님', tm);

  console.log('⑥ DB 에는 아무것도 안 쓴다 · 오류 없음');
  const before = JSON.stringify(T.FX.discharge.completed), vz = V0(); T.frBundlesOf(vz, 'discharge'); T.reconcileSources(vz, 'discharge', { voyageKey: VK }); srOf(vz);
  ok(JSON.stringify(vz.discharge.completed) === before && Object.keys(vz.discharge.completed).length === Object.keys(T.FX.discharge.completed).length && Object.keys(vz.discharge.completed).length > 0, '완료 기록(' + Object.keys(vz.discharge.completed).length + '건) 그대로 — 판정은 읽기만 한다');
  ok(errs.length === 0, '화면 렌더 중 오류·경고창 없음', errs.join(' | '));
  console.log(`\n${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
