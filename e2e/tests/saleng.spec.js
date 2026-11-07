// ฝั่งซาเล้ง + การจับคู่: สมัคร → Admin อนุมัติ/ไม่อนุมัติ/ระงับ, งานตามตำบล, โควตา,
// กดรับเอง → Admin ยืนยัน → ปิดงาน, Admin มอบหมาย → ตอบรับ/ปฏิเสธ, Admin ยกเลิกการจับคู่, แชท Admin↔ซาเล้ง
const { test, expect, loginUser, loginAdmin, loginSaleng, openAdminCard, pngFile } = require('../lib/fixtures');
const { createRequest, matchedTo, futureDate, PASSWORD } = require('../lib/seed');
const emu = require('../lib/emulator');

test.describe('สมัครและอนุมัติซาเล้ง', () => {
  test('สมัครครบ → รออนุมัติ → Admin อนุมัติ → หน้างานเปิดทันที (real-time)', async ({ page, newPage, seed }) => {
    const salengPage = await newPage();
    await salengPage.goto('/saleng/register/index.html');
    await salengPage.locator('#full_name').fill('ลุงใหม่ สมัครเอง');
    await salengPage.locator('#phone').fill('0867778888');
    await salengPage.locator('#password').fill(PASSWORD);
    await salengPage.locator('#confirm_password').fill(PASSWORD);
    await salengPage.locator('#vehicle_plate').fill('9กก 9999');
    await salengPage.locator('#areaGrid .area-item', { hasText: 'นางแล' }).click();
    await salengPage.locator('#vehicle_photo').setInputFiles(pngFile('car.png'));
    await expect(salengPage.locator('#vehiclePreview img')).toBeVisible();
    await salengPage.locator('#id_card_photo').setInputFiles(pngFile('id.png'));
    await expect(salengPage.locator('#idCardPreview img')).toBeVisible();
    await salengPage.locator('#submitBtn').click();

    await salengPage.waitForURL('**/saleng/jobs/index.html');
    await expect(salengPage.locator('#gate')).toContainText('รอ Admin ตรวจสอบใบสมัคร');
    await expect(salengPage.locator('#workspace')).toBeHidden();

    const accounts = await emu.listDocs('saleng_accounts');
    const created = accounts.find((s) => s.phone_number === '0867778888');
    expect(created).toMatchObject({ approval_status: 'pending', account_status: 'active', service_sub_districts: ['นางแล'] });
    const docs = (await emu.listDocs('saleng_documents')).filter((d) => d.saleng_id === created.id);
    expect(docs.map((d) => d.doc_type).sort()).toEqual(['id_card_photo', 'vehicle_photo']);

    await loginAdmin(page, seed.admin, '/admin/salengs/index.html');
    const card = page.locator('#salengList .s-card', { hasText: 'ลุงใหม่ สมัครเอง' });
    await card.locator('[data-act="approve"]').click();
    await expect(page.locator('#toast')).toContainText('อนุมัติ');

    await expect(salengPage.locator('#workspace')).toBeVisible();
    await expect(salengPage.locator('#gate')).toBeEmpty();
    expect(await emu.getDoc(`active_salengs/${created.id}`)).not.toBeNull();
  });

  test('สมัครไม่ครบ (ไม่มีรูป/ตำบล) → แจ้ง error', async ({ page, seed }) => {
    await page.goto('/saleng/register/index.html');
    await page.locator('#full_name').fill('ไม่ครบ');
    await page.locator('#phone').fill('0867778888');
    await page.locator('#password').fill(PASSWORD);
    await page.locator('#confirm_password').fill(PASSWORD);
    await page.locator('#vehicle_plate').fill('1 กก');
    await page.locator('#submitBtn').click();
    await expect(page.locator('#errorBanner')).toContainText('กรุณากรอกข้อมูลให้ครบ');
    await expect(page.locator('#field-areas')).toHaveClass(/has-error/);
    await expect(page.locator('#field-vehicle_photo')).toHaveClass(/has-error/);
  });

  test('Admin ไม่อนุมัติพร้อมเหตุผล → ซาเล้งเห็นเหตุผล', async ({ page, newPage, seed }) => {
    const salengPage = await newPage();
    await loginSaleng(salengPage, seed.salengs.PENDING);
    await expect(salengPage.locator('#gate')).toContainText('รอ Admin ตรวจสอบ');

    await loginAdmin(page, seed.admin, '/admin/salengs/index.html');
    const card = page.locator('#salengList .s-card', { hasText: seed.salengs.PENDING.name });
    await card.locator('[data-act="reject"]').click();
    await card.locator('.s-reason-form input').fill('รูปบัตรไม่ชัด');
    await card.locator('[data-act="reason-submit"]').click();
    await expect(page.locator('#toast')).toContainText('ไม่อนุมัติ');

    await expect(salengPage.locator('#gate')).toContainText('ใบสมัครไม่ผ่านการอนุมัติ');
    await expect(salengPage.locator('#gate')).toContainText('รูปบัตรไม่ชัด');
  });

  test('Admin ระงับบัญชี → ซาเล้งถูกปิดหน้างานและหมดสิทธิ์รับงาน', async ({ page, newPage, seed }) => {
    const s1 = seed.salengs.S1;
    const salengPage = await newPage();
    await loginSaleng(salengPage, s1);
    await expect(salengPage.locator('#workspace')).toBeVisible();

    await loginAdmin(page, seed.admin, '/admin/salengs/index.html');
    await page.locator('#filterRow .chip[data-filter="active"]').click();
    const card = page.locator('#salengList .s-card', { hasText: s1.name });
    await card.locator('[data-act="suspend"]').click();
    await card.locator('.s-reason-form input').fill('ลูกค้าร้องเรียน');
    await card.locator('[data-act="reason-submit"]').click();
    await expect(page.locator('#toast')).toContainText('ระงับบัญชีแล้ว');

    await expect(salengPage.locator('#gate')).toContainText('ถูกระงับ');
    await expect(salengPage.locator('#workspace')).toBeHidden();
    expect(await emu.getDoc(`active_salengs/${s1.uid}`)).toBeNull();
  });

  test('บัญชีลูกค้าใช้ login หน้าซาเล้งไม่ได้', async ({ page, seed }) => {
    await page.goto('/saleng/login/index.html');
    await page.locator('#phone').fill(seed.users.A.phone);
    await page.locator('#password').fill(PASSWORD);
    await page.locator('#submitBtn').click();
    await expect(page.locator('#errorBanner')).toBeVisible();
    await expect(page).toHaveURL(/saleng\/login/);
  });
});

test.describe('งานใหม่ของซาเล้ง', () => {
  test('เห็นเฉพาะงานเปิดในตำบลที่ลงทะเบียน', async ({ page, seed }) => {
    await createRequest(seed.users.A, { status: 'open_for_saleng', waste_types: ['กระดาษ'] }); // เวียง
    await createRequest(seed.users.B, { status: 'open_for_saleng', waste_types: ['พลาสติก'] }); // รอบเวียง
    await createRequest(seed.users.A, { status: 'open_for_saleng', sub_district: 'แม่ยาว', waste_types: ['เหล็ก'] });
    await createRequest(seed.users.A, { status: 'pending_admin_review', waste_types: ['ขวดแก้ว'] });

    await loginSaleng(page, seed.salengs.S1);
    const list = page.locator('#openList');
    await expect(list.locator('.job')).toHaveCount(2);
    await expect(list).toContainText('กระดาษ');
    await expect(list).toContainText('พลาสติก');
    await expect(list).not.toContainText('เหล็ก');
    await expect(list).not.toContainText('ขวดแก้ว');
    // ก่อน Admin ยืนยันการจับคู่ ซาเล้งต้องไม่เห็นที่อยู่/เบอร์ลูกค้า
    await expect(list).not.toContainText(seed.users.A.address.address_text);
  });

  test('โควตา: รอบเดียวกันครบ 3 งาน → รับงานรอบนั้นเพิ่มไม่ได้ แต่รอบอื่นยังรับได้', async ({ page, seed }) => {
    const s1 = seed.salengs.S1;
    const date = futureDate(4);
    for (let i = 0; i < 3; i++) {
      await createRequest(seed.users.B, { status: 'confirmed', requested_date: date, time_slot: '08:00-13:00', ...matchedTo(s1) });
    }
    await createRequest(seed.users.A, { status: 'open_for_saleng', requested_date: date, time_slot: '08:00-13:00', waste_types: ['กระดาษ'] });
    await createRequest(seed.users.A, { status: 'open_for_saleng', requested_date: date, time_slot: '13:00-18:00', waste_types: ['เหล็ก'] });

    await loginSaleng(page, s1);
    await expect(page.locator('#quotaValue')).toHaveText('3/6');
    const full = page.locator('#openList .job', { hasText: 'กระดาษ' });
    await expect(full).toContainText('เต็มแล้ว');
    await expect(full.locator('button')).toBeDisabled();
    await expect(page.locator('#openList .job', { hasText: 'เหล็ก' }).locator('button')).toBeEnabled();
  });

  test('โควตา: งานค้างครบ 6 งาน → รับงานใหม่ไม่ได้', async ({ page, seed }) => {
    const s1 = seed.salengs.S1;
    for (let i = 0; i < 6; i++) {
      await createRequest(seed.users.B, { status: 'confirmed', requested_date: futureDate(10 + i), ...matchedTo(s1) });
    }
    await createRequest(seed.users.A, { status: 'open_for_saleng', requested_date: futureDate(3) });
    await loginSaleng(page, s1);
    await expect(page.locator('#quotaValue')).toHaveText('6/6');
    const job = page.locator('#openList .job').first();
    await expect(job).toContainText('งานค้างครบ 6 งาน');
    await expect(job.locator('button')).toBeDisabled();
  });
});

test.describe('การจับคู่', () => {
  test('ซาเล้งกดรับเอง → Admin ยืนยัน → ลูกค้าเห็นซาเล้ง → ซาเล้งปิดงาน', async ({ page, newPage, seed }) => {
    const s1 = seed.salengs.S1;
    const a = seed.users.A;
    const id = await createRequest(a, { status: 'open_for_saleng', notes: 'โทรก่อนมา' });

    const salengPage = await newPage();
    await loginSaleng(salengPage, s1);
    await salengPage.locator('#openList .job button', { hasText: 'รับงานนี้' }).click();
    await expect(salengPage.locator('#toast')).toContainText('รับงานแล้ว');

    let doc = await emu.getDoc(`pickup_requests/${id}`);
    expect(doc).toMatchObject({ status: 'pending_match_confirm', assigned_saleng_id: s1.uid, match_channel: 'self_pick', saleng_accepted: true });
    const match = await emu.getDoc(`request_matches/${doc.active_match_id}`);
    expect(match).toMatchObject({ request_id: id, saleng_id: s1.uid, match_channel: 'self_pick' });

    await loginAdmin(page, seed.admin);
    const card = await openAdminCard(page, { status: 'pending_match_confirm', text: a.name });
    await expect(card).toContainText('ซาเล้งรับงานแล้ว — รอคุณยืนยัน');
    await card.locator('[data-act="confirm-match"]').click();
    await expect(page.locator('#toast')).toContainText('ยืนยันการจับคู่แล้ว');
    expect((await emu.getDoc(`pickup_requests/${id}`)).status).toBe('confirmed');
    expect((await emu.getDoc(`request_matches/${doc.active_match_id}`)).match_status).toBe('confirmed');

    // ซาเล้งเห็นข้อมูลติดต่อลูกค้าหลังยืนยัน (real-time)
    await salengPage.locator('.tab[data-tab="mine"]').click();
    const mine = salengPage.locator('#mineList .job').first();
    await expect(mine).toContainText('ยืนยันแล้ว');
    await expect(mine).toContainText(a.address.address_text);
    await expect(mine).toContainText('โทรก่อนมา');

    const userPage = await newPage();
    await loginUser(userPage, a);
    await userPage.goto(`/request-detail/index.html?id=${id}`);
    await expect(userPage.locator('.saleng-card')).toContainText(s1.name);
    await expect(userPage.locator('.saleng-card')).toContainText(s1.plate);

    await mine.locator('[data-act="complete"]').click(); // confirm() ถูกกดตกลงอัตโนมัติ
    await expect(salengPage.locator('#toast')).toContainText('ปิดงานแล้ว');
    doc = await emu.getDoc(`pickup_requests/${id}`);
    expect(doc.status).toBe('completed');
    await expect(userPage.locator('#detail .status-pill')).toHaveText('เสร็จสิ้น');
  });

  test('Admin มอบหมาย → ปุ่มยืนยันกดไม่ได้จนซาเล้งตอบรับ → ซาเล้งตอบรับ → ยืนยันได้', async ({ page, newPage, seed }) => {
    const s1 = seed.salengs.S1;
    const id = await createRequest(seed.users.A, { status: 'open_for_saleng' });

    await loginAdmin(page, seed.admin);
    let card = await openAdminCard(page, { status: 'open_for_saleng', text: seed.users.A.name });
    // ซาเล้งตำบลตรงต้องอยู่บนสุด
    await expect(card.locator('.match-select option').first()).toContainText(`${s1.name} · ตำบลตรง`);
    await card.locator('.match-select').selectOption({ label: await card.locator('.match-select option', { hasText: s1.name }).textContent() });
    await card.locator('.match-assign-btn').click();
    await expect(page.locator('#toast')).toContainText('รอซาเล้งตอบรับ');

    const doc = await emu.getDoc(`pickup_requests/${id}`);
    expect(doc).toMatchObject({ status: 'pending_match_confirm', match_channel: 'admin_assign', saleng_accepted: false, assigned_saleng_id: s1.uid });

    card = await openAdminCard(page, { status: 'pending_match_confirm', text: seed.users.A.name });
    await expect(card.locator('[data-act="confirm-match"]')).toBeDisabled();

    const salengPage = await newPage();
    await loginSaleng(salengPage, s1);
    const assigned = salengPage.locator('#assignedList .job.assigned');
    await expect(assigned).toHaveCount(1);
    await assigned.locator('[data-act="accept"]').click();
    await expect(salengPage.locator('#toast')).toContainText('ตอบรับงานแล้ว');

    await expect(card.locator('[data-act="confirm-match"]')).toBeEnabled();
    expect((await emu.getDoc(`request_matches/${doc.active_match_id}`)).match_status).toBe('pending_admin_confirm_user');
  });

  test('ซาเล้งปฏิเสธงานที่มอบหมาย → งานกลับไปเปิดรับ', async ({ page, seed }) => {
    const s1 = seed.salengs.S1;
    await emu.setDoc('request_matches/m1', { request_id: 'r1', saleng_id: s1.uid, match_channel: 'admin_assign', match_status: 'pending_saleng_accept' });
    const id = await createRequest(seed.users.A, {
      id: 'r1', status: 'pending_match_confirm', active_match_id: 'm1', ...matchedTo(s1, { channel: 'admin_assign', accepted: false }),
    });

    await loginSaleng(page, s1);
    await page.locator('#assignedList [data-act="decline"]').click();
    await expect(page.locator('#reasonModal')).toHaveClass(/open/);
    await page.locator('#reasonList .reason-item', { hasText: 'อยู่ไกลเกินไป' }).click();
    await page.locator('#reasonSubmitBtn').click();
    await expect(page.locator('#toast')).toContainText('ปฏิเสธงานแล้ว');

    const doc = await emu.getDoc(`pickup_requests/${id}`);
    expect(doc).toMatchObject({ status: 'open_for_saleng', assigned_saleng_id: null, saleng_accepted: null });
    expect(await emu.getDoc('request_matches/m1')).toMatchObject({ match_status: 'rejected', ended_by: 'saleng', end_reason: 'อยู่ไกลเกินไป' });
    // งานกลับมาอยู่ในรายการงานเปิดของตำบลนี้
    await expect(page.locator('#openList .job')).toHaveCount(1);
  });

  test('Admin ยกเลิกการจับคู่หลังยืนยัน → นับเป็นยกเลิกหลังยืนยัน', async ({ page, seed }) => {
    const s1 = seed.salengs.S1;
    await emu.setDoc('request_matches/m2', { request_id: 'r2', saleng_id: s1.uid, match_channel: 'self_pick', match_status: 'confirmed' });
    const id = await createRequest(seed.users.A, { id: 'r2', status: 'confirmed', active_match_id: 'm2', ...matchedTo(s1) });

    await loginAdmin(page, seed.admin);
    const card = await openAdminCard(page, { status: 'confirmed', text: seed.users.A.name });
    await card.locator('[data-act="release"]').click();
    await card.locator('[data-act="release-confirm"]').click();
    await expect(page.locator('#toast')).toContainText('กรอกเหตุผลก่อน');
    expect((await emu.getDoc(`pickup_requests/${id}`)).status).toBe('confirmed');

    await card.locator('.match-reason').fill('ซาเล้งรถเสีย');
    await card.locator('[data-act="release-confirm"]').click();
    await expect(page.locator('#toast')).toContainText('ยกเลิกการจับคู่แล้ว');

    expect(await emu.getDoc(`pickup_requests/${id}`)).toMatchObject({ status: 'open_for_saleng', assigned_saleng_id: null });
    expect(await emu.getDoc('request_matches/m2')).toMatchObject({ match_status: 'cancelled', cancelled_after_confirm: true, ended_by: 'admin' });
  });

  test('แชท Admin ↔ ซาเล้ง ต่องาน', async ({ page, newPage, seed }) => {
    const s1 = seed.salengs.S1;
    const id = await createRequest(seed.users.A, { status: 'confirmed', ...matchedTo(s1) });

    const salengPage = await newPage();
    await loginSaleng(salengPage, s1);
    await salengPage.goto(`/saleng/chat/index.html?id=${id}`);
    await expect(salengPage.locator('#chatInput')).toBeEnabled();
    await salengPage.locator('#chatInput').fill('ถึงหน้าบ้านแล้วครับ');
    await salengPage.locator('#chatSend').click();

    await loginAdmin(page, seed.admin);
    const card = await openAdminCard(page, { status: 'confirmed', text: seed.users.A.name });
    const chat = card.locator('.saleng-chat');
    await expect(chat.locator(`#saleng-chat-${id}`)).toContainText('ถึงหน้าบ้านแล้วครับ');
    await chat.locator('input').fill('รับทราบครับ');
    await chat.locator('button').click();

    await expect(salengPage.locator('#chatThread')).toContainText('รับทราบครับ');
  });
});
