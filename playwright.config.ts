import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'
const systemChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (process.platform === 'win32' && existsSync(systemChrome) ? systemChrome : undefined)
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 45_000,
  use: { ...devices['Desktop Chrome'], launchOptions: { executablePath }, trace: 'retain-on-failure' },
  projects: [
    { name: 'demo', testMatch: 'demo.spec.ts', use: { baseURL: 'http://127.0.0.1:4173' } },
    { name: 'firebase', testMatch: 'firebase.spec.ts', use: { baseURL: 'http://127.0.0.1:4174' } },
  ],
  webServer: process.argv.includes('--project=firebase')
    ? {
        command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
        url: 'http://127.0.0.1:4174',
        env: { VITE_USE_EMULATORS: 'true' },
        timeout: 30_000,
      }
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
})
