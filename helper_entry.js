// 수집기 autoreg_helper 전용 엔트리 — MailPilot 1.8-06 (2026-08-20)
// GMautoPayload(buildAutoPayload)만 노출한다. GMmerge/GMleg 는 merge_helper(merge_entry.js) 소관 —
//   앱판 mergeFolder 를 여기 실으면 수집기 계약(listTotal/gap/partialEdi)과 다른 반환형이 섞여 오염원이 된다.
// 재생성: 앱 저장소에서  npx vite build --config vite.helper.config.js  → dist_helper/gm_helper.js → HTML 래핑.
import './src/autoRegApi.js';   // window.GMautoPayload 등록
import { APP_VERSION } from './src/utils.js';
if (typeof window !== 'undefined') window.GM_HELPER_VERSION = APP_VERSION;
