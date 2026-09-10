// 미르 창구 15건 — 앱이 이미 갖고 있는 값을 말로 답한다(개체 조회 + 항차 사실). 판정은 utils·tallyReport 한 벌을 그대로 부른다.
/* ★ TallyOne 3.41 (검수사 2026-09-10 «전 미르가 앱이 갖고 있는 자료를 막힘없이 답할 수 있느냐가 중요합니다» ·
     «그간의 사용데이터로 생각하면 안됩니다 … 어떤질문이 들어 올지는 저도 모릅니다. 제가 원하는건 그질문들에 적당한 답을 해주길 원합니다»)

   왜 이 파일이 있나 — 값은 전부 있었다. `reeferTempOf`(온도)·`sl`(실번호)·`wt`(중량)·`computeTallyData`(마감텔리)·
   `berthSideOf`(현측)·`overDims`(치수)·`__STG__`(임시창고)·`xraySeals`(커트씰)·`npod/tspot/fpod`·`bl/sh`·`held/luggConfirm`.
   말로 묻는 **창구**만 없었다(관문 2 실측 — 15건). 그리고 «3426 온도»는 온도 낱말이 끝네자리를 지워 버려서 답이 안 나왔다
   (nlSearch skipDigits — 3.41 에서 홀로 선 네 자리는 살린다).

   ⚠ 여기서 판정을 새로 만들지 않는다 — 규범 §4-4. 온도 상태(A·B·C)는 `reeferTempOf`, 자리는 `effectivePos`,
     현측은 `berthSideOf`, 마감 수치는 `computeTallyData` 가 정본이다. 이 파일은 그 값을 **문장으로 옮길 뿐**이다.
   ⚠ 순수 함수다 — ctx 만 본다(window·RTDB 안 봄). 검수앱 세 화면·떠 있는 미르·콘앱이 같은 ctx 모양으로 부른다.
     ctx = { containers(양하+선적 병합, _mode·_comp·_xray), voyage(info·discharge·loading·reports·photos), info, mode,
             computeTallyData(마감텔리 완제품 함수 — 검수앱이 싣는다) }
   ⚠ `tallyReport.js` 를 여기서 import 하지 않는다 — twin.js → shipStructure.js → 베이사전 1.2MB 가 콘앱 미르 번들에 딸려 온다(실측).
     검수앱은 ctx.computeTallyData 로 실어 주고, 콘앱은 «검수앱에서 물어 달라»고 말한다. */
import { isoToLabel, effectivePos, reeferTempOf, berthSideOf, overDims } from './utils.js';
import { answerHatchStatus } from './chiefAnswers.js';

const S = (v) => (v == null ? '' : String(v).trim());
const feKo = (c) => (S(c.fe).toUpperCase() === 'E' ? '엠티' : '풀');
const modeKo = (c) => (c._mode === 'loading' ? '선적' : c._mode === 'transit' ? '통과' : '양하');
function hhmm(ms) {
  if (!ms) return '';
  try { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; } catch (e) { return ''; }
}
function specOf(c) {
  const lab = isoToLabel(c.iso || c.tp) || S(c.iso) || S(c.tp);
  return lab || '규격 미상';
}
function posOf(c) {
  const p = effectivePos(c);
  if (p.inStorage) return '임시창고';
  if (!p.bay) return '자리 미정';
  const tag = p.src === 'actual' ? '(실체)' : p.src === 'assign' ? '(지정)' : '';
  return `${p.bay}-${p.row}-${p.tier}${tag}`;
}
/** 한 대의 머리줄 — 컨번호 · 규격 풀/엠티 · 양하/선적 · 자리. 창구마다 같은 첫 줄(§4-4). */
export function entityHead(c) {
  return `${S(c.cn)} · ${specOf(c)} ${feKo(c)} · ${modeKo(c)} · ${posOf(c)}`;
}
function secOf(ctx, mode) { return (ctx && ctx.voyage && ctx.voyage[mode]) || {}; }
function xrayOf(ctx, c) {
  const d = secOf(ctx, 'discharge');
  const inList = !!((d.xrayList || {})[c.cn]) || !!c._xray || !!c.isXray;
  const seal = (d.xraySeals || {})[c.cn] || c._xraySeal || c.xraySeal || null;
  return { inList, seal };
}
function findByDigits(ctx, digits) {
  const d = S(digits);
  if (!d) return [];
  const cs = (ctx && ctx.containers) || [];
  //  끝 4자리 — 여러 대면 전부(검수사 확정 «끝4자리가 두 대면 두 대 다»). 컨번호 전체를 쳤으면 그것만.
  const full = cs.filter((c) => S(c.cn).toUpperCase() === d.toUpperCase());
  if (full.length) return full;
  return cs.filter((c) => S(c.cn).slice(-4) === d.slice(-4));
}

/* ── 개체 창구 — «3426 온도» «0230 실번호» «0230 중량» «7758 다음 항» «0230 비엘» «0230 치수» «0686 엑스레이» «0230 완료했어» ── */
function attrLine(c, attr, ctx) {
  switch (attr) {
    case 'temp': {
      const r = reeferTempOf(c);
      if (!r.target) {
        const looksRf = !!c.rf || /R/.test(S(c.iso).slice(2, 3)) || /RF|RE|RH/i.test(S(c.iso) + S(c.tp));
        if (!looksRf) return '리퍼가 아니에요 — 온도 없음.';
        if (c.rfdry) return '리퍼드라이(넌플러그)라 온도 대상이 아니에요.';
        if (c.mkcon) return '특수제작컨이라 온도 대상이 아니에요.';
        return '엠티 리퍼라 온도 대상이 아니에요(리퍼는 풀일 때만 리퍼).';
      }
      if (r.state === 'A') return '세팅 온도 기록 없음(EDI·리스트 모두 빈칸) — 사진으로 확인해 주세요.';
      if (r.state === 'B') return `세팅 ${r.set}℃ · 실측 없음 — 사진 필요.`;
      const src = c.rfSrc === 'photo' ? '(사진)' : c.rfSrc === 'manual' ? '(손입력)' : '';
      const who = c.rfCheckedBy ? ` ${c.rfCheckedBy}` : '';
      const when = c.rfCheckedAt ? ` ${hhmm(c.rfCheckedAt)}` : '';
      return `세팅 ${r.set}℃ · 실측 ${r.act}℃${src}${who}${when} · 차이 ${r.diff == null ? '계산 불가' : (r.diff > 0 ? '+' : '') + r.diff + '℃'}`;
    }
    case 'seal': {
      const parts = [];
      if (S(c.sl)) {
        const src = S(c.sl_src) || S(c.sl_conflict && c.sl_conflict.src) || S(c._source);
        parts.push(`실번호 ${c.sl}${src ? '(' + src + ')' : ''}${S(c.sl_orig) && S(c.sl_orig) !== S(c.sl) ? ' · 리스트 원래값 ' + c.sl_orig : ''}`);
      }
      if (Array.isArray(c.sl_conflict) && c.sl_conflict.length > 1) {
        const vals = [...new Set(c.sl_conflict.map((h) => S(h.sl)).filter(Boolean))];
        if (vals.length > 1) parts.push(`⚠ 리스트끼리 다름 ${vals.join(' ↔ ')}`);
      }
      if (S(c.eseal)) parts.push(`엠티실 ${c.eseal}${c.eseal_wrong ? '(오류 표시)' : ''}`);
      const x = xrayOf(ctx, c);
      if (x.seal && S(x.seal.seal)) parts.push(`커트씰 ${x.seal.seal}${S(x.seal.sealer) ? ' 봉인자 ' + x.seal.sealer : ''}`);
      else if (x.inList) parts.push('X-RAY 대상 · 커트씰 아직 없음');
      return parts.length ? parts.join(' · ') : '실번호 없음 — EDI·리스트·기록 어디에도 없어요.';
    }
    case 'weight': {
      const w = Number(c.wt);
      if (!w) return '중량 기록 없음(EDI·리스트 모두 빈칸).';
      return `${w.toLocaleString()}kg${S(c.wtt) ? ' (' + c.wtt + ')' : ''}${c.cgWt ? ' · 화물 ' + Number(c.cgWt).toLocaleString() + 'kg' : ''}`;
    }
    case 'route': {
      const a = [];
      if (S(c.pol)) a.push(`POL ${c.pol}`);
      if (S(c.pod)) a.push(`POD ${c.pod}`);
      if (S(c.npod)) a.push(`다음 양하항 ${c.npod}`);
      if (S(c.tspot)) a.push(`환적항 ${c.tspot}`);
      if (S(c.fpod) || S(c.podFinal)) a.push(`최종 목적지 ${S(c.fpod) || S(c.podFinal)}`);
      if (S(c.printpod)) a.push(`리스트 POD ${c.printpod}`);
      return a.length ? a.join(' · ') : '항구 정보 없음.';
    }
    case 'bl': {
      const a = [];
      if (S(c.bl) && S(c.bl) !== '1') a.push(`B/L ${c.bl}`);
      if (S(c.sh)) a.push(`송하인 ${c.sh}`);
      if (S(c.desc)) a.push(`품명 ${c.desc}`);
      return a.length ? a.join(' · ') : 'B/L·송하인 기록 없음 — EDI 는 안 주고 리스트에도 없어요.';
    }
    case 'dims': {
      const d = overDims(c) || {};
      if (d.over) return `규격초과 ${d.short || d.parts || ''}${d.deck ? ' · 데크 적재' : ''}`.trim();
      if (c.oog || c.fr || c.ot) return `규격초과 표시(${[c.oog && 'OOG', c.fr && 'FR', c.ot && 'OT'].filter(Boolean).join('·')})는 있는데 치수 기록이 없어요${S(c.oogDim) ? ' · EDI 치수 ' + c.oogDim : ''}.`;
      return '규격초과 아님.';
    }
    case 'xray': {
      const x = xrayOf(ctx, c);
      if (!x.inList) return 'X-RAY 대상 아님.';
      return `X-RAY 대상${x.seal && S(x.seal.seal) ? ' · 커트씰 ' + x.seal.seal + (S(x.seal.sealer) ? ' 봉인자 ' + x.seal.sealer : '') : ' · 커트씰 아직 없음'}`;
    }
    case 'status': {
      const sec = secOf(ctx, c._mode === 'loading' ? 'loading' : 'discharge');
      const h = (sec.held || {})[c.cn];
      const lg = (sec.luggConfirm || {})[c.cn];
      const a = [];
      const comp = c._comp || c.comp;
      a.push(comp ? `완료 ${hhmm(comp.at)}${S(comp.by) ? ' ' + comp.by : ''}${S(comp.equip) ? ' ' + (/호기$/.test(S(comp.equip)) ? comp.equip : comp.equip + '호기') : ''}` : '미완료');
      if (h && !h.doneAt) a.push(`보류(${S(h.reason) || '사유 없음'}${S(h.by) ? ' ' + h.by : ''})`);
      if (lg) a.push(`수화물 확인${S(lg.by) ? ' ' + lg.by : ''}`);
      if (c.lugg) a.push('수화물');
      if (c.urgent) a.push('긴급');
      if (c.mkcon) a.push('특수제작컨');
      if (effectivePos(c).inStorage) a.push('임시창고');
      return a.join(' · ');
    }
    case 'spec': return `${specOf(c)} ${feKo(c)}${c.rf ? ' · 리퍼' : ''}${c.dg ? ' · 위험물' : ''}${c.fr ? ' · FR' : ''}${c.ot ? ' · OT' : ''}${c.tk ? ' · 탱크' : ''}`;
    default: return '';
  }
}

/** 개체 창구 — parsed.digits + parsed.entityAttr 일 때만. 못 찾으면 «없어요», 창구가 아니면 null. */
export function answerEntityFacts(parsed, ctx) {
  if (!parsed || !parsed.digits || !parsed.entityAttr) return null;
  const hits = findByDigits(ctx, parsed.digits);
  if (!hits.length) return `끝네자리 ${String(parsed.digits).slice(-4)} — 이 항차에 없어요.`;
  return hits.map((c) => `${entityHead(c)}\n${attrLine(c, parsed.entityAttr, ctx)}`).join('\n');
}

/* ── 항차 창구 — 마감텔리 수치 · 해치커버 · 접안 현측 · 작업 시작·종료 실적 · 규격초과 · 엠티실 · 특수제작컨 · 임시창고 · 커트씰 · 보류 · 수화물확인 · 환적 ── */
function shipLabel(ctx) { const i = (ctx && ctx.info) || {}; return S(i.vsl) || S(ctx && ctx.vsl) || '이 배'; }
function fullVoyage(ctx) { return (ctx && ctx.voyage) || null; }

export function answerVoyageFacts(parsed, ctx) {
  if (!parsed || !parsed.factQuery) return null;
  const v = fullVoyage(ctx);
  const info = (ctx && ctx.info) || (v && v.info) || {};
  const cs = (ctx && ctx.containers) || [];
  const ship = shipLabel(ctx);
  const k = parsed.factQuery;
  try {
    if (k === 'tally') {
      if (!v) return null;
      if (typeof ctx.computeTallyData !== 'function') return `${ship} 마감텔리 수치는 검수앱 미르에게 물어 주세요 — 콘앱은 그 계산을 싣지 않아요.`;
      const t = ctx.computeTallyData(v);
      const s = (o) => `풀 20 ${o.F['20'] || 0}·40 ${o.F['40'] || 0}·HC ${o.F.HC || 0}·45 ${o.F['45'] || 0} / 엠티 20 ${o.E['20'] || 0}·40 ${o.E['40'] || 0}·HC ${o.E.HC || 0}`;
      const L = [`${ship} ${S(info.voy)} 마감텔리 수치(지금 기준)`];
      L.push(`양하 ${t.totals.dis.n}대 — ${s(t.totals.dis)}`);
      L.push(`선적 ${t.totals.load.n}대 — ${s(t.totals.load)}`);
      if (t.totals.shift && t.totals.shift.n) L.push(`시프팅 ${t.totals.shift.n}대`);
      L.push(`OOG in ${((t.osIn || {}).rows || []).length} · out ${((t.osOut || {}).rows || []).length} / RF in ${(t.rfIn || []).length} · out ${(t.rfOut || []).length} / 데미지 in ${((t.damage || {}).dmIn || []).length} · out ${((t.damage || {}).dmOut || []).length}`);
      if (t.sealIn && t.sealIn.length) L.push(`실 목록 in ${t.sealIn.length}`);
      L.push('(마감텔리 파일 자체는 수석 보드에서 만듭니다)');
      return L.join('\n');
    }
    if (k === 'hatch') {
      if (parsed.bay) return null;   // «12번 해치 몇 대» 는 베이 조회다
      if (!v) return null;
      let bayDef = null;
      try { const d = (typeof window !== 'undefined' && window.__fbShipBayDict) ? window.__fbShipBayDict[S(info.vsl).toUpperCase()] : null; bayDef = d ? (d.bayDef || d) : null; } catch (e) { bayDef = null; }
      const a = answerHatchStatus({ ...v, key: ctx.voyageKey || '', _key: ctx.voyageKey || '' }, bayDef, S(info.vslFull) || ship);
      if (a) return a;
      const hd = info.hatchDone || {};
      const ks = Object.keys(hd);
      if (ks.length) return `${ship} 해치커버 — ${ks.map((b) => `${b.replace(/^discharge_/, '')} ${hd[b] === 'open' ? '열림' : '닫힘'}`).join(' · ')}`;
      return `${ship} 해치커버 보고 기록이 아직 없어요.`;
    }
    if (k === 'berthSide') {
      const side = berthSideOf(info);
      const src = S(info.berthSidePick) ? '검수사 지정' : S(info.berthSide) ? '수집기(터미널 화면)' : '';
      if (!side) return `${ship} 접안 현측 기록 없음 — 수집기 값도 검수사 지정도 비어 있어요. 배를 보고 정해 주세요(작업 시작 탭 «접안?»).`;
      return `${ship} ${side === 'starboard' ? '우현' : '좌현'} 접안(${src}) — 바다를 보고 서면 선수가 ${side === 'starboard' ? '오른쪽' : '왼쪽'}이에요.`;
    }
    if (k === 'workTimes') {
      const ats = [];
      for (const m of ['discharge', 'loading']) {
        const comp = (v && v[m] && v[m].completed) || null;
        if (comp) for (const c of Object.values(comp)) { if (c && typeof c.at === 'number' && c.at > 0) ats.push(c.at); }
      }
      if (!ats.length) for (const c of cs) { const cp = c._comp || c.comp; if (cp && typeof cp.at === 'number') ats.push(cp.at); }
      ats.sort((a, b) => a - b);
      const reps = Object.values((v && v.reports) || {}).filter((r) => r && r.type === 'work_status');
      const starts = reps.filter((r) => /_start$/.test(S(r.action))).map((r) => r.ts).filter(Boolean).sort((a, b) => a - b);
      const dones = reps.filter((r) => /_done$/.test(S(r.action))).map((r) => r.ts).filter(Boolean).sort((a, b) => a - b);
      const L = [];
      if (S(info.workStartAt)) L.push(`작업 시작 ${S(info.workStartAt).slice(5)}(터미널)`);
      if (S(info.workStartManual)) L.push(`말로 알린 시작 ${S(info.workStartManual)}`);
      if (starts.length) L.push(`검수 시작 보고 ${hhmm(starts[0])}`);
      if (ats.length) L.push(`첫 완료 ${hhmm(ats[0])} · 마지막 완료 ${hhmm(ats[ats.length - 1])} (검수 기록 ${ats.length}대)`);
      if (info.dischargeDoneAt) L.push(`양하 완료 ${hhmm(info.dischargeDoneAt)}`);
      if (info.loadingDoneAt) L.push(`선적 완료 ${hhmm(info.loadingDoneAt)}`);
      if (dones.length) L.push(`종료 보고 ${hhmm(dones[dones.length - 1])}`);
      if (S(info.workEndAt)) L.push(`작업 종료 ${S(info.workEndAt).slice(5)}(터미널)`);
      if (S(info.atbActual)) L.push(`접안 ${S(info.atbActual).slice(5)}`);
      if (S(info.atdActual)) L.push(`이안 ${S(info.atdActual).slice(5)}`);
      return L.length ? `${ship} — ${L.join(' · ')}` : `${ship} 시작·종료 기록이 아직 없어요 — 완료 체크가 찍히면 그때부터 답할 수 있어요.`;
    }
    if (k === 'oog') {
      const hit = cs.filter((c) => c._ptk !== false && (c.oog || c.fr || c.ot || (overDims(c) || {}).over));
      if (!hit.length) return `${ship} 규격초과(OOG·FR·OT) 컨 없음 — EDI·리스트 기준.`;
      return `${ship} 규격초과 ${hit.length}대\n` + hit.map((c) => `${entityHead(c)} · ${attrLine(c, 'dims', ctx)}`).join('\n');
    }
    if (k === 'eseal') {
      const e = cs.filter((c) => c._mode === 'loading' && S(c.fe).toUpperCase() === 'E' && c._ptk !== false);
      if (!e.length) return `${ship} 선적 엠티가 없어 엠티실 대상도 없어요.`;
      const done = e.filter((c) => S(c.eseal));
      const L = [`${ship} 선적 엠티 ${e.length}대 · 실 붙인 것 ${done.length}대 · 남은 것 ${e.length - done.length}대`];
      const es = ctx && ctx.eseal;
      if (es && es.ranges && es.ranges.length) L.push(`실 범위 ${es.ranges.map((r) => (typeof r === 'string' ? r : `${r.from || r.start || ''}~${r.to || r.end || ''}`)).join(', ')}${es.remainN != null ? ' · 남은 실 ' + es.remainN + '개' : ''}`);
      if (/번호|목록|리스트|어떤/.test(S(parsed._raw)) && done.length) L.push(done.slice(0, 30).map((c) => `${c.cn} ${c.eseal}`).join('\n') + (done.length > 30 ? `\n… 외 ${done.length - 30}대` : ''));
      return L.join('\n');
    }
    if (k === 'mkcon') {
      const hit = cs.filter((c) => c.mkcon);
      if (!hit.length) return `${ship} 특수제작컨 표시된 컨 없음 — 리스트 REMARK·예보·수동 표시 기준.`;
      return `${ship} 특수제작컨 ${hit.length}대\n` + hit.map(entityHead).join('\n');
    }
    if (k === 'storage') {
      const hit = cs.filter((c) => effectivePos(c).inStorage);
      if (!hit.length) return `${ship} 임시창고에 둔 컨 없음.`;
      return `임시창고 ${hit.length}대\n` + hit.map((c) => `${S(c.cn)} · ${specOf(c)} ${feKo(c)} · ${modeKo(c)}${c.actual_by ? ' · ' + c.actual_by : ''}${c.actual_at ? ' ' + hhmm(c.actual_at) : ''}`).join('\n');
    }
    if (k === 'cutSeal') {
      const d = secOf(ctx, 'discharge');
      const xl = d.xrayList || {}; const xs = d.xraySeals || {};
      let keys = Object.keys(xl);
      if (!keys.length) keys = cs.filter((c) => c._xray || c.isXray).map((c) => c.cn);
      if (!keys.length) return `${ship} X-RAY 대상이 없어 커트씰도 없어요.`;
      const n = keys.filter((cn) => xs[cn] && S(xs[cn].seal)).length;
      return `${ship} X-RAY 대상 ${keys.length}대 · 커트씰 기록 ${n}대\n` + keys.map((cn) => {
        const c = cs.find((x) => x.cn === cn);
        const s = xs[cn] || (c && (c._xraySeal || c.xraySeal)) || null;
        return `${cn}${c ? ' @ ' + posOf(c) : ''} — ${s && S(s.seal) ? '커트씰 ' + s.seal + (S(s.sealer) ? ' 봉인자 ' + s.sealer : '') : '커트씰 아직 없음'}`;
      }).join('\n');
    }
    if (k === 'held') {
      const h = { ...(secOf(ctx, 'discharge').held || {}), ...(secOf(ctx, 'loading').held || {}) };
      const ks = Object.keys(h).filter((cn) => h[cn] && !h[cn].doneAt);
      if (!ks.length) return `${ship} 보류 중인 컨 없음.`;
      return `보류 ${ks.length}대\n` + ks.map((cn) => `${cn} · ${S(h[cn].reason) || '사유 없음'}${S(h[cn].by) ? ' ' + h[cn].by : ''}${h[cn].at ? ' ' + hhmm(h[cn].at) : ''}${S(h[cn].equip) ? ' · ' + (/호기$/.test(S(h[cn].equip)) ? h[cn].equip : h[cn].equip + '호기') : ''}`).join('\n');
    }
    if (k === 'lugg') {
      const lg = { ...(secOf(ctx, 'discharge').luggConfirm || {}), ...(secOf(ctx, 'loading').luggConfirm || {}) };
      const ks = Object.keys(lg);
      const tot = cs.filter((c) => c.lugg).length;
      if (!ks.length) return tot ? `${ship} 수화물 컨 ${tot}대 중 확인 기록 0대.` : `${ship} 수화물 확인 기록 없음(수화물 컨 등록도 없음).`;
      return `${ship} 수화물 확인 ${ks.length}대${tot ? ' / 수화물 컨 ' + tot + '대' : ''}\n` + ks.map((cn) => `${cn}${S(lg[cn].by) ? ' · ' + lg[cn].by : ''}${lg[cn].at ? ' ' + hhmm(lg[cn].at) : ''}`).join('\n');
    }
    if (k === 'transship') {
      const hit = cs.filter((c) => S(c.npod) || S(c.tspot) || S(c.fpod));
      if (!hit.length) return `${ship} 다음 항·환적·최종목적지가 적힌 컨 없음(EDI 기준).`;
      const by = {};
      for (const c of hit) {
        const key = [S(c.npod) && '다음 양하항 ' + c.npod, S(c.tspot) && '환적항 ' + c.tspot, S(c.fpod) && '최종 목적지 ' + c.fpod].filter(Boolean).join(' · ');
        by[key] = (by[key] || 0) + 1;
      }
      return `${ship} 다음 항·환적·최종목적지가 적힌 컨 ${hit.length}대\n` + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([kk, n]) => `${kk} — ${n}대`).join('\n');
    }
  } catch (e) {
    console.warn('[미르 창구] 답 만들기 실패:', k, e);
    return null;
  }
  return null;
}
