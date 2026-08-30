const form = document.getElementById("requestForm");
const submitBtn = document.getElementById("submitBtn");
const toast = document.getElementById("toast");
const timeSlotRow = document.getElementById("timeSlotRow");
const wasteTypeGrid = document.getElementById("wasteTypeGrid");
const userBar = document.getElementById("userBar");

let currentUserId = null;
let currentProfile = null;

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

  validate();
});

function applyProfileAutofill() {
  if (!currentProfile) return;
  document.getElementById("contact_name").value = currentProfile.full_name;
  document.getElementById("contact_phone").value = currentProfile.phone_number;
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
  const checks = [
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

  const allValid = checks.every(([, ok]) => ok) && !!currentUserId;
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
  submitBtn.textContent = "กำลังส่งคำขอ...";

  try {
    const requestRef = db.collection("pickup_requests").doc();

    await requestRef.set({
      user_id: currentUserId,
      contact_name: fieldValue("contact_name"),
      contact_phone: fieldValue("contact_phone"),
      sub_district: fieldValue("sub_district"),
      address_text: fieldValue("address_text"),
      landmark: fieldValue("landmark"),
      notes: fieldValue("notes"),
      waste_types: getWasteTypes(),
      estimated_quantity_description: document.getElementById("estimated_quantity_description").value,
      requested_date: fieldValue("requested_date"),
      time_slot: getTimeSlot(),
      status: "pending_admin_review",
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
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
  applyProfileAutofill();
  wasteTypeGrid.querySelectorAll(".checkbox-item").forEach((item) => item.classList.remove("checked"));
  timeSlotRow.querySelectorAll(".radio-item").forEach((item) => item.classList.remove("checked"));
  form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
  validate();
}

validate();
