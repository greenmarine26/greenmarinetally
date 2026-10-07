// 4.09 연막검사 — 양하 순서 조건(호기별 «육상·해상부터 + 풀·엠티·일반·리퍼·20·40 부터») · 실서버 항차 5척 양하 EDI(DJCT 0225E·OBWH 2759E·KBTR 2608E·RZOR R110E·PCSZ 2631E[FR 9대])
//   검수사 2026-10-07 «양하 방법을 해상 부터 육상부터 20부터 40부터 리퍼부터 이런조건들을 다 적용할수 있게 해주세요» · «장비 기사의 작업 방법이 틀려서 입니다» · «리퍼부터 일반부터등등».
//   지키는 것 — ① 조건을 안 걸면 종전(4.08-02) 순서와 한 칸도 다르지 않다 ② 조건을 걸어도 카드는 그대로·데크가 홀드보다 먼저·위에 컨이 남은 칸은 앞당기지 않는다(물리 규칙 불변)
//             ③ 고른 부류가 내릴 수 있는 칸에서 먼저 나온다(기준표는 코드가 아니라 «검수사가 말한 규칙»에서 뽑는다) ④ 먼저 고른 것이 우선 ⑤ 호기별로 저장되고 화면·미르가 같은 칸을 읽는다
//   기대값은 코드가 내는 값이 아니라 EDI 에 적힌 자리·규격·F/E·리퍼 표시와 «위에 남은 컨이 있으면 못 내린다» 는 규칙에서 센다.
//   기본 순서 지문(defaultDigest)은 4.08-02 의 guidedQueue 를 번들해 뽑은 것이다(node tools/smoke_workorder409.cjs <루트> <옛 번들> 로 다시 뽑는다).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const OLD_BUNDLE = process.argv[3] || '';   // 지문 재생성용(4.08-02 guidedQueue 번들)
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'workorder409_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = global.localStorage || { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

//  ── 실데이터와 기준표 ──
const FX = JSON.parse(rd('tools/fixtures/workorder409_voyages.json'));
const gOf = (b) => { b = parseInt(b, 10); return b % 2 === 0 ? b : (((b + 1) % 4 === 2) ? b + 1 : b - 1); };   // 베이 → 묶음 중심(짝수 베이)
const isDeck = (t) => parseInt(t, 10) >= 80;
const is20 = (c) => String(c.iso || '')[0] === '2';
//  트윈 짝 — 20ft 두 대가 이웃 베이(짝수 위치 4칸)·같은 로우·같은 티어. 앱의 findTwinCandidate 는 선박 사전을 더 보지만 순서 규칙 검사에는 이 정도면 된다.
const findTwin = (t, all, used) => {
  const b = parseInt(t.bay, 10); if (b % 2 === 0) return null;
  const mate = b % 4 === 3 ? b + 2 : b - 2;
  return all.find((o) => !used.has(o.cn) && o.cn !== t.cn && is20(o) && parseInt(o.bay, 10) === mate && o.row === t.row && o.tier === t.tier) || null;
};
const groupsOf = (list) => { const g = {}; for (const c of list) { if (c.pod && c.pod !== 'KRPTK') continue; (g[gOf(c.bay)] ||= []).push({ ...c, l4: c.cn.slice(-4), _mode: 'discharge', _ptk: true }); } return g; };
const sig = (q) => q.map((c) => c.main.cn + (c.twin ? '+' + c.twin.cn : '')).join(',');
//  물리 규칙 — 같은 단(데크/홀드)·같은 열(같은 로우, 같은 베이이거나 한쪽이 짝수베이 40)에서 더 높은 칸이 남아 있으면 못 내린다.
const posOf = (card) => (card.twin ? [card.main, card.twin] : [card.main]);
const stack = (a, b) => a.row === b.row && (parseInt(a.bay, 10) === parseInt(b.bay, 10) || parseInt(a.bay, 10) % 2 === 0 || parseInt(b.bay, 10) % 2 === 0);
const blockedIn = (card, pool) => pool.some((o) => o !== card && isDeck(o.main.tier) === isDeck(card.main.tier)
  && posOf(o).some((op) => posOf(card).some((p) => stack(op, p) && parseInt(op.tier, 10) > parseInt(p.tier, 10))));
//  위에 남은 칸이 있는데 먼저 나온 쌍의 수(종속 위반) — 조건을 걸어도 늘면 안 된다.
const violations = (q) => { let v = 0; for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) {
  const a = q[i], b = q[j]; if (isDeck(a.main.tier) !== isDeck(b.main.tier)) continue;
  if (posOf(b).some((bp) => posOf(a).some((ap) => stack(bp, ap) && parseInt(ap.tier, 10) > 0 && parseInt(bp.tier, 10) > parseInt(ap.tier, 10)))) v += 1; } return v; };
const SETTINGS = [['RF'], ['GEN'], ['E'], ['F'], ['20'], ['40'], ['RF', '20'], ['20', 'RF'], ['E', '20'], ['GEN', '20'], ['RF', '40'], ['F', '40']];
const sizeOf = (card) => (card.twin ? '20' : (is20(card.main) ? '20' : '40'));

(async () => {
  try {
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, [
      `export { buildGuidedQueue, conClassOf } from "${ROOT}/src/guidedQueue.js";`,
      `export { ORDER_PREF_KEYS, ORDER_PREF_LABEL, ALL_EQUIP_KEY, normalizePrefs, togglePref, workOrderKey, workOrderOf, workOrderText } from "${ROOT}/src/workOrder.js";`,
      `export { mirSee } from "${ROOT}/src/mir.js";`,
    ].join('\n'));
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    const B = require(o);
    const OLD = OLD_BUNDLE ? require(path.resolve(OLD_BUNDLE)) : null;

    //  ── 지문 재생성 모드 ──
    const digestOf = (build) => {
      const out = {};
      for (const [k, list] of Object.entries(FX.voyages)) {
        const h = crypto.createHash('sha1'); let cnt = 0;
        for (const [g, cs] of Object.entries(groupsOf(list))) for (const side of [true, false]) for (const rowFrom of ['land', 'sea']) {
          const q = build({ containers: cs, mode: 'discharge', evenRowsSeaSide: side, findTwin, rowFrom });
          h.update(`${k}|B${g}|${side}|${rowFrom}|${sig(q)}\n`); cnt += 1;
        }
        out[k] = { sha1: h.digest('hex'), queues: cnt };
      }
      return out;
    };
    if (OLD) { console.log(JSON.stringify(digestOf(OLD.buildGuidedQueue), null, 1)); process.exit(0); }

    //  ── ① 조건을 안 걸면 종전과 같다 ──
    console.log('■ 조건 없음 = 종전(4.08-02) 순서 그대로');
    {
      const want = FX.defaultDigest || {};
      const got = digestOf(B.buildGuidedQueue);
      for (const k of Object.keys(FX.voyages)) ok(`${k} — 베이 묶음·접안 좌우·로우 방향 ${got[k].queues}개 순서의 지문이 4.08-02 와 같다`, want[k] && want[k].sha1 === got[k].sha1, want[k] ? `기대 ${want[k].sha1.slice(0, 10)} 실제 ${got[k].sha1.slice(0, 10)}` : '지문이 없다');
      //  null · [] · undefined 는 같은 «조건 없음»
      let same = true, total = 0;
      for (const list of Object.values(FX.voyages)) for (const cs of Object.values(groupsOf(list))) {
        const a = sig(B.buildGuidedQueue({ containers: cs, mode: 'discharge', evenRowsSeaSide: true, findTwin, rowFrom: 'land' }));
        for (const op of [null, [], undefined]) { total += 1; if (sig(B.buildGuidedQueue({ containers: cs, mode: 'discharge', evenRowsSeaSide: true, findTwin, rowFrom: 'land', orderPrefs: op })) !== a) same = false; }
      }
      ok(`orderPrefs 가 null·[]·없음이면 같은 순서 (${total}번)`, same);
    }

    //  ── ② 조건을 걸어도 바뀌지 않는 것 / ③ 고른 부류가 먼저 ──
    console.log('■ 조건을 걸었을 때 — 카드·단 순서·종속은 그대로, 고른 부류가 내릴 수 있는 칸에서 먼저');
    const stat = {}; const bad2 = [];
    let groups = 0, headChecks = 0, headFail = [];
    const matches = (card, pref) => {
      const c = card.main; const k = B.conClassOf(c);
      if (pref === 'F') return k.fe === 'F';
      if (pref === 'E') return k.fe === 'E';
      if (pref === 'RF') return k.fe === 'F' && k.rf;
      if (pref === 'GEN') return k.fe === 'F' && !k.rf;
      if (pref === '20') return sizeOf(card) === '20';
      return sizeOf(card) === '40';
    };
    for (const [vk, list] of Object.entries(FX.voyages)) for (const [g, cs] of Object.entries(groupsOf(list))) {
      groups += 1;
      const args = { containers: cs, mode: 'discharge', evenRowsSeaSide: true, findTwin, rowFrom: 'land' };
      const base = B.buildGuidedQueue(args);
      const hasFr = cs.some((c) => c.fr);
      const vBase = violations(base);
      for (const s of SETTINGS) {
        const q = B.buildGuidedQueue({ ...args, orderPrefs: s });
        const key = s.join('→'); stat[key] = stat[key] || { groups: 0, changed: 0 };
        stat[key].groups += 1; if (sig(q) !== sig(base)) stat[key].changed += 1;
        //  카드 수·내용 그대로(순열)
        if (q.length !== base.length || [...q.map((c) => c.main.cn)].sort().join() !== [...base.map((c) => c.main.cn)].sort().join()) bad2.push(`카드가 달라졌다 ${vk} B${g} ${key}`);
        //  데크 칸 자리와 홀드 칸 자리는 그대로 — 홀드 카드가 데크 카드보다 앞서지 않는다
        if (q.some((c, i) => isDeck(c.main.tier) !== isDeck(base[i].main.tier))) bad2.push(`데크·홀드 자리가 바뀌었다 ${vk} B${g} ${key}`);
        //  위에 남은 칸이 있는 칸을 앞당기지 않는다 — 종속 위반이 늘면 안 된다
        if (violations(q) > vBase) bad2.push(`종속 위반이 늘었다 ${vk} B${g} ${key} (${vBase}→${violations(q)})`);
        //  머리 카드 기준표 — 단(데크·홀드)마다, 처음 고른 조건을 만족하는 «내릴 수 있는 카드» 가 있으면 그 단의 첫 카드가 그 조건이다.
        //  (FR 우선 고정 카드는 따로 서므로 FR 이 없는 묶음에서만 잰다.)
        if (!hasFr) for (const deck of [true, false]) {
          const seg = q.filter((c) => isDeck(c.main.tier) === deck); if (!seg.length) continue;
          const free = seg.filter((c) => !blockedIn(c, seg));
          const first = seg[0];
          headChecks += 1;
          const fp = s[0];
          const f0 = free.filter((c) => matches(c, fp));
          if (f0.length) {
            const f01 = s[1] ? f0.filter((c) => matches(c, s[1])) : [];
            const want = f01.length ? [fp, s[1]] : [fp];
            if (!want.every((p) => matches(first, p))) headFail.push(`${vk} B${g} ${deck ? '데크' : '홀드'} ${key} — 첫 카드 ${first.main.cn} ${first.main.bay}-${first.main.row}-${first.main.tier} 는 ${want.map((p) => B.ORDER_PREF_LABEL[p]).join('·')} 가 아니다`);
          } else if (s[1]) {
            const f1 = free.filter((c) => matches(c, s[1]));
            if (f1.length && !matches(first, s[1])) headFail.push(`${vk} B${g} ${deck ? '데크' : '홀드'} ${key} — ${B.ORDER_PREF_LABEL[fp]}는 내릴 칸이 없는데 두 번째 조건 ${B.ORDER_PREF_LABEL[s[1]]}의 첫 카드가 아니다`);
          }
        }
      }
    }
    ok(`실데이터 ${groups}개 베이 묶음 × 조건 ${SETTINGS.length}가지 — 카드 수·내용이 그대로`, !bad2.some((x) => x.startsWith('카드가')), bad2.filter((x) => x.startsWith('카드가')).slice(0, 2).join(' / '));
    ok('데크 카드 자리와 홀드 카드 자리가 조건 없을 때와 같다(홀드가 데크보다 먼저 나오지 않는다)', !bad2.some((x) => x.startsWith('데크')), bad2.filter((x) => x.startsWith('데크')).slice(0, 2).join(' / '));
    ok('위에 컨이 남은 칸을 앞당기지 않는다 — 종속 위반이 조건 없을 때보다 늘지 않는다', !bad2.some((x) => x.startsWith('종속')), bad2.filter((x) => x.startsWith('종속')).slice(0, 2).join(' / '));
    ok(`고른 부류가 내릴 수 있는 칸에서 먼저 나온다 (${headChecks}곳의 단 머리 카드, 어긋남 ${headFail.length})`, headFail.length === 0, headFail.slice(0, 2).join(' / '));
    //  조건이 실제로 순서를 바꾸는가 — 아무 일도 안 하면 위 검사는 공회전이다
    const ch = (k) => (stat[k] ? stat[k].changed : 0);
    ok(`리퍼부터 — 순서가 바뀐 묶음이 있다 (${ch('RF')}/${stat.RF.groups})`, ch('RF') >= 1);
    ok(`20부터 — 순서가 바뀐 묶음이 있다 (${ch('20')}/${stat['20'].groups})`, ch('20') >= 1);
    ok(`40부터 — 기본이 이미 40 먼저라 바뀐 묶음이 있어도 적다 (${ch('40')}/${stat['40'].groups})`, ch('40') <= ch('20'));
    ok(`엠티부터 — 엠티가 있는 항차에서 바뀐다 (${ch('E')}/${stat.E.groups})`, ch('E') >= 1);
    ok(`일반부터 — 순서가 바뀐 묶음이 있다 (${ch('GEN')}/${stat.GEN.groups})`, ch('GEN') >= 1);
    //  먼저 고른 것이 우선 — 리퍼→20 과 20→리퍼 는 다른 순서를 내는 묶음이 있다
    {
      let diff = 0, first = '';
      for (const [vk, list] of Object.entries(FX.voyages)) for (const [g, cs] of Object.entries(groupsOf(list))) {
        const args = { containers: cs, mode: 'discharge', evenRowsSeaSide: true, findTwin, rowFrom: 'land' };
        if (sig(B.buildGuidedQueue({ ...args, orderPrefs: ['RF', '20'] })) !== sig(B.buildGuidedQueue({ ...args, orderPrefs: ['20', 'RF'] }))) { diff += 1; first = first || `${vk} B${g}`; }
      }
      ok(`먼저 고른 것이 우선 — 리퍼→20 과 20→리퍼 가 다르게 나오는 묶음 ${diff}곳 (${first})`, diff >= 1);
    }
    //  FR(플랫랙) 우선 양하는 조건 위에서도 맨 앞에 고정이다 — FR 이 있는 묶음(PCSZ 2631E)에서 앞쪽 FR 카드가 그대로
    {
      let frGroups = 0, frBad = [];
      for (const [vk, list] of Object.entries(FX.voyages)) for (const [g, cs] of Object.entries(groupsOf(list))) {
        if (!cs.some((c) => c.fr)) continue;
        const args = { containers: cs, mode: 'discharge', evenRowsSeaSide: true, findTwin, rowFrom: 'land' };
        const base = B.buildGuidedQueue(args);
        const lead = base.findIndex((c) => !c.main.fr); const L = lead < 0 ? base.length : lead;
        if (L === 0) continue;
        frGroups += 1;
        for (const s of SETTINGS) {
          const q = B.buildGuidedQueue({ ...args, orderPrefs: s });
          if (sig(q.slice(0, L)) !== sig(base.slice(0, L))) frBad.push(`${vk} B${g} ${s.join('→')}`);
        }
      }
      ok(`FR 우선 양하는 조건 위에서도 맨 앞에 고정 (FR 이 앞에 선 묶음 ${frGroups}곳 × 조건 ${SETTINGS.length}가지)`, frGroups >= 1 && frBad.length === 0, frGroups < 1 ? 'FR 앞선 묶음이 실데이터에 없다' : frBad.slice(0, 2).join(' / '));
    }
    //  갈림 칩(streamPref)은 조건 위에서 일시 우선 — 칩이 켜져 있으면 첫 카드는 칩의 흐름이다(조건을 새로 고르면 화면이 칩을 끈다)
    {
      let chk = 0, badS = [];
      for (const [vk, list] of Object.entries(FX.voyages)) for (const [g, cs] of Object.entries(groupsOf(list))) {
        if (cs.some((c) => c.fr)) continue;
        const args = { containers: cs, mode: 'discharge', evenRowsSeaSide: true, findTwin, rowFrom: 'land' };
        for (const [sp, prefs] of [['20', ['RF']], ['RF', ['20']], ['40', ['RF', '20']]]) {
          const q = B.buildGuidedQueue({ ...args, streamPref: sp, orderPrefs: prefs });
          const free = q.filter((c) => !blockedIn(c, q.filter((o) => isDeck(o.main.tier) === isDeck(c.main.tier))));
          if (free.some((c) => matches(c, sp))) { chk += 1; if (!matches(q[0], sp)) badS.push(`${vk} B${g} 칩 ${sp} + ${prefs.join('→')}`); }
        }
      }
      ok(`갈림 칩이 켜져 있으면 조건보다 먼저 — 첫 카드가 칩의 흐름 (${chk}곳)`, chk >= 1 && badS.length === 0, badS.slice(0, 2).join(' / '));
    }
    //  로우 방향(해상부터)과 부류 조건은 함께 쓴다 — 해상부터 + 리퍼부터 도 카드가 그대로
    {
      let okAll = true;
      for (const list of Object.values(FX.voyages)) for (const cs of Object.values(groupsOf(list))) {
        const a = { containers: cs, mode: 'discharge', evenRowsSeaSide: true, findTwin, rowFrom: 'sea' };
        const q0 = B.buildGuidedQueue(a), q1 = B.buildGuidedQueue({ ...a, orderPrefs: ['RF', '20'] });
        if (q0.length !== q1.length || violations(q1) > violations(q0)) okAll = false;
      }
      ok('해상부터 + 리퍼→20 도 카드가 그대로이고 종속 위반이 늘지 않는다', okAll);
    }
    //  선적에는 조건이 없다 — orderPrefs 를 줘도 선적 순서는 그대로
    {
      let same = true;
      for (const list of Object.values(FX.voyages)) for (const cs of Object.values(groupsOf(list))) {
        const lc = cs.map((c) => ({ ...c, _mode: 'loading' }));
        const a = sig(B.buildGuidedQueue({ containers: lc, mode: 'loading', evenRowsSeaSide: true, findTwin }));
        const b = sig(B.buildGuidedQueue({ containers: lc, mode: 'loading', evenRowsSeaSide: true, findTwin, orderPrefs: ['RF', '20'] }));
        if (a !== b) same = false;
      }
      ok('선적은 orderPrefs 를 받아도 순서가 그대로다(선적에는 없다)', same);
    }
    console.log('    설정별 바뀐 묶음 — ' + Object.entries(stat).map(([k, v]) => `${k.replace(/→/g, '→')} ${v.changed}/${v.groups}`).join(' · '));

    //  ── ④ 저장 모양·읽기 한 벌 (workOrder.js) ──
    console.log('■ 조건 고르기·저장 모양·읽기 (호기 칸 → 전체 칸 → 옛 seqRowFrom)');
    {
      const T = B.togglePref;
      ok('눌러서 켜고 다시 눌러 끈다', JSON.stringify(T(T([], 'RF'), 'RF')) === '[]');
      ok('먼저 누른 것이 앞(우선) — 리퍼 → 20', JSON.stringify(T(T([], 'RF'), '20')) === '["RF","20"]');
      ok('20 을 누르면 40 이 빠진다(20↔40)', JSON.stringify(T(['40', 'RF'], '20')) === '["RF","20"]');
      ok('풀↔엠티 · 일반↔리퍼는 함께 못 건다', JSON.stringify(T(['F'], 'E')) === '["E"]' && JSON.stringify(T(['GEN'], 'RF')) === '["RF"]' && JSON.stringify(T(['RF'], 'GEN')) === '["GEN"]');
      ok('엠티는 풀·일반·리퍼와 모순 — 엠티를 누르면 그 셋이 빠진다', JSON.stringify(T(['F', 'RF', '20'], 'E')) === '["20","E"]');
      ok('풀 + 리퍼 + 20 은 함께 걸린다', JSON.stringify(T(T(T([], 'F'), 'RF'), '20')) === '["F","RF","20"]');
      ok('모르는 키는 무시', JSON.stringify(T(['RF'], 'XX')) === '["RF"]');
      ok('normalizePrefs — 문자열·중복·모르는 키', JSON.stringify(B.normalizePrefs('RF, 20,RF,zz')) === '["RF","20"]' && JSON.stringify(B.normalizePrefs(null)) === '[]');
      ok('workOrderKey — 빈 호기는 «전체», RTDB 에 못 쓰는 글자는 밑줄', B.workOrderKey('') === '전체' && B.workOrderKey('3호기') === '3호기' && B.workOrderKey('a.b/c') === 'a_b_c');
      const info = { workOrder: { '1호기': { rowFrom: 'sea', prefs: 'RF,20', at: 5, by: '김' }, '전체': { rowFrom: 'land', prefs: 'GEN' } }, seqRowFrom: 'sea' };
      const w1 = B.workOrderOf(info, '1호기');
      ok('1호기 → 1호기 칸', w1.from === 'equip' && w1.rowFrom === 'sea' && w1.prefs.join() === 'RF,20' && w1.by === '김');
      const w2 = B.workOrderOf(info, '2호기');
      ok('2호기(칸 없음) → «전체» 칸', w2.from === 'all' && w2.rowFrom === 'land' && w2.prefs.join() === 'GEN');
      const w3 = B.workOrderOf({ seqRowFrom: 'sea' }, '2호기');
      ok('호기 칸도 «전체» 칸도 없으면 옛 항차 seqRowFrom(해상부터)을 읽는다', w3.from === 'legacy' && w3.rowFrom === 'sea' && w3.prefs.length === 0);
      const w4 = B.workOrderOf({}, '');
      ok('아무 설정 없으면 육상부터 · 조건 없음(종전과 같다)', w4.from === 'none' && w4.rowFrom === 'land' && w4.prefs.length === 0);
      const w5 = B.workOrderOf({ workOrder: { '1호기': { rowFrom: 'land', prefs: '' } }, seqRowFrom: 'sea' }, '1호기');
      ok('호기 칸에 육상부터를 적어 두면 옛 seqRowFrom=sea 를 이긴다([기본으로]가 해상부터를 되돌리는 길)', w5.rowFrom === 'land');
      ok('workOrderText — «육상부터» / «해상부터 · 리퍼부터 → 20부터»', B.workOrderText({ rowFrom: 'land', prefs: [] }) === '육상부터' && B.workOrderText({ rowFrom: 'sea', prefs: ['RF', '20'] }) === '해상부터 · 리퍼부터 → 20부터');
    }

    //  ── ⑤ 미르가 같은 칸을 읽는다 (실데이터 한 묶음) ──
    console.log('■ 미르 «순서대로 양하하자» 가 화면과 같은 순서를 읽는다');
    {
      //  리퍼부터가 첫 카드를 바꾸는 묶음을 실데이터에서 찾는다
      let pick = null;
      for (const [vk, list] of Object.entries(FX.voyages)) { if (pick) break;
        for (const [g, cs] of Object.entries(groupsOf(list))) {
          const args = { containers: cs, mode: 'discharge', evenRowsSeaSide: true, findTwin, rowFrom: 'land' };
          const q0 = B.buildGuidedQueue(args), q1 = B.buildGuidedQueue({ ...args, orderPrefs: ['RF'] });
          if (q0[0].main.cn !== q1[0].main.cn && B.conClassOf(q1[0].main).rf && !B.conClassOf(q0[0].main).rf) { pick = { vk, g, cs, q0, q1 }; break; }
        } }
      ok('실데이터에 «리퍼부터가 첫 카드를 바꾸는» 묶음이 있다', !!pick);
      if (pick) {
        const [vsl, voy] = pick.vk.split('_');
        const cont = pick.cs.map((c) => ({ ...c, _ptk: true, _mode: 'discharge' }));
        const mk = (workOrder, extra = {}) => ({ containers: cont, mode: 'discharge', info: { vsl, voy, berthSide: 'starboard', ...(workOrder ? { workOrder } : {}), ...extra } });
        const ask = (ctx) => String(B.mirSee(`${pick.g}번 베이 양하하자`, ctx) || '');
        const first4 = (card) => card.main.cn.slice(-4);
        global.localStorage.setItem('gm_equip_no', '1호기');
        const a0 = ask(mk(null)), a1 = ask(mk({ '1호기': { rowFrom: 'land', prefs: 'RF', at: 1, by: 't' } })), a2 = ask(mk({ '2호기': { rowFrom: 'land', prefs: 'RF', at: 1, by: 't' } }));
        const headOf = (s) => s.split('다음 예정')[0];
        ok('조건이 없으면 미르의 첫 카드는 종전 순서의 첫 카드', headOf(a0).includes(first4(pick.q0[0])), headOf(a0).replace(/\n/g, ' / ').slice(0, 160));
        ok('1호기 칸에 «리퍼부터» 가 있으면 1호기 미르의 첫 카드가 리퍼', headOf(a1).includes(first4(pick.q1[0])), headOf(a1).replace(/\n/g, ' / ').slice(0, 160));
        ok('미르가 부르는 순서 조건을 한 줄 밝힌다(순서 육상부터 · 리퍼부터)', /순서 육상부터 · 리퍼부터/.test(a1) && !/순서 /.test(a0), a1.split('\n').slice(0, 3).join(' / ').slice(0, 160));
        ok('2호기 칸에만 있으면 1호기 미르는 영향이 없다(호기별)', a2 === a0);
        global.localStorage.setItem('gm_equip_no', '2호기');
        const b2 = ask(mk({ '2호기': { rowFrom: 'land', prefs: 'RF', at: 1, by: 't' } }));
        ok('호기를 2호기로 바꾸면 2호기 칸을 읽는다', headOf(b2).includes(first4(pick.q1[0])));
        global.localStorage.removeItem('gm_equip_no');
      }
    }

    //  ── ⑥ 저장 — 호기 칸 하나만 PATCH (다른 호기·수집기 칸은 그대로) ──
    console.log('■ 저장 fbSetWorkOrder — info.workOrder/{호기} 한 칸만 쓴다');
    {
      const ef = path.join(TMP, 'f.mjs'), of = path.join(TMP, 'f.cjs');
      fs.writeFileSync(ef, `export { fbSetWorkOrder } from "${ROOT}/src/firebase.js";`);
      execSync(`npx esbuild "${ef}" --bundle --platform=node --format=cjs --alias:firebase/app=./tools/stub_fbdb_mem.js --alias:firebase/database=./tools/stub_fbdb_mem.js --alias:firebase/storage=./tools/stub_fbdb_mem.js --loader:.png=dataurl --log-level=error --outfile="${of}"`, { cwd: ROOT, stdio: 'pipe' });
      const F = require(of);
      global.__memdb = { voyages: { DJCT_0225E: { info: { vsl: 'DJCT', berthSide: 'starboard', craneCrew: { x: 1 } }, discharge: { ediContainers: { A: { cn: 'A' } } } } } };
      global.__memlog = [];
      const info = () => global.__memdb.voyages.DJCT_0225E.info;
      const r1 = await F.fbSetWorkOrder('DJCT_0225E', '1호기', { rowFrom: 'sea', prefs: ['RF', '20', 'RF', 'zz'] }, '김성일');
      const w = info().workOrder && info().workOrder['1호기'];
      ok('1호기 칸에 {rowFrom:sea, prefs:"RF,20", by, at} 로 쓴다(중복·모르는 키 정리)', w && w.rowFrom === 'sea' && w.prefs === 'RF,20' && w.by === '김성일' && typeof w.at === 'number' && r1 && r1.prefs === 'RF,20', JSON.stringify(w));
      ok('info 의 다른 칸(berthSide·craneCrew)과 양하 자료는 그대로', info().berthSide === 'starboard' && info().craneCrew.x === 1 && global.__memdb.voyages.DJCT_0225E.discharge.ediContainers.A.cn === 'A');
      await F.fbSetWorkOrder('DJCT_0225E', '2호기', { rowFrom: 'land', prefs: ['40'] }, '박');
      ok('2호기를 써도 1호기 칸은 그대로(호기별)', info().workOrder['1호기'].prefs === 'RF,20' && info().workOrder['2호기'].prefs === '40');
      await F.fbSetWorkOrder('DJCT_0225E', '', { rowFrom: 'land', prefs: ['GEN'] }, '박');
      ok('호기를 모르는 기기는 «전체» 칸에 쓴다', info().workOrder['전체'] && info().workOrder['전체'].prefs === 'GEN');
      await F.fbSetWorkOrder('DJCT_0225E', '1호기', null, '김성일');
      ok('null 이면 그 호기 칸만 지운다([기본으로])', !('1호기' in info().workOrder) && '2호기' in info().workOrder && '전체' in info().workOrder);
      ok('쓰기는 info 한 곳에 update(PATCH)만 — set·remove 로 통째 덮지 않는다', global.__memlog.length === 4 && global.__memlog.every((l) => l.op === 'update' && l.path === 'voyages/DJCT_0225E/info'), JSON.stringify(global.__memlog));
      ok('항차 키가 없으면 아무것도 쓰지 않는다', (await F.fbSetWorkOrder('', '1호기', { rowFrom: 'sea', prefs: [] }, 'x')) === null && global.__memlog.length === 4);
    }

    //  ── ⑦ 화면·미르·문서가 같은 한 벌을 쓴다(소스 검사) ──
    console.log('■ 배선 — 화면·미르·매뉴얼·기능 색인·버전');
    {
      const gw = rd('src/components/GuidedWorkPanel.jsx'), mir = rd('src/mir.js'), gq = rd('src/guidedQueue.js'), fb = rd('src/firebase.js');
      ok('화면: workOrderOf 로 읽고 buildGuidedQueue 에 orderPrefs 를 넘긴다', /workOrderOf\(voyage\??\.info,\s*equip\)/.test(gw) && /orderPrefs,\s*\/\/ 4\.09/.test(gw));
      ok('화면: 저장은 fbSetWorkOrder 만(옛 seqRowFrom 을 더 이상 쓰지 않는다)', /fbSetWorkOrder\(voyageKey, equip, next, inspector\)/.test(gw) && !/seqRowFrom:\s*(rowFrom|'sea'|next)/.test(gw));
      ok('화면: 부류 조건이 바뀌면(저장 응답이 아니라 값이 바뀔 때) 갈림 칩을 끈다', /useEffect\(\(\) => \{ setStreamPref\(null\); \}, \[orderKey\]\)/.test(gw));
      ok('화면: 조건을 걸어 둔 호기는 3대 연속 자동 감지를 하지 않는다', /if \(orderKey\) return;/.test(gw));
      ok('화면: 조건이 바뀌면 큐를 다시 만든다(의존성에 orderKey)', /rowFrom, orderKey, bayFirst\]\)/.test(gw));
      ok('미르: 화면과 같은 workOrderOf 로 읽고 같은 orderPrefs 를 넘긴다', /workOrderOf\(info, myEquip\)/.test(mir) && /orderPrefs:\s*mode === 'discharge' \? wo\.prefs : null/.test(mir) && /rowFrom:\s*wo\.rowFrom/.test(mir));
      ok('저장: 양하 순서 변경은 «조회만» 이면 막는다(assertCanWork)', /assertCanWork\('양하 순서 변경'\)/.test(fb));
      ok('큐: 양하 가지에서만 orderPrefs 를 쓰고, 데크와 홀드를 따로 당긴다', /orderPrefs && orderPrefs\.length/.test(gq) && /body\.filter\(\(c\) => isDeckTier\(c\.main\.tier\)\)/.test(gq));
      const help = rd('src/data/helpData.js'), fi = rd('src/data/featureIndex.js'), ut = rd('src/utils.js');
      ok('매뉴얼에 «양하 순서» 창 설명(호기별·먼저 고른 것 우선·함께 못 거는 짝)', /양하 순서» 창/.test(help) && /호기\(1호기·2호기…\)별로 항차에 저장/.test(help) && /20↔40·풀↔엠티·일반↔리퍼, 그리고 엠티↔일반·리퍼/.test(help));
      ok('매뉴얼의 옛 «칩 [⇄ 해상부터]를 켜면» 문구가 남아 있지 않다', !/위 칩 \[⇄ 해상부터\]를 켜면/.test(help) && !/위쪽 칩 \[⇄ 육상부터\]를 눌러 \[⇄ 해상부터\]로 바꾼다\(3\.3\)/.test(help));
      ok('기능 색인: 리퍼부터·20부터·40부터·양하 순서 검색어', ['리퍼부터', '20부터', '40부터', '엠티부터', '일반부터', '풀부터', '양하 순서', '기사 작업 방법'].every((k) => fi.includes(`'${k}'`)));
      const ver = (ut.match(/APP_VERSION = 'TallyOne ([^']+)'/) || [])[1] || '';
      ok(`APP_VERSION 이 4.09 이상 (${ver})`, /^4\.(09|[1-9]\d)/.test(ver));
      const note = (ut.match(/APP_NOTE = '([^']*)'/) || [])[1] || '';
      ok('APP_NOTE — 작은따옴표·슬래시 없음 · 마침표 3개 이하 · 120자 미만', note && !/[\\/']/.test(note) && (note.match(/\./g) || []).length <= 3 && note.length < 120, note);
    }
  } catch (err) {
    bad += 1; console.log('  ✘ 검사 중 예외 — ' + (err && err.stack ? err.stack.split('\n').slice(0, 4).join(' | ') : err));
  }
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(bad ? `\n✗ 4.09 양하 순서 조건 연막검사 실패 ${bad}건 / ${n}` : `\n✓ 4.09 양하 순서 조건 연막검사 통과 ${n}건`);
  process.exit(bad ? 1 : 0);
})();
