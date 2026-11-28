// 5.29-01 연막검사 — 선적 EDI 오기 전(리스트만 = 가상 선적 EDI) 빈 베이 고르기·빈 칸 넣기. 실패하면 빌드를 세운다.
//   실행 — node tools/smoke_listbay52901.cjs <repoRoot> <번들(smoke_listbay52901.jsx)>.
//   실자료 — OBWH 2801E 보관본(RTDB GET archive/OBWH_2801E · ship_bay_dict_v3/OBWH, tools/fixtures/listonly_obwh2801.json) — 리스트 279대의 실은 자리·완료를 걷어 «선적 전».
//   검수사 2026-11-28 «EDI가 없으면앱으로 선적을 할수 없다는게 베이선택이 되지 않습니다» · «선적 자료가 없다고 빈베이도 안보여준다는건 이해가 안됩니다».
//   ① 판정 한 벌 ② 수동 베이 칩 = 사전 해치 묶음 수 ③ 빈 베이 안내 → 베이 탭 ＋ 칸 = 사전 칸 수 ④ 자동 가이드 칩·안내 ⑤ 베이뷰 장 칩 → 빈 그림 ＋
//   ⑥ ＋ 칸 → 끝 4자리 → 자리 + 선적 완료(메모리 DB) · 20/40 짝홀 · 규격 안 맞는 장 ⑦ 🅿 배치 후보 칸 ⑧ 실 EDI 배는 그대로(＋·자료 없음 칩·안내 없음).
const fs = require('fs');
const path = require('path');
const root = process.argv[2] || process.cwd();
const bundle = process.argv[3];
(async () => {
  let bad = 0, n = 0;
  const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + String(d).slice(0, 400))); if (!c) bad++; };
  if (!bundle) { console.log('번들 경로가 없다'); process.exit(1); }
  const { JSDOM } = require(path.join(root, 'node_modules', 'jsdom'));
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.global = dom.window;
  const errs = [], alerts = [];
  dom.window.addEventListener('error', (e) => errs.push(e.message));
  console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s) && !/act\(/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
  dom.window.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
  dom.window.alert = (m) => alerts.push(String(m).slice(0, 300));
  dom.window.confirm = () => true;
  dom.window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  dom.window.HTMLElement.prototype.scrollIntoView = function () {};
  try { dom.window.localStorage.setItem('gm_equip_no', '1호기'); } catch (e) { console.log('  (localStorage 없음)', e.message); }
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(300);
  const W = dom.window, doc = W.document, T = W.__T;
  if (!T) { console.log('  FAIL 번들이 시험 함수를 못 내놓았다', errs.join(' | ')); process.exit(1); }
  const txt = () => doc.body.textContent.replace(/\s+/g, ' ');
  const btn = (re, rootEl = doc) => [...rootEl.querySelectorAll('button')].find((b) => re.test(b.textContent || ''));
  const click = async (el, ms = 500) => { if (el) { el.click(); await wait(ms); } return !!el; };
  const qa = (sel, rootEl = doc) => [...rootEl.querySelectorAll(sel)];
  const setInput = async (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value').set;
    setter.call(el, v); el.dispatchEvent(new W.Event('input', { bubbles: true })); await wait(300);
  };
  const FX = T.FX, VK = 'OBWH_2801E';
  const recN = Object.keys(FX.records).length;

  console.log('① 판정 한 벌 — 리스트만 선적(OBWH 2801E 리스트 ' + recN + '대)');
  const vL = W.__voy('list');
  const listCs = Object.values(vL.loading.ediContainers).map((c) => ({ ...c, _mode: 'loading' }));
  ok(T.listOnlyUnplacedOf(listCs, 'loading').length === recN, `자리 모르는 리스트 컨 = ${recN}대`, T.listOnlyUnplacedOf(listCs, 'loading').length);
  ok(T.listOnlyUnplacedOf(listCs, 'discharge').length === 0, '양하에는 켜지지 않는다');
  const realCs = Object.values(W.__voy('edi').loading.ediContainers).map((c) => ({ ...c, _mode: 'loading' }));
  ok(T.listOnlyUnplacedOf(realCs, 'loading').length === 0, '실 EDI(자리 있음)면 0 — 저절로 꺼진다');
  //  감사 하2 변이 — 실 EDI 배에 좌표 없는 컨이 섞여도(리스트 단독 컨 등) 리스트만 선적이 아니다(_virtualFromList 조건)
  const realMix = realCs.map((c, i) => (i < 5 ? { ...c, bay: '', row: '', tier: '' } : c));
  ok(T.listOnlyUnplacedOf(realMix, 'loading').length === 0, '실 EDI 배에 좌표 없는 컨 5대가 섞여도 0(가상 리스트 표식만 본다)');
  //  감사 하2 변이 — 자리 없이 완료된 리스트 컨은 «자리 모름»에서 빠진다(완료 제외)
  const doneOne = listCs.map((c, i) => (i === 0 ? { ...c, _comp: { at: 1, by: '김성일' } } : c));
  ok(T.listOnlyUnplacedOf(doneOne, 'loading').length === recN - 1 && T.listOnlyUnplacedOf(listCs, 'loading', (c) => c.cn === listCs[0].cn).length === recN - 1, `완료된 컨 제외 — ${recN - 1}대(_comp · isDone 두 길)`);
  //  감사 중2 — 같은 칸 판정
  const occ = [{ cn: 'AAAU1111111', bay: '06', row: '04', tier: '82', bay_actual: '06' }, { cn: 'BBBU2222222', bay: '10', row: '04', tier: '82', _comp: { at: 1 } }, { cn: 'CCCU3333333', bay: '14', row: '04', tier: '82' }];
  ok(T.listOnlyCellTakenOf(occ, '6', '04', '82', 'XXXU0000000').cn === 'AAAU1111111' && T.listOnlyCellTakenOf(occ, '10', '4', '82', 'X').cn === 'BBBU2222222'
    && !T.listOnlyCellTakenOf(occ, '14', '04', '82', 'X') && !T.listOnlyCellTakenOf(occ, '6', '04', '82', 'AAAU1111111'), '같은 칸 판정 — 실자리·완료 컨은 막고, 계획만 있는 칸·자기 자신은 막지 않는다');
  const dictBays = T.listOnlyBaysOf(FX.dict.bayDef);
  const pages = T.buildBayPagesFromSummary(FX.dict.bayDef);
  const keys = T.listOnlyCellKeysOf(FX.dict.bayDef);
  ok(dictBays.length === FX.dict.bayDef.baysSummary.length && pages.length === 10 && keys && keys.size > 0, `사전 베이 ${dictBays.length} · 장 ${pages.length} · 칸 ${keys ? keys.size : 0}`, JSON.stringify(dictBays));
  //  해치 묶음(짝수 + 앞뒤 홀수) — 칩 수의 정답. 사전 짝으로 셈(utils/twin 과 독립): 짝수 베이마다 하나 + 짝 없는 홀수
  const evens = dictBays.filter((b) => b % 2 === 0);
  const lone = dictBays.filter((b) => b % 2 === 1 && !evens.includes(b - 1) && !evens.includes(b + 1));
  const hatchN = evens.length + lone.length;
  ok(T.unplacedTargetBayOf('45GE', { evenBay: '06', oddBay: '07' }) === '06' && T.unplacedTargetBayOf('22GE', { evenBay: '06', oddBay: '07' }) === '07'
    && T.unplacedTargetBayOf('45GE', { evenBay: null, oddBay: '05' }) === null && T.unplacedTargetBayOf('', { evenBay: '06', oddBay: '07' }) === null,
    '놓을 베이 — 40·45피트 짝수 · 20피트 홀수 · 홀수 장에 40피트 없음 · 규격 미상 없음');

  console.log('② 수동 베이 칩 — 사전 해치 묶음마다(빈 베이도)');
  W.__renderVP(W.__voy('list'));
  await wait(1500);
  await click(btn(/^🚀\s*작업 시작$/));
  await click(btn(/✋ 수동/));
  let chips = qa('[data-list-only-chip]');
  ok(chips.length === hatchN, `«자료 없음 · 빈 칸에 넣기» 칩 ${chips.length} = 해치 묶음 ${hatchN}`, txt().slice(0, 600));
  const chipLbls = chips.map((c) => (c.parentElement.textContent || '').match(/B([\d·]+)/)).filter(Boolean).map((m) => m[1].split('·').map(Number)).flat();
  ok(dictBays.every((b) => chipLbls.includes(b)), '칩 이름이 사전 베이를 빠짐없이 덮는다', JSON.stringify(chipLbls));
  ok(/⚠ 자리 없음/.test(txt()) && /남은 279대/.test(txt()), '«⚠ 자리 없음 279대»(🅿 목록)는 그대로');
  ok(chips.every((c) => /자리 모름 279대 · 빈 칸에 넣기/.test(c.textContent)) && !chips.some((c) => /남은 컨 0대/.test(c.parentElement.textContent)), '칩 글 «자리 모름 279대 · 빈 칸에 넣기» · «남은 컨 0대» 없음(감사 하3)', chips[0] && chips[0].parentElement.textContent);

  console.log('③ 빈 베이 안내 → 베이 탭 ＋ 칸');
  await click(chips.find((c) => /B5·6·7/.test(c.parentElement.textContent)).parentElement);
  let card = doc.querySelector('[data-list-only-card]');
  ok(!!card && /선적 자료\(EDI\)가 아직 없습니다/.test(card.textContent) && /리스트 279대/.test(card.textContent), '수동 — 단 고르기 대신 빈 베이 안내(리스트 279대)', card ? card.textContent : txt().slice(0, 400));
  await click(card && card.querySelector('[data-list-only-open]'), 1200);
  let plus = qa('[data-list-place]');
  //  정답: 장마다 그 장 베이의 사전 칸(열·단) 합집합
  let wantPlus = 0;
  for (const p of pages) {
    const s = new Set();
    for (const k of keys) { const [b, t, r] = k.split('-'); if ([p.even, p.odd].includes(Number(b))) s.add(`${r}-${t}`); }
    wantPlus += s.size;
  }
  ok(plus.length === wantPlus, `베이 탭 ＋ 칸 ${plus.length} = 사전 칸 ${wantPlus}(장 ${pages.length})`, txt().slice(0, 300));
  ok(!!doc.querySelector('[data-list-place-note]') && /리스트 279대/.test(doc.querySelector('[data-list-place-note]').textContent), '베이 탭 머리 안내 한 줄');

  console.log('⑥ ＋ 칸 → 끝 4자리 → 자리 + 선적 완료');
  const c40 = Object.values(FX.records).find((r) => /^45G/.test(r.iso || '') && r.fe === 'E');
  const c20 = Object.values(FX.records).find((r) => /^22G/.test(r.iso || '') && r.fe === 'E');
  const cell = (ev, od, row, tier) => doc.querySelector(`[data-list-place="${ev}|${od}|${row}|${tier}"]`);
  ok(!!cell('6', '7', '04', '82'), '(06)07 장 04열 82단 ＋ 칸이 있다', qa('[data-list-place]').slice(0, 6).map((b) => b.getAttribute('data-list-place')).join(','));
  await click(cell('6', '7', '04', '82'));
  let modal = doc.querySelector('[data-list-place-modal]');
  ok(!!modal && /BAY \(06\)07 · 04열 · 82단/.test(modal.textContent), '끝 4자리 창이 뜬다(장·열·단)', modal ? modal.textContent.slice(0, 200) : '');
  await setInput(modal.querySelector('[data-list-place-q]'), c40.cn.slice(-4));
  let pick = modal.querySelector(`[data-list-place-pick="${c40.cn}"]`);
  ok(!!pick && !pick.disabled && /→ 06-04-82 에 싣고 선적 완료/.test(pick.textContent), `40피트 ${c40.cn} → 06-04-82`, pick ? pick.textContent : modal.textContent.slice(0, 300));
  W.__memlog = [];
  await click(pick, 1800);
  const mem = () => ((((W.__memdb || {}).voyages || {})[VK] || {}).loading || {});
  let r40 = (mem().records || {})[c40.cn] || {}, d40 = (mem().completed || {})[c40.cn];
  ok(r40.bay_actual === '06' && r40.row_actual === '04' && r40.tier_actual === '82' && r40.actual_by === '김성일', '자리 기록 06-04-82(검수원)', JSON.stringify(r40).slice(0, 300) + ' | ' + alerts.join(' / '));
  ok(!!d40 && d40.by === '김성일' && d40.equip === '1호기', '선적 완료 기록(검수원·1호기)', JSON.stringify(d40) + ' | ' + alerts.join(' / '));
  ok(!doc.querySelector('[data-list-place-modal]'), '창이 닫힌다');
  //  RTDB 구독이 새 값을 내려 준 때 — 메모리 DB 를 얹어 다시 그린다
  const withMem = () => { const v = W.__voy('list'); const m = mem(); for (const [cn, r] of Object.entries(m.records || {})) v.loading.records[cn] = { ...(v.loading.records[cn] || {}), ...r }; v.loading.completed = { ...(m.completed || {}) }; return v; };
  W.__rerenderVP(withMem());
  await wait(900);
  ok(!cell('6', '7', '04', '82') && qa('[data-list-place]').length < wantPlus, '넣은 칸은 ＋ 가 사라진다', qa('[data-list-place]').length);
  ok(/리스트 278대/.test((doc.querySelector('[data-list-place-note]') || {}).textContent || ''), '자리 모르는 리스트 278대로 준다');
  //  20피트 — 같은 장 다른 칸이면 홀수 베이(07)
  await click(cell('6', '7', '02', '82'));
  modal = doc.querySelector('[data-list-place-modal]');
  await setInput(modal.querySelector('[data-list-place-q]'), c20.cn.slice(-4));
  pick = modal.querySelector(`[data-list-place-pick="${c20.cn}"]`);
  ok(!!pick && /→ 07-02-82/.test(pick.textContent), `20피트 ${c20.cn} → 07-02-82(홀수 베이)`, pick ? pick.textContent : '');
  await click(pick, 1800);
  const r20 = (mem().records || {})[c20.cn] || {};
  ok(r20.bay_actual === '07' && r20.row_actual === '02' && r20.tier_actual === '82' && !!(mem().completed || {})[c20.cn], '20피트 자리 07-02-82 + 완료', JSON.stringify(r20).slice(0, 200) + ' | ' + alerts.join(' / '));
  W.__rerenderVP(withMem());
  await wait(900);
  //  홀수만 있는 장(BAY 05)에 40피트 — 넣지 못하고 까닭
  const c40b = Object.values(FX.records).find((r) => /^45G/.test(r.iso || '') && r.cn !== c40.cn);
  const c05 = qa('[data-list-place]').find((b) => /^\|5\|/.test(b.getAttribute('data-list-place')));
  await click(c05);
  modal = doc.querySelector('[data-list-place-modal]');
  await setInput(modal.querySelector('[data-list-place-q]'), c40b.cn.slice(-4));
  pick = modal.querySelector(`[data-list-place-pick="${c40b.cn}"]`);
  ok(!!pick && pick.disabled && /40피트 베이\(짝수\)가 없습니다/.test(pick.textContent), 'BAY 05 장에 40피트는 못 넣는다(까닭)', pick ? pick.textContent : '');
  await setInput(modal.querySelector('[data-list-place-q]'), c40.cn.slice(-4));
  ok(!modal.querySelector(`[data-list-place-pick="${c40.cn}"]`) && /이미 넣었거나/.test(modal.textContent), '이미 넣은 컨은 후보에 없다');
  //  감사 하6 — 후보가 8대를 넘으면 «외 N대»
  await setInput(modal.querySelector('[data-list-place-q]'), 'U');
  await setInput(modal.querySelector('[data-list-place-q]'), 'SU');
  const mr = modal.querySelector('[data-list-place-more]');
  ok(qa('[data-list-place-pick]', modal).length === 8 && !!mr && /외 \d+대 — 끝 4자리를 더 넣으세요/.test(mr.textContent), '후보가 많으면 8대 + «외 N대 — 끝 4자리를 더 넣으세요»', mr ? mr.textContent : modal.textContent.slice(0, 200));
  await click(modal.querySelector('[aria-label="닫기"]'));
  ok(!doc.querySelector('[data-list-place-modal]'), '✕ 로 닫힌다');

  console.log('⑥-2 문지기 — 물리(인접) · 호기 · 같은 칸 두 대(감사 중2)');
  const recCount = () => Object.keys(mem().records || {}).length + Object.keys(mem().completed || {}).length;
  const tryPlace = async (sel, four, cn) => {
    await click(doc.querySelector(sel));
    const m = doc.querySelector('[data-list-place-modal]'); if (!m) return 'no-modal';
    await setInput(m.querySelector('[data-list-place-q]'), four);
    const pk = m.querySelector(`[data-list-place-pick="${cn}"]`); if (!pk || pk.disabled) return 'no-pick';
    await click(pk, 1500); return 'clicked';
  };
  const c20b = Object.values(FX.records).find((r) => /^22G/.test(r.iso || '') && r.cn !== c20.cn);
  const c40c = Object.values(FX.records).filter((r) => /^45G/.test(r.iso || '') && r.cn !== c40.cn && r.cn !== c40b.cn)[0];
  await tryPlace('[data-list-place="|5|05|84"]', c20b.cn.slice(-4), c20b.cn);
  ok(((mem().records || {})[c20b.cn] || {}).bay_actual === '05', `20피트 ${c20b.cn} → 05-05-84`, JSON.stringify((mem().records || {})[c20b.cn] || {}) + alerts.join(' / '));
  W.__rerenderVP(withMem()); await wait(900);
  let before = recCount(); alerts.length = 0;
  const st = await tryPlace('[data-list-place="6|7|05|84"]', c40c.cn.slice(-4), c40c.cn);
  ok(st === 'clicked' && recCount() === before && alerts.some((a) => /앞뒤 5·7베이 자리까지 차지/.test(a)), '40피트를 06-05-84 에 — 05-05-84 의 20피트와 겹쳐 막는다(물리 문지기)', st + ' ' + alerts.join(' / '));
  await click(doc.querySelector('[data-list-place-modal] [aria-label="닫기"]'));
  //  호기 없음 — 완료 문지기가 막는다
  try { W.localStorage.removeItem('gm_equip_no'); } catch (e) { console.log('  (localStorage 없음)', e.message); }
  before = recCount(); alerts.length = 0;
  const st2 = await tryPlace('[data-list-place="10|11|04|82"]', c40c.cn.slice(-4), c40c.cn);
  ok(st2 === 'clicked' && recCount() === before && alerts.length > 0, '호기가 없으면 적지 않고 알린다(호기 문지기)', st2 + ' ' + alerts.join(' / '));
  try { W.localStorage.setItem('gm_equip_no', '1호기'); } catch (e) { console.log('  (localStorage 없음)', e.message); }
  await click(doc.querySelector('[data-list-place-modal] [aria-label="닫기"]'));
  //  같은 칸 두 대 — 창을 연 사이 다른 호기가 10-04-82 에 넣고 구독이 내려 준 뒤 고른다
  await click(doc.querySelector('[data-list-place="10|11|04|82"]'));
  const other = Object.values(FX.records).filter((r) => /^45G/.test(r.iso || '') && ![c40.cn, c40b.cn, c40c.cn].includes(r.cn))[0];
  const vO = withMem(); vO.loading.records[other.cn] = { ...vO.loading.records[other.cn], bay_actual: '10', row_actual: '04', tier_actual: '82', actual_by: '이형출' }; vO.loading.completed[other.cn] = { at: Date.now(), by: '이형출', equip: '2호기' };
  W.__rerenderVP(vO); await wait(900);
  const m3 = doc.querySelector('[data-list-place-modal]');
  before = recCount(); alerts.length = 0;
  let st3 = 'no-modal';
  if (m3) { await setInput(m3.querySelector('[data-list-place-q]'), c40c.cn.slice(-4)); const pk = m3.querySelector(`[data-list-place-pick="${c40c.cn}"]`); if (pk) { await click(pk, 1500); st3 = 'clicked'; } else st3 = 'no-pick'; }
  ok(st3 === 'clicked' && recCount() === before && alerts.some((a) => /10-04-82 에는 이미 .*실려 있습니다/.test(a)), '창을 연 사이 같은 칸에 다른 컨이 실리면 막고 까닭(한 칸 두 대 없음)', st3 + ' ' + alerts.join(' / '));
  const mc = doc.querySelector('[data-list-place-modal] [aria-label="닫기"]'); if (mc) await click(mc);
  //  재감사 중1 — 같은 칸에 막힌 뒤에도 «적는 중…» 이 남지 않아 다른 칸에 바로 넣을 수 있다
  W.__rerenderVP(vO); await wait(900);
  before = recCount(); alerts.length = 0;
  const st4 = await tryPlace('[data-list-place="10|11|06|82"]', c40c.cn.slice(-4), c40c.cn);
  ok(st4 === 'clicked' && recCount() > before && ((mem().records || {})[c40c.cn] || {}).bay_actual === '10', '막힌 뒤에도 다른 칸(10-06-82)에 바로 넣는다(적는 중 상태가 풀림)', st4 + ' ' + alerts.join(' / '));
  W.__rerenderVP(withMem()); await wait(900);

  console.log('⑦ 🅿 배치 후보 칸 — 리스트만이면 사전 칸으로');
  await click(btn(/^🚀\s*작업 시작$/));
  await click(btn(/^‹ 베이$/));   // 작업 탭은 고른 베이를 기억한다(4.25-02) — 베이 칩으로 돌아간다
  await click(btn(/✋ 수동/));
  await click(btn(/⚠ 자리 없음/));
  await click(btn(/🅿 배치/), 1200);
  const boxes = qa('button').filter((b) => /📦\+/.test(b.textContent || '')).length;
  ok(boxes > 0, `📦+ 후보 칸 ${boxes}(종전 0)`);
  ok(qa('[data-list-place]').length === 0, '🅿 배치 중에는 ＋ 칸이 서지 않는다(📦+ 만)');
  await click(btn(/^취소$/));
  //  감사 하2 변이 — 🅿 배치(onCommitMove)도 같은 물리 문지기(POD 구역): 18베이 데크에 같은 POD 3대를 실은 사본에 다른 POD 컨을 18-05-82 로
  {
    const recs = Object.values(FX.records);
    const zoneP = recs.filter((r) => /^45G/.test(r.iso || '') && r.pod).reduce((m, r) => { (m[r.pod] ||= []).push(r); return m; }, {});
    const [pz, list3] = Object.entries(zoneP).find(([, l]) => l.length >= 4);
    const odd = recs.find((r) => /^45G/.test(r.iso || '') && r.pod && r.pod !== pz && !(mem().records || {})[r.cn]);
    const vZ = withMem();
    list3.slice(0, 3).forEach((r, i) => { vZ.loading.records[r.cn] = { ...vZ.loading.records[r.cn], bay_actual: '18', row_actual: ['01', '02', '03'][i], tier_actual: '82' }; vZ.loading.completed[r.cn] = { at: 1, by: '김성일' }; });
    W.__rerenderVP(vZ); await wait(900);
    await click(btn(/^🚀\s*작업 시작$/));
    await click(btn(/⚠ 자리 없음/));
    const row = qa('button').filter((b) => /🅿 배치/.test(b.textContent || '')).find((b) => (b.parentElement.textContent || '').includes(odd.cn.slice(-4)) && (b.parentElement.textContent || '').includes(odd.cn.slice(0, 4)));
    await click(row, 1200);
    const target = qa('button').find((b) => b.getAttribute('title') === '18/05/82 로 이동');
    before = recCount(); alerts.length = 0;
    await click(target, 1200);
    ok(!!row && !!target && recCount() === before && alerts.some((a) => /구역은 .* 화물 자리입니다/.test(a)), `🅿 배치도 POD 구역 문지기 — ${odd.cn}(${odd.pod})를 ${pz} 구역 18-05-82 에 못 놓는다`, `${!!row}/${!!target} ` + alerts.join(' / '));
    const cb = btn(/^취소$/); if (cb) await click(cb);
  }

  console.log('④ 자동 가이드 — 빈 베이 칩과 안내');
  try { W.sessionStorage.clear(); } catch (e) { console.log('  (sessionStorage 없음)', e.message); }   // 기억한 베이·단을 지우고 새로 들어간다
  W.__renderVP(W.__voy('list'));
  await wait(1500);
  await click(btn(/^🚀\s*작업 시작$/));
  await click(btn(/🤖 자동 가이드/));
  const gChips = qa('[data-gw-group]');
  ok(gChips.length === hatchN && qa('[data-list-only-chip]').length === hatchN, `자동 가이드 베이 칩 ${gChips.length} = 해치 묶음 ${hatchN}(종전 0)`, txt().slice(0, 500));
  await click(gChips.find((b) => /B9·10·11/.test(b.textContent)));
  card = doc.querySelector('[data-list-only-card]');
  ok(!!card && /B9·10·11/.test(card.textContent) && !!card.querySelector('[data-list-only-open]'), '자동 — B9·10·11 빈 베이 안내 + [베이 그림에서 빈 칸 넣기]', card ? card.textContent : txt().slice(0, 400));
  await click(card.querySelector('[data-list-only-open]'), 1200);
  ok(qa('[data-list-place]').length > 0 && W.__mirGoBay == null, '베이 탭으로 넘어가 그 베이로(신호는 베이 탭이 받아 지운다)');

  console.log('⑤ 베이뷰 — 그릴 베이가 없으면 사전 장 칩 → 빈 그림 ＋');
  try { W.sessionStorage.clear(); W.localStorage.removeItem('gm_bayview_last:' + VK + ':loading'); } catch (e) { console.log('  (저장소 없음)', e.message); }
  W.__renderVP(W.__voy('list'));
  await wait(1500);
  await click(btn(/^🚀\s*작업 시작$/));
  await click(btn(/베이뷰 작업/), 900);
  await click(btn(/^🤖 자동 가이드$/, doc.querySelector('[data-bayview="pick"]') || doc), 1200);
  const lp = qa('[data-bayview-listonly-page]');
  ok(lp.length === pages.length && /아직 그릴 베이가 없습니다/.test((doc.querySelector('[data-bayview-bottom]') || {}).textContent || ''), `아래 칸 장 칩 ${lp.length} = 사전 장 ${pages.length}`, ((doc.querySelector('[data-bayview-bottom]') || {}).textContent || '').slice(0, 300));
  await click(lp.find((b) => b.getAttribute('data-bayview-listonly-page') === '(14)15'), 1500);
  const bottom = doc.querySelector('[data-bayview-bottom]');
  const bPlus = qa('[data-list-place]', bottom);
  ok(bPlus.length > 0 && bPlus.every((b) => /^(14|)\|(13|15)\|/.test(b.getAttribute('data-list-place'))), `아래 그림 = 13·(14)15 해치 빈 그림 ＋ ${bPlus.length}칸`, bPlus.slice(0, 3).map((b) => b.getAttribute('data-list-place')).join(','));
  const top = doc.querySelector('[data-bayview-top]');
  ok(!!top.querySelector('[data-list-only-card]') && /아래 베이 그림의 ＋ 칸/.test(top.textContent) && !top.querySelector('[data-list-only-open]'), '위 칸 — 빈 베이 안내(아래 그림을 가리킨다)', top.textContent.slice(0, 300));
  await click(bPlus[0]);
  ok(!!doc.querySelector('[data-list-place-modal]'), '베이뷰 아래 그림 ＋ 도 끝 4자리 창을 연다');
  await click(doc.querySelector('[data-list-place-modal] [aria-label="닫기"]'));

  console.log('⑧ 실 EDI 배는 그대로');
  W.__memdb = {};
  try { W.sessionStorage.clear(); } catch (e) { console.log('  (sessionStorage 없음)', e.message); }
  W.__renderVP(W.__voy('edi'));
  await wait(1500);
  await click(btn(/^🚀\s*작업 시작$/));
  await click(btn(/✋ 수동/));
  ok(qa('[data-list-only-chip]').length === 0 && /빈 칸 \d+/.test(txt()) && !/⚠ 자리 없음/.test(txt()), '수동 칩 — «자료 없음» 없음 · 종전 «빈 칸 N»', txt().slice(0, 400));
  await click(btn(/🤖 자동 가이드/));
  ok(qa('[data-list-only-chip]').length === 0 && qa('[data-gw-group]').length > 0, '자동 가이드 — 종전 칩만');
  await click(btn(/^🚢\s*베이$/), 1200);
  ok(qa('[data-list-place]').length === 0 && !doc.querySelector('[data-list-place-note]'), '베이 탭 — ＋ 칸·안내 없음');

  const ue = [...new Set(errs)].filter((e) => !/Not implemented|ResizeObserver/.test(e));
  ok(ue.length === 0, '렌더 중 오류 없음', ue.slice(0, 4).join(' | '));
  console.log(`  ${n}항 중 실패 ${bad}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('  FAIL 검사 자체가 죽었다', e && e.stack); process.exit(1); });
