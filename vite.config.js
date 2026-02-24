// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Point to the server root, not the specific endpoint
      '/login': {
        target: 'http://192.168.0.127:8000',
        changeOrigin: true,
      },
      '/logout': {
        target: 'http://192.168.0.127:8000',
        changeOrigin: true,
      },
      '/whoami': {
        target: 'http://192.168.0.127:8000',
        changeOrigin: true,
      },
      '/config': {
        target: 'http://192.168.0.127:8000',
        changeOrigin: true,
      },
      '/reset-password': {
        target: 'http://192.168.0.127:8000',
        changeOrigin: true,
      },
      '/create-user': {
        target: 'http://192.168.0.127:8000',
        changeOrigin: true,
      },
    },
  },
})