// V9.18-01(2026-07-27): 선박 정보 카드 — 실제 제원(선종·IMO·국적·크기·건조년도·선사·항로)을
//   Google 검색 그라운딩으로 조회 + [이름 이야기](여자 이름·동물 이름 등 유래·명명 규칙) + 출처 링크.
//   사용자 확정: KMTC OSAKA 예시 형식 + "이름 풀이도 재미있어서 같이".
//   ship_intros/{shipId} 캐시 = 전 검수원 공유, 배마다 1회 생성이면 충분.
//   테스트 주입: loader/generator/saver를 prop으로 덮을 수 있다(기본 = firebase/gemini 실물).
import React, { useState, useEffect, useMemo } from 'react';
import { Ship, Sparkles, RefreshCw } from 'lucide-react';
import { fbGetShipIntro, fbSaveShipIntro } from '../firebase.js';
import { askShipIntro } from '../gemini.js';
import { resolveShipKey } from '../utils.js';

// V9.18-02: 표시/검색용 선박명 해석 — vslFull → PORT-MIS 선박명(콜사인 매칭) → 약자.
//   약자(2~5자 코드, 예: DXQD)만 남으면 needsName=true — 검색이 "확인되지 않았습니다"로 끝나기 때문
//   (사용자 보고). 이때 카드가 풀네임 입력칸을 연다. (순수 함수 — 시뮬 대상)
export function resolveShipDisplayName(info, portMisData = {}) {
  const vslFull = String(info?.vslFull || '').trim();
  if (vslFull && !/^[A-Z0-9]{2,5}$/.test(vslFull)) return { name: vslFull, needsName: false, from: 'edi' };
  const cs = String(info?.callsign || '').toUpperCase();
  const pm = cs && portMisData[cs];
  const pmName = String(pm?.vesselName || '').trim();
  if (pmName && pmName.length >= 6) return { name: pmName, needsName: false, from: 'portmis' };
  const code = String(info?.vsl || '').trim();
  // 약자만 있음 — IMO가 있으면 그걸로 검색은 가능하지만, 이름 입력을 권한다
  return { name: code, needsName: true, from: 'code' };
}

export default function ShipIntroCard({ info, inspector, portMisData = {},
  loader = fbGetShipIntro, generator = askShipIntro, saver = fbSaveShipIntro }) {
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState(undefined);   // undefined=로딩전, null=없음
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [manualName, setManualName] = useState('');   // V9.18-02: 약자뿐일 때 풀네임 직접 입력

  const shipId = resolveShipKey(info?.imo || info?.callsign || String(info?.vsl || '').toUpperCase().replace(/\s+/g, ''));
  const resolved = resolveShipDisplayName(info, portMisData);
  const shipName = (manualName.trim() || resolved.name || '').toUpperCase();
  const needsName = resolved.needsName && !manualName.trim();

  // TallyOne 1.39: **같은 배가 여러 키로 저장돼 있어 조회 키에 따라 있다/없다가 갈렸다.**
  //   shipId 는 `imo || callsign || 선박명` 순으로 정해지는데, 항차마다 채워진 필드가 달라
  //   한 배가 IMO·콜사인·코드 세 키로 흩어졌다(실측: XIN QUN DAO 가 `9361067`·`DXQD`·`H3OI` 로 3중 저장,
  //   ship_intros 100건 중 실제 배는 약 35척). 검수사 신고: *"맞는 게 있고 빈 자료만 있는 게 있다."*
  //   → **읽을 때 후보 키를 순서대로 다 찾아본다.** 하나라도 있으면 그것을 쓴다.
  //   쓸 때는 종전대로 대표 키(shipId) 하나에만 저장한다 — 중복을 더 늘리지 않는다.
  const altKeys = useMemo(() => {
    const raw = [info?.imo, info?.callsign, String(info?.vsl || '').toUpperCase().replace(/\s+/g, '')];
    const seen = new Set(); const out = [];
    raw.forEach(v => { const k = resolveShipKey(v); if (k && !seen.has(k)) { seen.add(k); out.push(k); } });
    return out;
  }, [info?.imo, info?.callsign, info?.vsl]);

  useEffect(() => {
    if (!altKeys.length) { setIntro(null); return; }
    let alive = true;
    (async () => {
      for (const k of altKeys) {
        try {
          const v = await loader(k);
          if (!alive) return;
          if (v && v.text) {
            setIntro(v);
            window.__shipIntroCache = { ...(window.__shipIntroCache || {}), [shipId]: v.text, [k]: v.text };
            return;
          }
        } catch (e) { /* 다음 키로 */ }
      }
      if (alive) setIntro(null);
    })();
    return () => { alive = false; };
  }, [altKeys.join('|')]);

  const generate = async () => {
    if (busy || !shipName) return;
    setBusy(true); setErr('');
    try {
      const res = await generator({ name: shipName, callsign: info?.callsign || '', imo: info?.imo || '', carrier: info?.carrier || '' });
      // eslint-disable-next-line no-unused-expressions
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
              {resolved.needsName && (
                <div className="mb-2">
                  <div className="text-[11px] text-amber-300/90 mb-1 leading-relaxed">
                    ⚠ 지금은 약자({resolved.name})뿐이라 검색이 안 될 수 있습니다{info?.imo ? ' (IMO로 시도는 가능)' : ''}. 선박 영문 풀네임을 알면 넣어 주세요.
                  </div>
                  <input type="text" value={manualName} onChange={e => setManualName(e.target.value)}
                    placeholder="예: XIN QUN DAO"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    style={{ minHeight: 40 }}/>
                </div>
              )}
              <button onClick={generate} disabled={busy || (needsName && !info?.imo)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sky-800 hover:bg-sky-700 disabled:bg-slate-800 disabled:text-slate-600 text-sky-100 text-[13px] font-bold"
                style={{ minHeight: 44 }}>
                <Sparkles className="w-4 h-4"/>{busy ? '웹 검색 중…' : needsName && !info?.imo ? '풀네임 입력 후 검색 가능' : 'AI로 선박 정보 찾기'}
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
