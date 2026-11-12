// 검수앱(TallyOne) 빌드 설정 — GitHub Pages 상대 경로 · 판마다 안 바뀌는 덩어리 청크 고정(4.87-10)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

//  ★ 4.87-10: 판마다 바뀌지 않는 덩어리를 본체에서 떼어 파일 이름(해시)을 고정한다.
//    종전에는 라이브러리·베이사전(약 2.3MB)이 본체 index-<해시>.js 한 파일에 묶여 판마다 6MB 를 새로 받았다.
//    vendor = 첫 화면이 정적으로 쓰는 라이브러리(react·firebase·lucide) + rollup 공용 도우미(commonjsHelpers —
//             exceljs·xlsx 청크가 이것을 본체에서 import 해 본체 해시에 묶이던 것).
//    ⚠ exceljs·xlsx·pdfjs-dist 는 누를 때만 받는 동적 청크라 vendor 에 넣지 않는다(넣으면 첫 화면에 1MB+ 가 딸려 온다).
const VENDOR_RE = /[\\/]node_modules[\\/](?:react|react-dom|scheduler|firebase|@firebase|lucide-react|idb|tslib)[\\/]/;
const BAYDICT_RE = /[\\/]src[\\/]data[\\/]shipBayDict[^\\/]*\.js$/;

// GitHub Pages 호환: 상대 경로
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {   // 4.87-10
          if (VENDOR_RE.test(id) || id.includes('commonjsHelpers')) return 'vendor';
          if (BAYDICT_RE.test(id)) return 'baydict';
          return undefined;
        },
      },
    },
  },
});
