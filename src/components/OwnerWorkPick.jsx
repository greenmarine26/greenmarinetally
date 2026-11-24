// 검수사(소유자)가 관리자로 들어와 한 배의 «작업 시작»을 열면 한 번 묻는 창 — [작업자]·[관리자] 선택(5.23-02).
//   검수사 2026-11-24 20:55 «간단하게 하죠 저에게만 적용하는 문제 입니다. 제가 작업 시작을 누르면 양하든 선적이든 한선박에 대해서 창을 하나 띄웁니다. 작업자 / 관리자 선택키»
//   사건 — DJCT 0230W 07:59~08:03 관리자로 «작업 시작»에서 확인을 누르면 막는 안내만 뜨고, 작업 화면을 나가 재로그인·미르 등록을 해야 작업자가 됐다.
//   [작업자] = 이 조에 «N호기 검수사» 로 등록(AdminWorkStart — 미르 호기 등록과 같은 저장 한 벌) → App(adminWorkOf)이 이 배를 작업 선박으로 본다.
//   [관리자] = 이 배·이 조 동안 다시 묻지 않는다(이 기기 sessionStorage).
import React, { useState } from 'react';
import AdminWorkStart from './AdminWorkStart.jsx';

export default function OwnerWorkPick({ voyageKey, voyage, name, shipLabel, onClose }) {
  const [step, setStep] = useState('pick');
  return (
    <div className="fixed inset-0 z-[105] bg-black/80 flex items-end sm:items-center justify-center p-2 sm:p-4" data-owner-work-pick="1">
      <div className="bg-ink-900 border border-line rounded-card w-full sm:max-w-md p-4 space-y-3 shadow-card">
        <div className="font-black text-base text-dim-100">{shipLabel} 작업 시작</div>
        {step === 'pick' ? (
          <>
            <div className="text-sm text-dim-200">어떤 모드로 하시겠습니까?</div>
            <div className="grid grid-cols-2 gap-2">
              <button data-owner-pick="work" onClick={() => setStep('crane')}
                className="py-3 rounded-pill border-2 border-emerald-300 bg-emerald-700 text-white font-black text-base">작업자</button>
              <button data-owner-pick="admin" onClick={() => onClose('admin')}
                className="py-3 rounded-pill border-2 border-violet-300 bg-violet-800 text-white font-black text-base">관리자</button>
            </div>
            <div className="text-2xs text-dim-400">작업자는 이 배에 내 이름·호기로 기록됩니다. 관리자는 기록 없이 보고 고치기만 합니다.</div>
          </>
        ) : (
          <>
            <AdminWorkStart voyageKey={voyageKey} voyage={voyage} name={name} />
            <button onClick={() => setStep('pick')} className="w-full py-2 rounded-pill border border-line text-dim-200 text-sm font-bold">뒤로</button>
          </>
        )}
      </div>
    </div>
  );
}
