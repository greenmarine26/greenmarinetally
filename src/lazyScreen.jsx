// 화면별 지연 받기 한 벌(4.89) — 수석·관리앱·맛집·보조·건강·자료센터·통합검색 화면은 처음 열 때 받는다
/* ★ TallyOne 4.89 판 C (검수사 승인 «C판은 클로드의 생각대로 된다면 미리 승인 합니다») — 첫 화면 본체를 가볍게.
   - React.lazy 로 감싸되 받기에 실패하면(신호 끊김·옛 판 파일 404) 흰 화면이 아니라 사유와 [다시 받기] 를 보인다(조용한 실패 금지).
   - 서비스워커가 설치 때 이 조각 파일들도 미리 받아 두므로(sw.js PRECACHE_EXTRA — build.sh 가 채운다) 오프라인에서도 열린다. */
import React from 'react';

export function LazyLoading({ label = '화면' }) {
  return <div className="max-w-3xl mx-auto px-3 py-16 text-center text-dim-400" data-lazy-loading="1">{label} 불러오는 중…</div>;
}

function LoadFailed({ name, msg }) {
  return (
    <div className="max-w-3xl mx-auto px-3 py-16 text-center text-dim-300 space-y-3" data-lazy-failed={name}>
      <div className="font-bold text-dim-100">{name} 화면을 받지 못했습니다.</div>
      <div className="text-xs text-dim-400">신호가 약하거나 새 판으로 바뀌는 중일 수 있습니다. ({msg})</div>
      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-ink-800 border border-line rounded-pill text-dim-100 font-bold">다시 받기</button>
    </div>
  );
}

//  4.89 감사 권장 3: 조각 받기에 시간 제한 — 15초 안에 안 오면 «불러오는 중…» 에 머물지 않고 사유와 [다시 받기] 를 보인다.
export const LAZY_LIMIT_MS = 15000;
const withLimit = (p, name) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`${Math.round(LAZY_LIMIT_MS / 1000)}초 안에 받지 못함`)), LAZY_LIMIT_MS);
  p.then((m) => { clearTimeout(t); resolve(m); }, (e) => { clearTimeout(t); reject(e); });
});

export function lazyScreen(name, loader) {
  return React.lazy(() => withLimit(loader(), name).catch((err) => {
    const msg = (err && err.message) ? String(err.message).slice(0, 120) : String(err);
    console.warn(`[4.89 지연 받기] ${name} 화면 받기 실패:`, err);
    return { default: () => <LoadFailed name={name} msg={msg} /> };
  }));
}
