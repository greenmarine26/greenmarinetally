// 베이 격자 편집기 (공용) — V9.07 신규
//   단독 선적플랜 편집기(planedit.html)에서 검증된 조작 방식을 검수앱으로 들여온 것.
//   저장 대상만 다르게 두 곳이 이 컴포넌트를 공유한다:
//     · ChiefBayEdit    — 실체위치(bay_actual) 정정
//     · LoadingPlanEdit — 선적 확정 플랜(planDraft → ediContainers)
//
// 확정된 조작 규칙 (단독본 V9.08~V9.14 실사용 검증):
//   · 격자는 베이매트릭스 기준 — 빈 슬롯도 전부 보이고, 그 자리로 옮길 수 있다
//   · 빈 칸 → 이동 / 컨 있는 칸 → 자리 맞교환
//   · 여러 대 선택 후 하나를 끌면 전체가 상대 위치 그대로 이동 (원자적)
//   · 셀 클릭 = 선택 토글, Shift+영역 = 추가, Ctrl/⌘+영역 = 제외
//   · 격자 기하는 편집 시작 시점으로 고정 (옮길 때마다 재계산되면 셀이 틀어짐)
//   · 드래그 하이라이트는 DOM 클래스 직접 처리 (리렌더 0) + 항상 한 칸만
//   · 상태 클래스는 크기에 영향 주는 속성 금지 (padding/border 변경 → 행 재배분)
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Undo2 } from 'lucide-react';
import { getShipBayDictData } from '../shipStructure.js';
import { enrichBayDef } from '../bayDictAutoEnrich.js';
import { isUserOwnedBayDict } from '../utils.js';   // TallyOne 1.11-01: 정본 판정 단일 소스
import { isoToLabel, buildContainerColorMap, getContainerColorKey, isPyeongtaekPort } from '../utils.js';
import { autoPairBays, generatePdfBays, buildPosMap, computeBayRenderData, defaultGetSelfMark } from '../cargoPlanCore.js';
import { BayBoxV2, CARGO_V2_CSS } from './PrintableCargoPlanV2.jsx';
import * as P from '../planEditCore.js';

// 칸 한 개의 크기(px). «1번 베이나 마지막 베이나 같아야 한다» — 검수사 확정 2026-08-13.
//   근거는 종이다. CASP 양하 베이플랜(STSE 2523E) 15장을 150dpi 로 전수 실측한 결과
//   열이 7개인 장(BAY01)이든 15개인 장이든 칸은 «전부 140 × 96px» 로 똑같았다.
//   달라지는 것은 칸이 아니라 격자 전체 크기이고, 그 격자가 종이 안에서 가운데로 온다.
//   그래서 여기서도 칸을 고정하고 시트 폭을 열 수에 비례시킨다(sheetW).
//   비율 137:94 = 1.458 은 종이 140:96 = 1.458 과 같다.
const BGE_CELL_W_MAX = 137;
const BGE_CELL_RATIO = 140 / 96;   // 종이 실측 칸 비율 1.458

export const BGE_CSS = `
.bge-overlay{position:fixed;inset:0;background:#0f172a;z-index:10000;display:flex;flex-direction:column;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic','맑은 고딕',sans-serif}
/* 카고플랜은 편집기 위로 — .cpv2-overlay 기본 z-index 50은 .bge-overlay 10000에 묻힌다.
   이 규칙은 편집기가 떠 있는 동안에만 주입되므로 다른 화면의 쌓임 순서에 영향 없음 */
.cpv2-overlay{z-index:10050 !important}
.bge-head{display:flex;align-items:center;gap:8px;padding:0 12px;height:44px;flex:0 0 44px;background:#0b1220;border-bottom:1px solid #1e293b;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;white-space:nowrap}
.bge-head h1{font-size:14px;margin:0;font-weight:800}
.bge-head>*{flex:0 0 auto}
.bge-badge{font-size:11px;background:#1e293b;border:1px solid #334155;border-radius:4px;padding:2px 7px;color:#94a3b8}
.bge-badge.warn{background:#78350f;border-color:#b45309;color:#fed7aa}
.bge-btn{padding:5px 10px;border-radius:5px;font-size:12px;font-weight:700;border:1px solid #334155;background:#1e293b;color:#cbd5e1;cursor:pointer}
.bge-btn:hover:not(:disabled){background:#334155}
.bge-btn:disabled{opacity:.4;cursor:default}
.bge-btn.p{background:#2563eb;border-color:#2563eb;color:#fff}
.bge-btn.g{background:#059669;border-color:#059669;color:#fff}
.bge-btn.r{background:#b91c1c;border-color:#b91c1c;color:#fff}
.bge-stats{display:flex;gap:12px;padding:0 12px;height:30px;flex:0 0 30px;background:#0f172a;border-bottom:1px solid #1e293b;font-size:12px;flex-wrap:nowrap;align-items:center;overflow:hidden;white-space:nowrap}
.bge-stats b{color:#f8fafc;font-size:13px}
.bge-msg{margin-left:auto;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;max-width:44%;flex-shrink:1}
.bge-nav{display:flex;gap:4px;flex-wrap:wrap;padding:5px 10px;min-height:34px;max-height:78px;flex:0 0 auto;background:#0b1220;overflow-y:auto;overflow-x:hidden;border-bottom:1px solid #1e293b;align-content:flex-start}
.bge-nav button{padding:4px 9px;border-radius:5px;font-size:12px;font-weight:700;border:1px solid #334155;background:#1e293b;color:#cbd5e1;cursor:pointer}
.bge-nav button.on{background:#2563eb;color:#fff;border-color:#2563eb}
.bge-nav button.chg{border-color:#f59e0b;border-width:2px}
.bge-body{flex:1;display:flex;min-height:0}
.bge-stage{flex:1;overflow:auto;padding:10px;background:#1e293b;position:relative}
/* 1.67: 칸이 4~5줄이 되면서 «화면 높이에 욱여넣기»가 불가능해졌다(overflow:hidden 이라 잘렸다).
   높이를 내용에 맡기고 .bge-stage(overflow:auto)가 세로로 굴리게 한다. 인쇄는 종전대로 height:auto. */
.bge-sheet{background:#fff;border-radius:6px;padding:10px;color:#111;min-width:420px;margin:0 auto 12px;display:flex;flex-direction:column;min-height:480px;flex-shrink:0}
.bge-sheet:last-child{margin-bottom:0}
.bge-sheet-body{flex:1;display:flex;flex-direction:column;gap:8px;min-height:0}
.bge-boxwrap{flex:1 1 0;min-height:0;display:flex;flex-direction:column;border:1px solid #111;border-radius:3px;overflow:hidden}
.bge-boxh{font-size:12px;font-weight:800;color:#334155;background:#f1f5f9;padding:2px 0;text-align:center;flex-shrink:0;border-bottom:1px solid #cbd5e1}
.bge-boxbody{flex:1 1 0;min-height:0;display:flex;flex-direction:column;padding:3px}
.bge-side{width:258px;background:#0f172a;border-left:1px solid #334155;display:flex;flex-direction:column}
.bge-tabs{display:flex;border-bottom:1px solid #334155}
.bge-tabs button{flex:1;padding:7px 2px;font-size:11.5px;font-weight:800;background:#0b1220;border:none;color:#94a3b8;cursor:pointer;white-space:nowrap}
.bge-tabs button.on{background:#1e293b;color:#e2e8f0}
.bge-drop{margin:8px;border:2px dashed #38bdf8;border-radius:6px;padding:11px;text-align:center;font-size:12px;color:#7dd3fc;line-height:1.4}
.bge-drop.over{background:#0c4a6e;color:#e0f2fe}
.bge-list{flex:1;overflow:auto;padding:8px}
.bge-chip{background:#1e293b;border:1px solid #475569;border-radius:5px;padding:6px 8px;margin-bottom:5px;font-size:11px;cursor:grab;font-family:ui-monospace,monospace}
.bge-chg{background:#1e293b;border:1px solid #475569;border-left:3px solid #f59e0b;border-radius:4px;padding:5px 7px;margin-bottom:4px;font-size:11px}
.bge-chg b{font-family:ui-monospace,monospace}
.bge-chg i{font-style:normal;color:#94a3b8}
.bge-rubber{position:absolute;border:1.5px solid #2563eb;background:rgba(37,99,235,.15);pointer-events:none;z-index:5}
.bge-empty-msg{flex:1;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px;text-align:center;padding:30px;line-height:1.7}

/* 편집 오버레이 — 상태 클래스는 색만 바꾼다 (크기 속성 금지) */
/* 1.67: 칸 폭에 «상한»을 둔다 — 종이는 열이 몇이든 칸 폭이 일정하고, 열이 적으면
   격자 자체가 좁아져 가운데로 모인다(종이 BAY01 은 7열이라 좌우가 크게 빈다).
   종전엔 max-width:none 이라 열이 적을수록 칸만 옆으로 늘어나, 글자가 칸의 40%만 채우고
   «오른쪽이 남았다»(검수사 지적 2026-08-13). 폭 상한 + 줄 가운데 정렬로 종이와 같아진다.
   container-type 은 아래 글자 크기(cqw)가 «칸 폭»을 기준으로 삼게 하려는 것이다. */
/* 칸 폭 정본 — JS(sheetW)와 CSS 가 같은 값을 써야 격자와 시트가 어긋나지 않는다. */
/* BGE_CELL_W = 124 */
/* 칸 폭은 «시트를 좁혀서» 맞춘다 — 칸에 max-width 를 걸어 가운데로 모으는 방법은 쓰지 않는다.
   그렇게 하면 격자 «틀»은 폭 100% 그대로라, 틀 오른쪽에 붙는 단 번호(88·86·84…)가
   격자에서 150px 떨어져 오른쪽에 덩그러니 남는다(검수사 지적 "아직도 우측 여백이").
   틀만 줄이려고 .cpv2-grid 를 flex:0 1 auto 로 바꿔 봤더니 이번엔 칸이 통째로 수축했다
   (자식 칸이 flex-shrink:1 이라 basis 가 안 버틴다).
   종이가 하는 방식이 답이다 — CASP 는 «칸 폭이 일정»하고 열이 적으면 종이 위 격자 자체가 좁다.
   그래서 시트 폭을 열 수 × 칸 폭으로 잡는다(아래 렌더의 sheetW). 격자는 시트를 꽉 채우고,
   단 번호는 격자 바로 옆에 붙고, 시트는 margin:0 auto 로 가운데 온다. */
/* 칸 크기는 «못 박는다» — flex 로 나눠 주면 열 수에 따라 소수점이 남아 베이마다 0.8px 씩 달라진다.
   종이(CASP 15장)가 열 수와 무관하게 140 × 96px 로 똑같으므로 여기서도 고정값을 준다.
   남는 폭은 tier-row 의 가운데 정렬이 처리한다. */
.bge-edit .cpv2-tier-row,.bge-edit .cpv2-row-labels{justify-content:center}
.bge-edit .cpv2-cell,.bge-edit .cpv2-cell-empty,.bge-edit .cpv2-row-labels > span{
  flex:0 0 var(--bge-cw) !important;width:var(--bge-cw) !important;max-width:var(--bge-cw) !important}
.bge-edit .cpv2-cell{container-type:inline-size;font-size:clamp(7px,0.68vw,10px) !important;line-height:1.15;border:1px solid #94a3b8 !important;box-sizing:border-box;flex:1 1 0 !important;min-width:0 !important;overflow:hidden;
  /* 1.67: 종이처럼 «왼쪽 위로 쌓는» 여러 줄. 종전 가운데 정렬(cpv2-cell)은 2줄 전용이었다. */
  /* 정렬은 flex-start 다. 종이는 «앞 세 줄이 촘촘히 붙고, 좌표 줄만 칸 아래에» 떨어져 있다
     (종이 실측: 3줄 연속 → 빈 줄 하나 → 좌표). 그 «빈 줄 하나»는 .bge-at 의 margin-top:auto 가 만든다.
     ⛔ space-between 을 쓰면 안 된다 — 네 줄 «사이사이»가 모두 균등하게 벌어져
       앞 세 줄까지 흩어진다(1.67 실측, 검수사 재지적).
     ⛔ center 도 안 된다 — 내용이 칸보다 클 때(리퍼 5줄) «위아래 양쪽으로» 삐져나가
       윗줄이 잘리지 않고 옆 단 칸을 덮는다(1.67 실측: 82단 리퍼가 08단을 덮었다).
       overflow:hidden 도 이것은 못 막는다 — 넘친 쪽이 시작 지점보다 위이기 때문이다.
     여백은 종이 실측 비율 그대로 — 위 12%·아래 13%·좌우 5%(종이 92px 칸에서 위 11px·아래 12px·좌 7px).
     ⚠ 종전 위 3px 은 첫 줄이 «선에 붙어» 보였다(검수사 지적 2026-08-13).
     ★ 가로는 가운데다(align-items:center + text-align:center) — 검수사 요청 2026-08-13.
       종이는 왼쪽 정렬이지만 화면에서는 가운데가 낫다고 하셨다.
     ⛔ 세로(justify-content)는 flex-start 를 유지한다 — center 로 바꾸면 위의 리퍼 사고가 돌아온다. */
  flex-direction:column !important;align-items:center !important;justify-content:flex-start !important;text-align:center;padding:8px 6px 6px;font-weight:400 !important;line-height:1.35 !important}
.bge-edit .cpv2-cell > span{width:100%;text-align:center}
/* 1.67: 칸이 4~5줄이 되면서 «높이를 위에서 내려주는» 방식을 편집기 안에서만 뒤집는다.
   카고플랜 원본은 시트 높이를 정해 놓고 flex:1 1 0 체인으로 단마다 나눠 준다(2줄 전용 설계).
   줄이 늘어난 지금 그 체인 안에서 tier-row 에만 min-height 를 주면, 부모가 못 늘어나
   ① 단 라벨이 옛 간격으로 남아 90·88·86… 이 줄과 어긋나고
   ② 데크 마지막 단과 홀드 첫 단이 겹친다 (1.67 실측 — 82단 위에 08단이 얹혔다).
   그래서 편집기 안에서는 높이를 «내용이 정하게» 하고 시트는 .bge-stage 가 굴린다.
   ⚠ 줄 높이를 바꿀 때는 tier-row 와 tier-labels>span 두 값을 «반드시 같이» 바꾼다 —
     둘은 형제 flex 컬럼이라 서로의 높이를 모른다. */
/* ⛔ 푸는 것은 «세로»를 맡은 것만이다. .cpv2-grid 와 .cpv2-tier-labels 는 부모가 row 라
   그 flex 는 «가로 폭»이다 — 같이 풀었더니 열이 내용 폭으로 쪼그라들었다(1.67 실측). */
.bge-edit .cpv2-bay-section,.bge-edit .cpv2-bay-content,.bge-edit .cpv2-deck-area,
.bge-edit .cpv2-hold-area,.bge-edit .cpv2-grid-row-wrap{flex:0 0 auto !important;min-height:0 !important}
.bge-edit .cpv2-tier-spacer{display:none !important}
/* 줄 높이 94px — 종이 셀 비율(가로:세로 = 142:92 = 1.54)에 칸 폭 상한 124px 을 대입한 값이다(124/1.54 ≈ 80,
   여기에 종이의 «좌표 줄 위 빈 줄» 한 칸을 더해 94). 이 빈 줄은 .bge-at 의 margin-top:auto 가 만든다.
   종전 58px 은 폭 165px 대비 2.84 로 «납작»했고, 그래서 글자가 좌상단에 몰리고 아래가 비었다
   (검수사 지적 2026-08-13: "텍스트들이 너무 상단좌측에 치우칩니다").
   4줄이면 space-between 이 좌표 줄을 아래로 밀어 종이처럼 중간이 뜨고,
   리퍼 5줄이면 빈 줄 없이 꽉 찬다(5×13.5 = 68 ≤ 80-6). */
/* 데크는 «아래로», 홀드는 «위로» 붙인다 — 그래야 단이 적은 베이도 경계선 높이가 같다(종이와 동일).
   높이는 배 전체 최대 단 수로 못 박는다. 남는 쪽이 종이의 «위아래 빈 공간»이 된다.
   ⚠ deck-area/hold-area 가 아니라 «격자와 단 라벨»에 건다 —
     영역에 걸면 위의 min-height:0 !important 에 지고, justify-content 가 열 라벨줄까지 밀어 버린다.
     격자와 단 라벨 두 곳에 «같이» 걸어야 단 번호가 줄과 어긋나지 않는다. */
.bge-edit .cpv2-deck-area .cpv2-grid,.bge-edit .cpv2-deck-area .cpv2-tier-labels{
  min-height:var(--bge-deckh) !important;justify-content:flex-end !important}
.bge-edit .cpv2-hold-area .cpv2-grid,.bge-edit .cpv2-hold-area .cpv2-tier-labels{
  min-height:var(--bge-holdh) !important;justify-content:flex-start !important}
.bge-edit .cpv2-tier-row{flex:0 0 auto !important;min-height:var(--bge-ch)}
.bge-edit .cpv2-tier-labels > span{flex:0 0 auto !important;min-height:var(--bge-ch)}
.bge-edit .bge-boxwrap,.bge-edit .bge-boxbody,.bge-edit .bge-sheet-body{flex:0 0 auto !important}
.bge-edit .cpv2-bay-section{padding:1px}
.bge-edit .cpv2-cell.bge-fill{cursor:grab;background:#fff;border-color:#1e293b !important}
.bge-edit .cpv2-cell.bge-fill:active{cursor:grabbing}
.bge-edit .cpv2-cell.bge-lock{background:#cbd5e1;color:#475569;cursor:not-allowed;border-color:#64748b !important}
.bge-edit .cpv2-cell.bge-chgd{box-shadow:inset 0 0 0 2px #f59e0b}
.bge-edit .cpv2-cell.bge-picked{box-shadow:inset 0 0 0 3px #1d4ed8;background:#dbeafe !important}
.bge-edit .cpv2-cell.bge-chgd.bge-picked{box-shadow:inset 0 0 0 3px #1d4ed8,inset 0 0 0 5px #f59e0b}
.bge-edit .cpv2-cell.bge-over{background:#fde68a !important;border-color:#d97706 !important}
/* 빈 칸도 «실선»이다 — 검수사 2026-08-13: "빈곳은 실선 처리가 안되어 있으면 공간이 없는줄 압니다."
   종이(CASP)도 슬롯이 있는 빈 칸은 실선 테두리로 그린다. 점선은 «자리가 없다»로 읽힌다.
   슬롯 자체가 없는 칸은 종전대로 아예 그리지 않는다(cpv2-cell-empty · visibility:hidden). */
.bge-edit .cpv2-cell.bge-empty{cursor:copy;background:#fefefe;border-style:solid !important;border-color:#94a3b8 !important}
.bge-edit .cpv2-cell.bge-empty:hover{background:#e0f2fe}
.bge-edit .cpv2-cell.bge-open{background:#ecfccb;border-color:#84cc16 !important}
.bge-edit .cpv2-cell.bge-open:hover{background:#d9f99d}
.bge-pick-back{position:fixed;inset:0;background:rgba(2,6,23,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px}
.bge-pick{background:#0b1220;border:1px solid #334155;border-radius:8px;width:min(420px,96vw);max-height:82vh;display:flex;flex-direction:column}
.bge-pick-h{padding:10px 12px;border-bottom:1px solid #334155;color:#e2e8f0;font-weight:800;font-size:14px;display:flex;flex-direction:column;gap:3px}
.bge-pick-h span{color:#a3e635;font-weight:600;font-size:11.5px}
.bge-pick-list{overflow:auto;padding:6px;display:flex;flex-direction:column;gap:5px}
.bge-pick-item{text-align:left;background:#1e293b;border:1px solid #334155;border-radius:6px;padding:9px 10px;color:#e2e8f0;font-size:13px;cursor:pointer;display:flex;flex-direction:column;gap:2px}
.bge-pick-item:hover{background:#334155}
.bge-pick-item span{color:#94a3b8;font-size:11px}
.bge-pick-item em{color:#fbbf24;font-style:normal}
/* 옆 짝수 베이가 차지한 자리 — 단독 홀수 박스에서만 생긴다. 표기는 카고플랜과 동일.
     bge-x      : 인접 40ft/45ft → 흰 배경에 X 글자 (카고플랜 각 베이와 같은 모양)
     bge-shadow : 인접 20ft      → 회색 빈 칸 (카고플랜과 같음)
   둘 다 배치 불가(드롭 차단). 크기에 영향 주는 속성은 쓰지 않는다 — 격자 기하 고정 규칙. */
.bge-edit .cpv2-cell.bge-x{background:#fff;border-color:#111 !important;cursor:not-allowed}
.bge-edit .cpv2-cell.bge-shadow{background:#e5e7eb !important;border-color:#9ca3af !important;cursor:not-allowed;color:transparent}
/* 1.67: 종이(CASP)와 같은 «칸을 가로지르는 큰 X». 종전 11px 글자 X 는 4~5줄 칸에서 안 보였다.
   크기 속성이 아니라 배경이라 격자 기하는 건드리지 않는다. */
.bge-x-mark{position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(to top right,transparent calc(50% - 0.5px),#334155 calc(50% - 0.5px),#334155 calc(50% + 0.5px),transparent calc(50% + 0.5px)),
             linear-gradient(to bottom right,transparent calc(50% - 0.5px),#334155 calc(50% - 0.5px),#334155 calc(50% + 0.5px),transparent calc(50% + 0.5px))}
.bge-edit .cpv2-cell.bge-shadow{color:inherit !important}
/* 1.67: 칸 글자는 CASP 종이(STSE 2523E 양하 베이플랜)를 150dpi 로 재서 맞췄다.
   종이 실측 — 셀 142×92px 안에서 글자 12px(셀 높이의 13%) · 줄 간격 16px(17.3%) ·
   왼쪽 여백 7px(폭의 4.9%) · 그리고 «네 줄 모두 같은 크기·같은 색·보통 굵기»다.
   종전에는 컨번호만 9.5px 800굵기 검정, 나머지는 8px 회색이라 종이와 달랐다.
   ⚠ 컨번호만 굵기 600 을 남긴다 — 화면은 종이보다 작아 번호를 눈으로 집을 데가 필요하다.
     크기·색은 종이대로 통일했으니 «크기로» 구분되지는 않는다. */
/* 글자 크기는 «칸 폭에 비례»한다(cqw). 종이는 컨번호 11자가 칸 폭의 약 88%를 채운다 —
   monospace 자폭이 대략 0.6em 이므로 11 × 0.6 × 13cqw ≈ 86cqw 로 그 비율이 나온다.
   고정 px 로 두면 열 수에 따라 칸 폭이 달라져 어떤 베이는 글자가 헐렁해진다. */
.bge-cn{font-weight:600;font-size:clamp(7px,8.8cqw,12px);letter-spacing:-.2px;font-family:ui-monospace,monospace;display:block;color:#111}
.bge-sub{font-size:clamp(7px,8.8cqw,12px);color:#111;display:block;letter-spacing:-.2px;font-family:ui-monospace,monospace;font-weight:400}
/* ★ 첫 줄(출발/도착)만 왼쪽에 붙인다 — 검수사 2026-08-13:
     "맨 윗줄은 좌측에 가야 합니다. 이유는 통과화물등이 우측을 사용합니다."
   실제로 XRAY 별표(cpv2-xray::after)와 통과 표시가 칸 «우측 상단»에 찍히므로,
   첫 줄을 가운데 두면 그 표시와 겹친다. 나머지 줄은 가운데 정렬 그대로. */
.bge-l1{font-size:clamp(7px,8.8cqw,12px);color:#111;display:block;letter-spacing:-.2px;font-family:ui-monospace,monospace;font-weight:400;text-align:left !important;padding-right:11px}
/* 좌표 줄만 칸 아래로 — 종이의 «빈 줄 하나»가 이것이다. 줄이 늘면(리퍼 온도) 저절로 사라진다. */
.bge-at{font-family:ui-monospace,monospace;color:#111;margin-top:auto}
.bge-tmp{color:#0369a1;font-weight:600}
@media print{
  /* 인쇄 대상 확정 — CARGO_V2_CSS가 함께 주입되면서 그 안의
       body > *:not(.cpv2-overlay):not(.bd-print-modal){display:none}   (0,2,1)
     규칙이 편집기 오버레이까지 지운다. 종전 대응(body > #root{display:block})은
     우선순위 (1,0,1)로 이겨서 '본화면만' 남기는 바람에 뒤 화면이 인쇄됐다.
     클래스를 겹쳐 (0,3,1)~(0,4,1)을 확보해 결정적으로 이긴다. 소스 순서에 기대지 않는다. */
  body.bge-open.bge-open > *:not(.bge-overlay):not(.cpv2-overlay){display:none !important}
  body.bge-open.bge-open > .bge-overlay{display:flex !important}
  /* 카고플랜이 열려 있으면 인쇄 대상은 카고플랜 (cpv2 자체 인쇄 규칙이 처리) */
  body.bge-planopen.bge-planopen > .bge-overlay{display:none !important}
  .bge-head,.bge-stats,.bge-nav,.bge-side,.bge-noprint{display:none !important}
  .bge-overlay{position:static !important;background:#fff !important}
  .bge-stage{overflow:visible;padding:0;background:#fff}
  /* 베이 한 장씩 따로 인쇄 — 1과 (02)03을 각각 뽑을 수 있어야 한다 (사용자 확정 2026-07-26) */
  .bge-sheet{box-shadow:none;max-width:none;min-width:0;height:auto;margin:0;break-inside:avoid;page-break-inside:avoid;break-after:page;page-break-after:always}
  .bge-sheet:last-child{break-after:auto;page-break-after:auto}
  /* 브라우저 '배경 그래픽' 기본값이 꺼져 있으면 통과 고정분 회색이 날아간다 — 강제 출력 */
  .bge-sheet, .bge-sheet *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
}
@media (max-width:820px){
  .bge-body{flex-direction:column}
  .bge-side{width:100%;flex:0 0 auto;max-height:150px;border-left:none;border-top:1px solid #334155}
  .bge-sheet{min-width:0;height:auto;min-height:420px;padding:6px}
  /* V9.23-03: 폰에서 시트 머리글이 두세 줄로 늘어 베이탭을 밀어내던 것 — 한 줄로 줄인다 */
  .bge-sheet-title{font-size:11.5px !important;margin-bottom:3px !important;white-space:nowrap;
    overflow:hidden;text-overflow:ellipsis}
  .bge-boxh{font-size:11px;padding:1px 0}
  .bge-nav{max-height:64px;padding:4px 8px;gap:3px}
  .bge-nav button{padding:3px 7px;font-size:11.5px}
  .bge-stats{gap:8px;font-size:11px;overflow-x:auto}
  .bge-stage{padding:6px}
}
`;

const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
const cnNorm = (s) => String(s || '').replace(/\s/g, '').toUpperCase();
const keyToNum = (k) => parseInt(String(k).startsWith('(') ? String(k).replace(/[()]/g, '').slice(2) : k, 10) || 0;
const keyLabel = (k) => { if (String(k).startsWith('(')) { const m = String(k).replace(/[()]/g, ''); return `(${m.slice(0, 2)})${m.slice(2)}`; } return String(k); };

/**
 * @param {object[]} containers  기준 위치가 반영된 컨 목록 (bay/row/tier)
 * @param {string[]} storageCns  처음부터 임시창고에 있는 컨
 * @param {string[]} lockedCns   이동 불가 컨 (미지정 시 평택분/쉬프팅 판정)
 * @param {(state)=>void} onSave 저장 — state.pos를 읽어 호출자가 처리
 */
export default function BayGridEditor({
  title = '베이 격자 편집', subtitle = '', voyageInfo = null,
  containers = [], storageCns = [], lockedCns = null, shiftCns = [],
  shipImo, shipName, mode = 'loading',
  saving = false, saveLabel = '저장', onSave, onClose,
  headerExtra = null, sideExtra = null, onStateChange = null,
  lockHint = '통과 고정분',
}) {
  const [state, setState] = useState(null);
  const [tick, setTick] = useState(0);
  const [selIdx, setSelIdx] = useState(0);
  const [tab, setTab] = useState('sel');
  const [msg, setMsg] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [stgOver, setStgOver] = useState(false);
  const [picker, setPicker] = useState(null);   // V9.23-07: 빈 자리 → 놓을 컨 고르기
  const stageRef = useRef(null);
  const rubberStart = useRef(null);
  const [rubber, setRubber] = useState(null);
  const bump = () => setTick((t) => t + 1);

  // 편집 상태는 최초 1회만 만든다 (편집 중 부모 갱신에 흔들리지 않게)
  useEffect(() => {
    if (state || !containers.length) return;
    setState(P.buildState(containers, [], shiftCns, { storageCns, lockedCns }));
  }, [containers, state, storageCns, lockedCns, shiftCns]);

  useEffect(() => { if (state && onStateChange) onStateChange(state, tick); }, [state, tick, onStateChange]);

  // 인쇄 대상 판별용 표식 — 편집기가 떠 있는 동안에만 body에 붙는다
  useEffect(() => {
    document.body.classList.add('bge-open');
    return () => document.body.classList.remove('bge-open');
  }, []);

  const ediBayNums = useMemo(() => {
    const s = new Set();
    for (const c of containers) { const n = num(c.bay); if (n && n < 99) s.add(n); }
    return [...s].sort((a, b) => a - b);
  }, [containers]);

  const dictData = useMemo(() => {
    if (!containers.length || (!shipImo && !shipName)) return null;
    const base = getShipBayDictData(shipImo || '', shipName || '', { ediBayCount: ediBayNums.length, vslFull: shipName || '' });
    if (!base) return null;
    // TallyOne 1.11-01: 정본 판정은 조회 경로(source)가 아니라 항목 안쪽(isUserOwnedBayDict). Firebase 경유 정본이 자동 사전 취급되던 결함.
    const _isUser = isUserOwnedBayDict(base);
    const en = enrichBayDef({ bayDef: base.bayDef }, base._v5Matrix, containers, _isUser ? 'user' : base.source);
    return { ...base, _userOwned: _isUser, bayDef: { ...en.bayDef, source: base.source, _userOwned: _isUser } };
  }, [containers, shipImo, shipName, ediBayNums]);

  const matrixBays = useMemo(() => {
    if (!dictData) return [];
    const rawM = dictData?._v5Matrix?.matrixBays || [];
    const v2 = dictData.bayDef || {};
    const deckAll = v2.deckTiers || [], holdAll = v2.holdTiers || [];
    const summary = v2.baysSummary || [];
    const byBay = new Map();
    for (const s of summary) { const n = Number(s.bayNo); if (Number.isFinite(n)) byBay.set(n, s); }
    const ediT = new Map();
    for (const c of containers) {
      const b = Number(c.bay), t = Number(c.tier);
      if (!Number.isFinite(b) || !Number.isFinite(t)) continue;
      if (!ediT.has(b)) ediT.set(b, new Set());
      ediT.get(b).add(t);
    }
    let bays = rawM;
    if (bays.length === 0 && summary.length > 0) {
      bays = summary.map((s) => ({ bayNum: Number(s.bayNo), cells: [], hasHold: !!s.hasHold, hasDeck: s.hasDeck !== false, isStandalone: !!s.isStandalone }));
    }
    if (rawM.length > 0 && summary.length > 0) {
      if (isUserOwnedBayDict(dictData)) {
        const allow = new Set(summary.map((s) => Number(s.bayNo)).filter(Number.isFinite));
        bays = rawM.filter((b) => allow.has(Number(b.bayNum)));
      } else {
        // 자동추출 사전은 v2가 v5보다 불완전할 수 있다 (홀수 베이 누락 → 페어 붕괴)
        const have = new Set(rawM.map((b) => Number(b.bayNum)));
        const extra = summary.map((s) => Number(s.bayNo)).filter((n) => Number.isFinite(n) && n > 0 && !have.has(n))
          .map((n) => ({ bayNum: n, cells: [], hasHold: !!byBay.get(n)?.hasHold, hasDeck: byBay.get(n)?.hasDeck !== false, isStandalone: !!byBay.get(n)?.isStandalone }));
        bays = [...rawM, ...extra].sort((a, b) => Number(a.bayNum) - Number(b.bayNum));
      }
    }
    return bays.filter((b) => Number(b.bayNum) < 99).map((b) => {
      const sm = byBay.get(b.bayNum);
      const tiers = ediT.get(b.bayNum); const et = tiers ? [...tiers] : [];
      const hasDeck = sm?.hasDeck !== undefined ? sm.hasDeck : (b.hasDeck !== false || et.some((t) => t >= 80));
      const hasHold = sm?.hasHold !== undefined ? sm.hasHold : (b.hasHold || et.some((t) => t < 80));
      const cells = b.cells ? [...b.cells].reverse() : [];
      const sDeck = (sm?.deckTiers?.length ? sm.deckTiers : (sm?.deckTiersLocal?.length ? sm.deckTiersLocal : null));
      const sHold = (sm?.holdTiers?.length ? sm.holdTiers : (sm?.holdTiersLocal?.length ? sm.holdTiersLocal : null));
      const deckTiers = hasDeck ? (sDeck ? sDeck.map(Number) : deckAll) : [];
      const holdTiers = hasHold ? (sHold ? sHold.map(Number) : holdAll) : [];
      const nD = deckTiers.length, nH = holdTiers.length;
      const sdc = sm?.deckCells?.length ? sm.deckCells : null, shc = sm?.holdCells?.length ? sm.holdCells : null;
      const deckCells = sdc ? sdc.slice(0, nD).map(Number) : (nD > 0 ? cells.slice(0, nD) : []);
      const holdCells = shc ? shc.slice(0, nH).map(Number) : (nH > 0 ? cells.slice(nD, nD + nH) : []);
      return { ...b, hasDeck, hasHold, deckCells, holdCells, deckTiers, holdTiers, isStandalone: sm?.isStandalone || b.isStandalone || false };
    });
  }, [dictData, containers]);

  const { trios, singles } = useMemo(() => (matrixBays.length ? autoPairBays(matrixBays) : { trios: [], singles: [] }), [matrixBays]);
  const pdfBays = useMemo(() => (matrixBays.length ? generatePdfBays(matrixBays, trios, singles) : {}), [matrixBays, trios, singles]);

  const pages = useMemo(() => {
    const list = [];
    trios.forEach(([top, pair]) => list.push({ key: pair, label: `${top}·${keyLabel(pair)}`, num: keyToNum(pair), boxKeys: [top, pair] }));
    singles.forEach((s) => list.push({ key: s, label: String(s), num: keyToNum(s), boxKeys: [s] }));
    return list.sort((a, b) => a.num - b.num);
  }, [trios, singles]);
  const page = pages[selIdx] || null;
  useEffect(() => { if (selIdx >= pages.length) setSelIdx(0); }, [pages, selIdx]);

  // 격자 기하는 편집 시작 시점 배치로 고정 — 옮길 때마다 재계산되면 셀이 틀어진다
  const basePosMap = useMemo(() => buildPosMap(containers), [containers]);

  // 이 배에서 «가장 열이 많은 베이»의 열 수. 모든 장이 이 폭을 쓴다(sheetW).
  //   베이사전 한 벌만 훑으므로 싸다. hasZero 면 00열이 하나 더 붙는다.
  const maxCols = useMemo(() => {
    let m = 0, zero = false;
    for (const b of (dictData?.bayDef?.baysSummary || [])) {
      for (const arr of [b.deckCells, b.holdCells]) {
        if (Array.isArray(arr)) for (const n of arr) { const v = Number(n) || 0; if (v > m) m = v; }
      }
      const rc = Number(b.rowCount) || 0; if (rc > m) m = rc;
      if (b.hasZero) zero = true;
    }
    return Math.max(m + (zero ? 1 : 0), 7) + 1.5;   // +1.5 = 종이의 좌우 여유
  }, [dictData]);

  // 세로도 같은 원리다. 종이(CASP)는 «데크/홀드 경계선이 어느 장이든 같은 높이»에 온다 —
  //   데크는 아래로 붙이고 홀드는 위로 붙이며, 단이 적은 베이는 데크 위·홀드 아래가 빈다.
  //   그래서 배 전체의 최대 데크 단·최대 홀드 단으로 두 영역의 높이를 못 박는다.
  //   검수사 2026-08-13: "좌우는 맞았습니다 이제 상하입니다."
  const maxTiers = useMemo(() => {
    const bs = dictData?.bayDef?.baysSummary || [];
    let d = 0, h = 0;
    for (const b of bs) {
      const hl = (b.holdTiers || []).length; if (hl > h) h = hl;
      // ⚠ 데크 최대는 «홀드가 있는 베이»에서만 센다.
      //   선미 쪽 데크 전용 베이(STSE 27·28·29)는 92단을 갖고 홀드가 0이라, 같이 세면 6이 나온다.
      //   검수사 확정 2026-08-13: "이 선박으로 따지면 홀드 티어 4 데크 티어 5입니다."
      //   그 예외 베이는 min-height 를 넘겨 제 단 수(6)대로 그려지므로 잘리지 않는다.
      if (hl > 0) { const dl = (b.deckTiers || []).length; if (dl > d) d = dl; }
    }
    if (!d) for (const b of bs) { const dl = (b.deckTiers || []).length; if (dl > d) d = dl; }
    return { deck: Math.max(d, 1), hold: Math.max(h, 1) };
  }, [dictData]);

  // 칸 크기는 «화면에 최대 열이 다 들어가도록» 정한다 — 그래야 종이 한 장처럼 보인다.
  //   배 안에서는 어느 베이든 같은 값이다(검수사 확정: 1번 베이나 마지막 베이나 같아야 한다).
  const [stageW, setStageW] = useState(1200);
  useEffect(() => {
    const el = stageRef.current; if (!el || typeof ResizeObserver === 'undefined') return;
    const read = () => setStageW(el.clientWidth || 1200);
    const ro = new ResizeObserver(read); ro.observe(el); read();
    return () => ro.disconnect();
  }, []);
  const cellW = Math.max(60, Math.min(BGE_CELL_W_MAX, Math.floor((stageW - 66) / maxCols)));
  const cellH = Math.round(cellW / BGE_CELL_RATIO);
  const colorMap = useMemo(() => buildContainerColorMap(containers, mode), [containers, mode]);
  const pod = useMemo(() => {
    const c = {}; for (const x of containers) { const p = x.pod; if (p) c[p] = (c[p] || 0) + 1; }
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || 'KRPTK';
  }, [containers]);
  const getColorKey = useCallback((c) => getContainerColorKey(c, mode), [mode]);
  const getIsThrough = useCallback((c) => (mode === 'discharge' ? !isPyeongtaekPort(c.pod) : !(c._inList || isPyeongtaekPort(c.pol))), [mode]);

  const mk = useCallback((key) => (key && matrixBays.length
    ? computeBayRenderData(key, pdfBays, matrixBays, basePosMap, pod, defaultGetSelfMark, {}, getColorKey, getIsThrough, dictData?.bayDef, dictData?.code)
    : null), [pdfBays, matrixBays, basePosMap, pod, getColorKey, getIsThrough, dictData]);

  const boxes = useMemo(() => {
    if (!page || !state) return [];
    return page.boxKeys.map((k) => {
      const isPair = String(k).startsWith('(');
      const m = String(k).replace(/[()]/g, '');
      const even = isPair ? m.slice(0, 2) : null;
      const odd = isPair ? m.slice(2) : String(k);
      const bays = isPair ? [num(even), num(odd)] : [num(k)];
      const cellMap = {};
      // V9.07-05: 옆 짝수 베이 점유 맵. mark 'X'로 판정하면 안 된다 —
      //   'X'는 defaultGetSelfMark가 자기 컨의 POD 불일치에도 주는 값이라,
      //   컨을 옮기면 비운 자리가 잘못 막힌다. 현재 위치(state.pos)로 직접 계산한다.
      const adjMap = {}, adjCnMap = {}, adjBayMap = {};
      // TallyOne 1.67: 걸침 «판정»은 양쪽(N-1·N+1) 그대로 둔다 — 40ft 는 물리적으로 두 자리를 먹으므로
      //   그 칸은 어느 쪽 장에서 보든 막혀 있어야 한다. 바뀐 것은 판정이 아니라 «표기»다(makeContent).
      //   다만 짝수 단독 박스(예 BAY38)는 제가 40ft 라 걸침이라는 것이 없다 —
      //   종전엔 oddNum 에 짝수까지 넣어 37·39 컨을 끌어와 남의 베이 컨으로 칸을 막았다.
      const oddNum = (!isPair && num(k) % 2 === 1) ? num(k) : null;
      for (const [cn, p] of Object.entries(state.pos)) {
        if (p.storage) continue;
        const b = num(p.bay);
        if (bays.includes(b)) { cellMap[`${p.tier}-${p.row}`] = cn; continue; }
        if (oddNum != null && (b === oddNum - 1 || b === oddNum + 1)) {
          const k2 = `${p.tier}-${p.row}`;
          adjMap[k2] = P.sizeOf(state.byCn.get(cn) || {}) === '20' ? '20' : '40';
          adjCnMap[k2] = cn;                       // V9.23-03: 누가 차지했는지 기억
          adjBayMap[k2] = p.bay;
        }
      }
      const data = mk(k);
      const mkSec = (rows) => {
        if (!rows || !rows.length) return null;
        const width = Math.max(...rows.map((r) => (r.cells || []).length));
        const cols = new Array(width).fill(null);
        for (const r of rows) (r.cells || []).forEach((c, i) => { if (cols[i] == null && c.rowLbl) cols[i] = c.rowLbl; });
        return { tiers: rows.map((r) => P.pad2(r.tier)), cols, active: rows.map((r) => (r.cells || []).map((c) => !!c.active)) };
      };
      return { key: k, label: keyLabel(k), even, odd, bays, cellMap, adjMap, adjCnMap, adjBayMap, data, sections: { deck: mkSec(data?.deckRows), hold: mkSec(data?.holdRows) } };
    });
  }, [page, state, mk, tick]);

  // V9.23-04: 격자에 안 나타나는 컨 찾기 (사용자 신고 — 놓였는데 보이지도 고치지도 못함)
  //   ① 좌표중복: 같은 bay/row/tier에 둘 이상 → cellMap이 덮어써 하나만 그려진다
  //   ② 격자 밖: 베이사전에 없는 베이·비활성 칸 → 어느 페이지에도 안 그려진다
  //   둘 다 편집기에서 손댈 방법이 없었다. 목록으로 꺼내 선택·보관할 수 있게 한다.
  const issues = useMemo(() => (state ? P.validate(state) : null), [state, tick]);

  const drawable = useMemo(() => {
    const ok = new Set();
    if (!state || !matrixBays.length) return ok;
    for (const pg of pages) {
      for (const k of pg.boxKeys) {
        const isPair = String(k).startsWith('(');
        const m = String(k).replace(/[()]/g, '');
        const bs = isPair ? [num(m.slice(0, 2)), num(m.slice(2))] : [num(k)];
        const d = mk(k);
        if (!d) continue;
        const active = new Set();
        for (const r of [...(d.deckRows || []), ...(d.holdRows || [])]) {
          for (const c of (r.cells || [])) if (c.active && c.rowLbl) active.add(`${P.pad2(r.tier)}-${c.rowLbl}`);
        }
        for (const [cn, pos2] of Object.entries(state.pos)) {
          if (pos2.storage || ok.has(cn)) continue;
          if (!bs.includes(num(pos2.bay))) continue;
          if (active.has(`${pos2.tier}-${pos2.row}`)) ok.add(cn);
        }
      }
    }
    return ok;
  }, [state, pages, mk, matrixBays, tick]);

  const hidden = useMemo(() => {
    // V9.23-06: 베이사전이 아직 없으면 '격자 밖' 판정 자체가 불가능하다.
    //   막으로 두면 사전 로딩 전에 전 컨이 '안 보임'으로 잡혀 겁을 준다(실측 390/405).
    if (!state || !matrixBays.length) return [];
    const dupCns = new Set();
    for (const d of (issues?.dup || [])) for (const cn of d.cns.slice(1)) dupCns.add(cn);
    const out = [];
    for (const [cn, pos2] of Object.entries(state.pos)) {
      if (pos2.storage) continue;
      const isDup = dupCns.has(cn);
      const offGrid = !drawable.has(cn);
      if (!isDup && !offGrid) continue;
      out.push({ cn, bay: pos2.bay, row: pos2.row, tier: pos2.tier,
                 why: isDup ? '좌표중복' : '격자 밖' });
    }
    return out.sort((a, b) => (a.bay + a.row + a.tier).localeCompare(b.bay + b.row + b.tier));
  }, [state, drawable, issues, matrixBays, tick]);

  // V9.23-07: 선적 안 된 자리를 먼저 보여 준다 (사용자 요구 2026-07-30).
  //   종전 흐름은 "임시창고 컨을 집어 좌표에 끌어다 놓기"라 폰에서 쓰기 어려웠다.
  //   뒤집는다 — 빈 자리를 목록으로 내고, 그 자리를 누르면 놓을 컨을 골라 준다.
  const openSlots = useMemo(() => {
    const out = [];
    if (!state || !matrixBays.length) return out;
    pages.forEach((pg, pi) => {
      for (const k of pg.boxKeys) {
        const isPair = String(k).startsWith('(');
        const m = String(k).replace(/[()]/g, '');
        const even = isPair ? m.slice(0, 2) : null;
        const odd = isPair ? m.slice(2) : String(k);
        const bays = isPair ? [num(even), num(odd)] : [num(k)];
        const oddNum = isPair ? null : num(k);
        const d = mk(k);
        if (!d) continue;
        const occ = new Set(), blocked = new Set();
        for (const [, pos2] of Object.entries(state.pos)) {
          if (pos2.storage) continue;
          const b = num(pos2.bay);
          const key = `${pos2.tier}-${pos2.row}`;
          if (bays.includes(b)) occ.add(key);
          else if (oddNum != null && (b === oddNum - 1 || b === oddNum + 1)) blocked.add(key);
        }
        for (const [secName, rows] of [['데크', d.deckRows], ['홀드', d.holdRows]]) {
          for (const r of (rows || [])) {
            for (const c of (r.cells || [])) {
              if (!c.active || !c.rowLbl) continue;
              const key = `${P.pad2(r.tier)}-${c.rowLbl}`;
              if (occ.has(key) || blocked.has(key)) continue;
              out.push({ page: pi, boxKey: k, label: keyLabel(k), even, odd,
                         sec: secName, row: c.rowLbl, tier: P.pad2(r.tier) });
            }
          }
        }
      }
    });
    return out;
  }, [state, pages, mk, matrixBays, tick]);

  // 베이별로 묶어 목록에 낸다 — 자리 하나하나보다 "어느 베이에 몇 자리"가 먼저 보여야 한다
  const openByBox = useMemo(() => {
    const m = new Map();
    for (const e of openSlots) {
      if (!m.has(e.boxKey)) m.set(e.boxKey, { label: e.label, page: e.page, slots: [] });
      m.get(e.boxKey).slots.push(e);
    }
    return [...m.entries()].map(([k, v]) => ({ boxKey: k, ...v }));
  }, [openSlots]);

  const stats = useMemo(() => (state ? P.summarize(state) : null), [state, tick]);
  const changes = useMemo(() => (state ? P.diffChanges(state) : []), [state, tick]);
  const changedSet = useMemo(() => new Set(changes.map((c) => c.cn)), [changes]);
  const stgList = useMemo(() => (state ? P.storageList(state) : []), [state, tick]);
  const changedBays = useMemo(() => {
    const s = new Set();
    if (state) for (const c of changes) { const p = state.pos[c.cn]; if (!p?.storage) s.add(num(p.bay)); }
    return s;
  }, [changes, state, tick]);
  const emptySlots = useMemo(() => {
    let n = 0;
    for (const b of boxes) {
      const rows = [...(b.data?.deckRows || []), ...(b.data?.holdRows || [])];
      for (const r of rows) for (const c of r.cells) if (c.active && !b.cellMap[`${P.pad2(r.tier)}-${c.rowLbl}`]) n++;
    }
    return n;
  }, [boxes]);

  const clearOver = useCallback(() => {
    document.querySelectorAll('.bge-edit .cpv2-cell.bge-over').forEach((el) => el.classList.remove('bge-over'));
  }, []);
  const toggleSel = useCallback((cn) => {
    setSelected((prev) => { const n = new Set(prev); if (n.has(cn)) n.delete(cn); else n.add(cn); return n; });
  }, []);
  const dropSel = useCallback((cn) => {
    setSelected((prev) => { const n = new Set(prev); n.delete(cn); return n; });
  }, []);

  const dragStart = (e, cn) => {
    if (state.locked.has(cn)) { e.preventDefault(); return; }
    e.dataTransfer.setData('text/plain', cn);
    e.dataTransfer.effectAllowed = 'move';
    if (!selected.has(cn)) setSelected(new Set());
  };

  const locate = (box, cn) => {
    const p = state.pos[cn];
    if (!p || p.storage || !box.bays.includes(num(p.bay))) return null;
    for (const [name, sec] of Object.entries(box.sections)) {
      if (!sec) continue;
      const ti = sec.tiers.indexOf(P.pad2(p.tier));
      const ci = sec.cols.indexOf(p.row);
      if (ti >= 0 && ci >= 0) return { name, sec, ti, ci };
    }
    return null;
  };

  const dropCell = (e, box, rowLbl, tier) => {
    e.preventDefault(); clearOver();
    const cn = e.dataTransfer.getData('text/plain');
    if (!cn || !state || !rowLbl) return;
    const targetBayOf = (c) => {
      if (!box.even) return box.odd;
      const sz = P.sizeOf(c);
      return (sz === '40' || sz === '45') ? box.even : box.odd;
    };

    if (selected.size > 1 && selected.has(cn)) {
      const anchor = locate(box, cn);
      const tgt = (() => {
        for (const [name, sec] of Object.entries(box.sections)) {
          if (!sec) continue;
          const ti = sec.tiers.indexOf(P.pad2(tier)), ci = sec.cols.indexOf(rowLbl);
          if (ti >= 0 && ci >= 0) return { name, sec, ti, ci };
        }
        return null;
      })();
      if (!anchor || !tgt) { setMsg('이동 불가: 기준 컨과 목적 칸을 격자에서 찾지 못했습니다'); return; }
      if (anchor.name !== tgt.name) { setMsg('이동 불가: 여러 대 이동은 데크↔홀드를 넘을 수 없습니다'); return; }
      const dT = tgt.ti - anchor.ti, dC = tgt.ci - anchor.ci;
      const sec = anchor.sec;
      const moves = [];
      for (const c of selected) {
        const L = locate(box, c);
        if (!L) { setMsg(`이동 불가: ${c}는 이 베이/섹션 밖입니다`); return; }
        if (L.name !== anchor.name) { setMsg('이동 불가: 선택분이 데크와 홀드에 걸쳐 있습니다'); return; }
        const nt = L.ti + dT, nc = L.ci + dC;
        if (nt < 0 || nt >= sec.tiers.length || nc < 0 || nc >= sec.cols.length) { setMsg(`이동 불가: ${c}가 격자 밖으로 나갑니다`); return; }
        if (!sec.active?.[nt]?.[nc]) { setMsg(`이동 불가: ${c}의 목적지(${sec.cols[nc]}열 ${sec.tiers[nt]}단)는 슬롯이 없습니다`); return; }
        moves.push({ cn: c, bay: targetBayOf(state.byCn.get(c)), row: sec.cols[nc], tier: sec.tiers[nt] });
      }
      const res = P.placeMany(state, moves);
      setMsg(res.ok ? `선택 ${res.moved}대 동시 이동 (상대 위치 유지)` : `이동 불가: ${res.reason}`);
      if (res.ok) setSelected(new Set());
      bump();
      return;
    }

    const opts = box.even ? { pairEven: box.even, pairOdd: box.odd } : {};
    const res = P.placeAt(state, cn, box.even || box.odd, rowLbl, tier, opts);
    setMsg(res.ok
      ? (res.swappedWith ? `${cn} ↔ ${res.swappedWith} 자리 맞교환` : `${cn} → ${P.pad2(rowLbl)}열 ${P.pad2(tier)}단 이동`)
      : `이동 불가: ${res.reason}`);
    bump();
  };

  const dropStorage = (e) => {
    e.preventDefault(); setStgOver(false); clearOver();
    const cn = e.dataTransfer.getData('text/plain');
    if (!cn || !state) return;
    const cns = selected.has(cn) ? [...selected] : [cn];
    const r = P.moveToStorage(state, cns);
    setMsg(`임시창고 보관 ${r.done.length}대${r.skipped.length ? ` (거부 ${r.skipped.length})` : ''}`);
    setSelected(new Set()); bump();
  };
  // V9.23-04: 목록에서 직접 보관 (안 보임 패널용)
  const sendCns = (cns) => {
    if (!state || !cns.length) return;
    const r = P.moveToStorage(state, cns);
    setMsg(`임시창고 보관 ${r.done.length}대${r.skipped.length ? ` (${lockHint} ${r.skipped.length} 제외)` : ''}`);
    setSelected(new Set()); bump();
  };
  const sendSelected = () => {
    const r = P.moveToStorage(state, [...selected]);
    setMsg(`임시창고 보관 ${r.done.length}대${r.skipped.length ? ` (${lockHint} ${r.skipped.length} 제외)` : ''}`);
    setSelected(new Set()); bump();
  };

  const stageDown = (e) => {
    if (e.button !== 0 || !stageRef.current) return;
    if (e.target.closest('[data-cn]')) return;
    const r = stageRef.current.getBoundingClientRect();
    // 시트가 세로로 쌓이면서 스테이지가 스크롤된다 — 절대배치 러버밴드는 스크롤량을 더해야 제자리에 그려진다
    const sl = stageRef.current.scrollLeft, st = stageRef.current.scrollTop;
    rubberStart.current = { x: e.clientX, y: e.clientY, rl: r.left - sl, rt: r.top - st, add: e.shiftKey, sub: e.ctrlKey || e.metaKey };
    setRubber({ left: e.clientX - r.left + sl, top: e.clientY - r.top + st, w: 0, h: 0 });
  };
  const stageMove = (e) => {
    if (!rubberStart.current) return;
    const s = rubberStart.current;
    setRubber({ left: Math.min(s.x, e.clientX) - s.rl, top: Math.min(s.y, e.clientY) - s.rt, w: Math.abs(e.clientX - s.x), h: Math.abs(e.clientY - s.y) });
  };
  const stageUp = (e) => {
    if (!rubberStart.current) return;
    const s = rubberStart.current; rubberStart.current = null; setRubber(null);
    const x1 = Math.min(s.x, e.clientX), y1 = Math.min(s.y, e.clientY);
    const x2 = Math.max(s.x, e.clientX), y2 = Math.max(s.y, e.clientY);
    if (x2 - x1 < 5 && y2 - y1 < 5) return;
    const found = new Set();
    stageRef.current?.querySelectorAll('[data-cn]').forEach((el) => {
      const cn = el.getAttribute('data-cn');
      if (!cn || state.locked.has(cn)) return;
      const b = el.getBoundingClientRect();
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) found.add(cn);
    });
    if (!found.size) return;
    if (s.sub) setSelected((prev) => { const n = new Set(prev); let k = 0; for (const cn of found) if (n.delete(cn)) k++; setMsg(`영역 ${k}대 선택 해제 → 남은 ${n.size}대`); return n; });
    else if (s.add) setSelected((prev) => { const n = new Set(prev); for (const cn of found) n.add(cn); setMsg(`영역 ${found.size}대 추가 → 총 ${n.size}대`); return n; });
    else { setSelected(found); setTab('sel'); setMsg(`${found.size}대 선택 · 셀 클릭으로 하나씩 넣고 뺄 수 있습니다`); }
  };

  const resetAll = () => {
    if (!changes.length) return;
    if (!window.confirm(`변경 ${changes.length}건을 모두 버립니다. 계속할까요?`)) return;
    setState(P.buildState(containers, [], shiftCns, { storageCns, lockedCns }));
    setSelected(new Set()); bump(); setMsg('원래 상태로 되돌림');
  };

  const tryClose = () => {
    if (changes.length && !window.confirm(`저장하지 않은 변경 ${changes.length}건이 있습니다. 닫으면 버려집니다. 닫을까요?`)) return;
    onClose?.();
  };

  if (!state) {
    return createPortal(
      <div className="bge-overlay">
        <style>{CARGO_V2_CSS}</style><style>{BGE_CSS}</style>
        <div className="bge-head"><h1>{title}</h1>
          <button className="bge-btn" style={{ marginLeft: 'auto' }} onClick={onClose}><X size={16} /></button></div>
        <div className="bge-empty-msg">컨테이너 자료가 없습니다.<br />자료 탭에서 EDI를 먼저 올려주세요.</div>
      </div>, document.body);
  }

  // TallyOne 1.67: 칸 내용을 CASP 종이(정답 그림 DPRT 2512S 10장)와 같은 4~5줄로 맞춘다.
  //   종전 2줄(뒤 7자리 / 소유자 4자 + 규격)은 종이와 달라 나란히 놓고 대조가 안 됐다 —
  //   검수사 지적 "뭐가 뭔지 난해합니다".
  //   줄 구성은 종이 그대로다.
  //     PTK/PYK*SGN   출발3/도착3(*최종3)
  //     BEAU5179806   컨번호 «전체 11자리» — 종전엔 앞 4자를 잘라 소유자를 아랫줄로 내렸다
  //     NSS F11.7 DCHC 선사 · F/E+중량(톤) · 규격
  //     -18.0C        리퍼일 때만
  //     ....101088    베이·열·단
  //   규격 글자는 앱 공용 isoToLabel(40HC·20DC)을 그대로 쓴다. 종이의 CASP 표기(DCHC·DC20)와
  //   글자는 다르지만 뜻은 같고, 여기서 따로 매핑을 만들면 다른 화면과 갈린다(작업표준 2-2-D).
  const p3 = (x) => String(x || '').trim().slice(-3);
  const cellLines = (cn) => {
    const c = state.byCn.get(cn) || {};
    const pos = state.pos[cn] || {};
    const rt = [p3(c.pol), p3(c.pod)].filter(Boolean).join('/');
    const t = Number(c.wt) > 0 ? (Number(c.wt) / 1000).toFixed(1) : '';
    return {
      c,
      route: rt + (c.fpod ? `*${p3(c.fpod)}` : ''),
      spec: [c.op || '', [c.fe || '', t].filter(Boolean).join(''), isoToLabel(c.iso) || ''].filter(Boolean).join(' '),
      temp: (c.rf && c.tmp !== '' && c.tmp != null && !Number.isNaN(Number(c.tmp))) ? `${Number(c.tmp).toFixed(1)}C` : '',
      // 베이는 padBay — pad2 는 100번대 베이를 '100'→'00' 으로 자른다(planEditCore 15행 주석).
      at: pos.bay ? `....${P.padBay(pos.bay)}${P.pad2(pos.row)}${P.pad2(pos.tier)}` : '',
    };
  };

  const makeContent = (box) => (cell, tier) => {
    const cn = box.cellMap[`${P.pad2(tier)}-${cell.rowLbl}`];
    if (!cn) {
      // 옆 짝수 베이 40ft가 차지한 자리 — 카고플랜 각 베이와 같은 X 글자
      if (cell.rowLbl) {
        const k2 = `${P.pad2(tier)}-${cell.rowLbl}`;
        const aCn = box.adjCnMap[k2];
        if (aCn) {
          // TallyOne 1.67: 옆 베이가 먹은 자리는 «X 하나»만 그린다 — 종이와 같게.
          //   V9.23-03 이 여기에 컨번호를 얹은 뒤로, 20ft 단독 베이 한 장이 옆 40ft 번호로 덮였다.
          //   STSE 2662W BAY23 은 제 컨이 4대인데 24베이 40ft 64대가 얹혀 4대가 묻혔고,
          //   그 64대는 (24)25 장에도 제 컨으로 또 나와 «같은 컨이 두 장»에 떴다.
          //   정답 그림(CASP DPRT 2512S) BAY17 장은 먹힌 자리를 전부 큰 X 하나로만 그린다.
          //   ⚠ V9.23-03 이 지키려던 «그 컨을 잡는 길»은 안 잃는다 —
          //     칸을 눌러 고르기·끌어 옮기기·상태줄 안내(makeExtra)는 그대로고,
          //     그 컨의 4줄 상세는 제 장인 (N)(N+1) 페어 박스에 «같은 탭 안에서» 나란히 있다.
          return <span className="bge-x-mark" aria-hidden="true" />;
        }
      }
      return null;
    }
    const L = cellLines(cn);
    const unplaced = mode === 'loading' && L.c._placed === false;
    return (<>
      <span className="bge-l1">{L.route}</span>
      <span className="bge-cn">{state.shiftSet.has(cn) ? '◆' : ''}{unplaced ? '·' : ''}{cn}</span>
      <span className="bge-sub">{L.spec}</span>
      {L.temp ? <span className="bge-sub bge-tmp">{L.temp}</span> : null}
      <span className="bge-sub bge-at">{L.at}</span>
    </>);
  };
  // 시트 폭은 «배 전체에서 가장 열이 많은 베이» 하나로 정해 모든 장에 같이 쓴다.
  //   검수사 확정 2026-08-13: "1번 베이를 보면 좌우 여백이 있습니다. 셀로 따지면 좌우측 각 3개 정도의
  //   여백. 우리앱은 좌우측 여백이 없습니다. 7개 로우만으로도 꽉찼습니다. 그러면 11개 로우를 그리려면?"
  //   종이가 정확히 그렇다 — CASP 는 «장마다 종이 크기가 같고»(A4 가로) 격자만 가운데 놓이므로,
  //   7열짜리 BAY01 은 좌우에 3열분이 남고 11열짜리 장은 거의 꽉 찬다.
  //   종전처럼 시트 폭을 그 베이의 열 수에 비례시키면 7열 장은 시트째로 좁아져 여백이 사라진다.
  //   여기에 좌우 여유 1.5열분을 더해 종이의 «남는 공간»을 재현한다.
  const sheetW = maxCols * cellW + 16 + 30;

  const makeExtra = (box) => (cell, tier) => {
    const cn = cell.rowLbl ? box.cellMap[`${P.pad2(tier)}-${cell.rowLbl}`] : null;
    // V9.07-05: 옆 짝수 베이가 차지한 자리 — 표기는 카고플랜과 동일, 드롭은 차단.
    //   판정은 adjMap(현재 위치 기준). cell.mark는 자기 컨 마크와 섞이므로 쓰지 않는다.
    const akey = cell.rowLbl ? `${P.pad2(tier)}-${cell.rowLbl}` : null;
    const adj = !cn && akey ? box.adjMap[akey] : null;
    if (adj) {
      // V9.23-03: 이 자리에 새로 놓는 건 여전히 막지만(드롭 없음),
      //   차지하고 있는 컨 자체는 끌어 옮기거나 눌러 선택할 수 있어야 한다.
      const aCn = box.adjCnMap[akey];
      const aLock = aCn ? state.locked.has(aCn) : true;
      // V9.23-04: 폰에는 풍선말이 안 뜬다 — 눌렀을 때·떨어뜨렸을 때 상태줄로 이유를 말한다.
      const why = aCn
        ? `이 자리는 ${box.adjBayMap[akey]}베이 ${aCn}(${adj}ft)이 차지하고 있습니다`
        : `이 자리는 옆 베이 ${adj}ft가 차지하고 있습니다`;
      const tell = () => setMsg(aLock
        ? `${why} — ${lockHint}이라 옮길 수 없습니다`
        : `${why} — 그 컨을 먼저 옮기면 이 자리가 납니다 (선택됨)`);
      return {
        'data-cn': aCn || undefined,
        draggable: !!aCn && !aLock,
        onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'none'; },
        onDrop: (e) => { e.preventDefault(); clearOver(); tell(); },
        className: `cpv2-cell ${adj === '40' ? 'bge-x' : 'bge-shadow'}`
          + (aCn && selected.has(aCn) ? ' bge-picked' : '')
          + (aCn && changedSet.has(aCn) ? ' bge-chgd' : ''),
        title: aCn
          ? `${aCn}\n옆 ${box.adjBayMap[akey]}베이 ${adj}ft가 이 자리를 차지\n${aLock ? `${lockHint} — 이동 불가` : '끌어서 옮기거나 눌러 선택'}`
          : `옆 베이 ${adj}ft가 차지한 자리 — 배치 불가`,
        onDragStart: aCn && !aLock ? (e) => dragStart(e, aCn) : undefined,
        onDragEnd: aCn && !aLock ? () => clearOver() : undefined,
        onClick: (e) => { e.stopPropagation(); if (aCn && !aLock) toggleSel(aCn); tell(); },
      };
    }
    // 슬롯이 없는 칸도 조용히 넘기지 않는다
    if (!cell.active && akey) {
      return { className: 'cpv2-cell',
        onClick: (e) => { e.stopPropagation(); setMsg('이 자리는 이 배에 슬롯이 없습니다 (베이사전 기준)'); } };
    }
    const dropProps = cell.active && cell.rowLbl ? {
      onDragOver: (e) => {
        e.preventDefault();
        if (e.currentTarget.classList.contains('bge-over')) return;
        clearOver(); e.currentTarget.classList.add('bge-over');
      },
      onDrop: (e) => dropCell(e, box, cell.rowLbl, tier),
    } : {};
    if (!cn) return { ...dropProps, className: `cpv2-cell${cell.active ? ' bge-empty' : ''}${cell.active && stgList.length ? ' bge-open' : ''}`,
      onClick: cell.active ? (e) => { e.stopPropagation();
        // V9.23-07: 좌표를 외워 끌어 놓게 하지 않는다 — 자리를 누르면 놓을 컨을 골라 준다.
        if (stgList.length) { setPicker({ even: box.even, odd: box.odd, row: cell.rowLbl, tier: P.pad2(tier), label: box.label }); return; }
        setMsg(selected.size
          ? `빈 자리 ${P.pad2(cell.rowLbl)}열 ${P.pad2(tier)}단 — 선택한 ${selected.size}대를 여기로 끌어 놓으십시오`
          : `빈 자리 ${P.pad2(cell.rowLbl)}열 ${P.pad2(tier)}단 — 놓을 컨이 임시창고에 없습니다`);
      } : undefined };
    const c = state.byCn.get(cn) || {};
    const locked = state.locked.has(cn);
    return {
      ...dropProps,
      'data-cn': cn, draggable: !locked,
      className: `cpv2-cell ${locked ? 'bge-lock' : 'bge-fill'}${changedSet.has(cn) ? ' bge-chgd' : ''}${selected.has(cn) ? ' bge-picked' : ''}`,
      title: `${cn}\n${isoToLabel(c.iso) || c.iso} · ${c.pol || ''}→${c.pod || ''}${locked ? `\n${lockHint} — 이동 불가` : ''}${state.shiftSet.has(cn) ? '\n◆ 쉬프팅(재적부)' : ''}`,
      onDragStart: (e) => dragStart(e, cn),
      onDragEnd: () => clearOver(),
      onClick: (e) => {
        e.stopPropagation(); toggleSel(cn);
        const p2 = state.pos[cn] || {};
        setMsg(locked
          ? `${cn} · ${p2.bay}베이 ${p2.row}열 ${p2.tier}단 — ${lockHint}이라 이동 불가`
          : `${cn} · ${p2.bay}베이 ${p2.row}열 ${p2.tier}단 (${isoToLabel(c.iso) || c.iso || ''}) — 끌어서 옮기거나 보관하십시오`);
      },
    };
  };

  const gridCols = Math.max(1, ...boxes.map((b) => Math.max(b.data?.nDeckCols || 0, b.data?.nHoldCols || 0)));

  return createPortal(
    <div className="bge-overlay">
      <style>{CARGO_V2_CSS}</style><style>{BGE_CSS}</style>
      <div className="bge-head">
        <h1>{title}</h1>
        {subtitle && <span className="bge-badge">{subtitle}</span>}
        <span className={`bge-badge${isUserOwnedBayDict(dictData) ? '' : ' warn'}`}>
          {isUserOwnedBayDict(dictData) ? '★정본' : '⚠비정본'} {dictData?.code || '?'} · {(dictData?.bayDef?.baysSummary || []).length}베이
        </span>
        {headerExtra}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          <button className="bge-btn" onClick={() => window.print()} title="인쇄">🖨</button>
          <button className="bge-btn r" onClick={resetAll} disabled={!changes.length} title="변경 되돌리기"><Undo2 size={13} /></button>
          <button className="bge-btn g" onClick={() => onSave?.(state)} disabled={!changes.length || saving}>
            <Save size={13} /> {saving ? '저장 중…' : `${saveLabel}${changes.length ? ` (${changes.length})` : ''}`}
          </button>
          <button className="bge-btn" onClick={tryClose}><X size={14} /></button>
        </div>
      </div>

      <div className="bge-stats">
        <span>전체 <b>{stats.total}</b></span>
        <span style={{ color: '#38bdf8' }}>이동가능 <b style={{ color: '#38bdf8' }}>{stats.moveable}</b></span>
        <span style={{ color: '#94a3b8' }}>{lockHint} <b style={{ color: '#94a3b8' }}>{stats.locked}</b></span>
        {stats.shifting > 0 && <span style={{ color: '#a5b4fc' }}>◆ 쉬프팅 <b style={{ color: '#a5b4fc' }}>{stats.shifting}</b></span>}
        <span style={{ color: '#fbbf24' }}>변경 <b style={{ color: '#fbbf24' }}>{stats.changed}</b></span>
        <span style={{ color: '#7dd3fc' }}>임시창고 <b style={{ color: '#7dd3fc' }}>{stats.storage}</b></span>
        <span style={{ color: '#a3e635' }}>빈 슬롯 <b style={{ color: '#a3e635' }}>{emptySlots}</b></span>
        {selected.size > 0 && <span style={{ color: '#93c5fd' }}>선택 <b style={{ color: '#93c5fd' }}>{selected.size}</b></span>}
        {issues?.dup.length > 0 && <span style={{ color: '#f87171' }}>⚠ 좌표중복 <b style={{ color: '#f87171' }}>{issues.dup.length}</b></span>}
        <span className="bge-msg" title={msg}>{msg}</span>
      </div>

      <div className="bge-nav">
        {pages.length === 0 && <span style={{ color: '#94a3b8', fontSize: 12 }}>베이사전/매트릭스 없음 — 신규 선박 등록 필요</span>}
        {pages.map((p, i) => (
          <button key={p.key} className={`${i === selIdx ? 'on' : ''}${p.boxKeys.some((k) => String(k).replace(/[()]/g, '').match(/\d{2}/g)?.some((n) => changedBays.has(num(n)))) ? ' chg' : ''}`}
            onClick={() => setSelIdx(i)}>{p.label}</button>
        ))}
      </div>

      <div className="bge-body">
        <div className="bge-stage" ref={stageRef} onMouseDown={stageDown} onMouseMove={stageMove} onMouseUp={stageUp}
          onDragLeave={(e) => { if (!stageRef.current?.contains(e.relatedTarget)) clearOver(); }} onDrop={clearOver} onDragEnd={clearOver}>
          {rubber && <div className="bge-rubber" style={{ left: rubber.left, top: rubber.top, width: rubber.w, height: rubber.h }} />}
          {boxes.map((b) => (
            <div key={b.key} className="bge-sheet bge-edit"
              style={{ width: sheetW, '--bge-cw': `${cellW}px`, '--bge-ch': `${cellH}px`,
                '--bge-deckh': `${maxTiers.deck * cellH}px`, '--bge-holdh': `${maxTiers.hold * cellH}px` }}>
              <div className="bge-sheet-title" style={{ textAlign: 'center', fontWeight: 800, fontSize: 14, marginBottom: 6, flexShrink: 0 }}>
                {shipName} {voyageInfo || ''} — {mode === 'loading' ? '선적' : '양하'} (BAY {b.label})
              </div>
              <div className="bge-sheet-body">
                <div className="bge-boxwrap">
                  <div className="bge-boxh">BAY {b.label}{b.even ? ` — 40ft ${b.even} / 20ft ${b.odd}` : ' — 20ft 단독'}</div>
                  <div className="bge-boxbody">
                    {b.data
                      ? <BayBoxV2 data={b.data} colorMap={colorMap} gridCols={gridCols} applyHatch
                          renderCellContent={makeContent(b)} cellExtra={makeExtra(b)} />
                      : <div style={{ padding: 14, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>매트릭스 없음</div>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bge-side bge-noprint">
          <div className="bge-tabs">
            <button className={tab === 'sel' ? 'on' : ''} onClick={() => setTab('sel')}>✓ 선택 {selected.size}</button>
            <button className={tab === 'stg' ? 'on' : ''} onClick={() => setTab('stg')}>📦 창고 {stgList.length}</button>
            <button className={tab === 'chg' ? 'on' : ''} onClick={() => setTab('chg')}>변경 {changes.length}</button>
            <button className={tab === 'opn' ? 'on' : ''} style={stgList.length ? { color: '#a3e635' } : undefined}
              onClick={() => setTab('opn')}>🅿 빈자리 {openSlots.length}</button>
            <button className={tab === 'hid' ? 'on' : ''} style={hidden.length ? { color: '#fca5a5' } : undefined}
              onClick={() => setTab('hid')}>⚠ 안 보임 {hidden.length}</button>
          </div>

          {tab === 'sel' && (
            <>
              <div style={{ padding: '8px 8px 4px', fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
                셀 <b style={{ color: '#e2e8f0' }}>클릭</b> = 하나씩 넣고 빼기<br />
                <b style={{ color: '#e2e8f0' }}>Shift</b>+영역 = 추가 · <b style={{ color: '#e2e8f0' }}>Ctrl</b>(⌘)+영역 = 제외<br />
                선택분 중 하나를 끌면 <b style={{ color: '#e2e8f0' }}>전체가 함께</b> 이동
              </div>
              <div style={{ padding: '0 8px 6px', display: 'flex', gap: 6 }}>
                <button className="bge-btn p" style={{ flex: 1 }} disabled={!selected.size} onClick={sendSelected}>선택 {selected.size}대 보관</button>
                <button className="bge-btn" disabled={!selected.size} onClick={() => setSelected(new Set())}>전체 해제</button>
              </div>
              <div className="bge-list">
                {selected.size === 0 && <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 16 }}>선택 없음</div>}
                {[...selected].sort().map((cn) => (
                  <div key={cn} className="bge-chip" style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ flex: 1 }}>{cn} <span style={{ opacity: .55 }}>{isoToLabel(state.byCn.get(cn)?.iso) || ''}</span></span>
                    <button className="bge-btn r" style={{ padding: '1px 7px', fontSize: 12 }} title="선택에서 빼기" onClick={() => dropSel(cn)}>×</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'stg' && (
            <>
              <div className={`bge-drop${stgOver ? ' over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setStgOver(true); }}
                onDragLeave={() => setStgOver(false)} onDrop={dropStorage}>
                여기로 컨을 끌어다 놓기<br />= 임시창고 보관
                <br /><span style={{ color: '#fbbf24' }}>미배정</span> = EDI에 자리 없는 컨 (호출해서 베이에 놓으십시오)
              </div>
              <div className="bge-list">
                {stgList.length === 0 && <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 16 }}>비어 있음</div>}
                {stgList.map((cn) => (
                  <div key={cn} className="bge-chip" draggable onDragStart={(e) => dragStart(e, cn)} onDragEnd={clearOver} title="베이 칸으로 끌어 배치">
                    {cn} <span style={{ opacity: .55 }}>{isoToLabel(state.byCn.get(cn)?.iso) || ''}</span>
                    {state.unplaced?.has(cn) && <span style={{ color: '#fbbf24', marginLeft: 4 }}>미배정</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'opn' && (
            <>
              <div className="bge-drop" style={{ borderColor: '#65a30d', color: '#a3e635' }}>
                선적 안 된 자리 <b>{openSlots.length}</b>곳
                <br />{stgList.length
                  ? <>임시창고에 <b>{stgList.length}대</b> 대기 중 — 자리를 누르면 놓을 컨을 골라 줍니다</>
                  : '놓을 컨이 임시창고에 없습니다'}
              </div>
              <div className="bge-list">
                {openByBox.length === 0 && <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 16 }}>빈 자리 없음</div>}
                {openByBox.map((g) => (
                  <div key={g.boxKey} className="bge-chg" style={{ cursor: 'pointer' }}
                    onClick={() => { setSelIdx(g.page); setMsg(`BAY ${g.label} — 빈 자리 ${g.slots.length}곳. 자리를 누르면 놓을 컨을 고릅니다`); }}>
                    <b>BAY {g.label}</b> — 빈 자리 {g.slots.length}곳<br />
                    <i>{g.slots.slice(0, 8).map((e) => `${e.sec} ${e.row}열 ${e.tier}단`).join(' · ')}{g.slots.length > 8 ? ` 외 ${g.slots.length - 8}곳` : ''}</i>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'chg' && (
            <div className="bge-list">
              {changes.length === 0 && <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 16 }}>변경 없음</div>}
              {changes.map((c) => (
                <div key={c.cn} className="bge-chg"><b>{c.shifting ? '◆ ' : ''}{c.cn}</b><br /><i>{c.fromLabel} → {c.toLabel}</i></div>
              ))}
            </div>
          )}

          {tab === 'hid' && (
            <>
              <div style={{ padding: '8px 8px 4px', fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
                격자에 그려지지 않아 손댈 수 없던 컨입니다.<br />
                <b style={{ color: '#e2e8f0' }}>좌표중복</b> = 같은 칸에 둘 이상 ·
                <b style={{ color: '#e2e8f0' }}> 격자 밖</b> = 베이사전에 없는 자리<br />
                보관으로 빼낸 뒤 원하는 칸에 다시 놓으십시오.
              </div>
              <div style={{ padding: '0 8px 6px' }}>
                <button className="bge-btn p" style={{ width: '100%' }} disabled={!hidden.length}
                  onClick={() => { const cns = hidden.map((h) => h.cn); setSelected(new Set(cns)); sendCns(cns); }}>
                  {hidden.length}대 전부 임시창고로
                </button>
              </div>
              <div className="bge-list">
                {hidden.length === 0 && <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 16 }}>없음 — 모두 격자에 보입니다</div>}
                {hidden.map((h) => (
                  <div key={h.cn} className="bge-chip" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ flex: 1 }}>{h.cn}
                      <span style={{ opacity: .6 }}> {isoToLabel(state.byCn.get(h.cn)?.iso) || ''}</span><br />
                      <span style={{ fontSize: 11, color: h.why === '좌표중복' ? '#fca5a5' : '#fcd34d' }}>
                        {h.why} · {h.bay}베이 {h.row}행 {h.tier}단</span>
                    </span>
                    <button className="bge-btn p" style={{ padding: '2px 7px', fontSize: 11 }}
                      title="임시창고로 보내기" onClick={() => sendCns([h.cn])}>보관</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {sideExtra}
        </div>
      </div>

      {/* V9.23-07: 빈 자리를 누르면 뜨는 '놓을 컨 고르기'. 좌표를 외워 끌 필요가 없다. */}
      {picker && (
        <div className="bge-pick-back" onClick={() => setPicker(null)}>
          <div className="bge-pick" onClick={(e) => e.stopPropagation()}>
            <div className="bge-pick-h">
              BAY {picker.label} · {P.pad2(picker.row)}열 {picker.tier}단
              <span>여기에 놓을 컨을 고르십시오</span>
            </div>
            <div className="bge-pick-list">
              {stgList.length === 0 && <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', padding: 20 }}>임시창고가 비어 있습니다</div>}
              {stgList.map((cn) => {
                const c = state.byCn.get(cn) || {};
                return (
                  <button key={cn} className="bge-pick-item" onClick={() => {
                    const opts = picker.even ? { pairEven: picker.even, pairOdd: picker.odd } : {};
                    const r = P.placeAt(state, cn, picker.even || picker.odd, picker.row, picker.tier, opts);
                    setMsg(r.ok
                      ? `${cn} → BAY ${picker.label} ${P.pad2(picker.row)}열 ${picker.tier}단 선적`
                      : `놓을 수 없습니다: ${r.reason}`);
                    if (r.ok) setPicker(null);
                    bump();
                  }}>
                    <b>{cn}</b>
                    <span>{isoToLabel(c.iso) || c.iso || ''} {c.pol || ''}→{c.pod || ''}
                      {state.unplaced?.has(cn) && <em> · 미배정</em>}</span>
                  </button>
                );
              })}
            </div>
            <button className="bge-btn r" style={{ margin: 8 }} onClick={() => setPicker(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
