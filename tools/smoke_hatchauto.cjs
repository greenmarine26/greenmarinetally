// 해치커버 자동 판정(3.49) 연막검사 — 실항차 두 척(SWTD 9013E PCTC 컨별 호기 · KKLC 2608N 동방 바구니 호기)의 터미널 실적 사본으로
//   utils.hatchEventsOf 를 실소스 그대로 돌려 열림·닫힘 사건이 실측 판독과 한 글자도 다르지 않은지 잰다. 쓰기 없음.
//
//  왜 있는가 — 검수사 2026-09-15 «데크 작업 완료후 시간 공백이 어느정도 있고 난후 다음 베이를 작업 한다면 그시간에 커버를 열었다고 판단» ·
//    «검수원 입력이 있으면 그건 우선 적용». 따라가기 모드는 이 판정을 사람에게 묻지 않고 reports 에 적으므로(«틀리면 마지막에 수석이 수정»)
//    판정이 소리 없이 바뀌면 타임시트가 통째로 틀린다. 기준값은 코드가 낸 값이 아니라 **실측 판독**(KKLC 25&27 닫힘 추정 04:42~04:47 vs 타임시트 04:45-04:50 ·
//    SWTD 1호기 장 02 데크 끝 01:54 → 9분 → 장 10 홀드) 에서 뽑았다.
//  잰다 — ① SWTD 16건(term 15 · est 1) 전수 ② KKLC 8건 — 동방 낱개 오귀속 런(장 30 «1대» 22:24)을 커버로 읽지 않는가
//    ③ 문지기: 해치 제외 배(OBWH) 0건 · 사전 없음 0건 · 미래 실적(+9h 오염) 제외 · workEndAt+2h 뒤 실적 제외 · 15분 캡 ④ hatchReportedOf — 검수원 보고/자동 보고 갈래
//    ⑤ **실시간 전진 재생** — termWork·completed 를 at ≤ T 로 잘라 T 를 1분씩 옮기며(항차 끝 표식 없이) 처음 나온 사건이 최종과 같은 시각인지. 감사(치명)가 잡은 «홀드 첫 컨에 닫힘» 재발 방지.
//       기준: 닫힘은 홀드가 끝났다는 증거(선적 데크 시작 또는 홀드 잔여 0·선적 자료 앎)가 있을 때만, 크레인 마지막 런이면 «지금»까지 3분 지나야 추정.
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_hatchauto.cjs <utils번들.cjs>'); process.exit(1); }
const U = require(path.resolve(B));
const FX = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/hatchauto.json'), 'utf8'));
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const T = (s) => Date.parse(s.replace(' ', 'T') + ':00+09:00');
const K = (ms) => { const d = new Date(ms + 9 * 3600e3); return d.toISOString().slice(5, 16).replace('T', ' '); };
const NOW = T('2026-09-15 12:00');
const voyOf = (v) => ({ info: v.info, discharge: v.discharge, loading: v.loading, reports: v.reports || {} });
const pagesOf = (v) => U.buildBayPagesFromSummary(v.dict.bayDef) || null;
const line = (e) => `${e.action === 'open' ? '🔓' : '🔒'} ${String(e.hatch).padStart(2, '0')} ${K(e.from)}~${K(e.to)} ${e.gapMin} ${e.crane} ${e.src}`;
const same = (got, exp, label) => {
  const g = got.map(line), x = exp.map(line);
  const miss = x.filter((s) => !g.includes(s)), extra = g.filter((s) => !x.includes(s));
  ok(!miss.length && !extra.length && g.length === x.length, `${label} ${x.length}건 전수 일치` + (miss.length ? ` — 빠짐 ${miss.join(' | ')}` : '') + (extra.length ? ` — 남음 ${extra.join(' | ')}` : ''));
};
const ev = (action, hatch, from, to, gapMin, crane, src = 'term') => ({ action, hatch, from: T(from), to: T(to), gapMin, crane, src });

console.log('해치커버 자동 판정 — 터미널 실적 크레인별 타임라인 (3.49)');
//  ① SWTD 9013E — PCTC(컨별 호기). 실측 판독 16건.
const swtd = U.hatchEventsOf(voyOf(FX.swtd), pagesOf(FX.swtd), NOW);
ok(swtd.rows.length === 964, `SWTD 실적 행 964 (${swtd.rows.length})`);
same(swtd.events, [
  ev('open', 22, '2026-09-11 14:23', '2026-09-11 14:28', 5, 3), ev('open', 18, '2026-09-11 16:00', '2026-09-11 16:06', 6, 3),
  ev('open', 14, '2026-09-11 19:15', '2026-09-11 19:30', 16, 2), ev('open', 30, '2026-09-11 19:54', '2026-09-11 19:57', 3, 3),
  ev('open', 26, '2026-09-11 22:02', '2026-09-11 22:11', 9, 2), ev('close', 14, '2026-09-11 23:40', '2026-09-11 23:44', 4, 1),
  ev('close', 30, '2026-09-11 23:54', '2026-09-12 00:09', 74, 2), ev('open', 2, '2026-09-12 01:54', '2026-09-12 02:03', 9, 1),
  ev('open', 10, '2026-09-12 01:54', '2026-09-12 02:03', 9, 1), ev('close', 26, '2026-09-12 02:46', '2026-09-12 02:59', 12, 2),
  ev('open', 6, '2026-09-12 04:10', '2026-09-12 04:18', 9, 1), ev('close', 22, '2026-09-12 05:24', '2026-09-12 05:39', 37, 2),
  ev('close', 6, '2026-09-12 05:37', '2026-09-12 05:47', 9, 1), ev('close', 18, '2026-09-12 09:01', '2026-09-12 09:14', 13, 2),
  ev('close', 10, '2026-09-12 11:08', '2026-09-12 11:23', 25, 2), ev('close', 2, '2026-09-12 11:42', '2026-09-12 11:47', 5, 2, 'est'),
], 'SWTD 9013E');
ok(swtd.events.every((e) => e.to - e.from <= 15 * 60000), '표시 끝은 15분 캡(공백 74·37·25분도 첫머리+15분)');
ok(swtd.events.every((e) => Array.isArray(e.bays) && e.bays.length >= 2 && e.bays.every((b) => b > 0)), '사건마다 장의 베이 목록(트리오)이 붙는다');
const o10 = swtd.events.find((e) => e.hatch === 10 && e.action === 'open');
ok(o10 && o10.bays.join(',') === '9,10,11', `장 10 = 베이 9·10·11 (${o10 && o10.bays.join('·')})`);
//  «공백 없이 바로 이동»은 커버가 아니다 — 1호기 장 10 데크 끝 21:54 → 2분 → 장 14 홀드. 장 10 열림은 홀드 직전 공백(01:54~02:03)이어야 한다.
ok(o10 && K(o10.from) === '09-12 01:54', '장 10 데크 끝(21:54) 직후 2분 이동은 커버가 아니다 — 홀드 직전 공백 01:54~02:03 으로 잡는다');

//  ② KKLC 2608N — 동방(컨별 호기 없음 → qcWork 2대 바구니). 실측 판독 8건. 타임시트 «25&27 닫음 04:45-04:50» ↔ 추정 04:42~04:47.
const kklc = U.hatchEventsOf(voyOf(FX.kklc), pagesOf(FX.kklc), NOW);
ok(kklc.rows.length === 254, `KKLC 실적 행 254 — +9h 오염 15줄·workEndAt(05:00)+2h 뒤 실적 제외 (${kklc.rows.length})`);
ok(kklc.rows.some((r) => r.crane === 1) && kklc.rows.some((r) => r.crane === 2), '동방 바구니로 1·2호기가 붙는다');
same(kklc.events, [
  ev('open', 26, '2026-09-14 22:19', '2026-09-14 22:24', 5, 1), ev('open', 18, '2026-09-14 23:42', '2026-09-14 23:46', 4, 1),
  ev('open', 30, '2026-09-15 01:41', '2026-09-15 01:48', 7, 2), ev('open', 2, '2026-09-15 01:43', '2026-09-15 01:47', 4, 1),
  ev('close', 2, '2026-09-15 02:30', '2026-09-15 02:33', 3, 1), ev('close', 30, '2026-09-15 03:35', '2026-09-15 03:50', 21, 2),
  ev('close', 18, '2026-09-15 03:51', '2026-09-15 04:01', 10, 1), ev('close', 26, '2026-09-15 04:42', '2026-09-15 04:47', 5, 1, 'est'),
], 'KKLC 2608N');
const o30 = kklc.events.find((e) => e.hatch === 30 && e.action === 'open');
ok(o30 && o30.crane === 2 && K(o30.from) === '09-15 01:41', '낱개 오귀속 런(1호기 장 30 «1대» 22:24) 뒤 공백을 커버로 읽지 않는다 — 진짜 데크(2호기 01:09~01:41) 끝 공백');

//  ③ 문지기
const nodict = U.hatchEventsOf(voyOf(FX.swtd), null, NOW);
ok(nodict.events.length === 0 && nodict.skipped === 'noDict', '베이사전이 없으면 판정하지 않는다(hatchEvenOf 폴백이 뒤홀수를 다른 장으로 쪼갠다)');
const skip = U.hatchEventsOf(voyOf({ ...FX.kklc, info: { ...FX.kklc.info, vsl: 'OBWH', vslFull: 'OSAKA BRIDGE WH' } }), pagesOf(FX.kklc), NOW);
ok(skip.events.length === 0 && skip.skipped === 'hatchSkipShip', '해치 제외 배(OBWH)는 판정 자체가 없다');
const mid = U.hatchEventsOf(voyOf(FX.swtd), pagesOf(FX.swtd), T('2026-09-12 00:00'));
ok(mid.rows.every((r) => r.at <= T('2026-09-12 00:05')) && mid.events.length > 0 && mid.events.length < swtd.events.length, `«지금» 뒤 실적은 안 본다(00:00 기준 사건 ${mid.events.length} < 전체 ${swtd.events.length})`);
//  workEndAt+2h 뒤 실적 — KKLC 에 09:00 홀드 실적 한 줄을 얹어도 장 26 닫힘 추정(04:42)이 안 움직인다.
const kk2 = JSON.parse(JSON.stringify(FX.kklc)); kk2.loading.termWork.ZZZZ0000001 = { at: T('2026-09-15 09:00'), pos: '260408' };
const kklc2 = U.hatchEventsOf(voyOf(kk2), pagesOf(FX.kklc), NOW);
const c26 = kklc2.events.find((e) => e.hatch === 26 && e.action === 'close');
ok(kklc2.rows.length === 254 && c26 && K(c26.from) === '09-15 04:42', 'workEndAt(05:00)+2h 뒤 실적은 판정에 안 들어간다');
const kk3 = JSON.parse(JSON.stringify(FX.kklc)); kk3.info.workEndAt = ''; kk3.loading.termWork.ZZZZ0000001 = { at: T('2026-09-15 09:00'), pos: '260408' };
const kklc3 = U.hatchEventsOf(voyOf(kk3), pagesOf(FX.kklc), NOW);
ok(kklc3.rows.length > 254 && K(kklc3.events.find((e) => e.hatch === 26 && e.action === 'close').from) !== '09-15 04:42', `(대조) workEndAt 이 없으면 +9h 오염 실적까지 들어와(행 ${kklc3.rows.length}) 장 26 닫힘이 움직인다 — 문지기가 실제로 걸러 낸 것`);

//  ④ 보고 상태 한 벌 — 검수원 보고(auto 없음) · 자동 보고(auto:true) · 베이→장 접기
const rep = U.hatchReportedOf({ reports: {
  1: { type: 'hatch', action: 'OPEN', bays: ['25', '26', '27'], ts: 100 },
  2: { type: 'hatch', action: 'close', bays: ['01', '02', '03'], ts: 200, auto: true, eventTs: 150 },
  3: { type: 'work_status', action: 'discharge_start', ts: 300 },
  4: { type: 'hatch', action: 'open', bays: ['27'], ts: 400, auto: true },
} }, pagesOf(FX.kklc));
ok(rep.size === 2, `보고 상태 — 장|동작 2건 (${[...rep.keys()].join(' ')})`);
ok(rep.get('26|open') && rep.get('26|open').manual && rep.get('26|open').auto && rep.get('26|open').ts === 400, '장 26 열림 = 검수원 보고(25·26·27) + 자동 보고(27) 가 한 장으로 접힌다');
ok(rep.get('2|close') && rep.get('2|close').auto && !rep.get('2|close').manual, '장 02 닫힘 = 자동 보고만');
const pending = kklc.events.filter((e) => !rep.has(`${e.hatch}|${e.action}`));
ok(pending.length === 6 && !pending.some((e) => e.hatch === 26 && e.action === 'open') && !pending.some((e) => e.hatch === 2 && e.action === 'close'), `보고된 장·동작은 알림·자동 기록에서 빠진다 (남은 ${pending.length}건)`);

//  ⑤ 실시간 전진 재생 — 항차가 진행 중일 때(끝 표식 없음)의 판정이 최종과 같은가. 실적 사본 중 workEndAt+2h 뒤 오염 행은 재생에서 뺀다(그 문지기는 ③에서 따로 잰다).
//    booking=true 면 «아직 안 한 컨»을 CATOS Booking 행({pos, status:'Booking', at 없음})으로 같이 얹는다 — 실측 SWTD 9012E 918행 중 94행이 Booking·전부 홀드(2차 감사). 완료로 세면 닫힘이 전부 이르다.
const replay = (v, label, expectMissing = [], booking = false) => {
  const pages = pagesOf(v);
  const endMs = v.info.workEndAt ? T(v.info.workEndAt) + 2 * 3600000 : Infinity;
  const clean = (sec) => ({ ...sec, termWork: Object.fromEntries(Object.entries(sec.termWork).filter(([, r]) => r.at <= endMs)), completed: Object.fromEntries(Object.entries(sec.completed || {}).filter(([, r]) => r.at && r.at <= endMs)) });
  const dis = clean(v.discharge), lod = clean(v.loading);
  const cut = (sec, t) => ({ ediContainers: sec.ediContainers,
    termWork: Object.fromEntries(Object.entries(sec.termWork).filter(([, r]) => r.at <= t).concat(booking ? Object.entries(sec.termWork).filter(([, r]) => r.at > t).map(([cn, r]) => [cn, { pos: r.pos, status: 'Booking' }]) : [])),
    completed: Object.fromEntries(Object.entries(sec.completed).filter(([, r]) => r.at <= t)) });
  const live = { ...v.info, workEndAt: '', dischargeDone: false, loadingDone: false, inspectorDone: false };
  const ats = [...Object.values(dis.termWork), ...Object.values(lod.termWork)].map((r) => r.at);
  const t0 = Math.min(...ats), t1 = Math.max(...ats) + 30 * 60000;
  const final = U.hatchEventsOf(voyOf(v), pages, NOW).events;
  const fmap = new Map(final.map((e) => [`${e.hatch}|${e.action}`, e]));
  const first = new Map(); let snaps = 0;
  for (let t = t0; t <= t1; t += 60000) {
    snaps++;
    for (const e of U.hatchEventsOf({ info: live, discharge: cut(dis, t), loading: cut(lod, t) }, pages, t).events) { const k = `${e.hatch}|${e.action}`; if (!first.has(k)) first.set(k, { ...e, seenAt: t }); }
  }
  const wrong = [...first].filter(([k, e]) => !fmap.has(k) || Math.abs(fmap.get(k).from - e.from) >= 60000).map(([k, e]) => `${k} 처음 ${K(e.from)} ≠ 최종 ${fmap.has(k) ? K(fmap.get(k).from) : '없음'}`);
  const missing = [...fmap.keys()].filter((k) => !first.has(k) && !expectMissing.includes(k));
  ok(!wrong.length && !missing.length, `${label} 전진 재생 ${snaps}스냅샷 — 처음 나온 사건 ${first.size}건이 최종 ${final.length}건과 같은 시각` + (wrong.length ? ` — 다름 ${wrong.join(' | ')}` : '') + (missing.length ? ` — 실시간엔 안 나온 ${missing.join(' ')}` : ''));
  return first;
};
const rp1 = replay(FX.swtd, 'SWTD 9013E');
replay(FX.swtd, 'SWTD 9013E + Booking 행', [], true);
//  «자료 없음 = 끝남» 구멍 — 양하 EDI 를 비우면(모름) 닫힘을 내지 않아야 한다(항차 끝 표식 뒤에만). 1.82-01 이 막은 구멍의 거울상.
{
  const pages = pagesOf(FX.swtd); const live = { ...FX.swtd.info, workEndAt: '', dischargeDone: false, loadingDone: false };
  const cutS = (sec, t, edi) => ({ ediContainers: edi, termWork: Object.fromEntries(Object.entries(sec.termWork).filter(([, r]) => r.at <= t)), completed: Object.fromEntries(Object.entries(sec.completed).filter(([, r]) => r.at <= t)) });
  //  남는 닫힘은 «그 장 위에 선적 데크가 시작됐다»(커버 없이는 못 싣는다)뿐이어야 한다 — 실측 SWTD 장 18 선적 데크 09:14 시작 → 닫힘 09:01 하나.
  const closesNoEdi = new Map(); let opensNoEdi = 0;
  for (let t = T('2026-09-11 13:00'); t <= T('2026-09-12 12:30'); t += 5 * 60000) {
    const r = U.hatchEventsOf({ info: live, discharge: cutS(FX.swtd.discharge, t, {}), loading: cutS(FX.swtd.loading, t, FX.swtd.loading.ediContainers) }, pages, t);
    for (const e of r.events) {
      if (e.action !== 'close') { opensNoEdi++; continue; }
      const k = `${e.hatch}|${e.action}`;
      if (!closesNoEdi.has(k)) closesNoEdi.set(k, { from: K(e.from), deckLoadStarted: r.rows.some((x) => x.hatch === e.hatch && x.deck && x.mode === 'loading' && x.at > e.from) });
    }
  }
  const noEvidence = [...closesNoEdi].filter(([, c]) => !c.deckLoadStarted);
  ok(!noEvidence.length && closesNoEdi.size === 1 && closesNoEdi.has('18|close') && opensNoEdi > 0, `양하 EDI 가 없으면(모름) 닫힘은 선적 데크가 시작된 장(18, 09:01)뿐 — 나온 닫힘 ${[...closesNoEdi.keys()].join(' ') || '없음'}` + (noEvidence.length ? ` · 증거 없는 닫힘 ${noEvidence.map(([k]) => k).join(' ')}` : ''));
}
//  KKLC 장 30 — 홀드 3대의 실적 at 이 +9h 로 오염돼(수집기 버그, 인계함) 실시간 재생에선 잔여 3 이 남아 닫힘이 안 나오고, 항차 끝 표식(dischargeDone·loadingDone) 뒤에야 03:35 로 나온다. 오염이 판정을 «못 내게» 할 뿐 «틀리게» 하지는 않는다는 것을 그대로 잰다.
const rp2 = replay(FX.kklc, 'KKLC 2608N', ['30|close']);
ok(!rp2.has('30|close') && K(kklc.events.find((e) => e.hatch === 30 && e.action === 'close').from) === '09-15 03:35', '장 30 닫힘 — 실적 +9h 오염(홀드 3대)이라 실시간엔 안 내고(잔여 3), 항차 끝 표식 뒤 03:35 로 낸다');
//  홀드가 아직 남았으면 닫힘을 안 낸다 — SWTD 장 14: 홀드 양하가 끝난 23:40 직후엔 닫힘, 그 직전(홀드 진행 중 23:00)엔 닫힘 없음
const swtdLive = { ...FX.swtd.info, workEndAt: '', dischargeDone: false, loadingDone: false };
const cutS = (sec, t) => ({ ediContainers: sec.ediContainers, termWork: Object.fromEntries(Object.entries(sec.termWork).filter(([, r]) => r.at <= t)), completed: Object.fromEntries(Object.entries(sec.completed).filter(([, r]) => r.at <= t)) });
const at2300 = U.hatchEventsOf({ info: swtdLive, discharge: cutS(FX.swtd.discharge, T('2026-09-11 23:00')), loading: cutS(FX.swtd.loading, T('2026-09-11 23:00')) }, pagesOf(FX.swtd), T('2026-09-11 23:00'));
ok(!at2300.events.some((e) => e.hatch === 14 && e.action === 'close') && (at2300.holdLeft.get(14) || 0) > 0, `장 14 홀드 진행 중(23:00, 잔여 ${at2300.holdLeft.get(14)})에는 닫힘을 내지 않는다`);
ok(rp1.get('14|close') && K(rp1.get('14|close').from) === '09-11 23:40' && rp1.get('14|close').src === 'est', `장 14 닫힘은 홀드 마지막 실적 23:40 뒤 3분에 추정으로 처음 나온다(감지 ${K(rp1.get('14|close').seenAt)})`);
ok(rp2.get('26|close') && K(rp2.get('26|close').from) === '09-15 04:42', 'KKLC 25&27 닫힘 — 실시간 재생에서도 04:42(타임시트 04:45-04:50)');

console.log(`해치 자동 판정 연막검사: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
