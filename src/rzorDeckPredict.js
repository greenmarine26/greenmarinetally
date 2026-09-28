// 3.67: RZOR 선적 덱플랜 자동 생성 — 동방 실적(termWork) 순번과 규칙표(rzorDeckRules)로 컨마다 «예측 자리»를 놓고,
//   검수원이 확정한 자리(stowagePlan/assign)와 합쳐 DeckPlanView 가 그리는 stowagePlan 모양을 만든다.
//   · 순번 = 터미널 완료 시각(at) 오름차순, 같은 분은 터미널 단(tier) 오름·열(row) 내림(크레인 순번이 그 순서다).
//   · 크레인(터미널 베이 22) → craneSlots(N) 길 · 섀시 40·45 → C덱 선수 41 → D덱 양끝 → 풀은 D 1~2줄 18~21·C덱 중간, 엠티는 D 여분
//   · 20피트 → 20피트 길 · 확정 자리(assign)에 있는 컨은 예측에서 빼고, 그 자리는 길에서 뺀다.
//   · 자리 키(slot.key)는 «덱-줄-위치»(D-1-15) — 한 키 = 한 자리. 그림 좌표(ri·ci·span)는 다 놓은 뒤에 정한다.
//     (2차 시뮬 지적 — 종전 «덱-ri-ci» 키는 40피트 두 칸과 그 옆 칸이 같은 키라 예측 칸을 확정하면 한 칸 옆에 놓였다.)
//   결과 slots: 확정 = {cn, sure:true} · 예측 = {cn, pred:true} · 빈자리 = {empty:true}. 좌표는 검수사 양식(위치 1=선수, numbering 'bow').
import { RZOR_PATH_CBOW, RZOR_PATH_DALT, RZOR_PATH_DSTERN2, RZOR_PATH_CMID, RZOR_PATH_DEXTRA, RZOR_PATH_TWENTY,
         RZOR_DECK_SLOTS, craneSlots, RZOR_CRANE_BAY, RZOR_CBOW_CAP, RZOR_FULL_TO_CMID_AFTER } from './data/rzorDeckRules.js';
import { isReeferIso, isoFeet } from './utils.js';   // 리퍼·크기 판정 한 벌(3.60-10 lint — 자체 정규식 금지)

const DECK_TIER = { U: '84', C: '86', D: '88' };
const N_POS = 26;

/** 컨 규격에서 크기('20'|'40'|'45')와 리퍼 여부 */
export function rzorSizeOf(c) {
  const iso = String(c?.iso || c?.iso_edi || c?.ediIso || '').toUpperCase().replace(/\s/g, '');
  const sz = String(isoFeet(iso));   // utils 한 벌(L·M·N·9 → 45)
  const rf = !!c?.rf || isReeferIso(iso);
  return { sz, rf };
}

/** 자리 키 — 덱·줄·위치(1=선수) */
export const rzorSlotKey = (deck, line, pos) => `${deck}-${line}-${pos}`;

/** 실적 순번 — [{cn, at, bay, row, tier}] 시각 오름, 같은 분은 단 오름·열 내림 */
export function rzorLoadSequence(termWork) {
  const out = [];
  for (const [cn, t] of Object.entries(termWork || {})) {
    if (!t || !t.at) continue;
    const p = String(t.pos || '').replace(/\D/g, '');
    out.push({ cn, at: Number(t.at) || 0, bay: p.length === 6 ? p.slice(0, 2) : '', row: p.length === 6 ? parseInt(p.slice(2, 4), 10) : 0, tier: p.length === 6 ? parseInt(p.slice(4, 6), 10) : 0 });
  }
  out.sort((a, b) => (a.at - b.at) || (a.tier - b.tier) || (b.row - a.row) || (a.cn < b.cn ? -1 : 1));
  return out;
}

/**
 * 선적 덱플랜 생성.
 * @param {object} p
 * @param {Array}  p.containers  선적 컨 목록(ediContainers·records 합본) — cn·iso·fe·rf·wt
 * @param {object} p.termWork    voyages/{키}/loading/termWork
 * @param {object} p.bayWork     voyages/{키}/loading/bayWork (크레인 대수 N 추정용, 없어도 됨)
 * @param {object} p.assign      stowagePlan/assign — {slotKey(덱-줄-위치):{cn,by,at}}
 * @param {string} p.voy         항차(표시용)
 */
export function buildRzorLoadingDeckPlan({ containers = [], termWork = {}, bayWork = null, assign = null, voy = '' } = {}) {
  const byCn = {};
  for (const c of containers) if (c && c.cn) byCn[c.cn] = c;
  // 템플릿 자리(36항차 실물) — 키 → {deck,line,pos,sz}
  const tpl = {};
  for (const [deck, line, pos, sz] of RZOR_DECK_SLOTS) tpl[rzorSlotKey(deck, line, pos)] = { deck, line, pos, sz };
  // 확정 자리 — 슬롯키 → cn, cn → 슬롯키. 템플릿에 없는 키(옛 그림 좌표 키 등)는 무시하고 그 컨은 예측으로 돌린다 — 조용히 사라지지 않게.
  const sureBySlot = {}, sureByCn = {}, badAssign = [];
  for (const [k, v] of Object.entries(assign || {})) {
    const cn = v && v.cn ? String(v.cn) : '';
    if (!cn) continue;
    if (!tpl[k]) { badAssign.push(k); continue; }
    sureBySlot[k] = cn; sureByCn[cn] = k;
  }
  const taken = new Set(Object.keys(sureBySlot));
  // 길 항목 형식: 규칙표의 구역 길은 [deck,line,pos], 크레인 길은 [line,pos](D덱)
  const pickFrom = (arr, deckFixed) => {
    for (const it of arr) {
      const deck = deckFixed || it[0]; const line = deckFixed ? it[0] : it[1]; const pos = deckFixed ? it[1] : it[2];
      const key = rzorSlotKey(deck, line, pos);
      if (taken.has(key)) continue;
      taken.add(key);
      return { deck, line, pos, key };
    }
    return null;
  };
  const seq = rzorLoadSequence(termWork);
  const craneSeq = seq.filter((s) => s.bay === RZOR_CRANE_BAY);
  const bw = bayWork && bayWork[RZOR_CRANE_BAY];
  const craneN = Math.max(craneSeq.length, bw ? ((Number(bw.deck) || 0) + (Number(bw.hold) || 0)) : 0, 0);
  // 크레인 길 — N 칸 뒤에 넘침 칸(craneSlots(99) 의 나머지)을 이어 둔다. 확정 자리가 길 안에 있어 칸이 모자라도 컨이 사라지지 않는다.
  const cranePath0 = craneSlots(craneN || 45);
  const _seen = new Set(cranePath0.map((x) => x.join('-')));
  const cranePath = cranePath0.concat(craneSlots(99).filter((x) => !_seen.has(x.join('-'))));
  const pred = {};   // cn → {deck,line,pos,key,zone}
  const unplaced = [];   // 자리를 못 받은 컨(템플릿까지 다 찼을 때만) — 화면이 알린다
  const used = { CBOW: 0, DALT: 0, DSTERN2: 0, CMID: 0, DEXTRA: 0, TWENTY: 0, CRANE: 0 };
  // 2차 시뮬 지적 — 확정 컨을 순번 걷기에서 그냥 건너뛰면 구역 문턱(C덱 선수 41·D덱 40)이 한 칸씩 어긋나 나머지 예측이
  //   탭마다 움직였다(189경우 중 87경우, 최대 30대). 그래서 확정 컨도 예측과 똑같이 구역을 정해 그 수에 세고, 놓기만 건너뛴다.
  //   예측 자리 그대로 확정하면 길의 상태가 예측 때와 같아 나머지 예측이 안 움직인다.
  for (const s of seq) {
    const c = byCn[s.cn] || { cn: s.cn };
    const { sz } = rzorSizeOf(c);
    const fe = (c.fe === 'E') ? 'E' : 'F';
    let z;
    if (s.bay === RZOR_CRANE_BAY) z = 'CRANE';
    else if (sz === '20') z = 'TWENTY';
    else if (used.CBOW < RZOR_CBOW_CAP) z = 'CBOW';
    else if (fe === 'F' && used.DALT >= RZOR_FULL_TO_CMID_AFTER) z = used.DSTERN2 < RZOR_PATH_DSTERN2.length ? 'DSTERN2' : (used.CMID < RZOR_PATH_CMID.length ? 'CMID' : (used.DALT < RZOR_PATH_DALT.length ? 'DALT' : 'DEXTRA'));
    else z = used.DALT < RZOR_PATH_DALT.length ? 'DALT' : (fe === 'E' ? 'DEXTRA' : (used.DSTERN2 < RZOR_PATH_DSTERN2.length ? 'DSTERN2' : (used.CMID < RZOR_PATH_CMID.length ? 'CMID' : 'DEXTRA')));
    const off = used[z]; used[z] += 1;
    if (sureByCn[s.cn]) continue;   // 확정 컨 — 구역 수에는 셌고, 자리는 이미 taken 에 있다
    let slot = null;
    if (z === 'CRANE') slot = pickFrom(cranePath.slice(off), 'D');
    else if (z === 'TWENTY') slot = pickFrom(RZOR_PATH_TWENTY, null);
    else {
      // 섀시 40·45: C덱 선수 → D덱 양끝 → (풀·D 40대 뒤) D 1~2줄 18~21 → C덱 중간 · (엠티) D 여분
      const path = { CBOW: RZOR_PATH_CBOW, DALT: RZOR_PATH_DALT, DSTERN2: RZOR_PATH_DSTERN2, CMID: RZOR_PATH_CMID, DEXTRA: RZOR_PATH_DEXTRA }[z];
      slot = pickFrom(path, null);
      if (!slot) { for (const alt of [RZOR_PATH_DALT, RZOR_PATH_DEXTRA, RZOR_PATH_CMID, RZOR_PATH_CBOW]) { slot = pickFrom(alt, null); if (slot) break; } }
    }
    if (!slot) {   // 길이 다 찼다 — 템플릿 빈자리(같은 크기 먼저, 없으면 아무 크기). 조용히 빠뜨리지 않는다(§4-3).
      for (const pass of [sz, null]) {
        for (const [key, t] of Object.entries(tpl)) { if ((pass && t.sz !== pass) || taken.has(key)) continue; taken.add(key); slot = { ...t, key }; break; }
        if (slot) break;
      }
    }
    if (slot) pred[s.cn] = { ...slot, zone: z };   // sz·rf 는 놓을 때 rzorSizeOf 로 다시 본다
    else unplaced.push(s.cn);
  }
  // 덱별 슬롯 — 컨(확정·예측)을 줄·위치에 놓고, 그림 좌표는 그 뒤에 정한다(40·45 는 옆 위치 p+1 이 비었을 때만 두 칸)
  const decks = [];
  for (const deck of ['D', 'C', 'U']) {
    const occ = {};   // line → pos → {cn, sure, sz, rf, c}
    const putC = (t, cn, sure) => {
      const c = byCn[cn] || { cn };
      const { sz, rf } = rzorSizeOf(c);
      if (!occ[t.line]) occ[t.line] = {};
      occ[t.line][t.pos] = { cn, sure, sz, rf, c };
    };
    for (const [k, cn] of Object.entries(sureBySlot)) { const t = tpl[k]; if (t && t.deck === deck) putC(t, cn, true); }
    for (const [cn, sl] of Object.entries(pred)) if (sl.deck === deck) putC(sl, cn, false);
    const slots = [];
    const base = (line, pos, span) => ({
      ri: line - 1, ci: Math.max(0, N_POS - pos - (span - 1)), span, flags: [], dbl: false,
      lolo: deck === 'D' && pos >= 10 && pos <= 15,
      line, col: pos, tier: DECK_TIER[deck], row: String(line).padStart(2, '0'), bay: String(pos).padStart(2, '0'),
      pos: `${deck}덱 ${line}줄 ${pos}칸`, key: rzorSlotKey(deck, line, pos),
    });
    const covered = new Set();   // 두 칸 컨이 덮는 옆 위치(빈자리로 그리지 않는다)
    for (const line of Object.keys(occ).map(Number)) {
      for (const pos of Object.keys(occ[line]).map(Number)) {
        const o = occ[line][pos];
        const span = (o.sz !== '20' && pos < N_POS && !occ[line][pos + 1]) ? 2 : 1;
        if (span === 2) covered.add(rzorSlotKey(deck, line, pos + 1));
        slots.push({ ...base(line, pos, span), cn: o.cn, empty: false,
                     wt: o.c.wt != null ? Math.round(Number(o.c.wt)) || null : null,
                     iso: `${o.sz} ${o.rf ? 'RH' : (o.sz === '20' ? 'GP' : 'HC')}`, fe: o.c.fe === 'E' ? 'E' : 'F',
                     flags: o.c.lugg ? ['LUG'] : [], sure: !!o.sure, pred: !o.sure });
      }
    }
    for (const [key, t] of Object.entries(tpl)) {
      if (t.deck !== deck || covered.has(key) || (occ[t.line] && occ[t.line][t.pos])) continue;
      slots.push({ ...base(t.line, t.pos, 1), cn: '', empty: true, wt: null, iso: '', fe: '' });
    }
    slots.sort((a, b) => (a.ri - b.ri) || (a.ci - b.ci));
    const lines = Math.max(1, ...slots.map((s) => s.line));
    decks.push({ deck, name: `${deck === 'U' ? 'UNDER' : deck}-DECK`, cols: N_POS, rows: lines, slots, tier: DECK_TIER[deck], lines, colsN: N_POS,
                 lolo: slots.filter((x) => x.lolo && !x.empty).length, dbl: 0, numbering: 'bow' });
  }
  const total = decks.reduce((a, d) => a + d.slots.filter((s) => !s.empty).length, 0);
  return { voy, decks, total, lolo: decks.reduce((a, d) => a + (d.lolo || 0), 0), dbl: 0, _fmt: 'predict', _gen: true,
           assign: assign || null, craneN, seqN: seq.length, sureN: Object.keys(sureBySlot).length, predN: Object.keys(pred).length, unplaced, badAssign };
}
