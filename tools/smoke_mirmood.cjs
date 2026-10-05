// 미르 기분(3.56) 연막검사 — 실 RTDB 스냅샷(2026-09-22 11:43, 항차 14·하트비트)으로 src/mir.js [mirMood] 를 실소스 그대로 돌려 검수사 규칙과 대조한다. 쓰기 없음.
//
//  검수사 규칙(2026-09-22 11:51) — «배고픔은 식사시간 10분전부터 식사시간 시작전까지 식후는 배부름 · 기쁨은 작업완료시나 검수사가 작업을 선택했을시 ·
//    슬픔은 미르가 답을 못주거나 미르의 행동을 보고도 방치 할시 · 심심함은 말그대로 작업이 없을시나 질문이나 시키는일이 없을시» · 초조함 = 자료가 안 들어올 때.
//  잰다 — ① 식사 창(PCTC 근무표의 빈 자리 60분 이상 = 야식·아침·점심·저녁, 티타임 제외, 자정 걸침 합침) ② 배고픔 10분 전 / 배부름 식후 30분 ③ 자정 야식 10분 전(23:50)
//    ④ 초조함 세 갈래(하트비트 · 시작 6시간 전 EDI 없음 · 완료 60분 없음) ⑤ 방치 30분 → 슬픔, 열어 보면 초조함 ⑥ 순간 감정 12초 ⑦ 우선순위 ⑧ 기억 한 벌(noteMirAsk·mirMoodEvent)
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_mirmood.cjs <mirMood번들.cjs>'); process.exit(1); }
const M = require(path.resolve(B));
const FX = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/mirmood.json'), 'utf8'));
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const T = (s) => Date.parse(s.replace(' ', 'T') + ':00+09:00');
const V = FX.voyages, HB = FX.heartbeat;
const fresh = (now) => ({ at: now - 60000, cycleMin: 5 });   // 하트비트 정상(1분 전)
//  4.06 — 초조함·슬픔은 «일하는 배가 있을 때만» 보인다(검수사 2026-10-05 20:57). 그 시험용 — PCSZ 2628E 가 일하고 완료를 방금(2분 전) 눌렀다(화남이 안 서도록)
const Wv = (n) => ({ ...V, PCSZ_2628E: { ...V.PCSZ_2628E, info: { ...V.PCSZ_2628E.info, workStartAt: '2026-09-23 01:10' }, discharge: { dataAt: V.PCSZ_2628E.discharge.dataAt, completed: { MSKU1234567: { at: n - 2 * 60000 } } } } });

console.log('미르 기분 — 검수사 규칙 대조 (3.56)');
//  ① 식사 창
const meals = M.mealWindows('PCTC');
ok(JSON.stringify(meals) === JSON.stringify([[0, 60], [390, 480], [720, 780], [1050, 1140]]), `PCTC 식사 창 4개(야식 00:00~01:00·아침 06:30~08:00·점심 12:00~13:00·저녁 17:30~19:00 — 근무표 그대로) — ${JSON.stringify(meals)}`);
ok(JSON.stringify(M.mealWindows('PNCT')) === JSON.stringify([[-30, 60], [330, 480], [690, 780], [1050, 1140]]), `PNCT 식사 창 4개(야식은 23:30~01:00 으로 자정을 걸쳐 합쳐진다) — ${JSON.stringify(M.mealWindows('PNCT'))}`);
//  ② 배고픔·배부름 (하트비트 정상·EDI 조건 안 걸리는 오늘 낮)
const at = (hm, extra) => M.mirMoodNow({ now: T('2026-09-22 ' + hm), voyages: V, heartbeat: fresh(T('2026-09-22 ' + hm)), lastAskAt: T('2026-09-22 ' + hm) - 60000, ...(extra || {}) });
ok(at('11:49').key !== 'hungry' && at('11:49').key !== 'full', `11:49 아직 배고프지 않다(${at('11:49').key})`);
ok(at('11:50').key === 'hungry', `11:50 점심 10분 전 → 배고픔 (${at('11:50').why})`);
ok(at('11:59').key === 'hungry', `11:59 → 배고픔`);
ok(at('12:00').key === 'full', `12:00 식사 시작 → 배부름 (${at('12:00').why})`);
ok(at('13:29').key === 'full', `13:29 식후 29분 → 배부름`);
ok(at('13:30').key !== 'full' && at('13:30').key !== 'hungry', `13:30 배부름 끝 (${at('13:30').key})`);
ok(at('17:25').key === 'hungry', `17:25 저녁 5분 전 → 배고픔`);
//  ③ 자정 야식(PCTC 00:00 시작) — 23:50 배고픔(자정 넘김), 00:30 배부름, 01:20 식후 → 배부름, 23:20 은 아니다
ok(at('23:20').key !== 'hungry', `23:20 은 아직 아니다 (${at('23:20').key})`);
ok(at('23:55').key === 'hungry', `23:55 야식 5분 전 → 배고픔 — 자정 넘김 (${at('23:55').why})`);
ok(at('00:30').key === 'full' && at('01:20').key === 'full', `00:30·01:20 야식 중·식후 → 배부름`);
const pn = M.mirMoodNow({ now: T('2026-09-22 23:25'), voyages: V, heartbeat: fresh(T('2026-09-22 23:25')), pier: 'PNCT' });
ok(pn.key === 'hungry', `동방(PNCT) 23:25 → 야식 23:30 5분 전 배고픔 (${pn.why})`);
//  ④ 초조함 — ⓐ 하트비트 끊김(실측 스냅샷 하트비트 11:42:53 · 12:10 이면 27분)
//  4.06 — 작업 중인 배가 없을 땐(이 스냅샷 시각들엔 일하는 배가 없다) 수집기가 조용해도 초조하지 않다. 일하는 배가 있으면 초조하다.
const a1 = M.mirMoodNow({ now: T('2026-09-22 13:40'), voyages: V, heartbeat: HB });
ok(a1.key === 'prep' && !/수집기/.test(a1.why), `작업 중인 배가 없으면 하트비트 118분 끊김이어도 초조하지 않다 → 다음 작업 준비 (${a1.why})`);
const nA1 = T('2026-09-23 10:00'), wA1 = Wv(nA1);
const a1w = M.mirMoodNow({ now: nA1, voyages: wA1, heartbeat: { at: nA1 - 27 * 60000, cycleMin: 5 } });
ok(a1w.key === 'anxious' && /수집기가 27분째/.test(a1w.why), `일하는 배가 있는데 하트비트 27분 끊김 → 초조함 (${a1w.why})`);
ok(M.mirMoodNow({ now: nA1, voyages: wA1, heartbeat: { at: nA1 - 13 * 60000, cycleMin: 5 } }).key !== 'anxious', `하트비트 13분(주기 5분×3 이내) → 초조하지 않다`);
//  ⓑ SWTD 9014E — 양하 500 계획인데 양하 EDI 없음(선적은 있음). 시작 09-23 19:00 → 13:00 부터 6시간 전
const a2 = M.mirMoodNow({ now: T('2026-09-23 14:00'), voyages: Wv(T('2026-09-23 14:00')), heartbeat: fresh(T('2026-09-23 14:00')) });
ok(a2.key === 'anxious' && /SWTD 양하 EDI가 아직이에요 \(5시간 뒤 시작\)/.test(a2.why), `내일 14:00 SWTD 양하 EDI 없음 → 초조함 (${a2.why})`);
ok(!/SWTD 선적/.test(a2.why), `SWTD 선적 EDI 는 있으므로 선적은 안 든다`);
const a3 = M.mirMoodNow({ now: T('2026-09-23 12:00'), voyages: Wv(T('2026-09-23 12:00')), heartbeat: fresh(T('2026-09-23 12:00')) });
ok(!/SWTD/.test(a3.why || ''), `내일 12:00(7시간 전)은 아직 SWTD 를 기다리지 않는다 (${a3.key})`);
ok(!/OBWH|RZOR|ATPR/.test(a2.why), `OBWH·RZOR·ATPR 은 계획 대수 0(도선·메일 예보) — EDI 없어도 초조하지 않다`);
//  ⓒ 작업 중인 배의 완료 기록 60분 없음 — 실측 PCSZ 2628E 에 workStartAt·완료 기록을 얹어 본다(스냅샷은 시작 전)
const now4 = T('2026-09-23 10:00');
const V4 = { ...V, PCSZ_2628E: { ...V.PCSZ_2628E, info: { ...V.PCSZ_2628E.info, workStartAt: '2026-09-23 01:10' }, discharge: { dataAt: V.PCSZ_2628E.discharge.dataAt, completed: { MSKU1234567: { at: now4 - 61 * 60000 } } } } };
const a4 = M.mirMoodNow({ now: now4, voyages: V4, heartbeat: fresh(now4), lastAskAt: now4 - 60000 });
ok(a4.key === 'angry' && /PCSZ 터미널은 작업 중인데 앱 완료 기록이 실작업 61분째 없어요/.test(a4.why), `작업 중 완료 61분 없음(08:59~10:00 은 근무 창 안 — 실작업 61분) → 화남 (${a4.why})`);   // 3.69-01: 실작업 분(쉬는 시간 제외) · 4.06: 초조함이 아니라 화남(검수사 2026-10-05 18:40)
const V4b = { ...V4, PCSZ_2628E: { ...V4.PCSZ_2628E, discharge: { ...V4.PCSZ_2628E.discharge, completed: { MSKU1234567: { at: now4 - 10 * 60000 } } } } };
ok(M.mirMoodNow({ now: now4, voyages: V4b, heartbeat: fresh(now4), lastAskAt: now4 - 60000 }).key === 'basic', `완료 10분 전이면 기본`);
//  ⑤ 방치 → 슬픔 / 열어 보면 초조함
const n5 = T('2026-09-23 14:40');
const s5 = M.mirMoodNow({ now: n5, voyages: Wv(n5), heartbeat: fresh(n5), anxiousSince: T('2026-09-23 14:00') });
ok(s5.key === 'sad' && /40분째 말했는데 봐 주지 않아요/.test(s5.why), `초조함 40분 방치 → 슬픔 (${s5.why})`);
ok(M.mirMoodNow({ now: n5, voyages: Wv(n5), heartbeat: fresh(n5), anxiousSince: T('2026-09-23 14:00'), openedAt: T('2026-09-23 14:10') }).key === 'anxious', `열어 봤으면 초조함으로`);
ok(M.mirMoodNow({ now: n5, voyages: Wv(n5), heartbeat: fresh(n5), anxiousSince: T('2026-09-23 14:20') }).key === 'anxious', `20분이면 아직 초조함`);
//  ⑥ 순간 감정 12초 · ⑦ 우선순위(초조함보다 앞선다)
const n6 = T('2026-09-23 14:00');
const ev = (kind, ago) => M.mirMoodNow({ now: n6, voyages: Wv(n6), heartbeat: fresh(n6), lastEvent: { kind, why: 'x', at: n6 - ago } });
ok(ev('workPick', 3000).key === 'happy' && ev('workDone', 3000).key === 'happy', `작업 선택·완료 직후 → 기쁨(초조함 위에)`);
ok(ev('missed', 3000).key === 'sad', `못 답한 직후 → 슬픔`);
ok(ev('workPick', 13000).key === 'anxious', `13초 지나면 순간 감정이 걷힌다 → 초조함`);
//  심심함 — 4.06: 작업 중인 배가 있는데 30분 넘게 시키는 일이 없을 때만(배가 없을 땐 휴식·취미·준비)
const n7 = T('2026-09-22 13:40');
const b1 = M.mirMoodNow({ now: n7, voyages: V, heartbeat: fresh(n7), lastAskAt: n7 - 60000 });
ok(b1.key === 'prep' && /XTPG 20분 뒤 시작 — 다음 작업을 준비하고 있어요/.test(b1.why), `작업 중인 배 없음(isWorkingNow 한 벌)·XTPG 20분 뒤 시작 → 심심함이 아니라 다음 작업 준비 (${b1.why})`);
const n8 = T('2026-09-23 10:00');
const b2 = M.mirMoodNow({ now: n8, voyages: V4b, heartbeat: fresh(n8), lastAskAt: n8 - 31 * 60000 });
ok(b2.key === 'bored' && /PCSZ 작업 중인데 31분 넘게/.test(b2.why), `작업 중 31분 질문 없음 → 심심함 (${b2.why})`);
ok(M.mirMoodNow({ now: n8, voyages: V4b, heartbeat: fresh(n8), lastAskAt: n8 - 29 * 60000 }).key === 'basic', `29분이면 기본`);
//  ⑧ 기억 한 벌
M.noteMirAsk(n8 - 60000);
ok(M.currentMirMood(V4b, fresh(n8), n8).key === 'basic', `currentMirMood — 방금 물었으면 기본`);
M.mirMoodEvent('missed', '«츌항 언제» 못 배웠어요', n8);
ok(M.currentMirMood(V4b, fresh(n8), n8 + 1000).key === 'sad', `mirMoodEvent(missed) → 슬픔`);
ok(M.currentMirMood(V4b, fresh(n8), n8 + 13000).key === 'basic', `12초 뒤 걷힘`);
const st = M.currentMirMood(Wv(n6), fresh(n6), n6); ok(st.key === 'anxious' && M.mirMoodState().anxiousSince === n6, `초조함 시작 시각을 기억한다`);
ok(M.currentMirMood(Wv(n6 + 31 * 60000), fresh(n6), n6 + 31 * 60000).key === 'sad', `31분 방치(열람 없음) → 슬픔`);
M.noteMirOpen(n6 + 31 * 60000 + 1000);
ok(M.currentMirMood(Wv(n6 + 31 * 60000 + 2000), fresh(n6), n6 + 31 * 60000 + 2000).key === 'anxious', `열어 보면 다시 초조함`);
//  ⑨-2 4.06 화남 — 검수사 2026-10-05 18:40 «초조함이 아니라 화난표정이어야 함 작업은 진행중인데 앱 입력이 없으니 화난다는 뜻으로»
console.log('\n화남 (4.06)');
ok(M.MIR_MOODS.angry && M.MIR_MOODS.angry.label === '화남' && M.MIR_MOODS.angry.badge === '💢', `기분 사전에 화남(💢)이 있다`);
ok(!M.anxiousReasons(V4, fresh(now4), now4).some((x) => /완료 기록/.test(x)), `초조함의 이유에는 더 이상 «완료 기록 없음» 이 없다(화남으로 옮김)`);
ok(M.angryReasons(V4, fresh(now4), now4).length === 1 && M.angryReasons(V4, null, now4).length === 1, `화남 이유 1건 — 하트비트가 아직 없어도(null) 본다`);
//  수집기가 조용하면 터미널 «작업 중» 도 믿을 수 없다 → 화내지 않고 초조함(수집기)
const hbDead = { at: now4 - 27 * 60000, cycleMin: 5 };
const d1 = M.mirMoodNow({ now: now4, voyages: V4, heartbeat: hbDead, lastAskAt: now4 - 60000 });
ok(d1.key === 'anxious' && /수집기가 27분째/.test(d1.why) && !M.angryReasons(V4, hbDead, now4).length, `수집기 27분 끊김 + 완료 없음 → 화남 아님, 초조함(수집기) (${d1.why})`);
//  쉬는 시간(PCTC 12:00~13:00 점심)엔 화내지 않는다 — 검수사 2026-09-29 «그 시간대엔 작업자도 작업중인 장비도 없는상태»
const nLunch = T('2026-09-23 12:30');
const V4L = { ...V4, PCSZ_2628E: { ...V4.PCSZ_2628E, discharge: { ...V4.PCSZ_2628E.discharge, completed: { MSKU1234567: { at: T('2026-09-23 10:30') } } } } };
const lu = M.mirMoodNow({ now: nLunch, voyages: V4L, heartbeat: fresh(nLunch), lastAskAt: nLunch - 60000 });
ok(M.angryReasons(V4L, fresh(nLunch), T('2026-09-23 11:45')).length === 1, `11:45 완료 10:30 → 실작업 75분(근무 창 안) → 화남 이유가 선다`);
ok(lu.key !== 'angry' && !M.angryReasons(V4L, fresh(nLunch), nLunch).length, `12:30 점심 시간엔 같은 상태여도 화내지 않는다 → ${lu.key}`);
//  앱에 작업 중단 보고가 있으면 완료가 없는 게 당연하다 — 화내지 않는다(3.69-01 한 벌)
const V4P = { ...V4, PCSZ_2628E: { ...V4.PCSZ_2628E, reports: { [String(now4 - 30 * 60000)]: { type: 'work_status', action: 'discharge_pause', mode: 'discharge', reason: '야드혼잡', ts: now4 - 30 * 60000 } } } };
ok(M.angryReasons(V4P, fresh(now4), now4).length === 0, `앱에 중단 보고(야드혼잡)가 있으면 화내지 않는다`);
//  완료 기록이 아예 없는 배는 건드리지 않는다(종전과 같음 — 앱을 안 쓰는 배일 수 있다)
const V4N = { ...V4, PCSZ_2628E: { ...V4.PCSZ_2628E, discharge: { dataAt: V.PCSZ_2628E.discharge.dataAt } } };
ok(M.angryReasons(V4N, fresh(now4), now4).length === 0, `완료 기록이 한 건도 없는 배는 화내지 않는다(종전 규칙 그대로)`);
//  화남은 초조함(EDI)보다 먼저 보인다 — 14:10 SWTD 양하 EDI 가 없지만 PCSZ 는 일하는데 완료가 70분 없다
const n9 = T('2026-09-23 14:10');
const V9 = { ...V, PCSZ_2628E: { ...V4.PCSZ_2628E, discharge: { dataAt: V.PCSZ_2628E.discharge.dataAt, completed: { MSKU1234567: { at: T('2026-09-23 12:30') } } } } };
ok(M.anxiousReasons(V9, fresh(n9), n9).some((x) => /SWTD 양하 EDI/.test(x)), `(전제) 14:10 에는 SWTD 양하 EDI 대기(초조함 이유)도 같이 선다`);
const g9 = M.mirMoodNow({ now: n9, voyages: V9, heartbeat: fresh(n9), lastAskAt: n9 - 60000 });
ok(g9.key === 'angry' && /PCSZ/.test(g9.why), `화남이 초조함(EDI)보다 먼저 보인다 (${g9.why})`);
//  완료를 하나 누르면 풀린다 · 화남은 «열어 보지 않아 슬픔» 으로 번지지 않는다(초조함 시작 시각을 만들지 않는다)
const V9ok = { ...V9, PCSZ_2628E: { ...V9.PCSZ_2628E, discharge: { ...V9.PCSZ_2628E.discharge, completed: { MSKU1234567: { at: T('2026-09-23 12:30') }, MSKU7654321: { at: n9 - 2 * 60000 } } } } };
ok(M.mirMoodNow({ now: n9, voyages: V9ok, heartbeat: fresh(n9), lastAskAt: n9 - 60000 }).key === 'anxious', `완료를 하나 누르면 화남이 풀린다(남은 건 SWTD EDI 초조함)`);
const nA = now4 + 5 * 60000;   // 10:05 — 앞 시험의 순간 감정(10:00 못 답함 12초)이 걷힌 뒤
const cm = M.currentMirMood(V4, fresh(nA), nA); ok(cm.key === 'angry' && M.mirMoodState().anxiousSince === 0, `currentMirMood — 화남은 초조함 시작 시각을 만들지 않는다`);
ok(M.currentMirMood(V4, fresh(nA + 40 * 60000), nA + 40 * 60000).key === 'angry', `40분을 안 열어 봐도 슬픔으로 번지지 않고 화남 그대로`);
//  ── 4.06 독립 감사 지적 반영 시험 ──
const mk = (patchInfo, extra) => ({ ...V, PCSZ_2628E: { ...V4.PCSZ_2628E, info: { ...V4.PCSZ_2628E.info, ...(patchInfo || {}) }, ...(extra || {}) } });
//  ⓐ 앱에 올라온 컨(홈 카드와 같은 분모 voyageCountsOf)을 앱 완료가 다 채운 배는 화내지 않는다(터미널은 출항 전까지 «작업중» 으로 남는다) — 재감사: 배정 수량(planDis·planLod)은 대수 기준이 아니다
const edi = (cn) => ({ cn, pod: 'KRPTK', pol: 'CNSHA', iso: '45G1', size: '40', ft: 'F', bay: '010302' });
const comp1 = { MSKU1234567: { at: now4 - 61 * 60000 } };
const dEdi = (n, comp) => ({ dataAt: V.PCSZ_2628E.discharge.dataAt, ediContainers: Object.fromEntries(['MSKU1234567', 'MSKU7654321'].slice(0, n).map((cn) => [cn, edi(cn)])), completed: comp });
ok(M.angryReasons(mk({ planLod: 0 }, { discharge: dEdi(1, comp1) }), fresh(now4), now4).length === 0, `앱 컨 1대에 완료 1대(1/1)면 화내지 않는다 — 배정 수량 621 은 대수 기준이 아니다`);
ok(M.angryReasons(mk({ planLod: 0 }, { discharge: dEdi(2, comp1) }), fresh(now4), now4).length === 1, `앱 컨 2대에 완료 1대(1/2)면 화낸다`);
ok(M.angryReasons(mk({ planLod: 0 }, { discharge: dEdi(2, { ...comp1, MSKU9999999: { at: now4 - 61 * 60000, flag: 'extra' } }) }), fresh(now4), now4).length === 1, `초과컨(앱 컨 목록에 없는 완료)이 붙어도 완료를 부풀리지 않는다(1/2 → 화남)`);
ok(M.angryReasons(mk({}, { discharge: dEdi(1, comp1) }), fresh(now4), now4).length === 1, `선적 배정 241대인데 선적 컨이 앱에 안 올라왔으면 양하 1/1 이어도 입력할 게 남았다 → 화낸다`);
ok(M.angryReasons(mk({ planDis: 0, planLod: 0 }), fresh(now4), now4).length === 1, `앱 컨도 배정도 모르면(0) 종전처럼 본다 → 화낸다(모른다를 «끝» 으로 치지 않는다)`);
//  D1 — 검수원이 홈 카드에서 «검수 완료» 를 눌렀으면 화내지 않는다(PNCT 는 workEndAt 이 실출항이라 작업이 끝나도 출항까지 터미널이 «작업중»)
ok(M.angryReasons(mk({ inspectorDone: true }), fresh(now4), now4).length === 0, `수석 완료(inspectorDone)면 화내지 않는다`);
ok(M.angryReasons(mk({ dischargeDone: true, loadingDone: true }), fresh(now4), now4).length === 0, `양하·선적 둘 다 검수 완료면 화내지 않는다`);
ok(M.angryReasons(mk({ dischargeDone: true }), fresh(now4), now4).length === 1, `선적 노드가 있는데 양하만 검수 완료면 아직 선적이 남았다 → 화낸다(HomePage.isAllDone 과 같은 규칙)`);
ok(M.angryReasons(mk({ dischargeDone: true }, { loading: undefined }), fresh(now4), now4).length === 0, `양하만 보유한 항차는 양하 검수 완료 하나로 끝이다 → 화내지 않는다`);
//  ⓑ 모든 호기의 마지막 앱 보고가 «작업 끝» 이면 화내지 않는다 — 호기별로 따진다(재감사 D2)
const wsr = (act, mode, equip, ago) => ({ [String(now4 - ago * 60000)]: { type: 'work_status', action: act, mode, equip, ts: now4 - ago * 60000 } });
const rp = (...xs) => Object.assign({}, ...xs);
const repDone = rp(wsr('discharge_start', 'discharge', '1호기', 120), wsr('discharge_done', 'discharge', '1호기', 20));
ok(M.angryReasons(mk({}, { reports: repDone }), fresh(now4), now4).length === 0, `1호기가 양하 시작→끝(discharge_done)이고 다른 호기 보고가 없으면 화내지 않는다`);
const repTwoGangs = rp(wsr('discharge_start', 'discharge', '2호기', 180), wsr('discharge_start', 'discharge', '1호기', 170), wsr('discharge_done', 'discharge', '1호기', 30));
ok(M.angryReasons(mk({}, { reports: repTwoGangs }), fresh(now4), now4).length === 1, `1호기만 끝 보고를 올리고 2호기는 일하는 중이면 «끝» 이 아니다 → 화낸다(호기별)`);
const repBothDone = rp(wsr('discharge_start', 'discharge', '2호기', 180), wsr('discharge_start', 'discharge', '1호기', 170), wsr('discharge_done', 'discharge', '1호기', 30), wsr('discharge_done', 'discharge', '2호기', 20));
ok(M.angryReasons(mk({}, { reports: repBothDone }), fresh(now4), now4).length === 0, `두 호기 모두 끝 보고를 올렸으면 화내지 않는다`);
const repDoneThenInput = rp(wsr('discharge_start', 'discharge', '1호기', 200), wsr('discharge_done', 'discharge', '1호기', 100));
ok(M.angryReasons(mk({}, { reports: repDoneThenInput }), fresh(now4), now4).length === 1, `끝 보고(100분 전) 뒤에 완료가 찍혔고(61분 전) 그 뒤 입력이 없으면 «끝» 으로 굳히지 않고 다시 본다 → 화낸다`);
const repDoneRestart = rp(wsr('discharge_done', 'discharge', '1호기', 50), wsr('discharge_start', 'discharge', '1호기', 20));
ok(M.angryReasons(mk({}, { reports: repDoneRestart }), fresh(now4), now4).length === 0 && M.angryReasons(mk({}, { reports: repDoneRestart }), fresh(now4 + 41 * 60000), now4 + 41 * 60000).length === 1, `끝(50분 전) → 다시 시작(20분 전): 재시작 직후는 조용하고, 재시작 뒤 실작업 60분을 넘기면 다시 화낸다`);
//  ⓒ 중단 뒤 재개 보고 — 재개 시각부터 잰다(중단 시간이 그대로 세지 않는다)
const repResume = { [String(now4 - 40 * 60000)]: { type: 'work_status', action: 'discharge_pause', mode: 'discharge', reason: '야드혼잡', ts: now4 - 40 * 60000 }, [String(now4 - 5 * 60000)]: { type: 'work_status', action: 'discharge_resume', mode: 'discharge', ts: now4 - 5 * 60000 } };
ok(M.angryReasons(mk({}, { reports: repResume }), fresh(now4), now4).length === 0, `중단 40분 전 → 재개 5분 전이면 마지막 완료(61분 전)부터 세지 않고 재개부터 잰다 → 화내지 않는다`);
ok(M.angryReasons(mk({}, { reports: repResume }), fresh(now4 + 61 * 60000), now4 + 61 * 60000).length === 1, `재개 뒤 실작업 60분을 넘기고도 완료가 없으면 다시 화낸다`);
const repResume2 = rp(wsr('discharge_pause', 'discharge', '1호기', 90), wsr('discharge_resume', 'discharge', '1호기', 70), wsr('discharge_pause', 'discharge', '1호기', 40), wsr('discharge_resume', 'discharge', '1호기', 5));
ok(M.angryReasons(mk({}, { reports: repResume2 }), fresh(now4), now4).length === 0, `재개가 두 번이면 가장 늦은 재개(5분 전)부터 잰다 → 화내지 않는다`);
//  D4 — 카톡 이관 보고는 action 이 접두어 없는 «pause»·«resume» 이다(kakaoWorkLog)
const kkPause = { [String(now4 - 30 * 60000)]: { type: 'work_status', action: 'pause', mode: '', equip: '1호기', ts: now4 - 30 * 60000 } };
ok(M.angryReasons(mk({}, { reports: kkPause }), fresh(now4), now4).length === 0, `카톡 이관 중단 보고(action «pause»)도 중단으로 본다 → 화내지 않는다`);
const kkResume = { ...kkPause, [String(now4 - 5 * 60000)]: { type: 'work_status', action: 'resume', mode: '', equip: '1호기', ts: now4 - 5 * 60000 } };
ok(M.angryReasons(mk({}, { reports: kkResume }), fresh(now4), now4).length === 0 && M.angryReasons(mk({}, { reports: kkResume }), fresh(now4 + 61 * 60000), now4 + 61 * 60000).length === 1, `카톡 이관 재개(action «resume»)도 재개로 본다 → 직후는 조용, 재개 뒤 60분이 넘으면 화낸다`);
//  D8 — 카톡 이관 보고(모드·호기 빈칸)가 호기별 «끝» 판정을 막지 않는다
const kkFlow = rp(wsr('discharge_start', 'discharge', '1호기', 300), wsr('pause', '', '1호기', 200), wsr('resume', '', '1호기', 190), wsr('discharge_done', 'discharge', '1호기', 20));
ok(M.angryReasons(mk({}, { reports: kkFlow }), fresh(now4), now4).length === 0, `앱 시작(1호기) → 카톡 중단·재개(모드 빈칸) → 양하 끝(1호기)이면 «끝» 이다 → 화내지 않는다`);
const kkDone = rp(wsr('discharge_start', 'discharge', '1호기', 300), wsr('discharge_done', 'discharge', '', 20));
ok(M.angryReasons(mk({}, { reports: kkDone }), fresh(now4), now4).length === 0, `앱 시작(1호기) → 카톡 양하 끝(호기 빈칸)이면 그 모드의 일찍 시작한 호기도 같이 닫힌다 → 화내지 않는다`);
//  호기 빈칸 «끝» 의 닫기 범위(재감사 4차) — 같은 시각이면 닫고, 다른 모드·더 늦게 다시 시작한 호기는 닫지 않는다
const n61 = now4 + 61 * 60000;
ok(M.angryReasons(mk({}, { reports: rp(wsr('discharge_start', 'discharge', '1호기', 20), wsr('discharge_done', 'discharge', '', 20)) }), fresh(n61), n61).length === 0, `호기 빈칸 «끝» 은 같은 시각에 시작한 호기도 닫는다(시각 동일 경계)`);
ok(M.angryReasons(mk({}, { reports: rp(wsr('loading_start', 'loading', '1호기', 300), wsr('discharge_done', 'discharge', '', 20)) }), fresh(now4), now4).length === 1, `양하 끝(호기 빈칸)이 선적에서 일하는 호기를 닫지 않는다 → 화낸다`);
ok(M.angryReasons(mk({}, { reports: rp(wsr('discharge_done', 'discharge', '', 50), wsr('discharge_start', 'discharge', '2호기', 20)) }), fresh(now4 + 41 * 60000), now4 + 41 * 60000).length === 1, `끝(호기 빈칸) 뒤에 다시 시작한 2호기는 닫지 않는다 → 재시작 뒤 60분이 넘으면 화낸다`);
//  경계 — 끝 보고와 마지막 완료가 같은 시각이면 «끝»(≥), 1ms 이르면 다시 본다. 정확히 실작업 60분은 화내지 않는다
const atComp = now4 - 61 * 60000;
const rAt = (ts) => ({ [String(ts)]: { type: 'work_status', action: 'discharge_done', mode: 'discharge', equip: '1호기', ts } });
ok(M.angryReasons(mk({}, { reports: rAt(atComp) }), fresh(now4), now4).length === 0 && M.angryReasons(mk({}, { reports: rAt(atComp - 1) }), fresh(now4), now4).length === 1, `끝 보고가 마지막 완료와 같은 시각이면 조용하고, 1ms 이르면(완료가 더 늦다) 다시 본다`);
const done60 = mk({}, { discharge: { dataAt: V.PCSZ_2628E.discharge.dataAt, completed: { MSKU1234567: { at: now4 - 60 * 60000 } } } });
ok(M.angryReasons(done60, fresh(now4), now4).length === 0, `정확히 실작업 60분은 화내지 않는다(60분을 «넘어야» 한다)`);
//  경계 — 12시간 넘은 보고·미래(+5분 넘는) 보고는 보지 않는다
const old14 = mk({}, { discharge: { dataAt: V.PCSZ_2628E.discharge.dataAt, completed: { MSKU1234567: { at: now4 - 14 * 3600000 } } }, reports: rAt(now4 - 13 * 3600000) });
ok(M.angryReasons(old14, fresh(now4), now4).length === 1, `13시간 전 끝 보고는 보지 않는다(완료가 14시간 전이면 화남 그대로)`);
ok(M.angryReasons(mk({}, { reports: rAt(now4 + 10 * 60000) }), fresh(now4), now4).length === 1, `미래(+10분) 끝 보고는 보지 않는다`);
//  경계 — 한쪽이 전량 캔슬이면 그쪽 배정은 입력할 게 아니다(양하 1/1 이면 조용), 대수 세기가 던져도 조용히 «끝» 으로 치지 않고 화남을 유지한다
ok(M.angryReasons(mk({ cancelLod: true }, { discharge: dEdi(1, comp1) }), fresh(now4), now4).length === 0, `선적이 전량 캔슬(배정 241이어도)이면 양하 1/1 로 끝이다 → 화내지 않는다`);
const warnSave = console.warn; let warned = 0; console.warn = () => { warned++; };
const bad = M.angryReasons(mk({ planLod: 0 }, { discharge: { dataAt: 1, ediContainers: { a: null }, completed: comp1 } }), fresh(now4), now4).length;
console.warn = warnSave;
ok(bad === 1 && warned >= 1, `앱 대수 세기가 예외를 던져도 «끝» 으로 치지 않고 화남을 유지하며 경고를 남긴다(경고 ${warned}회)`);
//  D7 — 실데이터 MCSC 633N(시프팅 95대): 리스트 컨만 끝나고 시프팅이 남았으면 홈 카드는 남았다고 하므로 미르도 화낸다. 시프팅까지 끝나면 조용.
const MX = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/progress_mcsc.json'), 'utf8')), SBX = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/shifting_berth.json'), 'utf8')).MCSC_633N;
const expandX = (o, key) => { const m = {}; for (const [cn, c] of Object.entries(o)) m[cn] = { cn, bay: c.b, row: c.r, tier: c.t, [key]: c[key], iso: c.i, fe: c.f, pod: c.pod, pol: c.pol }; return m; };
const nM = T('2026-10-06 15:30');
const mcsc = (compD, compL) => ({ MCSC_633N: { info: { vsl: 'MCSC', voy: '633N', voy_d: '633N', berthShift: SBX.bs, terminalStatus: 'working', workStartAt: '2026-10-05 08:00', planDate: '2026-10-06 08:00 ~ 2026-10-07 20:00', pier: 'PCTC', planDis: 279, planLod: 213 }, swapFix: MX.swapFix,
  discharge: { dataAt: 1, ediContainers: expandX(SBX.d, 'pod'), records: MX.discharge.records, completed: compD },
  loading: { dataAt: 1, ediContainers: expandX(SBX.l, 'pol'), records: MX.loading.records, completed: compL } } });
const atOld = (cns) => Object.fromEntries(cns.map((cn, i) => [cn, { at: nM - 90 * 60000 + i }]));
const listD = Object.keys(MX.discharge.records), listL = Object.keys(MX.loading.records), ediD = Object.keys(SBX.d), ediL = Object.keys(SBX.l);
ok(M.angryReasons(mcsc(atOld(listD), atOld(listL)), fresh(nM), nM).length === 1, `MCSC 633N 실데이터 — 리스트 컨만 완료하고 시프팅 컨이 남았으면(홈 카드 분모는 시프팅까지) 화낸다`);
ok(M.angryReasons(mcsc(atOld([...new Set([...listD, ...ediD])]), atOld([...new Set([...listL, ...ediL])])), fresh(nM), nM).length === 0, `MCSC 633N 실데이터 — 리스트·시프팅 컨까지 전부 완료하면 조용하다`);
//  ⓓ 임계값 — 45분은 화내지 않고 61분은 화낸다
const done45 = mk({}, { discharge: { dataAt: V.PCSZ_2628E.discharge.dataAt, completed: { MSKU1234567: { at: now4 - 45 * 60000 } } } });
ok(M.angryReasons(done45, fresh(now4), now4).length === 0, `마지막 완료 45분 전은 화내지 않는다(60분 규칙)`);
//  ⓔ 작업 중이 아닌 배는 옛 완료 기록만으로 화내지 않는다(isWorkingNow 문지기)
ok(M.angryReasons(mk({ terminalStatus: 'planned', workStartAt: '' }), fresh(now4), now4).length === 0, `터미널이 작업중이 아니면(planned) 완료가 오래돼도 화내지 않는다`);
//  ⓕ 동방(PNCT) 근무표 — 11:40 은 동방 쉬는 시간(11:30~13:00)이고 PCTC 는 아직 일하는 시간(~12:00)이다
const nPn = T('2026-09-23 11:40');
const asPn = mk({ pier: 'PNCT', berth: '동부두 15번선석' }, { discharge: { dataAt: V.PCSZ_2628E.discharge.dataAt, completed: { MSKU1234567: { at: T('2026-09-23 09:00') } } } });
const asPc = mk({ pier: 'PCTC', berth: '' }, { discharge: asPn.PCSZ_2628E.discharge });
ok(M.angryReasons(asPn, fresh(nPn), nPn).length === 0 && M.angryReasons(asPc, fresh(nPn), nPn).length === 1, `11:40 — 동방은 쉬는 시간이라 화내지 않고, 같은 상태 PCTC 는 일하는 시간이라 화낸다`);
//  ⓖ 화남이 보이는 동안은 «안 봐 준다» 시계가 세지 않는다 — 화남이 풀린 뒤 초조함이 갑자기 슬픔으로 번지지 않는다
M.noteMirOpen(0);
const cg = M.currentMirMood(V9, fresh(n9), n9); ok(cg.key === 'angry' && M.mirMoodState().anxiousSince === 0, `화남이 초조함(EDI)을 가리는 동안 anxiousSince 는 0 이다`);
const nG2 = n9 + 40 * 60000;
const cg2 = M.currentMirMood(V9ok, fresh(nG2), nG2);
ok(cg2.key === 'anxious' && M.mirMoodState().anxiousSince === nG2, `40분 뒤 화남이 풀려 초조함이 보일 때 그 시각부터 센다 — 슬픔으로 번지지 않는다 (${cg2.key})`);
ok(Object.keys(M.MIR_MOODS).length === 11, `기분 11가지(화남·휴식·취미·작업 준비 포함)`);
//  ── 4.06 작업할 배가 없을 때 — 검수사 2026-10-05 20:57 «작업할 선박이 없을때에는 초조 하거나 화가 나면 안되는거고 편안하게 휴식을 취하거나 취미 생활을 즐기거나 다음 작업을 준비하는 미르가 되어야 합니다»
console.log('\n작업할 배가 없을 때 (4.06)');
ok(M.MIR_MOODS.rest.label === '휴식' && M.MIR_MOODS.rest.badge === '☕' && M.MIR_MOODS.hobby.label === '취미 생활' && M.MIR_MOODS.hobby.badge === '🎧' && M.MIR_MOODS.prep.label === '작업 준비' && M.MIR_MOODS.prep.badge === '📋', `기분 사전에 휴식(☕)·취미 생활(🎧)·작업 준비(📋)가 있다`);
const nI1 = T('2026-09-25 10:00'), nI2 = nI1 + 30 * 60000, nI3 = nI1 + 60 * 60000;
const i1 = M.mirMoodNow({ now: nI1, voyages: V, heartbeat: fresh(nI1), lastAskAt: nI1 - 60000 }), i2 = M.mirMoodNow({ now: nI2, voyages: V, heartbeat: fresh(nI2), lastAskAt: nI2 - 60000 }), i3 = M.mirMoodNow({ now: nI3, voyages: V, heartbeat: fresh(nI3), lastAskAt: nI3 - 60000 });
ok([i1.key, i2.key].sort().join() === 'hobby,rest' && i3.key === i1.key && /편안하게 쉬고|취미 생활을 즐기고/.test(i1.why + i2.why), `6시간 안에 시작할 배도 일하는 배도 없으면 30분마다 휴식 ↔ 취미 생활 (${i1.key}·${i2.key}·${i3.key})`);
const dead = { at: nI1 - 6 * 3600000, cycleMin: 5 };
const i4 = M.mirMoodNow({ now: nI1, voyages: V, heartbeat: dead, lastAskAt: nI1 - 3 * 3600000 });
ok(i4.key === i1.key && !/수집기|EDI/.test(i4.why), `작업할 배가 없으면 수집기가 6시간 조용해도 초조하지 않고 30분 넘게 질문이 없어도 심심하지 않다 — 쉰다 (${i4.key})`);
const only = (code, patch, n) => ({ [code]: { ...V[code], info: { ...V[code].info, ...(patch || {}) } } });
const nI5 = T('2026-09-23 14:00');
const i5 = M.mirMoodNow({ now: nI5, voyages: only('SWTD_9014E'), heartbeat: fresh(nI5), lastAskAt: nI5 - 60000 });
ok(i5.key === 'prep' && /^SWTD 5시간 뒤 시작 — 다음 작업을 준비하고 있어요 \(EDI 를 기다리는 중\)$/.test(i5.why), `시작 5시간 전 배의 EDI 가 없어도 작업할 배가 없으면 초조하지 않고 준비한다 (${i5.why})`);
ok(M.anxiousReasons(only('SWTD_9014E'), fresh(nI5), nI5).length === 1, `(전제) 같은 상태를 종전 규칙대로 재면 초조함 이유가 선다 — 일하는 배가 있을 때만 쓰인다`);
const i6 = M.mirMoodNow({ now: nI5, voyages: only('SWTD_9014E', { terminalStatus: 'departed' }), heartbeat: fresh(nI5), lastAskAt: nI5 - 60000 });
const i7 = M.mirMoodNow({ now: nI5, voyages: only('SWTD_9014E', { inspectorDone: true }), heartbeat: fresh(nI5), lastAskAt: nI5 - 60000 });
ok(['rest', 'hobby'].includes(i6.key) && ['rest', 'hobby'].includes(i7.key), `떠난 배·«검수 완료» 한 배는 «다음 작업» 이 아니다 → 쉰다 (${i6.key}·${i7.key})`);
const nI8 = T('2026-09-23 22:30');
const i8 = M.mirMoodNow({ now: nI8, voyages: only('SWTD_9014E'), heartbeat: fresh(nI8), lastAskAt: nI8 - 60000 });
ok(i8.key === 'prep' && /SWTD 시작할 시간/.test(i8.why), `계획 시작 시각이 지났는데 터미널이 아직 안 연 배도 다음 작업이다 — 시작할 시간 (${i8.why})`);
//  4.06 재감사 3·A — 터미널 작업 끝 시각(workEndAt, isWorkingNow 와 같은 칸)이 지난 배는 계획 끝이 안 왔어도 «다음 작업» 이 아니다 · 계획 끝을 모르는 옛 항차는 시작 6시간이 지나면 자른다 · 초조함의 «EDI 기다림» 도 같은 문지기
const swtdEnded = only('SWTD_9014E', { workEndAt: '2026-09-23 22:00' });
const i9 = M.mirMoodNow({ now: nI8, voyages: swtdEnded, heartbeat: fresh(nI8), lastAskAt: nI8 - 60000 });
ok(['rest', 'hobby'].includes(i9.key) && M.isUpcomingWork(only('SWTD_9014E').SWTD_9014E, nI8) === true && M.isUpcomingWork(swtdEnded.SWTD_9014E, nI8) === false, `터미널 작업 끝 시각이 지난 배는 «다음 작업» 이 아니다 → 쉰다 (${i9.key})`);
const noEnd = (pd, extra) => only('SWTD_9014E', { planDate: pd, ...(extra || {}) });
const i10 = M.mirMoodNow({ now: nI8, voyages: noEnd('2026-09-23 10:00'), heartbeat: fresh(nI8), lastAskAt: nI8 - 60000 });
const i11 = M.mirMoodNow({ now: nI8, voyages: noEnd('2026-09-23 19:00'), heartbeat: fresh(nI8), lastAskAt: nI8 - 60000 });
ok(['rest', 'hobby'].includes(i10.key) && i11.key === 'prep', `계획 끝을 모르는 배 — 시작 12시간 지난 옛 항차는 쉰다(${i10.key}) · 3시간 반 지난 배는 아직 «시작할 시간» 준비(${i11.key})`);
ok(M.anxiousReasons(only('SWTD_9014E', { terminalStatus: 'departed' }), fresh(nI5), nI5).length === 0 && M.anxiousReasons(only('SWTD_9014E', { inspectorDone: true }), fresh(nI5), nI5).length === 0 && M.anxiousReasons(swtdEnded, fresh(nI8), nI8).length === 0, `떠난 배·«검수 완료»·작업 끝난 배의 EDI 는 초조함으로 기다리지 않는다`);
ok(M.anxiousReasons(noEnd('2026-09-23 10:00', { terminalStatus: 'working', workStartAt: '2026-09-23 10:30' }), fresh(nI8), nI8).length === 1, `터미널이 «작업중» 인 배는 계획 끝을 몰라도 EDI 가 없으면 계속 초조함이다(옛 항차로 자르지 않는다)`);
//  기억 한 벌 — 일하는 배가 없으면 초조함 시작 시각도 세지 않는다
M.noteMirOpen(0);
const ci = M.currentMirMood(V, dead, nI1); ok(['rest', 'hobby'].includes(ci.key) && M.mirMoodState().anxiousSince === 0, `currentMirMood — 작업할 배가 없으면 수집기가 멈춰도 초조함 시작 시각을 만들지 않는다`);
const ci2 = M.currentMirMood(V, dead, nI1 + 40 * 60000); ok(['rest', 'hobby'].includes(ci2.key), `40분을 안 열어 봐도 슬퍼하지 않는다 — 쉰다 (${ci2.key})`);
//  그 배가 일을 시작하면 바로 초조·화남 규칙이 돌아온다
const nI9 = T('2026-09-23 10:00');
ok(M.mirMoodNow({ now: nI9, voyages: Wv(nI9), heartbeat: { at: nI9 - 27 * 60000, cycleMin: 5 }, lastAskAt: nI9 - 60000 }).key === 'anxious', `일하는 배가 생기면 수집기 27분 끊김은 다시 초조함이다`);
//  식사·순간 감정은 그대로 먼저다
ok(M.mirMoodNow({ now: T('2026-09-25 11:55'), voyages: V, heartbeat: fresh(T('2026-09-25 11:55')) }).key === 'hungry', `작업할 배가 없어도 점심 5분 전엔 배고프다(식사가 먼저)`);
ok(M.mirMoodNow({ now: nI1, voyages: V, heartbeat: fresh(nI1), lastEvent: { kind: 'workDone', why: 'x', at: nI1 - 3000 } }).key === 'happy', `쉬는 중에도 완료·작업 선택 직후엔 기쁨`);
//  ── ConeOne 2.62 — 콘앱 미르도 검수앱과 같은 자료로 화남을 판정한다(검수사 2026-10-05 20:52 «왜 자료가 없죠 미르는 하나라고 했는데»).
//     public/cone.html 의 coneMood* 를 vm 에 올리고 가짜 서버(ETag·304)로 실데이터 MCSC 633N(시프팅 95대)을 서빙해, 콘앱이 모은 항차 자료로 낸 화남이 검수앱(전체 항차 객체)과 같은지 본다.
(async () => {   // 콘앱 구간은 가짜 서버를 await 하므로 이 뒤 전부를 async 로 감싼다
console.log('\n콘앱 화남 자료 (2.62)');
{
  const vm = require('vm'), crypto = require('crypto');
  const html = fs.readFileSync(path.resolve(__dirname, '../public/cone.html'), 'utf8');
  const ca = html.indexOf('function coneMoodVoyages(){'), cb = html.indexOf('function coneMoodPaint(m){');
  ok(ca > 0 && cb > ca && M.isWorkingNow, `콘앱 기분 자료 함수를 cone.html 에서 찾았고 mir-core 가 isWorkingNow 를 내놓는다`);
  const code = html.slice(ca, cb);
  const hbC = fresh(nM);
  const serverOf = (vv) => { const log = [];
    const fbFetch = async (p, opts) => { const mm = String(p).match(/^voyages\/([^/]+)\/(.*)\.json$/); let node = vv; for (const seg of mm[2].split('/')) node = node == null ? null : node[seg];
      const body = JSON.stringify(node === undefined ? null : node), et = crypto.createHash('md5').update(body).digest('hex'), inm = opts && opts.headers && opts.headers['If-None-Match'];
      log.push(mm[2] + (inm === et ? '(304)' : ''));
      if (inm === et) return { status: 304, ok: false, headers: { get: () => et } };
      return { status: 200, ok: true, headers: { get: (h) => (/etag/i.test(h) ? et : null) }, json: async () => JSON.parse(body) }; };
    return { fbFetch, log }; };
  const coneOf = async (vv, staleInfo, ticks) => {
    const { fbFetch, log } = serverOf(vv);
    const ctx = { console, navigator: {}, window: { ConeMir: { isWorkingNow: M.isWorkingNow, angryReasons: M.angryReasons, isUpcomingWork: M.isUpcomingWork } }, fbFetch, encodeURIComponent, Date, Object, Promise, Array, Number, String, setTimeout, clearTimeout, FB_TIMEOUT_MS: 12000,
      state: { voyages: [{ key: 'MCSC_633N', _info: staleInfo, hasD: true, hasL: true, nodeD: true, nodeL: true }] } };
    vm.createContext(ctx); vm.runInContext(code + '\nthis.__x={coneMoodVoyages,coneMoodEnrich,coneWeakSignal,coneTimeout,coneMoodJson};', ctx);
    let base = null;
    for (let i = 0; i < (ticks || 1); i++) { base = ctx.__x.coneMoodVoyages(); await ctx.__x.coneMoodEnrich(base, hbC, nM + i * 60000); }
    return { base, log, ctx };
  };
  const stale = mcsc({}, {}).MCSC_633N.info;
  const pairs = [
    ['리스트 컨만 완료·시프팅 남음', mcsc(atOld(listD), atOld(listL)).MCSC_633N, stale, 1],
    ['리스트·시프팅 전부 완료', mcsc(atOld([...new Set([...listD, ...ediD])]), atOld([...new Set([...listL, ...ediL])])).MCSC_633N, stale, 1],
    ['완료 한 건뿐', mcsc(atOld(listD.slice(0, 1)), {}).MCSC_633N, stale, 1],
  ];
  for (const [name, vv, st, ticks] of pairs) {
    const tally = M.angryReasons({ MCSC_633N: vv }, hbC, nM).length;
    const r = await coneOf(vv, st, ticks); const cn = M.angryReasons(r.base, hbC, nM).length;
    ok(tally === cn, `${name} — 검수앱 ${tally} · 콘앱 ${cn} 같다(요청 ${r.log.length}건)`);
  }
  //  «검수 완료» 는 서버의 최신 info 에서 읽는다(목록을 받을 때의 옛 info 에는 없다) — 작은 자료 4건만 받고 끝낸다
  const vInsp = mcsc(atOld(listD.slice(0, 1)), {}).MCSC_633N; vInsp.info.inspectorDone = true;
  const rI = await coneOf(vInsp, stale, 1);
  ok(M.angryReasons(rI.base, hbC, nM).length === 0 && rI.log.length === 4, `서버에서 «검수 완료» 가 켜져 있으면 목록 info 가 옛것이어도 화내지 않는다(작은 자료 ${rI.log.length}건만)`);
  //  두 번째 틱 — 큰 자료도 ETag 304 로 본문 없이 끝난다
  const r2 = await coneOf(mcsc(atOld(listD.slice(0, 1)), {}).MCSC_633N, stale, 2);
  ok(r2.log.length > 10 && r2.log.slice(-10).every((x) => /\(304\)$/.test(x)), `두 번째 틱은 전부 304(본문 없음) — ${r2.log.slice(-10).join(' ')}`);
  //  약신호(데이터 절약·2G)에서는 받지 않는다 — 소스 문장으로
  ok(/if\(!coneWeakSignal\(\)\)\{ try\{ await coneMoodEnrich/.test(html) && /function coneWeakSignal\(\)\{ const c=navigator\.connection\|\|\{\}; return !!\(c\.saveData/.test(html), `약신호(데이터 절약·2G)에서는 화남 자료를 받지 않는다(소스)`);
  //  일하지 않는 배 — 곧 시작·막 시작한 배(검수앱 미르 «다음 작업» 문지기)는 info 한 건만 받고, 먼 배는 아무것도 받지 않는다(4.06 재감사 1)
  const idle = mcsc({}, {}).MCSC_633N; idle.info.terminalStatus = 'planned'; idle.info.workStartAt = '';
  const idleList = { ...stale, terminalStatus: 'planned', workStartAt: '' };
  const rN = await coneOf(idle, idleList, 1);
  ok(rN.log.length === 1 && rN.log[0] === 'info' && M.angryReasons(rN.base, hbC, nM).length === 0, `일하지 않는 배(planned)도 시작 시각 안쪽이면 info 한 건만 받는다 — 화남은 없다(요청 ${rN.log.join(',')})`);
  const idleFar = { ...idleList, planDate: '2026-10-09 08:00 ~ 2026-10-10 20:00' };
  const rF = await coneOf({ ...idle, info: { ...idle.info, planDate: idleFar.planDate } }, idleFar, 1);
  ok(rF.log.length === 0, `시작이 6시간보다 먼 배는 아무것도 받지 않는다(요청 ${rF.log.length}건)`);
  //  재감사 1 — 목록을 받을 때는 «아직 안 시작» 이던 배를 터미널이 연 경우: 콘앱이 info 를 새로 받아 검수앱과 같이 «작업 중 + 완료 없음» 으로 화낸다
  const vWork = mcsc(atOld(listD), atOld(listL)).MCSC_633N;
  const rW = await coneOf(vWork, idleList, 1); const tallyW = M.angryReasons({ MCSC_633N: vWork }, hbC, nM).length;
  ok(tallyW === 1 && M.angryReasons(rW.base, hbC, nM).length === 1 && rW.log[0] === 'info', `목록 info 가 «planned» 로 낡아도 서버 info 가 작업중이면 검수앱과 같이 화낸다 — 검수앱 ${tallyW} · 콘앱 ${M.angryReasons(rW.base, hbC, nM).length} (요청 ${rW.log.length}건)`);
  //  재감사 1 — 서버가 «작업 끝» 을 적었으면 목록의 옛 info(working) 도 그 배를 일하는 배로 두지 않는다
  const vEnded = mcsc(atOld(listD), atOld(listL)).MCSC_633N; vEnded.info.workEndAt = '2026-10-06 15:00';
  const rE = await coneOf(vEnded, stale, 1);
  ok(M.angryReasons(rE.base, hbC, nM).length === 0, `서버 info 에 작업 끝 시각이 있으면 목록 info 가 working 이어도 화내지 않는다`);
  //  재감사 E — 갱신이 5분 넘게 끊기면 옛 완료 기록으로 판정하지 않는다(화남 없이). 5분 안이면 캐시로 간다
  {
    const vOld = mcsc(atOld(listD), atOld(listL)).MCSC_633N; const sv = serverOf(vOld); let down = false;
    const fb = async (p, o) => { if (down) throw new Error('offline'); return sv.fbFetch(p, o); };
    const ctxS = { console: { warn() {}, info() {}, log: console.log }, navigator: {}, window: { ConeMir: { isWorkingNow: M.isWorkingNow, angryReasons: M.angryReasons, isUpcomingWork: M.isUpcomingWork } }, fbFetch: fb, encodeURIComponent, Date, Object, Promise, Array, Number, String, setTimeout, clearTimeout, FB_TIMEOUT_MS: 12000,
      state: { voyages: [{ key: 'MCSC_633N', _info: stale, hasD: true, hasL: true, nodeD: true, nodeL: true }] } };
    vm.createContext(ctxS); vm.runInContext(code + '\nthis.__x={coneMoodVoyages,coneMoodEnrich};', ctxS);
    const run = async (dt) => { const b = ctxS.__x.coneMoodVoyages(); await ctxS.__x.coneMoodEnrich(b, hbC, nM + dt * 60000); return M.angryReasons(b, hbC, nM + dt * 60000).length; };
    const s0 = await run(0); down = true; const s2 = await run(2); const s6 = await run(6);
    ok(s0 === 1 && s2 === 1 && s6 === 0, `신호가 끊겨도 5분 안(2분)은 받아 둔 자료로 화내고(${s2}), 5분 넘으면(6분) 낡은 완료 기록으로 판정하지 않는다(${s6})`);
  }
  //  재감사 N1 — 계획 끝이 지난 뒤에도 작업이 이어지는 배(목록 info 는 planned·계획 끝 경과): 계획 끝 전에 «작업 중» 으로 받아 둔 배는 끝난 뒤에도 계속 새로 받아 화낸다
  {
    const vOver = mcsc(atOld(listD), atOld(listL)).MCSC_633N; const sv = serverOf(vOver);
    const overList = { ...stale, terminalStatus: 'planned', workStartAt: '', planDate: '2026-10-06 08:00 ~ 2026-10-06 15:00' };   // 계획 끝 15:00 — nM(15:30) 은 이미 지났고, 15:00 전(14:30)에는 후보였다
    const ctxO = { console: { warn() {}, info() {}, log: console.log }, navigator: {}, window: { ConeMir: { isWorkingNow: M.isWorkingNow, angryReasons: M.angryReasons, isUpcomingWork: M.isUpcomingWork } }, fbFetch: sv.fbFetch, encodeURIComponent, Date, Object, Promise, Array, Number, String, setTimeout, clearTimeout, FB_TIMEOUT_MS: 12000,
      state: { voyages: [{ key: 'MCSC_633N', _info: overList, hasD: true, hasL: true, nodeD: true, nodeL: true }] } };
    vm.createContext(ctxO); vm.runInContext(code + '\nthis.__x={coneMoodVoyages,coneMoodEnrich};', ctxO);
    const runO = async (dt) => { const b = ctxO.__x.coneMoodVoyages(); await ctxO.__x.coneMoodEnrich(b, hbC, nM + dt * 60000); return M.angryReasons(b, hbC, nM + dt * 60000).length; };
    const o0 = await runO(-60), o1 = await runO(0), o2 = await runO(1);
    ok(o1 === 1 && o2 === 1, `계획 끝(15:00) 전(14:30 — 완료 30분 전이라 아직 화낼 때는 아님 ${o0})에 작업 중으로 받아 둔 배는 끝난 뒤(15:30·15:31)에도 화낸다 — 검수앱과 같다 (${o1}·${o2})`);
  }
  //  재감사 N3 — 서버가 일정을 미룬 배(목록의 옛 계획 08:00~14:00 → 서버 15:00~21:00, 15:10 시작): 12:00 에 받아 둔 새 계획으로 14:00 뒤에도 «곧 시작» 을 본다 → 15:30 에 화낸다(검수앱과 같다)
  {
    const vLate = mcsc(atOld(listD), atOld(listL)).MCSC_633N; const sv = serverOf(vLate);
    const listLate = { ...stale, terminalStatus: 'planned', workStartAt: '', planDate: '2026-10-06 08:00 ~ 2026-10-06 14:00' };
    vLate.info = { ...vLate.info, terminalStatus: 'planned', workStartAt: '', planDate: '2026-10-06 15:00 ~ 2026-10-06 21:00' };
    const ctxL = { console: { warn() {}, info() {}, log: console.log }, navigator: {}, window: { ConeMir: { isWorkingNow: M.isWorkingNow, angryReasons: M.angryReasons, isUpcomingWork: M.isUpcomingWork } }, fbFetch: sv.fbFetch, encodeURIComponent, Date, Object, Promise, Array, Number, String, setTimeout, clearTimeout, FB_TIMEOUT_MS: 12000,
      state: { voyages: [{ key: 'MCSC_633N', _info: listLate, hasD: true, hasL: true, nodeD: true, nodeL: true }] } };
    vm.createContext(ctxL); vm.runInContext(code + '\nthis.__x={coneMoodVoyages,coneMoodEnrich};', ctxL);
    const runL = async (dt) => { const b = ctxL.__x.coneMoodVoyages(); await ctxL.__x.coneMoodEnrich(b, hbC, nM + dt * 60000); return M.angryReasons(b, hbC, nM + dt * 60000).length; };
    await runL(-210);   // 12:00 — 서버가 일정을 15:00 으로 미룬 뒤. 목록 계획 끝(14:00)은 아직 안 지나 후보 → 새 계획을 받아 둔다
    vLate.info = { ...vLate.info, terminalStatus: 'working', workStartAt: '2026-10-06 15:10' };   // 15:10 시작
    const l1 = await runL(0);   // 15:30
    const tallyL = M.angryReasons({ MCSC_633N: vLate }, hbC, nM).length;
    ok(tallyL === 1 && l1 === 1, `일정이 미뤄져 목록의 계획 끝(14:00)이 지난 뒤 시작한 배도 콘앱이 검수앱과 같이 화낸다 — 검수앱 ${tallyL} · 콘앱 ${l1}`);
  }
  //  재감사 N2 — 첫 실패도 60초 간격: 큰 자료 6건이 모두 실패해도 20초 틱마다 다시 받지 않는다
  {
    const vH = mcsc(atOld(listD), atOld(listL)).MCSC_633N; const sv = serverOf(vH); let n = 0;
    const fb = async (p, o) => { if (/records|ediContainers|swapFix|restowList/.test(String(p))) { n++; throw new Error('slow'); } return sv.fbFetch(p, o); };
    const ctxH = { console: { warn() {}, info() {}, log: console.log }, navigator: {}, window: { ConeMir: { isWorkingNow: M.isWorkingNow, angryReasons: M.angryReasons, isUpcomingWork: M.isUpcomingWork } }, fbFetch: fb, encodeURIComponent, Date, Object, Promise, Array, Number, String, setTimeout, clearTimeout, FB_TIMEOUT_MS: 12000,
      state: { voyages: [{ key: 'MCSC_633N', _info: stale, hasD: true, hasL: true, nodeD: true, nodeL: true }] } };
    vm.createContext(ctxH); vm.runInContext(code + '\nthis.__x={coneMoodVoyages,coneMoodEnrich};', ctxH);
    const counts = [];
    for (const sec of [0, 20, 40, 60]) { const b = ctxH.__x.coneMoodVoyages(); await ctxH.__x.coneMoodEnrich(b, hbC, nM + sec * 1000); counts.push(n); }
    ok(counts[0] === 6 && counts[1] === 6 && counts[2] === 6 && counts[3] === 12, `큰 자료 받기가 실패하면 첫 시도 6건 뒤 20·40초 틱에는 다시 받지 않고 60초에 다시 시도한다 — 누적 ${counts.join('→')}`);
  }
  //  재감사 2 — 응답 본문이 안 오는 배는 한도(FB_TIMEOUT_MS)에서 끊긴다 · 틱 90초 한도는 소스 문장으로
  {
    const ctxT = { console, navigator: {}, window: { ConeMir: {} }, fbFetch: async () => ({ status: 200, ok: true, headers: { get: () => 'x' }, json: () => new Promise(() => {}) }), encodeURIComponent, Date, Object, Promise, Array, Number, String, setTimeout, clearTimeout, FB_TIMEOUT_MS: 60, state: { voyages: [] } };
    vm.createContext(ctxT); vm.runInContext(code + '\nthis.__x={coneMoodJson};', ctxT);
    const t0 = Date.now(); let msg = '';
    try { await ctxT.__x.coneMoodJson('voyages/X/info.json', { etag: {}, data: {} }); } catch (e) { msg = String(e && e.message); }
    ok(/본문을 받다 멈췄습니다/.test(msg) && Date.now() - t0 < 2000, `본문이 안 오는 응답은 한도에서 끊긴다 (${Date.now() - t0}ms · ${msg})`);
    ok(/if\(_moodBusy && Date\.now\(\)-_moodBusyAt<90000\) return;/.test(html) && /finally\{ if\(_moodTickId===myTick\) _moodBusy=false; \}/.test(html), `기분 갱신 틱은 90초 넘게 안 끝나면 멈춘 것으로 보고 새로 시작한다(소스) — 뒤늦게 끝난 옛 틱은 새 틱의 잠금을 풀지 않는다`);
    ok(/coneTimeout\(r\.json\(\), FB_TIMEOUT_MS, 'collector_heartbeat'\)/.test(html), `하트비트 본문도 같은 한도(소스)`);
  }
}
//  ⑨ 3.57 표정 인형(mirFaceArt) — 기분 8가지 모두 SVG 가 나오고, 원본 그림·눈꺼풀·동공·입·눈물·땀 부위가 있으며, 기분 키가 mir.js 의 키와 같다
console.log('\n표정 인형 (3.57)');
ok(JSON.stringify(M.MIR_MOOD_KEYS) === JSON.stringify(Object.keys(M.MIR_MOODS)), `인형 기분 키 = mirMood 키 (${M.MIR_MOOD_KEYS.join(',')})`);
for (const k of M.MIR_MOOD_KEYS) {
  const svg = M.mirFaceSvg(k, 44, 'data:image/png;base64,AAAA', 't');
  const need = ['<image href="data:image/png;base64,AAAA"', 'class="lid lid-l"', 'class="lid lid-r"', 'class="pupil"', 'class="mouth-open"', 'class="mouth-sad"', 'class="mouth-wavy"', 'class="tear tear-l"', 'class="sweat sweat-1"', 'class="zz zz-1"', 'class="heart"', 'class="brow brow-l"', 'class="brow brow-r"', 'class="mouth-grr"', 'class="vein"', 'class="flush"', 'class="note note-1"', 'class="note note-2"', 'class="steam steam-1"', 'class="steam steam-2"', `class="mir mood-${k}"`, `data-mood="${k}"`, `mirEyeL-${k}-t`];
  const miss = need.filter((n) => !svg.includes(n));
  ok(!miss.length && /width="44" height="44"/.test(svg), `${k} 인형 SVG — 부위 전부 있음${miss.length ? ' (빠짐 ' + miss.join(' ') + ')' : ''}`);
}
ok(M.mirFaceSvg('없는기분', 20, 'x').includes('mood-basic'), `모르는 기분은 기본으로`);
for (const k of M.MIR_MOOD_KEYS.filter((x) => x !== 'basic')) ok(new RegExp('\\.mir\\.mood-' + k + '\\b').test(M.MIR_FACE_CSS), `CSS 에 ${k} 규칙이 있다`);
ok(/prefers-reduced-motion/.test(M.MIR_FACE_CSS) && /mirBlink/.test(M.MIR_FACE_CSS), `깜빡임·저동작 설정 처리`);
ok(M.ensureMirFaceCss(null) === false, `document 없으면 false(조용히 통과 아님)`);

console.log(`\n미르 기분 연막검사: ${pass} 통과 / ${fail} 실패`);
process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('연막검사 중단', e); process.exit(1); });
