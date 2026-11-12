// 트윈 짝꿍 (V2 - EDI 베이 분포 기반 자동 분석)
// M6.22: 베이사전 bayList도 통합 — EDI에 짝수 베이(22 등) 누락 시에도 짝꿍 매칭 보장
//
// 알고리즘:
// 1. EDI에 있는 모든 베이 + 베이사전 bayList 통합
// 2. 짝수 베이(40ft 슬롯)가 있으면 → 양 옆 홀수 베이가 짝꿍
// 3. 짝수 베이가 없으면(통로) → 그 양옆 홀수 베이는 단독
//
// 예: XTPG section 7: bayList = [21, 22, 23]
//   - EDI에 22번 컨이 없어도 베이사전에 있으면 baySet.has(22)=true
//   - 21번 짝꿍 = 23 정상 매칭

import { getShipBayDictData } from './shipStructure.js';
import { sizeLenKnown } from './tallyReport.js';   // 4.88: 규격 길이 한 벌

// M6.22: cache 구조 변경 — (allContainers, shipKey) 조합으로 캐싱
const cache = new WeakMap();

function buildBayPairs(allContainers, shipImo = '', shipName = '') {
  const shipKey = `${shipImo || ''}|${shipName || ''}`;
  const containerCache = cache.get(allContainers);
  if (containerCache?.[shipKey]) return containerCache[shipKey];

  // 베이 구조 수집 — 우선순위: 베이매트릭스/베이사전(baysSummary 우선, 없으면 bayList) → EDI 폴백
  //   getShipBayDictData가 user(매트릭스 빌더) → v2 → firebase 순으로 이미 우선순위대로 반환.
  //   짝꿍 판정의 근본 출처는 이 베이 구조이며, EDI 적재 여부가 아니다.
  const bays = new Set();      // 존재하는 모든 베이(홀+짝)
  let structBays = [];          // 베이사전/매트릭스에서 온 베이 목록
  if (shipImo || shipName) {
    const dict = getShipBayDictData(shipImo, shipName);
    const bd = dict?.bayDef;
    if (bd) {
      if (Array.isArray(bd.baysSummary) && bd.baysSummary.length > 0) {
        structBays = bd.baysSummary.map(b => b.bayNo ?? b.bay ?? b.idx).filter(v => v != null);
      } else if (Array.isArray(bd.bayList) && bd.bayList.length > 0) {
        structBays = bd.bayList;
      }
    }
  }
  structBays.forEach(b => {
    const n = parseInt(b, 10);
    if (Number.isFinite(n)) bays.add(n);
  });
  // EDI 폴백 — 베이매트릭스/베이사전에 없는 베이도 실물이 있으면 포함
  // M3.86 fix2: c.bay normalize (Firebase zero-padded "025" 옛 데이터 호환)
  for (const c of allContainers) {
    if (c.bay) {
      const n = parseInt(c.bay, 10);
      if (Number.isFinite(n)) bays.add(n);
    }
  }
  const bayInts = Array.from(bays).filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  const baySet = new Set(bayInts);

  // 짝꿍 매핑: 홀수 베이 → 짝꿍 베이
  // 23번이면 사이 24가 베이 구조에 있나 본다 → 있으면 25가 짝꿍(23-24-25 한 슬롯).
  //   24가 없으면(통로) 22를 본다 → 있으면 21이 짝꿍. 양쪽 다 없으면 단독.
  //   ★ 짝수 베이 유무는 '실제 베이 구조(matrix/사전/EDI)' 기준이지 40ft 적재 여부가 아님.
  // M3.86 fix: pairs 키와 값을 정수 문자열로 통일
  const pairs = {}; // 'XX' → 'YY' or null (단독)
  //  🔴 2.72 (검수사 실측 2026-08-28 «베이 29 (30)31이 되어야 하는데 잘못됨»):
  //    **이미 남의 짝인 홀수는 다시 쓰지 않는다.** 2.55-02 가 카고플랜(autoPairBays)에 넣은 그 가드가
  //    여기에는 없어서, SWTD 에서 29 가 31 을 데려간 뒤에도 31 이 33 을 또 데려갔다
  //    → 자동 가이드 베이 묶음이 «B29·30 / B31·32·33» 으로 갈렸다(CASP 정답: 29·(30)31 · 32 · 33 · 34).
  //    ⚠ 짝 짓기가 이 저장소에서 **네 번째로** 두 벌이었다(카고플랜·베이플랜·콘앱 다음이 여기).
  //    작은 번호부터 순서대로 claim 한다 — 앞 짝수 우선(autoPairBays 와 같은 방향).
  const usedOdds = new Set();
  for (const b of bayInts) {
    if (b % 2 === 0) continue;
    const bStr = String(b);
    if (usedOdds.has(b)) { pairs[bStr] = pairs[bStr] || null; continue; }
    let pairBay = null;
    if (baySet.has(b + 1) && baySet.has(b + 2) && !usedOdds.has(b + 2)) {
      pairBay = String(b + 2);
    }
    else if (baySet.has(b - 1) && baySet.has(b - 2) && !usedOdds.has(b - 2)) {
      pairBay = String(b - 2);
    }
    pairs[bStr] = pairBay;
    if (pairBay) { usedOdds.add(b); usedOdds.add(parseInt(pairBay, 10)); pairs[pairBay] = bStr; }
  }

  if (!containerCache) cache.set(allContainers, {});
  cache.get(allContainers)[shipKey] = pairs;
  return pairs;
}

// 짝꿍 후보 찾기 (모드별, 위치별)
//   target: 검색된 컨테이너
//   allContainers: 전체 컨테이너
//   excludeCns: 이미 페어링된 컨번호 set (제외)
// M6.22: shipImo/shipName 추가 — 베이사전 활용으로 매칭 정확도 향상
export function findTwinCandidate(target, allContainers, excludeCns = new Set(), shipImo = '', shipName = '', occupancy = null) {
  if (!target?.bay || !target?.row || !target?.tier) return null;

  const targetBay = parseInt(target.bay);
  if (!Number.isFinite(targetBay)) return null;
  if (targetBay % 2 === 0) return null;

  const pairs = buildBayPairs(allContainers, shipImo, shipName);
  const targetBayStr = String(targetBay);
  const pairBayStr = pairs[targetBayStr];

  if (!pairBayStr) return null;

  const found = allContainers.find(c => {
    if (c.cn === target.cn) return false;
    if (excludeCns.has(c.cn)) return false;
    const cBayNorm = c.bay ? String(parseInt(c.bay, 10)) : '';
    return cBayNorm === pairBayStr &&
      c.row === target.row &&
      c.tier === target.tier &&
      c._mode === target._mode;
  });
  if (found) return found;
  return orphanTwinMate(target, allContainers, excludeCns, pairBayStr, targetBayStr, occupancy);
}

//  ★ 4.87-04 (검수사 2026-11-11 09:09~09:16 ATPR 2651W 10번 베이 데크 «트윈모드가 안되는 이유는?» · «가상자리임을 망각한것» · «짝도 가상임을 알아야함»):
//    선적 엠티의 자리는 정해 둔 실제 칸이 아니라 예약해 둔 **가상 자리**다 — 짝 칸에 있던 컨이 다른 컨 자리로 먼저 실려 나가면 칸 짝이 비어 남은 컨이 싱글로 남는다
//    (9-01-84 SKLU1945620 · 11-06-82 SKLU1548557 — 9번·11번 남은 엠티가 11대씩인데 둘만 짝이 안 잡혔다).
//    그래서 **칸 짝이 없을 때만**, 두 베이에서 칸 짝 없이 남은 같은 쪽(데크/홀드)·같은 규격 엠티를 줄·단 순서로 늘어놓고 **앞에서부터 1:1** 로 묶는다(어느 쪽에서 물어도 같은 짝).
//    칸 짝이 있는 컨은 종전 그대로(위 find)이고, 양하·풀·다른 규격·이미 완료한 컨은 건드리지 않는다. 판정은 이 한 곳 — 자동 가이드·수동 조회·미르가 같이 쓴다.
const _isDeckTier = (t) => parseInt(t, 10) >= 80;
const _bayN = (c) => (c && c.bay ? parseInt(c.bay, 10) : NaN);
const _is20 = (c) => sizeLenKnown({ iso: c?.iso }) === '20';   // 4.88: 규격 길이 한 벌(자리 판정 — 규격만). 종전 첫 글자 2 만 봐 «DC20» 엠티를 짝에서 뺐다
function orphanTwinMate(target, all, excludeCns, pairBayStr, targetBayStr, occupancy) {
  if (target._mode !== 'loading' || String(target.fe || '').toUpperCase() !== 'E' || !_is20(target) || target._comp) return null;
  const rowN = (c) => parseInt(c.row, 10) || 0, tierN = (c) => parseInt(c.tier, 10) || 0;
  const deck = _isDeckTier(target.tier);
  //  occupancy = 호출부가 «칸이 찼는지»를 볼 때 쓰라고 따로 넘기는 전체 남은 컨(자동 가이드 큐는 보류·다른 장을 뺀 목록을 짝 후보로 넘기므로 — 그대로 세면 호출부마다 순번이 밀려 짝이 갈린다).
  //  짝 후보(mate)는 넘겨받은 all 안에서만 고른다 — 큐에서 뺀 보류 컨과는 묶지 않는다.
  const base0 = occupancy && occupancy.length ? occupancy : all;
  const pool = base0.some((x) => x.cn === target.cn) ? base0 : base0.concat([target]);   // 호출부가 자기 자신을 빼고 넘겨도 같은 답
  const cell = new Set();   // 두 베이에 아직 안 실린 컨이 있는 줄·단 — 이미 실린(완료) 칸은 비었다고 본다(호출부가 완료를 넘기든 빼든 같은 답)
  for (const x of pool) if (!x._comp && x._mode === 'loading' && x.row && x.tier && (String(_bayN(x)) === pairBayStr || String(_bayN(x)) === targetBayStr)) cell.add(String(_bayN(x)) + '|' + x.row + '|' + x.tier);
  const orphansOf = (bay, other) => pool.filter((x) => x._mode === 'loading' && String(_bayN(x)) === bay && x.row && x.tier && !x._comp
    && String(x.fe || '').toUpperCase() === 'E' && _is20(x) && _isDeckTier(x.tier) === deck && !cell.has(other + '|' + x.row + '|' + x.tier))
    .sort((a, b) => rowN(a) - rowN(b) || tierN(a) - tierN(b) || String(a.cn).localeCompare(String(b.cn)));
  const mine = orphansOf(targetBayStr, pairBayStr), theirs = orphansOf(pairBayStr, targetBayStr);
  const k = mine.findIndex((x) => x.cn === target.cn);
  if (k < 0 || k >= theirs.length) return null;
  const mate = theirs[k];
  if (excludeCns.has(mate.cn) || (base0 !== all && !all.some((x) => x.cn === mate.cn))) return null;
  return mate;   // 줄·단 순서로 1:1 — 두 베이 남은 컨을 같은 순서로 대응시켜 서로 같은 짝을 가리킨다(어느 쪽에서 물어도 같은 답)
}

// 베이 짝꿍 맵 가져오기 (UI에서 표시용)
// M6.22: shipImo/shipName 추가
export function getBayPairs(allContainers, shipImo = '', shipName = '') {
  return buildBayPairs(allContainers, shipImo, shipName);
}

// V9.57: findStackMates 삭제 — 저장소 전체 grep 참조 0 (같은 슬롯 다중 적재 조회는 미사용 잔재).
