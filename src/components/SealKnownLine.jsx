// 실번호 칸 아래 «다른 자료 실»(자료마다 적힌 실)·«세관 잘림»·«앞자리 0 빠짐» 안내 한 줄 — 리스트 카드·자동 가이드·컨 상세·큰 카드가 같이 쓴다(TallyOne 4.49)
//   판정은 utils.sealCheckOf 한 벌. 검수사 2026-10-24 12:50 «다 보이고 하나만 맞으면 맞음» · «큰 글씨 실은 세관 값» · «MLPH 끝자리 빠짐은 실오류로 센다».
import React from 'react';
import { sealCheckOf, isRfListSrc } from '../utils.js';   // 4.49-02: RF 리스트 출처 표기

//  출처 글자 — 파일 이름은 길어서 짧게(세관 · EDI · 보조실 · 선사 리스트)
function srcLabel(k) {
  if (k.customs) return '세관';
  if (k.kind === 'edi' || (k.srcs || []).includes('EDI')) return 'EDI';
  if (k.kind === 'alt') return '보조실';
  if (k.kind === 'orig') return '처음 리스트';
  if ((k.srcs || []).length && k.srcs.every((sv) => isRfListSrc(sv))) return 'RF 리스트';   // 4.49-02 감사(하-3): RF 리스트에만 있는 실
  return '선사 리스트';
}

export default function SealKnownLine({ c, ediSl, size = 'sm', className = '', showError = false }) {
  let k = null;
  try { k = sealCheckOf(c, ediSl); } catch (e) { console.warn('[4.49 실번호] 다른 자료 실 판정 실패 — 줄을 그리지 않습니다:', c && c.cn, e); return null; }
  if (!k) return null;
  //  화면 큰 글씨 = 검수원이 고쳤으면 실물, 아니면 큰 실(세관 값이 있으면 세관) — 그 값을 뺀 나머지를 «다른 자료 실»로
  const shownN = String((k.edited ? k.actual : k.big) || '').toUpperCase().replace(/[\s\-]/g, '');
  const others = k.known.filter((x) => x.n !== shownN);
  const err = showError && k.error;
  const truncErr = !!(k.trunc && k.error && k.decl);   // 감사(중-4) — 끝자리 빠짐 줄은 실오류일 때만(검수원이 신고 값으로 확인했으면 안 낸다)
  const zeroErr = !!(k.zero && k.error && k.decl);   // 4.49-02 — 신고 실의 앞자리 0 빠짐(검수사 2026-10-25 «실오류입니다»)
  if (!others.length && !truncErr && !zeroErr && !err) return null;
  const fs = size === 'xs' ? 'text-3xs' : 'text-2xs';
  return (
    <div className={`${fs} leading-tight mt-0.5 ${className}`} data-seal-known={k.known.length}>
      {others.length > 0 && (
        <div className="text-dim-300">
          다른 자료 실{' '}
          {others.map((x, i) => (
            <span key={x.n} className="mono text-amber-100/90">{i ? ' · ' : ''}{x.v}<span className="text-dim-400"> ({srcLabel(x)})</span></span>
          ))}
          {!truncErr && !zeroErr && <span className="text-dim-400"> — 실물이 이 가운데 하나면 맞음</span>}{/* 감사(하-3): 끝자리 빠짐이면 «하나면 맞음» 과 «실오류» 가 엇갈리므로 뺀다 */}
        </div>
      )}
      {err && (
        <div className="text-red-300 font-bold" data-seal-error="1">🚨 실오류 — 신고 {k.from} → 실물 {k.actual} (세관 신고 대상)</div>
      )}
      {truncErr && (
        <div className="text-amber-300" data-seal-trunc="1">
          ⚠ 신고 실 {k.decl.v} 은 {k.truncLong} 의 끝자리가 빠진 값입니다 — 실오류(신고 정정 대상)로 셉니다.
        </div>
      )}
      {zeroErr && (
        <div className="text-amber-300" data-seal-zero="1">
          ⚠ 신고 실 {k.decl.v} 은 {k.zeroLong} 의 앞자리 0 이 빠진 값입니다 — 실오류(신고 정정 대상)로 셉니다.
        </div>
      )}
    </div>
  );
}
