// 4.49 연막검사 — 실번호 판정 한 벌: ML Seal 주실 · 보조실 · 다른 자료 실(하나만 맞으면 맞음) · 큰 실은 세관 값 · 신고 끝자리 빠짐은 실오류.
//   실행 — node tools/smoke_seal449.cjs <repoRoot> <번들(smoke_seal449.jsx)>. 실패하면 빌드를 세운다.
//   실자료 — MAMP 641N 선사 StandardDischargeList·세관 Excel_20261024122429 사본(대상 컨 줄만 · 개인 칸 지움) · 저장 기록(RTDB GET 13:49) ·
//     RZOR R117E VPLU8414662(리스트 000064 / EDI 250499) · 보관 항차 정답지 10대(검수원 고친 기록 · 세관 잘림 · 제작컨 이어 붙은 씰 · 컨번호 실). 실 Firebase 쓰기 없음(메모리 DB).
const fs = require('fs');
const path = require('path');
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
  dom.window.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
  dom.window.alert = (m) => errs.push('alert: ' + String(m).slice(0, 160));
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(300);
  const T = dom.window.__T, W = dom.window, doc = W.document;
  if (!T) { console.log('  FAIL 번들이 시험 함수를 못 내놓았다', errs.join(' | ')); process.exit(1); }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const src = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  const buf = (f) => { const b = fs.readFileSync(path.join(root, 'tools/fixtures', f)); const u = new W.Uint8Array(b.length); u.set(b); return u.buffer; };   // 창(jsdom) 쪽 ArrayBuffer — 노드 것은 XLSX 가 못 알아본다
  const CAR = 'StandardDischargeList_FinalDischargeDeadline_21C641N643SKRPYOTM_3.xlsx', CUS = 'Excel_20261024122429.xls', VK = 'MAMP_641N';
  const T7 = 'MMAU1264907', T6 = 'MMAU1449916';
  const by = (recs) => Object.fromEntries(recs.map((r) => [r.cn, r]));

  console.log('① 선사 리스트(머스크 StandardDischargeList) — ML Seal 이 주실 · Shipper Seal 은 보조실');
  const car = by(((await T.parseListExcel(buf('seal449_mamp641n_car.xlsx'))) || {}).records || []);
  ok(car[T6] && car[T6].sl === 'PH0522710' && car[T6].sl_alt === '10645428', `${T6} 주실 PH0522710(ML Seal) · 보조실 10645428(Shipper Seal)`, JSON.stringify(car[T6] && { sl: car[T6].sl, alt: car[T6].sl_alt }));
  ok(car.CNIU2230188 && car.CNIU2230188.sl === 'PH0559769' && !car.CNIU2230188.sl_alt, 'ML Seal 칸이 비면 Shipper Seal 이 주실(CNIU2230188 PH0559769 · 보조실 없음)', JSON.stringify(car.CNIU2230188));
  ok(car[T7] && car[T7].sl === 'MLPH0463390', `${T7} 주실 MLPH0463390`, car[T7] && car[T7].sl);

  console.log('② 세관 리스트 — 세관 값은 끝자리가 빠져 온다');
  const cus = ((await T.parseListExcel(buf('seal449_mamp641n_cus.xlsx'))) || {}).records || [];
  ok(by(cus)[T7] && by(cus)[T7].sl === 'MLPH046339', `${T7} 세관 MLPH046339`, by(cus)[T7] && by(cus)[T7].sl);
  ok(T.isCustomsSrc(CUS) && !T.isCustomsSrc(CAR) && T.isCustomsSrc('적하목록.xls') && !T.isCustomsSrc('R117E航次 预配.xls'), '세관 출처 판정 한 벌(isCustomsSrc — 파일 이름)');

  //  VoyagePage «📥 추가 병합» 과 같은 순서 — 빈 칸 보존 병합 + utils.mergeUploadSeal → firebase.fbSaveListRecords(메모리 DB)
  const upload = async (rows, fname, start) => {
    const cnMap = clone(start || {});
    for (const r0 of clone(rows)) {
      const r = { ...r0, _source: fname }; const prev = cnMap[r.cn];
      if (!prev) { cnMap[r.cn] = r; continue; }
      const merged = { ...prev };
      for (const [k, v] of Object.entries(r)) { if (v === '' || v == null) continue; merged[k] = v; }
      Object.assign(merged, T.mergeUploadSeal(prev, r, fname));
      merged._source = fname; cnMap[r.cn] = merged;
    }
    await T.fbSaveListRecords(VK, 'discharge', cnMap);
    return clone(((((W.__memdb || {}).voyages || {})[VK] || {}).discharge || {}).records || {});
  };
  const row = (recs, cn) => ({ ...recs[cn], cn });

  console.log('③ 새 배 — 선사 리스트 다음 세관 리스트 추가 병합: 둘 다 «다른 자료 실» · 큰 실은 세관 값 · 끝자리 빠짐은 실오류');
  W.__memdb = { voyages: { [VK]: { discharge: { records: {} } } } };
  const r1 = await upload(Object.values(car), CAR, {});
  const r2 = await upload(cus, CUS, r1);
  const k7 = T.sealCheckOf(row(r2, T7));
  ok(r2[T7].sl === 'MLPH046339' && Array.isArray(r2[T7].sl_conflict) && r2[T7].sl_conflict.map((h) => h.sl).sort().join(',') === 'MLPH046339,MLPH0463390',
    `${T7} 저장 — 큰 실(sl) 세관 MLPH046339 · 선사 MLPH0463390 도 남는다(종전 «긴 쪽 채택»은 세관 값을 지웠다)`, JSON.stringify({ sl: r2[T7].sl, c: r2[T7].sl_conflict, src: r2[T7].sl_src }));
  ok(k7.trunc && k7.error && k7.from === 'MLPH046339' && k7.actual === 'MLPH0463390' && T.isSealError(row(r2, T7)),
    `${T7} 실오류(끝자리 빠짐) — 신고 MLPH046339 → 실물 MLPH0463390 · 검수원이 안 고쳐도(7.8-F 9)`, JSON.stringify(k7));
  ok(T.inspectionSealOf(row(r2, T7)) === 'MLPH046339', '카드 큰 글씨 실 = 세관 값', T.inspectionSealOf(row(r2, T7)));
  const k6 = T.sealCheckOf(row(r2, T6));
  ok(!k6.error && k6.big === 'PH0522710' && k6.known.some((x) => x.v === '10645428' && x.kind === 'alt'), `${T6} 실오류 아님 · 큰 실 PH0522710 · 보조실 10645428 이 다른 자료 실로`, JSON.stringify(k6.known));
  const r3 = await upload(Object.values(car), CAR, r2);
  ok(r3[T7].sl === 'MLPH046339' && T.isSealError(row(r3, T7)), '선사 리스트를 다시 올려도 큰 실은 세관 값 그대로(세관 출처가 이긴다)', JSON.stringify({ sl: r3[T7].sl, src: r3[T7].sl_src }));
  const ed = { ...row(r2, T7), sl: 'MLPH0463390', sl_orig: 'MLPH046339', sl_history: [{ from: 'MLPH046339', to: 'MLPH0463390', by: '시험' }] };
  const ked = T.sealCheckOf(ed);
  ok(ked.error && ked.from === 'MLPH046339' && ked.actual === 'MLPH0463390', '검수원이 실물 MLPH0463390 으로 고쳐도 같은 실오류(신고 정정 대상)', JSON.stringify(ked));
  ok(!T.sealCheckOf({ ...ed, sl: 'MLPH046339', sl_history: [{ from: 'MLPH046339', to: 'MLPH046339' }] }).error, '실물이 신고 값과 같으면(잘린 게 아니었다) 실오류 아님');

  console.log('④ 지금 저장된 MAMP 641N(RTDB GET 13:49)에 세관 리스트 추가 병합 — 실오류는 끝자리 빠짐 한 대뿐');
  W.__memdb = { voyages: { [VK]: { discharge: { records: clone(T.FX.mamp641n.records) } } } };
  const before = Object.keys(T.FX.mamp641n.records).filter((cn) => T.isSealError(row(T.FX.mamp641n.records, cn)));
  ok(before.join(',') === T7, `올리기 전에도 ${T7} 한 대(앞 병합이 sl_orig 에 남긴 세관 값 MLPH046339)`, before.join(','));
  const s2 = await upload(cus, CUS, T.FX.mamp641n.records);
  const after = Object.keys(s2).filter((cn) => T.isSealError(row(s2, cn)));
  ok(after.join(',') === T7 && T.sealCheckOf(row(s2, T7)).from === 'MLPH046339', `추가 병합 뒤에도 ${T7} 한 대 · 나머지 5대 실오류 아님`, after.join(','));

  console.log('⑤ 정답지 — 보관 항차 기록(검수원이 고친 기록 · 세관 잘림 · 이어 붙은 씰 · 컨번호 실)');
  const EXP = {
    'MCAP_639N/MNBU4491858': [true, 'MLPH052993', 'MLPH0529932'], 'MCSC_638N/MNBU4710196': [true, 'MLPH057268', 'MLPH0572680'],
    'MCSC_633N/MNBU4598580': [true, 'MLPH057895', 'MLPH0578959'], 'ATPR_2646E/HALU2331077': [true, '00240', '002403'], 'PCSZ_2618E/SKHU6510432': [true, 'SKR018739', 'SKR01873'],
    'RZOR_R106E/SAWTBP004': [false], 'RZOR_R077E/SPSU6024939': [false], 'STMJ_2643E/SKHU8912132': [false], 'STMJ_2659E/FFAU1654550': [false], 'STSE_2681E/CAAU9893623': [false],
  };
  const why = { 'RZOR_R106E/SAWTBP004': '제작컨 이어 붙은 씰 20자 컷 — 갈라서 하나면 맞음', 'RZOR_R077E/SPSU6024939': '대소문자만 다름', 'STMJ_2643E/SKHU8912132': '리스트끼리 다름(실물 본 사람 없음)',
    'STMJ_2659E/FFAU1654550': '실 칸에 컨번호', 'STSE_2681E/CAAU9893623': '실 칸에 컨번호(세관 10자 컷)' };
  for (const [k, e] of Object.entries(EXP)) {
    const a = T.FX.arch[k]; const cn = k.split('/')[1]; const r = T.sealCheckOf({ ...a.rec, cn }, a.ediSl);
    ok(r.error === e[0] && (!e[0] || (r.from === e[1] && r.actual === e[2])), `${k} ${e[0] ? `실오류 ${e[1]} → ${e[2]}` : `실오류 아님 — ${why[k]}`}`, JSON.stringify({ error: r.error, from: r.from, actual: r.actual, trunc: r.trunc }));
  }
  ok(T.sealCheckOf({ ...T.FX.arch['STMJ_2643E/SKHU8912132'].rec, cn: 'SKHU8912132' }).known.map((x) => x.v).sort().join(',') === '482869,549844', 'STMJ 2643E SKHU8912132 — 두 실 다 «다른 자료 실»로 보인다');

  console.log('⑥ RZOR R117E VPLU8414662 — EDI 실도 다른 자료 실 · 하나만 맞으면 맞음');
  const rz = T.FX.rzor, rzc = { ...rz.rec, cn: 'VPLU8414662' };
  const krz = T.sealCheckOf(rzc, rz.ediSl);
  ok(krz.known.map((x) => x.v).sort().join(',') === '000064,250499' && !krz.error, '알려진 실 000064(리스트) · 250499(세관·EDI) · 실오류 아님', JSON.stringify(krz.known));
  const fix = (v) => ({ ...rzc, sl: v, sl_orig: rzc.sl, sl_history: [{ from: rzc.sl, to: v, by: '시험' }] });
  ok(!T.sealCheckOf(fix('250499'), rz.ediSl).error && !T.sealCheckOf(fix('000064'), rz.ediSl).error && T.sealCheckOf(fix('999999'), rz.ediSl).error,
    '실물을 250499 · 000064 로 넣으면 맞음 · 999999 면 실오류(어느 것과도 다름)');
  const bare = { ...rzc, sl_conflict: null, sl_orig: null, sl_src: 'R117E航次 预配.xls', sl: '000064' };   // 리스트 실만 남은 꼴(EDI 실은 항차 화면 병합의 slEdi · 마감텔리의 ediSl 로만 온다)
  ok(!T.sealCheckOf(bare, '250499').error && T.sealCheckOf(bare, '250499').known.some((x) => x.kind === 'edi' && x.v === '250499') && T.sealCheckOf({ ...bare, slEdi: '250499' }).known.some((x) => x.kind === 'edi'),
    '리스트 실이 sl 을 덮어도 EDI 실(slEdi · ediSl)이 다른 자료 실로 남는다');

  console.log('⑦ 같은 답 — 마감텔리 Act. Cntr-Seal · 미르 실번호 점검 · 인계 리씰');
  const vy = { info: { vsl: 'MAMP', voy: '641N' }, discharge: { records: s2, ediContainers: {} }, loading: {} };
  const sl = T.buildSealList(vy, 'discharge');
  const s7 = sl.find((x) => x.cn === T7);
  ok(sl.length === 1 && s7 && s7.manifestSeal === 'MLPH046339' && s7.actualSeal === 'MLPH0463390', `마감텔리 실번호 상이 1줄 — ${T7} 신고 MLPH046339 · 실물 MLPH0463390`, JSON.stringify(sl));
  const si = T.sealIssuesOf(Object.entries(s2).map(([cn, r]) => ({ cn, ...r })));
  ok(si.errs.length === 1 && si.errs[0].cn === T7 && si.errs[0].from === 'MLPH046339' && si.errs[0].to === 'MLPH0463390', '미르 실번호 점검 — 실오류 1건(같은 판정)', JSON.stringify(si.errs));
  //  4.49-04 — 미르 «실번호 점검»: 실오류는 한 대씩 · 세관 실과 모양이 다른 의심 여럿은 한마디(MAMP 641N 머스크 Shipper Seal 18대가 18줄로 나오던 것)
  {
    const _sus = [1, 2, 3, 4, 5].map((i) => ({ cn: `TEST123456${i}`, _mode: 'discharge', _source: 'a_list.xlsx', sl: `1064540${i}`, sl_src: 'a_list.xlsx',
      sl_conflict: [{ sl: `1064540${i}`, src: 'a_list.xlsx' }, { sl: `PH052271${i}`, src: 'Excel_20261024122429.xls' }] }));
    const _cs = [...Object.entries(s2).map(([cn, r]) => ({ cn, ...r, _mode: 'discharge' })), ..._sus];
    const _base = (/^🔎 리스트 실이 세관 실과 모양이 다른 컨 (\d+)대/m.exec(T.generateSealAuditAnswer(_cs.slice(0, _cs.length - _sus.length), '양하')) || [0, 0])[1] | 0;   // 검수 자료 자체에 이미 있는 모양 다른 컨 대수
    const ans = T.generateSealAuditAnswer(_cs, '양하');
    const _ln = ans.split('\n');
    ok(/⚠ 실오류: 리스트 「MLPH046339」 → 실물 「MLPH0463390」/.test(ans), '4.49-04 미르 실번호 점검 — 실오류는 한 대씩 말한다', ans);
    ok(_ln.filter((l) => new RegExp(`^🔎 리스트 실이 세관 실과 모양이 다른 컨 ${_base + 5}대`).test(l)).length === 1 && !/실오류 의심:/.test(ans) && !_sus.some((x) => ans.includes(x.cn)),
      `4.49-04 미르 실번호 점검 — 세관 실과 모양이 다른 의심 ${_base + 5}대(기존 ${_base} + 추가 5)는 한 줄(한 대씩 안 부름 · 컨번호 전체를 늘어놓지 않음)`, ans);
    ok(_ln.length <= 4, `4.49-04 미르 실번호 점검 — 줄 수 ${_ln.length}(실오류 1 + 의심 한마디 + 머리)`, ans);
    //  같은 컨이 예상 실오류(자릿수 부족)이면서 세관 실과도 다를 때 — 한 대씩 말하고 한마디 줄에는 또 세지 않는다(독립 감사 재현)
    {
      const LST = 'a_list.xlsx', CUS = 'Excel_20261024122429.xls';
      const _cl = Array.from({ length: 30 }, (_, i) => ({ cn: `TEST${1000000 + i}`, fe: 'F', op: 'MAE', _mode: 'discharge', _source: LST, sl: `PH${5000000 + i}`, sl_orig: `PH${5000000 + i}`, sl_src: LST }));
      const _j = { cn: 'SHRT0000001', fe: 'F', op: 'MAE', _mode: 'discharge', _source: LST, sl: 'PH052271', sl_orig: 'PH052271', sl_src: LST, sl_conflict: [{ sl: 'PH052271', src: LST }, { sl: 'PH0522711', src: CUS }] };
      const _cs2 = [..._cl, _j];
      const _recs = Object.fromEntries(_cs2.map((c) => [c.cn, { sl: c.sl, sl_orig: c.sl_orig, sl_src: c.sl_src, sl_conflict: c.sl_conflict, op: c.op }]));
      const a2 = T.generateSealAuditAnswer(_cs2, '양하', _recs);
      ok(/• SHRT0000001 — 🔎 예상 실오류/.test(a2) && !/세관 실과 모양이 다른 컨/.test(a2) && (a2.match(/SHRT0000001/g) || []).length === 1,
        '4.49-04 미르 실번호 점검 — 예상 실오류로 말한 컨은 «모양이 다른 컨 N대» 한 줄에 또 세지 않는다', a2);
    }
  }
  const ho = T.generateHandover(Object.entries(s2).map(([cn, r]) => ({ cn, ...r, _mode: 'discharge', _src: 'list' })), {});
  ok(/리씰 1: 4907\(MLPH046339→MLPH0463390\)/.test(ho), '인계 «리씰 1: 4907(MLPH046339→MLPH0463390)»', String(ho).split('\n').filter((l) => /리씰/.test(l)).join(' / '));

  console.log('⑧ 화면 — 실번호 아래 «다른 자료 실» 한 줄 · 실오류 · 끝자리 빠짐 안내');
  W.__renderLine({ c: row(s2, T7), showError: true }); await wait(80);
  const t7 = doc.getElementById('root').textContent;
  ok(/다른 자료 실 MLPH0463390 \(선사 리스트\)/.test(t7) && /🚨 실오류 — 신고 MLPH046339 → 실물 MLPH0463390/.test(t7) && /⚠ 신고 실 MLPH046339 은 MLPH0463390 의 끝자리가 빠진 값/.test(t7),
    `${T7} — 다른 자료 실 MLPH0463390 (선사 리스트) · 🚨 실오류 신고→실물 · ⚠ 끝자리 빠짐`, t7);
  W.__renderLine({ c: row(r2, T6) }); await wait(80);
  const t6 = doc.getElementById('root').textContent;
  ok(/다른 자료 실 10645428 \(보조실\)/.test(t6) && !/실오류/.test(t6), `${T6}(새 배 ③) — «다른 자료 실 10645428 (보조실)» · 실오류 아님`, t6);
  W.__renderLine({ c: row(s2, T6) }); await wait(80);
  const t6b = doc.getElementById('root').textContent;
  ok(/다른 자료 실 10645428 \(선사 리스트\)/.test(t6b) && !/실오류/.test(t6b), `${T6}(지금 저장본 — 옛 파서가 Shipper Seal 을 선사 리스트 값으로 남김) — «다른 자료 실 10645428 (선사 리스트)»`, t6b);
  W.__renderLine({ c: row(s2, 'CNIU2230188') }); await wait(80);
  ok(doc.getElementById('root').textContent === '', '자료가 한 실뿐이면 줄을 그리지 않는다(CNIU2230188)', doc.getElementById('root').textContent);
  W.__renderDetail({ c: row(s2, T7), mode: 'discharge', voyageKey: VK, voyageInfo: vy.info, inspector: '김성일', records: s2, allContainers: [row(s2, T7)] }); await wait(150);
  const td = doc.body.textContent;
  ok(/원실번호 MLPH046339 → 실제 MLPH0463390/.test(td) && /⚠ 실오류/.test(td) && /다른 자료 실 MLPH0463390/.test(td), '컨 상세 — 세관 신고 양식 «원실번호 MLPH046339 → 실제 MLPH0463390» · 다른 자료 실 줄', td.slice(0, 300));

  console.log('⑩ 독립 감사 «부» 반영 — 세관이 긴 쪽 · 옛 꼴 · 한 번에 두 파일 · 고친 컨 · 두 앱 같은 답');
  //  상-1 — 세관 값이 긴 쪽이면 짧은 선사·EDI 값은 «다른 자료 실»(신고는 세관 값 · 잘림 아님) — PCSZ 2618E SKHU6510432 실 값으로 꾸민 사본
  const clg = { cn: 'SKHU6510432', sl: 'SKR018739', sl_src: 'Excel_20260918101010.xls', sl_conflict: [{ sl: 'SKR01873', src: 'PCSZ 2618E LIST.xlsx' }, { sl: 'SKR018739', src: 'Excel_20260918101010.xls' }] };
  const kcl = T.sealCheckOf(clg);
  const fx2 = (v) => ({ ...clg, sl: v, sl_orig: 'SKR018739', sl_history: [{ from: 'SKR018739', to: v, by: '시험' }] });
  ok(!kcl.trunc && !kcl.error && kcl.big === 'SKR018739' && !T.sealCheckOf(fx2('SKR018739')).error && !T.sealCheckOf(fx2('SKR01873')).error && T.sealCheckOf(fx2('SKR019999')).error,
    '세관 SKR018739 · 선사 SKR01873 — 잘림 아님 · 큰 실 세관 값 · 실물이 둘 중 하나면 맞음 · 셋째 값이면 실오류(감사 상-1)', JSON.stringify({ trunc: kcl.trunc, error: kcl.error, big: kcl.big }));
  const ce = T.sealCheckOf({ ...row(s2, 'CNIU2230188'), slEdi: 'PH055976' });
  ok(!ce.trunc && !ce.error && ce.big === 'PH0559769', 'EDI 가 세관보다 짧아도(CNIU2230188 세관 PH0559769 · EDI PH055976) 실오류 아님 · 큰 실 세관 값', JSON.stringify(ce));
  //  하-5 — 짧은 쪽이 8자 미만이면 잘림 아님 · 세 자 차이는 잘림 아님 · 0000 은 실 아님
  ok(!T.sealCheckOf({ cn: 'TEST1234567', sl: '1234567', sl_conflict: [{ sl: '123456', src: 'a.xls' }, { sl: '1234567', src: 'b.xls' }] }).error
    && !T.sealCheckOf({ cn: 'TEST1234567', sl: 'MLPH0463390', sl_conflict: [{ sl: 'MLPH0463', src: 'Excel_20261024122429.xls' }, { sl: 'MLPH0463390', src: 'b.xls' }] }).error
    && T.sealCheckOf({ cn: 'TEST1234567', sl: '0000', sl_conflict: [{ sl: '0000', src: 'a' }, { sl: 'ABC12345', src: 'b' }] }).known.every((x) => x.v !== '0000'),
    '잘림 바닥 — 123456 ↔ 1234567(8자 미만) · MLPH0463 ↔ MLPH0463390(세 자 차이)은 잘림 아님 · «0000»은 실로 안 센다(감사 하-5)');
  ok(!T.sealCheckOf({ ...T.FX.arch['RZOR_R106E/SAWTBP004'].rec, cn: 'SAWTBP004', sl: 'lf102335 LF102350-LF102345LF102336' }).error, '제작컨 이어 붙은 씰 — 소문자·공백·하이픈이 섞여도 갈라서 같은 씰(실오류 아님)');
  //  상-2 — 지금 저장본(옛 꼴 — sl 선사 · sl_orig 세관 · sl_src 세관)은 출처를 sl_orig 에 붙여 읽고, 선사 리스트를 다시 올려도 세관 잘림이 남는다
  const leg = row(T.FX.mamp641n.records, T7);
  const kl = T.sealCheckOf(leg);
  ok(T.sealLegacyOf(leg) && kl.big === 'MLPH046339' && kl.customs && kl.customs.v === 'MLPH046339' && kl.error && kl.from === 'MLPH046339' && kl.actual === 'MLPH0463390',
    `옛 꼴 ${T7} — 세관 표시는 sl_orig(MLPH046339)에 · 큰 실 세관 값 · 실오류 신고 MLPH046339 → 실물 MLPH0463390(감사 상-2·하-2)`, JSON.stringify({ big: kl.big, cus: kl.customs && kl.customs.v, from: kl.from, act: kl.actual }));
  for (const [nm, start] of [['추가 병합', T.FX.mamp641n.records], ['교체', {}]]) {
    W.__memdb = { voyages: { [VK]: { discharge: { records: clone(T.FX.mamp641n.records) } } } };
    const rr = await upload(Object.values(car), CAR, start);
    const kr = T.sealCheckOf(row(rr, T7));
    ok(kr.error && kr.from === 'MLPH046339' && kr.actual === 'MLPH0463390' && kr.big === 'MLPH046339' && kr.known.some((x) => x.v === 'MLPH046339' && x.customs) && !kr.known.some((x) => x.v === 'MLPH0463390' && x.customs),
      `옛 꼴에 선사 리스트를 «${nm}»으로 다시 올려도 — 실오류 그대로 · 세관 표시는 MLPH046339 에만(감사 상-2)`, JSON.stringify({ sl: rr[T7].sl, orig: rr[T7].sl_orig, src: rr[T7].sl_src, c: rr[T7].sl_conflict }));
  }
  //  중-5 — 한 번에 두 파일(선사 · 세관)을 «교체»로 · 고친 컨은 병합 뒤에도 실물 값
  W.__memdb = { voyages: { [VK]: { discharge: { records: {} } } } };
  let one = {};
  for (const [rows, fn] of [[Object.values(car), CAR], [cus, CUS]]) { for (const r0 of clone(rows)) { const r = { ...r0, _source: fn }; const p0 = one[r.cn]; if (!p0) { one[r.cn] = r; continue; } const mg = { ...p0 }; for (const [k, v] of Object.entries(r)) { if (v === '' || v == null) continue; mg[k] = v; } Object.assign(mg, T.mergeUploadSeal(p0, r, fn)); mg._source = fn; one[r.cn] = mg; } }
  await T.fbSaveListRecords(VK, 'discharge', one);
  const o2 = clone(W.__memdb.voyages[VK].discharge.records);
  ok(T.isSealError(row(o2, T7)) && T.sealCheckOf(row(o2, T7)).from === 'MLPH046339' && T.sealCheckOf(row(o2, T6)).known.some((x) => x.kind === 'alt' && x.v === '10645428') && !T.isSealError(row(o2, T6)),
    '한 번에 [선사 · 세관] 두 파일 «교체» — 같은 답(4907 실오류 · 9916 보조실 · 실오류 아님)');
  const ed6 = { ...clone(T.FX.mamp641n.records) }; ed6[T6] = { ...ed6[T6], sl: '10645428', sl_orig: 'PH0522710', sl_history: [{ from: 'PH0522710', to: '10645428', by: '시험' }] };
  W.__memdb = { voyages: { [VK]: { discharge: { records: clone(ed6) } } } };
  const re6 = await upload(cus, CUS, ed6);
  ok(re6[T6].sl === '10645428' && re6[T6].sl_orig === 'PH0522710' && (re6[T6].sl_history || []).length === 1 && !T.isSealError(row(re6, T6)),
    `고친 컨(${T6} 실물 10645428 — 보조실)은 세관 리스트 추가 병합 뒤에도 실물 값 · 고친 기록 그대로 · 실오류 아님(보조실과 같음)`, JSON.stringify({ sl: re6[T6].sl, orig: re6[T6].sl_orig, c: re6[T6].sl_conflict }));
  //  감사 3차(중) — 선사 리스트만 → 검수원이 고침 → 세관 리스트 «추가 병합»·«교체»: 고친 컨의 sl_src 는 고치기 전 서류 값(sl_orig)의 출처 그대로(세관 파일 이름이 옛 선사 값에 붙지 않는다)
  for (const [how, noSrc] of [['추가 병합', false], ['교체', false], ['추가 병합', true], ['교체', true]]) {   //  noSrc — 출처 칸(sl_src·_source)이 둘 다 없는 수집기 등록 꼴(재감사 중 · PCSZ 2618E SKHU6510432)
    W.__memdb = { voyages: { [VK]: { discharge: { records: {} } } } };
    const c1 = await upload(Object.values(car), CAR, {});
    const ed7 = clone(c1); ed7[T7] = { ...ed7[T7], sl: 'MLPH0463399', sl_orig: 'MLPH0463390', sl_history: [{ from: 'MLPH0463390', to: 'MLPH0463399', by: '시험' }] };
    if (noSrc) { delete ed7[T7].sl_src; delete ed7[T7]._source; }
    W.__memdb = { voyages: { [VK]: { discharge: { records: clone(ed7) } } } };
    let c2;
    if (how === '추가 병합') c2 = await upload(cus, CUS, ed7);
    else { await T.fbSaveListRecords(VK, 'discharge', Object.fromEntries(clone(cus).map((r) => [r.cn, { ...r, _source: CUS }]))); c2 = clone(W.__memdb.voyages[VK].discharge.records); }
    const k = T.sealCheckOf(row(c2, T7));
    ok(c2[T7].sl === 'MLPH0463399' && c2[T7].sl_orig === 'MLPH0463390' && (noSrc ? !T.isCustomsSrc(c2[T7].sl_src) && !!c2[T7].sl_src : c2[T7].sl_src === CAR) && k.big === 'MLPH046339' && k.trunc && k.error && k.from === 'MLPH046339'
       && !k.known.some((x) => x.v === 'MLPH0463390' && x.customs) && k.known.some((x) => x.v === 'MLPH046339' && x.customs),
      `선사만${noSrc ? '(출처 칸 없음)' : ''} → 고침(MLPH0463399) → 세관 «${how}» — sl_src ${noSrc ? '«세관 아님» 표시' : '선사 그대로'} · 세관 표시는 MLPH046339 에만 · 큰 실 세관 값 · 신고 MLPH046339 → 실물 MLPH0463399 실오류(감사 3차 중)`,
      JSON.stringify({ sl: c2[T7].sl, orig: c2[T7].sl_orig, src: c2[T7].sl_src, c: c2[T7].sl_conflict, big: k.big, from: k.from }));
  }
  {   //  같은 값이 세관 파일로 오면 세관 출처로 올린다(2.06-11 «같은 값이면 세관 출처» — 고친 컨도)
    W.__memdb = { voyages: { [VK]: { discharge: { records: {} } } } };
    const c1 = await upload(Object.values(car), CAR, {});
    const ed7 = clone(c1); ed7[T7] = { ...ed7[T7], sl: 'MLPH0463399', sl_orig: 'MLPH0463390', sl_history: [{ from: 'MLPH0463390', to: 'MLPH0463399', by: '시험' }] };
    W.__memdb = { voyages: { [VK]: { discharge: { records: clone(ed7) } } } };
    await T.fbSaveListRecords(VK, 'discharge', { [T7]: { cn: T7, sl: 'MLPH0463390', _source: CUS } });
    const c3 = clone(W.__memdb.voyages[VK].discharge.records);
    ok(c3[T7].sl === 'MLPH0463399' && c3[T7].sl_orig === 'MLPH0463390' && c3[T7].sl_src === CUS && T.sealCheckOf(row(c3, T7)).big === 'MLPH0463390',
      '고친 컨에 같은 서류 값(MLPH0463390)이 세관 파일로 오면 — sl_src 세관으로 올림 · 큰 실 MLPH0463390(세관 값)', JSON.stringify({ src: c3[T7].sl_src }));
  }
  //  중-4·하-3 — 끝자리 빠짐 줄은 실오류일 때만 · 그때는 «하나면 맞음» 을 안 붙인다
  W.__renderLine({ c: { ...row(s2, T7), sl: 'MLPH046339', sl_orig: 'MLPH046339', sl_history: [{ from: 'MLPH046339', to: 'MLPH046339', by: '시험' }] }, showError: true }); await wait(60);
  const tq = doc.getElementById('root').textContent;
  ok(!/끝자리가 빠진 값/.test(tq) && !/🚨/.test(tq), '검수원이 실물을 신고 값 MLPH046339 로 확인하면 «끝자리 빠짐» 줄도 🚨 도 없다(감사 중-4)', tq);
  ok(!/실물이 이 가운데 하나면 맞음/.test(t7), '끝자리 빠짐 실오류 컨에는 «실물이 이 가운데 하나면 맞음» 을 안 붙인다(감사 하-3)', t7);
  //  중-3 — 콘앱(행에 리스트 실 칸 없음 · slEdi 만)과 검수앱이 «4907 실번호» 에 같은 답
  const MV = { info: T.FX.mamp641n.info, discharge: { records: clone(T.FX.mamp641n.records), ediContainers: clone(T.FX.mamp641n.edi), completed: {} }, loading: {} };
  const tCs = T.flattenVoyages({ [VK]: MV }).filter((c) => c.voyageKey === VK);
  const tctx = { app: 'tally', voyageKey: VK, voyage: MV, info: MV.info, mode: 'discharge', containers: tCs, flat: tCs, voyages: { [VK]: MV }, inspector: '연막', accepted: true, modeChoice: 'both' };
  const p2 = (x) => String(x || '').padStart(2, '0');
  const crow = Object.values(MV.discharge.ediContainers).map((c) => ({ bay: String(c.bay), row: p2(c.row), tier: p2(c.tier), size: String(c.iso || '')[0] === '2' ? '20' : '40', cn: String(c.cn).toUpperCase(), iso: c.iso || '', fe: c.fe || '', op: c.op || '', wt: c.wt || 0, pol: c.pol || null, pod: c.pod || null, slEdi: c.sl != null ? String(c.sl) : '' }));
  let cCs = T.toMirContainers(crow, 'discharge');
  cCs = T.applyDischargeUnits(cCs, { discharge: { records: MV.discharge.records, completed: {}, termWork: {} } }, new Set()).rows;
  const cctx = { app: 'cone', containers: cCs, cone: { rows: [], dischRows: [], stowRows: [] }, accepted: true, mode: 'discharge', modeLabel: '양하', info: MV.info,
    voyage: { info: MV.info, reports: {}, discharge: { completed: {}, records: MV.discharge.records, termWork: {} }, loading: {} }, vsl: MV.info.vsl, voyageKey: VK, records: { discharge: MV.discharge.records, loading: {} }, inspector: '' };
  const askM = (q, ctx) => { T._mirThreadReset(); return String(T.answerOneRaw(q, ctx) || ''); };
  const aT = askM('4907 실번호', tctx), aC = askM('4907 실번호', cctx);
  ok(/실오류\(신고 MLPH046339 → 실물 MLPH0463390\)/.test(aT) && /실오류\(신고 MLPH046339 → 실물 MLPH0463390\)/.test(aC) && !/실번호 없음/.test(aC),
    '«4907 실번호» — 검수앱과 콘앱이 같은 실오류 답(콘앱 행에 리스트 실 칸이 없어도 · 감사 중-3)', JSON.stringify({ T: aT.slice(0, 200), C: aC.slice(0, 200) }));
  const aT6 = askM('9916 실번호', tctx), aC6 = askM('9916 실번호', cctx);
  ok(/10645428/.test(aT6) && /10645428/.test(aC6) && !/실오류/.test(aC6), '«9916 실번호» — 두 앱 다 다른 자료 실 10645428 · 실오류 아님', JSON.stringify({ T: aT6.slice(0, 160), C: aC6.slice(0, 160) }));
  //  감사 3차(하) — 연막이 따로 못 재던 자리(P11 · P12 · 세관 출처 올림 네 곳)를 하나씩 잰다
  {   //  P11 — 미르 «실번호 X(출처)» 괄호는 큰 실(세관 값)의 출처 — sl_src(선사)가 아니다(충돌 창에서 리스트 값을 고른 꼴)
    const MV2 = clone(MV);
    MV2.discharge.records[T7] = { ...MV2.discharge.records[T7], sl: 'MLPH0463390', sl_orig: 'MLPH0463390', sl_src: CAR, _source: CAR, sl_conflict: [{ sl: 'MLPH0463390', src: CAR }, { sl: 'MLPH046339', src: CUS }] };
    const fl2 = T.flattenVoyages({ [VK]: MV2 }).filter((c) => c.voyageKey === VK);
    const a2 = askM('4907 실번호', { ...tctx, voyage: MV2, containers: fl2, flat: fl2, voyages: { [VK]: MV2 } });
    ok(new RegExp(`실번호 MLPH046339\\(${CUS.replace(/\./g, '\\.')}\\)`).test(a2) && !a2.includes(`MLPH046339(${CAR})`), '미르 괄호 — sl_src 가 선사여도 큰 실(세관 MLPH046339)의 파일(감사 3차 하 · P11)', a2.slice(0, 200));
  }
  {   //  P12 — 종이 검수리스트 제작컨은 큰 실에서 가른다(sl 이 세관 20자 컷이어도 이어 붙은 네 씰 전부)
    const sw = { cn: 'SAWTBP004', bay: '05', row: '02', tier: '82', iso: 'L5G1', fe: 'F', op: 'HTF', pod: 'KRPTK', pol: 'CNRZH', wt: 19000,
      sl: 'LF102335LF102350LF10', sl_orig: 'LF102335LF102350LF10', sl_src: 'Excel_20260928005315.xls', _source: 'Excel_20260928005315.xls',
      sl_conflict: [{ sl: 'LF102335LF102350LF10', src: 'Excel_20260928005315.xls' }, { sl: 'LF102335LF102350LF102345LF102336', src: 'R106E航次 预配.xls' }] };
    let hp = ''; try { hp = String(T.generateInspectionListHTML([sw], 'discharge', { vsl: 'RZOR', voy: 'R106E' }) || ''); } catch (e) { errs.push('검수리스트 ' + e.message); }
    ok(/LF102335 LF102350 LF102345 LF102336/.test(hp) && !/LF102335 LF102350 LF10</.test(hp), '종이 검수리스트 — 제작컨 sl 이 세관 컷(…LF10)이어도 네 씰 «LF102335 LF102350 LF102345 LF102336»(감사 3차 하 · P12)', (hp.match(/LF102335[^<]{0,60}/) || [''])[0]);
  }
  {   //  세관 출처 올림 ① utils.mergeUploadSeal addH — 이미 다른 출처로 적힌 같은 값이 세관 파일로 오면 그 줄을 세관으로
    const mu = T.mergeUploadSeal({ cn: 'TSTU2222224', sl: 'PH1111111', sl_src: CAR, sl_conflict: [{ sl: 'PH1111111', src: CAR }, { sl: 'PH2222222', src: 'MAMP 641N 수정.xlsx' }] }, { cn: 'TSTU2222224', sl: 'PH2222222' }, CUS);
    ok((mu.sl_conflict || []).find((h) => h.sl === 'PH2222222')?.src === CUS && mu.sl === 'PH2222222', '올리기 병합(addH) — 같은 값 PH2222222 줄의 출처를 세관 파일로 올림 · 큰 실 세관 값', JSON.stringify(mu));
  }
  {   //  ② firebase nextSrc — 저장 대조에서 같은 값이 세관 파일로 오면 그 줄을 세관으로
    W.__memdb = { voyages: { [VK]: { discharge: { records: { TSTU2222224: { cn: 'TSTU2222224', sl: 'PH1111111', sl_src: CAR, _source: CAR, sl_conflict: [{ sl: 'PH1111111', src: CAR }, { sl: 'PH2222222', src: 'MAMP 641N 수정.xlsx' }] } } } } } };
    await T.fbSaveListRecords(VK, 'discharge', { TSTU2222224: { cn: 'TSTU2222224', sl: 'PH2222222', _source: CUS } });
    const g = W.__memdb.voyages[VK].discharge.records.TSTU2222224;
    ok((g.sl_conflict || []).find((h) => h.sl === 'PH2222222')?.src === CUS && (g.sl_conflict || []).length === 2, '저장 대조(nextSrc) — 같은 값 PH2222222 줄을 세관으로 올림 · 같은 실 두 줄 없음', JSON.stringify(g.sl_conflict));
  }
  {   //  ③ firebase 2.08-14 블록 — 옛 꼴 세관 sl_orig 가 이미 다른 출처 줄로 있으면 그 줄을 세관으로
    W.__memdb = { voyages: { [VK]: { discharge: { records: { TSTU2222224: { cn: 'TSTU2222224', sl: 'PH1111111', sl_orig: 'PH2222222', sl_src: CUS, _source: CUS, sl_conflict: [{ sl: 'PH2222222', src: 'MAMP 641N 수정.xlsx' }] } } } } } };
    await T.fbSaveListRecords(VK, 'discharge', { TSTU2222224: { cn: 'TSTU2222224', sl: 'PH1111111', _source: CAR } });
    const g = W.__memdb.voyages[VK].discharge.records.TSTU2222224;
    ok((g.sl_conflict || []).find((h) => h.sl === 'PH2222222')?.src === CUS && T.sealCheckOf({ ...g }).big === 'PH2222222', '옛 꼴 sl_orig(세관) 옮기기 — 같은 값 줄을 세관으로 올림 · 큰 실 세관 값', JSON.stringify(g));
  }
  {   //  ④ firebase nv.sl_conflict 합치기 — 올리기 병합이 만든 세관 줄이 저장된 다른 출처 줄을 세관으로
    W.__memdb = { voyages: { [VK]: { discharge: { records: { TSTU2222224: { cn: 'TSTU2222224', sl: 'PH1111111', sl_src: CAR, _source: CAR, sl_conflict: [{ sl: 'PH1111111', src: CAR }, { sl: 'PH2222222', src: 'MAMP 641N 수정.xlsx' }] } } } } } };
    await T.fbSaveListRecords(VK, 'discharge', { TSTU2222224: { cn: 'TSTU2222224', sl: 'PH1111111', _source: CAR, sl_conflict: [{ sl: 'PH2222222', src: CUS }] } });
    const g = W.__memdb.voyages[VK].discharge.records.TSTU2222224;
    ok((g.sl_conflict || []).find((h) => h.sl === 'PH2222222')?.src === CUS && (g.sl_conflict || []).length === 2, '저장 합치기(nv.sl_conflict) — 같은 값 줄을 세관으로 올림 · 같은 실 두 줄 없음', JSON.stringify(g.sl_conflict));
  }
  //  중-1 · 하-1 · 하-7 배선
  ok(/action: decisions\['seal:' \+ c\.cn\] \|\| 'list'/.test(src('src/components/ConflictReviewModal.jsx')) && /sl: a\.ediSl, sl_orig: a\.ediSl, sl_src: 'EDI', sl_conflict: hist/.test(src('src/pages/VoyagePage.jsx')),
    '충돌 창 실번호 기본 «리스트» · EDI 를 고르면 sl·sl_orig·출처 EDI · 리스트 값은 다른 자료 실(감사 중-1)');
  ok(/slEdi = String\(merged\[r\.cn\]\.sl\)/.test(src('src/components/SearchPanel.jsx')) && /if \(_ebM && _ebM\.sl\) safeR\.slEdi = String\(_ebM\.sl\)/.test(src('src/mir.js')), 'EDI 실(slEdi) — 작업 목록·미르 재료 병합에도(감사 중-2)');
  ok(/const slAct = _k\.error \? \(_k\.actual \|\| c\.sl \|\| ''\) : \(c\.sl \|\| ''\)/.test(src('src/components/CSVExport.jsx')), '결재용 CSV — 실오류면 원실번호 = 신고 실 · 실제실번호 = 실물(감사 하-1)');

  console.log('⑪ 재감사 «부» 반영 — 출처가 붙는 길 · 제작컨 큰 실 · 미르 괄호 · 마감텔리 EDI · 결재용 CSV');
  //  중-1 ① — 옛 꼴에 선사 리스트를 «추가 병합» 한 뒤 다시 «교체» 해도 세관 표시·큰 실이 그대로
  W.__memdb = { voyages: { [VK]: { discharge: { records: clone(T.FX.mamp641n.records) } } } };
  const ch1 = await upload(Object.values(car), CAR, T.FX.mamp641n.records);
  const ch2 = await upload(Object.values(car), CAR, {});
  const kch = T.sealCheckOf(row(ch2, T7));
  ok(kch.error && kch.big === 'MLPH046339' && T.inspectionSealOf(row(ch2, T7)) === 'MLPH046339' && (ch2[T7].sl_conflict || []).some((h) => h.sl === 'MLPH046339' && T.isCustomsSrc(h.src)) && !(ch2[T7].sl_conflict || []).some((h) => h.sl === 'MLPH0463390' && T.isCustomsSrc(h.src)),
    `옛 꼴 → 선사 추가 병합 → 선사 교체 — 큰 실 세관 MLPH046339 · 세관 표시는 짧은 값에만 · 실오류 그대로(재감사 중-1)`, JSON.stringify({ sl: ch2[T7].sl, src: ch2[T7].sl_src, c: ch2[T7].sl_conflict }));
  //  중-1 ② — 충돌 창 «EDI» 가 만든 옛 꼴(sl = EDI 잘린 값 · sl_orig = 세관 값 · sl_src = 세관 파일)에 선사 리스트를 올려도 거짓 실오류 없음
  const legE = clone(T.FX.mamp641n.records); legE.CNIU2230188 = { ...legE.CNIU2230188, sl: 'PH055976', sl_orig: 'PH0559769', sl_src: CUS, _source: CUS };
  const kE0 = T.sealCheckOf(row(legE, 'CNIU2230188'));
  ok(!kE0.error && kE0.big === 'PH0559769', '옛 꼴(EDI 고름) CNIU2230188 — 큰 실 세관 PH0559769 · 실오류 아님', JSON.stringify(kE0));
  for (const [nm, start] of [['추가 병합', legE], ['교체', {}]]) {
    W.__memdb = { voyages: { [VK]: { discharge: { records: clone(legE) } } } };
    const rE = await upload(Object.values(car), CAR, start);
    const kE = T.sealCheckOf(row(rE, 'CNIU2230188'));
    ok(!kE.error && kE.big === 'PH0559769' && kE.known.some((x) => x.v === 'PH0559769' && x.customs), `그 옛 꼴에 선사 리스트 «${nm}» — 실오류 아님 · 세관 표시 그대로(재감사 중-1 «신고 PH055976 → 실물 PH0559769» 거짓 실오류 없음)`, JSON.stringify({ sl: rE.CNIU2230188.sl, src: rE.CNIU2230188.sl_src, c: rE.CNIU2230188.sl_conflict, err: kE.error }));
  }
  //  중-2 — 제작컨(RZOR SAWTBP) 세관 20자 컷은 같은 씰 — 큰 실·검수 리스트는 이어 붙은 긴 값
  const saw = { ...T.FX.arch['RZOR_R106E/SAWTBP004'].rec, cn: 'SAWTBP004' };
  const ks = T.sealCheckOf(saw);
  ok(!ks.error && ks.big === 'LF102335LF102350LF102345LF102336' && T.inspectionSealOf(saw) === 'LF102335LF102350LF102345LF102336',
    '제작컨 SAWTBP004 — 큰 실 «LF102335LF102350LF102345LF102336»(세관 «…LF10» 컷은 같은 씰 · 4.20 그대로)', JSON.stringify({ big: ks.big, ins: T.inspectionSealOf(saw) }));
  const sNew = T.mergeUploadSeal({ cn: 'SAWTBP004', sl: 'LF102335LF102350LF102345LF102336', _source: 'R106E 预配.xls' }, { cn: 'SAWTBP004', sl: 'LF102335LF102350LF10' }, 'Excel_20260928005315.xls');
  ok(sNew.sl === 'LF102335LF102350LF102345LF102336' && sNew.sl_conflict.length === 2, '새로 올릴 때도 — 세관 컷이 와도 큰 실(sl)은 이어 붙은 긴 값 · 둘 다 다른 자료 실', JSON.stringify(sNew));
  //  하 — sl_src 없이 _source 만 세관(CDL)인 옛 기록(STMJ 2643E SKHU8912132)은 sl_orig 549844 에 세관 표시
  const st = T.sealCheckOf({ ...T.FX.arch['STMJ_2643E/SKHU8912132'].rec, cn: 'SKHU8912132' });
  ok(st.big === '549844' && st.customs && st.customs.v === '549844' && !st.error, 'STMJ 2643E SKHU8912132 — _source CDL 옛 꼴은 549844 가 세관 값(큰 실) · 482869 다른 자료 실 · 실오류 아님', JSON.stringify({ big: st.big, cus: st.customs && st.customs.v }));
  //  하 — 2.08-14: 세관 출처도 앞부분 관계도 아닌 옛 sl_orig(옛 파서 Bookno 같은 값)는 다른 자료 실로 옮기지 않고 지운다
  W.__memdb = { voyages: { [VK]: { discharge: { records: { TSTU1111118: { cn: 'TSTU1111118', sl: 'PH0465705', sl_orig: '279173867', _source: 'MCSN 637N LIST.xlsx', sl_src: 'MCSN 637N LIST.xlsx' } } } } } };
  await T.fbSaveListRecords(VK, 'discharge', { TSTU1111118: { cn: 'TSTU1111118', sl: 'PH0465705', _source: 'MCSN 637N LIST.xlsx' } });
  const jk = W.__memdb.voyages[VK].discharge.records.TSTU1111118;
  ok(!jk.sl_orig && !(jk.sl_conflict || []).some((h) => h.sl === '279173867'), '옛 파서 Bookno 같은 sl_orig(세관 출처 아님 · 앞부분 관계 아님)는 종전처럼 지운다(다른 자료 실로 안 옮김)', JSON.stringify(jk));
  //  중-3 — 미르 «4907 실번호» 괄호 출처 = 큰 실(세관 값)의 출처
  ok(/실번호 MLPH046339\(Excel_20261024122429\.xls\)/.test(aT) && /실번호 MLPH046339\(Excel_20261024122429\.xls\)/.test(aC), '미르 «4907 실번호» — 괄호 출처는 큰 실(세관 MLPH046339)의 파일(두 앱 같음)', JSON.stringify({ T: aT.slice(0, 120), C: aC.slice(0, 120) }));
  //  마감텔리 — EDI 실도 알려진 실(검수원이 EDI 값으로 확인하면 상이 아님 · 셋째 값이면 상이)
  const rzv = (sl) => ({ info: { vsl: 'RZOR', voy: 'R117E' }, discharge: { records: { VPLU8414662: { ...bare, sl, sl_orig: '000064', sl_history: [{ from: '000064', to: sl, by: '시험' }] } }, ediContainers: { VPLU8414662: { cn: 'VPLU8414662', sl: '250499' } } }, loading: {} });
  ok(!T.buildSealList(rzv('250499'), 'discharge').length && T.buildSealList(rzv('999999'), 'discharge').length === 1, '마감텔리 실번호 상이 — EDI 실(250499)로 확인하면 안 싣고 · 셋째 값(999999)이면 싣는다(EDI 실을 넘김)');
  //  하-1 — 결재용 CSV 실제 행(원실번호 = 신고 실 · 실제실번호 = 실물)
  let _csv = '';
  const _B = W.Blob; W.Blob = function (parts) { _csv = parts.join(''); return { size: _csv.length }; };
  const _U = W.URL.createObjectURL; W.URL.createObjectURL = () => 'blob:x'; W.URL.revokeObjectURL = () => {};
  try { T.exportSectionToCSV(VK, 'discharge', [row(s2, T7)], {}, {}, {}, vy.info); } catch (e) { errs.push('CSV ' + e.message); }
  W.Blob = _B; W.URL.createObjectURL = _U;
  ok(/MMAU1264907,MLPH046339,MLPH0463390,O/.test(_csv), `결재용 CSV — «${T7},MLPH046339,MLPH0463390,O»(원실번호 신고 · 실제 실물 · 실오류 O · 감사 하-1)`, _csv.split('\n').slice(0, 2).join(' / '));

  console.log('⑨ 배선 — 판정은 한 벌 · 입구마다 같은 줄');
  const vp = src('src/pages/VoyagePage.jsx');
  ok(/Object\.assign\(merged, mergeUploadSeal\(prev, r, file\.name\)\)/.test(vp) && !/a\.length > b\.length && a\.startsWith\(b\)\) merged\.sl = a/.test(vp), '올리기 병합 — utils.mergeUploadSeal 한 벌(«긴 쪽 채택» 없음)');
  ok(/'sl_alt',/.test(vp) && (vp.match(/slEdi = String\(/g) || []).length === 2, '항차 화면 병합 — sl_alt 통과 · EDI 실(slEdi)을 두 병합에서 남긴다');
  for (const f of ['src/components/ContainerList.jsx', 'src/components/ContainerDetailModal.jsx', 'src/components/BigResultCard.jsx', 'src/components/GuidedWorkPanel.jsx']) ok(/<SealKnownLine /.test(src(f)), `${f.split('/').pop()} — 실번호 아래 SealKnownLine`);
  const cl = src('src/components/ContainerList.jsx');
  ok(/if \(isSealError\(c\)\) k\.sealerr\+\+/.test(cl) && /const slErr = isSealError\(c\)/.test(cl), '리스트 칩·필터 = 카드 배지(isSealError 한 벌)');
  for (const f of ['src/components/ReportTab.jsx', 'src/components/CSVExport.jsx', 'src/loloReport.js', 'src/tallyReport.js', 'src/mir.js']) ok(/sealCheckOf/.test(src(f)) && !/sl_orig\s*!==?\s*c\.sl|c\.sl\s*!==?\s*slOrig/.test(src(f)), `${f.split('/').pop()} — 실오류 판정 한 벌(sealCheckOf)`);
  const help = JSON.stringify(T.HELP_DATA);
  ok(/실번호가 자료마다 다를 때 — 다른 자료 실 · 하나만 맞으면 맞음 \(4\.49~\)/.test(help) && /ML Seal 칸이 주실/.test(help) && /끝자리가 빠진 값/.test(help), '매뉴얼 — 4.49 절(다른 자료 실 · ML Seal · 끝자리 빠짐)');
  ok(/^TallyOne 4\.(49|5[0-9])/.test(T.APP_VERSION) && /앨범에서 고른 사진도 카톡 보고에|수석 리퍼 온도 리스트를|리퍼 온도 사진을 읽을 때 줄이 밀리던 것을|선적 칸이 서로 어긋나도|미르로 호기 검수원을 등록하면|오류가 나도 말없이|느린 망에서도 화면이|미르에게 양하 정확도를 물으면|양하에서 아래 단 컨이 먼저 나오면|선박명에 오타가 있어도 콜사인이 같으면|실번호|본선 잔류 지시 컨이 선적 EDI 에 다른 자리로 실려 오면|터미널이 한 묶음으로 세는 빈 FR 묶음|터미널이 보낸 빈 FR 묶음 목록 서류|오픈탑 컨은 20OT와 40OT 한 가지로 보이고|작업자 선택 화면에서 같은 시작이면 먼저 끝나는 배가 위로|X-RAY 탭 맨 위에 내 몫과 파트너 몫 두 단계 카드|선적 EDI 를 기다리는 배가 그 밖의 배로/.test(T.APP_NOTE), `버전 ${T.APP_VERSION} · APP_NOTE 실번호`, T.APP_NOTE);

  console.log('⑫ 4.49-02 앞자리 0 · RF CONTAINER LIST — 신고(세관) 값의 앞 0 이 빠졌으면 실오류 · RF 리스트 실은 실 자료로 안 친다(검수사 2026-10-25 «검수리스트 위주» · «실번호는 본리스트»)');
  {
    //  보관 항차 실기록(RTDB archive GET) 그대로
    const zA = { cn: 'SEGU9581651', fe: 'F', sl: '21816', sl_orig: '21816', sl_src: 'Excel_20260916023527.xls', _source: 'Excel_20260916023527.xls', _customs: true,
      sl_conflict: [{ sl: '021816', src: '2741E RF CONTAINER LIST.xlsx' }, { sl: '21816', src: 'Excel_20260916023527.xls' }] };   // OBWH 2741E — 세관 21816 · RF 리스트 021816
    const zB = { cn: 'CAAU4289478', fe: 'F', sl: '0035634', sl_orig: '0035634', _source: '2719E RF CONTAINER LIST.xlsx', _customs: true,
      sl_conflict: [{ sl: '035634', src: '2719E RF CONTAINER LIST.xlsx' }, { sl: '0035634', src: '2719E.txt 적하목록(세관)' }] };   // OBWH 2719E — RF 리스트 엑셀 숫자 칸 035634
    const zC = { cn: 'CAAU4288105', fe: 'F', sl: '0049755', sl_orig: '0049755', _source: '2709E RF CONTAINER LIST.xlsx', _customs: true,
      sl_conflict: [{ sl: '0049755', src: '2709E RF CONTAINER LIST.xlsx' }, { sl: '049755', src: '2709E RF CONTAINER LIST.xlsx' }] };   // OBWH 2709E — RF 리스트뿐(같은 파일 두 값)
    const zD = { cn: 'WDFU3023651', fe: 'F', sl: '0255053', sl_orig: '0255053', sl_src: 'Excel_20260907175812.xls', _source: 'Excel_20260907175812.xls', _customs: true,
      sl_conflict: [{ sl: '255053', src: 'STSE 2669E WDG CDL.xlsx' }, { sl: '0255053', src: 'Excel_20260907175812.xls' }] };   // STSE 2669E — 세관(CDL)끼리
    const kA = T.sealCheckOf(zA), kB = T.sealCheckOf(zB), kC = T.sealCheckOf(zC), kD = T.sealCheckOf(zD);
    ok(!kA.error && !kA.zero && kA.big === '21816' && !kA.known.some((x) => x.v === '021816') && kA.rfDropped === 1 && T.sealConflictOf(zA).length === 1,
      'OBWH 2741E SEGU9581651 — RF 리스트 021816 은 실 자료로 안 친다 → 실오류 아님 · 큰 실 세관 21816 · 불일치 배지 없음', JSON.stringify(kA));
    ok(!kB.error && kB.big === '0035634' && kB.known.length === 1 && T.sealConflictOf(zB).length === 1 && T.inspectionSealOf(zB) === '0035634',
      'OBWH 2719E CAAU4289478 — RF 리스트 035634 를 뺀다 → 다른 자료 실·불일치 배지 없음 · 큰 실 0035634(세관)', JSON.stringify(kB));
    ok(!kC.error && T.sealConflictOf(zC).length === 0 && kC.known.length === 2, 'OBWH 2709E CAAU4288105 — RF 리스트뿐이면 그대로 두되 불일치 배지는 없음(본 리스트 실 대기)', JSON.stringify(kC));
    ok(!kD.zero && !kD.error, 'STSE 2669E WDFU3023651 — 세관(CDL)끼리 앞 0 차이 → 실오류 아님', JSON.stringify(kD));
    const zDs = { ...zD, sl: '255053', sl_orig: '255053', sl_src: 'STSE 2669E WDG CDL.xlsx', _source: 'STSE 2669E WDG CDL.xlsx' };   // 감사(하-1) — 짧은 쪽이 큰 실이어도 세관끼리면 안 센다
    ok(!T.sealCheckOf(zDs).zero && !T.sealCheckOf(zDs).error, '세관(CDL 255053)이 큰 실이고 다른 세관(0255053)이 길어도 앞자리 0 실오류 아님', JSON.stringify(T.sealCheckOf(zDs)));
    //  앞자리 0 규칙 — 본 리스트(선사 CLL)가 0 을 더 갖고 세관이 빠졌을 때(위 SEGU9581651 의 출처만 선사 본 리스트로 바꾼 사본)
    const zL = { ...zA, sl_conflict: [{ sl: '021816', src: 'OBWH 2741E CLL.xlsx' }, { sl: '21816', src: 'Excel_20260916023527.xls' }] };
    const kL = T.sealCheckOf(zL);
    ok(kL.zero && kL.error && kL.from === '21816' && kL.actual === '021816' && kL.big === '21816' && T.isSealError(zL),
      '사본 — 세관 21816 ↔ 선사 본 리스트 021816 → 실오류(신고 21816 → 021816) · 큰 실은 세관 값', JSON.stringify(kL));
    const edOk = { ...zL, sl_history: [{ from: '21816', to: '21816', by: '시험' }] };
    const edLong = { ...zL, sl: '021816', sl_history: [{ from: '21816', to: '021816', by: '시험' }] };
    ok(!T.sealCheckOf(edOk).error && T.sealCheckOf(edLong).error && T.sealCheckOf(edLong).actual === '021816', '검수원이 실물을 신고 값 21816 으로 확인하면 실오류 아님 · 021816 으로 고치면 실오류(신고 정정)');
    const z0 = { cn: 'TEST0000001', fe: 'F', sl: '000000', sl_orig: '000000', sl_src: 'Excel_20260916023527.xls', sl_conflict: [{ sl: '0000000', src: 'X CLL.xlsx' }, { sl: '000000', src: 'Excel_20260916023527.xls' }] };
    ok(!T.sealCheckOf(z0).zero, '감사(하-2) — 0 뿐인 값(000000 ↔ 0000000)은 앞자리 0 실오류로 안 센다');
    const trA = T.sealCheckOf({ ...zA, sl_conflict: [{ sl: 'MLPH0463390', src: 'x.xlsx' }, { sl: 'MLPH046339', src: 'Excel_20261024122429.xls' }], sl: 'MLPH046339', sl_orig: 'MLPH046339', sl_src: 'Excel_20261024122429.xls' });
    ok(trA.trunc && !trA.zero && trA.error, '끝자리 빠짐(trunc)은 그대로 — 앞자리 0 판정과 겹치지 않는다', JSON.stringify(trA));
    //  올리기 병합 — RF 리스트는 실을 바꾸지 않고 «다른 자료 실»도 안 남긴다
    const m1 = T.mergeUploadSeal({ cn: 'CAAU4289478', sl: '0035634', sl_src: '2719E.txt 적하목록(세관)' }, { cn: 'CAAU4289478', sl: '035634' }, '2719E RF CONTAINER LIST.xlsx');
    const m2 = T.mergeUploadSeal({ cn: 'CAAU4289478', sl: '035634', sl_src: '2719E RF CONTAINER LIST.xlsx' }, { cn: 'CAAU4289478', sl: '0035634' }, '2719E.txt 적하목록(세관)');
    ok(m1.sl === '0035634' && !m1.sl_conflict && m1.sl_src === '2719E.txt 적하목록(세관)' && m2.sl === '0035634' && m2.sl_orig === '0035634' && T.sealConflictOf({ sl_conflict: m2.sl_conflict || [] }).length === 0 && m2.sl_src === '2719E.txt 적하목록(세관)',
      '올리기 병합 — RF 리스트 뒤에 와도·앞에 와도 실은 본 리스트(세관) 값 · 출처는 세관 · 화면에 보이는 불일치 안 남김', JSON.stringify({ m1, m2 }));
    //  독립 감사(상-1·상-2·중-2) — 실 firebase.js(메모리 DB)로 올리기 순서를 돌린다. RF 리스트가 끼어도 RF 없는 대조군과 같은 답이어야 한다.
    const RF = '2741E RF CONTAINER LIST.xlsx', CLL = 'OBWH 2741E CLL.xlsx', CU2 = 'Excel_20260916023527.xls', RK = 'SEGU9581651';
    const seq = async (steps, start) => { W.__memdb = { voyages: { [VK]: { discharge: { records: {} } } } }; let rr = start ? clone(start) : {}; if (start) W.__memdb.voyages[VK].discharge.records = clone(start); for (const [f, v] of steps) rr = await upload([{ cn: RK, fe: 'F', sl: v, sl_orig: v }], f, rr); return { ...rr[RK], cn: RK }; };
    const ctlA = await seq([[CU2, '21816'], [CLL, '021816']]);
    const sA = await seq([[CU2, '21816'], [RF, '021816'], [CLL, '021816']]);
    const kAc = T.sealCheckOf(ctlA), kAs = T.sealCheckOf(sA);
    ok(kAc.zero && kAc.error && kAs.zero && kAs.error && kAs.big === '21816' && T.inspectionSealOf(sA) === '21816' && kAs.customs && kAs.customs.v === '21816',
      '세관 21816 → RF 021816 → 선사 021816 — RF 를 끼워도 앞자리 0 실오류 · 큰 실 세관 21816(대조군과 같음)', JSON.stringify({ sA, kAs }));
    const sB = await seq([[CU2, 'MLPH046339'], [RF, 'MLPH0463'], [CLL, 'MLPH0463390']]);
    const kBs = T.sealCheckOf(sB);
    ok(kBs.trunc && kBs.error && kBs.big === 'MLPH046339' && T.inspectionSealOf(sB) === 'MLPH046339', '세관 MLPH046339 → RF MLPH0463 → 선사 MLPH0463390 — 큰 실 세관 값 · 끝자리 빠짐 실오류 그대로', JSON.stringify({ sB, kBs }));
    const sC = await seq([[CU2, '0035634'], [RF, '035634']]);
    ok(sC.sl === '0035634' && (sC.sl_orig == null || sC.sl_orig === '0035634') && sC.sl_src === CU2 && T.sealCheckOf(sC).customs && !T.sealCheckOf(sC).error,
      '세관 0035634 → RF 035634 — 저장 sl·sl_orig·sl_src 그대로(세관) · 고친 기록 없는 sl≠sl_orig 옛 꼴을 만들지 않는다', JSON.stringify(sC));
    const old = { [RK]: { cn: RK, fe: 'F', sl: 'MLPH0463390', sl_orig: 'MLPH046339', sl_src: CUS, _source: CUS } };
    const sD = await seq([[RF, 'MLPH0463']], old);
    ok(T.inspectionSealOf(sD) === 'MLPH046339' && T.sealCheckOf(sD).big === 'MLPH046339' && sD.sl_orig === 'MLPH046339', '옛 꼴(sl 선사 · sl_orig 세관) 위에 RF 를 올려도 큰 실은 세관 MLPH046339 · sl_orig 그대로', JSON.stringify(sD));
    const ctlE = await seq([[CLL, '021816'], [CU2, '21816']]);
    const sE = await seq([[CLL, '021816'], [RF, '021816'], [CU2, '21816']]);
    const kEs = T.sealCheckOf(sE);
    ok(T.sealCheckOf(ctlE).zero && kEs.zero && kEs.error && kEs.known.some((x) => x.v === '021816') && sE.sl_src === CU2,
      '선사 021816 → RF 021816(같은 값) → 세관 21816 — 본 리스트 실이 RF 로 오인되지 않는다 · 앞자리 0 실오류', JSON.stringify({ sE, kEs }));
    const sF = await seq([[CLL, 'PH0570668'], [RF, 'PH0570668'], [CU2, 'PH0570999']]);
    ok(T.sealCheckOf(sF).known.length === 2 && T.sealConflictOf(sF).length === 2, '선사 PH0570668 → RF(같은 값) → 세관 PH0570999 — 다른 자료 실·불일치 배지가 남는다', JSON.stringify(sF));
    const sG = await seq([[RF, '049722'], [CLL, '0049722']]);
    ok(sG.sl === '0049722' && sG.sl_src === CLL && T.inspectionSealOf(sG) === '0049722' && T.sealConflictOf(sG).length < 2 && T.sealCheckOf(sG).known.length === 1, 'RF 049722 먼저 → 선사 0049722 — 실은 본 리스트 값 · 출처 선사 · RF 값은 화면에 안 보임', JSON.stringify(sG));
    const sH = await seq([[RF, '049755']]);
    ok(sH.sl === '049755' && T.sealCheckOf(sH).big === '049755', 'RF 리스트에만 실이 있으면 그 실을 그대로 쓴다', JSON.stringify(sH));
    const edI = { [RK]: { cn: RK, fe: 'F', sl: '9999999', sl_orig: '0035634', sl_src: CLL, _source: CLL, sl_history: [{ from: '0035634', to: '9999999', by: '시험' }] } };
    const kI0 = T.sealCheckOf({ ...edI[RK] });
    const sI = await seq([[RF, '035634']], edI);
    const kI = T.sealCheckOf(sI);
    ok(kI0.error && kI.error && sI.sl === '9999999' && !T.sealCheckOf(sI).known.some((x) => x.v === '9999999'), '재감사(상) — 검수원이 고친 컨(서류 0035634 → 실물 9999999)에 RF 리스트를 올려도 실물이 서류 실로 안 섞이고 실오류 그대로', JSON.stringify({ sI, kI }));
    const rD = { cn: RK, fe: 'F', sl: '049722', sl_orig: '049722', sl_src: RF, _source: RF, slEdi: '0049722' };
    ok(T.sealCheckOf(rD).rfDropped === 1 && T.inspectionSealOf(rD) === '0049722', 'rfDropped 갈래 — sl 에 RF 실이 앉았고 EDI 가 있으면 큰 실은 EDI 값', JSON.stringify(T.sealCheckOf(rD)));
    const kAlt = T.sealCheckOf({ cn: RK, fe: 'F', sl: '21816', sl_orig: '21816', sl_src: CU2, sl_alt: '021816' });
    ok(!kAlt.zero && !kAlt.error, '감사(하-4) — 보조실(Shipper Seal) 021816 은 앞자리 0 짝으로 안 본다(다른 실물)', JSON.stringify(kAlt));
    W.__renderLine({ c: zL, showError: true }); await wait(80);
    const tz = doc.getElementById('root').textContent;
    ok(/⚠ 신고 실 21816 은 021816 의 앞자리 0 이 빠진 값입니다/.test(tz) && /🚨 실오류 — 신고 21816 → 실물 021816/.test(tz) && !/하나면 맞음/.test(tz), '화면 — «⚠ 신고 실 21816 은 021816 의 앞자리 0 이 빠진 값입니다 — 실오류(신고 정정 대상)로 셉니다.»', tz);
    W.__renderLine({ c: zB, showError: true }); await wait(80);
    ok(doc.getElementById('root').textContent === '', '화면 — OBWH 2719E CAAU4289478 은 다른 자료 실 줄을 안 그린다(RF 리스트 실 뺌)', doc.getElementById('root').textContent);
    const mirSrc = fs.readFileSync(path.join(root, 'src/mir.js'), 'utf8');
    ok(/_k\.zero && _k\.error && _k\.decl\) parts\.push\(`⚠ 신고 실 \$\{_k\.decl\.v\} 은 \$\{_k\.zeroLong\} 의 앞자리 0 이 빠진 값/.test(mirSrc) && /\(_k\.trunc \|\| _k\.zero\) && _k\.error \? '' : ' — 실물이 하나면 맞음'/.test(mirSrc), '배선 — 미르 «4907 실번호» 답도 앞자리 0 빠짐 줄 · «하나면 맞음» 빼기(같은 판정)');
    const _rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
    ok(/sealConflictOf\(c\)\.map/.test(_rd('src/components/ContainerList.jsx')) && /const _scf = sealConflictOf\(c\)/.test(_rd('src/components/ContainerDetailModal.jsx')) && /const hist = sealConflictOf\(c\)/.test(_rd('src/nlSearch.js'))
      && /sealConflictOf\(c\)\.length > 1/.test(mirSrc) && /sealConflictOf\(x\)\.map/.test(mirSrc) && !/c\.sl_conflict\.map\(h =>/.test(_rd('src/components/ContainerList.jsx')),
      '배선 — 실번호 불일치 배지·컨 상세 카드·미르 실번호 점검·홈 실오류 목록이 sealConflictOf 한 벌(RF CONTAINER LIST 뺌)');
    ok(/const _declErr = !!\(_kc && \(_kc\.trunc \|\| _kc\.zero\) && _kc\.error\)/.test(_rd('src/components/ContainerDetailModal.jsx')) && /data-seal-decl-err/.test(_rd('src/components/ContainerDetailModal.jsx')),
      '배선 — 컨 상세 노란 상자도 끝자리·앞자리 0 빠짐 실오류면 «하나면 맞음» 대신 실오류 안내(감사 하-2)');
    ok(/sealConflictOf\(x\)\.map\(\(h\) => String\(h\.sl/.test(mirSrc) && !/x\.sl_conflict\.map\(\(h\) => String/.test(mirSrc) && /'RF 리스트'/.test(mirSrc) && /return 'RF 리스트'/.test(_rd('src/components/SealKnownLine.jsx')),
      '배선 — 홈 실오류 «불일치» 줄도 sealConflictOf · RF 에서만 온 실은 «(RF 리스트)» 표기(감사 하-1·하-3)');
    ok(/const _rfKeep = isRfListSrc\(_newSrc\) && String\(ov\.sl \|\| ''\)\.trim\(\) !== ''/.test(_rd('src/firebase.js')), '배선 — 저장(fbSaveListRecords)도 RF 파일로 sl_src 를 안 바꾼다(감사 상-2)');
    const _ar = _rd('src/autoRegApi.js');
    ok(/import \{ isRfListSrc \} from '\.\/utils\.js'/.test(_ar) && /const _isRfList = isRfListSrc\(name\)/.test(_ar) && /if \(_isRfList\) _slFromRf\.add\(cn\)/.test(_ar)
      && /if \(!_isRfList && _slFromRf\.has\(cn\) && r\.sl != null[^\n]*\n\s*prev\.sl = r\.sl; prev\.sl_orig = [^\n]*prev\.sl_src = name;/.test(_ar) && !/_rfLastFiles/.test(_ar),
      '배선 — 수집기 자동 등록(autoRegApi)도 RF CONTAINER LIST 실은 본 리스트 실에 진다(실번호만 · 무게·규격은 종전대로 · 같은 isRfListSrc)');
  }
  ok(errs.length === 0, '화면 오류 0', errs.join(' | '));
  console.log(`\n4.49 실번호 판정 한 벌 연막 — ${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
