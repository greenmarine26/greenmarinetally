// V9.18(2026-07-27): 선박 소개 · 이름 유래 카드 (사용자 요청)
//   "선박에 대한 간단한 소개 또는 선박명의 유래" — 항차 화면 하단 정보 구역에 접이식 카드.
//   동작: ship_intros/{shipId} 캐시가 있으면 그대로 표시(전 검수원 공유),
//        없으면 [AI로 소개 만들기] — Gemini가 이름 풀이 중심으로 4문장 이내 생성 후 저장.
//   환각 방지: 프롬프트가 "확인 불가한 사실 금지"를 강제, 카드에 "AI 생성 · 참고용" 상시 표기.
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
      const rec = { text: res.text, by: inspector || '', at: Date.now() };
      setIntro(rec);
      window.__shipIntroCache = { ...(window.__shipIntroCache || {}), [shipId]: res.text };
      await saver(shipId, res.text, inspector || '');
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
              <div className="flex items-center justify-between mt-2">
                <div className="text-[10px] text-slate-600">
                  ✨ AI 생성 · 참고용{intro.by ? ` · ${intro.by}` : ''}{intro.at ? ` · ${new Date(intro.at).toLocaleDateString('ko-KR')}` : ''}
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
                아직 이 배의 소개가 없습니다. AI가 선박명의 뜻·유래를 풀이해 줍니다 (한 번 만들면 모든 검수원이 같이 봅니다).
              </div>
              <button onClick={generate} disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sky-800 hover:bg-sky-700 text-sky-100 text-[13px] font-bold"
                style={{ minHeight: 44 }}>
                <Sparkles className="w-4 h-4"/>{busy ? '생성 중…' : 'AI로 소개 만들기'}
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
