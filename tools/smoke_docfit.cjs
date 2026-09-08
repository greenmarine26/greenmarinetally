// 종이로 나가는 서류가 «조용히» 잘리지 않는가 — 3.29 (검수사 확답 «①행 수에 맞춰 글자를 줄여 한 장 유지»)
//   화면이 잘리면 검수사가 보고 알지만, 서류에서 사라진 줄은 보내는 쪽도 받는 쪽도 모른다.
//   그래서 네 자리를 여기서 잰다 — WORKING REPORT 한 장 · 탤리 엑셀 REMARKS·Time Sheet 창 · 검수 리스트 단 배분.
const fs = require('fs'), path = require('path');
const ROOT = process.argv[2] || path.resolve(__dirname, '..');
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ① WORKING REPORT — 행 수에서 행 높이·글자를 거꾸로 낸다
{
  const w = read('src/workingReport.js');
  ok(/const PAGE_MM = 297 - 16 - 8;/.test(w) && /const HEAD_MM = 78;/.test(w),
    '페이지·머리부 높이를 상수로 적어 둔다(감사 실측 77.9~81mm)');
  ok(/const rowPt = Math\.max\(MIN_ROW_PT, Math\.min\(11\.5,/.test(w), '행 높이를 행 수에서 낸다');
  ok(/const MIN_ROW_PT = 7\.7;/.test(w),
    '⛔ 글자 하한이 검수사 확정(본문 6pt)보다 작다 — «6pt 는 선내 조명에 장갑 낀 손으로 못 읽는다»');
  ok(/font-size: \$\{bodyPt\}pt/.test(w) && /height: \$\{rowPt\.toFixed\(2\)\}pt/.test(w), 'CSS 가 그 계산값을 쓴다');
  ok(/tooTall \?/.test(w), '하한까지 줄여도 안 들어가면 서류에 밝힌다(조용히 안 넘긴다)');
  //  계산 검산 — 실측 최대 조건과 실제 항차
  //  ⚠ 종전 검사는 `mm(n) <= BODY` 를 물었는데 그 식은 **항등식**이라 BODY 를 400 으로 바꿔도 통과했다(감사 지적).
  //    이제 **소스에서 값을 뽑아** «머리부 + 본문 ≤ 페이지» 를 직접 잰다.
  const PT = 25.4 / 72;
  const num = (re, d) => { const m = w.match(re); return m ? parseFloat(m[1]) : d; };
  const pm = w.match(/const PAGE_MM = (\d+) - (\d+) - (\d+);/);
  const PAGE = pm ? (+pm[1] - +pm[2] - +pm[3]) : 0;
  const HEAD = num(/const HEAD_MM = (\d+(?:\.\d+)?);/, 0);
  const SAFE = num(/const BODY_MM = PAGE_MM - HEAD_MM - (\d+(?:\.\d+)?);/, 0);
  const BODY = PAGE - HEAD - SAFE;
  const MINR = num(/const MIN_ROW_PT = ([0-9.]+);/, 0);
  ok(HEAD >= 77, `⛔ 머리부를 ${HEAD}mm 로 잡았다 — 실측 77.9~81mm 보다 낙관적이다`);
  ok(SAFE >= 5, `⛔ 안전 여유가 ${SAFE}mm — 식이 가용을 정확히 다 쓰므로 여유가 필요하다`);
  ok(MINR >= 7.7, `⛔ 행 높이 하한 ${MINR}pt — 본문 6pt(=7.7pt)보다 작으면 종이에서 못 읽는다`);
  const calc = (n) => Math.max(MINR, Math.min(11.5, (BODY / Math.max(1, n)) / PT));
  const total = (n) => HEAD + n * calc(n) * PT;                      // 머리부까지 더한 실제 높이
  ok(Math.abs(calc(20) - 11.5) < 0.01, `줄이 적으면 종전 크기 그대로 (${calc(20).toFixed(2)}pt)`);
  ok(total(47) <= PAGE, `⛔ 45행 양식이 한 장을 넘는다 (${total(47).toFixed(1)}mm / ${PAGE}mm)`);
  //  ⚠ 72행(SWBT 2614N 양하)은 **두 장**이 정답이다 — 6pt 하한을 지키면 한 장에 69행까지다.
  //    검수사 확답 «글자를 줄여 한 장 유지» 와 기존 확정 «6pt 는 못 읽는다 · 최소 크기가 넘어가면 2장» 을
  //    함께 지키면 그렇게 된다. 종전(45행 고정)에도 두 장이었으니 퇴행이 아니고, 이제는 **한 장에 69행까지 담고**
  //    남는 것만 둘째 장으로 가며 그 사실을 서류에 밝힌다.
  ok(total(69) <= PAGE, `⛔ 69행이 한 장을 넘는다 (${total(69).toFixed(1)}mm / ${PAGE}mm)`);
  ok(total(72) > PAGE && 72 * calc(72) * PT > BODY, `72행은 두 장이고 알림이 켜진다 (${calc(72).toFixed(2)}pt)`);
  //  하한에 닿는 지점부터는 «두 장» 이 정답이고, 그때 알림이 켜져야 한다.
  const cut = Math.floor(BODY / (MINR * PT));
  ok(cut >= 60 && cut <= 90, `하한에 닿는 지점이 ${cut}행 — 60~90행 사이여야 한다`);
  ok(total(cut) <= PAGE, `⛔ 하한 직전(${cut}행)이 이미 한 장을 넘는다 (${total(cut).toFixed(1)}mm)`);
  ok((cut + 1) * calc(cut + 1) * PT > BODY, `⛔ ${cut + 1}행에서 tooTall 이 안 켜진다`);
}

// ②③ 탤리 엑셀 — 고정 창에 넘친 줄이 사라지지 않는가
{
  const t = read('src/tallyExcel.js');
  ok(/const rCap = Math\.max\(1, cfg\.remarksEnd - cfg\.remarksRow\);/.test(t), 'REMARKS 창 크기를 잰다');
  ok(/rLines\.splice\(rCap - 1\)/.test(t) && /tail\.join\('  \/  '\)/.test(t),
    '⛔ REMARKS 가 창을 넘치면 마지막 칸에 이어 붙인다 — 한 줄도 안 사라진다');
  ok(/tRows\.splice\(tCap - 1\)/.test(t) && /Time Sheet 창/.test(t),
    '⛔ Time Sheet 가 창을 넘치면 마지막 칸에 이어 적는다 — 한 줄도 안 사라진다');
  //  ⚠ **Time Sheet 에 duplicateRow 를 쓰면 안 된다** — 템플릿 17개 전부 C:H 병합이 있고 15/17 은
  //    복제 대상 행 자체가 병합의 주인이다(감사 실측). ExcelJS 는 병합 등록부를 안 옮겨 양식이 어긋난다.
  //  주석에 적힌 «duplicateRow» 는 세지 않는다 — 왜 안 쓰는지 적어 둔 글이다.
  const codeOnly = t.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const tsBlock = codeOnly.slice(codeOnly.indexOf("M.sheets.timeSheet"), codeOnly.indexOf("M.sheets.timeSheet") + 1400);
  ok(!/duplicateRow/.test(tsBlock), '⛔ Time Sheet 에 duplicateRow 를 쓴다 — 그 시트는 템플릿 17개 전부 병합이 있어 양식이 부서진다');
  ok(!/remarksEnd[\s\S]{0,200}duplicateRow/.test(t), 'REMARKS 자리에도 duplicateRow 를 안 쓴다');
  ok(/wrapText: true/.test(t), '이어 붙인 칸은 줄바꿈을 허용한다(종이에서 안 잘리게)');
}

// ④ 검수 리스트 — 단을 «행 수»가 아니라 «차지하는 줄 수»로 채운다
{
  const il = read('src/inspectionList.js');
  ok(/const _noteWeight = /.test(il), '비고가 몇 줄을 먹는지 잰다');
  ok(/const packCols = /.test(il) && /const packPages = /.test(il), '단·페이지를 그 무게로 채운다');
  ok(!/for \(let i = 0; i < list\.length; i \+= PER_PAGE\)/.test(il), '150 고정 자르기가 남지 않았다');
  ok(!/function renderPage\(/.test(il), '옛 75/75 고정 자르기 함수가 남지 않았다');
  //  단위 시험 — 소스에서 함수를 꺼내 돌린다
  const src = il.slice(il.indexOf('const _noteWeight'), il.indexOf('const packPages'));
  const tail = il.slice(il.indexOf('const packPages'));
  const body = src + tail.slice(0, tail.indexOf('\n};') + 3) + '; return { _noteWeight, packCols, packPages };';
  const F = new Function('PER_COL', body.replace(/const PER_COL[^\n]*\n/, ''));
  const M = F(75);
  const row = (note) => `<tr><td>1</td><td>ABCU1234567</td><td>SEAL</td><td>20DC</td><td>F</td><td></td><td>${note}</td><td>SKR</td></tr>`;
  ok(M._noteWeight(row('')) === 1, '비고가 비면 한 줄');
  ok(M._noteWeight(row('RF -18C')) === 1, '짧은 비고도 한 줄');
  const longNote = 'FR L+120 W+80 H+150cm 12192×2438×2896mm 9/3480 PG2 <span>▲긴급</span> <span>◆시프팅</span>';
  const w = M._noteWeight(row(longNote));
  ok(w >= 3, `⛔ 긴 비고를 한 줄로 본다 (${w}줄로 나와야 한다)`);
  const cols = M.packCols(Array.from({ length: 40 }, () => row(longNote)), 75);
  ok(cols.length >= 2, `⛔ 긴 비고 40행이 한 단에 다 들어간다고 본다 (단 ${cols.length}개)`);
  ok(cols[0].length < 40, `⛔ 첫 단에 40행을 다 넣는다 (${cols[0].length}행)`);
  const plain = M.packCols(Array.from({ length: 75 }, () => row('')), 75);
  ok(plain.length === 1 && plain[0].length === 75, `비고가 짧으면 종전대로 75행 (${plain.length}단 · ${plain[0].length}행)`);
}

console.log(fail ? `\n✗ 서류 맞춤 연막검사 실패 ${fail}건` : '\n✓ 서류 맞춤 연막검사 통과');
process.exit(fail ? 1 : 0);
