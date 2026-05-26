import React, { useState, useEffect } from 'react';
import { listShips, getShip, saveShip, deleteShip, toTallymanFormat, fromTallymanFormat } from '../lib/shipDict.js';

/**
 * 선박 리스트 (메인 화면)
 * - 등록된 선박 목록
 * - 신규 추가
 * - 선택 → 베이사전 빌더 또는 전체 카고플랜
 */
export default function ShipList({ onOpenBuilder, onOpenCargo }) {
  const [ships, setShips] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newShip, setNewShip] = useState({ code: '', name: '', imo: '', callsign: '' });
  const fileInputRef = React.useRef(null);

  const reload = () => setShips(listShips().sort((a, b) => a.code.localeCompare(b.code)));
  useEffect(() => { reload(); }, []);

  const handleAdd = () => {
    if (!newShip.code) { alert('CASP 코드 필수 (예: DXQD)'); return; }
    const code = newShip.code.trim().toUpperCase();
    if (getShip(code)) { alert(`${code} 이미 등록됨`); return; }
    const ship = {
      code,
      name: newShip.name.trim(),
      imo: newShip.imo.trim(),
      callsign: newShip.callsign.trim().toUpperCase(),
      bays: [],
    };
    saveShip(ship);
    setNewShip({ code: '', name: '', imo: '', callsign: '' });
    setAddOpen(false);
    reload();
    onOpenBuilder(ship.code);
  };

  const handleDelete = (code) => {
    if (!confirm(`${code} 베이사전 삭제? 되돌릴 수 없습니다.`)) return;
    deleteShip(code);
    reload();
  };

  // ──── Export JSON (검수앱 import용) ─────────────────────
  const handleExport = (code) => {
    const ship = getShip(code);
    if (!ship) return;
    const tallyman = toTallymanFormat(ship);
    const blob = new Blob([JSON.stringify(tallyman, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${code}_baydict_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    const all = ships.map(s => toTallymanFormat(getShip(s.code)));
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `masterplan_all_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ──── Import JSON ─────────────────────────────────────
  const handleImportClick = () => fileInputRef.current?.click();
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const entries = Array.isArray(data) ? data : [data];
      let imported = 0, skipped = 0;
      for (const entry of entries) {
        const ship = fromTallymanFormat(entry);
        if (!ship?.code) { skipped++; continue; }
        if (getShip(ship.code) && !confirm(`${ship.code} 이미 존재. 덮어쓸까요?`)) {
          skipped++; continue;
        }
        saveShip(ship);
        imported++;
      }
      alert(`import 완료 — 신규/덮어쓰기 ${imported}건, 건너뜀 ${skipped}건`);
      reload();
    } catch (err) {
      alert(`import 실패: ${err.message}`);
    }
    e.target.value = '';
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">📚 MasterPlan</h1>
          <div className="text-sm text-slate-400">베이사전 빌더 — 선박별 빈 카고플랜 만들기</div>
          <div className="text-xs text-slate-500 mt-1">데이터: <code>masterplan_dict_v1</code> · 검수앱과 완전 분리 · JSON Export로 검수앱 import 가능</div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setAddOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-bold">
            ➕ 신규 선박 등록
          </button>
          <button onClick={handleImportClick}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded">
            📥 JSON Import
          </button>
          {ships.length > 0 && (
            <button onClick={handleExportAll}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded">
              📤 전체 Export (JSON)
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleImportFile} />
        </div>

        {/* 선박 리스트 */}
        {ships.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded p-12 text-center">
            <div className="text-4xl mb-3">🚢</div>
            <div className="text-base mb-2">등록된 선박이 없습니다</div>
            <div className="text-sm text-slate-400 mb-4">[➕ 신규 선박 등록] 또는 [📥 JSON Import]로 시작하세요</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-slate-400 mb-1">{ships.length}개 선박 등록됨</div>
            {ships.map(s => (
              <div key={s.code} className="bg-slate-800 border border-slate-700 rounded p-3 flex items-center gap-3 hover:bg-slate-700/50">
                <div className="flex-1">
                  <div className="flex items-baseline gap-3">
                    <span className="text-cyan-400 font-mono font-bold text-base">{s.code}</span>
                    <span className="font-bold">{s.name || '(이름 없음)'}</span>
                    <span className="text-xs text-slate-500">{s.bayCount}개 베이</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    IMO: {s.imo || '-'} · 콜사인: {s.callsign || '-'} · 수정: {s.updatedAt ? new Date(s.updatedAt).toLocaleString('ko-KR') : '-'}
                  </div>
                </div>
                <button onClick={() => onOpenBuilder(s.code)}
                  className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 rounded text-sm font-bold">
                  ✏ 베이 편집
                </button>
                <button onClick={() => onOpenCargo(s.code)}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 rounded text-sm">
                  📋 카고플랜 보기
                </button>
                <button onClick={() => handleExport(s.code)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm">
                  📤 Export
                </button>
                <button onClick={() => handleDelete(s.code)}
                  className="px-2 py-1.5 bg-red-900/50 hover:bg-red-700 rounded text-sm">
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 신규 등록 모달 */}
        {addOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setAddOpen(false)}>
            <div className="bg-slate-900 rounded-lg p-5 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="text-lg font-bold mb-3">➕ 신규 선박 등록</div>
              <div className="space-y-3">
                <label className="block">
                  <div className="text-xs text-slate-400 mb-1">CASP 코드 (필수)</div>
                  <input type="text" value={newShip.code}
                    onChange={e => setNewShip({ ...newShip, code: e.target.value.toUpperCase() })}
                    placeholder="예: DXQD"
                    className="w-full px-3 py-2 bg-slate-700 rounded font-mono" autoFocus />
                </label>
                <label className="block">
                  <div className="text-xs text-slate-400 mb-1">선박명</div>
                  <input type="text" value={newShip.name}
                    onChange={e => setNewShip({ ...newShip, name: e.target.value })}
                    placeholder="예: XIN QUN DAO"
                    className="w-full px-3 py-2 bg-slate-700 rounded" />
                </label>
                <label className="block">
                  <div className="text-xs text-slate-400 mb-1">IMO</div>
                  <input type="text" value={newShip.imo}
                    onChange={e => setNewShip({ ...newShip, imo: e.target.value })}
                    placeholder="예: 9388417"
                    className="w-full px-3 py-2 bg-slate-700 rounded font-mono" />
                </label>
                <label className="block">
                  <div className="text-xs text-slate-400 mb-1">콜사인</div>
                  <input type="text" value={newShip.callsign}
                    onChange={e => setNewShip({ ...newShip, callsign: e.target.value.toUpperCase() })}
                    placeholder="예: H3OI"
                    className="w-full px-3 py-2 bg-slate-700 rounded font-mono" />
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setAddOpen(false)}
                  className="px-4 py-2 bg-slate-700 rounded">취소</button>
                <button onClick={handleAdd}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-bold">
                  등록 + 베이 편집
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
