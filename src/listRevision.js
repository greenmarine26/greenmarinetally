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
