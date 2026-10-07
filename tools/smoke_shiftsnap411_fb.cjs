// 4.11 연막검사 2 — 실소스 firebase.js(메모리 RTDB 스텁)로 교대 시각 스냅샷 읽기·요청·반영 함수를 직접 친다. 실제 읽기·쓰기 없음.
//   ① 소유자가 아니면 셋 다 던지고 아무것도 안 쓴다 ② 소유자 읽기 ③ 다시 읽기 요청은 term_snapshot/_req 한 칸 ④ 반영은 completed/{컨} 추가뿐 — 검수원 기록은 그대로·두 번째는 0건
//   ⑤ 모드가 틀리거나 스냅샷이 없으면 쓰지 않는다. 픽스처 tools/fixtures/shiftsnap_atpr.json 은 수집기가 실제 동방 서버에서 읽어 만든 스냅샷이다.
//   실행 — node tools/smoke_shiftsnap411_fb.cjs <firebase 번들.cjs>
const path = require('path');
const fs = require('fs');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_shiftsnap411_fb.cjs <firebase 번들.cjs>'); process.exit(1); }
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'shiftsnap_atpr.json'), 'utf8'));
const ymd = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const store = {};
const me = (name) => { store.tallyone_me_today = JSON.stringify({ name, ymd }); };
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.window = global.window || {};
global.window.alert = () => {};
global.window.dispatchEvent = () => true;
global.CustomEvent = global.CustomEvent || class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.document = global.document || { createElement: () => ({}) };
const _warn = console.warn; console.warn = () => {};

const vk = FX.vk, snap = FX.snap, cns = Object.keys(snap.rows);
const human = {}; cns.slice(0, 5).forEach((c, i) => { human[c] = { by: '박철민', at: 1790000000000 + i, equip: '2호기' }; });
const freshDb = () => ({
  term_snapshot: { _status: FX.status, [vk]: { loading: JSON.parse(JSON.stringify(snap)) } },
  voyages: { [vk]: { info: { ...FX.info }, loading: { completed: JSON.parse(JSON.stringify(human)) } } },
});
global.__memdb = freshDb(); global.__memlog = [];
const F = require(path.resolve(B));

let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const logs = () => global.__memlog;
const throwsOwner = async (fn) => { try { await fn(); return false; } catch (e) { return e && e.ownerOnly === true; } };
const comp = () => (global.__memdb.voyages[vk].loading || {}).completed || {};

(async () => {
  console.log('교대 시각 터미널 스냅샷 — 실소스 firebase.js');
  ok(['fbGetTermSnapshot', 'fbRequestTermSnapshot', 'fbApplyTermSnapshot'].every((f) => typeof F[f] === 'function'), '함수 셋이 번들에 있다');

  console.log('[1] 소유자가 아니면 막힌다 — 이름이 없을 때·검수원·수석(소유자 아님)');
  for (const who of ['', '박철민', '이수석']) {
    if (who) me(who); else delete store.tallyone_me_today;
    const a = await throwsOwner(() => F.fbGetTermSnapshot());
    const b = await throwsOwner(() => F.fbRequestTermSnapshot());
    const c = await throwsOwner(() => F.fbApplyTermSnapshot(vk, 'loading'));
    ok(a && b && c, `«${who || '이름 없음'}» — 읽기·요청·반영 모두 소유자 전용 오류`);
  }
  ok(logs().length === 0 && Object.keys(comp()).length === 5, '막힌 호출은 아무것도 쓰지 않았다(쓰기 0건 · 앱 완료 5대 그대로)');

  console.log('[1b] 하루 지나 기기 편의값(getMeToday)이 비어도 — 화면이 로그인한 이름(by)을 넘기면 소유자는 통과, 아니면 막힌다(감사 2026-10-07)');
  store.tallyone_me_today = JSON.stringify({ name: '김성일', ymd: '2020-01-01' });   // 어제 이전에 로그인한 탭 — 오늘 값이 아니다
  ok(await throwsOwner(() => F.fbGetTermSnapshot()), '이름을 안 넘기면 소유자도 막힌다(닫히는 쪽 — 안전)');
  const g = await F.fbGetTermSnapshot('김성일');
  ok(g && g._status, '이름(by)을 넘기면 소유자는 읽는다');
  ok(await throwsOwner(() => F.fbGetTermSnapshot('박철민')) && await throwsOwner(() => F.fbRequestTermSnapshot('박철민')) && await throwsOwner(() => F.fbApplyTermSnapshot(vk, 'loading', '박철민')), 'by 가 검수원이면 셋 다 막힌다');
  ok(await throwsOwner(() => F.fbGetTermSnapshot('김성일2')) && await throwsOwner(() => F.fbGetTermSnapshot('  ')), '비슷한 이름·빈칸은 막힌다');
  ok(logs().length === 0 && Object.keys(comp()).length === 5, '여기까지 쓰기 0건');
  global.__memlog = [];

  console.log('[2] 소유자 — 읽기');
  me('김성일');
  const all = await F.fbGetTermSnapshot();
  ok(all && all._status && all._status.slot === FX.status.slot && all[vk] && all[vk].loading && all[vk].loading.done === snap.done, '스냅샷 노드가 통째로 한 번에 온다(_status · 항차/모드)');
  ok(logs().length === 0, '읽기는 쓰기 0건');

  console.log('[3] 소유자 — 지금 다시 읽기 요청');
  const t0 = Date.now();
  await F.fbRequestTermSnapshot();
  const req = global.__memdb.term_snapshot._req;
  ok(req && typeof req.at === 'number' && req.at >= t0 && req.at <= Date.now() && req.by === '김성일', `term_snapshot/_req = {at(ms), by:"김성일"} (${JSON.stringify(req)})`);
  ok(logs().length === 1 && logs()[0].op === 'set' && logs()[0].path === 'term_snapshot/_req', '쓴 곳은 term_snapshot/_req 한 칸뿐');

  console.log('[4] 소유자 — 반영(동방 선적 · 계획 기준)');
  global.__memlog = [];
  const humanBefore = JSON.stringify(Object.fromEntries(Object.keys(human).map((c) => [c, comp()[c]])));
  const r1 = await F.fbApplyTermSnapshot(vk, 'loading');
  ok(r1.ok === true && r1.applied === snap.done - 5 && r1.basis === 'plan', `반영 ${r1.applied}대 = ${snap.done} - 검수원 5대 (basis ${r1.basis})`);
  ok(Object.keys(comp()).length === snap.done, `앱 완료가 ${snap.done}대가 됐다`);
  ok(JSON.stringify(Object.fromEntries(Object.keys(human).map((c) => [c, comp()[c]]))) === humanBefore, '검수원이 찍은 5대는 한 글자도 안 바뀌었다');
  const added = cns.filter((c) => !(c in human));
  ok(added.every((c) => comp()[c] && comp()[c].by === '' && comp()[c].src === 'term' && comp()[c].termBasis === 'plan' && comp()[c].at === snap.rows[c].at), '새로 들어간 컨 = {by:"", src:"term", at(터미널 시각), termBasis:"plan"}');
  const ups = logs().filter((l) => l.op === 'update');
  ok(logs().length === 1 && ups.length === 1 && ups[0].path === '', '쓰기는 update 한 번(루트 patch) — set·remove 없음');
  const types = Object.keys(global.__memdb.voyages[vk]).sort().join(',');
  ok(types === 'info,loading', `항차 아래 바뀐 칸 없음(${types}) — info·termWork·bayWork 를 안 건드린다`);
  ok(JSON.stringify(global.__memdb.voyages[vk].info) === JSON.stringify(FX.info), 'info 는 그대로');
  ok(JSON.stringify(global.__memdb.term_snapshot[vk].loading) === JSON.stringify(snap), '스냅샷 자체는 안 바꾼다(읽기 전용 입력)');

  console.log('[5] 두 번 눌러도 중복 없음');
  global.__memlog = [];
  const r2 = await F.fbApplyTermSnapshot(vk, 'loading');
  ok(r2.ok === true && r2.applied === 0 && logs().length === 0, '두 번째는 0건 · 쓰기 0건');

  console.log('[6] 잘못된 입력은 쓰지 않는다');
  global.__memlog = [];
  let thrown = false; try { await F.fbApplyTermSnapshot(vk, 'both'); } catch (e) { thrown = /올바르지/.test(e.message); }
  ok(thrown && logs().length === 0, '모드가 틀리면 던지고 쓰지 않는다');
  const r3 = await F.fbApplyTermSnapshot('NOPE_0000E', 'discharge');
  ok(r3.ok === true && r3.applied === 0 && logs().length === 0, '스냅샷이 없는 항차는 0건 · 쓰기 0건(던지지 않는다)');
  global.__memdb = freshDb(); delete global.__memdb.term_snapshot[vk].loading.rows; global.__memlog = [];
  const r4 = await F.fbApplyTermSnapshot(vk, 'loading');
  ok(r4.applied === 0 && logs().length === 0, '스냅샷에 rows 가 없으면 0건 · 쓰기 0건');

  console.log('[7] 동방 양하(actual)·카토스(PDA) — 표식 없이 들어간다');
  global.__memdb = freshDb(); global.__memlog = [];
  global.__memdb.term_snapshot[vk].discharge = { src: 'PNCT', basis: 'actual', rows: { AAAU1234567: { at: 1791370000000 } } };
  global.__memdb.term_snapshot[vk].loading.src = 'PCTC'; global.__memdb.term_snapshot[vk].loading.basis = 'PDA';
  const d = await F.fbApplyTermSnapshot(vk, 'discharge');
  const dc = (global.__memdb.voyages[vk].discharge || {}).completed || {};
  ok(d.applied === 1 && d.basis === 'actual' && dc.AAAU1234567 && dc.AAAU1234567.src === 'term' && !('termBasis' in dc.AAAU1234567), '동방 양하 1대 — termBasis 없음');
  const p = await F.fbApplyTermSnapshot(vk, 'loading');
  ok(p.applied === snap.done - 5 && p.basis === 'PDA' && Object.values(comp()).filter((r) => 'termBasis' in r).length === 0, '카토스(PDA) 선적 — termBasis 없음');

  console.warn = _warn;
  console.log(fail ? `\n✗ ${fail}건 실패` : '\n전부 통과');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('시험 자체가 죽었다:', e); process.exit(1); });
