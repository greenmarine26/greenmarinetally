// 끝4자리 중복(3.2-01) — jsdom 으로 SearchPanel 을 실제로 그리고 «0320» 을 쳐 본다. 실패하면 빌드를 세운다.
//   ① 평택 FFAU4440320 만 완료 카드([양하확인]) ② 부산 SEGU2520320 은 «통과 KRPUS 3-01-04» 조회 카드 ③ [양하확인] 누르면 FFAU 만 완료 호출
//   ④ FFAU 완료 뒤 다시 0320 → SEGU 가 완료 카드로 승격되지 않는다(«양하확인» 버튼 0) ⑤ 대조군: 안 겹치는 끝4는 종전대로 큰 카드
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
dom.window.alert = (m) => { (dom.window.__alerts = dom.window.__alerts || []).push(String(m)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); }
catch (e) { errs.push('THROW: ' + e.message); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const FX = require('./fixtures/dup4_nsdc.json');

(async () => {
  await wait(700);
  const doc = dom.window.document;
  const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('✗ 렌더 중 오류 ' + uniq.length + '건'); uniq.slice(0, 3).forEach(e => console.log('   ' + e)); process.exit(1); }
  //  실제 검수원 순서 — 수동 → B10 → 데크 (FFAU4440320 은 10-03-86 데크). 그 뒤에 검색칸이 나온다.
  const clickBy = (re) => { const b = [...doc.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim())); if (!b) return false; b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); return true; };
  if (!clickBy(/^B10/)) fail('B10 베이 버튼이 없다: ' + (doc.body.textContent || '').slice(0, 160));
  await wait(300);
  if (!clickBy(/^🔵 데크/)) fail('데크 단 버튼이 없다');
  await wait(400);
  const input = [...doc.querySelectorAll('input')].find(i => /4777/.test(i.placeholder || ''));
  if (!input) fail('검색 입력칸이 없다: ' + (doc.body.textContent || '').slice(0, 120));
  const setVal = dom.window.Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
  const type = async (v) => { setVal.call(input, v); input.dispatchEvent(new dom.window.Event('input', { bubbles: true })); await wait(400); };
  const bigCards = () => [...doc.querySelectorAll('button')].filter(b => /^양하확인$/.test((b.textContent || '').trim()));
  const cardOf = (btn) => { let n = btn; for (let i = 0; i < 8 && n; i++) { n = n.parentElement; if (n && /[A-Z]{4}\d{7}/.test(n.textContent || '')) return n.textContent || ''; } return ''; };
  // ── ① ② 0320 ──
  await type('0320');
  let t = doc.body.textContent || '';
  if (!/FFAU4440320/.test(t)) fail('«0320» 에 평택 FFAU4440320 이 안 보인다');
  //  부산 컨은 접힌 줄(«다른 작업·완료·통과분에 1건 — 보기») 뒤에 있다 — 펴면 «통과 KRPUS 3-01-04» 로 보인다.
  if (/SEGU2520320/.test(t)) fail('«0320» 에 부산 SEGU2520320 이 평택 카드와 나란히 떠 있다 — 접혀 있어야 한다');
  if (!clickBy(/다른 작업·완료·통과분에 1건/)) fail('«다른 작업·완료·통과분에 1건 — 보기» 접힘 줄이 없다: ' + t.slice(0, 200));
  await wait(300);
  t = doc.body.textContent || '';
  if (!/SEGU2520320/.test(t)) fail('접힘을 펴도 부산 SEGU2520320 이 안 보인다 — 조회는 돼야 한다(V7.53)');
  let big = bigCards();
  if (big.length !== 1) fail(`[양하확인] 버튼이 ${big.length}개 — 평택 한 대만 완료 카드여야 한다`);
  if (!/FFAU4440320/.test(cardOf(big[0])) || /SEGU2520320/.test(cardOf(big[0]))) fail('완료 카드가 FFAU4440320 이 아니다: ' + cardOf(big[0]).slice(0, 80));
  if (!/통과\s*KRPUS\s*3-01-04/.test(t)) fail('부산 컨에 «통과 KRPUS 3-01-04» 표시가 없다: ' + t.slice(0, 200));
  // ── ③ 누른다 ──
  big[0].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await wait(600);
  const comps = dom.window.__calls.filter(c => c.fn === 'complete');
  if (comps.length !== 1 || comps[0].cn !== 'FFAU4440320' || comps[0].equip !== '1호기') fail('완료 호출이 FFAU4440320 한 건이 아니다: ' + JSON.stringify(comps) + ' alerts=' + JSON.stringify(dom.window.__alerts || []));
  // ── ④ 완료 반영 뒤 다시 0320 — 부산 컨이 승격되면 안 된다 ──
  dom.window.__render({ FFAU4440320: { by: '김성일', at: Date.now(), equip: '1호기' } });
  await wait(500);
  await type('');
  await type('0320');
  t = doc.body.textContent || '';
  big = bigCards();
  if (big.length !== 0) fail(`FFAU 완료 뒤 «0320» 에 [양하확인] 버튼이 ${big.length}개 — 부산 SEGU2520320 이 완료 카드로 승격됐다(사건 재현): ` + cardOf(big[0]).slice(0, 80));
  if (!/SEGU2520320/.test(t)) fail('완료 뒤에도 부산 컨은 조회로 보여야 한다');
  if (!/FFAU4440320/.test(t)) fail('완료된 FFAU4440320 이 안 보인다(완료 카드로 보여야 취소가 된다)');
  // ── ⑤ 대조군 — 안 겹치는 평택 컨은 종전대로 큰 카드 ──
  const solo = Object.values(FX.ediContainers).find(c => c.pod === 'KRPTK' && Object.values(FX.ediContainers).filter(x => x.cn.slice(-4) === c.cn.slice(-4)).length === 1);
  await type('');
  await type(solo.cn.slice(-4));
  big = bigCards();
  if (big.length !== 1 || !cardOf(big[0]).includes(solo.cn)) fail(`대조군 «${solo.cn.slice(-4)}» 이 큰 카드로 안 뜬다 (${big.length})`);
  // ── ⑥ 통과 컨만 걸리는 끝4(9526 = BEAU2309526 KRKAN) — 조회 카드는 펼쳐져 떠야 하고(V7.53) 완료 카드는 아니다 ──
  const trOnly = Object.values(FX.ediContainers).filter(c => c.cn.slice(-4) === '9526');
  if (trOnly.length !== 1 || trOnly[0].cn !== 'BEAU2309526') fail('픽스처에 단독 끝4 통과분 BEAU2309526 이 없다 — 검사가 성립하지 않는다');
  await type(''); await type('9526'); t = doc.body.textContent || '';
  if (!t.includes('BEAU2309526')) fail('통과 컨만 걸리는 끝4(9526) 조회가 «없음»이 됐다: ' + t.slice(0, 160));
  if (!/통과\s*KRKAN\s*27-02-10/.test(t)) fail('9526 에 «통과 KRKAN 27-02-10» 표시가 없다');
  if (bigCards().length !== 0) fail('통과분 9526 에 [양하확인] 카드가 섰다');
  // ── ⑦ 트윈(감사 P1-2 b) — 뒤 칸 짝꿍 후보에 통과분이 오르지 않는다 ──
  await type('');
  if (!clickBy(/트윈/)) fail('트윈 버튼이 없다');
  await wait(300);
  const q1 = [...doc.querySelectorAll('input')].find(i => /끝 4자리 또는 컨번호/.test(i.placeholder || ''));
  if (!q1) fail('트윈 앞 컨 입력칸이 없다');
  const typeIn = async (el, v) => { setVal.call(el, v); el.dispatchEvent(new dom.window.Event('input', { bubbles: true })); await wait(400); };
  await typeIn(q1, '4219');
  t = doc.body.textContent || '';
  if (!/BEAU2314219/.test(t)) fail('트윈 앞 컨 4219(BEAU2314219)가 안 잡힌다: ' + t.slice(0, 160));
  const q2 = [...doc.querySelectorAll('input')].find(i => (i.placeholder || '') === '끝 4자리');
  if (!q2) fail('짝꿍 수동 입력칸(«끝 4자리»)이 없다 — 픽스처에 짝꿍이 없으니 떠야 한다: ' + t.slice(0, 200));
  await typeIn(q2, '9526');
  t = doc.body.textContent || '';
  if (/BEAU2309526/.test(t)) fail('짝꿍 후보에 통과분 BEAU2309526 이 올랐다(사고의 뒤 칸 길)');
  //  2560 = 평택 KMTU9292560 + 통과 HPCU5332560·TCKU6672560(KRKAN) — 평택 것만 후보 (FFAU 는 ③에서 완료돼 풀에 없다)
  await typeIn(q2, '2560');
  const chips = [...doc.querySelectorAll('button')].map(b => (b.textContent || '').trim());
  if (!chips.some(x => /^KMTU9292560$/.test(x))) fail('짝꿍 후보에 평택분 KMTU9292560(2560)이 안 오른다 — 필터가 과했다: ' + chips.filter(x => /2560/.test(x)).join(' | '));
  if (chips.some(x => /HPCU5332560|TCKU6672560/.test(x))) fail('짝꿍 후보 2560 에 통과분(HPCU5332560·TCKU6672560)이 올랐다');
  // ── ⑧ 상세창 옆길(감사 P1-2 a) — 플래그 없는 통과분 객체로 [양하확인]을 눌러도 안 찍힌다 · 시프팅이면 찍힌다 ──
  const n0 = dom.window.__calls.filter(c => c.fn === 'complete').length;
  const SEGU = FX.ediContainers.SEGU2520320;
  dom.window.__renderDetail({ ...SEGU });
  await wait(400);
  const dbtn = () => [...doc.querySelectorAll('#detail button')].find(b => /^양하확인$/.test((b.textContent || '').trim()));
  if (!dbtn()) fail('상세창에 [양하확인] 버튼이 없다: ' + (doc.querySelector('#detail')?.textContent || '').slice(0, 160));
  dbtn().dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await wait(500);
  if (dom.window.__calls.filter(c => c.fn === 'complete').length !== n0) fail('상세창에서 통과분 SEGU2520320 이 완료로 찍혔다(옆길 열림)');
  if (!(dom.window.__alerts || []).some(a => /통과화물/.test(a))) fail('통과분 차단 안내(alert)가 없다: ' + JSON.stringify(dom.window.__alerts || []));
  dom.window.__renderDetail({ ...SEGU }, { shiftCns: new Set(['SEGU2520320']) });
  await wait(400);
  dbtn().dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await wait(500);
  const compsAfter = dom.window.__calls.filter(c => c.fn === 'complete');
  if (compsAfter.length !== n0 + 1 || compsAfter[compsAfter.length - 1].cn !== 'SEGU2520320') fail('시프팅 컨(shiftCns)은 상세창에서 완료돼야 한다: ' + JSON.stringify(compsAfter.slice(-2)));
  // ── ⑨ 선적 «위치 지정 방식» 트윈(재감사 P1-A) — 통과 짝(6654·4184 VNHPH)은 후보가 아니고, 평택 짝(7196·9075)은 선적확인된다 ──
  dom.window.__render({});   // 양하 루트는 비워 두고(버튼 검색이 섞이지 않게) 선적 루트만 본다
  dom.window.__renderLoading({});
  await wait(600);
  const L = () => doc.querySelector('#lod');
  const lclick = (re) => { const b = [...L().querySelectorAll('button')].find(x => re.test((x.textContent || '').trim())); if (!b) return false; b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); return true; };
  if (!lclick(/^B29·30·31/)) fail("선적 B29·30·31 베이 버튼이 없다: " + (L().textContent || "").slice(0, 200));
  await wait(300);
  if (!lclick(/^🟠 홀드/)) fail('선적 홀드 단 버튼이 없다: ' + (L().textContent || '').slice(0, 200));
  await wait(300);
  if (!lclick(/트윈$/)) fail('선적 트윈 버튼이 없다');
  await wait(300);
  if (!lclick(/위치 지정 방식으로/)) fail('«위치 지정 방식으로» 버튼이 없다: ' + (L().textContent || '').slice(0, 200));
  await wait(500);
  const qs = [...L().querySelectorAll('input')].filter(i => /끝 4자리 또는 컨번호/.test(i.placeholder || ''));
  if (qs.length < 2) fail('위치 지정 방식 입력칸 두 개가 없다: ' + [...L().querySelectorAll('input')].map(i => i.placeholder).join(' | '));
  const n1 = dom.window.__calls.filter(c => c.fn === 'completeAtomic').length;
  await typeIn(qs[0], '6654'); await typeIn(qs[1], '4184');
  let lt = L().textContent || '';
  if (/BEAU2086654|SKLU2054184/.test(lt)) fail('위치 지정 방식 후보에 통과분(VNHPH 6654·4184)이 떴다(재감사 P1-A 재현): ' + lt.slice(0, 200));
  if (lclick(/지정 자리 그대로 트윈 선적확인/)) { await wait(500); if (dom.window.__calls.filter(c => c.fn === 'completeAtomic').length !== n1) fail('통과 짝이 선적확인됐다(P1-A)'); }
  await typeIn(qs[0], ''); await typeIn(qs[1], '');
  await typeIn(qs[0], '7196'); await typeIn(qs[1], '9075');
  lt = L().textContent || '';
  if (!/HALU2067196/.test(lt) || !/HALU2449075/.test(lt)) fail('평택 짝(7196·9075)이 후보로 안 잡힌다 — 필터가 과했다: ' + lt.slice(0, 200));
  if (!lclick(/지정 자리 그대로 트윈 선적확인/)) fail('평택 짝인데 «지정 자리 그대로 트윈 선적확인» 버튼이 없다: ' + lt.slice(0, 240));
  await wait(700);
  const at = dom.window.__calls.filter(c => c.fn === 'completeAtomic');
  if (at.length !== n1 + 1 || JSON.stringify(at[at.length - 1].cns) !== JSON.stringify(['HALU2067196', 'HALU2449075'])) fail('평택 짝 선적확인 호출이 다르다: ' + JSON.stringify(at.slice(-1)) + ' alerts=' + JSON.stringify(dom.window.__alerts || []));
  // ── ⑩ 리스트 전용 컨(재감사 P1-1) — 항구 빈칸 CRTU7600877 은 선적확인 큰 카드가 돼야 한다 ──
  dom.window.__unmountLoading();
  dom.window.__renderLoading({});
  await wait(500);
  if (!lclick(/^B29·30·31/)) fail("⑩ B29·30·31 없음"); await wait(300);
  if (!lclick(/^🟠 홀드/)) fail('⑩ 홀드 없음'); await wait(400);
  const lin = [...L().querySelectorAll('input')].find(i => /4777/.test(i.placeholder || ''));
  if (!lin) fail('⑩ 선적 검색칸이 없다');
  await typeIn(lin, '0877');
  const lbig = [...L().querySelectorAll('button')].filter(b => /^선적확인$/.test((b.textContent || '').trim()));
  lt = L().textContent || '';
  if (lbig.length !== 1 || !/CRTU7600877/.test(lt)) fail(`리스트 전용 컨 0877(CRTU7600877, 항구 빈칸)이 선적확인 카드가 아니다 (버튼 ${lbig.length}) — 재감사 P1-1 재현: ` + lt.slice(0, 200));
  if (/통과\s+\d/.test(lt) || /통과 /.test(lt) && /CRTU7600877/.test(lt) && /통과 \d{1,2}-/.test(lt)) fail('리스트 전용 컨에 «통과» 배지가 붙었다');
  console.log(`✓ 끝4자리 중복 연막검사 통과 (0320: 완료 카드 FFAU 1개 · SEGU 통과 표시 · 완료 뒤 승격 0 · 대조군 ${solo.cn.slice(-4)} 큰 카드 · 9526 통과 조회 · 트윈 뒤 칸 차단 · 상세창 옆길 차단 · 선적 위치지정 통과짝 차단·평택짝 확인 · 리스트 전용 0877 카드 · 오류 0)`);
  process.exit(0);
})();
