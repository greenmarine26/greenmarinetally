// 4.04: RZOR 덱플랜 출력 — 출력 허브 «카고플랜»에서 RZOR 는 베이 매트릭스 대신 이 화면이 열린다. 선사 STOWAGE PLAN(양하) · 검수사 마감텔리 STOWAGE PLAN(선적) 종이 모양 그대로.
//   · 컬러/흑백은 카고플랜과 같은 단추·같은 기억(localStorage cpv2_bw). 컬러 = 특수화물 칸 바탕색(카고플랜 SPECIAL_FILL 한 벌), 흑백 = 바탕색 없음. ★ X-RAY 는 두 쪽 다 빨강.
//   · LOLO 구역(D 덱 10~15칸)은 구역 전체를 굵은 선으로 두른다 — 터미널 크레인 베이(22)로 작업한 확장 칸(49·67대)도 같이.
//   · 인쇄 · PDF(인쇄 창에서 PDF 로 저장) · Excel(onExcel — 선적은 마감텔리 PLAN.xlsx 양식).
import React, { useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildPrintModel, PAGE, CARRIER_SIGN_Y, CHECKER_SIGN_Y } from '../rzorPrintModel.js';
import { SPECIAL_FILL } from './PrintableCargoPlanV2.jsx';

const FONT = "Arial, Helvetica, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";

export const DP_BASE_CSS = `
.dp-svg { display: block; width: 100%; height: auto; font-family: ${FONT}; }
.dp-svg text { fill: #000; }
.dp-cell { fill: #fff; stroke: #000; stroke-width: .8; }
.dp-cell.carrier { stroke-width: .9; }
.dp-cell.lug { stroke: #7c3aed; stroke-width: 2.2; }
.dp-cell.sp-DG { fill: ${SPECIAL_FILL.DG}; } .dp-cell.sp-RF { fill: ${SPECIAL_FILL.RF}; } .dp-cell.sp-FR { fill: ${SPECIAL_FILL.FR}; }
.dp-cell.sp-OT { fill: ${SPECIAL_FILL.OT}; } .dp-cell.sp-TK { fill: ${SPECIAL_FILL.TK}; }
.dp-pred text { fill: #808080; }
.dp-empty { fill: none; stroke: #bdbdbd; stroke-width: .6; stroke-dasharray: 2 2; }
.dp-empty.carrier { fill: #fff; stroke: #000; stroke-width: .9; stroke-dasharray: none; }
.dp-halo { paint-order: stroke; stroke: #fff; stroke-width: 3.5px; stroke-linejoin: round; }
.dp-zone { fill: none; stroke: #000; stroke-width: 2.8; stroke-linecap: square; stroke-linejoin: miter; }
.dp-hull { fill: none; stroke: #000; stroke-width: 1.6; }
.dp-hatchfill, .dp-grayfill { stroke: none; }
.dp-artline { fill: none; stroke: #000; stroke-width: .8; }
.dp-bar { stroke: #000; stroke-width: 3.4; }
.dp-tb { fill: #fff; stroke: #000; stroke-width: .8; }
.dp-xray { fill: #dc2626 !important; }
.dp-bw .dp-cell { fill: #fff !important; }
.dp-bw .dp-cell.lug { stroke: #000; stroke-width: 2.4; }
.dp-click { cursor: pointer; }
.dp-click:focus { outline: none; }
.dp-click:focus-visible .dp-cell, .dp-click:focus-visible .dp-empty { stroke: #2563eb; stroke-width: 2.6; }
.dp-cell.done { fill: #86efac; }
.dp-cell.sure { fill: #fde68a; stroke: #b45309; }
.dp-cell.predscr { stroke: #b45309; stroke-dasharray: 3 2; }
.dp-empty.asg { fill: #fde68a; stroke: #b45309; stroke-dasharray: none; }
.dp-svg .dp-ok { fill: #047857; font-weight: 700; }
.dp-pulse { animation: dp-pulse 1.1s ease-in-out infinite; }
@keyframes dp-pulse { 50% { opacity: .25; } }
.dp-dim { opacity: .18; }
@media (prefers-reduced-motion: reduce) { .dp-pulse { animation: none; } }
`;

const DP_PRINT_CSS = `
.dp-overlay { position: fixed; inset: 0; z-index: 60; background: #475569; overflow: auto; padding: 8px; -webkit-overflow-scrolling: touch; }
.dp-sheet { width: min(100%, 1180px); margin: 0 auto 10px; background: #fff; box-shadow: 0 0 8px rgba(0,0,0,.3); }
@media print {
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  body > *:not(.dp-overlay) { display: none !important; }
  .dp-overlay { position: static !important; background: #fff !important; padding: 0 !important; overflow: visible !important; }
  .dp-noprint { display: none !important; }
  .dp-sheet { width: 285mm !important; height: 198mm !important; margin: 0 !important; box-shadow: none !important; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; overflow: hidden; }
  .dp-sheet:last-of-type { page-break-after: auto; break-after: auto; }
  .dp-svg { width: 285mm !important; height: 198mm !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { size: A4 landscape; margin: 6mm; }
}
`;
const DP_CSS = DP_BASE_CSS + DP_PRINT_CSS;

// 표 한 장 — widths: 칸 너비, rows: [[글자 | {t, span, bold}]] , 글자는 가운데
function Tbl({ x, y, widths, rh = 14, rows, fs = 9, bold = [] }) {
  const out = [];
  rows.forEach((row, ri) => {
    let cx = x, ci = 0;
    row.forEach((cell, k) => {
      const o = (cell && typeof cell === 'object') ? cell : { t: cell };
      const span = o.span || 1;
      const w = widths.slice(ci, ci + span).reduce((a, b) => a + b, 0);
      if (!o.skip) {
        out.push(<rect key={`r${ri}-${k}`} x={cx} y={y + ri * rh} width={w} height={(o.rspan || 1) * rh} className="dp-tb" />);
        out.push(<text key={`t${ri}-${k}`} x={cx + w / 2} y={y + ri * rh + ((o.rspan || 1) * rh) / 2 + fs * 0.36} fontSize={o.fs || fs} textAnchor="middle" fontWeight={o.bold || bold.includes(ri) ? 700 : 400}>{o.t == null ? '' : String(o.t)}</text>);
      }
      cx += w; ci += span;
    });
  });
  return <g>{out}</g>;
}

function CellView({ c, fmt, sc }) {
  const ck = fmt === 'checker';
  const lh = ck ? 10.4 : 9.6;
  const x = c.x + (ck ? 1 : 0.5), w = c.w - (ck ? 2 : 1), y = c.y + (ck ? 1 : 0.5), h = c.h - (ck ? 5 : 1);
  const st = sc ? sc.cellState(c) : null;   // 화면 전용 — 완료 · 확정 · 흐리게
  const cls = `dp-cell${ck ? '' : ' carrier'}${c.fill ? ` sp-${c.letter}` : ''}${c.lug ? ' lug' : ''}${st && st.done ? ' done' : ''}${st && st.sure ? ' sure' : ''}${st && c.pred ? ' predscr' : ''}`;
  const cx = c.x + c.w / 2;
  const fs = ck ? 7.2 : (c.lines.length && c.lines[0].length > 8 ? 8 : 7);
  const by = y + h - 3.2;
  const gcls = [c.pred ? 'dp-pred' : '', sc ? 'dp-click' : '', st && st.dim ? 'dp-dim' : ''].filter(Boolean).join(' ') || undefined;
  const inter = sc ? { role: 'button', tabIndex: 0, onClick: () => sc.onCell(c), onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sc.onCell(c); } },
                       'data-cell': '1', 'data-pos': (c.slot && c.slot.pos) || '', 'data-done': st && st.done ? (st.fresh ? 'fresh' : '1') : undefined, 'data-state': c.sure ? 'sure' : (c.pred ? 'pred' : undefined) } : {};
  return (
    <g className={gcls} {...inter}>
      {sc ? <title>{sc.titleOf(c)}</title> : null}
      <rect x={x} y={y} width={w} height={h} className={cls} />
      {c.lines.map((t, i) => (
        <text key={i} x={cx} y={y + (sc ? 12 : 10) + i * lh} fontSize={fs} textAnchor="middle" fontWeight={i === 0 ? 700 : 400}>{t}</text>
      ))}
      {c.xray ? <text x={x + 2} y={by + 1} fontSize={10} fontWeight={700} className="dp-xray">★</text> : null}
      {c.letter ? <text x={cx} y={by} fontSize={6.8} fontWeight={700} textAnchor="middle">{c.letter}{sc && c.tmp && (c.letter === 'RF' || c.letter === 'RE') ? ` ${c.tmp}` : ''}</text> : null}
      {c.urgent ? <text x={x + w - 2} y={by} fontSize={8} textAnchor="end" fontWeight={700}>▲</text> : null}
      {st && st.done ? <text x={x + w - 1.5} y={y + 8.5} fontSize={8.5} textAnchor="end" fontWeight={700} className={`dp-ok${st.fresh ? ' dp-pulse' : ''}`} data-badge="1">✓</text> : null}
      {st && st.tick ? <text x={x + w - 1.5} y={y + 8.5} fontSize={8} textAnchor="end" className="dp-ok" data-tick="1">✓</text> : null}
      {st && c.pred ? <text x={x + 1.5} y={y + 8.5} fontSize={8} fontWeight={700} style={{ fill: '#b45309' }}>?</text> : null}
      {st && st.sure ? <text x={x + 1.5} y={y + 8.5} fontSize={7}>📌</text> : null}
      {sc && c.dbl ? <text x={x + 2.5} y={y + h - 12} fontSize={8} fontWeight={700}>⇅</text> : null}
    </g>
  );
}

// 빈 칸 한 장 — 화면에서는 눌러서 컨을 찾아 고른다(옛 화면과 같은 동작). 지정된 칸은 📌 끝 4자리.
function EmptyView({ e, ck, sc, hid }) {
  const base = `dp-empty${ck ? '' : ' carrier'}${!ck && e.span >= 3 ? ' hatch' : ''}`;
  const hs = !ck && e.span >= 3 ? { fill: `url(#${hid})` } : undefined;   // 4.04: 빗금 무늬 id 는 그림 한 장마다 따로(화면 그림과 출력 그림이 함께 떠도 서로 안 가린다)
  const rx = e.x + (ck ? 1 : 0.5), ry = e.y + (ck ? 1 : 0.5), rw = e.w - (ck ? 2 : 1), rh = e.h - (ck ? 5 : 1);
  if (!sc || !e.slot) return <rect x={rx} y={ry} width={rw} height={rh} className={base} style={hs} />;
  const st = sc.emptyState(e);
  const inter = { role: 'button', tabIndex: 0, onClick: () => sc.onEmpty(e), onKeyDown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); sc.onEmpty(e); } } };
  return (
    <g className={`dp-click${st.dim ? ' dp-dim' : ''}`} {...inter}>
      <title>{sc.emptyTitle(e)}</title>
      <rect x={rx} y={ry} width={rw} height={rh} className={`${base}${st.asg ? ' asg' : ''}`} style={{ pointerEvents: 'all', ...hs }} />
      {st.asg ? <text x={e.x + e.w / 2} y={e.y + e.h / 2 + 3} fontSize={8} fontWeight={700} textAnchor="middle">📌{String(st.asg.cn || '').slice(-4)}</text> : null}
    </g>
  );
}

// 선박 고정 그림 — 선체 윤곽 · 빗금 · 회색 구역 · C/S 칸 · 굵은 눈금 · 램프(선사 양식 덱)
function ArtLayer({ art, hid, gid }) {
  return (
    <g>
      <path className="dp-hull" d={`M ${art.hull.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')} Z`} />
      {art.hatch.map((r, i) => <rect key={`h${i}`} x={r.x} y={r.y} width={r.w + 0.3} height={r.h + 0.3} className="dp-hatchfill" style={{ fill: `url(#${hid})` }} />)}
      {art.gray.map((r, i) => <rect key={`g${i}`} x={r.x} y={r.y} width={r.w + 0.3} height={r.h + 0.3} className="dp-grayfill" style={{ fill: `url(#${gid})` }} />)}
      {art.hatchSegs.length ? <path className="dp-artline" d={art.hatchSegs.map(([x1, y1, x2, y2]) => `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`).join(' ')} /> : null}
      {art.graySegs.length ? <path className="dp-artline" d={art.graySegs.map(([x1, y1, x2, y2]) => `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`).join(' ')} /> : null}
      {art.cs.map((r, i) => (
        <g key={`c${i}`}>
          <rect x={r.x + 0.5} y={r.y + 0.5} width={r.w - 1} height={r.h - 1} className="dp-tb" />
          <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 1} fontSize={7.5} textAnchor="middle">C/S</text>
          <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 9} fontSize={7.5} textAnchor="middle">4000</text>
        </g>
      ))}
      {art.bars.map(([x, y1, y2], i) => <line key={`b${i}`} x1={x} y1={y1} x2={x} y2={y2} className="dp-bar" />)}
      {art.ramp ? (
        <g>
          <rect x={art.ramp.x} y={art.ramp.y} width={art.ramp.w} height={art.ramp.h} className="dp-tb" />
          <text x={art.ramp.x + art.ramp.w / 2} y={art.ramp.y + art.ramp.h / 2 + 10} fontSize={30} textAnchor="middle">RAMP</text>
        </g>
      ) : null}
    </g>
  );
}

export function PageView({ pg, model, bw, isFirst, isLast, screen, signer = '' }) {
  const sc = screen || null;   // 화면(DeckPlanView)에서만 값이 있다 — 눌림·완료·확정 상태. 서명란·범례줄은 인쇄에만 둔다.
  const { head, fmt } = model;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const hid = `dp-hatch-${uid}`, gid = `dp-gray-${uid}`;
  const ck = fmt === 'checker';
  const px = pg.px;
  const yEnd = px.y0 + px.rows * px.uh;
  const xEnd = px.x0 + px.cols * px.uw;
  const t = pg.totals;
  const w3 = (v) => model.fmtWt(v, ck);
  const zone = pg.zone;
  const loloN = zone ? zone.count : 0;
  const legend = bw
    ? '흑백 인쇄 — 바탕색 없음 · 종류는 칸 아래 글자(DG·RF·FR·OT·TK) · ★ X-RAY(빨강) · ▲ 긴급 · 굵은 테두리 = LUG'
    : '컬러 인쇄 — 칸 바탕색 DG·RF·FR·OT·TK · ★ X-RAY(빨강) · ▲ 긴급 · 보라 테두리 = LUG';
  const zoneNote = zone ? ` · 굵은 선 = LOLO 구역 ${loloN}대` : '';
  const predNote = model.predN ? ` · 회색 글씨 ${model.predN}대는 앱 예측 자리` : '';
  const estNote = fmt === 'carrier' && model.pages.some((p) => p.totals.chFrom === 'est') ? ' · CAPACITY·CHASSIS 샤시 대수는 추정(선사 덱플랜 파일을 다시 올리면 파일 값)' : '';
  return (
    <svg viewBox={`0 0 ${PAGE.w} ${PAGE.h}`} className={`dp-svg${bw ? ' dp-bw' : ''}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={hid} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#fff" /><line x1="0" y1="0" x2="0" y2="5" stroke="#777" strokeWidth="0.8" /></pattern>
        <pattern id={gid} width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#ececec" /><line x1="0" y1="0" x2="0" y2="3" stroke="#a8a8a8" strokeWidth="0.7" /></pattern>
      </defs>
      {/* ── 머리 ── */}
      {!ck ? (
        <g>
          <text x={538} y={40} fontSize={25} fontWeight={700} textAnchor="middle" textDecoration="underline">MV "{head.vsl}" _STOWAGE PLAN</text>
          <text x={538} y={76} fontSize={19} fontWeight={700} textAnchor="middle" textDecoration="underline">"{pg.label}" - DECK</text>
          {[['VOY. NO', head.voy], ['DATE', head.dateShown], ['L/PORT', head.lport], ['D/PORT', head.dport]].map(([a, b], i) => (
            <g key={a}>
              <text x={40} y={74 + i * 21} fontSize={12.5}>{a}</text><text x={118} y={74 + i * 21} fontSize={12.5}>:</text>
              <text x={175} y={74 + i * 21} fontSize={12.5}>{b}</text>
              <line x1={40} y1={78 + i * 21} x2={300} y2={78 + i * 21} stroke="#000" strokeWidth={0.7} />
            </g>
          ))}
          <Tbl x={640} y={92} widths={[44, 44, 44, 44, 44]} rh={19} fs={10.5} rows={[[{ t: 'SUB TOTAL', span: 5, bold: true }], ['SIZE', "20'", "40'", "45'", 'TTL'], ['CONT', t.n[20], t.n[40], t.n[45], t.ttl]]} />
          <Tbl x={890} y={92} widths={[58, 40, 40]} rh={19} fs={10.5} rows={[['SIZE', "20'", "40'"], ['CAPACITY', t.ch20, t.ch40], [{ t: 'Weight', bold: true }, { t: w3(t.wt), span: 2 }]]} />
          {pg.deck === 'D' && zone ? <text x={560} y={140} fontSize={15} textAnchor="middle">D DECK : ( + {loloN} )</text> : null}
        </g>
      ) : (
        <g>
          <text x={538} y={38} fontSize={22} fontWeight={700} textAnchor="middle">M/V "{head.vsl}" STOWAGE PLAN</text>
          <text x={538} y={74} fontSize={19} fontWeight={700} textAnchor="middle">{pg.deck === 'U' ? 'UNDER' : pg.label} - DECK</text>
          {[`Voy. No.: ${head.voy}`, `Date    : ${head.dateShown}`, `L/Port  : ${head.lport}`, `D/Port  : ${head.dport}`].map((s, i) => (
            <text key={i} x={34} y={72 + i * 14} fontSize={10.5} style={{ whiteSpace: 'pre' }} xmlSpace="preserve">{s}</text>
          ))}
          <Tbl x={640} y={80} widths={[40, 40]} rh={15} fs={10} rows={[[{ t: 'CHASSIS', span: 2, bold: true }], ["20'", "40'"], [t.ch20, t.ch40]]} />
          <Tbl x={730} y={80} widths={[88]} rh={15} fs={10} rows={[[{ t: 'Weight', bold: true, rspan: 2 }], [{ skip: true }], [w3(t.wt)]]} />
          <Tbl x={840} y={80} widths={[44, 34, 34, 34, 34]} rh={15} fs={10} rows={[[{ t: 'SUB TOTAL', span: 5, bold: true }], [{ t: 'SIZE', bold: true }, "20'", "40'", "45'", 'TTL'], [{ t: 'CONT', bold: true }, t.n[20], t.n[40], t.n[45], t.ttl]]} />
        </g>
      )}

      {/* ── 선체 윤곽(선사 양식) ── */}
      {!ck && pg.art ? <ArtLayer art={pg.art} hid={hid} gid={gid} /> : null}
      {!ck && !pg.art ? (() => {
        const bot = pg.deck === 'B' ? yEnd + 92 : yEnd;
        const hh = bot - px.y0;
        return (
          <g>
            <path className="dp-hull" d={`M ${px.x0 - 6} ${px.y0 - 6} L ${xEnd - 70} ${px.y0 - 6} L ${xEnd + 12} ${px.y0 + hh * 0.13} L ${xEnd + 12} ${bot - hh * 0.13} L ${xEnd - 70} ${bot + 6} L ${px.x0 - 6} ${bot + 6} Z`} />
            {pg.deck === 'B' ? (
              <g>
                <rect x={px.x0 + (xEnd - px.x0) * 0.2} y={yEnd + 16} width={(xEnd - px.x0) * 0.44} height={62} className="dp-tb" />
                <text x={px.x0 + (xEnd - px.x0) * 0.42} y={yEnd + 58} fontSize={30} textAnchor="middle">RAMP</text>
              </g>
            ) : null}
          </g>
        );
      })() : null}

      {/* ── 위치 번호 ── */}
      {ck ? pg.axis.map((a) => (
        <g key={a.t}>
          <text x={a.x} y={px.y0 - 7} fontSize={9.5} fontWeight={700} textAnchor="middle">{a.t}</text>
          <text x={a.x} y={yEnd + 12} fontSize={9.5} fontWeight={700} textAnchor="middle">{a.t}</text>
        </g>
      )) : null}
      {!ck && sc && pg.colAxis ? pg.colAxis.map((a, i) => (
        <g key={`ca${i}`} className="dp-colno">
          <text x={a.x} y={px.y0 - 5} fontSize={8.5} textAnchor="middle" style={{ fill: '#6b7280' }}>{a.t}</text>
          <text x={a.x} y={yEnd + 12} fontSize={8.5} textAnchor="middle" style={{ fill: '#6b7280' }}>{a.t}</text>
        </g>
      )) : null}
      {Array.from({ length: px.rows }).map((_, i) => (
        <text key={`ln${i}`} x={ck ? 1040 : 1030} y={px.y0 + (i + 0.5) * px.uh + 4} fontSize={ck ? 10 : 15} textAnchor="middle">{i + 1}</text>
      ))}

      {/* ── 칸 ── */}
      {pg.empties.map((e, i) => <EmptyView key={`e${i}`} e={e} ck={ck} sc={sc} hid={hid} />)}
      {pg.cells.map((c) => <CellView key={`${c.cn}-${c.ri}-${c.ci}`} c={c} fmt={fmt} sc={sc} />)}
      {pg.xmarks.map((m, i) => { const xs = sc && m.slot ? sc.emptyState(m) : null; return (sc && m.slot ? (
        <g key={`x${i}`} className={`dp-click${xs.dim ? ' dp-dim' : ''}`} role="button" tabIndex={0} onClick={() => sc.onEmpty(m)}>
          <title>{sc.emptyTitle(m)}</title>
          <rect x={m.x} y={m.y} width={m.w} height={m.h - 4} fill="none" style={{ pointerEvents: 'all' }} />
          {xs.asg ? <text x={m.x + m.w / 2} y={m.y + m.h / 2 + 3} fontSize={8} fontWeight={700} textAnchor="middle">📌{String(xs.asg.cn || '').slice(-4)}</text>
            : <text x={m.x + m.w / 2} y={m.y + m.h / 2 + 3} fontSize={m.t === 'X' ? 9 : 7.5} textAnchor="middle">{m.t}</text>}
        </g>
      ) : <text key={`x${i}`} x={m.x + m.w / 2} y={m.y + m.h / 2 + 3} fontSize={m.t === 'X' ? 9 : 7.5} textAnchor="middle">{m.t}</text>); })}

      {/* ── LOLO 구역 굵은 선 ── */}
      {zone ? (
        <g>
          <path className="dp-zone" d={zone.segs.map(([x1, y1, x2, y2]) => `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`).join(' ')} />
          <text x={zone.label.x} y={zone.label.y - 2} fontSize={10} fontWeight={700} textAnchor="middle" className="dp-halo">LOLO</text>
          <text x={zone.label.x} y={zone.label.y + 10} fontSize={8.5} textAnchor="middle" className="dp-halo">{loloN}대</text>
        </g>
      ) : null}

      {/* ── 아래 ── */}
      {!ck && !sc ? (
        <g>
          <line x1={50} y1={CARRIER_SIGN_Y} x2={200} y2={CARRIER_SIGN_Y} stroke="#000" strokeWidth={1.2} /><text x={125} y={CARRIER_SIGN_Y + 16} fontSize={13} textAnchor="middle">Chief Checker</text>
          <line x1={240} y1={CARRIER_SIGN_Y} x2={390} y2={CARRIER_SIGN_Y} stroke="#000" strokeWidth={1.2} /><text x={315} y={CARRIER_SIGN_Y + 16} fontSize={13} textAnchor="middle">Chief Officer</text>
        </g>
      ) : null}
      {(!ck && isFirst) ? <SummaryCarrier model={model} w3={w3} y={622} /> : null}
      {(ck && isLast) ? <SummaryChecker model={model} w3={w3} y={yEnd + 34} x={(!sc && yEnd + 34 + 15 * (['C', 'D', 'U'].filter((k) => model.totals.decks[k]).length + 2) > CHECKER_SIGN_Y - 4) ? 400 : 300} /> : null}   {/* 4.04-04 UNDER 덱 컨이 없어 8줄 덱이 마지막 쪽이면 집계표가 서명줄 높이까지 내려온다 — 서명줄(x 50~390)과 겹치지 않게 오른쪽(400)으로 민다 */}
      {/* 서명란 — 마감텔리 양식(선적). 4.04-04: 양하처럼 모든 덱 쪽 맨 아래에 둔다(서명줄 위는 사인할 자리로 비워 둔다). 서명줄 아래에 검수원 이름과 CHIEF CHECKER, 오른쪽에 CHIEF OFFICER. 출력에만 있고 화면에는 없다. */}
      {(ck && !sc) ? (
        <g>
          <line x1={50} y1={CHECKER_SIGN_Y} x2={200} y2={CHECKER_SIGN_Y} stroke="#000" strokeWidth={1.2} />
          {signer ? <text x={125} y={CHECKER_SIGN_Y + 12} fontSize={11} textAnchor="middle">{signer}</text> : null}
          <text x={125} y={CHECKER_SIGN_Y + 23} fontSize={10} fontWeight={700} textAnchor="middle">CHIEF CHECKER</text>
          <line x1={240} y1={CHECKER_SIGN_Y} x2={390} y2={CHECKER_SIGN_Y} stroke="#000" strokeWidth={1.2} />
          <text x={315} y={CHECKER_SIGN_Y + 23} fontSize={10} fontWeight={700} textAnchor="middle">CHIEF OFFICER</text>
        </g>
      ) : null}
      {!sc ? <text x={538} y={744} fontSize={7.6} textAnchor="middle" style={{ fill: '#444' }}>{legend}{zoneNote}{predNote}{estNote}</text> : null}
    </svg>
  );
}

// 배 전체 집계표 — 선사 양식(B쪽 맨 아래): 왼쪽 CHASSIS(덱별 20'/40' 대수·무게), 오른쪽 F/E 줄(아래 세 줄에 맞춘다)
function SummaryCarrier({ model, w3, y }) {
  const T = model.totals;
  const decks = ['B', 'C', 'D'].filter((k) => T.decks[k]);
  const fe = (f) => [f[20].D + f[20].R, f[20].D, f[20].R, f[40].D + f[40].R, f[40].D, f[40].R, f[45].D + f[45].R, f[45].D, f[45].R, f.L20, f.L40, f.n];
  const left = decks.map((k) => [`${k}-DECK`, T.decks[k].ch20, T.decks[k].ch40, w3(T.decks[k].wt)]);   // CHASSIS = 샤시 대수(선사가 센 값) — 컨 대수가 아니다
  left.push(['TTL', T.ch20, T.ch40, w3(T.wt)]);
  const side = [['F', fe(T.F)], ['E', fe(T.E)], ['TTL', fe(T.TTL)]];
  const wl = [56, 30, 30, 60];
  const wr = [28, 30, 24, 24, 30, 24, 24, 30, 24, 24, 26, 26, 30];
  // 선사 양식(rzdf 엑셀) 그대로 — 머리는 두 줄이다. 왼쪽 표(CHASSIS·20'·40'·Weight)는 첫 줄만 머리이고 둘째 줄부터 B-DECK 자료가 시작하며,
  // 오른쪽 표(F/E)는 칸 이름이 두 줄에 걸쳐 합쳐지고(세로 병합) LUG 만 가로로 합쳐 아래 줄에 20'·40' 가 따로 선다. 병합을 안 하면 왼쪽 둘째 줄이 빈줄로 남는다.
  const R2 = (t) => ({ t, rspan: 2 });
  const head0 = [{ t: 'CHASSIS', bold: true }, "20'", "40'", 'Weight', R2(''), R2("20'"), R2('D'), R2('R'), R2("40'"), R2('D'), R2('R'), R2("45'"), R2('D'), R2('R'), { t: 'LUG', span: 2 }, R2('TTL')];
  const skip = (n) => Array.from({ length: n }, () => ({ skip: true }));
  const nrow = Math.max(left.length, side.length + 1);   // 오른쪽 자료 줄은 왼쪽 둘째 줄 아래부터 — 덱이 모자라면 줄을 하나 더 둔다
  const rows = [head0];
  for (let i = 0; i < nrow; i++) {
    const lr = left[i] || ['', '', '', ''];
    const si = i - (nrow - side.length);   // 오른쪽 F/E/TTL 은 맨 아래 줄에 맞춘다
    if (i === 0) rows.push([...lr, ...skip(10), "20'", "40'", ...skip(1)]);   // 둘째 줄: 오른쪽은 위 칸에서 이어진 병합 + LUG 아래 칸 둘
    else rows.push([...lr, ...(si >= 0 ? [side[si][0], ...side[si][1]] : Array(13).fill(''))]);
  }
  return <Tbl x={410} y={y} widths={[...wl, ...wr]} rh={14} fs={8.5} rows={rows} />;
}

// 배 전체 집계표 — 마감텔리 양식(맨 아래): CHASSIS 덱별 + Cont. F/E/TTL
function SummaryChecker({ model, w3, y, x = 300 }) {
  const T = model.totals;
  const decks = ['C', 'D', 'U'].filter((k) => T.decks[k]);
  const fe = (f) => [f[20].D + f[20].R, f[20].D, f[20].R, f[40].D + f[40].R, f[40].D, f[40].R, f[45].D + f[45].R, f[45].D, f[45].R, f.L20, f.L40, f.n];
  const wl = [58, 34, 34, 70];
  const wr = [46, 34, 28, 28, 34, 28, 28, 34, 28, 28, 40, 40, 34];
  const head = [{ t: 'CHASSIS', bold: true }, "20'", "40'", { t: 'Weight', bold: true }, { t: 'Cont.', bold: true }, "20'", 'D', 'R', "40'", 'D', 'R', "45'", 'D', 'R', '20 Lug', '40 Lug', 'TTL'];
  const rows = [head];
  const side = [['F', fe(T.F)], ['E', fe(T.E)], ['TTL', fe(T.TTL)]];
  decks.forEach((k, i) => {
    rows.push([`${k}-DECK`, T.decks[k].ch20, T.decks[k].ch40, w3(T.decks[k].wt), ...(side[i] ? [side[i][0], ...side[i][1]] : Array(13).fill(''))]);
  });
  rows.push(['TTL', T.ch20, T.ch40, w3(T.wt), ...(side[decks.length] ? [side[decks.length][0], ...side[decks.length][1]] : Array(13).fill(''))]);
  return <Tbl x={x} y={y} widths={[...wl, ...wr]} rh={15} fs={9} rows={rows} />;   // 마감텔리 양식처럼 표는 오른쪽에 둔다
}

/** 그림 머리의 DATE — 덱플랜 날짜(planDate)가 있으면 그것, 없으면 오늘(KST). 출력과 화면이 같은 함수를 쓴다. */
export function deckPlanDate(info, override = '') {
  const dm = String((info && info.planDate) || '').match(/(\d{4}-\d{2}-\d{2})/);
  return override || (dm ? dm[1] : new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10));
}

export default function PrintableDeckPlan({ plan, containers = [], xrayMap = {}, termWork = {}, voyageInfo = {}, mode = 'discharge', onClose, onExcel, staticPreview = false, initialBw = null, dateOverride = '', inspector = '' }) {
  const [bw, setBw] = useState(() => {
    if (initialBw != null) return !!initialBw;
    try { return localStorage.getItem('cpv2_bw') === '1'; } catch { return false; }
  });
  const toggleBw = () => setBw((v) => { const n = !v; try { localStorage.setItem('cpv2_bw', n ? '1' : '0'); } catch { /* 저장 불가 환경 — 이번 화면에만 적용 */ } return n; });
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const info = voyageInfo || {};
  const date = deckPlanDate(info, dateOverride);
  const model = useMemo(() => buildPrintModel({ plan, containers, xrayMap, termWork, vsl: info.vslFull || 'RIZHAO ORIENT', date, mode }),
    [plan, containers, xrayMap, termWork, info.vslFull, date, mode]);
  const btn = (bg, fg) => ({ padding: '6px 10px', background: bg, color: fg, border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' });
  const doPrint = () => { setNotice(''); window.print(); };
  const doPdf = () => { setNotice("인쇄 창에서 대상(프린터)을 «PDF로 저장» 으로 고르세요."); setTimeout(() => window.print(), 150); };
  const doExcel = async () => {
    if (!onExcel || busy) return;
    setBusy(true); setNotice('Excel 만드는 중…');
    try { const name = await onExcel(); setNotice(name ? `저장: ${name}` : ''); }
    catch (e) { console.error('[4.04] 덱플랜 Excel 실패', e); setNotice(`Excel 오류: ${(e && e.message) || e}`); }
    setBusy(false);
  };
  const bar = !staticPreview && onClose ? (
    <div className="dp-noprint" style={{ position: 'fixed', top: 8, right: 8, zIndex: 10, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 'calc(100vw - 16px)', alignItems: 'center' }}>
      {notice ? <span style={{ background: '#fff', color: '#111', padding: '5px 8px', borderRadius: 4, fontSize: 12, border: '1px solid #111' }}>{notice}</span> : null}
      <button onClick={toggleBw} title="흑백 프린터는 흑백, 컬러 프린터는 컬러로 고른 뒤 인쇄합니다. ★ X-RAY 만 두 쪽 다 빨강입니다." style={{ ...btn(bw ? '#fff' : '#f59e0b', '#111'), border: '1px solid #111' }}>{bw ? '◐ 흑백' : '● 컬러'}</button>
      <button onClick={doPrint} style={btn('#1565c0', '#fff')}>🖨 인쇄</button>
      <button onClick={doPdf} style={btn('#7b1fa2', '#fff')}>📄 PDF</button>
      {onExcel ? <button onClick={doExcel} disabled={busy} style={btn('#2e7d32', '#fff')}>📊 Excel</button> : null}
      <button onClick={onClose} style={btn('#37474f', '#fff')}>✕ 닫기</button>
    </div>
  ) : null;
  const body = (
    <div className="dp-overlay" data-fmt={model.fmt}>
      <style>{DP_CSS}</style>
      {bar}
      {model.pages.length === 0 ? (
        <div style={{ color: '#fff', padding: 24, marginTop: 40 }}>덱플랜에 그릴 덱이 없습니다.</div>
      ) : model.pages.map((pg, i) => (
        <div className="dp-sheet" key={pg.deck} data-deck={pg.deck}>
          <PageView pg={pg} model={model} bw={bw} isFirst={i === 0} isLast={i === model.pages.length - 1} signer={inspector} />
        </div>
      ))}
    </div>
  );
  return staticPreview ? body : createPortal(body, document.body);
}
