// 미르 얼굴 단추(4.89) — 앱 화면에는 쓰지 않는다. 미르 시트를 혼자 그리는 연막 렌더(MirFab soloButton)에서만 제자리에 서서 시트를 여닫는다
/* ★ TallyOne 4.89 — 앱 화면에는 쓰지 않는다(검수사 2026-11-12 19:36 «미르를 숨기는것» — 미르는 검색줄 «미르야» 로 부른다). 미르 시트를 혼자 그리는 연막에서 시트를 여는 제자리 단추일 뿐이다.
   - 얼굴(MirFace) — 지금 기분, 답을 만드는 중이면 «생각» 얼굴
   - 기분 배지(.mir-mood-badge) · data-mood · mir-mood-<기분> 클래스 · title «지금 <기분> — <이유>»
   - 누르면 시트를 여닫는다(MirFab 의 여닫이 — 열 때 noteMirOpen 은 MirFab 이 부른다)
   - 기분 판정은 mir.js [mirMood] 한 벌(MirFab 이 재서 mirDock 에 놓는다) — 여기서는 그리기만 한다. */
import React, { useSyncExternalStore } from 'react';
import MirFace from './MirFace.jsx';
import { getMirDock, subscribeMirDock, toggleMirSheet } from '../faceDock.js';

export default function MirDockButton({ where = 'header', size = 'chip', className = '' }) {
  //  4.89: 가게 값이 바뀌면 그 자리에서 다시 그린다(useSyncExternalStore) — 답이 빨리 나와도 «생각» 얼굴이 한 번은 그려진다(종전 얼굴 단추와 같은 박자)
  const st = useSyncExternalStore(subscribeMirDock, getMirDock, getMirDock);
  if (!st.ready) return null;   // 로그인 전(MirFab 이 시트를 안 띄우는 때)에는 단추도 없다
  const mood = st.mood || { key: 'basic' };
  const face = st.busy ? 'think' : (mood.key || 'basic');
  const small = size === 'small';
  //  4.89: 머리띠는 칩 높이(--tap-chip 40/44px) · 틀 윗줄은 36px 얼굴 + 위아래 4px 여백(누르는 칸 44px)
  const box = small ? 'w-9 h-9' : 'w-[var(--tap-chip)] h-[var(--tap-chip)]';
  //  누르는 칸은 보이는 동그라미보다 넓다 — 안쪽 투명 칸(data-mir-hit)이 테두리 안쪽에서 사방으로 늘어나 44px 이상(칩 40 → 44 · 작은 얼굴 36 → 44)
  const facePx = small ? 32 : 36;
  return (
    <button type="button" aria-label="미르에게 묻기" aria-expanded={st.open ? 'true' : 'false'}
      data-mir-dock={where} data-mood={mood.key}
      title={mood.key !== 'basic' ? `지금 ${mood.label}${mood.why ? ' — ' + mood.why : ''}` : '미르에게 묻기'}
      onClick={(e) => { e.stopPropagation(); toggleMirSheet(where); }}
      className={`relative shrink-0 ${box} rounded-full border-2 ${st.open ? 'border-amber-300' : 'border-amber-500'} p-0 overflow-visible flex items-center justify-center active:scale-95 mir-mood mir-mood-${mood.key} ${className}`}
      style={{ background: '#f7f8fa' }}>
      <span aria-hidden="true" data-mir-hit="1" className="absolute rounded-full" style={{ inset: small ? -6 : -4 }} />
      <MirFace mood={face} size={facePx} style={{ borderRadius: '50%', overflow: 'hidden' }} />
      {mood.badge && <span className="mir-mood-badge" aria-hidden="true">{mood.badge}</span>}
    </button>
  );
}
