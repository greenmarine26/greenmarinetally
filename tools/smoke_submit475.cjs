// 4.75 연막검사 — 검수 리스트 «제출용»(작업한 컨 ✔호기 · 비고 실오류·데미지 · 머리 아래 누가 몇 호기) 실소스 검사. 작업용은 한 글자도 안 바뀐다.
//   재료는 ATPR 2646E(보관소 실데이터, 2026-11-07 읽기) 일부 — 호기 등록 «10-20 주간 2호기 김판석·4호기 김성일», HALU2331077 은 터미널 2호기(중복 위치) · 실오류 보고 4호기.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
let n = 0, bad = 0;
const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
const ROOT = process.cwd();
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'sub475-'));
fs.writeFileSync(path.join(TMP, 'e.js'), `export { buildInspectionListDoc } from '${ROOT}/src/inspectionList.js'; export { inspectionMarksOf } from '${ROOT}/src/utils.js';`);
execSync(`npx esbuild "${TMP}/e.js" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${TMP}/b.cjs"`, { cwd: ROOT, stdio: 'pipe' });
const { buildInspectionListDoc, inspectionMarksOf } = require(path.join(TMP, 'b.cjs'));
const T = (h, m) => Date.UTC(2026, 9, 20, h - 9, m);   // 2026-10-20 KST
const voyage = {
  info: { vsl: 'ATPR', craneCrew: { '10-20 주간': { '2호기': { name: '김판석', at: T(7, 53) }, '4호기': { name: '김성일', at: T(7, 53) } } } },
  reports: { r1: { type: 'seal_error', cn: 'HALU2331077', equip: '4호기', by: null, ts: T(16, 40) }, r2: { type: 'work_status', cn: 'XXXX0000000', equip: '4호기', ts: T(9, 0) } },
  photoIndex: { p1: { type: 'seal_error', cn: 'HALU2331077', equip: '4호기', ts: T(16, 40) }, p2: { type: 'damage', cn: 'SKLU0540715', equip: '2호기', by: '김판석', ts: T(10, 0) } },
  discharge: { completed: {
    BEAU2182731: { at: T(8, 20), by: '김판석', equip: '2호기' },
    HALU2331077: { at: T(7, 33), by: '', equip: '2호기', src: 'term' },
    SKLU0540715: { at: T(9, 0), by: '', equip: '2호기', src: 'term' },
    BEAU2182730: { at: T(8, 9), by: '김성일', equip: '4호기' },
    SEGU9999999: { at: T(8, 10), by: '', src: 'term' },
  } },
};
const rowOf0 = (h, cn) => (h.match(new RegExp('<tr[^>]*>(?:(?!</tr>)[\\s\\S])*' + cn + '[\\s\\S]*?</tr>')) || [''])[0];
const mk = inspectionMarksOf(voyage, 'discharge');
ok(JSON.stringify(mk.byCn.HALU2331077) === JSON.stringify({ no: 4, name: '김성일', flags: ['실오류'] }), '실오류 보고가 있으면 터미널 2호기가 아니라 보고한 4호기 김성일로 적는다(중복 위치 사건)');
ok(mk.byCn.SKLU0540715.no === 2 && mk.byCn.SKLU0540715.name === '김판석' && mk.byCn.SKLU0540715.flags.join() === '데미지', '터미널 반영분은 호기 등록 근무자 이름 + 데미지 표기');
ok(mk.byCn.BEAU2182730.no === 4 && mk.byCn.BEAU2182730.name === '김성일' && mk.byCn.BEAU2182730.flags.length === 0, '앱으로 완료한 컨은 찍은 사람 이름');
ok(!mk.byCn.SEGU9999999, '터미널 반영분은 사람이 검수한 게 아니라서 체크 없음(4.75-01)');
ok(!inspectionMarksOf({ ...voyage, discharge: { completed: { EDIX0000001: { at: T(8, 0), by: '', src: 'edi' } } }, reports: {}, photoIndex: {} }, 'discharge').byCn.EDIX0000001, '마감 EDI 적용분도 체크 없음');
const nc = inspectionMarksOf({ ...voyage, discharge: { completed: { SKLU0540715: { at: T(9, 0), by: '', equip: '2호기', src: 'term' } } } }, 'discharge');
ok(!Object.keys(nc.byCn).length && !nc.teams.length, '앱으로 직접 입력한 호기가 없으면(명단에만 있어도) 데미지 보고가 있어도 체크가 없다(4.75-01)');
const ng = inspectionMarksOf({ ...voyage, discharge: { completed: { BEAU2182730: { at: T(8, 9), by: '김성일', equip: '4호기' } } } }, 'discharge');
ok(!ng.byCn.SKLU0540715 && ng.byCn.HALU2331077 && ng.byCn.HALU2331077.no === 4, '직접 입력하지 않는 2호기 보고는 표기하지 않고 입력하는 4호기 보고는 표기한다(4.75-01)');
ok(!mk.byCn.XXXX0000000, '실오류·데미지가 아닌 보고(work_status)는 표기하지 않는다');
ok(mk.teams.map((t) => t.no + ':' + t.count).join() === '2:2,4:2', '팀 — 호기 번호 순(터미널 반영분은 팀에 없다)');
const conts = ['HALU2331077', 'SKLU0540715', 'BEAU2182730', 'SEGU9999999', 'NOTDONE1234'].map((cn) => ({ cn, iso: '22G1', fe: 'F', sl: 'S1' + cn.slice(-3), pod: 'KRPTK', op: 'SNK' }));
const clone = () => JSON.parse(JSON.stringify(conts));
const work = buildInspectionListDoc(clone(), 'discharge', voyage.info, [], { appendix: false }).html;
const sub = buildInspectionListDoc(clone(), 'discharge', voyage.info, [], { appendix: false, submit: true, marks: mk }).html;
ok(!/✔|plegend"|제출용/.test(work.replace(/\.plegend[^}]*\}/, '').replace(/제출용/g, '')) || (!/✔/.test(work) && !/class="plegend"/.test(work)), '작업용에는 ✔·범례가 없다');
ok(/✔4<\/span> <span[^>]*>실오류<\/span>/.test(sub), '제출용 — HALU2331077 비고에 «✔4 실오류»');
ok(/✔2<\/span> <span[^>]*>데미지<\/span>/.test(sub), '제출용 — 데미지 표기');
ok((sub.match(/✔/g) || []).length >= 3 + 1 && !/✔/.test(rowOf0(sub, 'SEGU9999999')), '제출용 — 사람이 검수한 컨 세 줄에 ✔(+범례), 터미널 반영 컨은 없음');
ok(/class="plegend">✔ 검수 표기 · 2호기 김판석 1대 · 4호기 김성일 2대 · ✔ 옆 숫자는 호기/.test(sub), '제출용 — 머리 아래에 누가 몇 호기 몇 대');
ok(/양하 제출용/.test(sub), '제출용 — 머리에 «제출용» 표시');
const rowOf = (h, cn) => (h.match(new RegExp('<tr[^>]*>(?:(?!</tr>)[\\s\\S])*' + cn + '[\\s\\S]*?</tr>')) || [''])[0];
ok(!/✔/.test(rowOf(sub, 'NOTDONE1234')), '완료하지 않은 컨 줄에는 ✔가 없다');
ok(rowOf(work, 'HALU2331077').replace(/\s+/g, '') === rowOf(buildInspectionListDoc(clone(), 'discharge', voyage.info, [], { appendix: false }).html, 'HALU2331077').replace(/\s+/g, ''), '작업용 줄은 매번 같다(제출용 설정이 새지 않는다)');
// 장 나누기 판(이어서·20/40·풀/엠티·포트별) — 판마다 표기가 맞게(검수사 2026-11-07 14:18 «이어서 20/40 풀/엠티 등 조건마다 맞게»)
const mixed = clone(); mixed[2].iso = '45G1'; mixed[3].iso = '45G1'; mixed[1].fe = 'E'; mixed[4].pod = 'KRPTK';
const sp = buildInspectionListDoc(mixed, 'discharge', voyage.info, [], { appendix: false, submit: true, marks: mk });
const spw = buildInspectionListDoc(JSON.parse(JSON.stringify(mixed)), 'discharge', voyage.info, [], { appendix: false });
const mark4 = (h) => (h.match(/<span style="font-weight:bold">✔\d?<\/span>/g) || []).length;
ok(sp.splits.size && mark4(sp.splits.size) === 3, '20/40 판 — 검수한 컨 세 줄 모두 ✔');
ok(sp.splits.size && /20피트 \d+대/.test(sp.splits.size) && /40피트 \d+대/.test(sp.splits.size), '20/40 판 — 조각 이름(머리줄)이 그대로');
const legendSum = (h) => [...h.matchAll(/class="plegend">([^<]*)</g)].map((m) => [...m[1].matchAll(/(\d+)대/g)].reduce((a, x) => a + (+x[1]), 0));
ok(sp.splits.size && legendSum(sp.splits.size).reduce((a, b) => a + b, 0) === 3, '20/40 판 — 조각별 범례 대수의 합이 검수 3대(판마다 그 조각의 컨만 센다)');
ok(sp.splits.fe && mark4(sp.splits.fe) === 3, '풀/엠티 판 — 검수한 컨 세 줄 모두 ✔');
ok(['cont', 'size', 'fe', 'port'].every((k) => !sp.splits[k] || (/class="plegend"/.test(sp.splits[k]) && /✔/.test(sp.splits[k]))), '네 판 모두 범례와 ✔가 있다');
ok(['cont', 'size', 'fe', 'port'].every((k) => !spw.splits[k] || (!/✔/.test(spw.splits[k]) && !/class="plegend"/.test(spw.splits[k]))), '작업용 네 판에는 표기가 없다');
const src = fs.readFileSync('src/inspectionList.js', 'utf8');
ok(/검수\(호기 이름\)/.test(src) && /검수리스트\$\{d\.marks \? '_제출용' : ''\}/.test(src), '엑셀(CSV)에도 «검수(호기 이름)» 열과 제출용 파일 이름');
const hub = fs.readFileSync('src/components/PrintHubModal.jsx', 'utf8');
ok(/handlePrintInspection\(true\)/.test(hub) && /검수 리스트 \(제출용\)/.test(hub) && /inspectionMarksOf\(voyage, mode\)/.test(hub), '출력 센터에 «검수 리스트 (제출용)» 단추');
ok(/openInspectionListPrint\(ptkContainers, mode, voyageInfo, \[\], \{ appendix: false, submit: true, marks: _marks \}\)/.test(hub), '제출용은 별첨·시프팅 없이 같은 목록으로 연다');
const help = fs.readFileSync('src/data/helpData.js', 'utf8');
ok(/4\.75~ \*\*📋 검수 리스트 \(제출용\)\*\*/.test(help), '매뉴얼에 제출용 설명');
console.log(`${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
// 4.75 재배포 — GitHub Pages 배포 시간 초과 복구용 한 줄, 동작 변경 없음.
