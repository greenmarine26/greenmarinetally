// TallyOne 1.0 (판2 K1): 로그인 전용 전체 화면
//   구 InspectorModal(V9.45)의 자산 — 이름 선택·직책 표기·상태 배지·직접 입력·
//   비밀번호 게이트 3모드(setup/verify/owner)·잠금 판정 — 을 전부 흡수해 승격했다.
//   InspectorModal.jsx는 삭제됨 (중복 두 벌 금지 — 이 파일이 유일한 로그인 진입점).
//   앱 시작은 항상 이 화면(자동 로그인 없음). 로그인 성공 시 App이 역할별 해시로 보낸다.
import React, { useState, useEffect, useCallback } from 'react';
import { Anchor, UserPlus, LogIn, ArrowLeft } from 'lucide-react';
import { getStaffRole, isChief, STAFF_NAMES, displayRole, isHiddenStaff } from '../staffList.js';   // 1.71: 직책 표시 단일 소스
import { inspectorStatus } from '../inspectorStatus.js';
import { dayDiff, dayLabel, voyagePlanMs } from '../utils.js';   // 2.10: PC 좌측 현황판
import {
  MAX_TRUSTED_DEVICES,
  getAdminDeviceId, hashPassword, makeSalt, deviceLabel,
  getAdminNames, isTrustedDeviceFor, isOwnerName, OWNER_NAME,
  verifyPasswordFor, needsPasswordSetup, hasSessionPassFor, setSessionPassFor,
  isLockedName, lockEntry, lockPath, ownerCanUnlock,
} from '../adminGuard.js';
import { fbGetAdminGuard, fbUpdateAdminGuard } from '../firebase.js';
import { useBackHandler } from '../backHandler.js';

export default function LoginPage({ current = '', inspectors, extraStaff = {}, deletedStaff = {}, notice = '', onSelect, onCancel = null, voyages = {} }) {
  const [newName, setNewName] = useState('');
  // TallyOne 1.0: 목록에서 이름을 고르면 선택만 되고, 하단 [로그인] 버튼으로 확정한다.
  const [selected, setSelected] = useState('');
  // ── V9.05→V9.45 계승: 잠금 대상(관리자 + 수석검수·부수석) 비밀번호 게이트 ──
  const [guard, setGuard] = useState(null);          // admin_guard 노드 (null = 미설정/로딩전)
  const [guardLoaded, setGuardLoaded] = useState(false);
  const [gateMode, setGateMode] = useState(null);    // null | 'verify' | 'setup' | 'owner'
  const [gateName, setGateName] = useState('');      // 지금 인증 중인 이름
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [regDevice, setRegDevice] = useState(false);
  const [gateBusy, setGateBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    // V9.45 계승: 조회가 어떤 이유로 실패해도 guardLoaded는 반드시 세운다.
    //   안 세우면 로딩 검사(handlePick 첫 줄)에 걸려 아무도 로그인하지 못한다.
    fbGetAdminGuard()
      .then(g => { if (alive) setGuard(g); })
      .catch(e => { console.error('[guard] 조회 실패', e); })
      .finally(() => { if (alive) setGuardLoaded(true); });
    return () => { alive = false; };
  }, []);

  // V9.45 계승: 저장 직후 guard를 다시 읽는다. 안 읽으면 같은 화면에서 옛 값으로 판정한다.
  const refreshGuard = async () => {
    try { const g = await fbGetAdminGuard(); setGuard(g); } catch (e) { console.error('[guard] 재조회 실패', e); }
  };

  // TallyOne 1.0 (K3): 안드로이드 뒤로가기 = 비밀번호 게이트 닫기
  const closeGate = useCallback(() => {
    setGateMode(null); setPw1(''); setPw2(''); setRegDevice(false);
  }, []);
  useBackHandler(closeGate, !!gateMode);

  // 이름 확정 진입점 — 잠금 대상(관리자 + 수석검수·부수석)만 비밀번호 게이트를 거친다.
  const handlePick = (name) => {
    // V9.45 계승: 로딩 검사를 맨 앞으로 — guard가 null인 사이에 잠금 대상을 고르면
    //   "미설정"으로 읽혀 남의 비밀번호 설정 화면이 뜨는 사고를 막는다.
    if (!guardLoaded) { alert('이름 보호 정보를 불러오는 중 — 잠시 후 다시 시도하세요.'); return; }
    if (!isLockedName(guard, name)) { onSelect(name); return; }  // 일반 검수원은 그대로
    if (hasSessionPassFor(name)) { onSelect(name); return; }     // 이 탭에서 이미 비번 통과
    setGateName(name);
    // 비번 미설정 = 아직 한 번도 안 정한 사람 → 본인이 직접 정한다
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
      // V9.45 계승: 관리자는 admins/, 수석검수·부수석은 locks/ — 노드를 나누지 않으면
      //   수석 비번을 저장하는 순간 admins에 키가 생겨 관리자 권한이 딸려 붙는다.
      const base = lockPath(guard, gateName);
      const ok = await fbUpdateAdminGuard({
        [`${base}/pwHash`]: pwHash,
        [`${base}/salt`]: salt,
        [`${base}/devices/${devId}`]: { label: `${deviceLabel()} (1호)`, addedAt: Date.now() },
      });
      if (!ok) { alert('저장 실패 — 네트워크를 확인하세요.'); return; }
      setSessionPassFor(gateName);
      setGateMode(null); setPw1(''); setPw2('');
      alert(`✅ ${gateName} 비밀번호 설정 완료 — 이 기기가 신뢰 기기 1호로 등록됐습니다.\n다른 기기에서는 비밀번호를 넣고 "기기 등록"을 체크하면 신뢰 기기(최대 ${MAX_TRUSTED_DEVICES}대)가 됩니다.\n\n잊었을 때는 ${OWNER_NAME}에게 초기화를 요청하세요.`);
      await refreshGuard();
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
      const devCount = Object.keys(lockEntry(guard, gateName)?.devices || {}).length;
      if (regDevice && devCount < MAX_TRUSTED_DEVICES) {
        const devId = getAdminDeviceId();
        await fbUpdateAdminGuard({ [`${lockPath(guard, gateName)}/devices/${devId}`]: { label: `${deviceLabel()} (${devCount + 1}호)`, addedAt: Date.now() } });
        await refreshGuard();
      }
      setGateMode(null); setPw1(''); setRegDevice(false);
      onSelect(gateName);
    } finally {
      setGateBusy(false);
    }
  };

  // V9.45 계승: 소유자 마스터 해제 — 본인이 비번을 잊었을 때 소유자가 열어준다.
  const handleOwnerUnlock = async () => {
    if (gateBusy) return;
    setGateBusy(true);
    try {
      const pass = await verifyPasswordFor(guard, OWNER_NAME, pw1);
      if (!pass) { alert(`${OWNER_NAME} 비밀번호가 틀립니다.`); setPw1(''); return; }
      const hadPw = !!lockEntry(guard, gateName)?.pwHash;
      if (hadPw && confirm(`${gateName} 의 비밀번호와 신뢰 기기를 초기화할까요?\n\n초기화하면 다음에 ${gateName} 님이 이름을 고를 때 본인이 새 비밀번호를 정합니다.\n[취소] 를 누르면 이번만 열고 기존 비밀번호는 그대로 둡니다.`)) {
        const base = lockPath(guard, gateName);
        const ok = await fbUpdateAdminGuard({ [`${base}/pwHash`]: null, [`${base}/salt`]: null, [`${base}/devices`]: null });
        if (!ok) { alert('초기화 저장 실패 — 네트워크를 확인하세요. 이번 접속만 열립니다.'); }
        else { await refreshGuard(); alert(`✅ ${gateName} 비밀번호 초기화 완료`); }
      }
      setSessionPassFor(gateName);
      setGateMode(null); setPw1(''); setPw2('');
      onSelect(gateName);
    } finally {
      setGateBusy(false);
    }
  };

  // TallyOne 1.73: 개발·시험 계정은 로그인 목록에서 숨긴다(보는 사람을 알 수 없는 화면).
  //   「목록에 없으면 이름 직접 입력」으로는 그대로 들어간다 — 화이트리스트는 안 건드린다.
  const list = Object.values(inspectors || {})
    .filter(i => i && i.name && !isHiddenStaff(i.name))
    .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));

  // M5.61 계승: 이름 정규화 — 공백/콤마/특수문자 제거 후 비교
  const normalizeName = (s) => String(s || '')
    .trim()
    .replace(/[,\s\.\-_\/\\]/g, '')
    .toLowerCase();

  // 화이트리스트 (코드 명단 + Firebase 동적 명단 - 퇴사자 제외, 소유자는 항상 허용)
  const extraNames = Object.values(extraStaff || {}).map(s => s.name).filter(Boolean);
  const allWhitelist = [...new Set([...STAFF_NAMES, ...extraNames].filter(n => !deletedStaff[n] || isOwnerName(n)).concat(OWNER_NAME))];
  const isAllowed = (name) => allWhitelist.some(n => normalizeName(n) === normalizeName(name));

  // 직접 입력 — 검증 통과 시 선택 상태로 (로그인 버튼으로 확정)
  const handleDirect = () => {
    const raw = newName.trim();
    if (!raw) return;
    if (!/^[가-힣a-zA-Z0-9]{2,10}$/.test(raw)) {
      alert('이름은 한글/영문 2~10자만 가능합니다.');
      return;
    }
    if (!isAllowed(raw)) {
      const hint = allWhitelist.filter(n => n.includes(raw.slice(0, 2)) || raw.includes(n.slice(0, 2)));
      const hintTxt = hint.length > 0 ? `\n\n비슷한 이름: ${hint.slice(0, 5).join(', ')}` : '';
      alert(`"${raw}" — 그린마린 직원 명단에 없습니다.\n정확한 이름으로 입력하세요.${hintTxt}\n\n새 직원 등록은 관리자(${getAdminNames(guard).join(', ')})에게 요청하세요.`);
      return;
    }
    const norm = normalizeName(raw);
    const exactName = allWhitelist.find(n => normalizeName(n) === norm);
    setSelected(exactName);
    setNewName('');
  };

  const handleLogin = () => { if (selected) handlePick(selected); };

  const working = list.filter(i => inspectorStatus(i) === 'working');
  const online = list.filter(i => inspectorStatus(i) === 'online');
  // 직접 입력으로 고른 이름이 목록에 없는 경우 표시용
  const selectedInList = list.some(i => i.name === selected);

  // ── 2.10 (검수사 확정 2026-08-23, 시안 승인 «컴화면 마음에 듭니다») — PC 좌측 현황판 ──
  //   ⚠ 추가 조회 0. App.jsx:112 이 **로그인 전에도** voyages 를 구독하고 있어 그 값을 그대로 쓴다.
  //   ⚠ 폰은 종전 화면 그대로다(«컴용 로그인 화면») — lg 이상에서만 2단이 된다.
  const board = React.useMemo(() => {
    const vs = Object.entries(voyages || {}).map(([key, v]) => ({ key, ...v }));
    let boxes = 0;
    const ships = [];
    for (const v of vs) {
      const d = v?.discharge?.ediContainers, l = v?.loading?.ediContainers;
      boxes += (d ? Object.keys(d).length : 0) + (l ? Object.keys(l).length : 0);
      const st = String(v?.info?.terminalStatus || '').toLowerCase();
      const ms = voyagePlanMs(v);
      const n = dayDiff(ms);
      const rank = st === 'working' ? 0 : n === 0 ? 1 : n === 1 ? 2 : 9;
      if (rank < 9) ships.push({ vsl: v?.info?.vsl || v.key, berth: v?.info?.berth || '', rank, ms, key: v.key });
    }
    ships.sort((a, b) => a.rank - b.rank || (a.ms || 9e15) - (b.ms || 9e15));
    return { total: vs.length, boxes, ships };
  }, [voyages]);
  const hhmm = (ms) => (ms ? `${String(new Date(ms).getHours()).padStart(2, '0')}:${String(new Date(ms).getMinutes()).padStart(2, '0')}` : '');
  const berthNo = (b) => { const m = String(b || '').match(/(\d+)\s*번/); return m ? `${m[1]}번` : ''; };

  return (
    <div className="min-h-screen bg-[#080C1A] text-slate-100 lg:bg-slate-950 lg:px-6 lg:py-8">
      <div className="lg:grid lg:grid-cols-2 lg:gap-5 lg:max-w-[1500px] lg:mx-auto lg:items-start">

      {/* ══ PC 전용 좌측 현황판 (폰에서는 숨김 — 종전 화면 불변) ══ */}
      <div className="hidden lg:block rounded-3xl border border-cyan-950/70 p-7 bg-slate-950"
           style={{ background: 'radial-gradient(120% 90% at 12% 0%, #0d2b33 0%, #071420 55%, #050c14 100%)' }}>
        <span className="inline-flex items-center gap-2 text-[11px] text-teal-300 bg-teal-500/10 border border-teal-400/25 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>그린마린 검수팀 전용 · 평택항 컨테이너 검수
        </span>
        <div className="flex items-center gap-4 mt-6 mb-2">
          <div className="w-[62px] h-[62px] rounded-2xl bg-gradient-to-br from-cyan-900 to-slate-900 border border-cyan-700/60 flex items-center justify-center">
            <Anchor className="w-8 h-8 text-cyan-300"/>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-cyan-50 to-sky-300 bg-clip-text text-transparent">TallyOne</h1>
            <div className="text-[13px] text-slate-400 mt-0.5">평택항 컨테이너 검수 시스템</div>
            <div className="text-[10px] text-slate-600 tracking-[0.22em] mt-2">— CONTROL CENTER EDITION</div>
          </div>
        </div>

        <div className="mt-6 bg-slate-950/60 border border-cyan-950 rounded-2xl p-4">
          <div className="text-[10.5px] tracking-[0.16em] text-slate-400 mb-3 font-bold">■ 오늘 · 내일 작업 선박 — LIVE</div>
          {board.ships.length === 0 ? (
            <div className="text-[12px] text-slate-600">오늘·내일 작업 선박 없음</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {board.ships.slice(0, 12).map(sp => (
                <span key={sp.key} className={`rounded-lg px-3 py-1.5 text-[12px] font-black tracking-wide border ${
                  sp.rank === 0 ? 'bg-emerald-900/70 text-emerald-200 border-emerald-500'
                  : sp.rank === 1 ? 'bg-cyan-950 text-cyan-200 border-cyan-700'
                  : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  {sp.vsl}
                  <span className="text-[9.5px] font-semibold opacity-75 ml-1.5">
                    {sp.rank === 0 ? `작업중${berthNo(sp.berth) ? ` · ${berthNo(sp.berth)}` : ''}` : `${dayLabel(sp.ms)} ${hhmm(sp.ms)}`}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { n: board.total, cap: '진행 중 항차', tag: '진행', tone: 'text-emerald-300 bg-emerald-500/15' },
            { n: board.boxes.toLocaleString(), cap: '검수 대상 컨테이너', tag: '대기', tone: 'text-amber-300 bg-amber-500/15' },
            { n: working.length, cap: '작업 중 검수원', tag: 'LIVE', tone: 'text-sky-300 bg-sky-500/15' },
          ].map(st => (
            <div key={st.cap} className="bg-slate-950/60 border border-cyan-950 rounded-xl p-3.5">
              <div className="flex justify-end mb-2">
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${st.tone}`}>{st.tag}</span>
              </div>
              <div className="text-3xl font-black text-slate-100">{st.n}</div>
              <div className="text-[10.5px] text-slate-500 mt-0.5">{st.cap}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-screen flex flex-col lg:min-h-0 lg:rounded-3xl lg:border lg:border-slate-800 lg:bg-slate-900/40 lg:p-7">
        {/* 2.10: PC 는 좌측 패널에 로고가 이미 크게 있다 — 시안대로 「작업자 선택」 제목으로 대체 */}
        <div className="hidden lg:block mb-5">
          <h2 className="text-2xl font-black text-slate-100">작업자 선택</h2>
          <div className="text-[12px] text-slate-500 mt-1">{list.length}명의 검수사 · 평택항 컨테이너 터미널</div>
        </div>

        {/* ── 2.11 폰 히어로 (검수사 시안 «폰용도 마음에 듭니다») — PC 는 좌측 패널이 대신한다 ── */}
        <div className="lg:hidden relative h-[186px] shrink-0 overflow-hidden">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[420px] h-[320px] rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(closest-side, rgba(0,209,143,.20), transparent)' }}/>
          <div className="absolute top-4 right-7 w-[120px] h-[120px] rounded-full blur-[32px] opacity-60"
               style={{ background: 'radial-gradient(closest-side, rgba(56,189,248,.35), transparent)' }}/>
          <div className="relative z-10 flex flex-col items-center pt-7">
            <div className="w-[70px] h-[70px] rounded-[20px] flex items-center justify-center bg-gradient-to-br from-emerald-800 to-emerald-950"
                 style={{ boxShadow: '0 12px 32px rgba(0,209,143,.28), inset 0 2px 0 1px rgba(255,255,255,.08)' }}>
              <Anchor className="w-9 h-9 text-emerald-300"/>
            </div>
            <div className="mt-3 text-[26px] font-black tracking-tight text-white leading-none">TallyOne</div>
            <div className="mt-1.5 text-[12.5px] font-medium text-[#9AA3B8]">평택항 컨테이너 검수</div>
            <span className="mt-3 h-7 px-3 rounded-full inline-flex items-center gap-2 text-[11px] font-semibold text-[#A7F0D0]"
                  style={{ border: '1px solid rgba(0,209,143,.28)', background: 'rgba(0,209,143,.10)' }}>
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-[#00D18F] opacity-60"/>
                <span className="relative inline-flex w-2 h-2 rounded-full bg-[#00E89E]"/>
              </span>
              그린마린 검수팀 · {board.ships.filter(x => x.rank === 0).length > 0
                ? `오늘 ${board.ships.filter(x => x.rank === 0).length}척 작업중` : `진행 ${board.total}항차`}
            </span>
          </div>
        </div>

        {/* ── 2.11 폰 바텀시트 — PC 에서는 껍데기만 남고 종전 흐름 그대로 ── */}
        <div className="flex-1 flex flex-col bg-[#121A2B] rounded-t-[32px] -mt-3 relative z-20 overflow-hidden border-t border-white/5 shadow-[0_-12px_40px_rgba(0,0,0,0.45)]
                        lg:bg-transparent lg:rounded-none lg:mt-0 lg:border-0 lg:overflow-visible lg:shadow-none lg:flex-none">
          <div className="lg:hidden flex justify-center pt-3 pb-2 shrink-0"><div className="w-9 h-[5px] rounded-full bg-[#2A3449]"/></div>
          <div className="lg:hidden px-5 pb-2.5 flex items-center justify-between shrink-0">
            <h2 className="text-[18px] font-bold tracking-tight text-white">작업자 선택</h2>
            <span className="text-[12px] font-semibold px-2.5 h-[22px] rounded-full bg-[#1C2740] text-[#8CA0C2] border border-[#24324E] flex items-center">{list.length}명</span>
          </div>
          {board.ships.length > 0 && (
            <div className="lg:hidden mx-3.5 mb-2.5 bg-[#0E1727] border border-[#1E2B45] rounded-2xl px-3 py-2.5 shrink-0">
              <div className="text-[10px] font-bold tracking-[0.12em] text-[#6E7E9E] mb-2">■ 오늘 · 내일 작업 선박</div>
              <div className="flex flex-wrap gap-1.5">
                {board.ships.slice(0, 8).map(sp => (
                  <span key={sp.key} className={`rounded-lg px-2.5 py-1 text-[11px] font-black tracking-wide border ${
                    sp.rank === 0 ? 'bg-emerald-500/15 text-[#7CF1C2] border-emerald-500/35'
                    : sp.rank === 1 ? 'bg-[#0f2a3d] text-[#9BD8F5] border-[#1d4a68]'
                    : 'bg-[#182238] text-[#7C8CA8] border-[#26324B]'}`}>
                    {sp.vsl}<span className="text-[9px] font-semibold opacity-75 ml-1">
                      {sp.rank === 0 ? (berthNo(sp.berth) || '작업중') : (sp.rank === 1 ? hhmm(sp.ms) : '내일')}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* V9.13 계승: 자동 로그아웃 안내 */}
        {notice && (
          <div className="mb-3 text-[12px] text-amber-100 bg-amber-900/40 border border-amber-700/60 rounded-lg px-3 py-2 leading-relaxed">
            ⏱ {notice}
          </div>
        )}

        {/* 현재 작업중/로그인 인원 요약 */}
        {(working.length > 0 || online.length > 0) && (
          <div className="text-[11px] mb-2 px-1">
            {working.length > 0 && <span className="text-emerald-300">● {working.length}명 작업중: {working.map(a => a.name).join(', ')}</span>}
            {working.length > 0 && online.length > 0 && <span className="text-slate-500"> · </span>}
            {online.length > 0 && <span className="text-sky-300">○ {online.length}명 로그인: {online.map(a => a.name).join(', ')}</span>}
          </div>
        )}

        {/* ── 검수원 목록 (역할 뱃지 — 수석/부수석 강조) ── */}
        {list.length > 0 && (
          <div className="flex-1 overflow-y-auto px-3.5 pb-1 space-y-2.5 lg:flex-none lg:px-0 lg:space-y-1.5 lg:mb-3 lg:max-h-[42vh]">
            {list.map(i => {
              const role = displayRole(i.name);   // 1.71: 이사급 이상만 직급, 그 아래는 직책(없으면 검수)
              const chief = isChief(i.name);
              const isSel = i.name === selected;
              return (
                <button
                  key={i.name}
                  onClick={() => setSelected(i.name)}
                  className={`relative w-full h-[72px] rounded-[18px] flex items-center gap-3.5 px-3.5 text-left border transition-all
                    lg:h-auto lg:py-2.5 lg:rounded-lg ${
                    isSel ? 'bg-[#132a2b] border-emerald-500/45'
                          : 'bg-[#1A2338] border-[#22304B] hover:border-[#2C3D5E] hover:bg-[#1D2940]'}`}
                >
                  {isSel && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-[#00D18F]"/>}
                  <span className={`w-12 h-12 rounded-full flex items-center justify-center text-[17px] font-bold text-white flex-shrink-0
                    lg:w-8 lg:h-8 lg:text-xs bg-gradient-to-br ${
                    chief ? 'from-violet-400 to-violet-700' : 'from-amber-400 to-amber-700'}`}
                    style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.18)' }}>
                    {i.name[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] lg:text-sm font-bold tracking-tight text-white truncate leading-none">{i.name}</span>
                      {inspectorStatus(i) === 'working' && (
                        <span className="h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center flex-shrink-0"
                              style={{ background: 'rgba(0,209,143,.14)', border: '1px solid rgba(0,209,143,.28)', color: '#7CF1C2' }}>작업중</span>
                      )}
                      {inspectorStatus(i) === 'online' && (
                        <span className="h-5 px-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold flex items-center flex-shrink-0">로그인</span>
                      )}
                      {/* 2.11: 비밀번호를 물을 이름은 **미리** 알려 준다 — 시안엔 없던 것.
                          모르고 누르면 «왜 비밀번호 창이 뜨지?» 가 된다. */}
                      {isLockedName(guard, i.name) && (
                        <span className="h-5 px-1.5 rounded-full bg-violet-500/15 border border-violet-400/30 text-violet-300 text-[10px] font-bold flex items-center flex-shrink-0">🔒 보호</span>
                      )}
                    </div>
                    {role && (
                      <div className={`mt-1 text-[12px] lg:text-[10px] truncate leading-none ${chief ? 'text-violet-300 font-bold' : 'text-[#8CA0C2]'}`}>
                        {chief && '👑 '}{role}
                      </div>
                    )}
                  </div>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center border text-[14px] font-black flex-shrink-0 lg:hidden ${
                    isSel ? 'bg-[#00D18F] border-[#00D18F] text-[#04120c]' : 'bg-[#121E34] border-[#2A3958] text-transparent'}`}>✓</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── 직접 입력 + 로그인 — 2.11: 폰은 시트 하단에 고정(shrink-0), PC 는 종전 흐름 ── */}
        <div className="shrink-0 bg-[#121A2B] border-t border-[#1E2B45] px-3.5 pt-3.5 pb-3.5 shadow-[0_-8px_24px_rgba(0,0,0,0.25)]
                        lg:bg-transparent lg:border-slate-800 lg:px-0 lg:pb-0 lg:shadow-none lg:mb-3">
          <div className="text-[11px] text-[#6E7E9E] mb-2.5 font-bold tracking-[0.08em] uppercase lg:text-slate-400 lg:tracking-normal lg:normal-case lg:mb-1.5">목록에 없으면 이름 직접 입력</div>
          <div className="flex gap-2.5 items-center">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDirect()}
              placeholder="이름 입력"
              className="flex-1 min-w-0 h-14 bg-[#1A2338] border border-[#2A3958] rounded-2xl px-3.5 text-[15px] font-medium text-white placeholder:text-[#5A6B8A] focus:outline-none focus:border-[#00D18F]/60
                         lg:h-auto lg:rounded lg:py-2 lg:text-sm lg:bg-slate-800 lg:border-slate-700"
              autoFocus={list.length === 0}
            />
            <button
              onClick={handleDirect}
              disabled={!newName.trim()}
              className="h-14 px-4 rounded-2xl bg-[#232F4A] hover:bg-[#2A3958] disabled:bg-[#1A2338] disabled:text-slate-600 text-sm font-bold text-slate-100 flex items-center gap-1 shrink-0
                         lg:h-auto lg:py-2 lg:rounded lg:bg-slate-700"
            >
              <UserPlus className="w-4 h-4"/>선택
            </button>
          </div>
          {selected && !selectedInList && (
            <div className="mt-2 text-[12px] text-emerald-200">선택됨: <b>{selected}</b>{displayRole(selected) ? ` · ${displayRole(selected)}` : ''}</div>
          )}

        {/* ── 로그인 버튼 ── */}
        <button
          onClick={handleLogin}
          disabled={!selected}
          className="w-full h-[60px] mt-3 rounded-[18px] font-black text-base flex items-center justify-center gap-2 transition-all active:scale-[0.99]
                     bg-gradient-to-r from-[#00c281] to-[#00e89e] hover:brightness-110 shadow-[0_10px_24px_rgba(0,209,143,0.28)]
                     disabled:bg-none disabled:bg-[#1A2338] disabled:text-slate-600 disabled:shadow-none text-[#04120c] lg:h-auto lg:py-3.5 lg:rounded-xl lg:mt-0"
        >
          <LogIn className="w-5 h-5"/>{selected ? `${selected} 님으로 시작` : '작업자를 선택해주세요'}
        </button>

        {/* 검수원 변경으로 들어온 경우(이미 로그인됨) — 돌아가기 */}
        {current && onCancel && (
          <button onClick={onCancel} className="mt-3 w-full py-2 text-sm text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5">
            <ArrowLeft className="w-4 h-4"/>{current} 그대로 돌아가기
          </button>
        )}
        <div className="lg:hidden mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-[#5A6B8A] font-medium">
          🔒 보호 이름은 비밀번호를 한 번 확인합니다
        </div>
        </div>{/* 2.11: 하단 고정 바 닫기 */}
        </div>{/* 2.11: 폰 바텀시트 닫기 (PC 에서는 껍데기만) */}
      </div>
      </div>{/* 2.10: lg 2단 래퍼 닫기 — 게이트 오버레이는 fixed 라 바깥에 둔다 */}

      {/* ── 비밀번호 게이트 (setup/verify/owner) — 전체 화면 오버레이 ── */}
      {gateMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-slate-900 border border-amber-600/60 rounded-lg p-4">
            <div className="font-bold text-amber-200 text-sm mb-2">
              {gateMode === 'setup' ? `🔐 ${gateName} 비밀번호 설정`
                : gateMode === 'owner' ? `🔑 ${OWNER_NAME} 비밀번호로 ${gateName} 열기`
                : `🔐 ${gateName} 선택 — 비밀번호`}
            </div>
            {gateMode === 'setup' && (
              <div className="text-[11px] text-slate-400 mb-2">
                <b className="text-amber-300">{displayRole(gateName) || '보호 대상'}</b> 이름은 본인만 쓸 수 있습니다. 처음 한 번 비밀번호를 정하세요.
                이 기기가 신뢰 기기 1호가 되고, 신뢰 기기(최대 {MAX_TRUSTED_DEVICES}대)에서는 다음부터 비밀번호 없이 선택됩니다.
              </div>
            )}
            {gateMode === 'verify' && (
              <div className="text-[11px] text-slate-400 mb-2">
                이 기기는 <b className="text-amber-300">{gateName}</b> 님의 신뢰 기기가 아닙니다. 본인 비밀번호를 입력하세요.
              </div>
            )}
            {gateMode === 'owner' && (
              <div className="text-[11px] text-slate-400 mb-2">
                {gateName} 님이 비밀번호를 잊었을 때 씁니다. {OWNER_NAME} 비밀번호를 입력하면 이번 접속만 열립니다
                (이 기기는 신뢰 기기로 등록되지 않습니다).
              </div>
            )}
            <input
              type="password" value={pw1} onChange={e => setPw1(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (gateMode === 'setup' ? handleSetup() : gateMode === 'owner' ? handleOwnerUnlock() : handleVerify())}
              placeholder={gateMode === 'owner' ? `${OWNER_NAME} 비밀번호` : '비밀번호'}
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
            {/* V9.45 계승: 그 사람 기기 수 기준으로 신뢰 기기 등록 여부 노출 */}
            {gateMode === 'verify' && Object.keys(lockEntry(guard, gateName)?.devices || {}).length < MAX_TRUSTED_DEVICES && (
              <label className="flex items-center gap-2 text-[11px] text-slate-300 mb-2 select-none">
                <input type="checkbox" checked={regDevice} onChange={e => setRegDevice(e.target.checked)}/>
                이 기기를 신뢰 기기로 등록 ({Object.keys(lockEntry(guard, gateName)?.devices || {}).length}/{MAX_TRUSTED_DEVICES})
              </label>
            )}
            <div className="flex gap-2">
              <button
                onClick={gateMode === 'setup' ? handleSetup : gateMode === 'owner' ? handleOwnerUnlock : handleVerify}
                disabled={gateBusy || !pw1}
                className="flex-1 bg-amber-700 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 px-3 py-2 rounded text-sm font-bold text-amber-100"
              >
                {gateBusy ? '확인 중…' : '확인'}
              </button>
              <button
                onClick={closeGate}
                className="px-3 py-2 rounded text-sm bg-slate-800 border border-slate-700 text-slate-300"
              >
                취소
              </button>
            </div>
            {/* 비밀번호를 잊었을 때의 유일한 출구 — 소유자가 열어준다 */}
            {gateMode !== 'owner' && ownerCanUnlock(guard, gateName) && (
              <button
                onClick={() => { setGateMode('owner'); setPw1(''); setPw2(''); }}
                className="mt-2 w-full text-[11px] text-slate-400 hover:text-amber-300 underline underline-offset-2"
              >
                비밀번호를 잊으셨나요? — {OWNER_NAME} 비밀번호로 열기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
