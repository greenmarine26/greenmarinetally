// 미르 얼굴(React) — 실사 미르의 기분별 얼굴 한 칸을 그린다. 기분(mood)이 바뀌면 통통 튀며 바뀌고 기분마다 몸짓이 다르다
/* ★ TallyOne 4.07 — 떠 있는 미르(MirFab) 얼굴 버튼·시트 머리·검색창 옆 아바타가 이것을 쓴다. 판정은 mir.js [mirMood], 그림·CSS 는 mirPhotoArt.js 한 벌(콘앱과 같다).
   (3.57~4.06 의 그림 인형 mirFaceArt.js 는 이 판부터 앱에서 쓰지 않는다 — 실사 사진으로 바꿨다.) */
import React, { useMemo } from 'react';
import { mirPhotoHtml, ensureMirPhotoCss } from './mirPhotoArt.js';

export default function MirFace({ mood = 'basic', size = 48, className = '', style = null, still = false }) {
  //  CSS 는 그리기 전에 넣는다(effect 는 첫 화면 뒤라 한 번 깜빡인다). 같은 문서에 한 번만 들어간다.
  const html = useMemo(() => { ensureMirPhotoCss(); return mirPhotoHtml(mood, size, still); }, [mood, size, still]);
  return <span className={className} style={{ display: 'inline-block', width: size, height: size, lineHeight: 0, ...(style || {}) }} dangerouslySetInnerHTML={{ __html: html }} />;
}
