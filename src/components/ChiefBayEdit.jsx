// 수석 베이상세 편집 — 컨번호 격자에서 오선적을 드래그로 정정 (V7.97)
//   수석/관리자만. 드래그는 임시(pending)로 모았다가 [저장] 시 fb 커밋 → 그때 검수사 화면 반영.
//   백엔드 신규 없음: 실체위치(fbSetActualPosition)·임시창고(fbBatchMoveToStorage) 재사용.
import React, { useMemo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Undo2 } from 'lucide-react';
import { getShipBayDictData } from '../shipStructure.js';
import { buildContainerColorMap, getContainerColorKey, isPyeongtaekPort, isoToLabel } from '../utils.js';
import { formatCellLines, buildBayPages } from './PrintableBayDetail.jsx';
import { fbSetActualPosition, fbBatchMoveToStorage } from '../firebase.js';

const CBE_CSS = `
.cbe-overlay{position:fixed;inset:0;background:rgba(15,23,42,.8);z-index:10000;display:flex;flex-direction:column;}
.cbe-head{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#0f172a;color:#e2e8f0;}
.cbe-modes{display:flex;gap:4px;}
.cbe-modes button{padding:3px 10px;border-radius:5px;font-size:12px;font-weight:700;border:1px solid #334155;background:#1e293b;color:#cbd5e1;cursor:pointer;}
.cbe-modes button.on{background:#2563eb;color:#fff;border-color:#2563eb;}
.cbe-baynav{display:flex;gap:4px;flex-wrap:wrap;padding:8px;background:#0b1220;max-height:84px;overflow:auto;}
.cbe-baynav button{padding:4px 9px;border-radius:5px;font-size:12px;font-weight:700;border:1px solid #334155;background:#1e293b;color:#cbd5e1;cursor:pointer;}
.cbe-baynav button.on{background:#2563eb;color:#fff;border-color:#2563eb;}
.cbe-tools{display:flex;gap:6px;align-items:center;padding:6px 12px;background:#0f172a;color:#cbd5e1;font-size:12px;border-top:1px solid #1e293b;flex-wrap:wrap;}
.cbe-tools button{padding:5px 11px;border-radius:5px;font-weight:700;border:none;cursor:pointer;color:#fff;display:inline-flex;align-items:center;gap:4px;}
.cbe-tools button:disabled{opacity:.45;cursor:default;}
.cbe-body{flex:1;display:flex;min-height:0;}
.cbe-stage{flex:1;overflow:auto;padding:14px;background:#1e293b;position:relative;}
.cbe-bd{background:#fff;border-radius:6px;padding:10px;min-width:max-content;margin:0 auto;}
.cbe-bd-title{text-align:center;font-weight:800;font-size:14px;color:#111;margin-bottom:6px;}
.cbe-rl{display:flex;gap:2px;margin:2px 0 2px 0;}
.cbe-rl>span{flex:1;min-width:46px;text-align:center;font-size:11px;color:#555;}
.cbe-tier-row{display:flex;gap:2px;margin-bottom:2px;}
.cbe-cell{flex:1;min-width:46px;min-height:46px;border:1px solid #888;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;line-height:1.15;padding:2px;overflow:hidden;}
.cbe-cell.empty{background:#f1f5f9;border-style:dashed;border-color:#cbd5e1;}
.cbe-cell.filled{background:#fff;cursor:grab;}
.cbe-cell.filled:active{cursor:grabbing;}
.cbe-cell.filled.ptk{font-weight:700;}
.cbe-cell .cbe-cn{font-weight:800;font-size:11px;color:#111;letter-spacing:-.2px;}
.cbe-cell .cbe-sub{font-size:9px;color:#64748b;}
.cbe-cell.sel{outline:3px solid #2563eb;outline-offset:-3px;}
.cbe-cell.pending{box-shadow:inset 0 0 0 2px #f59e0b;}
.cbe-hatch{height:0;border-top:2px solid #111;margin:5px 0;}
.cbe-store{width:230px;background:#0f172a;color:#e2e8f0;display:flex;flex-direction:column;border-left:1px solid #334155;}
.cbe-store-h{padding:8px 10px;font-weight:800;font-size:13px;border-bottom:1px solid #334155;display:flex;justify-content:space-between;}
.cbe-drop{margin:8px;border:2px dashed #38bdf8;border-radius:6px;padding:12px;text-align:center;font-size:12px;color:#7dd3fc;line-height:1.4;}
.cbe-drop.over{background:#0c4a6e;color:#e0f2fe;}
.cbe-store-list{flex:1;overflow:auto;padding:8px;}
.cbe-chip{background:#1e293b;border:1px solid #475569;border-radius:5px;padding:7px 8px;margin-bottom:5px;font-size:12px;cursor:grab;color:#e2e8f0;}
.cbe-chip .cbe-chip-cn{font-weight:800;font-family:monospace;}
.cbe-rubber{position:absolute;border:1.5px solid #2563eb;background:rgba(37,99,235,.15);pointer-events:none;z-index:5;}
@media (max-width:680px){
  .cbe-body{flex-direction:column;}
  .cbe-store{width:100%;flex:0 0 auto;max-height:140px;border-left:none;border-top:1px solid #334155;}
  .cbe-store-list{display:flex;flex-direction:row;flex-wrap:nowrap;overflow-x:auto;gap:6px;padding:6px;}
  .cbe-chip{margin-bottom:0;white-space:nowrap;}
  .cbe-drop{margin:6px;padding:7px;}
}
`;

const pad2 = (v) => String(v ?? '').padStart(2, '0');
const dispBay = (n) => (n >= 100 ? String(n) : pad2(n));
const sizeOf = (c) => { const l = isoToLabel(c.iso) || ''; if (l.startsWith('45')) return '45'; if (l.startsWith('40')) return '40'; return '20'; };

export default function ChiefBayEdit({ voyage, voyageKey, inspector, onClose }) {
  const hasLoad = !!(voyage?.loading?.ediContainers && Object.keys(voyage.loading.ediContainers).length);
  const hasDis = !!(voyage?.discharge?.ediContainers && Object.keys(voyage.discharge.ediContainers).length);
  const [mode, setMode] = useState(hasLoad ? 'loading' : 'discharge');

  const sec = voyage?.[mode] || {};
  const ediMap = sec.ediContainers || {};
  const recMap = sec.records || {};

  // 베이스 위치 = 실체위치(actual) 있으면 그것, 없으면 EDI
  const containers = useMemo(() => {
    return Object.values(ediMap).map((e) => {
      const rec = recMap[e.cn] || {};
      const hasA = rec.bay_actual !== undefined && rec.bay_actual !== '' && rec.bay_actual !== null;
      const inStorage = rec.bay_actual === '__STG__';
      return {
        ...e,
        baseBay: inStorage ? '__STG__' : pad2(hasA ? rec.bay_actual : e.bay),
        baseRow: pad2(hasA ? rec.row_actual : e.row),
        baseTier: pad2(hasA ? rec.tier_actual : e.tier),
      };
    });
  }, [ediMap, recMap]);

  const dictData = useMemo(() => {
    const imo = voyage?.info?.imo, vsl = voyage?.info?.vsl;
    if (!imo && !vsl) return null;
    const ediBayCount = new Set(containers.map((c) => parseInt(c.bay, 10)).filter((n) => Number.isFinite(n) && n > 0)).size;
    return getShipBayDictData(imo, vsl, { ediBayCount });
  }, [voyage, containers]);

  const colorMap = useMemo(() => buildContainerColorMap(containers, mode), [containers, mode]);
  const dictBaysSummary = useMemo(() => {
    const m = {};
    (dictData?.bayDef?.baysSummary || []).forEach((b) => { m[parseInt(b.bayNo, 10)] = b; });
    return m;
  }, [dictData]);

  // pending(로컬): cn -> {bay,row,tier} | {storage:true}
  const [pending, setPending] = useState({});
  const eff = useCallback((c) => {
    const p = pending[c.cn];
    if (p) return p.storage ? { storage: true } : { bay: p.bay, row: p.row, tier: p.tier };
    if (c.baseBay === '__STG__') return { storage: true };
    return { bay: c.baseBay, row: c.baseRow, tier: c.baseTier };
  }, [pending]);

  // 베이 목록 → 페어 페이지
  const bayPages = useMemo(() => {
    const set = new Set();
    (dictData?.bayDef?.bayList || []).forEach((b) => { const n = parseInt(b, 10); if (Number.isFinite(n)) set.add(n); });
    containers.forEach((c) => { const e = eff(c); if (!e.storage) { const n = parseInt(e.bay, 10); if (Number.isFinite(n)) set.add(n); } });
    return buildBayPages([...set].sort((a, b) => a - b));
  }, [dictData, containers, eff]);

  const [pageIdx, setPageIdx] = useState(0);
  const page = bayPages[Math.min(pageIdx, Math.max(0, bayPages.length - 1))] || null;

  // 이 페이지(even/odd)의 셀맵 + 행/단
  const view = useMemo(() => {
    if (!page) return null;
    const baySet = new Set([page.even, page.odd].filter((x) => x != null).map(String));
    const here = containers.filter((c) => { const e = eff(c); return !e.storage && baySet.has(String(parseInt(e.bay, 10))); });
    const cellMap = {};
    let maxLeft = 0, maxRight = 0, has00 = false;
    const tierSet = new Set();
    here.forEach((c) => {
      const e = eff(c);
      const t = pad2(e.tier), r = pad2(e.row);
      cellMap[`${t}-${r}`] = c;
      tierSet.add(parseInt(t, 10));
      const rn = parseInt(r, 10);
      if (rn === 0) has00 = true; else if (rn % 2 === 0) maxLeft = Math.max(maxLeft, rn); else maxRight = Math.max(maxRight, rn);
    });
    // 사전 tier/row 보강
    [page.even, page.odd].forEach((bn) => {
      if (bn == null) return;
      const db = dictBaysSummary[bn];
      if (!db) return;
      (db.deckTiers || db.deckTiersLocal || []).forEach((t) => tierSet.add(parseInt(t, 10)));
      (db.holdTiers || db.holdTiersLocal || []).forEach((t) => tierSet.add(parseInt(t, 10)));
      if (db.rowMaxEven) maxLeft = Math.max(maxLeft, db.rowMaxEven);
      if (db.rowMaxOdd) maxRight = Math.max(maxRight, db.rowMaxOdd);
    });
    if (!maxLeft && !maxRight) { maxLeft = 8; maxRight = 7; has00 = false; }
    const left = []; for (let n = maxLeft; n >= 2; n -= 2) left.push(pad2(n));
    const right = []; for (let n = 1; n <= maxRight; n += 2) right.push(pad2(n));
    const rows = has00 ? [...left, '00', ...right] : [...left, ...right];
    const deckTiers = [...tierSet].filter((t) => t >= 80).sort((a, b) => b - a).map(pad2);
    const holdTiers = [...tierSet].filter((t) => t < 80).sort((a, b) => b - a).map(pad2);
    let title;
    if (page.even != null && page.odd != null) title = `BAY (${dispBay(page.even)})${dispBay(page.odd)}`;
    else if (page.even != null) title = `BAY ${dispBay(page.even)}`;
    else title = `BAY ${dispBay(page.odd)}`;
    return { rows, deckTiers, holdTiers, cellMap, title };
  }, [page, containers, eff, dictBaysSummary]);

  // 임시창고 (effective storage)
  const storeList = useMemo(() => containers.filter((c) => eff(c).storage), [containers, eff]);

  // 선택(rubber-band)
  const [selected, setSelected] = useState(new Set());
  const stageRef = useRef(null);
  const [rubber, setRubber] = useState(null);
  const rubberStart = useRef(null);
  const [storeOver, setStoreOver] = useState(false);

  const moveToStorage = (cns) => { if (!cns.length) return; setPending((p) => { const n = { ...p }; cns.forEach((cn) => { n[cn] = { storage: true }; }); return n; }); };
  const placeAtCell = (cn, bayKey, row, tier) => {
    const c = containers.find((x) => x.cn === cn); const sz = c ? sizeOf(c) : '20';
    let bay = bayKey;
    if (page && page.even != null && page.odd != null) bay = (sz === '40' || sz === '45') ? page.even : page.odd;
    setPending((p) => ({ ...p, [cn]: { bay: pad2(bay), row: pad2(row), tier: pad2(tier) } }));
  };

  // 드래그
  const cellDragStart = (e, cn) => { e.dataTransfer.setData('text/plain', cn); e.dataTransfer.effectAllowed = 'move'; };
  const onCellDrop = (e, row, tier) => { e.preventDefault(); const cn = e.dataTransfer.getData('text/plain'); if (cn) placeAtCell(cn, page?.odd ?? page?.even, row, tier); };
  const onStoreDrop = (e) => { e.preventDefault(); setStoreOver(false); const cn = e.dataTransfer.getData('text/plain'); if (cn) moveToStorage([cn]); };

  // rubber-band (빈 곳에서 시작)
  const onStageDown = (e) => { if (e.button !== 0) return; if (e.target.closest('[data-cn]')) return; const r = stageRef.current.getBoundingClientRect(); rubberStart.current = { x: e.clientX, y: e.clientY, rl: r.left, rt: r.top }; setRubber({ left: e.clientX - r.left, top: e.clientY - r.top, w: 0, h: 0 }); };
  const onStageMove = (e) => { if (!rubberStart.current) return; const s = rubberStart.current; const x1 = Math.min(s.x, e.clientX), y1 = Math.min(s.y, e.clientY), x2 = Math.max(s.x, e.clientX), y2 = Math.max(s.y, e.clientY); setRubber({ left: x1 - s.rl, top: y1 - s.rt, w: x2 - x1, h: y2 - y1 }); };
  const onStageUp = (e) => { if (!rubberStart.current) return; const s = rubberStart.current; rubberStart.current = null; const x1 = Math.min(s.x, e.clientX), y1 = Math.min(s.y, e.clientY), x2 = Math.max(s.x, e.clientX), y2 = Math.max(s.y, e.clientY); setRubber(null); if (Math.abs(x2 - x1) < 5 && Math.abs(y2 - y1) < 5) return; const found = new Set(); stageRef.current?.querySelectorAll('[data-cn]').forEach((el) => { const cn = el.getAttribute('data-cn'); if (!cn) return; const b = el.getBoundingClientRect(); const cx = b.left + b.width / 2, cy = b.top + b.height / 2; if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) found.add(cn); }); if (found.size) setSelected(found); };

  const pendCount = Object.keys(pending).length;
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!pendCount || saving) return;
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    setSaving(true);
    try {
      const stg = [], cells = [];
      Object.entries(pending).forEach(([cn, p]) => { if (p.storage) stg.push(cn); else cells.push([cn, p]); });
      if (stg.length) await fbBatchMoveToStorage(voyageKey, mode, stg, inspector);
      for (const [cn, p] of cells) await fbSetActualPosition(voyageKey, mode, cn, p.bay, p.row, p.tier, inspector);
      setPending({}); setSelected(new Set());
      alert(`저장 완료 — ${stg.length + cells.length}건 반영. 검수사 화면에 표시됩니다.`);
    } catch (e) { console.error(e); alert('저장 실패: ' + (e?.message || e)); }
    finally { setSaving(false); }
  };
  const tryClose = () => { if (pendCount && !confirm(`저장하지 않은 변경 ${pendCount}건이 있습니다. 닫으면 버려집니다. 닫을까요?`)) return; onClose(); };

  const renderCell = (t, r) => {
    const c = view.cellMap[`${t}-${r}`];
    if (!c) return <div key={`${t}-${r}`} className="cbe-cell empty" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onCellDrop(e, r, t)}></div>;
    const lines = formatCellLines(c);
    const ptk = mode === 'discharge' ? isPyeongtaekPort(c.pod) : (c._inList || isPyeongtaekPort(c.pol));
    const colorKey = ptk ? getContainerColorKey(c, mode) : null;
    const col = colorKey ? colorMap[colorKey] : null;
    const isSel = selected.has(c.cn), isPend = !!pending[c.cn];
    return (
      <div key={`${t}-${r}`} data-cn={c.cn} draggable
        className={`cbe-cell filled ${ptk ? 'ptk' : ''} ${isSel ? 'sel' : ''} ${isPend ? 'pending' : ''}`}
        style={col ? { color: col } : undefined}
        title={`${c.cn}  ${lines.line3 || ''}`}
        onDragStart={(e) => cellDragStart(e, c.cn)}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => onCellDrop(e, r, t)}>
        <span className="cbe-cn">{c.cn}</span>
        <span className="cbe-sub">{lines.line1}</span>
      </div>
    );
  };

  return createPortal(
    <div className="cbe-overlay" onMouseUp={onStageUp} onMouseMove={onStageMove}>
      <style>{CBE_CSS}</style>
      <div className="cbe-head">
        <strong style={{ fontSize: 15 }}>🖐 베이상세 편집 (수석)</strong>
        <div className="cbe-modes">
          {hasDis && <button className={mode === 'discharge' ? 'on' : ''} onClick={() => { setMode('discharge'); setPageIdx(0); }}>양하</button>}
          {hasLoad && <button className={mode === 'loading' ? 'on' : ''} onClick={() => { setMode('loading'); setPageIdx(0); }}>선적</button>}
        </div>
        <span style={{ fontSize: 11, opacity: .65 }}>{voyage?.info?.vsl || ''} · 컨을 끌어 정정, 저장해야 검수사에 반영</span>
        <button onClick={tryClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer' }}><X size={20} /></button>
      </div>
      <div className="cbe-baynav">
        {bayPages.map((p, i) => (<button key={p.key} className={i === pageIdx ? 'on' : ''} onClick={() => { setPageIdx(i); setSelected(new Set()); }}>{p.even != null && p.odd != null ? `${dispBay(p.even)}-${dispBay(p.odd)}` : dispBay(p.even ?? p.odd)}</button>))}
        {bayPages.length === 0 && <span style={{ color: '#94a3b8', fontSize: 12, padding: 4 }}>베이 없음 — 선택한 작업에 적재 데이터가 없습니다</span>}
      </div>
      <div className="cbe-tools">
        <span>선택 <strong>{selected.size}</strong></span>
        <button onClick={() => { moveToStorage([...selected]); setSelected(new Set()); }} disabled={!selected.size} style={{ background: selected.size ? '#2563eb' : '#334155' }}>선택분 → 임시창고</button>
        <button onClick={() => setSelected(new Set())} disabled={!selected.size} style={{ background: '#475569' }}>선택해제</button>
        <span style={{ marginLeft: 'auto', color: pendCount ? '#fbbf24' : '#64748b' }}>미저장 {pendCount}건</span>
        <button onClick={() => { setPending({}); setSelected(new Set()); }} disabled={!pendCount} style={{ background: '#7c2d12' }}><Undo2 size={14} />되돌리기</button>
        <button onClick={save} disabled={!pendCount || saving} style={{ background: pendCount ? '#16a34a' : '#334155' }}><Save size={14} />{saving ? '저장 중…' : '저장'}</button>
      </div>
      <div className="cbe-body">
        <div className="cbe-stage" ref={stageRef} onMouseDown={onStageDown}>
          {rubber && <div className="cbe-rubber" style={{ left: rubber.left, top: rubber.top, width: rubber.w, height: rubber.h }} />}
          {view ? (
            <div className="cbe-bd">
              <div className="cbe-bd-title">{view.title}</div>
              <div className="cbe-rl">{view.rows.map((r) => <span key={r}>{r}</span>)}</div>
              {view.deckTiers.map((t) => <div key={t} className="cbe-tier-row">{view.rows.map((r) => renderCell(t, r))}</div>)}
              {view.deckTiers.length > 0 && view.holdTiers.length > 0 && <div className="cbe-hatch"></div>}
              {view.holdTiers.map((t) => <div key={t} className="cbe-tier-row">{view.rows.map((r) => renderCell(t, r))}</div>)}
              <div className="cbe-rl">{view.rows.map((r) => <span key={r}>{r}</span>)}</div>
            </div>
          ) : <span style={{ color: '#94a3b8' }}>베이를 선택하세요</span>}
        </div>
        <div className="cbe-store">
          <div className="cbe-store-h"><span>📦 임시창고</span><span>{storeList.length}대</span></div>
          <div className={`cbe-drop${storeOver ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setStoreOver(true); }} onDragLeave={() => setStoreOver(false)} onDrop={onStoreDrop}>
            여기로 컨을 끌어다 놓기<br />= 임시창고 보관
          </div>
          <div className="cbe-store-list">
            {storeList.length === 0 && <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 16 }}>비어 있음</div>}
            {storeList.map((c) => (
              <div key={c.cn} className="cbe-chip" draggable onDragStart={(e) => cellDragStart(e, c.cn)} title="베이 칸으로 끌어 배치">
                <span className="cbe-chip-cn">{c.cn}</span> <span style={{ opacity: .55 }}>{isoToLabel(c.iso)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
