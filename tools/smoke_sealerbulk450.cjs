// X-RAY 탭 «① 내 몫 → ② 파트너 몫» 일괄 등록(4.50)을 실 항차 DXQD 2642E 12대로 재는 연막검사.
//   확인 — 남은 컨 계산 · 한 번에 등록(번호 있고 봉인자 없는 컨만) · 내 몫 0대 확인 · 내 이름 거절 · 한 대 실패해도 나머지 유지 · 마지막 봉인자는 실제 양하확인자.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const vc = new VirtualConsole();
vc.on('error', (...a) => { const m = a.map(String).join(' '); if (/useEffect must not return anything|not wrapped in act/.test(m)) return; console.error(...a); });   // 스텁의 async 구독이 일으키는 알려진 경고만 거른다
vc.on('jsdomError', (e) => console.error(e && e.message || e));
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc });
const w = dom.window;
w.alert = () => {};
try { w.eval(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) { console.log('✗ 번들 실행 오류 ' + e.message); process.exit(1); }

let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const xrayMap = w.__fx;
const cns = Object.keys(xrayMap).sort();
const T1 = 1000, T2 = 2000, T3 = 3000;
let xraySeals = {}, compMap = {};
const typed = (cn) => 'C' + xrayMap[cn].seal;   // 입력값 대용 — 선사 SEAL 에 C 를 붙인다
const reset = () => { xraySeals = {}; compMap = {}; cns.forEach((cn) => { xraySeals[cn] = { seal: typed(cn), eseal: '', sealer: '', sealerAt: 0 }; }); w.__calls.length = 0; w.__failSeal = []; try { w.localStorage.clear(); } catch (e) { /* jsdom */ } };
const props = () => ({ voyage: { info: { vsl: 'DXQD', voy_d: '2642E', callsign: 'DXQD' } }, voyageKey: 'DXQD_2642E', mode: 'discharge',
  containers: [], xrayMap, xraySeals, compMap, portMisData: {}, inspector: '김성일' });
const render = async (over) => { w.__render({ ...props(), ...(over || {}) }); await wait(120); };
const doc = () => w.document;
const text = () => doc().body.textContent || '';
const card = () => doc().querySelector('[data-testid="xray-sealer-card"]');
const btn = () => doc().querySelector('[data-testid="xray-rest-btn"]');
const nameInput = () => card().querySelector('input[aria-label="파트너 이름"]');
const setName = async (v) => {
  const set = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set;
  set.call(nameInput(), v); nameInput().dispatchEvent(new w.Event('input', { bubbles: true })); await wait(80);
};
const screenRows = () => [...doc().querySelectorAll('tbody tr')].filter((tr) => !tr.closest('.xr-print'));
const calls = () => w.__calls.filter((c) => c.fn === 'xseal');
const apply = (cs) => cs.forEach((c) => { xraySeals[c.cn] = { ...xraySeals[c.cn], sealer: c.opt.sealer, sealerAt: T2 }; });

(async () => {
  console.log('X-RAY 봉인자 두 단계 등록(4.50) — 실 항차 DXQD 2642E ' + cns.length + '대');
  ok(cns.length === 12, '픽스처는 실 항차 X-RAY 목록 12대다');

  //  ① 처음 — 번호는 전부 입력됐고 봉인자는 아무도 없다.
  reset(); await render();
  ok(!!card(), 'X-RAY 탭 맨 위에 두 단계 카드가 있다');
  ok(/① 내 몫 — 김성일/.test(card().textContent) && /0대 등록/.test(card().textContent), '① 내 몫 — 로그인 이름과 «0대 등록»');
  ok(/② 파트너 몫/.test(card().textContent) && /같이 작업하는 분/.test(card().textContent) && /남은 12대/.test(card().textContent), '② 파트너 몫 — «같이 작업하는 분» · «남은 12대»');
  ok(btn().disabled && /파트너 이름 먼저/.test(btn().textContent), '파트너 이름을 넣기 전에는 단추가 잠겨 있고 이유를 말한다');

  //  ② 내 몫 4대 체크 → 남은 8대
  cns.slice(0, 4).forEach((cn) => { xraySeals[cn] = { ...xraySeals[cn], sealer: '김성일', sealerAt: T1 }; });
  await render();
  ok(/4대 등록/.test(card().textContent) && /남은 8대/.test(card().textContent), '내 몫 4대를 체크하면 «4대 등록 · 남은 8대»');

  //  ③ 파트너 이름 → 단추 문구 → 한 번 누름
  await setName('홍길동');
  ok(!btn().disabled && btn().textContent.trim() === '남은 8대를 홍길동 몫으로 등록', '이름을 넣으면 «남은 8대를 홍길동 몫으로 등록» 단추가 켜진다');
  btn().click(); await wait(250);
  const c1 = calls();
  const rest8 = cns.slice(4);
  ok(c1.length === 8, `fbSetXraySeal 이 남은 8대에만 8번 불린다 (${c1.length}번)`);
  ok(c1.every((c) => c.opt && c.opt.sealer === '홍길동' && c.by === '김성일' && c.vk === 'DXQD_2642E'), '모든 호출이 {sealer:홍길동} · 저장자 김성일 · 이 항차');
  ok(rest8.every((cn) => c1.some((c) => c.cn === cn)) && cns.slice(0, 4).every((cn) => !c1.some((c) => c.cn === cn)), '남은 8대만 저장하고 내 몫 4대는 건드리지 않는다');
  ok(c1.every((c) => c.seal === typed(c.cn).toUpperCase()), '입력돼 있던 부착 세관봉인번호를 그대로(대문자) 다시 저장한다 — 번호가 사라지지 않는다');
  ok(/8대를 홍길동 몫으로 등록했습니다/.test(card().textContent), '끝나면 «8대를 홍길동 몫으로 등록했습니다» 를 보인다');
  ok(w.localStorage.getItem('tally_partner_name') === '홍길동', '파트너 이름은 이 기기에 기억된다(카고플랜 질문 창과 같은 값)');
  apply(c1); await render();
  ok(/봉인\s*12\/12\s*완료/.test(text()), '반영 뒤 머리에 «봉인 12/12 완료»');
  const by = {}; cns.forEach((cn) => { const s = w.__sealerOf(xraySeals[cn], compMap[cn], {}); by[s] = (by[s] || 0) + 1; });
  ok(by['김성일'] === 4 && by['홍길동'] === 8, `봉인자 김성일 4대 · 홍길동 8대 (${JSON.stringify(by)})`);

  //  ④ 마지막 봉인자는 실제 양하확인자(검수사 2026-10-26 06:10)
  const pc = cns[5];
  compMap[pc] = { by: '김성일', at: T3 };
  ok(w.__sealerOf(xraySeals[pc], compMap[pc], {}) === '김성일', '파트너 몫으로 미리 등록한 컨을 내가 양하확인하면 내 이름이 마지막 봉인자다');
  compMap[pc] = { by: '홍길동', at: T3 };
  ok(w.__sealerOf(xraySeals[pc], compMap[pc], {}) === '홍길동', '파트너 본인이 양하확인하면 그 이름 그대로다');

  //  ⑤ 내 몫이 0대 — 한 번 더 묻는다
  reset(); await render(); await setName('홍길동');
  btn().click(); await wait(120);
  ok(!!doc().querySelector('[data-testid="xray-rest-ask"]') && calls().length === 0, '내 몫 0대에서 누르면 확인 상자가 뜨고 아직 저장하지 않는다');
  const askBtns = [...doc().querySelectorAll('[data-testid="xray-rest-ask"] button')];
  askBtns.find((b) => /취소/.test(b.textContent)).click(); await wait(80);
  ok(!doc().querySelector('[data-testid="xray-rest-ask"]') && calls().length === 0, '취소하면 확인 상자가 닫히고 저장하지 않는다');
  btn().click(); await wait(100);
  [...doc().querySelectorAll('[data-testid="xray-rest-ask"] button')].find((b) => /그래도 등록/.test(b.textContent)).click(); await wait(300);
  ok(calls().length === 12, `«그래도 등록» 을 누르면 12대 전부 저장한다 (${calls().length}대)`);

  //  ⑥ 내 이름과 같은 이름은 거절
  reset(); await render();
  cns.slice(0, 2).forEach((cn) => { xraySeals[cn] = { ...xraySeals[cn], sealer: '김성일', sealerAt: T1 }; }); await render();
  await setName('김성일'); btn().click(); await wait(120);
  ok(calls().length === 0 && /내 이름과 같습니다/.test(card().textContent), '파트너 이름이 내 이름과 같으면 저장하지 않고 이유를 말한다');

  //  ⑦ 번호가 없는 컨 · 이미 봉인자가 있는 컨은 대상이 아니다
  reset();
  const noNum = cns.slice(0, 3); noNum.forEach((cn) => { xraySeals[cn] = { seal: '', eseal: '', sealer: '', sealerAt: 0 }; });
  const done = cns[3]; compMap[done] = { by: '박철민', at: T1 };   // 양하확인한 사람이 봉인자로 나가는 컨
  await render(); await setName('홍길동');
  ok(/남은 8대/.test(card().textContent) && /봉인번호가 아직 없는 3대/.test(card().textContent), '번호 없는 3대는 남은 컨에서 빠지고 «봉인번호가 아직 없는 3대» 로 알린다');
  btn().click(); await wait(100);
  [...doc().querySelectorAll('[data-testid="xray-rest-ask"] button')].find((b) => /그래도 등록/.test(b.textContent)).click(); await wait(300);
  const c7 = calls();
  ok(c7.length === 8 && !c7.some((c) => noNum.includes(c.cn)) && !c7.some((c) => c.cn === done), '번호 없는 컨과 양하확인자가 이미 봉인자인 컨에는 저장하지 않는다');

  //  ⑧ 한 대가 실패해도 나머지는 남고 실패한 컨번호를 말한다
  reset(); await render();
  cns.slice(0, 4).forEach((cn) => { xraySeals[cn] = { ...xraySeals[cn], sealer: '김성일', sealerAt: T1 }; });
  w.__failSeal = [cns[6]]; await render(); await setName('홍길동');
  btn().click(); await wait(300);
  ok(calls().length === 8, `한 대가 실패해도 나머지까지 8대를 모두 시도한다 (${calls().length}번)`);
  ok(/7대를 홍길동 몫으로 등록했습니다/.test(card().textContent) && /1대는 저장하지 못했습니다/.test(card().textContent) && card().textContent.includes(cns[6].slice(-4)), '결과 문구가 «7대 등록 · 1대 저장 못함 · 실패 컨 끝4자리» 를 말한다');

  //  ⑨ 줄별 «짝 이름» 단추는 그대로 있다(한 대만 짝으로 할 때)
  reset(); await render(); await setName('홍길동');
  const rowBtns = screenRows().flatMap((tr) => [...tr.querySelectorAll('button')]).filter((b) => b.textContent.trim() === '홍길동');
  ok(rowBtns.length === 12, `줄별 «홍길동» 단추가 봉인자 미등록 12줄에 그대로 있다 (${rowBtns.length}개)`);

  //  ⑩ 확인 상자가 떠 있는 동안 같은 단추를 또 눌러도 상자를 건너뛰지 못한다(독립 감사 «중» — 더블탭으로 내 컨까지 전부 파트너 몫이 됐다)
  reset(); await render(); await setName('홍길동');
  btn().click(); await wait(100);
  ok(!!doc().querySelector('[data-testid="xray-rest-ask"]') && btn().disabled, '확인 상자가 뜨면 큰 단추는 잠긴다');
  btn().click(); await wait(150);
  ok(calls().length === 0 && !!doc().querySelector('[data-testid="xray-rest-ask"]'), '같은 단추를 또 눌러도 확인 상자를 건너뛰어 저장하지 않는다');
  [...doc().querySelectorAll('[data-testid="xray-rest-ask"] button')].find((b) => /취소/.test(b.textContent)).click(); await wait(80);   // 다음 시험을 위해 상자를 닫는다

  //  ⑪ 저장하는 도중 다른 기기가 바꾼 값은 덮어쓰지 않는다 — 컨마다 그때의 최신 줄을 다시 본다(독립 감사 «중»)
  reset(); await render();
  cns.slice(0, 2).forEach((cn) => { xraySeals[cn] = { ...xraySeals[cn], sealer: '김성일', sealerAt: T1 }; }); await render(); await setName('홍길동');
  let lockSeen = null, hitSealed = '', hitNum = '';
  w.__onXseal = async (cn, n) => {
    if (n === 2) {
      lockSeen = [...doc().querySelectorAll('tbody input[type="checkbox"]')].every((c) => c.disabled);   // 진행 중에는 표 체크칸이 잠긴다
      const left = cns.slice(2).filter((c) => !calls().some((x) => x.cn === c));
      hitSealed = left[1]; hitNum = left[3];
      xraySeals[hitSealed] = { ...xraySeals[hitSealed], sealer: '홍길동(현장)', sealerAt: T2 };            // 다른 기기가 먼저 봉인자를 등록
      xraySeals[hitNum] = { ...xraySeals[hitNum], seal: 'CDWSCHANGED99' };                                  // 다른 기기가 봉인번호를 고침
      await render();
    }
  };
  btn().click(); await wait(400);
  w.__onXseal = null;
  const c11 = calls();
  ok(lockSeen === true, '일괄이 도는 동안 표의 체크칸이 잠긴다');
  ok(c11.length === 8 && !c11.some((c) => c.cn === hitSealed || c.cn === hitNum), `저장 도중 봉인자가 생겼거나 번호가 바뀐 컨 둘은 쓰지 않는다 (${c11.length}번)`);
  ok(/8대를 홍길동 몫으로 등록했습니다/.test(card().textContent) && /2대는 그 사이 봉인자나 번호가 바뀌어 건너뛰었습니다/.test(card().textContent)
     && card().textContent.includes(hitSealed.slice(-4)) && card().textContent.includes(hitNum.slice(-4)), '결과 문구가 «건너뛴 2대와 끝 4자리» 를 말한다');
  ok(c11.every((c) => c.seal === typed(c.cn).toUpperCase()), '쓴 컨은 모두 최신 줄의 번호로 쓴다');

  //  ⑫ 조회만 로그인 — 단추가 잠기고 이유를 말한다(저장이 막히는데 «다시 눌러 주십시오» 라고 하지 않는다)
  reset(); await render();
  cns.slice(0, 2).forEach((cn) => { xraySeals[cn] = { ...xraySeals[cn], sealer: '김성일', sealerAt: T1 }; });
  const ymd = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  w.localStorage.setItem('tallyone_me_today', JSON.stringify({ name: '김성일', ymd }));
  w.localStorage.setItem('tallyone_work_choice', JSON.stringify({ name: '김성일', ymd, mode: 'view', voyageKey: '', equip: '', at: Date.now() }));
  await render(); await setName('홍길동');
  ok(btn().disabled && /조회만/.test(btn().title) && !!doc().querySelector('[data-testid="xray-rest-viewonly"]'), '조회만으로 들어오면 단추가 잠기고 이유를 말한다');
  btn().click(); await wait(100);
  ok(calls().length === 0, '조회만에서는 저장을 시도하지 않는다');
  w.localStorage.clear();

  //  ⑬ 표에서 방금 입력한 칸이 저장 중이면 일괄을 시작하지 않는다(옛 번호로 되돌리지 않게)
  reset(); await render();
  cns.slice(0, 2).forEach((cn) => { xraySeals[cn] = { ...xraySeals[cn], sealer: '김성일', sealerAt: T1 }; }); await render(); await setName('홍길동');
  w.__onXseal = async () => { await wait(300); };
  const sealBtn = screenRows()[0].querySelectorAll('td')[6].querySelector('button');
  sealBtn.click(); await wait(80);
  const inp = screenRows()[0].querySelectorAll('td')[6].querySelector('input');
  const nset = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set;
  nset.call(inp, 'newval77'); inp.dispatchEvent(new w.Event('input', { bubbles: true })); await wait(60);
  inp.dispatchEvent(new w.FocusEvent('focusout', { bubbles: true })); await wait(60);   // 단추를 누르면 입력 칸이 먼저 빠져나가며 저장된다
  btn().click(); await wait(100);
  ok(/저장 중인 칸이 있습니다/.test(card().textContent), '저장 중인 칸이 있으면 «저장 중인 칸이 있습니다» 라고 하고 시작하지 않는다');
  await wait(500);
  w.__onXseal = null;
  ok(calls().length === 1 && calls()[0].seal === 'NEWVAL77', `그 사이 일괄은 한 대도 쓰지 않았다 — 표에서 입력한 한 건뿐 (${calls().length}번)`);

  //  ⑭ 저장 응답이 안 오면(오프라인 등) 그 컨은 실패로 두고 다음으로 간다 — 표를 끝없이 잠가 두지 않는다(독립 재감사 «하»). 15초 상한을 시험에서는 150ms 로 줄여 잰다.
  reset(); await render();
  cns.slice(0, 2).forEach((cn) => { xraySeals[cn] = { ...xraySeals[cn], sealer: '김성일', sealerAt: T1 }; }); await render(); await setName('홍길동');
  const realST = w.setTimeout.bind(w);
  w.setTimeout = (fn, ms, ...a) => realST(fn, ms === 15000 ? 150 : ms, ...a);
  w.__onXseal = async (cn, n) => { if (n === 2) await new Promise(() => {}); };   // 둘째 컨은 응답이 영영 안 온다
  btn().click(); await wait(700);
  w.__onXseal = null; w.setTimeout = realST;
  ok(calls().length === 10 && /9대를 홍길동 몫으로 등록했습니다/.test(card().textContent) && /1대는 저장하지 못했습니다/.test(card().textContent), `응답이 안 온 한 대는 실패로 알리고 나머지는 계속한다 (${calls().length}번 · ${card().textContent.slice(-60)})`);
  ok(!btn().disabled, '끝난 뒤 단추가 다시 열린다');

  //  ⑮ 탭을 옮겨 화면이 사라지면 일괄을 멈춘다 — 얼어붙은 줄로 계속 쓰면 그 사이 바뀐 값을 덮는다(독립 재감사 «하»)
  reset(); await render();
  cns.slice(0, 2).forEach((cn) => { xraySeals[cn] = { ...xraySeals[cn], sealer: '김성일', sealerAt: T1 }; }); await render(); await setName('홍길동');
  w.__onXseal = async (cn, n) => { if (n === 2) { w.__unmount(); await wait(30); } };
  btn().click(); await wait(400);
  w.__onXseal = null;
  ok(calls().length === 2, `화면이 사라지면 더 쓰지 않는다 (${calls().length}번)`);
  w.__unmount();

  //  ⑯ 선적 모드에서는 «양하 화면에서만» 이라고 말한다(조회만 문구가 아니다)
  reset(); await render({ mode: 'loading' }); await setName('홍길동');
  ok(btn().disabled && /양하 화면에서만/.test(btn().title) && !doc().querySelector('[data-testid="xray-rest-viewonly"]'), '선적 모드의 단추 설명은 «양하 화면에서만 등록할 수 있습니다»');

  console.log(fail ? `\n✗ 실패 ${fail}건` : '\n✓ X-RAY 봉인자 두 단계 등록 연막검사 통과');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('✗ 시험 중 오류 ' + (e && e.stack || e)); process.exit(1); });
