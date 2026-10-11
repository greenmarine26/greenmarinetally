// 데미지 이력 카드 한 벌 — 컨번호·날짜로 과거(보관 포함) 데미지 기록과 사진을 보여 준다(통합검색 화면과 떠 있는 미르가 같이 쓴다)
/* ★ 4.22-04 (검수사 2026-10-11 «조회창이 두개가 나와 헷갈립니다» → 작업 시작 탭의 통합 검색 창을 뺐다 · Fable 판정 «누구는 안다고 하고 누구는 모른다고 하면 안되니까요»(2.36)):
     2.03 데미지 이력 카드는 GlobalSearchPage 안에만 있어서 그 창을 빼면 일반 검수원이 데미지 이력을 못 본다.
     그래서 판정·카드·사진 덮개를 여기 한 벌로 떼어 GlobalSearchPage(#/search · 수석 대시보드 인라인)와 떠 있는 미르(MirFab)가 같이 부른다.
     범위는 종전 그대로 — damageIndex 전체(항차·보관 무관, 수석 게이트 없음 — 종전 작업 시작 탭 창도 검수원에게 이 범위를 보였다).
     읽기 — 색인은 이 카드가 처음 그려질 때 한 번 GET(useDamageIndex · fbGetDamageIndex = get, 구독 아님)하고 세션 동안 기억한다.
       떠 있는 미르는 데미지 이력 질문이 들어왔을 때만 이 카드를 그리므로 그 전에는 읽지 않는다. */
import React, { useState, useMemo } from 'react';
import { useDamageIndex } from '../useCarrierContacts.js';   // 2.03: 데미지 색인(메타만)
import { fbGetDamagePhoto } from '../firebase.js';   // 2.03: 데미지 사진 단건

// 2.03 (검수사 확정 «SPSU2041959 혹시 17일날 데미지 잡힌게 있었을까요? 가끔 이런 메시지가 옵니다» ·
//   «쉽게 미르에게 8월 17일에 발생한 데미지건 알려줘 하면 보여줄수 있게»):
//   데미지 이력 질의 — 컨번호(전체) 또는 날짜(8월 17일 / 17일)와 «데미지» 가 같이 오면 색인을 뒤진다.
export function parseDamageHistoryQuery(q) {
  const t = String(q || '');
  if (!/데미지|damage|손상/i.test(t)) return null;
  const cnM = t.toUpperCase().replace(/\s/g, '').match(/[A-Z]{4}\d{7}/);
  let day = null;
  let m = t.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m) day = { mo: parseInt(m[1], 10), d: parseInt(m[2], 10) };
  else { m = t.match(/(\d{1,2})\s*일/); if (m) day = { mo: null, d: parseInt(m[1], 10) }; }
  if (!cnM && !day) return { recent: true };   // «데미지 기록/데미지건» — 최근 전부
  return { cn: cnM ? cnM[0] : null, day };
}
export function filterDamageHits(damageIndex, dq, now = new Date()) {
  const rows = [];
  Object.values(damageIndex || {}).forEach((m) => Object.values(m || {}).forEach((e) => { if (e && e.ts) rows.push(e); }));
  rows.sort((a, b) => b.ts - a.ts);
  if (!dq) return [];
  if (dq.recent) return rows.slice(0, 20);
  return rows.filter((e) => {
    if (dq.cn && String(e.cn).toUpperCase() !== dq.cn) return false;
    if (dq.day) {
      const d = new Date(e.ts);
      if (d.getDate() !== dq.day.d) return false;
      if (dq.day.mo != null && (d.getMonth() + 1) !== dq.day.mo) return false;
      if (dq.day.mo == null && (now - d) > 62 * 86400000) return false;   // 월 없이 «17일» = 최근 두 달 안
    }
    return true;
  });
}

//  ★ 2.58: 뜻·방법 갈래(asking)가 잡힌 질문에는 이력 카드를 띄우지 않는다 — «물이 새는데 데미지
//    어떻게 잡아야 해» 에 남의 항차 이력 목록이 나오던 자리(검수사 실측). «데미지 이력 보여줘»는 그대로.
//    parsed = nlSearch.parseNaturalQuery(q) — 부르는 쪽(GlobalSearchPage·MirFab)이 이미 가진 것을 넘긴다.
export function damageHistoryQueryOf(q, parsed) {
  return (parsed && parsed.asking) ? null : parseDamageHistoryQuery(q);
}

export default function DamageHistoryCard({ dmgQ }) {
  const damageIndex = useDamageIndex();   // 2.03: 데미지 색인(메타만)
  const [dmgPhotoView, setDmgPhotoView] = useState(null);   // 2.03: { loading } | { imgs:[..], cn } | { err }
  const dmgHits = useMemo(() => ((dmgQ && damageIndex && !damageIndex.__error) ? filterDamageHits(damageIndex, dmgQ) : []), [damageIndex, dmgQ]);
  const openDmgPhoto = async (e) => {
    setDmgPhotoView({ loading: true });
    try {
      const p = await fbGetDamagePhoto(e.voyageKey, e.ts);
      const imgs = [p?.data, p?.detailPhoto].filter(Boolean);
      setDmgPhotoView(imgs.length ? { imgs, cn: e.cn } : { err: '사진을 찾지 못했습니다 — 보관에서 지워졌을 수 있습니다' });
    } catch (er) { setDmgPhotoView({ err: '사진 불러오기 실패: ' + (er?.message || er) }); }
  };

  return (
    <>
      {/* 2.03: 데미지 이력 카드 — 컨번호·날짜로 과거(보관 포함) 데미지 조회 + 사진 */}
      {dmgQ && (
        <div className="bg-orange-950/40 border-2 border-orange-700 rounded-btn p-4 mb-3">
          <div className="text-xxs text-orange-400 font-bold uppercase mb-1">📷 데미지 이력</div>
          {damageIndex == null ? (
            <div className="text-sm text-dim-300">색인 불러오는 중…</div>
          ) : damageIndex.__error ? (
            <div className="text-sm text-red-300 font-bold">데미지 색인을 못 읽었습니다 — 신호를 확인하고 다시 물어 주세요</div>
          ) : dmgHits.length === 0 ? (
            <div className="text-sm text-dim-100">기록 없음 — {dmgQ.cn ? `${dmgQ.cn} 의 데미지 기록이 없습니다` : '해당 날짜의 데미지 기록이 없습니다'} (앱으로 보고·예약한 건 기준)</div>
          ) : (
            <div className="space-y-2">
              {dmgHits.map((e) => {
                const d = new Date(e.ts);
                const when = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                return (
                  <div key={`${e.cn}_${e.ts}`} className="flex items-center gap-2 bg-ink-900/60 border border-line rounded-pill px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm2 mono font-bold text-dim-100">{e.cn} <span className="text-dim-300 font-normal">{when} · {e.voyageKey}</span></div>
                      <div className="text-xxs text-dim-200 truncate">
                        {(e.damageParts || []).join(' & ')} {(e.damageTypes || []).join(' & ')}{e.points ? ` ${e.points}P` : ''}{e.dims ? ` (${e.dims})` : ''}{e.note ? ` — ${e.note}` : ''}
                      </div>
                    </div>
                    <button onClick={() => openDmgPhoto(e)} className="px-3 py-2 rounded-pill bg-orange-700 hover:bg-orange-600 text-white text-xs2 font-bold shrink-0">📷 사진</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {dmgPhotoView && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-3 gap-2" onClick={() => setDmgPhotoView(null)}>
          {dmgPhotoView.loading && <div className="fixed-white font-bold">사진 불러오는 중…</div>}
          {dmgPhotoView.err && <div className="text-[#fca5a5] font-bold text-sm">{dmgPhotoView.err}</div>}
          {(dmgPhotoView.imgs || []).map((src, i) => (
            <img key={i} src={src} alt="" className="max-h-[45vh] max-w-full rounded-pill border border-line-strong" />
          ))}
          {dmgPhotoView.imgs && <div className="fixed-white opacity-80 text-xs2 font-bold">{dmgPhotoView.cn} — 화면을 누르면 닫힙니다</div>}
        </div>
      )}
    </>
  );
}
