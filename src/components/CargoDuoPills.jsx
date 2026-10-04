// 콘앱 카고플랜 첫 화면의 «양하 | 선적» 전환 단추 한 쌍(콘앱만 쓴다 — 검수앱 카고플랜은 이 단추를 안 받는다)
import React from 'react';

export default function CargoDuoPills({ duo }) {
  if (!duo || !Array.isArray(duo.tabs)) return null;
  const base = { padding: '6px 11px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, lineHeight: 1.2 };
  return (
    <div className="cpv2-duo-pills" style={{ display: 'flex', borderRadius: 4, overflow: 'hidden' }}>
      {duo.tabs.map((t) => {
        const on = t.mode === duo.mode;
        return (
          <button key={t.mode} type="button" aria-pressed={on} onClick={() => duo.onPick(t.mode)}
            style={{ ...base, background: on ? '#f59e0b' : '#37474f', color: on ? '#111' : '#cfd8dc' }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
