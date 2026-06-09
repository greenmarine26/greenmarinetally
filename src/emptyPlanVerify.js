// emptyPlanVerify.js — 빈 카고플랜(베이매트릭스) 자체 검증
// =============================================================
// 목적: AI/파서가 만든 빈 프레임을 EDI 화물로 교차검증한다.
//   원리(지침서 4.x, 6부): "빈 곳 위에 화물 못 올라간다."
//   → EDI의 모든 화물 (bay,row,tier)이 빈 프레임 칸 안에 있어야 PASS.
//   사람이 매번 눈으로 검증하던 것을 코드가 대신한다 (검증 주체 = AI).
//
// 한계(정직히): 화물 없는 빈 칸의 '모양'은 화물로 검증 못 함.
//   그 부분은 PDF 테두리 판독 정확도에 의존. FAIL 베이만 사람 확인.

const ROW11 = ['10','08','06','04','02','00','01','03','05','07','09'];

// tier별 칸수 n → 차지하는 row 라벨 집합 (00 중심 좌우대칭)
export function rowsForCount(n) {
  if (n >= 11) return new Set(ROW11);
  const half = (n - 1) / 2, c = 5, idx = [c];
  for (let k = 1; k <= half; k++) { idx.unshift(c - k); idx.push(c + k); }
  return new Set(idx.map(i => ROW11[i]));
}

// 짝수 베이(40ft 슬롯) 화물 → 짝꿍 홀수 베이로 매핑
function mapBay(bay, frame) {
  if (bay % 2 === 1) return bay;
  if (frame[bay + 1]) return bay + 1;
  if (frame[bay - 1]) return bay - 1;
  return bay;
}

// frame: { [bayNo]: { deck:{[tier]:cnt}, hold:{[tier]:cnt} } }
// containers: [{ bay, row, tier, cn }]
// 반환: { pass, checked, issues:[{bay,tier,row,cn,reason}] }
export function verifyEmptyPlan(frame, containers) {
  const issues = [];
  let checked = 0;
  for (const c of containers) {
    const raw = parseInt(c.bay, 10);
    if (!Number.isFinite(raw)) continue;
    const bay = mapBay(raw, frame);
    const a = frame[bay];
    if (!a) { issues.push({ bay: raw, cn: c.cn, reason: 'no-bay' }); continue; }
    const tier = parseInt(c.tier, 10);
    const isDeck = tier >= 80;
    const map = isDeck ? a.deck : a.hold;
    const cnt = map ? map[String(tier)] : undefined;
    checked++;
    if (cnt === undefined) {
      issues.push({ bay, tier, cn: c.cn, reason: isDeck ? 'no-deck-tier' : 'no-hold-tier' });
      continue;
    }
    const rl = (c.row === '0' || c.row === 0) ? '00' : String(c.row).padStart(2, '0');
    if (!rowsForCount(cnt).has(rl)) {
      issues.push({ bay, tier, row: rl, cn: c.cn, reason: 'row-out-of-frame' });
    }
  }
  // 베이별 중복 reason 1건으로 축약
  const seen = new Set();
  const uniq = issues.filter(i => {
    const k = `${i.bay}-${i.tier ?? ''}-${i.row ?? ''}-${i.reason}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
  return { pass: uniq.length === 0, checked, issues: uniq };
}
