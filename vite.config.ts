import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'apps/web'),
  plugins: [react()],
  server: { port: 3000, host: true, open: false },
  build: { outDir: path.resolve(__dirname, 'apps/web/dist'), emptyOutDir: true },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'apps/web'),
    },
  },
});
