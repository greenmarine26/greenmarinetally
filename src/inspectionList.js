// M5.26: 검수 리스트 (M3.86에서 작업했던 inspectionList.js 복구)
// 양식 명세 (메모리):
//   - A4 세로, 여백 상하좌우 0.4cm
//   - 좌우 2단, 페이지당 140대 (단당 70줄)
//   - 컬럼: 순번/컨번호/실번호/규격/F/E/비고
//   - 정렬: 20풀 → 20엠티 → 20특수 → 40풀 → 40엠티 → 40특수
//   - 색상: 풀=흰색 / 엠티=#e5e5e5 / 리퍼=#cce6ff / FR=#d4edda / OT=#fff3cd / TK=#ffe5d0
//   - 시트1=전체, 시트2=특수화물 별첨

import { openPrintWindow } from './printHelper.js';
import { isoToLabel, overDims} from './utils.js';   // 2.07: VGM 리스트 TYPE 표기
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
  // M5.68 — 4자 → 3자 (voucher와 동일)
  'DWIC': 'DWS', 'EASK': 'EAS', 'TJMS': 'TJM', 'WDFC': 'WDF', 'SCLK': 'SIT',
};
function normalizeCarrier(c) {
  // M5.68 — 3자 강제 (voucher와 통일)
  const to3 = (s) => String(s || '').slice(0, 3).toUpperCase();

  // M5.79: 부킹 슬롯 가드
  const isBooking = c.isBooking === true || c.pendingCn === true ||
                    (typeof c.cn === 'string' && c.cn.startsWith('__BOOK_'));

  if (c.op) {
    const op = String(c.op).toUpperCase().trim();
    if (CARRIER_MAP[op]) return CARRIER_MAP[op];
    if (op) return to3(op);
  }
  if (c.bl && c.bl.length >= 4) {
    const blp = String(c.bl).slice(0, 4).toUpperCase();
    if (CARRIER_MAP[blp]) return CARRIER_MAP[blp];
  }
  if (!isBooking && c.cn && c.cn.length >= 3) return c.cn.slice(0, 3).toUpperCase();
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

  // 리퍼 우선 판별 (EDI에 리퍼 플래그/실제 온도값 있으면 ISO와 무관하게 reefer)
  const hasTmpVal = (c.tmp != null && String(c.tmp).trim() !== '') || (c.temp != null && String(c.temp).trim() !== '');
  if (c.reefer === true || hasTmpVal) type = 'reefer';

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
  // M5.79: 부킹 슬롯이면 컨번호 빈 칸 (검수원이 손으로 채울 자리)
  const isBooking = c.isBooking === true || c.pendingCn === true ||
                    (typeof c.cn === 'string' && c.cn.startsWith('__BOOK_'));
  const cn = isBooking ? '' : (c.cn || '');
  // M5.52: 선사 (c.op = EDI NAD+CA 또는 리스트 carrier 컬럼) 우선, 폴백 cn prefix(owner code)
  const line = normalizeCarrier(c).slice(0, 5);
  // 비고: X-RAY ★ + 리퍼 온도 + 기타 표시
  const notes = [];
  if (isBooking) notes.push('<span style="color:#b45309;font-weight:bold">📝대기</span>');
  if (c._xray) notes.push('<span style="color:#dc2626;font-weight:bold">★XRAY</span>');
  // M6.94.18: 온도 필드는 c.tmp (CSVExport·diagnostics와 동일). 기존 c.temp는 비어서 표기 안 됐음.
  //   XRAY 대상이 리퍼면 ★XRAY + 온도 둘 다 비고에 표기 (선상 체크용).
  //   c.tmp는 소스에 따라 "-18"(단위 없음) 또는 "-18.0℃"(단위 포함) → 중복 방지.
  let reeferTmp = (c.tmp != null && String(c.tmp).trim() !== '') ? String(c.tmp).trim()
                : (c.temp != null && String(c.temp).trim() !== '') ? String(c.temp).trim() : null;
  if (type === 'reefer' && reeferTmp != null) {
    const hasUnit = /℃|°|C$/i.test(reeferTmp);
    notes.push(hasUnit ? reeferTmp : `${reeferTmp}℃`);
  }
  if (type === 'fr' || c.fr) notes.push('FR');
  if (type === 'ot' || c.ot) notes.push('OT');
  if (type === 'tk' || c.tk) notes.push('TK');
  // TallyOne 2.00 (검수사 지시 2026-08-20 «검수용 리스트에 DG(클래스·유엔넘버)·리퍼온도·OOG(높이 폭)·특수화물 다 기록»):
  //   DG — 클래스·UN·포장등급 (nlSearch specialDetailLines 와 같은 필드 dgc/un/pg. TNJP 26360E 실측: cl.9 UN3480)
  // TallyOne 2.00-03 (검수사 지시 «DG 표기는 */**** 형식으로»): 클래스/UN 만 — 예 «9/3480». 번호 없으면 DG 로 폴백
  if (c.dg) notes.push(`<span style="color:#b91c1c;font-weight:bold">${(c.dgc || c.un) ? [c.dgc, c.un].filter(Boolean).join('/') : 'DG'}${c.pg ? ' PG' + c.pg : ''}</span>`);
  //   OOG — EDI DIM 초과 치수(cm, 1.84-04 가 담은 ovh/ovw/ovl), 없으면 치수 엑셀 실치수 폭×높이(mm)
  const _ov = [];
  if (c.ovh) _ov.push(`H+${c.ovh}`);
  if (c.ovw) _ov.push(`W+${c.ovw}`);
  if (c.ovl) _ov.push(`L+${c.ovl}`);
  //  2.25: 선사가 DIM 을 안 적어도 실치수가 있으면 앱이 판정한다(단위 cm — 위 신고분과 같게).
  if (!_ov.length) { const _o = overDims(c); if (_o && _o.over) _ov.push(..._o.short); }
  if (_ov.length) notes.push(`<span style="color:#92400e;font-weight:bold">OOG ${_ov.join(' ')}cm</span>`);
  else if (c.oog && type === 'normal' && !c.fr && !c.ot) notes.push('<span style="color:#92400e;font-weight:bold">OOG</span>');
  if ((c.cgW || c.cgH) && !_ov.length) notes.push(`${c.cgW || '?'}×${c.cgH || '?'}mm`);
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
export function generateInspectionListHTML(containers, mode, voyageInfo, shiftingList = []) {
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
    // TallyOne 2.00: DG·OOG·FR·OT·TK 플래그도 별첨 대상 — 일반 ISO 에 실린 위험물이 별첨에서 빠졌다
    return type !== 'normal' || c._xray || c.dg || c.oog || c.fr || c.ot || c.tk;
  });

  let sheet2Html = special.length > 0 ? 'PENDING' : '';  // 아래에서 헤더 있는 버전으로 생성

  const modeKo = mode === 'discharge' ? '양하' : '선적';
  const vsl = voyageInfo?.vsl || '';
  // V9.57: 항차 표기를 모드별 필드 우선으로 — 양하 인쇄는 voy_d, 선적 인쇄는 voy_l.
  //   한쪽 섹션 삭제 시 info.voy가 남은 쪽으로 재기입되는 수정(HomePage performDelete)과 정합.
  //   종전엔 info.voy(생성 당시 모드의 항차)가 먼저라 양하/선적 항차가 다른 배에서 반대쪽 번호가 찍혔다.
  const voy = (mode === 'discharge'
    ? (voyageInfo?.voy_d || voyageInfo?.voy || voyageInfo?.voy_l)
    : (voyageInfo?.voy_l || voyageInfo?.voy || voyageInfo?.voy_d)) || '';
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

  // [별첨2] 시프팅(재적부) — **평택 작업에 방해가 되어 옮기는 화물**, 양하·선적 공통.
  //   1.76-05: 구 문구 «통과화물 위치 이동» 폐기 — 정의는 «통과화물이냐»가 아니라 «방해가 되느냐»다
  //   (검수사 확정 2026-08-15, 정본 ★앱_통합지침서.md §5-1B). 좌표만 달라진 통과화물은 서류 차이다.
  let shiftHtml = '';
  if (Array.isArray(shiftingList) && shiftingList.length > 0) {
    const rows = shiftingList.map((c, i) => `<tr>
      <td>${i + 1}</td><td class="cn">${c.cn || ''}</td><td>${c.iso || ''}</td><td>${c.pod || ''}</td>
      <td class="cn">${c.from || ''}</td><td class="cn">${c.to || ''}</td><td></td></tr>`).join('');
    shiftHtml = `<div class="ititle">[별첨2] ◆ 시프팅(재적부) ${shiftingList.length}대 — 평택 작업에 걸려 옮기는 화물 (양하·선적 공통, 1대=크레인 2모브)</div>
      <div class="ipage"><table class="ilist" style="max-width:120mm;margin:0 auto;">
      <tr><th>No</th><th>컨테이너</th><th>규격</th><th>POD</th><th>전 위치</th><th>후 위치</th><th>확인</th></tr>
      ${rows}</table></div>`;
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
.btn-excel { background: #15803d; color: white; }
.btn-excel:hover { background: #166534; }
.btn-close { background: #475569; color: white; }
.btn-close:hover { background: #334155; }
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
  <button class="btn-print" onclick="window.print()">🖨 인쇄 / PDF 저장</button>
  <button class="btn-excel" onclick="window.__exportExcel()">📊 엑셀 다운로드</button>
  <button class="btn-close" onclick="window.close()">✕ 닫기</button>
</div>
<div class="content">
${sheet1Pages}
${sheet2Html}
${shiftHtml}
</div>
</body></html>`;
}

// 새 창에서 인쇄 가능한 HTML 열기
// TallyOne 2.07 (검수사 확정 2026-08-21 «선박별로 만들어 놨다가 요청시 제출할수 있게»):
//   본선(선장)이 마감 무렵 «Please provide the VGM list for {항차} KRPTK» 로 요구하는
//   평택 선적분 VGM(검증총중량) 리스트 — 실사례: SWSP SAWASDEE SPICA 2608S.
//   컨별 무게(wt — EDI/선사리스트 신고값, kg)로 영문 제출용 표를 만든다. 무게 없는 컨은 공란+경고.
export function generateVgmListHTML(containers, voyageInfo) {
  const vsl = String(voyageInfo?.vsl || '').toUpperCase();
  const voy = voyageInfo?.voy_l || voyageInfo?.voy || '';
  const today = new Date().toISOString().slice(0, 10);
  const rows = [...containers].sort((a, b) => String(a.cn).localeCompare(String(b.cn)));
  let total = 0, missing = 0;
  const trs = rows.map((c, i) => {
    const w = parseInt(c.wt, 10);
    const ok = Number.isFinite(w) && w > 0;
    if (ok) total += w; else missing++;
    return `<tr><td>${i + 1}</td><td class="mono">${c.cn || ''}</td><td>${isoToLabel(c.iso) || c.iso || ''}</td>` +
      `<td>${c.fe || ''}</td><td class="num">${ok ? w.toLocaleString() : '<span class="warn">—</span>'}</td></tr>`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>VGM LIST ${vsl} ${voy}</title><style>
    body{font-family:'Malgun Gothic',sans-serif;font-size:11px;margin:24px;color:#111}
    h1{font-size:16px;margin:0 0 2px} .sub{color:#555;margin-bottom:12px}
    table{border-collapse:collapse;width:100%} th,td{border:1px solid #999;padding:3px 6px;text-align:center}
    th{background:#eee} .mono{font-family:Consolas,monospace} .num{text-align:right}
    .warn{color:#b91c1c;font-weight:bold} tfoot td{font-weight:bold;background:#f5f5f5}
    @media print{body{margin:8mm}}
  </style></head><body>
    <h1>VGM LIST — M/V ${vsl} VOY ${voy}</h1>
    <div class="sub">POL: KRPTK (PYEONGTAEK) · DATE: ${today} · TOTAL ${rows.length} UNITS` +
    (missing ? ` · <span class="warn">⚠ ${missing} unit(s) without VGM</span>` : '') + `</div>
    <table><thead><tr><th>NO</th><th>CONTAINER NO</th><th>TYPE</th><th>F/E</th><th>VGM (KG)</th></tr></thead>
    <tbody>${trs}</tbody>
    <tfoot><tr><td colspan="4">TOTAL ${rows.length} UNITS</td><td class="num">${total.toLocaleString()} KG</td></tr></tfoot>
    </table></body></html>`;
}
/** X-RAY 세관봉인 확인서 HTML — 2.26-02.
 *
 *  ⚠ **인쇄는 별도 문서로 연다.** 2.26 은 앱 화면 안에 `.xr-print` 를 두고
 *    `@media print { body > *:not(.xr-print){display:none} }` 로 가렸는데,
 *    그 블록은 body 직계가 아니라 React 트리(`#root`) 안이라 **부모가 숨으면 같이 숨는다.**
 *    미리보기가 통째로 **검은 화면**으로 나왔다(검수사 실측 2026-08-24).
 *    ★ 이 사고는 저장소에 이미 있었다 — planedit V9.12 «인쇄 백지 — CARGO_V2_CSS 의
 *      `body>*:not(.cpv2-overlay)` 규칙이 #root 를 숨기던 문제». 같은 함정을 새로 짜서 또 밟았다.
 *    ⇒ 검수 리스트·VGM 과 **같은 벌**을 쓴다 — 문자열로 문서를 만들어 새 창에 쓴다. 앱 CSS 와 안 싸운다.
 *
 *  머리 여섯 칸은 **기존 출력물 그대로다**(검수사 «출력물이 기존자료에서 빠진게 없어야 합니다»).
 *  값이 없는 칸은 손글씨용 밑줄로 — 백지로 뽑아 현장에서 적는 쓰임을 위해서다. */
export function generateXrayListHTML(rows, head = {}, perPage = 20) {
  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const n = Math.max(1, Math.ceil(rows.length / perPage));
  const per = Math.ceil(rows.length / n) || 1;          // 균등 분할 — 40대는 20+20
  //  ★ 폰트 자동조절 — 시안 표 그대로(10대 9.5pt/pad8 · 20대 8pt/pad5).
  //    시안의 «30대 6.5pt · 40대+ 6pt» 구간은 **쓰지 않는다** — 검수사 확정
  //    *«최소 크기가 넘어가면 2장이 되면 됩니다»* 로, 6pt 는 선내 조명에 장갑 낀 손으로 못 읽는다.
  //    한 장에 20대까지만 담으므로 여기 오는 `per` 는 언제나 20 이하다.
  //    ⚠ **장당 대수로 정한다** — 전체 대수로 하면 21대(11+10)에서 장마다 글씨가 달라진다.
  const cfg = per <= 10 ? { f: 9.5, p: 8 } : { f: 8, p: 5 };
  const pages = Array.from({ length: n }, (_, i) => rows.slice(i * per, (i + 1) * per));
  const BLANK = '<span class="bl"></span>';
  const body = pages.map((pg, pi) => `
    <div class="pg">
      <div class="ti"><b>${esc(head.name || '')} XRAY리스트</b><span class="pn">${
        esc(head.sub || '')}${head.sub && n > 1 ? ' · ' : ''}${n > 1 ? `${pi + 1} / ${n} 장` : ''}</span></div>
      <table class="hd">
        <tr><th>항차/항공편명</th><td>${esc(head.voy)}</td><th>운항선사</th><td colspan="3">${esc(head.carrier)}</td></tr>
        <tr><th>입항일자</th><td>${esc(head.eta)}</td><th>양륙항</th><td colspan="3">${esc(head.pod)}</td></tr>
        <tr><th>선박명</th><td>${esc(head.name)}</td><th>선박 호출부호</th><td>${esc(head.callsign)}</td><th>MRN</th><td>${esc(head.mrn) || '&nbsp;'}</td></tr>
      </table>
      <table class="ls">
        <thead><tr>
          <th class="w4">No.</th><th class="w15">컨테이너번호</th><th class="w13">선사SEAL NO</th>
          <th class="w12">화물구분</th><th class="w8">규격</th><th class="w12">선내위치</th>
          <th class="w20">부착 세관봉인번호</th><th class="w16">봉인자</th>
        </tr></thead>
        <tbody>${pg.map((r, i) => `<tr>
          <td>${pi * per + i + 1}</td><td class="b">${esc(r.cn)}</td><td>${esc(r.seal)}</td>
          <td>${esc(r.kind)}</td><td>${esc(r.iso)}</td><td>${esc(r.pos)}</td>
          <td>${r.cSeal ? esc(r.cSeal) : BLANK}</td><td>${r.sealer ? esc(r.sealer) : BLANK}</td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="ft">GREEN MARINE CO., LTD.</div>
    </div>`).join('');
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<title>${esc(head.name || '')} XRAY리스트</title><style>
/*  여백은 시안 기준 그대로 — 좌우 1.8cm · 상 1.9cm · 하 1cm (검수사 TXT·시안 @page 일치) */
@page { size: A4 landscape; margin-top:1.9cm; margin-left:1.8cm; margin-right:1.8cm; margin-bottom:1cm; }
body { font-family:'Malgun Gothic',sans-serif; margin:0; padding:12px; color:#000; background:#fff; font-size:${cfg.f}pt; }
/*  검수사 확정 2026-08-24 — 회사명은 **용지 맨 아래**에 붙어야 한다. 표 바로 밑에 두면
    행 수에 따라 위아래로 움직여 서류마다 자리가 달라진다(2대짜리와 20대짜리가 다르게 나온다).
    ⇒ 쪽마다 내용 높이를 확보하고 바닥글을 아래로 밀어붙인다.
      A4 가로 높이 21cm − 상 1.9cm − 하 1cm = **18.1cm** 가 한 쪽의 내용 높이다.
      세로 flex 에서 margin-top:auto 가 남는 공간을 전부 위로 밀어 바닥에 붙인다. */
.pg { page-break-after: always; min-height: 18.1cm; display: flex; flex-direction: column; }
.pg:last-child { page-break-after: auto; }
.ti { font-size:13pt; margin-bottom:5px; display:flex; justify-content:space-between; align-items:flex-end; }
.pn { font-size:8pt; font-weight:400; }
table { width:100%; border-collapse:collapse; }
/*  검수사 확정 2026-08-24 — 머리표에 MRN 이 너무 작아 보인다. 리스트와 같은 폭으로 늘려 놓으니
    여섯 칸이 균등하게 쪼개져 MRN 값칸이 눌렸다. 기존 샘플은 머리표가 리스트보다 좁다.
    ⇒ 폭을 줄이고 table-layout:auto 로 내용에 맞게 잡는다. 라벨은 줄바꿈 금지.
    ⚠ 이 주석은 템플릿 문자열 안이다 — 백틱을 쓰면 문자열이 끊긴다(지침서 2026-08-13 실측). */
.hd { width:64%; margin-bottom:6px; table-layout:auto; }
.hd th { white-space:nowrap; padding-left:8px; padding-right:8px; }
.hd td { white-space:nowrap; padding-left:10px; padding-right:10px; }
th,td { border:1px solid #333; padding:${cfg.p}px 3px; text-align:center; }
th { background:#eee; font-weight:700; }
/*  검수사 확정 2026-08-24: **출력양식은 전부 중앙정렬.** 머리 표 값칸도 예외 없다. */
.b { font-weight:700; }
.bl { display:block; min-height:13px; border-bottom:1px solid #999; }
/*  검수사 지시 2026-08-24 — 출력물 좌측 하단의 about:blank 자리를 회사명으로.
    ⚠ about:blank 은 **브라우저가 찍는 그 탭의 주소**다(내용이 아니라 주소). 새 창을 빈 주소로 열어
      문서를 써 넣는 방식이라 주소가 없고, 그래서 브라우저가 그렇게 적는다. 그 자리는 페이지에서 못 바꾼다.
    ⇒ 우리 바닥글을 쪽마다 직접 찍는다. 브라우저 머리글·바닥글은 인쇄 설정에서 끄면 사라진다. */
.ft { margin-top:auto; padding-top:6px; text-align:center; font-size:7pt; letter-spacing:0.06em; color:#333; }
.w4{width:4%}.w8{width:8%}.w12{width:12%}.w13{width:13%}.w15{width:15%}.w16{width:16%}.w20{width:20%}
/*  검수사 확정 2026-08-24 — 출력은 PDF 가 기본이지만 인쇄도 되고 엑셀로도 받아져야 한다.
    검수 리스트·VGM 과 같은 벌이다 — 새 창 위에 버튼을 두고, 인쇄할 때만 숨긴다. */
.actions { position:sticky; top:0; background:#1e293b; padding:8px; display:flex; gap:8px; z-index:100; margin:-12px -12px 10px; }
.actions button { flex:1; padding:10px; font-size:13px; font-weight:700; border:none; border-radius:6px; cursor:pointer; color:#fff; }
.btn-print { background:#0369a1; } .btn-excel { background:#15803d; } .btn-close { background:#475569; }
@media print { .no-print { display:none !important; }
  body { -webkit-print-color-adjust:exact; print-color-adjust:exact; padding:0; } }
</style></head><body>
<div class="actions no-print">
  <button class="btn-print" onclick="window.print()">PDF 저장 / 인쇄</button>
  <button class="btn-excel" onclick="window.__exportXrayXlsx &amp;&amp; window.__exportXrayXlsx()">📊 엑셀 받기</button>
  <button class="btn-close" onclick="window.close()">닫기</button>
</div>${body}</body></html>`;
}

export function openXrayListPrint(rows, head, perPage = 20) {
  const w = window.open('', '_blank', 'width=1200,height=900');
  if (!w) { alert('팝업 차단을 해제해주세요'); return; }
  w.document.write(generateXrayListHTML(rows, head, perPage));
  w.document.close();
  /*  ★ 2.41 — **진짜 엑셀(.xlsx)** 로 내보낸다.
      검수사 확정 *«진짜 엑셀로 받아져야 합니다. 양식이 중요 하니까요»* · *«폰트는 굴림체 10입니다»*
      종전 CSV 는 글자만 담는 텍스트라 폰트도 서식도 못 실었다 — 이름만 「엑셀」이었다.
      ⚠ 열 구성은 인쇄물과 **다르다**(검수사 실물 샘플 기준). tallyExcel.generateXrayExcel 주석 참조.
      ⚠ exceljs 는 1MB 라 **누를 때만** 동적 import 한다(마감 텔리와 같은 방식). */
  w.__exportXrayXlsx = async function () {
    try {
      const { generateXrayExcel } = await import('./tallyExcel.js');
      await generateXrayExcel(rows, head);
    } catch (e) {
      //  조용히 실패하지 않는다(3금지 ③) — 눌렀는데 아무 일도 안 나면 검수사는 앱을 의심한다.
      try { w.alert('엑셀을 만들지 못했습니다 — ' + (e && e.message ? e.message : e)); }
      catch (e2) { alert('엑셀을 만들지 못했습니다 — ' + (e && e.message ? e.message : e)); }
    }
  };
}

export function openVgmListPrint(containers, voyageInfo) {
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) { alert('팝업 차단을 해제해주세요'); return; }
  w.document.write(generateVgmListHTML(containers, voyageInfo));
  w.document.close();
}

export function openInspectionListPrint(containers, mode, voyageInfo, shiftingList = []) {
  const html = generateInspectionListHTML(containers, mode, voyageInfo, shiftingList);
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) {
    alert('팝업 차단을 해제해주세요');
    return;
  }
  w.document.write(html);
  w.document.close();
  // M6.71: 엑셀 export 함수 새 창에 주입
  const sortedConts = [...containers].sort((a, b) => {
    const ka = getSortKey(a), kb = getSortKey(b);
    if (ka !== kb) return ka - kb;
    return (a.cn || '').localeCompare(b.cn || '');
  });
  const vsl = voyageInfo?.vsl || voyageInfo?.vslFull || 'VESSEL';
  // V9.57: CSV 파일명 항차도 모드별 필드 우선(위 generateInspectionListHTML과 동일 기준)
  const voy = (mode === 'discharge'
    ? (voyageInfo?.voy_d || voyageInfo?.voy || voyageInfo?.voy_l)
    : (voyageInfo?.voy_l || voyageInfo?.voy || voyageInfo?.voy_d)) || '';
  const modeKo = mode === 'discharge' ? '양하' : '선적';
  const dateStr = new Date().toISOString().slice(0, 10);
  w.__inspectionData = { containers: sortedConts, vsl, voy, modeKo, dateStr };
  w.__exportExcel = function() {
    const d = w.__inspectionData;
    // 엑셀 호환 양식 — CSV (UTF-8 BOM + 한글 헤더)
    let csv = '\uFEFF';
    csv += '순번,컨테이너번호,실번호,규격,F/E,선사,비고\n';
    d.containers.forEach((c, i) => {
      const cn = (c.cn || '').replace(/,/g, '');
      const seal = String(c.sl || c.seal || '').replace(/,/g, '');   // TallyOne 2.00: 실번호 필드는 sl — seal 만 봐서 CSV 실번호가 늘 비었다
      const iso = (c.iso || '').replace(/,/g, '');
      const fe = c.fe === 'E' ? 'E' : 'F';
      const op = normalizeCarrier(c);
      const cat = getContainerCategory(c);
      const memo = [];
      if (c.dg) memo.push(`${(c.dgc || c.un) ? [c.dgc, c.un].filter(Boolean).join('/') : 'DG'}${c.pg ? ' PG' + c.pg : ''}`);   // TallyOne 2.00-03: «9/3480» 형식(클래스/UN만)
      const _t = (c.tmp != null && String(c.tmp).trim() !== '') ? c.tmp : c.temp;   // TallyOne 2.00: 온도 필드는 tmp (temp 만 봐서 늘 비었다)
      if (cat.type === 'reefer') memo.push('R' + (_t != null && String(_t).trim() !== '' ? _t + '℃' : ''));
      const _ov = [];
      if (c.ovh) _ov.push('H+' + c.ovh);
      if (c.ovw) _ov.push('W+' + c.ovw);
      if (c.ovl) _ov.push('L+' + c.ovl);
      if (!_ov.length) { const _o = overDims(c); if (_o && _o.over) _ov.push(..._o.short); }   // 2.25
      if (_ov.length) memo.push('OOG ' + _ov.join(' ') + 'cm');   // TallyOne 2.00
      if (cat.type === 'fr') memo.push('FR');
      if (cat.type === 'ot') memo.push('OT');
      if (cat.type === 'tk') memo.push('TK');
      csv += `${i+1},${cn},${seal},${iso},${fe},${op},${memo.join(' ')}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = w.document.createElement('a');
    a.href = url;
    a.download = `검수리스트_${d.vsl}_${d.voy}_${d.modeKo}_${d.dateStr}.csv`;
    w.document.body.appendChild(a);
    a.click();
    w.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  // 자동 인쇄 시 사용자가 당황할 수 있어 자동 호출 X. 직접 Ctrl+P
}
