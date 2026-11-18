// 5.11 연막검사 — 양하 순서 검토(검수사 2026-11-18 설문 Q1~Q22)에서 승인된 다섯을 실데이터(지금 작업 중 KSKM 2621N·YKTD 2617E · 다음 항차 TMPZ 2039E·DPRT 2613N)로 지킨다.
//   ① 보류는 되묻지 않는다(«검수사가 누르기 전까지 검수사를 재촉하는일이 없어야 합니다») ② 트윈 50톤부터 싱글 권유·27톤 이상 깜박임 ③ 싱글 «이것부터» 뒤에는 그 베이를 이어 감 · 트윈 카드마다 앞/뒤 먼저
//   ④ 양하 오버하이 OT 는 FR 처럼 먼저(일반 높이 OT 는 그대로) ⑤ 양하 중 선적 플랜이 있으면 해치 장수에 선적 대상 장을 넣고 알림.
//   기준 — 오버하이 OT 가 없는 배에서는 큐 순서가 5.10 과 한 칸도 다르지 않아야 한다(지문은 5.10 번들로 뽑아 fixture 에 넣었다 · node tools/smoke_unload511.cjs <루트> <5.10 번들> 로 다시 뽑는다).
//   ⚠ 지금 자료에는 오버하이 OT 가 없다 — ④의 «먼저 나온다» 는 DPRT 실 OT 한 대에 높이 초과 30cm 를 넣은 사본으로 본다(그 사실을 줄에 적는다).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const OLD_BUNDLE = process.argv[3] || '';
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'unload511_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = global.localStorage || { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const _cw = console.warn; console.warn = (...a) => { if (/베이사전/.test(String(a[0]))) return; _cw(...a); };

const FX = JSON.parse(rd('tools/fixtures/unload511_voyages.json'));
window.__fbShipBayDict = FX.dicts;
const gOf = (b) => { b = parseInt(b, 10); return b % 2 === 0 ? b : (((b + 1) % 4 === 2) ? b + 1 : b - 1); };
const isDeck = (t) => parseInt(t, 10) >= 80;
const ptk = (m, c) => /KRPTK|KRPYT|PYEONGTAEK/i.test(String((m === 'loading' ? c.pol : c.pod) || ''));
const sig = (q) => q.map((c) => c.main.cn + (c.twin ? '+' + c.twin.cn : '')).join(',');

(async () => {
  try {
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, [
      `export { fullEdiMapOf, hatchOpenableFor, hatchPanelDetailOf, isOpenTopIso, guideTwinOf } from "${ROOT}/src/utils.js";`,
      `export { buildGuidedQueue } from "${ROOT}/src/guidedQueue.js";`,
      `export { findTwinCandidate } from "${ROOT}/src/twin.js";`,
    ].join('\n'));
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    const B = require(o);
    const OLD = OLD_BUNDLE ? require(path.resolve(OLD_BUNDLE)) : null;

    //  ── 큐 지문(배·모드·묶음·단·접안 좌우·로우 방향) ──
    const digestOf = (X) => {
      const out = {};
      for (const [k, v] of Object.entries(FX.voyages)) {
        const h = crypto.createHash('sha1'); let cnt = 0;
        for (const m of ['discharge', 'loading']) {
          const sec = v[m] || {}; const comp = sec.completed || {};
          const all = Object.values(X.fullEdiMapOf(sec)).filter((c) => c && c.bay && c.row && c.tier && ptk(m, c) && !comp[c.cn]);
          const byG = {}; for (const c of all) (byG[gOf(c.bay)] ||= []).push(c);
          for (const g of Object.keys(byG).sort((a, b) => a - b)) for (const tier of ['deck', 'hold']) for (const side of [true, false]) for (const rowFrom of ['land', 'sea']) {
            const t = byG[g].filter((c) => (tier === 'deck' ? isDeck(c.tier) : !isDeck(c.tier))); if (!t.length) continue;
            const q = X.buildGuidedQueue({ containers: t, mode: m, evenRowsSeaSide: side, findTwin: X.guideTwinOf((x, a, u) => X.findTwinCandidate(x, a, u, '', v.info.vsl, all)), rowFrom: m === 'discharge' ? rowFrom : null, planAll: all });
            h.update(`${k}|${m}|B${g}${tier}|${side}|${rowFrom}|${sig(q)}\n`); cnt += 1;
          }
        }
        out[k] = { sha1: h.digest('hex'), queues: cnt };
      }
      return out;
    };
    if (OLD) { console.log(JSON.stringify(digestOf(OLD), null, 1)); process.exit(0); }

    console.log('■ ④ 순서 — 오버하이 OT 가 없는 배는 5.10 과 같은 순서');
    {
      const got = digestOf(B), want = FX.digest510 || {};
      for (const k of Object.keys(FX.voyages)) ok(`${k} — 큐 ${got[k].queues}개 지문이 5.10 과 같다`, want[k] && want[k].sha1 === got[k].sha1, want[k] ? `기대 ${want[k].sha1.slice(0, 10)} 실제 ${got[k].sha1.slice(0, 10)}` : '지문 없음');
    }

    console.log('■ ④ 오픈탑 — 일반 높이 OT 는 그대로 · 오버하이 OT 는 FR 처럼 먼저');
    {
      const v = FX.voyages.DPRT_2613N;
      const all = Object.values(B.fullEdiMapOf(v.discharge)).filter((c) => c && c.bay && c.row && c.tier);
      const ot = all.find((c) => c.ot || B.isOpenTopIso(c.iso));
      ok(`DPRT 2613N 실 OT 한 대가 있다 (${ot ? `${ot.cn} ${ot.iso} ${ot.bay}-${ot.row}-${ot.tier} 높이 초과 ${ot.ovh || 0}` : '없음'})`, !!ot);
      if (ot) {
        const grp = all.filter((c) => gOf(c.bay) === gOf(ot.bay) && isDeck(c.tier) === isDeck(ot.tier));
        const q = (list) => B.buildGuidedQueue({ containers: list, mode: 'discharge', evenRowsSeaSide: true, findTwin: null });
        const idx = (qq) => qq.findIndex((cd) => cd.main.cn === ot.cn || cd.twin?.cn === ot.cn);
        const above = grp.filter((c) => c.row === ot.row && parseInt(c.tier, 10) > parseInt(ot.tier, 10) && Math.abs(parseInt(c.bay, 10) - parseInt(ot.bay, 10)) <= 1).length;
        ok(`일반 높이 OT 는 맨 앞으로 끌어오지 않는다 — 큐 자리 ${idx(q(grp))}(0 이 아님)`, idx(q(grp)) > 0);
        const hi = grp.map((c) => (c.cn === ot.cn ? { ...c, ovh: 30 } : c));   // ⚠ 실데이터 변형(높이 초과 30cm) — 지금 자료에 오버하이 OT 가 없다
        ok(`[변형 사본: 높이 초과 30cm] 위에 남은 컨 ${above}대 → 오버하이 OT 가 맨 앞(자리 ${idx(q(hi))})`, above === 0 && idx(q(hi)) === 0);
        const frOnly = grp.map((c) => (c.cn === ot.cn ? { ...c, ovh: 30, fr: true } : c));
        ok('FR 판정 갈래는 그대로(FR 이면 먼저)', idx(q(frOnly)) === 0);
      }
      const G = rd('src/guidedQueue.js');
      ok('양하 먼저 갈래에 otHighOf(오버하이 OT) · 선적은 FR·OT·OOG 마지막 그대로', /: \(c\.fr \|\| twin\?\.fr \|\| otHighOf\(c\) \|\| otHighOf\(twin\)\)/.test(G) && /\(c\.fr \|\| c\.ot \|\| c\.oog \|\| twin\?\.fr \|\| twin\?\.ot \|\| twin\?\.oog\)/.test(G));
      ok('오버하이 판정은 ot 또는 isOpenTopIso 한 벌 + ovh > 0', /const otHighOf = \(c\) => !!c && !c\.fr && \(!!c\.ot \|\| isOpenTopIso\(c\.iso\)\) && Number\(c\.ovh \|\| 0\) > 0;/.test(G));
    }

    console.log('■ ③ 싱글 «이것부터» 뒤 — 짝이 아니라 그 베이를 한 대씩 이어 간다');
    {
      let tested = 0, same = 0, keptPhys = 0;
      for (const k of ['KSKM_2621N', 'YKTD_2617E', 'TMPZ_2039E']) {
        const v = FX.voyages[k]; const sec = v.discharge; const comp = sec.completed || {};
        const all = Object.values(B.fullEdiMapOf(sec)).filter((c) => c && c.bay && c.row && c.tier && ptk('discharge', c) && !comp[c.cn]);
        const byG = {}; for (const c of all) (byG[gOf(c.bay) + (isDeck(c.tier) ? 'd' : 'h')] ||= []).push(c);
        const ft = B.guideTwinOf((x, a, u) => B.findTwinCandidate(x, a, u, '', v.info.vsl, all));
        for (const cs of Object.values(byG)) {
          const q = B.buildGuidedQueue({ containers: cs, mode: 'discharge', evenRowsSeaSide: true, findTwin: ft });
          const c0 = q.find((c) => c.twin); if (!c0) continue;
          const one = c0.main, b = parseInt(one.bay, 10);
          const done = new Set(q.slice(0, q.indexOf(c0)).flatMap((cd) => [cd.main.cn, cd.twin?.cn]).filter(Boolean)); done.add(one.cn);
          const rest = cs.filter((c) => !done.has(c.cn));
          if (!rest.some((c) => parseInt(c.bay, 10) === b)) continue;
          const qn = B.buildGuidedQueue({ containers: rest, mode: 'discharge', evenRowsSeaSide: true, findTwin: ft, bayFirst: b });
          tested += 1;
          if (parseInt(qn[0].main.bay, 10) === b && !qn[0].twin && qn[0].main.cn !== c0.twin.cn) same += 1;
          //  물리 — 다음 카드 위에 안 내린 컨이 없다
          const nx = qn[0].main; if (!rest.some((c) => c.cn !== nx.cn && c.row === nx.row && parseInt(c.tier, 10) > parseInt(nx.tier, 10) && (parseInt(c.bay, 10) === parseInt(nx.bay, 10) || parseInt(c.bay, 10) % 2 === 0))) keptPhys += 1;
        }
      }
      ok(`트윈 카드 ${tested}곳에서 앞 한 대를 내린 뒤 다음 카드가 그 베이 한 대(짝 아님) — ${same}/${tested}`, tested >= 5 && same === tested);
      ok(`그 다음 카드는 위에 남은 컨이 없는 칸 — ${keptPhys}/${tested}`, keptPhys === tested);
      const P = rd('src/components/GuidedWorkPanel.jsx');
      ok('싱글 패널 «이것부터» 는 handleConfirmOne(k, { single: true })', /onClick=\{\(\) => handleConfirmOne\(k, \{ single: true \}\)\}/.test(P));
      ok('single 이면 resumeCns 를 비우고 그 베이를 bayFirst 로 · 아니면 종전 짝 고정', /if \(opt\.single && Number\.isFinite\(_bOne\)\) \{\s*setConsecFix\(0\); setFixOpen\(false\); setFixQuery\(''\); setSingleMode\(false\); setResumeCns\(\[\]\); setBayFirst\(_bOne\);\s*\} else \{\s*setConsecFix\(0\); setFixOpen\(false\); setFixQuery\(''\); setSingleMode\(false\); setResumeCns\(mate && mate\.cn \? \[mate\.cn\] : \[\]\);\s*\}/.test(P));
      ok('트윈 카드 예외 줄에 [앞 N번 먼저] [뒤 N번 먼저](data-gw-bayfirst-row) — 같은 bayFirst 길', /data-gw-bayfirst-row="1"/.test(P) && /setBayFirst\(b\); \}, on, 'sky'\)/.test(P));
    }

    console.log('■ ① 보류 — 되묻지 않는다');
    {
      const P = rd('src/components/GuidedWorkPanel.jsx');
      ok('holdDue 는 늘 null(되묻기 차례 계산을 없앴다)', /const holdDue = null;/.test(P) && !/HOLD_ASK_AFTER/.test(P));
      ok('«이제 됩니까?» 물음 카드·[아직 — 나중에 다시] 단추가 없다', !/이제 됩니까\?<\/div>/.test(P) && !/아직 — 나중에 다시/.test(P) && !/doSnooze/.test(P));
      ok('보류 줄(눌러야 펼침)과 [해제] 는 그대로', /setHoldList\(v => !v\)/.test(P) && /onClick=\{\(\) => doRelease\(h\)\}/.test(P));
      const U = rd('src/utils.js');
      ok('내려간 컨의 보류는 저절로 빠진다(activeHeldOf — completed 에 있으면 뺀다)', /\.filter\(\(x\) => x\.reason && !comp\[x\._key\] && !comp\[x\.cn\]\)/.test(U));
    }

    console.log('■ ② 트윈 무게 — 50톤부터 싱글 권유 · 27톤 이상 깜박임');
    {
      const P = rd('src/components/GuidedWorkPanel.jsx');
      ok('50~55톤 문구 «싱글 권유 · 55톤까지 트윈 가능합니다»', /\(50톤 넘음\) — 싱글 권유 · 55톤까지 트윈 가능/.test(P));
      ok('50톤 넘으면 [싱글로 한 대씩] 단추가 켜진다(heavy 도 skyhint)', /\(twinWtWarn\?\.over \|\| twinWtWarn\?\.heavy\) && !singleMode \? 'skyhint' : 'sky'/.test(P));
      ok('27톤 깜박임 — 트윈 카드·싱글 아님·카드의 두 컨·twinWtOf ≥ 27000', /const HEAVY_BLINK_KG = 27000;/.test(P) && /card\.twin && !singleMode && \(String\(c\.cn\) === String\(card\.main\.cn\) \|\| String\(c\.cn\) === String\(card\.twin\.cn\)\) && twinWtOf\(c\) >= HEAVY_BLINK_KG/.test(P) && /animate-pulse/.test(P));
      //  실데이터 — 지금 작업 중 두 배의 트윈 쌍에서 27톤 이상 컨 수(깜박일 컨)
      let n27 = 0, nPair = 0;
      for (const k of ['KSKM_2621N', 'YKTD_2617E']) {
        const v = FX.voyages[k]; const sec = v.discharge; const comp = sec.completed || {};
        const all = Object.values(B.fullEdiMapOf(sec)).filter((c) => c && c.bay && c.row && c.tier && ptk('discharge', c) && !comp[c.cn]);
        const ft = B.guideTwinOf((x, a, u) => B.findTwinCandidate(x, a, u, '', v.info.vsl, all));
        const q = B.buildGuidedQueue({ containers: all, mode: 'discharge', evenRowsSeaSide: true, findTwin: ft });
        for (const cd of q) if (cd.twin) { nPair += 1; for (const c of [cd.main, cd.twin]) if ((parseInt(c.wtEdi, 10) || parseInt(c.wt, 10) || 0) >= 27000) n27 += 1; }
      }
      console.log(`    (참고) 지금 작업 중 두 배 양하 트윈 ${nPair}쌍 · 27톤 이상 컨 ${n27}대`);
      ok('트윈 쌍을 실제로 만든다(무게 칩 시험 대상이 있다)', nPair > 0);
      const M = rd('src/mir.js');
      ok('미르 머리말이 무게대로 갈린다 — 50~55톤은 «합계가 50톤을 넘어», 55톤 초과만 «합계가 55톤을 넘어»(감사 지적)', /w\.includes\('55톤 초과'\) \? `\$\{head\} — \*\*트윈 자리입니다\. 합계가 55톤을 넘어/.test(M) && /: w\.includes\('50톤 넘음'\) \? `\$\{head\} — \*\*트윈 자리입니다\. 합계가 50톤을 넘어 싱글을 권합니다\(55톤까지 트윈 가능\)/.test(M));
      ok('미르 단독 카드 — 오버하이 OT 를 FR 이라 하지 않는다', /c\.fr \? '\\n  ⚠ FR\(플랫랙\)입니다/.test(M) && /오픈탑\(높이 초과\)입니다/.test(M));
      ok('미르도 50~55톤을 «싱글 권유 — 55톤까지 트윈 가능» 으로 말한다', /\*\*싱글 권유\*\* — 총중량\(EDI\) 합계 \$\{formatWt\(total\)\} \(50톤 넘음\)\. 55톤까지 트윈 가능\./.test(M));
    }

    console.log('■ ⑤ 해치 — 양하 중 선적 플랜이 있으면 선적 대상 장을 넣고 알린다');
    {
      let panels = 0, changed = 0, closeChanged = 0;
      for (const k of ['KSKM_2621N', 'YKTD_2617E']) {
        const v = FX.voyages[k]; const d = FX.dicts[v.info.vsl];
        const bays = [...new Set((d.bayDef.baysSummary || []).map((x) => parseInt(x.bayNo ?? x.bay, 10)))];
        for (const b of bays) {
          const r = B.hatchOpenableFor(v, 'discharge', b, d); if (!r) continue;
          if (r.panels.some((p) => (p.loadHold || []).length)) panels += 1;
          const noLoad = B.hatchOpenableFor({ ...v, loading: {} }, 'discharge', b, d);
          if (noLoad && noLoad.needed !== (r.neededDis ?? r.needed)) changed += 1;
          const lc = B.hatchOpenableFor(v, 'loading', b, d), lc0 = B.hatchOpenableFor({ ...v }, 'loading', b, d);
          if (lc && lc0 && (lc.needed !== lc0.needed || lc.loadAdded)) closeChanged += 1;
        }
      }
      ok(`선적 홀드 평택분이 든 장을 센다(베이 ${panels}곳에 loadHold)`, panels > 0);
      ok('선적 자료를 빼면 양하 장수는 종전 값(neededDis) 그대로', changed === 0, `다른 곳 ${changed}`);
      ok('선적 모드 계산은 손대지 않는다(loadAdded 없음)', closeChanged === 0);
      //  지금 두 배는 선적 대상 장이 양하 장과 겹쳐 더해지는 장이 없다 — 더해지는 갈래는 양하 자료를 뺀 사본으로 본다
      {
        const v = FX.voyages.KSKM_2621N; const d = FX.dicts.KSKM;
        const noDis = { ...v, discharge: { ...v.discharge, completed: Object.fromEntries(Object.keys(B.fullEdiMapOf(v.discharge)).map((cn) => [cn, { by: '연막' }])) } };
        const r = B.hatchOpenableFor(noDis, 'discharge', 20, d);
        //  양하 평택분을 다 내린 것으로 한 사본 — 홀드 양하분은 «열어야 할 장» 으로 그대로 센다(3.2-01 «내렸어도 센다») 그래서 더해지는 장 0 이 맞다
        ok(`[사본: 양하 다 내림] B20 — 열 장 ${r && r.needed} · 선적 대상만으로 더한 장 ${r && (r.loadAdded || 0)}(양하분이 장마다 있어 0)`, !!r && (r.loadAdded || 0) === 0);
      }
      const U2 = rd('src/utils.js'), G2 = rd('src/components/GuidedWorkPanel.jsx'), W2 = rd('src/components/WorkReportModal.jsx');
      ok('선적 대상 장은 확인 창 오픈(withLoad)에서만 — 배너·따라가기 자동 기록(hatchPanelCountOf)·닫기는 양하 장(neededDis)만(감사 지적)', /const _withLoad = !!\(opts && opts\.withLoad\) && String\(action \|\| ''\)\.toLowerCase\(\) === 'open';/.test(U2) && /needed: \(_withLoad \? r\.needed : \(r\.neededDis \?\? r\.needed\)\) \?\? r\.openable/.test(U2) && /return hatchPanelDetailOf\(voyage, mode, bays, dictEntry, groupCenterOf, action\)\.count;/.test(U2));
      ok('확인 창 두 곳(자동 가이드·작업 보고)만 { withLoad: true } · 작업 보고 미리 맞춤은 닫기면 양하 장만', (G2.match(/groupCenterOf, action, \{ withLoad: true \}\)/g) || []).length === 1 && /hatchAction, \{ withLoad: true \}\)/.test(W2) && /hatchAction === 'open' \? x\.needed : \(x\.neededDis \?\? x\.needed\)/.test(W2));
      {
        let diffNoWin = 0, diffClose = 0;
        for (const k of ['KSKM_2621N', 'YKTD_2617E']) {
          const v = FX.voyages[k]; const d = FX.dicts[v.info.vsl];
          for (const b of [...new Set((d.bayDef.baysSummary || []).map((x) => parseInt(x.bayNo ?? x.bay, 10)))].filter((x) => x % 2 === 0)) {
            const bays = [b - 1, b, b + 1];
            const a0 = B.hatchPanelDetailOf({ ...v, loading: {} }, 'discharge', bays, d, gOf, 'open'), a1 = B.hatchPanelDetailOf(v, 'discharge', bays, d, gOf, 'open');
            const c0 = B.hatchPanelDetailOf({ ...v, loading: {} }, 'discharge', bays, d, gOf, 'close'), c1 = B.hatchPanelDetailOf(v, 'discharge', bays, d, gOf, 'close', { withLoad: true });
            if (a0.count !== a1.count || a1.loadAdded) diffNoWin += 1;
            if (c0.count !== c1.count || c1.loadAdded) diffClose += 1;
          }
        }
        ok(`실데이터 — 창 없는 길(오픈)·닫기는 선적 자료가 있어도 장수가 종전과 같다(어긋남 ${diffNoWin}·${diffClose})`, diffNoWin === 0 && diffClose === 0);
      }
      ok('선적 «실린 칸 지정»(맞교환) 싱글 길도 짝이 아니라 그 베이를 이어 간다(singlePosRef)', /singlePosRef\.current = !!opt\.single; setPosFor\(one\); return;/.test(G2) && /if \(Number\.isFinite\(_sb\)\) \{ setResumeCns\(\[\]\); setBayFirst\(_sb\); \} else/.test(G2));
      const H = rd('src/components/HatchCountConfirm.jsx');
      ok('장수 확인 창이 «선적 대상 N장을 열 장에 넣었습니다» 를 알린다(data-hatch-loadnote)', /data-hatch-loadnote="1"/.test(H) && /선적 대상 \{d\.loadAdded\}장을 열 장에 넣었습니다/.test(H));
      ok('장마다 «선적 N대» · 묶음 줄에 «선적 대상 N장 포함»', /p\.nLoad > 0 \? ` · 선적 \$\{p\.nLoad\}대`/.test(H) && /선적 대상 \{g\.loadAdded\}장 포함/.test(H));
    }

    console.log('■ 매뉴얼·업데이트 문구');
    {
      const Hd = rd('src/data/helpData.js'), U = rd('src/utils.js');
      ok('매뉴얼 — 보류 되묻지 않음 · 50톤 · 27톤 · 앞/뒤 먼저 · 그 베이 이어 감 · 선적 대상 장 · 오버하이 OT', /보류는 앱이 되묻지 않는다/.test(Hd) && /장비 기준은 50톤이다/.test(Hd) && /27톤 이상이면 그 컨의 무게 칩이 붉게 깜박인다/.test(Hd) && /\[앞 N번 먼저\] \[뒤 N번 먼저\]/.test(Hd) && /탭한 쪽 베이를 한 대씩 이어 간다/.test(Hd) && /선적 대상 장도 열 장에 넣는다/.test(Hd) && /높이가 넘는 OT\(오버하이\)도 FR처럼 먼저/.test(Hd));
      ok('APP_VERSION 5.11(·-NN) · APP_NOTE 두 문장 이내·120자 미만', /APP_VERSION = 'TallyOne 5\.(1[1-9]|[2-9]\d)(-\d\d)?'/.test(U) && /APP_NOTE = '5\.\d\d(-\d\d)? [^']{10,115}'/.test(U));
      //  ★ 5.11-01 — 화면·미르·매뉴얼 문구에 사람 능력을 따지는 말을 넣지 않는다(검수사 2026-11-18 12:32 «만약에 클로드 능력에 따라 이런게 붙는다면 클로드는 좋게 보일까요?»)
      const _says = ['src/components/GuidedWorkPanel.jsx', 'src/mir.js', 'src/nlSearch.js', 'src/data/helpData.js'].map(rd).join('\n');
      ok('«기사 능력» 이라는 말이 화면·미르·매뉴얼 어디에도 없다', !/기사 능력/.test(_says));
    }
  } catch (e) {
    bad += 1; console.log('  ✘ 예외', e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e);
  } finally {
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 폴더 */ }
  }
  console.log(bad ? `\n✗ 5.11 연막검사 ${bad}/${n} 실패` : `\n✓ 5.11 연막검사 통과 ${n}/${n} — 보류 되묻지 않음 · 50톤·27톤 · 싱글 그 베이 이어 감 · 앞/뒤 먼저 · 오버하이 OT · 선적 대상 장`);
  process.exit(bad ? 1 : 0);
})();
