// 외부 요청에 제한 시간을 다는 공용 신호 — 응답이 없으면 ms 뒤 요청을 끊어 화면이 «불러오는 중» 에서 멈추지 않게 한다 (4.56-01)
export function tmoSignal(ms) {
  if (typeof AbortController !== 'function') return undefined;   // 오래된 브라우저 — 종전처럼 제한 없이 보낸다
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}
