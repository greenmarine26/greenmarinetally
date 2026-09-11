// 콘앱 콘 작업표 배 표식 연막검사 (ConeOne 2.49-02) — 배를 바꾸면 미르가 앞 배 콘 작업표로 답하지 않는가.
//   실사건(실소스 jsdom 재현 2026-09-11) — NSFR 2617N 을 계산한 뒤 DJCT 0223E 로 옮겨 «브리핑» → «DONGJIN CONTINENTAL» 아래 【콘】이
//   NSFR 숫자(데크콘 96 · 베이 04, 15-17)로 나갔다. «DJCT 콘 작업 브리핑» 처럼 배 이름을 붙여도 표가 있으면 배를 안 옮겼다.
//   소스에서 coneQaRowsNow · mirEnsureCalc 를 **그대로** 꺼내(베껴 적지 않는다) 상태만 바꿔 돌린다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = process.env.CONE_SRC || path.resolve(__dirname, '..', 'public', 'cone.html');
const html = fs.readFileSync(SRC, 'utf8');
let bad = 0, n = 0;
const T = (ok, why) => { n++; console.log((ok ? '  ✓ ' : '  ✗ ') + why); if (!ok) bad++; };

const fRows = html.match(/function coneQaRowsNow\(\)\{[\s\S]*?\n\}\n/);
const fCalc = html.match(/async function mirEnsureCalc\(q\)\{[\s\S]*?\n\}\n/);
T(!!fRows, 'coneQaRowsNow(지금 배의 표만 읽는 한 벌)를 소스에서 꺼냈다');
T(!!fCalc, 'mirEnsureCalc 를 소스에서 꺼냈다');
if (!fRows || !fCalc) { console.log(`✗ 콘 작업표 배 표식 연막검사 실패 (${bad}/${n})`); process.exit(1); }

const rowsOf = (tag) => [{ bay: tag, deck: { need: 1, have: 0, diff: 1 }, ele: { need: 0, have: 0, diff: 0 }, hold: { need: 0, have: 0, diff: 0 }, subs: [] }];
function mk({ key, qa, ships }) {
  const calls = [];
  const ctx = {
    console, Promise, setTimeout: (fn) => { fn(); return 0; }, String, Array, Object,
    window: { __coneQA: qa },
    state: { voyageKey: key, disch: { ediRows: [1] }, stow: { ediRows: [1] }, shipType: 'container' },
  };
  //  감사(2.49-02 재판정) — 가짜는 selectVoyage 모양을 따른다: 키 교체 → 양하·선적 자료 비움 → **기다림** → 채움.
  //    그래야 mirEnsureCalc 가 `await` 를 빼먹었을 때(자료 적재 전에 계산으로 넘어감) 여기서 선다.
  ctx.mirEnsureShip = async (q) => { calls.push('ship'); const hit = (ships || []).find((s) => String(q).toUpperCase().includes(s.split('_')[0]));
    if (hit && hit !== ctx.state.voyageKey) { ctx.state.voyageKey = hit; ctx.state.disch = null; ctx.state.stow = null; await new Promise((r) => setImmediate(r)); ctx.state.disch = { ediRows: [1] }; ctx.state.stow = { ediRows: [1] }; } };
  ctx.runCalc = async () => { calls.push('calc:' + ctx.state.voyageKey); ctx.window.__coneQA = { rows: rowsOf(ctx.state.voyageKey), key: ctx.state.voyageKey }; };
  vm.createContext(ctx);
  vm.runInContext(fRows[0] + '\n' + fCalc[0] + '\nthis.__rows = coneQaRowsNow; this.__calc = mirEnsureCalc;', ctx, { filename: 'cone.html#qa' });
  return { ctx, calls };
}
(async () => {
  console.log('콘앱 콘 작업표 배 표식 (ConeOne 2.49-02)');
  // ① 읽는 곳 한 벌 — 지금 배의 표만
  { const { ctx } = mk({ key: 'DJCT_0223E', qa: { rows: rowsOf('NSFR'), key: 'NSFR_2617N' } }); T(ctx.__rows().length === 0, '앞 배(NSFR) 표는 지금 배(DJCT)에서 없는 것으로 본다'); }
  { const { ctx } = mk({ key: 'NSFR_2617N', qa: { rows: rowsOf('NSFR'), key: 'NSFR_2617N' } }); T(ctx.__rows().length === 1, '같은 배 표는 그대로 읽는다'); }
  { const { ctx } = mk({ key: null, qa: { rows: rowsOf('파일'), key: '' } }); T(ctx.__rows().length === 1, '항차 없이 계산한 표(키 없음)는 항차 없을 때 그대로'); }
  { const { ctx } = mk({ key: 'DJCT_0223E', qa: { rows: rowsOf('옛'), } }); T(ctx.__rows().length === 0, '배 표식이 없는 옛 표는 항차가 있을 때 버린다'); }
  { const { ctx } = mk({ key: 'DJCT_0223E', qa: null }); T(Array.isArray(ctx.__rows()) && ctx.__rows().length === 0, '표가 없으면 빈 배열'); }
  // ② 배를 바꾼 뒤 «브리핑» — 다시 계산한다
  { const { ctx, calls } = mk({ key: 'DJCT_0223E', qa: { rows: rowsOf('NSFR'), key: 'NSFR_2617N' } });
    const r = await ctx.__calc('브리핑');
    T(r === null && calls.includes('calc:DJCT_0223E') && ctx.window.__coneQA.key === 'DJCT_0223E', `배를 바꾼 뒤 «브리핑» → 지금 배로 다시 계산 (${calls.join('→')})`); }
  // ③ 배 이름을 붙여 물음 — 표가 있어도 배 찾기가 먼저, 그 배로 계산
  { const { ctx, calls } = mk({ key: 'NSFR_2617N', qa: { rows: rowsOf('NSFR'), key: 'NSFR_2617N' }, ships: ['NSFR_2617N', 'DJCT_0223E'] });
    await ctx.__calc('DJCT 콘 작업 브리핑');
    T(calls[0] === 'ship' && ctx.state.voyageKey === 'DJCT_0223E' && calls.includes('calc:DJCT_0223E'), `«DJCT 콘 작업 브리핑» → 배 찾기 먼저·DJCT 로 계산 (${calls.join('→')})`); }
  // ④ 같은 배 표가 있으면 다시 계산하지 않는다(종전 그대로)
  { const { ctx, calls } = mk({ key: 'NSFR_2617N', qa: { rows: rowsOf('NSFR'), key: 'NSFR_2617N' }, ships: ['NSFR_2617N', 'DJCT_0223E'] });
    const r = await ctx.__calc('모자란 데'); T(r === null && !calls.some((c) => c.startsWith('calc')), '같은 배 표가 있으면 계산을 건너뛴다'); }
  // ⑤ 콘 낱말이 아니면 아무것도 안 한다(종전 그대로)
  { const { ctx, calls } = mk({ key: 'DJCT_0223E', qa: { rows: rowsOf('NSFR'), key: 'NSFR_2617N' }, ships: ['NSFR_2617N', 'DJCT_0223E'] });
    const r = await ctx.__calc('리퍼 몇 대'); T(r === null && calls.length === 0, '콘 낱말 없는 말은 배 찾기·계산을 안 한다'); }
  // ⑥ 배선 — 쓰는 곳은 배 표식을 달고, 읽는 곳은 한 벌만 쓴다(앞 배 표를 그대로 읽는 옛 줄이 남으면 여기서 선다)
  T(/window\.__coneQA = \{ rows, key: state\.voyageKey \|\| '' \};/.test(html), 'renderResults 가 표에 배 표식(key)을 단다');
  T(/rows: coneQaRowsNow\(\),/.test(html), '미르 ctx 의 cone.rows 가 coneQaRowsNow() 를 쓴다');
  //  감사(2.49-02 재판정 2회) — 모양(window.__coneQA.rows)만 세면 별칭(const q=window.__coneQA)·맨 이름(__coneQA.rows)이 빠져나간다.
  //    주석을 걷어 낸 코드에서 `__coneQA` 가 나오는 곳을 **모양과 상관없이 전부** 센다 — 허용은 쓰는 줄(renderResults)·한 벌(coneQaRowsNow)·
  //    호출 0건인 옛 함수 coneQaAnswer 안뿐.
  const deadFn = (html.match(/function coneQaAnswer\(qRaw\)\{[\s\S]*?\n\}\n/) || [''])[0];
  const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
  const writer = (html.match(/window\.__coneQA = \{ rows, key: state\.voyageKey \|\| '' \};/) || [''])[0];
  const rest = stripComments(html.replace(fRows[0], '').replace(deadFn, '').replace(writer, ''));
  const raw = (rest.match(/__coneQA/g) || []).length;
  T(raw === 0, `표(__coneQA)를 한 벌 밖에서 읽는 곳 ${raw}곳 — 앞 배 표가 새는 길이다(별칭·맨 이름 포함)`);
  //  2차 시뮬(2.49-02) — 계산 도중 배를 바꾸면 새 배 행 + 앞 배 사전으로 만든 표가 새 배 표식을 달았다. runCalc 를 꺼내 실제로 돌린다.
  const fCalcRun = html.match(/async function runCalc\(\)\{[\s\S]*?\n\}\n/);
  T(!!fCalcRun, 'runCalc 를 소스에서 꺼냈다');
  if (fCalcRun) {
    const runOnce = async (switchDuring) => {
      const rendered = [];
      const c2 = { console: { warn() {}, log() {} }, Promise, setTimeout, Set, Map, Object, Array, String, Number, parseInt, Math, JSON,
        window: {}, document: { getElementById: () => ({ innerHTML: '' }) }, confirm: () => false,
        state: { voyageKey: 'NSFR_2617N', disch: { ediRows: [1], vessel: 'NSFR' }, stow: { ediRows: [1], vessel: 'NSFR' }, shipType: 'container' } };
      c2.showLoading = () => {}; c2.isLoloShip = () => false; c2.renderLoloDeckPlan = () => {};
      c2.ensureConeBayDict = async () => { if (switchDuring) { c2.state.voyageKey = 'DJCT_0223E'; c2.state.shipType = null; } await new Promise((r) => setImmediate(r)); return new Map(); };
      c2.buildConeCtx = () => ({}); c2.planToGroups = () => ({ 4: { deck: 1, ele: 0, hold: 0, bays: [4] } }); c2.bayGroupLabel = (b) => b.join('-');
      c2.renderResults = (g) => rendered.push(c2.state.voyageKey);
      vm.createContext(c2);
      vm.runInContext(fCalcRun[0] + '\nthis.__run = runCalc;', c2, { filename: 'cone.html#runCalc' });
      await c2.__run(); await new Promise((r) => setTimeout(r, 120));
      return rendered;
    };
    const same = await runOnce(false), sw = await runOnce(true);
    T(same.length === 1 && same[0] === 'NSFR_2617N', `배를 안 바꾸면 계산이 그려진다 (${JSON.stringify(same)})`);
    T(sw.length === 0, `계산 도중 배가 바뀌면 그 계산은 버린다 — 새 배 표식으로 들어가지 않는다 (${JSON.stringify(sw)})`);
  }
  T(!/(?<![`\w])coneQaAnswer\(/.test(html.replace(deadFn, '')), '옛 coneQaAnswer 는 여전히 부르는 곳이 없다(부르게 되면 배 표식 없이 읽는다 · 주석 속 이름은 셈하지 않음)');
  console.log(bad ? `✗ 콘 작업표 배 표식 연막검사 실패 (${bad}/${n})` : `✓ 콘 작업표 배 표식 연막검사 통과 (${n}항)`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✗ 콘 작업표 배 표식 연막검사 오류', e); process.exit(1); });
