// V9.22: RZOR 덱 스토우지 플랜 뷰 — RORO/LOLO 혼용선용 덱플랜(차량은 램프로 실어 좌표가 없고 갠트리 적재분만 셀로 보인다) (선사 rzdf 플랜 자동 파싱분)
//   덱 칩 선택 → CSS grid. 셀: 끝4 + 규격, 완료=초록, 리퍼=청록 테두리, 긴급/활어 배지.
//   셀 클릭 → 컨 상세(기존 모달).
import React, { useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import { fbAssignDeckSlot, fbCompleteContainer } from '../firebase.js';
import { isReeferIso, getEquipNumber } from '../utils.js';   // 3.60-10: 리퍼 판정 한 벌 · 3.67-01: 호기(인건비 근거)
import { canWorkNow, workGateText, equipGateText } from '../workChoice.js';   // 3.67-01: 조회만은 보기만 · 호기 없이 완료 금지(컨 상세와 같은 문지기)
import { speakDone } from '../voice.js';

export default function DeckPlanView({ plan, containers = [], compMap = {}, xrayMap = {}, onOpenContainer, voyageKey, mode, inspector, onExport }) {
  const decks = plan?.decks || [];
  const [sel, setSel] = useState(0);
  const [loloOnly, setLoloOnly] = useState(false);   // V9.55: 갠트리(LO/LO) 분만 보기
  const [exporting, setExporting] = useState('');     // 3.67: 엑셀 내보내기 상태('' | '작성 중' | 파일명 | 오류)
  const byCn = useMemo(() => {
    const m = {};
    for (const c of containers) if (c && c.cn) m[c.cn] = c;
    return m;
  }, [containers]);
  if (!decks.length) return null;
  const d = decks[Math.min(sel, decks.length - 1)];
  // ★ 3.67-01 (검수사 2026-09-29 «작업자로 로그인하면 실제 선적을 할수 있어야 합니다») — 자동 덱플랜에서 자리를 찍는 것은 **선적**이다.
  //   자리 확정(assign) + 완료(fbCompleteContainer — 컨 상세 [완료] 와 같은 함수·호기 인자). 문지기도 컨 상세와 같다 —
  //   조회만은 보기만(canWorkNow), 호기 없이 완료 금지(getEquipNumber). 동방 실적 자동 완료(2.30)는 이것과 무관하게 계속 돈다 —
  //   사람이 먼저 찍으면 사람 기록이 남고(터미널은 추가만), 터미널이 먼저면 사람이 찍을 때 사람 기록으로 바뀐다(3.60-09).
  const loadHere = async (slotKey, cn) => {
    if (!voyageKey || !cn) return false;
    if (!canWorkNow()) { alert(workGateText('선적 완료')); return false; }
    if (!getEquipNumber()) { alert(equipGateText()); return false; }
    await fbAssignDeckSlot(voyageKey, mode, slotKey, { cn, by: inspector || '', at: Date.now() });
    const r = await fbCompleteContainer(voyageKey, mode, cn, inspector, 'normal', '', getEquipNumber());
    if (r && r.ok) { try { speakDone(byCn[cn] || { cn }); } catch (e) { /* 음성 없음 */ } }
    return true;
  };
  const conts = d.slots.filter((s) => !s.empty);
  const done = conts.filter((s) => compMap[s.cn]).length;

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
        <span className="ml-auto text-xxs text-dim-300">이 덱 {done}/{conts.length} 완료 · 빈자리 {d.slots.length - conts.length}{plan._gen ? ` · 예측 ${conts.filter((s) => s.pred).length} · 확정 ${conts.filter((s) => s.sure).length}` : ''}</span>
        {/* V9.55: 갠트리(LO/LO) 분만 보기 — 크레인으로 검수하는 건 이것뿐이다 */}
        {(d.lolo > 0) && (
          <button onClick={() => setLoloOnly(!loloOnly)}
            className={`px-2 py-1 rounded text-xxs font-black border ${loloOnly
              ? 'bg-lime-600 border-lime-400 text-lime-50'
              : 'bg-ink-800 border-lime-700/60 text-lime-300'}`}>
            🏗 갠트리 {d.lolo}van{loloOnly ? ' 만 보는 중' : ''}
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
      {/* V9.54: 도면과 같은 방향으로 읽는다 — 줄은 좌현(부두)→우현, 칸은 선미(램프)→선수 */}
      {/* 3.67: 검수사 STOWAGE PLAN(선적)은 위치 1 이 선수다(numbering 'bow'). 그림 방향은 둘 다 왼쪽 선미·오른쪽 선수. */}
      {plan._gen ? (
        <div className="text-2xs text-amber-200/90 mb-1">
          🧭 자동 덱플랜 — 동방 실적 순번으로 자리를 예측했습니다(실적 {plan.seqN || 0}대 · 크레인 {plan.craneN || 0}대). 예측 칸을 누르면 그 자리에 <b>선적</b>(자리 확정 + 완료), 확정 칸을 다시 누르면 자리 해제, 빈자리를 누르면 컨번호를 넣어 선적합니다. 조회만은 보기만, 동방 실적 자동 완료는 그대로 돕니다.
          {Array.isArray(plan.unplaced) && plan.unplaced.length ? <span className="text-red-300"> · 자리를 못 받은 컨 {plan.unplaced.length}대: {plan.unplaced.slice(0, 5).join(' ')}{plan.unplaced.length > 5 ? ' …' : ''}</span> : null}
          {Array.isArray(plan.badAssign) && plan.badAssign.length ? <span className="text-red-300"> · 모르는 자리 키의 확정 {plan.badAssign.length}건은 무시(예측으로 돌림)</span> : null}
        </div>
      ) : null}
      <div className="text-2xs text-dim-400 mb-1">
        ↕ 줄 1~{d.lines || d.rows} <span className="text-dim-500">(1=좌현·부두쪽)</span>
        <span className="mx-2 text-dim-500">|</span>
        ↔ 칸 1~{d.colsN || d.cols} <span className="text-dim-500">{d.numbering === 'bow' ? '(검수사 양식 · 1=선수 → 선미·램프쪽, 오른쪽이 선수)' : '(1=선미·램프쪽 → 선수)'}</span>
      </div>
      <div className="overflow-auto">
        <div className="grid gap-0.5 min-w-[720px]"
             style={{ gridTemplateColumns: `repeat(${d.cols}, minmax(30px, 1fr))`, gridTemplateRows: `repeat(${d.rows}, 58px)` }}>
          {d.slots.map((s, si) => {
            // V9.22-02: 빈자리 — 선적 시 탭해서 컨 지정 (assign 맵), 재탭 해제
            if (s.empty) {
              if (loloOnly) return null;   // V9.55
              // 3.67: 자리 키는 플랜이 준 것(덱-줄-위치, 한 키 = 한 자리)을 먼저 쓴다 — 그림 좌표(ri·ci) 키는 40피트 두 칸과 옆 칸이 겹친다(2차 시뮬 지적)
              const slotKey = s.key || `${d.deck}-${s.ri}-${s.ci}`;
              const asg = plan.assign && plan.assign[slotKey];
              return (
                <button key={`e${si}`}
                  title={s.pos || ''}
                  onClick={async () => {
                    if (!voyageKey) return;
                    if (asg) {
                      if (window.confirm(`${asg.cn} 지정을 해제할까요?`)) await fbAssignDeckSlot(voyageKey, mode, slotKey, null);
                      return;
                    }
                    const q = window.prompt('이 자리에 실을 컨번호(전체 또는 끝 4자리):');
                    if (!q) return;
                    const qq = q.trim().toUpperCase();
                    let cn = qq;
                    if (!/^[A-Z]{4}\d{7}$/.test(qq)) {
                      const hits = containers.filter((c) => c.cn && c.cn.endsWith(qq));
                      if (hits.length === 1) cn = hits[0].cn;
                      else { alert(hits.length ? `끝자리 일치 ${hits.length}건 — 전체 번호로 입력하세요` : '일치하는 컨 없음'); return; }
                    }
                    if (plan._gen) {   // 3.67-01: 자동 덱플랜의 빈자리 지정 = 그 자리에 선적 — 선적 목록에 있는 번호만(감사 지적: 목록 밖 번호가 완료 기록이 되지 않게)
                      if (!byCn[cn]) { alert(`${cn} 은 이 항차 선적 목록에 없습니다 — 실제로 실었으면 컨 상세의 [초과 컨 등록]으로 남겨 주세요.`); return; }
                      await loadHere(slotKey, cn); return;
                    }
                    await fbAssignDeckSlot(voyageKey, mode, slotKey, { cn, by: inspector || '', at: Date.now() });
                  }}
                  className={`rounded-sm border border-dashed text-center overflow-hidden leading-tight
                    ${asg ? 'bg-amber-900/70 border-amber-400' : 'bg-ink-800/40 border-line-strong'}`}
                  style={{ gridColumn: `${s.ci + 1} / span ${s.span}`, gridRow: `${s.ri + 1}` }}>
                  {asg
                    ? <div className="text-2xs font-black mono text-amber-200 truncate">📌{asg.cn.slice(-4)}<div className="text-[8px] text-amber-300/80">{asg.cn.slice(0,4)}</div></div>
                    : <div className="text-3xs text-dim-400">빈자리{s.line ? <div className="text-[8px] mono text-dim-500">{s.line}-{s.col}</div> : null}</div>}
                </button>
              );
            }
            if (loloOnly && !s.lolo) return null;   // V9.55: 갠트리 분만 보기
            const isDone = !!compMap[s.cn];
            const c = byCn[s.cn];   // V9.22-01: 리스트(records) 정보 합류 — 실번호·온도·DG·POD (사용자 요청)
            const fe = (c && (c.fe === 'F' || c.fe === 'E')) ? c.fe : s.fe;
            const isRf = isReeferIso(s.iso) || !!(c && c.rf);   // 3.60-10 (진단 M6): 리퍼 판정 한 벌
            const isDg = !!(c && c.dg);
            const isXray = !!xrayMap[s.cn];
            const tmp = c && c.tmp != null && String(c.tmp).trim() !== '' ? String(c.tmp) : '';
            const sl = c && c.sl ? String(c.sl) : (c && c.eseal ? String(c.eseal) : '');
            const isLug = !!((s.flags && s.flags.includes('LUG')) || (c && c.lugg));   // 2.06-01: 수화물 — 덱 칸도 보라 박스 (검수사 «9220을 찾았는데 보라박스가 없습니다 — C덱에서 입니다»)
            const marks = [isRf ? (tmp ? `❄${tmp}` : '❄') : '', isDg ? '⚠DG' : '',
                           s.flags && s.flags.length ? s.flags.filter((f) => f !== 'LUG').join('·') : ''].filter(Boolean).join(' ');
            // 3.67: 자동 덱플랜 — 예측 칸은 누르면 확정(assign), 확정 칸은 다시 누르면 해제. 올린 플랜(예측 아님)은 종전대로 컨 상세.
            const slotKey = s.key || `${d.deck}-${s.ri}-${s.ci}`;
            const onTap = async () => {
              if (s.pred) {   // 3.67-01: 예측 칸 탭 = 그 자리에 선적(자리 확정 + 완료)
                await loadHere(slotKey, s.cn);
                return;
              }
              if (s.sure) {
                if (!voyageKey) return;
                if (window.confirm(`${s.cn} 자리 확정을 해제할까요? (완료 기록은 그대로 — 완료 취소는 컨 상세에서)`)) await fbAssignDeckSlot(voyageKey, mode, slotKey, null);
                return;
              }
              onOpenContainer?.(c || { cn: s.cn, iso: String(s.iso || '').replace(/\s/g, ''), fe, pos: s.pos, tier: s.tier, row: s.row, bay: s.bay });  /* V9.57(I11): s.iso null 가드 — 플랜에 iso 없는 슬롯 클릭 시 크래시 방지 */
            };
            return (
              <button key={`${s.cn}${s.ri}${s.ci}`}
                title={(s.pred ? '예측 · 누르면 이 자리에 선적 — ' : s.sure ? '확정 · 누르면 자리 해제 — ' : '') + (s.pos || '')}   /* V9.54: 자리 표기 — "D덱 3줄 5칸" · 3.67-01 탭 = 선적 */
                onClick={onTap}
                className={`rounded-sm border text-left px-1 py-0.5 overflow-hidden leading-tight
                  ${s.pred ? 'border-dashed border-amber-400 bg-amber-950/50' : s.sure ? 'bg-amber-900/70 border-amber-400' : isDone ? 'bg-emerald-800/90 border-emerald-500' : fe === 'E' ? 'bg-ink-750/80 border-line-strong' : 'bg-sky-900/80 border-sky-600'}
                  ${isXray ? 'ring-2 ring-yellow-400' : isRf ? 'ring-1 ring-cyan-400' : ''}
                  ${s.lolo ? 'ring-2 ring-lime-400' : ''} ${s.dbl ? 'ring-2 ring-amber-300' : ''}
                  ${isLug ? 'ring-2 ring-violet-400 border-violet-400 bg-violet-900/70' : ''}`}
                style={{ gridColumn: `${s.ci + 1} / span ${s.span}`, gridRow: `${s.ri + 1}` }}>
                <div className="text-2xs font-black mono text-dim-100 truncate">
                  {s.pred ? <span className="text-amber-300">?</span> : null}{s.sure ? <span className="text-amber-200">📌</span> : null}{s.lolo ? <span className="text-lime-300">🏗</span> : null}{s.dbl ? <span className="text-amber-300">⇅</span> : null}{isLug ? <span className="text-violet-300">🧳</span> : null}{isXray ? <span className="bg-yellow-400 text-black px-0.5 rounded-sm font-black">X</span> : null}{s.cn.slice(-4)}{isDone ? ' ✓' : ''}{marks ? <span className="text-cyan-300 font-bold"> {marks}</span> : null}
                </div>
                <div className="text-[8.5px] text-dim-200 truncate">{s.iso} {fe}</div>
                {s.line ? <div className="text-[8px] mono text-dim-300/90 truncate">{s.line}줄 {s.col}칸</div> : null}
                {sl ? <div className="text-[8.5px] mono text-amber-200/90 truncate">🔒{sl}</div> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-3 mt-2 text-2xs text-dim-300 flex-wrap">
        <span><span className="inline-block w-2.5 h-2.5 bg-sky-900 border border-sky-600 rounded-sm mr-1" />풀</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-ink-750 border border-line-strong rounded-sm mr-1" />엠티</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-emerald-800 border border-emerald-500 rounded-sm mr-1" />완료</span>
        <span><span className="inline-block w-2.5 h-2.5 border border-cyan-400 rounded-sm mr-1" />리퍼</span>
        <span><span className="inline-block w-2.5 h-2.5 border-2 border-yellow-400 rounded-sm mr-1" />Ⓧ X-RAY</span>
        <span><span className="inline-block w-2.5 h-2.5 border border-dashed border-line-strong rounded-sm mr-1" />빈자리(탭=지정)</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-amber-900 border border-amber-400 rounded-sm mr-1" />📌지정됨</span>
        <span><span className="inline-block w-2.5 h-2.5 border-2 border-lime-400 rounded-sm mr-1" />🏗갠트리(落地·LO/LO)</span>
        <span><span className="inline-block w-2.5 h-2.5 border-2 border-amber-300 rounded-sm mr-1" />⇅双背(2단)</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-violet-900 border-2 border-violet-400 rounded-sm mr-1" />🧳수화물(이적 아님)</span>
        {plan._gen ? <span><span className="inline-block w-2.5 h-2.5 border border-dashed border-amber-400 rounded-sm mr-1" />?예측(탭=선적)</span> : null}
      </div>
    </div>
  );
}
