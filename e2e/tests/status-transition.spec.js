// หมวด 2 — ปุ่มเปลี่ยนสถานะ (Admin dashboard: Confirm / ลบ-Reject)
//
// ***ไฟล์นี้เขียนตามแผนที่เสนอไว้ แต่ "ยังไม่ได้ถูก execute จริงบน production" ในรอบนี้***
//
// เหตุผล: ปุ่ม Confirm (pending_admin_review -> open_for_saleng) และ ลบ/Reject (-> cancelled) เป็นการเปลี่ยน
// สถานะที่ "ไม่มี code path ย้อนกลับใดๆ ในแอปเลย" (ยืนยันจากการอ่าน webapp/admin/dashboard/app.js — จุดเดียวที่เขียน
// field `status` คือ modalConfirmBtn handler เท่านั้น ไม่มี action อื่นเปลี่ยนสถานะกลับ) ต่างจากหมวด 1 (happy-path) ที่
// user ลบคำขอ pending ของตัวเองได้เอง (reversible) หมวดนี้คือการเขียนข้อมูลถาวรบน production จริง จึงจัดอยู่ในหมวด
// action ที่ต้องได้รับการยืนยันตรงจากผู้ใช้งานจริงในแชทเท่านั้น (ไม่ใช่แค่ relay ผ่าน agent ตัวกลาง) ก่อนจะรันจริงได้
// ดูสรุปเหตุผลแบบเต็มใน test-results.md และ BACKLOG.md ของ repo นี้
//
// เมื่อได้รับการยืนยันแล้ว ให้รันไฟล์นี้ตรงๆ ด้วย `npx playwright test tests/status-transition.spec.js`
// (ต้องรันทีละ sub-case แยกกัน เพราะแต่ละ sub-case สร้าง fixture คำขอของตัวเอง แล้วจะค้างสถานะ open_for_saleng/
// cancelled ถาวรหลังรัน — ไม่มีทาง cleanup ผ่าน UI)

const { test, expect } = require('@playwright/test');
const { loginAsUser, loginAsAdmin, futureDateStr } = require('./helpers');

const USER_A_PHONE = '089-123-4567';
const USER_A_PASSWORD = 'Demo1234!';
const ADMIN_ID = 'admin1';
const ADMIN_PASSWORD = 'Demo1234!';

async function createFixtureRequest(page, tag) {
  await loginAsUser(page, USER_A_PHONE, USER_A_PASSWORD);
  await page.goto('/pickup-request/index.html');
  await page.locator('.address-card-filled').first().click();
  await page.locator('#wasteTypeGrid input[value="พลาสติก"]').check();
  await page.locator('#requested_date').fill(futureDateStr());
  await page.locator('#timeSlotRow .radio-item').first().click();
  await page.locator('#notes').fill(tag);
  await page.locator('#submitBtn').click();
  await expect(page.locator('#toast')).toContainText('ส่งคำขอสำเร็จ', { timeout: 10000 });
  await page.locator('#logoutLink').click();
}

// 2a — Confirm: pending_admin_review -> open_for_saleng (ถาวร ไม่มี rollback ผ่าน UI)
test.skip('[status-transition] admin กด Confirm แล้ว status เปลี่ยนเป็น open_for_saleng จริง — SKIPPED: รอยืนยันตรงจากผู้ใช้ก่อน execute บน production (ดู test-results.md)', async ({ page }) => {
  const tag = `[e2e-test] status-confirm ${new Date().toISOString()}`;
  await createFixtureRequest(page, tag);

  await loginAsAdmin(page, ADMIN_ID, ADMIN_PASSWORD);
  await page.locator('.chip[data-status="pending_admin_review"]').click();
  const card = page.locator('.request-card', { hasText: tag });
  await expect(card).toBeVisible({ timeout: 10000 });
  await card.locator('.request-card-header').click();

  await card.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('#modalConfirmBtn')).toBeEnabled();
  await page.locator('#modalConfirmBtn').click();

  await expect(page.locator('#toast')).toContainText('Confirm สำเร็จ');
  await page.locator('.chip[data-status="open_for_saleng"]').click();
  await expect(page.locator('.request-card', { hasText: tag })).toBeVisible({ timeout: 10000 });
});

// 2b — Reject: pending_admin_review -> cancelled, บังคับกรอก cancel_reason (ถาวร ไม่มี rollback ผ่าน UI)
test.skip('[status-transition] admin กด ลบ/Reject พร้อม cancel_reason แล้ว status เปลี่ยนเป็น cancelled จริง — SKIPPED: รอยืนยันตรงจากผู้ใช้ก่อน execute บน production (ดู test-results.md)', async ({ page }) => {
  const tag = `[e2e-test] status-reject ${new Date().toISOString()}`;
  await createFixtureRequest(page, tag);

  await loginAsAdmin(page, ADMIN_ID, ADMIN_PASSWORD);
  await page.locator('.chip[data-status="pending_admin_review"]').click();
  const card = page.locator('.request-card', { hasText: tag });
  await expect(card).toBeVisible({ timeout: 10000 });
  await card.locator('.request-card-header').click();

  await card.getByRole('button', { name: /ลบ \/ Reject/ }).click();
  await expect(page.locator('#modalConfirmBtn')).toBeDisabled();
  await page.locator('#modalReasonInput').fill(`${tag} - เหตุผลทดสอบอัตโนมัติ`);
  await expect(page.locator('#modalConfirmBtn')).toBeEnabled();
  await page.locator('#modalConfirmBtn').click();

  await expect(page.locator('#toast')).toContainText('ลบ/Reject สำเร็จ');
  await page.locator('.chip[data-status="cancelled"]').click();
  await expect(page.locator('.request-card', { hasText: tag })).toBeVisible({ timeout: 10000 });
});
