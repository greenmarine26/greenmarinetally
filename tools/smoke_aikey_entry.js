// 공용 AI 키 연막검사 입구(3.43 판 C) — gemini.js·mixerUpload.js·mirModel.js 를 한 번들로 묶어 smoke_aikey.cjs 가 실소스를 돌린다.
export { resolveAiKey, aiCall, askShipIntro, askGemini, ocrStowagePdf } from '../src/gemini.js';
export { ocrReeferTemps, ocrImageContainers, ocrPortMisCapture } from '../src/mixerUpload.js';
export { getMirConfig } from '../src/mirModel.js';
export { APP_NOTE, APP_VERSION } from '../src/utils.js';
