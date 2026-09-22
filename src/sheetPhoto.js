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

export const SHEET_PROMPT = `이 사진은 컨테이너선 베이플랜 인쇄물에 검수원이 손으로 고쳐 적은 선적 기록지입니다.

인쇄물 읽는 법
- 칸마다 인쇄 글자가 네 줄 있습니다: ① "NTG/ *INC" ② 인쇄된 컨번호(영문4+숫자7) ③ 선사·E/F·높이·규격 ④ "....130604" 처럼 점 뒤 여섯 자리 = 칸 자리(베이2·열2·단2).
- 검수원이 실제로 실은 컨이 인쇄된 컨과 다르면, 칸 위쪽에 영문 4자(머리글자)를, 아래쪽에 숫자 7자리를 손으로 적습니다.
- 인쇄된 머리글자에 동그라미를 쳤으면 머리글자는 인쇄된 것 그대로이고 숫자만 손으로 적은 것입니다.
- 손글씨가 없는 칸(인쇄 그대로)은 결과에 넣지 않습니다. X 로 지운 빈 칸도 넣지 않습니다.

할 일
손글씨가 있는 칸마다, 인쇄된 칸 자리 여섯 자리와 손으로 적은 실제 컨번호를 읽으십시오.

다음 JSON 으로만 답하십시오. 설명 없이 JSON 만.
{"items":[{"slot":"130604","hand_prefix":"TRHU","hand_digits":"3477064","printed_cn":"WDFU1225273","sure":true}]}

규칙
- slot 은 칸 아래 인쇄된 "....xxxxxx" 여섯 자리 그대로. 손글씨가 그 숫자를 덮고 있어도 인쇄된 숫자를 읽습니다.
- hand_prefix 는 손으로 적은 영문 4자. 동그라미 친 인쇄 머리글자를 쓴 칸이면 그 인쇄 머리글자를 넣습니다. 안 보이면 빈 문자열.
- hand_digits 는 손으로 적은 숫자 7자리. 흐려서 확실하지 않은 자리는 ? 로 둡니다. 지어내지 않습니다.
- sure 는 머리글자·숫자 둘 다 분명하면 true, 하나라도 애매하면 false.`;

/** AI 에 보낼 몸체 — 사진은 JPEG base64(부르는 쪽이 줄여서 넘긴다). */
export function sheetRequestBody(base64Jpeg) {
  return {
    contents: [{ parts: [{ text: SHEET_PROMPT }, { inline_data: { mime_type: 'image/jpeg', data: base64Jpeg } }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: 'application/json' },
  };
}

/** AI 응답(JSON 문자열 또는 이미 풀린 응답 객체) → 칸 목록. 칸 자리가 여섯 자리 숫자가 아니면 버린다(지어낸 칸 방지). */
export function parseSheetResponse(resp) {
  let text = resp;
  if (resp && typeof resp === 'object') text = resp?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('기록지 판독 결과를 못 읽었어요 — 사진을 다시 찍어 주세요.');
  const j = JSON.parse(m[0]);
  const seen = new Map(); const out = [];   // 같은 칸이 두 번 나오면 버리지 않고 둘 다 «확인 필요» — 한 칸은 다른 칸을 잘못 읽은 것이다(실측 13-04-04 를 «15-04-04» 로 두 번째 읽음)
  for (const it of (Array.isArray(j.items) ? j.items : [])) {
    const slot = String(it.slot || '').replace(/\D/g, '');
    if (slot.length !== 6) continue;
    const o = { slot, bay: slot.slice(0, 2), row: slot.slice(2, 4), tier: slot.slice(4, 6),
      prefix: String(it.hand_prefix || '').toUpperCase().replace(/[^A-Z]/g, ''),
      digits: String(it.hand_digits || '').replace(/[^0-9?]/g, ''),
      printed: String(it.printed_cn || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), sure: it.sure !== false };
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
export function matchSheetItems(items, candidates) {
  const pool = Array.from(new Set(candidates || []));
  const taken = new Map();   // 같은 컨이 두 칸에 걸리면 둘 다 확인 필요로 내린다
  const rows = (items || []).map((it) => {
    const sc = pool.map((c) => {
      const dd = _diff(it.digits, c.slice(4));
      const pd = it.prefix.length === 4 ? _diff(it.prefix, c.slice(0, 4)) : 2;
      return { cn: c, score: dd * 3 + pd, dd };
    }).sort((a, b) => a.score - b.score);
    const b1 = sc[0] || null, b2 = sc[1] || null;
    const auto = !it.dupSlot && !!b1 && b1.dd <= 2 && (!b2 || (b2.score - b1.score) >= 2);
    const r = { ...it, cn: auto ? b1.cn : null, best: b1 && b1.cn, second: b2 && b2.cn, why: auto ? '' : it.dupSlot ? '같은 칸 번호가 두 번 읽혔어요 — 칸 번호를 확인해 주세요' : (b1 ? `숫자를 ${b1.dd}자리 다르게 읽었어요 — 확인해 주세요` : '후보가 없어요') };
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
export function matchSheetRuns(runs, candidates) {
  const ms = (runs || []).map((items) => matchSheetItems(items, candidates));
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
