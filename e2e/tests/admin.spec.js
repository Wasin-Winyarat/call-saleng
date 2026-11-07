// ฝั่ง Admin: login / Confirm / Reject (ต้องมีเหตุผล) / แก้วัน-เวลานัด / แชทกับลูกค้า
const { test, expect, loginUser, loginAdmin, openAdminCard } = require('../lib/fixtures');
const { createRequest, futureDate, PASSWORD } = require('../lib/seed');
const emu = require('../lib/emulator');

test.describe('Admin login', () => {
  test('รหัสผ่านผิด → แจ้ง error', async ({ page, seed }) => {
    await page.goto('/admin/index.html');
    await page.locator('#login_identifier').fill('admin1');
    await page.locator('#password').fill('wrong');
    await page.locator('#submitBtn').click();
    await expect(page.locator('#errorBanner')).toContainText('ไม่ถูกต้อง');
  });

  test('บัญชีที่ไม่มีใน admin_accounts → ถูกเด้งออกจาก dashboard', async ({ page, seed }) => {
    // สร้างบัญชี auth โดเมน admin แต่ไม่มี doc ใน admin_accounts
    await emu.signUp('notadmin@callsaleng-admin.app', PASSWORD);
    await page.goto('/admin/index.html');
    await page.locator('#login_identifier').fill('notadmin');
    await page.locator('#password').fill(PASSWORD);
    await page.locator('#submitBtn').click();
    await expect(page).toHaveURL(/\/admin\/index\.html/);
    await expect(page.locator('#requestList')).toHaveCount(0);
  });

  test('login สำเร็จ → เห็นจำนวนคำขอแยกตามสถานะ', async ({ page, seed }) => {
    await createRequest(seed.users.A);
    await createRequest(seed.users.B);
    await createRequest(seed.users.B, { status: 'cancelled' });
    await loginAdmin(page, seed.admin);
    await expect(page.locator('.chip-count[data-count="pending_admin_review"]')).toHaveText('2');
    await expect(page.locator('.chip-count[data-count="cancelled"]')).toHaveText('1');
    await expect(page.locator('.chip-count[data-count=""]')).toHaveText('3');
  });
});

test.describe('ตรวจคำขอ', () => {
  test('Confirm → สถานะเปลี่ยนเป็นเปิดให้ซาเล้งรับงาน', async ({ page, seed }) => {
    const id = await createRequest(seed.users.A);
    await loginAdmin(page, seed.admin);
    const card = await openAdminCard(page, { status: 'pending_admin_review', text: seed.users.A.name });
    await card.locator('[data-action="confirm"]').click();
    await expect(page.locator('#confirmModal')).toHaveClass(/open/);
    await expect(page.locator('#modalConfirmBtn')).toBeEnabled();
    await page.locator('#modalConfirmBtn').click();
    await expect(page.locator('#toast')).toContainText('Confirm สำเร็จ');

    const doc = await emu.getDoc(`pickup_requests/${id}`);
    expect(doc.status).toBe('open_for_saleng');
    expect(doc.admin_reviewed_by).toBe(seed.admin.uid);
    expect(doc.opened_at).toBeInstanceOf(Date);
    await expect(page.locator('.chip-count[data-count="open_for_saleng"]')).toHaveText('1');
  });

  test('Reject ต้องกรอกเหตุผลก่อน → ลูกค้าเห็นเหตุผล', async ({ page, newPage, seed }) => {
    const id = await createRequest(seed.users.A);
    await loginAdmin(page, seed.admin);
    const card = await openAdminCard(page, { status: 'pending_admin_review', text: seed.users.A.name });
    await card.locator('[data-action="reject"]').click();

    const confirmBtn = page.locator('#modalConfirmBtn');
    await expect(confirmBtn).toBeDisabled();
    await page.locator('#modalReasonInput').fill('   ');
    await expect(confirmBtn).toBeDisabled();
    await page.locator('#modalReasonDropdown').selectOption('ที่อยู่นอกเขตพื้นที่ให้บริการ');
    await expect(page.locator('#modalReasonInput')).toHaveValue(/นอกเขตพื้นที่/);
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();
    await expect(page.locator('#toast')).toContainText('Reject สำเร็จ');

    const doc = await emu.getDoc(`pickup_requests/${id}`);
    expect(doc).toMatchObject({ status: 'cancelled', cancelled_by: 'admin' });
    expect(doc.cancel_reason).toContain('นอกเขตพื้นที่');

    const userPage = await newPage();
    await loginUser(userPage, seed.users.A);
    await userPage.goto(`/request-detail/index.html?id=${id}`);
    await expect(userPage.locator('#detail')).toContainText('นอกเขตพื้นที่');
  });

  test('กดยกเลิกใน modal → ไม่เปลี่ยนสถานะ', async ({ page, seed }) => {
    const id = await createRequest(seed.users.A);
    await loginAdmin(page, seed.admin);
    const card = await openAdminCard(page, { status: 'pending_admin_review', text: seed.users.A.name });
    await card.locator('[data-action="confirm"]').click();
    await page.locator('#modalCancelBtn').click();
    await expect(page.locator('#confirmModal')).not.toHaveClass(/open/);
    expect((await emu.getDoc(`pickup_requests/${id}`)).status).toBe('pending_admin_review');
  });

  test('แก้ไขวัน-เวลานัดรับ โดยสถานะไม่เปลี่ยน', async ({ page, seed }) => {
    const id = await createRequest(seed.users.A, { status: 'open_for_saleng', time_slot: '08:00-13:00' });
    await loginAdmin(page, seed.admin);
    const card = await openAdminCard(page, { status: 'open_for_saleng', text: seed.users.A.name });
    await card.locator('.datetime-toggle').click();
    await card.locator('.dt-date').fill(futureDate(9));
    await card.locator('.dt-slot[value="13:00-18:00"]').check();
    await card.locator('.dt-save').click();
    await expect(page.locator('#toast')).toContainText('บันทึกวัน-เวลาใหม่แล้ว');

    const doc = await emu.getDoc(`pickup_requests/${id}`);
    expect(doc).toMatchObject({ requested_date: futureDate(9), time_slot: '13:00-18:00', status: 'open_for_saleng' });
  });

  test('คำขอที่จบแล้วไม่มีปุ่ม Confirm/Reject และแก้วันเวลาไม่ได้', async ({ page, seed }) => {
    await createRequest(seed.users.A, { status: 'completed' });
    await loginAdmin(page, seed.admin);
    const card = await openAdminCard(page, { status: 'completed', text: seed.users.A.name });
    await expect(card.locator('[data-action="confirm"]')).toHaveCount(0);
    await expect(card.locator('.datetime-toggle')).toHaveCount(0);
  });
});

test('แชท Admin ↔ ลูกค้า ต่อคำขอ (real-time ทั้งสองฝั่ง)', async ({ page, newPage, seed }) => {
  const id = await createRequest(seed.users.A);

  const userPage = await newPage();
  await loginUser(userPage, seed.users.A);
  await userPage.goto(`/chat/index.html?id=${id}`);
  await expect(userPage.locator('#chatInput')).toBeEnabled();
  await userPage.locator('#chatInput').fill('สวัสดีค่ะ ขอเลื่อนเวลาได้ไหม');
  await userPage.locator('#chatSend').click();

  await loginAdmin(page, seed.admin);
  const card = await openAdminCard(page, { status: 'pending_admin_review', text: seed.users.A.name });
  await expect(card.locator(`#chat-messages-${id}`)).toContainText('ขอเลื่อนเวลาได้ไหม');
  await card.locator(`#chat-input-${id}`).fill('ได้ครับ เดี๋ยวแก้ให้');
  await card.locator(`#chat-send-${id}`).click();

  await expect(userPage.locator('#chatThread')).toContainText('ได้ครับ เดี๋ยวแก้ให้');

  const messages = await emu.listDocs('chat_messages');
  expect(messages.map((m) => m.sender_role).sort()).toEqual(['admin', 'user']);
});
