// UNVERIFIED — USER MUST RUN
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'apps/web',
  server: {
    port: 3000,
    host: true,
    strictPort: false,
  },
})