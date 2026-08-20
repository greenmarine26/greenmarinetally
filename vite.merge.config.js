// 수집기 merge_helper 재생성용 vite 설정 — merge_entry.js → dist_merge/gm_merge.js (iife 단일 파일)
import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    outDir: 'dist_merge',
    lib: { entry: 'merge_entry.js', name: 'GMMergeHelper', formats: ['iife'], fileName: () => 'gm_merge.js' },
    rollupOptions: { output: { inlineDynamicImports: true } },
    minify: true,
  },
});
