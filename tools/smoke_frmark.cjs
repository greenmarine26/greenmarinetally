// 3.43-03 연막검사 — 카고플랜·베이플랜·콘앱이 FR 을 FR 로 그리는가(SWTD 9013E 실데이터, 검수사 «SWTD 카고플랜에서 FR을 OT로 오류 표기 수정바람»).
//   기준표는 코드가 내는 값이 아니라 **자료가 말하는 종류**다 — 양하 ASC 장비코드 FR40·FR20(iso 42PF·22PF) 4대는 FR,
//   OT40(iso 42UT) 1대는 OT, 선적 BAPLIE 4261·2261(선사 리스트 42P1·22P1) 7대는 FR, 2251(오픈탑) 1대는 OT.
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const vm = require('vm');
const bundle = fs.readFileSync(process.argv[2], 'utf8');
const ROOT = path.join(__dirname, '..');
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'frmark_swtd.json'), 'utf8'));
const FR_D = ['CXSU1002075', 'SKHU1640069', 'SKHU4150790', 'SKHU5540670'];   // 양하 FR(42PF·22PF · fr 없음 · oog)
const OT_D = ['SKHU5600608'];                                                 // 양하 OT(42UT)
const FR_L = ['SKHU2840210', 'SKHU4550360', 'SKHU4850264', 'SKHU4150316', 'SKHU5540514', 'GESU7574052', 'SKHU5540710'];   // 선적 FR(4261·2261)
const OT_L = ['SKHU2300248'];                                                 // 선적 오픈탑(2251)
function render(which, mode) {
  return new Promise((res) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const errs = []; dom.window.addEventListener('error', (e) => errs.push(e.message));
    dom.window.__SMOKE_WHICH = which; dom.window.__SMOKE_MODE = mode;
    try { dom.window.eval(bundle); } catch (e) { errs.push('THROW: ' + e.message); }
    setTimeout(() => res({ dom, errs, d: dom.window.document, w: dom.window }), 4000);
  });
}
const cnt = (d, sel) => d.querySelectorAll(sel).length;
(async () => {
  let fail = 0; const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };

  // ① 자료가 픽스처 그대로인가(검사 전제) — FR 4대는 fr 없이 oog 만 있다(사고 모양)
  const dis = FX.discharge, lod = FX.loading;
  ok(Object.keys(dis).length === 859 && Object.keys(lod).length === 105, `픽스처 대수 양하 ${Object.keys(dis).length} · 선적 ${Object.keys(lod).length}`);
  ok(FR_D.every((cn) => dis[cn] && !('fr' in dis[cn]) && dis[cn].oog === true && /^FR/.test(dis[cn].tp)), '양하 FR 4대가 «fr 없음 · oog · tp FR» 사고 모양이다');

  // ② 판정 한 벌 — 실행 결과
  let r = await render('v2', 'discharge');
  const Uf = r.w.__U && r.w.__U.isFlatRackContainer;
  ok(typeof Uf === 'function', 'utils.isFlatRackContainer 가 있다(FR 판정 한 벌)');
  if (typeof Uf === 'function') {
    const frD = Object.values(dis).filter(Uf).map((c) => c.cn).sort();
    ok(JSON.stringify(frD) === JSON.stringify([...FR_D].sort()), `양하 859대 중 FR = ${frD.length}대 ${frD.join(',')}`);
    const frL = Object.values(lod).filter(Uf).map((c) => c.cn).sort();
    ok(JSON.stringify(frL) === JSON.stringify([...FR_L].sort()), `선적 105대 중 FR = ${frL.length}대`);
    //  보관소 전수(활성 15·보관 264항차, 27만 대) 드라이런에서 나온 실제 표기 — 선사 리스트가 FR(42P1·42PE·42PC·22P1…)로 적은 컨의 EDI 표기다.
    const Fi = r.w.__U.isFlatRackIso;
    const yes = ['42PF', '22PF', 'FR40', 'FR20', '4261', '2261', '2263', '226E', '4360', '4363', '436E', '4561', '4563', '20FP', '40FP', '40FR', '20FR', '20FE', '40FE', '42PE', '42PC', '42PL', '45PE', '45PC', '4583', '4283', "40'FR"];
    const no = ['22GP', '45GP', '45G1', '42GP', '22T6', '227E', '22R5', '22RF', '45R1', '4532', '453E', '45GE', '42UT', '2251', '225E', '22UE', '4500', '2200', 'DC20', 'DCHC', 'RFHC', 'OT40', 'TK20', "40'GP", "20'GP", "40'HC", ''];
    const badY = yes.filter((x) => !Fi(x)), badN = no.filter((x) => Fi(x));
    ok(badY.length === 0, `FR 표기를 FR 로 본다 — 놓침 ${badY.join(',') || '0'}`);
    ok(badN.length === 0, `FR 아닌 표기를 FR 로 보지 않는다 — 헛잡음 ${badN.join(',') || '0'}`);
    ok(Uf({ iso: '45GP', fr: true }) === true, '플래그가 있으면 플래그가 이긴다');
  }

  // ③ 카고플랜 칸 — 양하: FR 4대가 FR, OT 는 42UT 1대뿐
  ok(r.errs.length === 0, 'SWTD 양하 카고플랜 렌더 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  const frCells = cnt(r.d, '.cpv2-cell.cpv2-mark-FR'), otCells = cnt(r.d, '.cpv2-cell.cpv2-mark-OT');
  ok(frCells === FR_D.length, `⛔ 양하 카고플랜 FR 칸 ${frCells}개 — FR ${FR_D.length}대가 FR 로 그려져야 한다`);
  ok(otCells === OT_D.length, `⛔ 양하 카고플랜 OT 칸 ${otCells}개 — OT 는 42UT ${OT_D.length}대뿐이어야 한다(FR 이 OT 로 그려지면 5)`);
  //  별첨(인쇄) — 칸과 같은 판정
  const legTxt = [...r.d.querySelectorAll('tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim()).join('|'));
  const frRow = legTxt.find((t) => /^FR\|FR\|/.test(t)), otRow = legTxt.find((t) => /^OT\|OT\|/.test(t));
  ok(!!frRow && /\|4$/.test(frRow), `별첨 FR 줄 — «${frRow || '없음'}» (합계 4 · 20ft 1 · 40ft 3)`);
  ok(!!otRow && /\|1$/.test(otRow), `별첨 OT 줄 — «${otRow || '없음'}» (합계 1)`);

  // ④ 선적 — 플래그 있는 FR 7대는 종전대로 FR, 오픈탑 2251 은 OT
  const rl = await render('v2', 'loading');
  ok(rl.errs.length === 0, 'SWTD 선적 카고플랜 렌더 오류 0' + (rl.errs[0] ? ' — ' + rl.errs[0] : ''));
  const lf = [...rl.d.querySelectorAll('.cpv2-cell.cpv2-mark-FR')].length, lo = [...rl.d.querySelectorAll('.cpv2-cell.cpv2-mark-OT')].length;
  ok(lf === FR_L.length, `선적 카고플랜 FR 칸 ${lf}개(FR ${FR_L.length}대)`);
  ok(lo === OT_L.length, `선적 카고플랜 OT 칸 ${lo}개(오픈탑 ${OT_L.length}대)`);

  // ⑤ 실시간 별첨(legendLiveOf) — 인쇄 별첨과 같은 FR 수
  if (r.w.__U && typeof r.w.__U.legendLiveOf === 'function') {
    const lv = r.w.__U.legendLiveOf(Object.values(dis), 'discharge', {});
    const g = Object.fromEntries(lv.cargos.map(([k, v]) => [k, v.total.n]));
    ok(g.FR === 4 && g.OT === 1, `실시간 별첨 양하 FR ${g.FR} · OT ${g.OT} (4 · 1)`);
    //  감사(3.43-03) — 42PF 는 종전 식(iso[2]==='P')도 FR 로 세서 이 항이 옛 코드를 못 가른다.
    //    셋째 자리가 P 가 아닌 실데이터 FR(TMPZ 2022E 선적 YZCU2300859 · 436E · fr 거짓)을 같이 센다.
    const ex = FX.extra_nonP.rows;
    const lx = r.w.__U.legendLiveOf(ex, 'loading', {});
    const gx = Object.fromEntries(lx.cargos.map(([k, v]) => [k, v.total.n]));
    ok(gx.FR === 1 && !gx['일반'], `실시간 별첨 — 셋째 자리 6 인 FR(436E·fr 거짓)을 FR 로 센다 (FR ${gx.FR || 0} · 일반 ${gx['일반'] || 0})`);
  }

  // ⑥ 맞교환 안내 — FR 을 «OOG(규격초과)» 로 적지 않는다
  if (typeof r.w.__gradeSwap === 'function') {
    const g = r.w.__gradeSwap(dis[FR_D[0]], dis['SKHU8938667']);
    ok(g && g.special === 'FR(플랫랙)', `맞교환 안내 특수 사유 — «${g && g.special}»`);
  }

  // ⑦ 베이플랜(검수앱) — FR 칸이 OOG·△ 로 떨어지지 않는다
  //   감사(3.43-03) — jsdom 은 기본 배율이 작아 칸이 끝4자리만 나와 글자·심볼이 안 그려진다(검사가 공허 통과했다).
  //   칸에 Ctrl+휠을 보내 확대한 뒤 컨마다 글자·심볼·테두리를 단언한다. 확대가 안 되면 건너뛰지 않고 실패다.
  const rb = await render('bayplan', 'discharge');
  ok(rb.errs.length === 0, 'SWTD 양하 베이플랜 렌더 오류 0' + (rb.errs[0] ? ' — ' + rb.errs[0] : ''));
  const cell0 = [...rb.d.querySelectorAll('button')].find((b) => /2075/.test(b.textContent));
  ok(!!cell0, '베이플랜에 CXSU1002075 칸이 있다');
  if (cell0) {
    cell0.dispatchEvent(new rb.w.WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true, deltaY: -800 }));
    await new Promise((res) => setTimeout(res, 2500));
    const btns = [...rb.d.querySelectorAll('button')];
    const look = (cn) => {
      const b = btns.find((x) => x.textContent.includes(cn)); if (!b) return null;
      const t = b.textContent.replace(cn, '');
      const bd = [...b.querySelectorAll('div')].map((x) => x.className).find((cl) => /absolute top-0 right-0/.test(cl) && /border-(purple|fuchsia|orange|red|cyan)-\d00/.test(cl)) || '';
      return { word: /OOG/.test(t) ? 'OOG' : /(^|[^A-Z])FR([^A-Z0-9]|$)/.test(t) ? 'FR' : '-', sym: t.includes('⊞') ? '⊞' : t.includes('△') ? '△' : '-', border: (bd.match(/border-(purple|fuchsia)-600/) || ['-'])[0] };
    };
    for (const cn of FR_D) {
      const v = look(cn);
      ok(!!v && v.word === 'FR' && v.sym === '⊞' && v.border === 'border-purple-600', `⛔ 베이플랜 ${cn} — ${v ? v.word + ' · ' + v.sym + ' · ' + v.border : '전번호 칸 없음(확대 실패)'} (FR · ⊞ · 보라)`);
    }
    const vo = look(OT_D[0]);
    ok(!!vo && vo.word === 'OOG' && vo.sym === '△', `베이플랜 ${OT_D[0]}(42UT) — ${vo ? vo.word + ' · ' + vo.sym : '전번호 칸 없음(확대 실패)'} (OOG · △ 그대로)`);
  }

  // ⑧ 콘앱 — _ediRowOf 가 FR 을 fr 로 만든다(번들 판정 · 약신호 폴백 둘 다)
  const html = fs.readFileSync(path.join(ROOT, 'public/cone.html'), 'utf8');
  const rowOf = html.match(/function _ediRowOf\(c\)\{[\s\S]*?\n\}\n/);
  ok(!!rowOf, '콘앱 _ediRowOf 를 소스에서 꺼냈다');
  if (rowOf) {
    const run = (withBundle) => {
      const ctx = { console }; if (withBundle && Uf) ctx.window = { ConeParse: { isFlatRackContainer: Uf } };
      vm.createContext(ctx); vm.runInContext(rowOf[0] + '\nthis.__rowOf = _ediRowOf;', ctx);
      const rows = Object.values(dis).map(ctx.__rowOf);
      return { fr: rows.filter((x) => x.fr).map((x) => x.cn).sort(), ot: rows.filter((x) => x.ot && !x.fr).map((x) => x.cn) };
    };
    for (const wb of [true, false]) {
      const o = run(wb);
      ok(JSON.stringify(o.fr) === JSON.stringify([...FR_D].sort()) && JSON.stringify(o.ot) === JSON.stringify(OT_D),
        `콘앱 행(${wb ? '번들 판정' : '약신호 폴백'}) — FR ${o.fr.length}대 · FR 아닌 OT ${o.ot.join(',')}`);
    }
    ok(/ConeParse\.isFlatRackContainer/.test(rowOf[0]), '콘앱 _ediRowOf 가 검수앱 판정(ConeParse.isFlatRackContainer)을 먼저 쓴다');
  }
  const entry = fs.readFileSync(path.join(ROOT, 'src/coneCargoPlan.entry.jsx'), 'utf8');
  ok(/window\.ConeParse\s*=\s*\{[^}]*\bisFlatRackContainer\b/.test(entry), '콘앱 번들이 isFlatRackContainer 를 ConeParse 로 내보낸다');

  // ⑨ 배선 — FR 을 가리는 자리에 플래그만 보는 판정이 남지 않았다(주석 제외)
  const code = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  const cp = code('src/components/PrintableCargoPlanV2.jsx');
  ok(/else if \(isFlatRackContainer\(c\)\) specialLetter = 'FR'/.test(cp), '카고플랜 칸(getMarkV2)이 FR 판정 한 벌을 쓴다');
  ok(/else if \(isFlatRackContainer\(c\)\) cat = 'FR'/.test(cp) && !/c\.fr \|\| \(c\.iso && c\.iso\[2\] === 'P'\)/.test(cp), '카고플랜 별첨이 같은 판정을 쓴다(iso[2]===P 따로 판정 없음)');
  const bp = code('src/components/BayPlan.jsx');
  ok(!/else if \(c\.fr\)/.test(bp) && !/c\.fr \? 'border-purple-600'/.test(bp), '베이플랜에 fr 플래그만 보는 FR 가지가 없다');
  ok(!/const isFr = c\.fr;/.test(code('src/components/SlotPickerModal.jsx')), '자리 고르기 창이 fr 플래그만 보지 않는다');
  const mra = html.match(/function masterRowsAdapter\(res, text\)\{[\s\S]*?\n\}\n/);
  ok(!!mra && /ConeParse\.isFlatRackContainer/.test(mra[0]), '콘앱 masterRowsAdapter(파일로 계산한 행)도 검수앱 FR 판정을 먼저 쓴다');
  ok(!/if \(c\.fr\) return 'FR\(플랫랙\)'/.test(code('src/swapGrade.js')), '맞교환 안내가 fr 플래그만 보지 않는다');

  console.log(fail ? `\nFR 표기 연막검사 실패 ${fail}건` : '\nFR 표기 연막검사 통과');
  process.exit(fail ? 1 : 0);
})();
