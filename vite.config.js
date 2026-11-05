import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// /api requests go to the local chat server (npm run server), which holds the Azure key.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8787' } },
})
