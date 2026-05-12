import React, { useState } from 'react';
import { X, UserPlus, User } from 'lucide-react';
import { isStaff, getStaffRole, STAFF_NAMES } from '../staffList.js';
// fbDeleteInspector 등은 StaffManagerModal에서 사용

// 삭제 권한자 (오직 한 사람)
const ADMIN_NAME = '김성일';

export default function InspectorModal({ current, inspectors, extraStaff = {}, deletedStaff = {}, onSelect, onClose }) {
  const [newName, setNewName] = useState('');
  const list = Object.values(inspectors || {})
    .filter(i => i && i.name)
    .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));

  // M5.61: 이름 정규화 — 공백/콤마/특수문자 제거 후 비교 (이종현 vs "이종현 ," 동일 인식)
  const normalizeName = (s) => String(s || '')
    .trim()
    .replace(/[,\s\.\-_\/\\]/g, '')  // 공백/콤마/마침표/대시/언더바/슬래시 제거
    .toLowerCase();

  // 화이트리스트 (코드 명단 + Firebase 동적 명단 - 퇴사자 제외)
  const extraNames = Object.values(extraStaff || {}).map(s => s.name).filter(Boolean);
  const allWhitelist = [...STAFF_NAMES, ...extraNames].filter(n => !deletedStaff[n]);
  const isAllowed = (name) => allWhitelist.some(n => normalizeName(n) === normalizeName(name));

  // M5.73: 선택만 처리 (관리는 별도 StaffManagerModal)
  const handleAdd = () => {
    const raw = newName.trim();
    if (!raw) return;
    if (!/^[가-힣a-zA-Z0-9]{2,10}$/.test(raw)) {
      alert('이름은 한글/영문 2~10자만 가능합니다.');
      return;
    }
    if (!isAllowed(raw)) {
      const hint = allWhitelist.filter(n => n.includes(raw.slice(0,2)) || raw.includes(n.slice(0,2)));
      const hintTxt = hint.length > 0 ? `\n\n비슷한 이름: ${hint.slice(0,5).join(', ')}` : '';
      alert(`"${raw}" — 그린마린 직원 명단에 없습니다.\n정확한 이름으로 입력하세요.${hintTxt}\n\n새 직원 등록은 관리자(${ADMIN_NAME})에게 요청하세요.`);
      return;
    }
    const norm = normalizeName(raw);
    const exactName = allWhitelist.find(n => normalizeName(n) === norm);
    onSelect(exactName);
    setNewName('');
  };

  const isAdmin = current === ADMIN_NAME;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-bold text-lg text-amber-200">검수원 선택</div>
            {(() => {
              const active = list.filter(i => i.lastActive && (Date.now() - i.lastActive) < 60000);
              return active.length > 0 ? (
                <div className="text-[11px] text-emerald-300 mt-0.5">● 현재 {active.length}명 작업중: {active.map(a => a.name).join(', ')}</div>
              ) : null;
            })()}
          </div>
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
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate text-left">{i.name}</div>
                  {getStaffRole(i.name) && (
                    <div className="text-[10px] text-slate-400 truncate text-left">{getStaffRole(i.name)}</div>
                  )}
                </div>
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
