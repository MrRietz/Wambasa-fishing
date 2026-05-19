import { defineConfig, devices } from '@playwright/test';

const localChromium = 'C:\\Users\\rietzr\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: 'http://127.0.0.1:5178',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || localChromium
        }
      }
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox']
      }
    }
  ],
  webServer: {
    command: 'npm run dev -- --port 5178',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
