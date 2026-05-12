// M5.73: 인원 관리 전용 모달 (김성일만 진입)
//   InspectorModal과 분리 — 선택과 관리를 명확히 구분
import React, { useState } from 'react';
import { X, UserPlus, Trash2, Shield, RefreshCw } from 'lucide-react';
import { isStaff, getStaffRole, STAFF_LIST, STAFF_NAMES } from '../staffList.js';
import { fbAddStaff, fbDeleteStaff, fbDeleteInspector, fbMarkDeletedStaff, fbUnmarkDeletedStaff } from '../firebase.js';

const ADMIN_NAME = '김성일';

export default function StaffManagerModal({ current, inspectors, extraStaff = {}, deletedStaff = {}, onClose }) {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('검수');
  const [filter, setFilter] = useState('all'); // all | inspectors | staff

  // 관리자 아니면 차단
  if (current !== ADMIN_NAME) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
        <div className="bg-slate-900 border border-red-700 rounded-xl p-6 max-w-sm text-center">
          <div className="text-red-300 font-bold mb-2">⛔ 권한 없음</div>
          <div className="text-slate-300 text-sm mb-4">인원 관리는 관리자(<b>{ADMIN_NAME}</b>)만 가능합니다.</div>
          <button onClick={onClose} className="bg-slate-700 px-4 py-2 rounded text-white">확인</button>
        </div>
      </div>
    );
  }

  // 전체 명단: STAFF_LIST (기본) + extraStaff (Firebase 동적) 합침
  const extraList = Object.values(extraStaff || {}).filter(s => s && s.name);
  const allStaff = [
    ...STAFF_LIST,
    ...extraList.filter(s => !STAFF_NAMES.includes(s.name)),
  ];

  // 현재 접속 중인 검수원 (Firebase inspectors)
  const inspectorList = Object.values(inspectors || {}).filter(i => i && i.name);
  const inspectorMap = Object.fromEntries(inspectorList.map(i => [i.name, i]));

  // 필터링 (퇴사자 제외 기본 / 별도 보기 가능)
  const isDeleted = (name) => !!deletedStaff[name];
  let filtered;
  if (filter === 'inspectors') filtered = allStaff.filter(s => inspectorMap[s.name] && !isDeleted(s.name));
  else if (filter === 'deleted') filtered = allStaff.filter(s => isDeleted(s.name));
  else filtered = allStaff.filter(s => !isDeleted(s.name));

  const handleAdd = async () => {
    const raw = newName.trim();
    if (!raw) return;
    if (!/^[가-힣a-zA-Z0-9]{2,10}$/.test(raw)) {
      alert('이름은 한글/영문 2~10자만 가능합니다.');
      return;
    }
    if (STAFF_NAMES.includes(raw) || extraList.some(s => s.name === raw)) {
      alert(`"${raw}" — 이미 명단에 있습니다.`);
      return;
    }
    if (!confirm(`"${raw}" (${newRole}) — 신규 직원 추가하시겠습니까?\n(Firebase 영구 저장 — 전 직원 접속 가능)`)) return;
    try {
      await fbAddStaff(raw, newRole);
      setNewName('');
      setNewRole('검수');
    } catch (e) {
      alert('추가 실패: ' + e.message);
    }
  };

  const handleDeleteStaff = async (name) => {
    if (name === ADMIN_NAME) { alert('관리자 본인은 삭제할 수 없습니다.'); return; }
    if (!confirm(`"${name}" — 퇴사 처리하시겠습니까?\n(접속 차단 + 명단 숨김. 복구 가능)`)) return;
    try {
      // Firebase 동적 명단에 있으면 삭제
      if (extraStaff[name]) await fbDeleteStaff(name);
      // 검수원 활동 기록 삭제
      if (inspectorMap[name]) await fbDeleteInspector(name);
      // M5.74: 코드 명단도 deletedStaff 마커로 제외 (퇴사자 처리)
      await fbMarkDeletedStaff(name);
    } catch (e) {
      alert('삭제 실패: ' + e.message);
    }
  };

  // M5.74: 퇴사 처리 복구
  const handleRestore = async (name) => {
    if (!confirm(`"${name}" — 복구하시겠습니까?\n(다시 접속 가능)`)) return;
    try {
      await fbUnmarkDeletedStaff(name);
    } catch (e) {
      alert('복구 실패: ' + e.message);
    }
  };

  const handleKickInspector = async (name) => {
    if (name === ADMIN_NAME) return;
    if (!confirm(`"${name}" 접속 기록을 제거하시겠습니까?\n(명단에는 남음, 다시 접속 가능)`)) return;
    try {
      await fbDeleteInspector(name);
    } catch (e) {
      alert('제거 실패: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
      <div className="bg-slate-900 border border-amber-700 rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <div>
              <div className="font-bold text-amber-200">인원 관리</div>
              <div className="text-[10px] text-slate-400">관리자: {ADMIN_NAME}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-1 p-2 border-b border-slate-700">
          <button onClick={() => setFilter('all')}
            className={`flex-1 py-2 text-xs rounded ${filter === 'all' ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
            재직 ({allStaff.filter(s => !deletedStaff[s.name]).length})
          </button>
          <button onClick={() => setFilter('inspectors')}
            className={`flex-1 py-2 text-xs rounded ${filter === 'inspectors' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
            접속 ({inspectorList.filter(i => !deletedStaff[i.name]).length})
          </button>
          <button onClick={() => setFilter('deleted')}
            className={`flex-1 py-2 text-xs rounded ${filter === 'deleted' ? 'bg-red-800 text-white' : 'bg-slate-800 text-slate-300'}`}>
            퇴사 ({Object.keys(deletedStaff).length})
          </button>
        </div>

        {/* 신규 추가 폼 */}
        <div className="p-3 border-b border-slate-700 bg-slate-800/30">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1"><UserPlus className="w-3 h-3"/> 신규 직원 추가</div>
          <div className="flex gap-2">
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="이름" className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-100"/>
            <select value={newRole} onChange={e => setNewRole(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-100">
              <option>검수</option>
              <option>대리</option>
              <option>과장</option>
              <option>차장</option>
              <option>부장</option>
            </select>
            <button onClick={handleAdd}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded text-sm font-bold">추가</button>
          </div>
        </div>

        {/* 명단 리스트 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map(s => {
            const isActive = inspectorMap[s.name] && (Date.now() - (inspectorMap[s.name].lastActive || 0)) < 60000;
            const isOnline = !!inspectorMap[s.name];
            const isDynamic = !STAFF_NAMES.includes(s.name);  // Firebase에 동적 추가된 직원
            return (
              <div key={s.name} className="flex items-center gap-2 px-2 py-1.5 bg-slate-800/50 border border-slate-700 rounded">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  s.name === ADMIN_NAME ? 'bg-amber-500 text-slate-900' : 'bg-slate-600 text-slate-200'
                }`}>{s.name[0]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-sm font-bold text-slate-100">
                    {s.name}
                    {s.name === ADMIN_NAME && <span className="text-[9px] bg-amber-900 text-amber-300 px-1 rounded">관리자</span>}
                    {isDynamic && <span className="text-[9px] bg-purple-900 text-purple-300 px-1 rounded">추가됨</span>}
                    {isDeleted(s.name) && <span className="text-[9px] bg-red-900 text-red-300 px-1 rounded">퇴사</span>}
                  </div>
                  <div className="text-[10px] text-slate-400">{s.role}</div>
                </div>
                {isActive && <span className="text-[9px] bg-emerald-700/40 text-emerald-300 px-1.5 py-0.5 rounded font-bold">●작업중</span>}
                {isOnline && !isActive && <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">접속이력</span>}
                {/* 액션 버튼 */}
                {s.name !== ADMIN_NAME && (
                  <div className="flex gap-1">
                    {isDeleted(s.name) ? (
                      <button onClick={() => handleRestore(s.name)}
                        className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-white text-xs font-bold" title="복구 (재입사)">
                        복구
                      </button>
                    ) : (
                      <>
                        {isOnline && (
                          <button onClick={() => handleKickInspector(s.name)}
                            className="p-1.5 hover:bg-orange-900/40 rounded text-orange-400" title="접속 기록 제거">
                            <RefreshCw className="w-3.5 h-3.5"/>
                          </button>
                        )}
                        <button onClick={() => handleDeleteStaff(s.name)}
                          className="p-1.5 hover:bg-red-900/40 rounded text-red-400" title="퇴사 처리">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-700 text-[10px] text-slate-500">
          🗑 퇴사 처리 (접속 차단, 복구 가능) · 🔄 접속 기록만 제거
        </div>
      </div>
    </div>
  );
}
