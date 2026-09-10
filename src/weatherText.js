// 평택항 날씨 한 줄 — Open-Meteo(무키)를 읽어 미르가 답하는 문장으로 만든다(작업창·떠 있는 미르 공용 한 벌).
/* 3.41: 종전엔 SearchPanel 안에 인라인이라 떠 있는 미르·홈은 «조회 중…»에서 영영 멈췄다(감사 지적). 여기 한 벌로 옮긴다. */
const WMO = { 0: '맑음', 1: '대체로 맑음', 2: '구름 조금', 3: '흐림', 45: '안개', 48: '안개', 51: '이슬비', 53: '이슬비', 55: '이슬비', 61: '비', 63: '비', 65: '강한 비', 66: '진눈깨비', 67: '진눈깨비', 71: '눈', 73: '눈', 75: '강한 눈', 77: '싸락눈', 80: '소나기', 81: '소나기', 82: '강한 소나기', 85: '눈보라', 86: '눈보라', 95: '뇌우', 96: '뇌우·우박', 99: '뇌우·우박' };
const dir16 = (d) => ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동', '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'][Math.round((((d % 360) + 360) % 360) / 22.5) % 16];
const FAIL = '날씨 정보를 가져오지 못했습니다. 신호를 확인해 주세요.';

/** 평택항 지금 날씨 + 오늘 최저·최고·강수확률. 실패하면 안내문(조용히 비지 않는다). */
export async function fetchWeatherText() {
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=36.967&longitude=126.822&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=Asia%2FSeoul&wind_speed_unit=ms', { signal: AbortSignal.timeout(8000) });
    const j = r.ok ? await r.json() : null;
    const c = j && j.current, d = j && j.daily;
    if (!c) return FAIL;
    const lines = [`평택항 날씨 — ${WMO[c.weather_code] ?? ''} 기온 ${Math.round(c.temperature_2m)}도, 바람 ${dir16(c.wind_direction_10m)}풍 초속 ${Math.round(c.wind_speed_10m)}미터.`];
    if (d) lines.push(`오늘 최저 ${Math.round(d.temperature_2m_min?.[0])}° / 최고 ${Math.round(d.temperature_2m_max?.[0])}° · 강수확률 ${d.precipitation_probability_max?.[0] ?? '-'}%`);
    return lines.join('\n');
  } catch (e) { return FAIL; }
}
