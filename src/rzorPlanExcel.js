// 3.67: RZOR 선적 덱플랜 → 검수사 STOWAGE PLAN 엑셀(마감텔리 PLAN.xlsx 양식) 내보내기.
//   양식은 R106W 실물(2026-09-28)을 셀 단위로 그대로 따른다 — rzorPlan.parseCheckerPlanWorkbook 이 다시 읽을 수 있어야 한다.
//   · 시트 하나 «loading stowage plan», 덱 블록 셋(C·D·UNDER)이 52행 간격(격자 49행 + 서명 3행, 4.04-04 전에는 49행)으로 세로, 맨 아래 집계표.
//   · 위치 p(1~26, 1=선수)의 열 = 4 + 3·(26−p) (D=26 … CA=1). 옆(왼쪽) 칸 = p+1 자리에 «X»(40) «<45>»(45) — 그 자리에 컨이 없을 때만.
//   · 컨 하나 = 세로 네 줄(번호·무게·규격 F40'H·크기 코드 4=40'·3=20'). 줄 번호는 CC 열.
//   · 크레인(LO/LO, D덱 10~15) 40피트도 검수사 양식에서는 코드 4 + 옆 칸 X 가 붙는다(R106W·R100W 실측 — 45대 전부 c4, 15칸엔 X). 표식으로 크레인을 가르지 않는다.
//   · 예측 자리(pred)는 글자색 회색 — 검수사가 고쳐 보내는 초안이다. 확정·올린 자리는 검정.
//   스타일은 xlsx-js-style 로 쓴다(EmptySealReport 와 같은 로더). 노드 시험은 스타일 없는 xlsx 로도 같은 셀이 나온다.

import { isReeferIso, isoFeet } from './utils.js';   // 리퍼·크기 판정 한 벌(3.60-10 lint · 감사 §4)
import { applyXlsxPrintSetup, downloadXlsxBytes } from './xlsxPrintSetup.js';

const N_POS = 26;
const BLOCK_ROWS = 49;
//  4.04-04 선적 서명줄 — 덱 블록(C·D)마다 맨 아래에 서명 3줄(사인할 자리 · 이름 · 직책)을 더하고, UNDER 쪽은 집계표 왼쪽 빈 칸에 선다(집계표 줄 높이는 그대로 — 쪽이 길어지지 않는다). 쪽 나눔은 블록 높이 한 벌(STRIDE)이다. 검수사 2026-10-05 «둘다 서명이 필요합니다.» «양하 선적 동일 합니다»
//  쪽 높이 — 배율 60 에서도 한 쪽(A4 가로 여백 안 190mm)에 들어가게 블록 높이를 잡는다. C·D 블록 = 격자 49줄(779) + 서명 3줄(64+18+18) = 879pt → 배율 60 에서 186mm.
const SIGN_ROWS = 3;
const STRIDE = BLOCK_ROWS + SIGN_ROWS;
const SIGN_ROOM_PX = 64;                // 서명줄 위 사인할 자리(행 높이) — 칸 번호 줄 아래부터 줄까지 64pt, 배율 51~60 에서 약 11~13mm
const BANDS = 8;
const COL_LINE = 80;                     // CC
const colOfPos = (p) => 3 + 3 * (N_POS - p);   // 0-based
const DECK_ORDER = ['C', 'D', 'U'];
const DECK_LABEL = { C: 'C', D: 'D', U: 'UNDER' };

/** xlsx-js-style 로더 — EmptySealReport 와 같은 캐시 키(window.XLSXS) */
export async function loadSheetJSStyled() {
  if (window.XLSXS) return window.XLSXS;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js';
    //  4.04: 15초 안에 안 오면 포기하고 화면에 알린다 — 네트워크가 멈추면 «Excel 만드는 중…» 이 끝나지 않던 것.
    const tm = setTimeout(() => reject(new Error('xlsx-js-style 로드 시간 초과(15초) — 인터넷 연결을 확인해 주세요')), 15000);
    script.onload = () => { clearTimeout(tm); resolve(); };
    script.onerror = () => { clearTimeout(tm); reject(new Error('xlsx-js-style 로드 실패')); };
    document.head.appendChild(script);
  });
  window.XLSXS = window.XLSX;
  return window.XLSXS;
}

const B = { style: 'thin', color: { rgb: '000000' } };
const BOX = { top: B, bottom: B, left: B, right: B };
const S_CN = (pred) => ({ font: { name: 'Arial', sz: 8, bold: true, color: { rgb: pred ? '808080' : '000000' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: BOX });
const S_SUB = (pred) => ({ font: { name: 'Arial', sz: 8, color: { rgb: pred ? '808080' : '000000' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: BOX });
const S_EMPTY = { border: BOX };
const S_HEAD = { font: { name: 'Arial', sz: 9, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } };
const S_TITLE = { font: { name: 'Arial', sz: 16, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } };
const S_DECK = { font: { name: 'Arial', sz: 20, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } };
const S_INFO = { font: { name: 'Arial', sz: 10 }, alignment: { vertical: 'center' } };
const S_TBL = { font: { name: 'Arial', sz: 9 }, alignment: { horizontal: 'center', vertical: 'center' }, border: BOX };
const S_TBLB = { font: { name: 'Arial', sz: 9, bold: true }, alignment: { horizontal: 'center', vertical: 'center' }, border: BOX };
const S_SIGN = { font: { name: 'Arial', sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' } };
const S_SIGNB = { font: { name: 'Arial', sz: 10, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } };
const S_SIGNLINE = { border: { bottom: B } };
const S_MARK = { font: { name: 'Arial', sz: 8 }, alignment: { horizontal: 'center', vertical: 'center' } };

/** 규격 문자열 «F40'H» — 검수사 표기(F/E + 크기 + H·D·R·L) */
export function checkerTypeOf(s) {
  const iso = String(s.iso || '').toUpperCase().replace(/\s/g, '');
  const sz = /^45/.test(iso) ? '45' : String(isoFeet(iso));   // 플랜 라벨 «45 HC» 는 첫 글자가 4 라 45 를 먼저 본다 · 나머지는 utils 한 벌
  const fl = Array.isArray(s.flags) ? s.flags : [];
  const rf = !!s.rf || isReeferIso(iso);
  const flat = /FR$/.test(iso);   // 파서가 «E40'F» 를 40 FR 로 읽는다 — 되돌릴 때 F
  const k = fl.includes('LUG') ? 'L' : (rf ? 'R' : (flat ? 'F' : (/HC$/.test(iso) ? 'H' : (/GP$/.test(iso) ? 'D' : (sz === '20' ? 'D' : 'H')))));   // 파서 D↔GP·H↔HC 되돌림(«F40'D» 보존)
  return { sz, fe: s.fe === 'E' ? 'E' : 'F', k, rf, txt: `${s.fe === 'E' ? 'E' : 'F'}${sz}'${k}` };
}

/**
 * 덱플랜(stowagePlan 모양 — 올린 것·생성한 것 다 됨) → 워크북.
 * @param {object} XLSX  SheetJS(스타일 지원이면 스타일까지)
 * @param {object} p
 * @param {object} p.plan       {decks:[{deck, slots:[{cn, wt, iso, fe, flags, line, col, lolo, pred, sure, chassis}]}]}
 * @param {string} p.vsl        선박명(RIZHAO ORIENT)
 * @param {string} p.voy        항차(R106W)
 * @param {string} p.date       YYYY-MM-DD
 * @param {string} p.inspector  검수원
 * @param {string} [p.dport]    양하항(기본 RIZHAO)
 */
export function buildCheckerPlanWorkbook(XLSX, { plan, vsl = 'RIZHAO ORIENT', voy = '', date = '', inspector = '', dport = 'RIZHAO' } = {}) {
  const ws = {};
  const merges = [];
  const set = (r, c, v, s, z) => {
    if (v == null) return;
    const cell = { v, t: typeof v === 'number' ? 'n' : 's' };
    if (s) cell.s = s;
    if (z) cell.z = z;
    ws[XLSX.utils.encode_cell({ r, c })] = cell;
  };
  const merge = (r1, c1, r2, c2) => merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });

  const byDeck = {};
  for (const d of (plan?.decks || [])) {
    const key = /^U|^B/.test(String(d.deck || '')) ? 'U' : String(d.deck || '').toUpperCase();
    byDeck[key] = (byDeck[key] || []).concat((d.slots || []).filter((s) => s && s.cn && !s.empty));
  }
  const sum = { C: null, D: null, U: null };
  const feTot = { F: { 20: { D: 0, R: 0 }, 40: { D: 0, R: 0 }, 45: { D: 0, R: 0 }, L20: 0, L40: 0, n: 0 },
                  E: { 20: { D: 0, R: 0 }, 40: { D: 0, R: 0 }, 45: { D: 0, R: 0 }, L20: 0, L40: 0, n: 0 } };

  DECK_ORDER.forEach((deck, bi) => {
    const off = STRIDE * bi;
    const slots = byDeck[deck] || [];
    // 머리
    set(off + 0, 24, `M/V "${vsl}" STOWAGE PLAN`, S_TITLE);
    set(off + 1, 1, `Voy. No.: ${voy}`, S_INFO);
    if (deck === 'U') { set(off + 1, 33, 'UNDER', S_DECK); merge(off + 1, 33, off + 2, 36); }
    else { set(off + 1, 36, DECK_LABEL[deck], S_DECK); merge(off + 1, 36, off + 2, 36); }
    set(off + 1, 39, '- DECK', S_DECK); merge(off + 1, 39, off + 2, 42);
    set(off + 2, 1, `Date    : ${date}`, S_INFO);
    set(off + 3, 1, 'L/Port  : PYEONGTAEK', S_INFO);
    set(off + 4, 1, `D/Port  : ${dport}`, S_INFO);
    // 집계 — CHASSIS 20'/40' · Weight · SUB TOTAL(SIZE/CONT)
    let ch20 = 0, ch40 = 0, wt = 0; const n = { 20: 0, 40: 0, 45: 0 };
    const grid = {};   // line → pos → slot
    for (const s of slots) {
      const line = Number(s.line) || (Number(s.ri) + 1) || 1;
      const pos = Number(s.col) || (N_POS - Number(s.ci || 0) - ((Number(s.span) || 1) - 1));
      if (!grid[line]) grid[line] = {};
      grid[line][pos] = s;
      const t = checkerTypeOf(s);
      n[t.sz] += 1; wt += Number(s.wt) || 0;
      // 섀시 수 — 실물 R106W: C덱 20'=2·40'=64(전부 섀시), D덱 20'=4(단독 코드 3 만)·40'=59(크레인 45 뺀 49 + 트윈 6 + 빈 섀시 4).
      //   트윈(코드 2·1)은 한 섀시에 둘이라 코드 1 만 센다. 크레인(D덱 10~15)은 섀시 없음. 빈 섀시(C/S)는 컨이 아니라 못 센다.
      const chas = s.chassis != null ? Number(s.chassis) : (t.sz === '20' ? 3 : 4);
      if (t.sz === '20') { if (chas === 3) ch20 += 1; else if (chas === 1) ch40 += 1; }
      else if (!s.lolo) ch40 += 1;
      const ft = feTot[t.fe];
      ft.n += 1;
      if (t.k === 'L') { if (t.sz === '20') ft.L20 += 1; else ft.L40 += 1; }   // 실물 — 수화물은 크기 칸에 안 세고 Lug 칸·TTL 에만
      else ft[t.sz][t.rf ? 'R' : 'D'] += 1;
    }
    sum[deck] = { ch20, ch40, wt: wt / 1000, n, ttl: n[20] + n[40] + n[45] };
    set(off + 2, 51, 'CHASSIS', S_HEAD); merge(off + 2, 51, off + 2, 54);
    set(off + 3, 50, "20'", S_TBL); merge(off + 3, 50, off + 3, 52);
    set(off + 3, 53, "40'", S_TBL); merge(off + 3, 53, off + 3, 55);
    set(off + 4, 50, ch20, S_TBL); merge(off + 4, 50, off + 4, 52);
    set(off + 4, 53, ch40, S_TBL); merge(off + 4, 53, off + 4, 55);
    set(off + 2, 57, 'Weight', S_HEAD); merge(off + 2, 57, off + 3, 60);
    set(off + 4, 57, Math.round(wt) / 1000, S_TBL, '#,##0.000_ '); merge(off + 4, 57, off + 4, 60);
    set(off + 2, 65, 'SUB TOTAL', S_HEAD); merge(off + 2, 65, off + 2, 79);
    set(off + 3, 66, 'SIZE', S_TBLB); merge(off + 3, 66, off + 3, 68);
    set(off + 3, 69, "20'", S_TBL); merge(off + 3, 69, off + 3, 71);
    set(off + 3, 72, "40'", S_TBL); merge(off + 3, 72, off + 3, 74);
    set(off + 3, 75, "45'", S_TBL); merge(off + 3, 75, off + 3, 77);
    set(off + 3, 78, 'TTL', S_TBL); merge(off + 3, 78, off + 3, 79);
    set(off + 4, 66, 'CONT', S_TBLB); merge(off + 4, 66, off + 4, 68);
    set(off + 4, 69, n[20], S_TBL); merge(off + 4, 69, off + 4, 71);
    set(off + 4, 72, n[40], S_TBL); merge(off + 4, 72, off + 4, 74);
    set(off + 4, 75, n[45], S_TBL); merge(off + 4, 75, off + 4, 77);
    set(off + 4, 78, n[20] + n[40] + n[45], S_TBL); merge(off + 4, 78, off + 4, 79);
    // 위치 번호 머리줄·바닥줄
    for (let p = N_POS; p >= 1; p--) { set(off + 6, colOfPos(p), p, S_HEAD); set(off + 48, colOfPos(p), p, S_HEAD); }
    // 밴드 8줄
    for (let k = 1; k <= BANDS; k++) {
      const r = off + 8 + 5 * (k - 1);
      set(r, COL_LINE, k, S_HEAD);
      const row = grid[k] || {};
      for (let p = 1; p <= N_POS; p++) {
        const c = colOfPos(p);
        const s = row[p];
        if (!s) { set(r, c, '', S_EMPTY); set(r + 1, c, '', S_EMPTY); set(r + 2, c, '', S_EMPTY); set(r + 3, c, '', S_EMPTY); continue; }
        const t = checkerTypeOf(s);
        const pred = !!s.pred && !s.sure;
        set(r, c, String(s.cn).toUpperCase(), S_CN(pred));
        set(r + 1, c, s.wt != null && s.wt !== '' ? Math.round(Number(s.wt)) : '', S_SUB(pred));
        set(r + 2, c, t.txt, S_SUB(pred));
        const chas = s.chassis != null ? Number(s.chassis) : (t.sz === '20' ? 3 : 4);
        set(r + 3, c, chas, S_SUB(pred));
      }
      // 옆 칸 표식 — 40·45 는 p+1 자리가 비었을 때 X / <45>(크레인 구역도 같다)
      for (let p = 1; p < N_POS; p++) {
        const s = row[p]; if (!s) continue;
        const t = checkerTypeOf(s);
        if (t.sz === '20' || row[p + 1]) continue;
        set(r, colOfPos(p + 1), t.sz === '45' ? '<45>' : 'X', S_MARK);
      }
    }
  });

  // 맨 아래 집계표(UNDER 블록 격자 아래, 155행~)
  const r0 = STRIDE * 2 + BLOCK_ROWS + 1;   // 세 번째 블록(UNDER) 격자 바로 아래 — 이 쪽의 서명줄은 집계표 왼쪽 빈 칸(r0+2 줄)에 선다
  const hdr = [[27, 'CHASSIS'], [29, "20'"], [32, "40'"], [36, 'Weight'], [41, 'Cont.'], [44, "20'"], [47, 'D'], [50, 'R'],
               [53, "40'"], [56, 'D'], [59, 'R'], [62, "45'"], [65, 'D'], [68, 'R'], [71, '20 Lug'], [74, '40 Lug'], [77, 'TTL']];
  // 머리 병합 폭 — CHASSIS 는 두 칸(AB:AC), Weight 는 네 칸(AK:AN), 나머지는 세 칸. 폭이 겹치면 엑셀이 파일을 «복구» 하겠냐고 묻는다(4.04: CHASSIS 병합이 옆 20' 칸을 침범하던 것을 바로잡음).
  for (const [c, v] of hdr) { set(r0, c, v, S_TBLB); merge(r0, c, r0, c + (c === 27 ? 1 : c === 36 ? 3 : 2)); }
  const tot = { ch20: 0, ch40: 0, wt: 0 };
  DECK_ORDER.forEach((deck, i) => {
    const r = r0 + 1 + i; const sm = sum[deck] || { ch20: 0, ch40: 0, wt: 0 };
    set(r, 27, `${deck}-DECK`, S_TBLB); merge(r, 27, r, 28);
    set(r, 29, sm.ch20, S_TBL); merge(r, 29, r, 31);
    set(r, 32, sm.ch40, S_TBL); merge(r, 32, r, 34);
    set(r, 36, Math.round(sm.wt * 1000) / 1000, S_TBL, '#,##0.000_ '); merge(r, 36, r, 39);
    tot.ch20 += sm.ch20; tot.ch40 += sm.ch40; tot.wt += sm.wt;
  });
  const rT = r0 + 4;
  set(rT, 27, 'TTL', S_TBLB); merge(rT, 27, rT, 28);
  set(rT, 29, tot.ch20, S_TBL); merge(rT, 29, rT, 31);
  set(rT, 32, tot.ch40, S_TBL); merge(rT, 32, rT, 34);
  set(rT, 36, Math.round(tot.wt * 1000) / 1000, S_TBL, '#,##0.000_ '); merge(rT, 36, rT, 39);
  const feRow = (r, lab, f) => {
    set(r, 41, lab, S_TBLB); merge(r, 41, r, 43);
    const cells = [[44, f[20].D + f[20].R], [47, f[20].D], [50, f[20].R], [53, f[40].D + f[40].R], [56, f[40].D], [59, f[40].R],
                   [62, f[45].D + f[45].R], [65, f[45].D], [68, f[45].R], [71, f.L20], [74, f.L40], [77, f.n]];
    for (const [c, v] of cells) { set(r, c, v, S_TBL); merge(r, c, r, c + 2); }
  };
  feRow(r0 + 1, 'F', feTot.F);
  feRow(r0 + 2, 'E', feTot.E);
  const T = { 20: { D: feTot.F[20].D + feTot.E[20].D, R: feTot.F[20].R + feTot.E[20].R },
              40: { D: feTot.F[40].D + feTot.E[40].D, R: feTot.F[40].R + feTot.E[40].R },
              45: { D: feTot.F[45].D + feTot.E[45].D, R: feTot.F[45].R + feTot.E[45].R },
              L20: feTot.F.L20 + feTot.E.L20, L40: feTot.F.L40 + feTot.E.L40, n: feTot.F.n + feTot.E.n };
  feRow(r0 + 3, 'TTL', T);
  // 예측 자리가 섞였으면 표시(검수사 초안)
  const predN = Object.values(byDeck).flat().filter((s) => s.pred && !s.sure).length;
  if (predN) set(r0 + 5, 1, `※ 회색 글씨 ${predN}대는 앱 예측 자리입니다 — 확인 후 고쳐 주십시오.`, S_INFO);

  // 서명줄 — 모든 덱 쪽 맨 아래(C·D 는 블록 끝, UNDER 는 집계표 왼쪽 빈 칸). 줄 아래에 검수원 이름 · CHIEF CHECKER, 오른쪽에 CHIEF OFFICER. 병합은 줄·이름·직책 줄마다 한 칸씩이고 집계표(AA 열~)와 겹치지 않는다.
  const signRows = [{ sr: BLOCK_ROWS, tall: true }, { sr: STRIDE + BLOCK_ROWS, tall: true }, { sr: r0 + 2, tall: false }];
  for (const { sr } of signRows) {
    for (const [c1, c2] of [[3, 11], [15, 23]]) { for (let c = c1; c <= c2; c++) set(sr, c, '', S_SIGNLINE); merge(sr, c1, sr, c2); }
    set(sr + 1, 3, inspector || '', S_SIGN); merge(sr + 1, 3, sr + 1, 11);
    set(sr + 2, 3, 'CHIEF CHECKER', S_SIGNB); merge(sr + 2, 3, sr + 2, 11);
    set(sr + 2, 15, 'CHIEF OFFICER', S_SIGNB); merge(sr + 2, 15, sr + 2, 23);
  }
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r0 + 6, c: 84 } });
  ws['!merges'] = merges;
  // 열 너비 — 실물과 같은 모양(위치 칸 57/53px, 사이 칸 1px)
  const cols = [];
  for (let c = 0; c <= 84; c++) {
    let wpx = 1;
    if (c <= 1) wpx = 13;
    else if (c >= 3 && c <= 78 && (c - 3) % 3 === 0) wpx = c < 18 ? 57 : 53;
    else if (c === 79) wpx = 1;
    else if (c === 80) wpx = 22;
    else if (c === 81) wpx = 11;
    else if (c >= 82) wpx = 72;
    cols.push({ wpx });
  }
  ws['!cols'] = cols;
  const rows = [];
  for (let bi = 0; bi < 3; bi++) {
    const off = STRIDE * bi;
    rows[off] = { hpx: 41 }; rows[off + 1] = { hpx: 29 }; rows[off + 5] = { hpx: 5 }; rows[off + 7] = { hpx: 5 };
    for (let k = 0; k < BANDS; k++) { const r = off + 8 + 5 * k; rows[r] = { hpx: 27 }; rows[r + 1] = { hpx: 12 }; rows[r + 2] = { hpx: 12 }; rows[r + 3] = { hpx: 12 }; rows[r + 4] = { hpx: 15 }; }
  }
  for (const { sr, tall } of signRows) if (tall) { rows[sr] = { hpx: SIGN_ROOM_PX }; rows[sr + 1] = { hpx: 18 }; rows[sr + 2] = { hpx: 18 }; }
  for (let r = 0; r <= r0 + 5; r++) if (!rows[r]) rows[r] = { hpx: 15 };   // 집계표·서명 줄까지 줄마다 높이를 적는다(안 적으면 엑셀·리브레오피스의 기본 높이가 달라 마지막 쪽 높이가 어긋난다)
  ws['!rows'] = rows;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'loading stowage plan');
  return wb;
}

/** 엑셀 인쇄 설정 — 마감텔리 R106W 실물과 같다: 가로 A4 · 배율 60 · 여백 0.39 · 가운데 맞춤 · 덱 블록(C·D·UNDER) 사이에서 쪽 나눔.
 *  엑셀은 «한 쪽 맞춤» 을 쓰면 쪽 나눔 줄을 무시하므로 배율을 쓴다. 60 은 상한 — 쓰는 라이브러리가 칸을 실물보다 넓게 써서(1.3배) 60 이면 가로 두 쪽이 되므로 열 너비 합으로 가로 한 쪽에 맞는 배율까지 낮춘다(fitWidth). 검수사 2026-10-05 «엑셀에서도 한장으로 나오게끔 맞춰주세요» */
export const CHECKER_XLSX_PRINT = { orientation: 'landscape', paper: 9, margin: 0.3937, centered: true, scale: 60, fitWidth: true, breaks: [STRIDE, STRIDE * 2] };

/** 파일로 저장(브라우저) — STOWAGE_PLAN_R106W.xlsx */
export async function exportCheckerPlanXlsx(p) {
  const XLSX = await loadSheetJSStyled();
  const wb = buildCheckerPlanWorkbook(XLSX, p);
  const name = `STOWAGE_PLAN_${String(p.voy || 'RZOR').replace(/[^A-Za-z0-9_-]/g, '')}.xlsx`;
  // 4.04-02: XLSX.writeFile 은 인쇄 설정을 파일에 안 쓴다 — 만든 파일을 열어 써 넣고 내려받는다.
  const bytes = applyXlsxPrintSetup(XLSX, XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), [CHECKER_XLSX_PRINT]);
  downloadXlsxBytes(bytes, name);
  return name;
}

