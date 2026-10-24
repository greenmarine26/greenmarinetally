// 미르 4.39-02 연막검사 — 2026-10-20 검수사 실입력(ATPR 2646E · 콘앱)을 실소스 번들(mirCore.entry)과 실제 항차(보관본)로 잰다.
//   ① 예상 실오류 — 16:37 «밀양(미르야) 실오류 하나 있었는데 왜 안알려줬어?» · 16:41 «실오류 있지?» · 16:46 «같은 패턴실이 많았는데 그중 하나만 자릿수 부족 이상하다고 안봄»
//      SKR 실이 «S+5자리» 123 · «숫자 6자리» 136 으로 갈려 한 모양이 60% 를 못 넘자 4.36 판정이 HALU2331077 «00240»(실물 002403)을 못 잡았다.
//   ② 14:43 «25번베이부터 해야 되는데 어떻게 바꾸지?» — 매뉴얼 추측이 «브리핑»·«켜는 법과 순서» 를 냈다(약한 답 → 모델). 4.40 부터는 미르가 옮긴다(장 칩 안내 → «옮겨 드릴까요?»).
//   ③ 15:22~15:47 콘앱 «집에 몇 시에 끝나»·«집에 몇 시에가»·«집에 몇 시에» → 잡담 · «그럼 몇 개 남았어» → 군말 «그럼» 이 남아 모델로.
//   node tools/smoke_mir43902.cjs <mirCore 번들> <저장소 루트>
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
const VK = FX.voyageKey, V = FX.voyage;   // 2026-10-19 보관본 — HALU2331077 리스트 실 «00240»(고치기 전)
let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + String(detail).replace(/\n/g, ' ⏎ ').slice(0, 500) : ''}`); } };
const NOW = new Date('2026-10-20T16:37:00+09:00').getTime();
const flatOf = (v) => M.flattenVoyages({ [VK]: v }).filter((c) => c.voyageKey === VK);
const tally = (v = V) => { const cs = flatOf(v); return { app: 'tally', voyageKey: VK, voyage: v, info: v.info, mode: 'discharge', containers: cs, flat: cs, voyages: { [VK]: v }, inspector: '연막', smallTalkLast: true, modeChoice: 'both', accepted: true, _now: NOW }; };
//  콘앱 ctx — cone.html mirAsk 그대로(감사 E1): 행은 자리 있는 평택분 EDI 행(_ediRowOf 꼴 — 실 칸 없음 · slEdi 만) → toMirContainers · X-RAY 표식 · applyDischargeUnits · 항차에 EDI 없음 · records 넘김
const pad2 = (x) => String(x || '').padStart(2, '0');
const ediRowOf = (c) => { const iso = String(c.iso || c.tp || ''); const hasPos = !(c.bay == null || c.tier == null || c.bay === '' || c.tier === '');
  return { bay: hasPos ? String(c.bay) : '', row: hasPos ? pad2(c.row) : '', tier: hasPos ? pad2(c.tier) : '', size: iso[0] === '2' ? '20' : '40', cn: String(c.cn || '').toUpperCase(), iso, fe: c.fe || '', op: c.op || '', wt: c.wt || 0,
    temp: c.temp != null ? c.temp : null, reefer: !!c.rf, rf: !!c.rf, dg: !!c.dg, fr: !!c.fr, tk: !!c.tk, ot: !!(c.ot || c.oog), oog: !!c.oog, pol: c.pol || null, pod: c.pod || null, slEdi: c.sl != null ? String(c.sl) : '' }; };
const cone = (v = V, vk = VK) => {
  const D = v.discharge || {}, L = v.loading || {}, xl = D.xrayList || {};
  const rowsOf = (m) => Object.values((v[m] || {}).ediContainers || {}).map(ediRowOf).filter((r) => r.bay && r.tier && (m === 'discharge' ? M.isPyeongtaekPort(r.pod) : M.isPyeongtaekPort(r.pol)));
  let cs = M.toMirContainers(rowsOf('discharge'), 'discharge').concat(M.toMirContainers(rowsOf('loading'), 'loading')).map((c) => (c._mode !== 'loading' && xl[c.cn]) ? { ...c, _xray: true } : c);
  cs = M.applyDischargeUnits(cs, { discharge: { records: D.records || {}, completed: D.completed || {}, termWork: D.termWork || {} } }, new Set()).rows;
  return { app: 'cone', containers: cs, cone: { rows: [], dischRows: [], stowRows: [] }, accepted: true, mode: 'discharge', modeLabel: '양하', info: v.info,
    voyage: { info: v.info, reports: v.reports || {}, discharge: { completed: D.completed || {}, records: D.records || {}, termWork: D.termWork || {}, xrayList: xl, xraySeals: D.xraySeals || {} }, loading: { completed: L.completed || {}, records: L.records || {} } },
    vsl: v.info.vsl, vslFull: v.info.vslFull, voyageKey: vk, records: { discharge: D.records || {}, loading: L.records || {} }, inspector: '', _now: NOW }; };
const ask = (q, ctx) => { const tr = {}; M._mirThreadReset(); const a = M.answerOneRaw(q, { ...ctx, _trace: tr }); return { a: String(a == null ? '' : a), tr, weak: M.isWeakAnswer(q, a, tr) }; };

console.log('① 예상 실오류 — 같은 패턴(숫자 6자리) 실 가운데 하나만 5자리');
{ const R = V.discharge.records;
  const sa = M.sealFormatAnomalies(R);
  T(sa.length === 1 && sa[0].cn === 'HALU2331077' && sa[0].seal === '00240' && /자릿수 부족/.test(sa[0].why) && /6자리가 96% \(136\/142\)/.test(sa[0].why), 'ATPR 2646E SKR — HALU2331077 «00240» 하나만 «자릿수 부족»(숫자 실 6자리 136/142)', JSON.stringify(sa));
  T(!sa.some((x) => /^0507/.test(x.seal)), '같은 선사의 다른 실 계열(0507xxx 7자리 5대)은 올리지 않는다 — 긴 쪽은 자릿수 부족이 아니다');
  const fixed = JSON.parse(JSON.stringify(R)); fixed.HALU2331077.sl = '002403'; fixed.HALU2331077.sl_orig = '00240'; fixed.HALU2331077.sl_history = [{ from: '00240', to: '002403', by: '연막', at: 1792800000000 }];   // 4.49: 검수원 고침은 sl_history 가 증거다(firebase 실번호 고치기와 같은 모양) — 이력 없는 sl≠sl_orig 는 옛 병합 흔적(utils.sealLegacyOf)
  T(M.sealFormatAnomalies(fixed).length === 0, '검수원이 고친 뒤(sl 002403 · sl_orig 00240)는 빠진다(그때부터는 «실오류»)');
  //  표본 밖 가드 — «0000»(실 없음 표기) · 같은 짧은 모양이 4개 이상(다른 실 계열) · 20개 미만
  //  가짜 컨번호 숫자(5000xxx)와 실 숫자(9xxxxx)가 겹치지 않게 — 겹치면 «컨번호와 같은 씰» 로 따로 잡힌다
  const mk = (list) => Object.fromEntries(list.map(([cn, sl], i) => [cn || `TSTU${String(5000000 + i * 7)}`, { sl, op: 'SKR' }]));
  const base = Array.from({ length: 40 }, (_, i) => [null, String(900000 + i * 37)]).concat(Array.from({ length: 30 }, (_, i) => [null, 'S' + String(80000 + i)]));
  T(M.sealFormatAnomalies(mk(base.concat([['ZERO7700001', '0000']]))).length === 0, '«0000»(실 없음 표기)은 실오류로 안 올린다');
  T(M.sealFormatAnomalies(mk(base.concat([['SHRT7700001', '7056'], ['SHRT7700002', '7060'], ['SHRT7700003', '7157'], ['SHRT7700004', '7158']]))).length === 0, '같은 짧은 모양이 4개 이상이면 그 배의 다른 실 계열로 본다(보관 ATRP 2628E 4자리 연번)');
  T(M.sealFormatAnomalies(mk(base.concat([['SHRT7700001', '12345']]))).map((x) => x.cn).join() === 'SHRT7700001', '하나만 짧으면 잡는다');
  T(M.sealFormatAnomalies(mk(base.slice(0, 15).concat([['SHRT7700001', '12345']]))).length === 0, '같은 패턴 실이 20개 미만이면 판정하지 않는다');
}
for (const q of ['밀양 실오류 하나 있었는데 왜 안알려줬어?', '미르야 실오류 하나 있었는데 왜 안알려줬어?', '실오류 있지?', '실오류 있어?', '실번호 점검', '실번호 의심']) {
  for (const [nm, cx] of [['검수앱', tally()], ['콘앱', cone()]]) {
    const { a, tr, weak } = ask(q, cx);
    T(tr.via === 'sealAudit' && !weak && /HALU2331077 — 🔎 예상 실오류: 리스트 「00240」 — 숫자 5자리 — 자릿수 부족/.test(a), `${nm} «${q}» — 예상 실오류를 말한다(강 · 모델로 안 감)`, `${tr.via} ${weak} | ${a}`);
  }
}
{ const v2 = JSON.parse(JSON.stringify(V)); const r = v2.discharge.records.HALU2331077; r.sl = '002403'; r.sl_orig = '00240'; r.sl_history = [{ at: NOW + 60000, by: '연막', from: '00240', to: '002403' }];
  const { a, tr } = ask('실오류 있지?', tally(v2)), c2 = ask('실오류 있지?', cone(v2));
  T(tr.via === 'sealAudit' && /HALU2331077 — ⚠ 실오류: 리스트 「00240」 → 실물 「002403」/.test(a) && !/예상 실오류/.test(a), '실물 실을 고친 뒤 «실오류 있지?» — 실오류(리스트 00240 → 실물 002403)로 답하고 예상 실오류는 사라진다', a);
  T(c2.a === a, '실을 고친 뒤 콘앱 실제 모양 ctx 도 같은 답(감사 E1 — 행에 실 칸이 없어 «점검할 데이터 없음» 이던 것)', `${c2.a} ‖ ${a}`); }
T(ask('실번호 점검', tally()).a === ask('실번호 점검', cone()).a, '실을 고치기 전 «실번호 점검» — 두 앱 같은 글(점검 267건)', `${ask('실번호 점검', cone()).a}`);
//  감사 A1 — EDI 실이 리스트 실과 같으면 새 «자릿수 부족» 갈래에서 뺀다(RZOR 정상 실 계열 · 1.85-03 «4자리 실도 있다»)
{ const RZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/daynight_gang_real.json'), 'utf8')).RZOR_R106E;
  const R = RZ.discharge.records, E = RZ.discharge.ediContainers;
  const noEdi = M.sealFormatAnomalies(R).map((x) => x.cn), withEdi = M.sealFormatAnomalies(R, { edi: M.ediSealMapOf(E) }).map((x) => x.cn);
  T(noEdi.includes('SPSU2024400') && noEdi.includes('LYGU4028694') && !withEdi.includes('SPSU2024400') && !withEdi.includes('LYGU4028694'), 'RZOR R106E HTF «0236»·«24266» — EDI 실도 같으면 안 올린다(EDI 를 모르면 올림)', `${noEdi} ‖ ${withEdi}`);
  T(M.sealFormatAnomalies(V.discharge.records, { edi: M.ediSealMapOf(V.discharge.ediContainers) }).map((x) => x.cn).join() === 'HALU2331077', 'ATPR 2646E — EDI 실이 비어 있어 그대로 잡는다');
  const tz = { app: 'tally', voyageKey: 'RZOR_R106E', voyage: RZ, info: RZ.info, mode: 'discharge', containers: M.flattenVoyages({ RZOR_R106E: RZ }).filter((c) => c.voyageKey === 'RZOR_R106E'), voyages: { RZOR_R106E: RZ }, inspector: '연막', accepted: true, _now: NOW };
  const ta = ask('실번호 점검', tz).a, ca = ask('실번호 점검', cone(RZ, 'RZOR_R106E')).a;
  const tw = ask('작업 분석해줘', tz).a;
  T(!/예상 실오류/.test(tw) && !/예상 실오류/.test(ask('브리핑', tz).a), 'RZOR R106E — 선적의 다른 회사 씰(LYG·HS·SKR·LF·ES·BHGJ 10건, 4.36 주의 박스 «형식 다름»)은 미르가 늘어놓지 않는다(자릿수 부족·컨번호 같은 씰만)', tw);
  const MC = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mcap639N_seals.json'), 'utf8'));
  const mcRows = Object.entries(MC.discharge).map(([cn, r]) => ({ ...r, cn, _mode: 'discharge' }));
  const mp = M.sealPredictOf(mcRows, MC.discharge).map((x) => x.cn).sort().join();
  //  재감사 — 접두가 다른 씰(다른 회사 씰)은 자릿수가 모자라도 미르가 말하지 않는다(실측 DXQD 2641E «254784~254788» ↔ «DWS+7» · DJCF 0152N «SM451653» ↔ «NS+7»)
  { const recs = {}; for (let i = 0; i < 40; i++) recs[`DXQU${String(5100000 + i * 7)}`] = { sl: 'DWS' + String(9000000 + i * 13), op: 'DXQ' };
    ['254784', '254785', '254786'].forEach((x, i) => { recs[`DXQU${String(5200000 + i)}`] = { sl: x, op: 'DXQ' }; });
    const rows = Object.keys(recs).map((cn) => ({ cn, _mode: 'discharge' }));
    const raw = M.sealFormatAnomalies(recs).map((x) => x.seal), said = M.sealPredictOf(rows, recs).map((x) => x.seal);
    T(raw.includes('254784') && said.length === 0, '접두 다른 씰 «254784»(대표 DWS+7) — 주의 박스(종전 판정)는 올려도 미르는 «예상 실오류» 로 말하지 않는다', `${raw} ‖ ${said}`); }
  T(mp === 'MNBU3997353,MNBU4239975', 'MCAP 639N 정답지(«자릿수 부족실» MLPH+6 ↔ PH+7 · «컨넘버랑 동일한 실») — 미르도 그대로 말한다(고친 컨 빼고)', mp);
  T(!/2024400|4028694/.test(ta) && !/2024400|4028694/.test(ca), 'RZOR R106E «실번호 점검» — 두 앱 모두 EDI 와 같은 짧은 실을 예상 실오류로 안 말한다(콘앱은 행 slEdi 로 같은 판정)', `${ta} ‖ ${ca}`); }
for (const [nm, cx] of [['검수앱', tally()], ['콘앱', cone()]]) {
  const b = ask('브리핑', cx).a;
  T(/주의 3건 \(리퍼 102, 엑스레이 5, 예상 실오류 1건\)/.test(b) && /🔎 예상 실오류 1건 \(1077 「00240」\) — 같은 선사 실과 자릿수·모양이 다름/.test(b), `${nm} 브리핑 — 머리 주의와 «🔎 예상 실오류 1건 (1077 «00240»)» 줄`, b);
  const w = ask('작업 분석해줘', cx).a;
  T(/주의 — XRAY 실 달기 5대 · 리퍼 온도 체크 102대 · 예상 실오류 1건\(1077 「00240」 — 실물 확인\)/.test(w), `${nm} 작업 분석 — 주의 줄에 예상 실오류(검수사 «주의 할점은 … 등»)`, w);
}
{ const dropRf = (t) => t.split('\n').filter((l) => !/❄ 리퍼/.test(l)).join('\n');   // 리퍼 온도 줄은 콘앱 행에 온도 칸이 없어 원래부터 갈린다(라이브 4.39-01 도 같음)
  const tb = ask('브리핑', tally()).a, cb = ask('브리핑', cone()).a.replace(/^ATLANTIC PIONEER\n【양하】\n/, '');
  T(dropRf(tb) === dropRf(cb), '브리핑 — 검수앱·콘앱 실제 모양 ctx 같은 글(예상 실오류 줄 포함 · 리퍼 온도 줄과 콘앱 머리만 다름)', `${tb} ‖ ${cb}`); }

console.log('② «25번베이부터 해야 되는데 어떻게 바꾸지?» — 4.40 부터 미르가 옮긴다(«25번 베이로 옮겨 드릴까요?» [이동]·[취소] · 자세한 검사는 smoke_mir440 · 회귀 R44)');
for (const q of ['25번베이부터 해야 되는데 어떻게 바꾸지?', 'ATPR 25번베이부터 해야 되는데 어떻게 바꾸지?', '25번 베이부터 하려면 어떻게 해']) {
  const { a, tr, weak } = ask(q, tally());
  T(tr.via === 'guideGoto' && !weak && /^📍 ATPR 양하 25번 베이로 옮겨 드릴까요\?/.test(a), `«${q}» — 옮길까 묻는다(강)`, `${tr.via} | ${a}`);
}
for (const q of ['25번 베이 몇 대 남았어', '25번 베이부터 몇 대야', '25번 베이 리퍼 어떻게 해', '25번 베이 언제 끝나', '1077 25번 베이로 바꾸려면 어떻게 해', '2730 컨 25번 베이로 옮겨야 하는데 어떻게 해', '25번 베이로 옮기려면 어떻게 해', '25번 베이 먼저 할 때 해치커버 어떻게 열어', '25번 베이부터 해치 열어야 하는데 어떻게 해', '25번 베이 트윈 먼저 하려면 어떻게 해', '25번 베이부터 양하해야 하는데 콘은 어떻게', '25번 베이부터 하려면 몇 시간 걸려']) {   // 감사 C1
  const { tr, a } = ask(q, tally()); T(tr.via !== 'guideGoto' && !/옮겨 드릴까요/.test(a), `«${q}» — 장 바꾸기 답이 가로채지 않는다(자료·다른 질문)`, tr.via);
}
{ const { a } = ask('25번베이부터 해야 되는데 어떻게 바꾸지?', cone()); T(!/옮겨 드릴까요|자동 가이드에서 장을 바꿉니다/.test(a), '콘앱 — 자동 가이드가 없으니 장 바꾸기 답을 내지 않는다(종전 길)', a); }

console.log('③ 콘앱 «집에 몇 시에 (가|끝나)» = «몇 시에 끝나» · «그럼 몇 개 남았어» = «몇 개 남았어»');
for (const [nm, cx] of [['콘앱', cone()], ['검수앱', tally()]]) {
  const f = ask('몇 시에 끝나', cx).a;
  for (const q of ['집에 몇 시에 끝나', '집에 몇 시에가', '집에 몇 시에', '집에 언제 가', '몇 시에 집에 갈 수 있어']) {
    const { a, weak } = ask(q, cx); T(a === f && !weak, `${nm} «${q}» — «몇 시에 끝나» 와 같은 답(강)`, `${weak} | ${a} ‖ ${f}`);
  }
  const g = ask('몇 개 남았어', cx).a;
  for (const q of ['그럼 몇 개 남았어', '그러면 몇 개 남았어']) { const { a, weak } = ask(q, cx); T(a === g && !weak, `${nm} «${q}» — 군말 «그럼» 은 남는 낱말로 안 센다(강)`, `${weak} | ${a}`); }
  const h = ask('집에 가고 싶다', cx).a; T(!/끝나|남았|완료/.test(h) || h !== f, `${nm} «집에 가고 싶다» — 끝나는 시각 질문이 아니다`, h);
}
{ const a = ask('밀양 리퍼 몇 대', tally()), b = ask('미르야 리퍼 몇 대', tally());
  T(a.a === b.a && !a.weak, '«밀양 …» 은 «미르야 …» 를 음성이 잘못 받아 적은 것 — 같은 답(강)', `${a.a} ‖ ${b.a}`); }
T(M.parseNaturalQuery('밀양에서 온 컨').mirCalled === false, '«밀양에서» 처럼 띄어 쓰지 않은 말은 부름이 아니다');
T(fetchN === 0, '규칙 답만 — 네트워크 0번');

console.log(`\n${bad ? '✗' : '✔'} 미르 4.39-02 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
