import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables. Default to .env if DOTENV_CONFIG_PATH is not defined.
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,               // 30s per test
  retries: process.env.CI ? 2 : 0,  // retry only in CI
  workers: process.env.CI ? 4 : 2,  // parallel workers

  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
    ['list'],   // console output
  ],

  use: {
    baseURL: process.env.APP_BASE_URL || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { 
      name: 'api',      
      testMatch: /.*tests\/api\/.*\.spec\.ts/,
      use: {
        // API tests do not require browser setup
      } 
    },
    { 
      name: 'chromium', 
      testMatch: /.*tests\/(ui|e2e)\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] } 
    },
    { 
      name: 'firefox',  
      testMatch: /.*tests\/(ui|e2e)\/.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] } 
    },
    { 
      name: 'webkit',   
      testMatch: /.*tests\/(ui|e2e)\/.*\.spec\.ts/,
      use: { ...devices['Desktop Safari'] } 
    }
  ]
});
