import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In dev (port 5173), forward /api calls to the Python server (port 7860)
      '/api': 'http://localhost:7860',
    },
  },
})
