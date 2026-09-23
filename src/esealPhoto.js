// 엠티실 기록지 사진 한 벌 — 검수원이 컨 목록 종이에 손으로 적은 실 끝 세 자리를 AI 로 읽고, 배정 구간으로 여섯 자리를 만들어 «컨 → 실» 을 고른다(저장은 부르는 화면이 한다)
/* ★ TallyOne 3.60 (검수사 2026-09-24 «ATPR 엠티실 자료도 카메라 또는 사진 자료로 첨부 할수 있게 해주고 수기 표기가 3자리만 있는데
     … 앞번호 세자리가 정해져 있습니다 036 이라고 자료를 받으면 6자리로 만들어서 리스트에 기록 되게 해주세요»)
   흐름 — ① readEsealPhoto: 사진 → AI(aiCall 한 벌) 두 번 따로 → 줄마다 {인쇄 컨번호, 손글씨 실 숫자}
          ② matchEsealRuns: 인쇄 컨번호는 이 배 부착 대상과 글자 그대로(또는 숫자 한 자리 차이·유일) 맞을 때만,
             손글씨 세 자리는 배정 구간(esealRanges) 안에서 끝 세 자리가 같은 실이 **하나뿐일 때만** 여섯 자리로 만든다.
             두 번 읽기가 같은 컨에 같은 실을 준 것만 자동, 아니면 «확인 필요».
   ⚠ 이 파일은 읽기만 한다. 저장은 EsealPhotoModal 이 기존 fbSetEmptySeal(컨 상세 입력과 같은 길)로 한다. */
import { aiCall } from './gemini.js';

export const ESEAL_PROMPT = `이 사진은 컨테이너 목록 인쇄물(No · 컨테이너번호 · Size · Seal 칸)에 검수원이 엠티실 번호를 손으로 적은 기록지입니다.

읽는 법
- 목록의 **모든 줄**을 No 1 부터 마지막 번호까지 **하나도 빼지 않고 차례대로** 적습니다(두 단이면 왼쪽 단 다음 오른쪽 단). 손글씨가 없는 줄도 seal 을 "" 로 두고 적습니다.
- 줄마다 먼저 그 줄의 인쇄된 No 와 인쇄된 컨테이너번호(영문4+숫자7)를 읽고, **같은 줄의 가로선 사이**에 있는 Seal 칸 손글씨만 seal 에 넣습니다.
- 손글씨가 줄 위·아래로 걸쳐 있으면 숫자 몸통이 더 많이 들어간 줄의 것입니다. 한 손글씨를 두 줄에 넣지 않습니다.
- 손글씨 숫자(보통 세 자리, 형광펜이 칠해져 있을 수 있음)는 적힌 그대로. 앞자리를 지어내 붙이지 않습니다.
- **인쇄 글자와 손글씨를 섞지 않습니다.**

다음 JSON 으로만 답하십시오. 설명 없이 JSON 만.
{"items":[{"no":1,"cn":"BMOU5407731","seal":"654","sure":true},{"no":2,"cn":"HLHU6401476","seal":"","sure":true}]}

규칙
- 흐려서 확실하지 않은 숫자 자리는 ? 로 둡니다. 지어내지 않습니다.
- sure 는 그 줄의 손글씨가 어느 줄 것인지와 숫자가 모두 분명하면 true, 하나라도 애매하면 false.`;

export function esealRequestBody(base64Jpeg) {
  return {
    contents: [{ parts: [{ text: ESEAL_PROMPT }, { inline_data: { mime_type: 'image/jpeg', data: base64Jpeg } }] }],
    //  생각 토큰이 출력 한도를 같이 쓴다 — 8192 로는 90줄 목록이 중간에 잘렸다(실측).
    generationConfig: { temperature: 0.1, maxOutputTokens: 40000, responseMimeType: 'application/json' },
  };
}

/** AI 응답 → 줄 목록 [{no, cn, seal, sure}]. 깨진 JSON 이면 줄 하나하나를 따로 푼다(기록지 판독 3.58-02 와 같은 방어). */
export function parseEsealResponse(resp) {
  let text = resp;
  if (resp && typeof resp === 'object') text = resp?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('엠티실 기록지 판독 결과를 못 읽었어요 — 사진을 다시 찍어 주세요.');
  let j;
  try { j = JSON.parse(m[0]); } catch (e) {
    const items = [];
    for (const one of String(m[0]).slice(1).match(/\{[^{}]*\}/g) || []) { try { const o = JSON.parse(one); if (o && o.cn) items.push(o); } catch (e2) { /* 깨진 줄 하나 — 건너뛴다 */ } }
    if (!items.length) throw new Error('엠티실 기록지 판독 결과가 깨져 왔어요 — 한 번 더 눌러 주세요.');
    j = { items };
  }
  const out = [];
  for (const it of (Array.isArray(j.items) ? j.items : [])) {
    const cn = String(it.cn || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const seal = String(it.seal || '').replace(/[^0-9?]/g, '');
    if (!cn || !seal) continue;
    out.push({ no: parseInt(it.no, 10) || null, cn, seal, sure: it.seal_sure !== false && it.sure !== false });
  }
  return out;
}

/** 손글씨 실 숫자 → 배정 구간 안의 여섯 자리 실. 자리 수가 구간과 같으면 그대로(구간 안일 때만), 짧으면 끝자리가 같은 실을 찾는다.
 *  돌려주는 것 { seal, choices, why } — 하나뿐일 때만 seal. */
export function expandSeal(hand, pool) {
  const h = String(hand || '');
  if (!h || /\?/.test(h)) return { seal: null, choices: [], why: '실 숫자가 흐려 다 못 읽었어요 — 확인해 주세요' };
  const choices = (pool || []).filter((s) => s.length >= h.length && s.endsWith(h));
  if (choices.length === 1) return { seal: choices[0], choices, why: '' };
  if (!choices.length) return { seal: null, choices, why: `배정 구간에 «…${h}» 로 끝나는 실이 없어요 — 숫자를 확인해 주세요` };
  return { seal: null, choices: choices.slice(0, 4), why: `«…${h}» 로 끝나는 실이 ${choices.length}개예요 — 골라 주세요` };
}

function _dd(a, b) {
  if (a.length !== b.length) return 99;
  let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}
/** 인쇄 컨번호 → 부착 대상 컨. 글자 그대로 있으면 그것, 아니면 한 글자 차이 후보가 하나뿐일 때만. */
export function matchTargetCn(cn, targets) {
  const T = targets || [];
  if (T.includes(cn)) return { cn, best: cn };
  const near = T.filter((t) => _dd(t, cn) === 1);
  if (near.length === 1) return { cn: near[0], best: near[0] };
  return { cn: null, best: near[0] || null };
}

/** 한 번 읽은 줄 목록 → 표 줄. used = {실: 이미 붙은 컨} (이 배 기록). */
export function matchEsealItems(items, targets, pool, used) {
  const rows = (items || []).map((it) => {
    const t = matchTargetCn(it.cn, targets);
    const x = expandSeal(it.seal, pool);
    const r = { no: it.no, read: it.cn, hand: it.seal, cn: t.cn, pick: t.cn || t.best || it.cn, seal: x.seal, sealPick: x.seal || '', choices: x.choices, why: '' };
    if (!t.cn) r.why = '인쇄 컨번호가 이 배 엠티실 대상에 없어요 — 확인해 주세요';
    else if (!x.seal) r.why = x.why;
    else if (used && used[x.seal] && used[x.seal] !== t.cn) r.why = `이 실은 이미 ${used[x.seal]} 에 붙어 있어요 — 확인해 주세요`;
    r.ok = !r.why;
    return r;
  });
  //  같은 컨이 두 줄 · 같은 실이 두 컨 — 둘 다 확인 필요
  const cnN = new Map(), slN = new Map();
  for (const r of rows) { if (r.cn) cnN.set(r.cn, (cnN.get(r.cn) || 0) + 1); if (r.seal) slN.set(r.seal, (slN.get(r.seal) || 0) + 1); }
  for (const r of rows) {
    if (r.ok && cnN.get(r.cn) > 1) { r.ok = false; r.why = '같은 컨이 두 줄에 읽혔어요 — 확인해 주세요'; }
    else if (r.ok && slN.get(r.seal) > 1) { r.ok = false; r.why = '같은 실이 두 컨에 읽혔어요 — 확인해 주세요'; }
  }
  return rows;
}

/** 두 번 읽은 결과 맞추기 — 두 번 모두 같은 컨에 같은 실이면 자동, 어긋나거나 한 번만 읽히면 «확인 필요». */
export function matchEsealRuns(runs, targets, pool, used) {
  const ms = (runs || []).map((items) => matchEsealItems(items, targets, pool, used));
  if (ms.length < 2) return ms[0] || [];
  const [a, b] = ms;
  const bByCn = new Map(); const bDup = new Set();
  for (const r of b) if (r.cn) { if (bByCn.has(r.cn)) bDup.add(r.cn); bByCn.set(r.cn, r); }
  const out = a.map((r) => {
    if (!r.ok) return r;
    if (bDup.has(r.cn)) return { ...r, ok: false, why: '다시 읽으니 이 컨이 두 줄에 읽혔어요 — 확인해 주세요' };
    const o = bByCn.get(r.cn);
    if (o && o.ok && o.seal === r.seal) return r;   // 감사 지적 — 두 번째 읽기에서도 걸린 데가 없어야 자동
    return { ...r, ok: false, why: o ? `다시 읽으니 실이 ${o.sealPick || '…' + o.hand} 로 읽혔어요 — 확인해 주세요` : '한 번만 읽힌 줄이에요 — 확인해 주세요',
      choices: Array.from(new Set([r.seal, o && o.seal].filter(Boolean))) };
  });
  const aCn = new Set(a.map((r) => r.pick));
  for (const r of b) if (!aCn.has(r.pick)) out.push({ ...r, ok: false, why: r.why || '한 번만 읽힌 줄이에요 — 확인해 주세요' });
  return out;
}

//  ★ 판독 모델 — 기본 Flash 는 ATPR 2643W 실사진에서 손글씨를 한 줄씩 밀어 읽었고 두 번 읽기가 **똑같이** 밀려 틀린 짝 9줄이 자동 체크됐다
//    (종이가 기울어 Seal 칸 손글씨가 옆 줄 높이에 걸린다). Pro 는 같은 사진 두 차례 모두 자동 55줄 전부 맞음·틀림 0(2026-09-24 실측).
export const ESEAL_MODEL = 'gemini-3.1-pro-preview';
/** 사진 파일 → 두 번 읽은 줄 목록. */
export async function readEsealPhoto(file) {
  const base64 = await _toJpegBase64(file, 2000);
  const one = async () => {
    const res = await aiCall('esealPhoto', esealRequestBody(base64), { timeoutMs: 120000, model: ESEAL_MODEL });
    if (!res.ok) { const t = await res.text(); throw new Error(`AI 오류 ${res.status}: ${t.slice(0, 160)}`); }
    return parseEsealResponse(await res.json());
  };
  const rs = await Promise.allSettled([one(), one()]);
  const ok = rs.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!ok.length) throw rs[0].reason;
  return ok;
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
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('사진을 열지 못했어요 — HEIC 사진이면 캡처해서 올려 주세요.')); };
    img.src = url;
  });
}
