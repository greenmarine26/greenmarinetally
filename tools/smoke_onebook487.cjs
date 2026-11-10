// 일괄수리(2026-11-10) 연막검사 — 판정 한 벌: 규격 길이(sizeLenOf) · 부두(voyagePierOf) · 휴게 없는 배(noRest) · 선박 성질표(SHIP_FLAGS)에서 만든 목록이 옮기기 전과 같은지.
'use strict';
process.env.TZ = 'Asia/Seoul';
const fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());
let n = 0, bad = 0;
const ok = (name, cond, d = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${d ? ' — ' + String(d).slice(0, 300) : ''}`); } };
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
global.fetch = () => Promise.reject(new Error('no net'));
console.warn = () => {};

//  옮기기 전(base 커밋)의 목록 — 리터럴로 적어 대조한다
const BASE = {
  NO_SHIFT_SHIPS: ['OBWH', 'RZOR', 'SMYA'],            // workShift.js 11행
  FERRY_1700_SHIPS: ['TNJP', 'OBWH', 'RZOR'],          // utils.js 4737행
  HATCH_SKIP: ['TMPZ', 'TNJP', 'RZOR', 'OBWH', 'ATPR'],  // utils.js 11405행 /TMPZ|TNJP|RZOR|OBWH|ATPR/i
  SHIP_LUGGAGE: { RZOR: 1 },                           // utils.js 11398행
  VIRTUAL_LOAD_SHIPS: ['RZOR', 'OBWH'],                // autoRegApi.js 62행
  PLAN_VIRTUAL_SHIPS: ['TMPZ'],                        // autoRegApi.js 67행
  ATPR_NAMES: ['ATPR', 'ATRP', 'ATLANTIC PIONEER'],    // esealVoice.js 14행
  VOUCHER: ['OBWH'],                                   // tallyExcel.js 376행 D.code !== 'OBWH'
  NO_REST: ['RZOR', 'OBWH'],                           // 콘앱 CT_NO_REST(public/cone.html)
};
const sameSet = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

(() => {
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'ob487_'));
  const EXP = `export { legendLiveOf, voyagePierOf, isPctcVoyage, FERRY_1700_SHIPS, isFerry1700Ship, HATCH_SKIP_RE, isHatchSkipShipInfo, SHIP_LUGGAGE, NO_SHIFT_SHIPS, shipHasShifts, isNoShiftShip, isoToLabel } from "${ROOT}/src/utils.js";\n`
    + `export { sizeLenOf, tallySizeCol } from "${ROOT}/src/tallyReport.js";\n`
    + `export { normPier, addWorkMinutes, workMinutesBetween, isNoRestShip, WORK_SHIFTS } from "${ROOT}/src/nlSearch.js";\n`
    + `export { SHIP_FLAGS, shipFlag, shipCodesWith } from "${ROOT}/src/shipPolicyCore.js";\n`
    + `export { isAtprWeiEmpty } from "${ROOT}/src/esealVoice.js";\n`;
  const build = (name, head) => {
    const e = path.join(TMP, name + '.mjs'), o = path.join(TMP, name + '.cjs');
    fs.writeFileSync(e, head + EXP);
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --outfile="${o}" --loader:.js=jsx --jsx=automatic --loader:.png=dataurl --log-level=error --alias:firebase/app=./tools/stub_fbdb_mem.js --alias:firebase/database=./tools/stub_fbdb_mem.js`, { cwd: ROOT, stdio: 'pipe' });
    return require(o);
  };
  //  ⓪ utils ↔ tallyReport 순환 — 어느 쪽을 먼저 읽어도 죽지 않는다(모듈을 읽는 시점에 상대 값을 쓰는 곳이 없다)
  let U = null, U2 = null, e1 = '', e2 = '';
  try { U = build('a', `import "${ROOT}/src/utils.js";\n`); } catch (e) { e1 = String(e && e.message || e); }
  try { U2 = build('b', `import "${ROOT}/src/tallyReport.js";\n`); } catch (e) { e2 = String(e && e.message || e); }
  ok('utils 를 먼저 읽어도 읽힌다(utils ↔ tallyReport 순환)', !!U, e1);
  ok('tallyReport 를 먼저 읽어도 읽힌다', !!U2 && U2.sizeLenOf({ iso: 'L2G1' }) === '40', e2);
  if (!U) { console.log(`\n${n - bad}/${n}`); process.exit(1); }

  //  ① 규격 길이 한 벌 — sizeLenOf = tallySizeCol 을 20·40·45 로 접은 것
  const fold = (c) => { const k = U.tallySizeCol(c); return k === 'HC' ? '40' : k; };
  ok('L2G1 → 40 (라벨은 45HC · 마감텔리 HC 칸)', U.sizeLenOf({ iso: 'L2G1' }) === '40' && /^45/.test(U.isoToLabel('L2G1') || ''), `${U.sizeLenOf({ iso: 'L2G1' })} · ${U.isoToLabel('L2G1')}`);
  ok('45G1 → 40 · L5G1 → 45 · 22G1 → 20 (tallySizeCol 과 일치)', U.sizeLenOf({ iso: '45G1' }) === '40' && U.tallySizeCol({ iso: '45G1' }) === 'HC' && U.sizeLenOf({ iso: 'L5G1' }) === '45' && U.tallySizeCol({ iso: 'L5G1' }) === '45' && U.sizeLenOf({ iso: '22G1' }) === '20');
  ok('장금 SKHU 600번대 22GP → 40 (마감텔리 HC 칸) · 200번대는 20', U.sizeLenOf({ iso: '22GP', cn: 'SKHU9508980' }) === '40' && U.sizeLenOf({ iso: '22GP', cn: 'SKHU2508980' }) === '20');
  ok('규격이 빈 행 — _sizeFill 을 따른다 · 없으면 20(마감텔리와 같다)', U.sizeLenOf({ iso: '', _sizeFill: '40' }) === '40' && U.sizeLenOf({}) === '20' && U.sizeLenOf(null) === '20');
  const CODES = ['22G1', '22GP', '2200', '2210', '22R1', '22U1', '22P1', '22T1', '25G1', '2600', '228E', '20DC', '20HC', '20RF', '20HT', '42G1', '4200', '4310', '436E', '43DC', '45G1', '45GP', '4500', '45R1', '45U1', '45RE', '45GE', '40HC', '40DC', '40HR', '40OH', '40HT', '40FR', 'L5G1', 'L5GP', 'L5GE', 'L2G1', 'L5U0', '9500', '9000', 'DCHC', 'RF40', 'FR20', '45HC', '45DC', ''];
  const diffs = CODES.filter((iso) => U.sizeLenOf({ iso }) !== fold({ iso }));
  ok(`규격 ${CODES.length}종 전부 sizeLenOf = 접은 tallySizeCol`, diffs.length === 0, diffs.join());
  ok('세 길이 밖의 값은 없다', CODES.every((iso) => ['20', '40', '45'].includes(U.sizeLenOf({ iso }))));
  //  수석 보드 별첨(legendLiveOf)이 같은 길이로 센다
  const rows = [
    { cn: 'BOMU8201057', iso: 'L2G1', pod: 'KRPTK', fe: 'F', op: 'TST', bay: '02', row: '01', tier: '82' },
    { cn: 'SKHU9508980', iso: '22GP', pod: 'KRPTK', fe: 'F', op: 'TST', bay: '06', row: '01', tier: '82' },
    { cn: 'TESU1111111', iso: 'L5G1', pod: 'KRPTK', fe: 'F', op: 'TST', bay: '10', row: '01', tier: '82' },
    { cn: 'TESU2222222', iso: '22G1', pod: 'KRPTK', fe: 'E', op: 'TST', bay: '01', row: '01', tier: '82' },
  ];
  const L = U.legendLiveOf(rows, 'discharge', {});
  ok('수석 보드 별첨 — L2G1·SKHU 600번대는 40 줄 · L5G1 은 45 줄 · 22G1 은 20 줄', L.n === 4 && L.fe['40'].F.n === 2 && L.fe['45'].F.n === 1 && L.fe['20'].E.n === 1, JSON.stringify(L.fe));
  const srcOf = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  ok('카고플랜 별첨 · 미르 베이 분포 · LOLO 집계 · 미르 카드가 sizeLenOf 를 부른다',
    /const sizeOfC = sizeLenOf;/.test(srcOf('src/components/PrintableCargoPlanV2.jsx')) && /return sizeLenOf\(c\);/.test(srcOf('src/nlSearch.js'))
    && /sizeLenOf\(r\)/.test(srcOf('src/loloReport.js')) && /sizeLenOf\(\{ \.\.\.c, iso \}\)/.test(srcOf('src/mir.js')));

  //  ② 부두 판정 한 벌 — pier → 선석 → ''
  const P = U.voyagePierOf;
  ok('pier 만 — 정규화(PNCT·PCTC · 소문자·군말 포함)', P({ pier: 'PNCT' }) === 'PNCT' && P({ pier: 'pctc' }) === 'PCTC' && P({ pier: 'PNCT 13번 선석' }) === 'PNCT');
  ok('선석만 — 6~9 PCTC · 13~16 PNCT', P({ berth: '동부두 7번선석' }) === 'PCTC' && P({ berth: '동부두 14번선석' }) === 'PNCT' && P({ berthNo: '동부두 15번선석' }) === 'PNCT');
  ok('둘 다 — pier 가 먼저', P({ pier: 'PCTC', berth: '동부두 14번선석' }) === 'PCTC' && P({ pier: 'PNCT', berth: '동부두 7번선석' }) === 'PNCT');
  ok('둘 다 없음 · 못 읽는 값 · 타항 선석 → 빈 값', P({}) === '' && P(null) === '' && P({ pier: '동방', berth: '동부두 1번선석' }) === '' && P({ berth: '신항 한진인천컨테이너터미널 3번선석' }) === '');
  ok('pier 가 못 읽는 글자면 선석으로', P({ pier: '미정', berth: '동부두 16번선석' }) === 'PNCT');
  const NP = [['PNCT', ''], ['', '동부두 7번선석'], ['pnct 13번', '동부두 7번선석'], ['', ''], [null, '동부두 14번선석'], ['PCTC', '동부두 14번선석']];
  ok('nlSearch.normPier 는 같은 함수 — 같은 답', NP.every(([p, b]) => U.normPier(p, b) === P({ pier: p, berth: b })));
  ok('isPctcVoyage — 부두 → 선석 → 터미널 항차 하이픈(종전 그대로)', U.isPctcVoyage({ pier: 'PCTC' }) === true && U.isPctcVoyage({ berth: '동부두 14번선석' }) === false && U.isPctcVoyage({ termVoy: 'DJCF-0011' }) === true && U.isPctcVoyage({ termVoy: 'OBWH104' }) === false);
  ok('mir.pierOf · chiefAnswers 가 voyagePierOf 를 부른다(기본값은 그 자리에)', /return voyagePierOf\(info\) \|\| 'PCTC';/.test(srcOf('src/mir.js')) && /const pier = voyagePierOf\(info\) \|\| null;/.test(srcOf('src/chiefAnswers.js')));

  //  ③ 휴게 없는 배 — 쉬는 창을 빼지 않는다
  const at = (h, m) => new Date(2026, 10, 10, h, m, 0, 0).getTime();   // 2026-11-10 (화)
  const a0 = U.addWorkMinutes(at(11, 0), 120, 'PCTC'), a1 = U.addWorkMinutes(at(11, 0), 120, 'PCTC', { noRest: true });
  ok('PCTC 11:00 + 120분 — 종전 14:00(중식 12~13 건너뜀) · 휴게 없음 13:00', a0.getTime() === at(14, 0) && a1.getTime() === at(13, 0), `${a0} / ${a1}`);
  ok('휴게 없음이 쉬는 창(60분)만큼 이르다', a0.getTime() - a1.getTime() === 60 * 60000);
  const b0 = U.addWorkMinutes(at(23, 0), 120, 'PNCT'), b1 = U.addWorkMinutes(at(23, 0), 120, 'PNCT', { noRest: true });
  ok('PNCT 23:00 + 120분 — 종전 익일 02:30(야식 23:30~01:00) · 휴게 없음 익일 01:00', b0.getTime() === at(23, 0) + 210 * 60000 && b1.getTime() === at(23, 0) + 120 * 60000, `${b0} / ${b1}`);
  ok('인자를 안 넘기면 종전과 같다(빈 opts · noRest 거짓 포함)', U.addWorkMinutes(at(11, 0), 120, 'PCTC', {}).getTime() === a0.getTime() && U.addWorkMinutes(at(11, 0), 120, 'PCTC', { noRest: false }).getTime() === a0.getTime() && U.addWorkMinutes(at(11, 0), 0, 'PCTC', { noRest: true }).getTime() === at(11, 0));
  const w0 = U.workMinutesBetween(at(11, 0), at(14, 0), 'PCTC'), w1 = U.workMinutesBetween(at(11, 0), at(14, 0), 'PCTC', { noRest: true });
  ok('실작업 분 11:00~14:00 — 종전 120분 · 휴게 없음 180분 · 거꾸로면 0', w0 === 120 && w1 === 180 && U.workMinutesBetween(at(14, 0), at(11, 0), 'PCTC', { noRest: true }) === 0, `${w0} / ${w1}`);
  ok('휴게 없는 배 = OBWH · RZOR 뿐 (콘앱 CT_NO_REST 와 같다)', U.isNoRestShip({ vsl: 'OBWH' }) && U.isNoRestShip({ vsl: 'rzor ' }) && !U.isNoRestShip({ vsl: 'SMYA' }) && !U.isNoRestShip({ vsl: 'TNJP' }) && !U.isNoRestShip({}) && !U.isNoRestShip(null)
    && sameSet(U.shipCodesWith('noRest'), BASE.NO_REST));
  const cone = srcOf('public/cone.html');
  const mNo = /const CT_NO_REST = new Set\(\[([^\]]*)\]\)/.exec(cone);
  ok('콘앱 CT_NO_REST 사본과 원소가 같다', !!mNo && sameSet(mNo[1].split(',').map((s) => s.replace(/['"\s]/g, '')).filter(Boolean), U.shipCodesWith('noRest')), mNo && mNo[1]);

  //  ④ 선박 성질표에서 만든 목록 = 옮기기 전 목록
  ok('NO_SHIFT_SHIPS — OBWH·RZOR·SMYA (차례까지 같다)', JSON.stringify(U.NO_SHIFT_SHIPS) === JSON.stringify(BASE.NO_SHIFT_SHIPS), JSON.stringify(U.NO_SHIFT_SHIPS));
  ok('SMYA 는 주야 구분 없음에만 있다', Object.keys(U.SHIP_FLAGS.SMYA).join() === 'noShift' && !U.shipHasShifts('smya') && U.shipHasShifts('TNJP') && U.isNoShiftShip({ vsl: 'SMYA' }) && U.isNoShiftShip(null, 'OBWH_2690W'));
  ok('FERRY_1700_SHIPS — TNJP·OBWH·RZOR', sameSet(U.FERRY_1700_SHIPS, BASE.FERRY_1700_SHIPS) && U.isFerry1700Ship({ vsl: 'tnjp' }) && U.isFerry1700Ship(null, 'RZOR_R123E') && !U.isFerry1700Ship({ vsl: 'SMYA' }), JSON.stringify(U.FERRY_1700_SHIPS));
  const reBase = /TMPZ|TNJP|RZOR|OBWH|ATPR/i;
  const reAlts = String(U.HATCH_SKIP_RE).replace(/^\/|\/i$/g, '').split('|');
  const HS = ['TMPZ', 'tnjp', 'RZOR', 'OBWH', 'ATPR', 'ATRP', 'SMYA', 'DXQD', 'RIZHAO ORIENT', 'XTMPZX', 'OCEAN BLUE WHALE', 'ATLANTIC PIONEER', '', 'KKLC OBWH2'];
  ok('HATCH_SKIP_RE — 같은 다섯 척 · i 플래그 · 부분 일치 결과가 같다', sameSet(reAlts, BASE.HATCH_SKIP) && U.HATCH_SKIP_RE.flags === 'i' && HS.every((s) => U.HATCH_SKIP_RE.test(s) === reBase.test(s)) && HS.every((s) => U.isHatchSkipShipInfo({ vsl: s, vslFull: '' }) === reBase.test(`${s} `)), String(U.HATCH_SKIP_RE));
  ok('SHIP_LUGGAGE — { RZOR: 1 }', JSON.stringify(U.SHIP_LUGGAGE) === JSON.stringify(BASE.SHIP_LUGGAGE), JSON.stringify(U.SHIP_LUGGAGE));
  const ar = srcOf('src/autoRegApi.js');
  ok('VIRTUAL_LOAD_SHIPS — RZOR·OBWH', sameSet(U.shipCodesWith('virtualLoad'), BASE.VIRTUAL_LOAD_SHIPS) && ar.includes("const VIRTUAL_LOAD_SHIPS = new Set(shipCodesWith('virtualLoad'));"), U.shipCodesWith('virtualLoad').join());
  ok('PLAN_VIRTUAL_SHIPS — TMPZ', sameSet(U.shipCodesWith('planVirtual'), BASE.PLAN_VIRTUAL_SHIPS) && ar.includes("const PLAN_VIRTUAL_SHIPS = new Set(shipCodesWith('planVirtual'));"), U.shipCodesWith('planVirtual').join());
  ok('esealVoice ATPR 이름 — ATPR·ATRP·ATLANTIC PIONEER', JSON.stringify(U.SHIP_FLAGS.ATPR.sealAttachNames) === JSON.stringify(BASE.ATPR_NAMES)
    && U.isAtprWeiEmpty('ATPR', { fe: 'E', pod: 'CNWEI' }) === true && U.isAtprWeiEmpty('atlantic pioneer', { fe: 'E', pod: 'CNWEH' }) === true && U.isAtprWeiEmpty('ATPR 2648E', { fe: 'E', pod: 'CNWEI' }) === false && U.isAtprWeiEmpty('TNJP', { fe: 'E', pod: 'CNWEI' }) === false);
  ok('tallyExcel 바우처형 — OBWH 뿐', sameSet(U.shipCodesWith('voucherTally'), BASE.VOUCHER) && srcOf('src/tallyExcel.js').includes('if (!M && !(SHIP_FLAGS[D.code] || {}).voucherTally) {'));
  ok('shipFlag — 코드(대소문자·공백) · 이름 자리의 코드 · 모르는 배는 빈 성질', U.shipFlag(' obwh ').noRest === true && U.shipFlag('', 'RZOR').luggage === 1 && Object.keys(U.shipFlag('XXXX')).length === 0 && Object.keys(U.shipFlag('constructor')).length === 0 && Object.keys(U.shipFlag(null)).length === 0);
  ok('성질표에 있는 배는 여섯 척뿐(늘면 이 검사와 base 목록을 같이 본다)', sameSet(Object.keys(U.SHIP_FLAGS), ['OBWH', 'RZOR', 'SMYA', 'TNJP', 'TMPZ', 'ATPR']));

  console.log(`\n${n - bad}/${n}`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { console.log('임시 폴더를 못 지웠다 — ' + TMP + ' — ' + (e && e.message)); }
  process.exit(bad ? 1 : 0);
})();
