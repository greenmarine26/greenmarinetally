import React, { useState } from 'react';
import { X, UserPlus, User } from 'lucide-react';

export default function InspectorModal({ current, inspectors, onSelect, onClose }) {
  const [newName, setNewName] = useState('');
  const list = Object.values(inspectors || {})
    .filter(i => i && i.name)
    .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));

  const handleAdd = () => {
    const n = newName.trim();
    if (!n) return;
    onSelect(n);
    setNewName('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-lg text-amber-200">검수원 선택</div>
          {current && (
            <button onClick={onClose} className="p-1 rounded hover:bg-slate-800">
              <X className="w-5 h-5 text-slate-400"/>
            </button>
          )}
        </div>

        {list.length > 0 && (
          <div className="space-y-1.5 mb-4 max-h-72 overflow-y-auto">
            {list.map(i => (
              <button
                key={i.name}
                onClick={() => onSelect(i.name)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border transition ${
                  i.name === current
                    ? 'bg-amber-900/40 border-amber-600/60 text-amber-100'
                    : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-slate-200'
                }`}
              >
                <span className="w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-slate-900 text-xs font-black flex-shrink-0">
                  {i.name[0]}
                </span>
                <span className="font-bold text-sm truncate flex-1 text-left">{i.name}</span>
                {i.lastActive && (Date.now() - i.lastActive) < 60000 && (
                  <span className="bg-emerald-700/40 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-bold">●작업중</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-slate-700 pt-3">
          <div className="text-[11px] text-slate-400 mb-1.5 font-bold">+ 새 검수원 추가</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="이름 입력"
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              autoFocus={list.length === 0}
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="bg-amber-700 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 px-4 py-2 rounded text-sm font-bold text-amber-100 flex items-center gap-1"
            >
              <UserPlus className="w-4 h-4"/>추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
