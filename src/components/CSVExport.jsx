// CSV 내보내기 — 결재용 검수 결과
import { isoToLabel, formatWt, fmtPos } from '../utils.js';

export function exportSectionToCSV(voyageKey, mode, containers, compMap, xrayMap, xraySeals) {
  const headers = [
    '순번', '위치', '컨번호', '실번호', 'X-RAY 실번호',
    '규격', 'F/E', '무게(kg)', '검수업체', 'POL', 'POD',
    '리퍼온도', 'X-RAY대상', '검수완료', '검수자', '완료시각'
  ];

  const rows = [headers];
  containers.forEach((c, i) => {
    const comp = compMap[c.cn];
    const isX = mode === 'discharge' && !!xrayMap[c.cn];
    const xs = xraySeals[c.cn] || '';
    const completedAt = comp?.at ? new Date(comp.at).toLocaleString('ko-KR') : '';
    rows.push([
      i + 1,
      c.bay ? `${c.bay}-${c.row}-${c.tier}` : '',
      c.cn || '',
      c.sl || '',
      xs,
      isoToLabel(c.iso) || c.tp || '',
      c.fe || '',
      c.wt || '',
      c.op || '',
      c.pol || '',
      c.pod || '',
      c.tmp || '',
      isX ? 'O' : '',
      comp ? 'O' : '',
      comp?.by || '',
      completedAt,
    ]);
  });

  // CSV 변환 (UTF-8 BOM + escape)
  const escape = (v) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const csv = '\uFEFF' + rows.map(r => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${voyageKey}_${mode}_${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
