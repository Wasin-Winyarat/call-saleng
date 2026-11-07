// ข้อมูลตั้งต้นที่ทุกเทสต์ได้เหมือนกัน — ล้าง emulator แล้วสร้างใหม่ก่อนทุกเทสต์ (เทสต์ไม่กระทบกัน)
// synthetic email ต้องตรงกับ webapp/auth-helpers.js และ webapp/saleng-helpers.js

const emu = require('./emulator');

const PASSWORD = 'Test1234!';

const userEmail = (phone) => `${phone}@callsaleng.app`;
const adminEmail = (id) => `${id}@callsaleng-admin.app`;
const salengEmail = (phone) => `${phone}@callsaleng-saleng.app`;

const USERS = {
  A: { phone: '0891234567', name: 'สมหญิง ใจงาม', address: { sub_district: 'เวียง', address_text: '99/1 ถ.พหลโยธิน', landmark: 'ใกล้ตลาด' } },
  B: { phone: '0823456789', name: 'สมชาย รักดี', address: { sub_district: 'รอบเวียง', address_text: '12 ซ.3', landmark: '' } },
};

const ADMIN = { id: 'admin1', name: 'ผู้ดูแลระบบ ทดสอบ' };

const SALENGS = {
  S1: { phone: '0811111111', name: 'ลุงดำ ขยันเก็บ', plate: '1กข 1234', areas: ['เวียง', 'รอบเวียง'], approval: 'approved', account: 'active' },
  S2: { phone: '0822222222', name: 'ป้าแดง เก็บไว', plate: '2คง 5678', areas: ['แม่ยาว'], approval: 'approved', account: 'active' },
  PENDING: { phone: '0833333333', name: 'น้าเขียว รออนุมัติ', plate: '3จฉ 9999', areas: ['เวียง'], approval: 'pending', account: 'active' },
  SUSPENDED: { phone: '0844444444', name: 'พี่ฟ้า ถูกระงับ', plate: '4ชซ 1111', areas: ['เวียง'], approval: 'approved', account: 'suspended' },
};

// วันที่ในอนาคตรูปแบบ YYYY-MM-DD (ตามเวลาเครื่อง — เหมือนที่หน้าเว็บใช้)
function futureDate(daysAhead = 5) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function seedBase() {
  await emu.clearAll();
  const ctx = { users: {}, admin: null, salengs: {} };

  for (const [key, u] of Object.entries(USERS)) {
    const { uid, idToken } = await emu.signUp(userEmail(u.phone), PASSWORD);
    await emu.setDoc(`user_accounts/${uid}`, { full_name: u.name, phone_number: u.phone, status: 'active', created_at: new Date() });
    await emu.setDoc(`user_addresses/${uid}`, { address_1: u.address });
    ctx.users[key] = { ...u, uid, idToken };
  }

  {
    const { uid, idToken } = await emu.signUp(adminEmail(ADMIN.id), PASSWORD);
    await emu.setDoc(`admin_accounts/${uid}`, { login_identifier: ADMIN.id, full_name: ADMIN.name });
    ctx.admin = { ...ADMIN, uid, idToken };
  }

  for (const [key, s] of Object.entries(SALENGS)) {
    const { uid, idToken } = await emu.signUp(salengEmail(s.phone), PASSWORD);
    await emu.setDoc(`saleng_accounts/${uid}`, {
      full_name: s.name,
      phone_number: s.phone,
      vehicle_plate: s.plate,
      service_sub_districts: s.areas,
      approval_status: s.approval,
      account_status: s.account,
      created_at: new Date(),
    });
    if (s.approval === 'approved' && s.account === 'active') {
      await emu.setDoc(`active_salengs/${uid}`, { since: new Date(), by: ctx.admin.uid });
    }
    ctx.salengs[key] = { ...s, uid, idToken };
  }

  return ctx;
}

let requestCounter = 0;

// สร้าง pickup_request ของ user (ข้าม rules) — overrides ใช้ตั้งสถานะ/การจับคู่ตามที่เทสต์ต้องการ
async function createRequest(user, overrides = {}) {
  requestCounter += 1;
  const id = overrides.id || `req_${Date.now()}_${requestCounter}`;
  const data = {
    user_id: user.uid,
    contact_name: user.name,
    contact_phone: user.phone,
    saved_address_id: 'address_1',
    sub_district: user.address.sub_district,
    address_text: user.address.address_text,
    landmark: user.address.landmark,
    notes: '',
    waste_types: ['กระดาษ'],
    estimated_quantity_description: 'กลาง (5–15 กก.)',
    requested_date: futureDate(5),
    time_slot: '08:00-13:00',
    status: 'pending_admin_review',
    created_at: new Date(Date.now() - requestCounter * 1000),
    ...overrides,
  };
  delete data.id;
  await emu.setDoc(`pickup_requests/${id}`, data);
  return id;
}

// field การจับคู่ของคำขอที่ผูกกับซาเล้ง (ใช้กับ createRequest)
function matchedTo(saleng, { channel = 'self_pick', accepted = true } = {}) {
  return {
    assigned_saleng_id: saleng.uid,
    assigned_saleng_name: saleng.name,
    assigned_saleng_phone: saleng.phone,
    assigned_saleng_plate: saleng.plate,
    match_channel: channel,
    saleng_accepted: accepted,
    assigned_at: new Date(),
    accepted_at: accepted ? new Date() : null,
  };
}

module.exports = { PASSWORD, USERS, ADMIN, SALENGS, futureDate, seedBase, createRequest, matchedTo, userEmail, adminEmail, salengEmail };
