// 5.29-02 연막검사 — 선사 RESTOW LIST 에 있어도 양하 리스트(세관 목록)에 양하로 등록된 컨은 양하분이다(재선적은 선적 확정 뒤).
//   검수사 2026-11-28 12:48 «양하리스트에 양하로 등록되어 있다면 양하분입니다. 추후 재선적 하더라도» · 12:51 «선사 메일 불일치 입니다».
//   실자료 MAMP 646N(tools/fixtures/reload52902_mamp646n.json) — 고치기 전 양하 185 · 시프팅 3 · 배정표 1대와 불일치.
//   실행 — node tools/smoke_reload52902.cjs <repoRoot> <번들>. 실패하면 빌드를 세운다.
const fs = require('fs');
const root = process.argv[2] || process.cwd();
const bundle = process.argv[3];
(async () => {
  let bad = 0, n = 0;
  const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + String(d).slice(0, 400))); if (!c) bad++; };
  if (!bundle) { console.log('번들 경로가 없다'); process.exit(1); }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'http://localhost/' });
  dom.window.global = dom.window;
  const errs = [];
  console.warn = () => {};
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const T = dom.window.__T;
  if (!T) { console.log('  FAIL 번들이 시험 함수를 못 내놓았다', errs.join(' | ')); process.exit(1); }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const V = (key, f) => { const v = clone(T.FX.voyage); v.key = key; if (f) f(v); return v; };
  const keysOf = (m) => Object.keys(m || {}).filter((k) => !k.startsWith('_')).sort();
  const R1 = 'MRKU6398066', R2 = 'TGBU5399305', S1 = 'MRSU1362654';

  console.log('① 실자료 MAMP 646N — 양하 187 · 시프팅 1 · 배정표 1대와 일치');
  const v = V('K1');
  const m = T.computeShiftingMapCached('K1', v);
  ok(keysOf(m).join(',') === S1, '시프팅 지도 = MRSU1362654 한 대', keysOf(m).join(','));
  const rd = ((m._meta || {}).reloadDis || []).map((x) => x.cn).sort();
  ok(rd.join(',') === [R1, R2].sort().join(','), '선사 메일 불일치(양하분) = MRKU6398066 · TGBU5399305', rd.join(','));
  ok(T.ptkDischargeUnitsOf(v).set.size === 187, '평택 양하분 187(세관·EDI·터미널 계획과 같다)', T.ptkDischargeUnitsOf(v).set.size);
  const ev = T.shiftEvidenceOf('K1', v, m);
  ok(ev.status === '확정' && /3대 중 시프팅 1대/.test(ev.line) && /선사 메일 불일치 2대/.test(ev.line), '근거 줄 — 확정 · «3대 중 시프팅 1대» · «선사 메일 불일치 2대»', ev.status + ' | ' + ev.line);
  const tc = T.shiftingTruthCheck(v, keysOf(m).length);
  ok(tc && tc.ok === true && tc.truth === 1, '배정표 이적 2모브=1대 와 맞다', JSON.stringify(tc));

  console.log('② 변이 — 리스트가 말하지 않으면 서류 그대로(종전과 같다)');
  const v2 = V('K2', (x) => { delete x.discharge.records[R1]; delete x.discharge.records[R2]; });
  ok(keysOf(T.computeShiftingMapCached('K2', v2)).length === 3, '양하 리스트에 없으면 서류 3대 그대로');
  const v3 = V('K3', (x) => { x.discharge.records[R1].tsport = 'CNTXG'; });
  ok(keysOf(T.computeShiftingMapCached('K3', v3)).join(',') === [R1, S1].sort().join(','), '리스트가 환적항을 적으면 시프팅으로 둔다');
  const v4 = V('K4', (x) => { x.discharge.records[R2].pod_pick = true; x.discharge.records[R2].pod = 'CNTXG'; });
  ok(keysOf(T.computeShiftingMapCached('K4', v4)).join(',') === [R2, S1].sort().join(','), '평택 아닌 POD 를 고른 행은 시프팅으로 둔다');
  const v5 = V('K5', (x) => { x.discharge.records[R1].pol = 'KRPTK'; x.discharge.records[R1].pod = 'CNTXG'; });
  ok(keysOf(T.computeShiftingMapCached('K5', v5)).includes(R1), '반대 방향(선적분) 행은 양하분으로 안 본다');
  ok(keysOf(T.restowMapFromDoc(clone(T.FX.voyage.restowList))).length === 3, '둘째 인자 없이 부르면 종전처럼 서류 3대(콘앱이 리스트를 못 받은 때)');
  const m6 = T.restowMapFromDoc(clone(T.FX.voyage.restowList), clone(T.FX.voyage.discharge.records));
  ok(keysOf(m6).join(',') === S1 && m6._meta.docTotal === 3, '서류 총수(3)는 그대로 남는다');

  const v8 = V('K8', (x) => { x.keepOnboard = { [R1]: { cn: R1, pod: 'CNTXG', src: 'mail', at: 1 } }; });
  ok(keysOf(T.computeShiftingMapCached('K8', v8)).includes(R1), '선사 본선 잔류 지시 컨은 리스트에 있어도 서류 그대로(4.48·4.53)');
  const v8b = V('K8b', (x) => { x.keepOnboard = { [R1]: { cn: R1, pod: 'CNTXG', src: 'mail', at: 1, cleared: true } }; });
  ok(!keysOf(T.computeShiftingMapCached('K8b', v8b)).includes(R1), '풀린 본선 잔류 지시는 막지 않는다(양하분)');
  ok(!keysOf(T.restowMapFromDoc(clone(T.FX.voyage.restowList), clone(T.FX.voyage.discharge.records), { [R1]: { cn: R1, pod: 'CNTXG', cleared: true } })).includes(R1), '콘앱처럼 날것 기록을 넘겨도 같은 거름');
  const v9 = V('K9', (x) => { x.discharge.records[R2] = { cn: R2, sl: 'X123', iso: '45G1' }; });
  ok(keysOf(T.computeShiftingMapCached('K9', v9)).includes(R2), '앱이 만든 행(실번호·규격 수정만)은 리스트 등록이 아니다');
  console.log('③ 캐시 — 리스트가 바뀌면 다시 계산한다');
  const v7 = V('K7');
  T.computeShiftingMapCached('K7', v7);
  delete v7.discharge.records[R1];
  ok(keysOf(T.computeShiftingMapCached('K7', v7)).includes(R1), '같은 키에서 리스트 행이 빠지면 지도가 다시 바뀐다');

  console.log('④ 소스 — 콘앱 두 자리 · 검수앱 화면');
  const cone = fs.readFileSync(root + '/public/cone.html', 'utf8');
  ok((cone.match(/restowMapFromDoc\(state\.restowList, state\.restowDisRecs, state\.keepOnboard\)/g) || []).length === 2, '콘앱 ctShiftMap · 미르 확정 지도가 양하 리스트를 넘긴다');
  ok(/state\.restowDisRecs=_jr/.test(cone), '콘앱이 서류가 있을 때 양하 리스트를 받는다');
  const vp = fs.readFileSync(root + '/src/pages/VoyagePage.jsx', 'utf8');
  ok(/data-shift-reload=\{rd\.length\}/.test(vp) && /선사 메일 불일치/.test(vp), '항차 화면 «선사 메일 불일치 N대» 줄');
  console.log(`  ─ ${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
