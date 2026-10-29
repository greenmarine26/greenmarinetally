// 조용한 실패 규칙의 시험 — ruleid 는 잡혀야 하고 ok 는 안 잡혀야 한다
function a() {
  // ruleid: empty-catch
  try { risky(); } catch (e) {}
  // ok: empty-catch
  try { risky(); } catch (e) { console.warn('실패', e); }
  // ruleid: empty-promise-catch
  p.catch(() => {});
  // ok: empty-promise-catch
  p.catch((e) => console.warn('실패', e));
  // ruleid: fetch-without-timeout
  fetch(url);
  // ruleid: fetch-without-timeout
  fetch(url, { method: 'GET' });
  // ok: fetch-without-timeout
  fetch(url, { signal: AbortSignal.timeout(8000) });
  // ok: fetch-without-timeout
  fetch(url, { method: 'POST', signal: ctl.signal });
}
