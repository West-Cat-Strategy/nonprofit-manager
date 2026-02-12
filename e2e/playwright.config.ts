import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import { getSharedTestUser } from './helpers/testUser';

// Load environment variables from .env.test if it exists
dotenv.config({ path: '.env.test' });

getSharedTestUser();

/**
 * Playwright Configuration for Nonprofit Manager E2E Tests
 *
 * See https://playwright.dev/docs/test-configuration
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3001';
process.env.BASE_URL = BASE_URL;
process.env.API_URL = API_URL;
const SKIP_WEBSERVER = process.env.SKIP_WEBSERVER === '1';
export default defineConfig({
  testDir: './tests',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 1,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: BASE_URL,

    // API endpoint
    apiURL: API_URL,

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on first retry
    video: 'retain-on-failure',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Browser viewport
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors (for local development)
    ignoreHTTPSErrors: true,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },

    // Tablet viewports
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] },
    },
  ],

  // Run local dev servers before starting tests
  webServer: SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: 'cd ../backend && npm run dev',
          url: 'http://localhost:3001/health/live',
          timeout: 120 * 1000,
          reuseExistingServer: false,
          env: {
            NODE_ENV: 'test',
            PORT: '3001',
            REDIS_ENABLED: 'false',
            DB_HOST: 'localhost',
            DB_PORT: '5433',
            DB_NAME: 'nonprofit_manager',
            DB_USER: 'postgres',
            DB_PASSWORD: 'postgres',
          },
        },
        {
          command: 'cd ../frontend && npm run dev',
          url: 'http://localhost:5173',
          timeout: 120 * 1000,
          reuseExistingServer: false,
          env: {
            VITE_API_URL: 'http://localhost:3001/api',
          },
        },
      ],
});
