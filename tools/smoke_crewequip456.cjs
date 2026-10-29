// 4.56-04 연막검사 — 조 등록에 내 이름이 한 호기에만 있으면 기기 호기(gm_equip_no)가 그 호기로 따라간다(실소스 번들).
const path = require('path'); const fs = require('fs'); const esbuild = require('esbuild');
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const STUB = fs.readFileSync(path.join(__dirname, 'smoke_bayfirst.cjs'), 'utf8').match(/const stub = '([^']*)'/)[1];
(async () => {
  const out = path.join(require('os').tmpdir(), '_smoke_crewequip456_' + process.pid + '.cjs');
  await esbuild.build({
    stdin: { contents: "export { fbSetVoyageCraneCrew } from './src/firebase.js'; export { crewShiftKey, SK } from './src/utils.js';", resolveDir: path.join(__dirname, '..'), loader: 'js' },
    bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    plugins: [{ name: 'fb', setup(b) { b.onResolve({ filter: /^firebase\// }, a => ({ path: a.path, namespace: 'fb' })); b.onLoad({ filter: /.*/, namespace: 'fb' }, () => ({ contents: STUB, loader: 'js' })); } }],
  });
  const store = {}; const events = [];
  global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  global.window = { dispatchEvent: (e) => events.push(e.detail), addEventListener() {}, removeEventListener() {} };
  global.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
  global.document = global.document || { createElement: () => ({}), addEventListener() {} };
  const M = require(out); fs.unlinkSync(out);
  const cur = M.crewShiftKey(undefined, Date.now(), 0).key; const other = M.crewShiftKey('주간', Date.now(), -3).key;
  console.log('조 등록 → 기기 호기 따라가기(4.56-04)');
  const run = async (me, key, crew, equip) => { Object.keys(store).forEach((k) => delete store[k]); events.length = 0; if (me) store[M.SK.activeInspector] = me; if (equip) store.gm_equip_no = equip; try { await M.fbSetVoyageCraneCrew('V', key, crew); } catch (e) { return 'ERR ' + e.message; } return store.gm_equip_no || ''; };
  const raw = (v) => { try { return JSON.parse(v); } catch (e) { return v; } };
  let r = await run('김성일', cur, [{ no: 1, name: '이종부' }, { no: 2, name: '김성일' }], '4호기');
  console.log('   결과', r, JSON.stringify(events));
  ok(r === '2호기' && events[0] === '2호기', '① 내 이름이 2호기 → 4호기에서 2호기로');
  r = await run('김성일', cur, [{ no: 2, name: '김성일' }], '2호기'); ok(r === '2호기' && events.length === 0, '② 이미 같은 호기면 알림 없음');
  r = await run('김성일', cur, [{ no: 1, name: '김성일' }, { no: 2, name: '김성일' }], '4호기'); ok(r === '4호기', '③ 내 이름이 두 호기면 건드리지 않음');
  r = await run('김성일', cur, [{ no: 1, name: '이종부' }], '4호기'); ok(r === '4호기', '④ 명단에 내가 없으면 그대로');
  r = await run('김성일', other, [{ no: 2, name: '김성일' }], '4호기'); ok(r === '4호기', '⑤ 지난 조 등록이면 그대로');
  r = await run('', cur, [{ no: 2, name: '김성일' }], '4호기'); ok(r === '4호기', '⑥ 로그인 이름이 없으면 그대로');
  console.log(fail ? '실패 ' + fail : '통과');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
