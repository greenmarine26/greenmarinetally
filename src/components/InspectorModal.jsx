import React, { useState, useEffect } from 'react';
import { X, UserPlus, User } from 'lucide-react';
import { isStaff, getStaffRole, STAFF_NAMES } from '../staffList.js';
import { inspectorStatus } from '../inspectorStatus.js';
// V9.05: 관리자 이름 보호 — 신뢰 기기 3대만 무비번, 그 외 기기는 비밀번호
import {
  MAX_TRUSTED_DEVICES,
  getAdminDeviceId, hashPassword, makeSalt, deviceLabel,
  // V9.09: 다중 관리자 — 이름 하드코딩 제거, 관리자별 개별 비밀번호
  getAdminNames, isAdminName, adminEntry, isTrustedDeviceFor, isOwnerName, OWNER_NAME,
  verifyPasswordFor, needsPasswordSetup, hasSessionPassFor, setSessionPassFor,
} from '../adminGuard.js';
import { fbGetAdminGuard, fbUpdateAdminGuard } from '../firebase.js';
// fbDeleteInspector 등은 StaffManagerModal에서 사용

// V9.09(2026-07-26): 관리자는 이제 Firebase admin_guard/admins 목록이 정한다.
//   종전에는 여기에 이름이 박혀 있어(const ADMIN_NAME = '김성일') 담당자가 바뀌면
//   소스를 고쳐 재배포해야만 인수인계가 됐다. 앱 안에서 넘길 수 있게 바꾼다.

export default function InspectorModal({ current, inspectors, extraStaff = {}, deletedStaff = {}, onSelect, onClose }) {
  const [newName, setNewName] = useState('');
  // ── V9.05: 관리자 이름 가드 상태 ──────────────────────────────────────
  const [guard, setGuard] = useState(null);          // admin_guard 노드 (null = 미설정/로딩전)
  const [guardLoaded, setGuardLoaded] = useState(false);
  const [gateMode, setGateMode] = useState(null);    // null | 'verify' | 'setup'
  const [gateName, setGateName] = useState('');      // V9.09: 지금 인증 중인 관리자 이름
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [regDevice, setRegDevice] = useState(false);
  const [gateBusy, setGateBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fbGetAdminGuard().then(g => { if (alive) { setGuard(g); setGuardLoaded(true); } });
    return () => { alive = false; };
  }, []);

  // V9.05: 이름 선택 진입점 — 관리자 이름만 가드, 나머지는 기존 그대로
  const handlePick = (name) => {
    if (!isAdminName(guard, name)) { onSelect(name); return; }   // 일반 검수원은 그대로
    if (hasSessionPassFor(name)) { onSelect(name); return; }     // 이 탭에서 이미 비번 통과
    if (!guardLoaded) { alert('관리자 보호 정보 로딩 중 — 잠시 후 다시 시도하세요.'); return; }
    setGateName(name);
    // 비번 미설정 = 권한만 받은 신규 관리자 → 본인이 직접 정한다(기존 비번을 알려줄 필요 없음)
    if (needsPasswordSetup(guard, name)) { setGateMode('setup'); return; }
    if (isTrustedDeviceFor(guard, name)) { onSelect(name); return; }   // 신뢰 기기
    setGateMode('verify');                                             // 그 외 기기 → 비밀번호
  };

  // 최초 설정: 비밀번호 등록 + 이 기기를 신뢰 기기 1호로
  const handleSetup = async () => {
    if (gateBusy) return;
    if (!pw1 || pw1.length < 4) { alert('비밀번호는 4자 이상으로 하세요.'); return; }
    if (pw1 !== pw2) { alert('비밀번호가 서로 다릅니다.'); return; }
    setGateBusy(true);
    try {
      const salt = makeSalt();
      const pwHash = await hashPassword(pw1, salt);
      const devId = getAdminDeviceId();
      // V9.09: 관리자별 개별 저장 — admins/{이름} 아래. 구버전 최상위 필드는 건드리지 않는다.
      const ok = await fbUpdateAdminGuard({
        [`admins/${gateName}/pwHash`]: pwHash,
        [`admins/${gateName}/salt`]: salt,
        [`admins/${gateName}/devices/${devId}`]: { label: `${deviceLabel()} (1호)`, addedAt: Date.now() },
      });
      if (!ok) { alert('저장 실패 — 네트워크를 확인하세요.'); return; }
      setSessionPassFor(gateName);
      setGateMode(null); setPw1(''); setPw2('');
      alert(`✅ ${gateName} 관리자 비밀번호 설정 완료 — 이 기기가 신뢰 기기 1호로 등록됐습니다.\n다른 기기에서는 비밀번호를 넣고 "기기 등록"을 체크하면 신뢰 기기(최대 ${MAX_TRUSTED_DEVICES}대)가 됩니다.`);
      onSelect(gateName);
    } finally {
      setGateBusy(false);
    }
  };

  // 비신뢰 기기: 비밀번호 검증 (+선택 시 신뢰 기기 등록)
  const handleVerify = async () => {
    if (gateBusy) return;
    setGateBusy(true);
    try {
      const pass = await verifyPasswordFor(guard, gateName, pw1);
      if (!pass) { alert('비밀번호가 틀립니다.'); setPw1(''); return; }
      setSessionPassFor(gateName);
      const devCount = Object.keys(adminEntry(guard, gateName)?.devices || {}).length;
      if (regDevice && devCount < MAX_TRUSTED_DEVICES) {
        const devId = getAdminDeviceId();
        await fbUpdateAdminGuard({ [`admins/${gateName}/devices/${devId}`]: { label: `${deviceLabel()} (${devCount + 1}호)`, addedAt: Date.now() } });
      }
      setGateMode(null); setPw1('');
      onSelect(gateName);
    } finally {
      setGateBusy(false);
    }
  };
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
  // V9.10: 소유자는 퇴사 처리돼 있어도 항상 선택 가능 — 앱이 쓰이는 한 접속이 유지돼야 한다.
  const allWhitelist = [...new Set([...STAFF_NAMES, ...extraNames].filter(n => !deletedStaff[n] || isOwnerName(n)).concat(OWNER_NAME))];
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
      alert(`"${raw}" — 그린마린 직원 명단에 없습니다.\n정확한 이름으로 입력하세요.${hintTxt}\n\n새 직원 등록은 관리자(${getAdminNames(guard).join(', ')})에게 요청하세요.`);
      return;
    }
    const norm = normalizeName(raw);
    const exactName = allWhitelist.find(n => normalizeName(n) === norm);
    handlePick(exactName);   // V9.05: 직접 입력도 관리자 가드 경유
    setNewName('');
  };

  const isAdmin = isAdminName(guard, current);   // V9.09: 목록 기준

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-4 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-bold text-lg text-amber-200">검수원 선택</div>
            {(() => {
              const working = list.filter(i => inspectorStatus(i) === 'working');
              const online = list.filter(i => inspectorStatus(i) === 'online');
              return (working.length > 0 || online.length > 0) ? (
                <div className="text-[11px] mt-0.5">
                  {working.length > 0 && <span className="text-emerald-300">● {working.length}명 작업중: {working.map(a => a.name).join(', ')}</span>}
                  {working.length > 0 && online.length > 0 && <span className="text-slate-500"> · </span>}
                  {online.length > 0 && <span className="text-sky-300">○ {online.length}명 로그인: {online.map(a => a.name).join(', ')}</span>}
                </div>
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
                onClick={() => handlePick(i.name)}
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
                {inspectorStatus(i) === 'working' && (
                  <span className="bg-emerald-700/40 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-bold">●작업중</span>
                )}
                {inspectorStatus(i) === 'online' && (
                  <span className="bg-sky-900/50 text-sky-300 text-[10px] px-1.5 py-0.5 rounded font-bold">○로그인</span>
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

        {/* V9.05: 관리자 이름 보호 — 비밀번호 게이트 */}
        {gateMode && (
          <div className="absolute inset-0 z-10 bg-slate-950/90 rounded-xl flex items-center justify-center p-4">
            <div className="w-full max-w-xs bg-slate-900 border border-amber-600/60 rounded-lg p-4">
              <div className="font-bold text-amber-200 text-sm mb-2">
                {gateMode === 'setup' ? `🔐 ${gateName} 비밀번호 설정` : `🔐 ${gateName} 선택 — 비밀번호`}
              </div>
              {gateMode === 'setup' && (
                <div className="text-[11px] text-slate-400 mb-2">
                  비밀번호를 설정하면 이 기기가 신뢰 기기 1호가 됩니다. 신뢰 기기(최대 {MAX_TRUSTED_DEVICES}대)에서는 비밀번호 없이 선택됩니다.
                </div>
              )}
              {gateMode === 'verify' && (
                <div className="text-[11px] text-slate-400 mb-2">
                  이 기기는 신뢰 기기가 아닙니다. 관리자 비밀번호를 입력하세요.
                </div>
              )}
              <input
                type="password" value={pw1} onChange={e => setPw1(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (gateMode === 'setup' ? handleSetup() : handleVerify())}
                placeholder="비밀번호"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 mb-2 focus:outline-none focus:border-amber-500"
                autoFocus
              />
              {gateMode === 'setup' && (
                <input
                  type="password" value={pw2} onChange={e => setPw2(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSetup()}
                  placeholder="비밀번호 확인"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 mb-2 focus:outline-none focus:border-amber-500"
                />
              )}
              {gateMode === 'verify' && Object.keys(guard?.devices || {}).length < MAX_TRUSTED_DEVICES && (
                <label className="flex items-center gap-2 text-[11px] text-slate-300 mb-2 select-none">
                  <input type="checkbox" checked={regDevice} onChange={e => setRegDevice(e.target.checked)}/>
                  이 기기를 신뢰 기기로 등록 ({Object.keys(guard?.devices || {}).length}/{MAX_TRUSTED_DEVICES})
                </label>
              )}
              <div className="flex gap-2">
                <button
                  onClick={gateMode === 'setup' ? handleSetup : handleVerify}
                  disabled={gateBusy || !pw1}
                  className="flex-1 bg-amber-700 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 px-3 py-2 rounded text-sm font-bold text-amber-100"
                >
                  {gateBusy ? '확인 중…' : '확인'}
                </button>
                <button
                  onClick={() => { setGateMode(null); setPw1(''); setPw2(''); }}
                  className="px-3 py-2 rounded text-sm bg-slate-800 border border-slate-700 text-slate-300"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
