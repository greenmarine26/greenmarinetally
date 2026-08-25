// 미르가 «한 대»를 보게 하는 겹 — 끝4자리로 물으면 그 컨의 실번호·온도·중량·자리를 말한다.
//
// ─────────────────────────────────────────────────────────────────────────────
// 왜 있는가 (2026-08-25, NSFR 2616N 양하를 클로드가 직접 해보며 나왔다).
//
//   검수사가 늘 하는 질문이 하나 있다 —
//     *«컨테이너 끝자리 4자리만 불러주고 실번호를 묻는다. 그러면 컨테이너 번호, 실번호,
//       XRAY 대상 여부, 선내 위치를 찾아서 답을 한다»*
//
//   그런데 실측하니 미르가 그걸 못 했다. 33문 중 14문이 벙어리였고 그 안에 이것이 있었다.
//     «1918 어디야»      → 12-01-88        ✅
//     «1918 실번호»      → ⛔ 답 없음
//     «1918 씰 뭐야»     → ⛔ 답 없음
//     «1918 중량»        → ⛔ 답 없음
//     «1109 온도»        → ⛔ 답 없음  (「리퍼 온도 뭐야」는 두 대를 다 읽어 준다)
//
//   ★ 자료가 없어서가 아니다. **같은 미르가 다른 질문에는 그 값을 말하고 있었다** —
//     «엑스레이 어디 있어» → *«GAOU2227015 — 25-04-06 · X-RAY 대상 · 씰 NS3655063 · 11.0t»*
//     씰도 중량도 이미 읽고 있다. **개체를 묻는 인텐트만 없었다.**
//     `nlSearch` 에 `sealAuditQuery`(전체 실번호 점검)는 있는데 «이 컨 실번호»는 0건이다.
//
//   ⚠ 화면 카드에는 실번호가 그려진다. 그러나 **손을 안 쓰고 일하려면 미르가 말을 해야 한다** —
//     장갑 낀 손으로 갑판에서 카드를 읽을 수는 없다. 그래서 «보인다»는 «답한다»가 아니다.
//
// 어떻게 붙였나 — 검수사 확정 *«원본은 놔두고 사본을 이용하는것이 젤 좋다»*
//   원본 `nlSearch.js`·`mirKnowledge.js` 는 **한 줄도 안 건드린다.**
//   이 겹이 먼저 보고, 못 보면 `null` 을 내어 **옛 미르가 그대로 답한다.**
//   그래서 지금 되는 것은 하나도 안 바뀐다(미르가 검수사가 되기 전까지 나머지는 그대로 써야 한다).
// ─────────────────────────────────────────────────────────────────────────────

const RE_SEAL = /(실\s*번호|씰\s*번호|씰|봉인\s*번호|봉인|seal)/i;
const RE_TEMP = /(온도|셋\s*포인트|set\s*point|몇\s*도)/i;
const RE_WT   = /(중량|무게|킬로|톤(?!수)|kg|weight)/i;
const RE_POD  = /(어디로\s*가|목적지|도착지|하선|내리는\s*(항|데)|pod)/i;
const RE_ISO  = /(규격|사이즈|크기|몇\s*피트|iso|타입)/i;
//  「어디야」는 옛 미르가 이미 잘 답한다 — 가로채지 않는다.

/** '1918' 처럼 **컨테이너 끝자리**를 뽑는다. 없으면 ''.
 *
 *  ⛔ 게이트가 먼저다 (3금지 ②). 2026-08-25 파급 검증이 잡았다 —
 *    처음에 2자리 이상을 다 잡았더니 **「12번 베이 양하 시작할거야」의 12 를 컨 끝자리로 읽어**
 *    원래 잘 되던 베이 질문 다섯을 통째로 가로챘다. 겹을 앞에 세울 때 늘 나는 사고다.
 *  ⇒ ① **4자리 이상만** 본다 — 검수사 표준이 «끝 4자리» 다.
 *     ② 「N번」·「베이 N」·「N호기」·「N단」·「N열」처럼 **자리·장비를 가리키는 숫자는 뺀다.**
 */
//  ⚠ 숫자 **바로 뒤**만 본다. 처음엔 뒤 세 글자를 통째로 봤더니 「1109 온**도**」의 도가 걸려
//    멀쩡한 온도 질문이 죽었다(파급 검증이 잡았다). 게이트는 좁을수록 안전하다.
const RE_NOT_CN = /^\s*(번|호기|선석|단|열|톤|장|대|%|시\b|분\b)/;
function digitsOf(q) {
  const t = String(q || '');
  const re = /(?<![0-9])([0-9]{4,11})(?![0-9])/g;
  let m;
  while ((m = re.exec(t))) {
    const after = t.slice(m.index + m[1].length, m.index + m[1].length + 3);
    const before = t.slice(Math.max(0, m.index - 3), m.index);
    if (RE_NOT_CN.test(after) || /(베이|호기|열|단)\s*$/.test(before)) continue;   // 「12번」·「베이 12」 는 자리다
    return m[1];
  }
  return '';
}
function findByTail(all, d) {
  if (!d) return [];
  return (all || []).filter((c) => {
    const l4 = c?.l4 || String(c?.cn || '').slice(-4);
    return d.length === 4 ? l4 === d : String(c?.cn || '').endsWith(d);
  });
}
const posOf = (c) => (c?.bay && c?.row && c?.tier) ? `${c.bay}-${c.row}-${c.tier}` : '';
const feetOf = (iso) => {
  const s = String(iso || ''); if (!s) return '';
  const h = s[0];
  return (h === '2') ? '20피트' : (h === '4' || h === 'L' || h === '9') ? '40피트' : '';
};

//  ⚠ 두 화면이 같은 값을 **다른 이름**으로 담는다 — 항차 화면은 `_xraySeal`, 통합검색은 `xraySeal`.
//    한쪽만 읽으면 한 화면에서만 답한다. 둘 다 본다(이 저장소가 여러 번 겪은 «두 벌» 병).
const xsealOf = (c) => String((c?._xraySeal || c?.xraySeal || {}).seal || '').trim();

/** 한 대를 한 줄로 — 검수사 표준 답(컨번호·실번호·XRAY·자리).
 *  `withShip` 이면 배·항차를 앞에 붙인다(통합검색은 여러 배가 섞인다). */
function oneLine(c, withShip) {
  const bits = [];
  if (withShip && c.vsl) bits.push(`${c.vsl} ${c.voy || ''}`.trim());
  bits.push(c.cn);
  const sl = String(c.sl || '').trim();
  bits.push(sl ? `실번호 ${sl}` : '실번호 없음');
  if (c._xray || c.isXray) {
    const xs = xsealOf(c);
    bits.push(xs ? `X-RAY · 세관봉인 ${xs}` : 'X-RAY 대상 · 세관봉인 아직');
  }
  const p = posOf(c);
  if (p) bits.push(p);
  return bits.join(' · ');
}

/**
 * 미르의 눈 — 답할 수 있으면 문장, 못 보면 null(옛 미르로 넘긴다).
 * @param {string} q 검수원이 한 말
 * @param {{containers?:Array}} ctx 화면이 이미 손에 쥐고 있는 것
 */
export function mirSee(q, ctx) {
  const text = String(q || '').trim();
  if (text.length < 2) return null;
  const all = (ctx && ctx.containers) || [];
  if (!all.length) return null;

  const d = digitsOf(text);
  if (!d) return null;
  const hit = findByTail(all, d);
  if (!hit.length) return null;

  //  ⚠ 여러 대가 걸리면 고르게 한다 — 끝4자리는 겹칠 수 있다(검수사 오답 신고 실적).
  if (hit.length > 1) {
    const multiShip = new Set(hit.map((x) => x.vsl || '')).size > 1;
    const lines = hit.slice(0, 6).map((c) => `  · ${oneLine(c, multiShip)}`);
    return `끝자리 ${d} 가 ${hit.length}대입니다 — 어느 것입니까?\n${lines.join('\n')}`;
  }
  const c = hit[0];

  //  ── 무엇을 물었나 ──────────────────────────────────────────────────────
  if (RE_SEAL.test(text)) {
    const sl = String(c.sl || '').trim();
    if (!sl) return `${c.cn} 은 실번호가 아직 없습니다.`;
    //  같은 실번호가 다른 컨에도 붙어 있으면 그것부터 말한다 — 둘 중 하나가 틀린 것이다.
    const dup = all.filter((x) => x !== c && String(x.sl || '').trim() === sl).map((x) => x.cn);
    let s = `${c.cn} 실번호 ${sl}`;
    const p = posOf(c); if (p) s += ` · ${p}`;
    if (c._xray || c.isXray) {
      const xs = xsealOf(c);
      s += xs ? `\nX-RAY 대상 · 세관봉인 ${xs}` : '\nX-RAY 대상 · 세관봉인 아직 안 달았습니다.';
    }
    if (dup.length) s += `\n⛔ 같은 실번호가 ${dup.join(', ')} 에도 붙어 있습니다 — 둘 중 하나가 틀립니다.`;
    return s;
  }

  if (RE_TEMP.test(text)) {
    const t = String(c.tmp ?? '').trim();
    if (!c.rf && !t) return `${c.cn} 은 리퍼가 아닙니다.`;
    if (!t) return `${c.cn} 은 리퍼인데 설정 온도가 자료에 없습니다 — 현장에서 확인해 주십시오.`;
    return `${c.cn} 설정 ${t}°C · ${posOf(c) || '자리 미상'}`;
  }

  if (RE_WT.test(text)) {
    const w = Number(c.wt) || 0;
    if (!w) return `${c.cn} 은 중량이 자료에 없습니다.`;
    return `${c.cn} ${(w / 1000).toFixed(1)}t (${w.toLocaleString()}kg) · ${posOf(c) || '자리 미상'}`;
  }

  if (RE_POD.test(text)) {
    const pod = String(c.pod || '').trim();
    const np = String(c.npod || '').trim();
    if (!pod) return `${c.cn} 은 목적지가 자료에 없습니다.`;
    return `${c.cn} 은 ${pod} 에서 내립니다${np ? ` (다음 기항 ${np})` : ''}.`;
  }

  if (RE_ISO.test(text)) {
    const ft = feetOf(c.iso);
    return `${c.cn} ${c.iso || '규격 미상'}${ft ? ` · ${ft}` : ''} · ${c.fe === 'E' ? '엠티' : '풀'}`;
  }

  //  ── 끝4자리만 불렀다 = 검수사 표준 질문. 한 줄로 다 준다. ──────────────
  //    ⚠ 「어디야」·「엑스레이야」처럼 **옛 미르가 이미 잘 답하는 말**이 붙어 있으면 넘긴다.
  if (/(어디|위치|엑스레이|x-?ray|완료|끝났|남았|내렸|올렸|실었|몇\s*대)/i.test(text)) return null;
  return oneLine(c, false);
}
