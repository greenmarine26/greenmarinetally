// 4.04: RZOR 양하 덱플랜 → 선사 STOWAGE PLAN 모양 엑셀 — 출력 허브 «카고플랜»의 Excel 단추(양하). 덱마다 시트 하나(B-DECK·C-DECK·D-DECK), 컨 하나 = 병합 칸 하나(번호/무게/규격).
//   · 병합 칸끼리 겹치지 않는다(겹치면 엑셀이 «복구» 창을 띄운다) · 집계표 머리는 선사 rzdf 와 같은 병합 · 서명란(Chief Checker / Chief Officer)은 출력에만 있다.
//   · 그림 좌표·칸 글자·집계는 출력(buildPrintModel)과 한 벌이다 — 종이와 엑셀이 갈리지 않는다. 컬러 칸은 특수화물 바탕색(fills, 카고플랜 SPECIAL_FILL 한 벌) · ★ X-RAY · LUG.
//   · rzorPlan.parseDeckPlanWorkbook 이 다시 읽을 수 있는 모양(병합 칸 안에 번호·무게·«40 HC F»)으로 쓴다 — 시험이 왕복을 본다.
//   · 선적(검수사 마감텔리 양식)은 이 파일이 아니라 rzorPlanExcel.exportCheckerPlanXlsx 가 쓴다.
import { buildPrintModel } from './rzorPrintModel.js';
import { loadSheetJSStyled } from './rzorPlanExcel.js';
import { applyXlsxPrintSetup, downloadXlsxBytes } from './xlsxPrintSetup.js';

const B = { style: 'thin', color: { rgb: '000000' } };
const BOX = { top: B, bottom: B, left: B, right: B };
const font = (o = {}) => ({ name: 'Arial', sz: 8, ...o });
const hex = (h) => String(h || '').replace('#', '').toUpperCase();

/**
 * 워크북을 만든다(노드 시험은 스타일 없는 xlsx 로도 같은 셀이 나온다).
 * @param {object} XLSX
 * @param {object} p
 * @param {object} p.plan        선사 rzdf 덱플랜(stowagePlan)
 * @param {Array}  p.containers  병합 컨 목록(특수화물 판정용)
 * @param {object} p.xrayMap
 * @param {string} p.vsl         선박 풀네임
 * @param {string} p.date        YYYY-MM-DD
 * @param {object} p.fills       {DG,RF,FR,OT,TK:'#rrggbb'} — 카고플랜 SPECIAL_FILL
 */
export function buildCarrierPlanWorkbook(XLSX, { plan, containers = [], xrayMap = {}, vsl = 'RIZHAO ORIENT', date = '', fills = {}, mode = 'discharge' } = {}) {
  const model = buildPrintModel({ plan, containers, xrayMap, termWork: {}, vsl, date, mode });
  const wb = XLSX.utils.book_new();
  const w3 = (v) => model.fmtWt(v, false);
  model.pages.forEach((pg, pi) => {
    const ws = {};
    const merges = [];
    const set = (r, c, v, s) => { if (v == null || v === '') { if (s) ws[XLSX.utils.encode_cell({ r, c })] = { t: 's', v: '', s }; return; } ws[XLSX.utils.encode_cell({ r, c })] = { t: typeof v === 'number' ? 'n' : 's', v, ...(s ? { s } : {}) }; };
    const area = (r0, c0, r1, c1, v, s) => {   // 병합 칸 — 테두리가 모든 칸에 서도록 스타일을 깐다
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set(r, c, (r === r0 && c === c0) ? v : '', s);
      if (r1 > r0 || c1 > c0) merges.push({ s: { r: r0, c: c0 }, e: { r: r1, c: c1 } });
    };
    const cols = pg.px.cols, lastC = cols + 1;   // 열 0 = 여백, 1..cols = 칸 눈금, cols+1 = 줄 번호
    const H = 8;                                  // 격자 시작 행
    const hd = (a) => ({ font: font({ sz: a.sz || 10, bold: !!a.bold }), alignment: { horizontal: a.h || 'left', vertical: 'center' } });
    area(0, 1, 0, cols, `MV "${model.head.vsl}" _STOWAGE PLAN`, hd({ sz: 16, bold: true, h: 'center' }));
    const tc = Math.max(8, cols - 12);   // 집계표 시작 열(오른쪽)
    area(1, 1, 1, tc - 1, `"${pg.label}" - DECK`, hd({ sz: 12, bold: true, h: 'center' }));   // SUB TOTAL(열 tc~)과 겹치지 않게 그 앞까지만
    [['VOY. NO', model.head.voy], ['DATE', model.head.dateShown], ['L/PORT', model.head.lport], ['D/PORT', model.head.dport]].forEach(([a, b], i) => {
      set(2 + i, 1, a, hd({})); set(2 + i, 2, ':', hd({})); set(2 + i, 3, b, hd({}));
    });
    const t = pg.totals;
    const tb = (bold) => ({ font: font({ sz: 9, bold }), alignment: { horizontal: 'center', vertical: 'center' }, border: BOX });
    area(1, tc, 1, tc + 4, 'SUB TOTAL', tb(true));
    ['SIZE', "20'", "40'", "45'", 'TTL'].forEach((v, i) => set(2, tc + i, v, tb(false)));
    ['CONT', t.n[20], t.n[40], t.n[45], t.ttl].forEach((v, i) => set(3, tc + i, v, tb(false)));
    ['SIZE', "20'", "40'"].forEach((v, i) => set(2, tc + 6 + i, v, tb(false)));
    ['CAPACITY', t.ch20, t.ch40].forEach((v, i) => set(3, tc + 6 + i, v, tb(false)));
    set(4, tc + 6, 'Weight', tb(true)); area(4, tc + 7, 4, tc + 8, w3(t.wt), tb(false));

    // 칸 — 컨마다 번호/무게(/LUG)/규격(/종류)(/★)
    const put = (r0, c0, span, lines, s) => area(r0, c0, r0 + 3, c0 + span - 1, lines.join('\n'), s);
    for (const e of pg.empties) {
      if (!e.slot) continue;
      put(H + e.ri * 4, 1 + e.ci, e.span, [], { border: BOX });
    }
    for (const c of pg.cells) {
      const lines = [c.cn, c.wt, ...(c.lug ? ['LUG'] : []), c.type];   // 엑셀 칸은 번호를 한 줄로(종이처럼 둘로 쪼개면 읽는 쪽이 번호·무게를 못 가른다)
      if (c.letter) lines.push(c.letter);
      if (c.urgent && !/긴급/.test(String(c.type || ''))) lines.push('▲ 긴급');   // 4.04: 리스트 쪽 긴급(칸 글자에 «긴급» 이 없는 것)도 엑셀에 남긴다
      if (c.xray) lines.push('★ X-RAY');
      const fill = c.fill && fills[c.letter] ? { patternType: 'solid', fgColor: { rgb: hex(fills[c.letter]) } } : undefined;
      put(H + c.ri * 4, 1 + c.ci, c.span, lines, { font: font({ sz: 8 }), alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: c.lug ? { top: { style: 'medium', color: { rgb: '7C3AED' } }, bottom: { style: 'medium', color: { rgb: '7C3AED' } }, left: { style: 'medium', color: { rgb: '7C3AED' } }, right: { style: 'medium', color: { rgb: '7C3AED' } } } : BOX, ...(fill ? { fill } : {}) });
    }
    if (pg.art) {   // 칸이 없는 격자의 빗금·회색·C/S 는 그림 그대로 — 회색 칸 / C/S 4000 칸
      const unit = (r) => ({ ri: Math.round((r.y - pg.px.y0) / pg.px.uh), ci: Math.round((r.x - pg.px.x0) / pg.px.uw) });
      for (const r of [...pg.art.hatch, ...pg.art.gray]) { const u = unit(r); area(H + u.ri * 4, 1 + u.ci, H + u.ri * 4 + 3, 1 + u.ci, '', { border: BOX, fill: { patternType: 'solid', fgColor: { rgb: 'D9D9D9' } } }); }
      for (const r of pg.art.cs) { const u = unit(r); area(H + u.ri * 4, 1 + u.ci, H + u.ri * 4 + 3, 1 + u.ci, 'C/S\n4000', { font: font({ sz: 8 }), alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BOX }); }
    }
    for (let i = 0; i < pg.px.rows; i++) area(H + i * 4, lastC, H + i * 4 + 3, lastC, i + 1, hd({ sz: 12, bold: true, h: 'center' }));   // 줄 번호 = 칸 높이(4행) 병합 한 칸
    if (pg.zone) set(H + pg.px.rows * 4 + 1, 1, `LOLO 구역(D덱 10~15칸) ${pg.zone.count}대 — 출력(굵은 선)과 같은 칸`, hd({ sz: 9 }));
    // 첫 시트 아래 — 배 전체 집계표(선사 rzdf 양식과 같은 병합) : 머리 두 줄 · 왼쪽(CHASSIS·20'·40'·Weight)은 첫 줄만 머리 · 오른쪽(F/E)은 세로 병합 + LUG 만 가로 병합
    let sigR = H + pg.px.rows * 4 + 3;
    if (pi === 0) {
      const T = model.totals;
      const decks = ['B', 'C', 'D'].filter((k) => T.decks[k]);
      const fe = (f) => [f[20].D + f[20].R, f[20].D, f[20].R, f[40].D + f[40].R, f[40].D, f[40].R, f[45].D + f[45].R, f[45].D, f[45].R, f.L20, f.L40, f.n];
      const r0 = sigR;
      ['CHASSIS', "20'", "40'", 'Weight'].forEach((v, i) => set(r0, 1 + i, v, tb(i === 0)));
      area(r0, 5, r0 + 1, 5, '', tb(false));
      ["20'", 'D', 'R', "40'", 'D', 'R', "45'", 'D', 'R'].forEach((v, i) => area(r0, 6 + i, r0 + 1, 6 + i, v, tb(false)));
      area(r0, 15, r0, 16, 'LUG', tb(false)); set(r0 + 1, 15, "20'", tb(false)); set(r0 + 1, 16, "40'", tb(false));
      area(r0, 17, r0 + 1, 17, 'TTL', tb(false));
      const left = decks.map((k) => [`${k}-DECK`, T.decks[k].ch20, T.decks[k].ch40, w3(T.decks[k].wt)]);   // CHASSIS = 샤시 대수(선사가 센 값)
      left.push(['TTL', T.ch20, T.ch40, w3(T.wt)]);
      const side = [['F', fe(T.F)], ['E', fe(T.E)], ['TTL', fe(T.TTL)]];
      const nrow = Math.max(left.length, side.length + 1);   // 오른쪽 자료 줄은 왼쪽 둘째 줄 아래부터(첫 자료 줄은 머리 둘째 줄과 같은 행)
      for (let i = 0; i < nrow; i++) {
        const r = r0 + 1 + i;
        (left[i] || ['', '', '', '']).forEach((v, k) => set(r, 1 + k, v, tb(false)));
        const si = i - (nrow - side.length);
        if (si >= 0) { set(r, 5, side[si][0], tb(false)); side[si][1].forEach((v, k) => set(r, 6 + k, v, tb(false))); }
      }
      sigR = r0 + 1 + nrow + 2;
    }
    // 서명란 — 출력 양식에만 있는 칸(앱 화면에는 없다). 줄 위에 서명, 아래에 직책.
    sigR += 2;   // 4.04-03: 줄 위에 사인할 자리 — 격자(또는 집계표) 아래 빈 줄을 둘 더 둔다(검수사 «사인할 공간이 없음»)
    const sg = { font: font({ sz: 11 }), alignment: { horizontal: 'center', vertical: 'center' } };
    area(sigR, 1, sigR, 3, '', { border: { bottom: { style: 'medium', color: { rgb: '000000' } } } }); area(sigR + 1, 1, sigR + 1, 3, 'Chief Checker', sg);
    area(sigR, 5, sigR, 7, '', { border: { bottom: { style: 'medium', color: { rgb: '000000' } } } }); area(sigR + 1, 5, sigR + 1, 7, 'Chief Officer', sg);
    const endR = sigR + 2;
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: endR, c: Math.max(lastC, tc + 8, 18) } });
    ws['!merges'] = merges;
    ws['!cols'] = Array.from({ length: Math.max(lastC, tc + 8, 18) + 1 }, (_, i) => ({ wch: i === 0 ? 2 : (i === lastC ? 5 : 11) }));
    const rows = []; for (let r = 0; r <= endR; r++) rows.push({ hpx: r >= H && r < H + pg.px.rows * 4 ? 13 : 16 });
    ws['!rows'] = rows;
    XLSX.utils.book_append_sheet(wb, ws, `${pg.label === 'UNDER' ? 'UNDER' : pg.label}-DECK`);
  });
  return wb;
}

/** 엑셀 인쇄 설정 — 선사 덱플랜(rzdf) 실물과 같다: 가로 A4 · 덱 시트마다 한 쪽에 맞춤(1×1). 검수사 2026-10-05 «엑셀에서도 한장으로 나오게끔 맞춰주세요» */
export const CARRIER_XLSX_PRINT = { orientation: 'landscape', paper: 9, margin: 0.3937, centered: true, fit: true };

/** 파일로 저장(브라우저) — STOWAGE_PLAN_R109E_양하.xlsx */
export async function exportCarrierPlanXlsx(p) {
  const XLSX = await loadSheetJSStyled();
  const wb = buildCarrierPlanWorkbook(XLSX, p);
  const name = `STOWAGE_PLAN_${String((p.plan && p.plan.voy) || 'RZOR').replace(/[^A-Za-z0-9_-]/g, '')}_DISCHARGE.xlsx`;
  // 4.04-02: XLSX.writeFile 은 인쇄 설정을 파일에 안 쓴다(세로 A4 11쪽으로 찍혔다) — 만든 파일을 열어 시트마다 써 넣고 내려받는다.
  const bytes = applyXlsxPrintSetup(XLSX, XLSX.write(wb, { bookType: 'xlsx', type: 'array' }), [CARRIER_XLSX_PRINT]);
  downloadXlsxBytes(bytes, name);
  return name;
}
