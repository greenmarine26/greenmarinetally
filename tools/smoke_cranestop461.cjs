// 상황판 호기 줄 — 오래 쉰 호기는 줄에서 빼고 한 줄로 남기는지(utils.craneBoardSplit) 실데이터(PCSZ 2632E)로 본다.
const path = require('path'), fs = require('fs');
const B = process.argv[2] || (() => { const o = path.join(require('os').tmpdir(), 'cranestop461_u.cjs'); require('esbuild').buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'utils.js')], bundle: true, platform: 'node', format: 'cjs', external: ['firebase', 'firebase/*'], outfile: o, logLevel: 'error' }); return o; })();
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'cranestop461_pcsz.json'), 'utf8'));
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const all = [].concat(...['discharge', 'loading'].map((m) => Object.values((FX[m] || {}).completed || {})));
const last = {}; for (const r of all) { const n = +(/(\d)/.exec(r.equip) || [0, 0])[1]; last[n] = Math.max(last[n] || 0, r.at); }
const now = Math.max(last[3], last[4]) + 2 * 60000;   // 3·4호기가 2분 전까지 일한 시각
const rows = U.craneBoardOf(FX, [], null, now);
ok(rows.map((r) => r.no).join() === '1,2,3,4', '원래 줄은 네 호기');
const S = U.craneBoardSplit(rows, now);
ok(S.active.map((r) => r.no).join() === '3,4', `일하는 호기만 줄로 — ${S.active.map((r) => r.no).join('·')}`);
ok(S.stopped.map((r) => r.no).join() === '1,2' && S.stopped.every((c) => c.idleMin >= 60), `쉰 호기는 따로 — ${JSON.stringify(S.stopped)}`);
ok(S.stopped.find((c) => c.no === 1).done === rows.find((r) => r.no === 1).done, '쉰 호기의 대수는 지우지 않는다');
const S2 = U.craneBoardSplit(rows, last[3] + 3 * 3600000);
ok(S2.active.length === 4 && S2.stopped.length === 0, '배 전체가 쉬면 종전대로 전부 보인다');
const live = rows.map((r) => (r.no === 1 ? { ...r, src: 'live' } : r));
ok(U.craneBoardSplit(live, now).active.map((r) => r.no).join() === '1,3,4', '앱에 붙은 검수원이 있는 호기는 남긴다');
process.exit(fail ? 1 : 0);
