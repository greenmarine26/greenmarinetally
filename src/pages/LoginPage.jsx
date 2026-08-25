// TallyOne 1.0 (판2 K1): 로그인 전용 전체 화면
//   구 InspectorModal(V9.45)의 자산 — 이름 선택·직책 표기·상태 배지·직접 입력·
//   비밀번호 게이트 3모드(setup/verify/owner)·잠금 판정 — 을 전부 흡수해 승격했다.
//   InspectorModal.jsx는 삭제됨 (중복 두 벌 금지 — 이 파일이 유일한 로그인 진입점).
//   앱 시작은 항상 이 화면(자동 로그인 없음). 로그인 성공 시 App이 역할별 해시로 보낸다.
import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, LogIn, ArrowLeft } from 'lucide-react';
//  2.29-02: 로그인 화면 로고 — 검수사 «지금도 구버전 띄우셨네요».
//    2.29 는 헤더만 바꿔서, **앱을 열면 제일 먼저 보는 이 화면**이 옛 닻 그대로였다.
import logoUrl from '../assets/logo-tallyone.png';
import { getStaffRole, isChief, STAFF_NAMES, displayRole, isHiddenStaff } from '../staffList.js';   // 1.71: 직책 표시 단일 소스
import { inspectorStatus, WORKING_WINDOW_MS } from '../inspectorStatus.js';   // 2.4x: 인원 0 경고 - 판정은 이 상수 한 벌(새로 안 만든다)
import { rememberMe, getMeToday } from '../meToday.js';   // 2.22: 오늘 로그인한 본인은 목록에 남는다
import { dayDiff, dayLabel, voyagePlanMs, isWorkingNow, isoFeet, isReeferContainer } from '../utils.js';   // 2.10: PC 좌측 현황판 · 2.4x: 수량 배지(20FT·리퍼)
import {
  MAX_TRUSTED_DEVICES,
  getAdminDeviceId, hashPassword, makeSalt, deviceLabel,
  getAdminNames, isTrustedDeviceFor, isOwnerName, OWNER_NAME,
  verifyPasswordFor, needsPasswordSetup, hasSessionPassFor, setSessionPassFor,
  isLockedName, lockEntry, lockPath, ownerCanUnlock,
  hasRecoveryCode, verifyRecoveryCode,   // 2.53: 복구 코드 — 소유자가 잠겼을 때의 유일한 길
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
  const [gateMode, setGateMode] = useState(null);    // null | 'verify' | 'setup' | 'owner' | 'recovery'(2.53)
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
  // 2.22: 로그인이 확정되는 지점이 여섯 곳이다(일반·세션통과·신뢰기기·설정·검증·소유자).
  //   전부 이 한 줄을 거치게 해 «오늘의 본인»을 기억한다 — 한 곳이라도 빠지면
  //   그 경로로 들어온 사람만 다음에 또 이름을 쳐야 한다.
  const commitSelect = (name) => { rememberMe(name); onSelect(name); };

  const handlePick = (name) => {
    // V9.45 계승: 로딩 검사를 맨 앞으로 — guard가 null인 사이에 잠금 대상을 고르면
    //   "미설정"으로 읽혀 남의 비밀번호 설정 화면이 뜨는 사고를 막는다.
    if (!guardLoaded) { alert('이름 보호 정보를 불러오는 중 — 잠시 후 다시 시도하세요.'); return; }
    if (!isLockedName(guard, name)) { commitSelect(name); return; }  // 일반 검수원은 그대로
    if (hasSessionPassFor(name)) { commitSelect(name); return; }     // 이 탭에서 이미 비번 통과
    setGateName(name);
    // 비번 미설정 = 아직 한 번도 안 정한 사람 → 본인이 직접 정한다
    if (needsPasswordSetup(guard, name)) { setGateMode('setup'); return; }
    if (isTrustedDeviceFor(guard, name)) { commitSelect(name); return; }   // 신뢰 기기
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
      commitSelect(gateName);
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
      commitSelect(gateName);
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
      commitSelect(gateName);
    } finally {
      setGateBusy(false);
    }
  };

  // ── ★ 2.53 복구 코드로 열기 ───────────────────────────────────────────────
  //  왜 있는가 — 바로 위 `handleOwnerUnlock` 은 **소유자를 열어 주지 못한다**(adminGuard.ownerCanUnlock 이
  //  첫 줄에서 소유자를 제외한다). 수석·임원이 잠기면 소유자가 열어 주는데, 소유자가 잠기면 아무도 못 연다.
  //  검수사 2026-08-26 — *«수석 임원 그리고 저 비밀번호 분실시 접속할 방법이 없어요»*.
  //  ⚠ 이건 뒷문이 아니다 — 검수사가 **미리 만들어 자기가 보관한** 코드이고, 그것을 아는 사람만 쓸 수 있다.
  //  ⚠ 통과하면 비밀번호를 **바로 새로 정하게** 한다(setup 모드). 열어만 주고 끝내면 다음에 또 잠긴다.
  const handleRecovery = async () => {
    if (gateBusy) return;
    setGateBusy(true);
    try {
      const r = await verifyRecoveryCode(guard, gateName, pw1);
      if (!r.ok) { alert(r.why); setPw1(''); return; }
      //  ⛔ 코드를 먼저 소멸시킨다. 비밀번호를 새로 정하다가 창을 닫아도 그 코드는 이미 쓴 것이다
      //    — 한 번 쓴 코드가 남아 있으면 «한 번만»이 무너진다.
      const ok = await fbUpdateAdminGuard({ [`recovery/${gateName}/usedAt`]: Date.now() });
      if (!ok) { alert('저장 실패 — 네트워크를 확인하고 다시 해 주세요.'); return; }
      await refreshGuard();
      setPw1(''); setPw2('');
      setGateMode('setup');      // 이어서 새 비밀번호를 정한다
      alert('✅ 복구 코드 확인. 이어서 새 비밀번호를 정하십시오.\n\n⚠ 이 코드는 방금 소멸했습니다 — 나중에 ⚙ 인원 관리에서 새로 만들어 두십시오.');
    } finally {
      setGateBusy(false);
    }
  };

  // TallyOne 1.73: 개발·시험 계정은 로그인 목록에서 숨긴다(보는 사람을 알 수 없는 화면).
  //   「목록에 없으면 이름 직접 입력」으로는 그대로 들어간다 — 화이트리스트는 안 건드린다.
  const list = Object.values(inspectors || {})
    .filter(i => i && i.name && !isHiddenStaff(i.name))
    .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));

  // ── 2.12-01 (검수사 확정 2026-08-23): *«**로그인한 작업자만** 보이게 하고 나머지는 분리해서
  //   선택해서 볼수 있게 하는게 폰엔 한페이지로 남을것 같습니다.»* → *«**로그인한 사람과 로그인 안된 사람**입니다.»*
  //   판정은 `inspectorStatus` 한 벌을 그대로 쓴다 — 그것이 이미 «로그아웃 없이 앱을 닫아
  //   loggedIn=true 가 영구 잔존하는 허상»을 30분 신선도로 걸러 준다(1.3-01).
  //   실측 2026-08-23 — loggedIn 플래그는 9명이 true 지만 신선도까지 보면 **로그인 1명**이다.
  const [showAll, setShowAll] = useState(false);
  // ── 2.22 (검수사 확정 2026-08-23): *«한번 로그인하면 그날 하루는 **본인것은 지워지지 않게**
  //   매번 이름을 넣지 않게. **로그인중인 사람과 본인은 보이게** 해야 한다고.»*
  //   2.12-01 은 «지금 로그인한 사람»만 남겼는데, 본인이 로그아웃하거나 30분 신선도가 지나면
  //   **본인 이름까지 사라져** 다시 들어올 때마다 이름을 쳐야 했다.
  //   ⇒ 목록 = 지금 로그인한 사람 **∪ 오늘 이 기기에서 로그인한 본인**(날이 바뀌면 저절로 빠진다).
  const meName = getMeToday();
  const loggedList = (() => {
    const arr = list.filter(i => !!inspectorStatus(i) || (meName && i.name === meName));
    // 명단(inspectors)에 아직 안 올라온 이름으로 들어왔던 경우에도 본인은 보여 준다.
    if (meName && !arr.some(i => i.name === meName)) arr.push({ name: meName });
    // 본인을 맨 앞으로 — 매번 고르는 줄이다.
    return arr.sort((a, b) => (a.name === meName ? -1 : b.name === meName ? 1 : 0));
  })();
  //   ⚠ 로그인 0명이어도 **전체를 펴지 않는다** — 검수사 확정: *«로그인 안했던 사람은 저는 보이고
  //   본인이름은 **입력해야 나오니 입력칸이 보이면 맞습니다**.»* 즉 명단이 아니라 **입력칸**이 그 길이다.
  //   전체를 자동으로 펴면 다시 스크롤이 생겨 «폰 한 페이지»가 깨진다.
  const shownList = showAll ? list : loggedList;
  const hiddenCount = Math.max(0, list.length - shownList.length);   // 2.22: 본인이 명단 밖 이름이면 음수가 될 수 있다

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

  // -- 2.4x (검수사 확정): 배별 "지금 활동 중인 검수원" 수. 판정은 inspectorStatus.js 의
  //   WORKING_WINDOW_MS 한 벌 그대로 쓴다(새로 만들지 않는다). i.lastVoyage(fbSetInspectorActivity 가
  //   심는 필드)가 board.ships[].key 와 같은 항차 키다. 명시 로그아웃(loggedIn===false)은 최근
  //   활동이어도 카운트하지 않는다 -- inspectorStatus 판정 기준과 동일하게 맞춘다.
  const activeByShip = (() => {
    const now = Date.now();
    const out = {};
    for (const i of list) {
      if (!i || !i.lastVoyage || !i.lastActive) continue;
      if (i.loggedIn === false) continue;
      if (now - i.lastActive >= WORKING_WINDOW_MS) continue;
      out[i.lastVoyage] = (out[i.lastVoyage] || 0) + 1;
    }
    return out;
  })();

  // -- 2.10 (검수사 확정 2026-08-23, 시안 승인 "컴화면 마음에 듭니다") -- PC 좌측 현황판 --
  //   ⚠ 추가 조회 0. App.jsx:112 이 **로그인 전에도** voyages 를 구독하고 있어 그 값을 그대로 쓴다.
  //   ⚠ 폰은 종전 화면 그대로다("컴용 로그인 화면") -- lg 이상에서만 2단이 된다.
  const board = React.useMemo(() => {
    const vs = Object.entries(voyages || {}).map(([key, v]) => ({ key, ...v }));
    let boxes = 0;
    // -- 2.4x (검수사 확정): KPI「검수 대상 컨테이너」터미널별 분해 -- info.pier 로 가른다.
    //   PCTC→평택컨테이너터미널 · PNCT→동방아이포트 · 그 외(빈 배 있음, 실측 OBWH·RZOR)→미상.
    const byPier = { PCTC: 0, PNCT: 0, unknown: 0 };
    const ships = [];
    for (const v of vs) {
      const d = v?.discharge?.ediContainers, l = v?.loading?.ediContainers;
      const vBoxes = (d ? Object.keys(d).length : 0) + (l ? Object.keys(l).length : 0);
      boxes += vBoxes;
      const pier = v?.info?.pier || '';
      if (pier === 'PCTC') byPier.PCTC += vBoxes;
      else if (pier === 'PNCT') byPier.PNCT += vBoxes;
      else byPier.unknown += vBoxes;
      const ms = voyagePlanMs(v);
      const n = dayDiff(ms);
      //  2.40-02: 판정을 utils.isWorkingNow 한 벌로 옮겼다.
      //    종전 "시작이 2시간 이내면 작업중"(2.34-10)은 **시작 전 2시간을 통째로 작업중**으로 만들었다 --
      //    13시 시작인 배가 12시 30분에 "작업중"으로 떠서 담당자가 준비도 못 한 채 볼 뻔했다.
      const rank = isWorkingNow(v) ? 0 : n === 0 ? 1 : n === 1 ? 2 : 9;
      if (rank < 9) {
        // ① 2.4x (검수사 확정): 선박 카드 수량 배지 -- 추가 통신 0. 이미 받은 ediContainers 의
        //   iso·fe·rf 를 그대로 센다(판정은 전부 기존 utils 헬퍼 -- isoFeet·fe==='E'·isReeferContainer,
        //   새로 만들지 않는다).
        let c20 = 0, mty = 0, rf = 0;
        const allC = [...(d ? Object.values(d) : []), ...(l ? Object.values(l) : [])];
        for (const c of allC) {
          if (isoFeet(c?.iso) === 20) c20++;
          if (c?.fe === 'E') mty++;
          if (isReeferContainer(c)) rf++;
        }
        const xray = Object.keys(v?.discharge?.xrayList || {}).length;   // XRAY는 양하 전용
        ships.push({ vsl: v?.info?.vsl || v.key, berth: v?.info?.berth || '', rank, ms, key: v.key, c20, mty, rf, xray });
      }
    }
    ships.sort((a, b) => a.rank - b.rank || (a.ms || 9e15) - (b.ms || 9e15));
    return { total: vs.length, boxes, byPier, ships };
  }, [voyages]);
  const hhmm = (ms) => (ms ? `${String(new Date(ms).getHours()).padStart(2, '0')}:${String(new Date(ms).getMinutes()).padStart(2, '0')}` : '');
  const berthNo = (b) => { const m = String(b || '').match(/(\d+)\s*번/); return m ? `${m[1]}번` : ''; };

  return (
    <div className="min-h-screen bg-ink-950 text-dim-100 lg:bg-ink-950 lg:px-6 lg:py-8">
      <div className="lg:grid lg:grid-cols-2 lg:gap-5 lg:max-w-[1500px] lg:mx-auto lg:items-start">

      {/* == PC 전용 좌측 현황판 (폰에서는 숨김 -- 종전 화면 불변) == */}
      {/* 2.4x (검수사 확정 -- 시안 "구조"만 채용, 데이터는 실물): 헤더 한 줄 통합.
          이 패널은 배경 · 테두리를 반드시 토큰(bg-ink-950 / border-line)으로만 그린다 -- 시안처럼
          hex 그라디언트를 박아두면 밝기 4단계(2.40)에서 이 패널만 항상 어둡게 남는 "섬"이 된다. */}
      <div className="hidden lg:block rounded-card border border-line p-7 bg-ink-950">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={logoUrl} alt="TallyOne" draggable="false"
              className="w-[62px] h-[62px] rounded-card select-none shadow-[0_0_28px_rgba(212,175,55,0.22)]"/>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-dim-100">TallyOne</h1>
              <div className="text-sm2 text-dim-300 mt-0.5">
                평택항 컨테이너 검수 시스템 <span className="text-dim-500">·</span>{' '}
                <span className="text-2xs text-dim-500 tracking-[0.18em]">CONTROL CENTER EDITION</span>
              </div>
            </div>
          </div>
          {/* 헤더 우측 배지 -- 맥박 점은 모바일 히어로(위)와 동일한 act 토큰 패턴을 그대로 쓴다 */}
          <span className="inline-flex items-center gap-2 text-xxs text-act-soft bg-act/10 border border-act/30 rounded-full px-3 py-1.5 shrink-0">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-act opacity-60"/>
              <span className="relative inline-flex w-2 h-2 rounded-full bg-act-hi"/>
            </span>
            그린마린 검수팀 전용
          </span>
        </div>

        <div className="mt-6 bg-ink-950/60 border border-line rounded-card p-4">
          <div className="text-[10.5px] tracking-[0.16em] text-dim-300 mb-3 font-bold">■ 오늘 · 내일 작업 선박 — LIVE</div>
          {board.ships.length === 0 ? (
            <div className="text-xs2 text-dim-500">오늘·내일 작업 선박 없음</div>
          ) : (
            // 2.4x (검수사 확정 -- 시안 구조): 선박 2열 카드 그리드. 좌측 코드 박스(작업중=act 초록 /
            //   예정=회색) · 우측 상태 2줄(1줄 작업중·번선석 또는 예정 시각 / 2줄 수량 배지 + 인원 0 경고).
            <div className="grid grid-cols-2 gap-2">
              {board.ships.slice(0, 12).map(sp => {
                const isWorking = sp.rank === 0;
                // ② 2.4x (검수사 확정): 시작 시각이 지난(=작업중) 배인데 활동 검수원이 0일 때만 경고.
                //   시작 전 배는 0명이 정상이라 절대 경고하지 않는다 (2026-08-25 NSFR 사고 재발 방지).
                const zeroWarn = isWorking && !activeByShip[sp.key];
                return (
                  <div key={sp.key} className={`flex items-stretch gap-2.5 rounded-btn border p-2.5 ${
                    zeroWarn ? 'border-st-bad/50 bg-st-bad/10' : 'border-line bg-ink-950/60'}`}>
                    <div className={`shrink-0 w-14 rounded-[10px] flex items-center justify-center text-center px-1 py-1 font-black text-xs2 leading-tight break-words border ${
                      isWorking ? 'bg-act/20 text-act-hi border-act/40' : 'bg-ink-800 text-dim-400 border-line-faint'}`}>
                      {sp.vsl}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 py-0.5">
                      <div className={`text-xs2 font-bold truncate ${isWorking ? 'text-act-hi' : 'text-dim-300'}`}>
                        {isWorking ? `작업중${berthNo(sp.berth) ? ` · ${berthNo(sp.berth)}` : ''}` : `${dayLabel(sp.ms)} ${hhmm(sp.ms)}`}
                      </div>
                      {/* ① 2.4x (검수사 확정): 수량 배지 -- 0이면 안 그린다(빈 배지가 줄을 늘린다) */}
                      <div className="flex flex-wrap gap-1">
                        {sp.c20 > 0 && <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-st-dis/15 text-st-disHi border border-st-dis/30">20FT {sp.c20}</span>}
                        {sp.mty > 0 && <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-ink-800 text-dim-300 border border-line-faint">MTY {sp.mty}</span>}
                        {sp.rf > 0 && <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-st-chief/15 text-st-chief border border-st-chief/30">리퍼 {sp.rf}</span>}
                        {sp.xray > 0 && <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-st-lod/15 text-st-lodHi border border-st-lod/30">XRAY {sp.xray}</span>}
                        {zeroWarn && <span className="text-3xs font-black px-1.5 py-0.5 rounded bg-st-bad/20 text-st-badHi border border-st-bad/40">검수원 0명</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { n: board.total, cap: '진행 중 항차', tag: '진행', tone: 'text-act-hi bg-act/15' },
            { n: board.boxes.toLocaleString(), cap: '검수 대상 컨테이너', tag: '대기', tone: 'text-st-lodHi bg-st-lod/15',
              // ③ 2.4x (검수사 확정): 이 KPI만 터미널별로 분해한다 -- info.pier 로 가른다.
              //   라벨은 검수사 확정 그대로: PCTC=평택컨테이너터미널 · PNCT=동방아이포트 · 그 외=미상. 0이면 칸을 안 그린다.
              breakdown: [
                board.byPier.PCTC > 0 ? ['평택컨테이너터미널', board.byPier.PCTC] : null,
                board.byPier.PNCT > 0 ? ['동방아이포트', board.byPier.PNCT] : null,
                board.byPier.unknown > 0 ? ['미상', board.byPier.unknown] : null,
              ].filter(Boolean) },
            { n: working.length, cap: '작업 중 검수원', tag: 'LIVE', tone: 'text-st-disHi bg-st-dis/15' },
          ].map(st => (
            <div key={st.cap} className="bg-ink-950/60 border border-line rounded-btn p-3.5">
              <div className="flex justify-end mb-2">
                <span className={`text-3xs font-black px-1.5 py-0.5 rounded ${st.tone}`}>{st.tag}</span>
              </div>
              <div className="text-3xl font-black text-dim-100">{st.n}</div>
              <div className="text-[10.5px] text-dim-400 mt-0.5">{st.cap}</div>
              {st.breakdown && st.breakdown.length > 0 && (
                <div className="mt-2 pt-2 border-t border-line-faint flex flex-col gap-0.5">
                  {st.breakdown.map(([label, n]) => (
                    <div key={label} className="flex items-center justify-between text-[10px] text-dim-400">
                      <span>{label}</span><span className="font-bold text-dim-200">{n.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-screen flex flex-col lg:min-h-0 lg:rounded-card lg:border lg:border-line lg:bg-ink-900/40 lg:p-7">
        {/* 2.10: PC 는 좌측 패널에 로고가 이미 크게 있다 — 시안대로 「작업자 선택」 제목으로 대체 */}
        <div className="hidden lg:block mb-5">
          <h2 className="text-2xl font-black text-dim-100">작업자 선택</h2>
          <div className="text-xs2 text-dim-400 mt-1">{list.length}명의 검수사 · 평택항 컨테이너 터미널</div>
        </div>

        {/* ── 2.11 폰 히어로 (검수사 시안 «폰용도 마음에 듭니다») — PC 는 좌측 패널이 대신한다 ── */}
        <div className="lg:hidden relative h-[150px] shrink-0 overflow-hidden">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[420px] h-[320px] rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(closest-side, rgba(0,209,143,.20), transparent)' }}/>
          <div className="absolute top-4 right-7 w-[120px] h-[120px] rounded-full blur-[32px] opacity-60"
               style={{ background: 'radial-gradient(closest-side, rgba(56,189,248,.35), transparent)' }}/>
          <div className="relative z-10 flex flex-col items-center pt-5">
            <img src={logoUrl} alt="TallyOne" draggable="false"
                 className="w-[56px] h-[56px] rounded-[18px] select-none"
                 style={{ boxShadow: '0 12px 32px rgba(212,175,55,.26)' }}/>
            <div className="mt-2.5 text-[23px] font-black tracking-tight text-white leading-none">TallyOne</div>
            <div className="mt-1 text-[11.5px] font-medium text-dim-300">평택항 컨테이너 검수</div>
            <span className="mt-2.5 h-[26px] px-3 rounded-full inline-flex items-center gap-2 text-xxs font-semibold text-act-soft"
                  style={{ border: '1px solid rgba(0,209,143,.28)', background: 'rgba(0,209,143,.10)' }}>
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-act opacity-60"/>
                <span className="relative inline-flex w-2 h-2 rounded-full bg-act-hi"/>
              </span>
              그린마린 검수팀 · {board.ships.filter(x => x.rank === 0).length > 0
                ? `오늘 ${board.ships.filter(x => x.rank === 0).length}척 작업중` : `진행 ${board.total}항차`}
            </span>
          </div>
        </div>

        {/* ── 2.11 폰 바텀시트 — PC 에서는 껍데기만 남고 종전 흐름 그대로 ── */}
        <div className="flex-1 flex flex-col bg-ink-900 rounded-t-[32px] -mt-3 relative z-20 overflow-hidden border-t border-white/5 shadow-[0_-12px_40px_rgba(0,0,0,0.45)]
                        lg:bg-transparent lg:rounded-none lg:mt-0 lg:border-0 lg:overflow-visible lg:shadow-none lg:flex-none">
          <div className="lg:hidden flex justify-center pt-3 pb-2 shrink-0"><div className="w-9 h-[5px] rounded-full bg-ink-750"/></div>
          <div className="lg:hidden px-5 pb-2.5 flex items-center justify-between shrink-0">
            <h2 className="text-[18px] font-bold tracking-tight text-white">작업자 선택</h2>
            <span className="text-xs2 font-semibold px-2.5 h-[22px] rounded-full bg-ink-850 text-dim-200 border border-line-faint flex items-center">{list.length}명</span>
          </div>
          {board.ships.length > 0 && (
            <div className="hidden mx-3.5 mb-2.5 bg-ink-900 border border-line-faint rounded-card px-3 py-2.5 shrink-0">
              <div className="text-2xs font-bold tracking-[0.12em] text-dim-400 mb-2">■ 오늘 · 내일 작업 선박</div>
              <div className="flex flex-wrap gap-1.5">
                {board.ships.slice(0, 8).map(sp => (
                  <span key={sp.key} className={`rounded-pill px-2.5 py-1 text-xxs font-black tracking-wide border ${
                    sp.rank === 0 ? 'bg-emerald-500/15 text-act-soft border-emerald-500/35'
                    : sp.rank === 1 ? 'bg-st-dis/15 text-st-disHi border-st-dis/35'
                    : 'bg-ink-850 text-dim-300 border-line-faint'}`}>
                    {sp.vsl}<span className="text-3xs font-semibold opacity-75 ml-1">
                      {sp.rank === 0 ? (berthNo(sp.berth) || '작업중') : (sp.rank === 1 ? hhmm(sp.ms) : '내일')}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* V9.13 계승: 자동 로그아웃 안내 */}
        {notice && (
          <div className="mb-3 text-xs2 text-amber-100 bg-amber-900/40 border border-amber-700/60 rounded-pill px-3 py-2 leading-relaxed">
            ⏱ {notice}
          </div>
        )}

        {/* 현재 작업중/로그인 인원 요약 */}
        {(working.length > 0 || online.length > 0) && (
          <div className="text-xxs mb-2 px-1">
            {working.length > 0 && <span className="text-emerald-300">● {working.length}명 작업중: {working.map(a => a.name).join(', ')}</span>}
            {working.length > 0 && online.length > 0 && <span className="text-dim-400"> · </span>}
            {online.length > 0 && <span className="text-sky-300">○ {online.length}명 로그인: {online.map(a => a.name).join(', ')}</span>}
          </div>
        )}

        {/* ── 검수원 목록 (역할 뱃지 — 수석/부수석 강조) ── */}
        {shownList.length === 0 && !showAll && (
          <div className="px-3.5 pb-2 shrink-0">
            <div className="rounded-card border border-dashed border-line-faint px-4 py-5 text-center">
              <div className="text-sm2 font-bold text-dim-200">오늘 이 기기에서 로그인한 사람이 없습니다</div>
              <div className="mt-1.5 text-[11.5px] text-dim-400 leading-relaxed">아래에 이름을 입력해 시작하거나,<br/>«로그인 안 된 작업자»에서 고르세요.</div>
            </div>
          </div>
        )}
        {shownList.length > 0 && (
          <div className="flex-1 overflow-y-auto px-3.5 pb-1 space-y-2 lg:flex-none lg:px-0 lg:space-y-0 lg:mb-3 lg:max-h-none lg:grid lg:grid-cols-2 lg:gap-2">
            {shownList.map(i => {
              const role = displayRole(i.name);   // 1.71: 이사급 이상만 직급, 그 아래는 직책(없으면 검수)
              const chief = isChief(i.name);
              const isSel = i.name === selected;
              return (
                <button
                  key={i.name}
                  onClick={() => setSelected(i.name)}
                  className={`relative w-full h-16 rounded-[16px] flex items-center gap-3 px-3 text-left border transition-all
                    lg:h-[62px] lg:px-3 lg:rounded-btn ${
                    isSel ? 'bg-act/15 border-act/45'
                          : 'bg-ink-800 border-line-faint hover:border-line-faint hover:bg-ink-850'}`}
                >
                  {isSel && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-act"/>}
                  <span className={`w-[42px] h-[42px] rounded-full flex items-center justify-center text-[15px] font-bold text-white flex-shrink-0
                    lg:w-10 lg:h-10 lg:text-sm bg-gradient-to-br ${
                    chief ? 'from-violet-400 to-violet-700' : 'from-amber-400 to-amber-700'}`}
                    style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.18)' }}>
                    {i.name[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold tracking-tight text-white truncate leading-none">{i.name}</span>
                      {/* 2.22: 본인 표시 — 로그인 중이 **아니어도** 오늘 하루는 목록에 남는다.
                          표가 없으면 «왜 이 사람만 남아 있지?» 가 된다. */}
                      {meName && i.name === meName && (
                        <span className="h-5 px-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-2xs font-bold flex items-center flex-shrink-0">나</span>
                      )}
                      {inspectorStatus(i) === 'working' && (
                        <span className="h-5 px-1.5 rounded-full text-2xs font-bold flex items-center flex-shrink-0"
                              style={{ background: 'rgba(0,209,143,.14)', border: '1px solid rgba(0,209,143,.28)', color: '#7CF1C2' }}>작업중</span>
                      )}
                      {inspectorStatus(i) === 'online' && (
                        <span className="h-5 px-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-2xs font-bold flex items-center flex-shrink-0">로그인</span>
                      )}
                      {/* 2.11: 비밀번호를 물을 이름은 **미리** 알려 준다 — 시안엔 없던 것.
                          모르고 누르면 «왜 비밀번호 창이 뜨지?» 가 된다. */}
                      {isLockedName(guard, i.name) && (
                        <span className="h-5 px-1.5 rounded-full bg-violet-500/15 border border-violet-400/30 text-violet-300 text-2xs font-bold flex items-center flex-shrink-0">🔒 보호</span>
                      )}
                    </div>
                    {role && (
                      <div className={`mt-1 text-[11.5px] truncate leading-none ${chief ? 'text-violet-300 font-bold' : 'text-dim-200'}`}>
                        {chief && '👑 '}{role}
                      </div>
                    )}
                  </div>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center border text-[14px] font-black flex-shrink-0 lg:hidden ${
                    isSel ? 'bg-act border-act text-act-on' : 'bg-ink-900 border-line-faint text-transparent'}`}>✓</span>
                </button>
              );
            })}
          </div>
        )}
        {/* 2.12-01: 로그인 안 된 사람은 접어 둔다 — 목록이 비어도 이 버튼은 보여야 길이 열린다. */}
        <div className="px-3.5 pb-2 shrink-0 lg:px-0">
          {hiddenCount > 0 && !showAll && (
            <button onClick={() => setShowAll(true)}
              className="w-full h-11 rounded-[14px] border border-dashed border-line-faint text-xs2 font-bold text-dim-400 hover:text-dim-200 hover:border-line-strong">
              로그인 안 된 작업자 {hiddenCount}명 보기
            </button>
          )}
          {showAll && (
            <button onClick={() => setShowAll(false)}
              className="w-full h-11 rounded-[14px] border border-dashed border-line-faint text-xs2 font-bold text-dim-400 hover:text-dim-200">
              로그인한 작업자만 보기
            </button>
          )}
        </div>

        {/* ── 직접 입력 + 로그인 — 2.11: 폰은 시트 하단에 고정(shrink-0), PC 는 종전 흐름 ── */}
        <div className="shrink-0 bg-ink-900 border-t border-line-faint px-3.5 pt-3.5 pb-3.5 shadow-[0_-8px_24px_rgba(0,0,0,0.25)]
                        lg:bg-transparent lg:border-line lg:px-0 lg:pb-0 lg:shadow-none lg:mb-3">
          <div className="hidden lg:block text-xxs text-dim-300 mb-1.5 font-bold">목록에 없으면 이름 직접 입력</div>
          <div className="flex gap-2.5 items-center">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDirect()}
              placeholder="목록에 없으면 이름 입력"
              className="flex-1 min-w-0 h-14 bg-ink-800 border border-line-faint rounded-card px-3.5 text-[15px] font-medium text-white placeholder:text-dim-500 focus:outline-none focus:border-act/60
                         lg:h-auto lg:rounded lg:py-2 lg:text-sm lg:bg-ink-800 lg:border-line"
              autoFocus={list.length === 0}
            />
            <button
              onClick={handleDirect}
              disabled={!newName.trim()}
              className="h-14 px-4 rounded-card bg-ink-700 hover:bg-ink-700 disabled:bg-ink-800 disabled:text-dim-500 text-sm font-bold text-dim-100 flex items-center gap-1 shrink-0
                         lg:h-auto lg:py-2 lg:rounded lg:bg-ink-750"
            >
              <UserPlus className="w-4 h-4"/>선택
            </button>
          </div>
          {selected && !selectedInList && (
            <div className="mt-2 text-xs2 text-emerald-200">선택됨: <b>{selected}</b>{displayRole(selected) ? ` · ${displayRole(selected)}` : ''}</div>
          )}

        {/* ── 로그인 버튼 ── */}
        <button
          onClick={handleLogin}
          disabled={!selected}
          className="w-full h-[60px] mt-3 rounded-[18px] font-black text-base flex items-center justify-center gap-2 transition-all active:scale-[0.99]
                     bg-gradient-to-r from-act-dn to-act-hi hover:brightness-110 shadow-[0_10px_24px_rgba(0,209,143,0.28)]
                     disabled:bg-none disabled:bg-ink-800 disabled:text-dim-500 disabled:shadow-none text-act-on lg:h-auto lg:py-3.5 lg:rounded-btn lg:mt-0"
        >
          <LogIn className="w-5 h-5"/>{selected ? `${selected} 님으로 시작` : '작업자를 선택해주세요'}
        </button>

        {/* 검수원 변경으로 들어온 경우(이미 로그인됨) — 돌아가기 */}
        {current && onCancel && (
          <button onClick={onCancel} className="mt-3 w-full py-2 text-sm text-dim-300 hover:text-dim-100 flex items-center justify-center gap-1.5">
            <ArrowLeft className="w-4 h-4"/>{current} 그대로 돌아가기
          </button>
        )}
        <div className="lg:hidden mt-2 text-center text-[10.5px] text-dim-500 font-medium">🔒 표시는 비밀번호를 한 번 확인합니다</div>
        </div>{/* 2.11: 하단 고정 바 닫기 */}
        </div>{/* 2.11: 폰 바텀시트 닫기 (PC 에서는 껍데기만) */}
      </div>
      </div>{/* 2.10: lg 2단 래퍼 닫기 — 게이트 오버레이는 fixed 라 바깥에 둔다 */}

      {/* ── 비밀번호 게이트 (setup/verify/owner) — 전체 화면 오버레이 ── */}
      {gateMode && (
        <div className="fixed inset-0 z-50 bg-ink-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-ink-900 border border-amber-600/60 rounded-pill p-4">
            <div className="font-bold text-amber-200 text-sm mb-2">
              {gateMode === 'setup' ? `🔐 ${gateName} 비밀번호 설정`
                : gateMode === 'owner' ? `🔑 ${OWNER_NAME} 비밀번호로 ${gateName} 열기`
                : gateMode === 'recovery' ? `🔑 복구 코드로 ${gateName} 열기`
                : `🔐 ${gateName} 선택 — 비밀번호`}
            </div>
            {gateMode === 'setup' && (
              <div className="text-xxs text-dim-300 mb-2">
                <b className="text-amber-300">{displayRole(gateName) || '보호 대상'}</b> 이름은 본인만 쓸 수 있습니다. 처음 한 번 비밀번호를 정하세요.
                이 기기가 신뢰 기기 1호가 되고, 신뢰 기기(최대 {MAX_TRUSTED_DEVICES}대)에서는 다음부터 비밀번호 없이 선택됩니다.
              </div>
            )}
            {gateMode === 'verify' && (
              <div className="text-xxs text-dim-300 mb-2">
                이 기기는 <b className="text-amber-300">{gateName}</b> 님의 신뢰 기기가 아닙니다. 본인 비밀번호를 입력하세요.
              </div>
            )}
            {gateMode === 'owner' && (
              <div className="text-xxs text-dim-300 mb-2">
                {gateName} 님이 비밀번호를 잊었을 때 씁니다. {OWNER_NAME} 비밀번호를 입력하면 이번 접속만 열립니다
                (이 기기는 신뢰 기기로 등록되지 않습니다).
              </div>
            )}
            {/* ★ 2.53 */}
            {gateMode === 'recovery' && (
              <div className="text-xxs text-dim-300 mb-2">
                미리 받아 두신 <b className="text-amber-300">복구 코드 파일</b>의 코드를 입력하세요.
                통과하면 <b className="text-amber-300">이어서 새 비밀번호를 정합니다.</b><br />
                소문자로 치셔도, 하이픈(-)을 빼고 치셔도 됩니다.
                <span className="text-amber-300"> ⚠ 이 코드는 한 번 쓰면 소멸합니다.</span>
              </div>
            )}
            <input
              /*  ⚠ 2.53: 복구 코드는 가리지 않는다 — 종이·파일에서 옮겨 적는 값이라
                    안 보이면 오타를 못 잡는다. 비밀번호가 아니라 일회용 코드다. */
              type={gateMode === 'recovery' ? 'text' : 'password'} value={pw1} onChange={e => setPw1(e.target.value)}
              autoCapitalize={gateMode === 'recovery' ? 'characters' : 'off'}
              autoComplete={gateMode === 'recovery' ? 'off' : 'current-password'}
              onKeyDown={e => e.key === 'Enter' && (gateMode === 'setup' ? handleSetup()
                : gateMode === 'owner' ? handleOwnerUnlock()
                : gateMode === 'recovery' ? handleRecovery() : handleVerify())}
              placeholder={gateMode === 'owner' ? `${OWNER_NAME} 비밀번호`
                : gateMode === 'recovery' ? 'XXXX-XXXX-XXXX-XXXX' : '비밀번호'}
              className="w-full bg-ink-800 border border-line rounded px-3 py-2 text-sm text-dim-100 mb-2 focus:outline-none focus:border-amber-500"
              autoFocus
            />
            {gateMode === 'setup' && (
              <input
                type="password" value={pw2} onChange={e => setPw2(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSetup()}
                placeholder="비밀번호 확인"
                className="w-full bg-ink-800 border border-line rounded px-3 py-2 text-sm text-dim-100 mb-2 focus:outline-none focus:border-amber-500"
              />
            )}
            {/* V9.45 계승: 그 사람 기기 수 기준으로 신뢰 기기 등록 여부 노출 */}
            {gateMode === 'verify' && Object.keys(lockEntry(guard, gateName)?.devices || {}).length < MAX_TRUSTED_DEVICES && (
              <label className="flex items-center gap-2 text-xxs text-dim-200 mb-2 select-none">
                <input type="checkbox" checked={regDevice} onChange={e => setRegDevice(e.target.checked)}/>
                이 기기를 신뢰 기기로 등록 ({Object.keys(lockEntry(guard, gateName)?.devices || {}).length}/{MAX_TRUSTED_DEVICES})
              </label>
            )}
            <div className="flex gap-2">
              <button
                onClick={gateMode === 'setup' ? handleSetup
                  : gateMode === 'owner' ? handleOwnerUnlock
                  : gateMode === 'recovery' ? handleRecovery : handleVerify}
                disabled={gateBusy || !pw1}
                className="flex-1 bg-amber-700 hover:bg-amber-600 disabled:bg-ink-750 disabled:text-dim-400 px-3 py-2 rounded text-sm font-bold text-amber-100"
              >
                {gateBusy ? '확인 중…' : '확인'}
              </button>
              <button
                onClick={closeGate}
                className="px-3 py-2 rounded text-sm bg-ink-800 border border-line text-dim-200"
              >
                취소
              </button>
            </div>
            {/* 비밀번호를 잊었을 때의 출구 ① — 소유자가 열어준다(소유자 본인에게는 안 뜬다) */}
            {gateMode !== 'owner' && gateMode !== 'recovery' && ownerCanUnlock(guard, gateName) && (
              <button
                onClick={() => { setGateMode('owner'); setPw1(''); setPw2(''); }}
                className="mt-2 w-full text-xxs text-dim-300 hover:text-amber-300 underline underline-offset-2"
              >
                비밀번호를 잊으셨나요? — {OWNER_NAME} 비밀번호로 열기
              </button>
            )}
            {/* ★ 2.53 출구 ② — 복구 코드. **소유자에게는 이것이 유일한 길이다.**
                미리 만들어 둔 사람에게만 뜬다 — 없으면 뜨지 않는다(있는 척하지 않는다). */}
            {gateMode !== 'recovery' && hasRecoveryCode(guard, gateName) && (
              <button
                onClick={() => { setGateMode('recovery'); setPw1(''); setPw2(''); }}
                className="mt-2 w-full text-xxs text-dim-300 hover:text-amber-300 underline underline-offset-2"
              >
                🔑 복구 코드로 열기 — 미리 받아 둔 파일의 코드
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
