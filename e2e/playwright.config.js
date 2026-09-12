// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',

  use: {
    baseURL: 'https://callsaleng.web.app',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // firefox: ปิดไว้ชั่วคราว — เครื่องนี้รัน firefox.exe ไม่ขึ้น (side-by-side error
    // เรื่อง assembly "mozglue" หา manifest ไม่เจอ ไม่เกี่ยวกับ VC++ Redistributable
    // ที่ติดตั้งไปแล้ว) เปิดกลับมาได้ด้วยการลบคอมเมนต์บรรทัดล่างเมื่อแก้ปัญหาเครื่องได้
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
