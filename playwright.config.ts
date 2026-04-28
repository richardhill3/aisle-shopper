import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:8081",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run api:dev",
      env: {
        API_ENABLE_TEST_AUTH_BYPASS: "true",
        DATABASE_URL:
          process.env.DATABASE_URL ??
          "postgres://postgres:postgres@localhost:5432/aisle_shopper",
        PORT: "3000",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      url: "http://127.0.0.1:3000/api/v1/health",
    },
    {
      command:
        "npx expo export --platform web --output-dir dist-e2e && npx serve dist-e2e --single --listen 8081",
      env: {
        EXPO_NO_TELEMETRY: "1",
        EXPO_PUBLIC_API_URL: "http://127.0.0.1:3000",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      url: "http://127.0.0.1:8081",
    },
  ],
});
