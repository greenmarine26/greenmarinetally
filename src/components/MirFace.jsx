// 미르 얼굴(React) — mirFaceArt 한 벌의 SVG 인형을 검수사 원본 그림으로 그린다. 기분(mood)에 따라 눈·입·눈물·땀이 움직인다
/* ★ TallyOne 3.57 — 떠 있는 미르(MirFab) 얼굴 버튼과 시트 머리가 이것을 쓴다. 판정은 mir.js [mirMood], 그림·CSS 는 mirFaceArt.js 한 벌(콘앱과 같다). */
import React, { useEffect, useMemo } from 'react';
import mirFaceUrl from '../assets/mir-face.png';
import { mirFaceSvg, ensureMirFaceCss } from './mirFaceArt.js';

let _seq = 0;
export default function MirFace({ mood = 'basic', size = 48, className = '', style = null }) {
  const id = useMemo(() => String(++_seq), []);
  useEffect(() => { ensureMirFaceCss(); }, []);
  const html = useMemo(() => mirFaceSvg(mood, size, mirFaceUrl, id), [mood, size, id]);
  return <span className={className} style={{ display: 'inline-block', width: size, height: size, lineHeight: 0, ...(style || {}) }} dangerouslySetInnerHTML={{ __html: html }} />;
}
