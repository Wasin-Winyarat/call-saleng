// การจับคู่คำขอกับซาเล้งฝั่ง Admin (โหลดหลัง app.js — ใช้ allRequests, escapeHtml, showToast,
// currentAdminUid, adminSeen, openCards, renderRequestList, updateChatBadges จาก app.js)
//   open_for_saleng        → มอบหมายซาเล้ง (เรียงตำบลตรงก่อน แล้วตามคิวรอบนั้น) เตือนเมื่อคิวเต็มแต่ยัง override ได้
//   pending_match_confirm  → ดูว่าซาเล้งตอบรับแล้วหรือยัง → ยืนยันการจับคู่ / ยกเลิกการจับคู่
//   confirmed              → ยกเลิกการจับคู่ได้ (เช่น ซาเล้งขอยกเลิกผ่านแชทหลังเลยเวลาที่ยกเลิกเองได้)
// + แชทกับซาเล้งต่อคำขอ (saleng_chat_messages) และ badge ข้อความใหม่จากซาเล้ง

let salengRoster = []; // saleng_accounts ทั้งหมด [{ id, ...data }]
const salengChatCache = new Map(); // requestId → ข้อความแชทกับซาเล้ง
const STALE_OPEN_MS = 2 * 60 * 60 * 1000; // งานเปิดรับนานเกินนี้ขึ้นป้ายเตือน
const serverNow = () => firebase.firestore.FieldValue.serverTimestamp();
const SALENG_SEEN_PREFIX = "s:"; // key ใน adminSeen.chat ของแชทซาเล้ง (แยกจากแชทลูกค้า)

function activeSalengs() {
  return salengRoster.filter((s) => s.approval_status === "approved" && s.account_status === "active");
}

function subscribeSalengs() {
  db.collection("saleng_accounts").onSnapshot((snap) => {
    salengRoster = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderRequestList();
  }, (err) => console.error("โหลดรายชื่อซาเล้งไม่สำเร็จ", err));
}

function subscribeSalengChats() {
  db.collection("saleng_chat_messages").onSnapshot((snap) => {
    salengChatCache.clear();
    snap.docs.forEach((doc) => {
      const msg = doc.data();
      if (!salengChatCache.has(msg.request_id)) salengChatCache.set(msg.request_id, []);
      salengChatCache.get(msg.request_id).push(msg);
    });
    salengChatCache.forEach((msgs) => msgs.sort((a, b) => messageMillis(a) - messageMillis(b)));
    openCards.forEach((id) => renderSalengChat(id));
    updateChatBadges();
  }, (err) => console.error("โหลดแชทซาเล้งไม่สำเร็จ", err));
}

function jobsOfSaleng(salengId) {
  return allRequests.filter((r) => r.data.assigned_saleng_id === salengId).map((r) => r.data);
}

// ข้อความของซาเล้งที่ถืองานอยู่ตอนนี้เท่านั้น (งานที่เคยผูกกับคนอื่นมาก่อนจะไม่ปน)
function currentSalengMessages(requestId) {
  const request = allRequests.find((r) => r.id === requestId);
  const salengId = request && request.data.assigned_saleng_id;
  return (salengChatCache.get(requestId) || []).filter((m) => m.saleng_id === salengId);
}

function salengUnread(requestId) {
  if (!adminSeen) return 0;
  return countUnreadMessages(adminSeen, SALENG_SEEN_PREFIX + requestId, currentSalengMessages(requestId), "saleng");
}

// ---------- ป้ายเตือนบนหัวการ์ด ----------
function matchWarningsHtml(data) {
  const chips = [];
  if (data.status === "open_for_saleng") {
    if (!activeSalengs().some((s) => (s.service_sub_districts || []).includes(data.sub_district))) {
      chips.push('<span class="warn-chip">⚠️ ไม่มีซาเล้งในตำบลนี้</span>');
    }
    const openedAt = toDate(data.opened_at || data.admin_reviewed_at);
    if (openedAt && Date.now() - openedAt.getTime() > STALE_OPEN_MS) {
      chips.push('<span class="warn-chip">⏱️ รอรับงานเกิน 2 ชม.</span>');
    }
  }
  if (data.status === "pending_match_confirm") {
    chips.push(data.saleng_accepted
      ? '<span class="action-chip">🛺 ซาเล้งรับงานแล้ว — รอคุณยืนยัน</span>'
      : '<span class="info-chip">⌛ รอซาเล้งตอบรับ</span>');
  }
  return chips.join("");
}

// ---------- ส่วนจับคู่ในรายละเอียดการ์ด ----------
function buildMatchSection(id, data) {
  const wrap = document.createElement("div");
  wrap.className = "match-section";

  if (data.status === "open_for_saleng") {
    buildAssignForm(wrap, id, data);
  } else if (["pending_match_confirm", "confirmed", "completed"].includes(data.status) && data.assigned_saleng_id) {
    buildAssignedInfo(wrap, id, data);
  } else {
    return wrap;
  }

  if (data.assigned_saleng_id && data.status !== "completed") wrap.appendChild(buildSalengChatSection(id, data));
  return wrap;
}

function buildAssignForm(wrap, id, data) {
  const candidates = activeSalengs().map((s) => {
    const load = salengLoad(jobsOfSaleng(s.id));
    return {
      saleng: s,
      load,
      areaMatch: (s.service_sub_districts || []).includes(data.sub_district),
      inSlot: load.perSlot.get(slotKey(data)) || 0,
    };
  }).sort((a, b) => (b.areaMatch - a.areaMatch) || (a.inSlot - b.inSlot) || (a.load.active - b.load.active));

  wrap.innerHTML = `<div class="match-title">🛺 มอบหมายซาเล้ง</div>`;
  if (!candidates.length) {
    wrap.innerHTML += '<div class="match-note">ยังไม่มีซาเล้งที่อนุมัติแล้ว — อนุมัติได้ที่เมนู "ซาเล้ง" ด้านบน</div>';
    return;
  }

  wrap.innerHTML += `
    <div class="match-note">ซาเล้งในตำบล ${escapeHtml(data.sub_district)} เห็นงานนี้และกดรับเองได้ — หรือเลือกมอบหมายให้คนใดคนหนึ่ง (ซาเล้งต้องกดตอบรับก่อน)</div>
    <select class="match-select" aria-label="เลือกซาเล้ง">
      ${candidates.map((c, i) => `<option value="${i}">${escapeHtml(c.saleng.full_name)} · ${c.areaMatch ? "ตำบลตรง" : "นอกตำบล"} · รอบนี้ ${c.inSlot}/${MAX_JOBS_PER_SLOT} · ค้าง ${c.load.active}/${MAX_ACTIVE_JOBS}</option>`).join("")}
    </select>
    <div class="match-warn" hidden></div>
    <button type="button" class="btn btn-primary match-assign-btn">มอบหมายงานนี้</button>
  `;

  const select = wrap.querySelector(".match-select");
  const warn = wrap.querySelector(".match-warn");
  const button = wrap.querySelector(".match-assign-btn");
  const refresh = () => {
    const block = quotaBlockReason(candidates[select.value].load, data);
    warn.hidden = !block;
    warn.textContent = block ? `⚠️ ${block} — มอบหมายได้ถ้าคุยกับซาเล้งแล้ว` : "";
    button.textContent = block ? "มอบหมายแม้คิวเต็ม" : "มอบหมายงานนี้";
  };
  select.addEventListener("change", refresh);
  refresh();

  button.addEventListener("click", async () => {
    const { saleng } = candidates[select.value];
    button.disabled = true;
    const requestRef = db.collection("pickup_requests").doc(id);
    const matchRef = db.collection("request_matches").doc();
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(requestRef);
        if (snap.data().status !== "open_for_saleng" || snap.data().assigned_saleng_id) throw new Error("taken");
        tx.update(requestRef, {
          status: "pending_match_confirm",
          assigned_saleng_id: saleng.id,
          assigned_saleng_name: saleng.full_name,
          assigned_saleng_phone: saleng.phone_number,
          assigned_saleng_plate: saleng.vehicle_plate || "",
          match_channel: "admin_assign",
          saleng_accepted: false,
          assigned_at: serverNow(),
          accepted_at: null,
          active_match_id: matchRef.id,
        });
        tx.set(matchRef, {
          request_id: id,
          saleng_id: saleng.id,
          match_channel: "admin_assign",
          match_status: "pending_saleng_accept",
          created_at: serverNow(),
          created_by: currentAdminUid,
        });
      });
      showToast(`มอบหมายให้ ${saleng.full_name} แล้ว — รอซาเล้งตอบรับ`);
    } catch (err) {
      console.error(err);
      showToast(err.message === "taken" ? "มีซาเล้งรับงานนี้ไปแล้ว" : "มอบหมายไม่สำเร็จ", true);
      button.disabled = false;
    }
  });
}

function buildAssignedInfo(wrap, id, data) {
  const channel = data.match_channel === "admin_assign" ? "Admin มอบหมาย" : "ซาเล้งกดรับเอง";
  const acceptedText = data.saleng_accepted
    ? `ตอบรับแล้ว ${formatDateTime(toDate(data.accepted_at))}`
    : "ยังไม่ตอบรับ";
  const isPending = data.status === "pending_match_confirm";

  wrap.innerHTML = `
    <div class="match-title">🛺 ซาเล้งที่รับงาน</div>
    <div class="match-saleng">
      <div><b>${escapeHtml(data.assigned_saleng_name || "-")}</b> · <a href="tel:${escapeHtml(data.assigned_saleng_phone || "")}">${escapeHtml(data.assigned_saleng_phone || "-")}</a> · ทะเบียน ${escapeHtml(data.assigned_saleng_plate || "-")}</div>
      <div class="match-note">ช่องทาง: ${channel} · ${acceptedText}${data.status === "confirmed" ? ` · ยืนยันแล้ว ${formatDateTime(toDate(data.match_confirmed_at))}` : ""}</div>
    </div>
    ${data.status === "completed" ? "" : `
    <div class="action-row">
      ${isPending ? `<button type="button" class="btn btn-primary" data-act="confirm-match" ${data.saleng_accepted ? "" : "disabled"}>✅ ยืนยันการจับคู่</button>` : ""}
      <button type="button" class="btn btn-secondary" data-act="release">ยกเลิกการจับคู่</button>
    </div>
    ${isPending && !data.saleng_accepted ? '<div class="match-note">ยืนยันได้หลังซาเล้งกดตอบรับ</div>' : ""}
    <div class="match-release" hidden>
      <input type="text" class="match-reason" placeholder="เหตุผล เช่น ซาเล้งขอยกเลิก / ติดต่อซาเล้งไม่ได้" maxlength="200">
      <button type="button" class="btn btn-danger" data-act="release-confirm">ยืนยันยกเลิก — เปิดงานให้คนอื่นรับ</button>
    </div>`}
  `;

  const confirmBtn = wrap.querySelector('[data-act="confirm-match"]');
  if (confirmBtn) confirmBtn.addEventListener("click", () => confirmMatch(id, data, confirmBtn));
  const releaseBtn = wrap.querySelector('[data-act="release"]');
  if (releaseBtn) {
    releaseBtn.addEventListener("click", () => {
      wrap.querySelector(".match-release").hidden = false;
      wrap.querySelector(".match-reason").focus();
    });
    wrap.querySelector('[data-act="release-confirm"]').addEventListener("click", (e) => {
      const reason = wrap.querySelector(".match-reason").value.trim();
      if (!reason) {
        showToast("กรอกเหตุผลก่อนยกเลิกการจับคู่", true);
        return;
      }
      releaseMatch(id, data, reason, e.currentTarget);
    });
  }
}

async function confirmMatch(id, data, button) {
  button.disabled = true;
  try {
    const batch = db.batch();
    batch.update(db.collection("pickup_requests").doc(id), { status: "confirmed", match_confirmed_at: serverNow() });
    if (data.active_match_id) {
      batch.update(db.collection("request_matches").doc(data.active_match_id), {
        match_status: "confirmed",
        confirmed_at: serverNow(),
        confirmed_by: currentAdminUid,
      });
    }
    await batch.commit();
    showToast("ยืนยันการจับคู่แล้ว — ลูกค้าเห็นข้อมูลซาเล้ง");
  } catch (err) {
    console.error(err);
    showToast("ยืนยันไม่สำเร็จ", true);
    button.disabled = false;
  }
}

async function releaseMatch(id, data, reason, button) {
  button.disabled = true;
  const afterConfirm = data.status === "confirmed";
  try {
    const batch = db.batch();
    batch.update(db.collection("pickup_requests").doc(id), {
      status: "open_for_saleng",
      assigned_saleng_id: null,
      assigned_saleng_name: null,
      assigned_saleng_phone: null,
      assigned_saleng_plate: null,
      match_channel: null,
      saleng_accepted: null,
      assigned_at: null,
      accepted_at: null,
      active_match_id: null,
      match_confirmed_at: null,
      opened_at: serverNow(),
    });
    if (data.active_match_id) {
      batch.update(db.collection("request_matches").doc(data.active_match_id), {
        match_status: afterConfirm ? "cancelled" : "rejected",
        ended_by: "admin",
        end_reason: reason,
        ended_at: serverNow(),
        cancelled_after_confirm: afterConfirm,
      });
    }
    await batch.commit();
    showToast("ยกเลิกการจับคู่แล้ว — งานกลับไปเปิดรับ");
  } catch (err) {
    console.error(err);
    showToast("ยกเลิกไม่สำเร็จ", true);
    button.disabled = false;
  }
}

// ---------- แชทกับซาเล้ง ----------
function buildSalengChatSection(id, data) {
  const wrap = document.createElement("div");
  wrap.className = "chat-section saleng-chat";
  wrap.innerHTML = `
    <div class="chat-section-title">🛺 แชทกับซาเล้ง (${escapeHtml(data.assigned_saleng_name || "")})</div>
    <div class="chat-messages" id="saleng-chat-${id}"><div class="chat-empty">ยังไม่มีข้อความ</div></div>
    <div class="chat-input-row">
      <input type="text" placeholder="พิมพ์ข้อความถึงซาเล้ง...">
      <button type="button">ส่ง</button>
    </div>
  `;
  const input = wrap.querySelector("input");
  const send = async () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    try {
      await db.collection("saleng_chat_messages").doc().set({
        request_id: id,
        saleng_id: data.assigned_saleng_id,
        sender_role: "admin",
        sender_id: currentAdminUid,
        message_text: text,
        sent_at: serverNow(),
      });
    } catch (err) {
      console.error(err);
      input.value = text;
      showToast("ส่งข้อความไม่สำเร็จ", true);
    }
  };
  wrap.querySelector("button").addEventListener("click", send);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });
  return wrap;
}

function renderSalengChat(requestId) {
  const container = document.getElementById(`saleng-chat-${requestId}`);
  const messages = currentSalengMessages(requestId);
  if (adminSeen && messages.length) {
    const key = SALENG_SEEN_PREFIX + requestId;
    adminSeen.chat[key] = Math.max(adminSeen.chat[key] || 0, latestMessageMillis(messages));
    saveSeenState(currentAdminUid, adminSeen);
  }
  if (!container) return;
  if (!messages.length) {
    container.innerHTML = '<div class="chat-empty">ยังไม่มีข้อความ</div>';
    return;
  }
  container.innerHTML = "";
  messages.forEach((msg) => {
    const isMine = msg.sender_role === "admin";
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${isMine ? "mine" : "theirs"}`;
    bubble.innerHTML = `<div class="who">${isMine ? "คุณ (Admin)" : "ซาเล้ง"}</div>${escapeHtml(msg.message_text)}`;
    container.appendChild(bubble);
  });
  container.scrollTop = container.scrollHeight;
}
