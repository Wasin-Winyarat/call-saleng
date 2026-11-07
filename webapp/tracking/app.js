const STATUS_LABEL = {
  pending_admin_review: "รอ Admin ตรวจสอบ",
  cancelled: "ยกเลิกแล้ว",
  open_for_saleng: "เปิดให้สาเล้งรับงาน",
  pending_match_confirm: "รอยืนยันการจับคู่",
  confirmed: "ยืนยันแล้ว",
  completed: "เสร็จสิ้น",
};

const requestList = document.getElementById("requestList");
const toast = document.getElementById("toast");
let currentUserId = null;
let unsubscribeRequests = null;
let chatListeners = new Map(); // requestId → unsubscribe ของ listener แชท
let chatCache = new Map(); // requestId → ข้อความล่าสุด (เก็บไว้ render ซ้ำตอนการ์ดถูกสร้างใหม่)
let openChats = new Set(); // requestId ที่เปิดกล่องแชทค้างไว้ — คงสถานะไว้ตอน re-render
let seen = null; // สถานะ "เห็นแล้ว" ปัจจุบัน (notify-helpers.js) — อัปเดตทันทีที่ render
let seenAtLoad = null; // ภาพตอนเปิดหน้า — ใช้ตัดสินว่าสถานะไหน "ใหม่" ระหว่างที่เปิดหน้านี้อยู่

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

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
  openChats = new Set();
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

  const top = document.createElement("div");
  top.className = "request-card-top";

  const thumb = document.createElement("div");
  thumb.className = "request-card-thumb";
  thumb.textContent = "♻️";

  const body = document.createElement("div");
  body.className = "request-card-body";
  body.innerHTML = `
    <div class="request-card-title">${escapeHtml((data.waste_types || []).join(", ") || "-")}</div>
    <div class="request-card-meta">📍 ${escapeHtml(data.sub_district || "-")} — ${escapeHtml(data.address_text || "-")}</div>
    <div class="request-card-meta">🗓️ นัด ${escapeHtml(data.requested_date || "-")} · ${escapeHtml(data.time_slot || "-")}</div>
    ${data.notes ? `<div class="request-card-meta">หมายเหตุ: ${escapeHtml(data.notes)}</div>` : ""}
    <div class="status-row">
      <div class="status-pill ${data.status}">${STATUS_LABEL[data.status] || data.status || "-"}</div>
      ${hasStatusUpdate(seenAtLoad, id, data.status) ? '<span class="new-badge">อัปเดตใหม่</span>' : ""}
    </div>
  `;

  top.appendChild(thumb);
  top.appendChild(body);
  card.appendChild(top);

  if (data.status === "pending_admin_review") {
    card.appendChild(buildOwnerActions(id));
  }

  card.appendChild(buildChatSection(id));
  return card;
}

// ---------- แก้ไข/ลบคำขอของตัวเอง — ทำได้เฉพาะตอนยัง "รอ Admin ตรวจสอบ" เท่านั้น ----------
function buildOwnerActions(id) {
  const row = document.createElement("div");
  row.className = "action-row";
  row.innerHTML = `
    <a class="btn btn-secondary" href="../pickup-request/index.html?edit=${id}">✏️ แก้ไข</a>
    <button type="button" class="btn btn-danger" id="delete-request-${id}">🗑️ ลบ</button>
  `;

  row.querySelector(`#delete-request-${id}`).addEventListener("click", async () => {
    if (!window.confirm("ลบคำขอนี้? การลบไม่สามารถย้อนกลับได้")) return;
    try {
      // ลบรูปถ่ายขยะที่แนบไว้ (request_photos) ก่อน แล้วค่อยลบตัวคำขอ ใน batch เดียวกัน
      const photoSnap = await db.collection("request_photos")
        .where("request_id", "==", id)
        .where("user_id", "==", auth.currentUser.uid)
        .get();
      const batch = db.batch();
      photoSnap.docs.forEach((doc) => batch.delete(doc.ref));
      batch.delete(db.collection("pickup_requests").doc(id));
      await batch.commit();
      showToast("ลบคำขอแล้ว");
    } catch (err) {
      console.error(err);
      showToast("ลบคำขอไม่สำเร็จ", true);
    }
  });

  return row;
}

// ---------- chat thread ต่อคำขอ (chat_messages, sender_role: "user") ----------
function buildChatSection(requestId) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <button type="button" class="chat-toggle" data-request-id="${requestId}">💬 ข้อความกับ Admin <span class="count-badge" id="chat-badge-${requestId}" hidden></span></button>
    <div class="chat-panel${openChats.has(requestId) ? " open" : ""}" id="chat-panel-${requestId}">
      <div class="chat-messages" id="chat-messages-${requestId}">
        <div class="chat-empty">ยังไม่มีข้อความ</div>
      </div>
      <div class="chat-input-row">
        <input type="text" id="chat-input-${requestId}" placeholder="พิมพ์ข้อความถึง Admin...">
        <button type="button" id="chat-send-${requestId}">ส่ง</button>
      </div>
    </div>
  `;

  const toggleBtn = wrap.querySelector(".chat-toggle");
  const panel = wrap.querySelector(`#chat-panel-${requestId}`);
  toggleBtn.addEventListener("click", () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) {
      openChats.add(requestId);
      renderChat(requestId);
    } else {
      openChats.delete(requestId);
    }
  });

  const sendMessage = async () => {
    const input = document.getElementById(`chat-input-${requestId}`);
    const text = input.value.trim();
    if (!text || !currentUserId) return;
    input.value = "";
    try {
      await db.collection("chat_messages").doc().set({
        request_id: requestId,
        sender_role: "user",
        sender_id: currentUserId,
        message_text: text,
        sent_at: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  wrap.querySelector(`#chat-send-${requestId}`).addEventListener("click", sendMessage);
  wrap.querySelector(`#chat-input-${requestId}`).addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  return wrap;
}

function subscribeChat(requestId) {
  if (chatListeners.has(requestId)) {
    renderChat(requestId); // การ์ดถูกสร้างใหม่ — วาดข้อความจาก cache ทันที ไม่ต้องรอ snapshot ถัดไป
    return;
  }

  const unsubscribe = db.collection("chat_messages")
    .where("request_id", "==", requestId)
    .orderBy("sent_at", "asc")
    .onSnapshot((snapshot) => {
      chatCache.set(requestId, snapshot.docs.map((docSnap) => docSnap.data()));
      renderChat(requestId);
    }, (err) => console.error("โหลดแชทไม่สำเร็จ", err));
  chatListeners.set(requestId, unsubscribe);
}

function renderChat(requestId) {
  const container = document.getElementById(`chat-messages-${requestId}`);
  const messages = chatCache.get(requestId);
  if (!container || !messages) return;

  // เปิดกล่องแชทอยู่ = อ่านแล้ว
  if (openChats.has(requestId)) {
    seen.chat[requestId] = Math.max(seen.chat[requestId] || 0, latestMessageMillis(messages));
    saveSeenState(currentUserId, seen);
  }
  const badge = document.getElementById(`chat-badge-${requestId}`);
  const unread = countUnreadAdminMessages(seen, requestId, messages);
  badge.textContent = unread;
  badge.hidden = unread === 0;

  if (!messages.length) {
    container.innerHTML = '<div class="chat-empty">ยังไม่มีข้อความ</div>';
    return;
  }

  container.innerHTML = "";
  messages.forEach((msg) => {
    const isMine = msg.sender_role === "user";
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${isMine ? "mine" : "theirs"}`;
    bubble.innerHTML = `<div class="who">${isMine ? "คุณ" : "Admin"}</div>${escapeHtml(msg.message_text)}`;
    container.appendChild(bubble);
  });
  container.scrollTop = container.scrollHeight;
}
