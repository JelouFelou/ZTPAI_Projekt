import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    include: ['test/**/*.db-spec.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
