import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const hasPackage = (id: string, packageName: string): boolean =>
  id.includes(`/node_modules/${packageName}/`)

const normalizeId = (id: string): string => id.replace(/\\/g, '/')

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: 'index.html',
        grantsSmoke: 'grants-smoke.html',
      },
      output: {
        manualChunks(id) {
          const normalizedId = normalizeId(id)

          // Keep admin route modules with the core route shell to avoid a compiled
          // cyclic chunk between shared route metadata/path helpers and admin redirects.
          if (
            normalizedId.includes('/src/routes/index.tsx') ||
            normalizedId.includes('/src/routes/adminRoutes.tsx') ||
            normalizedId.includes('/src/routes/routeMeta.ts') ||
            normalizedId.includes('/src/features/auth/routeComponents.tsx') ||
            normalizedId.includes('/src/features/adminOps/routeComponents.tsx') ||
            normalizedId.includes('/src/features/adminOps/adminRoutePaths.ts')
          ) {
            return 'routes-core'
          }

          if (
            normalizedId.includes('/src/routes/peopleRoutes.tsx') ||
            normalizedId.includes('/src/features/accounts/routeComponents.tsx') ||
            normalizedId.includes('/src/features/contacts/routeComponents.tsx') ||
            normalizedId.includes('/src/features/volunteers/routeComponents.tsx')
          ) {
            return 'routes-people'
          }

          if (
            normalizedId.includes('/src/routes/engagementRoutes.tsx') ||
            normalizedId.includes('/src/features/engagement/routeComponents.tsx') ||
            normalizedId.includes('/src/features/events/routeComponents.tsx') ||
            normalizedId.includes('/src/features/tasks/routeComponents.tsx') ||
            normalizedId.includes('/src/features/cases/routeComponents.tsx') ||
            normalizedId.includes('/src/features/followUps/routeComponents.tsx') ||
            normalizedId.includes('/src/features/teamChat/routeComponents.tsx')
          ) {
            return 'routes-engagement'
          }

          if (
            normalizedId.includes('/src/routes/financeRoutes.tsx') ||
            normalizedId.includes('/src/features/finance/routeComponents.tsx')
          ) {
            return 'routes-finance'
          }

          if (
            normalizedId.includes('/src/routes/analyticsRoutes.tsx') ||
            normalizedId.includes('/src/features/analytics/routeComponents.tsx') ||
            normalizedId.includes('/src/features/alerts/routeComponents.tsx') ||
            normalizedId.includes('/src/features/dashboard/routeComponents.tsx')
          ) {
            return 'routes-analytics'
          }

          if (
            normalizedId.includes('/src/routes/builderRoutes.tsx') ||
            normalizedId.includes('/src/routes/websiteRoutes.tsx') ||
            normalizedId.includes('/src/features/builder/routeComponents.tsx') ||
            normalizedId.includes('/src/features/websites/routeComponents.tsx')
          ) {
            return 'routes-builder'
          }

          if (
            normalizedId.includes('/src/routes/workflowRoutes.tsx') ||
            normalizedId.includes('/src/features/workflows/routeComponents.tsx')
          ) {
            return 'routes-workflow'
          }

          if (
            normalizedId.includes('/src/routes/portalRoutes.tsx') ||
            normalizedId.includes('/src/features/portal/routeComponents.tsx')
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

          if (hasPackage(normalizedId, '@heroicons/react')) {
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
      // Vitest 4 uses the include glob to discover uncovered source files.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/__tests__/**',
        'src/test/**',
      ],
      reporter: ['text', 'json-summary', 'html'],
      ...(process.env.VITEST_RELAX_COVERAGE_THRESHOLDS === '1' ||
      (process.argv.includes('--coverage') &&
        process.argv.some(
          (arg) =>
            arg.includes('/__tests__/') ||
            arg.endsWith('.test.ts') ||
            arg.endsWith('.test.tsx') ||
            arg.endsWith('.spec.ts') ||
            arg.endsWith('.spec.tsx')
        ))
        ? {}
        : {
            thresholds: {
              lines: 48,
              functions: 40,
              statements: 47,
              branches: 38,
            },
          }),
    },
  },
})
