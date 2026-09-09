// 특수제작컨(32尺·34尺)이 리퍼 온도 대상에서 빠지고 «제작컨» 으로 표기되는지 실데이터로 재는 연막검사 (TallyOne 3.37).
//
//  왜 있는가 — 검수사 2026-09-09 화면(RZOR R098E) «⚠ 풀 리퍼 40대 중 8대 온도 미입력» 아래
//  HSAP63… 여덟 대가 줄줄이 떴다. 검수사 원문 — *«특수제작컨입니다. **기본 규격이 아닙니다. 따로표기**»* ·
//  *«**제작컨 온도 체크 대상 아님**»* (32尺 6대 · 34尺 2대).
//
//  뿌리는 규칙이 아니라 **배선**이었다(규범 §4-5). 앱에는 이미 문이 있다 —
//  `diagnostics.js` 의 «제작컨테이너는 온도 없음이 정상»(`mkcon`)·`utils.reeferTempOf`·`ReeferMemoModal`.
//  그런데 `mkcon` 이 **저절로** 붙는 길이 **리스트 엑셀 REMARK 하나뿐**이었다(`parseListRows` 의 `rmkMkc` — 나머지 하나는 검수원이 손으로 누르는 `ContainerDetailModal` 의 「제작컨 지정」).
//  실측 — R098E 는 리스트에 «특수컨» 이 적혀 와 8대가 잡혔지만, **R096E 는 안 적혀 와 일곱 대가 그대로 리퍼**였다.
//  두 항차 다 **선사 메일 본문에는 «* 특수컨» 목록이 있었다** — 수집기 2.32 가 그것을 `forecast.specialCns` 로 올리고,
//  앱은 `tagForecastMarks` 한 자리에서 그 번호에 `mkcon` 을 붙인다(리스트 경로와 **같은 한 벌**).
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_mkcon.cjs <번들.cjs>'); process.exit(1); }
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));

const ROOT = path.resolve(__dirname, '..');
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mkcon_rzor.json'), 'utf8'));

let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };

console.log('특수제작컨 — 온도 대상에서 빠지고 «제작컨» 으로 표기되는가');

//  메일 본문이 선언한 특수제작컨(실제 메일 그대로)
const SPEC = {
  RZOR_R096E: ['HJPT3200014', 'HJPU2634158', 'HJPU2634142', 'HJPU2634179', 'HJPU2634137', 'HJPU2634163', 'HJPU2634184'],
  RZOR_R098E: ['HSAP6320216', 'HSAP6320221', 'HSAP6320237', 'HSAP6320242', 'HSAP6325033', 'HSAP6325049', 'HSAP6340151', 'HSAP6340167'],
};

//  ⚠⚠ **검사가 앱 대신 일해 주면 안 된다.** 첫 판은 여기서 `tagForecastMarks` 로 찍고 records 에도
//    `mkcon` 을 손으로 넣어 16항이 전부 통과했는데, **앱은 진단에 그 목록을 안 넣는다** — 그래서
//    검수사가 본 그 경고에 새 길이 닿지 않는 채로 초록이었다(감사 실측). 진단이 `c.mkcon` 을
//    안 보게 하는 사보타주에도 통과했다.
//    ⇒ 이제 **앱이 실제로 만드는 입력 그대로** 재현한다 — `VoyagePage` 가 하는 것은 딱 하나,
//      `applySpecialMarks(voyage, …)` 로 두 목록을 지나게 하는 것뿐이다. 그 한 줄이 빠지면 이 검사가 빨개진다.
const warn = (key, specCns, recOverride) => {
  const { edi } = FX[key];
  const rec = recOverride || FX[key].rec;
  const voyage = { info: { forecast: { specialCns: specCns || [] } } };
  //  VoyagePage:1199~ 와 같은 차례 — EDI 에 기록의 온도·F/E 를 보강해 진단용 목록을 만든다.
  const base = [];
  for (const c of Object.values(edi)) {
    const r = rec[c.cn] || {};
    const patch = {};
    if (!String(c.tmp || '').trim() && String(r.tmp || '').trim()) { patch.tmp = r.tmp; patch.tmp_missing = false; }
    if (!c.fe && r.fe) patch.fe = r.fe;
    base.push(Object.keys(patch).length ? { ...c, ...patch } : c);
  }
  const ediObj = {};
  U.applySpecialMarks(voyage, base).forEach((c) => { ediObj[c.cn] = c; });
  const recObj = {};
  U.applySpecialMarks(voyage, Object.entries(rec).map(([cn, r]) => ({ ...r, cn }))).forEach((r) => { recObj[r.cn] = r; });
  const alerts = U.runDiagnostics({ ediContainers: ediObj, listRecords: recObj, xrayList: {}, mode: 'discharge',
                                    carrier: '', sealPolicy: null, lugCount: 0, lugCns: [], thruCns: [] });
  return alerts.find(a => a.code === 'reefer_no_temp') || null;
};

// ── R096E — 리스트에 «특수컨» 이 안 적혀 온 항차. 메일 본문만이 답이다.
{
  const before = warn('RZOR_R096E', []);
  ok(!!before, `R096E — 지금(메일 본문을 안 쓰면) 온도 미입력 경고가 뜬다 : «${before ? before.msg : '없음'}»`);
  const n = before ? before.count : 0;
  ok(n >= 7, `그 경고에 특수제작컨이 들어 있다 (${n}대)`);
  const inWarn = before ? before.details.map(d => d.cn) : [];
  const specInWarn = SPEC.RZOR_R096E.filter(c => inWarn.includes(c));
  ok(specInWarn.length === SPEC.RZOR_R096E.length, `일곱 대가 전부 그 경고 안에 있다 (${specInWarn.length}/7)`);

  const after = warn('RZOR_R096E', SPEC.RZOR_R096E);
  const left = after ? after.details.map(d => d.cn) : [];
  ok(!SPEC.RZOR_R096E.some(c => left.includes(c)), `메일 본문을 쓰면 일곱 대가 경고에서 빠진다 (남은 ${left.length}대)`);
  ok(!after || after.count < n, `경고 대수가 줄어든다 (${n} → ${after ? after.count : 0})`);
}

// ── R098E — 리스트에 적혀 와 이미 잡힌 항차. 메일 본문을 더해도 **같은 결과**여야 한다(판정 두 벌 금지).
{
  const a1 = warn('RZOR_R098E', []);
  const a2 = warn('RZOR_R098E', SPEC.RZOR_R098E);
  ok(!a1, `R098E — 리스트에 «특수컨» 이 적혀 와 지금도 경고가 없다 (${a1 ? a1.msg : '없음'})`);
  ok(!a2, 'R098E — 메일 본문을 더해도 결과가 같다 — 두 길이 한 판정이다');
}

// ── 표기 — «제작컨» 으로 따로 보인다(검수사 «따로표기»)
{
  const spec = new Set(SPEC.RZOR_R096E);
  const tagged = U.tagForecastMarks(Object.values(FX.RZOR_R096E.edi), new Set(), new Set(), null, spec);
  const hit = tagged.filter(c => c.mkcon);
  ok(hit.length === 7, `특수제작컨 일곱 대에 제작컨 표시가 붙는다 (${hit.length}대)`);
  ok(tagged.filter(c => c.mkcon).every(c => spec.has(c.cn)), '그 표시가 다른 컨에는 안 붙는다');
  //  붙은 그 순간 온도·사진 대상에서 빠지는가 — 판정 한 벌(utils)로 확인
  const one = hit[0];
  const t = U.reeferTempOf(one);
  ok(t && t.target === false && t.state === 'none',
     `제작컨은 온도 판정 한 벌(reeferTempOf)에서 «대상 아님» 이다 (${JSON.stringify(t)})`);
  //  빈 집합이면 아무것도 안 바뀐다(옆길로 새지 않는다)
  const none = U.tagForecastMarks(Object.values(FX.RZOR_R096E.edi), new Set(), new Set(), null, new Set());
  ok(none.filter(c => c.mkcon).length === 0, '특수제작컨 목록이 비면 아무 컨에도 안 붙는다');
}

// ── 배선 — **검수 리스트가 아직 안 올라온 항차**(EDI 만 있는 상태)에서도 빠지는가.
//    ⚠ 감사 실측 — 픽스처는 기록이 207대 다 있어 EDI 쪽·기록 쪽 두 문지기가 서로를 가려 준다.
//      그래서 EDI 쪽 하나만 빠뜨려도 종전 검사가 초록이었다(그 상태의 실제 화면은 «21대 중 21대»).
//      기록을 비워 두 문지기를 갈라 놓고 잰다.
{
  const bare = warn('RZOR_R096E', [], {});
  ok(!!bare && bare.count === 21, `기록이 없으면 리퍼 21대가 통째로 온도 미입력이다 (${bare ? bare.count : 0}대)`);
  const fixed = warn('RZOR_R096E', SPEC.RZOR_R096E, {});
  const left = fixed ? fixed.details.map(d => d.cn) : [];
  ok(!SPEC.RZOR_R096E.some(c => left.includes(c)),
     `기록이 없어도 메일 본문만으로 일곱 대가 빠진다 (${bare ? bare.count : 0} → ${fixed ? fixed.count : 0}대)`);
}

// ── 사진 대상에서도 빠지는가 — «제작컨은 컨 자체가 상품» 이라 온도 사진을 찍을 것이 없다.
//    (`isISO403` 의 제작컨 문이 사라지면 온도 경고만 없애고 **사진 독촉이 대신 뜬다** — 검수사에겐 같은 헛일이다.)
{
  const one = FX.RZOR_R096E.edi[SPEC.RZOR_R096E[0]];
  ok(U.isISO403(one) === true, `표시 붙기 전에는 온도 사진 대상이다 (${one.iso})`);
  ok(U.isISO403({ ...one, mkcon: true }) === false, '제작컨 표시가 붙으면 온도 사진 대상에서도 빠진다');
  const marked = U.applySpecialMarks({ info: { forecast: { specialCns: SPEC.RZOR_R096E } } },
                                     Object.values(FX.RZOR_R096E.edi));
  ok(marked.filter(c => U.isISO403(c)).length === marked.filter(c => U.isISO403(c) && !c.mkcon).length,
     '문지기를 지난 목록에는 사진 대상 제작컨이 한 대도 없다');
}

// ── 소스 모양 — 판정을 새로 만들지 않았는지
{
  console.log('\n  ■ 소스 모양');
  const UT = fs.readFileSync(path.join(ROOT, 'src/utils.js'), 'utf8');
  ok(/export function tagForecastMarks\(list, urgentSet, luggSet, luggSeals, specSet\)/.test(UT),
     '특수제작컨을 찍는 자리가 긴급·수화물과 **같은 함수**다(판정 두 벌 금지)');
  ok(/if \(sp\) t\.mkcon = true;/.test(UT), '찍는 것은 새 이름이 아니라 종전 `mkcon` 이다 — 종전 규칙들이 그대로 받는다');
  const VP = fs.readFileSync(path.join(ROOT, 'src/pages/VoyagePage.jsx'), 'utf8');
  const PH = fs.readFileSync(path.join(ROOT, 'src/components/PrintHubModal.jsx'), 'utf8');
  ok((VP.match(/tagForecastMarks\([^)]*specSet\)/g) || []).length === 2, '화면 두 자리가 다 넘긴다(리스트·카고플랜)');
  ok(/specSet\)/.test(PH), '인쇄물도 넘긴다 — 종이와 화면이 갈리지 않는다');
  ok(/forecast\?\.specialCns|_fc\?\.specialCns/.test(VP) && /_fc\?\.specialCns/.test(PH),
     '수집기가 올린 `forecast.specialCns` 를 읽는다');
  //  ⚠ **목록을 따로 만드는 네 자리**가 전부 같은 문지기를 지나야 한다(감사 실측 — 첫 판은 화면 마커에만 붙어
  //    진단·마감점검·현황요약·마감텔리가 새 길을 못 봤다).
  //  자리 수까지 못박는다 — 진단은 **EDI 목록과 기록 목록 둘 다** 지나야 한다(하나만 지나면 리스트 전 항차가 샌다).
  for (const [who, f, want] of [['진단(경고 문구를 만드는 자리)', 'src/pages/VoyagePage.jsx', 2],
                                ['마감 점검', 'src/components/WorkClosingChecklist.jsx', 1],
                                ['현황 요약', 'src/components/VoyageSummaryCard.jsx', 1],
                                ['마감텔리(선사로 나가는 종이)', 'src/tallyReport.js', 1]]) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const n = (src.match(/applySpecialMarks\(voyage,/g) || []).length;
    //  ⚠ «한 번이라도 있으면 통과» 로 두면 두 목록 중 하나만 지나도 초록이다(감사 실측) — 자리 수를 센다.
    ok(n === want, `${who} 도 같은 문지기를 지난다 — ${want}자리 (${n}자리, ${f})`);
  }
  ok(/export function applySpecialMarks\(voyage, list\)/.test(UT), '그 문지기가 utils 한 벌이다');
}

console.log(fail ? `\n⛔ 특수제작컨 검사 실패 ${fail}건` : `\n✅ 특수제작컨은 온도 대상이 아니다 — ${pass}항 통과`);
process.exit(fail ? 1 : 0);
