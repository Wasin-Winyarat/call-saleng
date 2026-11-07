// ฝั่งลูกค้า: สมัคร / login / auth guard / สร้างคำขอ / ติดตาม / แก้ไข-ลบ / ที่อยู่ในโปรไฟล์
const { test, expect, loginUser } = require('../lib/fixtures');
const { createRequest, futureDate, PASSWORD } = require('../lib/seed');
const emu = require('../lib/emulator');

test.describe('สมัครสมาชิก', () => {
  test('สมัครสำเร็จ → เข้าหน้าหลัก และสร้าง user_accounts', async ({ page, seed }) => {
    await page.goto('/register/index.html');
    await page.locator('#full_name').fill('ผู้ใช้ ใหม่');
    await page.locator('#phone').fill('095-111-2222');
    await page.locator('#password').fill(PASSWORD);
    await page.locator('#confirm_password').fill(PASSWORD);
    await page.locator('#submitBtn').click();
    await page.waitForURL('**/dashboard/index.html');

    const accounts = await emu.listDocs('user_accounts');
    const created = accounts.find((a) => a.phone_number === '0951112222');
    expect(created).toMatchObject({ full_name: 'ผู้ใช้ ใหม่', status: 'active' });
  });

  test('รหัสผ่านไม่ตรงกัน → ขึ้น error และไม่สมัคร', async ({ page, seed }) => {
    await page.goto('/register/index.html');
    await page.locator('#full_name').fill('ผู้ใช้ ใหม่');
    await page.locator('#phone').fill('0951112222');
    await page.locator('#password').fill(PASSWORD);
    await page.locator('#confirm_password').fill('ไม่ตรง123');
    await page.locator('#submitBtn').click();

    await expect(page.locator('#field-confirm_password')).toHaveClass(/has-error/);
    await expect(page).toHaveURL(/register/);
    expect((await emu.listDocs('user_accounts')).length).toBe(2);
  });

  test('เบอร์ที่มีบัญชีแล้ว → แจ้งให้เข้าสู่ระบบแทน', async ({ page, seed }) => {
    await page.goto('/register/index.html');
    await page.locator('#full_name').fill('ซ้ำ');
    await page.locator('#phone').fill(seed.users.A.phone);
    await page.locator('#password').fill(PASSWORD);
    await page.locator('#confirm_password').fill(PASSWORD);
    await page.locator('#submitBtn').click();
    await expect(page.locator('#errorBanner')).toContainText('มีบัญชีอยู่แล้ว');
  });
});

test.describe('เข้าสู่ระบบ', () => {
  test('login สำเร็จ', async ({ page, seed }) => {
    await loginUser(page, seed.users.A);
    await expect(page).toHaveURL(/dashboard/);
  });

  test('รหัสผ่านผิด → แจ้ง error', async ({ page, seed }) => {
    await page.goto('/login/index.html');
    await page.locator('#phone').fill(seed.users.A.phone);
    await page.locator('#password').fill('wrong-password');
    await page.locator('#submitBtn').click();
    await expect(page.locator('#errorBanner')).toContainText('ไม่ถูกต้อง');
    await expect(page).toHaveURL(/login/);
  });

  test('บัญชีถูกระงับ → login ไม่ได้', async ({ page, seed }) => {
    const a = seed.users.A;
    await emu.setDoc(`user_accounts/${a.uid}`, { full_name: a.name, phone_number: a.phone, status: 'suspended' });
    await page.goto('/login/index.html');
    await page.locator('#phone').fill(a.phone);
    await page.locator('#password').fill(PASSWORD);
    await page.locator('#submitBtn').click();
    await expect(page.locator('#errorBanner')).toContainText('ถูกระงับ');
  });
});

test.describe('auth guard — ยังไม่ login ต้องถูกพาไปหน้า login', () => {
  const cases = [
    ['/dashboard/index.html', /\/login\/index\.html/],
    ['/tracking/index.html', /\/login\/index\.html/],
    ['/profile/index.html', /\/login\/index\.html/],
    ['/pickup-request/index.html', /\/login\/index\.html/],
    ['/request-detail/index.html?id=x', /\/login\/index\.html/],
    ['/admin/dashboard/index.html', /\/admin\/index\.html/],
    ['/saleng/jobs/index.html', /\/saleng\/login\/index\.html/],
  ];
  for (const [path, target] of cases) {
    test(path, async ({ page, seed }) => {
      await page.goto(path);
      await expect(page).toHaveURL(target);
    });
  }
});

test.describe('สร้างคำขอเรียกรถ', () => {
  test('ปุ่มส่งจะกดได้เมื่อกรอกครบ → ส่งสำเร็จ → เห็นในหน้าติดตาม', async ({ page, seed }) => {
    const a = seed.users.A;
    await loginUser(page, a);
    await page.goto('/pickup-request/index.html');

    const submit = page.locator('#submitBtn');
    // ชื่อ/เบอร์ดึงจากโปรไฟล์ และเลือกที่อยู่ 1 ให้อัตโนมัติ
    await expect(page.locator('#contact_name')).toHaveValue(a.name);
    await expect(page.locator('.address-card-filled.selected')).toContainText(a.address.address_text);
    await expect(submit).toBeDisabled();

    await page.locator('#wasteTypeGrid .checkbox-item', { hasText: 'พลาสติก' }).click();
    await expect(submit).toBeDisabled();
    await page.locator('#requested_date').fill(futureDate(3));
    await expect(submit).toBeDisabled();
    await page.locator('#timeSlotRow .radio-item:has(input[value="13:00-18:00"])').click();
    await page.locator('#notes').fill('ฝากไว้ที่ รปภ.');
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(page.locator('#toast')).toContainText('ส่งคำขอสำเร็จ');

    const requests = await emu.listDocs('pickup_requests');
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      user_id: a.uid,
      status: 'pending_admin_review',
      waste_types: ['พลาสติก'],
      time_slot: '13:00-18:00',
      requested_date: futureDate(3),
      sub_district: a.address.sub_district,
      notes: 'ฝากไว้ที่ รปภ.',
    });

    await page.goto('/tracking/index.html');
    const card = page.locator('#requestList .request-card');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('พลาสติก');
    await expect(card).toContainText('รอตรวจสอบ');
  });

  test('เบอร์ติดต่อผิดรูปแบบ → ส่งไม่ได้', async ({ page, seed }) => {
    await loginUser(page, seed.users.A);
    await page.goto('/pickup-request/index.html');
    await page.locator('#wasteTypeGrid .checkbox-item', { hasText: 'กระดาษ' }).click();
    await page.locator('#requested_date').fill(futureDate(3));
    await page.locator('#timeSlotRow .radio-item', { hasText: '08:00' }).click();
    await expect(page.locator('#submitBtn')).toBeEnabled();
    await page.locator('#contact_phone').fill('12345');
    await expect(page.locator('#submitBtn')).toBeDisabled();
  });

  test('ยังไม่มีที่อยู่ → ส่งไม่ได้และมีลิงก์ไปเพิ่มที่โปรไฟล์', async ({ page, seed }) => {
    await emu.setDoc(`user_addresses/${seed.users.A.uid}`, {});
    await loginUser(page, seed.users.A);
    await page.goto('/pickup-request/index.html');
    await expect(page.locator('#addressCardList')).toContainText('ยังไม่มีที่อยู่บันทึกไว้');
    await page.locator('#wasteTypeGrid .checkbox-item', { hasText: 'กระดาษ' }).click();
    await page.locator('#requested_date').fill(futureDate(3));
    await page.locator('#timeSlotRow .radio-item', { hasText: '08:00' }).click();
    await expect(page.locator('#submitBtn')).toBeDisabled();
  });

  test('แนบรูปขยะ → บันทึกลง request_photos', async ({ page, seed }) => {
    const { pngFile } = require('../lib/fixtures');
    await loginUser(page, seed.users.A);
    await page.goto('/pickup-request/index.html');
    await page.locator('#photoInput').setInputFiles([pngFile('a.png'), pngFile('b.png')]);
    await expect(page.locator('#photoCount')).toHaveText('2/5');
    await page.locator('#wasteTypeGrid .checkbox-item', { hasText: 'เหล็ก' }).click();
    await page.locator('#requested_date').fill(futureDate(3));
    await page.locator('#timeSlotRow .radio-item', { hasText: '08:00' }).click();
    await page.locator('#submitBtn').click();
    await expect(page.locator('#toast')).toContainText('ส่งคำขอสำเร็จ');

    const [request] = await emu.listDocs('pickup_requests');
    const photos = await emu.listDocs('request_photos');
    expect(photos).toHaveLength(2);
    for (const p of photos) {
      expect(p.request_id).toBe(request.id);
      expect(p.user_id).toBe(seed.users.A.uid);
      expect(p.image_data).toMatch(/^data:image\/jpeg;base64,/);
    }
  });
});

test.describe('รายละเอียดคำขอ / แก้ไข / ลบ', () => {
  test('แก้ไขคำขอที่ยังรอตรวจสอบได้', async ({ page, seed }) => {
    const id = await createRequest(seed.users.A, { notes: 'เดิม' });
    await loginUser(page, seed.users.A);
    await page.goto(`/request-detail/index.html?id=${id}`);
    await page.locator('#editBtn').click();
    await page.waitForURL(/pickup-request\/index\.html\?edit=/);
    await expect(page.locator('#submitBtn')).toHaveText('บันทึกการแก้ไข');
    await page.locator('#notes').fill('แก้ใหม่แล้ว');
    await page.locator('#submitBtn').click();
    await page.waitForURL(/request-detail/);
    await expect(page.locator('#detail')).toContainText('แก้ใหม่แล้ว');
    expect((await emu.getDoc(`pickup_requests/${id}`)).notes).toBe('แก้ใหม่แล้ว');
  });

  test('ลบคำขอที่ยังรอตรวจสอบได้ (พร้อมรูปที่แนบ)', async ({ page, seed }) => {
    const id = await createRequest(seed.users.A);
    await emu.setDoc('request_photos/p1', { request_id: id, user_id: seed.users.A.uid, image_data: 'data:image/jpeg;base64,AAAA', display_order: 0 });
    await loginUser(page, seed.users.A);
    await page.goto(`/request-detail/index.html?id=${id}`);
    await page.locator('#deleteBtn').click(); // window.confirm ถูกกดตกลงอัตโนมัติ
    await page.waitForURL(/tracking/);
    expect(await emu.getDoc(`pickup_requests/${id}`)).toBeNull();
    expect(await emu.getDoc('request_photos/p1')).toBeNull();
  });

  test('คำขอที่ Admin ยืนยันแล้ว → ปุ่มแก้ไขพาไปแชทพร้อมข้อความร่าง', async ({ page, seed }) => {
    const id = await createRequest(seed.users.A, { status: 'open_for_saleng' });
    await loginUser(page, seed.users.A);
    await page.goto(`/request-detail/index.html?id=${id}`);
    await expect(page.locator('#deleteBtn')).toContainText('ยกเลิกคำขอ');
    await page.locator('#editBtn').click();
    await page.waitForURL(/chat\/index\.html/);
    await expect(page.locator('#chatInput')).not.toHaveValue('');
  });

  test('คำขอที่ถูกยกเลิก → เห็นเหตุผล และไม่มีปุ่มแก้ไข/ลบ', async ({ page, seed }) => {
    const id = await createRequest(seed.users.A, { status: 'cancelled', cancel_reason: 'อยู่นอกพื้นที่บริการ' });
    await loginUser(page, seed.users.A);
    await page.goto(`/request-detail/index.html?id=${id}`);
    await expect(page.locator('#detail')).toContainText('อยู่นอกพื้นที่บริการ');
    await expect(page.locator('#editBtn')).toHaveCount(0);
    await expect(page.locator('#deleteBtn')).toHaveCount(0);
  });

  test('เปิดคำขอของคนอื่น → ไม่พบคำขอ', async ({ page, seed }) => {
    const id = await createRequest(seed.users.B);
    await loginUser(page, seed.users.A);
    await page.goto(`/request-detail/index.html?id=${id}`);
    await expect(page.locator('#detail')).toContainText('ไม่พบคำขอนี้');
  });

  test('หน้าติดตามแสดงเฉพาะคำขอของตัวเอง', async ({ page, seed }) => {
    await createRequest(seed.users.A, { waste_types: ['ขวดแก้ว'] });
    await createRequest(seed.users.B, { waste_types: ['อลูมิเนียม'] });
    await loginUser(page, seed.users.A);
    await page.goto('/tracking/index.html');
    await expect(page.locator('#requestList .request-card')).toHaveCount(1);
    await expect(page.locator('#requestList')).toContainText('ขวดแก้ว');
    await expect(page.locator('#requestList')).not.toContainText('อลูมิเนียม');
  });
});

test('โปรไฟล์: เพิ่มที่อยู่ 2 แล้วเลือกใช้ในฟอร์มคำขอได้', async ({ page, seed }) => {
  await loginUser(page, seed.users.A);
  await page.goto('/profile/index.html');
  await page.locator('.address-card-empty', { hasText: 'เพิ่มที่อยู่ 2' }).click();
  await page.locator('.addr-sub-district').selectOption('ริมกก');
  await page.locator('.addr-address-text').fill('55 หมู่ 2');
  await page.locator('.addr-save').click();
  await expect(page.locator('#addressCardList')).toContainText('55 หมู่ 2');

  const saved = await emu.getDoc(`user_addresses/${seed.users.A.uid}`);
  expect(saved.address_2).toMatchObject({ sub_district: 'ริมกก', address_text: '55 หมู่ 2' });

  await page.goto('/pickup-request/index.html');
  await page.locator('.address-card-filled', { hasText: '55 หมู่ 2' }).click();
  await expect(page.locator('.address-card-filled.selected')).toContainText('ริมกก');
});
