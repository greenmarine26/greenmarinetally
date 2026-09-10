// TallyOne 1.8: 리퍼 메모 — 항차에 들어가면 리퍼가 있을 때 먼저 뜨는 온도 확인 화면
//
// 왜 (검수사 확정 2026-08-04)
//   "작업전 먼저 선박을 선택합니다. 그러면 앱은 리퍼 유무를 판단하고 있으면 리퍼메모 화면을 띄워 줍니다.
//    메모화면엔 컨테이너 넘버 EDI온도 실제 셋팅온도 실제온도 3항목을 기본으로 보여 줍니다.
//    EDI 온도는 수정불가 나머지 2개는 수정가능. 셋팅온도가 맞으면 그대로 틀리면 수정, 실제온도도 마찬가지"
//   "리퍼가 많으면 일일이 확인 불가함 → 선원이 체크한 리스트를 받아서 앱이 읽어서 기록"
//
// 그래서 채우는 길이 셋이다. 어느 쪽이든 최종 확정은 사람이 한다.
//   ① 사진   — 선원이 적어 준 리스트를 찍으면 Gemini가 읽어 두 칸을 채운다(초안).
//   ② 일괄   — 「세팅온도 채우기」(3.25): 리스트 온도를 **기준 칸에만** 넣는다. 실측 칸은 안 건드린다.
//   ③ 개별   — 틀린 줄만 직접 고친다.
//
// 저장은 records/{cn}.rfSet · rfAct (firebase.js fbSetReeferTemp*).
//   텔리 RF condition report 의 Setting(F열) · Actual(G열) 이 이 값을 읽는다.
import React, { useState, useMemo, useRef } from 'react';
import { X, Camera, Check, Snowflake, Loader2 } from 'lucide-react';
import { fbSetReeferTempBulk } from '../firebase.js';

// 점검 대상 = **풀 리퍼만** (검수사 확정 2026-08-04).
//   공 리퍼는 전원을 안 꽂아 잴 것이 없다. 텔리 RF 시트(`fe !== 'E'` — 실물 관례 "양하 F 리퍼만
//   기재")와 출항 임박 경고(`fe === 'F'`)가 이미 이 기준이라, 여기까지 맞춰 세 곳을 일치시킨다.
//   ⚠ 1.8 첫 판은 F/E 를 안 갈라 공 리퍼까지 점검 목록에 올렸다 — 메모엔 뜨는데 텔리엔 안 실리는
//     컨이 생긴다(STMJ 2643E 는 24대가 전부 풀이라 드러나지 않았다).
//   리퍼드라이(rfdry, 넌플러그)·제작컨(mkcon)도 제외 — 지침서 5-5 "온도 경고 제외" 규칙과 같다.
const isReefer = (c) => {
  const rf = !!c.rf || String(c.iso || '').toUpperCase()[2] === 'R' || /^45[38]/.test(String(c.iso || ''));
  if (!rf) return false;
  if (c.rfdry || c.mkcon) return false;
  return c.fe === 'F' || !c.fe;     // fe 미상은 남긴다 — 조용히 빠뜨리지 않는다
};

/** 화면에 보일 온도 문자열 — 값이 없으면 빈 문자열(0으로 착각하게 두지 않는다) */
const tempStr = (v) => (v == null || String(v).trim() === '' ? '' : String(v).trim());

/** 3.32: 온도를 **숫자로** 읽는다 — 견줄 때만 쓴다(표시는 원문 그대로).
 *  ⚠ 자료에 단위가 붙어 온다. `utils.parseAscFile` 은 `(raw/10).toFixed(1) + '℃'` 로 쓰고
 *    리스트 파서는 단위를 뗀다 — 보관소 실측 8,110대 중 280대가 «-18.0℃» 꼴이고,
 *    17개 항차·모드는 대조 가능한 것이 **전량** 그 꼴이다(감사 실측 2026-09-08).
 *    `Number('-18.0℃')` 는 NaN 이라 그대로 견주면 **잘 읽은 판독에도 전량 경보**가 뜬다.
 *  숫자로 못 읽으면 null — 그때는 아예 판정하지 않는다(모르는 것을 틀렸다고 하지 않는다). */
export function tempNum(v) {
  const t = String(v ?? '').replace(/[℃°CcＣ도\s]/g, '').replace(/[−–—]/g, '-').trim();
  const m = t.match(/^-?\d+(?:\.\d+)?$/);
  return m ? Number(m[0]) : null;
}

/** 3.32: **판독 검산** — 읽어 온 «설정온도»가 이 항차 자료(EDI 온도)와 같은가.
 *
 *  왜 — 배마다 표가 달라 판독기가 엉뚱한 칸을 읽을 수 있다. SWBT 2614N 종이에는 설정온도 옆에
 *  `PLUG IN TEMP` 칸이 있고 REMARK 칸에는 손으로 적은 자리 번호(180184)가 있다. 그 칸을 읽어도
 *  숫자라서 그대로 통과한다. 그런데 **설정온도는 맞춰 볼 잣대가 있다** — EDI 온도다
 *  (실측 SWBT 2614N 6대 전부 종이 인쇄값과 같았다). 어긋나면 다른 칸을 읽은 것이다.
 *
 *  @param list  이 항차 리퍼 목록(EDI 온도 `tmp` 를 들고 있다)
 *  @param byCn  판독 결과 Map(cn → {set, act})
 *  @returns {{bad: Object, cmp: number}} bad = 어긋난 컨(설명 문구) · cmp = 맞춰 본 대수
 */
export function ocrSetMismatch(list, byCn) {
  const bad = {}; let cmp = 0;
  for (const c of (list || [])) {
    const g = byCn && (byCn.get ? byCn.get(c.cn) : byCn[c.cn]);
    const edi = tempStr(c.tmp);
    if (!g || !g.set || !edi) continue;       // 견줄 것이 없으면 판정하지 않는다
    const a = tempNum(g.set); const b = tempNum(edi);
    if (a === null || b === null) continue;   // 숫자로 못 읽는 값은 판정하지 않는다
    cmp += 1;
    if (a !== b) bad[c.cn] = `${g.set} ≠ 자료 ${edi}`;
  }
  return { bad, cmp };
}

export default function ReeferMemoModal({ containers, voyageKey, mode, inspector, onClose }) {
  const list = useMemo(
    () => (containers || []).filter(isReefer).sort((a, b) => String(a.cn).localeCompare(String(b.cn))),
    [containers]);

  /*  편집 중인 값.
      ⚠ 3.25: **실측 칸(act)은 미리 채우지 않는다.** 3.24 까지는 EDI 온도를 act 에도 넣어 둬서
      아무것도 손대지 않고 「확인 완료」만 눌러도 전 리퍼에 «잰 값»이 박혔다 —
      2026-09-07 DXQD 19대가 실제로 그렇게 굳었다(잰 사람이 없는데 차이 0).
      검수사 원문 — «실제온도만 기록하면 확인이 안됩니다» · 기준과 실측은 **짝**이라야 뜻이 있다.
      기준(set)은 리스트·EDI 로 미리 채워 둔다 — 그것이 잣대이기 때문이다. */
  const [vals, setVals] = useState(() => {
    const o = {};
    for (const c of list) {
      o[c.cn] = { set: tempStr(c.rfSet) || tempStr(c.tmp), act: tempStr(c.rfAct), src: c.rfSrc || '' };
    }
    return o;
  });
  //  3.25: 기준(세팅)이 한 대도 없으면 «세팅온도 채우기»는 빈 값을 확정하는 단추가 된다 — 잠근다.
  const baseCount = list.filter((c) => tempStr(c.rfSet) || tempStr(c.tmp)).length;
  const noBase = baseCount === 0;
  const [busy, setBusy] = useState('');
  //  3.32: 판독 검산에 걸린 컨 — «읽어 온 세팅온도가 이 항차 자료와 다르다». 줄에 그대로 보여 준다.
  const [badSet, setBadSet] = useState({});
  // ★ 1.84 (검수사 확정 2026-08-19 시안): **방식 선택이 먼저다.**
  //   *"1개든 100개든 이걸 한줄로 보여주고 클릭하면 리스트 입력인지 개별 사진 촬영인지 수기 입력인지
  //    선택해서 할수있게. 처음부터 양이 많으면 스크롤하기 짜증납니다."*
  //   열자마자 38줄이 아니라 [촬영 / 세팅온도 채우기 / 수기] 세 버튼만. 목록은 고른 뒤에.
  const [step, setStep] = useState('pick');   // 'pick' | 'edit'
  const [note, setNote] = useState('');
  const camRef = useRef(null);
  const albumRef = useRef(null);

  /*  3.25: **한 칸 고쳤다고 옆 칸까지 «손입력»이 되면 안 된다.**
      종전엔 어느 칸을 고치든 src 를 통째로 'manual' 로 바꿔서, 「세팅온도 채우기」로 베낀
      실측값(rfSrc:'list')이 세팅 칸만 손대도 «잰 값»으로 세탁됐다(감사 지적 2026-09-07).
      ⇒ **실측 칸(act)을 실제로 손댔을 때만** 손입력으로 올린다. */
  const setField = (cn, k, v) => {
    //  3.32: 그 줄의 세팅온도를 고치면 그 줄의 판독 경고를 지운다 — 고쳤는데 붉은 글씨가 남으면 안 된다.
    if (k === 'set') setBadSet((b) => (b[cn] ? (({ [cn]: _drop, ...rest }) => rest)(b) : b));
    setVals((o) => ({
      ...o, [cn]: { ...o[cn], [k]: v, src: k === 'act' ? 'manual' : (o[cn]?.src || '') },
    }));
  };

  /** ② 세팅온도 채우기 — 리스트·EDI 온도를 **기준 칸에만** 넣는다(3.25).
      ⛔ 실측(act)에는 손대지 않는다. 베낀 값은 잰 값이 아니다 — 그것이 2026-09-07 사고였다. */
  const applyAll = () => {
    if (noBase) { setNote('리스트에 세팅온도가 없습니다 — 채울 기준이 없어 그대로 둡니다.'); return; }
    setVals((o) => {
      const n = { ...o };
      for (const c of list) {
        const edi = tempStr(c.tmp);
        if (!edi) continue;                                  // 없는 것을 «채웠다»고 하지 않는다
        n[c.cn] = { ...o[c.cn], set: edi, src: 'list' };      // act 는 건드리지 않는다
      }
      return n;
    });
    setNote('세팅온도를 채웠습니다 — 실제 온도는 재고 나서 사진이나 손으로 넣으십시오.');
    setStep('edit');
  };

  /** ① 사진 판독 (검수사 정정 2026-09-07 — «선원리스트가 아니고 검수 수기 리스트입니다»)
   *
   *  ★ 3.32 — **여러 장을 한 번에 받고, 읽은 값을 이 항차 자료와 맞춰 본다.**
   *    왜 (검수사 2026-09-08 «온도가 기록이 안됨 실제온도 SWBT 2614N») —
   *    ① 종이가 한 장이 아니다. SWBT 2614N 은 55줄 3장, 어제 RZOR R097E 도 3장이었다.
   *       종전엔 `files[0]` 하나만 받아 장마다 따로 찍어야 했다.
   *    ② 배마다 표가 달라 판독기가 엉뚱한 칸을 읽을 수 있다(그 배 종이엔 `PLUG IN TEMP` 칸과
   *       손으로 적은 자리 번호 칸이 더 있다). 그래서 **읽어 온 세팅온도를 EDI 온도와 대조**한다 —
   *       실측 SWBT 2614N 은 종이 인쇄값과 EDI 가 뽑아 본 6대 전부 같았다. 어긋나면 다른 칸을 읽은 것이다.
   *    ⛔ 조용히 통과시키지 않는다 — 틀린 기준 위에 «검증됨»이 찍히면 서류가 통째로 거짓이 된다.
   */
  const onPhoto = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setBusy('photo'); setBadSet({});   // 다시 찍으면 옛 표시를 지운다(감사 지적)
    setNote(files.length > 1 ? `사진 ${files.length}장 읽는 중…` : '');
    const { ocrReeferTemps } = await import('../mixerUpload.js');
    const { resolveAiKey } = await import('../gemini.js');
    const key = await resolveAiKey();   // 3.43: 공용 키(검수사 부담) → 개인 키
    const all = new Map(); const errs = [];
    for (let i = 0; i < files.length; i += 1) {
      if (files.length > 1) setNote(`사진 ${i + 1}/${files.length} 읽는 중…`);
      try {
        const { items } = await ocrReeferTemps(files[i], key);
        //  장마다 **칸 단위로** 누적한다 — 같은 컨이 두 장에 나와도 **빈 칸이 채워진 칸을 지우지 않는다**.
        //  ⚠ 종전엔 항목을 통째로 갈아 끼워, 뒤 장에 그 컨이 빈 실측으로 나오면 앞 장에서 읽은 실측이
        //    사라졌다(감사 실측 — 사진 순서가 값을 정했다).
        for (const it of items) {
          const prev = all.get(it.cn);
          all.set(it.cn, prev
            ? { cn: it.cn, set: it.set || prev.set || '', act: it.act || prev.act || '' }
            : it);
        }
      } catch (err) { errs.push(`${files.length > 1 ? `${i + 1}장 ` : ''}${err?.message || err}`); }
    }
    if (!all.size) {
      setNote(errs.length ? `판독 실패: ${[...new Set(errs.map((e) => e.replace(/^\d+장 /, '')))].join(' · ')}` : '사진에서 컨테이너를 못 찾았습니다.');
      setBusy(''); setStep('edit'); return;
    }
    const { bad, cmp } = ocrSetMismatch(list, all);
    setBadSet(bad);
    //  ⚠ 세는 것은 업데이터 **밖**에서 한다 — 안에서 세면 업데이터가 렌더 때 불려서
    //    안내 문구가 늘 «0대 채움»으로 나갔다(감사 실측 · 3.25 부터 있던 결함).
    const hit = list.filter((c) => all.has(c.cn)).length;
    const miss = list.filter((c) => !all.has(c.cn)).map((c) => c.cn);
    setVals((o) => {
      const nx = { ...o };
      for (const c of list) {
        const g = all.get(c.cn);
        if (!g) continue;
        //  ⚠ `vals` 는 열 때 한 번 만들고 `list` 는 살아 있는 목록을 따라간다 — 모달을 연 뒤
        //    리스트가 늦게 와 리퍼로 승격된 컨은 `vals` 에 없다(VoyagePage FLAG_FILL). 감싸지 않으면
        //    그 컨을 빈 칸으로 읽어 올 때 모달이 통째로 죽는다(감사 실렌더 실측).
        const cur = nx[c.cn] || { set: '', act: '', src: '' };
        nx[c.cn] = { set: g.set || cur.set, act: g.act || cur.act, src: 'photo' };
      }
      return nx;
    });
    const extra = [...all.keys()].filter((cn) => !list.some((c) => c.cn === cn)).length;
    const nBad = Object.keys(bad).length;
    setNote([
      `사진 ${files.length}장에서 ${all.size}대 읽어 이 항차 리퍼 ${hit}대 채웠습니다`,
      miss.length ? `못 찾은 ${miss.length}대는 직접 확인하세요` : '',
      extra ? `이 항차에 없는 ${extra}대는 무시` : '',
      nBad ? (cmp && nBad > cmp / 2
        ? `⛔ ${nBad}대의 세팅온도가 자료와 다릅니다 — 판독기가 다른 칸(꽂을 때 온도·자리 번호)을 읽은 것 같습니다. 넣기 전에 꼭 확인하십시오`
        : `⚠ ${nBad}대는 세팅온도가 자료와 다릅니다 — 줄에 표시했습니다`) : '',
      errs.length ? `못 읽은 사진: ${[...new Set(errs)].join(' · ')}` : '',
    ].filter(Boolean).join(' · '));
    setBusy('');
    setStep('edit');   // 1.84: 판독 결과 확인 화면으로(실패해도 note 를 보며 수기로 잇는다)
  };

  const save = async () => {
    //  3.32: 판독 검산에 걸린 줄이 남아 있으면 **한 번 더 묻는다** — 종전엔 경고가 문구뿐이라
    //    어긋난 값 위에 그대로 `rfCheckedAt` 이 찍혔다(감사 지적 §4-3).
    //  ⚠ 대화상자가 없거나 막힌 환경(웹뷰·«추가 대화상자 표시 안 함»)에서는 조용히 안 죽는다 —
    //    물을 수 없으면 그대로 저장하되 무엇을 저장했는지 밝힌다(규범 §4-3).
    const nBad = Object.keys(badSet).length;
    if (nBad) {
      const ask = (typeof window !== 'undefined' && typeof window.confirm === 'function')
        ? window.confirm(`세팅온도가 자료와 다른 ${nBad}대가 그대로 있습니다.\n판독기가 다른 칸을 읽었을 수 있습니다 — 이대로 저장할까요?`)
        : null;
      if (ask === false) { setNote(`저장하지 않았습니다 — 세팅온도가 자료와 다른 ${nBad}대를 먼저 고치십시오.`); return; }
      if (ask === null) setNote(`⚠ 세팅온도가 자료와 다른 ${nBad}대를 그대로 저장합니다(확인 창을 띄울 수 없었습니다).`);
    }
    setBusy('save');
    try {
      const rows = list.map((c) => ({ cn: c.cn, set: vals[c.cn]?.set ?? '', act: vals[c.cn]?.act ?? '', src: vals[c.cn]?.src || 'manual' }));
      await fbSetReeferTempBulk(voyageKey, mode, rows, inspector);
      onClose?.(true);
    } catch (e) {
      setNote(`저장 실패: ${e?.message || e}`);
      setBusy('');
    }
  };

  if (!list.length) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-ink-900 border border-cyan-800/60 rounded-t-2xl sm:rounded-card w-full sm:max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div className="flex items-center gap-2">
            <Snowflake className="w-4 h-4 text-cyan-400"/>
            <span className="font-bold text-cyan-200 text-[14px]">리퍼 온도 확인</span>
            <span className="text-xxs text-dim-400">{list.length}대</span>
          </div>
          <button onClick={() => onClose?.(false)} className="text-dim-400 p-2" style={{ minHeight: 40 }}><X className="w-5 h-5"/></button>
        </div>

        {step === 'pick' && (
          <div className="p-4 space-y-2">
            <button onClick={() => camRef.current?.click()} disabled={!!busy}
              className="w-full text-left px-4 py-3 rounded-pill bg-cyan-900/50 hover:bg-cyan-800/60 border border-cyan-700/40 disabled:opacity-50" style={{ minHeight: 56 }}>
              <span className="text-[14px] font-bold text-cyan-100 flex items-center gap-2">
                {busy === 'photo' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Camera className="w-4 h-4"/>}
                {busy === 'photo' ? '읽는 중…' : '검수 수기 리스트 촬영'}
              </span>
              <span className="block text-xxs text-cyan-300/70 mt-0.5">종이 리스트를 찍으면 온도를 읽어 채웁니다 · <b>여러 장 한 번에</b> 됩니다 · <button onClick={(e) => { e.stopPropagation(); albumRef.current?.click(); }} className="underline">앨범에서</button>도 가능</span>
            </button>
            <button onClick={() => applyAll()} disabled={!!busy || noBase}
              className="w-full text-left px-4 py-3 rounded-pill bg-ink-800/70 hover:bg-ink-750/70 border border-line-strong/40 disabled:opacity-50" style={{ minHeight: 56 }}>
              <span className="text-[14px] font-bold text-dim-100">세팅온도 채우기</span>
              <span className="block text-xxs text-dim-300 mt-0.5">
                {noBase
                  ? '리스트에 세팅온도가 없습니다 — 채울 기준이 없습니다'
                  : `리스트 세팅온도로 ${baseCount}대의 기준을 채웁니다 · 실제 온도는 재고 나서 넣습니다`}
              </span>
            </button>
            <button onClick={() => setStep('edit')} disabled={!!busy}
              className="w-full text-left px-4 py-3 rounded-pill bg-ink-800/70 hover:bg-ink-750/70 border border-line-strong/40 disabled:opacity-50" style={{ minHeight: 56 }}>
              <span className="text-[14px] font-bold text-dim-100">수기 입력</span>
              <span className="block text-xxs text-dim-300 mt-0.5">목록을 열어 EDI와 다른 컨만 직접 고칩니다</span>
            </button>
            <div className="text-right">
              <button onClick={() => onClose?.(false)} className="text-xs2 text-dim-400 px-2 py-1">나중에</button>
            </div>
            <input ref={camRef} type="file" accept="image/*" capture="environment" multiple onChange={onPhoto} className="hidden"/>
            <input ref={albumRef} type="file" accept="image/*" multiple onChange={onPhoto} className="hidden"/>
            {note && <div className="text-xxs text-amber-300">{note}</div>}
          </div>
        )}

        {step === 'edit' && <>
        {/* 상단 — 많을 때 일일이 못 하니 사진·일괄 두 길을 먼저 준다 */}
        <div className="px-4 py-2 border-b border-line flex items-center gap-2 flex-wrap">
          <button onClick={() => camRef.current?.click()} disabled={!!busy}
            className="px-3 py-2 rounded-pill text-xs2 font-bold bg-violet-800 hover:bg-violet-700 text-violet-100 flex items-center gap-1 disabled:opacity-50"
            style={{ minHeight: 40 }}>
            {busy === 'photo' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Camera className="w-4 h-4"/>}
            {busy === 'photo' ? '읽는 중…' : '검수 수기 리스트 촬영'}
          </button>
          <button onClick={() => albumRef.current?.click()} disabled={!!busy}
            className="px-3 py-2 rounded-pill text-xs2 bg-ink-800 hover:bg-ink-750 text-dim-200 disabled:opacity-50"
            style={{ minHeight: 40 }}>앨범에서</button>
          <label className="flex items-center gap-2 px-3 py-2 rounded-pill bg-ink-800/60 text-xs2 text-dim-200 cursor-pointer" style={{ minHeight: 40 }}>
            <input type="checkbox" disabled={noBase} onChange={(e) => e.target.checked && applyAll()} className="w-4 h-4 accent-cyan-500"/>
            세팅온도 채우기 (실측 칸은 그대로 둡니다)
          </label>
          <input ref={camRef} type="file" accept="image/*" capture="environment" multiple onChange={onPhoto} className="hidden"/>
          <input ref={albumRef} type="file" accept="image/*" multiple onChange={onPhoto} className="hidden"/>
        </div>
        {note && <div className="px-4 py-1.5 text-xxs text-amber-300 border-b border-line">{note}</div>}

        <div className="px-4 py-1 grid grid-cols-[1fr_58px_72px_72px] gap-1 text-2xs text-dim-400 border-b border-line">
          <span>컨테이너 번호</span><span className="text-center">EDI</span><span className="text-center">셋팅</span><span className="text-center">실제</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {list.map((c) => {
            const edi = tempStr(c.tmp);
            const v = vals[c.cn] || { set: '', act: '' };
            //  3.25: «수정됨»은 «리스트와 다르다»는 뜻이다. 실측 칸은 원래 비어 있으므로
            //    그것까지 비교하면 열자마자 전 줄에 배지가 붙는다(감사 지적).
            const changed = (v.set !== edi) || (v.act !== '' && v.act !== edi);
            return (
              <div key={c.cn} className="grid grid-cols-[1fr_58px_72px_72px] gap-1 items-center py-1 border-b border-line-soft">
                <div className="min-w-0">
                  <div className="text-xs2 mono text-dim-100 truncate">{c.cn}</div>
                  <div className="text-2xs text-dim-500">
                    {[c.bay, c.row, c.tier].filter(Boolean).join('/')}
                    {v.src === 'photo' && <span className="text-violet-400 ml-1">📷</span>}
                    {changed && <span className="text-amber-400 ml-1">수정</span>}
                    {badSet[c.cn] && <span className="text-rose-400 ml-1">⚠ {badSet[c.cn]}</span>}
                  </div>
                </div>
                <div className="text-xs2 mono text-center text-dim-400">{edi || '—'}</div>
                <input value={v.set} onChange={(e) => setField(c.cn, 'set', e.target.value)}
                  inputMode="text" placeholder="—"
                  className="bg-ink-800 border border-line focus:border-cyan-600 rounded px-1 py-1.5 text-xs2 mono text-center text-cyan-200 focus:outline-none w-full"/>
                <input value={v.act} onChange={(e) => setField(c.cn, 'act', e.target.value)}
                  inputMode="text" placeholder="—"
                  className="bg-ink-800 border border-line focus:border-emerald-600 rounded px-1 py-1.5 text-xs2 mono text-center text-emerald-200 focus:outline-none w-full"/>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-line flex items-center gap-2">
          <button onClick={() => onClose?.(false)} className="px-3 py-2 rounded-pill text-xs2 bg-ink-800 text-dim-300" style={{ minHeight: 44 }}>나중에</button>
          <button onClick={save} disabled={!!busy}
            className="flex-1 px-3 py-2 rounded-pill text-sm2 font-bold bg-cyan-700 hover:bg-cyan-600 text-white flex items-center justify-center gap-1 disabled:opacity-50"
            style={{ minHeight: 44 }}>
            {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
            확인 완료 ({list.length}대)
          </button>
        </div>
        </>}
      </div>
    </div>
  );
}
