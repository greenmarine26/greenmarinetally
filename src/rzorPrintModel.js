// 4.04: RZOR 덱플랜 출력 계산 — 덱플랜(plan)을 종이 두 양식(선사 STOWAGE PLAN · 검수사 마감텔리 STOWAGE PLAN)의 «그림 좌표»로 옮긴다. 화면(React) 없이 노드에서 시험한다.
//   · 양식은 plan 이 정한다 — 검수사 양식(numbering 'bow' · _fmt 'checker'/'predict')이면 마감텔리 양식, 그 밖(선사 rzdf)이면 선사 양식.
//   · 같은 판정은 한 벌 — 특수화물 글자는 카고플랜(getMarkV2)과 같은 순서(DG → RF/RE → FR → TK → OT), 리퍼·플랫랙 판정은 utils 한 벌, 칸 집계·섀시 수는 rzorPlanExcel.buildCheckerPlanWorkbook 과 같은 식(연막검사가 대조).
//   · LOLO 구역 — D 덱 10~15칸(45자리, 8줄은 13~15칸만). 터미널이 크레인 베이(22)로 작업한 칸(확장 49·67대)과 플랜의 lolo 칸은 같이 굵은 선 안에 든다.
import { RZOR_CARRIER_ART } from './rzorDeckArt.js';
import { isReeferIso, isReeferContainer, isFlatRackContainer } from './utils.js';
import { checkerTypeOf } from './rzorPlanExcel.js';
import { RZOR_DECK_SLOTS, RZOR_CRANE_BAY } from './data/rzorDeckRules.js';

export const PAGE = { w: 1077, h: 748 };          // A4 가로 − 여백 6mm 를 96dpi 로 본 크기(285×198mm)
//  4.04-03 선사 양식(양하) 쪽 아래 — 칸 그림은 CARRIER_GRID_BOTTOM 에서 끝내고 서명줄은 CARRIER_SIGN_Y 에 둔다. 검수사 2026-10-05 «사인란이 없는게 아니고 있는데 사인할 공간이 없음»
//  (C·D덱은 그림이 서명줄 위 2~4mm 까지 내려와 쓸 자리가 없었다 — 이제 쪽마다 약 14mm 가 빈다. 1 단위 = 0.265mm).
export const CARRIER_GRID_BOTTOM = 650;
export const CARRIER_GRID_BOTTOM_SCREEN = 690;   // 앱 화면에는 서명줄·범례줄이 없다 — 화면 그림 높이는 종전(4.04-02)과 같게 둔다(칸 안 글자가 5줄이어도 겹치지 않는다)
export const CARRIER_SIGN_Y = 710;
const N_POS = 26;
export const DECK_ORDER = { carrier: ['B', 'C', 'D'], checker: ['C', 'D', 'U'] };
const DECK_LABEL = { B: 'B', C: 'C', D: 'D', U: 'UNDER' };

/** 플랜이 검수사(마감텔리) 양식인가 — 위치 1 이 선수(numbering 'bow')이거나 앱이 만든 선적 덱플랜이다. */
export function planFormat(plan) {
  const decks = (plan && plan.decks) || [];
  if (plan && (plan._gen || plan._fmt === 'checker' || plan._fmt === 'predict')) return 'checker';
  if (decks.some((d) => d && d.numbering === 'bow')) return 'checker';
  return 'carrier';
}

/** 터미널 크레인 베이(22)로 작업한 컨 — 선적 termWork 의 pos «22xxxx». */
export function craneCnSet(termWork) {
  const out = new Set();
  for (const [cn, v] of Object.entries(termWork || {})) {
    const p = String((v && v.pos) || '');
    if (p.startsWith(RZOR_CRANE_BAY)) out.add(String(cn).toUpperCase());
  }
  return out;
}

/** LOLO(落地·갠트리) 기본 구역 — D 덱 10~15칸 45자리(8줄은 13~15칸만). col 은 선사·검수사 양식 모두 10~15 로 같다(c = 25 − p). */
export function inLoloCore(line, col) {
  return col >= 10 && col <= 15 && !(line === 8 && col <= 12);
}

const keyOf = (deck, line, col) => `${deck}-${line}-${col}`;

/** 플랜의 덱 한 장 → 쪽 키('B'·'C'·'D'·'U'). 모델과 화면이 같은 함수로 쪽을 짝짓는다. */
export function deckKeyOf(d) {
  return /^U|^UNDER/i.test(String((d && d.deck) || '')) ? 'U' : String((d && d.deck) || '').toUpperCase().replace(/-.*$/, '');
}

/** 한 칸의 특수화물 정보 — 카고플랜 getMarkV2 와 같은 우선순위. c 는 병합 컨(없을 수 있다). */
export function slotMarks(s, c, xrayMap) {
  const cn = String((s && s.cn) || '').toUpperCase();
  const fl = Array.isArray(s && s.flags) ? s.flags : [];
  const merged = c || {};
  const isE = (merged.fe || s.fe) === 'E';
  const rf = !!(merged.rf || isReeferIso(s.iso) || isReeferContainer(merged));
  let letter = '';
  if (merged.dg) letter = 'DG';
  else if (rf) letter = isE ? 'RE' : 'RF';
  else if (isFlatRackContainer(merged) || /FR$/.test(String(s.iso || '').toUpperCase().replace(/\s/g, ''))) letter = 'FR';
  else if (merged.tk) letter = 'TK';
  else if (merged.ot || merged.oog) letter = 'OT';
  const lug = fl.includes('LUG') || !!merged.lugg;
  const xray = !!(xrayMap && xrayMap[cn]) || !!merged._xray;
  const tmp = merged.tmp != null && String(merged.tmp).trim() !== '' ? String(merged.tmp) : '';
  //  4.04: 선사 파일 칸 글자의 «긴급»·«활어» 는 칸 flags 로 읽혀 있다 — 종이 칸 세 번째 줄에 그대로 찍고, 긴급은 ▲ 도 켠다(리스트 쪽 긴급과 같은 표시).
  const urgent = !!merged.urgent || fl.includes('긴급');
  const fish = fl.includes('활어');
  return { letter, full: !isE, lug, xray, urgent, urgentFlag: fl.includes('긴급'), fish, tmp, rf };
}

/** 덱 집계 — rzorPlanExcel.buildCheckerPlanWorkbook 과 같은 식(연막검사가 대조). */
export function deckTotals(slots) {
  let ch20 = 0, ch40 = 0, wt = 0;
  const n = { 20: 0, 40: 0, 45: 0 };
  const fe = { F: { 20: { D: 0, R: 0 }, 40: { D: 0, R: 0 }, 45: { D: 0, R: 0 }, L20: 0, L40: 0, n: 0 },
               E: { 20: { D: 0, R: 0 }, 40: { D: 0, R: 0 }, 45: { D: 0, R: 0 }, L20: 0, L40: 0, n: 0 } };
  for (const s of slots) {
    const t = checkerTypeOf(s);
    n[t.sz] += 1; wt += Number(s.wt) || 0;
    const chas = s.chassis != null ? Number(s.chassis) : (t.sz === '20' ? 3 : 4);
    if (t.sz === '20') { if (chas === 3) ch20 += 1; else if (chas === 1) ch40 += 1; }
    else if (!s.lolo) ch40 += 1;
    const ft = fe[t.fe];
    ft.n += 1;
    if (t.k === 'L') { if (t.sz === '20') ft.L20 += 1; else ft.L40 += 1; }
    else ft[t.sz][t.rf ? 'R' : 'D'] += 1;
  }
  return { n, ttl: n[20] + n[40] + n[45], wt: Math.round(wt) / 1000, ch20, ch40, fe };
}

const addFe = (a, b) => {
  const o = { 20: { D: 0, R: 0 }, 40: { D: 0, R: 0 }, 45: { D: 0, R: 0 }, L20: 0, L40: 0, n: 0 };
  for (const x of [a, b]) {
    for (const z of ['20', '40', '45']) { o[z].D += x[z].D; o[z].R += x[z].R; }
    o.L20 += x.L20; o.L40 += x.L40; o.n += x.n;
  }
  return o;
};

const fmtWt = (t, comma) => {
  const s = (Math.round(Number(t) * 1000) / 1000).toFixed(3);
  return comma ? Number(s).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : s;
};
const ddmmyyyy = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : String(iso || ''); };

/** 경계선 — 칸 집합(단위 격자 «r,c»)의 바깥 둘레를 선분으로. 이웃이 집합에 없는 변만 긋는다. */
function outlineSegments(units, px) {
  const has = (r, c) => units.has(`${r},${c}`);
  const seg = [];
  for (const k of units) {
    const [r, c] = k.split(',').map(Number);
    const x = px.x0 + c * px.uw, y = px.y0 + r * px.uh;
    if (!has(r - 1, c)) seg.push([x, y, x + px.uw, y]);
    if (!has(r + 1, c)) seg.push([x, y + px.uh, x + px.uw, y + px.uh]);
    if (!has(r, c - 1)) seg.push([x, y, x, y + px.uh]);
    if (!has(r, c + 1)) seg.push([x + px.uw, y, x + px.uw, y + px.uh]);
  }
  return seg;
}

/**
 * 출력 모델.
 * @param {object} p
 * @param {object} p.plan        stowagePlan 모양({decks:[{deck, rows, cols, slots}]})
 * @param {Array}  p.containers  병합 컨 목록(리스트·EDI — dg·tk·ot·rf·lugg·urgent·tmp 를 준다. 없어도 된다)
 * @param {object} p.xrayMap     {cn: true}
 * @param {object} p.termWork    선적 터미널 실적(크레인 베이 22 판정)
 * @param {string} p.vsl         선박 풀네임(RIZHAO ORIENT)
 * @param {string} p.date        YYYY-MM-DD
 * @param {string} p.mode        'discharge' | 'loading'
 */
export function buildPrintModel({ plan, containers = [], xrayMap = {}, termWork = {}, vsl = 'RIZHAO ORIENT', date = '', mode = 'discharge', forScreen = false } = {}) {
  const fmt = planFormat(plan);
  const byCn = {};
  for (const c of (containers || [])) if (c && c.cn) byCn[String(c.cn).toUpperCase()] = c;
  const crane = craneCnSet(termWork);
  const order = DECK_ORDER[fmt];
  const raw = ((plan && plan.decks) || []).filter((d) => d && Array.isArray(d.slots));
  const rank = (k) => { const i = order.indexOf(k); return i < 0 ? 99 : i; };
  const keyed = raw.map((d) => ({ k: deckKeyOf(d), d })).sort((a, b) => rank(a.k) - rank(b.k));

  const voy = String((plan && plan.voy) || '');
  const dport = mode === 'loading' ? 'RIZHAO' : 'PYEONGTAEK';
  const lport = mode === 'loading' ? 'PYEONGTAEK' : 'RIZHAO';
  const pages = [];
  const allOcc = [];
  let predN = 0;

  for (const { k, d } of keyed) {
    const occ = d.slots.filter((s) => s && s.cn && !s.empty);
    allOcc.push(...occ);
    predN += occ.filter((s) => s.pred && !s.sure).length;
    const rows = Math.max(1, Number(d.rows) || Number(d.lines) || 1);
    const page = { deck: k, label: DECK_LABEL[k] || k, fmt, rows, cells: [], empties: [], xmarks: [], axis: [], zone: null };
    const totals = deckTotals(occ);
    if (fmt === 'carrier') {
      //  4.04 샤시 대수(CAPACITY·CHASSIS 표) — 선사 파일이 준 값(d.capacity)이 있으면 그대로, 없으면 추정(LOLO 는 샤시 없음 · C덱은 이웃한 홀·짝 칸 20피트 둘을 트윈 한 샤시로 본다 — 실물 9개 항차 중 6개가 맞는다).
      if (Array.isArray(d.capacity) && d.capacity.length === 2 && d.capacity.every((x) => Number.isFinite(Number(x)))) { totals.ch20 = Number(d.capacity[0]); totals.ch40 = Number(d.capacity[1]); totals.chFrom = 'file'; }
      else {
        if (k === 'C') {
          const tw = new Set(occ.filter((s) => String(s.iso || '').startsWith('20') && !s.lolo && (Number(s.span) || 1) === 1).map((s) => `${s.line}/${s.col}`));
          let pairs = 0; for (const key of tw) { const [ln, cl] = key.split('/').map(Number); if (cl % 2 === 1 && tw.has(`${ln}/${cl + 1}`)) pairs += 1; }
          totals.ch20 -= 2 * pairs; totals.ch40 += pairs;
        }
        totals.chFrom = 'est';
      }
    }
    page.totals = totals;

    let px;                 // 격자 → 쪽 좌표
    if (fmt === 'checker') {
      const x0 = 34, x1 = 1018, y0 = 152, bandH = 66;
      px = { x0, y0, uw: (x1 - x0) / N_POS, uh: bandH, cols: N_POS, rows };
    } else {
      const cols = Math.max(1, Number(d.cols) || 24);
      const x0 = 52, x1 = 1002, y0 = 170;
      const uh = Math.min(84, ((forScreen ? CARRIER_GRID_BOTTOM_SCREEN : CARRIER_GRID_BOTTOM) - y0) / rows);
      px = { x0, y0, uw: (x1 - x0) / cols, uh, cols, rows };
    }
    page.px = px;

    // 선박 고정 그림(선체 윤곽 · 굵은 눈금 · 램프) + 빗금·회색·C/S — 선사 양식 덱만. 없으면 쪽이 옛 단순 윤곽을 쓴다.
    //   빗금·회색·C/S 는 플랜에 칸이 하나도 없는 격자에만 그린다(실제 칸을 덮지 않는다). C/S 는 칸 하나가 섀시 무게 4.000t — 선사 합계에 들어 있다(R109E D덱 1440.741 = 칸 합 1420.741 + 5×4.000).
    if (fmt === 'carrier' && RZOR_CARRIER_ART[k]) {
      const a = RZOR_CARRIER_ART[k];
      const X = (g) => px.x0 + g * px.uw, Y = (g) => px.y0 + g * px.uh;
      const rect = ([c0, r0, c1, r1]) => ({ x: X(c0), y: Y(r0), w: (c1 - c0) * px.uw, h: (r1 - r0) * px.uh });
      const slotUnits = new Set();
      for (const s of d.slots) {
        if (!s) continue;
        const r0 = Number(s.ri) || 0, c0 = Number(s.ci) || 0;
        for (let q = 0; q < Math.max(1, Number(s.span) || 1); q++) slotUnits.add(`${r0},${c0 + q}`);
      }
      const gaps = (rects) => {
        const u = new Set();
        for (const [c0, r0, c1, r1] of rects || []) for (let r = Math.floor(r0); r < Math.ceil(r1); r++) for (let c = Math.floor(c0); c < Math.ceil(c1); c++) if (r < px.rows && c < px.cols && !slotUnits.has(`${r},${c}`)) u.add(`${r},${c}`);
        return u;
      };
      const unitRects = (u) => [...u].map((key) => { const [r, c] = key.split(',').map(Number); return { x: X(c), y: Y(r), w: px.uw, h: px.uh }; });
      const hU = gaps(a.hatch), gU = gaps(a.gray);
      const csU = gaps((a.cs || []).map(([c, r]) => [c, r, c + 1, r + 1]));
      page.art = {
        hull: a.hull.map(([gx, gy]) => [X(gx), Y(gy)]),
        hatch: unitRects(hU), hatchSegs: outlineSegments(hU, px),
        gray: unitRects(gU), graySegs: outlineSegments(gU, px),
        bars: (a.bars || []).map(([gx, g0, g1]) => [X(gx), Y(g0), Y(g1)]),
        cs: unitRects(csU),
        ramp: a.ramp ? rect([a.ramp.gx0, a.ramp.gy0, a.ramp.gx1, a.ramp.gy1]) : null,
      };
      if (csU.size) totals.wt = Math.round((totals.wt + csU.size * 4) * 1000) / 1000;
    }

    // 칸 번호 축(화면 전용) — 선사 양식은 종이에 칸 번호가 없다. 화면에서 «D덱 3줄 5칸» 을 짚을 수 있게 그림 위·아래에 작은 회색 숫자를 둔다.
    //   B 덱은 줄마다 칸이 한 눈금씩 엇갈려 번호가 한 축에 안 맞으므로 두지 않는다. 같은 눈금에서 가장 좁은 칸의 칸 번호를 쓴다.
    if (fmt === 'carrier' && k !== 'B') {
      const first = new Map();
      for (const s of d.slots) {
        if (!s || !Number.isFinite(Number(s.col)) || !(Number(s.col) > 0)) continue;
        const ci = Number(s.ci) || 0, span = Math.max(1, Number(s.span) || 1);
        const o = first.get(ci);
        if (!o || span < o.span) first.set(ci, { span, col: Number(s.col) });
      }
      page.colAxis = [...first.entries()].sort((a, b) => a[0] - b[0]).map(([ci, o]) => ({ t: String(o.col), x: px.x0 + (ci + o.span / 2) * px.uw }));
    }

    // 칸 → 그림 좌표
    const place = (s) => {
      if (fmt === 'checker') {
        const line = Number(s.line) || (Number(s.ri) + 1) || 1;
        const pos = Number(s.col) || (N_POS - Number(s.ci || 0) - ((Number(s.span) || 1) - 1));
        return { line, pos, ri: line - 1, ci: N_POS - pos, span: 1 };
      }
      return { line: Number(s.line) || (Number(s.ri) + 1), pos: Number(s.col) || 0, ri: Number(s.ri) || 0, ci: Number(s.ci) || 0, span: Math.max(1, Number(s.span) || 1) };
    };
    const occKey = new Set();
    const posOf = new Map();
    for (const s of occ) { const g = place(s); occKey.add(keyOf(k, g.line, g.pos)); posOf.set(s, g); }

    // 크레인(LOLO) 구역 칸 집합 — D 덱만
    const zoneUnits = new Set();
    const coreUnits = new Set();   // 이름표 자리 — 기본 구역(10~15칸)만 본다(확장 칸이 붙어도 이름표는 늘 같은 자리)
    let zoneCount = 0;
    // 구역 판정은 선적 번호(뱃머리 기준) 한 벌 — 양하 도면(선미 기준) 칸 번호는 25 - 칸 으로 바꿔서 같은 규칙을 쓴다
    const coreUnit = (line, ci, q) => (fmt === 'checker' ? inLoloCore(line, N_POS - (ci + q)) : inLoloCore(line, 24 - ci - q));
    const coreHit = (g) => { for (let q = 0; q < g.span; q++) if (coreUnit(g.line, g.ci, q)) return true; return false; };
    const inZone = (s, g) => k === 'D' && (!!s.lolo || coreHit(g) || crane.has(String(s.cn || '').toUpperCase()));
    if (k === 'D') {
      if (fmt === 'checker') {
        for (let line = 1; line <= rows; line++) for (let pos = 10; pos <= 15; pos++) if (inLoloCore(line, pos)) { zoneUnits.add(`${line - 1},${N_POS - pos}`); coreUnits.add(`${line - 1},${N_POS - pos}`); }
      } else {
        for (const s of d.slots) {
          if (!s || s.xcell) continue;
          const g = place(s);
          for (let q = 0; q < g.span; q++) if (coreUnit(g.line, g.ci, q)) { zoneUnits.add(`${g.ri},${g.ci + q}`); coreUnits.add(`${g.ri},${g.ci + q}`); }
        }
      }
    }

    // 컨 칸
    for (const s of occ) {
      const g = posOf.get(s);
      const c = byCn[String(s.cn).toUpperCase()];
      const m = slotMarks(s, c, xrayMap);
      const t = checkerTypeOf(s);
      const cn = String(s.cn).toUpperCase();
      const z = inZone(s, g);
      if (z) { zoneCount += 1; for (let q = 0; q < g.span; q++) zoneUnits.add(`${g.ri},${g.ci + q}`); }
      const w = px.uw * g.span;
      const wide = fmt === 'carrier' && px.uw >= 60;   // 덱 단위로 같게 — B덱(20피트 큰 칸)만 번호 한 줄
      const wtTxt = s.wt != null && s.wt !== '' ? String(Math.round(Number(s.wt))) : '';
      const baseTxt = fmt === 'checker' ? t.txt : `${String(s.iso || '').trim()} ${s.fe === 'E' ? 'E' : 'F'}`.trim();
      const flagTxt = fmt === 'carrier' ? `${m.urgentFlag ? '긴급' : ''}${m.urgentFlag && m.fish ? ' ' : ''}${m.fish ? '활어' : ''}` : '';   // 4.04: 선사 파일 칸 글자 «긴급»·«활어»
      const typeTxt = flagTxt ? `${baseTxt} ${flagTxt}` : baseTxt;
      const lines = [];
      if (fmt === 'checker') { lines.push(cn.slice(0, 6), cn.slice(6)); }
      else if (wide) lines.push(cn);
      else lines.push(cn.slice(0, 7), cn.slice(7));
      lines.push(wtTxt);
      if (fmt === 'carrier' && m.lug) lines.push('LUG');
      if (flagTxt && w < 52) lines.push(baseTxt, flagTxt);   // 한 칸짜리(폭 약 38px)는 글자가 칸을 넘으므로 둘째 줄로 내린다 — 넓은 칸(40·45 두 칸)은 선사 PDF처럼 한 줄
      else lines.push(typeTxt);
      page.cells.push({
        cn, line: g.line, pos: g.pos, ri: g.ri, ci: g.ci, span: g.span,
        x: px.x0 + g.ci * px.uw, y: px.y0 + g.ri * px.uh, w, h: px.uh,
        lines, letter: m.letter, fill: m.full && !!m.letter && m.letter !== 'RE', lug: m.lug, xray: m.xray, urgent: m.urgent, tmp: m.tmp, dbl: !!s.dbl, slot: s,
        pred: !!s.pred && !s.sure, sure: !!s.sure, lolo: z, wt: wtTxt, type: typeTxt, fe: s.fe === 'E' ? 'E' : 'F',
      });
    }

    // 빈 칸 · X 표식 — 화면에서 누를 때 쓰는 원래 슬롯(줄-칸 으로 찾는다)
    const eMap = new Map(), xMap = new Map();
    for (const s of d.slots) {
      if (!s || !s.empty) continue;
      (s.xcell ? xMap : eMap).set(`${Number(s.line) || (Number(s.ri) + 1)}-${Number(s.col)}`, s);
    }
    if (fmt === 'checker') {
      for (const [dk, line, pos] of RZOR_DECK_SLOTS) {
        if (dk !== k) continue;
        if (occKey.has(keyOf(k, line, pos))) continue;
        page.empties.push({ ri: line - 1, ci: N_POS - pos, span: 1, x: px.x0 + (N_POS - pos) * px.uw, y: px.y0 + (line - 1) * px.uh, w: px.uw, h: px.uh, line, pos, slot: eMap.get(`${line}-${pos}`) || null, z: zoneUnits.has(`${line - 1},${N_POS - pos}`) });
      }
      for (const s of occ) {
        const g = posOf.get(s);
        const t = checkerTypeOf(s);
        if (t.sz === '20' || g.pos >= N_POS) continue;
        if (occKey.has(keyOf(k, g.line, g.pos + 1))) continue;
        page.xmarks.push({ t: t.sz === '45' ? '<45>' : 'X', x: px.x0 + (N_POS - g.pos - 1) * px.uw, y: px.y0 + g.ri * px.uh, w: px.uw, h: px.uh, slot: xMap.get(`${g.line}-${g.pos + 1}`) || null, z: zoneUnits.has(`${g.ri},${N_POS - g.pos - 1}`) });
      }
    } else {
      for (const s of d.slots) {
        if (!s || !s.empty || s.xcell) continue;
        const g = place(s);
        page.empties.push({ ri: g.ri, ci: g.ci, span: g.span, x: px.x0 + g.ci * px.uw, y: px.y0 + g.ri * px.uh, w: px.uw * g.span, h: px.uh, line: g.line, pos: g.pos, slot: s, z: [...Array(g.span).keys()].some((q) => zoneUnits.has(`${g.ri},${g.ci + q}`)) });
      }
    }

    // 위치 번호 축
    if (fmt === 'checker') {
      for (let p = N_POS; p >= 1; p--) page.axis.push({ t: String(p), x: px.x0 + (N_POS - p) * px.uw + px.uw / 2 });
    }

    // LOLO 구역 굵은 선 · 이름표
    if (zoneUnits.size) {
      const segs = outlineSegments(zoneUnits, px);
      let rMin = 1e9, rMax = -1, cMin = 1e9, cMax = -1;
      for (const u of coreUnits) { const [r, c] = u.split(',').map(Number); rMin = Math.min(rMin, r); rMax = Math.max(rMax, r); cMin = Math.min(cMin, c); cMax = Math.max(cMax, c); }
      // 이름표 자리 — 기본 구역 둘레 상자 안에서 구역이 아닌 칸(8줄 10~12칸 «귀퉁이»)이 있으면 거기, 없으면 상자 위
      const holes = [];
      for (let r = rMin; r <= rMax; r++) for (let c = cMin; c <= cMax; c++) if (!coreUnits.has(`${r},${c}`) && !zoneUnits.has(`${r},${c}`)) holes.push([r, c]);
      let lx, ly;
      if (holes.length) {
        const hr = Math.max(...holes.map((h) => h[0])), hs = holes.filter((h) => h[0] === hr);
        const hc0 = Math.min(...hs.map((h) => h[1])), hc1 = Math.max(...hs.map((h) => h[1]));
        lx = px.x0 + ((hc0 + hc1 + 1) / 2) * px.uw; ly = px.y0 + (hr + 0.5) * px.uh;
      } else { lx = px.x0 + ((cMin + cMax + 1) / 2) * px.uw; ly = px.y0 + rMin * px.uh - 6; }
      page.zone = { segs, count: zoneCount, cells: zoneUnits.size, label: { x: lx, y: ly } };
    }
    pages.push(page);
  }

  // 머리 값
  const sum = {};
  let ttl = deckTotals(allOcc);
  for (const pg of pages) sum[pg.deck] = pg.totals;
  const head = {
    vsl: String(vsl || 'RIZHAO ORIENT').toUpperCase(), voy, date, lport, dport,
    dateShown: fmt === 'carrier' ? ddmmyyyy(date) : date,
  };
  // 배 전체 집계표(맨 아래) — F/E 줄
  let feF = { 20: { D: 0, R: 0 }, 40: { D: 0, R: 0 }, 45: { D: 0, R: 0 }, L20: 0, L40: 0, n: 0 };
  let feE = { 20: { D: 0, R: 0 }, 40: { D: 0, R: 0 }, 45: { D: 0, R: 0 }, L20: 0, L40: 0, n: 0 };
  for (const pg of pages) { feF = addFe(feF, pg.totals.fe.F); feE = addFe(feE, pg.totals.fe.E); }
  const totalsAll = { decks: sum, ttl, F: feF, E: feE, TTL: addFe(feF, feE),
    ch20: pages.reduce((a, p) => a + p.totals.ch20, 0), ch40: pages.reduce((a, p) => a + p.totals.ch40, 0),
    n20: pages.reduce((a, p) => a + p.totals.n[20], 0), n40: pages.reduce((a, p) => a + p.totals.n[40], 0),
    wt: Math.round(pages.reduce((a, p) => a + p.totals.wt * 1000, 0)) / 1000 };
  return { fmt, head, pages, totals: totalsAll, predN, fmtWt, mode };
}
