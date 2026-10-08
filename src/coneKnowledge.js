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
  '이렇게 물어보세요. "5번 베이", "7번 베이 홀드콘", "24번 홀드 콘 몇 개 남았어", "모자란 데", "남는 데", "전체", "콘 작업 브리핑", "5번 베이 컨테이너 몇 대".';

/* ★ 2.64-01 — «N번 홀드»·«N번 데크»·«홀드 N» 도 베이 번호다. 종전엔 «베이» 낱말이 있어야 번호를 읽어, 검수사 «24번 홀드에 콘이 몇개 남았어»
     (2026-10-08 PCSZ 2631E 실측)가 번호를 못 잡고 «콘이 남는 곳(반납)» 전체 목록으로 나갔다.
     ⚠ «홀드콘 14개»·«2 호기»·«20ft 홀드콘» 같은 말의 숫자는 번호가 아니다 — 숫자 뒤에 베이·홀드·데크·코끼리가 바로 와야 하고, 낱말 뒤 숫자는 개·대·장이 안 붙을 때만. */
const BAY_RE = /(\d{1,3})(?!\d)\s*번?\s*(?:베이|홀드|데크|코끼리)|베이\s*(\d{1,3})(?!\d)(?!\s*(?:개|대|곳|군데|열|단|칸|줄|호기))|(?:홀드|데크|코끼리)\s*콘?\s*(\d{1,3})(?!\d)(?:\s*번(?!째)|(?=(?:에|의|은|는|이|가|도|만)(?:\s|$|[?.!,~]))|(?![가-힣a-zA-Z])(?!\s*(?:개|대|장|ft|피트|호기|곳|군데|열|단|칸|줄|명|척|톤|시|분|층|번째)))|^(\d{1,3})$/;
/* «남았어»·«남은 거» = **아직 안 한 일(완료 기록 기준)**. «남는 데(반납)» = 콘이 남아 돌려줄 곳(작업표 계산) — 둘은 다른 말이다. */
const REST_RE = /남았|남은|남음|남나|남지|남아\s*있|얼마\s*남|몇\s*개\s*남|몇개\s*남|잔량|잔여|빼야|뺄\s*(?:거|것|게)|빼면|꽂아야|꽂을\s*(?:거|것|게)|꽂으면|안\s*(?:한|뺀|뺐|꽂은|꽂았|했)|못\s*(?:뺐|꽂았|했)|끝났|다\s*(?:했|뺐|꽂)|얼마나\s*(?:했|뺐|꽂)|아직\s*몇/;
const CONE_WORD = /콘|홀드|데크|코끼리/;   // 콘 계열 낱말 — «남았어» 와 같이 오면 번호·개수 말이 없어도 남은 콘을 묻는 말이다
const COUNT_RE = /몇|얼마|개수|갯수|수량|정확/;

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

/** ★ 2.64-01 — 남은 콘(완료 기록 기준). cone.restRows = 부르는 쪽(콘앱)이 «아직 안 한 컨»만으로 같은 콘 계산을 다시 돌려 낸 표.
 *  행 = { bay, rest:{deck|ele|hold:{dis,load}}, tot:{같은 모양} } — dis=양하 빼기 개수, load=선적 꽂기 개수(곳당 환산 없이 콘 개수 그대로).
 *  restRows 가 없으면(완료 기록을 못 읽음) **0 으로 지어내지 않고** 모른다고 하며 계획 개수만 알려 준다. */
function coneRestLines(r, ks, flag) {
  const out = [];
  for (const k of ks) {
    const t = r.tot && r.tot[k], x = r.rest && r.rest[k];
    if (!t || !x) continue;
    if (x.dis > t.dis || x.load > t.load) continue;   // 남은 수가 전체보다 크면 어긋난 자료다 — 그 줄은 내지 않는다
    const lo = r.lo && r.lo[k];   // 컨번호가 아직 없는 예약 자리(__BOOK_·__SLOT_)가 끝났는지 모를 때의 «최소» — 있으면 «최소~최대» 로 말한다
    const seg = [];
    const one = (label, left, all, low) => {
      if (!all) return;
      if (low != null && low >= 0 && low < left) { if (flag) flag.unsure = true; seg.push(label + ' ' + low + '~' + left + '개 남음(전체 ' + all + '개)'); return; }
      seg.push(label + ' ' + left + '개 남음' + (left === 0 ? '(전체 ' + all + '개 모두 끝)' : (left === all ? '(전체 ' + all + '개, 아직 안 함)' : '(전체 ' + all + '개 중 ' + (all - left) + '개 끝)')));
    };
    one('양하 빼기', x.dis, t.dis, lo ? lo.dis : null);
    one('선적 꽂기', x.load, t.load, lo ? lo.load : null);
    if (seg.length) out.push(KIND_NAME[k] + ' ' + seg.join(', '));
  }
  return out;
}
const REST_UNSURE_NOTE = '※ 컨번호가 아직 없는 예약 자리가 있어 그 자리가 끝났는지는 알 수 없어요. 작은 숫자는 예약 자리가 전부 끝났을 때, 큰 숫자는 하나도 안 끝났을 때입니다.';

function coneRestAnswer(cone, bayN, kind) {
  const rest = (cone && cone.restRows) || null;
  const rows = (cone && cone.rows) || [];
  const ks = kind ? [kind] : KINDS;
  if (!rest || !rest.length) {
    //  완료 기록을 못 읽었다 — 남은 수를 모른다. 계획 개수만 말하고 «남은 수»를 지어내지 않는다.
    const r = bayN != null ? findRow(rows, bayN) : null;
    if (bayN != null && !r) return bayN + '번 베이는 작업표에 없습니다. (콘 작업 없는 베이)';
    const plan = r ? ks.map((k) => {
      const o = r[k]; if (!o) return null;
      const dis = o.have * PER_OF[k], load = o.need * PER_OF[k];
      if (!dis && !load) return null;
      return KIND_NAME[k] + ' 양하 ' + dis + '개 · 선적 ' + load + '개';
    }).filter(Boolean) : [];
    return '아직 이 배의 완료 기록을 못 읽어서 «남은» 개수는 못 세요. 잠시 뒤 다시 물어봐 주세요.'
      + (r ? ' (계획은 베이 ' + r.bay + ' ' + (plan.join(', ') || '콘 변동 없음') + '입니다.)' : '');
  }
  if (bayN != null) {
    const r = findRow(rest, bayN);
    if (!r) return bayN + '번 베이는 작업표에 없습니다. (콘 작업 없는 베이)';
    const flag = {};
    const lines = coneRestLines(r, ks, flag);
    if (!lines.length) return '베이 ' + r.bay + '. 콘 변동 없습니다.';
    return '베이 ' + r.bay + '. ' + lines.join('. ') + '. (완료 기록 기준)' + (flag.unsure ? '\n' + REST_UNSURE_NOTE : '');
  }
  //  번호 없이 «몇 개 남았어» — 배 전체 남은 개수 + 남은 것이 있는 베이.
  const tot = {}, st = { unsure: false };
  for (const k of ks) tot[k] = { dis: 0, load: 0, dlo: 0, llo: 0, tdis: 0, tload: 0 };
  const left = [];
  const rng = (lo, hi) => (lo < hi ? lo + '~' + hi : String(hi));
  for (const r of rest) {
    const seg = [];
    for (const k of ks) {
      const t = r.tot && r.tot[k], x = r.rest && r.rest[k];
      if (!t || !x) continue;
      if (x.dis > t.dis || x.load > t.load) continue;   // 어긋난 줄은 합에도 넣지 않는다(베이 지정 답과 같은 문지기)
      const lo = r.lo && r.lo[k];
      const dlo = lo && lo.dis >= 0 && lo.dis < x.dis ? lo.dis : x.dis, llo = lo && lo.load >= 0 && lo.load < x.load ? lo.load : x.load;
      if (dlo < x.dis || llo < x.load) st.unsure = true;
      tot[k].dis += x.dis; tot[k].load += x.load; tot[k].dlo += dlo; tot[k].llo += llo; tot[k].tdis += t.dis; tot[k].tload += t.load;
      if (x.dis) seg.push(KIND_NAME[k] + ' 양하 ' + rng(dlo, x.dis));
      if (x.load) seg.push(KIND_NAME[k] + ' 선적 ' + rng(llo, x.load));
    }
    if (seg.length) left.push('베이 ' + r.bay + ' ' + seg.join('·'));
  }
  //  안 맞는 완료 기록 한 건이 줄일 수 있는 콘은 종류마다 한도(cap = 건수 × 컨 하나당 최대 개수)가 있다 — 줄마다 따로 깎은 «최소» 의 합보다 합계 한도가 더 촘촘하면 그것을 쓴다.
  const capRow = rest.find((r) => r && r.cap);
  const cap = capRow ? capRow.cap : null;
  if (cap) {
    for (const k of ks) {
      const a = tot[k];
      a.dlo = Math.min(a.dis, Math.max(a.dlo, a.dis - ((cap.dis && cap.dis[k]) || 0)));
      a.llo = Math.min(a.load, Math.max(a.llo, a.load - ((cap.load && cap.load[k]) || 0)));
    }
  }
  const head = ks.map((k) => {
    const a = tot[k]; const p = [];
    if (a.tdis) p.push('양하 빼기 ' + rng(a.dlo, a.dis) + '개(전체 ' + a.tdis + '개)');
    if (a.tload) p.push('선적 꽂기 ' + rng(a.llo, a.load) + '개(전체 ' + a.tload + '개)');
    return p.length ? KIND_NAME[k] + ' ' + p.join(', ') : null;
  }).filter(Boolean);
  if (!head.length) return '이 배는 콘 변동이 없습니다.';
  return '남은 콘(완료 기록 기준) — ' + head.join(' / ') + '.' + (left.length ? ' 남은 곳 — ' + left.join(' / ') + '.' : ' 남은 곳이 없습니다.')
    + (st.unsure ? '\n' + REST_UNSURE_NOTE : '')
    + '\n베이 번호를 같이 말씀하시면 그 베이만 알려 드려요. 예: "24번 홀드 콘 몇 개 남았어"';
}

/** 콘 질문에 답한다. 못 알아들으면 **null** 을 준다 — 그때는 부르는 쪽이 미르에게 넘긴다.
 *  cone = { rows, dischRows, stowRows } */
export function coneAnswer(qRaw, cone, mark) {
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
  const bayM = t.match(BAY_RE);
  const bayN = bayM ? parseInt(bayM[1] || bayM[2] || bayM[3] || bayM[4], 10) : null;
  //  ★ 2.64-01 — «남았어» 는 **남은 일**이다(완료 기록 기준). 번호가 있거나 개수를 묻는 말이면 «남는 곳(반납)» 목록이 아니라 남은 개수로 답한다.
  //   · «컨테이너 몇 대 남았어» 는 콘 질문이 아니다 — 콘 계획 대수(완료를 모른다)를 내지 않고 null 로 넘겨, 완료 기록을 아는 진행 답(검수앱과 같은 답)이 하게 한다.
  //   · 반납·모자람·추가·필요를 묻는 말은 종전 작업표 답(남는 곳·모자란 곳) 그대로다.
  if (REST_RE.test(t) && /컨테이너|몇\s*대|대수/.test(t)) return null;
  //  시간·속도를 묻는 말은 콘 개수 질문이 아니다(«24번 홀드 콘 언제 끝나»·«몇 시에 끝나»·«남은 시간») — 베이 계획 답(곳당 N개 반납)으로 대신하지 않고 null 로 넘겨 예상 완료 답이 받게 한다.
  if (bayN != null && /시간|시각|몇\s*시|언제|속도|페이스/.test(t)) return null;
  if (REST_RE.test(t) && (bayN != null || COUNT_RE.test(t) || CONE_WORD.test(t)) && !/반납|회수|돌려|모자|부족|가져|추가|필요|시간|시각|몇\s*시|언제|속도|페이스/.test(t)) {
    const a = coneRestAnswer(cone, bayN, kind);
    //  mark — 부른 쪽(mir.js)이 «이 답은 남은 콘 자료 답» 임을 알게 한다. «몇개»·«콘이» 가 사전에 없어 약한 답으로 보이면 모델이 질문을 고쳐 써
    //  컨테이너 대수 답으로 덮어쓴다(실측 2.64-01: 1번·2번·16번 홀드). 자료 답은 약하지 않다(isWeakAnswer 의 coneRest).
    if (a) { if (mark && typeof mark === 'object') mark.rest = true; return a; }
  }
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
