// หน้าจัดการซาเล้งของ Admin: ตรวจใบสมัคร (pending) → อนุมัติ / ไม่อนุมัติ (มีเหตุผล), ระงับ / เปิดใช้งานอีกครั้ง
// อนุมัติ/เปิดใช้งาน = เขียน marker active_salengs/{uid} ด้วย (rules ใช้ marker นี้เช็กสิทธิ์รับงาน — ดู firestore.rules)
// ไม่อนุมัติ/ระงับ = ลบ marker ทิ้งใน batch เดียวกัน

const salengList = document.getElementById("salengList");
const filterRow = document.getElementById("filterRow");
const toast = document.getElementById("toast");

let currentAdminUid = null;
let currentFilter = "pending";
let salengs = []; // [{ id, ...data }]
let matchStats = new Map(); // salengId → { total, confirmed, completed, cancelledAfterConfirm, declined }
let activeJobsBySaleng = new Map(); // salengId → จำนวนงานที่ถืออยู่
const loadedDocs = new Map(); // salengId → { vehicle_photo, id_card_photo } (โหลดเมื่อกดดูเท่านั้น)
const openReasonForms = new Map(); // salengId → "reject" | "suspend" (คงไว้ตอน re-render)

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
    renderAdminHeader({
      active: "salengs",
      name: profileSnap.data().full_name,
      onLogout: async () => {
        await auth.signOut();
        window.location.href = "../index.html";
      },
    });
    subscribeData();
  } catch (err) {
    console.error(err);
    showToast("โหลดข้อมูล admin ไม่สำเร็จ", true);
  }
});

function subscribeData() {
  db.collection("saleng_accounts").onSnapshot((snap) => {
    salengs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (toDate(b.created_at) || 0) - (toDate(a.created_at) || 0));
    render();
  }, (err) => {
    console.error(err);
    salengList.innerHTML = '<div class="empty-note">โหลดรายชื่อซาเล้งไม่สำเร็จ</div>';
  });

  // สถิติจากประวัติการจับคู่ (request_matches)
  db.collection("request_matches").onSnapshot((snap) => {
    matchStats = new Map();
    snap.docs.forEach((doc) => {
      const m = doc.data();
      const stat = matchStats.get(m.saleng_id) || { total: 0, confirmed: 0, cancelledAfterConfirm: 0, released: 0 };
      stat.total++;
      if (m.match_status === "confirmed") stat.confirmed++;
      if (["cancelled", "rejected"].includes(m.match_status)) stat.released++;
      if (m.cancelled_after_confirm) stat.cancelledAfterConfirm++;
      matchStats.set(m.saleng_id, stat);
    });
    render();
  }, (err) => console.error("โหลดสถิติไม่สำเร็จ", err));

  db.collection("pickup_requests").where("status", "in", SALENG_ACTIVE_STATUSES).onSnapshot((snap) => {
    activeJobsBySaleng = new Map();
    snap.docs.forEach((doc) => {
      const id = doc.data().assigned_saleng_id;
      if (id) activeJobsBySaleng.set(id, (activeJobsBySaleng.get(id) || 0) + 1);
    });
    render();
  }, (err) => console.error("โหลดงานที่ถืออยู่ไม่สำเร็จ", err));
}

function bucketOf(s) {
  if (s.approval_status === "pending") return "pending";
  if (s.approval_status === "rejected") return "rejected";
  return s.account_status === "suspended" ? "suspended" : "active";
}

filterRow.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    currentFilter = chip.dataset.filter;
    filterRow.querySelectorAll(".chip").forEach((el) => {
      el.classList.toggle("active", el === chip);
      el.setAttribute("aria-selected", el === chip ? "true" : "false");
    });
    render();
  });
});

function render() {
  filterRow.querySelectorAll(".chip-count").forEach((el) => {
    el.textContent = salengs.filter((s) => bucketOf(s) === el.dataset.count).length;
  });

  const visible = salengs.filter((s) => bucketOf(s) === currentFilter);
  if (!visible.length) {
    salengList.innerHTML = '<div class="empty-note">ไม่มีซาเล้งในหมวดนี้</div>';
    return;
  }
  salengList.innerHTML = "";
  visible.forEach((s) => salengList.appendChild(renderCard(s)));
}

function renderCard(s) {
  const bucket = bucketOf(s);
  const stat = matchStats.get(s.id) || { total: 0, confirmed: 0, cancelledAfterConfirm: 0, released: 0 };
  const holding = activeJobsBySaleng.get(s.id) || 0;
  const docs = loadedDocs.get(s.id);

  const card = document.createElement("div");
  card.className = "s-card";
  card.innerHTML = `
    <div class="s-card-top">
      <div class="s-card-avatar" aria-hidden="true">🛺</div>
      <div class="s-card-body">
        <div class="s-card-name">${escapeHtml(s.full_name)}</div>
        <div class="s-card-meta"><a href="tel:${escapeHtml(s.phone_number)}">${escapeHtml(s.phone_number)}</a> · ทะเบียน ${escapeHtml(s.vehicle_plate || "-")}</div>
        <div class="s-card-meta">สมัครเมื่อ ${escapeHtml(formatDateTime(toDate(s.created_at)))}</div>
        <div class="area-chips">${(s.service_sub_districts || []).map((a) => `<span class="area-chip">📍 ${escapeHtml(a)}</span>`).join("")}</div>
      </div>
    </div>

    ${bucket === "pending" ? "" : `
    <div class="s-stats">
      <span class="s-stat"><b>${holding}</b>งานที่ถืออยู่</span>
      <span class="s-stat"><b>${stat.total}</b>รับงานทั้งหมด</span>
      <span class="s-stat"><b>${stat.released}</b>ปฏิเสธ/ยกเลิก</span>
      <span class="s-stat ${stat.cancelledAfterConfirm ? "bad" : ""}"><b>${stat.cancelledAfterConfirm}</b>ยกเลิกหลังยืนยัน</span>
    </div>`}

    ${s.reject_reason && bucket === "rejected" ? `<div class="s-reason">ไม่อนุมัติเพราะ: ${escapeHtml(s.reject_reason)}</div>` : ""}
    ${s.suspend_reason && bucket === "suspended" ? `<div class="s-reason">ระงับเพราะ: ${escapeHtml(s.suspend_reason)}</div>` : ""}

    ${docs ? `
      <div class="s-docs">
        ${docHtml("รูปรถ", docs.vehicle_photo)}
        ${docHtml("รูปบัตรประชาชน (ข้อมูลอ่อนไหว)", docs.id_card_photo)}
      </div>` : '<button type="button" class="s-docs-load" data-act="docs">📎 ดูเอกสารประกอบการสมัคร</button>'}

    <div class="action-row">${actionButtonsHtml(bucket)}</div>
    <div class="s-reason-form" hidden>
      <input type="text" maxlength="200">
      <button type="button" class="btn btn-danger" data-act="reason-submit"></button>
    </div>
  `;

  card.querySelectorAll("[data-photo]").forEach((btn) => btn.addEventListener("click", () => openPhotoViewer(btn.querySelector("img").src)));
  const docsBtn = card.querySelector('[data-act="docs"]');
  if (docsBtn) docsBtn.addEventListener("click", () => loadDocs(s.id, docsBtn));

  card.querySelectorAll(".action-row [data-act]").forEach((btn) => {
    btn.addEventListener("click", () => handleAction(btn.dataset.act, s, card));
  });
  card.querySelector('[data-act="reason-submit"]').addEventListener("click", (e) => submitReason(s, card, e.currentTarget));

  const openForm = openReasonForms.get(s.id);
  if (openForm) showReasonForm(card, openForm, holding);
  return card;
}

function docHtml(label, imageData) {
  const ok = SAFE_IMAGE_DATA.test(imageData || "");
  return `<div class="s-doc"><div class="s-doc-label">${escapeHtml(label)}</div>${ok
    ? `<button type="button" data-photo><img src="${imageData}" alt="${escapeHtml(label)}"></button>`
    : '<div class="s-card-meta">ไม่มีรูป</div>'}</div>`;
}

function actionButtonsHtml(bucket) {
  if (bucket === "pending") {
    return '<button type="button" class="btn btn-primary" data-act="approve">✅ อนุมัติ</button><button type="button" class="btn btn-secondary" data-act="reject">ไม่อนุมัติ</button>';
  }
  if (bucket === "active") return '<button type="button" class="btn btn-secondary" data-act="suspend">⛔ ระงับบัญชี</button>';
  if (bucket === "suspended") return '<button type="button" class="btn btn-primary" data-act="reactivate">เปิดใช้งานอีกครั้ง</button>';
  return '<button type="button" class="btn btn-primary" data-act="approve">อนุมัติ (ทบทวนใหม่)</button>';
}

async function loadDocs(salengId, button) {
  button.disabled = true;
  button.textContent = "กำลังโหลด...";
  try {
    const snap = await db.collection("saleng_documents").where("saleng_id", "==", salengId).get();
    const docs = {};
    snap.docs.forEach((doc) => { docs[doc.data().doc_type] = doc.data().image_data; });
    loadedDocs.set(salengId, docs);
    render();
  } catch (err) {
    console.error(err);
    showToast("โหลดเอกสารไม่สำเร็จ", true);
    button.disabled = false;
    button.textContent = "📎 ดูเอกสารประกอบการสมัคร";
  }
}

function openPhotoViewer(src) {
  const overlay = document.createElement("div");
  overlay.className = "photo-viewer";
  overlay.innerHTML = `<img src="${src}" alt="">`;
  overlay.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

// ---------- อนุมัติ / ไม่อนุมัติ / ระงับ / เปิดใช้งาน ----------
function handleAction(act, s, card) {
  if (act === "approve" || act === "reactivate") {
    setActive(s, act);
  } else {
    openReasonForms.set(s.id, act);
    showReasonForm(card, act, activeJobsBySaleng.get(s.id) || 0);
  }
}

function showReasonForm(card, act, holding) {
  const form = card.querySelector(".s-reason-form");
  const input = form.querySelector("input");
  const button = form.querySelector("button");
  form.hidden = false;
  input.placeholder = act === "reject" ? "เหตุผลที่ไม่อนุมัติ (ซาเล้งจะเห็นข้อความนี้)" : "เหตุผลที่ระงับ (ซาเล้งจะเห็นข้อความนี้)";
  button.textContent = act === "reject"
    ? "ยืนยันไม่อนุมัติ"
    : `ยืนยันระงับบัญชี${holding ? ` — มีงานค้าง ${holding} งาน ต้องยกเลิกการจับคู่ในหน้าคำขอเอง` : ""}`;
  input.focus();
}

async function setActive(s, act) {
  const batch = db.batch();
  const update = act === "approve"
    ? { approval_status: "approved", account_status: "active", approved_at: firebase.firestore.FieldValue.serverTimestamp(), approved_by: currentAdminUid, reject_reason: null }
    : { account_status: "active", suspend_reason: null };
  batch.update(db.collection("saleng_accounts").doc(s.id), update);
  batch.set(db.collection("active_salengs").doc(s.id), { since: firebase.firestore.FieldValue.serverTimestamp(), by: currentAdminUid });
  try {
    await batch.commit();
    showToast(act === "approve" ? `อนุมัติ ${s.full_name} แล้ว — เริ่มรับงานได้ทันที` : `เปิดใช้งาน ${s.full_name} แล้ว`);
  } catch (err) {
    console.error(err);
    showToast("บันทึกไม่สำเร็จ", true);
  }
}

async function submitReason(s, card, button) {
  const act = openReasonForms.get(s.id);
  const reason = card.querySelector(".s-reason-form input").value.trim();
  if (!reason) {
    showToast("กรอกเหตุผลก่อน", true);
    return;
  }
  button.disabled = true;
  const batch = db.batch();
  batch.update(db.collection("saleng_accounts").doc(s.id), act === "reject"
    ? { approval_status: "rejected", reject_reason: reason, reviewed_at: firebase.firestore.FieldValue.serverTimestamp(), reviewed_by: currentAdminUid }
    : { account_status: "suspended", suspend_reason: reason, suspended_at: firebase.firestore.FieldValue.serverTimestamp(), suspended_by: currentAdminUid });
  batch.delete(db.collection("active_salengs").doc(s.id));
  try {
    await batch.commit();
    openReasonForms.delete(s.id);
    showToast(act === "reject" ? "บันทึกไม่อนุมัติแล้ว" : "ระงับบัญชีแล้ว");
  } catch (err) {
    console.error(err);
    showToast("บันทึกไม่สำเร็จ", true);
    button.disabled = false;
  }
}
