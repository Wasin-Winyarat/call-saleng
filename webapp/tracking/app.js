// หน้าติดตาม: รายการคำขอทั้งหมดของฉัน (real-time) — แต่ละการ์ดลิงก์ไปหน้ารายละเอียด (request-detail/)
// และหน้าแชทของคำขอนั้น (chat/) — แก้ไข/ลบคำขอย้ายไปทำที่หน้ารายละเอียด
// STATUS_LABEL / escapeHtml / detailUrl / chatUrl มาจาก request-helpers.js

const requestList = document.getElementById("requestList");
let currentUserId = null;
let unsubscribeRequests = null;
let chatListeners = new Map(); // requestId → unsubscribe ของ listener แชท (ใช้นับข้อความที่ยังไม่อ่าน)
let chatCache = new Map(); // requestId → ข้อความทั้งหมด (คงไว้ตอนการ์ดถูกสร้างใหม่)
let seen = null; // สถานะ "เห็นแล้ว" ปัจจุบัน (notify-helpers.js) — อัปเดตทันทีที่ render
let seenAtLoad = null; // ภาพตอนเปิดหน้า — ใช้ตัดสินว่าสถานะไหน "ใหม่" ระหว่างที่เปิดหน้านี้อยู่

// ---------- auth guard ----------
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }
  // ปิด listener ของบัญชีก่อนหน้าทั้งหมด (กรณีสลับบัญชีใน browser เดียวกันโดยไม่ reload หน้า)
  // ไม่งั้น listener เก่ากับใหม่จะเขียนลง requestList เดียวกันจนเห็นคำขอปนกัน
  if (unsubscribeRequests) unsubscribeRequests();
  chatListeners.forEach((unsubscribe) => unsubscribe());
  chatListeners = new Map();
  chatCache = new Map();
  requestList.innerHTML = '<div class="empty-note">กำลังโหลด...</div>';

  currentUserId = user.uid;
  seen = loadSeenState(currentUserId);
  seenAtLoad = JSON.parse(JSON.stringify(seen));
  subscribeMyRequests();
});

// ---------- รายการคำขอของฉันเท่านั้น (real-time) ----------
function subscribeMyRequests() {
  const uid = currentUserId;
  unsubscribeRequests = db.collection("pickup_requests")
    .where("user_id", "==", currentUserId)
    .orderBy("created_at", "desc")
    .onSnapshot(
      (snapshot) => {
        if (uid !== currentUserId) return;
        // กันซ้ำฝั่ง client: แสดงเฉพาะ doc ที่ user_id ตรงกับผู้ login จริง
        const docs = snapshot.docs.filter((docSnap) => docSnap.data().user_id === uid);
        if (!docs.length) {
          requestList.innerHTML = '<div class="empty-note">ยังไม่มีคำขอ — <a href="../pickup-request/index.html">ส่งคำร้องแรกของคุณได้ที่นี่</a></div>';
          return;
        }
        requestList.innerHTML = "";
        docs.forEach((docSnap) => {
          const data = docSnap.data();
          requestList.appendChild(renderRequestCard(docSnap.id, data));
          seen.status[docSnap.id] = data.status;
          subscribeChat(docSnap.id);
        });
        saveSeenState(uid, seen);
      },
      (err) => {
        console.error(err);
        requestList.innerHTML = `<div class="empty-note">โหลดรายการไม่สำเร็จ (${err.code === "permission-denied" ? "ตั้งค่า Firestore Security Rules ก่อน" : "ลองรีเฟรชหน้าใหม่"})</div>`;
      },
    );
}

function renderRequestCard(id, data) {
  const card = document.createElement("div");
  card.className = "request-card";
  card.innerHTML = `
    <a class="request-card-top request-card-link" href="${detailUrl(id)}">
      <div class="request-card-thumb">♻️</div>
      <div class="request-card-body">
        <div class="request-card-title">${escapeHtml((data.waste_types || []).join(", ") || "-")}</div>
        <div class="request-card-meta">📍 ${escapeHtml(data.sub_district || "-")} — ${escapeHtml(data.address_text || "-")}</div>
        <div class="request-card-meta">🗓️ นัด ${escapeHtml(data.requested_date || "-")} · ${escapeHtml(data.time_slot || "-")}</div>
        <div class="status-row">
          ${statusPillHtml(data.status)}
          ${hasStatusUpdate(seenAtLoad, id, data.status) ? '<span class="new-badge">อัปเดตใหม่</span>' : ""}
        </div>
      </div>
      <span class="request-card-chevron" aria-hidden="true">›</span>
    </a>
    <div class="action-row">
      <a class="btn btn-secondary" href="${detailUrl(id)}">ดูรายละเอียด</a>
      <a class="btn btn-secondary" href="${chatUrl(id)}">💬 แชทกับ Admin <span class="count-badge" id="chat-badge-${id}" hidden></span></a>
    </div>
  `;
  return card;
}

// ---------- นับข้อความใหม่จาก Admin ต่อคำขอ (แสดงเป็นตัวเลขบนปุ่มแชท) ----------
function subscribeChat(requestId) {
  if (chatListeners.has(requestId)) {
    renderChatBadge(requestId); // การ์ดถูกสร้างใหม่ — วาด badge จาก cache ทันที ไม่ต้องรอ snapshot ถัดไป
    return;
  }

  const unsubscribe = db.collection("chat_messages")
    .where("request_id", "==", requestId)
    .onSnapshot((snapshot) => {
      chatCache.set(requestId, snapshot.docs.map((docSnap) => docSnap.data()));
      renderChatBadge(requestId);
    }, (err) => console.error("โหลดแชทไม่สำเร็จ", err));
  chatListeners.set(requestId, unsubscribe);
}

function renderChatBadge(requestId) {
  const badge = document.getElementById(`chat-badge-${requestId}`);
  const messages = chatCache.get(requestId);
  if (!badge || !messages) return;
  const unread = countUnreadAdminMessages(seen, requestId, messages);
  badge.textContent = unread;
  badge.hidden = unread === 0;
}
