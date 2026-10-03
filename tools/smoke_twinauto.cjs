// 3.75 연막검사 — 수동 트윈 선적: 앞 자리를 정하면 뒤 컨이 짝꿍 자리로 자동 배정되고 뒤 카드가 따라 바뀌는가. 실항차 ATPR 2644W 실 BAPLIE(372대) 엠티로 PositionEditModal 을 jsdom 에 실제로 띄워 눌러 본다(쓰기 없음 — 저장 함수는 호출 기록만 하는 가짜)
const path = require('path'); const fs = require('fs'); const esbuild = require('esbuild'); const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.HTMLElement = dom.window.HTMLElement; global.Node = dom.window.Node;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.localStorage = dom.window.localStorage; global.IS_REACT_ACT_ENVIRONMENT = true;
const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/dprt2612s_plan_vs_done.json'), 'utf8'));
// 계획본 그대로의 항차 — 20피트 엠티(2200kg)는 fe:'E'. act* = 완성본(실제 실린 자리)
const ALL = F.containers.map(c => ({ ...c, _mode: 'loading', _ptk: true, l4: c.cn.slice(-4), tp: c.iso === '22GP' ? "20'GP" : "40'GP", fe: (c.iso === '22GP' && c.wt <= 2500) ? 'E' : 'F' }));
const BYCN = Object.fromEntries(ALL.map(c => [c.cn, c]));
const cell = (b, r, t) => ALL.find(c => c.actBay === b && c.actRow === r && c.actTier === t);   // 실제로 그 칸에 실린 컨
// 검수사 사례(2026-10-03 DPRT 2612S) — 33-07-82 에 실제 실린 컨(앞)과 35-07-82 에 실제 실린 컨(뒤). 둘 다 계획과 다른 컨이다.
const C = cell('33', '07', '82'), D = cell('35', '07', '82');
const planA = ALL.find(c => c.bay === '33' && c.row === '07' && c.tier === '82'), planB = ALL.find(c => c.bay === '35' && c.row === '07' && c.tier === '82');
const pair = { A: planA, B: planB };
const FB = '33', BB = '35';
const bayPairs = { 33: '35', 35: '33' };
console.log(`수동 트윈 자동 짝꿍 — DPRT 2612S 실 계획본·완성본 · 계획 앞 ${planA.cn.slice(-4)} 33-07-82 / 계획 뒤 ${planB.cn.slice(-4)} 35-07-82 · 실제 온 앞 ${C.cn.slice(-4)}(계획 ${C.bay}-${C.row}-${C.tier}) 뒤 ${D.cn.slice(-4)}(계획 ${D.bay}-${D.row}-${D.tier})`);
esbuild.build({ entryPoints: [path.join(__dirname, 'smoke_twinauto_entry.jsx')], bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', write: false, logLevel: 'error',
  define: { 'process.env.NODE_ENV': '"development"' }, external: ['firebase', 'firebase/*'], loader: { '.png': 'dataurl' } }).then(async (r) => {
  const m = { exports: {} }; new Function('module', 'exports', 'require', r.outputFiles[0].text)(m, m.exports, require);
  const { React, act, createRoot, PositionEditModal } = m.exports;
  const host = document.getElementById('root');
  const run = async (over, steps) => {
    const calls = { save: [], partner: [], both: [], twin: [] };
    const props = { open: true, container: C, allContainers: ALL, slotSource: ALL, bayPairs, defaultPartner: D,
      defaultPos: { bay: pair.A.bay, row: pair.A.row, tier: pair.A.tier }, onClose() {},
      onSave: async (...a) => { calls.save.push(a); return { ok: true }; },
      onSavePartner: async (...a) => { calls.partner.push(a); return { ok: true }; },
      onCompleteBoth: async (c) => { calls.both.push(c); }, onTwinSaved: (i) => calls.twin.push(i), autoTwin: true, ...over };
    const root = createRoot(host);
    await act(async () => { root.render(React.createElement(PositionEditModal, props)); });
    const text = () => host.textContent;
    const click = async (s) => { const b = [...host.querySelectorAll('button')].find(x => x.textContent.includes(s)); if (!b) return false; await act(async () => { b.click(); }); return true; };
    const next = async () => { await click(`${pair.A.row}${pair.A.cn.slice(-4)}`); await click('다음'); };   // 계획 앞 칸(이름표 걸린 칸)을 눌러 고른 뒤 [다음]
    await steps({ text, click, next, calls });
    await act(async () => { root.unmount(); });
    return calls;
  };
  const save = async ({ click }) => { await click('변경 확정'); await click('바꾸기'); await act(async () => {}); };

  console.log('■ 앞 카드(autoTwin) — 열자마자 트윈 지정이 켜져 있고 뒤 컨이 들어 있다');
  let t0 = '', c = await run({}, async ({ text, click, next, calls }) => {
    await next(); t0 = text();
    await save({ click });
  });
  ok(/트윈 지정/.test(t0) && /— 켬/.test(t0), '«트윈 지정 — 켬» 으로 열린다(누르지 않아도)');
  ok(t0.includes(D.cn), `뒤 컨 ${D.cn.slice(-4)} 가 자동으로 들어 있다`);
  ok(t0.includes(`${BB}-${pair.A.row}-${pair.A.tier}`), `짝꿍 자리 ${BB}-${pair.A.row}-${pair.A.tier} 가 적혀 있다`);
  ok(c.save.length === 1 && c.save[0][0] === FB && c.save[0][1] === pair.A.row && c.save[0][2] === pair.A.tier, `앞 컨 → ${FB}-${pair.A.row}-${pair.A.tier} 저장 1회`);
  ok(c.partner.length === 1 && c.partner[0][0] === D.cn && c.partner[0][1] === BB && c.partner[0][2] === pair.A.row && c.partner[0][3] === pair.A.tier, `뒤 컨 ${D.cn.slice(-4)} → 짝꿍 ${BB}-${pair.A.row}-${pair.A.tier} 자동 배정 1회`);
  ok(c.twin.length === 1 && c.twin[0].partner.cn === D.cn && c.twin[0].slot.bay === BB && c.twin[0].slot.row === pair.A.row && c.twin[0].front.bay === FB, '트윈 화면에 «뒤 컨·자리·앞 자리» 가 알려진다(뒤 카드 갱신용)');
  ok(c.both.length === 0, '저장만 한다 — 선적확인은 [트윈 한 번에 선적확인] 에서 한 번에(1.46 규칙 그대로)');

  console.log('■ 뒤 카드·싱글(autoTwin 없음) — 종전 그대로(트윈 끔)');
  c = await run({ autoTwin: false }, async ({ text, click, next }) => { await next(); ok(/— 끔/.test(text()) && !text().includes(D.cn), '«트윈 지정 — 끔» · 뒤 컨 비어 있음'); await save({ click }); });
  ok(c.save.length === 1 && c.partner.length === 0 && c.twin.length === 0, '앞 컨 하나만 저장 · 뒤 배정·알림 없음');

  console.log('■ 검수원이 직접 끄면 다시 켜지 않는다');
  c = await run({}, async ({ text, click, next }) => { await next(); await click('트윈 지정'); ok(/— 끔/.test(text()), '누르면 꺼진다'); await save({ click }); });
  ok(c.save.length === 1 && c.partner.length === 0 && c.twin.length === 0, '꺼 둔 채 저장 — 앞 컨 하나만');

  console.log('■ 뒤 컨이 없는 트윈(짝 못 찾음) — 켜지 않는다(뒤 컨을 고르라고 막지 않는다)');
  c = await run({ defaultPartner: null }, async ({ text, click, next }) => { await next(); ok(/— 끔/.test(text()), '«끔» 으로 열린다'); await save({ click }); });
  ok(c.save.length === 1 && c.partner.length === 0, '앞 컨 하나만 저장');

  console.log('■ 짝꿍 자리가 없는 자리(짝꿍 베이 없음) — 트윈 지정 자체가 없다');
  c = await run({ bayPairs: {} }, async ({ text, click, next }) => { await next(); ok(!/트윈 지정/.test(text()), '트윈 지정 칸이 안 보인다'); await save({ click }); });
  ok(c.save.length === 1 && c.partner.length === 0 && c.twin.length === 0, '앞 컨 하나만 저장');

  console.log('■ 앞뒤 같은 컨이면 켜지 않는다');
  c = await run({ defaultPartner: C }, async ({ text, click, next }) => { await next(); ok(/— 끔/.test(text()), '«끔»'); await save({ click }); });
  ok(c.partner.length === 0, '뒤 배정 없음');

  console.log(fail ? `\n실패 ${fail}건` : '\n전부 통과'); process.exit(fail ? 1 : 0);
}).catch((e) => { console.error(e.stack || e.message); process.exit(1); });
