// M5.73: 인원 관리 전용 모달 (김성일만 진입)
//   InspectorModal과 분리 — 선택과 관리를 명확히 구분
import React, { useState } from 'react';
import { inspectorStatus } from '../inspectorStatus.js';
import { X, UserPlus, Trash2, Shield, RefreshCw, Download } from 'lucide-react';
import { isStaff, getStaffRole, STAFF_LIST, STAFF_NAMES, displayRole, compareStaff, isVisibleStaff, isChief, isTester, splitRole } from '../staffList.js';   // 1.71: 직책 표시·정렬 단일 소스
import { fbAddStaff, fbDeleteStaff, fbDeleteInspector, fbMarkDeletedStaff, fbUnmarkDeletedStaff, fbBackupAll, fbGetAdminGuard, fbUpdateAdminGuard, fbRemoveAdminDevice, fbSubscribeDevAccess, fbSetDevAccess, fbSubscribeMatrixEditors, fbSetMatrixEditors, fbSetStaffRole } from '../firebase.js';   // 1.41: 개발용 접근  // 1.80: 매트릭스 권한
import { getAdminDeviceId, hashPassword, makeSalt, MAX_TRUSTED_DEVICES,
         getAdminNames, isAdminName, adminEntry, ADMIN_NAME,
         OWNER_NAME, isOwnerName, canRevokeAdmin,
         makeRecoveryCode, buildRecoveryRecord, hasRecoveryCode,
         recoveryFileText, recoveryFileName } from '../adminGuard.js';   // V9.05 · V9.09 다중 관리자 · V9.10 소유자 고정 · 2.53 복구 코드

export default function StaffManagerModal({ current, inspectors, extraStaff = {}, deletedStaff = {}, onClose }) {
  // ── V9.05: 관리자 이름 보호 — 신뢰 기기 관리 ────────────────────────────
  const [guardInfo, setGuardInfo] = useState(null);
  React.useEffect(() => {
    let alive = true;
    fbGetAdminGuard().then(g => { if (alive) setGuardInfo(g); });
    return () => { alive = false; };
  }, []);
  // ── TallyOne 1.41: 개발용 접근 (검수사 지시 2026-08-10) ──────────────────────
  //   *"클로드가 코드수정을 수월하게 하기 위해서 입니다. 직급은 없이 개발용으로 하면 됩니다."*
  //   수석 대시보드 **화면만** 열어 준다. 직급도 아니고 비밀번호 잠금 대상도 아니다.
  //   화면 안의 마감 텔리 생성·아카이브 복원·정리·최종 저장은 여전히 수석만 할 수 있다.
  const [devAccess, setDevAccessState] = useState({});
  React.useEffect(() => fbSubscribeDevAccess(setDevAccessState), []);
  const [devBusy, setDevBusy] = useState('');
  const handleToggleDev = async (name, on) => {
    if (on && !window.confirm(
      `개발용 접근 부여: ${name}\n\n수석 대시보드 화면을 볼 수 있게 됩니다.\n` +
      `· 직급은 바뀌지 않습니다.\n· 비밀번호 잠금은 걸리지 않습니다.\n` +
      `· 마감 텔리 생성·복원·최종 저장은 여전히 수석만 가능합니다.`)) return;
    if (!on && !window.confirm(`개발용 접근 회수: ${name}`)) return;
    setDevBusy(name);
    const r = await fbSetDevAccess(current, name, on);
    setDevBusy('');
    if (!r.ok) {
      alert(r.reason === 'not_admin'
        ? '관리자만 개발용 접근을 주고 뺄 수 있습니다.'
        : '저장 실패 — 네트워크를 확인하세요.');
    }
  };

  // ── TallyOne 1.80: 매트릭스 편집 권한 (검수사 확정 2026-08-17) ──────────────
  //   *"베이 매트릭스 편집 이권한도 인원관리로 들어가야 할듯 합니다. 지금은 선박을 하나
  //    선택해야만 정할수 있게 되어 있습니다."*
  //   저장은 기존 matrix_editors 노드 그대로 — 빌더 안 「권한자 관리」 패널과 같은 명단을 본다.
  //   fbSetMatrixEditors 자격은 1.80 에서 «명단 포함 ∨ 관리자»로 넓혔다(인원관리는 관리자 전용 화면).
  const [matrixEditors, setMatrixEditors] = useState([]);
  React.useEffect(() => fbSubscribeMatrixEditors(setMatrixEditors), []);
  const [mxBusy, setMxBusy] = useState('');
  const handleToggleMatrix = async (name, on) => {
    if (on && !window.confirm(
      `매트릭스 편집 권한 부여: ${name}

베이 매트릭스(베이사전)를 만들고 고칠 수 있게 됩니다.
` +
      `· 매트릭스는 배 구조의 정본입니다 — 잘못 고치면 전 화면이 틀어집니다.`)) return;
    if (!on && !window.confirm(`매트릭스 편집 권한 회수: ${name}`)) return;
    if (!on && matrixEditors.length <= 1) { alert('마지막 권한자는 회수할 수 없습니다(잠금 방지).'); return; }
    setMxBusy(name);
    const next = on ? [...matrixEditors, name] : matrixEditors.filter(e => e !== name);
    const r = await fbSetMatrixEditors(current, next);
    setMxBusy('');
    if (!r.ok) {
      alert(r.reason === 'not_authorized'
        ? '관리자 또는 기존 권한자만 매트릭스 권한을 주고 뺄 수 있습니다.'
        : r.reason === 'empty_not_allowed'
          ? '마지막 권한자는 회수할 수 없습니다(잠금 방지).'
          : '저장 실패 — 네트워크를 확인하세요.');
    }
  };

  // ── TallyOne 1.81: 기존 인원 테스터 부여/회수 (검수사 확정 2026-08-17) ────────
  //   왜 — *"임원들에게 테스터 자격을 부여하고 앱 설명을 하기 위해서"* · *"임원 전체가 아니고 한두명".*
  //   임원은 전부 코드 명단의 기존 인원이라 «지웠다 재추가»가 불가능(중복 거부) — 행별 토글이 답이다.
  //   직급은 살리고 직책만 얹는다: 회장 → 회장(테스터), 회수하면 회장. 서버 role 이 코드 명단보다
  //   우선하므로 재배포 없이 반영된다. 테스터는 잠금 대상 — 첫 로그인 때 본인 비밀번호를 정한다.
  const [testerBusy, setTesterBusy] = useState('');
  const grantTesterRole = (role) => { const { rank } = splitRole(role); return rank && rank !== '검수' ? `${rank}(테스터)` : '테스터'; };
  const revokeTesterRole = (role) => { const { rank } = splitRole(role); return rank && rank !== '테스터' ? rank : '검수'; };
  const handleToggleTester = async (name) => {
    const cur = getStaffRole(name);
    const on = !isTester(name);
    const next = on ? grantTesterRole(cur) : revokeTesterRole(cur);
    if (on && !window.confirm(
      `테스터 부여: ${name}

직책이 «${cur || '검수'}» → «${next}» 로 바뀝니다.
` +
      `· 수석 대시보드·마감텔리까지 전 기능을 쓸 수 있습니다(소유자 고유만 제외).
` +
      `· 첫 로그인 때 본인 비밀번호(4자 이상)를 정하는 창이 뜹니다.`)) return;
    if (!on && !window.confirm(`테스터 회수: ${name} — 직책이 «${next}» 로 돌아갑니다.`)) return;
    setTesterBusy(name);
    const ok = await fbSetStaffRole(name, next);
    setTesterBusy('');
    if (!ok) alert('저장 실패 — 네트워크를 확인하세요.');
  };

  const handleRemoveDevice = async (devId, label) => {
    if (!window.confirm(`신뢰 기기 해제: ${label || devId}\n이 기기에서는 앞으로 관리자 선택 시 비밀번호가 필요합니다.`)) return;
    const ok = await fbUpdateAdminGuard({ [`admins/${current}/devices/${devId}`]: null });
    if (ok) { const g = await fbGetAdminGuard(); setGuardInfo(g); }
    else alert('해제 실패 — 네트워크를 확인하세요.');
  };
  // V9.09: 내 비밀번호만 바꾼다(admins/{나}). 다른 관리자 비밀번호는 건드리지 않는다.
  const handleChangePw = async () => {
    const pw = window.prompt(`${current} 새 비밀번호 (4자 이상):`);
    if (!pw) return;
    if (pw.length < 4) { alert('4자 이상으로 하세요.'); return; }
    const salt = makeSalt();
    const pwHash = await hashPassword(pw, salt);
    const ok = await fbUpdateAdminGuard({
      [`admins/${current}/pwHash`]: pwHash,
      [`admins/${current}/salt`]: salt,
    });
    if (ok) { alert('✅ 비밀번호 변경 완료'); const g = await fbGetAdminGuard(); setGuardInfo(g); }
    else alert('변경 실패 — 네트워크를 확인하세요.');
  };
  // ── ★ 2.53 복구 코드 만들기 ───────────────────────────────────────────────
  //  검수사 2026-08-26 — *«수석 임원 그리고 저 비밀번호 분실시 접속할 방법이 없어요»* · *«그종이를 파일로 주세요»*
  //  ⚠ 코드는 **여기(브라우저)에서** 만든다. 서버에도 클로드에게도 평문이 가지 않는다.
  //  ⚠ 화면에 한 번 보여주고 파일로 내린 뒤 **다시는 못 본다** — 그래서 저장을 확인한 뒤에 알린다.
  const handleMakeRecovery = async () => {
    const already = hasRecoveryCode(guardInfo, current);
    if (already && !window.confirm(
      `${current} 님의 복구 코드가 이미 있습니다.\n\n새로 만들면 **옛 코드는 그 순간 쓸 수 없게 됩니다.**\n`
      + '전에 받아 둔 파일이 있으면 버리셔야 합니다.\n\n새로 만들까요?')) return;
    const code = makeRecoveryCode();
    const rec = await buildRecoveryRecord(code);
    //  ⛔ 저장이 안 됐는데 코드를 보여주면 «있는 줄 알았는데 없는» 최악이 된다 — 저장 먼저.
    const ok = await fbUpdateAdminGuard({ [`recovery/${current}`]: rec });
    if (!ok) { alert('⛔ 저장 실패 — 코드를 만들지 않았습니다. 네트워크를 확인하고 다시 해 주세요.'); return; }
    try {
      const blob = new Blob(['\ufeff' + recoveryFileText(current, code)], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = recoveryFileName(current);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      //  파일이 안 내려가도 코드는 이미 유효하다 — 화면 값이라도 반드시 보여준다(조용히 실패 금지).
      console.error('[복구 코드] 파일 저장 실패', e);
    }
    setRecoveryShown(code);
    const g = await fbGetAdminGuard(); setGuardInfo(g);
  };
  const [recoveryShown, setRecoveryShown] = useState('');

  const [newName, setNewName] = useState('');
  // TallyOne 1.74: 직급·직책 두 칸 (검수사 확정 2026-08-15)
  //   *"직급 직책 칸을 보여주시고 직책에 검수를 기본으로 넣어 주면 전 이름만 넣고 저장 누르면 되게끔"*
  //   저장 형식은 명단 규약 그대로 「직급(직책)」 한 덩어리. 직책이 '검수'면 괄호 없이 직급만/검수만 쓴다.
  const [newRank, setNewRank] = useState('');     // 직급 — 없으면 빈칸
  const [newDuty, setNewDuty] = useState('검수'); // 직책 — 기본 검수
  const composedRole = (() => {
    const r = newRank.trim(), d = newDuty.trim();
    if (r && d && d !== '검수') return `${r}(${d})`;
    if (r) return r;                 // 직급만 — 화면엔 「검수」로 보인다(직책 없음)
    return d || '검수';
  })();
  const [filter, setFilter] = useState('all'); // all | inspectors | staff
  const [backupBusy, setBackupBusy] = useState(false);

  // M6.10: 전체 데이터 백업 → JSON 다운로드
  const downloadBackup = async () => {
    if (backupBusy) return;
    if (!confirm('Firebase 전체 데이터를 JSON 파일로 다운로드합니다.\n(데이터 크기에 따라 수초 ~ 수십초 소요)\n계속하시겠습니까?')) return;
    setBackupBusy(true);
    try {
      const data = await fbBackupAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      a.href = url;
      a.download = `tallyman_backup_${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const sizeMb = (blob.size / 1024 / 1024).toFixed(2);
      alert(`✅ 백업 완료\n파일 크기: ${sizeMb} MB`);
    } catch (e) {
      alert(`❌ 백업 실패: ${e.message || e}`);
    } finally {
      setBackupBusy(false);
    }
  };

  // ── V9.09(2026-07-26): 관리자 권한 부여·회수 — 인수인계용 ─────────────────
  //   왜: 관리자 이름이 소스에 박혀 있어 담당자가 바뀌면 재배포해야만 넘길 수 있었다.
  //   원칙 — 비밀번호는 관리자마다 따로. 권한을 줘도 내 비밀번호를 알려줄 필요가 없고,
  //   받은 사람이 첫 선택 때 자기 것을 정한다. 마지막 1명은 회수 불가(잠김 방지).
  const adminNames = getAdminNames(guardInfo);
  const handleGrantAdmin = async (name) => {
    if (isAdminName(guardInfo, name)) return;
    if (!window.confirm(
      `"${name}" 님에게 관리자 권한을 주시겠습니까?\n\n` +
      `· 인원 관리 · 항차 삭제 · 기기 관리를 할 수 있게 됩니다.\n` +
      `· 비밀번호는 본인이 첫 선택 때 직접 정합니다(내 비밀번호는 알려주지 않아도 됩니다).\n` +
      `· 언제든 회수할 수 있고, 퇴사 처리하면 권한도 함께 사라집니다.`)) return;
    const ok = await fbUpdateAdminGuard({
      [`admins/${name}/grantedBy`]: current,
      [`admins/${name}/grantedAt`]: Date.now(),
      [`admins/${name}/revoked`]: null,
    });
    if (!ok) { alert('저장 실패 — 네트워크를 확인하세요.'); return; }
    // 구버전(단일 관리자) 상태였다면 현재 관리자도 admins 목록으로 옮겨 적는다(마이그레이션)
    if (!guardInfo?.admins && guardInfo?.pwHash) {
      await fbUpdateAdminGuard({
        [`admins/${ADMIN_NAME}/pwHash`]: guardInfo.pwHash,
        [`admins/${ADMIN_NAME}/salt`]: guardInfo.salt,
        [`admins/${ADMIN_NAME}/devices`]: guardInfo.devices || {},
        [`admins/${ADMIN_NAME}/grantedBy`]: '(초기)',
      });
    }
    const g = await fbGetAdminGuard(); setGuardInfo(g);
    alert(`✅ "${name}" 관리자 권한 부여 완료.\n그 분이 검수원 선택에서 자기 이름을 고르면 비밀번호를 정하게 됩니다.`);
  };
  const handleRevokeAdmin = async (name) => {
    // V9.10: 소유자(개발·운영자) 권한은 회수 불가 — 앱이 쓰이는 한 유지돼야 버그를 고칠 수 있다.
    if (isOwnerName(name)) { alert(`${OWNER_NAME} 님은 앱 소유자입니다.\n관리자 권한을 회수할 수 없습니다.`); return; }
    if (!canRevokeAdmin(guardInfo, name)) { alert('마지막 관리자는 회수할 수 없습니다.\n먼저 다른 사람에게 권한을 준 뒤 회수하세요.'); return; }
    if (name === current && !window.confirm(
      `본인 권한을 내려놓습니다.\n이후 관리 기능을 쓸 수 없게 됩니다. 계속할까요?`)) return;
    if (name !== current && !window.confirm(`"${name}" 님의 관리자 권한을 회수하시겠습니까?`)) return;
    const ok = await fbUpdateAdminGuard({ [`admins/${name}`]: null });
    if (!ok) { alert('저장 실패 — 네트워크를 확인하세요.'); return; }
    const g = await fbGetAdminGuard(); setGuardInfo(g);
    alert(`"${name}" 관리자 권한을 회수했습니다.`);
  };

  // 관리자 아니면 차단
  if (!isAdminName(guardInfo, current)) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
        <div className="bg-ink-900 border border-red-700 rounded-btn p-6 max-w-sm text-center">
          <div className="text-red-300 font-bold mb-2">⛔ 권한 없음</div>
          <div className="text-dim-200 text-sm mb-4">인원 관리는 관리자(<b>{getAdminNames(guardInfo).join(', ')}</b>)만 가능합니다.</div>
          <button onClick={onClose} className="bg-ink-750 px-4 py-2 rounded text-white">확인</button>
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
  // TallyOne 1.71: 직책 1차 · 직급 2차 정렬(검수사 확정 2026-08-15). 직급은 순서에만 쓰고 화면엔 안 보인다.
  // TallyOne 1.73: 개발·시험 계정은 소유자에게만 보인다.
  filtered = [...filtered].filter(s => isVisibleStaff(s.name, isOwnerName(current))).sort(compareStaff);

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
    if (!confirm(`"${raw}" (${composedRole}) — 신규 직원 추가하시겠습니까?\n(Firebase 영구 저장 — 전 직원 접속 가능)`)) return;
    try {
      await fbAddStaff(raw, composedRole);
      setNewName('');
      setNewRank(''); setNewDuty('검수');
    } catch (e) {
      alert('추가 실패: ' + e.message);
    }
  };

  // V9.10(2026-07-26): 퇴사 처리 규칙 정리
  //   · 소유자 — 퇴사 처리해도 관리자 권한·접속은 그대로. 앱이 쓰이는 한 유지돼야 한다.
  //   · 그 외 관리자 — 퇴사 처리하면 관리자 권한이 함께 삭제된다(먼저 회수할 필요 없음).
  const handleDeleteStaff = async (name) => {
    const owner = isOwnerName(name);
    const wasAdmin = !owner && isAdminName(guardInfo, name);
    const msg = owner
      ? `"${name}" — 퇴사 처리하시겠습니까?\n\n소유자이므로 관리자 권한과 앱 접속은 그대로 유지됩니다.\n(명단에만 퇴사로 표시)`
      : wasAdmin
        ? `"${name}" — 퇴사 처리하시겠습니까?\n\n⚠ 관리자 권한도 함께 삭제됩니다.\n(접속 차단 + 명단 숨김. 복구해도 권한은 다시 부여해야 합니다)`
        : `"${name}" — 퇴사 처리하시겠습니까?\n(접속 차단 + 명단 숨김. 복구 가능)`;
    if (!confirm(msg)) return;
    try {
      // 관리자였다면 권한 먼저 삭제 (소유자는 제외)
      if (wasAdmin) {
        const ok = await fbUpdateAdminGuard({ [`admins/${name}`]: null });
        if (!ok) { alert('관리자 권한 삭제 실패 — 네트워크를 확인하세요. 퇴사 처리를 중단합니다.'); return; }
      }
      // Firebase 동적 명단에 있으면 삭제
      if (extraStaff[name]) await fbDeleteStaff(name);
      // 검수원 활동 기록 삭제
      if (inspectorMap[name]) await fbDeleteInspector(name);
      // M5.74: 코드 명단도 deletedStaff 마커로 제외 (퇴사자 처리)
      await fbMarkDeletedStaff(name);
      if (wasAdmin) { const g = await fbGetAdminGuard(); setGuardInfo(g); }
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
    if (isOwnerName(name)) { alert(`${OWNER_NAME} 님은 앱 소유자입니다.\n접속 기록을 제거할 수 없습니다.`); return; }
    if (!confirm(`"${name}" 접속 기록을 제거하시겠습니까?\n(명단에는 남음, 다시 접속 가능)`)) return;
    try {
      await fbDeleteInspector(name);
    } catch (e) {
      alert('제거 실패: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
      <div className="bg-ink-900 border border-amber-700 rounded-btn w-full max-w-md max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-line">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <div>
              <div className="font-bold text-amber-200">인원 관리</div>
              <div className="text-2xs text-dim-300">관리자: {adminNames.join(', ')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadBackup} disabled={backupBusy}
              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-ink-750 disabled:text-dim-400 text-white rounded text-xs font-bold flex items-center gap-1"
              title="Firebase 전체 데이터 JSON 백업">
              <Download className="w-3.5 h-3.5"/>
              {backupBusy ? '백업 중...' : '백업'}
            </button>
            <button onClick={onClose} className="p-1 hover:bg-ink-750 rounded">
              <X className="w-5 h-5 text-dim-300" />
            </button>
          </div>
        </div>

        {/* V9.05: 관리자 이름 보호 — 신뢰 기기 관리 */}
        <div className="px-4 py-2 border-b border-line bg-ink-800/40">
          <div className="flex items-center justify-between">
            <div className="text-xxs font-bold text-amber-300">🔐 {current} 보호 — 신뢰 기기 {Object.keys(adminEntry(guardInfo, current)?.devices || {}).length}/{MAX_TRUSTED_DEVICES}</div>
            <div className="flex items-center gap-1">
              {/* ★ 2.53: 복구 코드 — 소유자에게만. 잠기면 아무도 못 열어 주기 때문이다(adminGuard.ownerCanUnlock 참조). */}
              {isOwnerName(current) && (
                <button onClick={handleMakeRecovery}
                  title="잠겼을 때 쓸 코드를 만들어 파일로 저장합니다. 화면에 한 번만 보여 줍니다."
                  className={`text-2xs px-2 py-1 rounded ${hasRecoveryCode(guardInfo, current)
                    ? 'bg-ink-750 hover:bg-ink-700 text-dim-100' : 'bg-amber-600/80 hover:bg-amber-600 text-white font-bold'}`}>
                  {hasRecoveryCode(guardInfo, current) ? '🔑 복구 코드 다시 만들기' : '🔑 복구 코드 만들기'}
                </button>
              )}
              <button onClick={handleChangePw} className="text-2xs px-2 py-1 bg-ink-750 hover:bg-ink-700 rounded text-dim-100">
                {adminEntry(guardInfo, current)?.pwHash ? '비밀번호 변경' : '비밀번호 미설정'}
              </button>
            </div>
          </div>
          {/* ★ 2.53: 만든 코드는 여기 한 번만 뜬다. 창을 닫으면 다시 못 본다. */}
          {recoveryShown && (
            <div className="mt-2 p-2 rounded border border-amber-500/60 bg-amber-500/10">
              <div className="text-xxs font-bold text-amber-300">🔑 복구 코드 — 지금 적어 두십시오. 다시 보여주지 않습니다.</div>
              <div className="my-1 text-center text-sm font-bold tracking-widest text-white select-all mono">{recoveryShown}</div>
              <div className="text-3xs text-dim-200 leading-relaxed">
                파일로도 저장했습니다(다운로드 폴더). 인쇄하거나 안전한 곳에 두십시오.<br />
                한 번 쓰면 소멸합니다 — 쓰고 나면 새로 만드십시오.<br />
                잠겼을 때 로그인 화면의 「복구 코드로 열기」에서 씁니다.
              </div>
              <button onClick={() => setRecoveryShown('')}
                className="mt-1 w-full text-3xs py-1 bg-ink-750 hover:bg-ink-700 rounded text-dim-100">
                적었습니다 — 닫기
              </button>
            </div>
          )}
          {Object.entries(adminEntry(guardInfo, current)?.devices || {}).map(([devId, d]) => (
            <div key={devId} className="flex items-center justify-between mt-1 text-xxs text-dim-200">
              <span>
                {d?.label || devId}{devId === getAdminDeviceId() && <span className="text-emerald-400"> (현재 기기)</span>}
                {d?.addedAt ? <span className="text-dim-400"> · {new Date(d.addedAt).toISOString().slice(0, 10)}</span> : null}
              </span>
              <button onClick={() => handleRemoveDevice(devId, d?.label)} className="text-red-400 hover:text-red-300 px-1.5">해제</button>
            </div>
          ))}
          {Object.keys(adminEntry(guardInfo, current)?.devices || {}).length === 0 && (
            <div className="text-2xs text-dim-400 mt-1">등록된 신뢰 기기 없음 — 검수원 선택에서 {current} 클릭 시 설정됩니다.</div>
          )}
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-1 p-2 border-b border-line">
          <button onClick={() => setFilter('all')}
            className={`flex-1 py-2 text-xs rounded ${filter === 'all' ? 'bg-amber-700 text-white' : 'bg-ink-800 text-dim-200'}`}>
            재직 ({allStaff.filter(s => !deletedStaff[s.name]).length})
          </button>
          <button onClick={() => setFilter('inspectors')}
            className={`flex-1 py-2 text-xs rounded ${filter === 'inspectors' ? 'bg-emerald-700 text-white' : 'bg-ink-800 text-dim-200'}`}>
            접속 ({inspectorList.filter(i => !deletedStaff[i.name]).length})
          </button>
          <button onClick={() => setFilter('deleted')}
            className={`flex-1 py-2 text-xs rounded ${filter === 'deleted' ? 'bg-red-800 text-white' : 'bg-ink-800 text-dim-200'}`}>
            퇴사 ({Object.keys(deletedStaff).length})
          </button>
        </div>

        {/* 신규 추가 폼 */}
        <div className="p-3 border-b border-line bg-ink-800/30">
          <div className="text-xs text-dim-300 mb-2 flex items-center gap-1"><UserPlus className="w-3 h-3"/> 신규 직원 추가</div>
          {/* TallyOne 1.74: 이름만 넣고 저장 — 직책은 «검수»가 기본. 직급·직책 있는 사람이 오면 그때 고른다. */}
          <div className="flex gap-2">
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="이름" className="flex-1 bg-ink-900 border border-line-strong rounded px-2 py-1.5 text-sm text-dim-100"/>
            <button onClick={handleAdd}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded text-sm font-bold">저장</button>
          </div>
          <div className="flex gap-2 mt-1.5 items-center">
            <label className="text-2xs text-dim-400 w-7 shrink-0">직급</label>
            <select value={newRank} onChange={e => setNewRank(e.target.value)}
              className="flex-1 bg-ink-900 border border-line-strong rounded px-2 py-1.5 text-sm text-dim-100">
              <option value="">없음</option>
              <option>대리</option>
              <option>과장</option>
              <option>차장</option>
              <option>부장</option>
              <option>실장</option>
              <option>이사</option>
              <option>상무이사</option>
              <option>대표이사</option>
              <option>회장</option>
            </select>
            <label className="text-2xs text-dim-400 w-7 shrink-0 text-right">직책</label>
            <select value={newDuty} onChange={e => setNewDuty(e.target.value)}
              className="flex-1 bg-ink-900 border border-line-strong rounded px-2 py-1.5 text-sm text-dim-100">
              <option>검수</option>
              <option>수석검수</option>
              <option>부수석</option>
              <option>실장</option>
              <option>테스터</option>{/* 1.79: 수석과 동일 권한 + 비번 잠금, 소유자 고유만 제외 */}
            </select>
          </div>
          <div className="mt-1 text-2xs text-dim-400">
            저장되는 값 <span className="text-dim-200 font-bold">{composedRole}</span>
            <span className="ml-1">· 화면 표기 <span className="text-amber-300 font-bold">{
              (() => { const r = newRank.trim(), d = newDuty.trim();
                if (['회장','대표이사','상무이사','이사'].includes(r)) return r;
                if (d && d !== '검수') return d;
                if (r === '실장') return '실장';
                return '검수'; })()
            }</span></span>
          </div>
        </div>

        {/* 명단 리스트 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map(s => {
            const _st = inspectorStatus(inspectorMap[s.name]);   // V7.94-14: 공용 판정
            const isActive = _st === 'working';
            const isLoggedIn = _st === 'online';
            const isOnline = !!inspectorMap[s.name];
            const isDynamic = !STAFF_NAMES.includes(s.name);  // Firebase에 동적 추가된 직원
            return (
              <div key={s.name} className="flex items-center gap-2 px-2 py-1.5 bg-ink-800/50 border border-line rounded">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isAdminName(guardInfo, s.name) ? 'bg-amber-500 text-ink-950' : 'bg-ink-700 text-dim-100'
                }`}>{s.name[0]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-sm font-bold text-dim-100">
                    {s.name}
                    {isOwnerName(s.name)
                      ? <span className="text-3xs bg-amber-600 text-ink-950 px-1 rounded font-black">소유자</span>
                      : isAdminName(guardInfo, s.name) && <span className="text-3xs bg-amber-900 text-amber-300 px-1 rounded">관리자</span>}
                    {isDynamic && <span className="text-3xs bg-purple-900 text-purple-300 px-1 rounded">추가됨</span>}
                    {devAccess[s.name] && <span className="text-3xs bg-cyan-900 text-cyan-300 px-1 rounded" title={`개발용 접근 — ${devAccess[s.name].grantedBy || ''} 부여`}>🛠 개발용</span>}
                    {matrixEditors.includes(s.name) && <span className="text-3xs bg-indigo-900 text-indigo-300 px-1 rounded" title="베이 매트릭스(베이사전) 편집 권한">📐 매트릭스</span>}
                    {isDeleted(s.name) && <span className="text-3xs bg-red-900 text-red-300 px-1 rounded">퇴사</span>}
                  </div>
                  {/* TallyOne 1.71: 이사급 이상만 직급, 그 아래는 직책. 직책 없으면 «검수». */}
                  <div className="text-2xs text-dim-300">{displayRole(s.name)}</div>
                </div>
                {isActive && <span className="text-3xs bg-emerald-700/40 text-emerald-300 px-1.5 py-0.5 rounded font-bold">●작업중</span>}
                {isLoggedIn && <span className="text-3xs bg-sky-900/50 text-sky-300 px-1.5 py-0.5 rounded font-bold">○로그인</span>}
                {isOnline && !isActive && !isLoggedIn && <span className="text-3xs bg-ink-750 text-dim-300 px-1.5 py-0.5 rounded">접속이력</span>}
                {/* 액션 버튼 */}
                {/* V9.09: 관리자 권한 부여·회수 — 인수인계 */}
                {!isDeleted(s.name) && (
                  isOwnerName(s.name) ? (
                    <span className="px-2 py-1 bg-ink-800 rounded text-amber-400/70 text-2xs font-bold" title="소유자 권한은 회수할 수 없습니다">
                      권한고정
                    </span>
                  ) : isAdminName(guardInfo, s.name) ? (
                    <button onClick={() => handleRevokeAdmin(s.name)}
                      className="px-2 py-1 bg-amber-800 hover:bg-amber-700 rounded text-amber-100 text-xs font-bold"
                      title={s.name === current ? '내 관리자 권한 내려놓기' : '관리자 권한 회수'}>
                      권한회수
                    </button>
                  ) : (
                    <button onClick={() => handleGrantAdmin(s.name)}
                      className="px-2 py-1 bg-ink-750 hover:bg-amber-800 rounded text-dim-100 hover:text-amber-100 text-xs font-bold"
                      title="관리자 권한 부여 — 비밀번호는 본인이 정합니다">
                      권한부여
                    </button>
                  )
                )}
                {/* 1.41: 개발용 접근 토글 — 관리자에게만 보인다(저장 시 서버에서 한 번 더 확인한다). */}
                {!isDeleted(s.name) && isAdminName(guardInfo, current) && !isOwnerName(s.name) && (
                  <button onClick={() => handleToggleDev(s.name, !devAccess[s.name])}
                    disabled={devBusy === s.name}
                    className={`px-2 py-1 rounded text-xs font-bold ${devAccess[s.name]
                      ? 'bg-cyan-800 hover:bg-cyan-700 text-cyan-100'
                      : 'bg-ink-750 hover:bg-cyan-900 text-dim-100 hover:text-cyan-100'} disabled:opacity-50`}
                    title={devAccess[s.name]
                      ? '개발용 접근 회수 — 수석 대시보드를 못 보게 됩니다'
                      : '개발용 접근 부여 — 수석 대시보드 화면만 열립니다(직급·비밀번호 변화 없음)'}>
                    {devBusy === s.name ? '…' : (devAccess[s.name] ? '개발회수' : '개발부여')}
                  </button>
                )}
                {/* 1.80: 매트릭스 편집 권한 토글 — 관리자에게만 보인다(저장 시 서버 판정 한 번 더). */}
                {!isDeleted(s.name) && isAdminName(guardInfo, current) && (
                  <button onClick={() => handleToggleMatrix(s.name, !matrixEditors.includes(s.name))}
                    disabled={mxBusy === s.name}
                    className={`px-2 py-1 rounded text-xs font-bold ${matrixEditors.includes(s.name)
                      ? 'bg-indigo-800 hover:bg-indigo-700 text-indigo-100'
                      : 'bg-ink-750 hover:bg-indigo-900 text-dim-100 hover:text-indigo-100'} disabled:opacity-50`}
                    title={matrixEditors.includes(s.name)
                      ? '매트릭스 편집 권한 회수'
                      : '매트릭스 편집 권한 부여 — 베이 매트릭스(베이사전)를 만들고 고칠 수 있습니다'}>
                    {mxBusy === s.name ? '…' : (matrixEditors.includes(s.name) ? '📐회수' : '📐부여')}
                  </button>
                )}
                {/* 1.81: 테스터 부여/회수 — 기존 인원의 직책에 (테스터)를 얹었다 뗐다 한다.
                    이미 수석검수·부수석인 사람은 얹을 게 없어 버튼을 숨긴다. */}
                {!isDeleted(s.name) && isAdminName(guardInfo, current) && !isOwnerName(s.name)
                  && (isTester(s.name) || !isChief(s.name)) && (
                  <button onClick={() => handleToggleTester(s.name)}
                    disabled={testerBusy === s.name}
                    className={`px-2 py-1 rounded text-xs font-bold ${isTester(s.name)
                      ? 'bg-purple-800 hover:bg-purple-700 text-purple-100'
                      : 'bg-ink-750 hover:bg-purple-900 text-dim-100 hover:text-purple-100'} disabled:opacity-50`}
                    title={isTester(s.name)
                      ? '테스터 회수 — 원래 직급으로 돌아갑니다'
                      : '테스터 부여 — 수석 기능까지 전부 사용(소유자 고유만 제외). 직급은 유지됩니다'}>
                    {testerBusy === s.name ? '…' : (isTester(s.name) ? '테스터회수' : '테스터부여')}
                  </button>
                )}
                {(
                  <div className="flex gap-1">
                    {isDeleted(s.name) ? (
                      <button onClick={() => handleRestore(s.name)}
                        className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-white text-xs font-bold" title="복구 (재입사)">
                        복구
                      </button>
                    ) : (
                      <>
                        {isOnline && !isOwnerName(s.name) && (
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

        <div className="p-3 border-t border-line text-2xs text-dim-400">
          🗑 퇴사 처리 (접속 차단, 복구 가능 · 관리자면 권한도 함께 삭제) · 🔄 접속 기록만 제거 · 소유자({OWNER_NAME}) 권한은 고정
        </div>
      </div>
    </div>
  );
}
