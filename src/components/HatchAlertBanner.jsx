// 해치커버 자동 판정 알림 배너(3.49) — 따라가기가 아닐 때, 터미널 실적이 «커버를 열었다/닫았다»고 말하는데 검수원 보고가 없는 장을 알린다. [보고+카톡]·[보고만]·[무시].
//   검수사 2026-09-15 «검수원 입력이 있으면 그건 우선 적용이고 입력이 없다면 따라가기 모드가 아닌 경우엔 알림을 보내야 합니다».
//   판정은 utils.hatchEventsOf, 기록은 hatchReport.recordHatchEvent 한 벌. 새 사건이 뜨면 한 번 소리로 알린다(현장은 화면을 안 본다).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { recordHatchEvent, fmtHm } from '../hatchReport.js';
import { canWorkNow, workGateText } from '../workChoice.js';   // 3.51: 조회만은 보고를 쓰지 않는다
import { speak } from '../voice.js';
import { formatHatchBays } from '../utils.js';
import { useHatchCountConfirm } from './HatchCountConfirm.jsx';

export default function HatchAlertBanner({ events, voyageKey, vsl, voyOf = null, equip, inspector, panelCountOf = null, onRecorded = null, mute = false }) {
  //  dismissed = [무시] · recorded = [보고] 성공 — 보관소 스냅샷이 돌아오기 전에도 그 줄을 바로 치워 두 번 적지 않는다(감사 지적).
  const [dismissed, setDismissed] = useState(() => new Set());
  const [busy, setBusy] = useState('');
  const spokenRef = useRef(new Set());
  const list = (events || []).filter((e) => !dismissed.has(`${e.hatch}|${e.action}`));   // recorded 도 dismissed 에 넣는다(줄 치우기는 같다)
  useEffect(() => {
    if (mute) return;
    //  소리는 «방금 일어난 것»(30분 안)만, 한 번에 한 문장으로 — 항차를 늦게 열어 묵은 사건이 여럿이면 배너로만 보인다(줄줄이 읽으면 현장이 끈다).
    const fresh = [];
    for (const e of list) {
      const k = `${e.hatch}|${e.action}`;
      if (spokenRef.current.has(k)) continue;
      spokenRef.current.add(k);
      if (Date.now() - e.from < 30 * 60000) fresh.push(e);
    }
    if (!fresh.length) return;
    try { speak(`${fresh.map((e) => `${e.bays.join(' ')}번 베이 커버 ${e.action === 'open' ? '열림' : '닫힘'}`).join(', ')} 확인`); } catch (x) { /* 소리 못 내도 배너는 남는다 */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.map((e) => `${e.hatch}|${e.action}`).join(',')]);
  //  4.10: 보고 단추를 누르기 전에 «앱이 센 장수» 를 보인다(검수사 2026-10-07 «보고 직전에 커버 장수를 맞는지 확인»). 보고 때도 이 값을 그대로 쓴다 — 화면 값과 보고 값이 만들어지는 방식부터 같다(감사 하-1).
  //    세는 일은 raw EDI 를 다시 읽어 비싸므로 사건 목록이나 계산 함수(= 부르는 쪽 자료)가 바뀔 때만 다시 센다(재감사 중-1: 검색창 글자마다 다시 세면 입력이 느려진다).
  //    못 센 사건(0)은 베이 개수로 대신 적지 않는다(옛 6장 오류와 같은 모양, 감사 중-2) — 단추를 누르면 «장수 확인» 창에서 검수사가 직접 고른다.
  const [hatchCountEl, askHatchCount] = useHatchCountConfirm();
  const countsKey = list.map((e) => `${e.hatch}|${e.action}`).join(',');
  const counts = useMemo(() => {
    const m = {};
    for (const e of list) {
      let n = 0;
      if (panelCountOf) { try { n = panelCountOf(e.bays, e.mode) || 0; } catch (x) { n = 0; } }
      m[`${e.hatch}|${e.action}`] = n;
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsKey, panelCountOf]);
  const listRef = useRef(list); listRef.current = list;   // 장수 확인 창이 떠 있는 동안 사건이 사라졌는지(다른 검수원이 먼저 보고) 보려고
  if (!list.length) return <>{hatchCountEl}</>;   // 창이 떠 있는 동안 사건이 사라져도(다른 검수원 보고) 창은 남아 물음이 끝까지 풀리게
  const doRecord = async (e, share) => {
    const k = `${e.hatch}|${e.action}`;
    if (!canWorkNow()) { alert(workGateText('해치커버 보고')); return; }   // 3.51: 조회만은 보기만
    setBusy(k);
    try {
      let pc = counts[k] || 0;
      if (!(pc > 0)) {
        pc = await askHatchCount({ action: e.action, bays: e.bays, detail: { count: 0, source: 'none', max: 0, groups: [] }, initial: null });
        if (pc == null) return;   // 취소 — 아무것도 적지 않는다
        //  창이 떠 있는 동안 다른 검수원의 보고가 들어와 이 사건이 사라졌으면 쓰지 않는다(같은 보고가 두 번 나가지 않게, 재감사 하-1).
        if (!listRef.current.some((x) => `${x.hatch}|${x.action}` === k)) { alert('그 사이 이 커버의 보고가 들어와 줄이 사라졌습니다. 같은 보고가 두 번 나가지 않게 이번에는 보고하지 않았습니다.'); return; }
      }
      await recordHatchEvent(voyageKey, e, { vsl, voy: voyOf ? voyOf(e.mode) : '', equip, panelCount: pc, share, by: inspector || '' });
      setDismissed((s) => new Set([...s, k]));
      if (onRecorded) onRecorded(e);
    } catch (x) {
      console.warn('[3.49] 해치 자동 사건 기록 실패', x);
      alert(x && x.viewOnly ? x.message : '해치커버 보고 기록에 실패했습니다. 신호를 확인하고 다시 누르세요.');
    } finally { setBusy(''); }
  };
  return (
    <>
    <div className="bg-amber-950/60 border-2 border-amber-600 rounded-pill p-2 space-y-1.5" data-hatch-alert={String(list.length)}>
      <div className="text-xxs font-black text-amber-200">🏗 터미널 실적으로 보면 커버를 {list.some((e) => e.action === 'open') ? '열었' : '닫았'}습니다 — 보고가 없습니다. 맞으면 [보고], 아니면 [무시].</div>
      {list.map((e) => {
        const k = `${e.hatch}|${e.action}`;
        return (
          <div key={k} className="flex flex-wrap items-center gap-1.5 bg-ink-900/70 rounded-pill px-2 py-1.5" data-hatch-key={k}>
            <span className="text-sm font-black text-amber-100">{e.action === 'open' ? '🔓' : '🔒'} {formatHatchBays(e.bays.map((b) => String(b).padStart(2, '0'))) || e.bays.join('·')}</span>
            <span className="text-xxs text-dim-300">{fmtHm(e.from)}~{fmtHm(e.to)} 공백 {e.gapMin}분{e.crane ? ` · ${e.crane}호기` : ''}{e.src === 'est' ? ' · 추정' : ''}</span>
            {panelCountOf && <span className={`text-xxs font-bold ${counts[k] > 0 ? 'text-emerald-300' : 'text-rose-300'}`} data-hatch-alert-count={counts[k] > 0 ? String(counts[k]) : '0'}>{counts[k] > 0 ? `총 ${counts[k]}장` : '장수 확인 필요'}</span>}
            <span className="ml-auto flex gap-1">
              <button disabled={!!busy} onClick={() => doRecord(e, true)} className="px-2 py-1 rounded-pill bg-emerald-700 disabled:opacity-50 text-white text-xxs font-black">보고+카톡</button>
              <button disabled={!!busy} onClick={() => doRecord(e, false)} className="px-2 py-1 rounded-pill bg-ink-800 border border-emerald-600 text-emerald-200 text-xxs font-black">보고만</button>
              <button disabled={!!busy} onClick={() => setDismissed((s) => new Set([...s, k]))} className="px-2 py-1 rounded-pill bg-ink-800 border border-line text-dim-300 text-xxs font-bold">무시</button>
            </span>
          </div>
        );
      })}
    </div>
    {hatchCountEl}
    </>
  );
}
