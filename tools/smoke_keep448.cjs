// 4.48 연막검사 — 선사 지시 «본선 잔류»: 평택 양하에서 빼고, 아래 평택 컨을 막으면 시프팅 예보(노란 ◆), 플래너가 확정하면 확정(파란 ◆)이 이긴다.
//   실행 — node tools/smoke_keep448.cjs <repoRoot> <번들(smoke_keep448.jsx)>. 실패하면 빌드를 세운다.
//   실자료 — MAMP 641N 22베이(tools/fixtures/keep448_mamp641n.json). 실 Firebase 쓰기 없음(메모리 DB).
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
  dom.window.alert = (m) => errs.push('alert: ' + String(m).slice(0, 160));
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(300);
  const T = dom.window.__T, W = dom.window, doc = W.document;
  if (!T) { console.log('  FAIL 번들이 시험 함수를 못 내놓았다', errs.join(' | ')); process.exit(1); }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const FX = T.FX, VK = 'MAMP_641N', ME = '김성일';
  const K1 = 'MNBU0129687', K2 = 'MNBU3119872';
  const mail = (at = 1792813740000) => ({ [K1]: { cn: K1, pod: 'CNDAI', src: 'manual', by: ME, at, mailAt: '10-24 12:49', note: 'Pls keep below cntrs onboard for CNDAI discharge', pod_orig: 'KRPYOTM' },
    [K2]: { cn: K2, pod: 'CNDAI', src: 'manual', by: ME, at, mailAt: '10-24 12:49', note: 'Pls keep below cntrs onboard for CNDAI discharge', pod_orig: 'KRPYOTM' } });
  const voy = (keep, restow) => { const v = clone(FX.voyage); if (keep) v.keepOnboard = keep; if (restow) v.restowList = restow; return v; };
  W.__fbShipBayDict = { MAMP: FX.dict };

  console.log('① 판정 한 벌 — keepOnboardOf');
  const k0 = T.keepOnboardOf({ keepOnboard: { ...mail(), ABCD1234567: { pod: 'KRPTK' }, X: { pod: 'CNDAI' }, _meta: { pod: 'CNDAI' } } });
  ok(Object.keys(k0).sort().join(',') === [K1, K2].sort().join(',') && k0[K1].pod === 'CNDAI', '지시 두 대만 — 평택을 지시한 줄·컨번호 아닌 키·_ 키는 뺀다', JSON.stringify(Object.keys(k0)));
  ok(Object.keys(T.keepOnboardOf({})).length === 0 && Object.keys(T.keepOnboardOf(null)).length === 0, '지시가 없으면 빈 묶음');

  console.log('② 평택 양하분 — 4.48-03: 지시는 예정이라 빼지 않는다(자료대로 · 22베이 픽스처 리스트 ' + Object.keys(FX.voyage.discharge.records).length + '대)');
  const U0 = T.ptkDischargeUnitsOf(voy(null));
  const U1 = T.ptkDischargeUnitsOf(voy(mail()));
  ok(U0.set.has(K1) && U0.set.has(K2) && U1.set.has(K1) && U1.set.has(K2) && U1.set.size === U0.set.size && U1.keepIn && U1.keepIn.has(K1) && U1.keepIn.has(K2) && !U1.extra.has(K1),
    `지시 넣어도 ${U0.set.size} → ${U1.set.size}(자료대로 · 예정 두 대는 keepIn — «추가분(신고 대상)» 표식 없음)`, `${U0.set.size}/${U1.set.size}`);
  const vE = voy(mail()); vE.discharge.records = {};
  const UE = T.ptkDischargeUnitsOf(vE);
  ok(UE.basis === 'edi' && UE.set.has(K1) && UE.set.has(K2) && UE.keepIn.has(K1), '리스트 없는 배(EDI 기준)도 지시 컨을 빼지 않는다(예정 표시만)');

  console.log('③ 시프팅 예보 — 같은 스택 아래 평택 컨');
  const v1 = voy(mail());
  const fc = T.keepShiftForecastOf(VK, v1);
  ok(Object.keys(fc).sort().join(',') === [K1, K2].sort().join(',') && fc[K1]._forecast === 'keep' && /같은 스택 22베이 양하분 위/.test(fc[K1]._why || '') && fc[K1].pod === 'CNDAI' && fc[K1].pos === '22-05-86',
    '두 대 예보 — «같은 스택 22베이 양하분 위 — 들어내야 양하» · 22-05-86 · POD CNDAI', JSON.stringify(fc[K1]));
  //  아래가 평택이 아닌 컨(22-06-82 맨 아래, 그 밑 홀드 22-06 은 전부 CNTXG)은 예보가 아니다 — 평택 양하에서만 빠진다
  const v2 = voy({ MCAU5003650: { pod: 'CNDAI', src: 'manual' } });
  const fc2 = T.keepShiftForecastOf(VK + '_b', v2);
  ok(!fc2.MCAU5003650 && T.ptkDischargeUnitsOf(v2).set.has('MCAU5003650'), '아래 평택 컨이 없는 지시(22-06-82)는 예보가 아니다 — 평택 양하분에도 그대로(예정)', JSON.stringify(fc2));

  console.log('④ 화면 지도 — 확정(파란 ◆) 62꼴 + 예보(노란 ◆)');
  const conf = T.computeShiftingMapCached(VK, v1);
  const disp = T.shiftingMapForDisplay(VK, v1);
  const confN = Object.keys(conf).length;
  ok(Object.keys(disp).length === confN + 2 && T.isKeepShift(disp[K1]) && !T.isPredShift(disp[K1]) && !T.isKeepShift(disp[Object.keys(conf)[0]]), `화면 지도 = 확정 ${confN} + 예보 2 · 예보는 «예측(◇)»이 아니다`, `${Object.keys(disp).length}`);
  ok(Object.keys(conf).every((cn) => disp[cn] === conf[cn]) && !conf[K1], '확정 지도는 그대로(예보를 섞지 않는다 — 작업 항목은 확정만)');
  const ev = T.shiftEvidenceOf(VK, v1, disp);
  ok(ev && ev.count === confN, `근거 판정은 예보를 빼고 ${confN}대로 본다`, JSON.stringify(ev && { count: ev.count, label: ev.label }));
  const sp = T.shiftSplitOf(VK, v1);
  ok(sp.n === confN && sp.forecast && sp.forecast.n === 2, `시프팅 분리 — 확정 ${confN} · 예보 2`, JSON.stringify({ n: sp.n, fc: sp.forecast }));
  const sl = T.shiftingListOf(disp, v1.discharge.ediContainers, v1);
  const slK = sl.filter((x) => x.keep);
  ok(sl.length === confN + 2 && slK.length === 2 && slK[0].keep.pod === 'CNDAI' && slK.every((x) => !x.to), `시프팅 목록 ${confN + 2}행 — 예보 두 행(keep · 선적 자리 없음)`, JSON.stringify(slK[0]));
  //  카고플랜 칸 — 22베이 86단 05·07줄이 'keep'
  const pm = T.buildPosMap(Object.values(v1.discharge.ediContainers));
  let mk = null;
  for (const key of ['22', '(22)23', '(22)21', '(22)']) { try { const r = T.buildBayMarks(key, pm, 'KRPTK', () => 'F', {}, () => null, () => false, disp); if (r && r.shifts && r.shifts.get(86)) { mk = r; break; } } catch (e) { /* 다음 꼴 */ } }
  ok(!!mk && mk.shifts.get(86).get('05') === 'keep' && mk.shifts.get(86).get('07') === 'keep', '카고플랜 칸 22-05-86 · 22-07-86 = «keep»(노란 ◆)', mk ? JSON.stringify([...mk.shifts.get(86)]) : '없음');

  console.log('⑤ 플래너가 확정하면 — 확정(파란 ◆)이 이긴다');
  const rl = clone(FX.voyage.restowList);
  rl[K1] = { fe: 'F', from: '0220586', to: '0220586', pod: 'CNDAI', pol: 'PHDVO', sztp: '40RH' };
  rl._meta = { ...rl._meta, total: (rl._meta.total || 0) + 1 };
  const v3 = voy(mail(), rl);
  const fc3 = T.keepShiftForecastOf(VK + '_c', v3);
  const disp3 = T.shiftingMapForDisplay(VK + '_c', v3);
  ok(!fc3[K1] && !!fc3[K2] && !!disp3[K1] && !T.isKeepShift(disp3[K1]) && T.isKeepShift(disp3[K2]), '선사 시프팅 목록에 든 MNBU0129687 은 확정 · MNBU3119872 만 예보', JSON.stringify(Object.keys(fc3)));

  console.log('⑥ 자료별 대조 — «POD 확정 — 평택 아님(참고)» 줄');
  const R = T.reconcileSources(voy(mail()), 'discharge', { voyageKey: VK });
  const ref = (R.ref || []).filter((x) => x.keep);
  ok(ref.length === 2 && /CNDAI · 선사 지시 본선 잔류 \(메일 10-24 12:49\)/.test(ref[0].pick || '') && !(R.groups || []).some((g) => g.items.some((x) => x.cn === K1)), '두 대는 참고 줄(묶음 아님) · «CNDAI · 선사 지시 본선 잔류 (메일 10-24 12:49)»', JSON.stringify(ref.map((x) => x.pick)));

  console.log('⑦ 쓰는 자리 — 수석·검수사만 · 되읽기');
  W.__memdb = { voyages: { [VK]: clone(FX.voyage) } };
  T.setActiveWorkChoice && T.setActiveWorkChoice({ name: ME });
  let e1 = null; try { await T.fbSetKeepOnboard(VK, K1, { pod: 'CNDAI' }, '박진우'); } catch (e) { e1 = e; }
  ok(!!e1 && e1.chiefOnly && !(W.__memdb.voyages[VK].keepOnboard), '일반 검수원 이름으로는 막힌다(쓰지 않음)', e1 && e1.message);
  let e2 = null; try { await T.fbSetKeepOnboard(VK, K1, { pod: 'KRPTK' }, ME); } catch (e) { e2 = e; }
  ok(!!e2 && /평택이 아닌 항구/.test(e2.message), '양하항이 평택이면 거절', e2 && e2.message);
  const saved = await T.fbSetKeepOnboard(VK, K1, { pod: ' cndai ', mailAt: '10-24 12:49', note: 'Pls keep below cntrs onboard for CNDAI discharge' }, ME);
  const back = W.__memdb.voyages[VK].keepOnboard[K1];
  ok(back && back.pod === 'CNDAI' && back.by === ME && back.pod_orig === 'KRPYOTM' && back.mailAt === '10-24 12:49' && saved.pod === 'CNDAI', '저장 — 양하항 대문자·원래 POD(리스트 KRPYOTM)·메일 시각·보낸 사람', JSON.stringify(back));
  ok(JSON.stringify(W.__memdb.voyages[VK].discharge.records[K1]) === JSON.stringify(FX.voyage.discharge.records[K1]) && JSON.stringify(W.__memdb.voyages[VK].discharge.ediContainers[K1]) === JSON.stringify(FX.voyage.discharge.ediContainers[K1]),
    '리스트·EDI 행은 건드리지 않는다(되돌릴 근거)');
  ok((await T.fbGetKeepOnboard(VK, K1)).pod === 'CNDAI', '읽기 함수가 같은 값을 돌려준다');
  await T.fbClearKeepOnboard(VK, K1, ME);
  const cl = (W.__memdb.voyages[VK].keepOnboard || {})[K1];
  ok(!!cl && cl.cleared === true && cl.clearedBy === ME && !T.keepOnboardOf(W.__memdb.voyages[VK])[K1] && T.ptkDischargeUnitsOf(W.__memdb.voyages[VK]).set.has(K1),
    '풀기 — 줄은 «풀림» 으로 남고(수집기가 다시 넣지 않게) 판정에서는 빠져 평택 양하로 돌아온다', JSON.stringify(cl));
  await T.fbSetKeepOnboard(VK, K1, { pod: 'CNDAI' }, ME);
  ok(!W.__memdb.voyages[VK].keepOnboard[K1].cleared && !!T.keepOnboardOf(W.__memdb.voyages[VK])[K1], '푼 뒤 다시 넣으면 다시 지시(풀림 표시 없음)');
  W.__updDrop = (p) => /keepOnboard/.test(p);
  let e3 = null; try { await T.fbClearKeepOnboard(VK, K1, ME); } catch (e) { e3 = e; }
  W.__updDrop = null;
  ok(!!e3 && e3.unverified === true && /되읽은 값이 다릅니다/.test(e3.message) && !W.__memdb.voyages[VK].keepOnboard[K1].cleared, '풀기가 서버에 안 닿으면(되읽기 다름) «다시 눌러 주십시오» 로 알린다 — 조용히 넘어가지 않는다', e3 && e3.message);

  console.log('⑧ 컨 상세 — POD 변경 줄 · 단추');
  W.__memdb = { voyages: { [VK]: { ...clone(FX.voyage), keepOnboard: mail() } } };
  const row = { ...FX.voyage.discharge.ediContainers[K1], ...FX.voyage.discharge.records[K1], _mode: 'discharge' };
  W.__renderDetail({ c: row, mode: 'discharge', voyageKey: VK, voyageInfo: FX.voyage.info, inspector: ME, records: FX.voyage.discharge.records, allContainers: [row] });
  await wait(500);
  const k = doc.querySelector('[data-keep="1"]');
  ok(!!k && /선사 지시 — 본선 잔류 예정\(평택에서 안 내림 · 확정 아님\)/.test(k.textContent) && /POD 변경 KRPYOTM → CNDAI · 선사 메일 10-24 12:49/.test(k.textContent) && /평택 양하 대수는 자료\(EDI·리스트\)대로/.test(k.textContent) && !/대수에서 뺍니다/.test(k.textContent) && !!doc.querySelector('[data-keep-clear]'),
    '«🟡 선사 지시 — 본선 잔류 예정(… 확정 아님)» · «POD 변경 KRPYOTM → CNDAI · 선사 메일 10-24 12:49» · «대수는 자료대로»(4.48-03) · [지시 풀기](검수사)', k ? k.textContent.slice(0, 200) : doc.body.textContent.slice(0, 200));
  W.__memdb = { voyages: { [VK]: clone(FX.voyage) } };
  const row2 = { ...FX.voyage.discharge.ediContainers.MNBU0567132, ...FX.voyage.discharge.records.MNBU0567132, _mode: 'discharge' };
  W.__renderDetail({ c: row2, mode: 'discharge', voyageKey: VK, voyageInfo: FX.voyage.info, inspector: ME, records: FX.voyage.discharge.records, allContainers: [row2] });
  await wait(400);
  const ob = doc.querySelector('[data-keep-open]');
  ok(!!ob && !doc.querySelector('[data-keep="1"]'), '지시 없는 컨 — [＋ 본선 잔류 지시 넣기] 단추(검수사)');
  ok(!!ob && /본선 잔류 지시 넣기/.test(ob.textContent) && !/🟡/.test(ob.textContent) && !/yellow/.test(ob.className), '4.49-03 — 지시 없는 컨의 단추는 상태처럼 안 읽힌다(노란색·🟡 없음 · «지시 넣기» 문구)');
  ob && ob.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(150);
  const setVal = (sel, v) => { const el = doc.querySelector(sel); if (!el) return; const d = Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value'); d.set.call(el, v); el.dispatchEvent(new W.Event('input', { bubbles: true })); };
  setVal('[data-keep-pod-input]', 'cndai'); setVal('[data-keep-mail-input]', '10-24 12:49'); await wait(100);
  const sv = doc.querySelector('[data-keep-save]');
  sv && sv.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(500);
  const kb = (W.__memdb.voyages[VK].keepOnboard || {}).MNBU0567132;
  ok(!!kb && kb.pod === 'CNDAI' && kb.by === ME && !!doc.querySelector('[data-keep="1"]'), '단추로 저장하면 노드가 생기고 상세에 바로 줄이 뜬다', JSON.stringify(kb));
  W.__renderDetail({ c: row2, mode: 'discharge', voyageKey: VK, voyageInfo: FX.voyage.info, inspector: '박진우', records: FX.voyage.discharge.records, allContainers: [row2] });
  await wait(400);
  ok(!!doc.querySelector('[data-keep="1"]') && !doc.querySelector('[data-keep-clear]') && !doc.querySelector('[data-keep-open]'), '일반 검수원 — 줄은 보이고 [지시 풀기]·단추는 없다');
  const cn3 = Object.keys(FX.voyage.discharge.records).find((x) => ![K1, K2, 'MNBU0567132'].includes(x));
  const row3 = { ...FX.voyage.discharge.ediContainers[cn3], ...FX.voyage.discharge.records[cn3], _mode: 'discharge' };
  W.__renderDetail({ c: row3, mode: 'discharge', voyageKey: VK, voyageInfo: FX.voyage.info, inspector: '박진우', records: FX.voyage.discharge.records, allContainers: [row3] });
  await wait(400);
  ok(!doc.querySelector('[data-keep="1"]') && !doc.querySelector('[data-keep-open]'), `일반 검수원 · 지시 없는 컨(${cn3}) — [＋ 본선 잔류 지시 넣기] 단추가 없다(수석·검수사만)`);
  W.__renderDetail({ c: row2, mode: 'loading', voyageKey: VK, voyageInfo: FX.voyage.info, inspector: ME, records: {}, allContainers: [row2] });
  await wait(300);
  ok(!doc.querySelector('[data-keep="1"]') && !doc.querySelector('[data-keep-open]'), '선적 화면에서는 안 보인다(양하만)');

  console.log('⑨ 검증 상자 — 위 칸은 지금 자료 그대로 · 앱 예상(메일 적용)은 따로 한 줄 + 메일 근거(검수사 2026-10-24 19:16)');
  const v9 = voy(mail());
  const recArr = Object.values(v9.discharge.records);
  const ediArr = Object.values(v9.discharge.ediContainers).filter((c) => c.pod === 'KRPTK');
  const disp9 = T.shiftingMapForDisplay(VK + '_9', v9);
  const sl9 = T.shiftingListOf(disp9, v9.discharge.ediContainers, v9);
  W.__renderValidation({ ediContainers: ediArr, records: recArr, mode: 'discharge', shiftingList: sl9, voyageKey: VK });
  await wait(300);
  const ks = doc.querySelector('[data-shift-keep]'), ax = doc.querySelector('[data-app-expect]'), ev9 = doc.querySelector('[data-keep-evid]');
  const listN = recArr.length, conf9 = sl9.length - 2, tx9 = doc.body.textContent.replace(/\s+/g, ' ');
  ok(!!ks && new RegExp(`총 작업 ${listN + conf9}대 = 리스트 ${listN} \\+ 쉬프팅 ${conf9}`).test(tx9) && !doc.querySelector('[data-keep-in-list]'),
    `위 칸 — «총 작업 ${listN + conf9}대 = 리스트 ${listN} + 쉬프팅 ${conf9}» (지금 자료 그대로 · 확정 아님이라 본선 잔류를 빼지 않는다)`, tx9.slice(0, 300));
  ok(!!ax && (([, l9, , s9]) => `${l9}/${s9}`)(ax.getAttribute('data-app-expect').split('/')) === `${listN - 2}/${sl9.length}` && new RegExp(`앱 예상\\(선사 메일 수정 2건 적용 · 확정 아님\\)`).test(ax.textContent) && new RegExp(`총 작업 ${listN - 2 + sl9.length}대`).test(ax.textContent),
    `앱 예상 줄 — 리스트 ${listN - 2} · 쉬프팅 ${sl9.length}(예보◆2) · 총 작업 ${listN - 2 + sl9.length}대`, ax && ax.textContent);
  ok(!!ev9 && ev9.getAttribute('data-keep-evid').split(',').sort().join(',') === [K1, K2].sort().join(',') && /선사 메일 10-24 12:49/.test(ev9.textContent) && /→ CNDAI/.test(ev9.textContent),
    '메일 근거 — 지시 기록 없이 시프팅 목록만 받아도 «선사 메일 10-24 12:49 · 두 컨 → CNDAI»', ev9 && ev9.textContent);

  console.log('⑩ 입구들 — 4.48-03: 지시는 예정이라 어느 입구에서든 평택 양하는 자료대로(4.48 은 두 대를 뺐다 — 검수사 20:07 «예정으로만 남겨도 되는걸 실제처럼 수정해서»)');
  const vA = voy(mail()); vA.key = VK;
  const ssA = T.shiftSplitOf(VK, vA).set;
  const pr0 = T.progressOf(vA.discharge, 'discharge', ssA), pr1 = T.progressOf(vA.discharge, 'discharge', ssA, undefined, vA.keepOnboard);
  ok(pr1.ptk.total === pr0.ptk.total && pr1.listTotal === pr0.listTotal, `진행 숫자 한 벌(progressOf) — 지시를 넘겨도 평택분 ${pr0.ptk.total} → ${pr1.ptk.total}(홈 카드·수석 보드·현황 요약 — 자료대로)`, `${pr0.ptk.total}/${pr1.ptk.total}`);
  const cs0 = T.computeStats(vA.discharge, 'discharge', vA.info, VK, ssA), cs1 = T.computeStats(vA.discharge, 'discharge', vA.info, VK, ssA, vA.keepOnboard);
  ok(cs1.total === cs0.total && cs1.ptk === cs0.ptk, `홈 카드 computeStats — 막대 ${cs0.total} → ${cs1.total} · 완료 확인 창 평택분 ${cs0.ptk} → ${cs1.ptk}(자료대로)`, JSON.stringify({ a: [cs0.total, cs0.ptk], b: [cs1.total, cs1.ptk] }));
  const src = (f) => fs.readFileSync(require('path').join(root, f), 'utf8');
  const hp = src('src/pages/HomePage.jsx'), cd = src('src/pages/ChiefDashboard.jsx'), vsc = src('src/components/VoyageSummaryCard.jsx');
  ok(/computeStats\(dis, 'discharge', voyage\.info, voyage\.key, _shiftSet, voyage\.keepOnboard\)/.test(hp) && /computeStats\(v\?\.discharge, 'discharge', undefined, undefined, (?:undefined|v \? shiftCnSetOf\(completeTarget\.key, v\) : undefined), v\?\.keepOnboard\)/.test(hp)
    && /computeStats\(v\.discharge, 'discharge', _ss, v\.keepOnboard\)/.test(cd) && /progressOf\(section, mode, shiftSet, ptkCns, keepOnboard\)/.test(cd) && /progressOf\(sec, mode, _shiftSet, undefined, voyage && voyage\.keepOnboard\)/.test(vsc),
    '배선 — 홈 카드·완료 확인 창·수석 보드·현황 요약이 voyage.keepOnboard 를 넘긴다');
  const rowsA = Object.values(vA.discharge.ediContainers).map((c) => ({ ...c, _mode: 'discharge' }));
  const ad0 = T.applyDischargeUnits(rowsA, { discharge: { records: vA.discharge.records } }, ssA), ad1 = T.applyDischargeUnits(rowsA, { keepOnboard: vA.keepOnboard, discharge: { records: vA.discharge.records } }, ssA);
  const r1 = ad1.rows.find((x) => x.cn === K1) || {};
  ok(ad1.U.set.size === ad0.U.set.size && r1._ptk === true && !r1._extraOfList, `콘앱 미르 행(applyDischargeUnits) — 지시 두 대도 _ptk(자료대로) · «세관 목록 밖 추가분» 표식 없음 (${ad0.U.set.size} → ${ad1.U.set.size})`, JSON.stringify({ n: [ad0.U.set.size, ad1.U.set.size], r1: { p: r1._ptk, x: r1._extraOfList } }));
  //  ★ 4.48-04 (4.48-03 라이브 확인 — 콘앱 미르 «양하 315대» ↔ 검수앱 317) — 콘앱 미르·미르 4.20 갈래는 **표시용 지도**(예보 노란 ◆ 를 싣는다)에서 시프팅 집합을 만든다.
  {
    const dispK = T.shiftingMapForDisplay(VK, vA);
    const rawSet = new W.Set(Object.keys(dispK).filter((k) => k && !k.startsWith('_')));   // 4.48-03 까지의 만들기(예보도 시프팅으로) · 번들(jsdom 창)의 Set 으로 만든다(바깥 Set 은 instanceof 가 안 맞아 빈 집합으로 읽힌다)
    const unitSet = T.shiftSetForUnitsOf(dispK);
    const adR = T.applyDischargeUnits(rowsA, { keepOnboard: vA.keepOnboard, discharge: { records: vA.discharge.records } }, rawSet);
    const adU = T.applyDischargeUnits(rowsA, { keepOnboard: vA.keepOnboard, discharge: { records: vA.discharge.records } }, unitSet);
    const pK = (ad) => ad.rows.filter((x) => x && x._ptk && (x._mode || 'discharge') === 'discharge').length;
    ok(rawSet.has(K1) && rawSet.has(K2) && !unitSet.has(K1) && !unitSet.has(K2) && unitSet.size === rawSet.size - 2 && pK(adU) === pK(ad1) && pK(adR) === pK(ad1) - 2,
      `콘앱 미르 갈래(표시용 지도로 만든 시프팅 집합) — 예보 두 대는 집합에서 빠지고 평택 양하 ${pK(ad1)}(검수앱과 같은 답) · 종전 만들기는 ${pK(adR)}(4.48-03 라이브 콘앱 미르 315 재현)`, JSON.stringify({ raw: rawSet.size, unit: unitSet.size, n: [pK(ad1), pK(adU), pK(adR)] }));
    const coneS0 = src('public/cone.html'), mirS0 = src('src/mir.js');
    ok(/const _shS=window\.ConeMir\.shiftSetForUnitsOf \? window\.ConeMir\.shiftSetForUnitsOf\(shiftMap\)/.test(coneS0) && /window\.ConeMir\.applyDischargeUnits\(cs, \{[^\n]*\}, _shS\)/.test(coneS0)
      && /const ss = shiftSetForUnitsOf\(c\.shiftMap\);[^\n]*\n\s+c\.containers = applyDischargeUnits\(/.test(mirS0) && /shiftSetForUnitsOf \} from '\.\/utils\.js'/.test(src('src/mirCore.entry.js'))
      && /window\.__CONEV='ConeOne 2\.7(1-0[23]|2(-0[1-9])?)'/.test(coneS0),   // 4.53: 콘앱 2.72
      '배선 — 콘앱 미르(ConeOne 2.71-02 이상)·미르 4.20 갈래가 shiftSetForUnitsOf 로 시프팅 집합을 만든다 · mir-core 가 내보낸다');
    //  4.48-04 감사(하-2): 콘앱 `_shS` 줄을 떼어 실제로 돌린다 — 새 본체(ConeMir.shiftSetForUnitsOf 있음)와 옛 본체(없음 → 인라인 대체)가 같은 집합인가.
    const shLine = (coneS0.match(/\n\s*(const _shS=window\.ConeMir\.shiftSetForUnitsOf[^\n]*)\n/) || [])[1] || '';
    const runSh = (cm) => { try { return [...new Function('window', 'shiftMap', shLine + '\nreturn _shS;')({ ConeMir: cm }, dispK)].sort(); } catch (e) { return ['ERR ' + e.message]; } };
    const want = [...unitSet].sort();
    const shNew = runSh({ shiftSetForUnitsOf: T.shiftSetForUnitsOf }), shOld = runSh({});
    ok(!!shLine && JSON.stringify(shNew) === JSON.stringify(want) && JSON.stringify(shOld) === JSON.stringify(want) && !shOld.includes(K1),
      `콘앱 _shS 줄 실행 — 새 본체 ${shNew.length}키 · 옛 본체(인라인 대체) ${shOld.length}키 = utils ${want.length}키(예보 두 대 없음)`, JSON.stringify({ n: shNew.length, o: shOld.length, w: want.length }));
  }
  const vcA0 = T.voyageCountsOf(voy(null)), vcA1 = T.voyageCountsOf(vA);
  ok(vcA1.byMode.discharge.total === vcA0.byMode.discharge.total, `미르 잔여·무브수 분모(voyageCountsOf) ${vcA0.byMode.discharge.total} → ${vcA1.byMode.discharge.total}(자료대로)`, JSON.stringify([vcA0.byMode.discharge, vcA1.byMode.discharge]));
  const dispA = T.shiftingMapForDisplay(VK, vA), confA = T.computeShiftingMapCached(VK, vA), cN = Object.keys(confA).length;
  const contsA = Object.values(vA.discharge.ediContainers);
  const planHead = async (pr) => { W.__renderPlan({ containers: contsA, mode: 'discharge', voyageInfo: vA.info, shipName: 'MAMP', ...pr }); await wait(400); const el = doc.querySelector('[data-cp-count]'); return el ? el.getAttribute('data-cp-count') : ''; };
  const hN = (await planHead({})).split('/')[0] * 1;
  const hK = await planHead({ shiftingMap: dispA, keepOnboard: vA.keepOnboard });
  const hM = await planHead({ shiftingMap: dispA });
  ok(hK === `${hN}/${hN + cN}` && hM === hK, `종이 카고플랜 머리 — «양하 ${hN} · 쉬프팅 ${cN} 예보◆2 · 작업분 ${hN + cN}»(양하는 자료대로 · 예보 두 칸은 작업분에서 한 번만 · keepOnboard 없이 지도만 받아도 같다)`, `${hN} ${hK} ${hM}`);
  ok(/keepOnboard=\{voyage\?\.keepOnboard\}/.test(src('src/pages/VoyagePage.jsx')) && /keepOnboard=\{voyage\?\.keepOnboard\}/.test(src('src/components/PrintHubModal.jsx')), '배선 — 항차 화면·출력 센터 카고플랜이 keepOnboard 를 넘긴다');
  const slA = T.shiftingListOf(dispA, vA.discharge.ediContainers, vA);
  const dgA = (cns) => (T.runDiagnostics({ ediContainers: contsA.filter((c) => c.pod === 'KRPTK'), listRecords: Object.values(vA.discharge.records), mode: 'discharge', shiftCns: cns, voyage: vA, voyageKey: VK }) || []).find((a) => a.code === 'source_recon');
  const ra = dgA(slA.filter((x) => !x.keep).map((x) => x.cn)), rb = dgA(slA.map((x) => x.cn));
  ok(!!ra && ra.details.unknown === 0 && (ra.details.ref || []).filter((x) => x.keep).length === 2 && !/번호 없음/.test(ra.msg) && /적용하면 37 · 터미널 배정 39\(터미널은 아직 선사 메일 수정 전\)/.test(ra.msg) && (!rb || !/번호 없음/.test(rb.msg)),
    '주의 박스 자료별 대조 — 지시 두 대는 참고 줄 2 · «번호 없음» 0 · «적용하면 37 · 터미널 배정 39(아직 수정 전)»(4.48-03 — 앱 수가 자료대로라 터미널과 차이 없음 · 예보까지 넘겨도 «번호 없음» 없음)', JSON.stringify({ a: ra && [ra.msg, ra.details.explained, ra.details.unknown], b: rb && rb.msg }));
  ok(/shiftCns: shiftingList\.filter\(\(x\) => x && !x\.keep\)\.map\(\(x\) => x\.cn\)/.test(src('src/pages/VoyagePage.jsx')), '배선 — 항차 화면이 주의 박스에 예보를 뺀 목록을 넘긴다');
  ok(/keepShiftForecastOf\(voyageKey, voyage, null, \{ confirmed: shiftingMap \}\)/.test(src('src/components/PrintHubModal.jsx')) && /shiftingListOf\(\{ \.\.\.shiftingMap, \.\.\._fc \}, fullEdiMap, voyage\)/.test(src('src/components/PrintHubModal.jsx')),
    '배선 — 출력 센터 검수 리스트 [별첨2]가 확정 + 예보를 싣는다(항차 화면 ◆ 목록 인쇄와 같은 수)');
  const tm = T.answerTotalMoves(vA, 'MAMP', { eta: { units: 100, moves: 90, exact: true, twinLifts: 10, singles: 80, dis: 37, lod: 0, disMoves: 30, lodMoves: 0, shiftN: cN, shiftMoves: 2 * cN } });
  ok(new RegExp(`시프팅 ${cN + 2} \\(확정 ${cN} · 🟡 예보 2 — 선사 지시 본선 잔류`).test(tm) && !/예측 — 확정 아님/.test(tm), `미르 «총 무브수» — «시프팅 ${cN + 2} (확정 ${cN} · 🟡 예보 2 — 선사 지시 본선 잔류 …)» («예측»이라 부르지 않는다)`, tm.split('\n').pop());
  const coneSrc = src('public/cone.html');
  ok(/if\(!shiftMap && state\.keepOnboard\)\{[\s\S]{0,1500}ctKeepShiftMap\(\{ _info: info \}/.test(coneSrc) && /console\.warn\('\[콘앱 2\.71\] 선사 지시 본선 잔류 읽기 실패 HTTP/.test(coneSrc),
    '배선 — 콘앱 미르 시프팅 지도에 예보를 얹는다(검수앱처럼 «🟡 시프팅 예보 2대») · 지시 읽기 HTTP 실패는 콘솔에 남긴다');
  const chips = src('src/pages/VoyagePage.jsx');
  ok(/const _isShiftRow = \(c\) => !!\(c && !c\._keep && /.test(chips), '항차 리스트 «◆ 시프팅 내림 x/N» 칩은 확정만(예보 두 대는 «🟡 본선 잔류» 칩)');
  const fcP = T.keepShiftForecastOf(VK + '_p', voy(mail()), null, { confirmed: { [K1]: { pos: '22-05-86', from: '22-05-86', to: '' }, [K2]: { from: '0220786', to: '0220786', _doc: true } } });
  ok(!!fcP[K1] && !fcP[K2] && /if\(!_o\[k\] \|\| \(!_o\[k\]\.to && !_o\[k\]\._doc && _o\[k\]\._forecast!=='keep'\)\) _o\[k\] = _kf\[k\];/.test(coneSrc),
    '넘겨받은 지도(콘앱)의 예측 ◇ 는 확정이 아니다 — 지시 컨은 예보(노란 ◆)로 · 선사 서류(확정)에 든 컨만 예보에서 빠진다 · 콘앱 카고플랜 합치기도 같은 규칙', JSON.stringify(Object.keys(fcP)));
  //  하 1 — 확정 지도가 없는 배(KSKM 2617N — 선사 서류·선적 EDI 없음)의 예측 ◇ 도 지시를 안다
  const P = T.PREGONE;
  T.setLaneRoutes({ IHS1: { rotation: ['CNXMN', 'KRINC', 'KRPTK'] } });
  W.__fbShipBayDict = { KSKM: { bayDef: { baysSummary: P.bay27 } } };
  const vkk = (keep, key) => ({ key, info: { ...P.info }, ...(keep ? { keepOnboard: keep } : {}), discharge: { raw: { edi: { text: P.text, fileName: 'KSKM2617NXMNB.ASC' } } }, loading: {} });
  const mk0 = T.shiftingMapForDisplay('KSKM_2617N', vkk(null, 'KSKM_2617N'));
  const mk1 = T.shiftingMapForDisplay('KSKM_2617N_k', vkk({ SEGU2430571: { pod: 'CNSHA', src: 'manual' } }, 'KSKM_2617N_k'));
  ok(Object.keys(mk0).join() === 'SEGU2523756' && T.isPredShift(mk0.SEGU2523756) && Object.keys(mk1).length === 0,
    'KSKM 2617N — 27-01-88 SEGU2430571 을 본선 잔류로 넣으면 그 위 27-01-90 SEGU2523756 의 ◇ 가 없어진다(내릴 평택 컨이 없으니 들 까닭이 없다) · 지시 없으면 ◇ 그대로', JSON.stringify({ a: Object.keys(mk0), b: Object.keys(mk1) }));
  W.__fbShipBayDict = { MAMP: FX.dict };

  console.log('⑪ 재감사 «부»(중 3 · 하 1) — 콘앱 카고플랜 · 매뉴얼 «예보» · 두 앱 총 무브수 · 연막 빈틈(R10 · R17 · R19)');
  ok(/keepOnboard: state\.keepOnboard \|\| null,\s+\/\/ 4\.48 감사\(중-A\)/.test(coneSrc), '배선 — 콘앱 카고플랜(cargoPlanPropsV2)도 keepOnboard 를 넘긴다(플래너 확정 뒤·아래 평택 컨 없는 지시도 검수앱과 같은 머리)');
  //  콘앱 카고플랜 머리 — 플래너가 MNBU0129687 을 확정한 뒤(선사 시프팅 목록) · 아래 평택 컨 없는 지시(MCAU5003650)
  const rlB = clone(FX.voyage.restowList); rlB[K1] = { fe: 'F', from: '0220586', to: '0220586', pod: 'CNDAI', pol: 'PHDVO', sztp: '40RH' }; rlB._meta = { ...rlB._meta, total: (rlB._meta.total || 0) + 1 };
  const vB = voy({ ...mail(), MCAU5003650: { cn: 'MCAU5003650', pod: 'CNDAI', src: 'manual' } }, rlB); vB.key = VK + '_B';
  const dispB = T.shiftingMapForDisplay(VK + '_B', vB), cntB = Object.keys(dispB).length;
  const hB0 = (await planHead({})).split('/')[0] * 1;
  W.__renderPlan({ containers: Object.values(vB.discharge.ediContainers), mode: 'discharge', voyageInfo: vB.info, shipName: 'MAMP', shiftingMap: dispB, keepOnboard: vB.keepOnboard }); await wait(400);
  const hB = (doc.querySelector('[data-cp-count]') || { getAttribute: () => '' }).getAttribute('data-cp-count');
  ok(hB === `${hB0 - 1}/${hB0 - 1 + cntB - 1}`, `카고플랜 머리 — 플래너가 확정한 지시(파란 ◆)만 양하에서 빠지고 예정 둘은 양하분에 그대로 · 예보 칸은 작업분에서 한 번만(«${hB0 - 1}/${hB0 - 1 + cntB - 1}» · 4.48-03)`, `${hB0} ${hB}`);
  const helpSrc = src('src/data/helpData.js'), fiSrc = src('src/data/featureIndex.js');
  const ht1 = String(T.generateHowToAnswer('연태 예보 어디 올려', null, { isChief: true }) || ''), ht2 = String(T.generateHowToAnswer('일조나 연태 예보는 어디다 올려야 하지?', null, { isChief: true }) || '');
  const ht3 = String(T.generateHowToAnswer('본선 잔류 어디서 넣어', null, { isChief: true }) || '');
  ok(!/'시프팅 예보'/.test(helpSrc) && !/'시프팅 예보'/.test(fiSrc) && /물량 예보 붙여넣기/.test(ht1) && !/본선 잔류/.test(ht1) && !/본선 잔류/.test(ht2) && /선사 지시 본선 잔류/.test(ht3),
    '매뉴얼 — «연태 예보 어디 올려» 에 본선 잔류 절이 따라붙지 않는다(키 «시프팅 예보» 없음) · «본선 잔류 어디서 넣어» 는 새 절', JSON.stringify([ht1.slice(0, 80), ht3.slice(0, 60)]));
  const vCone = { info: vA.info, key: VK, keepOnboard: vA.keepOnboard, restowList: vA.restowList, discharge: { records: vA.discharge.records } };
  const etaC = { units: 100, moves: 90, exact: true, twinLifts: 10, singles: 80, dis: 37, lod: 0, disMoves: 30, lodMoves: 0, shiftN: cN, shiftMoves: 2 * cN };
  const tmC = T.answerTotalMoves(vCone, 'MAMP', { eta: etaC, shifting: cN, keepFc: 2 });
  ok(tmC.split('\n').pop() === tm.split('\n').pop() && /keepFc: _cone \? _kfN : undefined/.test(src('src/mir.js')), `두 앱 같은 «총 무브수» 끝줄 — 콘앱(확정 ${cN} + 넘겨받은 예보 2) = 검수앱`, JSON.stringify([tmC.split('\n').pop(), tm.split('\n').pop()]));
  //  R10 — 예측 갈래(확정 지도 없음)에서 지시 컨이 ◇ 로 잡히는 실자료(KKAK 2606N 05베이 — 홀드 5-00-06 SEGU2269343 아래 평택 컨 · 덱 82 FTAU1132790)
  const KK = T.KKAK;
  W.__fbShipBayDict = { KKAK: KK.dict };
  const vKK = (keep, key) => ({ key, info: { ...KK.info }, ...(keep ? { keepOnboard: keep } : {}), discharge: { raw: { edi: { text: KK.text, fileName: KK.fileName } }, records: clone(KK.records) }, loading: {} });
  const kk0 = T.shiftingMapForDisplay('KKAK_2606N_0', vKK(null, 'KKAK_2606N_0'), KK.dict);
  const kkv = vKK({ SEGU2269343: { cn: 'SEGU2269343', pod: 'CNDAI', src: 'manual' } }, 'KKAK_2606N_1');
  const kkBase = T.predictedShiftingForDisplay(kkv, KK.dict), kk1 = T.shiftingMapForDisplay('KKAK_2606N_1', kkv, KK.dict);
  ok(!kk0.SEGU2269343 && T.isPredShift(kkBase.SEGU2269343) && T.isKeepShift(kk1.SEGU2269343) && !T.isPredShift(kk1.SEGU2269343) && T.isPredShift(kk1.FTAU1132790),
    'KKAK 2606N(확정 지도 없음) — 지시 컨 SEGU2269343(5-00-06)은 예측 판정에서 ◇ 로 잡히지만 화면에는 노란 ◆ 예보로 · 덱 FTAU1132790 ◇ 는 그대로', JSON.stringify({ base: !!kkBase.SEGU2269343, disp: kk1.SEGU2269343 && kk1.SEGU2269343._forecast }));
  W.__fbShipBayDict = { MAMP: FX.dict };
  //  R19 — 예보 캐시 서명은 확정 지도 «내용»으로 — 같은 대수·같은 길이의 다른 확정 지도면 다시 센다
  const vS = voy(mail()); const cA = { [K1]: { from: '0220586', to: '0220586', _doc: true } }, cB = { MSKU0000000: { from: '0010182', to: '0010182', _doc: true } };
  const fsA = T.keepShiftForecastOf(VK + '_sig', vS, null, { confirmed: cA }), fsB = T.keepShiftForecastOf(VK + '_sig', vS, null, { confirmed: cB });
  ok(!fsA[K1] && !!fsB[K1] && !!fsA[K2] && !!fsB[K2], '예보 캐시 — 확정 지도 키가 바뀌면(대수·길이 같아도) 다시 센다(K1 확정 → 예보 빠짐 · 다른 컨 확정 → K1 예보)', JSON.stringify([Object.keys(fsA), Object.keys(fsB)]));
  //  R17 — key 없이 그리는 자리(App·수석 보드)에서 저장이 늦게 끝나는 사이 컨이 바뀌면 앞 컨의 지시가 새 컨에 붙지 않는다
  W.__memdb = { voyages: { [VK]: clone(FX.voyage) } };
  const cnR = Object.keys(FX.voyage.discharge.records).filter((x) => ![K1, K2, 'MNBU0567132'].includes(x));
  const rowA = { ...FX.voyage.discharge.ediContainers[cnR[1]], ...FX.voyage.discharge.records[cnR[1]], _mode: 'discharge' };
  const rowBb = { ...FX.voyage.discharge.ediContainers[cnR[2]], ...FX.voyage.discharge.records[cnR[2]], _mode: 'discharge' };
  W.__renderDetailSame({ c: rowA, mode: 'discharge', voyageKey: VK, voyageInfo: FX.voyage.info, inspector: ME, records: FX.voyage.discharge.records, allContainers: [rowA] });
  await wait(300);
  const obR = doc.querySelector('[data-keep-open]'); obR && obR.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(120);
  setVal('[data-keep-pod-input]', 'CNDAI'); await wait(80);
  W.__memlag = 400;
  const svR = doc.querySelector('[data-keep-save]'); svR && svR.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  await wait(60);
  W.__renderDetailSame({ c: rowBb, mode: 'discharge', voyageKey: VK, voyageInfo: FX.voyage.info, inspector: ME, records: FX.voyage.discharge.records, allContainers: [rowBb] });
  await wait(900); W.__memlag = 0;
  const kR = doc.querySelector('[data-keep="1"]'), podIn = doc.querySelector('[data-keep-pod-input]');
  ok(!!obR && !!(W.__memdb.voyages[VK].keepOnboard || {})[cnR[1]] && !kR && !podIn && !!doc.querySelector('[data-keep-open]'),
    `컨 상세(key 없이 그림) — ${cnR[1].slice(-4)} 저장이 늦게 끝나는 사이 ${cnR[2].slice(-4)} 로 바뀌면 새 컨에 앞 컨 지시 줄·입력칸이 남지 않는다(저장은 앞 컨에 됨)`, kR ? kR.textContent.slice(0, 120) : (podIn ? '입력칸 남음' : ''));

  console.log('⑫ 4.48-01 — 주의 박스: «EDI · 선사 리스트 · 세관 리스트 · 선사 메일 수정 N건 적용하면» (검수사 2026-10-24 17:05~17:07)');
  {
    const vD = voy(mail()); vD.key = VK;
    const dispD = T.shiftingMapForDisplay(VK + '_D', vD), slD = T.shiftingListOf(dispD, vD.discharge.ediContainers, vD);
    const UD = T.ptkDischargeUnitsOf(vD), _kD = T.keepOnboardOf(vD); const ediD = {}; for (const c of Object.values(vD.discharge.ediContainers)) if (c && c.cn && UD.set.has(c.cn) && !_kD[c.cn]) ediD[c.cn] = c;   // 항차 화면 진단 입력과 같은 평택 양하분(4.48-03: 유닛은 지시 컨을 세고 진단 입력만 _keepDiag 로 뺀다)
    const recD = {}; for (const [cn, r] of Object.entries(vD.discharge.records)) recD[cn] = { ...r, cn };
    const dg = (keepCns) => T.runDiagnostics({ keepCns, ediContainers: ediD, listRecords: recD, mode: 'discharge', shiftCns: slD.filter((x) => !x.keep).map((x) => x.cn), voyage: vD, voyageKey: VK + '_D' }) || [];
    const a1 = dg([K1, K2]), a0 = dg([]);
    const rc = a1.find((a) => a.code === 'source_recon');
    ok(!a1.some((a) => a.code === 'list_extra' && (a.details.extraCns || []).some((cn) => cn === K1 || cn === K2)) && a0.some((a) => a.code === 'list_extra' && (a.details.extraCns || []).includes(K1)),
      '두 대는 «리스트에 EDI 평택과 매칭 안되는 컨» 에서 빠진다(keepCns 를 안 넘기면 종전처럼 2개 — 고치기 전)', JSON.stringify(a1.map((a) => a.code)));
    ok(!!rc && /^자료별 대조 — EDI \d+ · 선사 리스트 (\d+|자료 없음) · 세관 리스트 (\d+|자료 없음) · 선사 메일 수정 2건\(본선 잔류 CNDAI — 평택에서 안 내림\) 적용하면 \d+/.test(rc.msg),
      '자료별 대조 문구 — «EDI · 선사 리스트 · 세관 리스트 · 선사 메일 수정 2건(본선 잔류 CNDAI) 적용하면 N»', rc && rc.msg);
    ok(/keepCns: Object\.keys\(keepOnboardOf\(voyage\)\)/.test(src('src/pages/VoyagePage.jsx')), '배선 — 항차 화면이 진단에 keepCns 를 넘긴다');
    //  감사(중-3) — 문구 전체 · 지시 없는 배 · 터미널 숫자가 다를 때 · 터미널이 이미 반영했을 때 · POD 확정 참고가 같이 있을 때 · 다른 어긋남이 같이 있을 때(하-1)
    const mk = (keep, tweak, keepCns) => { const v = voy(keep); v.key = VK; if (tweak) tweak(v);
      const disp = T.shiftingMapForDisplay(VK + '_M' + (++__mkn), v), sl = T.shiftingListOf(disp, v.discharge.ediContainers, v);
      const U = T.ptkDischargeUnitsOf(v), _kv = T.keepOnboardOf(v); const ed = {}; for (const c of Object.values(v.discharge.ediContainers)) if (c && c.cn && U.set.has(c.cn) && !_kv[c.cn]) ed[c.cn] = c;
      const rec = {}; for (const [cn, r] of Object.entries(v.discharge.records)) rec[cn] = { ...r, cn };
      return T.runDiagnostics({ keepCns: keepCns || Object.keys(T.keepOnboardOf(v)), ediContainers: ed, listRecords: rec, mode: 'discharge', shiftCns: sl.filter((x) => !x.keep).map((x) => x.cn), voyage: v, voyageKey: VK + '_M' }) || []; };
    let __mkn = 0;
    const one = (al, code) => al.filter((a) => a.code === code);
    const HEAD = '자료별 대조 — EDI 39 · 선사 리스트 39 · 세관 리스트 자료 없음 · 선사 메일 수정 2건(본선 잔류 CNDAI — 평택에서 안 내림)';
    ok(!!rc && rc.msg === HEAD + ' 적용하면 37 · 터미널 배정 39(터미널은 아직 선사 메일 수정 전)' && rc.voice === '선사 메일 수정 2건, 터미널은 아직 수정 전',
      '문구 전체 — «… 적용하면 37 · 터미널 배정 39(터미널은 아직 선사 메일 수정 전)» · 음성도 같은 말(22베이 사본 — EDI 39 · 배정 39)', rc && rc.msg + ' / ' + rc.voice);
    const b0 = mk(null);
    ok(!b0.some((a) => ['source_recon', 'keep_onboard', 'list_extra'].includes(a.code)), '지시 없는 배 — 자료별 대조·본선 잔류·매칭 안 되는 컨 줄이 안 선다(종전과 같음)', JSON.stringify(b0.map((a) => a.code + ':' + a.msg)));
    const c1 = one(mk(mail(), (v) => { v.info.planDis = 40; }), 'source_recon')[0];
    ok(!!c1 && c1.msg.startsWith(HEAD + ' 적용하면 37 · 터미널 배정 40 · 앱 39 (-1) · 번호 없음 1대') && !/수정 전/.test(c1.msg) && c1.voice === '터미널과 1대 차이',
      '터미널 배정 40(자료 39 와도 다름) — «적용하면 37 · 터미널 배정 40 · 앱 39 (-1)»(4.48-03: 앱 수는 자료대로) · «수정 전» 이라 하지 않는다', c1 && c1.msg);
    const d1 = mk(mail(), (v) => { v.info.planDis = 37; });
    const d1k = one(d1, 'keep_onboard')[0];
    const d1r = one(d1, 'source_recon')[0];
    ok(!!d1r && d1r.msg === HEAD + ' 적용하면 37 · 터미널 배정 37(터미널은 선사 메일 반영 — EDI·리스트 수정본 대기)' && d1r.level !== 'critical' && !d1k && /msg: `선사 메일 수정 \$\{keepFound\.length\}건 — 본선 잔류 예정\(평택에서 안 내림 · 확정 아님\) · 평택 양하 대수는 자료대로`/.test(src('src/diagnostics.js')),
      '터미널이 먼저 반영(배정 37 = 앱 예상) — «… 적용하면 37 · 터미널 배정 37(터미널은 선사 메일 반영 — EDI·리스트 수정본 대기)» · 자료별 대조 줄이 서면 정보 줄은 겹쳐 내지 않음 · 정보 줄 문구 «본선 잔류 예정 … 대수는 자료대로»(4.48-03 — 빨간 경고 없음)', JSON.stringify(d1.map((a) => a.code + ':' + a.level + ':' + a.msg)));
    let _pk = '';
    const e1 = one(mk(mail(), (v) => { _pk = Object.keys(v.discharge.records).find((c) => c !== K1 && c !== K2); v.discharge.records[_pk].pod_pick = 'manual'; v.discharge.records[_pk].pod = 'CNSHA'; }), 'source_recon')[0];
    ok(!!e1 && e1.msg === HEAD + ' · POD 확정 평택 아님 1대 적용하면 36 · 터미널 배정 39 · 앱 38 (-1)',
      `POD 확정(평택 아님) 참고 1대(${_pk})가 같이 있으면 «· POD 확정 평택 아님 1대 적용하면 36»(39 − 2 − 1 · 감사 중-1)`, e1 && e1.msg);
    let _ek = '';
    const g1 = one(mk(mail(), (v) => { _ek = Object.keys(v.discharge.ediContainers).find((c) => c !== K1 && c !== K2 && v.discharge.records[c]); delete v.discharge.ediContainers[_ek]; }), 'source_recon')[0];
    ok(!!g1 && /— 어긋남 1대 · 선사 메일 수정 2건\(본선 잔류 CNDAI — 평택에서 안 내림\) 적용하면 앱 37 · 터미널 배정 39\(터미널은 아직 선사 메일 수정 전\)$/.test(g1.msg),
      `다른 어긋남이 같이 있으면(EDI 에서 ${_ek} 뺀 사본) «어긋남 1대 · 선사 메일 수정 2건(…) 적용하면 앱 37 · 터미널 배정 39(… 수정 전)»(감사 하-1)`, g1 && g1.msg);
    const dp = src('src/components/DiagnosticsPanel.jsx');
    ok(/data-recon-group="keep"/.test(dp) && /선사 메일 수정 — 본선 잔류 예정\(평택에서 안 내림 · 확정 아님 · 참고\)/.test(dp) && /터미널은 아직 선사 메일 수정 전\(본선 잔류 예정 \$\{_kRefN\}대 · 앱 예상 \$\{_kApp\}대\)/.test(dp),
      '주의 박스 펼친 칸 — 본선 잔류는 «POD 확정 — 평택 아님» 과 따로 묶고 터미널 줄도 «아직 선사 메일 수정 전»(감사 하-3)');
    const vp = src('src/pages/VoyagePage.jsx');
    const _ip = vp.slice(vp.indexOf('const isPtk = (c) => {'), vp.indexOf('const isPtk = (c) => {') + 2600);
    ok(/const _keepDiag = mode === 'discharge' \? keepOnboardOf\(voyage\) : \{\};[\s\S]{0,300}if \(!isPtkC\) return;\s*\n\s*if \(c\.cn && _keepDiag\[c\.cn\]\) return;/.test(vp) && !/keepOnboardOf/.test(_ip),
      '진단 입력(EDI 평택분)에서만 본선 잔류를 뺀다 — 항차 화면 isPtk 는 그대로(리스트 없는 배도 목록에 «🟡 본선 잔류» 줄이 남는다 · 재감사 중-1)');
    //  3차 감사(하-1) — 플래너가 지시 두 대를 선사 시프팅 목록에 넣으면(확정) 주의 박스 말이 4.48 과 같다(«시프팅으로 셈» · 본선 잔류 줄 없음 — 4.48 번들로 뽑은 값)
    const _rs2 = (v) => { const r = v.restowList; r[K1] = { fe: 'F', from: '0220586', to: '0220586', pod: 'CNDAI', pol: 'PHDVO', sztp: '40RH' }; r[K2] = { fe: 'F', from: '0220786', to: '0220786', pod: 'CNDAI', pol: 'PHDVO', sztp: '40RH' }; r._meta = { ...r._meta, total: (r._meta.total || 0) + 2 }; };
    const sig = (al) => al.filter((a) => ['source_recon', 'keep_onboard', 'shift_in_list', 'list_extra'].includes(a.code)).map((a) => a.code + ' | ' + a.msg);
    const r1 = sig(mk(mail(), _rs2)), r2 = sig(mk(mail(), (v) => { _rs2(v); v.info.planDis = 37; }));
    ok(JSON.stringify(r1) === JSON.stringify(['source_recon | 터미널 배정 39 · 앱 37 (-2) · 번호 없음 2대 — 배정표는 수량뿐, 작업이 시작되면 실적으로 번호가 잡힐 수 있음', 'shift_in_list | 시프팅 대상 2대가 양하 리스트에도 있음 — 시프팅으로 셈'])
      && JSON.stringify(r2) === JSON.stringify(['shift_in_list | 시프팅 대상 2대가 양하 리스트에도 있음 — 시프팅으로 셈']),
      '플래너가 확정한 지시(선사 시프팅 목록) — «시프팅 대상 2대가 양하 리스트에도 있음 — 시프팅으로 셈»(4.48 과 같은 말 · 본선 잔류 줄 없음 · 3차 감사 하-1)', JSON.stringify([r1, r2]));
    const dsrc = src('src/diagnostics.js');
    ok(dsrc.indexOf('const keepFound =') > dsrc.indexOf('const cancFound =') && dsrc.indexOf('const keepFound =') < dsrc.indexOf('let emptyConfirmedCount = 0;'),
      '진단 — 본선 잔류는 취소 요청분 바로 뒤, 가상 E 확정보다 먼저 가른다(RZOR R064E 꼴 — 지시 컨이 «E확정»으로 먹히지 않게 · 재감사 하-1)');
    const why = T.answerAboutAlert ? T.answerAboutAlert('본선 잔류 뭐야', d1) : null;
    ok(!!why && /본선 잔류/.test(why) && !/세관 리스트에는 없습니다/.test(why), '미르 «본선 잔류 뭐야» — 정보 줄을 찾아 설명한다(낱말표 · 단정 문구 없음)', why);
    const why2 = T.answerAboutAlert('메일 수정 2건 뭐야', a1), why3 = T.answerAboutAlert('본선 잔류 뭐야', a1);
    ok(!!why2 && why2.startsWith('🟡 ' + rc.msg) && /플래너가 확정하면/.test(why2) && !!why3 && why3.startsWith('🟡 ' + rc.msg),
      '미르 «메일 수정 2건 뭐야»·«본선 잔류 뭐야» — 터미널이 아직 수정 전이라 자료별 대조 줄만 서 있어도 그 줄을 찾아 설명한다(재감사 하-4)', why2);
    //  재감사(하-2) — 지시 없는 배의 종전 문구가 4.48 과 한 글자도 같다(4.48 번들로 뽑은 값 · 22베이 사본)
    const noK = (tw) => one(mk(null, tw), 'source_recon').map((a) => a.msg + ' | ' + a.voice);
    const _del1 = (v) => { const cn = Object.keys(v.discharge.ediContainers).find((c) => c !== K1 && c !== K2 && v.discharge.records[c]); delete v.discharge.ediContainers[cn]; };
    ok(JSON.stringify(noK((v) => { v.info.planDis = 40; _del1(v); })) === JSON.stringify(['자료별 대조 — 터미널 배정 40 · 본선현황 자료 없음 · EDI 38 · 세관 자료 없음 · 선사 리스트 39 · 실적 0 — 어긋남 1대 · 앱 39 (-1) · 번호 없음 1대 — 배정표는 수량뿐, 작업이 시작되면 실적으로 번호가 잡힐 수 있음 | 터미널과 1대 차이'])
      && JSON.stringify(noK((v) => { v.info.planDis = 40; })) === JSON.stringify(['터미널 배정 40 · 앱 39 (-1) · 번호 없음 1대 — 배정표는 수량뿐, 작업이 시작되면 실적으로 번호가 잡힐 수 있음 | 터미널과 1대 차이'])
      && JSON.stringify(noK(_del1)) === JSON.stringify(['자료별 대조 — 터미널 배정 39 · 본선현황 자료 없음 · EDI 38 · 세관 자료 없음 · 선사 리스트 39 · 실적 0 — 어긋남 1대 | ']),
      '지시 없는 배 — «어긋남 N대 · 앱 N (gap)» · «터미널 배정 N · 앱 N (gap)» 문구·음성이 4.48 과 같다(어긋남 갈래 · 차이 갈래 · 둘 다)', JSON.stringify([noK((v) => { v.info.planDis = 40; _del1(v); }), noK(_del1)]));
    //  재감사(하-2·하-3) — 펼친 칸을 실제로 그린다: 본선 잔류 묶음 · POD 확정 묶음 · 터미널 줄
    const _openRecon = async (alerts) => {
      W.__renderDiag(alerts); await wait(150);
      const b = [...doc.querySelectorAll('button')].find((x) => /^자료별 대조/.test((x.textContent || '').trim()) || /자료별 대조 —/.test(x.textContent || ''));
      if (b) { b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(100); }
      const rc0 = doc.querySelector('[data-recon]');
      const g = (k) => rc0 ? rc0.querySelector(`[data-recon-group="${k}"]`) : null;
      return { rc0, keep: g('keep'), ref: g('ref'), term: rc0 && rc0.querySelector('[data-recon-term]') ? rc0.querySelector('[data-recon-term]').textContent : '' };
    };
    const P1 = await _openRecon(a1);
    const kLines = P1.keep ? [...P1.keep.querySelectorAll('[data-recon-cn]')] : [];
    ok(!!P1.rc0 && !!P1.keep && !P1.ref && kLines.length === 2 && /^선사 메일 수정 — 본선 잔류 예정\(평택에서 안 내림 · 확정 아님 · 참고\) 2대/.test(P1.keep.textContent) && kLines.every((x) => !/POD 확정/.test(x.textContent) && /CNDAI · 선사 지시 본선 잔류/.test(x.textContent))
      && P1.term === '터미널 배정 39대 = 앱 39대 — 터미널은 아직 선사 메일 수정 전(본선 잔류 예정 2대 · 앱 예상 37대)',
      '펼친 칸 — «선사 메일 수정 — 본선 잔류(평택에서 안 내림 · 참고) 2대» 묶음 하나 · 줄에 «POD 확정» 앞말 없음 · «POD 확정 — 평택 아님» 묶음 없음 · 터미널 줄 «… — 터미널은 아직 선사 메일 수정 전(본선 잔류 2대)»',
      JSON.stringify({ rc: !!P1.rc0, keep: P1.keep && P1.keep.textContent.slice(0, 160), ref: !!P1.ref, term: P1.term }));
    const aE = mk(mail(), (v) => { v.discharge.records[_pk].pod_pick = 'manual'; v.discharge.records[_pk].pod = 'CNSHA'; });
    const P2 = await _openRecon(aE.filter((a) => a.code === 'source_recon'));
    ok(!!P2.keep && !!P2.ref && P2.keep.querySelectorAll('[data-recon-cn]').length === 2 && P2.ref.querySelectorAll('[data-recon-cn]').length === 1 && /POD 확정 — 평택 아님\(참고\) 1대/.test(P2.ref.textContent) && /POD 확정 CNSHA/.test(P2.ref.textContent) && !/수정 전/.test(P2.term),
      'POD 확정 참고가 같이 있으면 묶음이 둘로 나뉜다(본선 잔류 2 · POD 확정 1 — «POD 확정 CNSHA» 앞말은 그쪽만) · 터미널 줄은 «수정 전» 이라 하지 않는다', JSON.stringify({ keep: !!P2.keep, ref: P2.ref && P2.ref.textContent.slice(0, 120), term: P2.term }));
  }

  console.log('⑬ 4.48-02 — 시프팅 목록 머리 · 데이터 검증 칸은 확정 시프팅만 배정표와 맞대고 본선 잔류 예보는 따로(검수사 2026-10-24 18:54)');
  {
    const vM = voy(mail()); vM.key = VK;
    const dispM = T.shiftingMapForDisplay(VK + '_13', vM), slM = T.shiftingListOf(dispM, vM.discharge.ediContainers, vM);
    const keepN = slM.filter((x) => x.keep).length, confN = slM.length - keepN;
    const truth = Math.round(confN * 2);
    vM.info = { ...vM.info, berthShift: truth, terminalStatus: 'working' };
    const tc = T.shiftingTruthCheck(vM, confN), tcAll = T.shiftingTruthCheck(vM, slM.length);
    ok(keepN === 2 && tc && tc.ok && tcAll && !tcAll.ok, `배정표 이적 ${truth}모브(${confN}대) — 확정 ${confN} 은 일치 · 예보까지 넣은 ${slM.length} 는 불일치(고치기 전 꼴)`, JSON.stringify({ keepN, confN, tc, tcAll }));
    W.__renderListTab({ voyageKey: VK, containers: Object.values(vM.discharge.records).map((r) => ({ ...r })), shiftingList: slM,
      shiftInfo: { evid: null, meta: dispM._meta || null, berthShift: truth, lane: '', loadEdiPending: false, truthChk: tc, hatchSolve: null, restowExtra: [], split: { n: confN, out: 0, in: 0 }, confN, keepN } });
    await wait(300);
    const hb = [...doc.querySelectorAll('button')].find((b) => /쉬프팅\(재적부\)/.test(b.textContent || ''));
    const ht = hb ? hb.textContent.replace(/\s+/g, ' ') : '';
    ok(new RegExp(`쉬프팅\\(재적부\\) ${confN}\\s*· 예보◆2\\(선사 메일 수정 — 본선 잔류\\)`).test(ht) && new RegExp(`배정표 이적 ${truth}모브\\(${confN}대\\) ✓ 일치`).test(ht) && !/불일치/.test(ht) && !/⚠ 배정표/.test(ht) && !/앱은 .*대를 냈습니다/.test(doc.body.textContent),
      `목록 머리 «쉬프팅(재적부) ${confN} · 예보◆2(선사 메일 수정 — 본선 잔류) … 배정표 이적 ${truth}모브(${confN}대) ✓ 일치» · «⛔ 불일치»·«⚠ 배정표 N대 — 차이»·«앱은 N대를 냈습니다» 없음`, ht);
    W.__renderValidation({ ediContainers: Object.values(vM.discharge.ediContainers).filter((c) => c.pod === 'KRPTK'), records: Object.values(vM.discharge.records), mode: 'discharge', shiftingList: slM, voyageKey: VK, keepOnboard: T.keepOnboardOf(vM) });
    await wait(250);
    const cell = (lab) => { const d = [...doc.querySelectorAll('div')].find((x) => (x.textContent || '').trim() === lab && x.nextElementSibling); return d ? parseInt(d.nextElementSibling.textContent, 10) : NaN; };
    const eN = cell('EDI 평택'), lN = cell('리스트'), mN = cell('매칭'), sN = cell('◆ 쉬프팅');
    const la = doc.querySelector('[data-list-app]'), axM = doc.querySelector('[data-app-expect]'), evM = doc.querySelector('[data-keep-evid]');
    const recN = Object.keys(vM.discharge.records).length;
    ok(eN === lN && lN === mN && lN === recN && sN === confN && !!la && la.getAttribute('data-list-app') === String(recN - 2) && la.parentElement.textContent === `${recN}(${recN - 2})`,
      `데이터 검증 위 칸 — 지금 자료 그대로 «EDI 평택 ${eN} · 리스트 ${recN}(${recN - 2}) · 매칭 ${mN} · 쉬프팅 ${sN}» (라이브 꼴 «EDI317 리스트317(315) 매칭 317»)`, JSON.stringify({ eN, lN, mN, sN, la: la && la.parentElement.textContent }));
    ok(!!axM && axM.getAttribute('data-app-expect') === `${eN - 2}/${recN - 2}/${mN - 2}/${slM.length}` && new RegExp(`EDI 평택 ${eN - 2} · 리스트 ${recN - 2} · 매칭 ${mN - 2} · 쉬프팅 ${slM.length}\\(예보◆2\\)`).test(axM.textContent),
      `앱 예상 따로 한 줄 — «EDI 평택 ${eN - 2} · 리스트 ${recN - 2} · 매칭 ${mN - 2} · 쉬프팅 ${slM.length}(예보◆2)»`, axM && axM.textContent);
    ok(!!evM && /근거 — 선사 메일 10-24 12:49 «Pls keep below cntrs onboard for CNDAI discharge»/.test(evM.textContent) && evM.textContent.includes(K1) && evM.textContent.includes(K2) && /→ CNDAI/.test(evM.textContent) && /양하 EDI 는 아직 평택 · 수정 전/.test(evM.textContent),
      '메일을 근거로 — «근거 — 선사 메일 10-24 12:49 «Pls keep …» · 두 컨 → CNDAI(평택에서 안 내림 — 양하 EDI 는 아직 평택 · 수정 전)»', evM && evM.textContent);
    W.__renderValidation({ ediContainers: Object.values(vM.discharge.ediContainers).filter((c) => c.pod === 'KRPTK'), records: Object.values(vM.discharge.records), mode: 'discharge', shiftingList: slM.filter((x) => !x.keep), voyageKey: VK });
    await wait(200);
    ok(!doc.querySelector('[data-app-expect]') && !doc.querySelector('[data-list-app]'), '지시가 없는 배 — 앱 예상 줄·괄호 수 없음(종전 그대로)');
    ok(/className="text-dim-300 break-words break-keep"/.test(src('src/components/DiagnosticsPanel.jsx').match(/function ReconLine[\s\S]{0,900}/)[0]) && !/className="[^"]*break-all/.test(src('src/components/DiagnosticsPanel.jsx').match(/function ReconLine[\s\S]{0,900}/)[0]), '주의 박스 펼친 줄 — 긴 파일 이름이 줄바꿈된다(4.48-03 break-words — 낱말 중간은 안 갈림 · 폰 가로 밀림 수리)');
    ok(/className="mt-2 pt-2 border-t border-line text-2xs space-y-1 break-words break-keep" data-recon>/.test(src('src/components/DiagnosticsPanel.jsx')) && /className="text-2xs text-yellow-200\/90 break-words break-keep" data-keep-evid=/.test(src('src/components/ValidationBox.jsx')),
      '자료별 대조 칸 전체·데이터 검증 메일 근거 줄도 한글은 띄어쓰기 자리에서만 줄바꿈(4.49 — 4.48-04 라이브 확인 «수⏎정» «평택에⏎서» · 긴 파일 이름만 갈림)');
    ok(/className="text-xs flex-1 leading-relaxed font-bold break-words break-keep">\{alert\.msg\}/.test(src('src/components/DiagnosticsPanel.jsx')), '주의 박스 알림 한 줄(alert.msg)도 한글은 띄어쓰기 자리에서만 줄바꿈(4.49-01 — 4.49 라이브 확인 «적⏎용하면» «수⏎정 전»)');
  }

  console.log('⑭ 4.48-02 감사(중-1) — 항차 화면 본체(VoyagePage)를 통째로 그린다: 배정표 대조·앱 예상 줄이 화면 안 계산·전달을 거친다(배정표는 지도 계산 전에 넣는다)');
  {
    const vP = voy(mail()); vP.key = VK;
    const conf0 = Object.keys(T.computeShiftingMapCached(VK + '_14c', vP)).length;
    vP.info = { ...vP.info, berthShift: conf0 * 2, terminalStatus: 'working' };
    W.__renderVP(vP, VK);
    await wait(1500);
    const hb = [...doc.querySelectorAll('button')].find((b) => /쉬프팅\(재적부\)/.test(b.textContent || ''));
    const ht = hb ? hb.textContent.replace(/\s+/g, ' ') : '';
    const body = doc.body.textContent.replace(/\s+/g, ' ');
    ok(new RegExp(`쉬프팅\\(재적부\\) ${conf0}\\s*· 예보◆2`).test(ht) && new RegExp(`배정표 이적 ${conf0 * 2}모브\\(${conf0}대\\) ✓ 일치`).test(ht) && !/⛔/.test(ht) && !/불일치/.test(ht) && !/⚠ 배정표/.test(ht) && ((m) => !m || Math.abs(Number(m[1]) - conf0) === Number(m[2]))(ht.match(/앱 추정 (\d+) — 차이 (\d+)/)) && !/앱은 \d+대를 냈습니다/.test(body),
      `항차 화면 머리 — «쉬프팅(재적부) ${conf0} · 예보◆2 … 배정표 이적 ${conf0 * 2}모브(${conf0}대) ✓ 일치» · ⛔·불일치·«⚠ 배정표 N대 — 차이»·«앱은 N대» 없음 · «앱 추정 N — 차이» 는 확정 수와의 차이(이 22베이 픽스처는 추정 0 — truthChk·estN·berthN 이 확정 수와 맞댄다)`, ht.slice(0, 600));
    ok(/배정표 이적 \d+모브/.test(ht) && /(앱 추정|선사 서류)/.test(ht), '머리에 배정표·서류 줄이 실제로 선다(빈 meta 로 통과하지 않는다)', ht.slice(0, 300));
    const axP = doc.querySelector('[data-app-expect]'), evP = doc.querySelector('[data-keep-evid]');
    ok(!!axP && !!evP && /«Pls keep below cntrs onboard for CNDAI discharge»/.test(evP.textContent), '항차 화면 — 앱 예상 줄과 메일 한 줄 근거(부모가 keepOnboard 를 ListTab 에 넘긴다)', evP && evP.textContent);
    //  아래 평택 컨을 막지 않는 지시 한 건만(22-06-82 MCAU5003650) — 시프팅 예보 행이 없어도 앱 예상 줄이 서고 칩 «전체 N» 과 같은 수
    const vQ = voy({ MCAU5003650: { cn: 'MCAU5003650', pod: 'CNDAI', src: 'manual', by: ME, at: 1792813740000, mailAt: '10-24 12:49', note: '시험 지시' } }); vQ.key = VK;
    W.__renderVP(vQ, VK);
    await wait(1500);
    const axQ = doc.querySelector('[data-app-expect]');
    const chipQ = [...doc.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).find((t) => /^전체 \d+$/.test(t));
    const appList = axQ ? Number(axQ.getAttribute('data-app-expect').split('/')[1]) : NaN;
    const recN = Object.keys(vQ.discharge.records).length;
    ok(!!axQ && appList === recN - 1 && chipQ === `전체 ${recN}` && !doc.querySelector('[data-shift-keep]'),
      `막지 않는 지시 1건만 — 칩 «${chipQ}»(자료대로 · 4.48-03) · 앱 예상 리스트 ${recN - 1} · 예보◆ 없음(지시 기록으로 앱 예상 줄을 세운다)`, JSON.stringify({ ax: axQ && axQ.getAttribute('data-app-expect'), chipQ }));
  }
  console.log('⑮ 4.48-02 감사(하-1) — 플래너가 지시 두 대를 선사 시프팅 목록에 넣어 확정한 뒤 «총 작업» 은 두 대를 한 번만 센다');
  {
    const vC = voy(mail()); vC.key = VK;
    const rl = clone(vC.restowList || {}); const meta = rl._meta || {};
    for (const cn of [K1, K2]) { const e = vC.discharge.ediContainers[cn]; const pos = String(e.bay).padStart(3, '0') + String(e.row).padStart(2, '0') + String(e.tier).padStart(2, '0'); rl[cn] = { fe: e.fe || 'F', from: pos, to: pos, pod: 'CNDAI', pol: e.pol || '', sztp: '45RF', wt: 0 }; }
    rl._meta = { ...meta, total: (meta.total || 0) + 2, at: (meta.at || 0) + 1000 }; vC.restowList = rl;
    const dC = T.shiftingMapForDisplay(VK + '_15', vC), slC = T.shiftingListOf(dC, vC.discharge.ediContainers, vC);
    W.__renderValidation({ ediContainers: Object.values(vC.discharge.ediContainers).filter((c) => c.pod === 'KRPTK'), records: Object.values(vC.discharge.records), mode: 'discharge', shiftingList: slC, voyageKey: VK, keepOnboard: T.keepOnboardOf(vC) });
    await wait(250);
    const recN = Object.keys(vC.discharge.records).length, shN = slC.filter((x) => !x.keep).length;
    const ovl = doc.querySelector('[data-shift-overlap]'), axC = doc.querySelector('[data-app-expect]');
    const tx = doc.body.textContent.replace(/\s+/g, ' ');
    ok(slC.filter((x) => x.keep).length === 0 && !!ovl && ovl.getAttribute('data-shift-overlap') === '2' && new RegExp(`총 작업 ${recN + shN - 2}대 = 리스트 ${recN} \\+ 쉬프팅 ${shN} − 겹침 2`).test(tx),
      `확정 뒤 위 칸 — «총 작업 ${recN + shN - 2}대 = 리스트 ${recN} + 쉬프팅 ${shN} − 겹침 2»(두 번 세지 않는다 · 청구 근거)`, tx.slice(0, 260));
    ok(!!axC && new RegExp(`총 작업 ${recN - 2 + shN}대`).test(axC.textContent), `확정 뒤 앱 예상 줄 — 총 작업 ${recN - 2 + shN}대(위 칸과 같은 총 작업)`, axC && axC.textContent);
  }
  console.log('⑯ 4.48-03 — 본선 잔류는 «예정»: 항차 화면 칩은 자료대로 · 터미널이 먼저 반영(배정표 = 확정 + 예보)이면 빨간 경고 없음 · 자동 가이드만 내밀지 않음(검수사 2026-10-24 20:02~20:08)');
  {
    const vR = voy(mail()); vR.key = VK;
    const confR = Object.keys(T.computeShiftingMapCached(VK + '_16c', vR)).length;
    vR.info = { ...vR.info, berthShift: confR * 2, terminalStatus: 'working' };
    W.__renderVP(vR, VK);
    await wait(1500);
    const chipsR = [...doc.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter((t) => /^전체 \d+$|본선 잔류/.test(t) && t.length < 30);
    const recN = Object.keys(vR.discharge.records).length;
    ok(chipsR.includes(`전체 ${recN}`) && chipsR.includes('🟡 본선 잔류 예정 2'), `리스트 칩 — «전체 ${recN}»(지시 두 대 포함 · 자료대로) · «🟡 본선 잔류 예정 2»`, JSON.stringify(chipsR));
    //  터미널이 선사 메일을 먼저 반영 — 배정표 이적 = (확정 + 예보) × 2
    const vK = voy(mail()); vK.key = VK; vK.info = { ...vK.info, berthShift: (confR + 2) * 2, terminalStatus: 'working' };
    W.__renderVP(vK, VK);
    await wait(1500);
    const hbK = [...doc.querySelectorAll('button')].find((b) => /쉬프팅\(재적부\)/.test(b.textContent || ''));
    const htK = hbK ? hbK.textContent.replace(/\s+/g, ' ') : '', bodyK = doc.body.textContent.replace(/\s+/g, ' ');
    const evK = T.shiftEvidenceOf(VK + '_16k', vK, T.shiftingMapForDisplay(VK + '_16k', vK));
    ok(new RegExp(`배정표 이적 ${(confR + 2) * 2}모브\\(${confR + 2}대\\) = 확정 ${confR} \\+ 예보◆2 — 터미널은 선사 메일 반영 · 선사 시프팅 목록 수정본 대기`).test(htK) && !/⛔/.test(htK) && !/불일치/.test(htK) && !/⚠ 배정표/.test(htK) && !/앱은 \d+대를 냈습니다/.test(bodyK)
       && evK && evK.status === '미확정' && evK.keepMatch === true
       && /선사 시프팅 목록 수정본\(또는 EDI 수정본\)이 오면 저절로 확정으로 바뀝니다/.test(bodyK) && !/터미널이 작업을 시작해 배정표 이적이 나오면 저절로/.test(bodyK)
       && /_ev\.keepMatch \? '아직 확정이 아닙니다 — 터미널은 선사 메일\(본선 잔류\)을 반영했고, 선사 시프팅 목록 수정본\(또는 EDI 수정본\)이 오면 확정으로 바뀝니다\.'/.test(src('src/nlSearch.js')),
      `배정표 ${confR + 2}대 = 확정 ${confR} + 예보◆2 — «터미널은 선사 메일 반영 · 선사 시프팅 목록 수정본 대기» · ⛔·불일치·«⚠ 배정표»·«앱은 N대» 없음 · 근거 판정 «미확정»(keepMatch)`, htK.slice(0, 400) + ' | ' + (evK && evK.status));
    //  진짜 어긋남(배정표 = 확정 + 예보 + 1)은 그대로 ⛔
    const vX = voy(mail()); vX.key = VK; vX.info = { ...vX.info, berthShift: (confR + 3) * 2, terminalStatus: 'working' };
    W.__renderVP(vX, VK);
    await wait(1500);
    const hbX = [...doc.querySelectorAll('button')].find((b) => /쉬프팅\(재적부\)/.test(b.textContent || ''));
    const evX = T.shiftEvidenceOf(VK + '_16x', vX, T.shiftingMapForDisplay(VK + '_16x', vX));
    ok(!!hbX && /⛔ 불일치/.test(hbX.textContent) && evX && evX.status === '불일치' && !evX.keepMatch, `배정표 ${confR + 3}대(확정 + 예보 + 1) — 진짜 어긋남은 종전대로 «⛔ 불일치»`, hbX && hbX.textContent.replace(/\s+/g, ' ').slice(0, 300));
    //  감사(중-1) — 자동 가이드를 실제로 누른다: 22번 데크의 평택분을 지시 두 대만 빼고 완료로 두면, 가이드는 지시 컨을 카드·남은 수에 내밀지 않는다
    const centerOf = (b) => { b = parseInt(b, 10); return b % 2 === 0 ? b : (b % 4 === 1 ? b + 1 : b - 1); };
    const txt = (b) => b.textContent.replace(/\s+/g, ' ').trim();
    const until = async (fn, ms = 5000) => { const end = Date.now() + ms; let v = fn(); while (!v && Date.now() < end) { await wait(80); v = fn(); } return v; };
    const click = async (b, ms = 400) => { if (b) { b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(ms); } return !!b; };
    const guideRun = async (keep) => {
      const vG = voy(keep); vG.key = VK; vG.info = { ...vG.info, berthSide: 'port' };
      vG.discharge.completed = {};
      for (const [cn, c] of Object.entries(vG.discharge.ediContainers)) if (c && centerOf(c.bay) === 22 && parseInt(c.tier, 10) >= 80 && /^KRP/.test(String(c.pod || '')) && cn !== K1 && cn !== K2) vG.discharge.completed[cn] = { at: 1, by: '연막' };
      try { W.localStorage.setItem('gm_equip_no', '1호기'); W.localStorage.setItem('master_active_inspector_v1', '연막'); } catch (e) { errs.push('localStorage ' + e.message); }
      W.__memdb = { voyages: { [VK]: clone(vG) } };
      W.__renderVP(vG, VK); await wait(1500);
      const tabB = await until(() => [...doc.querySelectorAll('button[role="tab"]')].find((b) => /작업 시작/.test(b.textContent)));
      await click(tabB, 700);
      const gb = await until(() => [...doc.querySelectorAll('button')].find((b) => /^🤖\s*자동 가이드$/.test(txt(b))));
      await click(gb, 900);
      const side = [...doc.querySelectorAll('button')].find((b) => /^좌현 접안/.test(txt(b)));
      if (side) { await click(side, 700); const yes = [...doc.querySelectorAll('button')].find((b) => /^(확인|예|네|맞습니다|좌현 접안 확정|좌현 확정)/.test(txt(b))); if (yes) await click(yes, 700); }
      const g22 = await until(() => [...doc.querySelectorAll('button')].find((b) => { const m = txt(b).match(/^B([\d·]+)/); return m && m[1].split('·').map(Number).includes(22) && /남은 컨/.test(txt(b)); }));
      const g22t = g22 ? txt(g22) : '';
      await click(g22, 700);
      const deck = [...doc.querySelectorAll('button')].find((b) => /^🔵 데크 [0-9]/.test(txt(b)));
      const deckT = deck ? txt(deck) : '';
      await click(deck, 900);
      const cards = [...doc.querySelectorAll('button')].map((b) => b.textContent.replace(/\s+/g, '').replace(/^(앞|뒤)(?=[A-Z]{4}\d{7}$)/, '')).filter((x) => /^[A-Z]{4}\d{7}$/.test(x));
      return { g22t, deckT, cards, keepOnCard: cards.filter((x) => x === K1 || x === K2) };
    };
    const gK = await guideRun(mail()), g0 = await guideRun(null);
    ok(/남은 컨 1대/.test(gK.g22t) && /^🔵 데크 1개/.test(gK.deckT) && gK.cards.length > 0 && gK.keepOnCard.length === 0 && g0.keepOnCard.length > 0,
      `자동 가이드 실클릭 — 22번 데크를 지시 두 대만 남기고 끝낸 꼴: «${gK.g22t}» · 카드 ${gK.cards.join(',')}(지시 컨 없음) · 지시가 없으면 카드에 ${g0.keepOnCard.join(',')} 가 나온다`, JSON.stringify({ gK, g0: { g22t: g0.g22t, keep: g0.keepOnCard } }));
    //  재감사(중-1) — 같은 «작업 시작» 탭의 미르 «양하 몇 대» 는 자료대로(리스트 칩 «전체 N» 과 같은 수) · 작업 화면만 지시 컨을 내밀지 않는다
    const askWork = async (q) => {
      const vW = voy(mail()); vW.key = VK; vW.info = { ...vW.info, berthSide: 'port' };
      W.__memdb = { voyages: { [VK]: clone(vW) } };
      W.__renderVP(vW, VK); await wait(1500);
      await click(await until(() => [...doc.querySelectorAll('button[role="tab"]')].find((b) => /작업 시작/.test(b.textContent))), 1000);
      const head = (doc.body.textContent.replace(/\s+/g, ' ').match(/시작대기 ?\d+대/) || [''])[0];
      const findInp = () => [...doc.querySelectorAll('input,textarea')].find((i) => /자유 질문|4자리/.test(i.getAttribute('placeholder') || ''));
      if (!findInp()) { const man = [...doc.querySelectorAll('button')].find((b) => /^✋/.test(txt(b))); if (man) await click(man, 800); }
      if (!findInp()) { await click([...doc.querySelectorAll('button')].find((b) => /^B[\d·]*22/.test(txt(b)) && /남은 컨/.test(txt(b))), 800); await click([...doc.querySelectorAll('button')].find((b) => /^🔵 데크/.test(txt(b))), 900); }
      const inp = findInp();
      let ans = '';
      if (inp) {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), 'value').set;
        setter.call(inp, q); inp.dispatchEvent(new W.Event('input', { bubbles: true })); await wait(300);
        inp.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await wait(2500);
        const t = doc.body.textContent.replace(/\s+/g, ' ');
        ans = ((t.match(/📊 양하[^]{0,160}/) || t.match(/MAMP — [^]{0,200}/) || [''])[0]);
      }
      return { head, ans, hasInp: !!inp, inputs: [...doc.querySelectorAll('input,textarea')].map((i) => i.getAttribute('placeholder')).filter(Boolean).slice(0, 4), btns: [...doc.querySelectorAll('button')].map(txt).filter((t) => t.length < 20).slice(0, 25) };
    };
    const aw = await askWork('양하 몇 대');
    const recW = Object.keys(FX.voyage.discharge.records).length;
    ok(aw.hasInp && new RegExp(`${recW}대`).test(aw.ans) && !new RegExp(`(^|[^0-9])${recW - 2}대`).test(aw.ans) && new RegExp(`시작대기 ?${recW}대`).test(aw.head),
      `작업 시작 탭 미르 «양하 몇 대» — 자료대로 ${recW}대(리스트 칩 «전체 ${recW}» 와 같음) · 머리 «시작대기 ${recW}대»`, JSON.stringify(aw));
    ok(/const allContainers = useMemo\(\(\) => allContainersData\.map\(\(c\) => \(c && c\._keep && c\._mode === 'discharge' && c\._ptk && !c\._comp\) \? \{ \.\.\.c, _ptk: false, _keepHeld: true \}/.test(src('src/components/SearchPanel.jsx')),
      '배선 — 작업 시작 패널의 작업 화면(allContainers)만 지시 컨을 작업에서 뺀다 · 미르·시작 대기 수는 자료대로(allContainersData)');
    //  감사(중-1) — 콘앱 분기를 실제로 돌린다(cone.html 의 그 블록을 꺼내 번들 shiftEvidenceCore 로 실행)
    const coneS = src('public/cone.html');
    const blk = (coneS.match(/            if\(shiftStatus === '불일치'\)\{[\s\S]*?\n            \}\n/) || [''])[0];
    const runBlk = (berth) => { const confM = {}; for (let i = 0; i < 62; i++) confM['TEST' + String(1000000 + i)] = { from: '0010182', to: '0010182', _doc: true };
      const _o = { ...confM, MNBU0129687: { _forecast: 'keep' }, MNBU3119872: { _forecast: 'keep' } };
      const f = new Function('shiftStatus', 'shiftingMap', '_o', '_sh', 'P_ec', blk + '\nreturn shiftStatus;');
      return f('불일치', confM, _o, { berthShift: berth, terminalStatus: 'working' }, () => T.shiftEvidenceCore); };
    ok(!!blk && runBlk(128) === '미확정' && runBlk(130) === '불일치' && /window\.__CONEV='ConeOne 2\.7(1-0[123]|2(-0[1-9])?)'/.test(coneS),
      '콘앱 2.71-01 분기 실행 — 배정표 128(= 확정 62 + 예보 2)이면 «미확정» · 130 이면 «불일치» 그대로(검수앱 shiftEvidenceCore keepN 한 벌)', JSON.stringify([runBlk(128), runBlk(130), blk.length]));
    ok(/async function ctKeepShiftMap[\s\S]{0,700}for\(const k of \['completed','termWork'\]\)[\s\S]{0,300}voy\.discharge\[k\] = j/.test(coneS), '콘앱 2.71-01 — 본선 잔류 예보 재료에 양하 완료·실적을 싣는다(내린 지시 컨은 검수앱처럼 예보에서 빠짐 · 재감사 하-3)');
    //  감사(하-4) — 지시 컨을 실제로 내렸으면 예정은 끝 — 예보·칩·앱 예상에서 빠지고 유닛은 추가분(신고 대상)으로 센다
    const vD2 = voy(mail()); vD2.key = VK; vD2.discharge.completed = { [K1]: { at: 1, by: '연막' } };
    const UD2 = T.ptkDischargeUnitsOf(vD2), kD2 = T.keepOnboardOf(vD2), fD2 = T.keepShiftForecastOf(VK + '_16d', vD2);
    ok(!kD2[K1] && !!kD2[K2] && !fD2[K1] && UD2.set.has(K1) && !UD2.keepIn.has(K1) && UD2.keepIn.has(K2), '내린 지시 컨(완료 기록) — 예정에서 빠짐(keepOnboardOf·예보) · 유닛은 그대로 세고 keepIn 아님(추가분 갈래)', JSON.stringify({ k: Object.keys(kD2), f: Object.keys(fD2), keepIn: [...UD2.keepIn] }));
  }
  ok(errs.length === 0, '화면 오류 0', errs.join(' | '));
  console.log(`\n4.48 선사 지시 본선 잔류 연막 — ${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
