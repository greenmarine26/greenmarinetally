// X-RAY 세관봉인 연막검사 (3.45) — 실소스에 실데이터를 물려 **그려진 표**를 잰다.
//   검수사 2026-09-14 «xray 실번호가 입력되면 검수리스트에 기입해주고 그대상컨테이너 줄을 노란색으로 색칠해 주세요».
//   확정 — 비고 칸 ★XRAY 옆에 · X-RAY 대상 줄 전부 · 노랑이 기존 색을 이긴다.
//   추가 — «DG와 중복이 될경우 동적 축소로 둘다 표기» · «F/E로 한칸» · «규격은 세관리스트껄로».
//   ⚠ 초판 19항은 절반이 **소스 문자열 grep** 이라, 머리칸 8 · 몸칸 7 로 표가 통째로 어긋난 채 전부 통과했다.
//     그래서 이 판은 grep 을 걷어내고 ①머리칸과 몸칸을 맞대고 ②규격 폴백을 실데이터로 그리고
//     ③CSV 를 실제로 돌려 종이와 대조한다.
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
global.window = { addEventListener() {}, open: () => null };
global.document = { createElement: () => ({ style: {} }), addEventListener() {} };
const M = require(path.resolve(OUT));
const fx = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/' + n), 'utf8'));
const FX = fx('xrayseal_pcsz.json');

const YELLOW = '#ffe066';
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => {
  n += 1;
  if (cond) console.log(`  ✔ ${name}`);
  else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); }
};

//  PrintHubModal 이 만드는 행 모양 그대로(평택 양하분 + _xray/_xraySealNo). _xrayIso 는 3.60-15 부터 PrintHubModal 이 안 싣는다 —
//    검수리스트가 그 글자를 무시하는지 보려고 일부러 넣는다.
const build = (withSeal, xIso, cIso) => Object.entries(FX.edi).map(([k, e]) => {
  const cn = String((e && e.cn) || k).toUpperCase();
  const r = Object.assign({}, e, { cn });
  if (FX.xrayList[cn]) {
    r._xray = true;
    if (withSeal) r._xraySealNo = String((FX.xraySeals[cn] || {}).seal || '').trim();
    if (xIso) r._xrayIso = xIso;
    if (cIso) r.iso_customs = cIso;   // 3.60-15: 세관 적하목록 원문(parseCustomsSheet 가 records 에 남긴다)
  }
  return r;
}).filter((r) => String(r.pod || '').toUpperCase().startsWith('KRPT'));

//  그려진 표를 칸 단위로 되읽는다 — «무엇이 어느 칸에 찍혔는가» 가 이 검사의 전부다
const COLS = ['no', 'cn', 'sl', 'spec', 'fe', 'memo'];   // 3.60: 선사 칸 없음(검수사 2026-09-24 «선사를 없애고»)
//  HTML 엔티티를 되돌린다 — 이스케이프는 옳은 동작이고, 검사는 «글자가 살아남았는가» 를 본다
const _dec = (v) => String(v || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const parse = (html) => {
  const heads = [...html.matchAll(/<thead><tr>([\s\S]*?)<\/tr><\/thead>/g)]
    .map((m) => (m[1].match(/<th[^>]*>([\s\S]*?)<\/th>/g) || []).map((t) => t.replace(/<[^>]*>/g, '').trim()));
  const rows = {};
  const re = /<tr style="background:([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = re.exec(html))) {
    const tds = (m[2].match(/<td[^>]*>([\s\S]*?)<\/td>/g) || []);
    const cell = tds.map((t) => t.replace(/<[^>]*>/g, '').trim());
    const cnm = m[2].match(/[A-Z]{4}\d{7}/);
    if (cnm) {
      const o = { bg: m[1].trim(), body: m[2], nTd: tds.length, raw: tds };
      COLS.forEach((c, i) => { o[c] = cell[i]; });
      o.memo = _dec(o.memo);
      if (!rows[cnm[0]]) rows[cnm[0]] = o;          // 시트1 이 먼저다
      (rows._all = rows._all || []).push(o);
    }
  }
  return { heads, rows };
};

const info = { vsl: 'PCSZ', vslFull: 'PACIFIC SHENZHEN', voy: '2620E' };
const rows = build(true);
const targets = Object.keys(FX.xrayList);
const html = M.generateInspectionListHTML(rows, 'discharge', info, []);
const { heads, rows: seen } = parse(html);

console.log('\n── X-RAY 표기와 색');
ok('실데이터 — 평택 양하 608대 · X-RAY 12대', rows.length === 608 && targets.length === 12, `${rows.length}/${targets.length}`);
const yellow = targets.filter((cn) => seen[cn] && seen[cn].bg === YELLOW);
ok(`X-RAY 대상 ${targets.length}대가 전부 노랗다`, yellow.length === targets.length, `${yellow.length}대`);
const withNo = targets.filter((cn) => {
  const seal = (FX.xraySeals[cn] || {}).seal;
  return seal && seen[cn] && seen[cn].memo.includes(`★XRAY ${seal}`);
});
ok('**비고 칸**에 ★XRAY 옆으로 세관봉인 번호가 붙는다', withNo.length === targets.length,
   `${withNo.length}대 · 예 ${targets[0]}→${(FX.xraySeals[targets[0]] || {}).seal}`);
const others = Object.keys(seen).filter((cn) => cn !== '_all' && !FX.xrayList[cn]);
ok(`X-RAY 아닌 ${others.length}대에 노랑이 안 샌다`, others.filter((cn) => seen[cn].bg === YELLOW).length === 0);
const noSeal = parse(M.generateInspectionListHTML(build(false), 'discharge', info, [])).rows;
const t0 = targets[0];
ok('세관봉인이 아직 없으면 ★XRAY 만 적는다', !!noSeal[t0] && noSeal[t0].memo === '★XRAY');
ok('번호가 없어도 줄은 노랗다(대상이라는 사실은 그대로)', !!noSeal[t0] && noSeal[t0].bg === YELLOW);

console.log('\n── 표가 어긋나지 않는가 (초판이 여기서 깨졌다)');
ok(`머리칸이 ${COLS.length}개다 — F/E 가 한 칸`, heads.length > 0 && heads.every((h) => h.length === COLS.length),
   heads[0] ? `${heads[0].length}칸 ${JSON.stringify(heads[0])}` : '머리 없음');
const anyRow = seen[Object.keys(seen)[0]];
ok('머리칸 수 == 몸칸 수 — 값이 남의 칸 밑에 찍히지 않는다', !!anyRow && heads.every((h) => h.length === anyRow.nTd),
   anyRow ? `머리 ${heads[0] && heads[0].length} vs 몸 ${anyRow.nTd}` : '');
ok('머리 이름과 내용이 맞는다(F/E 칸엔 F·E · 비고 칸엔 비고)',
   !!heads[0] && heads[0][4] === 'F/E' && heads[0][5] === '비고' && heads[0].length === 6);
const cg = (html.match(/<colgroup>([\s\S]*?)<\/colgroup>/) || [])[1] || '';
const widths = [...cg.matchAll(/width:(\d+)%/g)].map((m) => +m[1]);
ok(`colgroup 이 ${COLS.length}칸이고 폭 합이 100% 다`, widths.length === COLS.length && widths.reduce((a, b) => a + b, 0) === 100,
   `${widths.length}칸 · 합 ${widths.reduce((a, b) => a + b, 0)}%`);
ok('table-layout: fixed — 그래야 colgroup 폭이 실제로 먹는다', /table\.ilist \{[^}]*table-layout: fixed/.test(html));

console.log('\n── 규격은 세관 리스트 표기 (검수사 «규격은 세관리스트껄로»)');
const specOf = (cn, h) => (parse(h).rows[cn] || {}).spec;
ok('EDI 가 이미 그룹꼴이면 그대로(45GP·22GP)',
   Object.keys(seen).filter((cn) => cn !== '_all').every((cn) => {
     const iso = String((FX.edi[cn] || {}).iso || '').toUpperCase().trim();
     return !/^(45GP|22GP|42GP|22TN)$/.test(iso) || seen[cn].spec === iso;
   }));
const hc = (seen._all || []).filter((r) => r.spec === '45GP').length;
const dc = (seen._all || []).filter((r) => r.spec === '42GP').length;
ok('하이큐빅(45GP)과 일반(42GP)이 갈린다 — 종전엔 둘 다 «40»', hc > 0 && dc > 0, `45GP ${hc}대 · 42GP ${dc}대`);
//  ★ 3.60-15 — 검수리스트 규격은 **세관 적하목록 원문**(iso_customs)이 이긴다. XRAY 목록 글자(_xrayIso)는 검수리스트에 쓰지 않는다
//    (검수사 2026-09-25 «XRAY표기는 그대로 표기합니다. 검수리스트와 별개로» · «검수리스트와 XRAY 리스트는 다를수 있다는것입니다»).
const withCust = parse(M.generateInspectionListHTML(build(true, '', '22TN'), 'discharge', info, [])).rows;
ok('세관 적하목록 원문(iso_customs)이 EDI 를 이긴다', targets.every((cn) => withCust[cn] && withCust[cn].spec === '22TN'),
   targets.map((cn) => withCust[cn] && withCust[cn].spec).join(','));
const withX = parse(M.generateInspectionListHTML(build(true, '22TN'), 'discharge', info, [])).rows;
ok('XRAY 목록 글자(_xrayIso)는 검수리스트 규격 칸을 바꾸지 않는다', targets.every((cn) => withX[cn] && seen[cn] && withX[cn].spec === seen[cn].spec && withX[cn].spec !== '22TN'),
   targets.map((cn) => withX[cn] && withX[cn].spec).join(','));
//  폴백 — ATPR 실데이터의 내부 공컨 마커가 종이로 새면 안 된다
const AT = fx('podpat_atpr.json');
const atRows = Object.entries(AT.edi).map(([k, e]) => Object.assign({}, e, { cn: String(e.cn || k).toUpperCase() }));
const atSeen = parse(M.generateInspectionListHTML(atRows, 'discharge', { vsl: 'ATPR', voy: '2633W' }, [])).rows;
const GROUP = /^[2-4LM][0-9A-Z](GP|RE|RF|RT|RS|PF|PL|UT|TN|TG|TD|BU|SN|VH|HR|AC)$/;   // 세관 표기
const FALLBACK = /^(20|40|45)[RFOT]?$/;                                                //  모르면 종전 계산(3.44 와 같다)
const leaked = Object.entries(atSeen).filter(([k, r]) => k !== '_all' && !GROUP.test(r.spec || '') && !FALLBACK.test(r.spec || ''));
ok(`ATPR 실데이터 ${Object.keys(atSeen).length - 1}대 — 내부 공컨 마커(220E·450E·453E)가 규격 칸에 안 샌다`,
   leaked.length === 0, leaked.slice(0, 3).map(([c, r]) => `${c}→${r.spec}`).join(' '));
const atIso = {};
(atSeen._all || []).forEach((r) => { atIso[r.spec] = (atIso[r.spec] || 0) + 1; });
ok('그 폴백이 세관 표기로 떨어진다(220E→22GP · 450E→45GP · 453E→45RE)',
   !!atIso['22GP'] && !!atIso['45GP'] && !!atIso['45RE'], JSON.stringify(atIso));

console.log('\n── F/E 한 칸 · 비고 동적 축소 (검수사 «둘다 표기»)');
ok('F/E 칸에 F 또는 E 가 한 글자로 들어간다', (seen._all || []).every((r) => ['F', 'E'].includes(r.fe)));
//  DG·OOG 가 겹친 긴 비고 — 잘리면 «둘 다 표기» 가 깨진다
//  실데이터 — OBWH 2731E SPRU1000458(FR·OOG·실치수 10914×3340×3150). 여기에 X-RAY 가 겹치면
//  검수사 «DG와 중복이 될경우 동적 축소로 둘다 표기 되어야 합니다» 가 걸리는 바로 그 행이다.
const findCn = (obj, want, d = 0) => {
  if (!obj || typeof obj !== 'object' || d > 5) return null;
  if (obj.cn === want) return obj;
  for (const k of Object.keys(obj)) { const r = findCn(obj[k], want, d + 1); if (r) return r; }
  return null;
};
const longRow = Object.assign({}, findCn(fx('liveboard_obwh.json'), 'SPRU1000458'), { _xray: true, _xraySealNo: '523533' });
const lh = M.generateInspectionListHTML([longRow], 'discharge', info, []);
const lr = (parse(lh).rows._all || []).find((r) => /★XRAY/.test(r.memo));   // 시트1 행(별첨엔 X-RAY 를 안 적는다)
//  ★ 6pt 아래로는 안 줄인다(«6pt 는 선내 조명에 장갑 낀 손으로 못 읽는다» — 이 저장소 확정).
//    더 줄이는 대신 줄을 바꾼다. 숨기지 않으니 한 글자도 안 잃는다.
ok('긴 비고는 6pt(m2)까지만 줄이고 그 아래로는 줄을 바꾼다',
   !!lr && / m2"/.test(lr.raw[5] || '') && !/ m[345]"/.test(lh) && /white-space: normal/.test(lh),
   lr ? lr.raw[5].slice(0, 70) : '★XRAY 행 없음');
ok('그 비고는 한 줄로 안 본다 — 배분기가 늘어난 줄을 센다', !!lr && M.memoFitOf(lr.memo).lines > 1,
   lr ? `${M.memoFitOf(lr.memo).lines}줄 · ${lr.memo.slice(0, 40)}` : '');
//  3.60: 종류 이름(FR)은 규격 칸이 말한다 — 비고엔 «오버 치수»(검수사 2026-09-24 «fr도 마찬가지 오버 또는 인게이지»)
ok('비고 전체가 남아 있다(★XRAY·봉인번호·오버 치수)',
   !!lr && lr.memo.includes('★XRAY 523533') && lr.memo.includes('오버') && lr.memo.includes('H+121'), lr && lr.memo);
//  글자 «수» 가 아니라 «폭» 으로 등급을 매기는가 — 소스를 읽지 않고 **그려진 결과**로 가린다.
//  같은 길이인데 한글·× 가 든 쪽이 더 큰 등급이어야 한다(한글과 × 는 전각으로 그려진다).
const clsOf = (memoRow) => {
  const h = M.generateInspectionListHTML([memoRow], 'discharge', info, []);
  const m = h.match(/<td class="memo([^"]*)"/);
  return m ? m[1].trim() : '';
};
const baseRow = rows.find((r) => !FX.xrayList[r.cn] && !r.dg);
const ascii = clsOf(Object.assign({}, baseRow, { sl: '', _xray: true, _xraySealNo: 'ABCDEFGHIJKLMNOPQRST' }));        // 20자 · 폭 20
const wide  = clsOf(Object.assign({}, baseRow, { sl: '', _xray: true, _xraySealNo: '가나다라마바사아자차카타파하거너더러머' }));   // 20자 · 폭 40
//  같은 «글자 수» 인데 전각이 든 쪽이 더 많은 줄을 먹어야 한다 — 글자를 세면 둘이 같아진다.
const L = (t) => M.memoFitOf(t).lines;
ok('글자 수가 아니라 폭으로 센다(한글·× 는 전각)',
   L('ABCDEFGHIJKLMNOPQRST') < L('가나다라마바사아자차카타파하거너더러머'),
   `ASCII ${L('ABCDEFGHIJKLMNOPQRST')}줄 vs 한글 ${L('가나다라마바사아자차카타파하거너더러머')}줄 · 그린 등급 ${ascii || '기본'}/${wide || '기본'}`);
//  × 는 한글 글꼴에서 전각이다 — 반각으로 세면 실치수 «10914×3340×3150mm» 가 좁게 계산돼 잘렸었다
ok('× 를 반각으로 세지 않는다', L('×'.repeat(20)) > L('x'.repeat(20)),
   `× 20자 ${L('×'.repeat(20))}줄 vs x 20자 ${L('x'.repeat(20))}줄`);
//  봉인번호에 & 가 있어도 살아남는다 — 지우면 없는 번호를 적는 셈이다
const amp = parse(M.generateInspectionListHTML(
  [Object.assign({}, rows.find((r) => FX.xrayList[r.cn]), { _xraySealNo: 'A&B-123' })], 'discharge', info, [])).rows;
const ampRow = amp[Object.keys(amp)[0]];
ok('봉인번호의 & 가 지워지지 않는다(A&B-123 그대로)', !!ampRow && ampRow.memo.includes('A&B-123'), ampRow && ampRow.memo);

console.log('\n── 규격과 줄 색이 서로 어긋나지 않는가 (4차 감사 — 무방비였던 자리)');
{
  //  ⚠ _LABEL_TYPE 에서 RH 한 글자만 빠져도 «규격은 45RE(리퍼)인데 줄은 회색» 인 행이 65개 되살아난다.
  //    ATPR 2633W 실데이터로 그려 규격 칸과 줄 색을 맞댄다.
  const AT2 = fx('podpat_atpr.json');
  const ar = Object.entries(AT2.edi).map(([k, e]) => Object.assign({}, e, { cn: String(e.cn || k).toUpperCase(), pod: 'KRPTK' }));
  const as = parse(M.generateInspectionListHTML(ar, 'discharge', { vsl: 'ATPR', voy: '2633W' }, [])).rows;
  const COLOR_OF = { RE: '#cce6ff', RF: '#cce6ff', PF: '#d4edda', UT: '#fff3cd', TN: '#ffe5d0' };
  const mism = Object.keys(as).filter((cn) => {
    if (cn === '_all') return false;
    const want = COLOR_OF[String(as[cn].spec || '').slice(2)];
    return want && as[cn].bg !== want && as[cn].bg !== YELLOW;
  });
  const reefer = Object.keys(as).filter((cn) => cn !== '_all' && /RE$/.test(as[cn].spec || ''));
  ok(`규격이 리퍼(${reefer.length}대)라고 적힌 줄은 리퍼색이다`, reefer.length > 0 && mism.length === 0,
     mism.slice(0, 3).map((c) => `${c} ${as[c].spec} ${as[c].bg}`).join(' · '));
}
{
  //  ⚠ 40피트 9'6"(45__) FR·OT·탱크를 8'6"(42PF·42UT·42TN)로 적으면 **없는 사실**을 종이에 쓰는 것이다.
  const hc = [['45PE', '45PF'], ['45U1', '45UT'], ['45P0', '45PF']];
  const got = hc.map(([iso]) => {
    const r = Object.assign({}, rows.find((x) => !FX.xrayList[x.cn]), { cn: 'ZZZU1234567', iso });
    return (parse(M.generateInspectionListHTML([r], 'discharge', info, [])).rows.ZZZU1234567 || {}).spec;
  });
  ok('40피트 하이큐빅 FR·OT·탱크가 높이를 안 낮춰 적는다', got.every((g, i) => g === hc[i][1]),
     hc.map(([iso, want], i) => `${iso}→${got[i]}(${want})`).join(' · '));
}

{
  //  ⚠ 저장소의 FR 한 벌(3.43-03 isFlatRackContainer)이 «FR» 이라고 답하는 4261·4363·436E 를
  //    검수 리스트만 «42GP·45GP»(일반) 로 적고 흰 줄에 별첨에서도 뺐다(4차 감사 실측 9대).
  const FR_ISO = ['4261', '4363', '436E'];
  const fr = FR_ISO.map((iso) => {
    const r = Object.assign({}, rows.find((x) => !FX.xrayList[x.cn]), { cn: 'YYYU7654321', iso });
    const g = parse(M.generateInspectionListHTML([r], 'discharge', info, [])).rows.YYYU7654321 || {};
    return { iso, spec: g.spec, bg: g.bg };
  });
  ok('FR 한 벌이 FR 이라는 규격을 «일반(GP)» 이라고 안 적는다',
     fr.every((x) => /PF$/.test(x.spec || '')), fr.map((x) => `${x.iso}→${x.spec}`).join(' · '));
  ok('그 줄은 FR 색(#d4edda)이다 — 규격과 색이 같은 말을 한다',
     fr.every((x) => x.bg === '#d4edda'), fr.map((x) => `${x.iso}→${x.bg}`).join(' · '));
}

console.log('\n── 별첨 · CSV');
//  별첨은 «성질» 표라 노랑을 안 쓴다(2.92-01) — 그래도 행이 사라지면 안 된다
const frRow = Object.assign({}, rows.find((r) => FX.xrayList[r.cn]), { iso: '42PF', _xraySealNo: '523533' });
const both = M.generateInspectionListHTML([frRow].concat(rows.filter((r) => r.cn !== frRow.cn)), 'discharge', info, []);
ok('X-RAY 이면서 특수화물인 행이 별첨에서 사라지지 않는다', (both.match(new RegExp(frRow.cn, 'g')) || []).length >= 2,
   `${(both.match(new RegExp(frRow.cn, 'g')) || []).length}번 나옴`);
//  CSV 를 **실제로 돌려** 종이와 맞댄다
let csv = null;
{
  const store = {};
  const fakeDoc = { write(h) { store.html = (store.html || '') + h; }, close() {},
    createElement: () => ({ style: {}, click() {}, set href(v) {}, set download(v) {} }),
    body: { appendChild() {}, removeChild() {} } };
  const w = { document: fakeDoc, focus() {}, print() {}, alert() {} };
  global.window.open = () => w;
  global.Blob = function (parts) { csv = parts.join(''); };
  global.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
  try { M.openInspectionListPrint(rows, 'discharge', info, []); if (w.__exportExcel) w.__exportExcel(); } catch (e) { csv = 'ERR ' + e.message; }
}
const csvRows = {};
String(csv || '').split('\n').slice(1).forEach((l) => { const f = l.split(','); if (/^[A-Z]{4}\d{7}$/.test(f[1] || '')) csvRows[f[1]] = { spec: f[3], fe: f[4], memo: f[6] }; });
ok('CSV 가 실제로 만들어진다', Object.keys(csvRows).length > 500, `${Object.keys(csvRows).length}행 · ${String(csv).slice(0, 40)}`);
const specDiff = Object.keys(csvRows).filter((cn) => seen[cn] && cn !== '_all' && csvRows[cn].spec !== seen[cn].spec);
ok('CSV 규격이 종이와 같다', specDiff.length === 0,
   specDiff.slice(0, 3).map((c) => `${c} 종이 ${seen[c].spec} ≠ 엑셀 ${csvRows[c].spec}`).join(' · '));
const feDiff = Object.keys(csvRows).filter((cn) => seen[cn] && cn !== '_all' && csvRows[cn].fe !== seen[cn].fe);
ok('CSV F/E 가 종이와 같다(기본값이 반대였다)', feDiff.length === 0,
   feDiff.slice(0, 3).map((c) => `${c} 종이 ${seen[c].fe} ≠ 엑셀 ${csvRows[c].fe}`).join(' · '));
ok('CSV 비고에도 XRAY 봉인번호가 있다',
   targets.every((cn) => !csvRows[cn] || !(FX.xraySeals[cn] || {}).seal || csvRows[cn].memo.includes('XRAY ' + FX.xraySeals[cn].seal)),
   targets.map((c) => csvRows[c] && csvRows[c].memo).slice(0, 2).join(' | '));

console.log(bad ? `\n✗ X-RAY 세관봉인 연막검사 실패 ${bad}건 / ${n}` : `\n✓ X-RAY 세관봉인 연막검사 통과 (${n}항)`);
process.exit(bad ? 1 : 0);
