// ข้อมูล/ฟังก์ชันของคำขอ (pickup_requests) ที่ใช้ร่วมกันหลายหน้าฝั่ง user:
// หน้าหลัก (การ์ดคำขอที่กำลังดำเนินการ), หน้ารายละเอียดคำขอ, หน้าแชทต่อคำขอ, หน้าติดตาม
// แถบขั้นตอนใช้ CSS จาก request-progress.css

const STATUS_LABEL = {
  pending_admin_review: "รอตรวจสอบ",
  cancelled: "ยกเลิกแล้ว",
  open_for_saleng: "รอสาเล้งรับงาน",
  pending_match_confirm: "รอยืนยันการจับคู่",
  confirmed: "ยืนยันแล้ว",
  completed: "เสร็จสิ้น",
};

const PROGRESS_STEPS = [
  { label: "ส่งคำขอ", statuses: ["pending_admin_review"] },
  { label: "Admin ยืนยัน", statuses: ["open_for_saleng"] },
  { label: "สาเล้งรับงาน", statuses: ["pending_match_confirm", "confirmed"] },
  { label: "เสร็จสิ้น", statuses: ["completed"] },
];

const STATUS_HINT = {
  pending_admin_review: "Admin กำลังตรวจสอบคำขอของคุณ",
  open_for_saleng: "Admin ยืนยันแล้ว กำลังหาสาเล้งมารับงาน",
  pending_match_confirm: "มีสาเล้งรับงานแล้ว รอยืนยันการจับคู่",
  confirmed: "สาเล้งจะเข้ารับตามวันเวลาที่นัดไว้",
  completed: "เข้ารับขยะเรียบร้อยแล้ว ขอบคุณที่ช่วยรีไซเคิล",
};

const FINISHED_STATUSES = ["cancelled", "completed"];

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function statusPillHtml(status) {
  return `<span class="status-pill ${escapeHtml(status)}">${escapeHtml(STATUS_LABEL[status] || status || "-")}</span>`;
}

// <ol> แถบ 4 ขั้น — สถานะ cancelled ไม่มีขั้นที่ตรงกัน จึงไม่ highlight ขั้นใดเลย
function progressStepsHtml(status) {
  const currentStep = PROGRESS_STEPS.findIndex((step) => step.statuses.includes(status));
  const steps = PROGRESS_STEPS.map((step, i) => {
    const done = i < currentStep || status === "completed";
    const state = done ? "done" : (i === currentStep ? "current" : "");
    return `<li class="progress-step ${state}"><span class="progress-dot">${done ? "✓" : i + 1}</span><span class="progress-label">${step.label}</span></li>`;
  }).join("");
  return `<ol class="progress-steps">${steps}</ol>`;
}

function detailUrl(requestId) {
  return `../request-detail/index.html?id=${encodeURIComponent(requestId)}`;
}

function chatUrl(requestId) {
  return `../chat/index.html?id=${encodeURIComponent(requestId)}`;
}

// ลบรูปถ่ายขยะที่แนบไว้ (request_photos) แล้วลบตัวคำขอ ใน batch เดียวกัน — ทำได้เฉพาะตอนยัง pending_admin_review ตาม rules
async function deleteRequestWithPhotos(requestId, uid) {
  const photoSnap = await db.collection("request_photos")
    .where("request_id", "==", requestId)
    .where("user_id", "==", uid)
    .get();
  const batch = db.batch();
  photoSnap.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(db.collection("pickup_requests").doc(requestId));
  await batch.commit();
}
