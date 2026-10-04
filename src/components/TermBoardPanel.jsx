// 수석 실시간 보드 배 카드에 «터미널 본선 현황»(PCTC 본선작업현황·동방 본선 작업 현황)을 그리는 얇은 컴포넌트 — 숫자·모양은 termBoard.js 한 벌
import React, { useLayoutEffect } from 'react';
import { termBoardHtml, ensureTermBoardCss } from '../termBoard.js';

export function hasTermBoard(info) { return !!termBoardHtml(info); }

export default function TermBoardPanel({ info }) {
  useLayoutEffect(() => { ensureTermBoardCss(); }, []);   // 첫 그림 전에 CSS 를 넣는다 — 스타일 없는 표가 한 번 비치지 않게
  const html = termBoardHtml(info);
  if (!html) return null;
  return <div className="tbx-wrap sm:flex-1 sm:min-h-0 overflow-y-auto text-dim-200" onClick={(e) => e.stopPropagation()} dangerouslySetInnerHTML={{ __html: html }} />;
}
