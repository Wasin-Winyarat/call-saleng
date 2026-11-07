// หน้าแชทกับ Admin แยกต่อคำขอ (?id=<pickup_request id>) — chat_messages ที่ request_id ตรงกัน (sender_role: "user")
// เปิดหน้านี้อยู่ = อ่านข้อความแล้ว (อัปเดตสถานะ "เห็นแล้ว" ใน notify-helpers.js ทุกครั้งที่มีข้อความใหม่)

const requestId = new URLSearchParams(window.location.search).get("id");
const chatThread = document.getElementById("chatThread");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const requestSummary = document.getElementById("requestSummary");
const backLink = document.getElementById("backLink");
const toast = document.getElementById("toast");

let currentUserId = null;

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

backLink.addEventListener("click", (e) => {
  if (document.referrer.startsWith(window.location.origin) && window.history.length > 1) {
    e.preventDefault();
    window.history.back();
  }
});

function showNotFound() {
  requestSummary.textContent = "";
  chatThread.innerHTML = '<div class="chat-empty">ไม่พบคำขอนี้ — <a href="../tracking/index.html">กลับไปหน้าติดตาม</a></div>';
}

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }
  currentUserId = user.uid;
  if (!requestId) {
    showNotFound();
    return;
  }

  // ยืนยันว่าเป็นคำขอของผู้ login ก่อนเปิดช่องพิมพ์ (rules ปฏิเสธการอ่านคำขอของคนอื่นอยู่แล้ว)
  try {
    const snap = await db.collection("pickup_requests").doc(requestId).get();
    const data = snap.data();
    if (!snap.exists || data.user_id !== currentUserId) {
      showNotFound();
      return;
    }
    requestSummary.textContent = `${(data.waste_types || []).join(", ") || "คำขอ"} · นัด ${data.requested_date || "-"} ${data.time_slot || ""} ›`;
    requestSummary.href = detailUrl(requestId);
  } catch (err) {
    console.error(err);
    showNotFound();
    return;
  }

  chatInput.disabled = false;
  updateSendState();
  subscribeMessages();
});

function subscribeMessages() {
  db.collection("chat_messages")
    .where("request_id", "==", requestId)
    .orderBy("sent_at", "asc")
    .onSnapshot((snapshot) => {
      const messages = snapshot.docs.map((doc) => doc.data());

      const seen = loadSeenState(currentUserId);
      seen.chat[requestId] = Math.max(seen.chat[requestId] || 0, latestMessageMillis(messages));
      saveSeenState(currentUserId, seen);

      renderMessages(messages);
    }, (err) => {
      console.error("โหลดแชทไม่สำเร็จ", err);
      chatThread.innerHTML = '<div class="chat-empty">โหลดข้อความไม่สำเร็จ ลองรีเฟรชหน้าใหม่</div>';
    });
}

function renderMessages(messages) {
  if (!messages.length) {
    chatThread.innerHTML = '<div class="chat-empty">ยังไม่มีข้อความ<br>พิมพ์ข้อความแรกถึง Admin ได้ด้านล่าง</div>';
    return;
  }

  chatThread.innerHTML = "";
  let lastDay = "";
  messages.forEach((msg) => {
    // ข้อความที่เพิ่งส่ง sent_at ยังเป็น null จนกว่า server จะใส่เวลา — แสดงเป็น "กำลังส่ง..."
    const date = msg.sent_at && msg.sent_at.toDate ? msg.sent_at.toDate() : null;
    const day = date ? date.toLocaleDateString("th-TH", { dateStyle: "medium" }) : "";
    if (day && day !== lastDay) {
      const divider = document.createElement("div");
      divider.className = "chat-day";
      divider.textContent = day;
      chatThread.appendChild(divider);
      lastDay = day;
    }

    const isMine = msg.sender_role === "user";
    const row = document.createElement("div");
    row.className = `chat-row ${isMine ? "mine" : "theirs"}`;
    row.innerHTML = `
      <div class="chat-bubble ${isMine ? "mine" : "theirs"}">${isMine ? "" : '<div class="who">Admin</div>'}${escapeHtml(msg.message_text)}</div>
      <div class="chat-time">${date ? date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "กำลังส่ง..."}</div>
    `;
    chatThread.appendChild(row);
  });
  chatThread.scrollTop = chatThread.scrollHeight;
}

function updateSendState() {
  chatSend.disabled = chatInput.disabled || chatInput.value.trim().length === 0;
}

chatInput.addEventListener("input", updateSendState);

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !currentUserId) return;

  chatInput.value = "";
  updateSendState();
  chatInput.focus();
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
    chatInput.value = text;
    updateSendState();
    showToast("ส่งข้อความไม่สำเร็จ กรุณาลองใหม่", true);
  }
});
