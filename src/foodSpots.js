// 평택항(포승) 주변 맛집 시드·시간대·돌림판 로직 — 맛집 페이지와 음성 추천이 공용으로 쓴다.
// 시드는 2026-07 웹 조사 기반(실존 확인분만). 전화·영업시간은 현장 확인 후 수정 가능.

export const FOOD_SEEDS = [
  { id: 'seed01', name: '일품양평해장국 평택포승점', cat: '해장국·국밥', tel: '031-684-4312', area: '만호리(평택항로 7)', tags: ['아침', '점심', '저녁'], note: '06~21시 · 주차 넓음' },
  { id: 'seed02', name: '국수집', cat: '국수·김밥', tel: '031-684-1102', area: '만호리 311-11', tags: ['점심'], note: '잔치국수 양 많음 · 김밥 맛집' },
  { id: 'seed03', name: '홍두깨식당', cat: '칼국수·만두', tel: '031-682-5397', area: '만호리(연암길 92)', tags: ['점심', '저녁'], note: '해물칼국수 · 모듬만두' },
  { id: 'seed04', name: '호성식당', cat: '꽃게탕·해물', tel: '', area: '만호리', tags: ['점심', '저녁'], note: '꽃게탕' },
  { id: 'seed05', name: '메인스트리트', cat: '수제버거', tel: '', area: '만호리', tags: ['점심', '저녁'], note: '수제버거' },
  { id: 'seed06', name: '보리밭 한식&분식', cat: '한식·분식', tel: '', area: '포승', tags: ['점심'], note: '보리비빔밥·나물' },
  { id: 'seed07', name: '본가참순대', cat: '순대국', tel: '', area: '도곡리', tags: ['점심', '저녁'], note: '순대국 ★4.1' },
  { id: 'seed08', name: '송탄최네집부대찌개', cat: '부대찌개', tel: '', area: '도곡리', tags: ['점심', '저녁'], note: '부대찌개 ★4.7' },
  { id: 'seed09', name: '몬테비안코', cat: '이탈리안', tel: '', area: '마린센터 15층', tags: ['점심', '저녁'], note: '360도 회전 전망 · 특별한 날' },
  { id: 'seed10', name: '신화기사식당', cat: '백반·기사식당', tel: '', area: '포승', tags: ['아침', '점심', '저녁'], note: '기사식당 백반' },
  { id: 'seed11', name: 'CU 포승평택항로점', cat: '편의점', tel: '', area: '만호리', tags: ['야식', '24시'], note: '24시간 · 야식·간편식' },
  { id: 'seed12', name: '세븐일레븐 평택대교낚시점', cat: '편의점', tel: '', area: '만호리', tags: ['야식', '24시'], note: '24시간' },
];

// 지금 시각의 식사 슬롯. 05~10:30 아침 / ~15시 점심 / ~20:30 저녁 / 그 외 야식.
export function mealSlotNow(d = new Date()) {
  const m = d.getHours() * 60 + d.getMinutes();
  if (m >= 300 && m < 630) return 'breakfast';
  if (m >= 630 && m < 900) return 'lunch';
  if (m >= 900 && m < 1230) return 'dinner';
  return 'night';
}

export const SLOT_LABEL = { breakfast: '아침', lunch: '점심', dinner: '저녁', night: '야식', any: '식사' };

// 슬롯별 후보 — 야식=야식·24시 태그만, 아침=아침·24시, 점심/저녁=편의점 제외. 비면 전체 폴백.
export function filterBySlot(spots, slot) {
  const arr = (spots || []).filter(Boolean);
  let out;
  if (slot === 'night') out = arr.filter(s => (s.tags || []).some(t => t === '야식' || t === '24시'));
  else if (slot === 'breakfast') out = arr.filter(s => (s.tags || []).some(t => t === '아침' || t === '24시'));
  else if (slot === 'lunch' || slot === 'dinner') out = arr.filter(s => s.cat !== '편의점');
  else out = arr.slice();
  return out.length ? out : arr;
}

// 평균 별점 (ratings = {검수사: 1~5}). 없으면 null.
export function avgRating(spot) {
  const r = spot && spot.ratings ? Object.values(spot.ratings).map(Number).filter(x => x >= 1 && x <= 5) : [];
  if (!r.length) return null;
  return Math.round((r.reduce((a, b) => a + b, 0) / r.length) * 10) / 10;
}

// 돌림판 추첨 — 후보(최대 10곳 무작위)와 당첨·바늘 각도를 정한다.
export function spinPick(spots, rnd = Math.random) {
  let list = (spots || []).slice();
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  list = list.slice(0, 10);
  if (!list.length) return null;
  const winIdx = Math.floor(rnd() * list.length);
  const seg = 360 / list.length;
  // 바늘(12시 방향) 기준 — 당첨 조각의 중앙이 바늘에 오도록 회전각 계산 (+5바퀴 연출)
  const target = 360 * 5 + (360 - (winIdx * seg + seg / 2));
  return { list, winner: list[winIdx], winIdx, angle: target, seg };
}

// 카카오맵 검색 링크.
export function mapUrlOf(spot) {
  return 'https://map.kakao.com/link/search/' + encodeURIComponent(`${spot.name} 평택 포승`);
}
