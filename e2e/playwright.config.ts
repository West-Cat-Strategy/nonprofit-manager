import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load the shared test defaults first, then let local overrides win explicitly.
dotenv.config({ path: '.env.test', quiet: true, override: true });
dotenv.config({ path: '.env.test.local', quiet: true, override: true });

/**
 * Playwright Configuration for Nonprofit Manager E2E Tests
 *
 * See https://playwright.dev/docs/test-configuration
 */
const HTTP_SCHEME = ['http', '://'].join('');
const E2E_BACKEND_HOST = process.env.E2E_BACKEND_HOST || '127.0.0.1';
const E2E_FRONTEND_HOST = process.env.E2E_FRONTEND_HOST || '127.0.0.1';
const E2E_BACKEND_PORT = process.env.E2E_BACKEND_PORT || '3001';
const E2E_FRONTEND_PORT = process.env.E2E_FRONTEND_PORT || '5173';
const DEFAULT_BASE_URL = `${HTTP_SCHEME}${E2E_FRONTEND_HOST}:${E2E_FRONTEND_PORT}`;
const DEFAULT_API_URL = `${HTTP_SCHEME}${E2E_BACKEND_HOST}:${E2E_BACKEND_PORT}`;
const BASE_URL = process.env.BASE_URL || DEFAULT_BASE_URL;
const API_URL = process.env.API_URL || DEFAULT_API_URL;
process.env.BASE_URL = BASE_URL;
process.env.API_URL = API_URL;
const SKIP_WEBSERVER = process.env.SKIP_WEBSERVER === '1';
const RUNNING_IN_CI = ['1', 'true'].includes((process.env.CI || '').toLowerCase());
const USE_DEV_RUNTIME = process.env.E2E_USE_DEV_RUNTIME === '1';
const FORCE_COMPILED_RUNTIME = process.env.E2E_FORCE_COMPILED_RUNTIME === '1';
const REUSE_EXISTING_SERVER = process.env.PW_REUSE_EXISTING_SERVER === '1';
const requestedComposeMode = (
  process.env.E2E_COMPOSE_MODE ||
  process.env.COMPOSE_MODE ||
  (RUNNING_IN_CI ? 'ci' : 'prod')
).toLowerCase();
const E2E_COMPOSE_MODE = (
  requestedComposeMode === 'production' ? 'prod' :
    requestedComposeMode === 'development' ? 'dev' :
      requestedComposeMode === 'ci' ? 'ci' :
        requestedComposeMode === 'dev' ? 'dev' : 'prod'
);
const E2E_COMPOSE_PROJECT_NAME = process.env.E2E_COMPOSE_PROJECT_NAME || process.env.COMPOSE_PROJECT_NAME || '';
const E2E_COMPOSE_FILES = process.env.E2E_COMPOSE_FILES || process.env.COMPOSE_FILES || '';
const E2E_COMPOSE_ENV_FILE =
  process.env.E2E_COMPOSE_ENV_FILE || process.env.COMPOSE_ENV_FILE || '.env.development';
const E2E_DB_HOST = process.env.E2E_DB_HOST || process.env.DB_HOST || '127.0.0.1';
const E2E_DB_PORT = process.env.E2E_DB_PORT || process.env.DB_PORT || '8012';
const E2E_DB_NAME =
  process.env.E2E_DB_NAME || process.env.DB_NAME || process.env.TEST_DB_NAME || 'nonprofit_manager_test';
const E2E_DB_USER = process.env.E2E_DB_USER || process.env.DB_USER || 'postgres';
const E2E_DB_PASSWORD = process.env.E2E_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres';
const clearFrontendPortCommand =
  `for p in $(lsof -ti tcp:${E2E_FRONTEND_PORT} 2>/dev/null); do kill -9 "$p" 2>/dev/null || true; done`;
const useCompiledCiRuntime = FORCE_COMPILED_RUNTIME || (RUNNING_IN_CI && !USE_DEV_RUNTIME);
const WEB_SERVER_TIMEOUT_MS = RUNNING_IN_CI ? 300 * 1000 : 120 * 1000;

const backendRuntimeCommand = useCompiledCiRuntime
  ? 'npm run build && node dist/index.js'
  : 'npx ts-node -r tsconfig-paths/register --transpileOnly src/index.ts';
const backendStartCommand = `cd .. && DB_AUTO_START=true COMPOSE_MODE=ci DB_HOST=${E2E_DB_HOST} DB_PORT=${E2E_DB_PORT} DB_NAME=${E2E_DB_NAME} DB_USER=${E2E_DB_USER} DB_PASSWORD=${E2E_DB_PASSWORD} ./scripts/db-migrate.sh && cd backend && ${backendRuntimeCommand}`;

const frontendRuntimeCommand = useCompiledCiRuntime
  ? `${clearFrontendPortCommand} && npm run build && ${clearFrontendPortCommand} && npx vite preview --host ${E2E_FRONTEND_HOST} --port ${E2E_FRONTEND_PORT} --strictPort`
  : `${clearFrontendPortCommand} && npm run dev -- --host ${E2E_FRONTEND_HOST} --port ${E2E_FRONTEND_PORT}`;
const frontendStartCommand = `cd ../frontend && ${frontendRuntimeCommand}`;
export default defineConfig({
  testDir: './tests',

  // Maximum time one test can run
  timeout: 120 * 1000,

  // Test execution settings
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: RUNNING_IN_CI ? 1 : 0,
  workers: 1,

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

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on first retry
    video: RUNNING_IN_CI ? 'retain-on-failure' : 'off',

    // Collect trace on failure
    trace: RUNNING_IN_CI ? 'on-first-retry' : 'off',

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
        command: backendStartCommand,
        url: `${HTTP_SCHEME}${E2E_BACKEND_HOST}:${E2E_BACKEND_PORT}/health/live`,
        timeout: WEB_SERVER_TIMEOUT_MS,
        reuseExistingServer: REUSE_EXISTING_SERVER,
        env: {
          NODE_ENV: 'test',
          PORT: E2E_BACKEND_PORT,
          BYPASS_REGISTRATION_POLICY_IN_TEST:
            process.env.BYPASS_REGISTRATION_POLICY_IN_TEST || 'true',
          COMPOSE_MODE: E2E_COMPOSE_MODE,
          ...(E2E_COMPOSE_PROJECT_NAME ? { COMPOSE_PROJECT_NAME: E2E_COMPOSE_PROJECT_NAME } : {}),
          ...(E2E_COMPOSE_FILES ? { COMPOSE_FILES: E2E_COMPOSE_FILES } : {}),
          COMPOSE_ENV_FILE: E2E_COMPOSE_ENV_FILE,
          REDIS_ENABLED: 'false',
          CORS_ORIGIN: `${HTTP_SCHEME}${E2E_FRONTEND_HOST}:${E2E_FRONTEND_PORT},${HTTP_SCHEME}localhost:${E2E_FRONTEND_PORT}`,
          DB_HOST: E2E_DB_HOST,
          DB_PORT: E2E_DB_PORT,
          DB_NAME: E2E_DB_NAME,
          DB_USER: E2E_DB_USER,
          DB_PASSWORD: E2E_DB_PASSWORD,
          DB_AUTO_START: 'true',
          RATE_LIMIT_WINDOW_MS: '900000',
          RATE_LIMIT_MAX_REQUESTS: '100000',
          AUTH_RATE_LIMIT_WINDOW_MS: '900000',
          AUTH_RATE_LIMIT_MAX_REQUESTS: '100000',
          REGISTRATION_MAX_ATTEMPTS: '100000',
          MAX_LOGIN_ATTEMPTS: '1000',
        },
      },
      {
        command: frontendStartCommand,
        url: `${HTTP_SCHEME}${E2E_FRONTEND_HOST}:${E2E_FRONTEND_PORT}`,
        timeout: WEB_SERVER_TIMEOUT_MS,
        reuseExistingServer: REUSE_EXISTING_SERVER,
        env: {
          VITE_API_URL: `${HTTP_SCHEME}${E2E_BACKEND_HOST}:${E2E_BACKEND_PORT}/api`,
        },
      },
    ],
});
