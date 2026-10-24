// 4.47 연막검사 — 같은 호기에서 양하↔선적을 바꿀 때 중단 사유를 앱이 적고 카톡은 한 번. 보관 실보고 흐름을 실소스 작업 보고 창(WorkReportModal)으로 재생한다.
//   실행 — node tools/smoke_switch447.cjs <repoRoot> <번들(smoke_switch447.jsx)>. 실패하면 빌드를 세운다.
//   실근거 — XTPG 545E 2호기 10-22 21:23:39 양하 중단 «선적» → 21:24:26 선적 시작 · 21:44:01 선적 중단 «양하재개 » → 21:45:04 양하 재개 ·
//            TMPZ 2023E 4호기 08-03 03:22:10 선적 시작 → 03:22:35 양하 완료(양하는 끝났는데 완료를 뒤에 누름).
const fs = require('fs');
const bundle = process.argv[3];
(async () => {
  let bad = 0, n = 0;
  const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + String(d).slice(0, 300))); if (!c) bad++; };
  if (!bundle) { console.log('번들 경로가 없다'); process.exit(1); }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.global = dom.window;
  const errs = [];
  dom.window.addEventListener('error', (e) => errs.push(e.message));
  console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s) && !/act\(/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
  dom.window.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
  const shares = [];
  Object.defineProperty(dom.window.navigator, 'share', { configurable: true, value: async (d) => { shares.push(d); } });
  dom.window.alert = (m) => errs.push('alert: ' + String(m).slice(0, 160));
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(300);
  const T = dom.window.__T, W = dom.window, doc = W.document;
  if (!T) { console.log('  FAIL 번들이 시험 함수를 못 내놓았다', errs.join(' | ')); process.exit(1); }
  const X = T.FX.xtpg, VK = 'XTPG_545E', ME = '김성일';
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const btn = (re) => [...doc.querySelectorAll('button')].find((b) => re.test((b.textContent || '').trim()));
  const click = async (el) => { if (el) el.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(150); };
  const reps = () => Object.values((W.__memdb.voyages[VK] || {}).reports || {}).sort((a, b) => a.ts - b.ts);
  const AW = () => (W.__memdb.activeWork || {})[VK] || {};
  const setup = (aw, pageMode = 'loading') => {
    W.__memdb = { voyages: { [VK]: { info: clone(X.info), reports: {} } }, activeWork: { [VK]: clone(aw) } };
    shares.length = 0;
    W.__renderModal({ voyageKey: VK, voyage: { info: clone(X.info), loading: clone(X.loading), reports: {} }, inspector: ME, lastEquip: '2호기', pageMode });
  };

  console.log('① 판정 한 벌');
  ok(T.switchReasonOf('loading', 'start') === '선적 시작' && T.switchReasonOf('loading', 'resume') === '선적 재개' && T.switchReasonOf('discharge', 'resume') === '양하 재개' && T.switchReasonOf('discharge', 'start') === '양하 시작', '사유 낱말 — 선적 시작·선적 재개·양하 재개·양하 시작');
  ok(!!T.otherRunningWork({ '2호기': { discharge: { status: 'running' } } }, '2호기', 'loading') && !T.otherRunningWork({ '2호기': { discharge: { status: 'paused' } } }, '2호기', 'loading') && !T.otherRunningWork({ '3호기': { discharge: { status: 'running' } } }, '2호기', 'loading'),
    '같은 호기 다른 작업이 «진행» 일 때만(중단 중·다른 호기는 아님)');
  ok(JSON.stringify(T.pauseSwitchReasonsFor('discharge')) === '["선적 시작","선적 재개"]' && JSON.stringify(T.pauseSwitchReasonsFor('loading')) === '["양하 재개"]', '중단 빠른 선택 맨 앞 — 양하 중단 «선적 시작·선적 재개» · 선적 중단 «양하 재개»');

  console.log('② XTPG 545E 21:23 — 2호기 양하 진행 중 선적 시작');
  setup({ '2호기': { discharge: { mode: 'discharge', status: 'running', startedAt: 1792665426633, vsl: 'XTPG', voy: '545E' } } });
  await wait(250);
  await click(btn(/새 작업 시작$/));
  await click(btn(/^🏗 2호기$/));
  await click(btn(/^⬆ 선적$/));
  await click(btn(/시작 \+ 카톡 보고/));
  ok(!!doc.querySelector('[data-switch-ask]') && /2호기 양하가 진행 중입니다\./.test(doc.body.textContent) && !!btn(/^양하 중단하고 선적 시작$/) && !!btn(/^양하 완료하고 선적 시작$/), '«2호기 양하가 진행 중입니다.» · [양하 중단하고 선적 시작] [양하 완료하고 선적 시작] [취소]');
  ok(reps().length === 0 && shares.length === 0, '묻는 동안은 아무것도 기록·공유하지 않는다');
  await click(btn(/^양하 중단하고 선적 시작$/));
  await wait(200);
  let R = reps();
  ok(R.length === 2 && R[0].action === 'discharge_pause' && R[0].reason === '선적 시작' && R[0].equip === '2호기' && R[0].by === ME && R[1].action === 'loading_start' && R[1].equip === '2호기' && R[0].ts < R[1].ts,
    '기록 둘 — 양하 중단(사유 «선적 시작», 보낸 사람) → 선적 시작', JSON.stringify(R.map((r) => [r.action, r.reason, r.by])));
  ok(AW()['2호기'].discharge.status === 'paused' && AW()['2호기'].discharge.pauseReason === '선적 시작' && AW()['2호기'].loading.status === 'running', '진행 중 줄 — 양하 중단(선적 시작) · 선적 진행');
  ok(shares.length === 1 && /⏸ 양하 중단[\s\S]*사유: 선적 시작[\s\S]*🟢 선적 시작/.test(shares[0].text) && /XTPG 545E[\s\S]*XTPG 545W/.test(shares[0].text), '카톡 한 번 — 양하 중단(545E) + 선적 시작(545W) 한 글', shares.map((s) => s.text).join(' ‖ '));
  const ts = T.buildTimeSheet(clone(Object.fromEntries(R.map((r) => [r.ts, r]))), { groupOf: () => null, doneModes: ['discharge', 'loading'] }).map((r) => r.remark);
  ok(ts.includes("SUSPENDED DISCH'G (선적 시작)") && ts.includes('COMMENCED LOADING'), "타임시트 «SUSPENDED DISCH'G (선적 시작)» · «COMMENCED LOADING»", ts.join(' | '));

  console.log('③ XTPG 545E 21:44 — 선적 진행 중 양하 재개(카드 단추)');
  setup({ '2호기': { discharge: { mode: 'discharge', status: 'paused', pauseReason: '선적 시작', startedAt: 1792665426633 }, loading: { mode: 'loading', status: 'running', startedAt: 1792671866496 } } });
  await wait(250);
  await click(btn(/양하 재개$/));
  ok(/2호기 선적이 진행 중입니다\./.test(doc.body.textContent) && !!btn(/^선적 중단하고 양하 재개$/), '«2호기 선적이 진행 중입니다.» · [선적 중단하고 양하 재개]');
  await click(btn(/^선적 중단하고 양하 재개$/));
  await wait(200);
  R = reps();
  ok(R.length === 2 && R[0].action === 'loading_pause' && R[0].reason === '양하 재개' && R[1].action === 'discharge_resume', '기록 — 선적 중단(«양하 재개») → 양하 재개', JSON.stringify(R.map((r) => [r.action, r.reason])));
  ok(AW()['2호기'].loading.status === 'paused' && AW()['2호기'].discharge.status === 'running' && !AW()['2호기'].discharge.pauseReason && shares.length === 1, '진행 중 줄 — 선적 중단 · 양하 진행 · 카톡 한 번');

  console.log('④ TMPZ 2023E 03:22 — 양하는 끝났는데 완료를 안 누른 채 선적 시작');
  setup({ '4호기': { discharge: { mode: 'discharge', status: 'running', startedAt: 1785670766000 } } });
  await wait(250);
  await click(btn(/새 작업 시작$/));
  await click(btn(/^🏗 4호기$/));
  await click(btn(/^⬆ 선적$/));
  await click(btn(/시작 \+ 카톡 보고/));
  await click(btn(/^양하 완료하고 선적 시작$/));
  await wait(200);
  R = reps();
  ok(R.length === 2 && R[0].action === 'discharge_done' && R[1].action === 'loading_start' && R[0].equip === '4호기' && !R[0].reason, '기록 — 양하 완료 → 선적 시작(중단 사유 없음)', JSON.stringify(R.map((r) => [r.action, r.equip])));
  ok(!AW()['4호기'].discharge && AW()['4호기'].loading.status === 'running' && shares.length === 1 && /✅ 양하 완료[\s\S]*🟢 선적 시작/.test(shares[0].text), '양하 줄은 걷히고 선적 진행 · 카톡 한 번');

  console.log('⑤ 취소 · 다른 호기 · 중단 빠른 선택 · 수동 보고');
  setup({ '2호기': { discharge: { mode: 'discharge', status: 'running', startedAt: 1 } } });
  await wait(250);
  await click(btn(/새 작업 시작$/)); await click(btn(/^🏗 2호기$/)); await click(btn(/^⬆ 선적$/)); await click(btn(/시작 \+ 카톡 보고/));
  await click(doc.querySelector('[data-switch-cancel]'));
  ok(reps().length === 0 && shares.length === 0 && AW()['2호기'].discharge.status === 'running' && !doc.querySelector('[data-switch-ask]'), '취소 — 아무것도 안 보내고 그대로');
  setup({ '3호기': { discharge: { mode: 'discharge', status: 'running', startedAt: 1 } } });
  await wait(250);
  await click(btn(/새 작업 시작$/)); await click(btn(/^🏗 2호기$/)); await click(btn(/^⬆ 선적$/)); await click(btn(/시작 \+ 카톡 보고/));
  await wait(150);
  R = reps();
  ok(!doc.querySelector('[data-switch-ask]') && R.length === 1 && R[0].action === 'loading_start' && R[0].equip === '2호기' && AW()['3호기'].discharge.status === 'running' && shares.length === 1, '다른 호기(3호기 양하 진행)는 묻지 않고 2호기 선적 시작만(2·3갱 동시 작업)');
  setup({ '2호기': { discharge: { mode: 'discharge', status: 'running', startedAt: 1 }, loading: { mode: 'loading', status: 'running', startedAt: 2 } } });
  await wait(250);
  await click(btn(/^양하 중단$/));
  const chips = [...doc.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter((t) => /^(선적 시작|선적 재개|양하 재개|장비 고장)$/.test(t));
  ok(chips[0] === '선적 시작' && chips[1] === '선적 재개' && chips[2] === '장비 고장', '양하 중단 사유 칩 맨 앞 «선적 시작»·«선적 재개»', chips.join(','));
  setup({ '2호기': { loading: { mode: 'loading', status: 'running', startedAt: 2 } } });
  await wait(250);
  await click(btn(/^선적 중단$/));
  const chips2 = [...doc.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter((t) => /^(선적 시작|선적 재개|양하 재개|장비 고장)$/.test(t));
  ok(chips2[0] === '양하 재개' && chips2[1] === '장비 고장', '선적 중단 사유 칩 맨 앞 «양하 재개»', chips2.join(','));
  //  수동 보고 — 작업 종류는 지금 화면의 작업
  setup({}, 'loading'); await wait(250);
  await click(btn(/수동 보고 \(시작 안 누른 작업\)/));
  const sel = (label) => { const b = btn(new RegExp(`^${label}$`)); return b ? b.className : ''; };
  ok(/bg-amber-700/.test(sel('⬆ 선적')) && !/bg-blue-700/.test(sel('⬇ 양하')), '선적 화면에서 연 수동 보고 — 작업 종류 «선적»(종전엔 늘 양하)', `${sel('⬆ 선적')} | ${sel('⬇ 양하')}`);
  setup({}, 'discharge'); await wait(250);
  await click(btn(/수동 보고 \(시작 안 누른 작업\)/));
  ok(/bg-blue-700/.test(sel('⬇ 양하')) && !/bg-amber-700/.test(sel('⬆ 선적')), '양하 화면에서 연 수동 보고 — «양하»');
  //  수동 보고의 재개도 같은 물음(2호기 양하 진행 중 · 선적 이어받아 재개)
  setup({ '2호기': { discharge: { mode: 'discharge', status: 'running', startedAt: 1 }, loading: { mode: 'loading', status: 'paused', pauseReason: '양하 재개', startedAt: 2 } } }, 'loading');
  await wait(250);
  await click(btn(/수동 보고 \(시작 안 누른 작업\)/));
  await click(btn(/^2호기$/));
  await click(btn(/^재개$/));
  await click(btn(/^재개 보고$/));
  ok(/2호기 양하가 진행 중입니다\./.test(doc.body.textContent) && !!btn(/^양하 중단하고 선적 재개$/), '수동 보고 재개도 «양하 중단하고 선적 재개»', doc.body.textContent.slice(0, 200));
  await click(btn(/^양하 중단하고 선적 재개$/)); await wait(200);
  R = reps();
  ok(R.length === 2 && R[0].action === 'discharge_pause' && R[0].reason === '선적 재개' && R[1].action === 'loading_resume' && shares.length === 1, '기록 — 양하 중단(«선적 재개») → 선적 재개 · 카톡 한 번', JSON.stringify(R.map((r) => [r.action, r.reason])));

  console.log('⑥ 감사 경우 — 저장 중 취소 막기 · 다시 열면 묵은 물음 없음 · 조사');
  setup({ '2호기': { discharge: { mode: 'discharge', status: 'running', startedAt: 1792665426633 } } });
  await wait(250);
  await click(btn(/새 작업 시작$/)); await click(btn(/^🏗 2호기$/)); await click(btn(/^⬆ 선적$/)); await click(btn(/시작 \+ 카톡 보고/));
  ok(/양하 시작 /.test((doc.querySelector('[data-switch-since]') || {}).textContent || '') && /중단 사유 «선적 시작»은 앱이 적고/.test(doc.body.textContent), '물음에 양하 시작 시각 · «선적 시작»은(조사)', (doc.querySelector('[data-switch-since]') || {}).textContent);
  W.__memlag = 400;
  btn(/^양하 중단하고 선적 시작$/).dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  await wait(60);
  const cb = doc.querySelector('[data-switch-cancel]');
  ok(!!doc.querySelector('[data-switch-busy]') && !!cb && cb.disabled === true, '저장 중에는 «저장 중…» · [취소] 눌림 막힘(감사 중1)');
  await wait(3500); W.__memlag = 0;
  ok(reps().length === 2 && shares.length === 1, '느린 저장도 끝까지 — 기록 둘 · 카톡 한 번');
  setup({ '2호기': { discharge: { mode: 'discharge', status: 'running', startedAt: 1 } } });
  await wait(250);
  await click(btn(/새 작업 시작$/)); await click(btn(/^🏗 2호기$/)); await click(btn(/^⬆ 선적$/)); await click(btn(/시작 \+ 카톡 보고/));
  ok(!!doc.querySelector('[data-switch-ask]'), '물음이 뜬 채로');
  await W.__reopen(); await wait(250);
  ok(!doc.querySelector('[data-switch-ask]') && reps().length === 0, '창을 닫았다 다시 열면 묵은 물음이 없다(감사 중2)');
  W.__memlag = 0;

  ok(!errs.length, '화면 오류 0', errs.join(' | '));
  console.log(`\n4.47 양하·선적 바꿈 연막 — ${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
