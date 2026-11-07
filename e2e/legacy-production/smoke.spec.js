const { test, expect } = require('@playwright/test');

test('หน้าแรกโหลดได้และมีปุ่มเข้าสู่ระบบ/สมัครใช้งาน', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/กรีนซาเล้ง/);
  await expect(page.getByRole('link', { name: 'เข้าสู่ระบบ' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'สมัครเข้าใช้งานระบบ' })).toBeVisible();
});
