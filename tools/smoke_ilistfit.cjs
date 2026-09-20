// 검수 리스트 «모양» 연막검사 (3.45) — 크로뮴으로 실제로 그려 **칸이 넘치는가**를 자로 잰다.
//   ⚠ 이 눈이 없어서 3.45 초판이 두 번 샜다.
//     ①머리 8칸·몸 7칸으로 표가 통째로 어긋난 채 문자열 검사 19항이 전부 통과했다.
//     ②table-layout:fixed 를 넣으며 순번 칸 4% 를 그대로 둬 실항차 613줄 중 474줄의 순번이 괘선을 물었다.
//   HTML 문자열만 파는 검사는 폭을 못 본다 — 그래서 여기서는 브라우저에 물어본다.
//   검수사 2026-09-14 «DG와 중복이 될경우 동적 축소로 둘다 표기 되어야 합니다» = **한 글자도 잘리면 안 된다**.
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
global.window = { addEventListener() {}, open: () => null };
global.document = { createElement: () => ({ style: {} }), addEventListener() {} };
const M = require(path.resolve(OUT));
const fx = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/' + n), 'utf8'));
const findCn = (o, w, d = 0) => {
  if (!o || typeof o !== 'object' || d > 5) return null;
  if (o.cn === w) return o;
  for (const k of Object.keys(o)) { const r = findCn(o[k], w, d + 1); if (r) return r; }
  return null;
};

let n = 0, bad = 0;
const ok = (name, cond, detail = '') => {
  n += 1;
  if (cond) console.log(`  ✔ ${name}`);
  else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); }
};

const FX = fx('xrayseal_pcsz.json');
const rows = Object.entries(FX.edi).map(([k, e]) => {
  const cn = String(e.cn || k).toUpperCase();
  const r = Object.assign({}, e, { cn });
  if (FX.xrayList[cn]) { r._xray = true; r._xraySealNo = String((FX.xraySeals[cn] || {}).seal || '').trim(); }
  return r;
}).filter((r) => String(r.pod || '').toUpperCase().startsWith('KRPT'));
//  최악의 비고를 실데이터로 끼운다 — OBWH 2731E SPRU1000458(FR·OOG·실치수)에 X-RAY·DG·긴급·수화물·시프팅을 겹친다
const worst = Object.assign({}, findCn(fx('liveboard_obwh.json'), 'SPRU1000458'),
  { pod: 'KRPTK', _xray: true, _xraySealNo: '523533', dg: true, dgc: '9', un: '3480', pg: '2', _urgent: true, _lugg: true, _shift: true });
rows.unshift(worst);
//  ★ 3.53-10 — 긴 실번호(ATPR 2642E 실측 SINOKOR011526 · 13자)를 끼운다. 종전 M5.52 는 10자로 잘랐다 — 종이에 «SINOKOR011».
rows.splice(1, 0, Object.assign({}, rows[1] || rows[0], { cn: 'HALU2076346', sl: 'SINOKOR011526', pod: 'KRPTK', _xray: false }));
rows.splice(2, 0, Object.assign({}, rows[2] || rows[0], { cn: 'HALU2081229', sl: 'SINOKOR01152612', pod: 'KRPTK', _xray: false }));
//  순번이 세 자리가 되게 — 한 선사 100대를 넘기면 평택 실항차의 기본값이다
//  별첨2 시프팅 표도 같이 그린다 — 이 표는 colgroup 이 따로라 fixed 아래서 모양이 바뀔 자리다
const shift = rows.slice(0, 14).map((r, i) => ({ cn: r.cn, iso: r.iso, pod: 'KRPTK', from: '00' + (i + 6) + '0482', to: '00' + (i + 9) + '0688' }));
const html = M.generateInspectionListHTML(rows, 'discharge', { vsl: 'PCSZ', vslFull: 'PACIFIC SHENZHEN', voy: '2620E' }, shift);
//  ★ 두 번째 배 — OBWH 2731E. 여기에 OOG 실치수처럼 **실제로 긴 비고**가 있다.
//    PCSZ 만으로는 폭 셈법을 옛 1:2 로 되돌려도 검사가 안 걸린다(긴 비고가 24칸뿐이라서).
const obAll = [];
(function walk(o, d) {
  if (!o || typeof o !== 'object' || d > 5) return;
  if (o.cn && o.iso !== undefined) obAll.push(o);
  for (const k of Object.keys(o)) walk(o[k], d + 1);
}(fx('liveboard_obwh.json'), 0));
const obRows = obAll.filter((r, i) => obAll.findIndex((x) => x.cn === r.cn) === i).map((r) => Object.assign({}, r, { pod: 'KRPTK' }));
const html2 = M.generateInspectionListHTML(obRows, 'discharge', { vsl: 'OBWH', vslFull: 'OCEAN BLUE', voy: '2731E' }, []);

const tmp = path.join(process.env.TMPDIR || '/dev/shm/hometmp', `_ilfit_${process.pid}.html`);
const tmp2 = path.join(process.env.TMPDIR || '/dev/shm/hometmp', `_ilfit2_${process.pid}.html`);
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, html);
fs.writeFileSync(tmp2, html2);

const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome']
  .find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });

(async () => {
  let pw;
  //  ⛔ 못 돌리면 «건너뜀» 이 아니라 **실패**다(규범 §4-3) — 모양을 못 재고 올리는 일이 이 판의 사고였다.
  try { pw = require('playwright'); } catch (e) { console.log('  ✘ playwright 가 없다 — 모양을 잴 수 없으면 올리지 않는다'); process.exit(1); }
  if (!CHROME) { console.log('  ✘ 크로뮴이 없다 — 모양을 잴 수 없으면 올리지 않는다'); process.exit(1); }
  const b = await pw.chromium.launch({ executablePath: CHROME });
  //  ⚠ **A4 인쇄 폭으로 재야 한다.** 플레이라이트 기본 1280px 로 재면 비고 칸이 62mm(진짜는 37mm)가 되어
  //    1.68배 넓은 자로 판정한다 — 4차 감사에서 이 때문에 실번호 칸 41개 괘선 침범을 «0» 이라고 보고했다.
  //    210mm − @page 여백 0.4cm×2 = 202mm · 96dpi → 763px.
  const A4_PX = Math.round((210 - 4 - 4) / 25.4 * 96);
  const pg = await b.newPage({ viewport: { width: A4_PX, height: 1200 } });
  const MEASURE = () => {
    const over = (el) => el.scrollWidth > el.clientWidth + 0.5;
    const out = { cells: {}, heads: [], pages: 0, pageOver: 0, bodyX: false, maxIdx: 0 };
    const NAME = ['순번', '컨번호', '실번호', '규격', 'F/E', '비고', '선사'];
    document.querySelectorAll('table.ilist').forEach((t) => {
      const cols = t.querySelectorAll('colgroup col').length;
      out.heads.push({ th: t.querySelectorAll('th').length, col: cols,
        sum: [...t.querySelectorAll('colgroup col')].reduce((a, c) => a + (parseFloat(c.style.width) || 0), 0) });
      t.querySelectorAll('tbody tr').forEach((tr) => {
        [...tr.children].forEach((td, i) => {
          const key = NAME[i] || ('칸' + i);
          if (!out.cells[key]) out.cells[key] = { n: 0, over: 0, worst: '' };
          out.cells[key].n += 1;
          if (over(td)) { out.cells[key].over += 1; if (!out.cells[key].worst) out.cells[key].worst = td.textContent.trim().slice(0, 46); }
          if (i === 0) { const v = parseInt(td.textContent, 10); if (v > out.maxIdx) out.maxIdx = v; }
        });
      });
    });
    //  ⚠ .ipage 는 높이가 자동이라 scrollHeight 가 clientHeight 를 **절대** 안 넘는다 —
    //    종전 검사는 PER_COL=200(한 장이 A4 2.5배)도 통과했다. 실높이를 mm 로 재서 A4 와 맞댄다.
    const MM = 25.4 / 96;                       // px → mm
    const A4 = 297 - 4 - 4;                     // @page margin 0.4cm 위아래
    out.pageMm = [];
    document.querySelectorAll('.ipage').forEach((p) => {
      out.pages += 1;
      const mm = p.getBoundingClientRect().height * MM;
      out.pageMm.push(+mm.toFixed(1));
      if (mm > A4) out.pageOver += 1;
    });
    out.a4 = A4;
    //  비고는 이제 접히므로 scrollWidth 로는 아무것도 못 잡는다 —
    //  «내가 예상한 줄수» 와 «브라우저가 그린 줄수» 를 맞댄다. 예상이 적으면 배분이 어긋난다.
    out.memo = [];
    document.querySelectorAll('td.memo').forEach((td) => {
      const lh = parseFloat(getComputedStyle(td).lineHeight) || parseFloat(getComputedStyle(td).fontSize);
      out.memo.push({ t: td.textContent.trim(), cls: td.className, lines: Math.round(td.getBoundingClientRect().height / lh) });
    });
    out.bodyX = document.body.scrollWidth > document.body.clientWidth + 1;
    return out;
  };
  await pg.goto('file://' + tmp);
  await pg.emulateMedia({ media: 'print' });
  const rA = await pg.evaluate(MEASURE);
  await pg.goto('file://' + tmp2);
  await pg.emulateMedia({ media: 'print' });
  const rB = await pg.evaluate(MEASURE);
  await b.close();
  try { fs.unlinkSync(tmp); fs.unlinkSync(tmp2); } catch (e) {}
  //  두 배를 합쳐 본다 — 한 배에서만 나는 결함을 놓치지 않는다
  const r = {
    cells: {}, heads: rA.heads.concat(rB.heads), pages: rA.pages + rB.pages,
    pageOver: rA.pageOver + rB.pageOver, pageMm: rA.pageMm.concat(rB.pageMm), a4: rA.a4,
    memo: rA.memo.concat(rB.memo), bodyX: rA.bodyX || rB.bodyX, maxIdx: Math.max(rA.maxIdx, rB.maxIdx),
  };
  [rA, rB].forEach((x) => Object.entries(x.cells).forEach(([k, v]) => {
    if (!r.cells[k]) r.cells[k] = { n: 0, over: 0, worst: '' };
    r.cells[k].n += v.n; r.cells[k].over += v.over;
    if (!r.cells[k].worst && v.worst) r.cells[k].worst = v.worst;
  }));

  console.log(`\n── 크로뮴 실측 (PCSZ 2620E ${rows.length}대 + OBWH 2731E ${obRows.length}대 · A4 인쇄 폭 ${A4_PX}px · 순번 최대 ${r.maxIdx})`);
  ok('순번이 세 자리까지 간다 — 그 폭을 재는 검사다', r.maxIdx >= 100, `최대 ${r.maxIdx}`);
  Object.entries(r.cells).filter(([k]) => k !== '비고').forEach(([k, v]) => {
    ok(`«${k}» 칸 ${v.n}개가 한 칸도 안 넘친다`, v.over === 0, `${v.over}개 넘침 · 예 「${v.worst}」`);
  });
  ok(`표 ${r.heads.length}개 모두 머리칸 수 == colgroup 칸 수 · 폭 합 100%`,
     r.heads.length > 0 && r.heads.every((h) => h.th === h.col && Math.round(h.sum) === 100),
     JSON.stringify(r.heads.filter((h) => h.th !== h.col || Math.round(h.sum) !== 100).slice(0, 3)));
  //  ⛔ 이 항이 이번 판의 진짜 문지기다 — 한 장이 A4 를 넘으면 줄이 장 경계에서 갈라진다
  const worstMm = Math.max(...r.pageMm);
  ok(`페이지 ${r.pages}장이 A4 인쇄 영역 ${r.a4}mm 를 안 넘는다 (최대 ${worstMm}mm)`, r.pageOver === 0,
     `${r.pageOver}장 넘침 · ${r.pageMm.filter((m) => m > r.a4).join(', ')}mm`);
  //  예상 줄수 == 그려진 줄수. 예상이 **적으면** 단이 넘쳐 종이가 한 장 더 나온다.
  const under = r.memo.filter((m) => m.t && M.memoFitOf(m.t).lines < m.lines);
  ok(`비고 ${r.memo.filter((m) => m.t).length}칸 — 예상 줄수가 실제보다 적은 칸이 없다`, under.length === 0,
     under.slice(0, 3).map((m) => `「${m.t.slice(0, 40)}」 예상 ${M.memoFitOf(m.t).lines} < 실제 ${m.lines}`).join(' · '));
  const shrunk = r.memo.filter((m) => /m\d/.test(m.cls)).length;
  const wrapped = r.memo.filter((m) => m.lines > 1).length;
  ok('6pt 아래로는 안 줄인다 — 더 줄이는 대신 줄을 바꾼다', !/m[345]/.test(r.memo.map((m) => m.cls).join(' ')),
     `축소 ${shrunk}칸 · 두 줄 이상 ${wrapped}칸`);
  ok('종이가 가로로 안 넘친다', !r.bodyX);
  ok('3.53-10 — 실번호 13자가 한 글자도 안 잘린다(SINOKOR011526)', />SINOKOR011526<\/td>/.test(html), '종이에 SINOKOR011526 이 없다');
  ok('3.53-10 — 실번호 15자도 안 잘린다', html.includes('SINOKOR01152612'));
  ok('3.53-10 — 10자 넘는 실번호는 s2(6pt) 칸', /class="sl s2">SINOKOR011526</.test(html) && !/class="sl s2">010145</.test(html));

  console.log(bad ? `\n✗ 검수 리스트 모양 연막검사 실패 ${bad}건 / ${n}` : `\n✓ 검수 리스트 모양 연막검사 통과 (${n}항)`);
  process.exit(bad ? 1 : 0);
})();
