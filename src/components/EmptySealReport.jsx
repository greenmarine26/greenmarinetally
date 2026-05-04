// 엠티 실 보고서 (M3.5.5)
// 사용자 요청 형식:
//   상단: 선박이름 / 항차수 / 선적일자
//   항목: 순번 / 컨번호 / 규격 / E / 엠티실번호 (verify는 +틀린실+리씰)
import React from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { loadSheetJS, isoToLabel } from '../utils.js';

export async function generateEmptySealReport({ voyage, sealTargets, sealMode }) {
  const XLSX = await loadSheetJS();

  const vsl = voyage?.info?.vsl || '-';
  const voy = voyage?.info?.voy_l || voyage?.info?.voy || '-';
  const etd = voyage?.info?.etd ? new Date(voyage.info.etd).toLocaleDateString('ko-KR') : new Date().toLocaleDateString('ko-KR');

  const targets = sealTargets || [];
  const isVerify = sealMode === 'verify';

  const cols = isVerify
    ? ['순번', '컨번호', '규격', 'E', '엠티실번호', '틀린실번호', '리씰번호', '검수자', '시각']
    : ['순번', '컨번호', '규격', 'E', '엠티실번호', '검수자', '시각'];

  const headerInfo = [
    [`엠티 실 ${isVerify ? '확인' : '부착'} 보고서`],
    [],
    ['선박', vsl],
    ['항차', voy],
    ['선적일자', etd],
    ['총 대수', `${targets.length}대`],
    ['검수 모드', isVerify ? '확인 (verify)' : '부착 (attach)'],
    [],
  ];

  const rows = targets.map((c, i) => {
    const base = [
      i + 1,
      c.cn || '(현장 부여)',
      isoToLabel(c.iso) || c.iso || '-',
      'E',
    ];
    if (isVerify) {
      base.push(
        c.eseal || '',
        c.eseal_wrong || '',
        c.reseal || '',
        c.eseal_by || '',
        c.eseal_at ? new Date(c.eseal_at).toLocaleString('ko-KR') : ''
      );
    } else {
      base.push(
        c.eseal || '(미부착)',
        c.eseal_by || '',
        c.eseal_at ? new Date(c.eseal_at).toLocaleString('ko-KR') : ''
      );
    }
    return base;
  });

  const aoa = [...headerInfo, cols, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 5 }, { wch: 14 }, { wch: 8 }, { wch: 4 }, { wch: 14 },
    ...(isVerify ? [{ wch: 14 }, { wch: 14 }] : []),
    { wch: 10 }, { wch: 18 },
  ];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: cols.length - 1 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '엠티실 보고서');

  const filename = `엠티실_${vsl.replace(/\s+/g, '')}_${voy}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  return { filename, rowCount: targets.length };
}

// 다운로드 버튼 컴포넌트
export default function EmptySealReportButton({ voyage, sealTargets, sealMode }) {
  const [downloading, setDownloading] = React.useState(false);

  if (!sealMode || !sealTargets || sealTargets.length === 0) return null;

  const total = sealTargets.length;
  const done = sealTargets.filter(c => c.eseal).length;
  const pending = total - done;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const result = await generateEmptySealReport({ voyage, sealTargets, sealMode });
      alert(`✅ 다운로드 완료: ${result.filename}\n${result.rowCount}대`);
    } catch (e) {
      alert('다운로드 실패: ' + e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`border-2 rounded-lg p-3 ${sealMode === 'attach' ? 'border-red-700/50 bg-red-950/20' : 'border-cyan-700/50 bg-cyan-950/20'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className={`w-4 h-4 ${sealMode === 'attach' ? 'text-red-400' : 'text-cyan-400'}`}/>
          <span className="font-bold text-sm">
            엠티 실 {sealMode === 'attach' ? '부착' : '확인'} 보고서
          </span>
        </div>
        <span className={`text-xs font-bold ${pending > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
          {done} / {total} {pending > 0 && `(${pending}대 남음)`}
        </span>
      </div>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className={`w-full py-2 rounded text-sm font-bold text-white flex items-center justify-center gap-2 ${
          sealMode === 'attach' ? 'bg-red-700 hover:bg-red-600' : 'bg-cyan-700 hover:bg-cyan-600'
        } disabled:opacity-50`}
      >
        <Download className="w-4 h-4"/>
        {downloading ? '생성 중...' : '엑셀 다운로드'}
      </button>
    </div>
  );
}
