// 4.10 연막검사 — 해치커버 보고 직전 «장수 확인». ① 장수 계산 한 벌(hatchPanelDetailOf)이 4.09 값과 같고 ② 경고(hatchCountFlags)가 맞고 ③ 실제 자동 가이드에서 단추를 눌러 확인 창이 뜨고 취소·보고가 맞게 저장되는지.
//   실행 — node tools/smoke_hatchcount410.cjs <repoRoot> <번들(smoke_hatchcount410.jsx)>. 실패하면 빌드를 세운다.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const root = process.argv[2] || process.cwd();
const bundle = process.argv[3];
(async () => {
  let bad = 0, n = 0;
  const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
  const U = await import(path.resolve(root, 'src/utils.js'));
  const fx = (f) => require(path.resolve(root, 'tools/fixtures/' + f + '.json'));
  const STSE = fx('hatch_stse'), DJCT = fx('hatch_djct'), NSDC = fx('hatch_nsdc');
  const gc = (b) => Math.round(parseInt(b, 10) / 2) * 2;
  const { getBayPairs } = await import(path.resolve(root, 'src/twin.js'));
  const { bayGroupCenter } = await import(path.resolve(root, 'src/swapGrade.js'));
  //  실제 앱과 같은 «이 베이의 그룹» — 자동 가이드가 selectedGroup 을 정하는 바로 그 함수(EDI 의 40ft 짝으로 만든 bayPairs + bayGroupCenter)
  const realGc = (F, mode) => {
    const all = Object.values(F.ediContainers).map((c) => ({ ...c, _mode: mode, _ptk: true }));
    const pairs = getBayPairs(all, F.info.imo || '', F.info.vsl || '');
    return { all, gcOf: (b) => bayGroupCenter(String(parseInt(b, 10)).padStart(2, '0'), pairs) };
  };

  console.log('[1] 장수 계산이 4.09(배포본) 값과 같다 — 격자 5760건 다이제스트');
  {
    const cases = [['stse', STSE, 'discharge'], ['djct', DJCT, 'discharge'], ['nsdc', NSDC, 'discharge'],
      ['nsdcL', { info: NSDC.info, dict: NSDC.dict, ediContainers: NSDC.loadingEdiContainers, completed: NSDC.loadingCompleted }, 'loading']];
    const out = [], det = [];
    for (const [, F, mode] of cases) {
      const voyBase = { info: F.info, [mode]: { ediContainers: F.ediContainers, completed: F.completed || {} } };
      const voyEmpty = { info: F.info, [mode]: { ediContainers: F.ediContainers, completed: {} } };
      const nos = []; for (let b = 1; b <= 40; b++) nos.push(String(b).padStart(2, '0'));
      const sets = [];
      for (let i = 0; i < nos.length; i++) { sets.push([nos[i]]); if (i + 1 < nos.length) sets.push([nos[i], nos[i + 1]]); if (i + 2 < nos.length) sets.push([nos[i], nos[i + 1], nos[i + 2]]); }
      sets.push(nos.slice(0, 12)); sets.push(nos); sets.push([]);
      for (const voy of [voyBase, voyEmpty, { info: F.info }, { info: { vsl: 'ZZZZ' } }]) for (const dict of [F.dict, null, {}]) for (const bs of sets) {
        const c = U.hatchPanelCountOf(voy, mode, bs, dict, gc);
        out.push(c);
        det.push(U.hatchPanelDetailOf(voy, mode, bs, dict, gc).count === c);
      }
    }
    const dg = crypto.createHash('sha1').update(JSON.stringify(out)).digest('hex');
    ok(out.length === 5760 && dg === 'ca050a2861187a7038fca41c759bdeae617cd3f4', `hatchPanelCountOf 격자 ${out.length}건 다이제스트가 4.09 배포본과 같다 (${dg.slice(0, 10)})`);
    ok(det.every(Boolean), 'hatchPanelDetailOf.count 가 hatchPanelCountOf 와 모든 입력에서 같다(판정 한 벌)');
  }

  console.log('[2] 실데이터 그룹별 상세 — 사전 장수·열어야 할 장·장별 홀드 평택 대수');
  {
    const voy = (F, mode) => ({ info: F.info, [mode]: { ediContainers: F.ediContainers, completed: {} } });
    const dN = U.hatchPanelDetailOf(voy(NSDC, 'discharge'), 'discharge', ['09', '10', '11'], NSDC.dict, () => 10);
    ok(dN.source === 'calc' && dN.count === 1 && dN.max === 2 && dN.groups.length === 1, `NSDC 10번 — 사전 2장 중 열어야 할 장 1장 (count=${dN.count}, max=${dN.max}, source=${dN.source})`);
    const g = dN.groups[0];
    ok(g && g.total === 2 && g.needed === 1 && g.panels.length === 2 && g.panels[1].nHold === 12 && g.panels[0].nHold === 0, `NSDC 10번 — 둘째 장 아래 홀드 평택 12대·첫째 장 0대 (${g && g.panels.map((p) => p.nHold).join('/')})`);
    ok(g && g.bays.join(',') === '9,10,11', `그룹이 입력 베이를 들고 있다 (${g && g.bays.join(',')})`);
    const sg = realGc(STSE, 'discharge');
    ok(['23', '24', '25'].every((b) => sg.gcOf(b) === 24), 'STSE 23·24·25 는 실제 앱 묶음 함수로 한 그룹(24)이다');
    const dS = U.hatchPanelDetailOf(voy(STSE, 'discharge'), 'discharge', ['23', '24', '25'], STSE.dict, sg.gcOf);
    ok(dS.count === 2 && dS.max === 2 && dS.groups.length === 1, `STSE 23 (24)25 — 총 2장(옛 6장 오류가 고쳐진 값), 사전 상한도 2장 (count=${dS.count}, max=${dS.max})`);
    //  옛 오류 모양 — 같은 해치를 베이마다 따로 셌을 때의 합 6 은 «사전 최대 2장» 을 넘는다 → 경고
    const fl = U.hatchCountFlags({ count: 6, source: 'calc', max: 2, groups: [] }, 6);
    ok(fl.some((f) => f.key === 'over' && f.level === 'warn'), '옛 6장 모양(앱 6·사전 최대 2)이면 «사전보다 많다» 경고가 뜬다');
    //  실데이터 그룹 전부(실제 앱 묶음 함수) — 계산값이 «사전 hatchCount 로 센 독립 상한» 이하이고 1 이상
    let groups = 0, badG = 0;
    for (const [lab, F, mode] of [['stse', STSE, 'discharge'], ['djct', DJCT, 'discharge'], ['nsdc', NSDC, 'discharge'], ['nsdcL', { info: NSDC.info, dict: NSDC.dict, ediContainers: NSDC.loadingEdiContainers, completed: NSDC.loadingCompleted }, 'loading']]) {
      const vv = { info: F.info, [mode]: { ediContainers: F.ediContainers, completed: F.completed || {} } };
      const { all, gcOf } = realGc(F, mode);
      const byG = new Map();
      for (const b of new Set(all.map((c) => parseInt(c.bay, 10)))) { const g = gcOf(b); if (!byG.has(g)) byG.set(g, []); byG.get(g).push(String(b).padStart(2, '0')); }
      for (const [g, bays] of byG) {
        const d = U.hatchPanelDetailOf(vv, mode, bays, F.dict, gcOf);
        const hasHatch = (F.dict.bayDef.baysSummary || []).some((x) => bays.includes(String(x.bayNo).padStart(2, '0')) && (parseInt(x.hatchCount, 10) || 0) > 0);
        if (!hasHatch) continue;
        groups++; if (!(d.count >= 1 && d.count <= d.max && d.source === 'calc')) { badG++; console.log('   이상', lab, g, JSON.stringify({ c: d.count, m: d.max, s: d.source })); }
      }
    }
    ok(groups >= 10 && badG === 0, `실데이터 ${groups}개 그룹(실제 묶음 함수) 모두 계산값이 1 이상·사전 hatchCount 상한 이하이고 자료로 센 값(calc)이다 (이상 ${badG})`);
    //  감사 중-1 — 사전 상한은 묶음 중심 베이의 사전 장수도 본다. DJCT 사전 23:0 24:2 25:1 인데 홀드 평택분이 25번에만 있으면 중심(24)의 2장을 읽어 count 2 가 맞다 — 상한이 1 로 나와 «사전보다 많습니다» 헛경고가 뜨면 안 된다.
    {
      const { gcOf } = realGc(DJCT, 'discharge');
      const ed = {};
      for (const [k, c] of Object.entries(DJCT.ediContainers)) { const b = parseInt(c.bay, 10); const hold = parseInt(c.tier, 10) < 80; if (hold && U.isPyeongtaekPort(c.pod) && (b === 23 || b === 24)) continue; ed[k] = c; }
      for (const r of ['08', '06', '04', '02', '00', '01', '03', '05', '07']) ed['ZZZU00000' + r] = { cn: 'ZZZU00000' + r, bay: '25', row: r, tier: '02', pod: 'KRPTK', pol: 'CNSHA', iso: '2200', fe: 'F' };
      const vv = { info: DJCT.info, discharge: { ediContainers: ed, completed: {} } };
      let bad25 = 0; const seen = [];
      for (const bs of [['25'], ['23', '25'], ['23', '24', '25'], ['24']]) {
        const d = U.hatchPanelDetailOf(vv, 'discharge', bs, DJCT.dict, gcOf);
        const f = U.hatchCountFlags(d, d.count);
        seen.push(`${bs.join(',')}=${d.count}/${d.max}`);
        if (!(d.count === 2 && d.max >= d.count) || f.some((x) => x.key === 'over')) bad25++;
      }
      ok(bad25 === 0, `DJCT 24 묶음 — 25번에만 홀드 평택분이 있어도 count 2·사전 상한 ≥ 2 이고 «사전보다 많다» 헛경고가 없다 (${seen.join(' ')})`);
      //  4.09 와 같은 count — 상한 보정은 count 를 바꾸지 않는다(격자 다이제스트가 이미 잡지만 이 사례를 따로 못박는다)
      ok(U.hatchPanelCountOf(vv, 'discharge', ['25'], DJCT.dict, gcOf) === U.hatchPanelDetailOf(vv, 'discharge', ['25'], DJCT.dict, gcOf).count, 'hatchPanelCountOf 는 여전히 상세의 count 와 같다');
    }
    //  실데이터 그룹마다 베이 부분집합(1~3개)으로도 계산값이 사전 상한을 넘지 않는다
    {
      let sub = 0, subBad = 0;
      for (const [lab, F, mode] of [['stse', STSE, 'discharge'], ['djct', DJCT, 'discharge'], ['nsdc', NSDC, 'discharge']]) {
        const vv = { info: F.info, [mode]: { ediContainers: F.ediContainers, completed: {} } };
        const { all, gcOf } = realGc(F, mode);
        const byG = new Map();
        for (const b of new Set(all.map((c) => parseInt(c.bay, 10)))) { const g = gcOf(b); if (!byG.has(g)) byG.set(g, []); byG.get(g).push(String(b).padStart(2, '0')); }
        for (const [g, bays] of byG) for (let m = 1; m < (1 << bays.length); m++) {
          const bs = bays.filter((_, i) => m & (1 << i));
          const d = U.hatchPanelDetailOf(vv, mode, bs, F.dict, gcOf);
          if (d.source !== 'calc') continue;
          sub++; if (d.count > d.max) { subBad++; console.log('   상한 초과', lab, g, bs.join(','), d.count, d.max); }
        }
      }
      ok(sub >= 20 && subBad === 0, `실데이터 그룹의 베이 부분집합 ${sub}건 모두 계산값이 사전 상한 이하다 (초과 ${subBad})`);
    }
  }

  console.log('[3] 경고 — 못 셌을 때·사전 합으로 돌아갔을 때·고쳤을 때');
  {
    const none = U.hatchPanelDetailOf({ info: { vsl: 'ZZZZ' } }, 'discharge', ['23', '24'], null, gc);
    ok(none.count === 0 && none.source === 'none', `자료·사전이 없으면 count 0·source none (count=${none.count})`);
    ok(U.hatchCountFlags(none, null).some((f) => f.key === 'none' && f.level === 'block'), '못 셌고 아직 안 골랐으면 block(직접 골라야 보고 가능)');
    ok(U.hatchCountFlags(none, 2).every((f) => f.level !== 'block'), '직접 2장을 고르면 block 이 풀린다');
    const dictOnly = U.hatchPanelDetailOf({ info: STSE.info }, 'discharge', ['23', '24', '25'], STSE.dict, () => 24);
    ok(dictOnly.source === 'dict' && dictOnly.count === 2, `EDI 가 없어 사전 합으로 돌아가면 source dict (count=${dictOnly.count})`);
    ok(U.hatchCountFlags(dictOnly, 2).some((f) => f.key === 'dict' && f.level === 'warn'), 'dict 출처면 «사전 장수를 썼다» 경고');
    const calc = { count: 2, source: 'calc', max: 2, groups: [] };
    ok(U.hatchCountFlags(calc, 2).length === 0, '앱 값 그대로면 경고가 없다');
    ok(U.hatchCountFlags(calc, 1).some((f) => f.key === 'changed' && f.level === 'info'), '앱 값과 다르게 고르면 참고(changed)');
  }

  console.log('[4] 실제 화면 — 자동 가이드(NSDC 2608N 10번)에서 [해치커버 오픈] 을 누른다');
  if (!bundle) { ok(false, '번들 경로가 없다'); finish(); return; }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  const errs = [];
  dom.window.addEventListener('error', (e) => errs.push(e.message));
  console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
  dom.window.alert = (m) => { (dom.window.__alerts = dom.window.__alerts || []).push(String(m)); };
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(700);
  const doc = dom.window.document;
  const txt = () => doc.body.textContent || '';
  const clickBy = (re) => { const b = [...doc.querySelectorAll('button')].find((x) => re.test((x.textContent || '').trim()) && !x.disabled); if (!b) return false; b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); return true; };
  const clickSel = (sel) => { const b = doc.querySelector(sel); if (!b || b.disabled) return false; b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); return true; };
  const calls = () => dom.window.__calls || [];
  ok(errs.length === 0, '렌더 중 오류 없음' + (errs.length ? ' — ' + [...new Set(errs)].slice(0, 2).join(' | ') : ''));
  clickBy(/🏗 1호기/); await wait(400);
  if (!clickBy(/^B9·10·11|^B10/)) ok(false, '10번 베이 묶음 버튼이 없다: ' + txt().slice(0, 160));
  await wait(400);
  let t = txt();
  if (!/해치커버 오픈/.test(t)) {
    //  단 고르는 화면이면 한 단계 더 — 홀드로 간다
    clickBy(/홀드/); await wait(400); t = txt();
  }
  ok(/🔓 해치커버 오픈 → 홀드 진행/.test(t), '데크를 다 내린 그룹이면 오픈 배너 단추가 보인다: ' + t.slice(0, 140));
  ok(!doc.querySelector('[data-hatch-confirm]'), '단추를 누르기 전에는 확인 창이 없다');
  //  이 그룹은 데크에 통과화물 12대가 얹혀 있어 종전 «커버 위에 화물이 있습니다» 물음이 먼저 뜬다 — 거기서 취소해도 «열렸다» 가 저장되던 결함(4.10 수리)을 먼저 본다.
  ok(clickBy(/해치커버 오픈 → 홀드 진행/), '오픈 단추를 눌렀다'); await wait(400);
  ok(/커버 위에 화물이 있습니다/.test(txt()) && !doc.querySelector('[data-hatch-confirm]'), '종전 물음(커버 위 화물)이 장수 확인보다 먼저 뜬다');
  ok(clickBy(/^취소$/), '그 물음에서 [취소] 를 눌렀다'); await wait(400);
  ok(calls().filter((c) => c.fn === 'report').length === 0 && !calls().some((c) => c.fn === 'updateInfo' && c.patch && c.patch.hatchDone), '취소하면 보고도 «열렸다» 표시(hatchDone)도 저장하지 않는다 — 종전엔 표시만 남았다');
  ok(/🔓 해치커버 오픈 → 홀드 진행/.test(txt()), '취소 뒤에도 오픈 단추가 그대로 남는다(처리됨으로 바뀌지 않음)');
  ok(clickBy(/해치커버 오픈 → 홀드 진행/), '다시 오픈 단추를 눌렀다'); await wait(400);
  ok(clickBy(/그래도 보고/), '«그래도 보고» 를 눌렀다'); await wait(400);
  const box = doc.querySelector('[data-hatch-confirm="open"]');
  ok(!!box, '누르자마자 «장수 확인» 창이 뜬다(항상)');
  const bt = box ? box.textContent : '';
  ok(/해치커버 오픈 보고 — 장수 확인/.test(bt) && /사전 해치 2장/.test(bt) && /열 장 1장/.test(bt) && /홀드 평택 12대/.test(bt), '창에 «사전 해치 2장 · 열 장 1장 · 홀드 평택 12대» 가 보인다: ' + bt.slice(0, 220));
  ok(!!doc.querySelector('[data-hatch-count="1"][aria-pressed="true"]'), '앱이 센 1장이 미리 눌려 있다');
  ok(calls().filter((c) => c.fn === 'report').length === 0, '창이 떠 있는 동안에는 아무 보고도 쓰지 않았다');
  //  장수 확인 창에서 취소 — 아무것도 저장하지 않고 «열렸다» 표시도 없다
  ok(clickSel('[data-hatch-cancel]'), '[취소] 를 눌렀다'); await wait(400);
  ok(!doc.querySelector('[data-hatch-confirm]'), '취소하면 창이 닫힌다');
  ok(calls().filter((c) => c.fn === 'report').length === 0, '취소하면 보고가 없다');
  ok(!calls().some((c) => c.fn === 'updateInfo' && c.patch && c.patch.hatchDone), '취소하면 «열렸다»(hatchDone) 표시도 저장하지 않는다');
  ok(/🔓 해치커버 오픈 → 홀드 진행/.test(txt()), '취소 뒤에도 오픈 단추가 그대로 남는다(처리됨으로 바뀌지 않음)');
  //  다시 눌러 장수를 2장으로 고쳐 보고
  ok(clickBy(/해치커버 오픈 → 홀드 진행/), '세 번째로 오픈 단추를 눌렀다'); await wait(400);
  ok(clickBy(/그래도 보고/), '«그래도 보고»'); await wait(400);
  ok(clickSel('[data-hatch-count="2"]'), '2장 버튼을 눌렀다'); await wait(200);
  const bt2 = (doc.querySelector('[data-hatch-confirm]') || {}).textContent || '';
  ok(/앱이 센 장수는 1장/.test(bt2) && !!doc.querySelector('[data-hatch-flag="changed"]'), '앱 값과 다르게 고르면 «앱이 센 장수는 1장입니다» 참고가 뜬다');
  ok(/2장 오픈 보고/.test(bt2), '확인 단추 글자가 «2장 오픈 보고» 로 바뀐다');
  ok(clickSel('[data-hatch-ok]'), '[2장 오픈 보고] 를 눌렀다'); await wait(600);
  const reps = calls().filter((c) => c.fn === 'report');
  ok(reps.length === 1 && reps[0].report.type === 'hatch' && reps[0].report.action === 'open' && reps[0].report.panelCount === 2, `보고가 한 번 쓰였고 type hatch·open·panelCount 2 다 (${reps.length}건)`);
  ok(reps[0] && /총 2장/.test(reps[0].report.message || ''), '카톡 문구에도 «총 2장»');
  ok(calls().some((c) => c.fn === 'updateInfo' && c.patch && c.patch.hatchDone && Object.values(c.patch.hatchDone).includes('open')), '보고가 나간 뒤에야 hatchDone(open) 표시를 저장한다');
  await wait(300);
  ok(!/🔓 해치커버 오픈 → 홀드 진행/.test(txt()), '보고 뒤에는 오픈 배너가 사라진다');

  console.log('[5] 창만 따로 — 못 셌을 때·사전보다 많을 때');
  dom.window.__confirmed = undefined;
  dom.window.__renderConfirm({ action: 'close', bays: ['23', '24', '25'], detail: { count: 0, source: 'none', max: 0, groups: [] }, initial: 0 });
  await wait(300);
  const okBtn = () => doc.querySelector('[data-hatch-ok]');
  ok(okBtn() && okBtn().disabled && /장수를 고르세요/.test(okBtn().textContent), '앱이 못 셌고 안 골랐으면 [보고] 단추가 잠겨 있다');
  ok(!!doc.querySelector('[data-hatch-flag="none"]'), '«계산하지 못했습니다» 경고가 보인다');
  clickSel('[data-hatch-count="2"]'); await wait(200);
  ok(okBtn() && !okBtn().disabled && /2장 클로즈 보고/.test(okBtn().textContent), '2장을 고르면 [2장 클로즈 보고] 가 열린다');
  clickSel('[data-hatch-ok]'); await wait(100);
  ok(dom.window.__confirmed === 2, '확인하면 고른 장수 2 가 돌아온다');
  dom.window.__renderConfirm({ action: 'open', bays: ['23', '24', '25'], detail: { count: 6, source: 'calc', max: 2, groups: [] }, initial: 6 });
  await wait(300);
  ok(!!doc.querySelector('[data-hatch-flag="over"]') && /사전보다 많습니다/.test(txt()), '앱 6장·사전 최대 2장(옛 오류 모양)이면 «사전보다 많습니다» 경고');
  ok(!!doc.querySelector('[data-hatch-count="6"][aria-pressed="true"]'), '그 6장이 눌려 보여 검수사가 눈으로 잡을 수 있다');
  clickSel('[data-hatch-count="2"]'); await wait(200);
  ok(!doc.querySelector('[data-hatch-flag="over"]'), '2장으로 고치면 «사전보다 많다» 경고가 사라진다');
  clickSel('[data-hatch-cancel]'); await wait(100);
  ok(dom.window.__confirmed === null, '[취소] 는 null 을 돌려준다');
  console.log('[6] 수동 작업 보고 — STSE 2677E 에서 [해치커버] → 23, 24, 25 → OPEN 보고');
  dom.window.__calls.length = 0; dom.window.__closed = 0;
  dom.window.__renderManual(); await wait(600);
  ok(clickBy(/해치커버/), '작업 보고 첫 화면의 [해치커버] 를 눌렀다'); await wait(300);
  ok(clickBy(/^1호기$/), '장비 1호기를 골랐다'); await wait(150);
  const inp = doc.querySelector('input[placeholder^="예: 1, 3, 5"]');
  ok(!!inp, '베이 번호 입력칸이 있다');
  if (inp) { const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set; setter.call(inp, '23, 24, 25'); inp.dispatchEvent(new dom.window.Event('input', { bubbles: true })); }
  await wait(400);
  ok(/2장 열면 됩니다/.test(txt()), '입력하면 앱이 센 «2장 열면 됩니다» 힌트가 보인다(트리오를 6장으로 세지 않는다)');
  ok(clickBy(/해치 OPEN 보고/), '[해치 OPEN 보고] 를 눌렀다'); await wait(500);
  const mbox = doc.querySelector('[data-hatch-confirm="open"]');
  ok(!!mbox && /사전 해치 2장/.test(mbox.textContent), '수동 보고도 쓰기 직전에 «장수 확인» 창이 뜬다(사전 해치 2장)');
  ok(!!doc.querySelector('[data-hatch-count="2"][aria-pressed="true"]'), '손으로 장수를 안 눌렀으니 앱이 센 2장이 미리 눌려 있다(기본값 1 이 아니다)');
  ok(calls().filter((c) => c.fn === 'report').length === 0, '창이 떠 있는 동안 보고를 쓰지 않았다');
  ok(clickSel('[data-hatch-cancel]'), '[취소]'); await wait(400);
  ok(calls().filter((c) => c.fn === 'report').length === 0 && dom.window.__closed === 0 && /해치 OPEN 보고/.test(txt()), '취소하면 아무것도 쓰지 않고 작업 보고 창도 닫히지 않는다(클릭이 부모로 새지 않는다)');
  ok(clickBy(/해치 OPEN 보고/), '다시 [해치 OPEN 보고]'); await wait(500);
  ok(clickSel('[data-hatch-ok]'), '[2장 오픈 보고] 확인'); await wait(700);
  const mrep = calls().filter((c) => c.fn === 'report');
  ok(mrep.length === 1 && mrep[0].report.type === 'hatch' && mrep[0].report.action === 'open' && mrep[0].report.panelCount === 2 && /총 2장/.test(mrep[0].report.message || ''), `수동 보고가 한 번, panelCount 2·«총 2장» 으로 쓰였다 (${mrep.length}건 ${mrep[0] ? mrep[0].report.panelCount : ''})`);
  ok(calls().some((c) => c.fn === 'updateInfo' && c.patch && c.patch.hatchDone), '보고 뒤에 hatchDone 표시를 저장했다');
  //  앱이 못 센 배(사전 없는 배) — 기본값 1 로 무심코 나가지 않는다
  dom.window.__calls.length = 0;
  dom.window.__renderManual('ZZZZ'); await wait(500);
  clickBy(/해치커버/); await wait(300); clickBy(/^1호기$/); await wait(150);
  const inp2 = doc.querySelector('input[placeholder^="예: 1, 3, 5"]');
  if (inp2) { const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set; setter.call(inp2, '23, 24, 25'); inp2.dispatchEvent(new dom.window.Event('input', { bubbles: true })); }
  await wait(300);
  clickBy(/해치 OPEN 보고/); await wait(500);
  const okb = doc.querySelector('[data-hatch-ok]');
  ok(!!okb && okb.disabled && !!doc.querySelector('[data-hatch-flag="none"]'), '앱이 못 센 배(사전·자료 없음)는 손으로 장수를 안 눌렀으면 직접 고를 때까지 보고가 잠겨 있다');
  ok(calls().filter((c) => c.fn === 'report').length === 0, '그때도 보고는 쓰이지 않았다');
  console.log('[7] 알림 배너([보고+카톡]·[보고만]) — 장수 표시와 보고 값이 같고, 못 센 사건은 직접 고른다');
  dom.window.__calls.length = 0;
  const NOW = Date.now();
  const ev = { hatch: 24, action: 'open', bays: [23, 24, 25], mode: 'discharge', from: NOW - 5 * 60000, to: NOW, gapMin: 5, crane: 1, src: 'term' };
  dom.window.__renderBanner([ev], () => 3); await wait(400);
  const cnt = () => (doc.querySelector('[data-hatch-alert-count]') || {}).textContent || '';
  ok(/총 3장/.test(cnt()) && doc.querySelector('[data-hatch-alert-count]').getAttribute('data-hatch-alert-count') === '3', '배너가 앱이 센 «총 3장» 을 단추 옆에 보인다');
  dom.window.__renderBanner([ev], () => 1); await wait(300);
  ok(/총 1장/.test(cnt()), '같은 사건인데 장수 계산이 바뀌면 화면 값도 따라 바뀐다(낡은 «총 3장» 이 남지 않는다)');
  ok(clickBy(/^보고만$/), '[보고만] 을 눌렀다'); await wait(600);
  const brep = calls().filter((c) => c.fn === 'report');
  ok(brep.length === 1 && brep[0].report.panelCount === 1 && /총 1장/.test(brep[0].report.message || '') && brep[0].report.auto === true, `화면에 보인 1장 그대로 보고가 쓰였다 (panelCount ${brep[0] ? brep[0].report.panelCount : '-'})`);
  ok(!doc.querySelector('[data-hatch-confirm]'), '센 장수가 있으면 배너 보고는 확인 창 없이 간다(화면에 값이 이미 보인다)');
  dom.window.__calls.length = 0;
  dom.window.__renderBanner([{ ...ev, hatch: 26, bays: [25, 26, 27] }], () => 0); await wait(400);
  ok(/장수 확인 필요/.test(cnt()), '못 센 사건은 «장수 확인 필요» 로 보인다');
  ok(clickBy(/^보고만$/), '못 센 사건의 [보고만] 을 눌렀다'); await wait(500);
  const bbox = doc.querySelector('[data-hatch-confirm="open"]');
  ok(!!bbox && !!doc.querySelector('[data-hatch-flag="none"]') && doc.querySelector('[data-hatch-ok]').disabled, '못 센 사건은 베이 개수로 대신 적지 않고 «장수 확인» 창이 떠 직접 고를 때까지 잠겨 있다');
  ok(calls().filter((c) => c.fn === 'report').length === 0, '창이 떠 있는 동안 보고는 쓰이지 않았다');
  ok(clickSel('[data-hatch-cancel]'), '[취소]'); await wait(400);
  ok(calls().filter((c) => c.fn === 'report').length === 0 && !doc.querySelector('[data-hatch-confirm]') && !!doc.querySelector('[data-hatch-key]'), '취소하면 아무것도 쓰지 않고 배너 줄도 그대로 남는다');
  ok(clickBy(/^보고만$/), '다시 [보고만]'); await wait(500);
  ok(clickSel('[data-hatch-count="2"]'), '2장을 골랐다'); await wait(200);
  ok(clickSel('[data-hatch-ok]'), '[2장 오픈 보고]'); await wait(700);
  const brep2 = calls().filter((c) => c.fn === 'report');
  ok(brep2.length === 1 && brep2[0].report.panelCount === 2 && /총 2장/.test(brep2[0].report.message || '') && brep2[0].report.auto === true, `직접 고른 2장으로 보고가 쓰였다 (panelCount ${brep2[0] ? brep2[0].report.panelCount : '-'})`);
  const msg0 = dom.window.__buildAuto({ ...ev, bays: [25, 26, 27] }, { vsl: 'STELLAR SEA', voy: '2677E', equip: '1호기', panelCount: 0 });
  ok(/총 장수 확인 필요/.test(msg0) && !/총 \d+장/.test(msg0), `따라가기 자동 기록도 못 센 장수를 베이 개수로 적지 않는다: ${msg0.split('\n').find((l) => /총/.test(l))}`);
  const msg2 = dom.window.__buildAuto(ev, { vsl: 'STELLAR SEA', voy: '2677E', equip: '1호기', panelCount: 2 });
  ok(/총 2장/.test(msg2) && !/확인 필요/.test(msg2), '센 장수는 «총 2장» 그대로 적는다');
  //  재감사 중-1 — 배너는 부르는 쪽 계산 함수가 그대로면 다시 세지 않는다(검색창 글자마다 raw EDI 를 다시 읽으면 입력이 느려진다).
  let nCalls = 0; const countFn = () => { nCalls++; return 2; };
  const evP = { ...ev, hatch: 40, bays: [39, 40, 41] };
  dom.window.__renderBanner([evP], countFn); await wait(300); const n1 = nCalls;
  dom.window.__renderBanner([evP], countFn); await wait(200); dom.window.__renderBanner([evP], countFn); await wait(200);
  ok(n1 >= 1 && nCalls === n1, `같은 계산 함수로 다시 그려도 장수를 다시 세지 않는다 (첫 렌더 ${n1}번 · 세 번 그린 뒤 ${nCalls}번)`);
  ok(/hatchPanelCountFor = React\.useCallback\(/.test(fs.readFileSync(path.resolve(root, 'src/components/SearchPanel.jsx'), 'utf8')), 'SearchPanel 은 배너에 주는 hatchPanelCountFor 를 자료가 바뀔 때만 새로 만든다(useCallback)');
  //  재감사 하-1 — 장수 확인 창이 떠 있는 동안 다른 검수원의 보고가 들어와 사건이 사라지면 그 사건을 다시 쓰지 않는다. 창은 남아 물음이 끝까지 풀린다.
  dom.window.__calls.length = 0; dom.window.__alerts = [];
  const evZ = { ...ev, hatch: 30, bays: [29, 30, 31] };
  dom.window.__renderBanner([evZ], () => 0); await wait(400);
  ok(clickBy(/^보고만$/), '못 센 사건의 [보고만]'); await wait(500);
  ok(!!doc.querySelector('[data-hatch-confirm="open"]'), '장수 확인 창이 떴다');
  dom.window.__renderBanner([], () => 0); await wait(400);   // 다른 검수원이 먼저 보고해 사건이 사라졌다
  ok(!!doc.querySelector('[data-hatch-confirm="open"]'), '창이 떠 있는 동안 사건이 사라져도 창은 남는다(물음이 끝까지 풀린다)');
  clickSel('[data-hatch-count="2"]'); await wait(200); clickSel('[data-hatch-ok]'); await wait(600);
  ok(calls().filter((c) => c.fn === 'report').length === 0 && (dom.window.__alerts || []).some((m) => /두 번 나가지 않게/.test(m)) && !doc.querySelector('[data-hatch-confirm]'), '사라진 사건은 다시 쓰지 않고 안내만 한다(같은 보고가 두 번 나가지 않는다)');
  //  재감사 하-6 — 확인 창이 자동 가이드의 모든 분기에 그려진다(ConfirmModal 이 있는 곳마다 같이 있어야 창이 떠 있는 동안 분기가 바뀌어도 물음이 풀린다)
  {
    const g = fs.readFileSync(path.resolve(root, 'src/components/GuidedWorkPanel.jsx'), 'utf8');
    const nConfirm = (g.match(/<ConfirmModal \{\.\.\.confirmState\} \/>/g) || []).length;
    const nHatch = (g.match(/\{hatchCountEl\}/g) || []).length;
    ok(nConfirm >= 4 && nHatch === nConfirm, `자동 가이드의 확인 창 자리 ${nConfirm}곳 모두에 장수 확인 창도 그려진다 (${nHatch}곳)`);
  }
  finish();
  function finish() { console.log(bad ? `\n✗ 4.10 해치 장수 확인 연막검사 실패 ${bad}건 / ${n}` : `\n✓ 4.10 해치 장수 확인 연막검사 통과 ${n}건`); process.exit(bad ? 1 : 0); }
})();
