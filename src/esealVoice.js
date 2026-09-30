// ATPR 위해행 엠티 선적 — 검수원이 부르는 엠티실 뒷 세 자리를 배정 구간 앞 세 자리와 합쳐 여섯 자리 실로 만드는 한 벌(화면·마이크는 EsealVoiceBar)
/* ★ TallyOne 3.71 (검수사 2026-09-30 «ATPR WEI 엠티 선적시에만 … 컨번호를 불러주고 엠티실번호를 입력하라고 하고 마이크를 열어주고 검수가 실번호를 불러 주면 입력 …
     세자리를 불러주는데 앞자리 세자리는 이곳에 실 구간을 넣어주면 그것의 앞자리 세자리와 검수가 불러주는 뒷자리 세자리를 리스트에 입력»)
   ⚠ 이 파일은 읽기만 한다. 저장은 EsealVoiceBar 가 기존 fbSetEmptySeal(컨 상세·기록지 사진과 같은 길)로 한다.
   ⚠ 대상은 ATPR(정책 code ATRP) 의 «엠티 + POD 위해(CNWEI·CNWEH)» 뿐이다 — 다른 선박·다른 POD 엠티는 이 기능이 건드리지 않는다. */
import { matchShipPolicy, applyPolicyToContainer, normalizeVslName } from './shipPolicies.js';
import { spokenDigitsRaw } from './voice.js';
import { expandSeal } from './esealPhoto.js';

/** 이 컨이 «ATPR 위해행 엠티(실 부착)» 인가. 선적 카드에서만 부른다(호출부가 mode 를 가른다). */
export function isAtprWeiEmpty(vsl, c) {
  if (!c) return false;
  //  선박명은 정확히 ATPR·ATRP·ATLANTIC PIONEER 일 때만 — matchShipPolicy 의 부분 일치가 다른 배를 ATPR 로 잘못 보지 않게(감사 권고, «다른 선박은 절대 안 한다»)
  if (!['ATPR', 'ATRP', 'ATLANTIC PIONEER'].includes(normalizeVslName(vsl))) return false;
  const p = matchShipPolicy(vsl, {}, []);   // 기본 정책만 — 검수사가 다른 배에 붙인 정책은 이 기능과 무관
  return !!(p && p.code === 'ATRP' && applyPolicyToContainer(p, c) === 'attach');
}

/** 배정 구간 [{from,to}] → 여섯 자리 실 목록(VoyagePage 엠티실 카드의 전개와 같은 규칙 — 구간당 10,000 가드). */
export function esealPoolOf(ranges) {
  const pool = [];
  for (const r of (ranges || [])) {
    const f = parseInt(r.from, 10), t = parseInt(r.to, 10);
    if (!Number.isFinite(f) || !Number.isFinite(t) || t < f || t - f > 10000) continue;
    for (let n = f; n <= t; n++) pool.push(String(n).padStart(String(r.from).length, '0'));
  }
  return pool;
}

/** 이 배에 이미 붙은 실 → 컨. 항차 기록(records)과 EDI 칸을 함께 본다. */
export function esealUsedMap(records, edi) {
  const used = {};
  for (const src of [edi || {}, records || {}]) {
    for (const [cn, v] of Object.entries(src)) {
      const e = String(v?.eseal || '').trim();
      if (e) used[e] = cn;
    }
  }
  return used;
}

/** 음성 인식 후보들(alts) → 숫자 후보(뒷 세 자리, 여섯 자리를 다 불렀으면 여섯 자리). 세 자리 미만은 버린다. */
export function hearTails(alts) {
  const out = [];
  for (const a of (alts || [])) {
    const d = spokenDigitsRaw(a);
    if (d.length < 3) continue;
    const t = d.length >= 6 ? d.slice(-6) : d.slice(-3);
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

/** 불러 준 숫자(또는 손으로 친 세 자리) → 여섯 자리 실.
 *  돌려주는 것 { seal, tail, choices, why } — 실이 하나로 정해질 때만 seal. 다른 컨에 이미 붙은 실은 막는다. */
export function resolveSpokenSeal(alts, pool, used, cn) {
  const tails = hearTails(alts);
  if (!tails.length) return { seal: null, tail: '', choices: [], why: '세 자리를 못 들었어요' };
  if (!(pool || []).length) return { seal: null, tail: tails[0], choices: [], why: '엠티실 구간이 없어요' };
  let firstFail = null;
  for (const t of tails) {
    const x = expandSeal(t, pool);
    if (x.seal) {
      const who = used && used[x.seal];
      if (who && who !== cn) { firstFail = firstFail || { seal: null, tail: t, choices: [], why: `${x.seal.slice(-3)} 실은 이미 ${who.slice(-4)} 에 붙어 있어요` }; continue; }
      return { seal: x.seal, tail: t, choices: [], why: '' };
    }
    if (x.choices.length > 1) {
      const free = x.choices.filter((s) => !(used && used[s] && used[s] !== cn));
      if (free.length === 1) return { seal: free[0], tail: t, choices: [], why: '' };
      if (free.length > 1) return { seal: null, tail: t, choices: free, why: '앞 세 자리가 둘 이상이에요 — 골라 주세요' };
    }
    firstFail = firstFail || { seal: null, tail: t, choices: [], why: x.why };
  }
  return firstFail || { seal: null, tail: tails[0], choices: [], why: '구간에 없는 번호예요' };
}
