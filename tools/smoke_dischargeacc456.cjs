// 4.56 연막검사 — 미르 «양하 정확도» 가 출발항별 퍼센트를 실데이터(DPRT 2612N·NSFR 2620N·OBWH 2777E·TNJP 26371E)로 말하는가
//   node tools/smoke_dischargeacc456.cjs <mirCore 번들> <저장소 루트>
process.env.TZ = 'Asia/Seoul';
const fs = require('fs'); const path = require('path');
const OUT = process.argv[2]; const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
const M = require(path.resolve(OUT));
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/dischargeacc456.json'), 'utf8'));
let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + String(detail).replace(/\n/g, ' ⏎ ').slice(0, 600) : ''}`); } };
const clone = (o) => JSON.parse(JSON.stringify(o));
console.log('미르 양하 정확도(4.56) — 출발항별 EDI 계획 대비 실제 양하 순서');
const ans = (k) => M.answerDischargeAccuracy(clone(FX[k]), k.split('_')[0] + ' ' + k.split('_')[1], null);
//  독립 셈 — 기대값은 앞서 같은 자료로 따로 잰 숫자(DPRT 163/187 · NSFR 143/155 · OBWH 261/263 · TNJP 101/101)
const D = ans('DPRT_2612N');
T(/PDA 입력 순서 기준/.test(D) && /전체 87\.2%/.test(D) && /187대 중 24대/.test(D) && /12개 열/.test(D), 'DPRT(PCTC) — PDA 기준·전체 87.2%·187대 중 24대·12개 열', D);
T(/VNSGN 81\.0% \(116대 중 22대 다름\)/.test(D) && /THLCH 93\.8% \(32대 중 2대 다름\)/.test(D) && /THBKK 100\.0%/.test(D), 'DPRT — 출발항별 VNSGN 81.0 · THLCH 93.8 · THBKK 100', D);
T(D.indexOf('VNSGN') < D.indexOf('THBKK'), 'DPRT — 정확도 낮은 항구가 먼저', D);
const Nn = ans('NSFR_2620N');
T(/전체 92\.3%/.test(Nn) && /VNHPH 82\.4% \(68대 중 12대 다름\)/.test(Nn) && /CNXMN 100\.0%/.test(Nn), 'NSFR(PCTC) — 전체 92.3 · VNHPH 82.4 · CNXMN 100', Nn);
const O = ans('OBWH_2777E');
T(/동방\) 시각 순서 기준 참고값/.test(O) && /전체 99\.2%/.test(O) && /차량 기사 순서/.test(O), 'OBWH(동방) — 참고값 문구·전체 99.2%', O);
const Tn = ans('TNJP_26371E');
T(/전체 100\.0%/.test(Tn) && /동방/.test(Tn), 'TNJP(부두 미상) — 동방 쪽 참고값·100%', Tn);
T(/같은 단 안의 바뀜은 시각으로 못 가려/.test(D) && /리퍼·특수화물/.test(D), '한계 문구(같은 단·리퍼 특수화물·기사 습성)가 붙는다');
//  자료 부족 — 완료가 거의 없으면 말하기 이르다
const few = clone(FX.DPRT_2612N); const ks = Object.keys(few.discharge.completed); for (const k of ks.slice(10)) delete few.discharge.completed[k];
const F = M.answerDischargeAccuracy(few, 'DPRT 2612N', null);
T(/말하기 이릅니다/.test(F) && !/전체 \d/.test(F), '비교 가능 20대 미만이면 «말하기 이릅니다»', F);
//  콘앱처럼 EDI 없이 계획 행(rows)만 와도 같은 답
const rows = Object.values(clone(FX.DPRT_2612N).discharge.ediContainers).map((e) => ({ ...e, _mode: 'discharge' }));
const coneV = { info: clone(FX.DPRT_2612N.info), discharge: { completed: clone(FX.DPRT_2612N.discharge.completed), records: {} } };
T(M.answerDischargeAccuracy(coneV, 'DPRT 2612N', rows) === M.answerDischargeAccuracy(clone(FX.DPRT_2612N), 'DPRT 2612N', null), '콘앱 모양(계획 행만) = 검수앱 모양 — 같은 답');
//  지난 추정이 records 에 남아 있어도 새로 센다(콘앱 recD 에 얹힌 추정)
const stale = clone(FX.DPRT_2612N); stale.discharge.records = { [Object.keys(stale.discharge.ediContainers)[0]]: { bay_actual: '99', row_actual: '01', tier_actual: '02', _pos_src: 'infer' } };
T(M.answerDischargeAccuracy(stale, 'DPRT 2612N', null) === M.answerDischargeAccuracy(clone(FX.DPRT_2612N), 'DPRT 2612N', null), '지난 추정(_pos_src infer)이 남아 있어도 같은 답');
//  감사(4.56) — 사람이 찍은 칸이 계획과 같아도 분모에 든다 · 선적/EDI 정확도 질문은 가로채지 않는다
{
  const h = clone(FX.DPRT_2612N); const base = M.answerDischargeAccuracy(clone(FX.DPRT_2612N), 'DPRT 2612N', null);
  const E = h.discharge.ediContainers; const some = Object.keys(h.discharge.completed).slice(0, 3);
  for (const cn of some) h.discharge.records[cn] = { bay_actual: String(E[cn].bay), row_actual: String(E[cn].row), tier_actual: String(E[cn].tier) };
  const A2 = M.answerDischargeAccuracy(h, 'DPRT 2612N', null);
  T(/전체 \d+\.\d%/.test(A2) && !/말하기 이릅니다/.test(A2), '사람이 찍은 칸(계획과 같음)이 있어도 정확도를 낸다', A2);
  const allSame = clone(FX.DPRT_2612N); for (const cn of Object.keys(allSame.discharge.completed)) { const e = allSame.discharge.ediContainers[cn]; allSame.discharge.records[cn] = { bay_actual: String(e.bay), row_actual: String(e.row), tier_actual: String(e.tier) }; }
  T(/전체 100\.0%/.test(M.answerDischargeAccuracy(allSame, 'DPRT 2612N', null)), '완료 전부를 사람이 계획대로 찍었으면 100%');
}
//  말을 알아듣는가 — 엔진 입구
const vk = 'DPRT_2612N'; const v = clone(FX[vk]);
const cs0 = M.flattenVoyages({ [vk]: v }).filter((c) => c.voyageKey === vk);
const ctx = (q) => ({ app: 'tally', voyageKey: vk, voyage: v, info: v.info, mode: 'discharge', containers: cs0, flat: cs0, voyages: { [vk]: v }, inspector: '연막', smallTalkLast: true, modeChoice: 'both', accepted: true, _now: Date.now() });
for (const q of ['DPRT 양하 정확도', '양하 정확도 알려줘', '포트별 정확도', '항구별 정확도 보여줘']) {
  M._mirThreadReset(); const tr = {}; const a = String(M.answerOneRaw(q, { ...ctx(q), _trace: tr }) || '');
  T(/양하 정확도/.test(a) && /VNSGN/.test(a) && !M.isWeakAnswer(q, a, tr), `«${q}» → 정확도 답(모델로 안 보냄)`, a.slice(0, 120));
}
for (const q of ['선적 정확도', '이 배 선적 신뢰도는?', 'EDI 정확도', '양하 정확도 높이는 법']) {
  M._mirThreadReset(); const tr = {}; M.answerOneRaw(q, { ...ctx(q), _trace: tr });
  T(tr.via !== 'dischargeAcc', `«${q}» 는 양하 정확도 답으로 가로채지 않는다`, tr.via);
}
M._mirThreadReset(); const a0 = String(M.answerOneRaw('양하 정확도', { app: 'tally', containers: [], flat: [], voyages: {}, mode: 'discharge', inspector: '연막', smallTalkLast: true, modeChoice: 'both', accepted: true, _now: Date.now() }) || '');
T(/어느 배/.test(a0), '배 없이 물으면 어느 배인지 되묻는다', a0);
console.log(bad ? `\n✗ 양하 정확도 연막검사 ${bad}/${n} 실패` : `\n✔ 양하 정확도 연막검사 ${n}/${n} 통과`);
process.exit(bad ? 1 : 0);
