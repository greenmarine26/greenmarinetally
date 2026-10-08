// 4.12-04 연막검사 — 출력허브 카고플랜이 선박 전체(통과화물 회색 포함·시프팅 ◆)를 그리는가(MCAP 639N 실데이터).
//   검수사 확정 2026-08-28(2.79-03) «타지역화물도 보여줘야 합니다. 선적시 빈곳을 찾기 위해서» · 2026-10-09 03:25 «표기는 평택분만 표기를 하고 나머지는 음영을 넣어서 보여주기로 한것일텐데».
//   검수사 2026-10-09 03:07~03:20 «양하에서 시프팅 자리에 컨이 보이지 않습니다» · «베이플랜에는 보이는데 카고플랜에서는 보이지 않는군요» · «콘앱은 표기하고 검수앱은 표기가 안되게 한 이유».
//   기준표는 코드가 내는 값이 아니라 **EDI 가 말하는 자리**다 — 시프팅 5대는 도착 BAPLIE 에서 6번 베이 4대·10번 베이 1대에 있고, 두 베이에는 평택 화물이 0대다.
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path');
const bundle = fs.readFileSync(process.argv[2], 'utf8');
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'shiftbay_mcap639n.json'), 'utf8'));
const FIVE = ['FFAU7193985', 'HASU4648092', 'HASU4806161', 'TCNU6220604', 'TRHU8324617'];
let fail = 0; const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
function render(which) {
  return new Promise((res) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const errs = []; dom.window.addEventListener('error', (e) => errs.push(e.message));
    dom.window.__SMOKE_WHICH = which;
    try { dom.window.eval(bundle); } catch (e) { errs.push('THROW: ' + e.message); }
    if (which === 'direct') { setTimeout(() => res({ dom, errs, d: dom.window.document, w: dom.window }), 5000); return; }
    setTimeout(() => {
      const d = dom.window.document;
      const tile = [...d.querySelectorAll('button.print-tile')].find((b) => /카고플랜/.test(b.textContent));
      if (!tile) { res({ dom, errs: errs.concat('카고플랜 단추를 못 찾음'), d, w: dom.window }); return; }
      tile.click();
      setTimeout(() => res({ dom, errs, d, w: dom.window }), 5000);
    }, 1500);
  });
}
(async () => {
  // ① 픽스처가 실자료 그대로인가(검사 전제)
  const rl = FX.restowList, cns = Object.keys(rl).filter((k) => !k.startsWith('_'));
  ok(JSON.stringify(cns.sort()) === JSON.stringify([...FIVE].sort()) && rl._meta.total === 5, `선사 RESTOW LIST ${cns.length}대 · TOTAL ${rl._meta.total} (${rl._meta.file})`);
  ok(FX.info.berthShift === 10 && Object.keys(FX.discharge.records).length === 218, '배정표 이적 10모브(=5대) · 양하 리스트 218대');
  // ② 실제 출력허브에서 카고플랜을 연다
  const r = await render('hub');
  ok(r.errs.length === 0, '출력허브 → 카고플랜 렌더 오류 0' + (r.errs[0] ? ' — ' + r.errs[0] : ''));
  const d = r.d;
  const shiftCells = d.querySelectorAll('.cpv2-cell.cpv2-shift').length;
  const head = [...d.querySelectorAll('*')].filter((e) => e.children.length === 0 && /^· ?쉬프팅/.test(e.textContent.trim())).map((e) => e.textContent.trim());
  ok(head.length === 1 && /쉬프팅 5$/.test(head[0]), `머리 «${head[0] || '없음'}» — 시프팅 5대`);
  { const st = d.querySelector('[data-shift-status]'); ok(!!st && st.textContent.trim() === (FX.info.terminalStatus === 'working' && FX.info.berthShift === 10 ? '확정' : '미확정'), `4.13 머리 «쉬프팅 5 ${st ? st.textContent.trim() : '(상태 없음)'}» — 터미널 working · 이적 10모브(=5대)라 확정`); }
  ok(shiftCells === 5, `⛔ ◆ 칸 ${shiftCells}개 — 머리가 5대라고 하면 칸에도 5개가 그려져야 한다(수정 전 0개)`);
  // ②-2 항차 화면 카고플랜·콘앱이 그리는 길(선박 전체 891대)과 같은 그림인가 — 통과화물 회색 칸 수가 같아야 한다
  const rd = await render('direct');
  const thr = (dd) => dd.querySelectorAll('.cpv2-cell.cpv2-through').length, all = (dd) => dd.querySelectorAll('.cpv2-cell').length;
  ok(rd.w.__direct === 891, `비교 대상 — 선박 전체 ${rd.w.__direct}대(양하 EDI 891 중 평택 218)`);
  ok(thr(d) === thr(rd.d) && thr(d) > 1000, `⛔ 통과화물 회색 칸 ${thr(d)}개 = 항차 화면 길 ${thr(rd.d)}개 (수정 전 평택 베이만 걸러 훨씬 적었다)`);
  ok(all(d) === all(rd.d), `전체 칸 수 ${all(d)} = ${all(rd.d)}`);
  //  평택 화물이 0대인 베이도 회색으로 찬 것이 보인다 — «BAY 05» 박스 안 회색 칸
  const boxOf = (dd, re) => { const t = [...dd.querySelectorAll('*')].find((e) => e.children.length === 0 && re.test(e.textContent.trim())); let p = t; for (let k = 0; k < 6 && p; k++) { if (p.querySelectorAll && p.querySelectorAll('.cpv2-cell').length > 20) return p; p = p.parentElement; } return null; };
  const b05 = boxOf(d, /^BAY 05$/);
  ok(!!b05 && b05.querySelectorAll('.cpv2-through').length > 20, `평택 화물 0대인 BAY 05 도 회색으로 찬 칸이 보인다 — 회색 ${b05 ? b05.querySelectorAll('.cpv2-through').length : 0}칸(수정 전 0)`);

  // ③ 시프팅이 있는 베이(6·10)가 그려졌다 — 박스 제목 «BAY (06)07»·«BAY (10)11»
  const titles = [...d.querySelectorAll('*')].filter((e) => e.children.length === 0 && /^BAY /.test(e.textContent.trim())).map((e) => e.textContent.trim());
  ok(titles.some((t) => /\(06\)07/.test(t)) && titles.some((t) => /\(10\)11/.test(t)), `시프팅 베이 박스가 있다 — ${titles.filter((t) => /\((06|10)\)/.test(t)).join(', ') || '없음'}`);
  // ④ 검수 리스트 대수는 그대로다 — 베이를 고르는 데만 시프팅을 쓴다(별첨 218)
  const legendTxt = [...d.querySelectorAll('tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim()).join('|'));
  ok(legendTxt.some((t) => /^\|?합계\|1\|217\|218$/.test(t)), '별첨1 합계 20ft 1 · 40ft 217 · 계 218 — 평택 대수 그대로');
  // ⑤ 배선 — 같은 규칙이 베이상세에도 걸렸다(주석 제외)
  const code = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  const hub = code('src/components/PrintHubModal.jsx');
  ok(/if \(!isPtk\(c\) && !_isShiftCn\(c\)\) return;/.test(hub), '베이상세(실적) 베이 집합은 평택분 + 시프팅 베이다');
  ok(!/ptkBays\.has\(b\)/.test(hub) && !/const ptkBays = new Set/.test(hub), '카고플랜(계획)에 옛 «평택 화물 있는 베이만» 거르기가 남지 않았다');
  console.log(fail ? `\n✗ ${fail}건 실패` : '\n✓ 전부 통과');
  process.exit(fail ? 1 : 0);
})();
