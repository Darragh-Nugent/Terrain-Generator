import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The proxy is only for local dev; in prod React will be served from Express
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
