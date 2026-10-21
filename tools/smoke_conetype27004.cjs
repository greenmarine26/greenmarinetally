// 콘앱 선종(컨테이너선·복합선)은 배마다 한 번 — 보관소에 두고 모든 폰이 같이 쓰며, 바꾸기 전까지 다시 묻지 않는가 (ConeOne 2.70-04 · TallyOne 4.42-01)
//   검수사 2026-10-21 13:05 «그와 같은 오류가 콘앱에도 있습니다. 컨테이너선으로 지정 해놨는데 건건 마다 다시 물어 봅니다»
//          (13:01 검수앱 실 정책 — «한번 지정하면 사용자가 바꾸기 전까지는 1년이든 2년이든 다시 띄우면 안됩니다»).
//   원인 — 종전 선종은 이 폰 localStorage 에만, 그때 읽은 선박명으로 저장했다(검수앱 자료면 «DJCF», EDI 원문이면 TDT 이름) — 다른 폰·다른 이름이면 다시 물었다.
//   ⚠ 소스에서 그 함수들을 그대로 꺼내 돌린다(베껴 적지 않는다). 보관소는 메모리 흉내(쓰기 없음), 폰은 localStorage 따로.
//   기준표는 코드가 아니라 검수사 규칙 — «지정한 배는 어느 폰·어느 이름으로 들어와도 안 묻는다 · 처음 오는 배만 묻는다 · 바꾸면 바꾼 것이 남는다».
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'public', 'cone.html'), 'utf8');
let bad = 0, n = 0; const T = (ok, why) => { n++; console.log((ok ? '  ✓ ' : '  ✗ ') + why); if (!ok) bad++; };
console.log('콘앱 선종 — 배마다 한 번 (2.70-04)');

const blk = html.match(/const _coneTypeKey=[\s\S]*?\nfunction setShipType\(t\)\{[\s\S]*?\n\}\n/);
const sel = html.match(/async function selectVoyage\(voyageKey\)\{[\s\S]*?\n\}\n/);
T(!!blk, '선종 블록(_coneTypeKey ~ setShipType)을 소스에서 꺼냈다');
T(!!sel && /_tcode=_coneTypeKey\(v\.vsl\), _tp=coneTypeShared\(_tcode\)/.test(sel[0]) && /state\.vslCode=_tcode/.test(sel[0]) && /await coneTypeResolve\(_tcode, _tp\)/.test(sel[0]) && !/\n\s*applyVessel\(state\.shipName\);\n\s*ctStart/.test(sel[0]),
  '배를 고르면(selectVoyage) 배 코드로 보관소 선종을 받아 적용한다 — 끝의 applyVessel 이 coneTypeResolve 로 바뀌었다');
if (!blk) { console.log('✗ 콘앱 선종 연막검사 실패'); process.exit(1); }

const DB = {};                    // 보관소 흉내 — 'coneShipTypes/DJCF.json' → 값
let online = true; const puts = [];
function phone() {
  const store = new Map();
  const w = { console: { log() {}, warn() {}, error() {} }, JSON, Date, Promise, encodeURIComponent, String, Object, Error };
  w.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); } };
  w.state = { shipType: null, shipName: '', detected: false, multiCount: 4 };
  w.render = () => {};
  w.fbFetch = async (p, opts) => {
    if (!online) throw new Error('failed to fetch — 인터넷에 연결되지 않았습니다');
    if (opts && opts.method === 'PUT') { DB[p] = JSON.parse(opts.body); puts.push(p); return { ok: true, status: 200, json: async () => DB[p] }; }
    return { ok: true, status: 200, json: async () => (p in DB ? DB[p] : null) };
  };
  vm.createContext(w);
  vm.runInContext(blk[0] + '\nthis.__k=_coneTypeKey; this.__resolve=coneTypeResolve; this.__set=setShipType; this.__shared=coneTypeShared;', w, { filename: 'cone.html#type' });
  //  selectVoyage 와 같은 순서 — 선종 초기화 → 자료(선박명) → 끝에서 coneTypeResolve
  w.open = async (vsl, shipName) => {
    Object.assign(w.state, { shipType: null, shipName: '', detected: false });
    const code = w.__k(vsl), tp = w.__shared(code);
    w.state.vslCode = code; w.state._sharedType = null;
    w.state.shipName = shipName || vsl;
    await w.__resolve(code, tp);
    return { type: w.state.shipType, asks: w.state.shipType === null };
  };
  w.store = store;
  return w;
}
const flush = () => new Promise((r) => setTimeout(r, 0));

(async () => {
  const A = phone(), B = phone();
  //  ① 처음 오는 배 — 묻는다(종전 그대로)
  let r = await A.open('DJCF');
  T(r.asks, '① 처음 오는 배(DJCF) — 선종을 묻는다(종전 그대로)');
  //  ② 폰 A 에서 «컨테이너선» → 보관소 coneShipTypes/DJCF 에 남는다
  A.__set('container'); await flush();
  T(DB['coneShipTypes/DJCF.json'] && DB['coneShipTypes/DJCF.json'].shipType === 'container', `② 폰 A 에서 «컨테이너선» → 보관소 coneShipTypes/DJCF = ${JSON.stringify(DB['coneShipTypes/DJCF.json'] && DB['coneShipTypes/DJCF.json'].shipType)}`);
  //  ③ 다른 폰(아무 기록 없음) — 안 묻고 컨테이너선
  r = await B.open('DJCF');
  T(!r.asks && r.type === 'container', `③ 다른 폰(이 폰 기록 없음)에서 DJCF — 안 묻고 ${r.type}`);
  //  ④ 같은 배가 EDI 원문 이름(TDT)으로 들어와도 — 배 코드로 찾는다
  r = await A.open('DJCF', 'DONGJIN CONFIDENT');
  T(!r.asks && r.type === 'container', `④ 같은 배가 EDI 원문 이름 «DONGJIN CONFIDENT» 로 들어와도 안 묻는다(${r.type})`);
  //  ⑤ 보관소를 못 읽어도(신호 없음) — 이 폰 기록(배 코드)으로 안 묻는다 · 못 읽었을 때는 올리지 않는다
  online = false; const p0 = puts.length;
  r = await A.open('DJCF', 'DONGJIN CONFIDENT');
  T(!r.asks && r.type === 'container' && puts.length === p0, `⑤ 신호 없음 — 이 폰 기록으로 안 묻는다(${r.type}) · 보관소에 쓰지 않는다`);
  online = true;
  //  ⑥ 옛 판에서 이 폰에만 지정한 배(이름 키) — 묻지 않고, 보관소에 올려 다른 폰도 안 묻게
  const C = phone(); C.localStorage.setItem('coneShips', JSON.stringify({ KBTR: { shipType: 'container' } }));
  r = await C.open('KBTR');
  const D = phone(); const r2 = await D.open('KBTR');
  T(!r.asks && r.type === 'container' && DB['coneShipTypes/KBTR.json'] && DB['coneShipTypes/KBTR.json'].shipType === 'container' && !r2.asks,
    `⑥ 옛 판에서 이 폰에만 지정한 KBTR — 안 묻고 보관소에 올림 → 다른 폰도 안 묻는다(${r2.type})`);
  //  ⑦ «변경» 으로 복합선 — 바꾼 것이 남고 다른 폰도 따른다
  A.state.shipType = null; A.__set('multi'); await flush();
  r = await B.open('DJCF');
  T(r.type === 'multi' && DB['coneShipTypes/DJCF.json'].shipType === 'multi', `⑦ «변경» 으로 복합선 → 보관소·다른 폰 모두 ${r.type}`);
  //  ⑧ 보관소 값이 이 폰 옛 기록보다 먼저 — 다른 폰에서 바꾼 것이 이긴다
  B.localStorage.setItem('coneShips', JSON.stringify({ DJCF: { shipType: 'container' } }));
  r = await B.open('DJCF');
  T(r.type === 'multi', `⑧ 이 폰 옛 기록(컨테이너선)보다 보관소(복합선)가 먼저 — ${r.type}`);
  //  ⑨ 처음 오는 다른 배는 여전히 묻는다 · 이상한 값은 받지 않는다
  DB['coneShipTypes/ZZZZ.json'] = { shipType: '엉뚱' };
  r = await B.open('ZZZZ');
  T(r.asks, '⑨ 보관소에 이상한 값(«엉뚱»)이 있으면 받지 않고 묻는다');
  //  ⑪ 기다리는 사이 다른 배를 고르면 앞 배 선종을 뒤 배에 붙이지 않는다
  { const E = phone(); const tp = E.__shared('DJCF');   // DJCF = 복합선(⑦)
    E.state.vslCode = 'ZZZZ'; E.state._sharedType = null; E.state.shipType = null; E.state.shipName = 'ZZZZ';   // 그사이 ZZZZ 를 골랐다
    await E.__resolve('DJCF', tp);
    T(E.state.shipType === null && !E.state._sharedType, '⑪ 기다리는 사이 다른 배(ZZZZ)를 고르면 앞 배(DJCF) 선종을 붙이지 않는다'); }
  //  ⑩ 배 코드 — 항차 키 앞자리 그대로(공백·기호 없음)
  T(A.__k('DJCF') === 'DJCF' && A.__k(' djcf ') === 'DJCF' && A.__k('') === '', '⑩ 배 코드 정규화 — 대문자 · 공백·기호 없음');

  if (bad) { console.log(`✗ 콘앱 선종 연막검사 ${bad}건 실패`); process.exit(1); }
  console.log(`✓ 콘앱 선종 연막검사 통과 ${n}/${n}`);
})().catch((e) => { console.error('✗ 콘앱 선종 연막검사 오류:', e && e.stack || e); process.exit(1); });
