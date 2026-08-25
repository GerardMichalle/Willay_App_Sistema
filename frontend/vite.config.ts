import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Backend Spring Boot (cuando esté listo)
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      // Panel de salud del superadmin (Parte B): mismo backend, sin /api delante.
      '/actuator': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
