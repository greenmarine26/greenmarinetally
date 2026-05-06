// 인사 시스템 (M3.6)
// - 시간대 + 날씨 기반 인사
// - Open-Meteo API (인증키 X, 무료, 합법, 회사 인계 안전)
// - 평택항 좌표 고정
// - TTS 음성 출력

const PYEONGTAEK_LAT = 36.9826;
const PYEONGTAEK_LON = 126.8244;

// Open-Meteo API에서 평택항 현재 날씨 조회
export async function fetchPyeongtaekWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${PYEONGTAEK_LAT}&longitude=${PYEONGTAEK_LON}&current=temperature_2m,weather_code,wind_speed_10m,precipitation,relative_humidity_2m&timezone=Asia%2FSeoul`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('weather api ' + res.status);
    const data = await res.json();
    const c = data.current;
    return {
      temp: c.temperature_2m,             // °C
      windSpeed: c.wind_speed_10m,        // m/s? km/h?
      precipitation: c.precipitation,     // mm
      weatherCode: c.weather_code,        // WMO code
      humidity: c.relative_humidity_2m,
      time: c.time,
    };
  } catch (e) {
    console.warn('[weather] 날씨 조회 실패:', e);
    return null;
  }
}

// WMO weather code → 한국어 설명
//   https://open-meteo.com/en/docs (WMO Weather interpretation codes)
function describeWeather(code) {
  if (code === 0) return { label: '맑음', emoji: '☀️', kind: 'clear' };
  if (code === 1 || code === 2) return { label: '대체로 맑음', emoji: '🌤', kind: 'partly' };
  if (code === 3) return { label: '흐림', emoji: '☁️', kind: 'cloudy' };
  if (code === 45 || code === 48) return { label: '안개', emoji: '🌫', kind: 'fog' };
  if (code >= 51 && code <= 57) return { label: '이슬비', emoji: '🌦', kind: 'drizzle' };
  if (code >= 61 && code <= 67) return { label: '비', emoji: '🌧', kind: 'rain' };
  if (code >= 71 && code <= 77) return { label: '눈', emoji: '❄️', kind: 'snow' };
  if (code >= 80 && code <= 82) return { label: '소나기', emoji: '🌦', kind: 'rain' };
  if (code >= 85 && code <= 86) return { label: '눈 소나기', emoji: '❄️', kind: 'snow' };
  if (code >= 95 && code <= 99) return { label: '천둥번개', emoji: '⛈', kind: 'thunder' };
  return { label: '날씨 정보', emoji: '🌍', kind: 'unknown' };
}

// 시간대 분류
function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 9) return 'dawn';     // 새벽/아침
  if (hour >= 9 && hour < 12) return 'morning'; // 오전
  if (hour >= 12 && hour < 14) return 'lunch';  // 점심
  if (hour >= 14 && hour < 18) return 'afternoon'; // 오후
  if (hour >= 18 && hour < 22) return 'evening';   // 저녁
  return 'night'; // 야간 (22~5시)
}

// 로그인 인사 메시지 생성
export function buildGreetingMessage(name, weather) {
  const now = new Date();
  const hour = now.getHours();
  const tod = getTimeOfDay(hour);

  // 시간대별 인사
  const greetings = {
    dawn:      ['☀️ 좋은 아침입니다', '🌅 오늘도 안전 검수 부탁드립니다'],
    morning:   ['🌞 좋은 하루 보내세요', '💪 오전 작업 화이팅입니다'],
    lunch:     ['🍱 점심 드셨나요?', '🥤 물 충분히 드세요'],
    afternoon: ['🌤 오후 작업도 안전하게', '☕ 커피 한 잔 어떠세요?'],
    evening:   ['🌆 오늘도 수고 많으십니다', '🌙 저녁 작업 안전 주의'],
    night:     ['🌙 야간 근무 정말 수고 많으십니다', '⭐ 안전이 최우선입니다'],
  };
  const tg = greetings[tod] || greetings.morning;
  const greeting = tg[Math.floor(Math.random() * tg.length)];

  let weatherLine = '';
  let voiceWeather = '';

  if (weather) {
    const w = describeWeather(weather.weatherCode);
    const t = weather.temp;
    const wind = weather.windSpeed;
    const rain = weather.precipitation;

    // 위험 기상 우선
    if (w.kind === 'thunder') {
      weatherLine = '⛈ 천둥번개! 위험 기상 - 작업 중단 검토 필요';
      voiceWeather = '천둥번개입니다. 위험 기상이니 작업 중단을 검토하세요';
    } else if (wind >= 12) {
      weatherLine = `💨 강풍 ${wind.toFixed(0)}m/s - 안전 주의!`;
      voiceWeather = `강풍 경보. 풍속 ${wind.toFixed(0)}미터입니다. 안전 주의 부탁드립니다`;
    } else if (rain >= 5) {
      weatherLine = `🌧 비 ${rain.toFixed(0)}mm/h - 미끄럼 주의`;
      voiceWeather = `비가 많이 옵니다. 미끄럼 주의하세요`;
    } else if (w.kind === 'snow') {
      weatherLine = `❄️ 눈 - 미끄럼 매우 주의`;
      voiceWeather = `눈이 옵니다. 미끄럼 매우 주의하세요`;
    } else if (w.kind === 'rain' || w.kind === 'drizzle') {
      weatherLine = `${w.emoji} ${w.label} - 우비 챙기세요`;
      voiceWeather = `오늘 ${w.label}이 와요. 우비 챙기세요`;
    } else if (w.kind === 'fog') {
      weatherLine = `🌫 안개 - 시야 확보 주의`;
      voiceWeather = `안개입니다. 시야 확보 주의하세요`;
    } else if (t >= 30) {
      weatherLine = `🥵 ${t.toFixed(0)}°C 더위 - 수분 보충 잊지 마세요`;
      voiceWeather = `오늘 ${t.toFixed(0)}도. 더우니 수분 보충 잊지 마세요`;
    } else if (t <= 0) {
      weatherLine = `🥶 ${t.toFixed(0)}°C 추위 - 따뜻하게 입으세요`;
      voiceWeather = `오늘 영하 ${Math.abs(t).toFixed(0)}도. 추우니 따뜻하게 입으세요`;
    } else if (t <= 5) {
      weatherLine = `❄️ ${t.toFixed(0)}°C 쌀쌀 - 따뜻하게`;
      voiceWeather = `오늘 ${t.toFixed(0)}도. 쌀쌀하니 따뜻하게 입으세요`;
    } else {
      weatherLine = `${w.emoji} ${w.label} ${t.toFixed(0)}°C`;
    }
  }

  const lines = [
    `안녕하세요, ${name} 검수원님!`,
    greeting,
  ];
  if (weatherLine) lines.push(weatherLine);

  // 음성용 (이모지/기호 제거)
  const voiceLines = [
    `안녕하세요 ${name} 검수원님`,
    greeting.replace(/[☀️🌅🌞💪🍱🥤🌤☕🌆🌙⭐]/g, '').trim(),
  ];
  if (voiceWeather) voiceLines.push(voiceWeather);

  return {
    lines,                          // 화면 표시용
    voice: voiceLines.join('. '),   // 음성용
    timeOfDay: tod,
    weather,
  };
}

// 로그아웃 인사 메시지 생성
export function buildFarewellMessage(name, weather, workDurationMs) {
  const now = new Date();
  const hour = now.getHours();
  const tod = getTimeOfDay(hour);

  const lines = [`수고하셨어요, ${name} 검수원님!`];
  const voiceLines = [`수고하셨어요 ${name} 검수원님`];

  // 작업 시간이 길었으면 강조
  if (workDurationMs && workDurationMs > 0) {
    const hours = workDurationMs / (1000 * 60 * 60);
    if (hours >= 8) {
      lines.push(`⏰ 오늘 ${hours.toFixed(1)}시간 작업하셨습니다`);
      voiceLines.push(`오늘 ${hours.toFixed(0)}시간 작업하셨습니다`);
    } else if (hours >= 6) {
      lines.push(`⏰ 오늘 ${hours.toFixed(1)}시간 정말 수고하셨어요`);
      voiceLines.push(`오늘 ${hours.toFixed(0)}시간 정말 수고하셨어요`);
    }
  }

  // 시간대별 마무리
  if (tod === 'night') {
    lines.push('🌙 안전 귀가하세요');
    voiceLines.push('안전 귀가하세요. 푹 쉬세요');
  } else if (tod === 'evening') {
    lines.push('🌆 푹 쉬세요');
    voiceLines.push('푹 쉬세요');
  } else if (tod === 'dawn' || tod === 'morning') {
    lines.push('🌟 일찍 끝나셨네요! 좋은 하루 되세요');
    voiceLines.push('좋은 하루 보내세요');
  } else {
    lines.push('☕ 잠시 쉬세요');
    voiceLines.push('잠시 쉬세요');
  }

  // 날씨 기반 마무리
  if (weather) {
    const w = describeWeather(weather.weatherCode);
    const t = weather.temp;

    if (w.kind === 'thunder') {
      lines.push('⛈ 위험 기상에 정말 고생 많으셨어요');
      voiceLines.push('위험 기상에 정말 고생 많으셨어요');
    } else if (w.kind === 'rain' || w.kind === 'drizzle') {
      lines.push('☔ 비 조심해서 귀가하세요');
      voiceLines.push('비 조심해서 귀가하세요');
    } else if (w.kind === 'snow') {
      lines.push('❄️ 눈길 미끄럼 주의 귀가하세요');
      voiceLines.push('눈길 미끄럼 주의해서 귀가하세요');
    } else if (t >= 30) {
      lines.push('🥵 더위에 정말 고생 많으셨어요. 시원한 물 한 잔!');
      voiceLines.push('더위에 정말 고생 많으셨어요');
    } else if (t <= 0) {
      lines.push('🥶 추위에 수고 많으셨어요. 따뜻한 곳에서 쉬세요');
      voiceLines.push('추위에 수고 많으셨어요');
    }
  }

  return {
    lines,
    voice: voiceLines.join('. '),
    workHours: workDurationMs ? (workDurationMs / 1000 / 60 / 60) : 0,
  };
}

// 음성 출력 (Web Speech API)
export function speakGreeting(text) {
  if (!('speechSynthesis' in window)) return;
  if (!text) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ko-KR';
    utter.rate = 1.0;
    utter.pitch = 1.05;
    utter.volume = 1.0;
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn('[speakGreeting] 음성 출력 실패:', e);
  }
}

// 로그인 시각 저장 (작업 시간 계산용)
export function saveLoginTime(name) {
  try {
    localStorage.setItem('gm_login_time', String(Date.now()));
    localStorage.setItem('gm_login_inspector', name);
  } catch (e) {}
}

export function getLoginTime() {
  try {
    const t = localStorage.getItem('gm_login_time');
    return t ? Number(t) : 0;
  } catch (e) { return 0; }
}

export function clearLoginTime() {
  try {
    localStorage.removeItem('gm_login_time');
    localStorage.removeItem('gm_login_inspector');
  } catch (e) {}
}
