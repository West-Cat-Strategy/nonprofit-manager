import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const hasPackage = (id: string, packageName: string): boolean =>
  id.includes(`/node_modules/${packageName}/`)

const normalizeId = (id: string): string => id.replace(/\\/g, '/')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = normalizeId(id)

          if (
            normalizedId.includes('/src/routes/index.tsx') ||
            normalizedId.includes('/src/routes/authRoutes.tsx') ||
            normalizedId.includes('/src/routes/authRouteComponents.tsx') ||
            normalizedId.includes('/src/routes/routeMeta.ts')
          ) {
            return 'routes-core'
          }

          if (
            normalizedId.includes('/src/routes/peopleRoutes.tsx') ||
            normalizedId.includes('/src/routes/peopleRouteComponents.tsx')
          ) {
            return 'routes-people'
          }

          if (
            normalizedId.includes('/src/routes/engagementRoutes.tsx') ||
            normalizedId.includes('/src/routes/engagementRouteComponents.tsx')
          ) {
            return 'routes-engagement'
          }

          if (
            normalizedId.includes('/src/routes/financeRoutes.tsx') ||
            normalizedId.includes('/src/routes/financeRouteComponents.tsx')
          ) {
            return 'routes-finance'
          }

          if (
            normalizedId.includes('/src/routes/analyticsRoutes.tsx') ||
            normalizedId.includes('/src/routes/analyticsRouteComponents.tsx')
          ) {
            return 'routes-analytics'
          }

          if (
            normalizedId.includes('/src/routes/adminRoutes.tsx') ||
            normalizedId.includes('/src/routes/adminRouteComponents.tsx')
          ) {
            return 'routes-admin'
          }

          if (
            normalizedId.includes('/src/routes/builderRoutes.tsx') ||
            normalizedId.includes('/src/routes/builderRouteComponents.tsx')
          ) {
            return 'routes-builder'
          }

          if (
            normalizedId.includes('/src/routes/workflowRoutes.tsx') ||
            normalizedId.includes('/src/routes/workflowRouteComponents.tsx')
          ) {
            return 'routes-workflow'
          }

          if (
            normalizedId.includes('/src/routes/portalRoutes.tsx') ||
            normalizedId.includes('/src/routes/portalRouteComponents.tsx')
          ) {
            return 'routes-portal'
          }

          if (
            normalizedId.includes('/src/features/cases/state/') ||
            normalizedId.includes('/src/features/contacts/state/') ||
            normalizedId.includes('/src/features/outcomes/state/') ||
            normalizedId.includes('/src/features/reports/state/') ||
            normalizedId.includes('/src/features/savedReports/state/') ||
            normalizedId.includes('/src/features/scheduledReports/state/')
          ) {
            return 'state-casework'
          }

          if (
            normalizedId.includes('\0vite/preload-helper') ||
            normalizedId.includes('\0commonjsHelpers') ||
            normalizedId.includes('/vite/dist/client/')
          ) {
            return 'vendor-runtime'
          }

          if (hasPackage(normalizedId, 'react') || hasPackage(normalizedId, 'react-dom') || hasPackage(normalizedId, 'react-router-dom')) {
            return 'vendor-react'
          }

          if (hasPackage(normalizedId, '@reduxjs/toolkit') || hasPackage(normalizedId, 'react-redux')) {
            return 'vendor-redux'
          }

          if (hasPackage(normalizedId, 'recharts')) {
            return 'vendor-recharts'
          }

          if (hasPackage(normalizedId, '@headlessui/react') || hasPackage(normalizedId, '@heroicons/react')) {
            return 'vendor-ui'
          }

          if (hasPackage(normalizedId, 'date-fns')) {
            return 'vendor-date'
          }

          if (hasPackage(normalizedId, '@dnd-kit/core') || hasPackage(normalizedId, '@dnd-kit/sortable') || hasPackage(normalizedId, '@dnd-kit/utilities')) {
            return 'vendor-dnd'
          }

          if (hasPackage(normalizedId, 'jspdf') || hasPackage(normalizedId, 'jspdf-autotable')) {
            return 'vendor-pdf'
          }

          if (hasPackage(normalizedId, '@stripe/react-stripe-js') || hasPackage(normalizedId, '@stripe/stripe-js')) {
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
        lines: 48,
        functions: 40,
        statements: 47,
        branches: 38,
      },
    },
  },
})
