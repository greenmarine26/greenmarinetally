// 리스트 개정판 판정 한 벌 — 같은 기본이름 리스트 중 컨이 반 넘게 겹치면 새 판만 남긴다(수집기 선적 합본 merge_entry.js · 양하 자동 등록 autoRegApi.js 공용)
//
// ★ TallyOne 3.61-02 (검수사 2026-09-26 «새로운 자료를 적용을 안하고 전자료를 이용하는이유? 금일은 TMPZ새로운걸로 적용하면 305개 맞는데
//   그전 자료를 이용하면 307개가 됨 그런데 수집기는 후자를 택함») — 이 판정은 merge_entry.js 안에만 있었다(v2.17.4 · 2.17.5 · 2.17.9).
//   그래서 선적 합본은 옛 판을 뺐지만 **양하 자동 등록(autoRegApi)은 두 리스트를 합쳐** TMPZ 2030E 가 307(정답 305)이 됐다.
//   실측: «CDL TMPZ EAS 2030E.xlsx» 50대 + 새 판 «CDL TMPZ EAS 2030E1.xlsx» 47대(옛 판과 47/47 겹침) → 합치면 EDI 밖 2대가 남는다.
//   ⇒ 판정을 이 파일 하나로 꺼내 두 경로가 같이 쓴다. 규칙 자체는 merge_entry.js 에 있던 그대로다(글자 하나 안 바꿈).

// v2.17.4: 개정판 대체 — 같은 기본이름(끝 1~2자리 숫자/(n) 무시)의 리스트는 최신만 남긴다.
//   "SIMJ 2636W (Excel).xls" 1차의 빠진 컨 4대가 "(Excel)1" 2차가 와도 합본에 잔존하던 문제.
//   (5자리 부킹번호가 붙은 CONTAINERLIST53275류는 서로 다른 리스트 — 1~2자리만 개정판으로 본다.)
// v2.17.5: 개정판 마커 확장 — REVISED/RE)/수정/최종/개정/n차가 이름 어디에 붙어도 같은 그룹으로.
//   (STMJ2636WCN_CNTAO_REVISED CONTAINERLIST가 원본과 합집합으로 섞이던 문제, 사용자 보고 2026-07-07.)
export const listBaseKey = (nm) => String(nm || "").toLowerCase()
  .replace(/\.(xls|xlsx)$/, "")
  .replace(/preloadlistdeadline|finalloadlistdeadline/g, "loadlistdeadline")
  .replace(/revised?|final|\bre\)|\(re\)|수정본|수정|최종|개정|[0-9]+차/g, " ")
  .replace(/\s*\(\d{1,2}\)$/, "").replace(/[\s_-]*\d{1,2}$/, "")
  .replace(/[\s_()\-\.]+/g, "");

// v2.17.5b: 개정 서열 — mtime은 수집기가 매 사이클 파일을 다시 저장해 신뢰 불가(라이브에서 옛 CNTAO가
//   REVISED보다 mtime이 최신으로 나옴). 이름의 개정 마커 자체로 서열을 정한다.
//   최종(99) > REVISED/RE)/수정/개정(50) > n차·끝자리 n·(n)(=n) > 무표시(0). 동률이면 mtime, 그다음 이름 긴 쪽.
export const listRevRank = (nm) => {
  const n = String(nm || "").toLowerCase().replace(/\.(xls|xlsx|edi|asc)$/, "");
  if (/최종|final/.test(n)) return 99;
  if (/revised?|\bre\)|\(re\)|수정본|수정|개정/.test(n)) return 50;
  let r = 0, m;
  if ((m = n.match(/([0-9]{1,2})\s*차/))) r = Math.max(r, parseInt(m[1], 10));
  if ((m = n.match(/\((\d{1,2})\)\s*$/))) r = Math.max(r, parseInt(m[1], 10));
  if ((m = n.match(/[\s_-]*(\d{1,2})\s*$/))) r = Math.max(r, parseInt(m[1], 10));
  return r;
};

export const newerListRev = (a, b) => { // a가 b보다 새 개정판이면 true.
  if (!b) return true;
  const ra = listRevRank(a.name), rb = listRevRank(b.name);
  if (ra !== rb) return ra > rb;
  if ((a.mtime || 0) !== (b.mtime || 0)) return (a.mtime || 0) > (b.mtime || 0);
  return String(a.name || "").length > String(b.name || "").length;
};

// v2.17.9: 개정판 판정을 '내용(컨 집합) 기준'으로 (사용자 확정 2026-07-09, A안).
//   메일 중복 다운로드로 파일명이 같아 (1)(2)가 붙은 서로 다른 선사 리스트가 같은
//   baseKey로 묶여 최신 하나만 남고 나머지가 '구판 제외'되던 문제(SWSP 2606S:
//   HSL1·HAS223·SKR389 중 SKR만 남아 613→389). 같은 baseKey라도 컨 집합이 겹치면
//   (진짜 개정) 최신만, 겹치지 않으면(다른 선사) 모두 합친다.
export const LIST_REV_OVERLAP = 0.5;

// files: [{ name, mtime }] — 리스트로 분류된 파일만 넘긴다. cnSetOf(name) → 그 파일의 실번호 Set.
// 반환: 구판으로 뺄 파일 이름 Set.
export function listRevisionDrops(files, cnSetOf) {
  const groups = {};
  for (const f of files || []) {
    const k = listBaseKey(f.name);
    (groups[k] = groups[k] || []).push(f);
  }
  const drop = new Set();
  for (const gk in groups) {
    const grp = groups[gk].slice().sort((a, b) => (newerListRev(a, b) ? -1 : 1));
    const kept = new Set();
    let first = true;
    for (const f of grp) {
      const cs = cnSetOf(f.name) || new Set();
      if (first) { first = false; cs.forEach((c) => kept.add(c)); continue; }
      let inter = 0;
      cs.forEach((c) => { if (kept.has(c)) inter++; });
      const denom = Math.min(cs.size, kept.size) || 1;
      if (cs.size > 0 && inter / denom >= LIST_REV_OVERLAP) drop.add(f.name);
      else cs.forEach((c) => kept.add(c));
    }
  }
  return drop;
}

// ★ TallyOne 4.07-02 / MailPilot 2.42-03 — **공컨만 고친 개정판(«REVISED EMPTY CONTAINERLIST»)** 은 옛 리스트의 공컨만 대체한다.
//   검수사 2026-10-06 «선적 취소 문건이 와 있는데 적용이 안되고 있습니다. 수집기에 변경에 대한 반응이 적용되어 있을텐데 무슨이유인지 적용이 안되고 있습니다. 이번 항차 STSE건입니다.»
//   실측 STSE 2678W — 선사(SITC)가 09:57 에 `STSE2678WCN_REVISED EMPTY CONTAINERLIST.XLS`(공컨 215대)를 보냈다. 원래 리스트
//   `STSE2678WCN_CONTAINERLIST.XLS`(330대 = 풀 30 + 공컨 300)에서 공컨 85대를 취소한 것이다(300-215=85, 512-85=427=터미널 배정 선적).
//   그런데 위 `listBaseKey` 는 이름에 남은 «EMPTY» 한 낱말 때문에 두 파일을 다른 계열로 보아 합집합으로 합쳤고(512), 취소분 85대가 그대로 남았다.
//   ⚠ 두 파일을 한 계열로 묶어 통째 대체(`listRevisionDrops`)하면 안 된다 — 개정판에는 풀 컨 30대가 없어 옛 판과 함께 사라진다.
//   ⇒ 개정판이 «공컨만» 담은 목록(이름에 공컨 낱말 · 행이 전부 F/E=E)일 때, 같은 계열 옛 리스트의 **공컨 중 개정판에 없는 것만** 뺀다. 풀 컨은 그대로 둔다.
//   조건이 하나라도 안 맞으면 아무것도 안 뺀다(종전과 같음) — 개정판에 풀이 섞였거나, 옛 리스트와 공컨이 반도 안 겹치거나, 계열이 안 맞으면.
export const EMPTY_WORD_RE = /empt(?:y|ies)|엠티|공컨/i;
const EMPTY_WORD_RE_G = /empt(?:y|ies)|엠티|공컨/gi;
// 이름에 «명시한 개정 표시»(REVISED·최종·수정·개정…)와 공컨 낱말이 같이 있는가.
//   ⚠ 끝 숫자(…EMPTY 55.xls)나 n차는 개정 표시로 치지 않는다 — listRevRank 는 끝 숫자도 서열로 쓰므로(55 ≥ 50) 숫자가 큰 이름이 개정판으로 오인된다(독립 감사 2026-10-06).
const REV_MARK_RE = /최종|final|revised?|\bre\)|\(re\)|수정본|수정|개정/;
export const isEmptyRevisionName = (nm) => REV_MARK_RE.test(String(nm || "").toLowerCase()) && EMPTY_WORD_RE.test(String(nm || ""));
// 공컨 낱말을 뺀 이름의 계열 키 — 옛 리스트의 listBaseKey 와 같으면 같은 계열이다
export const listFamilyKey = (nm) => listBaseKey(String(nm || "").replace(EMPTY_WORD_RE_G, " "));

// files: [{ name, mtime }] — 리스트 파일만. cnSetOf(name) → 실번호 Set, feOf(name, cn) → 'E'|'F'|''.
// wholeDrop: 위 listRevisionDrops 가 이미 통째로 뺀 파일 이름 Set(그 파일은 계산에서 뺀다).
// 반환: Map(옛 리스트 파일 이름 → { cns: 그 파일에서 뺄 컨 Set, by: 근거가 된 개정판 파일 이름 Set }).
// 판정(독립 감사 반영 — 지나치게 빼지 않는 쪽으로만 좁혔다)
//   ① 개정판은 «공컨만» 담은 것이어야 한다(F/E 가 F 인 행이 하나라도 있으면 공컨 개정판이 아니다).
//   ② 개정판 한 개마다 옛 리스트의 공컨과 작은 쪽 기준 절반 넘게 겹쳐야 근거로 쓴다(다른 선사 목록 배제).
//   ③ 근거가 된 개정판들의 합집합이 옛 리스트의 공컨 **절반 이상을 덮어야** 한다 — 5대짜리 부분집합 개정판이 옛 공컨 295대를 지우지 못하게.
//   ④ 취소 = 옛 공컨 − 개정판들의 합집합. 개정판이 둘이어도(서로 다른 반쪽씩) 합집합으로 한 번에 센다.
//   ⑤ «옛 리스트»는 개정 표시도 끝 숫자도 없는 원본이어야 한다(listRevRank 0). 개정판 뒤에 늦게 온 «…CONTAINERLIST1.XLS» 같은 전체 리스트가
//      옛 판으로 취급돼 그 공컨이 취소되는 것을 막는다(독립 감사 2026-10-06 — 못 지우는 쪽으로만 좁힌다).
export function listPartialRevisionDrops(files, cnSetOf, feOf, wholeDrop) {
  const out = new Map();
  const live = (files || []).filter((f) => !(wholeDrop && wholeDrop.has(f.name)));
  for (const o of live) {
    if (listRevRank(o.name) > 0) continue;   // ⑤ 개정 표시·끝 숫자가 붙은 리스트는 «옛 원본»이 아니다
    const oCns = cnSetOf(o.name);
    if (!oCns || !oCns.size) continue;
    const oEmpty = [];
    oCns.forEach((c) => { if (feOf(o.name, c) === "E") oEmpty.push(c); });
    if (!oEmpty.length) continue;
    const key = listBaseKey(o.name);
    const union = new Set(), by = new Set();
    for (const p of live) {
      if (p.name === o.name || !isEmptyRevisionName(p.name) || listFamilyKey(p.name) !== key) continue;   // 같은 계열의 «공컨 낱말 없는» 옛 리스트
      if (!newerListRev(p, o)) continue;
      const pCns = cnSetOf(p.name);
      if (!pCns || !pCns.size) continue;
      // 개정판이 «공컨만» 담았는가 — 이름에 공컨 낱말이 있으므로 F/E 칸이 빈 행은 공컨으로 본다(합본이 같은 규칙으로 E 를 채운다).
      let pure = true;
      pCns.forEach((c) => { const fe = feOf(p.name, c); if (fe && fe !== "E") pure = false; });
      if (!pure) continue;
      let inter = 0;
      oEmpty.forEach((c) => { if (pCns.has(c)) inter++; });
      if (inter / (Math.min(pCns.size, oEmpty.length) || 1) < LIST_REV_OVERLAP) continue;   // 옛 판의 공컨과 반도 안 겹치면 다른 목록
      pCns.forEach((c) => union.add(c));
      by.add(p.name);
    }
    if (!by.size) continue;
    const gone = oEmpty.filter((c) => !union.has(c));
    if (!gone.length) continue;
    if ((oEmpty.length - gone.length) / oEmpty.length < LIST_REV_OVERLAP) continue;   // 개정판들이 옛 공컨의 반도 못 덮으면 부분집합일 뿐이다
    out.set(o.name, { cns: new Set(gone), by });
  }
  return out;
}
