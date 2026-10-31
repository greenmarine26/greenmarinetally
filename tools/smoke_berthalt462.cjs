// 터미널 배정 작업예정(planBerth)이 도선·메일 환산 일정과 다를 때 둘 다 보이게 하는 판정(utils.berthAltOf)을 실데이터(XTPG 547E)로 본다.
const path = require('path');
const B = process.argv[2] || (() => { const o = path.join(require('os').tmpdir(), 'berthalt462_u.cjs'); require('esbuild').buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'utils.js')], bundle: true, platform: 'node', format: 'cjs', external: ['firebase', 'firebase/*'], outfile: o, logLevel: 'error' }); return o; })();
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
//  실측 XTPG 547E(2026-11-01) — 도선 입항 12:00 승인 → 작업시작 13:30 · 배정목록 11-01 19:00 예정
const xtpg = { planDate: '2026-11-01 13:30 ~ 2026-11-02 04:00', planSrc: 'pilot|plan', planBerth: '2026-11-01 19:00 ~ 2026-11-02 04:00', planBerthSt: 'plan' };
const a = U.berthAltOf(xtpg);
ok(a && a.label === '예정' && a.st === 'plan', `XTPG — 배정 «예정» 이 붙는다 (${a && a.label})`);
ok(a && new Date(a.at).getHours() === 19 && new Date(a.at).getMinutes() === 0, '배정 작업예정은 19:00');
ok(U.berthAltOf({ ...xtpg, planBerthSt: 'work' }).label === '작업중', '배정이 작업중(황색)이면 «작업중»');
ok(U.berthAltOf({ ...xtpg, planBerthSt: 'done' }).label === '완료', '배정이 완료(초록)면 «완료»');
ok(U.berthAltOf({ ...xtpg, planBerthSt: '' }).label === '예정', '상태가 비어 있으면 «예정»(미확정 쪽으로 읽는다)');
ok(U.berthAltOf({ ...xtpg, planBerth: '2026-11-01 13:50 ~ 2026-11-02 04:00' }) === null, '30분 안이면 하나만 보인다');
ok(U.berthAltOf({ ...xtpg, planBerth: '2026-11-01 13:00 ~ 2026-11-02 04:00' }) !== null, '배정이 도선보다 이르면 그것도 보인다');
ok(U.berthAltOf({ planDate: xtpg.planDate }) === null, '배정 값이 없으면 null');
ok(U.berthAltOf({ planBerth: xtpg.planBerth }) === null, '일정이 없으면 기준이 없어 null');
ok(U.berthAltOf(null) === null && U.berthAltOf({}) === null, '빈 입력 안전');
process.exit(fail ? 1 : 0);
