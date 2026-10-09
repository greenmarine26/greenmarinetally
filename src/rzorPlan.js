// V9.22: RZOR(RIZHAO ORIENT) 덱 스토우지 플랜 파서 — 선사 rzdf_ship_*.xls
//   시트: A/B/C/D/E-DECK-PTK. 컨테이너 = 병합 블록(여러 줄: 컨번호/무게/규격 "40 HC F"/긴급·활어).
//   실측 검증(R080E): D 75(20×4/40×68/45×3) · C 71 · B 14 = PDF SUB TOTAL과 완전 일치.
//   좌표: colStops/rowBands 정규화 — 화면 CSS grid와 인쇄가 같은 데이터를 쓴다.

/** SheetJS 워크북이 RZOR 덱 플랜인지 — 선사 rzdf(시트 이름 «-DECK») 또는 검수사 STOWAGE PLAN(3.67, 내용으로 판별) */
export function isDeckPlanWorkbook(wb) {
  return (wb?.SheetNames || []).some((n) => /-?DECK/i.test(String(n))) || isCheckerPlanWorkbook(wb);
}

// ── 3.67: 검수사 STOWAGE PLAN 엑셀(마감텔리 PLAN.xlsx 양식) — RZOR **선적** 덱플랜 ─────────────────────
//   실측 R070W~R106W 36항차(2026-07-04~09-28) 같은 양식. 선사 rzdf 는 양하만 오고 선적 덱플랜은 이것뿐이다.
//   · 한 시트에 덱 블록 셋이 세로로: 라벨 «C» «- DECK» · «D» «- DECK» · «UNDER» «- DECK»
//   · 블록마다 머리줄에 위치 번호 26(왼쪽)→1(오른쪽), 세 칸 간격. 오른쪽 끝 열에 줄 번호 1~8
//   · 컨 하나 = 세로 네 줄: 컨번호 / 무게 / 규격 «F40'H»(F·E + 20·40·45 + H·R·D·L) / 섀시 숫자(4·3·2·1)
//   · 40피트는 번호 칸 + 그 왼쪽 옆 칸 «X», 45피트는 «<45>». 옆 칸에 다른 컨이 있으면 표식을 안 적는다
//   · «C/S» = 빈 섀시(컨 아님, 건너뜀) · «L» = 수화물(LUG) 표식
//   좌표 — 검수사 번호 그대로 col = 위치(1~26, **1 이 선수**). 그림 방향은 선사 rzdf 와 같다(왼쪽 선미·오른쪽 선수)
//   → ci = 26 − 위치. 선사 rzdf 와 견줄 때는 «선사 칸 = 25 − 위치»(R106 40피트 D덱 87/94 · C덱 57/60 실측).
//   덱 단(tier)은 rzorPlan DECK_TIER 와 같은 값(U(=선사 B) 84 · C 86 · D 88). decks[].numbering = 'bow' 로 표시한다.
const CHK_CN_RE = /^([A-Z]{4})\s*(\d{7})$/;
const CHK_TYP_RE = /^([FE])\s*(20|40|45)\s*'?\s*([A-Z])?/i;
//  ★ 4.20 (검수사 2026-10-10 00:02 «SAWTBP004는 … 제작컨일것입니다. 대수엔 들어 가지만 규격엔 없습니다» — §7.8-⑦ «7. 1»(건너뛴다)을 뒤집음):
//    비ISO 유닛(제작컨 SAWTBP00N)도 칸이다. 영문으로 시작하는 영숫자 6~11자(숫자 포함) **이고** 그 칸 두 줄 아래에 규격 줄(«F45'H»)이 있을 때만 유닛으로 본다 —
//    시트의 다른 글자(C/S·X·<45>·집계표 머리)를 칸으로 잘못 잡지 않게. 실측 R075W SAWTBP005(무게 24248 · F45'H · 왼쪽 <45>) — 덱 소계 45' 4 · TTL 122 에 이미 세어져 있다.
//    판정은 ISO 6346 꼴이 아니면 제작컨(utils.isMadeUnitCn 과 같은 규칙 — 이 파일은 import 가 없어 번들이 가볍게 실린다). 칸에는 madeUnit·size 를 싣고 규격 글자는 «제작컨» 으로 그린다(rzorPrintModel·콘앱).
const CHK_UNIT_RE = /^(?=[A-Z0-9]*\d)[A-Z][A-Z0-9]{5,10}$/;
function chkUnitOf(txt, r, c) {
  const raw = txt(r, c).replace(/\s+/g, '');
  const cm = raw.match(CHK_CN_RE);
  if (cm) return { cn: cm[1] + cm[2], made: false };
  const u = raw.toUpperCase();
  if (CHK_UNIT_RE.test(u) && CHK_TYP_RE.test(txt(r + 2, c))) return { cn: u, made: true };
  return null;
}
const CHK_TYP_ISO = { H: 'HC', R: 'RH', D: 'GP', G: 'GP', L: 'GP', F: 'FR' };   // F = 플랫(R101W FBIU4020493 «E40'F» 실측 — 2차 시뮬 지적)

/** 검수사 STOWAGE PLAN 양식인지 — 시트 이름이 아니라 내용으로 본다(«STOWAGE PLAN» 제목 + «- DECK» 라벨). XLSX 없이 셀 키만 훑는다. */
export function isCheckerPlanWorkbook(wb) {
  for (const name of (wb?.SheetNames || [])) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    let title = false, deck = false;
    for (const k of Object.keys(ws)) {
      if (k[0] === '!') continue;
      const v = ws[k] && ws[k].v != null ? String(ws[k].v) : '';
      if (!title && /STOWAGE\s*PLAN/i.test(v)) title = true;
      else if (!deck && /^-\s*DECK$/i.test(v.trim())) deck = true;
      if (title && deck) return true;
    }
  }
  return false;
}

/** 4.04-05: 검수사 STOWAGE PLAN 맨 아래 «CHASSIS» 표(C-DECK·D-DECK·U-DECK 줄의 20'·40' 칸) — 마감텔리가 샤시 코드로 센 값이다.
 *  컨 대수에서 거꾸로 못 센다(크레인 LO/LO 는 샤시가 없고 빈 섀시 C/S 는 컨이 아니다). 실물 37항차 중 추정이 맞은 것은 8개뿐이었다.
 *  머리(CHASSIS · 20' · 40')를 찾아 그 칸 아래의 «C-DECK»·«D-DECK»·«U-DECK» 줄에서 읽는다. 못 읽으면 null(출력은 추정으로). */
function readCheckerChassis(ws, XLSX) {
  try {
    const rg = XLSX.utils.decode_range(ws['!ref']);
    const g = (r, c) => { const x = ws[XLSX.utils.encode_cell({ r, c })]; return x && x.v != null ? x.v : null; };
    //  숫자 칸만 — 오류 셀(#N/A 등)은 SheetJS 가 오류 코드 숫자를 v 에 담으므로 t 가 'n' 인지 같이 본다(수집기 파이썬은 오류 셀을 문자열로 읽어 null 이다).
    const num = (r, c) => { const x = ws[XLSX.utils.encode_cell({ r, c })]; return x && x.t === 'n' && typeof x.v === 'number' && Number.isFinite(x.v) ? x.v : null; };
    for (let r = rg.s.r; r <= rg.e.r; r++) for (let c = rg.s.c; c <= rg.e.c; c++) {
      if (String(g(r, c) ?? '').trim().toUpperCase() !== 'CHASSIS') continue;
      let c20 = -1, c40 = -1;
      for (let k = 1; k <= 8; k++) { const t = String(g(r, c + k) ?? '').trim(); if (t === "20'") c20 = c + k; else if (t === "40'") c40 = c + k; }
      if (c20 < 0 || c40 < 0) continue;
      const out = {};
      for (let rr = r + 1; rr <= r + 6; rr++) {
        const m = String(g(rr, c) ?? '').trim().toUpperCase().match(/^([CDU])-DECK$/);
        const a = num(rr, c20), b = num(rr, c40);
        if (m && a != null && b != null) out[m[1]] = [a, b];
      }
      if (Object.keys(out).length) return out;
    }
  } catch { /* 표를 못 읽으면 추정으로 */ }
  return null;
}

/** 검수사 STOWAGE PLAN 워크북 → parseDeckPlanWorkbook 과 같은 모양 {voy, decks, total, lolo, dbl} */
export function parseCheckerPlanWorkbook(wb, XLSX) {
  const decks = [];
  let voy = '';
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws || !ws['!ref']) continue;
    const rg = XLSX.utils.decode_range(ws['!ref']);
    const val = (r, c) => { const cell = ws[XLSX.utils.encode_cell({ r, c })]; return cell && cell.v != null ? cell.v : null; };
    const txt = (r, c) => { const v = val(r, c); return v == null ? '' : String(v).trim(); };
    // 덱 라벨 행: «C»·«D»·«UNDER» 가 «- DECK» 왼쪽 몇 칸 안에(병합 셀이라 최대 8칸)
    const labels = [];
    for (let r = rg.s.r; r <= rg.e.r; r++) {
      for (let c = rg.s.c; c <= rg.e.c; c++) {
        if (!/^-\s*DECK$/i.test(txt(r, c))) continue;
        let lab = '';
        for (let k = 1; k <= 8 && c - k >= rg.s.c; k++) { const t = txt(r, c - k); if (t) { lab = t; break; } }
        const m = lab.match(/^(UNDER|[A-E])$/i);
        if (m) labels.push({ r, deck: /^UNDER$/i.test(m[1]) ? 'U' : m[1].toUpperCase() });
        if (!voy) {
          for (let rr = Math.max(rg.s.r, r - 2); rr <= r + 4 && !voy; rr++) for (let cc = rg.s.c; cc <= rg.e.c; cc++) {
            const mv = txt(rr, cc).match(/Voy\.?\s*No\.?\s*:?\s*([A-Z]?\d{3,4}[EWNS])/i);
            if (mv) { voy = mv[1].toUpperCase(); break; }
          }
        }
      }
    }
    if (!labels.length) continue;
    const chas = readCheckerChassis(ws, XLSX);   // 4.04-05: 시트 자신의 샤시표 — 출력 CHASSIS 상자가 이 값을 그대로 쓴다
    labels.sort((a, b) => a.r - b.r);
    for (let li = 0; li < labels.length; li++) {
      const { r: lr, deck } = labels[li];
      const rEnd = li + 1 < labels.length ? labels[li + 1].r - 1 : rg.e.r;
      // 머리줄: 위치 번호 1~26 이 20개 넘게 있는 첫 행
      let hr = -1; const colPos = new Map();
      for (let r = lr; r <= Math.min(rEnd, lr + 12); r++) {
        const m = new Map();
        for (let c = rg.s.c; c <= rg.e.c; c++) { const v = val(r, c); if (typeof v === 'number' && v >= 1 && v <= 26 && Number.isInteger(v)) m.set(c, v); }
        if (m.size >= 20) { hr = r; for (const [c, p] of m) colPos.set(c, p); break; }
      }
      if (hr < 0) continue;
      const posCol = new Map([...colPos].map(([c, p]) => [p, c]));
      const nPos = Math.max(...colPos.values());
      const lastCol = Math.max(...colPos.keys());
      const slots = [];
      let bandIdx = 0;
      for (let r = hr + 1; r <= rEnd; r++) {
        let hasCn = false;
        for (const c of colPos.keys()) if (chkUnitOf(txt, r, c)) { hasCn = true; break; }   // 4.20: 제작컨 칸만 있는 줄도 줄이다
        if (!hasCn) continue;
        bandIdx += 1;
        // 줄 번호: 마지막 위치 칸 오른쪽에 적힌 정수(1~8) — 없으면 밴드 순번
        let line = 0;
        for (let c = lastCol + 1; c <= Math.min(rg.e.c, lastCol + 4); c++) { const v = val(r, c); if (typeof v === 'number' && v >= 1 && v <= 12) { line = v; break; } }
        if (!line) line = bandIdx;
        for (const [c, pos] of colPos) {
          const unit = chkUnitOf(txt, r, c);   // 4.20: 실컨번호 또는 제작컨(비ISO 유닛)
          if (!unit) continue;
          const cn = unit.cn;
          const wtv = val(r + 1, c);
          const typ = txt(r + 2, c);
          const tm = typ.match(CHK_TYP_RE);
          const fe = tm ? tm[1].toUpperCase() : 'F';
          const sz = tm ? tm[2] : '';
          const k = tm && tm[3] ? tm[3].toUpperCase() : '';
          const iso = sz ? `${sz} ${CHK_TYP_ISO[k] || 'GP'}` : '';
          const flags = [];
          if (k === 'L') flags.push('LUG');
          // 그림은 시트 그대로 — 옆 칸(위치+1, 왼쪽)에 X·<45> 가 있을 때만 두 칸(span 2)
          const nc = posCol.get(pos + 1);
          const mark = nc != null ? txt(r, nc) : '';
          const marked = /^X$/i.test(mark) || /<\s*45\s*>/.test(mark);
          const span = marked ? 2 : 1;
          const ci = nPos - pos - (span - 1);
          // 크레인(LO/LO) 구역 — 선사 rzdf 25항차의 초록(落地) 칸은 전부 D덱 10~15칸(검수사 번호). 검수사 양식엔 표식이
          //   없어 자리로 정한다. R106W 실측 D덱 10~15칸 45대 = 동방 3호기(LO/LO) 45대 = 터미널 베이 22 와 컨번호까지 같음.
          const lolo = deck === 'D' && pos >= 10 && pos <= 15;
          const chv = val(r + 3, c);   // 크기 코드 4=40'·3=20' 단독·2/1=20' 트윈(한 섀시에 둘) — 내보내기가 그대로 되돌린다
          slots.push({ cn, wt: typeof wtv === 'number' ? Math.round(wtv) : null, iso, fe,
                       ri: line - 1, ci: Math.max(0, ci), span, flags, empty: false,
                       lolo, dbl: false,
                       line, col: pos, tier: DECK_TIER[deck === 'U' ? 'B' : deck] || '',
                       row: String(line).padStart(2, '0'), bay: String(pos).padStart(2, '0'),
                       pos: `${deck}덱 ${line}줄 ${pos}칸`,
                       key: `${deck}-${line}-${pos}`,   // 한 키 = 한 자리(덱-줄-위치). ri·ci 는 그림 좌표라 40피트 두 칸과 옆 칸이 겹친다
                       chassis: typeof chv === 'number' ? chv : null,
                       ...(unit.made ? { madeUnit: true, size: Number(sz) || (/<\s*45\s*>/.test(mark) ? 45 : null) } : {}) });   // 4.20: 제작컨 — 크기는 규격 줄(F45'H)·<45> 표식, 규격 코드는 없다
        }
      }
      if (!slots.length) continue;
      const lines = Math.max(...slots.map((s) => s.line));
      decks.push({ deck, name: `${deck === 'U' ? 'UNDER' : deck}-DECK`, cols: nPos, rows: lines, slots,
                   tier: DECK_TIER[deck === 'U' ? 'B' : deck] || '', lines, colsN: nPos,
                   lolo: slots.filter((x) => x.lolo).length, dbl: 0,
                   ...(chas && chas[deck] ? { capacity: chas[deck] } : {}),   // 4.04-05: [20' 샤시, 40' 샤시]
                   numbering: 'bow' });   // 위치 1 = 선수(검수사 양식). 선사 rzdf 는 1 = 선미
    }
  }
  const _ord = { D: 0, C: 1, U: 2 };   // 첫 탭은 D덱(크레인 구역) — 생성 플랜과 같은 순서(감사 지적: 종전 정렬은 UNDER 가 첫 탭)
  decks.sort((a, b) => ((_ord[a.deck] ?? 9) - (_ord[b.deck] ?? 9)) || (a.deck < b.deck ? -1 : 1));
  return { voy, decks,
           total: decks.reduce((a, d) => a + d.slots.filter((s) => !s.empty).length, 0),
           lolo: decks.reduce((a, d) => a + (d.lolo || 0), 0),
           dbl: 0, _fmt: 'checker' };
}

// V9.54(2026-08-03): 덱플랜을 **좌표로** 읽는다 — 도면 실측(R082E 2甲/3甲/4甲.PDF)으로 축 확정.
//   · 도면 오른쪽 = 선수(양 모서리 사선) · 왼쪽 = 선미(B덱 도면에 RAMP)
//   · D덱 도면 오른쪽에 줄 번호 1~8 이 인쇄돼 있다(위=1, 아래=8)
//   · 선수가 오른쪽 → 위쪽이 좌현. 이 배는 항상 좌현 접안이라 **줄 1이 부두 쪽**.
//   → line = 좌현1→우현N · col = 선미1→선수N · 덱 = 티어. 표기는 "D덱 3줄 5칸".
//   수집기 collector/deckplan.py 와 **같은 규칙**이어야 한다(두 벌이 어긋나면 화면과 DB가 갈린다).
const DECK_TIER = { A: '82', B: '84', C: '86', D: '88', E: '90' };

// V9.55(2026-08-03): 셀 색이 **작업 방식**을 말한다 — 선사 메일 제목이 범례다.
//   "黄色为双背（2），绿色为落地（40）" = 노랑 双背(2단 적재) · 초록 落地(갑판 직접 적재).
//   落地 = 섀시에서 내려 갑판에 얹는 것 = **갠트리(LO/LO) 작업분**.
//   실측(R082E D덱): 초록 40 = 도면 "( + 40 )" = 선사 연락 "인바운드 갠트리 40van",
//   나머지 62 = 도면 CAPACITY 62(섀시·RO/RO). 40+62 = CONT 102 ✔
//   검수사가 크레인으로 검수하는 건 초록 분이다 — 색을 버리면 그걸 못 가린다.
const FILL_LOLO = 'FF92D050';   // 초록 — 落地 = 갠트리
const FILL_DBL = 'FFFFFF00';    // 노랑 — 双背 = 2단

function fillKind(ws, XLSX, r, c) {
  try {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    const rgb = cell && cell.s && cell.s.fgColor && cell.s.fgColor.rgb;
    if (!rgb) return '';
    const up = String(rgb).toUpperCase();
    if (up === FILL_LOLO || up === FILL_LOLO.slice(2)) return 'lolo';
    if (up === FILL_DBL || up === FILL_DBL.slice(2)) return 'dbl';
  } catch { /* 색을 못 읽으면 표시 없음으로 */ }
  return '';
}

const CN_RE = /([A-Z]{4})\s*(\d{7})/;
const ISO_RE = /(20|40|45)\s*(GP|HC|RH|RF|HA|OT|FR|TK|DC)\s*([FE])?/;

/** SheetJS 워크북 → {voy, decks:[{deck,name,cols,rows,slots:[{cn,wt,iso,fe,ri,ci,span,flags}]}]} */
/** 4.04: 선사 덱 시트 머리의 «CAPACITY» 두 칸(샤시 20'·40' 대수) — 선사가 샤시 코드로 센 값이라 컨 대수에서 거꾸로 못 센다(LOLO 는 샤시가 없고 트윈 20피트 둘은 40피트 샤시 하나). 있는 그대로 둔다 — 출력이 선사 종이와 같게. 못 찾으면 null(출력이 추정으로 채운다). */
function readCapacity(ws, XLSX) {
  try {
    for (let r = 0; r < 16; r++) for (let c = 0; c < 80; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!(cell && typeof cell.v === 'string' && cell.v.trim().toUpperCase() === 'CAPACITY')) continue;
      const nums = [];
      for (let cc = c + 1; cc <= c + 16 && nums.length < 2; cc++) {
        const x = ws[XLSX.utils.encode_cell({ r, c: cc })];
        if (x && x.v !== '' && x.v != null && Number.isFinite(Number(x.v))) nums.push(Number(x.v));
      }
      return nums.length === 2 ? nums : null;
    }
  } catch { /* 머리를 못 읽으면 추정으로 */ }
  return null;
}

export function parseDeckPlanWorkbook(wb, XLSX) {
  if (isCheckerPlanWorkbook(wb)) return parseCheckerPlanWorkbook(wb, XLSX);   // 3.67: 검수사 STOWAGE PLAN(선적)
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
      const rawLines = raw.split(/\n/).map((s) => s.trim()).filter(Boolean);
      const joined = rawLines.join(' ');
      //  4.04: 컨 번호는 첫 줄에서만 찾는다 — 줄을 이어 붙여 찾으면 번호가 9자인 칸(SAWTBP007 / 24258 / 45 HC F)에서 중량 앞자리가 붙어 가짜 번호(WTBP0072425)가 생겼다.
      //        첫 줄이 컨 번호 모양이 아니면(영숫자 6~10자) 그 글자를 그대로 칸 번호로 둔다 — 선사 집계에는 그 칸도 세어져 있어 버리면 합계가 어긋난다.
      const head = (rawLines[0] || '').replace(/\s+/g, '').toUpperCase();
      const cnM = head.match(/([A-Z]{4})(\d{7})/);
      let cn = '';
      if (cnM) cn = cnM[1] + cnM[2];
      else if (/^[A-Z0-9]{6,10}$/.test(head) && /[A-Z]/.test(head) && /\d/.test(head)) cn = head;
      else { const jm = joined.replace(/\s+/g, '').match(/([A-Z]{4})(\d{7})/); if (jm) cn = jm[1] + jm[2]; }
      if (!cn) continue;
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
        kind: fillKind(ws, XLSX, m.s.r, m.s.c),   // V9.55: lolo(갠트리) / dbl(2단)
        wt: wtM ? parseInt(wtM[1], 10) : null,
        iso: isoM ? `${isoM[1]} ${isoM[2]}` : '',
        fe: isoM && isoM[3] ? isoM[3] : 'F',
        r1: m.s.r, c1: m.s.c, c2: m.e.c,
        flags,
      });
    }
    if (!rawSlots.length) continue;
    // V9.22-02: 빈자리(선적 지정용) — 데이터 구역 내 글자 없는 병합. 회색 solid 채움은 적재불가 구역으로 제외.
    //   실측(R080E D덱): 빈 101(none/흰색) + 회색 1(불가). 스타일 정보 없으면 빈자리로 간주(안전측).
    const rMin = Math.min(...rawSlots.map((s) => s.r1));
    const rMax = Math.max(...rawSlots.map((s) => s.r1)) + 6;
    for (const m of ws['!merges']) {
      const raw = cellText(m.s.r, m.s.c).trim();
      if (raw) continue;
      if (m.s.r < rMin || m.s.r > rMax) continue;
      if ((m.e.r - m.s.r) < 3) continue;
      const cell = ws[XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c })];
      const rgb = cell && cell.s && cell.s.fgColor && (cell.s.fgColor.rgb || '');
      if (rgb && !/^F{2}?FFFFFF$/i.test(String(rgb)) && String(rgb).toUpperCase() !== 'FFFFFF') continue;   // 회색 등 = 불가
      rawSlots.push({ cn: '', kind: '', wt: null, iso: '', fe: '', r1: m.s.r, c1: m.s.c, c2: m.e.c, flags: [], empty: true });
    }
    // 좌표 정규화: colStops = 모든 블록 경계, rowBands = 블록 시작행들
    const stopSet = new Set();
    rawSlots.forEach((s) => { stopSet.add(s.c1); stopSet.add(s.c2 + 1); });
    const colStops = [...stopSet].sort((a, b) => a - b);
    const bandSet = new Set(rawSlots.map((s) => s.r1));
    const rowBands = [...bandSet].sort((a, b) => a - b);
    // V9.54: 줄·칸 번호 — 블록 시작 좌표 순번(폭은 덱마다 달라 쓸 수 없다)
    const colStarts = [...new Set(rawSlots.map((s) => s.c1))].sort((a, b) => a - b);
    const lineOf = (r1) => rowBands.indexOf(r1) + 1;
    const colOf = (c1) => colStarts.indexOf(c1) + 1;
    const tier = DECK_TIER[String(deckLetter).toUpperCase()] || '';
    const slots = rawSlots.map((s) => {
      const ci = colStops.indexOf(s.c1);
      const span = Math.max(1, colStops.indexOf(s.c2 + 1) - ci);
      // 빈자리는 colStops에 정확한 경계가 없을 수 있음 — 가장 가까운 스톱으로
      const ci2 = ci >= 0 ? ci : Math.max(0, colStops.findIndex((x) => x > s.c1) - 1);
      const end = colStops.indexOf(s.c2 + 1);
      const span2 = end >= 0 ? Math.max(1, end - ci2) : Math.max(1, span);
      const ln = lineOf(s.r1), cl = colOf(s.c1);
      return { cn: s.cn, wt: s.wt, iso: s.iso, fe: s.fe, ri: rowBands.indexOf(s.r1), ci: ci2, span: span2, flags: s.flags, empty: !!s.empty,
               lolo: s.kind === 'lolo', dbl: s.kind === 'dbl',   // V9.55
               // V9.54: 자리 좌표 — 화면 표기는 "D덱 3줄 5칸"
               line: ln, col: cl, tier,
               row: ln ? String(ln).padStart(2, '0') : '',
               bay: cl ? String(cl).padStart(2, '0') : '',
               pos: (ln && cl) ? `${deckLetter}덱 ${ln}줄 ${cl}칸` : '' };
    }).filter((s) => s.ri >= 0 && s.ci >= 0);
    const capacity = readCapacity(ws, XLSX);
    decks.push({ deck: deckLetter, name, cols: colStops.length - 1, rows: rowBands.length, slots,
                 tier, lines: rowBands.length, colsN: colStarts.length,
                 lolo: slots.filter((x) => x.lolo).length, dbl: slots.filter((x) => x.dbl).length,
                 ...(capacity ? { capacity } : {}) });
  }
  // 덱 순서: 위(D)→아래(B) 실물 페이지 순 아님 — 알파벳 역순(D,C,B,A)로 위 데크 먼저
  decks.sort((a, b) => (b.deck < a.deck ? -1 : b.deck > a.deck ? 1 : 0));
  return { voy, decks,
           total: decks.reduce((a, d) => a + d.slots.filter((s) => !s.empty).length, 0),
           lolo: decks.reduce((a, d) => a + (d.lolo || 0), 0),
           dbl: decks.reduce((a, d) => a + (d.dbl || 0), 0) };
}

/** 4.04-01: 덱플랜 칸 좌표 «덱_줄_칸» — 선내위치를 C_8_21 · D_5_04 로 쓴다(줄은 그대로, 칸은 두 자리). 덱플랜 그림 축의 줄·칸 숫자와 같은 값이다.
 *   RZOR 은 베이 좌표가 없어 EDI 에서 위치를 못 얻는다 — 위치는 선사 덱플랜 칸(덱·줄·칸)에만 있다(검수사 2026-10-05 «덱플랜에 좌표가 보입니다. 그대로 넣어 주시면 될듯합니다»). */
export function deckCoordCode(deck, line, col) {
  const d = String(deck || '').trim().toUpperCase();
  const l = Number(line), c = Number(col);
  if (!/^[A-Z]$/.test(d) || !Number.isInteger(l) || l < 1 || !Number.isInteger(c) || c < 1) return '';
  return `${d}_${l}_${String(c).padStart(2, '0')}`;
}

/** 덱플랜 → {컨번호: «덱_줄_칸»}. 빈 칸·컨번호 없는 칸은 건너뛴다. 저장된 옛 플랜에 line·col 이 없으면 «D덱 3줄 5칸» 글자(pos)에서 읽는다. */
export function deckCoordMap(plan) {
  const m = new Map();
  const list = (x) => (Array.isArray(x) ? x : (x && typeof x === 'object' ? Object.values(x) : []));   // 보관소가 빈 칸 있는 배열을 {키:값} 으로 돌려줄 때도 읽는다
  for (const dk of list(plan && plan.decks)) {
    for (const s of (dk ? list(dk.slots) : [])) {
      if (!s || s.empty || !s.cn || m.has(s.cn)) continue;
      let code = deckCoordCode(dk.deck, s.line, s.col);
      if (!code && s.pos) {
        const pm = String(s.pos).match(/^([A-Z])덱\s*(\d+)줄\s*(\d+)칸$/);
        if (pm) code = deckCoordCode(pm[1], pm[2], pm[3]);
      }
      if (code) m.set(s.cn, code);
    }
  }
  return m;
}

/** 4.04-02: 컨 목록에 «덱_줄_칸» 좌표(deckPos)를 붙여 돌려준다 — 목록을 만드는 모든 길(항차 화면 · 검색 패널 · 홈 통합검색 · 미르 · 콘앱)이 이 한 벌을 부른다.
 *   덱플랜에 없는 컨은 건드리지 않는다(종전 표기 그대로). 붙은 게 하나도 없으면 같은 배열을 돌려준다.
 *   검수사 2026-10-05 «미르 답, 통계 탭, CSV, 검색 목록은 아직 다른 표기입니다 … 같은 좌표로 맞출까요?» «네 맞춰주세요». */
export function withDeckPos(list, plan) {
  if (!Array.isArray(list) || !list.length) return list;
  const m = deckCoordMap(plan);
  if (!m.size) return list;
  let hit = false;
  const out = list.map((c) => {
    const k = c && c.cn ? m.get(c.cn) : '';
    if (!k || c.deckPos === k) return c;
    hit = true;
    return { ...c, deckPos: k };
  });
  return hit ? out : list;
}
