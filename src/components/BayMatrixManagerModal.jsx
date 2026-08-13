// 베이매트릭스 관리 화면 — 항차 없이 선박을 조회해 고치고, 없는 선박은 새로 만든다 (TallyOne 1.60)
//
// 왜 만들었나 (검수사 지시 2026-08-13):
//   *"지금은 베이메트릭스 수정을 할때 **항차목록에 있어야** 수정이 가능했습니다.
//     이걸 베이메트릭스에서 **선박을 조회**할수 있게 하고 조회후에 수정을 할수있게 만들어 주세요."*
//   *"지금 구조는 불편합니다. **업로드를 누른후에** 베이메트릭스가 나옵니다. 그래서 베이메트릭스를
//     **분리** 해주기 바랍니다. 분리해서 **수석대쉬보드 위의 화면**에 넣어 주세요.
//     **업로드를 누르면 일반 검수사도 보이기 때문에 건드릴수 있습니다.**"*
//   *"그리고 **조회가 되지 않는 선박은 추가기능까지 넣어서 추가** 할수 있게 해주세여."*
//
// 종전에는 진입로가 항차 화면의 업로드 영역 하나뿐이었다. 그래서
//   ① 항차가 없는 선박(신규·예정)은 매트릭스를 만들 수가 없었고
//   ② 그 버튼이 일반 검수사에게도 보였다.
// 이 화면은 수석 대시보드(권한 화면) 안에 있고, 목록은 **보관소(정본) 하나만** 읽는다.

import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Lock, Wrench } from 'lucide-react';
import ShipMatrixBuilderModal from './ShipMatrixBuilderModal.jsx';
import { canWriteBayDict } from '../bayDictGuard.js';

const U = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');

// 보관소 엔트리 → 화면 한 줄
function rowsFromMaster() {
  const fb = (typeof window !== 'undefined' && window.__fbShipBayDict) || {};
  const out = [];
  for (const [code, e] of Object.entries(fb)) {
    if (!e) continue;
    // ★ 1.62: **빈 껍데기를 매트릭스로 세지 않는다.** 검수사 실측 2026-08-13 —
    //   HAYN 이 EDI 자동 등록으로 들어오며 `bayDef: {}` 를 갖게 됐는데, 종전 `!!bd` 판정이
    //   빈 객체를 truthy 로 봐서 목록에 **「0베이 · 🔒 확정」** 이라는 거짓말이 떴다.
    //   실제로는 베이가 하나도 없고 잠기지도 않은 상태다. 베이가 있어야 매트릭스다.
    const bd = e.bayDef || null;
    const bays = bd?.baysSummary || bd?.bayList || bd?.bays || [];
    const n = bd?.recordCount || (Array.isArray(bays) ? bays.length : 0);
    const hasMatrix = !!bd && n > 0;
    out.push({
      code,
      name: String(e.name || '').replace(/\n/g, ' / ').trim(),
      callsign: e.callsign || '',
      imo: e.imo || '',
      carrier: e.carrier || '',
      bays: n,
      hasMatrix,
      provisional: e.provisional === true || bd?.provisional === true,
    });
  }
  return out.sort((a, b) => a.code.localeCompare(b.code));
}

export default function BayMatrixManagerModal({ onClose }) {
  const [q, setQ] = useState('');
  const [target, setTarget] = useState(null);      // 빌더에 넘길 선박 {code,name,callsign,imo}
  const [adding, setAdding] = useState(false);     // 신규 추가 입력 폼
  const [newShip, setNewShip] = useState({ code: '', name: '', callsign: '', imo: '' });
  const [msg, setMsg] = useState('');
  const canEdit = canWriteBayDict();

  const all = useMemo(() => rowsFromMaster(), [target]);   // 저장 후 닫으면 다시 읽는다
  // 1.60-02: 콜사인은 배마다 유일하다 — 겹치면 하나는 남의 것이다(검수사 신고로 PCBJ/PCSZ 실측).
  const csDupes = useMemo(() => {
    const by = {};
    for (const r of all) {
      const c = U(r.callsign);
      if (c) (by[c] ||= []).push(r.code);
    }
    return Object.entries(by).filter(([, ks]) => ks.length > 1);
  }, [all]);
  const hits = useMemo(() => {
    const s = U(q);
    if (!s) return all;
    return all.filter(r => U(r.code).includes(s) || U(r.name).includes(s)
      || U(r.callsign).includes(s) || U(r.imo).includes(s) || U(r.carrier).includes(s));
  }, [all, q]);

  // 빌더는 항차를 받도록 만들어져 있다 — 선박만 담은 최소 항차 모양으로 넘긴다.
  //   `info.vsl` 이 곧 선박 약자이고, extractShipMetaFromVoyage 가 그것을 코드로 쓴다(1.58-01).
  const fakeVoyage = target ? { info: { vsl: target.code, code: target.code,
    name: target.name || '', callsign: target.callsign || '', imo: target.imo || '',
    carrier: target.carrier || '' } } : null;

  const startAdd = () => {
    const code = U(newShip.code);
    if (!/^[A-Z0-9]{3,8}$/.test(code)) {
      setMsg('선박 약자는 공백 없는 3~8자 영숫자입니다 (예: HAYN · SWBT · YKTD).');
      return;
    }
    if (all.some(r => U(r.code) === code)) {
      setMsg(`${code} 는 이미 있습니다. 목록에서 골라 수정하세요.`);
      return;
    }
    setMsg('');
    setTarget({ code, name: newShip.name.trim(), callsign: newShip.callsign.trim().toUpperCase(), imo: newShip.imo.trim() });
  };

  return (
    <div className="fixed inset-0 z-[160] bg-black/80 flex items-start justify-center p-3 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-emerald-700/60 rounded-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 sticky top-0 bg-slate-900 rounded-t-2xl">
          <div>
            <div className="text-base font-bold text-emerald-300">🧱 베이매트릭스</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              보관소가 정본입니다 — 여기서 고치면 폰·엣지·다른 기기에서 같이 보입니다.
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg" aria-label="닫기">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {!canEdit && (
          <div className="mx-4 mt-3 bg-amber-900/40 border border-amber-700/50 rounded-lg px-3 py-2 text-[12px] text-amber-200">
            수정 권한이 없습니다. 조회만 됩니다.
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* 조회 */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="선박 약자 · 선박명 · 선사 · 호출부호 · IMO 로 찾기"
              className="w-full h-11 pl-9 pr-3 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-500"
            />
          </div>

          <div className="text-[11px] text-slate-500">
            보관소 {all.length}척 · 검색 결과 {hits.length}척
          </div>

          {csDupes.length > 0 && (
            <div className="bg-rose-900/40 border border-rose-700/50 rounded-lg px-3 py-2 text-[12px] text-rose-200">
              ⚠ 같은 호출부호가 두 선박에 붙어 있습니다 — 하나는 남의 것입니다. 항차 자료의 호출부호가 정답입니다.
              <div className="mt-1 font-bold">
                {csDupes.map(([c, ks]) => `${c} → ${ks.join(', ')}`).join(' · ')}
              </div>
            </div>
          )}

          {/* 목록 */}
          <div className="max-h-[46vh] overflow-y-auto rounded-lg border border-slate-800 divide-y divide-slate-800">
            {hits.map(r => (
              <button key={r.code} disabled={!canEdit}
                onClick={() => setTarget({ code: r.code, name: r.name, callsign: r.callsign, imo: r.imo, carrier: r.carrier })}
                className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-slate-800 disabled:opacity-60 disabled:hover:bg-transparent">
                <span className="font-bold text-slate-100 text-sm w-16 shrink-0">{r.code}</span>
                <span className="flex-1 text-[12px] text-slate-400 truncate">{r.name || '—'}</span>
                {r.carrier && <span className="text-[10px] font-bold text-sky-300 shrink-0">{r.carrier}</span>}
                <span className="text-[11px] text-slate-500 shrink-0">{r.bays ? `${r.bays}베이` : '매트릭스 없음'}</span>
                {r.hasMatrix && (r.provisional
                  ? <span className="text-[10px] font-bold text-amber-400 shrink-0 flex items-center gap-0.5"><Wrench className="w-3 h-3" />보정중</span>
                  : <span className="text-[10px] font-bold text-emerald-400 shrink-0 flex items-center gap-0.5"><Lock className="w-3 h-3" />확정</span>)}
              </button>
            ))}
            {hits.length === 0 && (
              <div className="px-3 py-6 text-center text-[12px] text-slate-500">
                「{q}」 로 찾은 선박이 없습니다. 아래에서 새로 추가하세요.
              </div>
            )}
          </div>

          {/* 신규 추가 — 조회가 안 되는 선박 */}
          {canEdit && (adding ? (
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 space-y-2">
              <div className="text-[12px] font-bold text-slate-200">새 선박 추가</div>
              <div className="text-[11px] text-slate-500">
                약자는 <b>현장에서 부르는 그대로</b> 넣습니다. 호출부호·선박명을 약자 자리에 넣지 마세요 — 사전이 갈라집니다.
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={newShip.code} onChange={e => setNewShip(s => ({ ...s, code: e.target.value.toUpperCase() }))}
                  placeholder="선박 약자 (예: HAYN)" className="h-10 px-2 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-600" />
                <input value={newShip.name} onChange={e => setNewShip(s => ({ ...s, name: e.target.value }))}
                  placeholder="선박명 (풀네임)" className="h-10 px-2 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-600" />
                <input value={newShip.callsign} onChange={e => setNewShip(s => ({ ...s, callsign: e.target.value.toUpperCase() }))}
                  placeholder="호출부호 (선택)" className="h-10 px-2 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-600" />
                <input value={newShip.imo} onChange={e => setNewShip(s => ({ ...s, imo: e.target.value }))}
                  placeholder="IMO (선택)" className="h-10 px-2 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-600" />
              </div>
              {msg && <div className="text-[11px] text-rose-300">{msg}</div>}
              <div className="flex gap-2">
                <button onClick={startAdd} className="flex-1 h-10 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold">
                  매트릭스 만들기
                </button>
                <button onClick={() => { setAdding(false); setMsg(''); }} className="px-4 h-10 rounded-lg bg-slate-800 text-slate-300 text-sm font-bold">
                  취소
                </button>
              </div>
              <div className="text-[11px] text-slate-500">
                만드는 순서 — <b>.def 읽기 → CASP 플랜(PDF) 읽기 → 뼈대 → 매트릭스 → 확정</b>. 확정하면 그 뒤로 .def·PDF 가 못 고칩니다.
              </div>
            </div>
          ) : (
            <button onClick={() => { setAdding(true); setNewShip({ code: q.trim().toUpperCase(), name: '', callsign: '', imo: '' }); }}
              className="w-full h-11 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sm font-bold text-slate-200 flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" />조회가 안 되는 선박 추가
            </button>
          ))}

          {/* ★ 1.64: 베이사전 진단 위젯 **철거** (검수사 판단 2026-08-13).
              검수사 원문: *"지금 그림 기준은 틀린것 같습니다. **100% 여야 합니다.** 점수기준이 뭔지
                모르겠습니다. 예전엔 너무 틀린게 많아서 넣었던 기능 같은데 **지금은 필요 없는 기능** 같습니다."*
              실측으로 확인 — 31척 **전부** `deckTiersLocal`·`holdTiersLocal`·`rowMaxLocal` 이 0/N 이었다.
                매트릭스 빌더가 쓰는 필드와 진단이 찾는 필드가 **아예 다르다.** 어느 배도 100점이 못 나온다.
                점수 분포도 52·55·57 세 값뿐이었고, 화면 설명(`baysSummary(30)+…`)은 코드(기본 50+20+15+5+5+3+2)와
                숫자부터 달랐다 — 설명이 옛 판 그대로였다.
              `.def` 자동 파싱으로 사전을 만들던 시절의 "무엇이 덜 채워졌나" 지표라, 검수사가 직접
              매트릭스를 그려 확정하는 지금 구조에서는 **재는 대상 자체가 없다.**
              대신 검수사가 남긴 기준 하나 — *"실갯수와 카고플랜 갯수가 맞나"* — 는 항차 단위라
              카고플랜(PrintableCargoPlanV2)에 넣었다. */}

        </div>
      </div>

      {/* 빌더 — 항차 없이, 고른 선박으로 연다 */}
      {target && (
        <ShipMatrixBuilderModal
          voyage={fakeVoyage}
          containers={[]}
          onClose={() => { setTarget(null); setAdding(false); }}
          onSaved={() => { setTarget(null); setAdding(false); }}
        />
      )}
    </div>
  );
}
