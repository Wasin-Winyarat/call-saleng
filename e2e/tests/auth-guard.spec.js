// หมวด 4 — ไม่ล็อกอินแล้วอ่านข้อมูลไม่ได้ (UI-level)
// ทุกหน้าที่ต้อง login (ฝั่ง user และ admin) ต้อง redirect ไปหน้า login ทันทีเมื่อไม่มี session
// (auth.onAuthStateChanged guard ใน webapp/*/app.js) — เทสต์นี้เป็นแค่ชั้น UI เท่านั้น
// การพิสูจน์ระดับข้อมูลจริง (Firestore rule) อยู่ที่ e2e/scripts/unauth-read.js แยกออกไป
// ไม่มีการ login และไม่มีการเขียนข้อมูลใดๆ ในไฟล์นี้เลย — read-only ทั้งหมด

const { test, expect } = require('@playwright/test');

const PROTECTED_USER_PAGES = [
  '/dashboard/index.html',
  '/tracking/index.html',
  '/profile/index.html',
  '/pickup-request/index.html',
];

for (const path of PROTECTED_USER_PAGES) {
  test(`[auth-guard] ไม่ login แล้วเข้า ${path} ต้องถูกเด้งไปหน้า login ของ user`, async ({ page }) => {
    await page.goto(path);
    await page.waitForURL('**/login/index.html', { timeout: 8000 });
    expect(page.url()).toContain('/login/index.html');
  });
}

test('[auth-guard] ไม่ login แล้วเข้า admin dashboard ต้องถูกเด้งไปหน้า admin login', async ({ page }) => {
  await page.goto('/admin/dashboard/index.html');
  await page.waitForURL('**/admin/index.html', { timeout: 8000 });
  expect(page.url()).toMatch(/\/admin\/index\.html$/);
});
