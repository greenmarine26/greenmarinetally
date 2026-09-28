// 3.66-04 리스트 번호 오타 짝 연막 — 바로잡힌 번호와 옛 오타 번호가 같이 남지 않는지 실리스트로 잰다.
//
//  왜 이 검사가 있는가 — 검수사 2026-09-28 18:24 (실번호 중복 캡처) «이건 머죠?» · 18:47 «오타 구별건까지 정리하셨으면 합니다».
//  RZOR R106W 선적 CLL 2차는 WKIU5243987(I·K 뒤바뀜), 최종은 WIKU5243987 로 적었다. 선적 리스트는 판을 합치므로(3.61-03)
//  두 번호가 다 남아 «실번호 중복 3987»·잔여 1대가 됐다. 터미널은 WIKU 를 10-08-90 에 실었다.
//  같은 판정을 쓰는 입구 둘 — 수집기 자동등록(autoRegApi.buildAutoPayload)·앱 리스트 올리기(VoyagePage) — 중 앞의 것을 실소스로 돌린다.
const path = require('path');
const fs = require('fs');

const BUNDLE = process.argv[2];
if (!BUNDLE) { console.error('사용법: node tools/smoke_listtypo.cjs <번들.cjs>'); process.exit(1); }
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(BUNDLE));
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'listtypo_real.json'), 'utf8'));

let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) fail++; };
const J = (x) => JSON.stringify(x);

(async () => {
  console.log('① 판정 한 벌(listTypoTwins) — 조건이 하나라도 안 맞으면 빼지 않는다');
  const base = { WIKU5243987: { cn: 'WIKU5243987', sl: 'RZHT15677', wt: 23055 }, WKIU5243987: { cn: 'WKIU5243987', sl: 'RZHT15677', wt: 23055 } };
  ok(J(U.listTypoTwins(base)) === J([{ typo: 'WKIU5243987', real: 'WIKU5243987', seal: 'RZHT15677' }]), `실측 짝 — WKIU5243987 → WIKU5243987 (${J(U.listTypoTwins(base))})`);
  ok(U.isoCheckDigit('WIKU5243987') === true && U.isoCheckDigit('WKIU5243987') === false, '검산 — WIKU 맞음 · WKIU 틀림');
  ok(U.listTypoTwins({ ...base, WKIU5243987: { ...base.WKIU5243987, wt: 23000 } }).length === 0, '무게가 둘 다 있고 다르면 짝이 아니다');
  ok(U.listTypoTwins({ ...base, XXXU0000000: { cn: 'XXXU0000000', sl: 'RZHT15677' } }).length === 0, '실번호를 셋이 나누면 손대지 않는다');
  ok(U.listTypoTwins({ ...base, WKIU5243987: { ...base.WKIU5243987, sl: '' } }).length === 0, '실번호가 비면 짝을 모른다');
  ok(U.listTypoTwins({ A: { cn: 'WIKU5243987', sl: '0000' }, B: { cn: 'WKIU5243987', sl: '0000' } }).length === 0, '«0000»(실 부족 표기)은 짝의 근거가 아니다');
  ok(U.listTypoTwins({ WIKU5243987: base.WIKU5243987, CHIU9026506: { cn: 'CHIU9026506', sl: 'RZHT15677', wt: 23055 } }).length === 0, '둘 다 검산이 맞으면(다른 컨) 빼지 않는다');
  ok(U.listTypoTwins({ WIKU5243987: base.WIKU5243987, ABCU1234567: { cn: 'ABCU1234567', sl: 'RZHT15677', wt: 23055 } }).length === 0, '번호가 두 글자 넘게 다르면 짝이 아니다');
  ok(U.listTypoTwins(base, new Set(['WKIU5243987'])).length === 0, '완료 기록 등 keep 에 든 오타는 빼지 않는다');
  ok(U.listTypoTwins({ A: { cn: 'MSKU1234565', eseal: 'W', wt: 3800 }, B: { cn: 'MSKU1234566', eseal: 'W', wt: 3800 } }).length === 0, '숫자 없는 실 표기(OBWH 엠티 eseal «W»)는 짝의 근거가 아니다');
  ok(U.listTypoTwins(FX.mamp_621n_dumt).length === 0, `MAMP 621N 가상번호 묶음(DUMT 20대가 실 하나를 나눔)은 손대지 않는다 (${Object.keys(FX.mamp_621n_dumt).length}대)`);

  console.log('② 수집기 자동등록 실소스(buildAutoPayload) — RZOR R106W 선적 실리스트 두 판');
  const XLSX = await U.loadSheetJS();
  const fileOf = (name, aoa, mtime) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xls' });
    return { name, buffer: buf, mtime };
  };
  const R = FX.rzor_r106w;
  const f2 = fileOf(R.cll2_name, R.cll2, 1790564700668), fF = fileOf(R.final_name, R.final, 1790575462105);
  for (const [lab, files] of [['2차 → 최종', [f2, fF]], ['최종 → 2차', [fF, f2]]]) {
    const p = await U.buildAutoPayload(files, { vslCode: 'RZOR', voy: 'R106W', mode: 'loading' });
    const rk = Object.keys(p.records || {}), ek = Object.keys(p.ediContainers || {});
    ok(p.ok && rk.includes('WIKU5243987') && !rk.includes('WKIU5243987') && ek.includes('WIKU5243987') && !ek.includes('WKIU5243987'),
      `${lab} — 리스트·가상 EDI 에 WIKU5243987 만 남는다 (리스트 ${rk.length} · EDI ${ek.length})`);
    ok(rk.length === 190 && ek.length === 190, `${lab} — 선적 190대(최종 리스트 190 = 터미널 계획 190, 합치면 191 이던 것)`);
    ok(rk.includes('CHIU9026506'), `${lab} — 실린 리퍼 CHIU9026506 은 그대로(오타 판정과 무관)`);
    ok((p.perFile || []).some((x) => x.kind === 'dropped' && /번호 오타 제외\(WKIU5243987→WIKU5243987\)/.test(x.name) && x.count === 1),
      `${lab} — 뺀 것을 perFile 에 밝힌다(조용히 빼지 않는다)`);
    ok(p.records.WIKU5243987 && p.records.WIKU5243987.sl === 'RZHT15677', `${lab} — 남은 번호의 실번호는 RZHT15677`);
  }
  //  실 EDI 가 오타 번호를 담고 있으면 리스트 행을 지우지 않는다(EDI 와 짝인 행 — keep)
  ok(U.listTypoTwins(base, new Set(['WKIU5243987', 'WIKU5243987'])).length === 0, '실 EDI 가 담은 번호는 keep — 빼지 않는다');
  //  오타가 없는 판 하나만 오면 아무것도 안 뺀다(종전과 같은 결과)
  const pF = await U.buildAutoPayload([fF], { vslCode: 'RZOR', voy: 'R106W', mode: 'loading' });
  ok(Object.keys(pF.records).length === 190 && !(pF.perFile || []).some((x) => /번호 오타/.test(x.name)), '최종 한 판만 오면 190대 · 오타 제외 없음(종전 그대로)');

  console.log('③ 배선 — 앱 리스트 올리기도 같은 한 벌을 부른다');
  const vp = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'VoyagePage.jsx'), 'utf8');
  ok(/listTypoTwins\(cnMap, _typoKeep\)/.test(vp) && /new Set\(Object\.keys\(sec\.completed \|\| \{\}\)\)/.test(vp) && /_virtualFromList\)\) _typoKeep\.add\(k\)/.test(vp) && /delete cnMap\[t\.typo\]/.test(vp),
    'VoyagePage 리스트 올리기 — 완료 기록·실 EDI 번호는 keep, 그 뒤 cnMap 에서 뺀다');
  ok(vp.indexOf('listTypoTwins(cnMap, _typoKeep)') > vp.indexOf('if (_allCancel) {') && vp.indexOf('listTypoTwins(cnMap, _typoKeep)') < vp.indexOf('// M3.5.4-fix2: 충돌 검출'),
    'VoyagePage — 저장 없이 끝나는 두 길(교체 0·캔슬만) 뒤에서 뺀다');
  const ar = fs.readFileSync(path.join(__dirname, '..', 'src', 'autoRegApi.js'), 'utf8');
  ok(ar.indexOf('listTypoTwins(records, best ? new Set(Object.keys(ediContainers)) : null)') > ar.indexOf('isOppositeDirRecord(records[cn], mode)') && ar.indexOf('listTypoTwins(records, best ? new Set(Object.keys(ediContainers)) : null)') < ar.indexOf("mode === 'loading' && !best && VIRTUAL_LOAD_SHIPS.has(vslCode)"),
    'autoRegApi — 반대 방향 거르기 뒤, 가상 선적 EDI 승격 앞에서 거르고 실 EDI 번호는 keep(가상 EDI 에도 오타가 안 올라간다)');

  console.log(`\n리스트 번호 오타 짝 ${fail ? '실패 ' + fail : '통과'}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('✗ 검사 자체가 죽었습니다 —', e); process.exit(1); });
