// หมวด 5 — บัญชีที่สองเปิดข้อมูลของบัญชีแรกไม่ได้ (Cross-user data isolation) — ระดับ Firestore rule จริง
//
// ***คาดผลจริงว่าจะ "ไม่ผ่าน" ตาม firestore.rules ปัจจุบัน*** เพราะกฎเดียวคือ
// `allow read, write: if request.auth != null` — เช็กแค่ login แล้วหรือยัง ไม่เช็ก ownership/role เลย
// สคริปต์นี้พิสูจน์ด้วยการรันจริง (sign-in เป็น 2 บัญชีจริงผ่าน Firebase Auth REST แล้วอ่าน Firestore ตรง)
// ไม่ใช่แค่อ่านโค้ดสรุปเอง ตามที่ coordinator ระบุไว้
//
// ไม่มีการเขียนข้อมูลใดๆ เลยในสคริปต์นี้ (อ่านอย่างเดียว) — ปลอดภัยที่จะรันบน production
//
// บัญชีที่ใช้ (มีอยู่แล้วจากหน้า /login/index.html และ webapp/seed/seed.js ไม่ใช่ secret):
//   user A = 089-123-4567 / Demo1234!
//   user B = 082-345-6789 / Demo1234!
//   admin  = admin1        / Demo1234!  (ใช้เสริมเพื่อทดสอบอ่าน admin_accounts)
//
// apiKey/projectId เป็นค่า public client config เดียวกับ webapp/firebase-config.js ไม่ใช่ secret
//
// วิธีรัน: node scripts/cross-user-read.js   (จากโฟลเดอร์ e2e/)

const API_KEY = 'AIzaSyA9YFXYAe6DAjtdnkkIstFj7s2ZHV5RXhI';
const PROJECT_ID = 'callsaleng';
const PASSWORD = 'Demo1234!';

const USER_A_PHONE = '0891234567';
const USER_B_PHONE = '0823456789';
const ADMIN_LOGIN_ID = 'admin1';

function phoneToEmail(phone) {
  return `${phone.replace(/[\s-]/g, '')}@callsaleng.app`;
}
function adminIdToEmail(id) {
  return `${id.trim().toLowerCase()}@callsaleng-admin.app`;
}

async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(`signIn failed for ${email}: ${JSON.stringify(body)}`);
  return { idToken: body.idToken, uid: body.localId };
}

async function firestoreGet(path, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  const body = await res.json();
  return { status: res.status, body };
}

async function firstOwnRequestId(uid, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'pickup_requests' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'user_id' },
            op: 'EQUAL',
            value: { stringValue: uid },
          },
        },
        limit: 1,
      },
    }),
  });
  const rows = await res.json();
  if (!res.ok) throw new Error(`runQuery failed: ${JSON.stringify(rows)}`);
  const withDoc = Array.isArray(rows) ? rows.find((r) => r.document) : null;
  if (!withDoc) return null;
  return withDoc.document.name.split('/').pop();
}

async function main() {
  const ts = new Date().toISOString();
  console.log(`[${ts}] cross-user-read: เริ่มทดสอบ`);
  const results = {};

  const userA = await signIn(phoneToEmail(USER_A_PHONE), PASSWORD);
  console.log(`sign-in user A สำเร็จ, uid=${userA.uid}`);

  const docId = await firstOwnRequestId(userA.uid, userA.idToken);
  if (!docId) {
    console.log('ไม่พบคำขอของ user A เลยสักรายการ — ต้องมีคำขอ >=1 รายการของ user A อยู่ก่อนจึงทดสอบ cross-user read ต่อได้');
    process.exitCode = 3;
    return;
  }
  console.log(`user A มีคำขออย่างน้อย 1 รายการ (doc id = ${docId})`);

  const userB = await signIn(phoneToEmail(USER_B_PHONE), PASSWORD);
  console.log(`sign-in user B สำเร็จ, uid=${userB.uid}`);

  console.log('\n--- ทดสอบ 1: user B อ่าน pickup_requests ของ user A ตรงๆ (สิ่งที่หมวด 5 ต้องการให้ "อ่านไม่ได้") ---');
  const crossReadRequest = await firestoreGet(`pickup_requests/${docId}`, userB.idToken);
  console.log('HTTP status:', crossReadRequest.status);
  console.log('Response body:', JSON.stringify(crossReadRequest.body, null, 2));
  results.crossReadRequest = crossReadRequest.status;

  console.log('\n--- ทดสอบ 2 (เสริม): user B อ่าน user_accounts ของ user A ตรงๆ ---');
  const crossReadProfile = await firestoreGet(`user_accounts/${userA.uid}`, userB.idToken);
  console.log('HTTP status:', crossReadProfile.status);
  console.log('Response body:', JSON.stringify(crossReadProfile.body, null, 2));
  results.crossReadProfile = crossReadProfile.status;

  console.log('\n--- ทดสอบ 3 (เสริม): user B (ไม่ใช่ admin) อ่าน admin_accounts ตรงๆ ---');
  let crossReadAdminStatus = null;
  try {
    const admin = await signIn(adminIdToEmail(ADMIN_LOGIN_ID), PASSWORD);
    const crossReadAdmin = await firestoreGet(`admin_accounts/${admin.uid}`, userB.idToken);
    console.log('HTTP status:', crossReadAdmin.status);
    console.log('Response body:', JSON.stringify(crossReadAdmin.body, null, 2));
    crossReadAdminStatus = crossReadAdmin.status;
  } catch (err) {
    console.log('ข้าม (sign-in admin ไม่สำเร็จ):', err.message);
  }
  results.crossReadAdmin = crossReadAdminStatus;

  const isolationHeld = results.crossReadRequest === 403 || results.crossReadRequest === 404;

  console.log('\n=== สรุป ===');
  console.log(`user B อ่าน pickup_requests ของ user A: HTTP ${results.crossReadRequest} ${isolationHeld ? '(ถูกปฏิเสธ)' : '(อ่านผ่าน!)'}`);
  console.log(`user B อ่าน user_accounts ของ user A:   HTTP ${results.crossReadProfile}`);
  console.log(`user B อ่าน admin_accounts:              HTTP ${results.crossReadAdmin}`);
  console.log(
    isolationHeld
      ? 'PASS (ตาม requirement เดิม): user B อ่านข้อมูลของ user A ไม่ได้ — cross-user isolation ถูกบังคับจริง'
      : 'FAIL (ตาม requirement เดิม) / ตามคาดจากการอ่าน firestore.rules: user B อ่านข้อมูลของ user A ได้สำเร็จ '
        + '(HTTP 200) เพราะกฎปัจจุบันเช็กแค่ request.auth != null ไม่เช็ก ownership — ไม่มี cross-user isolation จริง',
  );

  process.exitCode = isolationHeld ? 0 : 1;
}

main().catch((err) => {
  console.error('cross-user-read script error:', err);
  process.exitCode = 2;
});
