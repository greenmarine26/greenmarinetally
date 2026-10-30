// 수석 리퍼 온도 리스트 4.57 연막검사 — 소수점 한 자리 · 좌우 줄 수 · 확인자/시각 체크 · 서명란 고정 · 엑셀 숫자 칸 · 실제 A4 PDF 쪽 수
//   검수사 2026-10-30 «리스트 셋팅 실제 세 온도 · A4 세로 한 장 · 소수점 한자리 · 확인자는 체크했을 때만 · 사인 자리는 갯수와 상관없이 항상 고정»
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMPD = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm') ? '/dev/shm' : os.tmpdir(), 'smokerfl-'));
const OUT = path.join(TMPD, 'b.cjs');
const ENTRY = path.join(TMPD, 'entry.js');
fs.writeFileSync(ENTRY, `export * from ${JSON.stringify(path.join(ROOT, 'src/reeferList.js'))};\nexport { generateReeferExcel } from ${JSON.stringify(path.join(ROOT, 'src/tallyExcel.js'))};\n`);
try {
  execSync(`npx esbuild ${JSON.stringify(ENTRY)} --bundle --platform=node --format=cjs --outfile=${JSON.stringify(OUT)} --loader:.js=jsx --jsx=automatic --log-level=error`, { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('✗ 번들 실패'); process.exit(1); }
const M = require(OUT);

let n = 0; let bad = 0;
const check = (name, cond, extra) => { n += 1; if (cond) console.log('  ✓ ' + name); else { bad += 1; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); } };
const done = () => { console.log(bad ? `\n✗ ${bad}/${n} 실패` : `\n리퍼 리스트 4.57 — ${n}/${n} 통과`); fs.rmSync(TMPD, { recursive: true, force: true }); process.exit(bad ? 1 : 0); };

(async () => {
  //  ① 온도 표기 — 소수점 한 자리
  const t = M.temp1;
  check('온도는 소수점 한 자리 — -20 → -20.0 · 0 → 0.0 · 7 → 7.0 · -2.55 는 반올림', t('-20') === '-20.0' && t('0') === '0.0' && t(7) === '7.0' && t('-18.0') === '-18.0' && /^-2\.[56]$/.test(t('-2.55')), [t('-20'), t('0'), t(7), t('-2.55')].join(' '));
  check('단위가 붙어도 읽는다(-18.0℃) · -0.04 는 «-0.0» 이 아니라 0.0', t('-18.0℃') === '-18.0' && t('-0.04') === '0.0', [t('-18.0℃'), t('-0.04')].join(' '));
  check('EDI 의 «+1» 같은 부호 붙은 값도 1.0 으로 읽는다', t('+1') === '1.0' && t('+7.5') === '7.5' && M.tempNum('+1') === 1);
  check('빈 값은 빈 문자열 · 숫자가 아니면 원문 그대로(모르는 것을 지어내지 않는다)', t('') === '' && t(null) === '' && t('N/A') === 'N/A');

  //  ② 목록 — 풀 리퍼만 · 위치순
  const mk = (cn, bay, row, tier, extra = {}) => ({ cn, bay, row, tier, tp: '40HR', fe: 'F', rf: true, tmp: '-18', rfSet: '-18', rfAct: '-17.9', rfCheckedBy: '김성일', rfCheckedAt: 1793314887306, ...extra });
  const base = [mk('AAAU1111111', '18', '02', '82'), mk('BBBU2222222', '10', '00', '06'), mk('CCCU3333333', '', '', ''), mk('DDDU4444444', '10', '00', '82'),
    mk('EEEU5555555', '12', '02', '82', { fe: 'E' }), { cn: 'FFFU6666666', fe: 'F', tp: '40GP', bay: '01', row: '01', tier: '02' }];
  const rows = M.reeferListRows(base);
  check('풀 리퍼만 — 공 리퍼(E)·일반 컨은 빠진다', rows.length === 4 && !rows.some((r) => r.cn === 'EEEU5555555' || r.cn === 'FFFU6666666'), rows.map((r) => r.cn).join());
  check('위치순(베이-열-단) · 위치 없는 컨은 맨 뒤', rows.map((r) => r.cn).join() === 'BBBU2222222,DDDU4444444,AAAU1111111,CCCU3333333', rows.map((r) => r.cn).join());

  //  ③ 인쇄 쪽 — STMJ 와 같은 78대
  const big = Array.from({ length: 78 }, (_, i) => ({ cn: 'TEST' + String(1000000 + i), iso: '40HR', pos: String(10 + (i >> 4)).padStart(2, '0') + '-00-' + String(i % 90).padStart(2, '0'), tmp: '-18', set: '-18', act: '-17.9', by: '김성일', at: 1793314887306 }));
  const h1 = M.generateReeferListPages(big, { name: 'STMJ', voy: '2667E', modeLabel: '양하', date: '2026-10-30' }, {});
  const pages1 = h1.split('<div class="page"').length - 1;
  const tbls = h1.split('<table class="two"').slice(1).map((x) => (x.split('</table>')[0].match(/<tr/g) || []).length - 1);
  check('78대는 한 쪽 · 좌우 두 줄이 39 / 39 로 같다', pages1 === 1 && tbls.length === 2 && tbls[0] === 39 && tbls[1] === 39, JSON.stringify({ pages1, tbls }));
  check('홀수(77대)는 왼쪽이 한 줄 많다 39 / 38', (() => { const h = M.generateReeferListPages(big.slice(0, 77), {}, {}); const a = h.split('<table class="two"').slice(1).map((x) => (x.split('</table>')[0].match(/<tr/g) || []).length - 1); return a[0] === 39 && a[1] === 38; })());
  check('온도 칸이 전부 소수점 한 자리(-18.0 · -17.9)이고 -18 은 없다', /<td class="n">-18\.0<\/td>/.test(h1) && /-17\.9/.test(h1) && !/<td class="n">-18<\/td>/.test(h1));
  check('확인자·확인 시각 열은 체크 안 하면 없다(자료에는 이름이 있어도)', !/확인자/.test(h1) && !/확인 시각/.test(h1) && !/김성일/.test(h1));
  const hBy = M.generateReeferListPages(big, {}, { by: true });
  check('확인자 체크 → 열과 이름이 나온다 · 시각은 여전히 없다', /<th class="c-by">확인자/.test(hBy) && /김성일/.test(hBy) && !/확인 시각/.test(hBy));
  const hAt = M.generateReeferListPages(big, {}, { by: true, at: true });
  const pagesAt = hAt.split('<div class="page"').length - 1;
  check('확인 시각까지 넣으면 한 줄 배치(쪽당 40대)로 78대가 2쪽이다 · 시각은 한국시각 «10-30 08:01»', pagesAt === 2 && /<table class="one"/.test(hAt) && /10-30 08:01/.test(hAt), String(pagesAt));
  check('서명란은 쪽마다 있고 CHIEF CHECKER · CHIEF OFFICER 만 — 이름이 없다', (h1.match(/CHIEF CHECKER/g) || []).length === 1 && (h1.match(/CHIEF OFFICER/g) || []).length === 1 && (hAt.match(/CHIEF OFFICER/g) || []).length === 2 && /<div class="ln l">CHIEF CHECKER<\/div>/.test(h1));
  const hFew = M.generateReeferListPages(big.slice(0, 3), {}, {});
  check('대수가 적어도(3대) 서명란이 같은 모양으로 붙는다', /<div class="sign"><div class="ln l">CHIEF CHECKER<\/div><div class="ln r">CHIEF OFFICER<\/div><\/div>/.test(hFew));

  //  ④ 어긋난 줄 강조
  const odd = big.slice(0, 5).map((r) => ({ ...r }));
  odd[1].set = '-5';                 // 리스트(-18) ≠ 셋팅(-5)
  odd[3].act = '-12.0';              // 실제가 셋팅(-18)과 6도 차이
  const hOdd = M.generateReeferListPages(odd, {}, {});
  check('리스트≠셋팅 · 실제−셋팅 3도 이상인 줄만 붉다(2줄) · 강조를 끄면 0줄', (hOdd.match(/<tr class="bad"/g) || []).length === 2 && (M.generateReeferListPages(odd, {}, { hi: false }).match(/<tr class="bad"/g) || []).length === 0);
  check('어긋난 칸에 테두리 표시(hit) — 1번 줄은 셋팅·실제 둘 다(실제 -17.9 가 셋팅 -5 와 12.9 차이) · 3번 줄은 실제만 = 3칸', (hOdd.match(/class="n hit"/g) || []).length === 3);

  //  ⑤ 창 문서 — 체크 세 칸과 단추
  const doc = M.generateReeferListHTML(big, { name: 'STMJ' }, { by: false, at: false, hi: true });
  check('창 위에 체크 세 칸(확인자·시각·강조)과 인쇄·엑셀·닫기', /id="rfBy"/.test(doc) && /id="rfAt"/.test(doc) && /id="rfHi" checked/.test(doc) && /window\.print\(\)/.test(doc) && /__exportReeferXlsx/.test(doc) && /window\.close\(\)/.test(doc));
  check('@page 는 A4 세로', /@page \{ size: A4 portrait/.test(doc));

  //  ⑥ 엑셀 — 숫자 칸 · 0.0 서식 · 굴림체 · 확인자 열은 체크했을 때만
  const ExcelJS = require(path.join(ROOT, 'node_modules/exceljs'));
  const readBuf = async (buf) => { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf); return wb.worksheets[0]; };
  const x0 = await M.generateReeferExcel(odd, { name: 'STMJ', voy: '2667E', modeLabel: '양하', date: '2026-10-30' }, { download: false });
  const ws0 = await readBuf(x0.buf);
  const hdr0 = ws0.getRow(4).values.slice(1);
  check('엑셀 머리 — 순번·컨테이너·규격·위치·리스트(EDI) 온도·셋팅온도·실제온도 (확인자 없음)', hdr0.join('|') === '순번|컨테이너|규격|위치|리스트(EDI) 온도|셋팅온도|실제온도', hdr0.join('|'));
  const c5 = ws0.getRow(5).getCell(5);
  check('온도는 숫자 칸 + 표시형식 0.0 (-18 → -18.0)', typeof c5.value === 'number' && c5.value === -18 && c5.numFmt === '0.0', JSON.stringify([c5.value, c5.numFmt]));
  check('굴림체 10 · 어긋난 칸은 붉은 글씨', ws0.getRow(5).getCell(2).font.name === '굴림체' && ws0.getRow(5).getCell(2).font.size === 10 && ws0.getRow(6).getCell(6).font.color && ws0.getRow(6).getCell(6).font.color.argb === 'FFB42318');
  check('엑셀 선박명 머리 줄', /STMJ 2667E 양하/.test(String(ws0.getRow(1).getCell(1).value)));
  const x1 = await M.generateReeferExcel(odd, { name: 'STMJ' }, { by: true, at: true, download: false });
  const ws1 = await readBuf(x1.buf);
  check('확인자·확인 시각 체크 → 열이 생기고 값이 들어간다', ws1.getRow(4).values.slice(1).join('|').endsWith('확인자|확인 시각') && ws1.getRow(5).getCell(8).value === '김성일' && /^10-30 /.test(String(ws1.getRow(5).getCell(9).value)));

  //  ⑦ 배선 — 소스 확인
  const modal = fs.readFileSync(path.join(ROOT, 'src/components/ReeferMemoModal.jsx'), 'utf8');
  const hub = fs.readFileSync(path.join(ROOT, 'src/components/PrintHubModal.jsx'), 'utf8');
  check('리퍼 확인 창에 «리스트 출력» 단추 · 출력 센터에 «리퍼 온도 리스트»(수석)', /data-testid="reefer-list-print"/.test(modal) && /openReeferListPrint\(reeferListRows\(containers\)/.test(modal) && /data-testid="hub-reefer"/.test(hub) && /chiefView && \(\s*<button[\s\S]{0,400}reeferListRows\(allContainers\)/.test(hub));
  check('풀 리퍼 판정은 한 벌 — 모달이 reeferList.js 의 판정을 가져다 쓴다', /const isReefer = isReeferTarget;/.test(modal) && !/const rf = isReeferContainer\(c\);\s*\n\s*if \(!rf\) return false;\s*\n\s*if \(reeferTempExempt/.test(modal));

  //  ⑧ 실제 A4 — 78대가 한 쪽 · 서명줄 위치는 대수와 무관(고정)
  let chromium = null;
  try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }
  if (!chromium) { check('playwright 가 있다(실제 A4 PDF 로 쪽 수·서명 위치를 잰다)', false, '없음'); return done(); }
  const br = await chromium.launch();
  const pg = await br.newPage();
  const pdfPages = async (html) => {
    await pg.setContent(html, { waitUntil: 'load' });
    const buf = await pg.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    return (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  };
  const signTop = async (html) => {
    await pg.setContent(html, { waitUntil: 'load' });
    return pg.evaluate(() => { const p = document.querySelector('.page').getBoundingClientRect(); const l = document.querySelector('.sign .l').getBoundingClientRect(); const r = document.querySelector('.sign .r').getBoundingClientRect(); return { y: Math.round((l.top - p.top) * 10) / 10, xl: Math.round((l.left - p.left) * 10) / 10, xr: Math.round((r.left - p.left) * 10) / 10 }; });
  };
  const pBig = await pdfPages(M.generateReeferListHTML(big, { name: 'STMJ', voy: '2667E' }, {}));
  check('78대 A4 PDF 는 정확히 한 쪽이다', pBig === 1, String(pBig));
  const pAt = await pdfPages(M.generateReeferListHTML(big, { name: 'STMJ' }, { by: true, at: true }));
  check('확인 시각을 넣은 78대는 A4 PDF 두 쪽이다', pAt === 2, String(pAt));
  const p80 = await pdfPages(M.generateReeferListHTML(big.concat(big.slice(0, 2)), {}, {}));
  check('80대(한 쪽 상한)도 한 쪽이다', p80 === 1, String(p80));
  const s78 = await signTop(M.generateReeferListHTML(big, {}, {}));
  const s3 = await signTop(M.generateReeferListHTML(big.slice(0, 3), {}, {}));
  const s40 = await signTop(M.generateReeferListHTML(big.slice(0, 40), {}, {}));
  check('서명줄 위치는 대수와 상관없이 같다(3대 · 40대 · 78대)', JSON.stringify(s78) === JSON.stringify(s3) && JSON.stringify(s78) === JSON.stringify(s40), JSON.stringify([s3, s40, s78]));
  const fit = await (async () => { await pg.setContent(M.generateReeferListHTML(big, {}, {}), { waitUntil: 'load' }); return pg.evaluate(() => { const p = document.querySelector('.page'); const t = [...document.querySelectorAll('.page table')].map((x) => x.getBoundingClientRect().bottom); const s = document.querySelector('.sign').getBoundingClientRect().top; return { over: p.scrollHeight > p.clientHeight + 1, tableBottom: Math.max(...t), signTop: s }; }); })();
  check('표가 서명란을 침범하지 않고 쪽 밖으로 넘치지 않는다', !fit.over && fit.tableBottom <= fit.signTop + 1, JSON.stringify(fit));
  //  ⑧ 4.57 감사 수리 — 위치는 실적 먼저 · 셋팅은 rfSet 없으면 리스트 · «리스트대로» 복사값은 실제가 아니다 · 3.0도 경계 · 단위는 끝에서만
  const rp = M.reeferListRows([{ cn: 'PPPU1000001', fe: 'F', rf: true, tp: '40HR', bay: '18', row: '02', tier: '82', bay_actual: '20', row_actual: '02', tier_actual: '84', tmp: '-18' }]);
  check('위치는 실적(bay_actual)이 계획보다 먼저다 — 20-02-84', rp[0] && rp[0].pos === '20-02-84', rp[0] && rp[0].pos);
  const rz = M.reeferListRows([{ cn: 'PPPU1000002', fe: 'F', rf: true, tp: '40HR', bay: '18', row: '02', tier: '82', deckPos: 'C_8_21', tmp: '-18' }]);
  check('덱플랜 좌표(deckPos)가 있으면 그것이 먼저다', rz[0] && rz[0].pos === 'C_8_21', rz[0] && rz[0].pos);
  const rs = M.reeferListRows([{ cn: 'PPPU1000003', fe: 'F', rf: true, tp: '40HR', tmp: '-18', rfSrc: 'list', rfSet: '-18', rfAct: '-18' }, { cn: 'PPPU1000004', fe: 'F', rf: true, tp: '40HR', tmp: '-20' }]);
  check('rfSrc=list 로 베낀 값은 실제온도로 안 나간다 · rfSet 이 없으면 셋팅은 리스트 온도', rs.find((r) => r.cn === 'PPPU1000003').act === '' && rs.find((r) => r.cn === 'PPPU1000004').set === '-20', JSON.stringify(rs));
  check('실제−셋팅이 정확히 3.0 이면 붉다(부동소수점 경계) · 2.9 는 아니다', M.reeferRowFlags({ tmp: '-18', set: '-17.9', act: '-14.9' }).actBad === true && M.reeferRowFlags({ tmp: '-18', set: '-18', act: '-15.1' }).actBad === false);
  check('리스트≠셋팅은 화면 한 자리 눈금으로 — 0.04 차이는 같은 값, 0.1 차이는 붉다', M.reeferRowFlags({ tmp: '-18', set: '-18.04', act: '' }).setBad === false && M.reeferRowFlags({ tmp: '-18', set: '-17.9', act: '' }).setBad === true);
  check('셋팅이 비면 실제 판정을 켜지 않는다(리스트 온도를 셋팅으로 쓰는 건 행 만들 때)', M.reeferRowFlags({ tmp: '-18', set: '', act: '-10' }).actBad === false);
  check('단위는 끝에서만 — «1C8»·«1 8» 은 숫자가 아니다 · 전각 «１８»·«18,5»·«-.5» 는 읽는다', M.tempNum('1C8') === null && M.tempNum('1 8') === null && M.tempNum('１８') === 18 && M.tempNum('18,5') === 18.5 && M.tempNum('-.5') === -0.5 && M.tempNum('-18 ℃') === -18 && M.tempNum('5도') === 5);
  check('HTML 은 따옴표까지 이스케이프', !/<img/.test(M.generateReeferListPages([{ cn: 'X"><img onerror=1>', iso: '', pos: '', tmp: '-18' }], {}, {})) );
  await br.close();
  done();
})().catch((e) => { console.error('✗ 연막검사 예외', e); try { fs.rmSync(TMPD, { recursive: true, force: true }); } catch (x) { /* */ } process.exit(1); });
