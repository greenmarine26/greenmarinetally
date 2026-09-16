// POD 확정 — «자료가 갈릴 때 수석·검수사가 고른 목적지가 EDI 를 이긴다»(3.53) 연막검사.
//   검수사 2026-09-16 «이건을 앱에서 수정할수 있게 해주세요. 다만 일반 검수사가 아니고 저랑 수석만 가능하게»
//   · «갯수가 변경되어야만 계획과 맞습니다» — 즉 **표시가 아니라 대수**를 바꾸는 기능이다.
//   ⚠ 검사는 되도록 **동작**으로 잰다. 3.52-01 감사에서 «글자만 세는 항» 여섯이 변이를 그대로 통과시켰다.
//   인자: [1] 문지기 번들(smoke_podpick_fb.js — 실 firebase.js + SDK 스텁)
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const ROOT = process.argv[2] && !/\.js$/.test(process.argv[2]) ? process.argv[2] : path.resolve(__dirname, '..');
const FBB = process.argv.find((a, i) => i >= 2 && /\.js$/.test(a));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('POD 확정 — 수석·검수사만 · 대수가 바뀐다 (3.53)');

const url = (f) => 'file://' + path.join(ROOT, f).replace(/\\/g, '/');
const run = (expr) => JSON.parse(execSync(`node --input-type=module -e "${expr}"`, { encoding: 'utf8' }).trim());
const U = url('src/utils.js');
const R = url('src/tallyReport.js');

//  ① 판정 한 벌 — 동작으로
const A = run(`import('${U}').then(m=>{const p=m.podConflictOf;const L=x=>x?x.map(y=>y.k+':'+y.label).join('|'):null;console.log(JSON.stringify([`
  + `L(p('KRINC',{pod:'KRPTK'})),`                                        // 0 갈린다 — 후보 둘
  + `L(p('KRPTK',{pod:'KRPTK'})),`                                        // 1 같다 — 물을 것 없다
  + `L(p('',{pod:'KRPTK'})),`                                             // 2 EDI 가 없으면 갈릴 것도 없다
  + `L(p('KRINC',null)),`                                                 // 3 리스트가 없으면 마찬가지
  + `L(p('KRINC',{pod:'KRPTK',pod_pick:'list',pod_pick_label:'KRPTK'})),`  // 4 고른 답이 자료에 있다 — 조용
  + `L(p('KRINC',{pod:'KRINC',pod_pick:'edi',pod_pick_label:'KRINC'})),`   // 5 EDI 를 골랐다 — 조용
  + `L(p('KRINC',{pod:'KRPTK',pod_pick:'list',pod_pick_label:'CNSHA'})),`  // 6 ⛔ 고른 값을 어느 자료도 말하지 않는다 — 다시 묻는다
  + `L(p(' krinc ',{pod:' krptk '}))]))})`);                              // 7 공백·소문자
ok(A[0] === 'edi:KRINC|list:KRPTK', '자료가 갈리면 후보 둘(EDI · 리스트)을 순서대로 낸다');
ok(A[1] === null && A[2] === null && A[3] === null, '같거나 한쪽이 없으면 묻지 않는다');
ok(A[4] === null && A[5] === null, '고른 답이 아직 자료에 있으면 조용하다');
ok(A[6] === 'edi:KRINC|list:KRPTK', '⛔ 고른 값을 어느 자료도 말하지 않으면 **다시 묻는다**(오확정으로 항차 내내 침묵하던 구멍)');
ok(A[7] === 'edi:KRINC|list:KRPTK', '앞뒤 공백·소문자를 편다');

//  ② **대수가 바뀐다** — 실소스 `ptkContainers` 로 잰다(KSKM 2617N 실측 축소본)
const FX = {
  info: { vsl: 'KSKM', voy_d: '2617N' },
  discharge: {
    ediContainers: {
      // 검수사가 짚은 그 컨 — EDI·카토스는 인천, 세관리스트는 평택
      SEGU2430571: { cn: 'SEGU2430571', pol: 'CNXMN', pod: 'KRINC', op: 'KMD', iso: '22G1', fe: 'F', _mode: 'transit' },
      // 정상 평택 양하분
      AAAU1111111: { cn: 'AAAU1111111', pol: 'CNXMN', pod: 'KRPTK', op: 'KMT', iso: '22G1', fe: 'F' },
      // 진짜 통과화물 — 확정 안 했으니 그대로 빠져야 한다
      BBBU2222222: { cn: 'BBBU2222222', pol: 'CNXMN', pod: 'KRINC', op: 'KMD', iso: '22G1', fe: 'F', _mode: 'transit' },
    },
    records: {
      SEGU2430571: { cn: 'SEGU2430571', pod: 'KRPTK', pol: 'CNXMN', op: 'KMT', sl: 'CG072836', _customs: true },
      AAAU1111111: { cn: 'AAAU1111111', pod: 'KRPTK', pol: 'CNXMN', op: 'KMT', _customs: true },
      BBBU2222222: { cn: 'BBBU2222222', pod: 'KRPTK', pol: 'CNXMN', op: 'KMT', _customs: true },
    },
  },
};
const FXP = path.join(require('os').tmpdir(), `smoke_podpick_${process.pid}.json`).replace(/\\/g, '/');
const runFx = (obj) => {
  fs.writeFileSync(FXP, JSON.stringify(obj));
  const r = run(`Promise.all([import('${R}'),import('node:fs')]).then(([m,fsm])=>{`
    + `const v=JSON.parse(fsm.readFileSync('${FXP}','utf8'));`
    + `const cs=m.ptkContainers(v,'discharge');`
    + `console.log(JSON.stringify([cs.length, cs.map(c=>c.cn).sort()]))})`);
  return r;
};
const before = runFx(FX);
ok(before[0] === 1 && before[1].join(',') === 'AAAU1111111',
  `확정 전 — 평택 양하분은 1대뿐이다(EDI 가 인천이라 두 대가 빠진다) [실제 ${before[0]}대]`);
//  검수사가 «리스트 것 KRPTK» 를 고른 상태 그대로
const AFTER = JSON.parse(JSON.stringify(FX));
AFTER.discharge.records.SEGU2430571 = {
  ...AFTER.discharge.records.SEGU2430571,
  pod: 'KRPTK', pod_orig: 'KRPTK', pod_pick: 'list', pod_pick_label: 'KRPTK', pod_picked_by: '김성일', pod_picked_at: 1,
};
const after = runFx(AFTER);
try { fs.unlinkSync(FXP); } catch { /* 안 지워져도 검사는 계속한다 */ }
ok(after[0] === 2 && after[1].join(',') === 'AAAU1111111,SEGU2430571',
  `★ 확정 뒤 — **대수가 1 → 2 로 오른다**(검수사 «갯수가 변경되어야만 계획과 맞습니다») [실제 ${after[0]}대]`);
ok(!after[1].includes('BBBU2222222'),
  '⛔ 확정 안 한 통과화물은 그대로 빠진다 — 리스트에 있다고 저절로 들어오지 않는다');

//  ③ 부르는 자리 점호 — 한 곳만 빠져도 화면·서류·대수가 갈린다(규범 §4-4)
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
const PATHS = [
  ['src/tallyReport.js', 1, '마감텔리 — 대수의 본류'],
  ['src/pages/VoyagePage.jsx', 2, '항차 화면 — 별첨 목록 + 화면 본류 둘 다'],
  ['src/components/SearchPanel.jsx', 1, '검색·끝4자리·자동 가이드'],
  ['src/components/PrintHubModal.jsx', 1, '대외 문서(검수 리스트·VGM)'],
  ['src/workingReport.js', 1, '작업 리포트'],
  ['src/components/VoyageSummaryCard.jsx', 1, '현황 요약 분모'],
  ['src/components/WorkClosingChecklist.jsx', 1, '마감 점검 분모'],
];
for (const [f, n, why] of PATHS) {
  const c = (strip(fs.readFileSync(path.join(ROOT, f), 'utf8')).match(/pod_pick/g) || []).length;
  ok(c >= n, `${f} — 확정을 태운다 (${why}) [pod_pick ${c}회]`);
}
//  ★ ⑩ (재감사 경1) **`cMode` 문지기** — `detailC._mode` 가 `'transit'` 이면 섹션이 통째로 비어
//    정작 그 컨에서 확정 단추가 안 뜬다(재감사 치2). 되돌려도 연막이 전부 통과하던 자리라 여기서 문다.
//    ⚠ 이 항은 글자를 문다 — 진짜 잣대는 컨 상세를 렌더해 `data-pod-pick="ask"` 를 재는 것이고,
//      그 항은 다음 판 몫이다(인계함에 남겼다).
{
  const VPS = fs.readFileSync(path.join(ROOT, 'src/pages/VoyagePage.jsx'), 'utf8');
  ok(/const cMode = \(detailC\._mode === 'discharge' \|\| detailC\._mode === 'loading'\) \? detailC\._mode : mode;/.test(VPS),
    "VoyagePage 의 `cMode` 가 양하·선적일 때만 `_mode` 를 따른다 — 아니면 통과화물 상세가 빈 섹션을 본다");
  ok(!/const cMode = detailC\._mode \|\| mode;/.test(VPS), "⛔ 옛 `cMode = detailC._mode || mode` 가 되살아나면 안 된다");
}
//  ★ ⑪ (재감사 경3) 확정한 컨은 **통과분이 아니다** — 화면 색까지 한 벌(utils 동작으로)
{
  const T = run(`import('${U}').then(m=>{const f=m.isTransitByEdi;console.log(JSON.stringify([`
    + `f({_mode:'transit'}), f({_mode:'transit', pod_pick:'list'}), f({_mode:'discharge'}), f(null)]))})`);
  ok(T[0] === true, '통과 표식이 있으면 통과분이다');
  ok(T[1] === false, '★ 확정한 컨은 통과분이 아니다 — 베이플랜이 «우리 화물» 색을 준다');
  ok(T[2] === false && T[3] === false, '나머지 갈래는 그대로');
}
//  화이트리스트·보호 목록 — 여기 없으면 저장돼도 화면이 못 읽거나 리스트 재업로드가 지운다
const VP = fs.readFileSync(path.join(ROOT, 'src/pages/VoyagePage.jsx'), 'utf8');
const FB = fs.readFileSync(path.join(ROOT, 'src/firebase.js'), 'utf8');
ok(/ALLOWED_LIST_FIELDS = new Set\(\[[\s\S]{0,3000}?'pod_pick'/.test(VP), "VoyagePage ALLOWED_LIST_FIELDS 에 'pod_pick' 이 있다 — 없으면 «확정됨» 을 화면이 못 읽는다");
ok(/_FIELD_WORK_KEYS = \[[\s\S]{0,2000}?'pod_pick'/.test(FB), "firebase _FIELD_WORK_KEYS 에 'pod_pick' 이 있다 — 없으면 리스트 재업로드가 확정을 덮는다");
ok(/_FIELD_WORK_SIGNS = \[[^\]]*'pod_pick'/.test(FB), "firebase _FIELD_WORK_SIGNS 에 'pod_pick' 이 있다 — 없으면 빠진 리스트가 그 컨을 지운다");

//  ④ 문지기 — **실소스 firebase.js 를 불러서** 잰다(이름 grep 이 아니다)
if (!FBB || !fs.existsSync(FBB)) {
  console.log('  ✗ 문지기 번들이 없다 — 검사를 못 돌렸다(건너뜀은 통과가 아니다)');
  fail++;
} else {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  const W = dom.window;
  try { W.eval(fs.readFileSync(FBB, 'utf8')); } catch (e) { console.log('  ✗ 문지기 번들 실행 실패: ' + e.message); fail++; }
  const g = W.__podfb;
  if (!g) { console.log('  ✗ window.__podfb 가 없다'); fail++; } else {
    const call = async (fn, ...a) => { try { await fn(...a); return null; } catch (e) { return e; } };
    (async () => {
      //  명단 — 박진우 검수 / 이현규 부장(수석검수) / 김성일 소유자
      g.setServerRoles({ 박진우: '검수', 이현규: '부장(수석검수)', 김성일: '대리(부수석)' });
      g.clearWorkChoice('박진우'); g.clearWorkChoice('이현규');
      g.saveWorkChoice({ name: '이현규', mode: 'work', voyageKey: 'KSKM_2617N' });
      g.setActiveWorkChoice({ name: '이현규', mode: 'work', voyageKey: 'KSKM_2617N' });
      g.rememberMe('이현규');

      //  ④-A 일반 검수원은 막힌다
      g.writes().length = 0;
      const e1 = await call(g.fbPickPod, 'KSKM_2617N', 'discharge', 'SEGU2430571', 'list', 'KRPTK', '박진우');
      ok(!!(e1 && e1.chiefOnly), '⛔ 일반 검수원은 POD 확정이 막힌다(`err.chiefOnly`)');
      ok(g.writes().length === 0, '⛔ 막혔으면 **한 건도 안 써진다** — 조용히 반쯤 쓰지 않는다');

      //  ④-B 수석은 통과하고, records 에 확정 네 칸이 박힌다
      g.setGets({ 'voyages/KSKM_2617N/discharge/records/SEGU2430571': { cn: 'SEGU2430571', pod: 'KRPTK' } });
      g.writes().length = 0;
      const e2 = await call(g.fbPickPod, 'KSKM_2617N', 'discharge', 'SEGU2430571', 'list', 'KRPTK', '이현규');
      ok(!e2, '수석(부장 수석검수)은 통과한다' + (e2 ? ' — ' + e2.message : ''));
      const rw = g.writes().filter(w => /\/records\//.test(w.path));
      const val = rw.length ? rw[rw.length - 1].value : {};
      ok(rw.length === 1, `records 에 한 번만 쓴다 [실제 ${rw.length}]`);
      ok(val.pod === 'KRPTK' && val.pod_pick === 'list' && val.pod_pick_label === 'KRPTK' && val.pod_picked_by === '이현규' && typeof val.pod_picked_at === 'number',
        'records 에 pod · pod_pick · pod_pick_label · pod_picked_by · pod_picked_at 가 박힌다');
      ok(val.cn === 'SEGU2430571', 'records 에 없던 컨이어도 컨번호를 같이 적는다 — 없으면 화면이 못 읽는다');
      ok(val.pod_orig === 'KRPTK', '`pod_orig` 는 기존 값에서 온다(되돌릴 근거)');
      const ew = g.writes().filter(w => /\/ediContainers\//.test(w.path));
      ok(ew.length === 0, '⛔ EDI 노드가 없으면 아무것도 안 쓴다');

      //  ④-C EDI 노드가 있으면 **표식만** — `pod` 는 절대 안 덮는다
      g.setGets({
        'voyages/KSKM_2617N/discharge/records/SEGU2430571': { cn: 'SEGU2430571', pod: 'KRPTK' },
        'voyages/KSKM_2617N/discharge/ediContainers/SEGU2430571': { cn: 'SEGU2430571', pod: 'KRINC' },
      });
      g.writes().length = 0;
      await call(g.fbPickPod, 'KSKM_2617N', 'discharge', 'SEGU2430571', 'list', 'KRPTK', '이현규');
      const ew2 = g.writes().filter(w => /\/ediContainers\//.test(w.path));
      ok(ew2.length === 1, `EDI 노드에 한 번 쓴다 [실제 ${ew2.length}]`);
      const ev = ew2.length ? ew2[0].value : {};
      ok(!('pod' in ev), '★⛔ **EDI 노드의 `pod` 는 안 덮는다** — 그 칸이 «EDI 가 뭐라 했나» 이고 되돌릴 근거다');
      ok(ev.pod_pick === 'list' && ev.pod_pick_label === 'KRPTK', 'EDI 노드에는 표식만 남는다');

      //  ④-D 소유자도 통과한다
      g.rememberMe('김성일');
      g.saveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'KSKM_2617N' });
      g.setActiveWorkChoice({ name: '김성일', mode: 'work', voyageKey: 'KSKM_2617N' });
      g.writes().length = 0;
      const e4 = await call(g.fbPickPod, 'KSKM_2617N', 'discharge', 'SEGU2430571', 'edi', 'KRINC', '김성일');
      ok(!e4, '소유자(검수사)도 통과한다' + (e4 ? ' — ' + e4.message : ''));

      //  ④-E 「다시 고르기」 — `pod` 를 `pod_orig` 로 되돌리고 표식을 지운다
      g.setGets({ 'voyages/KSKM_2617N/discharge/records/SEGU2430571': { cn: 'SEGU2430571', pod: 'KRINC', pod_orig: 'KRPTK', pod_pick: 'edi' } });
      g.writes().length = 0;
      const e5 = await call(g.fbClearPickPod, 'KSKM_2617N', 'discharge', 'SEGU2430571', '김성일');
      ok(!e5, '확정 해제도 통과한다' + (e5 ? ' — ' + e5.message : ''));
      const cw = g.writes().filter(w => /\/records\//.test(w.path));
      const cv = cw.length ? cw[cw.length - 1].value : {};
      ok(cv.pod_pick === null && cv.pod_picked_by === null, '표식이 지워진다');
      ok(cv.pod === 'KRPTK' && cv.pod_orig === null, '`pod` 가 원래 값으로 되돌아간다 — 그래야 경고가 다시 떠서 그 자리에서 다시 고른다');

      //  ④-F 조회만은 수석이어도 막힌다(문지기 두 겹)
      g.saveWorkChoice({ name: '김성일', mode: 'view' });
      g.setActiveWorkChoice({ name: '김성일', mode: 'view' });
      g.writes().length = 0;
      const e6 = await call(g.fbPickPod, 'KSKM_2617N', 'discharge', 'SEGU2430571', 'list', 'KRPTK', '김성일');
      ok(!!(e6 && e6.viewOnly), '⛔ 조회만이면 수석·검수사여도 막힌다(문지기 두 겹)');
      ok(g.writes().length === 0, '⛔ 조회만에서 막혔으면 한 건도 안 써진다');

      //  ★ ⑤ (2차 시뮬 «부» 수리 ①) **리스트 재업로드가 확정을 못 덮는다** — 동작으로 잰다.
      //    지적 원문: `_FIELD_WORK_KEYS` 주석이 «pod 는 아래에서 조건부로 지킨다» 고 적어 놓고 그 블록이 없어,
      //    세관 리스트를 다시 올리면 `pod` 만 되돌아가고 표식은 살아남아 «확정 — EDI 것 KRINC» 인데 값은 KRPTK 였다.
      //    규격에서 3.47 이 고친 «확정이 모순을 고정시키는 꼴» 그대로다.
      g.rememberMe('이현규'); g.saveWorkChoice({ name: '이현규', mode: 'work', voyageKey: 'KSKM_2617N' });
      g.setActiveWorkChoice({ name: '이현규', mode: 'work', voyageKey: 'KSKM_2617N' });
      const EXIST = { SEGU2430571: { cn: 'SEGU2430571', pod: 'KRINC', pod_orig: 'KRPTK', pod_pick: 'edi', pod_pick_label: 'KRINC' } };
      g.setGets({ 'voyages/KSKM_2617N/discharge/records': EXIST });
      g.writes().length = 0;
      await call(g.fbSaveListRecords, 'KSKM_2617N', 'discharge', { SEGU2430571: { cn: 'SEGU2430571', pod: 'KRPTK', _customs: true } });
      const lw = g.writes().filter(w => /\/records$/.test(w.path));
      const merged = lw.length ? (lw[lw.length - 1].value || {}).SEGU2430571 || {} : {};
      ok(merged.pod === 'KRINC', `★ 리스트를 다시 올려도 **확정한 POD 가 안 뒤집힌다** [실제 ${merged.pod}]`);
      ok(merged.pod_orig === 'KRPTK', '`pod_orig` 도 짝으로 지킨다 — 「다시 고르기」가 돌아갈 곳을 잃지 않는다');

      //  ★ ⑥ (수리 ②) **확정하면 자료검증 경고가 사라진다** — 진단을 실제로 돌려서 잰다.
      //    지적 원문: 확정 뒤에도 «리스트에 EDI 평택과 매칭 안되는 컨 1개» 가 그대로였고
      //    홈 카드는 168 · 마감텔리는 169 를 말했다 — 검수사에겐 «눌렀는데 아무 일도 안 일어났다» 다.
      const EDI = {
        SEGU2430571: { cn: 'SEGU2430571', pod: 'KRINC', pol: 'CNXMN', iso: '22G1', fe: 'F' },
        AAAU1111111: { cn: 'AAAU1111111', pod: 'KRPTK', pol: 'CNXMN', iso: '22G1', fe: 'F' },
      };
      const REC0 = {
        SEGU2430571: { cn: 'SEGU2430571', pod: 'KRPTK', sl: 'CG072836' },
        AAAU1111111: { cn: 'AAAU1111111', pod: 'KRPTK', sl: 'X1' },
      };
      const REC1 = JSON.parse(JSON.stringify(REC0));
      REC1.SEGU2430571 = { ...REC1.SEGU2430571, pod_pick: 'list', pod_pick_label: 'KRPTK' };
      const extraOf = (recs) => {
        const r = g.runDiagnostics({ ediContainers: EDI, listRecords: recs, xrayList: {}, mode: 'discharge' });
        const a = (r.alerts || r || []).find ? (r.alerts || r) : [];
        const hit = [...(a || [])].find(x => x && x.code === 'list_extra');
        return hit ? hit.count : 0;
      };
      const ex0 = extraOf(REC0), ex1 = extraOf(REC1);
      ok(ex0 === 1, `확정 전 — 자료검증이 «매칭 안되는 컨 1개» 라고 말한다 [실제 ${ex0}]`);
      ok(ex1 === 0, `★ 확정 뒤 — **그 경고가 사라진다** [실제 ${ex1}]`);

      //  ★ ⑦ (수리 ③) **헛경고를 안 낸다** — 표기만 다른 같은 항구는 묻지 않는다.
      const P = g.podConflictOf;
      ok(P('PTK', { pod: 'KRPTK' }) === null, '⛔ `PTK` vs `KRPTK` 는 같은 항구 — 묻지 않는다(전수 5,496건이 이 꼴이었다)');
      ok(P('KRPTK', { pod: 'KRPYOTM' }) === null, '⛔ 둘 다 평택이면 대수에 영향이 없다 — 묻지 않는다(1,758건)');
      ok(P('KAN', { pod: 'KRKAN' }) === null, '⛔ `KAN` vs `KRKAN` 도 같은 항구다');
      ok(!!P('KRINC', { pod: 'KRPTK' }), '진짜 다른 항구는 그대로 묻는다');

      //  ★ ⑧ (재감사 «부» 수리) **여섯 자리가 전부 같이 움직이는가** — 다섯이 검사 밖이었다.
      //    재감사 변이 시험: `HomePage.computeStats`·`ChiefDashboard.countPtkSection`·`firebase._ptkCountOfSection`
      //    ·`ValidationBox`·`ediGap` 은 확정 반영을 지워도 통과했다. 이제 **동작으로** 잰다.
      const SEC0 = { ediContainers: EDI, records: REC0, completed: {} };
      const SEC1 = { ediContainers: EDI, records: REC1, completed: {} };
      const six = g.sixCounts ? null : null;   // (아래 각 함수를 직접 부른다)
      const pairs = [
        ['firebase._ptkCountOfSection', g.ptkCountOfSection],
        ['ChiefDashboard.countPtkSection', g.countPtkSection],
        ['HomePage.computeStats.ptk', g.computeStatsPtk],
        ['ValidationBox 평택 EDI', g.validationPtk],
        ['ediGap 평택 EDI', g.ediGapPtk],
      ];
      for (const [nm, fn] of pairs) {
        if (typeof fn !== 'function') { ok(false, `${nm} — 잴 함수가 번들에 없다`); continue; }
        const a = fn(SEC0, 'discharge'), b = fn(SEC1, 'discharge');
        ok(a === 1 && b === 2, `★ ${nm} — 확정하면 1 → 2 로 같이 움직인다 [실제 ${a} → ${b}]`);
      }

      //  ★ ⑨ (재감사 수리 중1) **묻는 방향은 하나다** — «리스트가 평택인데 EDI 가 아닐 때» 만.
      //    세관 `pod` 는 「최종항」, EDI POD 는 「양륙항」이라 «EDI 평택 · 최종항 타항» 은 정상이다.
      //    전수 369건 중 362건이 그 꼴이었고, 누르면 대수가 **잘못 줄었다**(MCSN 622N 443 → 241).
      ok(P('KRPTK', { pod: 'CNDAL' }) === null, '⛔ EDI 평택 · 리스트 최종항 타항 — 묻지 않는다(전수 362건 · 누르면 대수가 잘못 준다)');
      ok(P('KRPTK', { pod: 'VNHPH' }) === null, '⛔ 같은 꼴 하나 더');
      ok(P('KRPUS', { pod: 'VNHPH' }) === null, '⛔ 양쪽 다 평택이 아니면 대수와 무관 — 묻지 않는다');
      ok(!!P('KRINC', { pod: 'KRPTK' }), '★ 리스트가 평택인데 EDI 가 아니다 — **이때만 묻는다**(검수사가 짚은 그 꼴)');
      ok(!!P('KRKAN', { pod: 'KRPTK' }), '같은 꼴 하나 더');

      //  ★ 3.53-01 — **카톡 교체가 원자적인가**(감사 지적 2026-09-17 [치명]).
      //    종전엔 `set(옛키, null)` 뒤에 `set(새키, 값)` 을 따로 보내서, 그 사이에 끊기면
      //    **앞 기록만 사라지고 새 기록은 안 들어갔다** — 되돌릴 근거(`ts_orig`)까지 같이 잃는다.
      //    ⚠ 글자로 세지 않는다. 실소스를 불러 **스텁에 실제로 나간 쓰기**를 본다.
      if (typeof g.fbAddReportsAt === 'function') {
        g.setGets({ 'v/reports/1000': null, 'v/reports/2000': { ts: 2000, type: 'work_status', action: 'loading_start', equip: '1호기', message: '앱 기록' } });
        const before = g.writes().length;
        const r = await g.fbAddReportsAt('v', [{ ts: 1000, type: 'work_status', action: 'loading_start', equip: '1호기', message: '카톡', _replaceKey: '2000' }]);
        const w = g.writes().slice(before);
        const ups = w.filter((x) => x.op === 'update');
        const sets = w.filter((x) => x.op === 'set');
        ok(ups.length === 1 && sets.length === 0,
          `★ 지우기와 넣기가 **한 번의 update** 로 나간다(중간에 끊겨도 둘 다 잃지 않는다) [update ${ups.length} · set ${sets.length}]`);
        const v = (ups[0] || {}).value || {};
        ok(v['2000'] === null, '★ 같은 update 안에서 앞 기록이 null 로 지워진다');
        ok(v['1000'] && v['1000'].ts_orig === 2000 && v['1000']._replacedFrom === '2000',
          '★ 되돌릴 근거(ts_orig·_replacedFrom)가 새 기록에 남는다');
        ok(v['1000'] && v['1000']._replacedMessage === '앱 기록',
          '★ 원 기록의 글도 옮겨 적는다(시각만으로는 무엇이 지워졌는지 모른다)');
        ok(r && r.added === 1 && r.replaced === 1, `★ 셈이 맞는다 [added ${r && r.added} · replaced ${r && r.replaced}]`);

        //  ★ 자기 자신을 지우지 않는다 — `_replaceKey` 가 새 키와 같으면 지우기가 새 값을 덮어쓴다.
        g.setGets({ 'v/reports/3000': null });
        const b2 = g.writes().length;
        const r2 = await g.fbAddReportsAt('v', [{ ts: 3000, type: 'work_status', action: 'loading_done', equip: '1호기', _replaceKey: '3000' }]);
        const v2 = ((g.writes().slice(b2).filter((x) => x.op === 'update')[0]) || {}).value || {};
        ok(v2['3000'] && v2['3000'].ts === 3000 && r2 && r2.replaced === 0,
          `★ 자기교체(_replaceKey === ts)는 지우지 않는다 [replaced ${r2 && r2.replaced} · 값 ${v2['3000'] ? '있음' : '없음'}]`);
      } else ok(false, '카톡 교체 — fbAddReportsAt 가 번들에 없다');

      console.log(fail ? `✗ ${fail}건 실패` : '✓ 전부 통과');
      process.exit(fail ? 1 : 0);
    })().catch((e) => { console.log('✗ 예외: ' + (e && e.stack || e)); process.exit(1); });
  }
}
if (!FBB || !fs.existsSync(FBB)) { console.log(fail ? `✗ ${fail}건 실패` : '✓ 전부 통과'); process.exit(fail ? 1 : 0); }
