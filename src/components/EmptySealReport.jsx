// 엠티 실 보고서 (M3.5.5)
// 사용자 요청 형식:
//   상단: 선박이름 / 항차수 / 선적일자
//   항목: 순번 / 컨번호 / 규격 / E / 엠티실번호 (verify는 +틀린실+리씰)
//
// M4.9b: "엠티 수정 리포트" 별도 추가 - 수정 이력(eseal_history)이 있는 컨테이너만 출력
//        TNJP 같은 verify 선박에서 입력은 단순화하고, 수정 발생 시 별도 보고서로 추적
import React from 'react';
import { Download, FileSpreadsheet, History } from 'lucide-react';
import { loadSheetJS, isoToLabel } from '../utils.js';

export async function generateEmptySealReport({ voyage, sealTargets, sealMode }) {
  const XLSX = await loadSheetJS();

  const vsl = voyage?.info?.vsl || '-';
  const voy = voyage?.info?.voy_l || voyage?.info?.voy || '-';
  const etd = voyage?.info?.etd ? new Date(voyage.info.etd).toLocaleDateString('ko-KR') : new Date().toLocaleDateString('ko-KR');

  const targets = sealTargets || [];
  const isVerify = sealMode === 'verify';

  // M4.9b: verify 모드도 단순화 - 단일 엠티실번호 컬럼만
  //        수정 이력은 별도 "엠티 수정 리포트"에서 다룸
  const cols = ['순번', '컨번호', '규격', 'E', '엠티실번호', '검수자', '시각'];

  const headerInfo = [
    [`엠티 실 ${isVerify ? '표기' : '부착'} 보고서`],
    [],
    ['선박', vsl],
    ['항차', voy],
    ['선적일자', etd],
    ['총 대수', `${targets.length}대`],
    ['검수 모드', isVerify ? '표기 (verify)' : '부착 (attach)'],
    [],
  ];

  const rows = targets.map((c, i) => [
    i + 1,
    c.cn || '(현장 부여)',
    isoToLabel(c.iso) || c.iso || '-',
    'E',
    c.eseal || (isVerify ? '' : '(미부착)'),
    c.eseal_by || '',
    c.eseal_at ? new Date(c.eseal_at).toLocaleString('ko-KR') : '',
  ]);

  const aoa = [...headerInfo, cols, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 5 }, { wch: 14 }, { wch: 8 }, { wch: 4 }, { wch: 14 },
    { wch: 10 }, { wch: 18 },
  ];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: cols.length - 1 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '엠티실 보고서');

  const filename = `엠티실_${vsl.replace(/\s+/g, '')}_${voy}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  return { filename, rowCount: targets.length };
}

// M4.9b: 엠티 수정 리포트 — eseal_history가 있는 컨테이너만 출력
//   각 수정 건마다 한 행: from(이전 번호) → to(새 번호) + 검수자 + 시각
export async function generateEmptySealEditReport({ voyage, sealTargets }) {
  const XLSX = await loadSheetJS();

  const vsl = voyage?.info?.vsl || '-';
  const voy = voyage?.info?.voy_l || voyage?.info?.voy || '-';
  const etd = voyage?.info?.etd ? new Date(voyage.info.etd).toLocaleDateString('ko-KR') : new Date().toLocaleDateString('ko-KR');

  const targets = sealTargets || [];
  // 수정 이력이 있는 것만 필터링 (단, 처음 입력은 from='', to='실번호'이므로 from이 비어있지 않은 것만 = 진짜 수정)
  // 또는 history 길이가 1 이상이고, 그 중 진짜 변경이 있는 것
  const editsRows = [];
  let seq = 1;
  for (const c of targets) {
    const history = Array.isArray(c.eseal_history) ? c.eseal_history : [];
    for (const h of history) {
      const fromEseal = String(h.from?.eseal || '').trim();
      const toEseal = String(h.to?.eseal || '').trim();
      // 처음 입력(from=''→to=값)은 수정이 아님 — 제외
      if (!fromEseal) continue;
      // 같은 값이면 변화 없음 — 제외
      if (fromEseal === toEseal) continue;
      editsRows.push([
        seq++,
        c.cn || '',
        isoToLabel(c.iso) || c.iso || '-',
        fromEseal,
        toEseal || '(삭제)',
        h.by || '',
        h.at ? new Date(h.at).toLocaleString('ko-KR') : '',
      ]);
    }
  }

  const cols = ['순번', '컨번호', '규격', '이전 번호', '새 번호', '수정자', '수정 시각'];
  const headerInfo = [
    [`엠티 실 수정 리포트`],
    [],
    ['선박', vsl],
    ['항차', voy],
    ['선적일자', etd],
    ['수정 건수', `${editsRows.length}건`],
    [],
  ];

  const aoa = [...headerInfo, cols, ...editsRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 5 }, { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 14 },
    { wch: 10 }, { wch: 18 },
  ];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: cols.length - 1 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '엠티실 수정 리포트');

  const filename = `엠티실수정_${vsl.replace(/\s+/g, '')}_${voy}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  return { filename, rowCount: editsRows.length };
}

// 다운로드 버튼 컴포넌트
export default function EmptySealReportButton({ voyage, sealTargets, sealMode }) {
  const [downloading, setDownloading] = React.useState(false);
  const [downloadingEdits, setDownloadingEdits] = React.useState(false);

  if (!sealMode || !sealTargets || sealTargets.length === 0) return null;

  const total = sealTargets.length;
  const done = sealTargets.filter(c => c.eseal).length;
  const pending = total - done;

  // M4.9b: 수정 발생 건수 카운트 (eseal_history에서 from!='' 인 항목)
  const editsCount = sealTargets.reduce((sum, c) => {
    const h = Array.isArray(c.eseal_history) ? c.eseal_history : [];
    return sum + h.filter(x => {
      const fromE = String(x.from?.eseal || '').trim();
      const toE = String(x.to?.eseal || '').trim();
      return fromE && fromE !== toE;
    }).length;
  }, 0);

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

  // M4.9b: 수정 리포트 별도 다운로드
  const handleDownloadEdits = async () => {
    setDownloadingEdits(true);
    try {
      const result = await generateEmptySealEditReport({ voyage, sealTargets });
      if (result.rowCount === 0) {
        alert('수정된 엠티 실이 없습니다.');
      } else {
        alert(`✅ 수정 리포트 다운로드 완료: ${result.filename}\n수정 ${result.rowCount}건`);
      }
    } catch (e) {
      alert('다운로드 실패: ' + e.message);
    } finally {
      setDownloadingEdits(false);
    }
  };

  return (
    <div className={`border-2 rounded-lg p-3 ${sealMode === 'attach' ? 'border-red-700/50 bg-red-950/20' : 'border-cyan-700/50 bg-cyan-950/20'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className={`w-4 h-4 ${sealMode === 'attach' ? 'text-red-400' : 'text-cyan-400'}`}/>
          <span className="font-bold text-sm">
            엠티 실 {sealMode === 'attach' ? '부착' : '표기'} 보고서
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
      {/* M4.9b: 수정 리포트 별도 버튼 — 수정 이력 있을 때만 활성 */}
      {sealMode === 'verify' && (
        <button
          onClick={handleDownloadEdits}
          disabled={downloadingEdits || editsCount === 0}
          className={`w-full mt-2 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 ${
            editsCount > 0
              ? 'bg-amber-700 hover:bg-amber-600 text-white'
              : 'bg-slate-800 text-slate-500'
          } disabled:opacity-50`}
        >
          <History className="w-4 h-4"/>
          {downloadingEdits
            ? '생성 중...'
            : editsCount > 0
              ? `엠티 수정 리포트 (${editsCount}건)`
              : '엠티 수정 리포트 (수정 없음)'}
        </button>
      )}
    </div>
  );
}
