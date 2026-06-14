// 베이상세 드래그 편집 — 수석 검수사가 컨테이너를 마우스로 임시창고↔베이 이동 (V7.96)
//   기존 백엔드 재사용: 임시창고=__STG__(fbBatchMoveToStorage), 실체위치 지정(fbSetActualPosition).
//   카고플랜 BayBoxV2를 그대로 크게 표시(별도 격자 작성 안 함). 새 로직 없음 — 마우스 입력만 추가.
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getShipBayDictData } from '../shipStructure.js';
import { enrichBayDef } from '../bayDictAutoEnrich.js';
import { getContainerColorKey, buildContainerColorMap, isPyeongtaekPort, isoToLabel } from '../utils.js';
import { autoPairBays, generatePdfBays, buildPosMap, computeBayRenderData } from '../cargoPlanCore.js';
import { BayBoxV2, getMarkV2, CARGO_V2_CSS } from './PrintableCargoPlanV2.jsx';

export const BDE_CSS = `
.bde-overlay{position:fixed;inset:0;background:rgba(15,23,42,.78);z-index:9999;display:flex;flex-direction:column;}
.bde-head{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#0f172a;color:#e2e8f0;}
.bde-baynav{display:flex;gap:4px;flex-wrap:wrap;padding:8px;background:#0b1220;max-height:84px;overflow:auto;}
.bde-baynav button{padding:4px 9px;border-radius:5px;font-size:12px;font-weight:700;border:1px solid #334155;background:#1e293b;color:#cbd5e1;cursor:pointer;}
.bde-baynav button.on{background:#2563eb;color:#fff;border-color:#2563eb;}
.bde-tools{display:flex;gap:6px;align-items:center;padding:6px 12px;background:#0f172a;color:#cbd5e1;font-size:12px;border-top:1px solid #1e293b;}
.bde-tools button{padding:4px 10px;border-radius:5px;font-weight:700;border:none;cursor:pointer;color:#fff;}
.bde-body{flex:1;display:flex;min-height:0;}
.bde-stage{flex:1;overflow:auto;padding:16px;display:flex;align-items:center;justify-content:center;background:#1e293b;position:relative;}
.bde-box{background:#fff;border-radius:6px;padding:10px;max-width:560px;width:100%;height:min(72vh,620px);display:flex;flex-direction:column;}
.bde-store{width:210px;background:#0f172a;color:#e2e8f0;display:flex;flex-direction:column;border-left:1px solid #334155;}
.bde-store-h{padding:8px 10px;font-weight:800;font-size:13px;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center;}
.bde-drop{margin:8px;border:2px dashed #38bdf8;border-radius:6px;padding:12px;text-align:center;font-size:12px;color:#7dd3fc;line-height:1.5;}
.bde-drop.over{background:#0c4a6e;color:#e0f2fe;}
.bde-store-list{flex:1;overflow:auto;padding:8px;}
.bde-chip{background:#1e293b;border:1px solid #475569;border-radius:5px;padding:7px 8px;margin-bottom:5px;font-size:12px;cursor:grab;font-family:monospace;color:#e2e8f0;}
.bde-chip:active{cursor:grabbing;}
.bde-cell-sel{outline:2px solid #2563eb;outline-offset:-2px;}
.bde-edit .cpv2-cell[draggable=true]{cursor:grab;}
.bde-edit .cpv2-cell[draggable=true]:active{cursor:grabbing;}
.bde-edit .cpv2-cell{font-size:clamp(11px,1.6vw,16px) !important;}
.bde-edit .cpv2-row-labels{font-size:clamp(9px,1.3vw,13px) !important;}
.bde-edit .cpv2-tier-labels{font-size:clamp(9px,1.3vw,13px) !important;}
.bde-rubber{position:absolute;border:1.5px solid #2563eb;background:rgba(37,99,235,.15);pointer-events:none;z-index:5;}
@media (max-width:680px){
  .bde-body{flex-direction:column;}
  .bde-stage{align-items:stretch;padding:8px;}
  .bde-box{height:100%;max-width:none;}
  .bde-store{width:100%;flex:0 0 auto;max-height:134px;border-left:none;border-top:1px solid #334155;}
  .bde-store-h{padding:6px 10px;}
  .bde-drop{margin:6px;padding:7px;line-height:1.3;}
  .bde-store-list{display:flex;flex-direction:row;flex-wrap:nowrap;overflow-x:auto;gap:6px;padding:6px;}
  .bde-chip{margin-bottom:0;white-space:nowrap;}
  .bde-edit .cpv2-cell{font-size:clamp(11px,3.2vw,16px) !important;}
  .bde-edit .cpv2-row-labels{margin-right:4px !important;}
  .bde-stage{overflow:auto;}
  .bde-box{width:max-content;min-width:100%;}
}
`;

function keyToNum(key) { const m = key.startsWith('(') ? key.replace(/[()]/g, '').slice(2) : key; return parseInt(m, 10) || 0; }
function keyLabel(key) { if (key.startsWith('(')) { const m = key.replace(/[()]/g, ''); return m.slice(0, 2) + '-' + m.slice(2); } return key; }

export default function BayDetailEdit({ onClose, containers = [], shipImo, shipName, mode = 'discharge', xrayMap = {}, storedContainers = [], onMoveToStorage, onPlaceAtCell }) {
  // ── 베이사전 + 매트릭스 (카고플랜과 동일 prep) ──
  const dictData = useMemo(() => {
    if (!shipImo && !shipName) return null;
    const ediBayCount = (() => { const s = new Set(); for (const c of containers) { const n = parseInt(c.bay, 10); if (Number.isFinite(n) && n > 0) s.add(n); } return s.size; })();
    const base = getShipBayDictData(shipImo, shipName, { ediBayCount });
    if (!base) return null;
    const enriched = enrichBayDef({ bayDef: base.bayDef }, base._v5Matrix, containers, base.source);
    return { ...base, bayDef: { ...enriched.bayDef, source: base.source, _userOwned: base.source === 'user' } };
  }, [shipImo, shipName, containers]);

  const matrixBays = useMemo(() => {
    const raw = dictData?._v5Matrix?.matrixBays || [];
    const v2 = dictData?.bayDef || {};
    const deckAll = v2.deckTiers || [];
    const holdAll = v2.holdTiers || [];
    const summary = v2.baysSummary || [];
    const byBay = new Map();
    for (const s of summary) { const n = Number(s.bayNo); if (Number.isFinite(n)) byBay.set(n, s); }
    const ediT = new Map();
    for (const c of containers) { const b = Number(c.bay), t = Number(c.tier); if (!Number.isFinite(b) || !Number.isFinite(t)) continue; if (!ediT.has(b)) ediT.set(b, new Set()); ediT.get(b).add(t); }
    let bays = raw;
    if (bays.length === 0 && summary.length > 0) {
      bays = summary.map((s) => ({ bayNum: Number(s.bayNo), cells: [], hasHold: !!s.hasHold, hasDeck: s.hasDeck !== false, isStandalone: !!s.isStandalone }));
    }
    if (raw.length > 0 && summary.length > 0) {
      const allow = new Set(summary.map((s) => Number(s.bayNo)).filter(Number.isFinite));
      bays = raw.filter((b) => allow.has(Number(b.bayNum)));
    }
    return bays.map((b) => {
      const sm = byBay.get(b.bayNum);
      const tiers = ediT.get(b.bayNum); const et = tiers ? [...tiers] : [];
      const hasDeck = sm?.hasDeck !== undefined ? sm.hasDeck : (b.hasDeck !== false || et.some((t) => t >= 80));
      const hasHold = sm?.hasHold !== undefined ? sm.hasHold : (b.hasHold || et.some((t) => t < 80));
      const cells = b.cells ? [...b.cells].reverse() : [];
      const sDeck = (sm?.deckTiers && sm.deckTiers.length > 0) ? sm.deckTiers : ((sm?.deckTiersLocal && sm.deckTiersLocal.length > 0) ? sm.deckTiersLocal : null);
      const sHold = (sm?.holdTiers && sm.holdTiers.length > 0) ? sm.holdTiers : ((sm?.holdTiersLocal && sm.holdTiersLocal.length > 0) ? sm.holdTiersLocal : null);
      const deckTiers = hasDeck ? (sDeck ? sDeck.map(Number) : deckAll) : [];
      const holdTiers = hasHold ? (sHold ? sHold.map(Number) : holdAll) : [];
      const nD = deckTiers.length, nH = holdTiers.length;
      const sdc = (sm?.deckCells && sm.deckCells.length > 0) ? sm.deckCells : null;
      const shc = (sm?.holdCells && sm.holdCells.length > 0) ? sm.holdCells : null;
      const deckCells = sdc ? sdc.slice(0, nD).map(Number) : (nD > 0 ? cells.slice(0, nD) : []);
      const holdCells = shc ? shc.slice(0, nH).map(Number) : (nH > 0 ? cells.slice(nD, nD + nH) : []);
      return { ...b, hasDeck, hasHold, deckCells, holdCells, deckTiers, holdTiers, isStandalone: sm?.isStandalone || b.isStandalone || false };
    });
  }, [dictData, containers]);

  const pod = useMemo(() => { const c = {}; for (const x of containers) { const p = x.pod; if (p) c[p] = (c[p] || 0) + 1; } return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || 'KRPTK'; }, [containers]);
  const { trios, singles } = useMemo(() => autoPairBays(matrixBays), [matrixBays]);
  const pdfBays = useMemo(() => generatePdfBays(matrixBays, trios, singles), [matrixBays, trios, singles]);
  const posMap = useMemo(() => buildPosMap(containers), [containers]);
  const colorMap = useMemo(() => buildContainerColorMap(containers, mode), [containers, mode]);
  const getColorKey = useCallback((c) => getContainerColorKey(c, mode), [mode]);
  const matchPod = useCallback((c) => mode === 'discharge' ? isPyeongtaekPort(c.pod) : (c._inList || isPyeongtaekPort(c.pol)), [mode]);
  const getIsThrough = useCallback((c) => !matchPod(c), [matchPod]);

  const boxes = useMemo(() => {
    const list = [];
    trios.forEach(([top, pair]) => list.push({ kind: 'trio', topKey: top, pairKey: pair, num: keyToNum(pair), label: keyLabel(pair) }));
    singles.forEach((s) => list.push({ kind: 'single', topKey: s, num: keyToNum(s), label: keyLabel(s) }));
    return list.sort((a, b) => a.num - b.num);
  }, [trios, singles]);

  const [selIdx, setSelIdx] = useState(0);
  useEffect(() => { if (selIdx >= boxes.length) setSelIdx(0); }, [boxes, selIdx]);
  const box = boxes[selIdx] || null;

  const mk = useCallback((key) => key ? computeBayRenderData(key, pdfBays, matrixBays, posMap, pod, (c, p) => getMarkV2(c, p, mode), xrayMap, getColorKey, getIsThrough, dictData?.bayDef, dictData?.code) : null,
    [pdfBays, matrixBays, posMap, pod, mode, xrayMap, getColorKey, getIsThrough, dictData]);
  const topData = useMemo(() => box ? mk(box.topKey) : null, [box, mk]);
  const pairData = useMemo(() => (box && box.kind === 'trio') ? mk(box.pairKey) : null, [box, mk]);
  const gridCols = useMemo(() => { let m = 0; for (const d of [topData, pairData]) { if (d?.nDeckCols > m) m = d.nDeckCols; if (d?.nHoldCols > m) m = d.nHoldCols; } return Math.max(m, 1); }, [topData, pairData]);

  const storeByCn = useMemo(() => { const m = new Map(); for (const c of storedContainers) m.set(c.cn, c); return m; }, [storedContainers]);

  // ── 선택 (rubber-band) ──
  const [selectedCns, setSelectedCns] = useState(new Set());
  const stageRef = useRef(null);
  const [rubber, setRubber] = useState(null);
  const rubberStart = useRef(null);
  const [storeOver, setStoreOver] = useState(false);

  useEffect(() => { setSelectedCns(new Set()); }, [selIdx]);

  // 임시창고 → 베이 칸 배치 (대상 베이: 단독=번호, 페어=컨 사이즈로 짝/홀 결정)
  const handleCellDrop = useCallback((cn, bayKey, cell, tier) => {
    if (!cn || !onPlaceAtCell) return;
    let targetBay;
    if (bayKey.startsWith('(')) {
      const m = bayKey.replace(/[()]/g, ''); const even = m.slice(0, 2); const odd = m.slice(2);
      const c = storeByCn.get(cn) || containers.find((x) => x.cn === cn);
      const lbl = c ? (isoToLabel(c.iso) || '') : '';
      targetBay = (lbl.startsWith('40') || lbl.startsWith('45')) ? even : odd;
    } else {
      targetBay = bayKey;
    }
    onPlaceAtCell(cn, String(targetBay).padStart(2, '0'), String(cell.rowLbl || '').padStart(2, '0'), String(tier).padStart(2, '0'));
  }, [onPlaceAtCell, storeByCn, containers]);

  // 베이 셀 컨 → 임시창고 보관
  const handleStoreDrop = useCallback((e) => {
    e.preventDefault(); setStoreOver(false);
    const cn = e.dataTransfer.getData('text/plain');
    if (cn && onMoveToStorage) onMoveToStorage([cn]);
  }, [onMoveToStorage]);

  const chipDragStart = (e, cn) => { e.dataTransfer.setData('text/plain', cn); e.dataTransfer.effectAllowed = 'move'; };

  // rubber-band: 빈 영역에서 mousedown 시작 (컨 셀은 draggable이라 제외)
  const onStageMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('[data-cn]')) return;
    const r = stageRef.current.getBoundingClientRect();
    rubberStart.current = { x: e.clientX, y: e.clientY, rl: r.left, rt: r.top };
    setRubber({ left: e.clientX - r.left, top: e.clientY - r.top, w: 0, h: 0 });
  };
  const onStageMouseMove = (e) => {
    if (!rubberStart.current) return;
    const s = rubberStart.current;
    const x1 = Math.min(s.x, e.clientX), y1 = Math.min(s.y, e.clientY), x2 = Math.max(s.x, e.clientX), y2 = Math.max(s.y, e.clientY);
    setRubber({ left: x1 - s.rl, top: y1 - s.rt, w: x2 - x1, h: y2 - y1 });
  };
  const onStageMouseUp = (e) => {
    if (!rubberStart.current) return;
    const s = rubberStart.current; rubberStart.current = null;
    const x1 = Math.min(s.x, e.clientX), y1 = Math.min(s.y, e.clientY), x2 = Math.max(s.x, e.clientX), y2 = Math.max(s.y, e.clientY);
    setRubber(null);
    if (Math.abs(x2 - x1) < 5 && Math.abs(y2 - y1) < 5) return;
    const found = new Set();
    if (stageRef.current) {
      stageRef.current.querySelectorAll('[data-cn]').forEach((el) => {
        const cn = el.getAttribute('data-cn'); if (!cn) return;
        const b = el.getBoundingClientRect();
        const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) found.add(cn);
      });
    }
    if (found.size > 0) setSelectedCns(found);
  };

  const sendSelected = () => { if (selectedCns.size > 0 && onMoveToStorage) { onMoveToStorage([...selectedCns]); setSelectedCns(new Set()); } };

  return createPortal(
    <div className="bde-overlay" onMouseUp={onStageMouseUp} onMouseMove={onStageMouseMove}>
      <style>{CARGO_V2_CSS}</style>
      <style>{BDE_CSS}</style>
      <div className="bde-head">
        <strong style={{ fontSize: 15 }}>🖐 베이상세 편집</strong>
        <span style={{ fontSize: 12, opacity: .7 }}>{mode === 'discharge' ? '양하' : '선적'} · 컨을 끌어 임시창고↔베이 이동, 빈 곳 드래그로 영역 선택</span>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer' }}><X size={20} /></button>
      </div>
      <div className="bde-baynav">
        {boxes.map((b, i) => (<button key={b.topKey} className={i === selIdx ? 'on' : ''} onClick={() => setSelIdx(i)}>{b.label}</button>))}
        {boxes.length === 0 && <span style={{ color: '#94a3b8', fontSize: 12, padding: '4px' }}>베이사전/매트릭스 없음 — 신규 선박 등록 필요</span>}
      </div>
      <div className="bde-tools">
        <span>선택: <strong>{selectedCns.size}</strong>대</span>
        <button onClick={sendSelected} disabled={selectedCns.size === 0} style={{ background: selectedCns.size ? '#2563eb' : '#334155' }}>선택분 → 임시창고</button>
        <button onClick={() => setSelectedCns(new Set())} disabled={selectedCns.size === 0} style={{ background: '#475569' }}>선택해제</button>
      </div>
      <div className="bde-body">
        <div className="bde-stage bde-edit" ref={stageRef} onMouseDown={onStageMouseDown}>
          {rubber && <div className="bde-rubber" style={{ left: rubber.left, top: rubber.top, width: rubber.w, height: rubber.h }} />}
          {box ? (
            <div className="bde-box">
              {box.kind === 'trio' ? (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%' }}>
                  <BayBoxV2 data={topData} colorMap={colorMap} gridCols={gridCols} applyHatch={false} editable onCellDrop={handleCellDrop} selectedCns={selectedCns} />
                  <div className="cpv2-trio-divider"></div>
                  <BayBoxV2 data={pairData} colorMap={colorMap} gridCols={gridCols} applyHatch={true} editable onCellDrop={handleCellDrop} selectedCns={selectedCns} />
                </div>
              ) : (
                <BayBoxV2 data={topData} colorMap={colorMap} gridCols={gridCols} editable onCellDrop={handleCellDrop} selectedCns={selectedCns} />
              )}
            </div>
          ) : <span style={{ color: '#94a3b8' }}>베이를 선택하세요</span>}
        </div>
        <div className="bde-store">
          <div className="bde-store-h"><span>📦 임시창고</span><span>{storedContainers.length}대</span></div>
          <div className={`bde-drop${storeOver ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setStoreOver(true); }} onDragLeave={() => setStoreOver(false)} onDrop={handleStoreDrop}>
            여기로 컨을 끌어다 놓기<br />= 임시창고 보관
          </div>
          <div className="bde-store-list">
            {storedContainers.length === 0 && <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 20 }}>비어 있음</div>}
            {storedContainers.map((c) => (
              <div key={c.cn} className="bde-chip" draggable onDragStart={(e) => chipDragStart(e, c.cn)} title="베이 칸으로 끌어 배치">
                {c.cn}{c.iso ? <span style={{ opacity: .5, marginLeft: 6 }}>{isoToLabel(c.iso)}</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
