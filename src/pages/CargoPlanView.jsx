import React from 'react';
import BayBox from '../components/BayBox.jsx';
import { getShip } from '../lib/shipDict.js';

/**
 * 카고플랜 보기 - 모든 베이를 격자로 배치
 * = 사용자가 정의한 "모든 베이플랜의 집합 = 카고플랜"
 */
export default function CargoPlanView({ code, onBack }) {
  const ship = getShip(code);
  if (!ship) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        선박 데이터 없음
        <button onClick={onBack} className="ml-3 px-3 py-1 bg-slate-700 rounded">← 뒤로</button>
      </div>
    );
  }

  const bays = (ship.bays || []).slice().sort((a, b) => parseInt(b.bay) - parseInt(a.bay));
  // 카고플랜 양식: 우측이 BAY 01 (BOW), 좌측이 큰 번호 (STERN)
  // → bay 번호 내림차순 정렬 → 왼쪽부터 큰 번호 배치 (우→좌로 작아짐)
  // grid auto-flow: row + column-reverse 효과를 위해 정렬만 활용

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 (인쇄시 안 보임) */}
      <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center gap-3 no-print">
        <button onClick={onBack} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm">
          ← 뒤로
        </button>
        <div className="flex-1">
          <div className="text-base font-bold">📋 카고플랜 (빈 도면) — {ship.name} <span className="text-cyan-400 font-mono">{ship.code}</span></div>
          <div className="text-xs text-slate-400">{bays.length}개 베이 · 검수앱이 이 베이사전을 import하면 EDI 컨테이너 자동 채움</div>
        </div>
        <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded">
          🖨 인쇄
        </button>
      </div>

      {/* 카고플랜 */}
      <div className="flex-1 overflow-auto p-4 bg-slate-900 print-area">
        <div className="bg-white text-black rounded p-4 min-h-full">
          <div className="text-center mb-3 print-header">
            <div className="text-lg font-bold">CARGO PLAN (BLANK)</div>
            <div className="text-sm">{ship.name} · {ship.code} {ship.imo && `· IMO ${ship.imo}`}</div>
          </div>
          {bays.length === 0 ? (
            <div className="text-center py-12 text-slate-500">베이 없음. 베이 편집에서 추가하세요.</div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {bays.map(b => (
                <div key={b.bay} style={{ minHeight: 220 }}>
                  <BayBox bay={b} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { padding: 0 !important; background: white !important; }
          @page { size: A4 landscape; margin: 8mm; }
        }
      `}</style>
    </div>
  );
}
