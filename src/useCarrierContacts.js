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
let _dmgP = null;   // 4.22-04: 읽는 중인 약속 한 벌 — 카드가 질문마다 새로 그려져도(key) 같은 읽기를 기다린다(중복 GET 없음)
export function useDamageIndex() {
  const [di, setDi] = useState(_dmgIdx);
  useEffect(() => {
    //  4.22-04: 이미 읽었으면 그 값을 쓴다 — 종전엔 그냥 돌아가서, 읽는 도중에 새로 그려진 카드는 «불러오는 중» 에 머물렀다(통합검색 화면 카드 key 를 주며 드러남).
    if (_dmgIdx) { setDi(_dmgIdx); return undefined; }
    if (!_dmgP) {
      _dmgP = import('./firebase.js').then(({ fbGetDamageIndex }) => fbGetDamageIndex())
        .then((v) => { _dmgIdx = v || {}; return _dmgIdx; })
        .finally(() => { _dmgP = null; });   // 실패는 기억하지 않는다 — 카드를 다시 그리면 다시 읽는다
    }
    _dmgP.then((v) => setDi(v))
      //  4.22-04: 못 읽으면 «불러오는 중» 에 멈춰 있지 않고 카드가 «못 읽었습니다» 를 말한다.
      .catch((e) => { console.warn('[데미지 색인] 읽기 실패 —', e); setDi({ __error: true }); });
    return undefined;
  }, []);
  return di;
}
