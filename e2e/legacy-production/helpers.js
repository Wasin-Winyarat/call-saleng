// Helper ที่ใช้ร่วมกันระหว่างไฟล์เทสต์ในโฟลเดอร์นี้ — login เป็น user/admin ด้วยบัญชีทดสอบที่มีอยู่แล้ว
// (ดูบัญชีที่หน้า /login/index.html และ webapp/seed/seed.js — ไม่ใช่ข้อมูลลับ เป็นบัญชี demo ที่ตั้งใจ expose ไว้)

async function loginAsUser(page, phone, password) {
  await page.goto('/login/index.html');
  await page.getByPlaceholder('08X-XXX-XXXX').fill(phone);
  await page.getByPlaceholder('รหัสผ่าน').fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard/index.html', { timeout: 10000 });
}

async function loginAsAdmin(page, loginIdentifier, password) {
  await page.goto('/admin/index.html');
  await page.getByPlaceholder('เช่น admin1').fill(loginIdentifier);
  await page.getByPlaceholder('รหัสผ่าน').fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/admin/dashboard/index.html', { timeout: 10000 });
}

function futureDateStr(daysAhead = 7) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

module.exports = { loginAsUser, loginAsAdmin, futureDateStr };
