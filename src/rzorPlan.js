// V9.22: RZOR(RIZHAO ORIENT) 덱 스토우지 플랜 파서 — 선사 rzdf_ship_*.xls
//   시트: A/B/C/D/E-DECK-PTK. 컨테이너 = 병합 블록(여러 줄: 컨번호/무게/규격 "40 HC F"/긴급·활어).
//   실측 검증(R080E): D 75(20×4/40×68/45×3) · C 71 · B 14 = PDF SUB TOTAL과 완전 일치.
//   좌표: colStops/rowBands 정규화 — 화면 CSS grid와 인쇄가 같은 데이터를 쓴다.

/** SheetJS 워크북이 RZOR 덱 플랜인지 */
export function isDeckPlanWorkbook(wb) {
  return (wb?.SheetNames || []).some((n) => /-?DECK/i.test(String(n)));
}

const CN_RE = /([A-Z]{4})\s*(\d{7})/;
const ISO_RE = /(20|40|45)\s*(GP|HC|RH|RF|HA|OT|FR|TK|DC)\s*([FE])?/;

/** SheetJS 워크북 → {voy, decks:[{deck,name,cols,rows,slots:[{cn,wt,iso,fe,ri,ci,span,flags}]}]} */
export function parseDeckPlanWorkbook(wb, XLSX) {
  const decks = [];
  let voy = '';
  for (const name of wb.SheetNames) {
    if (!/-?DECK/i.test(name)) continue;
    const ws = wb.Sheets[name];
    if (!ws || !ws['!merges'] || !ws['!merges'].length) continue;
    const deckLetter = (String(name).match(/([A-E])\s*-?\s*DECK/i) || [])[1]?.toUpperCase() || name;
    const cellText = (r, c) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      return cell && cell.v != null ? String(cell.v) : '';
    };
    // 항차 (헤더 어딘가 R###E 패턴)
    if (!voy) {
      for (let r = 0; r < 10; r++) for (let c = 0; c < 30; c++) {
        const t = cellText(r, c).trim();
        const m = t.match(/^R?\d{3,4}[EWNS]$/i);
        if (m) { voy = t.toUpperCase(); r = 99; break; }
      }
    }
    const rawSlots = [];
    const seen = new Set();
    for (const m of ws['!merges']) {
      const raw = cellText(m.s.r, m.s.c).trim();
      if (!raw) continue;
      const joined = raw.split(/\n/).map((s) => s.trim()).filter(Boolean).join(' ');
      const cnM = joined.replace(/\s+/g, '').match(/([A-Z]{4})(\d{7})/);
      if (!cnM) continue;
      const cn = cnM[1] + cnM[2];
      const key = `${cn}@${m.s.r}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const isoM = joined.match(ISO_RE);
      const wtM = joined.replace(CN_RE, '').match(/\b(\d{4,6})\b/);
      const flags = [];
      if (/긴급/.test(joined)) flags.push('긴급');
      if (/활어/.test(joined)) flags.push('활어');
      if (/LUG/i.test(joined)) flags.push('LUG');
      rawSlots.push({
        cn,
        wt: wtM ? parseInt(wtM[1], 10) : null,
        iso: isoM ? `${isoM[1]} ${isoM[2]}` : '',
        fe: isoM && isoM[3] ? isoM[3] : 'F',
        r1: m.s.r, c1: m.s.c, c2: m.e.c,
        flags,
      });
    }
    if (!rawSlots.length) continue;
    // 좌표 정규화: colStops = 모든 블록 경계, rowBands = 블록 시작행들
    const stopSet = new Set();
    rawSlots.forEach((s) => { stopSet.add(s.c1); stopSet.add(s.c2 + 1); });
    const colStops = [...stopSet].sort((a, b) => a - b);
    const bandSet = new Set(rawSlots.map((s) => s.r1));
    const rowBands = [...bandSet].sort((a, b) => a - b);
    const slots = rawSlots.map((s) => {
      const ci = colStops.indexOf(s.c1);
      const span = Math.max(1, colStops.indexOf(s.c2 + 1) - ci);
      return { cn: s.cn, wt: s.wt, iso: s.iso, fe: s.fe, ri: rowBands.indexOf(s.r1), ci, span, flags: s.flags };
    });
    decks.push({ deck: deckLetter, name, cols: colStops.length - 1, rows: rowBands.length, slots });
  }
  // 덱 순서: 위(D)→아래(B) 실물 페이지 순 아님 — 알파벳 역순(D,C,B,A)로 위 데크 먼저
  decks.sort((a, b) => (b.deck < a.deck ? -1 : b.deck > a.deck ? 1 : 0));
  return { voy, decks, total: decks.reduce((a, d) => a + d.slots.length, 0) };
}
