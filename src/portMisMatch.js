// PORT-MIS 입출항 레코드를 항차 정보(콜사인·선박명)로 찾는 간이 매처 — 질문기 답변 전용
//   - VoyagePage의 화면용 매칭(베이사전·fallback 포함 160줄)을 건드리지 않고,
//     질문 답변에 필요한 핵심 규칙만 독립 구현.
//   - 7.8 방향: 후보가 여럿이면 최신 updatedAt 우선 (stale 키 문제 회피)
//   - V7.30 가드: 콜사인이 맞아도 선박명이 명백히 다르면 오염으로 보고 버림
//   - V9.57(G12): 항차·시간 가드 — PORT-MIS 자료는 선박 단위로 오므로 같은 배의 지난 기항 신고가
//     잡힐 수 있다. HomePage 인라인 가드와 같은 ±12h(badgeRule.WINDOW_H) 규칙으로,
//     etd가 이미 12시간 넘게 경과한 신고는 후보에서 제외한다(전부 탈락하면 기존 동작 폴백).
import { matchPortMisById } from './portMisCore.js';   // 3.60-18: 매칭 본체는 portMisCore(베이사전 없는 콘앱과 한 벌)
import { getShipIdentity, getShipBayDictData } from './shipStructure.js';

//  ★★ 2.78 (검수사 지시 2026-08-28) — **PORT-MIS 는 베이매트릭스 신원으로 부른다.**
//    검수사 원문: *«포트미스 호출 자료를 베이메트릭스 자료로 호출 바랍니다. 자꾸 틀리게
//    호출하니 포트미스에 등록이 안되었다고 합니다.»*
//
//    왜 틀렸나 — 부르는 자리가 **여덟 벌**이었고 대부분 `info.callsign` 하나만 봤다.
//    그런데 **EDI 는 콜사인을 잘 안 준다**: 실측 활성 항차 16개 중 `info.callsign` 이 있는 것은 **1개**
//    (VoyagePage:3452 주석 «정상 EDI는 TDT 호출부호 칸이 비어 callsign='' 인 경우가 많음» 그대로).
//    콜사인이 비면 조회를 **한 번도 안 하고** «등록 없음» 으로 떨어졌다.
//    실측 — 지금 방식 9/16 · 신원 방식 **11/16**(ATPR·KSKM 은 신원으로만 찾아진다).
//
//  ⚠ 그리고 2.71 의 «SWTD 는 평택 PORT-MIS 미등록» 은 **내가 틀린 말**이었다.
//    실물은 있다 — `D7EE · SAWASDEE THAILAND · 평택 · mrnOut 26SNKO3085E`.
//    다만 그 레코드가 **출항(ibobprtSe:출항)뿐**이라 양하(입항) MRN 이 없었을 뿐이다.
//    «등록이 없다» 와 «그 레그 신고가 없다» 는 다른 말이고, 앱은 그것을 구분해 말해야 한다.
//
//  신원 = 항차 info → 베이사전(callsign·bayDef.callsign·imo·name·code) → getShipIdentity.
export function shipIdentityOf(info) {
  const code = String(info?.vsl || '').toUpperCase().trim();
  let dict = null, ident = null;
  try { dict = getShipBayDictData(info?.imo, code) || null; } catch (e) { dict = null; }
  try { ident = getShipIdentity(info?.imo, code) || null; } catch (e) { ident = null; }
  const cs = String(info?.callsign || dict?.callsign || dict?.bayDef?.callsign || ident?.callsign || '')
    .toUpperCase().trim();
  const imo = String(info?.imo || ident?.imo || '').replace(/[\s\u3000]/g, '');
  //  ⛔ 2.78 (검수사 «약자로 포트미스 조회하는 오류는 없었으면 합니다. 선박 풀네임으로 조회하세요»):
  //    **4자 선박코드(info.vsl)를 이름 자리에 쓰지 않는다.** SWTD 를 SAWASDEE THAILAND 와 맞추면
  //    영영 안 맞고, 반대로 엉뚱한 배와 걸릴 수 있다(HomePage 가 그렇게 하고 있었다).
  //    풀네임은 항차 vslFull → 베이매트릭스 name → 신원 name 순으로만 온다.
  const name = String(info?.vslFull || dict?.name || ident?.name || '').replace(/[\u3000]/g, ' ').trim();
  return { code, callsign: cs, imo, name };
}

export function matchPortMis(portMisData, info) {
  return matchPortMisById(portMisData, info, shipIdentityOf(info));
}
