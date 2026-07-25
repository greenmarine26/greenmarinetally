// 수석 베이상세 편집 — V9.07 전면 개편
//   V7.97~V9.06: 자체 격자(cbe-cell) + 부분 BayBoxV2 혼용. 빈 슬롯에 드롭 핸들러가 없어
//     빈 자리로 이동이 불가능했고(cellExtra의 `if(!c) return {}`), 찬 칸 드롭은 점유 검사가 없어
//     같은 bay/row/tier에 컨이 중복 배치됐다(placeAtCell). 사용자 신고 2026-07-25.
//   V9.07: 단독 선적플랜 편집기에서 검증된 BayGridEditor로 교체.
//     빈 슬롯 표시·이동, 자리 맞교환, 여러 대 동시 이동, 클릭 토글 선택, 격자 기하 고정.
//   저장 경로는 종전 그대로: 실체위치 fbSetActualPosition / 임시창고 fbBatchMoveToStorage.
//   → 검수사 화면·실선적 EDI 근거(records.bay_actual)의 의미는 바뀌지 않는다.
import React, { useMemo, useState, useCallback } from 'react';
import { isoToLabel, isPyeongtaekPort } from '../utils.js';
import { fbSetActualPosition, fbBatchMoveToStorage, STORAGE_BAY } from '../firebase.js';
import BayGridEditor from './BayGridEditor.jsx';
import * as P from '../planEditCore.js';

const pad2 = (v) => String(v ?? '').padStart(2, '0');

export default function ChiefBayEdit({ voyage, voyageKey, inspector, activeWorkers = [], onClose }) {
  const hasLoad = !!(voyage?.loading?.ediContainers && Object.keys(voyage.loading.ediContainers).length);
  const hasDis = !!(voyage?.discharge?.ediContainers && Object.keys(voyage.discharge.ediContainers).length);
  const [mode, setMode] = useState(hasLoad ? 'loading' : 'discharge');
  const [saving, setSaving] = useState(false);
  const [seq, setSeq] = useState(0);              // 저장 후 편집기 재생성용

  const sec = voyage?.[mode] || {};
  const ediMap = sec.ediContainers || {};
  const recMap = sec.records || {};
  const compMap = sec.completed || {};

  // 기준 위치 = 실체위치(actual) 있으면 그것, 없으면 EDI 계획
  const { containers, storageCns } = useMemo(() => {
    const list = [];
    const stg = [];
    for (const e of Object.values(ediMap)) {
      const rec = recMap[e.cn] || {};
      const hasA = rec.bay_actual !== undefined && rec.bay_actual !== '' && rec.bay_actual !== null;
      const inStorage = rec.bay_actual === STORAGE_BAY;
      if (inStorage) stg.push(e.cn);
      list.push({
        ...e,
        bay: inStorage ? pad2(e.bay) : pad2(hasA ? rec.bay_actual : e.bay),
        row: inStorage ? pad2(e.row) : pad2(hasA ? rec.row_actual : e.row),
        tier: inStorage ? pad2(e.tier) : pad2(hasA ? rec.tier_actual : e.tier),
        // 선적은 EDI가 계획 — 선적확인(actual/완료)돼야 실체 (V7.99-7 사용자 확정)
        _placed: mode === 'discharge' ? true : (hasA || !!compMap[e.cn]),
      });
    }
    return { containers: list, storageCns: stg };
  }, [ediMap, recMap, compMap, mode]);

  // 오선적 정정 화면이므로 이동 대상은 평택 검수분.
  //   양하=POD 평택 · 선적=리스트 등록 또는 POL 평택 (앱 전역 isPtk 규칙과 동일)
  const lockedCns = useMemo(() => {
    const s = new Set();
    for (const c of containers) {
      const ptk = mode === 'discharge' ? isPyeongtaekPort(c.pod) : (!!recMap[c.cn] || isPyeongtaekPort(c.pol));
      if (!ptk) s.add(String(c.cn).replace(/\s/g, '').toUpperCase());
    }
    return s;
  }, [containers, recMap, mode]);

  const save = useCallback(async (state) => {
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    const changes = P.diffChanges(state);
    if (!changes.length) return;
    setSaving(true);
    try {
      const stg = [], cells = [];
      for (const c of changes) {
        if (c.to === P.STG) stg.push(c.cn);
        else cells.push([c.cn, { bay: c.to.slice(0, 2), row: c.to.slice(2, 4), tier: c.to.slice(4, 6) }]);
      }
      if (stg.length) await fbBatchMoveToStorage(voyageKey, mode, stg, inspector);
      for (const [cn, p] of cells) await fbSetActualPosition(voyageKey, mode, cn, p.bay, p.row, p.tier, inspector);
      alert(`저장 완료 — ${changes.length}건 반영. 검수사 화면에 표시됩니다.`);
      setSeq((n) => n + 1);   // 새 기준으로 편집기 재시작
    } catch (e) {
      console.error(e);
      alert('저장 실패: ' + (e?.message || e));
    } finally { setSaving(false); }
  }, [inspector, voyageKey, mode]);

  const modeTabs = (
    <>
      {hasDis && (
        <button className={`bge-btn${mode === 'discharge' ? ' p' : ''}`}
          onClick={() => { setMode('discharge'); setSeq((n) => n + 1); }}>양하</button>
      )}
      {hasLoad && (
        <button className={`bge-btn${mode === 'loading' ? ' p' : ''}`}
          onClick={() => { setMode('loading'); setSeq((n) => n + 1); }}>선적</button>
      )}
      {activeWorkers.length > 0 && (
        <span className="bge-badge" title={activeWorkers.join(', ')}>작업중 {activeWorkers.length}명</span>
      )}
    </>
  );

  return (
    <BayGridEditor
      key={`${mode}-${seq}`}
      title="🖐 베이상세 편집"
      subtitle={`${voyage?.info?.vsl || voyageKey} · ${mode === 'discharge' ? '양하' : '선적'}`}
      voyageInfo={mode === 'discharge' ? (voyage?.info?.voy_d || voyage?.info?.voy || '') : (voyage?.info?.voy_l || voyage?.info?.voy || '')}
      containers={containers}
      storageCns={storageCns}
      lockedCns={lockedCns}
      shipImo={voyage?.info?.imo}
      shipName={voyage?.info?.vsl}
      mode={mode}
      lockHint="통과화물"
      saving={saving}
      saveLabel="저장"
      onSave={save}
      onClose={onClose}
      headerExtra={modeTabs}
    />
  );
}
