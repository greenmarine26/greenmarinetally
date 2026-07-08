import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Home, Anchor, Power, HelpCircle, Truck, LogOut, Key } from 'lucide-react';
import { exitApp } from '../backHandler.js';
import HelpModal from './HelpModal.jsx';
import GeminiKeyModal from './GeminiKeyModal.jsx';
import ConfirmModal, { useConfirm } from './ConfirmModal.jsx';
import { getEquipNumber, setEquipNumber, _storage, SK, getPierFromBerth, equipNumbersForPier } from '../utils.js';

export default function Header({ version, inspector, online, route, voyages, onChangeInspector, onGoHome, onLogout, onOpenStaffManager}) {
  const cur = route.name === 'voyage' ? voyages[route.voyageKey] : null;
  const info = cur?.info;
  // V8.10: 현재 항차 부두 기준 장비 목록. 항차 없으면 1~5 전체.
  const equipNumbers = equipNumbersForPier(getPierFromBerth(info?.berth || ''));
  const [helpOpen, setHelpOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);   // M6.14d: Gemini 키 설정 모달
  // M5.0: 영어회화집은 HelpModal 안의 [영어회화] 탭으로 이동 (헤더에서 별도 버튼 제거)
  const [equipOpen, setEquipOpen] = useState(false);
  const [equipNo, setEquipNoState] = useState(getEquipNumber());
  // M3.74: confirm() → ConfirmModal
  const [confirmState, askConfirm] = useConfirm();
  // M6.14d: 사용자 키 미설정 시 경고 (헤더 키 버튼 점멸)
  const hasUserKey = !!_storage.get(SK.geminiKey);

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
            <button onClick={onGoHome}
              title="홈으로 (항차 선택 화면)"
              className="p-1.5 rounded bg-blue-900/40 hover:bg-blue-900/70 active:bg-blue-900/90 border border-blue-700/50 flex-shrink-0">
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
              {/* V8.82: 모드 따라 항차 표시 — 양하=voy_d, 선적=voy_l (구: 항상 voy_d 우선이라 선적 중에도 양하 항차가 보임) */}
              {info ? `${(route?.mode === 'loading' ? (info.voy_l || info.voy_d) : (info.voy_d || info.voy_l)) || info.voy || ''} · ${info.carrier || ''}` : '🌊 그린마린 검수팀 전용'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {online
            ? <Cloud className="w-3.5 h-3.5 text-emerald-400" title={`실시간 연결됨 · ${version}`}/>
            : <CloudOff className="w-3.5 h-3.5 text-red-400" title={`오프라인 · ${version}`}/>}
          {/* M5.82: 버전 표시 헤더에서 제거 (홈 버튼 가림 해결). 도움말 안에서 확인 가능 */}
          <button
            onClick={() => setHelpOpen(true)}
            title={`사용 매뉴얼 · ${version}`}
            className="p-1.5 rounded bg-amber-900/30 hover:bg-amber-900/60 active:bg-amber-900/80 border border-amber-700/40"
          >
            <HelpCircle className="w-4 h-4 text-amber-300"/>
          </button>
          {/* M6.14d: Gemini API 키 설정 — 사용자 키 미설정 시 빨간 점멸 */}
          <button
            onClick={() => setKeyOpen(true)}
            title={hasUserKey ? 'Gemini API 키 (본인 키 설정됨)' : 'Gemini API 키 설정 필요 (현재 차단된 내장 키 사용)'}
            className={`p-1.5 rounded border ${
              hasUserKey
                ? 'bg-emerald-900/30 hover:bg-emerald-900/60 border-emerald-700/40'
                : 'bg-red-900/40 hover:bg-red-900/70 border-red-600/60 animate-pulse'
            }`}
          >
            <Key className={`w-4 h-4 ${hasUserKey ? 'text-emerald-300' : 'text-red-300'}`}/>
          </button>
          {/* M3.5.6: 장비 번호 빠른 변경 */}
          <button
            onClick={() => setEquipOpen(true)}
            title="장비 번호 변경"
            className={`px-1.5 py-1 rounded text-xs font-bold flex items-center gap-0.5 ${
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
            className="bg-amber-900/40 border border-amber-700/40 px-1.5 py-1 rounded text-xs flex items-center gap-1 active:bg-amber-900/60"
          >
            <span className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-slate-900 text-[10px] font-black">
              {(inspector && inspector[0]) || '?'}
            </span>
            <span className="font-bold text-amber-200 max-w-[48px] truncate">{inspector || '검수원'}</span>
          </button>
          {onOpenStaffManager && (
            <button
              onClick={onOpenStaffManager}
              className="p-1.5 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700 rounded text-amber-300 text-xs font-bold"
              title="인원 관리"
            >⚙</button>
          )}
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
      {/* M6.14d: Gemini API 키 설정 모달 */}
      {keyOpen && <GeminiKeyModal onClose={() => setKeyOpen(false)} />}
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
              {equipNumbers.map(num => (
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
