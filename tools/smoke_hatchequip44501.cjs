// 4.45-01 연막검사 — ① 선적 자동 가이드 «홀드 선적 완료 → 커버 닫을까요» 가 보고 기록을 보는가(XTPG 545W 실데이터) ② 작업 보고 창의 호기 기본값이 앱 호기인가.
//   실행 — node tools/smoke_hatchequip44501.cjs <repoRoot> <번들(smoke_hatchequip44501.jsx)>. 실패하면 빌드를 세운다.
//   실측 — XTPG 545W 2026-10-22 23:01:05 작업 보고 창 CLOSE 1·4·7 · 23:01:43 CLOSE 10·14 뒤에 가이드가 01(23:02:19)·04(23:23:28)·09(10)11(23:42:42) 을 다시 물어 같은 닫힘이 세 번 더 나갔다.
//   경계 — STSE 2677E 10-07 06:02 양하 닫힘(1번) 뒤 06:15~06:18 선적 홀드 — 홀드 선적 전 닫힘은 세지 않으므로 종전대로 묻는다.
const path = require('path');
const fs = require('fs');
const root = process.argv[2] || process.cwd();
const bundle = process.argv[3];
const KST = (s) => new Date(s + '+09:00').getTime();
(async () => {
  let bad = 0, n = 0;
  const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
  if (!bundle) { console.log('번들 경로가 없다'); process.exit(1); }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.global = dom.window;   // 메모리 스텁(stub_fbdb_mem)이 global.__memdb 를 본다 — 창을 전역으로
  const errs = [];
  dom.window.addEventListener('error', (e) => errs.push(e.message));
  console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
  dom.window.__alerts = [];
  dom.window.alert = (m) => { dom.window.__alerts.push(String(m)); };
  dom.window.localStorage.setItem('gm_equip_no', '2호기');   // 어젯밤 검수사 호기
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(500);
  const doc = dom.window.document;
  const txt = () => doc.body.textContent || '';
  const click = (el) => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); };
  const clickBy = (re) => { const b = [...doc.querySelectorAll('button')].find((x) => re.test((x.textContent || '').trim()) && !x.disabled); if (!b) return false; click(b); return true; };
  const clickSel = (sel) => { const b = doc.querySelector(sel); if (!b || b.disabled) return false; click(b); return true; };
  const calls = () => dom.window.__calls || [];
  //  묶음 단추 — «B1» · «B3·4·5» · «B9·10·11» 처럼 이름 안에 그 베이 번호가 있는 것
  const pickGroup = (bay) => {
    const b = [...doc.querySelectorAll('button')].find((x) => { const d = x.querySelector('div.font-bold'); const m = d && /^B([\d·]+)$/.exec((d.textContent || '').trim()); return m && m[1].split('·').includes(String(bay)); });
    if (!b) return false; click(b); return true;
  };
  const BANNER = /이 베이 홀드 선적 완료!/;
  const isManualClose = (r) => !(r.type === 'hatch' && r.action === 'close' && Math.abs(Number(r.ts) - KST('2026-10-22T23:01:20')) < 60000);
  //  묶음 하나를 데크로 들어가 본다 — 배너가 뜨는가
  const enterDeck = async (bay) => {
    await wait(300);
    if (!pickGroup(bay)) return { err: 'B' + bay + ' 묶음 단추 없음: ' + txt().slice(0, 160) };
    await wait(300);
    if (!clickBy(/^🔵 데크/)) return { err: '데크 단추 없음: ' + txt().slice(0, 160) };
    await wait(400);
    return { banner: BANNER.test(txt()), t: txt() };
  };

  console.log('[1] XTPG 545W — 작업 보고 창으로 닫은 묶음은 다시 묻지 않는다');
  ok(errs.length === 0, '렌더 준비 중 오류 없음' + (errs.length ? ' — ' + [...new Set(errs)].slice(0, 2).join(' | ') : ''));
  const cases = [
    { bay: 1, T: KST('2026-10-22T23:02:00'), lab: '01 (23:02 — 실제로는 23:02:19 에 다시 물어 닫힘이 또 나갔다)' },
    { bay: 4, T: KST('2026-10-22T23:23:00'), lab: '03(04)05 (23:23 — 실제 23:23:28 재보고)' },
    { bay: 10, T: KST('2026-10-22T23:42:00'), lab: '09(10)11 (23:42 — 실제 23:42:42 재보고)' },
  ];
  for (const c of cases) {
    dom.window.__renderGuide('xtpg', c.T);
    const r = await enterDeck(c.bay);
    ok(!r.err && r.banner === false, `${c.lab} — 23:01 닫힘 보고가 있으면 «홀드 선적 완료» 배너 없이 데크 카드로 간다` + (r.err ? ' — ' + r.err : ''));
    ok(!r.err && /다음|확인|선적/.test(r.t) && !/해치커버 클로즈 → 데크 계속/.test(r.t), `${c.lab} — 클로즈 단추가 없다`);
    //  재현 — 23:01 작업 보고 창 닫힘 두 건을 빼면 배너가 떠야 한다(이 판 전 화면이 바로 이것)
    dom.window.__renderGuide('xtpg', c.T, isManualClose);
    const r0 = await enterDeck(c.bay);
    ok(!r0.err && r0.banner === true, `${c.lab} — 그 닫힘 보고가 없으면 종전대로 «홀드 선적 완료» 배너가 뜬다(판정이 보고 기록에서 온다)` + (r0.err ? ' — ' + r0.err : ''));
  }

  console.log('[2] 가이드에서 직접 누른 닫힘도 — 같은 묶음을 다시 고르면 다시 묻지 않는다');
  {
    const T = KST('2026-10-22T23:02:00');
    dom.window.__renderGuide('xtpg', T, isManualClose);
    let r = await enterDeck(1);
    ok(r.banner === true, '23:01 닫힘이 없는 상태로 01 데크에 들어가면 배너가 뜬다');
    dom.window.__calls.length = 0;
    ok(clickBy(/해치커버 클로즈 → 데크 계속/), '[🔒 해치커버 클로즈 → 데크 계속] 을 눌렀다'); await wait(400);
    if (!clickSel('[data-hatch-ok]')) { clickSel('[data-hatch-count="1"]'); await wait(150); clickSel('[data-hatch-ok]'); }
    await wait(600);
    const reps = calls().filter((x) => x.fn === 'report');
    ok(reps.length === 1 && reps[0].report.action === 'close' && reps[0].report.equip === '2호기' && reps[0].report.mode === 'loading', `닫힘 보고가 한 번 나갔다 — 2호기·선적 (${reps.length}건 ${reps[0] ? reps[0].report.equip + '·' + reps[0].report.mode : ''})`);
    //  보관소 구독이 새 보고를 내려 준 것처럼 같은 화면에 다시 그리고, 다른 묶음으로 갔다가 01 로 돌아온다
    const o = dom.window.__guideReports('xtpg', T, isManualClose);
    if (reps[0]) o[String(reps[0].ts)] = { ...reps[0].report, ts: reps[0].ts };
    dom.window.__rerenderGuideSame('xtpg', T, o); await wait(300);
    //  카드 화면의 장 칩 줄로 다른 묶음(09(10)11) 데크에 갔다가 01 칩으로 돌아온다(칩 → 단 고르기 → 데크)
    const viaChip = async (center) => { if (!clickSel(`[data-gw-group="${center}"]`)) return false; await wait(300); if (!clickBy(/^🔵 데크/)) return false; await wait(400); return true; };
    ok(await viaChip(10), '장 칩으로 09(10)11 데크에 갔다');
    ok(await viaChip(1), '장 칩으로 01 데크에 돌아왔다');
    r = { banner: BANNER.test(txt()), t: txt() };
    ok(!r.err && r.banner === false, '방금 가이드로 닫은 01 로 돌아오면 다시 묻지 않는다(종전엔 묶음을 고를 때마다 표시가 지워져 또 물었다)' + (r.err ? ' — ' + r.err : ''));
  }

  console.log('[3] 경계 — 홀드 선적을 시작하기 전의 닫힘은 세지 않는다(STSE 2677E 1번)');
  {
    const T = KST('2026-10-07T06:20:00');
    dom.window.localStorage.setItem('gm_equip_no', '1호기');   // 그날 그 묶음을 실은 호기(다른 갱 되묻기 창을 피한다)
    dom.window.__renderGuide('stse', T);
    const r = await enterDeck(1);
    dom.window.localStorage.setItem('gm_equip_no', '2호기');
    ok(!r.err && r.banner === true, '06:02 양하 닫힘만 있고 06:15~06:18 홀드 선적 뒤 닫힘이 없으면 «홀드 선적 완료» 배너가 뜬다(종전과 같음)' + (r.err ? ' — ' + r.err : ''));
  }

  console.log('[4] 작업 보고 창 — 해치커버·콘박스·수동 보고의 호기는 앱 호기(2호기)가 기본');
  const RUN = (eq, m) => ({ [eq]: { [m]: { mode: m, startedAt: KST('2026-10-22T19:37:00'), status: 'running', voy: m === 'loading' ? '545W' : '545E', vsl: 'XTPG' } } });
  const orangeBtn = () => ([...doc.querySelectorAll('button')].find((b) => /^\d호기$/.test((b.textContent || '').trim()) && /bg-orange-600/.test(b.className)) || {}).textContent || '없음';
  const typeBays = async (v) => { const inp = doc.querySelector('input[placeholder^="예: 1, 3, 5"]'); if (!inp) return false; const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set; setter.call(inp, v); inp.dispatchEvent(new dom.window.Event('input', { bubbles: true })); await wait(250); return true; };
  const sendHatch = async () => { if (!clickBy(/해치 (OPEN|CLOSE) 보고/)) return false; await wait(400); if (!clickSel('[data-hatch-ok]')) { clickSel('[data-hatch-count="1"]'); await wait(150); clickSel('[data-hatch-ok]'); } await wait(600); return true; };
  {
    //  1호기(다른 검수원)·2호기(나) 둘 다 선적 진행 중 — 종전 기본값은 첫 키 1호기였다(DJCF 0152N 02:56 김성일 4호기인데 3호기가 골라져 있던 꼴)
    dom.window.__calls.length = 0;
    dom.window.__renderReport({ activeWork: { ...RUN('1호기', 'loading'), ...RUN('2호기', 'loading') }, lastEquip: '1호기' }); await wait(400);
    const cards = [...doc.querySelectorAll('span.font-bold.text-base')].map((s) => s.textContent.trim()).filter((t) => /호기$/.test(t));
    ok(cards[0] === '2호기' && !!doc.querySelector('[data-my-equip="1"]') && /내 호기/.test(txt()), `진행 중인 작업 첫 줄이 내 호기(2호기)이고 «내 호기» 표시 (${cards.join(',')})`);
    ok(clickBy(/^해치커버$/), '[해치커버]'); await wait(300);
    ok(orangeBtn() === '2호기', `해치커버 화면 호기 기본값이 2호기 (골라진 것 «${orangeBtn()}»)`);
    clickBy(/^CLOSE$/); await wait(150);
    await typeBays('1, 4, 7');
    ok(await sendHatch(), '1, 4, 7 CLOSE 보고를 보냈다');
    let reps = calls().filter((x) => x.fn === 'report');
    ok(reps.length === 1 && reps[0].report.equip === '2호기' && reps[0].report.mode === 'loading' && /545W/.test(reps[0].report.message || ''), `보고 호기 2호기·선적·545W (${reps[0] ? reps[0].report.equip + '·' + reps[0].report.mode : '없음'})`);
    //  대신 보고 — 1호기를 눌러 보내면 1호기로 나가고, 창을 닫았다 열면 다시 2호기
    dom.window.__calls.length = 0;
    dom.window.__renderReport({ activeWork: { ...RUN('1호기', 'loading'), ...RUN('2호기', 'loading') }, lastEquip: '1호기', open: true, fresh: false }); await wait(300);
    clickBy(/^해치커버$/); await wait(300);
    clickBy(/^1호기$/); await wait(150);
    ok(orangeBtn() === '1호기', '다른 갱 몫은 눌러 바꿀 수 있다(1호기)');
    clickBy(/^CLOSE$/); await typeBays('14'); await sendHatch();
    reps = calls().filter((x) => x.fn === 'report');
    ok(reps.length === 1 && reps[0].report.equip === '1호기', `바꾼 호기(1호기)로 나갔다 (${reps[0] ? reps[0].report.equip : '없음'})`);
    dom.window.__renderReport({ activeWork: {}, lastEquip: '1호기', open: false, fresh: false }); await wait(200);
    dom.window.__renderReport({ activeWork: {}, lastEquip: '1호기', open: true, fresh: false }); await wait(300);
    clickBy(/^해치커버$/); await wait(300);
    ok(orangeBtn() === '2호기', `창을 닫았다 열면 다시 앱 호기 2호기 (골라진 것 «${orangeBtn()}») — 종전엔 한 번 누른 1호기가 남았다`);
    //  콘박스
    clickBy(/돌아가기/); await wait(200);
    ok(clickBy(/^콘박스$/), '[콘박스]'); await wait(300);
    ok(orangeBtn() === '2호기', `콘박스 화면 호기 기본값이 2호기 (골라진 것 «${orangeBtn()}»)`);
    //  수동 보고 — 항차 화면 들어올 때 호기(lastEquip 1호기)가 아니라 지금 앱 호기
    clickBy(/돌아가기/); await wait(200);
    ok(clickBy(/수동 보고/), '[🔧 수동 보고]'); await wait(300);
    const indigo = ([...doc.querySelectorAll('button')].find((b) => /^\d호기$/.test((b.textContent || '').trim()) && /bg-indigo-700/.test(b.className)) || {}).textContent || '없음';
    ok(indigo === '2호기', `수동 보고 화면 호기 기본값이 2호기 (골라진 것 «${indigo}»)`);
  }
  {
    //  내 호기는 시작을 안 눌렀고 다른 호기만 양하 진행 중 — 지금 선적 화면이면 보고는 선적·545W(실측 STMJ 2663E 10-15 05:43 선적 중 닫힘이 양하 항차로 나감)
    dom.window.__calls.length = 0;
    dom.window.__renderReport({ activeWork: { ...RUN('1호기', 'discharge') }, pageMode: 'loading', lastEquip: '1호기' }); await wait(400);
    clickBy(/^해치커버$/); await wait(300);
    ok(orangeBtn() === '2호기', `시작을 안 눌렀어도 앱 호기 2호기가 기본 (골라진 것 «${orangeBtn()}») — 종전엔 진행 중인 1호기`);
    clickBy(/^CLOSE$/); await typeBays('10, 14'); await sendHatch();
    const reps = calls().filter((x) => x.fn === 'report');
    ok(reps.length === 1 && reps[0].report.equip === '2호기' && reps[0].report.mode === 'loading' && /545W/.test(reps[0].report.message || '') && !/545E/.test(reps[0].report.message || ''), `보고는 2호기·선적·545W (${reps[0] ? reps[0].report.equip + '·' + reps[0].report.mode : '없음'})`);
  }
  {
    //  앱 호기가 이 부두 번호가 아니면(5호기 · PCTC 1~4) 종전대로 진행 중 호기
    dom.window.localStorage.setItem('gm_equip_no', '5호기');
    dom.window.__renderReport({ activeWork: { ...RUN('3호기', 'loading') }, lastEquip: '1호기' }); await wait(400);
    clickBy(/^해치커버$/); await wait(300);
    ok(orangeBtn() === '3호기', `앱 호기가 이 부두에 없는 번호면 진행 중 호기(3호기)가 기본 (골라진 것 «${orangeBtn()}»)`);
    //  창이 열린 채 앱 호기를 바꾸면(시작 화면 단추 · 헤더) 따라간다
    dom.window.localStorage.setItem('gm_equip_no', '4호기');
    dom.window.dispatchEvent(new dom.window.CustomEvent('equipChanged', { detail: '4호기' })); await wait(300);
    ok(orangeBtn() === '4호기', `앱 호기가 4호기로 바뀌면 해치 화면도 따라간다 (골라진 것 «${orangeBtn()}»)`);
    //  감사 하2 — 이 부두에 없는 번호(5호기 · PCTC 1~4)로 바뀐다는 알림이 와도 수동 보고 호기는 이 부두 번호 그대로(열림 때와 같은 문지기)
    dom.window.localStorage.setItem('gm_equip_no', '2호기');
    dom.window.__renderReport({ activeWork: {}, lastEquip: '1호기' }); await wait(400);
    dom.window.localStorage.setItem('gm_equip_no', '5호기');
    dom.window.dispatchEvent(new dom.window.CustomEvent('equipChanged', { detail: '5호기' })); await wait(300);
    clickBy(/수동 보고/); await wait(300);
    const ind5 = ([...doc.querySelectorAll('button')].find((b) => /^\d호기$/.test((b.textContent || '').trim()) && /bg-indigo-700/.test(b.className)) || {}).textContent || '없음';
    ok(ind5 === '2호기', `이 부두에 없는 5호기 알림이 와도 수동 보고 호기는 2호기 그대로 (골라진 것 «${ind5}») — 눌린 단추 없이 «5호기 완료» 로 나가지 않게`);
    //  앱 호기도 진행 중 작업도 없으면 종전대로 «장비를 선택하세요»
    dom.window.localStorage.removeItem('gm_equip_no');
    dom.window.__calls.length = 0; dom.window.__alerts.length = 0;
    dom.window.__renderReport({ activeWork: {}, lastEquip: '' }); await wait(400);
    clickBy(/^해치커버$/); await wait(300); clickBy(/^CLOSE$/); await typeBays('1');
    clickBy(/해치 CLOSE 보고/); await wait(400);
    ok(calls().filter((x) => x.fn === 'report').length === 0 && dom.window.__alerts.some((m) => /장비를 선택하세요/.test(m)), '앱 호기도 진행 중 작업도 없으면 «장비를 선택하세요» 로 막는다(아무 호기로 나가지 않는다)');
  }

  console.log('[5] 소스 모양');
  {
    const G = fs.readFileSync(path.resolve(root, 'src/components/GuidedWorkPanel.jsx'), 'utf8');
    const W = fs.readFileSync(path.resolve(root, 'src/components/WorkReportModal.jsx'), 'utf8');
    const hp = G.slice(G.indexOf('const holdDonePrompt = useMemo('), G.indexOf('const holdDonePrompt = useMemo(') + 4000);
    ok(/lastHatchOf\(selectedGroup\)/.test(hp) && /holdAts/.test(hp), '선적 홀드 끝 판정이 보고 기록(lastHatchOf)과 홀드 첫 완료 시각을 본다');
    ok(/hatchAuto, voyage\]\);/.test(hp), '보고가 바뀌면(voyage) 다시 판정한다');
    ok(!/Object\.keys\(activeByEquip\)\[0\]\) ===/.test(W) && (W.match(/defaultReportEquip/g) || []).length >= 5, '해치·콘박스 기본값은 defaultReportEquip(앱 호기 먼저) 한 벌');
    ok(/pageMode=\{mode\}/.test(fs.readFileSync(path.resolve(root, 'src/pages/VoyagePage.jsx'), 'utf8')), '항차 화면이 지금 모드(pageMode)를 작업 보고 창에 넘긴다');
  }
  ok(errs.length === 0, '전체 렌더 오류 없음' + (errs.length ? ' — ' + [...new Set(errs)].slice(0, 3).join(' | ') : ''));
  console.log(bad ? `\n✗ 4.45-01 해치·호기 연막검사 실패 ${bad}건 / ${n}` : `\n✓ 4.45-01 해치·호기 연막검사 통과 ${n}건`);
  process.exit(bad ? 1 : 0);
})();
