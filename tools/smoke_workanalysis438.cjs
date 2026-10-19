// 미르 «작업 분석» · «예상 작업시간(N갱)» 연막검사 (TallyOne 4.39-01) — 실소스 번들(mirCore.entry) + 실제 항차 ATPR 2646E(보관본, 2026-10-19 읽기 전용 GET)로 잰다.
//   검수사 2026-10-19 21:47~21:49 실입력 «작업 분선해줘»(잡담 답) · «작업 분석해줘»(브리핑) · «예상 작업시간은 2갱으로»(갱 분배 «베이매트릭스가 없어») · «작업 예상시간 알려줘»(«아직 시작 전»)
//   22:02 «예상시간까지 들어 가고 갱당 무브수도 알려주고 특수화물 개개별로 안알려줘도 되고 … 20피트 몇대 40피트 몇대 총 몇대이며 리퍼는 20피트2개 40피트 20개 FR은 4대 OT는 3대
//   XRAY는 5대가 있습니다. 트윈 무게를 감안해서 총 무브수는 몇대이고 평균 시간당 무브수는 갱당 25개이고2갱 계산으로 총 몇시간 걸릴것입니다. 주의 할점은 FR사진 XRAY 실달기 리퍼온도 체크또는 리스트 받기등»
//   22:03 «거짓이라고 이야기 한것은 무게가 있고 EDI가 있으니 위치도 있습니다» · 22:05 «여기(작업 시작 «예상 작업 시간» 줄)가 확실했으면 미르에게 분석해달라고 하지 않았을 것입니다».
//   node tools/smoke_workanalysis438.cjs <mirCore 번들> <저장소 루트>
process.env.TZ = 'Asia/Seoul';
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
let fetchN = 0;
global.fetch = () => { fetchN += 1; return Promise.reject(new Error('연막: 네트워크 없음')); };
const M = require(path.resolve(OUT));
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/workanalysis_atpr2646e.json'), 'utf8'));
const VK = FX.voyageKey, V = FX.voyage;
let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + String(detail).replace(/\n/g, ' ⏎ ').slice(0, 400) : ''}`); } };
const NOW = new Date('2026-10-19T21:48:00+09:00').getTime();
//  화면이 넘기는 병합 행 — 항차 화면·작업창과 같은 flattenVoyages(X-RAY 표식·리스트 무게가 입혀진다)
const CS = M.flattenVoyages({ [VK]: V }).filter((c) => c.voyageKey === VK);
const tally = () => ({ app: 'tally', voyageKey: VK, voyage: V, info: V.info, mode: 'discharge', containers: CS, inspector: '연막', smallTalkLast: true, modeChoice: 'both', voyages: { [VK]: V }, flat: CS, _now: NOW });
const cone = () => ({ app: 'cone', containers: CS, cone: { rows: [], dischRows: [], stowRows: [] }, mode: 'discharge', info: V.info, voyage: V, vsl: V.info.vsl, voyageKey: VK, inspector: '연막', _now: NOW });
const ask = (q, ctx) => { const tr = {}; M._mirThreadReset(); const a = M.answerOneRaw(q, { ...ctx, _trace: tr }); return { a: String(a == null ? '' : a), tr, weak: M.isWeakAnswer(q, a, tr) }; };

console.log('① 화면 «예상 작업 시간» 줄과 같은 계산 — EDI 무게가 빈 20피트 116대는 리스트 무게로 잰다');
{ const E = M.expectedWorkTimeOf(V, null, NOW);
  T(E.units === 267 && E.n20 === 116 && E.n40 === 151, '267대 = 20피트 116 · 40피트 151', `${E.units}/${E.n20}/${E.n40}`);
  T(E.exact === true && E.unres20 === 0 && E.twinNoWt === 0, '무게·자리가 다 있어 확정(«자리나 무게를 몰라» 줄이 사라진다)', `${E.exact}/${E.unres20}/${E.twinNoWt}`);
  T(E.twinLifts === 32 && E.twinOver === 16 && E.twinDiff === 2 && E.moves === 235, '트윈 32쌍 · 55톤 초과 16 · 무게차 2 → 235무브(267 아님)', `${E.twinLifts}/${E.twinOver}/${E.twinDiff}/${E.moves}`);
  T(E.rate === 30 && E.gangs === 2 && E.minutes === 235 && E.minutes1 === 470, '트윈 24% → 갱당 30 · 2갱 235분(3시간 55분) · 1갱 470분', `${E.rate}/${E.gangs}/${E.minutes}/${E.minutes1}`);
  const v0 = JSON.parse(JSON.stringify(V)); for (const r of Object.values(v0.discharge.records)) delete r.wt;
  const E0 = M.expectedWorkTimeOf(v0, null, NOW);
  T(E0.exact === false && E0.moves === 267 && E0.twinLifts === 0, '리스트 무게까지 없으면 종전처럼 미확정 범위(한 대씩 267 · 트윈 0)', `${E0.exact}/${E0.moves}/${E0.twinLifts}`); }

console.log('② «작업 분석» — 규격·특수화물(개수만)·트윈 무브·갱당 무브·예상 시간·주의');
for (const q of ['작업 분석해줘', '작업 분선해줘', '작업 분석', '작업분석 해줘', '분석해줘', '미르야 작업 분석해줘']) {
  const { a, tr, weak } = ask(q, tally());
  T(tr.via === 'workAnalysis' && !weak
    && /20피트 116대 · 40피트 151대 · 총 267대/.test(a)
    && /리퍼 20피트 2대 · 40피트 100대/.test(a) && /XRAY 5대/.test(a) && /FR·OT·위험물 없음/.test(a)
    && /트윈 32쌍 → 총 235무브/.test(a) && /55톤 넘는 16쌍 · 무게차 큰 2쌍은 싱글로 셈/.test(a)
    && /갱당 시간당 30무브/.test(a) && /2갱이면 약 3시간 55분/.test(a) && /1갱이면 7시간 50분/.test(a)
    && /주의 — XRAY 실 달기 5대 · 리퍼 온도 체크 102대/.test(a)
    && !/BEAU|MSKU|베이 \d/.test(a), `«${q}» — 분석 답(강 · 모델로 안 감 · 컨 번호·베이 낱낱이 안 늘어놓음)`, `${tr.via} ${weak} | ${a}`);
}
{ const { a } = ask('작업 분석해줘', tally()); console.log('     ' + a.replace(/\n/g, '\n     ')); }

console.log('③ «예상 작업시간» — 완료 10대 전이면 같은 계산 · «N갱으로» 는 그 갱 수(갱 수를 적지 않는다)');
for (const [q, re] of [['예상 작업시간은 2갱으로', /2갱이면 약 3시간 55분/], ['작업 예상시간 알려줘', /2갱이면 약 3시간 55분 .*갱 수 미등록이라 2갱으로 셈/], ['3갱 기준 예상 작업시간', /3갱이면 약 2시간 37분/], ['1갱이면 예상 작업 시간', /1갱이면 약 7시간 50분/], ['2갱으로 하면 몇 시간 걸려', /2갱이면 약 3시간 55분/]]) {
  const { a, tr, weak } = ask(q, tally());
  const pq = M.parseNaturalQuery(q);
  T(tr.via === 'workAnalysis' && !weak && re.test(a) && /235무브/.test(a) && !pq.gangSet && !pq.crewSet, `«${q}» — 예상 시간 답 · 갱 수 적는 말로 안 잡힘`, `${tr.via} | ${a} | gangSet ${JSON.stringify(pq.gangSet)}`);
}
//  시작한 배는 실측 페이스(종전 길)가 답한다 — 계획값으로 덮지 않는다
{ const v1 = JSON.parse(JSON.stringify(V)); const cns = Object.keys(v1.discharge.ediContainers).slice(0, 30); v1.discharge.completed = {}; cns.forEach((cn, i) => { v1.discharge.completed[cn] = { at: NOW - (30 - i) * 120000, equip: '1' }; });
  const cs1 = M.flattenVoyages({ [VK]: v1 }).filter((c) => c.voyageKey === VK);
  const { a, tr } = ask('작업 예상시간 알려줘', { ...tally(), voyage: v1, voyages: { [VK]: v1 }, containers: cs1, flat: cs1 });
  T(tr.via !== 'workAnalysis' && !/예상 작업 시간 — 평택/.test(a), '완료 30대인 배의 «작업 예상시간» 은 종전 길(실측 페이스)', `${tr.via} | ${a}`);
  const e = ask('작업 예상시간 알려줘', { ...tally(), voyage: v1, voyages: { [VK]: v1 }, containers: cs1, flat: cs1 }).a;
  const f = ask('몇 시에 끝나', { ...tally(), voyage: v1, voyages: { [VK]: v1 }, containers: cs1, flat: cs1 }).a;
  T(e === f, '완료 30대 «작업 예상시간 알려줘» = «몇 시에 끝나» 답', `${e} ‖ ${f}`);
  //  보관본은 터미널 본선현황(qcWork)이 0 이라 «몇 시에 끝나» 가 «아직 시작 전» — 거기에 «이미 시작돼» 를 붙이지 않는다(3차 감사 권고)
  for (const [q, g] of [['예상 작업시간은 2갱으로', 2], ['3갱 기준 예상 작업시간', 3], ['4갱으로 하면 얼마나 걸려', 4]]) {
    const r = ask(q, { ...tally(), voyage: v1, voyages: { [VK]: v1 }, containers: cs1, flat: cs1 });
    T(r.tr.via === 'expectEta' && r.a === f && /아직 시작 전/.test(f) && !r.weak && !/갱 분배|베이매트릭스|이미 시작돼/.test(r.a),
      `완료 30대·본선현황 0 «${q}» — «몇 시에 끝나» 와 같은 글(강 · «갱 2개» 로 새지 않음 · «시작 전» 과 «이미 시작돼» 를 함께 쓰지 않음)`, `${r.tr.via} ${r.weak} | ${r.a}`);
  }
  //  본선현황이 없으면 앱 완료 30대로 잰 실측 페이스 답 — 거기에 «N갱 가정 대신» 한 줄
  { const v3 = JSON.parse(JSON.stringify(v1)); delete v3.info.qcWork; delete v3.info.termStat;
    const cx = { ...tally(), voyage: v3, info: v3.info, voyages: { [VK]: v3 }, containers: cs1, flat: cs1 };
    const f3 = ask('몇 시에 끝나', cx).a;
    for (const [q, g] of [['예상 작업시간은 2갱으로', 2], ['4갱으로 하면 얼마나 걸려', 4]]) {
      const r = ask(q, cx);
      T(r.tr.via === 'expectEta' && !/아직 시작 전/.test(f3) && r.a.startsWith(f3) && new RegExp(`완료 30대\\) ${g}갱 가정 대신 실측 페이스로 셌어요`).test(r.a) && !r.weak,
        `완료 30대(본선현황 없음) «${q}» — «몇 시에 끝나» 와 같은 실측 페이스 답 + «${g}갱 가정 대신» 한 줄`, `${r.tr.via} ${r.weak} | ${r.a}`);
    } }
  const gq = ask('2갱 기준 갱 분배 몇 시간', { ...tally(), voyage: v1, voyages: { [VK]: v1 }, containers: cs1, flat: cs1 });
  T(gq.tr.via !== 'expectEta' && gq.tr.via !== 'workAnalysis', '«2갱 기준 갱 분배 몇 시간» 은 갱 분배 길 그대로(재감사 — expectEta 표시가 새지 않음)', `${gq.tr.via} | ${gq.a}`); }

console.log('④ 두 앱 같은 답 · 배 없는 홈 · 종전 갱 말 · 다른 질문');
for (const q of ['작업 분석해줘', '예상 작업시간은 2갱으로']) {
  const t = ask(q, tally()).a, c = ask(q, cone()).a;
  T(t === c, `«${q}» — 검수앱·콘앱 같은 답`, `${t} ‖ ${c}`);
}
{ const { a } = ask('작업 분석해줘', { app: 'tally', voyages: { [VK]: V }, flat: CS, voyageKey: '', inspector: '연막', _now: NOW });
  T(/어느 배 말씀인지 배 이름을 붙여 주시면 바로 분석합니다/.test(a), '배 없는 홈 — 배 이름을 묻는다(배 고르기 단추가 붙는 문구)', a); }
{ const { tr } = ask('갱 2개로 분배', tally()); T(tr.via !== 'workAnalysis', '«갱 2개로 분배» 는 종전 갱 분배 길 그대로', tr.via); }
for (const q of ['도선 예상 시간', '출항 예상 시간', '입항 예상 시간', '예상 시간', '예상 작업 시간 어디서 봐', '예상 작업 시간은 어떻게 계산해', '2갱으로 해', '작업 시간 몇 시간이야']) {
  const { tr } = ask(q, tally()); T(tr.via !== 'workAnalysis', `«${q}» — 작업 분석·예상 시간 답이 가로채지 않는다(다른 질문·기능 위치·갱 적기)`, tr.via);
}
//  감사 M4 — 하지 말라는 말·지난 날·틀렸다는 말은 계산을 내지 않는다
for (const q of ['작업 분석 하지 마', '어제 작업 분석', '작업 분석 틀렸어', '예상 작업시간 틀렸어', '예상 작업 시간 줄 없애줘', '지난 항차 작업 분석']) {
  const { tr } = ask(q, tally()); T(tr.via !== 'workAnalysis', `«${q}» — 작업 분석·예상 시간 계산을 내지 않는다(감사 M4)`, tr.via);
}
//  재감사 — «말고»·«왜» 는 막지 않는다(고쳐 말하기 · 왜 긴지 묻는 말엔 계산표가 답)
for (const [q, re] of [['2갱 말고 3갱으로 예상 작업시간', /3갱이면 약 2시간 37분/], ['2갱으로 말고 3갱이면 몇 시간 걸려', /3갱이면 약 2시간 37분/], ['예상 작업 시간이 왜 이렇게 길어', /2갱이면 약 3시간 55분/], ['작업 분석 왜 이렇게 나와', /총 235무브/]]) {
  const { a, tr, weak } = ask(q, tally()); T(tr.via === 'workAnalysis' && !weak && re.test(a), `«${q}» — 뒤 갱 수·계산표로 답(재감사 질문 2)`, `${tr.via} | ${a}`);
}

console.log('⑤ 시작 직후(완료 10대 전)·선적 자료 수집중 — 화면 줄과 같은 때만 예상 시간');
{ const v1 = JSON.parse(JSON.stringify(V)); const cns = Object.keys(v1.discharge.ediContainers).slice(0, 5); v1.discharge.completed = {}; cns.forEach((cn, i) => { v1.discharge.completed[cn] = { at: NOW - (5 - i) * 120000, equip: '1' }; });
  const cs1 = M.flattenVoyages({ [VK]: v1 }).filter((c) => c.voyageKey === VK);
  const c1 = { ...tally(), voyage: v1, voyages: { [VK]: v1 }, containers: cs1, flat: cs1 };
  const e = ask('작업 예상시간 알려줘', c1), a = ask('작업 분석해줘', c1);
  T(e.tr.via === 'workAnalysis' && /완료 5 · 정상 작업 기준 · 처음부터의 계획값/.test(e.a) && /2갱이면 약 3시간 55분/.test(e.a), '완료 5대(화면 줄이 아직 보이는 때) — 같은 계획값으로 답(감사 M1)', `${e.tr.via} | ${e.a}`);
  T(/작업 중 — 아래 시간은 처음부터의 계획값/.test(a.a) && /총 235무브/.test(a.a), '작업 분석 — 시작한 배는 «작업 중 · 처음부터의 계획값» 으로 밝힌다', a.a); }
//  선적이 리스트뿐인 배 — 4.17 판정 한 벌(_vcOf): 터미널 본선현황이 없으면 «자료 수집중», 있으면 그 수로 센다(«총 무브수» 와 같은 숫자 · 재감사 N1)
const listOnlyLoading = (stripTerm) => { const v2 = JSON.parse(JSON.stringify(V)); const r0 = Object.values(v2.discharge.records).slice(0, 12);
  v2.loading = { records: {} }; r0.forEach((r, i) => { const cn = 'TEST' + String(1000000 + i); v2.loading.records[cn] = { ...r, cn, pol: 'KRPTK', pod: 'CNSHA' }; });
  if (stripTerm) { delete v2.info.qcWork; delete v2.info.termStat; }
  const cs2 = M.flattenVoyages({ [VK]: v2 }).filter((c) => c.voyageKey === VK);
  return { ...tally(), voyage: v2, info: v2.info, voyages: { [VK]: v2 }, containers: cs2, flat: cs2 }; };
T(!!(V.info.qcWork || V.info.termStat), 'ATPR 2646E 보관본에 터미널 본선현황이 있다(⑤ 두 갈래의 전제)');
{ const c2 = listOnlyLoading(true);
  const a = ask('작업 분석해줘', c2), e = ask('작업 예상시간 알려줘', c2), g = ask('예상 작업시간은 2갱으로', c2), f = ask('몇 시에 끝나', c2);
  T(a.tr.via === 'workAnalysis' && /선적 자료 수집중이라.*무브·예상 시간은 아직 세지 않아요/.test(a.a) && !/총 \d+무브|갱이면 약/.test(a.a), '터미널 본선현황 없음 + 선적 리스트뿐 — 작업 분석은 무브·시간을 세지 않는다(감사 M2)', a.a);
  T(e.tr.via === 'collecting' && g.tr.via === 'collecting' && e.a === f.a && g.a === f.a && /수집/.test(f.a), '같은 배 «작업 예상시간 알려줘»·«예상 작업시간은 2갱으로» = «몇 시에 끝나» 의 «자료 수집중» 답', `${e.tr.via} ${g.tr.via} | ${e.a} ‖ ${g.a} ‖ ${f.a}`); }
{ const c3 = listOnlyLoading(false);
  const a = ask('작업 분석해줘', c3), m = ask('총 무브수', c3);
  const am = a.a.match(/총 (?:최대 )?(\d+)무브/), mm = m.a.match(/(\d+)\s*무브/);
  T(a.tr.via === 'workAnalysis' && !/수집중/.test(a.a) && !!am && !!mm && am[1] === mm[1], `터미널 본선현황 있음 + 선적 리스트뿐 — 4.17 규칙대로 세고 «총 무브수» 와 같은 ${am && am[1]}무브(재감사 N1)`, `${a.a} ‖ ${m.a}`); }

console.log('⑥ 양하+선적 섞인 실항차 · 열린 탭과 무관 · 콘앱 실제 모양 ctx — 대수=양하+선적 · 무브=대수−트윈+시프팅 2무브');
const FS = [];
{ const F = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirsame_kbtr.json'), 'utf8')); FS.push([F.voyageKey, F.voyage]); }
{ const F = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/shiftsplit416.json'), 'utf8')); for (const k of Object.keys(F)) if (F[k] && F[k].info) FS.push([k, F[k]]); }
FS.push([VK, V]);
//  재감사 N1 — RZOR(LOLO · 선적 EDI 에 자리 없음 → 콘앱 행에 선적이 없다 · 터미널 본선현황 있음)
{ const F = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/daynight_gang_real.json'), 'utf8')); FS.push(['RZOR_R106E', F.RZOR_R106E.voyage || F.RZOR_R106E]); }
{ const F = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/ferry1700.json'), 'utf8')); const vs = F.voyages || {}; for (const k of Object.keys(vs)) if (/^RZOR/.test(k) && vs[k] && vs[k].info) FS.push([k, vs[k]]); }
//  콘앱 ctx — cone.html mirAsk 그대로(항차에 EDI 없음 · 행은 자리 있는 평택분 EDI 행(양하 POD·선적 POL 평택) → toMirContainers · 시프팅분 _shift · X-RAY 표식 · 평택 양하분 applyDischargeUnits)
const pad2 = (s) => String(s || '').padStart(2, '0');
const rowOf = (c) => { const iso = String(c.iso || c.tp || ''); const hasPos = !(c.bay == null || c.tier == null || c.bay === '' || c.tier === ''); return { bay: hasPos ? String(c.bay) : '', row: hasPos ? pad2(c.row) : '', tier: hasPos ? pad2(c.tier) : '', size: c.size ? String(c.size) : (iso[0] === '2' ? '20' : '40'), cn: String(c.cn || '').toUpperCase(), iso, fe: c.fe || '', op: c.op || '', wt: c.wt || 0, temp: c.temp != null ? c.temp : null, reefer: !!c.rf, dg: !!c.dg, fr: !!c.fr, tk: !!c.tk, ot: !!(c.ot || c.oog), oog: !!c.oog, pol: c.pol || null, pod: c.pod || null }; };
function coneOf(vk, v) {
  const flat = M.flattenVoyages({ [vk]: v }).filter((c) => c.voyageKey === vk);
  const sh = { discharge: new Set(), loading: new Set() };
  for (const c of flat) { if (c._shift) sh[c._mode].add(c.cn); }
  const D = v.discharge || {}, L = v.loading || {}, comp = Object.assign({}, D.completed || {}, L.completed || {});
  const rows = (m) => { const ed = (v[m] || {}).ediContainers || {}; const o = []; for (const k in ed) { const r = rowOf(ed[k] || {}); if (!r.bay || !r.tier) continue; if (m === 'discharge' ? M.isPyeongtaekPort(r.pod) : M.isPyeongtaekPort(r.pol)) o.push(r); else if (sh[m].has(r.cn)) o.push({ ...r, _shift: true }); } return o; };
  const paint = (rs, m) => M.toMirContainers(rs, m).map((c) => { const w = c && c.cn ? comp[c.cn] : null; return w && !c._comp ? { ...c, _comp: w } : c; });
  const xl = D.xrayList || {}, shAll = new Set([...sh.discharge, ...sh.loading]);
  let cs = paint(rows('discharge'), 'discharge').concat(paint(rows('loading'), 'loading')).map((c) => (!c || !c.cn || c._mode === 'loading' || !xl[c.cn]) ? c : { ...c, _xray: true });
  cs = M.applyDischargeUnits(cs, { discharge: { records: D.records || {}, completed: D.completed || {}, termWork: D.termWork || {} } }, shAll).rows;
  const voyage = { info: v.info, reports: v.reports || {}, discharge: { completed: D.completed || {}, records: D.records || {}, termWork: D.termWork || {}, xrayList: xl, xraySeals: D.xraySeals || {}, held: D.held || {} }, loading: { completed: L.completed || {}, records: L.records || {}, held: L.held || {} } };
  return { app: 'cone', containers: cs, cone: { rows: [], dischRows: [], stowRows: [] }, accepted: true, shiftN: shAll.size, mode: 'discharge', modeLabel: '양하', info: v.info, compMap: comp, shiftMap: null, voyage, vsl: v.info.vsl || '', vslFull: v.info.vslFull || '', pier: v.info.pier || '', voyageKey: vk, records: { discharge: D.records || {}, loading: L.records || {} }, inspector: '연막', _now: NOW };
}
let mixed = 0, shifted = 0;
for (const [vk, v] of FS) {
  const flat = M.flattenVoyages({ [vk]: v }).filter((c) => c.voyageKey === vk);
  const base = { app: 'tally', smallTalkLast: true, modeChoice: 'both', voyage: v, voyageKey: vk, voyages: { [vk]: v }, info: v.info, inspector: '연막', _now: NOW };
  const full = ask('작업 분석해줘', { ...base, mode: 'discharge', containers: flat, flat }).a;
  const m = full.match(/작업 분석 — (?:양하 (\d+)대)?(?: · )?(?:선적 (\d+)대)?/), sz = full.match(/20피트 (\d+)대 · 40피트 (\d+)대 · 총 (\d+)대/), mv = full.match(/트윈 (\d+)쌍 → 총 (?:최대 )?(\d+)무브(?:\(시프팅 (\d+)대 (\d+)무브 포함\))?/);
  const dis = Number((m && m[1]) || 0), lod = Number((m && m[2]) || 0);
  if (dis && lod) mixed += 1; if (mv && mv[3]) shifted += 1;
  T(!!(sz && mv) && Number(sz[1]) + Number(sz[2]) === dis + lod && Number(sz[3]) === dis + lod && Number(mv[2]) === dis + lod - Number(mv[1]) + Number(mv[4] || 0),
    `${vk} — 대수 ${dis}+${lod} = 20·40피트 합 · 무브 = 대수 − 트윈 + 시프팅 2무브`, full);
  for (const [mode, cs] of [['discharge', flat.filter((c) => c._mode === 'discharge').map(({ voyageKey, ...r }) => r)], ['loading', flat.filter((c) => c._mode === 'loading').map(({ voyageKey, ...r }) => r)]]) {
    const a = ask('작업 분석해줘', { ...base, mode, containers: cs, flat: undefined }).a;
    T(a === full, `${vk} — 열린 탭(${mode === 'loading' ? '선적' : '양하'} ${cs.length}행)만 넘겨도 같은 답(감사 M3)`, `${a} ‖ ${full}`);
  }
  for (const q of ['작업 분석해줘', '예상 작업시간은 2갱으로']) {
    const t = ask(q, { ...base, mode: 'discharge', containers: flat, flat }).a, c = ask(q, coneOf(vk, v)).a;
    T(t === c, `${vk} «${q}» — 검수앱·콘앱(실제 모양 ctx) 같은 답`, `${t} ‖ ${c}`);
  }
}
T(mixed >= 2 && shifted >= 1, `양하+선적 섞인 항차 ${mixed}척 · 시프팅 있는 항차 ${shifted}척을 쟀다`, `${mixed}/${shifted}`);
{ const F = FS.find(([k]) => k === 'KBTR_2606E'); const a = ask('작업 분석해줘', { app: 'tally', voyage: F[1], voyageKey: F[0], voyages: { [F[0]]: F[1] }, info: F[1].info, mode: 'discharge', containers: [], inspector: '연막', _now: NOW }).a;
  T(/작업 끝남 — 아래 시간은 처음부터의 계획값/.test(a), 'KBTR 2606E(전부 완료) — «작업 끝남» 으로 밝힌다', a); }
T(fetchN === 0, '규칙 답만 — 네트워크 0번');

console.log(`\n${bad ? '✗' : '✔'} 미르 작업 분석 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
