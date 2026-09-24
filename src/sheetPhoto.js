// 선적 기록지 사진 한 벌 — 손으로 고쳐 적은 칸(자리·컨번호)을 AI 로 읽고, 그 배의 실제 컨 목록과 맞춰 «자리 → 컨» 을 고른다(저장은 부르는 화면이 한다)
/* ★ TallyOne 3.58 (검수사 2026-09-22 «이것을 넣을수 있게 앱을수정해야» · «콘앱은 검수앱 자료를 받아서 보이게»)
   왜 — XTPG 541E 에서 타항 시프팅 컨(닝보행 50대)을 다른 자리(13·(14)15 베이 홀드)에 다시 실었는데, 카토스는 그 컨을 양하 목록 안에서
     상태만 바꿔 주고 **새 자리는 안 준다.** 새 자리는 검수원이 베이플랜 인쇄물에 손으로 적은 기록지에만 있다.
   흐름 — ① readSheetPhoto: 사진 → AI(공용 키 aiCall 한 벌) → 칸마다 {slot, 손글씨 머리글자·숫자}
          ② matchSheetItems: AI 글자는 자주 틀린다(실측 EAXU2045294 → «CAXU 2046294») — 그대로 쓰지 않고 그 배의 후보 컨과 견주어
             가장 가까운 **실제 컨번호**를 고른다. 1위가 숫자 2자리 안으로 맞고 2위와 뚜렷이 갈릴 때만 자동, 아니면 «확인 필요».
   실측(2026-09-22 20:27 사진 · 30칸) — 칸 30/30 · 자동 맞음 29 · 틀림 0 · 확인 필요 1(14-02-06, AI 가 숫자 6자리만 읽음).
   ⚠ 이 파일은 읽기만 한다. RTDB 쓰기는 SheetPhotoModal 이 기존 저장 함수(fbUpdateRecordField·fbSetActualPosition·fbCompleteContainer)로 한다. */
import { aiCall } from './gemini.js';

export const SHEET_PROMPT = `이 사진은 컨테이너선 베이플랜 인쇄물에 검수원이 손으로 표시한 선적 기록지입니다.

인쇄물 읽는 법
- 칸마다 인쇄 글자가 네 줄 있습니다: ① "NTG/ *INC" ② 인쇄된 컨번호(영문4+숫자7) ③ 선사·E/F·높이·규격 ④ "....130604" 처럼 점 뒤 여섯 자리 = 칸 자리(베이2·열2·단2).
- **인쇄된 글자와 손으로 쓴 글자는 절대 섞지 않습니다.** 인쇄 글자는 printed_cn 에만, 손글씨는 hand_prefix·hand_digits 에만 넣습니다.

검수원 표시는 두 가지뿐입니다
1) 손으로 컨번호를 적은 칸(kind "hand") — 계획과 다른 컨이 실린 칸입니다. 칸 위쪽에 영문 4자, 아래쪽에 숫자 7자리를 손으로 적습니다.
   - 인쇄된 머리글자에 동그라미를 치고 숫자만 손으로 적었으면, hand_prefix 에 그 인쇄 머리글자를 넣고 hand_digits 에 손으로 적은 숫자를 넣습니다.
2) 손으로 쓴 숫자 없이 사선(／)·동그라미·체크(✓) 같은 표시만 있는 칸(kind "mark") — **인쇄된 계획 컨이 그대로 실린 칸**입니다.
   - hand_prefix·hand_digits 는 빈 문자열로 두고, printed_cn 에 인쇄된 컨번호를 정확히 읽어 넣습니다.
- 아무 표시도 없는 칸은 넣지 않습니다. X 로 지운 빈 칸도 넣지 않습니다.

다음 JSON 으로만 답하십시오. 설명 없이 JSON 만.
{"items":[{"slot":"130604","kind":"hand","hand_prefix":"TRHU","hand_digits":"3477064","printed_cn":"WDFU1225273","sure":true},{"slot":"100204","kind":"mark","hand_prefix":"","hand_digits":"","printed_cn":"CAXU5732380","sure":true}]}

규칙
- slot 은 칸 아래 인쇄된 "....xxxxxx" 여섯 자리 그대로. 손글씨가 그 숫자를 덮고 있어도 인쇄된 숫자를 읽습니다.
- 흐려서 확실하지 않은 숫자 자리는 ? 로 둡니다. 지어내지 않습니다.
- sure 는 읽은 글자가 모두 분명하면 true, 하나라도 애매하면 false.`;

/** AI 에 보낼 몸체 — 사진은 JPEG base64(부르는 쪽이 줄여서 넘긴다). */
export function sheetRequestBody(base64Jpeg) {
  return {
    contents: [{ parts: [{ text: SHEET_PROMPT }, { inline_data: { mime_type: 'image/jpeg', data: base64Jpeg } }] }],
    //  3.60-06 (진단 M30): 생각 토큰이 출력 한도를 같이 쓴다 — 엠티실 판독처럼 넉넉히(8192 로는 칸 많은 기록지가 뒤에서 잘린다).
    generationConfig: { temperature: 0.1, maxOutputTokens: 32000, responseMimeType: 'application/json' },
  };
}

/** AI 응답(JSON 문자열 또는 이미 풀린 응답 객체) → 칸 목록. 칸 자리가 여섯 자리 숫자가 아니면 버린다(지어낸 칸 방지). */
export function parseSheetResponse(resp) {
  //  3.60-06: 한도에 걸려 잘린 응답은 뒤 칸이 조용히 빠진다 — 잘렸다고 말한다.
  if (resp && typeof resp === 'object' && resp?.candidates?.[0]?.finishReason === 'MAX_TOKENS') throw new Error('기록지 판독이 길어 잘렸어요 — 기록지를 절반씩 나눠 찍어 주세요.');
  let text = resp;
  if (resp && typeof resp === 'object') text = resp?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('기록지 판독 결과를 못 읽었어요 — 사진을 다시 찍어 주세요.');
  let j;
  try { j = JSON.parse(m[0]); } catch (e) {
    //  AI 가 JSON 을 한 군데 깨뜨려 보낼 때가 있다(검수사 폰 실측 2026-09-22 «Expected ',' or ']' after array element … line 30») —
    //  통째로 버리지 않고 칸 하나하나({ … slot … })를 따로 풀어 성한 칸만 쓴다. 깨진 칸은 빠지고 두 번 읽기에서 «한 번만 읽힌 칸» 으로 남는다.
    const items = [];
    for (const one of String(m[0]).slice(1).match(/\{[^{}]*\}/g) || []) { try { const o = JSON.parse(one); if (o && o.slot) items.push(o); } catch (e2) { /* 깨진 칸 하나 — 건너뛴다 */ } }
    if (!items.length) throw new Error('기록지 판독 결과가 깨져 왔어요 — 한 번 더 눌러 주세요.');
    j = { items };
  }
  const seen = new Map(); const out = [];   // 같은 칸이 두 번 나오면 버리지 않고 둘 다 «확인 필요» — 한 칸은 다른 칸을 잘못 읽은 것이다(실측 13-04-04 를 «15-04-04» 로 두 번째 읽음)
  for (const it of (Array.isArray(j.items) ? j.items : [])) {
    const slot = String(it.slot || '').replace(/\D/g, '');
    if (slot.length !== 6) continue;
    const o = { slot, bay: slot.slice(0, 2), row: slot.slice(2, 4), tier: slot.slice(4, 6),
      prefix: String(it.hand_prefix || '').toUpperCase().replace(/[^A-Z]/g, ''),
      digits: String(it.hand_digits || '').replace(/[^0-9?]/g, ''),
      printed: String(it.printed_cn || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), sure: it.sure !== false };
    //  3.58-07 (검수사 2026-09-23 «인쇄된 문자와 수기로 필기한 문자를 같이 취급하면 오류 … 사선을 긋거나 동그라미 표시한것은 원래 계획한 컨테이너가 왔다는 표시»)
    //    손으로 쓴 숫자가 없으면 «표시만» 칸이다 — 손글씨 칸을 비우고 인쇄 컨번호만 쓴다(AI 가 kind 를 빠뜨려도 숫자 유무로 가른다).
    o.kind = o.digits.replace(/\?/g, '').length >= 4 ? 'hand' : (o.printed ? 'mark' : 'hand');
    if (o.kind === 'mark') { o.prefix = ''; o.digits = ''; }
    if (seen.has(slot)) { o.dupSlot = true; seen.get(slot).dupSlot = true; } else seen.set(slot, o);
    out.push(o);
  }
  return out;
}

/** ISO 6346 체크디지트 — 맞으면 true. */
export function isoOk(cn) {
  const s = String(cn || '').toUpperCase();
  if (!/^[A-Z]{4}\d{7}$/.test(s)) return false;
  const V = {}; for (let i = 0; i < 10; i++) V[String(i)] = i;
  let a = 10; for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') { if (a % 11 === 0) a++; V[ch] = a++; }
  let sum = 0; for (let i = 0; i < 10; i++) sum += V[s[i]] * (2 ** i);
  return (sum % 11) % 10 === Number(s[10]);
}

/** 선적 기록지의 후보 컨 — 선적 계획(ediContainers)·선적 기록(records) + **양하 실적 중 평택 양하 계획에 없는 컨(= 타항 시프팅, 다시 실린다)**. */
export function sheetCandidates(voyage) {
  const L = (voyage && voyage.loading) || {}, D = (voyage && voyage.discharge) || {};
  const set = new Set([...Object.keys(L.ediContainers || {}), ...Object.keys(L.records || {})]);
  const dPlan = D.ediContainers || {};
  for (const cn of Object.keys(D.termWork || {})) if (!dPlan[cn]) set.add(cn);
  return Array.from(set).filter((c) => /^[A-Z]{4}\d{7}$/.test(c));
}

function _diff(a, b) {
  let d = Math.abs(a.length - b.length);
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== '?' && a[i] !== b[i]) d++;
  return d;
}
/** 칸마다 후보 중 가장 가까운 실제 컨을 고른다. 숫자가 무겁다(×3) — 머리글자는 손글씨가 인쇄 글자와 겹쳐 AI 가 자주 틀린다.
 *  자동으로 정하는 조건: 숫자 차이 ≤ 2 이고 2위와 점수 차 ≥ 2. 아니면 cn=null(«확인 필요») 로 두고 1·2위를 보여 준다. */
/** 3.58-05: 기록지 칸이 이 배 베이사전에 있는 칸인가 — 없으면 false, 사전이 그 베이를 모르면 null(판정 안 함).
 *  실측 (10)11 기록지 — AI 가 홀드 6열뿐인 베이에 «10-07-04» 를 지어냈다. 열은 그 구역(데크/홀드) 최대 칸 수 안이어야 한다. */
export function sheetSlotOk(bayDef, bay, row, tier) {
  const bs = bayDef && Array.isArray(bayDef.baysSummary) ? bayDef.baysSummary : null;
  if (!bs) return null;
  const b = parseInt(bay, 10), r = parseInt(row, 10), t = parseInt(tier, 10);
  if (!Number.isFinite(b) || !Number.isFinite(r) || !Number.isFinite(t)) return false;
  const no = (x) => parseInt(x && (x.bayNo || x.bay), 10);
  const e = bs.find((x) => no(x) === b) || bs.find((x) => no(x) === b + 1) || bs.find((x) => no(x) === b - 1);
  if (!e) return null;
  const deck = t >= 80;
  const tiers = ((deck ? e.deckTiers : e.holdTiers) || []).map(Number).filter(Number.isFinite);
  if (!tiers.length) return null;   // 사전에 단 목록이 없으면 판정하지 않는다(막지 않는다)
  if (!tiers.includes(t)) return false;
  //  칸 수(deckCells·holdCells)는 00열을 뺀 수다(BayGridEditor·coneCargoPlan 과 같은 셈) — 열은 1..n, 00열은 따로.
  const cells = ((deck ? e.deckCells : e.holdCells) || []).map(Number).filter(Number.isFinite);
  const n = cells.length ? Math.max(...cells) : (Number(e.rowCount) || 0);
  if (!n) return null;
  const zf = deck ? e.deckHasZero : e.holdHasZero;
  const zero = zf !== undefined && zf !== null ? !!zf : !!e.hasZero;
  if (r === 0) return zero;
  return r >= 1 && r <= n;
}

export function matchSheetItems(items, candidates, slotOk) {
  const pool = Array.from(new Set(candidates || []));
  const taken = new Map();   // 같은 컨이 두 칸에 걸리면 둘 다 확인 필요로 내린다
  const rows = (items || []).map((it) => {
    if (it.kind === 'mark') {
      //  표시만 있는 칸 — 인쇄된 계획 컨이 그대로 실렸다. 인쇄 컨번호가 이 배 후보에 **글자 그대로** 있을 때만 자동(비슷한 컨으로 바꾸지 않는다).
      const bad = typeof slotOk === 'function' && slotOk(it.bay, it.row, it.tier) === false;
      const hit = pool.includes(it.printed);
      const auto = hit && !bad && !it.dupSlot;
      const r = { ...it, cn: auto ? it.printed : null, best: it.printed || null, second: null,
        why: auto ? '' : bad ? '이 배에 없는 칸 번호예요 — 칸 번호를 확인해 주세요' : it.dupSlot ? '같은 칸 번호가 두 번 읽혔어요 — 칸 번호를 확인해 주세요' : '표시만 있는 칸인데 인쇄 컨번호가 이 배 목록에 없어요 — 확인해 주세요' };
      if (r.cn) taken.set(r.cn, (taken.get(r.cn) || 0) + 1);
      return r;
    }
    const sc = pool.map((c) => {
      const dd = _diff(it.digits, c.slice(4));
      const pd = it.prefix.length === 4 ? _diff(it.prefix, c.slice(0, 4)) : 2;
      return { cn: c, score: dd * 3 + pd, dd };
    }).sort((a, b) => a.score - b.score);
    const b1 = sc[0] || null, b2 = sc[1] || null;
    const bad = typeof slotOk === 'function' && slotOk(it.bay, it.row, it.tier) === false;
    const auto = !bad && !it.dupSlot && !!b1 && b1.dd <= 2 && (!b2 || (b2.score - b1.score) >= 2);   // 3.60-06 검토: sure:false 제외는 넣지 않았다 — XTPG 541E 실응답에서 두 번 읽기가 이미 틀림 0 이고 자동만 23→19~22 로 줄었다(smoke_sheetphoto)
    const r = { ...it, cn: auto ? b1.cn : null, best: b1 && b1.cn, second: b2 && b2.cn, why: auto ? '' : bad ? '이 배에 없는 칸 번호예요 — 칸 번호를 확인해 주세요' : it.dupSlot ? '같은 칸 번호가 두 번 읽혔어요 — 칸 번호를 확인해 주세요' : (b1 ? `숫자를 ${b1.dd}자리 다르게 읽었어요 — 확인해 주세요` : '후보가 없어요') };
    if (r.cn) taken.set(r.cn, (taken.get(r.cn) || 0) + 1);
    return r;
  });
  for (const r of rows) if (r.cn && taken.get(r.cn) > 1) { r.why = '같은 컨이 두 칸에 걸렸어요 — 확인해 주세요'; r.cn = null; }
  return rows;
}

/** 사진 파일 → 칸 목록(AI). 긴 변 2000px JPEG 로 줄여 보낸다. */
export async function readSheetPhoto(file) {
  const base64 = await _toJpegBase64(file, 2000);
  // 같은 사진을 두 번 따로 읽는다(동시에) — 한 번 읽기는 칸 번호를 뒤바꿔 읽는 일이 있다(실측 14-04-06 → «14-06-04»). 두 번이 같게 읽은 것만 자동.
  const one = async () => {
    const res = await aiCall('sheetPhoto', sheetRequestBody(base64), { timeoutMs: 90000 });
    if (!res.ok) { const t = await res.text(); throw new Error(`AI 오류 ${res.status}: ${t.slice(0, 160)}`); }
    return parseSheetResponse(await res.json());
  };
  const rs = await Promise.allSettled([one(), one()]);
  const ok = rs.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!ok.length) throw rs[0].reason;
  return ok;
}

/** 두 번 읽은 결과를 맞춘다 — 두 번 모두 같은 칸에 같은 컨을 고른 것만 자동, 어긋나면 «확인 필요». 한 번만 읽혔으면 그 결과 그대로. */
export function matchSheetRuns(runs, candidates, slotOk) {
  const ms = (runs || []).map((items) => matchSheetItems(items, candidates, slotOk));
  if (ms.length < 2) return ms[0] || [];
  const [a, b] = ms;
  const bBySlot = new Map(b.map((r) => [r.slot, r]));
  const bByCn = new Map(b.filter((r) => r.cn).map((r) => [r.cn, r]));
  const out = a.map((r) => {
    if (!r.cn) return r;
    const o = bBySlot.get(r.slot), c = bByCn.get(r.cn);
    if (o && o.cn === r.cn) return r;
    return { ...r, cn: null, best: r.cn, why: c ? `다시 읽으니 이 컨이 ${c.bay}-${c.row}-${c.tier} 로 읽혔어요 — 확인해 주세요` : '두 번 읽은 결과가 달라요 — 확인해 주세요' };
  });
  const aSlots = new Set(a.map((r) => r.slot)), aCns = new Set(a.map((r) => r.best).filter(Boolean));
  for (const r of b) if (!aSlots.has(r.slot)) out.push({ ...r, cn: null, why: aCns.has(r.best) ? `이 컨이 다른 칸에도 읽혔어요 — 확인해 주세요` : '한 번만 읽힌 칸이에요 — 확인해 주세요' });
  return out;
}
function _toJpegBase64(file, maxSide) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      try {
        const s = Math.min(1, maxSide / Math.max(img.width, img.height));
        const cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/jpeg', 0.85).split(',')[1]);
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('사진을 열지 못했어요 — HEIC 사진이면 폰 카메라 설정을 «호환성 우선(JPG)» 으로 바꾸거나 캡처해서 올려 주세요.')); };
    img.src = url;
  });
}
