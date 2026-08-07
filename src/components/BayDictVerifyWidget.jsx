// 베이사전 검증 위젯 (통계 탭) — 베이 탭(BayDictStatusWidget)과 동일 사전 조회로 일치.
// V7.96: lookupBayDict(정적 .def 사전만) → getShipBayDictData(Firebase/user/v2/v5)로 교체.
//   증상: 같은 MCSN인데 베이 탭은 "매칭됨", 통계 탭은 "미등록"으로 모순.
//   원인: 통계 탭만 옛 정적 사전(SHIP_BAY_DICT)을 봤고, 사용자 매트릭스(baysSummary)는 안 봄.
//   추가로 matrixBuilder 구조는 bayDef.bays[].idx가 아니라 baysSummary[].bayNo에 데이터가 있음.
import React, { useMemo } from 'react';
import { getShipBayDictData } from '../shipStructure.js';
import { getBayOverride } from '../data/shipBayDict_pdf_override.js';  // V9.57(I13): 매트릭스 확정 판정 이관용
import { Database, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function BayDictVerifyWidget({ shipInfo, ediContainers }) {
  const result = useMemo(() => {
    if (!shipInfo) return { status: 'no-ship' };

    // EDI 베이 번호 집합 (정규화: 앞 0 제거한 정수)
    const containers = Array.isArray(ediContainers) ? ediContainers : Object.values(ediContainers || {});
    const ediBayNums = new Set();
    containers.forEach(c => {
      if (c && c.bay != null && c.bay !== '') {
        const num = parseInt(c.bay, 10);
        if (!isNaN(num)) ediBayNums.add(num);
      }
    });

    // 베이 탭과 동일 함수로 조회 (EDI 베이수 힌트 전달 → 같은 배 여러 벌 중 알맹이 선택)
    const dict = getShipBayDictData(shipInfo.imo, shipInfo.name, {
      vslFull: shipInfo.name,
      ediBayCount: ediBayNums.size || undefined,
    });
    if (!dict) {
      return { status: 'not-registered', shipName: shipInfo.name, imo: shipInfo.imo };
    }

    // 사전이 아는 베이 번호 집합 (matrix_builder: baysSummary[].bayNo, 폴백: bayList)
    const summary = dict.bayDef?.baysSummary || [];
    const knownBayNums = new Set();
    if (summary.length > 0) {
      summary.forEach(b => {
        const n = parseInt(b.bayNo ?? b.bayNum ?? b.bay, 10);
        if (!isNaN(n)) knownBayNums.add(n);
      });
    } else {
      (dict.bayDef?.bayList || []).forEach(v => {
        const n = parseInt(v, 10);
        if (!isNaN(n)) knownBayNums.add(n);
      });
    }

    // 매칭률: EDI 베이가 사전 베이(또는 페어 묶인 짝수)에 들어가는 비율
    let matched = 0;
    ediBayNums.forEach(num => {
      if (knownBayNums.has(num)) { matched++; return; }
      // 짝수 bay는 pairEven으로 홀수 bay에 묶임 → 홀수 bay가 사전에 있으면 매칭
      if (num % 2 === 0 && summary.some(b => parseInt(b.pairEven, 10) === num)) matched++;
    });
    const total = ediBayNums.size;
    // 1.25: **대조할 것이 없으면 비율을 만들지 않는다.**
    //   종전엔 `total > 0 ? matched/total : 1` 이라 EDI 에 베이 좌표가 하나도 없으면 **무조건 1(=100%)**
    //   이었다. 비셀형(OBWH·RZOR 등)은 EDI 에 베이가 아예 없어 **영원히 초록 100%** 로 떴다
    //   — 아무것도 못 맞췄는데 "확정" 이라 말한 것이다(검수사 신고 2026-08-07, OBWH 0개 중 0개 100%).
    //   0/0 은 100% 가 아니라 **판정 불가**다. rate 를 null 로 두고 화면이 따로 말하게 한다.
    const rate = total > 0 ? (matched / total) : null;

    // V9.57(I13): 베이매트릭스 확정 여부 판정 — BayDictStatusWidget(폐기 예정) 고유 기능 이관.
    //   원본(StatusWidget)은 b.bayNum을 읽었는데 matrixBuilder 요약은 bayNo에 값이 있어(감사 #1)
    //   전 베이가 undefined로 판정되던 결함 — 여기서는 bayNo→bayNum→bay 폴백으로 올바르게 구현.
    const matrix = (() => {
      const isUserSource = dict.source === 'user' || dict.bayDef?._userOwned === true;
      if (summary.length === 0) return { total: 0, allConfirmed: false, defAll: false, unconfirmed: [], defCovered: [] };
      const code = dict.code || '';
      const unconfirmed = [];
      const defCovered = [];   // .def 내장 사전으로만 커버되는 베이 (자동, 미검증)
      for (const b of summary) {
        const bayNum = parseInt(b.bayNo ?? b.bayNum ?? b.bay, 10);
        if (isNaN(bayNum)) continue;
        const hasTier = (b.deckTiersLocal?.length > 0) || (b.holdTiersLocal?.length > 0)
          || (b.deckTiers?.length > 0) || (b.holdTiers?.length > 0);
        const ov = getBayOverride(code, bayNum);
        const hasOverride = !!ov && !ov.defSource;   // PDF override (사용자·PDF 검증)
        const hasDef = !!ov && !!ov.defSource;       // .def 내장 사전
        const confirmed = isUserSource ? hasTier : (hasTier || hasOverride);
        if (!confirmed) {
          if (hasDef) defCovered.push(String(bayNum).padStart(2, '0'));
          else unconfirmed.push(String(bayNum).padStart(2, '0'));
        }
      }
      return {
        total: summary.length,
        allConfirmed: unconfirmed.length === 0 && defCovered.length === 0,
        defAll: unconfirmed.length === 0 && defCovered.length > 0,
        unconfirmed, defCovered,
      };
    })();

    return {
      matrix,
      status: 'matched',
      shipName: dict.name || shipInfo.name,
      imo: dict.imo || shipInfo.imo,
      matchedBy: dict.matchedBy || dict.source || '',
      dictBayCount: knownBayNums.size,
      ediBayCount: total,
      matched,
      rate,
      verified: dict.verified || dict.bayDef?.verified || false,
      isUser: dict.source === 'user' || dict.bayDef?._userOwned === true,
    };
  }, [shipInfo, ediContainers]);

  if (result.status === 'no-ship') return null;

  // 베이사전 미등록 — 어떤 사전에도 없음
  if (result.status === 'not-registered') {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5"/>
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-300">베이사전 미등록</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {result.shipName || result.imo || '이 선박'}은 베이사전이 없습니다.
              EDI 좌표 기반으로 베이플랜 자동 형성됩니다.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 매칭됨
  // 1.25: rate === null 이면 EDI 에 베이 좌표가 없어 **대조 자체가 불가**하다.
  //   초록도 빨강도 아니다 — 사전은 있으니 경고할 일이 아니고, 맞췄다고 할 근거도 없다.
  const noBasis = result.rate == null;
  const ratePct = noBasis ? null : (result.rate * 100).toFixed(0);
  const isGood = !noBasis && result.rate >= 0.95;
  const isOK = !noBasis && result.rate >= 0.7;
  const color = noBasis ? 'slate' : isGood ? 'emerald' : isOK ? 'amber' : 'red';

  return (
    <div className={`bg-slate-900 border border-${color}-700/40 rounded-lg p-3`}>
      <div className="flex items-start gap-2">
        {noBasis ? (
          <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5"/>
        ) : isGood ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5"/>
        ) : (
          <AlertTriangle className={`w-4 h-4 text-${color}-400 flex-shrink-0 mt-0.5`}/>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Database className="w-3 h-3 text-slate-400"/>
            <span className="text-xs font-bold text-slate-200">베이사전 매칭</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black bg-${color}-900/60 text-${color}-200`}>
              {noBasis ? '대조 불가' : `${ratePct}%`}
            </span>
            {result.isUser ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-900/50 text-cyan-200">사용자 매트릭스</span>
            ) : !result.verified && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-900/40 text-amber-300">미검증</span>
            )}
            {/* V9.57(I13): 매트릭스 확정 배지 — StatusWidget 이관 */}
            {result.matrix?.total > 0 && (
              result.matrix.allConfirmed ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-900/60 text-emerald-200">📐 매트릭스 확정</span>
              ) : result.matrix.defAll ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-sky-900/60 text-sky-200">🚢 .def 사전 (검증 전)</span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-900/60 text-red-200">⚠️ 매트릭스 확정 필요</span>
              )
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {result.shipName} (IMO: {result.imo || '-'})
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 mono">
            {noBasis
              ? 'EDI 에 베이 좌표가 없어 대조할 수 없습니다'
              : `EDI 베이 ${result.ediBayCount}개 중 ${result.matched}개 매칭`}
            <span className="text-slate-600"> · 사전 {result.dictBayCount}개 보유</span>
          </div>
          {noBasis && (
            <div className="text-[10px] text-slate-400 mt-1">
              비셀형(덱 적부) 선박이거나 EDI 가 위치 없는 포맷(IFCSUM 등)입니다.
              사전이 맞는지 틀린지는 이 자료로 판정할 수 없습니다.
            </div>
          )}
          {!noBasis && !isGood && (
            <div className={`text-[10px] text-${color}-300 mt-1`}>
              {result.rate < 0.7
                ? '⚠️ 매칭률 낮음 — 베이 번호 매핑 재검토 필요'
                : '⚠️ 일부 베이 매칭 안 됨 — 페어/추가 베이 확인 권장'}
            </div>
          )}
          {/* V9.57(I13): 미확정 베이 상세 — 매트릭스 빌더에서 확정 안내 */}
          {result.matrix?.total > 0 && !result.matrix.allConfirmed && (
            <div className="text-[10px] mt-1 space-y-0.5">
              {result.matrix.unconfirmed.length > 0 && (
                <div className="text-red-300">⚠️ 매트릭스 확정 필요 (EDI 추정값 표시 중): <span className="mono font-bold">{result.matrix.unconfirmed.join(', ')}</span></div>
              )}
              {result.matrix.defCovered.length > 0 && (
                <div className="text-sky-300">🚢 .def 사전 적용(검증 전): <span className="mono font-bold">{result.matrix.defCovered.join(', ')}</span></div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
