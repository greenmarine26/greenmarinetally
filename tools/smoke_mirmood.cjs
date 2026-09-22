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

console.log('미르 기분 — 검수사 규칙 대조 (3.56)');
//  ① 식사 창
const meals = M.mealWindows('PCTC');
ok(JSON.stringify(meals) === JSON.stringify([[0, 60], [390, 480], [720, 780], [1050, 1140]]), `PCTC 식사 창 4개(야식 00:00~01:00·아침 06:30~08:00·점심 12:00~13:00·저녁 17:30~19:00 — 근무표 그대로) — ${JSON.stringify(meals)}`);
ok(JSON.stringify(M.mealWindows('PNCT')) === JSON.stringify([[-30, 60], [330, 480], [690, 780], [1050, 1140]]), `PNCT 식사 창 4개(야식은 23:30~01:00 으로 자정을 걸쳐 합쳐진다) — ${JSON.stringify(M.mealWindows('PNCT'))}`);
//  ② 배고픔·배부름 (하트비트 정상·EDI 조건 안 걸리는 오늘 낮)
const at = (hm, extra) => M.mirMoodNow({ now: T('2026-09-22 ' + hm), voyages: V, heartbeat: fresh(T('2026-09-22 ' + hm)), lastAskAt: T('2026-09-22 ' + hm) - 60000, ...(extra || {}) });
ok(at('11:49').key === 'basic' || at('11:49').key === 'bored', `11:49 아직 배고프지 않다(${at('11:49').key})`);
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
const a1 = M.mirMoodNow({ now: T('2026-09-22 12:10'), voyages: V, heartbeat: HB });
ok(a1.key === 'anxious' && /수집기가 27분째/.test(a1.why), `하트비트 27분 끊김 → 초조함 (${a1.why})`);
ok(M.mirMoodNow({ now: T('2026-09-22 11:56'), voyages: V, heartbeat: HB }).key !== 'anxious', `하트비트 13분(주기 5분×3 이내) → 초조하지 않다`);
//  ⓑ SWTD 9014E — 양하 500 계획인데 양하 EDI 없음(선적은 있음). 시작 09-23 19:00 → 13:00 부터 6시간 전
const a2 = M.mirMoodNow({ now: T('2026-09-23 14:00'), voyages: V, heartbeat: fresh(T('2026-09-23 14:00')) });
ok(a2.key === 'anxious' && /SWTD 양하 EDI가 아직이에요 \(5시간 뒤 시작\)/.test(a2.why), `내일 14:00 SWTD 양하 EDI 없음 → 초조함 (${a2.why})`);
ok(!/SWTD 선적/.test(a2.why), `SWTD 선적 EDI 는 있으므로 선적은 안 든다`);
const a3 = M.mirMoodNow({ now: T('2026-09-23 12:00'), voyages: V, heartbeat: fresh(T('2026-09-23 12:00')) });
ok(!/SWTD/.test(a3.why || ''), `내일 12:00(7시간 전)은 아직 SWTD 를 기다리지 않는다 (${a3.key})`);
ok(!/OBWH|RZOR|ATPR/.test(a2.why), `OBWH·RZOR·ATPR 은 계획 대수 0(도선·메일 예보) — EDI 없어도 초조하지 않다`);
//  ⓒ 작업 중인 배의 완료 기록 60분 없음 — 실측 PCSZ 2628E 에 workStartAt·완료 기록을 얹어 본다(스냅샷은 시작 전)
const now4 = T('2026-09-23 10:00');
const V4 = { ...V, PCSZ_2628E: { ...V.PCSZ_2628E, info: { ...V.PCSZ_2628E.info, workStartAt: '2026-09-23 01:10' }, discharge: { dataAt: V.PCSZ_2628E.discharge.dataAt, completed: { MSKU1234567: { at: now4 - 61 * 60000 } } } } };
const a4 = M.mirMoodNow({ now: now4, voyages: V4, heartbeat: fresh(now4), lastAskAt: now4 - 60000 });
ok(a4.key === 'anxious' && /PCSZ 완료 기록이 61분째 없어요/.test(a4.why), `작업 중 완료 61분 없음 → 초조함 (${a4.why})`);
const V4b = { ...V4, PCSZ_2628E: { ...V4.PCSZ_2628E, discharge: { ...V4.PCSZ_2628E.discharge, completed: { MSKU1234567: { at: now4 - 10 * 60000 } } } } };
ok(M.mirMoodNow({ now: now4, voyages: V4b, heartbeat: fresh(now4), lastAskAt: now4 - 60000 }).key === 'basic', `완료 10분 전이면 기본`);
//  ⑤ 방치 → 슬픔 / 열어 보면 초조함
const n5 = T('2026-09-23 14:40');
const s5 = M.mirMoodNow({ now: n5, voyages: V, heartbeat: fresh(n5), anxiousSince: T('2026-09-23 14:00') });
ok(s5.key === 'sad' && /40분째 말했는데 봐 주지 않아요/.test(s5.why), `초조함 40분 방치 → 슬픔 (${s5.why})`);
ok(M.mirMoodNow({ now: n5, voyages: V, heartbeat: fresh(n5), anxiousSince: T('2026-09-23 14:00'), openedAt: T('2026-09-23 14:10') }).key === 'anxious', `열어 봤으면 초조함으로`);
ok(M.mirMoodNow({ now: n5, voyages: V, heartbeat: fresh(n5), anxiousSince: T('2026-09-23 14:20') }).key === 'anxious', `20분이면 아직 초조함`);
//  ⑥ 순간 감정 12초 · ⑦ 우선순위(초조함보다 앞선다)
const n6 = T('2026-09-23 14:00');
const ev = (kind, ago) => M.mirMoodNow({ now: n6, voyages: V, heartbeat: fresh(n6), lastEvent: { kind, why: 'x', at: n6 - ago } });
ok(ev('workPick', 3000).key === 'happy' && ev('workDone', 3000).key === 'happy', `작업 선택·완료 직후 → 기쁨(초조함 위에)`);
ok(ev('missed', 3000).key === 'sad', `못 답한 직후 → 슬픔`);
ok(ev('workPick', 13000).key === 'anxious', `13초 지나면 순간 감정이 걷힌다 → 초조함`);
//  심심함 두 갈래
const n7 = T('2026-09-22 13:40');
const b1 = M.mirMoodNow({ now: n7, voyages: V, heartbeat: fresh(n7), lastAskAt: n7 - 60000 });
ok(b1.key === 'bored' && /작업 중인 배가 없어요/.test(b1.why), `작업 중인 배 없음(isWorkingNow 한 벌) → 심심함 (${b1.why})`);
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
const st = M.currentMirMood(V, fresh(n6), n6); ok(st.key === 'anxious' && M.mirMoodState().anxiousSince === n6, `초조함 시작 시각을 기억한다`);
ok(M.currentMirMood(V, fresh(n6), n6 + 31 * 60000).key === 'sad', `31분 방치(열람 없음) → 슬픔`);
M.noteMirOpen(n6 + 31 * 60000 + 1000);
ok(M.currentMirMood(V, fresh(n6), n6 + 31 * 60000 + 2000).key === 'anxious', `열어 보면 다시 초조함`);
ok(Object.keys(M.MIR_MOODS).length === 7, `기분 7가지`);
//  ⑨ 3.57 표정 인형(mirFaceArt) — 기분 7가지 모두 SVG 가 나오고, 원본 그림·눈꺼풀·동공·입·눈물·땀 부위가 있으며, 기분 키가 mir.js 의 키와 같다
console.log('\n표정 인형 (3.57)');
ok(JSON.stringify(M.MIR_MOOD_KEYS) === JSON.stringify(Object.keys(M.MIR_MOODS)), `인형 기분 키 = mirMood 키 (${M.MIR_MOOD_KEYS.join(',')})`);
for (const k of M.MIR_MOOD_KEYS) {
  const svg = M.mirFaceSvg(k, 44, 'data:image/png;base64,AAAA', 't');
  const need = ['<image href="data:image/png;base64,AAAA"', 'class="lid lid-l"', 'class="lid lid-r"', 'class="pupil"', 'class="mouth-open"', 'class="mouth-sad"', 'class="mouth-wavy"', 'class="tear tear-l"', 'class="sweat sweat-1"', 'class="zz zz-1"', 'class="heart"', `class="mir mood-${k}"`, `data-mood="${k}"`, `mirEyeL-${k}-t`];
  const miss = need.filter((n) => !svg.includes(n));
  ok(!miss.length && /width="44" height="44"/.test(svg), `${k} 인형 SVG — 부위 전부 있음${miss.length ? ' (빠짐 ' + miss.join(' ') + ')' : ''}`);
}
ok(M.mirFaceSvg('없는기분', 20, 'x').includes('mood-basic'), `모르는 기분은 기본으로`);
for (const k of M.MIR_MOOD_KEYS.filter((x) => x !== 'basic')) ok(new RegExp('\\.mir\\.mood-' + k + '\\b').test(M.MIR_FACE_CSS), `CSS 에 ${k} 규칙이 있다`);
ok(/prefers-reduced-motion/.test(M.MIR_FACE_CSS) && /mirBlink/.test(M.MIR_FACE_CSS), `깜빡임·저동작 설정 처리`);
ok(M.ensureMirFaceCss(null) === false, `document 없으면 false(조용히 통과 아님)`);

console.log(`\n미르 기분 연막검사: ${pass} 통과 / ${fail} 실패`);
process.exit(fail ? 1 : 0);
