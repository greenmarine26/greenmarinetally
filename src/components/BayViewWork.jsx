// 3.48 «베이뷰 작업» — 양하·선적을 고른 뒤 여는 전면 덮개. 위 칸은 지금 «작업 시작» 탭(SearchPanel) 그대로, 아래 칸은 작업 중인 베이 한 장을 실시간으로. 선택 화면이 먼저 뜬다.
//   검수사 2026-09-15 «폰의 1/3은 양하와 선적 컨테이너 자료화면 이고 2/3는 작업중인 베이를 실시간으로 보여주는것이다» ·
//   «작업할 베이와 데크인지 홀드 인지 자동인지 수동인지 수동이면 싱글인지 트윈인지를 선택하면 바로 화면 전환» ·
//   «기존껄 바꾸는게 아니고 추가하는 기능입니다» · «선택화면을 먼저 보여줘야 하고 만약 사용자가 선택을 안한다면 자동모드로 터미널이 선택한 베이로».
//   ⚠ 판정은 전부 한 벌을 부른다 — 완료 지도·불일치 utils.bayViewOverlayOf · 따라가기 utils.bayViewFollowOf(수석 보드 craneBoardOf) ·
//     베이·단 게이트는 SearchPanel 것(bayView prop 으로 초기값만 넣고 보고만 받는다) · 그림은 BayPlan onlyBay(수석 보드와 같은 갈래) + FitBox.
//   ⚠ 인스턴스 하나 — VoyagePage 가 «작업 시작» 탭 자리에 이 덮개를 **대신** 그린다(SearchPanel 이 두 벌 돌지 않게).
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import SearchPanel from './SearchPanel.jsx';
import BayPlan from './BayPlan.jsx';
import { FitBox } from './FitBox.jsx';
import { bayViewOverlayOf, bayViewFollowOf, getEquipNumber, setEquipNumber, equipNumbersForPier, getPierFromBerth } from '../utils.js';
import { getShipBayDictData } from '../shipStructure.js';
import { buildBayPagesFromSummary, hatchEvenOf } from '../cargoPlanCore.js';
import { useBackHandler } from '../backHandler.js';
import useIsWide from '../useIsWide.js';   // 3.49: 넓은 화면(태블릿·컴)은 좌/우 분할 — 리스트 탭 2단과 같은 기준(1024px)

const pad2 = (x) => String(x ?? '').padStart(2, '0');
const fmtT = (ms) => { if (!ms) return ''; const d = new Date(ms); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const RATIO_KEY = 'gm_bayview_ratio';
const RATIO_DEF = 1 / 3;
const readRatio = () => { try { const v = parseFloat(localStorage.getItem(RATIO_KEY)); return (v >= 0.2 && v <= 0.7) ? v : RATIO_DEF; } catch (e) { return RATIO_DEF; } };
const lastKey = (voyageKey, mode) => `gm_bayview_last:${voyageKey}:${mode}`;
const readLast = (voyageKey, mode) => { try { const v = JSON.parse(localStorage.getItem(lastKey(voyageKey, mode)) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } };
const writeLast = (voyageKey, mode, v) => { try { localStorage.setItem(lastKey(voyageKey, mode), JSON.stringify(v)); } catch (e) { /* 저장소 없음 — 다음에 다시 묻는다 */ } };

//  장 이름 — 판정(어느 장인가)은 cargoPlanCore.hatchEvenOf 한 벌, 여기서는 «BAY (20)21» 꼴로 적기만 한다(BayPlan 제목과 같은 꼴).
function hatchTitleOf(bay, pages) {
  const b = parseInt(bay, 10); if (!(b > 0)) return '';
  const E = hatchEvenOf(b, pages) ?? b;
  const p = (pages || []).find((x) => x && x.even === E);
  if (p) return p.odd != null ? `BAY (${pad2(p.even)})${pad2(p.odd)}` : `BAY ${pad2(p.even)}`;
  return `BAY ${pad2(b)}`;
}

export default function BayViewWork({ voyage, voyageKey, inspector, mode, allEdiContainers, xrayMap, xraySeals, shiftingMap, preGoneInfo = null,
  onOpenContainer, onClose, searchPanelProps = {} }) {
  const sec = (voyage && voyage[mode]) || {};
  const info = (voyage && voyage.info) || {};
  const [step, setStep] = useState('pick');                    // 'pick' | 'view'
  const [follow, setFollow] = useState(false);                 // 터미널 따라가기
  const [preset, setPreset] = useState(null);                  // SearchPanel 에 넣는 초기값 {seq,bay,tier,guide,twin}
  const [live, setLive] = useState({ bay: null, tier: null, guide: false, twin: false, noWorkLeft: false });   // SearchPanel 이 올리는 지금 맥락
  const [titles, setTitles] = useState([]);
  const [ratio, setRatio] = useState(readRatio);
  const [zoom, setZoom] = useState(1);
  const [showConf, setShowConf] = useState(false);
  const isWide = useIsWide();   // 3.49: 검수사 «폰화면은 수직 화면 이지만 컴은 수평화면으로 … 컴은 좌측에 컨테이너 자료가 우측에 베이»
  const [equip, setEquip] = useState(getEquipNumber());
  useEffect(() => {
    const h = (e) => setEquip((e && e.detail) || getEquipNumber());
    window.addEventListener('equipChanged', h);
    return () => window.removeEventListener('equipChanged', h);
  }, []);
  //  안드로이드 뒤로가기 = 덮개 닫기(항차를 떠나지 않는다).
  //  ⚠ onBack 은 **고정**이어야 한다 — useBackHandler 는 deps 가 바뀔 때마다 history.pushState 를 또 하므로(App B-6 «가짜 엔트리 무한 누적»과 같은 병)
  //    부모가 매 렌더 새 onClose 를 주면 30초 활동 tick 마다 가짜 항목이 쌓여 뒤로가기가 죽는다(감사 실측 재렌더 10회에 +10). 값은 ref 로 본다.
  const stepRef = useRef(step); stepRef.current = step;
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const onBack = useCallback(() => { if (stepRef.current === 'view') setStep('pick'); else if (closeRef.current) closeRef.current(); }, []);
  useBackHandler(onBack, true);

  //  장 목록 — 보드·BayPlan 과 같은 길(getShipBayDictData → buildBayPagesFromSummary)
  const pages = useMemo(() => {
    const imo = info.imo, nm = info.vsl;
    if (!imo && !nm) return null;
    try {
      const dict = getShipBayDictData(imo, nm, { vslCode: String(voyageKey || '').split('_')[0], callsign: info.callsign || '', vslFull: info.vslFull || nm || '' });
      if (!dict || !dict.bayDef || !dict.bayDef.baysSummary) return null;
      return buildBayPagesFromSummary(dict.bayDef) || null;
    } catch (e) { console.warn('[베이뷰] 베이사전 장 목록 실패 — 해치 묶기는 폴백으로', e); return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.imo, info.vsl, voyageKey]);

  //  완료 지도(앱 ∪ 터미널)·불일치 — 한 벌
  const overlay = useMemo(() => bayViewOverlayOf(sec), [sec]);
  //  따라가기 자리 — 수석 보드와 같은 판정
  const fol = useMemo(() => bayViewFollowOf(voyage, equip, pages, mode), [voyage, equip, pages, mode]);

  //  따라가기 중이면 터미널 자리가 바뀔 때 위 칸(SearchPanel)에 새 베이·단을 넣는다. 같은 값이면 안 건드린다.
  const folKey = `${fol.bay}|${fol.tier}`;
  useEffect(() => {
    if (step !== 'view' || !follow || fol.bay == null) return;
    setPreset((p) => ({ seq: ((p && p.seq) || 0) + 1, bay: fol.bay, tier: fol.tier || (p && p.tier) || 'deck', guide: true, twin: null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folKey, step, follow]);

  const onCtx = useCallback((c) => setLive((o) => (o.bay === c.bay && o.tier === c.tier && o.guide === c.guide && o.twin === c.twin && o.noWorkLeft === c.noWorkLeft) ? o : c), []);

  const enter = (opts) => {
    //  opts = { follow, bay, tier, guide, twin }
    const f = !!opts.follow;
    setFollow(f);
    const folBay = fol.bay != null ? fol.bay : (((fol.cranes || [])[0] || {}).bay ?? null);   // 3.49-02: 호기 비었고 일하는 호기 하나 → 그 자리(다음 렌더에서 fol 이 그 호기로 다시 잡힌다)
    setPreset({ seq: 1, bay: f ? folBay : (opts.bay === undefined ? null : opts.bay), tier: f ? (fol.tier || 'deck') : (opts.tier === undefined ? null : opts.tier), guide: f ? true : !!opts.guide, twin: opts.twin == null ? null : !!opts.twin });
    writeLast(voyageKey, mode, { follow: f, guide: f ? true : !!opts.guide, twin: !!opts.twin });
    setShowConf(false);
    setStep('view');
  };
  const last = readLast(voyageKey, mode);
  const pier = getPierFromBerth(info.berth || '');
  const equipList = equipNumbersForPier(pier);

  //  아래 칸이 그릴 베이 — 위 칸이 고른 묶음(center)이 먼저, 없으면 따라가기 자리(터미널)
  const gridBay = live.bay != null && live.bay > 0 ? live.bay : (fol.bay != null ? fol.bay : null);
  const bright = live.tier === 'deck' || live.tier === 'hold' ? live.tier : (fol.tier || null);
  const gridContainers = useMemo(() => allEdiContainers || [], [allEdiContainers]);
  const cnMap = useMemo(() => { const m = {}; for (const c of gridContainers) if (c && c.cn) m[c.cn] = c; return m; }, [gridContainers]);
  const modeLabel = mode === 'loading' ? '선적' : '양하';
  useEffect(() => { if (gridBay == null) setTitles([]); }, [gridBay]);   // 그림이 내려가면 옛 제목도 내린다
  const bayLabel = titles.length ? titles.join(' ') : (gridBay != null ? hatchTitleOf(gridBay, pages) : '베이 미정');
  const nConf = overlay.conflicts.filter((c) => c.type !== 'noterm').length, nNoTerm = overlay.conflicts.length - nConf;

  //  칸 경계 끌기 — 폰에 기억. 두 번 두드리면 1/3 로.
  const boxRef = useRef(null); const dragRef = useRef(null);
  const bottomRef = useRef(null);   // 3.49-01: 아래(우) 칸 바닥 — FitBox 가 폭뿐 아니라 이 높이에도 맞춘다
  //  3.49-01 장 배치(세로 쌓기 col / 가로 나란히 row) — **더 크게 그려지는 쪽**을 고른다. 감사 실측: 1280×800 노트북은 col+높이 맞춤 0.72 vs row 0.60(밑 58% 빈칸),
  //    초광폭(2560×1080)이나 손잡이를 끌어 베이 칸을 넓히면 row 가 이긴다. 검수사가 여백을 두 번 지적한 자리(FitBox 머리말)라 자동으로 재서 정한다.
  //    장의 자연 크기(offsetWidth/Height — transform 무관)로 두 배치의 맞춤 배율을 계산한다. col 에선 장 폭이 min-w-full 로 늘어나 있어 row 폭은 «최대 폭 × 장 수»(상한)로 잡는다 —
  //    그래서 col→row 로 바꾼 뒤 정확한 폭으로 다시 재도 row 가 더 커질 뿐이라 왔다갔다 하지 않는다. 폰(좁은 화면)은 늘 col.
  const [layoutPick, setLayoutPick] = useState('col');
  useEffect(() => {
    if (!isWide) { setLayoutPick('col'); return undefined; }
    const pane = bottomRef.current; if (!pane) return undefined;
    const calc = () => {
      const lay = pane.querySelector('[data-only-layout]'); if (!lay) return;
      const kids = [...lay.children]; if (!kids.length) return;
      const box = lay.parentElement && lay.parentElement.parentElement; if (!box) return;
      const ws = kids.map((k) => k.offsetWidth), hs = kids.map((k) => k.offsetHeight);
      if (ws.some((w) => !(w > 0)) || hs.some((h) => !(h > 0))) return;
      const gapRow = 48 * (kids.length - 1), gapCol = 4 * (kids.length - 1);
      const maxW = Math.max(...ws), maxH = Math.max(...hs), sumH = hs.reduce((a, b) => a + b, 0) + gapCol;
      const rowW = (lay.getAttribute('data-only-layout') === 'row' ? ws.reduce((a, b) => a + b, 0) : maxW * kids.length) + gapRow;
      const bw = box.clientWidth; const bh = Math.floor(pane.getBoundingClientRect().bottom - box.getBoundingClientRect().top) - 6 - (pane.scrollTop || 0);
      if (!(bw > 0) || !(bh > 0)) return;
      const sCol = Math.min(bw / maxW, bh / sumH), sRow = Math.min(bw / rowW, bh / maxH);
      setLayoutPick(sRow > sCol * 1.02 ? 'row' : 'col');
    };
    calc();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(calc) : null;
    if (ro) { ro.observe(pane); const lay = pane.querySelector('[data-only-layout]'); if (lay) ro.observe(lay); }
    return () => { if (ro) ro.disconnect(); };
    //  titles — BayPlan 이 사전을 읽어 장을 그린 뒤(onTitles) 다시 잰다. 첫 커밋엔 장이 아직 없어 calc 가 빈손으로 돌아온다(실렌더 2560 에서 col 에 머문 원인).
  }, [isWide, gridBay, ratio, titles, gridContainers.length]);   // gridContainers.length — 자료가 늦게 와 «자료 없음» 뒤에 장이 생기는 갈래(감사)
  const onHandleDown = (e) => { const box = boxRef.current; if (!box) return; const rc = box.getBoundingClientRect(); dragRef.current = isWide ? { left: rc.left, w: box.clientWidth } : { top: rc.top + 40, h: box.clientHeight - 40 }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* 캡처 못 해도 끌린다 */ } };
  const onHandleMove = (e) => { const d = dragRef.current; if (!d) return; const r = d.w > 0 ? (e.clientX - d.left) / d.w : (d.h > 0 ? (e.clientY - d.top) / d.h : null); if (r == null) return; setRatio(Math.min(0.7, Math.max(0.2, r))); };
  const onHandleUp = () => { if (!dragRef.current) return; dragRef.current = null; try { localStorage.setItem(RATIO_KEY, String(ratio)); } catch (e) { /* 저장 못 해도 화면은 그대로 */ } };
  const resetRatio = () => { setRatio(RATIO_DEF); try { localStorage.setItem(RATIO_KEY, String(RATIO_DEF)); } catch (e) { /* */ } };

  const chip = (cls) => `px-2 py-0.5 rounded-pill text-xxs font-black ${cls}`;

  if (step === 'pick') {
    const cranes = fol.cranes || [];
    //  호기가 비었고 일하는 호기가 하나면 그 호기 자리로 따라간다 — fol 은 «recent»(앱 완료) 폴백이라 앱 완료 0건(항차 첫 작업)이면 비어 있어도 크레인 자리는 안다(감사 지적).
    const canFollow = fol.bay != null || (!equip && cranes.length === 1 && cranes[0].bay != null);
    //  ★ 3.49-02 검수사 «따라가기나 장비번호가 작업중인 베이를 누르면 자동으로 호기가 지정 되어야 하는데 호기 지정 메뉴가 나옵니다»
    //    — 호기(장비)가 비어 있으면 GuidedWorkPanel 이 «작업 장비(호기)를 선택하세요»(equipStep)를 먼저 띄웠다. 호기 단추(«N호기 · BAY …»)를 눌렀으면 그 호기가 곧 내 호기다 —
    //    헤더·작업 보고와 한 벌(localStorage + equipChanged)로 지정하고 들어간다. 따라가기도 호기가 비었는데 지금 일하는 호기가 하나뿐이면 그 호기로 지정한다(둘이면 위 단추로 고른다).
    const assignEquip = (no) => { const n = `${no}호기`; if (!no || equip === n) return; setEquipNumber(n); setEquip(n); window.dispatchEvent(new CustomEvent('equipChanged', { detail: n })); };
    const needEquip = !equip && cranes.length >= 2;   // 실적 0 이면 종전 안내(fol.why)대로 — 누를 호기 단추가 없다
    return (
      <div className="fixed inset-0 z-[45] bg-ink-950 text-ink-100 overflow-auto" data-bayview="pick">
        <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 bg-ink-900 border-b border-line">
          <button onClick={onClose} className="px-2 py-1 rounded-pill bg-ink-800 border border-line text-dim-200 text-xs font-bold">✕ 기존 방식으로</button>
          <span className="text-sm font-black text-violet-200">베이뷰 작업 · {modeLabel}</span>
          <span className="ml-auto text-xxs text-dim-400">{info.vsl || ''} {mode === 'loading' ? (info.voy_l || '') : (info.voy_d || '')}</span>
        </div>
        <div className="p-3 space-y-3 max-w-lg mx-auto">
          <div className="bg-violet-950/60 border-2 border-violet-600 rounded-pill p-3 space-y-2">
            <div className="text-sm font-black text-violet-200">터미널 기준 지금 작업 중인 장</div>
            {cranes.length === 0 && <div className="text-xxs text-dim-300">{fol.why || '터미널 실적이 아직 없습니다'}</div>}
            {cranes.map((c) => (
              <button key={c.no} onClick={() => { assignEquip(c.no); enter({ follow: false, bay: c.bay, tier: c.tier || 'deck', guide: true }); }}
                className={`w-full text-left rounded-pill px-3 py-2 border ${fol.no === c.no ? 'bg-violet-700 border-violet-300 text-white' : 'bg-ink-900 border-line text-dim-100'}`}>
                <div className="flex items-center justify-between"><span className="font-black text-base">{c.no}호기 · {hatchTitleOf(c.bay, pages)}</span><span className="text-xxs">{fmtT(c.at)}{c.mode && c.mode !== mode ? ` · ${c.mode === 'loading' ? '선적' : '양하'} 중` : ''}</span></div>
                <div className="text-xxs">{c.tier === 'hold' ? '🟠 홀드' : c.tier === 'deck' ? '🔵 데크' : '단 미상'}{fol.no === c.no ? ' · 내 호기' : ` · 누르면 ${c.no}호기가 내 호기`} — 이 장으로(자동 가이드)</div>
              </button>
            ))}
            {!equip ? (
              <div className="bg-ink-900 border border-amber-700 rounded-pill p-2">
                <div className="text-xxs font-bold text-amber-300 mb-1">따라가려면 내 호기부터 — {pier || '부두 미상'}</div>
                <div className="flex flex-wrap gap-1.5">
                  {equipList.map((n) => (
                    <button key={n} onClick={() => { setEquipNumber(n); setEquip(n); window.dispatchEvent(new CustomEvent('equipChanged', { detail: n })); }}
                      className="px-3 py-1.5 rounded-pill bg-ink-800 border border-line text-amber-200 text-xs font-bold">{n}</button>
                  ))}
                </div>
              </div>
            ) : null}
            <button onClick={() => { if (!equip && cranes.length === 1) assignEquip(cranes[0].no); enter({ follow: true }); }} disabled={!canFollow || needEquip}
              className="w-full py-2.5 rounded-pill bg-violet-600 disabled:bg-ink-800 disabled:text-dim-500 text-white font-black text-sm">
              ▶ {equip ? `내 호기(${equip}) 따라가기` : (cranes.length === 1 ? `${cranes[0].no}호기 따라가기` : '내 호기 따라가기')} — 자동
            </button>
            <div className="text-2xs text-dim-400">{needEquip ? '호기가 아직 없습니다 — 위 호기 단추를 누르면 그 호기가 내 호기가 됩니다(따라가기는 그 다음).' : (fol.bay == null && canFollow) ? `${cranes[0].no}호기 자리로 따라갑니다 — 누르면 그 호기가 내 호기가 됩니다.` : canFollow ? (fol.why || '터미널 실적이 옮겨 가면 화면도 따라갑니다(동방은 10분 안팎 늦을 수 있습니다).') : (fol.why || '따라갈 자리가 아직 없습니다 — 아래에서 손으로 고르세요.')}</div>
          </div>
          <div className="bg-ink-900 border border-line rounded-pill p-3 space-y-2">
            <div className="text-sm font-black text-amber-300">손으로 고르기 — 베이·단은 다음 화면 위 칸에서</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => enter({ follow: false, guide: true })} className={`py-3 rounded-pill font-black text-sm border ${last && !last.follow && last.guide ? 'bg-violet-700 border-violet-300 text-white' : 'bg-ink-800 border-line text-violet-200'}`}>🤖 자동 가이드</button>
              <button onClick={() => enter({ follow: false, guide: false, twin: false })} className={`py-3 rounded-pill font-black text-sm border ${last && !last.follow && !last.guide && !last.twin ? 'bg-amber-700 border-amber-300 text-white' : 'bg-ink-800 border-line text-amber-200'}`}>✋ 수동 · 싱글</button>
              <button onClick={() => enter({ follow: false, guide: false, twin: true })} className={`py-3 rounded-pill font-black text-sm border col-span-2 ${last && !last.follow && !last.guide && last.twin ? 'bg-blue-700 border-blue-300 text-white' : 'bg-ink-800 border-line text-blue-200'}`}>✋ 수동 · 트윈</button>
            </div>
            <div className="text-2xs text-dim-400">수동은 터미널보다 먼저 찍힙니다. 아래 칸 그림은 검수원 완료와 터미널 실적을 함께 칠하고, 둘이 다르면 빨간 테두리로 알립니다(자동으로 고치지 않습니다).</div>
          </div>
        </div>
      </div>
    );
  }

  const bayViewProps = { presetCtx: preset, onWorkCtxChange: onCtx, compact: true, suppressBayActivity: follow, follow };   // 3.49 follow — 해치커버 자동 판정을 «묻지 않고 적기»로
  return (
    <div ref={boxRef} className="fixed inset-0 z-[45] bg-ink-950 text-ink-100 flex flex-col" data-bayview="view" data-bayview-wide={isWide ? '1' : '0'} style={{ height: '100dvh' }}>
      <div className="h-10 shrink-0 flex items-center gap-1.5 px-2 bg-ink-900 border-b border-line overflow-x-auto whitespace-nowrap">
        <button onClick={() => setStep('pick')} className={chip('bg-ink-800 border border-line text-dim-200')} title="선택 화면으로">◀</button>
        <span className={chip(mode === 'loading' ? 'bg-sky-800 text-sky-100' : 'bg-rose-800 text-rose-100')}>{modeLabel}</span>
        {follow ? <span className={chip('bg-violet-700 text-white')} data-bayview-follow="1">따라가기{fol.no ? ` ${fol.no}호기` : ''}</span>
          : <span className={chip(live.guide ? 'bg-violet-700 text-white' : 'bg-amber-700 text-white')}>{live.guide ? '자동' : (live.twin ? '수동·트윈' : '수동·싱글')}</span>}
        <span className="mono font-black text-amber-300 text-sm" data-bayview-title="1">{bayLabel}</span>
        <button onClick={() => setPreset((p) => ({ seq: ((p && p.seq) || 0) + 1, bay: undefined, tier: bright === 'deck' ? 'hold' : 'deck', guide: null, twin: null }))}
          className={chip(bright === 'hold' ? 'bg-amber-700 text-white' : 'bg-sky-700 text-white')} title="데크 ⇄ 홀드">{bright === 'hold' ? '🟠 홀드' : '🔵 데크'} ⇄</button>
        {(nConf > 0 || nNoTerm > 0) && (
          <button onClick={() => setShowConf((v) => !v)} className={chip(nConf > 0 ? 'bg-red-700 text-white' : 'bg-slate-600 text-white')} data-bayview-conf={String(nConf + nNoTerm)}>
            ⚠ {nConf > 0 ? `불일치 ${nConf}` : ''}{nConf > 0 && nNoTerm > 0 ? ' · ' : ''}{nNoTerm > 0 ? `터미널 미확인 ${nNoTerm}` : ''}
          </button>
        )}
        <button onClick={onClose} className={`ml-auto ${chip('bg-ink-800 border border-line text-dim-200')}`}>✕</button>
      </div>
      {showConf && (
        <div className="shrink-0 max-h-40 overflow-auto bg-red-950/60 border-b border-red-800 px-3 py-2 space-y-1 text-xxs" data-bayview-conflicts="1">
          <div className="font-black text-red-200">검수원 기록과 터미널 실적이 다릅니다 — 실물을 보고 정리하세요(앱이 자동으로 고치지 않습니다). 누르면 컨 상세.</div>
          {overlay.conflicts.map((c) => (
            <button key={`${c.type}|${c.cn}|${c.key}`} onClick={() => { const x = cnMap[c.cn] || cnMap[c.term]; if (x && onOpenContainer) onOpenContainer(x); }}
              className="block w-full text-left px-2 py-1 rounded bg-ink-900/70 border border-line">
              {c.type === 'pos' && <span><span className="mono text-amber-200">{c.cn}</span> — 앱 <span className="mono">{c.app}</span> · 터미널 <span className="mono">{c.term}</span> (같은 컨, 자리 다름)</span>}
              {c.type === 'cell' && <span>자리 <span className="mono">{c.key}</span> — 앱 <span className="mono text-amber-200">{c.app}</span> · 터미널 <span className="mono text-amber-200">{c.term}</span> (같은 자리, 컨 다름)</span>}
              {c.type === 'noterm' && <span><span className="mono text-amber-200">{c.cn}</span> — 검수원이 찍었는데 터미널 실적에 10분 넘게 없음 (끝4 오타인지 실물 확인)</span>}
            </button>
          ))}
        </div>
      )}
      {/* 3.49: 폰은 위(자료)/아래(베이), 넓은 화면은 좌(자료)/우(베이) — 한 트리, 방향만 바뀐다 */}
      <div className={`min-h-0 flex-1 flex ${isWide ? 'flex-row' : 'flex-col'}`}>
      <div className="min-h-0 min-w-0 overflow-auto px-2 py-1.5" style={{ flex: `${ratio} 1 0px` }} data-bayview-top="1">
        <SearchPanel {...searchPanelProps} voyage={voyage} voyageKey={voyageKey} inspector={inspector} mode={mode} onOpenContainer={onOpenContainer} bayView={bayViewProps} />
      </div>
      <div onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp} onDoubleClick={resetRatio}
        className={`shrink-0 flex items-center justify-center bg-ink-800 touch-none select-none ${isWide ? 'w-3.5 border-x border-line cursor-col-resize' : 'h-3.5 border-y border-line cursor-row-resize'}`} title="끌어서 칸 크기 조절 · 두 번 누르면 1/3">
        <div className={isWide ? 'h-12 w-1 rounded bg-dim-500' : 'w-12 h-1 rounded bg-dim-500'} />
      </div>
      <div ref={bottomRef} className="min-h-0 min-w-0 overflow-auto p-1" style={{ flex: `${1 - ratio} 1 0px` }} data-bayview-bottom="1">
        <div className="flex items-center gap-1.5 px-1 text-2xs text-dim-400">
          <span>{follow ? (fol.why || `터미널 ${fmtT(fol.at)} 기준`) : (live.bay != null ? '위 칸에서 고른 장' : (gridBay != null ? '터미널 기준 지금 자리 — 위 칸에서 베이를 고르면 바뀝니다' : '위 칸에서 베이를 고르세요'))}</span>
          <span className="ml-auto">완료 = 앱 ∪ 터미널{overlay.termOnly ? ` (터미널만 ${overlay.termOnly})` : ''}</span>
          <button onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.15).toFixed(2)))} className="px-1.5 rounded bg-ink-800 border border-line text-dim-200">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.15).toFixed(2)))} className="px-1.5 rounded bg-ink-800 border border-line text-dim-200">+</button>
        </div>
        {gridBay != null ? (
          /* 3.49-01 검수사 «컴화면 좌우로 나뉘긴 했는데 베이 화면이 한눈에 안들어 옵니다. 베이가 통째로 들어 오게 하고 트윈일경우 두베이가 같이 보여야 합니다»
               — 원인은 FitBox 가 폭에만 맞춰(높이 상한 없음) 컴(넓은 칸)에서 2.5배까지 키워 밑이 잘린 것 하나다. 칸 바닥(bottomRef)까지의 높이에도 맞춘다(fill) — 그 장의 앞 20ft 베이·(40)뒤 20ft 베이가
               통째로 한눈에(트윈 = 두 베이 같이). 컴에서는 세로 쌓기와 가로 나란히 중 더 크게 그려지는 쪽(layoutPick)을 고른다. 폰은 세로. */
          <FitBox boost={zoom} fill boundsRef={bottomRef}>
            <BayPlan containers={gridContainers} compMap={overlay.compMap} xrayMap={xrayMap} xraySeals={xraySeals} restowMap={shiftingMap} mode={mode}
              preGoneInfo={preGoneInfo} onOpenContainer={onOpenContainer}
              shipImo={info.imo} shipName={info.vsl} voyageInfo={info} voyageKey={voyageKey}
              onlyBay={String(gridBay)} onlyLayout={isWide ? layoutPick : 'col'} compactZoom={0.5} titleOut onTitles={setTitles} brightTier={bright} warnCells={overlay.warnCells} />
          </FitBox>
        ) : (
          <div className="text-xs text-dim-400 text-center py-6">아직 그릴 베이가 없습니다 — 위 칸에서 베이를 고르거나 ◀ 에서 따라가기를 켜세요.</div>
        )}
      </div>
      </div>
    </div>
  );
}
