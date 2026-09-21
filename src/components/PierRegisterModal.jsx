// 현재 GPS 위치를 PCTC·PNCT 부두 좌표로 등록하는 모달 — 3.54: 홈 화면의 부두 위치 카드에서 수석 대시보드로 옮겼다(기능은 그대로)
import React, { useState, useEffect } from 'react';
import { X, MapPin, Loader2, Anchor } from 'lucide-react';
import { fbSavePierCoord } from '../firebase.js';
import { detectPierByGps, savePierCoord } from '../utils.js';

export default function PierRegisterModal({ inspector = '', onClose }) {
  const [gpsState, setGpsState] = useState('idle');   // 'loading' | 'denied' | 'ok' | 'far'
  const [coord, setCoord] = useState(null);
  const [pier, setPier] = useState(null);
  const [note, setNote] = useState({ msg: '', error: false });

  const measure = () => {
    if (!navigator.geolocation) { setGpsState('denied'); return; }
    setGpsState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const p = detectPierByGps(c.lat, c.lng);
        setCoord(c); setPier(p); setGpsState(p ? 'ok' : 'far');
      },
      (err) => { console.warn('[부두 좌표 등록] GPS 실패:', err.message); setGpsState('denied'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { measure(); }, []);

  const register = async (code) => {
    if (!coord) { setNote({ msg: 'GPS 좌표 없음 — 먼저 [다시 측정]', error: true }); return; }
    if (!confirm(`현재 위치(${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)})를\n${code} 부두 좌표로 등록하시겠습니까?\n\n모든 검수원에게 즉시 공유됩니다.`)) return;
    const saved = savePierCoord(code, coord.lat, coord.lng, inspector || '');
    if (!saved) { setNote({ msg: '저장 실패', error: true }); return; }
    try {
      await fbSavePierCoord(code, saved);
      setNote({ msg: `✅ ${code} 등록 완료 — 모든 검수원에게 공유됐습니다`, error: false });
    } catch (e) {
      setNote({ msg: `⚠️ 이 기기에는 저장됐지만 공유에 실패했습니다 — ${e && e.message ? e.message : '연결 확인'}`, error: true });
    }
    try { localStorage.removeItem('gm_current_pier'); } catch (e) { console.warn('[부두 좌표 등록] 캐시 비우기 실패', e); }
    setTimeout(measure, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-ink-900 border border-line rounded-btn w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-amber-300" />
          <span className="font-bold text-sm text-dim-100">부두 좌표 등록</span>
          <button onClick={onClose} className="ml-auto text-dim-400 hover:text-dim-100" aria-label="닫기" style={{ minWidth: 44, minHeight: 44 }}><X className="w-4 h-4 inline" /></button>
        </div>
        <div className="text-xs text-dim-200 mb-2">
          {gpsState === 'loading' && <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> 위치 확인 중...</span>}
          {gpsState === 'ok' && pier && <span>현 위치: <b>{pier.code}</b> <span className="text-dim-400">({pier.distance}m)</span></span>}
          {gpsState === 'far' && <span className="text-amber-300">평택항 외부 (저장된 부두에서 5km 이상)</span>}
          {gpsState === 'denied' && <span className="text-red-300">위치를 못 읽었습니다 — 브라우저의 위치 권한을 확인해 주세요</span>}
        </div>
        {coord && <div className="text-2xs text-dim-400 mono mb-3">현재 좌표: {coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}</div>}
        <div className="flex flex-wrap gap-1.5">
          <button onClick={measure} className="text-xs px-3 py-2 bg-ink-800 hover:bg-ink-750 rounded-pill text-dim-200" style={{ minHeight: 44 }}>🔄 다시 측정</button>
          <button onClick={() => register('PCTC')} className="text-xs px-3 py-2 bg-blue-900/60 hover:bg-blue-800/80 rounded-pill text-blue-200 font-bold border border-blue-700/40" style={{ minHeight: 44 }}>
            <Anchor className="w-3 h-3 inline mr-1" />여기를 PCTC로 등록
          </button>
          <button onClick={() => register('PNCT')} className="text-xs px-3 py-2 bg-purple-900/60 hover:bg-purple-800/80 rounded-pill text-purple-200 font-bold border border-purple-700/40" style={{ minHeight: 44 }}>
            <Anchor className="w-3 h-3 inline mr-1" />여기를 PNCT로 등록
          </button>
        </div>
        {note.msg && <div className={`mt-2 text-xs font-bold ${note.error ? 'text-red-300' : 'text-emerald-300'}`}>{note.msg}</div>}
        <div className="mt-2 text-2xs text-dim-400">부두 현장에서 눌러야 합니다. 홈 목록의 부두 자동 고르기가 이 좌표를 씁니다.</div>
      </div>
    </div>
  );
}
