// 앱이 Firebase 에서 받은 바이트를 «기기·이름» 별로 세어 하루 단위로 접속 기록 칸(access_log)에 올린다 — 소유자 «📡 다운로드 사용량» 이 읽는다
//   검수사 2026-11-16 18:18 «누가 얼마를 사용했는지 수집기 클로드 와 검수원들 각각 나눠서 볼수 있나요».
//   구글 청구서는 «누가»를 나누지 않는다 — 그래서 받는 쪽이 직접 잰다. 값은 «받은 본문 바이트»라 청구서보다 조금 작다(연결 맺을 때의 소량 부담은 빠진다).
//   측정은 관찰만 한다 — WebSocket 은 «message» 귀를 하나 더 달 뿐이고 fetch 는 응답을 복제해 크기만 센다. 실패해도 앱 동작에는 영향이 없다.
//   저장 — access_log/{YYMMDD}/u_{기기}_{종류}_{이름} = { t:'usage', k:'tally'|'cone', d, n:이름, v:판, at, b:받은 바이트(서버 증가값) } (60일 뒤 접속 기록과 함께 지워진다).
import { activityUserName } from './activityLog.js';
import { accessDeviceId } from './accessLog.js';

const DB = 'https://greenmarinetally-default-rtdb.asia-southeast1.firebasedatabase.app';
const HOST = /firebasedatabase\.app/;
const FLUSH_MS = 300000;   // 5분마다 올린다(화면을 닫을 때도 한 번)
let _bytes = {};           // 이름 → 아직 못 올린 바이트
let _installed = false;

// 문자열의 UTF-8 바이트 수 — 한글은 3바이트라 length 로 세면 모자란다
export function utf8Len(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1; else if (c < 0x800) n += 2; else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; } else n += 3;
  }
  return n;
}

function addBytes(n) {
  if (!(n > 0)) return;
  let who = '';
  try { who = activityUserName() || ''; } catch (e) { who = ''; }
  _bytes[who] = (_bytes[who] || 0) + n;
}

const dayKey = () => {
  const d = new Date(); const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getFullYear() % 100)}${p(d.getMonth() + 1)}${p(d.getDate())}`;
};

function flush(version) {
  const take = _bytes; _bytes = {};
  const dev = accessDeviceId();
  const day = dayKey();
  for (const [name, b] of Object.entries(take)) {
    if (!(b > 0)) continue;
    const safe = String(name).replace(/[.$#[\]/]/g, '').slice(0, 20) || '_';
    const restore = () => { _bytes[name] = (_bytes[name] || 0) + b; };   // 못 올렸으면 다음에 같이 올린다
    try {
      window.fetch(`${DB}/access_log/${day}/u_${dev}_tally_${safe}.json?print=silent`, {
        method: 'PATCH', keepalive: true,
        body: JSON.stringify({ t: 'usage', k: 'tally', d: dev, n: name, v: version || '', at: Date.now(), b: { '.sv': { increment: b } } }),
      }).then((r) => { if (!r.ok) restore(); }).catch(restore);
    } catch (e) { restore(); }
  }
}

export function installUsageMeter(version) {
  if (_installed || typeof window === 'undefined') return;
  _installed = true;
  try {
    const WS = window.WebSocket;
    if (WS && !WS.__usageMeter) {
      const M = function (url, protocols) {
        const ws = protocols === undefined ? new WS(url) : new WS(url, protocols);
        try {
          if (HOST.test(String(url))) ws.addEventListener('message', (ev) => { try { const d = ev.data; addBytes(typeof d === 'string' ? utf8Len(d) : ((d && d.byteLength) || 0)); } catch (e) { /* 세기만 — 실패는 무시 */ } });
        } catch (e) { console.warn('[사용량] 소켓 측정 못 붙임(무해)', e); }
        return ws;
      };
      M.prototype = WS.prototype;
      ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach((k) => { M[k] = WS[k]; });
      M.__usageMeter = true;
      window.WebSocket = M;
    }
    const of = window.fetch.bind(window);
    window.fetch = function (input, init) {
      const p = of(input, init);
      try {
        const u = typeof input === 'string' ? input : ((input && input.url) || '');
        if (HOST.test(u) && !/\/access_log\//.test(u)) {
          p.then((r) => { try { r.clone().arrayBuffer().then((b) => addBytes(b.byteLength)).catch(() => { /* 복제 본문을 못 읽으면 그 응답만 세지 않는다 — 앱 동작과 무관 */ }); } catch (e) { /* 세기만 */ } }).catch(() => { /* 요청 실패는 앱이 따로 처리한다 — 여기서는 세기만 */ });
        }
      } catch (e) { /* 세기만 */ }
      return p;
    };
    setInterval(() => flush(version), FLUSH_MS);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(version); });
    window.addEventListener('pagehide', () => flush(version));
  } catch (e) { console.warn('[사용량] 측정 시작 실패(무해)', e); }
}
