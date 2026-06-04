import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      // Proxy für LGL Baden-Württemberg LoD2-Downloads (CORS-Bypass in Dev)
      '/api/lgl-bw': {
        target: 'https://opengeodata.lgl-bw.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/lgl-bw/, ''),
        secure: true,
      },
    },
  },
  test: {
    exclude: [
      ...configDefaults.exclude,
      'tests/usability/06-laien-workshop-workflow.test.mjs',
      'utils/tests/generate-media-manifest.test.mjs',
      'tools/export/tests/generate-media-manifest.test.mjs',
    ],
  },
});
