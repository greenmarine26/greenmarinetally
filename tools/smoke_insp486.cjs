// 4.86 연막검사 — 검수 리스트 20 → 20HC → 40 → 40HC → 45HC 단계. 실 OBWH·PCSZ 항차의 평택분 컨 위에서 정렬·순번·경계를 본다.
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
(() => {
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx486_'));
  const out = path.join(TMP, 'u.cjs');
  execSync(`npx esbuild "${path.join(ROOT, 'tools/smoke_insp486_entry.js')}" --bundle --platform=node --format=cjs --outfile="${out}" --loader:.js=jsx --jsx=automatic --log-level=error --alias:firebase/app=./tools/stub_fbdb_mem.js --alias:firebase/database=./tools/stub_fbdb_mem.js`, { cwd: ROOT, stdio: 'pipe' });
  const U = require(out);
  const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/insp486.json'), 'utf8'));
  const TIERS = ['20', '20HC', '40', '40HC', '45HC'];
  const COL_OF = { '20': '20', '20HC': '20', '40': '40', '40HC': 'HC', '45HC': '45' };   // 단계 → 마감텔리 규격 칸
  const count = (rows) => rows.reduce((a, c) => { const t = U.inspTierOf(c); a[t] = (a[t] || 0) + 1; return a; }, {});
  const seq = (sorted) => sorted.map(U.inspTierOf).filter((t, i, a) => i === 0 || a[i - 1] !== t);   // 단계가 바뀌는 차례
  const sortedOf = (rows) => [...rows].sort(U.inspSortCmp);

  //  ① 실 OBWH 2679E 양하 — 20·40·40HC·45HC 넷(20HC 없음)
  const a = fx.OBWH_2679E_discharge, sa = sortedOf(a);
  const ca = count(a);
  ok('OBWH 2679E 양하 단계 대수 20:82 40:4 40HC:133 45HC:14', ca['20'] === 82 && ca['40'] === 4 && ca['40HC'] === 133 && ca['45HC'] === 14 && !ca['20HC'], JSON.stringify(ca));
  ok('OBWH 2679E 양하 순서 20 → 40 → 40HC → 45HC (없는 20HC 는 생기지 않는다)', seq(sa).join() === '20,40,40HC,45HC', seq(sa).join());

  //  ② 실 OBWH 2685E 양하 — 20·20HC·40HC·45HC 넷(40 없음). 20HC 는 20 바로 뒤
  const b = fx.OBWH_2685E_discharge, sb = sortedOf(b);
  const cb = count(b);
  ok('OBWH 2685E 양하 단계 대수 20:51 20HC:3 40HC:83 45HC:16', cb['20'] === 51 && cb['20HC'] === 3 && cb['40HC'] === 83 && cb['45HC'] === 16 && !cb['40'], JSON.stringify(cb));
  ok('OBWH 2685E 양하 순서 20 → 20HC → 40HC → 45HC (없는 40 은 건너뛴다)', seq(sb).join() === '20,20HC,40HC,45HC', seq(sb).join());
  ok('20HC 세 대의 규격은 2600·228E 류', sb.filter((c) => U.inspTierOf(c) === '20HC').every((c) => /^(2600|228E|2280)$/.test(String(c.iso).toUpperCase())), sb.filter((c) => U.inspTierOf(c) === '20HC').map((c) => c.iso).join());

  //  ③ 두 항차를 한 목록으로 — 다섯 단계가 모두 선다
  const u = [...a, ...b], su = sortedOf(u);
  ok('다섯 단계가 모두 있을 때 순서 20 → 20HC → 40 → 40HC → 45HC', seq(su).join() === TIERS.join(), seq(su).join());

  //  ④ 순번은 묶음(단계 × 풀·엠티·특수)마다 1부터, 경계는 단계가 바뀌면 두 줄(gb2) · 같은 단계 안 종류가 바뀌면 굵은 줄(gb1)
  const nums = U.inspNumber(su), edges = U.inspEdges(su);
  let numOk = true, edgeOk = true, firstEdgeOk = edges[0] === '', badAt = -1;
  for (let i = 1; i < su.length; i++) {
    const t0 = U.inspTierOf(su[i - 1]), t1 = U.inspTierOf(su[i]);
    const sameGroup = nums[i] === nums[i - 1] + 1;
    if (t0 !== t1) { if (nums[i] !== 1 || edges[i] !== 'gb2') { numOk = numOk && nums[i] === 1; edgeOk = edgeOk && edges[i] === 'gb2'; if (badAt < 0) badAt = i; } }
    else if (edges[i] === '' && !sameGroup) { numOk = false; if (badAt < 0) badAt = i; }
    else if (edges[i] === 'gb1' && nums[i] !== 1) { numOk = false; if (badAt < 0) badAt = i; }
    else if (edges[i] === 'gb2') { edgeOk = false; if (badAt < 0) badAt = i; }
  }
  ok('단계가 바뀌는 줄은 순번 1 · 두 줄 경계(gb2)', numOk && edgeOk, `i=${badAt}`);
  ok('목록 첫 줄은 경계 표식 없음', firstEdgeOk, edges[0]);
  const e2 = edges.filter((x) => x === 'gb2').length;
  ok(`두 줄 경계 수 = 단계 수 - 1 (${e2})`, e2 === TIERS.length - 1, e2);

  //  ⑤ 마감텔리 칸과 어긋나지 않는다 — 단계는 칸 하나로만 간다(20·20HC → 20 / 40 → 40 / 40HC → HC / 45HC → 45)
  let colBad = 0, colN = 0;
  for (const rows of Object.values(fx)) for (const c of rows) { colN += 1; if (COL_OF[U.inspTierOf(c)] !== U.tallySizeCol(c)) colBad += 1; }
  ok(`실자료 ${colN}대 전부 단계 → 마감텔리 칸이 tallySizeCol 과 같다`, colBad === 0, colBad);

  //  ⑥ 실 PCSZ 2622W 선적의 40(일반 40피트) 7대 — 20 과 40HC 사이
  const p = fx.PCSZ_2622W_loading, sp = sortedOf(p), cp = count(p);
  ok('PCSZ 2622W 선적 40 이 7대, 20HC·45HC 는 없다', cp['40'] === 7 && !cp['20HC'] && !cp['45HC'], JSON.stringify(cp));
  ok('PCSZ 2622W 선적 순서 20 → 40 → 40HC', seq(sp).join() === '20,40,40HC', seq(sp).join());

  //  ⑦ 인쇄 글자(buildInspectionListDoc) — 컨번호가 처음 나오는 차례(본문)가 단계 차례와 같고, 단계 경계(gb2)가 찍힌다
  const html = U.buildInspectionListDoc(b, 'discharge', {}, [], {}).html;
  const first = b.map((c) => ({ c, at: html.indexOf(c.cn) }));
  ok('양하 목록 컨번호가 전부 인쇄된다', first.every((x) => x.at >= 0), first.filter((x) => x.at < 0).slice(0, 3).map((x) => x.c.cn).join());
  const printed = first.filter((x) => x.at >= 0).sort((x, y) => x.at - y.at).map((x) => x.c);
  ok('인쇄 차례 20 → 20HC → 40HC → 45HC (20HC 세 대는 20 뒤 40HC 앞)', seq(printed).join() === '20,20HC,40HC,45HC', seq(printed).join());
  ok('단계가 바뀌는 줄에 두 줄 경계(gb2)가 찍힌다 (3곳 이상)', (html.match(/class="gb2"/g) || []).length >= 3, (html.match(/class="gb2"/g) || []).length);

  //  ⑧ 규칙 확인(글자 몇 개) — 실자료에 없는 25G1 같은 표기도 같은 판정
  const t = (iso, cn) => U.inspTierOf({ iso, cn: cn || 'TEST1234567', fe: 'F' });
  ok('규칙 확인 — 22G1 → 20 · 25G1·2510 → 20HC · 2600·2280·228E → 20HC · 42G1 → 40 · 45G1·4500 → 40HC · L5G1·9500 → 45HC', t('22G1') === '20' && t('25G1') === '20HC' && t('2510') === '20HC' && t('2600') === '20HC' && t('2280') === '20HC' && t('228E') === '20HC' && t('42G1') === '40' && t('45G1') === '40HC' && t('4500') === '40HC' && t('L5G1') === '45HC' && t('9500') === '45HC', [t('22G1'), t('25G1'), t('2600'), t('42G1'), t('45G1'), t('L5G1')].join());
  ok('규칙 확인 — 장금 SKHU6 번호는 EDI 가 22GP 여도 40HC (마감텔리 칸 한 벌)', t('22GP', 'SKHU6123456') === '40HC', t('22GP', 'SKHU6123456'));
  ok('규칙 확인 — 20피트 플랫랙(22PE)·오픈탑(22UT)은 20 단계 안 특수', t('22PE') === '20' && t('22UT') === '20', t('22PE') + ' ' + t('22UT'));

  //  ⑨ 장 나누기 20/40 — 20피트 장 = 20 + 20HC 단계(group<20), 40피트 장 = 40 + 40HC + 45HC. 두 항차를 합친 다섯 단계 목록으로 센다
  const D5 = U.buildInspectionListDoc(u, 'discharge', {}, [], {});
  const tagsOf = (h) => (String(h || '').match(/<span class="modetag">[^<]*<\/span>\s*<b>([^<]*)<\/b>/g) || []).map((x) => (x.match(/<b>([^<]*)<\/b>/) || [])[1]).filter((t, i, arr) => arr.indexOf(t) === i);   // 장이 여러 쪽이면 같은 머리줄이 쪽마다 나온다
  const n20 = (ca['20'] || 0) + (cb['20'] || 0) + (cb['20HC'] || 0), n40 = u.length - n20;
  ok(`장 나누기 20/40 — 머리줄 «20피트 ${n20}대» → «40피트 ${n40}대» (20HC 는 20피트 장, 40·40HC·45HC 는 40피트 장)`, D5.splits && tagsOf(D5.splits.size).join('|') === `20피트 ${n20}대|40피트 ${n40}대`, D5.splits ? tagsOf(D5.splits.size).join('|') : 'splits 없음');

  console.log(`\n4.86 검수 리스트 다섯 단계 연막검사 — ${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
