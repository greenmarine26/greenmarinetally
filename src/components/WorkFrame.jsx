// 작업 화면 한 화면 고정 틀(4.27) — 맨 위 한 줄(베이·단·남은 대수·◀ 전 화면) · 위 칸(카드·확인 단추) · 아래 칸(변경 단추·나머지, 스크롤)
//   검수사 2026-10-15 07:45 «자동이나 수동이나 한 화면에 나와야 합니다. 선적 또는 양하 버튼까지 스크롤 되게 하면 안됩니다.» ·
//   08:36 «기존 자동과 수동 화면의 크기는 베이뷰 자동화면 크기로 맞추고» · 08:39 «상단 한줄 베이표시 (예를 들면 23(24)25 홀드/데크 맨오른쪽에는 전화면으로» ·
//   08:43 «상단엔 카드 앞뒤 두장과 일괄선적(양하)버튼 하단엔 변경사항».
//   ⚠ 틀만 그린다 — 판정·저장은 부르는 쪽(GuidedWorkPanel·SearchPanel TwinSearch)이 종전 그대로 한다.
//   ⚠ 뒤로가기(폰)는 ◀ 전 화면과 같다. onBack 은 ref 로 본다(deps 가 바뀔 때마다 history 를 또 쌓지 않게) · 틀 칸(wf)은 하나만 쌓는다.
//   높이 — 위 칸은 내용 크기(넘치면 위 칸만 줄어 스크롤) · 확인 단추 칸은 늘 보임 · 아래 칸은 나머지(최소 64px — 단추 한 줄, 스크롤).
import React, { useRef, useCallback, useEffect } from 'react';

const pad2 = (n) => String(n).padStart(2, '0');

//  묶음 이름을 검수사 꼴로 — «05(06)07»(앞 20 · (40) · 뒤 20). 홀수 베이 하나뿐이면 «05(06)» / «(06)07», 짝수만이면 «(06)», 묶음이 아니면 그 베이 번호.
export function bayGroupText(bays, center) {
  const list = [...new Set((bays || []).map((b) => parseInt(b, 10)).filter((b) => b > 0))].sort((a, b) => a - b);
  const c = parseInt(center, 10);
  if (!(c > 0)) return list.map(pad2).join('·');
  const odd = list.filter((b) => b % 2 === 1);
  if (c % 2 === 1 && !list.some((b) => b % 2 === 0)) return pad2(c);   // 홀수 베이 하나짜리 묶음(40 없음)
  const lo = odd.filter((b) => b < c), hi = odd.filter((b) => b > c);
  return `${lo.length ? pad2(lo[lo.length - 1]) : ''}(${pad2(c)})${hi.length ? pad2(hi[0]) : ''}`;
}

export const wfChip = (cls) => `px-2 py-0.5 rounded-pill text-xxs font-black shrink-0 ${cls}`;

//  맨 위 한 줄의 앞쪽(모드·자동/수동·베이·단·남은) — 두 화면이 같은 꼴로 쓰게 한 벌
export function WorkBarInfo({ mode, kind, bayText, tier, remain }) {
  return (
    <>{/* 낱말 사이 빈칸({' '}) — 플렉스 줄에서는 그려지지 않고(공백만인 글은 칸이 안 된다) 글로 읽을 때만 띄운다(음성·검사) */}
      <span className={wfChip(mode === 'loading' ? 'bg-sky-800 text-sky-100' : 'bg-rose-800 text-rose-100')}>{mode === 'loading' ? '선적' : '양하'}</span>{' '}
      <span className={wfChip(kind === 'auto' ? 'bg-violet-700 text-white' : 'bg-amber-700 text-white')}>{kind === 'auto' ? '자동' : '수동'}</span>{' '}
      {bayText ? <span className="mono font-black text-amber-300 text-base shrink-0" data-wf-bay="1">{bayText}</span> : null}{' '}
      {tier === 'deck' || tier === 'hold'
        ? <span className={wfChip(tier === 'hold' ? 'bg-amber-700 text-white' : 'bg-sky-700 text-white')}>{tier === 'hold' ? '🟠 홀드' : '🔵 데크'}</span>
        : null}{' '}
      {remain != null ? <span className="text-xxs text-dim-300 truncate" data-wf-remain="1">남은 {remain}대</span> : null}
    </>
  );
}

export default function WorkFrame({ bar, top, action, bottom, onBack, backLabel = '◀ 전 화면', name = '' }) {
  const backRef = useRef(onBack); backRef.current = onBack;
  const back = useCallback(() => { if (backRef.current) backRef.current(); }, []);
  //  폰 뒤로가기 — 가짜 history 칸은 하나만(App B-6 홈 가드와 같은 꼴). 지금 칸이 이미 틀 칸(wf)이면 더 쌓지 않는다 — 틀을 열고 닫을 때마다 칸이 쌓이던 자리(4.27 감사 하-1).
  useEffect(() => {
    const st = window.history.state;
    if (!(st && st.wf)) window.history.pushState({ inApp: true, wf: 1 }, '');
    const h = () => { back(); window.history.pushState({ inApp: true, wf: 1 }, ''); };
    window.addEventListener('popstate', h);
    return () => window.removeEventListener('popstate', h);
  }, [back]);
  return (
    <div className="fixed inset-0 z-[45] bg-ink-950 text-ink-100 flex flex-col" style={{ height: '100dvh', margin: 0 }} data-workframe={name || '1'}>{/* margin 0 — 부모의 space-y 가 고정 틀을 12px 밀어 내렸다(실측) */}
      <div className="h-10 shrink-0 flex items-center gap-1.5 px-2 bg-ink-900 border-b border-line whitespace-nowrap" data-wf-bar="1">
        <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden">{bar}</div>{' '}
        <button onClick={back} className="shrink-0 px-2.5 py-1 rounded-pill text-xs font-black bg-ink-800 border border-line text-dim-100" data-wf-back="1">{backLabel}</button>
      </div>
      <div className="min-h-0 overflow-y-auto px-2 pt-2 space-y-2" style={{ flex: '0 1 auto' }} data-wf-top="1">{top}</div>
      <div className="shrink-0 px-2 pt-2 pb-2" data-wf-action="1">{action}</div>
      <div className="overflow-y-auto px-2 py-2 space-y-1.5 border-t-2 border-line bg-ink-900/60" style={{ flex: '1 1 0px', minHeight: '64px' }} data-wf-bottom="1">{bottom}</div>
    </div>
  );
}
