// 업데이트로 앱이 스스로 새로고침할 때 «누가 무엇을 보고 있었는지»를 잠깐 맡아 두는 곳.
//
//  ★ 3.7-04 — 검수사 *«업데이트 마다 자동 로그아웃이 됩니다… 작업중 업데이트 하면 로그인 부터 다 다시해야 합니다.
//    캐시가 비워져서 그런다고 하지만 검수사들은 많을땐 수십번 적게는 한두번을 격어야 합니다.»*
//
//  원인은 캐시가 아니다. App.jsx 의 inspector 는 화면 상태(useState)일 뿐이고 «자동 로그인 없음»이 확정 사양이라,
//  업데이트가 부르는 location.reload() 한 번에 그대로 날아간다. 캐시를 안 지워도 똑같이 날아간다.
//
//  그래서 «앱을 새로 켰다»와 «업데이트가 스스로 새로고침했다»를 가른다.
//    - sessionStorage 는 **그 탭에서만** 살아 있고 탭을 닫으면 사라진다. 폰을 넘겨받은 다음 사람은 로그인 화면을 본다.
//    - 60초 시한을 둬, 남의 흔적이 오래 떠다니지 않게 한다.
//    - 한 번 쓰면 지운다(consume). 그 다음 새로고침은 다시 로그인이다.
//  ⇒ «자동 로그인 없음»은 그대로 지키면서, 업데이트 때문에 다시 로그인하는 일만 없앤다.
//
//  ⚠ 3.7-05 에서 이 파일이 한 번 사라졌다 — `git stash` 뒤 `git checkout stash@{0} -- .` 는
//    **추적 안 되는 새 파일을 안 되살린다**(그것은 stash@{0}^3 에 따로 있다). 라이브 번들에는 이미 박혀 있어
//    화면은 멀쩡했지만 저장소 소스만 비어 다음 빌드가 깨졌다. 새 파일을 만든 판은 `git add` 를 먼저 한다.

const KEY = 'gm_update_resume';
const TTL_MS = 60000;

/** 업데이트로 새로고침하기 직전에 부른다. 검수원과 보던 해시를 맡아 둔다. */
export function stashForUpdate(inspector) {
  try {
    if (!inspector) return;
    sessionStorage.setItem(KEY, JSON.stringify({
      inspector,
      hash: window.location.hash || '',
      at: Date.now(),
    }));
  } catch (e) { /* 저장 못 해도 종전대로 로그인 화면이면 된다 */ }
}

/** 새로고침 뒤 한 번만 꺼낸다. 없거나 시한이 지났으면 null — 그러면 종전대로 로그인 화면이다. */
export function consumeUpdateResume() {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || !v.inspector) return null;
    if (!(Date.now() - Number(v.at) < TTL_MS)) return null;
    return { inspector: String(v.inspector), hash: String(v.hash || '') };
  } catch (e) { return null; }
}
