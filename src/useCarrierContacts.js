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

// 1.92: 선박별 작업 속도(shipSpeed — 텔리 리포트 배치 분석, 이후 수집기 축적) 1회 로드.
let _speed = null;
export function useShipSpeed() {
  const [sp, setSp] = useState(_speed);
  useEffect(() => {
    if (_speed) return;
    fbGetSimple('shipSpeed').then((v) => { _speed = v || {}; setSp(_speed); }).catch(() => { /* 없으면 안내 */ });
  }, []);
  return sp;
}

// 1.97: EDI 도착 패턴(ediPattern — 수집기록 배치 분석) 1회 로드.
let _pat = null;
export function useEdiPattern() {
  const [v, setV] = useState(_pat);
  useEffect(() => {
    if (_pat) return;
    fbGetSimple('ediPattern').then((x) => { _pat = x || {}; setV(_pat); }).catch(() => { /* 없으면 생략 */ });
  }, []);
  return v;
}

// 2.03: 데미지 색인(damageIndex — 컨번호·날짜로 과거 데미지 조회) 1회 로드.
//   전체가 메타만이라 가볍다(사진 제외). 새 데미지 저장 직후엔 페이지 재진입 시 갱신된다.
let _dmgIdx = null;
export function useDamageIndex() {
  const [di, setDi] = useState(_dmgIdx);
  useEffect(() => {
    if (_dmgIdx) return;
    import('./firebase.js').then(({ fbGetDamageIndex }) => fbGetDamageIndex())
      .then((v) => { _dmgIdx = v || {}; setDi(_dmgIdx); })
      .catch(() => { /* 색인 없으면 «기록 없음» 답 */ });
  }, []);
  return di;
}
