// @ts-check
// ทดสอบกับ Firebase Emulator ในเครื่องเท่านั้น (Auth + Firestore + Hosting) — ไม่แตะ production
// Playwright สั่งเปิด emulator ให้เอง (webServer) ถ้ายังไม่ได้เปิดไว้ — ดูวิธีรันใน e2e/README.md
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  // ทุกเทสต์ใช้ emulator ชุดเดียวกันและล้างข้อมูลก่อนเริ่ม → ต้องรันทีละเทสต์
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://127.0.0.1:5050',
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'firebase emulators:start --only auth,firestore,hosting --project demo-callsaleng',
    cwd: '..',
    url: 'http://127.0.0.1:5050/index.html',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
