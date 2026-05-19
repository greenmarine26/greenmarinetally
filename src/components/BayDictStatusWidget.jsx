// 베이사전 검증 위젯 (M4.1 신규, M5.11 강화)
// M5.11: matchedBy 표시 — 어떤 키/방식으로 매칭됐는지 보여줘서 진단 가능하게
import React, { useMemo, useState } from 'react';
import { Database, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getShipBayDictData } from '../shipStructure.js';

export default function BayDictStatusWidget({ shipImo, shipName, ediContainerCount = 0 }) {
  const [expanded, setExpanded] = useState(false);

  const dictData = useMemo(() => {
    if (!shipImo && !shipName) return null;
    return getShipBayDictData(shipImo, shipName);
  }, [shipImo, shipName]);

  if (!dictData) {
    // 베이사전 미등록 — 명확한 진단 표시
    return (
      <div className="bg-amber-950/30 border-2 border-amber-700/60 rounded-lg p-2.5 text-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-amber-200 font-black">⚠️ 베이사전 매칭 실패</span>
            <span className="text-amber-400/80 ml-2 text-[10px]">EDI 폴백 (빈 베이 식별 X)</span>
          </div>
          <button onClick={() => setExpanded(v => !v)} className="text-amber-300 px-1">
            {expanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
          </button>
        </div>
        {expanded && (
          <div className="mt-2 pt-2 border-t border-amber-700/40 text-[10px] text-amber-300/80 space-y-1">
            <div>EDI IMO: <span className="mono text-amber-100">{shipImo || '(없음)'}</span></div>
            <div>EDI 선박명: <span className="mono text-amber-100">{shipName || '(없음)'}</span></div>
            <div className="text-amber-400/60 italic mt-1">
              4글자 코드 · IMO · callsign · 이름 fuzzy 모두 시도 후 실패
            </div>
            <div className="text-amber-400/60 italic">
              → .def 파일 직접 업로드(자료 탭) 또는 다음 빌드에서 사전 추가
            </div>
          </div>
        )}
      </div>
    );
  }

  const bayDef = dictData.bayDef || {};
  const bayCount = bayDef.recordCount || (bayDef.bayList?.length || 0);
  const verified = bayDef.verified || dictData.verified || false;
  const needsReview = bayDef.grade === 'needs-review';  // M5.13: 자동 추출 데이터 (검토 필요)
  const matchedBy = dictData.matchedBy || dictData.source || '';
  const matchTier = matchedBy === 'imo' ? '🟢 IMO 정확'
    : matchedBy === 'callsign' ? '🟢 콜사인'
    : matchedBy === 'code' ? '🟢 코드 정확'
    : matchedBy.startsWith('name-fuzzy') ? '🟡 이름 fuzzy'
    : matchedBy === 'user-dict' ? '🔵 사용자 사전'
    : matchedBy === 'v1-lookup' ? '🟠 v1 폴백'
    : '⚪ ' + matchedBy;

  return (
    <div className="bg-cyan-950/30 border border-cyan-700/50 rounded-lg p-2.5 text-xs">
      {/* M6.41: 헤더 전체 영역 탭으로 펼침 — 모바일에서 작은 버튼 못 찾는 문제 해결 */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Database className="w-4 h-4 text-cyan-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-cyan-300 font-black">📚 베이사전 매칭됨</span>
            {verified ? (
              <span className="bg-emerald-700 text-emerald-100 px-1.5 py-0.5 rounded text-[9px] font-black flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />검증
              </span>
            ) : needsReview ? (
              <span className="bg-orange-700 text-orange-100 px-1.5 py-0.5 rounded text-[9px] font-black">
                ⚠️ 검토필요
              </span>
            ) : (
              <span className="bg-amber-700/60 text-amber-100 px-1.5 py-0.5 rounded text-[9px] font-black">미검증</span>
            )}
          </div>
          <div className="text-[10px] text-cyan-400/80 mt-0.5 truncate">
            {(dictData.name || '').substring(0, 30).trim()} · {bayCount}개 베이
            {ediContainerCount > 0 && ` · EDI ${ediContainerCount}대`}
          </div>
        </div>
        <span className="text-cyan-300 px-1 shrink-0">
          {expanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
        </span>
      </button>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-cyan-700/40 text-[10px] text-cyan-300/80 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-cyan-500/70">매칭 방식:</span>
            <span className="font-bold text-cyan-100">{matchTier}</span>
          </div>
          <div>EDI IMO: <span className="mono text-cyan-100">{shipImo || '(없음)'}</span></div>
          <div>EDI 선박명: <span className="mono text-cyan-100">{shipName || '(없음)'}</span></div>
          <div>사전 코드: <span className="mono text-cyan-100">{dictData.code || '?'}</span></div>
          {dictData.callsign && <div>사전 콜사인: <span className="mono text-cyan-100">{dictData.callsign}</span></div>}
          <div>사전 출처: <span className="mono text-cyan-100">{dictData.source}</span></div>
          {/* M6.40: STOWAGE PDF 원본 (30일 보관) */}
          {dictData.pdfUrl && (
            <div className="mt-2 pt-2 border-t border-cyan-700/40">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-cyan-500/70">📄 원본 PDF:</span>
                <span className="text-cyan-100 truncate flex-1">{dictData.pdfName || 'STOWAGE.pdf'}</span>
              </div>
              {dictData.pdfUploadedAt && (
                <div className="text-cyan-400/60 text-[9px] mb-1.5">
                  업로드: {new Date(dictData.pdfUploadedAt).toLocaleDateString('ko-KR')}
                  {' · '}만료: {new Date(dictData.pdfUploadedAt + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR')}
                </div>
              )}
              <a
                href={dictData.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-2 py-1 bg-cyan-700 hover:bg-cyan-600 text-cyan-50 rounded text-[10px] font-bold"
              >
                📄 PDF 다시 보기
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
