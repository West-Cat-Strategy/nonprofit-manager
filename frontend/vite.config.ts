import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const hasPackage = (id: string, packageName: string): boolean =>
  id.includes(`/node_modules/${packageName}/`)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('\0vite/preload-helper') ||
            id.includes('\0commonjsHelpers') ||
            id.includes('/vite/dist/client/')
          ) {
            return 'vendor-runtime'
          }

          if (hasPackage(id, 'react') || hasPackage(id, 'react-dom') || hasPackage(id, 'react-router-dom')) {
            return 'vendor-react'
          }

          if (hasPackage(id, '@reduxjs/toolkit') || hasPackage(id, 'react-redux')) {
            return 'vendor-redux'
          }

          if (hasPackage(id, 'recharts')) {
            return 'vendor-recharts'
          }

          if (hasPackage(id, '@headlessui/react') || hasPackage(id, '@heroicons/react')) {
            return 'vendor-ui'
          }

          if (hasPackage(id, 'date-fns')) {
            return 'vendor-date'
          }

          if (hasPackage(id, '@dnd-kit/core') || hasPackage(id, '@dnd-kit/sortable') || hasPackage(id, '@dnd-kit/utilities')) {
            return 'vendor-dnd'
          }

          if (hasPackage(id, 'jspdf') || hasPackage(id, 'jspdf-autotable')) {
            return 'vendor-pdf'
          }

          if (hasPackage(id, '@stripe/react-stripe-js') || hasPackage(id, '@stripe/stripe-js')) {
            return 'vendor-stripe'
          }
        },
      },
    },
  },
  server: {
    host: true, // Listen on all local IPs
    port: 8005,
    strictPort: true,
    allowedHosts: [
      'frontend-dev',
      'nonprofit-frontend-dev',
      'localhost',
      'localhost',
      '127.0.0.1'
    ],
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://backend-dev:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        lines: 48,
        functions: 40,
        statements: 47,
        branches: 38,
      },
    },
  },
})
