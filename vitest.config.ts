import { defineConfig } from 'vitest/config';

// E2E tests spin up the compiled CLI as a subprocess and are slow.
// Opt into them via `E2E=1 vitest run` (or `npm run test:e2e`).
// Default `npm test` runs only unit tests.
const isE2E = process.env.E2E === '1';

export default defineConfig({
  test: {
    globals: true,
    include: isE2E ? ['tests/e2e/**/*.test.ts'] : ['tests/**/*.test.ts'],
    exclude: isE2E
      ? ['node_modules/**', 'dist/**']
      : ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    // E2E subprocess tests need a longer default timeout.
    testTimeout: isE2E ? 30000 : 5000,
  },
});
