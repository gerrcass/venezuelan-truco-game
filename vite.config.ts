import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative paths keep the GitHub Pages build portable.
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    // The Playwright journey lives in e2e/ and is not a Vitest suite.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
