// V9.22: RZOR 덱 스토우지 플랜 뷰 — RORO/LOLO 혼용선용 덱플랜(차량은 램프로 실어 좌표가 없고 갠트리 적재분만 셀로 보인다) (선사 rzdf 플랜 자동 파싱분)
//   덱 칩 선택 → 그림. 4.04: 그림은 출력 허브 «카고플랜»(PrintableDeckPlan)과 같은 종이 그림(선사 STOWAGE PLAN · 마감텔리 STOWAGE PLAN)이다 — 서명란·범례줄만 빠진다.
//   셀 클릭 → 컨 상세(기존 모달) · 예측 칸 = 선적 · 빈자리 = 끝자리 조회(종전 동작 그대로).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import { fbAssignDeckSlot, fbCompleteContainer } from '../firebase.js';
import { getEquipNumber, fmtShiftTime } from '../utils.js';   // 3.60-10: 리퍼 판정 한 벌 · 3.67-01: 호기(인건비 근거) · 3.72: 완료 시각(KST HH:MM)
import { canWorkNow, workGateText, equipGateText } from '../workChoice.js';   // 3.67-01: 조회만은 보기만 · 호기 없이 완료 금지(컨 상세와 같은 문지기)
import { speakDone } from '../voice.js';
import { rzorSlotCandidates } from '../rzorDeckPredict.js';   // 3.70: 빈자리 조회 후보 한 벌
import { buildPrintModel, deckKeyOf } from '../rzorPrintModel.js';   // 4.04: 화면 그림도 출력과 같은 모델 한 벌
import { PageView, DP_BASE_CSS, deckPlanDate } from './PrintableDeckPlan.jsx';
import { SPECIAL_FILL } from './PrintableCargoPlanV2.jsx';

const FRESH_MS = 10 * 60 * 1000;   // 3.72: 완료 10분 안 = «방금» — ✓ 배지가 깜박이고 «최근 양하» 줄 칩이 밝은 초록이다
//  폰 시계와 터미널 시각이 어긋나도(느리거나 앞서도) «방금» 판정이 한쪽으로 치우치지 않게 차이의 절댓값으로 잰다.
const isFresh = (now, at) => !!at && Math.abs(now - at) < FRESH_MS;

const ZOOM_W = { fit: '100%', big: '1500px', huge: '2200px' };   // 4.04: 폰은 «크게»로 시작 — 그림이 A4 한 장이라 줄이면 글자가 안 읽힌다
const ZOOM_LABEL = { fit: '맞춤', big: '크게', huge: '아주 크게' };

export default function DeckPlanView({ plan, containers = [], compMap = {}, xrayMap = {}, onOpenContainer, voyageKey, mode, inspector, onExport, nowMs: nowProp = 0, termWork = {}, voyageInfo = null }) {
  const decks = plan?.decks || [];
  const [sel, setSel] = useState(0);
  //  ★ 3.72 — 지금 시각(30초마다 다시 그려 10분이 지난 «방금» 표식을 끈다). nowMs prop 은 연막검사가 시각을 고정하는 자리.
  const [tickNow, setTickNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setTickNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const now = nowProp || tickNow;
  //  «최근 양하» — 이 덱플랜의 칸 중 완료 시각(at)이 있는 컨을 늦은 순 6대. 칸을 눌러 보지 않고도 지금 어디가 내려지고 있는지 본다.
  const recent = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const dk of (plan?.decks || [])) for (const x of (dk.slots || [])) {
      if (x.empty || !x.cn || seen.has(x.cn)) continue;
      const r = compMap[x.cn];
      const at = r && Number(r.at) > 0 ? Number(r.at) : 0;
      if (!at) continue;
      seen.add(x.cn);
      out.push({ cn: x.cn, at, deck: dk.deck, pos: x.pos || '', iso: x.iso, fe: x.fe });
    }
    return out.sort((a, b) => b.at - a.at).slice(0, 6);
  }, [plan, compMap]);
  const [loloOnly, setLoloOnly] = useState(false);   // V9.55: 갠트리(LO/LO) 분만 보기
  const [exporting, setExporting] = useState('');     // 3.67: 엑셀 내보내기 상태('' | '작성 중' | 파일명 | 오류)
  const byCn = useMemo(() => {
    const m = {};
    for (const c of containers) if (c && c.cn) m[c.cn] = c;
    return m;
  }, [containers]);
  //  ★ 3.70 — 빈자리 조회창. 검수사 2026-09-30 «빈덱에서 빈곳을 클릭하면 컨번호 조회가 되게하고 조회후 컨을 선택할수 있게» ·
  //    «2대 이상 맞으면 맞는거 다 보여주고 고르게 해야 빠릅니다». 종전(3.67-01) 브라우저 입력창은 2대 이상 맞으면 «전체 번호로» 막았다.
  const [pick, setPick] = useState(null);     // {slotKey, pos, sz} — 누른 빈자리
  const [pq, setPq] = useState('');           // 조회 입력(끝자리)
  const [pbusy, setPbusy] = useState(false);
  const [perr, setPerr] = useState('');
  const pickSeq = useRef(0);                  // 창을 열고 닫을 때마다 +1 — 저장이 늦게 끝나도 새로 연 창을 닫거나 거기에 적지 않게
  //  이미 자리가 있는 컨(자동 덱플랜의 확정 📌 · 올린 덱플랜의 칸 · 올린 덱플랜의 지정 📌)은 빼지 않고 «그 자리에 있음» 으로 잠가 보인다
  //  (감사 지적 — 조용히 빠지면 목록에 있는 컨인데 «맞는 컨이 없습니다» 로 보였다). 예측(?) 컨은 고를 수 있고 예측 자리를 같이 보여 준다.
  //  자동 덱플랜의 확정은 그림의 확정 칸(sure)만 센다 — 모르는 자리 키(badAssign)로 확정된 컨은 빌더가 예측으로 돌리거나 그림에서 뺐으므로
  //  후보로 남아야 다시 실을 수 있다(감사 지적).
  const { placedAt, predPos } = useMemo(() => {
    const at = {}; const pp = {}; const keyPos = {};
    const gen = !!(plan && plan._gen);
    for (const dk of decks) for (const x of (dk.slots || [])) {
      keyPos[x.key || `${dk.deck}-${x.ri}-${x.ci}`] = x.pos || '';
      if (x.empty || !x.cn) continue;
      const cn = String(x.cn).toUpperCase();
      if (gen && x.pred) pp[cn] = x.pos || '';
      else at[cn] = { pos: x.pos || '', how: gen ? 'sure' : 'plan' };
    }
    if (!gen) for (const [k, v] of Object.entries((plan && plan.assign) || {})) if (v && v.cn) at[String(v.cn).toUpperCase()] = { pos: keyPos[k] || '', how: 'asg' };
    return { placedAt: at, predPos: pp };
  }, [decks, plan]);
  const hits = useMemo(() => (pick ? rzorSlotCandidates({ containers, q: pq, placedAt, compMap, predPos }) : []), [pick, pq, containers, placedAt, compMap, predPos]);
  const freeHits = hits.filter((h) => !h.locked);
  //  ★ 4.04 — 화면 그림 = 출력과 같은 모델(buildPrintModel) 한 벌. 칸·집계·LOLO 구역이 화면과 종이에서 갈리지 않는다.
  const [zoom, setZoom] = useState(() => (typeof window !== 'undefined' && window.innerWidth >= 900 ? 'fit' : 'big'));
  const vinfo = voyageInfo || {};
  const model = useMemo(
    () => buildPrintModel({ plan, containers, xrayMap, termWork, vsl: vinfo.vslFull || 'RIZHAO ORIENT', date: deckPlanDate(vinfo), mode }),
    [plan, containers, xrayMap, termWork, vinfo.vslFull, vinfo.planDate, mode]);
  if (!decks.length) return null;
  const d = decks[Math.min(sel, decks.length - 1)];
  const pg = model.pages.find((p) => p.deck === deckKeyOf(d)) || null;
  const zoneN = pg && pg.zone ? pg.zone.count : 0;   // LOLO 구역 대수 — 덱플랜 파일의 lolo 표시와 무관하게 «고정 구역» 규칙으로 센다
  const loloActive = loloOnly && !!(pg && pg.zone);   // 다른 덱으로 옮겨도 «갠트리만 보기» 가 켜진 채 그림이 사라지지 않게
  // ★ 3.67-01 (검수사 2026-09-29 «작업자로 로그인하면 실제 선적을 할수 있어야 합니다») — 자동 덱플랜에서 자리를 찍는 것은 **선적**이다.
  //   자리 확정(assign) + 완료(fbCompleteContainer — 컨 상세 [완료] 와 같은 함수·호기 인자). 문지기도 컨 상세와 같다 —
  //   조회만은 보기만(canWorkNow), 호기 없이 완료 금지(getEquipNumber). 동방 실적 자동 완료(2.30)는 이것과 무관하게 계속 돈다 —
  //   사람이 먼저 찍으면 사람 기록이 남고(터미널은 추가만), 터미널이 먼저면 사람이 찍을 때 사람 기록으로 바뀐다(3.60-09).
  const loadHere = async (slotKey, cn) => {
    if (!voyageKey || !cn) return false;
    if (!canWorkNow()) { alert(workGateText('선적 완료')); return false; }
    if (!getEquipNumber()) { alert(equipGateText()); return false; }
    await fbAssignDeckSlot(voyageKey, mode, slotKey, { cn, by: inspector || '', at: Date.now() });
    let r;
    try { r = await fbCompleteContainer(voyageKey, mode, cn, inspector, 'normal', '', getEquipNumber()); }
    catch (e) {   // 3.70: 자리는 이미 확정됐다 — 반쪽 상태를 그대로 말한다(감사 지적 — 그 컨은 후보에서 잠겨 조회창으로는 다시 못 한다)
      const x = new Error(`자리는 확정됐고 완료 기록만 실패했습니다(${(e && e.message) || e}) — 컨 상세에서 [완료]를 다시 눌러 주세요.`);
      x.viewOnly = !!(e && e.viewOnly);
      throw x;
    }
    if (r && r.ok) { try { speakDone(byCn[cn] || { cn }); } catch (e) { /* 음성 없음 */ } }
    return true;
  };
  const openPick = (p) => { pickSeq.current += 1; setPick(p); setPq(''); setPerr(''); setPbusy(false); };
  const closePick = () => { pickSeq.current += 1; setPick(null); setPq(''); setPerr(''); setPbusy(false); };
  //  고르면 — 자동 덱플랜은 그 자리에 선적(loadHere: 문지기 → 자리 확정 → 완료, 예측 칸 탭과 같은 길), 올린 덱플랜은 종전대로 자리만 지정.
  //  ⚠ 조용히 실패하지 않는다 — 쓰기 문지기(조회만)가 막거나 저장이 실패하면 창 안에 적는다(§4-3). 저장 중에 창을 닫았으면 알림으로 알린다(감사 지적).
  const choosePick = async (h) => {
    if (!pick || !h || h.locked || pbusy) return;
    const seq = pickSeq.current;
    const still = () => pickSeq.current === seq;   // 같은 창이 아직 열려 있나
    setPbusy(true); setPerr('');
    try {
      if (plan._gen) { const ok = await loadHere(pick.slotKey, h.cn); if (still()) { if (ok) closePick(); else setPbusy(false); } return; }
      if (!voyageKey) { setPbusy(false); return; }
      if (!canWorkNow()) { setPerr(workGateText('자리 지정')); setPbusy(false); return; }
      await fbAssignDeckSlot(voyageKey, mode, pick.slotKey, { cn: h.cn, by: inspector || '', at: Date.now() });
      if (still()) closePick();
    } catch (e) {
      console.error('[3.70] 빈자리 선택 실패', e);
      const msg = e && e.viewOnly ? workGateText(plan._gen ? '선적 완료' : '자리 지정') : `${h.cn} 저장 실패 — ${(e && e.message) || e}`;
      if (still()) { setPerr(msg); setPbusy(false); } else alert(msg);
    }
  };
  const modeWord = mode === 'discharge' ? '양하' : '선적';
  const conts = d.slots.filter((s) => !s.empty);
  const done = conts.filter((s) => compMap[s.cn]).length;
  //  3.72: 배 전체 진행 — 덱마다 칩에 n/m 이 있지만 «지금 몇 대 남았나» 는 한 줄로 본다.
  const allConts = decks.reduce((n, dk) => n + dk.slots.filter((s) => !s.empty).length, 0);
  const allDone = decks.reduce((n, dk) => n + dk.slots.filter((s) => !s.empty && compMap[s.cn]).length, 0);

  return (
    <div className="bg-ink-900 border border-line rounded-pill p-3 mb-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-sm font-black text-cyan-200 flex items-center gap-1">
          <Layers className="w-4 h-4" /> 덱 플랜{plan.voy ? ` · ${plan.voy}` : ''}
        </span>
        {decks.map((dk, i) => (
          <button key={dk.deck} onClick={() => setSel(i)}
            className={`px-2.5 py-1 rounded text-xs font-black ${i === sel ? 'bg-cyan-600 text-cyan-50' : 'bg-ink-800 text-dim-200'}`}>
            {dk.deck}덱 {dk.slots.filter((s) => !s.empty && compMap[s.cn]).length}/{dk.slots.filter((s) => !s.empty).length}
          </button>
        ))}
        <span className="ml-auto text-xxs text-dim-300">이 덱 {done}/{conts.length} 완료 · 남음 {conts.length - done} · 덱플랜 전체 {allDone}/{allConts} · 빈자리 {d.slots.filter((s) => s.empty && !s.xcell).length}{plan._gen ? ` · 예측 ${conts.filter((s) => s.pred).length} · 확정 ${conts.filter((s) => s.sure).length}` : ''}</span>
        {/* V9.55: 갠트리(LO/LO) 분만 보기 — 크레인으로 검수하는 건 이것뿐이다 */}
        {(zoneN > 0) && (
          <button onClick={() => setLoloOnly(!loloOnly)}
            className={`px-2 py-1 rounded text-xxs font-black border ${loloActive
              ? 'bg-lime-600 border-lime-400 text-lime-50'
              : 'bg-ink-800 border-lime-700/60 text-lime-300'}`}>
            🏗 갠트리 {zoneN}van{loloActive ? ' 만 보는 중' : ''}
          </button>
        )}
        {/* 3.67: 선적 덱플랜 → 검수사 STOWAGE PLAN 엑셀(마감텔리 양식). 예측 자리는 회색 글씨로 나간다. */}
        {onExport ? (
          <button onClick={async () => {
              if (exporting === '작성 중') return;
              setExporting('작성 중');
              try { const name = await onExport(plan); setExporting(name ? `저장: ${name}` : ''); }
              catch (e) { console.error('[3.67] STOWAGE PLAN 엑셀 실패', e); setExporting(`오류: ${e?.message || e}`); }
            }}
            className="px-2 py-1 rounded text-xxs font-black border bg-ink-800 border-cyan-700/60 text-cyan-200">
            📄 STOWAGE PLAN 엑셀{exporting === '작성 중' ? ' … 작성 중' : ''}
          </button>
        ) : null}
        {exporting && exporting !== '작성 중' ? <span className={`text-2xs ${exporting.startsWith('오류') ? 'text-red-300' : 'text-dim-300'}`}>{exporting}</span> : null}
      </div>
      {/* 3.72: 검수사 2026-09-30 «RZOR 양하시 실시간으로 덱플랜에서 확인할수 있게 … 지금은 클릭해야 양하 되었는지 안되었는지 알수 있습니다» — 눌러 보지 않고도 지금 어디까지 내렸는지 */}
      {recent.length ? (
        <div data-recent="1" className="flex items-center gap-1 mb-2 flex-wrap text-2xs text-emerald-200">
          <span className="font-black">🟢 최근 {modeWord}</span>
          {recent.map((r) => (
            <button key={r.cn} onClick={() => onOpenContainer?.(byCn[r.cn] || { cn: r.cn, iso: String(r.iso || '').replace(/\s/g, ''), fe: r.fe, pos: r.pos })}
              title={r.pos || `${r.deck}덱`}
              className={`px-1.5 py-0.5 rounded border mono font-black ${isFresh(now, r.at) ? 'bg-emerald-600 border-emerald-300 text-emerald-50' : 'bg-ink-800 border-emerald-700 text-emerald-200'}`}>
              {r.cn.slice(-4)} <span className="font-normal">{r.deck} {fmtShiftTime(r.at)}</span>
            </button>
          ))}
        </div>
      ) : null}
      {plan._gen ? (
        <div className="text-2xs text-amber-200/90 mb-1">
          🧭 자동 덱플랜 — 동방 실적 순번으로 자리를 예측했습니다(실적 {plan.seqN || 0}대 · 크레인 {plan.craneN || 0}대). 예측 칸을 누르면 그 자리에 <b>선적</b>(자리 확정 + 완료), 확정 칸을 다시 누르면 자리 해제, 빈자리를 누르면 컨번호 끝자리로 찾아 맞는 컨 중에서 골라 선적합니다. 조회만은 보기만, 동방 실적 자동 완료는 그대로 돕니다.
          {Array.isArray(plan.unplaced) && plan.unplaced.length ? <span className="text-red-300"> · 자리를 못 받은 컨 {plan.unplaced.length}대: {plan.unplaced.slice(0, 5).join(' ')}{plan.unplaced.length > 5 ? ' …' : ''}</span> : null}
          {Array.isArray(plan.badAssign) && plan.badAssign.length ? <span className="text-red-300"> · 모르는 자리 키의 확정 {plan.badAssign.length}건은 무시(예측으로 돌림)</span> : null}
        </div>
      ) : null}
      <div className="flex items-center gap-2 mb-1 flex-wrap text-2xs text-dim-400">
        <span>↕ 줄 1~{d.lines || d.rows} <span className="text-dim-500">(1=좌현·부두쪽)</span></span>
        <span className="text-dim-500">|</span>
        <span>↔ 칸 1~{d.colsN || d.cols} <span className="text-dim-500">{d.numbering === 'bow' ? '(검수사 양식 · 1=선수 → 선미·램프쪽, 오른쪽이 선수)' : `(1=선미·램프쪽 → 선수${pg && pg.colAxis ? ', 그림 위·아래 숫자' : ''})`}</span></span>
        <span className="ml-auto flex items-center gap-1">
          <span className="text-dim-500">크기</span>
          {Object.keys(ZOOM_W).map((k) => (
            <button key={k} onClick={() => setZoom(k)} data-zoom={k}
              className={`px-2 py-0.5 rounded text-xxs font-black ${zoom === k ? 'bg-cyan-600 text-cyan-50' : 'bg-ink-800 text-dim-200'}`}>{ZOOM_LABEL[k]}</button>
          ))}
        </span>
      </div>
      {pg ? (
        <div className="overflow-auto rounded-sm bg-white" data-deckplan-screen="1">
          <style>{DP_BASE_CSS}</style>
          <div style={{ width: ZOOM_W[zoom] }}>
            <PageView pg={pg} model={model} bw={false} isFirst={model.pages[0] === pg} isLast={model.pages[model.pages.length - 1] === pg}
              screen={{
                //  칸의 눌림·완료·확정 표시 — 종전 칸 색(초록=완료 · 노랑=확정 · 점선=예측)과 같은 판정
                cellState: (c) => {
                  const s = c.slot;
                  const isDone = !!compMap[s.cn];
                  const showDone = isDone && !s.pred && !s.sure;   // 예측(?)·확정(📌) 칸은 자기 색이 우선 — 완료는 모서리 ✓ 만
                  const dnAt = showDone && Number(compMap[s.cn].at) > 0 ? Number(compMap[s.cn].at) : 0;
                  return { done: showDone, fresh: isFresh(now, dnAt), tick: isDone && !showDone, sure: !!s.sure, dim: loloActive && !c.lolo };
                },
                titleOf: (c) => {
                  const s = c.slot;
                  const cc = byCn[s.cn];
                  return [(s.pred ? '예측 · 누르면 이 자리에 선적 — ' : s.sure ? '확정 · 누르면 자리 해제 — ' : '') + (s.pos || ''), s.cn, `${String(s.iso || '').trim()} ${(cc && (cc.fe === 'F' || cc.fe === 'E')) ? cc.fe : (s.fe || '')}`.trim(), cc && cc.tmp != null && String(cc.tmp).trim() !== '' ? `온도 ${cc.tmp}` : ''].filter(Boolean).join(' · ');   // V9.54 자리 표기 · 3.67-01 탭 = 선적
                },
                onCell: async (c) => {
                  const s = c.slot;
                  const cc = byCn[s.cn];   // V9.22-01: 리스트(records) 정보 합류
                  const fe = (cc && (cc.fe === 'F' || cc.fe === 'E')) ? cc.fe : s.fe;
                  const slotKey = s.key || `${d.deck}-${s.ri}-${s.ci}`;
                  // 3.67: 자동 덱플랜 — 예측 칸은 누르면 확정(assign), 확정 칸은 다시 누르면 해제. 올린 플랜(예측 아님)은 종전대로 컨 상세.
                  if (s.pred) {   // 3.67-01: 예측 칸 탭 = 그 자리에 선적(자리 확정 + 완료)
                    try { await loadHere(slotKey, s.cn); }
                    catch (e) { console.error('[3.70] 예측 칸 선적 실패', e); alert(e && e.viewOnly ? workGateText('선적 완료') : `${s.cn} 저장 실패 — ${(e && e.message) || e}`); }   // 3.70 감사: 조용히 실패하지 않는다
                    return;
                  }
                  if (s.sure) {
                    if (!voyageKey) return;
                    if (window.confirm(`${s.cn} 자리 확정을 해제할까요? (완료 기록은 그대로 — 완료 취소는 컨 상세에서)`)) await fbAssignDeckSlot(voyageKey, mode, slotKey, null);
                    return;
                  }
                  onOpenContainer?.(cc || { cn: s.cn, iso: String(s.iso || '').replace(/\s/g, ''), fe, pos: s.pos, tier: s.tier, row: s.row, bay: s.bay });  /* V9.57(I11): s.iso null 가드 — 플랜에 iso 없는 슬롯 클릭 시 크래시 방지 */
                },
                emptyState: (e) => {
                  const s = e.slot;
                  const slotKey = s.key || `${d.deck}-${s.ri}-${s.ci}`;
                  return { asg: (plan.assign && plan.assign[slotKey]) || null, dim: loloActive && !e.z };
                },
                emptyTitle: (e) => {
                  const s = e.slot;
                  const slotKey = s.key || `${d.deck}-${s.ri}-${s.ci}`;
                  const asg = plan.assign && plan.assign[slotKey];
                  if (asg) return `📌 ${asg.cn} 지정됨 · 누르면 해제 — ${s.pos || ''}`;
                  return (s.xcell ? `${s.pos || ''} · 옆 ${s.xOf} 40피트의 X 칸` : (s.pos || '')) + ' · 누르면 컨번호로 찾아 지정';
                },
                onEmpty: async (e) => {
                  const s = e.slot;
                  // V9.22-02: 빈자리 — 선적 시 탭해서 컨 지정 (assign 맵), 재탭 해제
                  // 3.67: 자리 키는 플랜이 준 것(덱-줄-위치, 한 키 = 한 자리)을 먼저 쓴다 — 그림 좌표(ri·ci) 키는 40피트 두 칸과 옆 칸이 겹친다(2차 시뮬 지적)
                  const slotKey = s.key || `${d.deck}-${s.ri}-${s.ci}`;
                  const asg = plan.assign && plan.assign[slotKey];
                  if (!voyageKey) return;
                  if (asg) {
                    if (window.confirm(`${asg.cn} 지정을 해제할까요?`)) await fbAssignDeckSlot(voyageKey, mode, slotKey, null);
                    return;
                  }
                  //  3.70: 브라우저 입력창 대신 앱 조회창 — 끝자리로 찾고, 맞는 컨을 다 보여 주고 고른다(목록 밖 번호는 후보에 없다 — 3.67-01 감사 지적 그대로).
                  openPick({ slotKey, pos: s.pos || `${d.deck}덱 ${s.line || ''}줄 ${s.col || ''}칸`, sz: s.sz || '', xOf: s.xcell ? s.xOf : '' });
                },
              }} />
          </div>
        </div>
      ) : <div className="text-xs text-red-300">이 덱의 그림을 만들지 못했습니다.</div>}
      <div className="flex gap-x-3 gap-y-1 mt-2 text-2xs text-dim-300 flex-wrap items-center">
        {['DG', 'RF', 'FR', 'OT', 'TK'].map((k) => (
          <span key={k}><span className="inline-block w-2.5 h-2.5 border border-black rounded-sm mr-1 align-middle" style={{ background: SPECIAL_FILL[k] }} />{k}</span>
        ))}
        <span className="text-dim-500">칸 아래 글자 = 특수화물 · F=풀 E=엠티</span>
        <span><span className="text-red-500 font-black mr-0.5">★</span>X-RAY</span>
        <span><span className="inline-block w-2.5 h-2.5 border-2 border-violet-600 bg-white rounded-sm mr-1 align-middle" />🧳수화물(LUG)</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-emerald-300 border border-emerald-700 rounded-sm mr-1 align-middle" />완료 ✓(10분 안은 ✓ 깜박)</span>
        <span><span className="inline-block w-2.5 h-2.5 border-2 border-black rounded-sm mr-1 align-middle" />🏗LOLO 구역(굵은 선)</span>
        <span><span className="inline-block w-2.5 h-2.5 border border-dashed border-line-strong rounded-sm mr-1 align-middle" />빈자리(탭=찾아 고르기)</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-amber-200 border border-amber-700 rounded-sm mr-1 align-middle" />📌지정됨</span>
        <span>⇅ 双背(2단)</span>
        {plan._gen ? <span><span className="inline-block w-2.5 h-2.5 border border-dashed border-amber-600 bg-white rounded-sm mr-1 align-middle" />?예측(탭=선적)</span> : null}
        {plan._gen ? <span>X = 옆 40피트 칸</span> : null}
      </div>
      {pick ? (
        //  ★ 3.70 빈자리 조회창 — 끝자리를 치면 맞는 컨이 다 나온다(안 실은 컨 먼저). 하나를 누르면 그 자리에 싣는다. Enter 는 한 대만 맞을 때만.
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-3" onClick={closePick}>
          <div className="bg-ink-900 border border-line rounded-pill w-full max-w-md p-3 mt-16 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-black text-cyan-200">📍 {pick.pos}</span>
              {pick.sz ? <span className="text-2xs text-dim-300">{pick.sz}피트 자리</span> : null}
              <button onClick={closePick} className="ml-auto px-2 py-0.5 rounded text-xs font-black bg-ink-800 text-dim-200">닫기</button>
            </div>
            <div className="text-2xs text-dim-300 mb-2">{plan._gen ? '컨을 누르면 이 자리에 선적합니다(자리 확정 + 완료).' : '컨을 누르면 이 자리에 지정합니다.'}</div>
            {pick.xOf ? <div className="text-xs text-amber-300 mb-2">⚠ 옆 {pick.xOf} 40피트가 덮는 X 칸입니다 — 실물에서 이 칸에 컨을 따로 실었을 때만 고르세요.</div> : null}
            <input autoFocus inputMode="numeric" value={pq} disabled={pbusy}
              onChange={(e) => { setPq(e.target.value); setPerr(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && freeHits.length === 1) choosePick(freeHits[0]); }}
              placeholder="컨번호 끝자리 (예: 9765)"
              className="w-full px-3 py-2 rounded bg-ink-800 border border-line-strong text-base mono text-dim-100 mb-2" />
            {pbusy ? <div className="text-xs text-amber-200 mb-2">저장 중… 신호가 약하면 걸릴 수 있습니다 — 창을 닫아도 저장은 이어집니다.</div> : null}
            {perr ? <div className="text-xs text-red-300 whitespace-pre-line mb-2">{perr}</div> : null}
            {!containers.some((c) => c && c.cn && !String(c.cn).startsWith('__')) ? (
              <div className="text-xs text-amber-200">{modeWord} 리스트가 아직 없습니다 — 리스트가 오면 여기서 찾을 수 있습니다.</div>
            ) : String(pq || '').replace(/[^A-Za-z0-9]/g, '').length < 2 ? (
              <div className="text-2xs text-dim-400">끝자리를 두 자 이상 넣으면 맞는 컨이 다 나옵니다.</div>
            ) : !hits.length ? (
              <div className="text-xs text-dim-300">맞는 컨이 없습니다{/^[A-Za-z]{4}\d{7}$/.test(String(pq).replace(/[^A-Za-z0-9]/g, '')) ? ` — 이 항차 ${modeWord} 목록에 없는 번호입니다.` : '.'}</div>
            ) : (
              <div className="max-h-[50vh] overflow-auto flex flex-col gap-1">
                <div className="text-2xs text-dim-400">맞는 컨 {hits.length}대{freeHits.length > 1 ? ' — 하나를 고르세요' : ''}</div>
                {hits.map((h) => {
                  const c = h.c || {};
                  const wt = c.wt != null && String(c.wt).trim() !== '' && Number.isFinite(Number(c.wt)) ? `${(Number(c.wt) / 1000).toFixed(1)}t` : '';
                  const pod = String(c.pod || c.podFinal || '').replace(/^KR/, '');
                  const mism = pick.sz && h.sz && ((pick.sz === '20') !== (h.sz === '20'));
                  //  잠근 후보(이미 자리가 있음) — 누를 수 없고, 옮기려면 그 칸을 눌러 해제하라고 적는다(올린 덱플랜의 칸은 해제가 없어 자리만 알린다)
                  const lockTxt = h.locked ? (h.at.how === 'plan' ? `덱플랜 ${h.at.pos || '다른 자리'}에 있음` : `${h.at.pos || '다른 자리'}에 ${h.at.how === 'asg' ? '지정됨' : '확정됨'} — 옮기려면 그 칸을 눌러 해제`) : '';
                  const note = [h.done ? '완료됨' : '', h.pred ? `예측 자리 ${h.pred}` : '', lockTxt].filter(Boolean).join(' · ');
                  return (
                    <button key={h.cn} disabled={pbusy || h.locked} onClick={() => choosePick(h)}
                      className={`text-left px-2 py-1.5 rounded border ${h.locked ? 'bg-ink-900 border-line text-dim-500 opacity-60' : h.done ? 'bg-ink-800/60 border-line text-dim-300' : 'bg-sky-950/60 border-sky-700 text-dim-100'}`}>
                      <div className="flex items-baseline gap-2">
                        <span className="mono text-sm">{h.cn.slice(0, -4)}<b className="text-amber-200">{h.cn.slice(-4)}</b></span>
                        <span className="text-2xs">{h.sz ? `${h.sz}피트` : ''}{h.rf ? ' 리퍼' : ''} {h.fe}{wt ? ` · ${wt}` : ''}{pod ? ` · ${pod}` : ''}</span>
                      </div>
                      <div className="text-2xs text-dim-400">
                        {note}{note && mism && !h.locked ? ' · ' : ''}{mism && !h.locked ? <span className="text-amber-300">⚠ 자리 {pick.sz}피트 · 컨 {h.sz}피트</span> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
