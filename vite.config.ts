import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/vendor/ai-guardrails-admin/',
  publicDir: false,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'public/vendor/ai-guardrails-admin',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: { input: 'resources/js/main.tsx' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/js/setup.ts'],
    include: ['tests/js/**/*.test.{ts,tsx}'],
    globals: true,
  },
});
