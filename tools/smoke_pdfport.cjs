// PDF 머리글을 항구로 삼지 않는가 (3.6-02, 검수사 실측 2026-09-03 SWMM 2609S)
//   Summary PDF 머리글 «POD CLASS / UNNo. …» 을 종전 파서가 물어 CLASS 를 목적항으로 삼았다.
//   본문은 실제 PDF 에서 뽑은 줄 그대로다.
const M = require(process.argv[2]);
let fail = 0;
const T = (c, m) => { if (!c) { console.error('  ✗', m); fail++; } else console.log('  ✓', m); };

// ① 그 사고 재현 — 실제 Summary PDF 줄
const SUMMARY = [
  'SAWASDEE MIMOSA 2609S  KRPTK',
  "B/L No. Remark POD CLASS / UNNo. 10' 20' 40' HQ TEU N.WGT G.WGT",
  '1 SNKO010260804266 Ondeck(Flexibag) VNSGN SKLU1308319 22GP 22,220',
  '2 SNKO010260804266 Ondeck(Flexibag) VNSGN SKLU1442668 22GP 22,320',
  '3 SNKO010260804266 Ondeck(Flexibag) VNSGN SKLU1541887 22GP 22,190',
].join('\n');
const r = M.parsePdfContainers(SUMMARY);
T(r.pod !== 'CLASS', `⛔ 머리글 «CLASS» 를 목적항으로 삼는다 (pod=${JSON.stringify(r.pod)})`);
const pods = Object.values(r.containers).map((c) => c.pod);
T(!pods.includes('CLASS'), `⛔ 컨테이너에 목적항 «CLASS» 가 박힌다 (${JSON.stringify(pods)})`);
T(Object.keys(r.containers).length >= 3, `표에서 컨을 못 뽑는다 (${Object.keys(r.containers).length}대)`);

// ② 보통 PDF 는 종전대로 읽어야 한다 — 회귀 방지
const NORMAL = [
  'Vessel Voyage : TEST SHIP (2609S)',
  'POL : KRPTK   POD : VNSGN',
  '1 BEAU4688310 D5 0 3,890 0 DJSCPTK260000659 KRPTK VNSGN',
].join('\n');
const r2 = M.parsePdfContainers(NORMAL);
T(r2.pol === 'KRPTK', `보통 PDF 의 POL 을 못 읽는다 (${r2.pol})`);
T(r2.pod === 'VNSGN', `보통 PDF 의 POD 를 못 읽는다 (${r2.pod})`);
T(r2.mode === 'loading', `평택 출발인데 선적으로 안 본다 (${r2.mode})`);

// ③ 다른 머리글 낱말도 막는다
for (const w of ['TOTAL', 'GROSS', 'EMPTY', 'WEIGHT']) {
  const rr = M.parsePdfContainers(`POD ${w} / UNNo.\n1 AAAA1234567 D5 0 3,890 0`);
  T(rr.pod !== w, `머리글 «${w}» 를 목적항으로 삼는다`);
}

// ④ 슬래시가 붙은 합성 머리글은 값이 아니다
const r4 = M.parsePdfContainers("POD ABCDE / UNNo.\n1 AAAA1234567 D5 0 3,890 0");
T(r4.pod !== 'ABCDE', '«POD XXXXX / …» 합성 머리글을 값으로 읽는다');

console.log(fail ? `\nPDF 항구 연막검사 실패 ${fail}건` : '\nPDF 항구 연막검사 통과');
process.exit(fail ? 1 : 0);
