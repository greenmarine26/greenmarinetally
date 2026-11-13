// 4.88 연막검사 — 판정 한 벌: ① 베이사전 백업 union 이름 짐작 문지기 ② 규격 길이 ③ KST 날짜 ④ 업로드 충돌 창 실번호 ⑤ 평택 판정(수집기 합본) ⑥ X-RAY 실 점검. 실데이터 픽스처 tools/fixtures/onebook488.json.
'use strict';
process.env.TZ = 'Asia/Seoul';
const fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());
let n = 0, bad = 0;
const ok = (name, cond, d = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${d ? ' — ' + String(d).slice(0, 400) : ''}`); } };
global.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {}, location: { search: '', href: '' } };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
global.fetch = () => Promise.reject(new Error('no net'));
console.warn = () => {};
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const FX = JSON.parse(src('tools/fixtures/onebook488.json'));

const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'ob488_'));
const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'o.cjs');
fs.writeFileSync(e, `import "${ROOT}/src/utils.js";\n`
  + `export { isoToLabel, isoFeet, isPyeongtaekPort, sealSameLoose, xraySealCheckOf, xraySealCheckLines } from "${ROOT}/src/utils.js";\n`
  + `export { sizeLenOf, sizeLenKnown, tallySizeCol } from "${ROOT}/src/tallyReport.js";\n`
  + `export { sizeOf as ediGapSizeOf } from "${ROOT}/src/ediGap.js";\n`
  + `export { sizeOf as planEditSizeOf } from "${ROOT}/src/planEditCore.js";\n`
  + `export { normalizeCntrType } from "${ROOT}/src/loadingEdiExport.js";\n`
  + `export { getShipBayDictData } from "${ROOT}/src/shipStructure.js";\n`
  + `export { lookupBayDictV2Enhanced } from "${ROOT}/src/data/shipBayDict_v2.js";\n`
  + `export { ymdKST, kstIsoOf } from "${ROOT}/src/meToday.js";\n`
  + `export { generateVgmListHTML } from "${ROOT}/src/inspectionList.js";\n`
  + `export { answerVoyageFacts } from "${ROOT}/src/mir.js";\n`
  + `export { parseNaturalQuery } from "${ROOT}/src/nlSearch.js";\n`);
let U = null;
try {
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --outfile="${o}" --loader:.js=jsx --jsx=automatic --loader:.png=dataurl --log-level=error --alias:firebase/app=./tools/stub_fbdb_mem.js --alias:firebase/database=./tools/stub_fbdb_mem.js --alias:firebase/storage=./tools/stub_fbdb_mem.js`, { cwd: ROOT, stdio: 'pipe' });
  U = require(o);
} catch (err) { ok('번들 생성', false, String(err && (err.stderr || err.message) || err)); console.log(`\n${n - bad}/${n}`); process.exit(1); }

console.log('① 베이사전 백업 union — 이름 짐작(name-fuzzy) 문지기');
{
  //  실측 전제 — v2 사전에 HAB·ANAS 로 정확히 맞는 배가 없어 이름 짐작이 KKLC·MCAP 을 낸다(감사 재현).
  const pre = ['HAB', 'ANAS'].map((c) => (U.lookupBayDictV2Enhanced('', c) || {}).matchedBy || '');
  ok('전제 — HAB·ANAS 는 v2 에서 name-fuzzy 로만 잡힌다(KKLC·MCAP)', pre.every((m) => /^name-fuzzy/.test(m)), pre.join(' · '));
  for (const code of ['HAB', 'ANAS']) {
    window.__fbShipBayDict = { [code]: { code, name: code + ' TEST', bayDef: { source: 'gemini', baysSummary: [{ bayNo: '02', deckTiers: ['82'], holdTiers: ['02'] }], bayList: ['02'] } } };
    const r = U.getShipBayDictData('', code, { vslCode: code });
    const bs = (r && r.bayDef && r.bayDef.baysSummary) || [];
    const b02 = bs.find((b) => String(b.bayNo) === '02') || {};
    ok(`${code} — 정본 아닌 보관소 항목에 남의 배(이름 짐작) 단이 섞이지 않는다(데크 82 하나)`, (b02.deckTiers || []).map(String).join() === '82', JSON.stringify(b02).slice(0, 200));
  }
  window.__fbShipBayDict = {};
  ok('shipStructure 백업 union 자리에 name-fuzzy 문지기가 있다', /_v2Raw && !String\(_v2Raw\.matchedBy \|\| ''\)\.startsWith\('name-fuzzy'\)/.test(src('src/shipStructure.js')));
}

console.log('② 규격 길이 한 벌');
{
  const S = FX.size;
  const dc20 = S.dc20;
  ok(`DC20 실컨 ${dc20.length}대(KBTR) — isoFeet·ediGap·planEditCore·sizeLenOf 가 모두 20`, dc20.length >= 5 && dc20.every((c) => U.isoFeet(c.iso) === 20 && U.ediGapSizeOf(c.iso) === '20ft' && U.planEditSizeOf(c) === '20' && U.sizeLenOf(c) === '20'),
    dc20.map((c) => `${c.cn} ${U.isoFeet(c.iso)}/${U.ediGapSizeOf(c.iso)}/${U.planEditSizeOf(c)}/${U.sizeLenOf(c)}`).join(' '));
  ok(`DCHC 실컨 ${S.dchc.length}대 — 40(ediGap 은 «기타» 가 아니라 40ft)`, S.dchc.length >= 2 && S.dchc.every((c) => U.sizeLenOf(c) === '40' && U.ediGapSizeOf(c.iso) === '40ft' && U.isoFeet(c.iso) === 40));
  ok(`L2G1 실컨 ${S.l2g1.length}대 — 화면·마감텔리 40(수석 HC 칸) · isoFeet 도 40`, S.l2g1.length >= 3 && S.l2g1.every((c) => U.sizeLenOf(c) === '40' && U.planEditSizeOf(c) === '40' && U.isoFeet(c.iso) === 40 && U.tallySizeCol(c) === 'HC'));
  ok('L2G1 EDI 내보내기(normalizeCntrType)는 실물 45 를 지킨다 — 마감텔리 칸 규칙을 EDI 코드에 섞지 않는다', U.normalizeCntrType('L2G1').len === '45');
  //  ★ 검수사 확정 2026-11-12 «45HC 는 진짜 45피트» — X-RAY 목록 iso 45HC 8대가 같은 컨의 리스트 L5G1 과 같은 답
  const x = S.x45hc;
  ok(`OBWH 2763E X-RAY 목록 iso «45HC» ${x.length}대 — 라벨 45HC · 길이 45 · 같은 컨 리스트(L5G1)와 같은 답`, x.length === 8 && x.every((c) => U.isoToLabel(c.iso) === '45HC' && U.sizeLenOf({ iso: c.iso }) === '45' && U.sizeLenOf({ iso: c.rec_iso }) === '45' && U.isoFeet(c.iso) === 45),
    x.map((c) => `${c.cn} ${U.isoToLabel(c.iso)} ${U.sizeLenOf({ iso: c.iso })}/${c.rec_iso}`).join(' '));
  ok(`세관 45HC 인 리스트 L5G1 ${S.l5g1_same.length}대 — 전부 45`, S.l5g1_same.length >= 40 && S.l5g1_same.every((c) => U.sizeLenOf(c) === '45'));
  ok(`RZOR R107E 덱플랜 «45 HC» ${S.rzor45.length}대 — 45(선사 덱플랜이 40 HC 와 따로 적는 진짜 45피트)`, S.rzor45.length === 6 && S.rzor45.every((c) => U.sizeLenOf(c) === '45' && U.isoToLabel(c.iso) === '45HC'));
  ok('ISO 45xx(45G1·45R1·45GP·4500)는 그대로 40피트 하이큐브', ['45G1', '45R1', '45GP', '4500'].every((i) => U.sizeLenOf({ iso: i }) === '40' && U.isoFeet(i) === 40) && U.isoToLabel('45G1') === '40HC' && U.isoToLabel('45GP') === '40HC');
  ok('장금 SKHU 600번대 22GP(PCSZ 실컨) — 마감텔리 규칙대로 40', S.skhu22.length === 2 && S.skhu22.every((c) => U.sizeLenOf(c) === '40'));
  ok('M5G1(48피트) — 40 보다 긴 칸(45) · isoFeet 와 같은 답', U.sizeLenOf({ iso: 'M5G1' }) === '45' && U.isoFeet('M5G1') === 45);
  ok('규격이 비면 리스트 tp 를 읽는다 — tp «40\'HC» → 40 · «20\'GP» → 20 · tp 도 없으면 모름', U.sizeLenOf({ iso: '', tp: "40'HC" }) === '40' && U.sizeLenOf({ iso: '', tp: "20'GP" }) === '20' && U.sizeLenKnown({ iso: '' }) === '' && U.sizeLenKnown({ iso: 'ZZZZ' }) === '');
  const SITES = [
    ['src/components/GuidedWorkPanel.jsx', /const is40 = \(c\) => \{ const k = sizeLenKnown\(c\);/],
    ['src/components/SearchPanel.jsx', /const is40 = \(c\) => \{ const k = sizeLenKnown\(c\);/],
    ['src/guidedQueue.js', /const is20ft = \(c\) => sizeLenKnown\(c\) === '20';/],
    ['src/mir.js', /const is20 = \(iso\) => sizeLenKnown\(\{ iso \}\) === '20';/],
    ['src/nlSearch.js', /return sizeLenKnown\(\{ iso: c\.iso \}\) === '20';/],
    ['src/utils.js', /return Number\(sizeLenKnown\(\{ iso \}\)\) \|\| 40;/],
    ['src/ediGap.js', /const k = sizeLenKnown\(\{ iso: S\(iso\) \}\);/],
    ['src/planEditCore.js', /return sizeLenOf\(c \|\| \{\}\);/],
    ['src/twin.js', /const _is20 = \(c\) => sizeLenKnown\(\{ iso: c\?\.iso \}\) === '20';/],
  ];
  const miss = SITES.filter(([f, re]) => !re.test(src(f))).map(([f]) => f);
  ok(`호출부 ${SITES.length}곳이 규격 길이 한 벌을 부른다`, !miss.length, miss.join());
  //  콘앱 — cone.html 의 coneSize 를 꺼내 검수앱 번들 함수(ConeParse/ConeMir.sizeLenOf)로 돌린다
  const cone = src('public/cone.html');
  const code = (cone.match(/function coneSize\(iso, tp\)\{[\s\S]*?\n\}/) || [''])[0];
  ok('콘앱 coneSize 가 있다', !!code);
  const coneSize = code ? new Function('window', code + '\nreturn coneSize;')({ ConeMir: { sizeLenOf: U.sizeLenOf, sizeLenKnown: U.sizeLenKnown } }) : () => '';
  ok('콘앱 — DC20 은 20 · L5G1·45HC·L2G1·45G1 은 40 칸(콘 자리) · 빈 규격은 \'\'', dc20.every((c) => coneSize(c.iso) === '20') && ['L5G1', '45HC', 'L2G1', '45G1'].every((i) => coneSize(i) === '40') && coneSize('') === '');
  //  감사 «가» (4.88) — 못 읽는 규격은 «모름»이라 세 곳이 종전 기본값을 지킨다(20 으로 떨어뜨리지 않는다): isoFeet 40 · ediGap «기타» · 콘앱 40.
  const UNK = [{ iso: 'XXXX' }, { iso: 'RH40' }, { iso: '', tp: 'FR40' }];
  ok('못 읽는 규격 세 예(XXXX · RH40 · 규격 없이 tp FR40) — sizeLenKnown 은 «모름»', UNK.every((c) => U.sizeLenKnown(c) === ''), UNK.map((c) => U.sizeLenKnown(c)).join());
  ok('못 읽는 규격 — isoFeet 40 · ediGap «기타» · 콘앱 40 (종전 기본값)', U.isoFeet('XXXX') === 40 && U.isoFeet('RH40') === 40 && U.ediGapSizeOf('XXXX') === '기타' && U.ediGapSizeOf('RH40') === '기타' && UNK.every((c) => coneSize(c.iso, c.tp) === '40'),
    `${U.isoFeet('XXXX')}/${U.isoFeet('RH40')}/${U.ediGapSizeOf('XXXX')}/${U.ediGapSizeOf('RH40')}/${UNK.map((c) => coneSize(c.iso, c.tp)).join(',')}`);
  const coneCode = cone.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  ok('콘앱 본문에 첫 글자 규격 사본(iso[0]===\'2\')이 남아 있지 않다', !/iso\)?\[0\]\s*===\s*'2'/.test(coneCode.replace(/return \(t\.startsWith\('20'\)\|\|s\[0\]==='2'\)/, '')));
  ok('콘앱 판 ConeOne 2.78 · 번들 두 곳(ConeParse·ConeMir)이 sizeLenOf 를 내보낸다', /window\.__CONEV='ConeOne (?:2\.7[89]|3\.\d\d)(-\d\d)?'/.test(cone) && /window\.ConeParse = \{ sizeLenOf, sizeLenKnown,/.test(src('src/coneCargoPlan.entry.jsx')) && /export \{ sizeLenOf, sizeLenKnown \} from '\.\/tallyReport\.js';/.test(src('src/mirCore.entry.js')));
}

console.log('③ KST 날짜 — KST 00:00~08:59 에 UTC 로 자르면 어제가 찍힌다');
{
  const base = Date.UTC(2026, 10, 11, 15, 0, 0);   // = KST 2026-11-12 00:00
  let diffH = 0, sameH = 0, wrong = 0;
  for (let h = 0; h < 24; h += 1) {
    const ts = base + h * 3600e3 + 30 * 60e3;
    const kst = U.ymdKST(ts), utc = new Date(ts).toISOString().slice(0, 10);
    if (kst !== '2026-11-12') wrong += 1;
    if (kst !== utc) diffH += 1; else sameH += 1;
  }
  ok('KST 하루 24시간 내내 ymdKST = 2026-11-12', wrong === 0);
  ok('UTC 자르기와 갈리는 시각은 KST 00~08시 아홉 시간뿐', diffH === 9 && sameH === 15, `${diffH}/${sameH}`);
  ok('kstIsoOf — KST 03:30 은 «2026-11-12T03:30»', U.kstIsoOf(base + 3.5 * 3600e3).slice(0, 16) === '2026-11-12T03:30');
  //  화면·인쇄 — VGM 리스트 머리 날짜를 KST 03:00 에 뽑는다
  const _now = Date.now; Date.now = () => base + 3 * 3600e3;
  const _D = global.Date; let html = '';
  try { html = U.generateVgmListHTML([{ cn: 'TEMU1234567', wt: 20000 }], { vsl: 'TMPZ', voy: '2038E' }); } finally { Date.now = _now; global.Date = _D; }
  ok('VGM 리스트(KST 03:00 출력) 날짜가 2026-11-12', /2026-11-12/.test(html) && !/2026-11-11/.test(html));
  const DISPLAY = ['src/inspectionList.js', 'src/components/PrintableCargoPlanV2.jsx', 'src/workingReport.js', 'src/printHelper.js', 'src/components/PrintableBayDetail.jsx', 'src/pages/ChiefDashboard.jsx', 'src/tallyExcel.js', 'src/components/EmptySealReport.jsx', 'src/components/CSVExport.jsx', 'src/components/SearchPanel.jsx', 'src/components/StaffManagerModal.jsx', 'src/stowageAutoParser.js', 'bulk_tally.html'];
  const left = DISPLAY.filter((f) => /new Date\(\)\.toISOString\(\)\.slice\(0, ?1[06]\)|new Date\(d\.addedAt\)\.toISOString\(\)|\(\/\* @__PURE__ \*\/ new Date\(\)\)\.toISOString\(\)/.test(src(f)));
  ok(`화면·인쇄·파일 이름 ${DISPLAY.length}곳에 UTC 날짜 자르기가 남아 있지 않다`, !left.length, left.join());
  //  저장 키로 쓰이는 두 곳은 바꾸지 않았다(옛 값과 키가 갈린다) — 보고 목록
  ok('저장 키 두 곳(인사말 하루 1회 · 선박 정책 물음 policyAsked)은 그대로 둔다', /const today = new Date\(\)\.toISOString\(\)\.slice\(0, 10\);\n    const lastGreetingDay/.test(src('src/App.jsx')) && /const todayStr = new Date\(\)\.toISOString\(\)\.slice\(0, 10\);/.test(src('src/pages/VoyagePage.jsx')));
}

console.log('④ 업로드 충돌 창 실번호 비교 — sealSameLoose 한 벌');
{
  const P = FX.seal.TMPZ_2038E;
  const lit = P.filter((x) => x.pairs.some((a, i) => x.pairs.some((b, j) => j > i && String(a).trim() !== String(b).trim()))).length;
  const loose = P.filter((x) => x.pairs.some((a, i) => x.pairs.some((b, j) => j > i && !U.sealSameLoose(a, b)))).length;
  ok(`TMPZ 2038E 양하 선사↔세관 실 ${P.length}쌍 — 글자 그대로 ${lit}건 다름 → 한 벌 0건`, P.length === 17 && lit === 17 && loose === 0, `${lit}→${loose}`);
  ok('알파벳이 다르거나 앞자리 0 이 빠진 실은 여전히 다름', !U.sealSameLoose('ES02273964', 'EA02273964') && !U.sealSameLoose('01234567', '1234567'));
  ok('VoyagePage 충돌 창이 sealSameLoose 를 부른다', /if \(ediSl && lrSl && !sealSameLoose\(ediSl, lrSl\)\)/.test(src('src/pages/VoyagePage.jsx')) && !/ediSl !== lrSl/.test(src('src/pages/VoyagePage.jsx')));
}

console.log('⑤ 평택 판정 — 수집기 합본(merge_entry)이 utils.isPyeongtaekPort 한 벌');
{
  const old = (code) => { const t = String(code || '').toUpperCase().trim(); return !!t && /(PTK|PYT|PYOTM|PYO)$/.test(t); };
  const rows = FX.ptk;
  const by = {};
  for (const [vk, m, s, cn, pol, pod] of rows) for (const [f, v] of [['pol', pol], ['pod', pod]]) if (old(v) !== U.isPyeongtaekPort(v)) { const k = `${vk} ${m} ${s} ${f} ${v}`; by[k] = (by[k] || 0) + 1; }
  ok('RTDB 실측 — PCSZ 2634E 선적 리스트 POL «PTK02» 35대 · TMPZ 2038E 양하 리스트 POD «PYONGTAEK» 25대가 이제 평택', by['PCSZ_2634E loading records pol PTK02'] === 35 && by['TMPZ_2038E discharge records pod PYONGTAEK'] === 25 && Object.keys(by).length === 2, JSON.stringify(by));
  const me = src('merge_entry.js');
  ok('merge_entry 의 평택 사본이 없어지고 utils 를 부른다', /const isPtkPort = \(code\) => isPyeongtaekPort\(code\);/.test(me) && !/return \/\(PTK\|PYT\|PYOTM\|PYO\)\$\/\.test\(t\);/.test(me) && /APP_VERSION, isPyeongtaekPort \} from '\.\/src\/utils\.js'/.test(me));
}

console.log('⑥ X-RAY 실 점검 — 중복·앞 세 자리·자릿수만');
{
  const X = FX.xray;
  let seals = 0, issues = 0, dup = 0, pre = 0, dig = 0, tail = 0;
  for (const m of Object.values(X)) {
    const ck = U.xraySealCheckOf(m);
    seals += ck.n; issues += ck.issues; dup += ck.dup.length; pre += ck.prefix.length; dig += ck.digits.length;
    if (ck.major) tail += Object.values(m).filter((s) => /^\d{6}$/.test(String(s)) && String(s).slice(0, 3) === ck.major).length;
  }
  ok(`보관 ${Object.keys(X).length}항차 X-RAY 실 ${seals}개 — 알림 ${issues}대(중복 ${dup}건 · 앞 세 자리 ${pre}대 · 자릿수 ${dig}대)`, Object.keys(X).length === 113 && seals === 840 && issues === 34 && dup === 4 && pre === 12 && dig === 13, `${issues}/${dup}/${pre}/${dig}`);
  ok(`앞 세 자리가 다수와 같은 실 ${tail}개는 뒤 세 자리가 달라도 알리지 않는다`, tail > 700);
  const o71 = U.xraySealCheckOf(X.OBWH_2771E);
  ok('OBWH 2771E — 다수 521… 에서 522… 여섯 대만', o71.major === '521' && o71.prefix.length === 6 && o71.prefix.every((x) => x.seal.startsWith('522')) && !o71.dup.length);
  const hy = U.xraySealCheckOf(X.HAYN_9001E);
  ok('HAYN 9001E — 521135 두 대 중복', hy.dup.length === 1 && hy.dup[0].seal === '521135' && hy.dup[0].cns.length === 2);
  const tn = U.xraySealCheckOf(X.TNJP_26353E);
  ok('TNJP 26353E — 세 자리 실 8대 «자릿수 확인»', tn.digits.length === 8 && tn.byCn[tn.digits[0].cn].text.includes('자릿수 확인'));
  ok('둘로 같은 수로 갈리면 다수를 고르지 않는다', U.xraySealCheckOf({ A: '520001', B: '520002', C: '431001', D: '431002' }).prefix.length === 0);
  //  미르 — «X-RAY 실 점검» 이 커트씰 창구로 가고 같은 함수의 답을 낸다(콘앱도 같은 미르)
  const pq = U.parseNaturalQuery('X-RAY 실 점검해줘');
  ok('«X-RAY 실 점검해줘» → 커트씰 창구', pq && pq.factQuery === 'cutSeal', JSON.stringify(pq && { f: pq.factQuery, a: pq.entityAttr }));
  const xl = {}; for (const cn of Object.keys(X.OBWH_2771E)) xl[cn] = { iso: '45G1' };
  const xsm = {}; for (const [cn, s] of Object.entries(X.OBWH_2771E)) xsm[cn] = { seal: s };
  const ans = U.answerVoyageFacts({ factQuery: 'cutSeal' }, { info: { vsl: 'OBWH' }, voyage: { info: { vsl: 'OBWH' }, discharge: { xrayList: xl, xraySeals: xsm } }, containers: [] });
  const ansS = String((ans && ans.text) || ans || '');
  ok('미르 커트씰 답 — «X-RAY 실 확인 6대» 와 앞 세 자리 줄', /X-RAY 실 확인 6대/.test(ansS) && (ansS.match(/앞 세 자리 확인/g) || []).length === 6, ansS.slice(0, 300));
  const S2 = ['src/components/XrayTab.jsx', 'src/components/ContainerDetailModal.jsx', 'src/components/ContainerList.jsx', 'src/mir.js'].filter((f) => !/xraySealCheckOf\(/.test(src(f)));
  ok('X-RAY 탭·컨 상세·컨 목록·미르가 같은 함수를 부른다', !S2.length, S2.join());
  ok('컨 상세·컨 목록에 처음 값과 글자 그대로 견주던 xSealError 가 없다', !/xSeal !== xSealOrig/.test(src('src/components/ContainerDetailModal.jsx') + src('src/components/ContainerList.jsx')));
  ok('매뉴얼(helpData)에 X-RAY 실 점검 규칙(4.88)', /X-RAY 실 점검은 세 가지만 알립니다\(4\.88/.test(src('src/data/helpData.js')));
}

console.log('⑦ 판 표시');
{
  const u = src('src/utils.js');
  const v = (u.match(/^export const APP_VERSION = '([^']+)'/m) || [])[1];
  const note = (u.match(/^export const APP_NOTE = '([^']*)'/m) || [])[1] || '';
  ok('APP_VERSION TallyOne 4.88', /^TallyOne (?:4\.(88|89)|5\.\d\d)(-\d\d)?$/.test(v || ''), v);   // 4.88-01: 수리판(-NN)도 4.88 판
  ok('APP_NOTE «4.88 …» 두 문장 이내 · 물음표 없음', !!note && !/[?？]/.test(note) && note.replace(/^\d+\.\d+(-\d+)?\s*/, '').split(/[.。]\s*/).filter(Boolean).length <= 2 && /^(?:4\.(88|89)|5\.\d\d)(-\d\d)? /.test(note), note);
}

console.log(`\n${bad ? '✘' : '✔'} 4.88 판정 한 벌 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
