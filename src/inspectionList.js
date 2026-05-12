// M5.26: 검수 리스트 (M3.86에서 작업했던 inspectionList.js 복구)
// 양식 명세 (메모리):
//   - A4 세로, 여백 상하좌우 0.4cm
//   - 좌우 2단, 페이지당 140대 (단당 70줄)
//   - 컬럼: 순번/컨번호/실번호/규격/F/E/비고
//   - 정렬: 20풀 → 20엠티 → 20특수 → 40풀 → 40엠티 → 40특수
//   - 색상: 풀=흰색 / 엠티=#e5e5e5 / 리퍼=#cce6ff / FR=#d4edda / OT=#fff3cd / TK=#ffe5d0
//   - 시트1=전체, 시트2=특수화물 별첨

import { openPrintWindow } from './printHelper.js';
const COLOR = {
  full: '#ffffff',
  empty: '#e5e5e5',
  reefer: '#cce6ff',
  fr: '#d4edda',
  ot: '#fff3cd',
  tk: '#ffe5d0',
};

// 컨테이너 타입 판별 (ISO 6346 표준)
//   ISO 4글자 코드: [크기][높이][종류1][종류2]
//   예: 22G1 = 20' 일반 GP, 42G1 = 40' 일반, 22R1 = 20' 리퍼, 45R1 = 45' 리퍼
//        42PF = 40' 플랫폼(FR), 22UT = 20' Open Top, 22T0 = 20' Tank
//   첫 자리 = 길이: 1/2=20', 3=30', 4=40', 9=45'(40ft 슬롯)
//   셋째 자리 = 종류: G=GP(일반) / R=리퍼 / P=Platform(FR) / U=OT / T=Tank / B=Bulk / S=Special
// ⚠️ M5.28 fix: iso.includes('P')는 GP의 P까지 잡아서 22GP/42GP 일반 컨테이너를 FR로 오분류함
// M5.59: 선사 매핑 통일 (voucher와 동일) — LIST/BL/EDI 코드 → voucher 약어
const CARRIER_MAP = {
  'DJSC': 'DJS', 'NSSL': 'NSL', 'HASL': 'HAS', 'SNKO': 'SKR',
  'HSLI': 'HSL', 'JEON': 'HSL',
  // M5.633 추가
  'DWIC': 'DWS', 'EAS': 'EASK', 'TJM': 'TJMS', 'WDF': 'WDFC', 'SCLK': 'SIT',
};
function normalizeCarrier(c) {
  // 1순위: c.op (EDI NAD+CA 또는 LIST 선사부호 컬럼)
  if (c.op) {
    const op = String(c.op).toUpperCase().trim();
    if (CARRIER_MAP[op]) return CARRIER_MAP[op];
    if (op) return op;
  }
  // 2순위: BL 번호 prefix (4자)
  if (c.bl && c.bl.length >= 4) {
    const blp = String(c.bl).slice(0, 4).toUpperCase();
    if (CARRIER_MAP[blp]) return CARRIER_MAP[blp];
  }
  // 폴백: cn prefix (owner code)
  if (c.cn && c.cn.length >= 4) return c.cn.slice(0, 4).toUpperCase();
  return '?';
}


function getContainerCategory(c) {
  const iso = String(c.iso || '').toUpperCase().trim();
  const first = iso[0] || '';
  const third = iso[2] || '';

  // 길이: 첫 자리 기준 (4/9 = 40ft 슬롯, 1/2 = 20ft)
  let len = 20;
  if (first === '4' || first === '9') len = 40;
  else if (first === '1' || first === '2') len = 20;
  else if (c.cn && /^[A-Z]{4}\d{7}$/.test(c.cn)) {
    // ISO 없으면 cn 끝자리로 추정 (옛 호환)
    len = parseInt(c.cn[10]) >= 4 ? 40 : 20;
  }

  // 종류: ISO 셋째 글자 기준 (정확한 ISO 6346)
  let type = 'normal';  // G(GP) = 일반
  if (third === 'R') type = 'reefer';
  else if (third === 'P') type = 'fr';        // Platform/Flat Rack
  else if (third === 'U') type = 'ot';        // Open Top
  else if (third === 'T') type = 'tk';        // Tank
  // G/B/S 또는 빈값 = normal (일반 처리)

  // 리퍼 우선 판별 (EDI에 리퍼 플래그 있으면 ISO와 무관하게 reefer)
  if (c.reefer === true || c.temp != null) type = 'reefer';

  const fe = String(c.fe || '').toUpperCase() === 'F' ? 'F' : 'E';
  return { len, type, fe };
}

function getSortKey(c) {
  const { len, type, fe } = getContainerCategory(c);
  // M5.52: 선사별 정렬 (1차 키) + 기존 사이즈/F-E (2차 키)
  const line = normalizeCarrier(c);
  // 20풀(0) → 20엠티(1) → 20특수(2) → 40풀(3) → 40엠티(4) → 40특수(5)
  const sizeGroup = len === 20 ? 0 : 3;
  const typeOrder = type === 'normal' ? (fe === 'F' ? 0 : 1) : 2;
  return { line, secondary: sizeGroup + typeOrder };
}

function getRowColor(c) {
  const { type, fe } = getContainerCategory(c);
  if (type === 'reefer') return COLOR.reefer;
  if (type === 'fr') return COLOR.fr;
  if (type === 'ot') return COLOR.ot;
  if (type === 'tk') return COLOR.tk;
  return fe === 'E' ? COLOR.empty : COLOR.full;
}

// 단일 줄 HTML
function renderRow(c, idx) {
  const bg = getRowColor(c);
  const { len, type } = getContainerCategory(c);
  const spec = `${len}${type === 'normal' ? '' : type === 'reefer' ? 'R' : type === 'fr' ? 'F' : type === 'ot' ? 'O' : 'T'}`;
  const fe = (c.fe || '').toUpperCase() === 'F' ? 'F' : 'E';
  const sl = (c.sl || '').slice(0, 10);  // M5.52: 12→10자 (선사 칸 공간 확보)
  const cn = c.cn || '';
  // M5.52: 선사 (c.op = EDI NAD+CA 또는 리스트 carrier 컬럼) 우선, 폴백 cn prefix(owner code)
  const line = normalizeCarrier(c).slice(0, 5);
  // 비고: X-RAY ★ + 리퍼 온도 + 기타 표시
  const notes = [];
  if (c._xray) notes.push('<span style="color:#dc2626;font-weight:bold">★XRAY</span>');
  if (type === 'reefer' && c.temp != null) notes.push(`${c.temp}°C`);
  if (type === 'fr') notes.push('FR');
  if (type === 'ot') notes.push('OT');
  if (type === 'tk') notes.push('TK');
  const note = notes.join(' ');
  return `<tr style="background:${bg}">
    <td>${idx}</td>
    <td class="cn">${cn}</td>
    <td>${sl}</td>
    <td>${spec}</td>
    <td>${fe === 'F' ? 'F' : ''}</td>
    <td>${fe === 'E' ? 'E' : ''}</td>
    <td>${note}</td>
    <td class="line">${line}</td>
  </tr>`;
}

// 한 페이지 (좌 75 + 우 75 = 150대) HTML
// M5.28: 페이지당 150대 명시 (좌 75 + 우 75)
//   예: 155대 → 2페이지 (1페이지 150 + 2페이지 5)
//   마지막 페이지에 5개만 있으면 좌 5 + 우 0 (좌측부터 순서대로 채움)
const PER_COL = 75;
const PER_PAGE = PER_COL * 2;  // 150

function renderPage(rows, pageNum, totalPages) {
  const left = rows.slice(0, PER_COL);
  const right = rows.slice(PER_COL);

  const renderColumn = (rs) => `<table class="ilist">
    <colgroup><col style="width:4%"><col style="width:20%"><col style="width:16%"><col style="width:7%"><col style="width:5%"><col style="width:5%"><col style="width:31%"><col style="width:12%"></colgroup><thead><tr><th>#</th><th>컨번호</th><th>실번호</th><th>규격</th><th>F</th><th>E</th><th>비고</th><th>선사</th></tr></thead>
    <tbody>${rs.join('')}</tbody>
  </table>`;

  return `<div class="ipage">
    <div class="ihdr"><span>${pageNum}/${totalPages}</span></div>
    <div class="icols">
      <div class="icol">${renderColumn(left)}</div>
      <div class="icol">${renderColumn(right)}</div>
    </div>
  </div>`;
}

// 메인: 검수 리스트 HTML 생성
export function generateInspectionListHTML(containers, mode, voyageInfo) {
  const list = Array.isArray(containers) ? [...containers] : Object.values(containers || {});
  if (list.length === 0) return '<p>컨테이너 없음</p>';

  // M5.52: 선사별 정렬 (1차) → 사이즈/F-E (2차) → 컨번호 (3차)
  list.sort((a, b) => {
    const ka = getSortKey(a), kb = getSortKey(b);
    if (ka.line !== kb.line) return ka.line.localeCompare(kb.line);
    if (ka.secondary !== kb.secondary) return ka.secondary - kb.secondary;
    return (a.cn || '').localeCompare(b.cn || '');
  });

  // M5.52: 선사별로 순번 1부터 재시작
  let lineIdxMap = {};
  list.forEach(c => {
    const line = normalizeCarrier(c);
    lineIdxMap[line] = (lineIdxMap[line] || 0) + 1;
    c._lineIdx = lineIdxMap[line];
  });

  // 시트1: 전체 (페이지당 150대씩 — 좌 75 + 우 75)
  const allPages = [];
  for (let i = 0; i < list.length; i += PER_PAGE) {
    const chunk = list.slice(i, i + PER_PAGE);
    const rows = chunk.map(c => renderRow(c, c._lineIdx));  // 전체 idx 대신 선사별 idx
    allPages.push(rows);
  }
  // sheet1Pages는 아래 renderPageWithHdr로 계산 (헤더 포함)

  // 시트2 대상 필터: 리퍼/FR/OT/TK + X-RAY 대상 일반 화물
  const special = list.filter(c => {
    const { type } = getContainerCategory(c);
    return type !== 'normal' || c._xray;
  });

  let sheet2Html = special.length > 0 ? 'PENDING' : '';  // 아래에서 헤더 있는 버전으로 생성

  const modeKo = mode === 'discharge' ? '양하' : '선적';
  const vsl = voyageInfo?.vsl || '';
  const voy = voyageInfo?.voy || voyageInfo?.voy_l || voyageInfo?.voy_d || '';
  // 날짜: 2026.05.11 형식
  const d = new Date();
  const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

  // M5.29: 각 페이지 상단 헤더 (좌: 선박명 / 중: 항차 / 우: 날짜+페이지) — cover page 제거
  // 페이지 헤더 렌더링을 위해 renderPage에 정보 전달 필요 → 메인 함수에서 직접 조립
  const renderPageWithHdr = (rows, pageNum, totalPages) => {
    const left = rows.slice(0, 75);
    const right = rows.slice(75);
    const col = (rs) => `<table class="ilist">
      <colgroup><col style="width:4%"><col style="width:20%"><col style="width:16%"><col style="width:7%"><col style="width:5%"><col style="width:5%"><col style="width:31%"><col style="width:12%"></colgroup><thead><tr><th>#</th><th>컨번호</th><th>실번호</th><th>규격</th><th>F</th><th>E</th><th>비고</th><th>선사</th></tr></thead>
      <tbody>${rs.join('')}</tbody>
    </table>`;
    return `<div class="ipage">
      <div class="phdr">
        <div class="phdr-l">${vsl}</div>
        <div class="phdr-c">${voy} <span class="modetag">${modeKo}</span></div>
        <div class="phdr-r">${dateStr} · ${pageNum}/${totalPages}</div>
      </div>
      <div class="icols">
        <div class="icol">${col(left)}</div>
        <div class="icol">${col(right)}</div>
      </div>
    </div>`;
  };

  const sheet1Pages = allPages.map((rows, i) => renderPageWithHdr(rows, i + 1, allPages.length)).join('');

  // 시트2 페이지도 헤더 포함 (전체 페이지 수는 시트1+시트2 합산하여 표기 가능하나, 별첨이라 별도 카운트)
  if (sheet2Html) {
    const sheet2PagesList = [];
    for (let i = 0; i < special.length; i += PER_PAGE) {
      const chunk = special.slice(i, i + PER_PAGE);
      const rows = chunk.map((c, j) => renderRow(c, i + j + 1));
      sheet2PagesList.push(rows);
    }
    sheet2Html = `<div class="ititle">[별첨] 특수화물·X-RAY (${special.length}대)</div>` +
      sheet2PagesList.map((rows, i) => renderPageWithHdr(rows, i + 1, sheet2PagesList.length)).join('');
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>검수 리스트 ${modeKo} - ${vsl} ${voy}</title>
<style>
@page { size: A4 portrait; margin: 0.4cm; }
body { font-family: 'Malgun Gothic', sans-serif; margin: 0; padding: 0; color: #000; font-size: 9pt; }
.actions { position: sticky; top: 0; background: #1e293b; padding: 8px; display: flex; gap: 8px; z-index: 100; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
.actions button { flex: 1; padding: 10px; font-size: 14px; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; }
.btn-print { background: #0369a1; color: white; }
.btn-print:hover { background: #075985; }
.content { padding: 4mm; }
/* M5.30: 페이지 헤더 컴팩트화 — 75행 보장 위해 padding 최소화 */
.phdr { display: flex; align-items: center; padding: 0.5mm 2mm; border-bottom: 1pt solid #333; margin-bottom: 1mm; font-size: 8.5pt; }
.phdr-l { flex: 1; font-weight: bold; font-size: 10pt; text-align: left; }
.phdr-c { flex: 1; font-weight: bold; font-size: 9pt; text-align: center; }
.phdr-r { flex: 1; text-align: right; font-size: 8pt; color: #555; }
.modetag { background: #fde68a; padding: 0px 5px; border-radius: 2px; font-size: 7.5pt; margin-left: 3px; }
.ititle { font-weight: bold; text-align: center; padding: 4px 0; font-size: 10pt; page-break-before: always; }
.ipage { page-break-after: always; }
.ipage:last-child { page-break-after: auto; }
.icols { display: flex; gap: 1.5mm; }
.icol { flex: 1; min-width: 0; }
/* M5.30: 행 컴팩트 — 75행/단 보장 (이전 7.5pt + 1px padding으로 72행만 들어감) */
table.ilist { width: 100%; border-collapse: collapse; font-size: 7pt; }
table.ilist th, table.ilist td { border: 0.5pt solid #333; padding: 0 1px; text-align: center; line-height: 1.0; height: 3.4mm; }
table.ilist th { background: #ddd; font-size: 6.5pt; font-weight: bold; height: 3.2mm; }
table.ilist td.cn { font-family: monospace; font-size: 6.5pt; letter-spacing: -0.3px; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .actions { display: none; }
  .content { padding: 0; }
}
</style>
</head><body>
<div class="actions no-print">
  
</div>
<div class="content">
${sheet1Pages}
${sheet2Html}
</div>
</body></html>`;
}

// 새 창에서 인쇄 가능한 HTML 열기
export function openInspectionListPrint(containers, mode, voyageInfo) {
  const html = generateInspectionListHTML(containers, mode, voyageInfo);
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) {
    alert('팝업 차단을 해제해주세요');
    return;
  }
  w.document.write(html);
  w.document.close();
  // 자동 인쇄 시 사용자가 당황할 수 있어 자동 호출 X. 직접 Ctrl+P
}
