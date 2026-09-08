// 콘앱이 그리는 자리가 검수앱과 같은 자리인지 실데이터로 재는 연막검사 (ConeOne 2.44).
//
//  왜 있는가 — 검수사 2026-09-09 «선적지점이 서로 틀리다는겁니다. 검수앱은 빈칸없이 선적이 되는데
//  콘앱은 실시간 저장이 계획된 컨으로 지정 되는것 같습니다». 검수앱은 구독 콜백에서
//  applyCatosPos(터미널 자리) → applyAutoSwap(밀려난 계획 컨을 비운 자리로 맞교환)을 돌리는데,
//  콘앱은 보관소를 따로 읽는 독립 화면이라 그 덧칠을 못 받아 계획 자리에 그대로 그렸다.
//  ⇒ 콘앱이 같은 두 함수를 같은 차례로 돌리고, 자리 판정을 ctPosOf 한 벌로 모았는지 잰다.
//
//  ⚠ 검사 기준은 «코드가 내는 값»이 아니라 **검수앱이 그리는 자리**(utils.effectivePos)다 — 두 앱이
//    같은 자리를 그려야 한다는 것이 곧 검수사가 말한 규칙이다(규범 §6-1).
//  ⚠ 판정은 옮겨 적지 않는다 — cone.html 소스에서 함수를 **그대로 꺼내** 돌린다(규범 §6-2).
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_conepos.cjs <utils번들.cjs>'); process.exit(1); }
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'public/cone.html'), 'utf8');
const LIVE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/conepos_live.json'), 'utf8'));

let fail = 0;
let pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };

console.log('콘앱 자리 — 검수앱과 한 벌인가');

// ── cone.html 소스에서 함수를 그대로 꺼낸다
function grab(name) {
  const i = SRC.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('못 찾음: ' + name);
  let d = 0;
  for (let k = SRC.indexOf('{', i); k < SRC.length; k++) {
    if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) return SRC.slice(i, k + 1); }
  }
  throw new Error('괄호가 안 닫힘: ' + name);
}

// ① 판정이 한 벌인가 — 자리를 읽는 곳이 ctPosOf 하나뿐이어야 한다(§4-4)
//    ⚠ 이름(`r.bay_actual`)으로 세면 변수명만 바꿔 둘째 벌을 되살려도 안 걸린다(감사 실측) —
//      **주석이 아닌 모든 줄**에서 자리 필드를 읽는 줄을 세고, 그 줄이 전부 ctPosOf 안에 있는지 본다.
//    ⚠ 덩이 주석(/* … */) 안 설명 줄도 «코드»로 세면 안 된다 — 줄 수는 유지한 채 지운다.
const LINES = SRC.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).split('\n');
const isCode = (l) => !/^\s*(\/\/|\*|\/\*)/.test(l);
const posFieldRe = /(bay|row|tier)_(actual|assign)/;
const posLines = LINES.map((l, i) => [i + 1, l]).filter(([, l]) => isCode(l) && posFieldRe.test(l));
const fnStart = LINES.findIndex(l => l.startsWith('function ctPosOf(')) + 1;
const fnEnd = (() => { let d = 0; for (let i = fnStart - 1; i < LINES.length; i++) { for (const ch of LINES[i]) { if (ch === '{') d++; else if (ch === '}') d--; } if (d === 0 && i >= fnStart) return i + 1; } return -1; })();
const outside = posLines.filter(([n]) => n < fnStart || n > fnEnd);
ok(fnStart > 0 && fnEnd > fnStart, `ctPosOf(자리 판정 한 벌)가 있다 (${fnStart}~${fnEnd}행)`);
ok(outside.length === 0, `자리를 읽는 줄이 전부 ctPosOf 안에 있다 (밖 ${outside.length}줄)` + (outside.length ? '\n      ' + outside.map(([n, l]) => `${n}: ${l.trim().slice(0, 88)}`).join('\n      ') : ''));
//    그리는 네 자리가 정말 그 한 벌을 부르는가 — 안 부르고 제 계산을 하면 위 검사는 통과하고 화면만 갈린다
for (const [who, re] of [['콘 줄 그림 ctAppPos', /function ctAppPos\(mode, cn\)\{ return ctPosOf\(/],
                         ['트윈 전체화면 twCells', /const q = ctPosOf\(mode, cn, r\);/],
                         ['쌓은 그림', /const q=ctPosOf\(c\.mode, cn, r\);/],
                         ['베이플랜 _bvActual', /const q = ctPosOf\(mode, cn, null\);/]]) {
  ok(re.test(SRC), `${who} 가 ctPosOf 를 부른다`);
}
//    ⚠ **부르는 줄이 있다는 것만으로는 모자란다**(감사 실측) — 그 줄을 바이트 그대로 두고 **뒤에서 덮으면**
//      위 검사도 ①의 줄 위치 검사도 다 통과하고 화면만 옛날로 돌아간다.
//      그래서 ㉠ 그리는 네 자리 **안에 다른 자리 원천(`ctPos(`)이 못 오게** 막고(아래) ㉡ 그림을 **실제로 돌려** 본다(⑤).
{
  const body = (re, who) => { const m = SRC.match(re); ok(!!m, `${who} 를 소스에서 꺼냈다`); return m ? m[0] : ''; };
  const sites = [
    ['트윈 전체화면 twCells', body(/function twCells\(mode, own, shadow\)\{[\s\S]*?\n\}/, '트윈 전체화면')],
    ['쌓은 그림', body(/let stripRow='';\n[\s\S]*?if\(lines\.length\) stripRow = [^\n]*\n\s*\}/, '쌓은 그림')],
    ['베이플랜 _bvActual', body(/const _bvActual = \(mode, cn\)=>\{[\s\S]*?\n  \};/, '베이플랜 자리 함수')],
  ];
  for (const [who, src] of sites) {
    const lines = src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(isCode);
    const other = lines.filter(l => /\bctPos\(/.test(l) || posFieldRe.test(l));
    ok(other.length === 0, `${who} 안에 다른 자리 원천이 없다 — 부르고 나서 덮는 길을 막는다 (${other.length}줄)` + (other.length ? '\n      ' + other.map(l => l.trim().slice(0, 84)).join('\n      ') : ''));
  }
}
//    호출·원본·내보내기 — 주석 처리하거나 import 줄에만 있는 것을 통과로 세지 않는다(감사 실측)
for (const fn of ['ctPosOf', 'twCells', 'ctApplySwap', 'ctPos']) {
  const n = (SRC.match(new RegExp('^function ' + fn + '\\(', 'gm')) || []).length;
  ok(n === 1, `${fn} 선언이 하나뿐이다 (${n}개) — 뒤에 또 선언하면 브라우저는 나중 것을 쓴다`);
}
ok(LINES.some(l => isCode(l) && /(^|[^/])\bctApplySwap\(\);/.test(l)), 'ctApplySwap 을 갱신마다 부른다(주석 아닌 줄)');
ok(/CT\.recRaw = \{discharge:rD, loading:rL\}/.test(SRC), '받은 records 는 덧칠 전 원본(CT.recRaw)으로 둔다');
const ENTRY = fs.readFileSync(path.join(ROOT, 'src/coneCargoPlan.entry.jsx'), 'utf8');
const coneParse = (ENTRY.match(/window\.ConeParse\s*=\s*\{[^}]*\}/) || [''])[0];
ok(/applyCatosPos/.test(coneParse) && /applyAutoSwap/.test(coneParse), '번들의 window.ConeParse 가 두 함수를 내보낸다(import 줄만 있는 것은 안 된다)');

// ── 꺼낸 함수를 돌릴 자리
const CT = { rec: {}, tw: {} };
let PLAN = {};
const ctPlanRows = (m) => PLAN[m] || [];
const ctPos = new Function('return ' + grab('ctPos'))();
const ctPosOf = new Function('CT', 'ctPlanRows', 'ctPos', grab('ctPosOf') + '; return ctPosOf;')(CT, ctPlanRows, ctPos);

// ── 옛 콘앱 판정(2.43): 실체 → 터미널 자리(실린 것인지 안 봄) → 계획. 정해 준 자리(assign)는 모른다.
function oldPos(mode, cn, p) {
  const r = (CT.rec[mode] || {})[cn];
  let bay = parseInt(p.bay, 10), row = String(p.row || '').padStart(2, '0'), tier = parseInt(p.tier, 10);
  if (r && r.bay_actual != null && String(r.bay_actual) !== '' && !String(r.bay_actual).startsWith('__')) {
    bay = parseInt(r.bay_actual, 10); row = String(r.row_actual || '').padStart(2, '0'); tier = parseInt(r.tier_actual, 10);
  } else {
    const tw = (CT.tw[mode] || {})[cn]; const q = tw && ctPos(tw.pos);
    if (q) { bay = q.bay; row = String(q.row).padStart(2, '0'); tier = q.tier; }
  }
  if (!(bay > 0) || !(tier >= 0)) return null;
  return { bay, row, tier };
}
const K = (q) => (q ? `${q.bay}_${q.row}_${String(q.tier).padStart(2, '0')}` : '');
const overlap = (m) => { const c = {}; for (const k of Object.values(m)) if (k) c[k] = (c[k] || 0) + 1; return Object.values(c).reduce((s, n) => s + n - 1, 0); };

let anyDiff = 0;
for (const [tag, sec] of Object.entries(LIVE)) {
  const [key, mode] = tag.split('|');
  const { ediContainers: edi, records: recs, termWork: tw, completed: comp } = sec;
  const mk = () => ({ [mode]: { ediContainers: edi, records: recs, termWork: tw, completed: comp } });

  //  검수앱이 그리는 자리 — 구독 콜백과 같은 차례, 그림은 effectivePos 로 정해진다
  const appRec = U.applyAutoSwap(U.applyCatosPos(mk()))[mode].records;
  const APP = {};
  for (const cn of Object.keys(edi)) {
    const e = U.effectivePos({ ...edi[cn], ...(appRec[cn] || {}) });
    APP[cn] = e.bay ? `${parseInt(e.bay, 10)}_${String(e.row).padStart(2, '0')}_${String(e.tier).padStart(2, '0')}` : '';
  }

  PLAN = {}; PLAN[mode] = Object.values(edi);
  //  새 콘앱 — ctApplySwap 이 한 것과 같은 상태
  CT.rec = {}; CT.tw = {}; CT.tw[mode] = tw;
  CT.rec[mode] = U.applyAutoSwap(U.applyCatosPos(mk()))[mode].records;
  const NEW = {}; for (const cn of Object.keys(edi)) NEW[cn] = K(ctPosOf(mode, cn, edi[cn]));
  //  옛 콘앱
  CT.rec = {}; CT.rec[mode] = recs;
  const OLD = {}; for (const cn of Object.keys(edi)) OLD[cn] = K(oldPos(mode, cn, edi[cn]));

  const missOld = Object.keys(edi).filter(cn => OLD[cn] !== APP[cn]);
  const missNew = Object.keys(edi).filter(cn => NEW[cn] !== APP[cn]);
  anyDiff += missOld.length;
  console.log(`\n  ■ ${key} ${mode === 'loading' ? '선적' : '양하'} — 계획 ${Object.keys(edi).length}대 · 실적 ${Object.keys(tw).length}대`);
  console.log(`     검수앱과 다른 자리 : 옛 ${missOld.length}대 → 새 ${missNew.length}대`);
  console.log(`     한 자리에 겹친 컨   : 옛 ${overlap(OLD)}대 → 새 ${overlap(NEW)}대 (검수앱 ${overlap(APP)}대)`);
  if (missOld.length) {
    const bays = {}; for (const cn of missOld) { const b = (OLD[cn] || '?').split('_')[0]; bays[b] = (bays[b] || 0) + 1; }
    console.log('     옛 판정이 틀린 베이 :', Object.entries(bays).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([b, n]) => `${b}번 ${n}대`).join(' · '));
  }
  ok(missNew.length === 0, `${key} ${mode} — 콘앱 자리가 검수앱과 한 칸도 안 다르다` + (missNew.length ? ' | 보기 ' + missNew.slice(0, 3).map(cn => `${cn} 콘 ${NEW[cn]} ≠ 앱 ${APP[cn]}`).join(' · ') : ''));
  ok(overlap(NEW) <= overlap(APP), `${key} ${mode} — 겹친 칸이 검수앱보다 많지 않다`);
}
//  ⚠ 이 검사가 «다 맞다» 로 조용히 통과하면 안 된다 — 옛 판정과 새 판정이 애초에 같으면
//    픽스처가 이 사건을 못 담은 것이다(그런 픽스처로는 회귀를 못 잡는다).
ok(anyDiff > 0, `픽스처가 실제 어긋남을 담고 있다 (옛 판정 어긋남 ${anyDiff}대)`);

// ② ctApplySwap 을 소스에서 그대로 꺼내 **두 번 돌린다** — 덧칠본 위에 또 덧칠하면 안 된다.
//    상황이 바뀌어 더 이상 밀려나지 않은 컨에 지난 판의 `bay_assign` 이 남으면 컨이 엉뚱한 자리에 선다.
//    받은 그대로(CT.recRaw)에서 매번 새로 얹으면 그런 잔재가 안 생긴다.
{
  const tag = 'STSE_2669E|loading', mode = 'loading', sec = LIVE[tag];
  const CT2 = { rec: {}, tw: {}, comp: {}, recRaw: {} };
  const PLAN2 = { loading: Object.values(sec.ediContainers) };
  global.window.ConeParse = { applyCatosPos: U.applyCatosPos, applyAutoSwap: U.applyAutoSwap };
  const ctApplySwap = new Function('CT', 'ctPlanRows', 'window',
    grab('ctApplySwap') + '; return ctApplySwap;')(CT2, (m) => PLAN2[m] || [], global.window);

  CT2.recRaw = { loading: sec.records, discharge: {} };
  CT2.tw = { loading: sec.termWork, discharge: {} };
  CT2.comp = { loading: sec.completed, discharge: {} };
  ctApplySwap();
  const first = Object.entries(CT2.rec.loading).filter(([, r]) => r && r.bay_assign != null).length;
  ok(first > 0, `첫 판에서 밀려난 계획 컨에 자리를 정해 준다 (${first}대)`);

  //  실적이 통째로 사라진 상황(다른 항차를 고른 직후 등) — 정해 준 자리도 같이 사라져야 한다
  CT2.tw = { loading: {}, discharge: {} };
  CT2.comp = { loading: {}, discharge: {} };
  ctApplySwap();
  const left = Object.entries(CT2.rec.loading).filter(([, r]) => r && r.bay_assign != null).length;
  ok(left === 0, `실적이 없어지면 지난 판의 정해 준 자리가 안 남는다 (남은 ${left}대)`);

  //  받은 그대로(recRaw)는 몇 판을 돌려도 한 글자도 안 바뀌어야 한다 — 여기가 오염되면 되돌릴 곳이 없다
  const before = JSON.stringify(sec.records);
  CT2.recRaw = { loading: sec.records, discharge: {} };
  for (const n of [80, 160, 295, 0, 295]) {
    const cut = Object.fromEntries(Object.entries(sec.termWork).slice(0, n));
    CT2.tw = { loading: cut, discharge: {} }; CT2.comp = { loading: cut, discharge: {} };
    ctApplySwap();
  }
  ok(JSON.stringify(sec.records) === before, '몇 판을 돌려도 받은 원본(CT.recRaw)이 안 바뀐다');
}

// ③ 차례와 문지기를 **성질로** 잰다 — 코드의 규칙을 옮겨 적지 않는다.
//    (감사 실측 — 종전 검사는 term 갈래 제거·차례 뒤집기·`__` 문지기 제거·`at` 문지기 제거를 하나도 못 잡았다.)
console.log('\n  ■ 자리 차례·문지기 — 성질 검사');
{
  const P = { bay: '30', row: '02', tier: '82' };            // 계획 자리
  const T = { at: 1, pos: '100482' };                        // 터미널 실적 10-04-82
  const A = { bay_actual: '20', row_actual: '06', tier_actual: '84' };
  const G = { bay_assign: '40', row_assign: '08', tier_assign: '86' };
  const at = (rec, tw) => { CT.rec = { loading: rec ? { X: rec } : {} }; CT.tw = { loading: tw ? { X: tw } : {} }; PLAN = { loading: [{ cn: 'X', ...P }] }; return ctPosOf('loading', 'X', { cn: 'X', ...P }); };
  const eq = (q, b, r, t, src) => !!q && q.bay === b && q.row === r && q.tier === t && q.src === src;

  ok(eq(at(null, null), 30, '02', 82, 'plan'), '아무것도 없으면 계획 자리');
  ok(eq(at(null, T), 10, '04', 82, 'term'), '실적만 있으면 터미널이 준 자리');
  ok(eq(at({ ...A }, T), 20, '06', 84, 'actual'), '실체가 터미널보다 세다');
  ok(eq(at({ ...G }, T), 40, '08', 86, 'assign'), '정해 준 자리가 터미널보다 세다 — 차례가 검수앱과 같다');
  ok(eq(at({ ...A, ...G }, T), 20, '06', 84, 'actual'), '실체가 정해 준 자리보다 세다');
  //  임시창고 표식(`__STG__`)은 자리가 아니다 — 숫자로도 안 읽히고 문지기로도 걸러, 두 겹으로 막힌다.
  //  ⚠ 여기서 검수앱과 **한 가지는 다르다** — 검수앱 `effectivePos` 는 창고에 있는 컨을 «자리 없음»으로 두고 아예 안 그리는데,
  //    콘앱은 종전(2.43)부터 다음 차례(정해 준 자리 → 계획)로 넘어가 그린다. 이번 판이 만든 차이가 아니고
  //    실데이터에 창고 컨이 0건이라 지금 화면 차이는 없다. 고치는 것은 다음 판 몫이다(인계함).
  const stg = at({ bay_actual: '__STG__', row_actual: '00', tier_actual: '00', ...G }, T);
  ok(eq(stg, 40, '08', 86, 'assign'), '임시창고 표식은 자리가 아니다 — 다음 차례로 넘어간다(종전과 같다)');
  ok(!!stg && stg.bay !== 0 && Number.isFinite(stg.bay), '임시창고 표식이 베이 번호로 새지 않는다');
  ok(eq(at(null, { pos: '100482' }), 30, '02', 82, 'plan'), '아직 안 실은 예약 행(시각 없음)은 자리로 안 쓴다');
  ok(at(null, { at: 1, pos: '0' }) && at(null, { at: 1, pos: '0' }).src === 'plan', '읽을 수 없는 자리 문자열은 계획으로 물러난다');
  CT.rec = {}; CT.tw = {}; PLAN = {};
  ok(ctPosOf('loading', 'X', null) === null, '계획도 실적도 없으면 null — 없는 자리를 지어내지 않는다');
}

// ④ 「시각 없는 예약 행」을 실데이터로 — SWTD 9012E 양하 918행 중 94행이 시각 없이 자리만 온다.
//    2.43 은 그 94대를 터미널 예약 칸에 세웠다. 검수앱은 안 세운다(utils.applyCatosPos 의 같은 문).
{
  const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/termapply_swtd.json'), 'utf8'));
  const tw = FX.termWork;
  const noAt = Object.keys(tw).filter(cn => !tw[cn].at && tw[cn].pos);
  const withAt = Object.keys(tw).filter(cn => tw[cn].at && tw[cn].pos);
  ok(noAt.length > 0 && withAt.length > 0, `픽스처에 시각 없는 행이 실제로 있다 (없음 ${noAt.length} · 있음 ${withAt.length})`);
  //  계획은 전부 99번 베이로 둔다 — 터미널 자리를 썼는지 안 썼는지가 한눈에 갈린다
  const plan = Object.keys(tw).map(cn => ({ cn, bay: '99', row: '00', tier: '02' }));
  PLAN = { discharge: plan }; CT.rec = { discharge: {} }; CT.tw = { discharge: tw };
  const byCn = Object.fromEntries(plan.map(p => [p.cn, p]));
  const badNo = noAt.filter(cn => { const q = ctPosOf('discharge', cn, byCn[cn]); return !q || q.bay !== 99; });
  const badYes = withAt.filter(cn => { const q = ctPosOf('discharge', cn, byCn[cn]); return !q || q.bay === 99; });
  ok(badNo.length === 0, `시각 없는 ${noAt.length}대는 전부 계획 칸에 선다 (어긴 ${badNo.length}대)`);
  ok(badYes.length === 0, `실은 ${withAt.length}대는 전부 터미널이 준 칸에 선다 (어긴 ${badYes.length}대)`);
}

// ⑤ **그리는 자리를 실제로 돌린다** — 부르는 줄만 보면 «부르고 나서 덮는» 되돌림을 못 잡는다(감사 실측).
//    검수사가 항의한 화면이 바로 이 둘이다 — 트윈 전체화면과 베이플랜.
console.log('\n  ■ 그리는 자리 — 정해 준 자리가 그림에 나오는가');
{
  //  한 대: 계획은 21-04-84, 제 자리를 뺏겨 «정해 준 자리»가 21-06-84. 아직 안 실었다(termWork 에 없다).
  //  ⚠ 세 자리의 **베이를 서로 다르게** 둔다(계획 21 · 정해 준 자리 19 · 터미널 23) — 같은 베이로 두면
  //    «베이만 계획으로 되돌리는» 되돌림이 원리적으로 안 보인다(감사 실측 N2·N8).
  const plan = [{ cn: 'ABCU1234567', bay: '21', row: '04', tier: '84', size: '20' }];
  const rec = { ABCU1234567: { cn: 'ABCU1234567', bay_assign: '19', row_assign: '06', tier_assign: '84', assign_by: 'auto', _assign_src: 'autoswap' } };
  //  ⚠ 터미널은 **다른 자리**(21-02-84)를 말하고 있다 — 정해 준 자리가 그것보다 세다.
  //    이렇게 두면 «ctPosOf 를 부르고 나서 옛 갈래로 덮는» 되돌림이 칸을 움직여 잡힌다(감사 실측 B1·D1).
  const twSay = { ABCU1234567: { at: 1, pos: '230284' } };
  const setup = (mode) => { PLAN = { [mode]: plan }; CT.rec = { [mode]: rec }; CT.tw = { [mode]: twSay }; CT.comp = { [mode]: {} }; };

  //  ── 트윈 전체화면
  setup('loading');
  const twCells = new Function('CT', 'ctPlanRows', 'ctPosOf', grab('twCells') + '; return twCells;')(CT, ctPlanRows, ctPosOf);
  const cells = twCells('loading', new Set([19, 21, 23]), new Set());
  ok(!!(cells['84'] && cells['84']['06'] && cells['84']['06'].cn === 'ABCU1234567'), '트윈 전체화면 — 정해 준 자리(19-06-84)에 그린다');
  ok(!(cells['84'] && cells['84']['04']), '트윈 전체화면 — 뺏긴 계획 자리(21-04-84)에는 안 그린다');
  ok(!(cells['84'] && cells['84']['02']), '트윈 전체화면 — 터미널이 말한 자리(23-02-84)로 안 밀린다');
  //  반쪽 소속(어느 베이 상자에 들어가나)도 정해 준 자리를 따라야 한다 — 계획 베이만 있는 상자에는 안 나온다
  ok(Object.keys(twCells('loading', new Set([21]), new Set())).length === 0, '트윈 전체화면 — 계획 베이(21) 상자에는 안 담긴다');
  ok(Object.keys(twCells('loading', new Set([19]), new Set())).length === 1, '트윈 전체화면 — 정해 준 베이(19) 상자에 담긴다');

  //  ── 베이플랜(_bvActual)
  const bvSrc = (SRC.match(/const _bvActual = \(mode, cn\)=>\{[\s\S]*?\n  \};/) || [''])[0];
  ok(!!bvSrc, '베이플랜 자리 함수를 소스에서 그대로 꺼냈다');
  const _bvActual = new Function('CT', 'ctPosOf', '_bvSame', bvSrc + '\n return _bvActual;')(CT, ctPosOf, true);
  setup('loading');
  const bv = _bvActual('loading', 'ABCU1234567');
  ok(!!bv && bv.bay === '19' && bv.row === '06' && bv.tier === '84' && bv.src === 'assign', '베이플랜 — 정해 준 자리로 옮겨 그린다(' + JSON.stringify(bv) + ')');
  //  아직 안 실은 예약 행은 자리가 아니다 — 2.43 은 여기서 예약 칸으로 옮겼다
  CT.rec = { loading: {} }; CT.tw = { loading: { ABCU1234567: { pos: '100482' } } };
  ok(_bvActual('loading', 'ABCU1234567') === null, '베이플랜 — 시각 없는 예약 행으로는 안 옮긴다');

  //  ── **부르는 쪽까지 실데이터로.** 되돌림을 `_bvActual` 안이 아니라 **부르는 `pushRows` 에** 두면
  //     위 검사가 다 통과하고 화면만 옛날로 돌아간다(감사 실측 N1 — 겹침 0 → 59칸 부활).
  //     그래서 그 자리를 그대로 꺼내 STSE 2669E 선적을 통째로 돌리고, **겹친 칸이 0인지** 본다 —
  //     검수사 확정 «지금처럼 검은곳이나 흰곳이 있으면 안됩니다. 그리고 컨테이너가 겹쳐 있어도 안됩니다»가 곧 기준표다.
  const prSrc = (SRC.match(/const pushRows=\(rows,flag\)=>\{[\s\S]*?\n {2}\} \};/) || [''])[0];
  ok(!!prSrc, '베이플랜이 자리를 얹는 자리(pushRows)를 소스에서 그대로 꺼냈다');
  const sec = LIVE['STSE_2669E|loading'];
  const mk = () => ({ loading: { ediContainers: sec.ediContainers, records: sec.records, termWork: sec.termWork, completed: sec.completed } });
  const appRec2 = U.applyAutoSwap(U.applyCatosPos(mk())).loading.records;
  const APP2 = {};
  for (const cn of Object.keys(sec.ediContainers)) {
    const e = U.effectivePos({ ...sec.ediContainers[cn], ...(appRec2[cn] || {}) });
    APP2[cn] = e.bay ? `${parseInt(e.bay, 10)}_${String(e.row).padStart(2, '0')}_${String(e.tier).padStart(2, '0')}` : '';
  }
  PLAN = { loading: Object.values(sec.ediContainers) };
  CT.rec = { loading: appRec2 }; CT.tw = { loading: sec.termWork }; CT.comp = { loading: sec.completed };
  const allRows = [];
  const bag = new Function('CT', 'ctPosOf', '_bvSame', 'allRows',
    bvSrc + '\n let _bvMoved = 0, _bvAssign = 0;\n' + prSrc + '\n return { pushRows, moved: () => _bvMoved, assign: () => _bvAssign };')(CT, ctPosOf, true, allRows);
  bag.pushRows(Object.values(sec.ediContainers), 'l');
  const drawn = {}; const seen = {};
  for (const { r } of allRows) {
    const k = `${parseInt(r.bay, 10)}_${String(r.row).padStart(2, '0')}_${String(r.tier).padStart(2, '0')}`;
    drawn[r.cn] = k; seen[k] = (seen[k] || 0) + 1;
  }
  const over = Object.values(seen).reduce((s, n) => s + n - 1, 0);
  const diff = Object.keys(APP2).filter(cn => drawn[cn] !== APP2[cn]);
  ok(allRows.length === Object.keys(sec.ediContainers).length, `베이플랜이 계획 ${Object.keys(sec.ediContainers).length}대를 다 얹는다 (${allRows.length}대)`);
  ok(over === 0, `베이플랜에 겹친 칸이 없다 (겹침 ${over}칸) — 검수사 «컨테이너가 겹쳐 있어도 안됩니다»`);
  ok(diff.length === 0, `베이플랜이 그린 자리가 검수앱과 한 칸도 안 다르다 (다른 ${diff.length}대)` + (diff.length ? ' | 보기 ' + diff.slice(0, 3).map(cn => `${cn} 콘 ${drawn[cn]} ≠ 앱 ${APP2[cn]}`).join(' · ') : ''));
  ok(bag.assign() > 0, `머리글이 «정해 준 자리»를 갈라 센다 (${bag.assign()}대 / 옮긴 ${bag.moved()}대)`);
}

// ⑥ 못 했으면 화면이 말하는가 — 이 판이 새로 넣은 안전장치(§4-3)를 실제로 없애 보고 잰다.
console.log('\n  ■ 조용히 실패하지 않는가');
{
  const CT3 = { rec: {}, tw: {}, comp: {}, recRaw: {} };
  const mkSwap = (parse) => new Function('CT', 'ctPlanRows', 'window', grab('ctApplySwap') + '; return ctApplySwap;')(CT3, () => [], { ConeParse: parse });
  mkSwap(null)();
  ok(CT3.swapOk === false, '번들이 없으면 «못 했다»를 남긴다');
  CT3.swapOk = undefined;
  mkSwap({ applyCatosPos: (v) => v, applyAutoSwap: () => { throw new Error('일부러'); } })();
  ok(CT3.swapOk === false, '맞교환이 던져도 «못 했다»를 남긴다 — 조용히 넘어가지 않는다');
  CT3.swapOk = undefined;
  mkSwap({ applyCatosPos: (v) => v, applyAutoSwap: (v) => v })();
  ok(CT3.swapOk === true, '제대로 돌면 «했다»가 된다');
  ok(LINES.some(l => isCode(l) && /CT\.swapOk\s*===\s*false/.test(l)), '화면이 그 «못 했다»를 읽어 검수원에게 보인다');
}

// ⑦ 부르는 자리의 모양 — 여기를 건드리면 위 검사들이 다 통과하고 화면만 갈린다(감사 실측 N4·N5·N7).
console.log('\n  ■ 부르는 자리');
{
  //  ㉠ 다른 항차 자료를 겹치지 않는다 — 이 문지기가 상수가 되면 남의 배 자리를 그린다
  ok(/const _bvSame = \(CT\.key && state\.voyageKey && CT\.key === state\.voyageKey\);/.test(SRC),
     '베이플랜은 같은 항차일 때만 겹친다(CT.key === state.voyageKey)');
  //  ㉡ ctFetch 꼬리 — 번들 대기 → 항차 재대조 → busy 풀기 → 맞교환 → 그리기. 차례와 «조건 없이»가 둘 다 중요하다.
  const ft = (SRC.match(/async function ctFetch\(\)\{[\s\S]*?\n\}/) || [''])[0];
  const tail = ft.slice(ft.indexOf('ensureMasterParser'));
  ok(/ensureMasterParser[\s\S]*if\(CT\.key !== key\)[\s\S]*CT\.busy = false;[\s\S]*ctApplySwap\(\);[\s\S]*ctRender\(\);/.test(ft),
     'ctFetch 꼬리 차례 — 번들 대기 → 항차 재대조 → busy 풀기 → 맞교환 → 그리기');
  ok(!/if\s*\([^)]*\)\s*\{?\s*ctApplySwap\(\);/.test(tail) && /\n  ctApplySwap\(\);/.test(ft),
     '맞교환은 **갱신마다 조건 없이** 부른다(«첫 판만» 으로 바꾸면 30초 갱신에 자리가 안 따라온다)');
}

console.log(fail ? `\n⛔ 콘앱 자리 검사 실패 ${fail}건 (전체 ${pass + fail}항)` : `\n✅ 콘앱 자리 = 검수앱 자리 — ${pass}항 통과`);
process.exit(fail ? 1 : 0);
