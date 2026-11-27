// 관리자로 막힌 자리에 올라오는 «이 배 N호기로 작업» 창 — 호기를 누르면 작업자로 바뀌고 하던 일을 잇는다(검수사 본인만 · TallyOne 5.26)
import React, { useEffect, useRef, useState } from 'react';
import { MODE_SWITCH_EVT, markSwitched } from '../modeSwitch.js';
import { canRecordWorkNow } from '../workChoice.js';
import AdminWorkStart from './AdminWorkStart.jsx';

export default function ModeSwitchSheet({ voyages, inspector, inspectors = null }) {
  const [req, setReq] = useState(null);   // { what, voyageKey, resolve, at }
  const [picked, setPicked] = useState(0);
  const [slow, setSlow] = useState(false);
  const reqRef = useRef(null);
  reqRef.current = req;
  //  닫을 때는 «지금 기록할 수 있는가» 그대로 돌려준다(감사 중5 — 늦게라도 바뀌었으면 하던 일을 버리지 않는다).
  const finish = (r, ok) => { if (!r) return; setReq(null); setPicked(0); setSlow(false); try { r.resolve(!!ok); } catch (x) { console.warn('[5.26] 창 닫기 알림 실패', x); } };
  useEffect(() => {
    const h = (e) => {
      const d = e && e.detail; if (!d || typeof d.resolve !== 'function') return;
      d.handled = true;
      if (reqRef.current) finish(reqRef.current, canRecordWorkNow());
      setPicked(0); setSlow(false); setReq({ what: d.what, voyageKey: d.voyageKey, resolve: d.resolve, at: Date.now(), again: !!d.again });
    };
    window.addEventListener(MODE_SWITCH_EVT, h);
    return () => window.removeEventListener(MODE_SWITCH_EVT, h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  //  창이 떠 있는 동안 계속 본다 — 호기 단추든 미르 등록이든 작업자로 바뀌는 순간 하던 일을 잇는다(감사 중5 · 타이머는 창과 함께 정리).
  useEffect(() => {
    if (!req) return undefined;
    const t = setInterval(() => {
      const r = reqRef.current; if (!r) return;
      if (canRecordWorkNow()) {
        markSwitched();
        if (!r.again) { try { window.dispatchEvent(new CustomEvent('writeNotice', { detail: { message: r.what === '작업' ? '🏗 이 배 작업자로 바꿨습니다.' : `🏗 이 배 작업자로 바꿨습니다 — «${r.what}» 을 이어서 기록합니다.` } })); } catch (x) { console.warn('[5.26] 알림 띠 실패', x); } }
        finish(r, true);
      } else if (picked && Date.now() - r.at > 12000) setSlow(true);
    }, 150);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req, picked]);
  if (!req) return null;
  const voyage = voyages && voyages[req.voyageKey];
  return (
    <div className="fixed inset-0 z-[10010] flex items-end justify-center bg-black/50" data-mode-switch="1" onClick={() => finish(req, canRecordWorkNow())}>
      <div className="w-full max-w-md m-2 rounded-pill border-2 border-violet-300 bg-ink-800 p-3 shadow-lg space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-black text-amber-100">🛠 관리자로 들어와 있습니다</div>
        <div className="text-xs text-dim-100">«{req.what}» 은 작업자로 기록됩니다. 이 배 빈 호기를 누르면 이 조에 «N호기 {inspector}» 로 작업자가 되고 <b>{req.what === '작업' ? '바로 작업할 수 있습니다' : req.again ? `바뀐 뒤 ${req.what} 을 한 번 더 누르세요` : `${req.what} 이 바로 이어집니다`}.</b></div>
        <AdminWorkStart voyageKey={req.voyageKey} voyage={voyage} name={inspector} inspectors={inspectors} voyages={voyages} onDone={(no) => { setPicked(no); }}/>
        {picked > 0 && <div className="text-xs text-sky-200" data-mode-switch-wait="1">{slow ? `${picked}호기로 등록은 했는데 아직 작업자로 바뀌지 않았습니다 — 통신이 늦습니다. 바뀌면 저절로 이어집니다.` : `${picked}호기 작업자로 바꾸는 중…`}</div>}
        <button onClick={() => finish(req, canRecordWorkNow())} data-mode-switch-cancel="1" className="w-full py-1.5 rounded-pill border border-line text-xs text-dim-300">그대로 관리자 — 취소</button>
      </div>
    </div>
  );
}
