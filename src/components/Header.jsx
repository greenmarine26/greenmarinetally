import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Home, Anchor, Power, HelpCircle, Truck, LogOut } from 'lucide-react';
import { exitApp } from '../backHandler.js';
import HelpModal from './HelpModal.jsx';
import ConfirmModal, { useConfirm } from './ConfirmModal.jsx';
import { getEquipNumber, setEquipNumber } from '../utils.js';
import { EQUIPMENT_NUMBERS } from '../kakaoShare.js';

export default function Header({ version, inspector, online, route, voyages, onChangeInspector, onGoHome, onLogout }) {
  const cur = route.name === 'voyage' ? voyages[route.voyageKey] : null;
  const info = cur?.info;
  const [helpOpen, setHelpOpen] = useState(false);
  // M5.0: 영어회화집은 HelpModal 안의 [영어회화] 탭으로 이동 (헤더에서 별도 버튼 제거)
  const [equipOpen, setEquipOpen] = useState(false);
  const [equipNo, setEquipNoState] = useState(getEquipNumber());
  // M3.74: confirm() → ConfirmModal
  const [confirmState, askConfirm] = useConfirm();

  const handleLogoutOrExit = () => {
    if (onLogout) {
      onLogout();
    } else {
      askConfirm({
        title: '검수앱 종료',
        message: '검수앱을 종료하시겠습니까?\n\n(완전 종료는 폰 홈 버튼이나 앱 스위처에서 닫아주세요)',
        confirmLabel: '종료',
        cancelLabel: '취소',
        onConfirm: () => exitApp(),
      });
    }
  };

  const handleSelectEquip = (num) => {
    setEquipNumber(num);
    setEquipNoState(num);
    setEquipOpen(false);
    window.dispatchEvent(new CustomEvent('equipChanged', { detail: num }));
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {route.name !== 'home' ? (
            <button onClick={onGoHome} className="p-1.5 -ml-1 rounded hover:bg-slate-800 active:bg-slate-700 flex-shrink-0">
              <Home className="w-5 h-5 text-blue-300"/>
            </button>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-blue-900/60 border border-blue-700/40 flex items-center justify-center flex-shrink-0">
              <Anchor className="w-5 h-5 text-blue-300"/>
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-sm text-blue-100 truncate leading-tight">
              {info ? info.vsl : '평택항 검수'}
            </div>
            <div className="text-[10px] text-slate-500 truncate leading-tight">
              {info ? `${info.voy} · ${info.carrier || ''}` : '🌊 그린마린 검수팀 전용'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {online
            ? <Cloud className="w-3.5 h-3.5 text-emerald-400" title="실시간 연결됨"/>
            : <CloudOff className="w-3.5 h-3.5 text-red-400" title="오프라인"/>}
          <span className="bg-emerald-900/40 border border-emerald-600/40 text-emerald-300 text-[10px] font-black px-1.5 py-0.5 rounded mono" title="앱 버전">{version}</span>
          <button
            onClick={() => setHelpOpen(true)}
            title="사용 매뉴얼 (영어회화 포함)"
            className="p-1.5 rounded bg-amber-900/30 hover:bg-amber-900/60 active:bg-amber-900/80 border border-amber-700/40"
          >
            <HelpCircle className="w-4 h-4 text-amber-300"/>
          </button>
          {/* M5.0: 영어회화집 버튼 제거 → 도움말 안 [영어회화] 탭으로 흡수 */}
          {/* M3.5.6: 장비 번호 빠른 변경 */}
          <button
            onClick={() => setEquipOpen(true)}
            title="장비 번호 변경"
            className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${
              equipNo
                ? 'bg-orange-700 text-white border border-orange-500'
                : 'bg-slate-800 text-slate-400 border border-slate-600 animate-pulse'
            }`}
          >
            <Truck className="w-3 h-3"/>
            {equipNo || '장비?'}
          </button>
          <button
            onClick={onChangeInspector}
            className="bg-amber-900/40 border border-amber-700/40 px-2 py-1 rounded text-xs flex items-center gap-1 active:bg-amber-900/60"
          >
            <span className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-slate-900 text-[10px] font-black">
              {(inspector && inspector[0]) || '?'}
            </span>
            <span className="font-bold text-amber-200 max-w-[60px] truncate">{inspector || '검수원'}</span>
            <RefreshCw className="w-3 h-3 text-amber-400"/>
          </button>
          <button
            onClick={handleLogoutOrExit}
            title={onLogout ? '로그아웃 (인사 후 종료)' : '앱 종료'}
            className="p-1.5 rounded bg-purple-900/40 hover:bg-purple-900/70 active:bg-purple-900/90 border border-purple-600/50"
          >
            <LogOut className="w-4 h-4 text-purple-200"/>
          </button>
        </div>
      </div>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)}/>
      {/* M5.0: ContainerPhrasebook은 HelpModal 안에서 호출됨 */}

      {/* M3.5.6: 장비 번호 선택 모달 */}
      {equipOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setEquipOpen(false)}>
          <div className="bg-slate-900 border-2 border-orange-700 rounded-2xl w-full max-w-sm p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-5 h-5 text-orange-400"/>
              <span className="font-bold text-orange-300">장비 번호 선택</span>
            </div>
            <div className="text-[11px] text-slate-400 mb-3">현재 작업 중인 장비를 선택하세요. 작업 보고에 자동 포함됩니다.</div>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_NUMBERS.map(num => (
                <button key={num} onClick={() => handleSelectEquip(num)}
                  className={`py-4 rounded-lg font-black text-lg ${
                    equipNo === num ? 'bg-orange-600 text-white border-2 border-orange-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}>
                  {num}
                </button>
              ))}
            </div>
            {equipNo && (
              <button onClick={() => handleSelectEquip('')}
                className="w-full mt-2 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs">
                장비 번호 해제
              </button>
            )}
          </div>
        </div>
      )}

      {/* M3.74: confirm() → ConfirmModal */}
      <ConfirmModal {...confirmState} />
    </header>
  );
}
