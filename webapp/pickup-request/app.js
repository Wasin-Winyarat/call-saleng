import { db, storage } from "../firebase-config.js";
import {
  collection, doc, setDoc, serverTimestamp, onSnapshot, query, orderBy, where,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

const MAX_PHOTOS = 5;

const form = document.getElementById("requestForm");
const submitBtn = document.getElementById("submitBtn");
const toast = document.getElementById("toast");
const photoInput = document.getElementById("photoInput");
const photoPreview = document.getElementById("photoPreview");
const photoHint = document.getElementById("photoHint");
const requestList = document.getElementById("requestList");
const timeSlotRow = document.getElementById("timeSlotRow");
const wasteTypeGrid = document.getElementById("wasteTypeGrid");
const userSelect = document.getElementById("user_id");

let activeUsers = {}; // user_id -> user_account data, เฉพาะ status = active

let selectedFiles = [];

const STATUS_LABEL = {
  pending_admin_review: "รอ Admin ตรวจสอบ",
  cancelled: "ยกเลิกแล้ว",
  open_for_saleng: "เปิดให้สาเล้งรับงาน",
  pending_match_confirm: "รอยืนยันการจับคู่",
  confirmed: "ยืนยันแล้ว",
  completed: "เสร็จสิ้น",
};

// ---------- checkbox / radio visual state ----------
wasteTypeGrid.querySelectorAll(".checkbox-item").forEach((item) => {
  const input = item.querySelector("input");
  input.addEventListener("change", () => {
    item.classList.toggle("checked", input.checked);
    validate();
  });
});

timeSlotRow.querySelectorAll(".radio-item").forEach((item) => {
  const input = item.querySelector("input");
  item.addEventListener("click", () => {
    timeSlotRow.querySelectorAll(".radio-item").forEach((el) => el.classList.remove("checked"));
    input.checked = true;
    item.classList.add("checked");
    validate();
  });
});

// ---------- photo picker ----------
photoInput.addEventListener("change", () => {
  const incoming = Array.from(photoInput.files);
  selectedFiles = [...selectedFiles, ...incoming].slice(0, MAX_PHOTOS);
  photoInput.value = "";
  renderPhotoPreview();
});

function renderPhotoPreview() {
  photoPreview.innerHTML = "";
  selectedFiles.forEach((file, idx) => {
    const thumb = document.createElement("div");
    thumb.className = "photo-thumb";
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    thumb.appendChild(img);
    thumb.title = "คลิกเพื่อลบ";
    thumb.style.cursor = "pointer";
    thumb.addEventListener("click", () => {
      selectedFiles.splice(idx, 1);
      renderPhotoPreview();
    });
    photoPreview.appendChild(thumb);
  });
  photoHint.textContent = `เลือกแล้ว ${selectedFiles.length}/${MAX_PHOTOS} รูป`;
  photoInput.disabled = selectedFiles.length >= MAX_PHOTOS;
}

// ---------- user_account dropdown (เฉพาะ status = active ตาม business rule) ----------
const activeUsersQuery = query(collection(db, "user_accounts"), where("status", "==", "active"));

onSnapshot(
  activeUsersQuery,
  (snapshot) => {
    activeUsers = {};
    const previousValue = userSelect.value;
    userSelect.innerHTML = '<option value="">เลือกบัญชีผู้ใช้...</option>';
    snapshot.forEach((docSnap) => {
      activeUsers[docSnap.id] = docSnap.data();
      const opt = document.createElement("option");
      opt.value = docSnap.id;
      opt.textContent = `${docSnap.data().full_name} (${docSnap.data().phone_number})`;
      userSelect.appendChild(opt);
    });
    if (activeUsers[previousValue]) userSelect.value = previousValue;
  },
  (err) => console.error("โหลด user_accounts ไม่สำเร็จ", err),
);

userSelect.addEventListener("change", () => {
  const user = activeUsers[userSelect.value];
  if (user) {
    document.getElementById("contact_name").value = user.full_name;
    document.getElementById("contact_phone").value = user.phone_number;
  }
  validate();
});

// ---------- validation ----------
function fieldValue(id) {
  return document.getElementById(id).value.trim();
}

function getWasteTypes() {
  return Array.from(wasteTypeGrid.querySelectorAll("input:checked")).map((el) => el.value);
}

function getTimeSlot() {
  const checked = timeSlotRow.querySelector("input:checked");
  return checked ? checked.value : "";
}

function setFieldError(fieldId, hasError) {
  const el = document.getElementById(fieldId);
  if (el) el.classList.toggle("has-error", hasError);
}

function validate(showErrors = false) {
  const checks = [
    ["field-user_id", userSelect.value.length > 0],
    ["field-contact_name", fieldValue("contact_name").length > 0],
    ["field-contact_phone", /^0\d{8,9}$/.test(fieldValue("contact_phone").replace(/-/g, ""))],
    ["field-sub_district", fieldValue("sub_district").length > 0],
    ["field-address_text", fieldValue("address_text").length > 0],
    ["field-waste_types", getWasteTypes().length > 0],
    ["field-requested_date", fieldValue("requested_date").length > 0],
    ["field-time_slot", getTimeSlot().length > 0],
  ];

  if (showErrors) {
    checks.forEach(([fieldId, ok]) => setFieldError(fieldId, !ok));
  }

  const allValid = checks.every(([, ok]) => ok);
  submitBtn.disabled = !allValid;
  return allValid;
}

form.addEventListener("input", () => validate());

// ---------- toast ----------
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

// ---------- upload photos ----------
async function uploadPhotos(requestId, files) {
  const uploads = files.map(async (file, index) => {
    const photoRef = ref(storage, `request_photos/${requestId}/${index}-${file.name}`);
    await uploadBytes(photoRef, file);
    return getDownloadURL(photoRef);
  });
  return Promise.all(uploads);
}

// ---------- submit ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate(true)) {
    showToast("กรุณากรอกข้อมูลที่จำเป็นให้ครบ", true);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "กำลังส่งคำขอ...";

  try {
    const requestRef = doc(collection(db, "pickup_requests"));
    const photoUrls = selectedFiles.length ? await uploadPhotos(requestRef.id, selectedFiles) : [];

    await setDoc(requestRef, {
      user_id: userSelect.value,
      contact_name: fieldValue("contact_name"),
      contact_phone: fieldValue("contact_phone"),
      sub_district: fieldValue("sub_district"),
      address_text: fieldValue("address_text"),
      landmark: fieldValue("landmark"),
      waste_types: getWasteTypes(),
      estimated_quantity_description: document.getElementById("estimated_quantity_description").value,
      photo_urls: photoUrls,
      requested_date: fieldValue("requested_date"),
      time_slot: getTimeSlot(),
      status: "pending_admin_review",
      created_at: serverTimestamp(),
    });

    showToast("ส่งคำขอสำเร็จ");
    resetForm();
  } catch (err) {
    console.error(err);
    const message = err.code === "permission-denied"
      ? "ส่งคำขอไม่สำเร็จ: Firestore ปฏิเสธสิทธิ์ — ตั้งค่า Security Rules ก่อน (ดู README)"
      : "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
    showToast(message, true);
  } finally {
    submitBtn.textContent = "ส่งคำขอ";
    validate();
  }
});

function resetForm() {
  form.reset();
  userSelect.value = "";
  selectedFiles = [];
  renderPhotoPreview();
  wasteTypeGrid.querySelectorAll(".checkbox-item").forEach((item) => item.classList.remove("checked"));
  timeSlotRow.querySelectorAll(".radio-item").forEach((item) => item.classList.remove("checked"));
  form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
  validate();
}

// ---------- realtime request list ----------
const requestsQuery = query(collection(db, "pickup_requests"), orderBy("created_at", "desc"));

onSnapshot(
  requestsQuery,
  (snapshot) => {
    if (snapshot.empty) {
      requestList.innerHTML = '<div class="empty-note">ยังไม่มีคำขอ — ลองส่งฟอร์มด้านบนดูได้เลย</div>';
      return;
    }
    requestList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      requestList.appendChild(renderRequestCard(docSnap.data()));
    });
  },
  (err) => {
    console.error(err);
    requestList.innerHTML = `<div class="empty-note">โหลดรายการไม่สำเร็จ (${err.code === "permission-denied" ? "ตั้งค่า Firestore Security Rules ก่อน — ดู README" : "ลองรีเฟรชหน้าใหม่"})</div>`;
  },
);

function renderRequestCard(data) {
  const card = document.createElement("div");
  card.className = "request-card";

  const thumb = document.createElement("div");
  thumb.className = "request-card-thumb";
  if (data.photo_urls && data.photo_urls.length) {
    const img = document.createElement("img");
    img.src = data.photo_urls[0];
    thumb.appendChild(img);
  } else {
    thumb.textContent = "♻️";
  }

  const body = document.createElement("div");
  body.className = "request-card-body";
  body.innerHTML = `
    <div class="request-card-title">${escapeHtml(data.contact_name || "-")}</div>
    <div class="request-card-meta">user_id: ${escapeHtml(data.user_id || "-")}</div>
    <div class="request-card-meta">${escapeHtml((data.waste_types || []).join(", ") || "-")} · ${escapeHtml(data.sub_district || "-")}</div>
    <div class="request-card-meta">นัด ${escapeHtml(data.requested_date || "-")} · ${escapeHtml(data.time_slot || "-")}</div>
    <div class="status-pill">${STATUS_LABEL[data.status] || data.status || "-"}</div>
  `;

  card.appendChild(thumb);
  card.appendChild(body);
  return card;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

validate();
