// 4.12 연막검사 2 — 실소스 firebase.js(메모리 RTDB 스텁)로 마감적용 쓰기 함수 fbApplyClosingEdi 와 사람 [완료] 덮어쓰기를 직접 친다. 실제 읽기·쓰기 없음.
//   ① 소유자가 아니면 막히고 아무것도 안 쓴다 ② 동방이 아니거나 작업 중이면 막힌다 ③ 쓰는 것은 completed/{컨} 추가뿐 — 검수원·터미널 반영 기록은 그대로, 두 번째는 0건
//   ④ 사람 [완료]가 마감 EDI 적용을 덮고 사람 기록은 안 덮는다. 픽스처 tools/fixtures/closingedi_atpr.json 은 ATPR 2645W 실제 항차 자료(보관소 GET)다.
//   실행 — node tools/smoke_closingedi412_fb.cjs <firebase 번들.cjs>
process.env.TZ = 'Asia/Seoul';   // 앱의 시각 읽기(_dtMs)는 기기 시간대를 쓴다 — 현장 기기는 한국 시간이다
const path = require('path');
const fs = require('fs');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_closingedi412_fb.cjs <firebase 번들.cjs>'); process.exit(1); }
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'closingedi_atpr.json'), 'utf8'));
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

const vk = FX.vk;
const cns = Object.keys(FX.loading.ediContainers);
const human = {}; cns.slice(0, 5).forEach((c, i) => { human[c] = { by: '박철민', at: 1791380000000 + i, equip: '2호기' }; });
const termRec = {}; cns.slice(5, 9).forEach((c, i) => { termRec[c] = { by: '', src: 'term', at: 1791381000000 + i, termBasis: 'plan' }; });
const clone = (o) => JSON.parse(JSON.stringify(o));
const freshDb = (over = {}) => ({
  voyages: { [vk]: { info: { ...clone(FX.info), ...over.info }, loading: { ediContainers: clone(FX.loading.ediContainers), records: clone(FX.loading.records), completed: { ...clone(human), ...clone(termRec) } } } },
});
global.__memdb = freshDb(); global.__memlog = [];
const F = require(path.resolve(B));

let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const logs = () => global.__memlog;
const throwsOwner = async (fn) => { try { await fn(); return false; } catch (e) { return e && e.ownerOnly === true; } };
const throwsMsg = async (fn, re) => { try { await fn(); return false; } catch (e) { return re.test(String(e && e.message)); } };
const comp = () => (global.__memdb.voyages[vk].loading || {}).completed || {};
const endMs = Date.parse('2026-10-08T03:50:00+09:00');   // info.workEndAt '2026-10-08 03:50' = 한국 시간(감사 2026-10-08 — 쓰는 시각은 기기 시간대와 무관하게 KST)

(async () => {
  console.log('마감적용 — 실소스 firebase.js (ATPR 2645W 실제 항차: EDI ' + cns.length + '대)');
  ok(typeof F.fbApplyClosingEdi === 'function', 'fbApplyClosingEdi 가 번들에 있다');

  console.log('[1] 소유자가 아니면 막힌다');
  for (const who of ['', '박철민', '이수석']) {
    if (who) me(who); else delete store.tallyone_me_today;
    ok(await throwsOwner(() => F.fbApplyClosingEdi(vk)), `«${who || '이름 없음'}» — 소유자 전용 오류`);
  }
  ok(await throwsOwner(() => F.fbApplyClosingEdi(vk, '박철민')) && await throwsOwner(() => F.fbApplyClosingEdi(vk, '김성일2')), 'by 가 검수원·비슷한 이름이면 막힌다');
  ok(logs().filter((l) => l.op !== 'get').length === 0 && Object.keys(comp()).length === 9, '막힌 호출은 아무것도 쓰지 않았다(쓰기 0건 · 앱 완료 9대 그대로)');

  console.log('[2] 문지기 — 동방이 아니거나 작업 중이면 쓰지 않는다');
  me('김성일');
  global.__memdb = freshDb({ info: { pier: 'PCTC' } }); global.__memlog = [];
  ok(await throwsMsg(() => F.fbApplyClosingEdi(vk, '김성일'), /동방\(PNCT\) 선박만/), 'PCTC 항차는 던진다');
  global.__memdb = freshDb({ info: { terminalStatus: 'working', workEndAt: '2999-01-01 00:00' } }); global.__memlog = [];
  ok(await throwsMsg(() => F.fbApplyClosingEdi(vk, '김성일'), /작업이 끝난 뒤에 쓰는/), '아직 작업 중(출항 전 · 작업 끝 시각이 미래)이면 던진다');
  global.__memdb = freshDb({ info: { terminalStatus: 'departed', workEndAt: '' } }); delete global.__memdb.voyages[vk].info.workEndAt;
  global.__memdb.voyages[vk].loading.completed = {}; global.__memlog = [];
  ok(await throwsMsg(() => F.fbApplyClosingEdi(vk, '김성일'), /작업 끝 시각을 알 수 없어/), '출항했어도 작업 끝 시각도 앱 완료도 없으면 던진다(값 없는 기록을 만들지 않는다)');
  ok(logs().filter((l) => l.op !== 'get').length === 0, '문지기에 걸린 호출은 쓰기 0건');

  console.log('[3] 소유자 · 동방 · 작업 끝 — 앱 완료 9대(검수원 5 · 터미널 반영 4)는 두고 나머지만 채운다');
  global.__memdb = freshDb(); global.__memlog = [];
  const before = JSON.stringify(Object.fromEntries(Object.keys(comp()).map((c) => [c, comp()[c]])));
  const r1 = await F.fbApplyClosingEdi(vk, '김성일');
  ok(r1.ok === true && r1.applied === cns.length - 9 && r1.total === cns.length && r1.appDone === 9 && r1.bad === 0, `채운 ${r1.applied}대 = ${cns.length} - 앱 완료 9 (total ${r1.total} · appDone ${r1.appDone} · bad ${r1.bad})`);
  ok(Object.keys(comp()).length === cns.length, `앱 완료가 ${cns.length}대(전부)가 됐다`);
  ok(JSON.stringify(Object.fromEntries(Object.keys(JSON.parse(before)).map((c) => [c, comp()[c]]))) === before, '앱에 있던 9대(검수원 5 · 터미널 반영 4)는 한 글자도 안 바뀌었다');
  const added = cns.filter((c) => !(c in human) && !(c in termRec));
  ok(added.length === cns.length - 9 && added.every((c) => { const r = comp()[c]; return r && Object.keys(r).sort().join(',') === 'at,by,src' && r.by === '' && r.src === 'edi' && r.at === endMs; }), `새 기록 = {by:"", src:"edi", at:작업 끝 시각} 뿐 — 호기·termBasis·flag 없음 (at ${r1.at})`);
  ok(r1.at === endMs, '완료 시각 = info.workEndAt (2026-10-08 03:50)');
  const ups = logs().filter((l) => l.op === 'update');
  ok(ups.length === 1 && ups[0].path === '' && logs().filter((l) => ['set', 'remove', 'push'].includes(l.op)).length === 0, '쓰기는 update 한 번(루트 patch) — set·remove 없음');
  const kids = Object.keys(global.__memdb.voyages[vk]).sort().join(',') + ' / ' + Object.keys(global.__memdb.voyages[vk].loading).sort().join(',');
  ok(kids === 'info,loading / completed,ediContainers,records', `바뀐 칸은 loading/completed 뿐(${kids}) — info·records·ediContainers 는 그대로`);
  ok(JSON.stringify(global.__memdb.voyages[vk].info) === JSON.stringify(FX.info), 'info 는 그대로');

  console.log('[4] 두 번 눌러도 중복 없음 · 앱에서 일부만 찍은 배도 같다');
  global.__memlog = [];
  const r2 = await F.fbApplyClosingEdi(vk, '김성일');
  ok(r2.ok === true && r2.applied === 0 && logs().filter((l) => l.op !== 'get').length === 0, '두 번째는 0건 · 쓰기 0건');

  console.log('[5] 사람 [완료]는 마감 EDI 적용을 덮고, 사람이 찍은 기록은 덮지 않는다');
  const ediCn = added[0], humanCn = cns[0];
  global.__memlog = [];
  const a = await F.fbCompleteContainer(vk, 'loading', ediCn, '박철민', 'normal', '', '3호기');
  ok(a && a.ok === true && comp()[ediCn].by === '박철민' && comp()[ediCn].equip === '3호기' && !('src' in comp()[ediCn]), '현장 [완료]가 마감 EDI 적용 기록을 사람 기록으로 덮는다(이름·호기가 들어가고 src 표식은 사라진다)');
  const b = await F.fbCompleteContainer(vk, 'loading', humanCn, '이다른', 'normal', '', '1호기');
  ok(b && b.ok === false && b.already === true && comp()[humanCn].by === '박철민', '사람이 이미 찍은 컨은 여전히 «이미 완료»로 막힌다(덮지 않음)');

  console.log('[6] 키로 못 쓰는 번호는 조용히 넘기지 않고 건수로 알린다');
  global.__memdb = freshDb(); global.__memlog = [];
  global.__memdb.voyages[vk].loading.ediContainers['BAD.CN#1'] = { ...clone(Object.values(FX.loading.ediContainers)[0]), pol: 'KRPTK' };
  const r3 = await F.fbApplyClosingEdi(vk, '김성일');
  ok(r3.bad === 1 && r3.applied === cns.length - 9 && !Object.keys(comp()).some((k) => /[.#$\[\]]/.test(k)), `키로 못 쓰는 1대는 넣지 않고 건수(bad ${r3.bad})로 알린다 · 나머지 ${r3.applied}대는 정상`);

  console.warn = _warn;
  console.log(fail ? `\n✗ ${fail}건 실패` : '\n전부 통과');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('시험 자체가 죽었다:', e); process.exit(1); });
