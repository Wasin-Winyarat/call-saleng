// หน้ารายละเอียดคำขอ 1 รายการ (?id=<pickup_request id>) — เปิดจากการ์ดหน้าหลัก/หน้าติดตาม
// แสดงสถานะ + แถบขั้นตอน, ข้อมูลคำขอทั้งหมด, รูปถ่ายขยะ, ปุ่มไปหน้าแชทของคำขอนี้ และแก้ไข/ลบ (เฉพาะตอนรอตรวจสอบ)

const requestId = new URLSearchParams(window.location.search).get("id");
const detail = document.getElementById("detail");
const toast = document.getElementById("toast");
const backLink = document.getElementById("backLink");

let currentUserId = null;
let currentData = null;
let photos = []; // data URL ของรูปถ่ายขยะ
let chatMessages = [];

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

// ย้อนกลับไปหน้าที่กดมา (หน้าหลักหรือหน้าติดตาม) ถ้ามาจากในแอป ไม่งั้นไปหน้าติดตาม
backLink.addEventListener("click", (e) => {
  if (document.referrer.startsWith(window.location.origin) && window.history.length > 1) {
    e.preventDefault();
    window.history.back();
  }
});

function showNotFound() {
  detail.innerHTML = '<div class="empty-note">ไม่พบคำขอนี้ — <a href="../tracking/index.html">กลับไปหน้าติดตาม</a></div>';
}

auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }
  currentUserId = user.uid;
  if (!requestId) {
    showNotFound();
    return;
  }

  db.collection("pickup_requests").doc(requestId).onSnapshot((snap) => {
    const data = snap.data();
    if (!snap.exists || data.user_id !== currentUserId) {
      currentData = null;
      showNotFound();
      return;
    }
    currentData = data;

    const seen = loadSeenState(currentUserId);
    seen.status[requestId] = data.status;
    saveSeenState(currentUserId, seen);

    render();
  }, (err) => {
    console.error(err);
    showNotFound();
  });

  db.collection("request_photos")
    .where("request_id", "==", requestId)
    .where("user_id", "==", currentUserId)
    .get()
    .then((snap) => {
      photos = snap.docs
        .map((doc) => doc.data())
        .filter((photo) => SAFE_IMAGE_DATA.test(photo.image_data || ""))
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        .map((photo) => photo.image_data);
      render();
    })
    .catch((err) => console.error("โหลดรูปถ่ายขยะไม่สำเร็จ", err));

  db.collection("chat_messages")
    .where("request_id", "==", requestId)
    .onSnapshot((snap) => {
      chatMessages = snap.docs.map((doc) => doc.data());
      renderChatBadge();
    }, (err) => console.error("โหลดแชทไม่สำเร็จ", err));
});

function formatTimestamp(ts) {
  if (!ts || !ts.toDate) return "-";
  return ts.toDate().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function infoRow(label, value) {
  return `<div class="info-row"><dt>${label}</dt><dd>${escapeHtml(value || "-")}</dd></div>`;
}

function render() {
  if (!currentData) return;
  const data = currentData;
  const isCancelled = data.status === "cancelled";

  const hint = isCancelled
    ? `<div class="detail-hint cancelled"><b>คำขอนี้ถูกยกเลิก</b>${data.cancel_reason ? `<br>เหตุผล: ${escapeHtml(data.cancel_reason)}` : ""}</div>`
    : `<div class="detail-hint">${escapeHtml(STATUS_HINT[data.status] || "")}</div>`;

  const address = [data.address_text, data.landmark ? `(${data.landmark})` : ""].filter(Boolean).join(" ");

  detail.innerHTML = `
    <div class="detail-card">
      <div class="detail-card-head">
        <div class="detail-card-title">${escapeHtml((data.waste_types || []).join(", ") || "-")}</div>
        ${statusPillHtml(data.status)}
      </div>
      ${isCancelled ? "" : progressStepsHtml(data.status)}
      <div style="${isCancelled ? "margin-top:12px;" : ""}">${hint}</div>
    </div>

    ${["confirmed", "completed"].includes(data.status) && data.assigned_saleng_name ? `
      <div class="detail-card saleng-card">
        <div class="detail-card-title">🛺 ซาเล้งที่${data.status === "completed" ? "รับงานนี้" : "จะเข้าไปรับ"}</div>
        <dl class="info-list">
          ${infoRow("ชื่อ", data.assigned_saleng_name)}
          <div class="info-row"><dt>เบอร์โทร</dt><dd><a href="tel:${escapeHtml(data.assigned_saleng_phone || "")}">${escapeHtml(data.assigned_saleng_phone || "-")}</a></dd></div>
          ${infoRow("ทะเบียนรถ", data.assigned_saleng_plate)}
        </dl>
      </div>` : ""}

    <a class="chat-cta" id="chatCta" href="${chatUrl(requestId)}">
      <span class="chat-cta-icon" aria-hidden="true">💬<span class="unread-dot" id="chatBadge" hidden></span></span>
      <div class="chat-cta-body">
        <div class="chat-cta-title">แชทกับ Admin</div>
        <div class="chat-cta-desc" id="chatCtaDesc">สอบถามหรือแจ้งข้อมูลเพิ่มเติมเกี่ยวกับคำขอนี้</div>
      </div>
      <span class="chat-cta-chevron" aria-hidden="true">›</span>
    </a>

    <div class="detail-card">
      <dl class="info-list">
        ${infoRow("วันที่นัดรับ", `${data.requested_date || "-"} · ${data.time_slot || "-"}`)}
        ${infoRow("ประเภทขยะ", (data.waste_types || []).join(", "))}
        ${infoRow("ปริมาณ", data.estimated_quantity_description)}
        ${infoRow("พื้นที่", data.sub_district)}
        ${infoRow("ที่อยู่", address)}
        ${infoRow("ผู้ติดต่อ", `${data.contact_name || "-"} · ${data.contact_phone || "-"}`)}
        ${infoRow("หมายเหตุ", data.notes)}
        ${infoRow("ส่งคำขอเมื่อ", formatTimestamp(data.created_at))}
      </dl>
    </div>

    ${photos.length ? `
      <div class="detail-card">
        <div class="detail-card-title">รูปถ่ายขยะ (${photos.length})</div>
        <div class="photo-grid">${photos.map((_, i) => `<button type="button" data-photo="${i}" aria-label="ดูรูปที่ ${i + 1}"><img src="${photos[i]}" alt=""></button>`).join("")}</div>
      </div>` : ""}

    ${ownerActionsHtml(data.status)}
  `;

  detail.querySelectorAll("[data-photo]").forEach((btn) => {
    btn.addEventListener("click", () => openPhotoViewer(photos[Number(btn.dataset.photo)]));
  });

  const editBtn = document.getElementById("editBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  if (editBtn) editBtn.addEventListener("click", () => handleOwnerAction("edit"));
  if (deleteBtn) deleteBtn.addEventListener("click", () => handleOwnerAction("cancel"));

  renderChatBadge();
}

// ---------- แก้ไข/ลบคำขอ ----------
// รอ Admin ตรวจสอบ → แก้ไข/ลบเองได้ทันที (rules อนุญาตเฉพาะสถานะนี้)
// Admin ยืนยันแล้ว (ยังไม่จบงาน) → ปุ่มเดิม แต่พาไปหน้าแชทพร้อมข้อความร่าง ให้ Admin เป็นผู้แก้ไข/ยกเลิกให้
// ยกเลิกแล้ว/เสร็จสิ้น → ไม่มีปุ่ม (ไม่มีอะไรให้แก้)
function ownerActionsHtml(status) {
  if (FINISHED_STATUSES.includes(status)) return "";
  const viaAdmin = status !== "pending_admin_review";
  return `
    <div class="action-row">
      <button type="button" class="btn btn-edit" id="editBtn">✏️ แก้ไขคำขอ</button>
      <button type="button" class="btn btn-danger" id="deleteBtn">🗑️ ${viaAdmin ? "ยกเลิกคำขอ" : "ลบคำขอ"}</button>
    </div>
    ${viaAdmin ? '<div class="owner-actions-note">Admin ยืนยันคำขอนี้แล้ว — การแก้ไขหรือยกเลิกจะส่งเป็นข้อความถึง Admin ให้ดำเนินการให้</div>' : ""}
  `;
}

function handleOwnerAction(action) {
  if (currentData.status === "pending_admin_review") {
    if (action === "edit") window.location.href = `../pickup-request/index.html?edit=${encodeURIComponent(requestId)}`;
    else deleteRequest();
    return;
  }

  const what = action === "edit" ? "แก้ไข" : "ยกเลิก";
  if (!window.confirm(`คำขอนี้ Admin ยืนยันแล้ว จึง${what}เองไม่ได้\nต้องการส่งข้อความแจ้ง Admin ให้${what}ให้หรือไม่?`)) return;
  window.location.href = `${chatUrl(requestId)}&draft=${action}`;
}

// มีข้อความใหม่ → จุดแดงพร้อมตัวเลขที่มุมไอคอน + เปลี่ยนคำอธิบายเป็นจำนวนข้อความใหม่
function renderChatBadge() {
  const badge = document.getElementById("chatBadge");
  if (!badge || !currentUserId) return;
  const unread = countUnreadAdminMessages(loadSeenState(currentUserId), requestId, chatMessages);
  badge.textContent = unread > 9 ? "9+" : unread;
  badge.hidden = unread === 0;
  document.getElementById("chatCta").classList.toggle("has-new", unread > 0);
  document.getElementById("chatCtaDesc").textContent = unread
    ? `มีข้อความใหม่จาก Admin ${unread} ข้อความ`
    : "สอบถามหรือแจ้งข้อมูลเพิ่มเติมเกี่ยวกับคำขอนี้";
  document.getElementById("chatCta").setAttribute("aria-label", unread ? `แชทกับ Admin, ข้อความใหม่ ${unread} ข้อความ` : "แชทกับ Admin");
}

function openPhotoViewer(src) {
  const overlay = document.createElement("div");
  overlay.className = "photo-viewer";
  overlay.innerHTML = `<img src="${src}" alt="รูปถ่ายขยะ">`;
  overlay.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

async function deleteRequest() {
  if (!window.confirm("ลบคำขอนี้? การลบไม่สามารถย้อนกลับได้")) return;
  try {
    await deleteRequestWithPhotos(requestId, currentUserId);
    window.location.href = "../tracking/index.html";
  } catch (err) {
    console.error(err);
    showToast("ลบคำขอไม่สำเร็จ", true);
  }
}
