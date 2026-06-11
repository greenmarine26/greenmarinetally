// 가이드 작업 패널 (V7.94) — 앱이 크레인 순서대로 다음 컨테이너를 예측 제시, 검수사는 확인/수정만
// 흐름: 접안 방향(좌/우현) → 베이 그룹 선택 → 예측 카드 [확인]/[수정]/[수동 전환]
// 수정 3연속 = 플랜대로 진행되지 않음 판단 → 자동으로 수동 모드 전환
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Check, Pencil, Hand, Link2, ChevronLeft, Volume2, VolumeX, AlertTriangle, Snowflake, Loader2 } from 'lucide-react';
import { buildGuidedQueue } from '../guidedQueue.js';
import { getBayPairs, findTwinCandidate } from '../twin.js';
import { fbCompleteContainer, fbUpdateVoyageInfo } from '../firebase.js';
import { speak, spellKo } from '../voice.js';

const AUTO_MANUAL_THRESHOLD = 3;   // 수정 연속 N회 → 수동 전환

export default function GuidedWorkPanel({ voyage, voyageKey, inspector, allContainers, workFilter, onSwitchManual, onOpenContainer }) {
  const mode = workFilter;                                  // 'discharge' | 'loading'
  const shipImo = voyage?.info?.imo || '';
  const shipName = voyage?.info?.vsl || '';
  const berthSide = voyage?.info?.berthSide || '';          // 'starboard'(우현) | 'port'(좌현)

  const [selectedGroup, setSelectedGroup] = useState(null); // 그룹 center 베이 번호
  const [fixOpen, setFixOpen] = useState(false);
  const [fixQuery, setFixQuery] = useState('');
  const [consecFix, setConsecFix] = useState(0);
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);

  // 모드 작업분 (평택분, 미완료)
  const remaining = useMemo(
    () => allContainers.filter(c => c._mode === mode && c._ptk && !c._comp && c.bay && c.row && c.tier),
    [allContainers, mode]
  );
  const modeAll = useMemo(
    () => allContainers.filter(c => c._mode === mode && c._ptk && c.bay),
    [allContainers, mode]
  );

  const bayPairs = useMemo(() => getBayPairs(modeAll, shipImo, shipName), [modeAll, shipImo, shipName]);

  // 베이 → 그룹 center (홀수+짝꿍은 사이 짝수가 center, 단독 홀수는 자기 자신)
  const groupCenterOf = (bayStr) => {
    const b = parseInt(bayStr, 10);
    if (!Number.isFinite(b)) return null;
    if (b % 2 === 0) return b;
    const pair = bayPairs?.[String(b)];
    if (pair) return (b + parseInt(pair, 10)) / 2;
    return b;
  };

  // 그룹 목록 (남은 작업이 있는 그룹만)
  const groups = useMemo(() => {
    const map = {};
    for (const c of remaining) {
      const center = groupCenterOf(c.bay);
      if (center == null) continue;
      const g = (map[center] ||= { center, bays: new Set(), count: 0 });
      g.bays.add(parseInt(c.bay, 10));
      g.count++;
    }
    return Object.values(map).sort((a, b) => a.center - b.center);
  }, [remaining, bayPairs]);

  // 선택 그룹의 예측 큐
  const queue = useMemo(() => {
    if (selectedGroup == null) return [];
    const targets = remaining.filter(c => groupCenterOf(c.bay) === selectedGroup);
    return buildGuidedQueue({
      containers: targets, mode,
      evenRowsSeaSide: berthSide === 'starboard',           // 우현 접안 = 짝수 로우 해상쪽
      findTwin: (t, all, used) => findTwinCandidate(t, all, used, shipImo, shipName),
    });
  }, [remaining, selectedGroup, mode, berthSide, bayPairs, shipImo, shipName]);

  const card = queue[0] || null;
  const groupDone = useMemo(() => {
    if (selectedGroup == null) return 0;
    return allContainers.filter(c => c._mode === mode && c._ptk && c._comp && groupCenterOf(c.bay) === selectedGroup).length;
  }, [allContainers, mode, selectedGroup, bayPairs]);
  const groupTotal = groupDone + (selectedGroup == null ? 0 : remaining.filter(c => groupCenterOf(c.bay) === selectedGroup).length);

  // 카드 바뀌면 음성 안내
  const lastSpokenRef = useRef('');
  useEffect(() => {
    if (!card || !voiceOn) return;
    const key = card.main.cn + (card.twin?.cn || '');
    if (lastSpokenRef.current === key) return;
    lastSpokenRef.current = key;
    const parts = [`다음, ${spellKo(card.main.l4 || card.main.cn.slice(-4))}`];
    if (card.twin) parts.push(`트윈 ${spellKo(card.twin.l4 || card.twin.cn.slice(-4))}`);
    if (card.main._xray || card.twin?._xray) parts.push('엑스레이');
    speak(parts.join(', '));
  }, [card, voiceOn]);

  // 확인 (트윈은 둘 다 한 번에)
  const handleConfirm = async () => {
    if (!card || busy) return;
    setBusy(true);
    try {
      await fbCompleteContainer(voyageKey, mode, card.main.cn, inspector);
      if (card.twin) await fbCompleteContainer(voyageKey, mode, card.twin.cn, inspector);
      setConsecFix(0);
      setFixOpen(false); setFixQuery('');
    } finally { setBusy(false); }
  };

  // 수정: 실제 나온 컨을 입력 → 그 컨을 완료 처리, 예측 컨은 큐에 남음
  const fixMatches = useMemo(() => {
    const q = fixQuery.replace(/\s/g, '').toUpperCase();
    if (q.length < 3) return [];
    return remaining.filter(c => c.cn !== card?.main?.cn && c.cn !== card?.twin?.cn &&
      (c.cn.includes(q) || (c.l4 || c.cn.slice(-4)).includes(q))).slice(0, 6);
  }, [fixQuery, remaining, card]);

  const handleFixPick = async (c) => {
    if (busy) return;
    setBusy(true);
    try {
      await fbCompleteContainer(voyageKey, mode, c.cn, inspector);
      const twin = findTwinCandidate(c, remaining, new Set([c.cn]), shipImo, shipName);
      if (twin && window.confirm(`트윈 짝꿍 ${twin.cn}도 같이 ${mode === 'discharge' ? '양하' : '선적'}확인할까요?`)) {
        await fbCompleteContainer(voyageKey, mode, twin.cn, inspector);
      }
      const n = consecFix + 1;
      setConsecFix(n);
      setFixOpen(false); setFixQuery('');
      if (n >= AUTO_MANUAL_THRESHOLD) {
        speak('수동 모드로 전환합니다');
        alert(`수정이 ${AUTO_MANUAL_THRESHOLD}회 연속되었습니다.\n플랜대로 진행되지 않는 것으로 판단해 수동 모드로 전환합니다.`);
        onSwitchManual?.();
      }
    } finally { setBusy(false); }
  };

  if (mode !== 'discharge' && mode !== 'loading') return null;

  // ── 1단계: 접안 방향 입력 ──
  if (!berthSide) {
    return (
      <div className="bg-slate-900 border-2 border-violet-700 rounded-lg p-4 space-y-3">
        <div className="text-sm font-bold text-violet-300 text-center">접안 방향을 선택하세요</div>
        <div className="text-[11px] text-slate-400 text-center">크레인 작업 순서(육상↔해상)를 계산하는 기준입니다. 항차에 한 번만 저장됩니다.</div>
        <div className="flex gap-2">
          <button onClick={() => fbUpdateVoyageInfo(voyageKey, { berthSide: 'port' })}
            className="flex-1 py-5 rounded-lg bg-slate-800 hover:bg-violet-800 border border-slate-700 font-bold text-base text-slate-100">
            좌현 접안<div className="text-[10px] font-normal text-slate-400 mt-1">홀수 로우가 해상쪽</div>
          </button>
          <button onClick={() => fbUpdateVoyageInfo(voyageKey, { berthSide: 'starboard' })}
            className="flex-1 py-5 rounded-lg bg-slate-800 hover:bg-violet-800 border border-slate-700 font-bold text-base text-slate-100">
            우현 접안<div className="text-[10px] font-normal text-slate-400 mt-1">짝수 로우가 해상쪽</div>
          </button>
        </div>
      </div>
    );
  }

  // ── 2단계: 베이 그룹 선택 ──
  if (selectedGroup == null) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-violet-300">작업할 베이를 선택하세요</div>
          <button onClick={() => fbUpdateVoyageInfo(voyageKey, { berthSide: '' })}
            className="text-[10px] text-slate-500 hover:text-violet-300 underline">
            접안 {berthSide === 'starboard' ? '우현' : '좌현'} 변경
          </button>
        </div>
        {groups.length === 0 && <div className="text-xs text-slate-500 text-center py-4">남은 {mode === 'discharge' ? '양하' : '선적'} 작업이 없습니다.</div>}
        <div className="grid grid-cols-3 gap-2">
          {groups.map(g => (
            <button key={g.center} onClick={() => { setSelectedGroup(g.center); setConsecFix(0); }}
              className="py-3 rounded-lg bg-slate-800 hover:bg-violet-800 border border-slate-700 text-slate-100">
              <div className="font-bold text-base">B{[...g.bays].sort((a, b) => a - b).join('·')}</div>
              <div className="text-[10px] text-slate-400">남은 {g.count}대</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── 3단계: 예측 카드 ──
  const renderCon = (c, label, color) => (
    <div className={`rounded-lg border-2 p-3 ${color === 'amber' ? 'border-amber-600 bg-amber-950/30' : 'border-cyan-600 bg-cyan-950/30'}`}>
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className={`font-bold ${color === 'amber' ? 'text-amber-400' : 'text-cyan-400'}`}>{label}</span>
        <span className="text-slate-400 mono font-bold">{parseInt(c.bay, 10)}-{c.row}-{c.tier} {parseInt(c.tier, 10) >= 80 ? '데크' : '홀드'}</span>
      </div>
      <button onClick={() => onOpenContainer?.(c)} className="w-full text-left">
        <span className="mono text-xl font-bold text-slate-100">{c.cn.slice(0, -4)}</span>
        <span className="mono text-3xl font-black text-emerald-300">{c.cn.slice(-4)}</span>
      </button>
      <div className="flex flex-wrap gap-1 mt-1">
        {c._xray && <span className="px-1.5 py-0.5 rounded bg-fuchsia-700 text-fuchsia-100 text-[10px] font-bold">★XRAY</span>}
        {c.rf && <span className="px-1.5 py-0.5 rounded bg-sky-700 text-sky-100 text-[10px] font-bold"><Snowflake className="w-3 h-3 inline"/>리퍼{c.tmp ? ` ${c.tmp}` : ''}</span>}
        {c.dg && <span className="px-1.5 py-0.5 rounded bg-red-700 text-red-100 text-[10px] font-bold">DG</span>}
        {c.fr && <span className="px-1.5 py-0.5 rounded bg-orange-700 text-orange-100 text-[10px] font-bold">FR</span>}
        {c.ot && <span className="px-1.5 py-0.5 rounded bg-yellow-700 text-yellow-100 text-[10px] font-bold">O/T</span>}
        {c.fe === 'E' && <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 text-[10px] font-bold">EMPTY</span>}
        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">{c.tp || c.iso}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5">
        <button onClick={() => setSelectedGroup(null)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-300">
          <ChevronLeft className="w-4 h-4"/>베이 선택
        </button>
        <div className="text-xs font-bold text-violet-300">B{selectedGroup} 그룹 — {groupDone}/{groupTotal}대</div>
        <button onClick={() => setVoiceOn(v => !v)} className="text-slate-400 hover:text-violet-300">
          {voiceOn ? <Volume2 className="w-4 h-4"/> : <VolumeX className="w-4 h-4"/>}
        </button>
      </div>
      <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
        <div className="h-full bg-violet-600 transition-all" style={{ width: `${groupTotal ? (groupDone / groupTotal) * 100 : 0}%` }}/>
      </div>

      {!card ? (
        <div className="bg-emerald-950/40 border border-emerald-700 rounded-lg p-6 text-center">
          <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2"/>
          <div className="font-bold text-emerald-300">이 베이 그룹 {mode === 'discharge' ? '양하' : '선적'} 완료!</div>
          <button onClick={() => setSelectedGroup(null)} className="mt-3 px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm text-slate-200">다른 베이 선택</button>
        </div>
      ) : (
        <>
          <div className="text-[11px] text-center text-slate-400">
            다음 예측 <span className="text-violet-300 font-bold">{groupDone + 1}번째</span>
            {card.single && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-800 text-amber-100 font-bold">싱글모드 구간</span>}
          </div>
          {renderCon(card.main, card.twin ? '앞' : '단독', 'amber')}
          {card.twin && (
            <>
              <div className="flex items-center gap-2 px-2">
                <div className="flex-1 border-t border-slate-700"/>
                <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><Link2 className="w-3 h-3"/>트윈 짝꿍</div>
                <div className="flex-1 border-t border-slate-700"/>
              </div>
              {renderCon(card.twin, '뒤', 'cyan')}
            </>
          )}

          <button onClick={handleConfirm} disabled={busy}
            className="w-full py-4 rounded-lg font-bold text-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center gap-2">
            {busy ? <Loader2 className="w-5 h-5 animate-spin"/> : <Check className="w-6 h-6"/>}
            {card.twin ? `트윈 한 번에 ${mode === 'discharge' ? '양하' : '선적'}확인` : `${mode === 'discharge' ? '양하' : '선적'}확인`}
          </button>

          {!fixOpen ? (
            <button onClick={() => setFixOpen(true)}
              className="w-full py-2.5 rounded-lg font-bold text-sm bg-slate-800 hover:bg-amber-800 text-amber-300 flex items-center justify-center gap-2">
              <Pencil className="w-4 h-4"/>다른 컨테이너가 나옴 (수정)
            </button>
          ) : (
            <div className="bg-slate-900 border border-amber-700 rounded-lg p-2 space-y-2">
              <div className="text-[11px] text-amber-300 font-bold">실제 나온 컨테이너 번호 (끝 4자리 이상)</div>
              <input autoFocus value={fixQuery} onChange={e => setFixQuery(e.target.value)}
                placeholder="예: 1234 또는 SKLU1972626"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm mono text-slate-100"/>
              {fixMatches.map(c => (
                <button key={c.cn} onClick={() => handleFixPick(c)} disabled={busy}
                  className="w-full flex justify-between items-center bg-slate-800 hover:bg-amber-900 rounded px-2 py-1.5 text-xs">
                  <span className="mono font-bold text-slate-100">{c.cn}</span>
                  <span className="mono text-slate-400">{parseInt(c.bay, 10)}-{c.row}-{c.tier}</span>
                </button>
              ))}
              {fixQuery.length >= 3 && fixMatches.length === 0 && <div className="text-[11px] text-slate-500 text-center">남은 작업분에 일치하는 컨이 없습니다.</div>}
              <button onClick={() => { setFixOpen(false); setFixQuery(''); }} className="w-full text-[11px] text-slate-400 py-1">닫기</button>
            </div>
          )}

          {consecFix > 0 && (
            <div className="text-[11px] text-amber-400 text-center flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3"/>연속 수정 {consecFix}회 — {AUTO_MANUAL_THRESHOLD}회면 수동 모드로 전환됩니다
            </div>
          )}

          {/* 다음 예정 미리보기 */}
          {queue.length > 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2">
              <div className="text-[10px] text-slate-500 font-bold mb-1">다음 예정</div>
              {queue.slice(1, 5).map((q, i) => (
                <div key={q.main.cn} className="flex justify-between text-[11px] py-0.5 border-b border-slate-800 last:border-0">
                  <span className="text-slate-500">{groupDone + 2 + i}.</span>
                  <span className="mono text-slate-300">{q.main.cn}{q.twin ? ` +${q.twin.l4 || q.twin.cn.slice(-4)}` : ''}</span>
                  <span className="mono text-slate-500">{parseInt(q.main.bay, 10)}-{q.main.row}-{q.main.tier}{q.single ? ' 싱글' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <button onClick={onSwitchManual}
        className="w-full py-2.5 rounded-lg font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-2 border border-slate-700">
        <Hand className="w-4 h-4"/>수동 모드로 전환
      </button>
    </div>
  );
}
