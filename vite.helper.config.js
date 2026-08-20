import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    lib: { entry: 'helper_entry.js', name: 'GMHelpers', formats: ['iife'], fileName: () => 'gm_helper.js' },
    outDir: 'dist_helper', emptyOutDir: true, minify: true,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
