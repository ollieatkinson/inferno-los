import { defineConfig } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT ?? "5173";
export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
