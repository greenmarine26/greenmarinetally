// 3.62 연막검사 — 검수 리스트 장 나누기(이어서·20/40·풀/엠티·포트별)와 묶음 경계선을 실자료로 잰다.
//   검수사 2026-09-27 «버튼 선택이 좋을꺼 같습니다. 20/40 풀/엠티 포트별 TMPZ처럼 포트가 2개일때» ·
//   «1. 20/40 풀먼저 엠티뒤에 2.풀엠티 20먼저 40뒤에 3포트별 지금과 같은데 포트별로 나눔» · «20/40 적용이 좋을듯 합니다» ·
//   «경계선을 만들어 주셔야 합니다. 20풀에서 20엠티로 바뀔때 20에서 40으로 넘어갈때 일반에서 특수로 넘어 갈때 두줄 경계선이라든지 굵은선 처리».
//   실자료 — tools/fixtures/ilist_split_36200.json(TMPZ 2030W 선적 274대 · MCSN 637N 선적 287대). 실소스를 esbuild 로 묶어 그린 종이를 되읽는다(쓰기 없음).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'ilsplit_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, open: () => null, location: { href: '' } };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
const bundle = (entrySrc, name) => {
  const e = path.join(TMP, name + '.mjs'), o = path.join(TMP, name + '.cjs');
  fs.writeFileSync(e, entrySrc);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  return require(o);
};
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/ilist_split_36200.json'), 'utf8'));

//  종이 한 판(html 조각)을 장·단·줄로 읽는다.
const pagesOf = (html) => html.split(/(?=<div class="ipage")/).filter((x) => x.startsWith('<div class="ipage"')).map((pg) => ({
  tag: ((pg.match(/<span class="modetag">[^<]*<\/span>\s*<b>([^<]*)<\/b>/) || [])[1]) || '',
  no: (pg.match(/· (\d+)\/(\d+)<\/div>/) || []).slice(1).map(Number),
  cols: (pg.match(/<tbody>[\s\S]*?<\/tbody>/g) || []).map((tb) => [...tb.matchAll(/<tr style="background:[^"]+"( class="(gb[12])")?>\s*<td class="no">(\d+)<\/td>\s*<td class="cn">([^<]*)<\/td>/g)].map((m) => ({ edge: m[2] || '', no: +m[3], cn: m[4] }))),
}));
const buttonsOf = (html) => Object.fromEntries([...html.matchAll(/<button type="button" class="btn-split[^"]*" data-k="(\w+)"[^>]*?( disabled)?>([^<]*)<small>([^<]*)<\/small>/g)].map((m) => [m[1], { off: !!m[2], label: m[3], sub: m[4] }]));

try {
  const IL = bundle(`export { generateInspectionListHTML, buildInspectionListDoc, installInspectionSplit } from "${ROOT}/src/inspectionList.js";\n`, 'il');
  const doc = (list, info, mode = 'loading') => IL.buildInspectionListDoc(list.map((c) => ({ ...c })), mode, info, []);
  const gen = (list, info, mode = 'loading') => String(doc(list, info, mode).html || '');

  // ── ① TMPZ 2030W 선적 274대 — 네 판의 장 수와 조각
  {
    const { list, info } = FX.tmpz;
    const D = doc(list, info), html = D.html;
    const V = D.splits, B = buttonsOf(html);
    ok('generateInspectionListHTML = buildInspectionListDoc 의 html(종이 글자는 한 벌)', gen(list, info) === html);
    ok('TMPZ — 인쇄 창에 장 나누기 단추 넷(이어서·20/40·풀/엠티·포트별)', V && ['cont', 'size', 'fe', 'port'].every((k) => B[k]), JSON.stringify(B));
    ok('TMPZ — 단추 장 수 이어서 2 · 20/40 1+1 · 풀/엠티 1+1 · 포트별 1+1+1', B.cont && B.cont.sub === '2장' && B.size.sub === '1+1장' && B.fe.sub === '1+1장' && B.port.sub === '1+1+1장', JSON.stringify(B));
    //  ★ 종이 글자에는 컨번호가 한 번씩만 — 네 판을 문서에 넣으면 «종이에 몇 번 나오나» 를 세는 검사(smoke_fix36004 등)가 깨진다(감사 지적).
    const multi = list.filter((c) => html.split(c.cn).length - 1 !== 1).map((c) => c.cn);
    ok('TMPZ — 종이 글자에 컨번호가 한 번씩만(네 판은 창에 따로 심는다)', !multi.length && !/__ilSplit/.test(html), multi.slice(0, 3).join(','));
    const s1 = html.split('<div id="sheet1"')[1] || '';
    ok('TMPZ — 처음 보이는 본문 = «이어서» 판', V && s1.includes(V.cont.slice(0, 3000)));
    for (const [k, h] of Object.entries(V || {})) {
      const P = pagesOf(h); const rows = P.flatMap((p) => p.cols.flat()); const cns = rows.map((r) => r.cn);
      ok(`TMPZ ${k} — 274대가 한 번씩(빠짐·겹침 0)`, cns.length === 274 && new Set(cns).size === 274 && list.every((c) => cns.includes(c.cn)), `${cns.length}/${new Set(cns).size}`);
      ok(`TMPZ ${k} — 쪽 번호가 1부터 끝까지 이어진다`, P.every((p, i) => p.no[0] === i + 1 && p.no[1] === P.length), P.map((p) => p.no.join('/')).join(' '));
      //  경계선 — 순번이 1로 돌아가는 줄(묶음 첫 줄)마다 경계선, 경계선 있는 줄은 순번 1. 조각 첫 줄은 경계선 없음.
      let prevTag = null, badEdge = [];
      for (const p of P) for (const col of p.cols) for (const r of col) {
        const first = p.tag !== prevTag; prevTag = p.tag;
        if (first) { if (r.edge) badEdge.push('조각 첫 줄 ' + r.cn); continue; }
        if ((r.no === 1) !== !!r.edge) badEdge.push(`${r.cn} 순번 ${r.no} 경계 ${r.edge || '없음'}`);
      }
      ok(`TMPZ ${k} — 묶음이 바뀌는 줄마다 경계선, 그 밖에는 없음`, !badEdge.length, badEdge.slice(0, 4).join(' · '));
    }
    const cont = pagesOf(V.cont).flatMap((p) => p.cols.flat());
    ok('TMPZ 이어서 — 20풀→20엠티 굵은 줄 · 20→40 두 줄 · 40풀→40엠티 굵은 줄', cont.filter((r) => r.edge === 'gb1').length === 2 && cont.filter((r) => r.edge === 'gb2').length === 1,
       `굵은 ${cont.filter((r) => r.edge === 'gb1').length} · 두 줄 ${cont.filter((r) => r.edge === 'gb2').length}`);
    const size = pagesOf(V.size), fe = pagesOf(V.fe), port = pagesOf(V.port);
    ok('TMPZ 20/40 — 머리줄 «20피트 102대» → «40피트 172대»', size.map((p) => p.tag).join('|') === '20피트 102대|40피트 172대', size.map((p) => p.tag).join('|'));
    ok('TMPZ 20/40 — 장 안은 풀 먼저 엠티 뒤(두 줄 경계 없음)', size.every((p) => { const r = p.cols.flat(); const fi = r.findIndex((x) => x.edge === 'gb1'); return !r.some((x) => x.edge === 'gb2') && fi > 0; }));
    ok('TMPZ 풀/엠티 — 머리줄 «풀 115대» → «엠티 159대», 장 안은 20 먼저 40 뒤(두 줄 경계 하나씩)', fe.map((p) => p.tag).join('|') === '풀 115대|엠티 159대' && fe.every((p) => p.cols.flat().filter((x) => x.edge === 'gb2').length === 1), fe.map((p) => p.tag).join('|'));
    ok('TMPZ 포트별 — CNSHA 187대(두 장감)는 20피트·40피트로 나뉘고 CNNGB 87대는 한 장', port.map((p) => p.tag).join('|') === 'CNSHA 20피트 82대|CNSHA 40피트 105대|CNNGB 87대', port.map((p) => p.tag).join('|'));
    ok('TMPZ 포트별 — 포트 장 안의 순번은 묶음마다 1부터', port.every((p) => p.cols.flat()[0].no === 1));
    const unk = list.map((c, i) => (i % 2 ? { ...c, pod: '' } : c));   // 절반의 POD 를 지워 «포트 미상» 이 가장 많게
    const Pu = pagesOf(doc(unk, info).splits.port).map((p) => p.tag);
    ok('포트별 — «포트 미상» 은 대수가 많아도 맨 뒤', /^포트 미상/.test(Pu[Pu.length - 1]) && !/^포트 미상/.test(Pu[0]), Pu.join('|'));

    // 누를 수 없는 단추 — 포트 하나 · 엠티 없음
    const sha = list.filter((c) => c.pod === 'CNSHA'), full = list.filter((c) => String(c.fe || '').toUpperCase() === 'F');
    const Bs = buttonsOf(gen(sha, info)), Bf = buttonsOf(gen(full, info));
    ok('포트가 하나면 포트별 단추는 흐림(해당 없음)', Bs.port && Bs.port.off && Bs.port.sub === '해당 없음' && !Bs.size.off, JSON.stringify(Bs.port));
    ok('엠티가 없으면 풀/엠티 단추는 흐림(해당 없음)', Bf.fe && Bf.fe.off && !Bf.cont.off, JSON.stringify(Bf.fe));

    // 단추를 누르면 본문이 바뀐다(인쇄 창 스크립트를 jsdom 에서 돌린다)
    const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
    const dom = new JSDOM(html);
    dom.window.scrollTo = () => {};   // jsdom 에는 없다 — 인쇄 창에서는 맨 위로 올리는 한 줄
    IL.installInspectionSplit(dom.window, D.splits);   // openInspectionListPrint 가 하는 것과 같은 한 줄
    const d = dom.window.document;
    const cnt = () => d.querySelectorAll('#sheet1 .ipage').length;
    ok('인쇄 창 — 처음엔 이어서 2장', cnt() === 2 && d.querySelector('.btn-split.on').getAttribute('data-k') === 'cont');
    dom.window.__pickSplit('port');
    ok('인쇄 창 — 포트별을 누르면 3장 · 단추가 켜진다', cnt() === 3 && d.querySelector('.btn-split.on').getAttribute('data-k') === 'port' && /CNSHA 20피트 82대/.test(d.getElementById('sheet1').innerHTML));
    dom.window.__pickSplit('cont');
    ok('인쇄 창 — 이어서로 돌아오면 다시 2장', cnt() === 2);
  }

  // ── ② MCSN 637N 선적 287대 — 두 장이 넘는 조각은 고르게, 포트 20/40 은 장이 늘면 안 나눈다
  {
    const { list, info } = FX.mcsn;
    const D = doc(list, info), html = D.html;
    const V = D.splits, B = buttonsOf(html);
    ok('MCSN — 단추 장 수 이어서 2 · 20/40 1+2 · 풀/엠티 1+1 · 포트별 2+1+1+1', B.cont.sub === '2장' && B.size.sub === '1+2장' && B.fe.sub === '1+1장' && B.port.sub === '2+1+1+1장', JSON.stringify(B));
    const size40 = pagesOf(V.size).filter((p) => /^40피트/.test(p.tag));
    const lens = size40.flatMap((p) => p.cols.map((c) => c.length)).filter(Boolean);
    ok('MCSN 20/40 — 40피트 244대 두 장이 180+64 가 아니라 고르게(단 줄 수 차이 작음)', size40.length === 2 && Math.max(...lens) - Math.min(...lens) <= 6 && size40[1].cols.flat().length >= 100, lens.join(','));
    const port = pagesOf(V.port);
    ok('MCSN 포트별 — CNTAO 219대는 20/40 로 나누면 장이 늘어 안 나눔(«CNTAO 219대» 두 장, 고르게)', port.filter((p) => p.tag === 'CNTAO 219대').length === 2 && port[1].cols.flat().length >= 90, port.map((p) => p.tag).join('|'));
    const cont = pagesOf(V.cont);
    //  «이어서» 는 종전처럼 첫 장부터 채운다(고르게 펼치지 않는다) — 첫 장 세 단이 다 45줄 이상(경계선 무게로 한두 줄 덜 들 수 있다).
    ok('MCSN 이어서 — 종전처럼 첫 장부터 채운다(첫 장 세 단 45줄 이상)', cont[0].cols.length === 3 && cont[0].cols.every((c) => c.length >= 45), cont[0].cols.map((c) => c.length).join(','));
  }

  // ── ③ 별첨·CSS 계약
  {
    const src = fs.readFileSync(path.join(ROOT, 'src/inspectionList.js'), 'utf8');
    ok('CSS — 두 줄 경계(gb2 double) · 굵은 경계(gb1) 가 표에 있다', /tr\.gb2 td \{ border-top: [\d.]+pt double/.test(src) && /tr\.gb1 td \{ border-top: [\d.]+pt solid/.test(src));
    ok('별첨이 있으면 본문 끝 장도 넘긴다(#sheet1.more)', /#sheet1\.more > \.ipage:last-child \{ page-break-after: always; \}/.test(src));
    const withSp = FX.tmpz.list.slice(0, 40).map((c, i) => (i < 3 ? { ...c, rf: true, iso: '45R1', fe: 'F', tmp: '-18' } : c));
    const h = gen(withSp, FX.tmpz.info);
    ok('별첨이 있는 배 — #sheet1 에 more 표식', /<div id="sheet1" class="more">/.test(h) && /<!--sheet2-->/.test(h));
  }
} catch (e) {
  bad += 1; console.log('  ✘ 예외 — ' + (e && e.stack || e));
} finally {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (x) { /* 임시 폴더 — 못 지워도 검사 결과와 무관 */ }
}
console.log(bad ? `✗ 3.62 장 나누기 연막검사 ${bad}/${n} 실패` : `✅ 3.62 장 나누기 연막검사 ${n}/${n} 통과`);
process.exit(bad ? 1 : 0);
