// กติกาฝั่งซาเล้งที่ใช้ร่วมกันระหว่างหน้าซาเล้ง (saleng/) และหน้า admin
// อ้างอิง business rule ใน docs/01-requirements/01-spec/20260912-002-saleng-auto-matching.md

// ตำบลในพื้นที่ให้บริการ (ชุดเดียวกับที่ user เลือกในหน้าโปรไฟล์)
const SALENG_SUB_DISTRICTS = ["รอบเวียง", "เวียง", "แม่ยาว", "นางแล", "ริมกก"];

const SLOT_START_HOUR = { "08:00-13:00": 8, "13:00-18:00": 13 };
const SLOT_LABEL = { "08:00-13:00": "รอบเช้า", "13:00-18:00": "รอบบ่าย" };

// โควตาคิวต่อซาเล้ง
const MAX_JOBS_PER_SLOT = 3; // วันเดียวกัน + รอบเดียวกัน
const MAX_ACTIVE_JOBS = 6; // รับแล้วยังไม่เสร็จ รวมทุกวัน

// ยกเลิกเองได้ถึง = เวลาเริ่มรอบนัด − min(6 ชม., ครึ่งหนึ่งของเวลาตั้งแต่กดรับถึงเวลาเริ่มรอบนัด)
const CANCEL_LEAD_MAX_MS = 6 * 60 * 60 * 1000;

// สถานะที่ถือว่า "ซาเล้งถืองานนี้อยู่" (นับโควตา)
const SALENG_ACTIVE_STATUSES = ["pending_match_confirm", "confirmed"];

function salengPhoneToEmail(phone) {
  // แยก domain จาก user (phoneToEmail) — เบอร์เดียวกันเป็นได้ทั้งลูกค้าและซาเล้งคนละบัญชี
  return `${phone.replace(/[\s-]/g, "")}@callsaleng-saleng.app`;
}

function slotStartDate(requestedDate, timeSlot) {
  const hour = SLOT_START_HOUR[timeSlot];
  if (!requestedDate || hour === undefined) return null;
  const [y, m, d] = requestedDate.split("-").map(Number);
  return new Date(y, m - 1, d, hour, 0, 0);
}

function slotKey(data) {
  return `${data.requested_date}|${data.time_slot}`;
}

function slotText(data) {
  return `${data.requested_date || "-"} ${SLOT_LABEL[data.time_slot] || ""} (${data.time_slot || "-"})`;
}

function toDate(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  return ts instanceof Date ? ts : new Date(ts);
}

// เวลาสุดท้ายที่ซาเล้งยกเลิกงานที่ Admin ยืนยันแล้วได้เอง (null = คำนวณไม่ได้ → ต้องผ่าน Admin)
function cancelDeadline(data) {
  const start = slotStartDate(data.requested_date, data.time_slot);
  const acceptedAt = toDate(data.accepted_at);
  if (!start || !acceptedAt) return null;
  const lead = Math.min(CANCEL_LEAD_MAX_MS, Math.max(0, start - acceptedAt) / 2);
  return new Date(start.getTime() - lead);
}

// ซาเล้งยกเลิกเองได้ไหม: ก่อน Admin ยืนยัน = ได้เสมอ / หลังยืนยัน = ก่อนเวลาสุดท้ายเท่านั้น
function canSalengSelfCancel(data, now = new Date()) {
  if (data.status === "pending_match_confirm") return true;
  if (data.status !== "confirmed") return false;
  const deadline = cancelDeadline(data);
  return !!deadline && now <= deadline;
}

function formatDateTime(date) {
  if (!date) return "-";
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

// นับงานที่ซาเล้งถืออยู่: รวมทั้งหมด + แยกตามรอบ (key = "YYYY-MM-DD|slot")
function salengLoad(jobs) {
  const perSlot = new Map();
  let active = 0;
  jobs.forEach((job) => {
    if (!SALENG_ACTIVE_STATUSES.includes(job.status)) return;
    active++;
    perSlot.set(slotKey(job), (perSlot.get(slotKey(job)) || 0) + 1);
  });
  return { active, perSlot };
}

// เหตุผลที่รับงานนี้ไม่ได้เพราะโควตาเต็ม (null = รับได้)
function quotaBlockReason(load, job) {
  if (load.active >= MAX_ACTIVE_JOBS) return `งานค้างครบ ${MAX_ACTIVE_JOBS} งานแล้ว — ปิดงานเก่าก่อน`;
  const inSlot = load.perSlot.get(slotKey(job)) || 0;
  if (inSlot >= MAX_JOBS_PER_SLOT) return `คิว${SLOT_LABEL[job.time_slot] || "รอบนี้"}วันที่ ${job.requested_date} เต็มแล้ว (${inSlot}/${MAX_JOBS_PER_SLOT})`;
  return null;
}
