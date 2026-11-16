// 앱이 스스로 «완료 저장» 하는 실행부(5.09) — 수석 부재 즉시 / 수석 접속 시 30분 / 수석 화면 조작 시각 기록. 판정은 utils.autoCloseTimingOf·autoCloseDecision 한 벌이다.
//   검수사 2026-11-16 21:53 «작업완료시 앱이 스스로 완료처리하고 수석이 앱을 사용하지 않을시 30분이 지나면 앱스스로 완료마감처리합니다»
//   · 21:59 «전 수석이 아닙니다. 다만 수석 역활을 했을뿐입니다. 그러므로 제가 로그인 했다고 일을 하고 있다고 보류처리 말고 순서대로 시행되게»
import { useEffect, useRef } from 'react';
import { fbAutoCloseVoyage, fbStampChiefInput } from './firebase.js';
import { presentChiefsOf, autoCloseTimingOf, autoCloseDecision } from './utils.js';
import { isChief, isTester, isHiddenStaff } from './staffList.js';
import { isOwnerName } from './adminGuard.js';
import { isViewOnlyNow } from './workChoice.js';
import { showToast } from './toast.js';

/** «수석» 판정 한 벌 — 수석검수·부수석만. 소유자(수석 역할을 했을 뿐 수석이 아니다)·테스터·숨김 계정은 수석으로 세지 않는다. */
export function isRealChief(name) {
  return !!name && isChief(name) && !isTester(name) && !isHiddenStaff(name) && !isOwnerName(name);
}

const TICK_MS = 30000;             // 첫 판정은 30초 뒤 — 직책 목록(서버 직책)이 도착할 시간을 준다
const RETRY_MS = 5 * 60 * 1000;    // 같은 항차를 서버에서 다시 읽어 보는 간격(안 닫힌 이유가 그대로인 동안)

/** 수석 기기가 화면을 만질 때 1분에 한 번 «마지막 조작 시각» 을 적는다. 수석이 아니면 아무것도 안 한다. */
export function useChiefInputStamp(inspector) {
  useEffect(() => {
    if (!isRealChief(inspector)) return undefined;
    let last = 0;
    const stamp = () => {
      const now = Date.now();
      if (now - last < 60000) return;
      last = now;
      fbStampChiefInput(inspector).catch((e) => console.warn('[5.09] 수석 조작 시각 기록 실패(무해)', e && e.message));
    };
    stamp();   // 로그인·화면 열기도 조작이다
    const evs = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'];
    evs.forEach((e) => window.addEventListener(e, stamp, { passive: true, capture: true }));
    return () => evs.forEach((e) => window.removeEventListener(e, stamp, { capture: true }));
  }, [inspector]);
}

/** 작업을 마친 항차를 앱이 스스로 보관소로 옮긴다. 쓰는 기기(조회만·테스터·숨김 계정 제외)의 화면이 30초마다 본다. */
export function useAutoCloseVoyages({ voyagesAll, inspectors, inspector }) {
  const vRef = useRef(voyagesAll);
  const iRef = useRef(inspectors);
  vRef.current = voyagesAll;
  iRef.current = inspectors;
  const triedRef = useRef(new Map());
  const busyRef = useRef(false);
  const busySinceRef = useRef(0);
  const canRun = !!inspector && !isHiddenStaff(inspector) && !isTester(inspector);
  useEffect(() => {
    if (!canRun) return undefined;
    const tick = async () => {
      if (isViewOnlyNow()) return;
      if (busyRef.current && Date.now() - busySinceRef.current < 3 * 60 * 1000) return;   // 3분 넘게 끝나지 않은 확인은 풀어 준다(응답 없는 망)
      busyRef.current = true; busySinceRef.current = Date.now();
      try {
        const now = Date.now();
        const chiefs = presentChiefsOf(iRef.current, isRealChief, now);
        for (const [key, v] of Object.entries(vRef.current || {})) {
          const info = v && v.info;
          if (!info) continue;
          const t = autoCloseTimingOf(info, { chiefs, now });   // info 만으로 거르는 1차 — 본문이 없는 기기도 돈다
          if (!t.close) continue;
          const sig = `${t.doneAt}|${info.dischargeDone ? 1 : 0}${info.loadingDone ? 1 : 0}${info.inspectorDone ? 1 : 0}`;
          const prev = triedRef.current.get(key);
          if (prev && prev.sig === sig && now < prev.until) continue;
          let res;
          try {
            //  2차 — 서버의 항차를 새로 통째로 읽어 같은 판정을 한 번 더 한다(부분 사본으로 보관소를 덮어쓰지 않는다).
            res = await fbAutoCloseVoyage(key, (fresh) => autoCloseDecision(fresh, { chiefs: presentChiefsOf(iRef.current, isRealChief, Date.now()), now: Date.now() }));
          } catch (e) {
            console.warn('[5.09 자동 완료 저장] 실패 — 항차는 그대로 둡니다', key, e);
            res = { closed: false, why: 'error' };
          }
          if (res.closed) {
            triedRef.current.delete(key);
            console.log('[5.09 자동 완료 저장] 보관소로 옮김', key);
            try { showToast(`${info.vsl || key} 항차를 앱이 완료 저장했습니다 — 보관소에서 되살릴 수 있습니다.`); } catch (e) { console.warn('[5.09] 알림 표시 실패(무해)', e); }
          } else {
            console.log('[5.09 자동 완료 저장] 아직 닫지 않음', key, res.why);
            triedRef.current.set(key, { sig, until: now + RETRY_MS });
          }
        }
      } finally {
        busyRef.current = false;
      }
    };
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [canRun]);
}
