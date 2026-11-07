const form = document.getElementById("requestForm");
const submitBtn = document.getElementById("submitBtn");
const toast = document.getElementById("toast");
const timeSlotRow = document.getElementById("timeSlotRow");
const wasteTypeGrid = document.getElementById("wasteTypeGrid");
const userBar = document.getElementById("userBar");
const addressCardList = document.getElementById("addressCardList");
const addressError = document.getElementById("addressError");

const photoInput = document.getElementById("photoInput");
const photoGrid = document.getElementById("photoGrid");
const photoCount = document.getElementById("photoCount");

const ADDRESS_SLOTS = ["address_1", "address_2"];

// รูปถ่ายขยะเก็บเป็น base64 data URL ใน Firestore collection request_photos (1 รูป = 1 doc)
// แทน Firebase Storage — ย่อ/บีบอัดด้วย compressImage() ใน image-helpers.js
const MAX_PHOTOS = 5;

const editRequestId = new URLSearchParams(window.location.search).get("edit");

let currentUserId = null;
let currentProfile = null;
let savedAddresses = { address_1: null, address_2: null }; // เก็บใน Firestore collection user_addresses/{uid} — จัดการ (เพิ่ม/แก้ไข) ที่หน้าโปรไฟล์
let selectedSlot = null;
let photos = []; // [{ id: doc id ใน request_photos (null = รูปใหม่ยังไม่บันทึก), data: data URL }]
let removedPhotoIds = []; // รูปเดิมที่ผู้ใช้กดลบในโหมดแก้ไข — ลบจริงตอนกดบันทึก
let processingPhotos = 0;

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

// ---------- auth guard: ต้อง login ก่อนถึงจะใช้หน้านี้ได้ ----------
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }

  currentUserId = user.uid;
  userBar.innerHTML = `กำลังใช้งานในนาม <b id="userBarName">...</b> · <a href="#" id="logoutLink">ออกจากระบบ</a>`;
  document.getElementById("logoutLink").addEventListener("click", async (e) => {
    e.preventDefault();
    await auth.signOut();
    window.location.href = "../login/index.html";
  });

  try {
    const profileSnap = await db.collection("user_accounts").doc(user.uid).get();
    if (profileSnap.exists) {
      currentProfile = profileSnap.data();
      document.getElementById("userBarName").textContent = currentProfile.full_name;
      applyProfileAutofill();
    }
  } catch (err) {
    console.error("โหลดโปรไฟล์ไม่สำเร็จ", err);
  }

  try {
    const addrSnap = await db.collection("user_addresses").doc(user.uid).get();
    if (addrSnap.exists) {
      const data = addrSnap.data();
      savedAddresses.address_1 = data.address_1 || null;
      savedAddresses.address_2 = data.address_2 || null;
      selectedSlot = savedAddresses.address_1 ? "address_1" : (savedAddresses.address_2 ? "address_2" : null);
    }
  } catch (err) {
    console.error("โหลดที่อยู่ที่บันทึกไว้ไม่สำเร็จ", err);
  }

  if (editRequestId && !(await loadRequestForEdit())) return;

  renderAddressCards();
  validate();
});

// ---------- โหมดแก้ไขคำขอเดิม (?edit=<request_id>) — แก้ไขได้เฉพาะคำขอของตัวเองที่ยัง pending_admin_review ----------
async function loadRequestForEdit() {
  try {
    const reqSnap = await db.collection("pickup_requests").doc(editRequestId).get();
    const data = reqSnap.data();
    if (!reqSnap.exists || data.user_id !== currentUserId || data.status !== "pending_admin_review") {
      showToast("ไม่พบคำขอนี้ หรือ Admin ตรวจสอบคำขอนี้ไปแล้ว แก้ไขไม่ได้", true);
      window.location.href = "../tracking/index.html";
      return false;
    }

    document.getElementById("contact_name").value = data.contact_name || "";
    document.getElementById("contact_phone").value = data.contact_phone || "";
    document.getElementById("notes").value = data.notes || "";
    document.getElementById("estimated_quantity_description").value = data.estimated_quantity_description || "";
    document.getElementById("requested_date").value = data.requested_date || "";

    wasteTypeGrid.querySelectorAll(".checkbox-item").forEach((item) => {
      const input = item.querySelector("input");
      input.checked = (data.waste_types || []).includes(input.value);
      item.classList.toggle("checked", input.checked);
    });

    timeSlotRow.querySelectorAll(".radio-item").forEach((item) => {
      const input = item.querySelector("input");
      input.checked = input.value === data.time_slot;
      item.classList.toggle("checked", input.checked);
    });

    if (data.saved_address_id && savedAddresses[data.saved_address_id]) {
      selectedSlot = data.saved_address_id;
    }

    const photoSnap = await db.collection("request_photos")
      .where("request_id", "==", editRequestId)
      .where("user_id", "==", currentUserId)
      .get();
    photos = photoSnap.docs
      .map((doc) => ({ id: doc.id, data: doc.data().image_data, order: doc.data().display_order || 0 }))
      .sort((a, b) => a.order - b.order)
      .map(({ id, data }) => ({ id, data }));
    renderPhotos();

    document.getElementById("pageTitle").textContent = "แก้ไขคำขอเรียกรถซาเล้ง";
    submitBtn.textContent = "บันทึกการแก้ไข";
    return true;
  } catch (err) {
    console.error(err);
    showToast("โหลดคำขอเดิมไม่สำเร็จ", true);
    window.location.href = "../tracking/index.html";
    return false;
  }
}

function applyProfileAutofill() {
  if (!currentProfile) return;
  document.getElementById("contact_name").value = currentProfile.full_name;
  document.getElementById("contact_phone").value = currentProfile.phone_number;
}

// ---------- saved address cards (เลือกอย่างเดียว — จัดการเพิ่ม/แก้ไขที่หน้าโปรไฟล์) ----------
function addressLabel(slot) {
  return slot === "address_1" ? "ที่อยู่ 1" : "ที่อยู่ 2";
}

function renderAddressCards() {
  addressCardList.innerHTML = "";
  const hasAny = ADDRESS_SLOTS.some((slot) => savedAddresses[slot]);

  if (!hasAny) {
    const empty = document.createElement("div");
    empty.className = "address-card-empty";
    empty.style.cursor = "default";
    empty.innerHTML = `<span>ยังไม่มีที่อยู่บันทึกไว้ — <a href="../profile/index.html" style="color:var(--color-primary-600); text-decoration:underline;">ไปเพิ่มที่โปรไฟล์</a></span>`;
    addressCardList.appendChild(empty);
    return;
  }

  ADDRESS_SLOTS.forEach((slot) => {
    if (savedAddresses[slot]) addressCardList.appendChild(buildAddressCard(slot));
  });
}

function buildAddressCard(slot) {
  const saved = savedAddresses[slot];
  const card = document.createElement("div");
  card.className = `address-card-filled${selectedSlot === slot ? " selected" : ""}`;
  card.style.cursor = "pointer";

  const body = document.createElement("div");
  body.className = "address-card-body";
  body.innerHTML = `
    <div class="address-card-label">📍 ${addressLabel(slot)}</div>
    <div class="address-card-text">${escapeHtml(saved.sub_district)} — ${escapeHtml(saved.address_text)}${saved.landmark ? ` (${escapeHtml(saved.landmark)})` : ""}</div>
  `;

  card.appendChild(body);
  card.addEventListener("click", () => {
    selectedSlot = slot;
    renderAddressCards();
    validate();
  });

  return card;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// ---------- รูปถ่ายขยะ: เลือก → ย่อ/บีบอัดเป็น JPEG ใน browser → เก็บ data URL ไว้ก่อน ส่งจริงตอน submit ----------
photoInput.addEventListener("change", async () => {
  const files = Array.from(photoInput.files);
  photoInput.value = "";

  const room = MAX_PHOTOS - photos.length - processingPhotos;
  if (files.length > room) showToast(`อัปโหลดได้สูงสุด ${MAX_PHOTOS} ภาพ`, true);

  for (const file of files.slice(0, Math.max(room, 0))) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      showToast(`ไฟล์ "${file.name}" ไม่รองรับ (ใช้ได้เฉพาะ JPG / PNG / WEBP)`, true);
      continue;
    }

    processingPhotos++;
    renderPhotos();
    try {
      photos.push({ id: null, data: await compressImage(file) });
    } catch (err) {
      console.error(err);
      showToast(`อ่านรูป "${file.name}" ไม่สำเร็จ`, true);
    } finally {
      processingPhotos--;
      renderPhotos();
      validate();
    }
  }
});

function renderPhotos() {
  photoGrid.innerHTML = "";
  photos.forEach((photo, index) => {
    const tile = document.createElement("div");
    tile.className = "photo-tile";
    tile.innerHTML = `<img src="${photo.data}" alt="รูปถ่ายขยะ ${index + 1}"><button type="button" class="photo-remove" aria-label="ลบรูป">×</button>`;
    tile.querySelector(".photo-remove").addEventListener("click", () => {
      if (photo.id) removedPhotoIds.push(photo.id);
      photos.splice(index, 1);
      renderPhotos();
    });
    photoGrid.appendChild(tile);
  });

  for (let i = 0; i < processingPhotos; i++) {
    const tile = document.createElement("div");
    tile.className = "photo-tile processing";
    tile.textContent = "กำลังย่อ...";
    photoGrid.appendChild(tile);
  }

  photoCount.textContent = `${photos.length}/${MAX_PHOTOS}`;
  photoInput.disabled = photos.length + processingPhotos >= MAX_PHOTOS;
}

// ลบรูปที่ผู้ใช้เอาออก + เพิ่มรูปใหม่ ใน batch เดียว (เขียน display_order ตามลำดับปัจจุบันให้รูปใหม่)
async function savePhotos(requestId) {
  if (!removedPhotoIds.length && !photos.some((p) => !p.id)) return;

  const batch = db.batch();
  removedPhotoIds.forEach((id) => batch.delete(db.collection("request_photos").doc(id)));
  photos.forEach((photo, index) => {
    if (photo.id) return;
    batch.set(db.collection("request_photos").doc(), {
      request_id: requestId,
      user_id: currentUserId,
      image_data: photo.data,
      display_order: index,
      uploaded_at: firebase.firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
}

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
  const hasAddress = !!(selectedSlot && savedAddresses[selectedSlot]);

  const checks = [
    ["field-contact_name", fieldValue("contact_name").length > 0],
    ["field-contact_phone", /^0\d{8,9}$/.test(fieldValue("contact_phone").replace(/-/g, ""))],
    ["field-waste_types", getWasteTypes().length > 0],
    ["field-requested_date", fieldValue("requested_date").length > 0],
    ["field-time_slot", getTimeSlot().length > 0],
  ];

  if (showErrors) {
    checks.forEach(([fieldId, ok]) => setFieldError(fieldId, !ok));
    addressError.style.display = hasAddress ? "none" : "block";
  }

  const allValid = checks.every(([, ok]) => ok) && hasAddress && !!currentUserId && processingPhotos === 0;
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

// ---------- submit ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate(true)) {
    showToast("กรุณากรอกข้อมูลที่จำเป็นให้ครบ", true);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = editRequestId ? "กำลังบันทึก..." : "กำลังส่งคำขอ...";

  try {
    const address = savedAddresses[selectedSlot];
    const payload = {
      contact_name: fieldValue("contact_name"),
      contact_phone: fieldValue("contact_phone"),
      saved_address_id: selectedSlot,
      sub_district: address.sub_district,
      address_text: address.address_text,
      landmark: address.landmark || "",
      notes: fieldValue("notes"),
      waste_types: getWasteTypes(),
      estimated_quantity_description: document.getElementById("estimated_quantity_description").value,
      requested_date: fieldValue("requested_date"),
      time_slot: getTimeSlot(),
    };

    if (editRequestId) {
      await db.collection("pickup_requests").doc(editRequestId).update(payload);
      await savePhotos(editRequestId);
      showToast("บันทึกการแก้ไขสำเร็จ");
      window.location.href = `../request-detail/index.html?id=${encodeURIComponent(editRequestId)}`;
      return;
    }

    const requestRef = db.collection("pickup_requests").doc();
    await requestRef.set({
      ...payload,
      user_id: currentUserId,
      status: "pending_admin_review",
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
    });

    try {
      await savePhotos(requestRef.id);
    } catch (err) {
      // คำขอถูกสร้างแล้ว — แจ้งแยกให้ผู้ใช้ไปแนบรูปใหม่ผ่าน "แก้ไข" ในหน้าติดตาม แทนที่จะบอกว่าส่งคำขอไม่สำเร็จ
      console.error(err);
      showToast("ส่งคำขอสำเร็จ แต่อัปโหลดรูปไม่สำเร็จ — แนบรูปใหม่ได้จากปุ่มแก้ไขในหน้าติดตาม", true);
      resetForm();
      return;
    }

    showToast("ส่งคำขอสำเร็จ");
    resetForm();
  } catch (err) {
    console.error(err);
    const message = err.code === "permission-denied"
      ? `${editRequestId ? "บันทึกการแก้ไข" : "ส่งคำขอ"}ไม่สำเร็จ: Firestore ปฏิเสธสิทธิ์ — ตั้งค่า Security Rules ก่อน (ดู README)`
      : `${editRequestId ? "บันทึกการแก้ไข" : "ส่งคำขอ"}ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง`;
    showToast(message, true);
  } finally {
    submitBtn.textContent = editRequestId ? "บันทึกการแก้ไข" : "ส่งคำขอ";
    validate();
  }
});

function resetForm() {
  const notesEl = document.getElementById("notes");
  notesEl.value = "";
  wasteTypeGrid.querySelectorAll(".checkbox-item").forEach((item) => {
    item.classList.remove("checked");
    item.querySelector("input").checked = false;
  });
  timeSlotRow.querySelectorAll(".radio-item").forEach((item) => {
    item.classList.remove("checked");
    item.querySelector("input").checked = false;
  });
  document.getElementById("requested_date").value = "";
  photos = [];
  removedPhotoIds = [];
  renderPhotos();
  form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
  validate();
}

validate();
