// PORT-MIS 레코드 매칭의 본체 — 신원(_id: code·callsign·imo·name)을 밖에서 받는다. 베이사전을 안 읽어 콘앱 번들(mir-core)에도 실린다.
//   3.60-18 / ConeOne 2.55-01 (진단 M28 · 다수결 V2): 종전 portMisMatch.matchPortMis 의 규칙을 글자 그대로 옮겼다(판정 한 벌 — 검수앱은 portMisMatch 가
//   베이매트릭스 신원(shipIdentityOf)을 얹어 이 함수를 부르고, 콘앱은 항차 info 의 신원만으로 부른다).
import { parsePortMisDateTime } from './utils.js';
import { WINDOW_H } from './badgeRule.js';

//  항차 info 만으로 만드는 신원 — 베이사전이 없는 자리(콘앱)용. 검수앱은 shipIdentityOf(베이사전 포함)를 쓴다.
export function shipIdentityLite(info) {
  const code = String(info?.vsl || '').toUpperCase().trim();
  const cs = String(info?.callsign || '').toUpperCase().trim();
  const imo = String(info?.imo || '').replace(/[\s\u3000]/g, '');
  const name = String(info?.vslFull || '').replace(/[\u3000]/g, ' ').trim();
  return { code, callsign: cs, imo, name };
}

export function matchPortMisById(portMisData, info, _id) {
  const entries = Object.values(portMisData || {}).filter(p => p && (p.eta || p.etd));
  if (!entries.length) return null;
  //  ⚠ 사전 이름에 탭·전각공백이 섞여 오는 실물이 있다(MCSC = «\tSEASPAN CALICANTO») — 같이 걷는다.
  const norm = (x) => String(x || '').toUpperCase().replace(/[\s\u3000\-_.]/g, '');
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
