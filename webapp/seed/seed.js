// Password ตัวอย่างคงที่สำหรับทุกบัญชี seed — ใช้ทดสอบ login จริงได้ทันทีที่หน้า ../login/ และ ../admin/
const DEMO_PASSWORD = "Demo1234!";

const USERS = [
  { full_name: "สมหญิง ใจงาม", phone_number: "089-123-4567", status: "active" },
  { full_name: "วิชัย รักธรรม", phone_number: "082-345-6789", status: "active" },
  { full_name: "อรุณี พูลสวัสดิ์", phone_number: "089-876-5432", status: "active" },
  { full_name: "ประยุทธ ศรีสุข", phone_number: "086-555-1234", status: "active" },
  { full_name: "กนกวรรณ แซ่ตั้ง", phone_number: "091-222-3344", status: "suspended" },
];

const ADMIN = { login_identifier: "admin1", full_name: "ผู้ดูแลระบบ ทดสอบ" };

// แต่ละคำขอผูก user_id กับ user ด้านบน (ตามลำดับ index) ตั้งใจให้ status ต่างกันครบทุกค่าตาม enum ของ pickup_request.status
const REQUEST_TEMPLATES = [
  {
    id: "demo-request-1",
    sub_district: "รอบเวียง",
    address_text: "45/2 ถ.บรรพปราการ",
    landmark: "ใกล้วัดพระแก้ว",
    waste_types: ["พลาสติก", "กระดาษ"],
    estimated_quantity_description: "กลาง (5–15 กก.)",
    requested_date: "2026-09-05",
    time_slot: "08:00-13:00",
    status: "pending_admin_review",
  },
  {
    id: "demo-request-2",
    sub_district: "เวียง",
    address_text: "12 ถ.อุตรกิจ",
    landmark: "ตรงข้ามตลาดสด",
    waste_types: ["เหล็ก", "อลูมิเนียม"],
    estimated_quantity_description: "น้อย (<5 กก.)",
    requested_date: "2026-09-06",
    time_slot: "13:00-18:00",
    status: "open_for_saleng",
  },
  {
    id: "demo-request-3",
    sub_district: "แม่ยาว",
    address_text: "88 หมู่ 4",
    landmark: "หลังโรงเรียนบ้านแม่ยาว",
    waste_types: ["ขวดแก้ว", "พลาสติก"],
    estimated_quantity_description: "มาก (>15 กก.)",
    requested_date: "2026-09-07",
    time_slot: "08:00-13:00",
    status: "pending_match_confirm",
  },
  {
    id: "demo-request-4",
    sub_district: "นางแล",
    address_text: "9 ซอย 3",
    landmark: "",
    waste_types: ["กระดาษ"],
    estimated_quantity_description: "กลาง (5–15 กก.)",
    requested_date: "2026-09-08",
    time_slot: "13:00-18:00",
    status: "confirmed",
  },
  {
    id: "demo-request-5",
    sub_district: "ริมกก",
    address_text: "21 ถ.ริมกก",
    landmark: "",
    waste_types: ["พลาสติก"],
    estimated_quantity_description: "น้อย (<5 กก.)",
    requested_date: "2026-09-04",
    time_slot: "08:00-13:00",
    status: "cancelled",
  },
];

const logEl = document.getElementById("log");
const btn = document.getElementById("seedBtn");
const demoPasswordInline = document.getElementById("demoPasswordInline");
demoPasswordInline.textContent = DEMO_PASSWORD;

function log(message, kind = "") {
  const line = document.createElement("div");
  if (kind) line.className = kind;
  line.textContent = message;
  logEl.appendChild(line);
}

// สร้างบัญชี Auth ใหม่ ถ้ามีอยู่แล้ว (auth/email-already-in-use) ให้ sign in แทนเพื่อได้ uid เดิม
// ทำให้กด seed ซ้ำได้โดยไม่ error และไม่สร้างบัญชีซ้ำซ้อน
async function getOrCreateAuthUser(email, password) {
  try {
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    return { uid: credential.user.uid, created: true };
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      const credential = await auth.signInWithEmailAndPassword(email, password);
      return { uid: credential.user.uid, created: false };
    }
    throw err;
  }
}

btn.addEventListener("click", async () => {
  btn.disabled = true;
  logEl.innerHTML = "";
  log("เริ่มสร้างข้อมูล...");

  try {
    // สำคัญ: เขียน pickup_requests ของ user แต่ละคน "ระหว่าง" ที่ยังล็อกอินเป็นคนนั้นอยู่ (ก่อน signOut)
    // เพราะ Firestore Security Rules ที่แนะนำใน README ผูก create ไว้กับ request.auth.uid == user_id ของ doc นั้น
    for (let i = 0; i < USERS.length; i += 1) {
      const user = USERS[i];
      const email = phoneToEmail(user.phone_number);
      const { uid, created } = await getOrCreateAuthUser(email, DEMO_PASSWORD);

      await db.collection("user_accounts").doc(uid).set({
        full_name: user.full_name,
        phone_number: normalizePhone(user.phone_number),
        status: user.status,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
      });
      log(`✔ user_accounts/${uid} (${user.full_name}, ${user.status}) ${created ? "[สร้างใหม่]" : "[มีอยู่แล้ว]"}`, "ok");

      const { id, ...fields } = REQUEST_TEMPLATES[i];
      await db.collection("pickup_requests").doc(id).set({
        ...fields,
        user_id: uid,
        contact_name: user.full_name,
        contact_phone: normalizePhone(user.phone_number),
        photo_urls: [],
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
      });
      log(`✔ pickup_requests/${id} → user_id: ${uid} (${fields.status})`, "ok");

      await auth.signOut();
    }

    const adminEmail = adminIdToEmail(ADMIN.login_identifier);
    const { uid: adminUid, created: adminCreated } = await getOrCreateAuthUser(adminEmail, DEMO_PASSWORD);
    await db.collection("admin_accounts").doc(adminUid).set({
      full_name: ADMIN.full_name,
      login_identifier: ADMIN.login_identifier,
    });
    log(`✔ admin_accounts/${adminUid} (${ADMIN.full_name}) ${adminCreated ? "[สร้างใหม่]" : "[มีอยู่แล้ว]"}`, "ok");
    await auth.signOut();

    log(`เสร็จสิ้น — login ทดสอบด้วยเบอร์โทรของ user ด้านบน + password "${DEMO_PASSWORD}"`, "ok");
  } catch (err) {
    console.error(err);
    const SEED_ERROR_MESSAGE = {
      "permission-denied": "ล้มเหลว: Firestore ปฏิเสธสิทธิ์ — ตั้งค่า Security Rules ตามที่ระบุใน README ก่อน",
      "auth/operation-not-allowed": "ล้มเหลว: ยังไม่ได้เปิด Email/Password provider ใน Firebase Console → Authentication → Sign-in method",
      "auth/configuration-not-found": "ล้มเหลว: ยังไม่ได้เปิดใช้งาน Firebase Authentication เลย — ไปที่ Firebase Console → Authentication → Get started ก่อน",
    };
    const message = SEED_ERROR_MESSAGE[err.code] || `ล้มเหลว: ${err.message}`;
    log(message, "err");
  } finally {
    btn.disabled = false;
  }
});
