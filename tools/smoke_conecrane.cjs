// 콘앱이 «호기가 안 오는 동방»에서 검수앱과 **같은 호기**를 쓰는지 재는 연막검사 (ConeOne 2.46).
//
//  왜 있는가 — 검수사 2026-09-09 *«콘앱이 동방의 갱호기를 못찾는이유 다른클로드가 갱호기를 지정했는데 반영이 안되는 이유?»*
//  실측 — 동방 termWork 에는 `equip`(호기)이 아예 없다. 콘앱은 그 칸을 그대로 읽어 비면
//  «베이 14» 처럼 해치 이름으로 칸을 갈랐다(`cone.html` 2.28). 검수앱 수석 보드는 3.38 부터
//  **크레인 하나는 같은 시각에 두 베이를 못 한다**는 규칙으로 호기를 되살려
//  라이브 OBWH 2735E 에서 «1호기 고현석 베이 1 · 2호기 이인철 베이 11» 을 그리고 있다(검수사 화면).
//  그런데 그 함수(`utils.craneBaysByTime`)가 콘앱 번들에 안 실려 콘앱은 그 답을 못 봤다 — 실측 0건.
//
//  ⇒ 이 판이 새로 하는 것은 **배선 하나**뿐이다. 규칙 자체는 검수앱이 라이브 동방에서 이미 증명 중이므로
//    여기서 다시 증명하지 않는다. 대신 **콘앱이 그 함수를 그대로 부르는가**와
//    **콘앱이 만든 입력으로 부른 답이 검수앱이 부른 답과 한 글자도 다르지 않은가**를 잰다(규범 §4-4).
//  ⚠ PCTC 자료로 동방을 대신 재지 않는다 — 검수사 2026-09-09 *«PCTC자료로 동방자료와 비교하면 안됩니다»*.
//    실측으로도 갈린다: DJCT(PCTC)로 그 규칙을 돌리면 «성한 바구니 0 · 호기 2대가 같은 시각에 함께 찍힌 자료가 없다».
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_conecrane.cjs <utils번들.cjs>'); process.exit(1); }
const U = require(path.resolve(B));
const ROOT = path.resolve(__dirname, '..');

let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };

console.log('콘앱 호기 — 검수앱이 되살린 그 호기를 그대로 쓰는가 (ConeOne 2.46)');

const CONE = fs.readFileSync(path.join(ROOT, 'public/cone.html'), 'utf8');
const ENTRY = fs.readFileSync(path.join(ROOT, 'src/coneCargoPlan.entry.jsx'), 'utf8');

// ── 배선 — 그 답이 콘앱까지 닿는 길이 끊긴 데 없는가
{
  ok(/window\.ConeParse = \{[^}]*craneBaysByTime[^}]*\}/.test(ENTRY),
     '번들이 판정을 콘앱에 내보낸다 (window.ConeParse.craneBaysByTime)');
  ok(/import \{[^}]*craneBaysByTime[^}]*\} from '\.\/utils\.js';/.test(ENTRY),
     '그 판정을 utils 에서 가져온다 — 콘앱이 제 규칙을 새로 만들지 않는다');
  ok(/ctGet\(`\$\{base\}\/info\/qcWork\.json`\)/.test(CONE),
     '콘앱이 호기 목록(info.qcWork)을 받아 온다 — 없으면 그 규칙이 «호기가 하나뿐» 으로 나간다');
  ok(/window\.ConeParse && window\.ConeParse\.craneBaysByTime/.test(CONE),
     '콘앱이 그 판정을 실제로 부른다');
  ok(/function ctCraneName\(bay\)/.test(CONE), '되살린 호기를 이름으로 바꾸는 자리가 한 곳이다');
  ok(/const _eq = ctEquip\(t\.equip\) \|\| ctCraneName\(p\.bay\) \|\| \('베이 '/.test(CONE),
     '★ 차례가 맞다 — 터미널 호기 → 되살린 호기 → 해치 이름');
  ok(/catch\(e\)\{ CT\.craneBay = \{\}; console\.warn/.test(CONE),
     '되살리기가 실패해도 조용히 죽지 않고 종전 «베이 NN» 으로 간다(규범 §4-3)');
}

// ── 판정 한 벌 — 같은 입력이면 두 경로가 같은 답을 내는가
//    콘앱이 만드는 입력 모양 그대로 짜서(그 줄을 소스에서 베낀다) 부르고, 검수앱이 부르는 것과 대조한다.
{
  ok(typeof U.craneBaysByTime === 'function', '판정을 검사가 직접 부를 수 있다');
  //  콘앱이 넘기는 모양 — cone.html 의 그 줄과 같은 구조여야 한다.
  const shape = /_cb\(\{ info:\{ qcWork: CT\.qc \}, discharge:\{ termWork: twD\|\|\{\} \}, loading:\{ termWork: twL\|\|\{\} \} \}\)/.test(CONE);
  ok(shape, '콘앱이 넘기는 모양이 검수앱과 같다(info.qcWork · discharge/loading.termWork)');

  //  호기가 둘인데 termWork 가 비어 있으면 «자리 자료 없음» 으로 물러난다 — 조용히 틀리지 않는다.
  const empty = U.craneBaysByTime({ info: { qcWork: { QC101: { qc: 'QC101' }, QC102: { qc: 'QC102' } } },
                                    discharge: { termWork: {} }, loading: { termWork: {} } });
  ok(Object.keys(empty.byBay).length === 0 && /자리 자료 없음/.test(empty.why),
     `자리 자료가 없으면 아무 호기도 안 붙인다 — «${empty.why}»`);

  //  호기가 하나뿐이면 애초에 안 가른다(콘앱도 그때는 베이 이름으로 남는다).
  const one = U.craneBaysByTime({ info: { qcWork: { QC101: { qc: 'QC101' } } },
                                  discharge: { termWork: {} }, loading: { termWork: {} } });
  ok(/호기가 하나뿐/.test(one.why), `호기가 하나면 가르지 않는다 — «${one.why}»`);

  //  qcWork 가 아예 없을 때(콘앱이 그 노드를 못 받은 날) — 예외 없이 물러나야 한다.
  let threw = '';
  try { U.craneBaysByTime({ info: {}, discharge: {}, loading: {} }); U.craneBaysByTime({}); U.craneBaysByTime(null); }
  catch (e) { threw = String(e); }
  ok(!threw, `호기 목록이 없거나 항차가 비어도 안 죽는다 ${threw ? '| ' + threw.slice(0, 90) : ''}`);
}

// ── ★ 실제로 돌려 본다 — 이름이 «맞는 호기»인가 (감사 「부」: 종전 판은 그 함수를 한 번도 안 돌렸다)
//    정규식으로 «있나·차례가 맞나»만 보면, `ctCraneName` 이 언제나 '9호기' 를 내도 전부 초록이었다.
//    ⇒ cone.html 의 CT 블록을 그대로 꺼내 vm 에 올리고, 지도를 넣은 것과 안 넣은 것을 **결과로** 가른다.
{
  const vm = require('vm');
  const ct = CONE.match(/const CT = \{[\s\S]*?\nfunction ctCountLine\([\s\S]*?\n\}\n/);
  const hcc = CONE.match(/function holdConeCount\(size, shipType, multiCount\)\{[\s\S]*?\n\}\n/);
  ok(!!ct && !!hcc, 'cone.html 에서 CT 블록을 꺼냈다');
  if (ct && hcc) {
    //  동방 모양 — `equip` 이 없고 자리(pos)만 있는 두 행. 시각이 같아야 «한 바구니» 가 된다.
    const AT = Date.now() - 60000;
    const tw = { AAAU1000000: { at: AT, pos: '020102', src: 'pnct' }, BBBU2000000: { at: AT, pos: '100102', src: 'pnct' } };
    const run = (craneBay) => {
      const ctx = { console, Date, Math, Set, Map, Object, Array, String, Number, parseInt, JSON,
        setInterval: () => 1, clearInterval: () => {},
        document: { addEventListener: () => {}, getElementById: () => null, querySelector: () => null, documentElement: { style: { setProperty: () => {} } } },
        window: {}, state: { shipType: 'container', multiCount: 4, _bayDictBays: null, disch: { ediRows: [], ediRowsAll: null }, stow: { ediRows: [] } },
        fbFetch: async () => ({ ok: false, status: 0 }), ensureConeBayDict: async () => {} };
      vm.createContext(ctx);
      vm.runInContext(hcc[0] + '\n' + ct[0] + '\nthis.__ctCompute = ctCompute; this.__CT = CT;', ctx, { filename: 'cone.html#ct' });
      ctx.__CT.tw = { discharge: tw, loading: {} }; ctx.__CT.comp = { discharge: {}, loading: {} };
      ctx.__CT.pier = 'PNCT'; ctx.__CT.craneBay = craneBay;
      return Object.keys(ctx.__ctCompute().count.discharge.byEq).sort();
    };
    //  ⓐ 지도가 있으면 그 호기 이름이 나온다 — «9호기» 같은 엉뚱한 값이면 여기서 걸린다.
    const withMap = run(U.craneBaysByTime({ info: { qcWork: { QC101: { qc: 'QC101' }, QC102: { qc: 'QC102' } } },
                                            discharge: { termWork: tw }, loading: { termWork: {} } }).byBay);
    ok(withMap.join(',') === '1호기,2호기', `★ 되살린 호기가 칸 이름이 된다 (실제: ${withMap.join(',') || '(없음)'})`);
    //  ⓑ 지도가 없으면 종전 그대로 해치 이름 — 이 판이 옛 길을 안 지웠다.
    const noMap = run({});
    ok(noMap.join(',') === '베이 02,베이 10', `지도가 없으면 종전 «베이 NN» 으로 간다 (실제: ${noMap.join(',') || '(없음)'})`);
    //  ⓒ 터미널이 호기를 준 행(PCTC)은 지도가 오염돼도 안 흔들린다.
    const pctc = (() => {
      const t2 = { CCCU3000000: { at: AT, pos: '020102', equip: 'GC101', src: 'catos' }, DDDU4000000: { at: AT, pos: '100102', equip: 'GC102', src: 'catos' } };
      const ctx2 = { console, Date, Math, Set, Map, Object, Array, String, Number, parseInt, JSON,
        setInterval: () => 1, clearInterval: () => {},
        document: { addEventListener: () => {}, getElementById: () => null, querySelector: () => null, documentElement: { style: { setProperty: () => {} } } },
        window: {}, state: { shipType: 'container', multiCount: 4, _bayDictBays: null, disch: { ediRows: [], ediRowsAll: null }, stow: { ediRows: [] } },
        fbFetch: async () => ({ ok: false, status: 0 }), ensureConeBayDict: async () => {} };
      vm.createContext(ctx2);
      vm.runInContext(hcc[0] + '\n' + ct[0] + '\nthis.__ctCompute = ctCompute; this.__CT = CT;', ctx2, { filename: 'cone.html#ct2' });
      ctx2.__CT.tw = { discharge: t2, loading: {} }; ctx2.__CT.comp = { discharge: {}, loading: {} };
      ctx2.__CT.pier = 'PCTC'; ctx2.__CT.craneBay = { 2: 9, 10: 9, '02': 9, '10': 9 };   // 일부러 오염
      return Object.keys(ctx2.__ctCompute().count.discharge.byEq).sort();
    })();
    ok(pctc.join(',') === '1호기,2호기', `터미널이 준 호기가 이긴다 — 지도를 오염시켜도 안 흔들린다 (실제: ${pctc.join(',')})`);
  }
}

// ── 종전 동작을 안 깨뜨렸는가
{
  ok(/window\.__CONEV='ConeOne 2\.48'/.test(CONE), '콘앱 판이 2.48 이다(2.46 호기 되살리기 위에 쌓인 판 · 2.48 미르 한 벌)');
  ok((CONE.match(/ctEquip\(/g) || []).length >= 3, '종전 호기 이름 함수(ctEquip)를 그대로 쓴다 — PCTC 는 하나도 안 바뀐다');
  ok(/const eq = ctEquip\(c\.equip\) \|\| \('검수 '/.test(CONE),
     '검수원이 찍은 완료 쪽 이름 규칙은 안 건드렸다');
}

console.log(fail ? `\n⛔ 콘앱 호기 검사 실패 ${fail}건` : `\n✅ 콘앱이 검수앱과 같은 호기를 쓴다 — ${pass}항 통과`);
process.exit(fail ? 1 : 0);
