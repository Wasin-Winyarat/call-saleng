import { db, auth } from "../../firebase-config.js";
import {
  collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, query, where, orderBy,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  onAuthStateChanged, signOut,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const STATUS_LABEL = {
  pending_admin_review: "รอตรวจสอบ",
  cancelled: "ยกเลิกแล้ว",
  open_for_saleng: "เปิดให้สาเล้งรับงาน",
  pending_match_confirm: "รอยืนยันการจับคู่",
  confirmed: "ยืนยันแล้ว",
  completed: "เสร็จสิ้น",
};

const adminBar = document.getElementById("adminBar");
const filterRow = document.getElementById("filterRow");
const requestList = document.getElementById("requestList");
const toast = document.getElementById("toast");
const confirmModal = document.getElementById("confirmModal");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");

let currentAdminUid = null;
let currentAdminName = "";
let currentFilter = "pending_admin_review";
let unsubscribeRequests = null;
let pendingAction = null;
const openCards = new Set();
const subscribedChats = new Set();

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

// ---------- auth guard: ต้อง login และมี doc ใน admin_accounts ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../";
    return;
  }

  try {
    const profileSnap = await getDoc(doc(db, "admin_accounts", user.uid));
    if (!profileSnap.exists()) {
      await signOut(auth);
      window.location.href = "../";
      return;
    }

    currentAdminUid = user.uid;
    currentAdminName = profileSnap.data().full_name;
    adminBar.innerHTML = `สวัสดี <b>${escapeHtml(currentAdminName)}</b> · <a href="#" id="logoutLink">ออกจากระบบ</a>`;
    document.getElementById("logoutLink").addEventListener("click", async (e) => {
      e.preventDefault();
      await signOut(auth);
      window.location.href = "../";
    });

    subscribeRequests();
  } catch (err) {
    console.error(err);
    showToast("โหลดข้อมูล admin ไม่สำเร็จ", true);
  }
});

// ---------- filter chips ----------
filterRow.querySelectorAll(".chip").forEach((chip) => {
  chip.classList.toggle("active", chip.dataset.status === currentFilter);
  chip.addEventListener("click", () => {
    currentFilter = chip.dataset.status;
    filterRow.querySelectorAll(".chip").forEach((el) => el.classList.toggle("active", el === chip));
    subscribeRequests();
  });
});

// ---------- request list (real-time, filter ตาม currentFilter) ----------
function subscribeRequests() {
  if (unsubscribeRequests) unsubscribeRequests();

  const base = collection(db, "pickup_requests");
  const q = currentFilter
    ? query(base, where("status", "==", currentFilter), orderBy("created_at", "desc"))
    : query(base, orderBy("created_at", "desc"));

  unsubscribeRequests = onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        requestList.innerHTML = '<div class="empty-note">ไม่มีคำขอในหมวดนี้</div>';
        return;
      }
      requestList.innerHTML = "";
      snapshot.forEach((docSnap) => {
        requestList.appendChild(renderRequestCard(docSnap.id, docSnap.data()));
      });
    },
    (err) => {
      console.error(err);
      requestList.innerHTML = `<div class="empty-note">โหลดรายการไม่สำเร็จ (${err.code === "permission-denied" ? "บัญชีนี้ไม่มีสิทธิ์ admin ตาม Security Rules" : "ลองรีเฟรชหน้าใหม่"})</div>`;
    },
  );
}

function renderRequestCard(id, data) {
  const card = document.createElement("div");
  card.className = "request-card";
  if (openCards.has(id)) card.classList.add("open");

  const header = document.createElement("div");
  header.className = "request-card-header";

  const thumb = document.createElement("div");
  thumb.className = "request-card-thumb";
  if (data.photo_urls && data.photo_urls.length) {
    const img = document.createElement("img");
    img.src = data.photo_urls[0];
    thumb.appendChild(img);
  } else {
    thumb.textContent = "♻️";
  }

  const headerBody = document.createElement("div");
  headerBody.className = "request-card-header-body";
  headerBody.innerHTML = `
    <div class="request-card-title">${escapeHtml(data.contact_name)} · ${escapeHtml(data.contact_phone)}</div>
    <div class="request-card-meta">${escapeHtml((data.waste_types || []).join(", "))} · ${escapeHtml(data.sub_district)} · นัด ${escapeHtml(data.requested_date)} ${escapeHtml(data.time_slot)}</div>
    <div class="status-pill ${data.status}">${STATUS_LABEL[data.status] || data.status}</div>
  `;

  const chevron = document.createElement("div");
  chevron.className = "request-card-chevron";
  chevron.textContent = "›";

  header.appendChild(thumb);
  header.appendChild(headerBody);
  header.appendChild(chevron);
  header.addEventListener("click", () => {
    card.classList.toggle("open");
    if (card.classList.contains("open")) {
      openCards.add(id);
      subscribeChat(id);
    } else {
      openCards.delete(id);
    }
  });

  card.appendChild(header);
  card.appendChild(buildDetail(id, data));

  if (openCards.has(id)) subscribeChat(id);

  return card;
}

function buildDetail(id, data) {
  const detail = document.createElement("div");
  detail.className = "request-card-detail";

  const photosHtml = (data.photo_urls || []).length
    ? `<div class="photo-row">${data.photo_urls.map((url) => `<div class="photo-thumb"><img src="${url}"></div>`).join("")}</div>`
    : "";

  detail.innerHTML = `
    <div class="detail-row"><b>ที่อยู่:</b> ${escapeHtml(data.address_text)} ${data.landmark ? `(${escapeHtml(data.landmark)})` : ""}</div>
    <div class="detail-row"><b>ปริมาณโดยประมาณ:</b> ${escapeHtml(data.estimated_quantity_description)}</div>
    ${data.notes ? `<div class="detail-row"><b>หมายเหตุ:</b> ${escapeHtml(data.notes)}</div>` : ""}
    <div class="detail-row"><b>user_id:</b> ${escapeHtml(data.user_id)}</div>
    ${photosHtml}
  `;

  if (data.status === "pending_admin_review") {
    const actionRow = document.createElement("div");
    actionRow.className = "action-row";
    actionRow.innerHTML = `
      <button type="button" class="btn btn-primary" data-action="confirm">Confirm</button>
      <button type="button" class="btn btn-danger" data-action="reject">Reject</button>
    `;
    actionRow.querySelector('[data-action="confirm"]').addEventListener("click", () => openActionModal(id, "confirm"));
    actionRow.querySelector('[data-action="reject"]').addEventListener("click", () => openActionModal(id, "reject"));
    detail.appendChild(actionRow);
  }

  detail.appendChild(buildChatSection(id));
  return detail;
}

// ---------- confirm / reject modal ----------
function openActionModal(requestId, action) {
  pendingAction = { requestId, action };
  if (action === "confirm") {
    modalTitle.textContent = "ยืนยัน Confirm คำขอนี้?";
    modalDesc.textContent = "สถานะจะเปลี่ยนเป็น \"เปิดให้สาเล้งรับงาน\" ทันที";
  } else {
    modalTitle.textContent = "ยืนยัน Reject คำขอนี้?";
    modalDesc.textContent = "สถานะจะเปลี่ยนเป็น \"ยกเลิกแล้ว\" ทันที";
  }
  confirmModal.classList.add("open");
}

modalCancelBtn.addEventListener("click", () => {
  confirmModal.classList.remove("open");
  pendingAction = null;
});

modalConfirmBtn.addEventListener("click", async () => {
  if (!pendingAction) return;
  const { requestId, action } = pendingAction;
  const newStatus = action === "confirm" ? "open_for_saleng" : "cancelled";

  try {
    await updateDoc(doc(db, "pickup_requests", requestId), {
      status: newStatus,
      admin_reviewed_at: serverTimestamp(),
      admin_reviewed_by: currentAdminUid,
    });
    showToast(action === "confirm" ? "Confirm สำเร็จ" : "Reject สำเร็จ");
  } catch (err) {
    console.error(err);
    showToast("ทำรายการไม่สำเร็จ — เช็ค Security Rules", true);
  } finally {
    confirmModal.classList.remove("open");
    pendingAction = null;
  }
});

// ---------- chat thread ต่อคำขอ (chat_messages, sender_role: "admin") ----------
function buildChatSection(requestId) {
  const wrap = document.createElement("div");
  wrap.className = "chat-section";
  wrap.innerHTML = `
    <div class="chat-section-title">💬 ข้อความกับลูกค้า</div>
    <div class="chat-messages" id="chat-messages-${requestId}">
      <div class="chat-empty">ยังไม่มีข้อความ</div>
    </div>
    <div class="chat-input-row">
      <input type="text" id="chat-input-${requestId}" placeholder="พิมพ์ข้อความถึงลูกค้า...">
      <button type="button" id="chat-send-${requestId}">ส่ง</button>
    </div>
  `;

  const sendMessage = async () => {
    const input = document.getElementById(`chat-input-${requestId}`);
    const text = input.value.trim();
    if (!text || !currentAdminUid) return;
    input.value = "";
    try {
      await setDoc(doc(collection(db, "chat_messages")), {
        request_id: requestId,
        sender_role: "admin",
        sender_id: currentAdminUid,
        message_text: text,
        sent_at: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      showToast("ส่งข้อความไม่สำเร็จ", true);
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

  const chatQuery = query(
    collection(db, "chat_messages"),
    where("request_id", "==", requestId),
    orderBy("sent_at", "asc"),
  );

  onSnapshot(chatQuery, (snapshot) => {
    const container = document.getElementById(`chat-messages-${requestId}`);
    if (!container) return;

    if (snapshot.empty) {
      container.innerHTML = '<div class="chat-empty">ยังไม่มีข้อความ</div>';
      return;
    }

    container.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const isMine = msg.sender_role === "admin";
      const bubble = document.createElement("div");
      bubble.className = `chat-bubble ${isMine ? "mine" : "theirs"}`;
      bubble.innerHTML = `<div class="who">${isMine ? "คุณ (Admin)" : "ลูกค้า"}</div>${escapeHtml(msg.message_text)}`;
      container.appendChild(bubble);
    });
    container.scrollTop = container.scrollHeight;
  }, (err) => console.error("โหลดแชทไม่สำเร็จ", err));
}
