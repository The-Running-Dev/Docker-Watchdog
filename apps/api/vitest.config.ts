import { defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

// Resolve @subzerodev/watchdog-shared to its TypeScript source so tests need no prior build.
const conditions = ['@subzerodev/source', ...defaultServerConditions];

export default defineConfig({
  resolve: { conditions },
  ssr: { resolve: { conditions } },
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
  },
});
