// 담당자 명부(carrierContacts — 수집기 1.8-03 업로드) 1회 로드 공용 훅. TallyOne 1.89.
import { useEffect, useState } from 'react';
import { fbGetSimple } from './firebase.js';

let _cache = null;
export function useCarrierContacts() {
  const [cc, setCc] = useState(_cache);
  useEffect(() => {
    if (_cache) return;
    fbGetSimple('carrierContacts').then((v) => { _cache = v || {}; setCc(_cache); }).catch(() => { /* 없으면 미등록 표기 */ });
  }, []);
  return cc;
}
