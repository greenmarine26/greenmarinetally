// 4.39 연막검사 — 🏁 마감적용을 메뉴째 없앤 뒤: ① 기능·메뉴·쓰는 함수가 남지 않았는가 ② 그 판이 이미 남긴 지난 항차 기록(`{by:'', src:'edi'}`)은 그대로 읽히는가.
//   검수사 2026-10-19 21:25 «이 기능을 삭제 해주세요. 마감 적용기능은 없애주세요 앱을 사용하게 되면 필요 없어지는 기능입니다» · 21:26 «메뉴 자체도 없애주세요».
//   읽는 쪽 판정은 종전 4.12 연막(smoke_closingedi412 [3]·[4]·_fb [5])에서 옮겼다. 실소스 firebase.js 는 메모리 RTDB 스텁으로 묶는다(실제 읽기·쓰기 없음).
//   픽스처 tools/fixtures/closingedi_obwh2762.json = OBWH 2762W 실제 선적(보관소 GET · 터미널 반영 287대).
//   실행 — node tools/smoke_ediread439.cjs <repoRoot> <firebase 번들.cjs>
process.env.TZ = 'Asia/Seoul';
const path = require('path');
const fs = require('fs');
const root = process.argv[2] || process.cwd();
const B = process.argv[3];
(async () => {
  let fail = 0, pass = 0;
  const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
  const read = (f) => fs.readFileSync(path.resolve(root, f), 'utf8');
  const noCmt = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

  console.log('[1] 기능·메뉴가 남지 않았다');
  ok(!fs.existsSync(path.resolve(root, 'src/components/ClosingEdiPanel.jsx')), 'ClosingEdiPanel.jsx 가 없다');
  const srcFiles = [];
  const walk = (d) => { for (const e of fs.readdirSync(path.resolve(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.(js|jsx)$/.test(e.name)) srcFiles.push(p); } };
  walk('src');
  const dead = /\b(ClosingEdiPanel|fbApplyClosingEdi|applyClosingEdiFile|closingEdiPlan|closingEdiEntries|closingEdiGate|deckPlanRows|toggleClosingEdi)\b/;
  const left = srcFiles.filter((f) => dead.test(noCmt(read(f))));
  ok(left.length === 0, `src ${srcFiles.length}개 파일 코드(주석 제외)에 마감적용 이름이 없다` + (left.length ? ' | ' + left.join(', ') : ''));
  const uiLeft = srcFiles.filter((f) => !/^src\/data\/helpData/.test(f) && /마감적용|마감 적용/.test(noCmt(read(f)).replace(/export const APP_NOTE = '[^']*'/, '')));   // 업데이트 배너 한 줄(APP_NOTE)은 판 알림이라 셈에서 뺀다(4.39 는 4.29-02 규칙대로 배너 문구를 안 바꿨다)
  ok(uiLeft.length === 0, '화면 글자(주석·매뉴얼 제외)에 «마감적용» 이 없다' + (uiLeft.length ? ' | ' + uiLeft.join(', ') : ''));
  const CD = read('src/pages/ChiefDashboard.jsx');
  const i0 = CD.indexOf("if (gid === 'owner' && owner) return ("), i1 = CD.indexOf('\n    return null;\n  };', i0);
  const block = i0 > 0 && i1 > i0 ? CD.slice(i0, i1) : '';
  ok(block.length > 0 && !/closingedi/.test(block) && /data-danger-zone="1"/.test(block) && /onClick=\{askClearAllDanger\}/.test(block) && /<ShiftSnapPanel/.test(block) && /<ActivityLogSection/.test(block) && /<AiCostPanel/.test(block) && /onOpenStaffManager/.test(block),
    '소유자 메뉴 — 마감적용 접이 없음 · 교대 시각·활동 로그·AI 비용·인원 관리·위험 구역(모든 작업 보고 삭제)은 그대로');
  const FI = read('src/data/featureIndex.js');
  ok(!/l: '🏁 마감적용'/.test(FI) && !/마감적용/.test(FI), '기능 색인에 «🏁 마감적용» 항목·글자가 없다(미르가 없는 메뉴로 안내하지 않는다)');
  const HC = read('src/data/helpDataChief.js');
  const hcHits = HC.split('\n').filter((l) => /마감적용/.test(l));
  ok(hcHits.length === 1 && /4\.39 에 메뉴째 없앴습니다/.test(hcHits[0]) && /안에 네 가지가 있고/.test(HC), '수석 매뉴얼 — 마감적용은 «없앴습니다» 한 줄뿐 · 소유자 메뉴 네 가지');
  ok(!/마감적용/.test(read('src/components/ShiftSnapPanel.jsx')), '교대 시각 패널 안내 글자에 마감적용이 없다');
  ok(!/fbApplyClosingEdi/.test(read('tools/fb_stub_search.js')) && !/fbApplyClosingEdi/.test(read('tools/gen_fb_stub.py')), 'firebase 스텁·스텁 생성기에 fbApplyClosingEdi 가 없다');
  ok(!/smoke_closingedi41/.test(read('build.sh')), 'build.sh 가 없앤 마감적용 연막을 부르지 않는다');

  console.log('[2] 이미 남은 지난 항차 기록(마감 EDI 적용)은 그대로 읽힌다');
  const U = await import(path.resolve(root, 'src/utils.js'));
  const e = { by: '', src: 'edi', at: Date.parse('2026-10-08T03:50:00+09:00') };
  ok(U.isEdiApplied(e) === true && U.isTermApplied(e) === false && U.isAutoDone(e) === true, '마감 EDI 적용: isEdiApplied · 터미널 반영은 아님 · 사람이 아닌 기록(isAutoDone)');
  ok(U.isAutoDone({ by: '', src: 'term', at: 1 }) === true && U.isAutoDone({ by: '터미널(옛)', at: 1 }) === true && U.isAutoDone({ by: '박철민', at: 1 }) === false && U.isAutoDone(null) === false, '터미널 반영(새·옛 행)도 사람이 아닌 기록 · 검수원 기록은 사람 기록');
  ok(U.completedByLabel(e) === '마감 EDI 적용' && U.completedByLabel(e, { craneCrew: {} }) === '마감 EDI 적용', '완료자 표기 = «마감 EDI 적용»(조 등록 근무자를 붙이지 않는다)');
  ok(U.completedByLabel({ by: '박철민', at: 1 }) === '박철민' && U.completedByLabel({ by: '', src: 'term', at: 1 }) === '터미널 반영' && U.completedByLabel({ by: '', at: 1 }) === '', '검수원 이름 · 터미널 반영 · 이름 없는 옛 행의 표기는 종전 그대로');
  ok(typeof U.closingEdiGate === 'undefined', 'utils 에 closingEdiGate 가 없다');
  const L = await import(path.resolve(root, 'src/loadingEdiExport.js'));
  ok(typeof L.closingEdiPlan === 'undefined' && typeof L.closingEdiEntries === 'undefined' && typeof L.collectActualLoading === 'function', 'loadingEdiExport — 마감적용 판정 둘이 없고 실선적 EDI 조립은 그대로');
  const RP = await import(path.resolve(root, 'src/rzorPlan.js'));
  ok(typeof RP.deckPlanRows === 'undefined' && typeof RP.deckCoordMap === 'function' && typeof RP.parseDeckPlanWorkbook === 'function', 'rzorPlan — 마감적용 행(deckPlanRows)만 없고 좌표·덱플랜 읽기는 그대로');
  //  마감텔리 선적 모집단 — 지난 판 마감적용이 리스트 행으로 넣은 제작컨(records `_madeUnit`)만 EDI 밖에서 더한다(종전 회귀 R26 ⑩을 옮김). 다른 리스트 전용 행은 안 든다.
  {
    const T = await import(path.resolve(root, 'src/tallyReport.js'));
    const OB = JSON.parse(fs.readFileSync(path.resolve(root, 'tools/fixtures/closingedi_obwh2762.json'), 'utf8'));
    const base = T.ptkContainers({ key: 'OBWH_2761E', info: OB.info, discharge: {}, loading: JSON.parse(JSON.stringify(OB.loading)) }, 'loading');
    const L = JSON.parse(JSON.stringify(OB.loading));
    L.records.SAWTBP004 = { cn: 'SAWTBP004', mkcon: true, _madeUnit: true, fe: 'F', pol: 'KRPTK', _source: 'R111W STOWAGE PLAN.xlsx', _inList: true, iso: '', size: 45 };
    L.records.TSTU1234567 = { cn: 'TSTU1234567', pol: 'KRPTK', iso: '45G1', fe: 'F', _source: 'extra.xls', _inList: true };
    L.records.SAWTBP009 = { cn: 'SAWTBP009', pol: 'KRPTK', fe: 'F', mkcon: true, _source: 'extra.xls', _inList: true };
    const got = T.ptkContainers({ key: 'OBWH_2761E', info: OB.info, discharge: {}, loading: L }, 'loading');
    const extra = got.filter((c) => !base.some((b) => b.cn === c.cn)).map((c) => c.cn);
    ok(base.length === Object.keys(OB.loading.ediContainers).length && got.length === base.length + 1 && extra.join() === 'SAWTBP004',
      `마감텔리 선적 모집단 — OBWH 2762W EDI ${base.length}대 + 지난 마감적용 제작컨(_madeUnit) SAWTBP004 만 더함 · 리스트 전용 ISO·_madeUnit 없는 제작컨은 안 듦 (${got.length} · 더해진 것 ${extra.join(',') || '없음'})`);
  }
  ok(/if \(!isEdiApplied\(r\)\)[\s\S]{0,520}byHour\[k\]/.test(read('src/components/StatsTab.jsx')), '통계 탭 시간대별 막대는 마감 EDI 적용을 뺀다(종전 그대로)');
  const NL = read('src/nlSearch.js');
  ok(/if \(isEdiApplied\(r\)\) \{ _ediSkip\+\+; continue; \}/.test(NL) && /if \(!byH\.size && !_ediSkip\)/.test(NL), '미르 시간대별 분포도 마감 EDI 적용을 뺀다(종전 그대로)');
  const code = noCmt(read('src/firebase.js'));
  ok((code.match(/!isAutoDone\(prev\)/g) || []).length === 2 && !/!isTermApplied\(prev\)/.test(code), '사람 [완료]·초과 컨의 «이미 완료» 문지기는 isAutoDone 한 벌(마감 EDI 적용도 덮을 수 있다)');
  const CONE = read('public/cone.html');
  const m = CONE.match(/function ctIsTerm\(c\)\{[\s\S]*?\n\}/);
  ok(!!m, '콘앱 ctIsTerm 을 찾았다');
  if (m) {
    const ctIsTerm = new Function(m[0].replace(/\/\/[^\n]*/g, '') + '; return ctIsTerm;')();
    ok(ctIsTerm({ src: 'edi', by: '' }) === true && ctIsTerm({ src: 'term' }) === true && ctIsTerm({ by: '터미널(옛)' }) === true && ctIsTerm({ by: '박철민', at: 1 }) === false && ctIsTerm(null) === false, '콘앱 — 마감 EDI 적용·터미널 반영은 호기 줄로 그리지 않고 검수원 기록만 그린다(종전 그대로)');
  }

  console.log('[3] 실소스 firebase.js — 쓰는 함수는 없고, 남은 마감 EDI 기록은 사람 [완료]가 덮는다(OBWH 2762W 실제 선적)');
  if (!B) { ok(false, 'firebase 번들 경로가 없다'); }
  else {
    const FX = JSON.parse(fs.readFileSync(path.resolve(root, 'tools/fixtures/closingedi_obwh2762.json'), 'utf8'));
    const ymd = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const store = { tallyone_me_today: JSON.stringify({ name: '박철민', ymd }) };
    global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
    global.window = global.window || {}; global.window.alert = () => {}; global.window.dispatchEvent = () => true;
    global.CustomEvent = global.CustomEvent || class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
    global.document = global.document || { createElement: () => ({}) };
    const _warn = console.warn; console.warn = () => {};
    const vk = 'OBWH_2761E';
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const cns = Object.keys(FX.loading.ediContainers);
    const comp0 = clone(FX.loading.completed);
    const ediCns = cns.slice(0, 3), humanCn = cns[3], termCn = cns[4];
    for (const c of ediCns) comp0[c] = { by: '', src: 'edi', at: 1791532080000 };   // 지난 판 마감적용이 남긴 꼴
    comp0[humanCn] = { by: '박철민', at: 1791532090000, equip: '2호기' };
    global.__memdb = { voyages: { [vk]: { info: clone(FX.info), loading: { ediContainers: clone(FX.loading.ediContainers), records: clone(FX.loading.records), completed: comp0 } } } };
    global.__memlog = [];
    const F = require(path.resolve(B));
    const comp = () => global.__memdb.voyages[vk].loading.completed;
    ok(typeof F.fbApplyClosingEdi === 'undefined' && typeof F.fbCompleteContainer === 'function', '번들에 fbApplyClosingEdi 가 없고 fbCompleteContainer 는 있다');
    const a = await F.fbCompleteContainer(vk, 'loading', ediCns[0], '이다른', 'normal', '', '3호기');
    ok(a && a.ok === true && comp()[ediCns[0]].by === '이다른' && comp()[ediCns[0]].equip === '3호기' && !('src' in comp()[ediCns[0]]), '현장 [완료]가 남은 마감 EDI 적용 기록을 사람 기록으로 덮는다');
    const t = await F.fbCompleteContainer(vk, 'loading', termCn, '이다른', 'normal', '', '1호기');
    ok(t && t.ok === true && comp()[termCn].by === '이다른', '터미널 반영 기록도 종전대로 덮는다');
    const b = await F.fbCompleteContainer(vk, 'loading', humanCn, '이다른', 'normal', '', '1호기');
    ok(b && b.ok === false && b.already === true && comp()[humanCn].by === '박철민', '사람이 이미 찍은 컨은 «이미 완료»로 막힌다(덮지 않음)');
    ok(comp()[ediCns[1]].src === 'edi' && comp()[ediCns[2]].src === 'edi' && Object.keys(comp()).length === Object.keys(comp0).length, '건드리지 않은 마감 EDI 기록·나머지 완료는 그대로(지우지 않는다)');
    console.warn = _warn;
  }

  console.log(`\n${fail ? '✗' : '✓'} 4.39 마감적용 없앰 연막검사 — 통과 ${pass} · 실패 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('시험 자체가 죽었다:', e); process.exit(1); });
