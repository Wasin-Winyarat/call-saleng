// Firestore Security Rules (firestore.rules ตัวจริงที่ emulator โหลด) — ยิง REST ในนามผู้ใช้แต่ละบทบาท
// ไม่เปิดเบราว์เซอร์ เพื่อทดสอบสิ่งที่ "คนยิง API เองโดยไม่ผ่านหน้าเว็บ" ทำได้/ไม่ได้
const { test, expect } = require('../lib/fixtures');
const { createRequest, matchedTo, PASSWORD, salengEmail } = require('../lib/seed');
const emu = require('../lib/emulator');
const { asUser } = emu;

const ALLOWED = 200;
const expectDenied = (res) => expect(res.status, JSON.stringify(res.json)).toBe(403);
const expectAllowed = (res) => expect(res.status, JSON.stringify(res.json)).toBe(ALLOWED);

test.describe('ไม่ login', () => {
  test('อ่านคำขอ / บัญชี / แบนเนอร์ไม่ได้', async ({ seed }) => {
    const id = await createRequest(seed.users.A);
    await emu.setDoc('ad_banners/b1', { title: 'x', status: 'active', image_data: 'data:image/jpeg;base64,AA' });
    expectDenied(await asUser.get(null, `pickup_requests/${id}`));
    expectDenied(await asUser.get(null, `user_accounts/${seed.users.A.uid}`));
    expectDenied(await asUser.get(null, 'ad_banners/b1'));
    expectDenied(await asUser.create(null, 'pickup_requests/x', { user_id: 'x', status: 'pending_admin_review' }));
  });
});

test.describe('ลูกค้า — แยกข้อมูลระหว่างบัญชี', () => {
  test('อ่านคำขอของตัวเองได้ แต่อ่านของคนอื่นไม่ได้', async ({ seed }) => {
    const { A, B } = seed.users;
    const id = await createRequest(A);
    expectAllowed(await asUser.get(A.idToken, `pickup_requests/${id}`));
    expectDenied(await asUser.get(B.idToken, `pickup_requests/${id}`));
    expectDenied(await asUser.queryEq(B.idToken, 'pickup_requests', 'user_id', A.uid));
  });

  test('อ่านโปรไฟล์ / ที่อยู่ / admin_accounts ของคนอื่นไม่ได้', async ({ seed }) => {
    const { A, B } = seed.users;
    expectAllowed(await asUser.get(A.idToken, `user_accounts/${A.uid}`));
    expectDenied(await asUser.get(B.idToken, `user_accounts/${A.uid}`));
    expectDenied(await asUser.get(B.idToken, `user_addresses/${A.uid}`));
    expectDenied(await asUser.get(A.idToken, `admin_accounts/${seed.admin.uid}`));
    expectAllowed(await asUser.get(seed.admin.idToken, `admin_accounts/${seed.admin.uid}`));
  });

  test('ตั้งตัวเองเป็น admin ไม่ได้', async ({ seed }) => {
    const { A } = seed.users;
    expectDenied(await asUser.create(A.idToken, `admin_accounts/${A.uid}`, { login_identifier: 'hacker', full_name: 'x' }));
  });

  test('รูปขยะ / แชท ของคำขอคนอื่นอ่านไม่ได้', async ({ seed }) => {
    const { A, B } = seed.users;
    const id = await createRequest(A);
    await emu.setDoc('request_photos/p1', { request_id: id, user_id: A.uid, image_data: 'data:image/jpeg;base64,AA', display_order: 0 });
    await emu.setDoc('chat_messages/c1', { request_id: id, sender_role: 'user', sender_id: A.uid, message_text: 'hi' });
    expectAllowed(await asUser.get(A.idToken, 'request_photos/p1'));
    expectDenied(await asUser.get(B.idToken, 'request_photos/p1'));
    expectAllowed(await asUser.get(A.idToken, 'chat_messages/c1'));
    expectDenied(await asUser.get(B.idToken, 'chat_messages/c1'));
  });

  test('ส่งแชทปลอมเป็น admin ไม่ได้', async ({ seed }) => {
    const { A } = seed.users;
    const id = await createRequest(A);
    expectDenied(await asUser.create(A.idToken, 'chat_messages/fake', { request_id: id, sender_role: 'admin', sender_id: A.uid, message_text: 'x' }));
    expectDenied(await asUser.create(A.idToken, 'chat_messages/fake2', { request_id: id, sender_role: 'user', sender_id: seed.users.B.uid, message_text: 'x' }));
    expectAllowed(await asUser.create(A.idToken, 'chat_messages/ok', { request_id: id, sender_role: 'user', sender_id: A.uid, message_text: 'x' }));
  });
});

test.describe('ลูกค้า — สร้าง/แก้/ลบคำขอ', () => {
  const base = (uid) => ({ user_id: uid, status: 'pending_admin_review', sub_district: 'เวียง', waste_types: ['กระดาษ'], created_at: new Date() });

  test('สร้างคำขอได้เฉพาะของตัวเอง และต้องเริ่มที่ pending_admin_review', async ({ seed }) => {
    const { A, B } = seed.users;
    expectAllowed(await asUser.create(A.idToken, 'pickup_requests/ok', base(A.uid)));
    expectDenied(await asUser.create(A.idToken, 'pickup_requests/skip', { ...base(A.uid), status: 'open_for_saleng' }));
    expectDenied(await asUser.create(A.idToken, 'pickup_requests/done', { ...base(A.uid), status: 'completed' }));
    expectDenied(await asUser.create(A.idToken, 'pickup_requests/other', base(B.uid)));
  });

  test('แก้ไขได้ตอนรอตรวจสอบ แต่เปลี่ยนสถานะเอง/ย้ายเจ้าของไม่ได้', async ({ seed }) => {
    const { A, B } = seed.users;
    const id = await createRequest(A);
    expectAllowed(await asUser.update(A.idToken, `pickup_requests/${id}`, { notes: 'แก้ได้' }));
    expectDenied(await asUser.update(A.idToken, `pickup_requests/${id}`, { status: 'open_for_saleng' }));
    expectDenied(await asUser.update(A.idToken, `pickup_requests/${id}`, { user_id: B.uid }));
    expectDenied(await asUser.update(B.idToken, `pickup_requests/${id}`, { notes: 'แก้ของคนอื่น' }));
  });

  test('หลัง Admin ยืนยันแล้ว แก้ไข/ลบเองไม่ได้', async ({ seed }) => {
    const { A } = seed.users;
    const id = await createRequest(A, { status: 'open_for_saleng' });
    expectDenied(await asUser.update(A.idToken, `pickup_requests/${id}`, { notes: 'แก้หลังยืนยัน' }));
    expectDenied(await asUser.delete(A.idToken, `pickup_requests/${id}`));
    expectDenied(await asUser.update(A.idToken, `pickup_requests/${id}`, { status: 'cancelled' }));
  });

  test('ลบคำขอที่รอตรวจสอบของตัวเองได้ แต่ลบของคนอื่นไม่ได้', async ({ seed }) => {
    const { A, B } = seed.users;
    const id = await createRequest(A);
    expectDenied(await asUser.delete(B.idToken, `pickup_requests/${id}`));
    expectAllowed(await asUser.delete(A.idToken, `pickup_requests/${id}`));
  });

  test('แบนเนอร์: เห็นเฉพาะ active และแก้ไขไม่ได้', async ({ seed }) => {
    const { A } = seed.users;
    const banner = { title: 'x', image_data: 'data:image/jpeg;base64,AA' };
    await emu.setDoc('ad_banners/live', { ...banner, status: 'active' });
    await emu.setDoc('ad_banners/draft', { ...banner, status: 'draft' });
    expectAllowed(await asUser.get(A.idToken, 'ad_banners/live'));
    expectDenied(await asUser.get(A.idToken, 'ad_banners/draft'));
    expectDenied(await asUser.update(A.idToken, 'ad_banners/live', { title: 'hacked' }));
  });
});

test.describe('ซาเล้ง', () => {
  const selfPick = (s) => ({
    status: 'pending_match_confirm',
    assigned_saleng_id: s.uid,
    assigned_saleng_name: s.name,
    assigned_saleng_phone: s.phone,
    assigned_saleng_plate: s.plate,
    match_channel: 'self_pick',
    saleng_accepted: true,
  });

  test('ซาเล้งที่ยังไม่อนุมัติ / ถูกระงับ อ่านและรับงานไม่ได้', async ({ seed }) => {
    const id = await createRequest(seed.users.A, { status: 'open_for_saleng' });
    for (const key of ['PENDING', 'SUSPENDED']) {
      const s = seed.salengs[key];
      expectDenied(await asUser.get(s.idToken, `pickup_requests/${id}`));
      expectDenied(await asUser.update(s.idToken, `pickup_requests/${id}`, selfPick(s)));
    }
  });

  test('ซาเล้งอนุมัติแล้ว อ่านได้เฉพาะงานเปิดและงานของตัวเอง', async ({ seed }) => {
    const { S1, S2 } = seed.salengs;
    const open = await createRequest(seed.users.A, { status: 'open_for_saleng' });
    const pending = await createRequest(seed.users.A);
    const othersJob = await createRequest(seed.users.A, { status: 'confirmed', ...matchedTo(S2) });
    const mine = await createRequest(seed.users.A, { status: 'confirmed', ...matchedTo(S1) });
    expectAllowed(await asUser.get(S1.idToken, `pickup_requests/${open}`));
    expectAllowed(await asUser.get(S1.idToken, `pickup_requests/${mine}`));
    expectDenied(await asUser.get(S1.idToken, `pickup_requests/${pending}`));
    expectDenied(await asUser.get(S1.idToken, `pickup_requests/${othersJob}`));
    expectDenied(await asUser.get(S1.idToken, `user_accounts/${seed.users.A.uid}`));
  });

  test('กดรับงานเองได้ แต่ต้องผูกกับตัวเองและแก้เฉพาะ field การจับคู่', async ({ seed }) => {
    const { S1, S2 } = seed.salengs;
    const id = await createRequest(seed.users.A, { status: 'open_for_saleng' });
    expectDenied(await asUser.update(S1.idToken, `pickup_requests/${id}`, selfPick(S2)));
    expectDenied(await asUser.update(S1.idToken, `pickup_requests/${id}`, { ...selfPick(S1), match_channel: 'admin_assign' }));
    expectDenied(await asUser.update(S1.idToken, `pickup_requests/${id}`, { ...selfPick(S1), contact_phone: '0000000000' }));
    expectDenied(await asUser.update(S1.idToken, `pickup_requests/${id}`, { ...selfPick(S1), status: 'confirmed' }));
    expectAllowed(await asUser.update(S1.idToken, `pickup_requests/${id}`, selfPick(S1)));
  });

  test('ปิดงาน/ยกเลิกงานของซาเล้งคนอื่นไม่ได้ และปิดงานที่ Admin ยังไม่ยืนยันไม่ได้', async ({ seed }) => {
    const { S1, S2 } = seed.salengs;
    const othersJob = await createRequest(seed.users.A, { status: 'confirmed', ...matchedTo(S2) });
    expectDenied(await asUser.update(S1.idToken, `pickup_requests/${othersJob}`, { status: 'completed' }));
    expectDenied(await asUser.update(S1.idToken, `pickup_requests/${othersJob}`, { status: 'open_for_saleng', assigned_saleng_id: null }));

    const notConfirmed = await createRequest(seed.users.A, { status: 'pending_match_confirm', ...matchedTo(S1) });
    expectDenied(await asUser.update(S1.idToken, `pickup_requests/${notConfirmed}`, { status: 'completed' }));

    const confirmed = await createRequest(seed.users.A, { status: 'confirmed', ...matchedTo(S1) });
    expectAllowed(await asUser.update(S1.idToken, `pickup_requests/${confirmed}`, { status: 'completed', completed_at: new Date() }));
  });

  test('อนุมัติตัวเอง / สมัครแบบอนุมัติแล้ว ไม่ได้', async ({ seed }) => {
    const p = seed.salengs.PENDING;
    expectDenied(await asUser.update(p.idToken, `saleng_accounts/${p.uid}`, { approval_status: 'approved' }));
    expectDenied(await asUser.create(p.idToken, `active_salengs/${p.uid}`, { since: new Date() }));

    const fresh = await emu.signUp(salengEmail('0899990000'), PASSWORD);
    const account = { full_name: 'x', phone_number: '0899990000', service_sub_districts: ['เวียง'], account_status: 'active' };
    expectDenied(await asUser.create(fresh.idToken, `saleng_accounts/${fresh.uid}`, { ...account, approval_status: 'approved' }));
    expectDenied(await asUser.create(fresh.idToken, `saleng_accounts/${seed.users.A.uid}`, { ...account, approval_status: 'pending' }));
    expectAllowed(await asUser.create(fresh.idToken, `saleng_accounts/${fresh.uid}`, { ...account, approval_status: 'pending' }));
  });

  test('เอกสารสมัคร (รูปบัตรประชาชน) อ่านได้เฉพาะเจ้าของและ admin', async ({ seed }) => {
    const { S1, S2 } = seed.salengs;
    await emu.setDoc('saleng_documents/d1', { saleng_id: S1.uid, doc_type: 'id_card_photo', image_data: 'data:image/jpeg;base64,AA' });
    expectAllowed(await asUser.get(S1.idToken, 'saleng_documents/d1'));
    expectAllowed(await asUser.get(seed.admin.idToken, 'saleng_documents/d1'));
    expectDenied(await asUser.get(S2.idToken, 'saleng_documents/d1'));
    expectDenied(await asUser.get(seed.users.A.idToken, 'saleng_documents/d1'));
  });
});

test('Admin เปลี่ยนสถานะคำขอได้', async ({ seed }) => {
  const id = await createRequest(seed.users.A);
  expectAllowed(await asUser.update(seed.admin.idToken, `pickup_requests/${id}`, { status: 'open_for_saleng' }));
});
