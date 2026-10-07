// 4.08-02 연막검사 — 트윈 무게는 총중량으로 재고 경보뿐이다 · 컨 하나 40톤 초과는 무게 없음 · 싱글로 한 대 내린 뒤 짝이 다음 카드
//   검수사 2026-10-07 «STSE작업 하던중 무게초과건 트윈작업을 하는데 앱과 수집기의 판단미스가 많았습니다» ·
//   «무게가 55톤을 초과하면 싱글 작업을 권유 하되 들수 있으면 트윈작업을 합니다» · «강제 싱글 전환은 안됩니다» ·
//   «애초부터 220톤 같은게 있었다는 자체가 문제 였습니다. 어느 장비도 들지 못하는 무게이니까요».
//   실데이터 — STSE 2677E 양하 498대(EDI 총중량 · 리스트 무게) · SITC SENDAI CDL 실물 머리와 줄. 기대값은 코드가 아니라 EDI 총중량 합계(검수사 규칙 55톤)에서 센다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'twinwt40802_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
(async () => {
  try {
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, [
      `export { parseListExcel, plausibleListWtKg, parseListWeightKg, CONTAINER_WT_MAX_KG } from "${ROOT}/src/utils.js";`,
      `export { buildTwinPairs, analyzeTwinPairs, twinWtOf, twinDiffLimit, TWIN_MAX_TOTAL_KG, TWIN_CAUTION_TOTAL_KG, generateTwinCheckAnswer } from "${ROOT}/src/nlSearch.js";`,
      `export { buildGuidedQueue } from "${ROOT}/src/guidedQueue.js";`,
      `export { flattenVoyages } from "${ROOT}/src/mir.js";`,
      `export { ediWtField } from "${ROOT}/src/utils.js";`,
    ].join('\n'));
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    const B = require(o);
    const XLSX = require(path.join(ROOT, 'node_modules/xlsx'));
    global.window.XLSX = XLSX;
    const parse = async (aoa) => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Sheet1');
      const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      return ((await B.parseListExcel(u8)) || {}).records || [];
    };
    const by = (recs) => Object.fromEntries(recs.map((r) => [r.cn, r]));

    console.log('■ 컨 하나 40톤 초과는 무게 없음 (utils.plausibleListWtKg)');
    ok('상한 40,000kg', B.CONTAINER_WT_MAX_KG === 40000);
    ok('232,160 → 0 (STSE 2677E B/L 합계)', B.plausibleListWtKg(232160) === 0);
    ok('135,088 · 120,360 · 80,711 · 58,560 → 0', [135088, 120360, 80711, 58560].every((v) => B.plausibleListWtKg(v) === 0));
    ok('40,200 → 0 (40톤을 넘는 컨은 없다)', B.plausibleListWtKg(40200) === 0);
    ok('40,000 은 통과 · 31,095(전 항차 EDI 최대) 통과 · 19,480 통과', B.plausibleListWtKg(40000) === 40000 && B.plausibleListWtKg(31095) === 31095 && B.plausibleListWtKg(19480) === 19480);
    ok('톤 표기 27.6 → 27,600 (종전 보정 그대로)', B.plausibleListWtKg('27.6') === 27600);
    ok('0·빈칸 → 0', B.plausibleListWtKg(0) === 0 && B.plausibleListWtKg('') === 0);
    ok('parseListWeightKg 자체는 안 바뀐다 — 232,160 그대로(사진 판독 mixerUpload 가 0 을 엠티로 읽는 길을 막으려고)', B.parseListWeightKg(232160) === 232160);

    console.log('■ 리스트 파서 — SITC CDL 은 컨 단위 칸(CNT WGT), B/L 합계 Weight 로 안 돌아간다');
    {
      const fx = JSON.parse(rd('tools/fixtures/sitc_cdl_2677e_rows.json'));
      const r = by(await parse([fx.header, ...fx.rows]));
      ok('GESU3751720 — B/L Weight 232,160 이 아니라 CNT WGT 19,480 (종전 232,160 — 어느 장비도 못 드는 무게)', r.GESU3751720 && r.GESU3751720.wt === 19480, r.GESU3751720 && `wt=${r.GESU3751720.wt}`);
      ok('SKLU1402747 — 같은 B/L 의 다른 컨도 19,480', r.SKLU1402747 && r.SKLU1402747.wt === 19480);
      ok('HALU2518617 — B/L 58,560 이 아니라 CNT WGT 19,825', r.HALU2518617 && r.HALU2518617.wt === 19825);
      ok('SKLU1810097 — CNT WGT 20,000', r.SKLU1810097 && r.SKLU1810097.wt === 20000);
      ok('SKLU1539719 — CNT WGT 2,480 (B/L Weight 20,930 이 아님)', r.SKLU1539719 && r.SKLU1539719.wt === 2480);
      ok('5대 모두 40톤 이하', Object.values(r).every((x) => x.wt > 0 && x.wt <= 40000));
      //  CNT WGT 가 비면 같은 컨 단위인 VGM Weight — B/L 합계로 돌아가지 않는다
      const hi = fx.header.indexOf('CNT WGT'), gi = fx.header.indexOf('VGM Weight');
      const row0 = fx.rows.find((x) => x[fx.header.indexOf('CONTAINER')] === 'GESU3751720').slice();
      row0[hi] = '';
      const r2 = by(await parse([fx.header, row0]));
      ok('CNT WGT 가 비면 VGM Weight 21,680 (B/L 232,160 이 아님)', r2.GESU3751720 && r2.GESU3751720.wt === 21680, r2.GESU3751720 && `wt=${r2.GESU3751720.wt}`);
      row0[gi] = '';
      const r3 = by(await parse([fx.header, row0]));
      ok('둘 다 비면 무게 없음 0 (B/L 합계를 지어 쓰지 않는다)', r3.GESU3751720 && r3.GESU3751720.wt === 0, r3.GESU3751720 && `wt=${r3.GESU3751720.wt}`);
    }
    console.log('■ 다른 양식은 종전 그대로');
    {
      const t = by(await parse([['MSN', 'Cntr No.', 'Seal No.', 'Size', 'Type', 'T/S', 'F/E', 'G.Weight', 'T.Weight'], ['4000', 'DWSU8261992', 'CMLS01592', '4H', 'DC', 'LOCAL', 'F', '20,360.00', '24,170.00']]));
      ok('타사용 리스트 G.Weight 20,360 (종전 그대로)', t.DWSU8261992 && t.DWSU8261992.wt === 20360, t.DWSU8261992 && `wt=${t.DWSU8261992.wt}`);
      const s = by(await parse([['CNTR NO', 'SEAL', 'WEIGHT', 'Size', 'POL', 'POD', 'F/E'], ['TRHU8785558', 'SITZ680325', '2738.5', '40HC', 'CNTAO', 'KRPTK', 'F']]));
      ok('SIT 리스트 WEIGHT 2,738.5 → 2,739 (종전 그대로)', s.TRHU8785558 && s.TRHU8785558.wt === 2739 || (s.TRHU8785558 && s.TRHU8785558.wt === 2738), s.TRHU8785558 && `wt=${s.TRHU8785558.wt}`);
      const w = by(await parse([['No.', 'Container', 'Oper', 'ISO', 'class', 'F/M', 'Weight', 'POD', 'FND', 'Temp.', 'SEAL'], ['1', 'WDFU1220878', 'WDG', '2210', 'II', 'F', '16360', 'KRPTK', '', '', '1007847']]));
      ok('WDG 리스트 Weight 16,360 (종전 그대로)', w.WDFU1220878 && w.WDFU1220878.wt === 16360, w.WDFU1220878 && `wt=${w.WDFU1220878.wt}`);
    }

    console.log('■ 트윈 판정 — STSE 2677E 79쌍, 총중량(EDI)으로');
    const FX = JSON.parse(rd('tools/fixtures/stse2677e_twin_wt.json'));
    const cs = FX.containers;
    const pairs = B.buildTwinPairs(cs, FX.pairsMap);
    ok('트윈 후보 쌍 79', pairs.length === 79, `n=${pairs.length}`);
    //  검수사 규칙(합계 55톤)으로 EDI 총중량에서 직접 센 기대값 — 코드가 낸 값이 아니다
    const ediSum = (p) => p[0].wtEdi + p[1].wtEdi;
    const wantOver = pairs.filter((p) => ediSum(p) > 55000).length, wantHeavy = pairs.filter((p) => ediSum(p) > 50000 && ediSum(p) <= 55000).length;
    ok(`기준표 — 실제 55톤 초과 19 · 50~55톤 25 (표 ${wantOver}/${wantHeavy})`, wantOver === 19 && wantHeavy === 25);
    const lim = B.twinDiffLimit('PCTC');
    const an = B.analyzeTwinPairs(pairs, lim);
    ok('경보(over) 19쌍 = 기준표 19쌍', an.over.length === wantOver, `over=${an.over.length}`);
    ok('가능(ok) 60쌍 · 그 중 50~55톤 «주의» 25쌍', an.ok.length === 60 && an.ok.filter((p) => p.heavy).length === wantHeavy, `ok=${an.ok.length} heavy=${an.ok.filter((p) => p.heavy).length}`);
    ok('무게차 경보 0쌍 · 무게 없음 0쌍 (실제 총중량 기준)', an.diff.length === 0 && an.noWt.length === 0, `diff=${an.diff.length} noWt=${an.noWt.length}`);
    const overSet = new Set(an.over.map((p) => p.a.cn + p.b.cn));
    ok('경보 19쌍은 전부 실제 55톤 초과 — 오경보 0', pairs.filter((p) => ediSum(p) > 55000).every((p) => overSet.has(p[0].cn + p[1].cn)) && an.over.every((p) => p.total > 55000));
    //  종전(리스트 무게만) — wtEdi 를 지우면 옛 결과가 나온다: 30쌍 경보 중 진짜는 3쌍
    const old = B.analyzeTwinPairs(pairs.map(([a, b]) => [{ ...a, wtEdi: 0 }, { ...b, wtEdi: 0 }]), lim);
    const oldRealOver = old.over.filter((p) => ediSum(pairs.find((q) => q[0].cn === p.a.cn)) > 55000).length;   // 종전 경보 중 실제 총중량도 55톤 초과인 쌍
    ok(`비교 — 종전 리스트 무게는 경보 ${old.over.length}쌍(진짜 ${oldRealOver}쌍 · 오경보 ${old.over.length - oldRealOver} · 놓침 ${wantOver - oldRealOver}) 이었다`, old.over.length === 30 && oldRealOver === 3, `over=${old.over.length} real=${oldRealOver}`);
    //  종전 무게차 경보 13쌍은 «55톤 초과» 로도 걸려 over 쪽에 들어간다(analyzeTwinPairs 는 합계가 먼저) — 쌍의 무게 차이를 직접 센다
    const rawDiffOld = pairs.filter(([a, b]) => a.wt && b.wt && Math.abs(a.wt - b.wt) > lim).length;
    const rawDiffEdi = pairs.filter(([a, b]) => Math.abs(a.wtEdi - b.wtEdi) > lim).length;
    ok(`비교 — 종전 리스트 무게는 쌍의 무게차가 ${lim / 1000}톤을 넘는 쌍이 ${rawDiffOld}쌍이었다(실제 총중량으론 ${rawDiffEdi}쌍)`, rawDiffOld === 13 && rawDiffEdi === 0, `old=${rawDiffOld} edi=${rawDiffEdi}`);
    ok('twinWtOf — wtEdi 가 있으면 그것, 없으면 wt', B.twinWtOf({ wt: 27000, wtEdi: 29500 }) === 29500 && B.twinWtOf({ wt: 27000 }) === 27000 && B.twinWtOf(null) === 0);
    const txt = B.generateTwinCheckAnswer({ bay: null }, cs, FX.pairsMap, 'PCTC');
    ok('«트윈 확인» 답이 «불가» 로 단정하지 않고 싱글 권유 + 들 수 있으면 트윈', /싱글 작업을 권합니다/.test(txt) && /들 수 있으면 트윈/.test(txt) && !/트윈 불가/.test(txt), txt.split('\n')[0]);

    console.log('■ 싱글로 한 대 내린 뒤 남은 짝은 바로 다음 카드 — STSE 베이 11~13 홀드, 실제 큐 코드');
    {
      const PAIR = FX.pairsMap;
      const findTwin = (t, all, used) => { const pb = PAIR[parseInt(t.bay, 10)]; if (!pb) return null; return all.find((c) => !used.has(c.cn) && c.cn !== t.cn && parseInt(c.bay, 10) === parseInt(pb, 10) && c.row === t.row && c.tier === t.tier) || null; };
      const hold = cs.filter((c) => { const b = parseInt(c.bay, 10); return b >= 11 && b <= 13 && parseInt(c.tier, 10) < 80; });
      const build = (rem, front) => B.buildGuidedQueue({ containers: rem, mode: 'discharge', evenRowsSeaSide: false, findTwin, frontCns: front || null });
      let rem = hold.slice(), moved = 0, tested = 0, farBefore = 0;
      let guard = 0;
      while (rem.length && guard++ < 300) {
        const q = build(rem), card = q[0];
        if (card.twin && (card.main.wtEdi || 0) + (card.twin.wtEdi || 0) > 55000) {
          //  싱글 한 대(앞)만 완료 — 종전은 짝이 큐 끝으로 간다
          const after = rem.filter((c) => c.cn !== card.main.cn);
          const qOld = build(after);
          if (qOld[0].main.cn !== card.twin.cn) farBefore += 1;
          const qNew = build(after, [card.twin.cn]);   // 4.08-02: 남은 짝을 맨 앞으로(GuidedWorkPanel.handleConfirmOne 의 setResumeCns)
          tested += 1;
          if (qNew[0].main.cn === card.twin.cn && !qNew[0].twin) moved += 1;
          rem = after;
          continue;
        }
        rem = rem.filter((c) => c.cn !== card.main.cn && !(card.twin && c.cn === card.twin.cn));
      }
      ok(`55톤 초과 쌍에서 싱글 한 대 내린 ${tested}번 모두 남은 짝이 바로 다음 카드(단독)`, tested > 0 && moved === tested, `tested=${tested} moved=${moved}`);
      ok(`비교 — 종전엔 ${farBefore}번이 짝이 다음 카드가 아니었다(큐 끝으로 밀림)`, farBefore > 0, `far=${farBefore}`);
      //  3.77 «베이 먼저» 가 켜진 채로도 같다(감사 주의 4) — 고른 베이에 닿는 쌍은 한 대씩 나오되 고정된 짝이 맨 앞이다
      {
        const buildBF = (rem2, front, bf) => B.buildGuidedQueue({ containers: rem2, mode: 'discharge', evenRowsSeaSide: false, findTwin, frontCns: front || null, bayFirst: bf });
        let rem2 = cs.filter((c) => { const b = parseInt(c.bay, 10); return b >= 11 && b <= 17 && parseInt(c.tier, 10) < 80; }), t2 = 0, m2 = 0, g2 = 0;   // 11 베이는 한 대씩, 15↔17 쌍은 트윈 카드 그대로
        while (rem2.length && g2++ < 400) {
          const q = buildBF(rem2, null, 11), card = q[0];
          if (card.twin && (card.main.wtEdi || 0) + (card.twin.wtEdi || 0) > 55000) {
            const after = rem2.filter((c) => c.cn !== card.main.cn);
            t2 += 1;
            const qn = buildBF(after, [card.twin.cn], 11);
            if (qn[0].main.cn === card.twin.cn) m2 += 1;
            rem2 = after; continue;
          }
          rem2 = rem2.filter((c) => c.cn !== card.main.cn && !(card.twin && c.cn === card.twin.cn));
        }
        ok(`«11번 베이 먼저» 중에도 싱글 한 대 뒤 짝이 바로 다음 카드(${t2}번 중 ${m2}번)`, t2 > 0 && m2 === t2, `tested=${t2} moved=${m2}`);
      }
    }

    console.log('■ 전 항차 펼치기(떠 있는 미르·홈 통합검색) — 작업창과 같은 답이어야 한다 (4.08-02 감사 지적)');
    {
      //  STSE 2677E 실데이터를 실제 보관소 모양으로 — EDI 컨(wt = EDI 총중량) + 리스트 records(wt = 종전 앱 값 · B/L 합계 포함)
      const edi = {}, recs = {};
      cs.forEach((c) => {
        edi[c.cn] = { cn: c.cn, bay: c.bay, row: c.row, tier: c.tier, iso: c.iso, pod: 'KRPTK', pol: 'JPSDJ', fe: 'F', wt: c.wtEdi };
        recs[c.cn] = { cn: c.cn, wt: c.wt, pod: 'KRPTK' };
      });
      const v = { info: { vsl: 'STSE', voy: '2677E' }, discharge: { ediContainers: edi, records: recs } };
      const flat = B.flattenVoyages({ STSE_2677E: v }).filter((c) => c.mode === 'discharge');
      ok('펼친 컨 498대', flat.length === 498, `n=${flat.length}`);
      ok('펼친 뒤에도 컨 하나가 40톤을 넘는 무게는 없다(종전 69대 — 최대 232톤)', flat.every((c) => (c.wt || 0) <= 40000), `max=${Math.max(...flat.map((c) => c.wt || 0))}`);
      ok('펼친 컨마다 EDI 총중량이 wtEdi 로 남는다', flat.every((c) => c.wtEdi === edi[c.cn].wt));
      const fpairs = B.buildTwinPairs(flat, FX.pairsMap);
      const fan = B.analyzeTwinPairs(fpairs, lim);
      ok(`펼친 컨으로 센 트윈 — 경보 ${fan.over.length}쌍 · 가능 ${fan.ok.length}쌍 = 작업창 경로와 같다(19 · 60)`, fpairs.length === 79 && fan.over.length === 19 && fan.ok.length === 60, `pairs=${fpairs.length} over=${fan.over.length} ok=${fan.ok.length}`);
      const ftxt = B.generateTwinCheckAnswer({ bay: null }, flat, FX.pairsMap, 'PCTC');
      ok('미르 «트윈 확인» 첫 줄이 작업창 경로와 같다', ftxt.split('\n')[0] === txt.split('\n')[0], `${ftxt.split('\n')[0]} ↔ ${txt.split('\n')[0]}`);
      ok('미르 답에 232톤 같은 컨 합계가 나오지 않는다(합계 최대 60톤 미만)', Math.max(0, ...fan.over.map((p) => p.total)) < 60000, `max=${Math.max(0, ...fan.over.map((p) => p.total))}`);
      ok('ediWtField — EDI 무게가 없으면 wtEdi 를 만들지 않는다(0 을 지어내지 않는다)', JSON.stringify(B.ediWtField({ cn: 'X', wt: 0 })) === '{}' && JSON.stringify(B.ediWtField({ cn: 'X', wt: 21680 })) === '{"wtEdi":21680}' && JSON.stringify(B.ediWtField(null)) === '{}');
      //  리스트에만 있는 컨(EDI 없음)의 B/L 합계는 무게 없음으로 — 지어내지 않는다
      const v2 = { info: { vsl: 'STSE', voy: '2677E' }, discharge: { ediContainers: {}, records: { GESU3751720: { cn: 'GESU3751720', wt: 232160, pod: 'KRPTK' } } } };
      const f2 = B.flattenVoyages({ K: v2 }).find((c) => c.cn === 'GESU3751720');
      ok('EDI 없는 리스트 컨의 232,160 은 무게 없음(0·빈칸)', f2 && !(f2.wt > 0), f2 && `wt=${f2.wt}`);
    }

    console.log('■ 배선 — 잠금 해제 · 경보뿐');
    {
      const P = rd('src/components/GuidedWorkPanel.jsx');
      ok('«트윈 한 번에» 버튼은 busy 일 때만 잠긴다', /<button onClick=\{handleConfirm\} disabled=\{busy\}/.test(P));
      ok('버튼 글귀에 «잠김» 이 없다', !/무게 초과로 잠김/.test(P));
      ok('55톤 초과 경보는 «싱글 작업을 권합니다. 들 수 있으면 트윈으로 하십시오»', /싱글 작업을 권합니다\. 들 수 있으면 트윈으로 하십시오/.test(P));
      ok('50~55톤 «한계 근처» 주의가 있다', /50톤 넘음\) — 한계 근처입니다/.test(P));
      ok('판정은 twinWtOf(총중량) 한 벌', /twinWtOf\(card\.main\), wb = twinWtOf\(card\.twin\)/.test(P));
      ok('싱글 한 대 뒤 남은 짝을 다음 카드로 올린다', /setResumeCns\(mate && mate\.cn \? \[mate\.cn\] : \[\]\)/.test(P));
      const SP = rd('src/components/SearchPanel.jsx');
      ok('SearchPanel 병합이 EDI 총중량을 wtEdi 로 남긴다(utils.ediWtField 한 벌)', /merged\[c\.cn\] = \{ \.\.\.c, \.\.\.ediWtField\(c\) \}/.test(SP));
      ok('SearchPanel 병합이 40톤 상한(plausibleListWtKg)을 건다', /k === 'wt'\) \{ const _w = plausibleListWtKg\(v\)/.test(SP));
      const VP = rd('src/pages/VoyagePage.jsx');
      ok('EDI 컨을 병합 맵에 넣는 자리마다 ediWtField(항차 화면 둘 · 작업창 · 전 항차 펼치기)', (VP.match(/\.\.\.ediWtField\(c\)/g) || []).length === 2 && /\.\.\.ediWtField\(c\)/.test(rd('src/mir.js')));
      const M = rd('src/mir.js');
      ok('미르 트윈 답이 «싱글 권유»(막지 않음) — «⛔ 트윈 불가» 가 없다', /싱글 권유/.test(M) && !/⛔ \*\*트윈 불가/.test(M));
      ok('미르·브리핑 판정도 twinWtOf', /twinWtOf\(card\.main\), wb = twinWtOf\(card\.twin\)/.test(M));
    }
  } finally {
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 폴더 */ }
  }
  console.log(bad ? `\n✗ 4.08-02 연막검사 ${bad}/${n} 실패` : `\n✓ 4.08-02 연막검사 통과 ${n}/${n} — 총중량 판정 · 경보뿐 · 40톤 상한 · SITC 컨 단위 칸 · 짝 고정`);
  process.exit(bad ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
