// 3.70 연막검사 — RZOR 선적 덱플랜 빈자리 조회창: 리스트 없어도 덱플랜이 서고, 빈자리를 누르면 끝자리로 찾아 맞는 컨을 다 보여 주고, 고르면 그 자리에 선적(자리 + 완료)된다.
//   실소스(DeckPlanView·rzorDeckPredict·firebase.js)를 esbuild 로 묶고 Firebase SDK 만 메모리 스텁으로 갈아 jsdom 에서 실제로 누른다.
//   2차 감사(2026-09-30) 변이 시험에서 못 잡던 것 — 예측 컨이 후보로 남음 · 올린 덱플랜의 지정(📌) 컨 잠금 · 목록 밖 번호 Enter · 저장 실패 뒤 창 굳음 ·
//   조용한 실패 · 크레인 구역 빈자리가 두 칸 그림에 가려짐(2차 시뮬 결함 A) — 을 행동으로 잰다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'slotpick_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(TMP, 'sp.js');
const stub = './tools/stub_fbdb_mem.js';
execSync(`npx esbuild tools/smoke_rzorslotpick.jsx --bundle --loader:.jsx=jsx --loader:.json=json --loader:.png=dataurl --jsx=automatic --external:fs --external:path --external:url `
  + `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${OUT}"`, { cwd: ROOT, stdio: 'pipe' });

(async () => {
  const { JSDOM } = require(path.join(ROOT, 'node_modules', 'jsdom'));
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
  const W = dom.window;
  for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'localStorage', 'CustomEvent', 'Event']) global[k] = k === 'window' ? W : W[k];
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  W.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  W.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
  W.alert = (m) => { (global.__alerts = global.__alerts || []).push(String(m)); };
  global.alert = W.alert;   // 화면 코드는 전역 alert 를 부른다(브라우저와 같게)
  W.confirm = () => true;
  const errs = [];
  const _ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ')); };
  W.localStorage.setItem('gm_equip_no', '3');
  W.localStorage.setItem('master_active_inspector_v1', '검수원A');
  require(OUT);
  const F = W.__F;
  const conts = W.__conts;
  const reset = () => { global.__memdb = { voyages: { V1: { loading: { ediContainers: Object.fromEntries(F.containers.map((c) => [c.cn, { cn: c.cn, iso: c.iso, fe: c.fe, pol: 'KRPTK' }])) }, discharge: {} } } }; global.__alerts = []; global.__setfail = null; };
  reset();
  const LD = () => global.__memdb.voyages.V1.loading;
  const ASG = () => (LD().stowagePlan && LD().stowagePlan.assign) || {};
  const D = W.document;
  const setVal = (el, v) => { Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new W.Event('input', { bubbles: true })); };
  const click = (el) => el.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  const enter = () => input().dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const emptyBtns = () => [...D.querySelectorAll('button')].filter((b) => /빈자리/.test(b.textContent || '') && b.title);
  const emptyAt = (pos) => emptyBtns().find((b) => b.title === pos);
  const input = () => D.querySelector('input[placeholder^="컨번호 끝자리"]');
  const modal = () => D.querySelector('.fixed');
  const candBtns = () => [...D.querySelectorAll('button')].filter((b) => /^[A-Z]{4}\d{7}/.test((b.textContent || '').trim()));
  const cand = (cn) => candBtns().find((b) => b.textContent.startsWith(cn));
  const posKey = (pos) => pos.replace(/^([DCU])덱 (\d)줄 (\d+)칸$/, '$1-$2-$3');

  console.log('■ ① 선적 리스트가 없어도 덱플랜이 선다(검수사 «덱플랜은 항상 보여주는게 나을것 같습니다»)');
  W.__render({ containers: [] }); await wait(80);
  ok('리스트 0대 — 덱 칩·빈자리 격자가 그려진다(291 빈자리 템플릿)', W.__plan.total === 0 && emptyBtns().length > 50 && /D덱/.test(D.body.textContent), `빈자리 버튼 ${emptyBtns().length}`);
  click(emptyBtns()[0]); await wait(40);
  ok('빈자리를 누르면 조회창 — 자리 표기와 «선적 리스트가 아직 없습니다» 안내', !!input() && /📍 [DCU]덱 \d줄 \d+칸/.test(D.body.textContent) && /선적 리스트가 아직 없습니다/.test(D.body.textContent));
  click(modal()); await wait(30);
  ok('바깥을 누르면 창이 닫힌다(쓰기 없음)', !input() && !LD().stowagePlan);
  const vpSrc = fs.readFileSync(path.join(ROOT, 'src/pages/VoyagePage.jsx'), 'utf8');
  const genBody = vpSrc.slice(vpSrc.indexOf('const _rzorGen = useMemo'), vpSrc.indexOf('const _deckPlanEff'));
  //  null 을 돌리는 자리는 넷뿐이어야 한다 — 양하 · 올린 덱플랜 있음 · RZOR 아님 · 생성 예외(목록이 비었다고 null 을 돌리는 줄이 다시 생기면 잡는다, 한 줄·두 줄 꼴 모두)
  const nullLines = genBody.split('\n').map((l, i, a) => (/return null/.test(l) ? `${a[i - 1] || ''}\n${l}` : null)).filter(Boolean);
  const nullOk = (t) => /mode !== 'loading'|stowagePlan\.decks\.length|!_rz\)|catch \(e\)/.test(t.split('\n').pop()) && !/list/.test(t.split('\n').pop());
  ok('VoyagePage — _rzorGen 은 목록이 비어도 null 을 돌리지 않는다(null 은 양하·올린 플랜·RZOR 아님·예외 넷뿐)', genBody.length > 100 && nullLines.length === 4 && nullLines.every(nullOk) && !/list\.length|list\[0\]/.test(genBody), JSON.stringify(nullLines));

  console.log('■ ② 끝자리 조회 — 실데이터 R106W 191대, «9765» 두 대');
  W.__render(); await wait(80);
  const nEmpty = emptyBtns().length;
  click(emptyBtns()[3]); await wait(40);
  const slotTitle = (D.body.textContent.match(/📍 ([DCU]덱 \d줄 \d+칸)/) || [])[1] || '';
  setVal(input(), '9'); await wait(30);
  ok('한 자만 넣으면 후보를 안 띄우고 «두 자 이상» 안내', candBtns().length === 0 && /두 자 이상/.test(D.body.textContent));
  setVal(input(), '9765'); await wait(30);
  const c2 = candBtns().map((b) => b.textContent.slice(0, 11));
  ok('«9765» → 맞는 컨 두 대가 다 나온다(종전엔 «전체 번호로 입력하세요» 로 막힘)', c2.length === 2 && c2.includes('SPSU2019765') && c2.includes('LYGU4039765') && /맞는 컨 2대 — 하나를 고르세요/.test(D.body.textContent), JSON.stringify(c2));
  ok('후보 줄에 규격·F/E·무게·POD 가 보인다', candBtns().every((b) => /\d{2}피트/.test(b.textContent) && /\b[FE]\b/.test(b.textContent) && /\d+\.\dt/.test(b.textContent) && /CNRZH/.test(b.textContent)), candBtns().map((b) => b.textContent).join(' | '));
  const before2 = JSON.stringify(global.__memdb);
  enter(); await wait(60);
  ok('두 대가 맞을 때 Enter 는 아무것도 안 쓴다(골라야 한다)', JSON.stringify(global.__memdb) === before2 && !!input());
  setVal(input(), '97'); await wait(30);
  ok('끝자리로만 찾는다 — «97» 후보는 전부 97 로 끝난다(가운데 일치 아님)', candBtns().length > 0 && candBtns().every((b) => b.textContent.slice(0, 11).endsWith('97')), candBtns().map((b) => b.textContent.slice(0, 11)).join(','));
  setVal(input(), '0000000'); await wait(30);
  ok('맞는 컨이 없으면 «맞는 컨이 없습니다»', candBtns().length === 0 && /맞는 컨이 없습니다/.test(D.body.textContent));
  setVal(input(), 'ABCU1234567'); await wait(30);
  enter(); await wait(60);
  ok('목록 밖 전체 번호 + Enter — 아무것도 안 쓰고 «목록에 없는 번호» 로 알린다(3.67-01 감사 지적)', JSON.stringify(global.__memdb) === before2 && /이 항차 선적 목록에 없는 번호/.test(D.body.textContent) && !/초과 컨 등록/.test(D.body.textContent));
  setVal(input(), '9765'); await wait(30);
  click(cand('LYGU4039765')); await wait(150);
  const asgKey = Object.keys(ASG()).find((k) => ASG()[k].cn === 'LYGU4039765');
  ok('고르면 그 자리에 선적 — stowagePlan/assign 에 그 자리 · completed 에 검수원A·호기 3', !!asgKey && LD().completed && LD().completed.LYGU4039765 && LD().completed.LYGU4039765.by === '검수원A' && String(LD().completed.LYGU4039765.equip) === '3', `${asgKey} ${JSON.stringify(LD().completed && LD().completed.LYGU4039765)}`);
  ok('자리 키가 누른 칸의 자리와 같다(덱-줄-위치)', !!asgKey && posKey(slotTitle) === asgKey, `${slotTitle} vs ${asgKey}`);
  ok('고른 뒤 조회창이 닫힌다', !input());

  console.log('■ ③ 자리가 있는 컨은 잠가서 보인다 · 한 대만 고를 수 있으면 Enter · 조회만은 막고 알린다');
  W.__render({ assign: ASG(), compMap: LD().completed || {} }); await wait(80);
  click(emptyBtns()[5]); await wait(40);
  setVal(input(), '9765'); await wait(30);
  const lyg = cand('LYGU4039765');
  ok('이미 확정된 LYGU4039765 는 빠지지 않고 흐리게 «확정됨 — 옮기려면 그 칸을 눌러 해제» · 누를 수 없음 · SPSU2019765 가 먼저', candBtns().length === 2 && candBtns()[0].textContent.startsWith('SPSU2019765') && !!lyg && lyg.disabled && /확정됨 — 옮기려면 그 칸을 눌러 해제/.test(lyg.textContent) && /맞는 컨 2대/.test(D.body.textContent) && !/하나를 고르세요/.test(D.body.textContent), candBtns().map((b) => `${b.textContent}|${b.disabled}`).join(' ; '));
  const beforeL = JSON.stringify(ASG());
  click(lyg); await wait(60);
  ok('잠근 후보는 눌러도 아무것도 안 쓴다', JSON.stringify(ASG()) === beforeL);
  enter(); await wait(150);
  ok('고를 수 있는 것이 한 대(SPSU2019765)·잠근 것 한 대면 Enter 로 그 한 대가 실린다', !!(LD().completed && LD().completed.SPSU2019765) && Object.values(ASG()).some((v) => v.cn === 'SPSU2019765'), JSON.stringify(Object.values(ASG()).map((v) => v.cn)));
  W.__render({ assign: ASG(), compMap: LD().completed || {} }); await wait(80);
  click(emptyBtns()[6]); await wait(40);
  setVal(input(), '2323'); await wait(30);
  ok('«2323» → 한 대', candBtns().length === 1 && candBtns()[0].textContent.startsWith('BMOU9732323'));
  enter(); await wait(150);
  ok('Enter 한 번에 그 자리에 선적된다', !!(LD().completed && LD().completed.BMOU9732323 && LD().completed.BMOU9732323.by === '검수원A'));
  const ymd = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  W.localStorage.setItem('tallyone_me_today', JSON.stringify({ name: '검수원A', ymd }));
  W.localStorage.setItem('tallyone_work_choice', JSON.stringify({ name: '검수원A', ymd, mode: 'view', voyageKey: '', equip: '', at: Date.now() }));
  global.__alerts = [];
  W.__render({ assign: ASG(), compMap: LD().completed || {} }); await wait(80);
  const before3 = JSON.stringify(ASG());
  const vcn = conts[20].cn;
  click(emptyBtns()[7]); await wait(40);
  setVal(input(), vcn); await wait(30);
  if (cand(vcn)) click(cand(vcn)); await wait(150);
  ok('조회만이면 아무것도 안 쓰고 알린다(보기만) · 창은 굳지 않는다', !!cand(vcn) && JSON.stringify(ASG()) === before3 && !(LD().completed && LD().completed[vcn]) && ((global.__alerts || []).some((m) => /조회만/.test(m)) || /조회만/.test(D.body.textContent)) && !!input() && !input().disabled, `alerts ${JSON.stringify(global.__alerts)}`);
  W.localStorage.removeItem('tallyone_work_choice');
  click(modal()); await wait(30);
  ok('빈자리 수 — 그린 뒤 누른 칸만 줄었다', emptyBtns().length <= nEmpty);

  console.log('■ ④ 예측 컨도 후보다 — «예측 자리» 를 보여 주고, 고르면 누른 칸에 한 번만 선다');
  reset();
  const tw = Object.fromEntries(Object.entries(F.termWork).slice(0, 100));
  W.__render({ termWork: tw }); await wait(80);
  const predSlots = W.__plan.decks.flatMap((d) => d.slots).filter((s) => s.pred);
  const X = predSlots[5] && predSlots[5].cn; const Xpos = predSlots[5] && predSlots[5].pos;
  click(emptyBtns()[2]); await wait(40);
  const tapPos = (D.body.textContent.match(/📍 ([DCU]덱 \d줄 \d+칸)/) || [])[1] || '';
  setVal(input(), String(X).slice(-7)); await wait(30);
  const xb = cand(X);
  ok('예측 컨이 후보에 있고(누를 수 있고) «예측 자리 …» 가 보인다', predSlots.length > 50 && !!xb && !xb.disabled && xb.textContent.includes(`예측 자리 ${Xpos}`), xb && xb.textContent);
  ok('경고가 없을 때 줄 끝에 «·» 가 남지 않는다', !!xb && !/·\s*$/.test(xb.lastChild.textContent.trim()), xb && xb.lastChild.textContent);
  if (xb) click(xb); await wait(150);
  W.__render({ termWork: tw, assign: ASG(), compMap: LD().completed || {} }); await wait(80);
  const occ = W.__plan.decks.flatMap((d) => d.slots).filter((s) => s.cn === X);
  ok('고른 뒤 그 컨은 그림에 한 번만(누른 칸에 확정) — 예측 자리는 비었다', occ.length === 1 && occ[0].sure && occ[0].pos === tapPos && !!(LD().completed && LD().completed[X]), JSON.stringify(occ.map((s) => [s.pos, s.sure, s.pred])) + ' 누른 칸 ' + tapPos);

  console.log('■ ⑤ 크레인 구역 빈자리가 두 칸 그림에 가려지지 않는다(2차 시뮬 결함 A — R106W 재연 189걸음 중 41걸음 막힘)');
  reset();
  const c40 = conts.find((c) => /^4/.test(c.iso));
  W.__render({ assign: { 'D-3-10': { cn: c40.cn, by: 'x', at: 1 } } }); await wait(80);
  const dTpl = W.__plan.decks.find((x) => x.deck === 'D').slots.length;   // D덱 칸 수(컨 1 + 빈자리) — 화면은 고른 덱(D)만 그린다
  ok('40피트를 D덱 3줄 10칸에 확정해도 옆 «D덱 3줄 11칸» 빈자리 단추가 있다 · D덱 빈자리 = D덱 템플릿 − 1', !!emptyAt('D덱 3줄 11칸') && dTpl === 162 && emptyBtns().length === dTpl - 1, `D덱 칸 ${dTpl} · 빈자리 ${emptyBtns().length}`);
  //  크레인 줄 연속 실기 — D덱 3줄 9→14칸을 차례로 빈자리 탭으로 싣는다(40피트 여섯 대)
  reset();
  const forty = conts.filter((c) => /^4/.test(c.iso)).slice(0, 6);
  let got = 0;
  for (let i = 0; i < 6; i += 1) {
    W.__render({ assign: ASG(), compMap: LD().completed || {} }); await wait(60);
    const b = emptyAt(`D덱 3줄 ${9 + i}칸`);
    if (!b) break;
    click(b); await wait(30);
    setVal(input(), forty[i].cn); await wait(30);
    enter(); await wait(120);
    if (ASG()[`D-3-${9 + i}`] && ASG()[`D-3-${9 + i}`].cn === forty[i].cn) got += 1;
  }
  ok('크레인 줄 D덱 3줄 9→14칸 여섯 대를 빈자리 탭으로 차례로 싣는다(종전 1/6)', got === 6, `${got}/6`);
  //  두 칸 자리(D덱 1줄 5칸, 칸수 2)의 40피트 옆 D덱 1줄 6칸(20피트 자리)은 검수사 양식처럼 X 칸 — 빈자리로 세지 않고, 누르면 X 칸이라고 알리고 고를 수 있다
  reset();
  const c20 = conts.find((c) => /^2/.test(c.iso));
  W.__render({ assign: { 'D-1-5': { cn: c40.cn, by: 'x', at: 1 } } }); await wait(80);
  const xBtn = [...D.querySelectorAll('button')].find((b) => /^D덱 1줄 6칸 · 옆 D덱 1줄 5칸 40피트의 X 칸$/.test(b.title || ''));
  const w40 = W.__plan.decks.find((x) => x.deck === 'D').slots.find((x) => x.key === 'D-1-5');
  ok('두 칸 자리 40피트 옆 템플릿 자리는 X 칸 — 40피트는 한 칸 + X 칸 · «빈자리» 수에 안 든다', !!xBtn && /^X/.test(xBtn.textContent.trim()) && w40 && w40.span === 1 && emptyBtns().length === dTpl - 2 && new RegExp(`빈자리 ${dTpl - 2}`).test(D.body.textContent), `X ${!!xBtn} span ${w40 && w40.span} 빈자리 ${emptyBtns().length}`);
  if (xBtn) click(xBtn); await wait(40);
  ok('X 칸을 누르면 조회창이 «X 칸입니다 — 따로 실었을 때만» 이라고 알린다', !!input() && /옆 D덱 1줄 5칸 40피트가 덮는 X 칸입니다/.test(modal().textContent));
  if (input()) { setVal(input(), c20.cn); await wait(30); enter(); await wait(150); }
  W.__render({ assign: ASG(), compMap: LD().completed || {} }); await wait(80);
  const s6 = W.__plan.decks.find((x) => x.deck === 'D').slots.find((x) => x.key === 'D-1-6');
  ok('X 칸에 20피트를 실으면 그 칸에 서고 X 는 사라진다(실물 2% — 40피트 옆 20피트)', ASG()['D-1-6'] && ASG()['D-1-6'].cn === c20.cn && s6 && s6.cn === c20.cn && !W.__plan.decks.flatMap((x) => x.slots).some((x) => x.xcell && x.key === 'D-1-6'), JSON.stringify(ASG()));

  console.log('■ ⑥ 올린 덱플랜 갈래 — 빈자리에서 고르면 자리 지정만 · 칸에 든 컨·지정(📌) 컨은 잠금');
  reset();
  const up = (() => {
    const slots = [];
    for (let i = 0; i < 10; i += 1) slots.push({ ri: 0, ci: i, span: 1, empty: true, cn: '', key: `D-1-${i + 1}`, pos: `D덱 1줄 ${i + 1}칸`, line: 1, col: i + 1 });
    slots.push({ ri: 1, ci: 0, span: 1, empty: false, cn: conts[0].cn, iso: '40 HC', fe: 'F', pos: 'D덱 2줄 1칸', line: 2, col: 1, flags: [] });
    return { voy: 'R106W', decks: [{ deck: 'D', cols: 26, rows: 2, slots, lines: 2, colsN: 26, numbering: 'bow', lolo: 0 }], assign: { 'D-1-1': { cn: conts[1].cn, by: 'x', at: 1 } }, _fmt: 'checker' };
  })();
  W.__render({ uploadedPlan: up }); await wait(80);
  const Y = conts[1].cn; const Z = conts[0].cn;
  click(emptyAt('D덱 1줄 3칸')); await wait(40);
  setVal(input(), Y.slice(-7)); await wait(30);
  ok('지정(📌)된 컨은 잠금 — «D덱 1줄 1칸에 지정됨»', !!cand(Y) && cand(Y).disabled && /D덱 1줄 1칸에 지정됨/.test(cand(Y).textContent), cand(Y) && cand(Y).textContent);
  setVal(input(), Z.slice(-7)); await wait(30);
  ok('칸에 든 컨은 잠금 — «덱플랜 D덱 2줄 1칸에 있음»', !!cand(Z) && cand(Z).disabled && /덱플랜 D덱 2줄 1칸에 있음/.test(cand(Z).textContent), cand(Z) && cand(Z).textContent);
  setVal(input(), conts[5].cn.slice(-7)); await wait(30);
  click(cand(conts[5].cn)); await wait(150);
  ok('고르면 자리 지정은 남고 완료는 없다', ASG()['D-1-3'] && ASG()['D-1-3'].cn === conts[5].cn && !LD().completed, JSON.stringify(ASG()));

  console.log('■ ⑦ 저장이 실패하면 말한다 — 창 안에 «저장 실패», 창은 다시 쓸 수 있다 · 닫은 뒤 실패면 알림');
  reset();
  global.__setfail = (p) => /stowagePlan\/assign/.test(p);
  W.__render({ uploadedPlan: up }); await wait(80);
  click(emptyAt('D덱 1줄 4칸')); await wait(40);
  setVal(input(), conts[6].cn.slice(-7)); await wait(30);
  click(candBtns()[0]); await wait(120);
  ok('올린 덱플랜 — 저장 실패가 창 안에 · 입력·후보 단추가 다시 켜진다', /저장 실패/.test(modal().textContent) && !!input() && !input().disabled && candBtns().every((b) => !b.disabled), modal() && modal().textContent.slice(0, 160));
  click(modal()); await wait(30);
  W.__render(); await wait(80);
  click(emptyBtns()[3]); await wait(40);
  setVal(input(), conts[7].cn.slice(-7)); await wait(30);
  click(candBtns()[0]); await wait(120);
  ok('자동 덱플랜 — 저장 실패가 창 안에 · 완료 기록 없음 · 창 안 굳음', /저장 실패/.test(modal().textContent) && !input().disabled && !LD().completed, modal() && modal().textContent.slice(0, 160));
  global.__setfail = (p) => /\/completed\//.test(p);   // 자리는 써지고 완료 기록만 실패
  setVal(input(), conts[9].cn.slice(-7)); await wait(30);
  click(candBtns()[0]); await wait(150);
  ok('완료 기록만 실패하면 «자리는 확정됐고 완료 기록만 실패» 로 반쪽 상태를 말한다', /자리는 확정됐고 완료 기록만 실패했습니다/.test(modal().textContent) && Object.values(ASG()).some((v) => v.cn === conts[9].cn), modal() && modal().textContent.slice(0, 200));
  global.__setfail = (p) => /stowagePlan\/assign/.test(p);
  global.__alerts = [];
  setVal(input(), conts[8].cn.slice(-7)); await wait(30);
  click(candBtns()[0]); click(modal());   // 누르자마자 창을 닫는다(저장 중)
  await wait(120);
  ok('저장 중에 창을 닫았는데 실패하면 알림으로 알린다(조용히 사라지지 않는다)', !input() && (global.__alerts || []).some((m) => /저장 실패/.test(m)), JSON.stringify(global.__alerts));
  global.__setfail = null;

  console.log('■ ⑧ 양하 덱플랜에서도 같은 창 — 문구가 «양하»');
  reset();
  W.__render({ containers: [], uploadedPlan: up, mode: 'discharge' }); await wait(60);
  click(emptyAt('D덱 1줄 5칸')); await wait(40);
  ok('양하 목록 0 — «양하 리스트가 아직 없습니다»', /양하 리스트가 아직 없습니다/.test(modal().textContent) && !/선적 리스트/.test(modal().textContent), modal().textContent.slice(0, 120));
  click(modal()); await wait(30);

  console.error = _ce;
  ok('콘솔 오류 없음(일부러 낸 저장 실패 기록은 뺀다)', errs.filter((e) => !/not wrapped in act|Warning:|\[3\.70\] 빈자리 선택 실패/i.test(e)).length === 0, errs.slice(0, 2).join(' | '));
  console.log(`RZOR 빈자리 조회창 연막검사: ${n - bad}/${n} 통과`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ }
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✘ 연막검사 예외', e); process.exit(1); });
