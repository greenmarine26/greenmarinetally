// 폰 알림 토큰을 앱이 열릴 때마다 스스로 갱신하는 순수 논리 — 죽은 토큰(UNREGISTERED)을 사람이 「폰 알림 켜기」로 되살리지 않게 한다
//   검수사 2026-11-03 23:10 «폰알림 켜기는 소용이 없습니다. 제가 없어도 스스로 돌아야 합니다. 매번 제가 해줄수는 없기 때문입니다»
//   뿌리 — 토큰은 한 번 등록하고 끝이라(push.js enablePush) 8월 등록분 둘이 11월에 실제 발송에서 UNREGISTERED 로 죽었는데도
//   앱 화면은 계속 «켜짐» 이었고 수집기의 «로그인 풀림» 폰 알림은 5시간 한 대도 못 닿았다. 외부 모듈을 쓰지 않는 함수라 연막검사가 그대로 돌린다.
/**
 * @param {{name:string, perm:string, stored:string, getTok:()=>Promise<string>, save:(n:string,t:string)=>Promise<any>,
 *          remove:(n:string,t:string)=>Promise<any>, setStored:(t:string)=>void}} d
 * @returns {Promise<{action:'skip'|'same'|'renewed'|'fail', why?:string}>}
 */
export async function runPushRefresh(d) {
  if (!d || !d.name || d.perm !== 'granted' || !d.stored) return { action: 'skip' };   // 알림을 켠 적 없거나 권한이 없으면 건드리지 않는다
  let tok = '';
  try { tok = await d.getTok(); } catch (e) { return { action: 'fail', why: `토큰 발급 실패 - ${(e && e.message) || e}` }; }
  if (!tok) return { action: 'fail', why: '토큰을 받지 못했습니다' };
  try {
    await d.save(d.name, tok);                       // 같은 토큰이어도 다시 적어 «등록 시각» 을 새로 한다
    if (tok === d.stored) return { action: 'same' };
    d.setStored(tok);
    try { await d.remove(d.name, d.stored); } catch (e) { /* 옛 토큰 정리는 수집기가 UNREGISTERED 를 만나면 하므로 여기서 막히지 않는다 */ }
    return { action: 'renewed' };
  } catch (e) { return { action: 'fail', why: `서버 등록 실패 - ${(e && e.message) || e}` }; }
}
