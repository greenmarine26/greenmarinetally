// 매뉴얼의 «화면 그림» — 설명 옆에 그 화면 조각을 그려 준다 (TallyOne 2.27)
//
//   검수사 지시 2026-08-24 — *«사용자 메뉴얼을 만드실때 텍스트 위주 입니다. 화면과 함께 설명하면 좋을듯»*
//                          *«전면 수정 부탁드립니다. 기능별로 화면 추가 하는 방향으로»*
//
//   ★ 왜 스크린샷이 아니라 «코드로 그린 그림»인가.
//     ① 사진은 판마다 낡는다. 2026-08-09 확인 — 매뉴얼이 **2주간 멈춰** 있는 동안 앱은 1.38 까지 갔다.
//        사진이었다면 그 2주치가 전부 거짓 그림이 됐을 것이다.
//     ② 여기 쓰는 색·모서리·배지는 **앱과 같은 토큰**이다. 화면이 바뀌면 그림도 같이 바뀐다.
//     ③ 용량이 0 이다. 배에서 여는 앱이라 1.6MB 도 무겁다(V7.60 약신호 사고).
//
//   ⚠ 그림은 «닮게» 그리는 것이지 «똑같이»가 아니다. 검수원이 **어느 버튼인지 알아보면** 된 것이다.
//     실제와 다르게 그리면 안 되지만, 없는 기능을 그려 넣는 것이 훨씬 나쁘다 — 지어내지 않는다.
import React from 'react';

const C = {
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  slate: 'bg-slate-700/50 text-slate-300 border-slate-600/40',
};
const tone = (c) => C[c] || C.slate;

/** 화면 조각 한 줄 — kind 로 모양을 고른다. */
function Row({ r }) {
  //  탭 줄 — 항차 화면 위쪽
  if (r.kind === 'tabs') {
    return (
      <div className="flex rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
        {r.items.map((t, i) => (
          <div key={i} className={`flex-1 text-center px-2 py-1.5 text-[10px] font-bold border-b-2 ${
            i === r.on ? 'border-amber-400 text-amber-300 bg-slate-800/40' : 'border-transparent text-slate-500'}`}>{t}</div>
        ))}
      </div>
    );
  }
  //  필터 칩 줄
  if (r.kind === 'chips') {
    return (
      <div className="flex flex-wrap gap-1">
        {r.items.map((x, i) => (
          <span key={i} className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
            x.on ? 'bg-amber-500 text-slate-900 border-amber-500' : tone(x.c)}`}>{x.t}</span>
        ))}
      </div>
    );
  }
  //  통계 카드 줄
  if (r.kind === 'cards') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {r.items.map((x, i) => (
          <div key={i} className={`rounded-lg border px-2 py-1.5 ${tone(x.c)}`}>
            <div className="text-[9px] opacity-70 leading-none">{x.t}</div>
            <div className="text-[15px] font-black leading-tight mt-0.5">{x.n}</div>
          </div>
        ))}
      </div>
    );
  }
  //  컨테이너 카드 한 장
  if (r.kind === 'card') {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] font-black text-amber-300">{r.big}</span>
          <span className="text-[10px] mono text-slate-400">{r.cn}</span>
          {(r.tags || []).map((t, i) => (
            <span key={i} className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${tone(t.c)}`}>{t.t}</span>
          ))}
        </div>
        {(r.lines || []).map((l, i) => (
          <div key={i} className="text-[10px] text-slate-400 mt-1">{l}</div>
        ))}
      </div>
    );
  }
  //  표 — 인쇄 양식 같은 것
  if (r.kind === 'table') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr>{r.head.map((h, i) => (
              <th key={i} className="border border-slate-600 bg-slate-800 text-slate-300 px-1 py-1 font-bold whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {r.rows.map((row, i) => (
              <tr key={i}>{row.map((c, j) => (
                <td key={j} className="border border-slate-700 px-1 py-1 text-center text-slate-300 whitespace-nowrap">
                  {c === '_' ? <span className="block border-b border-slate-500 min-h-[9px]"/> : c}
                </td>
              ))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  //  버튼 줄
  if (r.kind === 'btns') {
    return (
      <div className="flex gap-1.5 flex-wrap">
        {r.items.map((x, i) => (
          <span key={i} className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
            x.c === 'go' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-200'}`}>{x.t || x}</span>
        ))}
      </div>
    );
  }
  //  입력칸
  if (r.kind === 'field') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-400">{r.label}</span>
        <span className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-[10px] mono text-slate-200 min-w-[80px]">
          {r.value || <span className="text-slate-600">미입력</span>}
        </span>
        {r.pen && <span className="text-[10px] text-amber-400">✏</span>}
      </div>
    );
  }
  //  미르 답 말풍선
  if (r.kind === 'answer') {
    return (
      <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 px-2.5 py-2">
        {r.q && <div className="text-[10px] text-slate-400 mb-1">🔍 {r.q}</div>}
        <div className="text-[10px] text-amber-100 leading-relaxed whitespace-pre-line">{r.a}</div>
      </div>
    );
  }
  //  한 줄 설명
  if (r.kind === 'note') {
    return <div className="text-[10px] text-slate-500 leading-relaxed">{r.t}</div>;
  }
  return null;
}

/** 매뉴얼 블록의 화면 그림. `shot: { cap?, rows: [...] }` */
export default function HelpShot({ shot }) {
  if (!shot || !Array.isArray(shot.rows) || !shot.rows.length) return null;
  return (
    <div className="mt-2 mb-2 rounded-xl border border-slate-700 bg-slate-950/60 p-2.5">
      <div className="text-[9px] font-bold text-slate-500 tracking-widest mb-1.5">화면</div>
      <div className="space-y-1.5">
        {shot.rows.map((r, i) => <Row key={i} r={r}/>)}
      </div>
      {shot.cap && <div className="text-[10px] text-sky-300/80 mt-2 leading-relaxed">↑ {shot.cap}</div>}
    </div>
  );
}
