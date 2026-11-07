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

    <a class="chat-cta" href="${chatUrl(requestId)}">
      <div class="chat-cta-body">
        <div class="chat-cta-title">💬 แชทกับ Admin</div>
        <div class="chat-cta-desc">สอบถามหรือแจ้งข้อมูลเพิ่มเติมเกี่ยวกับคำขอนี้</div>
      </div>
      <span class="count-badge" id="chatBadge" hidden></span>
      <span aria-hidden="true">›</span>
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

    ${data.status === "pending_admin_review" ? `
      <div class="action-row">
        <a class="btn btn-edit" href="../pickup-request/index.html?edit=${encodeURIComponent(requestId)}">✏️ แก้ไขคำขอ</a>
        <button type="button" class="btn btn-danger" id="deleteBtn">🗑️ ลบคำขอ</button>
      </div>` : ""}
  `;

  detail.querySelectorAll("[data-photo]").forEach((btn) => {
    btn.addEventListener("click", () => openPhotoViewer(photos[Number(btn.dataset.photo)]));
  });

  const deleteBtn = document.getElementById("deleteBtn");
  if (deleteBtn) deleteBtn.addEventListener("click", deleteRequest);

  renderChatBadge();
}

function renderChatBadge() {
  const badge = document.getElementById("chatBadge");
  if (!badge || !currentUserId) return;
  const unread = countUnreadAdminMessages(loadSeenState(currentUserId), requestId, chatMessages);
  badge.textContent = unread;
  badge.hidden = unread === 0;
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
