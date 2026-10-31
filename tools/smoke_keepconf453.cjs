// 4.53 연막검사 — 선적 EDI(출항본)에 다른 자리로 실린 선사 지시 «본선 잔류»는 «확정»(양하 315 · 시프팅 파란 ◆ 64 · 작업분 379 그대로 · DB 쓰기 없음).
//   실행 — node tools/smoke_keepconf453.cjs <repoRoot> <번들(smoke_keepconf453.jsx)>. 실패하면 빌드를 세운다.
//   실자료 — MAMP 641N 실 RTDB 읽기 사본(tools/fixtures/keepconf453_mamp641n.json — now: 2026-10-26 14:55 · before_loading: 2026-10-25 12:50 선적 섹션). 실 Firebase 쓰기 없음(메모리 DB).
const fs = require('fs');
const root = process.argv[2] || process.cwd();
const bundle = process.argv[3];
(async () => {
  let bad = 0, n = 0;
  const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + String(d).slice(0, 400))); if (!c) bad++; };
  if (!bundle) { console.log('번들 경로가 없다'); process.exit(1); }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.global = dom.window;
  const errs = [];
  dom.window.addEventListener('error', (e) => errs.push(e.message));
  console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s) && !/act\(/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
  const warns = [];
  console.warn = (...a) => { warns.push(a.map(String).join(' ').slice(0, 200)); };
  dom.window.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
  dom.window.alert = (m) => errs.push('alert: ' + String(m).slice(0, 160));
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(300);
  const T = dom.window.__T, W = dom.window, doc = W.document;
  if (!T) { console.log('  FAIL 번들이 시험 함수를 못 내놓았다', errs.join(' | ')); process.exit(1); }
  const src = (f) => fs.readFileSync(root + '/' + f, 'utf8');
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const FX = T.FX, VK = 'MAMP_641N', ME = '김성일';
  const K1 = 'MNBU0129687', K2 = 'MNBU3119872';
  W.__fbShipBayDict = { MAMP: FX.dict };
  const NOW = (key) => { const v = clone(FX.now); v.key = key || VK; return v; };                                   // 지금(10-26 14:55) — 선적 EDI (RE)MAMP-643S 14:11 판이 들어온 뒤
  const BEFORE = (key) => { const v = clone(FX.now); v.loading = clone(FX.before_loading); v.key = key || VK; return v; };   // 10-25 12:50 — 두 대가 선적 EDI 에 없던 때
  const nKeys = (m) => Object.keys(m || {}).filter((k) => !k.startsWith('_'));
  const mailEntry = (cn) => ({ cn, pod: 'CNDAI', src: 'mail', by: '클로드', at: 1792829018013, mailAt: '10-24 12:49', note: 'Pls keep below cntrs onboard for CNDAI discharge.', pod_orig: 'KRPYOTM' });

  console.log('① 실자료 확정 판정 — keepConfirmedOf(MAMP 641N 지금 · 10-25)');
  const kcNow = T.keepConfirmedOf(NOW('K_a'));
  ok(Object.keys(kcNow).sort().join(',') === [K1, K2].sort().join(',') && kcNow[K1]._keepConf === true && kcNow[K1].pod === 'CNDAI' && kcNow[K1].from === '0220586' && kcNow[K1].to === '0100882'
    && kcNow[K2].from === '0220786' && kcNow[K2].to === '0100782' && /Pls keep below/.test(kcNow[K1]._keep.note), '지금 — 두 대 확정(22-05-86 → 10-08-82 · 22-07-86 → 10-07-82 · POD CNDAI · 메일 한 줄 보존)', JSON.stringify(kcNow));
  ok(Object.keys(T.keepConfirmedOf(BEFORE('K_b'))).length === 0, '10-25(선적 EDI 에 두 대가 없던 때) — 확정 0 · 예정 그대로');
  const vCl = NOW('K_c'); vCl.keepOnboard[K1] = { ...vCl.keepOnboard[K1], cleared: true };
  ok(Object.keys(T.keepConfirmedOf(vCl)).join(',') === K2, '지시를 푼 컨(cleared)은 확정에서 빠진다');
  const vPt = NOW('K_d'); vPt.keepOnboard[K1].pod = 'KRPTK'; vPt.keepOnboard[K2].pod = 'KRPTK';
  ok(Object.keys(T.keepConfirmedOf(vPt)).length === 0, '평택을 지시한 줄은 잔류가 아니라 확정도 아니다');
  const vNL = NOW('K_e'); delete vNL.loading.raw;
  ok(Object.keys(T.keepConfirmedOf(vNL)).length === 0, '선적 EDI 원문이 없으면 확정할 근거가 없다(예정 그대로)');
  const vNK = NOW('K_f'); delete vNK.keepOnboard;
  ok(Object.keys(T.keepConfirmedOf(vNK)).length === 0 && Object.keys(T.keepConfirmedOf(null)).length === 0 && Object.keys(T.keepConfirmedOf({})).length === 0, '지시가 없는 배·빈 자료는 빈 묶음');
  const koBefore = JSON.stringify(NOW().keepOnboard), vDb = NOW('K_g'); T.keepConfirmedOf(vDb); T.computeShiftingMapCached('K_g', vDb); T.shiftingMapForDisplay('K_g', vDb);
  ok(JSON.stringify(vDb.keepOnboard) === koBefore && !Object.values(vDb.keepOnboard).some((x) => x.confirmed || x._keepConf), 'DB 에는 아무것도 안 쓴다 — keepOnboard 줄은 읽고 계산해도 그대로(계산만)');

  console.log('② 판정 본체(순수) — keepConfirmedFromMaps 가드');
  const cell = (bay, row, tier, pol) => ({ bay, row, tier, pol, iso: '45R8', fe: 'F' });
  const keepA = { ABCD1234567: { cn: 'ABCD1234567', pod: 'CNDAI' } };
  const dM = { ABCD1234567: cell('22', '05', '86', 'PHDVO') };
  const lOk = { ABCD1234567: cell('10', '08', '82', 'PHDVO'), WXYZ7654321: cell('06', '02', '82', 'KRPTK') };
  const r1 = T.keepConfirmedFromMaps(keepA, dM, lOk);
  ok(Object.keys(r1).join(',') === 'ABCD1234567' && r1.ABCD1234567.from === '0220586' && r1.ABCD1234567.to === '0100882' && r1.ABCD1234567._keepConf === true, '자리가 옮겨졌고 선적 EDI 가 평택 출항본이면 확정', JSON.stringify(r1));
  ok(Object.keys(T.keepConfirmedFromMaps(keepA, dM, { ...lOk, ABCD1234567: cell('22', '05', '86', 'PHDVO') })).length === 0, '같은 자리에 실린(안 옮긴 잔류) 컨은 확정 아님 — 예정 그대로(검수사 결정 대기)');
  ok(Object.keys(T.keepConfirmedFromMaps(keepA, dM, { ...lOk, ABCD1234567: cell('10', '08', '82', 'KRPTK') })).length === 0, '선적 EDI 에서 POL 이 평택이면(평택에서 싣는 수출 컨) 그 지시 컨이 아니다');
  ok(Object.keys(T.keepConfirmedFromMaps(keepA, dM, { ABCD1234567: cell('10', '08', '82', 'PHDVO') })).length === 0, '선적 EDI 가 평택 출항본이 아니면(도착 적부) 확정 근거가 아니다');
  ok(Object.keys(T.keepConfirmedFromMaps(keepA, {}, lOk)).length === 0 && Object.keys(T.keepConfirmedFromMaps(keepA, dM, { WXYZ7654321: cell('06', '02', '82', 'KRPTK') })).length === 0, '양하나 선적 EDI 에 그 컨이 없으면 확정 아님');
  ok(Object.keys(T.keepConfirmedFromMaps({ ABCD1234567: { cn: 'ABCD1234567', pod: 'KRPTK' } }, dM, lOk)).length === 0 && Object.keys(T.keepConfirmedFromMaps(null, dM, lOk)).length === 0 && Object.keys(T.keepConfirmedFromMaps(keepA, null, lOk)).length === 0, '평택 지시·지시 없음·지도 없음은 빈 묶음(예외 없이)');

  console.log('③ 대수 — 양하 315 · 시프팅 64 · 작업분 379(지금) / 317 · 62 + 예보 2 · 379(10-25)');
  const vN = NOW('K_n'), vB = BEFORE('K_bb');
  const UN = T.ptkDischargeUnitsOf(vN), UB = T.ptkDischargeUnitsOf(vB);
  ok(UN.set.size === 315 && !UN.set.has(K1) && !UN.set.has(K2) && (!UN.keepIn || UN.keepIn.size === 0), `지금 — 평택 양하분 ${UN.set.size}(= 315 · 두 대 빠짐 · 예정 표식 없음)`, UN.set.size);
  ok(UB.set.size === 317 && UB.set.has(K1) && UB.set.has(K2) && UB.keepIn && UB.keepIn.has(K1) && UB.keepIn.has(K2), `10-25 — 평택 양하분 ${UB.set.size}(자료대로 317 · 예정 두 대 keepIn — 4.48-03 그대로)`, UB.set.size);
  const cN = T.computeShiftingMapCached('K_n', vN), cB = T.computeShiftingMapCached('K_bb', vB);
  ok(nKeys(cN).length === 64 && cN[K1]._keepConf && cN[K2]._keepConf && nKeys(cN).filter((k) => cN[k]._keepConf).length === 2 && nKeys(cB).length === 62 && !cB[K1], `확정 시프팅 지도 지금 ${nKeys(cN).length}(= 서류 62 + 본선 잔류 확정 2) · 10-25 ${nKeys(cB).length}`);
  const spN = T.shiftSplitOf('K_n', vN), spB = T.shiftSplitOf('K_bb', vB);
  ok(spN.n === 64 && (!spN.forecast || spN.forecast.n === 0) && spB.n === 62 && spB.forecast && spB.forecast.n === 2, `확정/예보 — 지금 확정 ${spN.n} · 예보 ${(spN.forecast && spN.forecast.n) || 0} / 10-25 확정 ${spB.n} · 예보 ${spB.forecast && spB.forecast.n}`);
  const dN = T.shiftingMapForDisplay('K_n', vN), dB = T.shiftingMapForDisplay('K_bb', vB);
  ok(nKeys(dN).length === 64 && !T.isKeepShift(dN[K1]) && !T.isPredShift(dN[K1]) && dN[K1]._keepConf && nKeys(dB).length === 64 && T.isKeepShift(dB[K1]) && T.isKeepShift(dB[K2]),
    '화면 지도 — 지금: 파란 ◆ 확정(노란 예보 아님) 64 / 10-25: 확정 62 + 노란 예보 2');
  ok(Object.keys(T.keepOnboardOf(vN)).length === 0 && Object.keys(T.keepShiftForecastOf('K_n', vN)).length === 0 && Object.keys(T.keepOnboardOf(vB)).length === 2 && Object.keys(T.keepShiftForecastOf('K_bb', vB)).length === 2,
    '예정·예보 묶음 — 지금 0(확정으로 올라감) · 10-25 두 대(예정·예보)');
  const ssN = T.shiftCnSetOf('K_n', vN), ssB = T.shiftCnSetOf('K_bb', vB);
  const prN = T.progressOf(vN.discharge, 'discharge', ssN, undefined, vN.keepOnboard), prB = T.progressOf(vB.discharge, 'discharge', ssB, undefined, vB.keepOnboard);
  ok(prN.ptk.total === 315 && prN.listTotal === 315 && prN.shift.total === 64 && prN.total === 379 && prB.ptk.total === 317 && prB.shift.total === 62 && prB.total === 379,
    `진행 숫자(홈 카드·수석 보드·현황 요약) — 지금 양하 ${prN.ptk.total} + 시프팅 ${prN.shift.total} = 작업분 ${prN.total} / 10-25 ${prB.ptk.total} + ${prB.shift.total} = ${prB.total}`, JSON.stringify([prN, prB]).slice(0, 300));
  const csN = T.computeStats(vN.discharge, 'discharge', vN.info, 'K_n', ssN, vN.keepOnboard), csB = T.computeStats(vB.discharge, 'discharge', vB.info, 'K_bb', ssB, vB.keepOnboard);
  const ccN = T.chiefComputeStats(vN.discharge, 'discharge', ssN, vN.keepOnboard), ccB = T.chiefComputeStats(vB.discharge, 'discharge', ssB, vB.keepOnboard);
  const stOk = (c, t, p) => c.total === t && c.ptk === p && c.matched === p && c.missing === 0 && c.workTotal === 379;
  ok(stOk(csN, 315, 315) && stOk(csB, 317, 317), `홈 카드 computeStats — 지금 막대 ${csN.total} · EDI 평택 ${csN.ptk} · 매칭 ${csN.matched} · 누락 ${csN.missing}(확정 두 대는 평택분에서 빠져 «누락 2» 가 서지 않는다) / 10-25 ${csB.total}/${csB.ptk}/${csB.matched}/${csB.missing}`, JSON.stringify([csN, csB].map((c) => [c.total, c.ptk, c.matched, c.missing, c.workTotal])));
  ok(stOk(ccN, 315, 315) && stOk(ccB, 317, 317), `수석 보드 computeStats — 지금 ${ccN.total}/${ccN.ptk}/${ccN.matched}/누락 ${ccN.missing} · 10-25 ${ccB.total}/${ccB.ptk}/${ccB.matched}/누락 ${ccB.missing}(홈 카드와 같은 답)`, JSON.stringify([ccN, ccB].map((c) => [c.total, c.ptk, c.matched, c.missing, c.workTotal])));
  const csU = T.computeStats(vN.discharge, 'discharge', vN.info, 'K_n', new W.Set(), vN.keepOnboard);   // 시프팅 집합이 비면(확정 지도 실패) 빼지 않는다 — 조용히 숫자를 지어내지 않는다
  ok(csU.ptk === 317, '시프팅 집합이 없으면 EDI 평택분은 자료대로(317) — 확정을 못 읽었을 때 숫자를 지어내지 않는다', csU.ptk);
  const vcN = T.voyageCountsOf(vN, null, T.shiftSetForUnitsOf(dN)), vcB = T.voyageCountsOf(vB, null, T.shiftSetForUnitsOf(dB));
  ok(vcN.byMode.discharge.total === 315 && vcB.byMode.discharge.total === 317, `미르 분모(voyageCountsOf) — 지금 ${vcN.byMode.discharge.total} · 10-25 ${vcB.byMode.discharge.total}`);
  //  캐시 — 같은 항차 키에서 선적 EDI 만 바뀌면 다음 호출이 새 값을 낸다(낡은 값을 쥐지 않는다)
  const a1 = nKeys(T.computeShiftingMapCached('K_cache', BEFORE('K_cache'))).length, a2 = nKeys(T.computeShiftingMapCached('K_cache', NOW('K_cache'))).length, a3 = nKeys(T.computeShiftingMapCached('K_cache', BEFORE('K_cache'))).length;
  ok(a1 === 62 && a2 === 64 && a3 === 62, `캐시 — 같은 키에서 선적 EDI 가 바뀌면 바로 따라간다 ${a1} → ${a2} → ${a3}`);

  console.log('④ 선사 시프팅 목록(서류)이 이긴다 · 내림 완료 기록이 남아도 확정은 그대로');
  const vR = NOW('K_r'); vR.restowList = { ...vR.restowList, [K1]: { from: '0220586', to: '0100882', pod: 'CNDAI', fe: 'F', sztp: '45R8', pol: 'PHDVO' } };
  const cR = T.computeShiftingMapCached('K_r', vR);
  ok(nKeys(cR).length === 64 && cR[K1]._doc === true && !cR[K1]._keepConf && cR[K2]._keepConf === true, '플래너 서류에 K1 이 들어오면 서류가 이기고(덮지 않는다) K2 만 선적 EDI 확정 — 64 그대로', nKeys(cR).length + ' ' + JSON.stringify(Object.keys(cR[K1] || {})));
  const vD = NOW('K_dn'); vD.discharge.completed = { ...(vD.discharge.completed || {}), [K1]: { at: 1792900000000, by: ME } };
  ok(Object.keys(T.keepConfirmedOf(vD)).includes(K1) && T.ptkDischargeUnitsOf(vD).set.size === 315 && nKeys(T.computeShiftingMapCached('K_dn', vD)).length === 64, '확정 컨의 «내림» 완료 기록이 생겨도 확정 유지 · 양하 315 · 시프팅 64(완료가 확정을 되돌리지 않는다)');
  const vDb2 = BEFORE('K_dbb'); vDb2.discharge.completed = { ...(vDb2.discharge.completed || {}), [K1]: { at: 1792900000000, by: ME } };
  ok(!T.keepOnboardOf(vDb2)[K1] && !!T.keepOnboardOf(vDb2)[K2], '예정 컨을 실제로 내렸으면(완료) 예정에서 빠진다 — 4.48-03 그대로(확정과 무관)');
  //  선적 EDI 원문이 깨져 오면(컨 0대) 확정하지 않고 예정으로 돌아간다 — 안전한 쪽이되 조용히 하지 않는다(독립 감사 의심 5)
  const vBrk = NOW('K_brk'); vBrk.loading = { ...vBrk.loading, raw: { ...vBrk.loading.raw, edi: { ...vBrk.loading.raw.edi, text: 'X'.repeat(400), uploadedAt: (vBrk.loading.raw.edi.uploadedAt || 0) + 1 } } };
  const w0 = warns.length, kBrk = T.keepConfirmedOf(vBrk);
  const wBrk = warns.slice(w0).filter((w) => /선적 EDI 원문이 있는데 컨을 읽지 못했습니다/.test(w));
  T.keepConfirmedOf(vBrk);   // 같은 서명 — 캐시라 경고가 또 나오지 않는다
  const wBrk2 = warns.slice(w0).filter((w) => /선적 EDI 원문이 있는데 컨을 읽지 못했습니다/.test(w));
  ok(Object.keys(kBrk).length === 0 && wBrk.length === 1 && wBrk2.length === 1, '선적 EDI 원문이 깨져 오면(컨 0대) 확정 0 · 콘솔 경고 한 번(같은 서명 재호출은 캐시) — 소리 없이 예정으로 돌아가지 않는다', Object.keys(kBrk).length + '/' + wBrk.length + '/' + wBrk2.length);
  warns.splice(w0);   // 시험이 일부러 낸 경고는 ⑫ 의 «삼킨 실패 없음» 에서 뺀다

  console.log('⑤ 시프팅 근거(서류·배정표 대조) — 확정 두 대는 따로 말한다');
  const evN = T.shiftEvidenceOf('K_n', vN, dN), evB = T.shiftEvidenceOf('K_bb', vB, dB);
  ok(evN && evN.status === '확정' && evN.count === 62 && evN.keepConfN === 2 && /본선 잔류 확정 2대\(선적 EDI 에 실린 선사 지시 컨\) — 터미널 배정표 이적은 아직 반영 전/.test(evN.line) && !/불일치/.test(evN.line),
    '지금 — 근거는 «서류 62 확정 + 본선 잔류 확정 2대 … 터미널 배정표 이적은 아직 반영 전»(빨간 불일치 아님)', evN && evN.line);
  ok(evB && evB.status === '확정' && evB.count === 62 && !evB.keepConfN && !/본선 잔류 확정/.test(evB.line), '10-25 — 근거 줄에 확정 문구 없음(종전 그대로)');
  const vBs = NOW('K_bs'); vBs.info = { ...vBs.info, berthShift: 128 };   // 터미널이 두 대까지 반영한 때(64대 = 128모브)
  const evBs = T.shiftEvidenceOf('K_bs', vBs, T.shiftingMapForDisplay('K_bs', vBs));
  ok(evBs && evBs.status === '확정' && evBs.keepConfIncl === true && /62 \+ 본선 잔류 확정 2/.test(evBs.line) && !/반영 전/.test(evBs.line), '터미널이 128모브(64대)로 고치면 «서류 확정 62 + 본선 잔류 확정 2» 로 일치(반영 전 문구는 사라진다)', evBs && evBs.line);
  const vBw = NOW('K_bw'); vBw.info = { ...vBw.info, berthShift: 100 };   // 어느 쪽과도 안 맞는 수
  const evBw = T.shiftEvidenceOf('K_bw', vBw, T.shiftingMapForDisplay('K_bw', vBw));
  ok(evBw && evBw.status === '불일치', '어느 쪽 수와도 안 맞는 배정표(100모브 = 50대)는 그대로 «불일치» — 확정 문구가 진짜 어긋남을 가리지 않는다', evBw && evBw.status);

  console.log('⑥ 주의 박스 — 자료별 대조(번호 없음으로 새지 않는다)');
  const slN = T.shiftingListOf(dN, vN.discharge.ediContainers, vN), slB = T.shiftingListOf(dB, vB.discharge.ediContainers, vB);
  ok(slN.length === 64 && slN.filter((x) => x.confKeep).length === 2 && slN.filter((x) => x.keep).length === 0 && slN.find((x) => x.cn === K1).confKeep.pod === 'CNDAI' && slN.find((x) => x.cn === K1).from === '0220586'
    && slB.filter((x) => x.keep).length === 2 && slB.filter((x) => x.confKeep).length === 0, '시프팅 목록 — 지금 확정(confKeep) 2 · 10-25 예보(keep) 2');
  const dgOf = (v, key, list, disp) => (T.runDiagnostics({ ediContainers: Object.values(v.discharge.ediContainers).filter((c) => c.pod === 'KRPTK'), listRecords: Object.values(v.discharge.records), mode: 'discharge', shiftCns: list.filter((x) => !x.keep).map((x) => x.cn), voyage: v, voyageKey: key }) || []).find((a) => a.code === 'source_recon');
  const srN = dgOf(vN, 'K_n', slN), srB = dgOf(vB, 'K_bb', slB);
  ok(!!srN && /선사 지시 본선 잔류 확정 2건\(선적 EDI 에 실림 — 평택에서 안 내림\) 적용해 앱 315 · 터미널 배정 317\(터미널은 아직 반영 전\)/.test(srN.msg) && !/번호 없음/.test(srN.msg) && srN.details.unknown === 0 && srN.details.explained === 2 && (srN.details.refConf || []).length === 2,
    '지금 — «선사 지시 본선 잔류 확정 2건 … 적용해 앱 315 · 터미널 배정 317(아직 반영 전)» · «번호 없음» 0 · 차이 2대는 확정 두 대가 설명', srN && srN.msg);
  ok(!!srB && /선사 메일 수정 2건\(본선 잔류 CNDAI — 평택에서 안 내림\) 적용하면 315 · 터미널 배정 317\(터미널은 아직 선사 메일 수정 전\)/.test(srB.msg) && !/확정 2건/.test(srB.msg) && (srB.details.refConf || []).length === 0, '10-25 — 종전 «메일 수정 2건 … 적용하면 315 …(수정 전)» 그대로');
  const sdN = T.reconcileSources(vN, 'discharge', { voyageKey: 'K_n' });
  ok(sdN.app === 315 && sdN.total === 0 && sdN.ref.length === 0 && sdN.refConf.length === 2 && sdN.refConf.every((x) => x.keepConf && !x.inApp && x.pod === 'CNDAI') && T.reconcileSources(vN, 'loading', { voyageKey: 'K_n' }).refConf.length === 0,
    '자료별 대조(reconcileSources) — 확정 두 대는 어긋남 0 · 참고(ref) 0 · 확정 참고(refConf) 2 · 선적 방향엔 없음', JSON.stringify({ app: sdN.app, total: sdN.total, ref: sdN.ref.length, rc: sdN.refConf.length }));
  {
    W.__renderDiag([srN]); await wait(150);
    const b = [...doc.querySelectorAll('button')].find((x) => /자료별 대조 —/.test(x.textContent || ''));
    if (b) { b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(100); }
    const rc = doc.querySelector('[data-recon]'), g = rc && rc.querySelector('[data-recon-group="keepconf"]');
    const lines = g ? [...g.querySelectorAll('[data-recon-cn]')].map((x) => x.textContent) : [];
    const tm = rc && rc.querySelector('[data-recon-term]') ? rc.querySelector('[data-recon-term]').textContent : '';
    ok(!!g && /본선 잔류 확정\(선적 EDI 에 실림 · 평택에서 안 내림 · 참고\) 2대/.test(g.textContent) && lines.length === 2 && lines.every((t) => /선사 지시 본선 잔류 확정\(선적 EDI 에 실림 22-0[57]-86 → 10-0[78]-82\)/.test(t)) && !rc.querySelector('[data-recon-group="ref"]') && !rc.querySelector('[data-recon-group="keep"]')
      && /터미널은 아직 본선 잔류 확정 2대를 반영하지 않음\(앱 315대 \+ 2대 = 317대\)/.test(tm) && !/번호 없음/.test(tm), '펼친 칸 — «본선 잔류 확정 … 참고 2대» 묶음에 컨 줄 둘(양하 → 선적 자리) · 터미널 줄은 «아직 반영하지 않음(앱 315 + 2 = 317)» · POD 확정·예정 묶음 없음', JSON.stringify({ g: g && g.textContent.slice(0, 120), lines, tm }));
  }

  console.log('⑦ 컨 상세 — 파란 상자(확정) / 노란 상자(예정)');
  W.__memdb = { voyages: { [VK]: NOW() } };
  const rowOf = (v, cn, extra) => ({ ...v.discharge.ediContainers[cn], ...v.discharge.records[cn], _mode: 'discharge', ...extra });
  const rN = rowOf(vN, K1, { _keepConf: kcNow[K1] });
  W.__renderDetail({ c: rN, mode: 'discharge', voyageKey: VK, voyageInfo: vN.info, inspector: ME, records: vN.discharge.records, allContainers: [rN] });
  await wait(500);
  const bx = doc.querySelector('[data-keep-conf="1"]');
  ok(!!bx && /선사 지시 — 본선 잔류 확정\(평택에서 안 내림 · 시프팅 대상\)/.test(bx.textContent) && /POD 변경 KRPYOTM → CNDAI · 선사 메일 10-24 12:49/.test(bx.textContent) && /선적 EDI 에 실림 — 자리 22-05-86 → 10-08-82/.test(bx.textContent) && /확정입니다 — 평택 양하 대수에서 빠지고 ◆ 시프팅으로 셉니다/.test(bx.textContent)
    && !!bx.querySelector('[data-keep-conf-pos="0220586>0100882"]') && !doc.querySelector('[data-keep="1"]'), '확정 컨 — «🔵 본선 잔류 확정(… 시프팅 대상)» · POD 변경 줄 · «선적 EDI 에 실림 — 자리 22-05-86 → 10-08-82» · 노란 예정 상자 없음', bx ? bx.textContent.slice(0, 260) : doc.body.textContent.slice(0, 200));
  ok(!!doc.querySelector('[data-keep-clear="1"]'), '검수사는 확정 상자에서도 [지시 풀기](되돌림 길) 가 보인다');
  W.__memdb = { voyages: { [VK]: BEFORE() } };
  const rB = rowOf(vB, K1, {});
  W.__renderDetail({ c: rB, mode: 'discharge', voyageKey: VK, voyageInfo: vB.info, inspector: ME, records: vB.discharge.records, allContainers: [rB] });
  await wait(500);
  ok(!!doc.querySelector('[data-keep="1"]') && !doc.querySelector('[data-keep-conf="1"]') && /본선 잔류 예정\(평택에서 안 내림 · 확정 아님\)/.test(doc.querySelector('[data-keep="1"]').textContent), '10-25 — 같은 컨은 종전 «🟡 본선 잔류 예정(… 확정 아님)» 노란 상자');
  const rS = rowOf(vN, K2, { _shift: true });
  W.__memdb = { voyages: { [VK]: NOW() } };
  W.__renderDetail({ c: rS, mode: 'discharge', voyageKey: VK, voyageInfo: vN.info, inspector: ME, records: vN.discharge.records, allContainers: [rS] });
  await wait(400);
  ok(!!doc.querySelector('[data-keep-conf="1"]'), '행 표식이 없는 입구(작업 화면·수석 보드)도 확정 시프팅 행(_shift)이면 같은 파란 상자');

  console.log('⑧ 항차 화면 본체 — 머리 줄 · 칩 · 필터 · 앱 예상 줄');
  const bodyText = () => doc.body.textContent.replace(/\s+/g, ' ');
  const chipsOf = () => [...doc.querySelectorAll('button')].map((b) => (b.textContent || '').trim().replace(/\s+/g, ' ')).filter((t) => /^(전체|🔵|🟡|◆ 시프팅)/.test(t));
  W.__memdb = { voyages: { [VK]: NOW() } };
  W.__renderVP(NOW(), VK); await wait(1800);
  const hbN = [...doc.querySelectorAll('button')].find((b) => /쉬프팅\(재적부\)/.test(b.textContent || ''));
  const htN = hbN ? hbN.textContent.replace(/\s+/g, ' ') : '';
  ok(/쉬프팅\(재적부\) 64\s*· 🔵 본선 잔류 확정 2\(선적 EDI에 실림\)/.test(htN) && /배정표 이적 124모브\(62대\) ✓ 일치 — 본선 잔류 확정 2대는 터미널 반영 전/.test(htN) && !/불일치|⛔|⚠ 배정표/.test(htN) && !!doc.querySelector('[data-shift-keepconf-head="2"]'),
    '지금 — 머리 «쉬프팅(재적부) 64 · 🔵 본선 잔류 확정 2(선적 EDI에 실림) … 배정표 이적 124모브(62대) ✓ 일치 — 본선 잔류 확정 2대는 터미널 반영 전» · 불일치·⛔ 없음', htN);
  const chN = chipsOf();
  ok(chN.includes('전체 315') && chN.includes('◆ 시프팅 내림 0/64') && chN.includes('🔵 본선 잔류 확정 2') && !chN.some((t) => /🟡/.test(t)) && !doc.querySelector('[data-app-expect]') && !doc.querySelector('[data-keep-evid]'), '지금 — 칩 «전체 315» · «◆ 시프팅 내림 0/64» · «🔵 본선 잔류 확정 2» · 노란 칩·앱 예상 줄 없음', JSON.stringify(chN));
  ok(!/불일치/.test(bodyText()) && !/⛔/.test(bodyText()) && /총 작업 379대/.test(bodyText()), '지금 — 화면 어디에도 빨간 불일치·⛔ 없음 · 검증 상자 «총 작업 379대»(리스트 317 + 시프팅 64 − 겹침 2 — 자료가 말하는 그대로)');
  const chipBtn = [...doc.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '🔵 본선 잔류 확정 2');
  if (chipBtn) { chipBtn.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(300); }
  const bt = bodyText();
  ok(!!chipBtn && bt.includes(K1) && bt.includes(K2) && !bt.includes('MNBU0567132'), '«🔵 본선 잔류 확정 2» 칩을 누르면 그 두 대만 보인다(MNBU0129687 · MNBU3119872)', chipBtn ? bt.slice(0, 160) : '칩 없음');
  W.__memdb = { voyages: { [VK]: BEFORE() } };
  W.__renderVP(BEFORE(), VK); await wait(1800);
  const chB = chipsOf();
  ok(chB.includes('전체 317') && chB.includes('🟡 본선 잔류 예정 2') && !chB.some((t) => /🔵/.test(t)) && !!doc.querySelector('[data-app-expect]') && !doc.querySelector('[data-shift-keepconf-head]'), '10-25 — 종전 그대로(전체 317 · «🟡 본선 잔류 예정 2» · 앱 예상 줄 · 파란 칩 없음)', JSON.stringify(chB));

  console.log('⑨ 종이 카고플랜 머리 · 미르 답');
  const planHead = async (v, disp) => { W.__renderPlan({ containers: Object.values(v.discharge.ediContainers), mode: 'discharge', voyageInfo: v.info, shipName: 'MAMP', shiftingMap: disp, keepOnboard: v.keepOnboard }); await wait(500); const el = doc.querySelector('[data-cp-count]'); return el ? el.getAttribute('data-cp-count') : ''; };
  const hN = await planHead(vN, dN), hB = await planHead(vB, dB);
  ok(hN === '315/379' && hB === '317/379', `카고플랜 머리 «양하/작업분» — 지금 ${hN}(315 + 시프팅 64) · 10-25 ${hB}(317 + 62, 예보 두 칸은 한 번만)`);
  const ctx = (v, disp, ev) => ({ shiftMap: disp, shiftEvid: ev, voyage: v });
  const ansN = String(T.generateLocalAnswer({ shiftingQuery: true }, [], Object.values(vN.discharge.ediContainers), ctx(vN, dN, evN)));
  const ansB = String(T.generateLocalAnswer({ shiftingQuery: true }, [], Object.values(vB.discharge.ediContainers), ctx(vB, dB, evB)));
  ok(/시프팅 64대 \[확정\]/.test(ansN) && /9687\s+22-05-86 → 10-08-82\s+POD CNDAI — 🔵 본선 잔류 확정\(선적 EDI\)/.test(ansN) && /9872\s+22-07-86 → 10-07-82\s+POD CNDAI — 🔵 본선 잔류 확정\(선적 EDI\)/.test(ansN) && /🔵 본선 잔류 확정 2대는 선사 지시\(평택에서 안 내림\)로 선적 EDI 에 실려 있어 양하 대수에서 빼고 시프팅으로 셉니다\./.test(ansN) && !/🟡 시프팅 예보/.test(ansN),
    '미르 «시프팅 몇 대» — 지금 «시프팅 64대 [확정]» · 두 대는 «🔵 본선 잔류 확정(선적 EDI)» 줄 · 꼬리 설명 · 노란 예보 문단 없음', ansN.split('\n').slice(0, 2).join(' / ') + ' …' + ansN.slice(-200));
  ok(/시프팅 62대 \[확정\]/.test(ansB) && /🟡 시프팅 예보 2대/.test(ansB) && !/본선 잔류 확정/.test(ansB), '10-25 — 종전 «시프팅 62대 [확정]» + «🟡 시프팅 예보 2대» 그대로');

  console.log('⑩ 콘앱 2.72 — 콘앱 함수를 떼어 실제로 돌린다(검수앱과 같은 답)');
  const cone = src('public/cone.html');
  const cut = (name) => { const i = cone.indexOf('function ' + name + '('); if (i < 0) throw new Error('콘앱에 없는 함수 ' + name); let j = cone.indexOf('{', i), depth = 0, k = j; for (; k < cone.length; k++) { const ch = cone[k]; if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) break; } } return cone.slice(i, k + 1); };
  const rowsOf = (v, mode) => T.parseBAPLIE(v[mode].raw.edi.text).containers;
  const mkCone = (v) => {
    const state = { keepOnboard: v.keepOnboard, restowList: v.restowList, disch: { ediRows: rowsOf(v, 'discharge') }, stow: { ediRows: rowsOf(v, 'loading') }, swapFix: null };
    const win = { ConeParse: { keepConfirmedFromMaps: T.keepConfirmedFromMaps, computeShiftingMap: T.computeShiftingMap, restowMapFromDoc: T.restowMapFromDoc, shiftEvidenceCore: T.shiftEvidenceCore, applySwapFix: T.applySwapFix, swapFixList: T.swapFixList } };
    const code = ['ctKeepConf', 'ctShiftMap', 'P_ec', '_applySwapFix2', 'ctShiftEvid'].map(cut).join('\n') + '\nfunction ctShiftInfoNow(v){ return { berthShift: ' + JSON.stringify(v.info.berthShift) + ', terminalStatus: ' + JSON.stringify(v.info.terminalStatus || '') + ' }; }\nreturn { ctKeepConf, ctShiftMap, ctShiftEvid };';
    return new Function('state', 'window', 'console', 'typeof_window', code)(state, win, { warn: () => {}, error: () => {}, log: () => {} }, 1);
  };
  const mapOfRows = (rows) => { const m = {}; for (const r of rows) { const k = String(r.cn || '').replace(/[\s-]/g, '').toUpperCase(); if (k.length === 11) m[k] = r; } return m; };
  let cnN = null, cnB = null, cfN = null, cfB = null, evCN = null, evCB = null;
  try {
    cnN = mkCone(vN); cnB = mkCone(vB);
    const dmN = mapOfRows(rowsOf(vN, 'discharge')), lmN = mapOfRows(rowsOf(vN, 'loading')), dmB = mapOfRows(rowsOf(vB, 'discharge')), lmB = mapOfRows(rowsOf(vB, 'loading'));
    cfN = cnN.ctShiftMap(dmN, lmN, { berthShift: vN.info.berthShift }); cfB = cnB.ctShiftMap(dmB, lmB, { berthShift: vB.info.berthShift });
    evCN = cnN.ctShiftEvid(vN); evCB = cnB.ctShiftEvid(vB);
  } catch (e) { errs.push('콘앱 함수 실행: ' + e.message); }
  ok(!!cfN && nKeys(cfN).length === 64 && cfN[K1]._keepConf && cfN[K2]._keepConf && cfN[K1].from === '0220586' && cfN[K1].to === '0100882' && !!cfB && nKeys(cfB).length === 62 && !cfB[K1], `콘앱 확정 시프팅 지도(ctShiftMap) — 지금 ${cfN ? nKeys(cfN).length : '-'} · 10-25 ${cfB ? nKeys(cfB).length : '-'}(검수앱과 같은 수)`);
  ok(!!cfN && JSON.stringify(nKeys(cfN).sort()) === JSON.stringify(nKeys(cN).sort()), '콘앱 지도의 컨 목록 = 검수앱 확정 시프팅 지도(64대 한 벌)');
  ok(!!evCN && evCN.status === '확정' && evCN.count === 62 && evCN.keepConfN === 2 && evCN.line === evN.line && !!evCB && evCB.status === '확정' && !evCB.keepConfN && evCB.line === evB.line, '콘앱 시프팅 근거(ctShiftEvid) — 검수앱 shiftEvidenceOf 와 같은 줄(지금 «… 본선 잔류 확정 2대 … 아직 반영 전» · 10-25 종전)', JSON.stringify([evCN && evCN.line, evN && evN.line]));
  const sSrc = src('public/cone.html');
  ok(/window\.__CONEV='ConeOne 2\.7[23](-0[1-9])?'/.test(sSrc) && /ConeOne 2\.7[23](-0[1-9])?<\/span>/.test(sSrc) && /const _kc=ctKeepConf\(_kd,_kl\);\s*\n?\s*for\(const _k2 of Object\.keys\(_kc\)\) if\(!_conf\[_k2\]\) _conf\[_k2\]=_kc\[_k2\];/.test(sSrc.replace(/\r/g, '')) && /Object\.keys\(_kc\)\.length\) shiftMap=Object\.assign\(\{\}, _conf, _fc\|\|\{\}\)/.test(sSrc),
    '배선 — 콘앱 2.72 · 미르 갈래가 확정 두 대를 시프팅 지도에 얹고(서류가 이미 든 컨은 덮지 않는다) 예보와 같이 합친다');
  ok(/keepConfirmedFromMaps/.test(src('src/coneCargoPlan.entry.jsx')) && /window\.ConeParse = \{[^}]*keepConfirmedFromMaps/.test(src('src/coneCargoPlan.entry.jsx')), '배선 — 콘앱 번들이 판정 본체(keepConfirmedFromMaps)를 내보낸다(검수앱과 같은 한 벌)');

  console.log('⑪ 배선·문구 — 버전 · APP_NOTE · 매뉴얼 · 호출부');
  const U = src('src/utils.js');
  ok(/export const APP_VERSION = 'TallyOne 4\.(53|5[4-9])(-\d\d)?'/.test(U) && (/APP_NOTE = '4\.53 [^']*본선 잔류 확정[^']*'/.test(U) || !/export const APP_VERSION = 'TallyOne 4\.53'/.test(U)), '버전 TallyOne 4.53+ · APP_NOTE «본선 잔류 확정»(4.53 판일 때 — 뒤 판은 자기 문구)');
  const note = (U.match(/APP_NOTE = '([^']*)'/) || [])[1] || '';
  ok(note.length < 120 && (note.match(/\./g) || []).length <= 3 && !/[\/']/.test(note), 'APP_NOTE — 두 문장 이내 · 120자 미만 · 작은따옴표·슬래시 없음', note);
  const help = src('src/data/helpData.js');
  ok(/선사 지시 본선 잔류 — 평택에서 안 내리는 컨 \(4\.48 · 4\.53 확정\)/.test(help) && /4\.53 — \*\*선적 EDI 가 확정 자료입니다\*\*/.test(help) && /🔵 본선 잔류 확정 N/.test(help) && /같은 자리에 실려 있으면 «예정» 그대로/.test(help), '매뉴얼 — «선사 지시 본선 잔류» 절에 4.53 확정(선적 EDI)·칩·같은 자리는 예정 설명');
  const ht = String(T.generateHowToAnswer ? '' : '');
  const SP = src('src/components/SearchPanel.jsx'), VP = src('src/pages/VoyagePage.jsx');
  ok(/keepConfirmedOf/.test(SP) && /_keepConf: _keepC\[c\.cn\]/.test(SP) && /_keepConf: _kcf\[cn\]/.test(VP) && /filter === 'keepconf'/.test(VP), '배선 — 작업 화면(SearchPanel)·항차 화면 리스트 행이 _keepConf 를 단다 · 칩 필터 keepconf');
  const HP = src('src/pages/HomePage.jsx'), CD = src('src/pages/ChiefDashboard.jsx');
  ok(/for \(const cn of keepInShiftOf\(keepOnboard, shiftSet\)\) ptkCns\.delete\(cn\)/.test(HP) && /for \(const cn of keepInShiftOf\(keepOnboard, shiftSet\)\) ptkCns\.delete\(cn\)/.test(CD) && /computeStats\(v\?\.discharge, 'discharge', undefined, undefined, v \? shiftCnSetOf\(completeTarget\.key, v\) : undefined, v\?\.keepOnboard\)\.ptk/.test(HP),
    '배선 — 홈 카드·수석 보드 computeStats 가 같은 줄로 확정 본선 잔류를 평택분에서 뺀다 · 홈 «완료 확인» 창도 시프팅 집합을 넘긴다');
  ok(/keepConfirmedOf\(voyage\)/.test(U) && /const _kc = keepConfirmedOf\(voyage\);\s*\n?\s*for \(const cn of Object\.keys\(_kc\)\) if \(!map\[cn\]\) map\[cn\] = _kc\[cn\];/.test(U.replace(/\r/g, '')), '배선 — 확정 시프팅 지도(computeShiftingMapCached)가 서류에 없는 확정 컨만 얹는다');

  console.log('⑫ 경고 · 화면 오류');
  const bad2 = warns.filter((w) => /본선 잔류 확정|4\.53|양하·선적 EDI 읽기 실패/.test(w));
  ok(bad2.length === 0, '본선 잔류 확정 경로에서 조용히 삼킨 실패(콘솔 경고) 없음', bad2.join(' | '));
  ok(errs.length === 0, '화면 오류 0', errs.join(' | '));
  console.log(`\n4.53 선사 지시 본선 잔류 확정 연막 — ${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('연막검사 실행 오류', e && e.stack || e); process.exit(1); });
