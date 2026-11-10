// 4.87 연막검사 — 검수 리스트 «선사별» 장 나누기 · 쪽수 표시 · 실번호가 칸을 넘지 않는다. 실 DXQD 2644E 양하(DWS 234 + SKR 40)·TMPZ 2038E 양하(TJM 306 + EAS 49).
//   검수사 2026-11-10 15:26 «포트별 앞에 선사별을 넣어주시고 방식은 이어서 방식» · 15:43 «SKR만 우측에 따로 놓고 좌측하단을 채우겠습니다» ·
//   19:39 «첫장 … 두번째장 3단중 1째단은 앞장과 같이 … 2번째단은 적으면 적은대로 하고 3단은 다른선사이므로 그대로» · 20:01 «쓸만 합니다» ·
//   20:03 «그냥 날짜로 보였습니다»(쪽수) · 20:07 «컨번호 , 실번호가 짤리는 일은 없어야 합니다» · 20:08 «12자리 13자리 지금은 짤릴듯합니다».
//   ① 단추 순서 ② 선사 순서·대수·쪽 머리 ③ 단은 위에서부터 가득(그 선사의 마지막 단만 짧다) ④ 선사마다 순번 다시 ⑤ 선사 하나면 단추 해당 없음
//   ⑥ 쪽수 «k / n 쪽» ⑦ 실번호 글자 단계는 실제 폭으로 ⑧ 크로뮴 A4 폭 실측 — 컨번호·실번호 넘침 0 · 쪽 높이 A4 안.
//   실행 — node tools/smoke_insp487.cjs [저장소 루트]. 크로뮴을 못 띄우면 건너뜀이 아니라 실패다.
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
const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
(async () => {
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx487_'));
  const out = path.join(TMP, 'u.cjs');
  execSync(`npx esbuild "${path.join(ROOT, 'tools/smoke_insp487_entry.js')}" --bundle --platform=node --format=cjs --outfile="${out}" --loader:.js=jsx --jsx=automatic --log-level=error --alias:firebase/app=./tools/stub_fbdb_mem.js --alias:firebase/database=./tools/stub_fbdb_mem.js --alias:firebase/storage=./tools/stub_fbdb_mem.js`, { cwd: ROOT, stdio: 'pipe' });
  const U = require(out);
  const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/insp487.json'), 'utf8'));
  const cp = (rows) => rows.map((c) => ({ ...c }));
  const docOf = (key, rows) => U.buildInspectionListDoc(cp(rows || fx[key + '_discharge']), 'discharge', fx[key + '_info'], [], { appendix: false });
  //  선사별 판의 쪽 → 단 → 줄을 글자로 읽는다
  const pagesOf = (html) => String(html).split('<div class="ipage"').slice(1).map((pg) => {
    const cols = pg.split('<table class="ilist">').slice(1).map((t) => {
      const body = (/<tbody>([\s\S]*?)<\/tbody>/.exec(t) || ['', ''])[1];
      return (body.match(/<tr[\s\S]*?<\/tr>/g) || []).map((tr) => ({
        bar: /class="carbar/.test(tr), cont: /class="carbar cont"/.test(tr),
        txt: tr.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        no: (/<td[^>]*>\s*(\d+)\s*<\/td>/.exec(tr) || [])[1] || '',
      }));
    }).filter((c) => c.length);
    return { cols, hdr: ((/<div class="phdr-c">([\s\S]*?)<\/div>/.exec(pg) || ['', ''])[1]).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(), right: (/<div class="phdr-r">([\s\S]*?)<\/div>/.exec(pg) || ['', ''])[1] };
  });

  const D = docOf('DXQD_2644E'), T = docOf('TMPZ_2038E');
  ok('① 장 나누기 단추 순서 — 이어서 · 20/40 · 풀/엠티 · 선사별 · 포트별', Object.keys(D.splits).join(',') === 'cont,size,fe,carrier,port', Object.keys(D.splits).join(','));
  const dp = pagesOf(D.splits.carrier), tp = pagesOf(T.splits.carrier);
  const shape = (pp) => pp.map((p) => p.cols.map((c) => c.length).join('·')).join(' / ');
  ok('② DXQD 2644E 양하 274대 — 두 쪽 · 쪽 머리 «DWS 234대» · «DWS 234대 · SKR 40대»', dp.length === 2 && /DWS 234대$/.test(dp[0].hdr) && /DWS 234대 · SKR 40대$/.test(dp[1].hdr), dp.map((p) => p.hdr).join(' | '));
  ok('③ DXQD — 첫 장 세 단과 둘째 장 첫 단이 같은 50줄로 가득, 둘째 단은 남는 39줄, 셋째 단은 SKR 41줄(막대 포함)', shape(dp) === '50·50·50 / 50·39·41', shape(dp));
  ok('③ TMPZ 2038E 양하 355대 — 63·63·63 / 63·59·50 · 쪽 머리 «TJM 306대 · EAS 49대»', shape(tp) === '63·63·63 / 63·59·50' && /TJM 306대 · EAS 49대$/.test(tp[1].hdr), shape(tp) + ' | ' + tp.map((p) => p.hdr).join(' | '));
  const firstOf = (pp, pi, ci) => pp[pi].cols[ci][0], secondOf = (pp, pi, ci) => pp[pi].cols[ci][1];
  ok('선사가 시작하는 단 맨 위는 선사 막대(이름·대수), 이어지는 단은 «· 계속» 막대', firstOf(dp, 0, 0).bar && !firstOf(dp, 0, 0).cont && /DWS\s+234대/.test(firstOf(dp, 0, 0).txt)
    && [firstOf(dp, 0, 1), firstOf(dp, 0, 2), firstOf(dp, 1, 0), firstOf(dp, 1, 1)].every((r) => r.cont && /DWS · 계속/.test(r.txt))
    && firstOf(dp, 1, 2).bar && !firstOf(dp, 1, 2).cont && /SKR\s+40대/.test(firstOf(dp, 1, 2).txt), [firstOf(dp, 0, 0).txt, firstOf(dp, 1, 0).txt, firstOf(dp, 1, 2).txt].join(' | '));
  ok('④ 순번은 선사마다 1부터 다시 — SKR 첫 줄 1번 · EAS 첫 줄 1번', secondOf(dp, 1, 2).no === '1' && secondOf(tp, 1, 2).no === '1', secondOf(dp, 1, 2).txt + ' | ' + secondOf(tp, 1, 2).txt);
  ok('대수 많은 선사가 먼저 — DWS(234) → SKR(40) · TJM(306) → EAS(49)', /DWS/.test(firstOf(dp, 0, 0).txt) && /TJM/.test(firstOf(tp, 0, 0).txt));
  const rowsAll = (pp) => pp.reduce((a, p) => a + p.cols.reduce((b, c) => b + c.filter((r) => !r.bar).length, 0), 0);
  ok('한 대도 빠지거나 겹치지 않는다 — DXQD 274줄 · TMPZ 355줄', rowsAll(dp) === 274 && rowsAll(tp) === 355, rowsAll(dp) + ' ' + rowsAll(tp));
  ok('이어서 판에는 선사 막대가 없다(다른 모드는 그대로)', !/carbar/.test(String(D.splits.cont).split('<style')[0].replace(/<style[\s\S]*?<\/style>/g, '')) || !/<tr class="carbar/.test(D.splits.cont));
  //  작은 선사가 여럿인 배(실 TMPZ 2030W 선적 274대 — 선사 26곳)는 작은 선사끼리 한 단에 이어 붙어 종이가 흩어지지 않는다
  const fxS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/ilist_split_36200.json'), 'utf8')).tmpz;
  const barsOf = (pp) => pp.flatMap((p) => p.cols.flatMap((c) => c.filter((r) => r.bar && !r.cont).map((r) => r.txt)));
  //  ⓐ 실자료 그대로 — 선사 칸이 빈 240대는 컨번호 앞 세 글자(PHR·WFH…)로 갈리지 않고 «선사 미상» 한 덩어리로 맨 뒤(검수사 2026-11-10 20:36 «작은 선사가 스무 곳 넘게 있는 배?»)
  const up = pagesOf(U.buildInspectionListDoc(cp(fxS.list), 'loading', fxS.info, [], { appendix: false }).splits.carrier), ub = barsOf(up);
  ok('선사 칸이 빈 컨은 컨번호 앞 글자로 선사를 지어내지 않는다 — EAS 34대 → 선사 미상 240대(맨 뒤) · 274줄', ub.length === 2 && /^EAS\s+34대$/.test(ub[0]) && /^선사 미상\s+240대$/.test(ub[1]) && rowsAll(up) === 274, ub.join(' | '));
  //  ⓑ 선사가 실제로 여럿이고 작을 때(시험용으로 선사 칸을 채운 사본) — 작은 선사끼리 한 단에 이어 붙어 종이가 흩어지지 않는다
  const mp = pagesOf(U.buildInspectionListDoc(cp(fxS.list).map((c) => (c.op ? c : { ...c, op: String(c.cn).slice(0, 3) })), 'loading', fxS.info, [], { appendix: false }).splits.carrier);
  const mBars = barsOf(mp).length, mCols = mp.reduce((a, p) => a + p.cols.length, 0);
  ok(`작은 선사 여럿(시험 사본) — 선사 ${mBars}곳이 ${mCols}단 ${mp.length}쪽 · 274줄 그대로`, mBars > 10 && mCols < mBars && mp.length <= 3 && rowsAll(mp) === 274, `${mBars}곳 ${mCols}단 ${mp.length}쪽 ${rowsAll(mp)}줄`);
  //  ⓒ 선사가 많은 배(검수사 2026-11-10 20:39 «선사가 많은 선박은 XTPG입니다») — 실 XTPG 548E 선적 157대·양하 118대, 선사 10곳. 이어서 판처럼 한 장이고 쪽 머리줄은 한 줄(«외 N곳»)
  const xdoc = (mode) => U.buildInspectionListDoc(cp(fx['XTPG_548E_' + mode]), mode, fx.XTPG_548E_info, [], { appendix: false });
  const XL = xdoc('loading'), XD = xdoc('discharge'), xl = pagesOf(XL.splits.carrier), xd = pagesOf(XD.splits.carrier);
  //    검수사 20:44 «많은곳 3곳을 1 2 3 윗쪽에 놓고 적은 선사들로 비율을 맞출듯합니다» — 큰 선사 셋이 세 단 머리, 나머지는 짧은 단 아래로(세 단 높이 차가 작다)
  const headOf = (pp) => pp[0].cols.map((c) => c[0].txt.replace(/\s+/g, ' ')).join(' | ');
  const spread = (pp) => { const L = pp[0].cols.map((c) => c.length); return Math.max(...L) - Math.min(...L); };
  ok('XTPG 548E 선적 157대 — 선사 10곳 한 장 · 세 단 머리 CKL 49 · EAS 36 · SKR 20 · 단 높이 55·58·54 · 쪽 머리 «CKL 49대 · EAS 36대 외 8곳»', xl.length === 1 && shape(xl) === '55·58·54' && headOf(xl) === 'CKL 49대 | EAS 36대 | SKR 20대' && barsOf(xl).length === 10 && /CKL 49대 · EAS 36대 외 8곳$/.test(xl[0].hdr) && rowsAll(xl) === 157 && spread(xl) <= 6, shape(xl) + ' | ' + headOf(xl) + ' | ' + xl[0].hdr);
  ok('XTPG 548E 양하 118대 — 선사 10곳 한 장 · 세 단 머리 CKL 47 · SIF 33 · SKR 12 · 단 높이 48·40·40', xd.length === 1 && shape(xd) === '48·40·40' && headOf(xd) === 'CKL 47대 | SIF 33대 | SKR 12대' && barsOf(xd).length === 10 && rowsAll(xd) === 118, shape(xd) + ' | ' + headOf(xd));
  ok('한 단을 넘는 선사가 있으면 차례대로 채우기 그대로(DXQD·TMPZ 는 위 ③ 과 같다) · 선사 둘이 다 한 단 안이면 단 하나씩', (() => { const two = pagesOf(U.buildInspectionListDoc(cp(fx.XTPG_548E_loading).filter((c) => c.op === 'SKR' || c.op === 'DYS'), 'loading', fx.XTPG_548E_info, [], { appendix: false }).splits.carrier); return two.length === 1 && two[0].cols.length === 2 && /^SKR/.test(two[0].cols[0][0].txt) && /^DYS/.test(two[0].cols[1][0].txt); })());
  //  반 단을 넘는 선사는 앞 단에 자리가 남아도 새 단에서 시작한다(독립 감사 — 이 규칙을 지키는 시험이 없었다). DWS 210대(다섯째 단에 15줄쯤 남음) 뒤 SKR 30대(31줄 — 반 단 초과)
  const mix = pagesOf(U.buildInspectionListDoc(cp(fx.DXQD_2644E_discharge.filter((c) => c.op === 'DWS').slice(0, 210).concat(fx.DXQD_2644E_discharge.filter((c) => c.op === 'SKR').slice(0, 30))), 'discharge', fx.DXQD_2644E_info, [], { appendix: false }).splits.carrier);
  const mixLast = mix[mix.length - 1].cols;
  ok('반 단을 넘는 선사(SKR 30대)는 앞 선사의 남은 자리(다섯째 단)에 붙지 않고 새 단 맨 위', mix.length === 2 && mixLast.length === 3 && mixLast[1].length + 31 <= 50 && /^SKR\s+30대$/.test(mixLast[2][0].txt), shape(mix) + ' | ' + mixLast.map((c) => c[0].txt).join(' | '));
  //  선사 셋 — 쪽 머리줄은 두 곳 + «외 1곳» 한 줄(2차 독립 감사 — 셋을 다 적으면 글자 폭에 따라 두 줄로 접혀 종이를 넘었다)
  const xr = fx.XTPG_548E_loading, tri = cp(xr.filter((c) => c.op === 'CKL').concat(xr.filter((c) => c.op === 'EAS'), xr.filter((c) => c.op === 'SKR')));
  const tp3 = pagesOf(U.buildInspectionListDoc(tri, 'loading', fx.XTPG_548E_info, [], { appendix: false }).splits.carrier);
  ok('선사 셋 — 쪽 머리 «CKL 49대 · EAS 36대 외 1곳» · 세 단 머리에 하나씩', tp3.length === 1 && /CKL 49대 · EAS 36대 외 1곳$/.test(tp3[0].hdr) && tp3[0].cols.length === 3 && tp3[0].cols.every((c) => c[0].bar && !c[0].cont), tp3[0].hdr + ' | ' + shape(tp3));
  //  쪽 수가 같으면 세 단 높이를 맞춘 배치를 고른다 — 작은 선사 둘 + 한 단을 살짝 넘는 선사(51줄)가 37·50·2 가 아니라 단 머리 셋으로
  const tie = cp(xr.filter((c) => c.op === 'SKR').slice(0, 20).concat(xr.filter((c) => c.op === 'DYS').slice(0, 15), xr.filter((c) => c.op === 'CKL').concat(xr.filter((c) => c.op === 'SIT').slice(0, 1)).map((c) => ({ ...c, op: 'CKL' }))));
  const tpT = pagesOf(U.buildInspectionListDoc(tie, 'loading', fx.XTPG_548E_info, [], { appendix: false }).splits.carrier);
  ok('쪽 수가 같으면 두세 줄짜리 단을 남기지 않는다 — 세 단 모두 선사 막대로 시작', tpT.length === 1 && tpT[0].cols.length === 3 && tpT[0].cols.every((c) => c[0].bar && !c[0].cont) && Math.min(...tpT[0].cols.map((c) => c.length)) >= 10, shape(tpT));
  const one = docOf('DXQD_2644E', fx.DXQD_2644E_discharge.filter((c) => c.op === 'DWS'));
  ok('⑤ 선사가 하나뿐이면 선사별 단추는 해당 없음', one.splits && one.splits.carrier === null);
  ok('⑥ 쪽수는 날짜와 떼어 «k / n 쪽» — 모든 쪽', dp.concat(tp).every((p, i) => /<b class="ppage">\d+ \/ \d+ 쪽<\/b>/.test(p.right)) && /<b class="ppage">2 \/ 2 쪽<\/b>/.test(dp[1].right) && /\.phdr-r \.ppage \{ color: #000;/.test(D.html), dp[1].right);

  //  ⑦ 실번호 글자 단계 — 지금 맞게 나가는 실번호는 그대로, 넓은 글자가 많아 6pt 한 줄에 안 들어가면 두 줄
  const cls = (s) => U._sealCls(s).trim();
  ok('⑦ 실물 실번호의 단계는 종전 그대로 — 8자 보통 · 10자 s1 · 12~13자 s2 · 15자 s3', cls('02273921') === '' && cls('DWS2538521') === 's1' && cls('DWS253852112') === 's2' && cls('NOLS83877212') === 's2' && cls('SINOKOR011526') === 's2' && cls('SINOKOR01152612') === 's3',
    ['02273921', 'DWS2538521', 'DWS253852112', 'NOLS83877212', 'SINOKOR011526', 'SINOKOR01152612'].map((s) => s + '→' + (cls(s) || '보통')).join(' '));
  ok('⑦ 넓은 글자가 많은 12~13자는 6pt 한 줄에 안 들어가므로 두 줄(s3)', cls('WWWW88888888') === 's3' && cls('MMMM00000000W') === 's3' && cls('W8W8W8W8W8W8W') === 's3');
  ok('⑦ 넓은 글자 9~10자는 한 단계 더 줄인다(칸 59px 안)', ['WWWWWWWWW', 'MWMWMWMW12'].every((s) => { const c = cls(s); const st = { '': [12, -0.2], s1: [10, -0.4], s2: [8, -0.4] }[c]; return c === 's3' || U._sealWidthPx(s, st[0], st[1]) <= 59; }));

  //  ⑨ 알파벳만 빠진 실은 같은 실(검수사 2026-11-10 20:24 «알파벳이 없으면 실오류 판정을 안합니다. 다만 알파벳이 틀리면 실오류 입니다. 앞자리 01234567인데 1234567이면 실오류 입니다.»)
  ok('⑨ 같은 실 판정 — ES02273964 ↔ 02273964 같음 · 01234567 ↔ 1234567 다름 · ES… ↔ EA… 다름 · ES01234567 ↔ 1234567 다름', U.sealSameLoose('ES02273964', '02273964') && U.sealSameLoose('02273964', 'es02273964')
    && !U.sealSameLoose('01234567', '1234567') && !U.sealSameLoose('ES02273964', 'EA02273964') && !U.sealSameLoose('ES01234567', '1234567') && !U.sealSameLoose('ES02273964', '02273965') && !U.sealSameLoose('', '02273964'));
  const sr = fx.TMPZ_2038E_sealrecs, srRows = Object.entries(sr).map(([cn, r]) => ({ cn, ...r, _mode: 'discharge' }));
  const had = srRows.filter((r) => Array.isArray(r.sl_conflict) && r.sl_conflict.length > 1);
  ok('⑨ 실 TMPZ 2038E 양하 — 선사 «ES…» · 세관 숫자뿐인 EAS 17대는 «다른 자료 실» 이 한 줄만 남는다(카드 «실번호 불일치» 꺼짐)', had.length === 17 && had.every((r) => { const v = [...new Set(U.sealConflictOf(r).map((h) => String(h.sl).toUpperCase()))]; return v.length === 1 && /^ES\d+$/.test(v[0]); }), String(had.length));
  const si9 = U.sealIssuesOf(srRows), ans9 = U.generateSealAuditAnswer(srRows, '양하');
  ok('⑨ 미르 실번호 점검도 같은 답 — 의심 0 · 실오류 0 · «모두 이상 없음»', si9.confs.length === 0 && si9.errs.length === 0 && /모두 이상 없음/.test(ans9) && !/모양이 다른 컨/.test(ans9), ans9);
  const diffA = { cn: 'TEST1234561', _mode: 'discharge', sl: '02273964', sl_src: 'Excel_20261110123652.xls', sl_conflict: [{ sl: 'EA02273964', src: 'list.xlsx' }, { sl: 'ES02273964', src: 'Excel_20261110123652.xls' }] };
  const diffZ = { cn: 'TEST1234562', _mode: 'discharge', sl: '1234567', sl_src: 'Excel_20261110123652.xls', sl_conflict: [{ sl: '01234567', src: 'list.xlsx' }, { sl: '1234567', src: 'Excel_20261110123652.xls' }] };
  ok('⑨ 알파벳이 다르면(ES ↔ EA) 그대로 다른 실로 남는다', new Set(U.sealConflictOf(diffA).map((h) => h.sl)).size === 2 && U.sealIssuesOf([diffA]).confs.length === 1);
  const three = { cn: 'TEST1234563', _mode: 'discharge', sl: '02273964', sl_src: 'Excel_20261110123652.xls', sl_conflict: [{ sl: 'ES02273964', src: 'list.xlsx' }, { sl: '02273964', src: 'Excel_20261110123652.xls' }, { sl: 'EA02273964', src: 'list2.xlsx' }] };
  const si3 = U.sealIssuesOf([three]);
  ok('⑨ 세 값(세관 숫자뿐 · 선사 ES… · 다른 선사 EA…) — 세관 근거가 남아 «세관리스트와 다름» 의심으로 나온다(«세관리스트 도착 시 판정» 이 아니다)', si3.hasCustoms === true && si3.confs.length === 1 && si3.confs[0].grade === 'suspect', JSON.stringify(si3.confs));
  ok('⑨ 세관 신고가 앞자리 0 이 빠졌으면(01234567 ↔ 1234567) 실오류', U.sealCheckOf(diffZ).error === true && U.sealIssuesOf([diffZ]).errs.length === 1, JSON.stringify(U.sealIssuesOf([diffZ])));
  const many = Array.from({ length: 6 }, (_, i) => ({ cn: `TEST123457${i}`, _mode: 'discharge', _source: 'a.xlsx', sl: `1064540${i}`, sl_src: 'a.xlsx', sl_conflict: [{ sl: `1064540${i}`, src: 'a.xlsx' }, { sl: `PH052271${i}`, src: 'Excel_20261024122429.xls' }] }));
  const ansM = U.generateSealAuditAnswer(many, '양하');
  ok('⑨ 미르가 «N대» 라고 말하면 그 컨 끝 4자리를 전부 적는다(«등» 없음)', /모양이 다른 컨 6대\(4570·4571·4572·4573·4574·4575\)/.test(ansM) && !/ 등\)/.test(ansM), ansM);

  //  ⑧ 크로뮴 실측 — 넓은 실번호 여섯 개를 DXQD 사본에 심고 이어서·선사별 두 판을 A4 폭으로 잰다
  let pw;
  try { pw = require('playwright'); } catch (e) { ok('playwright 가 있다(없으면 모양을 못 잰다 — 올리지 않는다)', false); }
  if (pw && !CHROME) ok('크로뮴이 있다(없으면 모양을 못 잰다 — 올리지 않는다)', false);
  if (pw && CHROME) {
    const WIDE = ['WWWW88888888', 'MMMM00000000W', 'W8W8W8W8W8W8W', 'WWWWWWWWW', 'MWMWMWMW12', 'SINOKOR011526'];
    const rows = cp(fx.DXQD_2644E_discharge); WIDE.forEach((s, i) => { rows[i * 40].sl = s; rows[i * 40].sl_orig = s; });
    const b = await pw.chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
    const A4_PX = Math.round((210 - 7 - 7) / 25.4 * 96);
    for (const [name, doc] of [['DXQD(넓은 실번호 심음)', docOf('DXQD_2644E', rows)], ['TMPZ', T], ['XTPG 선적', XL], ['XTPG 양하', XD], ['선사 24곳(시험 사본)', U.buildInspectionListDoc(cp(fxS.list).map((c) => (c.op ? c : { ...c, op: String(c.cn).slice(0, 3) })), 'loading', fxS.info, [], { appendix: false })]]) {
      for (const how of ['cont', 'carrier']) {
        const pg = await b.newPage({ viewport: { width: A4_PX, height: 1200 } });
        await pg.setContent(doc.html, { waitUntil: 'load' });
        await pg.emulateMedia({ media: 'print' });
        await pg.evaluate((h) => { document.getElementById('sheet1').innerHTML = h; }, doc.splits[how]);
        const m = await pg.evaluate(() => {
          const o = { cn: 0, sl: 0, worst: '', rows: 0, pageMm: [] };
          document.querySelectorAll('table.ilist tbody tr:not(.carbar)').forEach((tr) => {
            o.rows += 1;
            [[1, 'cn'], [2, 'sl']].forEach(([i, k]) => {
              const td = tr.children[i]; if (!td) return;
              const rg = document.createRange(); rg.selectNodeContents(td);
              let w = 0; for (const r of rg.getClientRects()) w = Math.max(w, r.width);
              if (td.scrollWidth > td.clientWidth + 0.5 || w > td.clientWidth + 0.5) { o[k] += 1; if (!o.worst) o.worst = td.textContent.trim() + ' ' + w.toFixed(1) + '>' + td.clientWidth; }
            });
          });
          document.querySelectorAll('.ipage').forEach((p) => o.pageMm.push(+(p.getBoundingClientRect().height * 25.4 / 96).toFixed(1)));
          return o;
        });
        ok(`⑧ ${name} · ${how === 'cont' ? '이어서' : '선사별'} — 컨번호·실번호 넘침 0 (${m.rows}줄) · 쪽 높이 ${m.pageMm.join('·')}mm ≤ 289`, m.cn === 0 && m.sl === 0 && m.rows > 0 && m.pageMm.every((h) => h <= 289), `컨 ${m.cn} 실 ${m.sl} ${m.worst}`);
        await pg.close();
      }
    }
    await b.close();
  }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 폴더 */ }
  console.log(`\n4.87 검수 리스트 선사별·쪽수·실번호 폭 연막검사 — ${n - bad}/${n}${bad ? ' ✘' : ' ✔'}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('⛔ 연막검사 자체 오류', e); process.exit(1); });
