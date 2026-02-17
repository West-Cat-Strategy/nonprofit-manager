import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — cached across all routes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // State management
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          // Heavy charting library — only loaded on analytics pages
          'vendor-recharts': ['recharts'],
          // UI libraries
          'vendor-ui': ['@headlessui/react', '@heroicons/react'],
          // Date utilities
          'vendor-date': ['date-fns'],
          // Drag and drop
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          // PDF generation — only loaded when exporting
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          // Stripe — only loaded on payment pages
          'vendor-stripe': ['@stripe/react-stripe-js', '@stripe/stripe-js'],
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
      'cbis-playground.westcat.ca',
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
        lines: 65,
        functions: 65,
        statements: 65,
        branches: 55,
      },
    },
  },
})
