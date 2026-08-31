const STATUS_LABEL = {
  pending_admin_review: "รอ Admin ตรวจสอบ",
  cancelled: "ยกเลิกแล้ว",
  open_for_saleng: "เปิดให้สาเล้งรับงาน",
  pending_match_confirm: "รอยืนยันการจับคู่",
  confirmed: "ยืนยันแล้ว",
  completed: "เสร็จสิ้น",
};

const requestList = document.getElementById("requestList");
const subscribedChats = new Set();
let currentUserId = null;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// ---------- auth guard ----------
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }
  currentUserId = user.uid;
  subscribeMyRequests();
});

// ---------- รายการคำขอของฉันเท่านั้น (real-time) ----------
function subscribeMyRequests() {
  db.collection("pickup_requests")
    .where("user_id", "==", currentUserId)
    .orderBy("created_at", "desc")
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          requestList.innerHTML = '<div class="empty-note">ยังไม่มีคำขอ — <a href="../pickup-request/index.html">ส่งคำร้องแรกของคุณได้ที่นี่</a></div>';
          return;
        }
        requestList.innerHTML = "";
        snapshot.forEach((docSnap) => {
          requestList.appendChild(renderRequestCard(docSnap.id, docSnap.data()));
          subscribeChat(docSnap.id);
        });
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
    <div class="status-pill ${data.status}">${STATUS_LABEL[data.status] || data.status || "-"}</div>
  `;

  top.appendChild(thumb);
  top.appendChild(body);
  card.appendChild(top);
  card.appendChild(buildChatSection(id));
  return card;
}

// ---------- chat thread ต่อคำขอ (chat_messages, sender_role: "user") ----------
function buildChatSection(requestId) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <button type="button" class="chat-toggle" data-request-id="${requestId}">💬 ข้อความกับ Admin</button>
    <div class="chat-panel" id="chat-panel-${requestId}">
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
  toggleBtn.addEventListener("click", () => panel.classList.toggle("open"));

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
  if (subscribedChats.has(requestId)) return;
  subscribedChats.add(requestId);

  db.collection("chat_messages")
    .where("request_id", "==", requestId)
    .orderBy("sent_at", "asc")
    .onSnapshot((snapshot) => {
      const container = document.getElementById(`chat-messages-${requestId}`);
      if (!container) return;

      if (snapshot.empty) {
        container.innerHTML = '<div class="chat-empty">ยังไม่มีข้อความ</div>';
        return;
      }

      container.innerHTML = "";
      snapshot.forEach((docSnap) => {
        const msg = docSnap.data();
        const isMine = msg.sender_role === "user";
        const bubble = document.createElement("div");
        bubble.className = `chat-bubble ${isMine ? "mine" : "theirs"}`;
        bubble.innerHTML = `<div class="who">${isMine ? "คุณ" : "Admin"}</div>${escapeHtml(msg.message_text)}`;
        container.appendChild(bubble);
      });
      container.scrollTop = container.scrollHeight;
    }, (err) => console.error("โหลดแชทไม่สำเร็จ", err));
}
