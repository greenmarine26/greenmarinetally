// V9.20: 배 옆모습(종단면) 프로파일 뷰 — 3D 카드뷰 대체 (사용자 선택: 프로파일 방향)
//   x축 = 베이(선수 오른쪽), y축 = 티어(데크 위 / 홀드 아래, 해치라인 분리).
//   셀 = (베이,티어) 집계: 숫자=컨 수, 초록=완료, 모드색=미완료, 회색=통과(비평택), ⚡=XRAY 포함.
//   베이 클릭 → 2D 해당 베이로 이동(onPickBay). 진실원: 사전 tiers, 없으면 tier>=60 데크 폴백.
import React, { useMemo } from 'react';
import { isPyeongtaekPort } from '../utils.js';

export default function ShipProfileView({
  containers = [], dictBaysSummary = {}, mode = 'discharge',
  compMap = {}, xrayMap = {}, onPickBay,
}) {
  // 사전 → 베이별 deck/hold tier 집합 (페어 표기 흡수: primary 짝수+뒤홀수)
  const dict = useMemo(() => {
    const m = {};
    const arr = Array.isArray(dictBaysSummary) ? dictBaysSummary : Object.values(dictBaysSummary || {});
    for (const b of arr) {
      if (!b) continue;
      const n = parseInt(b.bayNo ?? b.bayNum ?? b.bay, 10);
      if (!Number.isFinite(n)) continue;
      m[n] = {
        deck: new Set((b.deckTiers || []).map(Number).filter(Number.isFinite)),
        hold: new Set((b.holdTiers || []).map(Number).filter(Number.isFinite)),
      };
    }
    return m;
  }, [dictBaysSummary]);

  // (bay,tier) 집계 — bay99/999 OOG 제외(BayPlan3D와 동일 규칙)
  const model = useMemo(() => {
    const cell = {};           // `${bay}|${tier}` → {n, done, ptk, xray}
    const bays = new Set();
    const deckT = new Set(), holdT = new Set();
    for (const c of containers) {
      if (!c || !c.cn || !c.bay) continue;
      const bn = parseInt(c.bay, 10);
      const tn = parseInt(c.tier, 10);
      if (!Number.isFinite(bn) || bn >= 99 || !Number.isFinite(tn)) continue;
      bays.add(bn);
      const d = dict[bn];
      const isDeck = d ? d.deck.has(tn) : tn >= 60;   // 사전이 진실, 없으면 60 폴백
      (isDeck ? deckT : holdT).add(tn);
      const k = `${bn}|${tn}`;
      const e = (cell[k] ||= { n: 0, done: 0, ptk: 0, xray: 0 });
      e.n += 1;
      if (compMap[c.cn]) e.done += 1;
      if (xrayMap[c.cn]) e.xray += 1;
      const port = mode === 'discharge' ? c.pod : c.pol;
      if (isPyeongtaekPort(port)) e.ptk += 1;
    }
    // 사전에만 있는 베이(빈 베이)도 축에 표시 — 배 형태 유지
    for (const bn of Object.keys(dict)) bays.add(parseInt(bn, 10));
    const bayList = [...bays].sort((a, b) => a - b);
    const deckTiers = [...deckT].sort((a, b) => b - a);   // 위→아래 (큰 티어 위)
    const holdTiers = [...holdT].sort((a, b) => b - a);
    return { cell, bayList, deckTiers, holdTiers };
  }, [containers, dict, mode, compMap, xrayMap]);

  const { cell, bayList, deckTiers, holdTiers } = model;
  if (!bayList.length) {
    return <div className="text-slate-400 text-sm p-6 text-center">표시할 베이가 없습니다 (EDI/사전 확인)</div>;
  }

  // ── SVG 좌표계: 선수(bow)를 오른쪽에 — 베이 번호는 선수가 작다 → 역순 배치
  const CW = 34, CH = 16, GAP = 3;                     // 셀 폭/높이/베이 간격
  const bx = (i) => 60 + (bayList.length - 1 - i) * (CW + GAP);
  const deckH = deckTiers.length * CH;
  const holdH = holdTiers.length * CH;
  const yDeckTop = 46;
  const yHatch = yDeckTop + deckH + 4;                 // 해치커버 라인
  const yHoldTop = yHatch + 8;
  const H = yHoldTop + holdH + 46;
  const W = 60 + bayList.length * (CW + GAP) + 90;     // 우측 선수 여백

  const modeFill = mode === 'discharge' ? '#0284c7' : '#d97706';   // 미완료: 양하 파랑 / 선적 주황
  const cellRect = (bn, tn, y) => {
    const e = cell[`${bn}|${tn}`];
    const i = bayList.indexOf(bn);
    const x = bx(i);
    if (!e) return <rect key={`${bn}|${tn}`} x={x} y={y} width={CW} height={CH} fill="#0f172a" stroke="#1e293b" strokeWidth="0.5" />;
    const allDone = e.done >= e.n && e.n > 0;
    const fill = e.ptk === 0 ? '#475569' : allDone ? '#059669' : modeFill;
    return (
      <g key={`${bn}|${tn}`}>
        <rect x={x} y={y} width={CW} height={CH} fill={fill} stroke={e.xray ? '#facc15' : '#0f172a'} strokeWidth={e.xray ? 1.5 : 0.5} rx="1.5" />
        <text x={x + CW / 2} y={y + CH / 2 + 3.5} textAnchor="middle" fontSize="9" fontWeight="700"
              fill={allDone ? '#d1fae5' : '#f8fafc'}>{allDone ? `✓${e.n}` : e.n}</text>
      </g>
    );
  };

  // 선체 실루엣 path (단순 곡선: 선미 수직 → 바닥 → 선수 곡선 상승)
  const xL = 46, xR = 60 + bayList.length * (CW + GAP) + 14;
  const yBot = yHoldTop + holdH + 14;
  const hull = `M ${xL} ${yHatch - 2} L ${xL} ${yBot - 8} Q ${xL} ${yBot} ${xL + 16} ${yBot} L ${xR - 34} ${yBot} Q ${xR + 24} ${yBot - 6} ${xR + 30} ${yHatch - 2}`;

  return (
    <div className="overflow-auto">
      <svg viewBox={`0 0 ${W + 40} ${H}`} className="w-full min-w-[720px]" style={{ maxHeight: '74vh' }}>
        {/* 선체 실루엣 + 브리지(선미측) */}
        <path d={hull} fill="none" stroke="#334155" strokeWidth="2.5" />
        <rect x={xL - 26} y={yDeckTop - 18} width="22" height={yHatch - yDeckTop + 14} fill="none" stroke="#334155" strokeWidth="2" rx="2" />
        <line x1={xL - 30} y1={yHatch - 2} x2={xR + 32} y2={yHatch - 2} stroke="#64748b" strokeWidth="2" strokeDasharray="6 3" />
        <text x={xL - 15} y={yDeckTop - 24} textAnchor="middle" fontSize="9" fill="#64748b">브리지</text>
        <text x={xR + 26} y={yBot + 12} textAnchor="end" fontSize="9" fill="#64748b">▶ 선수</text>

        {/* 티어 라벨 */}
        {deckTiers.map((t, r) => (
          <text key={`dt${t}`} x={40} y={yDeckTop + r * CH + CH / 2 + 3} textAnchor="end" fontSize="8.5" fill="#7dd3fc">{String(t).padStart(2, '0')}</text>
        ))}
        {holdTiers.map((t, r) => (
          <text key={`ht${t}`} x={40} y={yHoldTop + r * CH + CH / 2 + 3} textAnchor="end" fontSize="8.5" fill="#a5b4fc">{String(t).padStart(2, '0')}</text>
        ))}

        {/* 셀 + 베이 라벨/클릭 */}
        {bayList.map((bn, i) => (
          <g key={bn} className="cursor-pointer" onClick={() => onPickBay?.(bn)}>
            {deckTiers.map((t, r) => cellRect(bn, t, yDeckTop + r * CH))}
            {holdTiers.map((t, r) => cellRect(bn, t, yHoldTop + r * CH))}
            <text x={bx(i) + CW / 2} y={H - 22} textAnchor="middle" fontSize="9.5" fontWeight="800"
                  fill="#e2e8f0">{String(bn).padStart(2, '0')}</text>
            {/* 클릭 히트 영역 */}
            <rect x={bx(i)} y={yDeckTop - 4} width={CW} height={H - yDeckTop - 22} fill="transparent" />
          </g>
        ))}

        {/* 범례 */}
        <g fontSize="8.5" fill="#94a3b8">
          <rect x={60} y={H - 12} width="10" height="8" fill={modeFill} rx="1.5" /><text x={74} y={H - 5}>미완료</text>
          <rect x={112} y={H - 12} width="10" height="8" fill="#059669" rx="1.5" /><text x={126} y={H - 5}>완료</text>
          <rect x={158} y={H - 12} width="10" height="8" fill="#475569" rx="1.5" /><text x={172} y={H - 5}>통과</text>
          <rect x={204} y={H - 12} width="10" height="8" fill="#0f172a" stroke="#facc15" strokeWidth="1.5" rx="1.5" /><text x={218} y={H - 5}>XRAY</text>
        </g>
      </svg>
    </div>
  );
}
