const { defineConfig, devices } = require("@playwright/test");
const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const API_URL = process.env.API_URL || "http://localhost:3001";
process.env.BASE_URL = BASE_URL;
process.env.API_URL = API_URL;
module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60 * 1000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    apiURL: API_URL,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } }
  ],
});
