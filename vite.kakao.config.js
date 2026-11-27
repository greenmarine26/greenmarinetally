// 수집기 카톡 헬퍼(gm_kakao.js) 굽기 설정 — TallyOne 5.29
import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    lib: { entry: 'kakao_entry.js', name: 'GMKakao', formats: ['iife'], fileName: () => 'gm_kakao.js' },
    outDir: 'dist_kakao', emptyOutDir: true, minify: true, copyPublicDir: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
