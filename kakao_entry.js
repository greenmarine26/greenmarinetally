// 수집기 kakao_helper 전용 엔트리 — TallyOne 5.29 · MailPilot 2.56 (2026-11-28)
// GMkakaoPlan(kakaoLive.kakaoPlan)만 노출한다. 수집기는 카톡 창에서 복사한 글과 RTDB 에서 읽은 항차를 넘기고, 돌려받은 쓰기 경로를 PATCH 한다.
// 재생성: 앱 저장소에서  npx vite build --config vite.kakao.config.js  → dist_kakao/gm_kakao.js → HTML 래핑(collector/kakao_helper.html).
import { kakaoPlan } from './src/kakaoLive.js';
import { APP_VERSION } from './src/utils.js';
if (typeof window !== 'undefined') { window.GMkakaoPlan = kakaoPlan; window.GM_KAKAO_VERSION = APP_VERSION; }
