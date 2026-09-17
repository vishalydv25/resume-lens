import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: {...devices["Desktop Chrome"]} },
    { name: "mobile", use: {...devices["iPhone 13"], defaultBrowserType: "chromium"} }
  ],
  webServer: {
    command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI,
    env: { GROQ_API_KEY: "", APP_ACCESS_CODE: "" }
  }
});
