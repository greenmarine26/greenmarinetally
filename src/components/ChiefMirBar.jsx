// 수석 상황판 탭 줄 안의 미르 칸(5.00-02) — 상황판·진행·마감·도구 다음 넷째 칸, 누르면 다른 화면의 «미르야» 와 같은 미르 시트(MirFab 한 벌)를 연다
/* ★ TallyOne 5.00-02 — 검수사 2026-11-13 17:55 «수석관리창에 항상 빈곳이 있씁니다. 그안에 미르를 넣어 주세요» · 18:19 탭 줄 사진 «이안에 넣으세요».
   - 수석 상황판에는 검색줄이 없어(4.24 «검색창을 없애고 미르로») 4.89 에 얼굴 단추를 없앤 뒤로 미르를 부를 길이 없었다.
   - 탭(role=tab)이 아니라 창을 여는 문 — 출력 단추와 같은 hud-door(호박색). 지금 탭을 바꾸지 않는다.
   - 답·기분·시트는 MirFab 한 벌(faceDock 의 여닫이 toggleMirSheet) — 여기서는 그리기만 한다. 따로 답하지 않는다.
   - 로그인 전(시트가 없을 때)에는 그리지 않는다(MirDockButton 과 같은 규칙). */
import React, { useSyncExternalStore } from 'react';
import MirFace from './MirFace.jsx';
import { getMirDock, subscribeMirDock, toggleMirSheet } from '../faceDock.js';

export default function ChiefMirBar() {
  const st = useSyncExternalStore(subscribeMirDock, getMirDock, getMirDock);
  if (!st.ready) return null;
  const mood = st.mood || { key: 'basic' };
  const face = st.busy ? 'think' : (mood.key || 'basic');
  return (
    <button type="button" data-chief-mir="1" data-mood={mood.key} aria-label="미르에게 묻기" aria-expanded={st.open ? 'true' : 'false'}
      title={mood.key !== 'basic' ? `미르에게 묻기 — 지금 ${mood.label}${mood.why ? ' · ' + mood.why : ''}` : '미르에게 묻기 — 🎤 말·⌨ 글'}
      onClick={(e) => { e.stopPropagation(); toggleMirSheet('chief-bar'); }}
      className="hud-tab hud-door min-[700px]:flex-none min-[700px]:px-4">
      <span className="hud-ico rounded-full overflow-hidden inline-flex items-center justify-center" aria-hidden="true" style={{ width: 24, height: 24, background: '#f7f8fa' }}>
        <MirFace mood={face} size={24} style={{ borderRadius: '50%', overflow: 'hidden' }} />
      </span>미르
    </button>
  );
}
