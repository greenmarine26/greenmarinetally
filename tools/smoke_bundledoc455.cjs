// 4.55 연막검사 — 터미널 «빈 FR 묶음 목록(BUNDLE LIST)» 서류가 있으면 묶음은 서류가 정본이다(자리로 짐작하지 않는다) · 서류가 없으면 4.54 그대로 · 컨 대수는 낱개 그대로 · DB 쓰기 없음.
//   실행 — node tools/smoke_bundledoc455.cjs <repoRoot> <번들(smoke_bundledoc455.jsx)>. 실패하면 빌드를 세운다.
//   실자료 — ATPR 2647E 실 RTDB 읽기 사본(tools/fixtures/bundle454_atpr2647e.json · 양하 282 · 터미널 배정 276) + 실서류 ATPR 2647E BUNDLE LIST.xls(2026-10-25 14:07 메일 · 1번 42PC 4대 · 2번 45PC 4대)를
//   수집기 MailPilot 2.48 이 읽어 올리는 모양 그대로(tools/fixtures/bundlelist455_atpr2647e.json). 실 Firebase 쓰기 없음.
//   검수사 2026-10-26 21:00 «갯수가 4개 묶음이 아닐때에는 이메일이나 다른 문서로 갯수가 기록되어서 올것입니다. 2개 나 3개 묶음 표시로해서....» · 21:09 «재가동보다 정확한 데이터가 더 중요합니다».
const fs = require('fs');
const root = process.argv[2] || process.cwd();
const bundle = process.argv[3];
(async () => {
  let bad = 0, n = 0;
  const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + String(d).slice(0, 600))); if (!c) bad++; };
  if (!bundle) { console.log('번들 경로가 없다'); process.exit(1); }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.global = dom.window;
  const errs = [];
  dom.window.addEventListener('error', (e) => errs.push(e.message));
  console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s) && !/act\(/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
  const warns = [];
  console.warn = (...a) => { warns.push(a.map(String).join(' ')); };
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
  const VDOC = (d) => { const v = V0(); v.bundleList = clone(d || T.DOC); return v; };
  const SRLU = ['SRLU1001029', 'SRLU1001203', 'SRLU1001498', 'SRLU1001672'];
  const SKHU = ['SKHU5541444', 'SKHU5640895', 'TRIU0821436', 'TRLU5040847'];
  const sa = (a) => [...a].sort().join(',');
  const grp = (no, size, cns) => ({ no, size, cns });
  const alertsOf = (v, mode = 'discharge') => {
    const sec = v[mode];
    const al = T.runDiagnostics({ ediContainers: Object.values(sec.ediContainers || {}), listRecords: sec.records || {}, xrayList: sec.xrayList, mode, voyage: v, voyageKey: v.key });
    return Array.isArray(al) ? al : (al.alerts || []);
  };
  const srOf = (v) => alertsOf(v).find((a) => a.code === 'source_recon');
  const BASE_TXT = '빈 FR 4대 한 묶음 2곳 — 터미널은 한 묶음을 1대로 세어 6대 적게 셈 (02/04/10 SKHU5541444 외 3 · 20/05/84 SRLU1001029 외 3)';
  const DOC_NOTE = '터미널 묶음 목록(서류) 기준';
  const DOC_SRC = '_문서_ATPR 2647E BUNDLE LIST.xls · 메일 10-25 14:07';   // 4.55 감사 3차 하-5 — 서류 출처(파일 · 메일 받은 시각 KST)를 같이 적는다
  const DOC_NOTE_S = DOC_NOTE + '(' + DOC_SRC + ')';

  console.log('① 실서류 — ATPR 2647E 양하(앱 282 · 터미널 배정 276 · 서류 묶음 둘)');
  ok(T.DOC.groups.length === 2 && sa(T.DOC.groups[0].cns) === sa(SKHU) && sa(T.DOC.groups[1].cns) === sa(SRLU) && T.DOC.groups[0].size === '42PC' && T.DOC.groups[1].size === '45PC' && T.DOC._meta.total === 8, '고정본 — 실서류 그대로(1번 42PC 4대 · 2번 45PC 4대 · 컨 8대)');
  const VD = VDOC();
  const dd = T.bundleDocOf(VD);
  ok(!!dd && dd.groups.length === 2 && dd.n === 8 && dd.byCn.get('SRLU1001029') === 'doc|1' && dd.byCn.get('TRIU0821436') === 'doc|0' && T.bundleDocOf(VD) === dd, '서류 읽기 — 묶음 2 · 컨 8 · 컨→묶음 키 · 같은 서류는 한 번만 읽는다(캐시)', dd && JSON.stringify([...dd.byCn]));
  const rowsD = T.ptkContainers(VD, 'discharge');
  ok(rowsD.length === 282 && T.ptkDischargeUnitsOf(VD).set.size === 282 && T.progressOf(VD.discharge, 'discharge', T.shiftCnSetOf(VK, VD)).ptk.total === 282, '컨 대수는 낱개 그대로 — 마감텔리 모집단 282 · 평택 양하 유닛 282 · 진행 숫자 분모 282', rowsD.length);
  ok(rowsD.filter((c) => c._bdoc).length === 8 && rowsD.filter((c) => c._bdoc === '').length === 274 && rowsD.every((c) => c._bdoc !== undefined), '마감텔리 모집단 컨마다 서류 묶음 키를 찍는다 — 서류 8대는 키 · 나머지 274대는 «낱개»(빈 키)', rowsD.filter((c) => c._bdoc).length);
  const BD = T.frBundlesOf(VD, 'discharge');
  ok(BD.length === 2 && BD.every((b) => b.n === 4 && b.src === 'doc' && b.docN === 4 && b.missing.length === 0 && b.mixed === false) && BD[0].pos === '02-04-10' && BD[1].pos === '20-05-84' && BD[0].no === '1' && BD[1].no === '2'
    && sa(BD[0].cns) === sa(SKHU) && sa(BD[1].cns) === sa(SRLU) && BD[0].sz === '40' && BD[1].sz === 'HC' && BD[0].op === 'SKR', '묶음 2곳 · 4대씩 · 서류 기준(src doc) — 서류와 앱이 어긋난 컨 없음(missing 0 · mixed 아님) · 자리·규격은 앱 자료', JSON.stringify(BD.map((b) => [b.pos, b.n, b.sz, b.src, b.no])));
  const BP = T.frBundlesOf(V0(), 'discharge');
  ok(BP.length === 2 && BP.every((b) => b.src === 'pos') && BP[0].pos === BD[0].pos && BP[1].pos === BD[1].pos && sa(BP[0].cns) === sa(BD[0].cns) && sa(BP[1].cns) === sa(BD[1].cns), '서류가 없는 항차는 4.54 그대로(자리 규칙 · src pos) — 이 배는 서류와 자리 규칙이 같은 묶음을 낸다', JSON.stringify(BP.map((b) => [b.pos, b.src])));
  ok(T.bundleDocNote(BP) === '' && T.bundleDocNote(BD) === DOC_NOTE_S && T.bundleDocSrc(BD) === DOC_SRC && T.bundleDocSrc(BP) === '', '서류 기준 말 — 서류 묶음이면 «' + DOC_NOTE_S + '»(서류 파일 · 메일 받은 시각) · 자리 규칙이면 빈 글', T.bundleDocNote(BD));
  const foldD = T.bundleFold(rowsD, 'discharge'), fbD = foldD.filter((x) => x._bundle);
  ok(foldD.length === 276 && fbD.length === 2 && fbD.every((x) => sa(x._bundle) === sa(BD.find((b) => b.cns.includes(x._bundle[0])).cns)), '서류(Final Work 접기)도 서류 묶음 — 접은 뒤 276 · 묶음 둘이 화면 묶음과 같은 컨', foldD.length);
  const tdD = T.computeTallyData(VD), tdP = T.computeTallyData(V0());
  ok(tdD.totals.dis.n === 276 && tdD.totals.dis.E.HC === 0 && tdD.totals.dis.F.HC === 150 && JSON.stringify(tdD.totals) === JSON.stringify(tdP.totals), '서류 Final Work 양하 합계 276 — 서류가 자리 규칙과 같은 묶음이면 서류 합계가 한 글자도 안 바뀐다', tdD.totals.dis.n);
  const bdD = T.bundleDocFor(VD, rowsD);
  ok(!!bdD && rowsD.every((c) => T.bundleKeyOf(c, 'discharge') === T.bundleKeyOf({ ...c, _bdoc: undefined }, 'discharge', bdD)), '키 길 둘이 같은 답 — 마감텔리 컨(찍힌 키)과 카드의 날 컨(항차를 넘겨 서류로 찾음)');

  console.log('② 자료별 대조 — 서류 기준으로 «배정 276(+6)»');
  const R = T.reconcileSources(VD, 'discharge', { voyageKey: VK });
  ok(R.app === 282 && R.term.n === 276 && R.gap === 6 && R.bundleDiff === 6 && R.bundleExplained === 6 && R.gapRest === 0 && R.unknown === 0 && R.explained === 0, '앱 282(낱개) · 터미널 배정 276 · 차이 6 = 서류 묶음 6 → 남는 차이 0 · «번호 없음» 0', JSON.stringify({ app: R.app, gap: R.gap, bd: R.bundleDiff, bx: R.bundleExplained, rest: R.gapRest, unk: R.unknown }));
  ok(T.reconTermNum(R) === '276(+6)' && T.reconBundleText(R) === BASE_TXT + ' · ' + DOC_NOTE_S, '문구 — «276(+6)» · 4.54 문구 그대로 + « · ' + DOC_NOTE_S + '»', T.reconBundleText(R));
  ok(T.reconBundleText(T.reconcileSources(V0(), 'discharge', { voyageKey: VK })) === BASE_TXT, '서류가 없으면 4.54 문구 그대로(꼬리 없음)');

  console.log('③ 서류가 4대 묶음이 아닐 때 — 3대 묶음 + 4대 묶음(자리 규칙은 4대 둘로 읽었을 배)');
  const D3 = { groups: [grp('1', '42PC', ['TRLU5040847', 'SKHU5640895', 'SKHU5541444']), grp('2', '45PC', SRLU)], _meta: { file: 'x.xls', total: 7, groups: 2 } };
  const V3 = VDOC(D3);
  const B3 = T.frBundlesOf(V3, 'discharge');
  ok(B3.length === 2 && B3[0].n === 3 && B3[1].n === 4 && sa(B3[0].cns) === sa(['TRLU5040847', 'SKHU5640895', 'SKHU5541444']) && !B3[0].cns.includes('TRIU0821436'), '서류가 3대로 적으면 3대 묶음이다 — 같은 칸의 넷째(TRIU0821436)는 서류 밖이라 낱개', JSON.stringify(B3.map((b) => [b.pos, b.n])));
  const R3 = T.reconcileSources(V3, 'discharge', { voyageKey: VK });
  ok(R3.bundleDiff === 5 && R3.bundleExplained === 5 && R3.gapRest === 1 && R3.gap === 6 && T.reconTermNum(R3) === '276(+5)' && /빈 FR 묶음 2곳\(3대·4대\)/.test(T.reconBundleText(R3)) && /5대 적게 셈/.test(T.reconBundleText(R3)), '서류가 3대+4대(몫 5)인데 터미널 배정은 276(차이 6) — 서류 몫 5대만 «276(+5)» 로 설명하고 남는 1대는 경고 쪽에 남긴다(차이 전체를 풀린 것처럼 덮지 않는다 · 감사 4차 중-1)', JSON.stringify({ bd: R3.bundleDiff, bx: R3.bundleExplained, rest: R3.gapRest }));
  const v3b = VDOC(D3); v3b.info.planDis = 277;
  const R3b = T.reconcileSources(v3b, 'discharge', { voyageKey: VK });
  ok(R3b.gap === 5 && R3b.bundleExplained === 5 && R3b.gapRest === 0 && T.reconTermNum(R3b) === '277(+5)' && /빈 FR 묶음 2곳\(3대·4대\)/.test(T.reconBundleText(R3b)) && /5대 적게 셈/.test(T.reconBundleText(R3b)) && /터미널 묶음 목록\(서류\) 기준/.test(T.reconBundleText(R3b)), '터미널 배정이 서류와 같은 277 이면 «277(+5)» · «빈 FR 묶음 2곳(3대·4대)» · 5대 적게 셈', JSON.stringify({ bx: R3b.bundleExplained, rest: R3b.gapRest }));
  ok(T.bundleFold(T.ptkContainers(V3, 'discharge'), 'discharge').length === 277 && T.computeTallyData(V3).totals.dis.n === 277, '서류(Final Work)도 서류대로 — 접은 뒤 277(282 − 2 − 3)', T.computeTallyData(V3).totals.dis.n);
  const D2 = { groups: [grp('1', '42PC', ['SKHU5541444', 'SKHU5640895']), grp('2', '45PC', SRLU.slice(0, 3))], _meta: {} };
  const R2 = T.reconcileSources(VDOC(D2), 'discharge', { voyageKey: VK });
  const v2b = VDOC(D2); v2b.info.planDis = 279;
  const R2b = T.reconcileSources(v2b, 'discharge', { voyageKey: VK });
  ok(R2.bundleDiff === 3 && R2.bundleExplained === 3 && R2.gapRest === 3 && R2b.gap === 3 && R2b.bundleExplained === 3 && R2b.gapRest === 0 && /빈 FR 묶음 2곳\(2대·3대\)/.test(T.reconBundleText(R2b)) && T.reconTermNum(R2b) === '279(+3)', '2대+3대 묶음(몫 1+2 = 3) — 배정 279(차이 3)면 «279(+3)» 로 전부 설명, 배정 276(차이 6)이면 서류 몫 3대만 설명하고 남는 3대는 경고 쪽', JSON.stringify({ bd: R2.bundleDiff, bx: R2.bundleExplained, rest: R2.gapRest, bx2: R2b.bundleExplained }));

  console.log('④ 서류가 이긴다 — 서류에 없는 컨은 자리가 같아도 낱개');
  const D1 = { groups: [grp('1', '42PC', SKHU)], _meta: {} };
  const V1 = VDOC(D1);
  const B1 = T.frBundlesOf(V1, 'discharge');
  ok(B1.length === 1 && sa(B1[0].cns) === sa(SKHU) && B1[0].src === 'doc', '서류가 SKHU 한 묶음만 알리면 묶음은 그 하나 — SRLU 4대는 같은 칸이어도 낱개(자리 규칙이었다면 둘)', JSON.stringify(B1.map((b) => [b.pos, b.n])));
  const R1 = T.reconcileSources(V1, 'discharge', { voyageKey: VK });
  const v1b = VDOC(D1); v1b.info.planDis = 279;
  const R1b = T.reconcileSources(v1b, 'discharge', { voyageKey: VK });
  ok(R1.bundleDiff === 3 && R1.bundleExplained === 3 && R1.gapRest === 3 && T.reconTermNum(R1) === '276(+3)' && R1b.gap === 3 && R1b.bundleExplained === 3 && R1b.gapRest === 0 && T.reconTermNum(R1b) === '279(+3)', '서류가 SKHU 한 묶음(몫 3)만 알리면 — 배정 279(차이 3)면 «279(+3)» 로 전부 설명, 배정 276(차이 6)이면 서류 몫 3대만 설명하고 남는 3대(서류 밖 SRLU 묶음분)는 경고 쪽에 남는다', JSON.stringify({ bx: R1.bundleExplained, rest: R1.gapRest, bx2: R1b.bundleExplained }));
  const doneD = (c) => !!(VD.discharge.completed || {})[c.cn];
  const cs1 = T.ptkContainers(V1, 'discharge'), bd1 = T.bundleDocFor(V1, cs1);
  const L1 = T.loadedSlotClaims(cs1, doneD, (c) => T.bundleKeyOf(c, 'discharge', bd1));
  ok(L1.dup.length === 1 && L1.dup[0][0] === '20-05-84' && sa(L1.dup[0][1]) === sa(SRLU) && L1.bundle.length === 0, '서류 밖 SRLU 4대가 한 칸에 완료로 모이면 «한 칸에 두 대» — 서류와 앱 자리가 어긋났다는 신호로 남긴다', JSON.stringify(L1.dup));
  const L0 = T.loadedSlotClaims(rowsD, doneD, (c) => T.bundleKeyOf(c, 'discharge', bdD));
  ok(L0.dup.length === 0 && L0.unknown.length === 0 && L0.bundle.length === 1 && L0.bundle[0][0] === '20-05-84' && sa(L0.bundle[0][1]) === sa(SRLU), '서류가 두 묶음을 다 알리면 사고 0 · 묶음 1곳(완료된 20/05/84 SRLU 4대)', JSON.stringify(L0));

  console.log('⑤ 서류와 앱 자료가 어긋난 곳 — 말해 준다');
  const DM = { groups: [grp('1', '42PC', SKHU), grp('2', '45PC', [...SRLU, 'ABCD1234567'])], _meta: {} };
  const BM = T.frBundlesOf(VDOC(DM), 'discharge');
  ok(BM.length === 2 && BM[1].n === 4 && BM[1].docN === 5 && BM[1].missing.join() === 'ABCD1234567' && BM[0].missing.length === 0 && /서류에는 있는데 앱 목록에 없는 컨 1대/.test(T.bundleDocNote(BM)), '서류에는 5대인데 앱 목록에 4대뿐이면 빠진 컨을 밝힌다 — «서류에는 있는데 앱 목록에 없는 컨 1대»', JSON.stringify(BM.map((b) => [b.n, b.docN, b.missing])));
  const fullRow = rowsD.find((c) => c.fe === 'F' && !SKHU.includes(c.cn) && !SRLU.includes(c.cn));
  const DX = { groups: [grp('1', '42PC', [...SKHU.slice(0, 3), fullRow.cn]), grp('2', '45PC', SRLU)], _meta: {} };
  const BX = T.frBundlesOf(VDOC(DX), 'discharge');
  ok(BX.length === 2 && BX.filter((b) => b.mixed).length === 1 && BX.find((b) => b.mixed).cns.includes(fullRow.cn) && /섞인 곳 1곳/.test(T.bundleDocNote(BX)), '서류 묶음에 풀 컨·다른 자리 컨이 섞이면 «섞인 곳 1곳» 으로 밝힌다(서류가 이기되 어긋남을 숨기지 않는다)', JSON.stringify(BX.map((b) => [b.n, b.mixed])));

  console.log('⑥ 서류 모양이 달라도 읽는다 · 이상한 서류는 서류로 안 친다');
  const objShape = { groups: { 0: { no: '1', size: '42PC', cns: { 0: SKHU[0], 1: SKHU[1], 2: SKHU[2], 3: SKHU[3] } }, 1: { no: '2', size: '45PC', cns: { 0: SRLU[0], 1: SRLU[1], 2: SRLU[2], 3: SRLU[3] } } }, _meta: {} };
  const BO = T.frBundlesOf(VDOC(objShape), 'discharge');
  ok(BO.length === 2 && BO.every((b) => b.n === 4 && b.src === 'doc'), 'RTDB 가 배열을 객체(0·1·2…)로 줘도 같은 묶음');
  const dupD = { groups: [grp('1', '42PC', SKHU), grp('2', '45PC', [...SRLU, 'SKHU5541444'])], _meta: {} };
  warns.length = 0;
  const BU = T.frBundlesOf(VDOC(dupD), 'discharge');
  ok(BU.length === 2 && BU.every((b) => b.src === 'pos') && T.bundleDocOf(VDOC(dupD)) === null && warns.some((w) => /같은 컨이 두 묶음/.test(w)), '같은 컨이 두 묶음에 있으면 서류 전체를 안 쓰고 자리 규칙으로 판정한다(어느 쪽이 맞는지 알 수 없다 · 조용히 넘기지 않고 경고를 남긴다)', warns.join(' | '));
  for (const [label, bl] of [['빈 객체', {}], ['묶음 없음', { groups: [] }], ['컨 번호가 아닌 글', { groups: [grp('1', '42PC', ['abc', '1234'])] }], ['groups 가 글', { groups: 'x' }], ['null', null]]) {
    const vv = V0(); if (bl !== null) vv.bundleList = bl;
    ok(T.bundleDocOf(vv) === null && T.frBundlesOf(vv, 'discharge').every((b) => b.src === 'pos'), `서류 ${label} → 서류로 안 친다(자리 규칙으로 판정)`);
  }
  const vC = VDOC(); const c1 = T.frBundlesOf(vC, 'discharge');
  vC.bundleList = clone(D3);
  const c2 = T.frBundlesOf(vC, 'discharge');
  ok(c1 !== c2 && c1.every((b) => b.n === 4) && c2[0].n === 3, '같은 항차 객체에서 서류만 새로 오면 묶음을 다시 센다(캐시가 옛 서류에 붙들리지 않는다)');
  ok(T.tagBundleDoc(rowsD.slice(0, 3), V0()) !== undefined && (() => { const a = [{ cn: 'AAAA1234567' }]; return T.tagBundleDoc(a, V0()) === a; })(), '서류가 없으면 컨 목록을 복사하지 않고 그대로 돌려준다');

  console.log('③-진단 한 줄 — 서류 기준이면 그 말');
  const sr = srOf(VD);
  ok(!!sr && sr.level === 'info' && sr.voice === '' && sr.count === 0 && sr.msg === '터미널 배정 276(+6) = 앱 282 · ' + BASE_TXT + ' · ' + DOC_NOTE_S, '진단 — 정보 줄 · 소리 없음 · 4.54 문구 + « · ' + DOC_NOTE_S + '»', sr && (sr.level + ' | ' + sr.msg));
  const srP = srOf(V0());
  ok(!!srP && srP.msg === '터미널 배정 276(+6) = 앱 282 · ' + BASE_TXT, '서류 없는 항차의 진단 줄은 4.54 그대로');
  const vA = VDOC(); vA.info.planDis = 274;
  const srA = srOf(vA);
  ok(!!srA && srA.level === 'warning' && /터미널 배정 274\(\+6\) · 앱 282 \(\+2\)/.test(srA.msg) && /빈 FR 4대 한 묶음 2곳/.test(srA.msg) && /터미널이 모르는 2대/.test(srA.msg) && !/터미널이 모르는 8대/.test(srA.msg), '서류 기준 · 배정 274(차이 8 > 서류 몫 6) — 서류 몫 6대만 «274(+6)» 으로 설명하고 남는 2대는 «터미널이 모르는 2대» 로 남긴다(본선 잔류·수화물이 낀 차이를 «모르는 8대» 로 과대하게 말하지 않는다 · 감사 4차 중-1)', srA && srA.msg);

  console.log('④-화면 — 요약 칩 · 마감 점검 · 홈 상세 · 주의 박스');
  const text = () => (doc.getElementById('root').textContent || '').replace(/\s+/g, ' ');
  W.__renderCard(VD, VK); await wait(250);
  let t = text();
  ok(!/한 칸에 두 대/.test(t) && /4대 한 묶음 2곳 — 터미널은 1대로 셈/.test(t) && /터미널 묶음 서류 기준/.test(t) && /02\/04\/10 SKHU5541444 외 3/.test(t), '항차 요약 — «🔗 빈 FR 묶음 4대 한 묶음 2곳 — 터미널은 1대로 셈 · … · 터미널 묶음 서류 기준» 칩 · 빨강 없음', t.slice(0, 420));
  W.__renderCard(V0(), VK); await wait(250);
  t = text();
  ok(/4대 한 묶음 2곳 — 터미널은 1대로 셈/.test(t) && !/터미널 묶음 서류 기준/.test(t), '서류 없는 항차 칩은 4.54 그대로(서류 기준 말 없음)', t.slice(0, 300));
  W.__renderCard(V1, VK); await wait(250);
  t = text();
  ok(/한 칸에 두 대/.test(t) && /4대 한 묶음 1곳|한 묶음 1곳/.test(t), '서류가 SKHU 만 알리면 SRLU 4대는 빨간 «한 칸에 두 대» 로 남고 묶음 칩은 1곳', t.slice(0, 400));
  W.__renderClosing(VD); await wait(250);
  ok(!/한 칸에 두 대/.test(text()), '마감 점검 — 서류가 두 묶음을 알리면 «한 칸에 두 대» 항목이 없다', text().slice(0, 300));
  W.__renderClosing(V1); await wait(250);
  ok(/한 칸에 두 대 — 즉시 정리/.test(text()), '마감 점검 — 서류 밖 SRLU 4대는 항목이 뜬다(서류와 앱 자리가 어긋남)');
  const sv = T.shipViewOf(VDOC());
  ok(sv.disStats && sv.disStats.frBundle && sv.disStats.frBundle.explained === 6 && sv.disStats.frBundle.bundles === 2 && sv.disStats.frBundle.doc === true && sv.disStats.planQty === 276 && sv.disStats.total === 282, '홈 카드 재료 — 분모 282 · 배정 276 · 묶음 설명 6대(2곳) · 서류 기준 표시', JSON.stringify(sv.disStats && { fb: sv.disStats.frBundle, pq: sv.disStats.planQty, tot: sv.disStats.total }));
  ok(T.shipViewOf(V0()).disStats.frBundle.doc === false, '서류 없는 항차 홈 카드 재료는 서류 기준 아님');
  W.__renderDetail(VDOC()); await wait(300);
  const pq = doc.querySelector('[data-plan-qty="276"]');
  ok(!!pq && pq.textContent.replace(/\s+/g, '') === '배정276(+6)✓' && pq.getAttribute('data-fr-bundle') === '6' && !/amber/.test(pq.className) && /빈 FR 4대 한 묶음 2곳\(터미널 묶음 목록 서류 기준 · _문서_ATPR 2647E BUNDLE LIST\.xls · 메일 10-25 14:07\)/.test(pq.getAttribute('title') || '') && !pq.getAttribute('data-fr-doc-off'),
    '홈 상세 — «배정 276(+6) ✓» · 호박색 아님 · 툴팁에 «(터미널 묶음 목록 서류 기준)»', pq && (pq.textContent + ' | ' + pq.className + ' | ' + pq.getAttribute('title')));
  W.__renderDetail(V0()); await wait(300);
  const pq0 = doc.querySelector('[data-plan-qty="276"]');
  ok(!!pq0 && /빈 FR 4대 한 묶음 2곳/.test(pq0.getAttribute('title') || '') && !/서류 기준/.test(pq0.getAttribute('title') || ''), '서류 없는 항차 툴팁은 4.54 그대로');
  W.__renderDiag([sr]); await wait(200);
  const hb = [...doc.querySelectorAll('button')].find((x) => /빈 FR 4대 한 묶음 2곳/.test(x.textContent || ''));
  if (hb) { hb.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(150); }
  const rc = doc.querySelector('[data-recon]'), gb = rc && rc.querySelector('[data-recon-group="bundle"]');
  ok(!!gb && new RegExp('빈 FR 묶음 — 터미널은 한 묶음을 1대로 셈\\(앱 컨 대수는 낱개 그대로 · 참고\\) 2곳 · 8대 · ' + DOC_NOTE.replace(/[()]/g, '\\$&')).test(gb.textContent) && gb.querySelectorAll('[data-recon-bundle]').length === 2 && SRLU.every((c) => gb.textContent.includes(c)) && SKHU.every((c) => gb.textContent.includes(c)),
    '펼친 칸 — «빈 FR 묶음 … 2곳 · 8대 · ' + DOC_NOTE + '» 묶음마다 자리·규격·컨번호 4개', gb && gb.textContent.slice(0, 300));
  const BS = T.frBundlesOf(VDOC({ groups: [grp('1', '42PC', ['TRLU5040847', 'SKHU5640895'])], _meta: {} }), 'discharge');
  ok(BS.length === 1 && BS[0].n === 2, '두 대 묶음도 묶음이다(서류가 2대라고 하면 2대)');

  console.log('⑧ 서류가 닿는 방향만 따른다 — 양하 서류가 선적을 건드리지 않는다(독립 감사 2026-10-26 «서류가 방향·항차를 가리지 않는다»)');
  const csLo = T.ptkContainers(VD, 'loading');
  ok(csLo.length > 0 && T.bundleDocFor(VD, csLo) === null && T.frBundlesOf(VD, 'loading').doc === null && csLo.every((c) => c._bdoc === undefined), '이 배의 선적 모집단(' + csLo.length + '대)에는 서류 컨이 없다 → 서류가 닿지 않아 선적은 자리 규칙 그대로(_bdoc 안 찍힘 · 묶음 서류 표시 없음)');
  const loAl = alertsOf(VD, 'loading').map((a) => a.code);
  ok(!loAl.includes('bundle_doc') && !alertsOf(VD).some((a) => a.code === 'bundle_doc') && !alertsOf(V0()).some((a) => a.code === 'bundle_doc') && !alertsOf(V0(), 'loading').some((a) => a.code === 'bundle_doc'), '맞는 서류·서류 없음·선적 방향은 «서류와 앱이 맞지 않음» 경고가 없다', loAl.join());
  const frc = (cn, bay, row, tier, op) => ({ cn, fe: 'E', fr: true, iso: '42P1', op: op || 'SKR', pol: 'KRPTK', pod: 'CNQZH', bay, row, tier });
  const LA = frc('AAAU1111111', '02', '04', '10'), LB = frc('BBBU2222222', '02', '04', '10'), LC = frc('CCCU3333333', '02', '04', '10'), LD = frc('DDDU4444444', '06', '02', '82'), LE = frc('EEEU5555555', '06', '02', '82');
  const lcs = [LA, LB, LC, LD, LE];
  const vL = (d) => { const v = V0(); v.bundleList = d; return v; };
  const lpos = T.emptyFrBundlesOf(lcs, 'loading', vL(null));
  ok(lpos.length === 2 && lpos.every((b) => b.src === 'pos') && lpos[0].n === 3 && lpos[1].n === 2 && lpos.doc === null, '선적 — 서류 없음: 자리 규칙(같은 칸 3대·2대)');
  const lunrel = T.emptyFrBundlesOf(lcs, 'loading', vL({ groups: [grp('1', '42PC', SKHU)], _meta: {} }));
  ok(lunrel.length === 2 && lunrel.every((b) => b.src === 'pos') && lunrel.doc === null, '선적 — 이 방향 컨과 상관없는 서류(컨이 하나도 없음): 서류가 닿지 않아 자리 규칙 그대로');
  const lone = T.emptyFrBundlesOf(lcs, 'loading', vL({ groups: [grp('1', '42PC', ['AAAU1111111', ...SKHU])], _meta: {} }));
  ok(lone.length === 2 && lone.every((b) => b.src === 'pos') && lone.doc === null, '선적 — 서류 묶음의 컨이 이 방향에 한 대뿐이면 서류가 닿지 않는다(두 대 이상이어야 닿음)');
  const ldoc = T.emptyFrBundlesOf(lcs, 'loading', vL({ groups: [grp('1', '42PC', ['AAAU1111111', 'CCCU3333333'])], _meta: {} }));
  ok(ldoc.length === 1 && ldoc[0].src === 'doc' && sa(ldoc[0].cns) === sa(['AAAU1111111', 'CCCU3333333']) && !!ldoc.doc, '선적 — 서류가 닿으면(두 대 이상) 서류 묶음이 이긴다: 같은 칸의 B·D·E 는 서류 밖이라 낱개');
  const lbd = T.bundleDocFor(vL({ groups: [grp('1', '42PC', ['AAAU1111111', 'CCCU3333333'])], _meta: {} }), lcs);
  ok(T.bundleKeyOf(LA, 'loading', lbd) === T.bundleKeyOf(LC, 'loading', lbd) && T.bundleKeyOf(LA, 'loading', lbd).startsWith('doc|') && T.bundleKeyOf(LB, 'loading', lbd) === '' && T.bundleKeyOf(LB, 'loading') !== '', 'bundleKeyOf — 서류 보기가 있으면 서류 묶음 키 · 서류 밖 컨은 낱개(빈 키) · 서류 보기가 없으면 자리 키');

  console.log('⑨ 서류 모양 엄격 읽기 — 한 군데라도 어긋나면 서류 전체를 안 쓴다(자리로 판정 · 경고를 남긴다)');
  const rejects = [
    ['컨 번호가 10글자', { groups: [grp('1', '42PC', ['SKHU554144', ...SKHU.slice(1)]), grp('2', '45PC', SRLU)], _meta: {} }, /컨 번호가 아닌 값/],
    ['_meta.total 불일치', { groups: [grp('1', '42PC', SKHU), grp('2', '45PC', SRLU)], _meta: { total: 9, groups: 2 } }, /_meta\.total/],
    ['_meta.groups 불일치', { groups: [grp('1', '42PC', SKHU), grp('2', '45PC', SRLU)], _meta: { total: 8, groups: 3 } }, /_meta\.groups/],
    ['컨이 없는 묶음', { groups: [grp('1', '42PC', SKHU), grp('2', '45PC', [])], _meta: {} }, /컨이 없는 묶음/],
    ['숫자만 있는 칸', { groups: [grp('1', '42PC', [...SKHU.slice(0, 3), '4']), grp('2', '45PC', SRLU)], _meta: {} }, /컨 번호가 아닌 값/],
    ['묶음 항목이 글', { groups: ['x'], _meta: {} }, /객체가 아님/],
  ];
  for (const [label, bl, re] of rejects) {
    warns.length = 0;
    const vv = vL(bl);
    ok(T.bundleDocOf(vv) === null && T.frBundlesOf(vv, 'discharge').every((b) => b.src === 'pos') && T.frBundlesOf(vv, 'discharge').doc === null && warns.some((w) => re.test(w)), `서류 ${label} → 서류 전체를 안 쓰고 자리 규칙 · 경고 «${re.source}» 를 남긴다`, warns.join(' | '));
  }
  const loose = { groups: [{ no: '1', size: '42PC', cns: ' trlu 504084-7 , SKHU-5640895;skhu5541444,TRIU0821436 ' }, grp('2', '45PC', SRLU.map((x) => x.toLowerCase()))], _meta: { total: 8, groups: 2 } };
  const dl = T.bundleDocOf(vL(loose));
  ok(!!dl && dl.n === 8 && sa(dl.groups[0].cns) === sa(SKHU) && sa(dl.groups[1].cns) === sa(SRLU) && sa(T.frBundlesOf(vL(loose), 'discharge')[0].cns.concat(T.frBundlesOf(vL(loose), 'discharge')[1].cns)) === sa([...SKHU, ...SRLU]), '소문자·공백·붙임표·쉼표(;)로 이은 글도 같은 컨으로 읽는다');
  const dupNo = { groups: [grp('1', '42PC', SKHU), grp('1', '45PC', SRLU)], _meta: {} };
  const dN = T.frBundlesOf(vL(dupNo), 'discharge');
  ok(dN.length === 2 && dN.every((b) => b.n === 4 && b.src === 'doc') && dN[0].key !== dN[1].key, '서류의 묶음 번호(NO)가 겹쳐도 키는 겹치지 않는다(읽은 순서 번호)');

  console.log('⑩ 서류가 묶음 하나만 알려도 Final Work 합계는 서류대로 — 서류 밖 컨은 접히지 않는다');
  const cs1f = T.ptkContainers(V1, 'discharge');
  ok(cs1f.filter((c) => c._bdoc).length === 4 && cs1f.filter((c) => c._bdoc === '').length === 278 && SRLU.every((cn) => cs1f.find((c) => c.cn === cn)._bdoc === ''), '서류 밖 컨은 _bdoc 가 빈 글(낱개 표시) — 자리 규칙으로 되돌아가지 않는다');
  const fold1 = T.bundleFold(cs1f, 'discharge');
  ok(fold1.length === 279 && fold1.filter((x) => x._bundle).length === 1 && T.computeTallyData(V1).totals.dis.n === 279, '서류 묶음 하나만 접힌다 — 접은 뒤 279(282 − 3) · Final Work 양하 합계도 279(SRLU 4대는 낱개로 센다)', fold1.length + ' / ' + T.computeTallyData(V1).totals.dis.n);

  console.log('⑪ 설명은 서류 몫만큼만 — 차이가 서류 몫(Σ) 이상이면 Σ 만 설명하고 나머지는 경고로 남긴다 · Σ 보다 작은 차이는 덮지 않는다(독립 감사 4차 중-1)');
  const BDx = T.frBundlesOf(VD, 'discharge'), BPx = T.frBundlesOf(V0(), 'discharge');
  ok([1, 2, 3, 4, 5].every((g) => T.bundleExplainOf(BDx, g) === 0) && [6, 7, 8, 9, 20].every((g) => T.bundleExplainOf(BDx, g) === 6) && T.bundleExplainOf(BDx, 0) === 0 && T.bundleExplainOf(BDx, -3) === 0 && T.bundleExplainOf(BPx, 3) === 3 && T.bundleExplainOf(BPx, 5) === 3, '서류 기준 — 차이 < 서류 몫(6)이면 0 · 차이 ≥ 6 이면 6(그 이상은 풀지 않는다) · 자리 규칙은 4.54 부분합 그대로(3→3 · 5→3)');
  for (const [pq, bx] of [[279, 0], [281, 0], [276, 6], [274, 6], [273, 6]]) {
    const vq = VDOC(); vq.info.planDis = pq;
    const Rq = T.reconcileSources(vq, 'discharge', { voyageKey: VK });
    ok(Rq.gap === 282 - pq && Rq.bundleExplained === bx && Rq.gapRest === Rq.gap - bx && T.reconTermNum(Rq) === (bx ? `${pq}(+${bx})` : String(pq)) && (bx ? /6대 적게 셈/.test(T.reconBundleText(Rq)) : T.reconBundleText(Rq) === ''), `서류 기준 · 배정 ${pq} (차이 ${282 - pq}) — ${bx ? '서류 몫 6대만 «(+6)» 으로 설명하고 남는 ' + (282 - pq - 6) + '대는 경고 쪽' : '서류 몫보다 작아 묶음으로 설명하지 않고 차이 그대로 · «(+n)» 없음'}`, JSON.stringify({ gap: Rq.gap, bx: Rq.bundleExplained, rest: Rq.gapRest }));
  }
  const v279 = VDOC(); v279.info.planDis = 279;
  const sv279 = T.shipViewOf(v279);
  const fb279 = sv279.disStats.frBundle, bd279 = alertsOf(v279).find((a) => a.code === 'bundle_doc');
  ok(fb279 === null && /앱 282 \(\+3\)/.test(srOf(v279).msg) && srOf(v279).level === 'warning', '홈 카드 — 차이 3(Σ 6 보다 작음)은 묶음 설명도 «서류 어긋남» 도 없다(서류 탓으로 말하지 않는다 · 호박색 «앱 +3» 만) · 진단 줄은 경고 «앱 282 (+3)»', JSON.stringify(fb279) + ' ' + srOf(v279).msg);
  ok(!bd279, '차이가 있는 어긋남은 서류 경고(bundle_doc)를 따로 켜지 않는다 — 어긋남은 자료별 대조(source_recon)가 이미 말한다', bd279 && bd279.msg);

  console.log('⑫ 서류와 앱 목록이 어긋나면 경고 — 차이가 0 이어도');
  const SR1 = SRLU[0];
  const DMa = { groups: [grp('1', '42PC', SKHU), grp('2', '45PC', [...SRLU, 'ABCD1234567'])], _meta: {} };
  const vMa = VDOC(DMa);
  const wMa = alertsOf(vMa).find((a) => a.code === 'bundle_doc');
  ok(!!wMa && wMa.level === 'warning' && wMa.count === 1 && /서류에는 있는데 앱 목록에 없는 컨 1대\(ABCD1234567\)/.test(wMa.msg) && /맞지 않습니다/.test(wMa.voice), '서류 5대·앱 4대 — 경고 «서류에는 있는데 앱 목록에 없는 컨 1대(ABCD1234567)» · 음성 한 줄', wMa && wMa.msg);
  const BMa = T.frBundlesOf(vMa, 'discharge');
  ok(BMa.every((b) => b.dm === 1) && BMa.doc.missing.join() === 'ABCD1234567' && srOf(vMa).details.bundles.every((b) => b.dm === 1), '빠진 컨 수(dm)는 묶음마다 실려 진단 상세(details.bundles)까지 간다');
  const DMb = { groups: [grp('1', '42PC', SKHU), grp('2', '45PC', [SR1, 'ABCD1234567', 'EFGH1234567'])], _meta: {} };
  const vMb = VDOC(DMb);
  const BMb = T.frBundlesOf(vMb, 'discharge');
  ok(BMb.length === 1 && BMb[0].n === 4 && BMb.doc.missing.length === 2 && alertsOf(vMb).find((a) => a.code === 'bundle_doc').count === 2 && !/여야 하는데/.test(alertsOf(vMb).find((a) => a.code === 'bundle_doc').msg) && /서류에는 있는데 앱 목록에 없는 컨 2대/.test(alertsOf(vMb).find((a) => a.code === 'bundle_doc').msg), '서류 묶음의 컨이 앱 목록에 한 대뿐이라 묶음이 안 잡혀도 빠진 2대를 경고한다(묶음은 SKHU 하나 · 터미널 276 은 차이 6 이 서류 몫 3 보다 커서 서류 어긋남 말은 없다)', JSON.stringify(BMb.map((b) => b.n)) + ' ' + JSON.stringify(BMb.doc));
  const vMx = VDOC(DX);
  const wMx = alertsOf(vMx).find((a) => a.code === 'bundle_doc');
  ok(!!wMx && wMx.count === 1 && /섞인 곳 1곳/.test(wMx.msg), '한 묶음에 풀 컨이 섞이면 경고 «섞인 곳 1곳»', wMx && wMx.msg);
  W.__renderDiag([srOf(vMa)]); await wait(200);
  const hb2 = [...doc.querySelectorAll('button')].find((x) => /빈 FR 4대 한 묶음 2곳/.test(x.textContent || ''));
  if (hb2) { hb2.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(150); }
  const gb2 = doc.querySelector('[data-recon] [data-recon-group="bundle"]');
  ok(!!gb2 && /서류에는 있는데 앱 목록에 없는 컨 1대/.test(gb2.textContent), '진단 상세 — 펼친 묶음 칸에 «서류에는 있는데 앱 목록에 없는 컨 1대» 가 같이 뜬다', gb2 && gb2.textContent.slice(0, 260));

  console.log('⑬ 서류가 있는데 못 쓰는 상태는 화면이 말한다 — 조용히 자리 짐작으로 돌아가지 않는다(독립 감사 2차 부-2)');
  const WHY_RE = /묶음 서류를 쓰지 못해 자리로 짐작 중/;
  for (const [label, bl, why] of [
    ['수집기가 걷어 낸 표시(_meta.error)', { _meta: { error: '엑셀 서식을 못 읽음', file: 'x.xls' } }, /수집기가 서류를 못 읽음 — 엑셀 서식을 못 읽음/],
    ['걷어 낸 표시 + 옛 묶음이 같이 남음', { groups: [grp('1', '42PC', SKHU), grp('2', '45PC', SRLU)], _meta: { error: '서식 어긋남', total: 8, groups: 2 } }, /수집기가 서류를 못 읽음/],
    ['같은 컨이 두 묶음', { groups: [grp('1', '42PC', SKHU), grp('2', '45PC', [...SRLU, 'SKHU5541444'])], _meta: {} }, /같은 컨이 두 묶음/],
    ['_meta.total 불일치', { groups: [grp('1', '42PC', SKHU), grp('2', '45PC', SRLU)], _meta: { total: 9 } }, /_meta\.total/],
    ['묶음이 모두 한 대뿐', { groups: SKHU.map((c, i) => grp(String(i + 1), '42PC', [c])), _meta: {} }, /모두 한 대뿐/],
  ]) {
    const vw = vL(bl);
    const bw = T.frBundlesOf(vw, 'discharge');
    const al = alertsOf(vw).find((a) => a.code === 'bundle_doc');
    ok(T.bundleDocOf(vw) === null && T.bundleDocWhy(vw) !== '' && why.test(T.bundleDocWhy(vw)) && bw.every((b) => b.src === 'pos') && WHY_RE.test(T.bundleDocNote(bw)) && !!al && al.level === 'warning' && /묶음 서류가 있으나 쓰지 못함\(.*\) — 빈 FR 묶음 2곳은 자리로 짐작 중/.test(al.msg),
      `${label} → 서류를 안 쓰고 자리로 판정하되 그 이유를 말한다(묶음 말·주의 «묶음 서류가 있으나 쓰지 못함(…) — 빈 FR 묶음 2곳은 자리로 짐작 중»)`, JSON.stringify({ why: T.bundleDocWhy(vw), note: T.bundleDocNote(bw), al: al && al.msg }));
  }
  const vW = vL({ _meta: { error: '엑셀 서식을 못 읽음' } });
  const rW = T.reconcileSources(vW, 'discharge', { voyageKey: VK });
  ok(rW.bundleExplained === 6 && T.reconTermNum(rW) === '276(+6)' && WHY_RE.test(T.reconBundleText(rW)) && /자리로 짐작 중\(수집기가 서류를 못 읽음/.test(srOf(vW).msg), '서류를 못 써서 자리로 짐작해도 «배정 276(+6)» 설명은 그대로 · 진단 줄에 «묶음 서류를 쓰지 못해 자리로 짐작 중» 이 붙는다', srOf(vW).msg);
  const fbW = T.shipViewOf(vW).disStats.frBundle;
  ok(!!fbW && fbW.doc === false && /수집기가 서류를 못 읽음/.test(fbW.docWhy), '홈 카드 재료 — 서류 기준 아님 · docWhy 가 실림');
  W.__renderDetail(vW); await wait(300);
  const pqW = doc.querySelector('[data-plan-qty="276"]');
  ok(!!pqW && /\(묶음 서류를 쓰지 못해 자리로 짐작 중\)/.test(pqW.getAttribute('title') || '') && !/서류 기준/.test(pqW.getAttribute('title') || ''), '홈 상세 툴팁 — «(묶음 서류를 쓰지 못해 자리로 짐작 중)»', pqW && pqW.getAttribute('title'));
  ok(T.bundleDocWhy(V0()) === '' && T.bundleDocWhy(VD) === '' && T.bundleDocWhy(vL({})) === '' && !alertsOf(V0()).some((a) => a.code === 'bundle_doc') && T.frBundlesOf(V0(), 'discharge').docWhy === '', '서류가 없거나 정상이면 이유 없음 · 경고 없음');

  console.log('⑭ «섞임» 판정 — 플랫랙이 아닌 컨은 섞임 · 자리가 아직 없는 컨은 «자리가 다르다» 가 아니다(독립 감사 2차 하-1·하-2)');
  const FR2 = (cn, bay, row, tier, iso, fr) => ({ ...frc(cn, bay, row, tier), iso: iso || '42P1', fr: fr === undefined ? true : fr });
  const dbl = (cs) => T.emptyFrBundlesOf(cs, 'discharge', vL({ groups: [grp('1', '42PC', cs.map((c) => c.cn))], _meta: {} }));
  const x0 = dbl([FR2('AAAU1111111', '02', '04', '10'), FR2('BBBU2222222', '02', '04', '10')]);
  ok(x0.length === 1 && x0[0].src === 'doc' && x0[0].mixed === false, '같은 칸의 빈 플랫랙 둘 — 섞임 아님');
  const x1 = dbl([FR2('AAAU1111111', '02', '04', '10'), FR2('BBBU2222222', '', '', '')]);
  ok(x1.length === 1 && x1[0].mixed === false && x1[0].pos === '02-04-10', '한 대가 자리 미정이어도 «자리가 다르다» 로 치지 않는다');
  const x2 = dbl([FR2('AAAU1111111', '02', '04', '10'), FR2('BBBU2222222', '06', '02', '82')]);
  ok(x2.length === 1 && x2[0].mixed === true, '자리가 서로 다른 두 곳이면 섞임');
  const x3 = dbl([FR2('AAAU1111111', '02', '04', '10'), FR2('BBBU2222222', '02', '04', '10', '42G1', false)]);   // 40피트 일반 컨 — 규격 칸·자리·선사·항구가 같고 플랫랙만 아니다(그 조건만 시험)
  ok(x3.length === 1 && x3[0].mixed === true && /섞인 곳 1곳/.test(T.bundleDocNote(x3)) && /엠티 플랫랙이 아닌 컨/.test(T.bundleDocNote(x3)), '플랫랙이 아닌 컨(42G1 — 규격 칸은 같음)이 끼면 섞임 — 문구 «엠티 플랫랙이 아닌 컨»');

  console.log('⑮ 서류 상태는 어느 경우에도 말한다 — 차이 0 · 한 묶음당 한 대뿐 · 자리로 짐작한 묶음 0곳(독립 감사 3차 중-3·중-4 · 하-5)');
  //  (가) 정상 — 서류 묶음 몫 6 = 앱 282 − 배정 276: 서류 기준 어긋남 없음 · 경고 없음
  ok(R.doc.applied && R.doc.sigma === 6 && R.doc.expect === 276 && R.doc.off === false && !alertsOf(VD).some((a) => a.code === 'bundle_doc') && T.shipViewOf(VD).disStats.frBundle.docOff === null, '정상 — 서류 기준 터미널 예상 276 = 실제 276 · 어긋남 없음 · bundle_doc 경고 없음', JSON.stringify(R.doc));
  //  (나) 차이 0 인데 서류 묶음이 있음 — 터미널이 서류 묶음을 낱개로 센 것(배정 282 = 앱 282). 종전은 «일치 ✓» 로 덮었다.
  const v0g = VDOC(); v0g.info.planDis = 282;
  const R0g = T.reconcileSources(v0g, 'discharge', { voyageKey: VK });
  ok(R0g.gap === 0 && R0g.doc.applied && R0g.doc.sigma === 6 && R0g.doc.expect === 276 && R0g.doc.off === true, '배정 282 = 앱 282(차이 0)이지만 서류 묶음 몫 6 → 서류 기준 터미널은 276이어야 한다(off)', JSON.stringify(R0g.doc));
  const bd0g = alertsOf(v0g).find((a) => a.code === 'bundle_doc');
  ok(!!bd0g && bd0g.level === 'warning' && bd0g.count === 1 && /터미널 배정은 276대여야 하는데\(앱 282대 − 서류 묶음 몫 6대\) 실제 282대/.test(bd0g.msg) && !alertsOf(v0g).some((a) => a.code === 'source_recon' && a.level === 'warning'), '차이 0 이어도 경고 «터미널 배정은 276대여야 하는데(앱 282대 − 서류 묶음 몫 6대) 실제 282대»', JSON.stringify(alertsOf(v0g).map((a) => [a.code, a.level, a.count, String(a.msg).slice(0, 140)])));
  const fb0g = T.shipViewOf(v0g).disStats.frBundle;
  ok(!!fb0g && fb0g.explained === 0 && !!fb0g.docOff && fb0g.docOff.expect === 276, '홈 카드 재료 — 설명(+n) 없음 · docOff 276');
  W.__renderDetail(v0g); await wait(300);
  const pq0g = doc.querySelector('[data-plan-qty="282"]');
  ok(!!pq0g && /⚠서류276/.test((pq0g.textContent || '').replace(/\s+/g, '')) && !/✓/.test(pq0g.textContent) && /amber/.test(pq0g.className) && pq0g.getAttribute('data-fr-doc-off') === '276' && /숫자는 같습니다/.test(pq0g.getAttribute('title') || '') && /터미널 배정은 276대여야 하는데/.test(pq0g.getAttribute('title') || ''), '홈 상세 — «배정 282 ⚠ 서류 276» · ✓ 없음 · 호박색 · 툴팁에 서류 기준 문장', pq0g && (pq0g.textContent + ' | ' + pq0g.className + ' | ' + pq0g.getAttribute('title')));
  const keep2 = (v) => { const ks = Object.values(v.discharge.ediContainers).filter((c) => c.fe === 'F').slice(0, 2).map((c) => c.cn); v.keepOnboard = {}; ks.forEach((cn) => { v.keepOnboard[cn] = { cn, pod: 'CNSHA', mailAt: 'x' }; }); };
  const R_k0 = (v) => T.reconcileSources(v, 'discharge', { voyageKey: VK });
  const vK0 = VDOC(); keep2(vK0); vK0.info.planDis = 282;   // 본선 잔류 지시가 있어 자료별 대조 알림이 서는 항차 + 터미널 배정 282 = 앱 282(차이 0) — 서류 몫 6 이 있는데 터미널이 낱개로 셈
  const srK0 = srOf(vK0);
  W.__renderDiag(srK0 ? [srK0] : []); await wait(200);
  const hb3 = [...doc.querySelectorAll('button')].find((x) => /터미널 배정 282/.test(x.textContent || ''));
  if (hb3) { hb3.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(150); }
  const dd0g = doc.querySelector('[data-recon] [data-recon-doc]');
  ok(!!srK0 && R_k0(vK0).doc.off === true && !!dd0g && /터미널 배정은 276대여야 하는데\(앱 282대 − 서류 묶음 몫 6대\) 실제 282대/.test(dd0g.textContent) && /BUNDLE LIST/.test(dd0g.textContent), '진단 펼친 칸 — 자료별 대조 알림이 서는 항차(본선 잔류 지시)에서도 서류 기준 어긋남 한 줄(서류 파일 이름까지)', (dd0g && dd0g.textContent) + ' || ' + (hb3 ? 'btn ok' : 'no button') + ' || ' + (srK0 ? srK0.msg : 'no source_recon') + ' || ' + doc.body.textContent.slice(0, 200));
  //  (다) 서류의 컨이 이 목록에 «한 묶음당 한 대»뿐 — 서류가 닿지 않아 못 쓰는데 종전에는 서류가 있었다는 말조차 없었다.
  const DSg = { groups: [grp('1', '42PC', [SKHU[0], 'AAAU1111111', 'AAAU2222222']), grp('2', '45PC', [SRLU[0], 'BBBU1111111'])], _meta: {} };
  const vSg = VDOC(DSg), bSg = T.frBundlesOf(vSg, 'discharge');
  ok(!T.bundleDocFor(vSg, T.ptkContainers(vSg, 'discharge')) && /서류의 컨 2대만 이 목록에 있어 묶음으로 맞지 않음\(서류 5대\)/.test(bSg.docWhy) && bSg.every((b) => b.src === 'pos'), '서류 컨이 이 목록에 묶음당 한 대뿐 — 서류를 못 쓰고 이유(«서류의 컨 2대만 이 목록에 있어 …») 를 말한다 · 묶음은 자리로 짐작', bSg.docWhy);
  const aSg = alertsOf(vSg).find((a) => a.code === 'bundle_doc');
  ok(!!aSg && /묶음 서류가 있으나 쓰지 못함\(서류의 컨 2대만/.test(aSg.msg), '진단 — «묶음 서류가 있으나 쓰지 못함(서류의 컨 2대만 …)»', aSg && aSg.msg);
  ok(T.bundleDocMiss(vSg, T.ptkContainers(vSg, 'discharge')) !== '' && T.bundleDocMiss(VD, T.ptkContainers(VD, 'discharge')) === '' && T.bundleDocMiss(V0(), T.ptkContainers(V0(), 'discharge')) === '' && T.bundleDocMiss(vSg, []) === '', '못 쓰는 이유 한 벌 — 서류가 닿으면 빈 글 · 서류 없음 빈 글 · 이 방향 컨 없음 빈 글');
  W.__renderDetail(vSg); await wait(300);
  const pqSg = doc.querySelector('[data-plan-qty="276"]');
  ok(!!pqSg && /⚠서류/.test((pqSg.textContent || '').replace(/\s+/g, '')) && /amber/.test(pqSg.className) && /묶음 서류를 쓰지 못함 — 서류의 컨 2대만/.test(pqSg.getAttribute('title') || ''), '홈 상세 — «⚠ 서류» 표식 · 호박색 · 툴팁에 못 쓰는 이유', pqSg && (pqSg.textContent + ' | ' + pqSg.className + ' | ' + pqSg.getAttribute('title')));
  //  (라) 자리로 짐작한 묶음이 0곳이어도 서류를 못 쓰면 말한다 — 4개 묶음 자리가 흩어진 항차에서 «서류를 못 읽음» 이 조용하던 것.
  const vN0 = vL({ _meta: { error: '엑셀 서식을 못 읽음', file: 'x.xls' } });
  [...SKHU, ...SRLU].forEach((cn, i) => { for (const [k, c] of Object.entries(vN0.discharge.ediContainers || {})) { if (String(c.cn || k) === cn) c.tier = String(90 + i); } for (const r of Object.values(vN0.discharge.records || {})) { if (r && r.cn === cn) r.tier = String(90 + i); } });
  const bN0 = T.frBundlesOf(vN0, 'discharge'), aN0 = alertsOf(vN0).find((a) => a.code === 'bundle_doc');
  ok(bN0.length === 0 && /수집기가 서류를 못 읽음/.test(bN0.docWhy) && !!aN0 && /묶음 서류가 있으나 쓰지 못함\(수집기가 서류를 못 읽음/.test(aN0.msg) && !/자리로 짐작 중/.test(aN0.msg), '자리로 짐작한 묶음 0곳이어도 «묶음 서류가 있으나 쓰지 못함(…)» 을 말한다', JSON.stringify({ n: bN0.length, why: bN0.docWhy, al: aN0 && aN0.msg }));
  //  (마) 서류 출처 — 파일 이름 · 메일 받은 시각(없으면 수집 시각) KST
  const dsM = JSON.parse(JSON.stringify(T.DOC)); dsM._meta = { ...dsM._meta, mailAt: 0 };
  const bsM = T.frBundlesOf(VDOC(dsM), 'discharge');
  ok(T.bundleDocSrc(BD) === DOC_SRC && T.bundleDocSrc(bsM) === '_문서_ATPR 2647E BUNDLE LIST.xls · 수집 10-25 14:10' && BD.doc.mailAt === 1792904820000 && T.bundleDocSrc([]) === '', '서류 출처 — «파일 · 메일 10-25 14:07» · 메일 시각이 없으면 «수집 10-25 14:10» · 서류 없으면 빈 글', T.bundleDocSrc(bsM));

  console.log('⑯ 서류 탓이 아닌 차이는 서류 탓으로 말하지 않는다 — 앱 목록 부족 · 본선 잔류 · 수화물 · 터미널이 더 많음 · 본선현황(QC) 부분합(독립 감사 4차 중-1)');
  const dropFull = (v, k0) => { let k = 0; const drop = new Set(); for (const c of Object.values(v.discharge.ediContainers)) { if (k < k0 && c.fe === 'F' && ![...SRLU, ...SKHU].includes(c.cn)) { drop.add(c.cn); k++; } } for (const sec of ['ediContainers', 'records', 'completed']) for (const kk of Object.keys(v.discharge[sec] || {})) { const cn = (v.discharge[sec][kk] && v.discharge[sec][kk].cn) || kk; if (drop.has(cn)) delete v.discharge[sec][kk]; } };
  const lug3 = (v) => { for (let i = 0; i < 3; i++) v.discharge.records['LUGG000000' + i] = { cn: 'LUGG000000' + i, fe: 'F', iso: '22G1', pod: 'KRPTK', pol: 'CNWEI', _source: 'x.xls', _customs: true }; };
  const chipOfV = async (v, pq) => { W.__renderDetail(v); await wait(300); const el = doc.querySelector(`[data-plan-qty="${pq}"]`); return el ? { t: el.textContent.replace(/\s+/g, ''), amber: /amber/.test(el.className), title: el.getAttribute('title') || '', off: el.getAttribute('data-fr-doc-off') } : null; };
  for (const [label, mut, pq, want] of [
    ['앱 목록 20대 부족(앱 262 · 배정 276)', (v) => dropFull(v, 20), 276, { app: 262, bx: 0, rest: -14, chip: '배정276(앱-14)' }],
    ['본선 잔류 지시 2대(터미널은 반영해 274)', keep2, 274, { app: 282, bx: 6, rest: 2, chip: '배정274(+6)(앱+2)' }],
    ['수화물 3대(앱 285 · 배정 276)', lug3, 276, { app: 285, bx: 6, rest: 3, chip: '배정276(+6)(앱+3)' }],
    ['터미널이 더 많음(배정 290 · 앱 282)', () => {}, 290, { app: 282, bx: 0, rest: -8, chip: '배정290(앱-8)' }],
  ]) {
    const vv = VDOC(); vv.info.planDis = pq; mut(vv);
    const Rr = T.reconcileSources(vv, 'discharge', { voyageKey: VK });
    const cc = await chipOfV(vv, pq);
    ok(Rr.app === want.app && Rr.doc.applied && Rr.doc.off === false && Rr.bundleExplained === want.bx && Rr.gapRest === want.rest && !alertsOf(vv).some((a) => a.code === 'bundle_doc') && !!cc && cc.t === want.chip && cc.off === null && !/서류/.test(cc.t) && !/서류가 낡았거나/.test(cc.title) && !/모르는 [68]대/.test((srOf(vv) || { msg: '' }).msg),
      `${label} — 서류 어긋남 경고 없음 · 칩 «${want.chip}» · 서류 몫 ${want.bx}대만 설명하고 나머지는 자료별 대조가 말한다`, JSON.stringify({ app: Rr.app, off: Rr.doc.off, bx: Rr.bundleExplained, rest: Rr.gapRest, chip: cc && cc.t, sr: srOf(vv) && srOf(vv).msg.slice(0, 120) }));
  }
  const vQc = VDOC(); delete vQc.info.planDis; vQc.info.qcWork.QC104.disRest = 208;   // 배정 수량 없음 — 본선현황(QC) 부분합 282 = 앱 282
  const RQc = T.reconcileSources(vQc, 'discharge', { voyageKey: VK });
  ok(RQc.term.basis === 'qc' && RQc.term.n === 282 && RQc.gap === 0 && RQc.doc.applied && RQc.doc.sigma === 6 && RQc.doc.off === false && !alertsOf(vQc).some((a) => a.code === 'bundle_doc'), '본선현황(QC) 기준 수량은 «터미널 배정» 이 아니라 서류 몫과 맞대지 않는다(차이 0 이어도 서류 어긋남 아님)', JSON.stringify(RQc.doc));
  const fbSig = T.frBundlesOf(VD, 'discharge');
  ok([0, 1, 2, 3, 4, 5].every((g) => T.bundleExplainOf(fbSig, g) === 0), '서류 몫보다 작은 차이는 몇이든 덮지 않는다(0~5)');

  console.log('⑰ 모양이 깨진 서류도 «서류 없음» 처럼 조용하지 않다(독립 감사 4차 하-8)');
  for (const [label, bl, re] of [
    ['글', 'x', /서류 모양이 깨짐\(객체가 아님\)/],
    ['숫자', 7, /서류 모양이 깨짐\(객체가 아님\)/],
    ['배열', [1, 2], /서류 모양이 깨짐\(묶음 목록이 아니라 배열\)/],
    ['groups 가 숫자', { groups: 5 }, /groups 모양이 깨짐/],
    ['_meta.error 가 객체', { _meta: { error: { code: 13, msg: 'locked' } } }, /수집기가 서류를 못 읽음 — \{"code":13/],
  ]) {
    const vb = V0(); vb.bundleList = bl;
    const wy = T.bundleDocWhy(vb), fr = T.frBundlesOf(vb, 'discharge');
    ok(re.test(wy) && !/\[object Object\]/.test(wy) && re.test(fr.docWhy) && fr.every((b) => b.src === 'pos') && !!alertsOf(vb).find((a) => a.code === 'bundle_doc'), `서류 ${label} → 서류를 못 쓰는 이유를 말한다(자리 규칙으로 판정 · 경고)`, wy);
  }

  console.log('⑦ DB 에는 아무것도 안 쓴다 · 오류 없음');
  const before = JSON.stringify(T.FX.discharge.completed), vz = VDOC(); T.frBundlesOf(vz, 'discharge'); T.reconcileSources(vz, 'discharge', { voyageKey: VK }); srOf(vz);
  ok(JSON.stringify(vz.discharge.completed) === before && Object.keys(vz.discharge.completed).length > 0 && JSON.stringify(vz.bundleList) === JSON.stringify(T.DOC), '완료 기록(' + Object.keys(vz.discharge.completed).length + '건)과 서류 그대로 — 판정은 읽기만 한다');
  ok(errs.length === 0, '화면 렌더 중 오류·경고창 없음', errs.join(' | '));
  console.log(`\n${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
