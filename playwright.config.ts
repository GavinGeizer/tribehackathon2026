import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 60_000, expect: { timeout: 15_000 },
  fullyParallel: false, workers: 1,
  use: { baseURL: process.env.DEMO_BASE_URL || 'http://127.0.0.1:5173', acceptDownloads: true, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'narrow', use: { viewport: { width: 390, height: 844 } } },
  ],
  reporter: [['list'], ['json', { outputFile: 'artifacts/browser-results.json' }]],
});
