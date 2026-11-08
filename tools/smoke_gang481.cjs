// 미르 «N번 베이 정리해줘» 연막검사 — 실소스 번들(mirCore.entry)로 실항차 네 척(PCSZ 2630E·2628E·STMJ 2659E·OBWH 2743E)의 그 시각 자료를 돌려 현황 답을 잰다.
//   검수사 2026-11-09 «일반 사용자가 몇번베이 정리해줘 하면 그때 두자료를 읽어서 작업 할수 있게 해주는 것» · «30분전 데이터로도 2갱중에 1갱이 앱사용자가 아니면 앱은 그갱이 어디 작업중인지 알수 있습니다».
//   ⚠ 기대값 둘 — ①조사 단계에서 실측한 값(호기·장·남은 수·터미널 몫·마지막 시각)을 이 파일에 적어 둔다 ②남은 수·완료 수는 픽스처 원자료(EDI 행·완료 기록)에서 이 파일이 직접 센다(코드가 낸 값과 대조).
//   건너뜀은 통과가 아니다 — 픽스처·번들이 없으면 실패한다.
//   node tools/smoke_gang481.cjs <mirCore 번들> <저장소 루트>
process.env.TZ = 'Asia/Seoul';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
const FXD = path.join(ROOT, 'tools/fixtures');
const BAYDICT = JSON.parse(fs.readFileSync(path.join(FXD, 'gang481_baydict.json'), 'utf8'));
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: BAYDICT, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
let fetchN = 0;
global.fetch = () => { fetchN += 1; return Promise.reject(new Error('연막: 네트워크 없음')); };
const M = require(path.resolve(OUT));
const clone = (o) => JSON.parse(JSON.stringify(o));
let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + String(detail).replace(/\n/g, ' ⏎ ').slice(0, 600) : ''}`); } };
const kst = (s) => new Date(s.replace(' ', 'T') + ':00+09:00').getTime();
const hm = (ms) => new Date(ms).toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' });
const FX = {};
const fx = (key) => FX[key] || (FX[key] = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(FXD, `gang481_${key}.json.gz`))).toString('utf8')));

//  그 시각의 항차 — 완료를 그 시각까지로 자른다(보관본은 끝난 배). 실 RTDB 쓰기 없음 — 사본만 만진다.
function voyAt(key, t) {
  const v = clone(fx(key));
  for (const m of ['discharge', 'loading']) {
    const s = v[m]; if (!s) continue;
    const c = {}; for (const [cn, r] of Object.entries(s.completed || {})) if (r && r.at <= t) c[cn] = r;
    s.completed = c;
    for (const cn of Object.keys(s.records || {})) if (!s.records[cn].cn) s.records[cn].cn = cn;
  }
  return v;
}
const tallyCtx = (key, v, now, mode = 'discharge') => {
  const rows = M.flattenVoyages({ [key]: v }).filter((c) => c.voyageKey === key);
  return { app: 'tally', voyageKey: key, voyage: v, info: v.info, mode, containers: rows, flat: rows, voyages: { [key]: v }, _now: now };
};
//  콘앱 mirAsk 와 같은 모양 — 항차 키 없음 · 컨 행은 EDI 계획 자리(실적·맞교환 자리 없음) + _comp · voyage 에 EDI 없음(records·completed 만) · cone 재료
const coneCtx = (key, v, now, mode = 'discharge') => {
  const cs = [];
  for (const m of ['discharge', 'loading']) {
    const sec = v[m]; if (!sec) continue;
    const rows = Object.values(sec.ediContainers || {}).map((e) => ({ ...e, _mode: m, _ptk: m === 'discharge' ? e.pod === 'KRPTK' : e.pol === 'KRPTK', _comp: (sec.completed || {})[e.cn] || null }));
    cs.push(...M.toMirContainers(rows, m));
  }
  const strip = (sec) => (sec ? { completed: sec.completed || {}, records: sec.records || {}, termWork: {} } : undefined);
  const voyage = { info: v.info, reports: {}, discharge: strip(v.discharge), ...(v.loading ? { loading: strip(v.loading) } : {}) };
  return { app: 'cone', containers: cs, cone: { rows: [], dischRows: [], stowRows: [] }, accepted: true, mode, modeLabel: mode === 'loading' ? '선적' : '양하', info: v.info, voyage, vsl: v.info.vsl, vslFull: v.info.vslFull || '', pier: v.info.pier, _now: now };
};
const ask = (q, ctx) => { const tr = {}; M._mirThreadReset(); const a = M.answerOneRaw(q, { ...ctx, _trace: tr }); return { a: String(a == null ? '' : a), tr, weak: M.isWeakAnswer(q, a, tr) }; };
//  문장 끝 — 모든 문장이 . ? ! 로 끝나고 콜론으로 끝나는 문장·줄이 없다
const endsOk = (t) => /[.?!]$/.test(t.trim()) && !/:\s*$/m.test(t) && !/:\s*(?=[.?!]\s|$)/.test(t);

console.log('① 실항차 네 척 — 조사 때 실측한 값과 원자료에서 직접 센 값');
//  원자료 셈 — 장(rep.bays)에 든 평택 양하 EDI 행 중 그 시각까지 미완(데크 tier>=80) · 완료 중 터미널 반영(src term) 데크·홀드
function rawCount(key, t, bays, mode = 'discharge') {
  const sec = voyAt(key, t)[mode]; const set = new Set(bays.map(String));
  const ptk = (e) => (mode === 'discharge' ? e.pod === 'KRPTK' : e.pol === 'KRPTK');
  let rd = 0, rh = 0, td = 0, th = 0, ad = 0, ah = 0, last = 0;
  for (const e of Object.values(sec.ediContainers || {})) {
    if (!ptk(e) || !set.has(String(parseInt(e.bay, 10)))) continue;
    const deck = (parseInt(e.tier, 10) || 0) >= 80, c = sec.completed[e.cn];
    if (!c) { if (deck) rd++; else rh++; continue; }
    if (c.src === 'term') { if (deck) td++; else th++; if (c.at > last) last = c.at; } else if (c.by) { if (deck) ad++; else ah++; }
  }
  return { rd, rh, td, th, ad, ah, last };
}
const SC = [
  { key: 'PCSZ_2630E', at: '2026-09-30 06:00', q: '24번 베이 정리해줘', center: 24, bays: [23, 24, 25], remDeck: 0, remHold: 36, termDeck: 43, termHold: 13, byNo: { 3: 56 }, unused: [3], used: [], last: '05:55', appNone: false, cover: true, hatchSkip: false, byCrane: true },
  { key: 'STMJ_2659E', at: '2026-09-30 21:30', q: '23번 베이 정리해줘', center: 22, bays: [21, 22, 23], remDeck: 0, remHold: 4, termDeck: 36, termHold: 36, byNo: { 2: 72 }, unused: [2], used: [], last: '21:26', appNone: false, cover: true, hatchSkip: false, byCrane: true },
  { key: 'STMJ_2659E', at: '2026-09-30 21:30', q: '13번 베이 정리해줘', center: 14, bays: [13, 14, 15], remDeck: 0, remHold: 2, termDeck: 38, termHold: 31, byNo: { 1: 69 }, unused: [], used: [1], last: '21:29', appNone: false, cover: true, hatchSkip: false, byCrane: true, appDeck: 4, appHold: 9 },
  { key: 'PCSZ_2628E', at: '2026-09-23 09:00', q: '21번 베이 정리해줘', center: 20, bays: [19, 20, 21], remDeck: 0, remHold: 42, termDeck: 54, termHold: 0, byNo: { 1: 36, 2: 18 }, unused: [1], used: [], last: '08:57', appNone: true, cover: false, hatchSkip: false, byCrane: true },
  { key: 'OBWH_2743E', at: '2026-09-18 13:00', q: '10번 베이 정리해줘', center: 10, bays: [9, 10, 11], remDeck: 1, remHold: 40, recent: 9, recentDeck: 9, last: '13:00', cover: false, hatchSkip: true, byCrane: false },
];
const texts = [];
for (const s of SC) {
  const t = kst(s.at), v = voyAt(s.key, t);
  const { a, tr, weak } = ask(s.q, tallyCtx(s.key, v, t));
  texts.push({ s, a });
  const r = tr.tidy || {};
  const L = `${s.key} ${s.at.slice(5)} «${s.q}»`;
  T(tr.via === 'bayTidy' && !weak && r.ok, `${L} — 정리 답(강한 답 · via bayTidy)`, a);
  T(r.center === s.center && JSON.stringify(r.bays) === JSON.stringify(s.bays), `${L} — 장 ${s.center} · 베이 ${s.bays.join('·')}`, JSON.stringify([r.center, r.bays]));
  T(r.remDeck === s.remDeck && r.remHold === s.remHold, `${L} — 남은 데크 ${s.remDeck} · 홀드 ${s.remHold}`, JSON.stringify([r.remDeck, r.remHold]));
  const raw = rawCount(s.key, t, s.bays);
  T(r.remDeck === raw.rd && r.remHold === raw.rh, `${L} — 남은 수가 원자료에서 센 값과 같다(데크 ${raw.rd} 홀드 ${raw.rh})`, JSON.stringify([r.remDeck, r.remHold, raw]));
  T(r.hatchSkip === s.hatchSkip && r.byCrane === s.byCrane, `${L} — 해치 제외 배 ${s.hatchSkip} · 호기로 말하는 배 ${s.byCrane}`);
  if (s.byCrane) {
    T(r.termDeck === s.termDeck && r.termHold === s.termHold, `${L} — 터미널 몫 데크 ${s.termDeck} · 홀드 ${s.termHold}`, JSON.stringify([r.termDeck, r.termHold]));
    T(r.termDeck === raw.td && r.termHold === raw.th && r.lastAt === raw.last, `${L} — 터미널 몫·마지막 시각이 원자료와 같다`, JSON.stringify([r.termDeck, r.termHold, r.lastAt, raw]));
    T(Object.entries(s.byNo).every(([no, c]) => r.termByNo[no] && r.termByNo[no].n === c) && Object.keys(r.termByNo).length === Object.keys(s.byNo).length, `${L} — 호기별 터미널 몫 ${JSON.stringify(s.byNo)}`, JSON.stringify(r.termByNo));
    T(JSON.stringify(r.unusedW) === JSON.stringify(s.unused) && JSON.stringify(r.usedW) === JSON.stringify(s.used), `${L} — 이 장을 하는 앱 미사용 호기 ${JSON.stringify(s.unused)} · 앱 사용 호기 ${JSON.stringify(s.used)}`, JSON.stringify([r.unusedW, r.usedW]));
    T(hm(r.lastAt) === s.last && a.includes(`마지막은 ${s.last} 입니다`), `${L} — 마지막 작업 ${s.last}`, hm(r.lastAt));
    T(r.appNone === s.appNone, `${L} — 이 항차 앱 입력 이력 ${s.appNone ? '없음' : '있음'}`);
    if (s.appDeck != null) T(r.appDeck === s.appDeck && r.appHold === s.appHold && r.appDeck === raw.ad && r.appHold === raw.ah, `${L} — 앱 몫 데크 ${s.appDeck} · 홀드 ${s.appHold}(원자료와 같다)`, JSON.stringify([r.appDeck, r.appHold, raw]));
    T(/\d호기가 하고 있/.test(a) && (s.unused.length ? /최근 30분 앱 입력이 없는 호기입니다|하고 있습니다/.test(a) : /앱으로 입력 중인 호기입니다/.test(a)), `${L} — 누가 하고 있는지 말한다`, a);
  } else {
    T(r.recent.n === s.recent && r.recent.deck === s.recentDeck && r.recent.hold === 0 && hm(r.recent.lastAt) === s.last, `${L} — 호기를 모르는 배: 앱 밖 작업 ${s.recent}대(모두 데크) 마지막 ${s.last}`, JSON.stringify(r.recent));
    T(a.includes(`앱 밖 작업이 ${s.recent}대(모두 데크) 있었고 마지막은 ${s.last} 입니다`) && a.includes('남은 것은 데크 1, 홀드 40 입니다') && a.includes('어느 호기인지는 터미널 자료에 없어 말씀드릴 수 없습니다'), `${L} — 동방 문구(호기 단정 없음)`, a);
    T(!/\d\s*호기|호기가 하고/.test(a), `${L} — 호기 단위 문구가 하나도 없다`, a);
  }
  T(s.cover === (a.includes('터미널 기록상 홀드 작업이 시작돼 커버는 열린 것으로 봅니다') && r.holdTermStarted && !r.hatchSkip), `${L} — 커버 말 ${s.cover ? '있음' : '없음'}`, a);
  if (s.hatchSkip) T(!/커버|해치/.test(a), `${L} — 해치 제외 배에는 커버·해치 말을 아예 쓰지 않는다`, a);
  T(endsOk(a), `${L} — 문장이 . ? ! 로 끝나고 콜론으로 끝나지 않는다`, a);
  T(!/카토스|동방|PCTC|PNCT/.test(a), `${L} — 사용자 문구에 카토스·동방·부두 약어가 없다`, a);
  T(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(a), `${L} — 이모지 없음`, a);
}
//  덱이 남았을 때 «홀드는 데크가 끝난 뒤» — 동방 장(남은 데크 1)
{ const o = texts.find((x) => x.s.key === 'OBWH_2743E'); T(/홀드는 데크가 끝난 뒤/.test(o.a), '데크가 남은 장에는 «홀드는 데크가 끝난 뒤» 라고 말한다', o.a); }
//  첫 호기 문구 — 실입력 모양 그대로
{ const o = texts[0].a; T(o.includes('24번 장은 3호기가 하고 있고 최근 30분 앱 입력이 없는 호기입니다. 데크는 다 끝났고 홀드가 36대 남았습니다.') && o.includes('터미널 기록으로 56대(데크 43, 홀드 13)'), 'PCSZ 2630E 06:00 — 검수사 확정 문구 «24번 장은 3호기가 하고 있고 최근 30분 앱 입력이 없는 호기입니다»', o); }
{ const o = texts[1].a; T(o.includes('22번 장은 2호기가 하고 있고') && o.includes('터미널 기록으로 72대(데크 36, 홀드 36)를 했고 마지막은 21:26 입니다'), 'STMJ 2659E 21:30 — «22번 장은 2호기가 하고 있고 … 72대(데크 36, 홀드 36) … 21:26»', o); }
{ const o = texts[3].a; T(o.includes('이 항차는 앱 입력 없이 터미널 기록만 있습니다') && o.includes('호기별로는 1호기 36대, 2호기 18대 입니다'), 'PCSZ 2628E 09:00 — 앱 사용자 0: «앱 입력 없이 터미널 기록만» · 호기별 분해 1호기 36 · 2호기 18', o); }

console.log('② 선적 — 계획 자리 기준 추정 표시');
{ const key = 'STMJ_2659E', t = kst('2026-10-01 05:44'), v = voyAt(key, t);
  const { a, tr, weak } = ask('선적 22번 베이 정리해줘', tallyCtx(key, v, t, 'discharge'));
  const r = tr.tidy || {};
  T(tr.via === 'bayTidy' && !weak && r.ok && r.mode === 'loading' && r.estimated === true, '말에 «선적» 이 있으면 화면이 양하여도 선적 기준 · estimated', a);
  T(a.includes('선적 22번 장') && a.includes('계획 자리 기준 추정'), '선적 답에 «계획 자리 기준 추정» 이 붙는다', a);
  const raw = rawCount(key, t, r.bays || [], 'loading');
  T(r.remDeck === raw.rd && r.remHold === raw.rh && r.termDeck === raw.td && r.termHold === raw.th, `선적 남은 데크 ${raw.rd} 홀드 ${raw.rh} · 터미널 몫 ${raw.td}/${raw.th} 가 원자료와 같다`, JSON.stringify([r, raw]));
  T(endsOk(a), '선적 답 문장 끝', a);
  const d = ask('22번 베이 정리해줘', tallyCtx(key, v, t, 'loading'));
  T(d.tr.tidy && d.tr.tidy.mode === 'loading', '말에 모드가 없으면 화면 모드(선적 화면 → 선적)', d.a);
  const e = ask('22번 베이 정리해줘', tallyCtx(key, voyAt(key, kst('2026-09-30 21:30')), kst('2026-09-30 21:30'), 'discharge'));
  T(e.tr.tidy && e.tr.tidy.mode === 'discharge' && !/계획 자리 기준 추정/.test(e.a), '양하 화면 → 양하 기준 · 추정 표시 없음', e.a);
}

console.log('③ 두 앱 같은 답 — 콘앱 모양 ctx(항차 키 없음 · EDI 계획 자리 행 · cone 재료)');
for (const s of SC) {
  const t = kst(s.at), v = voyAt(s.key, t);
  const A = ask(s.q, tallyCtx(s.key, v, t)), B = ask(s.q, coneCtx(s.key, v, t));
  T(B.tr.via === 'bayTidy' && !B.weak && A.a === B.a, `${s.key} ${s.at.slice(5)} «${s.q}» — 검수앱과 콘앱이 한 글자도 다르지 않다`, `검수앱: ${A.a}\n콘앱: ${B.a}`);
}
{ // 콘앱 행은 EDI 계획 자리뿐 — records 의 실적 자리(bay_actual)를 얹어 검수앱과 같은 장으로 묶는가
  const key = 'PCSZ_2630E', t = kst('2026-09-30 06:00'), v = voyAt(key, t);
  const plain = ask('24번 베이 정리해줘', tallyCtx(key, v, t)).tr.tidy;
  //  장 24 의 아직 안 한 홀드 컨 하나를 다른 장(베이 6)의 홀드 자리로 옮겨 놓는다(검수원이 자리를 바꾼 것) — 사본만 바꾼다
  const v2 = clone(v); const edi = Object.values(v2.discharge.ediContainers).find((e) => !v2.discharge.completed[e.cn] && [23, 24, 25].includes(parseInt(e.bay, 10)) && (parseInt(e.tier, 10) || 0) < 80);
  v2.discharge.records[edi.cn] = { ...v2.discharge.records[edi.cn], cn: edi.cn, bay_actual: '06', row_actual: '02', tier_actual: '02' };
  const A = ask('24번 베이 정리해줘', tallyCtx(key, v2, t)), B = ask('24번 베이 정리해줘', coneCtx(key, v2, t));
  T(A.tr.tidy.remHold === plain.remHold - 1, `자리를 옮긴 컨은 원래 장의 남은 수에서 빠진다(홀드 ${plain.remHold} → ${A.tr.tidy.remHold})`, JSON.stringify([plain.remHold, A.tr.tidy.remHold]));
  T(A.a === B.a && B.tr.tidy.remHold === A.tr.tidy.remHold, '실적 자리가 다른 컨도 검수앱·콘앱이 같은 답(콘앱 행에 records 자리를 얹음)', `검수앱: ${A.a}\n콘앱: ${B.a}`);
}

console.log('④ 말귀 — 베이 번호 + 정리');
const P = (q) => M.parseNaturalQuery(q).bayTidy;
const yes = [
  ['12번 베이 정리해줘', ['12']], ['12번 정리', ['12']], ['(14)15 정리해줘', ['15', '14']], ['12베이 정리', ['12']], ['미르야 12번 베이 정리해줘', ['12']],
  ['12번 베이 정리 좀 해줘', ['12']], ['12번 베이 정리해주세요', ['12']], ['12번베이 정리', ['12']], ['베이 12 정리해줘', ['12']], ['KKLC 12번 베이 정리해줘', ['12']],
  ['12번 베이 정리해줄래?', ['12']], ['24번 정리해줘', ['24']], ['미르야 3번 베이 정리해줘', ['3']], ['(30)31번 베이 정리해줘', ['31', '30']],
];
for (const [q, bays] of yes) { const r = P(q); T(r && JSON.stringify(r.bays) === JSON.stringify(bays), `알아듣는다 «${q}» → 베이 ${bays.join('/')}`, JSON.stringify(r)); }
{ const r1 = P('선적 12번 베이 정리해줘'), r2 = P('양하 24번 정리해줘'), r3 = P('12번 베이 정리해줘');
  T(r1 && r1.mode === 'loading' && r2 && r2.mode === 'discharge' && r3 && r3.mode === null, '말에 든 모드 — 선적 · 양하 · 없음(null)', JSON.stringify([r1, r2, r3])); }
const no = ['정리해줘', '베이 정리', '베이 정리 방법', '12번 베이 정리 방법 알려줘', '12번 베이 정리했어', '12번 베이 정리 됐어', '3호기 정리해줘', '12번 베이 정리가 뭐야', '오늘 작업 정리해줘',
  '12번 베이 콘 정리해줘', '12번 베이 정리하는 방법', '12번 베이 정리해줄 수 있어', '1234 정리해줘', '12번 베이 몇 대 남았어', '12번 베이로 옮겨줘', '인수인계 정리해줘', '12번 베이 정리 왜 안돼', '3 호기 정리해 줘'];
for (const q of no) { const r = P(q); T(!r, `비대상 «${q}»`, JSON.stringify(r)); }
{ // 비대상은 정리 답이 아니다 — 같은 ctx 로 물어도 via 가 bayTidy 가 아니다
  const key = 'PCSZ_2630E', t = kst('2026-09-30 06:00'), v = voyAt(key, t);
  for (const q of ['12번 베이 정리했어', '베이 정리 방법', '12번 베이 몇 대 남았어']) { const x = ask(q, tallyCtx(key, v, t)); T(x.tr.via !== 'bayTidy', `«${q}» 는 정리 답으로 가로채지 않는다`, x.a); }
  const c = ask('12번 베이 콘 정리해줘', coneCtx(key, v, t)); T(c.tr.via !== 'bayTidy', '콘 말(콘 정리)은 콘 갈래 — 정리 답이 아니다', c.a);
}

console.log('⑤ 항차·자료가 없을 때 — 지어내지 않는다');
{ const key = 'PCSZ_2630E', t = kst('2026-09-30 06:00'), v = voyAt(key, t);
  const x = ask('미르야 12번 베이 정리해줘', { app: 'tally', mode: 'discharge', containers: [], voyages: {}, _now: t });
  T(x.a.includes('어느 배 말씀인지') && /배 이름을 붙여/.test(x.a) && endsOk(x.a), '열린 항차가 없으면 배 이름을 되묻는다', x.a);
  const y = ask('99번 베이 정리해줘', tallyCtx(key, v, t));
  T(/99번 베이는 이 배 양하 자료에 없습니다/.test(y.a) && y.tr.via === 'bayTidy' && endsOk(y.a), '이 배에 없는 베이는 없다고 답한다', y.a);
  const w = clone(v); w.discharge.ediContainers = {}; w.discharge.records = {}; w.loading = undefined;
  const z = ask('24번 베이 정리해줘', { ...tallyCtx(key, w, t), containers: [] , flat: []});
  T(/컨 자료가 아직 없어/.test(z.a) && endsOk(z.a), '컨 자료가 없으면 없다고 답한다', z.a);
}

console.log('⑥ 읽기 전용 — 쓰기 길이 소스에 하나도 없다');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
{ const g = rd('src/gangState.js'), m = rd('src/mir.js');
  const a = m.indexOf('if (p.bayTidy && !/콘/.test(q)) {'), b = m.indexOf('//  ① 콘 이야기', a);
  const blk = m.slice(a, b);
  const WRITE = /fbAdd|fbUpdate|fbSet|fbPush|fbRemove|fbDelete|fbApply|\bupdate\(|\.set\(|\.push\(.*fb|setItem|applySideEffects|assertOwner|\b_req\b|localStorage|fetch\(|sendBeacon|PushNotification|shareText|addWorkReport/;
  T(g.length > 3000 && blk.length > 500, '검사 대상 소스를 찾았다(gangState.js · mir.js 정리 갈래)', `${g.length}/${blk.length}`);
  T(!WRITE.test(g.replace(/\/\/.*$/gm, '')), 'gangState.js — 쓰기·네트워크·저장소 호출이 없다');
  T(!WRITE.test(blk.replace(/\/\/.*$/gm, '')), 'mir.js 정리 갈래 — 쓰기·네트워크·저장소 호출이 없다');
  T(!/from '\.\/firebase\.js'|from "\.\/firebase\.js"/.test(g), 'gangState.js 가 firebase.js 를 부르지 않는다');
  for (const f of ['src/components/MirFab.jsx', 'src/components/SearchPanel.jsx', 'src/pages/GlobalSearchPage.jsx', 'src/craneMove.js']) T(!/bayTidy/.test(rd(f)), `${f} — bayTidy 소비처가 없다(부작용 길 없음)`);
  T(/^\/\/ [가-힣]/.test(g.split('\n')[0]), 'gangState.js 첫 줄이 역할을 적은 한국어 주석');
  const nl = rd('src/nlSearch.js'); const nb = nl.slice(nl.indexOf('★ 4.81 베이 정리'), nl.indexOf('// 컨텍스트 우선 체크'));
  T(nb.length > 300 && !/moveSet|pauseSet/.test(nb), 'nlSearch 정리 갈래가 호기 이동·멈춤 기록 의도를 만들지 않는다');
  T(/via === 'bayTidy'\) return false/.test(m) && /via === 'bayTidy'\) follow = null/.test(m), 'isWeakAnswer 강한 답 · 답 뒤 제안 단추 없음');
  T(/\[베이 정리\(읽기만\)\]/.test(m), 'MIR_CATALOG(번역 창구)에 정리 말이 든다');
}

console.log('⑦ 해치 커버 «열까요?» 물음 — 터미널 반영 홀드 기록이 있으면 묻지 않는다(커버를 세는 배만)');
{ const G = require(path.resolve(OUT));
  const key = 'PCSZ_2630E', t = kst('2026-09-30 06:00'), v = voyAt(key, t);
  const rows = M.flattenVoyages({ [key]: v }).filter((c) => c.voyageKey === key);
  const st = M.gangStateOf(rows, { info: v.info, mode: 'discharge', now: t });
  const gc = st.gc;
  const evid = M.termHoldOpenAt(rows, 'discharge', 24, gc);
  T(evid > 0 && hm(evid) === '05:55', `장 24 홀드 터미널 기록 있음 → 열림 증거 시각 05:55`, hm(evid));
  T(M.termOpenedCover(rows, 'discharge', 24, gc, null) === true, '증거가 있고 해치 보고가 없으면 → 묻지 않는다(true)');
  T(M.termOpenedCover(rows, 'discharge', 24, gc, { act: 'open', ts: evid - 1 }) === true, '마지막 보고가 «열림» → 그대로 true(기존 판정은 화면이 따로 막는다)');
  T(M.termOpenedCover(rows, 'discharge', 24, gc, { act: 'close', ts: evid + 60e3 }) === false, '증거보다 늦은 «닫힘» 보고가 마지막이면 증거로 쓰지 않는다(종전대로 묻는다)');
  T(M.termOpenedCover(rows, 'discharge', 24, gc, { act: 'close', ts: evid - 60e3 }) === true, '증거보다 이른 «닫힘» 보고는 이긴다(그 뒤 터미널이 홀드를 열었다)');
  const none = M.termHoldOpenAt(rows, 'discharge', 2, gc);
  T(none === 0 && M.termOpenedCover(rows, 'discharge', 2, gc, null) === false, '홀드 터미널 기록이 없는 장 → 증거 없음(종전대로 묻는다)', none);
  T(M.termOpenedCover(rows, 'loading', 24, gc, null) === false, '선적 모드 행은 증거로 안 쓴다', '');
  T(M.termOpenedCover(rows, 'discharge', null, gc, null) === false && M.termOpenedCover([], 'discharge', 24, gc, null) === false, '장·행이 없으면 false');
  const gp = rd('src/components/GuidedWorkPanel.jsx');
  const ia = gp.indexOf('const deckDonePromptD = useMemo'), ib = gp.indexOf('return deckRemain === 0 && holdRemain > 0;', ia);
  const body = gp.slice(ia, ib);
  T(body.indexOf('if (isHatchSkipShip) return false;') > 0 && body.indexOf('termOpenedCover(') > body.indexOf('if (isHatchSkipShip) return false;') && body.indexOf('termOpenedCover(') > body.indexOf("isHatchDoneSaved(selectedGroup, 'open')"),
    '화면 배선 — 해치 제외 배는 먼저 나가고, 기존 hatchDone·보고 판정 뒤에 «증거가 있으면 묻지 않음» 만 더한다');
  T(/lastHatchOf\(selectedGroup\)/.test(body) && /import \{ termOpenedCover \} from '\.\.\/gangState\.js'/.test(gp), '화면이 마지막 해치 보고(lastHatchOf)를 넘기고 같은 함수를 부른다');
}

console.log(`\n${bad ? '✘' : '✔'} 4.81 베이 정리 연막검사 ${n - bad}/${n}`);
if (fetchN) { console.log(`✘ 네트워크 호출 ${fetchN}번 — 읽기 전용 답이 밖으로 나갔다`); process.exit(1); }
process.exit(bad ? 1 : 0);
