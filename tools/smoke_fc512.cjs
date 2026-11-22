// 5.12 연막검사 — 카톡 예보를 플랜 별첨3·별첨2 모양으로 접기(utils.forecastLegendOf) · 홈 «예상 N대» · 관리자 작업 기록 문지기.
//   실데이터 — OBWH 2796W 선적 예보(2026-11-18 12:22 카톡 «FULL 20GPX7 + 40HQX31 + 45HQX1 + 40RHX5 / EMPTY 20GPX111 + 20RFX1 + 40HQX95 + 45HQX15 + 40RHX22», 288대 457TEU).
//   검수사 2026-11-18 12:58 «플랜에 별첨3처럼 보여주고 옆에 별첨2처럼 화물종류별로 보여줘야합니다. 그리고 예상댓수를 선적항차에 보여줘야 합니다»
//   검수사 2026-11-18 12:42 «관리자로 들어 가서 앱 상태를 점검 하려고 작업시작을 누르고 장비를 선택했을떄 제이름과 제가 작업한걸로 기록되지 않아야 합니다»
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fc512_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = global.localStorage || { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

(async () => {
  try {
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, [
      `export { forecastLegendOf, parseCargoForecast } from "${ROOT}/src/utils.js";`,
      `export { setActiveWorkChoice, canWorkNow, canRecordWorkNow, recordGateText, isAdminNow } from "${ROOT}/src/workChoice.js";`,
    ].join('\n'));
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    const B = require(o);
    const FX = JSON.parse(rd('tools/fixtures/fc512_obwh.json'));
    const V = FX.OBWH_2795E;
    const f = V.info.forecast;

    // ① 별첨3 — 규격별 F/E
    const lg = B.forecastLegendOf(V, 'loading');
    ok('① 예상 대수 288 = 예보 풀 44 + 엠티 244', lg && lg.n === 288 && lg.n === (f.vans.full + f.vans.empty), JSON.stringify(lg && lg.n));
    const fe = lg && lg.fe;
    ok('① 별첨3 20\' F7·E112 · 40\' F36·E117 · 45\' F1·E15', fe && fe['20'].F === 7 && fe['20'].E === 112 && fe['40'].F === 36 && fe['40'].E === 117 && fe['45'].F === 1 && fe['45'].E === 15, JSON.stringify(fe));
    ok('① 엠티 리퍼 23 따로(20RF 1 + 40RH 22)', lg && lg.emptyRf === 23, String(lg && lg.emptyRf));
    ok('① TEU 457(카톡 계산과 같음)', lg && lg.teu === 457, String(lg && lg.teu));
    // ② 별첨2 — 화물 종류별(풀 리퍼만 Reefer, 엠티 리퍼는 일반 — 플랜 별첨 legendCargoCatOf 와 같은 규칙)
    const cg = Object.fromEntries((lg && lg.cargos) || []);
    ok('② 일반 20\'119 · 40\'148 · 45\'16 = 283', cg['일반'] && cg['일반']['20'] === 119 && cg['일반']['40'] === 148 && cg['일반']['45'] === 16 && cg['일반'].total === 283, JSON.stringify(cg['일반']));
    ok('② Reefer 40\'5 (풀 리퍼만)', cg.Reefer && cg.Reefer['40'] === 5 && cg.Reefer.total === 5, JSON.stringify(cg.Reefer));
    ok('② 일반이 맨 위', lg && lg.cargos[0][0] === '일반');
    ok('② 두 표 합계가 같다(별첨3 = 별첨2 = 288)', lg && lg.cargos.reduce((t, [, r]) => t + r.total, 0) === 288);
    // ③ 특수 규격 — FR·OT·TK 줄, 수화물은 표 밖
    const p2 = B.parseCargoForecast('OBWH 2797W\nFULL 20GPX2 + 40FRX3 + 20OTX1 + 20TKX4 + 40RHX2\nEMPTY 40RHX5\nLUGGAGE 20GPX1');
    const lg2 = B.forecastLegendOf({ info: { forecast: p2 } }, 'loading');
    const c2 = Object.fromEntries((lg2 && lg2.cargos) || []);
    ok('③ FR 3 · OT 1 · Tank 4 · Reefer 2 · 일반 2+5(엠티 리퍼)', c2.FR && c2.FR.total === 3 && c2.OT && c2.OT.total === 1 && c2.Tank && c2.Tank.total === 4 && c2.Reefer && c2.Reefer.total === 2 && c2['일반'] && c2['일반'].total === 7, JSON.stringify(c2));
    ok('③ 수화물 1 은 대수에 넣지 않고 따로', lg2 && lg2.n === 17 && lg2.lug === 1, JSON.stringify({ n: lg2 && lg2.n, lug: lg2 && lg2.lug }));
    // ④ EDI 가 오면 사라진다 · 다른 모드에는 안 뜬다
    ok('④ 선적 EDI 가 한 대라도 오면 null', B.forecastLegendOf({ ...V, loading: { ediContainers: { X: {} } } }, 'loading') === null);
    ok('④ 양하 쪽에는 null(선적 예보)', B.forecastLegendOf(V, 'discharge') === null);
    ok('④ 예보 없으면 null', B.forecastLegendOf({ info: {} }, 'loading') === null);

    // ⑤ 화면 — 예보 카드 두 표 · 홈 «예상 N대» 가 같은 함수를 부른다
    const vp = rd('src/pages/VoyagePage.jsx'), hp = rd('src/pages/HomePage.jsx');
    ok('⑤ 예보 카드 «별첨3 · 규격별 F/E»·«별첨2 · 화물 종류별» 두 표', /별첨3 · 규격별 F\/E/.test(vp) && /별첨2 · 화물 종류별/.test(vp) && /forecastLegendOf\(voyage, mode\)/.test(vp));
    ok('⑤ 옛 «구분·규격·대수» 아홉 줄 표가 없다', !/>구분<\/th>/.test(vp.slice(vp.indexOf('function ForecastCard'), vp.indexOf('function ForecastCard') + 9000)));
    ok('⑤ 홈 선적·양하 칸에 «예상 N대»(SideBox·MissingSideNote·목록 줄 RowBar)', (hp.match(/fc=\{forecastLegendOf\(voyage, '(loading|discharge)'\)\}/g) || []).length === 6 && /data-side-forecast/.test(hp) && /data-row-forecast=\{fc\.n\}/.test(hp));

    // ⑥ 관리자 문지기 — 고치기는 열고 작업 기록은 막는다
    B.setActiveWorkChoice({ name: '김성일', mode: 'admin' });
    ok('⑥ 관리자 — 고치기·올리기는 된다(canWorkNow)', B.canWorkNow() === true);
    ok('⑥ 관리자 — 작업 기록은 안 된다(canRecordWorkNow)', B.canRecordWorkNow() === false);
    ok('⑥ 관리자 안내 문구', /관리자로 들어와 있습니다/.test(B.recordGateText('완료')) && /N호기로 등록하고 시작/.test(B.recordGateText('완료')) /* 5.20: 헤더 관리자 칩을 뺐다 — 안내는 호기 등록 */);
    B.setActiveWorkChoice({ name: '김성일', mode: 'view' });
    ok('⑥ 조회만 — 종전 문구 그대로', B.canRecordWorkNow() === false && /조회만으로 들어와/.test(B.recordGateText('완료')));
    B.setActiveWorkChoice({ name: '최원형', mode: 'work', voyageKey: 'KSKM_2621N', equip: '2호기' });
    ok('⑥ 작업자 — 기록된다', B.canRecordWorkNow() === true);
    B.setActiveWorkChoice(null);

    const fb = rd('src/firebase.js');
    const fnBody = (name) => { const i = fb.indexOf(`export async function ${name}(`); return i < 0 ? '' : fb.slice(i, fb.indexOf('\n}\n', i)); };
    const rec = ['fbCompleteContainer', 'fbCompleteContainersAtomic', 'fbHoldContainers', 'fbReleaseHold', 'fbSnoozeHold', 'fbAddExtraContainer', 'fbAddWorkReport', 'fbAddPhotoReport', 'fbRelieveCrane'];
    const miss = rec.filter((k) => !/assertCanRecordWork\(/.test(fnBody(k)));
    ok(`⑥ 작업 기록 ${rec.length}곳이 관리자 문지기를 부른다`, miss.length === 0, miss.join(','));
    ok('⑥ 문지기 몸통 — assertCanWork 먼저, 관리자면 adminOnly 를 던진다', (() => { const i = fb.indexOf('function assertCanRecordWork('); const b = fb.slice(i, fb.indexOf('\n}\n', i)); return i > 0 && /assertCanWork\(what\);\n  if \(!isAdminNow\(\)\) return;/.test(b) && /e\.adminOnly = true;/.test(b) && /throw e;/.test(b) && !/return;\s*\n\s*return/.test(b); })());
    ok('⑥ X-RAY 봉인자 등록(register:true)만 관리자 문지기 · 이름 정정은 열림', /if \(sealerOpt && sealerOpt\.register === true\) assertCanRecordWork\('X-RAY 봉인자 등록'\)/.test(fnBody('fbSetXraySeal')));
    ok('⑥ 호기 이동·외부 중단 보고와 수화물 확정은 관리 기록 — 관리자에게 열림', /report\.type === 'crane_move' \|\| report\.type === 'external_pause'\)\) assertCanWork/.test(fnBody('fbAddWorkReport')) && !/assertCanRecordWork/.test(fnBody('fbSetLuggConfirm')));
    const gw = rd('src/components/GuidedWorkPanel.jsx');
    ok('⑥ 자동 가이드 [수정] 길은 자리 맞바꿈 전에 막는다(감사 중1)', ['const handleFixPick = async', 'const handleTwinFixApply = async', 'const applyFixOne = async'].every((k) => { const i = gw.indexOf(k); return i > 0 && gw.slice(i, i + 400).includes('if (!canRecordWorkNow())'); }));
    const open = ['fbSetVoyageCraneCrew', 'fbSetVoyageWorkStart'];
    const shut = open.filter((k) => /assertCanRecordWork\(/.test(fnBody(k)));
    ok('⑥ 관리 기록(조 등록·시작 시각)은 막지 않는다(3.51-01)', shut.length === 0, shut.join(','));
    ok('⑥ 고치기 길(완료 취소·자리 수정·보고 고치기)은 관리자에게 열려 있다', !/assertCanRecordWork\('(완료 취소|자리 수정|보고 고치기|보고 지우기)'/.test(fb));
    const sp = rd('src/components/SearchPanel.jsx');
    ok('⑥ 해치 자동 보고는 관리자에서 돌지 않는다', /if \(!canRecordWorkNow\(\)\) return;   \/\/ 5\.12/.test(sp));
  } catch (err) { bad += 1; console.log('  ✘ 실행 오류 — ' + (err && err.stack || err)); }
  console.log(`\n5.12 예보 별첨·관리자 기록 연막검사 — ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})();
