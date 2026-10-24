import React, { useMemo, useState } from 'react';
import { ShieldCheck, AlertTriangle, Printer, FileDown, X } from 'lucide-react';
import { fmtPos, isPyeongtaekPort, loadSheetJS, isVirtualCn, isSlotEntry, isPtkResolved, fmtShiftPos, fmtShiftTime, fmtShiftAct } from '../utils.js';   // 3.53: POD 확정 반영 한 벌
import { isoShown } from '../utils.js';   // 4.21: 내부 풀·엠티 표식을 정본 규격 글자로 보여 준다

// V8.98-08: 쉬프팅(재적부) 목록 모달 — 검증 카드의 ◆ 칸 클릭 시. 인쇄/PDF/엑셀 저장(청구 근거용).
//  3.65: 자리 글자는 utils.fmtShiftPos 한 벌(0180786 → 18-07-86) — 종전 자르기는 예측 꼴(«6-02-82»)을 «6-0-2-82» 로 깼다.
const _sp = (p) => fmtShiftPos(p);
//  3.65: 실은 시각 «04:19» (KST)
const _hm = (t) => fmtShiftTime(t);
//  3.65: 실제 칸 글자 — 검수원 자리가 터미널 기록과 다르면 둘 다(화면·서류에 외부 시스템 이름은 안 쓴다 — 3.16)
const _act = (s) => fmtShiftAct(s);

function ShiftingModal({ list, voyageKey, onClose }) {
  //  3.44: 선사 시프팅 목록(RESTOW LIST)이 정본이면 종이에도 출처를 적는다 — 현장이 무엇을 보고 세는지 알게.
  const docNote = list.some((x) => x && x.doc) ? ' · 선사 시프팅 목록(RESTOW LIST) 정본' : '';
  const title = `쉬프팅(재적부) 목록 — ${String(voyageKey || '').replace('_', ' ')}`;
  const openPrint = () => {
    const rows = list.map((s, i) =>
      `<tr><td>${i + 1}</td><td class="mono">${s.cn}</td><td>${isoShown(s.iso) || ''}</td><td>${s.fe || ''}</td><td>${s.pod || ''}</td><td class="mono">${_sp(s.from)}</td><td class="mono">${s.keep ? `예보 — 선사 지시 본선 잔류(${s.keep.pod})` : s.same ? '제자리' : _sp(s.to)}</td><td class="mono">${_act(s)}</td><td>${_hm(s.actAt)}</td><td></td></tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
      body{font-family:'Malgun Gothic',sans-serif;margin:24px;color:#111}
      h2{font-size:16px;margin:0 0 2px}
      .sub{font-size:11px;color:#555;margin-bottom:10px}
      table{border-collapse:collapse;width:100%;font-size:12px}
      th,td{border:1px solid #999;padding:4px 6px;text-align:center}
      th{background:#eef} .mono{font-family:Consolas,monospace}
      @media print{body{margin:8mm}}
    </style></head><body>
      <h2>◆ ${title} · 총 ${list.length}대</h2>
      <div class="sub">통과화물 선내 위치 이동(양하+재선적 실작업) — 양하·선적 공통${docNote} · 출력 ${new Date().toLocaleString('ko-KR')}</div>
      <table><thead><tr><th>No</th><th>컨테이너 번호</th><th>규격</th><th>F/E</th><th>POD</th><th>양하 위치</th><th>선적 위치</th><th>실제 위치</th><th>실은 시각</th><th>확인</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { alert('팝업이 차단되었습니다. 팝업 허용 후 다시 눌러주세요.'); return; }
    w.document.write(html); w.document.close();
  };
  const saveXlsx = async () => {
    try {
      const XLSX = await loadSheetJS();
      const aoa = [[title], [`총 ${list.length}대 · 통과화물 재적부(양하·선적 공통)`], [],
        ['No', '컨테이너 번호', '규격', 'F/E', 'POD', '양하 위치', '선적 위치', '실제 위치', '실은 시각'],
        ...list.map((s, i) => [i + 1, s.cn, isoShown(s.iso) || '', s.fe || '', s.pod || '', _sp(s.from), s.keep ? `예보 — 선사 지시 본선 잔류(${s.keep.pod})` : s.same ? '제자리' : _sp(s.to), _act(s), _hm(s.actAt)])];   // 3.44: 제자리 재적재 · 3.65: 실제
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 7 }, { wch: 5 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '쉬프팅');
      XLSX.writeFile(wb, `쉬프팅_${voyageKey || 'list'}.xlsx`);
    } catch (e) { alert('엑셀 저장 실패: ' + (e?.message || e)); }
  };
  return (
    <div className="fixed inset-0 z-[95] bg-black/70 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-ink-900 border border-blue-800/60 rounded-btn w-full max-w-md max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-3 py-2.5 bg-blue-950/60 rounded-t-xl flex items-center gap-2">
          <span className="text-blue-400 font-black">◆</span>
          <div className="text-sm2 font-black text-blue-100">쉬프팅(재적부) {list.length}</div>
          <div className="text-2xs text-dim-300">양하·선적 공통</div>
          <button onClick={onClose} className="ml-auto p-1 text-dim-300 hover:text-white"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-2 flex gap-1.5 border-b border-line">
          <button onClick={openPrint} className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-blue-800 hover:bg-blue-700 rounded text-xs2 font-bold text-white">
            <Printer className="w-3.5 h-3.5"/> 인쇄
          </button>
          <button onClick={openPrint} className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-ink-750 hover:bg-ink-700 rounded text-xs2 font-bold text-white">
            <FileDown className="w-3.5 h-3.5"/> PDF 저장
          </button>
          <button onClick={saveXlsx} className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-emerald-800 hover:bg-emerald-700 rounded text-xs2 font-bold text-white">
            <FileDown className="w-3.5 h-3.5"/> 엑셀 저장
          </button>
        </div>
        <div className="px-3 py-1 text-2xs text-dim-400">인쇄·PDF는 새 창에서 열립니다 — PDF는 인쇄 대상에서 "PDF로 저장"을 선택하세요.</div>
        <div className="overflow-y-auto divide-y divide-line">
          {list.map((s, i) => (
            <div key={s.cn} className="px-3 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs2">
              <span className="text-dim-500 w-5 text-right">{i + 1}</span>
              <span className="mono font-bold text-dim-100">{s.cn}</span>
              <span className="text-dim-400">{isoShown(s.iso)}</span>
              {s.pod && <span className="text-dim-400">{s.pod}</span>}
              {s.keep
                ? <span className="ml-auto mono text-yellow-300" data-shift-keep-row={s.cn}>◆ {_sp(s.from)} 예보 — 선사 지시 본선 잔류({s.keep.pod})</span>
                : <span className="ml-auto mono text-blue-300">{s.same ? `${_sp(s.from)} (제자리)` : `${_sp(s.from)} → ${_sp(s.to)}`}</span>}
              {/* 3.65: 실제 실은 자리 — 실릴 때마다 채워진다 */}
              {s.act ? <span className={`mono font-bold ${s.actDiff ? 'text-amber-300' : 'text-emerald-300'}`}>실제 {_act(s)} {_hm(s.actAt)}</span> : <span className="text-dim-500 text-2xs">실제 —</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ValidationBox({ ediContainers, records, mode, shiftingList = [], voyageKey = '', dischargeEdi = null, bookingFill = null, keepOnboard = null }) {   // 4.48-02: keepOnboard — 앱 예상 줄의 메일 근거
  const shiftCount = shiftingList.length;
  const shiftKeepCount = (shiftingList || []).filter((x) => x && x.keep).length;   // 4.48: 그중 선사 지시 본선 잔류 예보(확정 아님)
  const [shiftOpen, setShiftOpen] = useState(false);
  const _keepKey = Object.keys(keepOnboard || {}).sort().join(',');
  const v = useMemo(() => {
    //  3.26: 부킹 자리(예상 EDI — `__BOOK_`·cn 없는 자리)는 실번호가 없어 리스트와 겹칠 수가 없다. «리스트에 없음»도
    //    «EDI에 없음»도 아니다 — 자리를 실번호가 **채우는** 관계다(SWBT 2614N: 316/316 이 양쪽 경고로 떴다).
    //    채움 상태는 VoyagePage 가 utils.bookingFillOfSec 로 넘긴다(반대 방향 리스트 제외). 안 넘어오면 여기서 센다.
    const _slotsHere = (ediContainers || []).filter(isSlotEntry);
    const _ediRealCns = new Set((ediContainers || []).map(c => c && c.cn).filter(cn => cn && !String(cn).startsWith('__')));
    //  4.22-01: 넘어온 것이 없을 때의 셈도 utils.bookingFillOfSec 와 같은 규칙 — **선적에만**(검수사 12:11 «앵하에 부킹자리가 왜 필요한지?» · KBTR 2608E 양하 183 → 175).
    const fill = bookingFill || (mode === 'loading' && _slotsHere.length
      ? { slots: _slotsHere.length, real: (records || []).filter(r => r && r.cn && !_ediRealCns.has(r.cn)).length }
      : null);
    if ((!ediContainers || ediContainers.length === 0) && !fill) return null;
    //  ★ 3.53: **POD 확정을 반영한다**(utils 한 벌). 안 하면 확정해도 이 상자의 «EDI ?대» 가
    //    안 움직여 마감텔리와 숫자가 두 벌이 된다(2차 시뮬 지적 2026-09-16).
    const _recByCn = {};
    for (const r of (records || [])) { if (r && r.cn) _recByCn[String(r.cn).toUpperCase()] = r; }
    const isPtk = (c) => isPtkResolved(c, _recByCn[String(c && c.cn || '').toUpperCase()] || null, mode === 'discharge' ? 'discharge' : 'loading');
    //  ★ 4.48-02 — 검수사 2026-10-24 19:16 «확정이 아닌 상태입니다. 그러므로 EDI317 리스트317(315) 매칭 317로 보여주는것이 맞습니다. 별도로 앱 예상EDI 평택 315 · 리스트 315 · 매칭 315를
    //    따로 표기해줘야 하고요 메일을 근거로 제시하고». 위 칸은 **지금 자료 그대로**(EDI·선사 리스트·터미널 배정이 아직 317), 선사 지시 본선 잔류를 적용한 수는 아래 «앱 예상» 한 줄 + 메일 근거로 따로.
    //    종전(4.48)엔 리스트만 빼서 «EDI 평택 317 · 리스트 315 · 매칭 317» 로 세 칸 기준이 섞였다.
    //    지시 컨 = 지시 기록(keepOnboard — 아래 평택 컨이 없어 시프팅 예보가 아닌 지시도 든다) ∪ 시프팅 목록의 예보 행.
    const _keepSet = new Set([...Object.keys(keepOnboard || {}), ...(shiftingList || []).filter(x => x && x.keep).map(x => x.cn)].map(cn => String(cn || '').toUpperCase()).filter(Boolean));
    const _isKeepC = (c) => mode === 'discharge' && _keepSet.has(String((c && c.cn) || '').toUpperCase());
    const ptkInEdi = (ediContainers || []).filter(c => !isSlotEntry(c)).filter(isPtk);   // 3.26: 자리는 실컨 대조 밖
    const recCns = new Set((records || []).map(r => r.cn));
    const ediCns = new Set((ediContainers || []).map(c => c.cn));
    // V9.04-01: 가상(더미) 컨번호 분리 — MCSN 629S 사건 2026-07-18.
    //   EDI의 엠티 예약자리(DUME·CASP 더미)는 '리스트에 없음(누락)' 대상이 아니고,
    //   리스트의 엠티 실번호(E확정)가 그 자리를 채우는 짝이므로 '추가(EDI밖)' 경고에서도 뺀다.
    const virtualInEdi = ptkInEdi.filter(c => isVirtualCn(c.cn));
    const missingInList = ptkInEdi.filter(c => !isVirtualCn(c.cn) && !recCns.has(c.cn));
    // ── TallyOne 2.94: **통과화물을 평택 선적으로 세지 않는다.** (검수사 지적 2026-08-31) ──
    //   실측 MCSC 635S — 리스트 230 · EDI 213 이라 «리스트에 있는데 EDI에 없음 17대
    //   (해당 선사 EDI 추가 필요)» 가 떴다. 그 17대는 **전부 양하 EDI에 있고 POD 가 CNTXG(톈진)** 였다.
    //   평택에서 내리지도 싣지도 않는 화물 — 26·34번에서 38번 데크로 옮겨 싣는 **재적부(시프팅)** 다.
    //   선사에게 EDI 를 더 달라고 할 것이 아니라 애초에 선적 EDI 에 있을 수 없는 물건이다.
    //   검수사 확정 — *"카운트는 평택분만"*, *"시프팅은 평택 축과 섞지 않는다"*.
    //   ⚠ 지우지 않는다. 이 컨들의 38번 데크 실물 기록은 여기 말고 남은 곳이 없다
    //     (`computeShiftingMap` 은 선적 EDI 에도 있어야 잡는데 이들은 거기 없다).
    //     세는 자리에서만 빼고 «통과화물» 로 따로 보여 준다.
    const isThru = (r) => {
      if (mode !== 'loading' || !dischargeEdi) return false;
      if (ediCns.has(r.cn)) return false;                 // 선적 계획에 있으면 평택 선적분이다
      const d = dischargeEdi[r.cn];
      return !!(d && d.pod && !isPyeongtaekPort(d.pod));
    };
    const thruInList = (records || []).filter(isThru);
    const thruSet = new Set(thruInList.map(r => r.cn));
    //  ★ 4.34-03 — 검수사 2026-10-18 15:26 «가끔 시프팅 대상이 양하리스트에 추가되는 경우» (MCAT 640N 실측: MRSU7262992 는 시프팅 47대 중 하나(0441286→0101186, POD CNHSK)인데
    //    선사 양하 리스트에도 들어 있어 «EDI에 없음 1대»가 뜨고 «총 작업 369 = 리스트 322 + 쉬프팅 47» 이 한 대를 두 번 셌다). 시프팅 목록(shiftingList)에 있는 컨은 «EDI 밖 추가»가 아니라
    //    시프팅이다 — 경고에서 빼고, 총 작업에서는 한 번만 센다. 시프팅 목록이 판정의 한 벌이다(리스트 ◆ 박스·인쇄 [별첨2]와 같은 목록).
    const _shSet = new Set((shiftingList || []).map(x => String(x && x.cn || '').toUpperCase()).filter(Boolean));
    const shiftInList = mode === 'discharge' ? (records || []).filter(r => r && !ediCns.has(r.cn) && !thruSet.has(r.cn) && _shSet.has(String(r.cn || '').toUpperCase())) : [];
    const _shInSet = new Set(shiftInList.map(r => r.cn));
    //  ★ 4.48 — 선사 지시 본선 잔류의 시프팅 예보(목록 keep 행)는 평택 양하가 아니다 — 리스트 수에서 빼고 시프팅(예보)으로 한 번만 센다(MAMP 641N 리스트 317 = 평택 315 + 예보 2).
    const keepInList = mode === 'discharge' ? (records || []).filter(r => r && !_shInSet.has(r.cn) && _keepSet.has(String(r.cn || '').toUpperCase())) : [];
    //  ★ 4.48-02 감사(하-1) — 플래너가 본선 잔류 지시 컨을 선사 시프팅 목록에 넣어 확정하면(파란 ◆) 그 컨은 확정 시프팅이면서 EDI 평택·리스트에도 남는다(EDI POD 수정 전).
    //    «총 작업» 은 청구 근거(V8.98-07)라 한 번만 센다(4.34-03 원칙) — 확정 시프팅 행 가운데 EDI 평택 리스트에도 있는 컨을 겹침으로 뺀다. 예보 행은 위 칸 쉬프팅 수에 안 들어 겹치지 않는다.
    const _shConfSet = new Set((shiftingList || []).filter(x => x && !x.keep).map(x => String(x.cn || '').toUpperCase()).filter(Boolean));
    const shiftOverlap = mode === 'discharge' ? (() => { const _ptkCns = new Set(ptkInEdi.map(c => c.cn)); return (records || []).filter(r => r && _ptkCns.has(r.cn) && !thruSet.has(r.cn) && _shConfSet.has(String(r.cn || '').toUpperCase())); })() : [];
    let extraInList = (records || []).filter(r => !ediCns.has(r.cn) && !thruSet.has(r.cn) && !_shInSet.has(r.cn));
    //  3.26: 부킹 자리가 있으면 EDI 밖 실번호는 그 자리를 채우는 것이다 — 자리 수만큼은 «추가»가 아니다. 남는 만큼만 추가.
    if (fill && fill.slots > 0) extraInList = extraInList.slice(fill.slots);
    let emptyConfirmed = 0;
    if (virtualInEdi.length > 0) {
      // fe='E' 또는 공란(합본 F/E 공란 287행 실측 — 수집기 v2.17.11-17부터 엠티 출처는 E로 채움)을
      //   엠티 확정분으로 본다. 명시적 'F'(풀인데 EDI에 없음)만 진짜 '추가' 경고로 남긴다.
      const isE = (r) => String(r.fe || '').toUpperCase() !== 'F';
      emptyConfirmed = extraInList.filter(isE).length;
      extraInList = extraInList.filter(r => !isE(r));
    }

    // 선사별 누락
    const missingByOp = {};
    missingInList.forEach(c => {
      const op = c.op || '미지정';
      missingByOp[op] = (missingByOp[op] || 0) + 1;
    });

    // 선사별 추가
    const extraByOp = {};
    extraInList.forEach(r => {
      const op = r.op || '미지정';
      extraByOp[op] = (extraByOp[op] || 0) + 1;
    });

    return {
      ediTotal: (ediContainers || []).length,
      ptkTotal: ptkInEdi.length + (fill ? fill.slots : 0),                                  // 3.26: 부킹 자리도 EDI 평택 대상이다(ptkInEdi 는 자리를 뺀 뒤라 두 번 안 센다)
      listTotal: (records || []).length - thruInList.length - shiftInList.length,   // 4.48-02: 지금 자료 그대로(본선 잔류도 센다 — 확정 아님)   // 2.94: 통과화물은 평택 선적 리스트가 아니다 · 4.34-03: 시프팅 대상이 리스트에 섞였으면 리스트 대수에서 뺀다(시프팅 쪽에서 센다)
      matched: ptkInEdi.filter(c => recCns.has(c.cn)).length + (fill ? Math.min(fill.real, fill.slots) : 0),   // 3.26: 자리를 채운 실번호 = 매칭
      //  4.48-02 — 앱 예상(선사 메일 수정 적용): 본선 잔류 예보 컨을 EDI 평택·리스트·매칭에서 뺀 수
      keepPtkInEdi: ptkInEdi.filter(_isKeepC).length,
      keepMatched: ptkInEdi.filter(c => _isKeepC(c) && recCns.has(c.cn)).length,
      keepN: mode === 'discharge' ? _keepSet.size : 0,
      keepCns: mode === 'discharge' ? [..._keepSet] : [],
      bookingFill: fill,
      missingCount: missingInList.length,
      missingByOp,
      missingDetails: missingInList.slice(0, 5),
      shiftInListCount: shiftInList.length,   // 4.34-03: 시프팅 대상이면서 양하 리스트에도 있는 컨 — 총 작업에서 한 번만 센다
      keepInListCount: keepInList.length,
      shiftOverlap: shiftOverlap.length,      // 4.48-02 감사(하-1): 확정 시프팅이면서 EDI 평택 리스트에도 있는 컨 — 총 작업에서 한 번만
      shiftOverlapNoKeep: shiftOverlap.filter(r => !_isKeepC(r)).length,   // 앱 예상 줄은 지시 컨을 리스트에서 이미 뺐다 — 남는 겹침만     // 4.48: 본선 잔류 예보(노란 ◆) — 리스트에서 빼고 시프팅 예보로 센다
      extraCount: extraInList.length,
      extraByOp,
      extraDetails: extraInList.slice(0, 5),
      virtualCount: virtualInEdi.length,   // V9.04-01: 가상E(실번호 미배정 자리)
      emptyConfirmed,                      // V9.04-01: 리스트 엠티 실번호(가상 자리 확정분)
    };
  }, [ediContainers, records, mode, dischargeEdi, bookingFill, shiftingList, _keepKey]);   // 4.48-02: _keepKey — 지시 기록이 바뀔 때만(객체는 렌더마다 새로 온다)

  if (!v) return null;
  const allOk = v.missingCount === 0 && v.extraCount === 0 && v.listTotal > 0;
  //  4.48-02 — 지금 자료(확정 시프팅)와 앱 예상(선사 메일 수정 적용 — 본선 잔류 예보)을 가른다
  const shiftConf = shiftCount - shiftKeepCount;
  const keepOn = mode === 'discharge' && v.keepN > 0;
  const app = keepOn ? { ptk: v.ptkTotal - v.keepPtkInEdi, list: v.listTotal - v.keepInListCount, matched: v.matched - v.keepMatched, shift: shiftCount } : null;
  //  메일 근거 — keepOnboard(지시 기록: 메일 시각 · 메일 한 줄 · 양하항)가 있으면 그것, 없으면 시프팅 목록 keep 행(메일 시각 · 양하항)
  const keepEvid = (() => {
    if (!keepOn) return [];
    const _row = new Map((shiftingList || []).filter((x) => x && x.keep).map((x) => [String(x.cn || '').toUpperCase(), x]));
    const g = new Map();
    for (const cn of v.keepCns) {
      const e = (keepOnboard && keepOnboard[cn]) || {}, x = _row.get(cn);
      const at = String(e.mailAt || (x && x.keep && x.keep.mailAt) || '').trim(), note = String(e.note || '').trim(), pod = String(e.pod || (x && x.keep && x.keep.pod) || '').trim();
      const k = `${at}|${note}|${pod}`;
      if (!g.has(k)) g.set(k, { at, note, pod, cns: [] });
      g.get(k).cns.push(cn);
    }
    return [...g.values()];
  })();

  return (
    <div className={`rounded-pill p-3 ${
      allOk ? 'bg-emerald-950/40 border border-emerald-800' : 'bg-ink-900 border border-line'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        {allOk ? (
          <ShieldCheck className="w-4 h-4 text-emerald-400"/>
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-400"/>
        )}
        <div className="text-xs font-bold text-dim-100">
          데이터 검증 (EDI ↔ 리스트)
        </div>
      </div>

      <div className={`grid ${shiftCount > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-2 text-center text-xxs mb-2`}>
        <div className="bg-ink-800/60 rounded p-1.5">
          <div className="text-dim-400 text-2xs">EDI 평택</div>
          <div className="text-amber-300 font-black mono">{v.ptkTotal}</div>
        </div>
        <div className="bg-ink-800/60 rounded p-1.5">
          <div className="text-dim-400 text-2xs">리스트</div>
          <div className="text-dim-100 font-black mono">{v.listTotal}{app && <span className="text-yellow-300 text-2xs" data-list-app={app.list}>({app.list})</span>}</div>
        </div>
        <div className="bg-ink-800/60 rounded p-1.5">
          <div className="text-dim-400 text-2xs">매칭</div>
          <div className="text-emerald-400 font-black mono">{v.matched}</div>
        </div>
        {shiftCount > 0 && (
          <button onClick={() => setShiftOpen(true)}
            className="bg-blue-950/50 rounded p-1.5 border border-blue-800/40 hover:bg-blue-900/60 active:scale-95 transition">
            <div className="text-blue-300/80 text-2xs">◆ 쉬프팅</div>
            <div className="text-blue-300 font-black mono">{shiftConf}</div>
            {shiftKeepCount > 0 && <div className="text-yellow-300 text-3xs font-bold" data-shift-keep={shiftKeepCount}>+ 예보◆{shiftKeepCount}</div>}
            <div className="text-blue-400/60 text-3xs">목록·인쇄 ▸</div>
          </button>
        )}
      </div>
      {/* V8.98-07: 총 작업 합계 — 쉬프팅(재적부)은 양하+재선적 실작업이라 청구 근거에 포함(사용자 확정 2026-07-14).
          상세 목록은 리스트 하단 ◆ 박스 + 인쇄 검수리스트 [별첨2]. */}
      {shiftCount > 0 && (
        <div className="mb-2 px-2 py-1.5 bg-blue-950/40 border border-blue-800/40 rounded text-xxs text-blue-200 font-bold">
          총 작업 {v.listTotal + shiftConf - v.shiftOverlap}대 = 리스트 {v.listTotal} + 쉬프팅 {shiftConf}{v.shiftOverlap > 0 ? ` − 겹침 ${v.shiftOverlap}` : ''}
          {v.shiftOverlap > 0 && <span className="ml-1 font-normal text-blue-300/80" data-shift-overlap={v.shiftOverlap}>(겹침 {v.shiftOverlap}대는 확정 시프팅이면서 평택 양하 리스트에도 있어 한 번만 셉니다)</span>}
          {!keepOn && shiftKeepCount > 0 && <span className="ml-1 font-normal text-yellow-300/90">(+ 예보◆{shiftKeepCount})</span>}
          <span className="ml-1 font-normal text-blue-300/70">{v.shiftInListCount > 0 ? `(시프팅 ${v.shiftInListCount}대는 선사 양하 리스트에도 있어 리스트에서 빼고 시프팅으로 한 번만 셉니다)` : '(재적부 상세는 하단 ◆ 목록 · 인쇄 [별첨2])'}</span>
        </div>
      )}
      {/*  ★ 4.48-02 — 앱 예상(선사 메일 수정 적용 · 터미널 아직 미반영)과 그 근거 메일. 확정이 아니므로 위 칸(지금 자료)과 따로 적는다. */}
      {app && (
        <div className="mb-2 px-2 py-1.5 bg-yellow-950/30 border border-yellow-700/40 rounded text-xxs text-yellow-100" data-app-expect={`${app.ptk}/${app.list}/${app.matched}/${app.shift}`}>
          <div className="font-bold">앱 예상(선사 메일 수정 {v.keepN}건 적용 · 확정 아님) — EDI 평택 {app.ptk} · 리스트 {app.list} · 매칭 {app.matched} · 쉬프팅 {app.shift}{shiftKeepCount > 0 ? `(예보◆${shiftKeepCount})` : ''} · 총 작업 {app.list + app.shift - v.shiftOverlapNoKeep}대</div>
          {keepEvid.map((e, i) => (
            <div key={i} className="text-2xs text-yellow-200/90 break-words" data-keep-evid={e.cns.join(',')}>
              근거 — 선사 메일{e.at ? ` ${e.at}` : ''}{e.note ? ` «${e.note}»` : ''} · {e.cns.join(' · ')}{e.pod ? ` → ${e.pod}` : ''}(평택에서 안 내림{v.keepPtkInEdi > 0 ? ' — 양하 EDI 는 아직 평택 · 수정 전' : ''})
            </div>
          ))}
        </div>
      )}

      {/* V9.04-01: 가상E·E확정 안내 — EDI 엠티 예약자리(더미번호)와 리스트 엠티 실번호의 짝.
          MCSN 629S: 가상 187이 '누락 187 + 추가 187' 이중 경고로 떠서 허수였음 — 정보 줄로 대체. */}
      {/* V9.08(2026-07-26, 사용자 확정): 가상E는 '예상치'다. 확정이 들어오면 그것이 진실이고
          예상 수와 달라도 부족이 아니다(예상 202·확정 201이어도 정상, 확정 2면 2가 맞다).
          확정이 있으면 예상 자리수는 표시하지 않는다 — 남아 있으면 미확정으로 오해된다. */}
      {/* 3.26: 부킹 자리 ↔ 실번호 — 채움 관계를 정보 줄로(경고가 아니다).
          ★ 4.22-01 — **빈 자리가 남았을 때만** 보인다. 검수사 2026-10-10 12:19 «선적도 사실은 전부 매칭만 되면 부킹자리가 필요 없습니다.» ·
            «부킹자리는 저희에게 필요 한게 아니고 터미널 플래너가 필요 한것입니다.» — 리스트(실번호)가 자리를 다 채우면 줄을 내지 않는다(«채움» 글도 없음).
            자리를 실번호가 채우는 셈(위 ptkTotal·matched·extra)은 3.26 그대로 — 부킹뿐인 선적 EDI 에서 거짓 «EDI에 없음/리스트에 없음» 을 막는다. */}
      {v.bookingFill && v.bookingFill.real < v.bookingFill.slots && (
        <div className="mb-2 px-2 py-1.5 bg-purple-950/40 border border-purple-800/40 rounded text-xxs text-purple-200 font-bold" data-booking-wait>
          📝 부킹 자리 {v.bookingFill.slots} · 실번호 리스트 {v.bookingFill.real}
          <span className="ml-1 font-normal text-purple-300/70">— 아직 {v.bookingFill.slots - v.bookingFill.real}자리가 비었습니다(리스트 대기)</span>
        </div>
      )}
      {v.virtualCount > 0 && (
        <div className="mb-2 px-2 py-1.5 bg-purple-950/40 border border-purple-800/40 rounded text-xxs text-purple-200 font-bold">
          {v.emptyConfirmed > 0 ? (
            <>실 {v.ptkTotal - v.virtualCount} + E확정 {v.emptyConfirmed} = 총 {v.ptkTotal - v.virtualCount + v.emptyConfirmed}</>
          ) : (
            <>
              실 {v.ptkTotal - v.virtualCount} + 가상E {v.virtualCount}
              <span className="ml-1 font-normal text-purple-300/70">(가상E = 실번호 없는 엠티 자리 — 누락 아님)</span>
            </>
          )}
        </div>
      )}

      {v.missingCount > 0 && (
        <div className="bg-red-950/40 border border-red-800/50 rounded p-2 mb-2">
          <div className="text-xxs text-red-300 font-bold mb-1.5">
            🚢 EDI 평택 대상 → 리스트에 없음: {v.missingCount}대
          </div>
          <div className="bg-amber-950/40 border border-amber-800/40 rounded p-1.5 mb-1.5">
            <div className="text-2xs text-amber-300/80 mb-1">▼ 선사별 누락 (해당 검수업체 리스트 추가 필요)</div>
            {Object.entries(v.missingByOp).sort((a, b) => b[1] - a[1]).map(([op, n]) => (
              <div key={op} className="flex items-center gap-1.5 text-amber-200 text-xxs font-bold">
                <span className="bg-amber-700/60 text-amber-100 px-1.5 py-0.5 rounded text-2xs mono">{op}</span>
                <span>{n}대</span>
              </div>
            ))}
          </div>
          <div className="text-2xs text-orange-300/70 mb-0.5">샘플:</div>
          {v.missingDetails.map((c, i) => (
            <div key={i} className="text-2xs text-orange-200 mono">
              • {c.cn} ({c.op || '?'}) {fmtPos(c)}
            </div>
          ))}
          {v.missingCount > 5 && <div className="text-2xs text-red-400/60">... 외 {v.missingCount - 5}대</div>}
        </div>
      )}

      {v.extraCount > 0 && (
        <div className="bg-orange-950/40 border border-orange-800/50 rounded p-2">
          <div className="text-xxs text-orange-300 font-bold mb-1.5">
            📋 리스트에 있는데 EDI에 없음: {v.extraCount}대
          </div>
          {Object.entries(v.extraByOp).sort((a, b) => b[1] - a[1]).map(([op, n]) => (
            <div key={op} className="text-xxs text-orange-200 ml-1">
              • {op}: {n}대 (해당 선사 EDI 추가 필요)
            </div>
          ))}
        </div>
      )}

      {/* ⛔ 2.94-02: 「◆ 통과화물 N대」 블록 제거 — 근거 없는 숫자였다(검수사 지적 2026-08-31).
          이 배의 통과화물은 880대인데 선적 리스트에 섞여 든 17대만 세고 있었다.
          평택 선적이 아니므로 listTotal/extraCount 에서 빼기만 하고 따로 보여주지 않는다. */}
      {shiftOpen && (
        <ShiftingModal list={shiftingList} voyageKey={voyageKey} onClose={() => setShiftOpen(false)} />
      )}
    </div>
  );
}
