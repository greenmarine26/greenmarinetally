// 베이사전에 없는 배에 «사전에 없음» 딱지를 붙이는 표시 한 벌 — 항차 목록·헤더·베이플랜 머리가 같이 쓴다(4.19 · §7.8-⑬).
import React, { useEffect, useState } from 'react';
import { bayDictMissingOf } from '../dictMissing.js';

//  검수사 2026-10-09 12:23 «항차는 등록하기 사전에 없음 표기» — 글자는 검수사 말 그대로.
//  판정은 dictMissing.bayDictMissingOf 한 벌. 사전이 늦게 도착하면(App 의 gm-fbdict 이벤트) 다시 본다 — 사전을 만들면 저절로 사라진다.
export default function DictMissingChip({ info, className = '' }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    try { window.addEventListener('gm-fbdict', on); } catch (e) { /* 이벤트 없는 환경 — 첫 판정만 */ }
    return () => { try { window.removeEventListener('gm-fbdict', on); } catch (e) { /* */ } };
  }, []);
  void tick;
  if (!bayDictMissingOf(info)) return null;
  return (
    <span data-dict-missing="1" title="이 배는 베이사전(베이 매트릭스)이 아직 없습니다 — 항차는 등록되어 있고, 베이 그림은 자료로만 그립니다"
      className={`text-sm2 sm:text-xxs bg-rose-900/60 border border-rose-500 text-rose-100 px-2 sm:px-1.5 py-1 sm:py-0.5 rounded-pill font-black leading-none whitespace-nowrap ${className}`}>
      사전에 없음
    </span>
  );
}
