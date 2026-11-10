import react from '@vitejs/plugin-react'
import { defineConfig, type ProxyOptions } from 'vite'

// Laravel Sail publishes the application on host port 80.
const backend = 'http://127.0.0.1'

const apiProxy: ProxyOptions = {
  target: backend,
  changeOrigin: false,
}

/**
 * Fortify auth endpoints share pathnames with SPA routes.
 * Proxy only mutating methods to Laravel; GET (and other safe methods)
 * fall through to Vite's SPA index.html so React Router can own the URL.
 */
const spaAuthProxy: ProxyOptions = {
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
    allowedHosts: ['app.localhost'],
    origin: 'http://app.localhost:5173',
    hmr: {
      host: 'app.localhost',
      clientPort: 5173,
    },
    proxy: {
      '/api': apiProxy,
      '/sanctum': apiProxy,
      '/login': spaAuthProxy,
      '/logout': apiProxy,
      '/forgot-password': spaAuthProxy,
      '/reset-password': spaAuthProxy,
      '/two-factor-challenge': apiProxy,
      '/user': apiProxy,
      '/email': apiProxy,
    },
  },
})
