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

//  ★ 5.00-02 — 문장 속 컨 번호 한 벌. 경고·안내 문구는 문자열로 만들어져 오므로(diagnostics.js msg 등) 그리는 자리 한 곳에서
//    열한 자 컨 번호(접두 4자 + 숫자 7자리)만 찾아 CnText 로 바꿔 그린다. 문자열을 만드는 쪽은 그대로 둔다(미르·음성이 같은 문자열을 읽는다).
//    5.00-01 라이브 확인 — OBWH 2791E «주의 2» 띠의 «… 리스트 매칭 52대 — CICU3004578, CICU3006863 …» 가 붙은 채로 나왔다.
const CN_IN_TEXT = /(?<![A-Z0-9])([A-Z]{4}\d{7})(?![0-9])/g;
export function CnInline({ text, cnClassName = '' }) {
  const s = text == null ? '' : String(text);
  if (!/[A-Z]{4}\d{7}/.test(s)) return s;
  const out = []; let last = 0, m, i = 0;
  CN_IN_TEXT.lastIndex = 0;
  while ((m = CN_IN_TEXT.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(<CnText key={`cn${i++}`} cn={m[1]} className={cnClassName} />);
    last = m.index + m[1].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return <>{out}</>;
}

