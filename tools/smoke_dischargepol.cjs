// 양하 PORT 칸(출발지) — «양하 직전 마지막 항구» 가 지켜지는지 잰다(3.52-01).
//   검수사 2026-09-16 «마감텔리랑 같게 수정 바랍니다» · «양하전 마지막 항구가 SHA 맞으니까요».
//   ⚠ 이 자리를 재는 검사가 **한 건도 없었다** — 3.52 까지 양하 pol 은 아무도 안 쟀다.
//   ⚠ 검사는 되도록 **동작**으로 잰다. 다만 «일곱 경로가 다 지나는가» 는 동작으로 못 재서 소스로 센다.
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || path.resolve(__dirname, '..');
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('양하 PORT 칸 — 되돌아온 화물 (3.52-01)');

const url = (f) => 'file://' + path.join(ROOT, f).replace(/\\/g, '/');
const run = (expr) => JSON.parse(execSync(`node --input-type=module -e "${expr}"`, { encoding: 'utf8' }).trim());
const U = url('src/utils.js');
const R = url('src/tallyReport.js');

//  ① 문 자체 — 동작으로
const A = run(`import('${U}').then(m=>{const p=m.pickDischargePol;console.log(JSON.stringify([`
  + `p('KRPTK','CNSHA','KRPTK'),`      // 0 되돌아온 화물 — 이것만 바뀐다
  + `p('CNSHK','MYPKG','KRPTK'),`      // 1 환적분 — EDI 가 정본(세관은 원적재항)
  + `p('RIZHAO','CNRZH','KRPTK'),`     // 2 같은 항구 다른 표기여도 EDI 그대로
  + `p('KRPTK','CNSHA','VNSGN'),`      // 3 같은 EDI 에 실린 선적분 — 손대지 않는다
  + `p('KRPTK','KRPTK','KRPTK'),`      // 4 리스트도 평택 — 고칠 것이 없다
  + `p('KRPTK','','KRPTK'),`           // 5 리스트가 없으면 그대로
  + `p('','CNSHA','KRPTK'),`           // 6 EDI 가 비면 손대지 않는다(보강은 부르는 쪽 몫)
  + `p('PTK02','CNSHA','KRPTK'),`      // 7 부두번호가 붙어 와도 평택으로 읽는다
  + `p(undefined,undefined,undefined)]))})`);  // 8 빈 입력
ok(A[0] === 'CNSHA', '양하분인데 EDI POL 이 평택 — 되돌아온 화물이라 세관 적재항(SHA)으로 바꾼다');
ok(A[1] === 'CNSHK', '⛔ 환적분은 EDI 가 정본 — 세관 «적재항»(MYPKG)은 원적재항이라 쓰면 안 된다');
ok(A[2] === 'RIZHAO', '⛔ 표기가 달라도(RIZHAO vs CNRZH) EDI 를 건드리지 않는다');
ok(A[3] === 'KRPTK', '⛔ 같은 EDI 에 실린 선적분(POD 타항)은 손대지 않는다 — DJCF 0148S 394대');
ok(A[4] === 'KRPTK' && A[5] === 'KRPTK', '리스트도 평택이거나 리스트가 없으면 그대로');
ok(A[6] === '', 'EDI POL 이 비면 빈 값 그대로 — «EDI 가 비면 리스트» 규칙은 부르는 쪽 것이다(두 벌 금지)');
ok(A[7] === 'CNSHA', 'PTK02 처럼 부두번호가 붙어 와도 평택으로 읽는다');
ok(A[8] === '', '빈 입력에 터지지 않는다');

//  ② 마감텔리 본류 — 실소스 `ptkContainers` 로 PORT 칸을 센다(TMPZ 2022E 실측 축소본)
const FX = {
  info: { vsl: 'TMPZ', voy_d: '2022E' },
  discharge: {
    ediContainers: {
      // 되돌아온 화물 — EDI 가 나갈 때 값(KRPTK)을 들고 왔다
      PHRU8191362: { cn: 'PHRU8191362', pol: 'KRPTK', pod: 'KRPTK', fpod: 'KRPTK', op: 'TJM', iso: '45G1', fe: 'F' },
      // 정상 양하분 — 상해발
      AAAU1111111: { cn: 'AAAU1111111', pol: 'CNSHA', pod: 'KRPTK', op: 'TJM', iso: '45G1', fe: 'F' },
      // 환적분 — 세관은 원적재항을 준다. 바뀌면 안 된다
      BBBU2222222: { cn: 'BBBU2222222', pol: 'CNSHK', pod: 'KRPTK', op: 'TJM', iso: '45G1', fe: 'F' },
      // 같은 EDI 에 실린 선적분 — 평택분이 아니라 마감텔리에 안 들어온다
      CCCU3333333: { cn: 'CCCU3333333', pol: 'KRPTK', pod: 'VNSGN', op: 'TJM', iso: '45G1', fe: 'F' },
    },
    records: {
      PHRU8191362: { cn: 'PHRU8191362', pol: 'CNSHA', pod: 'KRPTK', sl: 'DWS2506221', _customs: true },
      BBBU2222222: { cn: 'BBBU2222222', pol: 'MYPKG', pod: 'KRPTK', _customs: true },
      //  ⚠ 리스트가 «평택 양하» 라고 우기는 선적분 — 문지기가 **EDI 의 pod** 를 봐야 안 넘어간다.
      //    인자를 `recC.pod`·`r.pod` 로 잘못 넘기면 이 컨이 SHA 로 넘어가 검사가 잡는다(변이 시험 실측).
      CCCU3333333: { cn: 'CCCU3333333', pol: 'CNSHA', pod: 'KRPTK', _customs: true },
    },
  },
  //  선적 — M6.94.31 그대로 재현한다. 엠티 선적 엑셀 fallback 파서가 목적지(CNDLC)를 POL 자리에 넣는다.
  //    여기서 리스트 POL 이 EDI 를 덮으면 평택 선적분이 통째로 빠진다(285대 사고).
  loading: {
    ediContainers: {
      DDDU4444444: { cn: 'DDDU4444444', pol: 'KRPTK', pod: 'CNDLC', op: 'TJM', iso: '45G1', fe: 'E' },
    },
    records: {
      DDDU4444444: { cn: 'DDDU4444444', pol: 'CNDLC', pod: 'CNDLC' },
    },
  },
};
//  ⚠ 픽스처는 파일로 넘긴다 — `-e "…"` 안에 JSON 을 박으면 셸 따옴표에 깨진다.
const FXP = path.join(require('os').tmpdir(), `smoke_dpol_${process.pid}.json`).replace(/\\/g, '/');
fs.writeFileSync(FXP, JSON.stringify(FX));
const B = run(`Promise.all([import('${R}'),import('node:fs')]).then(([m,fsm])=>{`
  + `const v=JSON.parse(fsm.readFileSync('${FXP}','utf8'));`
  + `const cs=m.ptkContainers(v,'discharge');const mt=m.buildMatrix(cs,'discharge');`
  + `console.log(JSON.stringify([cs.length,Object.fromEntries(cs.map(c=>[c.cn,c.pol])),mt]))})`);
try { fs.unlinkSync(FXP); } catch { /* 지워지지 않아도 검사는 계속한다 */ }
ok(B[0] === 3, '평택 양하분은 3대 — 대수는 안 변한다(선적분 CCCU 는 애초에 안 들어온다)');
ok(B[1].PHRU8191362 === 'CNSHA', '되돌아온 화물의 PORT 칸이 SHA 가 된다');
ok(B[1].BBBU2222222 === 'CNSHK', '⛔ 환적분은 EDI(SHK) 그대로 — 세관 MYPKG 가 들어오면 안 된다');
ok(B[1].AAAU1111111 === 'CNSHA', '원래 맞던 값은 그대로');
const cell = ((B[2].TJM || {}).SHA || {}).F || {};
ok(cell.HC === 2 && !B[2].TJM.PTK, 'Final Work 에 TJM/PTK 줄이 사라지고 TJM/SHA/F HC 가 2 — 정본과 같은 모양');

//  ③ 일곱 경로가 다 지나는가 — 한 곳만 빠져도 화면과 마감텔리가 갈린다(규범 §4-4, 3.52 감사 재발)
const PATHS = [
  ['src/tallyReport.js', 1, '마감텔리(Final Work·OS·PERFORMANCE·SHIFTING·DAMAGE)'],
  ['src/pages/VoyagePage.jsx', 2, '항차 화면 — 별첨 목록 + 화면 본류 둘 다'],
  ['src/components/SearchPanel.jsx', 1, '검색·끝4자리·자동 가이드'],
  ['src/components/PrintHubModal.jsx', 1, '대외 문서(검수 리스트·VGM·별첨·베이 상세)'],
  ['src/mir.js', 1, '미르·홈 통합검색'],
  ['src/pages/ChiefDashboard.jsx', 1, '수석 보드 컨 상세'],
  ['src/workingReport.js', 1, '작업 리포트 항구 집계'],
];
//  ⚠ 주석 속 이름을 «호출» 로 세면 안 된다 — 주석 처리한 호출도 «있다» 로 통과한다(3.35-01 이 당한 그 패턴).
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
for (const [f, n, why] of PATHS) {
  const s = stripComments(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const c = (s.match(/pickDischargePol\(/g) || []).length;
  ok(c === n, `${f} — ${n}회 호출 (${why}) [실제 ${c}]`);
}

//  ④ 문지기가 살아 있는가 — POL 은 여전히 EDI 가 정본이다(선적 285대 누락 사고의 그 문지기)
const VP = fs.readFileSync(path.join(ROOT, 'src/pages/VoyagePage.jsx'), 'utf8');
const SP = fs.readFileSync(path.join(ROOT, 'src/components/SearchPanel.jsx'), 'utf8');
const PH = fs.readFileSync(path.join(ROOT, 'src/components/PrintHubModal.jsx'), 'utf8');
ok(!/ALLOWED_LIST_FIELDS = new Set\(\[[^\]]*'pol'/s.test(VP), "VoyagePage ALLOWED_LIST_FIELDS 에 'pol' 이 들어가면 안 된다");
//  3.60-04: SearchPanel 은 표를 utils.EDI_PROTECTED_KEYS 한 벌에서 받는다(미르 재료와 같은 표) — 그 표에 pol 이 있어야 한다.
const UT = fs.readFileSync(path.join(ROOT, 'src/utils.js'), 'utf8');
ok(/PROTECTED_EDI = EDI_PROTECTED_KEYS;/.test(SP) && /export const EDI_PROTECTED_KEYS = new Set\(\['pol'/.test(UT), 'SearchPanel PROTECTED_EDI(utils.EDI_PROTECTED_KEYS 한 벌)에 pol 이 그대로 있다');
ok(/PROTECTED_EDI_FIELDS = new Set\(\[\s*\n?\s*'pol'/.test(PH), 'PrintHubModal PROTECTED_EDI_FIELDS 에 pol 이 그대로 있다');
//  선적에서 부르면 안 된다 — 부르는 자리마다 양하 게이트가 붙어 있는가
const GATED = [
  ['src/tallyReport.js', /mode === 'discharge'\) \{ const _dp = pickDischargePol/],
  ['src/pages/VoyagePage.jsx', /mode === 'discharge' && merged\[r\.cn\]\.pol/],
  ['src/pages/VoyagePage.jsx', /mode !== 'discharge' \|\| !ediBase\.pol/],
  ['src/components/SearchPanel.jsx', /m !== 'discharge' \|\| !_e\.pol/],
  ['src/components/PrintHubModal.jsx', /mode !== 'discharge' \|\| !e\.pol/],
  ['src/mir.js', /if \(mode === 'discharge'\) \{\s*\n\s*const _dp = pickDischargePol/],
  ['src/pages/ChiefDashboard.jsx', /boardDetail\.mode === 'discharge' \? pickDischargePol/],
  ['src/workingReport.js', /dlMode === 'disch' && ediC\.pol/],
];
for (const [f, re] of GATED) {
  ok(re.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), `${f} — 양하 게이트가 붙어 있다(선적에서 부르면 285대 누락 재발)`);
}
//  ⚠ workingReport 의 `mode` 는 settlement/actual 이다 — 그것으로 양하를 가르면 그대로 버그다
const WR = fs.readFileSync(path.join(ROOT, 'src/workingReport.js'), 'utf8');
ok(!/mode === 'discharge'[\s\S]{0,80}pickDischargePol/.test(WR), "workingReport 에서 mode(settlement/actual)로 양하를 가르지 않는다");

//  ⑤ **동작으로 잰다** — 순수 함수 둘은 실소스를 묶어 돌린다(감사 지적 2026-09-16).
//    ③·④ 는 «호출이 있는가·게이트 글자가 있는가» 만 세므로 **인자를 뒤바꾸거나 결과를 버려도 통과한다.**
//    실제로 변이 여덟을 심어 보니 여섯이 그대로 통과했다. 그래서 잴 수 있는 것부터 동작으로 바꾼다.
//    ⚠ 하필 이 판에서 가장 조심스러운 코드(`mirCtx` 의 `delete safeR.pol`)가 여기 있다.
const OUT = path.join(require('os').tmpdir(), `smoke_dpol_b_${process.pid}`);
const ESB = fs.existsSync(path.join(ROOT, 'node_modules/.bin/esbuild'))
  ? JSON.stringify(path.join(ROOT, 'node_modules/.bin/esbuild')) : 'npx esbuild';
let bundled = true;
for (const m of ['mirCtx', 'workingReport']) {
  try {
    execSync(`${ESB} ${JSON.stringify(path.join(ROOT, 'src', (m === 'mirCtx' ? 'mir' : m) + '.js'))} --bundle --platform=node --format=cjs --outfile=${JSON.stringify(OUT + '_' + m + '.cjs')} --log-level=error`,
      { stdio: 'pipe' });
  } catch (e) { bundled = false; console.log('  ✗ 실소스 번들 실패 — ' + m + ' : ' + String(e.message || e).slice(0, 200)); fail++; }
}
if (bundled) {
  const MC = require(OUT + '_mirCtx.cjs');
  const WR = require(OUT + '_workingReport.cjs');
  const V = { TMPZ_2022E: FX };
  const flat = MC.flattenVoyages(V);
  const pick = (cn, md) => (flat.find(x => x.cn === cn && x._mode === md) || {});
  ok(pick('PHRU8191362', 'discharge').pol === 'CNSHA', '미르·홈 — 되돌아온 화물은 SHA 로 답한다');
  ok(pick('BBBU2222222', 'discharge').pol === 'CNSHK', '⛔ 미르·홈 — 환적분은 EDI(SHK) 그대로. 세관 원적재항(MYPKG)이 새면 안 된다');
  ok(pick('AAAU1111111', 'discharge').pol === 'CNSHA', '미르·홈 — 원래 맞던 값은 그대로');
  ok(pick('CCCU3333333', 'discharge').pol === 'KRPTK',
    '⛔ 미르·홈 — 같은 EDI 의 선적분은 PTK 그대로. 문지기가 **EDI 의 pod** 를 봐야 한다(리스트는 평택이라 우긴다)');
  ok(pick('DDDU4444444', 'loading').pol === 'KRPTK', '⛔ 미르·홈 — 선적은 EDI(PTK) 그대로. 리스트 CNDLC 가 덮으면 285대 누락 재발이다');
  //  ⚠ 이 문서는 결제용에서 **records 의 컨만** 센다(평택 필터를 따로 안 건다) — 그래서 픽스처의
  //    선적분 CCCU 도 한 줄로 선다. 그것이 PTK 로 **남아 있어야** pod 문지기가 산 증거다.
  const bk = WR.buildBuckets(FX, 'settlement');
  const cell = (b, port) => ((((b.TJM || {})[port] || {}).HC) || { F: 0 }).F;
  const d = bk.disch || {};
  ok(cell(d, 'SHA') === 1, `작업 리포트 — 되돌아온 화물이 SHA 로 옮겨 온다 [실제 ${cell(d, 'SHA')}]`);
  ok(cell(d, 'SHK') === 1, `⛔ 작업 리포트 — 환적분은 SHK 그대로(세관 MYPKG 아님) [실제 ${cell(d, 'SHK')}]`);
  ok(cell(d, 'PTK') === 1, `⛔ 작업 리포트 — 같은 EDI 의 선적분은 PTK 그대로 — pod 문지기가 살아 있다 [실제 ${cell(d, 'PTK')}]`);
  const l = bk.load || {};
  ok(!!((l.TJM || {}).DLC), '작업 리포트 — 선적은 종전대로 POD(DLC) 로 선다');
  for (const m of ['mirCtx', 'workingReport']) { try { fs.unlinkSync(OUT + '_' + m + '.cjs'); } catch { /* 남아도 검사는 끝났다 */ } }
}

console.log(fail ? `✗ ${fail}건 실패` : '✓ 전부 통과');
process.exit(fail ? 1 : 0);
