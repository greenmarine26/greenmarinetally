// 4.46 연막검사 — 작업 보고 고치기·지우기(보낸 사람만). XTPG 545E 실보고 17건(보관소 그대로 — 이름이 없어 by 를 넣은 사본으로)과 실소스(firebase.js 문지기 포함)로 잰다.
//   실행 — node tools/smoke_reportedit446.cjs <repoRoot> <번들(smoke_reportedit446.jsx)>. 실패하면 빌드를 세운다.
//   ① 판정(누가·베이 숫자만·고친 기록 orig/edits) ② 타임시트에 고친 값 ③ 진행 중 작업 줄·해치 표시 맞추기 ④ 쓰는 자리 문지기(남이 고치기·지우기 막힘) ⑤ 화면(단추는 보낸 사람에게만 · 고치기→확인→저장 · 지우기 → 지운 보고) ⑥ 작업 보고 창 «내가 보낸 보고».
const fs = require('fs');
const root = process.argv[2] || process.cwd();
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
  dom.window.alert = (m) => errs.push('alert: ' + String(m).slice(0, 120));
  Object.defineProperty(dom.window.navigator, 'share', { configurable: true, value: async () => {} });   // 카톡 공유창 흉내(복사 대체 alert 를 안 띄우게)
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(300);
  const T = dom.window.__T;
  if (!T) { console.log('  FAIL 번들이 시험 함수를 못 내놓았다', errs.join(' | ')); process.exit(1); }
  const W = dom.window;
  const VK = 'XTPG_545E', ME = '김성일', OTHER = '박진우';
  const X = T.FX.xtpg;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const withBy = (reps, by) => Object.fromEntries(Object.entries(clone(reps)).map(([k, r]) => [k, { ...r, by }]));
  const REPS = withBy(X.reports, ME);
  const K1035 = '1792668903945';   // 20:35 OPEN «10번베이»
  const pairs = { 1: null, 3: '5', 5: '3', 7: null, 9: '11', 11: '9', 13: '15', 15: '13', 17: '19', 19: '17', 21: '23', 23: '21', 25: '27', 27: '25' };
  const groupOf = (b) => T.bayGroupCenter(String(b), pairs);
  const sheet = (reps) => T.buildTimeSheet(clone(reps), { groupOf, doneModes: ['discharge', 'loading'] }).map((r) => r.remark);

  console.log('① 판정 — 누가 고치나 · 베이는 숫자만 · 고친 기록');
  ok(T.canEditReport({ by: ME }, ME) && !T.canEditReport({ by: ME }, OTHER) && !T.canEditReport({}, ME) && !T.canEditReport({ by: ME }, ''), '보낸 사람만(이름 없는 옛 보고·이름 모르는 사람은 아무도 못 고침)');
  ok(T.canEditReport(X.reports[K1035], ME) === false, '보관 실보고(보낸 사람 이름 없음)는 검수사도 못 고친다 — «보고자만»');
  ok(JSON.stringify(T.cleanReportBays('10번베이')) === '["10"]' && JSON.stringify(T.cleanReportBays('11-13')) === '["11","13"]' && JSON.stringify(T.cleanReportBays('01, 04 07')) === '["01","04","07"]' && JSON.stringify(T.cleanReportBays(['22번베이', '22'])) === '["22"]',
    '베이 칸은 숫자만 — «10번베이»→10 · «11-13»→11,13 · 겹침은 하나');
  const r1 = REPS[K1035];
  const e1 = T.applyReportEdit(r1, { bays: '10' }, { me: ME, at: 1792726800000 });
  ok(!!e1 && JSON.stringify(e1.bays) === '["10"]' && JSON.stringify(e1.orig.bays) === '["10번베이"]' && e1.orig.message === r1.message && e1.edits.length === 1 && e1.edits[0].by === ME && e1.ts === r1.ts && e1.by === r1.by,
    '20:35 OPEN «10번베이» → 10 — 처음 원래 값(orig) 한 번 · edits{at,by,from,to} · 시각·보낸 사람 그대로', e1 && JSON.stringify({ b: e1.bays, o: e1.orig && e1.orig.bays, ed: e1.edits }));
  ok(T.reportEditSummary(e1.edits[0].from, e1.edits[0].to) === '베이 10번베이 → 10', '확인 줄 «베이 10번베이 → 10»', T.reportEditSummary(e1.edits[0].from, e1.edits[0].to));
  const e2 = T.applyReportEdit(e1, { bays: '14', equip: '3호기' }, { me: ME, at: 1792726900000 });
  ok(!!e2 && JSON.stringify(e2.orig.bays) === '["10번베이"]' && e2.edits.length === 2 && T.reportEditSummary(e2.edits[1].from, e2.edits[1].to) === '호기 2호기 → 3호기 · 베이 10 → 14', '두 번째 고침 — 원래 값은 그대로 · 고침이 쌓임', e2 && T.reportEditSummary(e2.edits[1].from, e2.edits[1].to));
  const e0 = T.applyReportEdit(r1, { bays: '10번베이' }, { me: ME });
  ok(!!e0 && JSON.stringify(e0.bays) === '["10"]', '«10번베이»를 그대로 다시 쳐도 숫자만 남긴다(바로잡기도 고침)', e0 && JSON.stringify(e0.bays));
  ok(T.applyReportEdit(REPS['1792673041883'], { reason: '양하재개' }, { me: ME }) === null, '사유 끝 빈칸만 다른 것(«양하재개 »)은 고침이 아니다(감사 하-3)');
  const eObj = T.applyReportEdit({ ...e1, edits: { 0: e1.edits[0] } }, { bays: '14' }, { me: ME });
  ok(!!eObj && eObj.edits.length === 2 && eObj.edits[0].by === ME, 'DB 가 고친 기록을 객체로 돌려줘도 앞 고침을 버리지 않는다(감사 하-6)');
  ok(T.applyReportEdit(e1, { bays: '10' }, { me: ME }) === null && T.applyReportEdit(r1, { bays: '' }, { me: ME }) === null, '바뀐 것 없음·베이를 비우기 → 고치지 않음(지우려면 지우기)');
  const ws = REPS['1792665426633'];   // 19:37 양하 시작
  const e3 = T.applyReportEdit(ws, { mode: 'loading', equip: '3호기' }, { me: ME });
  ok(!!e3 && e3.action === 'loading_start' && e3.mode === 'loading' && e3.equip === '3호기' && e3.orig.action === 'discharge_start', '작업 상태 — 양하 시작을 선적으로 고치면 동작 이름도 loading_start', e3 && e3.action);
  ok(T.applyReportEdit(ws, { reason: '선적' }, { me: ME }) === null, '시작 보고에는 사유 칸이 없다(중단 보고만)');
  const msg3 = T.reportMessageOf(e3, X.info);
  ok(/🏗 3호기/.test(msg3) && /XTPG 545W/.test(msg3) && /선적 시작/.test(msg3), '앱 안 글도 고친 값으로(선적이면 선적 항차 545W)', msg3);

  const auto = { ...clone(r1), bays: ['10'], auto: true, eventTs: r1.ts - 120000, eventEnd: r1.ts, gapMin: 2, src: 'term', panelCount: 0 };
  const eA = T.applyReportEdit(auto, { equip: '3호기' }, { me: ME });
  const mA = T.reportMessageOf(eA, X.info);
  ok(/🏗 3호기/.test(mA) && /총 장수 확인 필요/.test(mA) && /판정: 터미널 실적 공백 .* · 3호기 \(자동\)/.test(mA) && !/총 1장/.test(mA), '자동 해치 기록을 고쳐도 «총 장수 확인 필요» · «판정: … · 3호기 (자동)»(감사 하-4)', mA);

  console.log('② 마감 타임시트 — 고친 값이 그대로');
  const before = sheet(REPS), after = sheet({ ...REPS, [K1035]: { ...e1, message: T.reportMessageOf(e1, X.info) } });
  ok(before.some((s) => /BAY 10번베이/.test(s)) && !after.some((s) => /번베이/.test(s)) && after.includes('HATCH COVER OPEN (BAY 10)'), '«HATCH COVER OPEN (BAY 10번베이)» → «(BAY 10)»', after.filter((s) => /OPEN/.test(s)).join(' | '));
  const del3 = { ...REPS }; for (const k of ['1792677739213', '1792679008795', '1792680162339']) delete del3[k];
  ok(sheet(del3).length === before.length, '어젯밤 같은 닫힘 셋을 지워도 타임시트 줄 수 그대로(이미 접혀 있던 줄)', `${before.length} → ${sheet(del3).length}`);

  console.log('③ 딸린 상태 — 진행 중인 작업 줄 · 해치 열림·닫힘 표시');
  const upTo = Object.fromEntries(Object.entries(REPS).filter(([k]) => Number(k) <= 1792673104895));   // 21:45 양하 재개까지
  ok(JSON.stringify(T.activeWorkStateFromReports(upTo, '2호기', 'loading')) === JSON.stringify({ status: 'paused', pauseReason: '양하재개 ', at: 1792673041883 }) && T.activeWorkStateFromReports(upTo, '2호기', 'discharge').status === 'running' && T.activeWorkStateFromReports(REPS, '2호기', 'loading') === null,
    '21:45 까지 — 선적 중단(«양하재개 ») · 양하 진행 / 끝까지 보면 선적 완료 → 줄 없음');
  ok(T.isLastWorkStatusOfSlot(upTo, upTo['1792673041883']) && !T.isLastWorkStatusOfSlot(upTo, upTo['1792671866496']), '마지막 보고만 진행 중 줄을 흔든다(21:44 중단 예 · 21:24 시작 아니오)');
  const hd1 = T.hatchDoneAfterReports({}, { ...REPS, [K1035]: e2 }, [groupOf('10번베이'), groupOf('14')], groupOf);
  ok(!!hd1 && hd1['10'] === 'close' && hd1['14'] === 'close', '20:35 OPEN 10 → 14 로 고치면 10·14 장 표시는 남은 마지막 보고(23:01·23:42 닫힘)대로', JSON.stringify(hd1));
  const hd2 = T.hatchDoneAfterReports({ 10: 'close', discharge_10: 'open' }, del3, [groupOf('09'), groupOf('10'), groupOf('11')], groupOf);
  ok(!!hd2 && hd2['10'] === 'close' && !('discharge_10' in hd2), '23:42 닫힘(09·10·11)을 지우면 10 장은 23:01 닫힘으로 · 옛 모드 키는 걷음', JSON.stringify(hd2));
  ok(T.hatchDoneAfterReports({ 1: 'close' }, REPS, [1], groupOf) === null, '바뀐 것이 없으면 쓰지 않는다');

  console.log('④ 쓰는 자리 문지기 — firebase.js(메모리 DB)');
  W.__memdb = { voyages: { [VK]: { info: clone(X.info), reports: clone(REPS) } } };
  const err = async (p) => { try { await p; return null; } catch (e) { return e; } };
  const x1 = await err(T.fbEditWorkReport(VK, K1035, e1, OTHER));
  ok(!!x1 && x1.reporterOnly === true && JSON.stringify(W.__memdb.voyages[VK].reports[K1035].bays) === '["10번베이"]', '남이 고치기 → 막힘(reporterOnly) · 기록 그대로', x1 && x1.message);
  const x2 = await err(T.fbEditWorkReport(VK, K1035, { ...e1, ts: 1 }, ME));
  ok(!!x2 && /시각/.test(x2.message), '보고 시각을 바꾸는 고침은 막힘', x2 && x2.message);
  const x3 = await err(T.fbDeleteMyWorkReport(VK, K1035, OTHER));
  ok(!!x3 && x3.reporterOnly === true && !!W.__memdb.voyages[VK].reports[K1035], '남이 지우기 → 막힘 · 보고 그대로');
  W.__memdb.voyages[VK].reports[K1035] = clone(X.reports[K1035]);   // 이름 없는 옛 보고
  const x4 = await err(T.fbEditWorkReport(VK, K1035, { ...e1, by: undefined }, ME));
  ok(!!x4 && x4.reporterOnly === true, '이름 없는 옛 보고는 검수사도 못 고침');
  W.__memdb.voyages[VK].reports[K1035] = clone(REPS[K1035]);
  const tsNew = await T.fbAddWorkReport(VK, { type: 'conbox', conBoxType: '20', conBoxCount: 1, equip: '2호기', message: 'x', by: ME });
  const tsAnon = await T.fbAddWorkReport(VK, { type: 'conbox', conBoxType: '20', conBoxCount: 1, equip: '2호기', message: 'y' });
  ok(W.__memdb.voyages[VK].reports[tsNew].by === ME && !('by' in W.__memdb.voyages[VK].reports[tsAnon]), '새 보고에 보낸 사람 이름이 남는다(화면이 넘긴 이름 · 없으면 남기지 않음)');
  delete W.__memdb.voyages[VK].reports[tsNew]; delete W.__memdb.voyages[VK].reports[tsAnon];

  console.log('⑤ 화면 — 단추는 보낸 사람에게만 · 고치기 → 바뀌는 것 보기 → 저장');
  const doc = W.document;
  const q = (s) => doc.querySelector(s);
  const click = async (el) => { el.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(120); };
  const voyage = { info: clone(X.info), loading: clone(X.loading), reports: clone(REPS) };
  W.__renderRow({ voyageKey: VK, voyage, reports: W.__memdb.voyages[VK].reports, report: W.__memdb.voyages[VK].reports[K1035], me: OTHER });
  await wait(150);
  ok(!q('[data-report-edit]') && !q('[data-report-del]'), '남(박진우)에게는 고치기·지우기 단추가 없다');
  W.__renderRow({ voyageKey: VK, voyage, reports: W.__memdb.voyages[VK].reports, report: W.__memdb.voyages[VK].reports[K1035], me: ME });
  await wait(150);
  ok(!!q('[data-report-edit]') && !!q('[data-report-del]'), '보낸 사람(김성일)에게는 ✏ 고치기·🗑 지우기');
  await click(q('[data-report-edit]'));
  const inp = q('[data-report-bays]');
  ok(!!inp && inp.value === '10번베이', '고치기 — 베이 칸에 지금 값', inp && inp.value);
  if (inp) { Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value').set.call(inp, '10'); inp.dispatchEvent(new W.Event('input', { bubbles: true })); await wait(60); }
  await click(q('[data-report-edit-preview]'));
  ok(!!q('[data-report-edit-summary]') && q('[data-report-edit-summary]').textContent === '베이 10번베이 → 10', '저장 전 «베이 10번베이 → 10» 확인 줄', q('[data-report-edit-summary]') && q('[data-report-edit-summary]').textContent);
  await click(q('[data-report-edit-ok]'));
  await wait(150);
  const saved = W.__memdb.voyages[VK].reports[K1035];
  ok(JSON.stringify(saved.bays) === '["10"]' && saved.edits && Object.keys(saved.edits).length === 1 && JSON.stringify(saved.orig.bays) === '["10번베이"]' && /베이: 10\n/.test(saved.message) && String(saved.ts) === K1035,
    '저장 — DB 에 베이 10 · 원래 값 · 고친 기록 1 · 앱 안 글 «베이: 10» · 시각 그대로', JSON.stringify({ b: saved.bays, m: saved.message }));
  ok(!q('[data-report-edit-err]'), '오류 줄 없음', q('[data-report-edit-err]') && q('[data-report-edit-err]').textContent);
  W.__renderRow({ voyageKey: VK, voyage, reports: W.__memdb.voyages[VK].reports, report: W.__memdb.voyages[VK].reports[K1035], me: OTHER });
  await wait(150);
  ok(!!q('[data-report-edited]') && /수정됨 — 김성일 .* 베이 10번베이 → 10/.test(q('[data-report-edited]').textContent) && !q('[data-report-edit]'), '남이 봐도 «✏ 수정됨 — 김성일 … 베이 10번베이 → 10» 줄(단추는 없음)', q('[data-report-edited]') && q('[data-report-edited]').textContent);

  console.log('⑤-2 지우기 → 지운 보고 · 진행 중 작업 줄 맞추기');
  const KP = '1792673041883';   // 21:44 선적 중단 «양하재개 »
  W.__memdb.voyages[VK].reports = clone(upTo);
  W.__memdb.activeWork = { [VK]: { '2호기': { loading: { mode: 'loading', status: 'paused', pauseReason: '양하재개 ', startedAt: 1792671866496 }, discharge: { mode: 'discharge', status: 'running', startedAt: 1792665426633 } } } };
  W.__renderRow({ voyageKey: VK, voyage, reports: W.__memdb.voyages[VK].reports, report: W.__memdb.voyages[VK].reports[KP], me: ME });
  await wait(150);
  await click(q('[data-report-del]'));
  await click(q('[data-report-del-ok]'));
  await wait(150);
  const delRow = (W.__memdb.voyages[VK].reports_deleted || {})[KP];
  ok(!W.__memdb.voyages[VK].reports[KP] && !!delRow && delRow._deletedBy === ME && delRow.reason === '양하재개 ', '지우기 — 원래 자리에서 빠지고 reports_deleted 에 «누가·언제»와 함께', delRow && JSON.stringify({ by: delRow._deletedBy }));
  const lw = W.__memdb.activeWork[VK]['2호기'].loading;
  ok(lw && lw.status === 'running' && !lw.pauseReason && W.__memdb.activeWork[VK]['2호기'].discharge.status === 'running', '21:44 중단을 지우면 2호기 선적 줄은 남은 마지막 보고(21:24 시작)대로 «진행» · 양하 줄은 그대로', JSON.stringify(lw));
  W.__renderRow({ voyageKey: VK, voyage, reports: W.__memdb.voyages[VK].reports, report: W.__memdb.voyages[VK].reports['1792671866496'], me: ME, deleted: W.__memdb.voyages[VK].reports_deleted });
  await wait(150);
  ok(!!q('[data-deleted-reports="1"]') && /지운 보고 1건/.test(doc.body.textContent), '«🗑 지운 보고 1건»');
  //  시작 보고의 호기를 고치면 진행 중 줄도 옮긴다 — 19:37 양하 시작 하나뿐인 항차
  const KS = '1792665426633';
  W.__memdb.voyages[VK].reports = { [KS]: clone(REPS[KS]) };
  W.__memdb.activeWork = { [VK]: { '2호기': { discharge: { mode: 'discharge', status: 'running', startedAt: Number(KS), vsl: 'XTPG', voy: '545E' } } } };
  const eS = T.applyReportEdit(REPS[KS], { equip: '3호기' }, { me: ME });
  W.__renderRow({ voyageKey: VK, voyage, reports: W.__memdb.voyages[VK].reports, report: W.__memdb.voyages[VK].reports[KS], me: ME });
  await wait(150);
  await click(q('[data-report-edit]'));
  const b3 = [...doc.querySelectorAll('button')].find((b) => b.textContent === '3호기');
  if (b3) await click(b3);
  await click(q('[data-report-edit-preview]'));
  ok(!!q('[data-report-edit-summary]') && q('[data-report-edit-summary]').textContent === '호기 2호기 → 3호기', '«호기 2호기 → 3호기»', q('[data-report-edit-summary]') && q('[data-report-edit-summary]').textContent);
  await click(q('[data-report-edit-ok]'));
  await wait(200);
  const aw = W.__memdb.activeWork[VK];
  ok(!(aw['2호기'] && aw['2호기'].discharge) && aw['3호기'] && aw['3호기'].discharge && aw['3호기'].discharge.status === 'running' && aw['3호기'].discharge.startedAt === Number(KS) && W.__memdb.voyages[VK].reports[KS].equip === '3호기' && !!eS,
    '19:37 양하 시작을 3호기로 고치면 «진행 중» 줄도 2호기 → 3호기(시작 시각 그대로)', JSON.stringify(aw));

  console.log('⑤-3 진행 중 줄은 없던 것을 만들지 않는다(감사 중-1) · 완료를 지우면 되살린다');
  W.__memdb.voyages[VK].reports = clone(upTo); W.__memdb.activeWork = {};
  W.__renderRow({ voyageKey: VK, voyage, reports: W.__memdb.voyages[VK].reports, report: W.__memdb.voyages[VK].reports[KP], me: ME });
  await wait(150);
  await click(q('[data-report-edit]'));
  const rin = doc.querySelector('#rep-reason-' + KP);
  if (rin) { Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value').set.call(rin, '양하 재개'); rin.dispatchEvent(new W.Event('input', { bubbles: true })); await wait(60); }
  await click(q('[data-report-edit-preview]')); await click(q('[data-report-edit-ok]')); await wait(200);
  ok(W.__memdb.voyages[VK].reports[KP].reason === '양하 재개' && !((W.__memdb.activeWork || {})[VK]), '줄이 없던 칸의 마지막 중단 사유를 고쳐도 «진행 중» 줄을 새로 만들지 않는다', JSON.stringify(W.__memdb.activeWork));
  W.__memdb.voyages[VK].reports = { [KS]: clone(REPS[KS]) }; W.__memdb.activeWork = {};
  W.__renderRow({ voyageKey: VK, voyage, reports: W.__memdb.voyages[VK].reports, report: W.__memdb.voyages[VK].reports[KS], me: ME });
  await wait(150);
  await click(q('[data-report-edit]')); const b3b = [...doc.querySelectorAll('button')].find((b) => b.textContent === '3호기'); if (b3b) await click(b3b);
  await click(q('[data-report-edit-preview]')); await click(q('[data-report-edit-ok]')); await wait(200);
  ok(W.__memdb.voyages[VK].reports[KS].equip === '3호기' && !((W.__memdb.activeWork || {})[VK]), '줄이 없던 시작 보고의 호기를 고쳐도 3호기 줄을 만들지 않는다', JSON.stringify(W.__memdb.activeWork));
  const KD = '1792674290806';   // 22:04:50 양하 완료
  W.__memdb.voyages[VK].reports = Object.fromEntries(Object.entries(clone(REPS)).filter(([k]) => Number(k) <= Number(KD))); W.__memdb.activeWork = {};
  W.__renderRow({ voyageKey: VK, voyage, reports: W.__memdb.voyages[VK].reports, report: W.__memdb.voyages[VK].reports[KD], me: ME });
  await wait(150);
  await click(q('[data-report-del]')); await click(q('[data-report-del-ok]')); await wait(200);
  const rd = ((W.__memdb.activeWork || {})[VK] || {})['2호기'];
  ok(rd && rd.discharge && rd.discharge.status === 'running', '잘못 누른 양하 완료를 지우면 «양하 진행» 줄이 되살아난다(21:45 재개가 마지막)', JSON.stringify(W.__memdb.activeWork));

  console.log('⑤-4 해치 표시 · 문지기 · 시간 제한 · 사진 보고 · 카톡 보강');
  W.__memdb = { voyages: { [VK]: { info: { ...clone(X.info), hatchDone: {} }, reports: clone(REPS) } }, activeWork: {} };
  const vh = { info: { ...clone(X.info), hatchDone: {} }, loading: clone(X.loading), reports: clone(REPS) };
  W.__renderRow({ voyageKey: VK, voyage: vh, reports: W.__memdb.voyages[VK].reports, report: W.__memdb.voyages[VK].reports[K1035], me: ME });
  await wait(150);
  await click(q('[data-report-edit]'));
  const bi = q('[data-report-bays]');
  if (bi) { Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value').set.call(bi, '14'); bi.dispatchEvent(new W.Event('input', { bubbles: true })); await wait(60); }
  await click(q('[data-report-edit-preview]')); await click(q('[data-report-edit-ok]')); await wait(200);
  const hdm = W.__memdb.voyages[VK].info.hatchDone || {};
  ok(JSON.stringify(W.__memdb.voyages[VK].reports[K1035].bays) === '["14"]' && hdm['10'] === 'close' && hdm['14'] === 'close', '화면에서 10 → 14 로 고치면 해치 표시(info.hatchDone)도 남은 보고대로 저장', JSON.stringify(hdm));
  T.setActiveWorkChoice({ name: OTHER, mode: 'admin' });
  const xs = await err(T.fbEditWorkReport(VK, K1035, T.applyReportEdit(W.__memdb.voyages[VK].reports[K1035], { bays: '10' }, { me: ME }), ME));
  T.setActiveWorkChoice(null);
  ok(!!xs && xs.reporterOnly === true, '이 화면 세션이 박진우인데 이름만 김성일로 넘기면 막힘(감사 하-2)', xs && xs.message);
  W.__memfail = (p) => /\/edits$/.test(p);
  const xu = await err(T.fbEditWorkReport(VK, K1035, T.applyReportEdit(W.__memdb.voyages[VK].reports[K1035], { bays: '10' }, { me: ME }), ME));
  W.__memfail = null;
  ok(!!xu && xu.unverified === true && /되읽기/.test(xu.message), '되읽기가 안 되면 «저장됐을 수 있지만 되읽기를 못 했습니다»(조용히 넘기지 않음)', xu && xu.message);
  W.__memlag = 13000;
  const t0 = Date.now();
  const xt = await err(T.fbEditWorkReport(VK, K1035, T.applyReportEdit(W.__memdb.voyages[VK].reports[K1035], { bays: '9' }, { me: ME }), ME));
  W.__memlag = 0;
  ok(!!xt && xt.timeout === true && Date.now() - t0 < 12900, '서버 확인이 12초 넘게 안 오면 시간 제한으로 알린다(감사 중-3)', xt && xt.message);
  const dmg = { ts: 1792669999999, type: 'damage', cn: 'TEMU1234567', equip: '2호기', message: '🏗 2호기\n데미지', hasPhoto: true, by: ME };
  W.__memdb.voyages[VK].reports[dmg.ts] = clone(dmg);
  W.__renderRow({ voyageKey: VK, voyage: vh, reports: W.__memdb.voyages[VK].reports, report: dmg, me: ME });
  await wait(150);
  const xd = await err(T.fbDeleteMyWorkReport(VK, dmg.ts, ME));
  ok(!!q('[data-report-photo-locked]') && !q('[data-report-edit]') && !q('[data-report-del]') && !!xd && xd.photoLocked === true && !!W.__memdb.voyages[VK].reports[dmg.ts], '사진 보고(데미지)는 고치기·지우기 단추가 없고 쓰는 자리도 막는다(감사 중-4)');
  const kText = (r, hh, mm) => `2026년 10월 22일 ${hh >= 12 ? '오후' : '오전'} ${hh > 12 ? hh - 12 : hh}:${String(mm).padStart(2, '0')}, ${ME} : ${String(r.message).split('\n').join('\n')}`;
  const kt = [kText(REPS[K1035], 20, 35), kText(REPS[KS], 19, 37)].join('\n');
  const items = T.parseKakaoWorkLog(kt, { baseDate: new Date(2026, 9, 22) }).items;
  const edited = { ...REPS, [K1035]: T.applyReportEdit(REPS[K1035], { bays: '14' }, { me: ME }), [KS]: T.applyReportEdit(REPS[KS], { equip: '3호기' }, { me: ME }) };
  const dfE = T.diffAgainstReports(items, edited, groupOf);
  const del1 = { ...REPS }; delete del1[K1035];
  const dfD = T.diffAgainstReports(items.filter((x) => x.kind === 'hatch'), del1, groupOf, { [K1035]: { ...REPS[K1035], _deletedAt: 1, _deletedBy: ME } });
  ok(items.length === 2 && dfE.every((x) => x.dup && x.stale === 'edited') && dfD.length === 1 && dfD[0].dup && dfD[0].stale === 'deleted',
    '카톡 보강 — 앱이 보낸 옛 카톡 글이 고친 보고(10→14 · 2호기→3호기)·지운 보고를 되살리지 않는다(«고쳐진 보고 / 지운 보고 — 넣지 않음» · 감사 중-2)', JSON.stringify({ n: items.length, e: dfE.map((x) => [x.kind, x.dup, x.stale]), d: dfD.map((x) => [x.dup, x.stale]) }));

  console.log('⑤-5 배선 — 보고를 쓰는 곳마다 보낸 사람 이름 · 오늘 이름 대체');
  const path = require('path');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(js|jsx)$/.test(e.name) ? [path.join(d, e.name)] : []));
  const calls = [];
  for (const f of walk(path.join(root, 'src'))) {
    if (/firebase\.js$/.test(f)) continue;
    const src = fs.readFileSync(f, 'utf8');
    //  호출의 닫는 괄호까지(문자열·템플릿 안의 괄호는 건너뜀) 잘라 그 안에 by: 가 있는지 본다
    const argOf = (i) => { let d = 0, q = ''; for (let j = i; j < src.length; j++) { const c = src[j];
      if (q) { if (c === '\\') { j++; continue; } if (c === q) q = ''; continue; }
      if (c === "'" || c === '"' || c === '`') { q = c; continue; }
      if (c === '(') d++; else if (c === ')') { d--; if (d === 0) return src.slice(i, j + 1); } } return src.slice(i); };
    for (const m of src.matchAll(/fbAddWorkReport\(\s*voyageKey\s*,/g)) calls.push({ f: path.basename(f), by: /\bby\s*:/.test(argOf(m.index + 'fbAddWorkReport'.length)) });
  }
  ok(calls.length >= 14 && calls.every((c) => c.by), `보고를 쓰는 ${calls.length}곳 모두 by(보낸 사람)를 넘긴다`, calls.filter((c) => !c.by).map((c) => c.f).join(','));
  W.localStorage.setItem('tallyone_me_today', JSON.stringify({ name: ME, ymd: new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10) }));
  const tsMe = await T.fbAddWorkReport(VK, { type: 'conbox', conBoxType: '20', conBoxCount: 1, equip: '2호기', message: 'z' });
  W.localStorage.removeItem('tallyone_me_today');
  ok(W.__memdb.voyages[VK].reports[tsMe].by === ME, '화면이 이름을 안 넘겨도 이 기기의 오늘 이름으로 남긴다');

  console.log('⑥ 작업 보고 창 — «내가 보낸 보고»');
  W.__memdb.voyages[VK].reports = clone(REPS); W.__memdb.activeWork = {};
  const vy = { info: clone(X.info), loading: clone(X.loading), reports: clone(REPS) };
  W.__renderModal({ voyageKey: VK, voyage: vy, inspector: ME, lastEquip: '2호기', pageMode: 'loading' });
  await wait(250);
  ok(q('[data-my-reports]') && q('[data-my-reports]').getAttribute('data-my-reports') === '17' && /내가 보낸 보고 17건/.test(doc.body.textContent), '김성일 — «✏ 내가 보낸 보고 17건»', q('[data-my-reports]') && q('[data-my-reports]').getAttribute('data-my-reports'));
  W.__renderModal({ voyageKey: VK, voyage: { ...vy, reports: withBy(X.reports, OTHER) }, inspector: ME, lastEquip: '2호기', pageMode: 'loading' });
  await wait(250);
  ok(!q('[data-my-reports]'), '남이 보낸 보고뿐이면 줄이 없다');
  //  작업 보고 창에서 실제로 보낸 보고에 이름이 남고, 해치 베이는 숫자만
  W.__memdb = { voyages: { [VK]: { info: clone(X.info), reports: {} } }, activeWork: {} };
  W.__renderModal({ voyageKey: VK, voyage: { info: clone(X.info), loading: clone(X.loading), reports: {} }, inspector: ME, lastEquip: '2호기', pageMode: 'discharge' });
  await wait(250);
  const bt = (re) => [...doc.querySelectorAll('button')].find((b) => re.test((b.textContent || '').trim()));
  await click(bt(/새 작업 시작$/)); await click(bt(/^🏗 2호기$/)); await click(bt(/^⬇ 양하$/)); await click(bt(/시작 \+ 카톡 보고/)); await wait(150);
  const rs = Object.values(W.__memdb.voyages[VK].reports || {});
  ok(rs.length === 1 && rs[0].action === 'discharge_start' && rs[0].by === ME, '작업 보고 창 시작 보고 — 보낸 사람 김성일', JSON.stringify(rs.map((r) => [r.action, r.by])));
  W.__renderModal({ voyageKey: VK, voyage: { info: clone(X.info), loading: clone(X.loading), reports: {} }, inspector: ME, lastEquip: '2호기', pageMode: 'discharge' });
  await wait(250);
  await click(bt(/^해치커버$/));
  const hb = doc.querySelector('input[placeholder="예: 1, 3, 5"]');
  if (hb) { Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value').set.call(hb, '10번베이'); hb.dispatchEvent(new W.Event('input', { bubbles: true })); await wait(60); }
  await click(bt(/해치 OPEN 보고$/)); await wait(150);
  const hc = doc.querySelector('[data-hatch-count="1"]'); if (hc) await click(hc);
  const hok = doc.querySelector('[data-hatch-ok]'); if (hok) await click(hok);
  await wait(200);
  const hr = Object.values(W.__memdb.voyages[VK].reports || {}).find((r) => r.type === 'hatch');
  ok(!!hr && JSON.stringify(hr.bays) === '["10"]' && hr.by === ME, '작업 보고 창 해치 보고 — «10번베이»는 10 으로 · 보낸 사람 김성일', hr && JSON.stringify({ b: hr.bays, by: hr.by }));

  ok(!errs.length, '화면 오류 0', errs.join(' | '));
  console.log(`\n4.46 보고 고치기 연막 — ${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
