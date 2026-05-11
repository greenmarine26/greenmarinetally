// M5.26: 검수 리스트 (M3.86에서 작업했던 inspectionList.js 복구)
// 양식 명세 (메모리):
//   - A4 세로, 여백 상하좌우 0.4cm
//   - 좌우 2단, 페이지당 140대 (단당 70줄)
//   - 컬럼: 순번/컨번호/실번호/규격/F/E/비고
//   - 정렬: 20풀 → 20엠티 → 20특수 → 40풀 → 40엠티 → 40특수
//   - 색상: 풀=흰색 / 엠티=#e5e5e5 / 리퍼=#cce6ff / FR=#d4edda / OT=#fff3cd / TK=#ffe5d0
//   - 시트1=전체, 시트2=특수화물 별첨

const COLOR = {
  full: '#ffffff',
  empty: '#e5e5e5',
  reefer: '#cce6ff',
  fr: '#d4edda',
  ot: '#fff3cd',
  tk: '#ffe5d0',
};

// 컨테이너 타입 판별 (iso 코드 기준)
function getContainerCategory(c) {
  const iso = String(c.iso || '').toUpperCase();
  // 길이: iso 첫 글자 4=40ft, 2=20ft / iso[2] 첫 자리
  // ISO 6346: 4글자 코드 (예: 22G1, 45R1)
  const len = iso.startsWith('4') ? 40 : (iso.startsWith('2') ? 20 : (parseInt(c.cn?.[10]) >= 4 ? 40 : 20));
  
  // 특수 타입: R(reefer), R1(45R1), P(FR), U(OT), T(tank)
  let type = 'normal';
  if (iso.includes('R') && !iso.startsWith('R')) type = 'reefer';
  else if (iso.includes('P') || iso.endsWith('PF') || iso.endsWith('P1') || iso.endsWith('P3')) type = 'fr';
  else if (iso.includes('U')) type = 'ot';
  else if (iso.startsWith('T') || iso.includes('TK')) type = 'tk';
  // 리퍼: iso에 R 또는 reefer 표시
  if (c.reefer === true || c.temp != null) type = 'reefer';
  
  const fe = (c.fe || '').toUpperCase() === 'F' ? 'F' : 'E';
  return { len, type, fe };
}

function getSortKey(c) {
  const { len, type, fe } = getContainerCategory(c);
  // 20풀(0) → 20엠티(1) → 20특수(2) → 40풀(3) → 40엠티(4) → 40특수(5)
  const sizeGroup = len === 20 ? 0 : 3;
  const typeOrder = type === 'normal' ? (fe === 'F' ? 0 : 1) : 2;
  return sizeGroup + typeOrder;
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
  const sl = (c.sl || '').slice(0, 12);  // 너무 길면 잘림
  const cn = c.cn || '';
  const note = type === 'reefer' && c.temp != null ? `${c.temp}°C` : '';
  return `<tr style="background:${bg}">
    <td>${idx}</td>
    <td class="cn">${cn}</td>
    <td>${sl}</td>
    <td>${spec}</td>
    <td>${fe === 'F' ? 'F' : ''}</td>
    <td>${fe === 'E' ? 'E' : ''}</td>
    <td>${note}</td>
  </tr>`;
}

// 한 페이지 (좌+우 단) HTML
function renderPage(rows, pageNum, totalPages) {
  const half = Math.ceil(rows.length / 2);
  const left = rows.slice(0, half);
  const right = rows.slice(half);

  const renderColumn = (rs) => `<table class="ilist">
    <thead><tr><th>#</th><th>컨번호</th><th>실번호</th><th>규격</th><th>F</th><th>E</th><th>비고</th></tr></thead>
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

  // 정렬
  list.sort((a, b) => {
    const ka = getSortKey(a), kb = getSortKey(b);
    if (ka !== kb) return ka - kb;
    return (a.cn || '').localeCompare(b.cn || '');
  });

  // 시트1: 전체 (140대씩 페이지)
  const PER_PAGE = 140;
  const allPages = [];
  for (let i = 0; i < list.length; i += PER_PAGE) {
    const chunk = list.slice(i, i + PER_PAGE);
    const rows = chunk.map((c, j) => renderRow(c, i + j + 1));
    allPages.push(rows);
  }
  const sheet1Pages = allPages.map((rows, i) => renderPage(rows, i + 1, allPages.length)).join('');

  // 시트2: 특수화물 (리퍼/FR/OT/TK)
  const special = list.filter(c => {
    const { type } = getContainerCategory(c);
    return type !== 'normal';
  });
  let sheet2Html = '';
  if (special.length > 0) {
    const sheet2Pages = [];
    for (let i = 0; i < special.length; i += PER_PAGE) {
      const chunk = special.slice(i, i + PER_PAGE);
      const rows = chunk.map((c, j) => renderRow(c, i + j + 1));
      sheet2Pages.push(rows);
    }
    sheet2Html = `<div class="ititle">[별첨] 특수화물 (${special.length}대)</div>` +
      sheet2Pages.map((rows, i) => renderPage(rows, i + 1, sheet2Pages.length)).join('');
  }

  const modeKo = mode === 'discharge' ? '양하' : '선적';
  const vsl = voyageInfo?.vsl || '';
  const voy = voyageInfo?.voy || voyageInfo?.voy_l || voyageInfo?.voy_d || '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>검수 리스트 - ${modeKo}</title>
<style>
@page { size: A4 portrait; margin: 0.4cm; }
body { font-family: 'Malgun Gothic', sans-serif; margin: 0; padding: 0; color: #000; font-size: 9pt; }
.ititle { font-weight: bold; text-align: center; padding: 8px 0; font-size: 11pt; page-break-before: always; }
.ihdr { text-align: right; font-size: 8pt; color: #666; margin-bottom: 2mm; }
.ipage { page-break-after: always; }
.ipage:last-child { page-break-after: auto; }
.icols { display: flex; gap: 2mm; }
.icol { flex: 1; min-width: 0; }
table.ilist { width: 100%; border-collapse: collapse; font-size: 8pt; }
table.ilist th, table.ilist td { border: 1px solid #333; padding: 1px 2px; text-align: center; line-height: 1.1; }
table.ilist th { background: #ddd; font-size: 7.5pt; }
table.ilist td.cn { font-family: monospace; font-size: 7.5pt; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
.coverpage { padding: 20mm; text-align: center; page-break-after: always; }
.coverpage h1 { font-size: 18pt; margin: 0 0 8mm; }
.coverpage .info { font-size: 12pt; line-height: 1.8; }
</style>
</head><body>
<div class="coverpage">
  <h1>검수 리스트</h1>
  <div class="info">
    <strong>${modeKo}</strong> · ${vsl} ${voy}<br>
    총 ${list.length}대 (특수화물 ${special.length}대)<br>
    <small style="color:#666">${new Date().toLocaleString('ko-KR')}</small>
  </div>
</div>
<div class="ititle">[시트1] 전체 (${list.length}대) — 정렬: 20F → 20E → 20특수 → 40F → 40E → 40특수</div>
${sheet1Pages}
${sheet2Html}
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
