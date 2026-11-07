// หน้าหลักของซาเล้ง — ตรวจสถานะบัญชี (รออนุมัติ/ถูกปฏิเสธ/ระงับ) แล้วแสดง 2 แท็บ:
//   งานใหม่  = งานที่ Admin มอบหมายให้ (รอตอบรับ) + งาน open_for_saleng ในตำบลที่ลงทะเบียน (กดรับเอง)
//   งานของฉัน = งานที่รับแล้ว (รอ Admin ยืนยัน / ยืนยันแล้ว) — ยกเลิก, ปิดงาน, แชทกับ Admin
// กติกาโควตาและกำหนดเวลายกเลิกอยู่ใน saleng-helpers.js

const gate = document.getElementById("gate");
const workspace = document.getElementById("workspace");
const helloName = document.getElementById("helloName");
const areaText = document.getElementById("areaText");
const assignedList = document.getElementById("assignedList");
const openList = document.getElementById("openList");
const mineList = document.getElementById("mineList");
const toast = document.getElementById("toast");

const reasonModal = document.getElementById("reasonModal");
const reasonForm = document.getElementById("reasonForm");
const reasonTitle = document.getElementById("reasonTitle");
const reasonDesc = document.getElementById("reasonDesc");
const reasonList = document.getElementById("reasonList");
const reasonOther = document.getElementById("reasonOther");

const REASONS = {
  decline: ["อยู่ไกลเกินไป", "คิวช่วงเวลานั้นไม่ว่าง", "รถไม่พร้อม"],
  cancel: ["ติดธุระด่วน", "รถเสีย / ไม่พร้อมใช้งาน", "คิวช่วงเวลานั้นไม่ว่างแล้ว", "ติดต่อลูกค้าไม่ได้"],
};

let uid = null;
let profile = null;
let openJobs = []; // งานเปิดในตำบลของฉัน [{ id, ...data }]
let myJobs = []; // งานที่ผูกกับฉัน (ทุกสถานะ)
let salengChats = new Map(); // requestId → ข้อความแชทกับ Admin
let pendingReasonAction = null; // { kind: "decline" | "cancel", job }

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "../login/index.html";
});

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

// ---------- auth + สถานะบัญชี ----------
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }
  uid = user.uid;

  db.collection("saleng_accounts").doc(uid).onSnapshot((snap) => {
    if (!snap.exists) {
      showGate("🙅", "ไม่พบบัญชีซาเล้ง", "บัญชีนี้ไม่ได้สมัครเป็นซาเล้ง — ออกจากระบบแล้วสมัครเป็นซาเล้งก่อน");
      return;
    }
    const firstLoad = !profile;
    profile = snap.data();
    helloName.textContent = `สวัสดี ${profile.full_name}`;
    areaText.textContent = `📍 ${(profile.service_sub_districts || []).join(" · ")} · ${profile.vehicle_plate || ""}`;

    if (profile.account_status === "suspended") {
      showGate("⛔", "บัญชีถูกระงับชั่วคราว", "ติดต่อ Admin เพื่อสอบถามรายละเอียด", profile.suspend_reason);
    } else if (profile.approval_status === "pending") {
      showGate("⏳", "รอ Admin ตรวจสอบใบสมัคร", "เมื่ออนุมัติแล้ว หน้านี้จะแสดงงานในตำบลของคุณทันที (ไม่ต้อง refresh)");
    } else if (profile.approval_status === "rejected") {
      showGate("📝", "ใบสมัครไม่ผ่านการอนุมัติ", "ติดต่อ Admin หากต้องการสมัครใหม่", profile.reject_reason);
    } else {
      gate.innerHTML = "";
      workspace.hidden = false;
      if (firstLoad || !subscribed) subscribeJobs();
    }
  }, (err) => {
    console.error(err);
    showGate("⚠️", "โหลดข้อมูลบัญชีไม่สำเร็จ", "ลองรีเฟรชหน้าใหม่");
  });
});

function showGate(icon, title, desc, reason) {
  workspace.hidden = true;
  gate.innerHTML = `
    <div class="gate">
      <div class="gate-icon" aria-hidden="true">${icon}</div>
      <div class="gate-title">${escapeHtml(title)}</div>
      <div class="gate-desc">${escapeHtml(desc)}</div>
      ${reason ? `<div class="gate-reason">เหตุผลจาก Admin: ${escapeHtml(reason)}</div>` : ""}
    </div>`;
}

// ---------- ข้อมูลงาน (real-time) ----------
let subscribed = false;

function subscribeJobs() {
  subscribed = true;

  db.collection("pickup_requests").where("assigned_saleng_id", "==", uid).onSnapshot((snap) => {
    myJobs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    render();
  }, (err) => console.error("โหลดงานของฉันไม่สำเร็จ", err));

  const areas = (profile.service_sub_districts || []).slice(0, 30); // where-in รับได้ไม่เกิน 30 ค่า
  if (areas.length) {
    db.collection("pickup_requests")
      .where("status", "==", "open_for_saleng")
      .where("sub_district", "in", areas)
      .onSnapshot((snap) => {
        openJobs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        render();
      }, (err) => {
        console.error("โหลดงานใหม่ไม่สำเร็จ", err);
        openList.innerHTML = '<div class="empty-note">โหลดงานไม่สำเร็จ — ลองรีเฟรชหน้าใหม่</div>';
      });
  }

  db.collection("saleng_chat_messages").where("saleng_id", "==", uid).onSnapshot((snap) => {
    salengChats = new Map();
    snap.docs.forEach((doc) => {
      const msg = doc.data();
      if (!salengChats.has(msg.request_id)) salengChats.set(msg.request_id, []);
      salengChats.get(msg.request_id).push(msg);
    });
    render();
  }, (err) => console.error("โหลดแชทไม่สำเร็จ", err));
}

// ---------- แสดงผล ----------
function sortBySlot(a, b) {
  return (slotStartDate(a.requested_date, a.time_slot) || 0) - (slotStartDate(b.requested_date, b.time_slot) || 0);
}

function render() {
  const load = salengLoad(myJobs);
  renderQuota(load);

  const awaitingMe = myJobs.filter((j) => j.status === "pending_match_confirm" && j.match_channel === "admin_assign" && !j.saleng_accepted).sort(sortBySlot);
  const holding = myJobs.filter((j) => SALENG_ACTIVE_STATUSES.includes(j.status) && !awaitingMe.includes(j)).sort(sortBySlot);
  const open = openJobs.filter((j) => !j.assigned_saleng_id).sort(sortBySlot);

  assignedList.innerHTML = awaitingMe.length
    ? `<div class="list-title">📌 Admin มอบหมายให้คุณ — กรุณาตอบรับ</div>`
    : "";
  awaitingMe.forEach((job) => assignedList.appendChild(assignedCard(job, load)));

  openList.innerHTML = open.length ? "" : '<div class="empty-note">ยังไม่มีงานใหม่ในตำบลของคุณ — งานใหม่จะเด้งขึ้นมาที่นี่ทันที</div>';
  open.forEach((job) => openList.appendChild(openCard(job, load)));

  mineList.innerHTML = holding.length ? "" : '<div class="empty-note">ยังไม่มีงานที่รับไว้ — ไปที่แท็บ "งานใหม่" เพื่อรับงาน</div>';
  holding.forEach((job) => mineList.appendChild(mineCard(job)));

  setCount("countNew", awaitingMe.length + open.length);
  const seen = loadSeenState(uid);
  const unreadChats = holding.reduce((sum, job) => sum + countUnreadMessages(seen, job.id, salengChats.get(job.id) || [], "admin"), 0);
  setCount("countMine", unreadChats);
}

function setCount(id, value) {
  const el = document.getElementById(id);
  el.textContent = value || "";
}

function renderQuota(load) {
  document.getElementById("quotaMax").textContent = MAX_ACTIVE_JOBS;
  document.getElementById("quotaSlot").textContent = MAX_JOBS_PER_SLOT;
  document.getElementById("quotaValue").textContent = `${load.active}/${MAX_ACTIVE_JOBS}`;
  document.getElementById("quotaBar").style.width = `${Math.min(100, (load.active / MAX_ACTIVE_JOBS) * 100)}%`;
  document.getElementById("quotaBox").classList.toggle("full", load.active >= MAX_ACTIVE_JOBS);
}

function jobHeadHtml(job, pillHtml) {
  return `
    <div class="job-top">
      <div class="job-body">
        <div class="job-title">${escapeHtml((job.waste_types || []).join(", ") || "-")}</div>
        <div class="job-meta">🗓️ ${escapeHtml(slotText(job))}</div>
      </div>
      ${pillHtml}
    </div>
    <div class="job-tags">
      <span class="tag">📍 ${escapeHtml(job.sub_district || "-")}</span>
      <span class="tag">⚖️ ${escapeHtml(job.estimated_quantity_description || "-")}</span>
      ${job.landmark ? `<span class="tag">🏷️ ${escapeHtml(job.landmark)}</span>` : ""}
    </div>`;
}

function openCard(job, load) {
  const card = document.createElement("div");
  card.className = "job";
  const block = quotaBlockReason(load, job);
  card.innerHTML = `
    ${jobHeadHtml(job, '<span class="pill">งานใหม่</span>')}
    ${block ? `<div class="job-note block">⛔ ${escapeHtml(block)}</div>` : ""}
    <div class="job-actions">
      <button type="button" class="btn btn-primary" ${block ? "disabled" : ""}>✋ รับงานนี้</button>
    </div>`;
  card.querySelector("button").addEventListener("click", (e) => selfPick(job, e.currentTarget));
  return card;
}

function assignedCard(job, load) {
  const card = document.createElement("div");
  card.className = "job assigned";
  // งานนี้นับอยู่ใน load แล้ว (pending_match_confirm) — เช็กโควตาจากงานอื่นที่ไม่ใช่ตัวเอง
  const block = quotaBlockReason(salengLoad(myJobs.filter((j) => j.id !== job.id)), job);
  card.innerHTML = `
    ${jobHeadHtml(job, '<span class="pill assign">Admin มอบหมาย</span>')}
    ${!(profile.service_sub_districts || []).includes(job.sub_district) ? '<div class="job-note">งานนี้อยู่นอกตำบลที่คุณลงทะเบียนไว้</div>' : ""}
    ${block ? `<div class="job-note">⚠️ ${escapeHtml(block)} — Admin มอบหมายเกินโควตา ตอบรับได้ถ้าไหว</div>` : ""}
    <div class="job-actions">
      <button type="button" class="btn btn-ghost" data-act="decline">ปฏิเสธ</button>
      <button type="button" class="btn btn-primary" data-act="accept">✅ ตอบรับงาน</button>
    </div>`;
  card.querySelector('[data-act="accept"]').addEventListener("click", (e) => acceptAssigned(job, e.currentTarget));
  card.querySelector('[data-act="decline"]').addEventListener("click", () => openReasonModal("decline", job));
  return card;
}

function mineCard(job) {
  const card = document.createElement("div");
  card.className = "job";
  const confirmed = job.status === "confirmed";
  const pill = confirmed ? '<span class="pill ok">ยืนยันแล้ว</span>' : '<span class="pill wait">รอ Admin ยืนยัน</span>';
  const unread = countUnreadMessages(loadSeenState(uid), job.id, salengChats.get(job.id) || [], "admin");

  // หลัง Admin ยืนยัน: ยกเลิกเองได้ถึงเวลาที่กำหนด (saleng-helpers.js) เลยแล้วต้องขอผ่าน Admin ทางแชท
  const selfCancel = canSalengSelfCancel(job);
  const deadline = confirmed && selfCancel ? cancelDeadline(job) : null;
  const cancelHtml = selfCancel
    ? '<button type="button" class="btn btn-danger" data-act="cancel">ยกเลิกงาน</button>'
    : `<a class="btn btn-danger" href="../chat/index.html?id=${encodeURIComponent(job.id)}&draft=cancel">ขอยกเลิกผ่าน Admin</a>`;

  card.innerHTML = `
    ${jobHeadHtml(job, pill)}
    ${confirmed ? `
      <div class="job-contact">
        <div class="job-contact-row"><b>ลูกค้า</b><span>${escapeHtml(job.contact_name || "-")}</span></div>
        <div class="job-contact-row"><b>โทร</b><a href="tel:${escapeHtml(job.contact_phone || "")}">${escapeHtml(job.contact_phone || "-")}</a></div>
        <div class="job-contact-row"><b>ที่อยู่</b><span>${escapeHtml(job.address_text || "-")}${job.landmark ? ` (${escapeHtml(job.landmark)})` : ""}</span></div>
        ${job.notes ? `<div class="job-contact-row"><b>หมายเหตุ</b><span>${escapeHtml(job.notes)}</span></div>` : ""}
      </div>` : `<div class="job-note">รอ Admin ยืนยันการจับคู่ — ที่อยู่และเบอร์ลูกค้าจะแสดงหลังยืนยัน</div>`}
    ${deadline ? `<div class="job-note">ยกเลิกเองได้ถึง ${escapeHtml(formatDateTime(deadline))} — หลังจากนั้นต้องขอผ่าน Admin</div>` : ""}
    <div class="job-actions">
      <a class="btn btn-outline" href="../chat/index.html?id=${encodeURIComponent(job.id)}">
        <span class="btn-icon" aria-hidden="true">💬<span class="unread-dot" ${unread ? "" : "hidden"}>${unread > 9 ? "9+" : unread}</span></span> แชท Admin
      </a>
      ${cancelHtml}
    </div>
    ${confirmed ? '<div class="job-actions"><button type="button" class="btn btn-primary" data-act="complete">✔️ ปิดงาน (รับขยะเรียบร้อย)</button></div>' : ""}`;

  const cancelBtn = card.querySelector('[data-act="cancel"]');
  if (cancelBtn) cancelBtn.addEventListener("click", () => openReasonModal("cancel", job));
  const completeBtn = card.querySelector('[data-act="complete"]');
  if (completeBtn) completeBtn.addEventListener("click", (e) => completeJob(job, e.currentTarget));
  return card;
}

// ---------- แท็บ ----------
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    document.getElementById("tab-new").hidden = tab.dataset.tab !== "new";
    document.getElementById("tab-mine").hidden = tab.dataset.tab !== "mine";
  });
});

// ---------- การกระทำ ----------
const serverTime = () => firebase.firestore.FieldValue.serverTimestamp();

// รับงานเอง: transaction กันสองคนกดรับงานเดียวกันพร้อมกัน (ใครเขียนก่อนได้งาน)
// โควตาเช็กจากข้อมูลล่าสุดก่อนเริ่ม transaction (ข้อจำกัด: กดรับ 2 งานพร้อมกันใน 2 แท็บอาจเกินโควตาได้)
async function selfPick(job, button) {
  const block = quotaBlockReason(salengLoad(myJobs), job);
  if (block) {
    showToast(block, true);
    return;
  }
  button.disabled = true;
  button.textContent = "กำลังรับงาน...";

  const requestRef = db.collection("pickup_requests").doc(job.id);
  const matchRef = db.collection("request_matches").doc();
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(requestRef);
      if (!snap.exists || snap.data().status !== "open_for_saleng" || snap.data().assigned_saleng_id) {
        throw new Error("taken");
      }
      tx.update(requestRef, {
        status: "pending_match_confirm",
        assigned_saleng_id: uid,
        assigned_saleng_name: profile.full_name,
        assigned_saleng_phone: profile.phone_number,
        assigned_saleng_plate: profile.vehicle_plate || "",
        match_channel: "self_pick",
        saleng_accepted: true,
        assigned_at: serverTime(),
        accepted_at: serverTime(),
        active_match_id: matchRef.id,
      });
      tx.set(matchRef, {
        request_id: job.id,
        saleng_id: uid,
        match_channel: "self_pick",
        match_status: "pending_admin_confirm_user",
        created_at: serverTime(),
        accepted_at: serverTime(),
      });
    });
    showToast("รับงานแล้ว — รอ Admin ยืนยัน");
  } catch (err) {
    console.error(err);
    // งานที่มีคนรับไปแล้วจะอ่านไม่ได้ตาม rules (permission-denied) หรือสถานะไม่ใช่ open แล้ว
    showToast(err.message === "taken" || err.code === "permission-denied"
      ? "มีซาเล้งคนอื่นรับงานนี้ไปแล้ว"
      : "รับงานไม่สำเร็จ กรุณาลองใหม่", true);
    button.disabled = false;
    button.textContent = "✋ รับงานนี้";
  }
}

async function acceptAssigned(job, button) {
  button.disabled = true;
  try {
    const batch = db.batch();
    batch.update(db.collection("pickup_requests").doc(job.id), { saleng_accepted: true, accepted_at: serverTime() });
    if (job.active_match_id) {
      batch.update(db.collection("request_matches").doc(job.active_match_id), {
        match_status: "pending_admin_confirm_user",
        accepted_at: serverTime(),
      });
    }
    await batch.commit();
    showToast("ตอบรับงานแล้ว — รอ Admin ยืนยัน");
  } catch (err) {
    console.error(err);
    showToast("ตอบรับไม่สำเร็จ กรุณาลองใหม่", true);
    button.disabled = false;
  }
}

// ปฏิเสธงานที่มอบหมาย / ยกเลิกงานที่รับไว้ → งานกลับเป็น open_for_saleng ให้คนอื่นรับ
async function releaseJob(job, kind, reason) {
  const afterConfirm = job.status === "confirmed";
  const batch = db.batch();
  batch.update(db.collection("pickup_requests").doc(job.id), {
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
    opened_at: serverTime(),
  });
  if (job.active_match_id) {
    batch.update(db.collection("request_matches").doc(job.active_match_id), {
      match_status: kind === "decline" ? "rejected" : "cancelled",
      ended_by: "saleng",
      end_reason: reason,
      ended_at: serverTime(),
      cancelled_after_confirm: afterConfirm,
    });
  }
  await batch.commit();
}

async function completeJob(job, button) {
  if (!window.confirm("ยืนยันว่ารับขยะจากลูกค้าเรียบร้อยแล้ว?")) return;
  button.disabled = true;
  try {
    await db.collection("pickup_requests").doc(job.id).update({ status: "completed", completed_at: serverTime() });
    showToast("ปิดงานแล้ว ขอบคุณครับ");
  } catch (err) {
    console.error(err);
    showToast("ปิดงานไม่สำเร็จ กรุณาลองใหม่", true);
    button.disabled = false;
  }
}

// ---------- modal เลือกเหตุผล (ปฏิเสธ/ยกเลิก) ----------
function openReasonModal(kind, job) {
  pendingReasonAction = { kind, job };
  reasonTitle.textContent = kind === "decline" ? "ปฏิเสธงานที่ Admin มอบหมาย" : "ยกเลิกงาน";
  const deadline = job.status === "confirmed" ? cancelDeadline(job) : null;
  reasonDesc.textContent = kind === "decline"
    ? "งานจะกลับไปให้ Admin มอบหมายคนอื่น"
    : `งานจะกลับไปเปิดให้ซาเล้งคนอื่นรับ${deadline ? ` (ยกเลิกเองได้ถึง ${formatDateTime(deadline)})` : ""}${job.status === "confirmed" ? " — การยกเลิกหลัง Admin ยืนยันจะถูกนับในสถิติ" : ""}`;
  reasonList.innerHTML = REASONS[kind].map((r, i) =>
    `<label class="reason-item"><input type="radio" name="reason" value="${escapeHtml(r)}" ${i === 0 ? "checked" : ""}> ${escapeHtml(r)}</label>`).join("");
  reasonOther.value = "";
  reasonModal.classList.add("open");
}

function closeReasonModal() {
  reasonModal.classList.remove("open");
  pendingReasonAction = null;
}

document.getElementById("reasonCancelBtn").addEventListener("click", closeReasonModal);
reasonModal.addEventListener("click", (e) => {
  if (e.target === reasonModal) closeReasonModal();
});

reasonForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!pendingReasonAction) return;
  const { kind, job } = pendingReasonAction;
  const picked = reasonForm.querySelector('input[name="reason"]:checked');
  const reason = reasonOther.value.trim() || (picked ? picked.value : "");
  if (!reason) {
    showToast("เลือกหรือพิมพ์เหตุผลก่อน", true);
    return;
  }
  // หลัง Admin ยืนยัน: เช็กกำหนดเวลาอีกรอบ (เปิด modal ค้างไว้จนเลยเวลาได้)
  if (kind === "cancel" && !canSalengSelfCancel(job)) {
    closeReasonModal();
    showToast("เลยเวลาที่ยกเลิกเองได้แล้ว — ขอยกเลิกผ่าน Admin", true);
    window.location.href = `../chat/index.html?id=${encodeURIComponent(job.id)}&draft=cancel`;
    return;
  }

  const submitBtn = document.getElementById("reasonSubmitBtn");
  submitBtn.disabled = true;
  try {
    await releaseJob(job, kind, reason);
    closeReasonModal();
    showToast(kind === "decline" ? "ปฏิเสธงานแล้ว" : "ยกเลิกงานแล้ว — งานกลับไปเปิดให้คนอื่นรับ");
  } catch (err) {
    console.error(err);
    showToast("ทำรายการไม่สำเร็จ กรุณาลองใหม่", true);
  } finally {
    submitBtn.disabled = false;
  }
});
