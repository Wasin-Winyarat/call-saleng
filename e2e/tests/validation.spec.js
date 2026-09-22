// หมวด 3 — กรอกไม่ครบแล้วต้องไม่บันทึก (Validation)
// (a) ฟอร์มสร้างคำขอ (/pickup-request/) — ปุ่ม "ส่งคำขอ" ต้อง disabled จนกว่าจะกรอก/เลือกครบทุก field ที่บังคับ
// (b) Admin reject modal — ปุ่ม "ยืนยัน" ต้อง disabled จนกว่าจะกรอก cancel_reason ที่ไม่ใช่ whitespace-only
//
// ทั้งสอง sub-case ไม่มีการบันทึกข้อมูลจริงเกิดขึ้นเลยตลอดเทสต์ (ปุ่มค้าง disabled หรือถูกกด "ยกเลิก"/"ปิด" เสมอ
// ไม่มีจุดใดกด submit/ยืนยันจริง) sub-case (b) ต้องมีคำขอ pending_admin_review อย่างน้อย 1 รายการเป็น fixture
// จึงสร้าง+ลบ fixture ของตัวเอง (เหมือน happy-path.spec.js) เพื่อไม่ต้องพึ่งข้อมูล seed ที่อาจถูกใช้ไปแล้ว

const { test, expect } = require('@playwright/test');
const { loginAsUser, loginAsAdmin, futureDateStr } = require('./helpers');

const USER_A_PHONE = '089-123-4567';
const USER_A_PASSWORD = 'Demo1234!';
const ADMIN_ID = 'admin1';
const ADMIN_PASSWORD = 'Demo1234!';

test('[validation-a] ฟอร์มสร้างคำขอ: ปุ่มส่งคำขอ disabled จนกรอก/เลือกครบทุก field บังคับ (ไม่ submit จริง)', async ({ page }) => {
  await loginAsUser(page, USER_A_PHONE, USER_A_PASSWORD);
  await page.goto('/pickup-request/index.html');

  await expect(page.locator('#submitBtn')).toBeDisabled(); // ยังไม่เลือกที่อยู่/ขยะ/วันที่/ช่วงเวลาเลย

  await page.locator('.address-card-filled').first().click();
  await expect(page.locator('#submitBtn')).toBeDisabled(); // ขาด waste type + date + time slot

  await page.locator('#wasteTypeGrid input[value="อลูมิเนียม"]').check();
  await expect(page.locator('#submitBtn')).toBeDisabled(); // ขาด date + time slot

  await page.locator('#requested_date').fill(futureDateStr());
  await expect(page.locator('#submitBtn')).toBeDisabled(); // ขาด time slot เท่านั้น

  await page.locator('#timeSlotRow .radio-item').nth(1).click(); // 13:00-18:00
  await expect(page.locator('#submitBtn')).toBeEnabled(); // ครบทุก field แล้ว — ปุ่มต้อง enabled

  // หมายเหตุ: จงใจไม่กด submit ต่อ เพื่อไม่ให้เทสต์นี้เขียนข้อมูลจริงลง production (ไม่ใช่จุดประสงค์ของหมวด validation)
});

test('[validation-b] Admin reject modal: ปุ่มยืนยัน disabled จนกรอก cancel_reason ที่ไม่ใช่ whitespace (ไม่กดยืนยันจริง)', async ({ page }) => {
  const tag = `[e2e-test] validation-b ${new Date().toISOString()}`;

  // ---- สร้าง fixture คำขอ pending_admin_review ของตัวเองก่อน ----
  await loginAsUser(page, USER_A_PHONE, USER_A_PASSWORD);
  await page.goto('/pickup-request/index.html');
  await page.locator('.address-card-filled').first().click();
  await page.locator('#wasteTypeGrid input[value="เหล็ก"]').check();
  await page.locator('#requested_date').fill(futureDateStr());
  await page.locator('#timeSlotRow .radio-item').first().click();
  await page.locator('#notes').fill(tag);
  await page.locator('#submitBtn').click();
  await expect(page.locator('#toast')).toContainText('ส่งคำขอสำเร็จ', { timeout: 10000 });
  await page.locator('#logoutLink').click();

  // ตั้งแต่จุดนี้เป็นต้นไป มี fixture จริงอยู่บน production แล้ว — ครอบด้วย try/finally เพื่อไม่ให้ค้าง
  // ถ้าขั้นตอนฝั่ง admin ล่างนี้ fail กลางทาง (เช่น เจอ transient navigation error) cleanup ต้องรันเสมอ
  try {
    // ---- สลับไปฝั่ง admin เพื่อทดสอบ validation ของ reject modal ----
    await loginAsAdmin(page, ADMIN_ID, ADMIN_PASSWORD);
    await page.locator('.chip[data-status="pending_admin_review"]').click();
    const card = page.locator('.request-card', { hasText: tag });
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.locator('.request-card-header').click();

    await card.getByRole('button', { name: /ลบ \/ Reject/ }).click();
    const modalConfirmBtn = page.locator('#modalConfirmBtn');
    await expect(modalConfirmBtn).toBeDisabled(); // เพิ่งเปิด modal ช่องเหตุผลยังว่าง

    await page.locator('#modalReasonInput').fill('   '); // whitespace-only
    await expect(modalConfirmBtn).toBeDisabled(); // ต้อง trim() แล้วยังว่าง

    await page.locator('#modalReasonInput').fill(`${tag} - เหตุผลทดสอบ ไม่กดยืนยันจริง`);
    await expect(modalConfirmBtn).toBeEnabled(); // มีข้อความจริงแล้ว ต้อง enabled

    // ปิด modal ด้วยปุ่ม "ยกเลิก" เท่านั้น — ห้ามกด "ยืนยัน" เด็ดขาด เพื่อไม่เปลี่ยน status จริงของ fixture นี้
    await page.locator('#modalCancelBtn').click();
    await expect(page.locator('#confirmModal')).not.toHaveClass(/open/);
    await page.locator('#logoutLink').click();
  } finally {
    // ---- cleanup: กลับไปเป็น user A ลบ fixture ทิ้งเสมอ ไม่ว่า block ด้านบนจะผ่านหรือ throw ----
    await loginAsUser(page, USER_A_PHONE, USER_A_PASSWORD);
    await page.goto('/tracking/index.html');
    const trackingCard = page.locator('.request-card', { hasText: tag });
    await expect(trackingCard).toBeVisible({ timeout: 10000 });
    page.once('dialog', (dialog) => dialog.accept());
    await trackingCard.getByRole('button', { name: /ลบ/ }).click();
    await expect(page.locator('.request-card', { hasText: tag })).toHaveCount(0, { timeout: 10000 });
  }
});
