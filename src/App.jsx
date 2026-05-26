import React, { useState } from 'react';
import ShipList from './pages/ShipList.jsx';
import BayBuilder from './pages/BayBuilder.jsx';
import CargoPlanView from './pages/CargoPlanView.jsx';
import { getShip } from './lib/shipDict.js';

const APP_VERSION = 'MP1.0.0';

export default function App() {
  // 페이지: 'list' | 'builder' | 'cargo'
  const [page, setPage] = useState('list');
  const [activeShipCode, setActiveShipCode] = useState(null);

  const openBuilder = (code) => {
    setActiveShipCode(code);
    setPage('builder');
  };
  const openCargo = (code) => {
    setActiveShipCode(code);
    setPage('cargo');
  };
  const goList = () => {
    setActiveShipCode(null);
    setPage('list');
  };

  const activeShip = activeShipCode ? getShip(activeShipCode) : null;

  return (
    <div className="h-full flex flex-col">
      {/* 글로벌 작은 헤더 (버전 표시) */}
      <div className="bg-slate-950 border-b border-slate-800 px-3 py-1 text-[10px] text-slate-500 flex justify-between">
        <span>📚 MasterPlan {APP_VERSION}</span>
        <span>검수앱과 분리 · localStorage: <code>masterplan_dict_v1</code></span>
      </div>

      <div className="flex-1 min-h-0">
        {page === 'list' && (
          <ShipList onOpenBuilder={openBuilder} onOpenCargo={openCargo} />
        )}
        {page === 'builder' && activeShip && (
          <BayBuilder
            ship={activeShip}
            onBack={goList}
            onSaved={() => { /* 저장 후에도 페이지 유지 */ }}
          />
        )}
        {page === 'builder' && !activeShip && (
          <div className="p-4 text-slate-500">선박 데이터 없음 <button onClick={goList} className="ml-2 px-2 py-1 bg-slate-700 rounded">뒤로</button></div>
        )}
        {page === 'cargo' && activeShipCode && (
          <CargoPlanView code={activeShipCode} onBack={goList} />
        )}
      </div>
    </div>
  );
}
