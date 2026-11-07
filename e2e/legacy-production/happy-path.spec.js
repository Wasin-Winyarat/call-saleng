// หมวด 1 — เส้นทางหลัก (Happy Path)
// Flow: User login (เบอร์โทร+password) -> กรอกฟอร์มสร้างคำขอ -> ส่งสำเร็จ -> เห็นคำขอในหน้าติดตามด้วยสถานะเริ่มต้น pending_admin_review
// บัญชีที่ใช้: user seed ที่มีอยู่แล้วบนหน้า /login/index.html (089-123-4567 / Demo1234!) — ไม่สร้างบัญชีใหม่
//
// **หมายเหตุความปลอดภัยของข้อมูล**: เทสต์นี้ "สร้าง" คำขอจริงใน production Firestore (collection pickup_requests)
// แต่จงใจออกแบบให้ "ลบคำขอนั้นทิ้งทันที" ในขั้นตอนสุดท้ายของเทสต์เดียวกัน โดยใช้ปุ่ม "🗑️ ลบ" ที่หน้า tracking
// ซึ่งทำได้เพราะคำขอยังอยู่สถานะ pending_admin_review และเป็นคำขอของ user เอง (ownership กับ CRUD ของ user เองบนคำขอ
// ที่ยัง pending คือ reversible flow ที่ implement ไว้แล้วในแอป) ทำให้ไม่มีข้อมูลค้างถาวรใน production หลังเทสต์นี้จบ
// ต่างจากหมวด 2 (status-transition) ที่ Confirm/Reject ไม่มีทาง rollback ผ่าน UI เลย จึงไม่ถูก execute จริงในรอบนี้
// (ดูรายละเอียดที่ e2e/tests/status-transition.spec.js และ test-results.md)

const { test, expect } = require('@playwright/test');
const { loginAsUser, futureDateStr } = require('./helpers');

const USER_A_PHONE = '089-123-4567';
const USER_A_PASSWORD = 'Demo1234!';

test('[happy-path] user สร้างคำขอเรียกรถซาเล้งสำเร็จ และเห็นคำขอในหน้าติดตามด้วยสถานะเริ่มต้นถูกต้อง', async ({ page }) => {
  const tag = `[e2e-test] happy-path ${new Date().toISOString()}`;

  await loginAsUser(page, USER_A_PHONE, USER_A_PASSWORD);

  await page.goto('/pickup-request/index.html');

  // ต้องเลือกที่อยู่ที่บันทึกไว้ก่อน — seed user นี้มี address_1 อยู่แล้ว (ยืนยันจากการสำรวจรอบก่อนหน้า)
  await page.locator('.address-card-filled').first().click();

  await page.locator('#wasteTypeGrid input[value="กระดาษ"]').check();
  await page.locator('#requested_date').fill(futureDateStr());
  await page.locator('#timeSlotRow .radio-item').first().click(); // 08:00-13:00
  await page.locator('#notes').fill(tag);

  await expect(page.locator('#submitBtn')).toBeEnabled();
  await page.locator('#submitBtn').click();

  await expect(page.locator('#toast')).toContainText('ส่งคำขอสำเร็จ', { timeout: 10000 });

  // ---- ตรวจในหน้าติดตาม ----
  await page.goto('/tracking/index.html');
  const card = page.locator('.request-card', { hasText: tag });
  await expect(card).toBeVisible({ timeout: 10000 });
  await expect(card.locator('.status-pill')).toContainText('รอ Admin ตรวจสอบ');
  await expect(card).toContainText('กระดาษ');

  // ---- cleanup: ลบคำขอทดสอบนี้ทิ้งทันที เพื่อไม่ให้ค้างเป็นข้อมูลถาวรใน production ----
  page.once('dialog', (dialog) => dialog.accept());
  await card.getByRole('button', { name: /ลบ/ }).click();
  await expect(page.locator('.request-card', { hasText: tag })).toHaveCount(0, { timeout: 10000 });
});
