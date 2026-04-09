// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const targetUrl = 'http://10.42.0.183:8000';

// const targetUrl = 'http://localhost:8000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Point to the server root, not the specific endpoint
      '/login': {
        target: targetUrl,
        changeOrigin: true,
      },
      '/logout': {
        target: targetUrl,
        changeOrigin: true,
      },
      '/whoami': {
        target: targetUrl,
        changeOrigin: true,
      },
      '/config': {
        target: targetUrl,
        changeOrigin: true,
      },
      '/reset-password': {
        target: targetUrl,
        changeOrigin: true,
      },
      '/create-user': {
        target: targetUrl,
        changeOrigin: true,
      },
    },
  },
})