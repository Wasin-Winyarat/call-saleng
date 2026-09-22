// หมวด 4 — ไม่ล็อกอินแล้วอ่านข้อมูลไม่ได้ (ระดับ Firestore rule จริง ไม่ผ่าน UI/SDK)
//
// ยิง Firestore REST API ตรง โดย "ไม่ใส่ Authorization header เลย" (= ไม่ login) แล้วดูว่า Firestore
// ปฏิเสธด้วย permission-denied จริงหรือไม่ ตามกฎเดียวใน firestore.rules: allow read, write: if request.auth != null
//
// ไม่ต้องใช้ Firebase SDK ใดๆ — เรียก REST endpoint ตรงด้วย fetch (Node >= 18 มี fetch ในตัว)
// projectId เป็นค่า public (เห็นได้จาก webapp/firebase-config.js อยู่แล้ว) ไม่ใช่ secret
//
// วิธีรัน: node scripts/unauth-read.js   (จาก โฟลเดอร์ e2e/)

const PROJECT_ID = 'callsaleng';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/pickup_requests`;

async function main() {
  const ts = new Date().toISOString();
  console.log(`[${ts}] unauth-read: GET ${FIRESTORE_URL}`);
  console.log('(ไม่ส่ง Authorization header เลย — จำลอง "ไม่ login")');

  const res = await fetch(FIRESTORE_URL);
  const body = await res.json();

  console.log('HTTP status:', res.status);
  console.log('Response body:', JSON.stringify(body, null, 2));

  const bodyStr = JSON.stringify(body);
  const denied = res.status === 403 && bodyStr.includes('PERMISSION_DENIED');

  console.log('---');
  console.log(
    denied
      ? 'PASS: อ่าน pickup_requests โดยไม่ login ถูกปฏิเสธจริง (permission-denied) — ตรงตาม firestore.rules ปัจจุบัน'
      : 'FAIL: คาดว่าจะถูกปฏิเสธ (403 PERMISSION_DENIED) แต่ผลจริงไม่ตรง — ตรวจสอบ firestore.rules ว่ามีการเปลี่ยนแปลงหรือไม่',
  );
  process.exitCode = denied ? 0 : 1;
}

main().catch((err) => {
  console.error('unauth-read script error:', err);
  process.exitCode = 2;
});
