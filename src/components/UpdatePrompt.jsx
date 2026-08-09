// PWA 자동 업데이트 알림
// 새 Service Worker 감지 시 화면 상단에 "🆕 새 버전 출시" 배너 표시
// 클릭 → 즉시 적용 + 새로고침
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, X, Download } from 'lucide-react';
import { APP_VERSION } from '../utils.js';   // 1.23: 지금 돌고 있는 판 — 배너 판정 기준

/** 서비스워커에게 버전을 물어본다. 못 받으면 '' — 조용히 실패하지 않게 콘솔에 남긴다. */
function askVersion(sw, timeoutMs = 1500) {
  return new Promise((resolve) => {
    if (!sw || typeof MessageChannel === 'undefined') { resolve(''); return; }
    let done = false;
    const ch = new MessageChannel();
    const t = setTimeout(() => { if (!done) { done = true; resolve(''); } }, timeoutMs);
    ch.port1.onmessage = (e) => {
      if (done) return;
      done = true; clearTimeout(t);
      resolve(String(e.data?.version || ''));
    };
    try { sw.postMessage({ type: 'GET_VERSION' }, [ch.port2]); }
    catch (err) { clearTimeout(t); done = true; console.warn('[sw] 버전 조회 실패', err); resolve(''); }
  });
}

export default function UpdatePrompt() {
  const [waiting, setWaiting] = useState(null); // 대기 중인 SW
  const [hidden, setHidden] = useState(false);
  const regRef = useRef(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // SW 등록
    const baseUrl = import.meta.env.BASE_URL || './';
    const swUrl = baseUrl + 'sw.js';

    // 1.23: **배너는 버전이 다를 때만 띄운다.**
    //   왜 — 종전엔 워커가 `installed` 를 스쳐 지나가는 것만 보고 배너를 올렸고,
    //   그 워커가 곧바로 activated 로 넘어가도 상태를 지우지 않았다.
    //   PC 는 controllerchange → reload 로 컴포넌트가 새로 떠서 저절로 지워졌지만,
    //   **폰(설치된 PWA)은 이미 새 SW 가 controller 라 그 이벤트가 안 온다.**
    //   그래서 1.22 를 돌리면서 "새 버전 출시" 가 영구히 붙어 있었다(검수사 신고 2026-08-07).
    //   GitHub Pages 가 sw.js 에 `max-age=600` 을 걸어 배포 후 10분간 옛/새 파일이 번갈아 나오는
    //   것이 방아쇠였다. 이제 **버전이 같으면 조용히 넘긴다** — 원인이 무엇이든 거짓 배너가 없다.
    const consider = async (sw) => {
      if (!sw) return;
      const v = await askVersion(sw);
      if (v && v === APP_VERSION) {
        // 같은 판이다 — 배너 대신 조용히 넘겨 대기 상태만 푼다.
        try { sw.postMessage({ type: 'SKIP_WAITING' }); } catch { /* 무시 */ }
        setWaiting(null);
        return;
      }
      setWaiting(sw);
      setHidden(false);
    };

    navigator.serviceWorker.register(swUrl).then(reg => {
      regRef.current = reg;
      if (reg.waiting) consider(reg.waiting);

      // 새 워커 발견
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            consider(newWorker);
          } else if (newWorker.state === 'activated' || newWorker.state === 'redundant') {
            // 1.23: 워커가 넘어갔으면 배너도 걷는다 — 종전엔 이 정리가 없어 배너가 남았다.
            setWaiting(w => (w === newWorker ? null : w));
          }
        });
      });

      // TallyOne 1.37: **배포할 때마다 보여야 한다.** 검수사 지적 2026-08-09 —
      //   *"업데이트 화면이 또 사라졌습니다. 오늘 딱 한번 봤습니다."* / *"클로드님이 배포할 때마다 보여야 하는데."*
      //   원인 둘.
      //   ① 확인 주기가 1시간이었다. 오늘처럼 한 시간에 아홉 판을 올리면 대부분을 놓친다.
      //   ② **`waiting` 이 한 번 차면 브라우저가 새 워커를 더 안 가져온다.** 실측: active 1.30 / waiting 1.32
      //      인 채로 서버가 1.36 이 되어도 대기열이 1.32 에 멈춰 있었다. 배너를 한 번 본 뒤로 영영 안 뜬 이유다.
      //   → 주기를 3분으로 줄이고, **대기 중인 워커가 서버 판보다 낡았으면 그 자리에서 갈아 끼운다.**
      const CHECK_MS = 3 * 60 * 1000;
      const serverVersion = async () => {
        try {
          const t = await fetch(swUrl + '?v=' + Date.now(), { cache: 'no-store' }).then(r => r.text());
          return (t.match(/VERSION\s*=\s*'([^']+)'/) || [])[1] || '';
        } catch (e) { console.warn('[sw] 서버 판 확인 실패', e); return ''; }
      };
      const poll = async () => {
        try {
          const sv = await serverVersion();
          // 대기 중인 워커가 서버보다 낡았으면 밀어낸다 — 안 그러면 새 워커를 아예 못 받는다.
          if (sv && reg.waiting) {
            const wv = await askVersion(reg.waiting);
            if (wv && wv !== sv) {
              console.log('[sw] 대기 워커가 낡음', wv, '→ 서버', sv, '— 갈아 끼운다');
              try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) { /* 아래 update 로 재시도 */ }
              setWaiting(null);
            }
          }
          await reg.update();
          if (reg.waiting) consider(reg.waiting);
        } catch (e) { console.warn('[sw] 갱신 확인 실패', e); }
      };
      setInterval(poll, CHECK_MS);
      // 탭으로 돌아왔을 때도 한 번 — 폰에서 앱을 다시 열었을 때 바로 알게 된다.
      document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
      poll();
    }).catch(e => console.log('SW 등록 실패:', e));

    // 컨트롤러 변경 (새 SW 활성화) → 새로고침
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  const handleUpdate = () => {
    if (!waiting) return;
    waiting.postMessage({ type: 'SKIP_WAITING' });
    // 1.23: 탈출구 — 4초 안에 controllerchange 가 안 오면 등록을 풀고 새로 받는다.
    //   버튼을 눌러도 아무 일이 없으면 검수사는 앱을 못 고친 채로 계속 쓴다.
    setTimeout(async () => {
      try {
        const reg = regRef.current;
        if (reg) await reg.unregister();
      } catch (e) { console.warn('[sw] 해제 실패', e); }
      window.location.reload();
    }, 4000);
  };

  if (!waiting || hidden) return null;

  return (
    <div className="fixed top-12 left-2 right-2 z-50 max-w-md mx-auto">
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 border-2 border-emerald-400 rounded-lg shadow-2xl p-3 flex items-center gap-3 animate-pulse">
        <div className="bg-emerald-900 p-2 rounded-lg flex-shrink-0">
          <Download className="w-5 h-5 text-emerald-200"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-emerald-50">🆕 새 버전 출시</div>
          <div className="text-[11px] text-emerald-100/90">탭 한 번으로 최신 버전 적용</div>
        </div>
        <button onClick={handleUpdate}
          className="bg-emerald-100 text-emerald-900 px-3 py-2 rounded font-black text-xs flex items-center gap-1 active:scale-95 transition">
          <RefreshCw className="w-3.5 h-3.5"/>업데이트
        </button>
        <button onClick={() => setHidden(true)} className="text-emerald-200 hover:text-white p-1">
          <X className="w-4 h-4"/>
        </button>
      </div>
    </div>
  );
}
