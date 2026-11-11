// 4.87-08 «미르야?»·«미르?» 물음표 호출 연막검사 — 호출어 뒤에 물음표만 남아도 인사로 받고, 뒤에 말이 붙으면 인사가 아니다
//   실행 — node tools/smoke_mirhello48708.cjs <repoRoot>   (번들 없이 네이티브 ESM 으로 src 를 직접 연다 · 네트워크 없음)
const path = require('path');
const { pathToFileURL } = require('url');
const root = path.resolve(process.argv[2] || process.cwd());
process.env.TZ = 'Asia/Seoul';
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: {} };
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
let n = 0, bad = 0;
const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + d)); if (!c) bad++; };
(async () => {
  const N = await import(pathToFileURL(path.join(root, 'src/nlSearch.js')).href);
  for (const q of ['미르야?', '미르?', '미르야', '미르야!', '미르야 ?', '미르야??', '미르님?', '미르']) {
    const r = N.parseNaturalQuery(q);
    ok(r.mirCalled && r.mirHello, '«' + q + '» → 인사', JSON.stringify({ c: r.mirCalled, h: r.mirHello }));
  }
  for (const q of ['미르야 리퍼 몇개', '미르야 리퍼 몇개?', '미르는 뭐야', '리퍼 몇개?']) {
    const r = N.parseNaturalQuery(q);
    ok(!r.mirHello, '«' + q + '» → 인사 아님', JSON.stringify({ h: r.mirHello }));
  }
  console.log(`\n${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
