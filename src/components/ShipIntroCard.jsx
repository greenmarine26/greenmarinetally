// V9.18-01(2026-07-27): 선박 정보 카드 — 실제 제원(선종·IMO·국적·크기·건조년도·선사·항로)을
//   Google 검색 그라운딩으로 조회 + [이름 이야기](여자 이름·동물 이름 등 유래·명명 규칙) + 출처 링크.
//   사용자 확정: KMTC OSAKA 예시 형식 + "이름 풀이도 재미있어서 같이".
//   ship_intros/{shipId} 캐시 = 전 검수원 공유, 배마다 1회 생성이면 충분.
//   테스트 주입: loader/generator/saver를 prop으로 덮을 수 있다(기본 = firebase/gemini 실물).
import React, { useState, useEffect } from 'react';
import { Ship, Sparkles, RefreshCw } from 'lucide-react';
import { fbGetShipIntro, fbSaveShipIntro } from '../firebase.js';
import { askShipIntro } from '../gemini.js';
import { resolveShipKey } from '../utils.js';

export default function ShipIntroCard({ info, inspector,
  loader = fbGetShipIntro, generator = askShipIntro, saver = fbSaveShipIntro }) {
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState(undefined);   // undefined=로딩전, null=없음
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const shipId = resolveShipKey(info?.imo || info?.callsign || String(info?.vsl || '').toUpperCase().replace(/\s+/g, ''));
  const shipName = info?.vslFull || info?.vsl || '';

  useEffect(() => {
    if (!shipId) { setIntro(null); return; }
    let alive = true;
    loader(shipId)
      .then(v => { if (alive) { setIntro(v || null); if (v) window.__shipIntroCache = { ...(window.__shipIntroCache || {}), [shipId]: v.text }; } })
      .catch(() => { if (alive) setIntro(null); });
    return () => { alive = false; };
  }, [shipId]);

  const generate = async () => {
    if (busy || !shipName) return;
    setBusy(true); setErr('');
    try {
      const res = await generator({ name: shipName, callsign: info?.callsign || '', imo: info?.imo || '', carrier: info?.carrier || '' });
      if (!res.ok) { setErr(`생성 실패: ${res.error} — 헤더 ⋯ 메뉴에서 AI 검색 키를 확인하세요.`); return; }
      const rec = { text: res.text, sources: res.sources || [], by: inspector || '', at: Date.now() };
      setIntro(rec);
      window.__shipIntroCache = { ...(window.__shipIntroCache || {}), [shipId]: res.text };
      await saver(shipId, res.text, inspector || '', res.sources || []);
    } catch (e) {
      setErr(`생성 실패: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  if (!shipId || !shipName) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden mb-3">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left" style={{ minHeight: 44 }}>
        <Ship className="w-4 h-4 text-sky-300 shrink-0"/>
        <span className="text-[13px] font-bold text-slate-200 flex-1 truncate">이 배는? — {shipName}</span>
        {intro === undefined && <span className="text-[10px] text-slate-600">…</span>}
        {intro && <span className="text-[10px] text-emerald-400 font-bold shrink-0">소개 있음</span>}
        <span className="text-slate-500 text-xs shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          {intro ? (
            <>
              <div className="text-[13px] text-slate-300 leading-relaxed whitespace-pre-wrap">{intro.text}</div>
              {Array.isArray(intro.sources) && intro.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {intro.sources.map((sc, i) => (
                    <a key={i} href={sc.uri} target="_blank" rel="noreferrer"
                      className="text-[10px] px-2 py-1 rounded bg-slate-800 border border-slate-700 text-sky-300 truncate max-w-[160px]">
                      🔗 {sc.title || `출처 ${i + 1}`}
                    </a>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <div className="text-[10px] text-slate-600">
                  ✨ AI 웹 검색 · 참고용{intro.by ? ` · ${intro.by}` : ''}{intro.at ? ` · ${new Date(intro.at).toLocaleDateString('ko-KR')}` : ''}
                </div>
                <button onClick={generate} disabled={busy}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700">
                  <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`}/>{busy ? '생성 중…' : '다시 만들기'}
                </button>
              </div>
            </>
          ) : intro === null ? (
            <>
              <div className="text-[12px] text-slate-500 mb-2 leading-relaxed">
                아직 이 배의 정보가 없습니다. AI가 웹을 검색해 제원(선종·IMO·국적·크기·건조년도)·선사·항로와 이름의 유래까지 정리합니다 (한 번 만들면 모든 검수원이 같이 봅니다).
              </div>
              <button onClick={generate} disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sky-800 hover:bg-sky-700 text-sky-100 text-[13px] font-bold"
                style={{ minHeight: 44 }}>
                <Sparkles className="w-4 h-4"/>{busy ? '웹 검색 중…' : 'AI로 선박 정보 찾기'}
              </button>
            </>
          ) : (
            <div className="text-[12px] text-slate-600">불러오는 중…</div>
          )}
          {err && <div className="mt-2 text-[11px] text-red-300 leading-relaxed">{err}</div>}
        </div>
      )}
    </div>
  );
}
