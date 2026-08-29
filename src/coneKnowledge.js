// 콘(고정장치) 지식 — 미르가 콘앱에서 답하기 위한 한 벌. 화면·전역에 기대지 않는 순수 함수다.
/* ★ ConeOne 2.13 (검수사 확정 2026-08-29)
     *«미르가 콘앱지식은 다 이식 받는다면 더 친절하게 설명을 할거라고 생각합니다.
       다만 어떤앱에서 질문을 받았느냐는것이 관건이죠? 검수앱에서 브리핑해줘 하면 검수자료를
       콘앱에서 브리핑해줘 하면 콘앱 자료를»*

   여기 있는 것은 `public/cone.html` 의 `coneQaAnswer` 를 **잘라 온 것이 아니라 승격시킨 것**이다.
   콘앱은 이 파일이 실린 번들(`window.ConeMir`)을 부르고, 못 실었을 때만 제 안의 옛 함수로 돌아간다.
   ⚠ 그러므로 **판정은 여기 한 벌뿐이다.** 콘앱 쪽 사본은 폴백일 뿐 정본이 아니다.

   ⛔ 전역(`window.__coneQA`·`state`)을 보지 않는다 — 부르는 쪽이 인자로 넘긴다.
      그래야 검수앱에서도 같은 함수로 콘을 물을 수 있다. */

const KIND_NAME = { deck: '데크콘', ele: '코끼리콘', hold: '홀드콘' };
const PER_OF = { deck: 4, ele: 2, hold: 1 };   // 곳당 개수 — 데크 4, 코끼리 2, 홀드는 총개수라 1
const KINDS = ['deck', 'ele', 'hold'];

export const CONE_QA_HELP =
  '이렇게 물어보세요. "5번 베이", "7번 베이 홀드콘", "모자란 데", "남는 데", "전체", "콘 작업 브리핑", "5번 베이 컨테이너 몇 대".';

/** o={need,have,diff}(곳당) · per=곳 수 → 총개수와 «할 일»을 사람 말로. */
export function coneConeLine(name, o, per) {
  if (!o) return null;
  const totD = o.diff * per;
  if (o.need === 0 && o.have === 0) return null;
  if (o.diff > 0) return name + ' 곳당 ' + o.have + '에서 ' + o.need + '개로, 총 ' + totD + '개 더 필요(추가)';
  if (o.diff < 0) return name + ' 곳당 ' + o.have + '에서 ' + o.need + '개로, 총 ' + (-totD) + '개 남음(반납)';
  return name + ' 곳당 ' + o.need + '개 그대로';
}

/** 베이 번호 → 작업표 행. 트리오 라벨("05-07")은 **구간**으로 본다.
 *  콘 작업자는 트리오를 가운데 짝수로 부른다(C8.34 확정: 33-34-35 = "34번"). */
function findRow(rows, n) {
  return (rows || []).find((r) => {
    const ns = String(r.bay).split(/[,\-]/).map((p) => parseInt(p, 10)).filter(Number.isFinite);
    return ns.length && n >= Math.min.apply(null, ns) && n <= Math.max.apply(null, ns);
  });
}

function bayRange(r) {
  const ns = String(r.bay).split(/[,\-]/).map((p) => parseInt(p, 10)).filter(Number.isFinite);
  if (!ns.length) return null;
  return [Math.min.apply(null, ns), Math.max.apply(null, ns)];
}

/** 콘 작업 브리핑 — 검수 브리핑과 같은 짜임(한 줄 요약 → 할 일)으로 낸다.
 *  검수사 «콘앱에서 브리핑해줘 하면 콘앱 자료를». */
export function coneBriefing(cone, opts) {
  const rows = (cone && cone.rows) || [];
  if (!rows.length) return null;
  const o = opts || {};

  /* ★ 2.16 (검수사 확정 2026-08-29) — *«브리핑 말그대로 그날 할일을 요약해주는 것입니다.
       계산기 대신 답하라는것만은 아닙니다»*
     2.15 까지는 콘 가감표를 말로 옮긴 것에 지나지 않았다. 콘 작업자가 배에 오르기 전에
     «오늘 뭘 하는지» 를 한 장으로 알아야 한다.
     짜임은 검수앱 브리핑(generateBriefing)의 결을 그대로 따른다 —
       한 줄 요약 → 작업 내역 → 주의사항 → 다음에 물을 말. */

  const nd = (cone && cone.dischRows || []).length;
  const nl = (cone && cone.stowRows || []).length;
  const nShift = o.shiftN || 0;

  //  콘은 «곳 수 × 곳당 개수». need·have·diff 는 곳 수이고 PER_OF 가 곳당 개수다.
  const sum = (k, f) => rows.reduce((a, r) => a + (r[k] ? f(r[k]) * PER_OF[k] : 0), 0);
  const needTot = {}, haveTot = {}, diffTot = {};
  for (const k of KINDS) {
    needTot[k] = sum(k, (x) => x.need);
    haveTot[k] = sum(k, (x) => x.have);
    diffTot[k] = sum(k, (x) => x.diff);
  }

  const bays = rows.map((r) => r.bay).join(', ');
  const take = [], back = [];
  for (const r of rows) {
    for (const k of KINDS) {
      const d = r[k] ? r[k].diff * PER_OF[k] : 0;
      if (d > 0) take.push('베이 ' + r.bay + ' ' + KIND_NAME[k] + ' ' + d + '개');
      else if (d < 0) back.push('베이 ' + r.bay + ' ' + KIND_NAME[k] + ' ' + (-d) + '개');
    }
  }

  const L = [];
  //  ① 한 줄 요약 — 오늘 무엇을 얼마나 하는가
  const head = [];
  if (nd) head.push('내림 ' + nd);
  if (nl) head.push('실음 ' + nl);
  const total = nd + nl;
  L.push('📋 콘 작업 브리핑' + (o.vsl ? ' — ' + o.vsl : '')
    + (total ? ' · ' + head.join(' + ') + ' = ' + total + '대' : ''));

  //  ② 콘 총수량 — «가감»이 아니라 «몇 개 다는가». 이것이 없어 계산기를 다시 열어야 했다.
  const coneLine = KINDS.map((k) => {
    if (!needTot[k] && !haveTot[k]) return null;
    return KIND_NAME[k] + ' ' + needTot[k] + '개';
  }).filter(Boolean);
  if (coneLine.length) L.push('📌 필요한 콘: ' + coneLine.join(' · '));

  //  ③ 어디서 하는가
  L.push('📌 작업 베이: ' + rows.length + '곳 — ' + bays);

  //  ④ 챙길 것 / 돌려줄 것
  if (take.length) L.push('⚠ 가져갈 것 — ' + take.join(', '));
  if (back.length) L.push('↩ 반납할 것 — ' + back.join(', '));
  if (!take.length && !back.length) L.push('· 콘 변동 없습니다 — 배에 있는 것 그대로 씁니다.');

  //  ⑤ 알아 둘 것
  if (nShift) L.push('· 시프팅 ' + nShift + '대 포함 — 내렸다 다시 싣는 것이라 콘도 두 번 만집니다.');

  L.push('\n"모자란 데" · "남는 데" · "5번 베이" 로 더 물어보세요');
  return L.join('\n');
}

/** 콘 질문에 답한다. 못 알아들으면 **null** 을 준다 — 그때는 부르는 쪽이 미르에게 넘긴다.
 *  cone = { rows, dischRows, stowRows } */
export function coneAnswer(qRaw, cone) {
  const q = (qRaw || '').trim();
  if (!q) return null;
  const rows = (cone && cone.rows) || [];
  if (!rows.length) {
    /* ⛔ 종전엔 무엇을 물어도 «먼저 계산하기를» 이었다(검수사 실측 — *«모든 질문에 콘 계산기 먼저
       누르라고 합니다»*). 콘 이야기가 아니면 **null 을 주고 미르에게 넘긴다.**
       용어·조회·잡담은 작업표가 없어도 답할 수 있다. */
    return isConeQuery(qRaw) || /베이|모자|부족|남는|반납|전체\s*가감/.test(String(qRaw || ''))
      ? '아직 콘 작업표가 없어요. [③ 콘 계산하기]를 누르면 베이별로 답해 드릴게요.'
      : null;
  }

  const t = q.toLowerCase();
  const kind = /데크/.test(t) ? 'deck' : (/코끼리/.test(t) ? 'ele' : (/홀드/.test(t) ? 'hold' : null));

  // 브리핑 — 검수사 요청으로 2.13 신설
  if (/브리핑|요약\s*해|정리\s*해/.test(t)) return coneBriefing(cone, cone && cone._opts);

  /* ★ 2.15 — «작업량» 은 **컨테이너 대수**다. 콘 가감으로 답하지 않는다.
       ⚠ 처음엔 682 를 «현장에 없는 수치» 로 잘못 봤다. 검수사 정정 —
         *«맞는 답변 아닌가요? 콘 작업량이 아니고 작업량 컨테이너 682대»*
         682 = 내림 374 + 실음 308 이고, 크레인이 드는 총 횟수다. 콘 작업자에게 그것이 작업량이다.
       고칠 것은 숫자가 아니라 **어떻게 나온 682인지 안 보이는 것**이었다
       (검수사가 오늘 정한 형식 — «양하 279 시프팅 95 작업분 374» 처럼 풀어서 보인다). */
  if (/작업량|몇\s*대\s*(작업|해|하나|합니까)|작업\s*몇\s*대|물량/.test(t)) {
    const nd = (cone && cone.dischRows || []).length;
    const nl = (cone && cone.stowRows || []).length;
    if (nd || nl) {
      const L = ['📦 작업량 ' + (nd + nl) + '대'];
      L.push('· 내림 ' + nd + ' + 실음 ' + nl);
      L.push('  (시프팅 포함 — 크레인이 드는 횟수)');
      L.push('\n"콘 작업 브리핑" 으로 콘 가감을 볼 수 있어요');
      return L.join('\n');
    }
  }

  // ① 베이 질문
  const bayM = t.match(/(\d{1,3})\s*(?:번)?\s*베이|베이\s*(\d{1,3})|^(\d{1,3})$/);
  const bayN = bayM ? parseInt(bayM[1] || bayM[2] || bayM[3], 10) : null;
  if (bayN != null) {
    const r = findRow(rows, bayN);
    if (!r) return bayN + '번 베이는 작업표에 없습니다. (콘 작업 없는 베이)';
    // 콘은 '개', 컨테이너는 '대' — '몇 개'는 콘 질문이므로 여기 추가 금지(V7.91-01)
    if (/컨테이너|몇\s*대|대수/.test(t)) {
      const rg = bayRange(r);
      const cnt = (rows0) => {
        if (!rg) return 0;
        return (rows0 || []).filter((c) => {
          const b = parseInt(c.bay, 10);
          return b >= rg[0] && b <= rg[1];
        }).length;
      };
      return '베이 ' + r.bay + '. 양하 ' + cnt(cone && cone.dischRows) + '대, 선적 ' + cnt(cone && cone.stowRows) + '대.';
    }
    const ks = kind ? [kind] : KINDS;
    const lines = ks.map((k) => coneConeLine(KIND_NAME[k], r[k], PER_OF[k])).filter(Boolean);
    if (!lines.length) return '베이 ' + r.bay + '. 콘 변동 없습니다.';
    return '베이 ' + r.bay + '. ' + lines.join('. ') + '.';
  }

  // ② 모자란 / 남는 베이 (V7.91-02 일상 동의어)
  if (/모자|부족|추가|필요|가져가야|가져갈/.test(t) || /남(는|아|았|을)|반납|회수|빼\s*야|뺄|돌려/.test(t)) {
    const wantAdd = /모자|부족|추가|필요|가져가야|가져갈/.test(t);
    const ks = kind ? [kind] : KINDS;
    const out = [];
    for (const r of rows) {
      const seg = ks.map((k) => {
        const d = r[k] ? r[k].diff * PER_OF[k] : 0;
        if (wantAdd && d > 0) return KIND_NAME[k] + ' ' + d + '개';
        if (!wantAdd && d < 0) return KIND_NAME[k] + ' ' + (-d) + '개';
        return null;
      }).filter(Boolean);
      if (seg.length) out.push('베이 ' + r.bay + ': ' + seg.join(', '));
    }
    if (!out.length) return wantAdd ? '더 필요한 콘이 있는 베이가 없습니다.' : '반납할 콘이 있는 베이가 없습니다.';
    return (wantAdd ? '콘이 더 필요한 곳 — ' : '콘이 남는 곳(반납) — ') + out.join(' / ');
  }

  // ③ 전체 요약
  /* «총» 만으로 콘 전체 요약을 내지 않는다 — «총 작업량은» 이 여기로 새던 것을 막는다(2.15). */
  if (/전체|전부|모두|몽땅|싹\s*다|죄다|도합|통틀어|합쳐|합치|다\s*해서|(?:^|\s)다(?=\s|$|[?.!,])/.test(t)
      || (/총/.test(t) && /콘|데크|코끼리|홀드|가감/.test(t))) {
    const ks = kind ? [kind] : KINDS;
    const seg = ks.map((k) => {
      const tot = rows.reduce((a, r) => a + (r[k] ? r[k].diff * PER_OF[k] : 0), 0);
      return KIND_NAME[k] + ' ' + (tot > 0 ? '+' + tot + '개 추가' : tot < 0 ? (-tot) + '개 반납' : '변동 없음');
    });
    return '전체 가감. ' + seg.join(', ') + '.';
  }

  // ④ 콘 종류만 ("데크콘")
  if (kind) {
    const tot = rows.reduce((a, r) => a + (r[kind] ? r[kind].diff * PER_OF[kind] : 0), 0);
    const list = rows.filter((r) => r[kind] && r[kind].diff !== 0)
      .map((r) => '베이 ' + r.bay + ' ' + (r[kind].diff > 0 ? '+' : '') + (r[kind].diff * PER_OF[kind]) + '개').join(', ');
    return KIND_NAME[kind] + ' 전체 ' + (tot > 0 ? '+' + tot + '개 추가' : tot < 0 ? (-tot) + '개 반납' : '변동 없음') + (list ? '. ' + list : '') + '.';
  }

  return null;   // 콘 질문이 아니다 — 미르에게 넘긴다
}

/** 콘 이야기인지 가려내는 게이트. 미르가 «콘» 을 검수 질문으로 오해하지 않게. */
export function isConeQuery(q) {
  return /콘|데크콘|코끼리|홀드콘|트위스트락|고정장치/.test(String(q || ''));
}
