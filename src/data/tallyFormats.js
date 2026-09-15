// 선박별 마감 텔리(DEP.TALLY REPORT) 양식 사전 — V9.19 (2026-07-28)
//   근거: 실물 마감 텔리 233개 분석 (C:\TALLYTEST\마감텔리_양식_카탈로그_2026-07-28.md).
//   ⚠ 선사 순서·포트 순서는 배마다 고정 — 임의 정렬 금지 (사용자 확정: "표기 방법과 순서가 일정해야").
//   여기 없는 선박은 defaultFormat(데이터에서 나온 순서대로)로 생성하되 화면에 '순서 미확정' 경고.

// ─── 3.31 (김명보 부장 메모 2026-09-08 «선적 dws ==csc dsl로 구분») ─────────────────
//   실물 마감텔리 Final Work 를 다시 읽어 두 가지가 드러났다(정본 코퍼스 22건 대조).
//   ① **부모 선사 아래 자식이 있다.** STSE·STMJ 는 OPERATOR 칸이 «DWS» 한 번이고 그 아래
//      PORT 칸이 «(CSC) TAO» · «(DSL) TAO» 두 줄로 갈린다. TMPZ 는 «TJM» 아래 «(DWS)» · «(MAS)».
//      → subOps 로 적는다. 사전에 DWS 자리가 아예 없어서 종전엔 «순서 미확정»으로 맨 뒤에 밀렸다.
//   ② **같은 세 글자가 배마다 다른 선사다.** XTPG·DXQD 정본은 DWS·WDF 를 그대로 쓰고,
//      STSE·STMJ 정본은 그 자리에 DSL·WDG 를 쓴다. 그래서 공용 변환표가 아니라 배별 opAlias 다.
//      선적 자료는 CSC 만 따로 오고 나머지가 DWS 로 뭉쳐 오는데, 그 나머지가 곧 DSL 이다
//      (실측 STSE_2653E 선적 20대 → 정본 CSC 8 + DSL 12 · 2665E·2669E 는 CLL 파일이 CSC 를 갈라 줌).
//   ⚠ opAlias 의 키는 «컨테이너의 op», subOps 의 키는 «표에 찍는 부모 이름»이다. 이름이 겹쳐도
//     서로 다른 자리다.
//   ⛔ **근거 없이 가르지 않는다**(`opAliasNeeds` — 감사 지적 2026-09-08). 선적 자료는 선사별 CLL
//     파일이 CSC 를 따로 주고 나머지를 DWS 로 뭉쳐 준다. CSC 가 한 대라도 있으면 CLL 이 온 것이니
//     남는 DWS 는 DSL 이다. **CSC 가 하나도 없으면 CLL 이 안 온 것이라 가를 근거가 없다** —
//     그때는 DWS 그대로 둔다. 실측 STSE 2653E 선적 20대는 정본이 CSC 8 + DSL 12 인데 자료에
//     그 구분이 없다. 그것을 «DSL 20» 으로 적으면 8대가 아무 표식 없이 틀린 줄에 실린다.
//     WDF → WDG 는 순수한 이름 바꿈이라 조건이 없다(정본 대조 9/9).
// ─── 3.51-02 (김명보 부장 메모 2026-09-15 «TMPZ 양하 SOC는 TJM으로 바꾸시오») ──────────
//   **SOC 는 선사 코드가 아니다.** Shipper's Own Container(화주 소유 컨) 표식이다.
//   TMPZ 2027E 양하 EDI 원문 실측 — 5대가 `NAD+CA+SOC:172:20`, 나머지 260대는 `NAD+CA+TJM`.
//   선사가 운송인(CA) 칸에 선사 코드 대신 소유 구분을 적어 보낸 것이라 파서는 원문대로 읽었다
//   (파서 버그가 아니다 — 원문을 고치면 수집기가 다시 덮는다. 그래서 «그 배의 정본 코드로 읽는» 별칭이다).
//   근거 셋 — ① 그 5대의 B/L 접두가 `TMSH…` 로 TJM 260대와 같은 계열이다(EAS 는 `EAST/EASS/EASP`).
//                 검산법 — RTDB `voyages/TMPZ_2027E/discharge/records/{cn}/bl` 을 GET 해 접두 3~4자를 세면 된다
//                 (컨 접두 `PKEU` 는 선사 접두가 아니라 오히려 화주 소유를 뒷받침한다).
//            ② 이 사전의 TMPZ.ops 에 SOC 가 없다(실물 마감텔리 233건 분석분)
//            ③ 실제로 Final Work 맨 뒤에 «SOC / SHA / F — HC 5» 라는 없어야 할 줄이 서 있었다.
//   `opAliasNeeds` 는 걸지 않는다 — DWS→DSL 은 «둘 중 어느 쪽인지 가를 근거»가 필요했지만,
//   SOC 는 애초에 선사가 아니라서 가를 것이 없다(WDF→WDG 와 같은 계열의 순수한 이름 바꿈).
//   ⚠ 다른 배에서 SOC 가 나온 적은 아직 없다 — 2026-09-15 기준 RTDB `voyages` 에 살아 있는 전 항차의
//     양하·선적 `ediContainers.op` 를 훑어 SOC 는 TMPZ_2027E 양하 5건이 전부였다(2차 시뮬도 같은 결과).
//     ⇒ 공용 변환표가 아니라 **TMPZ 배별**로 둔다. 다른 배에서 나오면 그 배 사전에 따로 적는다.
//   ⚠ 이 별칭은 **사본에만** 씌운다 — 보관소 `ediContainers` 와 선적 EDI 내보내기(`NAD+CA+`)는 원문 SOC 그대로다
//     (원문을 고치면 수집기가 다음 사이클에 되돌린다. 화면·표만 그 배 정본 코드로 읽는 것이 맞다).
// 시트 변형: damage = 'each'(DAMAGE-EACH) | 'report'(DAMAGE REPORT) | null
//            shifting = SHIFTING 시트 포함 여부(쉬프팅 있을 때만 렌더)
//            performance = Performance 시트 여부
export const TALLY_FORMATS = {
  ATPR: { ops: ['SKR'], ports: ['DLC', 'WEI'], damage: null, shifting: false, performance: true },
  PCSZ: { ops: ['SKR', 'EAS'], ports: ['SHA'], damage: null, shifting: false, performance: true },
  DXQD: { ops: ['DWS', 'EAS'], ports: ['DLC'], damage: 'report', shifting: false, performance: true },
  TMPZ: { ops: ['TJM', 'EAS'], subOps: { TJM: ['DWS', 'MAS'] }, opAlias: { SOC: 'TJM' }, ports: ['NGB', 'SHA'], damage: 'report', shifting: false, performance: true },
  STSE: { ops: ['SIT', 'DWS', 'TJM', 'EAS', 'WDG', 'SKR'], subOps: { DWS: ['CSC', 'DSL'] },
         opAlias: { DWS: 'DSL', WDF: 'WDG' }, opAliasNeeds: { DWS: 'CSC' }, ports: ['TAO', 'SHD'], damage: 'each', shifting: true, performance: false },
  STMJ: { ops: ['SIT', 'DWS', 'TJM', 'EAS', 'WDG', 'SKR'], subOps: { DWS: ['CSC', 'DSL'] },
         opAlias: { DWS: 'DSL', WDF: 'WDG' }, opAliasNeeds: { DWS: 'CSC' }, ports: ['TAO', 'SHD'], damage: 'each', shifting: true, performance: false },
  DJCT: { ops: ['SKR', 'HAS', 'HSL', 'DJS', 'DYS'], ports: ['SHK', 'HPH', 'INC'], damage: null, shifting: true, performance: true },
  YKTD: { ops: ['SKR', 'HAS', 'HSL', 'DJS', 'DYS'], ports: ['INC', 'SHK', 'HPH'], damage: 'each', shifting: false, performance: true },
  SWAT: { ops: ['SKR', 'HAS', 'HSL'], ports: ['PUS', 'KAN', 'SGN', 'LCH', 'BKK'], damage: null, shifting: false, performance: true },
  SWRG: { ops: ['SKR', 'HAS', 'HSL'], ports: ['PUS', 'KAN', 'SGN', 'LCH', 'BKK'], damage: null, shifting: false, performance: true },
  SWSP: { ops: ['SKR', 'HAS', 'HSL'], ports: ['KAN', 'PUS', 'SHA', 'SGN', 'LCH', 'BKK'], damage: null, shifting: true, performance: true },
  SWDN: { ops: ['SKR', 'NSL', 'DJS', 'HAS', 'HSL'], ports: ['INC', 'PUS', 'KAN', 'SGN', 'LCH', 'BKK'], damage: null, shifting: false, performance: true },
  DJCF: { ops: ['SKR', 'NSL', 'DJS', 'HAS', 'HSL'], ports: ['INC', 'PUS', 'KAN', 'SGN', 'LCH', 'BKK'], damage: 'each', shifting: false, performance: true },
  DPRT: { ops: ['SKR', 'NSS', 'DJS', 'HAS', 'HSL', 'KMD'], ports: ['PUS', 'KAN', 'SGN', 'LCH', 'BKK', 'INC'], damage: null, shifting: false, performance: true },
  NSDC: { ops: ['NSL', 'KMD'], ports: ['KAN', 'PUS', 'SHK', 'HKG', 'MNN', 'SGN'], damage: null, shifting: false, performance: true },
  NSFR: { ops: ['NSS', 'KMT', 'DYS'], ports: ['INC', 'XMN', 'SHK', 'HPH', 'HKG'], damage: null, shifting: true, performance: true },
  // OBWH는 바우처형 — variant로 분기 (주간/야간/시간외/휴일 열)
  OBWH: { variant: 'voucher', ops: [], ports: ['YNT'], damage: 'report', shifting: false, performance: false },
};

/** 그 배의 양식. 없으면 null — 호출부가 기본 양식 + 경고 처리 */
export function getTallyFormat(vslCode) {
  return TALLY_FORMATS[String(vslCode || '').toUpperCase().trim()] || null;
}

/** 순서 배열 기준 정렬 인덱스 — 사전에 없는 값은 뒤로(등장 순 유지) */
export function orderIndex(list, v) {
  const i = list.indexOf(v);
  return i === -1 ? 900 + list.length : i;
}

/** 3.31: 배별 선사 코드 별칭 — 자료 코드를 그 배의 마감텔리 정본 코드로 바꾼다.
 *  배를 모르면 그대로 둔다(모르는 배에 남의 배 규칙을 씌우지 않는다). */
export function shipOp(vslCode, op) {
  const t = String(op || '').toUpperCase().trim();
  if (!t) return t;
  const fmt = getTallyFormat(vslCode);
  return (fmt && fmt.opAlias && fmt.opAlias[t]) || t;
}

/** 3.31: 자식 선사 → 부모 선사. 자식이 아니면 자기 자신. */
export function opParent(fmt, op) {
  const t = String(op || '').toUpperCase().trim();
  const sub = (fmt && fmt.subOps) || null;
  if (!sub) return t;
  for (const p of Object.keys(sub)) if ((sub[p] || []).includes(t)) return p;
  return t;
}

/** 3.31: 부모 안에서 자식의 순서. 자식이 아니면 -1(부모 자신이라 한 줄뿐). */
export function subIndex(fmt, op) {
  const t = String(op || '').toUpperCase().trim();
  const p = opParent(fmt, t);
  if (p === t) return -1;
  return (fmt.subOps[p] || []).indexOf(t);
}

/** 3.31: 그 항차·그 모드에 실제로 있는 선사 코드를 보고 별칭 함수를 만든다.
 *  자료가 자식을 이미 갈라 놨을 때만 별칭을 쓴다 — `opAliasNeeds` 주석 참조. */
export function shipOpMapper(vslCode, opList) {
  const norm = (op) => String(op || '').toUpperCase().trim();
  const fmt = getTallyFormat(vslCode);
  if (!fmt || !fmt.opAlias) return norm;
  const present = new Set((opList || []).map(norm));
  const need = fmt.opAliasNeeds || {};
  const map = {};
  for (const from of Object.keys(fmt.opAlias)) {
    if (need[from] && !present.has(need[from])) continue;   // 가를 근거가 없다 — 그대로 둔다
    map[from] = fmt.opAlias[from];
  }
  return (op) => { const t = norm(op); return map[t] || t; };
}
