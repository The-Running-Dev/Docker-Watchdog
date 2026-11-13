import { defineConfig } from 'vitest/config';
import base from './vitest.config.js';

// pnpm test:docker: the tests that need a real Docker engine, one file at a time.
// Not mergeConfig: it would append to the base include and exclude lists.
export default defineConfig({
  ...base,
  test: {
    include: ['test/docker/**/*.spec.ts'],
    testTimeout: 180_000,
    hookTimeout: 300_000,
    fileParallelism: false,
    env: base.test?.env,
  },
});
