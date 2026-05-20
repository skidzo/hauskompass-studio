import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    exclude: [
      ...configDefaults.exclude,
      'tests/usability/06-laien-workshop-workflow.test.mjs',
      'utils/tests/generate-media-manifest.test.mjs',
      'utils/tests/find-local-media-eiermann.test.mjs',
    ],
  },
});
