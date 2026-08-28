// PORT-MIS 입출항 레코드를 항차 정보(콜사인·선박명)로 찾는 간이 매처 — 질문기 답변 전용
//   - VoyagePage의 화면용 매칭(베이사전·fallback 포함 160줄)을 건드리지 않고,
//     질문 답변에 필요한 핵심 규칙만 독립 구현.
//   - 7.8 방향: 후보가 여럿이면 최신 updatedAt 우선 (stale 키 문제 회피)
//   - V7.30 가드: 콜사인이 맞아도 선박명이 명백히 다르면 오염으로 보고 버림
//   - V9.57(G12): 항차·시간 가드 — PORT-MIS 자료는 선박 단위로 오므로 같은 배의 지난 기항 신고가
//     잡힐 수 있다. HomePage 인라인 가드와 같은 ±12h(badgeRule.WINDOW_H) 규칙으로,
//     etd가 이미 12시간 넘게 경과한 신고는 후보에서 제외한다(전부 탈락하면 기존 동작 폴백).
import { parsePortMisDateTime } from './utils.js';
import { WINDOW_H } from './badgeRule.js';
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
  const entries = Object.values(portMisData || {}).filter(p => p && (p.eta || p.etd));
  if (!entries.length) return null;
  //  ⚠ 사전 이름에 탭·전각공백이 섞여 오는 실물이 있다(MCSC = «\tSEASPAN CALICANTO») — 같이 걷는다.
  const norm = (x) => String(x || '').toUpperCase().replace(/[\s\u3000\-_.]/g, '');
  const _id = shipIdentityOf(info);
  const myName = norm(_id.name || info?.vslFull || info?.vsl);
  //  ⛔ 2.78: **앞 5자 슬라이스 금지.** SAWASDEE 시리즈 10척이 «SAWAS» 로 뭉개져 서로 걸린다
  //    (2.5-02 가 그 병을 고쳤는데 이 가드에는 남아 있었다). 통째 포함만 본다.
  const nameOk = (p) => {
    const pn = norm(p.vesselName);
    if (!myName || myName.length < 5 || !pn || pn.length < 5) return true; // 검증 불가 → 통과
    return myName.includes(pn) || pn.includes(myName);
  };
  // V9.57(G12): 시간 가드 — etd 미경과(또는 ±WINDOW_H 이내)만 유효 후보로.
  //   etd/eta를 못 읽는 레코드는 판정 불가 → 통과(보수적 유지).
  const now = Date.now();
  const timeOk = (p) => {
    const etd = parsePortMisDateTime(p.etd);
    const eta = parsePortMisDateTime(p.eta);
    const t = etd ?? eta;
    if (t == null) return true;                      // 시각 없음 → 판정 불가, 통과
    return t >= now - WINDOW_H * 3600000;            // 12시간 넘게 지난 신고는 지난 기항으로 간주
  };
  // 후보 2건 이상이면 최신 신고(updatedAt) 채택 — 시간 가드 통과분을 우선하고, 전부 탈락 시 폴백.
  const latest = (arr) => {
    const fresh = arr.filter(timeOk);
    const pool = fresh.length ? fresh : arr;
    return pool.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null;
  };

  // 1) 콜사인 (정확 + prefix 양방향) + 선박명 가드
  //  ★ 2.78: 콜사인은 **항차에 없으면 베이매트릭스에서** 가져온다(실측 16개 중 15개가 항차엔 없다).
  const cs = _id.callsign;
  //  0) 콜사인이 곧 RTDB 키인 레코드(수집기가 그렇게 저장한다) — 값 스캔보다 먼저·정확하다.
  if (cs && portMisData && portMisData[cs] && nameOk(portMisData[cs])) return portMisData[cs];
  if (cs && cs.length >= 4) {
    const hit = entries.filter(p => {
      const pc = String(p.callsign || '').toUpperCase().trim();
      return pc && (pc === cs || pc.startsWith(cs) || cs.startsWith(pc)) && nameOk(p);
    });
    const m = latest(hit);
    if (m) return m;
  }
  // 2) 선박명 — 2.63-02: 앞 5자 매칭이 자매선(SAWASDEE 시리즈)을 오매칭(SWTD 에 SHANGHAI 6/11 울산)
  //    → 양방향 통째 포함만 + 콜사인 상호 배제 + 7일 신선도(낡은 지난 기항 제외).
  if (myName && myName.length >= 5) {
    const hit = entries.filter(p => {
      const pn = norm(p.vesselName);
      if (pn.length < 5 || !(myName.includes(pn) || pn.includes(myName))) return false;
      //  ★ 2.78: **이름이 통째로 같으면 콜사인이 달라도 그 배다.**
      //    실측 — STMJ 는 사전 VRKS6 인데 PORT-MIS 는 VRKS5(한 글자), ATPR 은 사전 D5RR5 인데
      //    PORT-MIS 는 9V7919(완전히 다름). 둘 다 선명은 «SITC MOJI»·«ATLANTIC PIONEER» 로
      //    글자 하나 안 틀리고 평택 신고다. 콜사인 배제가 그 둘을 버려 «등록 없음» 이 됐다.
      //    ⚠ 자매선은 이름이 다르다(SAWASDEE THAILAND ≠ SHANGHAI · SEASPAN CALICANTO ≠ LINGUE) —
      //      그래서 «통째로 같을 때만» 푼다. 부분 포함(SUNNY KALMIA ⊃ SUNNY)은 종전대로 배제한다.
      const exact = pn === myName;
      const pc = String(p.callsign || '').toUpperCase().trim();
      if (!exact && cs && pc && cs !== pc && !pc.startsWith(cs) && !cs.startsWith(pc)) return false;
      if (p.updatedAt && Date.now() - p.updatedAt > 7 * 86400000) return false;
      return true;
    });
    //  이름이 통째로 같은 것을 먼저 — 부분 포함보다 앞선다.
    const exacts = hit.filter(p => norm(p.vesselName) === myName);
    const m = latest(exacts.length ? exacts : hit);
    if (m) return m;
  }
  //  3) ★ 2.78 IMO — 콜사인이 서로 다르게 적힌 배(ATPR·KSKM 실측)를 이것으로 잡는다.
  if (_id.imo && /^\d{7}$/.test(_id.imo)) {
    const m = latest(entries.filter((p) => String(p.imo || '').trim() === _id.imo && nameOk(p)));
    if (m) return m;
  }
  //  4) ★ 2.78 선박코드가 곧 키인 레코드 — 콜사인 칸이 비어 선명·코드로 저장된 것(firebase:2503).
  if (_id.code && portMisData && portMisData[_id.code] && nameOk(portMisData[_id.code])) return portMisData[_id.code];
  return null;
}
