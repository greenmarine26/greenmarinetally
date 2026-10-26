// 마감 텔리(DEP.TALLY REPORT) 집계 엔진 — V9.19 (2026-07-28)
//   실물 텔리 233개 분석 기반. 실데이터 시뮬로 검증:
//   DJCT 0221W 선적 216대·ATPR 2634E 양하 251대 — 실제 텔리 매트릭스와 완전 일치.
//   순수 계산만(파이어베이스 접근 없음) — 시뮬 가능. 렌더는 tallyExcel.js.
import { isTermOtL, isLen45Iso } from './utils.js';   // 4.25-01: L5U0(오픈탑)은 터미널 읽기로 40피트 하이큐브 — 크기 칸 한 벌
import { sealCheckOf } from './utils.js';   // 4.49: Act. Cntr-Seal 실번호 상이 = 실오류 판정 한 벌
import { emptySealSpec, isoToLabel, isPyeongtaekPort, computeShiftingMapCached, shiftingListOf, fmtShiftPos, shiftCnSetOf, isShiftOffPtk, voyageKeyOf, effectivePos , applySpecialMarks, hatchReportTs, pickCarrierOp, pickDischargePol, isFullReefer, isEmptyReefer, normPortCode, isFlatRackIso, ediMapFromRaw, isoPickOog, ptkDischargeUnitsOf, markDischargeUnit, dischargeUnitBareRow, isMadeUnitCn, isListOriginRecord, splitJoinedSeals, MADE_UNIT_LABEL } from './utils.js';   // 3.60-20: 엠티 플랫랙 번들   // 3.49: hatchReportTs — 자동 해치 기록의 사건 시각   // TallyOne 1.55: 실적 자리 판정 단일 소스
import { getTallyFormat, orderIndex, shipOpMapper, opParent, subIndex } from './data/tallyFormats.js';
import { bayGroupCenter } from './swapGrade.js';   // 1.8-16: 해치 그룹 판정 단일 소스
import { getBayPairs } from './twin.js';

export const SIZE_COLS = ['20', '40', 'HC', '45'];

/** 4.18-03 — 엠티 실 작업 현황의 규격 글자: **마감텔리의 칸(tallySizeCol)을 그대로 따른다.** 검수사 2026-10-09 22:44 «현장에서는 45G1 40HC를 40풀이라 하고 엠티는 40엠티라고 부릅니다. 표기 방법은 마감텔리에 있는데로 선사별로 틀립니다. 그건 예전에 규격구분을 수석검수가 정리한 마감텔리로 정한다고 결정했습니다».
 *  20' → 20E/20RE · 40' → 40E/40RE · HC → 45GE/45RE(정본 EDI 글자 그대로) · 45' → L5GE. 종전 emptySealSpec 은 20 이 아니면 전부 45xE 라 진짜 45피트 엠티와 일반 40' 엠티가 40HC 엠티와 같은 «45GE» 로 섞였다(OBWH 2762W 45' 44대). 리퍼 판정은 emptySealSpec 그대로. */
export function emptySealSpecTally(c) {
  if (c && (c._madeUnit || isMadeUnitCn(c.cn))) return MADE_UNIT_LABEL;   // 4.20: 제작컨은 규격 코드가 없다(검수사 «규격엔 없습니다»)
  const base = emptySealSpec(c);
  if (base === '-') return base;
  const rf = /RE$/.test(base);
  const col = tallySizeCol(c);
  if (col === '20') return rf ? '20RE' : '20E';
  if (col === '40') return rf ? '40RE' : '40E';
  if (col === '45') return 'L5GE';
  return rf ? '45RE' : '45GE';
}

/** 텔리 규격 4분류 — 20' / 40' / HC(하이큐브·HC리퍼 포함) / 45' (실측 검증 규칙) */
export function tallySizeCol(c) {
  const base = _sizeColBase(c);
  //  3.60-21: 장금 SKHU 번호 규칙(아래 _skhuHc) — 규격 코드가 20'/40' 로 나와도 번호가 600번대 이상이면 40피트 하이큐(실물 HC 칸).
  if ((base === '20' || base === '40') && _skhuHc(c)) return 'HC';
  return base;
}
function _sizeColBase(c) {
  const iso = String(c.iso || '').toUpperCase().trim();
  //  4.15 (§7.8-⑥): 규격이 빈 행을 베이플랜 자리로 채운 값(_isoBlankFilled 의 _sizeFill — 홀수 베이 20' · 짝수 베이 40'). 높이는 아래 SKHU 규칙만 본다.
  if (!iso && c._sizeFill) return c._sizeFill;
  const l = isoToLabel(iso) || '';
  //  ★ 3.31 — **규격은 `isoToLabel` 이 낸 라벨로만 가른다.** 원본 iso 를 정규식으로 재는 것을 그만둔다.
  //    왜 (정본 대조 2026-09-08, STSE 2653E 양하): 자료에 코드 계열이 둘이다 —
  //      ① ISO 6346  `45GP`(둘째 자리 5 = 9'6" 하이큐브) ② 하역사 약식 `40HC`(앞 두 자리가 피트).
  //    종전 `/^4[5-9]/` 는 ①만 잡아 ②의 `40HC`·`40HR` 이 «40'» 칸으로 떨어졌다. 그래서 같은 배인데
  //    선적(45GP)은 HC 칸, 양하(40HC)는 40' 칸에 찍혔다 — 정본은 둘 다 HC 다(SIT 양하 HC 101).
  //    `isoToLabel` 은 두 계열을 이미 한 벌로 정규화한다(45GP → 40HC · 40HR → 40RH · L5G1 → 45HC).
  //  ⚠ `45GP` 는 두 계열에서 뜻이 갈린다 — ISO 6346 이면 40ft 하이큐브(둘째 자리 5), 약식이면 45ft.
  //    실자료는 전부 앞쪽이다(45GP·45RE·45GE 가 정본에서 HC 칸). 그래서 **약식으로 읽는 것은
  //    `20xx`·`40xx` 둘뿐**이고, 그 밖(45·43·L·95…)은 종전 규칙을 그대로 탄다.
  //    실측 반례 `436E` — 정본은 40' 칸이다(9'0"). 라벨만 믿으면 HC 로 잘못 간다.
  //  ⚠ HC 칸은 **40ft 짜리만** 간다(감사 지적 2026-09-08). `20HC`(하이큐 20ft, 실측
  //    ZXJU0130421 — OBWH 세 항차 records)는 앱 확정 규칙대로 20' 칸이다
  //    (ContainerList 1.55-01 «20HC(26xx)도 20피트 칸에»). 길이를 먼저 보고 높이를 나중에 본다.
  if (/^(20|40)[A-Z]{2}$/.test(iso)) {
    if (!iso.startsWith('40')) return '20';
    if (iso === '40OH' || iso === '40HT') return 'HC';   // 4.52: 40HT(40피트 하이큐 오픈탑)도 HC 칸 — 라벨이 40HC 에서 40OT 로 바뀌며 이 예외에서 빠졌었다(감사 지적 2026-10-26)
    // 4.27-01: 40OH = 45U1(40피트 하이큐브 오픈탑) — 검수사 2026-10-15 14:29 «40OH=45U1과 동일» · 라벨(40OT)엔 높이가 없다
    return (l.includes('HC') || l.includes('RH')) ? 'HC' : '40';
  }
  //  3.60-12 (진단 M5): 글자로 시작하는 장비코드(DCHC·DCHE·RF40·FR20 …)는 원본 첫 자리가 길이가 아니다 — 라벨(isoToLabel 이 이제 푼다)로.
  //    종전엔 아래 `/^4/` 에 안 걸려 전부 20' 칸이었다(KBTR 2606E 선적 DCHC 160대).
  //    글자형 41~44(43DC·43RF — 연운항 «4J(40HC=43DC)» · 44GP·44R1)도 라벨로 — 종전 WORKING REPORT 는 HC 로 셌고 이 함수만 40 이었다(3.60-12 감사).
  //    숫자형 43xx(4300·430E·436E)는 아래 종전 규칙 그대로(DXQD 정본 40' — 3.31).
  if ((/^[A-Z]{2}/.test(iso) || /^4[1-4][A-Z]/.test(iso)) && l !== iso && /^(20|40|45)/.test(l)) {
    if (l.startsWith('20')) return '20';
    if (l.startsWith('45')) return '45';
    return (l.includes('HC') || l.includes('RH')) ? 'HC' : '40';
  }
  //  3.60-20 (검수사 2026-09-25 «L2G1 은 HC 로 센다»(수석 방식대로)): TMPZ 2020E 양하 BAPLIE L2G1 47대(BOMU8201057 등)를 실물 마감텔리는 HC 칸에 셌다 —
  //    같은 배 2021E·2022E 는 4500·45G1(40HC) 로 온 같은 부류. ISO 로는 45' 표준높이(L2)지만 마감텔리 규칙은 수석 실물이다. 진짜 45피트(L5G1·L5GP·9500 류)는 그대로 45' 칸.
  if (/^L2/.test(iso)) return 'HC';
  //  4.25-01: L5U0(오픈탑)은 터미널이 45UT(40피트 하이큐브 오픈탑)로 읽는다 — 45U1 과 같은 HC 칸(utils.isTermOtL 한 벌 · 화면·카고플랜과 같은 크기).
  if (isTermOtL(iso)) return 'HC';
  if (l.startsWith('45') || isLen45Iso(iso) || /^9[05]\d\d$/.test(iso)) return '45';
  if (/^4[5-9]/.test(iso)) return 'HC';
  if (/^4/.test(iso)) return '40';
  return '20';
}
//  3.60-21 (검수사 2026-09-25 17:55 «장금은 SKHU 이것은 하이큐 컨테이너에 쓰입니다. 보통 7자리중 앞 3자리가 600번대 이상이면 40피트 하이큐가 되고(SKHU6XXXXXX) 200번대이면 20피트 하이큐가 됩니다(SKHU2XXXXXX)»):
//    장금 SKHU 번호의 앞 세 자리가 600 이상이면 EDI 가 22GP·42G1 로 줘도 40피트 하이큐(HC 칸) — PCSZ 2620E 양하 SKHU9508980·SKHU9552133(EDI 22GP, 실물 HC). 200번대는 20피트 하이큐라 20' 칸 그대로.
//    ⚠ SKHU 로 온 엠티 플랫랙(22PE, 164·284번대 실측)은 600 미만이라 이 규칙에 안 걸린다. SKLU(20' 일반)·SKOU(오픈탑)·SKRU(리퍼)는 그대로.
function _skhuHc(c) {
  const m = /^SKHU(\d{3})\d{4}$/.exec(String(c && c.cn || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
  return !!m && Number(m[1]) >= 600;
}

/** 5자리 UN/LOCODE → 텔리 3자 포트 표기 (KRPTK→PTK, VNHPH→HPH) */
export function port3(code) {
  //  3.60-11 (진단 M9): 리스트의 항구 이름(«SHANGHAI»·«NANTONG»·«PTK02»)을 자르기 전에 정규화 — 종전엔 «ANG»·«NTO»·«K02» 가 마감텔리에 섰다.
  //    다섯 자 코드는 그대로다(normPortCode 가 그대로 돌려준다).
  const s = normPortCode(code);
  return s.length >= 5 ? s.slice(2, 5) : s;
}

const sect = (v, m) => (v && v[m]) || {};
const vals = (o) => Object.values(o || {});

/** ★ 4.15 — **마감텔리에 규격이 빈 행은 EDI·베이플랜 규격으로 채워 센다** (검수사 2026-10-09 §7.8-⑥ · 감사 574 · 3.41).
 *  종전엔 규격이 빈 행이 `_sizeColBase` 마지막 줄(«20»)로 떨어져 20' 칸에 섰다 — KBTR 2606E 양하 ASC 20줄(«45GP90 F» 처럼 무게가 두 자리라
 *  파서가 규격을 못 읽은 줄, 짝수 베이 15 · 홀수 베이 5)이 전부 20' 로 가 미르 «20피트 몇 대» 17 과 마감텔리 37 이 갈렸다.
 *  채우는 순서 ① 같은 컨번호의 EDI 규격 — 이 행의 EDI 원문 칸(iso_edi·ediIso) → 양하·선적 EDI 의 같은 컨번호 행
 *            ② 그 항차에 남아 있는 EDI 원문(raw.edi.text)을 같은 파서로 다시 읽은 같은 컨번호(utils.ediMapFromRaw 한 벌 — 4.15 Fable 판정: 파서가 «45GP90 F» 를 읽게 된 뒤 이미 저장된 빈 규격도 원문 규격으로)
 *            ③ 없으면 베이플랜 자리 — 홀수 베이 20' · 짝수 베이 40'(실은 자리 → 정한 자리 → 계획 자리, effectivePos 한 벌).
 *  채운 행은 `_isoFrom`('edi'·'ediRaw'·'bay')을 남긴다(서류·화면에는 안 찍는다). 컨을 더하거나 빼지 않는다 — 칸만 정한다. 다 없으면 종전 그대로. */
const _rawEdiMapCache = new WeakMap();   // 섹션 객체 하나에 원문을 한 번만 다시 읽는다(빈 규격 행이 있을 때만 부른다)
function _rawEdiMapOf(sec) {
  if (!sec || !sec.raw || typeof sec !== 'object') return null;
  if (!_rawEdiMapCache.has(sec)) { let m = null; try { m = ediMapFromRaw(sec); } catch (e) { console.warn('[마감텔리] EDI 원문 다시 읽기 실패(베이플랜 자리로 대신):', e && e.message); } _rawEdiMapCache.set(sec, m); }
  return _rawEdiMapCache.get(sec);
}
//  4.20 — EDI 행을 컨번호로 찾는다. 키가 곧 컨번호면 그것, 아니면(제작컨 등 비ISO 유닛은 자리표시 키 __SLOT___ 에 cn 이 들어 있다) 행의 cn 으로. 섹션 객체마다 한 번만 훑는다.
const _ediByCnCache = new WeakMap();
function _ediRowOfCn(sec, cn) {
  const em = (sec && sec.ediContainers) || null;
  if (!em || !cn) return null;
  if (em[cn]) return em[cn];
  if (!_ediByCnCache.has(em)) { const m = new Map(); for (const [k, e] of Object.entries(em)) if (e && e.cn && e.cn !== k && !m.has(e.cn)) m.set(e.cn, e); _ediByCnCache.set(em, m); }
  return _ediByCnCache.get(em).get(cn) || null;
}
function _isoBlankFilled(voyage, c) {
  if (!c || String(c.iso || '').trim()) return c;
  let iso = String(c.iso_edi || c.ediIso || '').trim();
  if (!iso && c.cn) {
    for (const m of ['discharge', 'loading']) {
      const e = _ediRowOfCn(sect(voyage, m), c.cn);   // 4.20: 키가 컨번호가 아닌 행(제작컨 __SLOT___)도 그 행의 cn 으로 찾는다
      iso = String((e && e.iso) || '').trim();
      if (iso) break;
    }
  }
  if (iso) return { ...c, iso, _isoFrom: 'edi' };
  if (c.cn) {
    for (const m of ['discharge', 'loading']) {
      const e = (_rawEdiMapOf(sect(voyage, m)) || {})[c.cn];
      iso = String((e && e.iso) || '').trim();
      if (iso) return { ...c, iso, _isoFrom: 'ediRaw' };
    }
  }
  //  4.21: 마감적용(4.39 에 없앰)이 그동안 넣은 제작컨(EDI 없음 · 규격 코드 없음)은 STOWAGE PLAN 칸의 크기(size)로 — R111W SAWTBP004 F45'H → 45' 칸
  if (c._madeUnit && [20, 40, 45].includes(Number(c.size))) return { ...c, _sizeFill: String(Number(c.size)), _isoFrom: 'plan' };
  const b = parseInt(effectivePos(c).bay, 10);
  if (Number.isFinite(b) && b > 0) return { ...c, _sizeFill: b % 2 ? '20' : '40', _isoFrom: 'bay' };
  return c;
}

/** 모드별 평택분 컨 목록 (EDI 기준 + 리스트 병합은 호출부 책임 아님 — EDI가 집계의 진실) */
// V9.57(G6): 선적 평택 판정에 _inList(리스트 등록=평택) 반영 — 화면(BayPlan·카고플랜·별첨)과 동일 규칙.
//   엠티 선적 리스트는 pol이 비거나 목적지로 오염되는데, 종전엔 그 컨들이 마감 텔리에서 통째로 빠졌다.
//   TODO: utils.isPtk(c, mode)가 export되면(팀F 추가 중) 이 인라인을 임포트로 교체.
export function ptkContainers(voyage, mode) {
  const recs = sect(voyage, mode).records || {};
  //  ★ 4.20 (Fable 판정 ④ · 검수사 2026-10-10 00:02 «기본은 세관 … 추가분만 더하면 됩니다»): 양하 모집단 = 평택 양하분 한 벌(utils.ptkDischargeUnitsOf — 세관 목록 + 추가분).
  //    종전엔 EDI 행만 돌아 세관 목록에만 있고 실제로 내린 컨(RZOR R106E CICU9635360 — 완료·터미널 실적 있음)이 빠졌다(189). EDI 행이 있으면 EDI 행(자리표시 키 __SLOT___ 는 그 행의 cn),
  //    없으면 records 행(빈 칸은 버린다) · 그것도 없으면 터미널 실적의 F/E·선사만 — 규격은 아래 _isoBlankFilled 가 EDI·자리에서 채운다. 목록이 없는 배(basis 'edi')는 종전 그대로 EDI POD 평택.
  const _U = mode === 'discharge' ? ptkDischargeUnitsOf(voyage) : null;
  const _useU = !!(_U && _U.basis !== 'edi');
  const _ediMap = sect(voyage, mode).ediContainers || {};
  const _unitRow = (cn) => {
    const e = _ediMap[_U.ediKeyOf.get(cn)] || _ediMap[cn];
    if (e) return e.cn === cn ? e : { ...e, cn };
    const r = recs[cn];
    if (r) return { ...Object.fromEntries(Object.entries(r).filter(([, v]) => v !== '' && v != null)), cn };
    return dischargeUnitBareRow(voyage, cn);
  };
  const edi = _useU ? [..._U.set].map(_unitRow) : vals(_ediMap);
  //  ★ 4.21 (§7.8-⑦ · 마감적용 덱 갈래 — 검수사 2026-10-10 05:32 «수석의 텔리에 있는 자료로 마감을 하기 위한것입니다»): 선적 모집단은 EDI 행 그대로다.
  //    단 수석 마감텔리 STOWAGE PLAN 에만 있어 마감적용(4.21~4.37 · 4.39 에 기능째 없앰 — 남은 지난 항차 기록은 그대로 읽는다)이 리스트 행으로 넣은 제작컨(records `_madeUnit`)은 EDI 가 없어도 센다
  //    («대수엔 들어 가지만 규격엔 없습니다» — RZOR R111W SAWTBP004). 그 밖의 리스트 전용 행은 종전대로 넣지 않는다(아래 «컨을 추가하지 않는다» 원칙).
  if (mode === 'loading') {
    const _have = new Set(edi.map((c) => c && c.cn));
    for (const [cn, r] of Object.entries(recs)) {
      if (r && r._madeUnit === true && isMadeUnitCn(cn) && isListOriginRecord(r) && !_have.has(cn)) edi.push({ ...Object.fromEntries(Object.entries(r).filter(([, v]) => v !== '' && v != null)), cn });
    }
  }
  //  3.31: **배별 선사 별칭은 여기서 한 번만 씌운다** — 컨이 텔리로 들어오는 입구다.
  //    답 함수 안에 세우면 옆길(OS·RF·씰목록)로 들어온 값을 못 막는다(규범 §4-4).
  const _vsl = String(voyage?.info?.vsl || '').toUpperCase();
  const _op = shipOpMapper(_vsl, [...edi.map((c) => c.op), ...Object.values(recs).map((r) => r && r.op)]);
  // TallyOne 1.8: **필드 보강** — records(양하/선적 리스트 + 검수원 입력)의 값을 EDI 컨에 덮는다.
  //   왜: BAPLIE에는 실번호도 리퍼 온도도 없다. 그 둘은 리스트에서 오고 records 에 있다.
  //   화면(VoyagePage 271~/624행)은 진작부터 병합해서 보여 주는데 텔리만 ediContainers 만 읽어서,
  //   RF condition report 의 SEAL NO·Setting 이 **상시 공란**이었다(TNJP 26355E 실측 2026-08-04).
  //   Lug 키 사고(1.3-02)와 같은 계열 — 화면과 텔리가 서로 다른 소스를 보던 문제다.
  //   ⚠ 컨을 **추가하지 않는다**. 필드만 채운다 — 추가하면 Final Work·OS·PORTPERFORMANCE
  //     집계가 통째로 흔들린다. 여기 목적은 빈칸 채우기지 대수 변경이 아니다.
  const merged = edi.map((c0) => {
    const c = _op(c0.op) === c0.op ? c0 : { ...c0, op: _op(c0.op) };
    const r = recs[c.cn];
    if (!r) return c;
    const out = { ...c };
    // 실번호: EDI가 비었거나, EDI 값이 records 값의 앞부분인 잘린 값이면 records 우선(M8.07과 같은 규칙).
    const es = String(c.sl || ''); const rs = String(r.sl || '');
    if (rs && (!es || (rs.length > es.length && rs.startsWith(es)))) out.sl = rs;
    // 리퍼 온도: EDI에 없으면 리스트 값으로.
    if ((c.tmp == null || String(c.tmp).trim() === '') && r.tmp != null && String(r.tmp).trim() !== '') out.tmp = r.tmp;
    // TallyOne 1.8: 리퍼 메모에서 검수원이 확인·수정한 값 — 있으면 그대로 들고 간다.
    if (r.rfSet != null && String(r.rfSet).trim() !== '') out.rfSet = r.rfSet;
    if (r.rfAct != null && String(r.rfAct).trim() !== '') out.rfAct = r.rfAct;
    // 1.8-04: 리퍼드라이·제작컨 표시는 records 에만 있다(수집기 패치·검수원 입력). 텔리가
    //   RF 목록에서 이 둘을 빼려면 여기서 들고 가야 한다 — 안 그러면 EDI에 없어 항상 false 다.
    //  3.52: 세관 «선사부호» 와 EDI 중 고르되 **자식을 부모로 뭉개지 않는다**(utils 한 벌 — pickCarrierOp).
    //  3.66-01: 기준은 그 배 마감텔리 — 세관 이름(CKC 등)은 _op(배별 별칭)이 마감텔리 코드(CKL 등)로 바꾼다.
    if (r.op != null && String(r.op).trim() !== '') out.op = _op(pickCarrierOp(r.op, c.op, _vsl));
    //  3.52-01: **Final Work·OS·PERFORMANCE·SHIFTING·DAMAGE 의 PORT 칸이 여기서 정해진다**(port3(c.pol)).
    //    검수사 «마감텔리랑 같게 수정 바랍니다» · «양하전 마지막 항구가 SHA 맞으니까요» — 되돌아온 화물만 바뀐다.
    if (mode === 'discharge') { const _dp = pickDischargePol(c.pol, r.pol, c.pod); if (_dp !== c.pol) out.pol = _dp; }
    //  3.53: **검수사·수석이 고른 POD 가 EDI 를 이긴다.** 아래 98행 필터가 이 값을 보고 평택분을 가른다 —
    //    즉 이 한 줄이 마감텔리·검수리스트·VGM 의 **대수**를 바꾼다(검수사 «갯수가 변경되어야만 계획과 맞습니다»).
    if (r.pod_pick && r.pod) out.pod = r.pod;
    //  ★ 4.15 (§7.8-⑨ Fable 판정): **검수사가 고른 규격도 EDI 를 이긴다** — pod_pick 과 같은 자리. 규격·리퍼·FR·OT·탱크 표식은 records(fbPickIso)가 쓴 그대로,
    //    규격초과(oog)는 utils.isoPickOog 한 벌(드라이로 골랐으면 없음). 마감텔리 규격 칸(20'·40'·HC)·OS·RF 가 이 값을 센다.
    //  ★ 4.54 (검수사 2026-10-26 19:10 «빈FR4개 짜리 두건이라는거죠?» — ATPR 2647E): 리스트(세관·선사)가 플랫랙으로 표시한 컨(records.fr — 45P1 등)은 EDI 가 45GE 로 줘도 플랫랙이다.
    //    화면 병합(VoyagePage FLAG_FILL)은 이미 false→true 로 올리는데 이 병합만 안 올려, 완료된 SRLU 4대(EDI 45GE · 세관 45P1)가 «빈 FR 묶음» 으로 안 읽혔다(bundleKeyOf 가 c.fr 을 본다).
    //    false→true 승격만(리스트가 EDI 의 true 를 뒤집지 못한다). 고른 규격(iso_pick)이면 아래가 고른 값으로 다시 덮는다. c.fr 을 보는 곳은 bundleKeyOf 하나뿐이라 서류 영향은 묶음 접기뿐이다.
    if (r.fr === true && c.fr !== true) out.fr = true;
    if (r.iso_pick && r.iso) {
      out.iso = r.iso;
      for (const k of ['rf', 'fr', 'ot', 'tk']) if (typeof r[k] === 'boolean') out[k] = r[k];
      out.oog = isoPickOog(r, c.oog);
    }
    if (r.rfdry === true) out.rfdry = true;
    if (r.mkcon === true) out.mkcon = true;
    // TallyOne 1.55: **실적 자리(bay_actual/row_actual/tier_actual)를 들고 온다.**
    //   1.55 부터 `ediContainers.bay/row/tier` 는 선사 계획이고 검수 중 안 바뀐다.
    //   검수원이 지정한 자리는 records 에만 있어서, 이걸 안 들고 오면 아래 RF 위치와
    //   타임시트 베이가 **계획으로 퇴행한다**(실제로 실은 자리가 서류에 안 나온다).
    //   ⚠ 컨을 추가하지 않는다 — 필드만 채운다는 위 원칙 그대로다.
    if (r.bay_actual != null && String(r.bay_actual) !== '') out.bay_actual = r.bay_actual;
    if (r.row_actual != null && String(r.row_actual) !== '') out.row_actual = r.row_actual;
    if (r.tier_actual != null && String(r.tier_actual) !== '') out.tier_actual = r.tier_actual;
    return out;
  });
  //  ★ 3.37(감사 실측) — 마감텔리도 제 목록을 만든다. 특수제작컨 표시를 여기서 찍어야
  //    RF condition report(`buildRF` 의 `!c.rfdry && !c.mkcon`)가 그 컨을 뺀다 —
  //    안 찍으면 **선사로 나가는 종이에** 제작컨이 Setting·Actual 빈칸으로 실린다(규범 §4-4 — 입구에 문지기).
  //  3.70-01: applySpecialMarks 가 수화물(lugg)도 찍게 됐지만 **마감텔리 종이는 바꾸지 않는다** — 페리 집계 Lug 줄은 forecast.mode 가
  //    맞을 때만(buildFerry fcOk, OBWH 2692W 실물 대조) 가른다. 여기서 lugg 를 찍으면 그 게이트가 풀린다(감사 지적) — 제작컨만 찍는다.
  const _specOnly = { info: { forecast: { specialCns: voyage?.info?.forecast?.specialCns || [] } } };
  //  ★ 4.16 (§7.8-①): 시프팅이면 평택분이 아니다 — 문지기 한 벌(isShiftOffPtk). 시프팅은 SHIFTING 시트·Final Work 시프팅 칸에서 따로 센다.
  const _ss = shiftCnSetOf(voyageKeyOf(voyage), voyage);
  //  4.20: 양하(목록 있음)는 평택 판정이 끝났다(유닛 한 벌) — 세관 «최종항» 을 다시 보지 않는다. 시프팅 문지기만 지난다. 추가분·통과 표식은 markDischargeUnit 한 벌.
  return tagBundleDoc(applySpecialMarks(_specOnly, merged.filter(c => (_useU ? true : (mode === 'discharge' ? isPyeongtaekPort(c.pod) : (c._inList || isPyeongtaekPort(c.pol)))) && !isShiftOffPtk(_ss, recs, mode, c.cn)))
    .map((c) => _isoBlankFilled(voyage, _useU ? markDischargeUnit(c, _U) : c)), voyage);   // 4.15 (§7.8-⑥): 규격 빈 행은 EDI·베이플랜 규격으로 — Final Work·OS·RF·PERFORMANCE·DAMAGE·페리가 이 목록을 센다 · 4.55: 마지막에 서류 묶음 키(_bdoc)를 찍는다(서류가 있는 항차만)
}

/** Final Work 매트릭스: {op: {port: {F|E: {20,40,HC,45}}}} — 양하=POL별, 선적=POD별 */
//  3.60-20 (검수사 2026-09-25 «마감텔리는 현재 수석검수사들의 방법 그대로 합니다. 선박별로 비교해서 같게 만들면 됩니다»):
//    실물 Final Work 는 **같은 칸에 겹쳐 실린 엠티 플랫랙 묶음(BUNDLE)을 FULL 1대**로 센다 — ATPR 2632E OS-IN «20'E 8 — FR x 8 (2 BUNDLE)» ↔ Final Work 20'F +2
//    (bay1/01/08 ×4 · bay3/01/08 ×4, 전부 22PE·fr·E). 앱은 컨마다 1대라 20'E 8 로 갈렸다(2633E 도 같은 꼴 8대). OS 시트(buildOS)는 실물처럼 낱개 그대로.
//    묶음 = 같은 자리(bay·row·tier)의 엠티 플랫랙 2대 이상. 혼자면 종전대로 E 1대.
//  bundleFold — 집계용 컨 목록: 같은 자리의 엠티 플랫랙 2대 이상은 «FULL 1대» 가상 컨 하나로 접는다. Final Work 와 Performance 가 같은 목록을 센다(감사: 한 서류 안 두 표가 6대 달랐다).
//    자리 문자열은 정규화해 비교(베이 앞 0 제거 · row/tier 두 자리 — ContainerDetailModal _p2 와 같은 규칙; bay_actual 이 '01' 과 '1' 로 갈리는 사례를 앱이 이미 안다).
//    다른 선사·다른 포트의 엠티 플랫랙은 같은 자리라도 따로 묶는다(실물 근거 없음 — 한 묶음은 한 선사·한 출발지).
//  ★ 4.54 — 묶음 키 한 벌. bundleFold(서류)·emptyFrBundlesOf(화면 «빈 FR 묶음» 설명)·loadedSlotClaims(«한 칸에 두 대» 에서 묶음 빼기)가 이것만 부른다 — 같은 판정을 두 벌로 두지 않는다.
//    묶음 후보 = 엠티(fe 'E') 플랫랙(c.fr · 또는 iso 가 플랫랙 코드) + 자리(bay·row·tier)가 모두 있는 컨. 키 = 선사 · 포트(양하 POL·선적 POD) · 규격 칸 · 정규화한 자리. 후보가 아니면 ''.
const _bp2 = (v) => { const s = String(v == null ? '' : v).trim(); return /^\d+$/.test(s) ? s.padStart(2, '0') : s; };
const _bbay = (v) => { const s = String(v == null ? '' : v).trim(); return /^\d+$/.test(s) ? String(parseInt(s, 10)) : s; };
//  ★ 4.55 — 터미널 «빈 FR 묶음 목록(BUNDLE LIST)» 서류가 있는 항차는 묶음을 서류가 정한다(자리로 짐작하지 않는다). 수집기 MailPilot 2.48 이 항차 폴더의 서류를 읽어 voyages/{키}/bundleList 에 넣는다.
//    검수사 2026-10-26 21:00 «갯수가 4개 묶음이 아닐때에는 이메일이나 다른 문서로 갯수가 기록되어서 올것입니다. 2개 나 3개 묶음 표시로해서....» · 21:09 «재가동보다 정확한 데이터가 더 중요합니다».
//    서류가 있으면 서류 묶음에 든 컨만 묶음이고 나머지는 낱개다(자리가 같아도). 서류가 없는 항차는 4.54 그대로(위 자리 규칙). 서류 판정이 닿는 길 둘 — ① bundleKeyOf 의 셋째 인자(항차) ② ptkContainers 가 컨에 찍은 _bdoc.
//    모양 { groups: [{ no, size, cns: [...] }], _meta: { file, total, groups, at, mailAt } } — RTDB 는 배열을 객체로 줄 수 있어 vals 로 읽는다.
//    ★ 독립 감사(2026-10-26) 수리 — ① 서류는 방향·항차를 가리지 않고 항차 전체에 닿아 «양하 서류가 선적까지 서류 기준으로 바꾸고, 엉뚱한 서류가 자리 규칙을 꺼 버렸다».
//      → 서류는 «이 방향의 컨에 실제로 닿을 때만» 쓴다(bundleDocFor — 이 방향 모집단에 서류 한 묶음의 컨이 2대 이상 있을 때). 아니면 그 방향은 4.54 자리 규칙 그대로.
//      ② 서류 일부가 조용히 줄었다(쉼표로 이은 글·하이픈·공백 컨 번호·10자리 번호) → 모양이 어긋난 서류는 일부만 쓰지 않고 통째로 안 쓴다(자리 규칙으로). _meta.total·groups 와 읽은 수가 다르면 마찬가지.
const _bdocCache = new WeakMap();
const _bdocWhyCache = new WeakMap();   // 서류 객체 → 못 쓰는 이유(''=정상)
const _bcn = (x) => String(x == null ? '' : x).toUpperCase().replace(/[\s-]+/g, '');
export function bundleDocOf(voyage) {
  const bl = voyage && voyage.bundleList;
  if (!bl || typeof bl !== 'object') return null;
  if (_bdocCache.has(bl)) return _bdocCache.get(bl);
  let r = null, bad = '';
  try {
    const byCn = new Map(), groups = [];
    const m0 = bl._meta && typeof bl._meta === 'object' && !Array.isArray(bl._meta) ? bl._meta : {};
    if (Array.isArray(bl)) bad = '서류 모양이 깨짐(묶음 목록이 아니라 배열)';   // 4.55 감사 4차 하-8 — 모양이 깨진 서류도 «서류 없음» 으로 읽지 않고 이유를 말한다
    else if (m0.error) bad = `수집기가 서류를 못 읽음 — ${(typeof m0.error === 'object' ? JSON.stringify(m0.error) : String(m0.error)).slice(0, 80)}`;   // 수집기가 걷어 낸 표시(옛 groups 가 같이 남아 있어도 쓰지 않는다) · 글이 아닌 값도 «[object Object]» 로 안 나온다
    else if (bl.groups != null && typeof bl.groups !== 'object') bad = 'groups 모양이 깨짐(묶음 목록이 아님)';
    if (!bad) vals(bl.groups).forEach((g, i) => {
      if (bad) return;
      if (!g || typeof g !== 'object') { bad = '묶음 항목이 객체가 아님'; return; }
      const gk = `doc|${groups.length}`, cns = [];   // 키 = 서류에서 읽은 순서 번호(서류의 NO 가 겹쳐도 키는 겹치지 않는다)
      for (const x of (typeof g.cns === 'string' ? g.cns.split(/[,;]+/) : vals(g.cns))) {
        const cn = _bcn(x);
        if (!cn) continue;
        if (!/^[A-Z]{4}\d{7}$/.test(cn)) { bad = `컨 번호가 아닌 값 «${String(x).slice(0, 14)}»`; return; }
        if (byCn.has(cn)) { bad = `같은 컨이 두 묶음에 있음 ${cn}`; return; }
        byCn.set(cn, gk);
        cns.push(cn);
      }
      if (!cns.length) { bad = '컨이 없는 묶음'; return; }
      groups.push({ key: gk, no: g.no == null ? String(i + 1) : String(g.no), size: String(g.size || ''), cns });
    });
    const m = bl._meta && typeof bl._meta === 'object' ? bl._meta : {};
    if (!bad && groups.length && m.total != null && Number(m.total) !== byCn.size) bad = `_meta.total ${m.total} ≠ 읽은 ${byCn.size}`;
    if (!bad && groups.length && m.groups != null && Number(m.groups) !== groups.length) bad = `_meta.groups ${m.groups} ≠ 읽은 ${groups.length}`;
    if (bad) console.warn('[묶음 서류] 서류를 쓰지 않습니다(자리로 판정) —', bad);
    else r = groups.length ? { groups, byCn, meta: m, n: byCn.size } : null;   // groups 가 없으면 서류 없음
  } catch (e) { bad = `읽기 실패 ${e && e.message}`; console.warn('[묶음 서류] 읽기 실패(서류 없이 자리로 판정):', e && e.message); r = null; }
  //  서류가 «있는데 못 쓰는» 이유 — 화면이 «묶음 서류를 쓰지 못해 자리로 짐작 중» 으로 밝힌다(독립 감사 2026-10-26: 서류를 거부해도 화면은 서류 없을 때와 똑같았다).
  //  모든 묶음이 한 대뿐인 서류도 쓸모가 없다(터미널 묶음은 2대 이상 — 서류 양식이 다른 듯하다).
  if (!bad && r && r.groups.every((g) => g.cns.length < 2)) { bad = '서류의 묶음이 모두 한 대뿐이라 쓰지 않음(서류 양식 확인)'; r = null; console.warn('[묶음 서류] 서류를 쓰지 않습니다(자리로 판정) —', bad); }
  _bdocWhyCache.set(bl, bad);
  _bdocCache.set(bl, r);
  return r;
}
//  서류가 있는데 못 쓰는 이유(없으면 ''). 서류가 없거나 정상이면 ''.
export function bundleDocWhy(voyage) {
  const bl = voyage && voyage.bundleList;
  if (bl && typeof bl !== 'object') return '서류 모양이 깨짐(객체가 아님)';   // 4.55 감사 4차 하-8 — 글·숫자가 들어와도 «서류 없음» 과 같게 보이지 않는다
  if (!bl) return '';
  bundleDocOf(voyage);
  return _bdocWhyCache.get(bl) || '';
}
//  서류가 있는데 이 방향 목록에 «한 묶음당 1대» 이하로만 걸려 쓰지 못하는 경우의 이유 — 서류는 «이 SKHU 는 앱에 없는 컨 3대와 한 묶음» 이라 하는데 앱이 서류가 있었다는 말도 안 하던 것(독립 감사 3차 중-3).
//  서류의 컨이 이 목록에 1대도 없으면(다른 방향 서류) 조용하다 — 그건 정상이다.
export function bundleDocMiss(voyage, containers) {
  const d = bundleDocOf(voyage);
  if (!d || !Array.isArray(containers) || bundleDocFor(voyage, containers)) return '';
  const have = new Set();
  for (const c of containers) if (c && c.cn) have.add(String(c.cn).toUpperCase());
  let hit = 0;
  for (const cn of d.byCn.keys()) if (have.has(cn)) hit++;
  return hit > 0 ? `서류의 컨 ${hit}대만 이 목록에 있어 묶음으로 맞지 않음(서류 ${d.n}대)` : '';
}
//  서류 출처 한 줄 — 파일명 · 메일 받은 시각(없으면 수집 시각). 오래된 서류인지 화면에서 알아보게 한다(독립 감사 3차 하-5 · 시프팅 목록의 «메일 10-08 17:05(파일명)» 과 같은 근거 규칙).
const _kst = (ms) => { const d = new Date(Number(ms) + 9 * 3600 * 1000); const p2 = (n) => String(n).padStart(2, '0'); return `${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
export function bundleDocSrc(bundles) {
  const d = bundles && bundles.doc;
  if (!d) return '';
  const when = d.mailAt > 0 ? `메일 ${_kst(d.mailAt)}` : d.at > 0 ? `수집 ${_kst(d.at)}` : '';
  return [d.file, when].filter(Boolean).join(' · ');
}
//  서류 기준 «터미널 배정이 몇 대여야 하는가» — 서류가 이 방향에 닿으면 터미널은 서류 묶음 하나를 1대로 센다: 예상 = 앱 − Σ(n−1).
//  off(서류 어긋남) = 서류 묶음 몫 Σ 가 있는데 터미널 수량이 앱과 «똑같을 때» 뿐이다 — 종전(4.54)은 이 경우를 «일치 ✓» 로 덮었다(터미널이 서류 묶음을 낱개로 셈 · 서류가 낡음. 독립 감사 3차 중-4).
//  차이가 0 이 아니면 이미 어긋남으로 보이므로 서류 탓이라 말하지 않는다 — 앱 목록이 덜 들어옴·본선 잔류·수화물·터미널이 더 많음은 서류와 무관하다(독립 감사 4차 중-1: 서류가 맞는데 «서류가 틀렸다» 고 말하던 오경보).
//  서류 기준이 아닌(자리 규칙) 묶음은 짐작이라 이 비교를 하지 않는다.
export function bundleDocExpect(bundles, appN, termN) {
  const b = Array.isArray(bundles) ? bundles : [];
  const why = b.docWhy || '';
  const applied = b.length > 0 && b.every((x) => x && x.src === 'doc');
  const sigma = applied ? b.reduce((a, x) => a + Math.max(0, (Number(x.n) || 0) - 1), 0) : 0;
  const app = Number(appN) || 0, term = Number(termN) || 0;
  const expect = applied ? app - sigma : null;
  return { why, applied, sigma, expect, off: applied && sigma > 0 && term > 0 && app === term };
}
//  서류 기준 어긋남 한 문장 — 화면 툴팁·진단이 같은 글을 쓴다(같은 판정 한 벌).
export function bundleDocOffText(dx, appN, termN) {
  if (!dx || !dx.off) return '';
  return `터미널 묶음 목록(서류) 기준 터미널 배정은 ${dx.expect}대여야 하는데(앱 ${Number(appN) || 0}대 − 서류 묶음 몫 ${dx.sigma}대) 실제 ${Number(termN) || 0}대`;
}
//  이 방향의 컨 모집단(containers)에 서류가 «닿는가» — 서류 한 묶음의 컨이 2대 이상 있으면 닿는다. 닿지 않으면 null(그 방향은 자리 규칙). 서류 하나가 양하·선적 둘 다의 묶음을 싣고 있어도,
//  한 방향만 싣고 있어도 방향마다 따로 판정한다. containers 배열마다 한 번만 센다.
const _bdocForCache = new WeakMap();
export function bundleDocFor(voyage, containers) {
  const d = bundleDocOf(voyage);
  if (!d || !Array.isArray(containers)) return null;
  const m = _bdocForCache.get(containers);
  if (m && m.d === d) return m.r;
  const have = new Set();
  for (const c of containers) if (c && c.cn) have.add(String(c.cn).toUpperCase());
  const r = d.groups.some((g) => { let n = 0; for (const cn of g.cns) if (have.has(cn) && ++n >= 2) return true; return false; }) ? d : null;
  _bdocForCache.set(containers, { d, r });
  return r;
}
//  마감텔리 모집단(ptkContainers)이 컨마다 서류 묶음 키를 찍는다 — bundleFold·buildMatrix 처럼 항차를 안 받는 집계가 서류를 따르게 하는 입구 한 곳. 서류가 닿지 않으면 그대로 돌려준다(복사 없음).
export function tagBundleDoc(containers, voyage) {
  const d = bundleDocFor(voyage, containers);
  if (!d) return containers;
  return containers.map((c) => (c && typeof c === 'object' ? { ...c, _bdoc: d.byCn.get(String(c.cn || '').toUpperCase()) || '' } : c));
}
//  bdoc — bundleDocFor(항차, 컨 목록) 의 결과(서류가 이 방향에 닿을 때만 있다). 없으면 ptkContainers 가 찍은 _bdoc → 그것도 없으면 4.54 자리 규칙.
export function bundleKeyOf(c, mode, bdoc) {
  if (bdoc) return (c && bdoc.byCn.get(String(c.cn || '').toUpperCase())) || '';
  if (c && c._bdoc !== undefined) return c._bdoc;   // 4.55: ptkContainers 가 서류 묶음 키(없으면 '' = 낱개)를 찍어 둔 컨
  if (!(c && c.fe === 'E' && (c.fr || isFlatRackIso(c.iso)))) return '';
  const p = effectivePos(c);
  if (!(p && p.bay && p.row && p.tier)) return '';
  const op = String(c.op || '').toUpperCase().trim() || '???';
  const port = port3(mode === 'discharge' ? c.pol : c.pod) || '???';
  return [op, port, tallySizeCol(c), _bbay(p.bay), _bp2(p.row), _bp2(p.tier)].join('|');
}
export function bundleFold(containers, mode) {
  const out = [];
  const bundles = {};
  for (const c of containers) {
    const k = bundleKeyOf(c, mode);
    if (k) { (bundles[k] ??= []).push(c); continue; }
    out.push(c);
  }
  for (const arr of Object.values(bundles)) {
    if (arr.length >= 2) out.push({ ...arr[0], fe: 'F', _bundle: arr.map((x) => x.cn), _bundleN: arr.length });
    else out.push(...arr);
  }
  return out;
}
//  ★ 4.54 — 빈 FR 묶음 목록(화면·진단 설명용). 같은 키 2대 이상 = 한 묶음. 반환 [{ key, n, cns, op, port, sz, pos: 'BB-RR-TT' }] — 서류(bundleFold)와 같은 묶음이다.
//    검수사 2026-10-26 19:14 «4개 한묶음 2개로 그래야 양쪽 갯수가 맞는거고 알림을 붉은색으로 보여줄 필요도 없는것입니다» · 19:17 «검수리스트는 182개가 맞는거고 동방은 176(+6)으로 표기하고 FR묶음 설명을 붙이면 됩니다»(282·276 의 오타로 읽음).
//    컨 대수(검수 리스트 · 진행 숫자)는 낱개 그대로다 — 이 목록은 «터미널이 묶음을 1대로 센다» 는 설명에만 쓴다.
export function emptyFrBundlesOf(containers, mode, voyage) {
  const g = new Map();
  const doc = voyage ? bundleDocFor(voyage, containers) : null;   // 서류가 이 방향 컨에 닿을 때만(아니면 자리 규칙)
  for (const c of (containers || [])) {
    const k = bundleKeyOf(c, mode, doc);
    if (!k) continue;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(c);
  }
  const have = doc ? new Set((containers || []).map((c) => String((c && c.cn) || '').toUpperCase())) : null;
  //  서류는 닿는데 앱 목록에 없는 컨(서류 묶음이 한 대라도 보이는 묶음만) — 한 대만 보여 묶음으로 안 잡히는 묶음의 빠진 컨도 센다.
  const docMissing = doc ? doc.groups.flatMap((dg) => { const n = dg.cns.filter((cn) => have.has(cn)).length; return n >= 1 && n < dg.cns.length ? dg.cns.filter((cn) => !have.has(cn)) : []; }) : [];
  const out = [];
  for (const [key, arr] of g) {
    if (arr.length < 2) continue;
    if (key.startsWith('doc|')) {
      //  ★ 4.55 — 서류 묶음. 선사·항구·규격·자리는 첫 컨 값(서류는 컨 번호만 준다) · 자리가 없으면 «자리 미상». mixed = 묶음 안에서 선사·항구·규격·자리가 갈리거나 엠티가 아닌 컨이 섞임(서류와 앱 자료가 어긋난 신호) ·
      //    missing = 서류에는 있는데 앱 목록에 없는 컨. src 'doc' = 서류 기준(화면이 «터미널 묶음 서류 기준» 으로 밝힌다).
      const dg = doc && doc.groups.find((x) => x.key === key);
      const f = (c) => { const p = effectivePos(c) || {}; return { op: String(c.op || '').toUpperCase().trim() || '???', port: port3(mode === 'discharge' ? c.pol : c.pod) || '???', sz: tallySizeCol(c), pos: p.bay && p.row && p.tier ? `${_bp2(_bbay(p.bay))}-${_bp2(p.row)}-${_bp2(p.tier)}` : '' }; };
      const a0 = f(arr[0]), sigs = new Set(arr.map((c) => { const x = f(c); return [x.op, x.port, x.sz].join('|'); }));   // 자리가 아직 없는 컨은 «자리가 다르다» 로 치지 않는다(자리 있는 컨끼리만 비교)
      const poss = new Set(arr.map(f).map((x) => x.pos).filter(Boolean));
      const posOf = arr.map(f).find((x) => x.pos);
      out.push({ key, n: arr.length, cns: arr.map((x) => x.cn), op: a0.op, port: a0.port, sz: a0.sz, pos: posOf ? posOf.pos : '자리 미상', src: 'doc', no: dg ? dg.no : '', docN: dg ? dg.cns.length : arr.length,
        missing: dg && have ? dg.cns.filter((cn) => !have.has(cn)) : [], mixed: sigs.size > 1 || poss.size > 1 || arr.some((c) => c.fe !== 'E' || !(c.fr || isFlatRackIso(c.iso))), dm: docMissing.length });
      continue;
    }
    const [op, port, sz, bay, row, tier] = key.split('|');
    out.push({ key, n: arr.length, cns: arr.map((x) => x.cn), op, port, sz, pos: `${_bp2(bay)}-${row}-${tier}`, src: 'pos' });
  }
  out.sort((a, b) => a.pos.localeCompare(b.pos));
  out.doc = doc ? { missing: docMissing, groups: doc.groups.length, file: String((doc.meta && doc.meta.file) || ''), mailAt: Number(doc.meta && doc.meta.mailAt) || 0, at: Number(doc.meta && doc.meta.at) || 0 } : null;   // 서류 기준 방향이면 서류 쪽 어긋남(빠진 컨)을 묶음이 0곳이어도 알린다
  return out;
}
//  ★ 4.55 — 묶음이 서류 기준이면 그 사실과 서류·앱이 어긋난 곳을 한 줄로(진단·툴팁이 같은 말을 쓴다). 자리 규칙 묶음이면 ''.
export function bundleDocNote(bundles) {
  const d = (bundles || []).filter((b) => b && b.src === 'doc');
  if (!d.length) return bundles && bundles.docWhy ? `묶음 서류를 쓰지 못해 자리로 짐작 중(${bundles.docWhy})` : '';   // 서류가 있는데 못 쓰는 경우 — 조용히 자리 규칙으로 돌아가지 않는다
  const miss = Math.max(0, ...d.map((b) => Number(b.dm) || 0)), mixed = d.filter((b) => b.mixed).length;   // dm = 서류에는 있는데 앱 목록에 없는 컨(묶음마다 같은 서류 전체 수)
  const _src = bundleDocSrc(bundles);
  return '터미널 묶음 목록(서류) 기준' + (_src ? `(${_src})` : '') + (miss ? ` · 서류에는 있는데 앱 목록에 없는 컨 ${miss}대` : '') + (mixed ? ` · 한 묶음 안에 자리·규격이 다르거나 엠티 플랫랙이 아닌 컨이 섞인 곳 ${mixed}곳` : '');
}
//  묶음이 설명하는 차이 — 묶음 하나는 «통째로» (n−1)대만큼만 차이를 낸다(4대 묶음 = 3대). 차이(앞 − 터미널)가 묶음 몫의 합과 맞아떨어질 때만 설명으로 센다:
//    gap 이하로 만들 수 있는 가장 큰 부분합. (예 4대 묶음 둘 — 차이 0·3·6 이면 설명 · 1·2 는 0 · 4·5 는 3 · 8 은 6.) 독립 감사 2026-10-26 «차이 1·2·4·5대를 풀린 것처럼 덮는다» 수리.
//    sourceRecon(진단)과 홈 카드(frBundleOf)가 이 한 벌을 쓴다.
export function bundleExplainOf(bundles, gap) {
  const g = Math.floor(Number(gap) || 0);
  if (!(g > 0) || !Array.isArray(bundles) || !bundles.length) return 0;
  //  서류 기준(src 'doc') 묶음은 확정이다 — 터미널이 서류대로 센다면 차이에는 묶음 몫의 합 Σ(n−1) 전체가 들어 있다. 부분합으로 일부만 풀지 않는다:
  //    차이 ≥ Σ 이면 Σ 만큼만 설명하고 나머지(차이 − Σ)는 그대로 경고 쪽(본선 잔류·수화물·터미널이 모르는 컨)에 남긴다 · 차이 < Σ 이면 0(서류와 터미널 숫자가 다르다는 뜻이라 덮지 않는다).
  //    독립 감사 2026-10-26 «서류에 4대 묶음 둘인데 배정 279(차이 3)를 부분합이 정상으로 덮는다» · 감사 4차 중-1 «본선 잔류 2대·수화물이 낀 차이 8·9 에서 서류 몫 6 이 사라져 «터미널이 모르는 8대» 로 과대하다».
  if (bundles.every((b) => b && b.src === 'doc')) { const sg = bundles.reduce((a, b) => a + Math.max(0, (Number(b.n) || 0) - 1), 0); return sg > 0 && sg <= g ? sg : 0; }
  const reach = new Set([0]);
  for (const b of bundles) {
    const w = (Number(b && b.n) || 0) - 1;
    if (!(w > 0)) continue;
    for (const t of [...reach]) if (t + w <= g) reach.add(t + w);
  }
  return Math.max(...reach);
}
//  마감텔리 모집단(ptkContainers) 위의 묶음 목록 — 항차·방향마다 한 번만(항차 객체가 바뀌면 다시). 홈 카드·진단이 같이 쓴다.
const _frBundleCache = new WeakMap();
export function frBundlesOf(voyage, mode) {
  if (!voyage || typeof voyage !== 'object') return [];
  const sec = voyage[mode];
  if (!sec || typeof sec !== 'object') return [];
  let m = _frBundleCache.get(sec);
  if (!m || m.v !== voyage || m.bl !== voyage.bundleList) { m = { v: voyage, bl: voyage.bundleList, r: null }; _frBundleCache.set(sec, m); }   // 4.55: 묶음 서류가 바뀌면 다시
  if (!m.r) {
    try {
      const cs = ptkContainers(voyage, mode);
      m.r = emptyFrBundlesOf(cs, mode, voyage);
      //  서류가 있는데 못 쓰는 이유(거부 · 이 방향 목록에 한 묶음당 1대 이하로만 걸림) — 묶음이 0곳이어도 화면·진단이 «자리로 짐작 중» 을 밝힌다. 이 방향 컨이 없으면 말할 것이 없다.
      m.r.docWhy = cs.length ? (bundleDocWhy(voyage) || bundleDocMiss(voyage, cs)) : '';
    } catch (e) { console.warn('[빈 FR 묶음] 판정 실패(설명 없이 진행):', e && e.message); m.r = []; m.r.docWhy = ''; }
  }
  return m.r;
}
//  번들 요약 — 실물 Final Work Remarks «* 20'FR E x 8 ( 2 BUNDLE ) → 20'F x 2 CALCULATION» · OS 비고 «FR x 8 ( 2 BUNDLE )». 검수사 2026-09-25 «보통은 4개 한묶음인데 2개 이상만 묶여 있으면 풀 1개로 칩니다. 물론 위치는 같아야 합니다».
export function bundleSummary(containers, mode) {
  const bySz = {};
  const byOp = {};
  for (const v of bundleFold(containers, mode)) {
    if (!v || !v._bundleN) continue;
    const sz = tallySizeCol(v); const szL = sz === '20' ? "20'" : sz === '45' ? "45'" : sz === 'HC' ? 'HC' : "40'";
    (bySz[szL] ??= { cn: 0, bundles: 0 }); bySz[szL].cn += v._bundleN; bySz[szL].bundles += 1;
    const op = String(v.op || '').toUpperCase().trim() || '???';
    (byOp[op] ??= { cn: 0, bundles: 0 }); byOp[op].cn += v._bundleN; byOp[op].bundles += 1;
  }
  const lines = Object.entries(bySz).map(([szL, o]) => `* ${szL}FR E x ${o.cn} ( ${o.bundles} BUNDLE ) → ${szL}F x ${o.bundles} CALCULATION`);
  return { lines, byOp };
}
export function buildMatrix(containers, mode) {
  const mat = {};
  for (const c of bundleFold(containers, mode)) {
    const op = String(c.op || '').toUpperCase().trim() || '???';
    const port = port3(mode === 'discharge' ? c.pol : c.pod) || '???';
    const fe = c.fe === 'E' ? 'E' : 'F';
    const sz = tallySizeCol(c);
    ((((mat[op] ??= {})[port] ??= {})[fe] ??= {}))[sz] = ((mat[op][port][fe] || {})[sz] || 0) + 1;
  }
  return mat;
}

/** 매트릭스 → 사전 순서대로 행 배열 [{op, port, fe, sizes:{}}]. 사전에 없는 op/port는 뒤에. */
export function matrixRows(matDis, matLoad, matShift, fmt) {
  const ops = new Set([...Object.keys(matDis), ...Object.keys(matLoad), ...Object.keys(matShift)]);
  //  3.31: 자식 선사(CSC·DSL 등)는 **부모 이름으로 묶어 정렬**하고, 부모 안에서는 사전 순서를 지킨다.
  //    실물 Final Work — OPERATOR 칸은 «DWS» 한 번, PORT 칸이 «(CSC) TAO» · «(DSL) TAO» 로 갈린다
  //    (정본 실측 STSE 2653E&2654W · STMJ 2639E&2640W · TMPZ 는 «TJM» 아래 «(DWS)» · «(MAS)»).
  const opList = [...ops].sort((a, b) =>
    orderIndex(fmt.ops, opParent(fmt, a)) - orderIndex(fmt.ops, opParent(fmt, b)) ||
    subIndex(fmt, a) - subIndex(fmt, b) || a.localeCompare(b));
  const rows = [];
  for (const op of opList) {
    const parent = opParent(fmt, op);
    const isSub = parent !== op;
    const ports = new Set([
      ...Object.keys(matDis[op] || {}), ...Object.keys(matLoad[op] || {}), ...Object.keys(matShift[op] || {})]);
    const portList = [...ports].sort((a, b) => orderIndex(fmt.ports, a) - orderIndex(fmt.ports, b) || a.localeCompare(b));
    for (const port of portList) {
      for (const fe of ['F', 'E']) {
        rows.push({
          //  ⚠ `op`·`port` 는 **원래 값 그대로** 둔다 — 엑셀 변형 양식(TMPZ)이 `pairRows` 의
          //    «자식|항구» 로 행을 찾기 때문이다(tallyExcel `fillVariantFinalWork`). 여기서 라벨을
          //    박아 버리면 그 배 Final Work 가 행을 못 찾아 숫자를 통째로 버린다(감사 실측 4행).
          //    표에 찍는 글자는 `opLabel`·`portLabel` 로 따로 낸다.
          op, port, fe,
          opLabel: parent, portLabel: isSub ? `(${op}) ${port}` : port,
          subOp: isSub ? op : '', parentOp: parent,
          dis: (matDis[op]?.[port]?.[fe]) || {},
          load: (matLoad[op]?.[port]?.[fe]) || {},
          shift: (matShift[op]?.[port]?.[fe]) || {},
        });
      }
    }
  }
  return rows;
}

function sumMat(mat, fe) {
  const t = { 20: 0, 40: 0, HC: 0, 45: 0 };
  for (const ports of Object.values(mat))
    for (const fes of Object.values(ports))
      for (const sz of SIZE_COLS) t[sz] += (fes[fe] || {})[sz] || 0;
  return t;
}
const matTotal = (mat) => SIZE_COLS.reduce((a, s) => a + sumMat(mat, 'F')[s] + sumMat(mat, 'E')[s], 0);

/** OS(과부족) 시트 데이터 — 포트×규격×F/E: manifested vs worked + 누락/초과 */
export function buildOS(containers, compMap, mode, fmt) {
  const g = {};
  let extra = 0;
  for (const c of containers) {
    const port = port3(mode === 'discharge' ? c.pol : c.pod) || '???';
    const sz = tallySizeCol(c);
    const szLbl = sz === '20' ? "20'" : sz === '45' ? "45'" : sz === '40' ? "40'" : 'HC';
    const fe = c.fe === 'E' ? 'EMPTY' : 'FULL';
    const k = `${port}|${szLbl}|${fe}`;
    g[k] ??= { port, size: szLbl, fe, manifested: 0, worked: 0, short: 0, rf: 0, rh: 0, dg: 0 };
    g[k].manifested++;
    const comp = compMap ? compMap[c.cn] : null;
    const missing = comp && comp.flag === 'missing';
    if (comp && !missing) g[k].worked++;
    if (missing) g[k].short++;
    //  3.60-10 (진단 M6): 리퍼는 utils 한 벌 — 옛 `^45[38]` 은 4583·4584(플랫랙)까지 리퍼로 셌고, 숫자 리퍼 2230 은 rf 표식 없으면 놓쳤다.
    //  ★ 4.15-01 (검수사 2026-10-09 15:37·15:39 «풀리퍼랑 합산 하면 안됨» · «리퍼=2»): FULL 줄의 RF·RH 는 풀 리퍼(isFullReefer)만,
    //    EMPTY 줄의 RF·RH 는 그 엠티 줄 안의 리퍼 엠티(isEmptyReefer) — 줄이 F/E 로 갈려 있어 합산되지 않는다(엠티 구분 표기).
    const isRf = fe === 'EMPTY' ? isEmptyReefer(c) : isFullReefer(c);
    if (isRf) (sz === 'HC' || sz === '45' ? g[k].rh++ : g[k].rf++);
    if (c.dg) g[k].dg++;
  }
  for (const comp of vals(compMap || {})) if (comp && comp.flag === 'extra') extra++;
  //  3.60-20: 행 비고 «FR x 8 ( 2 BUNDLE )» — 실물 OS-IN 은 그 줄(port·size·EMPTY)에 묶음 수를 적는다. 대수(manifested)는 낱개 그대로.
  for (const v of bundleFold(containers, mode)) {
    if (!v || !v._bundleN) continue;
    const sz = tallySizeCol(v); const szLbl = sz === '20' ? "20'" : sz === '45' ? "45'" : sz === '40' ? "40'" : 'HC';
    const k = `${port3(mode === 'discharge' ? v.pol : v.pod) || '???'}|${szLbl}|EMPTY`;
    if (g[k]) { g[k].frb = (g[k].frb || 0) + v._bundleN; g[k].frbN = (g[k].frbN || 0) + 1; }
  }
  const rows = Object.values(g).sort((a, b) =>
    orderIndex(fmt.ports, a.port) - orderIndex(fmt.ports, b.port) ||
    a.size.localeCompare(b.size) || (a.fe === 'FULL' ? -1 : 1));
  // 선사별 규격 요약(REMARKS 줄) — "SKR : 20'F x 11 , 40'F x 58 ( RH x 2 )"
  const byOp = {};
  for (const c of containers) {
    const op = String(c.op || '').toUpperCase().trim() || '???';
    const sz = tallySizeCol(c);
    const fe = c.fe === 'E' ? 'E' : 'F';
    byOp[op] ??= {};
    const k = `${sz === '20' ? "20'" : sz === '45' ? "45'" : "40'"}${fe}`;
    byOp[op][k] = (byOp[op][k] || 0) + 1;
    //  4.15-01: 선사 줄 «( RH x N )» 는 F·E 를 한 줄에 모으므로 풀 리퍼만 센다(풀리퍼랑 합산 금지). 엠티 리퍼는 위 EMPTY 줄의 «RH x N» 이 이미 구분한다 —
    //    선사 서류에 없던 영문 표현을 새로 짓지 않는다(규범 §11 · Fable 판정 2026-10-09).
    if (isFullReefer(c)) byOp[op]._rh = (byOp[op]._rh || 0) + 1;   // 3.60-10: 리퍼 한 벌
    if (c.dg) byOp[op]._dg = (byOp[op]._dg || 0) + 1;
  }
  const _bs = bundleSummary(containers, mode).byOp;   // 3.60-20: 실물 OS 비고 «FR x 8 ( 2 BUNDLE )»
  const remarks = Object.entries(byOp)
    .sort((a, b) => orderIndex(fmt.ops, opParent(fmt, a[0])) - orderIndex(fmt.ops, opParent(fmt, b[0]))
      || subIndex(fmt, a[0]) - subIndex(fmt, b[0]) || a[0].localeCompare(b[0]))
    .map(([op, o]) => {
      const parts = Object.entries(o).filter(([k]) => !k.startsWith('_'))
        .map(([k, n]) => `${k} x ${n}`);
      const tags = [];
      if (o._rh) tags.push(`RH x ${o._rh}`);
      if (o._dg) tags.push(`DG x ${o._dg}`);
      if (_bs[op]) tags.push(`FR x ${_bs[op].cn} ( ${_bs[op].bundles} BUNDLE )`);
      return `${op} : ${parts.join(' , ')}${tags.length ? ` ( ${tags.join(' , ')} )` : ''}`;
    });
  return { rows, extra, remarks };
}

/** Act. Cntr-Seal(실번호 상이) — sl_orig ≠ sl 또는 리씰 */
export function buildSealList(voyage, mode) {
  const recs = vals(sect(voyage, mode).records);
  //  3.31: 이 시트는 ptkContainers 를 안 지나므로 별칭을 여기서 따로 씌운다 —
  //    안 그러면 같은 워크북 안에서 Final Work 는 «DSL·WDG», 이 시트는 «DWS·WDF» 가 된다(감사 실측).
  const _op = shipOpMapper(String(voyage?.info?.vsl || '').toUpperCase(),
    [...recs.map((r) => r && r.op), ...vals(sect(voyage, mode).ediContainers).map((c) => c && c.op)]);
  //  3.52: 이 시트는 records 만 돈다 — 세관이 뭉쳐 준 op 를 그대로 쓰면 Final Work 는 «(CSC)» 인데
  //    여기는 «DSL» 이 되어 **한 워크북 안에서 선사가 두 벌**이 된다(위 3.31 주석이 금지한 바로 그것).
  //    그래서 EDI 의 짝을 찾아 «더 자세한 쪽» 을 고른다(utils 한 벌).
  const _ediMap = sect(voyage, mode).ediContainers || {};
  const _vslS = String(voyage?.info?.vsl || '').toUpperCase();
  const out = [];
  for (const r of recs) {
    const orig = String(r.sl_orig || '').trim();
    const act = String(r.sl || '').trim();
    const reseal = String(r.reseal || '').trim();
    //  ★ 4.20 감사(Fable 판정 중-4): **제작컨 행만** — 원래 값(sl_orig)이 실번호(sl)의 잘린 앞부분이면 같은 씰이다(상이 아님 · ptkContainers 의 «잘린 값» 규칙과 같은 벌).
    //    RZOR R106E SAWTBP004 — 세관 셀 «LF102335LF102350LF10»(잘림) vs «LF102335LF102350LF102345LF102336». 일반 컨은 손대지 않는다.
    const mu = isMadeUnitCn(r.cn);
    //  ★ 4.49 — 실번호 상이는 실오류 판정 한 벌(utils.sealCheckOf — 검수원이 고친 기록이 있고 실물이 알려진 실 어느 것과도 다를 때 · 신고 끝자리 잘림은 안 고쳐도 실오류).
    //    제작컨의 «잘린 앞부분이면 같은 씰»(4.20)은 이어 붙은 씰 가르기(splitJoinedSeals)로 그 판정 안에 들었다. 종전엔 고친 기록 없이 sl_orig ≠ sl 로 셌다(RZOR SAWTBP 10항차).
    const _k = sealCheckOf(r, (_ediMap[r.cn] && _ediMap[r.cn].sl) || '');
    if (_k.error || reseal) {
      const _sl = (x) => (mu ? splitJoinedSeals(x).join(' ') : x);   // 4.20: 제작컨은 세관 셀에 붙어 온 씰을 전부 갈라 적는다
      const _col = tallySizeCol(_isoBlankFilled(voyage, r));
      out.push({
        cn: r.cn, manifestSeal: _sl(_k.error ? _k.from : (orig || act)), size: (mu && _col === '45') ? "45'" : _col === '20' ? "20'" : "40'",   // 4.15 (§7.8-⑥): 리스트 규격이 비면 같은 컨번호의 EDI·베이플랜 규격 · 4.20 감사: 제작컨은 45' 칸 그대로(SAWTBP L5G1)
        actualSeal: _k.error ? _sl(_k.actual || act) : '',
        reseal, remarks: _op(pickCarrierOp(r.op, _ediMap[r.cn] && _ediMap[r.cn].op, _vslS)),
        fe: r.fe === 'E' ? 'EMPTY' : 'FULL',
      });
    }
  }
  return out;
}

/** RF condition — 리퍼 목록.
 *  TallyOne 1.8: Setting/Actual 을 나눈다.
 *    setting = 검수원이 리퍼 메모에서 확인한 실제 셋팅온도(rfSet). 없으면 EDI·리스트 온도(tmp).
 *    actual  = 실제 측정 온도(rfAct). 확인 전에는 **빈칸으로 둔다** — tmp로 채우면
 *              재보지도 않은 값이 '실측'으로 서류에 박힌다.
 */
export function buildRF(containers) {
  const t = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '');
  return containers
    // TallyOne 1.8-04: 리퍼드라이(넌플러그)·제작컨은 **온도를 잴 수 없다**. 종전엔 이 둘이 그대로
    //   RF condition report 에 실려 Setting·Actual 이 영영 빈칸으로 남았다(서류 오류).
    //   지침서 5-5 "리퍼드라이=넌플러그, 제작컨=컨 자체가 상품 — 온도 경고 제외"와 같은 기준으로 맞춘다.
    //   리퍼 메모 화면·상단 버튼·출항 임박 경고도 전부 이 식이다(네 곳 일치, 시뮬 검증).
    .filter(c => !c.rfdry && !c.mkcon)
    .filter(c => isFullReefer(c))   // 3.60-10 (진단 M6): 리퍼 한 벌 — 4583·4584(FR)가 RF condition 에 실리던 것 · 4.15-01: 온도 확인 대상인 풀 리퍼만(엠티 리퍼는 안 싣는다 — 미르 «RF in·out» 도 같은 수)
    .map(c => ({
      cn: c.cn, seal: c.sl || '', size: tallySizeCol(c) === '20' ? "20'RF" : "40'RH",
      // TallyOne 1.55: **최종 선적 위치**다 — 계획이 아니라 실제로 실은 자리.
      //   effectivePos 는 실적(bay_actual) 이 있으면 그것을, 없으면 계획을 돌려준다.
      //   창고에 있는 컨은 자리가 없으니 빈칸이 맞다(배에 없는 자리를 서류에 적지 않는다).
      loc: (() => { const p = effectivePos(c); return [p.bay, p.row, p.tier].filter(Boolean).join('/'); })(),
      setting: t(c.rfSet) || t(c.tmp),
      //  3.25: 「세팅온도 채우기」로 **베낀 값**(rfSrc:'list')은 잰 값이 아니다 — 서류의 Actual 로 안 나간다.
      //    안 그러면 선사로 가는 RF condition report 에 «재지도 않은 실측»이 찍힌다(감사 지적 2026-09-07).
      actual: (c.rfSrc === 'list') ? '' : t(c.rfAct),
      op: String(c.op || '').toUpperCase(),
      fe: c.fe === 'E' ? 'E' : 'F',
      dg: !!c.dg,   // V9.21: 페리 RF REMARKS(DG) 표기용
    }));
}

/** V9.21: 페리(여객선) 집계 — 규격군(20 vs 40/HC/45) × F/E × 수화물(Lug) × 주간/야간.
 *  주야 분해: 완료 시각(completed[cn].at) 기준 07~17시=주간, 그 외=야간. 미완료는 총계에만.
 *  Lug: voyage.info.forecast(수화물 예보, V9.03)의 luggageCns 목록 — 모드 일치 시에만.
 *  TallyOne 1.4: 읽는 키를 fc.lugg -> fc.luggageCns 로 교정. 저장 경로(HomePage.jsx fbUpdateVoyageInfo)는
 *    처음부터 luggageCns 로 저장했고, lugg 를 저장하는 코드는 저장소 어디에도 없었다. 그래서 Lug 4행 x IN/OUT
 *    8칸과 PORTPERFORMANCE flug/elug 열이 상시 공란이었다. 구 데이터 호환을 위해 lugg 도 폴백으로 읽는다.
 *    (실물 대조: OBWH 2692W 20ft Empty 41->40, 20ft Empty(Lug) 0->1) */
export function buildFerry(voyage, disCs, loadCs) {
  const fc = voyage?.info?.forecast || null;
  const luggSet = new Set();
  const luggList = fc && (Array.isArray(fc.luggageCns) ? fc.luggageCns
    : (Array.isArray(fc.lugg) ? fc.lugg : null));
  if (luggList) for (const cn of luggList) luggSet.add(String(cn).toUpperCase());
  const zone = (voyage, mode, cs) => {
    const comp = sect(voyage, mode).completed || {};
    const recs = sect(voyage, mode).records || {};
    const mk = () => ({ total: 0, day: 0, night: 0 });
    const z = { f20: mk(), e20: mk(), f20lug: mk(), e20lug: mk(), f40: mk(), e40: mk(), f40lug: mk(), e40lug: mk(),
                pp: { f20: 0, f40: 0, fhc: 0, flug: 0, e20: 0, e40: 0, ehc: 0, elug: 0 }, total: mk(),
                // TallyOne 1.4: OBWH OS 시트는 20'(LUG) 행이 따로 있다(TNJP엔 없음) — LUG 버킷 신설.
                os: { '20F': { n: 0, hc: 0, rh: 0, dg: 0, port: '' }, '20E': { n: 0, hc: 0, rh: 0, dg: 0, port: '' },
                      '40F': { n: 0, hc: 0, rh: 0, dg: 0, port: '' }, '40E': { n: 0, hc: 0, rh: 0, dg: 0, port: '' },
                      '45F': { n: 0, hc: 0, rh: 0, dg: 0, port: '' }, '45E': { n: 0, hc: 0, rh: 0, dg: 0, port: '' },
                      '20LUGF': { n: 0, hc: 0, rh: 0, dg: 0, port: '' }, '20LUGE': { n: 0, hc: 0, rh: 0, dg: 0, port: '' },
                      '40LUGF': { n: 0, hc: 0, rh: 0, dg: 0, port: '' }, '40LUGE': { n: 0, hc: 0, rh: 0, dg: 0, port: '' } } };
    const fcOk = fc && fc.mode === mode;
    // V9.21-04: 일괄 마감 감지 — 완료 시각이 좁은 구간에 뭉치면(30분 내 20대+) 실제 작업시각이 아니다
    //   (26353 실측: 마감 일괄처리로 256대 전부 새벽 01시 → 주0/야256 오분해). 이때 주/야는 수기(빈칸).
    const ats = cs.map((c) => comp[c.cn]?.at || comp[String(c.cn).toUpperCase()]?.at).filter(Boolean);
    let bulkClose = false;
    if (ats.length >= 20) {
      const mn = Math.min(...ats), mx = Math.max(...ats);
      bulkClose = (mx - mn) < 30 * 60 * 1000;
    }
    for (const c of cs) {
      const sz = tallySizeCol(c);
      const g20 = sz === '20';
      const fe = c.fe === 'E' ? 'e' : 'f';
      // TallyOne 1.4: 두 소스 병합 — ① 리스트(CLL) 자동 판별로 컨에 직접 선 플래그 ② 카톡 예보 luggageCns.
      //   리스트가 진실에 가깝지만(선사 원본), 리스트가 없는 항차도 있으므로 OR로 둔다.
      const lug = c.lugg === true || (fcOk && luggSet.has(String(c.cn).toUpperCase()));
      const key = `${fe}${g20 ? '20' : '40'}${lug ? 'lug' : ''}`;
      const e = z[key]; e.total += 1; z.total.total += 1;
      const at = comp[c.cn]?.at || comp[String(c.cn).toUpperCase()]?.at;
      if (at && !bulkClose) {
        const h = new Date(at).getHours();
        const day = h >= 7 && h < 17;
        e[day ? 'day' : 'night'] += 1; z.total[day ? 'day' : 'night'] += 1;
      }
      // PORTPERFORMANCE: 20/40/40HC 분리 (45·HC → 40HC), Lug는 별도 열.
      //   LYG EDI는 40군을 43xx로 통칭 — 40일반/HC 구분은 선사 리스트 ISO가 진실(26353W 실측: 42GE 20대).
      //   43=HC는 연운항 관례일 뿐 전역 아님(DXQD 실물은 4300을 40'로 집계 — V9.21 실측 충돌) → 페리 전용 분류.
      const isoEff = String((recs[c.cn] || recs[String(c.cn).toUpperCase()] || {}).iso || c.iso || '').toUpperCase();
      const pcls = /^2/.test(isoEff) ? '20' : (/^4[3-9]|^L|^9[05]/.test(isoEff) ? 'hc' : '40');
      const pk = lug ? `${fe}lug` : (pcls === '20' ? `${fe}20` : (pcls === '40' ? `${fe}40` : `${fe}hc`));
      z.pp[pk] += 1;
      // OS(페리): 길이 3단(20/40/45 — 4x는 43·45Gx 포함 전부 40', L5/9x만 45') + HC/RH/DG 분해 (수석 실물 규칙)
      const oLen = /^2/.test(isoEff) ? '20' : ((isLen45Iso(isoEff) || /^9[05]/.test(isoEff)) ? '45' : '40');   // 4.25-01: L5U0(오픈탑)은 40'(utils.isLen45Iso 한 벌)
      // TallyOne 1.4: 수화물(Lug)은 전용 행으로 뺀다. LUG 버킷이 없는 규격(45')은 일반 행으로 폴백.
      const oKey = (lug && z.os[`${oLen}LUG${fe.toUpperCase()}`]) ? `${oLen}LUG${fe.toUpperCase()}` : `${oLen}${fe.toUpperCase()}`;
      const oe = z.os[oKey];
      oe.n += 1;
      //  3.60-10: 리스트 확정 규격(isoEff)도 리퍼 한 벌로 · 4.15-01: F 줄은 풀 리퍼만, E 줄은 그 엠티 줄의 리퍼 엠티(풀리퍼랑 합산 금지)
      const _rfC = { ...c, iso: isoEff };
      const isRf = fe === 'e' ? isEmptyReefer(_rfC) : isFullReefer(_rfC);
      if (isRf) oe.rh += 1;
      // TallyOne 1.4: 20' 하이큐브(26xx 등 높이코드 5~9)가 어느 분기에도 안 걸려 hc 미집계였다
      //   (2697E 실측: ZXJU0130463 ISO 2600 → 실물 REMARKS ' HC x 1' 인데 재현은 공란).
      //   ^228 = 연태훼리 자사 벌크컨(CLL Tp/Sz=BC20). 같은 박스가 항차에 따라 2600/2280으로 코딩되는데
      //     실물 텔리는 둘 다 HC로 계상한다(ZXJU0130463: 2697E=2600, 2692W=2280 — 실측).
      //   ^2[5-9]가 아니라 ^2[56]으로 좁힌다 — ISO 6346 2번째 자리 8=4'3", 9=<4'는 반높이라 HC가 아니다.
      else if (/^4[3-9]|^L|^9[05]|^2[56]|^228/.test(isoEff)) oe.hc += 1;   // 하이큐브 드라이
      if (c.dg) oe.dg += 1;
      if (!oe.port) oe.port = port3(mode === 'discharge' ? c.pol : c.pod) || '';
    }
    return z;
  };
  return { inb: zone(voyage, 'discharge', disCs), outb: zone(voyage, 'loading', loadCs) };
}

/** Performance — 선사별 IN/OUT × F/E × 규격 */
export function buildPerformance(disCs, loadCs, fmt) {
  const agg = (cs, mode) => {
    const m = {};
    for (const c of bundleFold(cs, mode)) {   // 3.60-20: Final Work 와 같은 목록(엠티 플랫랙 번들 = FULL 1대 — 실물 Performance 도 216)
      const op = String(c.op || '').toUpperCase().trim() || '???';
      const fe = c.fe === 'E' ? 'E' : 'F';
      ((m[op] ??= { F: {}, E: {} })[fe])[tallySizeCol(c)] = (m[op][fe][tallySizeCol(c)] || 0) + 1;
    }
    return m;
  };
  const inb = agg(disCs, 'discharge'), outb = agg(loadCs, 'loading');
  const ops = [...new Set([...Object.keys(inb), ...Object.keys(outb)])]
    .sort((a, b) => orderIndex(fmt.ops, opParent(fmt, a)) - orderIndex(fmt.ops, opParent(fmt, b))
      || subIndex(fmt, a) - subIndex(fmt, b) || a.localeCompare(b));
  return { inbound: inb, outbound: outb, ops };
}

/** SHIFTING 행 — ★ 4.16 (판 B · 4.15 기준표 §3-B «R12 곁가지» 수리).
 *  시프팅 지도는 {컨번호: {from, to, _iso, _fe, _doc}} 꼴이다(utils.restowMapFromDoc · computeShiftingMap). 종전엔 Object.values(map) 로 s.cn·s.iso·s.fe·s.oldPos 를
 *  읽어 컨번호·규격·자리가 통째로 빈칸이었다 — Final Work 시프팅 칸이 «??? · ??? · F · HC» 로 섰다(MCAP 639N 5행 · MCAT 635N 14행).
 *  행은 항차 화면 시프팅 목록·검수 리스트 [별첨2] 와 같은 utils.shiftingListOf 한 벌(양하 ∪ 선적 EDI 원문 — 양하 자리가 정본).
 *  선사·무게·POD·POL 은 양하 EDI → 선적 EDI → 선사 RESTOW 서류 순. **PORT(POD) = EDI POD, 없으면 서류 POD**(Fable 판정 ⑦). 규격 칸은 tallySizeCol 한 벌.
 *  NEW POSN 은 실제로 다시 실은 자리(3.65 실제 칸 — 검수원·터미널)가 있으면 그것, 없으면 계획 자리(서류·선적 EDI), 제자리 재적재면 같은 자리. */
export function buildShifting(voyage) {
  let map = {};
  try { map = computeShiftingMapCached(voyageKeyOf(voyage) || 'k', voyage) || {}; } catch { /* 계산 실패 시 빈 목록 */ }
  if (!Object.keys(map).length) return [];
  const dE = _rawEdiMapOf(sect(voyage, 'discharge')) || sect(voyage, 'discharge').ediContainers || {};
  const lE = _rawEdiMapOf(sect(voyage, 'loading')) || sect(voyage, 'loading').ediContainers || {};
  const doc = (voyage && voyage.restowList) || {};
  const rows = shiftingListOf(map, { ...lE, ...dE }, voyage);
  const pick = (cn, k) => { for (const src of [dE[cn], lE[cn], doc[cn]]) { const v = src && src[k]; if (v != null && String(v).trim() !== '') return v; } return ''; };
  //  3.31: 시프팅도 같은 벌 — 안 씌우면 SHIFTING 시트와 Final Work 의 시프팅 칸이 옛 코드로 갈린다.
  const _op = shipOpMapper(String(voyage?.info?.vsl || '').toUpperCase(), rows.map((r) => pick(r.cn, 'op')));
  return rows.map((r, i) => {
    const iso = String(r.iso || pick(r.cn, 'iso') || pick(r.cn, 'sztp') || '').trim();
    const sz = iso ? tallySizeCol({ iso, cn: r.cn }) : '';
    const fe = String(r.fe || pick(r.cn, 'fe') || '').toUpperCase() === 'E' ? 'E' : 'F';
    return {
      no: i + 1, cn: r.cn, type: sz ? (sz === '20' ? "20'" : "40'") : '', sz,
      fe, wt: pick(r.cn, 'wt') || '', op: _op(String(pick(r.cn, 'op') || '').toUpperCase()),
      oldPos: fmtShiftPos(r.from), newPos: fmtShiftPos(r.act || r.to || (r.same ? r.from : '')),
      pod: port3(pick(r.cn, 'pod')), pol: port3(pick(r.cn, 'pol')),
    };
  });
}

/** Time Sheet — 작업 보고 이력에서 시각록 구성 */
/**
 * TallyOne 1.8-16: **닫았는데 보고가 없는 커버를 추론해 넣는다.**
 *
 *  검수사 확정 2026-08-05
 *    "기본 선적은 홀드 다 채우고 데크를 채웁니다. 6번 해치를 닫고 14번도 닫았으면
 *     10번은 닫았다는 보고가 없습니다. 그런데 앱상에서 10번 데크 컨테이너가 실렸습니다.
 *     이럴땐 아 10번이 닫혔구나. 그런데 앱은 시간을 모릅니다. 단 6번과 14번 사이라는 것은
 *     예상할 수 있습니다. 그럼 보고서엔 **시간만 빼고 기록**합니다. 수기로 나중에 시간 기록을
 *     할 수 있게" · "그건 찾을 필요가 없습니다. **완료처리 했다는게 중요** 합니다."
 *
 *  즉 데크 적재를 일일이 뒤질 필요가 없다. **그 모드가 완료 처리됐다는 것 자체가 근거다** —
 *  커버를 안 닫으면 데크에 못 싣고, 못 실으면 완료가 안 된다.
 *
 *  ⚠ 시각은 **지어내지 않는다.** 앞뒤 클로즈 사이에 놓아 순서만 맞추고 시각 칸은 비운다.
 *    수석이 나중에 수기로 채운다. `inferred:true` 로 표시해 호출부가 구분할 수 있게 한다.
 *  실증(STMJ 2643E): 오픈된 슬롯 2·6·10·14·18·26 중 클로즈 보고가 없는 것은 10(09&11) 하나.
 *    검수사 확인 — "최검수사의 실수로 서류 정리 때도 보고 누락 이야기가 나왔다".
 */
export function buildTimeSheet(reports, opts = {}) {
  const rows = [];
  const list = vals(reports || {}).filter((r) => r && r.ts).sort((a, b) => a.ts - b.ts);
  const t = (ms) => new Date(ms).toTimeString().slice(0, 5);
  const groupOf = typeof opts.groupOf === 'function' ? opts.groupOf : null;
  const doneModes = new Set(opts.doneModes || []);   // 'discharge' | 'loading'

  // 베이는 두 자리로 맞춘다 — 앱은 `9,11`, 손으로 친 카톡은 `09,10,11` 로 와서
  // 같은 커버가 서로 다르게 찍혔다(검수사 지적 2026-08-05).
  const bayStr = (b) => (Array.isArray(b) ? b : [b]).filter(Boolean)
    .map((x) => String(x).trim().padStart(2, '0')).join(',');
  const modeOf = (r) => {
    const act = String(r.action || '');
    return act.startsWith('discharge') ? 'discharge'
      : act.startsWith('loading') ? 'loading' : (r.mode || '');
  };
  const BLANK = '        HRS';                       // 시각 미상 — 수기로 채운다

  // ── 0) 카톡이 정본 ─────────────────────────────────────────────
  // 검수사 확정 2026-08-05.
  //   해치커버는 카톡 작업방에 손으로 보고한 것이 실제다. 앱은 그걸 **모르는 상태**로
  //   "이 커버를 여세요" 라고 단정했고, 사람은 앱이 시키는 대로 눌렀다. STMJ 2643E 실측 —
  //   자동 모드가 낸 해치 보고 네 건이 전부 오보다.
  //     00:51 `13,14,15` · 00:52 `09,10,11`  이미 22:47·23:15 에 카톡으로 열린 커버
  //     03:05 `14`                            03:01 에 카톡으로 닫은 커버
  //     08:19 `05,06,07` · 08:20 `01,03`      03:17·02:28 에 카톡으로 닫은 커버
  //   검수사: "실제 연시간은 22:47 입니다. 00:51 은 텔리 테스트 하기위해 제가 앱기록을 한것입니다.
  //           그런데 자동으로 테스트를 할려고 하니 14번커버를 안열었다고 열어야 한다는것입니다."
  //
  // 그래서 **카톡 기록이 있는 그룹은 카톡만으로 상태를 정한다.** 그 그룹의 앱 보고는 메아리다.
  //   ⚠ 카톡 기록이 **없는** 그룹은 손대지 않는다 — 앱 보고가 유일한 진실이다(BAY 26·18).
  //   ⚠ 조용히 버리지 않는다 — 몇 줄 뺐는지 `_echo` 로 돌려준다.
  let echoDropped = 0;
  const keep = new Set(list);
  if (groupOf) {
    const kakaoGroups = new Set();
    for (const r of list) {
      if (r.type !== 'hatch' || r._src !== 'kakao') continue;
      for (const g of (r.bays || []).map(groupOf)) if (g != null) kakaoGroups.add(g);
    }
    if (kakaoGroups.size) {
      for (const r of list) {
        if (r.type !== 'hatch' || r._src === 'kakao') continue;
        const gs = (r.bays || []).map(groupOf).filter((g) => g != null);
        if (gs.length && gs.every((g) => kakaoGroups.has(g))) { keep.delete(r); echoDropped += 1; }
      }
    }
  }

  // ── 1) 중복 접기 ───────────────────────────────────────────────
  // 같은 보고가 앱에서 한 번, 손으로 친 카톡에서 또 한 번 들어온다(검수사 확정: "앱이 보낸것과
  // 수동으로 보낸것과 섞여 있어 그렇습니다"). **지우는 게 아니라 접는다** — 판단 기준은 상태다.
  //   해치: 사이에 반대 동작 없이 같은 그룹이 또 열리면(또는 또 닫히면) 같은 사건이다.
  //   상태: 사이에 다른 상태 없이 COMMENCED 가 또 오면 같은 사건이다. 먼저 온 것을 남긴다.
  const hatchState = new Map();     // 그룹 → 'open' | 'close'
  const stLast = new Map();         // 모드 → 마지막 상태 낱말
  let lastTs = 0;
  let dupHatch = 0, dupSt = 0;

  for (const r of list) {
    if (!keep.has(r)) continue;
    lastTs = r.ts;
    if (r.type === 'work_status') {
      const md = modeOf(r);
      const modeLbl = md === 'discharge' ? "DISCH'G" : 'LOADING';
      const act = String(r.action || '');
      const word = /_start$|^start$/.test(act) ? 'COMMENCED'
        : /_pause$|^stop$/.test(act) ? 'SUSPENDED'
        : /_resume$|^resume$/.test(act) ? 'RESUMED'
        : /_done$|^complete$/.test(act) ? 'COMPLETED' : '';
      if (!word) continue;
      if (stLast.get(md) === word) { dupSt += 1; continue; }
      stLast.set(md, word);
      const extra = (word === 'SUSPENDED' && r.reason) ? ` (${r.reason})` : '';
      rows.push({ ts: r.ts, time: `${t(r.ts)}    HRS`, remark: `${word} ${modeLbl}${extra}` });
    } else if (r.type === 'hatch') {
      const act = String(r.action || '').toLowerCase();
      const gs = groupOf ? [...new Set((r.bays || []).map(groupOf).filter((g) => g != null))] : [];
      if (gs.length && gs.every((g) => hatchState.get(g) === act)) { dupHatch += 1; continue; }
      for (const g of gs) hatchState.set(g, act);
      //  3.49: 자동 판정 기록(auto)은 앱이 알아챈 시각(ts)이 아니라 사건 시각(eventTs = 터미널 실적 공백 첫머리)으로 적는다. 사람이 누른 보고는 종전대로 ts.
      const _hts = hatchReportTs(r);   // 3.49: 자동 기록은 공백 첫머리(eventTs)가 사건 시각 — utils 한 벌
      rows.push({ ts: _hts, time: `${t(_hts)}    HRS`,
        remark: `HATCH COVER ${act.toUpperCase()}${r.bays ? ` (BAY ${bayStr(r.bays)})` : ''}` });
    }
  }

  // ── 2) 완료 처리 = 커버는 닫혔다 ───────────────────────────────
  // 검수사 확정 2026-08-05: "완료처리 했다는게 중요 합니다."
  //   커버를 안 닫으면 데크에 못 싣고, 못 실으면 완료가 안 된다.
  //   ⚠ **마지막 상태**로 판단한다 — 닫았다가 아침에 다시 연 커버가 있다(STMJ 03:05 BAY 14,
  //     08:19 BAY 05,06,07, 08:20 BAY 01,03). 종전엔 '한 번이라도 닫혔으면 끝'으로 봐서
  //     이 셋을 통째로 놓쳤다.
  //   시각은 지어내지 않는다 — 순서만 맞추고 칸은 비운다.
  if (groupOf && doneModes.size) {
    const openG = new Map();                 // 그룹 → 마지막 오픈 보고
    for (const r of list) {
      if (!r || r.type !== 'hatch' || !keep.has(r)) continue;
      if (r.mode && !doneModes.has(r.mode)) continue;
      const act = String(r.action || '').toLowerCase();
      for (const g of (r.bays || []).map(groupOf).filter((x) => x != null)) {
        // 닫힌 뒤 **처음** 열린 보고를 잡는다 — 접힌 중복이 아니라 실제로 시트에 찍힌 줄과
        // 같은 베이 표기를 쓰기 위해서다(BAY 09,11 로 열었는데 닫힘만 09,10,11 로 나오면 안 된다).
        if (act === 'open') { if (!openG.has(g)) openG.set(g, r); }
        else if (act === 'close') openG.delete(g);
      }
    }
    let n = 0;
    for (const r of openG.values()) {
      rows.push({ ts: lastTs + (++n), inferred: true, time: BLANK,
        remark: `HATCH COVER CLOSE (BAY ${bayStr(r.bays)})   ※ 시각 미기록` });
    }
    // 완료 처리됐는데 COMPLETED 줄이 없는 모드도 같은 이치다 — 시각만 비운다.
    for (const md of doneModes) {
      if (stLast.get(md) === 'COMPLETED') continue;
      if (!stLast.has(md)) continue;         // 아예 시작 기록도 없으면 손대지 않는다
      rows.push({ ts: lastTs + 100, inferred: true, time: BLANK,
        remark: `COMPLETED ${md === 'discharge' ? "DISCH'G" : 'LOADING'}   ※ 시각 미기록` });
    }
  }

  rows.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  if (dupHatch || dupSt) rows._folded = dupHatch + dupSt;   // 화면에 몇 줄 접었는지 알린다
  if (echoDropped) rows._echo = echoDropped;               // 카톡과 어긋나 뺀 앱 보고 수
  return rows;
}

/** 부위 표기 — 실물 서류 관례. 오라클은 2639E 실물 문구
 *  (`R/SIDE TOP RAIL 1 POINT PUSHED IN ( 60 x 30 x 10 )` · `L/SIDE PANEL 1 POINT DENTED ( 80 x 120 x 20 )`).
 *  앱 코드값(DAMAGE_PARTS)은 화면용이라 서류 표기와 다르다 — 여기서만 바꾼다. */
const DMG_PART_LABEL = {
  'ROOF': 'TOP PANEL', 'FLOOR': 'FLOOR',
  'LEFT SIDE': 'L/SIDE PANEL', 'RIGHT SIDE': 'R/SIDE PANEL',
  'FRONT END': 'FRONT PANEL', 'BACK END/DOOR': 'REAR DOOR',
  'DOOR HANDLE': 'DOOR HANDLE', 'DOOR LATCH': 'DOOR LATCH', 'DOOR HINGE': 'DOOR HINGE',
  'DOOR GASKET': 'DOOR GASKET', 'CORNER POST': 'CORNER POST', 'LOCK ROD': 'LOCK ROD', 'SEAL': 'SEAL',
};

/** CARGO DAMAGE REPORT (DM-IN·DM-OUT) + 개별 손상보고서(DAMAGE-EACH·DAMAGE REPORT).
 *  TallyOne 1.10: 손상은 예전부터 `voyages/{key}/photos` 에 정상 기록되고 있었는데
 *    텔리가 그 노드를 한 번도 읽지 않아 서류가 늘 비어 있었다(검수사 신고 2026-08-05, STMJ 2643E).
 *    `reports` 는 타임시트용이고 손상은 `photos` 에 있다 — 소스가 다르다.
 *  같은 컨의 같은 자리·같은 종류는 **사진만 여러 장**이므로 한 건으로 묶는다
 *    (실측: SKHU6312247 이 07:21·07:22·07:29 세 장, 전부 LEFT SIDE DENTED).
 */
export function buildDamage(voyage, disCs, loadCs) {
  const norm = (x) => String(x || '').toUpperCase().replace(/\s/g, '');
  const byCn = new Map();
  for (const c of [...disCs, ...loadCs]) if (c?.cn) byCn.set(norm(c.cn), c);
  const disSet = new Set(disCs.map((c) => norm(c.cn)));
  const loadSet = new Set(loadCs.map((c) => norm(c.cn)));
  const seen = new Set();
  const out = { dmIn: [], dmOut: [] };
  const list = vals({ ...(voyage?.photoIndex || {}), ...(voyage?.photos || {}) })   // 3.61: 색인(메타)으로도 — 사진 본체는 photos/{항차} 에
    .filter((p) => p && p.type === 'damage' && p.cn)
    .sort((a, b) => (a.ts || 0) - (b.ts || 0));
  for (const p of list) {
    const cn = norm(p.cn);
    const types = (Array.isArray(p.damageTypes) ? p.damageTypes : []).filter(Boolean);
    const parts = (Array.isArray(p.damageParts) ? p.damageParts : []).filter(Boolean);
    const key = `${cn}|${parts.join(',')}|${types.join(',')}`;
    if (seen.has(key)) continue;                 // 같은 자리·같은 종류 = 사진만 여러 장
    seen.add(key);
    // 방향: 컨이 어느 쪽에 있는지가 먼저. photos.mode 는 'unknown' 으로 오는 경우가 많다(실측).
    const isLoad = loadSet.has(cn) ? true : disSet.has(cn) ? false : (p.mode === 'loading');
    const c = byCn.get(cn) || {};
    const sz = tallySizeCol(c);
    const szLbl = sz === '20' ? "20'" : sz === '45' ? "45'" : sz === '40' ? "40'" : "40'";
    const fe = c.fe === 'E' ? 'EMPTY' : 'FULL';
    const partTxt = parts.map((x) => DMG_PART_LABEL[x] || x).join(' & ');
    const ptTxt = p.points ? `${p.points} POINT` : '';
    const dimTxt = String(p.dims || '').trim() ? `( ${String(p.dims).trim()} )` : '';
    const exception = [partTxt, ptTxt, types.join(' & '), dimTxt, String(p.note || '').trim()]
      .filter(Boolean).join(' ');
    const row = {
      cn: c.cn || p.cn,
      port: port3(isLoad ? c.pod : c.pol) || '???',
      op: String(c.op || '').toUpperCase(),
      contents: `${szLbl} ${fe} CONT'R`,
      pkgs: 1, kind: 'VAN',
      exception,
      seal: c._madeUnit ? splitJoinedSeals(c.sl || c.sl_orig).join(' ') : String(c.sl || c.sl_orig || '').trim(),   // 4.20: 제작컨은 씰 전부
      fe, size: szLbl, ts: p.ts || 0,
    };
    (isLoad ? out.dmOut : out.dmIn).push(row);
  }
  return out;
}

/** 전체 집계 — voyage 하나로 모든 시트 데이터 생성 */
export function computeTallyData(voyage) {
  const info = voyage?.info || {};
  const code = String(info.vsl || '').toUpperCase();
  const fmt = getTallyFormat(code) || { ops: [], ports: [], damage: null, shifting: true, performance: true, _unknown: true };
  const disCs = ptkContainers(voyage, 'discharge');
  const loadCs = ptkContainers(voyage, 'loading');
  const shiftRows = buildShifting(voyage);
  // 1.55: 베이 짝 사전 재료 — 계획 좌표(컨 원본) + 실적 좌표(effectivePos). 한 벌로 만들어 아래에서 쓴다.
  const _bayPairBase = [...disCs, ...loadCs];
  const bayPairSrc = [..._bayPairBase,
    ..._bayPairBase.map((c) => { const p = effectivePos(c); return p.bay ? { bay: p.bay } : null; })
                   .filter(Boolean)];
  const matDis = buildMatrix(disCs, 'discharge');
  const matLoad = buildMatrix(loadCs, 'loading');
  // 쉬프팅 매트릭스: op×POD 기준 (실측: DJCT SHIFT 열 = 20' 자리)
  const matShift = {};
  for (const s of shiftRows) {
    const op = s.op || '???'; const port = s.pod || '???';
    const fe = s.fe === 'E' ? 'E' : 'F';
    const sz = s.sz || (s.type === "20'" ? '20' : 'HC');   // 4.16: 규격 칸은 tallySizeCol 한 벌(buildShifting 이 sz 를 싣는다) — 종전 «20' 아니면 HC» 는 40' 일반도 HC 로 셌다
    ((((matShift[op] ??= {})[port] ??= {})[fe] ??= {}))[sz] = ((matShift[op][port][fe] || {})[sz] || 0) + 1;
  }
  return {
    fmt, code,
    ferry: buildFerry(voyage, disCs, loadCs),   // V9.21: 여객선(TNJP) 바우처용 — 타선박도 무해(집계만)
    vslFull: info.vslFull || info.vsl || '',
    voyD: info.voy_d || '', voyL: info.voy_l || '',
    pier: info.pier || '', berth: info.berth || '',
    date: new Date(),
    rows: matrixRows(matDis, matLoad, matShift, fmt),
    totals: {
      //  4.15-01: rfE — 엠티 중 리퍼 엠티(isEmptyReefer). 미르 마감텔리 수치가 «엠티 N(일반 · 리퍼 엠티)» 로 구분한다(리퍼 수에는 안 더한다).
      dis: { F: sumMat(matDis, 'F'), E: sumMat(matDis, 'E'), n: matTotal(matDis), rfE: disCs.filter(isEmptyReefer).length },
      load: { F: sumMat(matLoad, 'F'), E: sumMat(matLoad, 'E'), n: matTotal(matLoad), rfE: loadCs.filter(isEmptyReefer).length },
      shift: { F: sumMat(matShift, 'F'), E: sumMat(matShift, 'E'), n: matTotal(matShift) },
    },
    bundleNotes: { dis: bundleSummary(disCs, 'discharge').lines, load: bundleSummary(loadCs, 'loading').lines },   // 3.60-20: Final Work Remarks
    osIn: buildOS(disCs, sect(voyage, 'discharge').completed, 'discharge', fmt),
    osOut: buildOS(loadCs, sect(voyage, 'loading').completed, 'loading', fmt),
    sealIn: buildSealList(voyage, 'discharge'),
    sealOut: buildSealList(voyage, 'loading'),
    rfIn: buildRF(disCs), rfOut: buildRF(loadCs),
    damage: buildDamage(voyage, disCs, loadCs),   // TallyOne 1.10: photos → DM-IN/DM-OUT·DAMAGE 시트
    perf: buildPerformance(disCs, loadCs, fmt),
    shifting: shiftRows,
    // 1.8-16: 완료 처리된 모드에서 **닫았는데 보고가 없는 커버**를 시각 없이 채운다.
    //   베이 짝 사전은 양하·선적 컨을 다 넣어야 온전하다(한쪽만 보면 홀수 짝을 못 찾는다).
    timeSheet: buildTimeSheet(voyage?.reports, {
      // TallyOne 1.55: 짝 사전은 **실제로 작업한 베이**까지 알아야 한다.
      //   계획 좌표만 넣으면, 계획에 없던 칸에 실제로 실은 베이가 짝 사전에서 빠져
      //   그 베이의 해치 보고가 엉뚱한 그룹으로 묶인다. 계획 ∪ 실적으로 넣는다(둘 다 자리다).
      groupOf: (b) => bayGroupCenter(b, getBayPairs(bayPairSrc, info.imo || '', info.vsl || '')),
      doneModes: [
        ...(info.dischargeDone || info.inspectorDone ? ['discharge'] : []),
        ...(info.loadingDone || info.inspectorDone ? ['loading'] : []),
      ],
    }),
  };
}
