// test fixture กลาง: ทุกเทสต์ได้ `seed` (ข้อมูลตั้งต้นใหม่ทุกครั้ง) + helper login ผ่าน UI จริง
// และ `newPage()` สำหรับเปิดอีกบัญชีในเบราว์เซอร์แยก (เช่น admin กับซาเล้งพร้อมกันเพื่อดู real-time)

const base = require('@playwright/test');
const { seedBase, PASSWORD } = require('./seed');

const test = base.test.extend({
  seed: async ({}, use) => {
    await use(await seedBase());
  },

  // เปิด browser context ใหม่ (session แยก) — ปิดให้อัตโนมัติตอนจบเทสต์
  newPage: async ({ browser }, use) => {
    const contexts = [];
    await use(async () => {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      page.on('dialog', (d) => d.accept()); // window.confirm() → กดตกลง
      return page;
    });
    await Promise.all(contexts.map((c) => c.close()));
  },

  page: async ({ page }, use) => {
    page.on('dialog', (d) => d.accept());
    await use(page);
  },
});

async function loginUser(page, user) {
  await page.goto('/login/index.html');
  await page.locator('#phone').fill(user.phone);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#submitBtn').click();
  await page.waitForURL('**/dashboard/index.html');
}

async function loginAdmin(page, admin, landing = '/admin/dashboard/index.html') {
  await page.goto('/admin/index.html');
  await page.locator('#login_identifier').fill(admin.id);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#submitBtn').click();
  await page.waitForURL('**/admin/dashboard/index.html');
  if (!landing.endsWith('/admin/dashboard/index.html')) await page.goto(landing);
}

async function loginSaleng(page, saleng) {
  await page.goto('/saleng/login/index.html');
  await page.locator('#phone').fill(saleng.phone);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#submitBtn').click();
  await page.waitForURL('**/saleng/jobs/index.html');
}

// การ์ดคำขอในหน้า admin dashboard (หาจากชื่อผู้ติดต่อ) — กดเปิดรายละเอียดให้ด้วย
async function openAdminCard(page, { status = '', text }) {
  await page.locator(`#filterRow .chip[data-status="${status}"]`).click();
  const card = page.locator('#requestList .request-card').filter({ hasText: text }).first();
  await base.expect(card).toBeVisible();
  // dashboard จำการ์ดที่เปิดไว้ (openCards) — คลิกเฉพาะตอนยังปิดอยู่ ไม่งั้นจะกลายเป็นปิดการ์ด
  if (!/\bopen\b/.test((await card.getAttribute('class')) || '')) {
    await card.locator('.request-card-header').click();
  }
  await base.expect(card).toHaveClass(/open/);
  return card;
}

// รูป PNG 8x8 ใช้แนบไฟล์ (หน้าเว็บย่อเป็น JPEG ผ่าน canvas เอง)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC',
  'base64',
);
const pngFile = (name) => ({ name, mimeType: 'image/png', buffer: TINY_PNG });

module.exports = { test, expect: base.expect, loginUser, loginAdmin, loginSaleng, openAdminCard, pngFile };
