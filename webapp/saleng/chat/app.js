// แชทระหว่างซาเล้งกับ Admin ต่อคำขอ (?id=<pickup_request id>) — collection saleng_chat_messages
// ?draft=cancel มาจากปุ่ม "ขอยกเลิกผ่าน Admin" (เลยเวลาที่ยกเลิกเองได้) → เติมข้อความร่างให้พิมพ์ต่อแล้วกดส่งเอง

const params = new URLSearchParams(window.location.search);
const requestId = params.get("id");
const DRAFT_MESSAGES = { cancel: "ขอยกเลิกงานนี้ เนื่องจาก " };
const draftMessage = DRAFT_MESSAGES[params.get("draft")] || "";

const chatThread = document.getElementById("chatThread");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const requestSummary = document.getElementById("requestSummary");
const toast = document.getElementById("toast");

let uid = null;

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function showNotFound(message) {
  requestSummary.textContent = "";
  chatThread.innerHTML = `<div class="chat-empty">${escapeHtml(message)}<br><a href="../jobs/index.html">กลับไปหน้างาน</a></div>`;
}

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }
  uid = user.uid;
  if (!requestId) {
    showNotFound("ไม่พบงานนี้");
    return;
  }

  // อ่านได้เฉพาะงานที่ยังผูกกับตัวเอง (rules) — งานที่ยกเลิก/ถูกย้ายไปแล้วจะเปิดแชทไม่ได้
  try {
    const snap = await db.collection("pickup_requests").doc(requestId).get();
    const data = snap.data();
    if (!snap.exists || data.assigned_saleng_id !== uid) {
      showNotFound("งานนี้ไม่ได้อยู่กับคุณแล้ว");
      return;
    }
    requestSummary.textContent = `${(data.waste_types || []).join(", ") || "งาน"} · ${data.sub_district || ""} · ${slotText(data)}`;
  } catch (err) {
    console.error(err);
    showNotFound("งานนี้ไม่ได้อยู่กับคุณแล้ว");
    return;
  }

  chatInput.disabled = false;
  if (draftMessage) {
    chatInput.value = draftMessage;
    chatInput.focus();
    chatInput.setSelectionRange(draftMessage.length, draftMessage.length);
    window.history.replaceState(null, "", `?id=${encodeURIComponent(requestId)}`);
  }
  updateSendState();
  subscribeMessages();
});

// ต้องกรอง saleng_id ให้ตรงกับ rules และเรียงฝั่ง client (ไม่ใช้ orderBy เพื่อไม่ต้องสร้าง composite index)
function subscribeMessages() {
  db.collection("saleng_chat_messages")
    .where("request_id", "==", requestId)
    .where("saleng_id", "==", uid)
    .onSnapshot((snapshot) => {
      const messages = snapshot.docs.map((doc) => doc.data())
        .sort((a, b) => messageMillis(a) - messageMillis(b) || (a.sent_at ? 0 : 1));

      const seen = loadSeenState(uid);
      seen.chat[requestId] = Math.max(seen.chat[requestId] || 0, latestMessageMillis(messages));
      saveSeenState(uid, seen);

      renderMessages(messages);
    }, (err) => {
      console.error("โหลดแชทไม่สำเร็จ", err);
      chatThread.innerHTML = '<div class="chat-empty">โหลดข้อความไม่สำเร็จ ลองรีเฟรชหน้าใหม่</div>';
    });
}

function renderMessages(messages) {
  if (!messages.length) {
    chatThread.innerHTML = '<div class="chat-empty">ยังไม่มีข้อความ<br>พิมพ์ถึง Admin ได้ด้านล่าง</div>';
    return;
  }
  chatThread.innerHTML = "";
  let lastDay = "";
  messages.forEach((msg) => {
    const date = msg.sent_at && msg.sent_at.toDate ? msg.sent_at.toDate() : null;
    const day = date ? date.toLocaleDateString("th-TH", { dateStyle: "medium" }) : "";
    if (day && day !== lastDay) {
      const divider = document.createElement("div");
      divider.className = "chat-day";
      divider.textContent = day;
      chatThread.appendChild(divider);
      lastDay = day;
    }
    const isMine = msg.sender_role === "saleng";
    const row = document.createElement("div");
    row.className = `chat-row ${isMine ? "mine" : "theirs"}`;
    row.innerHTML = `
      <div class="chat-bubble ${isMine ? "mine" : "theirs"}">${isMine ? "" : '<div class="who">Admin</div>'}${escapeHtml(msg.message_text)}</div>
      <div class="chat-time">${date ? date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "กำลังส่ง..."}</div>`;
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
  if (!text || !uid) return;
  chatInput.value = "";
  updateSendState();
  chatInput.focus();
  try {
    await db.collection("saleng_chat_messages").doc().set({
      request_id: requestId,
      saleng_id: uid,
      sender_role: "saleng",
      sender_id: uid,
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
