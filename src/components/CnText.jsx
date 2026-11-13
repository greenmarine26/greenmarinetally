// 컨테이너 번호 한 벌 표기 — 접두 4자 · 앞 숫자 3자 · 끝 4자리를 나눠 그리고, 모양(크기·색·띄움)은 CSS(html data-cn · .cn-*)가 정한다(디자인 시안 — 커밋 전).
import React from 'react';

//  where — 'guide'(작업 카드 큰 번호) · 'guideSm'(베이뷰 위 칸) · 'guideXs'(베이모드 한 줄) · 'head'(컨 상세 맨 위) · 'line'(목록·상세 본문 한 줄)
export default function CnText({ cn, where = 'line', className = '' }) {
  const s = String(cn || '');
  const cls = `cn cn-${where} ${className}`.trim();
  if (!/^[A-Z]{4}\d{7}$/.test(s)) return <span className={cls}>{s}</span>;
  return (
    <span className={cls} aria-label={s}>
      <span className="cn-p">{s.slice(0, 4)}</span><span className="cn-m">{s.slice(4, 7)}</span><span className="cn-l">{s.slice(7)}</span>
    </span>
  );
}
