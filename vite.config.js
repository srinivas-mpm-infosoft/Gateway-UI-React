import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),  tailwindcss()],
  server: {
    proxy: {
      "/login": "http://localhost:8000",
      "/logout": "http://localhost:8000",
      "/whoami": "http://localhost:8000",
      "/config": "http://localhost:8000",
      "/reset-password": "http://localhost:8000",
    },
  },
})
