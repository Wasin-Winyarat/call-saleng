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
const modalReasonInput = document.getElementById("modalReasonInput");
const modalReasonDropdown = document.getElementById("modalReasonDropdown");
const modalDraftReasonBtn = document.getElementById("modalDraftReasonBtn");
const summarizeAllBtn = document.getElementById("summarizeAllBtn");
const summarizeAllResult = document.getElementById("summarizeAllResult");

let currentAdminUid = null;
let currentAdminName = "";
let currentFilter = "pending_admin_review";
let unsubscribeRequests = null;
let pendingAction = null;
let lastLoadedRequests = [];
const openCards = new Set();
const subscribedChats = new Set();

// ---------- AI helpers: สรุปข้อมูลคำขอ 1 รายการให้กระชับสำหรับ prompt ----------
function requestToAiContext(data) {
  return JSON.stringify({
    ผู้แจ้ง: data.contact_name,
    ประเภทขยะ: data.waste_types || [],
    พื้นที่: data.sub_district,
    ที่อยู่: data.address_text,
    จุดสังเกต: data.landmark || "",
    ปริมาณโดยประมาณ: data.estimated_quantity_description || "",
    หมายเหตุจากผู้แจ้ง: data.notes || "",
    วันเวลานัด: `${data.requested_date || ""} ${data.time_slot || ""}`,
    สถานะ: STATUS_LABEL[data.status] || data.status,
  });
}

// ---------- บันทึกทุกครั้งที่เรียก AI ลง subcollection pickup_requests/{id}/aiLog (audit trail) ----------
// สำคัญ: ฟังก์ชันนี้ไม่แตะ field `status` ของคำขอเลย — สถานะจริงเปลี่ยนได้เฉพาะตอนคนกด "ยืนยัน" ใน modalConfirmBtn เท่านั้น
async function logAiCall(requestId, type, input, output) {
  try {
    await db.collection("pickup_requests").doc(requestId).collection("aiLog").add({
      type,
      input,
      output,
      model: window.OPENROUTER_CONFIG.model,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("บันทึก aiLog ไม่สำเร็จ", err);
  }
}

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
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  try {
    const profileSnap = await db.collection("admin_accounts").doc(user.uid).get();
    if (!profileSnap.exists) {
      await auth.signOut();
      window.location.href = "../index.html";
      return;
    }

    currentAdminUid = user.uid;
    currentAdminName = profileSnap.data().full_name;
    adminBar.innerHTML = `สวัสดี <b>${escapeHtml(currentAdminName)}</b> · <a href="#" id="logoutLink">ออกจากระบบ</a>`;
    document.getElementById("logoutLink").addEventListener("click", async (e) => {
      e.preventDefault();
      await auth.signOut();
      window.location.href = "../index.html";
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

// ---------- AI: สรุปรายการคำขอที่กำลังแสดงอยู่ทั้งหมด ----------
summarizeAllBtn.addEventListener("click", async () => {
  if (!lastLoadedRequests.length) {
    showToast("ไม่มีรายการให้สรุปในหมวดนี้", true);
    return;
  }
  summarizeAllBtn.disabled = true;
  summarizeAllBtn.classList.add("btn-ai-loading");
  summarizeAllResult.hidden = false;
  summarizeAllResult.textContent = "กำลังสรุป...";
  try {
    const context = JSON.stringify(lastLoadedRequests.map(requestToAiContextRaw));
    const summary = await askAI(
      "คุณเป็นผู้ช่วย admin ของระบบเรียกรถซาเล้งเก็บขยะ จะได้รับ list คำขอเป็น JSON " +
      "ช่วยสรุปภาพรวมเป็นภาษาไทยแบบกระชับ (bullet สั้นๆ) เพื่อให้ admin ตัดสินใจตรวจสอบได้เร็วขึ้น " +
      "เน้นจำนวนรายการ พื้นที่ที่ซ้ำกันบ่อย และรายการที่มีปริมาณ/หมายเหตุน่าสังเกตเป็นพิเศษ อย่าแต่งข้อมูลที่ไม่มีใน JSON ตอบเป็นข้อความธรรมดา ห้ามใช้ markdown syntax เช่น ** หรือ #",
      context,
    );
    summarizeAllResult.textContent = summary;
  } catch (err) {
    console.error(err);
    summarizeAllResult.textContent = `สรุปไม่สำเร็จ: ${err.message}`;
  } finally {
    summarizeAllBtn.disabled = false;
    summarizeAllBtn.classList.remove("btn-ai-loading");
  }
});

function requestToAiContextRaw(data) {
  return {
    ผู้แจ้ง: data.contact_name,
    ประเภทขยะ: data.waste_types || [],
    พื้นที่: data.sub_district,
    ปริมาณโดยประมาณ: data.estimated_quantity_description || "",
    หมายเหตุ: data.notes || "",
    วันเวลานัด: `${data.requested_date || ""} ${data.time_slot || ""}`,
  };
}

// ---------- request list (real-time, filter ตาม currentFilter) ----------
function subscribeRequests() {
  if (unsubscribeRequests) unsubscribeRequests();

  const base = db.collection("pickup_requests");
  const q = currentFilter
    ? base.where("status", "==", currentFilter).orderBy("created_at", "desc")
    : base.orderBy("created_at", "desc");

  unsubscribeRequests = q.onSnapshot(
    (snapshot) => {
      summarizeAllResult.hidden = true;
      if (snapshot.empty) {
        lastLoadedRequests = [];
        requestList.innerHTML = '<div class="empty-note">ไม่มีคำขอในหมวดนี้</div>';
        return;
      }
      requestList.innerHTML = "";
      lastLoadedRequests = [];
      snapshot.forEach((docSnap) => {
        lastLoadedRequests.push(docSnap.data());
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

  detail.appendChild(buildSummarizeOne(id, data));

  if (data.status === "pending_admin_review") {
    const actionRow = document.createElement("div");
    actionRow.className = "action-row";
    actionRow.innerHTML = `
      <button type="button" class="btn btn-primary" data-action="confirm">Confirm</button>
      <button type="button" class="btn btn-danger" data-action="reject">ลบ / Reject</button>
    `;
    actionRow.querySelector('[data-action="confirm"]').addEventListener("click", () => openActionModal(id, "confirm", data));
    actionRow.querySelector('[data-action="reject"]').addEventListener("click", () => openActionModal(id, "reject", data));
    detail.appendChild(actionRow);
  }

  // แก้ไขวัน-เวลานัดรับ: admin ทำได้ทันทีโดยไม่เปลี่ยน status ตาม business rule (ยกเว้นงานที่จบไปแล้ว)
  if (data.status !== "cancelled" && data.status !== "completed") {
    detail.appendChild(buildDateTimeEditor(id, data));
  }

  detail.appendChild(buildChatSection(id));
  return detail;
}

// ---------- แสดงผลสรุปของ AI แบบแยกบรรทัด "หัวข้อ: ค่า" ----------
function renderSummaryLines(container, text) {
  container.innerHTML = "";
  const lines = (text || "").split("\n").map((l) => l.trim()).filter(Boolean);

  if (!lines.length) {
    container.textContent = text;
    return;
  }

  lines.forEach((line) => {
    const row = document.createElement("div");
    row.className = "ai-summary-line";
    const sepIdx = line.indexOf(":");
    if (sepIdx > -1) {
      const label = line.slice(0, sepIdx).trim();
      const value = line.slice(sepIdx + 1).trim();
      row.innerHTML = `<span class="ai-summary-label">${escapeHtml(label)}</span>${escapeHtml(value)}`;
    } else {
      row.textContent = line;
    }
    container.appendChild(row);
  });
}

// ---------- AI: สรุปคำร้องรายการเดียว ----------
// ผลลัพธ์เก็บที่ field `aiSuggestion` ของ pickup_requests/{id} (แคชไว้แสดงซ้ำได้โดยไม่ต้อง gen ใหม่)
// ทุกครั้งที่เรียก AI จะถูก log ไว้ที่ subcollection pickup_requests/{id}/aiLog ด้วย (ดู logAiCall)
// หมายเหตุ: ไม่แตะ field `status` เด็ดขาด — สถานะจริงเปลี่ยนได้เฉพาะตอนคนกด "ยืนยัน" เท่านั้น
function buildSummarizeOne(id, data) {
  const wrap = document.createElement("div");
  wrap.className = "ai-summary-row";
  wrap.innerHTML = `
    <button type="button" class="btn btn-secondary ai-summarize-btn">🤖 สรุปคำร้องนี้</button>
    <div class="ai-output" hidden></div>
  `;

  const btn = wrap.querySelector(".ai-summarize-btn");
  const output = wrap.querySelector(".ai-output");

  if (data.aiSuggestion) {
    output.hidden = false;
    renderSummaryLines(output, data.aiSuggestion);
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.classList.add("btn-ai-loading");
    output.hidden = false;
    output.textContent = "กำลังสรุป...";
    const input = requestToAiContext(data);
    try {
      const summary = await askAI(
        "คุณเป็นผู้ช่วย admin ของระบบเรียกรถซาเล้งเก็บขยะ จะได้รับข้อมูลคำขอ 1 รายการเป็น JSON " +
        "จัดเรียงข้อมูลสำคัญให้ admin อ่านได้เร็ว โดยตอบกลับเป็นบรรทัดแยกทีละหัวข้อ รูปแบบ \"หัวข้อ: ค่า\" หนึ่งบรรทัดต่อหนึ่งหัวข้อเท่านั้น เช่น\n" +
        "พื้นที่: รอบเวียง\n" +
        "ประเภทขยะ: กระดาษ, พลาสติก\n" +
        "ปริมาณ: ปานกลาง (5-15 กก.)\n" +
        "ปิดท้ายด้วยบรรทัด \"ข้อสังเกต: ...\" สั้นๆ ถ้ามีสิ่งที่ admin ควรระวังก่อนตัดสินใจ confirm/reject (ถ้าไม่มีให้เขียน \"ข้อสังเกต: ไม่มี\") " +
        "ใช้เฉพาะข้อมูลที่มีใน JSON ห้ามใช้ markdown syntax เช่น ** หรือ # และห้ามเขียนเป็นย่อหน้าต่อเนื่อง",
        input,
      );
      renderSummaryLines(output, summary);

      try {
        await db.collection("pickup_requests").doc(id).update({ aiSuggestion: summary });
      } catch (saveErr) {
        console.error("บันทึก aiSuggestion ไม่สำเร็จ", saveErr);
      }
      await logAiCall(id, "summary", input, summary);
    } catch (err) {
      console.error(err);
      output.textContent = `สรุปไม่สำเร็จ: ${err.message}`;
    } finally {
      btn.disabled = false;
      btn.classList.remove("btn-ai-loading");
    }
  });

  return wrap;
}

// ---------- แก้ไขวัน-เวลานัดรับ (ไม่เปลี่ยนสถานะคำขอ) ----------
function buildDateTimeEditor(id, data) {
  const wrap = document.createElement("div");
  wrap.className = "datetime-editor";
  wrap.innerHTML = `
    <button type="button" class="btn btn-secondary datetime-toggle">🗓️ แก้ไขวัน-เวลานัดรับ</button>
    <div class="datetime-form">
      <input type="date" class="dt-date" value="${data.requested_date || ""}">
      <div class="datetime-slot-row">
        <label><input type="radio" name="dt-slot-${id}" class="dt-slot" value="08:00-13:00" ${data.time_slot === "08:00-13:00" ? "checked" : ""}> 08:00–13:00</label>
        <label><input type="radio" name="dt-slot-${id}" class="dt-slot" value="13:00-18:00" ${data.time_slot === "13:00-18:00" ? "checked" : ""}> 13:00–18:00</label>
      </div>
      <div class="action-row">
        <button type="button" class="btn btn-primary dt-save">บันทึก</button>
        <button type="button" class="btn btn-secondary dt-cancel">ปิด</button>
      </div>
    </div>
  `;

  const form = wrap.querySelector(".datetime-form");
  wrap.querySelector(".datetime-toggle").addEventListener("click", () => form.classList.toggle("open"));
  wrap.querySelector(".dt-cancel").addEventListener("click", () => form.classList.remove("open"));

  wrap.querySelector(".dt-save").addEventListener("click", async () => {
    const newDate = wrap.querySelector(".dt-date").value;
    const slotInput = wrap.querySelector(".dt-slot:checked");
    if (!newDate || !slotInput) {
      showToast("กรุณาเลือกวันที่และช่วงเวลาให้ครบ", true);
      return;
    }
    try {
      await db.collection("pickup_requests").doc(id).update({
        requested_date: newDate,
        time_slot: slotInput.value,
      });
      showToast("บันทึกวัน-เวลาใหม่แล้ว");
      form.classList.remove("open");
    } catch (err) {
      console.error(err);
      showToast("บันทึกไม่สำเร็จ — เช็ค Security Rules", true);
    }
  });

  return wrap;
}

// ---------- confirm / reject (reject = ยกเลิกคำขอ ต้องกรอกเหตุผลก่อนเสมอ) modal ----------
function openActionModal(requestId, action, data) {
  pendingAction = { requestId, action, data };
  modalReasonInput.value = "";
  modalReasonDropdown.value = "";
  if (action === "confirm") {
    modalTitle.textContent = "ยืนยัน Confirm คำขอนี้?";
    modalDesc.textContent = "สถานะจะเปลี่ยนเป็น \"เปิดให้สาเล้งรับงาน\" ทันที";
    modalReasonDropdown.style.display = "none";
    modalReasonInput.style.display = "none";
    modalDraftReasonBtn.style.display = "none";
  } else {
    modalTitle.textContent = "ยืนยัน Reject/ลบคำขอนี้?";
    modalDesc.textContent = "สถานะจะเปลี่ยนเป็น \"ยกเลิกแล้ว\" ทันที — ต้องระบุเหตุผลก่อนจึงจะยืนยันได้";
    modalReasonDropdown.style.display = "block";
    modalReasonInput.style.display = "block";
    modalDraftReasonBtn.style.display = "flex";
  }
  updateModalConfirmState();
  confirmModal.classList.add("open");
}

async function draftReasonFromSeed(seed) {
  if (!pendingAction || !pendingAction.data) return;
  if (!seed) {
    showToast("พิมพ์เหตุผลคร่าวๆ ในช่องก่อน (เช่น \"ที่อยู่นอกเขตบริการ\") แล้วกดปุ่มนี้เพื่อให้ AI ช่วยเรียบเรียงให้สุภาพ", true);
    return;
  }

  modalDraftReasonBtn.disabled = true;
  modalDraftReasonBtn.classList.add("btn-ai-loading");
  const originalLabel = modalDraftReasonBtn.textContent;
  modalDraftReasonBtn.textContent = "กำลังเรียบเรียง...";
  const input = JSON.stringify({
    เหตุผลที่_admin_พิมพ์มา: seed,
    ข้อมูลคำขอ: JSON.parse(requestToAiContext(pendingAction.data)),
  });
  try {
    const drafted = await askAI(
      "คุณช่วย admin เรียบเรียงเหตุผลการยกเลิกคำขอเรียกรถซาเล้งที่ admin พิมพ์มาแบบคร่าวๆ ให้เป็นประโยคสุภาพสมบูรณ์ 1 ประโยคภาษาไทย สำหรับส่งแจ้งลูกค้าโดยตรง " +
      "ห้ามเพิ่มเหตุผลอื่นหรือรายละเอียดใดๆ ที่ admin ไม่ได้พิมพ์มา ห้ามเดาสาเหตุเอง หน้าที่ของคุณคือปรับสำนวนให้สุภาพ+กระชับเท่านั้น ไม่ใช่คิดเหตุผลใหม่ " +
      "ข้อมูลคำขอที่แนบมาให้ใช้แค่เพื่ออ้างอิงชื่อ/บริบทเท่านั้น ห้ามหยิบมาเป็นเหตุผลเพิ่มเติมเอง " +
      "ตอบกลับเฉพาะประโยคเหตุผล ห้ามมีคำอธิบายอื่นปน ตอบเป็นข้อความธรรมดา ห้ามใช้ markdown syntax เช่น ** หรือ #",
      input,
    );
    modalReasonInput.value = drafted;
    await logAiCall(pendingAction.requestId, "cancel_reason", input, drafted);
    updateModalConfirmState();
  } catch (err) {
    console.error(err);
    showToast(`เรียบเรียงเหตุผลไม่สำเร็จ: ${err.message}`, true);
  } finally {
    modalDraftReasonBtn.disabled = false;
    modalDraftReasonBtn.classList.remove("btn-ai-loading");
    modalDraftReasonBtn.textContent = originalLabel;
  }
}

modalDraftReasonBtn.addEventListener("click", () => draftReasonFromSeed(modalReasonInput.value.trim()));

// ข้อความสำเร็จรูปสำหรับสาเหตุที่พบบ่อย — ใส่ตรงๆ ไม่เรียก AI (เร็วกว่า และไม่เสี่ยง AI แต่งเกิน)
const REASON_TEMPLATES = {
  "ที่อยู่นอกเขตพื้นที่ให้บริการ": "ขออภัยค่ะ ที่อยู่ที่ท่านแจ้งอยู่นอกเขตพื้นที่ที่เราให้บริการในขณะนี้ ทางเราจึงไม่สามารถดำเนินการตามคำขอนี้ได้",
  "ติดต่อลูกค้าไม่ได้ หรือเบอร์โทรไม่ถูกต้อง": "ขออภัยค่ะ เจ้าหน้าที่ไม่สามารถติดต่อท่านตามเบอร์โทรศัพท์ที่แจ้งไว้ได้ จึงขอยกเลิกคำขอนี้",
  "ข้อมูลคำขอไม่ครบถ้วนหรือไม่ชัดเจน": "ขออภัยค่ะ ข้อมูลในคำขอของท่านไม่ครบถ้วน ทางเราจึงไม่สามารถดำเนินการต่อได้ในขณะนี้",
  "ลูกค้าแจ้งขอยกเลิกเอง": "ยกเลิกคำขอนี้ตามที่ลูกค้าแจ้งความประสงค์ขอยกเลิกด้วยตนเอง",
  "คำขอนี้ซ้ำกับคำขออื่นของลูกค้าคนเดียวกัน": "คำขอนี้ซ้ำกับคำขออื่นของท่านที่มีอยู่แล้วในระบบ จึงขอยกเลิกรายการนี้",
  "ช่วงเวลานัดหมายไม่สามารถให้บริการได้": "ขออภัยค่ะ ช่วงเวลาที่ท่านนัดหมายไม่สามารถให้บริการได้ในขณะนี้ จึงขอยกเลิกคำขอนี้",
};

modalReasonDropdown.addEventListener("change", () => {
  const picked = modalReasonDropdown.value;
  modalReasonDropdown.value = "";
  if (!picked) return;
  modalReasonInput.value = REASON_TEMPLATES[picked] || picked;
  updateModalConfirmState();
});

function updateModalConfirmState() {
  const needsReason = pendingAction && pendingAction.action === "reject";
  modalConfirmBtn.disabled = needsReason && !modalReasonInput.value.trim();
}

modalReasonInput.addEventListener("input", updateModalConfirmState);

modalCancelBtn.addEventListener("click", () => {
  confirmModal.classList.remove("open");
  pendingAction = null;
});

modalConfirmBtn.addEventListener("click", async () => {
  if (!pendingAction) return;
  const { requestId, action } = pendingAction;
  const reason = modalReasonInput.value.trim();

  if (action === "reject" && !reason) {
    showToast("กรุณากรอกเหตุผลก่อนยืนยัน", true);
    return;
  }

  try {
    const updateData = {
      status: action === "confirm" ? "open_for_saleng" : "cancelled",
      admin_reviewed_at: firebase.firestore.FieldValue.serverTimestamp(),
      admin_reviewed_by: currentAdminUid,
    };
    if (action === "reject") {
      updateData.cancelled_at = firebase.firestore.FieldValue.serverTimestamp();
      updateData.cancelled_by = "admin";
      updateData.cancel_reason = reason;
    }

    // status เปลี่ยนที่นี่เท่านั้น — จุดเดียวในทั้งไฟล์ที่เขียน field `status`, เกิดขึ้นเมื่อคนกด "ยืนยัน" เท่านั้น ไม่มี AI call ใดแตะ field นี้
    await db.collection("pickup_requests").doc(requestId).update(updateData);
    showToast(action === "confirm" ? "Confirm สำเร็จ" : "ลบ/Reject สำเร็จ");
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
      await db.collection("chat_messages").doc().set({
        request_id: requestId,
        sender_role: "admin",
        sender_id: currentAdminUid,
        message_text: text,
        sent_at: firebase.firestore.FieldValue.serverTimestamp(),
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

  const chatQuery = db.collection("chat_messages")
    .where("request_id", "==", requestId)
    .orderBy("sent_at", "asc");

  chatQuery.onSnapshot((snapshot) => {
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
