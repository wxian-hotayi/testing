import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // Unit tests live next to source as *.test.ts. Playwright E2E lives in
    // tests/e2e and is run separately via `npm run test:e2e`.
    include: ['src/**/*.test.ts'],
  },
});
