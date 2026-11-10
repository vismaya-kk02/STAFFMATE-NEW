import react from '@vitejs/plugin-react'
import { defineConfig, type ProxyOptions } from 'vite'

// Laravel Sail publishes the application on host port 80.
const backend = 'http://127.0.0.1'

const apiProxy: ProxyOptions = {
  target: backend,
  changeOrigin: false,
}

const resetPasswordProxy: ProxyOptions = {
  ...apiProxy,
  bypass(request) {
    if (request.method !== 'POST') {
      return '/index.html'
    }
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    allowedHosts: ['admin.localhost'],
    origin: 'http://admin.localhost:5173',
    hmr: {
      host: 'admin.localhost',
      clientPort: 5173,
    },
    proxy: {
      '/api': apiProxy,
      '/sanctum': apiProxy,
      '/login': apiProxy,
      '/logout': apiProxy,
      '/forgot-password': apiProxy,
      '/reset-password': resetPasswordProxy,
      '/two-factor-challenge': apiProxy,
      '/user': apiProxy,
      '/email': apiProxy,
    },
  },
})
