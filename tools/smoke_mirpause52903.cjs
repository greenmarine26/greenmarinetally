// 5.29-04 연막검사 — 작업 중단 알림·«멈춘 지 얼마나» 를 STMJ 2675E 실자료(2026-11-28 양하 완료 기록 165건 · 마지막 15:44)로 잰다.
//   실측 — 17:27 «15:45 4호기 작업중단 강풍대기» 가 시작 알림으로 읽혀 작업 시작이 15:45 로 덮였고(실제 10:30), 17:24 «미르야 작업이 멈춘지 얼마나 되었지?» 는 «얼마나 남았어» 로 바뀌어 답했다.
//   검수사 2026-11-28 17:28 «방금 미르에게 질문하고 알리고 한것이 답과 알림 인지가 틀립니다» · 17:34 «3호기 4호기 둘다 작업중단입니다. 같은 시간에»
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'pause52903_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' }, __fbShipBayDict: {} };
global.localStorage = global.localStorage || { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
global.CustomEvent = global.CustomEvent || class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
const _cw = console.warn; console.warn = (...a) => { if (/베이사전|미르 학습/.test(String(a[0]))) return; _cw(...a); };

(async () => {
  try {
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, [
      `export { parseMirWorkReport } from "${ROOT}/src/workReportParse.js";`,
      `export { planMirWorkReport, saidAtMs } from "${ROOT}/src/workReportPlan.js";`,
      `export { parseNaturalQuery } from "${ROOT}/src/nlSearch.js";`,
      `export { answerOneRaw, isWeakAnswer, workPauseOf } from "${ROOT}/src/mir.js";`,
    ].join('\n'));
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    const B = require(o);
    const V = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/pause52903_stmj.json'), 'utf8'));
    const NOW = Date.parse('2026-11-28T17:27:59+09:00');
    const hm = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

    // ① 시작 알림으로 읽지 않는다
    const p1 = B.parseNaturalQuery('15:45 4호기 작업중단 강풍대기');
    ok('① «15:45 4호기 작업중단 강풍대기» 는 시작 알림(startSet)이 아니다', !p1.startSet, JSON.stringify(p1.startSet));
    ok('① 작업보고 중단 · 4호기 · 사유 강풍대기 · 말한 시각 15:45', p1.workRep && p1.workRep.verb === 'pause' && p1.workRep.equip === '4호기' && p1.workRep.reason === '강풍대기' && p1.workRep.at && p1.workRep.at.hh === 15 && p1.workRep.at.mm === 45, JSON.stringify(p1.workRep));
    for (const q of ['15:45 4호기 작업 멈춤 강풍', '16시 3호기 작업 정지 우천', '15:45 작업 대기 강풍']) ok(`① «${q}» 도 시작 알림 아님`, !B.parseNaturalQuery(q).startSet);
    for (const q of ['22시부터 작업 시작', '1호기 09시 30분 시작', '미르야 2호기는 23:15 3호기는 23:20 4호기는 23:25 에 시작했어', '22:00부터 재계산']) ok(`① 진짜 시작 알림 «${q}» 은 그대로`, !!B.parseNaturalQuery(q).startSet);

    // ② 여러 호기 · 말한 시각으로 적는다
    const p2 = B.parseMirWorkReport('미르야 15:45 3호기 4호기 작업중단 강풍대기');
    ok('② «15:45 3호기 4호기 작업중단 강풍대기» → 호기 둘(3·4호기)', p2 && JSON.stringify(p2.equips) === '["3호기","4호기"]', JSON.stringify(p2 && p2.equips));
    const aw = { '3호기': { discharge: { status: 'running', mode: 'discharge' } }, '4호기': { discharge: { status: 'running', mode: 'discharge' } } };
    const r2 = B.planMirWorkReport(p2, { voyageKey: 'STMJ_2675E', voyage: V, activeWork: aw, inspectors: {}, relayBy: '김성일', nowMs: NOW });
    const reps = (r2.writes || []).filter((w) => w.report), aws = (r2.writes || []).filter((w) => w.aw);
    ok('② 호기마다 중단 보고 한 건씩(3호기·4호기)', reps.length === 2 && reps.map((w) => w.report.equip).join(',') === '3호기,4호기' && reps.every((w) => w.report.action === 'discharge_pause' && w.report.reason === '강풍대기'), JSON.stringify(reps.map((w) => w.report.equip)));
    ok('② 보고에 말한 시각 saidAt 15:45 · 호기 상태 pausedAt 15:45', reps.every((w) => hm(w.report.saidAt) === '15:45') && aws.every((w) => hm(w.aw.val.pausedAt) === '15:45'), reps.map((w) => hm(w.report.saidAt)).join(','));
    ok('② 카톡 보고 문구 시각도 15:45', reps.every((w) => /15:45/.test(w.report.message)), reps[0] && reps[0].report.message);
    ok('② 되읽기에 «15:45부터» · 두 호기', /3호기 양하 중단\(사유 강풍대기\) 15:45부터/.test(r2.readback) && /4호기 양하 중단/.test(r2.readback), r2.readback);
    const r2b = B.planMirWorkReport(p2, { voyageKey: 'STMJ_2675E', voyage: V, activeWork: { '3호기': aw['3호기'] }, inspectors: {}, relayBy: '김성일', nowMs: NOW });
    ok('② 한 호기라도 되물으면 아무것도 안 적는다(4호기 모드 모름)', !!r2b.ask && !r2b.writes, JSON.stringify(r2b).slice(0, 80));
    ok('② «3시 반» 은 가장 가까운 지난 시각 15:30', hm(B.saidAtMs({ hh: 3, mm: 30 }, NOW)) === '15:30');
    ok('② 시각 없으면 지금 시각(말한 시각 0)', B.saidAtMs(null, NOW) === 0);
    ok('② 12시간 넘게 지난 시각은 쓰지 않는다(«00:30»)', B.saidAtMs({ hh: 0, mm: 30 }, NOW) === 0);
    ok('② «5시» 는 17:00(오후)로', hm(B.saidAtMs({ hh: 5, mm: 0 }, NOW)) === '17:00');

    // ③ «멈춘 지 얼마나» — 중단 보고가 있으면 그 시각부터, 없으면 마지막 완료 기록
    const ctx = (v) => ({ app: 'tally', smallTalkLast: true, modeChoice: 'both', inspector: '김성일', isChief: true, voyages: { STMJ_2675E: v }, voyageKey: 'STMJ_2675E', voyage: v, info: v.info, vsl: v.info.vsl, mode: 'discharge', containers: [], diagAlerts: [], _now: NOW, _trace: {} });
    const c3 = ctx(V); const a3 = String(B.answerOneRaw('미르야 작업이 멈춘지 얼마나 되었지?', c3) || '');
    ok('③ 중단 보고 없음 → «중단 보고는 없어요» + 마지막 완료 양하 15:44 · 43분 전', /중단 보고는 없어요/.test(a3) && /양하 15:44/.test(a3) && /43분 전/.test(a3) && c3._trace.via === 'pauseAgo', a3);
    ok('③ 강한 답(모델로 «얼마나 남았어» 로 안 넘긴다)', !B.isWeakAnswer('미르야 작업이 멈춘지 얼마나 되었지?', a3, c3._trace));
    const V2 = JSON.parse(JSON.stringify(V));
    V2.reports = {}; for (const w of reps) { const ts = NOW + reps.indexOf(w); V2.reports[ts] = Object.assign({}, w.report, { ts }); }
    const c4 = ctx(V2); const a4 = String(B.answerOneRaw('작업 멈춘 지 몇 분 됐어', c4) || '');
    ok('③ 중단 보고 있음 → «15:45부터 멈췄어요 — 1시간 43분째 · 사유 강풍대기»', /15:45부터 멈췄어요/.test(a4) && /1시간 43분째/.test(a4) && /강풍대기/.test(a4), a4);
    const wp = B.workPauseOf(V2, NOW, null, { perEquip: true });
    ok('③ workPauseOf 는 말한 시각(saidAt)을 멈춘 때로 본다', wp && hm(wp.ts) === '15:45', JSON.stringify(wp));
    const a5 = String(B.answerOneRaw('왜 작업 안 해', ctx(V2)) || '');
    ok('③ «왜 작업 안 해» 도 15:45부터 중단 중', /15:45부터 중단 중/.test(a5), a5);

    // ④ 미르를 부르지 않은 작업보고 말 — 엉뚱한 답 대신 «미르야» 를 붙이라고
    const c6 = ctx(V); const a6 = String(B.answerOneRaw('15:45 4호기 작업중단 강풍대기', c6) || '');
    ok('④ 검색창 «15:45 4호기 작업중단 강풍대기» → «아직 안 적었어요 … «미르야» 를 붙여»(갱 배분 답 아님)', /아직 안 적었어요/.test(a6) && /미르야/.test(a6) && /4호기 15:45 작업 중단/.test(a6) && !/갱 배분/.test(a6), a6);

    // ⑤ 감사 «부» 재현(5.29-04 감사 1차) — 진짜 시작·재개·기간·남의 호기·다른 물음
    for (const q of ['1호기 22시 쉬프팅 작업 시작', '강풍대기 끝나고 15시 작업 시작', '휴식 끝나고 22시부터 재계산']) ok(`⑤ «${q}» 는 여전히 시작 알림`, !!B.parseNaturalQuery(q).startSet, JSON.stringify(B.parseNaturalQuery(q).startSet));
    const p7 = B.parseNaturalQuery('16:30 3호기 4호기 작업 재개');
    ok('⑤ «16:30 3호기 4호기 작업 재개» → 재개 작업보고 · 시작 알림 아님', !p7.startSet && p7.workRep && p7.workRep.verb === 'resume' && p7.workRep.at && p7.workRep.at.hh === 16, JSON.stringify({ s: p7.startSet, w: p7.workRep }));
    const p8 = B.parseMirWorkReport('4호기 작업중단 2시간째 강풍');
    ok('⑤ «2시간째» 는 시각이 아니다(at 없음)', p8 && !p8.at, JSON.stringify(p8));
    const p9 = B.parseMirWorkReport('4호기 작업중단 3호기 고장');
    ok('⑤ 사유 속 «3호기» 는 호기로 안 잡는다(4호기만)', p9 && JSON.stringify(p9.equips) === '["4호기"]', JSON.stringify(p9 && p9.equips));
    ok('⑤ 한 호기 되물음 문구에 «어느 호기도 아직 안 적었어요»', /어느 호기도 아직 안 적었어요/.test(String(r2b.ask || '')), r2b.ask);
    const V3 = JSON.parse(JSON.stringify(V2)); const _dk = Object.keys(V3.reports)[0]; const _t16 = Date.parse('2026-11-28T16:05:00+09:00');
    V3.reports[_t16] = { ts: _t16, type: 'work_status', action: 'discharge_done', equip: '4호기', mode: 'discharge' };
    const c10 = ctx(V3); (c10.containers = []);
    const a10 = String(B.answerOneRaw('작업 멈춘 지 얼마나 됐어', c10) || '');
    ok('⑤ 4호기만 완료 보고 → 3호기는 아직 15:45부터 멈춤(«중단 보고는 없어요» 아님)', /3호기 양하 작업이 15:45부터 멈췄어요/.test(a10) && !/중단 보고는 없어요/.test(a10), a10);
    { const V6 = JSON.parse(JSON.stringify(V3)); const t6 = Date.parse('2026-11-28T16:06:00+09:00'); V6.reports[t6] = { ts: t6, type: 'work_status', action: 'discharge_done', equip: '3호기', mode: 'discharge' };
      const a = String(B.answerOneRaw('작업 멈춘 지 얼마나 됐어', ctx(V6)) || ''); ok('⑤ 두 호기 다 완료 보고 → «중단 보고가 있지만 …»(없다고 하지 않음)', /중단 보고\(사유 강풍대기\)가 있지만/.test(a) && !/중단 보고는 없어요/.test(a), a); }
    for (const q of ['멈춘 다음 얼마나 남았어', '언제부터 쉬는 시간이야']) { const cx = ctx(V); B.answerOneRaw(q, cx); ok(`⑤ «${q}» 는 멈춘 지 얼마나 답이 아니다`, !(cx._trace && cx._trace.via === 'pauseAgo'), cx._trace && cx._trace.via); }
    for (const q of ['2호기 양하 완료했어', '14번 베이 해치 열었어']) { const cx = ctx(V); const a = String(B.answerOneRaw(q, cx) || ''); ok(`⑤ «${q}» 에 작업보고 힌트 안 붙음`, !(cx._trace && cx._trace.via === 'workReportHint'), a.slice(0, 60)); }
    const p11 = B.parseNaturalQuery('4호기 작업 중단 사유 뭐야');
    ok('⑤ «4호기 작업 중단 사유 뭐야» 는 멈춤 알림 아님', !p11.pauseSet || !p11.pauseSet.sure, JSON.stringify(p11.pauseSet));

    // ⑥ 재감사(2차) — 두 호기 함께 · 바람 멈춘 지 · «3·4호기» · 사유 묻는 말 · 쉼 끝 시작 말
    const a12 = String(B.answerOneRaw('작업 멈춘 지 얼마나 됐어', ctx(V2)) || '');
    ok('⑥ 3·4호기 함께 멈춤 → 답에 «3호기·4호기» 둘 다', /3호기·4호기 양하 작업이 15:45부터 멈췄어요/.test(a12), a12);
    const a13 = String(B.answerOneRaw('왜 작업 안 해', ctx(V2)) || '');
    ok('⑥ «왜 작업 안 해» 도 «3호기·4호기»', /3호기·4호기/.test(a13), a13);
    { const cx = ctx(V); B.answerOneRaw('바람 멈춘 지 얼마나 됐어', cx); ok('⑥ «바람 멈춘 지 얼마나 됐어» 는 작업 멈춤 답 아님', !(cx._trace && cx._trace.via === 'pauseAgo'), cx._trace && cx._trace.via); }
    for (const q of ['3·4호기 작업중단 강풍대기', '3,4호기 15:45 작업중단', '15:45 3호기 4호기 작업중단']) { const pq = B.parseMirWorkReport(q); ok(`⑥ «${q}» → 3호기·4호기`, pq && JSON.stringify(pq.equips) === '["3호기","4호기"]', JSON.stringify(pq && pq.equips)); }
    for (const q of ['뭐야 비와서 작업 중단이야', '작업중단 강풍대기 뭐냐 이거 바람 세네']) { const pq = B.parseNaturalQuery(q); ok(`⑥ «${q}» 는 멈춤 알림`, !!(pq.pauseSet || pq.workRep), JSON.stringify(pq.pauseSet)); }
    for (const q of ['작업 중단 뭐 때문이야', '4호기 작업 중단 사유가 뭐예요']) { const pq = B.parseNaturalQuery(q); ok(`⑥ «${q}» 는 멈춤 알림 아님`, !pq.pauseSet || !pq.pauseSet.sure, JSON.stringify(pq.pauseSet)); }
    for (const q of ['점심 끝나고 13시부터 작업', '휴식 후 22시부터 작업', '대기 풀려서 15시부터 작업', '강풍 끝나고 16:30 작업 시작']) { const pq = B.parseNaturalQuery(q); ok(`⑥ «${q}» → 시작 말(쉼 끝 표시 afterBreak)`, pq.startSet && pq.startSet.afterBreak === true, JSON.stringify(pq.startSet)); }
    ok('⑥ «22시부터 작업 시작» 은 쉼 끝 표시 없음', B.parseNaturalQuery('22시부터 작업 시작').startSet && !B.parseNaturalQuery('22시부터 작업 시작').startSet.afterBreak);
    { const VS = JSON.parse(JSON.stringify(V)); VS.info.workStartManual = '2026-11-28 10:30'; const cx = ctx(VS); cx.info = VS.info; const a = String(B.answerOneRaw('강풍 끝나고 16:30 작업 시작', cx) || '');
      ok('⑥ 쉼 끝 시작 말 → «작업 시작은 이미 10:30로 적혀 있어 덮지 않아요»', /이미 10:30로 적혀 있어 덮지 않아요/.test(a), a); }

    // ⑦ 재감사(3차) — 한 호기만 재개 · 사유 묻기
    { const V4 = JSON.parse(JSON.stringify(V2)); const t = NOW + 50; V4.reports[t] = { ts: t, saidAt: Date.parse('2026-11-28T16:30:00+09:00'), type: 'work_status', action: 'discharge_resume', mode: 'discharge', equip: '3호기' };
      const w = B.workPauseOf(V4, NOW, null, { perEquip: true }); ok('⑦ 3·4호기 중단 뒤 3호기만 재개 → 답 문구 판정(perEquip)은 4호기 아직 멈춤', w && w.equip === '4호기' && hm(w.ts) === '15:45', JSON.stringify(w));
      ok('⑦ 배 단위 판정(사담·화남)은 종전대로 — 마지막이 재개면 멈춤 아님', !B.workPauseOf(V4, NOW));
      { const V7 = JSON.parse(JSON.stringify(V4)); V7.discharge.completed.ZZZU0000001 = { at: NOW + 60000 }; ok('⑦ 호기 칸 빈 완료가 뒤에 있으면 재개로 본다', !B.workPauseOf(V7, NOW, null, { perEquip: true })); }
      const V5 = JSON.parse(JSON.stringify(V4)); const t2 = NOW + 60; V5.reports[t2] = { ts: t2, saidAt: Date.parse('2026-11-28T16:31:00+09:00'), type: 'work_status', action: 'discharge_resume', mode: 'discharge', equip: '4호기' };
      ok('⑦ 둘 다 재개 → 멈춤 아님', !B.workPauseOf(V5, NOW, null, { perEquip: true })); }
    { const a = String(B.answerOneRaw('4호기 작업 중단 사유 뭐야', ctx(V2)) || ''); ok('⑦ «4호기 작업 중단 사유 뭐야» → 실제 사유 강풍대기', /강풍대기/.test(a) && /15:45/.test(a), a); }

    // ⑧ 라이브 확인(5.29-04 1차 라이브 부) — 중단 보고 없는 배 · 미르 칸
    { const NOWL = Date.parse('2026-11-28T17:27:00+09:00'); const VW = JSON.parse(JSON.stringify(V)); VW.info.terminalStatus = 'working';   // 작업 중(터미널 work)·근무 창 안
      const cl = (box) => Object.assign(ctx(VW), { _now: NOWL, mirBox: box });
      { const cx = Object.assign(ctx(VW), { _now: Date.parse('2026-11-28T12:30:00+09:00') }); const VL = JSON.parse(JSON.stringify(VW)); for (const [k, x] of Object.entries(VL.discharge.completed)) if (x.at > Date.parse('2026-11-28T12:00:00+09:00')) delete VL.discharge.completed[k]; cx.voyages = { STMJ_2675E: VL }; cx.voyage = VL;
        B.answerOneRaw('왜 작업 안 해', cx); ok('⑧ 중식 시간(12:30)에는 «중단 보고 없음» 으로 가로채지 않는다', !(cx._trace && cx._trace.via === 'workStopNone'), cx._trace && cx._trace.via); }
      { const cx = Object.assign(ctx(V), { _now: Date.parse('2026-11-28T20:13:00+09:00') }); const a = String(B.answerOneRaw('작업 중단 사유 뭐야', cx) || ''); ok('⑧ 작업 시간 밖 «중단 사유 뭐야» → 중단 보고 없음 · 작업 시간 밖', /중단 보고는 없어 사유를 몰라요/.test(a) && /작업 중으로 잡혀 있지 않아요/.test(a), a.slice(0, 90)); }
      { const cx = Object.assign(ctx(V), { _now: Date.parse('2026-11-28T20:13:00+09:00') }); B.answerOneRaw('왜 작업 안 해', cx); ok('⑧ 작업 시간 밖 «왜 작업 안 해» 는 종전 갈래(가로채지 않음)', !(cx._trace && cx._trace.via === 'workStopNone'), cx._trace && cx._trace.via); }
      for (const q of ['미르야 왜 작업 안 해', '미르야 4호기 작업 중단 사유 뭐야', '작업 중단 사유 뭐야']) { const cx = cl(false); const a = String(B.answerOneRaw(q, cx) || ''); ok(`⑧ «${q}» → «중단 보고는 없어 사유를 몰라요 · 마지막 완료 양하 15:44»(인사·기능 설명 아님)`, /중단 보고는 없어 사유를 몰라요/.test(a) && /양하 15:44/.test(a) && !B.isWeakAnswer(q, a, cx._trace), a.slice(0, 80)); }
      { const cx = cl(true); const q = '15:45 4호기 작업중단 강풍대기'; const a = String(B.answerOneRaw(q, cx) || ''); ok('⑧ 미르 칸 작업보고 답은 강한 답(모델 번역으로 «시작» 이 되지 않게)', !B.isWeakAnswer(q, a, cx._trace), cx._trace.via); }
      const srcM = fs.readFileSync(path.join(ROOT, 'src/mir.js'), 'utf8'); const srcS = fs.readFileSync(path.join(ROOT, 'src/components/SearchPanel.jsx'), 'utf8');
      ok('⑧ askMir 는 작업보고·호기 이동 말을 모델에 안 보낸다', /p\.gangSet \|\| p\.workRep \|\| p\.moveSet\)\)\) return \{ text: rulesText/.test(srcM));
      ok('⑧ 통합검색 모델 부르기도 작업보고 말 제외', /parsed\.gangSet \|\| parsed\.workRep \|\| parsed\.moveSet\) return undefined;/.test(srcS)); }
  } catch (e) { bad += 1; console.log('  ✘ 연막 실행 실패 — ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' / ') : e)); }
  console.log(`5.29-04 작업 중단 알림·멈춘 지 얼마나 연막검사 — ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})();
