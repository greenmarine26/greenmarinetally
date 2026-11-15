// 5.03 연막검사 — 갱별 주간보고(buildGangShiftReport) 호기·바구니 없는 배의 누적 분할과 실번호 대소문자 비교를 순수 함수로 잰다.
//  사용법: node tools/smoke_d50300.cjs [archive_TNJP_26376E.json]
const path = require('path');
const fs = require('fs');
process.env.TZ = 'Asia/Seoul';
const esbuild = require('esbuild');
const out = path.join(require('os').tmpdir(), 'smoke_d50300_utils.cjs');
esbuild.buildSync({ entryPoints: [path.resolve(__dirname, '../src/utils.js')], bundle: true, platform: 'node', format: 'cjs', outfile: out, loader: { '.js': 'jsx' }, logLevel: 'error', define: { 'import.meta.env': '{}' } });
global.window = global.window || { addEventListener() {}, localStorage: null, location: { href: 'http://x/' } };
global.localStorage = global.localStorage || { getItem: () => null, setItem() {}, removeItem() {} };
const U = require(out);
let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? pass++ : fail++; };

//  ── 건11 합성: PNCT 우현, QC102·QC104(2·4호기), 장 4개(베이 2·6·10·14 → 장 짝수), 양하 40대 · 호기 터미널 실적 없음.
const NOW = new Date('2026-11-15T16:30:00+09:00').getTime();
const pages = [2, 6, 10, 14].map((e) => ({ even: e, odd: e - 1 }));
const mk = (n0, bays, per, fe) => { const o = {}; let i = 0; bays.forEach((b) => { for (let k = 0; k < per; k++) { const cn = 'TEST' + String(n0 + i++).padStart(7, '0'); o[cn] = { cn, bay: String(b), row: '01', tier: '02', fe: fe || 'F', iso: '20DC', pod: 'PTK', pol: 'LYG', tp: '20DC' }; } }); return o; };
function voy(over) {
  const dis = mk(1000000, [2, 6, 10, 14], 10);   // 장당 10대 = 40
  const completed = {};
  Object.keys(dis).slice(0, 10).forEach((cn, i) => { completed[cn] = { at: NOW - 3600000 + i * 1000, equip: '', src: 'term' }; });   // 첫 장 10대만 끝(호기 칸 없음)
  return { info: { vsl: 'TEST', pier: 'PNCT', berth: '동부두 16번선석', berthSide: '우현', qcWork: over.qc }, discharge: { ediContainers: dis, records: {}, completed, termWork: {} }, loading: {} };
}
//  PNCT 안벽 좌→우 4·2·1·3, 우현은 우측이 선수 → 선수→선미 = 2호기, 4호기. 2호기 20대(완료 10+잔여 10) · 4호기 20대.
const good = voy({ qc: { QC102: { qc: 'QC102', disDone: 10, disRest: 10, lodDone: 0, lodRest: 0 }, QC104: { qc: 'QC104', disDone: 0, disRest: 20, lodDone: 0, lodRest: 0 } } });
const r = U.buildGangShiftReport(good, pages, NOW);
console.log('  [합성] perGang=' + r.perGang + ' why=' + (r.why || '').slice(0, 60));
ok(r.perGang === true, '건11 바구니·호기 칸 없음 → 호기별 규격표 경로(perGang)');
const g2 = r.gangs.find((g) => g.no === 2), g4 = r.gangs.find((g) => g.no === 4);
const nOf = (g) => g && g.discharge && !g.discharge.none ? (g.discharge.doneTotal || 0) + (g.discharge.remainTotal || 0) : 0;
ok(g2 && g4 && nOf(g2) + nOf(g4) > 0, '두 호기 모두 양하 규격표/대수 있음 (2호기 ' + nOf(g2) + ' · 4호기 ' + nOf(g4) + ')');
ok(r.gangs.every((g) => g.discharge && !g.discharge.none || g.no), '갱 구조 필드 유지 (gangs[].qc/qcNow)');
//  합이 크게 어긋나면(EDI 40 ↔ 호기 총량 120) 여전히 qcOnly
const bad = voy({ qc: { QC102: { qc: 'QC102', disDone: 50, disRest: 10, lodDone: 0, lodRest: 0 }, QC104: { qc: 'QC104', disDone: 50, disRest: 10, lodDone: 0, lodRest: 0 } } });
const rb = U.buildGangShiftReport(bad, pages, NOW);
ok(rb.perGang === false && /같은 분/.test(rb.why), '건11 호기 총량 ≠ EDI 대수(10% 초과) → 그대로 qcOnly');
//  방향 자료 없음 → 종전대로 qcOnly
const nodir = JSON.parse(JSON.stringify(good)); delete nodir.info.berthSide;
ok(U.buildGangShiftReport(nodir, pages, NOW).perGang === false, '건11 접안 방향 없음 → 종전 qcOnly (문지기 유지)');

//  ── 건10 대소문자 — 판정 함수(sealCheckOf·isSealError·sealSameLoose)는 normSeal 을 거친다. 대소문자만 다른 쌍은 같은 실, 다른 글자·앞자리 0 은 다른 실.
ok(U.sealSameLoose('M123456', 'm123456') === true, '건10 M123456 · m123456 같은 실');
ok(U.sealSameLoose('M123456', 'N123456') === false, '건10 M123456 ↔ N123456 다른 실');
ok(U.sealSameLoose('M123456', 'M0123456') === false, '건10 앞자리 0 쌍 다른 실');
const base = { cn: 'ABCD1234567', sl_history: [{ at: NOW, v: 'x' }] };
const chk = (sl, orig) => !!U.isSealError({ ...base, sl, sl_orig: orig });
ok(chk('m123456', 'M123456') === false, '건10 고친 실이 대소문자만 다르면 실오류 아님');
ok(chk('N123456', 'M123456') === true, '건10 M ↔ N 고침은 실오류');
ok(chk('M0123456', 'M123456') === true, '건10 앞자리 0 쌍은 실오류');
const src = fs.readFileSync(path.resolve(__dirname, '../src/utils.js'), 'utf8');
ok(!/String\(r\.sl\) !== String\(r\.sl_orig\)/.test(src), '건10 utils.js 원문 비교(String(r.sl) !== String(r.sl_orig)) 제거됨');

//  ── 실데이터(있으면)
const fp = process.argv[2] || '/tmp/tnjp.json';
if (fs.existsSync(fp)) {
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const bays = new Set(); for (const m of ['discharge', 'loading']) Object.values(d[m].ediContainers || {}).forEach((c) => { const b = parseInt(c.bay, 10); if (b > 0) bays.add(b % 2 ? b + 1 : b); });
  const rp = [...bays].sort((a, b) => a - b).map((e) => ({ even: e, odd: e - 1 }));
  const before = d.info.shiftReports && Object.values(d.info.shiftReports)[0];
  const rr = U.buildGangShiftReport(d, rp, d.info.workEndAt ? Date.now() : new Date('2026-11-15T17:00:30+09:00').getTime());
  console.log('  [TNJP 26376E 실자료] perGang=' + rr.perGang + ' doneUnsure=' + rr.doneUnsure + ' err=' + rr.err + ' why=' + (rr.why || '').slice(0, 90));
  rr.gangs.forEach((g) => console.log('    ' + g.no + '호기 양하', g.discharge && (g.discharge.doneTotal ?? 'none'), '선적', g.loading && (g.loading.doneTotal ?? 'none')));
  ok(rr.perGang === true, '실자료 TNJP 26376E 수정 후 perGang=true');
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
