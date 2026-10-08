// 시프팅 근거 표시(상태 딱지 · 근거 한 줄 · 컨별 대조)가 실데이터로 맞게 나오는지 재는 연막검사 (TallyOne 4.13).
//
//  왜 있는가 — 검수사 2026-10-09 03:00 «시프팅건은 근거를 앱에 제시 하여야 한다는것입니다. 메일이 존재한다는것.» ·
//    03:02 «확정이 안되어 있는 상태에서 시프팅 5건이라고 기록을 했으면 위치도 보여줘야 합니다. 그리고 미확정이라고 표기 한후 터미널이 확정을 하면 확정된 대로 표기를 수정해야 합니다» ·
//    03:04 «터미널도 확정을 했네요».
//  기준(검수사 말에서 뽑은 것, 코드가 내는 값이 아니다) —
//    ① 터미널이 작업을 시작해 배정표 이적(모브÷2)이 시프팅 대수와 같으면 «확정», 아직이면 «미확정», 다르면 «불일치»
//    ② 미확정이어도 위치(양하·선적 자리)를 보인다 ③ 메일이 있다는 근거(받은 시각·파일명) ④ 터미널이 확정하면 같은 화면이 저절로 «확정» 으로 바뀐다
//  자료 — tools/fixtures/shiftevid_mcap639n.json (MCAP 639N 실항차 사본: 선사 서류 5대 + 양하/선적 BAPLIE 전문 · 터미널 working · 배정표 이적 10모브).
//    메일 시각 = MAILBOX\MCAP\641S\_수집기록.txt «2026-10-08 17:05  ←  RESTOW LIST 1Excel_.xlsx» (KST).
//    HASU4806161 은 서류가 도착한 02-04-88 이 선적 EDI(18-12-88)와 다르다 — 실제 어긋남이라 ⚠ 로 보여야 한다.
const path = require('path'); const fs = require('fs');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_shiftevid.cjs <렌더번들.js>'); process.exit(1); }
process.env.TZ = 'Asia/Seoul';
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
global.localStorage = dom.window.localStorage; global.CustomEvent = dom.window.CustomEvent;
global.MouseEvent = dom.window.MouseEvent; global.Event = dom.window.Event;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = clearTimeout;
dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(String(e.error || e.message)));

console.log('시프팅 근거 표시 (MCAP 639N 실자료)');
require(path.resolve(B));
const { U, FX, FX2, answerOneRaw } = dom.window.__SE;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clone = (o) => JSON.parse(JSON.stringify(o));
const FIVE = ['FFAU7193985', 'HASU4648092', 'HASU4806161', 'TCNU6220604', 'TRHU8324617'];
const KEY = 'MCAP_639N';
const mk = (over, { mail = true, noLoad = false } = {}) => {
  const rl = clone(FX.restowList); if (mail) rl._meta.mailAt = FX.mailAtMs;
  const v = { info: { ...FX.info, ...over }, restowList: rl, discharge: FX.discharge, loading: noLoad ? undefined : FX.loading };
  if (noLoad) delete v.loading;
  return v;
};
const evOf = (v) => U.shiftEvidenceOf(KEY, v, U.shiftingMapForDisplay(KEY, v));

(async () => {
  // ① 픽스처가 실자료 그대로인가
  const cns = Object.keys(FX.restowList).filter((k) => !k.startsWith('_')).sort();
  ok(JSON.stringify(cns) === JSON.stringify(FIVE) && FX.restowList._meta.total === 5, `선사 서류 5대 · TOTAL 5 (${FX.restowList._meta.file})`);
  ok(FX.info.berthShift === 10 && FX.info.terminalStatus === 'working' && FX.mailAtMs === Date.UTC(2026, 9, 8, 8, 5), '배정표 이적 10모브(=5대) · 터미널 working · 메일 10-08 17:05(KST)');

  // ② 순수 판정 — 상태 세 가지
  const e1 = evOf(mk({}));
  ok(e1.status === '확정' && e1.label === '확정' && e1.kind === 'carrier' && e1.count === 5, `터미널 working · 이적 10모브 = 5대 → «${e1.label}» (서류 정본 ${e1.count}대)`);
  ok(/메일 10-08 17:05\(RESTOW LIST 1Excel_\.xlsx\) 5대/.test(e1.line), `근거 — 메일 받은 시각·파일명·대수 (${e1.line.slice(0, 70)})`);
  ok(/양하 EDI 자리 5\/5 일치/.test(e1.line) && /선적 EDI 자리 4\/5 일치 ⚠1/.test(e1.line), '근거 — 양하 자리 5/5 · 선적 자리 4/5 일치 ⚠1');
  ok(/배정표 이적 10모브=5대$/.test(e1.line), '근거 — 배정표 이적 10모브=5대');
  const e2 = evOf(mk({ terminalStatus: 'planned' }));
  ok(e2.label === '미확정' && /배정표 이적 10모브\(작업 시작 후 확정\)/.test(e2.line) && !/=5대/.test(e2.line), `터미널 작업 전(planned) → «${e2.label}» · 이적은 «작업 시작 후 확정»`);
  const e3 = evOf(mk({ berthShift: 8 }));
  ok(e3.label === '불일치' && /배정표 이적 8모브=4대 ≠ 5대/.test(e3.line), `이적 8모브(=4대) ≠ 서류 5대 → «${e3.label}»`);
  const e4 = evOf(mk({ berthShift: null }));
  ok(e4.label === '미확정' && /배정표 이적 아직 없음/.test(e4.line), `배정표 이적이 아직 없으면 «${e4.label}» · «아직 없음»`);
  const e5 = evOf(mk({}, { mail: false }));
  ok(!/메일/.test(e5.line) && /수집 10-08 19:40\(RESTOW LIST 1Excel_\.xlsx\)/.test(e5.line), `메일 시각을 못 읽었으면 «수집» 시각으로 대신 말한다 — 메일이라 지어내지 않는다 (${e5.line.slice(0, 50)})`);
  const e6 = evOf(mk({}, { noLoad: true }));
  ok(/선적 EDI 아직 없음/.test(e6.line) && e6.dep.usable === false, '선적 EDI 가 없으면 «아직 없음» (일치 대수를 지어내지 않는다)');

  // ③ 컨별 대조 — 5대 모두 서류 도착 자리 = 양하 EDI, 선적은 HASU4806161 만 다르다(EDI 18-12-88)
  ok(FIVE.every((cn) => e1.per[cn] && e1.per[cn].arv === true), '컨별 — 5대 모두 서류 도착 자리 = 양하 EDI 자리 ✓');
  ok(FIVE.filter((cn) => cn !== 'HASU4806161').every((cn) => e1.per[cn].dep === true) && e1.per.HASU4806161.dep === false && e1.per.HASU4806161.depPos === '0181288',
     '컨별 — 선적 자리는 4대 ✓ · HASU4806161 만 ⚠ (선적 EDI 18-12-88)');

  // ④ 같은 항차 객체에서 터미널이 확정하면 값이 바뀐다(캐시가 옛 값을 붙들지 않는다)
  const vf = mk({ terminalStatus: 'planned' });
  const a = U.shiftEvidenceOf(KEY, vf, U.shiftingMapForDisplay(KEY, vf));
  vf.info = { ...vf.info, terminalStatus: 'working' };
  const b = U.shiftEvidenceOf(KEY, vf, U.shiftingMapForDisplay(KEY, vf));
  ok(a.label === '미확정' && b.label === '확정', `터미널 planned → working 로 바뀌면 «${a.label}» → «${b.label}»`);

  // ④-2 감사 보강 — 양하 쪽 어긋남도 잡는다(종전 픽스처는 양하 5대가 전부 일치라 «항상 일치» 로 깨뜨려도 통과했다)
  {
    const dBad = clone(U.ediMapFromRaw(FX.discharge)); const lOk = U.ediMapFromRaw(FX.loading);
    const tgt = 'TCNU6220604'; const was = dBad[tgt]; dBad[tgt] = { ...was, bay: String(Number(was.bay) + 2).padStart(was.bay.length || 3, '0') };
    const evBad = U.shiftEvidenceCore({ shiftingMap: U.restowMapFromDoc(mk({}).restowList), dMap: dBad, lMap: lOk, berthShift: 10, terminalStatus: 'working' });
    ok(evBad.per[tgt].arv === false && evBad.arv.bad === 1 && /양하 EDI 자리 4\/5 일치 ⚠1/.test(evBad.line), `양하 EDI 자리가 서류와 다르면 ⚠ — ${tgt} 도착 ${evBad.per[tgt].arvPos} (${(evBad.line.match(/양하 EDI 자리[^·]*/) || [''])[0].trim()})`);
    const evNoD = U.shiftEvidenceCore({ shiftingMap: U.restowMapFromDoc(mk({}).restowList), dMap: null, lMap: lOk, berthShift: 10, terminalStatus: 'working' });
    ok(/양하 EDI 아직 없음/.test(evNoD.line) && evNoD.arv.usable === false, '양하 EDI 가 없으면 «아직 없음» (일치 대수를 지어내지 않는다)');
  }
  {
    const e0 = U.shiftEvidenceCore({ shiftingMap: { _meta: { source: 'carrier', file: 'x.xlsx', total: 0 } }, berthShift: 10, terminalStatus: 'working' });
    ok(e0.count === 0 && e0.label === '불일치' && /≠ 0대/.test(e0.line), `서류 0대인데 배정표 이적이 10모브면 «${e0.label}» 라고 말한다 — 라벨이 비어 근거 줄과 모순되지 않는다`);
    const e00 = U.shiftEvidenceCore({ shiftingMap: {}, berthShift: 10, terminalStatus: 'working' });
    ok(e00.label === '' && e00.line === '', '서류도 예측도 없으면(시프팅 0) 라벨·근거 모두 비어 있다 — 없는 줄을 만들지 않는다');
  }
  {
    // 같은 항차 객체에서 메일 시각만 뒤늦게 붙어도 근거 한 줄이 새로 나온다(캐시 지문에 mailAt 이 있다)
    const vm = mk({}, { mail: false });
    const m1 = U.shiftEvidenceOf(KEY, vm, U.shiftingMapForDisplay(KEY, vm));
    vm.restowList = clone(vm.restowList); vm.restowList._meta.mailAt = FX.mailAtMs;
    const m2 = U.shiftEvidenceOf(KEY, vm, U.shiftingMapForDisplay(KEY, vm));
    ok(/수집 10-08/.test(m1.line) && /메일 10-08 17:05/.test(m2.line), '메일 시각이 나중에 붙으면 «수집» 에서 «메일» 로 바뀐다(캐시가 옛 줄을 붙들지 않는다)');
  }

  // ⑤ 화면 — 실제 ListTab
  const doc = dom.window.document;
  await wait(400);   // 첫 렌더가 끝나 __setShift 가 연결될 때까지
  const head = () => [...doc.querySelectorAll('#lt button')].find((x) => /쉬프팅\(재적부\)/.test(x.textContent));
  const show = (v) => {
    const map = U.shiftingMapForDisplay(KEY, v), ev = U.shiftEvidenceOf(KEY, v, map);
    const info = { meta: map._meta || null, berthShift: v.info.berthShift ?? null, lane: '', loadEdiPending: false, truthChk: U.shiftingTruthCheck(v, ev.count), hatchSolve: null, restowExtra: [], evid: ev };
    dom.window.__setShift(U.shiftingListOf(map, {}, v), info);
  };
  show(mk({ terminalStatus: 'planned' })); await wait(120);
  let h = head();
  ok(!!h && /쉬프팅\(재적부\) 5/.test(h.textContent), `머리 «${h && h.textContent.replace(/\s+/g, ' ').slice(0, 60)}»`);
  ok(!!doc.querySelector('#lt [data-shift-status="미확정"]'), '머리에 «미확정» 딱지');
  const evRow = doc.querySelector('#lt [data-shift-evid]');
  ok(!!evRow && /미확정/.test(evRow.textContent) && /메일 10-08 17:05/.test(evRow.textContent) && /RESTOW LIST 1Excel_\.xlsx/.test(evRow.textContent) && /작업 시작 후 확정/.test(evRow.textContent),
     `근거 한 줄에 메일 받은 시각·파일명·«작업 시작 후 확정» (${evRow && evRow.textContent.slice(0, 60)})`);
  ok(doc.querySelectorAll('#lt [data-shift-cn]').length === 5, '미확정이고 5대(10대 이하)라 목록이 처음부터 펼쳐져 위치가 보인다');
  const col = (r, c) => (r.querySelector(`[data-col="${c}"]`) || {}).textContent || '';
  const rF = doc.querySelector('#lt [data-shift-cn="FFAU7193985"]');
  ok(col(rF, 'from') === '06-11-84' && col(rF, 'to') === '34-08-88', `FFAU7193985 위치 — 양하 ${col(rF, 'from')} · 선적 ${col(rF, 'to')} (서류 0061184 → 0340888)`);
  ok(!!rF.querySelector('[data-mark="arv"]') && /✓/.test(rF.querySelector('[data-mark="arv"]').textContent) && !!rF.querySelector('[data-mark="dep"]') && /✓/.test(rF.querySelector('[data-mark="dep"]').textContent), 'FFAU7193985 — 양하·선적 모두 ✓');
  const rH = doc.querySelector('#lt [data-shift-cn="HASU4806161"]');
  const mH = rH.querySelector('[data-mark="dep"]');
  ok(!!mH && /⚠/.test(mH.textContent) && /18-12-88/.test(mH.textContent) && col(rH, 'to') === '02-04-88', `HASU4806161 — 서류 선적 ${col(rH, 'to')} · «${mH && mH.textContent}»`);

  // 터미널이 확정하면 같은 화면이 «확정» 으로 바뀐다
  show(mk({ terminalStatus: 'working' })); await wait(120);
  ok(!!doc.querySelector('#lt [data-shift-status="확정"]') && !doc.querySelector('#lt [data-shift-status="미확정"]'), '터미널 working → 딱지가 «확정» 으로 바뀐다');
  ok(/배정표 이적 10모브=5대/.test(doc.querySelector('#lt [data-shift-evid]').textContent) && !/작업 시작 후 확정/.test(doc.querySelector('#lt [data-shift-evid]').textContent), '근거 한 줄도 «배정표 이적 10모브=5대» 로 바뀐다');
  ok(doc.querySelectorAll('#lt [data-shift-cn]').length === 0, '확정이면 목록은 접혀 있다(2.92 — 눌러서 연다)');
  // 11대 이상은 미확정이어도 접어 둔다(2.92 — 큰 목록을 강제로 펼치지 않는다) — 사용자가 아직 안 눌렀을 때의 처음 모습
  const map20 = U.restowMapFromDoc(FX2.MCSN_637N.restowList);
  const n20 = Object.keys(map20).length;
  const ev20 = U.shiftEvidenceCore({ shiftingMap: map20, berthShift: 40, terminalStatus: 'planned' });
  dom.window.__setShift(U.shiftingListOf(map20, {}, { restowList: FX2.MCSN_637N.restowList, loading: {} }), { meta: map20._meta || null, berthShift: 40, lane: '', loadEdiPending: false, truthChk: null, hatchSolve: null, restowExtra: [], evid: ev20 });
  await wait(120);
  ok(n20 >= 11 && ev20.label === '미확정' && doc.querySelectorAll('#lt [data-shift-cn]').length === 0 && !!doc.querySelector('#lt [data-shift-status="미확정"]'), `${n20}대 미확정 — 딱지는 보이고 목록은 접혀 있다`);

  show(mk({ terminalStatus: 'working' })); await wait(120);
  head().dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await wait(80);
  ok(doc.querySelectorAll('#lt [data-shift-cn]').length === 5, '눌러서 열면 5대');
  // 불일치
  show(mk({ berthShift: 8 })); await wait(120);
  ok(!!doc.querySelector('#lt [data-shift-status="불일치"]') && /≠ 5대/.test(doc.querySelector('#lt [data-shift-evid]').textContent), '배정표 8모브면 «불일치» · «≠ 5대»');
  // 사용자가 한 번 연 뒤에는 상태가 바뀌어도 그 뜻을 따른다
  ok(doc.querySelectorAll('#lt [data-shift-cn]').length === 5, '사용자가 연 목록은 상태가 바뀌어도 열려 있다');
  // 감사 보강 — 접은 뜻도 따른다: 불일치(자동이면 펼침)에서 사용자가 접고 → 미확정(자동이면 펼침)으로 바뀌어도 접힌 채다
  head().dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await wait(80);
  ok(doc.querySelectorAll('#lt [data-shift-cn]').length === 0, '사용자가 접으면 접힌다');
  show(mk({ terminalStatus: 'planned' })); await wait(120);
  ok(!!doc.querySelector('#lt [data-shift-status="미확정"]') && doc.querySelectorAll('#lt [data-shift-cn]').length === 0, '사용자가 접은 목록은 미확정(자동이면 펼침)으로 바뀌어도 접힌 채다 — 사용자의 뜻이 이긴다');
  head().dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await wait(80);
  ok(doc.querySelectorAll('#lt [data-shift-cn]').length === 5, '다시 누르면 열린다');

  // ⑥ 배선 — 같은 판정 한 벌을 모든 길이 부른다
  const R = (f) => fs.readFileSync(path.join(process.cwd(), f), 'utf8');
  ok(/shiftEvidenceOf\(voyageKey, voyage, shiftingMap\)/.test(R('src/pages/VoyagePage.jsx')) && /shiftStatus=\{shiftEvid\.label\}/.test(R('src/pages/VoyagePage.jsx')), '항차 화면이 shiftEvidenceOf 를 부르고 카고플랜 머리에 상태를 넘긴다');
  ok(/shiftEvidenceOf\(voyageKey, voyage, shiftingMap\)/.test(R('src/components/PrintHubModal.jsx')) && /shiftStatus=\{shiftEvid\.label\}/.test(R('src/components/PrintHubModal.jsx')), '출력허브도 같은 판정으로 카고플랜 머리에 상태를 넘긴다');
  ok(/shiftStatus && \(/.test(R('src/components/PrintableCargoPlanV2.jsx')), '카고플랜 머리가 상태를 그린다');
  ok(/ConeParse = \{[^}]*shiftEvidenceCore/.test(R('src/coneCargoPlan.entry.jsx')) && /ctShiftEvid\(_v\)/.test(R('public/cone.html')) && /shiftEvid: ctShiftEvid\(/.test(R('public/cone.html')), '콘앱이 번들 shiftEvidenceCore 로 카고플랜 머리·미르 답에 같은 상태를 낸다');
  ok(/근거 — \$\{_ev\.line\}/.test(R('src/nlSearch.js')) && /c\.shiftEvid = shiftEvidenceOf/.test(R('src/mir.js')), '미르의 시프팅 답에 상태와 근거가 붙는다(검수앱 mir.js · 콘앱 ctx)');
  ok(/shiftEvidenceOf\(voyage\.key, voyage, _shiftMap, \{ light: true \}\)/.test(R('src/pages/HomePage.jsx')), '항차 목록 카드도 같은 판정(light)으로 상태를 낸다');
  ok(/4\.13~ \*\*시프팅 N대에는 근거와 상태가 붙는다/.test(R('src/data/helpData.js')), '매뉴얼에 4.13 설명이 있다');

  // ⑦ 미르 답 — 실소스(mir.answerOneRaw → nlSearch.formatShifting). 검수앱 경로(ctx 에서 근거를 만든다)와 콘앱 경로(콘앱이 만든 근거를 싣는다)
  const cons = Object.values(U.ediMapFromRaw(FX.discharge)).map((c) => ({ ...c, _mode: 'discharge' }));
  const mctx = (v, extra) => ({ app: 'tally', voyageKey: KEY, voyage: v, info: v.info, containers: cons, mode: 'discharge', modeChoice: 'both', ...(extra || {}) });
  const q1 = answerOneRaw('시프팅 몇 대', mctx(mk({ terminalStatus: 'planned' })));
  ok(/시프팅 5대 \[미확정\]/.test(q1) && /근거 — 선사 RESTOW LIST 메일 10-08 17:05\(RESTOW LIST 1Excel_\.xlsx\) 5대/.test(q1) && /아직 확정이 아닙니다/.test(q1) && !/로테이션 미확인/.test(q1), '미르 «시프팅 몇 대» (작업 전) — 미확정 + 메일 근거 + «아직 확정이 아닙니다»');
  ok(!/배정목록 표기로는/.test(q1) && /대수를 이적\(모브\)으로 환산하면 10/.test(q1), '미르 — 미확정이면 «배정목록 표기로는 10» 이라 말하지 않는다(배정표가 아직 0모브인 근거 줄과 부딪친다) — «환산하면 10»');
  const q2 = answerOneRaw('시프팅 몇 대', mctx(mk({ terminalStatus: 'working' })));
  ok(/배정목록 표기로는 10/.test(q2), '미르 — 확정이면 «배정목록 표기로는 10» 이라 말한다');
  ok(/시프팅 5대 \[확정\]/.test(q2) && /배정표 이적 10모브=5대/.test(q2) && !/아직 확정이 아닙니다/.test(q2), '미르 — 터미널이 작업을 시작하면 «확정» 으로 답이 바뀐다');
  ok(/6161 {2}10-03-88 → 2-04-88/.test(q1) && /3985 {2}6-11-84 → 34-08-88/.test(q1), '미르 — 미확정이어도 위치(양하 → 선적)를 불러 준다');
  const dM = U.ediMapFromRaw(FX.discharge), lM = U.ediMapFromRaw(FX.loading);
  const evCone = U.shiftEvidenceCore({ shiftingMap: U.restowMapFromDoc(mk({}).restowList), dMap: dM, lMap: lM, berthShift: 10, terminalStatus: 'working' });
  const vCone = { info: mk({}).info, restowList: mk({}).restowList };
  const q3 = answerOneRaw('시프팅 몇 대', { app: 'cone', voyageKey: KEY, voyage: vCone, info: vCone.info, containers: cons, mode: 'discharge', shiftEvid: evCone });
  ok(/시프팅 5대 \[확정\]/.test(q3) && /양하 EDI 자리 5\/5 일치/.test(q3) && /선적 EDI 자리 4\/5 일치 ⚠1/.test(q3), '콘앱 경로 — 콘앱이 싣은 근거(번들 core)를 그대로 말한다');
  // ⑧ 콘앱 — cone.html 의 실제 함수(ctShiftInfoNow · ctApplyShiftInfo · ctFreshShiftInfo · ctShiftEvid)를 꺼내 돌린다(정규식 존재 검사가 아니다)
  {
    const html = R('public/cone.html');
    const a = html.indexOf('function ctBerthNum('), z = html.indexOf('function ctShiftMap(');
    ok(a > 0 && z > a, '콘앱 소스에서 시프팅 근거 함수 묶음을 찾았다');
    const mkRows = (m) => Object.entries(m).map(([cn, c]) => ({ ...c, cn }));
    let server = { berthShift: 10, terminalStatus: 'planned' }; let failField = null; const paths = [];
    const fbFetch = async (p) => { paths.push(p); const f = (p.match(/\/info\/([A-Za-z]+)\.json/) || [])[1]; if (!f || f === failField) return { ok: false, json: async () => null }; return { ok: true, json: async () => (server[f] === undefined ? null : server[f]) }; };
    const state = { voyageKey: KEY, voyages: [{ key: KEY, berthShift: 10, terminalStatus: 'planned' }, { key: 'OTHR_001S', berthShift: null, terminalStatus: 'planned' }], disch: { ediRows: mkRows(dM) }, stow: { ediRows: mkRows(lM) }, restowList: clone(mk({}).restowList) };
    const winStub = { ConeParse: { shiftEvidenceCore: U.shiftEvidenceCore, restowMapFromDoc: U.restowMapFromDoc } };
    const ctShiftMap = () => U.restowMapFromDoc(state.restowList);
    const F = new Function('state', 'window', 'ctShiftMap', '_applySwapFix2', 'fbFetch', 'console', html.slice(a, z) + '\n;return { ctShiftEvid, ctApplyShiftInfo, ctFreshShiftInfo, ctShiftInfoNow, ctBerthNum, ctDocShiftOn };')(state, winStub, ctShiftMap, (d, l) => [d, l], fbFetch, console);
    const ent = () => state.voyages[0], other = () => state.voyages[1];
    let c1 = F.ctShiftEvid(ent());
    ok(c1 && c1.label === '미확정' && /양하 EDI 자리 5\/5 일치/.test(c1.line) && /선적 EDI 자리 4\/5 일치 ⚠1/.test(c1.line), `콘앱 ctShiftEvid — 터미널 planned → «${c1 && c1.label}» · 양하 5/5 · 선적 4/5 ⚠1`);
    // 터미널이 확정했는데 콘앱 목록은 아침 값 그대로 — 새로 읽으면 확정으로 바뀐다(목록 항목은 건드리지 않는다)
    server = { berthShift: 10, terminalStatus: 'working' };
    ok(F.ctShiftEvid(ent()).label === '미확정', '(전제) 새로 읽기 전에는 목록의 옛 값 그대로 «미확정»');
    const chg = await F.ctFreshShiftInfo();
    ok(chg === true && state._shiftFresh.terminalStatus === 'working' && F.ctShiftEvid(ent()).label === '확정', `콘앱 — 터미널이 확정하면 카고플랜을 열 때 새로 읽어 «${F.ctShiftEvid(ent()).label}» 로 바뀐다`);
    ok(ent().terminalStatus === 'planned' && ent().berthShift === 10 && other().terminalStatus === 'planned', '목록 항목(state.voyages)은 덮지 않는다 — 선택 때 굳은 시프팅 합치기·작업창·출항 줄과 어긋나지 않는다');
    ok(paths.length === 2 && paths.every((p) => p.startsWith('voyages/' + KEY + '/info/')), `새로 읽기는 이 항차 info 의 두 칸만 읽는다 (${paths.join(' , ')})`);
    ok((await F.ctFreshShiftInfo()) === false, '바뀐 게 없으면 false');
    ok(F.ctShiftEvid(other()).label === '미확정' && F.ctShiftInfoNow(other()).terminalStatus === 'planned', '다른 항차 항목은 새로 읽은 값을 받지 않는다(키가 다르다)');
    server = { berthShift: 8, terminalStatus: 'working' };
    await F.ctFreshShiftInfo();
    ok(F.ctShiftEvid(ent()).label === '불일치', `배정표가 8모브로 나오면 콘앱도 «${F.ctShiftEvid(ent()).label}»`);
    // 감사 보강 — 양하·선적 두 쪽이 동시에 열려도 새로 읽기는 한 번이고 두 쪽이 같은 결과를 받는다(서로 다른 상태를 말하지 않는다)
    paths.length = 0; server = { berthShift: 8, terminalStatus: 'working' };
    const pA = F.ctFreshShiftInfo(), pB = F.ctFreshShiftInfo();
    ok(pA === pB, '동시에 부른 두 호출은 같은 진행 중 읽기를 쓴다');
    await Promise.all([pA, pB]);
    ok(paths.length === 2, `동시 두 호출의 요청은 2건뿐이다(4건이 아니다) — ${paths.length}건`);
    await F.ctFreshShiftInfo();
    ok(paths.length === 4, '끝난 뒤의 호출은 다시 읽는다(진행 중 칸이 비워진다)');
    // 읽기 실패는 낡은 값을 지키고 지어내지 않는다
    server = { berthShift: 10, terminalStatus: 'planned' }; failField = 'terminalStatus';
    ok((await F.ctFreshShiftInfo()) === false && state._shiftFresh.berthShift === 8 && state._shiftFresh.terminalStatus === 'working', '한 칸이라도 못 읽으면 가진 값을 그대로 둔다(반쪽 갱신 없음)');
    failField = null;
    // 미르 질문 경로 — 이미 읽은 info 를 읽은 키·시각과 함께 적용한다
    ok(F.ctApplyShiftInfo({}, KEY, Date.now()) === false && state._shiftFresh.berthShift === 8, '빈 info 는 가진 값을 지우지 않는다');
    ok(F.ctApplyShiftInfo({ vsl: 'MCAP', berthShift: 10, terminalStatus: 'working' }, KEY, Date.now() + 1) === true && F.ctShiftEvid(ent()).label === '확정', '미르 질문 경로 — 읽은 info 를 적용하면 «확정»');
    const atNow = state._shiftFresh.at;
    ok(F.ctApplyShiftInfo({ vsl: 'MCAP', berthShift: 10, terminalStatus: 'working' }, KEY, atNow + 1) === false, '같은 값이면 false');
    // 감사 보강 — 항차 경쟁: 앞 항차가 읽던 값이 뒤늦게 와도 지금 항차(KEY)가 아니면 쓰지 않는다
    ok(F.ctApplyShiftInfo({ vsl: 'OTHR', berthShift: null, terminalStatus: 'planned' }, 'OTHR_001S', atNow + 5) === false && state._shiftFresh.key === KEY && state._shiftFresh.terminalStatus === 'working', '항차 경쟁 — 지금 항차가 아닌 키의 값은 버린다');
    // 감사 보강 — 낡은 값: 미르의 30초 캐시 info(예전 시각)가 방금 읽은 값을 되돌리지 못한다
    ok(F.ctApplyShiftInfo({ vsl: 'MCAP', berthShift: null, terminalStatus: 'planned' }, KEY, atNow - 20000) === false && state._shiftFresh.terminalStatus === 'working' && F.ctShiftEvid(ent()).label === '확정', '낡은 info(읽은 시각이 더 이전)는 방금 읽은 값을 되돌리지 못한다 — 카고플랜 머리와 미르 답이 같은 상태를 말한다');
    // 감사 보강 — 한 노드를 두 규칙으로 읽지 않는다: 배정표 이적 읽는 법은 한 벌(빈 문자열·공백은 자료 없음)
    ok(F.ctBerthNum('') === null && F.ctBerthNum(' ') === null && F.ctBerthNum(null) === null && F.ctBerthNum(undefined) === null && F.ctBerthNum(0) === 0 && F.ctBerthNum('0') === 0 && F.ctBerthNum('10') === 10 && F.ctBerthNum(10) === 10, 'ctBerthNum — 빈 문자열·공백·null → 자료 없음 · 0 은 0 · 문자열 숫자는 숫자');
    ok(/berthShift: ctBerthNum\(info\.berthShift\)/.test(html), '항차 목록 변환도 같은 ctBerthNum 을 쓴다(목록 경로와 새로 읽은 경로가 갈리지 않는다)');
    // 감사 보강 — 항목이 없어도(목록이 비었어도) 현재 항차 키로 새로 읽은 값을 쓴다
    ok(F.ctShiftInfoNow({}).terminalStatus === 'working' && F.ctShiftInfoNow(undefined).terminalStatus === 'working', '항차 항목이 없어도(목록 읽기 실패) 현재 항차의 새로 읽은 값을 쓴다');
    // 감사 보강 — 빈 문자열 이적은 자료 없음(검수앱 규칙과 같다)
    ok(F.ctApplyShiftInfo({ vsl: 'MCAP', berthShift: '', terminalStatus: 'working' }, KEY, atNow + 10) === true && state._shiftFresh.berthShift === null && F.ctShiftEvid(ent()).label === '미확정', '배정표 이적이 빈 문자열이면 «자료 없음» → 미확정(0모브로 읽지 않는다)');
    // 양하 EDI 가 아직 없으면 «0/5 일치» 가 아니라 «아직 없음» (검수앱과 같은 말)
    state.disch = { ediRows: [] };
    ok(/양하 EDI 아직 없음/.test(F.ctShiftEvid(ent()).line) && !/0\/5/.test(F.ctShiftEvid(ent()).line.split('·')[1] || ''), '콘앱 — 양하 EDI 가 없으면 «양하 EDI 아직 없음»');
    // 감사 보강 — 서류 없는 배는 개수가 이적에서 나오고 다른 화면(합치기·콘 계산 카드)은 목록 값을 쓴다 → 새로 읽은 값을 쓰지 않아 개수가 갈리지 않는다
    {
      const keepDoc = state.restowList; state.restowList = null;
      ok(F.ctDocShiftOn() === false && F.ctShiftInfoNow(ent()).terminalStatus === 'planned' && F.ctShiftInfoNow(ent()).berthShift === 10, '서류 없는 배 — 새로 읽은 값이 있어도 목록 값(planned · 10)을 쓴다');
      state.restowList = keepDoc;
      ok(F.ctDocShiftOn() === true && F.ctShiftInfoNow(ent()).terminalStatus === 'working', '서류가 정본인 배 — 새로 읽은 값(working)을 쓴다');
    }
    // 번들이 옛 판이면 상태를 지어내지 않는다
    winStub.ConeParse = {};
    ok(F.ctShiftEvid(ent()) === null, '번들에 shiftEvidenceCore 가 없으면 null — 상태를 적지 않는다');
    // 배선 — 두 길이 실제로 이 함수들을 부른다(이 줄을 지우면 확정이 콘앱에 닿지 않는다)
    const cargoFn = html.slice(html.indexOf('async function cargoPlanPropsV2('), html.indexOf('async function cargoPlanPropsV2(') + 9000);
    ok(/_freshP = Promise\.race\(\[ctFreshShiftInfo\(\)/.test(cargoFn) && /await _freshP/.test(cargoFn) && /ctShiftInfoNow\(_v\)/.test(cargoFn) && /ctShiftEvid\(_v\)/.test(cargoFn), '배선 — 카고플랜을 열 때 새로 읽고(3초 상한·다른 읽기와 나란히) 그 값으로 개수·머리 상태를 센다');
    ok(/ctApplyShiftInfo\(info, mc && mc\._ctxKey, mc && mc\._ctxFrom\)/.test(html) && (html.match(/_ctxKey:k, _ctxFrom:_ctxFrom/g) || []).length === 2, '배선 — 미르 질문이 읽은 info 를 읽은 키·읽기 시작 시각과 함께 적용한다');
    ok(/ctApplyShiftInfo\(CT\.tb, key, _ctT0\)/.test(html), '배선 — 30초 루프가 읽는 항차 info 로도 새로 한다(추가 요청 없음)');
    ok(/state\.voyages=_vs; state\.pilotForecast=_pf; state\._shiftFresh=null;/.test(html), '배선 — 목록을 새로 받으면 따로 읽어 둔 값을 비운다(목록이 더 새것)');
  }
  ok(errs.length === 0, '렌더 중 오류 0' + (errs[0] ? ' — ' + errs[0] : ''));
  console.log(`\n통과 ${pass} / 실패 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
