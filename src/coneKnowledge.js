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
export function coneBriefing(cone) {
  const rows = (cone && cone.rows) || [];
  if (!rows.length) return null;

  const totalOf = (k) => rows.reduce((a, r) => a + (r[k] ? r[k].diff * PER_OF[k] : 0), 0);
  const need = [];
  const back = [];
  for (const r of rows) {
    for (const k of KINDS) {
      const d = r[k] ? r[k].diff * PER_OF[k] : 0;
      if (d > 0) need.push('베이 ' + r.bay + ' ' + KIND_NAME[k] + ' ' + d + '개');
      else if (d < 0) back.push('베이 ' + r.bay + ' ' + KIND_NAME[k] + ' ' + (-d) + '개');
    }
  }
  const sum = KINDS.map((k) => {
    const t = totalOf(k);
    return KIND_NAME[k] + ' ' + (t > 0 ? '+' + t : t < 0 ? String(t) : '0');
  }).join(' · ');

  const L = [];
  const headWarn = need.length ? ' — 가져갈 콘 ' + need.length + '건' : (back.length ? ' — 반납 ' + back.length + '건' : '');
  L.push('📋 콘 작업 브리핑 — 베이 ' + rows.length + '곳' + headWarn);
  L.push('📌 가감: ' + sum + '  (곳당이 아니라 총개수)');
  if (need.length) L.push('⚠ 가져갈 것 — ' + need.join(', '));
  if (back.length) L.push('↩ 반납할 것 — ' + back.join(', '));
  if (!need.length && !back.length) L.push('· 변동 없습니다 — 배에 있는 콘 그대로 씁니다.');
  L.push('\n"모자란 데" · "남는 데" · "5번 베이" 로 더 물어보세요');
  return L.join('\n');
}

/** 콘 질문에 답한다. 못 알아들으면 **null** 을 준다 — 그때는 부르는 쪽이 미르에게 넘긴다.
 *  cone = { rows, dischRows, stowRows } */
export function coneAnswer(qRaw, cone) {
  const q = (qRaw || '').trim();
  if (!q) return null;
  const rows = (cone && cone.rows) || [];
  if (!rows.length) return '먼저 계산하기를 눌러 작업표를 만들어 주세요.';

  const t = q.toLowerCase();
  const kind = /데크/.test(t) ? 'deck' : (/코끼리/.test(t) ? 'ele' : (/홀드/.test(t) ? 'hold' : null));

  // 브리핑 — 검수사 요청으로 2.13 신설
  if (/브리핑|요약\s*해|정리\s*해/.test(t)) return coneBriefing(cone);

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
  if (/전체|전부|모두|몽땅|싹\s*다|죄다|도합|통틀어|합쳐|합치|총|다\s*해서|(?:^|\s)다(?=\s|$|[?.!,])/.test(t)) {
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
