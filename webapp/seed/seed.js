import { db } from "../firebase-config.js";
import {
  doc, setDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Collection names: pluralized จากชื่อ table ใน database-schema.md
// user_account -> user_accounts, pickup_request -> pickup_requests (ให้ตรงกับ collection ที่โมดูล pickup-request ใช้อยู่แล้ว)

const USERS = [
  { id: "demo-user-1", full_name: "สมหญิง ใจงาม", phone_number: "089-123-4567", status: "active" },
  { id: "demo-user-2", full_name: "วิชัย รักธรรม", phone_number: "082-345-6789", status: "active" },
  { id: "demo-user-3", full_name: "อรุณี พูลสวัสดิ์", phone_number: "089-876-5432", status: "active" },
  { id: "demo-user-4", full_name: "ประยุทธ ศรีสุข", phone_number: "086-555-1234", status: "active" },
  { id: "demo-user-5", full_name: "กนกวรรณ แซ่ตั้ง", phone_number: "091-222-3344", status: "suspended" },
];

// แต่ละคำขอผูก user_id กับ user ด้านบน 1 คน ตั้งใจให้ status ต่างกันครบทุกค่าตาม enum ของ pickup_request.status
const REQUESTS = [
  {
    id: "demo-request-1",
    user_id: "demo-user-1",
    contact_name: "สมหญิง ใจงาม",
    contact_phone: "089-123-4567",
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
    user_id: "demo-user-2",
    contact_name: "วิชัย รักธรรม",
    contact_phone: "082-345-6789",
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
    user_id: "demo-user-3",
    contact_name: "อรุณี พูลสวัสดิ์",
    contact_phone: "089-876-5432",
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
    user_id: "demo-user-4",
    contact_name: "ประยุทธ ศรีสุข",
    contact_phone: "086-555-1234",
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
    user_id: "demo-user-5",
    contact_name: "กนกวรรณ แซ่ตั้ง",
    contact_phone: "091-222-3344",
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

function log(message, kind = "") {
  const line = document.createElement("div");
  if (kind) line.className = kind;
  line.textContent = message;
  logEl.appendChild(line);
}

btn.addEventListener("click", async () => {
  btn.disabled = true;
  logEl.innerHTML = "";
  log("เริ่มสร้างข้อมูล...");

  try {
    for (const user of USERS) {
      const { id, ...fields } = user;
      await setDoc(doc(db, "user_accounts", id), {
        ...fields,
        created_at: serverTimestamp(),
      });
      log(`✔ user_accounts/${id} (${fields.full_name}, ${fields.status})`, "ok");
    }

    for (const request of REQUESTS) {
      const { id, ...fields } = request;
      await setDoc(doc(db, "pickup_requests", id), {
        ...fields,
        photo_urls: [],
        created_at: serverTimestamp(),
      });
      log(`✔ pickup_requests/${id} → user_id: ${fields.user_id} (${fields.status})`, "ok");
    }

    log("เสร็จสิ้น — สร้าง 5 user_accounts และ 5 pickup_requests ที่ผูกกันแล้ว", "ok");
  } catch (err) {
    console.error(err);
    const message = err.code === "permission-denied"
      ? "ล้มเหลว: Firestore ปฏิเสธสิทธิ์ — ตั้งค่า Security Rules ให้ user_accounts/pickup_requests ก่อน"
      : `ล้มเหลว: ${err.message}`;
    log(message, "err");
  } finally {
    btn.disabled = false;
  }
});
